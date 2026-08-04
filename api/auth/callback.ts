import type { VercelRequest, VercelResponse } from '@vercel/node';

/**
 * /api/auth/callback
 * Handles OAuth 2.0 PKCE authorization_code → access_token exchange.
 * Client secret is NEVER exposed to the frontend — all token exchange happens here.
 */
export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method === 'OPTIONS') {
    res.setHeader('Access-Control-Allow-Origin', req.headers.origin || '*');
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
    return res.status(204).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { code, portal, codeVerifier, redirectUri } = req.body || {};

  if (!code || !portal || !codeVerifier) {
    return res.status(400).json({ error: 'Missing required fields: code, portal, codeVerifier' });
  }

  res.setHeader('Access-Control-Allow-Origin', req.headers.origin || '*');

  try {
    let tokenData: any = null;

    // ── LinkedIn OAuth 2.0 Token Exchange ──────────────────────────────────
    if (portal === 'LinkedIn') {
      const CLIENT_ID     = process.env.LINKEDIN_CLIENT_ID;
      const CLIENT_SECRET = process.env.LINKEDIN_CLIENT_SECRET;

      if (!CLIENT_ID || !CLIENT_SECRET) {
        // Return a structured "demo mode" token if no credentials configured
        return res.status(200).json({
          access_token: `demo-linkedin-${Date.now()}`,
          token_type: 'Bearer',
          expires_in: 5184000,
          demo_mode: true,
          portal
        });
      }

      const params = new URLSearchParams({
        grant_type:    'authorization_code',
        code,
        redirect_uri:  redirectUri || `${process.env.VERCEL_URL}/auth/callback`,
        client_id:     CLIENT_ID,
        client_secret: CLIENT_SECRET,
        code_verifier: codeVerifier
      });

      const tokenRes = await fetch('https://www.linkedin.com/oauth/v2/accessToken', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: params.toString(),
        signal: AbortSignal.timeout(8000)
      });

      tokenData = await tokenRes.json();

      if (!tokenRes.ok) {
        return res.status(400).json({
          error: 'OAuth token exchange failed',
          detail: tokenData,
          portal
        });
      }
    }

    // ── GitHub OAuth Token Exchange ─────────────────────────────────────────
    else if (portal === 'GitHub') {
      const CLIENT_ID     = process.env.GITHUB_CLIENT_ID;
      const CLIENT_SECRET = process.env.GITHUB_CLIENT_SECRET;

      if (!CLIENT_ID || !CLIENT_SECRET) {
        return res.status(200).json({
          access_token: `demo-github-${Date.now()}`,
          token_type: 'Bearer',
          scope: 'read:user user:email',
          demo_mode: true,
          portal
        });
      }

      const tokenRes = await fetch('https://github.com/login/oauth/access_token', {
        method: 'POST',
        headers: { 'Accept': 'application/json', 'Content-Type': 'application/json' },
        body: JSON.stringify({ client_id: CLIENT_ID, client_secret: CLIENT_SECRET, code }),
        signal: AbortSignal.timeout(8000)
      });

      tokenData = await tokenRes.json();
    }

    // ── Generic / unsupported portal — return demo mode ────────────────────
    else {
      return res.status(200).json({
        access_token: `demo-${portal.toLowerCase()}-${Date.now()}`,
        token_type: 'Bearer',
        expires_in: 3600,
        demo_mode: true,
        portal
      });
    }

    return res.status(200).json({ ...tokenData, portal });

  } catch (e: any) {
    console.error('[auth/callback] Error:', e.message);
    return res.status(500).json({ error: 'Internal server error during token exchange', detail: e.message });
  }
}
