<?php

namespace App\Http\Controllers;

use App\Models\CreditEvaluation;
use App\Models\CreditEvaluationDetail;
use App\Models\StudentProfile;
use App\Models\School;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class CreditEvaluationController extends Controller
{
    protected function canAccessCreditEvaluations($user): bool
    {
        if (!$user) {
            return false;
        }
        if ($user->isAdmin()) {
            return true;
        }

        return $user->hasRole('Dean')
            || $user->hasRole('Faculty')
            || $user->hasRole('Adviser');
    }

    public function index(Request $request)
    {
        try {
            if (!$this->canAccessCreditEvaluations($request->user())) {
                return response()->json(['message' => 'Unauthorized'], 403);
            }

            $evaluations = CreditEvaluation::with(['student', 'school', 'evaluator', 'creditDetails.subject', 'creditDetails.otherSchoolSubject'])
                ->orderBy('evaluation_date', 'desc')
                ->get();

            return response()->json($evaluations);
        } catch (\Exception $e) {
            return response()->json(['error' => 'Failed to fetch credit evaluations', 'message' => $e->getMessage()], 500);
        }
    }

    public function store(Request $request)
    {
        try {
            if (!$request->user() || !$request->user()->isAdmin()) {
                return response()->json(['message' => 'Unauthorized — only administrators can create credit requests'], 403);
            }

            $validated = $request->validate([
                'student_id' => 'required|exists:tbl_student_profile,student_id',
                'school_id' => 'required|exists:tbl_schools,school_id',
                'credit_type' => 'required|string|max:50',
                'evaluated_by' => 'required|exists:tbl_users,user_id',
                'evaluation_date' => 'required|date',
                'status' => 'nullable|string|max:50',
                'remarks' => 'nullable|string',
                'credit_details' => 'required|array|min:1',
                'credit_details.*.other_subject_id' => 'required|exists:tbl_other_school_subjects,other_subject_id',
                'credit_details.*.subject_id' => 'required|exists:tbl_subjects,subject_id',
                'credit_details.*.credited_units' => 'nullable|integer',
                'credit_details.*.credit_basis' => 'nullable|string|max:50',
                'credit_details.*.remarks' => 'nullable|string',
            ]);

            DB::beginTransaction();

            $evaluation = CreditEvaluation::create([
                'student_id' => $validated['student_id'],
                'school_id' => $validated['school_id'],
                'credit_type' => $validated['credit_type'],
                'evaluated_by' => $validated['evaluated_by'],
                'evaluation_date' => $validated['evaluation_date'],
                'status' => $validated['status'] ?? 'pending',
                'remarks' => $validated['remarks'] ?? null,
            ]);

            foreach ($validated['credit_details'] as $detail) {
                CreditEvaluationDetail::create([
                    'student_id' => $validated['student_id'],
                    'other_subject_id' => $detail['other_subject_id'],
                    'subject_id' => $detail['subject_id'],
                    'credited_units' => $detail['credited_units'] ?? null,
                    'credit_basis' => $detail['credit_basis'] ?? null,
                    'remarks' => $detail['remarks'] ?? null,
                ]);
            }

            DB::commit();

            $evaluation->load(['student', 'school', 'evaluator', 'creditDetails.subject', 'creditDetails.otherSchoolSubject']);

            return response()->json($evaluation, 201);
        } catch (\Exception $e) {
            DB::rollBack();
            return response()->json(['error' => 'Failed to create credit evaluation', 'message' => $e->getMessage()], 500);
        }
    }

    public function show(Request $request, $id)
    {
        try {
            if (!$this->canAccessCreditEvaluations($request->user())) {
                return response()->json(['message' => 'Unauthorized'], 403);
            }

            $evaluation = CreditEvaluation::with(['student', 'school', 'evaluator', 'creditDetails.subject', 'creditDetails.otherSchoolSubject'])
                ->findOrFail($id);

            return response()->json($evaluation);
        } catch (\Exception $e) {
            return response()->json(['error' => 'Failed to fetch credit evaluation', 'message' => $e->getMessage()], 500);
        }
    }

    public function update(Request $request, $id)
    {
        try {
            $user = $request->user();
            if (!$this->canAccessCreditEvaluations($user)) {
                return response()->json(['message' => 'Unauthorized'], 403);
            }

            $evaluation = CreditEvaluation::findOrFail($id);

            if ($user->isAdmin()) {
                $validated = $request->validate([
                    'student_id' => 'required|exists:tbl_student_profile,student_id',
                    'school_id' => 'required|exists:tbl_schools,school_id',
                    'credit_type' => 'required|string|max:50',
                    'evaluated_by' => 'required|exists:tbl_users,user_id',
                    'evaluation_date' => 'required|date',
                    'status' => 'nullable|string|max:50',
                    'remarks' => 'nullable|string',
                ]);
                $evaluation->update($validated);
            } else {
                $validated = $request->validate([
                    'status' => 'required|string|max:50',
                    'remarks' => 'nullable|string',
                ]);
                $evaluation->update($validated);
            }

            $evaluation->load(['student', 'school', 'evaluator', 'creditDetails.subject', 'creditDetails.otherSchoolSubject']);

            return response()->json($evaluation);
        } catch (\Exception $e) {
            return response()->json(['error' => 'Failed to update credit evaluation', 'message' => $e->getMessage()], 500);
        }
    }

    public function destroy(Request $request, $id)
    {
        try {
            if (!$request->user() || !$request->user()->isAdmin()) {
                return response()->json(['message' => 'Unauthorized'], 403);
            }

            DB::beginTransaction();

            $evaluation = CreditEvaluation::findOrFail($id);
            CreditEvaluationDetail::where('student_id', $evaluation->student_id)->delete();
            $evaluation->delete();

            DB::commit();

            return response()->json(['message' => 'Credit evaluation deleted successfully']);
        } catch (\Exception $e) {
            DB::rollBack();
            return response()->json(['error' => 'Failed to delete credit evaluation', 'message' => $e->getMessage()], 500);
        }
    }
}

