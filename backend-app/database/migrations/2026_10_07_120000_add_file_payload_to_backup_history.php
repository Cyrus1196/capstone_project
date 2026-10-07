<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        if (! Schema::hasTable('tbl_backup_history')) {
            return;
        }

        Schema::table('tbl_backup_history', function (Blueprint $table) {
            if (! Schema::hasColumn('tbl_backup_history', 'file_payload')) {
                $table->longBinary('file_payload')->nullable()->after('file_size');
            }
        });
    }

    public function down(): void
    {
        if (! Schema::hasTable('tbl_backup_history')) {
            return;
        }

        Schema::table('tbl_backup_history', function (Blueprint $table) {
            if (Schema::hasColumn('tbl_backup_history', 'file_payload')) {
                $table->dropColumn('file_payload');
            }
        });
    }
};
