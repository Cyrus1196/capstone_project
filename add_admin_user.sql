-- Add Admin User Script
-- Run this in phpMyAdmin SQL tab after selecting the capstone_db database
-- Default credentials: admin@example.com / admin123

-- Step 1: Insert an Admin role if it doesn't exist (with access_level 10 for admin)
INSERT IGNORE INTO tbl_roles (role_id, role_name, access_level, description)
VALUES (1, 'Admin', 10, 'Administrator with full access');

-- Step 2: Insert admin user with hashed password
-- Password: admin123 (bcrypt hash)
-- Email: admin@example.com
INSERT INTO tbl_users (email, password, contact_number, role_id, status)
VALUES (
    'admin@example.com',
    '$2y$10$FTv8zlXXPyC4k.2/xhANQunZErNkdZqvDu471VS3B8K1pMymYtmam', -- password: admin123
    NULL,
    1, -- Admin role_id (adjust if your Admin role has a different ID)
    'active'
)
ON DUPLICATE KEY UPDATE 
    email = VALUES(email),
    password = VALUES(password),
    status = 'active';

-- Step 3: Verify the user was created
SELECT 
    u.user_id, 
    u.email, 
    u.status,
    r.role_name,
    r.access_level
FROM tbl_users u
LEFT JOIN tbl_roles r ON u.role_id = r.role_id
WHERE u.email = 'admin@example.com';
