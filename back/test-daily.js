const mysql = require('mysql2/promise');
(async () => {
    try {
        const conn = await mysql.createConnection({
            host: 'localhost',
            user: 'root',
            password: 'isetiset2023',
            database: 'Dashboardv2'
        });
        const sql = `
      SELECT 
        CAST(DATE(s.start_time) AS CHAR) as day,
        COUNT(*) as stopsCount,
        SUM(TIMESTAMPDIFF(SECOND, s.start_time, IFNULL(s.stop_time, NOW()))) as totalDowntimeSeconds,
        SUM(CASE WHEN c.affect_trs = 1 THEN TIMESTAMPDIFF(SECOND, s.start_time, IFNULL(s.stop_time, NOW())) ELSE 0 END) as trsDowntimeSeconds
      FROM stops s
      LEFT JOIN causes c ON c.code = s.cause_code
      GROUP BY CAST(DATE(s.start_time) AS CHAR)
      ORDER BY day DESC;
    `;
        const [rows] = await conn.execute(sql);
        console.log('Daily Summary Results:', JSON.stringify(rows, null, 2));
        await conn.end();
    } catch (err) {
        console.error('DATABASE_ERROR:', err.message);
    }
})();
