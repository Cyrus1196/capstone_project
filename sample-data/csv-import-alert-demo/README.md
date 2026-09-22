# CSV import alert demo

Small SIS Grade Deliberation samples to try the **Cannot import** alerts.

## How to test

1. Open the portal → **CSV Import** (SIS Grade Deliberation).
2. Choose one of the files below → **Preview**.
3. Hard-refresh the UI first if you just rebuilt (`Ctrl+F5`).

## Files

### `01_ready_DAGALA_4rows.csv` (expect Ready)

- 4 rows for student **02-1314-00881** (DAGALA)
- Valid `SESSION` (`SY 24-25 SEM I`) and real subject codes
- Expect: **Ready (4)** and Import button enabled  
  (only if DAGALA + subjects already exist in your DB from earlier demos)

### `02_cannot_import_demo_errors.csv` (expect Cannot import alert)

Intentional bad rows — you should see a popup + yellow banner with reasons:

| Row idea | What we broke | Typical message |
|----------|---------------|-----------------|
| Bad SESSION | `NOT_A_REAL_SESSION` | Could not infer term from SESSION… |
| Fake subject | `ZZZ 999` | subject_code does not exist / selected is invalid |
| New student, no NAME | ID `99-0000-99999`, empty NAME | New student row is missing NAME. |
| Bad COURSE | `Not A Real Program Name XYZ` | Could not match COURSE to an existing program. |
| Empty STUDENT ID | blank ID | student_id_number is required / validation error |

Use the **Cannot import** filter and the **Why / Issue** column (left side of the table).

## Larger real samples (optional)

- `sample-data/grade-deliberation-y2s1-offsem-test/Grade_Deliberation_DAGALA_Y2S1_with_Programming2_OFFSEM.csv` — 1 student + OFFSEM Prog 2
- `sample-data/grade-deliberation-sample-y2-y3/Grade_Deliberation_sample_Y2S1.csv` — full Y2S1 cohort (~2400 rows)
