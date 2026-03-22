<?php

use Illuminate\Http\Request;
use Illuminate\Support\Facades\Route;
use App\Http\Controllers\AuthController;
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

// Public routes
Route::post('/login', [AuthController::class, 'login']);

// Requisite Management (temporarily public for testing)
Route::prefix('requisites')->group(function () {
    Route::get('/', [RequisiteController::class, 'index']);
    // For local/development use we allow these routes to reach the controller
    // which contains an environment-aware admin check. In production the
    // controller will still enforce authorization.
    Route::post('/', [RequisiteController::class, 'store']);
    Route::get('/{id}', [RequisiteController::class, 'show']);
    Route::put('/{id}', [RequisiteController::class, 'update']);
    Route::delete('/{id}', [RequisiteController::class, 'destroy']);
    Route::get('/subject/{subjectId}', [RequisiteController::class, 'getBySubject']);
});

// Prerequisite Management (allow local/dev access)
Route::prefix('prerequisites')->group(function () {
    Route::get('/', [PrerequisiteController::class, 'index']);
    Route::post('/', [PrerequisiteController::class, 'store']);
    Route::get('/subject/{subjectId}', [PrerequisiteController::class, 'getBySubject']);
    Route::delete('/{id}', [PrerequisiteController::class, 'destroy']);
});

// Corequisite Management (allow local/dev access)
Route::prefix('corequisites')->group(function () {
    Route::get('/', [CorequisiteController::class, 'index']);
    Route::post('/', [CorequisiteController::class, 'store']);
    Route::delete('/{id}', [CorequisiteController::class, 'destroy']);
});

// Curriculum management (admin only) - temporarily public for testing
Route::prefix('curriculum')->group(function () {
    Route::get('/lookup/data', [CurriculumController::class, 'lookupData']);
    Route::get('/', [CurriculumController::class, 'index']);
    Route::post('/batch', [CurriculumController::class, 'storeBatch']);
    Route::post('/', [CurriculumController::class, 'store']);
    Route::get('/{id}', [CurriculumController::class, 'show']);
    Route::put('/{id}', [CurriculumController::class, 'update']);
    Route::delete('/{id}', [CurriculumController::class, 'destroy']);
});

// Protected routes
Route::middleware('auth')->group(function () {
    Route::post('/logout', [AuthController::class, 'logout']);
    Route::get('/user', [AuthController::class, 'user']);

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
        Route::get('/{id}', [CreditEvaluationController::class, 'show']);
        Route::put('/{id}', [CreditEvaluationController::class, 'update']);
        Route::delete('/{id}', [CreditEvaluationController::class, 'destroy']);
    });

    // Schools Management (admin only)
    Route::prefix('schools')->group(function () {
        Route::get('/', [SchoolController::class, 'index']);
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
        });
    });

    // Lookup data aliases for easier access (used by faculty and other roles)
    Route::get('/departments', [LookupDataController::class, 'getDepartments']);
    Route::get('/academic-years', [LookupDataController::class, 'getAcademicYears']);
    Route::get('/semesters', [LookupDataController::class, 'getSemesters']);
    Route::get('/subjects', [LookupDataController::class, 'getSubjects']);
    Route::get('/sections', [LookupDataController::class, 'getSections']);
});

