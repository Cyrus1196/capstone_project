<?php

namespace App\Support;

/**
 * Enrollment lifecycle (separate from academic_status Regular/Irregular).
 */
final class EnrollmentStatus
{
    public const ENROLLED = 'Enrolled';

    public const INACTIVE = 'Inactive';

    public const TRANSFERRED = 'Transferred';

    public const GRADUATE = 'Graduate';

    /** @return list<string> */
    public static function all(): array
    {
        return [
            self::ENROLLED,
            self::INACTIVE,
            self::TRANSFERRED,
            self::GRADUATE,
        ];
    }

    public static function isValid(?string $value): bool
    {
        if ($value === null || trim($value) === '') {
            return false;
        }

        return in_array(self::normalize($value), self::all(), true);
    }

    public static function normalize(?string $value): ?string
    {
        if ($value === null) {
            return null;
        }
        $raw = trim($value);
        if ($raw === '') {
            return null;
        }

        $lower = strtolower($raw);
        return match (true) {
            in_array($lower, ['enrolled', 'enrolled/active', 'active'], true) => self::ENROLLED,
            in_array($lower, ['inactive', 'inactive/stopped', 'stopped', 'not enrolled', 'stop'], true) => self::INACTIVE,
            in_array($lower, ['transferred', 'transfer'], true) => self::TRANSFERRED,
            in_array($lower, ['graduate', 'graduated'], true) => self::GRADUATE,
            default => in_array($raw, self::all(), true) ? $raw : null,
        };
    }

    /** Staff-set statuses that import / term-complete must not overwrite. */
    public static function isProtected(?string $value): bool
    {
        return self::normalize($value) === self::TRANSFERRED;
    }
}
