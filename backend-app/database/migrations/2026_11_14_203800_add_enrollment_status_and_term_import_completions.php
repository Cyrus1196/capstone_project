<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        if (Schema::hasTable('tbl_student_profile')
            && ! Schema::hasColumn('tbl_student_profile', 'enrollment_status')
        ) {
            Schema::table('tbl_student_profile', function (Blueprint $table) {
                $table->string('enrollment_status', 64)->nullable()->after('academic_status');
            });
        }

        if (! Schema::hasTable('term_import_completions')) {
            Schema::create('term_import_completions', function (Blueprint $table) {
                $table->id();
                $table->unsignedInteger('academic_year_id');
                $table->unsignedInteger('semester_id');
                // 0 = whole school (avoids MySQL NULL unique quirks).
                $table->unsignedInteger('campus_id')->default(0);
                $table->unsignedBigInteger('completed_by')->nullable();
                $table->timestamp('completed_at')->nullable();
                $table->text('notes')->nullable();
                $table->timestamps();

                $table->unique(
                    ['academic_year_id', 'semester_id', 'campus_id'],
                    'term_import_completions_ay_sem_campus_unique'
                );
                $table->index(['academic_year_id', 'semester_id'], 'term_import_completions_ay_sem_idx');
            });
        }
    }

    public function down(): void
    {
        Schema::dropIfExists('term_import_completions');

        if (Schema::hasTable('tbl_student_profile')
            && Schema::hasColumn('tbl_student_profile', 'enrollment_status')
        ) {
            Schema::table('tbl_student_profile', function (Blueprint $table) {
                $table->dropColumn('enrollment_status');
            });
        }
    }
};
