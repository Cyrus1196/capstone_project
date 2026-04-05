<?php

namespace App\Services;

/**
 * Heuristic: "Irregular" if the student passed a curriculum subject while an earlier
 * required curriculum slot in program order is still not passed (hole in sequence).
 * "Regular" otherwise. Elective-only gaps are not distinguished in this MVP (treat as same rule).
 */
class AcademicStatusClassifier
{
    /**
     * @param  array<int, bool>  $passedInCurriculumOrder  Same length as curriculum rows, in program order
     * @return array{status: string, reasons: array<int, string>}
     */
    public static function fromPassSequence(array $passedInCurriculumOrder): array
    {
        $n = count($passedInCurriculumOrder);
        if ($n === 0) {
            return ['status' => 'Regular', 'reasons' => []];
        }

        $reasons = [];

        for ($i = 0; $i < $n; $i++) {
            if ($passedInCurriculumOrder[$i]) {
                for ($j = 0; $j < $i; $j++) {
                    if (!$passedInCurriculumOrder[$j]) {
                        $reasons[] = 'A later curriculum subject is completed while an earlier required slot in program order is not yet passed (sequence gap).';
                        break 2;
                    }
                }
            }
        }

        return [
            'status' => count($reasons) > 0 ? 'Irregular' : 'Regular',
            'reasons' => array_values(array_unique($reasons)),
        ];
    }
}
