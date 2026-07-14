PRAGMA foreign_keys = ON;

DROP TABLE IF EXISTS followups;
DROP TABLE IF EXISTS clients;

CREATE TABLE clients (
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

CREATE TABLE followups (

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