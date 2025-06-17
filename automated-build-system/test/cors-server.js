const express = require('express');
const cors = require('cors');
const app = express();
// Enable CORS for all routes
app.use(cors({ origin: '*', methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'], allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'] }));
// Health endpoint
app.get('/api/v1/health', (req, res) => { res.json({ success: true, status: 'healthy', timestamp: new Date().toISOString(), service: 'CORS Test Server' }); });
// Also add a root health endpoint
app.get('/health', (req, res) => { res.json({ success: true, status: 'healthy', timestamp: new Date().toISOString(), service: 'CORS Test Server' }); });
// Start the server
const PORT = 8080; app.listen(PORT, () => { console.log(CORS test server running on http://localhost:); });
