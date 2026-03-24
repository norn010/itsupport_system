import db from '../config/database.js';

export const submitFeedback = async (req, res) => {
  try {
    const { ticketId } = req.params;
    const { rating, comment } = req.body;

    if (!rating || rating < 1 || rating > 5) {
      return res.status(400).json({ message: 'Valid rating between 1 and 5 is required' });
    }

    const query = `
      INSERT INTO ticket_feedback (ticket_id, rating, comment)
      OUTPUT inserted.*
      VALUES ($1, $2, $3)
    `;
    
    const result = await db.query(query, [ticketId, rating, comment]);

    res.status(201).json({
      message: 'Feedback submitted successfully',
      feedback: result.rows[0]
    });
  } catch (error) {
    if (error.message && error.message.includes('UNIQUE KEY')) {
      return res.status(400).json({ message: 'Feedback already submitted for this ticket' });
    }
    console.error('Submit feedback error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};
