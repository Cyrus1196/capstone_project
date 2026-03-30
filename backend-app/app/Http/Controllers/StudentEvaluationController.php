<?php

namespace App\Http\Controllers;

use App\Models\AcademicRecordEvaluationComplete;
use App\Models\StudentProfile;
use App\Models\DeanProfile;
use App\Models\TblUser;
use App\Services\StudentCurriculumEvaluationBuilder;
use Illuminate\Support\Facades\DB;
use Illuminate\Http\Request;

class StudentEvaluationController extends Controller
{
    /**
     * Get curriculum + enrollment based evaluation for a student
     * looked up by their student_id_number (e.g. 02-2324-07413).
     *
     * This endpoint is intended for admins, deans, and faculty to
     * monitor a student's progress.
     */
    public function getByStudentIdNumber(Request $request, string $studentIdNumber)
    {
        try {
            $user = $request->user();
            if (!$user) {
                return response()->json(['message' => 'Unauthorized'], 401);
            }

            $isStaff = $user->canWorkOnStudentEvaluations();

            if ($user->hasRole('Student')) {
                $profile = StudentProfile::where('user_id', $user->user_id)->with(['program', 'track'])->first();
                if (!$profile) {
                    return response()->json(['message' => 'Student profile not found'], 404);
                }
                $ownNum = (string) ($profile->student_id_number ?? $profile->student_number ?? '');
                if (trim($ownNum) !== trim((string) $studentIdNumber)) {
                    return response()->json(['message' => 'Forbidden'], 403);
                }
            } elseif (!$isStaff) {
                return response()->json(['message' => 'Forbidden'], 403);
            } else {
                $profile = StudentProfile::whereStudentIdNumber($studentIdNumber)
                    ->with(['program', 'track'])
                    ->first();

                if (!$profile) {
                    return response()->json(['message' => 'Student not found'], 404);
                }
            }

            $payload = app(StudentCurriculumEvaluationBuilder::class)->buildPayload($profile);

            return response()->json($payload);
        } catch (\Exception $e) {
            return response()->json([
                'error' => 'Failed to compute student evaluation',
                'message' => $e->getMessage(),
            ], 500);
        }
    }

    /**
     * Get list of students for evaluation view
     * For deans, filter by their assigned program
     * For admins and faculty, show all students
     */
    public function listStudents(Request $request)
    {
        try {
            $user = $request->user();
            if (!$user) {
                return response()->json(['message' => 'Unauthorized'], 401);
            }

            if (! $user->canWorkOnStudentEvaluations()) {
                return response()->json(['message' => 'Forbidden'], 403);
            }

            $query = StudentProfile::with(['program', 'user']);

            // If user is a dean, filter by their assigned program
            if ($user->hasRole('Dean')) {
                $deanProfile = DeanProfile::where('user_id', $user->user_id)->first();
                if ($deanProfile && $deanProfile->program_id) {
                    $query->where(function ($q) use ($deanProfile) {
                        $q->where('Current_Program', $deanProfile->program_id)
                          ->orWhere('current_program', $deanProfile->program_id);
                    });
                }
            }

            // Apply search filter if provided
            $search = $request->query('search');
            if ($search) {
                $query->where(function($q) use ($search) {
                    $q->where('student_id_number', 'like', '%' . $search . '%')
                      ->orWhere('first_name', 'like', '%' . $search . '%')
                      ->orWhere('middle_name', 'like', '%' . $search . '%')
                      ->orWhere('last_name', 'like', '%' . $search . '%');
                });
            }

            // Apply program filter if provided
            $programId = $request->query('program_id');
            if ($programId) {
                $query->where(function ($q) use ($programId) {
                    $q->where('Current_Program', $programId)->orWhere('current_program', $programId);
                });
            }

            $academicRecord = $request->query('academic_record', 'all');
            if ($academicRecord === 'completed') {
                $doneIds = AcademicRecordEvaluationComplete::query()
                    ->distinct()
                    ->pluck('student_id');
                if ($doneIds->isEmpty()) {
                    return response()->json(['students' => []]);
                }
                $query->whereIn('student_id', $doneIds);
            } elseif ($academicRecord === 'pending') {
                $doneIds = AcademicRecordEvaluationComplete::query()
                    ->distinct()
                    ->pluck('student_id');
                if ($doneIds->isNotEmpty()) {
                    $query->whereNotIn('student_id', $doneIds);
                }
            }

            $students = $query->orderBy('last_name')
                ->orderBy('first_name')
                ->get();

            $studentIds = $students->pluck('student_id')->all();
            $lastCompletedByStudent = [];
            if ($studentIds !== []) {
                $lastCompletedByStudent = AcademicRecordEvaluationComplete::query()
                    ->select('student_id', DB::raw('MAX(completed_at) as last_completed_at'))
                    ->whereIn('student_id', $studentIds)
                    ->groupBy('student_id')
                    ->pluck('last_completed_at', 'student_id')
                    ->all();
            }

            $students = $students->map(function ($student) use ($lastCompletedByStudent) {
                $fullName = trim(
                    ($student->last_name ? $student->last_name . ', ' : '') .
                    ($student->first_name ?? '') .
                    ($student->middle_name ? ' ' . $student->middle_name : '')
                );

                $lastAt = $lastCompletedByStudent[$student->student_id] ?? null;

                return [
                    'student_id' => $student->student_id,
                    'student_id_number' => $student->student_id_number,
                    'first_name' => $student->first_name,
                    'middle_name' => $student->middle_name,
                    'last_name' => $student->last_name,
                    'full_name' => $fullName ?: 'N/A',
                    'academic_status' => $student->academic_status,
                    'program' => $student->program,
                    'program_name' => $student->program->program_name ?? 'N/A',
                    'academic_record_completed_at' => $lastAt,
                    'academic_record_evaluated' => $lastAt !== null,
                ];
            });

            return response()->json(['students' => $students]);
        } catch (\Exception $e) {
            return response()->json([
                'error' => 'Failed to fetch students',
                'message' => $e->getMessage(),
            ], 500);
        }
    }

    /**
     * @return \Illuminate\Http\JsonResponse|null JSON error response, or null if allowed
     */
    private function gateStaffStudentEvaluation(TblUser $user, StudentProfile $profile): ?\Illuminate\Http\JsonResponse
    {
        if ($user->hasRole('Student')) {
            return response()->json(['message' => 'Forbidden'], 403);
        }

        $isStaff =
            $user->canWorkOnStudentEvaluations();

        if (! $isStaff) {
            return response()->json(['message' => 'Forbidden'], 403);
        }

        if ($user->hasRole('Dean')) {
            $dean = DeanProfile::where('user_id', $user->user_id)->first();
            if ($dean && $dean->program_id) {
                $pid = $profile->current_program;
                if ((int) $pid !== (int) $dean->program_id) {
                    return response()->json(['message' => 'Student is not in your program'], 403);
                }
            }
        }

        return null;
    }

    public function markAcademicRecordComplete(Request $request)
    {
        try {
            $user = $request->user();
            if (! $user) {
                return response()->json(['message' => 'Unauthorized'], 401);
            }

            $validated = $request->validate([
                'student_id' => 'required|integer|exists:tbl_student_profile,student_id',
                'notes' => 'nullable|string|max:2000',
            ]);

            $profile = StudentProfile::where('student_id', $validated['student_id'])
                ->with(['program', 'track'])
                ->firstOrFail();

            if ($denied = $this->gateStaffStudentEvaluation($user, $profile)) {
                return $denied;
            }

            $record = AcademicRecordEvaluationComplete::create([
                'student_id' => $profile->student_id,
                'completed_at' => now(),
                'completed_by' => $user->user_id,
                'notes' => $validated['notes'] ?? null,
            ]);

            $record->load('completedByUser');

            return response()->json([
                'message' => 'Academic record evaluation stored successfully.',
                'record' => [
                    'academic_record_complete_id' => $record->academic_record_complete_id,
                    'student_id' => $record->student_id,
                    'completed_at' => $record->completed_at,
                    'notes' => $record->notes,
                    'completed_by_email' => $record->completedByUser?->email,
                ],
            ], 201);
        } catch (\Illuminate\Validation\ValidationException $e) {
            throw $e;
        } catch (\Exception $e) {
            return response()->json([
                'error' => 'Failed to record evaluation',
                'message' => $e->getMessage(),
            ], 500);
        }
    }

    public function listAcademicRecordCompletions(Request $request)
    {
        try {
            $user = $request->user();
            if (! $user) {
                return response()->json(['message' => 'Unauthorized'], 401);
            }

            $isAllowed =
                $user->canWorkOnStudentEvaluations();

            if (! $isAllowed) {
                return response()->json(['message' => 'Forbidden'], 403);
            }

            $q = AcademicRecordEvaluationComplete::query()
                ->with(['student.program', 'completedByUser'])
                ->orderByDesc('completed_at');

            if ($request->filled('student_id')) {
                $q->where('student_id', (int) $request->query('student_id'));
            }

            if ($user->hasRole('Dean')) {
                $dean = DeanProfile::where('user_id', $user->user_id)->first();
                if ($dean && $dean->program_id) {
                    $q->whereHas('student', function ($sq) use ($dean) {
                        $sq->where(function ($w) use ($dean) {
                            $w->where('Current_Program', $dean->program_id)
                                ->orWhere('current_program', $dean->program_id);
                        });
                    });
                }
            }

            $rows = $q->limit(200)->get()->map(function ($r) {
                return [
                    'academic_record_complete_id' => $r->academic_record_complete_id,
                    'student_id' => $r->student_id,
                    'completed_at' => $r->completed_at,
                    'notes' => $r->notes,
                    'student_name' => $r->student
                        ? trim(
                            ($r->student->last_name ? $r->student->last_name . ', ' : '') .
                            ($r->student->first_name ?? '')
                        )
                        : null,
                    'student_id_number' => $r->student->student_id_number ?? null,
                    'completed_by_email' => $r->completedByUser?->email,
                ];
            });

            return response()->json(['completions' => $rows]);
        } catch (\Exception $e) {
            return response()->json([
                'error' => 'Failed to list completions',
                'message' => $e->getMessage(),
            ], 500);
        }
    }

    public function deleteAcademicRecordCompletion(Request $request, int $recordId)
    {
        try {
            $user = $request->user();
            if (! $user) {
                return response()->json(['message' => 'Unauthorized'], 401);
            }

            if (! $user->canDeleteEvaluationsOrDeanAcademicRecords()) {
                return response()->json([
                    'message' => 'Forbidden — only administrators or users with Dean academic approvals may remove stored records',
                ], 403);
            }

            $record = AcademicRecordEvaluationComplete::with('student')->findOrFail($recordId);

            if ($record->student && ($denied = $this->gateStaffStudentEvaluation($user, $record->student))) {
                return $denied;
            }

            $record->delete();

            return response()->json(['message' => 'Stored evaluation record removed.']);
        } catch (\Exception $e) {
            return response()->json([
                'error' => 'Failed to delete',
                'message' => $e->getMessage(),
            ], 500);
        }
    }
}


