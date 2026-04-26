<?php

namespace App\Http\Controllers;

use App\Models\CreditEvaluation;
use App\Models\CreditEvaluationDetail;
use App\Models\OtherSchoolSubject;
use App\Models\SubjectEquivalence;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class SubjectEquivalenceController extends Controller
{
    /**
     * Who may read the equivalence list (for Credit Evaluation UI and Subject Equivalences admin).
     * Mutations: credit_eval create/approve (or System Management), same as other-school-subject catalog.
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

    /** Create/update/delete — same audience as other-school-subject maintenance (credit eval staff, not view-only). */
    protected function canMutateSubjectEquivalences($user): bool
    {
        if (! $user) {
            return false;
        }
        if ($user->hasPermission('System Management') || $user->isAdmin()) {
            return true;
        }

        return $user->hasAnyPermission([
            'Credit Evaluation',
            'credit_eval.create',
            'credit_eval.approve',
        ]);
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
            if (! $this->canMutateSubjectEquivalences($user)) {
                return response()->json(['message' => 'Unauthorized'], 403);
            }

            $validated = $request->validate([
                'other_school_subject' => 'required|exists:tbl_other_school_subjects,other_subject_id',
                'subject_id' => 'required|exists:tbl_subjects,subject_id',
                'credited_units' => 'nullable|integer',
                'credit_basis' => 'nullable|string|max:50',
                'status' => 'nullable|string|max:50',
                'remarks' => 'nullable|string',
                /** When saving from curriculum evaluation: attach orphan transfer intakes to this roster student. */
                'for_student_id' => 'nullable|integer|exists:tbl_student_profile,student_id',
                /**
                 * When changing the external course on an already-linked PEN row: transfer-intake lines for this
                 * student that used the previous other_subject_id are updated to the new one before duplicate checks.
                 */
                'from_other_subject_id' => 'nullable|integer|exists:tbl_other_school_subjects,other_subject_id',
            ]);

            $forStudentId = isset($validated['for_student_id']) ? (int) $validated['for_student_id'] : 0;
            $fromOtherId = isset($validated['from_other_subject_id']) ? (int) $validated['from_other_subject_id'] : 0;
            $equivPayload = $validated;
            unset($equivPayload['for_student_id'], $equivPayload['from_other_subject_id']);

            $otherId = (int) $validated['other_school_subject'];
            $localId = (int) $validated['subject_id'];

            if ($forStudentId > 0 && $fromOtherId > 0 && $fromOtherId !== $otherId) {
                DB::update(
                    'UPDATE tbl_credit_evaluation_details d
                    INNER JOIN tbl_credit_evaluation e ON d.credit_eval_id = e.credit_eval_id
                    SET d.other_subject_id = ?
                    WHERE e.is_active = 1
                    AND (
                        LOWER(TRIM(e.status)) = ?
                        OR LOWER(TRIM(e.status)) = ?
                    )
                    AND (e.student_id = ? OR d.student_id = ?)
                    AND d.subject_id = ?
                    AND d.other_subject_id = ?',
                    [$otherId, 'approved', 'pending', $forStudentId, $forStudentId, $localId, $fromOtherId]
                );
            }

            /**
             * One prior-school course (other_subject_id) must not credit two different catalog subjects for the same
             * roster student. Reusing the same external course toward the same PEN subject is allowed (and shares one
             * catalog equivalence row via updateOrCreate below).
             */
            if ($forStudentId > 0) {
                $alreadyMappedElsewhere = DB::table('tbl_credit_evaluation_details as d')
                    ->join('tbl_credit_evaluation as e', 'd.credit_eval_id', '=', 'e.credit_eval_id')
                    ->where('e.is_active', true)
                    ->where(function ($q) use ($forStudentId) {
                        $q->where('e.student_id', $forStudentId)
                            ->orWhere('d.student_id', $forStudentId);
                    })
                    ->where('d.other_subject_id', $otherId)
                    ->whereNotNull('d.subject_id')
                    ->where('d.subject_id', '!=', $localId)
                    ->exists();
                if ($alreadyMappedElsewhere) {
                    return response()->json([
                        'message' => 'This external course is already applied toward a different catalog subject for this student. Remove or edit that transfer line before mapping it here.',
                    ], 422);
                }
            }

            // One row per (prior-school course, local subject): reusable only for that same equivalence pair, not across different PEN subjects.
            $equivalence = SubjectEquivalence::updateOrCreate(
                [
                    'other_school_subject' => $otherId,
                    'subject_id' => $localId,
                ],
                $equivPayload
            );
            $equivalence->load(['subject', 'otherSchoolSubject']);
            $pendingFillCount = CreditEvaluationDetail::query()
                ->where('other_subject_id', $otherId)
                ->whereNull('subject_id')
                ->count();
            CreditEvaluationDetail::query()
                ->where('other_subject_id', $otherId)
                ->whereNull('subject_id')
                ->update(['subject_id' => $localId]);
            if (isset($validated['credited_units']) && $validated['credited_units'] !== null && $validated['credited_units'] !== '') {
                $cu = (int) $validated['credited_units'];
                CreditEvaluationDetail::query()
                    ->where('other_subject_id', $otherId)
                    ->where('subject_id', $localId)
                    ->whereNull('credited_units')
                    ->update(['credited_units' => $cu]);
            }

            // Keep detail.student_id aligned with the parent evaluation so curriculum queries can match by roster id.
            DB::statement(
                'UPDATE tbl_credit_evaluation_details d INNER JOIN tbl_credit_evaluation e ON d.credit_eval_id = e.credit_eval_id SET d.student_id = e.student_id WHERE d.other_subject_id = ? AND d.subject_id = ? AND d.student_id IS NULL AND e.student_id IS NOT NULL',
                [$otherId, $localId]
            );

            /**
             * Curriculum save (for_student_id): link orphan intakes to this roster student and point this
             * external course at the PEN subject chosen on the grid — even if a prior equivalence had already
             * filled subject_id with a different local code (otherwise ITE397 would never credit when test→ITE307 existed).
             */
            $linkedTransferIntakeBatches = 0;
            if ($forStudentId > 0) {
                $batchRow = DB::selectOne(
                    'SELECT COUNT(DISTINCT e.credit_eval_id) AS c
                     FROM tbl_credit_evaluation_details d
                     INNER JOIN tbl_credit_evaluation e ON d.credit_eval_id = e.credit_eval_id
                     WHERE e.student_id IS NULL AND d.other_subject_id = ?',
                    [$otherId]
                );
                $linkedTransferIntakeBatches = (int) ($batchRow->c ?? 0);

                if ($linkedTransferIntakeBatches > 0) {
                    DB::update(
                        'UPDATE tbl_credit_evaluation_details d
                        INNER JOIN tbl_credit_evaluation e ON d.credit_eval_id = e.credit_eval_id
                        SET d.subject_id = ?, d.student_id = ?, e.student_id = ?
                        WHERE e.student_id IS NULL AND d.other_subject_id = ?',
                        [$localId, $forStudentId, $forStudentId, $otherId]
                    );
                }
            }

            $synthesizedStudentCreditLine = 0;
            if ($forStudentId > 0) {
                $synthesizedStudentCreditLine = $this->ensureStudentCreditDetailForCurriculumMapping(
                    $forStudentId,
                    $otherId,
                    $localId,
                    $validated['credited_units'] ?? null,
                    isset($validated['credit_basis']) ? trim((string) $validated['credit_basis']) : null,
                    (int) $user->user_id
                );
            }

            $httpStatus = $equivalence->wasRecentlyCreated ? 201 : 200;

            return response()->json(array_merge($equivalence->toArray(), [
                'updated_pending_credit_lines' => $pendingFillCount,
                'linked_transfer_intake_batches' => $linkedTransferIntakeBatches,
                'synthesized_student_credit_line' => $synthesizedStudentCreditLine,
            ]), $httpStatus);
        } catch (\Exception $e) {
            return response()->json(['error' => 'Failed to create subject equivalence', 'message' => $e->getMessage()], 500);
        }
    }

    /**
     * Unlink transfer-intake lines for this roster student from a PEN subject (clears curriculum "Credited" for that row).
     * Does not delete the global subject-equivalence catalog row.
     */
    public function clearStudentMapping(Request $request)
    {
        try {
            $user = $request->user();
            if (! $this->canMutateSubjectEquivalences($user)) {
                return response()->json(['message' => 'Unauthorized'], 403);
            }

            $validated = $request->validate([
                'for_student_id' => 'required|integer|exists:tbl_student_profile,student_id',
                'subject_id' => 'required|integer|exists:tbl_subjects,subject_id',
                'other_subject_id' => 'required|integer|exists:tbl_other_school_subjects,other_subject_id',
            ]);

            $studentId = (int) $validated['for_student_id'];
            $subjectId = (int) $validated['subject_id'];
            $otherId = (int) $validated['other_subject_id'];

            $cleared = DB::update(
                'UPDATE tbl_credit_evaluation_details d
                INNER JOIN tbl_credit_evaluation e ON d.credit_eval_id = e.credit_eval_id
                SET d.subject_id = NULL
                WHERE e.is_active = 1
                AND (
                    LOWER(TRIM(e.status)) = ?
                    OR LOWER(TRIM(e.status)) = ?
                )
                AND (e.student_id = ? OR d.student_id = ?)
                AND d.subject_id = ?
                AND d.other_subject_id = ?',
                ['approved', 'pending', $studentId, $studentId, $subjectId, $otherId]
            );

            return response()->json([
                'message' => $cleared > 0
                    ? 'Transfer link removed for this curriculum subject.'
                    : 'No matching transfer line was updated (it may already be cleared or archived).',
                'cleared_rows' => $cleared,
            ]);
        } catch (\Illuminate\Validation\ValidationException $e) {
            throw $e;
        } catch (\Exception $e) {
            return response()->json(['error' => 'Failed to clear mapping', 'message' => $e->getMessage()], 500);
        }
    }

    public function update(Request $request, $id)
    {
        try {
            $user = $request->user();
            if (! $this->canMutateSubjectEquivalences($user)) {
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
            if (! $this->canMutateSubjectEquivalences($user)) {
                return response()->json(['message' => 'Unauthorized'], 403);
            }

            $equivalence = SubjectEquivalence::findOrFail($id);
            $equivalence->delete();

            return response()->json(['message' => 'Subject equivalence deleted successfully']);
        } catch (\Exception $e) {
            return response()->json(['error' => 'Failed to delete subject equivalence', 'message' => $e->getMessage()], 500);
        }
    }

    /**
     * Curriculum evaluation only shows "Credited" when an active approved/pending transfer detail exists for this
     * student with both other_subject_id and subject_id. If saving the equivalence did not touch any intake line,
     * attach (or create) one so the grid updates after refresh.
     *
     * @return int 1 if a new detail row was inserted, 0 if a qualifying line already existed or nothing was done
     */
    protected function ensureStudentCreditDetailForCurriculumMapping(
        int $forStudentId,
        int $otherId,
        int $localId,
        mixed $creditedUnits,
        ?string $creditBasis,
        int $evaluatedByUserId
    ): int {
        $alreadyLinked = DB::table('tbl_credit_evaluation_details as d')
            ->join('tbl_credit_evaluation as e', 'd.credit_eval_id', '=', 'e.credit_eval_id')
            ->where('e.is_active', true)
            ->where(function ($q) use ($forStudentId) {
                $q->where('e.student_id', $forStudentId)
                    ->orWhere('d.student_id', $forStudentId);
            })
            ->where('d.other_subject_id', $otherId)
            ->where('d.subject_id', $localId)
            ->where(function ($q) {
                $q->whereRaw('LOWER(TRIM(e.status)) = ?', ['approved'])
                    ->orWhereRaw('LOWER(TRIM(e.status)) = ?', ['pending']);
            })
            ->exists();

        if ($alreadyLinked) {
            return 0;
        }

        $oss = OtherSchoolSubject::query()->find($otherId);
        $schoolId = $oss && $oss->school_id !== null && $oss->school_id !== '' ? (int) $oss->school_id : null;
        $priorName = 'Curriculum evaluation';
        if ($schoolId !== null) {
            $schoolName = DB::table('tbl_schools')->where('school_id', $schoolId)->value('school_name');
            if ($schoolName !== null && trim((string) $schoolName) !== '') {
                $priorName = trim((string) $schoolName);
            }
        }

        $evaluation = CreditEvaluation::query()
            ->where('student_id', $forStudentId)
            ->where('is_active', true)
            ->where(function ($q) {
                $q->whereRaw('LOWER(TRIM(status)) = ?', ['approved'])
                    ->orWhereRaw('LOWER(TRIM(status)) = ?', ['pending']);
            })
            ->orderByDesc('credit_eval_id')
            ->first();

        if ($evaluation === null) {
            $evaluation = CreditEvaluation::create([
                'student_id' => $forStudentId,
                'school_id' => $schoolId,
                'prior_school_name' => $priorName,
                'credit_type' => 'Transfer',
                'evaluated_by' => $evaluatedByUserId,
                'evaluation_date' => now()->toDateString(),
                'status' => 'approved',
                'remarks' => 'Recorded when saving subject equivalence from curriculum evaluation.',
                'is_active' => true,
                'transfer_first_name' => null,
                'transfer_middle_name' => null,
                'transfer_last_name' => null,
            ]);
        }

        $dup = CreditEvaluationDetail::query()
            ->where('credit_eval_id', $evaluation->credit_eval_id)
            ->where('other_subject_id', $otherId)
            ->where('subject_id', $localId)
            ->exists();
        if ($dup) {
            return 0;
        }

        $cu = ($creditedUnits !== null && $creditedUnits !== '') ? (int) $creditedUnits : null;
        $cb = ($creditBasis !== null && $creditBasis !== '') ? mb_substr($creditBasis, 0, 50) : null;

        CreditEvaluationDetail::create([
            'credit_eval_id' => $evaluation->credit_eval_id,
            'student_id' => $forStudentId,
            'other_subject_id' => $otherId,
            'subject_id' => $localId,
            'credited_units' => $cu,
            'credit_basis' => $cb,
            'remarks' => null,
        ]);

        return 1;
    }
}

