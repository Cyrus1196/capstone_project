<?php

namespace App\Http\Controllers;

use App\Models\DeanProfile;
use App\Models\TblUser;
use Illuminate\Http\Request;

class DeanController extends Controller
{
    /**
     * Get the authenticated dean's profile
     */
    public function getProfile(Request $request)
    {
        try {
            $user = $request->user();
            if (!$user) {
                return response()->json(['message' => 'Unauthorized'], 401);
            }

            // Allow admin to get profile by user_id, otherwise use authenticated user
            $targetUserId = $request->query('user_id');
            if ($targetUserId && $user->isAdmin()) {
                $userId = $targetUserId;
            } else {
                $userId = $user->user_id;
            }

            $profile = DeanProfile::where('user_id', $userId)
                ->with('program')
                ->first();

            if (!$profile) {
                return response()->json(['message' => 'Dean profile not found'], 404);
            }

            return response()->json($profile);
        } catch (\Exception $e) {
            return response()->json([
                'error' => 'Failed to fetch dean profile',
                'message' => $e->getMessage()
            ], 500);
        }
    }
}

