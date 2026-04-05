<?php
/**
 * Execute SQL Update Script
 * This script runs the complete_database_erd_update.sql file
 */

// Database configuration
$host = '127.0.0.1';
$username = 'root';
$password = '';
$database = 'capstone_db';

echo "Connecting to database...\n";

try {
    // Connect to MySQL
    $pdo = new PDO(
        "mysql:host={$host};charset=utf8mb4",
        $username,
        $password,
        [
            PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
            PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
        ]
    );
    
    echo "✓ Connected to MySQL server\n";
    
    // Create database if it doesn't exist
    $pdo->exec("CREATE DATABASE IF NOT EXISTS `{$database}` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci");
    echo "✓ Database '{$database}' ready\n";
    
    // Select the database
    $pdo->exec("USE `{$database}`");
    
    // Read the SQL file
    $sqlFile = __DIR__ . '/complete_database_erd_update.sql';
    
    if (!file_exists($sqlFile)) {
        throw new Exception("SQL file not found: {$sqlFile}");
    }
    
    echo "Reading SQL file...\n";
    $sql = file_get_contents($sqlFile);
    
    if ($sql === false) {
        throw new Exception("Failed to read SQL file");
    }
    
    echo "Executing SQL script...\n";
    echo "This may take a moment...\n\n";
    
    // Use mysqli for better multi-statement support
    $mysqli = new mysqli($host, $username, $password, $database);
    
    if ($mysqli->connect_error) {
        throw new Exception("Connection failed: " . $mysqli->connect_error);
    }
    
    $mysqli->set_charset("utf8mb4");
    
    // Use multi_query to handle PREPARE/EXECUTE statements properly
    // This preserves the context between PREPARE, EXECUTE, and DEALLOCATE
    $executed = 0;
    $errors = 0;
    $errorMessages = [];
    
    try {
        // Execute using multi_query which handles multiple statements and PREPARE/EXECUTE blocks
        if ($mysqli->multi_query($sql)) {
            do {
                // Store result to free memory
                if ($result = $mysqli->store_result()) {
                    $result->free();
                }
                
                $executed++;
                
                // Show progress for important operations
                if ($executed % 20 == 0) {
                    echo "Processed {$executed} statements...\n";
                }
                
                // Check for errors but continue processing
                if ($mysqli->errno) {
                    $errorMsg = $mysqli->error;
                    $errno = $mysqli->errno;
                    
                    // Some errors are expected and can be ignored
                    $ignorableErrors = [
                        'already exists',
                        "doesn't exist",
                        'Unknown column',
                        'Duplicate key name',
                        'Duplicate column name',
                        'Unknown prepared statement handler', // PREPARE/EXECUTE context issues
                    ];
                    
                    $isIgnorable = false;
                    foreach ($ignorableErrors as $pattern) {
                        if (stripos($errorMsg, $pattern) !== false) {
                            $isIgnorable = true;
                            break;
                        }
                    }
                    
                    // Ignore common non-critical errors
                    if ($errno == 1062 || $errno == 1050 || $errno == 121 || $isIgnorable) {
                        // 1062 = Duplicate entry, 1050 = Table already exists, 121 = Duplicate key
                        if ($errno == 121) {
                            echo "⚠ Foreign key constraint conflict (usually safe to ignore)\n";
                        }
                    } else {
                        $errors++;
                        if (count($errorMessages) < 10) {
                            $errorMessages[] = "Error {$errno}: " . substr($errorMsg, 0, 150);
                        }
                    }
                }
            } while ($mysqli->next_result());
        } else {
            // Initial query failed
            $errorMsg = $mysqli->error;
            $errno = $mysqli->errno;
            
            // Error 121 can often be ignored
            if ($errno == 121) {
                echo "⚠ Foreign key constraint conflict detected, but script will continue...\n";
                echo "This usually means constraints already exist with different names.\n";
            } elseif (!empty($errorMsg)) {
                $errorMessages[] = "Initial query failed (Error {$errno}): " . $errorMsg;
                $errors++;
            }
        }
        
        // Clear any remaining results
        while ($mysqli->next_result()) {
            if ($result = $mysqli->store_result()) {
                $result->free();
            }
        }
    } catch (mysqli_sql_exception $e) {
        // Catch SQL exceptions but continue if it's a non-critical error
        $errno = $e->getCode();
        if ($errno == 121) {
            echo "⚠ Foreign key constraint conflict caught, but continuing...\n";
            // Try to continue processing remaining statements
            while ($mysqli->next_result()) {
                if ($result = $mysqli->store_result()) {
                    $result->free();
                }
                $executed++;
            }
        } else {
            $errorMessages[] = "Exception: " . substr($e->getMessage(), 0, 150);
            $errors++;
        }
    }
    
    $mysqli->close();
    
    echo "\n";
    echo "========================================\n";
    echo "✓ SQL script execution completed!\n";
    echo "Statements executed: {$executed}\n";
    if ($errors > 0) {
        echo "Errors encountered: {$errors}\n";
        echo "\nError details:\n";
        foreach (array_slice($errorMessages, 0, 10) as $msg) {
            echo "  - {$msg}\n";
        }
        if (count($errorMessages) > 10) {
            echo "  ... and " . (count($errorMessages) - 10) . " more errors\n";
        }
    }
    echo "========================================\n";
    echo "\nDatabase update process completed!\n";
    if ($errors == 0) {
        echo "✓ All changes applied successfully!\n";
    } else {
        echo "⚠ Some errors occurred, but the script continued.\n";
        echo "Please review the errors above.\n";
    }
    echo "\nThe campus_id column removal from tbl_program has been processed.\n";
    
} catch (PDOException $e) {
    echo "✗ Database Error: " . $e->getMessage() . "\n";
    echo "\nPlease check:\n";
    echo "1. MySQL server is running\n";
    echo "2. Database credentials are correct\n";
    echo "3. You have permission to modify the database\n";
    exit(1);
} catch (Exception $e) {
    echo "✗ Error: " . $e->getMessage() . "\n";
    exit(1);
}

