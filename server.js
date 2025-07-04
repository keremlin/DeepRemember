const express = require('express');
const path = require('path');

const app = express();
const PORT = 4004;

// Serve static files (css, js, images, etc.)
app.use(express.static(path.join(__dirname)));

// Serve index.html for the root route
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'index.html'));
});

app.listen(PORT, () => {
  console.log(`Server running at http://localhost:${PORT}`);
}); 