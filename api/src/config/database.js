const sql = require('mssql');

// Database configuration using environment variables
const config = {
    server: process.env.DB_SERVER,
    database: process.env.DB_NAME,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    options: {
        encrypt: true, // Required for Azure SQL
        trustServerCertificate: false,
        enableArithAbort: true,
        connectTimeout: 30000,
        requestTimeout: 30000
    },
    pool: {
        max: 10,
        min: 0,
        idleTimeoutMillis: 30000
    }
};

let pool = null;

/**
 * Connect to the database
 * @returns {Promise<sql.ConnectionPool>}
 */
async function connectDB() {
    try {
        if (pool) {
            return pool;
        }

        console.log('📡 Connecting to Azure SQL Database...');
        console.log(`   Server: ${config.server}`);
        console.log(`   Database: ${config.database}`);

        pool = await sql.connect(config);
        console.log('✅ Connected to Azure SQL Database');

        // Handle connection errors
        pool.on('error', (err) => {
            console.error('❌ Database pool error:', err);
            pool = null;
        });

        return pool;
    } catch (error) {
        console.error('❌ Database connection failed:', error.message);
        throw error;
    }
}

/**
 * Execute a SQL query
 * @param {string} queryString - SQL query to execute
 * @param {Object} params - Query parameters
 * @returns {Promise<sql.IResult>}
 */
async function query(queryString, params = {}) {
    try {
        if (!pool) {
            await connectDB();
        }

        const request = pool.request();

        // Add parameters to the request
        for (const [key, value] of Object.entries(params)) {
            if (value === null || value === undefined) {
                request.input(key, sql.NVarChar, null);
            } else if (typeof value === 'number') {
                request.input(key, sql.Int, value);
            } else if (typeof value === 'boolean') {
                request.input(key, sql.Bit, value);
            } else if (value instanceof Date) {
                request.input(key, sql.DateTime, value);
            } else if (typeof value === 'string') {
                // Try to detect if this is a datetime string (ISO 8601 format)
                const dateRegex = /^\d{4}-\d{2}-\d{2}[T ]\d{2}:\d{2}(:\d{2})?(\.\d{3})?(Z|[+-]\d{2}:\d{2})?$/;
                if (dateRegex.test(value)) {
                    const parsedDate = new Date(value);
                    if (!isNaN(parsedDate.getTime())) {
                        request.input(key, sql.DateTime, parsedDate);
                    } else {
                        request.input(key, sql.NVarChar, value);
                    }
                } else {
                    request.input(key, sql.NVarChar, value);
                }
            } else {
                request.input(key, sql.NVarChar, String(value));
            }
        }

        const result = await request.query(queryString);
        return result;
    } catch (error) {
        console.error('❌ Query error:', error.message);
        throw error;
    }
}

/**
 * Close the database connection
 */
async function closeDB() {
    try {
        if (pool) {
            await pool.close();
            pool = null;
            console.log('📤 Database connection closed');
        }
    } catch (error) {
        console.error('❌ Error closing database:', error.message);
    }
}

module.exports = {
    connectDB,
    query,
    closeDB,
    sql
};
