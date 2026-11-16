<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        if (! Schema::hasTable('jobs')) {
            Schema::create('jobs', function (Blueprint $table) {
                $table->id();
                $table->string('queue')->index();
                $table->longText('payload');
                $table->unsignedTinyInteger('attempts');
                $table->unsignedInteger('reserved_at')->nullable();
                $table->unsignedInteger('available_at');
                $table->unsignedInteger('created_at');
            });
        }

        if (! Schema::hasTable('job_batches')) {
            Schema::create('job_batches', function (Blueprint $table) {
                $table->string('id')->primary();
                $table->string('name');
                $table->integer('total_jobs');
                $table->integer('pending_jobs');
                $table->integer('failed_jobs');
                $table->longText('failed_job_ids');
                $table->mediumText('options')->nullable();
                $table->integer('cancelled_at')->nullable();
                $table->integer('created_at');
                $table->integer('finished_at')->nullable();
            });
        }

        if (! Schema::hasTable('failed_jobs')) {
            Schema::create('failed_jobs', function (Blueprint $table) {
                $table->id();
                $table->string('uuid')->unique();
                $table->text('connection');
                $table->text('queue');
                $table->longText('payload');
                $table->longText('exception');
                $table->timestamp('failed_at')->useCurrent();
            });
        }

        if (! Schema::hasTable('csv_import_jobs')) {
            Schema::create('csv_import_jobs', function (Blueprint $table) {
                $table->id();
                $table->uuid('public_id')->unique();
                $table->unsignedBigInteger('user_id')->nullable()->index();
                $table->string('import_type', 64);
                $table->string('original_filename')->nullable();
                $table->string('stored_path');
                $table->unsignedInteger('academic_year_id')->nullable();
                $table->unsignedInteger('semester_id')->nullable();
                $table->mediumText('row_fixes')->nullable();
                $table->mediumText('skip_rows')->nullable();
                $table->string('status', 32)->default('pending')->index();
                $table->string('phase', 32)->nullable();
                $table->unsignedInteger('total_rows')->default(0);
                $table->unsignedInteger('processed_rows')->default(0);
                $table->unsignedInteger('imported')->default(0);
                $table->unsignedInteger('failed')->default(0);
                $table->unsignedInteger('skipped')->default(0);
                $table->json('errors')->nullable();
                $table->text('message')->nullable();
                $table->timestamp('started_at')->nullable();
                $table->timestamp('finished_at')->nullable();
                $table->timestamps();
            });
        }
    }

    public function down(): void
    {
        Schema::dropIfExists('csv_import_jobs');
        // Leave Laravel queue tables in place — other features may rely on them.
    }
};
