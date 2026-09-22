# Sample: DAGALA — Y2S1 load + Programming 2 OFFSEM

Student: **DAGALA, BEVERLY MEARL** (`02-1314-00881`)

## Why this file

After Y1S2 she failed:

- `ITE 048` Discrete Structures (5.00) — backlog, **not offered** in Y2S1 standing
- `ITE 186` Computer Programming 2 (5.00) — backlog, **OFFSEM** (listed in Offered subjects)

This CSV imports her **2nd year 1st semester** load for `SY 24-25 SEM I`, including a **Re-Study / OFFSEM** pass for Programming 2.

## What is in the CSV (8 subjects · 21 units)

| Code | Role | Result |
|------|------|--------|
| HIS 007, SSP 005, PED 032, GEN 003 | Regular Y2S1 | Passed |
| ITE 083, ITE 292, ITE 298 | Regular Y2S1 | Passed |
| **ITE 186** | **OFFSEM retake** (home term Y1S2, taken in SY 24-25 SEM I; enlistment **Retake**) | **Passed 2.25** |

Not included (on purpose):

- `ITE 031` / `ITE 300` — still need Programming 2 first (become eligible **after** this import)
- `ITE 048` — still “Not offered” unless you add it under Lookup → Offered subjects

## How to test

1. Confirm student is **Irregular**, standing **2nd Year / 1st Semester**, and Current subjects shows **ITE 186 · TAKE · OFFSEM**.
2. Lookup → **Offered subjects**: ensure `ITE 186` is offered for this standing (needed for OFFSEM).
3. Student Management → CSV import → Grade Deliberation.
4. Import:

`sample-data/grade-deliberation-y2s1-offsem-test/Grade_Deliberation_DAGALA_Y2S1_with_Programming2_OFFSEM.csv`

5. Open Curriculum Evaluation → DAGALA.

### Expected after import

- `ITE 186` shows a newer **Passed** grade from **SY 24-25 SEM I** (OFFSEM retake worked).
- `ITE 031` / `ITE 300` become **eligible** (prereq ITE 186 met).
- `ITE 048` stays failed / backlog until offered or retaken later.

## Prerequisite files (already in repo)

- `grade-deliberation-y3s1-as-y1/Grade_Deliberation_Y3S1_students_Y1S1.csv`
- `grade-deliberation-y3s1-as-y1/Grade_Deliberation_Y3S1_students_Y1S2.csv` (contains her Y1S2 fails)
