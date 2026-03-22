<?php

namespace App\Http\Controllers;

use App\Models\OtherSchoolSubject;
use Illuminate\Http\Request;

class OtherSchoolSubjectController extends Controller
{
    public function index(Request $request)
    {
        try {
            if (!$request->user() || !$request->user()->isAdmin()) {
                return response()->json(['message' => 'Unauthorized'], 403);
            }

            $subjects = OtherSchoolSubject::with('school')->get();
            return response()->json($subjects);
        } catch (\Exception $e) {
            return response()->json(['error' => 'Failed to fetch other school subjects', 'message' => $e->getMessage()], 500);
        }
    }

    public function store(Request $request)
    {
        try {
            if (!$request->user() || !$request->user()->isAdmin()) {
                return response()->json(['message' => 'Unauthorized'], 403);
            }

            $validated = $request->validate([
                'school_id' => 'required|exists:tbl_schools,school_id',
                'subject_code' => 'required|string|max:50',
                'subject_name' => 'required|string|max:100',
                'units' => 'nullable|integer',
                'hours' => 'nullable|integer',
                'description' => 'nullable|string',
            ]);

            $subject = OtherSchoolSubject::create($validated);
            $subject->load('school');
            return response()->json($subject, 201);
        } catch (\Exception $e) {
            return response()->json(['error' => 'Failed to create other school subject', 'message' => $e->getMessage()], 500);
        }
    }

    public function update(Request $request, $id)
    {
        try {
            if (!$request->user() || !$request->user()->isAdmin()) {
                return response()->json(['message' => 'Unauthorized'], 403);
            }

            $subject = OtherSchoolSubject::findOrFail($id);

            $validated = $request->validate([
                'school_id' => 'required|exists:tbl_schools,school_id',
                'subject_code' => 'required|string|max:50',
                'subject_name' => 'required|string|max:100',
                'units' => 'nullable|integer',
                'hours' => 'nullable|integer',
                'description' => 'nullable|string',
            ]);

            $subject->update($validated);
            $subject->load('school');
            return response()->json($subject);
        } catch (\Exception $e) {
            return response()->json(['error' => 'Failed to update other school subject', 'message' => $e->getMessage()], 500);
        }
    }

    public function destroy(Request $request, $id)
    {
        try {
            if (!$request->user() || !$request->user()->isAdmin()) {
                return response()->json(['message' => 'Unauthorized'], 403);
            }

            $subject = OtherSchoolSubject::findOrFail($id);
            $subject->delete();

            return response()->json(['message' => 'Other school subject deleted successfully']);
        } catch (\Exception $e) {
            return response()->json(['error' => 'Failed to delete other school subject', 'message' => $e->getMessage()], 500);
        }
    }
}

