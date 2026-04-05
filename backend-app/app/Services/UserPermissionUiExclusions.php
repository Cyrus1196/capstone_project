<?php

namespace App\Services;

use App\Models\Permission;
use Illuminate\Support\Collection;

/**
 * Permissions hidden from the User permissions admin UI (dashboard / profile shells).
 * Portal merge still applies them implicitly; sync re-attaches when the role baseline includes them.
 */
final class UserPermissionUiExclusions
{
    /**
     * @return list<string>
     */
    public static function excludedPermissionNames(): array
    {
        return [
            'Admin Dashboard',
            'faculty.view',
            // Dean portal + high-impact academic approvals — not shown here; use Student Evaluation for grade/eval
            // workspace. Implicit merge (see implicitMergeIdsForRole) keeps Dean role baseline on custom saves.
            'dean.view',
            'dean.approve',
        ];
    }

    /**
     * @return list<int>
     */
    public static function excludedPermissionIds(): array
    {
        return Permission::whereIn('permission_name', self::excludedPermissionNames())
            ->pluck('permission_id')
            ->map(fn ($id) => (int) $id)
            ->unique()
            ->values()
            ->all();
    }

    /**
     * @param  Collection<int, \App\Models\Permission>  $permissions
     * @return Collection<int, \App\Models\Permission>
     */
    public static function filterVisible(Collection $permissions): Collection
    {
        $excluded = self::excludedPermissionNames();

        return $permissions->filter(fn ($p) => ! in_array($p->permission_name, $excluded, true))->values();
    }

    /**
     * Excluded permission IDs that this role’s portal baseline already includes — merged on every custom sync.
     *
     * @return list<int>
     */
    public static function implicitMergeIdsForRole(?string $roleName): array
    {
        $always = RbacPortalMerge::portalAlwaysVisiblePermissionNames($roleName);
        $forceNames = array_values(array_intersect(self::excludedPermissionNames(), $always));
        if ($forceNames === []) {
            return [];
        }

        return Permission::whereIn('permission_name', $forceNames)
            ->pluck('permission_id')
            ->map(fn ($id) => (int) $id)
            ->unique()
            ->values()
            ->all();
    }
}
