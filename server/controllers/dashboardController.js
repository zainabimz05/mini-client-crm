import { query } from '../config/database.js';

export const getDashboardStats = async (req, res, next) => {
  try {
    // 1. Total number of clients
    const totalClientsResult = await query.get('SELECT COUNT(*) AS total FROM clients');
    const totalClients = totalClientsResult ? totalClientsResult.total : 0;

    // 2. Clients by lead stage (status)
    const stageStats = await query.all(`
      SELECT lead_status, COUNT(*) AS count 
      FROM clients 
      GROUP BY lead_status
    `);
    
    // Format status stats into an easy-to-use object (e.g. { "Lead": 5, "Contacted": 2 })
    const clientStages = {};
    stageStats.forEach(item => {
      clientStages[item.lead_status] = item.count;
    });

    // 3. Total pending follow-ups
    const pendingFollowupsResult = await query.get(
      "SELECT COUNT(*) AS total FROM followups WHERE status = 'Pending'"
    );
    const totalPendingFollowups = pendingFollowupsResult ? pendingFollowupsResult.total : 0;

    // 4. Upcoming / Today's pending followups (limit 10)
    // Using SQLite's DATE('now') to fetch follow-ups on or after today
    const upcomingFollowups = await query.all(`
      SELECT f.*, c.full_name AS client_name, c.company AS client_company, c.email AS client_email
      FROM followups f
      JOIN clients c ON f.client_id = c.id
      WHERE f.status = 'Pending' AND f.followup_date >= DATE('now')
      ORDER BY f.followup_date ASC, f.followup_time ASC
      LIMIT 10
    `);

    res.json({
      stats: {
        totalClients,
        clientStages,
        totalPendingFollowups
      },
      reminders: upcomingFollowups
    });
  } catch (err) {
    next(err);
  }
};
