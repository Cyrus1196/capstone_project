<?php

namespace App\Http\Controllers;

use App\Models\StudentProfile;
use App\Models\Evaluation;
use App\Models\Curriculum;
use App\Models\Prerequisite;
use App\Models\TblUser;
use App\Models\OfferedSubject;
use App\Models\Subject;
use App\Models\Track;
use App\Models\YearLevel;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;
use App\Services\ElectiveSubjectResolver;
use App\Services\StudentCurriculumEvaluationBuilder;
use Illuminate\Support\Facades\Log;

class StudentController extends Controller
{
    /**
     * Program id for curriculum/eligibility (uses StudentProfile accessor; supports current_program column).
     */
    protected function getStudentProgramId(?StudentProfile $profile): ?int
    {
        if (!$profile) {
            return null;
        }
        $v = $profile->current_program;
        if ($v === null || $v === '') {
            return null;
        }

        return (int) $v;
    }

    /**
     * Get the authenticated student's profile or admin can get by user_id
     */
    public function getProfile(Request $request)
    {
        try {
            $user = $request->user();
            if (!$user) {
                return response()->json(['message' => 'Unauthorized'], 401);
            }

            // Allow admin to get profile by user_id, otherwise use authenticated user
            $targetUserId = $request->query('user_id');
            if ($targetUserId && $user->isAdmin()) {
                $userId = $targetUserId;
            } else {
                $userId = $user->user_id;
            }

            $profile = StudentProfile::where('user_id', $userId)
                ->with(['program', 'track'])
                ->first();

            if (!$profile) {
                // Return empty object so the frontend can open the edit modal
                // without throwing a 404 error. The profile can still be created
                // later when admin fills the required fields.
                return response()->json((object)[]);
            }

            $built = null;
            try {
                $builder = app(StudentCurriculumEvaluationBuilder::class);
                $built = $builder->buildPayload($profile);
                $builder->syncStudentProfileFromCurriculumProgress($profile, $built);
                $profile->refresh();
            } catch (\Throwable $e) {
                Log::warning('student profile: computed academic status failed', [
                    'user_id' => $userId,
                    'message' => $e->getMessage(),
                ]);
            }

            $data = $profile->toArray();
            if ($built !== null) {
                $data['computed_academic_status'] = $built['computed_academic_status'];
                $data['academic_status_reasons'] = $built['academic_status_reasons'];
            }

            return response()->json($data);
        } catch (\Exception $e) {
            return response()->json([
                'error' => 'Failed to fetch profile',
                'message' => $e->getMessage()
            ], 500);
        }
    }

    /**
     * Create or update student profile
     */
    public function updateProfile(Request $request)
    {
        try {
            $user = $request->user();
            if (!$user) {
                return response()->json(['message' => 'Unauthorized'], 401);
            }

            $validated = $request->validate([
                'user_id' => 'nullable|integer|exists:tbl_users,user_id', // Allow admin to specify user_id
                'student_id_number' => 'required|string|max:50',
                'first_name' => 'nullable|string|max:50',
                'middle_name' => 'nullable|string|max:50',
                'last_name' => 'nullable|string|max:50',
                'contact_number' => 'nullable|string|max:20',
                'address' => 'nullable|string',
                'academic_status' => 'nullable|string|max:50',
                'year_level_id' => 'nullable|integer|exists:year_level,year_level_id',
                'track_id' => 'nullable|integer|exists:tbl_track,track_id',
                'current_program' => 'nullable|integer|exists:tbl_program,program_id',
                'Current_Program' => 'nullable|integer|exists:tbl_program,program_id', // Accept both formats
            ]);

            // Map current_program to Current_Program if provided
            if (isset($validated['current_program'])) {
                $validated['Current_Program'] = $validated['current_program'];
                unset($validated['current_program']);
            }

            // Determine which user_id to use
            $targetUserId = $validated['user_id'] ?? $user->user_id;
            
            // If admin is creating for another user, check permissions
            if ($validated['user_id'] && $targetUserId !== $user->user_id) {
                if (!$user->isAdmin()) {
                    return response()->json(['message' => 'Unauthorized'], 403);
                }
                // For admin creating student profile, use the provided user_id
                // Admin doesn't need to be the same as the target user
            }

            $profile = StudentProfile::where('user_id', $targetUserId)->first();

            if ($profile) {
                // Update existing profile
                // Allow admin to edit Student ID Number, but prevent duplicates.
                $hasStudentIdNumberColumn = Schema::hasColumn('tbl_student_profile', 'student_id_number');
                $hasStudentNumberColumn = Schema::hasColumn('tbl_student_profile', 'student_number');

                $rawStudentIdNumber = (string) ($validated['student_id_number'] ?? '');
                $sanitizedStudentNumber = preg_replace('/\D+/', '', $rawStudentIdNumber);

                if ($rawStudentIdNumber === '' || $sanitizedStudentNumber === '') {
                    return response()->json([
                        'error' => 'Invalid Student ID Number',
                        'message' => 'Student ID Number must contain digits (e.g., 02-2324-07413).',
                    ], 422);
                }

                // IDs like "2026-PERSONAL-001" share the same digit fingerprint as "2026001". Enforcing
                // uniqueness on digits-only would false-positive against a legacy row that only has student_number.
                $idHasNonDigitFormat = (bool) preg_match('/\D/', $rawStudentIdNumber);

                // Prevent duplicates for the same value for another student.
                if ($hasStudentIdNumberColumn) {
                    $duplicate = StudentProfile::where('student_id_number', $rawStudentIdNumber)
                        ->where('user_id', '!=', $targetUserId)
                        ->exists();
                    if ($duplicate) {
                        return response()->json(['message' => 'Student ID number already exists'], 422);
                    }
                }

                if ($hasStudentNumberColumn && ! $idHasNonDigitFormat) {
                    $duplicate = StudentProfile::where('student_number', $sanitizedStudentNumber)
                        ->where('user_id', '!=', $targetUserId)
                        ->exists();
                    if ($duplicate) {
                        return response()->json(['message' => 'Student ID number already exists'], 422);
                    }
                }

                // Map to the columns we actually have.
                if ($hasStudentNumberColumn) {
                    $validated['student_number'] = $sanitizedStudentNumber;
                }

                // If student_id_number column doesn't exist, remove it to avoid DB errors.
                if (!$hasStudentIdNumberColumn) {
                    unset($validated['student_id_number']);
                }

                unset($validated['user_id']); // Don't allow changing user_id
                $profile->update($validated);
            } else {
                // Create new profile
                // Your tbl_student_profile uses `student_number` (INT) in the current schema,
                // but the frontend captures `student_id_number` like "02-2324-07413".
                // We sanitize to digits only before saving to avoid MySQL truncation warnings.
                $rawStudentIdNumber = (string) ($validated['student_id_number'] ?? '');
                $sanitizedStudentNumber = preg_replace('/\D+/', '', $rawStudentIdNumber);
                if ($sanitizedStudentNumber === '') {
                    return response()->json([
                        'error' => 'Invalid Student ID Number',
                        'message' => 'Student ID Number must contain digits (e.g., 02-2324-07413).',
                    ], 422);
                }

                $idHasNonDigitFormat = (bool) preg_match('/\D/', $rawStudentIdNumber);

                // Map payload to the actual DB column name.
                // Your tbl_student_profile table might use `student_number` instead of `student_id_number`.
                $hasStudentIdNumberColumn = Schema::hasColumn('tbl_student_profile', 'student_id_number');
                $hasStudentNumberColumn = Schema::hasColumn('tbl_student_profile', 'student_number');

                // Existence check: full student_id_number first; digits-only column only when ID is purely numeric
                // (avoids "2026-PERSONAL-001" colliding with stored student_number "2026001").
                $exists = false;
                if ($hasStudentIdNumberColumn) {
                    $exists = StudentProfile::where('student_id_number', $rawStudentIdNumber)->exists();
                }
                if (! $exists && $hasStudentNumberColumn && ! $idHasNonDigitFormat) {
                    $exists = StudentProfile::where('student_number', $sanitizedStudentNumber)->exists();
                } elseif (! $exists && $hasStudentNumberColumn && $idHasNonDigitFormat && ! $hasStudentIdNumberColumn) {
                    $exists = StudentProfile::where('student_number', $sanitizedStudentNumber)->exists();
                }

                if ($exists) {
                    return response()->json(['message' => 'Student ID number already exists'], 422);
                }

                // Map validated payload to actual DB columns.
                if ($hasStudentNumberColumn) {
                    $validated['student_number'] = $sanitizedStudentNumber;
                }
                if (!$hasStudentIdNumberColumn) {
                    unset($validated['student_id_number']);
                } else {
                    // Store raw input so the admin modal doesn't look blank.
                    $validated['student_id_number'] = (string) $rawStudentIdNumber;
                }

                $validated['user_id'] = $targetUserId;
                $profile = StudentProfile::create($validated);
            }

            $profile->load('program');

            return response()->json($profile);
        } catch (\Illuminate\Validation\ValidationException $e) {
            return response()->json([
                'error' => 'Validation failed',
                'messages' => $e->errors()
            ], 422);
        } catch (\Exception $e) {
            return response()->json([
                'error' => 'Failed to save profile',
                'message' => $e->getMessage()
            ], 500);
        }
    }

    /**
     * Create new student profile
     */
    public function createProfile(Request $request)
    {
        return $this->updateProfile($request);
    }

    /**
     * Get student's evaluations
     */
    public function getEnrollments(Request $request)
    {
        try {
            $user = $request->user();
            if (!$user) {
                return response()->json(['message' => 'Unauthorized'], 401);
            }

            $profile = StudentProfile::where('user_id', $user->user_id)->first();
            if (!$profile) {
                return response()->json(['enrollments' => []]);
            }

            app(\App\Services\IncComplianceExpiryService::class)->expireOverdue($profile->student_id);

            $query = Evaluation::where('student_id', $profile->student_id)
                ->with([
                    'subject',
                    'academicYear',
                    'semester',
                    'section'
                ]);

            // Apply filters
            if ($request->has('academic_year') && $request->academic_year) {
                $query->whereHas('academicYear', function($q) use ($request) {
                    $q->where('academic_year_name', 'like', '%' . $request->academic_year . '%');
                });
            }

            if ($request->has('semester') && $request->semester) {
                $query->whereHas('semester', function($q) use ($request) {
                    $q->where('semester_name', 'like', '%' . $request->semester . '%');
                });
            }

            if ($request->has('status') && $request->status) {
                $query->where('evaluation_status', $request->status);
            }

            $evaluations = $query->orderBy('enrolled_date', 'desc')->get();

            // Transform the data to include related information in a flat structure
            // Keep 'enrollment_id' and 'status' in response for backward compatibility with frontend
            $transformed = $evaluations->map(function($evaluation) {
                return [
                    'enrollment_id' => $evaluation->evaluation_id, // Map for backward compatibility
                    'evaluation_id' => $evaluation->evaluation_id,
                    'student_id' => $evaluation->student_id,
                    'subject_id' => $evaluation->subject_id,
                    'subject_code' => $evaluation->subject->subject_code ?? null,
                    'subject_name' => $evaluation->subject->subject_name ?? null,
                    'units' => $evaluation->subject->number_of_units ?? null,
                    'academic_year_id' => $evaluation->academic_year_id,
                    'academic_year_name' => $evaluation->academicYear->academic_year_name ?? null,
                    'semester_id' => $evaluation->semester_id,
                    'semester_name' => $evaluation->semester->semester_name ?? null,
                    'grade' => $evaluation->grade,
                    'status' => $evaluation->evaluation_status, // Map for backward compatibility
                    'evaluation_status' => $evaluation->evaluation_status,
                    'enrolled_date' => $evaluation->enrolled_date,
                    'section_id' => $evaluation->section_id,
                    'section_name' => $evaluation->section->section_name ?? null,
                    'inc_compliance_deadline' => $evaluation->inc_compliance_deadline
                        ? $evaluation->inc_compliance_deadline->format('Y-m-d')
                        : null,
                    'subject' => $evaluation->subject,
                    'academic_year' => $evaluation->academicYear,
                    'semester' => $evaluation->semester,
                    'section' => $evaluation->section,
                ];
            });

            return response()->json(['enrollments' => $transformed]);
        } catch (\Exception $e) {
            return response()->json([
                'error' => 'Failed to fetch evaluations',
                'message' => $e->getMessage()
            ], 500);
        }
    }

    /**
     * Get student's curriculum based on their program
     */
    public function getCurriculum(Request $request)
    {
        try {
            $user = $request->user();
            if (!$user) {
                return response()->json(['message' => 'Unauthorized'], 401);
            }

            $profile = StudentProfile::where('user_id', $user->user_id)
                ->with(['program', 'track', 'yearLevel'])
                ->first();

            $programId = $this->getStudentProgramId($profile);
            if (! $profile) {
                return response()->json([
                    'curriculum' => [],
                    'curriculum_unavailable_reason' => 'no_profile',
                    'curriculum_message' => 'Complete My Profile (name and Student ID number). After that, an administrator must assign your program before courses appear here.',
                ]);
            }
            if (! $programId) {
                return response()->json([
                    'curriculum' => [],
                    'curriculum_unavailable_reason' => 'no_program',
                    'curriculum_message' => 'Your program is not set on your record yet. Ask an administrator to assign your program in User Management, or import it using a student row with program_id in CSV.',
                ]);
            }

            $curriculum = Curriculum::where('program_id', $programId)
                ->with([
                    'subject.prerequisites.requiredSubject',
                    'yearLevel',
                    'semester',
                    'program',
                    'electiveSlot.electiveSubjects.subject',
                    'electiveSlot.electiveSubjects.track'
                ])
                ->orderBy('year_level')
                ->orderBy('semester_id')
                ->get();

            $studentEvaluations = Evaluation::where('student_id', $profile->student_id)
                ->with('subject')
                ->get();

            $approvedCreditSubjectIds = app(StudentCurriculumEvaluationBuilder::class)
                ->subjectIdsWithTransferCreditForStudent((int) $profile->student_id);

            $studentTrackId = $profile->track_id;

            $transformed = $curriculum
                ->map(function ($item) use ($studentTrackId, $profile, $studentEvaluations, $approvedCreditSubjectIds) {
                $resolvedSubject = $item->subject;
                $resolvedTrack = null;
                $resolvedFromElective = false;

                if (! $resolvedSubject && $item->electiveSlot) {
                    $electiveSubjects = $item->electiveSlot->electiveSubjects ?? collect();
                    $resolvedSubject = ElectiveSubjectResolver::resolveForCurriculumSlot(
                        $electiveSubjects,
                        $studentTrackId !== null ? (int) $studentTrackId : null,
                        $item->semester_id !== null ? (int) $item->semester_id : null,
                        $studentEvaluations
                    );
                    if ($resolvedSubject) {
                        $resolvedFromElective = true;
                        $esRow = $electiveSubjects->first(
                            fn ($es) => (int) $es->subject_id === (int) $resolvedSubject->subject_id
                        );
                        $resolvedTrack = $esRow?->track;
                    }
                }

                // Prerequisites and corequisites (tbl_prerequisite.requisite_type)
                $prerequisites = [];
                $corequisites = [];
                if ($resolvedSubject && $resolvedSubject->prerequisites) {
                    foreach ($resolvedSubject->prerequisites as $edge) {
                        $type = strtolower((string) ($edge->requisite_type ?? 'prerequisite'));
                        $c = $edge->requiredSubject->subject_code ?? null;
                        if ($c === null || trim((string) $c) === '') {
                            continue;
                        }
                        $c = trim((string) $c);
                        $requisiteRow = [
                            'subject_code' => $c,
                            'prereq_subject_code' => $c,
                            'requisite_type' => $type === 'corequisite' ? 'corequisite' : 'prerequisite',
                        ];
                        if ($type === 'corequisite') {
                            $corequisites[] = $requisiteRow;
                        } else {
                            $prerequisites[] = $requisiteRow;
                        }
                    }
                }

                if (! $resolvedSubject) {
                    if ($item->electiveSlot) {
                        $slot = $item->electiveSlot;

                        return [
                            'curriculum_id' => $item->curriculum_id,
                            'program_id' => $item->program_id,
                            'subject_id' => null,
                            'subject_code' => trim((string) ($slot->slot_name ?? '')) !== ''
                                ? $slot->slot_name
                                : 'Elective 1',
                            'subject_name' => 'Pending track selection',
                            'units' => 0,
                            'hours' => null,
                            'year_level_id' => $item->year_level,
                            'year_level_name' => $item->yearLevel->year_level ?? null,
                            'semester_id' => $item->semester_id,
                            'semester_name' => $item->semester->semester_name ?? null,
                            'passing_grade' => $item->passing_grade,
                            'subject_type' => $item->subject_type,
                            'year_level' => $item->yearLevel,
                            'semester' => $item->semester,
                            'subject' => null,
                            'program' => $item->program,
                            'student_track_id' => $profile->track_id,
                            'student_track_name' => $profile->track->track_name ?? null,
                            'resolved_from_elective_slot' => true,
                            'resolved_track' => null,
                            'elective_unresolved' => true,
                            'elective_slot_name' => $slot->slot_name,
                            'prerequisites' => [],
                            'corequisites' => [],
                            'passed_via_transfer_credit' => false,
                        ];
                    }

                    return null;
                }

                $sid = (int) $resolvedSubject->subject_id;
                $passedViaTransferCredit = $approvedCreditSubjectIds->contains($sid);

                return [
                    'curriculum_id' => $item->curriculum_id,
                    'program_id' => $item->program_id,
                    'subject_id' => $resolvedSubject->subject_id,
                    'subject_code' => $resolvedSubject->subject_code ?? null,
                    'subject_name' => $resolvedSubject->subject_name ?? null,
                    'units' => $resolvedSubject->number_of_units ?? null,
                    'hours' => $resolvedSubject->number_of_hrs ?? null,
                    'year_level_id' => $item->year_level,
                    'year_level_name' => $item->yearLevel->year_level ?? null,
                    'semester_id' => $item->semester_id,
                    'semester_name' => $item->semester->semester_name ?? null,
                    'passing_grade' => $item->passing_grade,
                    'subject_type' => $item->subject_type,
                    'year_level' => $item->yearLevel,
                    'semester' => $item->semester,
                    'subject' => $resolvedSubject,
                    'program' => $item->program,
                    'student_track_id' => $profile->track_id,
                    'student_track_name' => $profile->track->track_name ?? null,
                    'resolved_from_elective_slot' => $resolvedFromElective,
                    'resolved_track' => $resolvedTrack,
                    'prerequisites' => $prerequisites,
                    'corequisites' => $corequisites,
                    'passed_via_transfer_credit' => $passedViaTransferCredit,
                ];
                })
                ->filter();

            if ($transformed->isEmpty() && $curriculum->isNotEmpty()) {
                return response()->json([
                    'curriculum' => [],
                    'curriculum_unavailable_reason' => 'curriculum_unresolved',
                    'curriculum_message' => 'A program is assigned, but no subjects could be loaded (missing subjects, electives, or curriculum data). Ask an administrator to check Curriculum Management for this program.',
                ]);
            }

            if ($transformed->isEmpty()) {
                return response()->json([
                    'curriculum' => [],
                    'curriculum_unavailable_reason' => 'no_curriculum_catalog',
                    'curriculum_message' => 'No curriculum courses are defined for your program yet. An administrator needs to add curriculum entries for this program.',
                ]);
            }

            return response()->json([
                'curriculum' => $transformed,
                'promotion' => [
                    'promoted_at' => $profile->promoted_next_sem_at?->toIso8601String(),
                    'target_year_level_id' => $profile->promotion_target_year_level_id,
                    'target_semester_id' => $profile->promotion_target_semester_id,
                ],
            ]);
        } catch (\Exception $e) {
            return response()->json([
                'error' => 'Failed to fetch curriculum',
                'message' => $e->getMessage()
            ], 500);
        }
    }

    /**
     * Get lookup options used in student profile forms.
     */
    public function getProfileOptions(Request $request)
    {
        try {
            $user = $request->user();
            if (!$user) {
                return response()->json(['message' => 'Unauthorized'], 401);
            }

            return response()->json([
                'year_levels' => YearLevel::select('year_level_id', 'year_level')->orderBy('year_level_id')->get(),
                'tracks' => Track::select('track_id', 'track_code', 'track_name')->orderBy('track_name')->get(),
            ]);
        } catch (\Exception $e) {
            return response()->json([
                'error' => 'Failed to fetch profile options',
                'message' => $e->getMessage()
            ], 500);
        }
    }

    /**
     * Get eligible subjects for enrollment based on year level, semester, offered status, and prerequisite validation
     * This implements the instructor's requirement:
     * 1. Get subjects from curriculum based on year level and semester
     * 2. Check if each subject is offered
     * 3. Check prerequisites recursively for each subject
     * 4. Validate which subjects can be taken (passed prerequisite validation)
     */
    public function getEligibleSubjects(Request $request)
    {
        try {
            $user = $request->user();
            if (!$user) {
                return response()->json(['message' => 'Unauthorized'], 401);
            }

            // Get student profile
            $profile = StudentProfile::where('user_id', $user->user_id)->first();
            $programId = $this->getStudentProgramId($profile);
            if (!$profile || !$programId) {
                return response()->json(['message' => 'Student profile or program not found'], 404);
            }

            // Get parameters from request
            $yearLevelId = $request->input('year_level_id');
            $semesterId = $request->input('semester_id');
            $academicYearId = $request->input('academic_year_id');

            if (!$yearLevelId || !$semesterId) {
                return response()->json([
                    'error' => 'year_level_id and semester_id are required'
                ], 400);
            }

            // Get all completed subjects from tbl_evaluation
            // A subject is considered passed if:
            // 1. evaluation_status is 'Passed', 'Pass', or 'Credit'
            // 2. OR grade >= 75 (default passing grade)
            $completedSubjects = Evaluation::where('student_id', $profile->student_id)
                ->where(function($query) {
                    $query->whereIn('evaluation_status', ['Passed', 'Pass', 'Credit', 'passed', 'pass', 'credit'])
                        ->orWhere(function($q) {
                            $q->whereNotNull('grade')
                              ->whereRaw('CAST(grade AS DECIMAL(10,2)) >= 75');
                        });
                })
                ->pluck('subject_id')
                ->toArray();

            // Get subjects from curriculum based on year level and semester
            $curriculumSubjects = Curriculum::where('program_id', $programId)
                ->where('year_level', $yearLevelId)
                ->where('semester_id', $semesterId)
                ->with([
                    'subject.prerequisites.requiredSubject',
                    'subject.offeredSubjects' => function($query) use ($academicYearId, $semesterId) {
                        if ($academicYearId) {
                            $query->where('academic_year_id', $academicYearId);
                        }
                        if ($semesterId) {
                            $query->where('semester_id', $semesterId);
                        }
                        $query->where('status', 'active');
                    }
                ])
                ->get();

            $eligibleSubjects = [];

            foreach ($curriculumSubjects as $curriculumItem) {
                $subject = $curriculumItem->subject;
                if (!$subject) continue;

                $subjectId = $subject->subject_id;

                // Step 2: Check if subject is offered
                $isOffered = false;
                if ($academicYearId) {
                    $offeredSubject = OfferedSubject::where('subject_id', $subjectId)
                        ->where('academic_year_id', $academicYearId)
                        ->where('semester_id', $semesterId)
                        ->where('status', 'active')
                        ->where('program_id', $programId)
                        ->first();
                    $isOffered = $offeredSubject !== null;
                } else {
                    // If no academic year specified, check if it's offered in any active academic year
                    $offeredSubject = OfferedSubject::where('subject_id', $subjectId)
                        ->where('semester_id', $semesterId)
                        ->where('status', 'active')
                        ->where('program_id', $programId)
                        ->first();
                    $isOffered = $offeredSubject !== null;
                }

                if (!$isOffered) {
                    continue; // Skip subjects that are not offered
                }

                // Step 3: Check prerequisites recursively
                $prerequisiteValidation = $this->validatePrerequisitesRecursive(
                    $subjectId,
                    $completedSubjects,
                    []
                );

                // Step 4: Validate if subject can be taken (all prerequisites passed)
                $canTake = $prerequisiteValidation['allPassed'];
                $missingPrerequisites = $prerequisiteValidation['missing'];

                $eligibleSubjects[] = [
                    'curriculum_id' => $curriculumItem->curriculum_id,
                    'subject_id' => $subjectId,
                    'subject_code' => $subject->subject_code,
                    'subject_name' => $subject->subject_name,
                    'number_of_units' => $subject->number_of_units,
                    'number_of_hrs' => $subject->number_of_hrs,
                    'is_offered' => $isOffered,
                    'can_take' => $canTake,
                    'missing_prerequisites' => $missingPrerequisites,
                    'all_prerequisites' => $prerequisiteValidation['allPrerequisites'],
                    'passing_grade' => $curriculumItem->passing_grade,
                    'subject_type' => $curriculumItem->subject_type,
                ];
            }

            return response()->json([
                'eligible_subjects' => $eligibleSubjects,
                'year_level_id' => $yearLevelId,
                'semester_id' => $semesterId,
                'academic_year_id' => $academicYearId,
                'completed_subjects_count' => count($completedSubjects)
            ]);
        } catch (\Exception $e) {
            return response()->json([
                'error' => 'Failed to fetch eligible subjects',
                'message' => $e->getMessage()
            ], 500);
        }
    }

    /**
     * Recursively validate prerequisites for a subject
     * Returns array with:
     * - allPassed: boolean indicating if all prerequisites are met
     * - missing: array of missing prerequisite subject codes
     * - allPrerequisites: array of all prerequisite subject codes (for display)
     */
    private function validatePrerequisitesRecursive($subjectId, $completedSubjects, $visited = [])
    {
        // Prevent infinite loops in case of circular dependencies
        if (in_array($subjectId, $visited)) {
            return [
                'allPassed' => true, // Assume passed to avoid blocking
                'missing' => [],
                'allPrerequisites' => []
            ];
        }

        $visited[] = $subjectId;

        // Get all prerequisites for this subject
        $prerequisites = Prerequisite::where('subject_id', $subjectId)
            ->where('requisite_type', 'prerequisite')
            ->with('requiredSubject')
            ->get();

        $allPrerequisites = [];
        $missingPrerequisites = [];

        foreach ($prerequisites as $prereq) {
            $requiredSubjectId = $prereq->requisites_subject_id;
            $requiredSubject = $prereq->requiredSubject;

            if (!$requiredSubject) continue;

            $requiredSubjectCode = $requiredSubject->subject_code;

            // Recursively check if the prerequisite's prerequisites are met
            $nestedValidation = $this->validatePrerequisitesRecursive(
                $requiredSubjectId,
                $completedSubjects,
                $visited
            );

            // Collect all prerequisites (including nested ones)
            $allPrerequisites[] = $requiredSubjectCode;
            $allPrerequisites = array_merge($allPrerequisites, $nestedValidation['allPrerequisites']);

            // Check if the prerequisite itself is completed
            if (in_array($requiredSubjectId, $completedSubjects)) {
                // Prerequisite is completed, but check if nested prerequisites are also met
                if (!$nestedValidation['allPassed']) {
                    $missingPrerequisites = array_merge($missingPrerequisites, $nestedValidation['missing']);
                }
                // If both the prerequisite and its nested prerequisites are met, continue
                continue;
            }

            // Prerequisite is not completed
            // If nested prerequisites are also not all passed, add both this and nested missing prerequisites
            if (!$nestedValidation['allPassed']) {
                $missingPrerequisites[] = $requiredSubjectCode;
                $missingPrerequisites = array_merge($missingPrerequisites, $nestedValidation['missing']);
            } else {
                // Nested prerequisites are met, but this prerequisite itself is missing
                $missingPrerequisites[] = $requiredSubjectCode;
            }
        }

        return [
            'allPassed' => empty($missingPrerequisites),
            'missing' => array_unique($missingPrerequisites),
            'allPrerequisites' => array_unique($allPrerequisites)
        ];
    }
}

