<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;
use App\Models\TblUser;
use App\Models\Role;
use App\Models\Program;
use App\Models\Department;
use App\Models\FacultyProfile;
use App\Models\DeanProfile;

/**
 * Seeds roles and demo accounts so capstone "core transactions" can be tested:
 * Admin, Student, Dean, Faculty, Adviser, Guest — plus dean/faculty profiles where required by middleware.
 */
class CapstoneDemoTransactionSeeder extends Seeder
{
    public function run(): void
    {
        $roles = [
            ['role_name' => 'Guest', 'access_level' => 10, 'description' => 'Read-only catalog access'],
            ['role_name' => 'Adviser', 'access_level' => 3, 'description' => 'Adviser — credit review & student guidance'],
            ['role_name' => 'Faculty', 'access_level' => 3, 'description' => 'Faculty'],
            ['role_name' => 'Dean', 'access_level' => 2, 'description' => 'Dean'],
            ['role_name' => 'Student', 'access_level' => 5, 'description' => 'Student'],
            ['role_name' => 'Admin', 'access_level' => 1, 'description' => 'Administrator'],
        ];

        foreach ($roles as $r) {
            Role::firstOrCreate(
                ['role_name' => $r['role_name']],
                ['access_level' => $r['access_level'], 'description' => $r['description']]
            );
        }

        $program = Program::first();
        $department = Department::first();

        $accounts = [
            ['email' => 'guest@example.com', 'password' => 'guest123', 'role' => 'Guest'],
            ['email' => 'adviser@example.com', 'password' => 'adviser123', 'role' => 'Adviser'],
            ['email' => 'faculty@example.com', 'password' => 'faculty123', 'role' => 'Faculty'],
            ['email' => 'dean@example.com', 'password' => 'dean123', 'role' => 'Dean'],
        ];

        foreach ($accounts as $acc) {
            $role = Role::where('role_name', $acc['role'])->first();
            if (!$role) {
                continue;
            }
            $hash = Hash::make($acc['password']);
            $user = TblUser::whereEmail($acc['email'])->first();
            if (!$user) {
                $user = TblUser::create([
                    'email' => $acc['email'],
                    'password' => $acc['password'],
                    'role_id' => $role->role_id,
                    'status' => 'active',
                ]);
                DB::table('tbl_users')->where('user_id', $user->user_id)->update([
                    'Password' => $hash,
                    'Email' => $acc['email'],
                ]);
            } else {
                DB::table('tbl_users')->where('user_id', $user->user_id)->update([
                    'role_id' => $role->role_id,
                    'Password' => $hash,
                    'Email' => $acc['email'],
                    'status' => 'active',
                ]);
            }

            if ($acc['role'] === 'Faculty' || $acc['role'] === 'Adviser') {
                $existing = FacultyProfile::where('user_id', $user->user_id)->first();
                if (!$existing && $department) {
                    FacultyProfile::create([
                        'user_id' => $user->user_id,
                        'first_name' => $acc['role'] === 'Adviser' ? 'Alex' : 'Jamie',
                        'last_name' => $acc['role'] === 'Adviser' ? 'Adviser' : 'Faculty',
                        'employee_id' => $acc['role'] === 'Adviser' ? 'EMP-ADV-001' : 'EMP-FAC-001',
                        'department_id' => $department->department_id,
                        'specialization' => 'Information Technology',
                    ]);
                }
            }

            if ($acc['role'] === 'Dean' && $program) {
                $existingDean = DeanProfile::where('user_id', $user->user_id)->first();
                if (!$existingDean) {
                    DeanProfile::create([
                        'user_id' => $user->user_id,
                        'program_id' => $program->program_id,
                    ]);
                }
            }
        }

        $this->command->info('Demo accounts: guest@example.com / guest123 | adviser@example.com / adviser123 | faculty@example.com / faculty123 | dean@example.com / dean123');
    }
}
