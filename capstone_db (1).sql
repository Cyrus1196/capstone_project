-- phpMyAdmin SQL Dump
-- version 5.2.1
-- https://www.phpmyadmin.net/
--
-- Host: 127.0.0.1
-- Generation Time: Apr 17, 2026 at 05:58 AM
-- Server version: 10.4.32-MariaDB
-- PHP Version: 8.5.4

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
(1, 1, 'CREATE', 'tbl_users', 1, '{}', '{\"sample\":true}', '2026-03-21 04:44:39'),
(2, 1, 'CREATE', 'tbl_users', 35, NULL, '{\"Email\":\"jordan.csvimport@example.com\",\"Contact_Number\":\"09171234567\",\"role_id\":3,\"status\":\"active\",\"password_changed_at\":\"2026-03-31 18:02:18\",\"user_id\":35}', '2026-03-31 10:02:18'),
(3, 1, 'CREATE', 'tbl_student_profile', 7, NULL, '{\"user_id\":35,\"student_number\":\"2026-CSV-NEW-001\",\"student_id_number\":\"2026-CSV-NEW-001\",\"first_name\":\"Jordan\",\"last_name\":\"Rivera\",\"current_program\":null,\"year_level_id\":null,\"contact_number\":\"09171234567\",\"address\":\"Manila, Philippines\",\"academic_status\":\"active\",\"student_id\":7}', '2026-03-31 10:02:18'),
(4, 1, 'UPDATE', 'tbl_users', 8, '{\"Contact_Number\":null}', '{\"Contact_Number\":\"09171234567\"}', '2026-03-31 11:47:34'),
(5, 1, 'CREATE', 'tbl_users', 36, NULL, '{\"Email\":\"demo.new@example.com\",\"Contact_Number\":null,\"role_id\":3,\"status\":\"active\",\"password_changed_at\":\"2026-03-31 19:47:34\",\"user_id\":36}', '2026-03-31 11:47:34'),
(6, 1, 'CREATE', 'tbl_student_profile', 8, NULL, '{\"user_id\":36,\"student_number\":\"2026-DEMO-NEW\",\"student_id_number\":\"2026-DEMO-NEW\",\"first_name\":\"Demo\",\"last_name\":\"Student\",\"current_program\":null,\"year_level_id\":null,\"contact_number\":null,\"address\":null,\"academic_status\":\"active\",\"student_id\":8}', '2026-03-31 11:47:34'),
(7, 1, 'CREATE', 'tbl_evaluation', 112, NULL, '{\"student_id\":6,\"subject_id\":26,\"academic_year_id\":1,\"semester_id\":1,\"grade\":\"1.0\",\"evaluation_status\":\"passed\",\"evaluated_by\":1,\"modality_id\":null,\"evaluation_date\":\"2025-12-01 00:00:00\",\"enrolled_date\":\"2025-08-01 00:00:00\",\"section_id\":null,\"inc_compliance_deadline\":null,\"evaluation_id\":112}', '2026-03-31 11:47:34'),
(8, 1, 'CREATE', 'tbl_evaluation', 113, NULL, '{\"student_id\":6,\"subject_id\":7,\"academic_year_id\":1,\"semester_id\":1,\"grade\":\"1.25\",\"evaluation_status\":\"passed\",\"evaluated_by\":1,\"modality_id\":null,\"evaluation_date\":\"2025-12-15 00:00:00\",\"enrolled_date\":\"2025-08-15 00:00:00\",\"section_id\":null,\"inc_compliance_deadline\":null,\"evaluation_id\":113}', '2026-03-31 11:47:34'),
(9, 1, 'CREATE', 'tbl_evaluation', 114, NULL, '{\"student_id\":6,\"subject_id\":2,\"academic_year_id\":1,\"semester_id\":1,\"grade\":\"1.5\",\"evaluation_status\":\"passed\",\"evaluated_by\":1,\"modality_id\":null,\"evaluation_date\":\"2025-12-15 00:00:00\",\"enrolled_date\":\"2025-08-15 00:00:00\",\"section_id\":null,\"inc_compliance_deadline\":null,\"evaluation_id\":114}', '2026-03-31 11:47:34'),
(10, 1, 'CREATE', 'tbl_evaluation', 115, NULL, '{\"student_id\":6,\"subject_id\":6,\"academic_year_id\":1,\"semester_id\":1,\"grade\":\"1.0\",\"evaluation_status\":\"passed\",\"evaluated_by\":1,\"modality_id\":null,\"evaluation_date\":\"2025-12-15 00:00:00\",\"enrolled_date\":\"2025-08-15 00:00:00\",\"section_id\":null,\"inc_compliance_deadline\":null,\"evaluation_id\":115}', '2026-03-31 11:47:34'),
(11, 1, 'CREATE', 'tbl_evaluation', 116, NULL, '{\"student_id\":6,\"subject_id\":20,\"academic_year_id\":1,\"semester_id\":2,\"grade\":\"1.75\",\"evaluation_status\":\"passed\",\"evaluated_by\":1,\"modality_id\":null,\"evaluation_date\":\"2026-05-10 00:00:00\",\"enrolled_date\":\"2026-01-10 00:00:00\",\"section_id\":null,\"inc_compliance_deadline\":null,\"evaluation_id\":116}', '2026-03-31 11:47:34'),
(12, 1, 'UPDATE', 'tbl_users', 35, '{\"password_changed_at\":\"2026-03-31T18:02:18.000000Z\",\"Email\":null,\"Contact_Number\":null,\"Password\":\"[redacted]\"}', '{\"password_changed_at\":\"2026-03-31 19:48:13\",\"Email\":\"jordan.csvimport@example.com\",\"Contact_Number\":\"09171234567\",\"Password\":\"[redacted]\"}', '2026-03-31 11:48:13'),
(13, 1, 'UPDATE', 'tbl_student_profile', 7, '{\"student_number\":\"2026-CSV-NEW-001\",\"academic_status\":\"active\",\"year_level_id\":null,\"Current_Program\":null}', '{\"student_number\":\"2026001\",\"academic_status\":\"Regular\",\"year_level_id\":1,\"Current_Program\":\"1\"}', '2026-03-31 11:48:14'),
(14, 1, 'UPDATE', 'tbl_users', 8, '{\"Email\":null,\"Contact_Number\":null}', '{\"Email\":\"student2@example.com\",\"Contact_Number\":\"09171234567\"}', '2026-03-31 12:05:34'),
(15, 1, 'UPDATE', 'tbl_users', 8, '{\"Email\":null,\"Contact_Number\":null}', '{\"Email\":\"student2@example.com\",\"Contact_Number\":\"09171234567\"}', '2026-03-31 12:05:41'),
(16, 1, 'UPDATE', 'tbl_users', 8, '{\"Email\":null,\"Contact_Number\":null}', '{\"Email\":\"student2@example.com\",\"Contact_Number\":\"09171234567\"}', '2026-03-31 12:07:20'),
(17, 1, 'UPDATE', 'tbl_users', 8, '{\"Email\":null,\"Contact_Number\":null}', '{\"Email\":\"student2@example.com\",\"Contact_Number\":\"09171234567\"}', '2026-03-31 12:07:36'),
(18, 1, 'UPDATE', 'tbl_users', 8, '{\"Email\":null,\"Contact_Number\":null}', '{\"Email\":\"student2@example.com\",\"Contact_Number\":\"09171234567\"}', '2026-03-31 12:08:21'),
(19, 1, 'UPDATE', 'tbl_users', 8, '{\"Email\":null,\"Contact_Number\":null}', '{\"Email\":\"student2@example.com\",\"Contact_Number\":\"09171234567\"}', '2026-03-31 12:11:08'),
(20, 1, 'UPDATE', 'tbl_student_profile', 6, '{\"student_number\":\"2026-PERSONAL-001\",\"student_id_number\":\"2026-PERSONAL-001\",\"academic_status\":\"active\",\"year_level_id\":null,\"Current_Program\":null}', '{\"student_number\":\"202309831\",\"student_id_number\":\"2023-09831\",\"academic_status\":\"Regular\",\"year_level_id\":1,\"Current_Program\":\"1\"}', '2026-03-31 12:11:08'),
(21, 22, 'CREATE', 'tbl_evaluation', 117, NULL, '{\"student_id\":6,\"subject_id\":8,\"academic_year_id\":1,\"semester_id\":1,\"grade\":\"92.9\",\"evaluation_status\":\"passed\",\"evaluated_by\":22,\"inc_compliance_deadline\":null,\"evaluation_id\":117}', '2026-03-31 12:23:22'),
(22, 1, 'CREATE', 'tbl_users', 37, NULL, '{\"Email\":\"it.import.morgan@example.com\",\"Contact_Number\":\"09189990002\",\"role_id\":3,\"status\":\"active\",\"password_changed_at\":\"2026-03-31 20:55:30\",\"user_id\":37}', '2026-03-31 12:55:31'),
(23, 1, 'CREATE', 'tbl_student_profile', 9, NULL, '{\"user_id\":37,\"student_number\":\"2026-IT-IMPORT-002\",\"student_id_number\":\"2026-IT-IMPORT-002\",\"first_name\":\"Morgan\",\"last_name\":\"Riley\",\"contact_number\":\"09189990002\",\"address\":\"Cagayan de Oro, Philippines\",\"academic_status\":\"active\",\"Current_Program\":1,\"year_level_id\":1,\"student_id\":9}', '2026-03-31 12:55:31'),
(24, 1, 'CREATE', 'tbl_evaluation', 118, NULL, '{\"student_id\":9,\"subject_id\":8,\"academic_year_id\":1,\"semester_id\":1,\"grade\":\"92.9\",\"evaluation_status\":\"passed\",\"evaluated_by\":1,\"modality_id\":null,\"evaluation_date\":\"2025-12-01 00:00:00\",\"enrolled_date\":\"2025-08-01 00:00:00\",\"section_id\":null,\"inc_compliance_deadline\":null,\"evaluation_id\":118}', '2026-03-31 12:55:31'),
(25, 1, 'CREATE', 'tbl_evaluation', 119, NULL, '{\"student_id\":9,\"subject_id\":7,\"academic_year_id\":1,\"semester_id\":1,\"grade\":\"92\",\"evaluation_status\":\"passed\",\"evaluated_by\":1,\"modality_id\":null,\"evaluation_date\":\"2025-12-15 00:00:00\",\"enrolled_date\":\"2025-08-15 00:00:00\",\"section_id\":null,\"inc_compliance_deadline\":null,\"evaluation_id\":119}', '2026-03-31 12:55:31'),
(26, 1, 'CREATE', 'tbl_evaluation', 120, NULL, '{\"student_id\":9,\"subject_id\":6,\"academic_year_id\":1,\"semester_id\":1,\"grade\":\"97.4\",\"evaluation_status\":\"passed\",\"evaluated_by\":1,\"modality_id\":null,\"evaluation_date\":\"2025-12-15 00:00:00\",\"enrolled_date\":\"2025-08-15 00:00:00\",\"section_id\":null,\"inc_compliance_deadline\":null,\"evaluation_id\":120}', '2026-03-31 12:55:31'),
(27, 1, 'CREATE', 'tbl_evaluation', 121, NULL, '{\"student_id\":9,\"subject_id\":2,\"academic_year_id\":1,\"semester_id\":1,\"grade\":\"86.3\",\"evaluation_status\":\"passed\",\"evaluated_by\":1,\"modality_id\":null,\"evaluation_date\":\"2025-12-15 00:00:00\",\"enrolled_date\":\"2025-08-15 00:00:00\",\"section_id\":null,\"inc_compliance_deadline\":null,\"evaluation_id\":121}', '2026-03-31 12:55:31'),
(28, 1, 'UPDATE', 'tbl_users', 37, '{\"password_changed_at\":\"2026-03-31T20:55:30.000000Z\",\"Email\":null,\"Contact_Number\":null,\"Password\":\"[redacted]\"}', '{\"password_changed_at\":\"2026-03-31 20:55:56\",\"Email\":\"it.import.morgan@example.com\",\"Contact_Number\":\"09189990002\",\"Password\":\"[redacted]\"}', '2026-03-31 12:55:56'),
(29, 1, 'UPDATE', 'tbl_student_profile', 9, '{\"student_number\":\"2026-IT-IMPORT-002\",\"academic_status\":\"active\",\"Current_Program\":1}', '{\"student_number\":\"2026002\",\"academic_status\":\"Regular\",\"Current_Program\":1}', '2026-03-31 12:55:56'),
(30, 22, 'CREATE', 'tbl_evaluation', 122, NULL, '{\"student_id\":9,\"subject_id\":1,\"academic_year_id\":1,\"semester_id\":1,\"grade\":\"75\",\"evaluation_status\":\"passed\",\"evaluated_by\":22,\"inc_compliance_deadline\":null,\"evaluation_id\":122}', '2026-03-31 13:06:54'),
(31, 22, 'CREATE', 'tbl_evaluation', 123, NULL, '{\"student_id\":9,\"subject_id\":10,\"academic_year_id\":1,\"semester_id\":1,\"grade\":\"75\",\"evaluation_status\":\"passed\",\"evaluated_by\":22,\"inc_compliance_deadline\":null,\"evaluation_id\":123}', '2026-03-31 13:06:54'),
(32, 22, 'CREATE', 'tbl_evaluation', 124, NULL, '{\"student_id\":9,\"subject_id\":9,\"academic_year_id\":1,\"semester_id\":1,\"grade\":\"75\",\"evaluation_status\":\"passed\",\"evaluated_by\":22,\"inc_compliance_deadline\":null,\"evaluation_id\":124}', '2026-03-31 13:06:55'),
(33, 22, 'CREATE', 'tbl_evaluation', 125, NULL, '{\"student_id\":9,\"subject_id\":5,\"academic_year_id\":1,\"semester_id\":1,\"grade\":\"75\",\"evaluation_status\":\"passed\",\"evaluated_by\":22,\"inc_compliance_deadline\":null,\"evaluation_id\":125}', '2026-03-31 13:06:55'),
(34, 22, 'CREATE', 'tbl_evaluation', 126, NULL, '{\"student_id\":9,\"subject_id\":18,\"academic_year_id\":1,\"semester_id\":2,\"grade\":\"75\",\"evaluation_status\":\"passed\",\"evaluated_by\":22,\"inc_compliance_deadline\":null,\"evaluation_id\":126}', '2026-03-31 13:07:25'),
(35, 22, 'CREATE', 'tbl_evaluation', 127, NULL, '{\"student_id\":9,\"subject_id\":17,\"academic_year_id\":1,\"semester_id\":2,\"grade\":\"75\",\"evaluation_status\":\"passed\",\"evaluated_by\":22,\"inc_compliance_deadline\":null,\"evaluation_id\":127}', '2026-03-31 13:07:25'),
(36, 22, 'CREATE', 'tbl_evaluation', 128, NULL, '{\"student_id\":9,\"subject_id\":16,\"academic_year_id\":1,\"semester_id\":2,\"grade\":\"75\",\"evaluation_status\":\"passed\",\"evaluated_by\":22,\"inc_compliance_deadline\":null,\"evaluation_id\":128}', '2026-03-31 13:07:25'),
(37, 22, 'CREATE', 'tbl_evaluation', 129, NULL, '{\"student_id\":9,\"subject_id\":15,\"academic_year_id\":1,\"semester_id\":2,\"grade\":\"75\",\"evaluation_status\":\"passed\",\"evaluated_by\":22,\"inc_compliance_deadline\":null,\"evaluation_id\":129}', '2026-03-31 13:07:25'),
(38, 22, 'CREATE', 'tbl_evaluation', 130, NULL, '{\"student_id\":9,\"subject_id\":14,\"academic_year_id\":1,\"semester_id\":2,\"grade\":\"75\",\"evaluation_status\":\"passed\",\"evaluated_by\":22,\"inc_compliance_deadline\":null,\"evaluation_id\":130}', '2026-03-31 13:07:25'),
(39, 22, 'CREATE', 'tbl_evaluation', 131, NULL, '{\"student_id\":9,\"subject_id\":13,\"academic_year_id\":1,\"semester_id\":2,\"grade\":\"75\",\"evaluation_status\":\"passed\",\"evaluated_by\":22,\"inc_compliance_deadline\":null,\"evaluation_id\":131}', '2026-03-31 13:07:25'),
(40, 22, 'CREATE', 'tbl_evaluation', 132, NULL, '{\"student_id\":9,\"subject_id\":4,\"academic_year_id\":1,\"semester_id\":2,\"grade\":\"75\",\"evaluation_status\":\"passed\",\"evaluated_by\":22,\"inc_compliance_deadline\":null,\"evaluation_id\":132}', '2026-03-31 13:07:25'),
(41, 22, 'CREATE', 'tbl_evaluation', 133, NULL, '{\"student_id\":9,\"subject_id\":3,\"academic_year_id\":1,\"semester_id\":2,\"grade\":\"75\",\"evaluation_status\":\"passed\",\"evaluated_by\":22,\"inc_compliance_deadline\":null,\"evaluation_id\":133}', '2026-03-31 13:07:25'),
(42, 37, 'UPDATE', 'tbl_student_profile', 9, '{\"year_level_id\":1}', '{\"year_level_id\":2}', '2026-03-31 13:17:38'),
(43, 22, 'UPDATE', 'tbl_evaluation', 126, '{\"grade\":\"75\",\"evaluation_status\":\"passed\"}', '{\"grade\":\"49\",\"evaluation_status\":\"failed\"}', '2026-03-31 13:25:57'),
(44, 22, 'UPDATE', 'tbl_student_profile', 9, '{\"academic_status\":\"Regular\",\"year_level_id\":2}', '{\"academic_status\":\"Irregular\",\"year_level_id\":1}', '2026-03-31 13:25:57'),
(45, 22, 'UPDATE', 'tbl_evaluation', 127, '{\"grade\":\"75\",\"evaluation_status\":\"passed\"}', '{\"grade\":\"49\",\"evaluation_status\":\"failed\"}', '2026-03-31 13:25:58'),
(46, 22, 'UPDATE', 'tbl_evaluation', 128, '{\"grade\":\"75\",\"evaluation_status\":\"passed\"}', '{\"grade\":\"49\",\"evaluation_status\":\"failed\"}', '2026-03-31 13:25:58'),
(47, 22, 'UPDATE', 'tbl_evaluation', 129, '{\"grade\":\"75\",\"evaluation_status\":\"passed\"}', '{\"grade\":\"49\",\"evaluation_status\":\"failed\"}', '2026-03-31 13:25:58'),
(48, 22, 'UPDATE', 'tbl_evaluation', 130, '{\"grade\":\"75\",\"evaluation_status\":\"passed\"}', '{\"grade\":\"49\",\"evaluation_status\":\"failed\"}', '2026-03-31 13:25:58'),
(49, 22, 'UPDATE', 'tbl_evaluation', 131, '{\"grade\":\"75\",\"evaluation_status\":\"passed\"}', '{\"grade\":\"49\",\"evaluation_status\":\"failed\"}', '2026-03-31 13:25:58'),
(50, 22, 'UPDATE', 'tbl_evaluation', 132, '{\"grade\":\"75\",\"evaluation_status\":\"passed\"}', '{\"grade\":\"49\",\"evaluation_status\":\"failed\"}', '2026-03-31 13:25:58'),
(51, 22, 'UPDATE', 'tbl_evaluation', 133, '{\"grade\":\"75\",\"evaluation_status\":\"passed\"}', '{\"grade\":\"49\",\"evaluation_status\":\"failed\"}', '2026-03-31 13:25:58'),
(52, 22, 'UPDATE', 'tbl_student_profile', 9, '{\"academic_status\":\"Irregular\"}', '{\"academic_status\":\"Regular\"}', '2026-03-31 13:25:58'),
(53, 31, 'UPDATE', 'tbl_student_profile', 3, '{\"academic_status\":\"Regular\"}', '{\"academic_status\":\"Irregular\"}', '2026-04-12 18:48:02'),
(54, 1, 'CREATE', 'tbl_users', 38, NULL, '{\"Email\":\"it.3rd.irregular@example.com\",\"Contact_Number\":\"09189990003\",\"role_id\":3,\"status\":\"active\",\"password_changed_at\":\"2026-04-13 03:11:10\",\"user_id\":38}', '2026-04-12 19:11:10'),
(55, 1, 'CREATE', 'tbl_student_profile', 10, NULL, '{\"user_id\":38,\"student_number\":\"2026-IT-3RD-IRREG-001\",\"student_id_number\":\"2026-IT-3RD-IRREG-001\",\"first_name\":\"Avery\",\"last_name\":\"Chen\",\"contact_number\":\"09189990003\",\"address\":\"Cagayan de Oro, Philippines\",\"academic_status\":\"Irregular\",\"Current_Program\":1,\"year_level_id\":3,\"student_id\":10}', '2026-04-12 19:11:10'),
(56, 1, 'CREATE', 'tbl_evaluation', 134, NULL, '{\"student_id\":10,\"subject_id\":7,\"academic_year_id\":1,\"semester_id\":1,\"grade\":\"92\",\"evaluation_status\":\"passed\",\"evaluated_by\":1,\"modality_id\":null,\"evaluation_date\":\"2025-12-01 00:00:00\",\"enrolled_date\":\"2025-08-01 00:00:00\",\"section_id\":null,\"inc_compliance_deadline\":null,\"evaluation_id\":134}', '2026-04-12 19:11:10'),
(57, 1, 'UPDATE', 'tbl_student_profile', 10, '{\"year_level_id\":3}', '{\"year_level_id\":1}', '2026-04-12 19:11:10'),
(58, 1, 'CREATE', 'tbl_evaluation', 135, NULL, '{\"student_id\":10,\"subject_id\":8,\"academic_year_id\":1,\"semester_id\":1,\"grade\":\"91\",\"evaluation_status\":\"passed\",\"evaluated_by\":1,\"modality_id\":null,\"evaluation_date\":\"2025-12-01 00:00:00\",\"enrolled_date\":\"2025-08-01 00:00:00\",\"section_id\":null,\"inc_compliance_deadline\":null,\"evaluation_id\":135}', '2026-04-12 19:11:10'),
(59, 1, 'CREATE', 'tbl_evaluation', 136, NULL, '{\"student_id\":10,\"subject_id\":6,\"academic_year_id\":1,\"semester_id\":1,\"grade\":\"93\",\"evaluation_status\":\"passed\",\"evaluated_by\":1,\"modality_id\":null,\"evaluation_date\":\"2025-12-15 00:00:00\",\"enrolled_date\":\"2025-08-15 00:00:00\",\"section_id\":null,\"inc_compliance_deadline\":null,\"evaluation_id\":136}', '2026-04-12 19:11:10'),
(60, 1, 'CREATE', 'tbl_evaluation', 137, NULL, '{\"student_id\":10,\"subject_id\":2,\"academic_year_id\":1,\"semester_id\":1,\"grade\":\"88\",\"evaluation_status\":\"passed\",\"evaluated_by\":1,\"modality_id\":null,\"evaluation_date\":\"2025-12-15 00:00:00\",\"enrolled_date\":\"2025-08-15 00:00:00\",\"section_id\":null,\"inc_compliance_deadline\":null,\"evaluation_id\":137}', '2026-04-12 19:11:10'),
(61, 1, 'CREATE', 'tbl_evaluation', 138, NULL, '{\"student_id\":10,\"subject_id\":26,\"academic_year_id\":1,\"semester_id\":1,\"grade\":\"1.0\",\"evaluation_status\":\"passed\",\"evaluated_by\":1,\"modality_id\":null,\"evaluation_date\":\"2025-12-01 00:00:00\",\"enrolled_date\":\"2025-08-01 00:00:00\",\"section_id\":null,\"inc_compliance_deadline\":null,\"evaluation_id\":138}', '2026-04-12 19:11:10'),
(62, 1, 'CREATE', 'tbl_evaluation', 139, NULL, '{\"student_id\":10,\"subject_id\":20,\"academic_year_id\":1,\"semester_id\":2,\"grade\":\"1.75\",\"evaluation_status\":\"passed\",\"evaluated_by\":1,\"modality_id\":null,\"evaluation_date\":\"2026-05-10 00:00:00\",\"enrolled_date\":\"2026-01-10 00:00:00\",\"section_id\":null,\"inc_compliance_deadline\":null,\"evaluation_id\":139}', '2026-04-12 19:11:10'),
(63, 1, 'CREATE', 'tbl_users', 39, NULL, '{\"Email\":\"it.irreg.3rd.failures@example.com\",\"Contact_Number\":\"09189990077\",\"role_id\":3,\"status\":\"active\",\"password_changed_at\":\"2026-04-13 03:24:24\",\"user_id\":39}', '2026-04-12 19:24:24'),
(64, 1, 'CREATE', 'tbl_student_profile', 11, NULL, '{\"user_id\":39,\"student_number\":\"2026-IT-IRREG-FAIL-FULL\",\"student_id_number\":\"2026-IT-IRREG-FAIL-FULL\",\"first_name\":\"Brianna\",\"last_name\":\"Torres\",\"contact_number\":\"09189990077\",\"address\":\"Cagayan de Oro, Philippines\",\"academic_status\":\"Irregular\",\"Current_Program\":1,\"year_level_id\":3,\"student_id\":11}', '2026-04-12 19:24:24'),
(65, 1, 'CREATE', 'tbl_evaluation', 140, NULL, '{\"student_id\":11,\"subject_id\":7,\"academic_year_id\":1,\"semester_id\":1,\"grade\":\"92\",\"evaluation_status\":\"passed\",\"evaluated_by\":1,\"modality_id\":null,\"evaluation_date\":\"2023-12-15 00:00:00\",\"enrolled_date\":\"2023-08-15 00:00:00\",\"section_id\":null,\"inc_compliance_deadline\":null,\"evaluation_id\":140}', '2026-04-12 19:24:24'),
(66, 1, 'UPDATE', 'tbl_student_profile', 11, '{\"year_level_id\":3}', '{\"year_level_id\":1}', '2026-04-12 19:24:24'),
(67, 1, 'CREATE', 'tbl_evaluation', 141, NULL, '{\"student_id\":11,\"subject_id\":5,\"academic_year_id\":1,\"semester_id\":1,\"grade\":\"91\",\"evaluation_status\":\"passed\",\"evaluated_by\":1,\"modality_id\":null,\"evaluation_date\":\"2023-12-15 00:00:00\",\"enrolled_date\":\"2023-08-15 00:00:00\",\"section_id\":null,\"inc_compliance_deadline\":null,\"evaluation_id\":141}', '2026-04-12 19:24:24'),
(68, 1, 'CREATE', 'tbl_evaluation', 142, NULL, '{\"student_id\":11,\"subject_id\":6,\"academic_year_id\":1,\"semester_id\":1,\"grade\":\"93\",\"evaluation_status\":\"passed\",\"evaluated_by\":1,\"modality_id\":null,\"evaluation_date\":\"2023-12-15 00:00:00\",\"enrolled_date\":\"2023-08-15 00:00:00\",\"section_id\":null,\"inc_compliance_deadline\":null,\"evaluation_id\":142}', '2026-04-12 19:24:24'),
(69, 1, 'CREATE', 'tbl_evaluation', 143, NULL, '{\"student_id\":11,\"subject_id\":1,\"academic_year_id\":1,\"semester_id\":1,\"grade\":\"1.25\",\"evaluation_status\":\"passed\",\"evaluated_by\":1,\"modality_id\":null,\"evaluation_date\":\"2023-12-15 00:00:00\",\"enrolled_date\":\"2023-08-15 00:00:00\",\"section_id\":null,\"inc_compliance_deadline\":null,\"evaluation_id\":143}', '2026-04-12 19:24:24'),
(70, 1, 'CREATE', 'tbl_evaluation', 144, NULL, '{\"student_id\":11,\"subject_id\":9,\"academic_year_id\":1,\"semester_id\":1,\"grade\":\"89\",\"evaluation_status\":\"passed\",\"evaluated_by\":1,\"modality_id\":null,\"evaluation_date\":\"2023-12-15 00:00:00\",\"enrolled_date\":\"2023-08-15 00:00:00\",\"section_id\":null,\"inc_compliance_deadline\":null,\"evaluation_id\":144}', '2026-04-12 19:24:24'),
(71, 1, 'CREATE', 'tbl_evaluation', 145, NULL, '{\"student_id\":11,\"subject_id\":10,\"academic_year_id\":1,\"semester_id\":1,\"grade\":\"88\",\"evaluation_status\":\"passed\",\"evaluated_by\":1,\"modality_id\":null,\"evaluation_date\":\"2023-12-15 00:00:00\",\"enrolled_date\":\"2023-08-15 00:00:00\",\"section_id\":null,\"inc_compliance_deadline\":null,\"evaluation_id\":145}', '2026-04-12 19:24:24'),
(72, 1, 'CREATE', 'tbl_evaluation', 146, NULL, '{\"student_id\":11,\"subject_id\":26,\"academic_year_id\":1,\"semester_id\":1,\"grade\":\"1.0\",\"evaluation_status\":\"passed\",\"evaluated_by\":1,\"modality_id\":null,\"evaluation_date\":\"2023-12-15 00:00:00\",\"enrolled_date\":\"2023-08-15 00:00:00\",\"section_id\":null,\"inc_compliance_deadline\":null,\"evaluation_id\":146}', '2026-04-12 19:24:24'),
(73, 1, 'CREATE', 'tbl_evaluation', 147, NULL, '{\"student_id\":11,\"subject_id\":2,\"academic_year_id\":1,\"semester_id\":2,\"grade\":\"1.5\",\"evaluation_status\":\"passed\",\"evaluated_by\":1,\"modality_id\":null,\"evaluation_date\":\"2024-05-10 00:00:00\",\"enrolled_date\":\"2024-01-10 00:00:00\",\"section_id\":null,\"inc_compliance_deadline\":null,\"evaluation_id\":147}', '2026-04-12 19:24:24'),
(74, 1, 'CREATE', 'tbl_evaluation', 148, NULL, '{\"student_id\":11,\"subject_id\":3,\"academic_year_id\":1,\"semester_id\":2,\"grade\":\"1.75\",\"evaluation_status\":\"passed\",\"evaluated_by\":1,\"modality_id\":null,\"evaluation_date\":\"2024-05-10 00:00:00\",\"enrolled_date\":\"2024-01-10 00:00:00\",\"section_id\":null,\"inc_compliance_deadline\":null,\"evaluation_id\":148}', '2026-04-12 19:24:24'),
(75, 1, 'CREATE', 'tbl_evaluation', 149, NULL, '{\"student_id\":11,\"subject_id\":8,\"academic_year_id\":1,\"semester_id\":2,\"grade\":\"90\",\"evaluation_status\":\"passed\",\"evaluated_by\":1,\"modality_id\":null,\"evaluation_date\":\"2024-05-10 00:00:00\",\"enrolled_date\":\"2024-01-10 00:00:00\",\"section_id\":null,\"inc_compliance_deadline\":null,\"evaluation_id\":149}', '2026-04-12 19:24:24'),
(76, 1, 'CREATE', 'tbl_evaluation', 150, NULL, '{\"student_id\":11,\"subject_id\":14,\"academic_year_id\":1,\"semester_id\":2,\"grade\":\"87\",\"evaluation_status\":\"passed\",\"evaluated_by\":1,\"modality_id\":null,\"evaluation_date\":\"2024-05-10 00:00:00\",\"enrolled_date\":\"2024-01-10 00:00:00\",\"section_id\":null,\"inc_compliance_deadline\":null,\"evaluation_id\":150}', '2026-04-12 19:24:24'),
(77, 1, 'CREATE', 'tbl_evaluation', 151, NULL, '{\"student_id\":11,\"subject_id\":13,\"academic_year_id\":1,\"semester_id\":2,\"grade\":\"68\",\"evaluation_status\":\"failed\",\"evaluated_by\":1,\"modality_id\":null,\"evaluation_date\":\"2024-05-10 00:00:00\",\"enrolled_date\":\"2024-01-10 00:00:00\",\"section_id\":null,\"inc_compliance_deadline\":null,\"evaluation_id\":151}', '2026-04-12 19:24:24'),
(78, 1, 'CREATE', 'tbl_evaluation', 152, NULL, '{\"student_id\":11,\"subject_id\":15,\"academic_year_id\":1,\"semester_id\":2,\"grade\":\"91\",\"evaluation_status\":\"passed\",\"evaluated_by\":1,\"modality_id\":null,\"evaluation_date\":\"2024-05-10 00:00:00\",\"enrolled_date\":\"2024-01-10 00:00:00\",\"section_id\":null,\"inc_compliance_deadline\":null,\"evaluation_id\":152}', '2026-04-12 19:24:24'),
(79, 1, 'CREATE', 'tbl_evaluation', 153, NULL, '{\"student_id\":11,\"subject_id\":16,\"academic_year_id\":1,\"semester_id\":1,\"grade\":\"65\",\"evaluation_status\":\"failed\",\"evaluated_by\":1,\"modality_id\":null,\"evaluation_date\":\"2024-12-15 00:00:00\",\"enrolled_date\":\"2024-08-15 00:00:00\",\"section_id\":null,\"inc_compliance_deadline\":null,\"evaluation_id\":153}', '2026-04-12 19:24:24'),
(80, 1, 'CREATE', 'tbl_evaluation', 154, NULL, '{\"student_id\":11,\"subject_id\":17,\"academic_year_id\":1,\"semester_id\":1,\"grade\":\"88\",\"evaluation_status\":\"passed\",\"evaluated_by\":1,\"modality_id\":null,\"evaluation_date\":\"2024-12-15 00:00:00\",\"enrolled_date\":\"2024-08-15 00:00:00\",\"section_id\":null,\"inc_compliance_deadline\":null,\"evaluation_id\":154}', '2026-04-12 19:24:24'),
(81, 1, 'CREATE', 'tbl_evaluation', 155, NULL, '{\"student_id\":11,\"subject_id\":18,\"academic_year_id\":1,\"semester_id\":1,\"grade\":\"71\",\"evaluation_status\":\"failed\",\"evaluated_by\":1,\"modality_id\":null,\"evaluation_date\":\"2024-12-15 00:00:00\",\"enrolled_date\":\"2024-08-15 00:00:00\",\"section_id\":null,\"inc_compliance_deadline\":null,\"evaluation_id\":155}', '2026-04-12 19:24:24'),
(82, 1, 'CREATE', 'tbl_evaluation', 156, NULL, '{\"student_id\":11,\"subject_id\":19,\"academic_year_id\":1,\"semester_id\":1,\"grade\":\"1.5\",\"evaluation_status\":\"passed\",\"evaluated_by\":1,\"modality_id\":null,\"evaluation_date\":\"2024-12-15 00:00:00\",\"enrolled_date\":\"2024-08-15 00:00:00\",\"section_id\":null,\"inc_compliance_deadline\":null,\"evaluation_id\":156}', '2026-04-12 19:24:24'),
(83, 1, 'CREATE', 'tbl_evaluation', 157, NULL, '{\"student_id\":11,\"subject_id\":20,\"academic_year_id\":1,\"semester_id\":1,\"grade\":\"1.75\",\"evaluation_status\":\"passed\",\"evaluated_by\":1,\"modality_id\":null,\"evaluation_date\":\"2024-12-15 00:00:00\",\"enrolled_date\":\"2024-08-15 00:00:00\",\"section_id\":null,\"inc_compliance_deadline\":null,\"evaluation_id\":157}', '2026-04-12 19:24:24'),
(84, 1, 'CREATE', 'tbl_evaluation', 158, NULL, '{\"student_id\":11,\"subject_id\":21,\"academic_year_id\":1,\"semester_id\":2,\"grade\":\"74\",\"evaluation_status\":\"failed\",\"evaluated_by\":1,\"modality_id\":null,\"evaluation_date\":\"2025-05-10 00:00:00\",\"enrolled_date\":\"2025-01-10 00:00:00\",\"section_id\":null,\"inc_compliance_deadline\":null,\"evaluation_id\":158}', '2026-04-12 19:24:24'),
(85, 1, 'CREATE', 'tbl_evaluation', 159, NULL, '{\"student_id\":11,\"subject_id\":22,\"academic_year_id\":1,\"semester_id\":2,\"grade\":\"1.5\",\"evaluation_status\":\"passed\",\"evaluated_by\":1,\"modality_id\":null,\"evaluation_date\":\"2025-05-10 00:00:00\",\"enrolled_date\":\"2025-01-10 00:00:00\",\"section_id\":null,\"inc_compliance_deadline\":null,\"evaluation_id\":159}', '2026-04-12 19:24:24'),
(86, 1, 'CREATE', 'tbl_evaluation', 160, NULL, '{\"student_id\":11,\"subject_id\":23,\"academic_year_id\":1,\"semester_id\":2,\"grade\":\"1.75\",\"evaluation_status\":\"passed\",\"evaluated_by\":1,\"modality_id\":null,\"evaluation_date\":\"2025-05-10 00:00:00\",\"enrolled_date\":\"2025-01-10 00:00:00\",\"section_id\":null,\"inc_compliance_deadline\":null,\"evaluation_id\":160}', '2026-04-12 19:24:25'),
(87, 1, 'CREATE', 'tbl_evaluation', 161, NULL, '{\"student_id\":11,\"subject_id\":24,\"academic_year_id\":1,\"semester_id\":2,\"grade\":\"86\",\"evaluation_status\":\"passed\",\"evaluated_by\":1,\"modality_id\":null,\"evaluation_date\":\"2025-05-10 00:00:00\",\"enrolled_date\":\"2025-01-10 00:00:00\",\"section_id\":null,\"inc_compliance_deadline\":null,\"evaluation_id\":161}', '2026-04-12 19:24:25'),
(88, 1, 'CREATE', 'tbl_evaluation', 162, NULL, '{\"student_id\":11,\"subject_id\":25,\"academic_year_id\":1,\"semester_id\":2,\"grade\":\"90\",\"evaluation_status\":\"passed\",\"evaluated_by\":1,\"modality_id\":null,\"evaluation_date\":\"2025-05-10 00:00:00\",\"enrolled_date\":\"2025-01-10 00:00:00\",\"section_id\":null,\"inc_compliance_deadline\":null,\"evaluation_id\":162}', '2026-04-12 19:24:25'),
(89, 1, 'CREATE', 'tbl_evaluation', 163, NULL, '{\"student_id\":11,\"subject_id\":4,\"academic_year_id\":1,\"semester_id\":2,\"grade\":\"3.5\",\"evaluation_status\":\"failed\",\"evaluated_by\":1,\"modality_id\":null,\"evaluation_date\":\"2025-05-10 00:00:00\",\"enrolled_date\":\"2025-01-10 00:00:00\",\"section_id\":null,\"inc_compliance_deadline\":null,\"evaluation_id\":163}', '2026-04-12 19:24:25'),
(90, 22, 'UPDATE', 'tbl_student_profile', 3, '{\"promoted_next_sem_at\":null,\"promoted_next_sem_by\":null,\"promotion_evaluated_by\":null,\"promotion_target_year_level_id\":null,\"promotion_target_semester_id\":null}', '{\"promoted_next_sem_at\":\"2026-04-17 03:56:45\",\"promoted_next_sem_by\":22,\"promotion_evaluated_by\":\"faculty@example.com\",\"promotion_target_year_level_id\":1,\"promotion_target_semester_id\":2}', '2026-04-16 19:56:45'),
(91, 22, 'UPDATE', 'tbl_student_profile', 1, '{\"promoted_next_sem_at\":null,\"promoted_next_sem_by\":null,\"promotion_evaluated_by\":null,\"promotion_target_year_level_id\":null,\"promotion_target_semester_id\":null}', '{\"promoted_next_sem_at\":\"2026-04-17 03:58:14\",\"promoted_next_sem_by\":22,\"promotion_evaluated_by\":\"faculty@example.com\",\"promotion_target_year_level_id\":2,\"promotion_target_semester_id\":1}', '2026-04-16 19:58:14'),
(92, 22, 'UPDATE', 'tbl_student_profile', 1, '{\"academic_status\":\"active\",\"year_level_id\":1}', '{\"academic_status\":\"Regular\",\"year_level_id\":2}', '2026-04-16 19:58:14'),
(93, 22, 'UPDATE', 'tbl_student_profile', 1, '{\"promoted_next_sem_at\":\"2026-04-17T03:58:14.000000Z\",\"promotion_target_semester_id\":1}', '{\"promoted_next_sem_at\":\"2026-04-17 03:59:08\",\"promotion_target_semester_id\":2}', '2026-04-16 19:59:08'),
(94, 1, 'CREATE', 'curriculum', 151, NULL, '{\"curriculum_header_id\":1,\"program_id\":1,\"year_level\":4,\"semester_id\":1,\"subject_id\":59,\"elective_slot_id\":null,\"passing_grade\":50,\"subject_type\":\"core\",\"requisite_id\":14,\"curriculum_id\":151}', '2026-04-16 20:22:58'),
(95, 1, 'CREATE', 'curriculum', 152, NULL, '{\"curriculum_header_id\":1,\"program_id\":1,\"year_level\":4,\"semester_id\":1,\"subject_id\":null,\"elective_slot_id\":4,\"passing_grade\":50,\"subject_type\":\"elective subject\",\"requisite_id\":null,\"curriculum_id\":152}', '2026-04-16 20:22:58'),
(96, 1, 'CREATE', 'curriculum', 153, NULL, '{\"curriculum_header_id\":1,\"program_id\":1,\"year_level\":4,\"semester_id\":1,\"subject_id\":61,\"elective_slot_id\":null,\"passing_grade\":50,\"subject_type\":\"core\",\"requisite_id\":16,\"curriculum_id\":153}', '2026-04-16 20:22:58'),
(97, 1, 'CREATE', 'curriculum', 154, NULL, '{\"curriculum_header_id\":1,\"program_id\":1,\"year_level\":4,\"semester_id\":1,\"subject_id\":62,\"elective_slot_id\":null,\"passing_grade\":50,\"subject_type\":\"core\",\"requisite_id\":17,\"curriculum_id\":154}', '2026-04-16 20:22:58'),
(98, 1, 'CREATE', 'curriculum', 155, NULL, '{\"curriculum_header_id\":1,\"program_id\":1,\"year_level\":4,\"semester_id\":2,\"subject_id\":63,\"elective_slot_id\":null,\"passing_grade\":50,\"subject_type\":\"core\",\"requisite_id\":null,\"curriculum_id\":155}', '2026-04-16 20:23:36'),
(99, 15, 'UPDATE', 'tbl_evaluation', 122, '{\"grade\":\"75\",\"evaluation_status\":\"passed\",\"evaluated_by\":22}', '{\"grade\":null,\"evaluation_status\":null,\"evaluated_by\":15}', '2026-04-16 20:24:21'),
(100, 15, 'UPDATE', 'tbl_student_profile', 9, '{\"academic_status\":\"Regular\"}', '{\"academic_status\":\"Irregular\"}', '2026-04-16 20:24:21'),
(101, 15, 'UPDATE', 'tbl_evaluation', 123, '{\"grade\":\"75\",\"evaluation_status\":\"passed\",\"evaluated_by\":22}', '{\"grade\":null,\"evaluation_status\":null,\"evaluated_by\":15}', '2026-04-16 20:24:22'),
(102, 15, 'UPDATE', 'tbl_evaluation', 124, '{\"grade\":\"75\",\"evaluation_status\":\"passed\",\"evaluated_by\":22}', '{\"grade\":null,\"evaluation_status\":null,\"evaluated_by\":15}', '2026-04-16 20:24:22'),
(103, 15, 'UPDATE', 'tbl_evaluation', 118, '{\"grade\":\"92.9\",\"evaluation_status\":\"passed\",\"evaluated_by\":1}', '{\"grade\":null,\"evaluation_status\":null,\"evaluated_by\":15}', '2026-04-16 20:24:22'),
(104, 15, 'UPDATE', 'tbl_evaluation', 119, '{\"grade\":\"92\",\"evaluation_status\":\"passed\",\"evaluated_by\":1}', '{\"grade\":null,\"evaluation_status\":null,\"evaluated_by\":15}', '2026-04-16 20:24:22'),
(105, 15, 'UPDATE', 'tbl_evaluation', 120, '{\"grade\":\"97.4\",\"evaluation_status\":\"passed\",\"evaluated_by\":1}', '{\"grade\":null,\"evaluation_status\":null,\"evaluated_by\":15}', '2026-04-16 20:24:22'),
(106, 15, 'UPDATE', 'tbl_evaluation', 125, '{\"grade\":\"75\",\"evaluation_status\":\"passed\",\"evaluated_by\":22}', '{\"grade\":null,\"evaluation_status\":null,\"evaluated_by\":15}', '2026-04-16 20:24:22'),
(107, 15, 'UPDATE', 'tbl_evaluation', 121, '{\"grade\":\"86.3\",\"evaluation_status\":\"passed\",\"evaluated_by\":1}', '{\"grade\":null,\"evaluation_status\":null,\"evaluated_by\":15}', '2026-04-16 20:24:22'),
(108, 15, 'UPDATE', 'tbl_student_profile', 9, '{\"academic_status\":\"Irregular\"}', '{\"academic_status\":\"Regular\"}', '2026-04-16 20:24:22'),
(109, 15, 'UPDATE', 'tbl_evaluation', 122, '{\"grade\":null,\"evaluation_status\":null}', '{\"grade\":\"75\",\"evaluation_status\":\"passed\"}', '2026-04-16 20:24:29'),
(110, 15, 'UPDATE', 'tbl_evaluation', 123, '{\"grade\":null,\"evaluation_status\":null}', '{\"grade\":\"75\",\"evaluation_status\":\"passed\"}', '2026-04-16 20:24:30'),
(111, 15, 'UPDATE', 'tbl_evaluation', 124, '{\"grade\":null,\"evaluation_status\":null}', '{\"grade\":\"75\",\"evaluation_status\":\"passed\"}', '2026-04-16 20:24:30'),
(112, 15, 'UPDATE', 'tbl_evaluation', 118, '{\"grade\":null,\"evaluation_status\":null}', '{\"grade\":\"75\",\"evaluation_status\":\"passed\"}', '2026-04-16 20:24:30'),
(113, 15, 'UPDATE', 'tbl_evaluation', 119, '{\"grade\":null,\"evaluation_status\":null}', '{\"grade\":\"75\",\"evaluation_status\":\"passed\"}', '2026-04-16 20:24:30'),
(114, 15, 'UPDATE', 'tbl_evaluation', 120, '{\"grade\":null,\"evaluation_status\":null}', '{\"grade\":\"75\",\"evaluation_status\":\"passed\"}', '2026-04-16 20:24:30'),
(115, 15, 'UPDATE', 'tbl_evaluation', 125, '{\"grade\":null,\"evaluation_status\":null}', '{\"grade\":\"75\",\"evaluation_status\":\"passed\"}', '2026-04-16 20:24:30'),
(116, 15, 'UPDATE', 'tbl_evaluation', 121, '{\"grade\":null,\"evaluation_status\":null}', '{\"grade\":\"75\",\"evaluation_status\":\"passed\"}', '2026-04-16 20:24:30'),
(117, 15, 'UPDATE', 'tbl_evaluation', 126, '{\"grade\":\"49\",\"evaluation_status\":\"failed\",\"evaluated_by\":22}', '{\"grade\":null,\"evaluation_status\":null,\"evaluated_by\":15}', '2026-04-16 20:24:41'),
(118, 15, 'UPDATE', 'tbl_evaluation', 127, '{\"grade\":\"49\",\"evaluation_status\":\"failed\",\"evaluated_by\":22}', '{\"grade\":null,\"evaluation_status\":null,\"evaluated_by\":15}', '2026-04-16 20:24:42'),
(119, 15, 'UPDATE', 'tbl_evaluation', 128, '{\"grade\":\"49\",\"evaluation_status\":\"failed\",\"evaluated_by\":22}', '{\"grade\":null,\"evaluation_status\":null,\"evaluated_by\":15}', '2026-04-16 20:24:42'),
(120, 15, 'UPDATE', 'tbl_evaluation', 129, '{\"grade\":\"49\",\"evaluation_status\":\"failed\",\"evaluated_by\":22}', '{\"grade\":null,\"evaluation_status\":null,\"evaluated_by\":15}', '2026-04-16 20:24:42'),
(121, 15, 'UPDATE', 'tbl_evaluation', 130, '{\"grade\":\"49\",\"evaluation_status\":\"failed\",\"evaluated_by\":22}', '{\"grade\":null,\"evaluation_status\":null,\"evaluated_by\":15}', '2026-04-16 20:24:42'),
(122, 15, 'UPDATE', 'tbl_evaluation', 131, '{\"grade\":\"49\",\"evaluation_status\":\"failed\",\"evaluated_by\":22}', '{\"grade\":null,\"evaluation_status\":null,\"evaluated_by\":15}', '2026-04-16 20:24:42'),
(123, 15, 'UPDATE', 'tbl_evaluation', 132, '{\"grade\":\"49\",\"evaluation_status\":\"failed\",\"evaluated_by\":22}', '{\"grade\":null,\"evaluation_status\":null,\"evaluated_by\":15}', '2026-04-16 20:24:42'),
(124, 15, 'UPDATE', 'tbl_evaluation', 133, '{\"grade\":\"49\",\"evaluation_status\":\"failed\",\"evaluated_by\":22}', '{\"grade\":null,\"evaluation_status\":null,\"evaluated_by\":15}', '2026-04-16 20:24:42'),
(125, 15, 'UPDATE', 'tbl_evaluation', 122, '{\"grade\":\"75\",\"evaluation_status\":\"passed\"}', '{\"grade\":null,\"evaluation_status\":null}', '2026-04-16 20:24:47'),
(126, 15, 'UPDATE', 'tbl_student_profile', 9, '{\"academic_status\":\"Regular\"}', '{\"academic_status\":\"Irregular\"}', '2026-04-16 20:24:47'),
(127, 15, 'UPDATE', 'tbl_evaluation', 123, '{\"grade\":\"75\",\"evaluation_status\":\"passed\"}', '{\"grade\":null,\"evaluation_status\":null}', '2026-04-16 20:24:47'),
(128, 15, 'UPDATE', 'tbl_evaluation', 124, '{\"grade\":\"75\",\"evaluation_status\":\"passed\"}', '{\"grade\":null,\"evaluation_status\":null}', '2026-04-16 20:24:47'),
(129, 15, 'UPDATE', 'tbl_evaluation', 118, '{\"grade\":\"75\",\"evaluation_status\":\"passed\"}', '{\"grade\":null,\"evaluation_status\":null}', '2026-04-16 20:24:47'),
(130, 15, 'UPDATE', 'tbl_evaluation', 119, '{\"grade\":\"75\",\"evaluation_status\":\"passed\"}', '{\"grade\":null,\"evaluation_status\":null}', '2026-04-16 20:24:47'),
(131, 15, 'UPDATE', 'tbl_evaluation', 120, '{\"grade\":\"75\",\"evaluation_status\":\"passed\"}', '{\"grade\":null,\"evaluation_status\":null}', '2026-04-16 20:24:47'),
(132, 15, 'UPDATE', 'tbl_evaluation', 125, '{\"grade\":\"75\",\"evaluation_status\":\"passed\"}', '{\"grade\":null,\"evaluation_status\":null}', '2026-04-16 20:24:48'),
(133, 15, 'UPDATE', 'tbl_evaluation', 121, '{\"grade\":\"75\",\"evaluation_status\":\"passed\"}', '{\"grade\":null,\"evaluation_status\":null}', '2026-04-16 20:24:48'),
(134, 15, 'UPDATE', 'tbl_student_profile', 9, '{\"academic_status\":\"Irregular\"}', '{\"academic_status\":\"Regular\"}', '2026-04-16 20:24:48'),
(135, 15, 'UPDATE', 'tbl_evaluation', 106, '{\"grade\":null,\"evaluation_status\":null,\"evaluated_by\":34}', '{\"grade\":\"49\",\"evaluation_status\":\"failed\",\"evaluated_by\":15}', '2026-04-16 20:33:19'),
(136, 15, 'UPDATE', 'tbl_student_profile', 4, '{\"academic_status\":\"Regular\"}', '{\"academic_status\":\"Irregular\"}', '2026-04-16 20:33:19'),
(137, 15, 'UPDATE', 'tbl_evaluation', 107, '{\"grade\":null,\"evaluation_status\":null,\"evaluated_by\":34}', '{\"grade\":\"75\",\"evaluation_status\":\"passed\",\"evaluated_by\":15}', '2026-04-16 20:33:19'),
(138, 15, 'UPDATE', 'tbl_evaluation', 108, '{\"grade\":null,\"evaluation_status\":null,\"evaluated_by\":34}', '{\"grade\":\"75\",\"evaluation_status\":\"passed\",\"evaluated_by\":15}', '2026-04-16 20:33:20'),
(139, 15, 'UPDATE', 'tbl_evaluation', 109, '{\"grade\":null,\"evaluation_status\":null,\"evaluated_by\":34}', '{\"grade\":\"75\",\"evaluation_status\":\"passed\",\"evaluated_by\":15}', '2026-04-16 20:33:20'),
(140, 15, 'UPDATE', 'tbl_evaluation', 111, '{\"grade\":null,\"evaluation_status\":null,\"evaluated_by\":34}', '{\"grade\":\"75\",\"evaluation_status\":\"passed\",\"evaluated_by\":15}', '2026-04-16 20:33:20'),
(141, 15, 'UPDATE', 'tbl_evaluation', 110, '{\"grade\":null,\"evaluation_status\":null,\"evaluated_by\":34}', '{\"grade\":\"49\",\"evaluation_status\":\"failed\",\"evaluated_by\":15}', '2026-04-16 20:33:20'),
(142, 15, 'UPDATE', 'tbl_student_profile', 4, '{\"promoted_next_sem_at\":null,\"promoted_next_sem_by\":null,\"promotion_evaluated_by\":null,\"promotion_target_year_level_id\":null,\"promotion_target_semester_id\":null}', '{\"promoted_next_sem_at\":\"2026-04-17 04:39:30\",\"promoted_next_sem_by\":15,\"promotion_evaluated_by\":\"dean@example.com\",\"promotion_target_year_level_id\":1,\"promotion_target_semester_id\":2}', '2026-04-16 20:39:30'),
(143, 15, 'CREATE', 'tbl_evaluation', 164, NULL, '{\"student_id\":4,\"subject_id\":17,\"academic_year_id\":1,\"semester_id\":2,\"grade\":\"75\",\"evaluation_status\":\"passed\",\"evaluated_by\":15,\"inc_compliance_deadline\":null,\"evaluation_id\":164}', '2026-04-16 20:48:43'),
(144, 15, 'CREATE', 'tbl_evaluation', 165, NULL, '{\"student_id\":4,\"subject_id\":16,\"academic_year_id\":1,\"semester_id\":2,\"grade\":\"75\",\"evaluation_status\":\"passed\",\"evaluated_by\":15,\"inc_compliance_deadline\":null,\"evaluation_id\":165}', '2026-04-16 20:48:43'),
(145, 15, 'CREATE', 'tbl_evaluation', 166, NULL, '{\"student_id\":4,\"subject_id\":15,\"academic_year_id\":1,\"semester_id\":2,\"grade\":\"75\",\"evaluation_status\":\"passed\",\"evaluated_by\":15,\"inc_compliance_deadline\":null,\"evaluation_id\":166}', '2026-04-16 20:48:43'),
(146, 15, 'CREATE', 'tbl_evaluation', 167, NULL, '{\"student_id\":4,\"subject_id\":14,\"academic_year_id\":1,\"semester_id\":2,\"grade\":\"75\",\"evaluation_status\":\"passed\",\"evaluated_by\":15,\"inc_compliance_deadline\":null,\"evaluation_id\":167}', '2026-04-16 20:48:43'),
(147, 15, 'CREATE', 'tbl_evaluation', 168, NULL, '{\"student_id\":4,\"subject_id\":3,\"academic_year_id\":1,\"semester_id\":2,\"grade\":\"75\",\"evaluation_status\":\"passed\",\"evaluated_by\":15,\"inc_compliance_deadline\":null,\"evaluation_id\":168}', '2026-04-16 20:48:43'),
(148, 15, 'CREATE', 'tbl_evaluation', 169, NULL, '{\"student_id\":4,\"subject_id\":4,\"academic_year_id\":1,\"semester_id\":2,\"grade\":\"49\",\"evaluation_status\":\"failed\",\"evaluated_by\":15,\"inc_compliance_deadline\":null,\"evaluation_id\":169}', '2026-04-16 20:48:44'),
(149, 15, 'UPDATE', 'tbl_evaluation', 169, '{\"grade\":\"49\",\"evaluation_status\":\"failed\"}', '{\"grade\":\"75\",\"evaluation_status\":\"passed\"}', '2026-04-16 20:51:02'),
(150, 15, 'UPDATE', 'tbl_student_profile', 4, '{\"promoted_next_sem_at\":\"2026-04-17T04:39:30.000000Z\",\"promotion_target_year_level_id\":1,\"promotion_target_semester_id\":2}', '{\"promoted_next_sem_at\":\"2026-04-17 05:01:19\",\"promotion_target_year_level_id\":2,\"promotion_target_semester_id\":1}', '2026-04-16 21:01:19'),
(151, 15, 'CREATE', 'tbl_evaluation', 170, NULL, '{\"student_id\":4,\"subject_id\":26,\"academic_year_id\":1,\"semester_id\":1,\"grade\":\"49\",\"evaluation_status\":\"failed\",\"evaluated_by\":15,\"inc_compliance_deadline\":null,\"evaluation_id\":170}', '2026-04-16 21:07:05'),
(152, 15, 'CREATE', 'tbl_evaluation', 171, NULL, '{\"student_id\":4,\"subject_id\":25,\"academic_year_id\":1,\"semester_id\":1,\"grade\":\"49\",\"evaluation_status\":\"failed\",\"evaluated_by\":15,\"inc_compliance_deadline\":null,\"evaluation_id\":171}', '2026-04-16 21:07:05'),
(153, 15, 'CREATE', 'tbl_evaluation', 172, NULL, '{\"student_id\":4,\"subject_id\":77,\"academic_year_id\":1,\"semester_id\":1,\"grade\":\"75\",\"evaluation_status\":\"passed\",\"evaluated_by\":15,\"inc_compliance_deadline\":null,\"evaluation_id\":172}', '2026-04-16 21:07:05'),
(154, 15, 'CREATE', 'tbl_evaluation', 173, NULL, '{\"student_id\":4,\"subject_id\":24,\"academic_year_id\":1,\"semester_id\":1,\"grade\":\"75\",\"evaluation_status\":\"passed\",\"evaluated_by\":15,\"inc_compliance_deadline\":null,\"evaluation_id\":173}', '2026-04-16 21:07:05'),
(155, 15, 'CREATE', 'tbl_evaluation', 174, NULL, '{\"student_id\":4,\"subject_id\":23,\"academic_year_id\":1,\"semester_id\":1,\"grade\":\"75\",\"evaluation_status\":\"passed\",\"evaluated_by\":15,\"inc_compliance_deadline\":null,\"evaluation_id\":174}', '2026-04-16 21:07:05'),
(156, 15, 'CREATE', 'tbl_evaluation', 175, NULL, '{\"student_id\":4,\"subject_id\":22,\"academic_year_id\":1,\"semester_id\":1,\"grade\":\"75\",\"evaluation_status\":\"passed\",\"evaluated_by\":15,\"inc_compliance_deadline\":null,\"evaluation_id\":175}', '2026-04-16 21:07:05'),
(157, 15, 'CREATE', 'tbl_evaluation', 176, NULL, '{\"student_id\":4,\"subject_id\":21,\"academic_year_id\":1,\"semester_id\":1,\"grade\":\"75\",\"evaluation_status\":\"passed\",\"evaluated_by\":15,\"inc_compliance_deadline\":null,\"evaluation_id\":176}', '2026-04-16 21:07:05'),
(158, 15, 'CREATE', 'tbl_evaluation', 177, NULL, '{\"student_id\":4,\"subject_id\":20,\"academic_year_id\":1,\"semester_id\":1,\"grade\":\"75\",\"evaluation_status\":\"passed\",\"evaluated_by\":15,\"inc_compliance_deadline\":null,\"evaluation_id\":177}', '2026-04-16 21:07:05'),
(159, 15, 'CREATE', 'tbl_evaluation', 178, NULL, '{\"student_id\":4,\"subject_id\":19,\"academic_year_id\":1,\"semester_id\":1,\"grade\":\"75\",\"evaluation_status\":\"passed\",\"evaluated_by\":15,\"inc_compliance_deadline\":null,\"evaluation_id\":178}', '2026-04-16 21:07:06'),
(160, 15, 'UPDATE', 'tbl_student_profile', 4, '{\"promoted_next_sem_at\":\"2026-04-17T05:01:19.000000Z\",\"promotion_target_semester_id\":1}', '{\"promoted_next_sem_at\":\"2026-04-17 05:07:10\",\"promotion_target_semester_id\":2}', '2026-04-16 21:07:10'),
(161, 15, 'UPDATE', 'tbl_student_profile', 4, '{\"promoted_next_sem_at\":\"2026-04-17T05:07:10.000000Z\"}', '{\"promoted_next_sem_at\":\"2026-04-17 05:13:14\"}', '2026-04-16 21:13:14'),
(162, 15, 'CREATE', 'tbl_evaluation', 179, NULL, '{\"student_id\":4,\"subject_id\":42,\"academic_year_id\":1,\"semester_id\":2,\"grade\":\"75\",\"evaluation_status\":\"passed\",\"evaluated_by\":15,\"inc_compliance_deadline\":null,\"evaluation_id\":179}', '2026-04-16 21:28:14'),
(163, 15, 'CREATE', 'tbl_evaluation', 180, NULL, '{\"student_id\":4,\"subject_id\":41,\"academic_year_id\":1,\"semester_id\":2,\"grade\":\"75\",\"evaluation_status\":\"passed\",\"evaluated_by\":15,\"inc_compliance_deadline\":null,\"evaluation_id\":180}', '2026-04-16 21:28:15'),
(164, 15, 'CREATE', 'tbl_evaluation', 181, NULL, '{\"student_id\":4,\"subject_id\":40,\"academic_year_id\":1,\"semester_id\":2,\"grade\":\"75\",\"evaluation_status\":\"passed\",\"evaluated_by\":15,\"inc_compliance_deadline\":null,\"evaluation_id\":181}', '2026-04-16 21:28:15'),
(165, 15, 'CREATE', 'tbl_evaluation', 182, NULL, '{\"student_id\":4,\"subject_id\":39,\"academic_year_id\":1,\"semester_id\":2,\"grade\":\"75\",\"evaluation_status\":\"passed\",\"evaluated_by\":15,\"inc_compliance_deadline\":null,\"evaluation_id\":182}', '2026-04-16 21:28:15'),
(166, 15, 'CREATE', 'tbl_evaluation', 183, NULL, '{\"student_id\":4,\"subject_id\":38,\"academic_year_id\":1,\"semester_id\":2,\"grade\":\"75\",\"evaluation_status\":\"passed\",\"evaluated_by\":15,\"inc_compliance_deadline\":null,\"evaluation_id\":183}', '2026-04-16 21:28:15'),
(167, 15, 'CREATE', 'tbl_evaluation', 184, NULL, '{\"student_id\":4,\"subject_id\":37,\"academic_year_id\":1,\"semester_id\":2,\"grade\":\"75\",\"evaluation_status\":\"passed\",\"evaluated_by\":15,\"inc_compliance_deadline\":null,\"evaluation_id\":184}', '2026-04-16 21:28:15'),
(168, 15, 'CREATE', 'tbl_evaluation', 185, NULL, '{\"student_id\":4,\"subject_id\":36,\"academic_year_id\":1,\"semester_id\":2,\"grade\":\"75\",\"evaluation_status\":\"passed\",\"evaluated_by\":15,\"inc_compliance_deadline\":null,\"evaluation_id\":185}', '2026-04-16 21:28:15'),
(169, 15, 'UPDATE', 'tbl_student_profile', 4, '{\"promoted_next_sem_at\":\"2026-04-17T05:13:14.000000Z\",\"promotion_target_year_level_id\":2,\"promotion_target_semester_id\":2}', '{\"promoted_next_sem_at\":\"2026-04-17 05:40:56\",\"promotion_target_year_level_id\":3,\"promotion_target_semester_id\":1}', '2026-04-16 21:40:56');

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
('laravel-cache-3m5xpgUug67XKfhC', 's:7:\"forever\";', 2090348581),
('laravel-cache-3Wkppfr2y9yGryPu', 'a:1:{s:11:\"valid_until\";i:1776404475;}', 1777609635),
('laravel-cache-4npeYAdSogW3qU6N', 's:7:\"forever\";', 2091759891),
('laravel-cache-5ZEDwuBVaXrycUUQ', 's:7:\"forever\";', 2091762605),
('laravel-cache-6Qm5axeTAWxKc913', 's:7:\"forever\";', 2090345968),
('laravel-cache-7c3cBDktFAGWG1nH', 'a:1:{s:11:\"valid_until\";i:1775503983;}', 1776711543),
('laravel-cache-89LAiBTkaeKL3vCE', 's:7:\"forever\";', 2090413159),
('laravel-cache-a8SIZhz1GQ3cAY4U', 's:7:\"forever\";', 2090336126),
('laravel-cache-AnGxZ1aDlLAuofzJ', 's:7:\"forever\";', 2090347400),
('laravel-cache-bxe5ChIQdGl6qDiR', 'a:1:{s:11:\"valid_until\";i:1776399275;}', 1777260455),
('laravel-cache-cKUvqH78LCS1ZLcL', 's:7:\"forever\";', 2091762770),
('laravel-cache-ClkgY6Gx9K0kjEMX', 'a:1:{s:11:\"valid_until\";i:1774979702;}', 1776184802),
('laravel-cache-dcIoXLeZyg5sLDIp', 'a:1:{s:11:\"valid_until\";i:1775052560;}', 1776200840),
('laravel-cache-DuBFAL2aw1S09Njm', 's:7:\"forever\";', 2090861819),
('laravel-cache-e1X55sLs9X22D5JD', 's:7:\"forever\";', 2090335453),
('laravel-cache-eofgjyphnw6AP9MH', 's:7:\"forever\";', 2090335433),
('laravel-cache-EpbNQCsKp7XeDWmE', 's:7:\"forever\";', 2090342515),
('laravel-cache-fqD1YKKqc01tAkgv', 's:7:\"forever\";', 2091759466),
('laravel-cache-G9ecONMxR0nvKe6e', 's:7:\"forever\";', 2090861531),
('laravel-cache-GhoemduCIxvBxOV5', 's:7:\"forever\";', 2091408162),
('laravel-cache-hWXQQ9gPvY5E31IS', 'a:1:{s:11:\"valid_until\";i:1775503998;}', 1776713658),
('laravel-cache-IXiQV8Cw5gMXqPqG', 'a:1:{s:11:\"valid_until\";i:1775504115;}', 1776713775),
('laravel-cache-JRT0bYAp87UynUtM', 's:7:\"forever\";', 2090347606),
('laravel-cache-KhoNJ0rcdUb1K4o1', 'a:1:{s:11:\"valid_until\";i:1775504130;}', 1776713790),
('laravel-cache-lLFf3YeXfiTgwVhB', 'a:1:{s:11:\"valid_until\";i:1776046081;}', 1776713941),
('laravel-cache-lN2iVxSNMIOoweyg', 'a:1:{s:11:\"valid_until\";i:1774986505;}', 1776190945),
('laravel-cache-LUZgsPKkmiKB6pUG', 's:7:\"forever\";', 2090350565),
('laravel-cache-lvW40hiZTqXXxeEc', 's:7:\"forever\";', 2091755791),
('laravel-cache-MFBwmDPc73daGQcw', 'a:1:{s:11:\"valid_until\";i:1776049889;}', 1776263609),
('laravel-cache-MRs9KHmcdtwWhcF9', 's:7:\"forever\";', 2091759363),
('laravel-cache-NXp5PvihWJ4C1lZr', 'a:1:{s:11:\"valid_until\";i:1775504100;}', 1776713760),
('laravel-cache-p2ZZVpcVLaavIDFl', 's:7:\"forever\";', 2090349594),
('laravel-cache-plT3f3bVKhOhSYSE', 's:7:\"forever\";', 2091406263),
('laravel-cache-puTFxwTPsK4gMxFI', 'a:1:{s:11:\"valid_until\";i:1775053907;}', 1776200267),
('laravel-cache-pxRZ7dLRIcpioYwY', 'a:1:{s:11:\"valid_until\";i:1776394257;}', 1777259517),
('laravel-cache-QgNpg3Kk0ace158d', 's:7:\"forever\";', 2091406334),
('laravel-cache-QMf9E65oUjVSUsrg', 'a:1:{s:11:\"valid_until\";i:1775504043;}', 1776713703),
('laravel-cache-qQO101c5gxBw5sOZ', 'a:1:{s:11:\"valid_until\";i:1774981271;}', 1776186971),
('laravel-cache-sPBAZjwoocBEI3yH', 's:7:\"forever\";', 2090351137),
('laravel-cache-ubJuH0hpoF5nyGGp', 's:7:\"forever\";', 2091410725),
('laravel-cache-UISX0Xfc2XaWyYhK', 's:7:\"forever\";', 2090336092),
('laravel-cache-vcVVlae2dPFJ1YY5', 'a:1:{s:11:\"valid_until\";i:1775504019;}', 1776713679),
('laravel-cache-VjiYwpJKQT2FIfGc', 's:7:\"forever\";', 2090860836),
('laravel-cache-X5QIV3ydmGdptK0J', 's:7:\"forever\";', 2090337302),
('laravel-cache-xZ9COf8XcuPMUy9b', 's:7:\"forever\";', 2091756254),
('laravel-cache-Yu4AfGZWeItv8EH1', 's:7:\"forever\";', 2091759477),
('laravel-cache-YzWpwzWCe9mIraRo', 's:7:\"forever\";', 2091409817),
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
(89, NULL, 1, 3, NULL, 1, 2, 50, 'core', 18),
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
(136, NULL, 1, NULL, 5, 3, 1, 50, 'core', NULL),
(137, NULL, 1, 51, NULL, 3, 1, 50, 'minor', NULL),
(138, NULL, 1, 52, NULL, 3, 2, 50, 'core', NULL),
(139, NULL, 1, 53, NULL, 3, 2, 50, 'core', NULL),
(140, NULL, 1, 54, NULL, 3, 2, 50, 'core', NULL),
(141, NULL, 1, 55, NULL, 3, 2, 50, 'core', NULL),
(142, NULL, 1, NULL, 2, 3, 2, 50, 'core', NULL),
(143, NULL, 1, NULL, 3, 3, 2, 50, 'core', NULL),
(144, NULL, 1, 58, NULL, 3, 2, 50, 'minor', NULL),
(150, 1, 1, 77, NULL, 2, 1, 50, 'minor', NULL),
(151, 1, 1, 59, NULL, 4, 1, 50, 'core', 14),
(152, 1, 1, NULL, 4, 4, 1, 50, 'elective subject', NULL),
(153, 1, 1, 61, NULL, 4, 1, 50, 'core', 16),
(154, 1, 1, 62, NULL, 4, 1, 50, 'core', 17),
(155, 1, 1, 63, NULL, 4, 2, 50, 'core', NULL);

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
(31, '2026_03_21_000001_create_faculty_profile_table', 7),
(32, '2026_03_24_183400_sync_erd_missing_tables_and_evaluation_columns', 8),
(33, '2024_01_01_000013_remove_curriculum_requisite_columns', 9),
(34, '2026_03_26_000001_alter_tbl_student_profile_student_number_to_varchar', 9),
(35, '2026_03_26_000002_add_student_id_number_to_tbl_student_profile', 10),
(36, '2026_03_27_000001_remove_guest_demo_account_and_role', 11),
(37, '2026_03_28_000001_add_credit_eval_id_to_credit_evaluation_details', 12),
(38, '2026_03_28_000002_add_is_active_to_tbl_credit_evaluation', 13),
(39, '2026_03_28_120000_sync_rbac_with_faculty_portal_modules', 14),
(40, '2026_03_29_000001_create_tbl_security_settings', 15),
(41, '2026_03_29_000002_add_security_columns_to_tbl_users', 15),
(42, '2026_03_29_100000_create_tbl_academic_record_evaluation_complete', 16),
(43, '2026_03_29_140000_create_tbl_user_permissions', 17),
(44, '2026_03_29_210000_rename_faculty_to_evaluator_add_program_head_secretary', 18),
(45, '2026_04_01_120000_add_inc_compliance_deadline_and_app_settings', 19),
(46, '2026_04_02_000000_drop_tbl_app_setting_table', 20),
(47, '2026_04_01_000000_add_student_session_timeout_to_security_settings', 21),
(48, '2026_04_17_120000_add_semester_promotion_columns_to_student_profile', 22);

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
-- Table structure for table `tbl_academic_record_evaluation_complete`
--

CREATE TABLE `tbl_academic_record_evaluation_complete` (
  `academic_record_complete_id` bigint(20) UNSIGNED NOT NULL,
  `student_id` int(11) NOT NULL,
  `completed_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  `completed_by` bigint(20) UNSIGNED DEFAULT NULL,
  `notes` text DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

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
  `remarks` text DEFAULT NULL,
  `is_active` tinyint(1) NOT NULL DEFAULT 1
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Dumping data for table `tbl_credit_evaluation`
--

INSERT INTO `tbl_credit_evaluation` (`credit_eval_id`, `student_id`, `school_id`, `credit_type`, `evaluated_by`, `evaluation_date`, `status`, `remarks`, `is_active`) VALUES
(1, 1, 1, 'TOR', 1, '2026-03-21', 'approved', 'Sample credit evaluation', 1),
(2, 1, 1, 'Transfer Crediting', 1, '2026-03-27', 'approved', 'transferee', 1),
(3, 1, 2, 'Transfer', 1, '2026-03-27', 'approved', 'Seeded pending request — approve as Dean/Admin to test student curriculum credit.', 1),
(4, 1, 2, 'Transfer Crediting', 1, '2026-03-27', 'approved', NULL, 1),
(5, 4, 3, 'Transfer Crediting', 1, '2026-03-28', 'approved', NULL, 1),
(6, 5, 2, 'Crediting Subjects', 1, '2026-03-29', 'approved', NULL, 1);

-- --------------------------------------------------------

--
-- Table structure for table `tbl_credit_evaluation_details`
--

CREATE TABLE `tbl_credit_evaluation_details` (
  `credit_detail_id` int(11) NOT NULL,
  `credit_eval_id` int(11) DEFAULT NULL,
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

INSERT INTO `tbl_credit_evaluation_details` (`credit_detail_id`, `credit_eval_id`, `student_id`, `other_subject_id`, `subject_id`, `credited_units`, `credit_basis`, `remarks`) VALUES
(1, 1, 1, 1, 1, 3, 'TOR', 'Sample detail'),
(2, 2, 1, 1, 1, 3, 'TOR', NULL),
(3, 3, 1, 3, 16, 3, 'Equivalence table', 'Demo detail row'),
(4, 4, 1, 3, 16, 3, 'Curriculum match', NULL),
(5, 5, 4, 4, 2, 3, 'TOR', NULL),
(6, 5, 4, 5, 1, 3, 'TOR', NULL),
(7, 6, 5, 6, 7, 3, 'TOR', NULL),
(8, 6, 5, 7, 6, 1, 'TOR', NULL);

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
(1, 1, 'Information Technology', 'IT'),
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
(2, 1, 2, 3, 'IT Electives 2', 'active'),
(3, 1, 2, 3, 'IT Electives 3', 'active'),
(4, 1, 1, 4, 'IT Electives 4', 'active'),
(5, 1, 1, 3, 'IT Electives 1', 'active'),
(6, 1, 1, 2, 'IT Electives (2nd Year / 1st Sem)', 'active'),
(7, 1, 2, 2, 'IT Electives (2nd Year / 2nd Sem)', 'active');

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
(34, 2, 2, 65, NULL),
(35, 3, 2, 68, NULL),
(36, 1, 2, 71, NULL),
(37, 4, 2, 74, NULL),
(38, 2, 3, 66, NULL),
(39, 3, 3, 69, NULL),
(40, 1, 3, 72, NULL),
(41, 4, 3, 75, NULL),
(42, NULL, 4, 76, NULL),
(47, 2, 5, 64, NULL),
(48, 3, 5, 67, NULL),
(49, 1, 5, 70, NULL),
(50, 4, 5, 73, NULL);

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
  `section_id` bigint(20) UNSIGNED DEFAULT NULL,
  `grade` varchar(255) DEFAULT NULL,
  `evaluation_status` varchar(255) DEFAULT NULL,
  `evaluated_by` bigint(20) UNSIGNED DEFAULT NULL,
  `modality_id` bigint(20) UNSIGNED DEFAULT NULL,
  `evaluation_date` date DEFAULT NULL,
  `enrolled_date` date DEFAULT NULL,
  `inc_compliance_deadline` date DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Dumping data for table `tbl_evaluation`
--

INSERT INTO `tbl_evaluation` (`evaluation_id`, `student_id`, `subject_id`, `academic_year_id`, `semester_id`, `section_id`, `grade`, `evaluation_status`, `evaluated_by`, `modality_id`, `evaluation_date`, `enrolled_date`, `inc_compliance_deadline`) VALUES
(1, 1, 1, 1, 1, NULL, '85', 'passed', NULL, NULL, '2026-03-21', '2026-03-21', NULL),
(2, 1, 10, 1, 1, NULL, '50', 'passed', 22, NULL, NULL, NULL, NULL),
(3, 1, 9, 1, 1, NULL, '50', 'passed', 22, NULL, NULL, NULL, NULL),
(4, 2, 1, 1, 1, NULL, '49', 'failed', 22, NULL, NULL, NULL, NULL),
(5, 2, 10, 1, 1, NULL, '49', 'failed', 22, NULL, NULL, NULL, NULL),
(6, 2, 2, 1, 1, NULL, '49', 'failed', 22, NULL, NULL, NULL, NULL),
(7, 2, 9, 1, 1, NULL, '49', 'failed', 22, NULL, NULL, NULL, NULL),
(8, 2, 8, 1, 1, NULL, '50', 'passed', 22, NULL, NULL, NULL, NULL),
(9, 2, 7, 1, 1, NULL, '50', 'passed', 22, NULL, NULL, NULL, NULL),
(10, 2, 6, 1, 1, NULL, '50', 'passed', 22, NULL, NULL, NULL, NULL),
(11, 2, 5, 1, 1, NULL, '50', 'passed', 22, NULL, NULL, NULL, NULL),
(12, 3, 1, 1, 1, NULL, '0', 'incomplete', 22, NULL, NULL, NULL, '2026-04-30'),
(13, 3, 10, 1, 1, NULL, '75', 'passed', 22, NULL, NULL, NULL, NULL),
(14, 3, 9, 1, 1, NULL, '75', 'passed', 22, NULL, NULL, NULL, NULL),
(15, 3, 8, 1, 1, NULL, '75', 'passed', 22, NULL, NULL, NULL, NULL),
(16, 3, 7, 1, 1, NULL, '75', 'passed', 22, NULL, NULL, NULL, NULL),
(17, 3, 6, 1, 1, NULL, '75', 'passed', 22, NULL, NULL, NULL, NULL),
(18, 3, 5, 1, 1, NULL, '75', 'passed', 22, NULL, NULL, NULL, NULL),
(19, 3, 2, 1, 1, NULL, '75', 'passed', 22, NULL, NULL, NULL, NULL),
(20, 3, 18, 1, 2, NULL, NULL, NULL, 22, NULL, NULL, NULL, NULL),
(21, 3, 17, 1, 2, NULL, NULL, NULL, 22, NULL, NULL, NULL, NULL),
(22, 3, 16, 1, 2, NULL, NULL, NULL, 22, NULL, NULL, NULL, NULL),
(23, 3, 15, 1, 2, NULL, NULL, NULL, 22, NULL, NULL, NULL, NULL),
(24, 3, 14, 1, 2, NULL, NULL, NULL, 22, NULL, NULL, NULL, NULL),
(25, 3, 13, 1, 2, NULL, NULL, NULL, 22, NULL, NULL, NULL, NULL),
(26, 3, 4, 1, 2, NULL, NULL, NULL, 22, NULL, NULL, NULL, NULL),
(27, 3, 3, 1, 2, NULL, NULL, NULL, 22, NULL, NULL, NULL, NULL),
(28, 3, 77, 1, 1, NULL, NULL, NULL, 22, NULL, NULL, NULL, NULL),
(29, 3, 26, 1, 1, NULL, NULL, NULL, 22, NULL, NULL, NULL, NULL),
(30, 3, 25, 1, 1, NULL, NULL, NULL, 22, NULL, NULL, NULL, NULL),
(31, 3, 24, 1, 1, NULL, NULL, NULL, 22, NULL, NULL, NULL, NULL),
(32, 3, 23, 1, 1, NULL, NULL, NULL, 22, NULL, NULL, NULL, NULL),
(33, 3, 22, 1, 1, NULL, NULL, NULL, 22, NULL, NULL, NULL, NULL),
(34, 3, 21, 1, 1, NULL, NULL, NULL, 22, NULL, NULL, NULL, NULL),
(35, 3, 20, 1, 1, NULL, NULL, NULL, 22, NULL, NULL, NULL, NULL),
(36, 3, 19, 1, 1, NULL, NULL, NULL, 22, NULL, NULL, NULL, NULL),
(37, 3, 44, 1, 2, NULL, NULL, NULL, 22, NULL, NULL, NULL, NULL),
(38, 3, 43, 1, 2, NULL, NULL, NULL, 22, NULL, NULL, NULL, NULL),
(39, 3, 42, 1, 2, NULL, NULL, NULL, 22, NULL, NULL, NULL, NULL),
(40, 3, 41, 1, 2, NULL, NULL, NULL, 22, NULL, NULL, NULL, NULL),
(41, 3, 40, 1, 2, NULL, NULL, NULL, 22, NULL, NULL, NULL, NULL),
(42, 3, 39, 1, 2, NULL, NULL, NULL, 22, NULL, NULL, NULL, NULL),
(43, 3, 38, 1, 2, NULL, NULL, NULL, 22, NULL, NULL, NULL, NULL),
(44, 3, 37, 1, 2, NULL, NULL, NULL, 22, NULL, NULL, NULL, NULL),
(45, 3, 36, 1, 2, NULL, NULL, NULL, 22, NULL, NULL, NULL, NULL),
(46, 3, 47, 1, 1, NULL, NULL, NULL, 22, NULL, NULL, NULL, NULL),
(47, 3, 51, 1, 1, NULL, NULL, NULL, 22, NULL, NULL, NULL, NULL),
(48, 3, 64, 1, 1, NULL, NULL, NULL, 22, NULL, NULL, NULL, NULL),
(49, 3, 49, 1, 1, NULL, NULL, NULL, 22, NULL, NULL, NULL, NULL),
(50, 3, 48, 1, 1, NULL, NULL, NULL, 22, NULL, NULL, NULL, NULL),
(51, 3, 46, 1, 1, NULL, NULL, NULL, 22, NULL, NULL, NULL, NULL),
(52, 3, 45, 1, 1, NULL, NULL, NULL, 22, NULL, NULL, NULL, NULL),
(53, 3, 58, 1, 2, NULL, NULL, NULL, 22, NULL, NULL, NULL, NULL),
(54, 3, 66, 1, 2, NULL, NULL, NULL, 22, NULL, NULL, NULL, NULL),
(55, 3, 65, 1, 2, NULL, NULL, NULL, 22, NULL, NULL, NULL, NULL),
(56, 3, 55, 1, 2, NULL, NULL, NULL, 22, NULL, NULL, NULL, NULL),
(57, 3, 54, 1, 2, NULL, NULL, NULL, 22, NULL, NULL, NULL, NULL),
(58, 3, 52, 1, 2, NULL, NULL, NULL, 22, NULL, NULL, NULL, NULL),
(59, 3, 53, 1, 2, NULL, NULL, NULL, 22, NULL, NULL, NULL, NULL),
(60, 1, 8, 1, 1, NULL, '75', 'passed', 22, NULL, NULL, NULL, NULL),
(61, 1, 7, 1, 1, NULL, '75', 'passed', 22, NULL, NULL, NULL, NULL),
(62, 1, 6, 1, 1, NULL, '75', 'passed', 22, NULL, NULL, NULL, NULL),
(63, 1, 5, 1, 1, NULL, '75', 'passed', 22, NULL, NULL, NULL, NULL),
(64, 1, 2, 1, 1, NULL, '75', 'passed', 22, NULL, NULL, NULL, NULL),
(65, 1, 18, 1, 2, NULL, '75', 'passed', 22, NULL, NULL, NULL, NULL),
(66, 1, 17, 1, 2, NULL, '75', 'passed', 22, NULL, NULL, NULL, NULL),
(67, 1, 15, 1, 2, NULL, '75', 'passed', 22, NULL, NULL, NULL, NULL),
(68, 1, 14, 1, 2, NULL, '75', 'passed', 22, NULL, NULL, NULL, NULL),
(69, 1, 13, 1, 2, NULL, '75', 'passed', 22, NULL, NULL, NULL, NULL),
(70, 1, 4, 1, 2, NULL, '75', 'passed', 22, NULL, NULL, NULL, NULL),
(71, 1, 3, 1, 2, NULL, '75', 'passed', 22, NULL, NULL, NULL, NULL),
(72, 5, 1, 1, 1, NULL, '75', 'passed', 22, NULL, NULL, NULL, NULL),
(73, 5, 10, 1, 1, NULL, '75', 'passed', 22, NULL, NULL, NULL, NULL),
(74, 5, 9, 1, 1, NULL, '75', 'passed', 22, NULL, NULL, NULL, NULL),
(75, 5, 8, 1, 1, NULL, '75', 'passed', 22, NULL, NULL, NULL, NULL),
(76, 5, 7, 1, 1, NULL, '75', 'passed', 22, NULL, NULL, NULL, NULL),
(77, 5, 6, 1, 1, NULL, '75', 'passed', 22, NULL, NULL, NULL, NULL),
(78, 5, 5, 1, 1, NULL, '75', 'passed', 22, NULL, NULL, NULL, NULL),
(79, 5, 2, 1, 1, NULL, '49.2', 'failed', 22, NULL, NULL, NULL, NULL),
(80, 5, 18, 1, 2, NULL, NULL, NULL, 22, NULL, NULL, NULL, NULL),
(81, 5, 17, 1, 2, NULL, NULL, NULL, 22, NULL, NULL, NULL, NULL),
(82, 5, 16, 1, 2, NULL, NULL, NULL, 22, NULL, NULL, NULL, NULL),
(83, 5, 15, 1, 2, NULL, NULL, NULL, 22, NULL, NULL, NULL, NULL),
(84, 5, 14, 1, 2, NULL, NULL, NULL, 22, NULL, NULL, NULL, NULL),
(85, 5, 13, 1, 2, NULL, NULL, NULL, 22, NULL, NULL, NULL, NULL),
(86, 5, 4, 1, 2, NULL, NULL, NULL, 22, NULL, NULL, NULL, NULL),
(87, 5, 3, 1, 2, NULL, NULL, NULL, 22, NULL, NULL, NULL, NULL),
(88, 5, 77, 1, 1, NULL, NULL, NULL, 22, NULL, NULL, NULL, NULL),
(89, 5, 26, 1, 1, NULL, NULL, NULL, 22, NULL, NULL, NULL, NULL),
(90, 5, 25, 1, 1, NULL, NULL, NULL, 22, NULL, NULL, NULL, NULL),
(91, 5, 24, 1, 1, NULL, NULL, NULL, 22, NULL, NULL, NULL, NULL),
(92, 5, 23, 1, 1, NULL, NULL, NULL, 22, NULL, NULL, NULL, NULL),
(93, 5, 22, 1, 1, NULL, NULL, NULL, 22, NULL, NULL, NULL, NULL),
(94, 5, 21, 1, 1, NULL, NULL, NULL, 22, NULL, NULL, NULL, NULL),
(95, 5, 20, 1, 1, NULL, NULL, NULL, 22, NULL, NULL, NULL, NULL),
(96, 5, 19, 1, 1, NULL, NULL, NULL, 22, NULL, NULL, NULL, NULL),
(97, 5, 44, 1, 2, NULL, NULL, NULL, 22, NULL, NULL, NULL, NULL),
(98, 5, 43, 1, 2, NULL, NULL, NULL, 22, NULL, NULL, NULL, NULL),
(99, 5, 42, 1, 2, NULL, NULL, NULL, 22, NULL, NULL, NULL, NULL),
(100, 5, 41, 1, 2, NULL, NULL, NULL, 22, NULL, NULL, NULL, NULL),
(101, 5, 40, 1, 2, NULL, NULL, NULL, 22, NULL, NULL, NULL, NULL),
(102, 5, 39, 1, 2, NULL, NULL, NULL, 22, NULL, NULL, NULL, NULL),
(103, 5, 38, 1, 2, NULL, NULL, NULL, 22, NULL, NULL, NULL, NULL),
(104, 5, 37, 1, 2, NULL, NULL, NULL, 22, NULL, NULL, NULL, NULL),
(105, 5, 36, 1, 2, NULL, NULL, NULL, 22, NULL, NULL, NULL, NULL),
(106, 4, 10, 1, 1, NULL, '49', 'failed', 15, NULL, NULL, NULL, NULL),
(107, 4, 9, 1, 1, NULL, '75', 'passed', 15, NULL, NULL, NULL, NULL),
(108, 4, 8, 1, 1, NULL, '75', 'passed', 15, NULL, NULL, NULL, NULL),
(109, 4, 7, 1, 1, NULL, '75', 'passed', 15, NULL, NULL, NULL, NULL),
(110, 4, 6, 1, 1, NULL, '49', 'failed', 15, NULL, NULL, NULL, NULL),
(111, 4, 5, 1, 1, NULL, '75', 'passed', 15, NULL, NULL, NULL, NULL),
(112, 6, 26, 1, 1, NULL, '1.0', 'passed', 1, NULL, '2025-12-01', '2025-08-01', NULL),
(113, 6, 7, 1, 1, NULL, '1.25', 'passed', 1, NULL, '2025-12-15', '2025-08-15', NULL),
(114, 6, 2, 1, 1, NULL, '1.5', 'passed', 1, NULL, '2025-12-15', '2025-08-15', NULL),
(115, 6, 6, 1, 1, NULL, '1.0', 'passed', 1, NULL, '2025-12-15', '2025-08-15', NULL),
(116, 6, 20, 1, 2, NULL, '1.75', 'passed', 1, NULL, '2026-05-10', '2026-01-10', NULL),
(117, 6, 8, 1, 1, NULL, '92.9', 'passed', 22, NULL, NULL, NULL, NULL),
(118, 9, 8, 1, 1, NULL, NULL, NULL, 15, NULL, '2025-12-01', '2025-08-01', NULL),
(119, 9, 7, 1, 1, NULL, NULL, NULL, 15, NULL, '2025-12-15', '2025-08-15', NULL),
(120, 9, 6, 1, 1, NULL, NULL, NULL, 15, NULL, '2025-12-15', '2025-08-15', NULL),
(121, 9, 2, 1, 1, NULL, NULL, NULL, 15, NULL, '2025-12-15', '2025-08-15', NULL),
(122, 9, 1, 1, 1, NULL, NULL, NULL, 15, NULL, NULL, NULL, NULL),
(123, 9, 10, 1, 1, NULL, NULL, NULL, 15, NULL, NULL, NULL, NULL),
(124, 9, 9, 1, 1, NULL, NULL, NULL, 15, NULL, NULL, NULL, NULL),
(125, 9, 5, 1, 1, NULL, NULL, NULL, 15, NULL, NULL, NULL, NULL),
(126, 9, 18, 1, 2, NULL, NULL, NULL, 15, NULL, NULL, NULL, NULL),
(127, 9, 17, 1, 2, NULL, NULL, NULL, 15, NULL, NULL, NULL, NULL),
(128, 9, 16, 1, 2, NULL, NULL, NULL, 15, NULL, NULL, NULL, NULL),
(129, 9, 15, 1, 2, NULL, NULL, NULL, 15, NULL, NULL, NULL, NULL),
(130, 9, 14, 1, 2, NULL, NULL, NULL, 15, NULL, NULL, NULL, NULL),
(131, 9, 13, 1, 2, NULL, NULL, NULL, 15, NULL, NULL, NULL, NULL),
(132, 9, 4, 1, 2, NULL, NULL, NULL, 15, NULL, NULL, NULL, NULL),
(133, 9, 3, 1, 2, NULL, NULL, NULL, 15, NULL, NULL, NULL, NULL),
(134, 10, 7, 1, 1, NULL, '92', 'passed', 1, NULL, '2025-12-01', '2025-08-01', NULL),
(135, 10, 8, 1, 1, NULL, '91', 'passed', 1, NULL, '2025-12-01', '2025-08-01', NULL),
(136, 10, 6, 1, 1, NULL, '93', 'passed', 1, NULL, '2025-12-15', '2025-08-15', NULL),
(137, 10, 2, 1, 1, NULL, '88', 'passed', 1, NULL, '2025-12-15', '2025-08-15', NULL),
(138, 10, 26, 1, 1, NULL, '1.0', 'passed', 1, NULL, '2025-12-01', '2025-08-01', NULL),
(139, 10, 20, 1, 2, NULL, '1.75', 'passed', 1, NULL, '2026-05-10', '2026-01-10', NULL),
(140, 11, 7, 1, 1, NULL, '92', 'passed', 1, NULL, '2023-12-15', '2023-08-15', NULL),
(141, 11, 5, 1, 1, NULL, '91', 'passed', 1, NULL, '2023-12-15', '2023-08-15', NULL),
(142, 11, 6, 1, 1, NULL, '93', 'passed', 1, NULL, '2023-12-15', '2023-08-15', NULL),
(143, 11, 1, 1, 1, NULL, '1.25', 'passed', 1, NULL, '2023-12-15', '2023-08-15', NULL),
(144, 11, 9, 1, 1, NULL, '89', 'passed', 1, NULL, '2023-12-15', '2023-08-15', NULL),
(145, 11, 10, 1, 1, NULL, '88', 'passed', 1, NULL, '2023-12-15', '2023-08-15', NULL),
(146, 11, 26, 1, 1, NULL, '1.0', 'passed', 1, NULL, '2023-12-15', '2023-08-15', NULL),
(147, 11, 2, 1, 2, NULL, '1.5', 'passed', 1, NULL, '2024-05-10', '2024-01-10', NULL),
(148, 11, 3, 1, 2, NULL, '1.75', 'passed', 1, NULL, '2024-05-10', '2024-01-10', NULL),
(149, 11, 8, 1, 2, NULL, '90', 'passed', 1, NULL, '2024-05-10', '2024-01-10', NULL),
(150, 11, 14, 1, 2, NULL, '87', 'passed', 1, NULL, '2024-05-10', '2024-01-10', NULL),
(151, 11, 13, 1, 2, NULL, '68', 'failed', 1, NULL, '2024-05-10', '2024-01-10', NULL),
(152, 11, 15, 1, 2, NULL, '91', 'passed', 1, NULL, '2024-05-10', '2024-01-10', NULL),
(153, 11, 16, 1, 1, NULL, '65', 'failed', 1, NULL, '2024-12-15', '2024-08-15', NULL),
(154, 11, 17, 1, 1, NULL, '88', 'passed', 1, NULL, '2024-12-15', '2024-08-15', NULL),
(155, 11, 18, 1, 1, NULL, '71', 'failed', 1, NULL, '2024-12-15', '2024-08-15', NULL),
(156, 11, 19, 1, 1, NULL, '1.5', 'passed', 1, NULL, '2024-12-15', '2024-08-15', NULL),
(157, 11, 20, 1, 1, NULL, '1.75', 'passed', 1, NULL, '2024-12-15', '2024-08-15', NULL),
(158, 11, 21, 1, 2, NULL, '74', 'failed', 1, NULL, '2025-05-10', '2025-01-10', NULL),
(159, 11, 22, 1, 2, NULL, '1.5', 'passed', 1, NULL, '2025-05-10', '2025-01-10', NULL),
(160, 11, 23, 1, 2, NULL, '1.75', 'passed', 1, NULL, '2025-05-10', '2025-01-10', NULL),
(161, 11, 24, 1, 2, NULL, '86', 'passed', 1, NULL, '2025-05-10', '2025-01-10', NULL),
(162, 11, 25, 1, 2, NULL, '90', 'passed', 1, NULL, '2025-05-10', '2025-01-10', NULL),
(163, 11, 4, 1, 2, NULL, '3.5', 'failed', 1, NULL, '2025-05-10', '2025-01-10', NULL),
(164, 4, 17, 1, 2, NULL, '75', 'passed', 15, NULL, NULL, NULL, NULL),
(165, 4, 16, 1, 2, NULL, '75', 'passed', 15, NULL, NULL, NULL, NULL),
(166, 4, 15, 1, 2, NULL, '75', 'passed', 15, NULL, NULL, NULL, NULL),
(167, 4, 14, 1, 2, NULL, '75', 'passed', 15, NULL, NULL, NULL, NULL),
(168, 4, 3, 1, 2, NULL, '75', 'passed', 15, NULL, NULL, NULL, NULL),
(169, 4, 4, 1, 2, NULL, '75', 'passed', 15, NULL, NULL, NULL, NULL),
(170, 4, 26, 1, 1, NULL, '49', 'failed', 15, NULL, NULL, NULL, NULL),
(171, 4, 25, 1, 1, NULL, '49', 'failed', 15, NULL, NULL, NULL, NULL),
(172, 4, 77, 1, 1, NULL, '75', 'passed', 15, NULL, NULL, NULL, NULL),
(173, 4, 24, 1, 1, NULL, '75', 'passed', 15, NULL, NULL, NULL, NULL),
(174, 4, 23, 1, 1, NULL, '75', 'passed', 15, NULL, NULL, NULL, NULL),
(175, 4, 22, 1, 1, NULL, '75', 'passed', 15, NULL, NULL, NULL, NULL),
(176, 4, 21, 1, 1, NULL, '75', 'passed', 15, NULL, NULL, NULL, NULL),
(177, 4, 20, 1, 1, NULL, '75', 'passed', 15, NULL, NULL, NULL, NULL),
(178, 4, 19, 1, 1, NULL, '75', 'passed', 15, NULL, NULL, NULL, NULL),
(179, 4, 42, 1, 2, NULL, '75', 'passed', 15, NULL, NULL, NULL, NULL),
(180, 4, 41, 1, 2, NULL, '75', 'passed', 15, NULL, NULL, NULL, NULL),
(181, 4, 40, 1, 2, NULL, '75', 'passed', 15, NULL, NULL, NULL, NULL),
(182, 4, 39, 1, 2, NULL, '75', 'passed', 15, NULL, NULL, NULL, NULL),
(183, 4, 38, 1, 2, NULL, '75', 'passed', 15, NULL, NULL, NULL, NULL),
(184, 4, 37, 1, 2, NULL, '75', 'passed', 15, NULL, NULL, NULL, NULL),
(185, 4, 36, 1, 2, NULL, '75', 'passed', 15, NULL, NULL, NULL, NULL);

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
(1, 16, 'Sample', 'B', 'Faculty', 'EMP-1001', 1, 'Advising', NULL, NULL),
(2, 21, 'Alex', NULL, 'Adviser', 'EMP-ADV-001', 1, 'Information Technology', NULL, NULL),
(3, 22, 'Jamie', NULL, 'Faculty', 'EMP-FAC-001', 1, 'Information Technology', NULL, NULL);

-- --------------------------------------------------------

--
-- Table structure for table `tbl_grade_components`
--

CREATE TABLE `tbl_grade_components` (
  `grade_component_id` bigint(20) UNSIGNED NOT NULL,
  `evaluation_id` bigint(20) UNSIGNED NOT NULL,
  `component_name` varchar(100) NOT NULL,
  `grade` varchar(20) DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------

--
-- Table structure for table `tbl_modality`
--

CREATE TABLE `tbl_modality` (
  `modality_id` bigint(20) UNSIGNED NOT NULL,
  `modality_name` varchar(100) NOT NULL
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
(1, 1, 'SAMP101', 'Sample External Subject', 3, 54, 'Sample transfer subject'),
(2, 1, 'ITE 387', 'test', 3, 3, NULL),
(3, 2, 'OSTU-GEN005', 'The Contemporary World (taken at previous school)', 3, 3, 'Demo external course for credit evaluation testing'),
(4, 3, 'ITE 399', 'test', 3, 3, 'test'),
(5, 3, 'ITE 323', 'test1', 3, 3, NULL),
(6, 2, 'ENG 11', 'TEST', 3, 3, 'test'),
(7, 2, 'MAT 102', 'TEST3', 3, 3, 'test2');

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
(4, 'Admin Dashboard', 'Dashboard', 'Display admin statistics and overview'),
(5, 'User Management', 'User Management', 'Create, update, or deactivate system users'),
(6, 'Role Settings', 'User Management', 'Manage roles and assign permissions to roles'),
(7, 'Lookup Data', 'User Management', 'Manage programs, subjects, campus, and other lookup data'),
(8, 'Curriculum Management', 'Curriculum', 'View and manage curriculum and subjects'),
(9, 'Credit Evaluation', 'Evaluation', 'Transfer / advanced standing credit (Dean portal and Academic Management)'),
(10, 'Student Evaluation', 'Evaluation', 'Student curriculum evaluation and grades (Faculty and Dean portals)'),
(11, 'Evaluation Reports', 'Evaluation', 'View evaluation reports and analytics'),
(12, 'Elective Slots', 'Curriculum', 'Manage elective slots and assignments'),
(13, 'System Management', 'System', 'Manage permissions and system settings'),
(14, 'Audit Logs', 'System', 'View audit logs'),
(15, 'test', NULL, 'test'),
(16, 'users.view', 'User Management', 'View user list and details'),
(17, 'users.create', 'User Management', 'Create new users'),
(18, 'users.edit', 'User Management', 'Edit user information'),
(19, 'users.delete', 'User Management', 'Delete users'),
(20, 'users.manage_roles', 'User Management', 'Assign roles to users'),
(21, 'roles.view', 'Role Management', 'View roles and permissions'),
(22, 'roles.create', 'Role Management', 'Create new roles'),
(23, 'roles.edit', 'Role Management', 'Edit roles and permissions'),
(24, 'roles.delete', 'Role Management', 'Delete roles'),
(25, 'curriculum.view', 'Curriculum Management', 'View curriculum'),
(26, 'curriculum.create', 'Curriculum Management', 'Create curriculum entries'),
(27, 'curriculum.edit', 'Curriculum Management', 'Edit curriculum'),
(28, 'curriculum.delete', 'Curriculum Management', 'Delete curriculum entries'),
(29, 'curriculum.approve', 'Curriculum Management', 'Approve curriculum changes'),
(30, 'subjects.view', 'Subjects', 'View subjects'),
(31, 'subjects.create', 'Subjects', 'Create subjects'),
(32, 'subjects.edit', 'Subjects', 'Edit subjects'),
(33, 'subjects.delete', 'Subjects', 'Delete subjects'),
(34, 'prerequisites.view', 'Prerequisites', 'View prerequisites'),
(35, 'prerequisites.manage', 'Prerequisites', 'Manage prerequisites and corequisites'),
(36, 'students.view', 'Students', 'View student profiles'),
(37, 'students.create', 'Students', 'Create student profiles'),
(38, 'students.edit', 'Students', 'Edit student profiles'),
(39, 'students.enroll', 'Students', 'Manage student enrollments'),
(40, 'evaluation.view', 'Student Evaluation', 'View student evaluations'),
(41, 'evaluation.create', 'Student Evaluation', 'Create student evaluations'),
(42, 'evaluation.edit', 'Student Evaluation', 'Edit student evaluations'),
(43, 'evaluation.approve', 'Student Evaluation', 'Approve student evaluations'),
(44, 'credit_eval.view', 'Credit Evaluation', 'View transfer credit evaluations'),
(45, 'credit_eval.create', 'Credit Evaluation', 'Create transfer credit evaluations'),
(46, 'credit_eval.approve', 'Credit Evaluation', 'Approve transfer credit evaluations'),
(47, 'electives.view', 'Electives', 'View elective slots'),
(48, 'electives.manage', 'Electives', 'Manage elective slots and assignments'),
(49, 'faculty.view', 'Faculty Portal', 'My Profile (faculty / adviser portal)'),
(50, 'faculty.manage', 'Faculty Portal', 'Manage faculty assignments (admin)'),
(52, 'dean.view', 'Academic Evaluation', 'View dean portal and academic evaluation tools'),
(53, 'dean.approve', 'Academic Evaluation', 'High-impact academic approvals (e.g. delete evaluations, remove stored records)'),
(54, 'lookup.view', 'Lookup Data', 'View lookup data'),
(55, 'lookup.manage', 'Lookup Data', 'Manage all lookup data areas (legacy / bulk)'),
(56, 'reports.view', 'Reports', 'View reports'),
(57, 'reports.generate', 'Reports', 'Generate reports'),
(58, 'audit.view', 'Audit', 'View audit logs'),
(59, 'system.settings', 'System', 'Manage system settings'),
(60, 'system.backup', 'System', 'Perform system backups'),
(61, 'lookup.programs.view', 'Lookup Data', 'View Programs (lookup data)'),
(62, 'lookup.programs.manage', 'Lookup Data', 'Manage Programs (lookup data)'),
(63, 'lookup.departments.view', 'Lookup Data', 'View Departments (lookup data)'),
(64, 'lookup.departments.manage', 'Lookup Data', 'Manage Departments (lookup data)'),
(65, 'lookup.subjects.view', 'Lookup Data', 'View Subjects (lookup data)'),
(66, 'lookup.subjects.manage', 'Lookup Data', 'Manage Subjects (lookup data)'),
(67, 'lookup.year_levels.view', 'Lookup Data', 'View Year levels (lookup data)'),
(68, 'lookup.year_levels.manage', 'Lookup Data', 'Manage Year levels (lookup data)'),
(69, 'lookup.semesters.view', 'Lookup Data', 'View Semesters (lookup data)'),
(70, 'lookup.semesters.manage', 'Lookup Data', 'Manage Semesters (lookup data)'),
(71, 'lookup.campus.view', 'Lookup Data', 'View Campus (lookup data)'),
(72, 'lookup.campus.manage', 'Lookup Data', 'Manage Campus (lookup data)'),
(73, 'lookup.roles.view', 'Lookup Data', 'View Roles (lookup table) (lookup data)'),
(74, 'lookup.roles.manage', 'Lookup Data', 'Manage Roles (lookup table) (lookup data)'),
(75, 'lookup.sections.view', 'Lookup Data', 'View Sections (lookup data)'),
(76, 'lookup.sections.manage', 'Lookup Data', 'Manage Sections (lookup data)'),
(77, 'lookup.academic_years.view', 'Lookup Data', 'View Academic years (lookup data)'),
(78, 'lookup.academic_years.manage', 'Lookup Data', 'Manage Academic years (lookup data)'),
(79, 'lookup.tracks.view', 'Lookup Data', 'View Tracks (lookup data)'),
(80, 'lookup.tracks.manage', 'Lookup Data', 'Manage Tracks (lookup data)'),
(81, 'lookup.requisites.view', 'Lookup Data', 'View Prerequisites & requisites (lookup data)'),
(82, 'lookup.requisites.manage', 'Lookup Data', 'Manage Prerequisites & requisites (lookup data)'),
(83, 'lookup.curriculum_headers.view', 'Lookup Data', 'View Curriculum headers (lookup data)'),
(84, 'lookup.curriculum_headers.manage', 'Lookup Data', 'Manage Curriculum headers (lookup data)'),
(85, 'lookup.offered_subjects.view', 'Lookup Data', 'View Offered subjects (lookup data)'),
(86, 'lookup.offered_subjects.manage', 'Lookup Data', 'Manage Offered subjects (lookup data)'),
(87, 'lookup.elective_subjects.view', 'Lookup Data', 'View Elective subjects (lookup data)'),
(88, 'lookup.elective_subjects.manage', 'Lookup Data', 'Manage Elective subjects (lookup data)');

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
(2, 36, 'Prerequisite', 30),
(3, 43, 'Prerequisite', 34),
(4, 44, 'Prerequisite', 35),
(5, 45, 'Prerequisite', 29),
(6, 49, 'Prerequisite', 27),
(7, 52, 'Prerequisite', 37),
(8, 53, 'Prerequisite', 45),
(9, 54, 'Prerequisite', 46),
(10, 55, 'Prerequisite', 36),
(13, 58, 'Prerequisite', 51),
(14, 59, 'Prerequisite', 52),
(16, 61, 'Prerequisite', 52),
(17, 62, 'Prerequisite', 46),
(18, 3, 'prerequisite', 2),
(19, 4, 'prerequisite', 1),
(20, 13, 'prerequisite', 6),
(21, 17, 'prerequisite', 9),
(22, 18, 'prerequisite', 10),
(23, 51, 'prerequisite', 44),
(25, 19, 'corequisite', 30),
(26, 20, 'prerequisite', 3),
(27, 22, 'prerequisite', 3),
(28, 23, 'prerequisite', 1),
(29, 25, 'prerequisite', 17),
(30, 20, 'prerequisite', 2);

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
(2, 'Evaluator', 8, 'Evaluator — student curriculum evaluation'),
(3, 'Student', 5, 'Estuden'),
(4, 'Dean', 9, NULL),
(6, 'Adviser', 3, 'Adviser — credit review & student guidance'),
(7, 'Program Head', 7, 'Program head — curriculum and academic oversight'),
(8, 'Secretary', 4, 'Secretary — records, lookup, and student data entry');

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
(705, 1, 4),
(783, 1, 5),
(765, 1, 6),
(730, 1, 7),
(712, 1, 8),
(708, 1, 9),
(770, 1, 10),
(723, 1, 11),
(720, 1, 12),
(779, 1, 13),
(706, 1, 14),
(782, 1, 15),
(788, 1, 16),
(784, 1, 17),
(786, 1, 18),
(785, 1, 19),
(787, 1, 20),
(769, 1, 21),
(766, 1, 22),
(768, 1, 23),
(767, 1, 24),
(717, 1, 25),
(714, 1, 26),
(716, 1, 27),
(715, 1, 28),
(713, 1, 29),
(778, 1, 30),
(775, 1, 31),
(777, 1, 32),
(776, 1, 33),
(762, 1, 34),
(761, 1, 35),
(774, 1, 36),
(771, 1, 37),
(772, 1, 38),
(773, 1, 39),
(727, 1, 40),
(725, 1, 41),
(726, 1, 42),
(724, 1, 43),
(711, 1, 44),
(710, 1, 45),
(709, 1, 46),
(722, 1, 47),
(721, 1, 48),
(729, 1, 49),
(728, 1, 50),
(719, 1, 52),
(718, 1, 53),
(758, 1, 54),
(741, 1, 55),
(764, 1, 56),
(763, 1, 57),
(707, 1, 58),
(781, 1, 59),
(780, 1, 60),
(745, 1, 61),
(744, 1, 62),
(738, 1, 63),
(737, 1, 64),
(755, 1, 65),
(754, 1, 66),
(760, 1, 67),
(759, 1, 68),
(753, 1, 69),
(752, 1, 70),
(734, 1, 71),
(733, 1, 72),
(749, 1, 73),
(748, 1, 74),
(751, 1, 75),
(750, 1, 76),
(732, 1, 77),
(731, 1, 78),
(757, 1, 79),
(756, 1, 80),
(747, 1, 81),
(746, 1, 82),
(736, 1, 83),
(735, 1, 84),
(743, 1, 85),
(742, 1, 86),
(740, 1, 87),
(739, 1, 88),
(807, 2, 40),
(805, 2, 41),
(806, 2, 42),
(808, 2, 49),
(814, 3, 25),
(816, 3, 30),
(815, 3, 36),
(804, 4, 16),
(792, 4, 25),
(791, 4, 29),
(803, 4, 30),
(799, 4, 34),
(802, 4, 36),
(797, 4, 40),
(796, 4, 43),
(790, 4, 44),
(789, 4, 46),
(795, 4, 47),
(798, 4, 49),
(794, 4, 52),
(793, 4, 53),
(801, 4, 56),
(800, 4, 57),
(813, 6, 38),
(811, 6, 40),
(809, 6, 41),
(810, 6, 42),
(812, 6, 49),
(820, 7, 25),
(818, 7, 26),
(819, 7, 27),
(817, 7, 29),
(850, 7, 30),
(848, 7, 31),
(849, 7, 32),
(843, 7, 34),
(842, 7, 35),
(847, 7, 36),
(846, 7, 38),
(826, 7, 40),
(824, 7, 41),
(825, 7, 42),
(823, 7, 43),
(822, 7, 47),
(821, 7, 48),
(827, 7, 49),
(845, 7, 56),
(844, 7, 57),
(834, 7, 61),
(831, 7, 63),
(839, 7, 65),
(841, 7, 67),
(838, 7, 69),
(829, 7, 71),
(836, 7, 73),
(837, 7, 75),
(828, 7, 77),
(840, 7, 79),
(835, 7, 81),
(830, 7, 83),
(833, 7, 85),
(832, 7, 87),
(887, 8, 16),
(885, 8, 17),
(886, 8, 18),
(853, 8, 25),
(884, 8, 36),
(882, 8, 37),
(883, 8, 38),
(852, 8, 44),
(851, 8, 45),
(867, 8, 61),
(866, 8, 62),
(861, 8, 63),
(860, 8, 64),
(877, 8, 65),
(876, 8, 66),
(881, 8, 67),
(880, 8, 68),
(875, 8, 69),
(874, 8, 70),
(857, 8, 71),
(856, 8, 72),
(871, 8, 73),
(870, 8, 74),
(873, 8, 75),
(872, 8, 76),
(855, 8, 77),
(854, 8, 78),
(879, 8, 79),
(878, 8, 80),
(869, 8, 81),
(868, 8, 82),
(859, 8, 83),
(858, 8, 84),
(865, 8, 85),
(864, 8, 86),
(863, 8, 87),
(862, 8, 88);

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
(1, 'Sample University', 'BSIT', '2024 Curriculum'),
(2, 'Demo State University (Transfer Test)', 'BS Information Technology (aligned for demo)', 'CHED-aligned general education (demo)'),
(3, 'pangantucan', 'Information technology', '2324');

-- --------------------------------------------------------

--
-- Table structure for table `tbl_section`
--

CREATE TABLE `tbl_section` (
  `section_id` bigint(20) UNSIGNED NOT NULL,
  `section_name` varchar(100) NOT NULL,
  `program_id` bigint(20) UNSIGNED DEFAULT NULL,
  `year_level_id` bigint(20) UNSIGNED DEFAULT NULL,
  `semester_id` bigint(20) UNSIGNED DEFAULT NULL,
  `academic_year_id` bigint(20) UNSIGNED DEFAULT NULL,
  `faculty_id` bigint(20) UNSIGNED DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------

--
-- Table structure for table `tbl_security_settings`
--

CREATE TABLE `tbl_security_settings` (
  `security_settings_id` bigint(20) UNSIGNED NOT NULL,
  `max_password_length` smallint(5) UNSIGNED NOT NULL DEFAULT 64,
  `password_expiry_days` smallint(5) UNSIGNED NOT NULL DEFAULT 90,
  `session_timeout_minutes` smallint(5) UNSIGNED NOT NULL DEFAULT 30,
  `student_session_timeout_minutes` smallint(5) UNSIGNED NOT NULL DEFAULT 30,
  `lockout_attempts` tinyint(3) UNSIGNED NOT NULL DEFAULT 5,
  `lockout_duration_minutes` smallint(5) UNSIGNED NOT NULL DEFAULT 15,
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Dumping data for table `tbl_security_settings`
--

INSERT INTO `tbl_security_settings` (`security_settings_id`, `max_password_length`, `password_expiry_days`, `session_timeout_minutes`, `student_session_timeout_minutes`, `lockout_attempts`, `lockout_duration_minutes`, `created_at`, `updated_at`) VALUES
(1, 64, 90, 30, 30, 5, 15, '2026-03-27 09:52:17', '2026-03-27 09:52:17');

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
(2, '2nd Semester', 'inactive'),
(3, 'Summer', 'inactive');

-- --------------------------------------------------------

--
-- Table structure for table `tbl_student_profile`
--

CREATE TABLE `tbl_student_profile` (
  `student_id` int(11) NOT NULL,
  `user_id` int(11) NOT NULL,
  `student_number` varchar(50) NOT NULL,
  `student_id_number` varchar(50) DEFAULT NULL,
  `first_name` varchar(100) DEFAULT NULL,
  `middle_name` varchar(100) DEFAULT NULL,
  `last_name` varchar(100) DEFAULT NULL,
  `address` varchar(255) DEFAULT NULL,
  `contact_number` varchar(20) DEFAULT NULL,
  `academic_status` varchar(50) DEFAULT NULL,
  `year_level_id` int(11) DEFAULT NULL,
  `track_id` int(11) DEFAULT NULL,
  `promoted_next_sem_at` timestamp NULL DEFAULT NULL,
  `promoted_next_sem_by` int(10) UNSIGNED DEFAULT NULL,
  `promotion_evaluated_by` varchar(150) DEFAULT NULL,
  `promotion_target_year_level_id` int(10) UNSIGNED DEFAULT NULL,
  `promotion_target_semester_id` int(10) UNSIGNED DEFAULT NULL,
  `current_program` int(11) DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Dumping data for table `tbl_student_profile`
--

INSERT INTO `tbl_student_profile` (`student_id`, `user_id`, `student_number`, `student_id_number`, `first_name`, `middle_name`, `last_name`, `address`, `contact_number`, `academic_status`, `year_level_id`, `track_id`, `promoted_next_sem_at`, `promoted_next_sem_by`, `promotion_evaluated_by`, `promotion_target_year_level_id`, `promotion_target_semester_id`, `current_program`) VALUES
(1, 2, '900001', NULL, 'Sample', 'A', 'Student', 'Sample Address', '09171111111', 'Regular', 2, 1, '2026-04-16 19:59:08', 22, 'faculty@example.com', 2, 2, 1),
(2, 30, '02232409312', '02232409312', 'cyrus', 'viterbo', 'tadoy', 'zone 12-b upper carmen', '09987654321', 'Regular', 3, 2, NULL, NULL, NULL, NULL, NULL, 1),
(3, 31, '02323220333', '02-3232-20333', 'sean', 'test', 'sallave', 'nazareth', '09665432174', 'Irregular', 1, NULL, '2026-04-16 19:56:45', 22, 'faculty@example.com', 1, 2, 1),
(4, 32, '02232407413', '02-2324-07413', 'john philip', 'razo', 'baloro', 'pangantucan', '09987654321', 'Irregular', 1, NULL, '2026-04-16 21:40:56', 15, 'dean@example.com', 3, 1, 1),
(5, 33, '02232404413', '02-2324-04413', 'jboy', 'test', 'ers', 'home', '09987654321', 'Regular', 1, NULL, NULL, NULL, NULL, NULL, NULL, 1),
(6, 8, '202309831', '2023-09831', 'Jordan', NULL, 'Rivera', 'Manila, Philippines', '09171234567', 'Regular', 1, NULL, NULL, NULL, NULL, NULL, NULL, 1),
(7, 35, '2026001', '2026-CSV-NEW-001', 'Jordan', NULL, 'Rivera', 'Manila, Philippines', '09171234567', 'Regular', 1, NULL, NULL, NULL, NULL, NULL, NULL, 1),
(8, 36, '2026-DEMO-NEW', '2026-DEMO-NEW', 'Demo', NULL, 'Student', NULL, NULL, 'active', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL),
(9, 37, '2026002', '2026-IT-IMPORT-002', 'Morgan', NULL, 'Riley', 'Cagayan de Oro, Philippines', '09189990002', 'Regular', 1, NULL, NULL, NULL, NULL, NULL, NULL, 1),
(10, 38, '2026-IT-3RD-IRREG-001', '2026-IT-3RD-IRREG-001', 'Avery', NULL, 'Chen', 'Cagayan de Oro, Philippines', '09189990003', 'Irregular', 1, NULL, NULL, NULL, NULL, NULL, NULL, 1),
(11, 39, '2026-IT-IRREG-FAIL-FULL', '2026-IT-IRREG-FAIL-FULL', 'Brianna', NULL, 'Torres', 'Cagayan de Oro, Philippines', '09189990077', 'Irregular', 1, NULL, NULL, NULL, NULL, NULL, NULL, 1);

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
(76, 'ITE388', 'Clean-up and In-between for IT', 3, 4),
(77, 'HIS 007', 'Life and Works of Rizal', 3, 3);

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
(1, 1, 1, 3, 'TOR', 'active', 'Sample equivalence'),
(2, 2, 22, 3, 'TOR', 'active', NULL),
(3, 1, 70, 3, 'TOR', 'active', NULL),
(4, 3, 16, 3, 'Curriculum match', 'active', 'Seeded for capstone credit evaluation demo'),
(5, 4, 2, 3, 'TOR', 'active', NULL),
(6, 5, 1, 3, 'TOR', 'active', NULL),
(7, 6, 7, 3, 'TOR', 'active', NULL),
(8, 7, 6, 1, 'TOR', 'active', NULL);

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
  `status` varchar(50) DEFAULT NULL,
  `failed_login_attempts` tinyint(3) UNSIGNED NOT NULL DEFAULT 0,
  `locked_until` timestamp NULL DEFAULT NULL,
  `password_changed_at` timestamp NULL DEFAULT NULL,
  `use_custom_permissions` tinyint(1) NOT NULL DEFAULT 0
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Dumping data for table `tbl_users`
--

INSERT INTO `tbl_users` (`user_id`, `email`, `password`, `contact_number`, `role_id`, `status`, `failed_login_attempts`, `locked_until`, `password_changed_at`, `use_custom_permissions`) VALUES
(1, 'admin@example.com', '$2y$12$UiWggmUHq8.NoKA4YPowoOUTm2Zg3yG6.aV3FzNcNaUCKJU3lRFAK', NULL, 1, 'active', 0, NULL, '2026-03-27 09:52:17', 0),
(2, 'student@example.com', '$2y$12$b1U.OcKusIbSEx8/wqS8b.yU0twkTGdExnXEKNke5Xud50obGOjw2', NULL, 3, 'active', 0, NULL, '2026-03-27 09:52:17', 0),
(8, 'student2@example.com', '$2y$12$8uzkn1jNh5aGkjj8Ht2Tzet2Z6PdvdDTcDLk6fsh5SwmZ6w8VLDQa', '09171234567', 3, 'active', 0, NULL, '2026-03-27 09:52:17', 0),
(15, 'dean@example.com', '$2y$12$N6LOLQ0RTPwIwBDmOsBOQe2Bl7BWi4MKWNR8NUEbYEbyGO7tuKGnG', NULL, 4, 'active', 0, NULL, '2026-03-27 09:52:17', 1),
(16, 'sample.faculty@example.com', '$2y$10$ACuK7JqWcolezYhdicIvwuVBwGMwlV30BKXLX8YTnhG0Awdh1V8IC', '09170000000', 2, 'active', 0, NULL, '2026-03-27 09:52:17', 0),
(17, 'cherry@gmail.com', '$2y$12$rWMmW8CtRNFpqoxzxUILlOVuZSD4r0kPF6ZOdpBdASxm5snD8rQDS', '123456787654', 3, 'active', 0, NULL, '2026-03-27 09:52:17', 0),
(21, 'adviser@example.com', '$2y$12$fz3DfRH16I0YYAp93cKSfOzSycSVP.IvnJEWWEIi8oAYVJLxMtmTm', NULL, 6, 'active', 0, NULL, '2026-03-27 09:52:17', 0),
(22, 'faculty@example.com', '$2y$12$J1Ra086IVFipgJgNL6Xo.uXNyCeps1.zlIaH0Cwz3R1quxB3nZG8e', NULL, 2, 'active', 0, NULL, '2026-03-27 09:52:17', 0),
(30, 'cyrus@example.com', '$2y$12$xLpgRmQVqaaCzaeZG2.3u.yPSBwKfGXPbFQ4zobQ2OGtEFTnqoE9i', '09987654321', 3, 'active', 0, NULL, '2026-03-27 09:52:17', 0),
(31, 'sean@example.com', '$2y$12$FxvRU/sbO8FSRpfIHOdH4.G/AMa27cphtFVluwUoYlHTK5iJgzREy', '09665432174', 3, 'active', 0, NULL, '2026-03-27 09:52:17', 0),
(32, 'baloro@example.com', '$2y$12$dPxOhQa.rfe7r9vsJHckM.F48Bijxtc562BzjGSwrosBd4NNm/c4y', '09987654321', 3, 'active', 0, NULL, '2026-03-27 18:11:09', 0),
(33, 'jb@example.com', '$2y$12$4DRCId7uz5VXswrKn1f1seLQCiT.12K1HiZpBwFmO2Ln/S76DY.X6', '09987654321', 3, 'active', 0, NULL, '2026-03-28 00:26:25', 0),
(34, 'evaluator@example.com', '$2y$12$r3QBELje.SM4EpaogtZ4IuLK3ECNf1Zbux0o6p/Y9He2qEQYVhUm2', '09987654321', 2, 'active', 0, NULL, '2026-03-28 19:41:35', 1),
(35, 'jordan.csvimport@example.com', '$2y$12$5AILMMWQJNp8V3txRlJT/enyIWeQSJgoaJ2qiiCtvXmVW7fzc.GOO', '09171234567', 3, 'active', 0, NULL, '2026-03-31 11:48:13', 0),
(36, 'demo.new@example.com', '$2y$12$6tOH8s0Rts6BPCS8dSvu1uU.YUdrSEGOHxIQmqx3Pfu/Da4y8z43u', NULL, 3, 'active', 0, NULL, '2026-03-31 11:47:34', 0),
(37, 'it.import.morgan@example.com', '$2y$12$fE/Ls8scYW0BeaGKIE80IusX.ZvoPkGekD103zjwEYw36Hw37reK2', '09189990002', 3, 'active', 0, NULL, '2026-03-31 12:55:56', 0),
(38, 'it.3rd.irregular@example.com', '$2y$12$61j8NhzEQcPxRPJxUoNyWOWvtFGLLckNUcLVJoT8O6.TNGuhKb/Bi', '09189990003', 3, 'active', 0, NULL, '2026-04-12 19:11:10', 0),
(39, 'it.irreg.3rd.failures@example.com', '$2y$12$gYy6M/kSKcZos4cHXq2OeOPiOF2jBrRRSvV8Pcmnoojc8SFS5IoPm', '09189990077', 3, 'active', 0, NULL, '2026-04-12 19:24:24', 0);

-- --------------------------------------------------------

--
-- Table structure for table `tbl_user_permissions`
--

CREATE TABLE `tbl_user_permissions` (
  `user_permission_id` int(11) NOT NULL,
  `user_id` int(11) NOT NULL,
  `permission_id` int(11) NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Dumping data for table `tbl_user_permissions`
--

INSERT INTO `tbl_user_permissions` (`user_permission_id`, `user_id`, `permission_id`) VALUES
(52, 15, 10),
(54, 15, 12),
(3, 15, 14),
(4, 15, 16),
(21, 15, 25),
(8, 15, 34),
(51, 15, 40),
(49, 15, 41),
(50, 15, 42),
(48, 15, 43),
(53, 15, 44),
(57, 15, 46),
(56, 15, 47),
(55, 15, 48),
(13, 15, 49),
(24, 15, 52),
(23, 15, 53),
(16, 15, 56),
(17, 15, 57),
(18, 15, 58),
(38, 34, 25),
(39, 34, 40),
(40, 34, 49);

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
-- Indexes for table `tbl_academic_record_evaluation_complete`
--
ALTER TABLE `tbl_academic_record_evaluation_complete`
  ADD PRIMARY KEY (`academic_record_complete_id`),
  ADD KEY `tbl_academic_record_evaluation_complete_student_id_foreign` (`student_id`);

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
  ADD KEY `tbl_credit_evaluation_details_subject_id_foreign` (`subject_id`),
  ADD KEY `tbl_credit_evaluation_details_credit_eval_id_foreign` (`credit_eval_id`);

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
-- Indexes for table `tbl_grade_components`
--
ALTER TABLE `tbl_grade_components`
  ADD PRIMARY KEY (`grade_component_id`);

--
-- Indexes for table `tbl_modality`
--
ALTER TABLE `tbl_modality`
  ADD PRIMARY KEY (`modality_id`);

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
-- Indexes for table `tbl_section`
--
ALTER TABLE `tbl_section`
  ADD PRIMARY KEY (`section_id`);

--
-- Indexes for table `tbl_security_settings`
--
ALTER TABLE `tbl_security_settings`
  ADD PRIMARY KEY (`security_settings_id`);

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
-- Indexes for table `tbl_user_permissions`
--
ALTER TABLE `tbl_user_permissions`
  ADD PRIMARY KEY (`user_permission_id`),
  ADD UNIQUE KEY `tbl_user_permissions_user_perm_unique` (`user_id`,`permission_id`),
  ADD KEY `tbl_user_permissions_permission_id_foreign` (`permission_id`);

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
  MODIFY `audit_logs_id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=170;

--
-- AUTO_INCREMENT for table `curriculum`
--
ALTER TABLE `curriculum`
  MODIFY `curriculum_id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=156;

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
  MODIFY `id` int(10) UNSIGNED NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=49;

--
-- AUTO_INCREMENT for table `tbl_academic_record_evaluation_complete`
--
ALTER TABLE `tbl_academic_record_evaluation_complete`
  MODIFY `academic_record_complete_id` bigint(20) UNSIGNED NOT NULL AUTO_INCREMENT;

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
  MODIFY `credit_eval_id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=7;

--
-- AUTO_INCREMENT for table `tbl_credit_evaluation_details`
--
ALTER TABLE `tbl_credit_evaluation_details`
  MODIFY `credit_detail_id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=9;

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
  MODIFY `elective_slot_id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=8;

--
-- AUTO_INCREMENT for table `tbl_elective_subject`
--
ALTER TABLE `tbl_elective_subject`
  MODIFY `elective_subject_id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=51;

--
-- AUTO_INCREMENT for table `tbl_evaluation`
--
ALTER TABLE `tbl_evaluation`
  MODIFY `evaluation_id` bigint(20) UNSIGNED NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=186;

--
-- AUTO_INCREMENT for table `tbl_faculty_profile`
--
ALTER TABLE `tbl_faculty_profile`
  MODIFY `faculty_id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=4;

--
-- AUTO_INCREMENT for table `tbl_grade_components`
--
ALTER TABLE `tbl_grade_components`
  MODIFY `grade_component_id` bigint(20) UNSIGNED NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `tbl_modality`
--
ALTER TABLE `tbl_modality`
  MODIFY `modality_id` bigint(20) UNSIGNED NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `tbl_offered_subject`
--
ALTER TABLE `tbl_offered_subject`
  MODIFY `offered_subject_id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=2;

--
-- AUTO_INCREMENT for table `tbl_other_school_subjects`
--
ALTER TABLE `tbl_other_school_subjects`
  MODIFY `other_subject_id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=8;

--
-- AUTO_INCREMENT for table `tbl_permission`
--
ALTER TABLE `tbl_permission`
  MODIFY `permission_id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=89;

--
-- AUTO_INCREMENT for table `tbl_prerequisite`
--
ALTER TABLE `tbl_prerequisite`
  MODIFY `requisites_id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=31;

--
-- AUTO_INCREMENT for table `tbl_program`
--
ALTER TABLE `tbl_program`
  MODIFY `program_id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=3;

--
-- AUTO_INCREMENT for table `tbl_roles`
--
ALTER TABLE `tbl_roles`
  MODIFY `role_id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=9;

--
-- AUTO_INCREMENT for table `tbl_role_permissions`
--
ALTER TABLE `tbl_role_permissions`
  MODIFY `role_permission_id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=888;

--
-- AUTO_INCREMENT for table `tbl_schools`
--
ALTER TABLE `tbl_schools`
  MODIFY `school_id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=4;

--
-- AUTO_INCREMENT for table `tbl_section`
--
ALTER TABLE `tbl_section`
  MODIFY `section_id` bigint(20) UNSIGNED NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `tbl_security_settings`
--
ALTER TABLE `tbl_security_settings`
  MODIFY `security_settings_id` bigint(20) UNSIGNED NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=2;

--
-- AUTO_INCREMENT for table `tbl_semester`
--
ALTER TABLE `tbl_semester`
  MODIFY `semester_id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=4;

--
-- AUTO_INCREMENT for table `tbl_student_profile`
--
ALTER TABLE `tbl_student_profile`
  MODIFY `student_id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=12;

--
-- AUTO_INCREMENT for table `tbl_subjects`
--
ALTER TABLE `tbl_subjects`
  MODIFY `subject_id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=78;

--
-- AUTO_INCREMENT for table `tbl_subject_equivalence`
--
ALTER TABLE `tbl_subject_equivalence`
  MODIFY `equivalence_id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=9;

--
-- AUTO_INCREMENT for table `tbl_track`
--
ALTER TABLE `tbl_track`
  MODIFY `track_id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=5;

--
-- AUTO_INCREMENT for table `tbl_users`
--
ALTER TABLE `tbl_users`
  MODIFY `user_id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=40;

--
-- AUTO_INCREMENT for table `tbl_user_permissions`
--
ALTER TABLE `tbl_user_permissions`
  MODIFY `user_permission_id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=58;

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
-- Constraints for table `tbl_academic_record_evaluation_complete`
--
ALTER TABLE `tbl_academic_record_evaluation_complete`
  ADD CONSTRAINT `tbl_academic_record_evaluation_complete_student_id_foreign` FOREIGN KEY (`student_id`) REFERENCES `tbl_student_profile` (`student_id`) ON DELETE CASCADE;

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
  ADD CONSTRAINT `tbl_credit_evaluation_details_credit_eval_id_foreign` FOREIGN KEY (`credit_eval_id`) REFERENCES `tbl_credit_evaluation` (`credit_eval_id`) ON DELETE CASCADE,
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

--
-- Constraints for table `tbl_user_permissions`
--
ALTER TABLE `tbl_user_permissions`
  ADD CONSTRAINT `tbl_user_permissions_permission_id_foreign` FOREIGN KEY (`permission_id`) REFERENCES `tbl_permission` (`permission_id`) ON DELETE CASCADE,
  ADD CONSTRAINT `tbl_user_permissions_user_id_foreign` FOREIGN KEY (`user_id`) REFERENCES `tbl_users` (`user_id`) ON DELETE CASCADE;
COMMIT;

/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;
/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;
