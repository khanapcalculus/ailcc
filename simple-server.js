// Simple Express server
const express = require('express');
const cors = require('cors');

const app = express();
app.use(cors());

// Basic health check endpoint
app.get('/', (req, res) => {
  res.send('Socket.io server is running in simple mode');
});

// Additional debug endpoint
app.get('/debug', (req, res) => {
  res.json({
    env: process.env.NODE_ENV || 'development',
    directory: process.cwd(),
    platform: process.platform,
    nodeVersion: process.version
  });
});

// Start the server
const PORT = process.env.PORT || 3000;
app.listen(PORT, '0.0.0.0', () => {
  console.log(`Simple server listening on port ${PORT}`);
}); 