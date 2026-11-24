<?php

use Illuminate\Contracts\Http\Kernel;
use Illuminate\Http\Request;

define('LARAVEL_START', microtime(true));

if (file_exists($maintenance = __DIR__.'/../storage/framework/maintenance.php')) {
    require $maintenance;
}

require __DIR__.'/../vendor/autoload.php';

/*
| Browser calls /saes/api/login. Laravel must see /api/login or POST login
| returns 405. Change only REQUEST_URI. Leave SCRIPT_NAME alone.
*/
$uri = $_SERVER['REQUEST_URI'] ?? '/';
$question = strpos($uri, '?');
$path = false === $question ? $uri : substr($uri, 0, $question);
$query = false === $question ? '' : substr($uri, $question);

if (($path === '/saes' || strncmp($path, '/saes/', 6) === 0) && strpos($path, '/backend-app/public') === false) {
    $path = substr($path, 5);
    if ($path === '' || $path === false) {
        $path = '/';
    } elseif ($path[0] !== '/') {
        $path = '/'.$path;
    }
    $_SERVER['REQUEST_URI'] = $path.$query;
}

$app = require_once __DIR__.'/../bootstrap/app.php';

$kernel = $app->make(Kernel::class);

$response = $kernel->handle(
    $request = Request::capture()
)->send();

$kernel->terminate($request, $response);
