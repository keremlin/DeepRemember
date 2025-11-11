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
const testRoutes = require('./testing/testRoutes');

// Import configuration
const config = require('./config/app');

// Import folder initialization
const { initializeAppFolders } = require('./filesystem/initializeFolders');

const app = express();

// Enable CORS for all routes
// In production, allow Render.com domain and localhost for local development
// In development, allow localhost
const baseOrigins = ['http://localhost:9000', 'http://localhost:3000', 'http://localhost:4004'];
const productionOrigins = [
  'http://deepremember.onrender.com',
  'https://deepremember.onrender.com',
  'http://deeprememberapp.onrender.com',
  'https://deeprememberapp.onrender.com',
  ...(process.env.ALLOWED_ORIGINS ? process.env.ALLOWED_ORIGINS.split(',') : [])
];

const allowedOrigins = process.env.NODE_ENV === 'production'
  ? [...baseOrigins, ...productionOrigins]
  : baseOrigins;

app.use(cors({
  origin: (origin, callback) => {
    // Allow requests with no origin (like mobile apps or curl requests)
    if (!origin) return callback(null, true);
    
    if (allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'Range'],
  exposedHeaders: ['Content-Range', 'Accept-Ranges', 'Content-Length']
}));

// Set up view engine
app.set('view engine', 'html');
app.set('views', path.join(__dirname, '../frontend/views'));

// Middleware
app.use(express.json()); // Parse JSON bodies
app.use(express.urlencoded({ extended: true })); // Parse URL-encoded bodies

// Serve static files from frontend public directory
app.use(express.static(path.join(__dirname, '../frontend/public')));



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
app.use('/api/test', testRoutes);

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
app.listen(config.PORT, async () => {
  console.log(`🚀 Server running at http://localhost:${config.PORT}`);
  console.log(`📁 Environment: ${config.NODE_ENV}`);
  console.log(`📊 Log level: ${config.LOG_LEVEL}`);
  
  // Initialize application folders
  await initializeAppFolders();
});
