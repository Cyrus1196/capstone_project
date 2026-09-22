# Functional and Non-Functional Requirements

**System Title:** Web-based Student Academic Evaluation System with Analytics for Cagayan de Oro College

**Members:** Charity Daayata, Cyrus Tadoy, Edwin Padla, Cherry Pionan, Angelica Engelbrecht, Kaye Delgado

---

## A. Functional Requirements

Functional requirements describe what the system should do.

**FR-01 to FR-10** are in the table below. Scroll to the **last two rows** for FR-09 and FR-10. For expanded detail (analytics metrics, Fix row, role access), see **[`FR-09_FR-10_Functional_Requirements.md`](FR-09_FR-10_Functional_Requirements.md)**.

| Req ID | System Module | Requirement Name | Actor | Description | Inputs | Processing | Outputs | Preconditions | Postconditions | Priority |
|---|---|---|---|---|---|---|---|---|---|---|
| FR-01 | User Management | Import Student Accounts | Admin | The system shall allow the administrator to upload a CSV file containing student records to automatically create student accounts. | CSV file (Student ID, Name, Program, Year Level) | The system validates the CSV file and creates student accounts with the Student ID as username and a default password. | Student accounts successfully created | Admin must be logged in | Students can log in using their ID number and default password | High |
| FR-02 | User Login | User Login | Student / Adviser / Dean / Admin | The system shall allow registered users to log in using their assigned username and password. | Username, Password | The system authenticates user credentials and verifies user roles. | Access to system dashboard | The user account must already exist | User session created | High |
| FR-03 | Student Evaluation | Evaluate Student Academic Status | Dean / Adviser | The system shall allow the Dean or Evaluator/Adviser to evaluate a student's academic record using uploaded grades, curriculum data, prerequisite rules, and credited subjects to determine the student's academic status and curriculum progress. | Student record, student grades from CSV file, active curriculum data | The system analyzes the student's grades and checks the curriculum structure to determine whether the student is regular or irregular. | Student academic status (Regular or Irregular) | Student records and grades must already be imported into the system. Curriculum data must be available in the curriculum management module. The Dean or adviser must be logged in. | The student's academic status is determined and ready for subject recommendation for the next semester. | High |
| FR-04 | Curriculum Management | Create Curriculum | Admin / Dean | The system shall allow the administrator or dean to create a new academic curriculum to be used as the basis for student evaluation and subject recommendations. | Curriculum name, academic program, academic year | The system stores the curriculum information in the database and prepares it for subject organization. | New curriculum record successfully created | Admin or dean must be logged in | The created curriculum becomes available for adding year levels, semesters, and subjects. | High |
| FR-05 | Curriculum Management | Organize Curriculum Structure | Admin / Dean | The system shall allow the administrator or dean to organize the curriculum by defining year levels, semesters, subject codes, subject titles, units, and subject placement within the curriculum structure. | Year level, semester, subject information (subject code, subject name, units) | The system stores the curriculum structure and associates subjects with their corresponding year level and semester. | Structured curriculum with subjects assigned to specific year levels and semesters | A curriculum record must already exist in the system. Admin or dean must be logged in. | Subjects become available for prerequisite configuration and academic evaluation. | High |
| FR-06 | Curriculum Management | Configure Subject Prerequisites | Admin / Dean | The system shall allow the administrator or dean to define prerequisite relationships between subjects within the curriculum. | Selected subject, prerequisite subject(s) | The system associates the selected subject with one or more prerequisite subjects from the curriculum. | Prerequisite relationships between subjects are successfully stored | A curriculum must already exist. Subjects must already be added to the curriculum. | The prerequisite relationships become available for use during student academic evaluation and subject recommendation. | High |
| FR-07 | Curriculum Management | Manage External Curriculum for Subject Crediting | Admin / Dean | The system shall allow the administrator or dean to encode and store curricula from other educational institutions to support subject matching and credit evaluation for transferee students. | External institution name, external curriculum subjects, subject details (subject name, units) | The system stores the external curriculum and associates its subjects for future comparison and subject crediting. | External curriculum records successfully stored in the system | Admin or dean must be logged in | The external curriculum becomes available for subject matching and credit evaluation during transferee assessment. | High |
| FR-08 | Guest Simulation | Simulate Curriculum Evaluation | Guest | The system shall allow a guest user to simulate a student evaluation by viewing the active curriculum of a selected college department and indicating whether the subjects listed in their transcript of records are passed or failed. | Selected college department, subject status selection (Passed or Failed) | The system displays the active curriculum for the selected department and allows the guest to assign a passed or failed status to each subject based on their transcript of records. | Simulated subject evaluation based on the guest's input and printable result (PDF file) | An active curriculum must exist for the selected college department. | The system records the guest's subject status selections for simulation purposes without affecting actual student records. | Medium |
| FR-09 | Analytics and Reports | Generate Decision-Driven Academic Analytics | Dean / Program Head / Evaluator / Adviser | The system shall generate decision-driven academic analytics based on student grades, curriculum progress, evaluation results, and program filters so authorized users can identify who needs intervention and what action to take next. | Student profiles, grades, curriculum data, academic status, program, year level, semester filters, and evaluation completion data | The system summarizes regular and irregular students, at-risk students, high-fail subjects, pass and fail rates, lacking units, evaluation backlog, and entry-type distribution. Each metric includes a recommended next action such as opening filtered student evaluation or review lists. | Analytics dashboard, summary counts, charts, at-risk lists, and decision-oriented reports | Student records, grades, and curriculum data must already exist in the system. The user must be logged in and authorized to view analytics. | Authorized users can use analytics to support advising, evaluation prioritization, curriculum review, and academic monitoring. | High |
| FR-10 | Academic Data Import Management | Import and Update Academic Records | Admin / Dean / Authorized Staff | The system shall allow authorized users to import academic data from CSV files to create or update student profiles and record or update student grades, including preview validation and row-level correction before import. | CSV file containing academic record data such as Session, Course, Student ID, Name, Year Level, Subject Code, Subject Name, Units, Grade, and Remarks | The system validates CSV headers and row values, previews valid and invalid rows, allows Fix row correction for mismatched subject codes, term, program, year level, or missing values, then creates missing student profiles and records or updates grade entries. | Imported student profiles, updated student records, recorded grade entries, and import summary results | The user must be logged in and authorized. Program, curriculum, subject, academic year, and semester records must exist or be resolvable by the system. | Imported academic records become available for student evaluation, analytics, and curriculum tracking. | High |

> **Even more detail:** [`FR-09_FR-10_Functional_Requirements.md`](FR-09_FR-10_Functional_Requirements.md)

---

## B. Non-Functional Requirements

Non-functional requirements describe how the system performs.

| Req ID | Category | Requirement | Description | Measurement Criteria |
|---|---|---|---|---|
| NFR-01 | Performance | Response Time | The system should respond to user requests within an acceptable time frame. | Maximum response time: 3 seconds |
| NFR-02 | Security | Data Encryption | User passwords and sensitive data must be encrypted in the database. | AES or bcrypt encryption implemented |
| NFR-03 | Availability | System Accessibility | The system must be accessible during operational hours without downtime. | Minimum 95% uptime |
| NFR-04 | Usability | User Interface Simplicity | The system interface must be simple and easy to navigate for users. | Users can complete tasks within 3 clicks |
| NFR-05 | Reliability | Error Handling | The system must detect and handle system errors gracefully. | System logs errors and displays proper messages |
| NFR-06 | Compatibility | Browser Support | The system must function properly on modern browsers. | Chrome, Firefox, Edge compatibility |
| NFR-07 | Maintainability | System Maintenance | The system must allow administrators to easily update or modify modules. | Modular code structure |
| NFR-08 | Scalability | System Expansion | The system must support increased numbers of users without significant performance degradation. | Supports up to 500 concurrent users |
| NFR-09 | Backup and Recovery | Data Backup | The system must automatically back up system data to prevent loss. | Daily automated backup |
| NFR-10 | Portability | System Deployment | The system should be deployable on multiple server environments. | Works on Windows or Linux servers |
| NFR-11 | Data Integrity | Import Validation | The system must validate imported CSV data before saving records to avoid duplicate, incomplete, or incorrect academic data. | Invalid rows are shown in preview and are not imported until corrected |
| NFR-12 | Accountability | Audit Logging | The system must maintain logs of critical actions for monitoring and accountability. | Login, logout, import, update, delete, and permission changes are recorded with timestamp and user |
| NFR-13 | Usability | Responsive Interface | The system must be usable on desktop and mobile screen sizes. | Core pages remain readable and usable on common desktop, tablet, and phone widths |

---

## Related files

| File | Description |
|------|-------------|
| [`FR-09_FR-10_Functional_Requirements.md`](FR-09_FR-10_Functional_Requirements.md) | **Full FR-09 and FR-10** (all fields expanded) |
| `Functional_and_non_functional.docx` | Word copy (same table format as capstone paper) |
| `../Appendix_O_Functional_and_Non-functional_Requirements.md` | Same content at project root (Appendix O) |
