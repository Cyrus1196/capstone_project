# Academic Evaluation Portal — Flowchart (Top → Bottom)

Layout: **START at top**, flow **downward** (⬇).  
Use in **Mermaid Chart**, **draw.io**, or Cursor preview.

**Requirements (FR-01–FR-10, NFR-01–NFR-13):** see [`Functional_and_Non-functional_Requirements.md`](Functional_and_Non-functional_Requirements.md)

---

## Copy this into Mermaid Chart

```mermaid
flowchart TD
    START([START])
    START --> HOMEPAGE[HOMEPAGE]
    HOMEPAGE --> CHOICE{LOGIN OR<br/>CONTINUE AS GUEST?}

    CHOICE -->|Continue as Guest| G1[SHOWS GUEST PAGE]
    G1 --> G2[SELECT PROGRAM & CURRICULUM]
    G2 --> G3[GUEST SIMULATING]
    G3 --> G4[MARK SUBJECTS AS CREDITED]
    G4 --> G5{CONFIRM SIMULATION?}
    G5 -->|No| G3
    G5 -->|Yes| G6[OPEN PLANNER]
    G6 --> G7[DOWNLOAD PDF CLICKED]
    G7 --> END_GUEST([END])

    CHOICE -->|Login| L1[SHOWS LOGIN PAGE]
    L1 --> L2[ENTER EMAIL, PASSWORD & CAPTCHA]
    L2 --> L3{VALID CREDENTIALS?}
    L3 -->|No| L_ERR[SHOW ERROR]
    L_ERR --> L2
    L3 -->|Yes| L4{MUST CHANGE PASSWORD?}
    L4 -->|Yes| L5[CHANGE PASSWORD]
    L5 --> L6{USER ROLE?}
    L4 -->|No| L6

    L6 -->|Admin| A1[ADMIN PANEL]
    A1 --> A2[MANAGE LOOKUP DATA]
    A2 --> A3[MANAGE USERS & STUDENTS]
    A3 --> A4[MANAGE CURRICULUM & ELECTIVES]
    A4 --> A5[CSV IMPORT]
    A5 --> A6[UPLOAD SIS GRADE FILE]
    A6 --> A7[PREVIEW ROWS]
    A7 --> A8{SUBJECT CODE MATCH?}
    A8 -->|No| A9[FIX SUBJECT MAPPING]
    A9 --> A7
    A8 -->|Yes| A10[IMPORT RECORDS]
    A10 --> A11[SECURITY & AUDIT LOGS]
    A11 --> LOGOUT[LOGOUT]
    LOGOUT --> HOMEPAGE

    L6 -->|Dean| D1[DEAN PANEL]
    D1 --> D2[VIEW DASHBOARD & ANALYTICS]
    D2 --> E1[OPEN STUDENT EVALUATION]
    E1 --> E2[SEARCH & FILTER STUDENTS]
    E2 --> E3[SELECT STUDENT]
    E3 --> E4[VIEW CURRICULUM & GRADES]
    E4 --> E5[ENTER / UPDATE GRADES]
    E5 --> E6[SET STANDING & LOAD PLAN]
    E6 --> E7[SAVE ALL CHANGES]
    E7 --> E8[STUDENT MARKED EVALUATED]
    E8 --> E9[VIEW EVALUATED STUDENTS]
    E9 --> D3[MANAGE STUDENTS & CURRICULUM]
    D3 --> LOGOUT

    L6 -->|Faculty| F1[FACULTY PANEL]
    F1 --> F2[VIEW DASHBOARD & ANALYTICS]
    F2 --> E1

    L6 -->|Program Head| P1[PROGRAM HEAD PANEL]
    P1 --> P2[MANAGE CURRICULUM]
    P2 --> E1

    L6 -->|Secretary| S1[SECRETARY PANEL]
    S1 --> S2[MANAGE STUDENTS]
    S2 --> A5

    L6 -->|Student| ST1[STUDENT PANEL]
    ST1 --> ST2[VIEW DASHBOARD]
    ST2 --> ST3[VIEW PROFILE]
    ST3 --> ST4[VIEW CURRICULUM & PROGRESS]
    ST4 --> LOGOUT
```

---

## draw.io — box order (top to bottom)

### Main entry
1. **START** (oval)  
2. **HOMEPAGE** (rectangle)  
3. **LOGIN OR CONTINUE AS GUEST?** (diamond)  

### If Guest (branch down)
4. SHOWS GUEST PAGE  
5. SELECT PROGRAM & CURRICULUM  
6. GUEST SIMULATING  
7. MARK SUBJECTS AS CREDITED  
8. CONFIRM SIMULATION? (diamond)  
9. OPEN PLANNER  
10. DOWNLOAD PDF CLICKED  
11. **END** (oval)  

### If Login (branch down)
4. SHOWS LOGIN PAGE  
5. ENTER EMAIL, PASSWORD & CAPTCHA  
6. VALID CREDENTIALS? (diamond)  
7. MUST CHANGE PASSWORD? (diamond)  
8. USER ROLE? (diamond)  

### Dean / Faculty — Student evaluation (vertical)
9. OPEN STUDENT EVALUATION  
10. SEARCH & FILTER STUDENTS  
11. SELECT STUDENT  
12. VIEW CURRICULUM & GRADES  
13. ENTER / UPDATE GRADES  
14. SET STANDING & LOAD PLAN  
15. SAVE ALL CHANGES  
16. STUDENT MARKED EVALUATED  
17. VIEW EVALUATED STUDENTS  

### Student portal (vertical)
9. STUDENT PANEL  
10. VIEW DASHBOARD  
11. VIEW PROFILE  
12. VIEW CURRICULUM & PROGRESS  
13. LOGOUT → back to HOMEPAGE  

---

## Tip for draw.io
- Drag shapes in a **single column** under each branch.  
- Use **↓ arrows only** between steps.  
- Put **decisions** as diamonds; **Yes/No** labels on the arrows going down.
