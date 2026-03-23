import pool from './database.js';

const initDB = async () => {
  try {
    // Users table
    await pool.query(`
      IF OBJECT_ID('users', 'U') IS NULL
      CREATE TABLE users (
        id INT IDENTITY(1,1) PRIMARY KEY,
        username NVARCHAR(50) UNIQUE NOT NULL,
        password NVARCHAR(255) NOT NULL,
        role NVARCHAR(20) NOT NULL CHECK (role IN ('IT', 'MANAGER')),
        email NVARCHAR(100),
        full_name NVARCHAR(100),
        created_at DATETIME DEFAULT GETDATE(),
        updated_at DATETIME DEFAULT GETDATE()
      )
    `);

    // Tickets table
    await pool.query(`
      IF OBJECT_ID('tickets', 'U') IS NULL
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
      )
    `);

    // Ticket images table
    await pool.query(`
      IF OBJECT_ID('ticket_images', 'U') IS NULL
      CREATE TABLE ticket_images (
        id INT IDENTITY(1,1) PRIMARY KEY,
        ticket_id INT REFERENCES tickets(id) ON DELETE CASCADE,
        file_path NVARCHAR(255) NOT NULL,
        created_at DATETIME DEFAULT GETDATE()
      )
    `);

    // Chat messages table
    await pool.query(`
      IF OBJECT_ID('chat_messages', 'U') IS NULL
      CREATE TABLE chat_messages (
        id INT IDENTITY(1,1) PRIMARY KEY,
        ticket_id INT REFERENCES tickets(id) ON DELETE CASCADE,
        sender_type NVARCHAR(20) NOT NULL CHECK (sender_type IN ('user', 'staff')),
        sender_name NVARCHAR(100),
        user_id INT REFERENCES users(id) ON DELETE SET NULL,
        message NVARCHAR(MAX),
        file_path NVARCHAR(MAX),
        created_at DATETIME DEFAULT GETDATE()
      )
    `);

    // Add file_path if table already exists
    await pool.query(`
      IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID('chat_messages') AND name = 'file_path')
      BEGIN
        ALTER TABLE chat_messages ADD file_path NVARCHAR(MAX);
        ALTER TABLE chat_messages ALTER COLUMN message NVARCHAR(MAX) NULL;
      END
    `);

    // Create default admin users
    const bcrypt = await import('bcryptjs');
    const hashedPassword = bcrypt.default.hashSync('admin123', 10);

    await pool.query(`
      IF NOT EXISTS (SELECT 1 FROM users WHERE username = 'admin')
      BEGIN
        INSERT INTO users (username, password, role, email, full_name)
        VALUES ('admin', $1, 'MANAGER', 'admin@company.com', 'System Administrator')
      END
    `, [hashedPassword]);

    const hashedITPassword = bcrypt.default.hashSync('it123', 10);
    await pool.query(`
      IF NOT EXISTS (SELECT 1 FROM users WHERE username = 'itstaff')
      BEGIN
        INSERT INTO users (username, password, role, email, full_name)
        VALUES ('itstaff', $1, 'IT', 'it@company.com', 'IT Staff')
      END
    `, [hashedITPassword]);

    console.log('Database initialized successfully');
    console.log('Default users created:');
    console.log('  - admin / admin123 (Manager)');
    console.log('  - itstaff / it123 (IT Staff)');

  } catch (error) {
    console.error('Error initializing database:', error);
    throw error;
  }
};

initDB().then(() => {
  console.log('Finished DB init');
  process.exit(0);
}).catch(err => {
  console.error('Fatal error during DB init:', err);
  process.exit(1);
});

export default initDB;
