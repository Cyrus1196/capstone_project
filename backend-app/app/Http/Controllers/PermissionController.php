<?php

namespace App\Http\Controllers;

use App\Models\Permission;
use App\Models\RolePermission;
use Illuminate\Http\Request;

class PermissionController extends Controller
{
    public function index(Request $request)
    {
        try {
            if (!$request->user() || !$request->user()->isAdmin()) {
                return response()->json(['message' => 'Unauthorized'], 403);
            }

            $permissions = Permission::with('roles')->get();
            return response()->json($permissions);
        } catch (\Exception $e) {
            return response()->json(['error' => 'Failed to fetch permissions', 'message' => $e->getMessage()], 500);
        }
    }

    public function store(Request $request)
    {
        try {
            if (!$request->user() || !$request->user()->isAdmin()) {
                return response()->json(['message' => 'Unauthorized'], 403);
            }

            $validated = $request->validate([
                'permission_name' => 'required|string|max:100',
                'category' => 'nullable|string|max:100',
                'description' => 'nullable|string',
            ]);

            $permission = Permission::create($validated);
            return response()->json($permission, 201);
        } catch (\Exception $e) {
            return response()->json(['error' => 'Failed to create permission', 'message' => $e->getMessage()], 500);
        }
    }

    public function update(Request $request, $id)
    {
        try {
            if (!$request->user() || !$request->user()->isAdmin()) {
                return response()->json(['message' => 'Unauthorized'], 403);
            }

            $permission = Permission::findOrFail($id);

            $validated = $request->validate([
                'permission_name' => 'required|string|max:100',
                'category' => 'nullable|string|max:100',
                'description' => 'nullable|string',
            ]);

            $permission->update($validated);
            return response()->json($permission);
        } catch (\Exception $e) {
            return response()->json(['error' => 'Failed to update permission', 'message' => $e->getMessage()], 500);
        }
    }

    public function destroy(Request $request, $id)
    {
        try {
            if (!$request->user() || !$request->user()->isAdmin()) {
                return response()->json(['message' => 'Unauthorized'], 403);
            }

            $permission = Permission::findOrFail($id);
            $permission->delete();

            return response()->json(['message' => 'Permission deleted successfully']);
        } catch (\Exception $e) {
            return response()->json(['error' => 'Failed to delete permission', 'message' => $e->getMessage()], 500);
        }
    }

    public function assignToRole(Request $request)
    {
        try {
            if (!$request->user() || !$request->user()->isAdmin()) {
                return response()->json(['message' => 'Unauthorized'], 403);
            }

            $validated = $request->validate([
                'role_id' => 'required|exists:tbl_roles,role_id',
                'permission_id' => 'required|exists:tbl_permission,permission_id',
            ]);

            $exists = RolePermission::where('role_id', $validated['role_id'])
                ->where('permission_id', $validated['permission_id'])
                ->exists();

            if ($exists) {
                return response()->json(['message' => 'Permission already assigned to role'], 422);
            }

            $rolePermission = RolePermission::create($validated);
            return response()->json($rolePermission, 201);
        } catch (\Exception $e) {
            return response()->json(['error' => 'Failed to assign permission', 'message' => $e->getMessage()], 500);
        }
    }

    public function removeFromRole(Request $request, $roleId, $permissionId)
    {
        try {
            if (!$request->user() || !$request->user()->isAdmin()) {
                return response()->json(['message' => 'Unauthorized'], 403);
            }

            $rolePermission = RolePermission::where('role_id', $roleId)
                ->where('permission_id', $permissionId)
                ->firstOrFail();

            $rolePermission->delete();

            return response()->json(['message' => 'Permission removed from role successfully']);
        } catch (\Exception $e) {
            return response()->json(['error' => 'Failed to remove permission', 'message' => $e->getMessage()], 500);
        }
    }

    /**
     * Get all permissions (grouped by category) and which are assigned to the role.
     * For Role Settings UI: left panel = roles, right panel = checkboxes per permission.
     */
    public function forRole(Request $request, $roleId)
    {
        try {
            if (!$request->user() || !$request->user()->isAdmin()) {
                return response()->json(['message' => 'Unauthorized'], 403);
            }

            $permissions = Permission::orderBy('category')->orderBy('permission_name')->get();
            $assignedIds = RolePermission::where('role_id', $roleId)->pluck('permission_id')->toArray();

            return response()->json([
                'permissions' => $permissions,
                'assigned_ids' => $assignedIds,
            ]);
        } catch (\Exception $e) {
            return response()->json(['error' => 'Failed to fetch permissions for role', 'message' => $e->getMessage()], 500);
        }
    }

    /**
     * Sync permissions for a role: replace current assignments with the given list.
     */
    public function syncRole(Request $request, $roleId)
    {
        try {
            if (!$request->user() || !$request->user()->isAdmin()) {
                return response()->json(['message' => 'Unauthorized'], 403);
            }

            $validated = $request->validate([
                'permission_ids' => 'array',
                'permission_ids.*' => 'integer|exists:tbl_permission,permission_id',
            ]);

            $permissionIds = $validated['permission_ids'] ?? [];

            RolePermission::where('role_id', $roleId)->delete();

            foreach ($permissionIds as $pid) {
                RolePermission::create(['role_id' => $roleId, 'permission_id' => $pid]);
            }

            return response()->json([
                'message' => 'Permissions updated successfully',
                'assigned_ids' => $permissionIds,
            ]);
        } catch (\Exception $e) {
            return response()->json(['error' => 'Failed to sync permissions', 'message' => $e->getMessage()], 500);
        }
    }
}

