<?php

namespace App\Services;

use App\Models\Permission;
use App\Models\RolePermission;
use App\Support\LookupResourcePermissions;

/**
 * Portal baseline permissions merged with tbl_role_permissions for display and effective checks.
 */
class RbacPortalMerge
{
    /**
     * @return list<string>
     */
    public static function portalAlwaysVisiblePermissionNames(?string $roleName): array
    {
        return match ($roleName) {
            'Adviser' => [
                'evaluation.view',
                'evaluation.create',
                'evaluation.edit',
                'evaluation.export_pdf',
                'students.edit',
                'faculty.view',
                'curriculum.view',
            ],
            'Student' => [
                'students.view',
                'curriculum.view',
                'subjects.view',
            ],
            'Dean' => [
                'users.view',
                'curriculum.view',
                'curriculum.approve',
                'subjects.view',
                'prerequisites.view',
                'students.view',
                'credit_eval.view',
                'credit_eval.approve',
                'electives.view',
                'faculty.view',
                'dean.view',
                'dean.approve',
                'reports.view',
                'reports.generate',
            ],
            'Program Head' => [
                'curriculum.view',
                'curriculum.approve',
                'students.view',
                'evaluation.view',
                'evaluation.create',
                'evaluation.edit',
                'subjects.view',
                'prerequisites.view',
                'electives.view',
                'reports.view',
                'reports.generate',
                'faculty.view',
            ],
            'Secretary' => array_merge([
                'users.view',
                'students.view',
                'students.edit',
                'curriculum.view',
                'evaluation.view',
                'evaluation.create',
                'evaluation.edit',
                'evaluation.export_pdf',
            ], LookupResourcePermissions::viewPermissionNames()),
            default => [],
        };
    }

    /**
     * @return list<string>
     */
    public static function portalOptionalTabPermissionNames(?string $roleName): array
    {
        return match ($roleName) {
            'Adviser', 'Dean' => array_merge([
                'electives.view',
                'electives.manage',
                'curriculum.view',
                'curriculum.create',
                'curriculum.edit',
                'curriculum.delete',
                'curriculum.approve',
                'Curriculum Management',
                'Elective Slots',
                'evaluation.view',
                'evaluation.create',
                'evaluation.edit',
                'evaluation.approve',
                'evaluation.export_pdf',
                'Student Evaluation',
                'Evaluation Reports',
                'reports.view',
                'reports.generate',
            ], LookupResourcePermissions::allGranularPermissionNames()),
            'Program Head' => array_merge([
                'electives.view',
                'electives.manage',
                'curriculum.create',
                'curriculum.edit',
                'curriculum.delete',
                'Curriculum Management',
                'Elective Slots',
                'evaluation.approve',
                'Student Evaluation',
                'subjects.create',
                'subjects.edit',
                'subjects.delete',
                'prerequisites.manage',
            ], LookupResourcePermissions::allGranularPermissionNames()),
            'Secretary' => array_merge([
                'users.create',
                'users.edit',
                'users.delete',
                'users.manage_roles',
                'User Management',
                'curriculum.create',
                'Curriculum Management',
                'students.create',
                'students.enroll',
                'credit_eval.view',
                'credit_eval.create',
                'Credit Evaluation',
                // Secretary portal — curriculum evaluation (with Dean on approvals; year scope in Role Settings)
                'Student Evaluation',
                'evaluation.approve',
            ], LookupResourcePermissions::allGranularPermissionNames()),
            default => [],
        };
    }

    /**
     * @return list<int>
     */
    public static function portalPanelPermissionIds(?string $roleName): array
    {
        $names = array_merge(
            self::portalAlwaysVisiblePermissionNames($roleName),
            self::portalOptionalTabPermissionNames($roleName)
        );

        if ($names === []) {
            return [];
        }

        return Permission::whereIn('permission_name', $names)->pluck('permission_id')->values()->all();
    }

    /**
     * @return list<int>
     */
    public static function mergedRoleAssignedIds(int|string|null $roleId, ?string $roleName): array
    {
        if (! $roleId) {
            return [];
        }

        $dbAssigned = RolePermission::where('role_id', $roleId)
            ->pluck('permission_id')
            ->map(fn ($id) => (int) $id)
            ->toArray();

        $alwaysNames = self::portalAlwaysVisiblePermissionNames($roleName);
        $alwaysIds = Permission::whereIn('permission_name', $alwaysNames)
            ->pluck('permission_id')
            ->map(fn ($id) => (int) $id)
            ->toArray();

        $portalRoles = ['Adviser', 'Student', 'Dean', 'Program Head', 'Secretary'];
        if ($roleName && in_array($roleName, $portalRoles, true)) {
            return array_values(array_unique(array_merge($dbAssigned, $alwaysIds)));
        }

        return $dbAssigned;
    }
}
