<?php

namespace App\Http\Controllers\Auth;

use App\Http\Controllers\Controller;
use App\Models\SecuritySetting;
use App\Models\TblUser;
use App\Services\AccountMailService;
use App\Services\AuthSecurity;
use App\Services\AuthUnitHelpers;
use App\Services\UserSessionLogger;
use Illuminate\Http\Request;
use Illuminate\Validation\ValidationException;
use Tymon\JWTAuth\Facades\JWTAuth;

class JwtAuthController extends Controller
{
    public function login(Request $request)
    {
        $request->validate([
            'email' => ['required', 'string', 'max:255'],
            'password' => 'required|string',
        ]);

        $login = trim((string) $request->email);
        $user = AuthController::findUserByLogin($login);

        if (! $user) {
            UserSessionLogger::logFailedLogin($request, $login, 'User not found');

            return response()->json(['error' => 'Invalid credentials'], 401);
        }

        try {
            AuthSecurity::validateCredentialsForLogin($user, $request->password);
        } catch (ValidationException $e) {
            $msg = collect($e->errors())->flatten()->first() ?? 'Login failed';
            UserSessionLogger::logFailedLogin($request, $login, $msg);

            return response()->json([
                'error' => $msg,
                'errors' => $e->errors(),
            ], 422);
        }

        if (AccountMailService::mustBlockUnverifiedLogin($user)) {
            UserSessionLogger::logFailedLogin($request, $login, 'Email not verified');
            try {
                AccountMailService::sendVerification($user);
            } catch (\Throwable $e) {
                report($e);
            }

            return response()->json([
                'error' => 'Please verify your email before signing in. We sent a new verification link if mail is available.',
                'errors' => [
                    'email' => [
                        'Please verify your email before signing in. We sent a new verification link if mail is available.',
                    ],
                ],
            ], 422);
        }

        $token = AuthUnitHelpers::generateSessionTokenForUser($user);
        UserSessionLogger::logSuccessfulLogin($request, $user, $token);

        return response()->json([
            'access_token' => $token,
            'token_type' => 'Bearer',
            'expires_in' => AuthSecurity::tokenExpiresInSeconds($user),
            'user' => AuthController::userPayload($user),
            'security' => AuthSecurity::clientSessionPayload(),
        ]);
    }

    public function register(Request $request)
    {
        $settings = SecuritySetting::current();
        $maxLen = $settings->maxPasswordLength();

        $request->validate([
            'email' => ['required', 'email', 'unique:tbl_users,email', AuthUnitHelpers::emailFormatRule()],
            'password' => ['required', 'string', 'min:'.$settings->minPasswordLength(), 'max:'.$maxLen, AuthUnitHelpers::passwordStrengthRule()],
            'role_id' => 'required|integer|exists:roles,role_id',
        ]);

        $user = TblUser::create([
            'email' => $request->email,
            'password' => AuthUnitHelpers::hashUserPassword($request->password),
            'role_id' => $request->role_id,
            'status' => 'active',
            'password_changed_at' => now(),
        ]);

        $fresh = $user->fresh();
        AuthSecurity::clearLoginState($fresh);

        $token = AuthUnitHelpers::generateSessionTokenForUser($fresh);

        return response()->json([
            'access_token' => $token,
            'token_type' => 'Bearer',
            'expires_in' => AuthSecurity::tokenExpiresInSeconds($fresh),
            'user' => [
                'id' => $fresh->user_id,
                'email' => $fresh->email,
                'role_id' => $fresh->role_id,
            ],
        ], 201);
    }

    public function me(Request $request)
    {
        $user = $request->user();

        return response()->json([
            'user' => AuthController::userPayload($user),
            'security' => AuthSecurity::clientSessionPayload(),
        ]);
    }

    /**
     * Refresh access token. JWT TTL matches Security Settings session timeout
     * (same window the frontend uses for idle logout).
     */
    public function refresh()
    {
        try {
            JWTAuth::parseToken();
            // Allow reading claims from an expired access token within refresh_ttl.
            JWTAuth::manager()->setRefreshFlow(true);
            $payload = JWTAuth::manager()->decode(JWTAuth::getToken());
            $user = TblUser::query()->find($payload->get('sub'));

            AuthSecurity::applyJwtTtlForUser($user);

            $token = JWTAuth::parseToken()->refresh();

            return response()->json([
                'access_token' => $token,
                'token_type' => 'Bearer',
                'expires_in' => AuthSecurity::tokenExpiresInSeconds($user),
                'security' => AuthSecurity::clientSessionPayload(),
            ]);
        } catch (\Throwable $e) {
            return response()->json([
                'error' => 'Could not refresh token',
                'message' => $e->getMessage(),
            ], 401);
        }
    }

    public function logout(Request $request)
    {
        try {
            $token = JWTAuth::getToken();
            UserSessionLogger::logLogout($request, $request->user(), $token ? $token->get() : null);
            JWTAuth::parseToken()->invalidate(true);
        } catch (\Throwable) {
            //
        }

        return response()->json(['message' => 'Successfully logged out']);
    }
}
