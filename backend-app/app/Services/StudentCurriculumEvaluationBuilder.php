<?php

namespace App\Services;

use App\Models\Curriculum;
use App\Models\Evaluation;
use App\Models\StudentProfile;
use Illuminate\Support\Facades\DB;

/**
 * Builds curriculum-order evaluation rows and computed academic status (Regular / Irregular)
 * from stored evaluations — shared by StudentEvaluationController and student profile API.
 */
class StudentCurriculumEvaluationBuilder
{
    /**
     * Local subject IDs covered by transfer credit: approved evaluations, or pending once a
     * detail row has subject_id (e.g. after Dean maps subject equivalence from evaluation).
     *
     * @return \Illuminate\Support\Collection<int, int|string>
     */
    public function subjectIdsWithTransferCreditForStudent(int $studentId): \Illuminate\Support\Collection
    {
        return DB::table('tbl_credit_evaluation_details as d')
            ->join('tbl_credit_evaluation as e', 'd.credit_eval_id', '=', 'e.credit_eval_id')
            ->where(function ($q) use ($studentId) {
                $q->where('e.student_id', $studentId)
                    ->orWhere('d.student_id', $studentId);
            })
            ->where('e.is_active', true)
            ->whereNotNull('d.subject_id')
            ->where(function ($q) {
                $q->whereRaw('LOWER(TRIM(e.status)) = ?', ['approved'])
                    ->orWhereRaw('LOWER(TRIM(e.status)) = ?', ['pending']);
            })
            ->pluck('d.subject_id')
            ->unique();
    }

    /**
     * For each local subject_id, the other-school subject id from the student's active transfer line
     * (newest detail row wins). Used to pre-fill the curriculum equivalence modal when reopening a Credited row.
     *
     * @return array<int, int>
     */
    protected function transferCreditOtherSubjectMapForStudent(int $studentId): array
    {
        $rows = DB::table('tbl_credit_evaluation_details as d')
            ->join('tbl_credit_evaluation as e', 'd.credit_eval_id', '=', 'e.credit_eval_id')
            ->where(function ($q) use ($studentId) {
                $q->where('e.student_id', $studentId)
                    ->orWhere('d.student_id', $studentId);
            })
            ->where('e.is_active', true)
            ->whereNotNull('d.subject_id')
            ->whereNotNull('d.other_subject_id')
            ->where(function ($q) {
                $q->whereRaw('LOWER(TRIM(e.status)) = ?', ['approved'])
                    ->orWhereRaw('LOWER(TRIM(e.status)) = ?', ['pending']);
            })
            ->orderByDesc('d.credit_detail_id')
            ->select('d.subject_id', 'd.other_subject_id')
            ->get();

        $map = [];
        foreach ($rows as $r) {
            $sid = (int) $r->subject_id;
            if ($sid < 1) {
                continue;
            }
            if (! isset($map[$sid])) {
                $map[$sid] = (int) $r->other_subject_id;
            }
        }

        return $map;
    }

    /**
     * @return array{
     *   computed_academic_status: string,
     *   academic_status_reasons: list<string>,
     *   student: array<string, mixed>,
     *   summary: array{total_units_in_curriculum: int, total_units_earned: int, lacking_units: int},
     *   rows: list<array<string, mixed>>
     * }
     */
    public function buildPayload(StudentProfile $profile): array
    {
        $profile->loadMissing(['program', 'track']);

        app(IncComplianceExpiryService::class)->expireOverdue($profile->student_id);

        if (! $profile->current_program) {
            return [
                'computed_academic_status' => 'Regular',
                'academic_status_reasons' => [],
                'student' => $this->studentSummary($profile),
                'summary' => [
                    'total_units_in_curriculum' => 0,
                    'total_units_earned' => 0,
                    'lacking_units' => 0,
                ],
                'rows' => [],
            ];
        }

        $curriculum = Curriculum::where('program_id', $profile->current_program)
            ->with([
                'subject.prerequisites.requiredSubject',
                'yearLevel',
                'semester',
                'electiveSlot.electiveSubjects.subject',
                'electiveSlot.electiveSubjects.track',
            ])
            ->orderBy('year_level')
            ->orderBy('semester_id')
            ->get();

        $evaluations = Evaluation::where('student_id', $profile->student_id)
            ->with(['subject', 'academicYear', 'semester', 'section', 'evaluatedBy'])
            ->get();

        $evaluationsBySubject = $evaluations
            ->groupBy('subject_id')
            ->map(function ($group) {
                return $group->sortByDesc('academic_year_id')
                    ->sortByDesc('semester_id')
                    ->first();
            });

        $studentId = (int) $profile->student_id;
        $transferCreditSubjectIds = $this->subjectIdsWithTransferCreditForStudent($studentId);
        $transferCreditOtherBySubjectId = $this->transferCreditOtherSubjectMapForStudent($studentId);

        $defaultAcademicYearId = DB::table('tbl_academic_year')
            ->orderBy('academic_year_id', 'desc')
            ->value('academic_year_id');

        $rows = [];
        $passedInOrder = [];
        $totalUnitsInCurriculum = 0;
        $totalUnitsEarned = 0;

        $studentTrackId = $profile->track_id;

        foreach ($curriculum as $item) {
            $resolvedSubject = $item->subject;

            if (! $resolvedSubject && $item->electiveSlot) {
                $electiveSubjects = $item->electiveSlot->electiveSubjects ?? collect();
                $resolvedSubject = ElectiveSubjectResolver::resolveForCurriculumSlot(
                    $electiveSubjects,
                    $studentTrackId !== null ? (int) $studentTrackId : null,
                    $item->semester_id !== null ? (int) $item->semester_id : null,
                    $evaluations
                );
            }

            if (! $resolvedSubject) {
                $passedInOrder[] = false;
                $slot = $item->electiveSlot;
                $choiceList = [];
                $electiveSubjectsForChoices = $slot
                    ? ($slot->electiveSubjects ?? collect())
                    : collect();
                foreach ($electiveSubjectsForChoices as $es) {
                    $sub = $es->subject;
                    if (! $sub) {
                        continue;
                    }
                    $tr = $es->track;
                    $tid = $es->track_id;
                    $choiceList[] = [
                        'elective_subject_id' => (int) $es->elective_subject_id,
                        'track_id' => $tid !== null && $tid !== '' ? (int) $tid : null,
                        'track_name' => $tr?->track_name,
                        'track_code' => $tr?->track_code,
                        'subject_id' => (int) $es->subject_id,
                        'subject_code' => $sub->subject_code ?? null,
                        'subject_name' => $sub->subject_name ?? null,
                        'units' => (int) ($sub->number_of_units ?? 0),
                    ];
                }
                $rows[] = [
                    'curriculum_id' => $item->curriculum_id,
                    'year_level_id' => $item->year_level,
                    'year_level_name' => $item->yearLevel->year_level ?? null,
                    'semester_id' => $item->semester_id,
                    'semester_name' => $item->semester->semester_name ?? null,
                    'subject_id' => null,
                    'subject_code' => ($slot && trim((string) $slot->slot_name) !== '')
                        ? $slot->slot_name
                        : 'Elective 1',
                    'subject_name' => ($slot && trim((string) $slot->slot_name) !== '')
                        ? 'Pending track selection'
                        : 'Curriculum row has no subject (admin should fix this entry)',
                    'units' => 0,
                    'passing_grade' => $item->passing_grade,
                    'grade' => null,
                    'status' => null,
                    'passed_via_transfer_credit' => false,
                    'units_earned' => 0,
                    'prerequisite' => null,
                    'corequisite' => null,
                    'prerequisite_subject_codes' => [],
                    'corequisite_subject_codes' => [],
                    'evaluation_id' => null,
                    'academic_year_id' => $defaultAcademicYearId,
                    'evaluated_by' => null,
                    'evaluation_date' => null,
                    'enrolled_date' => null,
                    'elective_pending' => (bool) $slot,
                    'elective_slot_id' => $slot?->elective_slot_id,
                    'elective_choices' => $choiceList,
                ];

                continue;
            }

            $subject = $resolvedSubject;
            $subject->loadMissing(['prerequisites.requiredSubject']);
            $units = (int) ($subject->number_of_units ?? 0);
            $totalUnitsInCurriculum += $units;

            $sid = $subject->subject_id;
            $evaluation = $evaluationsBySubject->get($sid);
            $grade = $evaluation?->grade ?? null;
            $status = $evaluation?->evaluation_status ?? null;

            $normalizedStatus = $status ? strtolower($status) : null;
            $isPassedStatus = in_array($normalizedStatus, ['passed', 'pass', 'credit']);

            $isPassedByGrade = false;
            if ($grade !== null && $item->passing_grade !== null && is_numeric($grade)) {
                $isPassedByGrade = floatval($grade) >= floatval($item->passing_grade);
            }

            $isPassedFromRecord = $isPassedStatus || $isPassedByGrade;
            $isPassedByApprovedCredit = $sid !== null
                && $transferCreditSubjectIds->contains($sid);
            $isPassed = $isPassedFromRecord || $isPassedByApprovedCredit;
            $passedInOrder[] = $isPassed;
            $unitsEarned = $isPassed ? $units : 0;
            $totalUnitsEarned += $unitsEarned;

            $prereqCodes = [];
            $coreqCodes = [];
            foreach ($subject->prerequisites ?? [] as $p) {
                $type = strtolower((string) ($p->requisite_type ?? 'prerequisite'));
                $c = $p->requiredSubject->subject_code ?? null;
                if ($c === null || trim((string) $c) === '') {
                    continue;
                }
                $c = trim((string) $c);
                if ($type === 'corequisite') {
                    $coreqCodes[] = $c;
                } else {
                    $prereqCodes[] = $c;
                }
            }

            $rows[] = [
                'curriculum_id' => $item->curriculum_id,
                'year_level_id' => $item->year_level,
                'year_level_name' => $item->yearLevel->year_level ?? null,
                'semester_id' => $item->semester_id,
                'semester_name' => $item->semester->semester_name ?? null,
                'subject_id' => $sid,
                'subject_code' => $subject->subject_code ?? null,
                'subject_name' => $subject->subject_name ?? null,
                'units' => $units,
                'passing_grade' => $item->passing_grade,
                'grade' => $grade,
                'status' => $isPassedByApprovedCredit && ! $isPassedFromRecord ? 'Credit' : $status,
                'passed_via_transfer_credit' => (bool) $isPassedByApprovedCredit,
                'transfer_credit_other_subject_id' => $transferCreditOtherBySubjectId[$sid] ?? null,
                'units_earned' => $unitsEarned,
                'prerequisite' => null,
                'corequisite' => null,
                'prerequisite_subject_codes' => $prereqCodes,
                'corequisite_subject_codes' => $coreqCodes,
                    'evaluation_id' => $evaluation?->evaluation_id ?? null,
                    'academic_year_id' => $evaluation?->academic_year_id ?? $defaultAcademicYearId,
                    'evaluated_by' => $evaluation?->evaluatedBy,
                    'evaluation_date' => $evaluation?->evaluation_date,
                    'enrolled_date' => $evaluation?->enrolled_date,
                    'inc_compliance_deadline' => $evaluation?->inc_compliance_deadline
                        ? $evaluation->inc_compliance_deadline->format('Y-m-d')
                        : null,
                ];
        }

        $lackingUnits = max(0, $totalUnitsInCurriculum - $totalUnitsEarned);

        $classified = AcademicStatusClassifier::fromPassSequence($passedInOrder);

        return [
            'computed_academic_status' => $classified['status'],
            'academic_status_reasons' => $classified['reasons'],
            'student' => $this->studentSummary($profile),
            'summary' => [
                'total_units_in_curriculum' => $totalUnitsInCurriculum,
                'total_units_earned' => $totalUnitsEarned,
                'lacking_units' => $lackingUnits,
            ],
            'rows' => $rows,
        ];
    }

    /**
     * Persist year_level_id and academic_status from the same curriculum evaluation payload
     * as computed_academic_status (Regular / Irregular from sequence rules).
     *
     * @param  array{rows?: list<array<string, mixed>>, computed_academic_status?: string}|null  $built  From buildPayload(); omit to run one build.
     */
    public function syncStudentProfileFromCurriculumProgress(StudentProfile $profile, ?array $built = null): bool
    {
        if ($built === null) {
            $built = $this->buildPayload($profile);
        }

        $rows = $built['rows'] ?? [];
        $changed = false;

        $suggested = $this->suggestYearLevelIdFromCurriculumRows($rows);
        if ($suggested !== null) {
            $currentYl = $profile->year_level_id;
            if ($currentYl === null || (int) $currentYl !== (int) $suggested) {
                $profile->year_level_id = $suggested;
                $changed = true;
            }
        }

        $computed = $built['computed_academic_status'] ?? null;
        if ($computed === 'Regular' || $computed === 'Irregular') {
            $currentAcad = (string) ($profile->academic_status ?? '');
            if ($currentAcad !== $computed) {
                $profile->academic_status = $computed;
                $changed = true;
            }
        }

        if (! $changed) {
            return false;
        }

        return $profile->save();
    }

    /**
     * @param  list<array<string, mixed>>  $rows
     */
    private function suggestYearLevelIdFromCurriculumRows(array $rows): ?int
    {
        if ($rows === []) {
            return null;
        }

        $byYear = [];
        foreach ($rows as $row) {
            $y = $row['year_level_id'] ?? null;
            if ($y === null || $y === '') {
                continue;
            }
            $y = (int) $y;
            $byYear[$y][] = $row;
        }

        if ($byYear === []) {
            return null;
        }

        ksort($byYear, SORT_NUMERIC);

        foreach ($byYear as $yearId => $yearRows) {
            foreach ($yearRows as $r) {
                if (! $this->curriculumRowIndicatesPassed($r)) {
                    return $yearId;
                }
            }
        }

        return (int) max(array_keys($byYear));
    }

    /**
     * Whether prerequisite subjects in the same built payload are satisfied for grading this slot.
     * Corequisites are concurrent with this subject and are not required to be passed beforehand.
     *
     * @param  list<array<string, mixed>>  $allRows
     * @param  array<string, mixed>  $targetRow
     */
    public function rowPrerequisitesMet(array $allRows, array $targetRow): bool
    {
        /** @var list<string> $codes */
        $codes = array_values(array_unique($targetRow['prerequisite_subject_codes'] ?? []));
        if ($codes === []) {
            return true;
        }
        foreach ($codes as $code) {
            $codeNorm = strtoupper(trim((string) $code));
            if ($codeNorm === '') {
                continue;
            }
            $pr = null;
            foreach ($allRows as $r) {
                $rc = strtoupper(trim((string) ($r['subject_code'] ?? '')));
                if ($rc === $codeNorm) {
                    $pr = $r;
                    break;
                }
            }
            if ($pr === null) {
                continue;
            }
            if (! empty($pr['passed_via_transfer_credit'])) {
                continue;
            }
            $st = isset($pr['status']) && $pr['status'] !== null && $pr['status'] !== ''
                ? strtolower(trim((string) $pr['status']))
                : '';
            if ($st === 'inc' || $st === 'incomplete') {
                return false;
            }
            if (in_array($st, ['passed', 'pass', 'credit'], true)) {
                continue;
            }
            if (in_array($st, ['failed', 'fail', 'f'], true)) {
                return false;
            }
            $pg = isset($pr['passing_grade']) && $pr['passing_grade'] !== '' && is_numeric($pr['passing_grade'])
                ? floatval($pr['passing_grade'])
                : 50.0;
            $gradeRaw = $pr['grade'] ?? null;
            $g = ($gradeRaw !== null && $gradeRaw !== '' && is_numeric($gradeRaw)) ? floatval($gradeRaw) : null;
            if ($g !== null && $g >= $pg) {
                continue;
            }
            if ($g !== null && $g < $pg) {
                return false;
            }

            return false;
        }

        return true;
    }

    /**
     * Same pass rule as rows built in buildPayload() (status, numeric grade vs passing_grade, approved credit).
     *
     * @param  array<string, mixed>  $row
     */
    private function curriculumRowIndicatesPassed(array $row): bool
    {
        if (! empty($row['passed_via_transfer_credit'])) {
            return true;
        }

        $sid = $row['subject_id'] ?? null;
        if ($sid === null || $sid === '') {
            return false;
        }

        $normalizedStatus = isset($row['status']) && $row['status'] !== null && $row['status'] !== ''
            ? strtolower(trim((string) $row['status']))
            : null;
        if (in_array($normalizedStatus, ['passed', 'pass', 'credit'], true)) {
            return true;
        }

        $grade = $row['grade'] ?? null;
        $pg = $row['passing_grade'] ?? null;
        if ($grade !== null && $grade !== '' && is_numeric($grade) && $pg !== null && $pg !== '' && is_numeric($pg)) {
            return floatval($grade) >= floatval($pg);
        }

        return false;
    }

    private function studentSummary(StudentProfile $profile): array
    {
        $track = $profile->relationLoaded('track') ? $profile->track : null;

        return [
            'student_id' => $profile->student_id,
            'student_id_number' => $profile->student_id_number,
            'first_name' => $profile->first_name,
            'middle_name' => $profile->middle_name,
            'last_name' => $profile->last_name,
            'full_name' => trim(
                ($profile->last_name ? $profile->last_name.', ' : '').
                ($profile->first_name ?? '').
                ($profile->middle_name ? ' '.$profile->middle_name : '')
            ),
            'academic_status' => $profile->academic_status,
            'year_level_id' => $profile->year_level_id,
            'track_id' => $profile->track_id,
            'track' => $track
                ? [
                    'track_id' => $track->track_id,
                    'track_name' => $track->track_name,
                    'track_code' => $track->track_code,
                ]
                : null,
            'program' => $profile->program,
            'promoted_next_sem_at' => $profile->promoted_next_sem_at?->toIso8601String(),
            'promoted_next_sem_by' => $profile->promoted_next_sem_by,
            'promotion_evaluated_by' => $profile->promotion_evaluated_by,
            'promotion_target_year_level_id' => $profile->promotion_target_year_level_id,
            'promotion_target_semester_id' => $profile->promotion_target_semester_id,
        ];
    }
}
