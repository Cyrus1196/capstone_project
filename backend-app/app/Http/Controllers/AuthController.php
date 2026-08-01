<?php

namespace App\Http\Controllers;

use App\Models\TblUser;
use App\Services\AuthSecurity;
use App\Services\UserSessionLogger;
use Illuminate\Http\Request;
use Illuminate\Validation\ValidationException;
use Tymon\JWTAuth\Facades\JWTAuth;

class AuthController extends Controller
{
    /**
     * @return array{user_id: int|string|null, role_id: int|string|null, email: mixed, role: mixed, is_admin: bool, permissions: array<int, string>, evaluation_year_level_ids: list<int>|null}
     */
    public static function userPayload(TblUser $user): array
    {
        $permissionNames = $user->permissionNamesForPayload();

        return [
            'user_id' => $user->user_id,
            'role_id' => $user->role_id,
            'email' => $user->email,
            'contact_number' => $user->contact_number,
            'role' => $user->role ? $user->role->role_name : null,
            'department_id' => $user->department_id,
            'department' => $user->department ? [
                'department_id' => $user->department->department_id,
                'department_name' => $user->department->department_name,
                'department_code' => $user->department->department_code,
            ] : null,
            'program_id' => $user->program_id,
            'program' => $user->program ? [
                'program_id' => $user->program->program_id,
                'program_name' => $user->program->program_name,
                'program_code' => $user->program->program_code,
            ] : null,
            'is_admin' => $user->isAdmin(),
            'permissions' => $permissionNames,
            /** null = all year levels; array of year_level_id = restricted (curriculum evaluation roster). */
            'evaluation_year_level_ids' => $user->effectiveEvaluationYearLevelIds(),
        ];
    }

    public function login(Request $request)
    {
        $request->validate([
            'email' => 'required|email',
            'password' => 'required',
        ]);

        $user = TblUser::whereEmail($request->email)->first();

        if (! $user) {
            UserSessionLogger::logFailedLogin($request, $request->email, 'User not found');
            throw ValidationException::withMessages([
                'email' => ['The provided credentials are incorrect.'],
            ]);
        }

        try {
            AuthSecurity::validateCredentialsForLogin($user, $request->password);
        } catch (ValidationException $e) {
            $reason = collect($e->errors())->flatten()->first() ?? 'Login failed';
            UserSessionLogger::logFailedLogin($request, $request->email, $reason);
            throw $e;
        }

        $token = JWTAuth::fromUser($user);
        UserSessionLogger::logSuccessfulLogin($request, $user, $token);

        return response()->json([
            'user' => self::userPayload($user),
            'access_token' => $token,
            'token_type' => 'Bearer',
            'expires_in' => (int) (config('jwt.ttl', 60) * 60),
            'message' => 'Login successful',
            'security' => AuthSecurity::clientSessionPayload(),
        ]);
    }

    public function logout(Request $request)
    {
        $tokenValue = null;
        $user = $request->user();

        try {
            $token = JWTAuth::getToken();
            $tokenValue = $token ? $token->get() : null;
            UserSessionLogger::logLogout($request, $user, $tokenValue);
            JWTAuth::parseToken()->invalidate(true);
        } catch (\Throwable) {
            // Token missing or already invalid
        }

        return response()->json(['message' => 'Logged out successfully']);
    }

    public function user(Request $request)
    {
        try {
            $user = $request->user();

            if (!$user) {
                return response()->json(['user' => null], 401);
            }

            return response()->json([
                'user' => self::userPayload($user),
                'security' => AuthSecurity::clientSessionPayload(),
            ]);
        } catch (\Exception $e) {
            return response()->json(['error' => 'Failed to get user', 'message' => $e->getMessage()], 500);
        }
    }
}
