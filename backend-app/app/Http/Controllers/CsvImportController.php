<?php

namespace App\Http\Controllers;

use App\Models\Evaluation;
use App\Models\Prerequisite;
use App\Models\Role;
use App\Models\SecuritySetting;
use App\Models\StudentProfile;
use App\Models\Subject;
use App\Models\TblUser;
use App\Services\StudentCurriculumEvaluationBuilder;
use Carbon\Carbon;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Validator;
use Illuminate\Validation\Rule;

class CsvImportController extends Controller
{
    /**
     * Available import types and their configurations
     */
    private $importTypes = [
        'users' => [
            'label' => 'Users',
            'table' => 'tbl_users',
            'required_columns' => ['email', 'password'],
            'optional_columns' => ['role_id', 'contact_number', 'status'],
            'validation_rules' => [
                'email' => 'required|email|unique:tbl_users,email',
                'password' => 'required|min:6',
                'role_id' => 'nullable|exists:tbl_roles,role_id',
                'status' => 'nullable|in:active,inactive',
            ],
        ],
        'subjects' => [
            'label' => 'Subjects',
            'table' => 'tbl_subjects',
            'required_columns' => ['subject_code', 'subject_name'],
            'optional_columns' => ['number_of_units', 'number_of_hrs'],
            'validation_rules' => [
                'subject_code' => 'required|string|max:50|unique:tbl_subjects,subject_code',
                'subject_name' => 'required|string|max:100',
                'number_of_units' => 'nullable|integer|min:1',
                'number_of_hrs' => 'nullable|integer|min:1',
            ],
        ],
        'departments' => [
            'label' => 'Departments',
            'table' => 'tbl_departments',
            'required_columns' => ['department_name'],
            'optional_columns' => ['department_code', 'campus_id'],
            'validation_rules' => [
                'department_name' => 'required|string|max:100',
                'department_code' => 'nullable|string|max:50',
                'campus_id' => 'nullable|exists:tbl_campus,campus_id',
            ],
        ],
        'programs' => [
            'label' => 'Programs',
            'table' => 'tbl_program',
            'required_columns' => ['department_id', 'program_name'],
            'optional_columns' => ['program_code', 'total_units_required'],
            'validation_rules' => [
                'department_id' => 'required|exists:tbl_departments,department_id',
                'program_name' => 'required|string|max:100',
                'program_code' => 'nullable|string|max:50',
                'total_units_required' => 'nullable|integer|min:1',
            ],
        ],
        'students' => [
            'label' => 'Students (account + profile)',
            'table' => 'tbl_student_profile',
            'required_columns' => ['student_id_number', 'first_name', 'last_name'],
            'optional_columns' => ['email', 'program_id', 'year_level_id', 'contact_number', 'address', 'academic_status', 'status', 'password'],
            'validation_rules' => [
            ],
        ],
        'grades' => [
            'label' => 'Student grades (evaluations)',
            'table' => 'tbl_evaluation',
            'required_columns' => ['student_id_number', 'subject_code', 'academic_year_id', 'semester_id'],
            'optional_columns' => ['section_id', 'grade', 'evaluation_status', 'enrolled_date', 'evaluation_date', 'modality_id', 'inc_compliance_deadline'],
            'validation_rules' => [
            ],
        ],
        'prerequisite_links' => [
            'label' => 'Prerequisite / corequisite links',
            'table' => 'tbl_prerequisite',
            'required_columns' => ['subject_code', 'requisite_subject_code', 'requisite_type'],
            'optional_columns' => [],
            'validation_rules' => [],
        ],
        'sis_mixed' => [
            'label' => 'Student data import (one CSV — all related records)',
            'table' => 'n/a',
            'required_columns' => ['record_type'],
            'optional_columns' => [
                'student_id_number', 'first_name', 'last_name', 'email', 'program_id', 'year_level_id',
                'contact_number', 'address', 'academic_status', 'status', 'password',
                'subject_code', 'academic_year_id', 'semester_id', 'section_id', 'grade', 'evaluation_status',
                'enrolled_date', 'evaluation_date', 'modality_id', 'inc_compliance_deadline',
                'requisite_subject_code', 'requisite_type',
            ],
            'validation_rules' => [],
            'column_groups' => [
                [
                    'title' => 'Every row',
                    'description' => 'Set record_type so the importer knows how to interpret the row.',
                    'columns' => ['record_type'],
                ],
                [
                    'title' => 'Student login and profile',
                    'description' => 'record_type student or account — updates or creates tbl_users and tbl_student_profile (match by student_id_number, then by student email).',
                    'columns' => [
                        'student_id_number', 'first_name', 'last_name', 'email', 'password',
                        'program_id', 'year_level_id', 'contact_number', 'address', 'academic_status', 'status',
                    ],
                ],
                [
                    'title' => 'Subject grades (evaluations)',
                    'description' => 'record_type grade or subject — one row per student, subject, academic year, and semester.',
                    'columns' => [
                        'student_id_number', 'subject_code', 'academic_year_id', 'semester_id', 'section_id',
                        'grade', 'evaluation_status', 'enrolled_date', 'evaluation_date', 'modality_id', 'inc_compliance_deadline',
                    ],
                ],
                [
                    'title' => 'Curriculum requisites',
                    'description' => 'record_type prerequisite — catalog rule between two subjects (not per-student).',
                    'columns' => ['subject_code', 'requisite_subject_code', 'requisite_type'],
                ],
            ],
        ],
    ];

    /**
     * @return array<string, mixed>
     */
    private function validationRulesForImportType(string $importTypeKey): array
    {
        if ($importTypeKey === 'prerequisite_links') {
            return [
                'subject_code' => ['required', 'string', 'max:50', Rule::exists('tbl_subjects', 'subject_code')],
                'requisite_subject_code' => ['required', 'string', 'max:50', Rule::exists('tbl_subjects', 'subject_code')],
                'requisite_type' => 'required|string|in:prerequisite,corequisite',
            ];
        }

        return $this->importTypes[$importTypeKey]['validation_rules'];
    }

    /**
     * Student CSV / SIS student rows: match by student_id_number (update profile + user), else by student email (link or update), else create login + profile (email + password required).
     *
     * @param  array<string, mixed>  $row  Normalized row
     * @return array<string, mixed>
     */
    private function studentAccountImportValidationRules(array $row): array
    {
        $max = SecuritySetting::current()->max_password_length;
        $sid = isset($row['student_id_number']) ? trim((string) $row['student_id_number']) : '';
        $profileBySid = $sid !== ''
            ? StudentProfile::query()->where('student_id_number', $sid)->orderBy('student_id')->first()
            : null;

        $base = [
            'first_name' => ['required', 'string', 'max:100'],
            'last_name' => ['required', 'string', 'max:100'],
            'program_id' => 'nullable|exists:tbl_program,program_id',
            'year_level_id' => 'nullable|exists:year_level,year_level_id',
            'contact_number' => 'nullable|string|max:20',
            'address' => 'nullable|string|max:500',
            'academic_status' => 'nullable|string|max:50',
            'status' => 'nullable|in:active,inactive',
        ];

        if ($profileBySid) {
            return array_merge($base, [
                'student_id_number' => ['required', 'string', 'max:50', Rule::exists('tbl_student_profile', 'student_id_number')],
                'email' => ['nullable', 'email'],
                'password' => ['nullable', 'string', 'min:6', 'max:' . $max],
            ]);
        }

        $email = isset($row['email']) ? trim((string) $row['email']) : '';
        $studentRoleId = Role::query()->where('role_name', 'Student')->value('role_id');
        $userByEmail = $email !== ''
            ? TblUser::with('role')->where('email', $email)->first()
            : null;

        if ($userByEmail && $userByEmail->hasRole('Student') && $studentRoleId) {
            $existingProfile = StudentProfile::query()
                ->where('user_id', $userByEmail->user_id)
                ->orderBy('student_id')
                ->first();

            return array_merge($base, [
                'student_id_number' => [
                    'required', 'string', 'max:50',
                    Rule::unique('tbl_student_profile', 'student_id_number')->ignore($existingProfile?->student_id, 'student_id'),
                ],
                'email' => ['required', 'email', Rule::exists('tbl_users', 'email')->where('role_id', (int) $studentRoleId)],
                'password' => ['nullable', 'string', 'min:6', 'max:' . $max],
            ]);
        }

        return array_merge($base, [
            'student_id_number' => ['required', 'string', 'max:50', Rule::unique('tbl_student_profile', 'student_id_number')],
            'email' => ['required', 'email', 'unique:tbl_users,email'],
            'password' => ['required', 'string', 'min:6', 'max:' . $max],
        ]);
    }

    /**
     * Unified SIS file: record_type = student | account | grade | subject | prerequisite.
     *
     * @param  array<string, mixed>  $row  Normalized row
     * @return array<string, mixed>
     */
    /**
     * @param  array<string, bool>  $pendingStudentIds  student_id_number => true from earlier rows in the same CSV (sis_mixed only)
     */
    private function sisMixedRowValidationRules(array $row, array $pendingStudentIds = []): array
    {
        $allowed = ['student', 'account', 'grade', 'subject', 'prerequisite'];
        $t = strtolower(trim((string) ($row['record_type'] ?? '')));
        $rules = [
            'record_type' => ['required', 'string', Rule::in($allowed)],
        ];
        if (! in_array($t, $allowed, true)) {
            return $rules;
        }

        return array_merge($rules, match ($t) {
            'student', 'account' => $this->studentAccountImportValidationRules($row),
            'grade', 'subject' => $this->gradesImportValidationRules($pendingStudentIds, true),
            'prerequisite' => $this->validationRulesForImportType('prerequisite_links'),
        });
    }

    /**
     * @param  array<string, mixed>  $row  Normalized row
     */
    private function importSisMixedRow(Request $request, array $row): void
    {
        $t = strtolower(trim((string) ($row['record_type'] ?? '')));
        match ($t) {
            'student', 'account' => $this->importStudentAccountFromSisRow($row),
            'grade', 'subject' => $this->importGradesEvaluationRow($request, $row),
            'prerequisite' => $this->importPrerequisiteLinkRow($row),
            default => throw new \RuntimeException('Invalid record_type.'),
        };
    }

    /**
     * Track student_id_number from student/account rows so grade rows later in the same file validate (preview + import).
     *
     * @param  array<string, mixed>  $row
     * @param  array<string, bool>  $pendingStudentIds
     */
    private function registerPendingSisMixedStudentId(array $row, array &$pendingStudentIds): void
    {
        $t = strtolower(trim((string) ($row['record_type'] ?? '')));
        if (! in_array($t, ['student', 'account'], true)) {
            return;
        }
        $sid = trim((string) ($row['student_id_number'] ?? ''));
        if ($sid !== '') {
            $pendingStudentIds[$sid] = true;
        }
    }

    /**
     * @param  array<string, bool>  $pendingStudentIds  For sis_mixed: IDs introduced by student/account rows above this line in the same file
     * @param  bool  $allowSidFromEarlierRowsInSameFile  true only for sis_mixed grade/subject rows
     * @return array<string, mixed>
     */
    private function gradesImportValidationRules(array $pendingStudentIds = [], bool $allowSidFromEarlierRowsInSameFile = false): array
    {
        $studentIdRules = ['required', 'string', 'max:50'];
        if ($allowSidFromEarlierRowsInSameFile) {
            $studentIdRules[] = function (string $attribute, mixed $value, \Closure $fail) use ($pendingStudentIds): void {
                $v = trim((string) $value);
                if ($v === '') {
                    return;
                }
                if (isset($pendingStudentIds[$v])) {
                    return;
                }
                if (! StudentProfile::query()->where('student_id_number', $v)->exists()) {
                    $fail('No student profile matches this student_id_number. Put a student or account row for this ID above the grade rows in the same file, or import the student first.');
                }
            };
        } else {
            $studentIdRules[] = Rule::exists('tbl_student_profile', 'student_id_number');
        }

        return [
            'student_id_number' => $studentIdRules,
            'subject_code' => ['required', 'string', 'max:50', Rule::exists('tbl_subjects', 'subject_code')],
            'academic_year_id' => ['required', 'integer', 'exists:tbl_academic_year,academic_year_id'],
            'semester_id' => ['required', 'integer', 'exists:tbl_semester,semester_id'],
            'section_id' => 'nullable|integer|exists:tbl_section,section_id',
            'grade' => 'nullable|string|max:10',
            'evaluation_status' => 'nullable|string|in:passed,failed,ongoing,dropped,incomplete,inc',
            'enrolled_date' => 'nullable|date',
            'evaluation_date' => 'nullable|date',
            'modality_id' => 'nullable|integer|exists:tbl_modality,modality_id',
            'inc_compliance_deadline' => 'nullable|date',
        ];
    }

    /**
     * @return array<string, mixed>
     */
    private function studentProfileAttributesFromRow(array $row): array
    {
        $sid = trim((string) $row['student_id_number']);
        $programId = $row['program_id'] ?? null;
        $yearId = $row['year_level_id'] ?? null;

        $attrs = [
            'student_number' => $sid,
            'student_id_number' => $sid,
            'first_name' => $row['first_name'],
            'last_name' => $row['last_name'],
            'contact_number' => $row['contact_number'] ?? null,
            'address' => $row['address'] ?? null,
            'academic_status' => $row['academic_status'] ?? 'active',
        ];

        // Only set when CSV provides a value — do not null out program/year on re-import of sparse rows.
        if ($programId !== null && $programId !== '') {
            $attrs['Current_Program'] = (int) $programId;
        }
        if ($yearId !== null && $yearId !== '') {
            $attrs['year_level_id'] = (int) $yearId;
        }

        return $attrs;
    }

    private function syncStudentProfileFromRow(StudentProfile $profile, array $row): void
    {
        $profile->fill($this->studentProfileAttributesFromRow($row));
        $profile->save();
    }

    /**
     * @param  array<string, mixed>  $row  Normalized row (empty strings → null)
     */
    private function syncStudentUserFromRow(TblUser $user, array $row): void
    {
        if (! $user->hasRole('Student')) {
            throw new \RuntimeException('Linked account is not a student user.');
        }

        $email = isset($row['email']) ? trim((string) $row['email']) : '';
        if ($email !== '' && strcasecmp($email, (string) $user->email) !== 0) {
            if (TblUser::query()->where('email', $email)->where('user_id', '!=', $user->user_id)->exists()) {
                throw new \RuntimeException('Email in file is already used by another account.');
            }
            $user->email = $email;
        }

        if (! empty(trim((string) ($row['password'] ?? '')))) {
            $user->password = $row['password'];
            $user->password_changed_at = now();
        }
        $user->contact_number = $row['contact_number'] ?? null;
        if (! empty($row['status'])) {
            $user->status = $row['status'];
        }
        $user->save();
    }

    /**
     * Create or update student login (tbl_users) and profile (tbl_student_profile) from one row.
     *
     * @param  array<string, mixed>  $row  Normalized row
     */
    private function importStudentAccountFromSisRow(array $row): void
    {
        $studentRoleId = Role::query()->where('role_name', 'Student')->value('role_id');
        if (! $studentRoleId) {
            throw new \RuntimeException('Student role not found.');
        }

        $sid = trim((string) $row['student_id_number']);
        $row['student_id_number'] = $sid;

        $profileBySid = StudentProfile::query()
            ->where('student_id_number', $sid)
            ->orderBy('student_id')
            ->first();

        if ($profileBySid) {
            $user = TblUser::with('role')->whereKey($profileBySid->user_id)->firstOrFail();
            $this->syncStudentProfileFromRow($profileBySid, $row);
            $this->syncStudentUserFromRow($user, $row);

            return;
        }

        $email = isset($row['email']) ? trim((string) $row['email']) : '';
        if ($email === '') {
            throw new \RuntimeException(
                'No student matches this student_id_number. Provide email to link an existing student account, or email and password to create a new account.'
            );
        }

        $user = TblUser::with('role')->where('email', $email)->first();
        if ($user) {
            if (! $user->hasRole('Student')) {
                throw new \RuntimeException('That email belongs to a non-student account.');
            }

            $profileByUser = StudentProfile::query()
                ->where('user_id', $user->user_id)
                ->orderBy('student_id')
                ->first();

            if ($profileByUser) {
                if ($profileByUser->student_id_number !== $sid) {
                    if (StudentProfile::query()
                        ->where('student_id_number', $sid)
                        ->where('student_id', '!=', $profileByUser->student_id)
                        ->exists()) {
                        throw new \RuntimeException('student_id_number is already used by another student.');
                    }
                }
                $this->syncStudentProfileFromRow($profileByUser, $row);
            } else {
                StudentProfile::create(array_merge(
                    ['user_id' => $user->user_id],
                    $this->studentProfileAttributesFromRow($row)
                ));
            }
            $this->syncStudentUserFromRow($user, $row);

            return;
        }

        if (trim((string) ($row['password'] ?? '')) === '') {
            throw new \RuntimeException('Password is required to create a new student account.');
        }

        $user = TblUser::create([
            'email' => $email,
            'password' => $row['password'],
            'contact_number' => $row['contact_number'] ?? null,
            'role_id' => (int) $studentRoleId,
            'status' => $row['status'] ?? 'active',
            'password_changed_at' => now(),
        ]);
        $user->load('role');

        StudentProfile::create(array_merge(
            ['user_id' => $user->user_id],
            $this->studentProfileAttributesFromRow($row)
        ));
    }

    private function normalizeEvalStatusForCsv(?string $status): ?string
    {
        if ($status === null) {
            return null;
        }
        $t = strtolower(trim($status));
        if ($t === '') {
            return null;
        }

        return $t === 'inc' ? 'incomplete' : $t;
    }

    /**
     * @param  array<string, mixed>  $payload  Mutable evaluation attributes (may omit keys on partial update)
     * @param  array<string, mixed>  $row
     */
    private function finalizeIncDeadlineForCsvEvaluation(array &$payload, array $row, ?Evaluation $existing = null): void
    {
        $effectiveStatus = array_key_exists('evaluation_status', $payload)
            ? $this->normalizeEvalStatusForCsv($payload['evaluation_status'])
            : $this->normalizeEvalStatusForCsv($existing?->evaluation_status);

        if (array_key_exists('evaluation_status', $payload)) {
            $payload['evaluation_status'] = $effectiveStatus;
        }

        if ($effectiveStatus !== 'incomplete') {
            if (array_key_exists('evaluation_status', $payload)) {
                $payload['inc_compliance_deadline'] = null;
            }

            return;
        }

        if (! empty($row['inc_compliance_deadline'])) {
            $payload['inc_compliance_deadline'] = Carbon::parse($row['inc_compliance_deadline'])->format('Y-m-d');
        } elseif ($existing && $existing->inc_compliance_deadline) {
            $payload['inc_compliance_deadline'] = $existing->inc_compliance_deadline->format('Y-m-d');
        } else {
            $evalDate = $payload['evaluation_date'] ?? $row['evaluation_date'] ?? null;
            if ($evalDate === null && $existing && $existing->evaluation_date) {
                $evalDate = $existing->evaluation_date->format('Y-m-d');
            }
            $anchor = Carbon::parse($evalDate ?? now())->startOfDay();
            $days = (int) config('academic.inc_default_compliance_days', 30);
            $proposed = $anchor->copy()->addDays($days);
            $today = Carbon::today();
            $payload['inc_compliance_deadline'] = $proposed->lt($today)
                ? $today->copy()->addDays($days)->format('Y-m-d')
                : $proposed->format('Y-m-d');
        }

        $d = $payload['inc_compliance_deadline'] ?? null;
        if ($d && Carbon::parse($d)->startOfDay()->lt(Carbon::today())) {
            $days = (int) config('academic.inc_default_compliance_days', 30);
            $payload['inc_compliance_deadline'] = Carbon::today()->copy()->addDays($days)->format('Y-m-d');
        }
    }

    /**
     * Upsert tbl_evaluation row keyed by student SIS id + subject + term (+ optional section).
     *
     * @param  array<string, mixed>  $row  Normalized row
     */
    private function importGradesEvaluationRow(Request $request, array $row): void
    {
        $profile = StudentProfile::query()
            ->where('student_id_number', $row['student_id_number'])
            ->orderBy('student_id')
            ->firstOrFail();

        $subject = Subject::query()->where('subject_code', $row['subject_code'])->firstOrFail();

        $academicYearId = (int) $row['academic_year_id'];
        $semesterId = (int) $row['semester_id'];
        $sectionId = isset($row['section_id']) && $row['section_id'] !== null && $row['section_id'] !== ''
            ? (int) $row['section_id']
            : null;

        $query = Evaluation::query()
            ->where('student_id', $profile->student_id)
            ->where('subject_id', $subject->subject_id)
            ->where('academic_year_id', $academicYearId)
            ->where('semester_id', $semesterId);
        if ($sectionId !== null) {
            $query->where('section_id', $sectionId);
        } else {
            $query->whereNull('section_id');
        }
        $evaluation = $query->first();

        if ($evaluation) {
            $payload = ['evaluated_by' => $request->user()->user_id];
            foreach (['grade', 'evaluation_status'] as $k) {
                if (array_key_exists($k, $row)) {
                    $payload[$k] = $k === 'evaluation_status'
                        ? $this->normalizeEvalStatusForCsv($row[$k])
                        : $row[$k];
                }
            }
            if (array_key_exists('modality_id', $row)) {
                $payload['modality_id'] = $row['modality_id'] !== null && $row['modality_id'] !== ''
                    ? (int) $row['modality_id']
                    : null;
            }
            foreach (['evaluation_date', 'enrolled_date'] as $k) {
                if (array_key_exists($k, $row)) {
                    $payload[$k] = ! empty($row[$k]) ? Carbon::parse($row[$k])->format('Y-m-d') : null;
                }
            }
            if (array_key_exists('section_id', $row)) {
                $payload['section_id'] = $sectionId;
            }
            $this->finalizeIncDeadlineForCsvEvaluation($payload, $row, $evaluation);
            $evaluation->fill($payload);
            $evaluation->save();
            app(StudentCurriculumEvaluationBuilder::class)->syncStudentProfileFromCurriculumProgress($profile);

            return;
        }

        $payload = [
            'grade' => $row['grade'] ?? null,
            'evaluation_status' => $this->normalizeEvalStatusForCsv($row['evaluation_status'] ?? null),
            'evaluated_by' => $request->user()->user_id,
            'modality_id' => isset($row['modality_id']) && $row['modality_id'] !== null && $row['modality_id'] !== ''
                ? (int) $row['modality_id']
                : null,
            'evaluation_date' => ! empty($row['evaluation_date']) ? Carbon::parse($row['evaluation_date'])->format('Y-m-d') : null,
            'enrolled_date' => ! empty($row['enrolled_date']) ? Carbon::parse($row['enrolled_date'])->format('Y-m-d') : null,
            'section_id' => $sectionId,
        ];
        $this->finalizeIncDeadlineForCsvEvaluation($payload, $row, null);

        Evaluation::create(array_merge([
            'student_id' => $profile->student_id,
            'subject_id' => $subject->subject_id,
            'academic_year_id' => $academicYearId,
            'semester_id' => $semesterId,
        ], $payload));
        app(StudentCurriculumEvaluationBuilder::class)->syncStudentProfileFromCurriculumProgress($profile);
    }

    /**
     * @param  array<string, mixed>  $row  Normalized row
     */
    private function importPrerequisiteLinkRow(array $row): void
    {
        $subject = Subject::query()->where('subject_code', $row['subject_code'])->firstOrFail();
        $requisite = Subject::query()->where('subject_code', $row['requisite_subject_code'])->firstOrFail();
        if ($subject->subject_id === $requisite->subject_id) {
            throw new \RuntimeException('A subject cannot be a prerequisite of itself.');
        }

        Prerequisite::query()->firstOrCreate(
            [
                'subject_id' => $subject->subject_id,
                'requisites_subject_id' => $requisite->subject_id,
                'requisite_type' => $row['requisite_type'],
            ],
            []
        );
    }

    /**
     * Get available import types
     */
    public function getImportTypes(Request $request)
    {
        try {
            if (! $request->user()?->canUseCsvImport()) {
                return response()->json(['message' => 'Unauthorized'], 403);
            }

            $types = [];
            foreach ($this->importTypes as $key => $config) {
                $entry = [
                    'key' => $key,
                    'label' => $config['label'],
                    'required_columns' => $config['required_columns'],
                    'optional_columns' => $config['optional_columns'],
                ];
                if (! empty($config['column_groups'])) {
                    $entry['column_groups'] = $config['column_groups'];
                }
                $types[] = $entry;
            }

            return response()->json($types);
        } catch (\Exception $e) {
            return response()->json([
                'error' => 'Failed to get import types',
                'message' => $e->getMessage()
            ], 500);
        }
    }

    /**
     * Preview CSV data before import
     */
    public function preview(Request $request)
    {
        try {
            if (! $request->user()?->canUseCsvImport()) {
                return response()->json(['message' => 'Unauthorized'], 403);
            }

            $validated = $request->validate([
                'import_type' => 'required|string|in:' . implode(',', array_keys($this->importTypes)),
                'csv_file' => 'required|file|mimes:csv,txt|max:2048',
            ]);

            $importType = $this->importTypes[$validated['import_type']];
            $file = $request->file('csv_file');
            
            // Parse CSV
            $data = $this->parseCsv($file);
            
            if (empty($data)) {
                return response()->json([
                    'error' => 'CSV file is empty or invalid'
                ], 400);
            }

            $headers = array_keys($data[0]);
            $requiredColumns = $importType['required_columns'];
            
            // Check for required columns
            $missingColumns = array_diff($requiredColumns, $headers);
            if (!empty($missingColumns)) {
                return response()->json([
                    'error' => 'Missing required columns',
                    'missing_columns' => array_values($missingColumns),
                    'required_columns' => $requiredColumns,
                    'found_columns' => $headers,
                ], 400);
            }

            // Validate first 5 rows for preview
            $preview = [];
            $validationErrors = [];
            /** @var array<string, bool> $pendingSisStudentIds */
            $pendingSisStudentIds = [];

            foreach (array_slice($data, 0, 5) as $index => $row) {
                $row = $this->normalizeCsvRow($row);
                $rowRules = match ($validated['import_type']) {
                    'students' => $this->studentAccountImportValidationRules($row),
                    'grades' => $this->gradesImportValidationRules(),
                    'sis_mixed' => $this->sisMixedRowValidationRules($row, $pendingSisStudentIds),
                    default => $this->validationRulesForImportType($validated['import_type']),
                };
                $rowValidation = $this->validateRow($row, $rowRules, $index + 1);
                $preview[] = [
                    'row_number' => $index + 1,
                    'data' => $row,
                    'valid' => $rowValidation['valid'],
                    'errors' => $rowValidation['errors'],
                ];

                if (! $rowValidation['valid']) {
                    $validationErrors[] = $rowValidation['errors'];
                } elseif ($validated['import_type'] === 'sis_mixed') {
                    $this->registerPendingSisMixedStudentId($row, $pendingSisStudentIds);
                }
            }

            $payload = [
                'total_rows' => count($data),
                'headers' => $headers,
                'required_columns' => $requiredColumns,
                'optional_columns' => $importType['optional_columns'],
                'preview' => $preview,
                'has_errors' => ! empty($validationErrors),
            ];
            if (! empty($importType['column_groups'])) {
                $payload['column_groups'] = $importType['column_groups'];
            }

            return response()->json($payload);
        } catch (\Exception $e) {
            Log::error('CSV Preview Error: ' . $e->getMessage());
            return response()->json([
                'error' => 'Failed to preview CSV',
                'message' => $e->getMessage()
            ], 500);
        }
    }

    /**
     * Import CSV data
     */
    public function import(Request $request)
    {
        try {
            if (! $request->user()?->canUseCsvImport()) {
                return response()->json(['message' => 'Unauthorized'], 403);
            }

            $validated = $request->validate([
                'import_type' => 'required|string|in:' . implode(',', array_keys($this->importTypes)),
                'csv_file' => 'required|file|mimes:csv,txt|max:2048',
            ]);

            $importType = $this->importTypes[$validated['import_type']];
            $file = $request->file('csv_file');
            
            // Parse CSV
            $data = $this->parseCsv($file);
            
            if (empty($data)) {
                return response()->json([
                    'error' => 'CSV file is empty or invalid'
                ], 400);
            }

            $results = [
                'total' => count($data),
                'imported' => 0,
                'failed' => 0,
                'errors' => [],
            ];

            DB::beginTransaction();

            /** @var array<string, bool> $pendingSisStudentIds */
            $pendingSisStudentIds = [];

            foreach ($data as $index => $row) {
                $rowNumber = $index + 1;
                $row = $this->normalizeCsvRow($row);

                $rowRules = match ($validated['import_type']) {
                    'students' => $this->studentAccountImportValidationRules($row),
                    'grades' => $this->gradesImportValidationRules(),
                    'sis_mixed' => $this->sisMixedRowValidationRules($row, $pendingSisStudentIds),
                    default => $this->validationRulesForImportType($validated['import_type']),
                };

                // Validate row
                $validation = $this->validateRow($row, $rowRules, $rowNumber);
                if (!$validation['valid']) {
                    $results['failed']++;
                    $results['errors'][] = [
                        'row' => $rowNumber,
                        'errors' => $validation['errors'],
                    ];
                    continue;
                }

                try {
                    if ($validated['import_type'] === 'students') {
                        DB::transaction(function () use ($row) {
                            $this->importStudentAccountFromSisRow($row);
                        });
                    } elseif ($validated['import_type'] === 'grades') {
                        DB::transaction(function () use ($request, $row) {
                            $this->importGradesEvaluationRow($request, $row);
                        });
                    } elseif ($validated['import_type'] === 'prerequisite_links') {
                        DB::transaction(function () use ($row) {
                            $this->importPrerequisiteLinkRow($row);
                        });
                    } elseif ($validated['import_type'] === 'sis_mixed') {
                        DB::transaction(function () use ($request, $row) {
                            $this->importSisMixedRow($request, $row);
                        });
                        $this->registerPendingSisMixedStudentId($row, $pendingSisStudentIds);
                    } else {
                        $insertData = $this->transformData($row, $validated['import_type']);
                        DB::table($importType['table'])->insert($insertData);
                    }
                    $results['imported']++;
                } catch (\Throwable $e) {
                    $results['failed']++;
                    $results['errors'][] = [
                        'row' => $rowNumber,
                        'errors' => ['Insert failed: ' . $e->getMessage()],
                    ];
                }
            }

            if ($results['imported'] === 0) {
                DB::rollBack();
                return response()->json([
                    'error' => 'No records were imported',
                    'results' => $results,
                ], 400);
            }

            DB::commit();

            Log::info("CSV Import: {$results['imported']} {$validated['import_type']} imported by user {$request->user()->user_id}");

            return response()->json([
                'message' => 'Import completed',
                'results' => $results,
            ]);
        } catch (\Exception $e) {
            DB::rollBack();
            Log::error('CSV Import Error: ' . $e->getMessage());
            return response()->json([
                'error' => 'Import failed',
                'message' => $e->getMessage()
            ], 500);
        }
    }

    /**
     * Download sample CSV template
     */
    public function downloadTemplate(Request $request, $importType)
    {
        try {
            if (! $request->user()?->canUseCsvImport()) {
                return response()->json(['message' => 'Unauthorized'], 403);
            }

            if (!isset($this->importTypes[$importType])) {
                return response()->json(['error' => 'Invalid import type'], 400);
            }

            $config = $this->importTypes[$importType];
            $headers = array_merge($config['required_columns'], $config['optional_columns']);
            
            // Create sample data
            $sampleData = [];
            
            switch ($importType) {
                case 'users':
                    $sampleData = [
                        ['john@example.com', 'password123', '2', 'active'],
                        ['jane@example.com', 'password123', '3', 'active'],
                    ];
                    break;
                case 'subjects':
                    $sampleData = [
                        ['ITE 101', 'Introduction to Programming', '3', '3'],
                        ['ITE 102', 'Data Structures', '3', '3'],
                    ];
                    break;
                case 'departments':
                    $sampleData = [
                        ['Information Technology', 'IT', '1'],
                        ['Computer Science', 'CS', '1'],
                    ];
                    break;
                case 'programs':
                    $sampleData = [
                        ['1', 'BSIT', 'Bachelor of Science in Information Technology', '150'],
                        ['1', 'BSCS', 'Bachelor of Science in Computer Science', '150'],
                    ];
                    break;
                case 'students':
                    $sampleData = [
                        ['2025-SIS-0001', 'Alex', 'Rivera', 'alex@school.edu', '1', '1', '09123456789', 'Manila', 'active', 'active', ''],
                        ['2025-SIS-NEW-01', 'Sam', 'New', 'sam.new@school.edu', '1', '1', '', '', 'active', 'active', 'ChangeMe123!'],
                    ];
                    break;
                case 'grades':
                    $sampleData = [
                        ['2025-SIS-0001', 'ITE 101', '1', '1', '', '1.25', 'passed', '2025-08-15', '2025-12-15', '', ''],
                    ];
                    break;
                case 'prerequisite_links':
                    $sampleData = [
                        ['ITE 102', 'ITE 101', 'prerequisite'],
                        ['ITE 103', 'ITE 102', 'prerequisite'],
                    ];
                    break;
                case 'sis_mixed':
                    $headers = array_merge(
                        $this->importTypes['sis_mixed']['required_columns'],
                        $this->importTypes['sis_mixed']['optional_columns']
                    );
                    $empty = array_fill(0, count($headers), '');
                    $rowStudent = $empty;
                    $rowStudent[array_search('record_type', $headers, true)] = 'student';
                    $rowStudent[array_search('student_id_number', $headers, true)] = '2025-SIS-0001';
                    $rowStudent[array_search('first_name', $headers, true)] = 'Alex';
                    $rowStudent[array_search('last_name', $headers, true)] = 'Rivera';
                    $rowStudent[array_search('email', $headers, true)] = 'alex@school.edu';
                    $rowStudent[array_search('program_id', $headers, true)] = '1';
                    $rowStudent[array_search('year_level_id', $headers, true)] = '1';
                    $rowStudent[array_search('contact_number', $headers, true)] = '09123456789';
                    $rowStudent[array_search('address', $headers, true)] = 'Manila';
                    $rowStudent[array_search('academic_status', $headers, true)] = 'active';
                    $rowStudent[array_search('status', $headers, true)] = 'active';

                    $rowAccount = $empty;
                    $rowAccount[array_search('record_type', $headers, true)] = 'account';
                    $rowAccount[array_search('student_id_number', $headers, true)] = '2025-SIS-NEW-01';
                    $rowAccount[array_search('first_name', $headers, true)] = 'Sam';
                    $rowAccount[array_search('last_name', $headers, true)] = 'New';
                    $rowAccount[array_search('email', $headers, true)] = 'sam.new@school.edu';
                    $rowAccount[array_search('password', $headers, true)] = 'ChangeMe123!';
                    $rowAccount[array_search('program_id', $headers, true)] = '1';
                    $rowAccount[array_search('year_level_id', $headers, true)] = '1';
                    $rowAccount[array_search('academic_status', $headers, true)] = 'active';
                    $rowAccount[array_search('status', $headers, true)] = 'active';

                    $rowGrade = $empty;
                    $rowGrade[array_search('record_type', $headers, true)] = 'grade';
                    $rowGrade[array_search('student_id_number', $headers, true)] = '2025-SIS-0001';
                    $rowGrade[array_search('subject_code', $headers, true)] = 'ITE 101';
                    $rowGrade[array_search('academic_year_id', $headers, true)] = '1';
                    $rowGrade[array_search('semester_id', $headers, true)] = '1';
                    $rowGrade[array_search('grade', $headers, true)] = '1.25';
                    $rowGrade[array_search('evaluation_status', $headers, true)] = 'passed';
                    $rowGrade[array_search('enrolled_date', $headers, true)] = '2025-08-15';
                    $rowGrade[array_search('evaluation_date', $headers, true)] = '2025-12-15';

                    $rowPrereq = $empty;
                    $rowPrereq[array_search('record_type', $headers, true)] = 'prerequisite';
                    $rowPrereq[array_search('subject_code', $headers, true)] = 'ITE 102';
                    $rowPrereq[array_search('requisite_subject_code', $headers, true)] = 'ITE 101';
                    $rowPrereq[array_search('requisite_type', $headers, true)] = 'prerequisite';

                    $sampleData = [$rowStudent, $rowAccount, $rowGrade, $rowPrereq];
                    break;
            }

            // Generate CSV content
            $csvContent = implode(',', $headers) . "\n";
            foreach ($sampleData as $row) {
                $csvContent .= implode(',', $row) . "\n";
            }

            $filename = "{$importType}_template.csv";
            
            return response($csvContent)
                ->header('Content-Type', 'text/csv')
                ->header('Content-Disposition', "attachment; filename=\"{$filename}\"");
        } catch (\Exception $e) {
            return response()->json([
                'error' => 'Failed to generate template',
                'message' => $e->getMessage()
            ], 500);
        }
    }

    /**
     * Treat blank cells as null so nullable FK rules pass on optional columns.
     *
     * @param  array<string, mixed>  $row
     * @return array<string, mixed>
     */
    private function normalizeCsvRow(array $row): array
    {
        $out = [];
        foreach ($row as $key => $value) {
            if ($value === null) {
                $out[$key] = null;

                continue;
            }
            if (is_string($value)) {
                $trimmed = trim($value);
                $out[$key] = $trimmed === '' ? null : $trimmed;

                continue;
            }
            $out[$key] = $value;
        }

        return $out;
    }

    /**
     * Parse CSV file into array
     */
    private function parseCsv($file): array
    {
        $data = [];
        $handle = fopen($file->getPathname(), 'r');
        
        if (!$handle) {
            throw new \Exception('Could not open CSV file');
        }

        // Get headers
        $headers = fgetcsv($handle);
        if (!$headers) {
            fclose($handle);
            return [];
        }

        // Trim headers
        $headers = array_map('trim', $headers);

        // Read data rows
        $headerCount = count($headers);
        while (($row = fgetcsv($handle)) !== false) {
            $n = count($row);
            if ($n < $headerCount) {
                $row = array_pad($row, $headerCount, '');
            } elseif ($n > $headerCount) {
                $row = array_slice($row, 0, $headerCount);
            }

            $data[] = array_combine($headers, $row);
        }

        fclose($handle);
        return $data;
    }

    /**
     * Validate a single row
     */
    private function validateRow(array $row, array $rules, int $rowNumber): array
    {
        $validator = Validator::make($row, $rules);
        
        if ($validator->fails()) {
            return [
                'valid' => false,
                'errors' => $validator->errors()->all(),
            ];
        }

        return [
            'valid' => true,
            'errors' => [],
        ];
    }

    /**
     * Transform data before insertion
     */
    private function transformData(array $row, string $importType): array
    {
        $data = [];

        switch ($importType) {
            case 'users':
                $data = [
                    'email' => $row['email'],
                    'password' => bcrypt($row['password']),
                    'role_id' => $row['role_id'] ?? 5, // Default to Student
                    'contact_number' => $row['contact_number'] ?? null,
                    'status' => $row['status'] ?? 'active',
                ];
                break;

            case 'subjects':
                $data = [
                    'subject_code' => $row['subject_code'],
                    'subject_name' => $row['subject_name'],
                    'number_of_units' => $row['number_of_units'] ?? null,
                    'number_of_hrs' => $row['number_of_hrs'] ?? null,
                ];
                break;

            case 'departments':
                $data = [
                    'department_name' => $row['department_name'],
                    'department_code' => $row['department_code'] ?? null,
                    'campus_id' => $row['campus_id'] ?? 1, // Default campus
                ];
                break;

            case 'programs':
                // Get campus_id from department
                $department = DB::table('tbl_departments')
                    ->where('department_id', $row['department_id'])
                    ->first();
                
                $data = [
                    'department_id' => $row['department_id'],
                    'campus_id' => $department->campus_id ?? 1,
                    'program_code' => $row['program_code'] ?? null,
                    'program_name' => $row['program_name'],
                    'total_units_required' => $row['total_units_required'] ?? null,
                ];
                break;
        }

        return $data;
    }
}
