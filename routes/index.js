const express = require('express');
const path = require('path');

const router = express.Router();

// Serve index.html for the root route
router.get('/', (req, res) => {
  const filePath = path.join(__dirname, '..', 'views', 'index.html');
  console.log(`[INDEX] Request for: ${filePath}`);
  res.sendFile(filePath);
});

// Serve SRS page
router.get('/srs', (req, res) => {
  const filePath = path.join(__dirname, '..', 'views', 'srs.html');
  console.log(`[SRS] Request for: ${filePath}`);
  res.sendFile(filePath);
});

module.exports = router;
