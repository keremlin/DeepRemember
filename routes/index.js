const express = require('express');
const path = require('path');

const router = express.Router();

// Serve index.html for the root route
router.get('/', (req, res) => {
  const filePath = path.join(__dirname, '..', 'views', 'index.html');
  console.log(`[INDEX] Request for: ${filePath}`);
  res.sendFile(filePath);
});

// Serve DeepRemember page
router.get('/deepRemember', (req, res) => {
  const filePath = path.join(__dirname, '..', 'views', 'deepRemember.html');
  console.log(`[DeepRemember] Request for: ${filePath}`);
  res.sendFile(filePath);
});

module.exports = router;
