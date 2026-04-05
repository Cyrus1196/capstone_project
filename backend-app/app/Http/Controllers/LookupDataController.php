<?php

namespace App\Http\Controllers;

use App\Models\Campus;
use App\Models\Department;
use App\Models\Program;
use App\Models\Subject;
use App\Models\Role;
use App\Models\YearLevel;
use App\Models\Semester;
use App\Models\Section;
use App\Models\AcademicYear;
use App\Models\Track;
use App\Models\CurriculumHeader;
use App\Models\OfferedSubject;
use App\Models\ElectiveSubject;
use App\Models\Prerequisite;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class LookupDataController extends Controller
{
    private function normalizedSemesterStatus(?string $status): string
    {
        $s = strtolower(trim((string) ($status ?? '')));

        return $s === 'active' ? 'active' : 'inactive';
    }

    /** Ensure only one semester is active: deactivate all except $exceptSemesterId (when not null). */
    private function deactivateAllSemestersExcept(?int $exceptSemesterId): void
    {
        $q = Semester::query();
        if ($exceptSemesterId !== null) {
            $q->where('semester_id', '!=', $exceptSemesterId);
        }
        $q->update(['status' => 'inactive']);
    }

    private function ensureLookupAccess(Request $request, string $slug, bool $write = false): ?\Illuminate\Http\JsonResponse
    {
        $user = $request->user();
        if (! $user) {
            return response()->json(['message' => 'Unauthenticated'], 401);
        }
        if (! $user->canAccessLookupResource($slug, $write)) {
            return response()->json(['message' => 'Forbidden'], 403);
        }

        return null;
    }

    // Campus Management
    public function getCampus(Request $request)
    {
        try {
            if ($resp = $this->ensureLookupAccess($request, 'campus')) {
                return $resp;
            }
            return response()->json(Campus::all());
        } catch (\Exception $e) {
            return response()->json(['error' => 'Failed to fetch campus', 'message' => $e->getMessage()], 500);
        }
    }

    public function createCampus(Request $request)
    {
        if ($resp = $this->ensureLookupAccess($request, 'campus', true)) {
            return $resp;
        }
        $validated = $request->validate(['campus_name' => 'required|string|max:100']);
        $campus = Campus::create($validated);
        return response()->json($campus, 201);
    }

    public function updateCampus(Request $request, $id)
    {
        if ($resp = $this->ensureLookupAccess($request, 'campus', true)) {
            return $resp;
        }
        $campus = Campus::findOrFail($id);
        $validated = $request->validate(['campus_name' => 'required|string|max:100']);
        $campus->update($validated);
        return response()->json($campus);
    }

    public function deleteCampus(Request $request, $id)
    {
        if ($resp = $this->ensureLookupAccess($request, 'campus', true)) {
            return $resp;
        }
        $campus = Campus::findOrFail($id);
        $campus->delete();
        return response()->json(['message' => 'Campus deleted successfully']);
    }

    // Department Management
    public function getDepartments(Request $request)
    {
        try {
            if ($resp = $this->ensureLookupAccess($request, 'departments')) {
                return $resp;
            }
            return response()->json(Department::with('campus')->get());
        } catch (\Exception $e) {
            return response()->json(['error' => 'Failed to fetch departments', 'message' => $e->getMessage()], 500);
        }
    }

    public function createDepartment(Request $request)
    {
        try {
            \Log::info('Creating department with data:', $request->all());

            if ($resp = $this->ensureLookupAccess($request, 'departments', true)) {
                return $resp;
            }

            $validated = $request->validate([
                'campus_id' => 'required|exists:tbl_campus,campus_id',
                'department_name' => 'required|string|max:100',
                'department_code' => 'required|string|max:255',
            ]);

            \Log::info('Validated data:', $validated);

            $department = Department::create($validated);
            $department->load('campus');
            \Log::info('Department created:', $department->toArray());

            return response()->json($department, 201);
        } catch (\Illuminate\Validation\ValidationException $e) {
            return response()->json([
                'error' => 'Validation failed',
                'messages' => $e->errors(),
            ], 422);
        } catch (\Exception $e) {
            \Log::error('Error creating department: ' . $e->getMessage());
            return response()->json(['error' => 'Failed to create department', 'message' => $e->getMessage()], 500);
        }
    }

    public function updateDepartment(Request $request, $id)
    {
        if ($resp = $this->ensureLookupAccess($request, 'departments', true)) {
            return $resp;
        }
        $department = Department::findOrFail($id);
        $validated = $request->validate([
            'campus_id' => 'required|exists:tbl_campus,campus_id',
            'department_name' => 'required|string|max:100',
            'department_code' => 'required|string|max:255',
        ]);
        $department->update($validated);
        $department->load('campus');
        return response()->json($department);
    }

    public function deleteDepartment(Request $request, $id)
    {
        if ($resp = $this->ensureLookupAccess($request, 'departments', true)) {
            return $resp;
        }
        $department = Department::findOrFail($id);
        $department->delete();
        return response()->json(['message' => 'Department deleted successfully']);
    }

    // Program Management
    public function getPrograms(Request $request)
    {
        try {
            if ($resp = $this->ensureLookupAccess($request, 'programs')) {
                return $resp;
            }
            return response()->json(Program::with('department')->get());
        } catch (\Exception $e) {
            return response()->json(['error' => 'Failed to fetch programs', 'message' => $e->getMessage()], 500);
        }
    }

    public function createProgram(Request $request)
    {
        if ($resp = $this->ensureLookupAccess($request, 'programs', true)) {
            return $resp;
        }
        $validated = $request->validate([
            'department_id' => 'required|exists:tbl_departments,department_id',
            'program_code' => 'nullable|string|max:50',
            'program_name' => 'nullable|string|max:100',
            'total_units_required' => 'nullable|integer',
        ]);
        
        // Get campus_id from the department
        $department = Department::find($validated['department_id']);
        $campusId = $department->campus_id;
        
        // Fallback: if department has no campus, use the first available campus
        if (!$campusId) {
            $campus = Campus::first();
            if (!$campus) {
                return response()->json(['error' => 'No campus found. Please create a campus first.'], 400);
            }
            $campusId = $campus->campus_id;
        }
        
        $validated['campus_id'] = $campusId;
        
        $program = Program::create($validated);
        $program->load('department');
        return response()->json($program, 201);
    }

    public function updateProgram(Request $request, $id)
    {
        if ($resp = $this->ensureLookupAccess($request, 'programs', true)) {
            return $resp;
        }
        $program = Program::findOrFail($id);
        $validated = $request->validate([
            'department_id' => 'required|exists:tbl_departments,department_id',
            'program_code' => 'nullable|string|max:50',
            'program_name' => 'nullable|string|max:100',
            'total_units_required' => 'nullable|integer',
        ]);
        
        // Get campus_id from the department if department changed
        $department = Department::find($validated['department_id']);
        $campusId = $department->campus_id;
        
        // Fallback: if department has no campus, use the first available campus
        if (!$campusId) {
            $campus = Campus::first();
            if (!$campus) {
                return response()->json(['error' => 'No campus found. Please create a campus first.'], 400);
            }
            $campusId = $campus->campus_id;
        }
        
        $validated['campus_id'] = $campusId;
        
        $program->update($validated);
        $program->load('department');
        return response()->json($program);
    }

    public function deleteProgram(Request $request, $id)
    {
        if ($resp = $this->ensureLookupAccess($request, 'programs', true)) {
            return $resp;
        }
        $program = Program::findOrFail($id);
        $program->delete();
        return response()->json(['message' => 'Program deleted successfully']);
    }

    // Subject Management
    public function getSubjects(Request $request)
    {
        try {
            if ($resp = $this->ensureLookupAccess($request, 'subjects')) {
                return $resp;
            }
            return response()->json(Subject::all());
        } catch (\Exception $e) {
            return response()->json(['error' => 'Failed to fetch subjects', 'message' => $e->getMessage()], 500);
        }
    }

    public function createSubject(Request $request)
    {
        if ($resp = $this->ensureLookupAccess($request, 'subjects', true)) {
            return $resp;
        }
        $validated = $request->validate([
            'subject_code' => 'required|string|max:50',
            'subject_name' => 'required|string|max:100',
            'number_of_units' => 'nullable|integer',
            'number_of_hrs' => 'nullable|integer',
        ]);
        $subject = Subject::create($validated);
        return response()->json($subject, 201);
    }

    public function updateSubject(Request $request, $id)
    {
        if ($resp = $this->ensureLookupAccess($request, 'subjects', true)) {
            return $resp;
        }
        $subject = Subject::findOrFail($id);
        $validated = $request->validate([
            'subject_code' => 'required|string|max:50',
            'subject_name' => 'required|string|max:100',
            'number_of_units' => 'nullable|integer',
            'number_of_hrs' => 'nullable|integer',
        ]);
        $subject->update($validated);
        return response()->json($subject);
    }

    public function deleteSubject(Request $request, $id)
    {
        if ($resp = $this->ensureLookupAccess($request, 'subjects', true)) {
            return $resp;
        }
        $subject = Subject::findOrFail($id);
        $subject->delete();
        return response()->json(['message' => 'Subject deleted successfully']);
    }

    // Year Level Management
    public function getYearLevels(Request $request)
    {
        try {
            if ($resp = $this->ensureLookupAccess($request, 'year_levels')) {
                return $resp;
            }
            return response()->json(YearLevel::all());
        } catch (\Exception $e) {
            return response()->json(['error' => 'Failed to fetch year levels', 'message' => $e->getMessage()], 500);
        }
    }

    public function createYearLevel(Request $request)
    {
        if ($resp = $this->ensureLookupAccess($request, 'year_levels', true)) {
            return $resp;
        }
        $validated = $request->validate(['year_level' => 'required|string|max:50']);
        $yearLevel = YearLevel::create($validated);
        return response()->json($yearLevel, 201);
    }

    public function updateYearLevel(Request $request, $id)
    {
        if ($resp = $this->ensureLookupAccess($request, 'year_levels', true)) {
            return $resp;
        }
        $yearLevel = YearLevel::findOrFail($id);
        $validated = $request->validate(['year_level' => 'required|string|max:50']);
        $yearLevel->update($validated);
        return response()->json($yearLevel);
    }

    public function deleteYearLevel(Request $request, $id)
    {
        if ($resp = $this->ensureLookupAccess($request, 'year_levels', true)) {
            return $resp;
        }
        $yearLevel = YearLevel::findOrFail($id);
        $yearLevel->delete();
        return response()->json(['message' => 'Year level deleted successfully']);
    }

    // Semester Management
    public function getSemesters(Request $request)
    {
        try {
            if ($resp = $this->ensureLookupAccess($request, 'semesters')) {
                return $resp;
            }
            $semesters = Semester::all()->map(function ($semester) {
                if ($semester->status === null || $semester->status === '') {
                    $semester->status = 'inactive';
                }
                return $semester;
            });

            return response()->json($semesters);
        } catch (\Exception $e) {
            return response()->json(['error' => 'Failed to fetch semesters', 'message' => $e->getMessage()], 500);
        }
    }

    // Academic Year Management
    public function getAcademicYears(Request $request)
    {
        try {
            if ($resp = $this->ensureLookupAccess($request, 'academic_years')) {
                return $resp;
            }
            $years = AcademicYear::all()->map(function ($y) {
                return [
                    'academic_year_id' => $y->academic_year_id,
                    'academic_year_name' => $y->academic_year_name,
                    'name' => $y->academic_year_name,
                ];
            });
            return response()->json($years);
        } catch (\Exception $e) {
            return response()->json(['error' => 'Failed to fetch academic years', 'message' => $e->getMessage()], 500);
        }
    }

    public function createAcademicYear(Request $request)
    {
        if ($resp = $this->ensureLookupAccess($request, 'academic_years', true)) {
            return $resp;
        }

        $validated = $request->validate([
            'academic_year_name' => 'sometimes|string|max:100',
            'name' => 'sometimes|string|max:100',
        ]);

        $yearName = $validated['academic_year_name'] ?? $validated['name'] ?? null;
        $year = AcademicYear::create([
            'academic_year_name' => $yearName,
        ]);

        return response()->json([
            'academic_year_id' => $year->academic_year_id,
            'academic_year_name' => $year->academic_year_name,
            'name' => $year->academic_year_name,
        ], 201);
    }

    public function updateAcademicYear(Request $request, $id)
    {
        if ($resp = $this->ensureLookupAccess($request, 'academic_years', true)) {
            return $resp;
        }

        $year = AcademicYear::findOrFail($id);

        $validated = $request->validate([
            'academic_year_name' => 'sometimes|string|max:100',
            'name' => 'sometimes|string|max:100',
        ]);

        $yearName = $validated['academic_year_name'] ?? $validated['name'] ?? null;
        if ($yearName !== null) {
            $year->update(['academic_year_name' => $yearName]);
        }

        return response()->json([
            'academic_year_id' => $year->academic_year_id,
            'academic_year_name' => $year->academic_year_name,
            'name' => $year->academic_year_name,
        ]);
    }

    public function deleteAcademicYear(Request $request, $id)
    {
        if ($resp = $this->ensureLookupAccess($request, 'academic_years', true)) {
            return $resp;
        }

        $year = AcademicYear::findOrFail($id);
        $year->delete();
        return response()->json(['message' => 'Academic year deleted successfully']);
    }

    public function createSemester(Request $request)
    {
        if ($resp = $this->ensureLookupAccess($request, 'semesters', true)) {
            return $resp;
        }
        $validated = $request->validate([
            'semester_name' => 'required|string|max:50',
            'status' => 'nullable|in:active,inactive',
        ]);

        $status = $validated['status'] ?? null;
        if ($status === null || $status === '') {
            $status = 'inactive';
        }

        // Only one semester may be active at a time
        if ($status === 'active') {
            $this->deactivateAllSemestersExcept(null);
        }

        $semester = Semester::create([
            'semester_name' => $validated['semester_name'],
            'status' => $status,
        ]);
        return response()->json($semester, 201);
    }

    public function updateSemester(Request $request, $id)
    {
        if ($resp = $this->ensureLookupAccess($request, 'semesters', true)) {
            return $resp;
        }
        $semester = Semester::findOrFail($id);
        $validated = $request->validate([
            'semester_name' => 'required|string|max:50',
            'status' => 'nullable|in:active,inactive',
        ]);

        $status = $validated['status'] ?? null;
        if ($status === null || $status === '') {
            $status = 'inactive';
        }

        if ($status === 'active') {
            $this->deactivateAllSemestersExcept((int) $id);
        }

        $semester->update([
            'semester_name' => $validated['semester_name'],
            'status' => $status,
        ]);
        return response()->json($semester);
    }

    public function toggleSemesterStatus(Request $request, $id)
    {
        if ($resp = $this->ensureLookupAccess($request, 'semesters', true)) {
            return $resp;
        }

        $id = (int) $id;
        $semester = Semester::findOrFail($id);
        $current = $this->normalizedSemesterStatus($semester->status);
        $newStatus = $current === 'active' ? 'inactive' : 'active';

        DB::transaction(function () use ($semester, $id, $newStatus) {
            if ($newStatus === 'active') {
                $this->deactivateAllSemestersExcept($id);
            }
            $semester->update(['status' => $newStatus]);
        });

        $semester->refresh();

        return response()->json($semester);
    }

    public function deleteSemester(Request $request, $id)
    {
        if ($resp = $this->ensureLookupAccess($request, 'semesters', true)) {
            return $resp;
        }
        $semester = Semester::findOrFail($id);
        $semester->delete();
        return response()->json(['message' => 'Semester deleted successfully']);
    }

    // Role Management
    public function getRoles(Request $request)
    {
        try {
            if ($resp = $this->ensureLookupAccess($request, 'roles')) {
                return $resp;
            }
            return response()->json(Role::all());
        } catch (\Exception $e) {
            return response()->json(['error' => 'Failed to fetch roles', 'message' => $e->getMessage()], 500);
        }
    }

    // Access Levels Management
    public function getAccessLevels(Request $request)
    {
        try {
            if ($resp = $this->ensureLookupAccess($request, 'roles')) {
                return $resp;
            }
            
            // Return predefined access levels matching the database
            $accessLevels = [
                ['id' => 10, 'name' => 'Admin', 'description' => 'Full system access'],
                ['id' => 8, 'name' => 'Evaluator', 'description' => 'Evaluator access'],
                ['id' => 9, 'name' => 'Dean', 'description' => 'Dean access'],
                ['id' => 5, 'name' => 'Student', 'description' => 'Student access'],
            ];
            
            return response()->json($accessLevels);
        } catch (\Exception $e) {
            return response()->json(['error' => 'Failed to fetch access levels', 'message' => $e->getMessage()], 500);
        }
    }

    public function createRole(Request $request)
    {
        if ($resp = $this->ensureLookupAccess($request, 'roles', true)) {
            return $resp;
        }

        $validated = $request->validate([
            'role_name' => 'required|string|max:100',
            'access_level' => 'nullable|integer',
            'description' => 'nullable|string',
        ]);

        $role = Role::create([
            'role_name' => $validated['role_name'],
            'access_level' => $validated['access_level'] ?? null,
            'description' => $validated['description'] ?? null,
        ]);

        return response()->json($role, 201);
    }

    public function updateRole(Request $request, $id)
    {
        if ($resp = $this->ensureLookupAccess($request, 'roles', true)) {
            return $resp;
        }

        $role = Role::findOrFail($id);

        $validated = $request->validate([
            'role_name' => 'required|string|max:100',
            'access_level' => 'nullable|integer',
            'description' => 'nullable|string',
        ]);

        $role->update($validated);

        return response()->json($role);
    }

    public function deleteRole(Request $request, $id)
    {
        if ($resp = $this->ensureLookupAccess($request, 'roles', true)) {
            return $resp;
        }

        $role = Role::findOrFail($id);
        $role->delete();

        return response()->json(['message' => 'Role deleted successfully']);
    }

    // Section Management
    public function getSections(Request $request)
    {
        try {
            if ($resp = $this->ensureLookupAccess($request, 'sections')) {
                return $resp;
            }
            $sections = Section::all()->map(function ($s) {
                return [
                    'section_id' => $s->section_id,
                    'name' => $s->section_name,
                ];
            });
            return response()->json($sections);
        } catch (\Exception $e) {
            return response()->json(['error' => 'Failed to fetch sections', 'message' => $e->getMessage()], 500);
        }
    }

    public function createSection(Request $request)
    {
        if ($resp = $this->ensureLookupAccess($request, 'sections', true)) {
            return $resp;
        }

        $validated = $request->validate([
            'name' => 'required|string|max:50',
            'section_name' => 'sometimes|string|max:50',
        ]);

        $sectionName = $validated['name'] ?? $validated['section_name'] ?? null;

        $section = Section::create([
            'section_name' => $sectionName,
        ]);

        return response()->json([
            'section_id' => $section->section_id,
            'name' => $section->section_name,
        ], 201);
    }

    public function updateSection(Request $request, $id)
    {
        if ($resp = $this->ensureLookupAccess($request, 'sections', true)) {
            return $resp;
        }

        $section = Section::findOrFail($id);

        $validated = $request->validate([
            'name' => 'required|string|max:50',
            'section_name' => 'sometimes|string|max:50',
        ]);

        $sectionName = $validated['name'] ?? $validated['section_name'] ?? null;
        $section->update(['section_name' => $sectionName]);

        return response()->json([
            'section_id' => $section->section_id,
            'name' => $section->section_name,
        ]);
    }

    public function deleteSection(Request $request, $id)
    {
        if ($resp = $this->ensureLookupAccess($request, 'sections', true)) {
            return $resp;
        }

        $section = Section::findOrFail($id);
        $section->delete();

        return response()->json(['message' => 'Section deleted successfully']);
    }

    // Track Management
    public function getTracks(Request $request)
    {
        try {
            if ($resp = $this->ensureLookupAccess($request, 'tracks')) {
                return $resp;
            }
            return response()->json(Track::all());
        } catch (\Exception $e) {
            return response()->json(['error' => 'Failed to fetch tracks', 'message' => $e->getMessage()], 500);
        }
    }

    public function createTrack(Request $request)
    {
        if ($resp = $this->ensureLookupAccess($request, 'tracks', true)) {
            return $resp;
        }

        $validated = $request->validate([
            'track_code' => 'required|string|max:50',
            'track_name' => 'required|string|max:100',
        ]);

        $track = Track::create($validated);
        return response()->json($track, 201);
    }

    public function updateTrack(Request $request, $id)
    {
        if ($resp = $this->ensureLookupAccess($request, 'tracks', true)) {
            return $resp;
        }

        $track = Track::findOrFail($id);
        $validated = $request->validate([
            'track_code' => 'required|string|max:50',
            'track_name' => 'required|string|max:100',
        ]);

        $track->update($validated);
        return response()->json($track);
    }

    public function deleteTrack(Request $request, $id)
    {
        if ($resp = $this->ensureLookupAccess($request, 'tracks', true)) {
            return $resp;
        }

        $track = Track::findOrFail($id);
        $track->delete();

        return response()->json(['message' => 'Track deleted successfully']);
    }

    // Requisite Management (tbl_prerequisite)
    public function getRequisites(Request $request)
    {
        try {
            if ($resp = $this->ensureLookupAccess($request, 'requisites')) {
                return $resp;
            }

            $requisites = Prerequisite::with(['subject', 'requiredSubject'])->get();
            return response()->json($requisites);
        } catch (\Exception $e) {
            return response()->json(['error' => 'Failed to fetch requisites', 'message' => $e->getMessage()], 500);
        }
    }

    public function createRequisite(Request $request)
    {
        if ($resp = $this->ensureLookupAccess($request, 'requisites', true)) {
            return $resp;
        }

        $validated = $request->validate([
            'subject_id' => 'required|exists:tbl_subjects,subject_id',
            'requisite_type' => 'required|in:prerequisite,corequisite',
            'requisites_subject_id' => 'required|exists:tbl_subjects,subject_id|different:subject_id',
        ]);

        $requisite = Prerequisite::create($validated);
        $requisite->load(['subject', 'requiredSubject']);

        return response()->json($requisite, 201);
    }

    public function updateRequisite(Request $request, $id)
    {
        if ($resp = $this->ensureLookupAccess($request, 'requisites', true)) {
            return $resp;
        }

        $requisite = Prerequisite::findOrFail($id);

        $validated = $request->validate([
            'subject_id' => 'required|exists:tbl_subjects,subject_id',
            'requisite_type' => 'required|in:prerequisite,corequisite',
            'requisites_subject_id' => 'required|exists:tbl_subjects,subject_id|different:subject_id',
        ]);

        $requisite->update($validated);
        $requisite->load(['subject', 'requiredSubject']);

        return response()->json($requisite);
    }

    public function deleteRequisite(Request $request, $id)
    {
        if ($resp = $this->ensureLookupAccess($request, 'requisites', true)) {
            return $resp;
        }

        $requisite = Prerequisite::findOrFail($id);
        $requisite->delete();

        return response()->json(['message' => 'Requisite deleted successfully']);
    }

    // Curriculum Header Management
    public function getCurriculumHeaders(Request $request)
    {
        try {
            if ($resp = $this->ensureLookupAccess($request, 'curriculum_headers')) {
                return $resp;
            }

            $headers = CurriculumHeader::with('program')->get();
            return response()->json($headers);
        } catch (\Exception $e) {
            return response()->json(['error' => 'Failed to fetch curriculum headers', 'message' => $e->getMessage()], 500);
        }
    }

    public function createCurriculumHeader(Request $request)
    {
        if ($resp = $this->ensureLookupAccess($request, 'curriculum_headers', true)) {
            return $resp;
        }

        $validated = $request->validate([
            'program_id' => 'required|exists:tbl_program,program_id',
            'Effective_Year' => 'required|integer',
            'description' => 'nullable|string',
        ]);

        $header = CurriculumHeader::create($validated);
        $header->load('program');

        return response()->json($header, 201);
    }

    public function updateCurriculumHeader(Request $request, $id)
    {
        if ($resp = $this->ensureLookupAccess($request, 'curriculum_headers', true)) {
            return $resp;
        }

        $header = CurriculumHeader::findOrFail($id);

        $validated = $request->validate([
            'program_id' => 'required|exists:tbl_program,program_id',
            'Effective_Year' => 'required|integer',
            'description' => 'nullable|string',
        ]);

        $header->update($validated);
        $header->load('program');

        return response()->json($header);
    }

    public function deleteCurriculumHeader(Request $request, $id)
    {
        if ($resp = $this->ensureLookupAccess($request, 'curriculum_headers', true)) {
            return $resp;
        }

        $header = CurriculumHeader::findOrFail($id);
        $header->delete();

        return response()->json(['message' => 'Curriculum header deleted successfully']);
    }

    // Offered Subject Management
    public function getOfferedSubjects(Request $request)
    {
        try {
            if ($resp = $this->ensureLookupAccess($request, 'offered_subjects')) {
                return $resp;
            }

            $offered = OfferedSubject::with(['subject', 'academicYear', 'semester', 'program', 'track', 'yearLevel'])->get();
            return response()->json($offered);
        } catch (\Exception $e) {
            return response()->json(['error' => 'Failed to fetch offered subjects', 'message' => $e->getMessage()], 500);
        }
    }

    public function createOfferedSubject(Request $request)
    {
        if ($resp = $this->ensureLookupAccess($request, 'offered_subjects', true)) {
            return $resp;
        }

        $validated = $request->validate([
            'subject_id' => 'required|exists:tbl_subjects,subject_id',
            'academic_year_id' => 'required|exists:tbl_academic_year,academic_year_id',
            'semester_id' => 'required|exists:tbl_semester,semester_id',
            'program_id' => 'required|exists:tbl_program,program_id',
            'track_id' => 'nullable|exists:tbl_track,track_id',
            'year_level_id' => 'nullable|exists:year_level,year_level_id',
            'status' => 'nullable|string|max:50',
        ]);

        $offered = OfferedSubject::create($validated);
        $offered->load(['subject', 'academicYear', 'semester', 'program', 'track', 'yearLevel']);

        return response()->json($offered, 201);
    }

    public function updateOfferedSubject(Request $request, $id)
    {
        if ($resp = $this->ensureLookupAccess($request, 'offered_subjects', true)) {
            return $resp;
        }

        $offered = OfferedSubject::findOrFail($id);

        $validated = $request->validate([
            'subject_id' => 'required|exists:tbl_subjects,subject_id',
            'academic_year_id' => 'required|exists:tbl_academic_year,academic_year_id',
            'semester_id' => 'required|exists:tbl_semester,semester_id',
            'program_id' => 'required|exists:tbl_program,program_id',
            'track_id' => 'nullable|exists:tbl_track,track_id',
            'year_level_id' => 'nullable|exists:year_level,year_level_id',
            'status' => 'nullable|string|max:50',
        ]);

        $offered->update($validated);
        $offered->load(['subject', 'academicYear', 'semester', 'program', 'track', 'yearLevel']);

        return response()->json($offered);
    }

    public function deleteOfferedSubject(Request $request, $id)
    {
        if ($resp = $this->ensureLookupAccess($request, 'offered_subjects', true)) {
            return $resp;
        }

        $offered = OfferedSubject::findOrFail($id);
        $offered->delete();

        return response()->json(['message' => 'Offered subject deleted successfully']);
    }

    // Elective Subject Management
    public function getElectiveSubjects(Request $request)
    {
        try {
            if ($resp = $this->ensureLookupAccess($request, 'elective_subjects')) {
                return $resp;
            }

            $electives = ElectiveSubject::with(['track', 'subject'])->get();
            return response()->json($electives);
        } catch (\Exception $e) {
            return response()->json(['error' => 'Failed to fetch elective subjects', 'message' => $e->getMessage()], 500);
        }
    }

    public function createElectiveSubject(Request $request)
    {
        if ($resp = $this->ensureLookupAccess($request, 'elective_subjects', true)) {
            return $resp;
        }

        $validated = $request->validate([
            'track_id' => 'required|exists:tbl_track,track_id',
            'subject_id' => 'required|exists:tbl_subjects,subject_id',
            'description' => 'nullable|string',
        ]);

        $elective = ElectiveSubject::create($validated);
        $elective->load(['track', 'subject']);

        return response()->json($elective, 201);
    }

    public function updateElectiveSubject(Request $request, $id)
    {
        if ($resp = $this->ensureLookupAccess($request, 'elective_subjects', true)) {
            return $resp;
        }

        $elective = ElectiveSubject::findOrFail($id);

        $validated = $request->validate([
            'track_id' => 'required|exists:tbl_track,track_id',
            'subject_id' => 'required|exists:tbl_subjects,subject_id',
            'description' => 'nullable|string',
        ]);

        $elective->update($validated);
        $elective->load(['track', 'subject']);

        return response()->json($elective);
    }

    public function deleteElectiveSubject(Request $request, $id)
    {
        if ($resp = $this->ensureLookupAccess($request, 'elective_subjects', true)) {
            return $resp;
        }

        $elective = ElectiveSubject::findOrFail($id);
        $elective->delete();

        return response()->json(['message' => 'Elective subject deleted successfully']);
    }
}

