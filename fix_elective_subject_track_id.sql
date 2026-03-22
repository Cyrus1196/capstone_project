-- Fix track_id to be nullable in tbl_elective_subject
-- This allows subjects to be assigned to elective slots without requiring a track

-- First, drop the foreign key constraint if it exists
SET @fk_name = (
    SELECT CONSTRAINT_NAME 
    FROM INFORMATION_SCHEMA.KEY_COLUMN_USAGE 
    WHERE TABLE_SCHEMA = DATABASE()
      AND TABLE_NAME = 'tbl_elective_subject'
      AND COLUMN_NAME = 'track_id'
      AND REFERENCED_TABLE_NAME IS NOT NULL
    LIMIT 1
);

SET @drop_fk = IF(@fk_name IS NOT NULL, 
    CONCAT('ALTER TABLE tbl_elective_subject DROP FOREIGN KEY ', @fk_name),
    'SELECT 1'
);

PREPARE stmt FROM @drop_fk;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- Make track_id nullable
ALTER TABLE tbl_elective_subject MODIFY COLUMN track_id INT NULL;

-- Re-add the foreign key constraint (nullable foreign keys are allowed)
ALTER TABLE tbl_elective_subject 
ADD CONSTRAINT fk_elective_subject_track 
FOREIGN KEY (track_id) REFERENCES tbl_track(track_id) ON DELETE CASCADE;

