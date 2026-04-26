<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;

/**
 * Ensures elective slots exist for IT program (program_id = 1) where the curriculum
 * uses elective clusters (e.g. IT Electives 1 in 3rd Year / 1st Sem) but tbl_elective_slot had no row.
 */
class ElectiveSlotsITSeeder extends Seeder
{
    public function run(): void
    {
        $slots = [
            [
                'program_id' => 1,
                'year_level_id' => 3,
                'semester_id' => 1,
                'slot_name' => 'IT Electives 1',
                'status' => 'active',
            ],
            [
                'program_id' => 1,
                'year_level_id' => 2,
                'semester_id' => 1,
                'slot_name' => 'IT Electives (2nd Year / 1st Sem)',
                'status' => 'active',
            ],
            [
                'program_id' => 1,
                'year_level_id' => 2,
                'semester_id' => 2,
                'slot_name' => 'IT Electives (2nd Year / 2nd Sem)',
                'status' => 'active',
            ],
        ];

        foreach ($slots as $row) {
            $exists = DB::table('tbl_elective_slot')
                ->where('program_id', $row['program_id'])
                ->where('year_level_id', $row['year_level_id'])
                ->where('semester_id', $row['semester_id'])
                ->where('slot_name', $row['slot_name'])
                ->exists();

            if (!$exists) {
                DB::table('tbl_elective_slot')->insert($row);
            }
        }
    }
}
