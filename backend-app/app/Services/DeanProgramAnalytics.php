<?php

namespace App\Services;

use App\Models\Curriculum;
use App\Models\Evaluation;
use App\Models\Program;
use App\Models\StudentProfile;
use App\Models\Subject;
use App\Models\YearLevel;
use App\Support\CachedSchema;
use App\Support\EvaluationAttemptPicker;
use Illuminate\Support\Collection;
use Illuminate\Support\Facades\DB;

/**
 * Program-level dean analytics computed in bulk from each student's current curriculum record.
 * Pass / attempt / transfer-credit / Regular-Irregular rules match the evaluation screen
 * (StudentCurriculumEvaluationBuilder), so totals agree with what staff see per student.
 */
class DeanProgramAnalytics
{
    /** Same per-year unit caps as the evaluation load plan (StudentEvaluationView EVAL_YEAR_UNIT_CAPS). */
    private const YEAR_UNIT_CAPS = [1 => 23, 2 => 24, 3 => 19, 4 => 12];

    /** Up to this many backlog units counts as "slightly behind"; more is "delayed". */
    private const SLIGHTLY_BEHIND_MAX_UNITS = 9;

    private const LIST_LIMIT = 100;

    private const TAKEN_OUTCOMES = ['passed', 'failed', 'inc', 'dropped'];

    /** Mirrors StudentCurriculumEvaluationBuilder: shared subjects whose requisites do not apply in a program. */
    private const PROGRAM_REQUISITE_SUPPRESSIONS = [
        'BECED' => ['EDU011', 'EDU532'],
        'BSEE' => ['BES024', 'ECO017', 'CPE036'],
        'BSME' => ['BES024', 'ECO017', 'CPE036', 'ECE069', 'GEN006'],
        'BSARCH' => ['BES025'],
        'BSCE' => ['BES024', 'ECE069'],
    ];

    /** Mirrors StudentCurriculumEvaluationBuilder: program-only prerequisites. */
    private const PROGRAM_SPECIFIC_PREREQUISITES = [
        'BSME' => [
            'ECE069' => ['BES 062'],
            'GEN006' => ['GEN 002'],
        ],
    ];

    /** @var array<string, list<array<string, mixed>>> */
    private array $templates = [];

    private string $programCode = '';

    public function __construct(
        private readonly StudentCurriculumEvaluationBuilder $builder,
        private readonly GradeScaleHelper $grades,
    ) {
    }

    public function build(Program $program): array
    {
        $programId = (int) $program->program_id;
        $this->programCode = strtoupper(trim((string) ($program->program_code ?? '')));
        $this->templates = [];
        $yearLabels = YearLevel::query()
            ->orderBy('year_level_id')
            ->pluck('year_level', 'year_level_id')
            ->map(static fn ($label) => (string) $label)
            ->all();

        $students = $this->studentsForProgram($programId);
        $studentIds = $students->pluck('student_id')->map(static fn ($id) => (int) $id)->all();
        $evaluationsByStudent = $this->evaluationsByStudent($studentIds);
        $creditsByStudent = $this->transferCreditsByStudent($studentIds);
        $ayStart = $this->academicYearStartMap();

        $records = [];
        foreach ($students as $profile) {
            $header = $this->builder->resolveCurriculumHeaderForStudent($profile);
            $template = $this->curriculumTemplate($programId, $header?->curriculum_header_id);
            if ($template === []) {
                continue;
            }
            $sid = (int) $profile->student_id;
            $records[] = $this->studentRecord(
                $profile,
                $template,
                $evaluationsByStudent[$sid] ?? [],
                $creditsByStudent[$sid] ?? [],
                $ayStart
            );
        }

        $years = $this->yearBuckets($records, $yearLabels);

        return [
            'generated_at' => now()->toIso8601String(),
            'student_count' => count($records),
            'year_levels' => $years,
            'subject_performance' => $this->subjectPerformance($records),
            'prerequisite_blockers' => $this->prerequisiteBlockers($records),
            'academic_status' => $this->academicStatus($records, $years),
            'student_progress' => $this->studentProgress($records, $years),
            'progress_by_year' => $this->progressByYear($records, $years),
            'load_plans' => $this->loadPlans($records, $years),
        ];
    }

    // ---------------------------------------------------------------------
    // Data loading
    // ---------------------------------------------------------------------

    /** @return Collection<int, StudentProfile> */
    private function studentsForProgram(int $programId): Collection
    {
        $query = StudentProfile::query()->where(function ($q) use ($programId) {
            $q->where('Current_Program', $programId)->orWhere('current_program', $programId);
        });
        if (CachedSchema::hasColumn('tbl_student_profile', 'is_simulation')) {
            $query->where(function ($q) {
                $q->where('is_simulation', false)->orWhereNull('is_simulation');
            });
        }

        return $query->orderBy('student_id')->get();
    }

    /**
     * @param  list<int>  $studentIds
     * @return array<int, array<int, list<Evaluation>>> student_id => subject_id => attempts
     */
    private function evaluationsByStudent(array $studentIds): array
    {
        $out = [];
        foreach (array_chunk($studentIds, 800) as $chunk) {
            $rows = Evaluation::query()
                ->whereIn('student_id', $chunk)
                ->get(['evaluation_id', 'student_id', 'subject_id', 'grade', 'evaluation_status', 'academic_year_id', 'semester_id']);
            foreach ($rows as $row) {
                if ($row->subject_id === null) {
                    continue;
                }
                $out[(int) $row->student_id][(int) $row->subject_id][] = $row;
            }
        }

        return $out;
    }

    /**
     * Approved, active student transfer credits (same rule as the evaluation builder).
     *
     * @param  list<int>  $studentIds
     * @return array<int, array<int, true>> student_id => subject_id => true
     */
    private function transferCreditsByStudent(array $studentIds): array
    {
        $out = [];
        if ($studentIds === []) {
            return $out;
        }
        $idSet = array_fill_keys($studentIds, true);
        foreach (array_chunk($studentIds, 800) as $chunk) {
            $rows = DB::table('tbl_credit_evaluation_details as d')
                ->join('tbl_credit_evaluation as e', 'd.credit_eval_id', '=', 'e.credit_eval_id')
                ->where(function ($q) use ($chunk) {
                    $q->whereIn('e.student_id', $chunk)->orWhereIn('d.student_id', $chunk);
                })
                ->where('e.is_active', true)
                ->whereNotNull('d.subject_id')
                ->whereRaw('LOWER(TRIM(e.status)) = ?', ['approved'])
                ->get(['e.student_id as e_student_id', 'd.student_id as d_student_id', 'd.subject_id']);
            foreach ($rows as $row) {
                foreach ([$row->e_student_id, $row->d_student_id] as $owner) {
                    if ($owner !== null && isset($idSet[(int) $owner])) {
                        $out[(int) $owner][(int) $row->subject_id] = true;
                    }
                }
            }
        }

        return $out;
    }

    /** @return array<int, int> academic_year_id => start calendar year */
    private function academicYearStartMap(): array
    {
        $map = [];
        foreach (DB::table('tbl_academic_year')->get(['academic_year_id', 'academic_year_name']) as $row) {
            $id = (int) $row->academic_year_id;
            $start = 0;
            if (preg_match('/(\d{4})\s*[-–\/]/', (string) ($row->academic_year_name ?? ''), $m)) {
                $start = (int) $m[1];
            }
            $map[$id] = $start > 0 ? $start : $id;
        }

        return $map;
    }

    /**
     * Curriculum rows for one program / curriculum version, in program order.
     *
     * @return list<array<string, mixed>>
     */
    private function curriculumTemplate(int $programId, ?int $headerId): array
    {
        $cacheKey = $programId.':'.($headerId ?? 0);
        if (isset($this->templates[$cacheKey])) {
            return $this->templates[$cacheKey];
        }

        $query = Curriculum::query()
            ->where('program_id', $programId)
            ->with([
                'subject.prerequisites.requiredSubject',
                'semester',
                'electiveSlot.electiveSubjects.subject',
            ]);
        if ($headerId) {
            $query->where('curriculum_header_id', $headerId);
        }
        $items = $query
            ->orderBy('year_level')
            ->orderByRaw('CASE WHEN semester_id = 3 THEN 0 ELSE semester_id END')
            ->orderBy('curriculum_id')
            ->get();

        $template = [];
        foreach ($items as $item) {
            $year = (int) ($item->year_level ?? 0);
            $sem = (int) ($item->semester_id ?? 0);
            $row = [
                'key' => 'cur-'.$item->curriculum_id,
                'year' => $year,
                'sem' => $sem,
                'order' => $this->termOrder($year, $sem),
                'sem_name' => (string) ($item->semester->semester_name ?? ''),
                'passing_grade' => $item->passing_grade,
                'subject_type' => $item->subject_type ?? null,
                'subject' => null,
                'choices' => [],
                'pending_units' => 0,
                'slot_name' => null,
                'prereq_codes' => [],
            ];

            if ($item->subject) {
                $row['subject'] = $this->subjectMeta($item->subject);
                $row['prereq_codes'] = $this->prerequisiteCodes($item->subject);
            } elseif ($item->electiveSlot) {
                $slot = $item->electiveSlot;
                $row['slot_name'] = $slot->slot_name ?? null;
                $units = [];
                foreach ($slot->electiveSubjects ?? [] as $es) {
                    if ($es->subject) {
                        $meta = $this->subjectMeta($es->subject);
                        $row['choices'][$meta['id']] = $meta;
                        if ($meta['units'] > 0) {
                            $units[] = $meta['units'];
                        }
                    }
                }
                if ($units !== []) {
                    $counts = array_count_values($units);
                    arsort($counts);
                    $row['pending_units'] = (int) array_key_first($counts);
                } else {
                    $row['pending_units'] = 3;
                }
            }

            $template[] = $row;
        }

        return $this->templates[$cacheKey] = $template;
    }

    /** @return array{id: int, code: string, name: string, units: int} */
    private function subjectMeta(Subject $subject): array
    {
        return [
            'id' => (int) $subject->subject_id,
            'code' => trim((string) ($subject->subject_code ?? '')),
            'name' => trim((string) ($subject->subject_name ?? '')),
            'units' => (int) ($subject->number_of_units ?? 0),
        ];
    }

    /**
     * Direct prerequisite subject codes. "All subjects" and "Nth year standing" rules are
     * standing gates, not a single blocking subject, so they are left out.
     *
     * @return list<string>
     */
    private function prerequisiteCodes(Subject $subject): array
    {
        $subjectKey = str_replace(' ', '', $this->normCode($subject->subject_code));
        $specific = array_map(
            fn ($code) => $this->normCode($code),
            self::PROGRAM_SPECIFIC_PREREQUISITES[$this->programCode][$subjectKey] ?? []
        );
        if (in_array($subjectKey, self::PROGRAM_REQUISITE_SUPPRESSIONS[$this->programCode] ?? [], true)) {
            return $specific;
        }

        $edges = collect($subject->prerequisites ?? [])
            ->filter(static fn ($e) => strtolower((string) ($e->requisite_type ?? 'prerequisite')) !== 'corequisite');

        foreach ($edges as $edge) {
            if (preg_match('/^all\s+subjects?$/', strtolower(trim((string) ($edge->rule_label ?? ''))))) {
                return $specific;
            }
        }

        $codes = $specific;
        foreach ($edges as $edge) {
            $label = strtolower(trim((string) ($edge->rule_label ?? '')));
            if ($label !== '' && preg_match('/year\s+standing$/', $label)) {
                continue;
            }
            $code = $this->normCode($edge->requiredSubject->subject_code ?? null);
            if ($code !== '') {
                $codes[] = $code;
            }
        }

        return array_values(array_unique($codes));
    }

    // ---------------------------------------------------------------------
    // Per-student record
    // ---------------------------------------------------------------------

    /**
     * @param  list<array<string, mixed>>  $template
     * @param  array<int, list<Evaluation>>  $attemptsBySubject
     * @param  array<int, true>  $credits
     * @param  array<int, int>  $ayStart
     */
    private function studentRecord(
        StudentProfile $profile,
        array $template,
        array $attemptsBySubject,
        array $credits,
        array $ayStart
    ): array {
        $preferred = [];
        foreach ($attemptsBySubject as $subjectId => $attempts) {
            $preferred[$subjectId] = EvaluationAttemptPicker::prefer($attempts, $ayStart);
        }

        $rows = [];
        $usedChoices = [];
        foreach ($template as $t) {
            $subject = $t['subject'];
            if ($subject === null && $t['choices'] !== []) {
                $subject = $this->pickElectiveChoice($t, $preferred, $credits, $usedChoices);
                if ($subject !== null) {
                    $usedChoices[$subject['id']] = true;
                }
            }

            $pending = $subject === null;
            $evaluation = $pending ? null : ($preferred[$subject['id']] ?? null);
            $credited = ! $pending && isset($credits[$subject['id']]);
            $outcome = $this->outcome($evaluation, $t['passing_grade']);
            $grade = $evaluation ? $this->grades->cleanGrade($evaluation->grade) : null;

            $rows[] = [
                'key' => $t['key'],
                'year' => $t['year'],
                'sem' => $t['sem'],
                'order' => $t['order'],
                'sem_name' => $t['sem_name'],
                'subject_type' => $t['subject_type'],
                'prereq_codes' => $t['subject'] !== null ? $t['prereq_codes'] : [],
                'subject' => $subject,
                'code' => $subject['code'] ?? ($t['slot_name'] ?: 'Elective'),
                'units' => $pending ? (int) $t['pending_units'] : (int) $subject['units'],
                'pending' => $pending,
                'grade' => $grade,
                'outcome' => $outcome,
                'credited' => $credited,
                'passed' => $credited || $outcome === 'passed',
                'classifier' => [
                    'elective_pending' => $pending,
                    'grade' => $grade,
                    'passing_grade' => $t['passing_grade'],
                    'status' => $credited && $outcome !== 'passed'
                        ? 'Credit'
                        : ($evaluation?->evaluation_status ?? null),
                ],
            ];
        }

        $classified = AcademicStatusClassifier::fromPassSequence(
            array_map(static fn ($r) => (bool) $r['passed'], $rows),
            array_map(static fn ($r) => $r['classifier'], $rows)
        );

        $year = (int) ($profile->year_level_id ?? 0);
        $sem = (int) ($profile->semester_id ?? 0);
        $name = trim(
            ($profile->last_name ? $profile->last_name.', ' : '').
            ($profile->first_name ?? '').
            ($profile->middle_name ? ' '.$profile->middle_name : '')
        );

        return [
            'student' => [
                'student_id' => (int) $profile->student_id,
                'student_id_number' => (string) ($profile->student_id_number ?? ''),
                'name' => $name !== '' ? $name : 'Student #'.$profile->student_id,
                'year' => $year,
            ],
            'year' => $year,
            'sem' => $sem,
            'standing_order' => $year > 0 && $sem > 0 ? $this->termOrder($year, $sem) : null,
            'entry_type' => trim((string) ($profile->student_entry_type ?? '')),
            'rows' => $rows,
            'status' => $classified['status'],
            'reasons' => $classified['reasons'],
            'load' => is_array($profile->standing_term_load) ? $profile->standing_term_load : null,
            'deferred' => is_array($profile->standing_deferred_keys) ? $profile->standing_deferred_keys : [],
        ];
    }

    /**
     * Elective slot: the choice the student actually has a record for (each choice used once).
     *
     * @param  array<string, mixed>  $t
     * @param  array<int, mixed>  $preferred
     * @param  array<int, true>  $credits
     * @param  array<int, true>  $usedChoices
     */
    private function pickElectiveChoice(array $t, array $preferred, array $credits, array $usedChoices): ?array
    {
        $fallback = null;
        foreach ($t['choices'] as $id => $meta) {
            if (isset($usedChoices[$id])) {
                continue;
            }
            if (isset($credits[$id]) || $this->outcome($preferred[$id] ?? null, $t['passing_grade']) === 'passed') {
                return $meta;
            }
            if ($fallback === null && isset($preferred[$id]) && $this->outcome($preferred[$id], $t['passing_grade']) !== null) {
                $fallback = $meta;
            }
        }

        return $fallback;
    }

    /** passed | failed | inc | dropped | ongoing | null (no record). */
    private function outcome(mixed $evaluation, mixed $passingGrade): ?string
    {
        if ($evaluation === null) {
            return null;
        }
        $grade = $this->grades->cleanGrade($evaluation->grade);
        $status = strtolower(trim((string) ($evaluation->evaluation_status ?? '')));
        if ($grade === null && $status === '') {
            return null;
        }
        if (in_array($status, ['passed', 'pass', 'credit', 'complete', 'completed'], true)
            || $this->grades->gradeIndicatesPass($evaluation->grade, $passingGrade, $evaluation->evaluation_status)) {
            return 'passed';
        }
        if (in_array($status, ['incomplete', 'inc'], true)) {
            return 'inc';
        }
        if (in_array($status, ['dropped', 'drop'], true)) {
            return 'dropped';
        }
        if (in_array($status, ['failed', 'fail', 'f'], true)) {
            return 'failed';
        }
        if ($grade !== null) {
            $upper = strtoupper($grade);
            if ($upper === 'INC') {
                return 'inc';
            }
            if (in_array($upper, ['DRP', 'DROP', 'DROPPED', 'UD', 'OD'], true)) {
                return 'dropped';
            }

            return 'failed';
        }

        return 'ongoing';
    }

    // ---------------------------------------------------------------------
    // 1. Subject performance
    // ---------------------------------------------------------------------

    private function subjectPerformance(array $records): array
    {
        $stats = [];
        foreach ($records as $record) {
            $seen = [];
            foreach ($record['rows'] as $row) {
                if ($row['subject'] === null || $row['credited'] || ! in_array($row['outcome'], self::TAKEN_OUTCOMES, true)) {
                    continue;
                }
                $sid = $row['subject']['id'];
                if (isset($seen[$sid])) {
                    continue;
                }
                $seen[$sid] = true;

                if (! isset($stats[$sid])) {
                    $stats[$sid] = [
                        'subject_id' => $sid,
                        'code' => $row['subject']['code'],
                        'name' => $row['subject']['name'],
                        'units' => $row['subject']['units'],
                        'year' => $row['year'],
                        'sem_name' => $row['sem_name'],
                        'type' => $this->builder->isMajorEvaluationRow([
                            'subject_id' => $sid,
                            'subject_type' => $row['subject_type'],
                            'subject_code' => $row['subject']['code'],
                        ]) ? 'major' : 'ge',
                        'enrolled' => 0,
                        'passed' => 0,
                        'failed' => 0,
                        'inc' => 0,
                        'dropped' => 0,
                        'grade_sum' => 0.0,
                        'grade_n' => 0,
                        'students' => [],
                    ];
                }
                $s = &$stats[$sid];
                $s['enrolled']++;
                $s[$row['outcome']]++;
                if ($row['grade'] !== null && $this->grades->isNumericalGradeScale($row['grade'])) {
                    $s['grade_sum'] += (float) str_replace(',', '.', $row['grade']);
                    $s['grade_n']++;
                }
                if ($row['outcome'] !== 'passed' && count($s['students']) < self::LIST_LIMIT) {
                    $s['students'][] = $record['student'] + [
                        'outcome' => $row['outcome'],
                        'grade' => $row['grade'],
                    ];
                }
                unset($s);
            }
        }

        $subjects = array_map(function (array $s) {
            $s['pass_rate'] = $s['enrolled'] > 0 ? round($s['passed'] / $s['enrolled'] * 100, 1) : 0.0;
            $s['fail_rate'] = $s['enrolled'] > 0 ? round(($s['enrolled'] - $s['passed']) / $s['enrolled'] * 100, 1) : 0.0;
            $s['avg_grade'] = $s['grade_n'] > 0 ? round($s['grade_sum'] / $s['grade_n'], 2) : null;
            unset($s['grade_sum'], $s['grade_n']);

            return $s;
        }, array_values($stats));

        usort($subjects, static fn ($a, $b) => [$a['pass_rate'], -$a['enrolled']] <=> [$b['pass_rate'], -$b['enrolled']]);

        return ['subjects' => $subjects];
    }

    // ---------------------------------------------------------------------
    // 2. Prerequisite blockers
    // ---------------------------------------------------------------------

    private function prerequisiteBlockers(array $records): array
    {
        $blockers = [];
        foreach ($records as $record) {
            if ($record['standing_order'] === null) {
                continue;
            }
            $byCode = [];
            foreach ($record['rows'] as $row) {
                if ($row['subject'] !== null) {
                    $byCode[$this->normCode($row['subject']['code'])] ??= $row;
                }
            }
            $sid = $record['student']['student_id'];
            foreach ($record['rows'] as $target) {
                if ($target['subject'] === null || $target['passed'] || $target['order'] > $record['standing_order']) {
                    continue;
                }
                foreach ($target['prereq_codes'] as $code) {
                    $pre = $byCode[$code] ?? null;
                    if ($pre === null || $pre['passed']) {
                        continue;
                    }
                    if (! isset($blockers[$code])) {
                        $blockers[$code] = [
                            'code' => $pre['subject']['code'],
                            'name' => $pre['subject']['name'],
                            'year' => $pre['year'],
                            'sem_name' => $pre['sem_name'],
                            'students' => [],
                            'dependents' => [],
                        ];
                    }
                    $blockers[$code]['students'][$sid] ??= $record['student'] + [
                        'outcome' => $pre['outcome'] ?? 'not_taken',
                        'grade' => $pre['grade'],
                    ];
                    $depCode = $target['subject']['code'];
                    $blockers[$code]['dependents'][$depCode] ??= [
                        'code' => $depCode,
                        'name' => $target['subject']['name'],
                        'students' => [],
                    ];
                    $blockers[$code]['dependents'][$depCode]['students'][$sid] = true;
                }
            }
        }

        $items = [];
        foreach ($blockers as $b) {
            $students = array_values($b['students']);
            $failedOrInc = count(array_filter(
                $students,
                static fn ($s) => in_array($s['outcome'], ['failed', 'inc', 'dropped'], true)
            ));
            $dependents = array_map(static fn ($d) => [
                'code' => $d['code'],
                'name' => $d['name'],
                'students' => count($d['students']),
            ], array_values($b['dependents']));
            usort($dependents, static fn ($x, $y) => $y['students'] <=> $x['students']);

            $items[] = [
                'code' => $b['code'],
                'name' => $b['name'],
                'year' => $b['year'],
                'sem_name' => $b['sem_name'],
                'students_blocked' => count($students),
                'failed_or_inc' => $failedOrInc,
                'not_yet_passed' => count($students) - $failedOrInc,
                'dependents' => $dependents,
                'students' => array_slice($students, 0, self::LIST_LIMIT),
            ];
        }
        usort($items, static fn ($a, $b) => [$b['students_blocked'], $b['failed_or_inc']] <=> [$a['students_blocked'], $a['failed_or_inc']]);

        $insight = 'No student is currently held back by an unpassed prerequisite.';
        if ($items !== []) {
            $top = $items[0];
            $deps = implode(', ', array_map(
                static fn ($d) => $d['code'].' ('.$d['students'].')',
                array_slice($top['dependents'], 0, 3)
            ));
            $insight = sprintf(
                '%s – %s is blocking %d student%s from %s. Offering or retaking it unlocks the most progress.',
                $top['code'],
                $top['name'],
                $top['students_blocked'],
                $top['students_blocked'] === 1 ? '' : 's',
                $deps
            );
        }

        return ['items' => $items, 'insight' => $insight];
    }

    // ---------------------------------------------------------------------
    // 3. Regular vs Irregular
    // ---------------------------------------------------------------------

    private function academicStatus(array $records, array $years): array
    {
        $byYear = [];
        foreach ($years as $y) {
            $byYear[$y['year_level_id']] = [
                'year_level_id' => $y['year_level_id'],
                'label' => $y['label'],
                'regular' => 0,
                'irregular' => 0,
                'failed_subject' => 0,
                'sequence_gap' => 0,
            ];
        }
        $entryTypes = [];
        $totals = ['regular' => 0, 'irregular' => 0, 'failed_subject' => 0, 'sequence_gap' => 0];

        foreach ($records as $record) {
            $isIrregular = $record['status'] === 'Irregular';
            $key = $isIrregular ? 'irregular' : 'regular';
            $totals[$key]++;
            if (isset($byYear[$record['year']])) {
                $byYear[$record['year']][$key]++;
            }
            if (! $isIrregular) {
                continue;
            }
            $reason = $this->statusReasonKey($record['reasons']);
            $totals[$reason]++;
            if (isset($byYear[$record['year']])) {
                $byYear[$record['year']][$reason]++;
            }
            $entry = $record['entry_type'] !== '' ? $record['entry_type'] : 'Standard';
            $entryTypes[$entry] = ($entryTypes[$entry] ?? 0) + 1;
        }

        $all = $totals['regular'] + $totals['irregular'];
        $series = array_values($byYear);
        $insight = 'No students found for this program.';
        if ($all > 0) {
            $worst = collect($series)->sortByDesc('irregular')->first();
            $insight = sprintf(
                '%d of %d students (%s%%) are irregular.',
                $totals['irregular'],
                $all,
                $this->pct($totals['irregular'], $all)
            );
            if ($worst && $worst['irregular'] > 0) {
                $insight .= sprintf(' %s has the most irregular students (%d).', $worst['label'], $worst['irregular']);
            }
            if ($totals['irregular'] > 0) {
                $insight .= $totals['failed_subject'] >= $totals['sequence_gap']
                    ? sprintf(' Main cause: a failed subject (%d students).', $totals['failed_subject'])
                    : sprintf(' Main cause: subjects taken out of curriculum order (%d students).', $totals['sequence_gap']);
            }
        }

        arsort($entryTypes);
        $entryList = [];
        foreach ($entryTypes as $label => $count) {
            $entryList[] = ['label' => $label, 'count' => $count];
        }

        return [
            'by_year' => $series,
            'totals' => $totals + ['students' => $all],
            'irregular_by_entry_type' => $entryList,
            'insight' => $insight,
        ];
    }

    /** @param  list<string>  $reasons */
    private function statusReasonKey(array $reasons): string
    {
        foreach ($reasons as $reason) {
            if (stripos($reason, 'failing') !== false) {
                return 'failed_subject';
            }
        }

        return 'sequence_gap';
    }

    // ---------------------------------------------------------------------
    // 4. Student progress (backlog units vs completed curriculum terms)
    // ---------------------------------------------------------------------

    private function studentProgress(array $records, array $years): array
    {
        $byYear = [];
        foreach ($years as $y) {
            $byYear[$y['year_level_id']] = [
                'year_level_id' => $y['year_level_id'],
                'label' => $y['label'],
                'on_track' => 0,
                'slightly_behind' => 0,
                'delayed' => 0,
            ];
        }
        $totals = ['on_track' => 0, 'slightly_behind' => 0, 'delayed' => 0];
        $behind = [];

        foreach ($records as $record) {
            if ($record['standing_order'] === null) {
                continue;
            }
            $backlogUnits = 0;
            $backlogCodes = [];
            $earned = 0;
            $expected = 0;
            foreach ($record['rows'] as $row) {
                if ($row['passed']) {
                    $earned += $row['units'];
                }
                if ($row['order'] < $record['standing_order']) {
                    $expected += $row['units'];
                    if (! $row['passed']) {
                        $backlogUnits += $row['units'];
                        $backlogCodes[] = $row['code'];
                    }
                }
            }
            $bucket = $backlogUnits === 0
                ? 'on_track'
                : ($backlogUnits <= self::SLIGHTLY_BEHIND_MAX_UNITS ? 'slightly_behind' : 'delayed');
            $totals[$bucket]++;
            if (isset($byYear[$record['year']])) {
                $byYear[$record['year']][$bucket]++;
            }
            if ($backlogUnits > 0) {
                $behind[] = $record['student'] + [
                    'status' => $record['status'],
                    'backlog_units' => $backlogUnits,
                    'backlog_subjects' => count($backlogCodes),
                    'backlog_codes' => array_slice($backlogCodes, 0, 8),
                    'earned_units' => $earned,
                    'expected_units' => $expected,
                    'bucket' => $bucket,
                ];
            }
        }

        usort($behind, static fn ($a, $b) => $b['backlog_units'] <=> $a['backlog_units']);
        $all = array_sum($totals);
        $insight = 'No students with a recorded standing yet.';
        if ($all > 0) {
            $insight = sprintf(
                '%d of %d students (%s%%) are on track. %d are slightly behind (1–%d units) and %d are delayed (more than %d units of backlog).',
                $totals['on_track'],
                $all,
                $this->pct($totals['on_track'], $all),
                $totals['slightly_behind'],
                self::SLIGHTLY_BEHIND_MAX_UNITS,
                $totals['delayed'],
                self::SLIGHTLY_BEHIND_MAX_UNITS
            );
        }

        return [
            'by_year' => array_values($byYear),
            'totals' => $totals + ['students' => $all],
            'slightly_behind_max_units' => self::SLIGHTLY_BEHIND_MAX_UNITS,
            'most_behind' => array_slice($behind, 0, self::LIST_LIMIT),
            'insight' => $insight,
        ];
    }

    // ---------------------------------------------------------------------
    // 5. Curriculum progress by year level (expected vs actual completion)
    // ---------------------------------------------------------------------

    private function progressByYear(array $records, array $years): array
    {
        $acc = [];
        foreach ($records as $record) {
            $year = $record['year'];
            if ($year <= 0 || $record['standing_order'] === null) {
                continue;
            }
            $total = 0;
            $earned = 0;
            $byNow = 0;
            $endOfYear = 0;
            foreach ($record['rows'] as $row) {
                $total += $row['units'];
                if ($row['passed']) {
                    $earned += $row['units'];
                }
                if ($row['order'] < $record['standing_order']) {
                    $byNow += $row['units'];
                }
                if ($row['year'] <= $year) {
                    $endOfYear += $row['units'];
                }
            }
            if ($total <= 0) {
                continue;
            }
            $acc[$year]['n'] = ($acc[$year]['n'] ?? 0) + 1;
            $acc[$year]['actual'] = ($acc[$year]['actual'] ?? 0) + $earned / $total * 100;
            $acc[$year]['by_now'] = ($acc[$year]['by_now'] ?? 0) + $byNow / $total * 100;
            $acc[$year]['end'] = ($acc[$year]['end'] ?? 0) + $endOfYear / $total * 100;
        }

        $rows = [];
        foreach ($years as $y) {
            $a = $acc[$y['year_level_id']] ?? null;
            $n = (int) ($a['n'] ?? 0);
            $actual = $n > 0 ? round($a['actual'] / $n, 1) : null;
            $byNow = $n > 0 ? round($a['by_now'] / $n, 1) : null;
            $rows[] = [
                'year_level_id' => $y['year_level_id'],
                'label' => $y['label'],
                'students' => $n,
                'expected_by_now' => $byNow,
                'expected_end_of_year' => $n > 0 ? round($a['end'] / $n, 1) : null,
                'actual_average' => $actual,
                'gap' => $n > 0 ? round($actual - $byNow, 1) : null,
            ];
        }

        $withData = array_values(array_filter($rows, static fn ($r) => $r['students'] > 0));
        $insight = 'No students with a recorded standing yet.';
        if ($withData !== []) {
            usort($withData, static fn ($a, $b) => $a['gap'] <=> $b['gap']);
            $worst = $withData[0];
            $insight = $worst['gap'] < 0
                ? sprintf(
                    '%s students are %s percentage points behind the expected curriculum progression (%s%% completed vs %s%% expected by now).',
                    $worst['label'],
                    abs($worst['gap']),
                    $worst['actual_average'],
                    $worst['expected_by_now']
                )
                : 'Every year level is at or ahead of the expected curriculum progression.';
        }

        return ['rows' => $rows, 'insight' => $insight];
    }

    // ---------------------------------------------------------------------
    // 6. Load plans (current term)
    // ---------------------------------------------------------------------

    private function loadPlans(array $records, array $years): array
    {
        $byYear = [];
        foreach ($years as $y) {
            $byYear[$y['year_level_id']] = [
                'year_level_id' => $y['year_level_id'],
                'label' => $y['label'],
                'cap' => self::YEAR_UNIT_CAPS[$y['year_level_id']] ?? null,
                'no_plan' => 0,
                'underload' => 0,
                'full' => 0,
                'overload' => 0,
                'units_sum' => 0,
                'planned' => 0,
            ];
        }
        $totals = ['no_plan' => 0, 'underload' => 0, 'full' => 0, 'overload' => 0];
        $dropped = [];
        $underloaded = [];

        foreach ($records as $record) {
            if ($record['standing_order'] === null) {
                continue;
            }
            $load = $record['load'];
            $valid = is_array($load)
                && (int) ($load['year_level_id'] ?? 0) === $record['year']
                && (int) ($load['semester_id'] ?? 0) === $record['sem'];
            if (! $valid) {
                $totals['no_plan']++;
                if (isset($byYear[$record['year']])) {
                    $byYear[$record['year']]['no_plan']++;
                }
                continue;
            }

            $rowsByKey = [];
            foreach ($record['rows'] as $row) {
                $rowsByKey[$row['key']] = $row;
            }
            $units = 0;
            foreach ((array) ($load['take_keys'] ?? []) as $key) {
                $units += (int) ($rowsByKey[(string) $key]['units'] ?? 0);
            }
            $cap = self::YEAR_UNIT_CAPS[$record['year']] ?? null;
            $bucket = $cap === null || $units === $cap ? 'full' : ($units < $cap ? 'underload' : 'overload');
            $totals[$bucket]++;
            if (isset($byYear[$record['year']])) {
                $byYear[$record['year']][$bucket]++;
                $byYear[$record['year']]['units_sum'] += $units;
                $byYear[$record['year']]['planned']++;
            }
            if ($bucket === 'underload' && count($underloaded) < self::LIST_LIMIT) {
                $underloaded[] = $record['student'] + [
                    'status' => $record['status'],
                    'units' => $units,
                    'cap' => $cap,
                ];
            }

            $deferredKeys = (array) ($load['deferred_keys'] ?? $record['deferred']);
            foreach ($deferredKeys as $key) {
                $row = $rowsByKey[(string) $key] ?? null;
                if ($row === null || $row['passed'] || $row['year'] !== $record['year'] || $row['sem'] !== $record['sem']) {
                    continue;
                }
                $code = $row['code'];
                $dropped[$code] ??= [
                    'code' => $code,
                    'name' => $row['subject']['name'] ?? ($row['pending'] ? 'Elective slot' : ''),
                    'count' => 0,
                ];
                $dropped[$code]['count']++;
            }
        }

        $series = array_map(static function ($y) {
            $y['avg_units'] = $y['planned'] > 0 ? round($y['units_sum'] / $y['planned'], 1) : null;
            unset($y['units_sum']);

            return $y;
        }, array_values($byYear));

        $droppedList = array_values($dropped);
        usort($droppedList, static fn ($a, $b) => $b['count'] <=> $a['count']);
        usort($underloaded, static fn ($a, $b) => ($a['units'] - $a['cap']) <=> ($b['units'] - $b['cap']));

        $planned = $totals['underload'] + $totals['full'] + $totals['overload'];
        $insight = $planned === 0
            ? 'No load plans saved for the current term yet. Plans are saved from Subject placement on each student’s evaluation.'
            : sprintf(
                '%d of %d saved load plans are underloaded.',
                $totals['underload'],
                $planned
            );
        if ($planned > 0 && $droppedList !== []) {
            $insight .= sprintf(
                ' Most often not taken this term: %s – %s (%d students).',
                $droppedList[0]['code'],
                $droppedList[0]['name'],
                $droppedList[0]['count']
            );
        }

        return [
            'by_year' => $series,
            'totals' => $totals + ['planned' => $planned],
            'most_dropped' => array_slice($droppedList, 0, 15),
            'underloaded' => $underloaded,
            'insight' => $insight,
        ];
    }

    // ---------------------------------------------------------------------
    // Helpers
    // ---------------------------------------------------------------------

    /** @return list<array{year_level_id: int, label: string}> */
    private function yearBuckets(array $records, array $yearLabels): array
    {
        $ids = [1, 2, 3, 4];
        foreach ($records as $record) {
            if ($record['year'] > 4) {
                $ids[] = $record['year'];
            }
        }
        $ids = array_values(array_unique($ids));
        sort($ids);

        return array_map(static fn ($id) => [
            'year_level_id' => $id,
            'label' => $yearLabels[$id] ?? "Year {$id}",
        ], $ids);
    }

    /** Program order: summer (semester 3) sorts before 1st semester, same as the evaluation builder. */
    private function termOrder(int $year, int $sem): int
    {
        return $year * 10 + ($sem === 3 ? 0 : $sem);
    }

    private function normCode(mixed $code): string
    {
        return strtoupper(trim((string) ($code ?? '')));
    }

    private function pct(int $part, int $whole): string
    {
        return $whole > 0 ? (string) round($part / $whole * 100, 1) : '0';
    }
}
