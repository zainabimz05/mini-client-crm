import { query } from '../config/database.js';

// Get all clients (supports search and status filter)
export const getClients = async (req, res, next) => {
  try {
    const { search, status } = req.query;
    
    let sql = 'SELECT * FROM clients';
    const params = [];
    const conditions = [];

    if (search && search.trim() !== '') {
      conditions.push('(full_name LIKE ? OR company LIKE ?)');
      params.push(`%${search.trim()}%`, `%${search.trim()}%`);
    }

    if (status && status.trim() !== '') {
      conditions.push('lead_status = ?');
      params.push(status.trim());
    }

    if (conditions.length > 0) {
      sql += ' WHERE ' + conditions.join(' AND ');
    }

    // Sort by most recently created
    sql += ' ORDER BY created_at DESC';

    const clients = await query.all(sql, params);
    res.json(clients);
  } catch (err) {
    next(err);
  }
};

// Get single client by ID (with their associated follow-ups)
export const getClientById = async (req, res, next) => {
  try {
    const { id } = req.params;
    
    const client = await query.get('SELECT * FROM clients WHERE id = ?', [id]);
    
    if (!client) {
      return res.status(404).json({ error: 'Client not found' });
    }

    // Fetch followups for this client
    const followups = await query.all(
      'SELECT * FROM followups WHERE client_id = ? ORDER BY followup_date DESC, followup_time DESC',
      [id]
    );

    res.json({
      ...client,
      followups
    });
  } catch (err) {
    next(err);
  }
};

// Create a new client
export const createClient = async (req, res, next) => {
  try {
    const { full_name, company, email, phone, lead_status, notes } = req.body;

    // Check if email already exists
    const existingClient = await query.get('SELECT id FROM clients WHERE email = ?', [email]);
    if (existingClient) {
      return res.status(400).json({ error: 'A client with this email already exists' });
    }

    const sql = `
      INSERT INTO clients (full_name, company, email, phone, lead_status, notes)
      VALUES (?, ?, ?, ?, ?, ?)
    `;
    const params = [
      full_name.trim(),
      company.trim(),
      email.trim(),
      phone ? phone.trim() : null,
      lead_status.trim(),
      notes ? notes.trim() : null
    ];

    const result = await query.run(sql, params);
    
    // Retrieve the created client
    const newClient = await query.get('SELECT * FROM clients WHERE id = ?', [result.id]);
    res.status(201).json(newClient);
  } catch (err) {
    next(err);
  }
};

// Update an existing client
export const updateClient = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { full_name, company, email, phone, lead_status, notes } = req.body;

    // Check if client exists
    const client = await query.get('SELECT id FROM clients WHERE id = ?', [id]);
    if (!client) {
      return res.status(404).json({ error: 'Client not found' });
    }

    // If email is being changed, check for conflicts
    if (email) {
      const emailConflict = await query.get(
        'SELECT id FROM clients WHERE email = ? AND id != ?',
        [email, id]
      );
      if (emailConflict) {
        return res.status(400).json({ error: 'Another client is already registered with this email' });
      }
    }

    const sql = `
      UPDATE clients 
      SET full_name = ?, company = ?, email = ?, phone = ?, lead_status = ?, notes = ?
      WHERE id = ?
    `;
    const params = [
      full_name.trim(),
      company.trim(),
      email.trim(),
      phone ? phone.trim() : null,
      lead_status.trim(),
      notes ? notes.trim() : null,
      id
    ];

    await query.run(sql, params);
    
    // Retrieve updated client
    const updatedClient = await query.get('SELECT * FROM clients WHERE id = ?', [id]);
    res.json(updatedClient);
  } catch (err) {
    next(err);
  }
};

// Delete a client
export const deleteClient = async (req, res, next) => {
  try {
    const { id } = req.params;

    const client = await query.get('SELECT id FROM clients WHERE id = ?', [id]);
    if (!client) {
      return res.status(404).json({ error: 'Client not found' });
    }

    // Cascade delete is supported by SQLite foreign keys (PRAGMA foreign_keys = ON)
    await query.run('DELETE FROM clients WHERE id = ?', [id]);
    
    res.json({ message: 'Client and all associated follow-ups deleted successfully' });
  } catch (err) {
    next(err);
  }
};
