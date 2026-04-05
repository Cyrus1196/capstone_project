<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class AcademicYear extends Model
{
    protected $table = 'tbl_academic_year';
    protected $primaryKey = 'academic_year_id';
    public $incrementing = true;
    public $timestamps = false;

    protected $fillable = [
        'academic_year_name',
        'status',
    ];

    // convenience accessor
    protected $appends = ['name'];

    public function getNameAttribute()
    {
        return $this->attributes['academic_year_name'] ?? null;
    }
}
