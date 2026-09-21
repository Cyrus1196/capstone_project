<?php

namespace App\Http\Controllers\Administration;

use App\Http\Controllers\Controller;
use App\Models\BackupHistory;
use App\Services\DatabaseBackupService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Schema;
use Symfony\Component\HttpFoundation\BinaryFileResponse;

class DatabaseBackupController extends Controller
{
    public function __construct(private DatabaseBackupService $backups) {}

    private function denyUnlessBackup(Request $request): ?JsonResponse
    {
        $user = $request->user();
        if (! $user) {
            return response()->json(['message' => 'Unauthenticated'], 401);
        }
        if ($user->isAdmin()) {
            return null;
        }
        if ($user->hasAnyPermission(['system.backup', 'System Management', 'system.settings'])) {
            return null;
        }

        return response()->json(['message' => 'Forbidden'], 403);
    }

    public function info(Request $request)
    {
        if ($resp = $this->denyUnlessBackup($request)) {
            return $resp;
        }

        try {
            return response()->json($this->backups->summary());
        } catch (\Throwable $e) {
            return response()->json([
                'error' => 'Could not read backup info',
                'message' => $e->getMessage(),
            ], 500);
        }
    }

    public function history(Request $request)
    {
        if ($resp = $this->denyUnlessBackup($request)) {
            return $resp;
        }
        if (! Schema::hasTable('tbl_backup_history')) {
            return response()->json(['data' => []]);
        }

        $rows = BackupHistory::query()
            ->orderByDesc('id')
            ->limit(100)
            ->get()
            ->map(fn (BackupHistory $h) => $this->serializeHistory($h));

        return response()->json(['data' => $rows]);
    }

    public function updateSchedule(Request $request)
    {
        if ($resp = $this->denyUnlessBackup($request)) {
            return $resp;
        }

        $validated = $request->validate([
            'enabled' => 'required|boolean',
            'schedule_type' => 'nullable|string|in:daily',
            'backup_time' => 'required|string|max:8',
            'storage_path' => 'nullable|string|max:500',
        ]);

        try {
            $settings = $this->backups->settings();
            $settings->enabled = (bool) $validated['enabled'];
            $settings->schedule_type = $validated['schedule_type'] ?? 'daily';
            $settings->backup_time = $this->backups->normalizeTime($validated['backup_time']);
            $settings->storage_path = isset($validated['storage_path'])
                ? trim((string) $validated['storage_path']) ?: null
                : $settings->storage_path;
            $settings->updated_at = now();
            $settings->save();

            // Ensure path is creatable
            $this->backups->resolveStorageDir($settings);

            return response()->json([
                'message' => 'Backup schedule saved',
                'schedule' => $this->backups->summary()['schedule'],
            ]);
        } catch (\Throwable $e) {
            return response()->json([
                'error' => 'Could not save schedule',
                'message' => $e->getMessage(),
            ], 500);
        }
    }

    public function create(Request $request)
    {
        if ($resp = $this->denyUnlessBackup($request)) {
            return $resp;
        }

        try {
            $row = $this->backups->createBackup('manual', $request->user()?->user_id);

            return response()->json([
                'message' => 'Backup created successfully',
                'data' => $this->serializeHistory($row),
            ], 201);
        } catch (\Throwable $e) {
            return response()->json([
                'error' => 'Backup failed',
                'message' => $e->getMessage(),
            ], 500);
        }
    }

    public function download(Request $request, $id): BinaryFileResponse|JsonResponse
    {
        if ($resp = $this->denyUnlessBackup($request)) {
            return $resp;
        }

        $row = BackupHistory::query()->findOrFail($id);
        if ($row->action !== 'backup' || $row->status !== 'success') {
            return response()->json(['message' => 'Only successful backups can be downloaded'], 422);
        }
        $path = (string) $row->file_path;
        if ($path === '' || ! is_file($path)) {
            return response()->json(['message' => 'Backup file is missing on the server'], 404);
        }

        return response()->download($path, $row->file_name ?: basename($path), [
            'Content-Type' => 'application/sql; charset=utf-8',
        ]);
    }

    public function restore(Request $request, $id)
    {
        if ($resp = $this->denyUnlessBackup($request)) {
            return $resp;
        }

        try {
            $source = BackupHistory::query()->findOrFail($id);
            $row = $this->backups->restoreFromHistory($source, $request->user()?->user_id);

            return response()->json([
                'message' => 'Database restored successfully',
                'data' => $this->serializeHistory($row),
            ]);
        } catch (\Throwable $e) {
            return response()->json([
                'error' => 'Restore failed',
                'message' => $e->getMessage(),
            ], 500);
        }
    }

    /** Legacy: stream SQL dump directly to the browser (also logs a manual backup when possible). */
    public function exportSql(Request $request): BinaryFileResponse|JsonResponse
    {
        if ($resp = $this->denyUnlessBackup($request)) {
            return $resp;
        }

        try {
            $row = $this->backups->createBackup('manual', $request->user()?->user_id);
            $path = (string) $row->file_path;
            if (! is_file($path)) {
                throw new \RuntimeException('Backup file was not created');
            }

            return response()->download($path, $row->file_name ?: basename($path), [
                'Content-Type' => 'application/sql; charset=utf-8',
            ]);
        } catch (\Throwable $e) {
            return response()->json([
                'error' => 'Could not prepare database backup',
                'message' => $e->getMessage(),
            ], 500);
        }
    }

    private function serializeHistory(BackupHistory $h): array
    {
        $exists = $h->file_path && is_file((string) $h->file_path);

        return [
            'id' => $h->id,
            'action' => $h->action,
            'trigger' => $h->trigger,
            'status' => $h->status,
            'file_name' => $h->file_name,
            'file_size' => $h->file_size,
            'file_exists' => (bool) $exists,
            'details' => $h->details,
            'started_at' => optional($h->started_at)?->toIso8601String(),
            'finished_at' => optional($h->finished_at)?->toIso8601String(),
            'created_at' => optional($h->created_at)?->toIso8601String(),
        ];
    }
}
