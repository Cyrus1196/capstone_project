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
 * Admin, Student, Dean, Evaluator, Adviser, Program Head, Secretary — plus profiles where required.
 */
class CapstoneDemoTransactionSeeder extends Seeder
{
    public function run(): void
    {
        $roles = [
            ['role_name' => 'Adviser', 'access_level' => 3, 'description' => 'Adviser — credit review & student guidance'],
            ['role_name' => 'Evaluator', 'access_level' => 3, 'description' => 'Evaluator — student curriculum evaluation'],
            ['role_name' => 'Dean', 'access_level' => 2, 'description' => 'Dean'],
            ['role_name' => 'Program Head', 'access_level' => 7, 'description' => 'Program head — curriculum oversight'],
            ['role_name' => 'Secretary', 'access_level' => 4, 'description' => 'Secretary — records and lookup'],
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
            ['email' => 'adviser@example.com', 'password' => 'adviser123', 'role' => 'Adviser'],
            ['email' => 'evaluator@example.com', 'password' => 'evaluator123', 'role' => 'Evaluator'],
            ['email' => 'dean@example.com', 'password' => 'dean123', 'role' => 'Dean'],
            ['email' => 'programhead@example.com', 'password' => 'programhead123', 'role' => 'Program Head'],
            ['email' => 'secretary@example.com', 'password' => 'secretary123', 'role' => 'Secretary'],
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

            if ($acc['role'] === 'Evaluator' || $acc['role'] === 'Adviser') {
                $existing = FacultyProfile::where('user_id', $user->user_id)->first();
                if (!$existing && $department) {
                    FacultyProfile::create([
                        'user_id' => $user->user_id,
                        'first_name' => $acc['role'] === 'Adviser' ? 'Alex' : 'Jamie',
                        'last_name' => $acc['role'] === 'Adviser' ? 'Adviser' : 'Evaluator',
                        'employee_id' => $acc['role'] === 'Adviser' ? 'EMP-ADV-001' : 'EMP-EVL-001',
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

        $this->command->info(
            'Demo accounts: adviser@example.com / adviser123 | evaluator@example.com / evaluator123 | ' .
            'dean@example.com / dean123 | programhead@example.com / programhead123 | secretary@example.com / secretary123'
        );
    }
}
