<?php

use Illuminate\Foundation\Inspiring;
use Illuminate\Support\Facades\Artisan;
use Illuminate\Support\Facades\Schedule;

Artisan::command('inspire', function () {
    $this->comment(Inspiring::quote());
})->purpose('Display an inspiring quote');

Artisan::command('students:provision-logins', function () {
    $result = \App\Services\StudentLoginProvisioner::provisionAllMissing();
    $this->info("Created {$result['created']} student login(s).");
    if ($result['skipped'] > 0) {
        $this->line("Skipped {$result['skipped']} profile(s).");
    }
    foreach ($result['errors'] as $error) {
        $this->error("{$error['student_id']}: {$error['message']}");
    }

    return empty($result['errors']) ? 0 : 1;
})->purpose('Create login accounts for imported students without linked users');

Artisan::command('students:normalize-login-emails', function () {
    $updated = 0;
    $profiles = \App\Models\StudentProfile::query()->whereNotNull('user_id')->with('user')->get();
    foreach ($profiles as $profile) {
        $user = $profile->user;
        if (! $user) {
            continue;
        }
        $sid = trim((string) $profile->student_id_number);
        $raw = (string) $user->email;
        if ($sid === '') {
            continue;
        }
        if (\App\Services\StudentAccountEmail::isLoginPlaceholder($raw, $sid)
            && ! str_ends_with(strtolower($raw), '@student.local')) {
            $user->email = \App\Services\StudentAccountEmail::placeholderForStudentId($sid);
            $user->save();
            $updated++;
        }
    }
    $this->info("Normalized {$updated} student login email(s).");
})->purpose('Replace Student ID stored as email with internal login placeholders');

Artisan::command('evaluations:expire-overdue-inc', function () {
    $n = app(\App\Services\IncComplianceExpiryService::class)->expireOverdue();
    $this->info("Marked {$n} overdue INC evaluation(s) as failed (grade 49).");
})->purpose('Expire INC evaluations past their comply-by date');

Schedule::command('evaluations:expire-overdue-inc')->dailyAt('00:15');

// Check every minute whether a configured daily DB backup is due.
Schedule::command('backup:run-scheduled')->everyMinute();
