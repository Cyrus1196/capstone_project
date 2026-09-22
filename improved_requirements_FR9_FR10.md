# Added Functional Requirements (FR-9 and FR-10)

System Title: Web-based Student Academic Evaluation System with Analytics for Cagayan de Oro College

## FR-9 — Analytics (decision-driven)

| Req ID | System Module | Requirement Name | Actor | Description | Inputs | Processing | Outputs | Preconditions | Postconditions | Priority |
|---|---|---|---|---|---|---|---|---|---|---|
| FR-09 | Analytics and Reports | Generate Decision-Driven Academic Analytics | Dean / Program Head / Evaluator / Adviser | The system shall generate decision-driven academic analytics based on student grades, curriculum progress, evaluation results, and program filters so authorized users can identify who needs intervention and what action to take next. | Student profiles, grades, curriculum data, academic status, program, year level, semester filters, and evaluation completion data | The system summarizes regular and irregular students, at-risk students, high-fail subjects, pass and fail rates, lacking units, evaluation backlog, and entry-type distribution. Each metric includes a recommended next action such as opening filtered student evaluation or review lists. | Analytics dashboard, summary counts, charts, at-risk lists, and decision-oriented reports | Student records, grades, and curriculum data must already exist in the system. The user must be logged in and authorized to view analytics. | Authorized users can use analytics to support advising, evaluation prioritization, curriculum review, and academic monitoring. | High |

## FR-10 — Academic Data Import (recommended)

FR-01 only covers **student account** import. FR-10 covers **grade / academic record** import from SIS CSV files (preview, Fix row, create/update students and grades).

| Req ID | System Module | Requirement Name | Actor | Description | Inputs | Processing | Outputs | Preconditions | Postconditions | Priority |
|---|---|---|---|---|---|---|---|---|---|---|
| FR-10 | Academic Data Import Management | Import and Update Academic Records | Admin / Dean / Authorized Staff | The system shall allow authorized users to import academic data from CSV files to create or update student profiles and record or update student grades, including preview validation and row-level correction before import. | CSV file containing academic record data such as Session, Course, Student ID, Name, Year Level, Subject Code, Subject Name, Units, Grade, and Remarks | The system validates CSV headers and row values, previews valid and invalid rows, allows Fix row correction for mismatched subject codes, term, program, year level, or missing values, then creates missing student profiles and records or updates grade entries. | Imported student profiles, updated student records, recorded grade entries, and import summary results | The user must be logged in and authorized. Program, curriculum, subject, academic year, and semester records must exist or be resolvable by the system. | Imported academic records become available for student evaluation, analytics, and curriculum tracking. | High |
