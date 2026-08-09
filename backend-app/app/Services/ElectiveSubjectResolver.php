<?php

namespace App\Services;

use App\Models\Subject;
use Illuminate\Support\Collection;

class ElectiveSubjectResolver
{
    /**
     * Resolve which subject applies for a curriculum row tied to an elective slot.
     * Generic electives (null track_id) resolve immediately. Track-specific electives resolve after the
     * student has a track. With a track: use the catalog row for that track, then a generic row, then any
     * existing evaluation whose subject is one of the slot options.
     *
     * @param  Collection<int, \App\Models\ElectiveSubject>  $electiveSubjects
     * @param  Collection<int, \App\Models\Evaluation>  $studentEvaluations  subject relation loaded
     */
    public static function resolveForCurriculumSlot(
        Collection $electiveSubjects,
        ?int $studentTrackId,
        ?int $curriculumSemesterId,
        Collection $studentEvaluations,
        ?string $slotName = null,
        ?int $electiveSlotId = null
    ): ?Subject {
        if ($electiveSubjects->isEmpty()) {
            return null;
        }

        $normalizedSlotName = strtolower(trim((string) $slotName));
        $isItElectivesFour = $normalizedSlotName === 'it electives 4';
        $trackRow = $studentTrackId
            ? $electiveSubjects->first(fn ($es) => (int) $es->track_id === (int) $studentTrackId)
            : null;
        $trackText = strtolower(trim((string) (($trackRow?->track?->track_name ?? '') . ' ' . ($trackRow?->track?->track_code ?? ''))));
        $isDigitalArtsTrack = str_contains($trackText, 'digital') || str_contains($trackText, 'digi');

        // Elective 4: use the subject admin linked to this slot for the student's track
        // (Lookup → Elective subjects / Elective Slots). Digi uses the same path.
        if ($isItElectivesFour && $studentTrackId) {
            $matched = $electiveSubjects->first(
                fn ($es) => (int) $es->track_id === (int) $studentTrackId
            );
            if ($matched && $matched->subject) {
                return $matched->subject;
            }
            // Non-Digi Elective 4 without an admin assignment: fall through to evaluation match only.
            if (! $isDigitalArtsTrack) {
                return self::resolveFromExistingEvaluation(
                    $electiveSubjects,
                    $curriculumSemesterId,
                    $studentEvaluations,
                    $electiveSlotId,
                    true
                );
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

        $genericChoices = $electiveSubjects->filter(
            static fn ($es) => $es->track_id === null || (int) $es->track_id === 0
        );
        if ($genericChoices->count() === 1) {
            $generic = $genericChoices->first();
            if ($generic && $generic->subject) {
                return $generic->subject;
            }
        }

        if (! $studentTrackId) {
            return null;
        }

        return self::resolveFromExistingEvaluation(
            $electiveSubjects,
            $curriculumSemesterId,
            $studentEvaluations,
            $electiveSlotId
        );
    }

    protected static function resolveFromExistingEvaluation(
        Collection $electiveSubjects,
        ?int $curriculumSemesterId,
        Collection $studentEvaluations,
        ?int $electiveSlotId = null,
        bool $requireSlotMatch = false
    ): ?Subject {
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

        if ($electiveSlotId !== null) {
            $slotMatching = $matching->filter(
                fn ($ev) => $ev->elective_slot_id !== null && (int) $ev->elective_slot_id === (int) $electiveSlotId
            );
            if ($slotMatching->isNotEmpty() || $requireSlotMatch) {
                $matching = $slotMatching;
            }
        }

        if ($matching->isEmpty()) {
            return null;
        }

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
