<?php

namespace App\Jobs;

use App\Http\Controllers\Administration\CsvImportController;
use App\Models\CsvImportJob;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Queue\Queueable;
use Illuminate\Support\Facades\Log;

class ProcessCsvImportJob implements ShouldQueue
{
    use Queueable;

    /** Large SIS files can run a long time; avoid premature kill. */
    public int $timeout = 3600;

    public int $tries = 1;

    public function __construct(public int $csvImportJobId) {}

    public function handle(CsvImportController $controller): void
    {
        $controller->processQueuedImport($this->csvImportJobId);
    }

    public function failed(?\Throwable $e): void
    {
        $job = CsvImportJob::query()->find($this->csvImportJobId);
        if (! $job) {
            return;
        }

        $job->forceFill([
            'status' => 'failed',
            'phase' => 'failed',
            'message' => $e?->getMessage() ?: 'Import job failed',
            'finished_at' => now(),
        ])->save();

        Log::error('ProcessCsvImportJob failed', [
            'csv_import_job_id' => $this->csvImportJobId,
            'error' => $e?->getMessage(),
        ]);
    }
}
