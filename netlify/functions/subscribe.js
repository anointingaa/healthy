// netlify/functions/subscribe.js
// Upsert contact in Systeme.io, trimming fields to 255, then apply tag to trigger email.

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
      return fail(400, 'Email required');
    }

    // Parse body
    let payload = {};
    try { payload = JSON.parse(event.body || '{}'); }
    catch (e) { return fail(400, 'Bad JSON body', String(e)); }

    const { email, meta = {}, first_name } = payload;
    if (!email) return fail(400, 'Email required');

    // Env
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
      'Api-Key': API_KEY // some accounts honor this casing
    };

    // Build fields ARRAY (slug/value) — ONLY non-empty, each trimmed to 255
    const rawFields = {
      long_email:        meta.long_email,
      due_date:          meta.due_date,
      gestational_weeks: meta.gestational_weeks,
      risk_level:        meta.risk_level,
      missing_checks:    meta.missing_checks
    };
    const fieldsArray = Object.entries(rawFields)
      .map(([slug, value]) => ({ slug, value: trim255(value) }))
      .filter(({ value }) => value.trim().length > 0);

    const contactBody = {
      email,
      firstName: first_name || undefined,
      fields: fieldsArray
    };

    // ---- Helper: search contact by email (try 2 endpoints) ----
    const findContactByEmail = async (emailToFind) => {
      // Try v1 style search
      let r = await fetch(`https://api.systeme.io/api/contacts?email=${encodeURIComponent(emailToFind)}`, {
        method: 'GET',
        headers
      });
      let t = await r.text();
      if (r.ok) {
        try {
          const j = JSON.parse(t);
          // Accept either {items:[{id:...}]} or {data:[{id:...}]} or direct {id:...}
          const found = j?.items?.[0]?.id || j?.data?.[0]?.id || j?.id || null;
          if (found) return found;
        } catch {}
      }
      // Try explicit search endpoint (if available on your account)
      r = await fetch('https://api.systeme.io/api/contacts/search', {
        method: 'POST',
        headers,
        body: JSON.stringify({ email: emailToFind })
      });
      t = await r.text();
      if (r.ok) {
        try {
          const j = JSON.parse(t);
          const found = j?.items?.[0]?.id || j?.data?.[0]?.id || j?.id || null;
          if (found) return found;
        } catch {}
      }
      return null;
    };

    // ---- Helper: update fields on existing contact (PATCH if available, else POST to /contacts/{id}) ----
    const updateContactFields = async (contactId, fieldsArr) => {
      // Try PATCH
      let r = await fetch(`https://api.systeme.io/api/contacts/${contactId}`, {
        method: 'PATCH',
        headers,
        body: JSON.stringify({ fields: fieldsArr })
      });
      let t = await r.text();
      if (r.ok) return true;

      // Fallback: sometimes POST update works on some accounts
      r = await fetch(`https://api.systeme.io/api/contacts/${contactId}`, {
        method: 'POST',
        headers,
        body: JSON.stringify({ fields: fieldsArr })
      });
      t = await r.text();
      return r.ok;
    };

    // ---- Helper: tag a contact ----
    const tagContact = async (contactId) => {
      const tr = await fetch(`https://api.systeme.io/api/contacts/${contactId}/tags`, {
        method: 'POST',
        headers,
        body: JSON.stringify({ tagId: TAG_ID })
      });
      const tt = await tr.text();
      if (!tr.ok) throw new Error(`Tag assign failed: ${tt}`);
    };

    // 1) Try to CREATE
    let createResp = await fetch('https://api.systeme.io/api/contacts', {
      method: 'POST',
      headers,
      body: JSON.stringify(contactBody)
    });
    let createText = await createResp.text();

    if (!createResp.ok) {
      // If email already exists, upsert (find → update → tag)
      if (createResp.status === 400 || createResp.status === 409 || createResp.status === 422) {
        const lower = createText.toLowerCase();
        if (lower.includes('already used') || lower.includes('already exists')) {
          const existingId = await findContactByEmail(email);
          if (!existingId) {
            return fail(createResp.status, 'Email exists but contact not found by email search', createText);
          }
          // Update fields (safe: all <=255)
          if (fieldsArray.length > 0) {
            const ok = await updateContactFields(existingId, fieldsArray);
            if (!ok) {
              // Not fatal for sending email; proceed to tag anyway
              console.warn('[subscribe] Could not update existing fields; proceeding to tag');
            }
          }
          // Tag to fire automation
          await tagContact(existingId);
          return { statusCode: 200, body: JSON.stringify({ message: 'Success (existing contact updated/tagged)', contactId: existingId }) };
        }
      }
      // Other create errors
      return fail(createResp.status, 'Create contact failed', createText);
    }

    // Parse ID on fresh create
    let contactId = null;
    try {
      const j = JSON.parse(createText);
      contactId = j?.id || j?.contact?.id || null;
    } catch (e) {
      return fail(500, 'Create contact parse failed', createText);
    }
    if (!contactId) return fail(500, 'No contact ID returned', createText);

    // 2) Tag newly created contact
    await tagContact(contactId);

    return { statusCode: 200, body: JSON.stringify({ message: 'Success (new contact created/tagged)', contactId }) };
  } catch (e) {
    return fail(500, 'Server error', String(e));
  }
};
