<?php

namespace App\Services;

use App\Mail\ResetPasswordMail;
use App\Mail\VerifyEmailMail;
use App\Models\TblUser;
use App\Support\CachedSchema;
use Illuminate\Mail\Mailable;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Mail;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Str;

class AccountMailService
{
    public const PURPOSE_VERIFY = 'verify';

    public const PURPOSE_RESET = 'reset';

    public static function canReceiveMail(TblUser $user): bool
    {
        $email = trim((string) $user->email);
        if ($email === '' || ! AuthUnitHelpers::validateEmailFormat($email)) {
            return false;
        }

        $studentId = null;
        try {
            $user->loadMissing('studentProfile');
            $studentId = $user->studentProfile?->student_id_number;
        } catch (\Throwable) {
            // ignore
        }

        return ! StudentAccountEmail::isLoginPlaceholder($email, $studentId);
    }

    public static function isEmailVerified(TblUser $user): bool
    {
        if (! CachedSchema::hasColumn('tbl_users', 'email_verified_at')) {
            return true;
        }

        return $user->email_verified_at !== null;
    }

    /**
     * Block login when MAIL_REQUIRE_VERIFIED=true and the account has an unverified real email.
     */
    public static function mustBlockUnverifiedLogin(TblUser $user): bool
    {
        if (! config('account_mail.require_verified')) {
            return false;
        }

        if (! self::canReceiveMail($user)) {
            return false;
        }

        return ! self::isEmailVerified($user);
    }

    public static function sendVerification(TblUser $user): bool
    {
        if (! self::canReceiveMail($user)) {
            return false;
        }

        $plain = self::issueToken($user, self::PURPOSE_VERIFY, (int) config('account_mail.verify_expire_minutes', 60));
        $url = config('account_mail.frontend_url').'/verify-email?token='.urlencode($plain);

        self::deliver(new VerifyEmailMail($user, $url), (string) $user->email);

        return true;
    }

    public static function sendPasswordReset(TblUser $user): bool
    {
        if (! self::canReceiveMail($user)) {
            return false;
        }

        $plain = self::issueToken($user, self::PURPOSE_RESET, (int) config('account_mail.reset_expire_minutes', 60));
        $url = config('account_mail.frontend_url')
            .'/reset-password?token='.urlencode($plain)
            .'&email='.urlencode((string) $user->email);

        self::deliver(new ResetPasswordMail($user, $url), (string) $user->email);

        return true;
    }

    /**
     * Prefer Brevo HTTPS API on Railway (outbound SMTP often hangs ~60s).
     * Falls back to Laravel mailer (smtp/log). If that fails, fall back to log
     * so forgot-password does not hang or 503 forever on Railway.
     */
    private static function deliver(Mailable $mailable, string $toEmail): void
    {
        $apiKey = trim((string) config('services.brevo.key'));
        if ($apiKey !== '') {
            $rendered = $mailable->render();
            $subject = $mailable->envelope()->subject ?? config('app.name', 'Academic Evaluation System');

            $response = Http::withHeaders([
                'api-key' => $apiKey,
                'accept' => 'application/json',
                'content-type' => 'application/json',
            ])
                ->timeout((int) env('MAIL_TIMEOUT', 12))
                ->post('https://api.brevo.com/v3/smtp/email', [
                    'sender' => [
                        'name' => (string) config('mail.from.name', config('app.name')),
                        'email' => (string) config('mail.from.address'),
                    ],
                    'to' => [
                        ['email' => $toEmail],
                    ],
                    'subject' => $subject,
                    'htmlContent' => $rendered,
                ]);

            if ($response->failed()) {
                throw new \RuntimeException(
                    'Brevo API mail failed ('.$response->status().'): '.$response->body()
                );
            }

            return;
        }

        try {
            Mail::to($toEmail)->send($mailable);
        } catch (\Throwable $e) {
            report($e);
            // Railway often blocks/hangs SMTP; keep the request from failing hard.
            Mail::mailer('log')->to($toEmail)->send($mailable);
        }
    }

    public static function consumeToken(string $plainToken, string $purpose): ?TblUser
    {
        $plainToken = trim($plainToken);
        if ($plainToken === '' || ! Schema::hasTable('tbl_account_email_tokens')) {
            return null;
        }

        $hash = hash('sha256', $plainToken);
        $row = DB::table('tbl_account_email_tokens')
            ->where('token_hash', $hash)
            ->where('purpose', $purpose)
            ->first();

        if (! $row) {
            return null;
        }

        if ($row->expires_at && now()->greaterThan($row->expires_at)) {
            DB::table('tbl_account_email_tokens')->where('id', $row->id)->delete();

            return null;
        }

        $user = TblUser::query()->find($row->user_id);
        DB::table('tbl_account_email_tokens')->where('id', $row->id)->delete();

        return $user ?: null;
    }

    private static function issueToken(TblUser $user, string $purpose, int $expireMinutes): string
    {
        if (! Schema::hasTable('tbl_account_email_tokens')) {
            throw new \RuntimeException('Email token table is missing. Run migrations.');
        }

        DB::table('tbl_account_email_tokens')
            ->where('user_id', $user->user_id)
            ->where('purpose', $purpose)
            ->delete();

        $plain = Str::random(64);
        DB::table('tbl_account_email_tokens')->insert([
            'user_id' => $user->user_id,
            'purpose' => $purpose,
            'token_hash' => hash('sha256', $plain),
            'expires_at' => now()->addMinutes(max(5, $expireMinutes)),
            'created_at' => now(),
        ]);

        return $plain;
    }
}
