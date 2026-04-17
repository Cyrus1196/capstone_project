<?php

namespace App\Http\Controllers;

use App\Models\SubjectEquivalence;
use Illuminate\Http\Request;

class SubjectEquivalenceController extends Controller
{
    /**
     * Who may read the equivalence list (for Credit Evaluation UI and Subject Equivalences admin).
     * Mutations still require System Management only.
     */
    protected function canViewSubjectEquivalencesList($user): bool
    {
        if (!$user) {
            return false;
        }
        if ($user->hasPermission('System Management')) {
            return true;
        }

        return $user->isAdmin()
            || $user->hasAnyPermission([
                'Credit Evaluation',
                'credit_eval.view',
                'credit_eval.create',
                'credit_eval.approve',
            ])
            || $user->isEvaluatorLike();
    }

    public function index(Request $request)
    {
        try {
            $user = $request->user();
            if (!$this->canViewSubjectEquivalencesList($user)) {
                return response()->json(['message' => 'Unauthorized'], 403);
            }

            $equivalences = SubjectEquivalence::with(['subject', 'otherSchoolSubject'])->get();
            return response()->json($equivalences);
        } catch (\Exception $e) {
            return response()->json(['error' => 'Failed to fetch subject equivalences', 'message' => $e->getMessage()], 500);
        }
    }

    public function store(Request $request)
    {
        try {
            $user = $request->user();
            if (!$user || !$user->hasPermission('System Management')) {
                return response()->json(['message' => 'Unauthorized'], 403);
            }

            $validated = $request->validate([
                'other_school_subject' => 'required|exists:tbl_other_school_subjects,other_subject_id',
                'subject_id' => 'required|exists:tbl_subjects,subject_id',
                'credited_units' => 'nullable|integer',
                'credit_basis' => 'nullable|string|max:50',
                'status' => 'nullable|string|max:50',
                'remarks' => 'nullable|string',
            ]);

            $equivalence = SubjectEquivalence::create($validated);
            $equivalence->load(['subject', 'otherSchoolSubject']);
            return response()->json($equivalence, 201);
        } catch (\Exception $e) {
            return response()->json(['error' => 'Failed to create subject equivalence', 'message' => $e->getMessage()], 500);
        }
    }

    public function update(Request $request, $id)
    {
        try {
            $user = $request->user();
            if (!$user || !$user->hasPermission('System Management')) {
                return response()->json(['message' => 'Unauthorized'], 403);
            }

            $equivalence = SubjectEquivalence::findOrFail($id);

            $validated = $request->validate([
                'other_school_subject' => 'required|exists:tbl_other_school_subjects,other_subject_id',
                'subject_id' => 'required|exists:tbl_subjects,subject_id',
                'credited_units' => 'nullable|integer',
                'credit_basis' => 'nullable|string|max:50',
                'status' => 'nullable|string|max:50',
                'remarks' => 'nullable|string',
            ]);

            $equivalence->update($validated);
            $equivalence->load(['subject', 'otherSchoolSubject']);
            return response()->json($equivalence);
        } catch (\Exception $e) {
            return response()->json(['error' => 'Failed to update subject equivalence', 'message' => $e->getMessage()], 500);
        }
    }

    public function destroy(Request $request, $id)
    {
        try {
            $user = $request->user();
            if (!$user || !$user->hasPermission('System Management')) {
                return response()->json(['message' => 'Unauthorized'], 403);
            }

            $equivalence = SubjectEquivalence::findOrFail($id);
            $equivalence->delete();

            return response()->json(['message' => 'Subject equivalence deleted successfully']);
        } catch (\Exception $e) {
            return response()->json(['error' => 'Failed to delete subject equivalence', 'message' => $e->getMessage()], 500);
        }
    }
}

