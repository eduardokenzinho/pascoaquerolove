const crypto = require('crypto');

const PIXEL_ID = process.env.META_PIXEL_ID || '1265085375004506';
const ACCESS_TOKEN = process.env.META_ACCESS_TOKEN || '';
const API_VERSION = process.env.META_API_VERSION || 'v20.0';
const TEST_EVENT_CODE = process.env.META_TEST_EVENT_CODE || '';

function normalize(value) {
  return String(value || '').trim().toLowerCase();
}

function sha256(value) {
  return crypto.createHash('sha256').update(normalize(value)).digest('hex');
}

function isSha256(value) {
  return /^[a-f0-9]{64}$/i.test(String(value || ''));
}

function hashIfNeeded(value) {
  if (!value) {
    return undefined;
  }

  return isSha256(value) ? String(value).toLowerCase() : sha256(value);
}

function sendJson(res, statusCode, body) {
  res.status(statusCode);
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  res.setHeader('Cache-Control', 'no-store');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  res.send(JSON.stringify(body));
}

function getClientIp(req) {
  const forwardedFor = req.headers['x-forwarded-for'];
  if (typeof forwardedFor === 'string' && forwardedFor.length > 0) {
    return forwardedFor.split(',')[0].trim();
  }

  if (req.socket && req.socket.remoteAddress) {
    return req.socket.remoteAddress;
  }

  return '';
}

async function forwardToMeta(input, req) {
  if (!ACCESS_TOKEN) {
    throw new Error('META_ACCESS_TOKEN nao configurado no ambiente');
  }

  const userData = input.user_data || {};
  const payload = {
    data: [
      {
        event_name: input.event_name,
        event_time: input.event_time || Math.floor(Date.now() / 1000),
        event_id: input.event_id,
        action_source: input.action_source || 'website',
        event_source_url: input.event_source_url,
        user_data: {
          em: hashIfNeeded(userData.em) ? [hashIfNeeded(userData.em)] : undefined,
          ph: hashIfNeeded(userData.ph) ? [hashIfNeeded(userData.ph)] : undefined,
          fn: hashIfNeeded(userData.fn) ? [hashIfNeeded(userData.fn)] : undefined,
          ln: hashIfNeeded(userData.ln) ? [hashIfNeeded(userData.ln)] : undefined,
          external_id: hashIfNeeded(userData.external_id),
          client_ip_address: userData.client_ip_address || getClientIp(req),
          client_user_agent: userData.client_user_agent || req.headers['user-agent'] || '',
          fbc: userData.fbc || undefined,
          fbp: userData.fbp || undefined
        },
        custom_data: input.custom_data || {}
      }
    ]
  };

  if (input.test_event_code || TEST_EVENT_CODE) {
    payload.test_event_code = input.test_event_code || TEST_EVENT_CODE;
  }

  const metaResponse = await fetch(
    `https://graph.facebook.com/${API_VERSION}/${PIXEL_ID}/events?access_token=${ACCESS_TOKEN}`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(payload)
    }
  );

  const rawText = await metaResponse.text();
  let parsed;

  try {
    parsed = rawText ? JSON.parse(rawText) : {};
  } catch (error) {
    parsed = { raw: rawText };
  }

  if (!metaResponse.ok) {
    throw new Error(`Meta API ${metaResponse.status}: ${rawText}`);
  }

  return parsed;
}

module.exports = async function handler(req, res) {
  if (req.method === 'OPTIONS') {
    res.status(204);
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET,POST,OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
    res.setHeader('Access-Control-Max-Age', '86400');
    res.end();
    return;
  }

  if (req.method !== 'POST') {
    sendJson(res, 405, { ok: false, error: 'Metodo nao permitido' });
    return;
  }

  try {
    const input = typeof req.body === 'string' ? JSON.parse(req.body) : (req.body || {});

    if (!input.event_name) {
      sendJson(res, 400, { ok: false, error: 'event_name e obrigatorio' });
      return;
    }

    const result = await forwardToMeta(input, req);
    sendJson(res, 200, { ok: true, result });
  } catch (error) {
    sendJson(res, 500, { ok: false, error: error.message });
  }
};
