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

    /*
    |--------------------------------------------------------------------------
    | New-device / login email OTP
    |--------------------------------------------------------------------------
    | All roles must verify via emailed OTP on login, except roles listed in
    | DEVICE_OTP_EXEMPT_ROLES (Student by default).
    |
    | Optional allow-list: if DEVICE_OTP_ROLES is set to a non-empty list, only
    | those roles require OTP (still minus any exempt roles). Leave unset to
    | require OTP for every non-exempt role.
    */
    'device_otp_roles' => array_values(array_filter(array_map(
        'trim',
        explode(',', (string) env('DEVICE_OTP_ROLES', ''))
    ))),
    'device_otp_exempt_roles' => array_values(array_filter(array_map(
        'trim',
        explode(',', (string) env('DEVICE_OTP_EXEMPT_ROLES', 'Student'))
    ))),
    'device_otp_expire_minutes' => (int) env('DEVICE_OTP_EXPIRE_MINUTES', 10),
    /*
    | When true, OTP is required on every login (even previously trusted devices).
    | When false, only untrusted / new browsers require OTP.
    */
    'device_otp_every_login' => filter_var(env('DEVICE_OTP_EVERY_LOGIN', true), FILTER_VALIDATE_BOOL),

];
