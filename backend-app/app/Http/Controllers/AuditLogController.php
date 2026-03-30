<?php

namespace App\Http\Controllers;

use App\Models\AuditLog;
use Illuminate\Http\Request;

class AuditLogController extends Controller
{
    public function index(Request $request)
    {
        try {
            $user = $request->user();
            if (! $user) {
                return response()->json(['message' => 'Unauthorized'], 403);
            }
            if (! $user->isAdmin() && ! $user->hasPermission('audit.view') && ! $user->hasPermission('Audit Logs')) {
                return response()->json(['message' => 'Unauthorized'], 403);
            }

            $query = AuditLog::with('user');

            // Apply filters
            if ($request->has('user_id')) {
                $query->where('user_id', $request->user_id);
            }

            if ($request->has('table_name')) {
                $query->where('table_name', $request->table_name);
            }

            if ($request->has('actions')) {
                $query->where('actions', 'like', '%' . $request->actions . '%');
            }

            if ($request->has('date_from')) {
                $query->where('action_timestamp', '>=', $request->date_from);
            }

            if ($request->has('date_to')) {
                $query->where('action_timestamp', '<=', $request->date_to);
            }

            $logs = $query->orderBy('action_timestamp', 'desc')
                ->paginate($request->get('per_page', 50));

            return response()->json($logs);
        } catch (\Exception $e) {
            return response()->json(['error' => 'Failed to fetch audit logs', 'message' => $e->getMessage()], 500);
        }
    }
}

