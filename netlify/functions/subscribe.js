// Netlify function – ConvertKit subscribe (uses env vars)
exports.handler = async function(event) {
  try {
    const { email, meta } = JSON.parse(event.body || '{}');
    if (!email) return { statusCode: 400, body: JSON.stringify({ error: 'Email required' }) };

    const FORM_ID = process.env.CONVERTKIT_FORM_ID;
    const API_KEY = process.env.CONVERTKIT_API_KEY;
    if (!FORM_ID || !API_KEY) {
      return { statusCode: 500, body: JSON.stringify({ error: 'Server not configured' }) };
    }

    const payload = { api_key: API_KEY, email, fields: meta || {} };
    const url = `https://api.convertkit.com/v3/forms/${FORM_ID}/subscribe`;

    const resp = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });

    if (!resp.ok) {
      return { statusCode: resp.status, body: JSON.stringify({ error: 'Failed to subscribe' }) };
    }
    const data = await resp.json();
    return { statusCode: 200, body: JSON.stringify({ message: 'Success', data }) };
  } catch (e) {
    return { statusCode: 500, body: JSON.stringify({ error: 'Server error' }) };
  }
};
