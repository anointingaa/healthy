// netlify/functions/subscribe.js
// Sends ONLY non-empty fields as [{slug, value}] to Systeme, then applies tag.

exports.handler = async (event) => {
  const fail = (code, msg, detail) => {
    console.error('[subscribe]', msg, detail || '');
    return { statusCode: code, body: JSON.stringify({ error: msg, detail: detail || null }) };
  };

  try {
    if (event.httpMethod !== 'POST') {
      return fail(400, 'Email required');
    }

    // Parse body
    let payload = {};
    try { payload = JSON.parse(event.body || '{}'); }
    catch (e) { return fail(400, 'Bad JSON body', String(e)); }

    const { email, meta = {}, first_name } = payload;
    if (!email) return fail(400, 'Email required');

    // Env vars
    const API_KEY = (process.env.SYSTEME_API_KEY || '').trim();
    const TAG_ID_STR = (process.env.SYSTEME_TAG_ID || '').trim();
    if (!API_KEY || !TAG_ID_STR) {
      return fail(500, 'Missing SYSTEME_API_KEY or SYSTEME_TAG_ID', { hasKey: !!API_KEY, tagIdRaw: TAG_ID_STR });
    }
    const TAG_ID = Number(TAG_ID_STR);
    if (!Number.isFinite(TAG_ID)) return fail(400, 'SYSTEME_TAG_ID must be numeric', TAG_ID_STR);

    // Headers (use both common header casings)
    const headers = {
      'Content-Type': 'application/json',
      'Accept': 'application/json',
      'X-API-Key': API_KEY,
      'Api-Key': API_KEY
    };

    // Build fields ARRAY (slug/value) and filter blanks
    const rawFields = {
      long_email:        meta.long_email,
      due_date:          meta.due_date,
      gestational_weeks: meta.gestational_weeks,
      risk_level:        meta.risk_level,
      missing_checks:    meta.missing_checks
      // subject_line intentionally omitted
    };
    const fieldsArray = Object.entries(rawFields)
      .filter(([_, v]) => (v ?? '').toString().trim().length > 0)
      .map(([slug, value]) => ({ slug, value }));

    const contactBody = {
      email,
      firstName: first_name || undefined,
      // IMPORTANT: array format so slugs are accepted
      fields: fieldsArray
    };

    // Create/Update contact
    const createResp = await fetch('https://api.systeme.io/api/contacts', {
      method: 'POST',
      headers,
      body: JSON.stringify(contactBody)
    });
    const createText = await createResp.text();
    if (!createResp.ok) {
      return fail(createResp.status, 'Create contact failed', createText);
    }

    let contactId = null;
    try {
      const j = JSON.parse(createText);
      contactId = j?.id || j?.contact?.id || null;
    } catch (e) {
      return fail(500, 'Create contact parse failed', createText);
    }
    if (!contactId) return fail(500, 'No contact ID returned', createText);

    // Tag to trigger automation
    const tagResp = await fetch(`https://api.systeme.io/api/contacts/${contactId}/tags`, {
      method: 'POST',
      headers,
      body: JSON.stringify({ tagId: TAG_ID })
    });
    const tagText = await tagResp.text();
    if (!tagResp.ok) {
      return fail(tagResp.status, 'Tag assign failed', tagText);
    }

    return { statusCode: 200, body: JSON.stringify({ message: 'Success', contactId }) };
  } catch (e) {
    return fail(500, 'Server error', String(e));
  }
};
