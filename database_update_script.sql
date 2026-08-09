-- Database Update Script for New ERD
-- Run this script to update your database with the new ERD structure

-- ============================================
-- 1. Create Schools Table
-- ============================================
CREATE TABLE IF NOT EXISTS `tbl_schools` (
  `school_id` int(11) NOT NULL AUTO_INCREMENT,
  `school_name` varchar(255) NOT NULL,
  `school_program` text DEFAULT NULL,
  `school_curriculum` text DEFAULT NULL,
  PRIMARY KEY (`school_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================
-- 2. Create Other School Subjects Table
-- ============================================
CREATE TABLE IF NOT EXISTS `tbl_other_school_subjects` (
  `other_subject_id` int(11) NOT NULL AUTO_INCREMENT,
  `school_id` int(11) NOT NULL,
  `subject_code` varchar(50) NOT NULL,
  `subject_name` varchar(100) NOT NULL,
  `units` int(11) DEFAULT NULL,
  `hours` int(11) DEFAULT NULL,
  `description` text DEFAULT NULL,
  PRIMARY KEY (`other_subject_id`),
  KEY `fk_other_school` (`school_id`),
  CONSTRAINT `fk_other_school` FOREIGN KEY (`school_id`) REFERENCES `tbl_schools` (`school_id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================
-- 3. Create Subject Equivalence Table
-- ============================================
CREATE TABLE IF NOT EXISTS `tbl_subject_equivalence` (
  `equivalence_id` int(11) NOT NULL AUTO_INCREMENT,
  `other_school_subject` int(11) NOT NULL,
  `subject_id` int(11) NOT NULL,
  `credited_units` int(11) DEFAULT NULL,
  `credit_basis` varchar(50) DEFAULT NULL,
  `status` varchar(50) DEFAULT 'active',
  `remarks` text DEFAULT NULL,
  PRIMARY KEY (`equivalence_id`),
  KEY `fk_equiv_other_subject` (`other_school_subject`),
  KEY `fk_equiv_subject` (`subject_id`),
  CONSTRAINT `fk_equiv_other_subject` FOREIGN KEY (`other_school_subject`) REFERENCES `tbl_other_school_subjects` (`other_subject_id`) ON DELETE CASCADE,
  CONSTRAINT `fk_equiv_subject` FOREIGN KEY (`subject_id`) REFERENCES `tbl_subjects` (`subject_id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================
-- 4. Create Credit Evaluation Table
-- ============================================
CREATE TABLE IF NOT EXISTS `tbl_credit_evaluation` (
  `credit_eval_id` int(11) NOT NULL AUTO_INCREMENT,
  `student_id` int(11) NOT NULL,
  `school_id` int(11) NOT NULL,
  `credit_type` varchar(50) NOT NULL,
  `evaluated_by` int(11) NOT NULL,
  `evaluation_date` date NOT NULL,
  `status` varchar(50) DEFAULT 'pending',
  `remarks` text DEFAULT NULL,
  PRIMARY KEY (`credit_eval_id`),
  KEY `fk_credit_eval_student` (`student_id`),
  KEY `fk_credit_eval_school` (`school_id`),
  KEY `fk_credit_eval_user` (`evaluated_by`),
  CONSTRAINT `fk_credit_eval_student` FOREIGN KEY (`student_id`) REFERENCES `tbl_student_profile` (`student_id`) ON DELETE CASCADE,
  CONSTRAINT `fk_credit_eval_school` FOREIGN KEY (`school_id`) REFERENCES `tbl_schools` (`school_id`) ON DELETE CASCADE,
  CONSTRAINT `fk_credit_eval_user` FOREIGN KEY (`evaluated_by`) REFERENCES `tbl_users` (`user_id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================
-- 5. Create Credit Evaluation Details Table
-- ============================================
CREATE TABLE IF NOT EXISTS `tbl_credit_evaluation_details` (
  `credit_detail_id` int(11) NOT NULL AUTO_INCREMENT,
  `student_id` int(11) NOT NULL,
  `other_subject_id` int(11) NOT NULL,
  `subject_id` int(11) NOT NULL,
  `credited_units` int(11) DEFAULT NULL,
  `credit_basis` varchar(50) DEFAULT NULL,
  `remarks` text DEFAULT NULL,
  PRIMARY KEY (`credit_detail_id`),
  KEY `fk_credit_detail_student` (`student_id`),
  KEY `fk_credit_detail_other_subject` (`other_subject_id`),
  KEY `fk_credit_detail_subject` (`subject_id`),
  CONSTRAINT `fk_credit_detail_student` FOREIGN KEY (`student_id`) REFERENCES `tbl_student_profile` (`student_id`) ON DELETE CASCADE,
  CONSTRAINT `fk_credit_detail_other_subject` FOREIGN KEY (`other_subject_id`) REFERENCES `tbl_other_school_subjects` (`other_subject_id`) ON DELETE CASCADE,
  CONSTRAINT `fk_credit_detail_subject` FOREIGN KEY (`subject_id`) REFERENCES `tbl_subjects` (`subject_id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================
-- 6. Create Permission Table
-- ============================================
CREATE TABLE IF NOT EXISTS `tbl_permission` (
  `permission_id` int(11) NOT NULL AUTO_INCREMENT,
  `permission_name` varchar(100) NOT NULL,
  `description` text DEFAULT NULL,
  PRIMARY KEY (`permission_id`),
  UNIQUE KEY `unique_permission_name` (`permission_name`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================
-- 7. Create Role Permissions Table
-- ============================================
CREATE TABLE IF NOT EXISTS `tbl_role_permissions` (
  `role_permission_id` int(11) NOT NULL AUTO_INCREMENT,
  `role_id` int(11) NOT NULL,
  `permission_id` int(11) NOT NULL,
  PRIMARY KEY (`role_permission_id`),
  UNIQUE KEY `unique_role_permission` (`role_id`, `permission_id`),
  KEY `fk_role_perm_role` (`role_id`),
  KEY `fk_role_perm_permission` (`permission_id`),
  CONSTRAINT `fk_role_perm_role` FOREIGN KEY (`role_id`) REFERENCES `tbl_roles` (`role_id`) ON DELETE CASCADE,
  CONSTRAINT `fk_role_perm_permission` FOREIGN KEY (`permission_id`) REFERENCES `tbl_permission` (`permission_id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================
-- 8. Create Audit Logs Table
-- ============================================
CREATE TABLE IF NOT EXISTS `audit_logs` (
  `audit_logs_id` int(11) NOT NULL AUTO_INCREMENT,
  `user_id` int(11) NOT NULL,
  `actions` varchar(255) NOT NULL,
  `table_name` varchar(100) NOT NULL,
  `record_id` int(11) DEFAULT NULL,
  `old_value` text DEFAULT NULL,
  `new_value` text DEFAULT NULL,
  `action_timestamp` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`audit_logs_id`),
  KEY `fk_audit_user` (`user_id`),
  KEY `idx_table_record` (`table_name`, `record_id`),
  KEY `idx_timestamp` (`action_timestamp`),
  CONSTRAINT `fk_audit_user` FOREIGN KEY (`user_id`) REFERENCES `tbl_users` (`user_id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================
-- 9. Create Elective Slot Table (if needed)
-- ============================================
CREATE TABLE IF NOT EXISTS `tbl_elective_slot` (
  `elective_slot_id` int(11) NOT NULL AUTO_INCREMENT,
  `program_id` int(11) NOT NULL,
  `semester_id` int(11) NOT NULL,
  `year_level_id` int(11) NOT NULL,
  `slot_name` varchar(100) NOT NULL,
  `status` varchar(50) DEFAULT 'active',
  PRIMARY KEY (`elective_slot_id`),
  KEY `fk_elective_slot_program` (`program_id`),
  KEY `fk_elective_slot_semester` (`semester_id`),
  KEY `fk_elective_slot_year` (`year_level_id`),
  CONSTRAINT `fk_elective_slot_program` FOREIGN KEY (`program_id`) REFERENCES `tbl_program` (`program_id`) ON DELETE CASCADE,
  CONSTRAINT `fk_elective_slot_semester` FOREIGN KEY (`semester_id`) REFERENCES `tbl_semester` (`semester_id`) ON DELETE CASCADE,
  CONSTRAINT `fk_elective_slot_year` FOREIGN KEY (`year_level_id`) REFERENCES `year_level` (`year_level_id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================
-- 10. Make track_id nullable in tbl_elective_subject
-- ============================================
SET @preparedStatement = (SELECT IF(
  (
    SELECT IS_NULLABLE FROM INFORMATION_SCHEMA.COLUMNS
    WHERE TABLE_SCHEMA = DATABASE()
      AND TABLE_NAME = 'tbl_elective_subject'
      AND COLUMN_NAME = 'track_id'
      AND IS_NULLABLE = 'NO'
  ) > 0,
  'SELECT 1',
  'ALTER TABLE tbl_elective_subject MODIFY COLUMN track_id int(11) NULL'
));
PREPARE alterIfNotExists FROM @preparedStatement;
EXECUTE alterIfNotExists;
DEALLOCATE PREPARE alterIfNotExists;

-- ============================================
-- 11. Update tbl_elective_subject to include elective_slot_id if needed
-- ============================================
-- Check if elective_slot_id column exists, if not add it
SET @preparedStatement = (SELECT IF(
  (
    SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS
    WHERE TABLE_SCHEMA = DATABASE()
      AND TABLE_NAME = 'tbl_elective_subject'
      AND COLUMN_NAME = 'elective_slot_id'
  ) > 0,
  'SELECT 1',
  'ALTER TABLE tbl_elective_subject ADD COLUMN elective_slot_id int(11) NULL AFTER track_id'
));
PREPARE alterIfNotExists FROM @preparedStatement;
EXECUTE alterIfNotExists;
DEALLOCATE PREPARE alterIfNotExists;

-- Add foreign key for elective_slot_id if it doesn't exist
SET @preparedStatement = (SELECT IF(
  (
    SELECT COUNT(*) FROM INFORMATION_SCHEMA.KEY_COLUMN_USAGE
    WHERE TABLE_SCHEMA = DATABASE()
      AND TABLE_NAME = 'tbl_elective_subject'
      AND CONSTRAINT_NAME = 'fk_elective_slot'
  ) > 0,
  'SELECT 1',
  'ALTER TABLE tbl_elective_subject ADD CONSTRAINT fk_elective_slot FOREIGN KEY (elective_slot_id) REFERENCES tbl_elective_slot (elective_slot_id) ON DELETE SET NULL'
));
PREPARE alterIfNotExists FROM @preparedStatement;
EXECUTE alterIfNotExists;
DEALLOCATE PREPARE alterIfNotExists;

-- ============================================
-- 11. Ensure tbl_student_profile has Current_Program (capital C)
-- ============================================
-- This migration should already exist, but ensuring it's correct
SET @preparedStatement = (SELECT IF(
  (
    SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS
    WHERE
      (TABLE_SCHEMA = DATABASE())
      AND (TABLE_NAME = 'tbl_student_profile')
      AND (COLUMN_NAME = 'Current_Program')
  ) > 0,
  'SELECT 1',
  CONCAT('ALTER TABLE tbl_student_profile CHANGE current_program Current_Program INT NULL')
));
PREPARE alterIfNotExists FROM @preparedStatement;
EXECUTE alterIfNotExists;
DEALLOCATE PREPARE alterIfNotExists;

-- ============================================
-- 12. Ensure tbl_student_profile has all required fields
-- ============================================
-- Add first_name if it doesn't exist
SET @preparedStatement = (SELECT IF(
  (
    SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS
    WHERE TABLE_SCHEMA = DATABASE()
      AND TABLE_NAME = 'tbl_student_profile'
      AND COLUMN_NAME = 'first_name'
  ) > 0,
  'SELECT 1',
  'ALTER TABLE tbl_student_profile ADD COLUMN first_name varchar(100) DEFAULT NULL AFTER student_number'
));
PREPARE alterIfNotExists FROM @preparedStatement;
EXECUTE alterIfNotExists;
DEALLOCATE PREPARE alterIfNotExists;

-- Add middle_name if it doesn't exist
SET @preparedStatement = (SELECT IF(
  (
    SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS
    WHERE TABLE_SCHEMA = DATABASE()
      AND TABLE_NAME = 'tbl_student_profile'
      AND COLUMN_NAME = 'middle_name'
  ) > 0,
  'SELECT 1',
  'ALTER TABLE tbl_student_profile ADD COLUMN middle_name varchar(100) DEFAULT NULL AFTER first_name'
));
PREPARE alterIfNotExists FROM @preparedStatement;
EXECUTE alterIfNotExists;
DEALLOCATE PREPARE alterIfNotExists;

-- Add last_name if it doesn't exist
SET @preparedStatement = (SELECT IF(
  (
    SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS
    WHERE TABLE_SCHEMA = DATABASE()
      AND TABLE_NAME = 'tbl_student_profile'
      AND COLUMN_NAME = 'last_name'
  ) > 0,
  'SELECT 1',
  'ALTER TABLE tbl_student_profile ADD COLUMN last_name varchar(100) DEFAULT NULL AFTER middle_name'
));
PREPARE alterIfNotExists FROM @preparedStatement;
EXECUTE alterIfNotExists;
DEALLOCATE PREPARE alterIfNotExists;

-- Add address if it doesn't exist
SET @preparedStatement = (SELECT IF(
  (
    SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS
    WHERE TABLE_SCHEMA = DATABASE()
      AND TABLE_NAME = 'tbl_student_profile'
      AND COLUMN_NAME = 'address'
  ) > 0,
  'SELECT 1',
  'ALTER TABLE tbl_student_profile ADD COLUMN address varchar(255) DEFAULT NULL AFTER last_name'
));
PREPARE alterIfNotExists FROM @preparedStatement;
EXECUTE alterIfNotExists;
DEALLOCATE PREPARE alterIfNotExists;

-- Add year_level_id if it doesn't exist
SET @preparedStatement = (SELECT IF(
  (
    SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS
    WHERE TABLE_SCHEMA = DATABASE()
      AND TABLE_NAME = 'tbl_student_profile'
      AND COLUMN_NAME = 'year_level_id'
  ) > 0,
  'SELECT 1',
  'ALTER TABLE tbl_student_profile ADD COLUMN year_level_id int(11) DEFAULT NULL AFTER academic_status'
));
PREPARE alterIfNotExists FROM @preparedStatement;
EXECUTE alterIfNotExists;
DEALLOCATE PREPARE alterIfNotExists;

-- Add track_id if it doesn't exist
SET @preparedStatement = (SELECT IF(
  (
    SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS
    WHERE TABLE_SCHEMA = DATABASE()
      AND TABLE_NAME = 'tbl_student_profile'
      AND COLUMN_NAME = 'track_id'
  ) > 0,
  'SELECT 1',
  'ALTER TABLE tbl_student_profile ADD COLUMN track_id int(11) DEFAULT NULL AFTER year_level_id'
));
PREPARE alterIfNotExists FROM @preparedStatement;
EXECUTE alterIfNotExists;
DEALLOCATE PREPARE alterIfNotExists;

-- Add foreign key for year_level_id if it doesn't exist
SET @preparedStatement = (SELECT IF(
  (
    SELECT COUNT(*) FROM INFORMATION_SCHEMA.KEY_COLUMN_USAGE
    WHERE TABLE_SCHEMA = DATABASE()
      AND TABLE_NAME = 'tbl_student_profile'
      AND CONSTRAINT_NAME = 'fk_student_year_level'
  ) > 0,
  'SELECT 1',
  'ALTER TABLE tbl_student_profile ADD CONSTRAINT fk_student_year_level FOREIGN KEY (year_level_id) REFERENCES year_level (year_level_id) ON DELETE SET NULL'
));
PREPARE alterIfNotExists FROM @preparedStatement;
EXECUTE alterIfNotExists;
DEALLOCATE PREPARE alterIfNotExists;

-- Add foreign key for track_id if it doesn't exist
SET @preparedStatement = (SELECT IF(
  (
    SELECT COUNT(*) FROM INFORMATION_SCHEMA.KEY_COLUMN_USAGE
    WHERE TABLE_SCHEMA = DATABASE()
      AND TABLE_NAME = 'tbl_student_profile'
      AND CONSTRAINT_NAME = 'fk_student_track'
  ) > 0,
  'SELECT 1',
  'ALTER TABLE tbl_student_profile ADD CONSTRAINT fk_student_track FOREIGN KEY (track_id) REFERENCES tbl_track (track_id) ON DELETE SET NULL'
));
PREPARE alterIfNotExists FROM @preparedStatement;
EXECUTE alterIfNotExists;
DEALLOCATE PREPARE alterIfNotExists;

