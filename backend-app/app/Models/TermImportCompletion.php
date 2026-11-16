<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class TermImportCompletion extends Model
{
    protected $table = 'term_import_completions';

    protected $fillable = [
        'academic_year_id',
        'semester_id',
        'campus_id',
        'completed_by',
        'completed_at',
        'notes',
    ];

    protected $casts = [
        'academic_year_id' => 'integer',
        'semester_id' => 'integer',
        'campus_id' => 'integer',
        'completed_by' => 'integer',
        'completed_at' => 'datetime',
    ];

    public function academicYear(): BelongsTo
    {
        return $this->belongsTo(AcademicYear::class, 'academic_year_id', 'academic_year_id');
    }

    public function semester(): BelongsTo
    {
        return $this->belongsTo(Semester::class, 'semester_id', 'semester_id');
    }

    public function campus(): BelongsTo
    {
        return $this->belongsTo(Campus::class, 'campus_id', 'campus_id');
    }

    public function completedByUser(): BelongsTo
    {
        return $this->belongsTo(TblUser::class, 'completed_by', 'user_id');
    }
}
