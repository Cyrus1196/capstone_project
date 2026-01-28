-- phpMyAdmin SQL Dump
-- version 5.2.1
-- https://www.phpmyadmin.net/
--
-- Host: 127.0.0.1
-- Generation Time: Jan 24, 2026 at 02:49 PM
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
  `curriculum_header_id` int(11) DEFAULT NULL,
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

INSERT INTO `curriculum` (`curriculum_id`, `curriculum_header_id`, `program_id`, `subject_id`, `year_level`, `semester_id`, `passing_grade`, `subject_type`, `requisite_id`) VALUES
(81, NULL, 1, 1, 1, 1, 50, 'core', NULL),
(82, NULL, 1, 2, 1, 1, 50, 'core', NULL),
(83, NULL, 1, 5, 1, 1, 50, 'minor', NULL),
(84, NULL, 1, 6, 1, 1, 50, 'minor', NULL),
(85, NULL, 1, 7, 1, 1, 50, 'minor', NULL),
(86, NULL, 1, 8, 1, 1, 50, 'minor', NULL),
(87, NULL, 1, 9, 1, 1, 50, 'minor', NULL),
(88, NULL, 1, 10, 1, 1, 50, 'minor', NULL),
(89, NULL, 1, 3, 1, 2, 50, 'core', 8),
(90, NULL, 1, 4, 1, 2, 50, 'core', 9),
(91, NULL, 1, 13, 1, 2, 50, 'core', 12),
(92, NULL, 1, 14, 1, 2, 50, 'minor', NULL),
(93, NULL, 1, 15, 1, 2, 50, 'minor', NULL),
(94, NULL, 1, 16, 1, 2, 50, 'minor', NULL),
(95, NULL, 1, 17, 1, 2, 50, 'minor', 10),
(96, NULL, 1, 18, 1, 2, 50, 'minor', 11),
(105, NULL, 1, 19, 2, 1, 50, 'core', 13),
(106, NULL, 1, 20, 2, 1, 50, 'core', 14),
(107, NULL, 1, 21, 2, 1, 50, 'core', NULL),
(108, NULL, 1, 22, 2, 1, 50, 'core', 15),
(109, NULL, 1, 23, 2, 1, 50, 'core', 16),
(110, NULL, 1, 24, 2, 1, 50, 'minor', NULL),
(111, NULL, 1, 25, 2, 1, 50, 'minor', 17),
(112, NULL, 1, 26, 2, 1, 50, 'minor', NULL);

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
(1, '2025_01_14_000001_restore_database_backup', 1),
(2, '2026_01_15_025448_create_tbl_evaluation_table', 1),
(3, '2026_01_15_050738_create_dean_profile_table', 2),
(5, '2026_01_15_120423_create_departments_table', 3),
(6, '2026_01_15_025351_alter_tbl_evaluation_table_add_enhancements', 4),
(7, '2026_01_15_210000_expand_department_code_length', 5),
(8, '2026_01_16_000001_create_track_table', 5),
(9, '2026_01_16_000002_create_curriculum_header_table', 5),
(10, '2026_01_16_000003_create_offered_subject_table', 5),
(11, '2026_01_16_000004_create_elective_subject_table', 5),
(12, '2026_01_16_000005_update_departments_add_campus_id', 5),
(13, '2026_01_16_000006_update_student_profile_to_match_erd', 5),
(14, '2026_01_16_000007_update_curriculum_to_match_erd', 5),
(15, '2026_01_16_000008_update_prerequisite_to_match_erd', 5),
(16, '2026_01_16_000009_add_status_to_semester_and_academic_year', 5);

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
('80uKy1HAzrWuyXUHMNfDXVQ6TArNIBRlWbC7zVvn', NULL, '127.0.0.1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/144.0.0.0 Safari/537.36', 'YTozOntzOjY6Il90b2tlbiI7czo0MDoiOVNoTk03SUhMa05GUWo2dzk1TklkTUlhWUpPVW0yU29wREdyOEpBMyI7czo5OiJfcHJldmlvdXMiO2E6Mjp7czozOiJ1cmwiO3M6MzA6Imh0dHA6Ly9sb2NhbGhvc3Q6ODAwMC9hcGkvdXNlciI7czo1OiJyb3V0ZSI7Tjt9czo2OiJfZmxhc2giO2E6Mjp7czozOiJvbGQiO2E6MDp7fXM6MzoibmV3IjthOjA6e319fQ==', 1769261323),
('KKO40mixzJrsIJ3DqchGo0bDq5oxH8D9exjedpKc', 1, '127.0.0.1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/144.0.0.0 Safari/537.36', 'YTo0OntzOjY6Il90b2tlbiI7czo0MDoiZzZacjNmSnBRdU1PS2xDVFJMWGJza0VlZmVnSnhwSDNaTHZhdnVGWiI7czo5OiJfcHJldmlvdXMiO2E6Mjp7czozOiJ1cmwiO3M6NDQ6Imh0dHA6Ly9sb2NhbGhvc3Q6ODAwMC9hcGkvbG9va3VwL2RlcGFydG1lbnRzIjtzOjU6InJvdXRlIjtOO31zOjY6Il9mbGFzaCI7YToyOntzOjM6Im9sZCI7YTowOnt9czozOiJuZXciO2E6MDp7fX1zOjUwOiJsb2dpbl93ZWJfNTliYTM2YWRkYzJiMmY5NDAxNTgwZjAxNGM3ZjU4ZWE0ZTMwOTg5ZCI7aToxO30=', 1769261905);

-- --------------------------------------------------------

--
-- Table structure for table `tbl_academic_year`
--

CREATE TABLE `tbl_academic_year` (
  `academic_year_id` int(11) NOT NULL,
  `academic_year_name` varchar(50) NOT NULL,
  `status` varchar(50) DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Dumping data for table `tbl_academic_year`
--

INSERT INTO `tbl_academic_year` (`academic_year_id`, `academic_year_name`, `status`) VALUES
(1, '2023-2024', NULL);

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
-- Table structure for table `tbl_curriculum_header`
--

CREATE TABLE `tbl_curriculum_header` (
  `curriculum_header_id` int(11) NOT NULL,
  `program_id` int(11) NOT NULL,
  `Effective_Year` int(11) NOT NULL,
  `description` varchar(255) DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------

--
-- Table structure for table `tbl_dean_profile`
--

CREATE TABLE `tbl_dean_profile` (
  `dean_id` bigint(20) UNSIGNED NOT NULL,
  `user_id` int(11) NOT NULL,
  `program_id` int(11) NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Dumping data for table `tbl_dean_profile`
--

INSERT INTO `tbl_dean_profile` (`dean_id`, `user_id`, `program_id`) VALUES
(1, 15, 1);

-- --------------------------------------------------------

--
-- Table structure for table `tbl_departments`
--

CREATE TABLE `tbl_departments` (
  `department_id` int(11) NOT NULL,
  `campus_id` int(11) DEFAULT NULL,
  `department_name` varchar(100) NOT NULL,
  `department_code` varchar(255) NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Dumping data for table `tbl_departments`
--

INSERT INTO `tbl_departments` (`department_id`, `campus_id`, `department_name`, `department_code`) VALUES
(1, NULL, 'Information Technology', 'IT'),
(2, NULL, 'College of Engineering Architecture', 'CEA');

-- --------------------------------------------------------

--
-- Table structure for table `tbl_elective_subject`
--

CREATE TABLE `tbl_elective_subject` (
  `elective_subject_id` int(11) NOT NULL,
  `track_id` int(11) NOT NULL,
  `subject_id` int(11) NOT NULL,
  `description` varchar(255) DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------

--
-- Table structure for table `tbl_evaluation`
--

CREATE TABLE `tbl_evaluation` (
  `evaluation_id` bigint(20) UNSIGNED NOT NULL,
  `student_id` int(11) NOT NULL,
  `subject_id` int(11) NOT NULL,
  `academic_year_id` int(11) NOT NULL,
  `semester_id` int(11) NOT NULL,
  `grade` varchar(255) DEFAULT NULL,
  `evaluation_status` varchar(255) DEFAULT NULL,
  `enrolled_date` date DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------

--
-- Table structure for table `tbl_offered_subject`
--

CREATE TABLE `tbl_offered_subject` (
  `offered_subject_id` int(11) NOT NULL,
  `subject_id` int(11) NOT NULL,
  `academic_year_id` int(11) NOT NULL,
  `semester_id` int(11) NOT NULL,
  `program_id` int(11) NOT NULL,
  `track_id` int(11) DEFAULT NULL,
  `year_level_id` int(11) DEFAULT NULL,
  `status` varchar(50) DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------

--
-- Table structure for table `tbl_prerequisite`
--

CREATE TABLE `tbl_prerequisite` (
  `requisites_id` int(11) NOT NULL,
  `subject_id` int(11) NOT NULL,
  `requisite_type` varchar(50) NOT NULL,
  `requisites_subject_id` int(11) NOT NULL
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
(2, 'Faculty', 8, 'Tits-er'),
(3, 'Student', 5, 'Estuden'),
(4, 'Dean', 9, NULL);

-- --------------------------------------------------------

--
-- Table structure for table `tbl_semester`
--

CREATE TABLE `tbl_semester` (
  `semester_id` int(11) NOT NULL,
  `semester_name` varchar(50) NOT NULL,
  `status` varchar(50) DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Dumping data for table `tbl_semester`
--

INSERT INTO `tbl_semester` (`semester_id`, `semester_name`, `status`) VALUES
(1, '1st Semester', NULL),
(2, '2nd Semester', NULL);

-- --------------------------------------------------------

--
-- Table structure for table `tbl_student_profile`
--

CREATE TABLE `tbl_student_profile` (
  `student_id` int(11) NOT NULL,
  `user_id` int(11) NOT NULL,
  `student_number` int(11) NOT NULL,
  `first_name` varchar(100) DEFAULT NULL,
  `middle_name` varchar(100) DEFAULT NULL,
  `last_name` varchar(100) DEFAULT NULL,
  `address` varchar(255) DEFAULT NULL,
  `contact_number` varchar(20) DEFAULT NULL,
  `academic_status` varchar(50) DEFAULT NULL,
  `year_level_id` int(11) DEFAULT NULL,
  `track_id` int(11) DEFAULT NULL,
  `current_program` int(11) DEFAULT NULL
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
-- Table structure for table `tbl_track`
--

CREATE TABLE `tbl_track` (
  `track_id` int(11) NOT NULL,
  `track_code` varchar(50) NOT NULL,
  `track_name` varchar(100) NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

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
(1, 'admin@example.com', '$2y$12$UiWggmUHq8.NoKA4YPowoOUTm2Zg3yG6.aV3FzNcNaUCKJU3lRFAK', NULL, 1, 'active'),
(2, 'student@example.com', '$2y$12$b1U.OcKusIbSEx8/wqS8b.yU0twkTGdExnXEKNke5Xud50obGOjw2', NULL, 3, 'active'),
(8, 'student2@example.com', '$2y$12$8uzkn1jNh5aGkjj8Ht2Tzet2Z6PdvdDTcDLk6fsh5SwmZ6w8VLDQa', NULL, 3, 'active'),
(15, 'dean@example.com', '$2y$12$EVUQPi5mppfQTNa7E2RfvuhM2LYp/xjse2OUTBRuOExN9s2u2XSei', NULL, 4, 'active');

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
  ADD KEY `fk_curriculum_requisite` (`requisite_id`),
  ADD KEY `curriculum_curriculum_header_id_foreign` (`curriculum_header_id`);

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
-- Indexes for table `tbl_curriculum_header`
--
ALTER TABLE `tbl_curriculum_header`
  ADD PRIMARY KEY (`curriculum_header_id`),
  ADD KEY `tbl_curriculum_header_program_id_foreign` (`program_id`);

--
-- Indexes for table `tbl_dean_profile`
--
ALTER TABLE `tbl_dean_profile`
  ADD PRIMARY KEY (`dean_id`),
  ADD KEY `tbl_dean_profile_user_id_foreign` (`user_id`),
  ADD KEY `tbl_dean_profile_program_id_foreign` (`program_id`);

--
-- Indexes for table `tbl_departments`
--
ALTER TABLE `tbl_departments`
  ADD PRIMARY KEY (`department_id`),
  ADD KEY `tbl_departments_campus_id_foreign` (`campus_id`);

--
-- Indexes for table `tbl_elective_subject`
--
ALTER TABLE `tbl_elective_subject`
  ADD PRIMARY KEY (`elective_subject_id`),
  ADD KEY `tbl_elective_subject_track_id_foreign` (`track_id`),
  ADD KEY `tbl_elective_subject_subject_id_foreign` (`subject_id`);

--
-- Indexes for table `tbl_evaluation`
--
ALTER TABLE `tbl_evaluation`
  ADD PRIMARY KEY (`evaluation_id`),
  ADD KEY `tbl_evaluation_student_id_foreign` (`student_id`),
  ADD KEY `tbl_evaluation_subject_id_foreign` (`subject_id`),
  ADD KEY `tbl_evaluation_academic_year_id_foreign` (`academic_year_id`),
  ADD KEY `tbl_evaluation_semester_id_foreign` (`semester_id`);

--
-- Indexes for table `tbl_offered_subject`
--
ALTER TABLE `tbl_offered_subject`
  ADD PRIMARY KEY (`offered_subject_id`),
  ADD KEY `tbl_offered_subject_subject_id_foreign` (`subject_id`),
  ADD KEY `tbl_offered_subject_academic_year_id_foreign` (`academic_year_id`),
  ADD KEY `tbl_offered_subject_semester_id_foreign` (`semester_id`),
  ADD KEY `tbl_offered_subject_program_id_foreign` (`program_id`),
  ADD KEY `tbl_offered_subject_track_id_foreign` (`track_id`),
  ADD KEY `tbl_offered_subject_year_level_id_foreign` (`year_level_id`);

--
-- Indexes for table `tbl_prerequisite`
--
ALTER TABLE `tbl_prerequisite`
  ADD PRIMARY KEY (`requisites_id`),
  ADD KEY `tbl_prerequisite_subject_id_foreign` (`subject_id`),
  ADD KEY `tbl_prerequisite_requisites_subject_id_foreign` (`requisites_subject_id`);

--
-- Indexes for table `tbl_program`
--
ALTER TABLE `tbl_program`
  ADD PRIMARY KEY (`program_id`),
  ADD KEY `fk_program_department` (`department_id`),
  ADD KEY `fk_program_campus` (`campus_id`);

--
-- Indexes for table `tbl_roles`
--
ALTER TABLE `tbl_roles`
  ADD PRIMARY KEY (`role_id`);

--
-- Indexes for table `tbl_semester`
--
ALTER TABLE `tbl_semester`
  ADD PRIMARY KEY (`semester_id`);

--
-- Indexes for table `tbl_student_profile`
--
ALTER TABLE `tbl_student_profile`
  ADD PRIMARY KEY (`student_id`),
  ADD KEY `fk_student_user` (`user_id`),
  ADD KEY `fk_student_program` (`current_program`),
  ADD KEY `tbl_student_profile_year_level_id_foreign` (`year_level_id`),
  ADD KEY `tbl_student_profile_track_id_foreign` (`track_id`);

--
-- Indexes for table `tbl_subjects`
--
ALTER TABLE `tbl_subjects`
  ADD PRIMARY KEY (`subject_id`);

--
-- Indexes for table `tbl_track`
--
ALTER TABLE `tbl_track`
  ADD PRIMARY KEY (`track_id`);

--
-- Indexes for table `tbl_users`
--
ALTER TABLE `tbl_users`
  ADD PRIMARY KEY (`user_id`),
  ADD KEY `fk_users_role` (`role_id`);

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
  MODIFY `id` int(10) UNSIGNED NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=17;

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
-- AUTO_INCREMENT for table `tbl_curriculum_header`
--
ALTER TABLE `tbl_curriculum_header`
  MODIFY `curriculum_header_id` int(11) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `tbl_dean_profile`
--
ALTER TABLE `tbl_dean_profile`
  MODIFY `dean_id` bigint(20) UNSIGNED NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=2;

--
-- AUTO_INCREMENT for table `tbl_departments`
--
ALTER TABLE `tbl_departments`
  MODIFY `department_id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=3;

--
-- AUTO_INCREMENT for table `tbl_elective_subject`
--
ALTER TABLE `tbl_elective_subject`
  MODIFY `elective_subject_id` int(11) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `tbl_evaluation`
--
ALTER TABLE `tbl_evaluation`
  MODIFY `evaluation_id` bigint(20) UNSIGNED NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `tbl_offered_subject`
--
ALTER TABLE `tbl_offered_subject`
  MODIFY `offered_subject_id` int(11) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `tbl_prerequisite`
--
ALTER TABLE `tbl_prerequisite`
  MODIFY `requisites_id` int(11) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `tbl_program`
--
ALTER TABLE `tbl_program`
  MODIFY `program_id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=2;

--
-- AUTO_INCREMENT for table `tbl_roles`
--
ALTER TABLE `tbl_roles`
  MODIFY `role_id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=5;

--
-- AUTO_INCREMENT for table `tbl_semester`
--
ALTER TABLE `tbl_semester`
  MODIFY `semester_id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=3;

--
-- AUTO_INCREMENT for table `tbl_student_profile`
--
ALTER TABLE `tbl_student_profile`
  MODIFY `student_id` int(11) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `tbl_subjects`
--
ALTER TABLE `tbl_subjects`
  MODIFY `subject_id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=27;

--
-- AUTO_INCREMENT for table `tbl_track`
--
ALTER TABLE `tbl_track`
  MODIFY `track_id` int(11) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `tbl_users`
--
ALTER TABLE `tbl_users`
  MODIFY `user_id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=16;

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
  ADD CONSTRAINT `curriculum_curriculum_header_id_foreign` FOREIGN KEY (`curriculum_header_id`) REFERENCES `tbl_curriculum_header` (`curriculum_header_id`) ON DELETE CASCADE,
  ADD CONSTRAINT `fk_curriculum_program` FOREIGN KEY (`program_id`) REFERENCES `tbl_program` (`program_id`),
  ADD CONSTRAINT `fk_curriculum_requisite` FOREIGN KEY (`requisite_id`) REFERENCES `tbl_requisites` (`requisite_id`) ON DELETE SET NULL,
  ADD CONSTRAINT `fk_curriculum_semester` FOREIGN KEY (`semester_id`) REFERENCES `tbl_semester` (`semester_id`),
  ADD CONSTRAINT `fk_curriculum_subject` FOREIGN KEY (`subject_id`) REFERENCES `tbl_subjects` (`subject_id`),
  ADD CONSTRAINT `fk_curriculum_year` FOREIGN KEY (`year_level`) REFERENCES `year_level` (`year_level_id`);

--
-- Constraints for table `tbl_curriculum_header`
--
ALTER TABLE `tbl_curriculum_header`
  ADD CONSTRAINT `tbl_curriculum_header_program_id_foreign` FOREIGN KEY (`program_id`) REFERENCES `tbl_program` (`program_id`) ON DELETE CASCADE;

--
-- Constraints for table `tbl_dean_profile`
--
ALTER TABLE `tbl_dean_profile`
  ADD CONSTRAINT `tbl_dean_profile_program_id_foreign` FOREIGN KEY (`program_id`) REFERENCES `tbl_program` (`program_id`) ON DELETE CASCADE,
  ADD CONSTRAINT `tbl_dean_profile_user_id_foreign` FOREIGN KEY (`user_id`) REFERENCES `tbl_users` (`user_id`) ON DELETE CASCADE;

--
-- Constraints for table `tbl_departments`
--
ALTER TABLE `tbl_departments`
  ADD CONSTRAINT `tbl_departments_campus_id_foreign` FOREIGN KEY (`campus_id`) REFERENCES `tbl_campus` (`campus_id`) ON DELETE SET NULL;

--
-- Constraints for table `tbl_elective_subject`
--
ALTER TABLE `tbl_elective_subject`
  ADD CONSTRAINT `tbl_elective_subject_subject_id_foreign` FOREIGN KEY (`subject_id`) REFERENCES `tbl_subjects` (`subject_id`) ON DELETE CASCADE,
  ADD CONSTRAINT `tbl_elective_subject_track_id_foreign` FOREIGN KEY (`track_id`) REFERENCES `tbl_track` (`track_id`) ON DELETE CASCADE;

--
-- Constraints for table `tbl_evaluation`
--
ALTER TABLE `tbl_evaluation`
  ADD CONSTRAINT `tbl_evaluation_academic_year_id_foreign` FOREIGN KEY (`academic_year_id`) REFERENCES `tbl_academic_year` (`academic_year_id`) ON DELETE CASCADE,
  ADD CONSTRAINT `tbl_evaluation_semester_id_foreign` FOREIGN KEY (`semester_id`) REFERENCES `tbl_semester` (`semester_id`) ON DELETE CASCADE,
  ADD CONSTRAINT `tbl_evaluation_student_id_foreign` FOREIGN KEY (`student_id`) REFERENCES `tbl_student_profile` (`student_id`) ON DELETE CASCADE,
  ADD CONSTRAINT `tbl_evaluation_subject_id_foreign` FOREIGN KEY (`subject_id`) REFERENCES `tbl_subjects` (`subject_id`) ON DELETE CASCADE;

--
-- Constraints for table `tbl_offered_subject`
--
ALTER TABLE `tbl_offered_subject`
  ADD CONSTRAINT `tbl_offered_subject_academic_year_id_foreign` FOREIGN KEY (`academic_year_id`) REFERENCES `tbl_academic_year` (`academic_year_id`) ON DELETE CASCADE,
  ADD CONSTRAINT `tbl_offered_subject_program_id_foreign` FOREIGN KEY (`program_id`) REFERENCES `tbl_program` (`program_id`) ON DELETE CASCADE,
  ADD CONSTRAINT `tbl_offered_subject_semester_id_foreign` FOREIGN KEY (`semester_id`) REFERENCES `tbl_semester` (`semester_id`) ON DELETE CASCADE,
  ADD CONSTRAINT `tbl_offered_subject_subject_id_foreign` FOREIGN KEY (`subject_id`) REFERENCES `tbl_subjects` (`subject_id`) ON DELETE CASCADE,
  ADD CONSTRAINT `tbl_offered_subject_track_id_foreign` FOREIGN KEY (`track_id`) REFERENCES `tbl_track` (`track_id`) ON DELETE SET NULL,
  ADD CONSTRAINT `tbl_offered_subject_year_level_id_foreign` FOREIGN KEY (`year_level_id`) REFERENCES `year_level` (`year_level_id`) ON DELETE SET NULL;

--
-- Constraints for table `tbl_prerequisite`
--
ALTER TABLE `tbl_prerequisite`
  ADD CONSTRAINT `tbl_prerequisite_requisites_subject_id_foreign` FOREIGN KEY (`requisites_subject_id`) REFERENCES `tbl_subjects` (`subject_id`) ON DELETE CASCADE,
  ADD CONSTRAINT `tbl_prerequisite_subject_id_foreign` FOREIGN KEY (`subject_id`) REFERENCES `tbl_subjects` (`subject_id`) ON DELETE CASCADE;

--
-- Constraints for table `tbl_program`
--
ALTER TABLE `tbl_program`
  ADD CONSTRAINT `fk_program_campus` FOREIGN KEY (`campus_id`) REFERENCES `tbl_campus` (`campus_id`),
  ADD CONSTRAINT `fk_program_department` FOREIGN KEY (`department_id`) REFERENCES `tbl_departments` (`department_id`);

--
-- Constraints for table `tbl_student_profile`
--
ALTER TABLE `tbl_student_profile`
  ADD CONSTRAINT `fk_student_user` FOREIGN KEY (`user_id`) REFERENCES `tbl_users` (`user_id`),
  ADD CONSTRAINT `tbl_student_profile_current_program_foreign` FOREIGN KEY (`current_program`) REFERENCES `tbl_program` (`program_id`) ON DELETE SET NULL,
  ADD CONSTRAINT `tbl_student_profile_track_id_foreign` FOREIGN KEY (`track_id`) REFERENCES `tbl_track` (`track_id`) ON DELETE SET NULL,
  ADD CONSTRAINT `tbl_student_profile_year_level_id_foreign` FOREIGN KEY (`year_level_id`) REFERENCES `year_level` (`year_level_id`) ON DELETE SET NULL;

--
-- Constraints for table `tbl_users`
--
ALTER TABLE `tbl_users`
  ADD CONSTRAINT `fk_users_role` FOREIGN KEY (`role_id`) REFERENCES `tbl_roles` (`role_id`) ON DELETE SET NULL;
COMMIT;

/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;
/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;
