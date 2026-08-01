# Suggested Improvements for Functional Requirements

System Title: Web-based Student Academic Evaluation System with Analytics for Cagayan de Oro College

## Recommended FR9-FR11

| Req ID | System Module | Requirement Name | Actor | Description | Inputs | Processing | Outputs | Preconditions | Postconditions | Priority |
|---|---|---|---|---|---|---|---|---|---|---|
| FR-09 | Academic Data Import Management | Import and Update Academic Records | Admin / Dean / Authorized Staff | The system shall allow authorized users to import academic data from CSV files to create or update student profiles and record student grades. | CSV file containing academic record data such as Session, Course, Student ID, Name, Year Level, Subject Code, Subject Name, Units, Grade, and Remarks | The system validates the CSV headers and row values, checks if the student already exists, creates missing student accounts/profiles when needed, updates existing student information, and records or updates the grades for matching subjects. | Imported student profiles, updated student records, and recorded grade entries | The user must be logged in and authorized. Program, curriculum, subject, academic year, and semester records must exist or be resolvable by the system. | Student profiles and grade records are available for academic evaluation and curriculum tracking. | High |
| FR-10 | Analytics and Reports | Generate Academic Evaluation Analytics | Dean / Program Head / Admin | The system shall generate academic analytics based on student grades, curriculum progress, and evaluation results to help monitor student academic performance. | Student profiles, grades, curriculum data, academic status, program, year level, and semester filters | The system summarizes evaluation data such as regular and irregular students, passed and failed subjects, earned units, lacking units, and student performance by program or year level. | Analytics dashboard, summary counts, charts, and evaluation reports | Student records, grades, and curriculum data must already exist in the system. The user must have permission to view analytics. | Authorized users can view academic performance summaries for decision-making and monitoring. | High |
| FR-11 | Audit Trail and Activity Monitoring | Track User Login and System Activities | Admin / Dean with Permission | The system shall record important user activities such as login, logout, account changes, grade imports, evaluation updates, curriculum changes, and permission changes. | User account, activity type, date and time, IP address, affected record, and action performed | The system automatically saves activity logs whenever users perform important system actions. Logs can be filtered by user, date, module, or activity type. | Audit trail records and user activity logs | The user must be authenticated. Audit logging must be enabled in the system. | Administrators can review system activity for accountability, monitoring, and troubleshooting. | High |

## Suggested Cleanup for Existing Functional Requirements

1. Use consistent actor names throughout the paper. Prefer `Admin`, `Dean`, `Program Head`, `Evaluator/Adviser`, `Secretary`, `Student`, and `Guest`.
2. Fix FR-05 because the phrase “their available consultation schedules” does not match curriculum management. Replace it with curriculum-related wording.
3. Improve FR-01 so it does not only mention student account creation. Keep FR-01 for account import and use FR-09 for importing/updating academic records from CSV files.
4. In FR-03, clarify that the system evaluates academic status based on curriculum, grades, prerequisites, completed subjects, and credited subjects.
5. In FR-08, clarify that guest simulation does not affect actual student records.

## Improved FR-03 Wording

The system shall allow the Dean or Evaluator/Adviser to evaluate a student's academic record using uploaded grades, curriculum data, prerequisite rules, and credited subjects to determine the student's academic status and curriculum progress.

## Improved FR-05 Wording

The system shall allow the administrator or dean to organize the curriculum by defining year levels, semesters, subject codes, subject titles, units, and subject placement within the curriculum structure.

## Suggested Additional Non-Functional Requirement Improvements

| Req ID | Category | Requirement | Description | Measurement Criteria |
|---|---|---|---|---|
| NFR-11 | Data Integrity | Import Validation | The system must validate imported CSV data before saving records to avoid duplicate, incomplete, or incorrect academic data. | Invalid rows are shown in preview and are not imported until corrected. |
| NFR-12 | Accountability | Audit Logging | The system must maintain logs of critical actions for monitoring and accountability. | Login, logout, import, update, delete, and permission changes are recorded with timestamp and user. |
| NFR-13 | Usability | Responsive Interface | The system must be usable on desktop and mobile screen sizes. | Core pages remain readable and usable on common desktop, tablet, and phone widths. |
