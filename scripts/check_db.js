const Database = require('better-sqlite3');
const path = require('path');

const DB_PATH = path.join(__dirname, '..', 'server/aihub_datasets.db');
const db = new Database(DB_PATH);

try {
    const counts = db.prepare('SELECT dataset_id, COUNT(*) as count FROM items GROUP BY dataset_id').all();
    console.log('--- aihub_datasets.db items count ---');
    counts.forEach(row => {
        console.log(`Dataset ID: ${row.dataset_id}, Count: ${row.count}`);
    });

    const total = db.prepare('SELECT COUNT(*) as total FROM items').get();
    console.log(`Total items: ${total.total}`);
} catch (e) {
    console.error('Error reading database:', e.message);
} finally {
    db.close();
}
