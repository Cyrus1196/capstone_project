<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class SecuritySetting extends Model
{
    protected $table = 'tbl_security_settings';

    protected $primaryKey = 'security_settings_id';

    protected $fillable = [
        'max_password_length',
        'password_expiry_days',
        'session_timeout_minutes',
        'student_session_timeout_minutes',
        'lockout_attempts',
        'lockout_duration_minutes',
    ];

    protected function casts(): array
    {
        return [
            'max_password_length' => 'integer',
            'password_expiry_days' => 'integer',
            'session_timeout_minutes' => 'integer',
            'student_session_timeout_minutes' => 'integer',
            'lockout_attempts' => 'integer',
            'lockout_duration_minutes' => 'integer',
        ];
    }

    public static function current(): self
    {
        $row = self::query()->orderBy('security_settings_id')->first();
        if ($row) {
            return $row;
        }

        return self::create([
            'max_password_length' => 64,
            'password_expiry_days' => 90,
            'session_timeout_minutes' => 30,
            'student_session_timeout_minutes' => 30,
            'lockout_attempts' => 5,
            'lockout_duration_minutes' => 15,
        ]);
    }

    public function toPublicArray(): array
    {
        return [
            'max_password_length' => (int) $this->max_password_length,
            'password_expiry_days' => (int) $this->password_expiry_days,
            'session_timeout_minutes' => (int) $this->session_timeout_minutes,
            'student_session_timeout_minutes' => (int) ($this->student_session_timeout_minutes ?? $this->session_timeout_minutes),
            'lockout_attempts' => (int) $this->lockout_attempts,
            'lockout_duration_minutes' => (int) $this->lockout_duration_minutes,
        ];
    }
}
