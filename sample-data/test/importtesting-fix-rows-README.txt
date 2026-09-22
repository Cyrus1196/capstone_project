importtesting-fix-rows.csv — Fix row demo file
================================================

Upload in Dean Portal → Student Management → Import CSV → Preview.

Each row is designed to trigger a different Fix row field (except row 1).

Row  Fix row field(s) to test          What is wrong in the CSV
---  --------------------------          -------------------------
 1   (none — should be Ready)            Valid row; ITE 260 + existing student
 2   Subject code                        CODE is ITE 321 (use Fix row → pick ITE 260)
 3   Academic year & semester (SESSION)  SESSION is SY 99-99 SEM IX (not in Lookup)
 4   Program (COURSE)                    COURSE text does not match any program
 5   Year level                          YEAR 9 / Y9S9 — no such year level in system
 6   Student name (NAME)                 New student ID with empty NAME
 7   Multiple (term + program + year +   Combines several bad values + fake subject
     name + subject)

Notes:
- Rows 4–6 use new student IDs (02-9999-00001 … 00003) so NAME / program / year rules apply.
- Rows 2–3 reuse 02-1819-00010 / 00011 so only subject or term needs fixing.
- After fixing all rows, Import should succeed.

Related files:
- importtesting.csv          — subject code problem only (2 rows)
- ../csv-import-alert-demo/02_cannot_import_demo_errors.csv — older demo set
