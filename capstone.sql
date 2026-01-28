-- Create the database
CREATE DATABASE IF NOT EXISTS capstone_db CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- Use the database
USE capstone_db;

-- =========================
-- CORE LOOKUP TABLES
-- =========================

CREATE TABLE tbl_campus (
    campus_id INT AUTO_INCREMENT PRIMARY KEY,
    campus_name VARCHAR(100) NOT NULL
) ENGINE=InnoDB;

CREATE TABLE tbl_semester (
    semester_id INT AUTO_INCREMENT PRIMARY KEY,
    semester_name VARCHAR(50) NOT NULL
) ENGINE=InnoDB;

CREATE TABLE tbl_academic_year (
    academic_year_id INT AUTO_INCREMENT PRIMARY KEY,
    academic_year_name VARCHAR(50) NOT NULL
) ENGINE=InnoDB;

CREATE TABLE year_level (
    year_level_id INT AUTO_INCREMENT PRIMARY KEY,
    year_level VARCHAR(50) NOT NULL
) ENGINE=InnoDB;

CREATE TABLE tbl_departments (
    department_id INT AUTO_INCREMENT PRIMARY KEY,
    department_name VARCHAR(100) NOT NULL,
    department_code VARCHAR(20) NOT NULL
) ENGINE=InnoDB;

CREATE TABLE tbl_roles (
    role_id INT AUTO_INCREMENT PRIMARY KEY,
    role_name VARCHAR(50) NOT NULL,
    access_level INT NOT NULL,
    description VARCHAR(255)
) ENGINE=InnoDB;

-- =========================
-- USER & STUDENT
-- =========================

CREATE TABLE tbl_users (
    user_id INT AUTO_INCREMENT PRIMARY KEY,
    email VARCHAR(100) NOT NULL,
    password VARCHAR(255) NOT NULL,
    contact_number VARCHAR(20),
    role_id INT,
    status VARCHAR(50),
    CONSTRAINT fk_users_role
        FOREIGN KEY (role_id) REFERENCES tbl_roles(role_id)
) ENGINE=InnoDB;

CREATE TABLE tbl_program (
    program_id INT AUTO_INCREMENT PRIMARY KEY,
    department_id INT NOT NULL,
    campus_id INT NOT NULL,
    program_code VARCHAR(50),
    program_name VARCHAR(100),
    total_units_required INT,
    CONSTRAINT fk_program_department
        FOREIGN KEY (department_id) REFERENCES tbl_departments(department_id),
    CONSTRAINT fk_program_campus
        FOREIGN KEY (campus_id) REFERENCES tbl_campus(campus_id)
) ENGINE=InnoDB;

CREATE TABLE tbl_student_profile (
    student_id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    student_number INT NOT NULL,
    contact_number VARCHAR(20),
    full_name VARCHAR(150),
    academic_status VARCHAR(50),
    current_program INT,
    CONSTRAINT fk_student_user
        FOREIGN KEY (user_id) REFERENCES tbl_users(user_id),
    CONSTRAINT fk_student_program
        FOREIGN KEY (current_program) REFERENCES tbl_program(program_id)
) ENGINE=InnoDB;

-- =========================
-- SUBJECTS & CURRICULUM
-- =========================

CREATE TABLE tbl_subjects (
    subject_id INT AUTO_INCREMENT PRIMARY KEY,
    subject_code VARCHAR(50) NOT NULL,
    subject_name VARCHAR(100) NOT NULL,
    number_of_units INT,
    number_of_hrs INT
) ENGINE=InnoDB;

CREATE TABLE tbl_prerequisite (
    prerequisite_id INT AUTO_INCREMENT PRIMARY KEY,
    subject_id INT NOT NULL,
    prereq_subject_id INT NOT NULL,
    CONSTRAINT fk_prereq_subject
        FOREIGN KEY (subject_id) REFERENCES tbl_subjects(subject_id),
    CONSTRAINT fk_prereq_required
        FOREIGN KEY (prereq_subject_id) REFERENCES tbl_subjects(subject_id)
) ENGINE=InnoDB;

CREATE TABLE curriculum (
    curriculum_id INT AUTO_INCREMENT PRIMARY KEY,
    program_id INT NOT NULL,
    subject_id INT NOT NULL,
    year_level INT NOT NULL,
    semester_id INT NOT NULL,
    passing_grade INT,
    subject_type VARCHAR(50),
    prerequisite_id INT,
    CONSTRAINT fk_curriculum_program
        FOREIGN KEY (program_id) REFERENCES tbl_program(program_id),
    CONSTRAINT fk_curriculum_subject
        FOREIGN KEY (subject_id) REFERENCES tbl_subjects(subject_id),
    CONSTRAINT fk_curriculum_year
        FOREIGN KEY (year_level) REFERENCES year_level(year_level_id),
    CONSTRAINT fk_curriculum_semester
        FOREIGN KEY (semester_id) REFERENCES tbl_semester(semester_id),
    CONSTRAINT fk_curriculum_prereq
        FOREIGN KEY (prerequisite_id) REFERENCES tbl_prerequisite(prerequisite_id)
) ENGINE=InnoDB;

-- =========================
-- SECTION & ENROLLMENT
-- =========================

CREATE TABLE tbl_section (
    section_id INT AUTO_INCREMENT PRIMARY KEY,
    section_name VARCHAR(50)
) ENGINE=InnoDB;

CREATE TABLE tbl_enrollments (
    enrollment_id INT AUTO_INCREMENT PRIMARY KEY,
    student_id INT NOT NULL,
    subject_id INT NOT NULL,
    academic_year_id INT NOT NULL,
    semester_id INT NOT NULL,
    grade VARCHAR(10),
    status VARCHAR(50),
    enrolled_date DATE,
    section_id INT,
    CONSTRAINT fk_enroll_student
        FOREIGN KEY (student_id) REFERENCES tbl_student_profile(student_id),
    CONSTRAINT fk_enroll_subject
        FOREIGN KEY (subject_id) REFERENCES tbl_subjects(subject_id),
    CONSTRAINT fk_enroll_year
        FOREIGN KEY (academic_year_id) REFERENCES tbl_academic_year(academic_year_id),
    CONSTRAINT fk_enroll_semester
        FOREIGN KEY (semester_id) REFERENCES tbl_semester(semester_id),
    CONSTRAINT fk_enroll_section
        FOREIGN KEY (section_id) REFERENCES tbl_section(section_id)
) ENGINE=InnoDB;

-- =========================
-- STUDENT STANDING
-- =========================

CREATE TABLE tbl_student_standing_subject (
    student_subject_id INT AUTO_INCREMENT PRIMARY KEY,
    student_id INT NOT NULL,
    subject_id INT NOT NULL,
    off_sem VARCHAR(50),
    evaluation_status VARCHAR(50),
    CONSTRAINT fk_standing_student
        FOREIGN KEY (student_id) REFERENCES tbl_student_profile(student_id),
    CONSTRAINT fk_standing_subject
        FOREIGN KEY (subject_id) REFERENCES tbl_subjects(subject_id)
) ENGINE=InnoDB;

-- =========================
-- SHIFTING & REQUESTS
-- =========================

CREATE TABLE tbl_shifting_request (
    request_id INT AUTO_INCREMENT PRIMARY KEY,
    student_id INT NOT NULL,
    subject_id INT,
    request_date DATE,
    request_type VARCHAR(50),
    reason VARCHAR(255),
    status VARCHAR(50),
    CONSTRAINT fk_shift_student
        FOREIGN KEY (student_id) REFERENCES tbl_student_profile(student_id),
    CONSTRAINT fk_shift_subject
        FOREIGN KEY (subject_id) REFERENCES tbl_subjects(subject_id)
) ENGINE=InnoDB;

CREATE TABLE tbl_verification_records (
    verification_id INT AUTO_INCREMENT PRIMARY KEY,
    request_id INT NOT NULL,
    verifier_id INT NOT NULL,
    verification_date DATETIME,
    decision VARCHAR(50),
    comments VARCHAR(255),
    CONSTRAINT fk_verify_request
        FOREIGN KEY (request_id) REFERENCES tbl_shifting_request(request_id),
    CONSTRAINT fk_verify_user
        FOREIGN KEY (verifier_id) REFERENCES tbl_users(user_id)
) ENGINE=InnoDB;

CREATE TABLE tbl_student_program_history (
    history_id INT AUTO_INCREMENT PRIMARY KEY,
    request_id INT NOT NULL,
    program_id INT NOT NULL,
    academic_year_id INT NOT NULL,
    semester_id INT NOT NULL,
    date_changed DATE,
    remarks VARCHAR(255),
    CONSTRAINT fk_history_request
        FOREIGN KEY (request_id) REFERENCES tbl_shifting_request(request_id),
    CONSTRAINT fk_history_program
        FOREIGN KEY (program_id) REFERENCES tbl_program(program_id),
    CONSTRAINT fk_history_year
        FOREIGN KEY (academic_year_id) REFERENCES tbl_academic_year(academic_year_id),
    CONSTRAINT fk_history_semester
        FOREIGN KEY (semester_id) REFERENCES tbl_semester(semester_id)
) ENGINE=InnoDB;

