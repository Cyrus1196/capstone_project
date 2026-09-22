<?php

namespace App\Services;

use App\Models\BackupHistory;
use App\Models\BackupSetting;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\File;
use Illuminate\Support\Facades\Schema;
use Symfony\Component\Process\Process;

class DatabaseBackupService
{
    private const LOCK_NAME = 'aep_database_backup_lock';

    public function defaultStoragePath(): string
    {
        return storage_path('app/backups');
    }

    public function settings(): BackupSetting
    {
        if (! Schema::hasTable('tbl_backup_settings')) {
            throw new \RuntimeException('Backup settings table is missing. Run migrations.');
        }

        $row = BackupSetting::query()->orderBy('id')->first();
        if (! $row) {
            $row = BackupSetting::query()->create([
                'enabled' => true,
                'schedule_type' => 'daily',
                'backup_time' => '00:01',
                'storage_path' => null,
                'updated_at' => now(),
            ]);
        }

        return $row;
    }

    public function resolveStorageDir(?BackupSetting $settings = null): string
    {
        $settings ??= $this->settings();
        $raw = trim((string) ($settings->storage_path ?? ''));
        if ($raw === '') {
            $dir = $this->defaultStoragePath();
        } elseif (preg_match('/^[A-Za-z]:[\\\\\\/]/', $raw) || str_starts_with($raw, '/') || str_starts_with($raw, '\\\\')) {
            $dir = $raw;
        } else {
            $dir = storage_path('app/'.ltrim(str_replace('\\', '/', $raw), '/'));
        }

        if (! is_dir($dir)) {
            File::makeDirectory($dir, 0755, true);
        }

        return rtrim(str_replace('\\', '/', $dir), '/');
    }

    public function nextRunAt(BackupSetting $settings): ?\Carbon\Carbon
    {
        if (! $settings->enabled) {
            return null;
        }
        $time = $this->normalizeTime($settings->backup_time);
        [$h, $m] = array_map('intval', explode(':', $time));
        $next = now()->copy()->setTime($h, $m, 0);
        if ($next->lessThanOrEqualTo(now())) {
            $next->addDay();
        }

        return $next;
    }

    public function summary(): array
    {
        $settings = $this->settings();
        $storage = $this->resolveStorageDir($settings);
        $history = Schema::hasTable('tbl_backup_history')
            ? BackupHistory::query()
            : null;

        $backupOk = $history ? (clone $history)->where('action', 'backup')->where('status', 'success')->count() : 0;
        $backupFail = $history ? (clone $history)->where('action', 'backup')->where('status', 'failed')->count() : 0;
        $restoreOk = $history ? (clone $history)->where('action', 'restore')->where('status', 'success')->count() : 0;
        $restoreFail = $history ? (clone $history)->where('action', 'restore')->where('status', 'failed')->count() : 0;
        $lastSuccess = $history
            ? (clone $history)->where('action', 'backup')->where('status', 'success')->orderByDesc('finished_at')->first()
            : null;

        return [
            'database' => (string) DB::getDatabaseName(),
            'table_count' => count($this->listTables()),
            'connection' => config('database.default'),
            'timezone' => config('app.timezone') ?: date_default_timezone_get(),
            'server_time' => now()->toIso8601String(),
            'storage_path' => $storage,
            'schedule' => [
                'enabled' => (bool) $settings->enabled,
                'schedule_type' => $settings->schedule_type ?: 'daily',
                'backup_time' => $this->normalizeTime($settings->backup_time),
                'storage_path' => $settings->storage_path,
                'summary' => $settings->enabled
                    ? 'Daily at '.$this->normalizeTime($settings->backup_time)
                    : 'Scheduled backups disabled',
                'next_run_at' => optional($this->nextRunAt($settings))?->toIso8601String(),
            ],
            'stats' => [
                'backups_success' => $backupOk,
                'backups_failed' => $backupFail,
                'restores_success' => $restoreOk,
                'restores_failed' => $restoreFail,
                'last_success_at' => optional($lastSuccess?->finished_at)?->toIso8601String(),
            ],
        ];
    }

    /**
     * @return BackupHistory
     */
    public function createBackup(string $trigger = 'manual', ?int $userId = null): BackupHistory
    {
        if (! $this->acquireLock()) {
            throw new \RuntimeException('Another backup or restore is already running. Try again shortly.');
        }

        $settings = $this->settings();
        $dir = $this->resolveStorageDir($settings);
        $dbName = (string) DB::getDatabaseName();
        $fileName = sprintf(
            '%s_%s_backup_%s.sql',
            preg_replace('/[^a-zA-Z0-9_-]+/', '_', $dbName) ?: 'database',
            $trigger === 'scheduled' ? 'scheduled' : 'manual',
            now()->format('Ymd_His')
        );
        $fullPath = $dir.'/'.$fileName;

        $row = BackupHistory::query()->create([
            'action' => 'backup',
            'trigger' => $trigger === 'scheduled' ? 'scheduled' : 'manual',
            'status' => 'running',
            'file_name' => $fileName,
            'file_path' => $fullPath,
            'file_size' => 0,
            'details' => 'Backup in progress…',
            'created_by' => $userId,
            'started_at' => now(),
        ]);

        try {
            $this->writeSqlDump($fullPath);
            clearstatcache(true, $fullPath);
            $size = is_file($fullPath) ? (int) filesize($fullPath) : 0;
            $row->update([
                'status' => 'success',
                'file_size' => $size,
                'details' => ($trigger === 'scheduled' ? 'Scheduled' : 'Manual').' backup completed successfully',
                'finished_at' => now(),
            ]);
        } catch (\Throwable $e) {
            $row->update([
                'status' => 'failed',
                'details' => 'Backup failed: '.$e->getMessage(),
                'finished_at' => now(),
            ]);
            if (is_file($fullPath)) {
                @unlink($fullPath);
            }
            throw $e;
        } finally {
            $this->releaseLock();
        }

        return $row->fresh();
    }

    public function runScheduledIfDue(): ?BackupHistory
    {
        if (! Schema::hasTable('tbl_backup_settings') || ! Schema::hasTable('tbl_backup_history')) {
            return null;
        }

        $settings = $this->settings();
        if (! $settings->enabled) {
            return null;
        }

        $want = $this->normalizeTime($settings->backup_time);
        if (now()->format('H:i') !== $want) {
            return null;
        }

        $already = BackupHistory::query()
            ->where('action', 'backup')
            ->where('trigger', 'scheduled')
            ->whereDate('started_at', now()->toDateString())
            ->whereIn('status', ['running', 'success'])
            ->exists();
        if ($already) {
            return null;
        }

        return $this->createBackup('scheduled', null);
    }

    public function restoreFromHistory(BackupHistory $history, ?int $userId = null): BackupHistory
    {
        if ($history->action !== 'backup' || $history->status !== 'success') {
            throw new \InvalidArgumentException('Only a successful backup can be restored.');
        }
        $path = (string) $history->file_path;
        if ($path === '' || ! is_file($path)) {
            throw new \RuntimeException('Backup file is missing on the server.');
        }

        if (! $this->acquireLock()) {
            throw new \RuntimeException('Another backup or restore is already running. Try again shortly.');
        }

        $row = BackupHistory::query()->create([
            'action' => 'restore',
            'trigger' => 'manual',
            'status' => 'running',
            'file_name' => $history->file_name,
            'file_path' => $path,
            'file_size' => $history->file_size,
            'details' => 'Restore in progress…',
            'created_by' => $userId,
            'started_at' => now(),
        ]);

        try {
            $this->importSqlFile($path);
            $row->update([
                'status' => 'success',
                'details' => 'Restored from '.$history->file_name,
                'finished_at' => now(),
            ]);
        } catch (\Throwable $e) {
            $row->update([
                'status' => 'failed',
                'details' => 'Restore failed: '.$e->getMessage(),
                'finished_at' => now(),
            ]);
            throw $e;
        } finally {
            $this->releaseLock();
        }

        return $row->fresh();
    }

    public function writeSqlDump(string $fullPath): void
    {
        $dbName = (string) DB::getDatabaseName();
        $tables = $this->listTables();
        $pdo = DB::connection()->getPdo();

        $out = fopen($fullPath, 'wb');
        if ($out === false) {
            throw new \RuntimeException('Could not write backup file.');
        }

        try {
            fwrite($out, "-- Academic Evaluation Portal database backup\n");
            fwrite($out, "-- Database: {$dbName}\n");
            fwrite($out, '-- Generated: '.now()->toIso8601String()."\n");
            fwrite($out, '-- Tables: '.count($tables)."\n\n");
            fwrite($out, "SET NAMES utf8mb4;\n");
            fwrite($out, "SET FOREIGN_KEY_CHECKS=0;\n\n");

            foreach ($tables as $table) {
                // Never dump backup history mid-write into itself inconsistently — include it.
                $safeTable = str_replace('`', '``', $table);
                fwrite($out, "--\n-- Table structure for `{$table}`\n--\n\n");
                fwrite($out, "DROP TABLE IF EXISTS `{$safeTable}`;\n");

                $createRow = DB::selectOne("SHOW CREATE TABLE `{$safeTable}`");
                $createSql = null;
                if ($createRow) {
                    $arr = (array) $createRow;
                    $createSql = $arr['Create Table'] ?? $arr['Create View'] ?? null;
                }
                if (! $createSql) {
                    fwrite($out, "-- (could not read CREATE for {$table})\n\n");
                    continue;
                }
                fwrite($out, $createSql.";\n\n");
                fwrite($out, "--\n-- Data for `{$table}`\n--\n\n");

                $rows = DB::table($table)->get();
                if ($rows->isEmpty()) {
                    fwrite($out, "\n");
                    continue;
                }

                $first = (array) $rows->first();
                $cols = array_map(
                    static fn ($c) => '`'.str_replace('`', '``', (string) $c).'`',
                    array_keys($first)
                );
                $colList = implode(', ', $cols);

                $batch = [];
                foreach ($rows as $row) {
                    $vals = [];
                    foreach ((array) $row as $v) {
                        $vals[] = $v === null ? 'NULL' : $pdo->quote((string) $v);
                    }
                    $batch[] = '('.implode(', ', $vals).')';
                    if (count($batch) >= 150) {
                        fwrite($out, "INSERT INTO `{$safeTable}` ({$colList}) VALUES\n".implode(",\n", $batch).";\n");
                        $batch = [];
                    }
                }
                if ($batch !== []) {
                    fwrite($out, "INSERT INTO `{$safeTable}` ({$colList}) VALUES\n".implode(",\n", $batch).";\n\n");
                } else {
                    fwrite($out, "\n");
                }
            }

            fwrite($out, "SET FOREIGN_KEY_CHECKS=1;\n");
        } finally {
            fclose($out);
        }
    }

    public function importSqlFile(string $path): void
    {
        $driver = config('database.default');
        if (! in_array($driver, ['mysql', 'mariadb'], true)) {
            throw new \RuntimeException('Restore is only supported for MySQL/MariaDB connections.');
        }

        if ($this->importViaMysqlCli($path)) {
            return;
        }

        $sql = file_get_contents($path);
        if ($sql === false) {
            throw new \RuntimeException('Could not read backup file.');
        }

        // Split on semicolons that end statements (simple dump format we generate).
        DB::statement('SET FOREIGN_KEY_CHECKS=0');
        $buffer = '';
        $lines = preg_split("/\r\n|\n|\r/", $sql) ?: [];
        foreach ($lines as $line) {
            $trim = ltrim($line);
            if ($trim === '' || str_starts_with($trim, '--')) {
                continue;
            }
            $buffer .= $line."\n";
            if (str_ends_with(rtrim($buffer), ';')) {
                $stmt = trim($buffer);
                $buffer = '';
                if ($stmt !== '') {
                    DB::unprepared($stmt);
                }
            }
        }
        if (trim($buffer) !== '') {
            DB::unprepared($buffer);
        }
        DB::statement('SET FOREIGN_KEY_CHECKS=1');
    }

    private function importViaMysqlCli(string $path): bool
    {
        $cfg = config('database.connections.'.config('database.default'));
        if (! is_array($cfg)) {
            return false;
        }

        $mysql = $this->findMysqlBinary();
        if ($mysql === null) {
            return false;
        }

        $host = (string) ($cfg['host'] ?? '127.0.0.1');
        $port = (string) ($cfg['port'] ?? '3306');
        $user = (string) ($cfg['username'] ?? 'root');
        $pass = (string) ($cfg['password'] ?? '');
        $db = (string) ($cfg['database'] ?? '');

        $args = [
            $mysql,
            '-h'.$host,
            '-P'.$port,
            '-u'.$user,
        ];
        if ($pass !== '') {
            $args[] = '-p'.$pass;
        }
        $args[] = $db;

        $process = new Process($args);
        $process->setTimeout(null);
        $process->setInput(file_get_contents($path) ?: '');
        $process->run();

        if (! $process->isSuccessful()) {
            throw new \RuntimeException(trim($process->getErrorOutput() ?: $process->getOutput()) ?: 'mysql restore failed');
        }

        return true;
    }

    private function findMysqlBinary(): ?string
    {
        foreach (['mysql', 'mysql.exe'] as $bin) {
            $process = Process::fromShellCommandline(
                PHP_OS_FAMILY === 'Windows' ? 'where '.$bin : 'command -v '.$bin
            );
            $process->run();
            if ($process->isSuccessful()) {
                $line = trim(explode("\n", str_replace("\r", '', $process->getOutput()))[0] ?? '');
                if ($line !== '' && is_file($line)) {
                    return $line;
                }
                if ($line !== '') {
                    return $bin;
                }
            }
        }

        // Common XAMPP path on Windows
        $xampp = 'C:\\xampp\\mysql\\bin\\mysql.exe';
        if (is_file($xampp)) {
            return $xampp;
        }

        return null;
    }

    /** @return list<string> */
    public function listTables(): array
    {
        $dbName = (string) DB::getDatabaseName();
        $rows = DB::select(
            'SELECT TABLE_NAME AS name FROM information_schema.TABLES WHERE TABLE_SCHEMA = ? AND TABLE_TYPE = ? ORDER BY TABLE_NAME',
            [$dbName, 'BASE TABLE']
        );

        return array_values(array_map(
            static fn ($r) => (string) ($r->name ?? ''),
            $rows
        ));
    }

    public function normalizeTime(?string $time): string
    {
        $t = trim((string) $time);
        if (preg_match('/^(\d{1,2}):(\d{2})$/', $t, $m)) {
            return sprintf('%02d:%02d', (int) $m[1] % 24, (int) $m[2] % 60);
        }

        return '00:01';
    }

    private function acquireLock(): bool
    {
        try {
            $row = DB::selectOne('SELECT GET_LOCK(?, 0) AS got', [self::LOCK_NAME]);

            return (int) ($row->got ?? 0) === 1;
        } catch (\Throwable $e) {
            // SQLite / non-MySQL: file lock fallback
            $lockFile = storage_path('app/backups/.backup.lock');
            if (! is_dir(dirname($lockFile))) {
                File::makeDirectory(dirname($lockFile), 0755, true);
            }
            $fh = @fopen($lockFile, 'c+');
            if ($fh === false) {
                return false;
            }
            if (! flock($fh, LOCK_EX | LOCK_NB)) {
                fclose($fh);

                return false;
            }
            // Keep handle in static so it stays locked for process lifetime of request
            $GLOBALS['__aep_backup_lock_fh'] = $fh;

            return true;
        }
    }

    private function releaseLock(): void
    {
        try {
            DB::select('SELECT RELEASE_LOCK(?)', [self::LOCK_NAME]);
        } catch (\Throwable $e) {
            // ignore
        }
        if (! empty($GLOBALS['__aep_backup_lock_fh']) && is_resource($GLOBALS['__aep_backup_lock_fh'])) {
            flock($GLOBALS['__aep_backup_lock_fh'], LOCK_UN);
            fclose($GLOBALS['__aep_backup_lock_fh']);
            unset($GLOBALS['__aep_backup_lock_fh']);
        }
    }
}
