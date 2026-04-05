<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class OtherSchoolSubject extends Model
{
    use HasFactory;

    protected $table = 'tbl_other_school_subjects';
    protected $primaryKey = 'other_subject_id';
    public $timestamps = false;

    protected $fillable = [
        'school_id',
        'subject_code',
        'subject_name',
        'units',
        'hours',
        'description',
    ];

    public function school()
    {
        return $this->belongsTo(School::class, 'school_id', 'school_id');
    }

    public function creditEvaluationDetails()
    {
        return $this->hasMany(CreditEvaluationDetail::class, 'other_subject_id', 'other_subject_id');
    }

    public function subjectEquivalences()
    {
        return $this->hasMany(SubjectEquivalence::class, 'other_school_subject', 'other_subject_id');
    }
}

