const mysql = require('mysql2');
const connection = mysql.createConnection({
    host: 'localhost',
    user: 'root',
    password: 'isetiset2023',
    database: 'dashboardv2'
});

connection.connect();

connection.query('SELECT id, code, name, isActive FROM causes', function (error, results, fields) {
    if (error) throw error;
    console.log(JSON.stringify(results, null, 2));
});

connection.end();
