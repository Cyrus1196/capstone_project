-- Quick fix for tbl_elective_subject track_id column
-- This script checks and fixes the track_id column to be nullable

-- Check current state
SELECT 
    COLUMN_NAME, 
    IS_NULLABLE, 
    COLUMN_TYPE 
FROM INFORMATION_SCHEMA.COLUMNS 
WHERE TABLE_SCHEMA = DATABASE()
  AND TABLE_NAME = 'tbl_elective_subject'
  AND COLUMN_NAME = 'track_id';

-- Drop foreign key if exists (get the constraint name first)
SET @constraint_name = (
    SELECT CONSTRAINT_NAME 
    FROM INFORMATION_SCHEMA.KEY_COLUMN_USAGE 
    WHERE TABLE_SCHEMA = DATABASE()
      AND TABLE_NAME = 'tbl_elective_subject'
      AND COLUMN_NAME = 'track_id'
      AND REFERENCED_TABLE_NAME IS NOT NULL
    LIMIT 1
);

-- Drop the foreign key
SET @sql = IF(@constraint_name IS NOT NULL, 
    CONCAT('ALTER TABLE tbl_elective_subject DROP FOREIGN KEY ', @constraint_name),
    'SELECT "No foreign key to drop" as message'
);
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- Make track_id nullable
ALTER TABLE tbl_elective_subject MODIFY COLUMN track_id INT NULL;

-- Re-add foreign key (nullable foreign keys are allowed in MySQL)
ALTER TABLE tbl_elective_subject 
ADD CONSTRAINT fk_elective_subject_track 
FOREIGN KEY (track_id) REFERENCES tbl_track(track_id) ON DELETE CASCADE;

-- Verify the change
SELECT 
    COLUMN_NAME, 
    IS_NULLABLE, 
    COLUMN_TYPE 
FROM INFORMATION_SCHEMA.COLUMNS 
WHERE TABLE_SCHEMA = DATABASE()
  AND TABLE_NAME = 'tbl_elective_subject'
  AND COLUMN_NAME = 'track_id';

