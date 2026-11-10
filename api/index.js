'use strict';

// Vercel detects .js Node functions under /api.
// The bundled Express application stays in index.cjs to preserve existing endpoints.
const bundledApp = require('./index.cjs');
module.exports = bundledApp.default || bundledApp;
