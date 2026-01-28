<?php

namespace App\Http\Controllers;

use App\Models\Evaluation;
use App\Models\StudentProfile;
use App\Models\Subject;
use App\Models\AcademicYear;
use App\Models\Semester;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\Rule;

class EvaluationController extends Controller
{
    public function index(Request $request)
    {
        try {
            $user = $request->user();
            if (!$user || (!$user->isAdmin() && !$user->hasRole('Dean') && !$user->hasRole('Faculty'))) {
                return response()->json(['message' => 'Unauthorized'], 401);
            }

            $query = Evaluation::with(['student', 'subject', 'academicYear', 'semester', 'section', 'evaluatedBy']);

            // Apply filters
            if ($request->has('student_id')) {
                $query->where('student_id', $request->student_id);
            }
            if ($request->has('subject_id')) {
                $query->where('subject_id', $request->subject_id);
            }
            if ($request->has('academic_year_id')) {
                $query->where('academic_year_id', $request->academic_year_id);
            }
            if ($request->has('semester_id')) {
                $query->where('semester_id', $request->semester_id);
            }
            if ($request->has('evaluation_status')) {
                $query->where('evaluation_status', $request->evaluation_status);
            }

            $evaluations = $query->orderBy('evaluation_date', 'desc')
                ->paginate($request->get('per_page', 15));

            return response()->json($evaluations);
        } catch (\Exception $e) {
            return response()->json([
                'error' => 'Failed to fetch evaluations',
                'message' => $e->getMessage()
            ], 500);
        }
    }

    public function store(Request $request)
    {
        try {
            $user = $request->user();
            if (!$user || (!$user->isAdmin() && !$user->hasRole('Dean') && !$user->hasRole('Faculty'))) {
                return response()->json(['message' => 'Unauthorized'], 401);
            }

            $validated = $request->validate([
                'student_id' => 'required|exists:tbl_student_profile,student_id',
                'subject_id' => 'required|exists:tbl_subjects,subject_id',
                'academic_year_id' => 'required|exists:tbl_academic_year,academic_year_id',
                'semester_id' => 'required|exists:tbl_semester,semester_id',
                'grade' => 'nullable|string|max:10',
                'evaluation_status' => 'nullable|string|in:passed,failed,ongoing,dropped,incomplete',
                'enrolled_date' => 'nullable|date'
            ]);

            $evaluation = Evaluation::create($validated);

            DB::commit();

            return response()->json([
                'message' => 'Evaluation created successfully',
                'evaluation' => $evaluation->load(['student', 'subject', 'academicYear', 'semester'])
            ], 201);

        } catch (\Illuminate\Validation\ValidationException $e) {
            DB::rollBack();
            return response()->json([
                'error' => 'Validation failed',
                'messages' => $e->errors()
            ], 422);
        } catch (\Exception $e) {
            DB::rollBack();
            return response()->json([
                'error' => 'Failed to create evaluation',
                'message' => $e->getMessage()
            ], 500);
        }
    }

    public function show(string $id)
    {
        try {
            $user = request()->user();
            if (!$user || (!$user->isAdmin() && !$user->hasRole('Dean') && !$user->hasRole('Faculty'))) {
                return response()->json(['message' => 'Unauthorized'], 401);
            }

            $evaluation = Evaluation::with([
                'student',
                'subject', 
                'academicYear', 
                'semester'
            ])->findOrFail($id);

            return response()->json($evaluation);
        } catch (\Exception $e) {
            return response()->json([
                'error' => 'Evaluation not found',
                'message' => $e->getMessage()
            ], 404);
        }
    }

    public function update(Request $request, string $id)
    {
        try {
            $user = $request->user();
            if (!$user || (!$user->isAdmin() && !$user->hasRole('Dean') && !$user->hasRole('Faculty'))) {
                return response()->json(['message' => 'Unauthorized'], 401);
            }

            $evaluation = Evaluation::findOrFail($id);

            $validated = $request->validate([
                'grade' => 'nullable|string|max:10',
                'evaluation_status' => 'nullable|string|in:passed,failed,ongoing,dropped,incomplete',
                'enrolled_date' => 'nullable|date'
            ]);

            DB::beginTransaction();

            $evaluation->update($validated);

            DB::commit();

            return response()->json([
                'message' => 'Evaluation updated successfully',
                'evaluation' => $evaluation->load(['student', 'subject', 'academicYear', 'semester'])
            ]);

        } catch (\Illuminate\Validation\ValidationException $e) {
            DB::rollBack();
            return response()->json([
                'error' => 'Validation failed',
                'messages' => $e->errors()
            ], 422);
        } catch (\Exception $e) {
            DB::rollBack();
            return response()->json([
                'error' => 'Failed to update evaluation',
                'message' => $e->getMessage()
            ], 500);
        }
    }

    public function destroy(string $id)
    {
        try {
            $user = request()->user();
            if (!$user || (!$user->isAdmin() && !$user->hasRole('Dean'))) {
                return response()->json(['message' => 'Unauthorized'], 401);
            }

            $evaluation = Evaluation::findOrFail($id);

            DB::beginTransaction();

            // Delete related evaluation scores
            // No longer needed since we removed evaluation scores table

            $evaluation->delete();

            DB::commit();

            return response()->json(['message' => 'Evaluation deleted successfully']);

        } catch (\Exception $e) {
            DB::rollBack();
            return response()->json([
                'error' => 'Failed to delete evaluation',
                'message' => $e->getMessage()
            ], 500);
        }
    }

    public function getEvaluationCriteria(Request $request)
    {
        // Removed - no longer needed
        return response()->json([]);
    }

    public function getEvaluationPeriods(Request $request)
    {
        // Removed - no longer needed
        return response()->json([]);
    }

    public function getStudentEvaluationSummary(Request $request, $studentId)
    {
        try {
            $user = $request->user();
            if (!$user || (!$user->isAdmin() && !$user->hasRole('Dean') && !$user->hasRole('Faculty'))) {
                return response()->json(['message' => 'Unauthorized'], 401);
            }

            $student = StudentProfile::with(['program'])->findOrFail($studentId);

            $evaluations = Evaluation::where('student_id', $studentId)
                ->with(['subject', 'academicYear', 'semester'])
                ->get();

            $summary = [
                'total_evaluations' => $evaluations->count(),
                'passed_evaluations' => $evaluations->where('evaluation_status', 'passed')->count(),
                'failed_evaluations' => $evaluations->where('evaluation_status', 'failed')->count(),
                'ongoing_evaluations' => $evaluations->where('evaluation_status', 'ongoing')->count(),
                'average_grade' => $evaluations->whereNotNull('grade')->avg('grade'),
            ];

            return response()->json([
                'student' => $student,
                'summary' => $summary,
                'evaluations' => $evaluations
            ]);

        } catch (\Exception $e) {
            return response()->json([
                'error' => 'Failed to fetch student evaluation summary',
                'message' => $e->getMessage()
            ], 500);
        }
    }
}
