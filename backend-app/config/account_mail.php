<?php

return [

    /*
    |--------------------------------------------------------------------------
    | Front-end URL (password reset & email verification links)
    |--------------------------------------------------------------------------
    */
    'frontend_url' => rtrim(env('FRONTEND_URL', env('APP_URL', 'http://localhost:3000')), '/'),

    /*
    |--------------------------------------------------------------------------
    | Token lifetimes (minutes)
    |--------------------------------------------------------------------------
    */
    'verify_expire_minutes' => (int) env('MAIL_VERIFY_EXPIRE_MINUTES', 60),
    'reset_expire_minutes' => (int) env('MAIL_RESET_EXPIRE_MINUTES', 60),

    /*
    |--------------------------------------------------------------------------
    | When true, staff with a real email must verify before login.
    | Keep false until SMTP is confirmed working with your instructor.
    |--------------------------------------------------------------------------
    */
    'require_verified' => filter_var(env('MAIL_REQUIRE_VERIFIED', false), FILTER_VALIDATE_BOOL),

];
