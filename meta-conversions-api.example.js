const crypto = require('crypto');

const PIXEL_ID = process.env.META_PIXEL_ID;
const ACCESS_TOKEN = process.env.META_ACCESS_TOKEN;
const API_VERSION = process.env.META_API_VERSION || 'v20.0';

function normalize(value) {
  return String(value || '').trim().toLowerCase();
}

function sha256(value) {
  return crypto.createHash('sha256').update(normalize(value)).digest('hex');
}

async function sendMetaEvent(input) {
  const payload = {
    data: [
      {
        event_name: input.event_name,
        event_time: input.event_time || Math.floor(Date.now() / 1000),
        event_id: input.event_id,
        action_source: input.action_source || 'website',
        event_source_url: input.event_source_url,
        user_data: {
          em: input.user_data && input.user_data.email ? [sha256(input.user_data.email)] : undefined,
          ph: input.user_data && input.user_data.phone ? [sha256(input.user_data.phone)] : undefined,
          fn: input.user_data && input.user_data.first_name ? [sha256(input.user_data.first_name)] : undefined,
          ln: input.user_data && input.user_data.last_name ? [sha256(input.user_data.last_name)] : undefined,
          client_ip_address: input.user_data && input.user_data.client_ip_address,
          client_user_agent: input.user_data && input.user_data.client_user_agent,
          fbc: input.user_data && input.user_data.fbc,
          fbp: input.user_data && input.user_data.fbp,
          external_id: input.user_data && input.user_data.external_id
        },
        custom_data: input.custom_data || {}
      }
    ]
  };

  if (input.test_event_code) {
    payload.test_event_code = input.test_event_code;
  }

  const response = await fetch(
    `https://graph.facebook.com/${API_VERSION}/${PIXEL_ID}/events?access_token=${ACCESS_TOKEN}`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(payload)
    }
  );

  if (!response.ok) {
    const body = await response.text();
    throw new Error(`Meta Conversions API error: ${response.status} ${body}`);
  }

  return response.json();
}

module.exports = {
  sendMetaEvent,
  sha256
};
