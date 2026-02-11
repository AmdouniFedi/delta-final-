const mysql = require('mysql2/promise');
(async () => {
    try {
        const conn = await mysql.createConnection({
            host: 'localhost',
            user: 'root',
            password: 'isetiset2023',
            database: 'Dashboardv2'
        });

        // Simulating the query for a specific day
        const fromDt = '2026-01-23 00:00:00';
        const toDt = '2026-01-23 23:59:59';

        const sql = `
            SELECT c.code as causeCode, c.name as causeName,
            SUM(IFNULL(TIMESTAMPDIFF(SECOND, s.start_time, IFNULL(s.stop_time, NOW())), 0)) as totalDowntimeSeconds
            FROM causes c
            LEFT JOIN stops s ON s.cause_code = c.code 
                AND s.start_time >= ? 
                AND s.start_time <= ?
            GROUP BY c.code, c.name
            ORDER BY totalDowntimeSeconds DESC
        `;

        const [rows] = await conn.execute(sql, [fromDt, toDt]);
        console.log('Results:', rows);
        await conn.end();
    } catch (err) {
        console.error(err);
    }
})();
