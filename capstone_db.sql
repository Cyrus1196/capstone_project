-- phpMyAdmin SQL Dump
-- version 5.2.1
-- https://www.phpmyadmin.net/
--
-- Host: 127.0.0.1
-- Generation Time: Dec 28, 2025 at 06:58 AM
-- Server version: 10.4.32-MariaDB
-- PHP Version: 8.2.12

SET SQL_MODE = "NO_AUTO_VALUE_ON_ZERO";
START TRANSACTION;
SET time_zone = "+00:00";


/*!40101 SET @OLD_CHARACTER_SET_CLIENT=@@CHARACTER_SET_CLIENT */;
/*!40101 SET @OLD_CHARACTER_SET_RESULTS=@@CHARACTER_SET_RESULTS */;
/*!40101 SET @OLD_COLLATION_CONNECTION=@@COLLATION_CONNECTION */;
/*!40101 SET NAMES utf8mb4 */;

--
-- Database: `capstone_db`
--

-- --------------------------------------------------------

--
-- Table structure for table `cache`
--

CREATE TABLE `cache` (
  `key` varchar(255) NOT NULL,
  `value` mediumtext NOT NULL,
  `expiration` int(11) NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------

--
-- Table structure for table `cache_locks`
--

CREATE TABLE `cache_locks` (
  `key` varchar(255) NOT NULL,
  `owner` varchar(255) NOT NULL,
  `expiration` int(11) NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------

--
-- Table structure for table `curriculum`
--

CREATE TABLE `curriculum` (
  `curriculum_id` int(11) NOT NULL,
  `program_id` int(11) NOT NULL,
  `subject_id` int(11) NOT NULL,
  `year_level` int(11) NOT NULL,
  `semester_id` int(11) NOT NULL,
  `passing_grade` int(11) DEFAULT NULL,
  `subject_type` varchar(50) DEFAULT NULL,
  `requisite_id` int(11) DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Dumping data for table `curriculum`
--

INSERT INTO `curriculum` (`curriculum_id`, `program_id`, `subject_id`, `year_level`, `semester_id`, `passing_grade`, `subject_type`, `requisite_id`) VALUES
(81, 1, 1, 1, 1, 50, 'core', NULL),
(82, 1, 2, 1, 1, 50, 'core', NULL),
(83, 1, 5, 1, 1, 50, 'minor', NULL),
(84, 1, 6, 1, 1, 50, 'minor', NULL),
(85, 1, 7, 1, 1, 50, 'minor', NULL),
(86, 1, 8, 1, 1, 50, 'minor', NULL),
(87, 1, 9, 1, 1, 50, 'minor', NULL),
(88, 1, 10, 1, 1, 50, 'minor', NULL),
(89, 1, 3, 1, 2, 50, 'core', 8),
(90, 1, 4, 1, 2, 50, 'core', 9),
(91, 1, 13, 1, 2, 50, 'core', 12),
(92, 1, 14, 1, 2, 50, 'minor', NULL),
(93, 1, 15, 1, 2, 50, 'minor', NULL),
(94, 1, 16, 1, 2, 50, 'minor', NULL),
(95, 1, 17, 1, 2, 50, 'minor', 10),
(96, 1, 18, 1, 2, 50, 'minor', 11),
(105, 1, 19, 2, 1, 50, 'core', 13),
(106, 1, 20, 2, 1, 50, 'core', 14),
(107, 1, 21, 2, 1, 50, 'core', NULL),
(108, 1, 22, 2, 1, 50, 'core', 15),
(109, 1, 23, 2, 1, 50, 'core', 16),
(110, 1, 24, 2, 1, 50, 'minor', NULL),
(111, 1, 25, 2, 1, 50, 'minor', 17),
(112, 1, 26, 2, 1, 50, 'minor', NULL);

-- --------------------------------------------------------

--
-- Table structure for table `failed_jobs`
--

CREATE TABLE `failed_jobs` (
  `id` bigint(20) UNSIGNED NOT NULL,
  `uuid` varchar(255) NOT NULL,
  `connection` text NOT NULL,
  `queue` text NOT NULL,
  `payload` longtext NOT NULL,
  `exception` longtext NOT NULL,
  `failed_at` timestamp NOT NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------

--
-- Table structure for table `jobs`
--

CREATE TABLE `jobs` (
  `id` bigint(20) UNSIGNED NOT NULL,
  `queue` varchar(255) NOT NULL,
  `payload` longtext NOT NULL,
  `attempts` tinyint(3) UNSIGNED NOT NULL,
  `reserved_at` int(10) UNSIGNED DEFAULT NULL,
  `available_at` int(10) UNSIGNED NOT NULL,
  `created_at` int(10) UNSIGNED NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------

--
-- Table structure for table `job_batches`
--

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
  `finished_at` int(11) DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------

--
-- Table structure for table `migrations`
--

CREATE TABLE `migrations` (
  `id` int(10) UNSIGNED NOT NULL,
  `migration` varchar(255) NOT NULL,
  `batch` int(11) NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Dumping data for table `migrations`
--

INSERT INTO `migrations` (`id`, `migration`, `batch`) VALUES
(1, '0001_01_01_000000_create_users_table', 1),
(2, '0001_01_01_000001_create_cache_table', 1),
(3, '0001_01_01_000002_create_jobs_table', 1),
(4, '2024_01_01_000000_create_capstone_lookup_tables', 1),
(5, '2024_01_01_000001_create_capstone_user_tables', 1),
(6, '2024_01_01_000002_create_capstone_subject_tables', 1),
(7, '2024_01_01_000003_create_capstone_enrollment_tables', 1),
(8, '2024_01_01_000004_create_capstone_request_tables', 1),
(10, '2024_01_01_000005_create_corequisite_table', 2),
(11, '2024_01_01_000007_create_simple_requisites_table', 3),
(12, '2024_01_01_000009_cleanup_requisite_column', 4),
(13, '2024_01_01_000010_final_cleanup', 5),
(14, '2024_01_01_000011_drop_old_requisite_tables', 5),
(16, '2024_01_01_000006_create_combined_requisites_table', 6),
(17, '2024_01_01_000008_update_curriculum_to_combined_requisites', 6),
(18, '2024_01_01_000012_remove_old_requisite_tables', 6),
(19, '2024_01_01_000013_remove_curriculum_requisite_columns', 7);

-- --------------------------------------------------------

--
-- Table structure for table `password_reset_tokens`
--

CREATE TABLE `password_reset_tokens` (
  `email` varchar(255) NOT NULL,
  `token` varchar(255) NOT NULL,
  `created_at` timestamp NULL DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------

--
-- Table structure for table `sessions`
--

CREATE TABLE `sessions` (
  `id` varchar(255) NOT NULL,
  `user_id` bigint(20) UNSIGNED DEFAULT NULL,
  `ip_address` varchar(45) DEFAULT NULL,
  `user_agent` text DEFAULT NULL,
  `payload` longtext NOT NULL,
  `last_activity` int(11) NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Dumping data for table `sessions`
--

INSERT INTO `sessions` (`id`, `user_id`, `ip_address`, `user_agent`, `payload`, `last_activity`) VALUES
('TnTeUe1HSAxXRMs7khpD5FyXpDvmZ3xRFfjz9LDm', 1, '127.0.0.1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/143.0.0.0 Safari/537.36', 'YTo0OntzOjY6Il90b2tlbiI7czo0MDoidEYxRWFBZUxlVEo5S29kbFJGMEFtS3J2bElvbnNVZG1sRVVoTndJWCI7czo2OiJfZmxhc2giO2E6Mjp7czozOiJvbGQiO2E6MDp7fXM6MzoibmV3IjthOjA6e319czo1MDoibG9naW5fd2ViXzU5YmEzNmFkZGMyYjJmOTQwMTU4MGYwMTRjN2Y1OGVhNGUzMDk4OWQiO2k6MTtzOjk6Il9wcmV2aW91cyI7YToyOntzOjM6InVybCI7czozODoiaHR0cDovL2xvY2FsaG9zdDo4MDAwL2FwaS9sb29rdXAvcm9sZXMiO3M6NToicm91dGUiO047fX0=', 1766900681);

-- --------------------------------------------------------

--
-- Table structure for table `tbl_academic_year`
--

CREATE TABLE `tbl_academic_year` (
  `academic_year_id` int(11) NOT NULL,
  `academic_year_name` varchar(50) NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Dumping data for table `tbl_academic_year`
--

INSERT INTO `tbl_academic_year` (`academic_year_id`, `academic_year_name`) VALUES
(1, '2023-2024');

-- --------------------------------------------------------

--
-- Table structure for table `tbl_campus`
--

CREATE TABLE `tbl_campus` (
  `campus_id` int(11) NOT NULL,
  `campus_name` varchar(100) NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Dumping data for table `tbl_campus`
--

INSERT INTO `tbl_campus` (`campus_id`, `campus_name`) VALUES
(1, 'Cagayan De oro College (COC)');

-- --------------------------------------------------------

--
-- Table structure for table `tbl_departments`
--

CREATE TABLE `tbl_departments` (
  `department_id` int(11) NOT NULL,
  `department_name` varchar(100) NOT NULL,
  `department_code` varchar(20) NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Dumping data for table `tbl_departments`
--

INSERT INTO `tbl_departments` (`department_id`, `department_name`, `department_code`) VALUES
(1, 'College of Information Technology', 'CITE');

-- --------------------------------------------------------

--
-- Table structure for table `tbl_enrollments`
--

CREATE TABLE `tbl_enrollments` (
  `enrollment_id` int(11) NOT NULL,
  `student_id` int(11) NOT NULL,
  `subject_id` int(11) NOT NULL,
  `academic_year_id` int(11) NOT NULL,
  `semester_id` int(11) NOT NULL,
  `grade` varchar(10) DEFAULT NULL,
  `status` varchar(50) DEFAULT NULL,
  `enrolled_date` date DEFAULT NULL,
  `section_id` int(11) DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------

--
-- Table structure for table `tbl_program`
--

CREATE TABLE `tbl_program` (
  `program_id` int(11) NOT NULL,
  `department_id` int(11) NOT NULL,
  `campus_id` int(11) NOT NULL,
  `program_code` varchar(50) DEFAULT NULL,
  `program_name` varchar(100) DEFAULT NULL,
  `total_units_required` int(11) DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Dumping data for table `tbl_program`
--

INSERT INTO `tbl_program` (`program_id`, `department_id`, `campus_id`, `program_code`, `program_name`, `total_units_required`) VALUES
(1, 1, 1, 'IT', 'Information Technology', 24);

-- --------------------------------------------------------

--
-- Table structure for table `tbl_requisites`
--

CREATE TABLE `tbl_requisites` (
  `requisite_id` int(11) NOT NULL,
  `subject_id` int(11) NOT NULL,
  `required_subject_id` int(11) NOT NULL,
  `requisite_type` enum('prerequisite','corequisite') NOT NULL,
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Dumping data for table `tbl_requisites`
--

INSERT INTO `tbl_requisites` (`requisite_id`, `subject_id`, `required_subject_id`, `requisite_type`, `created_at`, `updated_at`) VALUES
(8, 3, 2, 'prerequisite', '2025-12-27 05:55:50', '2025-12-27 05:55:50'),
(9, 4, 1, 'prerequisite', '2025-12-27 05:56:01', '2025-12-27 05:56:01'),
(10, 17, 9, 'prerequisite', '2025-12-27 05:56:21', '2025-12-27 05:56:21'),
(11, 18, 10, 'prerequisite', '2025-12-27 05:56:30', '2025-12-27 05:56:30'),
(12, 13, 6, 'prerequisite', '2025-12-27 07:23:41', '2025-12-27 07:23:41'),
(13, 19, 22, 'corequisite', '2025-12-27 09:09:19', '2025-12-27 09:09:19'),
(14, 20, 11, 'prerequisite', '2025-12-27 09:09:58', '2025-12-27 09:09:58'),
(15, 22, 11, 'prerequisite', '2025-12-27 09:11:14', '2025-12-27 09:11:14'),
(16, 23, 1, 'prerequisite', '2025-12-27 09:11:49', '2025-12-27 09:11:49'),
(17, 25, 17, 'prerequisite', '2025-12-27 09:12:10', '2025-12-27 09:12:10');

-- --------------------------------------------------------

--
-- Table structure for table `tbl_roles`
--

CREATE TABLE `tbl_roles` (
  `role_id` int(11) NOT NULL,
  `role_name` varchar(50) NOT NULL,
  `access_level` int(11) NOT NULL,
  `description` varchar(255) DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Dumping data for table `tbl_roles`
--

INSERT INTO `tbl_roles` (`role_id`, `role_name`, `access_level`, `description`) VALUES
(1, 'Admin', 10, 'Administrator with full access'),
(2, 'Faculty', 9, 'Tits-er'),
(3, 'Student', 5, 'Estuden');

-- --------------------------------------------------------

--
-- Table structure for table `tbl_section`
--

CREATE TABLE `tbl_section` (
  `section_id` int(11) NOT NULL,
  `section_name` varchar(50) DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Dumping data for table `tbl_section`
--

INSERT INTO `tbl_section` (`section_id`, `section_name`) VALUES
(1, 'FAB-BSIT1-01');

-- --------------------------------------------------------

--
-- Table structure for table `tbl_semester`
--

CREATE TABLE `tbl_semester` (
  `semester_id` int(11) NOT NULL,
  `semester_name` varchar(50) NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Dumping data for table `tbl_semester`
--

INSERT INTO `tbl_semester` (`semester_id`, `semester_name`) VALUES
(1, '1st Semester'),
(2, '2nd Semester');

-- --------------------------------------------------------

--
-- Table structure for table `tbl_shifting_request`
--

CREATE TABLE `tbl_shifting_request` (
  `request_id` int(11) NOT NULL,
  `student_id` int(11) NOT NULL,
  `subject_id` int(11) DEFAULT NULL,
  `request_date` date DEFAULT NULL,
  `request_type` varchar(50) DEFAULT NULL,
  `reason` varchar(255) DEFAULT NULL,
  `status` varchar(50) DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------

--
-- Table structure for table `tbl_student_profile`
--

CREATE TABLE `tbl_student_profile` (
  `student_id` int(11) NOT NULL,
  `user_id` int(11) NOT NULL,
  `student_number` int(11) NOT NULL,
  `contact_number` varchar(20) DEFAULT NULL,
  `full_name` varchar(150) DEFAULT NULL,
  `academic_status` varchar(50) DEFAULT NULL,
  `current_program` int(11) DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------

--
-- Table structure for table `tbl_student_program_history`
--

CREATE TABLE `tbl_student_program_history` (
  `history_id` int(11) NOT NULL,
  `request_id` int(11) NOT NULL,
  `program_id` int(11) NOT NULL,
  `academic_year_id` int(11) NOT NULL,
  `semester_id` int(11) NOT NULL,
  `date_changed` date DEFAULT NULL,
  `remarks` varchar(255) DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------

--
-- Table structure for table `tbl_student_standing_subject`
--

CREATE TABLE `tbl_student_standing_subject` (
  `student_subject_id` int(11) NOT NULL,
  `student_id` int(11) NOT NULL,
  `subject_id` int(11) NOT NULL,
  `off_sem` varchar(50) DEFAULT NULL,
  `evaluation_status` varchar(50) DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------

--
-- Table structure for table `tbl_subjects`
--

CREATE TABLE `tbl_subjects` (
  `subject_id` int(11) NOT NULL,
  `subject_code` varchar(50) NOT NULL,
  `subject_name` varchar(100) NOT NULL,
  `number_of_units` int(11) DEFAULT NULL,
  `number_of_hrs` int(11) DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Dumping data for table `tbl_subjects`
--

INSERT INTO `tbl_subjects` (`subject_id`, `subject_code`, `subject_name`, `number_of_units`, `number_of_hrs`) VALUES
(1, 'ITE 366', 'Introduction to Computing (Including IT Fundamentals)', 3, 3),
(2, 'ITE 260', 'Computer Programming 1', 3, 3),
(3, 'ITE 186', 'Computer Programming 2', 3, 3),
(4, 'ITE 399', 'Human Computer Interaction 1', 3, 3),
(5, 'GEN 002', 'UNDERSTAND THE SELF', 3, 3),
(6, 'MAT 152', 'Mathematics in the Modern World', 3, 3),
(7, 'GEN 001', 'Purposive Communication', 3, 3),
(8, 'GEN 006', 'Ethics', 3, 3),
(9, 'PED 030', 'Physical Activities Towards Health and Fitness(PATHFit1) Movement Competency Training', 2, 2),
(10, 'NST 021', 'National Service Training Program 1', 3, 3),
(11, 'ITE 186', 'Computer Programming 2', 3, 3),
(12, 'ITE 399', 'Human Computer Interaction 1', 3, 3),
(13, 'ITE 048', 'Discrete Structures', 3, 3),
(14, 'GEN 008', 'Living in the IT Era', 3, 3),
(15, 'ART 002', 'Art Appreciation', 3, 3),
(16, 'GEN 005', 'The Contemporary World', 3, 3),
(17, 'PED 031', 'Physical Activities Towards Health and Fitness 2 (PATHFit 2) Exercise-based Fitness Activity', 2, 2),
(18, 'NST 022', 'National Service Training Program 2', 3, 3),
(19, 'ITE 298', 'Information Management (Including Fundamentals of Database Systems)', 3, 3),
(20, 'ITE 300', 'Object-Oriented Programming', 3, 3),
(21, 'ITE 292', 'Networking 1', 3, 3),
(22, 'ITE 031', 'Data Structure and Algorithms', 3, 3),
(23, 'ITE 083', 'IT Project Management', 3, 3),
(24, 'GEN 003', 'Science, Technology, and Society', 3, 3),
(25, 'PED 032', 'Physical Activities Towards Health and Fitness (PATHFit 3) Individual and Dual Sports', 2, 2),
(26, 'SSP 005', 'Student Success Program 1', 1, 1);

-- --------------------------------------------------------

--
-- Table structure for table `tbl_users`
--

CREATE TABLE `tbl_users` (
  `user_id` int(11) NOT NULL,
  `email` varchar(100) NOT NULL,
  `password` varchar(255) NOT NULL,
  `contact_number` varchar(20) DEFAULT NULL,
  `role_id` int(11) DEFAULT NULL,
  `status` varchar(50) DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Dumping data for table `tbl_users`
--

INSERT INTO `tbl_users` (`user_id`, `email`, `password`, `contact_number`, `role_id`, `status`) VALUES
(1, 'admin@example.com', '$2y$12$UiWggmUHq8.NoKA4YPowoOUTm2Zg3yG6.aV3FzNcNaUCKJU3lRFAK', NULL, 1, 'active');

-- --------------------------------------------------------

--
-- Table structure for table `tbl_verification_records`
--

CREATE TABLE `tbl_verification_records` (
  `verification_id` int(11) NOT NULL,
  `request_id` int(11) NOT NULL,
  `verifier_id` int(11) NOT NULL,
  `verification_date` datetime DEFAULT NULL,
  `decision` varchar(50) DEFAULT NULL,
  `comments` varchar(255) DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------

--
-- Table structure for table `users`
--

CREATE TABLE `users` (
  `id` bigint(20) UNSIGNED NOT NULL,
  `name` varchar(255) NOT NULL,
  `email` varchar(255) NOT NULL,
  `email_verified_at` timestamp NULL DEFAULT NULL,
  `password` varchar(255) NOT NULL,
  `remember_token` varchar(100) DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------

--
-- Table structure for table `year_level`
--

CREATE TABLE `year_level` (
  `year_level_id` int(11) NOT NULL,
  `year_level` varchar(50) NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Dumping data for table `year_level`
--

INSERT INTO `year_level` (`year_level_id`, `year_level`) VALUES
(1, '1st Year'),
(2, '2nd Year'),
(3, '3rd Year'),
(4, '4th Year'),
(5, '5th Year');

--
-- Indexes for dumped tables
--

--
-- Indexes for table `cache`
--
ALTER TABLE `cache`
  ADD PRIMARY KEY (`key`);

--
-- Indexes for table `cache_locks`
--
ALTER TABLE `cache_locks`
  ADD PRIMARY KEY (`key`);

--
-- Indexes for table `curriculum`
--
ALTER TABLE `curriculum`
  ADD PRIMARY KEY (`curriculum_id`),
  ADD KEY `fk_curriculum_program` (`program_id`),
  ADD KEY `fk_curriculum_subject` (`subject_id`),
  ADD KEY `fk_curriculum_year` (`year_level`),
  ADD KEY `fk_curriculum_semester` (`semester_id`),
  ADD KEY `fk_curriculum_requisite` (`requisite_id`);

--
-- Indexes for table `failed_jobs`
--
ALTER TABLE `failed_jobs`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `failed_jobs_uuid_unique` (`uuid`);

--
-- Indexes for table `jobs`
--
ALTER TABLE `jobs`
  ADD PRIMARY KEY (`id`),
  ADD KEY `jobs_queue_index` (`queue`);

--
-- Indexes for table `job_batches`
--
ALTER TABLE `job_batches`
  ADD PRIMARY KEY (`id`);

--
-- Indexes for table `migrations`
--
ALTER TABLE `migrations`
  ADD PRIMARY KEY (`id`);

--
-- Indexes for table `password_reset_tokens`
--
ALTER TABLE `password_reset_tokens`
  ADD PRIMARY KEY (`email`);

--
-- Indexes for table `sessions`
--
ALTER TABLE `sessions`
  ADD PRIMARY KEY (`id`),
  ADD KEY `sessions_user_id_index` (`user_id`),
  ADD KEY `sessions_last_activity_index` (`last_activity`);

--
-- Indexes for table `tbl_academic_year`
--
ALTER TABLE `tbl_academic_year`
  ADD PRIMARY KEY (`academic_year_id`);

--
-- Indexes for table `tbl_campus`
--
ALTER TABLE `tbl_campus`
  ADD PRIMARY KEY (`campus_id`);

--
-- Indexes for table `tbl_departments`
--
ALTER TABLE `tbl_departments`
  ADD PRIMARY KEY (`department_id`);

--
-- Indexes for table `tbl_enrollments`
--
ALTER TABLE `tbl_enrollments`
  ADD PRIMARY KEY (`enrollment_id`),
  ADD KEY `fk_enroll_student` (`student_id`),
  ADD KEY `fk_enroll_subject` (`subject_id`),
  ADD KEY `fk_enroll_year` (`academic_year_id`),
  ADD KEY `fk_enroll_semester` (`semester_id`),
  ADD KEY `fk_enroll_section` (`section_id`);

--
-- Indexes for table `tbl_program`
--
ALTER TABLE `tbl_program`
  ADD PRIMARY KEY (`program_id`),
  ADD KEY `fk_program_department` (`department_id`),
  ADD KEY `fk_program_campus` (`campus_id`);

--
-- Indexes for table `tbl_requisites`
--
ALTER TABLE `tbl_requisites`
  ADD PRIMARY KEY (`requisite_id`),
  ADD UNIQUE KEY `unique_requisite` (`subject_id`,`required_subject_id`,`requisite_type`),
  ADD KEY `fk_req_required` (`required_subject_id`);

--
-- Indexes for table `tbl_roles`
--
ALTER TABLE `tbl_roles`
  ADD PRIMARY KEY (`role_id`);

--
-- Indexes for table `tbl_section`
--
ALTER TABLE `tbl_section`
  ADD PRIMARY KEY (`section_id`);

--
-- Indexes for table `tbl_semester`
--
ALTER TABLE `tbl_semester`
  ADD PRIMARY KEY (`semester_id`);

--
-- Indexes for table `tbl_shifting_request`
--
ALTER TABLE `tbl_shifting_request`
  ADD PRIMARY KEY (`request_id`),
  ADD KEY `fk_shift_student` (`student_id`),
  ADD KEY `fk_shift_subject` (`subject_id`);

--
-- Indexes for table `tbl_student_profile`
--
ALTER TABLE `tbl_student_profile`
  ADD PRIMARY KEY (`student_id`),
  ADD KEY `fk_student_user` (`user_id`),
  ADD KEY `fk_student_program` (`current_program`);

--
-- Indexes for table `tbl_student_program_history`
--
ALTER TABLE `tbl_student_program_history`
  ADD PRIMARY KEY (`history_id`),
  ADD KEY `fk_history_request` (`request_id`),
  ADD KEY `fk_history_program` (`program_id`),
  ADD KEY `fk_history_year` (`academic_year_id`),
  ADD KEY `fk_history_semester` (`semester_id`);

--
-- Indexes for table `tbl_student_standing_subject`
--
ALTER TABLE `tbl_student_standing_subject`
  ADD PRIMARY KEY (`student_subject_id`),
  ADD KEY `fk_standing_student` (`student_id`),
  ADD KEY `fk_standing_subject` (`subject_id`);

--
-- Indexes for table `tbl_subjects`
--
ALTER TABLE `tbl_subjects`
  ADD PRIMARY KEY (`subject_id`);

--
-- Indexes for table `tbl_users`
--
ALTER TABLE `tbl_users`
  ADD PRIMARY KEY (`user_id`),
  ADD KEY `fk_users_role` (`role_id`);

--
-- Indexes for table `tbl_verification_records`
--
ALTER TABLE `tbl_verification_records`
  ADD PRIMARY KEY (`verification_id`),
  ADD KEY `fk_verify_request` (`request_id`),
  ADD KEY `fk_verify_user` (`verifier_id`);

--
-- Indexes for table `users`
--
ALTER TABLE `users`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `users_email_unique` (`email`);

--
-- Indexes for table `year_level`
--
ALTER TABLE `year_level`
  ADD PRIMARY KEY (`year_level_id`);

--
-- AUTO_INCREMENT for dumped tables
--

--
-- AUTO_INCREMENT for table `curriculum`
--
ALTER TABLE `curriculum`
  MODIFY `curriculum_id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=113;

--
-- AUTO_INCREMENT for table `failed_jobs`
--
ALTER TABLE `failed_jobs`
  MODIFY `id` bigint(20) UNSIGNED NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `jobs`
--
ALTER TABLE `jobs`
  MODIFY `id` bigint(20) UNSIGNED NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `migrations`
--
ALTER TABLE `migrations`
  MODIFY `id` int(10) UNSIGNED NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=20;

--
-- AUTO_INCREMENT for table `tbl_academic_year`
--
ALTER TABLE `tbl_academic_year`
  MODIFY `academic_year_id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=2;

--
-- AUTO_INCREMENT for table `tbl_campus`
--
ALTER TABLE `tbl_campus`
  MODIFY `campus_id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=2;

--
-- AUTO_INCREMENT for table `tbl_departments`
--
ALTER TABLE `tbl_departments`
  MODIFY `department_id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=2;

--
-- AUTO_INCREMENT for table `tbl_enrollments`
--
ALTER TABLE `tbl_enrollments`
  MODIFY `enrollment_id` int(11) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `tbl_program`
--
ALTER TABLE `tbl_program`
  MODIFY `program_id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=2;

--
-- AUTO_INCREMENT for table `tbl_requisites`
--
ALTER TABLE `tbl_requisites`
  MODIFY `requisite_id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=19;

--
-- AUTO_INCREMENT for table `tbl_roles`
--
ALTER TABLE `tbl_roles`
  MODIFY `role_id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=4;

--
-- AUTO_INCREMENT for table `tbl_section`
--
ALTER TABLE `tbl_section`
  MODIFY `section_id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=2;

--
-- AUTO_INCREMENT for table `tbl_semester`
--
ALTER TABLE `tbl_semester`
  MODIFY `semester_id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=3;

--
-- AUTO_INCREMENT for table `tbl_shifting_request`
--
ALTER TABLE `tbl_shifting_request`
  MODIFY `request_id` int(11) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `tbl_student_profile`
--
ALTER TABLE `tbl_student_profile`
  MODIFY `student_id` int(11) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `tbl_student_program_history`
--
ALTER TABLE `tbl_student_program_history`
  MODIFY `history_id` int(11) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `tbl_student_standing_subject`
--
ALTER TABLE `tbl_student_standing_subject`
  MODIFY `student_subject_id` int(11) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `tbl_subjects`
--
ALTER TABLE `tbl_subjects`
  MODIFY `subject_id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=27;

--
-- AUTO_INCREMENT for table `tbl_users`
--
ALTER TABLE `tbl_users`
  MODIFY `user_id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=2;

--
-- AUTO_INCREMENT for table `tbl_verification_records`
--
ALTER TABLE `tbl_verification_records`
  MODIFY `verification_id` int(11) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `users`
--
ALTER TABLE `users`
  MODIFY `id` bigint(20) UNSIGNED NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `year_level`
--
ALTER TABLE `year_level`
  MODIFY `year_level_id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=6;

--
-- Constraints for dumped tables
--

--
-- Constraints for table `curriculum`
--
ALTER TABLE `curriculum`
  ADD CONSTRAINT `fk_curriculum_program` FOREIGN KEY (`program_id`) REFERENCES `tbl_program` (`program_id`),
  ADD CONSTRAINT `fk_curriculum_requisite` FOREIGN KEY (`requisite_id`) REFERENCES `tbl_requisites` (`requisite_id`) ON DELETE SET NULL,
  ADD CONSTRAINT `fk_curriculum_semester` FOREIGN KEY (`semester_id`) REFERENCES `tbl_semester` (`semester_id`),
  ADD CONSTRAINT `fk_curriculum_subject` FOREIGN KEY (`subject_id`) REFERENCES `tbl_subjects` (`subject_id`),
  ADD CONSTRAINT `fk_curriculum_year` FOREIGN KEY (`year_level`) REFERENCES `year_level` (`year_level_id`);

--
-- Constraints for table `tbl_enrollments`
--
ALTER TABLE `tbl_enrollments`
  ADD CONSTRAINT `fk_enroll_section` FOREIGN KEY (`section_id`) REFERENCES `tbl_section` (`section_id`) ON DELETE SET NULL,
  ADD CONSTRAINT `fk_enroll_semester` FOREIGN KEY (`semester_id`) REFERENCES `tbl_semester` (`semester_id`),
  ADD CONSTRAINT `fk_enroll_student` FOREIGN KEY (`student_id`) REFERENCES `tbl_student_profile` (`student_id`),
  ADD CONSTRAINT `fk_enroll_subject` FOREIGN KEY (`subject_id`) REFERENCES `tbl_subjects` (`subject_id`),
  ADD CONSTRAINT `fk_enroll_year` FOREIGN KEY (`academic_year_id`) REFERENCES `tbl_academic_year` (`academic_year_id`);

--
-- Constraints for table `tbl_program`
--
ALTER TABLE `tbl_program`
  ADD CONSTRAINT `fk_program_campus` FOREIGN KEY (`campus_id`) REFERENCES `tbl_campus` (`campus_id`),
  ADD CONSTRAINT `fk_program_department` FOREIGN KEY (`department_id`) REFERENCES `tbl_departments` (`department_id`);

--
-- Constraints for table `tbl_requisites`
--
ALTER TABLE `tbl_requisites`
  ADD CONSTRAINT `fk_req_required` FOREIGN KEY (`required_subject_id`) REFERENCES `tbl_subjects` (`subject_id`) ON DELETE CASCADE,
  ADD CONSTRAINT `fk_req_subject` FOREIGN KEY (`subject_id`) REFERENCES `tbl_subjects` (`subject_id`) ON DELETE CASCADE;

--
-- Constraints for table `tbl_shifting_request`
--
ALTER TABLE `tbl_shifting_request`
  ADD CONSTRAINT `fk_shift_student` FOREIGN KEY (`student_id`) REFERENCES `tbl_student_profile` (`student_id`),
  ADD CONSTRAINT `fk_shift_subject` FOREIGN KEY (`subject_id`) REFERENCES `tbl_subjects` (`subject_id`) ON DELETE SET NULL;

--
-- Constraints for table `tbl_student_profile`
--
ALTER TABLE `tbl_student_profile`
  ADD CONSTRAINT `fk_student_program` FOREIGN KEY (`current_program`) REFERENCES `tbl_program` (`program_id`) ON DELETE SET NULL,
  ADD CONSTRAINT `fk_student_user` FOREIGN KEY (`user_id`) REFERENCES `tbl_users` (`user_id`);

--
-- Constraints for table `tbl_student_program_history`
--
ALTER TABLE `tbl_student_program_history`
  ADD CONSTRAINT `fk_history_program` FOREIGN KEY (`program_id`) REFERENCES `tbl_program` (`program_id`),
  ADD CONSTRAINT `fk_history_request` FOREIGN KEY (`request_id`) REFERENCES `tbl_shifting_request` (`request_id`),
  ADD CONSTRAINT `fk_history_semester` FOREIGN KEY (`semester_id`) REFERENCES `tbl_semester` (`semester_id`),
  ADD CONSTRAINT `fk_history_year` FOREIGN KEY (`academic_year_id`) REFERENCES `tbl_academic_year` (`academic_year_id`);

--
-- Constraints for table `tbl_student_standing_subject`
--
ALTER TABLE `tbl_student_standing_subject`
  ADD CONSTRAINT `fk_standing_student` FOREIGN KEY (`student_id`) REFERENCES `tbl_student_profile` (`student_id`),
  ADD CONSTRAINT `fk_standing_subject` FOREIGN KEY (`subject_id`) REFERENCES `tbl_subjects` (`subject_id`);

--
-- Constraints for table `tbl_users`
--
ALTER TABLE `tbl_users`
  ADD CONSTRAINT `fk_users_role` FOREIGN KEY (`role_id`) REFERENCES `tbl_roles` (`role_id`) ON DELETE SET NULL;

--
-- Constraints for table `tbl_verification_records`
--
ALTER TABLE `tbl_verification_records`
  ADD CONSTRAINT `fk_verify_request` FOREIGN KEY (`request_id`) REFERENCES `tbl_shifting_request` (`request_id`),
  ADD CONSTRAINT `fk_verify_user` FOREIGN KEY (`verifier_id`) REFERENCES `tbl_users` (`user_id`);
COMMIT;

/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;
/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;
