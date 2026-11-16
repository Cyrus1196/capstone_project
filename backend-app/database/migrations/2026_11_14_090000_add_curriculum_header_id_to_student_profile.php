<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        if (! Schema::hasTable('tbl_student_profile')) {
            return;
        }

        if (! Schema::hasColumn('tbl_student_profile', 'curriculum_header_id')) {
            Schema::table('tbl_student_profile', function (Blueprint $table) {
                $table->integer('curriculum_header_id')->nullable()->after('Current_Program');
            });
        }
    }

    public function down(): void
    {
        if (Schema::hasTable('tbl_student_profile') && Schema::hasColumn('tbl_student_profile', 'curriculum_header_id')) {
            Schema::table('tbl_student_profile', function (Blueprint $table) {
                $table->dropColumn('curriculum_header_id');
            });
        }
    }
};
