
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

    // 1. Check raw count for the day using DATE()
    // Need to use snake_case column names
    const [rows] = await conn.execute(`
        SELECT id, start_time, stop_time, cause_code, equipe
        FROM stops
        WHERE DATE(start_time) = '2026-01-23'
    `);

    console.log(`Found ${rows.length} stops via DATE(start_time) = '2026-01-23'`);
    if (rows.length > 0) {
        console.log('Sample row:', rows[0]);
    }

    // 2. Check range query used by findAll
    const start = '2026-01-23 00:00:00';
    const end = '2026-01-23 23:59:59';
    const [rangeRows] = await conn.execute(`
        SELECT id, start_time 
        FROM stops 
        WHERE start_time >= ? AND start_time <= ?
    `, [start, end]);

    console.log(`Found ${rangeRows.length} stops via range ${start} to ${end}`);

    // 3. Diagnostic output
    if (rangeRows.length === 0 && rows.length > 0) {
        console.log('Mismatch detected! Raw start_times from DATE() query:');
        rows.forEach(r => console.log(r.start_time));

        console.log('Checking if they are shifted?');
        // Check timezone?
        const [timeRows] = await conn.execute("SELECT NOW(), @@global.time_zone, @@session.time_zone");
        console.log('DB Timezone info:', timeRows[0]);
    }

    await conn.end();
}

main().catch(err => {
    console.error(err);
    process.exit(1);
});
