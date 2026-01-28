<?php

namespace App\Http\Controllers;

use App\Models\Curriculum;
use App\Models\Prerequisite;
use App\Models\Subject;
use App\Models\Program;
use App\Models\YearLevel;
use App\Models\Semester;
use App\Models\Role;
use App\Models\AcademicYear;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class CurriculumController extends Controller
{
    public function index(Request $request)
    {
        try {
            // Allow unauthenticated/dev access when running locally so the
            // frontend can be developed without a full auth stack. Enforce
            // admin checks for non-local environments.
            if (!app()->environment('local')) {
                if (!$request->user() || !$request->user()->isAdmin()) {
                    return response()->json(['message' => 'Unauthorized'], 403);
                }
            }

            $curricula = Curriculum::with([
                'program',
                'curriculumHeader.program',
                'subject',
                'requisite.requiredSubject',
                'yearLevel',
                'semester',
            ])
                ->orderBy('program_id')
                ->orderBy('year_level')
                ->orderBy('semester_id')
                ->get();

            return response()->json($curricula);
        } catch (\Exception $e) {
            return response()->json(['error' => 'Failed to fetch curriculum', 'message' => $e->getMessage()], 500);
        }
    }

    public function store(Request $request)
    {
        try {
            if (!app()->environment('local')) {
                if (!$request->user() || !$request->user()->isAdmin()) {
                    return response()->json(['message' => 'Unauthorized'], 403);
                }
            }

            $validated = $request->validate([
                'program_id' => 'required|exists:tbl_program,program_id',
                'subject_id' => 'required|exists:tbl_subjects,subject_id',
                'year_level' => 'required|exists:year_level,year_level_id',
                'semester_id' => 'required|exists:tbl_semester,semester_id',
                'passing_grade' => 'nullable|integer',
                'subject_type' => 'nullable|string|max:50',
                'requisite_id' => 'nullable|exists:tbl_prerequisite,requisites_id',
            ]);

            $curriculum = Curriculum::create($validated);
            $curriculum->load(['program', 'curriculumHeader.program', 'subject', 'requisite.requiredSubject', 'yearLevel', 'semester']);

            return response()->json($curriculum, 201);
        } catch (\Exception $e) {
            return response()->json(['error' => 'Failed to create curriculum', 'message' => $e->getMessage()], 500);
        }
    }

    public function storeBatch(Request $request)
    {
        try {
            if (!app()->environment('local')) {
                if (!$request->user() || !$request->user()->isAdmin()) {
                    return response()->json(['message' => 'Unauthorized'], 403);
                }
            }

            $validated = $request->validate([
                'program_id' => 'required|exists:tbl_program,program_id',
                'year_level' => 'required|exists:year_level,year_level_id',
                'semester_id' => 'required|exists:tbl_semester,semester_id',
                'subjects' => 'required|array|min:1',
                'subjects.*.subject_id' => 'required|exists:tbl_subjects,subject_id',
                'subjects.*.passing_grade' => 'nullable|integer',
                'subjects.*.subject_type' => 'nullable|string|max:50',
                'subjects.*.requisite_id' => 'nullable|exists:tbl_prerequisite,requisites_id',
            ]);

            $curricula = [];
            
            DB::beginTransaction();
            try {
                foreach ($validated['subjects'] as $subjectData) {
                    $curriculum = Curriculum::create([
                        'program_id' => $validated['program_id'],
                        'year_level' => $validated['year_level'],
                        'semester_id' => $validated['semester_id'],
                        'subject_id' => $subjectData['subject_id'],
                        'passing_grade' => $subjectData['passing_grade'] ?? null,
                        'subject_type' => $subjectData['subject_type'] ?? null,
                        'requisite_id' => $subjectData['requisite_id'] ?? null,
                    ]);
                    
                    $curriculum->load(['program', 'curriculumHeader.program', 'subject', 'requisite.requiredSubject', 'yearLevel', 'semester']);
                    $curricula[] = $curriculum;
                }
                
                DB::commit();
                
                return response()->json([
                    'message' => 'Curriculum entries created successfully',
                    'data' => $curricula,
                    'count' => count($curricula)
                ], 201);
            } catch (\Exception $e) {
                DB::rollBack();
                throw $e;
            }
        } catch (\Exception $e) {
            return response()->json(['error' => 'Failed to create curriculum entries', 'message' => $e->getMessage()], 500);
        }
    }

    public function show(Request $request, $id)
    {
        try {
            if (!app()->environment('local')) {
                if (!$request->user() || !$request->user()->isAdmin()) {
                    return response()->json(['message' => 'Unauthorized'], 403);
                }
            }

            $curriculum = Curriculum::with(['program', 'subject', 'requisite.requiredSubject', 'yearLevel', 'semester'])
                ->findOrFail($id);

            return response()->json($curriculum);
        } catch (\Exception $e) {
            return response()->json(['error' => 'Failed to fetch curriculum', 'message' => $e->getMessage()], 500);
        }
    }

    public function update(Request $request, $id)
    {
        try {
            if (!app()->environment('local')) {
                if (!$request->user() || !$request->user()->isAdmin()) {
                    return response()->json(['message' => 'Unauthorized'], 403);
                }
            }

            $curriculum = Curriculum::findOrFail($id);

            $validated = $request->validate([
                'program_id' => 'required|exists:tbl_program,program_id',
                'subject_id' => 'required|exists:tbl_subjects,subject_id',
                'year_level' => 'required|exists:year_level,year_level_id',
                'semester_id' => 'required|exists:tbl_semester,semester_id',
                'passing_grade' => 'nullable|integer',
                'subject_type' => 'nullable|string|max:50',
                'requisite_id' => 'nullable|exists:tbl_prerequisite,requisites_id',
            ]);

            $curriculum->update($validated);
            $curriculum->load(['program', 'curriculumHeader.program', 'subject', 'requisite.requiredSubject', 'yearLevel', 'semester']);

            return response()->json($curriculum);
        } catch (\Exception $e) {
            return response()->json(['error' => 'Failed to update curriculum', 'message' => $e->getMessage()], 500);
        }
    }

    public function destroy(Request $request, $id)
    {
        try {
            if (!app()->environment('local')) {
                if (!$request->user() || !$request->user()->isAdmin()) {
                    return response()->json(['message' => 'Unauthorized'], 403);
                }
            }

            $curriculum = Curriculum::withoutGlobalScopes()->find($id);
            if (!$curriculum) {
                return response()->json(['message' => 'Curriculum not found'], 404);
            }
            $curriculum->delete();

            return response()->json(['message' => 'Curriculum deleted successfully']);
        } catch (\Exception $e) {
            return response()->json(['error' => 'Failed to delete curriculum', 'message' => $e->getMessage()], 500);
        }
    }

    public function lookupData(Request $request)
    {
        try {
            // Check if user is admin (only in production/local environments)
            if (!app()->environment('local')) {
                if (!$request->user() || !$request->user()->isAdmin()) {
                    return response()->json(['message' => 'Unauthorized'], 403);
                }
            }

            // Build response safely so a single failing query won't blow up the whole endpoint
            $programs = Program::with(['department', 'campus'])->get();
            $subjects = Subject::all();
            $yearLevels = YearLevel::all();
            $semesters = Semester::all();
            $roles = Role::all();
            $academicYears = AcademicYear::all();

            // Use tbl_prerequisite as the unified source for requisites.
            // Expose it under the legacy `requisites` key so existing frontend
            // code continues to work and curriculum.requisite_id matches.
            $requisites = Prerequisite::with(['subject', 'requiredSubject'])->get();

            return response()->json([
                'programs' => $programs,
                'subjects' => $subjects,
                'yearLevels' => $yearLevels,
                'semesters' => $semesters,
                'requisites' => $requisites,
                'roles' => $roles,
                'academicYears' => $academicYears,
            ]);
        } catch (\Exception $e) {
            return response()->json(['error' => 'Failed to fetch lookup data', 'message' => $e->getMessage()], 500);
        }
    }
}
