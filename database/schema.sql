PRAGMA foreign_keys = ON;

CREATE TABLE IF NOT EXISTS clients (
    id INTEGER PRIMARY KEY AUTOINCREMENT,

    full_name TEXT NOT NULL,

    company TEXT NOT NULL,

    email TEXT UNIQUE NOT NULL,

    phone TEXT,

    lead_status TEXT NOT NULL
        CHECK(lead_status IN ('New', 'Contacted', 'Qualified', 'Proposal Sent', 'Won', 'Lost')),

    notes TEXT,

    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS followups (

    id INTEGER PRIMARY KEY AUTOINCREMENT,

    client_id INTEGER NOT NULL,

    followup_date DATE NOT NULL,

    followup_time TIME,

    purpose TEXT NOT NULL,

    status TEXT NOT NULL
        CHECK(status IN ('Pending', 'Completed','Cancelled')),

    remarks TEXT,

    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,

    FOREIGN KEY(client_id)
        REFERENCES clients(id)
        ON DELETE CASCADE
        ON UPDATE CASCADE
);