// netlify/functions/subscribe.js
// Creates/updates a Systeme.io contact, sets ONLY non-empty custom fields, then applies a tag to trigger your email rule.

exports.handler = async (event) => {
  const fail = (code, msg, detail) => {
    console.error('[subscribe]', msg, detail || '');
    return { statusCode: code, body: JSON.stringify({ error: msg, detail: detail || null }) };
  };

  try {
    // Quick probe when opened in browser
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
      return fail(500, 'Missing SYSTEME_API_KEY or SYSTEME_TAG_ID', {
        hasKey: !!API_KEY, tagIdRaw: TAG_ID_STR
      });
    }
    const TAG_ID = Number(TAG_ID_STR);
    if (!Number.isFinite(TAG_ID)) {
      return fail(400, 'SYSTEME_TAG_ID must be numeric', TAG_ID_STR);
    }

    // Headers (include both common key headers just in case)
    const headers = {
      'Content-Type': 'application/json',
      'Accept': 'application/json',
      'X-API-Key': API_KEY,
      'Api-Key': API_KEY
    };

    // ---- Option A: include ONLY non-empty fields ----
    const rawFields = {
      long_email:        meta.long_email,
      due_date:          meta.due_date,
      gestational_weeks: meta.gestational_weeks,
      risk_level:        meta.risk_level,
      missing_checks:    meta.missing_checks
      // NOTE: subject_line intentionally omitted to avoid blank-value errors
    };
    const fieldEntries = Object.entries(rawFields)
      .filter(([_, v]) => (v ?? '').toString().trim().length > 0);

    // Prefer object format first; if 422, we’ll try array format as fallback
    const fieldsObject = Object.fromEntries(fieldEntries);
    const fieldsArray = fieldEntries.map(([slug, value]) => ({ slug, value }));

    const contactBase = {
      email,
      firstName: first_name || undefined
    };

    // 1) Create contact (object format first)
    let createResp = await fetch('https://api.systeme.io/api/contacts', {
      method: 'POST',
      headers,
      body: JSON.stringify({ ...contactBase, fields: fieldsObject })
    });
    let createText = await createResp.text();

    // If Unprocessable (422), try array-of-slug/value format
    if (createResp.status === 422) {
      createResp = await fetch('https://api.systeme.io/api/contacts', {
        method: 'POST',
        headers,
        body: JSON.stringify({ ...contactBase, fields: fieldsArray })
      });
      createText = await createResp.text();
    }

    if (!createResp.ok) {
      return fail(createResp.status, 'Create contact failed', createText);
    }

    // Parse contact ID
    let contactId = null;
    try {
      const j = JSON.parse(createText);
      contactId = j?.id || j?.contact?.id || null;
    } catch (e) {
      return fail(500, 'Create contact parse failed', createText);
    }
    if (!contactId) return fail(500, 'No contact ID returned', createText);

    // 2) Add tag to trigger Systeme automation
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
