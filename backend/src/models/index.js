import pool from '../config/database.js';

export const Ticket = {
  async create({ ticket_id, name, department, issue_title, description, priority }) {
    const query = `
      INSERT INTO tickets (ticket_id, name, department, issue_title, description, priority)
      OUTPUT inserted.*
      VALUES ($1, $2, $3, $4, $5, $6)
    `;
    const values = [ticket_id, name, department, issue_title, description, priority];
    const result = await pool.query(query, values);
    return result.rows[0];
  },

  async findAll({ status, priority, search, limit = 50, offset = 0 }) {
    let query = `
      SELECT t.*, 
        u.username as assigned_username,
        u.full_name as assigned_name
      FROM tickets t
      LEFT JOIN users u ON t.assigned_to = u.id
      WHERE 1=1
    `;
    const values = [];
    let paramCount = 0;

    if (status) {
      paramCount++;
      query += ` AND t.status = $${paramCount}`;
      values.push(status);
    }

    if (priority) {
      paramCount++;
      query += ` AND t.priority = $${paramCount}`;
      values.push(priority);
    }

    if (search) {
      paramCount++;
      query += ` AND (t.ticket_id LIKE $${paramCount} OR t.issue_title LIKE $${paramCount})`;
      values.push(`%${search}%`);
    }

    query += ` ORDER BY t.created_at DESC OFFSET $${++paramCount} ROWS FETCH NEXT $${++paramCount} ROWS ONLY`;
    values.push(offset, limit);

    const result = await pool.query(query, values);
    return result.rows;
  },

  async findById(id) {
    const query = `
      SELECT t.*, 
        u.username as assigned_username,
        u.full_name as assigned_name
      FROM tickets t
      LEFT JOIN users u ON t.assigned_to = u.id
      WHERE t.id = $1
    `;
    const result = await pool.query(query, [id]);
    return result.rows[0];
  },

  async findByTicketId(ticketId) {
    const query = `
      SELECT t.*, 
        u.username as assigned_username,
        u.full_name as assigned_name
      FROM tickets t
      LEFT JOIN users u ON t.assigned_to = u.id
      WHERE t.ticket_id = $1
    `;
    const result = await pool.query(query, [ticketId]);
    return result.rows[0];
  },

  async update(id, updates) {
    const fields = [];
    const values = [];
    let paramCount = 0;

    Object.keys(updates).forEach(key => {
      if (updates[key] !== undefined) {
        paramCount++;
        fields.push(`${key} = $${paramCount}`);
        values.push(updates[key]);
      }
    });

    if (fields.length === 0) return null;

    paramCount++;
    values.push(id);

    const query = `
      UPDATE tickets 
      SET ${fields.join(', ')}, updated_at = GETDATE()
      OUTPUT inserted.*
      WHERE id = $${paramCount}
    `;

    const result = await pool.query(query, values);
    return result.rows[0];
  },

  async getStats() {
    const stats = await pool.query(`
      SELECT 
        COUNT(*) as total,
        SUM(CASE WHEN status = 'Open' THEN 1 ELSE 0 END) as open,
        SUM(CASE WHEN status = 'In Progress' THEN 1 ELSE 0 END) as in_progress,
        SUM(CASE WHEN status = 'Resolved' THEN 1 ELSE 0 END) as resolved,
        SUM(CASE WHEN status = 'Closed' THEN 1 ELSE 0 END) as closed
      FROM tickets
    `);

    const daily = await pool.query(`
      SELECT CAST(created_at AS DATE) as date, COUNT(*) as count
      FROM tickets
      WHERE created_at >= DATEADD(day, -30, GETDATE())
      GROUP BY CAST(created_at AS DATE)
      ORDER BY date
    `);

    const byStaff = await pool.query(`
      SELECT 
        u.full_name,
        COUNT(t.id) as ticket_count
      FROM users u
      LEFT JOIN tickets t ON u.id = t.assigned_to
      WHERE u.role = 'IT'
      GROUP BY u.id, u.full_name
    `);

    return {
      overview: stats.rows[0],
      daily: daily.rows,
      byStaff: byStaff.rows
    };
  }
};

export const TicketImage = {
  async create(ticketId, filePath) {
    const query = `
      INSERT INTO ticket_images (ticket_id, file_path)
      OUTPUT inserted.*
      VALUES ($1, $2)
    `;
    const result = await pool.query(query, [ticketId, filePath]);
    return result.rows[0];
  },

  async findByTicketId(ticketId) {
    const query = `SELECT * FROM ticket_images WHERE ticket_id = $1`;
    const result = await pool.query(query, [ticketId]);
    return result.rows;
  }
};

export const ChatMessage = {
  async create({ ticket_id, sender_type, sender_name, user_id, message, file_path }) {
    const query = `
      INSERT INTO chat_messages (ticket_id, sender_type, sender_name, user_id, message, file_path)
      OUTPUT inserted.*
      VALUES ($1, $2, $3, $4, $5, $6)
    `;
    const values = [ticket_id, sender_type, sender_name, user_id, message, file_path];
    const result = await pool.query(query, values);
    return result.rows[0];
  },

  async findByTicketId(ticketId) {
    const query = `
      SELECT cm.*, u.full_name as staff_name
      FROM chat_messages cm
      LEFT JOIN users u ON cm.user_id = u.id
      WHERE cm.ticket_id = $1
      ORDER BY cm.created_at ASC
    `;
    const result = await pool.query(query, [ticketId]);
    return result.rows;
  }
};

export const User = {
  async findByUsername(username) {
    const query = `SELECT * FROM users WHERE username = $1`;
    const result = await pool.query(query, [username]);
    return result.rows[0];
  },

  async findById(id) {
    const query = `SELECT id, username, role, email, full_name, created_at FROM users WHERE id = $1`;
    const result = await pool.query(query, [id]);
    return result.rows[0];
  },

  async findAllITStaff() {
    const query = `SELECT id, username, full_name, email FROM users WHERE role = 'IT'`;
    const result = await pool.query(query);
    return result.rows;
  }
};
