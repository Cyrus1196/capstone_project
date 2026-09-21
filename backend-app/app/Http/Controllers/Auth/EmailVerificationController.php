<?php

namespace App\Http\Controllers\Auth;

use App\Http\Controllers\Controller;
use App\Support\CachedSchema;
use App\Services\AccountMailService;
use Illuminate\Http\Request;
use Illuminate\Validation\ValidationException;

class EmailVerificationController extends Controller
{
    /**
     * Public: confirm email via token from the verification link.
     */
    public function verify(Request $request)
    {
        $validated = $request->validate([
            'token' => ['required', 'string'],
        ]);

        $user = AccountMailService::consumeToken($validated['token'], AccountMailService::PURPOSE_VERIFY);
        if (! $user) {
            throw ValidationException::withMessages([
                'token' => ['This verification link is invalid or has expired.'],
            ]);
        }

        if (CachedSchema::hasColumn('tbl_users', 'email_verified_at')) {
            $user->email_verified_at = now();
            $user->save();
        }

        return response()->json([
            'message' => 'Email verified successfully. You can sign in.',
        ]);
    }

    /**
     * Public: resend verification (generic response). Accepts email or student ID.
     */
    public function resend(Request $request)
    {
        $validated = $request->validate([
            'email' => ['required', 'string', 'max:255'],
        ]);

        $user = AuthController::findUserByLogin(trim($validated['email']));

        if ($user && AccountMailService::canReceiveMail($user) && ! AccountMailService::isEmailVerified($user)) {
            try {
                AccountMailService::sendVerification($user);
            } catch (\Throwable $e) {
                report($e);

                return response()->json([
                    'message' => 'Unable to send email right now. Please try again later or contact an administrator.',
                ], 503);
            }
        }

        return response()->json([
            'message' => 'If that account needs verification, a new link has been sent.',
        ]);
    }

    /**
     * Authenticated: send verification to the current user's email.
     */
    public function sendForCurrentUser(Request $request)
    {
        $user = $request->user();
        if (! $user) {
            return response()->json(['message' => 'Unauthorized'], 401);
        }

        if (! AccountMailService::canReceiveMail($user)) {
            return response()->json([
                'message' => 'This account does not have a real contact email. Ask an administrator to add one.',
            ], 422);
        }

        if (AccountMailService::isEmailVerified($user)) {
            return response()->json(['message' => 'Email is already verified.']);
        }

        try {
            AccountMailService::sendVerification($user);
        } catch (\Throwable $e) {
            report($e);

            return response()->json([
                'message' => 'Unable to send email right now. Please try again later.',
            ], 503);
        }

        return response()->json(['message' => 'Verification email sent.']);
    }
}
