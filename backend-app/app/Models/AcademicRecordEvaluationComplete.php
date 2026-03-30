<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class AcademicRecordEvaluationComplete extends Model
{
    protected $table = 'tbl_academic_record_evaluation_complete';

    protected $primaryKey = 'academic_record_complete_id';

    public $timestamps = false;

    protected $fillable = [
        'student_id',
        'completed_at',
        'completed_by',
        'notes',
    ];

    protected function casts(): array
    {
        return [
            'completed_at' => 'datetime',
        ];
    }

    public function student(): BelongsTo
    {
        return $this->belongsTo(StudentProfile::class, 'student_id', 'student_id');
    }

    public function completedByUser(): BelongsTo
    {
        return $this->belongsTo(TblUser::class, 'completed_by', 'user_id');
    }
}
