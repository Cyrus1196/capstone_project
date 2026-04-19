<?php

use Illuminate\Http\Request;
use Illuminate\Support\Facades\Route;
use App\Http\Controllers\AuthController;
use App\Http\Controllers\JwtAuthController;
use App\Http\Controllers\UserController;
use App\Http\Controllers\CurriculumController;
use App\Http\Controllers\LookupDataController;
use App\Http\Controllers\PrerequisiteController;
use App\Http\Controllers\CorequisiteController;
use App\Http\Controllers\RequisiteController;
use App\Http\Controllers\StudentController;
use App\Http\Controllers\DeanController;
use App\Http\Controllers\FacultyController;
use App\Http\Controllers\StudentEvaluationController;
use App\Http\Controllers\EvaluationController;
use App\Http\Controllers\EvaluationReportController;
use App\Http\Controllers\CreditEvaluationController;
use App\Http\Controllers\SchoolController;
use App\Http\Controllers\OtherSchoolSubjectController;
use App\Http\Controllers\SubjectEquivalenceController;
use App\Http\Controllers\PermissionController;
use App\Http\Controllers\AuditLogController;
use App\Http\Controllers\ElectiveSlotController;
use App\Http\Controllers\GuestCreditSimulationController;
use App\Http\Controllers\SecuritySettingsController;

// Public routes
Route::post('/login', [AuthController::class, 'login']);

// JWT Authentication routes (public)
Route::prefix('jwt')->group(function () {
    Route::post('/login', [JwtAuthController::class, 'login']);
    Route::post('/register', [JwtAuthController::class, 'register']);
});

// Refresh: allows expired access token within refresh_ttl (tymon jwt.refresh)
Route::post('/jwt/refresh', [JwtAuthController::class, 'refresh'])->middleware('jwt.refresh');

// Public read-only (landing / guest simulation — no login)
Route::post('/guest/credit-simulation', [GuestCreditSimulationController::class, 'simulate']);
Route::get('/schools', [SchoolController::class, 'index']);

// Curriculum catalog: read-only list for guest panel and public browse (mutations require auth below)
Route::get('/curriculum/lookup/data', [CurriculumController::class, 'lookupData']);
Route::get('/curriculum', [CurriculumController::class, 'index']);

// Protected routes (JWT Bearer via auth:api guard)
Route::middleware('auth:api')->group(function () {
    Route::prefix('requisites')->group(function () {
        Route::get('/', [RequisiteController::class, 'index']);
        Route::post('/', [RequisiteController::class, 'store']);
        Route::get('/{id}', [RequisiteController::class, 'show']);
        Route::put('/{id}', [RequisiteController::class, 'update']);
        Route::delete('/{id}', [RequisiteController::class, 'destroy']);
        Route::get('/subject/{subjectId}', [RequisiteController::class, 'getBySubject']);
    });

    Route::prefix('prerequisites')->group(function () {
        Route::get('/', [PrerequisiteController::class, 'index']);
        Route::post('/', [PrerequisiteController::class, 'store']);
        Route::delete('/{id}', [PrerequisiteController::class, 'destroy']);
    });

    Route::prefix('corequisites')->group(function () {
        Route::get('/', [CorequisiteController::class, 'index']);
        Route::post('/', [CorequisiteController::class, 'store']);
        Route::delete('/{id}', [CorequisiteController::class, 'destroy']);
    });

    Route::prefix('curriculum')->group(function () {
        Route::post('/batch', [CurriculumController::class, 'storeBatch']);
        Route::post('/', [CurriculumController::class, 'store']);
        Route::get('/{id}', [CurriculumController::class, 'show']);
        Route::put('/{id}', [CurriculumController::class, 'update']);
        Route::delete('/{id}', [CurriculumController::class, 'destroy']);
    });

    Route::get('/prerequisites/subject/{subjectId}', [PrerequisiteController::class, 'getBySubject']);

    Route::post('/logout', [AuthController::class, 'logout']);
    Route::get('/user', [AuthController::class, 'user']);

    Route::get('/settings/security', [SecuritySettingsController::class, 'show']);
    Route::put('/settings/security', [SecuritySettingsController::class, 'update']);

    Route::prefix('jwt')->group(function () {
        Route::post('/logout', [JwtAuthController::class, 'logout']);
        Route::get('/me', [JwtAuthController::class, 'me']);
    });

    // User management (admin only)
    Route::prefix('users')->group(function () {
        Route::get('/', [UserController::class, 'index']);
        Route::post('/', [UserController::class, 'store']);
        Route::get('/{id}', [UserController::class, 'show']);
        Route::put('/{id}', [UserController::class, 'update']);
        Route::delete('/{id}', [UserController::class, 'destroy']);
        Route::get('/roles/list', [UserController::class, 'roles']);
    });

    // Lookup Data Management (admin only)
    Route::prefix('lookup')->group(function () {
        // One-shot payload for Lookup Data + Curriculum Management (reduces many parallel GETs)
        Route::get('/page-bundle', [LookupDataController::class, 'getLookupPageBundle']);

        // Campus
        Route::get('/campus', [LookupDataController::class, 'getCampus']);
        Route::post('/campus', [LookupDataController::class, 'createCampus']);
        Route::put('/campus/{id}', [LookupDataController::class, 'updateCampus']);
        Route::delete('/campus/{id}', [LookupDataController::class, 'deleteCampus']);
        
        // Department
        Route::get('/departments', [LookupDataController::class, 'getDepartments']);
        Route::post('/departments', [LookupDataController::class, 'createDepartment']);
        Route::put('/departments/{id}', [LookupDataController::class, 'updateDepartment']);
        Route::delete('/departments/{id}', [LookupDataController::class, 'deleteDepartment']);
        
        // Program
        Route::get('/programs', [LookupDataController::class, 'getPrograms']);
        Route::post('/programs', [LookupDataController::class, 'createProgram']);
        Route::put('/programs/{id}', [LookupDataController::class, 'updateProgram']);
        Route::delete('/programs/{id}', [LookupDataController::class, 'deleteProgram']);
        
        // Subject
        Route::get('/subjects', [LookupDataController::class, 'getSubjects']);
        Route::post('/subjects', [LookupDataController::class, 'createSubject']);
        Route::put('/subjects/{id}', [LookupDataController::class, 'updateSubject']);
        Route::delete('/subjects/{id}', [LookupDataController::class, 'deleteSubject']);

        // Roles (lookup CRUD for admin)
        Route::get('/roles', [LookupDataController::class, 'getRoles']);
        Route::post('/roles', [LookupDataController::class, 'createRole']);
        Route::put('/roles/{id}', [LookupDataController::class, 'updateRole']);
        Route::delete('/roles/{id}', [LookupDataController::class, 'deleteRole']);
        
        // Access Levels
        Route::get('/access-levels', [LookupDataController::class, 'getAccessLevels']);
        
        // Year Level
        Route::get('/year-levels', [LookupDataController::class, 'getYearLevels']);
        Route::post('/year-levels', [LookupDataController::class, 'createYearLevel']);
        Route::put('/year-levels/{id}', [LookupDataController::class, 'updateYearLevel']);
        Route::delete('/year-levels/{id}', [LookupDataController::class, 'deleteYearLevel']);
        
        // Semester
        Route::get('/semesters', [LookupDataController::class, 'getSemesters']);
        Route::post('/semesters', [LookupDataController::class, 'createSemester']);
        Route::put('/semesters/{id}', [LookupDataController::class, 'updateSemester']);
        Route::patch('/semesters/{id}/toggle-status', [LookupDataController::class, 'toggleSemesterStatus']);
        Route::delete('/semesters/{id}', [LookupDataController::class, 'deleteSemester']);
        
        // Academic Years
        Route::get('/academic-years', [LookupDataController::class, 'getAcademicYears']);
        Route::post('/academic-years', [LookupDataController::class, 'createAcademicYear']);
        Route::put('/academic-years/{id}', [LookupDataController::class, 'updateAcademicYear']);
        Route::delete('/academic-years/{id}', [LookupDataController::class, 'deleteAcademicYear']);
        
        // Sections
        Route::get('/sections', [LookupDataController::class, 'getSections']);
        Route::post('/sections', [LookupDataController::class, 'createSection']);
        Route::put('/sections/{id}', [LookupDataController::class, 'updateSection']);
        Route::delete('/sections/{id}', [LookupDataController::class, 'deleteSection']);

        // Tracks
        Route::get('/tracks', [LookupDataController::class, 'getTracks']);
        Route::post('/tracks', [LookupDataController::class, 'createTrack']);
        Route::put('/tracks/{id}', [LookupDataController::class, 'updateTrack']);
        Route::delete('/tracks/{id}', [LookupDataController::class, 'deleteTrack']);

        // Requisites (Prerequisites/Corequisites)
        Route::get('/requisites', [LookupDataController::class, 'getRequisites']);
        Route::post('/requisites', [LookupDataController::class, 'createRequisite']);
        Route::put('/requisites/{id}', [LookupDataController::class, 'updateRequisite']);
        Route::delete('/requisites/{id}', [LookupDataController::class, 'deleteRequisite']);

        // Curriculum Headers
        Route::get('/curriculum-headers', [LookupDataController::class, 'getCurriculumHeaders']);
        Route::post('/curriculum-headers', [LookupDataController::class, 'createCurriculumHeader']);
        Route::put('/curriculum-headers/{id}', [LookupDataController::class, 'updateCurriculumHeader']);
        Route::delete('/curriculum-headers/{id}', [LookupDataController::class, 'deleteCurriculumHeader']);

        // Offered Subjects
        Route::get('/offered-subjects', [LookupDataController::class, 'getOfferedSubjects']);
        Route::post('/offered-subjects', [LookupDataController::class, 'createOfferedSubject']);
        Route::put('/offered-subjects/{id}', [LookupDataController::class, 'updateOfferedSubject']);
        Route::delete('/offered-subjects/{id}', [LookupDataController::class, 'deleteOfferedSubject']);

        // Elective Subjects
        Route::get('/elective-subjects', [LookupDataController::class, 'getElectiveSubjects']);
        Route::post('/elective-subjects', [LookupDataController::class, 'createElectiveSubject']);
        Route::put('/elective-subjects/{id}', [LookupDataController::class, 'updateElectiveSubject']);
        Route::delete('/elective-subjects/{id}', [LookupDataController::class, 'deleteElectiveSubject']);
    });

    // Credit Evaluation Management (admin only)
    Route::prefix('credit-evaluations')->group(function () {
        Route::get('/', [CreditEvaluationController::class, 'index']);
        Route::post('/', [CreditEvaluationController::class, 'store']);
        Route::patch('/{id}/active', [CreditEvaluationController::class, 'setActive']);
        Route::get('/{id}', [CreditEvaluationController::class, 'show']);
        Route::put('/{id}', [CreditEvaluationController::class, 'update']);
    });

    // Schools Management (admin only) — list is public; mutations require auth + permission
    Route::prefix('schools')->group(function () {
        Route::post('/', [SchoolController::class, 'store']);
        Route::put('/{id}', [SchoolController::class, 'update']);
        Route::delete('/{id}', [SchoolController::class, 'destroy']);
    });

    // Other School Subjects Management (admin only)
    Route::prefix('other-school-subjects')->group(function () {
        Route::get('/', [OtherSchoolSubjectController::class, 'index']);
        Route::post('/', [OtherSchoolSubjectController::class, 'store']);
        Route::put('/{id}', [OtherSchoolSubjectController::class, 'update']);
        Route::delete('/{id}', [OtherSchoolSubjectController::class, 'destroy']);
    });

    // Subject Equivalence Management (admin only)
    Route::prefix('subject-equivalences')->group(function () {
        Route::get('/', [SubjectEquivalenceController::class, 'index']);
        Route::post('/', [SubjectEquivalenceController::class, 'store']);
        Route::put('/{id}', [SubjectEquivalenceController::class, 'update']);
        Route::delete('/{id}', [SubjectEquivalenceController::class, 'destroy']);
    });

    // Permissions Management (admin only)
    Route::prefix('permissions')->group(function () {
        Route::get('/', [PermissionController::class, 'index']);
        Route::get('/for-role/{roleId}', [PermissionController::class, 'forRole']);
        Route::put('/sync-role/{roleId}', [PermissionController::class, 'syncRole']);
        Route::get('/for-user/{userId}', [PermissionController::class, 'forUser']);
        Route::put('/sync-user/{userId}', [PermissionController::class, 'syncUser']);
        Route::post('/reset-user/{userId}', [PermissionController::class, 'resetUserToRole']);
        Route::post('/', [PermissionController::class, 'store']);
        Route::put('/{id}', [PermissionController::class, 'update']);
        Route::delete('/{id}', [PermissionController::class, 'destroy']);
        Route::post('/assign', [PermissionController::class, 'assignToRole']);
        Route::delete('/role/{roleId}/permission/{permissionId}', [PermissionController::class, 'removeFromRole']);
    });

    // Audit Logs (admin only)
    Route::prefix('audit-logs')->group(function () {
        Route::get('/', [AuditLogController::class, 'index']);
    });

    // Elective Slots Management (admin only)
    Route::prefix('elective-slots')->group(function () {
        Route::get('/', [ElectiveSlotController::class, 'index']);
        Route::post('/', [ElectiveSlotController::class, 'store']);
        Route::get('/{id}', [ElectiveSlotController::class, 'show']);
        Route::put('/{id}', [ElectiveSlotController::class, 'update']);
        Route::delete('/{id}', [ElectiveSlotController::class, 'destroy']);
        Route::post('/{slotId}/assign-subject', [ElectiveSlotController::class, 'assignSubject']);
        Route::delete('/{slotId}/subjects/{subjectId}', [ElectiveSlotController::class, 'removeSubject']);
    });

    // Student routes (authenticated students)
    Route::prefix('students')->group(function () {
        Route::get('/profile', [StudentController::class, 'getProfile']);
        Route::get('/profile-options', [StudentController::class, 'getProfileOptions']);
        Route::post('/profile', [StudentController::class, 'createProfile']);
        Route::put('/profile', [StudentController::class, 'updateProfile']);
        Route::get('/enrollments', [StudentController::class, 'getEnrollments']);
        Route::get('/curriculum', [StudentController::class, 'getCurriculum']);
        Route::get('/eligible-subjects', [StudentController::class, 'getEligibleSubjects']);
    });

    // Dean routes (authenticated deans)
    Route::prefix('deans')->group(function () {
        Route::get('/profile', [DeanController::class, 'getProfile']);
    });

    // Faculty routes (authenticated faculty)
    Route::prefix('faculty')->group(function () {
        Route::get('/profile', [FacultyController::class, 'getProfile']);
        Route::post('/profile', [FacultyController::class, 'createProfile']);
        Route::put('/profile', [FacultyController::class, 'updateProfile']);
        Route::get('/classes', [FacultyController::class, 'getClasses']);
        Route::get('/enrollments', [FacultyController::class, 'getEnrollments']);
        Route::put('/enrollments/{id}/grade', [FacultyController::class, 'updateGrade']);
    });

    // Student evaluation (for admin/dean/faculty)
    Route::prefix('evaluation')->group(function () {
        Route::get('/students', [StudentEvaluationController::class, 'listStudents']);
        Route::get('/student/{studentIdNumber}', [StudentEvaluationController::class, 'getByStudentIdNumber']);
        
        // Comprehensive evaluation management with role-based access control
        Route::middleware('evaluation.access')->group(function () {
            Route::post('/student/promote-next-semester', [StudentEvaluationController::class, 'promoteNextSemester']);
            Route::post('/academic-record/complete', [StudentEvaluationController::class, 'markAcademicRecordComplete']);
            Route::get('/academic-record/completions', [StudentEvaluationController::class, 'listAcademicRecordCompletions']);
            Route::delete('/academic-record/complete/{recordId}', [StudentEvaluationController::class, 'deleteAcademicRecordCompletion']);

            Route::get('/', [EvaluationController::class, 'index']);
            Route::post('/', [EvaluationController::class, 'store']);
            Route::get('/{id}', [EvaluationController::class, 'show']);
            Route::put('/{id}', [EvaluationController::class, 'update']);
            Route::delete('/{id}', [EvaluationController::class, 'destroy']);
            Route::get('/summary/{studentId}', [EvaluationController::class, 'getStudentEvaluationSummary']);
            
            // Evaluation reporting and analytics
            Route::get('/reports/department', [EvaluationReportController::class, 'getDepartmentAnalytics']);
            Route::get('/reports/student/{studentId}', [EvaluationReportController::class, 'getStudentPerformanceReport']);
            Route::get('/reports/subject/{subjectId}', [EvaluationReportController::class, 'getSubjectPerformanceReport']);
            Route::get('/reports/summary', [EvaluationReportController::class, 'getEvaluationSummary']);
            Route::get('/reports/dean-dashboard', [EvaluationReportController::class, 'deanDashboard']);
            Route::get('/reports/subject-insights', [EvaluationReportController::class, 'subjectInsights']);
            Route::get('/reports/at-risk-students', [EvaluationReportController::class, 'atRiskStudents']);
        });
    });

    // CSV Import Management (admin only)
    Route::prefix('csv-import')->group(function () {
        Route::get('/types', [\App\Http\Controllers\CsvImportController::class, 'getImportTypes']);
        Route::post('/preview', [\App\Http\Controllers\CsvImportController::class, 'preview']);
        Route::post('/import', [\App\Http\Controllers\CsvImportController::class, 'import']);
        Route::get('/template/{importType}', [\App\Http\Controllers\CsvImportController::class, 'downloadTemplate']);
    });

    // Lookup data aliases for easier access (used by faculty and other roles)
    Route::get('/departments', [LookupDataController::class, 'getDepartments']);
    Route::get('/academic-years', [LookupDataController::class, 'getAcademicYears']);
    Route::get('/semesters', [LookupDataController::class, 'getSemesters']);
    Route::get('/subjects', [LookupDataController::class, 'getSubjects']);
    Route::get('/sections', [LookupDataController::class, 'getSections']);
});

