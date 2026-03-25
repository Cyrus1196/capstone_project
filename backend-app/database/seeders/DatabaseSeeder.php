<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;

class DatabaseSeeder extends Seeder
{

    /**
     * Seed the application's database.
     */
    public function run(): void
    {
        $this->call([
            DefaultPermissionsSeeder::class,
            AdminUserSeeder::class,
            StudentTestSeeder::class,
            CorequisiteSeeder::class,
            ElectiveSlotsITSeeder::class,
            CapstoneDemoTransactionSeeder::class,
        ]);
    }
}
