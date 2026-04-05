<?php

namespace App\Services;

use App\Models\Subject;
use Illuminate\Support\Collection;

class ElectiveSubjectResolver
{
    /**
     * Resolve which subject applies for a curriculum row tied to an elective slot.
     * Prefer subjects the student already has in tbl_evaluation (their actual elective),
     * then track-based mapping, then generic / first option.
     *
     * @param  Collection<int, \App\Models\ElectiveSubject>  $electiveSubjects
     * @param  Collection<int, \App\Models\Evaluation>  $studentEvaluations  subject relation loaded
     */
    public static function resolveForCurriculumSlot(
        Collection $electiveSubjects,
        ?int $studentTrackId,
        ?int $curriculumSemesterId,
        Collection $studentEvaluations
    ): ?Subject {
        if ($electiveSubjects->isEmpty()) {
            return null;
        }

        $optionSubjectIds = $electiveSubjects
            ->pluck('subject_id')
            ->map(fn ($id) => (int) $id)
            ->unique()
            ->values();

        if ($studentEvaluations->isNotEmpty() && $optionSubjectIds->isNotEmpty()) {
            $matching = $studentEvaluations->filter(function ($ev) use ($optionSubjectIds) {
                return $ev->subject_id !== null && $optionSubjectIds->contains((int) $ev->subject_id);
            });

            $sortKey = fn ($ev) => sprintf(
                '%010d-%010d',
                (int) $ev->academic_year_id,
                (int) $ev->evaluation_id
            );

            if ($curriculumSemesterId !== null) {
                $semMatch = $matching
                    ->filter(fn ($ev) => (int) $ev->semester_id === (int) $curriculumSemesterId)
                    ->sortByDesc($sortKey);
                $pick = $semMatch->first();
                if ($pick && $pick->subject) {
                    return $pick->subject;
                }
            }

            $pick = $matching->sortByDesc($sortKey)->first();
            if ($pick && $pick->subject) {
                return $pick->subject;
            }
        }

        if ($studentTrackId) {
            $matched = $electiveSubjects->first(
                fn ($es) => (int) $es->track_id === (int) $studentTrackId
            );
            if ($matched && $matched->subject) {
                return $matched->subject;
            }
        }

        $matched = $electiveSubjects->first(fn ($es) => empty($es->track_id))
            ?? $electiveSubjects->first();

        return $matched?->subject;
    }
}
