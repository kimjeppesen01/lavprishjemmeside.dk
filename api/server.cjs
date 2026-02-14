const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '.env') });
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');

const healthRoutes = require('./src/routes/health');
const eventRoutes = require('./src/routes/events');
const authRoutes = require('./src/routes/auth');
const { requestLogger } = require('./src/middleware/logger');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(helmet());
app.use(cors({
  origin: process.env.CORS_ORIGIN || 'https://lavprishjemmeside.dk',
  methods: ['GET', 'POST'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));
app.use(express.json({ limit: '10kb' }));
app.use(requestLogger);

app.use('/health', healthRoutes);
app.use('/events', eventRoutes);
app.use('/auth', authRoutes);

app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ error: 'Internal server error' });
});

app.listen(PORT, () => {
  console.log(`API running on port ${PORT}`);
});
