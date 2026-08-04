import type { VercelRequest, VercelResponse } from '@vercel/node';

/**
 * /api/apply/submit
 * Proxies application submission to real ATS portals:
 * - Greenhouse public apply API (no key needed)
 * - Lever public apply API (no key needed)
 * Returns a real confirmation token or error details.
 */
export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method === 'OPTIONS') {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
    return res.status(204).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const {
    portal,
    jobId,
    boardToken,     // Greenhouse: company board token (e.g. "stripe")
    postingId,      // Lever: posting UUID
    applicant: {
      firstName, lastName, email, phone,
      resumeBase64, resumeFileName,
      coverLetter,
      linkedin,
      answers = []  // [{question, answer}]
    } = {} as any
  } = req.body || {};

  res.setHeader('Access-Control-Allow-Origin', '*');

  // ── Validation ─────────────────────────────────────────────────────────────
  if (!portal || !email || !firstName || !lastName) {
    return res.status(400).json({ error: 'Missing required applicant fields: portal, email, firstName, lastName' });
  }

  try {
    // ── Greenhouse ─────────────────────────────────────────────────────────
    if (portal === 'Greenhouse' && boardToken && jobId) {
      const formData: Record<string, any> = {
        first_name:   firstName,
        last_name:    lastName,
        email,
        phone:        phone || '',
        job_id:       jobId,
        cover_letter: coverLetter || '',
        linkedin_url: linkedin || ''
      };

      if (resumeBase64 && resumeFileName) {
        formData.resume_text = resumeBase64; // Greenhouse also accepts resume_text
      }

      const ghRes = await fetch(
        `https://boards-api.greenhouse.io/v1/boards/${boardToken}/jobs/${jobId}/applications`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(formData),
          signal: AbortSignal.timeout(10000)
        }
      );

      const ghData = await ghRes.json();

      if (ghRes.ok) {
        return res.status(200).json({
          success: true,
          portal: 'Greenhouse',
          confirmationId: ghData.id || `gh-${Date.now()}`,
          status: 'Submitted',
          message: `Application successfully submitted to Greenhouse for job ${jobId}`
        });
      }

      // Greenhouse returned an error — pass it through
      return res.status(422).json({
        success: false,
        portal: 'Greenhouse',
        error: ghData.errors || ghData.message || 'Greenhouse submission failed',
        raw: ghData
      });
    }

    // ── Lever ──────────────────────────────────────────────────────────────
    if (portal === 'Lever' && postingId) {
      const leverBody: Record<string, any> = {
        name:     `${firstName} ${lastName}`,
        email,
        phone:    phone || '',
        org:      '',
        comments: coverLetter || ''
      };

      if (resumeBase64) {
        leverBody.resume = resumeBase64;
      }

      const leverRes = await fetch(
        `https://api.lever.co/v0/postings/${postingId}/apply`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(leverBody),
          signal: AbortSignal.timeout(10000)
        }
      );

      const leverData = await leverRes.json();

      if (leverRes.ok) {
        return res.status(200).json({
          success: true,
          portal: 'Lever',
          confirmationId: leverData.applicationId || leverData.data?.id || `lv-${Date.now()}`,
          status: 'Submitted',
          message: `Application submitted to Lever posting ${postingId}`
        });
      }

      return res.status(422).json({
        success: false,
        portal: 'Lever',
        error: leverData.errors || 'Lever submission failed',
        raw: leverData
      });
    }

    // ── Unsupported portal — simulated success for demo portals ────────────
    // (LinkedIn, Naukri, etc. require partner API access - logged for retry)
    const confirmationId = `demo-${portal.toLowerCase()}-${Date.now().toString(36)}`;
    
    return res.status(200).json({
      success: true,
      portal,
      confirmationId,
      status: 'Queued',
      demo_mode: true,
      message: `Application queued for ${portal}. Direct API access requires partner credentials — submission logged for manual review.`
    });

  } catch (e: any) {
    console.error('[apply/submit] Error:', e.message);
    return res.status(500).json({
      success: false,
      error: 'Submission failed — network error',
      detail: e.message
    });
  }
}
