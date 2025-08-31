const express = require('express');
const path = require('path');

// Import routes
const indexRoutes = require('./routes/index');
const uploadRoutes = require('./routes/upload');
const filesRoutes = require('./routes/files');
const deepRememberRoutes = require('./routes/deepRemember');

// Import configuration
const config = require('./config/app');

const app = express();

// Set up view engine
app.set('view engine', 'html');
app.set('views', path.join(__dirname, 'views'));

// Middleware
app.use(express.json()); // Parse JSON bodies
app.use(express.urlencoded({ extended: true })); // Parse URL-encoded bodies

// Serve static files from public directory
app.use(express.static(path.join(__dirname, 'public')));

// Serve files from the files directory
app.use('/files', express.static(path.join(__dirname, 'files')));

// Routes
app.use('/', indexRoutes);
app.use('/', uploadRoutes);
app.use('/', filesRoutes);
app.use('/deepRemember', deepRememberRoutes);

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
