<?php

namespace App\Http\Middleware;

use App\Support\InputGuards;
use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

/**
 * Reject request string values that contain HTML/script-like symbols.
 * Skips password fields and known binary/json blobs.
 */
class RejectUnsafeInput
{
    /** @var list<string> */
    private array $skipKeys = [
        'password',
        'password_confirmation',
        'current_password',
        'new_password',
        'token',
        'html',
        'content',
        'body',
        'file',
        'csv',
        'storage_path',
    ];

    public function handle(Request $request, Closure $next): Response
    {
        $violations = $this->scan($request->all());
        if ($violations !== []) {
            return response()->json([
                'message' => 'Input contains disallowed symbols.',
                'error' => 'Input cannot contain unnecessary symbols (e.g. < > ` { } [ ] | ^ ~ \\).',
                'fields' => $violations,
            ], 422);
        }

        // Normalize contact number fields to digits-only before controllers run.
        foreach (['contact_number', 'Contact_Number'] as $key) {
            if ($request->has($key)) {
                $raw = $request->input($key);
                if ($raw !== null && $raw !== '') {
                    $digits = InputGuards::digitsOnlyContact(is_string($raw) ? $raw : (string) $raw);
                    $request->merge([$key => $digits === '' ? null : $digits]);
                }
            }
        }

        return $next($request);
    }

    /**
     * @param  array<string, mixed>  $data
     * @return list<string>
     */
    private function scan(array $data, string $prefix = ''): array
    {
        $bad = [];
        foreach ($data as $key => $value) {
            $path = $prefix === '' ? (string) $key : "{$prefix}.{$key}";
            $keyLower = strtolower((string) $key);
            if (in_array($keyLower, $this->skipKeys, true)) {
                continue;
            }
            if (is_array($value)) {
                $bad = array_merge($bad, $this->scan($value, $path));
                continue;
            }
            if (! is_string($value)) {
                continue;
            }
            if (InputGuards::containsUnsafeSymbols($value)) {
                $bad[] = $path;
            }
        }

        return $bad;
    }
}
