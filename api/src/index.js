require('dotenv').config();
const express = require('express');
const cors = require('cors');

// Import routes
const fansRoutes = require('./routes/fans');
const teamsRoutes = require('./routes/teams');
const matchesRoutes = require('./routes/matches');
const alertsRoutes = require('./routes/alerts');
const eventsRoutes = require('./routes/events');
const recipientsRoutes = require('./routes/recipients');

// Import database connection
const { connectDB } = require('./config/database');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());

// Request logging middleware
app.use((req, res, next) => {
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.path}`);
  next();
});

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({
    status: 'healthy',
    service: 'CAN 2025 Fan Notification API',
    timestamp: new Date().toISOString()
  });
});

// API Routes
app.use('/fans', fansRoutes);
app.use('/teams', teamsRoutes);
app.use('/matches', matchesRoutes);
app.use('/alerts', alertsRoutes);
app.use('/events', eventsRoutes);
app.use('/recipients', recipientsRoutes);

// Error handling middleware
app.use((err, req, res, next) => {
  console.error('Error:', err.message);
  res.status(err.status || 500).json({
    error: err.message || 'Internal Server Error',
    timestamp: new Date().toISOString()
  });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({ error: 'Endpoint not found' });
});

// Start server
async function startServer() {
  try {
    // Connect to database
    await connectDB();
    console.log('✅ Database connected successfully');

    app.listen(PORT, () => {
      console.log(`🚀 CAN 2025 API running on port ${PORT}`);
      console.log(`📍 Health check: http://localhost:${PORT}/health`);
    });
  } catch (error) {
    console.error('❌ Failed to start server:', error.message);
    process.exit(1);
  }
}

startServer();
