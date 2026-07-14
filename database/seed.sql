INSERT INTO clients
(full_name, company, email, phone, lead_status, notes)

VALUES

('Ali Khan', 'ABC Technologies', 'ali@abc.com', '03001234567', 'New', 'Interested in AI Automation'),

('Sara Ahmed', 'Digital Hub', 'sara@hub.com', '03111234567', 'Qualified', 'Looking for CRM'),

('Hamza Malik', 'Tech Solutions', 'hamza@tech.com', '03211234567', 'Proposal Sent', 'Waiting for approval'),

('Ahmed Raza', 'Creative Minds', 'ahmed@cm.com', '03331234567', 'Won', 'Project Started');


INSERT INTO followups
(client_id,followup_date,followup_time,purpose,status,remarks)

VALUES

(1,'2026-07-20','10:00', 'Discovery Call', 'Pending', 'Discuss requirements'),

(2,'2026-07-16','14:30', 'CRM Demo', 'Pending', 'Online meeting'),

(3,'2026-07-18','12:00', 'Proposal Review', 'Pending', 'Waiting for feedback'),

(4,'2026-07-14','11:00', 'Kickoff Meeting', 'Completed', 'Project started');