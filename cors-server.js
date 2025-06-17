const express = require('express');
const cors = require('cors');
const app = express();
const PORT = 8080;

// Enable CORS for all routes
app.use(cors({
  origin: ['http://localhost:3000', 'http://localhost:3002'],
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
  credentials: true
}));

// Health check endpoint
app.get('/api/v1/health', (req, res) => {
  res.json({
    success: true,
    status: 'healthy',
    timestamp: new Date().toISOString(),
    service: 'CORS Test Server'
  });
});

// Start the server
app.listen(PORT, () => {
  console.log(`CORS test server running on http://localhost:${PORT}`);
}); 