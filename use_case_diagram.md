# Use Case Diagram - Academic Curriculum Management System

## System Overview
This use case diagram represents an Academic Curriculum Management System with five main user types: Admin, Dean, Faculty, Student, and Guest.

## User Roles (Actors)

### 1. Admin
- **Access Level**: 10 (Full system access)
- **Description**: Administrator with complete control over the system

### 2. Dean  
- **Access Level**: 9 (High-level administrative access)
- **Description**: Academic dean overseeing curriculum and departments

### 3. Faculty
- **Access Level**: 9 (Academic staff access)
- **Description**: Teachers and instructors managing courses

### 4. Student
- **Access Level**: 5 (Limited access)
- **Description**: Students accessing curriculum information

### 5. Guest
- **Access Level**: 0 (Public access)
- **Description**: Unauthenticated users with limited viewing capabilities

## Use Cases

### Authentication Use Cases
- **Login** (Guest → Any Role)
- **Logout** (Any Authenticated Role)
- **View Profile** (Admin, Dean, Faculty, Student)

### Admin Use Cases
- **Manage Users** (CRUD operations)
  - Create User Account
  - Update User Information
  - Delete User Account
  - View User List
  - Manage User Roles
- **Manage System Data**
  - Manage Campuses
  - Manage Departments  
  - Manage Programs
  - Manage Subjects
  - Manage Year Levels
  - Manage Semesters
  - Manage Academic Years
  - Manage Sections
- **Manage Curriculum**
  - Create Curriculum
  - Update Curriculum
  - Delete Curriculum
  - View Curriculum Reports
- **Manage Requisites**
  - Manage Prerequisites
  - Manage Corequisites
  - View Requisite Reports

### Dean Use Cases
- **Curriculum Oversight**
  - Review Curriculum Changes
  - Approve Curriculum Updates
  - View Department Statistics
  - Generate Academic Reports
- **Department Management**
  - Manage Departments
  - Assign Faculty to Departments
  - View Department Performance
- **Academic Planning**
  - Plan Academic Calendar
  - Manage Course Offerings
  - Review Enrollment Data

### Faculty Use Cases
- **Course Management**
  - View Assigned Courses
  - Manage Course Materials
  - Update Course Information
- **Student Management**
  - View Student Rosters
  - Manage Student Grades
  - Track Student Progress
- **Curriculum Participation**
  - View Curriculum Requirements
  - Suggest Curriculum Changes
  - Report Course Issues

### Student Use Cases
- **Academic Information**
  - View Curriculum Requirements
  - Check Course Prerequisites
  - View Available Courses
  - Track Academic Progress
- **Enrollment Management**
  - View Enrollment Status
  - Check Course Availability
  - View Academic History
- **Personal Information**
  - Update Profile Information
  - View Academic Records
  - Check Graduation Requirements

### Guest Use Cases
- **Public Information**
  - View Public Curriculum
  - Browse Course Catalog
  - View General Program Information
- **System Access**
  - Login to System
  - Request Account
  - View System Information

## Use Case Relationships

### Include Relationships
- All authenticated users include **Login**
- All user management includes **Authentication**
- Curriculum management includes **Data Validation**

### Extend Relationships
- **Generate Reports** extends **View Data**
- **Bulk Operations** extends **CRUD Operations**
- **Advanced Search** extends **Basic Search**

### Generalization Relationships
- **Admin**, **Dean**, **Faculty**, **Student** all generalize to **Authenticated User**
- **Authenticated User** and **Guest** generalize to **System User**

## System Boundaries

```
+---------------------------------------------------------+
|              Academic Curriculum Management System      |
|                                                         |
|  +-------------------+    +--------------------------+  |
|  |      Admin        |    |         Dean             |  |
|  +-------------------+    +--------------------------+  |
|           |                       |                     |
|  +-------------------+    +--------------------------+  |
|  |     Faculty       |    |        Student           |  |
|  +-------------------+    +--------------------------+  |
|           |                       |                     |
|  +---------------------------------------------------+  |
|  |                   Guest                           |  |
|  +---------------------------------------------------+  |
|                                                         |
|  Use Cases:                                             |
|  - Authentication                                       |
|  - User Management                                      |
|  - Curriculum Management                                |
|  - Requisite Management                                 |
|  - Academic Reporting                                   |
|  - Enrollment Management                                |
|                                                         |
+---------------------------------------------------------+
```

## Priority Levels

### High Priority Use Cases
1. Login/Logout
2. User Management (Admin)
3. Curriculum Management
4. View Curriculum (Student/Faculty)

### Medium Priority Use Cases
1. Requisite Management
2. Academic Reporting
3. Department Management (Dean)
4. Course Management (Faculty)

### Low Priority Use Cases
1. Advanced Analytics
2. Bulk Operations
3. System Configuration
4. Guest Features

## Security Considerations

### Role-Based Access Control
- Each role has specific access levels
- Admin can access all features
- Dean has department-level access
- Faculty has course-level access
- Student has read-only access to personal data
- Guest has public access only

### Data Protection
- Sensitive operations require authentication
- Role validation on all protected routes
- Audit trails for administrative actions
- Data encryption for sensitive information

## Implementation Notes

### API Endpoints Mapping
- `/api/auth/*` → Authentication use cases
- `/api/users/*` → User management use cases
- `/api/curriculum/*` → Curriculum management use cases
- `/api/requisites/*` → Requisite management use cases
- `/api/lookup/*` → System data management use cases

### Database Schema Support
- `tbl_users` → User management
- `tbl_roles` → Role-based access
- `tbl_curriculum` → Curriculum data
- `tbl_prerequisites` → Prerequisite management
- `tbl_corequisites` → Corequisite management
- Lookup tables → System reference data

This use case diagram provides a comprehensive overview of the system's functionality and user interactions, serving as a blueprint for development and testing phases.
