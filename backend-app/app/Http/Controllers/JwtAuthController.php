<?php

namespace App\Http\Controllers;

use App\Models\SecuritySetting;
use App\Models\TblUser;
use App\Services\AuthSecurity;
use Illuminate\Http\Request;
use Illuminate\Validation\ValidationException;
use Tymon\JWTAuth\Facades\JWTAuth;

class JwtAuthController extends Controller
{
    public function login(Request $request)
    {
        $request->validate([
            'email' => 'required|email',
            'password' => 'required|string',
        ]);

        $user = TblUser::whereEmail($request->email)->first();

        if (! $user) {
            return response()->json(['error' => 'Invalid credentials'], 401);
        }

        try {
            AuthSecurity::validateCredentialsForLogin($user, $request->password);
        } catch (ValidationException $e) {
            $msg = collect($e->errors())->flatten()->first() ?? 'Login failed';

            return response()->json([
                'error' => $msg,
                'errors' => $e->errors(),
            ], 422);
        }

        $token = JWTAuth::fromUser($user);

        return response()->json([
            'access_token' => $token,
            'token_type' => 'Bearer',
            'expires_in' => (int) (config('jwt.ttl', 60) * 60),
            'user' => [
                'id' => $user->user_id,
                'email' => $user->email,
                'role_id' => $user->role_id,
            ],
            'security' => AuthSecurity::clientSessionPayload(),
        ]);
    }

    public function register(Request $request)
    {
        $maxLen = SecuritySetting::current()->max_password_length;

        $request->validate([
            'email' => 'required|email|unique:tbl_users,email',
            'password' => ['required', 'string', 'min:6', 'max:' . $maxLen],
            'role_id' => 'required|integer|exists:roles,role_id',
        ]);

        $user = TblUser::create([
            'email' => $request->email,
            'password' => $request->password,
            'role_id' => $request->role_id,
            'status' => 'active',
            'password_changed_at' => now(),
        ]);

        $token = JWTAuth::fromUser($user);

        return response()->json([
            'access_token' => $token,
            'token_type' => 'Bearer',
            'expires_in' => (int) (config('jwt.ttl', 60) * 60),
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
     * New token is also set on the response Authorization header by jwt.refresh middleware.
     */
    public function refresh()
    {
        $token = JWTAuth::getToken();
        $access = $token ? $token->get() : '';

        return response()->json([
            'access_token' => $access,
            'token_type' => 'Bearer',
            'expires_in' => (int) (config('jwt.ttl', 60) * 60),
        ]);
    }

    public function logout()
    {
        try {
            JWTAuth::parseToken()->invalidate(true);
        } catch (\Throwable) {
            //
        }

        return response()->json(['message' => 'Successfully logged out']);
    }
}
