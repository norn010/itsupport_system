import pool from '../config/database.js';

// ===========================================================================
// ASSET MODEL
// ===========================================================================
export const Asset = {
  async create(data) {
    const query = `
      INSERT INTO assets (asset_code, name, category_id, subcategory_id, brand, model, serial_number,
        purchase_date, warranty_expiry, cost, vendor_id, status, location_id, assigned_to, description, image_url)
      OUTPUT inserted.*
      VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16)
    `;
    const values = [
      data.asset_code, data.name, data.category_id || null, data.subcategory_id || null,
      data.brand || null, data.model || null, data.serial_number || null,
      data.purchase_date || null, data.warranty_expiry || null, data.cost || null,
      data.vendor_id || null, data.status || 'Available', data.location_id || null,
      data.assigned_to || null, data.description || null, data.image_url || null
    ];
    const result = await pool.query(query, values);
    return result.rows[0];
  },

  async findAll({ status, category_id, location_id, search, limit = 50, offset = 0 }) {
    let query = `
      SELECT a.*,
        ac.name as category_name,
        asc2.name as subcategory_name,
        v.name as vendor_name,
        l.name as location_name,
        u.full_name as assigned_user_name
      FROM assets a
      LEFT JOIN asset_categories ac ON a.category_id = ac.id
      LEFT JOIN asset_subcategories asc2 ON a.subcategory_id = asc2.id
      LEFT JOIN vendors v ON a.vendor_id = v.id
      LEFT JOIN locations l ON a.location_id = l.id
      LEFT JOIN users u ON a.assigned_to = u.id
      WHERE 1=1
    `;
    const values = [];
    let p = 0;

    if (status) { p++; query += ` AND a.status = $${p}`; values.push(status); }
    if (category_id) { p++; query += ` AND a.category_id = $${p}`; values.push(category_id); }
    if (location_id) { p++; query += ` AND a.location_id = $${p}`; values.push(location_id); }
    if (search) {
      p++; query += ` AND (a.asset_code LIKE $${p} OR a.name LIKE $${p} OR a.serial_number LIKE $${p})`;
      values.push(`%${search}%`);
    }

    query += ` ORDER BY a.created_at DESC OFFSET $${++p} ROWS FETCH NEXT $${++p} ROWS ONLY`;
    values.push(offset, limit);

    const result = await pool.query(query, values);
    return result.rows;
  },

  async count({ status, category_id, location_id, search }) {
    let query = `SELECT COUNT(*) as total FROM assets a WHERE 1=1`;
    const values = [];
    let p = 0;
    if (status) { p++; query += ` AND a.status = $${p}`; values.push(status); }
    if (category_id) { p++; query += ` AND a.category_id = $${p}`; values.push(category_id); }
    if (location_id) { p++; query += ` AND a.location_id = $${p}`; values.push(location_id); }
    if (search) {
      p++; query += ` AND (a.asset_code LIKE $${p} OR a.name LIKE $${p} OR a.serial_number LIKE $${p})`;
      values.push(`%${search}%`);
    }
    const result = await pool.query(query, values);
    return result.rows[0]?.total || 0;
  },

  async findById(id) {
    const query = `
      SELECT a.*,
        ac.name as category_name,
        asc2.name as subcategory_name,
        v.name as vendor_name,
        l.name as location_name,
        u.full_name as assigned_user_name
      FROM assets a
      LEFT JOIN asset_categories ac ON a.category_id = ac.id
      LEFT JOIN asset_subcategories asc2 ON a.subcategory_id = asc2.id
      LEFT JOIN vendors v ON a.vendor_id = v.id
      LEFT JOIN locations l ON a.location_id = l.id
      LEFT JOIN users u ON a.assigned_to = u.id
      WHERE a.id = $1
    `;
    const result = await pool.query(query, [id]);
    return result.rows[0];
  },

  async findByCode(code) {
    const query = `SELECT * FROM assets WHERE asset_code = $1`;
    const result = await pool.query(query, [code]);
    return result.rows[0];
  },

  async update(id, updates) {
    const fields = [];
    const values = [];
    let p = 0;
    const allowed = ['name','category_id','subcategory_id','brand','model','serial_number',
      'purchase_date','warranty_expiry','cost','vendor_id','status','location_id','assigned_to','description','image_url'];

    Object.keys(updates).forEach(key => {
      if (allowed.includes(key) && updates[key] !== undefined) {
        p++;
        fields.push(`${key} = $${p}`);
        let val = updates[key];
        // Convert empty strings to null for ID columns to avoid FK issues ('' becomes 0 in SQL Server)
        const idColumns = ['category_id', 'subcategory_id', 'vendor_id', 'location_id', 'assigned_to'];
        if (idColumns.includes(key) && val === '') val = null;
        values.push(val);
      }
    });
    if (fields.length === 0) return null;
    p++;
    values.push(id);
    const query = `UPDATE assets SET ${fields.join(', ')}, updated_at = GETDATE() OUTPUT inserted.* WHERE id = $${p}`;
    const result = await pool.query(query, values);
    return result.rows[0];
  },

  async delete(id) {
    await pool.query(`DELETE FROM assets WHERE id = $1`, [id]);
  },

  async getNextCode() {
    const result = await pool.query(`SELECT MAX(id) as max_id FROM assets`);
    const nextId = (result.rows[0]?.max_id || 0) + 1;
    return `AST-${String(nextId).padStart(4, '0')}`;
  },

  async getStats() {
    const total = await pool.query(`SELECT COUNT(*) as total FROM assets`);
    const byStatus = await pool.query(`
      SELECT status, COUNT(*) as count FROM assets GROUP BY status
    `);
    const byCategory = await pool.query(`
      SELECT ac.name, COUNT(a.id) as count
      FROM assets a
      JOIN asset_categories ac ON a.category_id = ac.id
      GROUP BY ac.id, ac.name ORDER BY count DESC
    `);
    const byLocation = await pool.query(`
      SELECT l.name, COUNT(a.id) as count
      FROM assets a
      JOIN locations l ON a.location_id = l.id
      GROUP BY l.id, l.name ORDER BY count DESC
    `);
    const warrantyExpiring = await pool.query(`
      SELECT * FROM assets
      WHERE warranty_expiry IS NOT NULL
        AND warranty_expiry BETWEEN GETDATE() AND DATEADD(day, 30, GETDATE())
      ORDER BY warranty_expiry ASC
    `);
    const maintenanceCost = await pool.query(`
      SELECT ISNULL(SUM(cost), 0) as total_cost,
        COUNT(*) as total_records
      FROM asset_maintenance
    `);
    const topProblematic = await pool.query(`
      SELECT a.asset_code, a.name, COUNT(m.id) as issue_count
      FROM asset_maintenance m
      JOIN assets a ON m.asset_id = a.id
      GROUP BY a.id, a.asset_code, a.name
      ORDER BY issue_count DESC
      OFFSET 0 ROWS FETCH NEXT 10 ROWS ONLY
    `);
    return {
      total: total.rows[0]?.total || 0,
      byStatus: byStatus.rows,
      byCategory: byCategory.rows,
      byLocation: byLocation.rows,
      warrantyExpiring: warrantyExpiring.rows,
      maintenanceCost: maintenanceCost.rows[0],
      topProblematic: topProblematic.rows
    };
  }
};

// ===========================================================================
// ASSET ASSIGNMENT MODEL
// ===========================================================================
export const AssetAssignment = {
  async assign(data) {
    const query = `
      INSERT INTO asset_assignments (asset_id, user_id, user_name, assigned_by, note)
      OUTPUT inserted.*
      VALUES ($1,$2,$3,$4,$5)
    `;
    const result = await pool.query(query, [data.asset_id, data.user_id, data.user_name, data.assigned_by, data.note || null]);
    return result.rows[0];
  },

  async returnAsset(assignmentId) {
    const query = `
      UPDATE asset_assignments SET returned_at = GETDATE() OUTPUT inserted.*
      WHERE id = $1 AND returned_at IS NULL
    `;
    const result = await pool.query(query, [assignmentId]);
    return result.rows[0];
  },

  async findActiveByAsset(assetId) {
    const query = `
      SELECT aa.*, u.full_name as assigned_by_name
      FROM asset_assignments aa
      LEFT JOIN users u ON aa.assigned_by = u.id
      WHERE aa.asset_id = $1 AND aa.returned_at IS NULL
      ORDER BY aa.assigned_at DESC
    `;
    const result = await pool.query(query, [assetId]);
    return result.rows[0];
  },

  async findHistoryByAsset(assetId) {
    const query = `
      SELECT aa.*, u.full_name as assigned_by_name
      FROM asset_assignments aa
      LEFT JOIN users u ON aa.assigned_by = u.id
      WHERE aa.asset_id = $1
      ORDER BY aa.assigned_at DESC
    `;
    const result = await pool.query(query, [assetId]);
    return result.rows;
  }
};

// ===========================================================================
// ASSET LOG MODEL
// ===========================================================================
export const AssetLog = {
  async create(data) {
    const query = `
      INSERT INTO asset_logs (asset_id, action_type, description, actor_id, actor_name, actor_role)
      OUTPUT inserted.*
      VALUES ($1,$2,$3,$4,$5,$6)
    `;
    const result = await pool.query(query, [
      data.asset_id, data.action_type, data.description || null,
      data.actor_id || null, data.actor_name || null, data.actor_role || null
    ]);
    return result.rows[0];
  },

  async findByAsset(assetId, limit = 50) {
    const query = `
      SELECT * FROM asset_logs
      WHERE asset_id = $1
      ORDER BY created_at DESC
      OFFSET 0 ROWS FETCH NEXT $2 ROWS ONLY
    `;
    const result = await pool.query(query, [assetId, limit]);
    return result.rows;
  }
};

// ===========================================================================
// ASSET MAINTENANCE MODEL
// ===========================================================================
export const AssetMaintenance = {
  async create(data) {
    const query = `
      INSERT INTO asset_maintenance (asset_id, ticket_id, issue_description, vendor_id, cost, start_date, end_date, status, created_by)
      OUTPUT inserted.*
      VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)
    `;
    const result = await pool.query(query, [
      data.asset_id, data.ticket_id || null, data.issue_description,
      data.vendor_id || null, data.cost || null, data.start_date || null,
      data.end_date || null, data.status || 'pending', data.created_by || null
    ]);
    return result.rows[0];
  },

  async findByAsset(assetId) {
    const query = `
      SELECT m.*, v.name as vendor_name, u.full_name as created_by_name
      FROM asset_maintenance m
      LEFT JOIN vendors v ON m.vendor_id = v.id
      LEFT JOIN users u ON m.created_by = u.id
      WHERE m.asset_id = $1
      ORDER BY m.created_at DESC
    `;
    const result = await pool.query(query, [assetId]);
    return result.rows;
  },

  async update(id, updates) {
    const fields = [];
    const values = [];
    let p = 0;
    const allowed = ['issue_description','vendor_id','cost','start_date','end_date','status','ticket_id'];
    Object.keys(updates).forEach(key => {
      if (allowed.includes(key) && updates[key] !== undefined) {
        p++;
        fields.push(`${key} = $${p}`);
        values.push(updates[key]);
      }
    });
    if (fields.length === 0) return null;
    p++;
    values.push(id);
    const query = `UPDATE asset_maintenance SET ${fields.join(', ')}, updated_at = GETDATE() OUTPUT inserted.* WHERE id = $${p}`;
    const result = await pool.query(query, values);
    return result.rows[0];
  }
};

// ===========================================================================
// ASSET CATEGORY MODEL
// ===========================================================================
export const AssetCategory = {
  async findAll() {
    const result = await pool.query(`SELECT * FROM asset_categories WHERE is_active = 1 ORDER BY name`);
    return result.rows;
  },
  async findSubcategories(categoryId) {
    const result = await pool.query(`SELECT * FROM asset_subcategories WHERE category_id = $1 AND is_active = 1 ORDER BY name`, [categoryId]);
    return result.rows;
  }
};

// ===========================================================================
// VENDOR MODEL
// ===========================================================================
export const Vendor = {
  async findAll() {
    const result = await pool.query(`SELECT * FROM vendors WHERE is_active = 1 ORDER BY name`);
    return result.rows;
  },
  async findByName(name) {
    const result = await pool.query(`SELECT * FROM vendors WHERE LOWER(name) = LOWER($1)`, [name.trim()]);
    return result.rows[0];
  },
  async create(data) {
    const query = `
      INSERT INTO vendors (name, contact_person, email, phone, address, is_active)
      OUTPUT inserted.*
      VALUES ($1,$2,$3,$4,$5, 1)
    `;
    const result = await pool.query(query, [data.name.trim(), data.contact_person || null, data.email || null, data.phone || null, data.address || null]);
    return result.rows[0];
  }
};

// ===========================================================================
// LOCATION MODEL
// ===========================================================================
export const Location = {
  async findAll() {
    const result = await pool.query(`SELECT * FROM locations WHERE is_active = 1 ORDER BY name`);
    return result.rows;
  },
  async findByName(name) {
    const result = await pool.query(`SELECT * FROM locations WHERE LOWER(name) = LOWER($1)`, [name.trim()]);
    return result.rows[0];
  },
  async create(data) {
    const query = `
      INSERT INTO locations (name, type, is_active)
      OUTPUT inserted.*
      VALUES ($1, $2, 1)
    `;
    const result = await pool.query(query, [data.name.trim(), data.type || 'office']);
    return result.rows[0];
  }
};

// ===========================================================================
// SOFTWARE LICENSE MODEL
// ===========================================================================
export const SoftwareLicense = {
  async create(data) {
    const query = `
      INSERT INTO software_licenses (name, license_key, total_seats, used_seats, expiry_date, vendor_id, cost)
      OUTPUT inserted.*
      VALUES ($1,$2,$3,$4,$5,$6,$7)
    `;
    const result = await pool.query(query, [
      data.name, data.license_key || null, data.total_seats || 1,
      0, data.expiry_date || null, data.vendor_id || null, data.cost || null
    ]);
    return result.rows[0];
  },

  async findAll() {
    const query = `
      SELECT sl.*, v.name as vendor_name
      FROM software_licenses sl
      LEFT JOIN vendors v ON sl.vendor_id = v.id
      ORDER BY sl.name
    `;
    const result = await pool.query(query);
    return result.rows;
  },

  async findById(id) {
    const query = `
      SELECT sl.*, v.name as vendor_name
      FROM software_licenses sl
      LEFT JOIN vendors v ON sl.vendor_id = v.id
      WHERE sl.id = $1
    `;
    const result = await pool.query(query, [id]);
    return result.rows[0];
  },

  async update(id, updates) {
    const fields = [];
    const values = [];
    let p = 0;
    const allowed = ['name','license_key','total_seats','expiry_date','vendor_id','cost'];
    Object.keys(updates).forEach(key => {
      if (allowed.includes(key) && updates[key] !== undefined) {
        p++;
        fields.push(`${key} = $${p}`);
        let val = updates[key];
        const idColumns = ['vendor_id', 'location_id', 'category_id'];
        if (idColumns.includes(key) && val === '') val = null;
        values.push(val);
      }
    });
    if (fields.length === 0) return null;
    p++;
    values.push(id);
    const query = `UPDATE software_licenses SET ${fields.join(', ')}, updated_at = GETDATE() OUTPUT inserted.* WHERE id = $${p}`;
    const result = await pool.query(query, values);
    return result.rows[0];
  },

  async delete(id) {
    await pool.query(`DELETE FROM software_licenses WHERE id = $1`, [id]);
  },

  async assign(data) {
    // Check seat availability
    const license = await pool.query(`SELECT * FROM software_licenses WHERE id = $1`, [data.license_id]);
    if (!license.rows[0]) throw new Error('License not found');
    if (license.rows[0].used_seats >= license.rows[0].total_seats) throw new Error('No available seats');

    const query = `
      INSERT INTO license_assignments (license_id, user_name, asset_id)
      OUTPUT inserted.*
      VALUES ($1,$2,$3)
    `;
    const result = await pool.query(query, [data.license_id, data.user_name || null, data.asset_id || null]);

    // Update used_seats count
    await pool.query(`UPDATE software_licenses SET used_seats = used_seats + 1 WHERE id = $1`, [data.license_id]);

    return result.rows[0];
  },

  async revoke(assignmentId) {
    const assignment = await pool.query(`SELECT * FROM license_assignments WHERE id = $1 AND revoked_at IS NULL`, [assignmentId]);
    if (!assignment.rows[0]) throw new Error('Assignment not found or already revoked');

    await pool.query(`UPDATE license_assignments SET revoked_at = GETDATE() WHERE id = $1`, [assignmentId]);
    await pool.query(`UPDATE software_licenses SET used_seats = CASE WHEN used_seats > 0 THEN used_seats - 1 ELSE 0 END WHERE id = $1`, [assignment.rows[0].license_id]);
  },

  async findAssignments(licenseId) {
    const query = `SELECT * FROM license_assignments WHERE license_id = $1 ORDER BY assigned_at DESC`;
    const result = await pool.query(query, [licenseId]);
    return result.rows;
  },

  async getExpiringLicenses() {
    const query = `
      SELECT * FROM software_licenses
      WHERE expiry_date IS NOT NULL
        AND expiry_date BETWEEN GETDATE() AND DATEADD(day, 30, GETDATE())
      ORDER BY expiry_date ASC
    `;
    const result = await pool.query(query);
    return result.rows;
  }
};

// ===========================================================================
// INVENTORY MODEL
// ===========================================================================
export const InventoryItem = {
  async create(data) {
    const query = `
      INSERT INTO inventory_items (name, category, quantity, reorder_level, location_id)
      OUTPUT inserted.*
      VALUES ($1,$2,$3,$4,$5)
    `;
    const result = await pool.query(query, [
      data.name, data.category || null, data.quantity || 0,
      data.reorder_level || 5, data.location_id || null
    ]);
    return result.rows[0];
  },

  async findAll() {
    const query = `
      SELECT i.*, l.name as location_name
      FROM inventory_items i
      LEFT JOIN locations l ON i.location_id = l.id
      ORDER BY i.name
    `;
    const result = await pool.query(query);
    return result.rows;
  },

  async update(id, updates) {
    const fields = [];
    const values = [];
    let p = 0;
    const allowed = ['name','category','quantity','reorder_level','location_id'];
    Object.keys(updates).forEach(key => {
      if (allowed.includes(key) && updates[key] !== undefined) {
        p++;
        fields.push(`${key} = $${p}`);
        let val = updates[key];
        const idColumns = ['location_id', 'vendor_id', 'category_id']; // InventoryItem mostly uses location_id
        if (idColumns.includes(key) && val === '') val = null;
        values.push(val);
      }
    });
    if (fields.length === 0) return null;
    p++;
    values.push(id);
    const query = `UPDATE inventory_items SET ${fields.join(', ')}, updated_at = GETDATE() OUTPUT inserted.* WHERE id = $${p}`;
    const result = await pool.query(query, values);
    return result.rows[0];
  },

  async delete(id) {
    await pool.query(`DELETE FROM inventory_items WHERE id = $1`, [id]);
  },

  async getLowStock() {
    const query = `SELECT i.*, l.name as location_name FROM inventory_items i LEFT JOIN locations l ON i.location_id = l.id WHERE i.quantity <= i.reorder_level ORDER BY i.quantity ASC`;
    const result = await pool.query(query);
    return result.rows;
  }
};

// ===========================================================================
// TICKET-ASSET LINK (extend existing ticket queries)
// ===========================================================================
export const TicketAsset = {
  async findTicketsByAsset(assetId) {
    const query = `
      SELECT t.id, t.ticket_id, t.issue_title, t.status, t.priority, t.created_at
      FROM tickets t
      WHERE t.asset_id = $1
      ORDER BY t.created_at DESC
    `;
    const result = await pool.query(query, [assetId]);
    return result.rows;
  },

  async linkAssetToTicket(ticketId, assetId) {
    const query = `UPDATE tickets SET asset_id = $1 WHERE id = $2`;
    await pool.query(query, [assetId, ticketId]);
  }
};
