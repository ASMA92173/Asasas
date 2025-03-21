const mysql = require('mysql2');

const connection = mysql.createConnection({
    host: 'b1bbulzv8imjr4skovy8-mysql.services.clever-cloud.com',
    user: 'rb1bbulzv8imjr4skovy8oot',
    password: 'uyqzgtti0o1fdpyq',
    database: 'IeOWmklFF90I0lLPEdoU'
});

connection.connect(error => {
    if (error) {
        console.error('Error connecting to the database:', error);
        throw error;
    }
    console.log("Successfully connected to the database.");
});

// Add error event handler
connection.on('error', function(err) {
    console.error('Database error:', err);
    if (err.code === 'PROTOCOL_CONNECTION_LOST') {
        console.error('Database connection was closed.');
    } else if (err.code === 'ER_CON_COUNT_ERROR') {
        console.error('Database has too many connections.');
    } else if (err.code === 'ECONNREFUSED') {
        console.error('Database connection was refused.');
    }
});

module.exports = connection;

