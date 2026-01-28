# Student Evaluation Module

This module provides comprehensive student evaluation management capabilities for deans and faculty members in the Academic Curriculum Management System (ACMS).

## Features

### Core Functionality
- **Student Evaluation Management**: Create, read, update, and delete student evaluations
- **Multi-criteria Evaluation**: Support for various evaluation criteria (quizzes, exams, projects, etc.)
- **Grade Management**: Track grades, GPA equivalents, and evaluation status
- **Evaluation Periods**: Manage different evaluation periods (prelim, midterm, final)
- **Faculty Remarks**: Add detailed feedback for student performance

### Reporting & Analytics
- **Department Analytics**: Overview of evaluation performance across programs
- **Student Performance Reports**: Detailed individual student performance analysis
- **Subject Performance Reports**: Performance analysis by subject
- **Evaluation Summary**: Overall system evaluation statistics
- **Grade Distribution**: Visual breakdown of grade distributions
- **Pass/Fail Rates**: Track success rates across different dimensions

### Role-Based Access Control
- **Admin**: Full access to all evaluation features
- **Dean**: Can manage evaluations within their assigned programs, access reports
- **Faculty**: Can manage evaluations for their assigned subjects, limited reporting access
- **Student**: Read-only access to their own evaluations (future enhancement)

## Database Schema

### Core Tables

#### `tbl_evaluation` (Enhanced)
- `evaluation_id` (Primary Key)
- `student_id` (Foreign Key)
- `subject_id` (Foreign Key)
- `academic_year_id` (Foreign Key)
- `semester_id` (Foreign Key)
- `grade` (Traditional grade format)
- `final_grade` (Numeric grade 0-100)
- `gpa_equivalent` (GPA 0-5 scale)
- `evaluation_status` (passed/failed/ongoing/dropped/incomplete)
- `faculty_remarks` (Text feedback)
- `evaluated_by` (Foreign Key to faculty)
- `evaluation_date` (Date of evaluation)
- `evaluation_type` (prelim/midterm/final/comprehensive)
- `enrolled_date` (Original enrollment date)
- `section_id` (Foreign Key)

#### `tbl_evaluation_criteria`
- `criteria_id` (Primary Key)
- `criteria_name` (Name of criteria)
- `description` (Detailed description)
- `max_score` (Maximum possible score)
- `criteria_type` (academic/behavioral/attendance/participation)
- `is_active` (Boolean flag)

#### `tbl_student_evaluation_scores`
- `score_id` (Primary Key)
- `student_id` (Foreign Key)
- `subject_id` (Foreign Key)
- `criteria_id` (Foreign Key)
- `faculty_id` (Foreign Key)
- `academic_year_id` (Foreign Key)
- `semester_id` (Foreign Key)
- `score` (Achieved score)
- `remarks` (Criteria-specific feedback)
- `evaluation_date` (Date of scoring)

#### `tbl_evaluation_periods`
- `period_id` (Primary Key)
- `period_name` (Name of evaluation period)
- `description` (Period description)
- `academic_year_id` (Foreign Key)
- `semester_id` (Foreign Key)
- `start_date` (Period start)
- `end_date` (Period end)
- `status` (upcoming/active/closed)
- `is_active` (Boolean flag)

## API Endpoints

### Evaluation Management
- `GET /api/evaluation` - List evaluations with filters
- `POST /api/evaluation` - Create new evaluation
- `GET /api/evaluation/{id}` - Get specific evaluation details
- `PUT /api/evaluation/{id}` - Update evaluation
- `DELETE /api/evaluation/{id}` - Delete evaluation (Admin/Dean only)

### Supporting Data
- `GET /api/evaluation/criteria` - Get evaluation criteria
- `GET /api/evaluation/periods` - Get evaluation periods
- `GET /api/evaluation/students` - Get students list for evaluation
- `GET /api/evaluation/summary/{studentId}` - Get student evaluation summary

### Reports & Analytics
- `GET /api/evaluation/reports/department` - Department analytics
- `GET /api/evaluation/reports/student/{studentId}` - Student performance report
- `GET /api/evaluation/reports/subject/{subjectId}` - Subject performance report
- `GET /api/evaluation/reports/summary` - Overall evaluation summary

## Frontend Components

### Dean Interface
- `EvaluationManagement.js` - Main evaluation management interface
- `EvaluationReports.js` - Reports and analytics dashboard

### Faculty Interface
- `EvaluationManagement.js` - Faculty-specific evaluation management

### Shared Components
- `EvaluationManagement.css` - Styling for evaluation interfaces
- `EvaluationReports.css` - Styling for reports interface

## Installation & Setup

### 1. Database Migrations
Run the following migrations to create the necessary tables:

```bash
php artisan migrate
```

Migrations included:
- `2026_01_15_100000_create_evaluation_criteria_table.php`
- `2026_01_15_100001_create_student_evaluation_scores_table.php`
- `2026_01_15_100002_create_evaluation_periods_table.php`
- `2026_01_15_100003_alter_tbl_evaluation_table.php`

### 2. Seed Data (Optional)
Run seeders to populate evaluation criteria and periods:

```bash
php artisan db:seed --class=EvaluationCriteriaSeeder
php artisan db:seed --class=EvaluationPeriodSeeder
```

### 3. Middleware Registration
The evaluation access middleware is automatically registered in `bootstrap/app.php`.

### 4. Frontend Integration
Add the evaluation components to your React application routing:

```javascript
// Dean routes
<Route path="/dean/evaluations" component={EvaluationManagement} />
<Route path="/dean/evaluation-reports" component={EvaluationReports} />

// Faculty routes
<Route path="/faculty/evaluations" component={EvaluationManagement} />
```

## Usage Examples

### Creating an Evaluation
```javascript
const evaluationData = {
    student_id: 123,
    subject_id: 456,
    academic_year_id: 1,
    semester_id: 1,
    final_grade: 85.5,
    gpa_equivalent: 3.5,
    evaluation_status: 'passed',
    faculty_remarks: 'Excellent performance throughout the semester',
    evaluation_type: 'final',
    evaluation_scores: [
        {
            criteria_id: 1,
            score: 90,
            remarks: 'Strong understanding of concepts'
        }
    ]
};

fetch('/api/evaluation', {
    method: 'POST',
    headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
    },
    body: JSON.stringify(evaluationData)
});
```

### Getting Department Analytics
```javascript
const response = await fetch('/api/evaluation/reports/department?academic_year_id=1&semester_id=1');
const analytics = await response.json();
```

## Security Features

### Role-Based Access Control
- **EvaluationAccessMiddleware**: Ensures only authorized roles can access evaluation endpoints
- **Operation Restrictions**: Delete operations limited to Admin and Dean roles
- **Data Validation**: Comprehensive input validation and sanitization

### Authentication
- All evaluation endpoints require valid authentication
- Token-based authorization for API access
- Session management for web interface

## Performance Considerations

### Database Optimization
- Proper indexing on foreign key relationships
- Efficient queries with proper joins and aggregations
- Pagination for large datasets

### Caching Strategy
- Consider caching frequently accessed data (evaluation criteria, periods)
- Implement caching for complex analytics queries
- Use Laravel's built-in caching mechanisms

## Future Enhancements

### Planned Features
1. **Student Portal**: Self-service access to personal evaluations
2. **Automated Grade Calculation**: GPA and grade point calculations
3. **Bulk Evaluation Operations**: Import/export evaluation data
4. **Advanced Analytics**: Predictive analytics and trend analysis
5. **Notification System**: Automated alerts for evaluation deadlines
6. **Mobile App**: Native mobile application for evaluation management

### Integration Opportunities
- **Learning Management Systems (LMS)**: Sync with external LMS platforms
- **Student Information Systems (SIS)**: Integration with existing SIS
- **Email Notifications**: Automated email reports and reminders
- **Calendar Integration**: Sync evaluation periods with academic calendars

## Troubleshooting

### Common Issues
1. **Permission Denied**: Ensure user has appropriate role (Admin/Dean/Faculty)
2. **Missing Data**: Verify database migrations have been run
3. **API Errors**: Check authentication tokens and network connectivity
4. **Report Generation**: Ensure sufficient data exists for selected filters

### Debug Mode
Enable debug mode in Laravel environment for detailed error messages:

```bash
APP_DEBUG=true
```

## Support

For technical support and questions about the evaluation module:
1. Check the Laravel logs: `storage/logs/laravel.log`
2. Review database query logs for performance issues
3. Consult the API documentation for endpoint details
4. Verify frontend console errors for JavaScript issues

---

**Version**: 1.0.0  
**Last Updated**: January 15, 2026  
**Compatibility**: Laravel 10+, React 18+, PHP 8.2+
