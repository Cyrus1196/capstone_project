<?php

namespace App\Http\Controllers;

use App\Models\StudentProfile;
use App\Models\Evaluation;
use App\Models\Curriculum;
use App\Models\Prerequisite;
use App\Models\TblUser;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class StudentController extends Controller
{
    /**
     * Get the authenticated student's profile or admin can get by user_id
     */
    public function getProfile(Request $request)
    {
        try {
            $user = $request->user();
            if (!$user) {
                return response()->json(['message' => 'Unauthorized'], 401);
            }

            // Allow admin to get profile by user_id, otherwise use authenticated user
            $targetUserId = $request->query('user_id');
            if ($targetUserId && $user->isAdmin()) {
                $userId = $targetUserId;
            } else {
                $userId = $user->user_id;
            }

            $profile = StudentProfile::where('user_id', $userId)
                ->with('program')
                ->first();

            if (!$profile) {
                return response()->json(['message' => 'Profile not found'], 404);
            }

            return response()->json($profile);
        } catch (\Exception $e) {
            return response()->json([
                'error' => 'Failed to fetch profile',
                'message' => $e->getMessage()
            ], 500);
        }
    }

    /**
     * Create or update student profile
     */
    public function updateProfile(Request $request)
    {
        try {
            $user = $request->user();
            if (!$user) {
                return response()->json(['message' => 'Unauthorized'], 401);
            }

            $validated = $request->validate([
                'user_id' => 'nullable|integer|exists:tbl_users,user_id', // Allow admin to specify user_id
                'student_id_number' => 'required|string|max:50',
                'first_name' => 'nullable|string|max:50',
                'middle_name' => 'nullable|string|max:50',
                'last_name' => 'nullable|string|max:50',
                'contact_number' => 'nullable|string|max:20',
                'address' => 'nullable|string',
                'academic_status' => 'nullable|string|max:50',
                'current_program' => 'nullable|integer|exists:tbl_program,program_id',
            ]);

            // Determine which user_id to use
            $targetUserId = $validated['user_id'] ?? $user->user_id;
            
            // If admin is creating for another user, check permissions
            if ($validated['user_id'] && $targetUserId !== $user->user_id) {
                if (!$user->isAdmin()) {
                    return response()->json(['message' => 'Unauthorized'], 403);
                }
                // For admin creating student profile, use the provided user_id
                // Admin doesn't need to be the same as the target user
            }

            $profile = StudentProfile::where('user_id', $targetUserId)->first();

            if ($profile) {
                // Update existing profile
                // Don't allow changing student_id_number - remove it from validated data for updates
                unset($validated['student_id_number']);
                unset($validated['user_id']); // Don't allow changing user_id
                
                $profile->update($validated);
            } else {
                // Create new profile
                // Check if student_id_number already exists
                $exists = StudentProfile::where('student_id_number', $validated['student_id_number'])->exists();
                if ($exists) {
                    return response()->json(['message' => 'Student ID number already exists'], 422);
                }
                $validated['user_id'] = $targetUserId;
                $profile = StudentProfile::create($validated);
            }

            $profile->load('program');

            return response()->json($profile);
        } catch (\Illuminate\Validation\ValidationException $e) {
            return response()->json([
                'error' => 'Validation failed',
                'messages' => $e->errors()
            ], 422);
        } catch (\Exception $e) {
            return response()->json([
                'error' => 'Failed to save profile',
                'message' => $e->getMessage()
            ], 500);
        }
    }

    /**
     * Create new student profile
     */
    public function createProfile(Request $request)
    {
        return $this->updateProfile($request);
    }

    /**
     * Get student's evaluations
     */
    public function getEnrollments(Request $request)
    {
        try {
            $user = $request->user();
            if (!$user) {
                return response()->json(['message' => 'Unauthorized'], 401);
            }

            $profile = StudentProfile::where('user_id', $user->user_id)->first();
            if (!$profile) {
                return response()->json(['enrollments' => []]);
            }

            $query = Evaluation::where('student_id', $profile->student_id)
                ->with([
                    'subject',
                    'academicYear',
                    'semester',
                    'section'
                ]);

            // Apply filters
            if ($request->has('academic_year') && $request->academic_year) {
                $query->whereHas('academicYear', function($q) use ($request) {
                    $q->where('academic_year_name', 'like', '%' . $request->academic_year . '%');
                });
            }

            if ($request->has('semester') && $request->semester) {
                $query->whereHas('semester', function($q) use ($request) {
                    $q->where('semester_name', 'like', '%' . $request->semester . '%');
                });
            }

            if ($request->has('status') && $request->status) {
                $query->where('evaluation_status', $request->status);
            }

            $evaluations = $query->orderBy('enrolled_date', 'desc')->get();

            // Transform the data to include related information in a flat structure
            // Keep 'enrollment_id' and 'status' in response for backward compatibility with frontend
            $transformed = $evaluations->map(function($evaluation) {
                return [
                    'enrollment_id' => $evaluation->evaluation_id, // Map for backward compatibility
                    'evaluation_id' => $evaluation->evaluation_id,
                    'student_id' => $evaluation->student_id,
                    'subject_id' => $evaluation->subject_id,
                    'subject_code' => $evaluation->subject->subject_code ?? null,
                    'subject_name' => $evaluation->subject->subject_name ?? null,
                    'units' => $evaluation->subject->number_of_units ?? null,
                    'academic_year_id' => $evaluation->academic_year_id,
                    'academic_year_name' => $evaluation->academicYear->academic_year_name ?? null,
                    'semester_id' => $evaluation->semester_id,
                    'semester_name' => $evaluation->semester->semester_name ?? null,
                    'grade' => $evaluation->grade,
                    'status' => $evaluation->evaluation_status, // Map for backward compatibility
                    'evaluation_status' => $evaluation->evaluation_status,
                    'enrolled_date' => $evaluation->enrolled_date,
                    'section_id' => $evaluation->section_id,
                    'section_name' => $evaluation->section->section_name ?? null,
                    'subject' => $evaluation->subject,
                    'academic_year' => $evaluation->academicYear,
                    'semester' => $evaluation->semester,
                    'section' => $evaluation->section,
                ];
            });

            return response()->json(['enrollments' => $transformed]);
        } catch (\Exception $e) {
            return response()->json([
                'error' => 'Failed to fetch evaluations',
                'message' => $e->getMessage()
            ], 500);
        }
    }

    /**
     * Get student's curriculum based on their program
     */
    public function getCurriculum(Request $request)
    {
        try {
            $user = $request->user();
            if (!$user) {
                return response()->json(['message' => 'Unauthorized'], 401);
            }

            $profile = StudentProfile::where('user_id', $user->user_id)
                ->with('program')
                ->first();

            if (!$profile || !$profile->current_program) {
                return response()->json(['curriculum' => []]);
            }

            $curriculum = Curriculum::where('program_id', $profile->current_program)
                ->with([
                    'subject.prerequisites.requiredSubject',
                    'yearLevel',
                    'semester',
                    'program'
                ])
                ->orderBy('year_level')
                ->orderBy('semester_id')
                ->get();

            // Transform the data to include related information
            $transformed = $curriculum->map(function($item) {
                // Get all prerequisites for this subject
                $prerequisites = [];
                if ($item->subject && $item->subject->prerequisites) {
                    $prerequisites = $item->subject->prerequisites->map(function($prereq) {
                        return [
                            'subject_code' => $prereq->requiredSubject->subject_code ?? null,
                            'prereq_subject_code' => $prereq->requiredSubject->subject_code ?? null,
                        ];
                    })->toArray();
                }

                return [
                    'curriculum_id' => $item->curriculum_id,
                    'program_id' => $item->program_id,
                    'subject_id' => $item->subject_id,
                    'subject_code' => $item->subject->subject_code ?? null,
                    'subject_name' => $item->subject->subject_name ?? null,
                    'units' => $item->subject->number_of_units ?? null,
                    'year_level_id' => $item->year_level,
                    'year_level_name' => $item->yearLevel->year_level ?? null,
                    'semester_id' => $item->semester_id,
                    'semester_name' => $item->semester->semester_name ?? null,
                    'passing_grade' => $item->passing_grade,
                    'subject_type' => $item->subject_type,
                    'year_level' => $item->yearLevel,
                    'semester' => $item->semester,
                    'subject' => $item->subject,
                    'program' => $item->program,
                    'prerequisites' => $prerequisites,
                ];
            });

            return response()->json(['curriculum' => $transformed]);
        } catch (\Exception $e) {
            return response()->json([
                'error' => 'Failed to fetch curriculum',
                'message' => $e->getMessage()
            ], 500);
        }
    }
}

