<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Foundation\Auth\User as Authenticatable;
use Illuminate\Notifications\Notifiable;

class TblUser extends Authenticatable
{
    use HasFactory, Notifiable;

    protected $table = 'tbl_users';
    protected $primaryKey = 'user_id';
    public $timestamps = false;

    /** DB may use capitalized columns (Email, Password, Contact_Number). Map to lowercase for code. */
    private const COLUMN_ALIASES = [
        'email' => ['Email', 'email'],
        'password' => ['Password', 'password'],
        'contact_number' => ['Contact_Number', 'contact_number'],
    ];

    public function getAuthIdentifierName()
    {
        return 'user_id';
    }

    protected $fillable = [
        'email',
        'password',
        'contact_number',
        'role_id',
        'status',
    ];

    protected $hidden = [
        'password',
    ];

    protected function casts(): array
    {
        return [
            'password' => 'hashed',
        ];
    }

    public function getAttribute($key)
    {
        foreach (self::COLUMN_ALIASES as $codeKey => $dbNames) {
            if ($key !== $codeKey) {
                continue;
            }
            foreach ($dbNames as $dbKey) {
                if (array_key_exists($dbKey, $this->attributes)) {
                    return $this->attributes[$dbKey];
                }
            }
            return null;
        }
        return parent::getAttribute($key);
    }

    public function setAttribute($key, $value)
    {
        foreach (self::COLUMN_ALIASES as $codeKey => $dbNames) {
            if ($key !== $codeKey) {
                continue;
            }
            $dbKey = $dbNames[0];
            if ($key === 'password') {
                parent::setAttribute('password', $value);
                $stored = $this->attributes['password'] ?? $this->attributes['Password'] ?? null;
                if ($stored !== null) {
                    $this->attributes[$dbKey] = $stored;
                    unset($this->attributes['password']);
                }
            } else {
                $this->attributes[$dbKey] = $value;
            }
            return $this;
        }
        return parent::setAttribute($key, $value);
    }

    /** Find user by email regardless of column name (Email vs email). */
    public function scopeWhereEmail($query, $email)
    {
        return $query->where(function ($q) use ($email) {
            $q->where('Email', $email)->orWhere('email', $email);
        });
    }

    /**
     * Ensure JSON/API responses use lowercase keys (email, contact_number) for frontend compatibility.
     */
    public function toArray()
    {
        $array = parent::toArray();
        foreach (self::COLUMN_ALIASES as $codeKey => $dbNames) {
            $value = null;
            foreach ($dbNames as $dbKey) {
                if (array_key_exists($dbKey, $array)) {
                    $value = $array[$dbKey];
                    unset($array[$dbKey]);
                }
            }
            if ($codeKey !== 'password' && $value !== null) {
                $array[$codeKey] = $value;
            }
        }
        return $array;
    }

    public function role()
    {
        return $this->belongsTo(Role::class, 'role_id', 'role_id');
    }

    public function deanProfile()
    {
        return $this->hasOne(DeanProfile::class, 'user_id', 'user_id');
    }

    public function facultyProfile()
    {
        return $this->hasOne(FacultyProfile::class, 'user_id', 'user_id');
    }

    public function studentProfile()
    {
        return $this->hasOne(StudentProfile::class, 'user_id', 'user_id');
    }

    public function hasRole($roleName)
    {
        return $this->role && $this->role->role_name === $roleName;
    }

    public function isAdmin()
    {
        try {
            if (!$this->role_id) {
                return false;
            }
            
            // Load role if not already loaded
            if (!$this->relationLoaded('role')) {
                $this->load('role');
            }
            
            if (!$this->role) {
                return false;
            }
            
            return $this->hasRole('Admin');
        } catch (\Exception $e) {
            return false;
        }
    }
}

