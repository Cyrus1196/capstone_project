<?php

use Illuminate\Foundation\Inspiring;
use Illuminate\Support\Facades\Artisan;
use Illuminate\Support\Facades\Schedule;

Artisan::command('inspire', function () {
    $this->comment(Inspiring::quote());
})->purpose('Display an inspiring quote');

Artisan::command('evaluations:expire-overdue-inc', function () {
    $n = app(\App\Services\IncComplianceExpiryService::class)->expireOverdue();
    $this->info("Marked {$n} overdue INC evaluation(s) as failed (grade 49).");
})->purpose('Expire INC evaluations past their comply-by date');

Schedule::command('evaluations:expire-overdue-inc')->dailyAt('00:15');
