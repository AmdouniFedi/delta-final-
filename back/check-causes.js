const mysql = require('mysql2/promise');
(async () => {
    try {
        const conn = await mysql.createConnection({
            host: 'localhost',
            user: 'root',
            password: 'isetiset2023',
            database: 'Dashboardv2'
        });
        const [rows] = await conn.execute('SELECT COUNT(*) as count FROM causes');
        console.log('Count:', rows[0].count);
        await conn.end();
    } catch (err) {
        console.error(err);
    }
})();
