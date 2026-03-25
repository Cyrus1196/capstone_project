<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use App\Models\TblUser;
use App\Models\DeanProfile;
use App\Models\FacultyProfile;

class EvaluationAccessMiddleware
{
    /**
     * Handle an incoming request.
     *
     * @param  \Illuminate\Http\Request  $request
     * @param  \Closure(\Illuminate\Http\Request): (\Illuminate\Http\Response|\Illuminate\Http\RedirectResponse)  $next
     * @return \Illuminate\Http\Response|\Illuminate\Http\RedirectResponse
     */
    public function handle(Request $request, Closure $next)
    {
        $user = $request->user();
        
        if (!$user) {
            return response()->json(['message' => 'Unauthorized - No user authenticated'], 401);
        }

        // Check if user has required role for evaluation access
        $hasAccess = $user->isAdmin()
            || $user->hasRole('Dean')
            || $user->hasRole('Faculty')
            || $user->hasRole('Adviser');
        
        if (!$hasAccess) {
            return response()->json(['message' => 'Forbidden - Insufficient privileges for evaluation access'], 403);
        }

        // Additional checks for specific evaluation operations
        $route = $request->route();
        $method = $request->method();
        
        // For DELETE operations, only Admin and Dean can delete
        if ($method === 'DELETE') {
            if (!$user->isAdmin() && !$user->hasRole('Dean')) {
                return response()->json(['message' => 'Forbidden - Only Admin and Dean can delete evaluations'], 403);
            }
        }

        // For faculty / adviser users, check profile for write operations
        if (($user->hasRole('Faculty') || $user->hasRole('Adviser')) && in_array($method, ['POST', 'PUT', 'PATCH'])) {
            $facultyProfile = FacultyProfile::where('user_id', $user->user_id)->first();

            if (!$facultyProfile) {
                return response()->json(['message' => 'Forbidden - Faculty/Adviser profile not found'], 403);
            }
        }

        // For dean users, check if they have access to their assigned program's evaluations
        if ($user->hasRole('Dean')) {
            $deanProfile = DeanProfile::where('user_id', $user->user_id)->first();
            
            if (!$deanProfile) {
                return response()->json(['message' => 'Forbidden - Dean profile not found'], 403);
            }

            // Add program-specific access logic here if needed
            // For now, we'll allow deans to access all evaluations
        }

        return $next($request);
    }
}
