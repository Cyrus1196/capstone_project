<?php

namespace App\Http\Controllers;

use App\Models\TblUser;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Hash;
use Illuminate\Validation\ValidationException;

class AuthController extends Controller
{
    public function login(Request $request)
    {
        $request->validate([
            'email' => 'required|email',
            'password' => 'required',
        ]);

        $user = TblUser::whereEmail($request->email)->first();

        if (!$user || !Hash::check($request->password, $user->password)) {
            throw ValidationException::withMessages([
                'email' => ['The provided credentials are incorrect.'],
            ]);
        }

        if ($user->status !== 'active' && $user->status !== null) {
            throw ValidationException::withMessages([
                'email' => ['Your account is not active.'],
            ]);
        }

        Auth::login($user);

        $request->session()->regenerate();

        $user->loadMissing('role.permissions');
        $permissionNames = $user->role
            ? $user->role->permissions->pluck('permission_name')->values()->all()
            : [];

        return response()->json([
            'user' => [
                'user_id' => $user->user_id,
                'email' => $user->email,
                'role' => $user->role ? $user->role->role_name : null,
                'is_admin' => $user->isAdmin(),
                'permissions' => $permissionNames,
            ],
            'message' => 'Login successful',
        ]);
    }

    public function logout(Request $request)
    {
        Auth::logout();

        $request->session()->invalidate();
        $request->session()->regenerateToken();

        return response()->json(['message' => 'Logged out successfully']);
    }

    public function user(Request $request)
    {
        try {
            $user = $request->user();
            
            if (!$user) {
                return response()->json(['user' => null], 401);
            }

            $user->loadMissing('role.permissions');
            $permissionNames = $user->role
                ? $user->role->permissions->pluck('permission_name')->values()->all()
                : [];

            return response()->json([
                'user' => [
                    'user_id' => $user->user_id,
                    'email' => $user->email,
                    'role' => $user->role ? $user->role->role_name : null,
                    'is_admin' => $user->isAdmin(),
                    'permissions' => $permissionNames,
                ],
            ]);
        } catch (\Exception $e) {
            return response()->json(['error' => 'Failed to get user', 'message' => $e->getMessage()], 500);
        }
    }
}

