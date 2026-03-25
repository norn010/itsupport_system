import pool from '../config/database.js';

export const Ticket = {
  async create({ ticket_id, name, department, issue_title, description, priority, category_id, subcategory_id, due_date, asset_id }) {
    const query = `
      INSERT INTO tickets (ticket_id, name, department, issue_title, description, priority, category_id, subcategory_id, due_date, asset_id)
      OUTPUT inserted.*
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
    `;
    const values = [ticket_id, name, department, issue_title, description, priority, category_id || null, subcategory_id || null, due_date || null, asset_id || null];
    const result = await pool.query(query, values);
    return result.rows[0];
  },

  async findAll({ status, priority, search, limit = 50, offset = 0 }) {
    let query = `
      SELECT t.*, 
        u.username as assigned_username,
        u.full_name as assigned_name,
        c.name as category_name,
        sc.name as subcategory_name
      FROM tickets t
      LEFT JOIN users u ON t.assigned_to = u.id
      LEFT JOIN categories c ON t.category_id = c.id
      LEFT JOIN subcategories sc ON t.subcategory_id = sc.id
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
        u.full_name as assigned_name,
        c.name as category_name,
        sc.name as subcategory_name,
        f.rating as feedback_rating,
        f.comment as feedback_comment,
        a.asset_code as asset_code,
        a.name as asset_name,
        a.brand as asset_brand,
        a.model as asset_model,
        a.serial_number as asset_serial
      FROM tickets t
      LEFT JOIN users u ON t.assigned_to = u.id
      LEFT JOIN categories c ON t.category_id = c.id
      LEFT JOIN subcategories sc ON t.subcategory_id = sc.id
      LEFT JOIN ticket_feedback f ON t.ticket_id = f.ticket_id
      LEFT JOIN assets a ON t.asset_id = a.id
      WHERE t.id = $1
    `;
    const result = await pool.query(query, [id]);
    return result.rows[0];
  },

  async findByTicketId(ticketId) {
    const query = `
      SELECT t.*, 
        u.username as assigned_username,
        u.full_name as assigned_name,
        c.name as category_name,
        sc.name as subcategory_name,
        f.rating as feedback_rating,
        f.comment as feedback_comment,
        a.asset_code as asset_code,
        a.name as asset_name,
        a.brand as asset_brand,
        a.model as asset_model,
        a.serial_number as asset_serial
      FROM tickets t
      LEFT JOIN users u ON t.assigned_to = u.id
      LEFT JOIN categories c ON t.category_id = c.id
      LEFT JOIN subcategories sc ON t.subcategory_id = sc.id
      LEFT JOIN ticket_feedback f ON t.ticket_id = f.ticket_id
      LEFT JOIN assets a ON t.asset_id = a.id
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

  async getDepartments() {
    const query = `SELECT DISTINCT department FROM tickets WHERE department IS NOT NULL AND department <> '' ORDER BY department ASC`;
    const result = await pool.query(query);
    return result.rows;
  },

  async getStats() {
    const stats = await pool.query(`
      SELECT 
        COUNT(*) as total,
        SUM(CASE WHEN status = 'Open' THEN 1 ELSE 0 END) as [open],
        SUM(CASE WHEN status = 'In Progress' THEN 1 ELSE 0 END) as in_progress,
        SUM(CASE WHEN status = 'Resolved' THEN 1 ELSE 0 END) as resolved,
        SUM(CASE WHEN status = 'Closed' THEN 1 ELSE 0 END) as [closed]
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

    const byCategory = await pool.query(`
      SELECT 
        c.name as name,
        COUNT(t.id) as value
      FROM tickets t
      JOIN categories c ON t.category_id = c.id
      GROUP BY c.id, c.name
    `);

    const slaMetrics = await pool.query(`
      SELECT 
        SUM(CASE WHEN status IN ('Resolved', 'Closed') AND (resolved_at <= due_date OR due_date IS NULL) THEN 1 ELSE 0 END) as met,
        SUM(CASE WHEN status IN ('Resolved', 'Closed') AND resolved_at > due_date THEN 1 ELSE 0 END) as missed,
        SUM(CASE WHEN status NOT IN ('Resolved', 'Closed') AND GETDATE() > due_date THEN 1 ELSE 0 END) as overdue_active
      FROM tickets
    `);

    return {
      overview: stats.rows[0],
      daily: daily.rows,
      byStaff: byStaff.rows,
      byCategory: byCategory.rows,
      slaMetrics: slaMetrics.rows[0]
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
    const query = `SELECT id, username, full_name, role, email FROM users WHERE role IN ('IT', 'MANAGER')`;
    const result = await pool.query(query);
    return result.rows;
  }
};

export const Category = {
  async findAll() {
    const query = `SELECT * FROM categories WHERE is_active = 1 ORDER BY name ASC`;
    const result = await pool.query(query);
    return result.rows;
  },

  async findSubcategories(categoryId) {
    const query = `SELECT * FROM subcategories WHERE category_id = $1 AND is_active = 1 ORDER BY name ASC`;
    const result = await pool.query(query, [categoryId]);
    return result.rows;
  },

  async findOrCreateByName(name) {
    if (!name) return null;
    const findQuery = `SELECT * FROM categories WHERE name = $1`;
    const findResult = await pool.query(findQuery, [name]);
    if (findResult.rows.length > 0) return findResult.rows[0];

    const createQuery = `INSERT INTO categories (name) OUTPUT inserted.* VALUES ($1)`;
    const createResult = await pool.query(createQuery, [name]);
    return createResult.rows[0];
  },

  async findOrCreateSubcategoryByName(categoryId, name) {
    if (!name || !categoryId) return null;
    const findQuery = `SELECT * FROM subcategories WHERE category_id = $1 AND name = $2`;
    const findResult = await pool.query(findQuery, [categoryId, name]);
    if (findResult.rows.length > 0) return findResult.rows[0];

    const createQuery = `INSERT INTO subcategories (category_id, name) OUTPUT inserted.* VALUES ($1, $2)`;
    const createResult = await pool.query(createQuery, [categoryId, name]);
    return createResult.rows[0];
  }
};

export const UserNotification = {
  async create({ user_id, type, title, message, related_ticket_id }) {
    const query = `
      INSERT INTO user_notifications (user_id, type, title, message, related_ticket_id, is_read)
      OUTPUT inserted.*
      VALUES ($1, $2, $3, $4, $5, 0)
    `;
    const result = await pool.query(query, [user_id, type, title, message, related_ticket_id || null]);
    return result.rows[0];
  },

  async findByUserId(userId) {
    const query = `
      SELECT * FROM user_notifications 
      WHERE user_id = $1 
      ORDER BY created_at DESC 
      OFFSET 0 ROWS FETCH NEXT 50 ROWS ONLY
    `;
    const result = await pool.query(query, [userId]);
    return result.rows;
  },

  async markAsRead(notificationId, userId) {
    const query = `
      UPDATE user_notifications 
      SET is_read = 1 
      WHERE id = $1 AND user_id = $2
    `;
    await pool.query(query, [notificationId, userId]);
  },

  async markAllAsRead(userId) {
    const query = `
      UPDATE user_notifications 
      SET is_read = 1 
      WHERE user_id = $1 AND is_read = 0
    `;
    await pool.query(query, [userId]);
  }
};
