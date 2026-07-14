import { query } from '../config/database.js';

// Get all follow-ups (supports status filtering)
export const getFollowups = async (req, res, next) => {
  try {
    const { status } = req.query;
    
    let sql = 'SELECT * FROM followups';
    const params = [];

    if (status && status.trim() !== '') {
      sql += ' WHERE status = ?';
      params.push(status.trim());
    }

    // Order by date and time (nearest first)
    sql += ' ORDER BY followup_date ASC, followup_time ASC';

    const followups = await query.all(sql, params);
    res.json(followups);
  } catch (err) {
    next(err);
  }
};

// Get single follow-up by ID
export const getFollowupById = async (req, res, next) => {
  try {
    const { id } = req.params;
    
    const followup = await query.get('SELECT * FROM followups WHERE id = ?', [id]);
    
    if (!followup) {
      return res.status(404).json({ error: 'Follow-up not found' });
    }

    res.json(followup);
  } catch (err) {
    next(err);
  }
};

// Create a new follow-up
export const createFollowup = async (req, res, next) => {
  try {
    const { client_id, followup_date, followup_time, purpose, status, remarks } = req.body;

    // Check if referenced client exists
    const client = await query.get('SELECT id FROM clients WHERE id = ?', [client_id]);
    if (!client) {
      return res.status(400).json({ error: `Client with ID ${client_id} does not exist` });
    }

    const sql = `
      INSERT INTO followups (client_id, followup_date, followup_time, purpose, status, remarks)
      VALUES (?, ?, ?, ?, ?, ?)
    `;
    const params = [
      client_id,
      followup_date.trim(),
      followup_time ? followup_time.trim() : null,
      purpose.trim(),
      status.trim(),
      remarks ? remarks.trim() : null
    ];

    const result = await query.run(sql, params);
    
    const newFollowup = await query.get('SELECT * FROM followups WHERE id = ?', [result.id]);
    res.status(201).json(newFollowup);
  } catch (err) {
    next(err);
  }
};

// Update an existing follow-up
export const updateFollowup = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { client_id, followup_date, followup_time, purpose, status, remarks } = req.body;

    // Check if follow-up exists
    const followup = await query.get('SELECT id FROM followups WHERE id = ?', [id]);
    if (!followup) {
      return res.status(404).json({ error: 'Follow-up not found' });
    }

    // Check if referenced client exists
    const client = await query.get('SELECT id FROM clients WHERE id = ?', [client_id]);
    if (!client) {
      return res.status(400).json({ error: `Client with ID ${client_id} does not exist` });
    }

    const sql = `
      UPDATE followups 
      SET client_id = ?, followup_date = ?, followup_time = ?, purpose = ?, status = ?, remarks = ?, updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `;
    const params = [
      client_id,
      followup_date.trim(),
      followup_time ? followup_time.trim() : null,
      purpose.trim(),
      status.trim(),
      remarks ? remarks.trim() : null,
      id
    ];

    await query.run(sql, params);
    
    const updatedFollowup = await query.get('SELECT * FROM followups WHERE id = ?', [id]);
    res.json(updatedFollowup);
  } catch (err) {
    next(err);
  }
};

// Delete a follow-up
export const deleteFollowup = async (req, res, next) => {
  try {
    const { id } = req.params;

    const followup = await query.get('SELECT id FROM followups WHERE id = ?', [id]);
    if (!followup) {
      return res.status(404).json({ error: 'Follow-up not found' });
    }

    await query.run('DELETE FROM followups WHERE id = ?', [id]);
    res.json({ message: 'Follow-up deleted successfully' });
  } catch (err) {
    next(err);
  }
};
