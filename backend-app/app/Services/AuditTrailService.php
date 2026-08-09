<?php

namespace App\Services;

use App\Models\AuditLog;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Support\Facades\Auth;

class AuditTrailService
{
    public static function currentUserId(): ?int
    {
        $id = Auth::guard('api')->id() ?? Auth::id();

        return $id !== null ? (int) $id : null;
    }

    /**
     * @param  array<string, mixed>|null  $oldValue
     * @param  array<string, mixed>|null  $newValue
     */
    public static function log(string $action, Model $model, ?array $oldValue, ?array $newValue): void
    {
        if ($model instanceof AuditLog) {
            return;
        }

        $userId = self::currentUserId();
        if ($userId === null) {
            return;
        }

        $pk = $model->getKey();
        $recordId = null;
        if (is_int($pk)) {
            $recordId = $pk;
        } elseif (is_string($pk) && ctype_digit($pk)) {
            $recordId = (int) $pk;
        }

        $cleanOld = self::normalizePayload($oldValue);
        $cleanNew = self::normalizePayload($newValue);

        AuditLog::create([
            'user_id' => $userId,
            'actions' => $action,
            'table_name' => $model->getTable(),
            'record_id' => $recordId,
            'old_value' => $cleanOld,
            'new_value' => $cleanNew,
            'action_timestamp' => now(),
        ]);
    }

    /**
     * @param  array<string, mixed>|null  $payload
     * @return array<string, mixed>|null
     */
    private static function normalizePayload(?array $payload): ?array
    {
        if ($payload === null || $payload === []) {
            return null;
        }

        return $payload;
    }
}
