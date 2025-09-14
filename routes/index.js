const express = require('express');
const path = require('path');

const router = express.Router();

// Serve index.html for the root route
router.get('/', (req, res) => {
  const filePath = path.join(__dirname, '..', 'views', 'index.html');
  console.log(`[INDEX] Request for: ${filePath}`);
  res.sendFile(filePath);
});

// Serve hybrid index.html for the root route
router.get('/hybrid', (req, res) => {
  const filePath = path.join(__dirname, '..', 'views', 'index-hybrid.html');
  console.log(`[INDEX-HYBRID] Request for: ${filePath}`);
  res.sendFile(filePath);
});

// Serve DeepRemember page
router.get('/deepRemember', (req, res) => {
  const filePath = path.join(__dirname, '..', 'views', 'deepRemember.html');
  console.log(`[DeepRemember] Request for: ${filePath}`);
  res.sendFile(filePath);
});

// Serve hybrid DeepRemember page
router.get('/deepRemember-hybrid', (req, res) => {
  const filePath = path.join(__dirname, '..', 'views', 'deepRemember-hybrid.html');
  console.log(`[DeepRemember-HYBRID] Request for: ${filePath}`);
  res.sendFile(filePath);
});

// Serve React test page
router.get('/test-react', (req, res) => {
  const filePath = path.join(__dirname, '..', 'views', 'test-react.html');
  console.log(`[TEST-REACT] Request for: ${filePath}`);
  res.sendFile(filePath);
});

module.exports = router;
