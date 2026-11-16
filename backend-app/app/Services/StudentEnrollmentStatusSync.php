<?php

namespace App\Services;

use App\Models\AcademicYear;
use App\Models\Evaluation;
use App\Models\Semester;
use App\Models\StudentProfile;
use App\Support\EnrollmentStatus;
use Illuminate\Support\Facades\DB;

class StudentEnrollmentStatusSync
{
    /**
     * Students present in a grade import → Enrolled (unless Transferred / Graduate).
     * Graduate check is optional — skip during bulk import (too slow); evaluation screen still sets Graduate.
     *
     * @param  list<int|string>  $studentIds  student_id primary keys
     * @return array{enrolled: int, graduated: int}
     */
    public function markPresentStudentsEnrolled(array $studentIds, bool $checkGraduate = true): array
    {
        $ids = array_values(array_unique(array_filter(array_map('intval', $studentIds))));
        $counts = ['enrolled' => 0, 'graduated' => 0];
        if ($ids === []) {
            return $counts;
        }

        if (! $checkGraduate) {
            foreach (array_chunk($ids, 200) as $chunk) {
                $counts['enrolled'] += StudentProfile::query()
                    ->whereIn('student_id', $chunk)
                    ->where(function ($q) {
                        $q->whereNull('enrollment_status')
                            ->orWhereRaw("TRIM(enrollment_status) = ''")
                            ->orWhereRaw('LOWER(TRIM(enrollment_status)) NOT IN (?, ?, ?)', [
                                'transferred',
                                'graduate',
                                'enrolled',
                            ]);
                    })
                    ->update(['enrollment_status' => EnrollmentStatus::ENROLLED]);
            }

            return $counts;
        }

        $builder = app(StudentCurriculumEvaluationBuilder::class);

        foreach (array_chunk($ids, 50) as $chunk) {
            $profiles = StudentProfile::query()
                ->whereIn('student_id', $chunk)
                ->get();
            foreach ($profiles as $profile) {
                $current = EnrollmentStatus::normalize($profile->enrollment_status);
                if (EnrollmentStatus::isProtected($current)) {
                    continue;
                }
                if ($current === EnrollmentStatus::GRADUATE) {
                    continue;
                }

                if ($current !== EnrollmentStatus::ENROLLED) {
                    $profile->enrollment_status = EnrollmentStatus::ENROLLED;
                    $profile->save();
                    $counts['enrolled']++;
                }

                if ($this->applyGraduateIfComplete($profile, $builder)) {
                    $counts['graduated']++;
                }
            }
        }

        return $counts;
    }

    /**
     * After a grade import for a term: previous-term students (optionally same campus)
     * with no grades in this term → Inactive (unless Transferred / Graduate / units complete).
     *
     * @return array{stopped: int, previous_term: array{academic_year_id: int, semester_id: int}|null}
     */
    public function markMissingFromCompletedTerm(
        int $academicYearId,
        int $semesterId,
        ?int $campusId = null
    ): array {
        $previous = $this->resolvePreviousTerm($academicYearId, $semesterId);
        if ($previous === null) {
            return ['stopped' => 0, 'previous_term' => null];
        }

        $prevAy = $previous['academic_year_id'];
        $prevSem = $previous['semester_id'];

        $cohortQuery = Evaluation::query()
            ->where('academic_year_id', $prevAy)
            ->where('semester_id', $prevSem)
            ->whereNotNull('student_id')
            ->select('student_id')
            ->distinct();

        if ($campusId !== null && $campusId > 0) {
            $cohortQuery->whereIn('student_id', function ($q) use ($campusId) {
                $q->select('student_id')
                    ->from('tbl_student_profile')
                    ->where('campus_id', $campusId);
            });
        }

        $cohortIds = $cohortQuery->pluck('student_id')->map(fn ($id) => (int) $id)->all();
        if ($cohortIds === []) {
            return ['stopped' => 0, 'previous_term' => $previous];
        }

        $presentIds = Evaluation::query()
            ->where('academic_year_id', $academicYearId)
            ->where('semester_id', $semesterId)
            ->whereIn('student_id', $cohortIds)
            ->distinct()
            ->pluck('student_id')
            ->map(fn ($id) => (int) $id)
            ->all();
        $presentSet = array_fill_keys($presentIds, true);

        $missingIds = array_values(array_filter(
            $cohortIds,
            static fn (int $id) => ! isset($presentSet[$id])
        ));

        // Bulk update — do not rebuild full curricula here (that made small imports take minutes).
        $stopped = 0;
        foreach (array_chunk($missingIds, 200) as $chunk) {
            $stopped += StudentProfile::query()
                ->whereIn('student_id', $chunk)
                ->where(function ($q) {
                    $q->whereNull('is_simulation')->orWhere('is_simulation', false);
                })
                ->where(function ($q) {
                    $q->whereNull('enrollment_status')
                        ->orWhereRaw("TRIM(enrollment_status) = ''")
                        ->orWhereRaw('LOWER(TRIM(enrollment_status)) NOT IN (?, ?, ?)', [
                            'transferred',
                            'graduate',
                            'inactive',
                        ]);
                })
                ->update(['enrollment_status' => EnrollmentStatus::INACTIVE]);
        }

        return ['stopped' => $stopped, 'previous_term' => $previous];
    }

    /**
     * Set Graduate when earned units cover the curriculum (lacking_units === 0).
     */
    public function applyGraduateIfComplete(
        StudentProfile $profile,
        ?StudentCurriculumEvaluationBuilder $builder = null,
        ?array $built = null
    ): bool {
        $current = EnrollmentStatus::normalize($profile->enrollment_status);
        if (EnrollmentStatus::isProtected($current)) {
            return false;
        }
        if ($current === EnrollmentStatus::GRADUATE) {
            return false;
        }

        $builder ??= app(StudentCurriculumEvaluationBuilder::class);
        $built ??= $builder->buildPayload($profile);
        $total = (float) ($built['summary']['total_units_in_curriculum'] ?? 0);
        $lacking = (float) ($built['summary']['lacking_units'] ?? 0);
        if ($total <= 0 || $lacking > 0) {
            return false;
        }

        $profile->enrollment_status = EnrollmentStatus::GRADUATE;

        return $profile->save();
    }

    /**
     * Previous chronological term: prior semester in same AY, else last semester of prior AY.
     *
     * @return array{academic_year_id: int, semester_id: int}|null
     */
    public function resolvePreviousTerm(int $academicYearId, int $semesterId): ?array
    {
        $semesters = Semester::query()
            ->get(['semester_id', 'semester_name'])
            ->sortBy(fn ($s) => $this->semesterSortValue((int) $s->semester_id, $s->semester_name ?? null))
            ->values();

        if ($semesters->isEmpty()) {
            return null;
        }

        $orderedIds = $semesters->map(fn ($s) => (int) $s->semester_id)->all();
        $pos = array_search($semesterId, $orderedIds, true);

        if ($pos !== false && $pos > 0) {
            return [
                'academic_year_id' => $academicYearId,
                'semester_id' => $orderedIds[$pos - 1],
            ];
        }

        // First semester of this AY → last semester of previous academic year.
        $years = AcademicYear::query()
            ->get(['academic_year_id', 'academic_year_name'])
            ->sortBy(fn ($y) => $this->academicYearStart((string) ($y->academic_year_name ?? '')))
            ->values();

        $yearIds = $years->map(fn ($y) => (int) $y->academic_year_id)->all();
        $yPos = array_search($academicYearId, $yearIds, true);
        if ($yPos === false || $yPos < 1) {
            return null;
        }

        $prevAy = $yearIds[$yPos - 1];
        $lastSem = $orderedIds[count($orderedIds) - 1] ?? null;
        if ($lastSem === null) {
            return null;
        }

        return [
            'academic_year_id' => $prevAy,
            'semester_id' => $lastSem,
        ];
    }

    private function semesterSortValue(int $semesterId, ?string $semesterName = null): int
    {
        $name = strtolower(trim((string) $semesterName));
        if (str_contains($name, 'summer') || $semesterId === 3) {
            return 30;
        }
        if (str_contains($name, '2nd') || str_contains($name, 'second') || $semesterId === 2) {
            return 20;
        }
        if (str_contains($name, '1st') || str_contains($name, 'first') || $semesterId === 1) {
            return 10;
        }

        return 10 + $semesterId;
    }

    private function academicYearStart(string $name): int
    {
        if (preg_match('/(\d{4})\s*[-–\/]/', $name, $m)) {
            return (int) $m[1];
        }
        if (preg_match('/\b(\d{2})\s*[-–\/]\s*(\d{2})\b/', $name, $m)) {
            $yy = (int) $m[1];

            return $yy >= 70 ? 1900 + $yy : 2000 + $yy;
        }

        return 0;
    }
}
