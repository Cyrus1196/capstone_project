<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use App\Models\TblUser;
use App\Models\Role;
use Illuminate\Support\Facades\Hash;

class AdminUserSeeder extends Seeder
{
    public function run(): void
    {
        // Create Admin role if it doesn't exist
        $adminRole = Role::firstOrCreate(
            ['role_name' => 'Admin'],
            [
                'access_level' => 10,
                'description' => 'Administrator with full access'
            ]
        );

        // Create admin user if it doesn't exist
        TblUser::firstOrCreate(
            ['email' => 'admin@example.com'],
            [
                'password' => Hash::make('admin123'),
                'role_id' => $adminRole->role_id,
                'status' => 'active'
            ]
        );

        $this->command->info('Admin user created: admin@example.com / admin123');
    }
}
