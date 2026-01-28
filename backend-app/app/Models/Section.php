<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class Section extends Model
{
    // Table name in the legacy database
    protected $table = 'tbl_section';
    protected $primaryKey = 'section_id';
    public $incrementing = true;
    public $timestamps = false;

    protected $fillable = [
        'section_name',
    ];

    // Provide a convenient `name` attribute to match frontend expectations
    protected $appends = ['name'];

    public function getNameAttribute()
    {
        return $this->attributes['section_name'] ?? null;
    }
}
