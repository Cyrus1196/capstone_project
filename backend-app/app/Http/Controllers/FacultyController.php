<?php

namespace App\Http\Controllers;

use App\Models\FacultyProfile;
use App\Models\TblUser;
use App\Models\Evaluation;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class FacultyController extends Controller
{
    /**
     * Get the authenticated faculty's profile
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

            $profile = FacultyProfile::where('user_id', $userId)
                ->with('department')
                ->first();

            if (!$profile) {
                return response()->json(['message' => 'Faculty profile not found'], 404);
            }

            return response()->json($profile);
        } catch (\Exception $e) {
            return response()->json([
                'error' => 'Failed to fetch faculty profile',
                'message' => $e->getMessage()
            ], 500);
        }
    }

    /**
     * Create or update faculty profile
     */
    public function updateProfile(Request $request)
    {
        try {
            $user = $request->user();
            if (!$user) {
                return response()->json(['message' => 'Unauthorized'], 401);
            }

            $validated = $request->validate([
                'first_name' => 'nullable|string|max:50',
                'middle_name' => 'nullable|string|max:50',
                'last_name' => 'nullable|string|max:50',
                'employee_id' => 'nullable|string|max:50',
                'department_id' => 'nullable|integer|exists:tbl_departments,department_id',
                'specialization' => 'nullable|string|max:255',
            ]);

            $profile = FacultyProfile::where('user_id', $user->user_id)->first();

            if ($profile) {
                $profile->update($validated);
            } else {
                $validated['user_id'] = $user->user_id;
                $profile = FacultyProfile::create($validated);
            }

            $profile->load('department');

            return response()->json($profile);
        } catch (\Exception $e) {
            return response()->json([
                'error' => 'Failed to update faculty profile',
                'message' => $e->getMessage()
            ], 500);
        }
    }

    /**
     * Create faculty profile (POST)
     */
    public function createProfile(Request $request)
    {
        return $this->updateProfile($request);
    }

    /**
     * Get classes assigned to the faculty
     */
    public function getClasses(Request $request)
    {
        try {
            $user = $request->user();
            if (!$user) {
                return response()->json(['message' => 'Unauthorized'], 401);
            }

            // For now, return empty array as class assignment logic would need a faculty_subject_assignment table
            // This can be implemented later when the assignment system is in place
            $classes = [];

            // If we had a faculty_subject_assignment table, we would query like:
            // $classes = FacultySubjectAssignment::where('faculty_id', $facultyId)
            //     ->with(['subject', 'section', 'academicYear', 'semester'])
            //     ->get();

            return response()->json(['classes' => $classes]);
        } catch (\Exception $e) {
            return response()->json([
                'error' => 'Failed to fetch classes',
                'message' => $e->getMessage()
            ], 500);
        }
    }

    /**
     * Get student evaluations for faculty's classes
     */
    public function getEnrollments(Request $request)
    {
        try {
            $user = $request->user();
            if (!$user) {
                return response()->json(['message' => 'Unauthorized'], 401);
            }

            $filters = $request->only(['academic_year', 'semester', 'subject_id', 'section_id']);

            // For now, return evaluations filtered by the provided criteria
            // In a full implementation, this would filter by faculty assignments
            $query = Evaluation::with([
                'student',
                'subject',
                'section',
                'academicYear',
                'semester'
            ]);

            if (isset($filters['academic_year']) && $filters['academic_year']) {
                $query->where('academic_year_id', $filters['academic_year']);
            }

            if (isset($filters['semester']) && $filters['semester']) {
                $query->where('semester_id', $filters['semester']);
            }

            if (isset($filters['subject_id']) && $filters['subject_id']) {
                $query->where('subject_id', $filters['subject_id']);
            }

            if (isset($filters['section_id']) && $filters['section_id']) {
                $query->where('section_id', $filters['section_id']);
            }

            $evaluations = $query->get();

            // Transform to include backward-compatible field names
            $transformed = $evaluations->map(function($evaluation) {
                return [
                    'enrollment_id' => $evaluation->evaluation_id, // Map for backward compatibility
                    'evaluation_id' => $evaluation->evaluation_id,
                    'student_id' => $evaluation->student_id,
                    'subject_id' => $evaluation->subject_id,
                    'grade' => $evaluation->grade,
                    'status' => $evaluation->evaluation_status, // Map for backward compatibility
                    'evaluation_status' => $evaluation->evaluation_status,
                    'enrolled_date' => $evaluation->enrolled_date,
                    'section_id' => $evaluation->section_id,
                    'student' => $evaluation->student,
                    'subject' => $evaluation->subject,
                    'section' => $evaluation->section,
                    'academicYear' => $evaluation->academicYear,
                    'semester' => $evaluation->semester,
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
     * Update grade for a student evaluation
     */
    public function updateGrade(Request $request, $evaluationId)
    {
        try {
            $user = $request->user();
            if (!$user) {
                return response()->json(['message' => 'Unauthorized'], 401);
            }

            $validated = $request->validate([
                'grade' => 'nullable|string|max:10',
                'status' => 'nullable|string|max:50',
                'evaluation_status' => 'nullable|string|max:50', // Accept both for compatibility
            ]);

            // Map 'status' to 'evaluation_status' for database
            if (isset($validated['status'])) {
                $validated['evaluation_status'] = $validated['status'];
                unset($validated['status']);
            }

            $evaluation = Evaluation::findOrFail($evaluationId);

            // In a full implementation, verify that the faculty is assigned to this class
            // For now, allow update if the evaluation exists

            $evaluation->update($validated);

            $evaluation->load(['student', 'subject', 'section', 'academicYear', 'semester']);

            // Return with backward-compatible field names
            $response = $evaluation->toArray();
            $response['enrollment_id'] = $evaluation->evaluation_id;
            $response['status'] = $evaluation->evaluation_status;

            return response()->json($response);
        } catch (\Exception $e) {
            return response()->json([
                'error' => 'Failed to update grade',
                'message' => $e->getMessage()
            ], 500);
        }
    }
}

