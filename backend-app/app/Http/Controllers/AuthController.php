<?php

namespace App\Http\Controllers;

use App\Models\TblUser;
use App\Services\AuthSecurity;
use App\Services\AuthUnitHelpers;
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
            /** Students created with default password must change it before using the portal. */
            'must_change_password' => $user->password_changed_at === null,
        ];
    }

    /**
     * Resolve login by email/username or student ID number.
     */
    public static function findUserByLogin(string $login): ?TblUser
    {
        $login = trim($login);
        if ($login === '') {
            return null;
        }

        $user = TblUser::whereEmail($login)->first();
        if ($user) {
            return $user;
        }

        return TblUser::query()
            ->whereHas('studentProfile', function ($q) use ($login) {
                $q->where('student_id_number', $login);
            })
            ->first();
    }

    public function login(Request $request)
    {
        $request->validate([
            'email' => ['required', 'string', 'max:255'],
            'password' => 'required',
        ]);

        $login = trim((string) $request->email);
        $user = self::findUserByLogin($login);

        if (! $user) {
            UserSessionLogger::logFailedLogin($request, $login, 'User not found');
            throw ValidationException::withMessages([
                'email' => ['The provided credentials are incorrect.'],
            ]);
        }

        try {
            AuthSecurity::validateCredentialsForLogin($user, $request->password);
        } catch (ValidationException $e) {
            $reason = collect($e->errors())->flatten()->first() ?? 'Login failed';
            UserSessionLogger::logFailedLogin($request, $login, $reason);
            throw $e;
        }

        $token = AuthUnitHelpers::generateSessionToken($user->user_id);
        UserSessionLogger::logSuccessfulLogin($request, $user, $token);

        return response()->json([
            'user' => self::userPayload($user),
            'access_token' => $token,
            'token_type' => 'Bearer',
            'expires_in' => AuthSecurity::tokenExpiresInSeconds($user),
            'message' => 'Login successful',
            'security' => AuthSecurity::clientSessionPayload(),
        ]);
    }

    public function changePassword(Request $request)
    {
        $user = $request->user();
        if (! $user) {
            return response()->json(['message' => 'Unauthorized'], 401);
        }

        $maxLen = \App\Models\SecuritySetting::current()->max_password_length;

        $validated = $request->validate([
            'current_password' => 'required|string',
            'password' => ['required', 'string', 'max:'.$maxLen, 'confirmed', AuthUnitHelpers::passwordStrengthRule()],
        ]);

        if (! AuthUnitHelpers::verifyPasswordMatch($validated['current_password'], (string) $user->password)) {
            throw ValidationException::withMessages([
                'current_password' => ['The current password is incorrect.'],
            ]);
        }

        $user->password = AuthUnitHelpers::hashUserPassword($validated['password']);
        $user->password_changed_at = now();
        $user->save();

        return response()->json([
            'message' => 'Password updated successfully',
            'user' => self::userPayload($user->fresh(['role', 'department', 'program'])),
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
