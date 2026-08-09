# Sample SIS Grade Deliberation imports for demo student types

Import type in Admin CSV Import: **SIS Grade Deliberation export**

| File | Student ID | Demo purpose | ADMISSION TYPE |
|---|---|---|---|
| `01_regular_bsit_y1s1.csv` | 25-9101 | All subjects passed (Regular sequence) | Regular |
| `02_irregular_bsit_y1s1.csv` | 25-9102 | Failed Programming 1 (becomes Irregular) | Regular |
| `03_shiftee_bsit_y1s1.csv` | 25-9103 | Entry type Shiftee | Shiftee |
| `04_transferee_bsit_y1s1.csv` | 25-9104 | Entry type Transferee | Transferee |
| `05_returnee_bsit_y1s1.csv` | 25-9105 | Entry type Returnee | Returnee |
| `all_entry_types_bsit_y1s1.csv` | all above | Import all 5 at once | mixed |

## How to import
1. Admin / CSV Import
2. Choose **SIS Grade Deliberation export**
3. Upload one of the files above
4. Preview → Import

## Notes
- **Regular / Irregular** = computed from grades after evaluation (not ADMISSION TYPE).
- **Shiftee / Transferee / Returnee** = set from ADMISSION TYPE on import.
- For Shiftee previous-program credits: after import, use Dean evaluation → change program / subject equivalences as needed.
- Default login for new students: email generated from ID, password `ChangeMe123!`
