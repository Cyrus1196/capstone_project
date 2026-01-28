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

