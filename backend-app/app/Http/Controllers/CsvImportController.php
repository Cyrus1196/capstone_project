<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use Illuminate\Support\Facades\Validator;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;

class CsvImportController extends Controller
{
    /**
     * Available import types and their configurations
     */
    private $importTypes = [
        'users' => [
            'label' => 'Users',
            'table' => 'tbl_users',
            'required_columns' => ['email', 'password'],
            'optional_columns' => ['role_id', 'contact_number', 'status'],
            'validation_rules' => [
                'email' => 'required|email|unique:tbl_users,email',
                'password' => 'required|min:6',
                'role_id' => 'nullable|exists:tbl_roles,role_id',
                'status' => 'nullable|in:active,inactive',
            ],
        ],
        'subjects' => [
            'label' => 'Subjects',
            'table' => 'tbl_subjects',
            'required_columns' => ['subject_code', 'subject_name'],
            'optional_columns' => ['number_of_units', 'number_of_hrs'],
            'validation_rules' => [
                'subject_code' => 'required|string|max:50|unique:tbl_subjects,subject_code',
                'subject_name' => 'required|string|max:100',
                'number_of_units' => 'nullable|integer|min:1',
                'number_of_hrs' => 'nullable|integer|min:1',
            ],
        ],
        'departments' => [
            'label' => 'Departments',
            'table' => 'tbl_departments',
            'required_columns' => ['department_name'],
            'optional_columns' => ['department_code', 'campus_id'],
            'validation_rules' => [
                'department_name' => 'required|string|max:100',
                'department_code' => 'nullable|string|max:50',
                'campus_id' => 'nullable|exists:tbl_campus,campus_id',
            ],
        ],
        'programs' => [
            'label' => 'Programs',
            'table' => 'tbl_program',
            'required_columns' => ['department_id', 'program_name'],
            'optional_columns' => ['program_code', 'total_units_required'],
            'validation_rules' => [
                'department_id' => 'required|exists:tbl_departments,department_id',
                'program_name' => 'required|string|max:100',
                'program_code' => 'nullable|string|max:50',
                'total_units_required' => 'nullable|integer|min:1',
            ],
        ],
        'students' => [
            'label' => 'Students',
            'table' => 'tbl_student_profile',
            'required_columns' => ['user_id', 'student_id_number', 'first_name', 'last_name'],
            'optional_columns' => ['program_id', 'year_level_id', 'contact_number', 'address', 'gender', 'academic_status'],
            'validation_rules' => [
                'user_id' => 'required|exists:tbl_users,user_id',
                'student_id_number' => 'required|string|max:50|unique:tbl_student_profile,student_id_number',
                'first_name' => 'required|string|max:100',
                'last_name' => 'required|string|max:100',
                'program_id' => 'nullable|exists:tbl_program,program_id',
                'year_level_id' => 'nullable|exists:year_level,year_level_id',
            ],
        ],
    ];

    /**
     * Get available import types
     */
    public function getImportTypes(Request $request)
    {
        try {
            if (! $request->user()?->canUseCsvImport()) {
                return response()->json(['message' => 'Unauthorized'], 403);
            }

            $types = [];
            foreach ($this->importTypes as $key => $config) {
                $types[] = [
                    'key' => $key,
                    'label' => $config['label'],
                    'required_columns' => $config['required_columns'],
                    'optional_columns' => $config['optional_columns'],
                ];
            }

            return response()->json($types);
        } catch (\Exception $e) {
            return response()->json([
                'error' => 'Failed to get import types',
                'message' => $e->getMessage()
            ], 500);
        }
    }

    /**
     * Preview CSV data before import
     */
    public function preview(Request $request)
    {
        try {
            if (! $request->user()?->canUseCsvImport()) {
                return response()->json(['message' => 'Unauthorized'], 403);
            }

            $validated = $request->validate([
                'import_type' => 'required|string|in:' . implode(',', array_keys($this->importTypes)),
                'csv_file' => 'required|file|mimes:csv,txt|max:2048',
            ]);

            $importType = $this->importTypes[$validated['import_type']];
            $file = $request->file('csv_file');
            
            // Parse CSV
            $data = $this->parseCsv($file);
            
            if (empty($data)) {
                return response()->json([
                    'error' => 'CSV file is empty or invalid'
                ], 400);
            }

            $headers = array_keys($data[0]);
            $requiredColumns = $importType['required_columns'];
            
            // Check for required columns
            $missingColumns = array_diff($requiredColumns, $headers);
            if (!empty($missingColumns)) {
                return response()->json([
                    'error' => 'Missing required columns',
                    'missing_columns' => array_values($missingColumns),
                    'required_columns' => $requiredColumns,
                    'found_columns' => $headers,
                ], 400);
            }

            // Validate first 5 rows for preview
            $preview = [];
            $validationErrors = [];
            
            foreach (array_slice($data, 0, 5) as $index => $row) {
                $rowValidation = $this->validateRow($row, $importType['validation_rules'], $index + 1);
                $preview[] = [
                    'row_number' => $index + 1,
                    'data' => $row,
                    'valid' => $rowValidation['valid'],
                    'errors' => $rowValidation['errors'],
                ];
                
                if (!$rowValidation['valid']) {
                    $validationErrors[] = $rowValidation['errors'];
                }
            }

            return response()->json([
                'total_rows' => count($data),
                'headers' => $headers,
                'required_columns' => $requiredColumns,
                'optional_columns' => $importType['optional_columns'],
                'preview' => $preview,
                'has_errors' => !empty($validationErrors),
            ]);
        } catch (\Exception $e) {
            Log::error('CSV Preview Error: ' . $e->getMessage());
            return response()->json([
                'error' => 'Failed to preview CSV',
                'message' => $e->getMessage()
            ], 500);
        }
    }

    /**
     * Import CSV data
     */
    public function import(Request $request)
    {
        try {
            if (! $request->user()?->canUseCsvImport()) {
                return response()->json(['message' => 'Unauthorized'], 403);
            }

            $validated = $request->validate([
                'import_type' => 'required|string|in:' . implode(',', array_keys($this->importTypes)),
                'csv_file' => 'required|file|mimes:csv,txt|max:2048',
            ]);

            $importType = $this->importTypes[$validated['import_type']];
            $file = $request->file('csv_file');
            
            // Parse CSV
            $data = $this->parseCsv($file);
            
            if (empty($data)) {
                return response()->json([
                    'error' => 'CSV file is empty or invalid'
                ], 400);
            }

            $results = [
                'total' => count($data),
                'imported' => 0,
                'failed' => 0,
                'errors' => [],
            ];

            DB::beginTransaction();

            foreach ($data as $index => $row) {
                $rowNumber = $index + 1;
                
                // Validate row
                $validation = $this->validateRow($row, $importType['validation_rules'], $rowNumber);
                if (!$validation['valid']) {
                    $results['failed']++;
                    $results['errors'][] = [
                        'row' => $rowNumber,
                        'errors' => $validation['errors'],
                    ];
                    continue;
                }

                // Transform and insert data
                try {
                    $insertData = $this->transformData($row, $validated['import_type']);
                    DB::table($importType['table'])->insert($insertData);
                    $results['imported']++;
                } catch (\Exception $e) {
                    $results['failed']++;
                    $results['errors'][] = [
                        'row' => $rowNumber,
                        'errors' => ['Insert failed: ' . $e->getMessage()],
                    ];
                }
            }

            if ($results['imported'] === 0) {
                DB::rollBack();
                return response()->json([
                    'error' => 'No records were imported',
                    'results' => $results,
                ], 400);
            }

            DB::commit();

            Log::info("CSV Import: {$results['imported']} {$validated['import_type']} imported by user {$request->user()->user_id}");

            return response()->json([
                'message' => 'Import completed',
                'results' => $results,
            ]);
        } catch (\Exception $e) {
            DB::rollBack();
            Log::error('CSV Import Error: ' . $e->getMessage());
            return response()->json([
                'error' => 'Import failed',
                'message' => $e->getMessage()
            ], 500);
        }
    }

    /**
     * Download sample CSV template
     */
    public function downloadTemplate(Request $request, $importType)
    {
        try {
            if (! $request->user()?->canUseCsvImport()) {
                return response()->json(['message' => 'Unauthorized'], 403);
            }

            if (!isset($this->importTypes[$importType])) {
                return response()->json(['error' => 'Invalid import type'], 400);
            }

            $config = $this->importTypes[$importType];
            $headers = array_merge($config['required_columns'], $config['optional_columns']);
            
            // Create sample data
            $sampleData = [];
            
            switch ($importType) {
                case 'users':
                    $sampleData = [
                        ['john@example.com', 'password123', '2', 'active'],
                        ['jane@example.com', 'password123', '3', 'active'],
                    ];
                    break;
                case 'subjects':
                    $sampleData = [
                        ['ITE 101', 'Introduction to Programming', '3', '3'],
                        ['ITE 102', 'Data Structures', '3', '3'],
                    ];
                    break;
                case 'departments':
                    $sampleData = [
                        ['Information Technology', 'IT', '1'],
                        ['Computer Science', 'CS', '1'],
                    ];
                    break;
                case 'programs':
                    $sampleData = [
                        ['1', 'BSIT', 'Bachelor of Science in Information Technology', '150'],
                        ['1', 'BSCS', 'Bachelor of Science in Computer Science', '150'],
                    ];
                    break;
                case 'students':
                    $sampleData = [
                        ['5', '2024-0001', 'Juan', 'Dela Cruz', '1', '1', '09123456789', 'Manila', 'Male', 'active'],
                        ['6', '2024-0002', 'Maria', 'Santos', '1', '1', '09987654321', 'Quezon City', 'Female', 'active'],
                    ];
                    break;
            }

            // Generate CSV content
            $csvContent = implode(',', $headers) . "\n";
            foreach ($sampleData as $row) {
                $csvContent .= implode(',', $row) . "\n";
            }

            $filename = "{$importType}_template.csv";
            
            return response($csvContent)
                ->header('Content-Type', 'text/csv')
                ->header('Content-Disposition', "attachment; filename=\"{$filename}\"");
        } catch (\Exception $e) {
            return response()->json([
                'error' => 'Failed to generate template',
                'message' => $e->getMessage()
            ], 500);
        }
    }

    /**
     * Parse CSV file into array
     */
    private function parseCsv($file): array
    {
        $data = [];
        $handle = fopen($file->getPathname(), 'r');
        
        if (!$handle) {
            throw new \Exception('Could not open CSV file');
        }

        // Get headers
        $headers = fgetcsv($handle);
        if (!$headers) {
            fclose($handle);
            return [];
        }

        // Trim headers
        $headers = array_map('trim', $headers);

        // Read data rows
        while (($row = fgetcsv($handle)) !== false) {
            if (count($row) !== count($headers)) {
                continue; // Skip malformed rows
            }
            
            $data[] = array_combine($headers, $row);
        }

        fclose($handle);
        return $data;
    }

    /**
     * Validate a single row
     */
    private function validateRow(array $row, array $rules, int $rowNumber): array
    {
        $validator = Validator::make($row, $rules);
        
        if ($validator->fails()) {
            return [
                'valid' => false,
                'errors' => $validator->errors()->all(),
            ];
        }

        return [
            'valid' => true,
            'errors' => [],
        ];
    }

    /**
     * Transform data before insertion
     */
    private function transformData(array $row, string $importType): array
    {
        $data = [];

        switch ($importType) {
            case 'users':
                $data = [
                    'email' => $row['email'],
                    'password' => bcrypt($row['password']),
                    'role_id' => $row['role_id'] ?? 5, // Default to Student
                    'contact_number' => $row['contact_number'] ?? null,
                    'status' => $row['status'] ?? 'active',
                ];
                break;

            case 'subjects':
                $data = [
                    'subject_code' => $row['subject_code'],
                    'subject_name' => $row['subject_name'],
                    'number_of_units' => $row['number_of_units'] ?? null,
                    'number_of_hrs' => $row['number_of_hrs'] ?? null,
                ];
                break;

            case 'departments':
                $data = [
                    'department_name' => $row['department_name'],
                    'department_code' => $row['department_code'] ?? null,
                    'campus_id' => $row['campus_id'] ?? 1, // Default campus
                ];
                break;

            case 'programs':
                // Get campus_id from department
                $department = DB::table('tbl_departments')
                    ->where('department_id', $row['department_id'])
                    ->first();
                
                $data = [
                    'department_id' => $row['department_id'],
                    'campus_id' => $department->campus_id ?? 1,
                    'program_code' => $row['program_code'] ?? null,
                    'program_name' => $row['program_name'],
                    'total_units_required' => $row['total_units_required'] ?? null,
                ];
                break;

            case 'students':
                $data = [
                    'user_id' => $row['user_id'],
                    'student_id_number' => $row['student_id_number'],
                    'first_name' => $row['first_name'],
                    'last_name' => $row['last_name'],
                    'program_id' => $row['program_id'] ?? null,
                    'year_level_id' => $row['year_level_id'] ?? null,
                    'contact_number' => $row['contact_number'] ?? null,
                    'address' => $row['address'] ?? null,
                    'gender' => $row['gender'] ?? null,
                    'academic_status' => $row['academic_status'] ?? 'active',
                ];
                break;
        }

        return $data;
    }
}
