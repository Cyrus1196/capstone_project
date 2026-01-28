<?php

namespace App\Http\Controllers;

use App\Models\StudentProfile;
use App\Models\Curriculum;
use App\Models\Evaluation;
use App\Models\DeanProfile;
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

            // Only allow admin, dean, or faculty accounts to view evaluations
            $isAllowed =
                $user->isAdmin() ||
                $user->hasRole('Dean') ||
                $user->hasRole('Faculty');

            if (!$isAllowed) {
                return response()->json(['message' => 'Forbidden'], 403);
            }

            $profile = StudentProfile::where('student_id_number', $studentIdNumber)
                ->with(['program'])
                ->first();

            if (!$profile) {
                return response()->json(['message' => 'Student not found'], 404);
            }

            if (!$profile->current_program) {
                return response()->json([
                    'student' => $profile,
                    'summary' => [
                        'total_units_in_curriculum' => 0,
                        'total_units_earned' => 0,
                        'lacking_units' => 0,
                    ],
                    'rows' => [],
                ]);
            }

            // Load full curriculum for the student's program
            $curriculum = Curriculum::where('program_id', $profile->current_program)
                ->with(['subject', 'yearLevel', 'semester'])
                ->orderBy('year_level')
                ->orderBy('semester_id')
                ->get();

            // Load all evaluations for this student
            $evaluations = Evaluation::where('student_id', $profile->student_id)
                ->with(['subject', 'academicYear', 'semester', 'section', 'evaluatedBy'])
                ->get();

            // Index evaluations by subject_id for quick lookup
            $evaluationsBySubject = $evaluations
                ->groupBy('subject_id')
                ->map(function ($group) {
                    // If multiple evaluations exist for the same subject,
                    // take the latest by academic_year_id / semester_id.
                    return $group->sortByDesc('academic_year_id')
                        ->sortByDesc('semester_id')
                        ->first();
                });

            $rows = [];
            $totalUnitsInCurriculum = 0;
            $totalUnitsEarned = 0;

            foreach ($curriculum as $item) {
                $subject = $item->subject;
                $units = $subject->number_of_units ?? 0;
                $totalUnitsInCurriculum += $units;

                $evaluation = $evaluationsBySubject->get($item->subject_id);
                $grade = $evaluation->grade ?? null;
                $status = $evaluation->evaluation_status ?? null;

                // Determine if the subject is considered "passed"
                $normalizedStatus = $status ? strtolower($status) : null;
                $isPassedStatus = in_array($normalizedStatus, ['passed', 'pass', 'credit']);

                $isPassedByGrade = false;
                if ($grade !== null && $item->passing_grade !== null && is_numeric($grade)) {
                    // Passing rule: numeric grade meets or exceeds passing_grade.
                    // (If your grading scale is reversed, adjust this comparison.)
                    $isPassedByGrade = floatval($grade) >= floatval($item->passing_grade);
                }

                $isPassed = $isPassedStatus || $isPassedByGrade;
                $unitsEarned = $isPassed ? $units : 0;
                $totalUnitsEarned += $unitsEarned;

                // Get prerequisite and corequisite information
                $prerequisite = null;
                $corequisite = null;
                
                // You can add prerequisite/corequisite logic here if needed
                // For now, we'll leave them as null

                $rows[] = [
                    'year_level_id' => $item->year_level,
                    'year_level_name' => $item->yearLevel->year_level ?? null,
                    'semester_id' => $item->semester_id,
                    'semester_name' => $item->semester->semester_name ?? null,
                    'subject_id' => $item->subject_id,
                    'subject_code' => $subject->subject_code ?? null,
                    'subject_name' => $subject->subject_name ?? null,
                    'units' => $units,
                    'grade' => $grade,
                    'status' => $status,
                    'units_earned' => $unitsEarned,
                    'prerequisite' => $prerequisite,
                    'corequisite' => $corequisite,
                    'academic_year_id' => $evaluation->academic_year_id ?? null,
                    'evaluated_by' => $evaluation->evaluatedBy,
                    'evaluation_date' => $evaluation->evaluation_date,
                ];
            }

            $lackingUnits = max(0, $totalUnitsInCurriculum - $totalUnitsEarned);

            return response()->json([
                'student' => [
                    'student_id' => $profile->student_id,
                    'student_id_number' => $profile->student_id_number,
                    'first_name' => $profile->first_name,
                    'middle_name' => $profile->middle_name,
                    'last_name' => $profile->last_name,
                    'full_name' => trim(
                        ($profile->last_name ? $profile->last_name . ', ' : '') .
                        ($profile->first_name ?? '') .
                        ($profile->middle_name ? ' ' . $profile->middle_name : '')
                    ),
                    'academic_status' => $profile->academic_status,
                    'program' => $profile->program,
                ],
                'summary' => [
                    'total_units_in_curriculum' => $totalUnitsInCurriculum,
                    'total_units_earned' => $totalUnitsEarned,
                    'lacking_units' => $lackingUnits,
                ],
                'rows' => $rows,
            ]);
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

            // Only allow admin, dean, or faculty accounts to view evaluations
            $isAllowed =
                $user->isAdmin() ||
                $user->hasRole('Dean') ||
                $user->hasRole('Faculty');

            if (!$isAllowed) {
                return response()->json(['message' => 'Forbidden'], 403);
            }

            $query = StudentProfile::with(['program', 'user']);

            // If user is a dean, filter by their assigned program
            if ($user->hasRole('Dean')) {
                $deanProfile = DeanProfile::where('user_id', $user->user_id)->first();
                if ($deanProfile && $deanProfile->program_id) {
                    $query->where('current_program', $deanProfile->program_id);
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
                $query->where('current_program', $programId);
            }

            $students = $query->orderBy('last_name')
                ->orderBy('first_name')
                ->get()
                ->map(function($student) {
                    $fullName = trim(
                        ($student->last_name ? $student->last_name . ', ' : '') .
                        ($student->first_name ?? '') .
                        ($student->middle_name ? ' ' . $student->middle_name : '')
                    );

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
}


