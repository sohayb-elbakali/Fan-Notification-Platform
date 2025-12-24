const sql = require('mssql');

const config = {
    server: process.env.DB_SERVER,
    database: process.env.DB_NAME,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    options: {
        encrypt: true, // Required for Azure SQL
        trustServerCertificate: false,
        enableArithAbort: true
    },
    pool: {
        max: 10,
        min: 0,
        idleTimeoutMillis: 30000
    }
};

let pool = null;

/**
 * Connect to Azure SQL Database
 */
async function connectDB() {
    try {
        if (pool) {
            return pool;
        }

        // For development without actual DB, use mock mode
        if (process.env.NODE_ENV === 'development' && !process.env.DB_SERVER) {
            console.log('⚠️  Running in mock database mode');
            return null;
        }

        pool = await sql.connect(config);
        return pool;
    } catch (error) {
        console.error('Database connection error:', error.message);
        throw error;
    }
}

/**
 * Get database connection pool
 */
function getPool() {
    return pool;
}

/**
 * Execute a SQL query
 */
async function query(sqlQuery, params = {}) {
    try {
        const pool = await connectDB();

        if (!pool) {
            // Mock mode for development
            console.log('📝 Mock Query:', sqlQuery);
            return { recordset: [] };
        }

        const request = pool.request();

        // Add parameters
        for (const [key, value] of Object.entries(params)) {
            request.input(key, value);
        }

        const result = await request.query(sqlQuery);
        return result;
    } catch (error) {
        console.error('Query error:', error.message);
        throw error;
    }
}

/**
 * Execute a query within a transaction
 */
async function transaction(callback) {
    const pool = await connectDB();

    if (!pool) {
        // Mock mode
        return callback({ query: async () => ({ recordset: [] }) });
    }

    const trans = new sql.Transaction(pool);

    try {
        await trans.begin();
        const result = await callback(trans);
        await trans.commit();
        return result;
    } catch (error) {
        await trans.rollback();
        throw error;
    }
}

module.exports = {
    connectDB,
    getPool,
    query,
    transaction,
    sql
};
