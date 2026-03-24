import db from '../config/database.js';

export const getNotes = async (req, res) => {
  try {
    const { ticketId } = req.params;
    const query = `
      SELECT n.*, u.full_name as author_name, u.role as author_role
      FROM ticket_internal_notes n
      JOIN users u ON n.created_by = u.id
      WHERE n.ticket_id = $1
      ORDER BY n.created_at DESC
    `;
    const result = await db.query(query, [ticketId]);
    res.json(result.rows);
  } catch (error) {
    console.error('Get notes error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

export const createNote = async (req, res) => {
  try {
    const { ticketId } = req.params;
    const { note } = req.body;
    
    if (!note || !note.trim()) {
      return res.status(400).json({ message: 'Note content is required' });
    }

    const query = `
      INSERT INTO ticket_internal_notes (ticket_id, note, created_by)
      OUTPUT inserted.*
      VALUES ($1, $2, $3)
    `;
    const result = await db.query(query, [ticketId, note, req.user.id]);
    
    res.status(201).json({
      message: 'Note added successfully',
      note: result.rows[0]
    });
  } catch (error) {
    console.error('Create note error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

export const deleteNote = async (req, res) => {
  try {
    const { id } = req.params;
    // Check if the note belongs to the user or if user is manager
    const checkQuery = `SELECT * FROM ticket_internal_notes WHERE id = $1`;
    const noteRow = await db.query(checkQuery, [id]);
    
    if (noteRow.rows.length === 0) {
      return res.status(404).json({ message: 'Note not found' });
    }

    if (noteRow.rows[0].created_by !== req.user.id && req.user.role !== 'MANAGER') {
      return res.status(403).json({ message: 'Forbidden' });
    }

    await db.query(`DELETE FROM ticket_internal_notes WHERE id = $1`, [id]);
    
    res.json({ message: 'Note deleted successfully' });
  } catch (error) {
    console.error('Delete note error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};
