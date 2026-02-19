const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '.env') });
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');

const healthRoutes = require('./src/routes/health');
const eventRoutes = require('./src/routes/events');
const authRoutes = require('./src/routes/auth');
const sessionRoutes = require('./src/routes/sessions');
const designSettingsRoutes = require('./src/routes/design-settings');
const headerFooterRoutes = require('./src/routes/header-footer');
const themePresetsRoutes = require('./src/routes/theme-presets');
const componentsRoutes = require('./src/routes/components');
const pageComponentsRoutes = require('./src/routes/page-components');
const aiContextRoutes = require('./src/routes/ai-context');
const aiGenerateRoutes = require('./src/routes/ai-generate');
const aiPromptSettingsRoutes = require('./src/routes/ai-prompt-settings');
const publishRoutes = require('./src/routes/publish');
const mediaRoutes = require('./src/routes/media');
const trafficRoutes = require('./src/routes/traffic');
const masterRoutes = require('./src/routes/master');
const { requestLogger } = require('./src/middleware/logger');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(helmet());
app.use(cors({
  origin: process.env.CORS_ORIGIN || 'https://lavprishjemmeside.dk',
  methods: ['GET', 'POST', 'PUT', 'DELETE'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-API-Key']
}));
app.use(express.json({ limit: '500kb' }));
app.use(requestLogger);

app.use('/health', healthRoutes);
app.use('/events', eventRoutes);
app.use('/auth', authRoutes);
app.use('/sessions', sessionRoutes);
app.use('/design-settings', designSettingsRoutes);
app.use('/header-footer', headerFooterRoutes);
app.use('/theme-presets', themePresetsRoutes);
app.use('/components', componentsRoutes);
app.use('/page-components', pageComponentsRoutes);
app.use('/ai', aiContextRoutes);
app.use('/ai-generate', aiGenerateRoutes);
app.use('/ai-prompt-settings', aiPromptSettingsRoutes);
app.use('/publish', publishRoutes);
app.use('/media', mediaRoutes);
app.use('/traffic', trafficRoutes);
app.use('/master', masterRoutes);

app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ error: 'Internal server error' });
});

app.listen(PORT, () => {
  console.log(`API running on port ${PORT}`);
});
