<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Support\Str;

class CsvImportJob extends Model
{
    protected $table = 'csv_import_jobs';

    protected $fillable = [
        'public_id',
        'user_id',
        'import_type',
        'original_filename',
        'stored_path',
        'academic_year_id',
        'semester_id',
        'row_fixes',
        'skip_rows',
        'status',
        'phase',
        'total_rows',
        'processed_rows',
        'imported',
        'failed',
        'skipped',
        'errors',
        'message',
        'started_at',
        'finished_at',
    ];

    protected $casts = [
        'errors' => 'array',
        'academic_year_id' => 'integer',
        'semester_id' => 'integer',
        'total_rows' => 'integer',
        'processed_rows' => 'integer',
        'imported' => 'integer',
        'failed' => 'integer',
        'skipped' => 'integer',
        'started_at' => 'datetime',
        'finished_at' => 'datetime',
    ];

    protected static function booted(): void
    {
        static::creating(function (self $job): void {
            if (empty($job->public_id)) {
                $job->public_id = (string) Str::uuid();
            }
        });
    }

    public function toStatusPayload(): array
    {
        $pct = 0;
        if ($this->total_rows > 0) {
            $pct = (int) min(100, round(($this->processed_rows / $this->total_rows) * 100));
        } elseif ($this->status === 'completed') {
            $pct = 100;
        } elseif (in_array($this->phase, ['syncing', 'finalizing'], true)) {
            $pct = 95;
        }

        return [
            'job_id' => $this->public_id,
            'status' => $this->status,
            'phase' => $this->phase,
            'progress_percent' => $pct,
            'total_rows' => $this->total_rows,
            'processed_rows' => $this->processed_rows,
            'imported' => $this->imported,
            'failed' => $this->failed,
            'skipped' => $this->skipped,
            'message' => $this->message,
            'errors' => array_slice($this->errors ?? [], 0, 25),
            'results' => [
                'total' => $this->total_rows,
                'imported' => $this->imported,
                'failed' => $this->failed,
                'skipped' => $this->skipped,
                'errors' => array_slice($this->errors ?? [], 0, 25),
            ],
            'started_at' => optional($this->started_at)?->toIso8601String(),
            'finished_at' => optional($this->finished_at)?->toIso8601String(),
        ];
    }
}
