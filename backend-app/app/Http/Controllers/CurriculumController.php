<?php

namespace App\Http\Controllers;

use App\Models\Curriculum;
use App\Models\CurriculumHeader;
use App\Models\Subject;
use App\Models\ElectiveSlot;
use App\Models\Prerequisite;
use Illuminate\Http\Request;
use Illuminate\Database\Eloquent\ModelNotFoundException;
use Illuminate\Database\QueryException;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;

class CurriculumController extends Controller
{
    /**
     * Get list of curriculum entries
     */
    public function index(Request $request)
    {
        try {
            // Load relationships to avoid N+1 queries
            // Include nested relationships for elective slots (subjects and tracks)
            $curricula = Curriculum::with([
                'program',
                'curriculumHeader',
                'subject', 
                'semester', 
                'yearLevel', 
                'subject.prerequisites.requiredSubject',
                'requisite.requiredSubject', 
                'electiveSlot.electiveSubjects.subject',
                'electiveSlot.electiveSubjects.track'
            ])
                ->get();
            
            // Transform to ensure elective slot subjects are properly included
            $transformed = $curricula->map(function($curriculum) {
                $data = $curriculum->toArray();
                
                // Ensure electiveSlot and its subjects are properly included
                if ($curriculum->electiveSlot) {
                    $data['electiveSlot'] = [
                        'elective_slot_id' => $curriculum->electiveSlot->elective_slot_id,
                        'slot_name' => $curriculum->electiveSlot->slot_name,
                        'program_id' => $curriculum->electiveSlot->program_id,
                        'semester_id' => $curriculum->electiveSlot->semester_id,
                        'year_level_id' => $curriculum->electiveSlot->year_level_id,
                        'status' => $curriculum->electiveSlot->status,
                        'electiveSubjects' => $curriculum->electiveSlot->electiveSubjects->map(function($es) {
                            return [
                                'elective_subject_id' => $es->elective_subject_id,
                                'elective_slot_id' => $es->elective_slot_id,
                                'subject_id' => $es->subject_id,
                                'track_id' => $es->track_id,
                                'description' => $es->description,
                                'subject' => $es->subject ? [
                                    'subject_id' => $es->subject->subject_id,
                                    'subject_code' => $es->subject->subject_code,
                                    'subject_name' => $es->subject->subject_name,
                                    'number_of_units' => $es->subject->number_of_units,
                                    'number_of_hrs' => $es->subject->number_of_hrs,
                                ] : null,
                                'track' => $es->track ? [
                                    'track_id' => $es->track->track_id,
                                    'track_name' => $es->track->track_name,
                                    'track_code' => $es->track->track_code,
                                ] : null,
                            ];
                        })->toArray(),
                    ];
                }
                
                return $data;
            });
                
            return response()->json($transformed);
        } catch (\Exception $e) {
            Log::error('Curriculum index error: ' . $e->getMessage());
            return response()->json(['message' => 'Failed to fetch curricula'], 500);
        }
    }

    /**
     * Get lookup data for the frontend forms
     */
    public function lookupData(Request $request)
    {
        try {
            // Import models if they are in App\Models
            $programs = \App\Models\Program::with('department')
                ->select('program_id', 'department_id', 'program_name', 'program_code', 'total_units_required')
                ->get();
            $subjects = \App\Models\Subject::select('subject_id', 'subject_code', 'subject_name', 'number_of_units', 'number_of_hrs')->get();
            $yearLevels = \App\Models\YearLevel::select('year_level_id', 'year_level')->get();
            $semesters = \App\Models\Semester::select('semester_id', 'semester_name', 'status')
                ->get()
                ->map(function ($semester) {
                    if ($semester->status === null || $semester->status === '') {
                        $semester->status = 'inactive';
                    }
                    return $semester;
                });
            
            // Get requisites (Prerequisite/Corequisite combined)
            $requisites = \App\Models\Prerequisite::with(['requiredSubject'])
                ->get();

            $data = [
                'programs' => $programs,
                'subjects' => $subjects,
                'yearLevels' => $yearLevels,
                'semesters' => $semesters,
                'requisites' => $requisites,
            ];

            $user = $request->user('api');
            if ($user && method_exists($user, 'canAccessLookupResource') && ! $user->isAdmin()) {
                $map = [
                    'programs' => 'programs',
                    'subjects' => 'subjects',
                    'yearLevels' => 'year_levels',
                    'semesters' => 'semesters',
                    'requisites' => 'requisites',
                ];
                foreach ($map as $key => $slug) {
                    if (! $user->canAccessLookupResource($slug, false)) {
                        $data[$key] = [];
                    }
                }
            }

            return response()->json($data);
        } catch (\Exception $e) {
            Log::error('Lookup data error: ' . $e->getMessage());
            return response()->json(['message' => 'Failed to fetch lookup data'], 500);
        }
    }

    /**
     * BATCH CREATE CURRICULUM ENTRIES
     * Matches Route::post('/batch', [CurriculumController::class, 'storeBatch']);
     */
    public function storeBatch(Request $request)
    {
        try {
            // 1. Validate Input - Basic structure first
            $validated = $request->validate([
                'program_id' => 'required|integer|exists:tbl_program,program_id',
                'year_level' => 'required|integer|exists:year_level,year_level_id',
                'semester_id' => 'required|integer|exists:tbl_semester,semester_id',
                'curriculum_header_id' => 'nullable|integer|exists:tbl_curriculum_header,curriculum_header_id',
                'subjects' => 'required|array|min:1',
            ]);
            
            // 2. Validate and normalize subjects array
            $normalizedSubjects = [];
            foreach ($request->input('subjects', []) as $index => $subjectData) {
                // Normalize empty strings to null
                $subjectId = isset($subjectData['subject_id']) && $subjectData['subject_id'] !== '' && $subjectData['subject_id'] !== null
                    ? (int) $subjectData['subject_id']
                    : null;
                $electiveSlotId = isset($subjectData['elective_slot_id']) && $subjectData['elective_slot_id'] !== '' && $subjectData['elective_slot_id'] !== null
                    ? (int) $subjectData['elective_slot_id']
                    : null;
                
                // At least one must be provided
                if (!$subjectId && !$electiveSlotId) {
                    continue; // Skip invalid entries
                }
                
                // Validate subject_id if provided
                if ($subjectId !== null) {
                    $subjectExists = Subject::where('subject_id', $subjectId)->exists();
                    if (!$subjectExists) {
                        throw new \Illuminate\Validation\ValidationException(
                            validator([], []),
                            ['subjects.' . $index . '.subject_id' => ['The selected subject does not exist.']]
                        );
                    }
                }
                
                // Validate elective_slot_id if provided
                if ($electiveSlotId !== null) {
                    $slotExists = ElectiveSlot::where('elective_slot_id', $electiveSlotId)->exists();
                    if (!$slotExists) {
                        throw new \Illuminate\Validation\ValidationException(
                            validator([], []),
                            ['subjects.' . $index . '.elective_slot_id' => ['The selected elective slot does not exist.']]
                        );
                    }
                }
                
                // Normalize passing_grade
                $passingGrade = null;
                if (isset($subjectData['passing_grade']) && $subjectData['passing_grade'] !== '' && $subjectData['passing_grade'] !== null) {
                    $passingGrade = (int) $subjectData['passing_grade'];
                }
                
                // Normalize requisite_id
                $requisiteId = null;
                if (isset($subjectData['requisite_id']) && $subjectData['requisite_id'] !== '' && $subjectData['requisite_id'] !== null) {
                    $requisiteId = (int) $subjectData['requisite_id'];
                    // Validate requisite exists
                    $requisiteExists = Prerequisite::where('requisites_id', $requisiteId)->exists();
                    if (!$requisiteExists) {
                        throw new \Illuminate\Validation\ValidationException(
                            validator([], []),
                            ['subjects.' . $index . '.requisite_id' => ['The selected requisite does not exist.']]
                        );
                    }
                }
                
                // Normalize subject_type
                $subjectType = isset($subjectData['subject_type']) && $subjectData['subject_type'] !== '' 
                    ? (string) $subjectData['subject_type'] 
                    : null;
                
                if ($subjectType && strlen($subjectType) > 50) {
                    throw new \Illuminate\Validation\ValidationException(
                        validator([], []),
                        ['subjects.' . $index . '.subject_type' => ['Subject type must not exceed 50 characters.']]
                    );
                }
                
                $normalizedSubjects[] = [
                    'subject_id' => $subjectId,
                    'elective_slot_id' => $electiveSlotId,
                    'passing_grade' => $passingGrade,
                    'subject_type' => $subjectType,
                    'requisite_id' => $requisiteId,
                    'number_of_units' => isset($subjectData['number_of_units']) && $subjectData['number_of_units'] !== '' && $subjectData['number_of_units'] !== null
                        ? (int) $subjectData['number_of_units']
                        : null,
                    'number_of_hrs' => isset($subjectData['number_of_hrs']) && $subjectData['number_of_hrs'] !== '' && $subjectData['number_of_hrs'] !== null
                        ? (int) $subjectData['number_of_hrs']
                        : null,
                ];
            }
            
            if (empty($normalizedSubjects)) {
                throw new \Illuminate\Validation\ValidationException(
                    validator([], []),
                    ['subjects' => ['At least one valid subject or elective slot must be provided.']]
                );
            }
            
            $validated['subjects'] = $normalizedSubjects;

            DB::beginTransaction();
            
            $createdCount = 0;

            $headerId = $validated['curriculum_header_id'] ?? null;
            if (!$headerId) {
                $latestHeader = CurriculumHeader::where('program_id', $validated['program_id'])
                    ->orderByDesc('Effective_Year')
                    ->orderByDesc('curriculum_header_id')
                    ->first();
                $headerId = $latestHeader?->curriculum_header_id;
            }

            foreach ($validated['subjects'] as $subjectData) {
                // Data is already normalized and validated
                $subjectId = $subjectData['subject_id'];
                $electiveSlotId = $subjectData['elective_slot_id'];
                $passingGrade = $subjectData['passing_grade'];
                $requisiteId = $subjectData['requisite_id'];
                $subjectType = $subjectData['subject_type'];

                // Check for duplicates
                $query = Curriculum::where('program_id', $validated['program_id'])
                    ->where('year_level', $validated['year_level'])
                    ->where('semester_id', $validated['semester_id']);
                
                if ($electiveSlotId) {
                    $query->where('elective_slot_id', $electiveSlotId);
                } else {
                    $query->where('subject_id', $subjectId);
                }
                
                $exists = $query->exists();

                if (!$exists) {
                    try {
                        Curriculum::create([
                            'curriculum_header_id' => $headerId,
                            'program_id' => $validated['program_id'],
                            'year_level' => $validated['year_level'], 
                            'semester_id' => $validated['semester_id'],
                            'subject_id' => $subjectId,
                            'elective_slot_id' => $electiveSlotId,
                            'passing_grade' => $passingGrade,
                            'subject_type' => $subjectType,
                            'requisite_id' => $requisiteId,
                        ]);
                        if ($subjectId && (
                            $subjectData['number_of_units'] !== null ||
                            $subjectData['number_of_hrs'] !== null
                        )) {
                            $subject = Subject::find($subjectId);
                            if ($subject) {
                                $subjectPatch = [];
                                if ($subjectData['number_of_units'] !== null) {
                                    $subjectPatch['number_of_units'] = $subjectData['number_of_units'];
                                }
                                if ($subjectData['number_of_hrs'] !== null) {
                                    $subjectPatch['number_of_hrs'] = $subjectData['number_of_hrs'];
                                }
                                if ($subjectPatch !== []) {
                                    $subject->update($subjectPatch);
                                }
                            }
                        }
                        $createdCount++;
                    } catch (\Illuminate\Database\QueryException $e) {
                        Log::error('Failed to create curriculum entry: ' . $e->getMessage(), [
                            'subject_id' => $subjectId,
                            'elective_slot_id' => $electiveSlotId,
                            'program_id' => $validated['program_id'],
                            'year_level' => $validated['year_level'],
                            'semester_id' => $validated['semester_id'],
                        ]);
                        throw $e;
                    }
                }
            }

            DB::commit();

            return response()->json([
                'message' => "Successfully added {$createdCount} subjects to curriculum."
            ], 201);

        } catch (\Illuminate\Validation\ValidationException $e) {
            DB::rollBack();
            return response()->json([
                'message' => 'Validation Error',
                'errors' => $e->errors()
            ], 422);
        } catch (\Exception $e) {
            DB::rollBack();
            Log::error('Curriculum batch store error: ' . $e->getMessage());
            return response()->json([
                'message' => 'Server Error: Failed to create curriculum', 
                'error' => $e->getMessage() // Remove this line in production
            ], 500);
        }
    }

    /**
     * Store a single curriculum entry (Used by Route::post('/', ...))
     */
    public function store(Request $request)
    {
        try {
            $validated = $request->validate([
                'program_id' => 'required|integer|exists:tbl_program,program_id',
                'year_level' => 'required|integer|exists:year_level,year_level_id',
                'semester_id' => 'required|integer|exists:tbl_semester,semester_id',
                'subject_id' => 'required|integer|exists:tbl_subjects,subject_id',
                'curriculum_header_id' => 'nullable|integer|exists:tbl_curriculum_header,curriculum_header_id',
                'passing_grade' => 'nullable|integer',
                'subject_type' => 'nullable|string',
                'requisite_id' => 'nullable|integer|exists:tbl_prerequisite,requisites_id',
            ]);

            $passingGrade = array_key_exists('passing_grade', $validated) ? $validated['passing_grade'] : null;
            $passingGrade = ($passingGrade === null || $passingGrade === '') ? null : (int) $passingGrade;

            $requisiteId = array_key_exists('requisite_id', $validated) ? $validated['requisite_id'] : null;
            $requisiteId = ($requisiteId === null || $requisiteId === '') ? null : (int) $requisiteId;

            $headerId = $validated['curriculum_header_id'] ?? null;
            if (!$headerId) {
                $latestHeader = CurriculumHeader::where('program_id', $validated['program_id'])
                    ->orderByDesc('Effective_Year')
                    ->orderByDesc('curriculum_header_id')
                    ->first();
                $headerId = $latestHeader?->curriculum_header_id;
            }

            $curriculum = Curriculum::create([
                'curriculum_header_id' => $headerId,
                'program_id' => $validated['program_id'],
                'year_level' => $validated['year_level'],
                'semester_id' => $validated['semester_id'],
                'subject_id' => $validated['subject_id'],
                'passing_grade' => $passingGrade,
                'subject_type' => $validated['subject_type'] ?? null,
                'requisite_id' => $requisiteId,
            ]);

            return response()->json($curriculum, 201);

        } catch (\Exception $e) {
            Log::error('Curriculum store error: ' . $e->getMessage());
            return response()->json(['message' => 'Failed to create curriculum', 'error' => $e->getMessage()], 500);
        }
    }

    /**
     * Update a curriculum entry
     */
    public function update(Request $request, $id)
    {
        try {
            $curriculum = Curriculum::findOrFail($id);

            $validated = $request->validate([
                'program_id' => 'sometimes|required|integer|exists:tbl_program,program_id',
                'year_level' => 'sometimes|required|integer|exists:year_level,year_level_id',
                'semester_id' => 'sometimes|required|integer|exists:tbl_semester,semester_id',
                'subject_id' => 'nullable|integer|exists:tbl_subjects,subject_id',
                'elective_slot_id' => 'nullable|integer|exists:tbl_elective_slot,elective_slot_id',
                'passing_grade' => 'nullable',
                'subject_type' => 'nullable|string|max:50',
                'requisite_id' => 'nullable|integer|exists:tbl_prerequisite,requisites_id',
                'number_of_units' => 'nullable|integer|min:0|max:30',
                'number_of_hrs' => 'nullable|integer|min:0|max:60',
            ]);

            // Validate that either subject_id or elective_slot_id is provided (but not both)
            if (empty($validated['subject_id']) && empty($validated['elective_slot_id'])) {
                // If both are null, keep the existing one
                if (!$curriculum->subject_id && !$curriculum->elective_slot_id) {
                    return response()->json([
                        'message' => 'Either subject_id or elective_slot_id must be provided'
                    ], 422);
                }
            }

            // Process passing_grade
            $passingGrade = array_key_exists('passing_grade', $validated) ? $validated['passing_grade'] : $curriculum->passing_grade;
            if ($passingGrade === '' || $passingGrade === null) {
                $passingGrade = null;
            } elseif (is_numeric($passingGrade)) {
                $passingGrade = (int) $passingGrade;
            }

            // Process elective_slot_id
            $electiveSlotId = array_key_exists('elective_slot_id', $validated) ? $validated['elective_slot_id'] : $curriculum->elective_slot_id;
            $electiveSlotId = ($electiveSlotId === null || $electiveSlotId === '') ? null : (int) $electiveSlotId;

            // Process subject_id
            $subjectId = array_key_exists('subject_id', $validated) ? $validated['subject_id'] : $curriculum->subject_id;
            $subjectId = ($subjectId === null || $subjectId === '') ? null : (int) $subjectId;

            // If elective_slot_id is set, clear subject_id and vice versa
            if ($electiveSlotId) {
                $subjectId = null;
            } elseif ($subjectId) {
                $electiveSlotId = null;
            }

            $curriculum->update([
                'program_id' => $validated['program_id'] ?? $curriculum->program_id,
                'year_level' => $validated['year_level'] ?? $curriculum->year_level,
                'semester_id' => $validated['semester_id'] ?? $curriculum->semester_id,
                'subject_id' => $subjectId,
                'elective_slot_id' => $electiveSlotId,
                'passing_grade' => $passingGrade,
                'subject_type' => $validated['subject_type'] ?? $curriculum->subject_type,
                'requisite_id' => $validated['requisite_id'] ?? $curriculum->requisite_id,
            ]);

            // Units/hours live on the subject catalog; allow editing them from curriculum modal.
            if ($subjectId && (array_key_exists('number_of_units', $validated) || array_key_exists('number_of_hrs', $validated))) {
                $subject = \App\Models\Subject::find($subjectId);
                if ($subject) {
                    $subjectPatch = [];
                    if (array_key_exists('number_of_units', $validated) && $validated['number_of_units'] !== null) {
                        $subjectPatch['number_of_units'] = (int) $validated['number_of_units'];
                    }
                    if (array_key_exists('number_of_hrs', $validated) && $validated['number_of_hrs'] !== null) {
                        $subjectPatch['number_of_hrs'] = (int) $validated['number_of_hrs'];
                    }
                    if ($subjectPatch !== []) {
                        $subject->update($subjectPatch);
                    }
                }
            }

            $curriculum->load([
                'program', 
                'subject', 
                'semester', 
                'yearLevel', 
                'requisite', 
                'electiveSlot.electiveSubjects.subject',
                'electiveSlot.electiveSubjects.track'
            ]);

            return response()->json($curriculum);
        } catch (ModelNotFoundException $e) {
            return response()->json(['message' => 'Curriculum entry not found'], 404);
        } catch (\Illuminate\Validation\ValidationException $e) {
            return response()->json([
                'message' => 'Validation Error',
                'errors' => $e->errors()
            ], 422);
        } catch (\Exception $e) {
            Log::error('Curriculum update error: ' . $e->getMessage());
            return response()->json(['message' => 'Failed to update curriculum', 'error' => $e->getMessage()], 500);
        }
    }

    public function destroy($id)
    {
        try {
            $curriculum = Curriculum::findOrFail($id);
            $curriculum->delete();

            return response()->json(['message' => 'Curriculum entry deleted successfully']);
        } catch (ModelNotFoundException $e) {
            return response()->json(['message' => 'Curriculum entry not found'], 404);
        } catch (QueryException $e) {
            $msg = $e->getMessage();
            if (stripos($msg, 'foreign key') !== false || stripos($msg, 'constraint') !== false) {
                return response()->json([
                    'message' => 'Cannot delete curriculum entry because it is referenced by other records',
                ], 409);
            }

            Log::error('Curriculum destroy query error: ' . $msg);
            return response()->json(['message' => 'Failed to delete curriculum', 'error' => $msg], 500);
        } catch (\Exception $e) {
            Log::error('Curriculum destroy error: ' . $e->getMessage());
            return response()->json(['message' => 'Failed to delete curriculum', 'error' => $e->getMessage()], 500);
        }
    }
}