import db from '../config/database.js';

export const logActivity = async (ticket_id, action_type, description, reqUser, metadata = {}) => {
  try {
    let actorType = 'guest';
    let actorId = null;
    let actorName = 'System/Guest';

    if (reqUser) {
      actorType = reqUser.role || 'staff';
      actorId = reqUser.id;
      actorName = reqUser.full_name || reqUser.username || 'Staff';
    } else if (action_type === 'ticket_created') {
      actorType = 'guest';
      actorName = 'Public User';
    }

    const { device_name, device_model, device_asset_code, browser_info, ip_address, comp_name } = metadata;

    const query = `
      INSERT INTO ticket_activity_logs 
      (ticket_id, action_type, description, actor_type, actor_id, actor_name, device_name, device_model, device_asset_code, browser_info, ip_address, comp_name) 
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
    `;
    
    await db.query(query, [
      ticket_id, 
      action_type, 
      description, 
      actorType, 
      actorId, 
      actorName, 
      device_name || null, 
      device_model || null, 
      device_asset_code || null, 
      browser_info || null,
      ip_address || null,
      comp_name || null
    ]);
  } catch (error) {
    console.error('Activity Logger Error:', error);
  }
};
