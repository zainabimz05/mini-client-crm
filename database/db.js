const sqlite3 = require("sqlite3").verbose();
const path = require("path");

const db = new sqlite3.Database(
    path.join(__dirname, "crm.db"),
    (err) => {
        if (err) {
            console.error(err.message);
        } else {
            console.log("Connected to CRM Database");
        }
    }
);

module.exports = db;