// netlify/functions/subscribe.js
// Upsert a Systeme.io contact, accept chunked long fields (long_1..long_8), trim to 255, then apply tag.

exports.handler = async (event) => {
  const fail = (code, msg, detail) => {
    console.error('[subscribe]', msg, detail || '');
    return { statusCode: code, body: JSON.stringify({ error: msg, detail: detail || null }) };
  };

  const trim255 = (v) => {
    const s = (v ?? '').toString();
    return s.length > 255 ? s.slice(0, 255) : s;
  };

  try {
    if (event.httpMethod !== 'POST') {
      return fail(400, 'Email required'); // simple probe
    }

    // Parse request
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

    // Headers
    const headers = {
      'Content-Type': 'application/json',
      'Accept': 'application/json',
      'X-API-Key': API_KEY,
      'Api-Key': API_KEY // some accounts accept this casing
    };

    // Build fields from meta:
    // - core short fields (preview + facts)
    // - dynamic long_n chunks (long_1..long_8)
    const rawFields = {
      long_email_preview: meta.long_email_preview,
      due_date:           meta.due_date,
      gestational_weeks:  meta.gestational_weeks,
      risk_level:         meta.risk_level,
      missing_checks:     meta.missing_checks
    };
    Object.keys(meta).forEach((k) => {
      if (/^long_\d+$/.test(k)) rawFields[k] = meta[k];
    });

    // Trim and filter blanks; send as ARRAY [{slug,value}] (slug format is required)
    const fieldsArray = Object.entries(rawFields)
      .map(([slug, value]) => ({ slug, value: trim255(value) }))
      .filter(({ value }) => value && value.toString().trim().length > 0);

    const contactBody = {
      email,
      firstName: first_name || undefined,
      fields: fieldsArray
    };

    // Helpers
    const findContactByEmail = async (emailToFind) => {
      // Try GET /api/contacts?email=
      let r = await fetch(`https://api.systeme.io/api/contacts?email=${encodeURIComponent(emailToFind)}`, {
        method: 'GET', headers
      });
      let t = await r.text();
      if (r.ok) {
        try {
          const j = JSON.parse(t);
          return j?.items?.[0]?.id || j?.data?.[0]?.id || j?.id || null;
        } catch {}
      }
      // Fallback search endpoint (some accounts)
      r = await fetch('https://api.systeme.io/api/contacts/search', {
        method: 'POST', headers, body: JSON.stringify({ email: emailToFind })
      });
      t = await r.text();
      if (r.ok) {
        try {
          const j = JSON.parse(t);
          return j?.items?.[0]?.id || j?.data?.[0]?.id || j?.id || null;
        } catch {}
      }
      return null;
    };

    const updateContactFields = async (contactId, fieldsArr) => {
      // PATCH first
      let r = await fetch(`https://api.systeme.io/api/contacts/${contactId}`, {
        method: 'PATCH', headers, body: JSON.stringify({ fields: fieldsArr })
      });
      if (r.ok) return true;
      // Fallback POST (some accounts allow)
      r = await fetch(`https://api.systeme.io/api/contacts/${contactId}`, {
        method: 'POST', headers, body: JSON.stringify({ fields: fieldsArr })
      });
      return r.ok;
    };

    const tagContact = async (contactId) => {
      const tr = await fetch(`https://api.systeme.io/api/contacts/${contactId}/tags`, {
        method: 'POST', headers, body: JSON.stringify({ tagId: TAG_ID })
      });
      const tt = await tr.text();
      if (!tr.ok) throw new Error(`Tag assign failed: ${tt}`);
    };

    // 1) Try CREATE
    let createResp = await fetch('https://api.systeme.io/api/contacts', {
      method: 'POST', headers, body: JSON.stringify(contactBody)
    });
    let createText = await createResp.text();

    if (!createResp.ok) {
      const lower = createText.toLowerCase();
      const isDup = createResp.status === 400 || createResp.status === 409 || createResp.status === 422;
      if (isDup && (lower.includes('already used') || lower.includes('already exists'))) {
        // Upsert path
        const existingId = await findContactByEmail(email);
        if (!existingId) return fail(createResp.status, 'Email exists but contact not found by search', createText);

        if (fieldsArray.length > 0) {
          const ok = await updateContactFields(existingId, fieldsArray);
          if (!ok) console.warn('[subscribe] Could not update existing fields; proceeding to tag');
        }
        await tagContact(existingId);
        return { statusCode: 200, body: JSON.stringify({ message: 'Success (existing contact updated/tagged)', contactId: existingId }) };
      }
      return fail(createResp.status, 'Create contact failed', createText);
    }

    // 2) Fresh create → parse ID and tag
    let contactId = null;
    try {
      const j = JSON.parse(createText);
      contactId = j?.id || j?.contact?.id || null;
    } catch (e) {
      return fail(500, 'Create contact parse failed', createText);
    }
    if (!contactId) return fail(500, 'No contact ID returned', createText);

    await tagContact(contactId);
    return { statusCode: 200, body: JSON.stringify({ message: 'Success (new contact created/tagged)', contactId }) };

  } catch (e) {
    return fail(500, 'Server error', String(e));
  }
};
