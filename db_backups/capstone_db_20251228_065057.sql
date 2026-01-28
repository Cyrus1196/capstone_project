-- Dump of database: capstone_db
-- Generated: 2025-12-28T06:50:57+01:00

--
-- Table structure for table `cache`
--

DROP TABLE IF EXISTS `cache`;
CREATE TABLE `cache` (
  `key` varchar(255) NOT NULL,
  `value` mediumtext NOT NULL,
  `expiration` int(11) NOT NULL,
  PRIMARY KEY (`key`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Dumping data for table `cache`
--


--
-- Table structure for table `cache_locks`
--

DROP TABLE IF EXISTS `cache_locks`;
CREATE TABLE `cache_locks` (
  `key` varchar(255) NOT NULL,
  `owner` varchar(255) NOT NULL,
  `expiration` int(11) NOT NULL,
  PRIMARY KEY (`key`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Dumping data for table `cache_locks`
--


--
-- Table structure for table `curriculum`
--

DROP TABLE IF EXISTS `curriculum`;
CREATE TABLE `curriculum` (
  `curriculum_id` int(11) NOT NULL AUTO_INCREMENT,
  `program_id` int(11) NOT NULL,
  `subject_id` int(11) NOT NULL,
  `year_level` int(11) NOT NULL,
  `semester_id` int(11) NOT NULL,
  `passing_grade` int(11) DEFAULT NULL,
  `subject_type` varchar(50) DEFAULT NULL,
  `requisite_id` int(11) DEFAULT NULL,
  PRIMARY KEY (`curriculum_id`),
  KEY `fk_curriculum_program` (`program_id`),
  KEY `fk_curriculum_subject` (`subject_id`),
  KEY `fk_curriculum_year` (`year_level`),
  KEY `fk_curriculum_semester` (`semester_id`),
  KEY `fk_curriculum_requisite` (`requisite_id`),
  CONSTRAINT `fk_curriculum_program` FOREIGN KEY (`program_id`) REFERENCES `tbl_program` (`program_id`),
  CONSTRAINT `fk_curriculum_requisite` FOREIGN KEY (`requisite_id`) REFERENCES `tbl_requisites` (`requisite_id`) ON DELETE SET NULL,
  CONSTRAINT `fk_curriculum_semester` FOREIGN KEY (`semester_id`) REFERENCES `tbl_semester` (`semester_id`),
  CONSTRAINT `fk_curriculum_subject` FOREIGN KEY (`subject_id`) REFERENCES `tbl_subjects` (`subject_id`),
  CONSTRAINT `fk_curriculum_year` FOREIGN KEY (`year_level`) REFERENCES `year_level` (`year_level_id`)
) ENGINE=InnoDB AUTO_INCREMENT=113 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Dumping data for table `curriculum`
--

INSERT INTO `curriculum` (`curriculum_id`, `program_id`, `subject_id`, `year_level`, `semester_id`, `passing_grade`, `subject_type`, `requisite_id`) VALUES
('81', '1', '1', '1', '1', '50', 'core', NULL),
('82', '1', '2', '1', '1', '50', 'core', NULL),
('83', '1', '5', '1', '1', '50', 'minor', NULL),
('84', '1', '6', '1', '1', '50', 'minor', NULL),
('85', '1', '7', '1', '1', '50', 'minor', NULL),
('86', '1', '8', '1', '1', '50', 'minor', NULL),
('87', '1', '9', '1', '1', '50', 'minor', NULL),
('88', '1', '10', '1', '1', '50', 'minor', NULL),
('89', '1', '3', '1', '2', '50', 'core', '8'),
('90', '1', '4', '1', '2', '50', 'core', '9'),
('91', '1', '13', '1', '2', '50', 'core', '12'),
('92', '1', '14', '1', '2', '50', 'minor', NULL),
('93', '1', '15', '1', '2', '50', 'minor', NULL),
('94', '1', '16', '1', '2', '50', 'minor', NULL),
('95', '1', '17', '1', '2', '50', 'minor', '10'),
('96', '1', '18', '1', '2', '50', 'minor', '11'),
('105', '1', '19', '2', '1', '50', 'core', '13'),
('106', '1', '20', '2', '1', '50', 'core', '14'),
('107', '1', '21', '2', '1', '50', 'core', NULL),
('108', '1', '22', '2', '1', '50', 'core', '15'),
('109', '1', '23', '2', '1', '50', 'core', '16'),
('110', '1', '24', '2', '1', '50', 'minor', NULL),
('111', '1', '25', '2', '1', '50', 'minor', '17'),
('112', '1', '26', '2', '1', '50', 'minor', NULL);

--
-- Table structure for table `failed_jobs`
--

DROP TABLE IF EXISTS `failed_jobs`;
CREATE TABLE `failed_jobs` (
  `id` bigint(20) unsigned NOT NULL AUTO_INCREMENT,
  `uuid` varchar(255) NOT NULL,
  `connection` text NOT NULL,
  `queue` text NOT NULL,
  `payload` longtext NOT NULL,
  `exception` longtext NOT NULL,
  `failed_at` timestamp NOT NULL DEFAULT current_timestamp(),
  PRIMARY KEY (`id`),
  UNIQUE KEY `failed_jobs_uuid_unique` (`uuid`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Dumping data for table `failed_jobs`
--


--
-- Table structure for table `job_batches`
--

DROP TABLE IF EXISTS `job_batches`;
CREATE TABLE `job_batches` (
  `id` varchar(255) NOT NULL,
  `name` varchar(255) NOT NULL,
  `total_jobs` int(11) NOT NULL,
  `pending_jobs` int(11) NOT NULL,
  `failed_jobs` int(11) NOT NULL,
  `failed_job_ids` longtext NOT NULL,
  `options` mediumtext DEFAULT NULL,
  `cancelled_at` int(11) DEFAULT NULL,
  `created_at` int(11) NOT NULL,
  `finished_at` int(11) DEFAULT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Dumping data for table `job_batches`
--


--
-- Table structure for table `jobs`
--

DROP TABLE IF EXISTS `jobs`;
CREATE TABLE `jobs` (
  `id` bigint(20) unsigned NOT NULL AUTO_INCREMENT,
  `queue` varchar(255) NOT NULL,
  `payload` longtext NOT NULL,
  `attempts` tinyint(3) unsigned NOT NULL,
  `reserved_at` int(10) unsigned DEFAULT NULL,
  `available_at` int(10) unsigned NOT NULL,
  `created_at` int(10) unsigned NOT NULL,
  PRIMARY KEY (`id`),
  KEY `jobs_queue_index` (`queue`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Dumping data for table `jobs`
--


--
-- Table structure for table `migrations`
--

DROP TABLE IF EXISTS `migrations`;
CREATE TABLE `migrations` (
  `id` int(10) unsigned NOT NULL AUTO_INCREMENT,
  `migration` varchar(255) NOT NULL,
  `batch` int(11) NOT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=20 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Dumping data for table `migrations`
--

INSERT INTO `migrations` (`id`, `migration`, `batch`) VALUES
('1', '0001_01_01_000000_create_users_table', '1'),
('2', '0001_01_01_000001_create_cache_table', '1'),
('3', '0001_01_01_000002_create_jobs_table', '1'),
('4', '2024_01_01_000000_create_capstone_lookup_tables', '1'),
('5', '2024_01_01_000001_create_capstone_user_tables', '1'),
('6', '2024_01_01_000002_create_capstone_subject_tables', '1'),
('7', '2024_01_01_000003_create_capstone_enrollment_tables', '1'),
('8', '2024_01_01_000004_create_capstone_request_tables', '1'),
('10', '2024_01_01_000005_create_corequisite_table', '2'),
('11', '2024_01_01_000007_create_simple_requisites_table', '3'),
('12', '2024_01_01_000009_cleanup_requisite_column', '4'),
('13', '2024_01_01_000010_final_cleanup', '5'),
('14', '2024_01_01_000011_drop_old_requisite_tables', '5'),
('16', '2024_01_01_000006_create_combined_requisites_table', '6'),
('17', '2024_01_01_000008_update_curriculum_to_combined_requisites', '6'),
('18', '2024_01_01_000012_remove_old_requisite_tables', '6'),
('19', '2024_01_01_000013_remove_curriculum_requisite_columns', '7');

--
-- Table structure for table `password_reset_tokens`
--

DROP TABLE IF EXISTS `password_reset_tokens`;
CREATE TABLE `password_reset_tokens` (
  `email` varchar(255) NOT NULL,
  `token` varchar(255) NOT NULL,
  `created_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`email`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Dumping data for table `password_reset_tokens`
--


--
-- Table structure for table `sessions`
--

DROP TABLE IF EXISTS `sessions`;
CREATE TABLE `sessions` (
  `id` varchar(255) NOT NULL,
  `user_id` bigint(20) unsigned DEFAULT NULL,
  `ip_address` varchar(45) DEFAULT NULL,
  `user_agent` text DEFAULT NULL,
  `payload` longtext NOT NULL,
  `last_activity` int(11) NOT NULL,
  PRIMARY KEY (`id`),
  KEY `sessions_user_id_index` (`user_id`),
  KEY `sessions_last_activity_index` (`last_activity`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Dumping data for table `sessions`
--

INSERT INTO `sessions` (`id`, `user_id`, `ip_address`, `user_agent`, `payload`, `last_activity`) VALUES
('TnTeUe1HSAxXRMs7khpD5FyXpDvmZ3xRFfjz9LDm', '1', '127.0.0.1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/143.0.0.0 Safari/537.36', 'YTo0OntzOjY6Il90b2tlbiI7czo0MDoidEYxRWFBZUxlVEo5S29kbFJGMEFtS3J2bElvbnNVZG1sRVVoTndJWCI7czo2OiJfZmxhc2giO2E6Mjp7czozOiJvbGQiO2E6MDp7fXM6MzoibmV3IjthOjA6e319czo1MDoibG9naW5fd2ViXzU5YmEzNmFkZGMyYjJmOTQwMTU4MGYwMTRjN2Y1OGVhNGUzMDk4OWQiO2k6MTtzOjk6Il9wcmV2aW91cyI7YToyOntzOjM6InVybCI7czozODoiaHR0cDovL2xvY2FsaG9zdDo4MDAwL2FwaS9sb29rdXAvcm9sZXMiO3M6NToicm91dGUiO047fX0=', '1766900681');

--
-- Table structure for table `tbl_academic_year`
--

DROP TABLE IF EXISTS `tbl_academic_year`;
CREATE TABLE `tbl_academic_year` (
  `academic_year_id` int(11) NOT NULL AUTO_INCREMENT,
  `academic_year_name` varchar(50) NOT NULL,
  PRIMARY KEY (`academic_year_id`)
) ENGINE=InnoDB AUTO_INCREMENT=2 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Dumping data for table `tbl_academic_year`
--

INSERT INTO `tbl_academic_year` (`academic_year_id`, `academic_year_name`) VALUES
('1', '2023-2024');

--
-- Table structure for table `tbl_campus`
--

DROP TABLE IF EXISTS `tbl_campus`;
CREATE TABLE `tbl_campus` (
  `campus_id` int(11) NOT NULL AUTO_INCREMENT,
  `campus_name` varchar(100) NOT NULL,
  PRIMARY KEY (`campus_id`)
) ENGINE=InnoDB AUTO_INCREMENT=2 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Dumping data for table `tbl_campus`
--

INSERT INTO `tbl_campus` (`campus_id`, `campus_name`) VALUES
('1', 'Cagayan De oro College (COC)');

--
-- Table structure for table `tbl_departments`
--

DROP TABLE IF EXISTS `tbl_departments`;
CREATE TABLE `tbl_departments` (
  `department_id` int(11) NOT NULL AUTO_INCREMENT,
  `department_name` varchar(100) NOT NULL,
  `department_code` varchar(20) NOT NULL,
  PRIMARY KEY (`department_id`)
) ENGINE=InnoDB AUTO_INCREMENT=2 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Dumping data for table `tbl_departments`
--

INSERT INTO `tbl_departments` (`department_id`, `department_name`, `department_code`) VALUES
('1', 'College of Information Technology', 'CITE');

--
-- Table structure for table `tbl_enrollments`
--

DROP TABLE IF EXISTS `tbl_enrollments`;
CREATE TABLE `tbl_enrollments` (
  `enrollment_id` int(11) NOT NULL AUTO_INCREMENT,
  `student_id` int(11) NOT NULL,
  `subject_id` int(11) NOT NULL,
  `academic_year_id` int(11) NOT NULL,
  `semester_id` int(11) NOT NULL,
  `grade` varchar(10) DEFAULT NULL,
  `status` varchar(50) DEFAULT NULL,
  `enrolled_date` date DEFAULT NULL,
  `section_id` int(11) DEFAULT NULL,
  PRIMARY KEY (`enrollment_id`),
  KEY `fk_enroll_student` (`student_id`),
  KEY `fk_enroll_subject` (`subject_id`),
  KEY `fk_enroll_year` (`academic_year_id`),
  KEY `fk_enroll_semester` (`semester_id`),
  KEY `fk_enroll_section` (`section_id`),
  CONSTRAINT `fk_enroll_section` FOREIGN KEY (`section_id`) REFERENCES `tbl_section` (`section_id`) ON DELETE SET NULL,
  CONSTRAINT `fk_enroll_semester` FOREIGN KEY (`semester_id`) REFERENCES `tbl_semester` (`semester_id`),
  CONSTRAINT `fk_enroll_student` FOREIGN KEY (`student_id`) REFERENCES `tbl_student_profile` (`student_id`),
  CONSTRAINT `fk_enroll_subject` FOREIGN KEY (`subject_id`) REFERENCES `tbl_subjects` (`subject_id`),
  CONSTRAINT `fk_enroll_year` FOREIGN KEY (`academic_year_id`) REFERENCES `tbl_academic_year` (`academic_year_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Dumping data for table `tbl_enrollments`
--


--
-- Table structure for table `tbl_program`
--

DROP TABLE IF EXISTS `tbl_program`;
CREATE TABLE `tbl_program` (
  `program_id` int(11) NOT NULL AUTO_INCREMENT,
  `department_id` int(11) NOT NULL,
  `campus_id` int(11) NOT NULL,
  `program_code` varchar(50) DEFAULT NULL,
  `program_name` varchar(100) DEFAULT NULL,
  `total_units_required` int(11) DEFAULT NULL,
  PRIMARY KEY (`program_id`),
  KEY `fk_program_department` (`department_id`),
  KEY `fk_program_campus` (`campus_id`),
  CONSTRAINT `fk_program_campus` FOREIGN KEY (`campus_id`) REFERENCES `tbl_campus` (`campus_id`),
  CONSTRAINT `fk_program_department` FOREIGN KEY (`department_id`) REFERENCES `tbl_departments` (`department_id`)
) ENGINE=InnoDB AUTO_INCREMENT=2 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Dumping data for table `tbl_program`
--

INSERT INTO `tbl_program` (`program_id`, `department_id`, `campus_id`, `program_code`, `program_name`, `total_units_required`) VALUES
('1', '1', '1', 'IT', 'Information Technology', '24');

--
-- Table structure for table `tbl_requisites`
--

DROP TABLE IF EXISTS `tbl_requisites`;
CREATE TABLE `tbl_requisites` (
  `requisite_id` int(11) NOT NULL AUTO_INCREMENT,
  `subject_id` int(11) NOT NULL,
  `required_subject_id` int(11) NOT NULL,
  `requisite_type` enum('prerequisite','corequisite') NOT NULL,
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`requisite_id`),
  UNIQUE KEY `unique_requisite` (`subject_id`,`required_subject_id`,`requisite_type`),
  KEY `fk_req_required` (`required_subject_id`),
  CONSTRAINT `fk_req_required` FOREIGN KEY (`required_subject_id`) REFERENCES `tbl_subjects` (`subject_id`) ON DELETE CASCADE,
  CONSTRAINT `fk_req_subject` FOREIGN KEY (`subject_id`) REFERENCES `tbl_subjects` (`subject_id`) ON DELETE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=19 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Dumping data for table `tbl_requisites`
--

INSERT INTO `tbl_requisites` (`requisite_id`, `subject_id`, `required_subject_id`, `requisite_type`, `created_at`, `updated_at`) VALUES
('8', '3', '2', 'prerequisite', '2025-12-27 13:55:50', '2025-12-27 13:55:50'),
('9', '4', '1', 'prerequisite', '2025-12-27 13:56:01', '2025-12-27 13:56:01'),
('10', '17', '9', 'prerequisite', '2025-12-27 13:56:21', '2025-12-27 13:56:21'),
('11', '18', '10', 'prerequisite', '2025-12-27 13:56:30', '2025-12-27 13:56:30'),
('12', '13', '6', 'prerequisite', '2025-12-27 15:23:41', '2025-12-27 15:23:41'),
('13', '19', '22', 'corequisite', '2025-12-27 17:09:19', '2025-12-27 17:09:19'),
('14', '20', '11', 'prerequisite', '2025-12-27 17:09:58', '2025-12-27 17:09:58'),
('15', '22', '11', 'prerequisite', '2025-12-27 17:11:14', '2025-12-27 17:11:14'),
('16', '23', '1', 'prerequisite', '2025-12-27 17:11:49', '2025-12-27 17:11:49'),
('17', '25', '17', 'prerequisite', '2025-12-27 17:12:10', '2025-12-27 17:12:10');

--
-- Table structure for table `tbl_roles`
--

DROP TABLE IF EXISTS `tbl_roles`;
CREATE TABLE `tbl_roles` (
  `role_id` int(11) NOT NULL AUTO_INCREMENT,
  `role_name` varchar(50) NOT NULL,
  `access_level` int(11) NOT NULL,
  `description` varchar(255) DEFAULT NULL,
  PRIMARY KEY (`role_id`)
) ENGINE=InnoDB AUTO_INCREMENT=4 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Dumping data for table `tbl_roles`
--

INSERT INTO `tbl_roles` (`role_id`, `role_name`, `access_level`, `description`) VALUES
('1', 'Admin', '10', 'Administrator with full access'),
('2', 'Faculty', '9', 'Tits-er'),
('3', 'Student', '5', 'Estuden');

--
-- Table structure for table `tbl_section`
--

DROP TABLE IF EXISTS `tbl_section`;
CREATE TABLE `tbl_section` (
  `section_id` int(11) NOT NULL AUTO_INCREMENT,
  `section_name` varchar(50) DEFAULT NULL,
  PRIMARY KEY (`section_id`)
) ENGINE=InnoDB AUTO_INCREMENT=2 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Dumping data for table `tbl_section`
--

INSERT INTO `tbl_section` (`section_id`, `section_name`) VALUES
('1', 'FAB-BSIT1-01');

--
-- Table structure for table `tbl_semester`
--

DROP TABLE IF EXISTS `tbl_semester`;
CREATE TABLE `tbl_semester` (
  `semester_id` int(11) NOT NULL AUTO_INCREMENT,
  `semester_name` varchar(50) NOT NULL,
  PRIMARY KEY (`semester_id`)
) ENGINE=InnoDB AUTO_INCREMENT=3 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Dumping data for table `tbl_semester`
--

INSERT INTO `tbl_semester` (`semester_id`, `semester_name`) VALUES
('1', '1st Semester'),
('2', '2nd Semester');

--
-- Table structure for table `tbl_shifting_request`
--

DROP TABLE IF EXISTS `tbl_shifting_request`;
CREATE TABLE `tbl_shifting_request` (
  `request_id` int(11) NOT NULL AUTO_INCREMENT,
  `student_id` int(11) NOT NULL,
  `subject_id` int(11) DEFAULT NULL,
  `request_date` date DEFAULT NULL,
  `request_type` varchar(50) DEFAULT NULL,
  `reason` varchar(255) DEFAULT NULL,
  `status` varchar(50) DEFAULT NULL,
  PRIMARY KEY (`request_id`),
  KEY `fk_shift_student` (`student_id`),
  KEY `fk_shift_subject` (`subject_id`),
  CONSTRAINT `fk_shift_student` FOREIGN KEY (`student_id`) REFERENCES `tbl_student_profile` (`student_id`),
  CONSTRAINT `fk_shift_subject` FOREIGN KEY (`subject_id`) REFERENCES `tbl_subjects` (`subject_id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Dumping data for table `tbl_shifting_request`
--


--
-- Table structure for table `tbl_student_profile`
--

DROP TABLE IF EXISTS `tbl_student_profile`;
CREATE TABLE `tbl_student_profile` (
  `student_id` int(11) NOT NULL AUTO_INCREMENT,
  `user_id` int(11) NOT NULL,
  `student_number` int(11) NOT NULL,
  `contact_number` varchar(20) DEFAULT NULL,
  `full_name` varchar(150) DEFAULT NULL,
  `academic_status` varchar(50) DEFAULT NULL,
  `current_program` int(11) DEFAULT NULL,
  PRIMARY KEY (`student_id`),
  KEY `fk_student_user` (`user_id`),
  KEY `fk_student_program` (`current_program`),
  CONSTRAINT `fk_student_program` FOREIGN KEY (`current_program`) REFERENCES `tbl_program` (`program_id`) ON DELETE SET NULL,
  CONSTRAINT `fk_student_user` FOREIGN KEY (`user_id`) REFERENCES `tbl_users` (`user_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Dumping data for table `tbl_student_profile`
--


--
-- Table structure for table `tbl_student_program_history`
--

DROP TABLE IF EXISTS `tbl_student_program_history`;
CREATE TABLE `tbl_student_program_history` (
  `history_id` int(11) NOT NULL AUTO_INCREMENT,
  `request_id` int(11) NOT NULL,
  `program_id` int(11) NOT NULL,
  `academic_year_id` int(11) NOT NULL,
  `semester_id` int(11) NOT NULL,
  `date_changed` date DEFAULT NULL,
  `remarks` varchar(255) DEFAULT NULL,
  PRIMARY KEY (`history_id`),
  KEY `fk_history_request` (`request_id`),
  KEY `fk_history_program` (`program_id`),
  KEY `fk_history_year` (`academic_year_id`),
  KEY `fk_history_semester` (`semester_id`),
  CONSTRAINT `fk_history_program` FOREIGN KEY (`program_id`) REFERENCES `tbl_program` (`program_id`),
  CONSTRAINT `fk_history_request` FOREIGN KEY (`request_id`) REFERENCES `tbl_shifting_request` (`request_id`),
  CONSTRAINT `fk_history_semester` FOREIGN KEY (`semester_id`) REFERENCES `tbl_semester` (`semester_id`),
  CONSTRAINT `fk_history_year` FOREIGN KEY (`academic_year_id`) REFERENCES `tbl_academic_year` (`academic_year_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Dumping data for table `tbl_student_program_history`
--


--
-- Table structure for table `tbl_student_standing_subject`
--

DROP TABLE IF EXISTS `tbl_student_standing_subject`;
CREATE TABLE `tbl_student_standing_subject` (
  `student_subject_id` int(11) NOT NULL AUTO_INCREMENT,
  `student_id` int(11) NOT NULL,
  `subject_id` int(11) NOT NULL,
  `off_sem` varchar(50) DEFAULT NULL,
  `evaluation_status` varchar(50) DEFAULT NULL,
  PRIMARY KEY (`student_subject_id`),
  KEY `fk_standing_student` (`student_id`),
  KEY `fk_standing_subject` (`subject_id`),
  CONSTRAINT `fk_standing_student` FOREIGN KEY (`student_id`) REFERENCES `tbl_student_profile` (`student_id`),
  CONSTRAINT `fk_standing_subject` FOREIGN KEY (`subject_id`) REFERENCES `tbl_subjects` (`subject_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Dumping data for table `tbl_student_standing_subject`
--


--
-- Table structure for table `tbl_subjects`
--

DROP TABLE IF EXISTS `tbl_subjects`;
CREATE TABLE `tbl_subjects` (
  `subject_id` int(11) NOT NULL AUTO_INCREMENT,
  `subject_code` varchar(50) NOT NULL,
  `subject_name` varchar(100) NOT NULL,
  `number_of_units` int(11) DEFAULT NULL,
  `number_of_hrs` int(11) DEFAULT NULL,
  PRIMARY KEY (`subject_id`)
) ENGINE=InnoDB AUTO_INCREMENT=27 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Dumping data for table `tbl_subjects`
--

INSERT INTO `tbl_subjects` (`subject_id`, `subject_code`, `subject_name`, `number_of_units`, `number_of_hrs`) VALUES
('1', 'ITE 366', 'Introduction to Computing (Including IT Fundamentals)', '3', '3'),
('2', 'ITE 260', 'Computer Programming 1', '3', '3'),
('3', 'ITE 186', 'Computer Programming 2', '3', '3'),
('4', 'ITE 399', 'Human Computer Interaction 1', '3', '3'),
('5', 'GEN 002', 'UNDERSTAND THE SELF', '3', '3'),
('6', 'MAT 152', 'Mathematics in the Modern World', '3', '3'),
('7', 'GEN 001', 'Purposive Communication', '3', '3'),
('8', 'GEN 006', 'Ethics', '3', '3'),
('9', 'PED 030', 'Physical Activities Towards Health and Fitness(PATHFit1) Movement Competency Training', '2', '2'),
('10', 'NST 021', 'National Service Training Program 1', '3', '3'),
('11', 'ITE 186', 'Computer Programming 2', '3', '3'),
('12', 'ITE 399', 'Human Computer Interaction 1', '3', '3'),
('13', 'ITE 048', 'Discrete Structures', '3', '3'),
('14', 'GEN 008', 'Living in the IT Era', '3', '3'),
('15', 'ART 002', 'Art Appreciation', '3', '3'),
('16', 'GEN 005', 'The Contemporary World', '3', '3'),
('17', 'PED 031', 'Physical Activities Towards Health and Fitness 2 (PATHFit 2) Exercise-based Fitness Activity', '2', '2'),
('18', 'NST 022', 'National Service Training Program 2', '3', '3'),
('19', 'ITE 298', 'Information Management (Including Fundamentals of Database Systems)', '3', '3'),
('20', 'ITE 300', 'Object-Oriented Programming', '3', '3'),
('21', 'ITE 292', 'Networking 1', '3', '3'),
('22', 'ITE 031', 'Data Structure and Algorithms', '3', '3'),
('23', 'ITE 083', 'IT Project Management', '3', '3'),
('24', 'GEN 003', 'Science, Technology, and Society', '3', '3'),
('25', 'PED 032', 'Physical Activities Towards Health and Fitness (PATHFit 3) Individual and Dual Sports', '2', '2'),
('26', 'SSP 005', 'Student Success Program 1', '1', '1');

--
-- Table structure for table `tbl_users`
--

DROP TABLE IF EXISTS `tbl_users`;
CREATE TABLE `tbl_users` (
  `user_id` int(11) NOT NULL AUTO_INCREMENT,
  `email` varchar(100) NOT NULL,
  `password` varchar(255) NOT NULL,
  `contact_number` varchar(20) DEFAULT NULL,
  `role_id` int(11) DEFAULT NULL,
  `status` varchar(50) DEFAULT NULL,
  PRIMARY KEY (`user_id`),
  KEY `fk_users_role` (`role_id`),
  CONSTRAINT `fk_users_role` FOREIGN KEY (`role_id`) REFERENCES `tbl_roles` (`role_id`) ON DELETE SET NULL
) ENGINE=InnoDB AUTO_INCREMENT=2 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Dumping data for table `tbl_users`
--

INSERT INTO `tbl_users` (`user_id`, `email`, `password`, `contact_number`, `role_id`, `status`) VALUES
('1', 'admin@example.com', '$2y$12$UiWggmUHq8.NoKA4YPowoOUTm2Zg3yG6.aV3FzNcNaUCKJU3lRFAK', NULL, '1', 'active');

--
-- Table structure for table `tbl_verification_records`
--

DROP TABLE IF EXISTS `tbl_verification_records`;
CREATE TABLE `tbl_verification_records` (
  `verification_id` int(11) NOT NULL AUTO_INCREMENT,
  `request_id` int(11) NOT NULL,
  `verifier_id` int(11) NOT NULL,
  `verification_date` datetime DEFAULT NULL,
  `decision` varchar(50) DEFAULT NULL,
  `comments` varchar(255) DEFAULT NULL,
  PRIMARY KEY (`verification_id`),
  KEY `fk_verify_request` (`request_id`),
  KEY `fk_verify_user` (`verifier_id`),
  CONSTRAINT `fk_verify_request` FOREIGN KEY (`request_id`) REFERENCES `tbl_shifting_request` (`request_id`),
  CONSTRAINT `fk_verify_user` FOREIGN KEY (`verifier_id`) REFERENCES `tbl_users` (`user_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Dumping data for table `tbl_verification_records`
--


--
-- Table structure for table `users`
--

DROP TABLE IF EXISTS `users`;
CREATE TABLE `users` (
  `id` bigint(20) unsigned NOT NULL AUTO_INCREMENT,
  `name` varchar(255) NOT NULL,
  `email` varchar(255) NOT NULL,
  `email_verified_at` timestamp NULL DEFAULT NULL,
  `password` varchar(255) NOT NULL,
  `remember_token` varchar(100) DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `users_email_unique` (`email`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Dumping data for table `users`
--


--
-- Table structure for table `year_level`
--

DROP TABLE IF EXISTS `year_level`;
CREATE TABLE `year_level` (
  `year_level_id` int(11) NOT NULL AUTO_INCREMENT,
  `year_level` varchar(50) NOT NULL,
  PRIMARY KEY (`year_level_id`)
) ENGINE=InnoDB AUTO_INCREMENT=6 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Dumping data for table `year_level`
--

INSERT INTO `year_level` (`year_level_id`, `year_level`) VALUES
('1', '1st Year'),
('2', '2nd Year'),
('3', '3rd Year'),
('4', '4th Year'),
('5', '5th Year');

