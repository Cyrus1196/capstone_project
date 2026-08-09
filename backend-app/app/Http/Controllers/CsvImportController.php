<?php

namespace App\Http\Controllers;

use App\Models\Evaluation;
use App\Models\Prerequisite;
use App\Models\Program;
use App\Models\Role;
use App\Models\SecuritySetting;
use App\Models\Semester;
use App\Models\AcademicYear;
use App\Models\StudentProfile;
use App\Models\Subject;
use App\Models\TblUser;
use App\Models\YearLevel;
use App\Services\GradeScaleHelper;
use App\Services\SisGradeDeliberationImportParser;
use App\Services\StudentCurriculumEvaluationBuilder;
use App\Services\SubjectImportResolver;
use Carbon\Carbon;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Validator;
use Illuminate\Validation\Rule;

class CsvImportController extends Controller
{
    /**
     * Max data rows to validate and return in CSV preview (full file is still imported).
     * Keeps preview responses and validation time bounded for very large uploads.
     */
    private const CSV_PREVIEW_MAX_ROWS = 500;

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
        'sis_grade_deliberation' => [
            'label' => 'SIS Grade Deliberation export (tab or CSV — per subject grades)',
            'table' => 'tbl_evaluation',
            'required_columns' => ['student_id_number', 'subject_code', 'academic_year_id', 'semester_id'],
            'optional_columns' => ['section_id', 'grade', 'evaluation_status', 'modality_id'],
            'validation_rules' => [],
            'column_groups' => [
                [
                    'title' => 'Grade Deliberation export (SESSION … REMARKS)',
                    'description' => 'Standard SIS Grade Deliberation CSV/tab export. Extra instructor columns between SECTION and MODALITY are supported.',
                    'columns' => [
                        'SESSION',
                        'COLLEGE',
                        'COURSE',
                        'STUDENT ID',
                        'NAME',
                        'YEAR LEVEL',
                        'SEMESTER',
                        'CODE',
                        'SUBJECT NAME',
                        'SUBJECT TYPE',
                        'UNITS',
                        'SECTION',
                        'TEACHER 1',
                        'SECTION 2',
                        'TEACHER 2',
                        'MODALITY',
                        'ENLISTMENT MODE',
                        'ADMISSION TYPE',
                        'GENDER',
                        'P1',
                        'P2',
                        'P3',
                        'GRADE',
                        'REMARKS',
                    ],
                ],
                [
                    'title' => 'Alternate SIS grade sheet (IDNO … REMARKS_FINAL)',
                    'description' => 'Excel grade sheet with IDNO / SY / SUBJECT CODE headers is also accepted. Grade is read from GRADE, FINAL GRADE, or GRADE_FINAL; remarks from REMARKS or REMARKS_FINAL. SY + SEMESTER columns are combined for academic year/term mapping (e.g. SY 2023-2024 + 1st Semester).',
                    'columns' => [
                        'IDNO',
                        'NAME',
                        'COURSE',
                        'MAJOR',
                        'YEAR',
                        'SEMESTER',
                        'SY',
                        'SECTION',
                        'SUBJECT CODE',
                        'UNITS',
                        'GRADE',
                        'REMARKS',
                        'FACULTY',
                        'SUBJECT DESCRIPTION',
                        'RE-GRADE',
                        'FINAL GRADE',
                        'COMPLETION GRADE',
                        'GRADE_P',
                        'GRADE_M',
                        'GRADE_F',
                        'GRADE_FINAL',
                        'REMARKS_P',
                        'REMARKS_M',
                        'REMARKS_F',
                        'REMARKS_FINAL',
                    ],
                ],
                [
                    'title' => 'SESSION column',
                    'description' => 'Example: SY 25-26 SEM 1 or SY 25-26 SEM II. SESSION must match Lookup Academic Year in the database (SY 25-26 → 2025-2026). If the year is missing it is created as 2025-2026. SEM 1 / SEM I / SEM II sets semester. Optional form overrides: academic_year_id + semester_id.',
                    'columns' => [],
                ],
                [
                    'title' => 'Mapped system fields',
                    'description' => 'Each row becomes one tbl_evaluation upsert: student_id_number, subject_code, academic_year_id, semester_id, optional section_id (by section code), grade, evaluation_status (from REMARKS), modality_id.',
                    'columns' => ['student_id_number', 'subject_code', 'academic_year_id', 'semester_id', 'section_id', 'grade', 'evaluation_status', 'modality_id'],
                ],
            ],
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
            'grade' => 'nullable|string|max:20',
            'evaluation_status' => 'nullable|string|in:passed,failed,ongoing,dropped,incomplete,inc,complete',
            'enrolled_date' => 'nullable|date',
            'evaluation_date' => 'nullable|date',
            'modality_id' => 'nullable|integer|exists:tbl_modality,modality_id',
            'inc_compliance_deadline' => 'nullable|date',
        ];
    }

    /**
     * Grade Deliberation rows can introduce student profiles because the report includes
     * STUDENT ID, NAME, COURSE, and YEAR columns.
     *
     * @return array<string, mixed>
     */
    private function gradeDeliberationImportValidationRules(): array
    {
        $rules = $this->gradesImportValidationRules([], true);
        $rules['student_id_number'] = ['required', 'string', 'max:50'];

        return $rules;
    }

    /**
     * @param  array<string, mixed>  $row
     * @return list<string>
     */
    private function gradeDeliberationStudentMetadataErrors(array $row): array
    {
        $sid = trim((string) ($row['student_id_number'] ?? ''));
        if ($sid === '' || StudentProfile::query()->where('student_id_number', $sid)->exists()) {
            return [];
        }

        $errors = [];
        if (trim((string) ($row['_sis_student_name'] ?? '')) === '') {
            $errors[] = 'New student row is missing NAME.';
        }
        if (! $this->resolveSisProgramId($row)) {
            $errors[] = 'Could not match COURSE to an existing program.';
        }
        if (! $this->resolveSisYearLevelId($row)) {
            $errors[] = 'Could not match YEAR LEVEL / SEMESTER to an existing year level.';
        }

        return $errors;
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
    private function resolvePassingGradeForImport(StudentProfile $profile, Subject $subject): float
    {
        return app(GradeScaleHelper::class)->resolvePassingGradeForSubject(
            $profile->Current_Program ?? null,
            (int) $subject->subject_id
        );
    }

    /**
     * @param  array<string, mixed>  $row
     * @return array<string, mixed>
     */
    private function normalizeImportedGradeRow(array $row, StudentProfile $profile, Subject $subject): array
    {
        $helper = app(GradeScaleHelper::class);
        $passingGrade = $this->resolvePassingGradeForImport($profile, $subject);
        $normalized = $helper->normalizeForImport(
            isset($row['grade']) ? (string) $row['grade'] : null,
            isset($row['evaluation_status']) ? (string) $row['evaluation_status'] : null,
            $passingGrade
        );

        if (($normalized['evaluation_status'] ?? null) === 'complete') {
            $row['grade'] = null;
        } elseif (array_key_exists('grade', $row) || $normalized['grade'] !== null) {
            $row['grade'] = $normalized['grade'];
        }
        if ($normalized['evaluation_status'] !== null) {
            $row['evaluation_status'] = $normalized['evaluation_status'];
        }

        return $row;
    }

    /**
     * Map SIS subject codes to the curriculum canonical code when duplicates differ by spacing.
     *
     * @param  array<string, mixed>  $row
     * @return array<string, mixed>
     */
    private function resolveGradeImportRowSubjectCode(array $row): array
    {
        $importedCode = trim((string) ($row['subject_code'] ?? ''));
        if ($importedCode === '') {
            return $row;
        }

        $profile = StudentProfile::query()
            ->where('student_id_number', trim((string) ($row['student_id_number'] ?? '')))
            ->orderBy('student_id')
            ->first();

        $programId = $this->resolveSisProgramId($row);
        if (! $programId && $profile?->Current_Program) {
            $programId = (int) $profile->Current_Program;
        }

        $subject = app(SubjectImportResolver::class)->resolve($programId, $importedCode);
        if (! $subject || strtoupper($subject->subject_code) === strtoupper($importedCode)) {
            return $row;
        }

        $row['_sis_import_subject_code'] = $importedCode;
        $row['subject_code'] = $subject->subject_code;

        return $row;
    }

    /**
     * @param  array<string, mixed>  $row
     */
    private function resolveProgramIdForGradeImport(array $row, StudentProfile $profile): ?int
    {
        $fromRow = $this->resolveSisProgramId($row);
        if ($fromRow) {
            return $fromRow;
        }

        return $profile->Current_Program ? (int) $profile->Current_Program : null;
    }

    private function resolveSubjectForGradeImport(array $row, StudentProfile $profile): Subject
    {
        $resolver = app(SubjectImportResolver::class);
        $programId = $this->resolveProgramIdForGradeImport($row, $profile);
        $importedCode = (string) ($row['subject_code'] ?? '');
        $subject = $resolver->resolve($programId, $importedCode);
        if (! $subject) {
            throw new \RuntimeException('Subject not found: ' . $importedCode);
        }

        return $subject;
    }

    /**
     * @param  list<int>  $aliasSubjectIds
     */
    private function removeAliasGradeEvaluations(
        StudentProfile $profile,
        int $academicYearId,
        int $semesterId,
        ?int $sectionId,
        array $aliasSubjectIds
    ): void {
        if ($aliasSubjectIds === []) {
            return;
        }

        $query = Evaluation::query()
            ->where('student_id', $profile->student_id)
            ->whereIn('subject_id', $aliasSubjectIds)
            ->where('academic_year_id', $academicYearId)
            ->where('semester_id', $semesterId);
        if ($sectionId !== null) {
            $query->where('section_id', $sectionId);
        } else {
            $query->whereNull('section_id');
        }
        $query->delete();
    }

    private function importGradesEvaluationRow(Request $request, array $row): void
    {
        $profile = StudentProfile::query()
            ->where('student_id_number', $row['student_id_number'])
            ->orderBy('student_id')
            ->firstOrFail();

        $importedSubjectCode = (string) ($row['subject_code'] ?? '');
        $subject = $this->resolveSubjectForGradeImport($row, $profile);
        $row['subject_code'] = $subject->subject_code;
        $row = $this->normalizeImportedGradeRow($row, $profile, $subject);

        $academicYearId = (int) $row['academic_year_id'];
        $semesterId = (int) $row['semester_id'];
        $sectionId = isset($row['section_id']) && $row['section_id'] !== null && $row['section_id'] !== ''
            ? (int) $row['section_id']
            : null;

        $aliasSubjectIds = app(SubjectImportResolver::class)->aliasSubjectIds($subject, $importedSubjectCode);
        $this->removeAliasGradeEvaluations($profile, $academicYearId, $semesterId, $sectionId, $aliasSubjectIds);

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
            'graded_under_program_id' => $profile->current_program !== null && $profile->current_program !== ''
                ? (int) $profile->current_program
                : null,
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
                'csv_file' => 'required|file|mimes:csv,txt|max:10240',
                'academic_year_id' => 'nullable|integer|exists:tbl_academic_year,academic_year_id',
                'semester_id' => 'nullable|integer|exists:tbl_semester,semester_id',
            ]);

            $ayOverride = $validated['academic_year_id'] ?? null;
            $semOverride = $validated['semester_id'] ?? null;
            if (($ayOverride === null) !== ($semOverride === null)) {
                return response()->json([
                    'error' => 'Provide both academic_year_id and semester_id for a term override, or omit both to infer from SESSION.',
                ], 422);
            }

            $importType = $this->importTypes[$validated['import_type']];
            $file = $request->file('csv_file');

            if ($validated['import_type'] === 'sis_grade_deliberation') {
                $parser = new SisGradeDeliberationImportParser;
                $data = $parser->parseFileToGradeRows($file, $ayOverride, $semOverride);
            } else {
                $data = $this->parseCsv($file);
            }

            if (empty($data)) {
                return response()->json([
                    'error' => 'CSV file is empty or invalid'
                ], 400);
            }

            $headers = array_keys($data[0]);
            $requiredColumns = $importType['required_columns'];

            // Check for required columns
            $missingColumns = array_diff($requiredColumns, $headers);
            if (! empty($missingColumns)) {
                return response()->json([
                    'error' => 'Missing required columns',
                    'missing_columns' => array_values($missingColumns),
                    'required_columns' => $requiredColumns,
                    'found_columns' => $headers,
                ], 400);
            }

            $previewHeaders = $validated['import_type'] === 'sis_grade_deliberation'
                ? $this->sisGradeDeliberationPreviewHeaders($data)
                : $headers;

            $totalRows = count($data);
            $previewSlice = array_slice($data, 0, self::CSV_PREVIEW_MAX_ROWS);

            $preview = [];
            $validationErrors = [];
            /** @var array<string, bool> $pendingSisStudentIds */
            $pendingSisStudentIds = [];

            foreach ($previewSlice as $index => $row) {
                $row = $this->normalizeCsvRow($row);
                $rowNumber = $index + 1;
                $rowRules = match ($validated['import_type']) {
                    'students' => $this->studentAccountImportValidationRules($row),
                    'grades' => $this->gradesImportValidationRules(),
                    'sis_grade_deliberation' => $this->gradeDeliberationImportValidationRules(),
                    'sis_mixed' => $this->sisMixedRowValidationRules($row, $pendingSisStudentIds),
                    default => $this->validationRulesForImportType($validated['import_type']),
                };
                $rowValidation = $this->validateRow($row, $rowRules, $rowNumber);
                if ($validated['import_type'] === 'sis_grade_deliberation'
                    && (($row['academic_year_id'] ?? null) === null || ($row['semester_id'] ?? null) === null)) {
                    $rowValidation['valid'] = false;
                    $rowValidation['errors'][] = 'Could not infer term from SESSION. Add academic_year_id and semester_id to the import request, or align tbl_academic_year names with the export (e.g. include 2025 and 2026).';
                }
                if ($validated['import_type'] === 'sis_grade_deliberation') {
                    $metadataErrors = $this->gradeDeliberationStudentMetadataErrors($row);
                    if ($metadataErrors !== []) {
                        $rowValidation['valid'] = false;
                        array_push($rowValidation['errors'], ...$metadataErrors);
                    }
                }
                if ($rowValidation['valid'] && in_array($validated['import_type'], ['grades', 'sis_grade_deliberation'], true)) {
                    $row = $this->resolveGradeImportRowSubjectCode($row);
                }
                $preview[] = [
                    'row_number' => $rowNumber,
                    'data' => $validated['import_type'] === 'sis_grade_deliberation'
                        ? $this->sisGradeDeliberationPreviewRowData($row)
                        : $row,
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
                'total_rows' => $totalRows,
                'preview_rows_shown' => count($preview),
                'preview_truncated' => $totalRows > self::CSV_PREVIEW_MAX_ROWS,
                'headers' => $previewHeaders,
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
                'csv_file' => 'required|file|mimes:csv,txt|max:10240',
                'academic_year_id' => 'nullable|integer|exists:tbl_academic_year,academic_year_id',
                'semester_id' => 'nullable|integer|exists:tbl_semester,semester_id',
            ]);

            $ayOverride = $validated['academic_year_id'] ?? null;
            $semOverride = $validated['semester_id'] ?? null;
            if (($ayOverride === null) !== ($semOverride === null)) {
                return response()->json([
                    'error' => 'Provide both academic_year_id and semester_id for a term override, or omit both to infer from SESSION.',
                ], 422);
            }

            $importType = $this->importTypes[$validated['import_type']];
            $file = $request->file('csv_file');

            if ($validated['import_type'] === 'sis_grade_deliberation') {
                $parser = new SisGradeDeliberationImportParser;
                $data = $parser->parseFileToGradeRows($file, $ayOverride, $semOverride);
            } else {
                $data = $this->parseCsv($file);
            }

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
                    'sis_grade_deliberation' => $this->gradeDeliberationImportValidationRules(),
                    'sis_mixed' => $this->sisMixedRowValidationRules($row, $pendingSisStudentIds),
                    default => $this->validationRulesForImportType($validated['import_type']),
                };

                // Validate row
                $validation = $this->validateRow($row, $rowRules, $rowNumber);
                if ($validated['import_type'] === 'sis_grade_deliberation'
                    && (($row['academic_year_id'] ?? null) === null || ($row['semester_id'] ?? null) === null)) {
                    $validation['valid'] = false;
                    $validation['errors'][] = 'Could not infer term from SESSION. Add academic_year_id and semester_id to the import request.';
                }
                if ($validated['import_type'] === 'sis_grade_deliberation') {
                    $metadataErrors = $this->gradeDeliberationStudentMetadataErrors($row);
                    if ($metadataErrors !== []) {
                        $validation['valid'] = false;
                        array_push($validation['errors'], ...$metadataErrors);
                    }
                }
                if ($validation['valid'] && in_array($validated['import_type'], ['grades', 'sis_grade_deliberation'], true)) {
                    $row = $this->resolveGradeImportRowSubjectCode($row);
                }
                if (! $validation['valid']) {
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
                            $this->importGradesEvaluationRow($request, $this->stripSisImportMetadata($row));
                        });
                    } elseif ($validated['import_type'] === 'sis_grade_deliberation') {
                        DB::transaction(function () use ($request, $row) {
                            $this->importGradeDeliberationRow($request, $row);
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
                case 'sis_grade_deliberation':
                    $headers = [
                        'SESSION',
                        'COLLEGE',
                        'COURSE',
                        'STUDENT ID',
                        'NAME',
                        'YEAR LEVEL',
                        'SEMESTER',
                        'CODE',
                        'SUBJECT NAME',
                        'SUBJECT TYPE',
                        'UNITS',
                        'SECTION',
                        'TEACHER 1',
                        'SECTION 2',
                        'TEACHER 2',
                        'MODALITY',
                        'ENLISTMENT MODE',
                        'ADMISSION TYPE',
                        'GENDER',
                        'P1',
                        'P2',
                        'P3',
                        'GRADE',
                        'REMARKS',
                    ];
                    $sampleData = [
                        [
                            'SY 25-26 SEM I',
                            'College of Information Technology Education',
                            'Bachelor of Science in Information Technology',
                            "'25-0001",
                            'DELA CRUZ, ANA SANTOS',
                            'YEAR 1',
                            'Y1S1',
                            'ITE 101',
                            'Introduction to Computing',
                            'Lecture',
                            '3',
                            'COC-FAB-IT1-01',
                            'JUAN FACULTY',
                            'COC-FAB-IT1-01',
                            'MARIA FACULTY',
                            'FLEX',
                            'Regular',
                            'Regular',
                            'Female',
                            '85',
                            '88',
                            '90',
                            '1.75',
                            'Passed',
                        ],
                        [
                            'SY 25-26 SEM I',
                            'College of Information Technology Education',
                            'Bachelor of Science in Information Technology',
                            "'25-0002",
                            'REYES, MIGUEL CRUZ',
                            'YEAR 1',
                            'Y1S1',
                            'ITE 101',
                            'Introduction to Computing',
                            'Lecture',
                            '3',
                            'COC-FAB-IT1-01',
                            'JUAN FACULTY',
                            'COC-FAB-IT1-01',
                            'MARIA FACULTY',
                            'FLEX',
                            'Regular',
                            'Regular',
                            'Male',
                            '82',
                            '86',
                            '88',
                            '2.00',
                            'Passed',
                        ],
                        [
                            'SY 25-26 SEM I',
                            'College of Information Technology Education',
                            'Bachelor of Science in Information Technology',
                            "'24-0003",
                            'SANTOS, LARA MENDOZA',
                            'YEAR 2',
                            'Y2S1',
                            'ITE 201',
                            'Data Structures and Algorithms',
                            'Lecture and Laboratory',
                            '3',
                            'COC-FAB-IT2-01',
                            'PEDRO FACULTY',
                            'COC-FAB-IT2-01',
                            'ANA FACULTY',
                            'FLEX',
                            'Regular',
                            'Regular',
                            'Female',
                            '89',
                            '91',
                            '90',
                            '1.50',
                            'Passed',
                        ],
                        [
                            'SY 25-26 SEM I',
                            'College of Information Technology Education',
                            'Bachelor of Science in Information Technology',
                            "'23-0004",
                            'GARCIA, CARLO RAMOS',
                            'Y3S1',
                            'YEAR 3',
                            'ITE 301',
                            'Systems Integration and Architecture',
                            'Lecture and Laboratory',
                            '3',
                            'COC-FAB-IT3-01',
                            'LUZ FACULTY',
                            'COC-FAB-IT3-01',
                            'CARLO FACULTY',
                            'FLEX',
                            'Regular',
                            'Regular',
                            'Male',
                            '84',
                            '87',
                            '86',
                            '2.00',
                            'Passed',
                        ],
                        [
                            'SY 25-26 SEM I',
                            'College of Information Technology Education',
                            'Bachelor of Science in Information Technology',
                            "'23-0005",
                            'VILLANUEVA, SOPHIA REYES',
                            'Y3S1',
                            'YEAR 3',
                            'ITE 301',
                            'Systems Integration and Architecture',
                            'Lecture and Laboratory',
                            '3',
                            'COC-FAB-IT3-01',
                            'LUZ FACULTY',
                            'COC-FAB-IT3-01',
                            'CARLO FACULTY',
                            'FLEX',
                            'Regular',
                            'Regular',
                            'Female',
                            '92',
                            '93',
                            '94',
                            '1.25',
                            'Passed',
                        ],
                    ];
                    $handle = fopen('php://temp', 'r+');
                    fputcsv($handle, $headers);
                    foreach ($sampleData as $row) {
                        fputcsv($handle, $row);
                    }
                    rewind($handle);
                    $csvContent = stream_get_contents($handle);
                    fclose($handle);

                    return response($csvContent)
                        ->header('Content-Type', 'text/csv; charset=UTF-8')
                        ->header('Content-Disposition', 'attachment; filename="sis_grade_deliberation_template.csv"');
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
    /**
     * @param  array<string, mixed>  $row
     * @return array<string, mixed>
     */
    private function stripSisImportMetadata(array $row): array
    {
        unset(
            $row['_sis_row'],
            $row['_sis_session'],
            $row['_sis_student_name'],
            $row['_sis_course'],
            $row['_sis_year_level_text'],
            $row['_sis_year_sem_code'],
            $row['_sis_source_row']
        );

        return $row;
    }

    /**
     * @param  list<array<string, mixed>>  $rows
     * @return list<string>
     */
    private function sisGradeDeliberationPreviewHeaders(array $rows): array
    {
        $headers = null;
        foreach ($rows as $row) {
            $source = $row['_sis_source_row'] ?? null;
            if (is_array($source) && $source !== []) {
                $headers = array_keys($source);
                break;
            }
        }
        if ($headers === null) {
            $headers = app(SisGradeDeliberationImportParser::class)->standardDeliberationHeaders();
        }

        // Show how SESSION maps into Lookup Academic Year / Semester.
        foreach (['→ Academic Year (DB)', '→ Semester (DB)'] as $extra) {
            if (! in_array($extra, $headers, true)) {
                $headers[] = $extra;
            }
        }

        return $headers;
    }

    /**
     * @param  array<string, mixed>  $row
     * @return array<string, mixed>
     */
    private function sisGradeDeliberationPreviewRowData(array $row): array
    {
        $source = $row['_sis_source_row'] ?? null;
        $data = is_array($source) && $source !== [] ? $source : $row;

        $ayId = $row['academic_year_id'] ?? null;
        $semId = $row['semester_id'] ?? null;
        $ayName = null;
        $semName = null;
        if ($ayId !== null && $ayId !== '') {
            $ayName = AcademicYear::query()
                ->where('academic_year_id', (int) $ayId)
                ->value('academic_year_name');
        }
        if ($semId !== null && $semId !== '') {
            $semName = Semester::query()
                ->where('semester_id', (int) $semId)
                ->value('semester_name');
        }

        $data['→ Academic Year (DB)'] = $ayName
            ? sprintf('%s (id %s)', $ayName, $ayId)
            : '— not matched —';
        $data['→ Semester (DB)'] = $semName
            ? sprintf('%s (id %s)', $semName, $semId)
            : '— not matched —';

        return $data;
    }

    /**
     * @param  array<string, mixed>  $row
     */
    private function importGradeDeliberationRow(Request $request, array $row): void
    {
        $this->upsertStudentFromGradeDeliberationRow($row);
        $this->importGradesEvaluationRow($request, $this->stripSisImportMetadata($row));
    }

    /**
     * @param  array<string, mixed>  $row
     */
    private function upsertStudentFromGradeDeliberationRow(array $row): void
    {
        $sid = trim((string) ($row['student_id_number'] ?? ''));
        if ($sid === '') {
            return;
        }

        $programId = $this->resolveSisProgramId($row);
        $yearLevelId = $this->resolveSisYearLevelId($row);
        $semesterId = $this->resolveSisSemesterId($row);
        $academicYearId = isset($row['academic_year_id']) && $row['academic_year_id'] !== '' && $row['academic_year_id'] !== null
            ? (int) $row['academic_year_id']
            : null;
        [$lastName, $firstName, $middleName] = $this->splitSisStudentName((string) ($row['_sis_student_name'] ?? ''));

        $entryType = $this->normalizeSisAdmissionEntryType($row['_sis_admission_type'] ?? null);

        $profile = StudentProfile::query()->where('student_id_number', $sid)->orderBy('student_id')->first();
        if ($profile) {
            $updates = [
                'student_number' => $sid,
                'student_id_number' => $sid,
                'academic_status' => $profile->academic_status ?: 'Regular',
            ];
            if ($firstName !== '') {
                $updates['first_name'] = $firstName;
            }
            if ($middleName !== '') {
                $updates['middle_name'] = $middleName;
            }
            if ($lastName !== '') {
                $updates['last_name'] = $lastName;
            }
            if ($programId) {
                $updates['Current_Program'] = $programId;
            }
            if ($yearLevelId) {
                $updates['year_level_id'] = $yearLevelId;
            }
            if ($semesterId) {
                $updates['semester_id'] = $semesterId;
            }
            if ($academicYearId) {
                $updates['academic_year_id'] = $academicYearId;
            }
            if ($entryType !== null) {
                $updates['student_entry_type'] = $entryType;
            }
            $profile->fill($updates);
            $profile->save();

            return;
        }

        $studentRoleId = Role::query()->where('role_name', 'Student')->value('role_id');
        if (! $studentRoleId) {
            throw new \RuntimeException('Student role not found.');
        }

        $email = $this->generatedStudentEmailFromSisId($sid);
        $user = TblUser::with('role')->where('email', $email)->first();
        if (! $user) {
            $user = TblUser::create([
                'email' => $email,
                'password' => 'ChangeMe123!',
                'role_id' => (int) $studentRoleId,
                'status' => 'active',
                'password_changed_at' => now(),
            ]);
        } elseif (! $user->hasRole('Student')) {
            throw new \RuntimeException("Generated student email {$email} is already used by a non-student account.");
        }

        StudentProfile::create([
            'user_id' => $user->user_id,
            'student_number' => $sid,
            'student_id_number' => $sid,
            'first_name' => $firstName !== '' ? $firstName : $sid,
            'middle_name' => $middleName !== '' ? $middleName : null,
            'last_name' => $lastName !== '' ? $lastName : 'Student',
            'academic_status' => 'Regular',
            'student_entry_type' => $entryType,
            'Current_Program' => $programId,
            'year_level_id' => $yearLevelId,
            'semester_id' => $semesterId,
            'academic_year_id' => $academicYearId,
        ]);
    }

    /**
     * Map SIS ADMISSION TYPE to student_entry_type (Shiftee / Returnee / Transferee).
     * "Regular" / blank means normal entry → null.
     */
    private function normalizeSisAdmissionEntryType(mixed $raw): ?string
    {
        $value = strtolower(trim((string) ($raw ?? '')));
        if ($value === '') {
            return null;
        }

        return match (true) {
            str_contains($value, 'shift') => 'Shiftee',
            str_contains($value, 'transfer') => 'Transferee',
            str_contains($value, 'return') => 'Returnee',
            default => null,
        };
    }

    /**
     * @param  array<string, mixed>  $row
     */
    private function resolveSisProgramId(array $row): ?int
    {
        $course = trim((string) ($row['_sis_course'] ?? ''));
        if ($course === '') {
            return null;
        }

        $program = Program::query()
            ->where('program_name', $course)
            ->orWhere('program_code', $course)
            ->first();
        if (! $program && str_contains(strtolower($course), 'information technology')) {
            $program = Program::query()->where('program_code', 'BSIT')->first();
        }
        if (! $program) {
            $program = Program::query()
                ->where('program_name', 'like', '%' . $course . '%')
                ->orWhere('program_code', 'like', '%' . $course . '%')
                ->first();
        }

        return $program ? (int) $program->program_id : null;
    }

    /**
     * @param  array<string, mixed>  $row
     */
    private function resolveSisYearLevelId(array $row): ?int
    {
        $text = trim((string) (($row['_sis_year_level_text'] ?? '') . ' ' . ($row['_sis_year_sem_code'] ?? '')));
        if ($text === '') {
            return null;
        }

        $yearNumber = null;
        if (preg_match('/year\s*(\d+)/i', $text, $m) || preg_match('/\by\s*(\d+)/i', $text, $m)) {
            $yearNumber = (int) $m[1];
        }
        if (! $yearNumber) {
            return null;
        }

        $year = YearLevel::query()->where('year_level_id', $yearNumber)->first();
        if (! $year) {
            $year = YearLevel::query()->where('year_level', 'like', '%' . $yearNumber . '%')->first();
        }

        return $year ? (int) $year->year_level_id : null;
    }

    /**
     * Resolve curriculum semester from SIS term code (Y1S1) or SESSION (SEM I / II / III).
     */
    private function resolveSisSemesterId(array $row): ?int
    {
        $code = strtoupper(trim((string) ($row['_sis_year_sem_code'] ?? '')));
        $order = null;
        if (preg_match('/^Y\d+S(\d+)$/i', $code, $m)) {
            $order = (int) $m[1];
        }

        if ($order === null) {
            $session = strtoupper(trim((string) ($row['_sis_session'] ?? '')));
            if (preg_match('/\bSEM(?:ESTER)?\s*(?:III|3|THIRD)\b/', $session) || preg_match('/\bSUMMER\b/', $session)) {
                $order = 3;
            } elseif (preg_match('/\bSEM(?:ESTER)?\s*(?:II|2|SECOND)\b/', $session)) {
                $order = 2;
            } elseif (preg_match('/\bSEM(?:ESTER)?\s*(?:I|1|FIRST)\b/', $session)) {
                $order = 1;
            }
        }

        if ($order === null) {
            return null;
        }

        $ids = Semester::query()->orderBy('semester_id')->pluck('semester_id')->all();
        if ($ids === []) {
            return null;
        }
        $idx = min(max($order, 1), count($ids)) - 1;

        return (int) $ids[$idx];
    }

    /**
     * @return array{0: string, 1: string, 2: ?string}
     */
    private function splitSisStudentName(string $name): array
    {
        $name = trim(preg_replace('/\s+/', ' ', $name) ?? $name);
        if ($name === '') {
            return ['', '', null];
        }

        if (str_contains($name, ',')) {
            [$last, $rest] = array_map('trim', explode(',', $name, 2));

            return [$last, $rest, null];
        }

        $parts = explode(' ', $name);
        $last = array_pop($parts) ?: '';
        $first = trim(implode(' ', $parts));

        return [$last, $first, null];
    }

    private function generatedStudentEmailFromSisId(string $studentId): string
    {
        $local = strtolower(trim(preg_replace('/[^a-zA-Z0-9]+/', '.', $studentId) ?? $studentId, '.'));
        if ($local === '') {
            $local = 'student';
        }

        return 'student.' . $local . '@student.local';
    }

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
