# Functional Requirements FR-09 and FR-10

**System Title:** Web-based Student Academic Evaluation System with Analytics for Cagayan de Oro College

**Members:** Charity Daayata, Cyrus Tadoy, Edwin Padla, Cherry Pionan, Angelica Engelbrecht, Kaye Delgado

This document contains the **full** functional requirement entries for **FR-09** and **FR-10**, using the same fields as FR-01 to FR-08 in the capstone paper.

---

## FR-09 — Generate Decision-Driven Academic Analytics

| Field | Content |
|-------|---------|
| **Req ID** | FR-09 |
| **System Module** | Analytics and Reports |
| **Requirement Name** | Generate Decision-Driven Academic Analytics |
| **Actor** | Dean / Program Head / Evaluator / Adviser |
| **Description** | The system shall generate decision-driven academic analytics based on student grades, curriculum progress, evaluation results, and program filters so authorized users can identify who needs intervention and what action to take next. Analytics must support academic monitoring and decision-making, not display-only statistics. |
| **Inputs** | Student profiles; enrolled and completed grades; active curriculum data; academic status (Regular / Irregular); program, year level, and semester filters; evaluation completion status; student entry type (Regular, Shiftee, Returnee, Transferee) where available |
| **Processing** | The system aggregates evaluation and grade data, computes summary indicators (regular vs irregular counts, at-risk students, subjects with high failure rates, pass/fail distribution, lacking units, evaluation backlog, entry-type mix), and associates each indicator with a recommended next action (e.g. open filtered student evaluation list, review high-fail subject, prioritize pending evaluations). Dean users see college-wide or multi-program analytics; Program Head, Evaluator, and Adviser users see a program-scoped inherited subset. |
| **Outputs** | Analytics dashboard; summary counts; charts and visual reports; at-risk student lists; decision-oriented report sections with suggested next actions |
| **Preconditions** | Student records, grades, and curriculum data must already exist in the system. The user must be logged in. The user must be authorized to view analytics for the selected scope (college, program, or assigned role). |
| **Postconditions** | Authorized users can use analytics to support student advising, evaluation prioritization, curriculum review, and academic monitoring. Decisions can be acted on by navigating to related modules (e.g. Student Evaluation, reports). |
| **Priority** | High |

### FR-09 — Supported analytics (decision-driven)

| Insight | Decision / next action |
|---------|------------------------|
| Regular vs Irregular students | Identify who needs advising or load review |
| At-risk students (multiple fails) | Prioritize intervention or counseling |
| High-fail subjects | Review tutoring, prerequisites, or curriculum |
| Pass vs fail rates | Monitor program or year-level performance |
| Evaluation backlog (pending vs evaluated) | Finish evaluations before deliberation |
| Lacking units / behind curriculum | Flag graduation or promotion risk |
| Shiftee / Returnee / Transferee mix | Plan credit evaluation workload |

### FR-09 — Role access

| Role | Access |
|------|--------|
| **Dean** | Full analytics (college / multi-program scope) |
| **Program Head** | Same metrics, scoped to assigned program |
| **Evaluator / Adviser** | Operational subset: at-risk, pending evaluations, failing subjects in scope |
| **Admin** | Optional system-wide view for oversight (if permitted) |

---

## FR-10 — Import and Update Academic Records

| Field | Content |
|-------|---------|
| **Req ID** | FR-10 |
| **System Module** | Academic Data Import Management |
| **Requirement Name** | Import and Update Academic Records |
| **Actor** | Admin / Dean / Authorized Staff |
| **Description** | The system shall allow authorized users to import academic data from CSV files to create or update student profiles and record or update student grades. The system shall validate data before import, show a full-file preview, and allow row-level correction when import values do not match system records. This requirement extends FR-01 (student account import only) to cover grade and academic record import from SIS or deliberation exports. |
| **Inputs** | CSV file containing academic record data, including but not limited to: Session, Course, Student ID, Name, Year Level, Subject Code, Subject Name, Units, Grade, and Remarks |
| **Processing** | The system validates CSV headers and every row; classifies rows as ready or cannot import; displays preview with filters (All / Cannot import / Ready); allows **Fix row** on problem rows to correct subject code, term (academic year and semester), program, year level, or student name mappings; applies bulk fixes for rows with the same import values; on import, creates missing student profiles, updates existing student information, and records or updates grade entries (upsert) for matching students, subjects, and terms |
| **Outputs** | Imported student profiles; updated student records; recorded or updated grade entries; import summary (total rows, imported count, failed count); preview of valid and invalid rows before commit |
| **Preconditions** | The user must be logged in and authorized to import data. Program, curriculum, subject, academic year, and semester records must exist in the system or be resolvable from import values (e.g. SESSION mapped to academic year and semester). |
| **Postconditions** | Imported academic records become available for student evaluation (FR-03), analytics (FR-09), and curriculum tracking. Invalid rows remain unimported until corrected via Fix row or source file update. |
| **Priority** | High |

### FR-10 — Import types supported

| Import type | Purpose |
|-------------|---------|
| **SIS Grade Deliberation** | Import grades and student metadata from SIS export (SESSION, CODE, GRADE, REMARKS, etc.) |
| **Grades** | Import evaluation/grade rows for existing students |
| **Students / SIS mixed** | Import student accounts and grade rows in one file |
| **Users** | Import staff user accounts (separate from FR-01 student focus) |

### FR-10 — Fix row (correctable fields)

When preview detects a mismatch, the user can open **Fix row** and correct:

| Field | Example issue | Fix action |
|-------|---------------|------------|
| **Subject code (CODE)** | SIS `ITE 308` vs system `ITE 360` | Map to correct system subject code |
| **Session (term)** | SESSION not matched to DB | Select academic year and semester |
| **Program (COURSE)** | Program not recognized | Select system program |
| **Year level** | YEAR LEVEL / SEMESTER not matched | Select system year level |
| **Student name (NAME)** | Missing name for new student | Enter student name |

Bulk fix: apply the same correction to all rows with matching import values (e.g. all rows with subject code `ITE 308`).

### FR-10 — Relationship to FR-01

| Requirement | Scope |
|-------------|--------|
| **FR-01** | Import **student accounts** only (Student ID, Name, Program, Year Level) |
| **FR-10** | Import **academic records and grades** from CSV, with preview, validation, Fix row, and upsert |

---

## Summary table (for paper appendix)

| Req ID | System Module | Requirement Name | Actor | Priority |
|--------|---------------|------------------|-------|----------|
| FR-09 | Analytics and Reports | Generate Decision-Driven Academic Analytics | Dean / Program Head / Evaluator / Adviser | High |
| FR-10 | Academic Data Import Management | Import and Update Academic Records | Admin / Dean / Authorized Staff | High |

---

## Related files

| File | Description |
|------|-------------|
| [`Functional_and_Non-functional_Requirements.md`](Functional_and_Non-functional_Requirements.md) | Full FR-01 to FR-10 and NFR list |
| [`Functional_and_non_functional.docx`](Functional_and_non_functional.docx) | Word copy of full requirements paper |
