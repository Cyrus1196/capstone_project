<?php

namespace App\Console\Commands;

use App\Models\StudentProfile;
use App\Services\StudentCurriculumEvaluationBuilder;
use App\Support\HeavyRequest;
use Illuminate\Console\Command;

/**
 * Align every student's year_level_id with earned-units standing
 * so Year Level filters match the evaluation Standing label.
 */
class SyncStudentYearFromEarnedUnits extends Command
{
    protected $signature = 'students:sync-year-from-units
                            {--chunk=40 : Profiles per chunk}
                            {--dry-run : Report changes without saving}';

    protected $description = 'Set year_level_id from earned curriculum units (46→2nd, 94→3rd, 132→4th)';

    public function handle(StudentCurriculumEvaluationBuilder $builder): int
    {
        HeavyRequest::forImport();

        $chunk = max(5, (int) $this->option('chunk'));
        $dry = (bool) $this->option('dry-run');
        $updated = 0;
        $scanned = 0;
        $failed = 0;

        $this->info(($dry ? '[dry-run] ' : '').'Syncing year_level_id from earned units…');

        StudentProfile::query()
            ->orderBy('student_id')
            ->chunkById($chunk, function ($profiles) use ($builder, $dry, &$updated, &$scanned, &$failed) {
                foreach ($profiles as $profile) {
                    $scanned++;
                    try {
                        if ($dry) {
                            $built = $builder->buildPayload($profile);
                            $earned = (float) ($built['summary']['total_units_earned'] ?? 0);
                            $want = \App\Support\EvaluationStanding::yearOrdinalFromEarnedUnits($earned);
                            $have = $profile->year_level_id !== null && $profile->year_level_id !== ''
                                ? (int) $profile->year_level_id
                                : null;
                            if ($have !== $want) {
                                $updated++;
                                $this->line("  would update {$profile->student_id_number}: year {$have} → {$want} (earned {$earned})");
                            }
                            continue;
                        }

                        if ($builder->syncStudentProfileFromCurriculumProgress($profile)) {
                            $updated++;
                        }
                    } catch (\Throwable $e) {
                        $failed++;
                        $this->warn("  skip {$profile->student_id_number}: ".$e->getMessage());
                    }
                }
            }, 'student_id');

        $this->info("Scanned {$scanned}; updated {$updated}; failed {$failed}.");

        return self::SUCCESS;
    }
}
