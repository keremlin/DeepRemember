// Load environment variables from .env file FIRST, before any other imports
require('dotenv').config();

const express = require('express');
const path = require('path');
const cors = require('cors');

// Import routes
const indexRoutes = require('./routes/index');
const uploadRoutes = require('./routes/upload');
const filesRoutes = require('./routes/files');
const deepRememberRoutes = require('./routes/deepRemember');
const srsRoutes = require('./routes/srs');
const authRoutes = require('./routes/auth');

// Import configuration
const config = require('./config/app');

const app = express();

// Enable CORS for all routes
app.use(cors({
  origin: ['http://localhost:9000', 'http://localhost:3000', 'http://localhost:4004'],
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

// Set up view engine
app.set('view engine', 'html');
app.set('views', path.join(__dirname, '../frontend/views'));

// Middleware
app.use(express.json()); // Parse JSON bodies
app.use(express.urlencoded({ extended: true })); // Parse URL-encoded bodies

// Serve static files from frontend public directory
app.use(express.static(path.join(__dirname, '../frontend/public')));

// Serve files from the files directory (in root)
app.use('/files', express.static(path.join(__dirname, '../files')));

// Serve voice files (in root)
app.use('/voice', express.static(path.join(__dirname, '../voice')));

// Route to serve sentence analysis modal
app.get('/views/sentenceAnalysisModal.html', (req, res) => {
    res.sendFile(path.join(__dirname, '../frontend/views', 'sentenceAnalysisModal.html'));
});

// Routes
app.use('/', indexRoutes);
app.use('/', uploadRoutes);
app.use('/', filesRoutes);
app.use('/deepRemember', deepRememberRoutes);
app.use('/api/srs', srsRoutes);
app.use('/api/auth', authRoutes);

// Error handling middleware
app.use((err, req, res, next) => {
  console.error('[ERROR]', err.stack);
  res.status(500).json({ error: 'Something went wrong!' });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({ error: 'Route not found' });
});

// Start server
app.listen(config.PORT, () => {
  console.log(`🚀 Server running at http://localhost:${config.PORT}`);
  console.log(`📁 Environment: ${config.NODE_ENV}`);
  console.log(`📊 Log level: ${config.LOG_LEVEL}`);
});
