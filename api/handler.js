'use strict';

// Entry point recognized by the Vercel Node runtime.
// Preserve the existing bundled Express API and all its registered routes.
const app = require('./index.cjs');
module.exports = app.default || app;
