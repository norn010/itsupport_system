import pool from '../config/database.js';

export const Ticket = {
  async create({ ticket_id, name, department, issue_title, description, priority }) {
    const query = `
      INSERT INTO tickets (ticket_id, name, department, issue_title, description, priority)
      VALUES ($1, $2, $3, $4, $5, $6)
      RETURNING *
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
      query += ` AND (t.ticket_id ILIKE $${paramCount} OR t.issue_title ILIKE $${paramCount})`;
      values.push(`%${search}%`);
    }

    query += ` ORDER BY t.created_at DESC LIMIT $${++paramCount} OFFSET $${++paramCount}`;
    values.push(limit, offset);

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
      SET ${fields.join(', ')}, updated_at = CURRENT_TIMESTAMP
      WHERE id = $${paramCount}
      RETURNING *
    `;

    const result = await pool.query(query, values);
    return result.rows[0];
  },

  async getStats() {
    const stats = await pool.query(`
      SELECT 
        COUNT(*) as total,
        COUNT(*) FILTER (WHERE status = 'Open') as open,
        COUNT(*) FILTER (WHERE status = 'In Progress') as in_progress,
        COUNT(*) FILTER (WHERE status = 'Resolved') as resolved,
        COUNT(*) FILTER (WHERE status = 'Closed') as closed
      FROM tickets
    `);

    const daily = await pool.query(`
      SELECT DATE(created_at) as date, COUNT(*) as count
      FROM tickets
      WHERE created_at >= CURRENT_DATE - INTERVAL '30 days'
      GROUP BY DATE(created_at)
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
      VALUES ($1, $2)
      RETURNING *
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
  async create({ ticket_id, sender_type, sender_name, user_id, message }) {
    const query = `
      INSERT INTO chat_messages (ticket_id, sender_type, sender_name, user_id, message)
      VALUES ($1, $2, $3, $4, $5)
      RETURNING *
    `;
    const values = [ticket_id, sender_type, sender_name, user_id, message];
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
