// Supabase Edge Function skeleton for account deletion.
// Deploy only after configuring SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in Supabase secrets.
// Never expose service_role keys in browser code.

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

Deno.serve(async (request) => {
  if (request.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), { status: 405 });
  }

  const authHeader = request.headers.get('Authorization');
  if (!authHeader) {
    return new Response(JSON.stringify({ error: 'Missing Authorization header' }), { status: 401 });
  }

  const supabaseUrl = Deno.env.get('SUPABASE_URL');
  const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
  if (!supabaseUrl || !serviceRoleKey) {
    return new Response(JSON.stringify({ error: 'Function is not configured' }), { status: 500 });
  }

  const admin = createClient(supabaseUrl, serviceRoleKey, {
    auth: { persistSession: false },
  });
  const userClient = createClient(supabaseUrl, serviceRoleKey, {
    global: { headers: { Authorization: authHeader } },
    auth: { persistSession: false },
  });

  const { data: userData, error: userError } = await userClient.auth.getUser();
  if (userError || !userData.user) {
    return new Response(JSON.stringify({ error: 'Invalid user session' }), { status: 401 });
  }

  const body = await request.json().catch(() => ({}));
  if (body.confirmation !== 'DELETE MY SPANISH LEARNING ACCOUNT') {
    return new Response(JSON.stringify({ error: 'Confirmation text does not match' }), { status: 400 });
  }

  const userId = userData.user.id;
  await admin.from('user_data_documents').delete().eq('user_id', userId);
  await admin.from('profiles').delete().eq('user_id', userId);
  const { error: deleteError } = await admin.auth.admin.deleteUser(userId);

  if (deleteError) {
    return new Response(JSON.stringify({ error: deleteError.message }), { status: 500 });
  }

  return new Response(JSON.stringify({ ok: true }), {
    headers: { 'Content-Type': 'application/json' },
  });
});
