// netlify/functions/subscribe.js
exports.handler = async (event) => {
  const fail = (code, msg, detail) => {
    console.error('[subscribe]', msg, detail || '');
    return { statusCode: code, body: JSON.stringify({ error: msg, detail: detail || null }) };
  };

  try {
    if (event.httpMethod !== 'POST') {
      return fail(400, 'Email required'); // simple GET probe
    }

    let payload = {};
    try { payload = JSON.parse(event.body || '{}'); }
    catch (e) { return fail(400, 'Bad JSON body', String(e)); }

    const { email, meta = {}, first_name } = payload;
    if (!email) return fail(400, 'Email required');

    // Trim env vars in case of accidental spaces
    const API_KEY_RAW = process.env.SYSTEME_API_KEY || '';
    const API_KEY = API_KEY_RAW.trim();
    const TAG_ID_RAW = process.env.SYSTEME_TAG_ID || '';
    const TAG_ID = TAG_ID_RAW.trim();

    if (!API_KEY || !TAG_ID) {
      return fail(500, 'Missing SYSTEME_API_KEY or SYSTEME_TAG_ID', { API_KEY_LEN: API_KEY.length, TAG_ID });
    }

    // Try both common header names once; some accounts expect different casing
    const tryHeaders = (key) => ({
      'Content-Type': 'application/json',
      'Accept': 'application/json',
      'X-API-Key': key,          // primary
      'Api-Key': key             // fallback some setups accept
    });

    // Systeme endpoint candidates (we'll try primary, then fallback if 404)
    const endpoints = [
      'https://api.systeme.io/api/contacts',  // primary (most docs)
      'https://api.systeme.io/contacts'       // fallback (older route)
    ];

    // 1) Create contact with fields
    const contactBody = {
      email,
      firstName: first_name || undefined,
      fields: [
        { slug: 'long_email',        value: meta.long_email || '' },
        { slug: 'due_date',          value: meta.due_date || '' },
        { slug: 'gestational_weeks', value: meta.gestational_weeks || '' },
        { slug: 'risk_level',        value: meta.risk_level || '' },
        { slug: 'missing_checks',    value: meta.missing_checks || '' },
        { slug: 'subject_line',      value: meta.subject_line || '' }
      ]
    };

    let createResp, createText, endpointUsed = null;
    for (const url of endpoints) {
      createResp = await fetch(url, {
        method: 'POST',
        headers: tryHeaders(API_KEY),
        body: JSON.stringify(contactBody)
      });
      createText = await createResp.text();
      if (createResp.ok || createResp.status !== 404) { endpointUsed = url; break; }
    }

    if (!createResp.ok) {
      return fail(createResp.status, 'Create contact failed', { endpointUsed, body: createText });
    }

    let contactId = null;
    try {
      const json = JSON.parse(createText);
      contactId = json?.id || json?.contact?.id || null;
    } catch (e) {
      return fail(500, 'Create contact parse failed', createText);
    }
    if (!contactId) return fail(500, 'No contact ID returned', createText);

    // 2) Tag the contact to fire your automation
    const tagResp = await fetch(`https://api.systeme.io/api/contacts/${contactId}/tags`, {
      method: 'POST',
      headers: tryHeaders(API_KEY),
      body: JSON.stringify({ tagId: TAG_ID })
    });
    const tagText = await tagResp.text();
    if (!tagResp.ok) {
      return fail(tagResp.status, 'Tag assign failed', tagText);
    }

    return { statusCode: 200, body: JSON.stringify({ message: 'Success', contactId, endpointUsed }) };
  } catch (e) {
    return fail(500, 'Server error', String(e));
  }
};
