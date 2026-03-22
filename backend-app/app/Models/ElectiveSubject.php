<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class ElectiveSubject extends Model
{
    use HasFactory;

    protected $table = 'tbl_elective_subject';
    protected $primaryKey = 'elective_subject_id';
    public $timestamps = false;

    protected $fillable = [
        'track_id',
        'elective_slot_id',
        'subject_id',
        'description',
    ];

    public function track()
    {
        return $this->belongsTo(Track::class, 'track_id', 'track_id');
    }

    public function electiveSlot()
    {
        return $this->belongsTo(ElectiveSlot::class, 'elective_slot_id', 'elective_slot_id');
    }

    public function subject()
    {
        return $this->belongsTo(Subject::class, 'subject_id', 'subject_id');
    }
}

