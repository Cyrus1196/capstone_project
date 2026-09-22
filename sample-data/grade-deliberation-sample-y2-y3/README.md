# Sample cohort — Y2 / Y3 progression CSVs

Same **311 students** as `grade-deliberation-y3s1-as-y1` (SESSION **SY 23-24** Y1 demo).

Filtered from Downloads Grade Deliberation Reports (not from `Grade_Deliberation_2324_*.csv` — that is a different `02-2324-*` cohort with almost no overlap).

| File | Semester | Source session | Import after |
|------|----------|----------------|--------------|
| `Grade_Deliberation_sample_Y2S1.csv` | Y2S1 | SY 24-25 SEM I | Y1S1 + Y1S2 |
| `Grade_Deliberation_sample_Y2S2.csv` | Y2S2 | SY 24-25 SEM II | Y2S1 |
| `Grade_Deliberation_sample_Y3S1.csv` | Y3S1 | SY 25-26 SEM I | Y2S2 |
| `Grade_Deliberation_sample_Y3S2.csv` | Y3S2 | SY 25-26 SEM II | Y3S1 |

## Coverage

| Term | Grade rows | Students (of 311) |
|------|------------|-------------------|
| Y2S1 | 2480 | 284 |
| Y2S2 | 2511 | 286 |
| Y3S1 | 2111 | 311 |
| Y3S2 | 1922 | 284 |

Missing students on a term simply had no matching rows in that source report (irregular / leave / not enrolled).

**DAGALA** (`02-1314-00881`) appears in **Y3S1** here; for her Y2S1 + Programming 2 OFFSEM retake use `grade-deliberation-y2s1-offsem-test` instead.

## Suggested test order

1. Import `grade-deliberation-y3s1-as-y1` Y1S1 then Y1S2.
2. Import Y2S1 → Y2S2 → Y3S1 → Y3S2 from this folder.
3. Spot-check any sample student in Curriculum Evaluation after each term.

YEAR LEVEL is set to YEAR 2 / YEAR 3 to match SEMESTER (source Excel often left YEAR LEVEL as YEAR 1).
