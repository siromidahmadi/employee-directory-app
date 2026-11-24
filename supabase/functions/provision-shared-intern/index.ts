// Shared intern account creation and password resets have been retired.
const headers = {
  'Access-Control-Allow-Origin': 'https://siromidahmadi.github.io',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Vary': 'Origin'
};
Deno.serve(req => req.method === 'OPTIONS'
  ? new Response('ok', { headers })
  : Response.json({ error: 'Shared intern access has been retired.' }, { status: 410, headers }));
