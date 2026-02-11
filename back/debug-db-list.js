
const mysql = require('mysql2/promise');

async function main() {
    const conn = await mysql.createConnection({
        host: 'localhost',
        port: 3306,
        user: 'root',
        password: 'isetiset2023',
        database: 'Dashboardv2'
    });

    console.log('Connected to DB');

    const [rows] = await conn.execute(`
        SELECT id, start_time, stop_time
        FROM stops
        ORDER BY start_time DESC
        LIMIT 10
    `);

    console.log('Latest 10 stops:');
    rows.forEach(r => {
        console.log(`ID: ${r.id}, Start: ${r.start_time}, Stop: ${r.stop_time}`);
    });

    // Also check group by query from the service to see what it produces
    const [summaryRows] = await conn.execute(`
        SELECT DATE(start_time) as day, COUNT(*) as cnt 
        FROM stops 
        GROUP BY DATE(start_time) 
        ORDER BY day DESC
    `);
    console.log('Summary Group By Results:', summaryRows);

    await conn.end();
}

main().catch(err => {
    console.error(err);
    process.exit(1);
});
