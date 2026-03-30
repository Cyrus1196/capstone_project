<?php

namespace App\Http\Controllers;

use App\Models\TblUser;
use App\Services\AuthSecurity;
use Illuminate\Http\Request;
use Illuminate\Validation\ValidationException;
use Tymon\JWTAuth\Facades\JWTAuth;

class AuthController extends Controller
{
    /**
     * @return array{user_id: int|string|null, role_id: int|string|null, email: mixed, role: mixed, is_admin: bool, permissions: array<int, string>}
     */
    public static function userPayload(TblUser $user): array
    {
        $permissionNames = $user->permissionNamesForPayload();

        return [
            'user_id' => $user->user_id,
            'role_id' => $user->role_id,
            'email' => $user->email,
            'role' => $user->role ? $user->role->role_name : null,
            'is_admin' => $user->isAdmin(),
            'permissions' => $permissionNames,
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
            throw ValidationException::withMessages([
                'email' => ['The provided credentials are incorrect.'],
            ]);
        }

        AuthSecurity::validateCredentialsForLogin($user, $request->password);

        $token = JWTAuth::fromUser($user);

        return response()->json([
            'user' => self::userPayload($user),
            'access_token' => $token,
            'token_type' => 'Bearer',
            'expires_in' => (int) (config('jwt.ttl', 60) * 60),
            'message' => 'Login successful',
            'security' => AuthSecurity::clientSessionPayload(),
        ]);
    }

    public function logout()
    {
        try {
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
