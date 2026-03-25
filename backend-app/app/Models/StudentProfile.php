<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Support\Facades\Schema;

class StudentProfile extends Model
{
    use HasFactory;

    protected $table = 'tbl_student_profile';
    protected $primaryKey = 'student_id';
    public $timestamps = false;

    protected $fillable = [
        'user_id',
        'student_number',
        'student_id_number',
        'contact_number',
        'first_name',
        'middle_name',
        'last_name',
        'address',
        'academic_status',
        'Current_Program',
        'year_level_id',
        'track_id',
    ];

    /** Alias for Current_Program so controllers can use current_program. */
    public function getCurrentProgramAttribute()
    {
        return $this->attributes['Current_Program'] ?? $this->attributes['current_program'] ?? null;
    }

    /** Single attribute for either student_id_number or student_number column. */
    public function getStudentIdNumberAttribute()
    {
        return $this->attributes['student_id_number'] ?? $this->attributes['student_number'] ?? null;
    }

    /** Look up by student_id_number or student_number. */
    public function scopeWhereStudentIdNumber($query, $number)
    {
        return $query->where(function ($q) use ($number) {
            $hasStudentIdNumber = Schema::hasColumn($this->table, 'student_id_number');
            $hasStudentNumber = Schema::hasColumn($this->table, 'student_number');

            if ($hasStudentIdNumber) {
                $q->where('student_id_number', $number);
            }

            if ($hasStudentNumber) {
                if ($hasStudentIdNumber) {
                    $q->orWhere('student_number', $number);
                } else {
                    $q->where('student_number', $number);
                }
            }
        });
    }

    public function user()
    {
        return $this->belongsTo(TblUser::class, 'user_id', 'user_id');
    }

    public function program()
    {
        return $this->belongsTo(Program::class, 'Current_Program', 'program_id');
    }

    public function yearLevel()
    {
        return $this->belongsTo(YearLevel::class, 'year_level_id', 'year_level_id');
    }

    public function track()
    {
        return $this->belongsTo(Track::class, 'track_id', 'track_id');
    }

    public function evaluations()
    {
        return $this->hasMany(Evaluation::class, 'student_id', 'student_id');
    }

    public function creditEvaluations()
    {
        return $this->hasMany(CreditEvaluation::class, 'student_id', 'student_id');
    }

    public function creditEvaluationDetails()
    {
        return $this->hasMany(CreditEvaluationDetail::class, 'student_id', 'student_id');
    }
}

