<?php

namespace App\Http\Controllers;

use App\Models\SecuritySetting;
use Illuminate\Http\Request;

class SecuritySettingsController extends Controller
{
    public function show(Request $request)
    {
        if (! $request->user()?->canManageSecuritySettings()) {
            return response()->json(['message' => 'Unauthorized'], 403);
        }

        return response()->json(SecuritySetting::current()->toPublicArray());
    }

    public function update(Request $request)
    {
        if (! $request->user()?->canManageSecuritySettings()) {
            return response()->json(['message' => 'Unauthorized'], 403);
        }

        $validated = $request->validate([
            'max_password_length' => 'required|integer|min:6|max:256',
            'password_expiry_days' => 'required|integer|min:0|max:3650',
            'session_timeout_minutes' => 'required|integer|min:1|max:10080',
            'lockout_attempts' => 'required|integer|min:1|max:50',
            'lockout_duration_minutes' => 'required|integer|min:1|max:1440',
        ]);

        $row = SecuritySetting::current();
        $row->fill($validated);
        $row->save();

        return response()->json($row->toPublicArray());
    }
}
