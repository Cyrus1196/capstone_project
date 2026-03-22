<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class School extends Model
{
    use HasFactory;

    protected $table = 'tbl_schools';
    protected $primaryKey = 'school_id';
    public $timestamps = false;

    protected $fillable = [
        'school_name',
        'school_program',
        'school_curriculum',
    ];

    public function creditEvaluations()
    {
        return $this->hasMany(CreditEvaluation::class, 'school_id', 'school_id');
    }

    public function otherSchoolSubjects()
    {
        return $this->hasMany(OtherSchoolSubject::class, 'school_id', 'school_id');
    }
}

