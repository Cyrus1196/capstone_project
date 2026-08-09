<?php

namespace App\Http\Controllers;

use App\Models\SecuritySetting;
use App\Models\TblUser;
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

        $token = AuthUnitHelpers::generateSessionToken($user->user_id);
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
        $maxLen = SecuritySetting::current()->max_password_length;

        $request->validate([
            'email' => ['required', 'email', 'unique:tbl_users,email', AuthUnitHelpers::emailFormatRule()],
            'password' => ['required', 'string', 'max:'.$maxLen, AuthUnitHelpers::passwordStrengthRule()],
            'role_id' => 'required|integer|exists:roles,role_id',
        ]);

        $user = TblUser::create([
            'email' => $request->email,
            'password' => AuthUnitHelpers::hashUserPassword($request->password),
            'role_id' => $request->role_id,
            'status' => 'active',
            'password_changed_at' => now(),
        ]);

        AuthSecurity::clearLoginState($user->fresh());

        $token = AuthUnitHelpers::generateSessionToken($user->user_id);

        return response()->json([
            'access_token' => $token,
            'token_type' => 'Bearer',
            'expires_in' => AuthSecurity::tokenExpiresInSeconds($user->fresh()),
            'user' => [
                'id' => $user->user_id,
                'email' => $user->email,
                'role_id' => $user->role_id,
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
