<?php

namespace App\Services;

use App\Models\Subject;
use Illuminate\Support\Collection;

class ElectiveSubjectResolver
{
    /**
     * Resolve which subject applies for a curriculum row tied to an elective slot.
     * Without a track on the student profile, never resolve to a concrete subject (UI shows the slot, e.g. Elective 1).
     * With a track: use the catalog row for that track, then a legacy generic row (null track_id), then any
     * existing evaluation whose subject is one of the slot options.
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

        if (! $studentTrackId) {
            return null;
        }

        $matched = $electiveSubjects->first(
            fn ($es) => (int) $es->track_id === (int) $studentTrackId
        );
        if ($matched && $matched->subject) {
            return $matched->subject;
        }

        $generic = $electiveSubjects->first(static fn ($es) => $es->track_id === null || (int) $es->track_id === 0);
        if ($generic && $generic->subject) {
            return $generic->subject;
        }

        $optionSubjectIds = $electiveSubjects
            ->pluck('subject_id')
            ->map(fn ($id) => (int) $id)
            ->unique()
            ->values();

        if ($studentEvaluations->isEmpty() || $optionSubjectIds->isEmpty()) {
            return null;
        }

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

        return $pick?->subject;
    }
}
