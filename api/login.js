'use strict';

// Only the Supabase Edge function handles password verification.
// Never query public.app_users or accept built-in demo passwords here.
module.exports = async function login(req, res) {
  res.setHeader('Cache-Control', 'no-store');
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({success:false,error:'Método não permitido.'});
  }

  const username = typeof req.body?.username === 'string' ? req.body.username.trim() : '';
  const password = typeof req.body?.password === 'string' ? req.body.password : '';
  if (!username || !password || username.length > 128 || password.length > 256) {
    return res.status(400).json({success:false,error:'Informe usuário e senha válidos.'});
  }

  const base = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
  const anonKey = process.env.VITE_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY;
  if (!base || !anonKey) {
    return res.status(503).json({success:false,error:'Autenticação temporariamente indisponível.'});
  }

  try {
    const response = await fetch(
      new URL('/functions/v1/router-login', base),
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer ' + anonKey,
          'apikey': anonKey,
        },
        body: JSON.stringify({username, password}),
        signal: AbortSignal.timeout(12000),
      }
    );
    const data = await response.json().catch(() => ({}));
    return res.status(response.status).json({
      success: data.success === true,
      ...(data.success === true && data.user ? {user:data.user} : {
        error: data.error || 'Não foi possível validar as credenciais.',
      }),
    });
  } catch {
    return res.status(503).json({success:false,error:'Serviço de autenticação indisponível.'});
  }
};
