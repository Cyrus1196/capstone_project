<?php

namespace App\Http\Controllers;

use App\Models\AcademicRecordEvaluationComplete;
use App\Models\DeanProfile;
use App\Models\Evaluation;
use App\Models\StudentProfile;
use App\Models\Subject;
use App\Models\TblUser;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Http\Request;
class EvaluationReportController extends Controller
{
    private function assertEvaluationAccess(Request $request): ?\Illuminate\Http\JsonResponse
    {
        $user = $request->user();
        if (! $user) {
            return response()->json(['message' => 'Unauthorized'], 401);
        }
        if (! $user->canWorkOnStudentEvaluations()) {
            return response()->json(['message' => 'Forbidden'], 403);
        }

        return null;
    }

    /** Scope student queries: Dean → assigned program; others optional program_id query. */
    private function applyDeanProgramScope(Builder $query, Request $request, $user): void
    {
        if ($user->hasRole('Dean') && ! $user->isAdmin()) {
            $deanProfile = DeanProfile::where('user_id', $user->user_id)->first();
            if ($deanProfile && $deanProfile->program_id) {
                $pid = $deanProfile->program_id;
                $query->where(function ($q) use ($pid) {
                    $q->where('Current_Program', $pid)->orWhere('current_program', $pid);
                });
            }

            return;
        }
        if ($request->filled('program_id')) {
            $pid = (int) $request->query('program_id');
            $query->where(function ($q) use ($pid) {
                $q->where('Current_Program', $pid)->orWhere('current_program', $pid);
            });
        }
    }

    private function evaluationQuery(Request $request, $user): Builder
    {
        $q = Evaluation::query();

        $q->whereHas('student', function (Builder $s) use ($request, $user) {
            $this->applyDeanProgramScope($s, $request, $user);
        });

        if ($request->filled('academic_year_id')) {
            $q->where('academic_year_id', (int) $request->query('academic_year_id'));
        }
        if ($request->filled('semester_id')) {
            $q->where('semester_id', (int) $request->query('semester_id'));
        }

        return $q;
    }

    private function rowPassed(?string $status, $grade): bool
    {
        $st = strtolower(trim((string) $status));
        if (in_array($st, ['passed', 'pass', 'credit'], true)) {
            return true;
        }
        if (in_array($st, ['failed', 'fail', 'f', 'dropped'], true)) {
            return false;
        }
        if ($grade !== null && $grade !== '' && is_numeric($grade)) {
            return (float) $grade >= 75.0;
        }

        return false;
    }

    private function rowFailed(?string $status, $grade): bool
    {
        $st = strtolower(trim((string) $status));
        if (in_array($st, ['failed', 'fail', 'f'], true)) {
            return true;
        }
        if ($grade !== null && $grade !== '' && is_numeric($grade)) {
            return (float) $grade < 75.0;
        }

        return false;
    }

    public function getEvaluationSummary(Request $request)
    {
        if ($resp = $this->assertEvaluationAccess($request)) {
            return $resp;
        }
        $user = $request->user();

        $total = 0;
        $passed = 0;
        $failed = 0;
        $other = 0;

        $this->evaluationQuery($request, $user)
            ->whereNotNull('subject_id')
            ->select(['evaluation_id', 'evaluation_status', 'grade'])
            ->chunkById(500, function ($rows) use (&$total, &$passed, &$failed, &$other) {
                foreach ($rows as $row) {
                    $total++;
                    if ($this->rowPassed($row->evaluation_status, $row->grade)) {
                        $passed++;
                    } elseif ($this->rowFailed($row->evaluation_status, $row->grade)) {
                        $failed++;
                    } else {
                        $other++;
                    }
                }
            }, 'evaluation_id');

        $decided = $passed + $failed;
        $passRate = $decided > 0 ? round(($passed / $decided) * 1000) / 10 : null;

        return response()->json([
            'total_evaluations' => $total,
            'passed' => $passed,
            'failed' => $failed,
            'other' => $other,
            'pass_rate_percent' => $passRate,
            'failure_rate_percent' => $decided > 0 ? round(1000 - ($passRate * 10)) / 10 : null,
        ]);
    }

    public function getDepartmentAnalytics(Request $request)
    {
        if ($resp = $this->assertEvaluationAccess($request)) {
            return $resp;
        }
        $user = $request->user();

        $byProgram = [];

        $this->evaluationQuery($request, $user)
            ->whereNotNull('subject_id')
            ->with(['student.program'])
            ->chunkById(500, function ($rows) use (&$byProgram) {
                foreach ($rows as $row) {
                    $prog = $row->student?->program;
                    $key = $prog ? (string) $prog->program_id : '0';
                    $code = $prog->program_code ?? '—';
                    $name = $prog->program_name ?? 'Unknown';
                    if (! isset($byProgram[$key])) {
                        $byProgram[$key] = [
                            'program_id' => $prog?->program_id,
                            'program_code' => $code,
                            'program_name' => $name,
                            'evaluation_count' => 0,
                            'passed' => 0,
                            'failed' => 0,
                        ];
                    }
                    $byProgram[$key]['evaluation_count']++;
                    if ($this->rowPassed($row->evaluation_status, $row->grade)) {
                        $byProgram[$key]['passed']++;
                    } elseif ($this->rowFailed($row->evaluation_status, $row->grade)) {
                        $byProgram[$key]['failed']++;
                    }
                }
            }, 'evaluation_id');

        $list = array_values($byProgram);
        usort($list, fn ($a, $b) => $b['evaluation_count'] <=> $a['evaluation_count']);

        return response()->json(['programs' => $list]);
    }

    public function getStudentPerformanceReport(Request $request, int|string $studentId)
    {
        if ($resp = $this->assertEvaluationAccess($request)) {
            return $resp;
        }
        $user = $request->user();

        $student = StudentProfile::with('program')->where('student_id', $studentId)->first();
        if (! $student) {
            return response()->json(['message' => 'Student not found'], 404);
        }

        if ($user->hasRole('Dean') && ! $user->isAdmin()) {
            $deanProfile = DeanProfile::where('user_id', $user->user_id)->first();
            if ($deanProfile && $deanProfile->program_id) {
                $pid = $deanProfile->program_id;
                $sid = $student->getAttributes()['current_program']
                    ?? $student->getAttributes()['Current_Program']
                    ?? $student->current_program
                    ?? null;
                if ((int) $sid !== (int) $pid) {
                    return response()->json(['message' => 'Forbidden'], 403);
                }
            }
        }

        $q = Evaluation::query()->where('student_id', $studentId);
        if ($request->filled('academic_year_id')) {
            $q->where('academic_year_id', (int) $request->query('academic_year_id'));
        }
        if ($request->filled('semester_id')) {
            $q->where('semester_id', (int) $request->query('semester_id'));
        }

        $rows = $q->with(['subject'])->get();
        $passed = $rows->filter(fn ($r) => $this->rowPassed($r->evaluation_status, $r->grade))->count();
        $failed = $rows->filter(fn ($r) => $this->rowFailed($r->evaluation_status, $r->grade))->count();

        return response()->json([
            'student_id' => (int) $studentId,
            'total' => $rows->count(),
            'passed' => $passed,
            'failed' => $failed,
        ]);
    }

    public function getSubjectPerformanceReport(Request $request, int|string $subjectId)
    {
        if ($resp = $this->assertEvaluationAccess($request)) {
            return $resp;
        }
        $user = $request->user();

        $q = $this->evaluationQuery($request, $user)->where('subject_id', $subjectId);
        $rows = $q->get(['evaluation_status', 'grade']);
        $passed = $rows->filter(fn ($r) => $this->rowPassed($r->evaluation_status, $r->grade))->count();
        $failed = $rows->filter(fn ($r) => $this->rowFailed($r->evaluation_status, $r->grade))->count();

        return response()->json([
            'subject_id' => (int) $subjectId,
            'total' => $rows->count(),
            'passed' => $passed,
            'failed' => $failed,
        ]);
    }

    /**
     * Dean / program dashboard: counts + recent stored academic-record completions.
     */
    public function deanDashboard(Request $request)
    {
        if ($resp = $this->assertEvaluationAccess($request)) {
            return $resp;
        }
        $user = $request->user();

        $studentQ = StudentProfile::query();
        $this->applyDeanProgramScope($studentQ, $request, $user);
        $totalStudents = $studentQ->count();

        $doneQ = AcademicRecordEvaluationComplete::query()->with(['student.program', 'completedByUser']);
        $doneQ->whereHas('student', function (Builder $s) use ($request, $user) {
            $this->applyDeanProgramScope($s, $request, $user);
        });
        $evaluatedStudents = (clone $doneQ)->distinct()->count('student_id');

        $evaluatorRoles = TblUser::query()
            ->whereHas('role', fn ($r) => $r->whereIn('role_name', ['Evaluator', 'Adviser']))
            ->count();

        $recent = (clone $doneQ)
            ->orderByDesc('completed_at')
            ->limit(10)
            ->get()
            ->map(function (AcademicRecordEvaluationComplete $c) {
                $stu = $c->student;
                $name = $stu
                    ? trim(($stu->last_name ?? '').', '.($stu->first_name ?? '').' '.($stu->middle_name ?? ''))
                    : 'Student';
                $when = $c->completed_at ? $c->completed_at->diffForHumans() : '';

                return [
                    'academic_record_complete_id' => $c->academic_record_complete_id,
                    'student_name' => $name ?: 'Student',
                    'completed_at' => $c->completed_at?->toIso8601String(),
                    'completed_at_human' => $when,
                    'subtitle' => 'Academic record evaluation stored',
                ];
            });

        return response()->json([
            'total_students' => $totalStudents,
            'evaluated_students' => $evaluatedStudents,
            'evaluators_count' => $evaluatorRoles,
            'recent_activity' => $recent,
        ]);
    }

    /** Top failed/passed subjects + average numeric grade per subject (scoped). */
    public function subjectInsights(Request $request)
    {
        if ($resp = $this->assertEvaluationAccess($request)) {
            return $resp;
        }
        $user = $request->user();

        $failCounts = [];
        $passCounts = [];
        $gradeSum = [];
        $gradeN = [];

        $this->evaluationQuery($request, $user)
            ->whereNotNull('subject_id')
            ->chunkById(500, function ($rows) use (&$failCounts, &$passCounts, &$gradeSum, &$gradeN) {
                foreach ($rows as $row) {
                    $sid = (int) $row->subject_id;
                    if ($this->rowFailed($row->evaluation_status, $row->grade)) {
                        $failCounts[$sid] = ($failCounts[$sid] ?? 0) + 1;
                    }
                    if ($this->rowPassed($row->evaluation_status, $row->grade)) {
                        $passCounts[$sid] = ($passCounts[$sid] ?? 0) + 1;
                    }
                    if ($row->grade !== null && $row->grade !== '' && is_numeric($row->grade)) {
                        $g = (float) $row->grade;
                        if ($g >= 1 && $g <= 5) {
                            $gradeSum[$sid] = ($gradeSum[$sid] ?? 0) + $g;
                            $gradeN[$sid] = ($gradeN[$sid] ?? 0) + 1;
                        }
                    }
                }
            }, 'evaluation_id');

        arsort($failCounts);
        arsort($passCounts);

        $subjectIdsForLabels = array_unique(array_merge(
            array_keys(array_slice($failCounts, 0, 5, true)),
            array_keys(array_slice($passCounts, 0, 5, true)),
            array_keys($gradeN)
        ));
        $subjectCodes = $subjectIdsForLabels === []
            ? []
            : Subject::query()->whereIn('subject_id', $subjectIdsForLabels)->pluck('subject_code', 'subject_id')->all();

        $topFailed = [];
        foreach (array_slice($failCounts, 0, 5, true) as $sid => $n) {
            $topFailed[] = [
                'subject_id' => $sid,
                'subject_code' => $subjectCodes[$sid] ?? '—',
                'count' => $n,
            ];
        }

        $topPassed = [];
        foreach (array_slice($passCounts, 0, 5, true) as $sid => $n) {
            $topPassed[] = [
                'subject_id' => $sid,
                'subject_code' => $subjectCodes[$sid] ?? '—',
                'count' => $n,
            ];
        }

        $avgGrades = [];
        foreach ($gradeN as $sid => $n) {
            if ($n < 1) {
                continue;
            }
            $avgGrades[] = [
                'subject_id' => (int) $sid,
                'subject_code' => $subjectCodes[$sid] ?? '—',
                'average' => round($gradeSum[$sid] / $n, 2),
                'sample_size' => $n,
            ];
        }
        usort($avgGrades, fn ($a, $b) => $b['sample_size'] <=> $a['sample_size']);
        $avgGrades = array_slice($avgGrades, 0, 12);

        return response()->json([
            'top_failed_subjects' => $topFailed,
            'top_passed_subjects' => $topPassed,
            'average_grade_by_subject' => $avgGrades,
        ]);
    }

    /** Students with two or more failed evaluation rows (scoped). */
    public function atRiskStudents(Request $request)
    {
        if ($resp = $this->assertEvaluationAccess($request)) {
            return $resp;
        }
        $user = $request->user();

        $fails = [];

        $this->evaluationQuery($request, $user)
            ->whereNotNull('subject_id')
            ->chunkById(500, function ($rows) use (&$fails) {
                foreach ($rows as $row) {
                    if (! $this->rowFailed($row->evaluation_status, $row->grade)) {
                        continue;
                    }
                    $sid = (int) $row->student_id;
                    $fails[$sid] = ($fails[$sid] ?? 0) + 1;
                }
            }, 'evaluation_id');

        $atRiskIds = array_keys(array_filter($fails, fn ($n) => $n >= 2));
        $studentsById = $atRiskIds === []
            ? collect()
            : StudentProfile::query()
                ->with('program')
                ->whereIn('student_id', $atRiskIds)
                ->get()
                ->keyBy('student_id');

        $atRisk = [];
        foreach ($fails as $studentId => $n) {
            if ($n < 2) {
                continue;
            }
            $stu = $studentsById->get($studentId);
            if (! $stu) {
                continue;
            }
            $name = trim(
                ($stu->last_name ? $stu->last_name.', ' : '').
                ($stu->first_name ?? '').
                ($stu->middle_name ? ' '.$stu->middle_name : '')
            );
            $atRisk[] = [
                'student_id' => $studentId,
                'student_id_number' => $stu->student_id_number ?? $stu->student_number ?? '',
                'full_name' => $name ?: '—',
                'program_code' => $stu->program->program_code ?? '—',
                'failed_subject_evaluations' => $n,
            ];
        }

        usort($atRisk, fn ($a, $b) => $b['failed_subject_evaluations'] <=> $a['failed_subject_evaluations']);

        $search = strtolower(trim((string) $request->query('search', '')));
        if ($search !== '') {
            $atRisk = array_values(array_filter($atRisk, function ($r) use ($search) {
                return str_contains(strtolower($r['full_name']), $search)
                    || str_contains(strtolower((string) $r['student_id_number']), $search);
            }));
        }

        return response()->json(['students' => array_values($atRisk)]);
    }
}
