<?php

namespace App\Services;

use App\Models\AcademicYear;
use App\Models\Modality;
use App\Models\Section;
use App\Models\Semester;
use Illuminate\Http\UploadedFile;

/**
 * Parses school SIS "Grade Deliberation" style tabular exports (tab or comma delimited).
 *
 * Layout (after SESSION … SECTION): variable-width instructor columns, then MODALITY … REMARKS.
 * Optional header row with labels like SESSION, STUDENT ID, CODE (case-insensitive).
 */
class SisGradeDeliberationImportParser
{
    /**
     * @return list<array<string, mixed>>
     */
    public function parseFileToGradeRows(UploadedFile $file, ?int $overrideAcademicYearId, ?int $overrideSemesterId): array
    {
        $rawLines = $this->readNonEmptyLines($file);
        if ($rawLines === []) {
            return [];
        }

        $delimiter = $this->detectDelimiter($rawLines[0]);
        $firstCells = str_getcsv($rawLines[0], $delimiter);
        $hasHeader = $this->rowLooksLikeHeader($firstCells);

        $lines = $hasHeader ? array_slice($rawLines, 1) : $rawLines;
        $headerMap = $hasHeader ? $this->buildHeaderIndex($firstCells) : null;

        $modalities = $this->loadModalityLookup();

        $out = [];
        foreach ($lines as $idx => $line) {
            $cells = str_getcsv($line, $delimiter);
            $rowNum = $idx + ($hasHeader ? 2 : 1);
            $parsed = $this->parseOneRow($cells, $headerMap, $modalities, $rowNum);
            if ($parsed === null) {
                continue;
            }

            [$session, $studentId, $subjectCode, $sectionCode, $modalityId, $grade, $evalStatus] = $parsed;

            [$ayId, $semId] = $this->resolveTerm($session, $overrideAcademicYearId, $overrideSemesterId);
            $sectionId = $this->resolveSectionId($sectionCode, $ayId);

            $out[] = [
                'student_id_number' => $studentId,
                'subject_code' => $subjectCode,
                'academic_year_id' => $ayId,
                'semester_id' => $semId,
                'section_id' => $sectionId,
                'grade' => $grade,
                'evaluation_status' => $evalStatus,
                'modality_id' => $modalityId,
                'enrolled_date' => null,
                'evaluation_date' => null,
                'inc_compliance_deadline' => null,
                '_sis_row' => $rowNum,
                '_sis_session' => $session,
            ];
        }

        return $out;
    }

    /**
     * @return list<string>
     */
    private function readNonEmptyLines(UploadedFile $file): array
    {
        $path = $file->getRealPath();
        if ($path === false) {
            return [];
        }
        $content = file_get_contents($path);
        if ($content === false) {
            return [];
        }
        $content = preg_replace("/^\xEF\xBB\xBF/", '', $content) ?? $content;
        $lines = preg_split("/\r\n|\n|\r/", $content) ?: [];

        return array_values(array_filter(array_map('trim', $lines), static fn (string $l) => $l !== ''));
    }

    private function detectDelimiter(string $firstLine): string
    {
        $tabs = substr_count($firstLine, "\t");
        $commas = substr_count($firstLine, ',');

        return $tabs >= $commas && $tabs > 0 ? "\t" : ',';
    }

    /**
     * @param  list<string>  $cells
     */
    private function rowLooksLikeHeader(array $cells): bool
    {
        if ($cells === []) {
            return false;
        }
        $first = strtolower(trim(preg_replace('/\s+/', ' ', (string) ($cells[0] ?? ''))));

        return $first === 'session';
    }

    /**
     * @param  list<string>  $headerCells
     * @return array<string, int>
     */
    private function buildHeaderIndex(array $headerCells): array
    {
        $map = [];
        foreach ($headerCells as $i => $h) {
            $key = strtolower(trim(preg_replace('/\s+/', ' ', (string) $h)));
            $key = str_replace([' ', '-'], ['_', '_'], $key);
            $map[$key] = $i;
        }

        return $map;
    }

    /**
     * @param  list<string>  $cells
     * @param  array<string, int>|null  $headerMap
     * @param  array<string, int>  $modalities  lower_name => id
     * @return array{0: string, 1: string, 2: string, 3: ?string, 4: ?int, 5: ?string, 6: ?string}|null
     */
    private function parseOneRow(array $cells, ?array $headerMap, array $modalities, int $rowNumber): ?array
    {
        if ($headerMap !== null) {
            $g = static function (array $map, array $row, array $keys) use ($rowNumber): ?string {
                foreach ($keys as $k) {
                    $nk = str_replace([' ', '-'], ['_', '_'], strtolower($k));
                    if (isset($map[$nk])) {
                        $v = $row[$map[$nk]] ?? '';

                        return trim((string) $v);
                    }
                }

                return null;
            };

            $session = $g($headerMap, $cells, ['session']) ?? '';
            $studentId = $this->normalizeStudentId($g($headerMap, $cells, ['student id', 'student_id', 'studentid']) ?? '');
            $subjectCode = trim((string) ($g($headerMap, $cells, ['code']) ?? ''));
            $sectionCode = $g($headerMap, $cells, ['section']);
            $remarks = $g($headerMap, $cells, ['remarks']);
            $gradeCol = $g($headerMap, $cells, ['grade']);
            $modalityName = $g($headerMap, $cells, ['modality']);
            $modalityId = $this->modalityIdFromName($modalities, $modalityName);

            return [
                $session,
                $studentId,
                strtoupper($subjectCode),
                $sectionCode !== null && $sectionCode !== '' ? $sectionCode : null,
                $modalityId,
                $this->normalizeGradeValue($gradeCol),
                $this->normalizeEvaluationStatus($remarks, $gradeCol),
            ];
        }

        return $this->parseOneRowPositional($cells, $modalities, $rowNumber);
    }

    /**
     * Positional layout: 0..11 fixed (session … section), variable instructors, then modality…remarks.
     *
     * @param  list<string>  $cells
     * @param  array<string, int>  $modalities
     * @return array{0: string, 1: string, 2: string, 3: ?string, 4: ?int, 5: ?string, 6: ?string}|null
     */
    private function parseOneRowPositional(array $cells, array $modalities, int $rowNumber): ?array
    {
        $n = count($cells);
        if ($n < 22) {
            return null;
        }

        $session = trim((string) ($cells[0] ?? ''));
        $studentId = $this->normalizeStudentId(trim((string) ($cells[3] ?? '')));
        $subjectCode = strtoupper(trim((string) ($cells[7] ?? '')));
        $sectionCode = trim((string) ($cells[11] ?? ''));
        if ($sectionCode === '') {
            $sectionCode = null;
        }

        $modIdx = $this->findModalityStartIndex($cells, $modalities, 12);
        if ($modIdx === null || $modIdx < 12) {
            return null;
        }

        $tail = array_slice($cells, $modIdx);
        $tailParsed = $this->parseTailColumns($tail);
        if ($tailParsed === null) {
            return null;
        }

        $modalityId = $this->modalityIdFromName($modalities, $tailParsed['modality']);

        return [
            $session,
            $studentId,
            $subjectCode,
            $sectionCode,
            $modalityId,
            $this->normalizeGradeValue($tailParsed['grade']),
            $this->normalizeEvaluationStatus($tailParsed['remarks'], $tailParsed['grade']),
        ];
    }

    /**
     * @param  list<string>  $cells
     * @param  array<string, int>  $modalities
     */
    private function findModalityStartIndex(array $cells, array $modalities, int $from): ?int
    {
        $n = count($cells);
        $knownTokens = array_unique(array_merge(
            array_keys($modalities),
            ['flex', 'f2f', 'online', 'hybrid', 'modular', 'face to face', 'blended']
        ));

        for ($i = $from; $i < $n; $i++) {
            $t = strtolower(trim((string) ($cells[$i] ?? '')));
            if ($t === '' || $t === '-') {
                continue;
            }
            if (isset($modalities[$t]) || in_array($t, $knownTokens, true)) {
                return $i;
            }
        }

        return null;
    }

    /**
     * Tail from modality token: modality, enlistment, admission, gender, p1–p3, fe (optional), grade, remarks.
     *
     * @param  list<string>  $tail
     * @return array{modality: string, enlistment: string, admission: string, gender: string, p1: string, p2: string, p3: string, fe: ?string, grade: string, remarks: string}|null
     */
    private function parseTailColumns(array $tail): ?array
    {
        $m = count($tail);
        if ($m < 9) {
            return null;
        }

        $modality = trim((string) $tail[0]);
        if ($m === 9) {
            return [
                'modality' => $modality,
                'enlistment' => trim((string) $tail[1]),
                'admission' => trim((string) $tail[2]),
                'gender' => trim((string) $tail[3]),
                'p1' => trim((string) $tail[4]),
                'p2' => trim((string) $tail[5]),
                'p3' => trim((string) $tail[6]),
                'fe' => null,
                'grade' => trim((string) $tail[7]),
                'remarks' => trim((string) $tail[8]),
            ];
        }

        if ($m >= 10) {
            return [
                'modality' => $modality,
                'enlistment' => trim((string) $tail[1]),
                'admission' => trim((string) $tail[2]),
                'gender' => trim((string) $tail[3]),
                'p1' => trim((string) $tail[4]),
                'p2' => trim((string) $tail[5]),
                'p3' => trim((string) $tail[6]),
                'fe' => trim((string) $tail[7]),
                'grade' => trim((string) $tail[8]),
                'remarks' => trim((string) $tail[9]),
            ];
        }

        return null;
    }

    /**
     * @return array<string, int>
     */
    private function loadModalityLookup(): array
    {
        $out = [];
        foreach (Modality::query()->get(['modality_id', 'modality_name']) as $row) {
            $name = strtolower(trim((string) $row->modality_name));
            if ($name !== '') {
                $out[$name] = (int) $row->modality_id;
            }
        }

        return $out;
    }

    /**
     * @param  array<string, int>  $modalities
     */
    private function modalityIdFromName(array $modalities, ?string $name): ?int
    {
        if ($name === null || trim($name) === '' || trim($name) === '-') {
            return null;
        }
        $k = strtolower(trim($name));
        if (isset($modalities[$k])) {
            return $modalities[$k];
        }
        if (strlen($k) >= 3) {
            foreach ($modalities as $dbName => $id) {
                if ($dbName !== '' && strlen($dbName) >= 3 && (str_contains($dbName, $k) || str_contains($k, $dbName))) {
                    return $id;
                }
            }
        }

        return null;
    }

    private function normalizeStudentId(string $raw): string
    {
        $s = trim($raw);
        $s = preg_replace("/^['\x{2018}\x{2019}]+/u", '', $s) ?? $s;

        return trim($s);
    }

    private function normalizeGradeValue(?string $v): ?string
    {
        if ($v === null) {
            return null;
        }
        $t = strtoupper(trim($v));
        if ($t === '' || $t === '-' || $t === 'N/A' || $t === 'NA') {
            return null;
        }

        return trim($v);
    }

    private function normalizeEvaluationStatus(?string $remarks, ?string $gradeCol): ?string
    {
        $r = strtolower(trim((string) $remarks));
        $g = strtoupper(trim((string) $gradeCol));

        if ($r === 'passed' || $r === 'pass' || $r === 'complete') {
            return 'passed';
        }
        if ($r === 'failed' || $r === 'fail') {
            return 'failed';
        }
        if ($r === 'dropped' || $r === 'drop') {
            return 'dropped';
        }
        if (str_contains($r, 'inc') || $r === 'incomplete') {
            return 'incomplete';
        }
        if ($r === 'ongoing' || $r === 'ongoing') {
            return 'ongoing';
        }
        if ($g === 'COMPLETE') {
            return 'passed';
        }

        return $r !== '' ? $r : null;
    }

    /**
     * @return array{0: ?int, 1: ?int}
     */
    public function resolveTerm(?string $session, ?int $overrideAy, ?int $overrideSem): array
    {
        if ($overrideAy !== null && $overrideSem !== null) {
            return [$overrideAy, $overrideSem];
        }

        $session = $session !== null ? trim($session) : '';
        if ($session === '') {
            return [null, null];
        }

        $ayId = $this->guessAcademicYearId($session);
        $semId = $this->guessSemesterId($session);

        return [$ayId, $semId];
    }

    private function guessAcademicYearId(string $session): ?int
    {
        if (! preg_match('/(\d{2})\s*-\s*(\d{2})/', $session, $m)) {
            return null;
        }
        $y1 = (int) $m[1];
        $y2 = (int) $m[2];
        $full1 = 2000 + $y1;
        $full2 = 2000 + $y2;
        $short = $m[1] . '-' . $m[2];

        foreach (AcademicYear::query()->orderBy('academic_year_id')->get() as $ay) {
            $n = (string) $ay->academic_year_name;
            $ln = strtolower($n);
            if (stripos($n, (string) $full1) !== false && stripos($n, (string) $full2) !== false) {
                return (int) $ay->academic_year_id;
            }
            if (stripos($n, $short) !== false || str_contains($ln, str_replace('-', '–', $short))) {
                return (int) $ay->academic_year_id;
            }
        }

        return null;
    }

    private function guessSemesterId(string $session): ?int
    {
        $u = strtoupper($session);
        $order = null;
        if (preg_match('/\bSEM(?:ESTER)?\s*(?:III|3|THIRD)\b/', $u)) {
            $order = 3;
        } elseif (preg_match('/\bSEM(?:ESTER)?\s*(?:II|2|SECOND)\b/', $u)) {
            $order = 2;
        } elseif (preg_match('/\bSEM(?:ESTER)?\s*(?:I|1|FIRST)\b/', $u)) {
            $order = 1;
        }

        $ids = Semester::query()->orderBy('semester_id')->pluck('semester_id')->all();
        if ($ids === [] || $order === null) {
            return null;
        }
        $idx = min(max($order, 1), count($ids)) - 1;

        return (int) $ids[$idx];
    }

    private function resolveSectionId(?string $sectionCode, ?int $academicYearId): ?int
    {
        if ($sectionCode === null || $sectionCode === '') {
            return null;
        }

        $q = Section::query()->where('section_name', $sectionCode);
        if ($academicYearId !== null) {
            $q->where('academic_year_id', $academicYearId);
        }
        $id = $q->value('section_id');

        return $id !== null ? (int) $id : null;
    }
}
