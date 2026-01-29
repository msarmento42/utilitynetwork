function json(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      'content-type': 'application/json; charset=utf-8',
      'cache-control': 'no-store',
    },
  });
}

async function verifyTurnstile(secret, token, ip) {
  const form = new FormData();
  form.append('secret', secret);
  form.append('response', token);
  if (ip) form.append('remoteip', ip);

  const r = await fetch('https://challenges.cloudflare.com/turnstile/v0/siteverify', {
    method: 'POST',
    body: form,
  });
  return r.json();
}

export async function onRequestPost({ request, env }) {
  const TURNSTILE_SECRET = env.TURNSTILE_SECRET;
  if (!TURNSTILE_SECRET) return json({ ok: false, error: 'TURNSTILE_SECRET not configured' }, 500);

  const body = await request.formData();
  const message = (body.get('message') || '').toString().trim();
  const token = (body.get('cf-turnstile-response') || '').toString();

  if (!message || message.length < 5) return json({ ok: false, error: 'Message too short' }, 400);

  const ip = request.headers.get('CF-Connecting-IP') || undefined;
  const verify = await verifyTurnstile(TURNSTILE_SECRET, token, ip);
  if (!verify.success) return json({ ok: false, error: 'Turnstile failed' }, 400);

  return json({ ok: true });
}
