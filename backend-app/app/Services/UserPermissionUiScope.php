<?php

namespace App\Services;

use App\Support\LookupResourcePermissions;

/**
 * Limits the User permissions screen to modules relevant to portal / office roles.
 * Other roles (Admin, Student, etc.) see the full permission list (null = no scoping).
 */
class UserPermissionUiScope
{
    /**
     * @return list<string>|null  null = show all permissions
     */
    public static function scopedPermissionNames(?string $roleName): ?array
    {
        return match ($roleName) {
            'Dean' => self::deanNames(),
            'Evaluator' => self::evaluatorNames(),
            'Adviser' => self::adviserNames(),
            'Program Head' => self::programHeadNames(),
            'Secretary' => self::secretaryNames(),
            default => null,
        };
    }

    /**
     * For sync validation: null = any permission id allowed; non-null = only these ids may be assigned.
     *
     * @return list<int>|null
     */
    public static function allowedPermissionIdsForSync(?string $roleName): ?array
    {
        $names = self::scopedPermissionNames($roleName);
        if ($names === null) {
            return null;
        }

        $ids = \App\Models\Permission::whereIn('permission_name', $names)
            ->pluck('permission_id')
            ->map(fn ($id) => (int) $id)
            ->unique()
            ->values()
            ->all();

        $excluded = UserPermissionUiExclusions::excludedPermissionIds();

        return array_values(array_diff($ids, $excluded));
    }

    /**
     * @return list<string>
     */
    private static function deanNames(): array
    {
        return array_values(array_unique(array_merge(
            RbacPortalMerge::portalAlwaysVisiblePermissionNames('Dean'),
            RbacPortalMerge::portalOptionalTabPermissionNames('Dean'),
            ['audit.view', 'Audit Logs'],
        )));
    }

    /**
     * @return list<string>
     */
    private static function evaluatorNames(): array
    {
        return [
            'Student Evaluation',
            'evaluation.view',
            'evaluation.create',
            'evaluation.edit',
            'evaluation.approve',
            'evaluation.export_pdf',
            'faculty.view',
            'Curriculum Management',
            'curriculum.view',
            'curriculum.create',
            'curriculum.edit',
            'curriculum.delete',
            'curriculum.approve',
        ];
    }

    /**
     * @return list<string>
     */
    private static function adviserNames(): array
    {
        return array_values(array_unique(array_merge(
            self::evaluatorNames(),
            ['students.edit'],
        )));
    }

    /**
     * @return list<string>
     */
    private static function programHeadNames(): array
    {
        return array_merge([
            'Curriculum Management',
            'curriculum.view',
            'curriculum.create',
            'curriculum.edit',
            'curriculum.delete',
            'curriculum.approve',
            'Student Evaluation',
            'evaluation.view',
            'evaluation.create',
            'evaluation.edit',
            'evaluation.approve',
            'students.view',
            'students.edit',
            'subjects.view',
            'subjects.create',
            'subjects.edit',
            'subjects.delete',
            'prerequisites.view',
            'prerequisites.manage',
            'Elective Slots',
            'electives.view',
            'electives.manage',
            'reports.view',
            'reports.generate',
            'faculty.view',
            'lookup.view',
            'lookup.manage',
            'Lookup Data',
        ], LookupResourcePermissions::allGranularPermissionNames());
    }

    /**
     * @return list<string>
     */
    private static function secretaryNames(): array
    {
        return array_merge([
            'User Management',
            'users.view',
            'users.create',
            'users.edit',
            'users.delete',
            'users.manage_roles',
            'students.view',
            'students.edit',
            'students.create',
            'students.enroll',
            'Lookup Data',
            'lookup.view',
            'lookup.manage',
            'Curriculum Management',
            'curriculum.view',
            'Credit Evaluation',
            'credit_eval.view',
            'credit_eval.create',
            // Curriculum student evaluation (Secretary portal — roster/grades; Dean remains primary approver)
            'Student Evaluation',
            'evaluation.view',
            'evaluation.create',
            'evaluation.edit',
            'evaluation.approve',
            'evaluation.export_pdf',
        ], LookupResourcePermissions::allGranularPermissionNames());
    }
}
