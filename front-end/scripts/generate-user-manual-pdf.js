/**
 * User manuals (plain black text) per PM guidance:
 * 1) Dean + Program Head + Secretary — shared operational manual
 * 2) Admin — separate
 * 3) Evaluator (Adviser / Faculty) — separate
 * 4) Guest simulation — separate (public curriculum / load simulation)
 * 5) Student — separate (Student Portal)
 *
 * Output → %USERPROFILE%\Downloads\
 * Student copy also → front-end/public/manuals/ (for in-app download)
 * Run: node scripts/generate-user-manual-pdf.js
 */
const fs = require('fs');
const path = require('path');
const { jsPDF } = require('jspdf');

const downloads = path.join(
  process.env.USERPROFILE || process.env.HOME || '.',
  'Downloads'
);
const dateStr = new Date().toLocaleDateString('en-US', {
  year: 'numeric',
  month: 'long',
  day: 'numeric',
});

function makeDoc() {
  const doc = new jsPDF({ unit: 'pt', format: 'letter' });
  const pageW = doc.internal.pageSize.getWidth();
  const pageH = doc.internal.pageSize.getHeight();
  const marginL = 54;
  const marginR = 54;
  const marginT = 54;
  const marginB = 54;
  const maxW = pageW - marginL - marginR;
  let y = marginT;
  let page = 1;

  const setBlack = () => {
    doc.setTextColor(0, 0, 0);
    doc.setDrawColor(0, 0, 0);
  };

  const footer = () => {
    setBlack();
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);
    doc.text(`Page ${page}`, pageW / 2, pageH - 28, { align: 'center' });
  };

  const newPage = () => {
    footer();
    doc.addPage();
    page += 1;
    y = marginT;
    setBlack();
  };

  const ensure = (space) => {
    if (y + space > pageH - marginB) newPage();
  };

  const cover = (title, subtitle) => {
    setBlack();
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(18);
    doc.text('Student Evaluation System', marginL, y);
    y += 24;
    doc.setFontSize(13);
    doc.text(title, marginL, y);
    y += 18;
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(10);
    if (subtitle) {
      doc.splitTextToSize(subtitle, maxW).forEach((line) => {
        doc.text(line, marginL, y);
        y += 13;
      });
      y += 4;
    }
    doc.text('PHINMA Education — Academic Evaluation Portal', marginL, y);
    y += 14;
    doc.text(`Version date: ${dateStr}`, marginL, y);
    y += 18;
  };

  const h1 = (text) => {
    ensure(42);
    if (y > marginT + 8) y += 10;
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(14);
    setBlack();
    doc.text(text, marginL, y);
    y += 8;
    doc.setLineWidth(0.6);
    doc.line(marginL, y, pageW - marginR, y);
    y += 16;
  };

  const h2 = (text) => {
    ensure(28);
    y += 6;
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(11);
    setBlack();
    doc.text(text, marginL, y);
    y += 15;
  };

  const para = (text) => {
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(10);
    setBlack();
    doc.splitTextToSize(text, maxW).forEach((line) => {
      ensure(13);
      doc.text(line, marginL, y);
      y += 13;
    });
    y += 4;
  };

  const bullet = (text) => {
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(10);
    setBlack();
    doc.splitTextToSize(text, maxW - 22).forEach((line, i) => {
      ensure(13);
      if (i === 0) {
        doc.text('-', marginL + 10, y);
        doc.text(line, marginL + 22, y);
      } else {
        doc.text(line, marginL + 22, y);
      }
      y += 13;
    });
  };

  const numbered = (n, text) => {
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(10);
    setBlack();
    doc.splitTextToSize(text, maxW - 18).forEach((line, i) => {
      ensure(13);
      if (i === 0) doc.text(`${n}. ${line}`, marginL + 6, y);
      else doc.text(line, marginL + 18, y);
      y += 13;
    });
    y += 2;
  };

  const finish = (filename, { alsoPublic = false } = {}) => {
    footer();
    const buffer = Buffer.from(doc.output('arraybuffer'));
    const out = path.join(downloads, filename);
    fs.mkdirSync(downloads, { recursive: true });
    fs.writeFileSync(out, buffer);
    if (alsoPublic) {
      const publicDir = path.join(__dirname, '..', 'public', 'manuals');
      fs.mkdirSync(publicDir, { recursive: true });
      fs.writeFileSync(path.join(publicDir, filename), buffer);
    }
    return out;
  };

  return {
    cover,
    h1,
    h2,
    para,
    bullet,
    numbered,
    finish,
    paraBlank: (n = 8) => {
      y += n;
    },
  };
}

/** Shared hard evaluation steps used by office staff and evaluator manuals. */
function writeManualEvaluationSection(d) {
  d.h2('Open Curriculum Evaluation');
  d.numbered(1, 'Go to Evaluation → Student (Curriculum Evaluation), or Evaluate a student from the dashboard.');
  d.numbered(2, 'Use filters: Campus, Year Level, Standing, and Student search (name or student ID).');
  d.numbered(3, 'For catch-up work, set Standing to Unevaluated or Unevaluated irregular.');
  d.numbered(4, 'Select the student. The curriculum table and summary appear on the right.');

  d.h2('Confirm standing and summary');
  d.bullet('Check Regular vs Irregular, credited/lacking units, Program, Campus, Year, and Semester.');
  d.bullet('Irregular students are who you normally evaluate and promote manually.');
  d.bullet('Campus / Year / Semester changes require permission and confirmation when editable.');

  d.h2('Record or correct grades');
  d.numbered(1, 'In the curriculum table, enter or correct grades for subjects (if your access allows grade edit).');
  d.numbered(2, 'Passed = progress; Failed / INC keeps or moves the student toward Irregular and blocks auto-promotion.');
  d.numbered(3, 'If your access is Promote only, grades may be read-only — review them and continue to Promote / placement.');
  d.numbered(4, 'When the floating bar appears, click Save All Changes.');

  d.h2('Promote to next semester (manual for irregulars)');
  d.numbered(1, 'Click Promote to next semester.');
  d.numbered(2, 'Review next-term subjects, prerequisites, and units.');
  d.numbered(3, 'Choose track or elective when required.');
  d.numbered(4, 'Enter evaluator name if prompted, then Save.');
  d.para(
    'Regulars who already cleared the term are promoted automatically on semester activation — you usually do not promote them manually.'
  );

  d.h2('Subject placement (term load)');
  d.numbered(1, 'Open Subject placement from the evaluation screen.');
  d.numbered(2, 'Mark Take for subjects to enroll this term; Drop for deferred subjects.');
  d.numbered(3, 'Backlog subjects need met prerequisites and must be offered; stay within the unit cap.');
  d.numbered(4, 'Click Save load plan.');

  d.h2('Finish and verify');
  d.bullet('Recheck Year/Semester, Regular/Irregular, remaining units, and this-term load.');
  d.bullet('Open Evaluation → Evaluated students to review stored irregular evaluations.');
  d.bullet('Optional: Download Evaluation (PDF/CSV) for that one student from the evaluation card.');
}

function writeDownloadListSection(d) {
  d.numbered(1, 'Click Download list (same row as the Curriculum Evaluation title, right corner).');
  d.numbered(2, 'Choose Irregulars, All, or Regular → Preview (large preview modal).');
  d.numbered(3, 'Optional: set Year level to a specific year (example: 1st Year only).');
  d.numbered(4, 'Optional: Sort by Year level or Name.');
  d.numbered(5, 'Review the table, then download as CSV, Excel, or PDF.');
  d.bullet('Campus filter from the main screen still applies. Practice / simulation students are excluded.');
}

function writeStaffManual() {
  const d = makeDoc();
  d.cover(
    'User Manual — Dean, Program Head & Secretary',
    'One shared operational guide for evaluating offices. Hard workflows first: manual evaluation, subject crediting, SIS upload/import, and curriculum maintenance. Admin, Evaluator, and Guest simulation each have a separate manual.'
  );

  d.h1('1. Who this manual is for');
  d.para(
    'Dean, Program Head (PH), and Departmental Secretary share the same evaluation way of working. Menus may differ by permission, but Curriculum Evaluation, Promote, Subject placement, Subject crediting, and Import (when granted) follow the same steps.'
  );
  d.bullet('Dean — department/program evaluation oversight, analytics, reports; may also have admin modules.');
  d.bullet('Program Head — program-scoped student view, evaluation (if granted), reports, curriculum view.');
  d.bullet('Secretary — add/view students, support evaluation, reports, curriculum; import/credit if granted.');
  d.para(
    'Evaluator (Adviser / Faculty) is documented separately: SES_User_Manual_Evaluator.pdf.'
  );
  d.para(
    'Rule of thumb: Regular students who pass their term are usually auto-evaluated and auto-promoted when the next semester is activated. Your manual work is mainly for Irregular students (failed, incomplete, or off-track loads).'
  );

  d.h1('2. Getting started');
  d.numbered(1, 'Open the Login page.');
  d.numbered(
    2,
    'Sign in with your email OR Employee ID, then your password. Either identifier works for Dean / Program Head / Secretary accounts.'
  );
  d.numbered(3, 'Open your portal (Dean / Program Head / Secretary).');
  d.numbered(4, 'Use the left sidebar for Evaluation, Curriculum, Subject crediting, Import / Export (if shown), and Profile.');
  d.numbered(5, 'Click Guide in the header anytime for the irregular-evaluation walkthrough.');
  d.numbered(6, 'Use Logout in the sidebar when finished.');
  d.bullet('Forgot password uses your email for the reset link — keep a valid email on your profile.');
  d.bullet('If Employee ID login fails, try your email (or ask Admin to confirm your Employee ID is set).');

  d.h1('3. How to evaluate a student manually (start here)');
  d.para(
    'This is the core hard workflow. Practice first with Guide or a Practice student before touching live irregulars.'
  );
  writeManualEvaluationSection(d);

  d.h1('4. How to credit (Subject crediting / transfer credit)');
  d.para(
    'Use Subject crediting when a student has subjects from another school or prior program that should count toward the local curriculum.'
  );
  d.numbered(1, 'Open Subject crediting from the sidebar (permission required).');
  d.numbered(2, 'Select or search the student.');
  d.numbered(3, 'Map the external / prior subject to the local subject (use subject equivalence tools when available).');
  d.numbered(4, 'Enter credit details and save / approve as your permission allows.');
  d.numbered(5, 'Return to Curriculum Evaluation for that student — credited subjects should show toward progress.');
  d.bullet('If a major subject is blocked by year standing, Dean / Program Head / Admin may unlock with an override when policy allows.');
  d.bullet('Wrong mapping can inflate units — double-check codes and names before approving.');

  d.h1('5. How to upload / import student and grade data');
  d.para(
    'Import / Export appears only if your account has Import / Export permission (often Admin; sometimes Dean/Secretary).'
  );
  d.h2('5.1 Upload SIS / grade deliberation file');
  d.numbered(1, 'Open Import / Export.');
  d.numbered(2, 'Choose import type (for example SIS Grade Deliberation).');
  d.numbered(3, 'Upload CSV, TSV, TXT, Excel (.xlsx / .xls), or ODS as allowed on screen.');
  d.numbered(4, 'Optional: set Academic Year and Semester overrides, or let the system infer from SESSION / filename.');
  d.numbered(5, 'Review the preview (Campus, Academic Year, Semester mapping). Fix rows if the screen offers Fix row.');
  d.numbered(6, 'Confirm import. Large files process in the background (progress bar); keep the queue worker running locally if you host the API yourself.');
  d.numbered(7, 'After import, Regular / Irregular standing refreshes for affected students.');
  d.h2('5.2 Campus from filename (required format)');
  d.para(
    'Name the upload file so the campus letter is the LAST character of the filename (before .xlsx / .csv). The system reads that letter and matches it to Lookup → Campus.'
  );
  d.para('Sample format: 2324S1M.xlsx  (school year + semester + campus letter)');
  d.bullet('2324 = school year code (example).');
  d.bullet('S1 or S2 = semester in the filename (example).');
  d.bullet('Last letter = campus code from the Campus table (first letter of the campus name, ignoring the word “Campus”).');
  d.para('Examples (letter must match your Campus table):');
  d.bullet('2324S1M.xlsx → M → Carmen / Main (legacy: M maps to Carmen).');
  d.bullet('2324S2P.xlsx → P → Puerto Campus.');
  d.bullet('2324S1I.xlsx → I → Iligan Campus.');
  d.bullet('2728S1B.xlsx → B → Butuan Campus (when “Butuan Campus” exists in Lookup → Campus).');
  d.bullet('If you add a new campus in Lookup (example: “Davao Campus”), use its first letter: …D.xlsx.');
  d.bullet('Do not put the letter in the middle only — it must be the last letter of the file name stem.');
  d.bullet('First campus saved for a student is sticky — later summer/main files do not overwrite it.');

  d.h1('6. Operational process — curriculum (how to add / maintain)');
  d.para(
    'Curriculum is the source of truth for evaluation rows. Only users with Curriculum Management (or related) permission can edit; others view.'
  );
  d.h2('6.1 Add or update curriculum');
  d.numbered(1, 'Open Curriculum Management (and Curriculum headers if shown).');
  d.numbered(2, 'Select or create the curriculum header for the program / effective year.');
  d.numbered(3, 'Add curriculum rows: subject, year level, semester, units/passing rules as required.');
  d.numbered(4, 'Maintain prerequisites so evaluation and placement can enforce them.');
  d.numbered(5, 'Save. Open a test student in Curriculum Evaluation to verify rows appear correctly.');
  d.h2('6.2 Elective slots');
  d.numbered(1, 'Open Elective Slots (if permitted).');
  d.numbered(2, 'Define slot names and allowed subjects per program.');
  d.numbered(3, 'During evaluation / import, elective grades can assign into the correct slot.');
  d.h2('6.3 Semester activation (affects auto-promotion)');
  d.numbered(1, 'Lookup → Semesters (if you have Lookup access) or ask Admin.');
  d.numbered(2, 'Activate the new semester.');
  d.numbered(3, 'Regulars who completed their term may auto-promote; Irregulars stay for manual evaluation (Section 3).');

  d.h1('7. Download student list (Curriculum Evaluation)');
  writeDownloadListSection(d);

  d.h1('8. Reports and analytics');
  d.bullet('From a student evaluation: Generate / Download Academic Evaluation Report (PDF) for that student.');
  d.bullet('Dean Analytics (if shown): choose program and term; review standing, failed subjects, and decision hints.');
  d.bullet('Large programs may take a few seconds — wait for charts/tables to finish.');

  d.h1('9. Role notes inside this shared manual');
  d.h2('9.1 Dean');
  d.bullet('Full evaluation workflow (Section 3); Analytics; reports; may receive Import, Lookup, Curriculum, Crediting.');
  d.h2('9.2 Program Head');
  d.bullet('View students/curriculum in program scope; evaluate when permitted; PDF reports; simulation/placement tools.');
  d.h2('9.3 Secretary');
  d.bullet('Add students when Student management is available; support evaluation; PDF reports; curriculum view; import/credit if granted.');

  d.h1('10. Tips');
  d.bullet('Missing menu = ask Admin for the matching User permission.');
  d.bullet('Empty list = clear Campus / Year / Standing filters or check program scope.');
  d.bullet('Prefer Unevaluated irregular after semester activation for manual catch-up.');
  d.bullet('Use Guide + Practice student before live irregular evaluation.');

  d.paraBlank(10);
  d.para('End of Manual — Dean, Program Head & Secretary.');
  d.para(
    'Related manuals: SES_User_Manual_Admin.pdf, SES_User_Manual_Evaluator.pdf, SES_User_Manual_Guest_Simulation.pdf.'
  );

  return d.finish('SES_User_Manual_Dean_PH_Secretary.pdf');
}

function writeEvaluatorManual() {
  const d = makeDoc();
  d.cover(
    'User Manual — Evaluator (Adviser / Faculty)',
    'Separate guide for the Evaluator portal. Hard workflows first: manual evaluation of irregulars, promote / subject placement, and subject crediting. Dean / PH / Secretary and Admin manuals are separate.'
  );

  d.h1('1. Who this manual is for');
  d.para(
    'Evaluator (also called Adviser / Faculty) evaluates students inside an assigned program and year-level scope. You use the same Curriculum Evaluation tools as Dean/PH/Secretary, but your list is limited to students you are allowed to see.'
  );
  d.bullet('Portal path after login: Evaluator (Adviser) portal.');
  d.bullet('Typical sidebar: Dashboard, Analytics (if granted), Evaluation → Student, Evaluated students, Subject crediting (if granted), My Profile.');
  d.bullet('You normally do not manage users, Lookup, or system backup — those are Admin.');
  d.para(
    'Rule of thumb: Regulars who pass their term are auto-evaluated / auto-promoted when the next semester is activated. Focus on Unevaluated irregular students.'
  );

  d.h1('2. Getting started');
  d.numbered(1, 'Open the Login page.');
  d.numbered(
    2,
    'Sign in with your email OR Employee ID, then your password. Either identifier works for Evaluator / Adviser / Faculty accounts.'
  );
  d.numbered(3, 'Open the Evaluator portal.');
  d.numbered(4, 'Confirm your assigned program and year levels with Admin if the student list looks empty or too small.');
  d.bullet('Forgot password uses your email for the reset link.');
  d.bullet('If Employee ID login fails, try your email (or ask Admin to confirm your Employee ID).');
  d.numbered(4, 'Click Guide in the header for the irregular-evaluation walkthrough.');
  d.numbered(5, 'Logout from the sidebar when finished.');

  d.h1('3. How to evaluate a student manually (start here)');
  d.para(
    'This is your main hard workflow. If grades are read-only (Promote only), still review grades, then Promote and place subjects.'
  );
  writeManualEvaluationSection(d);
  d.bullet('Your student list is scoped — you may not see every student in the department.');
  d.bullet('If a student is missing, ask Admin to check your year-level / program assignment and Student Evaluation permission.');

  d.h1('4. How to credit (Subject crediting)');
  d.para(
    'Subject crediting appears only if Admin granted Credit Evaluation / Subject crediting access.'
  );
  d.numbered(1, 'Open Subject crediting from the sidebar.');
  d.numbered(2, 'Select the student in your scope.');
  d.numbered(3, 'Map external / prior subjects to local curriculum subjects.');
  d.numbered(4, 'Save / approve as allowed, then reopen Curriculum Evaluation to verify progress.');
  d.bullet('If you cannot approve credits, ask Dean / Program Head / Admin.');

  d.h1('5. Download student list');
  d.para(
    'Use Download list on the Curriculum Evaluation header (right corner) for students in your current filters/scope.'
  );
  writeDownloadListSection(d);

  d.h1('6. Reports and analytics');
  d.bullet('From a student card: download that student’s Academic Evaluation Report (PDF) when available.');
  d.bullet('Open Analytics (if shown) for adviser-scoped standing / evaluation buckets.');
  d.bullet('You usually do not run Dean decision analytics for the whole department unless granted.');

  d.h1('7. What Evaluators typically do not do');
  d.bullet('Create staff users or change User permissions (Admin).');
  d.bullet('Bulk SIS Import / Export unless Admin granted Import / Export.');
  d.bullet('Edit Lookup tables or activate semesters (Admin / Dean with Lookup).');
  d.bullet('Edit the master curriculum structure unless Curriculum Management was granted.');

  d.h1('8. Tips');
  d.bullet('After semester activation, filter Standing → Unevaluated irregular first.');
  d.bullet('Empty list often means year-level scope — contact Admin.');
  d.bullet('Use Guide anytime; Practice/simulation students are for training, not live records.');
  d.bullet('Promote only access: you can still complete irregular promotion and placement without editing grades.');

  d.paraBlank(10);
  d.para('End of Manual — Evaluator (Adviser / Faculty).');
  d.para(
    'Related manuals: SES_User_Manual_Dean_PH_Secretary.pdf, SES_User_Manual_Admin.pdf, SES_User_Manual_Guest_Simulation.pdf.'
  );

  return d.finish('SES_User_Manual_Evaluator.pdf');
}

function writeGuestManual() {
  const d = makeDoc();
  d.cover(
    'User Manual — Guest Simulation (separate)',
    'Public curriculum catalog and load / prerequisite simulation. No staff login required. Nothing is saved to the server as an official student record.'
  );

  d.h1('1. What Guest simulation is for');
  d.para(
    'Use Guest mode to explore a program curriculum, mark subjects as already credited/passed, estimate remaining years and semesters, optionally simulate transfer-course matching, plan remaining subjects, and download a PDF. It does not update live student evaluations, grades, or promotions.'
  );
  d.bullet('Who: prospective students, advisers exploring what-if plans, or anyone without a staff/student login.');
  d.bullet('Where: Landing page → Explore as guest → Open guest area (URL /guest).');
  d.bullet('Not for: official grade upload, Promote, or saving academic records (use staff portals).');

  d.h1('2. Getting started');
  d.numbered(1, 'Open the Academic Evaluation Portal home page.');
  d.numbered(2, 'Under Explore as guest, click Open guest area (or go directly to /guest).');
  d.numbered(3, 'Wait for the curriculum catalog to load.');
  d.numbered(4, 'Optional: use Home or Login in the top navigation if you need to leave Guest mode.');

  d.h1('3. Set up your simulation (filters)');
  d.numbered(1, 'Name (optional) — enter a name so the PDF shows who the plan is for.');
  d.numbered(2, 'Curriculum — choose the curriculum version / effective year.');
  d.numbered(3, 'Program — search and select the program (required).');
  d.numbered(4, 'Year / Semester (optional) — narrow the catalog view; use All years / All semesters to see the full map.');
  d.para(
    'The summary bar shows Credited units, Lacking units, Remaining years, and Remaining semesters as you mark subjects.'
  );

  d.h1('4. Hard part first — mark credited / passed subjects');
  d.para(
    'Step 1 of 2 on screen: mark what is already done, then Confirm to build the remaining-subjects plan.'
  );
  d.numbered(1, 'Open the Curriculum simulation section if it is collapsed.');
  d.numbered(2, 'Browse subjects by year and semester.');
  d.numbered(3, 'Mark individual subjects as credited/passed (check controls on each row / section).');
  d.numbered(4, 'Use section check toggles when available to mark a whole semester’s eligible subjects.');
  d.numbered(5, 'Respect prerequisites and corequisites — the system may block crediting a subject until its prereqs (and linked coreqs) are also credited.');
  d.numbered(6, 'For IT track-based electives, follow on-screen hints (example: IT Electives 1 needs 3rd-year standing / unit threshold; later electives follow Admin elective-slot rules).');
  d.numbered(7, 'When ready, click Confirm to generate the remaining-subjects plan (Step 2).');

  d.h1('5. Optional — simulate subject crediting from another school');
  d.para(
    'Expand Simulate subject crediting (prior-school course codes). This uses active subject equivalences on file. Still nothing is saved as an official credit evaluation.'
  );
  d.numbered(1, 'Optional: filter by Prior school.');
  d.numbered(2, 'Enter external subject codes (one per line or comma-separated).');
  d.numbered(3, 'Click Match codes to local subjects.');
  d.numbered(4, 'Review matches, then Apply matched local subjects as credited.');
  d.numbered(5, 'Continue marking any remaining local subjects manually, then Confirm the plan.');

  d.h1('6. Remaining-subjects planner (Step 2)');
  d.numbered(1, 'Review the suggested plan for subjects still lacking.');
  d.numbered(2, 'Drag subjects between semesters, or use Move to, to adjust the load.');
  d.numbered(3, 'Watch planner stats: remaining units, estimated years/semesters, and load limits shown on screen (example limits: 23 / 24 / 19 / 12 · Extended 12 · Summer 9).');
  d.numbered(4, 'Adjust until the plan looks realistic for advising or personal planning.');

  d.h1('7. Download PDF');
  d.numbered(1, 'Click Download PDF (top of the guest filters area).');
  d.numbered(2, 'Wait until Preparing… finishes.');
  d.numbered(3, 'Open the file — it typically includes Curriculum simulation and, when available, Subjects to take.');
  d.bullet('Include your Name in the filter before downloading if you want it on the PDF header.');

  d.h1('8. What Guest mode cannot do');
  d.bullet('Does not create or update a real student profile.');
  d.bullet('Does not import SIS grades or change campus / standing in the database.');
  d.bullet('Does not replace official Subject crediting / transfer credit approval by staff.');
  d.bullet('Does not promote students or store Evaluated students records.');

  d.h1('9. Tips');
  d.bullet('Start with Program + Curriculum, then mark passed subjects year by year.');
  d.bullet('If no courses appear, change Year/Semester back to All or pick another curriculum/program.');
  d.bullet('Refreshing the browser clears unsaved guest simulation work — download PDF before leaving.');
  d.bullet('For official evaluation, sign in as Student, Evaluator, Dean, PH, or Secretary.');

  d.paraBlank(10);
  d.para('End of Manual — Guest Simulation.');
  d.para(
    'Related manuals: SES_User_Manual_Dean_PH_Secretary.pdf, SES_User_Manual_Evaluator.pdf, SES_User_Manual_Admin.pdf.'
  );

  return d.finish('SES_User_Manual_Guest_Simulation.pdf');
}

function writeAdminManual() {
  const d = makeDoc();
  d.cover(
    'User Manual — Admin (separate)',
    'System administration only. Day-to-day evaluation for Dean / PH / Secretary, Evaluator, and Guest simulation are in their own manuals.'
  );

  d.h1('1. Admin role');
  d.para(
    'Admin maintains users, permissions, lookup data, curriculum foundations, import/export, security, audit, and backup. Admin does not replace the staff or Evaluator evaluation walkthroughs — those portals have Guide tours for irregular evaluation.'
  );

  d.h1('2. Getting started');
  d.numbered(1, 'Open the Login page and sign in with your Admin email and password (Admin uses email; Employee ID is optional).');
  d.numbered(2, 'Open the Admin Panel.');
  d.numbered(
    3,
    'Use the sidebar: Dashboard, Lookup Data, User permissions, Curriculum, Elective Slots, Users, Students, Subject crediting, Import / Export, Security, Audit Logs, Backup.'
  );
  d.numbered(4, 'Click Guide for an Admin module tour. Logout from the sidebar.');
  d.bullet(
    'When creating Dean / PH / Secretary / Evaluator accounts, set both email and Employee ID — they can log in with either.'
  );

  d.h1('3. Hard setup first — permissions and users');
  d.h2('3.1 User permissions (roles and modules)');
  d.numbered(1, 'Open User permissions / Role Settings.');
  d.numbered(2, 'Grant modules needed by Dean, PH, Secretary, Evaluator (examples: Student Evaluation, Import / Export, Lookup Data, Curriculum, Credit Evaluation, Reports).');
  d.numbered(3, 'For Evaluators, also assign the correct program and year-level scope on their faculty profile.');
  d.numbered(4, 'Save. Ask the user to log out and back in if menus do not refresh.');

  d.h2('3.2 User Management');
  d.numbered(1, 'Open User Management.');
  d.numbered(2, 'Create/edit staff accounts and assign the correct role (including Evaluator / Faculty).');
  d.numbered(3, 'Link faculty/dean/secretary profiles (program/department) so evaluation scope is correct.');

  d.h2('3.3 Student Management');
  d.numbered(1, 'Open Student Management for the student directory (separate from bulk SIS import).');
  d.numbered(2, 'Add or edit student profiles (ID number, name, program, year).');
  d.numbered(3, 'Confirm the student appears under Evaluation search for the right staff scope.');

  d.h1('4. How to upload / import (Admin)');
  d.numbered(1, 'Open Import / Export.');
  d.numbered(2, 'Choose SIS Grade Deliberation (or other import type).');
  d.numbered(3, 'Name the file with campus as the LAST letter of the filename stem, then upload.');
  d.numbered(4, 'Review preview (Campus / AY / Semester).');
  d.numbered(5, 'Confirm import. Large SIS/grades files run in the background — watch the progress bar; login stays available.');
  d.numbered(6, 'Standing refreshes for affected students. First campus is sticky.');
  d.para(
    'Local setup: keep a queue worker running (php artisan queue:work) beside the API, or use composer run dev. Production starts a queue worker with the app so imports do not block other users.'
  );

  d.h2('4.1 Filename format for campus (important)');
  d.para(
    'Sample format: 2324S1M.xlsx — school year + semester + campus letter as the last character before the extension.'
  );
  d.bullet('2324S1M.xlsx → M → Carmen / Main (legacy M = Carmen).');
  d.bullet('2324S2P.xlsx → P → Puerto Campus.');
  d.bullet('2324S1I.xlsx → I → Iligan Campus.');
  d.bullet('2728S1B.xlsx → B → Butuan Campus (when listed in Lookup → Campus).');
  d.bullet(
    'Campus letter = first letter of the campus name in Lookup → Campus (ignore trailing “Campus”). Example: “Puerto Campus” → P; “Butuan Campus” → B.'
  );
  d.bullet('If you create a new campus in the Campus table, use that campus’s first letter at the end of the filename.');
  d.bullet('Wrong or missing last letter = campus may not map on preview/import.');

  d.h1('5. How to maintain curriculum (Admin operational process)');
  d.numbered(1, 'Open Curriculum Management / Curriculum headers.');
  d.numbered(2, 'Create or select the curriculum version for a program.');
  d.numbered(3, 'Add subjects by year and semester; set prerequisites.');
  d.numbered(4, 'Open Elective Slots and define allowed elective subjects.');
  d.numbered(5, 'Verify in Curriculum Evaluation that rows and electives resolve.');

  d.h1('6. Lookup Data and semester activation');
  d.numbered(1, 'Open Lookup Data: Programs, Campuses, Academic Years, Semesters, Year Levels, Departments, Subjects, etc.');
  d.numbered(2, 'Keep names accurate — import campus letters and filters depend on them.');
  d.numbered(3, 'Activate the correct semester when a new term starts.');
  d.numbered(4, 'Regulars who completed the term may auto-promote; Irregulars remain for staff / Evaluator manual evaluation.');

  d.h1('7. Subject crediting (Admin)');
  d.numbered(1, 'Open Subject crediting.');
  d.numbered(2, 'Select student; map external subjects to local codes; approve credits.');
  d.numbered(3, 'Confirm progress updates on the student evaluation screen.');

  d.h1('8. Security, audit, backup');
  d.bullet('Security Settings — session and system controls.');
  d.bullet('Audit Logs — review important actions.');
  d.bullet('Backup — export/protect database copies; store securely offline.');

  d.h1('9. Supporting evaluation tools (reference)');
  d.para(
    'Download list (CSV / Excel / PDF), year-level filter in preview, Promote, and Subject placement are documented in the Dean / PH / Secretary manual and the Evaluator manual. Grant Student Evaluation (and related) permissions so those screens appear.'
  );

  d.h1('10. Tips');
  d.bullet('If Dean/PH/Secretary/Evaluator cannot see Import or Crediting, grant the module under User permissions.');
  d.bullet('If an Evaluator list is empty, check faculty program + year-level assignment.');
  d.bullet('After large imports, spot-check Regular/Irregular and campus on a few students.');
  d.bullet('Do not treat Practice / simulation students as live records.');

  d.paraBlank(10);
  d.para('End of Manual — Admin.');
  d.para(
    'Related manuals: SES_User_Manual_Dean_PH_Secretary.pdf, SES_User_Manual_Evaluator.pdf, SES_User_Manual_Guest_Simulation.pdf.'
  );

  return d.finish('SES_User_Manual_Admin.pdf');
}

function writeStudentManual() {
  const d = makeDoc();
  d.cover(
    'User Manual — Student',
    'How to use the Student Portal: dashboard, profile, curriculum, grades view, and evaluation report download. Students cannot enter grades or change standing — that is done by school staff.'
  );

  d.h1('1. Who this manual is for');
  d.para(
    'This guide is for students with a Student Portal account. Use it to check your term progress, keep your contact details up to date, review your curriculum and grades, and download your academic evaluation report.'
  );
  d.bullet('Portal path after login: Student Portal.');
  d.bullet('Tabs: Dashboard, My Profile, My Curriculum.');
  d.bullet(
    'Staff manuals (Dean / PH / Secretary, Evaluator, Admin) are separate — students do not evaluate other students.'
  );

  d.h1('2. Sign in');
  d.numbered(1, 'Open the Academic Evaluation Portal login page.');
  d.numbered(2, 'Enter your username (usually your Student ID number) and your default password.');
  d.numbered(3, 'If prompted to change password on first login, set a new password and continue.');
  d.numbered(4, 'You should land on the Student Portal Dashboard.');

  d.h2('Default password (first login)');
  d.para(
    'When your account is created by the school, your default password is your first name + 123 (lowercase, first word only).'
  );
  d.bullet('Rule: first word of your first name (all lowercase) + 123');
  d.bullet('Example: if your first name is Juan, password is juan123');
  d.bullet('Example: if your first name is John Cyrus, password is john123 (only the first word)');
  d.bullet('Example: if your first name is JESSEL, password is jessel123');
  d.bullet('If you already changed your password, use the new one — the default no longer applies.');
  d.bullet('If login fails, confirm your Student ID / account is active. Contact Admin if needed.');

  d.h1('3. Dashboard');
  d.para(
    'Dashboard is your home page. It summarizes enrollment activity for the current term and recent updates.'
  );
  d.h2('Summary cards');
  d.bullet('Enrolled subjects — subjects you are currently taking (ongoing / incomplete).');
  d.bullet('Completed subjects — subjects already passed or credited.');
  d.bullet('Failed subjects — subjects recorded as failed.');
  d.bullet('Current term — school year and semester shown on your latest active enrollments.');
  d.h2('Shortcuts');
  d.bullet('View grades / View evaluation — opens My Curriculum.');
  d.bullet('Update profile — opens My Profile.');
  d.bullet('Recent activity — latest enrollment and grade updates.');

  d.h1('4. My Profile');
  d.para('Keep personal information correct so staff can reach you and your record stays accurate.');
  d.h2('What you can edit');
  d.numbered(1, 'Open My Profile.');
  d.numbered(2, 'Update first name, middle name, last name, contact number, and address as needed.');
  d.numbered(3, 'Click Save profile.');
  d.bullet('Contact number should be 11 digits (example: 09123456789).');
  d.bullet('If the connection drops while typing, your draft is kept on this device so you can try saving again.');
  d.h2('What is locked (staff-managed)');
  d.bullet('Student ID number — locked once it is set.');
  d.bullet('Program, academic status (Regular / Irregular), year level, and track — set by Dean, Program Head, Adviser, or Admin.');
  d.h2('Change password');
  d.numbered(1, 'On My Profile, scroll to Change password.');
  d.numbered(2, 'Enter your current password and a new password.');
  d.numbered(3, 'Confirm the new password and save.');
  d.bullet('Do not share your password. Use Guide in the header if you need an on-screen walkthrough.');

  d.h1('5. My Curriculum (grades and requirements)');
  d.para(
    'My Curriculum shows your program checklist by year and semester: subject codes, pre/co-requisites, description, units, hours, passing grade, type, and status.'
  );
  d.numbered(1, 'Open My Curriculum.');
  d.numbered(2, 'Use the year pills (1st Year, 2nd Year, …) to switch levels.');
  d.numbered(3, 'Open each semester section to review subjects and Status (passed, failed, ongoing, blank, and so on).');
  d.bullet('Grades and evaluation outcomes appear after staff record them — students cannot type grades here.');
  d.bullet('If the page says curriculum is not available yet, your program/curriculum may not be linked. Contact Admin or your adviser.');

  d.h1('6. Download evaluation report (PDF)');
  d.numbered(1, 'Open My Curriculum.');
  d.numbered(2, 'Click Download evaluation report.');
  d.numbered(3, 'Choose the school year / semester when prompted.');
  d.numbered(4, 'Confirm to save the PDF to your device.');
  d.bullet('Use this PDF for advising, scholarship, or personal records. Official corrections still go through staff.');

  d.h1('7. What students cannot do in this portal');
  d.bullet('Enter or change grades.');
  d.bullet('Promote year / semester standing.');
  d.bullet('Change enrollment status (Enrolled, Inactive, Graduate, Transferred).');
  d.bullet('Import SIS files, credit external subjects, or edit curriculum setup.');
  d.para(
    'If a grade looks wrong, a subject is missing, or standing looks incorrect, contact your Adviser, Dean, Program Head, Secretary, or Registrar. They use staff portals to correct the official record.'
  );

  d.h1('8. Guide and logout');
  d.bullet('Click Guide in the header anytime for the interactive Student Portal walkthrough.');
  d.bullet('Click Logout when you are finished. Do not leave your account open on a shared computer.');

  d.h1('9. Tips and troubleshooting');
  d.bullet('Empty Dashboard numbers — you may have no enrollments yet, or import/evaluation is still pending.');
  d.bullet('Cannot edit program or year — that is normal; ask staff to update your profile.');
  d.bullet('Curriculum empty — ask Admin to assign the correct program and curriculum header.');
  d.bullet('PDF download fails — allow pop-ups/downloads for the site, then try again.');
  d.bullet(
    'Forgot password — try your default again (first name + 123, lowercase) if you never changed it; otherwise use login recovery or ask Admin to reset.'
  );

  d.paraBlank(10);
  d.para('End of Manual — Student.');
  d.para(
    'Related manuals: SES_User_Manual_Dean_PH_Secretary.pdf, SES_User_Manual_Evaluator.pdf, SES_User_Manual_Admin.pdf, SES_User_Manual_Guest_Simulation.pdf.'
  );

  return d.finish('SES_User_Manual_Student.pdf', { alsoPublic: true });
}

const staffPath = writeStaffManual();
const evaluatorPath = writeEvaluatorManual();
const guestPath = writeGuestManual();
const adminPath = writeAdminManual();
const studentPath = writeStudentManual();
console.log(staffPath);
console.log(evaluatorPath);
console.log(guestPath);
console.log(adminPath);
console.log(studentPath);
