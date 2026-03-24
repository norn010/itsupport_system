import db from '../config/database.js';

export const getTicketActivity = async (req, res) => {
  try {
    const { ticketId } = req.params;
    const query = `
      SELECT * FROM ticket_activity_logs 
      WHERE ticket_id = $1 
      ORDER BY created_at DESC
    `;
    const result = await db.query(query, [ticketId]);
    res.json(result.rows);
  } catch (error) {
    console.error('Get ticket activity error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};
