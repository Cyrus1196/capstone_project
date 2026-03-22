-- ============================================================
-- Complete Database Update Script Based on ERD
-- This script creates/updates all tables to match the ERD
-- Run this script to update your database structure
-- ============================================================

SET SQL_MODE = "NO_AUTO_VALUE_ON_ZERO";
SET time_zone = "+00:00";
SET FOREIGN_KEY_CHECKS = 0;

-- Use the database
USE capstone_db;

-- ============================================================
-- 1. CORE LOOKUP TABLES
-- ============================================================

-- tbl_campus
CREATE TABLE IF NOT EXISTS `tbl_campus` (
  `campus_id` int(11) NOT NULL AUTO_INCREMENT,
  `campus_name` varchar(100) NOT NULL,
  PRIMARY KEY (`campus_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- tbl_semester
CREATE TABLE IF NOT EXISTS `tbl_semester` (
  `semester_id` int(11) NOT NULL AUTO_INCREMENT,
  `semester_name` varchar(50) NOT NULL,
  `status` varchar(50) DEFAULT NULL,
  PRIMARY KEY (`semester_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Add status column if it doesn't exist
SET @preparedStatement = (SELECT IF(
  (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS
    WHERE TABLE_SCHEMA = DATABASE()
      AND TABLE_NAME = 'tbl_semester'
      AND COLUMN_NAME = 'status') > 0,
  'SELECT 1',
  'ALTER TABLE tbl_semester ADD COLUMN status varchar(50) DEFAULT NULL AFTER semester_name'
));
PREPARE alterIfNotExists FROM @preparedStatement;
EXECUTE alterIfNotExists;
DEALLOCATE PREPARE alterIfNotExists;

-- tbl_academic_year
CREATE TABLE IF NOT EXISTS `tbl_academic_year` (
  `academic_year_id` int(11) NOT NULL AUTO_INCREMENT,
  `academic_year_name` varchar(50) NOT NULL,
  `status` varchar(50) DEFAULT NULL,
  PRIMARY KEY (`academic_year_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Add status column if it doesn't exist
SET @preparedStatement = (SELECT IF(
  (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS
    WHERE TABLE_SCHEMA = DATABASE()
      AND TABLE_NAME = 'tbl_academic_year'
      AND COLUMN_NAME = 'status') > 0,
  'SELECT 1',
  'ALTER TABLE tbl_academic_year ADD COLUMN status varchar(50) DEFAULT NULL AFTER academic_year_name'
));
PREPARE alterIfNotExists FROM @preparedStatement;
EXECUTE alterIfNotExists;
DEALLOCATE PREPARE alterIfNotExists;

-- year_level
CREATE TABLE IF NOT EXISTS `year_level` (
  `year_level_id` int(11) NOT NULL AUTO_INCREMENT,
  `year_level` varchar(50) NOT NULL,
  `status` varchar(50) DEFAULT NULL,
  PRIMARY KEY (`year_level_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Add status column if it doesn't exist
SET @preparedStatement = (SELECT IF(
  (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS
    WHERE TABLE_SCHEMA = DATABASE()
      AND TABLE_NAME = 'year_level'
      AND COLUMN_NAME = 'status') > 0,
  'SELECT 1',
  'ALTER TABLE year_level ADD COLUMN status varchar(50) DEFAULT NULL AFTER year_level'
));
PREPARE alterIfNotExists FROM @preparedStatement;
EXECUTE alterIfNotExists;
DEALLOCATE PREPARE alterIfNotExists;

-- tbl_departments
CREATE TABLE IF NOT EXISTS `tbl_departments` (
  `department_id` int(11) NOT NULL AUTO_INCREMENT,
  `campus_id` int(11) DEFAULT NULL,
  `department_name` varchar(100) NOT NULL,
  `department_code` varchar(20) NOT NULL,
  PRIMARY KEY (`department_id`),
  KEY `fk_departments_campus` (`campus_id`),
  CONSTRAINT `fk_departments_campus` FOREIGN KEY (`campus_id`) REFERENCES `tbl_campus` (`campus_id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Add campus_id column and foreign key if they don't exist
SET @preparedStatement = (SELECT IF(
  (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS
    WHERE TABLE_SCHEMA = DATABASE()
      AND TABLE_NAME = 'tbl_departments'
      AND COLUMN_NAME = 'campus_id') > 0,
  'SELECT 1',
  'ALTER TABLE tbl_departments ADD COLUMN campus_id int(11) DEFAULT NULL AFTER department_id'
));
PREPARE alterIfNotExists FROM @preparedStatement;
EXECUTE alterIfNotExists;
DEALLOCATE PREPARE alterIfNotExists;

-- Add foreign key for campus_id if it doesn't exist
SET @preparedStatement = (SELECT IF(
  (SELECT COUNT(*) FROM INFORMATION_SCHEMA.KEY_COLUMN_USAGE
    WHERE TABLE_SCHEMA = DATABASE()
      AND TABLE_NAME = 'tbl_departments'
      AND CONSTRAINT_NAME = 'fk_departments_campus') > 0,
  'SELECT 1',
  'ALTER TABLE tbl_departments ADD CONSTRAINT fk_departments_campus FOREIGN KEY (campus_id) REFERENCES tbl_campus(campus_id) ON DELETE SET NULL'
));
PREPARE alterIfNotExists FROM @preparedStatement;
EXECUTE alterIfNotExists;
DEALLOCATE PREPARE alterIfNotExists;

-- tbl_roles
CREATE TABLE IF NOT EXISTS `tbl_roles` (
  `role_id` int(11) NOT NULL AUTO_INCREMENT,
  `role_name` varchar(50) NOT NULL,
  `access_level` int(11) NOT NULL,
  `description` varchar(255) DEFAULT NULL,
  PRIMARY KEY (`role_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================================
-- 2. USER TABLES
-- ============================================================

-- tbl_Users (Note: ERD shows tbl_Users with capital U)
CREATE TABLE IF NOT EXISTS `tbl_Users` (
  `user_id` int(11) NOT NULL AUTO_INCREMENT,
  `Email` varchar(100) NOT NULL,
  `Password` varchar(255) NOT NULL,
  `Contact_Number` varchar(20) DEFAULT NULL,
  `role_id` int(11) DEFAULT NULL,
  `status` varchar(50) DEFAULT NULL,
  PRIMARY KEY (`user_id`),
  KEY `fk_users_role` (`role_id`),
  CONSTRAINT `fk_users_role` FOREIGN KEY (`role_id`) REFERENCES `tbl_roles` (`role_id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- If tbl_users exists (lowercase), migrate data and rename
SET @table_exists = (SELECT COUNT(*) FROM information_schema.tables 
  WHERE table_schema = DATABASE() AND LOWER(table_name) = 'tbl_users' AND table_name != 'tbl_Users');
SET @sql = IF(@table_exists > 0,
  'RENAME TABLE tbl_users TO tbl_Users',
  'SELECT 1');
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- Update column names to match ERD (capital letters)
SET @preparedStatement = (SELECT IF(
  (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS
    WHERE TABLE_SCHEMA = DATABASE()
      AND TABLE_NAME = 'tbl_Users'
      AND COLUMN_NAME = 'email') > 0,
  'ALTER TABLE tbl_Users CHANGE email Email varchar(100) NOT NULL',
  'SELECT 1'
));
PREPARE alterIfNotExists FROM @preparedStatement;
EXECUTE alterIfNotExists;
DEALLOCATE PREPARE alterIfNotExists;

SET @preparedStatement = (SELECT IF(
  (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS
    WHERE TABLE_SCHEMA = DATABASE()
      AND TABLE_NAME = 'tbl_Users'
      AND COLUMN_NAME = 'password') > 0,
  'ALTER TABLE tbl_Users CHANGE password Password varchar(255) NOT NULL',
  'SELECT 1'
));
PREPARE alterIfNotExists FROM @preparedStatement;
EXECUTE alterIfNotExists;
DEALLOCATE PREPARE alterIfNotExists;

SET @preparedStatement = (SELECT IF(
  (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS
    WHERE TABLE_SCHEMA = DATABASE()
      AND TABLE_NAME = 'tbl_Users'
      AND COLUMN_NAME = 'contact_number') > 0,
  'ALTER TABLE tbl_Users CHANGE contact_number Contact_Number varchar(20) DEFAULT NULL',
  'SELECT 1'
));
PREPARE alterIfNotExists FROM @preparedStatement;
EXECUTE alterIfNotExists;
DEALLOCATE PREPARE alterIfNotExists;

-- ============================================================
-- 3. PROGRAM & TRACK TABLES
-- ============================================================

-- tbl_program
CREATE TABLE IF NOT EXISTS `tbl_program` (
  `program_id` int(11) NOT NULL AUTO_INCREMENT,
  `department_id` int(11) NOT NULL,
  `program_code` varchar(50) DEFAULT NULL,
  `program_name` varchar(100) DEFAULT NULL,
  `total_units_required` int(11) DEFAULT NULL,
  PRIMARY KEY (`program_id`),
  KEY `fk_program_department` (`department_id`),
  CONSTRAINT `fk_program_department` FOREIGN KEY (`department_id`) REFERENCES `tbl_departments` (`department_id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Remove campus_id from tbl_program if it exists (ERD shows only department_id)
-- First, drop the foreign key constraint if it exists (common constraint name: fk_program_campus)
SET @fk_name = (
  SELECT CONSTRAINT_NAME 
  FROM INFORMATION_SCHEMA.KEY_COLUMN_USAGE 
  WHERE TABLE_SCHEMA = DATABASE()
    AND TABLE_NAME = 'tbl_program'
    AND COLUMN_NAME = 'campus_id'
    AND REFERENCED_TABLE_NAME IS NOT NULL
  LIMIT 1
);

SET @drop_fk = IF(@fk_name IS NOT NULL, 
  CONCAT('ALTER TABLE tbl_program DROP FOREIGN KEY ', @fk_name),
  'SELECT 1'
);

PREPARE stmt FROM @drop_fk;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- Drop any index on campus_id if it exists (but not primary key)
SET @idx_name = (
  SELECT INDEX_NAME 
  FROM INFORMATION_SCHEMA.STATISTICS 
  WHERE TABLE_SCHEMA = DATABASE()
    AND TABLE_NAME = 'tbl_program'
    AND COLUMN_NAME = 'campus_id'
    AND INDEX_NAME != 'PRIMARY'
  LIMIT 1
);

SET @drop_idx = IF(@idx_name IS NOT NULL,
  CONCAT('ALTER TABLE tbl_program DROP INDEX ', @idx_name),
  'SELECT 1'
);

PREPARE stmt FROM @drop_idx;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- Finally, drop the campus_id column if it exists
SET @preparedStatement = (SELECT IF(
  (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS
    WHERE TABLE_SCHEMA = DATABASE()
      AND TABLE_NAME = 'tbl_program'
      AND COLUMN_NAME = 'campus_id') > 0,
  'ALTER TABLE tbl_program DROP COLUMN campus_id',
  'SELECT 1'
));
PREPARE alterIfNotExists FROM @preparedStatement;
EXECUTE alterIfNotExists;
DEALLOCATE PREPARE alterIfNotExists;

-- tbl_track
CREATE TABLE IF NOT EXISTS `tbl_track` (
  `track_id` int(11) NOT NULL AUTO_INCREMENT,
  `track_code` varchar(50) DEFAULT NULL,
  `track_name` varchar(100) DEFAULT NULL,
  PRIMARY KEY (`track_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================================
-- 4. PROFILE TABLES
-- ============================================================

-- tbl_Student_Profile (Note: ERD shows tbl_Student_Profile with capital S)
CREATE TABLE IF NOT EXISTS `tbl_Student_Profile` (
  `student_id` int(11) NOT NULL AUTO_INCREMENT,
  `user_id` int(11) NOT NULL,
  `student_number` int(11) NOT NULL,
  `Contact_Number` varchar(20) DEFAULT NULL,
  `first_name` varchar(100) DEFAULT NULL,
  `middle_name` varchar(100) DEFAULT NULL,
  `last_name` varchar(100) DEFAULT NULL,
  `address` varchar(255) DEFAULT NULL,
  `academic_status` varchar(50) DEFAULT NULL,
  `Current_Program` int(11) DEFAULT NULL,
  `year_level_id` int(11) DEFAULT NULL,
  `track_id` int(11) DEFAULT NULL,
  PRIMARY KEY (`student_id`),
  KEY `fk_student_user` (`user_id`),
  KEY `fk_student_program` (`Current_Program`),
  KEY `fk_student_year_level` (`year_level_id`),
  KEY `fk_student_track` (`track_id`),
  CONSTRAINT `fk_student_user` FOREIGN KEY (`user_id`) REFERENCES `tbl_Users` (`user_id`) ON DELETE CASCADE,
  CONSTRAINT `fk_student_program` FOREIGN KEY (`Current_Program`) REFERENCES `tbl_program` (`program_id`) ON DELETE SET NULL,
  CONSTRAINT `fk_student_year_level` FOREIGN KEY (`year_level_id`) REFERENCES `year_level` (`year_level_id`) ON DELETE SET NULL,
  CONSTRAINT `fk_student_track` FOREIGN KEY (`track_id`) REFERENCES `tbl_track` (`track_id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- If tbl_student_profile exists (lowercase), rename it
SET @table_exists = (SELECT COUNT(*) FROM information_schema.tables 
  WHERE table_schema = DATABASE() AND LOWER(table_name) = 'tbl_student_profile' AND table_name != 'tbl_Student_Profile');
SET @sql = IF(@table_exists > 0,
  'RENAME TABLE tbl_student_profile TO tbl_Student_Profile',
  'SELECT 1');
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- Update tbl_Student_Profile columns to match ERD
SET @preparedStatement = (SELECT IF(
  (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS
    WHERE TABLE_SCHEMA = DATABASE()
      AND TABLE_NAME = 'tbl_Student_Profile'
      AND COLUMN_NAME = 'first_name') = 0,
  'ALTER TABLE tbl_Student_Profile ADD COLUMN first_name varchar(100) DEFAULT NULL AFTER student_number',
  'SELECT 1'
));
PREPARE alterIfNotExists FROM @preparedStatement;
EXECUTE alterIfNotExists;
DEALLOCATE PREPARE alterIfNotExists;

SET @preparedStatement = (SELECT IF(
  (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS
    WHERE TABLE_SCHEMA = DATABASE()
      AND TABLE_NAME = 'tbl_Student_Profile'
      AND COLUMN_NAME = 'middle_name') = 0,
  'ALTER TABLE tbl_Student_Profile ADD COLUMN middle_name varchar(100) DEFAULT NULL AFTER first_name',
  'SELECT 1'
));
PREPARE alterIfNotExists FROM @preparedStatement;
EXECUTE alterIfNotExists;
DEALLOCATE PREPARE alterIfNotExists;

SET @preparedStatement = (SELECT IF(
  (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS
    WHERE TABLE_SCHEMA = DATABASE()
      AND TABLE_NAME = 'tbl_Student_Profile'
      AND COLUMN_NAME = 'last_name') = 0,
  'ALTER TABLE tbl_Student_Profile ADD COLUMN last_name varchar(100) DEFAULT NULL AFTER middle_name',
  'SELECT 1'
));
PREPARE alterIfNotExists FROM @preparedStatement;
EXECUTE alterIfNotExists;
DEALLOCATE PREPARE alterIfNotExists;

SET @preparedStatement = (SELECT IF(
  (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS
    WHERE TABLE_SCHEMA = DATABASE()
      AND TABLE_NAME = 'tbl_Student_Profile'
      AND COLUMN_NAME = 'address') = 0,
  'ALTER TABLE tbl_Student_Profile ADD COLUMN address varchar(255) DEFAULT NULL AFTER last_name',
  'SELECT 1'
));
PREPARE alterIfNotExists FROM @preparedStatement;
EXECUTE alterIfNotExists;
DEALLOCATE PREPARE alterIfNotExists;

SET @preparedStatement = (SELECT IF(
  (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS
    WHERE TABLE_SCHEMA = DATABASE()
      AND TABLE_NAME = 'tbl_Student_Profile'
      AND COLUMN_NAME = 'year_level_id') = 0,
  'ALTER TABLE tbl_Student_Profile ADD COLUMN year_level_id int(11) DEFAULT NULL AFTER academic_status',
  'SELECT 1'
));
PREPARE alterIfNotExists FROM @preparedStatement;
EXECUTE alterIfNotExists;
DEALLOCATE PREPARE alterIfNotExists;

SET @preparedStatement = (SELECT IF(
  (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS
    WHERE TABLE_SCHEMA = DATABASE()
      AND TABLE_NAME = 'tbl_Student_Profile'
      AND COLUMN_NAME = 'track_id') = 0,
  'ALTER TABLE tbl_Student_Profile ADD COLUMN track_id int(11) DEFAULT NULL AFTER year_level_id',
  'SELECT 1'
));
PREPARE alterIfNotExists FROM @preparedStatement;
EXECUTE alterIfNotExists;
DEALLOCATE PREPARE alterIfNotExists;

-- Rename current_program to Current_Program if needed
SET @preparedStatement = (SELECT IF(
  (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS
    WHERE TABLE_SCHEMA = DATABASE()
      AND TABLE_NAME = 'tbl_Student_Profile'
      AND COLUMN_NAME = 'current_program') > 0,
  'ALTER TABLE tbl_Student_Profile CHANGE current_program Current_Program INT NULL',
  'SELECT 1'
));
PREPARE alterIfNotExists FROM @preparedStatement;
EXECUTE alterIfNotExists;
DEALLOCATE PREPARE alterIfNotExists;

-- Add foreign keys if they don't exist
SET @preparedStatement = (SELECT IF(
  (SELECT COUNT(*) FROM INFORMATION_SCHEMA.KEY_COLUMN_USAGE
    WHERE TABLE_SCHEMA = DATABASE()
      AND TABLE_NAME = 'tbl_Student_Profile'
      AND CONSTRAINT_NAME = 'fk_student_year_level') = 0,
  'ALTER TABLE tbl_Student_Profile ADD CONSTRAINT fk_student_year_level FOREIGN KEY (year_level_id) REFERENCES year_level(year_level_id) ON DELETE SET NULL',
  'SELECT 1'
));
PREPARE alterIfNotExists FROM @preparedStatement;
EXECUTE alterIfNotExists;
DEALLOCATE PREPARE alterIfNotExists;

SET @preparedStatement = (SELECT IF(
  (SELECT COUNT(*) FROM INFORMATION_SCHEMA.KEY_COLUMN_USAGE
    WHERE TABLE_SCHEMA = DATABASE()
      AND TABLE_NAME = 'tbl_Student_Profile'
      AND CONSTRAINT_NAME = 'fk_student_track') = 0,
  'ALTER TABLE tbl_Student_Profile ADD CONSTRAINT fk_student_track FOREIGN KEY (track_id) REFERENCES tbl_track(track_id) ON DELETE SET NULL',
  'SELECT 1'
));
PREPARE alterIfNotExists FROM @preparedStatement;
EXECUTE alterIfNotExists;
DEALLOCATE PREPARE alterIfNotExists;

-- tbl_faculty_profile
CREATE TABLE IF NOT EXISTS `tbl_faculty_profile` (
  `faculty_id` int(11) NOT NULL AUTO_INCREMENT,
  `user_id` int(11) NOT NULL,
  `first_name` varchar(100) DEFAULT NULL,
  `middle_name` varchar(100) DEFAULT NULL,
  `last_name` varchar(100) DEFAULT NULL,
  `employee_id` varchar(50) DEFAULT NULL,
  `department_id` int(11) DEFAULT NULL,
  PRIMARY KEY (`faculty_id`),
  KEY `fk_faculty_user` (`user_id`),
  KEY `fk_faculty_department` (`department_id`),
  CONSTRAINT `fk_faculty_user` FOREIGN KEY (`user_id`) REFERENCES `tbl_Users` (`user_id`) ON DELETE CASCADE,
  CONSTRAINT `fk_faculty_department` FOREIGN KEY (`department_id`) REFERENCES `tbl_departments` (`department_id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- tbl_dean_profile
CREATE TABLE IF NOT EXISTS `tbl_dean_profile` (
  `dean_id` int(11) NOT NULL AUTO_INCREMENT,
  `user_id` int(11) NOT NULL,
  `program_id` int(11) NOT NULL,
  PRIMARY KEY (`dean_id`),
  KEY `fk_dean_user` (`user_id`),
  KEY `fk_dean_program` (`program_id`),
  CONSTRAINT `fk_dean_user` FOREIGN KEY (`user_id`) REFERENCES `tbl_Users` (`user_id`) ON DELETE CASCADE,
  CONSTRAINT `fk_dean_program` FOREIGN KEY (`program_id`) REFERENCES `tbl_program` (`program_id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================================
-- 5. SUBJECT TABLES
-- ============================================================

-- tbl_subjects
CREATE TABLE IF NOT EXISTS `tbl_subjects` (
  `subject_id` int(11) NOT NULL AUTO_INCREMENT,
  `subject_code` varchar(50) NOT NULL,
  `subject_name` varchar(100) NOT NULL,
  `number_of_units` int(11) DEFAULT NULL,
  `number_of_hrs` int(11) DEFAULT NULL,
  PRIMARY KEY (`subject_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- tbl_prerequisite
CREATE TABLE IF NOT EXISTS `tbl_prerequisite` (
  `requisites_id` int(11) NOT NULL AUTO_INCREMENT,
  `subject_id` int(11) NOT NULL,
  `requisite_type` varchar(50) DEFAULT NULL,
  `requisites_subject_id` int(11) NOT NULL,
  PRIMARY KEY (`requisites_id`),
  KEY `fk_prereq_subject` (`subject_id`),
  KEY `fk_prereq_required` (`requisites_subject_id`),
  CONSTRAINT `fk_prereq_subject` FOREIGN KEY (`subject_id`) REFERENCES `tbl_subjects` (`subject_id`) ON DELETE CASCADE,
  CONSTRAINT `fk_prereq_required` FOREIGN KEY (`requisites_subject_id`) REFERENCES `tbl_subjects` (`subject_id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================================
-- 6. CURRICULUM TABLES
-- ============================================================

-- tbl_curriculum_header
CREATE TABLE IF NOT EXISTS `tbl_curriculum_header` (
  `curriculum_header_id` int(11) NOT NULL AUTO_INCREMENT,
  `program_id` int(11) NOT NULL,
  `Effective_Year` int(11) DEFAULT NULL,
  `description` text DEFAULT NULL,
  PRIMARY KEY (`curriculum_header_id`),
  KEY `fk_curriculum_header_program` (`program_id`),
  CONSTRAINT `fk_curriculum_header_program` FOREIGN KEY (`program_id`) REFERENCES `tbl_program` (`program_id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- tbl_curriculum
CREATE TABLE IF NOT EXISTS `tbl_curriculum` (
  `curriculum_id` int(11) NOT NULL AUTO_INCREMENT,
  `curriculum_header_id` int(11) NOT NULL,
  `subject_id` int(11) NOT NULL,
  `year_level` int(11) NOT NULL,
  `semeste_id` int(11) NOT NULL,
  `passing_grade` int(11) DEFAULT NULL,
  `subject_type` varchar(50) DEFAULT NULL,
  PRIMARY KEY (`curriculum_id`),
  KEY `fk_curriculum_header` (`curriculum_header_id`),
  KEY `fk_curriculum_subject` (`subject_id`),
  KEY `fk_curriculum_year_level` (`year_level`),
  KEY `fk_curriculum_semester` (`semeste_id`),
  CONSTRAINT `fk_curriculum_header` FOREIGN KEY (`curriculum_header_id`) REFERENCES `tbl_curriculum_header` (`curriculum_header_id`) ON DELETE CASCADE,
  CONSTRAINT `fk_curriculum_subject` FOREIGN KEY (`subject_id`) REFERENCES `tbl_subjects` (`subject_id`) ON DELETE CASCADE,
  CONSTRAINT `fk_curriculum_year_level` FOREIGN KEY (`year_level`) REFERENCES `year_level` (`year_level_id`) ON DELETE CASCADE,
  CONSTRAINT `fk_curriculum_semester` FOREIGN KEY (`semeste_id`) REFERENCES `tbl_semester` (`semester_id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Update tbl_curriculum to use semeste_id (as shown in ERD)
SET @preparedStatement = (SELECT IF(
  (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS
    WHERE TABLE_SCHEMA = DATABASE()
      AND TABLE_NAME = 'tbl_curriculum'
      AND COLUMN_NAME = 'semeste_id') = 0,
  'ALTER TABLE tbl_curriculum ADD COLUMN semeste_id int(11) DEFAULT NULL AFTER year_level',
  'SELECT 1'
));
PREPARE alterIfNotExists FROM @preparedStatement;
EXECUTE alterIfNotExists;
DEALLOCATE PREPARE alterIfNotExists;

-- Migrate semester_id to semeste_id if needed
SET @preparedStatement = (SELECT IF(
  (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS
    WHERE TABLE_SCHEMA = DATABASE()
      AND TABLE_NAME = 'tbl_curriculum'
      AND COLUMN_NAME = 'semester_id') > 0
  AND (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS
    WHERE TABLE_SCHEMA = DATABASE()
      AND TABLE_NAME = 'tbl_curriculum'
      AND COLUMN_NAME = 'semeste_id') > 0,
  'UPDATE tbl_curriculum SET semeste_id = semester_id WHERE semeste_id IS NULL',
  'SELECT 1'
));
PREPARE alterIfNotExists FROM @preparedStatement;
EXECUTE alterIfNotExists;
DEALLOCATE PREPARE alterIfNotExists;

-- Add foreign key for semeste_id if it doesn't exist
SET @preparedStatement = (SELECT IF(
  (SELECT COUNT(*) FROM INFORMATION_SCHEMA.KEY_COLUMN_USAGE
    WHERE TABLE_SCHEMA = DATABASE()
      AND TABLE_NAME = 'tbl_curriculum'
      AND CONSTRAINT_NAME = 'fk_curriculum_semester') = 0,
  'ALTER TABLE tbl_curriculum ADD CONSTRAINT fk_curriculum_semester FOREIGN KEY (semeste_id) REFERENCES tbl_semester(semester_id) ON DELETE CASCADE',
  'SELECT 1'
));
PREPARE alterIfNotExists FROM @preparedStatement;
EXECUTE alterIfNotExists;
DEALLOCATE PREPARE alterIfNotExists;

-- ============================================================
-- 7. OFFERED & ELECTIVE SUBJECT TABLES
-- ============================================================

-- tbl_offered_subject
CREATE TABLE IF NOT EXISTS `tbl_offered_subject` (
  `offered_subject_id` int(11) NOT NULL AUTO_INCREMENT,
  `subject_id` int(11) NOT NULL,
  `academic_year_id` int(11) NOT NULL,
  `semester_id` int(11) NOT NULL,
  `program_id` int(11) NOT NULL,
  `track_id` int(11) DEFAULT NULL,
  `year_level_id` int(11) DEFAULT NULL,
  `status` varchar(50) DEFAULT NULL,
  PRIMARY KEY (`offered_subject_id`),
  KEY `fk_offered_subject` (`subject_id`),
  KEY `fk_offered_academic_year` (`academic_year_id`),
  KEY `fk_offered_semester` (`semester_id`),
  KEY `fk_offered_program` (`program_id`),
  KEY `fk_offered_track` (`track_id`),
  KEY `fk_offered_year_level` (`year_level_id`),
  CONSTRAINT `fk_offered_subject` FOREIGN KEY (`subject_id`) REFERENCES `tbl_subjects` (`subject_id`) ON DELETE CASCADE,
  CONSTRAINT `fk_offered_academic_year` FOREIGN KEY (`academic_year_id`) REFERENCES `tbl_academic_year` (`academic_year_id`) ON DELETE CASCADE,
  CONSTRAINT `fk_offered_semester` FOREIGN KEY (`semester_id`) REFERENCES `tbl_semester` (`semester_id`) ON DELETE CASCADE,
  CONSTRAINT `fk_offered_program` FOREIGN KEY (`program_id`) REFERENCES `tbl_program` (`program_id`) ON DELETE CASCADE,
  CONSTRAINT `fk_offered_track` FOREIGN KEY (`track_id`) REFERENCES `tbl_track` (`track_id`) ON DELETE SET NULL,
  CONSTRAINT `fk_offered_year_level` FOREIGN KEY (`year_level_id`) REFERENCES `year_level` (`year_level_id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- tbl_elective_slot
CREATE TABLE IF NOT EXISTS `tbl_elective_slot` (
  `elective_slot_id` int(11) NOT NULL AUTO_INCREMENT,
  `slot_name` varchar(100) DEFAULT NULL,
  `track_id` int(11) DEFAULT NULL,
  `program_id` int(11) NOT NULL,
  `semester_id` int(11) NOT NULL,
  `year_level_id` int(11) NOT NULL,
  `status` varchar(50) DEFAULT NULL,
  PRIMARY KEY (`elective_slot_id`),
  KEY `fk_elective_slot_track` (`track_id`),
  KEY `fk_elective_slot_program` (`program_id`),
  KEY `fk_elective_slot_semester` (`semester_id`),
  KEY `fk_elective_slot_year_level` (`year_level_id`),
  CONSTRAINT `fk_elective_slot_track` FOREIGN KEY (`track_id`) REFERENCES `tbl_track` (`track_id`) ON DELETE SET NULL,
  CONSTRAINT `fk_elective_slot_program` FOREIGN KEY (`program_id`) REFERENCES `tbl_program` (`program_id`) ON DELETE CASCADE,
  CONSTRAINT `fk_elective_slot_semester` FOREIGN KEY (`semester_id`) REFERENCES `tbl_semester` (`semester_id`) ON DELETE CASCADE,
  CONSTRAINT `fk_elective_slot_year_level` FOREIGN KEY (`year_level_id`) REFERENCES `year_level` (`year_level_id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- tbl_elective_subject
CREATE TABLE IF NOT EXISTS `tbl_elective_subject` (
  `elective_subject_id` int(11) NOT NULL AUTO_INCREMENT,
  `track_id` int(11) DEFAULT NULL,
  `elective_slot_id` int(11) DEFAULT NULL,
  `subject_id` int(11) NOT NULL,
  `description` text DEFAULT NULL,
  PRIMARY KEY (`elective_subject_id`),
  KEY `fk_elective_subject_track` (`track_id`),
  KEY `fk_elective_subject_slot` (`elective_slot_id`),
  KEY `fk_elective_subject_subject` (`subject_id`),
  CONSTRAINT `fk_elective_subject_track` FOREIGN KEY (`track_id`) REFERENCES `tbl_track` (`track_id`) ON DELETE SET NULL,
  CONSTRAINT `fk_elective_subject_slot` FOREIGN KEY (`elective_slot_id`) REFERENCES `tbl_elective_slot` (`elective_slot_id`) ON DELETE SET NULL,
  CONSTRAINT `fk_elective_subject_subject` FOREIGN KEY (`subject_id`) REFERENCES `tbl_subjects` (`subject_id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Add elective_slot_id to tbl_elective_subject if it doesn't exist
SET @preparedStatement = (SELECT IF(
  (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS
    WHERE TABLE_SCHEMA = DATABASE()
      AND TABLE_NAME = 'tbl_elective_subject'
      AND COLUMN_NAME = 'elective_slot_id') = 0,
  'ALTER TABLE tbl_elective_subject ADD COLUMN elective_slot_id int(11) DEFAULT NULL AFTER track_id',
  'SELECT 1'
));
PREPARE alterIfNotExists FROM @preparedStatement;
EXECUTE alterIfNotExists;
DEALLOCATE PREPARE alterIfNotExists;

-- Add foreign key for elective_slot_id if it doesn't exist
SET @preparedStatement = (SELECT IF(
  (SELECT COUNT(*) FROM INFORMATION_SCHEMA.KEY_COLUMN_USAGE
    WHERE TABLE_SCHEMA = DATABASE()
      AND TABLE_NAME = 'tbl_elective_subject'
      AND CONSTRAINT_NAME = 'fk_elective_subject_slot') = 0,
  'ALTER TABLE tbl_elective_subject ADD CONSTRAINT fk_elective_subject_slot FOREIGN KEY (elective_slot_id) REFERENCES tbl_elective_slot(elective_slot_id) ON DELETE SET NULL',
  'SELECT 1'
));
PREPARE alterIfNotExists FROM @preparedStatement;
EXECUTE alterIfNotExists;
DEALLOCATE PREPARE alterIfNotExists;

-- ============================================================
-- 8. EVALUATION TABLES
-- ============================================================

-- tbl_evaluation
CREATE TABLE IF NOT EXISTS `tbl_evaluation` (
  `evaluation_id` int(11) NOT NULL AUTO_INCREMENT,
  `student_id` int(11) NOT NULL,
  `subject_id` int(11) NOT NULL,
  `academic_year_id` int(11) NOT NULL,
  `semester_id` int(11) NOT NULL,
  `grade` varchar(10) DEFAULT NULL,
  `evaluation_status` varchar(50) DEFAULT NULL,
  PRIMARY KEY (`evaluation_id`),
  KEY `fk_evaluation_student` (`student_id`),
  KEY `fk_evaluation_subject` (`subject_id`),
  KEY `fk_evaluation_academic_year` (`academic_year_id`),
  KEY `fk_evaluation_semester` (`semester_id`),
  CONSTRAINT `fk_evaluation_student` FOREIGN KEY (`student_id`) REFERENCES `tbl_Student_Profile` (`student_id`) ON DELETE CASCADE,
  CONSTRAINT `fk_evaluation_subject` FOREIGN KEY (`subject_id`) REFERENCES `tbl_subjects` (`subject_id`) ON DELETE CASCADE,
  CONSTRAINT `fk_evaluation_academic_year` FOREIGN KEY (`academic_year_id`) REFERENCES `tbl_academic_year` (`academic_year_id`) ON DELETE CASCADE,
  CONSTRAINT `fk_evaluation_semester` FOREIGN KEY (`semester_id`) REFERENCES `tbl_semester` (`semester_id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================================
-- 9. CREDIT EVALUATION TABLES
-- ============================================================

-- tbl_schools
CREATE TABLE IF NOT EXISTS `tbl_schools` (
  `school_id` int(11) NOT NULL AUTO_INCREMENT,
  `school_name` varchar(255) NOT NULL,
  `school_program` text DEFAULT NULL,
  `school_curriculum` text DEFAULT NULL,
  PRIMARY KEY (`school_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- tbl_other_school_subjects
CREATE TABLE IF NOT EXISTS `tbl_other_school_subjects` (
  `other_subject_id` int(11) NOT NULL AUTO_INCREMENT,
  `school_id` int(11) NOT NULL,
  `subject_code` varchar(50) NOT NULL,
  `subject_name` varchar(100) NOT NULL,
  `units` int(11) DEFAULT NULL,
  `hours` int(11) DEFAULT NULL,
  `description` text DEFAULT NULL,
  PRIMARY KEY (`other_subject_id`),
  KEY `fk_other_school_subjects_school` (`school_id`),
  CONSTRAINT `fk_other_school_subjects_school` FOREIGN KEY (`school_id`) REFERENCES `tbl_schools` (`school_id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- tbl_subject_equivalence
CREATE TABLE IF NOT EXISTS `tbl_subject_equivalence` (
  `equivalence_id` int(11) NOT NULL AUTO_INCREMENT,
  `other_school_subject` int(11) NOT NULL,
  `subject_id` int(11) NOT NULL,
  `credited_units` int(11) DEFAULT NULL,
  `credit_basis` varchar(50) DEFAULT NULL,
  `status` varchar(50) DEFAULT NULL,
  `remarks` text DEFAULT NULL,
  PRIMARY KEY (`equivalence_id`),
  KEY `fk_equivalence_other_subject` (`other_school_subject`),
  KEY `fk_equivalence_subject` (`subject_id`),
  CONSTRAINT `fk_equivalence_other_subject` FOREIGN KEY (`other_school_subject`) REFERENCES `tbl_other_school_subjects` (`other_subject_id`) ON DELETE CASCADE,
  CONSTRAINT `fk_equivalence_subject` FOREIGN KEY (`subject_id`) REFERENCES `tbl_subjects` (`subject_id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- tbl_credit_evaluation
CREATE TABLE IF NOT EXISTS `tbl_credit_evaluation` (
  `credit_eval_id` int(11) NOT NULL AUTO_INCREMENT,
  `student_id` int(11) NOT NULL,
  `school_id` int(11) NOT NULL,
  `credit_type` varchar(50) DEFAULT NULL,
  `evaluated_by` int(11) NOT NULL,
  `evaluation_date` date DEFAULT NULL,
  `status` varchar(50) DEFAULT NULL,
  `remarks` text DEFAULT NULL,
  PRIMARY KEY (`credit_eval_id`),
  KEY `fk_credit_eval_student` (`student_id`),
  KEY `fk_credit_eval_school` (`school_id`),
  KEY `fk_credit_eval_user` (`evaluated_by`),
  CONSTRAINT `fk_credit_eval_student` FOREIGN KEY (`student_id`) REFERENCES `tbl_Student_Profile` (`student_id`) ON DELETE CASCADE,
  CONSTRAINT `fk_credit_eval_school` FOREIGN KEY (`school_id`) REFERENCES `tbl_schools` (`school_id`) ON DELETE CASCADE,
  CONSTRAINT `fk_credit_eval_user` FOREIGN KEY (`evaluated_by`) REFERENCES `tbl_Users` (`user_id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- tbl_credit_evaluation_details
CREATE TABLE IF NOT EXISTS `tbl_credit_evaluation_details` (
  `credit_detail_id` int(11) NOT NULL AUTO_INCREMENT,
  `credit_eval_id` int(11) NOT NULL,
  `other_subject_id` int(11) NOT NULL,
  `subject_id` int(11) NOT NULL,
  `credited_units` int(11) DEFAULT NULL,
  `credit_basis` varchar(50) DEFAULT NULL,
  `remarks` text DEFAULT NULL,
  PRIMARY KEY (`credit_detail_id`),
  KEY `fk_credit_detail_eval` (`credit_eval_id`),
  KEY `fk_credit_detail_other_subject` (`other_subject_id`),
  KEY `fk_credit_detail_subject` (`subject_id`),
  CONSTRAINT `fk_credit_detail_eval` FOREIGN KEY (`credit_eval_id`) REFERENCES `tbl_credit_evaluation` (`credit_eval_id`) ON DELETE CASCADE,
  CONSTRAINT `fk_credit_detail_other_subject` FOREIGN KEY (`other_subject_id`) REFERENCES `tbl_other_school_subjects` (`other_subject_id`) ON DELETE CASCADE,
  CONSTRAINT `fk_credit_detail_subject` FOREIGN KEY (`subject_id`) REFERENCES `tbl_subjects` (`subject_id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Update tbl_credit_evaluation_details to ensure credit_eval_id exists
SET @preparedStatement = (SELECT IF(
  (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS
    WHERE TABLE_SCHEMA = DATABASE()
      AND TABLE_NAME = 'tbl_credit_evaluation_details'
      AND COLUMN_NAME = 'credit_eval_id') = 0,
  'ALTER TABLE tbl_credit_evaluation_details ADD COLUMN credit_eval_id int(11) NOT NULL AFTER credit_detail_id',
  'SELECT 1'
));
PREPARE alterIfNotExists FROM @preparedStatement;
EXECUTE alterIfNotExists;
DEALLOCATE PREPARE alterIfNotExists;

-- Add foreign key for credit_eval_id if it doesn't exist
SET @preparedStatement = (SELECT IF(
  (SELECT COUNT(*) FROM INFORMATION_SCHEMA.KEY_COLUMN_USAGE
    WHERE TABLE_SCHEMA = DATABASE()
      AND TABLE_NAME = 'tbl_credit_evaluation_details'
      AND CONSTRAINT_NAME = 'fk_credit_detail_eval') = 0,
  'ALTER TABLE tbl_credit_evaluation_details ADD CONSTRAINT fk_credit_detail_eval FOREIGN KEY (credit_eval_id) REFERENCES tbl_credit_evaluation(credit_eval_id) ON DELETE CASCADE',
  'SELECT 1'
));
PREPARE alterIfNotExists FROM @preparedStatement;
EXECUTE alterIfNotExists;
DEALLOCATE PREPARE alterIfNotExists;

-- Remove student_id from tbl_credit_evaluation_details if it exists (ERD shows it should only have credit_eval_id)
SET @preparedStatement = (SELECT IF(
  (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS
    WHERE TABLE_SCHEMA = DATABASE()
      AND TABLE_NAME = 'tbl_credit_evaluation_details'
      AND COLUMN_NAME = 'student_id') > 0,
  CONCAT('ALTER TABLE tbl_credit_evaluation_details DROP FOREIGN KEY ',
    (SELECT CONSTRAINT_NAME FROM INFORMATION_SCHEMA.KEY_COLUMN_USAGE
     WHERE TABLE_SCHEMA = DATABASE()
       AND TABLE_NAME = 'tbl_credit_evaluation_details'
       AND COLUMN_NAME = 'student_id'
       AND REFERENCED_TABLE_NAME IS NOT NULL
     LIMIT 1),
    ', DROP COLUMN student_id'),
  'SELECT 1'
));
PREPARE alterIfNotExists FROM @preparedStatement;
EXECUTE alterIfNotExists;
DEALLOCATE PREPARE alterIfNotExists;

-- ============================================================
-- 10. PERMISSION & ROLE TABLES
-- ============================================================

-- tbl_permission
CREATE TABLE IF NOT EXISTS `tbl_permission` (
  `permission_id` int(11) NOT NULL AUTO_INCREMENT,
  `permission_name` varchar(100) NOT NULL,
  `description` varchar(255) DEFAULT NULL,
  PRIMARY KEY (`permission_id`),
  UNIQUE KEY `unique_permission_name` (`permission_name`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- tbl_role_permissions
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

-- ============================================================
-- 11. AUDIT LOGS
-- ============================================================

-- audit_logs
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
  CONSTRAINT `fk_audit_user` FOREIGN KEY (`user_id`) REFERENCES `tbl_Users` (`user_id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

SET FOREIGN_KEY_CHECKS = 1;

-- ============================================================
-- Script Complete
-- All tables have been created/updated to match the ERD
-- ============================================================