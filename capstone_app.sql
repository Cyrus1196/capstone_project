-- phpMyAdmin SQL Dump
-- version 5.2.1
-- https://www.phpmyadmin.net/
--
-- Host: 127.0.0.1:3307
-- Generation Time: Mar 21, 2026 at 05:17 AM
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
-- Database: `capstone_app`
--

-- --------------------------------------------------------

--
-- Table structure for table `audit_logs`
--

CREATE TABLE `audit_logs` (
  `audit_logs_id` int(11) NOT NULL,
  `user_id` int(11) NOT NULL,
  `actions` varchar(255) NOT NULL,
  `table_name` varchar(100) NOT NULL,
  `record_id` int(11) DEFAULT NULL,
  `old_value` text DEFAULT NULL,
  `new_value` text DEFAULT NULL,
  `action_timestamp` timestamp NOT NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Dumping data for table `audit_logs`
--

INSERT INTO `audit_logs` (`audit_logs_id`, `user_id`, `actions`, `table_name`, `record_id`, `old_value`, `new_value`, `action_timestamp`) VALUES
(1, 1, 'CREATE', 'tbl_users', 1, '{}', '{\"sample\":true}', '2026-03-21 04:44:39');

-- --------------------------------------------------------

--
-- Table structure for table `cache`
--

CREATE TABLE `cache` (
  `key` varchar(255) NOT NULL,
  `value` mediumtext NOT NULL,
  `expiration` int(11) NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Dumping data for table `cache`
--

INSERT INTO `cache` (`key`, `value`, `expiration`) VALUES
('sample:cache', 'sample-value', 1774071878);

-- --------------------------------------------------------

--
-- Table structure for table `cache_locks`
--

CREATE TABLE `cache_locks` (
  `key` varchar(255) NOT NULL,
  `owner` varchar(255) NOT NULL,
  `expiration` int(11) NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Dumping data for table `cache_locks`
--

INSERT INTO `cache_locks` (`key`, `owner`, `expiration`) VALUES
('sample:lock', 'seed-script', 1774068398);

-- --------------------------------------------------------

--
-- Table structure for table `curriculum`
--

CREATE TABLE `curriculum` (
  `curriculum_id` int(11) NOT NULL,
  `curriculum_header_id` int(11) DEFAULT NULL,
  `program_id` int(11) NOT NULL,
  `subject_id` int(11) DEFAULT NULL,
  `elective_slot_id` int(11) DEFAULT NULL,
  `year_level` int(11) NOT NULL,
  `semester_id` int(11) NOT NULL,
  `passing_grade` int(11) DEFAULT NULL,
  `subject_type` varchar(50) DEFAULT NULL,
  `requisite_id` int(11) DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Dumping data for table `curriculum`
--

INSERT INTO `curriculum` (`curriculum_id`, `curriculum_header_id`, `program_id`, `subject_id`, `elective_slot_id`, `year_level`, `semester_id`, `passing_grade`, `subject_type`, `requisite_id`) VALUES
(81, NULL, 1, 1, NULL, 1, 1, 50, 'core', NULL),
(82, NULL, 1, 2, NULL, 1, 1, 50, 'core', NULL),
(83, NULL, 1, 5, NULL, 1, 1, 50, 'minor', NULL),
(84, NULL, 1, 6, NULL, 1, 1, 50, 'minor', NULL),
(85, NULL, 1, 7, NULL, 1, 1, 50, 'minor', NULL),
(86, NULL, 1, 8, NULL, 1, 1, 50, 'minor', NULL),
(87, NULL, 1, 9, NULL, 1, 1, 50, 'minor', NULL),
(88, NULL, 1, 10, NULL, 1, 1, 50, 'minor', NULL),
(89, NULL, 1, 3, NULL, 1, 2, 50, 'core', NULL),
(90, NULL, 1, 4, NULL, 1, 2, 50, 'core', NULL),
(91, NULL, 1, 13, NULL, 1, 2, 50, 'core', NULL),
(92, NULL, 1, 14, NULL, 1, 2, 50, 'minor', NULL),
(93, NULL, 1, 15, NULL, 1, 2, 50, 'minor', NULL),
(94, NULL, 1, 16, NULL, 1, 2, 50, 'minor', NULL),
(95, NULL, 1, 17, NULL, 1, 2, 50, 'minor', NULL),
(96, NULL, 1, 18, NULL, 1, 2, 50, 'minor', NULL),
(105, NULL, 1, 19, NULL, 2, 1, 50, 'core', NULL),
(106, NULL, 1, 20, NULL, 2, 1, 50, 'core', NULL),
(107, NULL, 1, 21, NULL, 2, 1, 50, 'core', NULL),
(108, NULL, 1, 22, NULL, 2, 1, 50, 'core', NULL),
(109, NULL, 1, 23, NULL, 2, 1, 50, 'core', NULL),
(110, NULL, 1, 24, NULL, 2, 1, 50, 'minor', NULL),
(111, NULL, 1, 25, NULL, 2, 1, 50, 'minor', NULL),
(112, NULL, 1, 26, NULL, 2, 1, 50, 'minor', NULL),
(113, NULL, 1, 27, NULL, 2, 1, 50, 'core', NULL),
(114, NULL, 1, 28, NULL, 2, 1, 50, 'core', NULL),
(115, NULL, 1, 29, NULL, 2, 1, 50, 'core', NULL),
(116, NULL, 1, 30, NULL, 2, 1, 50, 'core', NULL),
(117, NULL, 1, 31, NULL, 2, 1, 50, 'core', NULL),
(118, NULL, 1, 32, NULL, 2, 1, 50, 'minor', NULL),
(119, NULL, 1, 33, NULL, 2, 1, 50, 'minor', NULL),
(120, NULL, 1, 34, NULL, 2, 1, 50, 'minor', NULL),
(121, NULL, 1, 35, NULL, 2, 1, 50, 'minor', NULL),
(122, NULL, 1, 36, NULL, 2, 2, 50, 'core', NULL),
(123, NULL, 1, 37, NULL, 2, 2, 50, 'core', NULL),
(124, NULL, 1, 38, NULL, 2, 2, 50, 'core', NULL),
(125, NULL, 1, 39, NULL, 2, 2, 50, 'core', NULL),
(126, NULL, 1, 40, NULL, 2, 2, 50, 'minor', NULL),
(127, NULL, 1, 41, NULL, 2, 2, 50, 'minor', NULL),
(128, NULL, 1, 42, NULL, 2, 2, 50, 'minor', NULL),
(129, NULL, 1, 43, NULL, 2, 2, 50, 'minor', NULL),
(130, NULL, 1, 44, NULL, 2, 2, 50, 'minor', NULL),
(131, NULL, 1, 45, NULL, 3, 1, 50, 'core', NULL),
(132, NULL, 1, 46, NULL, 3, 1, 50, 'core', NULL),
(133, NULL, 1, 47, NULL, 3, 1, 50, 'core', NULL),
(134, NULL, 1, 48, NULL, 3, 1, 50, 'core', NULL),
(135, NULL, 1, 49, NULL, 3, 1, 50, 'core', NULL),
(136, NULL, 1, 50, NULL, 3, 1, 50, 'elective', NULL),
(137, NULL, 1, 51, NULL, 3, 1, 50, 'minor', NULL),
(138, NULL, 1, 52, NULL, 3, 2, 50, 'core', NULL),
(139, NULL, 1, 53, NULL, 3, 2, 50, 'core', NULL),
(140, NULL, 1, 54, NULL, 3, 2, 50, 'core', NULL),
(141, NULL, 1, 55, NULL, 3, 2, 50, 'core', NULL),
(142, NULL, 1, 56, NULL, 3, 2, 50, 'elective', NULL),
(143, NULL, 1, 57, NULL, 3, 2, 50, 'elective', NULL),
(144, NULL, 1, 58, NULL, 3, 2, 50, 'minor', NULL),
(145, NULL, 1, 59, NULL, 4, 1, 50, 'core', NULL),
(146, NULL, 1, 60, NULL, 4, 1, 50, 'elective', NULL),
(147, NULL, 1, 61, NULL, 4, 1, 50, 'core', NULL),
(148, NULL, 1, 62, NULL, 4, 1, 50, 'core', NULL),
(149, NULL, 1, 63, NULL, 4, 2, 50, 'core', NULL);

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

--
-- Dumping data for table `failed_jobs`
--

INSERT INTO `failed_jobs` (`id`, `uuid`, `connection`, `queue`, `payload`, `exception`, `failed_at`) VALUES
(1, 'sample-failed-job-uuid', 'database', 'default', '{\"sample\":true}', 'Sample exception', '2026-03-21 04:44:39');

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

--
-- Dumping data for table `jobs`
--

INSERT INTO `jobs` (`id`, `queue`, `payload`, `attempts`, `reserved_at`, `available_at`, `created_at`) VALUES
(1, 'default', '{\"sample\":true}', 0, NULL, 1774068278, 1774068278);

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

--
-- Dumping data for table `job_batches`
--

INSERT INTO `job_batches` (`id`, `name`, `total_jobs`, `pending_jobs`, `failed_jobs`, `failed_job_ids`, `options`, `cancelled_at`, `created_at`, `finished_at`) VALUES
('sample-batch', 'Sample Batch', 1, 0, 0, '[]', NULL, NULL, 1774068278, NULL);

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
(16, '2026_01_16_000009_add_status_to_semester_and_academic_year', 5),
(17, '2026_01_28_000010_fix_curriculum_requisite_fk', 6),
(18, '2026_01_28_000011_create_schools_table', 6),
(19, '2026_01_28_000012_create_other_school_subjects_table', 6),
(20, '2026_01_28_000013_create_subject_equivalence_table', 6),
(21, '2026_01_28_000014_create_credit_evaluation_table', 6),
(22, '2026_01_28_000015_create_credit_evaluation_details_table', 6),
(23, '2026_01_28_000016_create_permission_tables', 6),
(24, '2026_01_28_000017_create_audit_logs_table', 6),
(25, '2026_01_28_000018_create_elective_slot_table', 6),
(26, '2026_01_28_000019_update_elective_subject_add_slot', 6),
(27, '2026_01_28_000020_add_elective_slot_to_curriculum', 6),
(28, '2026_01_28_000021_make_track_id_nullable_in_elective_subject', 6),
(29, '2026_01_28_000022_make_subject_id_nullable_in_curriculum', 6),
(30, '2026_02_23_000001_add_category_to_permissions', 6),
(31, '2026_03_21_000001_create_faculty_profile_table', 7);

-- --------------------------------------------------------

--
-- Table structure for table `password_reset_tokens`
--

CREATE TABLE `password_reset_tokens` (
  `email` varchar(255) NOT NULL,
  `token` varchar(255) NOT NULL,
  `created_at` timestamp NULL DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Dumping data for table `password_reset_tokens`
--

INSERT INTO `password_reset_tokens` (`email`, `token`, `created_at`) VALUES
('sample.reset@example.com', 'sample-token', '2026-03-21 04:44:39');

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
-- Table structure for table `tbl_credit_evaluation`
--

CREATE TABLE `tbl_credit_evaluation` (
  `credit_eval_id` int(11) NOT NULL,
  `student_id` int(11) NOT NULL,
  `school_id` int(11) NOT NULL,
  `credit_type` varchar(50) NOT NULL,
  `evaluated_by` int(11) NOT NULL,
  `evaluation_date` date NOT NULL,
  `status` varchar(50) NOT NULL DEFAULT 'pending',
  `remarks` text DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Dumping data for table `tbl_credit_evaluation`
--

INSERT INTO `tbl_credit_evaluation` (`credit_eval_id`, `student_id`, `school_id`, `credit_type`, `evaluated_by`, `evaluation_date`, `status`, `remarks`) VALUES
(1, 1, 1, 'TOR', 1, '2026-03-21', 'approved', 'Sample credit evaluation');

-- --------------------------------------------------------

--
-- Table structure for table `tbl_credit_evaluation_details`
--

CREATE TABLE `tbl_credit_evaluation_details` (
  `credit_detail_id` int(11) NOT NULL,
  `student_id` int(11) NOT NULL,
  `other_subject_id` int(11) NOT NULL,
  `subject_id` int(11) NOT NULL,
  `credited_units` int(11) DEFAULT NULL,
  `credit_basis` varchar(50) DEFAULT NULL,
  `remarks` text DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Dumping data for table `tbl_credit_evaluation_details`
--

INSERT INTO `tbl_credit_evaluation_details` (`credit_detail_id`, `student_id`, `other_subject_id`, `subject_id`, `credited_units`, `credit_basis`, `remarks`) VALUES
(1, 1, 1, 1, 3, 'TOR', 'Sample detail');

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

--
-- Dumping data for table `tbl_curriculum_header`
--

INSERT INTO `tbl_curriculum_header` (`curriculum_header_id`, `program_id`, `Effective_Year`, `description`) VALUES
(1, 1, 2026, 'Sample curriculum header');

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
-- Table structure for table `tbl_elective_slot`
--

CREATE TABLE `tbl_elective_slot` (
  `elective_slot_id` int(11) NOT NULL,
  `program_id` int(11) NOT NULL,
  `semester_id` int(11) NOT NULL,
  `year_level_id` int(11) NOT NULL,
  `slot_name` varchar(100) NOT NULL,
  `status` varchar(50) NOT NULL DEFAULT 'active'
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Dumping data for table `tbl_elective_slot`
--

INSERT INTO `tbl_elective_slot` (`elective_slot_id`, `program_id`, `semester_id`, `year_level_id`, `slot_name`, `status`) VALUES
(1, 1, 1, 1, 'Sample Elective Slot', 'active');

-- --------------------------------------------------------

--
-- Table structure for table `tbl_elective_subject`
--

CREATE TABLE `tbl_elective_subject` (
  `elective_subject_id` int(11) NOT NULL,
  `track_id` int(11) DEFAULT NULL,
  `elective_slot_id` int(11) DEFAULT NULL,
  `subject_id` int(11) NOT NULL,
  `description` varchar(255) DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Dumping data for table `tbl_elective_subject`
--

INSERT INTO `tbl_elective_subject` (`elective_subject_id`, `track_id`, `elective_slot_id`, `subject_id`, `description`) VALUES
(1, 1, 1, 1, 'Sample elective subject');

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

--
-- Dumping data for table `tbl_evaluation`
--

INSERT INTO `tbl_evaluation` (`evaluation_id`, `student_id`, `subject_id`, `academic_year_id`, `semester_id`, `grade`, `evaluation_status`, `enrolled_date`) VALUES
(1, 1, 1, 1, 1, '85', 'passed', '2026-03-21');

-- --------------------------------------------------------

--
-- Table structure for table `tbl_faculty_profile`
--

CREATE TABLE `tbl_faculty_profile` (
  `faculty_id` int(11) NOT NULL,
  `user_id` int(11) NOT NULL,
  `first_name` varchar(100) DEFAULT NULL,
  `middle_name` varchar(100) DEFAULT NULL,
  `last_name` varchar(100) DEFAULT NULL,
  `employee_id` varchar(100) DEFAULT NULL,
  `department_id` int(11) DEFAULT NULL,
  `specialization` varchar(255) DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Dumping data for table `tbl_faculty_profile`
--

INSERT INTO `tbl_faculty_profile` (`faculty_id`, `user_id`, `first_name`, `middle_name`, `last_name`, `employee_id`, `department_id`, `specialization`, `created_at`, `updated_at`) VALUES
(1, 16, 'Sample', 'B', 'Faculty', 'EMP-1001', 1, 'Advising', NULL, NULL);

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

--
-- Dumping data for table `tbl_offered_subject`
--

INSERT INTO `tbl_offered_subject` (`offered_subject_id`, `subject_id`, `academic_year_id`, `semester_id`, `program_id`, `track_id`, `year_level_id`, `status`) VALUES
(1, 1, 1, 1, 1, 1, 1, 'active');

-- --------------------------------------------------------

--
-- Table structure for table `tbl_other_school_subjects`
--

CREATE TABLE `tbl_other_school_subjects` (
  `other_subject_id` int(11) NOT NULL,
  `school_id` int(11) NOT NULL,
  `subject_code` varchar(50) NOT NULL,
  `subject_name` varchar(100) NOT NULL,
  `units` int(11) DEFAULT NULL,
  `hours` int(11) DEFAULT NULL,
  `description` text DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Dumping data for table `tbl_other_school_subjects`
--

INSERT INTO `tbl_other_school_subjects` (`other_subject_id`, `school_id`, `subject_code`, `subject_name`, `units`, `hours`, `description`) VALUES
(1, 1, 'SAMP101', 'Sample External Subject', 3, 54, 'Sample transfer subject');

-- --------------------------------------------------------

--
-- Table structure for table `tbl_permission`
--

CREATE TABLE `tbl_permission` (
  `permission_id` int(11) NOT NULL,
  `permission_name` varchar(100) NOT NULL,
  `category` varchar(100) DEFAULT NULL,
  `description` text DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Dumping data for table `tbl_permission`
--

INSERT INTO `tbl_permission` (`permission_id`, `permission_name`, `category`, `description`) VALUES
(1, 'Sample Module Access', 'System', 'Sample permission row');

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

--
-- Dumping data for table `tbl_prerequisite`
--

INSERT INTO `tbl_prerequisite` (`requisites_id`, `subject_id`, `requisite_type`, `requisites_subject_id`) VALUES
(1, 2, 'Prerequisite', 1),
(2, 36, 'Prerequisite', 30),
(3, 43, 'Prerequisite', 34),
(4, 44, 'Prerequisite', 35),
(5, 45, 'Prerequisite', 29),
(6, 49, 'Prerequisite', 27),
(7, 52, 'Prerequisite', 37),
(8, 53, 'Prerequisite', 45),
(9, 54, 'Prerequisite', 46),
(10, 55, 'Prerequisite', 36),
(11, 56, 'Prerequisite', 50),
(12, 57, 'Prerequisite', 50),
(13, 58, 'Prerequisite', 51),
(14, 59, 'Prerequisite', 52),
(15, 60, 'Prerequisite', 50),
(16, 61, 'Prerequisite', 52),
(17, 62, 'Prerequisite', 46);

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
-- Table structure for table `tbl_role_permissions`
--

CREATE TABLE `tbl_role_permissions` (
  `role_permission_id` int(11) NOT NULL,
  `role_id` int(11) NOT NULL,
  `permission_id` int(11) NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Dumping data for table `tbl_role_permissions`
--

INSERT INTO `tbl_role_permissions` (`role_permission_id`, `role_id`, `permission_id`) VALUES
(1, 1, 1);

-- --------------------------------------------------------

--
-- Table structure for table `tbl_schools`
--

CREATE TABLE `tbl_schools` (
  `school_id` int(11) NOT NULL,
  `school_name` varchar(255) NOT NULL,
  `school_program` text DEFAULT NULL,
  `school_curriculum` text DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Dumping data for table `tbl_schools`
--

INSERT INTO `tbl_schools` (`school_id`, `school_name`, `school_program`, `school_curriculum`) VALUES
(1, 'Sample University', 'BSIT', '2024 Curriculum');

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
(1, '1st Semester', 'active'),
(2, '2nd Semester', 'inactive');

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

--
-- Dumping data for table `tbl_student_profile`
--

INSERT INTO `tbl_student_profile` (`student_id`, `user_id`, `student_number`, `first_name`, `middle_name`, `last_name`, `address`, `contact_number`, `academic_status`, `year_level_id`, `track_id`, `current_program`) VALUES
(1, 2, 900001, 'Sample', 'A', 'Student', 'Sample Address', '09171111111', 'active', 1, 1, 1);

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
(26, 'SSP 005', 'Student Success Program 1', 1, 1),
(27, 'ITE298', 'Information Management (including Fundamentals of Database Systems)', 3, 4),
(28, 'ITE300', 'Object-Oriented Programming', 3, 4),
(29, 'ITE292', 'Networking 1', 3, 4),
(30, 'ITE031', 'Data Structures and Algorithms', 3, 4),
(31, 'ITE083', 'IT Project Management', 3, 3),
(32, 'HIS007', 'Life and Works of Rizal', 3, 3),
(33, 'GEN003', 'Science, Technology, and Society', 3, 3),
(34, 'PED032', 'Physical Activities Toward Health and Fitness 3 (PATHFit 3): Individual and Dual Sports', 2, 2),
(35, 'SSP005', 'Student Success Program 1', 1, 1),
(36, 'ITE393', 'Applications Development (Emerging Technologies) including Event-Driven Programming', 3, 4),
(37, 'ITE400', 'Systems Integration and Architecture', 3, 4),
(38, 'ITE360', 'Web Systems and Technologies', 3, 4),
(39, 'ITE380', 'Human Computer Interaction', 3, 3),
(40, 'GEN004', 'Readings in Philippine History', 3, 3),
(41, 'GEN009', 'The Entrepreneurial Mind', 3, 3),
(42, 'GEN013', 'People and the Earth\'s Ecosystem', 3, 3),
(43, 'PED033', 'Physical Activities Toward Health and Fitness 4 (PATHFit 4): Team Sports', 2, 2),
(44, 'SSP006', 'Student Success Program 2', 1, 1),
(45, 'ITE359', 'Networking 2', 3, 4),
(46, 'ITE369', 'Information Assurance and Security 1', 3, 4),
(47, 'ITE353', 'Data Scalability and Analytics', 3, 3),
(48, 'ITE307', 'Quantitative Methods (including Modeling and Simulation)', 3, 3),
(49, 'ITE397', 'Advanced Database Systems (including Advanced Systems Integration and Architecture)', 3, 4),
(50, 'ITEL1', 'IT Electives 1', 3, 3),
(51, 'SSP007', 'Student Success Program 3', 1, 1),
(52, 'ITE309', 'Capstone Project and Research 1', 3, 3),
(53, 'ITE293', 'Systems Administration and Maintenance', 3, 4),
(54, 'ITE370', 'Information Assurance and Security 2', 3, 4),
(55, 'ITE401', 'Platform Technologies', 3, 4),
(56, 'ITEL2', 'IT Electives 2', 3, 3),
(57, 'ITEL3', 'IT Electives 3', 3, 3),
(58, 'SSP008', 'Student Success Program 4', 1, 1),
(59, 'ITE310', 'Capstone Project and Research 2', 3, 3),
(60, 'ITEL4', 'IT Electives 4', 3, 3),
(61, 'ITE381', 'IT Business Solutions', 3, 3),
(62, 'ITE367', 'Managing IT Resources (including Social and Professional Issues)', 3, 3),
(63, 'ITE311', 'IT Practicum (486 hrs.)', 6, 6),
(64, 'BAM285', 'Business Analysis for IT', 3, 4),
(65, 'BAM286', 'Applied Analytics in Business for IT', 3, 4),
(66, 'ITE382', 'Intelligent Systems', 3, 4),
(67, 'ITE383', 'Network Security', 3, 4),
(68, 'ITE384', 'Computer Forensics', 3, 4),
(69, 'ITE385', 'Ethical Hacking', 3, 4),
(70, 'ITE387', 'Advanced Programming', 3, 4),
(71, 'ITE235', 'Game Development', 3, 4),
(72, 'ITE386', 'Cloud Programming', 3, 4),
(73, 'ITE391', 'Freehand and Digital Drawing', 3, 4),
(74, 'ITE392', 'Scriptwriting and Story Board Design', 3, 4),
(75, 'ITE240', '3D Animation', 3, 4),
(76, 'ITE388', 'Clean-up and In-between for IT', 3, 4);

-- --------------------------------------------------------

--
-- Table structure for table `tbl_subject_equivalence`
--

CREATE TABLE `tbl_subject_equivalence` (
  `equivalence_id` int(11) NOT NULL,
  `other_school_subject` int(11) NOT NULL,
  `subject_id` int(11) NOT NULL,
  `credited_units` int(11) DEFAULT NULL,
  `credit_basis` varchar(50) DEFAULT NULL,
  `status` varchar(50) NOT NULL DEFAULT 'active',
  `remarks` text DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Dumping data for table `tbl_subject_equivalence`
--

INSERT INTO `tbl_subject_equivalence` (`equivalence_id`, `other_school_subject`, `subject_id`, `credited_units`, `credit_basis`, `status`, `remarks`) VALUES
(1, 1, 1, 3, 'TOR', 'active', 'Sample equivalence');

-- --------------------------------------------------------

--
-- Table structure for table `tbl_track`
--

CREATE TABLE `tbl_track` (
  `track_id` int(11) NOT NULL,
  `track_code` varchar(50) NOT NULL,
  `track_name` varchar(100) NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Dumping data for table `tbl_track`
--

INSERT INTO `tbl_track` (`track_id`, `track_code`, `track_name`) VALUES
(1, 'SYS DEV', 'System Development'),
(2, 'BAM', 'Business Informatics'),
(3, 'CYBER', 'Cybersecurity'),
(4, 'DIGI ARTS', 'Digital Arts');

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
(15, 'dean@example.com', '$2y$12$EVUQPi5mppfQTNa7E2RfvuhM2LYp/xjse2OUTBRuOExN9s2u2XSei', NULL, 4, 'active'),
(16, 'sample.faculty@example.com', '$2y$10$ACuK7JqWcolezYhdicIvwuVBwGMwlV30BKXLX8YTnhG0Awdh1V8IC', '09170000000', 2, 'active');

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
-- Indexes for table `audit_logs`
--
ALTER TABLE `audit_logs`
  ADD PRIMARY KEY (`audit_logs_id`),
  ADD KEY `audit_logs_user_id_foreign` (`user_id`),
  ADD KEY `idx_table_record` (`table_name`,`record_id`),
  ADD KEY `idx_timestamp` (`action_timestamp`);

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
  ADD KEY `curriculum_curriculum_header_id_foreign` (`curriculum_header_id`),
  ADD KEY `fk_curriculum_requisite` (`requisite_id`),
  ADD KEY `curriculum_elective_slot_id_foreign` (`elective_slot_id`);

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
-- Indexes for table `tbl_credit_evaluation`
--
ALTER TABLE `tbl_credit_evaluation`
  ADD PRIMARY KEY (`credit_eval_id`),
  ADD KEY `tbl_credit_evaluation_student_id_foreign` (`student_id`),
  ADD KEY `tbl_credit_evaluation_school_id_foreign` (`school_id`),
  ADD KEY `tbl_credit_evaluation_evaluated_by_foreign` (`evaluated_by`);

--
-- Indexes for table `tbl_credit_evaluation_details`
--
ALTER TABLE `tbl_credit_evaluation_details`
  ADD PRIMARY KEY (`credit_detail_id`),
  ADD KEY `tbl_credit_evaluation_details_student_id_foreign` (`student_id`),
  ADD KEY `tbl_credit_evaluation_details_other_subject_id_foreign` (`other_subject_id`),
  ADD KEY `tbl_credit_evaluation_details_subject_id_foreign` (`subject_id`);

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
-- Indexes for table `tbl_elective_slot`
--
ALTER TABLE `tbl_elective_slot`
  ADD PRIMARY KEY (`elective_slot_id`),
  ADD KEY `tbl_elective_slot_program_id_foreign` (`program_id`),
  ADD KEY `tbl_elective_slot_semester_id_foreign` (`semester_id`),
  ADD KEY `tbl_elective_slot_year_level_id_foreign` (`year_level_id`);

--
-- Indexes for table `tbl_elective_subject`
--
ALTER TABLE `tbl_elective_subject`
  ADD PRIMARY KEY (`elective_subject_id`),
  ADD KEY `tbl_elective_subject_track_id_foreign` (`track_id`),
  ADD KEY `tbl_elective_subject_subject_id_foreign` (`subject_id`),
  ADD KEY `tbl_elective_subject_elective_slot_id_foreign` (`elective_slot_id`);

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
-- Indexes for table `tbl_faculty_profile`
--
ALTER TABLE `tbl_faculty_profile`
  ADD PRIMARY KEY (`faculty_id`),
  ADD KEY `tbl_faculty_profile_user_id_foreign` (`user_id`),
  ADD KEY `tbl_faculty_profile_department_id_foreign` (`department_id`);

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
-- Indexes for table `tbl_other_school_subjects`
--
ALTER TABLE `tbl_other_school_subjects`
  ADD PRIMARY KEY (`other_subject_id`),
  ADD KEY `tbl_other_school_subjects_school_id_foreign` (`school_id`);

--
-- Indexes for table `tbl_permission`
--
ALTER TABLE `tbl_permission`
  ADD PRIMARY KEY (`permission_id`),
  ADD UNIQUE KEY `tbl_permission_permission_name_unique` (`permission_name`);

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
-- Indexes for table `tbl_role_permissions`
--
ALTER TABLE `tbl_role_permissions`
  ADD PRIMARY KEY (`role_permission_id`),
  ADD UNIQUE KEY `tbl_role_permissions_role_id_permission_id_unique` (`role_id`,`permission_id`),
  ADD KEY `tbl_role_permissions_permission_id_foreign` (`permission_id`);

--
-- Indexes for table `tbl_schools`
--
ALTER TABLE `tbl_schools`
  ADD PRIMARY KEY (`school_id`);

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
-- Indexes for table `tbl_subject_equivalence`
--
ALTER TABLE `tbl_subject_equivalence`
  ADD PRIMARY KEY (`equivalence_id`),
  ADD KEY `tbl_subject_equivalence_other_school_subject_foreign` (`other_school_subject`),
  ADD KEY `tbl_subject_equivalence_subject_id_foreign` (`subject_id`);

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
-- AUTO_INCREMENT for table `audit_logs`
--
ALTER TABLE `audit_logs`
  MODIFY `audit_logs_id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=2;

--
-- AUTO_INCREMENT for table `curriculum`
--
ALTER TABLE `curriculum`
  MODIFY `curriculum_id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=150;

--
-- AUTO_INCREMENT for table `failed_jobs`
--
ALTER TABLE `failed_jobs`
  MODIFY `id` bigint(20) UNSIGNED NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=2;

--
-- AUTO_INCREMENT for table `jobs`
--
ALTER TABLE `jobs`
  MODIFY `id` bigint(20) UNSIGNED NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=2;

--
-- AUTO_INCREMENT for table `migrations`
--
ALTER TABLE `migrations`
  MODIFY `id` int(10) UNSIGNED NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=32;

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
-- AUTO_INCREMENT for table `tbl_credit_evaluation`
--
ALTER TABLE `tbl_credit_evaluation`
  MODIFY `credit_eval_id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=2;

--
-- AUTO_INCREMENT for table `tbl_credit_evaluation_details`
--
ALTER TABLE `tbl_credit_evaluation_details`
  MODIFY `credit_detail_id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=2;

--
-- AUTO_INCREMENT for table `tbl_curriculum_header`
--
ALTER TABLE `tbl_curriculum_header`
  MODIFY `curriculum_header_id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=2;

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
-- AUTO_INCREMENT for table `tbl_elective_slot`
--
ALTER TABLE `tbl_elective_slot`
  MODIFY `elective_slot_id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=2;

--
-- AUTO_INCREMENT for table `tbl_elective_subject`
--
ALTER TABLE `tbl_elective_subject`
  MODIFY `elective_subject_id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=2;

--
-- AUTO_INCREMENT for table `tbl_evaluation`
--
ALTER TABLE `tbl_evaluation`
  MODIFY `evaluation_id` bigint(20) UNSIGNED NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=2;

--
-- AUTO_INCREMENT for table `tbl_faculty_profile`
--
ALTER TABLE `tbl_faculty_profile`
  MODIFY `faculty_id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=2;

--
-- AUTO_INCREMENT for table `tbl_offered_subject`
--
ALTER TABLE `tbl_offered_subject`
  MODIFY `offered_subject_id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=2;

--
-- AUTO_INCREMENT for table `tbl_other_school_subjects`
--
ALTER TABLE `tbl_other_school_subjects`
  MODIFY `other_subject_id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=2;

--
-- AUTO_INCREMENT for table `tbl_permission`
--
ALTER TABLE `tbl_permission`
  MODIFY `permission_id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=2;

--
-- AUTO_INCREMENT for table `tbl_prerequisite`
--
ALTER TABLE `tbl_prerequisite`
  MODIFY `requisites_id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=18;

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
-- AUTO_INCREMENT for table `tbl_role_permissions`
--
ALTER TABLE `tbl_role_permissions`
  MODIFY `role_permission_id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=2;

--
-- AUTO_INCREMENT for table `tbl_schools`
--
ALTER TABLE `tbl_schools`
  MODIFY `school_id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=2;

--
-- AUTO_INCREMENT for table `tbl_semester`
--
ALTER TABLE `tbl_semester`
  MODIFY `semester_id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=3;

--
-- AUTO_INCREMENT for table `tbl_student_profile`
--
ALTER TABLE `tbl_student_profile`
  MODIFY `student_id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=2;

--
-- AUTO_INCREMENT for table `tbl_subjects`
--
ALTER TABLE `tbl_subjects`
  MODIFY `subject_id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=77;

--
-- AUTO_INCREMENT for table `tbl_subject_equivalence`
--
ALTER TABLE `tbl_subject_equivalence`
  MODIFY `equivalence_id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=2;

--
-- AUTO_INCREMENT for table `tbl_track`
--
ALTER TABLE `tbl_track`
  MODIFY `track_id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=5;

--
-- AUTO_INCREMENT for table `tbl_users`
--
ALTER TABLE `tbl_users`
  MODIFY `user_id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=17;

--
-- AUTO_INCREMENT for table `year_level`
--
ALTER TABLE `year_level`
  MODIFY `year_level_id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=6;

--
-- Constraints for dumped tables
--

--
-- Constraints for table `audit_logs`
--
ALTER TABLE `audit_logs`
  ADD CONSTRAINT `audit_logs_user_id_foreign` FOREIGN KEY (`user_id`) REFERENCES `tbl_users` (`user_id`) ON DELETE CASCADE;

--
-- Constraints for table `curriculum`
--
ALTER TABLE `curriculum`
  ADD CONSTRAINT `curriculum_curriculum_header_id_foreign` FOREIGN KEY (`curriculum_header_id`) REFERENCES `tbl_curriculum_header` (`curriculum_header_id`) ON DELETE CASCADE,
  ADD CONSTRAINT `curriculum_elective_slot_id_foreign` FOREIGN KEY (`elective_slot_id`) REFERENCES `tbl_elective_slot` (`elective_slot_id`) ON DELETE SET NULL,
  ADD CONSTRAINT `curriculum_subject_id_foreign` FOREIGN KEY (`subject_id`) REFERENCES `tbl_subjects` (`subject_id`) ON DELETE SET NULL,
  ADD CONSTRAINT `fk_curriculum_program` FOREIGN KEY (`program_id`) REFERENCES `tbl_program` (`program_id`),
  ADD CONSTRAINT `fk_curriculum_requisite` FOREIGN KEY (`requisite_id`) REFERENCES `tbl_prerequisite` (`requisites_id`) ON DELETE SET NULL,
  ADD CONSTRAINT `fk_curriculum_semester` FOREIGN KEY (`semester_id`) REFERENCES `tbl_semester` (`semester_id`),
  ADD CONSTRAINT `fk_curriculum_year` FOREIGN KEY (`year_level`) REFERENCES `year_level` (`year_level_id`);

--
-- Constraints for table `tbl_credit_evaluation`
--
ALTER TABLE `tbl_credit_evaluation`
  ADD CONSTRAINT `tbl_credit_evaluation_evaluated_by_foreign` FOREIGN KEY (`evaluated_by`) REFERENCES `tbl_users` (`user_id`) ON DELETE CASCADE,
  ADD CONSTRAINT `tbl_credit_evaluation_school_id_foreign` FOREIGN KEY (`school_id`) REFERENCES `tbl_schools` (`school_id`) ON DELETE CASCADE,
  ADD CONSTRAINT `tbl_credit_evaluation_student_id_foreign` FOREIGN KEY (`student_id`) REFERENCES `tbl_student_profile` (`student_id`) ON DELETE CASCADE;

--
-- Constraints for table `tbl_credit_evaluation_details`
--
ALTER TABLE `tbl_credit_evaluation_details`
  ADD CONSTRAINT `tbl_credit_evaluation_details_other_subject_id_foreign` FOREIGN KEY (`other_subject_id`) REFERENCES `tbl_other_school_subjects` (`other_subject_id`) ON DELETE CASCADE,
  ADD CONSTRAINT `tbl_credit_evaluation_details_student_id_foreign` FOREIGN KEY (`student_id`) REFERENCES `tbl_student_profile` (`student_id`) ON DELETE CASCADE,
  ADD CONSTRAINT `tbl_credit_evaluation_details_subject_id_foreign` FOREIGN KEY (`subject_id`) REFERENCES `tbl_subjects` (`subject_id`) ON DELETE CASCADE;

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
-- Constraints for table `tbl_elective_slot`
--
ALTER TABLE `tbl_elective_slot`
  ADD CONSTRAINT `tbl_elective_slot_program_id_foreign` FOREIGN KEY (`program_id`) REFERENCES `tbl_program` (`program_id`) ON DELETE CASCADE,
  ADD CONSTRAINT `tbl_elective_slot_semester_id_foreign` FOREIGN KEY (`semester_id`) REFERENCES `tbl_semester` (`semester_id`) ON DELETE CASCADE,
  ADD CONSTRAINT `tbl_elective_slot_year_level_id_foreign` FOREIGN KEY (`year_level_id`) REFERENCES `year_level` (`year_level_id`) ON DELETE CASCADE;

--
-- Constraints for table `tbl_elective_subject`
--
ALTER TABLE `tbl_elective_subject`
  ADD CONSTRAINT `tbl_elective_subject_elective_slot_id_foreign` FOREIGN KEY (`elective_slot_id`) REFERENCES `tbl_elective_slot` (`elective_slot_id`) ON DELETE SET NULL,
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
-- Constraints for table `tbl_faculty_profile`
--
ALTER TABLE `tbl_faculty_profile`
  ADD CONSTRAINT `tbl_faculty_profile_department_id_foreign` FOREIGN KEY (`department_id`) REFERENCES `tbl_departments` (`department_id`) ON DELETE SET NULL,
  ADD CONSTRAINT `tbl_faculty_profile_user_id_foreign` FOREIGN KEY (`user_id`) REFERENCES `tbl_users` (`user_id`) ON DELETE CASCADE;

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
-- Constraints for table `tbl_other_school_subjects`
--
ALTER TABLE `tbl_other_school_subjects`
  ADD CONSTRAINT `tbl_other_school_subjects_school_id_foreign` FOREIGN KEY (`school_id`) REFERENCES `tbl_schools` (`school_id`) ON DELETE CASCADE;

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
-- Constraints for table `tbl_role_permissions`
--
ALTER TABLE `tbl_role_permissions`
  ADD CONSTRAINT `tbl_role_permissions_permission_id_foreign` FOREIGN KEY (`permission_id`) REFERENCES `tbl_permission` (`permission_id`) ON DELETE CASCADE,
  ADD CONSTRAINT `tbl_role_permissions_role_id_foreign` FOREIGN KEY (`role_id`) REFERENCES `tbl_roles` (`role_id`) ON DELETE CASCADE;

--
-- Constraints for table `tbl_student_profile`
--
ALTER TABLE `tbl_student_profile`
  ADD CONSTRAINT `fk_student_user` FOREIGN KEY (`user_id`) REFERENCES `tbl_users` (`user_id`),
  ADD CONSTRAINT `tbl_student_profile_current_program_foreign` FOREIGN KEY (`current_program`) REFERENCES `tbl_program` (`program_id`) ON DELETE SET NULL,
  ADD CONSTRAINT `tbl_student_profile_track_id_foreign` FOREIGN KEY (`track_id`) REFERENCES `tbl_track` (`track_id`) ON DELETE SET NULL,
  ADD CONSTRAINT `tbl_student_profile_year_level_id_foreign` FOREIGN KEY (`year_level_id`) REFERENCES `year_level` (`year_level_id`) ON DELETE SET NULL;

--
-- Constraints for table `tbl_subject_equivalence`
--
ALTER TABLE `tbl_subject_equivalence`
  ADD CONSTRAINT `tbl_subject_equivalence_other_school_subject_foreign` FOREIGN KEY (`other_school_subject`) REFERENCES `tbl_other_school_subjects` (`other_subject_id`) ON DELETE CASCADE,
  ADD CONSTRAINT `tbl_subject_equivalence_subject_id_foreign` FOREIGN KEY (`subject_id`) REFERENCES `tbl_subjects` (`subject_id`) ON DELETE CASCADE;

--
-- Constraints for table `tbl_users`
--
ALTER TABLE `tbl_users`
  ADD CONSTRAINT `fk_users_role` FOREIGN KEY (`role_id`) REFERENCES `tbl_roles` (`role_id`) ON DELETE SET NULL;
COMMIT;

/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;
/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;
