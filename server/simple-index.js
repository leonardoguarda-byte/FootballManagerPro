const express = require('express');
const { Pool } = require('@neondatabase/serverless');
const { drizzle } = require('drizzle-orm/neon-serverless');
const ws = require('ws');

// Configure neon
const neonConfig = require('@neondatabase/serverless');
neonConfig.webSocketConstructor = ws;

const app = express();
app.use(express.json());

// Database setup
const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const db = drizzle({ client: pool });

// Simple stadium creation endpoint for testing
app.post('/api/stadiums', async (req, res) => {
  try {
    console.log('Stadium creation request body:', req.body);
    
    const { name, address, capacity, surface, notes, clubId, seasonId } = req.body;
    
    // Simple SQL insert
    const query = `
      INSERT INTO stadiums (name, address, capacity, surface, notes, club_id, season_id, created_at, updated_at)
      VALUES ($1, $2, $3, $4, $5, $6, $7, NOW(), NOW())
      RETURNING *;
    `;
    
    const result = await pool.query(query, [name, address, capacity, surface, notes, clubId, seasonId]);
    
    console.log('Stadium created successfully:', result.rows[0]);
    res.status(201).json(result.rows[0]);
  } catch (error) {
    console.error('Error creating stadium:', error);
    res.status(500).json({ message: 'Failed to create stadium', error: error.message });
  }
});

app.get('/api/stadiums', async (req, res) => {
  try {
    const { clubId, seasonId } = req.query;
    
    const query = `
      SELECT * FROM stadiums 
      WHERE club_id = $1 AND season_id = $2 
      ORDER BY created_at DESC;
    `;
    
    const result = await pool.query(query, [clubId, seasonId]);
    res.json(result.rows);
  } catch (error) {
    console.error('Error fetching stadiums:', error);
    res.status(500).json({ message: 'Failed to fetch stadiums' });
  }
});

const port = process.env.PORT || 5000;
app.listen(port, '0.0.0.0', () => {
  console.log(`Simple server running on port ${port}`);
});