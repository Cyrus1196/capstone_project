# How `tbl_enrollments` Table is Used

## Overview
The `tbl_enrollments` table is the **core table** for tracking student academic progress. It records when students enroll in subjects, their grades, and enrollment status.

## Table Structure
- `enrollment_id` (PK) - Unique identifier for each enrollment record
- `student_id` (FK) - Links to `tbl_student_profile`
- `subject_id` (FK) - Links to `tbl_subjects`
- `academic_year_id` (FK) - Links to `tbl_academic_year` (e.g., "2024-2025")
- `semester_id` (FK) - Links to `tbl_semester` (e.g., "1st Semester", "2nd Semester")
- `grade` (VARCHAR) - The grade received (e.g., "85", "A", "Pass")
- `status` (VARCHAR) - Enrollment status (e.g., "Enrolled", "Completed", "Dropped", "Failed", "Passed")
- `enrolled_date` (DATE) - When the student enrolled
- `section_id` (FK) - Links to `tbl_section` (class section/group)

## When It's Used

### 1. **Student Enrollment Process**
- When a student enrolls in a subject for a specific academic year and semester
- Records are created in `tbl_enrollments` with status "Enrolled"
- Links the student to a specific subject, academic period, and section

### 2. **Grade Management (Faculty)**
- Faculty members input/update grades in the `grade` column
- They update the `status` field (e.g., "Completed", "Failed", "Passed")
- Used in the **Faculty Grades** module for grade entry

### 3. **Student Evaluation (Dean/Faculty)**
- Used to calculate **units earned** for each subject
- If status is "Passed"/"Pass"/"Completed" OR grade meets passing requirement → units are earned
- Used to compute total units earned vs. total curriculum units
- Shows which subjects the student has completed vs. still lacking

### 4. **Student View (My Enrollments)**
- Students can view their enrollment history
- Shows all subjects they've enrolled in, grades received, and status
- Filterable by academic year, semester, and status

### 5. **Academic Progress Tracking**
- Tracks student progress through their curriculum
- Identifies which subjects have been completed
- Helps determine if prerequisites are met for future enrollments
- Used for academic standing calculations

## Example Use Cases

### Example 1: Student Enrolls in a Subject
```
INSERT INTO tbl_enrollments (student_id, subject_id, academic_year_id, semester_id, status, enrolled_date, section_id)
VALUES (1, 5, 1, 1, 'Enrolled', '2024-08-15', 1);
```

### Example 2: Faculty Enters Grade
```
UPDATE tbl_enrollments 
SET grade = '85', status = 'Completed'
WHERE enrollment_id = 123;
```

### Example 3: Calculate Units Earned
- System checks `tbl_enrollments` for each subject in curriculum
- If status = "Passed" or grade >= passing_grade → units_earned = subject.units
- Sum all units_earned to get total progress

## Key Relationships
- **Student → Enrollments**: One student can have many enrollments
- **Subject → Enrollments**: One subject can have many enrollments (different students)
- **Academic Year/Semester → Enrollments**: Tracks when enrollments occurred
- **Section → Enrollments**: Groups students into class sections

## Status Values (Common)
- `Enrolled` - Currently enrolled, no grade yet
- `Completed` - Finished the subject with a passing grade
- `Passed` - Successfully completed
- `Failed` - Did not meet passing requirements
- `Dropped` - Student dropped the subject
- `Incomplete` - Did not complete requirements

## Integration Points
1. **Curriculum Table**: Defines which subjects are required for a program
2. **Student Evaluation**: Uses enrollments to show progress against curriculum
3. **Faculty Grades**: Allows faculty to update grades and status
4. **Student Portal**: Shows enrollment history to students
5. **Prerequisites**: System checks enrollments to verify prerequisites are met

