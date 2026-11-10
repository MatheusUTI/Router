'use strict';

module.exports = function health(req, res) {
  res.setHeader('Cache-Control', 'no-store');
  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET');
    return res.status(405).json({status:'method_not_allowed'});
  }
  return res.status(200).json({
    status:'ok',
    runtime:'vercel',
    auth_backend:'supabase_edge',
    supabase_configured:Boolean(process.env.VITE_SUPABASE_URL && process.env.VITE_SUPABASE_ANON_KEY),
  });
};
