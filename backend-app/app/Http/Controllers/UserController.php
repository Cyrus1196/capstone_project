<?php

namespace App\Http\Controllers;

use App\Models\SecuritySetting;
use App\Models\TblUser;
use App\Models\Role;
use App\Models\DeanProfile;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;
use Illuminate\Validation\Rule;
use Illuminate\Support\Facades\DB;

class UserController extends Controller
{

    public function index(Request $request)
    {
        try {
            if (! $request->user()->canManageUsers()) {
                return response()->json(['message' => 'Unauthorized'], 403);
            }

            $users = TblUser::with(['role', 'deanProfile.program', 'studentProfile.program'])->get();

            return response()->json($users);
        } catch (\Exception $e) {
            return response()->json(['error' => 'Failed to fetch users', 'message' => $e->getMessage()], 500);
        }
    }

    public function store(Request $request)
    {
        if (! $request->user()->canManageUsers()) {
            return response()->json(['message' => 'Unauthorized'], 403);
        }

        $maxLen = SecuritySetting::current()->max_password_length;

        $validated = $request->validate([
            'email' => 'required|email|unique:tbl_users,email',
            'password' => ['required', 'string', 'min:6', 'max:' . $maxLen],
            'contact_number' => 'nullable|string|max:20',
            'role_id' => 'required|exists:tbl_roles,role_id',
            'status' => 'nullable|string|max:50',
            'program_id' => 'nullable|exists:tbl_program,program_id', // For dean profile
        ]);

        DB::beginTransaction();
        try {
            // Debug: Log the incoming data
            \Log::info('Creating user with data:', $validated);
            
            $user = TblUser::create([
                'email' => $validated['email'],
                'password' => Hash::make($validated['password']),
                'contact_number' => $validated['contact_number'] ?? null,
                'role_id' => $validated['role_id'],
                'status' => $validated['status'] ?? 'active',
                'password_changed_at' => now(),
            ]);

            $user->load('role');

            // If dean role and program_id provided, create dean profile
            $role = Role::find($validated['role_id']);
            \Log::info('Found role:', ['role' => $role ? $role->toArray() : 'null']);
            \Log::info('Role name:', ['role_name' => $role ? $role->role_name : 'no role found']);
            
            if ($role && $role->role_name === 'Dean') {
                \Log::info('Creating dean profile for user:', ['user_id' => $user->user_id]);
                \Log::info('With program_id:', ['program_id' => $validated['program_id']]);
                
                if (!isset($validated['program_id']) || !$validated['program_id']) {
                    DB::rollBack();
                    return response()->json(['error' => 'Failed to create user', 'message' => 'Program ID is required for Dean users.'], 422);
                }
                
                try {
                    DeanProfile::create([
                        'user_id' => $user->user_id,
                        'program_id' => (int)$validated['program_id'],
                    ]);
                    \Log::info('Dean profile created successfully');
                } catch (\Exception $deanError) {
                    \Log::error('Failed to create dean profile: ' . $deanError->getMessage());
                    DB::rollBack();
                    return response()->json(['error' => 'Failed to create user', 'message' => 'Failed to create dean profile: ' . $deanError->getMessage()], 500);
                }
            } else {
                \Log::info('Skipping dean profile creation - role is not Dean');
            }

            DB::commit();
            return response()->json($user, 201);
        } catch (\Exception $e) {
            DB::rollBack();
            return response()->json(['error' => 'Failed to create user', 'message' => $e->getMessage()], 500);
        }
    }

    public function show(Request $request, $id)
    {
        if (! $request->user()->canManageUsers()) {
            return response()->json(['message' => 'Unauthorized'], 403);
        }

        $user = TblUser::with(['role', 'deanProfile.program', 'studentProfile.program'])->findOrFail($id);

        return response()->json($user);
    }

    public function update(Request $request, $id)
    {
        // Check if user is admin
        if (!$request->user()->isAdmin()) {
            return response()->json(['message' => 'Unauthorized'], 403);
        }

        $user = TblUser::findOrFail($id);

        $validated = $request->validate([
            'email' => ['required', 'email', Rule::unique('tbl_users', 'email')->ignore($user->user_id, 'user_id')],
            'password' => 'nullable|min:6',
            'contact_number' => 'nullable|string|max:20',
            'role_id' => 'required|exists:tbl_roles,role_id',
            'status' => 'nullable|string|max:50',
            'program_id' => 'nullable|exists:tbl_program,program_id', // For dean profile
        ]);

        DB::beginTransaction();
        try {
            $user->email = $validated['email'];
            $user->contact_number = $validated['contact_number'] ?? null;
            $user->role_id = $validated['role_id'];
            $user->status = $validated['status'] ?? $user->status;

            if (isset($validated['password'])) {
                $user->password = Hash::make($validated['password']);
                $user->password_changed_at = now();
            }

            $user->save();
            $user->load('role');

            // Handle dean profile
            $role = Role::find($validated['role_id']);
            $isDean = $role && $role->role_name === 'Dean';
            
            if ($isDean && isset($validated['program_id']) && $validated['program_id']) {
                // Update or create dean profile
                $deanProfile = DeanProfile::where('user_id', $user->user_id)->first();
                if ($deanProfile) {
                    $deanProfile->program_id = $validated['program_id'];
                    $deanProfile->save();
                } else {
                    DeanProfile::create([
                        'user_id' => $user->user_id,
                        'program_id' => $validated['program_id'],
                    ]);
                }
            } elseif (!$isDean) {
                // If role changed from dean, delete dean profile
                DeanProfile::where('user_id', $user->user_id)->delete();
            }

            DB::commit();
            return response()->json($user);
        } catch (\Exception $e) {
            DB::rollBack();
            return response()->json(['error' => 'Failed to update user', 'message' => $e->getMessage()], 500);
        }
    }

    public function destroy(Request $request, $id)
    {
        if (! $request->user()->canManageUsers()) {
            return response()->json(['message' => 'Unauthorized'], 403);
        }

        $user = TblUser::findOrFail($id);
        $user->delete();

        return response()->json(['message' => 'User deleted successfully']);
    }

    public function roles(Request $request)
    {
        try {
            if (! $request->user()->canManageUsers()) {
                return response()->json(['message' => 'Unauthorized'], 403);
            }

            $roles = Role::all();

            return response()->json($roles);
        } catch (\Exception $e) {
            return response()->json(['error' => 'Failed to fetch roles', 'message' => $e->getMessage()], 500);
        }
    }
}

