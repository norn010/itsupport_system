import pool from './database.js';

const initDB = async () => {
  try {
    // Users table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS users (
        id SERIAL PRIMARY KEY,
        username VARCHAR(50) UNIQUE NOT NULL,
        password VARCHAR(255) NOT NULL,
        role VARCHAR(20) NOT NULL CHECK (role IN ('IT', 'MANAGER')),
        email VARCHAR(100),
        full_name VARCHAR(100),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Tickets table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS tickets (
        id SERIAL PRIMARY KEY,
        ticket_id VARCHAR(50) UNIQUE NOT NULL,
        name VARCHAR(100) NOT NULL,
        department VARCHAR(100),
        issue_title VARCHAR(255) NOT NULL,
        description TEXT,
        priority VARCHAR(20) NOT NULL CHECK (priority IN ('Low', 'Medium', 'High')),
        status VARCHAR(20) NOT NULL DEFAULT 'Open' CHECK (status IN ('Open', 'In Progress', 'Resolved', 'Closed')),
        assigned_to INTEGER REFERENCES users(id) ON DELETE SET NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        resolved_at TIMESTAMP
      )
    `);

    // Ticket images table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS ticket_images (
        id SERIAL PRIMARY KEY,
        ticket_id INTEGER REFERENCES tickets(id) ON DELETE CASCADE,
        file_path VARCHAR(255) NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Chat messages table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS chat_messages (
        id SERIAL PRIMARY KEY,
        ticket_id INTEGER REFERENCES tickets(id) ON DELETE CASCADE,
        sender_type VARCHAR(20) NOT NULL CHECK (sender_type IN ('user', 'staff')),
        sender_name VARCHAR(100),
        user_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
        message TEXT NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Create default admin users
    const bcrypt = await import('bcryptjs');
    const hashedPassword = bcrypt.default.hashSync('admin123', 10);

    await pool.query(`
      INSERT INTO users (username, password, role, email, full_name)
      VALUES ('admin', $1, 'MANAGER', 'admin@company.com', 'System Administrator')
      ON CONFLICT (username) DO NOTHING
    `, [hashedPassword]);

    const hashedITPassword = bcrypt.default.hashSync('it123', 10);
    await pool.query(`
      INSERT INTO users (username, password, role, email, full_name)
      VALUES ('itstaff', $1, 'IT', 'it@company.com', 'IT Staff')
      ON CONFLICT (username) DO NOTHING
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

export default initDB;
