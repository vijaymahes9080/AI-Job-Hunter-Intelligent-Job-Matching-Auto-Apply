import type { VercelRequest, VercelResponse } from '@vercel/node';

/**
 * /api/jobs/stream
 * SSE (Server-Sent Events) endpoint to push real-time job match alerts to connected clients.
 */
export default async function handler(req: VercelRequest, res: VercelResponse) {
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache, no-transform');
  res.setHeader('Connection', 'keep-alive');
  res.setHeader('Access-Control-Allow-Origin', '*');

  // Push immediate handshake connection event
  res.write(`data: ${JSON.stringify({ type: 'connected', timestamp: new Date().toISOString() })}\n\n`);

  // Interval ping to keep connection alive and stream updates
  const interval = setInterval(() => {
    res.write(`data: ${JSON.stringify({ type: 'ping', timestamp: new Date().toISOString() })}\n\n`);
  }, 15000);

  req.on('close', () => {
    clearInterval(interval);
    res.end();
  });
}
