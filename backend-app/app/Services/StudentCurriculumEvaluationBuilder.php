<?php

namespace App\Services;

use App\Models\Curriculum;
use App\Models\CurriculumHeader;
use App\Models\Evaluation;
use App\Models\Program;
use App\Models\Semester;
use App\Models\StudentProfile;
use Illuminate\Support\Facades\DB;

/**
 * Builds curriculum-order evaluation rows and computed academic status (Regular / Irregular)
 * from stored evaluations - shared by StudentEvaluationController and student profile API.
 */
class StudentCurriculumEvaluationBuilder
{
    /**
     * Hardcoded IT elective prerequisite rules for presentation/demo clarity.
     * This means: IT Electives 2 and IT Electives 3 require IT Electives 1.
     */
    private const HARDCODED_ELECTIVE_SLOT_PREREQUISITES = [
        'IT Electives 2' => 'IT Electives 1',
        'IT Electives 3' => 'IT Electives 1',
    ];

    private const PROGRAM_REQUISITE_SUPPRESSIONS = [
        'BECED' => ['EDU011', 'EDU532'],
        'BSEE' => ['BES024', 'ECO017', 'CPE036'],
        'BSME' => ['BES024', 'ECO017', 'CPE036', 'ECE069', 'GEN006'],
        'BSARCH' => ['BES025'],
        'BSCE' => ['BES024', 'ECE069'],
    ];

    private const PROGRAM_SPECIFIC_REQUISITES = [
        'BSME' => [
            'ECE069' => [
                ['subject_code' => 'BES 062', 'requisite_type' => 'prerequisite', 'rule_label' => null],
            ],
            'GEN006' => [
                ['subject_code' => 'GEN 002', 'requisite_type' => 'prerequisite', 'rule_label' => null],
            ],
        ],
    ];

    private function shouldSuppressSharedSubjectRequisites(?string $programCode, ?string $subjectCode): bool
    {
        $programKey = strtoupper(trim((string) $programCode));
        $subjectKey = strtoupper(str_replace(' ', '', trim((string) $subjectCode)));

        return in_array($subjectKey, self::PROGRAM_REQUISITE_SUPPRESSIONS[$programKey] ?? [], true);
    }

    private function programSpecificRequisites(?string $programCode, ?string $subjectCode): array
    {
        $programKey = strtoupper(trim((string) $programCode));
        $subjectKey = strtoupper(str_replace(' ', '', trim((string) $subjectCode)));

        return self::PROGRAM_SPECIFIC_REQUISITES[$programKey][$subjectKey] ?? [];
    }

    private function hasAllSubjectsPrerequisiteRule($requisites): bool
    {
        foreach ($requisites ?? [] as $edge) {
            $type = strtolower((string) ($edge->requisite_type ?? 'prerequisite'));
            $label = strtolower(trim((string) ($edge->rule_label ?? '')));
            if ($type !== 'corequisite' && preg_match('/^all\s+subjects?$/', $label)) {
                return true;
            }
        }

        return false;
    }

    private function standingPrerequisiteRule($requisites): ?array
    {
        foreach ($requisites ?? [] as $edge) {
            $type = strtolower((string) ($edge->requisite_type ?? 'prerequisite'));
            $label = strtolower(trim((string) ($edge->rule_label ?? '')));
            if ($type === 'corequisite' || $label === '') {
                continue;
            }

            if (preg_match('/^(2|2nd|second|3|3rd|third|4|4th|fourth|5|5th|fifth)\s+year\s+standing$/', $label, $match)) {
                $yearWords = [
                    '2' => 2, '2nd' => 2, 'second' => 2,
                    '3' => 3, '3rd' => 3, 'third' => 3,
                    '4' => 4, '4th' => 4, 'fourth' => 4,
                    '5' => 5, '5th' => 5, 'fifth' => 5,
                ];
                $standingYear = $yearWords[$match[1]] ?? null;
                if ($standingYear) {
                    return [
                        'label' => "{$standingYear}" . match ($standingYear) {
                            2 => 'nd',
                            3 => 'rd',
                            default => 'th',
                        } . ' year standing',
                        'max_year' => $standingYear - 1,
                    ];
                }
            }
        }

        return null;
    }

    private function isStandingPrerequisiteRuleLabel(?string $ruleLabel): bool
    {
        return preg_match(
            '/^(2|2nd|second|3|3rd|third|4|4th|fourth|5|5th|fifth)\s+year\s+standing$/i',
            trim((string) $ruleLabel)
        ) === 1;
    }

    /**
     * @return list<string>
     */
    private function programPreviousSubjectCodes($curriculumItem): array
    {
        if (! $curriculumItem?->program_id || ! $curriculumItem?->year_level || ! $curriculumItem?->semester_id) {
            return [];
        }

        $currentOrder = ((int) $curriculumItem->year_level * 10)
            + ((int) $curriculumItem->semester_id === 3 ? 0 : (int) $curriculumItem->semester_id);

        return DB::table('curriculum as c')
            ->join('tbl_subjects as s', 's.subject_id', '=', 'c.subject_id')
            ->where('c.program_id', $curriculumItem->program_id)
            ->whereNotNull('c.subject_id')
            ->whereRaw('(c.year_level * 10 + CASE WHEN c.semester_id = 3 THEN 0 ELSE c.semester_id END) < ?', [$currentOrder])
            ->orderBy('c.year_level')
            ->orderByRaw('CASE WHEN c.semester_id = 3 THEN 0 ELSE c.semester_id END')
            ->orderBy('c.curriculum_id')
            ->pluck('s.subject_code')
            ->map(fn ($code) => trim((string) $code))
            ->filter()
            ->values()
            ->all();
    }

    /**
     * @return list<string>
     */
    private function programSubjectCodesThroughYear($curriculumItem, int $maxYear): array
    {
        if (! $curriculumItem?->program_id || $maxYear < 1) {
            return [];
        }

        return DB::table('curriculum as c')
            ->leftJoin('tbl_subjects as s', 's.subject_id', '=', 'c.subject_id')
            ->leftJoin('tbl_elective_subject as es', 'es.elective_slot_id', '=', 'c.elective_slot_id')
            ->leftJoin('tbl_subjects as choice', 'choice.subject_id', '=', 'es.subject_id')
            ->where('c.program_id', $curriculumItem->program_id)
            ->where('c.year_level', '<=', $maxYear)
            ->where(function ($query) {
                $query->whereNotNull('c.subject_id')
                    ->orWhereNotNull('es.subject_id');
            })
            ->orderBy('c.year_level')
            ->orderByRaw('CASE WHEN c.semester_id = 3 THEN 0 ELSE c.semester_id END')
            ->orderBy('c.curriculum_id')
            ->get([DB::raw('COALESCE(s.subject_code, choice.subject_code) as subject_code')])
            ->map(fn ($row) => trim((string) $row->subject_code))
            ->filter()
            ->unique()
            ->values()
            ->all();
    }

    /**
     * Local subject IDs covered by transfer credit. Only active approved student-specific
     * credit details count as curriculum credit; equivalence catalog rows are suggestions only.
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
            ->whereRaw('LOWER(TRIM(e.status)) = ?', ['approved'])
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
            ->whereRaw('LOWER(TRIM(e.status)) = ?', ['approved'])
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

    protected function electiveSlotPrerequisites($slot): array
    {
        if (! $slot) {
            return [];
        }

        $currentSlotName = trim((string) ($slot->slot_name ?? ''));
        $hardcodedPrerequisiteName = self::HARDCODED_ELECTIVE_SLOT_PREREQUISITES[$currentSlotName] ?? null;
        $requiredSlot = $slot?->prerequisiteSlot;

        if ($hardcodedPrerequisiteName) {
            $slotName = $hardcodedPrerequisiteName;
            $requiredSlotId = null;

            if ($requiredSlot && trim((string) $requiredSlot->slot_name) === $slotName) {
                $requiredSlotId = (int) $requiredSlot->elective_slot_id;
            }

            if (! $requiredSlotId && $slot->program_id) {
                $requiredSlotId = DB::table('tbl_elective_slot')
                    ->where('program_id', $slot->program_id)
                    ->where('slot_name', $slotName)
                    ->value('elective_slot_id');
            }
        } elseif ($requiredSlot) {
            $slotName = trim((string) $requiredSlot->slot_name);
            $requiredSlotId = (int) $requiredSlot->elective_slot_id;
        } else {
            return [];
        }

        if ($slotName === '') {
            $slotName = 'Elective slot';
        }

        $row = [
            'slot_name' => $slotName,
        ];

        if ($requiredSlotId) {
            $row['elective_slot_id'] = (int) $requiredSlotId;
        }

        return [$row];
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
        $profile->loadMissing(['program', 'track', 'previousProgram']);

        app(IncComplianceExpiryService::class)->expireOverdue($profile->student_id);

        if (! $profile->current_program) {
            return [
                'computed_academic_status' => 'Regular',
                'academic_status_reasons' => [],
                'student' => $this->studentSummary($profile),
                'curriculum' => null,
                'active_semester' => $this->activeSemesterSummary(),
                'summary' => [
                    'total_units_in_curriculum' => 0,
                    'total_units_earned' => 0,
                    'lacking_units' => 0,
                ],
                'rows' => [],
            ];
        }

        $curriculumHeader = $this->resolveCurriculumHeaderForStudent($profile);
        $curriculumQuery = Curriculum::where('program_id', $profile->current_program)
            ->with([
                'subject.prerequisites.requiredSubject',
                'yearLevel',
                'semester',
                'electiveSlot.prerequisiteSlot',
                'electiveSlot.electiveSubjects.subject',
                'electiveSlot.electiveSubjects.track',
                'curriculumHeader',
            ]);
        if ($curriculumHeader) {
            $curriculumQuery->where('curriculum_header_id', $curriculumHeader->curriculum_header_id);
        }
        $curriculum = $curriculumQuery
            ->orderBy('year_level')
            ->orderByRaw('CASE WHEN semester_id = 3 THEN 0 ELSE semester_id END')
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

        // Carry-over "FROM <previous>" tags:
        // - Legacy rows (no graded_under_program_id): tag when the subject also exists
        //   on the previous program curriculum (original behavior).
        // - Rows graded while on the current program: graded_under_program_id is set to
        //   the current program on save, so they are NOT tagged as from previous.
        $previousProgramId = null;
        if ($profile->previous_program !== null && $profile->previous_program !== '') {
            $previousProgramId = (int) $profile->previous_program;
        }
        $currentProgramId = null;
        if ($profile->current_program !== null && $profile->current_program !== '') {
            $currentProgramId = (int) $profile->current_program;
        }

        $previousProgramModel = null;
        $previousProgramSubjectIds = [];
        if ($previousProgramId) {
            $previousProgramModel = $profile->relationLoaded('previousProgram')
                ? $profile->getRelation('previousProgram')
                : null;
            if (! $previousProgramModel instanceof Program) {
                $previousProgramModel = Program::find($previousProgramId);
                if ($previousProgramModel) {
                    $profile->setRelation('previousProgram', $previousProgramModel);
                }
            }

            $previousSubjectIdList = Curriculum::query()
                ->where('program_id', $previousProgramId)
                ->whereNotNull('subject_id')
                ->pluck('subject_id');

            foreach ($previousSubjectIdList as $subjectId) {
                $previousProgramSubjectIds[(int) $subjectId] = true;
            }
        }

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
            $slot = $item->electiveSlot;
            $slotPrerequisites = $this->electiveSlotPrerequisites($slot);
            $slotPrerequisiteNames = array_values(array_filter(array_map(
                static fn ($row) => $row['slot_name'] ?? null,
                $slotPrerequisites
            )));
            $electiveSubjectsForChoices = $slot
                ? ($slot->electiveSubjects ?? collect())
                : collect();
            $choiceList = [];

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

            if (! $resolvedSubject && $slot) {
                $resolvedSubject = ElectiveSubjectResolver::resolveForCurriculumSlot(
                    $electiveSubjectsForChoices,
                    $studentTrackId !== null ? (int) $studentTrackId : null,
                    $item->semester_id !== null ? (int) $item->semester_id : null,
                    $evaluations,
                    $slot?->slot_name,
                    $slot?->elective_slot_id !== null ? (int) $slot->elective_slot_id : null
                );
            }

            if (! $resolvedSubject) {
                // Elective slots still carry catalog units before a track/subject is chosen.
                $pendingUnits = 0;
                if ($choiceList !== []) {
                    $unitValues = array_values(array_filter(
                        array_map(static fn ($c) => (int) ($c['units'] ?? 0), $choiceList),
                        static fn ($u) => $u > 0
                    ));
                    if ($unitValues !== []) {
                        $counts = array_count_values($unitValues);
                        arsort($counts);
                        $pendingUnits = (int) array_key_first($counts);
                    }
                }
                if ($pendingUnits <= 0 && $slot) {
                    $pendingUnits = 3;
                }

                $passedInOrder[] = false;
                $totalUnitsInCurriculum += $pendingUnits;
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
                    'units' => $pendingUnits,
                    'passing_grade' => $item->passing_grade,
                    'grade' => null,
                    'status' => null,
                    'passed_via_transfer_credit' => false,
                    'units_earned' => 0,
                    'prerequisite' => null,
                    'corequisite' => null,
                    'prerequisite_subject_codes' => $slotPrerequisiteNames,
                    'corequisite_subject_codes' => [],
                    'prerequisite_elective_slots' => $slotPrerequisites,
                    'evaluation_id' => null,
                    'academic_year_id' => $defaultAcademicYearId,
                    'evaluated_by' => null,
                    'evaluation_date' => null,
                    'enrolled_date' => null,
                    'elective_pending' => (bool) $slot,
                    'elective_slot_id' => $slot?->elective_slot_id,
                    'elective_slot_name' => $slot?->slot_name,
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
            $gradeRaw = $evaluation?->grade ?? null;
            $gradeHelper = app(GradeScaleHelper::class);
            $grade = $gradeRaw !== null ? $gradeHelper->cleanGrade($gradeRaw) : null;
            $status = $evaluation?->evaluation_status ?? null;

            $normalizedStatus = $status ? strtolower($status) : null;
            $isPassedStatus = in_array($normalizedStatus, ['passed', 'pass', 'credit', 'complete', 'completed']);

            $isPassedByGrade = $gradeHelper->gradeIndicatesPass($gradeRaw, $item->passing_grade, $status);

            $isPassedFromRecord = $isPassedStatus || $isPassedByGrade;
            $isPassedByApprovedCredit = $sid !== null
                && $transferCreditSubjectIds->contains($sid);
            $isPassed = $isPassedFromRecord || $isPassedByApprovedCredit;
            $passedInOrder[] = $isPassed;
            $unitsEarned = $isPassed ? $units : 0;
            $totalUnitsEarned += $unitsEarned;

            $hasTakenRecord = $evaluation !== null && (
                ($grade !== null && $grade !== '')
                || ($status !== null && trim((string) $status) !== '')
                || $isPassedByApprovedCredit
            );
            $gradedUnderProgramId = $evaluation?->graded_under_program_id !== null
                && $evaluation->graded_under_program_id !== ''
                ? (int) $evaluation->graded_under_program_id
                : null;

            // Grades saved under the current program (e.g. BSIT dean) must never show
            // "FROM <previous>", even if the subject also exists on the old curriculum.
            if ($gradedUnderProgramId !== null && $currentProgramId !== null && $gradedUnderProgramId === $currentProgramId) {
                $fromPreviousProgram = false;
            } elseif ($gradedUnderProgramId !== null && $previousProgramId !== null && $gradedUnderProgramId === $previousProgramId) {
                $fromPreviousProgram = $hasTakenRecord;
            } else {
                // Legacy / unstamped rows: keep the original carry-over tag.
                $fromPreviousProgram = $previousProgramId !== null
                    && $sid !== null
                    && isset($previousProgramSubjectIds[(int) $sid])
                    && $hasTakenRecord;
            }

            $prereqCodes = [];
            $coreqCodes = [];
            $prereqRuleLabels = [];
            $coreqRuleLabels = [];
            $suppressSubjectRequisites = $this->shouldSuppressSharedSubjectRequisites(
                $profile->program?->program_code,
                $subject->subject_code ?? null
            );
            $useProgramAllSubjectsRule = ! $suppressSubjectRequisites
                && $this->hasAllSubjectsPrerequisiteRule($subject->prerequisites ?? []);
            $standingRule = ! $suppressSubjectRequisites
                ? $this->standingPrerequisiteRule($subject->prerequisites ?? [])
                : null;
            if ($useProgramAllSubjectsRule) {
                $prereqCodes = $this->programPreviousSubjectCodes($item);
                $prereqRuleLabels[] = 'all subjects';
            } elseif ($standingRule) {
                $prereqCodes = $this->programSubjectCodesThroughYear($item, (int) $standingRule['max_year']);
                $prereqRuleLabels[] = (string) $standingRule['label'];
            }
            foreach ($this->programSpecificRequisites($profile->program?->program_code, $subject->subject_code ?? null) as $specificRequisite) {
                $code = trim((string) ($specificRequisite['subject_code'] ?? ''));
                if ($code === '') {
                    continue;
                }

                $ruleLabel = trim((string) ($specificRequisite['rule_label'] ?? ''));
                if (($specificRequisite['requisite_type'] ?? 'prerequisite') === 'corequisite') {
                    $coreqCodes[] = $code;
                    if ($ruleLabel !== '') {
                        $coreqRuleLabels[] = $ruleLabel;
                    }
                } else {
                    $prereqCodes[] = $code;
                    if ($ruleLabel !== '') {
                        $prereqRuleLabels[] = $ruleLabel;
                    }
                }
            }
            foreach ($suppressSubjectRequisites ? [] : ($subject->prerequisites ?? []) as $p) {
                $type = strtolower((string) ($p->requisite_type ?? 'prerequisite'));
                if ($useProgramAllSubjectsRule && $type !== 'corequisite') {
                    continue;
                }
                if ($standingRule && $type !== 'corequisite' && $this->isStandingPrerequisiteRuleLabel($p->rule_label ?? null)) {
                    continue;
                }
                $c = $p->requiredSubject->subject_code ?? null;
                if ($c === null || trim((string) $c) === '') {
                    continue;
                }
                $c = trim((string) $c);
                $ruleLabel = trim((string) ($p->rule_label ?? ''));
                if ($type === 'corequisite') {
                    $coreqCodes[] = $c;
                    if ($ruleLabel !== '') {
                        $coreqRuleLabels[] = $ruleLabel;
                    }
                } else {
                    $prereqCodes[] = $c;
                    if ($ruleLabel !== '') {
                        $prereqRuleLabels[] = $ruleLabel;
                    }
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
                'prerequisite_subject_codes' => array_values(array_unique(array_merge($slotPrerequisiteNames, $prereqCodes))),
                'corequisite_subject_codes' => $coreqCodes,
                'prerequisite_rule_labels' => array_values(array_unique($prereqRuleLabels)),
                'corequisite_rule_labels' => array_values(array_unique($coreqRuleLabels)),
                'prerequisite_elective_slots' => $slotPrerequisites,
                'resolved_from_elective_slot' => (bool) $slot,
                'elective_pending' => false,
                'elective_slot_id' => $slot?->elective_slot_id,
                'elective_slot_name' => $slot?->slot_name,
                'elective_choices' => $choiceList,
                'student_track_id' => $profile->track_id,
                'evaluation_id' => $evaluation?->evaluation_id ?? null,
                'academic_year_id' => $evaluation?->academic_year_id ?? $defaultAcademicYearId,
                'evaluated_by' => $evaluation?->evaluatedBy,
                'evaluation_date' => $evaluation?->evaluation_date,
                'enrolled_date' => $evaluation?->enrolled_date,
                'inc_compliance_deadline' => $evaluation?->inc_compliance_deadline
                    ? $evaluation->inc_compliance_deadline->format('Y-m-d')
                    : null,
                'from_previous_program' => $fromPreviousProgram,
                'previous_program_id' => $fromPreviousProgram ? $previousProgramId : null,
                'previous_program_code' => $fromPreviousProgram
                    ? ($previousProgramModel?->program_code)
                    : null,
                'previous_program_name' => $fromPreviousProgram
                    ? ($previousProgramModel?->program_name)
                    : null,
            ];
        }

        $lackingUnits = max(0, $totalUnitsInCurriculum - $totalUnitsEarned);

        $classified = AcademicStatusClassifier::fromPassSequence($passedInOrder);

        return [
            'computed_academic_status' => $classified['status'],
            'academic_status_reasons' => $classified['reasons'],
            'student' => $this->studentSummary($profile),
            'curriculum' => $this->curriculumHeaderSummary($curriculumHeader),
            'active_semester' => $this->activeSemesterSummary(),
            'summary' => [
                'total_units_in_curriculum' => $totalUnitsInCurriculum,
                'total_units_earned' => $totalUnitsEarned,
                'lacking_units' => $lackingUnits,
            ],
            'rows' => $rows,
        ];
    }

    /**
     * @return array{semester_id: int, semester_name: string, status: string}|null
     */
    private function activeSemesterSummary(): ?array
    {
        $active = Semester::query()
            ->where('status', 'active')
            ->orderBy('semester_id')
            ->first();

        if (! $active) {
            return null;
        }

        return [
            'semester_id' => (int) $active->semester_id,
            'semester_name' => (string) $active->semester_name,
            'status' => 'active',
        ];
    }

    /**
     * Resolve which curriculum version (Effective Year) applies to this student.
     * Uses student ID year prefix when possible (e.g. 18-ARCH-0001 → SY 2018-2019).
     * Bound academic_year_id on the header (when set) ties calendar AY to this subject set.
     */
    public function resolveCurriculumHeaderForStudent(StudentProfile $profile): ?CurriculumHeader
    {
        $programId = (int) $profile->current_program;
        if ($programId <= 0) {
            return null;
        }

        $headers = CurriculumHeader::query()
            ->where('program_id', $programId)
            ->orderByDesc('Effective_Year')
            ->orderByDesc('curriculum_header_id')
            ->get();

        if ($headers->isEmpty()) {
            return null;
        }

        $entryYear = $this->inferStudentEntryYear($profile);
        if ($entryYear !== null) {
            $match = $headers
                ->filter(static fn (CurriculumHeader $h) => (int) $h->Effective_Year <= $entryYear)
                ->sortByDesc(static fn (CurriculumHeader $h) => (int) $h->Effective_Year)
                ->first();
            if ($match instanceof CurriculumHeader) {
                return $match;
            }
        }

        return $headers->first();
    }

    private function inferStudentEntryYear(StudentProfile $profile): ?int
    {
        $sid = trim((string) ($profile->student_id_number ?? $profile->student_number ?? ''));
        if ($sid === '') {
            return null;
        }

        // 18-ARCH-0001 / 25-1901 → 2018 / 2025
        if (preg_match('/^(\d{2})(?!\d)/', $sid, $m)) {
            $yy = (int) $m[1];

            return $yy >= 70 ? 1900 + $yy : 2000 + $yy;
        }

        // 2018-... full year prefix
        if (preg_match('/^(20\d{2}|19\d{2})/', $sid, $m)) {
            return (int) $m[1];
        }

        return null;
    }

    /**
     * @return array{
     *   curriculum_header_id: int,
     *   effective_year: int,
     *   label: string,
     *   description: ?string,
     *   academic_year_id: ?int,
     *   academic_year_name: ?string
     * }|null
     */
    private function curriculumHeaderSummary(?CurriculumHeader $header): ?array
    {
        if (! $header) {
            return null;
        }

        if (! $header->relationLoaded('academicYear')) {
            $header->load('academicYear');
        }

        $year = (int) $header->Effective_Year;
        $label = $year > 0 ? sprintf('%d-%d', $year, $year + 1) : (string) $header->curriculum_header_id;
        $ay = $header->academicYear;

        return [
            'curriculum_header_id' => (int) $header->curriculum_header_id,
            'effective_year' => $year,
            'label' => $label,
            'description' => $header->description,
            'academic_year_id' => $header->academic_year_id !== null ? (int) $header->academic_year_id : null,
            'academic_year_name' => $ay?->academic_year_name,
        ];
    }

    /**
     * Preview evaluation as if the student were on another program, without persisting.
     * Target-program rows keep matched grades (with FROM tags for shared subjects).
     * Graded subjects that exist only on the saved (from) program are appended so the
     * dean can review them before confirming — they disappear after the shift is saved.
     *
     * @return array<string, mixed>
     */
    public function buildPayloadForProgramPreview(StudentProfile $profile, int $previewProgramId): array
    {
        $savedCurrentProgramId = $profile->current_program !== null ? (int) $profile->current_program : null;
        $savedPreviousProgramId = $profile->previous_program !== null ? (int) $profile->previous_program : null;
        $savedProgramRelation = $profile->relationLoaded('program')
            ? $profile->getRelation('program')
            : null;
        $savedPreviousProgramRelation = $profile->relationLoaded('previousProgram')
            ? $profile->getRelation('previousProgram')
            : null;

        $previewProgram = Program::find($previewProgramId);

        $profile->Current_Program = $previewProgramId;
        $profile->setRelation('program', $previewProgram);

        $fromProgram = null;
        if ($savedCurrentProgramId !== null && $savedCurrentProgramId !== $previewProgramId) {
            $profile->Previous_Program = $savedCurrentProgramId;
            $fromProgram = $savedProgramRelation instanceof Program
                ? $savedProgramRelation
                : Program::find($savedCurrentProgramId);
            $profile->setRelation('previousProgram', $fromProgram);
        } else {
            $profile->Previous_Program = $savedPreviousProgramId;
            $profile->setRelation('previousProgram', $savedPreviousProgramRelation);
            $fromProgram = $savedPreviousProgramRelation instanceof Program
                ? $savedPreviousProgramRelation
                : ($savedPreviousProgramId ? Program::find($savedPreviousProgramId) : null);
        }

        $payload = $this->buildPayload($profile);
        $payload['preview_program_shift'] = true;
        $payload['saved_program_id'] = $savedCurrentProgramId;

        if ($savedCurrentProgramId !== null && $savedCurrentProgramId !== $previewProgramId) {
            $payload['rows'] = $this->appendPreviousProgramOnlyRowsForPreview(
                $payload['rows'] ?? [],
                $profile,
                $savedCurrentProgramId,
                $previewProgramId,
                $fromProgram
            );
        }

        $profile->Current_Program = $savedCurrentProgramId;
        $profile->Previous_Program = $savedPreviousProgramId;
        $profile->setRelation('program', $savedProgramRelation);
        $profile->setRelation('previousProgram', $savedPreviousProgramRelation);

        return $payload;
    }

    /**
     * Append graded rows that are on the from-program curriculum but not the preview program.
     *
     * @param  list<array<string, mixed>>  $rows
     * @return list<array<string, mixed>>
     */
    private function appendPreviousProgramOnlyRowsForPreview(
        array $rows,
        StudentProfile $profile,
        int $fromProgramId,
        int $previewProgramId,
        ?Program $fromProgram
    ): array {
        $previewSubjectIds = Curriculum::query()
            ->where('program_id', $previewProgramId)
            ->whereNotNull('subject_id')
            ->pluck('subject_id')
            ->map(static fn ($id) => (int) $id)
            ->all();
        $previewSubjectIdSet = array_fill_keys($previewSubjectIds, true);

        $existingSubjectIds = [];
        foreach ($rows as $row) {
            $sid = $row['subject_id'] ?? null;
            if ($sid !== null && $sid !== '') {
                $existingSubjectIds[(int) $sid] = true;
            }
        }

        $fromCurriculum = Curriculum::query()
            ->where('program_id', $fromProgramId)
            ->whereNotNull('subject_id')
            ->with(['subject', 'yearLevel', 'semester'])
            ->get()
            ->keyBy(static fn (Curriculum $item) => (int) $item->subject_id);

        $evaluations = Evaluation::query()
            ->where('student_id', $profile->student_id)
            ->whereNotNull('subject_id')
            ->with(['subject', 'evaluatedBy'])
            ->get()
            ->groupBy('subject_id')
            ->map(static function ($group) {
                return $group->sortByDesc('academic_year_id')
                    ->sortByDesc('semester_id')
                    ->first();
            });

        $defaultAcademicYearId = DB::table('tbl_academic_year')
            ->orderBy('academic_year_id', 'desc')
            ->value('academic_year_id');

        $gradeHelper = app(GradeScaleHelper::class);

        foreach ($evaluations as $subjectId => $evaluation) {
            $sid = (int) $subjectId;
            if (isset($previewSubjectIdSet[$sid]) || isset($existingSubjectIds[$sid])) {
                continue;
            }
            if (! $fromCurriculum->has($sid)) {
                continue;
            }

            $item = $fromCurriculum->get($sid);
            $subject = $evaluation->subject ?? $item->subject;
            if (! $subject) {
                continue;
            }

            $gradeRaw = $evaluation->grade;
            $grade = $gradeRaw !== null && $gradeRaw !== '' ? (string) $gradeRaw : null;
            $status = $evaluation->evaluation_status ?? null;
            $normalizedStatus = $status ? strtolower((string) $status) : null;
            $isPassedStatus = in_array($normalizedStatus, ['passed', 'pass', 'credit', 'complete', 'completed'], true);
            $isPassedByGrade = $gradeHelper->gradeIndicatesPass($gradeRaw, $item->passing_grade, $status);
            $hasTakenRecord = ($grade !== null && $grade !== '')
                || ($status !== null && trim((string) $status) !== '');

            // Only surface subjects the student actually took under the from-program.
            if (! $hasTakenRecord) {
                continue;
            }

            $units = (int) ($subject->number_of_units ?? 0);
            $rows[] = [
                'curriculum_id' => null,
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
                'status' => $status,
                'passed_via_transfer_credit' => false,
                'transfer_credit_other_subject_id' => null,
                'units_earned' => ($isPassedStatus || $isPassedByGrade) ? $units : 0,
                'prerequisite' => null,
                'corequisite' => null,
                'prerequisite_subject_codes' => [],
                'corequisite_subject_codes' => [],
                'prerequisite_rule_labels' => [],
                'corequisite_rule_labels' => [],
                'prerequisite_elective_slots' => [],
                'resolved_from_elective_slot' => false,
                'elective_pending' => false,
                'elective_slot_id' => null,
                'elective_slot_name' => null,
                'elective_choices' => [],
                'student_track_id' => $profile->track_id,
                'evaluation_id' => $evaluation->evaluation_id ?? null,
                'academic_year_id' => $evaluation->academic_year_id ?? $defaultAcademicYearId,
                'evaluated_by' => $evaluation->evaluatedBy,
                'evaluation_date' => $evaluation->evaluation_date,
                'enrolled_date' => $evaluation->enrolled_date,
                'inc_compliance_deadline' => $evaluation->inc_compliance_deadline
                    ? $evaluation->inc_compliance_deadline->format('Y-m-d')
                    : null,
                'from_previous_program' => true,
                'previous_program_only' => true,
                'previous_program_id' => $fromProgramId,
                'previous_program_code' => $fromProgram?->program_code,
                'previous_program_name' => $fromProgram?->program_name,
            ];
        }

        return $rows;
    }

    /**
     * Persist academic_status from the same curriculum evaluation payload as
     * computed_academic_status (Regular / Irregular from sequence rules).
     *
     * Do not advance year_level_id here. Term/year movement is an explicit promotion
     * decision handled by StudentEvaluationController::promoteNextSemester().
     *
     * @param  array{rows?: list<array<string, mixed>>, computed_academic_status?: string}|null  $built  From buildPayload(); omit to run one build.
     */
    public function syncStudentProfileFromCurriculumProgress(StudentProfile $profile, ?array $built = null): bool
    {
        if ($built === null) {
            $built = $this->buildPayload($profile);
        }

        $changed = false;

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
        $slotPrerequisites = $targetRow['prerequisite_elective_slots'] ?? [];
        if ($codes === [] && $slotPrerequisites === []) {
            return true;
        }
        foreach ($slotPrerequisites as $slotPrerequisite) {
            $slotId = $slotPrerequisite['elective_slot_id'] ?? null;
            if ($slotId === null || $slotId === '') {
                return false;
            }
            $pr = null;
            foreach ($allRows as $r) {
                if ((int) ($r['elective_slot_id'] ?? 0) === (int) $slotId) {
                    $pr = $r;
                    break;
                }
            }
            if ($pr === null || ! $this->curriculumRowIndicatesPassed($pr)) {
                return false;
            }
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
            $gradeHelper = app(GradeScaleHelper::class);
            if ($gradeHelper->gradeIndicatesPass($gradeRaw, $pg, $st !== '' ? $st : null)) {
                continue;
            }
            if (in_array($st, ['failed', 'fail', 'f'], true)) {
                return false;
            }
            if ($gradeRaw !== null && trim((string) $gradeRaw) !== '' && ! $gradeHelper->isCompleteGrade($gradeRaw)) {
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

        return app(GradeScaleHelper::class)->gradeIndicatesPass(
            $row['grade'] ?? null,
            $row['passing_grade'] ?? null,
            isset($row['status']) ? (string) $row['status'] : null
        );
    }

    private function studentSummary(StudentProfile $profile): array
    {
        $track = $profile->relationLoaded('track') ? $profile->track : null;

        if (! $profile->relationLoaded('yearLevel')) {
            $profile->load('yearLevel');
        }
        if (! $profile->relationLoaded('semester')) {
            $profile->load('semester');
        }
        if (! $profile->relationLoaded('academicYear')) {
            $profile->load('academicYear');
        }

        $yearLevelName = $profile->yearLevel?->year_level;
        $semesterName = $profile->semester?->semester_name;
        $academicYearName = $profile->academicYear?->academic_year_name;

        $standingParts = array_values(array_filter([
            $academicYearName ? (string) $academicYearName : null,
            $yearLevelName ? (string) $yearLevelName : null,
            $semesterName ? (string) $semesterName : null,
        ]));

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
            // Shiftee / Returnee / Transferee - distinct from Regular/Irregular academic_status
            'student_entry_type' => $profile->student_entry_type,
            'year_level_id' => $profile->year_level_id,
            'year_level_name' => $yearLevelName,
            'semester_id' => $profile->semester_id,
            'semester_name' => $semesterName,
            'academic_year_id' => $profile->academic_year_id,
            'academic_year_name' => $academicYearName,
            'standing_label' => $standingParts !== [] ? implode(' — ', $standingParts) : null,
            'track_id' => $profile->track_id,
            'track' => $track
                ? [
                    'track_id' => $track->track_id,
                    'track_name' => $track->track_name,
                    'track_code' => $track->track_code,
                ]
                : null,
            'program' => $profile->program,
            'previous_program_id' => $profile->previous_program,
            'previous_program' => $profile->relationLoaded('previousProgram')
                ? $profile->getRelation('previousProgram')
                : null,
            'promoted_next_sem_at' => $profile->promoted_next_sem_at?->toIso8601String(),
            'promoted_next_sem_by' => $profile->promoted_next_sem_by,
            'promotion_evaluated_by' => $profile->promotion_evaluated_by,
            'promotion_target_year_level_id' => $profile->promotion_target_year_level_id,
            'promotion_target_semester_id' => $profile->promotion_target_semester_id,
            'standing_deferred_keys' => array_values(array_filter(array_map(
                static fn ($k) => is_string($k) || is_numeric($k) ? (string) $k : null,
                is_array($profile->standing_deferred_keys) ? $profile->standing_deferred_keys : []
            ))),
        ];
    }
}
