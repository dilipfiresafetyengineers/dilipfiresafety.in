// Cloudflare Pages Function — runs server-side, never shipped to the browser.
// Lives at: /functions/api/contact.js
// Once deployed, this is reachable at https://www.dilipfiresafety.in/api/contact
//
// The browser only ever calls this URL. The real Google Apps Script URL and
// the shared secret live in Cloudflare's encrypted environment variables
// (set in the dashboard — see setup notes below) and are never sent to,
// or visible from, the visitor's browser.

export async function onRequestPost(context) {
  const { request, env } = context;

  // CORS isn't really needed since this is same-origin, but harmless to allow.
  const jsonHeaders = { 'Content-Type': 'application/json' };

  try {
    const incoming = await request.formData();

    // --- Basic server-side validation (this is the part that actually can't
    //     be bypassed by editing client-side JS, unlike the old setup) ---
    const honeypot = incoming.get('website');
    if (honeypot) {
      // Bot filled the trap field — pretend success, do nothing further.
      return new Response(JSON.stringify({ ok: true }), { status: 200, headers: jsonHeaders });
    }

    const phone = String(incoming.get('phone') || '').replace(/\D/g, '');
    if (!/^[6-9]\d{9}$/.test(phone)) {
      return new Response(JSON.stringify({ ok: false, error: 'Invalid phone number' }), {
        status: 400,
        headers: jsonHeaders,
      });
    }

    const name = String(incoming.get('name') || '').trim();
    if (name.length < 2) {
      return new Response(JSON.stringify({ ok: false, error: 'Invalid name' }), {
        status: 400,
        headers: jsonHeaders,
      });
    }

    // --- Forward to Google Apps Script, adding the real secret server-side ---
    const upstream = new FormData();
    for (const [key, value] of incoming.entries()) {
      if (key === 'website') continue; // don't forward the honeypot field
      upstream.append(key, value);
    }
    upstream.append('secret', env.FORM_SECRET); // pulled from Cloudflare env, not client code

    await fetch(env.SHEET_ENDPOINT, { method: 'POST', body: upstream });
    // Apps Script web apps often don't return useful CORS'd responses, so we
    // don't rely on reading it — if the fetch didn't throw, treat it as sent.

    return new Response(JSON.stringify({ ok: true }), { status: 200, headers: jsonHeaders });
  } catch (err) {
    return new Response(JSON.stringify({ ok: false, error: 'Server error' }), {
      status: 500,
      headers: jsonHeaders,
    });
  }
}

// Reject any method other than POST with a clean 405 instead of a default error page.
export async function onRequestGet() {
  return new Response('Method not allowed', { status: 405 });
}
