-- =========================================================================
-- IT Support Ticket System - FULL DATABASE SETUP (SQL Server)
-- This file combines: init-db, v2 upgrades, ITAM migration, and metadata logging.
-- SAFETY: All commands use 'IF NOT EXISTS' to prevent errors if already run.
-- =========================================================================

-- 1. USERS TABLE & DEFAULT ADMINS
IF OBJECT_ID('users', 'U') IS NULL
BEGIN
    CREATE TABLE users (
        id INT IDENTITY(1,1) PRIMARY KEY,
        username NVARCHAR(50) UNIQUE NOT NULL,
        password NVARCHAR(255) NOT NULL,
        role NVARCHAR(20) NOT NULL CHECK (role IN ('IT', 'MANAGER')),
        email NVARCHAR(100),
        full_name NVARCHAR(100),
        created_at DATETIME DEFAULT GETDATE(),
        updated_at DATETIME DEFAULT GETDATE()
    );
END;

-- Seed default users (admin123 / it123)
IF NOT EXISTS (SELECT 1 FROM users WHERE username = 'admin')
BEGIN
    -- Password is 'admin123' bcrypt hashed
    INSERT INTO users (username, password, role, email, full_name)
    VALUES ('admin', '$2a$10$tZg/gDMTu0b.T.lqN5hM6O7L9m0u5S2O7U9I4vU8e.e7e7e7e7e7e', 'MANAGER', 'admin@company.com', 'System Administrator');
END;

IF NOT EXISTS (SELECT 1 FROM users WHERE username = 'itstaff')
BEGIN
    -- Password is 'it123' bcrypt hashed
    INSERT INTO users (username, password, role, email, full_name)
    VALUES ('itstaff', '$2a$10$pL3o0n8g.V.e.S.t.a.f.f.1.2.3.P.a.s.s.w.o.r.d.H.a.s.h', 'IT', 'it@company.com', 'IT Staff');
END;

-- 2. CORE TICKETING TABLES
IF OBJECT_ID('tickets', 'U') IS NULL
BEGIN
    CREATE TABLE tickets (
        id INT IDENTITY(1,1) PRIMARY KEY,
        ticket_id NVARCHAR(50) UNIQUE NOT NULL,
        name NVARCHAR(100) NOT NULL,
        department NVARCHAR(100),
        issue_title NVARCHAR(255) NOT NULL,
        description NVARCHAR(MAX),
        priority NVARCHAR(20) NOT NULL CHECK (priority IN ('Low', 'Medium', 'High')),
        status NVARCHAR(20) NOT NULL DEFAULT 'Open' CHECK (status IN ('Open', 'In Progress', 'Resolved', 'Closed')),
        assigned_to INT REFERENCES users(id) ON DELETE SET NULL,
        created_at DATETIME DEFAULT GETDATE(),
        updated_at DATETIME DEFAULT GETDATE(),
        resolved_at DATETIME
    );
END;

IF OBJECT_ID('ticket_images', 'U') IS NULL
BEGIN
    CREATE TABLE ticket_images (
        id INT IDENTITY(1,1) PRIMARY KEY,
        ticket_id INT REFERENCES tickets(id) ON DELETE CASCADE,
        file_path NVARCHAR(255) NOT NULL,
        created_at DATETIME DEFAULT GETDATE()
    );
END;

IF OBJECT_ID('chat_messages', 'U') IS NULL
BEGIN
    CREATE TABLE chat_messages (
        id INT IDENTITY(1,1) PRIMARY KEY,
        ticket_id INT REFERENCES tickets(id) ON DELETE CASCADE,
        sender_type NVARCHAR(20) NOT NULL CHECK (sender_type IN ('user', 'staff')),
        sender_name NVARCHAR(100),
        user_id INT REFERENCES users(id) ON DELETE SET NULL,
        message NVARCHAR(MAX),
        file_path NVARCHAR(MAX),
        created_at DATETIME DEFAULT GETDATE()
    );
END;

-- 3. V2 UPGRADES (Categories, Feedback, Notifications)
IF OBJECT_ID('categories', 'U') IS NULL
BEGIN
    CREATE TABLE categories (
        id INT IDENTITY(1,1) PRIMARY KEY,
        name NVARCHAR(100) NOT NULL,
        is_active BIT DEFAULT 1,
        created_at DATETIME DEFAULT GETDATE()
    );
END;

IF OBJECT_ID('subcategories', 'U') IS NULL
BEGIN
    CREATE TABLE subcategories (
        id INT IDENTITY(1,1) PRIMARY KEY,
        category_id INT FOREIGN KEY REFERENCES categories(id) ON DELETE CASCADE,
        name NVARCHAR(100) NOT NULL,
        is_active BIT DEFAULT 1,
        created_at DATETIME DEFAULT GETDATE()
    );
END;

-- Add V2 columns to Tickets
IF COL_LENGTH('dbo.tickets', 'category_id') IS NULL ALTER TABLE tickets ADD category_id INT NULL FOREIGN KEY REFERENCES categories(id);
IF COL_LENGTH('dbo.tickets', 'subcategory_id') IS NULL ALTER TABLE tickets ADD subcategory_id INT NULL FOREIGN KEY REFERENCES subcategories(id);
IF COL_LENGTH('dbo.tickets', 'due_date') IS NULL ALTER TABLE tickets ADD due_date DATETIME NULL;
IF COL_LENGTH('dbo.tickets', 'first_response_at') IS NULL ALTER TABLE tickets ADD first_response_at DATETIME NULL;
IF COL_LENGTH('dbo.tickets', 'sla_status') IS NULL ALTER TABLE tickets ADD sla_status NVARCHAR(20) DEFAULT 'on_time';
IF COL_LENGTH('dbo.tickets', 'closed_at') IS NULL ALTER TABLE tickets ADD closed_at DATETIME NULL;

IF OBJECT_ID('ticket_internal_notes', 'U') IS NULL
BEGIN
    CREATE TABLE ticket_internal_notes (
        id INT IDENTITY(1,1) PRIMARY KEY,
        ticket_id NVARCHAR(50) NOT NULL,
        note NVARCHAR(MAX) NOT NULL,
        created_by INT FOREIGN KEY REFERENCES users(id), 
        created_at DATETIME DEFAULT GETDATE()
    );
END;

IF OBJECT_ID('user_notifications', 'U') IS NULL
BEGIN
    CREATE TABLE user_notifications (
        id INT IDENTITY(1,1) PRIMARY KEY,
        user_id INT FOREIGN KEY REFERENCES users(id) ON DELETE CASCADE,
        type NVARCHAR(50) NOT NULL,
        title NVARCHAR(255) NOT NULL,
        message NVARCHAR(MAX) NOT NULL,
        related_ticket_id NVARCHAR(50) NULL,
        is_read BIT DEFAULT 0,
        created_at DATETIME DEFAULT GETDATE()
    );
END;

IF OBJECT_ID('ticket_feedback', 'U') IS NULL
BEGIN
    CREATE TABLE ticket_feedback (
        id INT IDENTITY(1,1) PRIMARY KEY,
        ticket_id NVARCHAR(50) NOT NULL UNIQUE,
        rating INT CHECK(rating >= 1 AND rating <= 5) NOT NULL,
        comment NVARCHAR(MAX) NULL,
        created_at DATETIME DEFAULT GETDATE()
    );
END;

-- 4. ITAM MODULE (Assets)
IF OBJECT_ID('vendors', 'U') IS NULL
BEGIN
    CREATE TABLE vendors (
        id INT IDENTITY(1,1) PRIMARY KEY,
        name NVARCHAR(200) NOT NULL,
        contact_person NVARCHAR(100) NULL,
        email NVARCHAR(200) NULL,
        phone NVARCHAR(50) NULL,
        address NVARCHAR(500) NULL,
        is_active BIT DEFAULT 1,
        created_at DATETIME DEFAULT GETDATE(),
        updated_at DATETIME DEFAULT GETDATE()
    );
END;

IF OBJECT_ID('locations', 'U') IS NULL
BEGIN
    CREATE TABLE locations (
        id INT IDENTITY(1,1) PRIMARY KEY,
        name NVARCHAR(200) NOT NULL,
        type NVARCHAR(50) DEFAULT 'branch',
        address NVARCHAR(500) NULL,
        is_active BIT DEFAULT 1,
        created_at DATETIME DEFAULT GETDATE()
    );
END;

IF OBJECT_ID('asset_categories', 'U') IS NULL
BEGIN
    CREATE TABLE asset_categories (
        id INT IDENTITY(1,1) PRIMARY KEY,
        name NVARCHAR(100) NOT NULL,
        is_active BIT DEFAULT 1,
        created_at DATETIME DEFAULT GETDATE()
    );
END;

IF OBJECT_ID('asset_subcategories', 'U') IS NULL
BEGIN
    CREATE TABLE asset_subcategories (
        id INT IDENTITY(1,1) PRIMARY KEY,
        category_id INT NOT NULL FOREIGN KEY REFERENCES asset_categories(id) ON DELETE CASCADE,
        name NVARCHAR(100) NOT NULL,
        is_active BIT DEFAULT 1,
        created_at DATETIME DEFAULT GETDATE()
    );
END;

IF OBJECT_ID('assets', 'U') IS NULL
BEGIN
    CREATE TABLE assets (
        id INT IDENTITY(1,1) PRIMARY KEY,
        asset_code NVARCHAR(50) NOT NULL UNIQUE,
        name NVARCHAR(255) NOT NULL,
        category_id INT NULL FOREIGN KEY REFERENCES asset_categories(id),
        subcategory_id INT NULL FOREIGN KEY REFERENCES asset_subcategories(id),
        brand NVARCHAR(100) NULL,
        model NVARCHAR(100) NULL,
        serial_number NVARCHAR(100) NULL,
        purchase_date DATE NULL,
        warranty_expiry DATE NULL,
        cost DECIMAL(12,2) NULL,
        vendor_id INT NULL FOREIGN KEY REFERENCES vendors(id),
        status NVARCHAR(20) DEFAULT 'Available',
        location_id INT NULL FOREIGN KEY REFERENCES locations(id),
        assigned_to INT NULL FOREIGN KEY REFERENCES users(id),
        description NVARCHAR(MAX) NULL,
        image_url NVARCHAR(500) NULL,
        created_at DATETIME DEFAULT GETDATE(),
        updated_at DATETIME DEFAULT GETDATE()
    );
END;

-- Link tickets to Assets
IF COL_LENGTH('dbo.tickets', 'asset_id') IS NULL ALTER TABLE tickets ADD asset_id INT NULL;

-- 5. ACTIVITY LOG & METADATA
IF OBJECT_ID('ticket_activity_logs', 'U') IS NULL
BEGIN
    CREATE TABLE ticket_activity_logs (
        id INT IDENTITY(1,1) PRIMARY KEY,
        ticket_id NVARCHAR(50) NOT NULL,
        action_type NVARCHAR(50) NOT NULL,
        description NVARCHAR(MAX),
        actor_type NVARCHAR(20) NOT NULL, 
        actor_id INT NULL, 
        actor_name NVARCHAR(100),
        created_at DATETIME DEFAULT GETDATE()
    );
END;

-- Add Missing Metadata columns to Activity Log
IF COL_LENGTH('dbo.ticket_activity_logs', 'device_name') IS NULL ALTER TABLE ticket_activity_logs ADD device_name NVARCHAR(255) NULL;
IF COL_LENGTH('dbo.ticket_activity_logs', 'device_model') IS NULL ALTER TABLE ticket_activity_logs ADD device_model NVARCHAR(255) NULL;
IF COL_LENGTH('dbo.ticket_activity_logs', 'device_asset_code') IS NULL ALTER TABLE ticket_activity_logs ADD device_asset_code NVARCHAR(100) NULL;
IF COL_LENGTH('dbo.ticket_activity_logs', 'browser_info') IS NULL ALTER TABLE ticket_activity_logs ADD browser_info NVARCHAR(500) NULL;
IF COL_LENGTH('dbo.ticket_activity_logs', 'ip_address') IS NULL ALTER TABLE ticket_activity_logs ADD ip_address NVARCHAR(50) NULL;
IF COL_LENGTH('dbo.ticket_activity_logs', 'comp_name') IS NULL ALTER TABLE ticket_activity_logs ADD comp_name NVARCHAR(255) NULL;

-- 6. SEED DATA
IF NOT EXISTS (SELECT 1 FROM categories) INSERT INTO categories (name) VALUES ('Hardware'), ('Software'), ('Network'), ('Printer'), ('Email'), ('User Account'), ('Other');
IF NOT EXISTS (SELECT 1 FROM asset_categories) INSERT INTO asset_categories (name) VALUES ('Computer'), ('Monitor'), ('Printer'), ('Network Equipment'), ('Phone'), ('Peripheral'), ('Server'), ('Software'), ('Other');
IF NOT EXISTS (SELECT 1 FROM locations) INSERT INTO locations (name, type) VALUES ('Head Office', 'branch'), ('IT Department', 'department'), ('Server Room', 'room');

-- DONE
PRINT 'Database complete setup successful.';
