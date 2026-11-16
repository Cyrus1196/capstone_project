<?php

namespace App\Http\Controllers\Administration;

use App\Http\Controllers\Controller;
use App\Models\TermImportCompletion;
use App\Services\StudentEnrollmentStatusSync;
use Illuminate\Http\Request;

class TermImportCompletionController extends Controller
{
    public function index(Request $request)
    {
        if (! $request->user()) {
            return response()->json(['message' => 'Unauthorized'], 401);
        }

        $rows = TermImportCompletion::query()
            ->with(['academicYear', 'semester', 'campus', 'completedByUser'])
            ->orderByDesc('completed_at')
            ->limit(100)
            ->get()
            ->map(function (TermImportCompletion $row) {
                $campusId = (int) ($row->campus_id ?? 0);

                return [
                    'id' => $row->id,
                    'academic_year_id' => $row->academic_year_id,
                    'academic_year_name' => $row->academicYear?->academic_year_name,
                    'semester_id' => $row->semester_id,
                    'semester_name' => $row->semester?->semester_name,
                    'campus_id' => $campusId > 0 ? $campusId : null,
                    'campus_name' => $row->campus?->campus_name,
                    'completed_at' => $row->completed_at?->toIso8601String(),
                    'completed_by' => $row->completed_by,
                    'completed_by_name' => $row->completedByUser
                        ? trim(($row->completedByUser->first_name ?? '').' '.($row->completedByUser->last_name ?? ''))
                        : null,
                    'notes' => $row->notes,
                ];
            });

        return response()->json(['completions' => $rows]);
    }

    public function store(Request $request)
    {
        $user = $request->user();
        if (! $user) {
            return response()->json(['message' => 'Unauthorized'], 401);
        }

        $validated = $request->validate([
            'academic_year_id' => 'required|integer|exists:tbl_academic_year,academic_year_id',
            'semester_id' => 'required|integer|exists:tbl_semester,semester_id',
            'campus_id' => 'nullable|integer|exists:tbl_campus,campus_id',
            'notes' => 'nullable|string|max:1000',
        ]);

        $ay = (int) $validated['academic_year_id'];
        $sem = (int) $validated['semester_id'];
        $campusKey = isset($validated['campus_id']) && $validated['campus_id'] !== null
            ? (int) $validated['campus_id']
            : 0;

        $completion = TermImportCompletion::query()->updateOrCreate(
            [
                'academic_year_id' => $ay,
                'semester_id' => $sem,
                'campus_id' => $campusKey,
            ],
            [
                'completed_by' => $user->user_id,
                'completed_at' => now(),
                'notes' => $validated['notes'] ?? null,
            ]
        );

        $result = app(StudentEnrollmentStatusSync::class)->markMissingFromCompletedTerm(
            $ay,
            $sem,
            $campusKey > 0 ? $campusKey : null
        );

        return response()->json([
            'message' => 'Term import marked complete. Missing previous-term students set to Inactive.',
            'completion' => [
                'id' => $completion->id,
                'academic_year_id' => $completion->academic_year_id,
                'semester_id' => $completion->semester_id,
                'campus_id' => $campusKey > 0 ? $campusKey : null,
                'completed_at' => $completion->completed_at?->toIso8601String(),
            ],
            'stopped_count' => $result['stopped'],
            'previous_term' => $result['previous_term'],
        ]);
    }

    public function destroy(Request $request, int $id)
    {
        $user = $request->user();
        if (! $user || ! $user->isAdmin()) {
            return response()->json(['message' => 'Only Admin can un-complete a term import.'], 403);
        }

        $row = TermImportCompletion::query()->find($id);
        if (! $row) {
            return response()->json(['message' => 'Not found'], 404);
        }
        $row->delete();

        return response()->json(['message' => 'Term import completion removed.']);
    }
}
