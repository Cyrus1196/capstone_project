<?php

namespace App\Http\Controllers;

use App\Models\Role;
use App\Models\Permission;
use App\Models\RolePermission;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class RoleController extends Controller
{
    /**
     * Get all roles with their permissions
     */
    public function index(Request $request)
    {
        try {
            if (!$request->user() || !$request->user()->isAdmin()) {
                return response()->json(['message' => 'Unauthorized'], 403);
            }

            $roles = Role::with(['permissions'])->get();
            return response()->json($roles);
        } catch (\Exception $e) {
            return response()->json([
                'error' => 'Failed to fetch roles',
                'message' => $e->getMessage()
            ], 500);
        }
    }

    /**
     * Get single role with permissions
     */
    public function show(Request $request, $id)
    {
        try {
            if (!$request->user() || !$request->user()->isAdmin()) {
                return response()->json(['message' => 'Unauthorized'], 403);
            }

            $role = Role::with(['permissions'])->findOrFail($id);
            return response()->json($role);
        } catch (\Exception $e) {
            return response()->json([
                'error' => 'Failed to fetch role',
                'message' => $e->getMessage()
            ], 500);
        }
    }

    /**
     * Create new role
     */
    public function store(Request $request)
    {
        try {
            if (!$request->user() || !$request->user()->isAdmin()) {
                return response()->json(['message' => 'Unauthorized'], 403);
            }

            $validated = $request->validate([
                'role_name' => 'required|string|max:100|unique:tbl_roles,role_name',
                'access_level' => 'nullable|integer|min:1|max:10',
                'description' => 'nullable|string',
                'permission_ids' => 'nullable|array',
                'permission_ids.*' => 'integer|exists:tbl_permission,permission_id',
            ]);

            DB::beginTransaction();

            // Create role
            $role = Role::create([
                'role_name' => $validated['role_name'],
                'access_level' => $validated['access_level'] ?? 5,
                'description' => $validated['description'] ?? null,
            ]);

            // Attach permissions if provided
            if (!empty($validated['permission_ids'])) {
                $rolePermissions = [];
                foreach ($validated['permission_ids'] as $permissionId) {
                    $rolePermissions[] = [
                        'role_id' => $role->role_id,
                        'permission_id' => $permissionId,
                    ];
                }
                RolePermission::insert($rolePermissions);
            }

            DB::commit();

            return response()->json([
                'message' => 'Role created successfully',
                'role' => $role->load('permissions')
            ], 201);
        } catch (\Exception $e) {
            DB::rollBack();
            return response()->json([
                'error' => 'Failed to create role',
                'message' => $e->getMessage()
            ], 500);
        }
    }

    /**
     * Update role
     */
    public function update(Request $request, $id)
    {
        try {
            if (!$request->user() || !$request->user()->isAdmin()) {
                return response()->json(['message' => 'Unauthorized'], 403);
            }

            $role = Role::findOrFail($id);

            // Prevent modifying Admin role name
            if ($role->role_name === 'Admin' && $request->has('role_name') && $request->role_name !== 'Admin') {
                return response()->json([
                    'error' => 'Cannot modify Admin role name'
                ], 403);
            }

            $validated = $request->validate([
                'role_name' => 'sometimes|string|max:100|unique:tbl_roles,role_name,' . $id . ',role_id',
                'access_level' => 'nullable|integer|min:1|max:10',
                'description' => 'nullable|string',
                'permission_ids' => 'nullable|array',
                'permission_ids.*' => 'integer|exists:tbl_permission,permission_id',
            ]);

            DB::beginTransaction();

            // Update role details
            $role->update([
                'role_name' => $validated['role_name'] ?? $role->role_name,
                'access_level' => $validated['access_level'] ?? $role->access_level,
                'description' => $validated['description'] ?? $role->description,
            ]);

            // Sync permissions if provided
            if (isset($validated['permission_ids'])) {
                RolePermission::where('role_id', $role->role_id)->delete();
                
                if (!empty($validated['permission_ids'])) {
                    $rolePermissions = [];
                    foreach ($validated['permission_ids'] as $permissionId) {
                        $rolePermissions[] = [
                            'role_id' => $role->role_id,
                            'permission_id' => $permissionId,
                        ];
                    }
                    RolePermission::insert($rolePermissions);
                }
            }

            DB::commit();

            return response()->json([
                'message' => 'Role updated successfully',
                'role' => $role->fresh()->load('permissions')
            ]);
        } catch (\Exception $e) {
            DB::rollBack();
            return response()->json([
                'error' => 'Failed to update role',
                'message' => $e->getMessage()
            ], 500);
        }
    }

    /**
     * Delete role
     */
    public function destroy(Request $request, $id)
    {
        try {
            if (!$request->user() || !$request->user()->isAdmin()) {
                return response()->json(['message' => 'Unauthorized'], 403);
            }

            $role = Role::findOrFail($id);

            // Prevent deleting Admin role
            if ($role->role_name === 'Admin') {
                return response()->json([
                    'error' => 'Cannot delete Admin role'
                ], 403);
            }

            // Check if role has users
            $userCount = $role->users()->count();
            if ($userCount > 0) {
                return response()->json([
                    'error' => 'Cannot delete role with assigned users',
                    'message' => "This role has {$userCount} user(s) assigned. Reassign users first."
                ], 400);
            }

            DB::beginTransaction();

            // Delete role permissions first
            RolePermission::where('role_id', $role->role_id)->delete();
            
            // Delete role
            $role->delete();

            DB::commit();

            return response()->json([
                'message' => 'Role deleted successfully'
            ]);
        } catch (\Exception $e) {
            DB::rollBack();
            return response()->json([
                'error' => 'Failed to delete role',
                'message' => $e->getMessage()
            ], 500);
        }
    }

    /**
     * Get role statistics
     */
    public function statistics(Request $request)
    {
        try {
            if (!$request->user() || !$request->user()->isAdmin()) {
                return response()->json(['message' => 'Unauthorized'], 403);
            }

            $roles = Role::withCount('users')->get();
            
            $stats = [
                'total_roles' => $roles->count(),
                'roles_with_users' => $roles->where('users_count', '>', 0)->count(),
                'roles_without_users' => $roles->where('users_count', 0)->count(),
                'role_details' => $roles->map(function ($role) {
                    return [
                        'role_id' => $role->role_id,
                        'role_name' => $role->role_name,
                        'user_count' => $role->users_count,
                        'permission_count' => $role->permissions()->count(),
                    ];
                }),
            ];

            return response()->json($stats);
        } catch (\Exception $e) {
            return response()->json([
                'error' => 'Failed to fetch role statistics',
                'message' => $e->getMessage()
            ], 500);
        }
    }
}
