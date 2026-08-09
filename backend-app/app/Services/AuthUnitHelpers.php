<?php

namespace App\Services;

/**
 * Level 1 Master Unit Testing Registry — Series 100
 * User Authentication, Security & Session Management (UT-101 … UT-106).
 *
 * Pure, isolatable helpers used by auth flows and unit tests.
 */
class AuthUnitHelpers
{
    /** Minimum password length for UT-102 strength policy. */
    public const PASSWORD_MIN_LENGTH = 8;

    /**
     * UT-101 — Reject structurally invalid emails (e.g. test@com, @@domain.com).
     */
    public static function validateEmailFormat(string $email): bool
    {
        $email = trim($email);

        if ($email === '' || ! filter_var($email, FILTER_VALIDATE_EMAIL)) {
            return false;
        }

        // Require a dotted domain so bare TLDs like test@com are rejected.
        return (bool) preg_match('/^[^@\s]+@[^@\s]+\.[^@\s]+$/', $email);
    }

    /**
     * UT-102 — Password must be at least 8 characters and include a special character.
     */
    public static function validatePasswordStrength(string $pwd): bool
    {
        if (strlen($pwd) < self::PASSWORD_MIN_LENGTH) {
            return false;
        }

        return (bool) preg_match('/[^A-Za-z0-9]/', $pwd);
    }

    /**
     * UT-103 — Hash a plaintext password with BCrypt (60+ character salt hash).
     */
    public static function hashUserPassword(string $plainText): string
    {
        $hash = password_hash($plainText, PASSWORD_BCRYPT);

        if ($hash === false) {
            throw new \RuntimeException('Failed to hash password.');
        }

        return $hash;
    }

    /**
     * UT-104 — Verify a plaintext password against a stored hash.
     */
    public static function verifyPasswordMatch(string $plain, string $hash): bool
    {
        if ($hash === '') {
            return false;
        }

        return password_verify($plain, $hash);
    }

    /**
     * UT-105 — Generate a structured session token for a user id.
     * Prefer JWT when a user record is available; otherwise a secure signed payload.
     * JWT lifetime follows Security Settings session timeout (via AuthSecurity).
     */
    public static function generateSessionToken(int|string $userId): string
    {
        if (class_exists(\Tymon\JWTAuth\Facades\JWTAuth::class)
            && class_exists(\App\Models\TblUser::class)
        ) {
            try {
                $user = \App\Models\TblUser::query()->find($userId);
                if ($user) {
                    return AuthSecurity::issueTokenForUser($user);
                }
            } catch (\Throwable) {
                // Fall through for isolated unit tests without DB / JWT config.
            }
        }

        $ttlSeconds = 60 * 60;
        try {
            if (class_exists(AuthSecurity::class)) {
                $ttlSeconds = AuthSecurity::tokenExpiresInSeconds(null);
            }
        } catch (\Throwable) {
            //
        }

        $payload = [
            'sub' => (string) $userId,
            'iat' => time(),
            'exp' => time() + $ttlSeconds,
            'jti' => bin2hex(random_bytes(16)),
        ];

        $body = rtrim(strtr(base64_encode(json_encode($payload)), '+/', '-_'), '=');
        $sig = hash_hmac('sha256', $body, self::tokenSigningKey());

        return $body.'.'.$sig;
    }

    /**
     * UT-106 — True when the expiry timestamp is older than current server time.
     */
    public static function isTokenExpired(int $timestamp): bool
    {
        return $timestamp < time();
    }

    /**
     * Laravel validation closure for password strength (register / create / update).
     *
     * @return \Closure(string, mixed, \Closure): void
     */
    public static function passwordStrengthRule(): \Closure
    {
        return function (string $attribute, mixed $value, \Closure $fail): void {
            // Allow omitted password on optional update fields (paired with `nullable`).
            if ($value === null || $value === '') {
                return;
            }

            if (! is_string($value) || ! self::validatePasswordStrength($value)) {
                $fail('The password must be at least 8 characters and include a special character.');
            }
        };
    }

    /**
     * Laravel validation closure for email format (UT-101).
     *
     * @return \Closure(string, mixed, \Closure): void
     */
    public static function emailFormatRule(): \Closure
    {
        return function (string $attribute, mixed $value, \Closure $fail): void {
            if (! is_string($value) || ! self::validateEmailFormat($value)) {
                $fail('The email format is invalid.');
            }
        };
    }

    protected static function tokenSigningKey(): string
    {
        if (function_exists('config')) {
            try {
                $key = (string) config('app.key', '');
                if ($key !== '') {
                    return $key;
                }
            } catch (\Throwable) {
                //
            }
        }

        return 'capstone-unit-test-signing-key';
    }
}
