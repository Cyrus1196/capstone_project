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
                'subject',
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

        $approvedCreditSubjectIds = DB::table('tbl_credit_evaluation_details as d')
            ->join('tbl_credit_evaluation as e', 'd.credit_eval_id', '=', 'e.credit_eval_id')
            ->where('e.student_id', $profile->student_id)
            ->whereRaw('LOWER(TRIM(e.status)) = ?', ['approved'])
            ->where('e.is_active', true)
            ->pluck('d.subject_id')
            ->unique();

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
                $rows[] = [
                    'curriculum_id' => $item->curriculum_id,
                    'year_level_id' => $item->year_level,
                    'year_level_name' => $item->yearLevel->year_level ?? null,
                    'semester_id' => $item->semester_id,
                    'semester_name' => $item->semester->semester_name ?? null,
                    'subject_id' => null,
                    'subject_code' => $slot?->slot_name ? 'Elective' : null,
                    'subject_name' => $slot?->slot_name
                        ? ($slot->slot_name.' — set student track or add subjects to this elective slot')
                        : 'Curriculum row has no subject (admin should fix this entry)',
                    'units' => 0,
                    'passing_grade' => $item->passing_grade,
                    'grade' => null,
                    'status' => null,
                    'passed_via_transfer_credit' => false,
                    'units_earned' => 0,
                    'prerequisite' => null,
                    'corequisite' => null,
                    'evaluation_id' => null,
                    'academic_year_id' => $defaultAcademicYearId,
                    'evaluated_by' => null,
                    'evaluation_date' => null,
                    'enrolled_date' => null,
                ];

                continue;
            }

            $subject = $resolvedSubject;
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
                && $approvedCreditSubjectIds->contains($sid);
            $isPassed = $isPassedFromRecord || $isPassedByApprovedCredit;
            $passedInOrder[] = $isPassed;
            $unitsEarned = $isPassed ? $units : 0;
            $totalUnitsEarned += $unitsEarned;

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
                'units_earned' => $unitsEarned,
                'prerequisite' => null,
                'corequisite' => null,
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
            'program' => $profile->program,
        ];
    }
}
