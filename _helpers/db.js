const config = require('../config.json');
const mysql = require('mysql2/promise');
const { Sequelize } = require('sequelize');

module.exports = db = {};

initialize();

async function initialize() {
    try {
        // create db if it doesn't already exist
        const { host, port, user, password, database } = config.database;
        
        // First try to connect to MySQL
        console.log('Attempting to connect to MySQL...');
        const connection = await mysql.createConnection({
            host,
            port,
            user,
            password,
            connectTimeout: 10000 // 10 seconds
        });
        
        console.log('Connected to MySQL, creating database if needed...');
        await connection.query(`CREATE DATABASE IF NOT EXISTS \`${database}\`;`);
        await connection.end();
        
        // connect to db
        const sequelize = new Sequelize(database, user, password, {
            dialect: 'mysql',
            host: host,
            port: port,
            logging: console.log,
            dialectOptions: {
                dateStrings: true,
                typeCast: true,
                timezone: 'local'
            },
            timezone: '+08:00', // for writing to database
            define: {
                timestamps: true,
                charset: 'utf8mb4',
                collate: 'utf8mb4_general_ci'
            }
        });

        // Test the connection
        await sequelize.authenticate();
        console.log('Database connection authenticated successfully.');

        // init models and add them to the exported db object
        db.Account = require('../accounts/account.model')(sequelize);
        db.RefreshToken = require('../accounts/refresh-token.model')(sequelize);
        
        // define relationships
        db.Account.hasMany(db.RefreshToken, { onDelete: 'CASCADE' });
        db.RefreshToken.belongsTo(db.Account);

        // sync all models with database
        await sequelize.sync({ alter: true });
        console.log('Database sync completed.');
    } catch (error) {
        console.error('Database initialization error:', error);
        throw error;
    }
}