const express = require('express');
const { requireAuth } = require('../middleware/auth');
const router = express.Router();

// Check if Google credentials are configured
function isGoogleConfigured() {
  return !!(
    process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL &&
    process.env.GOOGLE_PRIVATE_KEY &&
    process.env.GOOGLE_SITE_URL
  );
}

function getGoogleAuth() {
  const { google } = require('googleapis');
  return new google.auth.GoogleAuth({
    credentials: {
      client_email: process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL,
      private_key: process.env.GOOGLE_PRIVATE_KEY.replace(/\\n/g, '\n')
    },
    scopes: [
      'https://www.googleapis.com/auth/webmasters.readonly',
      'https://www.googleapis.com/auth/analytics.readonly'
    ]
  });
}

function getDateRange(days) {
  const d = Math.min(parseInt(days) || 28, 90);
  const endDate = new Date().toISOString().split('T')[0];
  const startDate = new Date(Date.now() - d * 86400000).toISOString().split('T')[0];
  return { startDate, endDate };
}

// GET /traffic/search-console?days=28
router.get('/search-console', requireAuth, async (req, res) => {
  if (!isGoogleConfigured() || !process.env.GOOGLE_SITE_URL) {
    return res.json({ configured: false });
  }

  try {
    const { google } = require('googleapis');
    const auth = getGoogleAuth();
    const searchconsole = google.searchconsole({ version: 'v1', auth });
    const { startDate, endDate } = getDateRange(req.query.days);
    const siteUrl = process.env.GOOGLE_SITE_URL;

    // Fetch by query
    const queryResp = await searchconsole.searchanalytics.query({
      siteUrl,
      requestBody: {
        startDate,
        endDate,
        dimensions: ['query'],
        rowLimit: 20
      }
    });

    // Fetch by page
    const pageResp = await searchconsole.searchanalytics.query({
      siteUrl,
      requestBody: {
        startDate,
        endDate,
        dimensions: ['page'],
        rowLimit: 10
      }
    });

    // Aggregate summary totals from query rows
    const queryRows = queryResp.data.rows || [];
    const summary = queryRows.reduce(
      (acc, row) => ({
        clicks: acc.clicks + (row.clicks || 0),
        impressions: acc.impressions + (row.impressions || 0),
        ctr: 0,
        position: 0
      }),
      { clicks: 0, impressions: 0, ctr: 0, position: 0 }
    );
    summary.ctr = summary.impressions > 0 ? summary.clicks / summary.impressions : 0;
    summary.position =
      queryRows.length > 0
        ? queryRows.reduce((acc, r) => acc + (r.position || 0), 0) / queryRows.length
        : 0;

    const queries = queryRows.map(row => ({
      query: row.keys[0],
      clicks: row.clicks || 0,
      impressions: row.impressions || 0,
      ctr: row.ctr || 0,
      position: row.position || 0
    }));

    const pages = (pageResp.data.rows || []).map(row => ({
      page: row.keys[0],
      clicks: row.clicks || 0,
      impressions: row.impressions || 0
    }));

    res.json({ configured: true, summary, queries, pages });
  } catch (err) {
    console.error('[traffic/search-console]', err.message);
    res.status(500).json({ error: err.message });
  }
});

// GET /traffic/analytics?days=28
router.get('/analytics', requireAuth, async (req, res) => {
  if (!isGoogleConfigured() || !process.env.GOOGLE_GA4_PROPERTY_ID) {
    return res.json({ configured: false });
  }

  try {
    const { google } = require('googleapis');
    const auth = getGoogleAuth();
    const analyticsdata = google.analyticsdata({ version: 'v1beta', auth });
    const { startDate, endDate } = getDateRange(req.query.days);
    const propertyId = process.env.GOOGLE_GA4_PROPERTY_ID;

    // Main report: totals
    const summaryResp = await analyticsdata.properties.runReport({
      property: `properties/${propertyId}`,
      requestBody: {
        dateRanges: [{ startDate, endDate }],
        metrics: [
          { name: 'sessions' },
          { name: 'totalUsers' },
          { name: 'screenPageViews' },
          { name: 'userEngagementDuration' }
        ]
      }
    });

    const summaryRow = (summaryResp.data.rows || [])[0];
    const metricValues = summaryRow ? summaryRow.metricValues.map(m => parseFloat(m.value) || 0) : [0, 0, 0, 0];
    const sessions = metricValues[0];
    const avgDuration = sessions > 0 ? metricValues[3] / sessions : 0;

    const summary = {
      sessions: Math.round(metricValues[0]),
      users: Math.round(metricValues[1]),
      pageViews: Math.round(metricValues[2]),
      avgSessionDuration: Math.round(avgDuration)
    };

    // Top pages
    const pagesResp = await analyticsdata.properties.runReport({
      property: `properties/${propertyId}`,
      requestBody: {
        dateRanges: [{ startDate, endDate }],
        dimensions: [{ name: 'pagePath' }],
        metrics: [{ name: 'sessions' }],
        limit: 10,
        orderBys: [{ metric: { metricName: 'sessions' }, desc: true }]
      }
    });

    const topPages = (pagesResp.data.rows || []).map(row => ({
      page: row.dimensionValues[0].value,
      sessions: parseInt(row.metricValues[0].value) || 0
    }));

    // Traffic sources
    const sourcesResp = await analyticsdata.properties.runReport({
      property: `properties/${propertyId}`,
      requestBody: {
        dateRanges: [{ startDate, endDate }],
        dimensions: [{ name: 'sessionDefaultChannelGroup' }],
        metrics: [{ name: 'sessions' }],
        limit: 10,
        orderBys: [{ metric: { metricName: 'sessions' }, desc: true }]
      }
    });

    const sources = (sourcesResp.data.rows || []).map(row => ({
      source: row.dimensionValues[0].value,
      sessions: parseInt(row.metricValues[0].value) || 0
    }));

    res.json({ configured: true, summary, topPages, sources });
  } catch (err) {
    console.error('[traffic/analytics]', err.message);
    res.status(500).json({ error: err.message });
  }
});

// GET /traffic/ads — placeholder (Google Ads not configured yet)
router.get('/ads', requireAuth, async (req, res) => {
  res.json({
    configured: false,
    message: 'Google Ads integration kommer snart'
  });
});

module.exports = router;
