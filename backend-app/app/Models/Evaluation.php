<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class Evaluation extends Model
{
    use HasFactory;

    protected $table = 'tbl_evaluation';
    protected $primaryKey = 'evaluation_id';
    public $timestamps = false;

    protected $fillable = [
        'student_id',
        'subject_id',
        'academic_year_id',
        'semester_id',
        'grade',
        'evaluation_status',
        'enrolled_date',
    ];

    protected $casts = [
        'enrolled_date' => 'date',
    ];

    public function student()
    {
        return $this->belongsTo(StudentProfile::class, 'student_id', 'student_id');
    }

    public function subject()
    {
        return $this->belongsTo(Subject::class, 'subject_id', 'subject_id');
    }

    public function academicYear()
    {
        return $this->belongsTo(AcademicYear::class, 'academic_year_id', 'academic_year_id');
    }

    public function semester()
    {
        return $this->belongsTo(Semester::class, 'semester_id', 'semester_id');
    }

    public function section()
    {
        return $this->belongsTo(Section::class, 'section_id', 'section_id');
    }

    public function getIsPassedAttribute()
    {
        if ($this->evaluation_status && in_array(strtolower($this->evaluation_status), ['passed', 'pass', 'credit'])) {
            return true;
        }

        if ($this->grade !== null && is_numeric($this->grade)) {
            return $this->grade >= 75; // Default passing grade
        }

        return false;
    }
}

