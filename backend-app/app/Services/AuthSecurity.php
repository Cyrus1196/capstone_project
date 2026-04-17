<?php

namespace App\Services;

use App\Models\SecuritySetting;
use App\Models\TblUser;
use Illuminate\Support\Facades\Hash;
use Illuminate\Validation\ValidationException;

class AuthSecurity
{
    public static function clientSessionPayload(): array
    {
        $s = SecuritySetting::current();

        return [
            'session_timeout_minutes' => (int) $s->session_timeout_minutes,
            'student_session_timeout_minutes' => (int) ($s->student_session_timeout_minutes ?? $s->session_timeout_minutes),
        ];
    }

    /**
     * @throws ValidationException
     */
    public static function validateCredentialsForLogin(TblUser $user, string $plainPassword): void
    {
        $settings = SecuritySetting::current();

        if ($user->locked_until && $user->locked_until->isFuture()) {
            throw ValidationException::withMessages([
                'email' => ['This account is temporarily locked. Try again later.'],
            ]);
        }

        if (! Hash::check($plainPassword, $user->password)) {
            self::recordFailedLogin($user, $settings);
            $user->refresh();

            $maxAttempts = max(1, (int) $settings->lockout_attempts);
            $failed = (int) $user->failed_login_attempts;
            $remaining = max(0, $maxAttempts - $failed);

            $base = 'The provided credentials are incorrect.';
            if ($user->locked_until && $user->locked_until->isFuture()) {
                $detail = ' Your account has been temporarily locked due to too many failed attempts.';
            } elseif ($remaining > 0) {
                $word = $remaining === 1 ? 'attempt' : 'attempts';
                $detail = sprintf(' You have %d %s remaining before your account is temporarily locked.', $remaining, $word);
            } else {
                $detail = '';
            }

            throw ValidationException::withMessages([
                'email' => [$base . $detail],
            ]);
        }

        if ($user->status !== 'active' && $user->status !== null) {
            throw ValidationException::withMessages([
                'email' => ['Your account is not active.'],
            ]);
        }

        $days = (int) $settings->password_expiry_days;
        if ($days > 0 && $user->password_changed_at) {
            if ($user->password_changed_at->copy()->addDays($days)->isPast()) {
                throw ValidationException::withMessages([
                    'email' => ['Your password has expired. Contact an administrator to reset it.'],
                ]);
            }
        }

        self::clearLoginState($user);
    }

    public static function clearLoginState(TblUser $user): void
    {
        $user->failed_login_attempts = 0;
        $user->locked_until = null;
        $user->save();
    }

    protected static function recordFailedLogin(TblUser $user, SecuritySetting $settings): void
    {
        $attempts = (int) $user->failed_login_attempts + 1;
        $user->failed_login_attempts = $attempts;
        $maxAttempts = max(1, (int) $settings->lockout_attempts);
        if ($attempts >= $maxAttempts) {
            $user->locked_until = now()->addMinutes(max(1, (int) $settings->lockout_duration_minutes));
        }
        $user->save();
    }
}
