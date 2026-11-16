<?php

namespace App\Support;

use App\Models\StudentProfile;

/**
 * Standing rules shared by the Student evaluation list and Dean analytics,
 * so both screens always count the same students the same way.
 *
 * Year Level filters / list badges use {@see StudentProfile::$year_level_id},
 * which is kept in sync with earned curriculum units
 * (46→2nd, 94→3rd, 132→4th). Promotion-target fields are for promote placement only.
 */
final class EvaluationStanding
{
    /** Study-map thresholds — same as the evaluation hero Standing label. */
    public static function yearOrdinalFromEarnedUnits(float|int|null $earnedUnits): int
    {
        $earned = (float) ($earnedUnits ?? 0);
        if ($earned >= 132) {
            return 4;
        }
        if ($earned >= 94) {
            return 3;
        }
        if ($earned >= 46) {
            return 2;
        }

        return 1;
    }

    /**
     * Year level for list filters / Dean analytics = units-synced profile year.
     * Do not prefer promotion_target (that can lag or lead earned-units standing).
     */
    public static function effectiveYearLevelId(StudentProfile $profile): ?int
    {
        return self::resolveEffectiveYearLevelId(
            null,
            $profile->year_level_id
        );
    }

    public static function resolveEffectiveYearLevelId(mixed $target, mixed $year): ?int
    {
        // $target kept in the signature for call sites; filters ignore it on purpose.
        unset($target);
        $yearId = ($year !== null && $year !== '') ? (int) $year : null;

        return $yearId;
    }

    /**
     * SQL expression matching {@see effectiveYearLevelId()} for WHERE / GROUP BY.
     */
    public static function sqlEffectiveYearLevelIdExpr(): string
    {
        return 'year_level_id';
    }

    public static function isIrregular(StudentProfile $profile): bool
    {
        return strtolower(trim((string) ($profile->academic_status ?? ''))) === 'irregular';
    }

    /** Staff Complete / manual promote — not auto-promote or Regular-era "Semester promotion" leftovers. */
    public static function isManualCompletionNote(?string $notes): bool
    {
        $notes = (string) $notes;
        if (str_contains($notes, 'Irregular manual promotion') || trim($notes) === '') {
            return true;
        }

        return ! str_contains($notes, 'Auto-promoted on semester activation')
            && ! str_contains($notes, 'Semester promotion');
    }

    /**
     * Irregulars count as evaluated only after a manual promote / Complete.
     * Regulars count after any completion log or an auto-promotion.
     *
     * @param  iterable<string|null>  $completionNotes
     * @return 'manual'|'auto'|null
     */
    public static function evaluatedState(bool $irregular, iterable $completionNotes, mixed $promotedNextSemAt): ?string
    {
        $hasAny = false;
        $hasManual = false;
        foreach ($completionNotes as $notes) {
            $hasAny = true;
            $hasManual = $hasManual || self::isManualCompletionNote($notes);
        }

        if ($irregular) {
            return $hasManual ? 'manual' : null;
        }
        if ($hasManual) {
            return 'manual';
        }

        return $hasAny || ! empty($promotedNextSemAt) ? 'auto' : null;
    }
}
