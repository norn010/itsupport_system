import db from '../config/database.js';

export const logActivity = async (ticket_id, action_type, description, reqUser) => {
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

    const query = `
      INSERT INTO ticket_activity_logs 
      (ticket_id, action_type, description, actor_type, actor_id, actor_name) 
      VALUES ($1, $2, $3, $4, $5, $6)
    `;
    
    await db.query(query, [ticket_id, action_type, description, actorType, actorId, actorName]);
  } catch (error) {
    console.error('Activity Logger Error:', error);
  }
};
