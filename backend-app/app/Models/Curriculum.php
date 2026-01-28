<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class Curriculum extends Model
{
    use HasFactory;

    protected $table = 'curriculum';
    protected $primaryKey = 'curriculum_id';
    public $timestamps = false;

    protected $fillable = [
        'curriculum_id',
        'curriculum_header_id',
        'program_id', // Keep for backward compatibility during migration
        'subject_id',
        'year_level',
        'semester_id',
        'passing_grade',
        'subject_type',
        'requisite_id',
    ];

    public function curriculumHeader()
    {
        return $this->belongsTo(CurriculumHeader::class, 'curriculum_header_id', 'curriculum_header_id');
    }

    public function program()
    {
        return $this->belongsTo(Program::class, 'program_id', 'program_id');
    }

    public function subject()
    {
        return $this->belongsTo(Subject::class, 'subject_id', 'subject_id');
    }

    public function yearLevel()
    {
        return $this->belongsTo(YearLevel::class, 'year_level', 'year_level_id');
    }

    public function semester()
    {
        return $this->belongsTo(Semester::class, 'semester_id', 'semester_id');
    }

    public function requisite()
    {
        return $this->belongsTo(Prerequisite::class, 'requisite_id', 'requisites_id');
    }
}

