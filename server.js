const http = require('http');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const ROOT = __dirname;
const ENV_FILE = path.join(ROOT, '.env');

function loadEnvFile() {
  if (!fs.existsSync(ENV_FILE)) {
    return;
  }

  const raw = fs.readFileSync(ENV_FILE, 'utf8');
  raw.split(/\r?\n/).forEach((line) => {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) {
      return;
    }

    const separatorIndex = trimmed.indexOf('=');
    if (separatorIndex === -1) {
      return;
    }

    const key = trimmed.slice(0, separatorIndex).trim();
    const value = trimmed.slice(separatorIndex + 1).trim().replace(/^"(.*)"$/, '$1');

    if (key && process.env[key] == null) {
      process.env[key] = value;
    }
  });
}

loadEnvFile();

const PORT = Number(process.env.PORT || 3000);
const HOST = process.env.HOST || '127.0.0.1';
const PIXEL_ID = process.env.META_PIXEL_ID || '1265085375004506';
const ACCESS_TOKEN = process.env.META_ACCESS_TOKEN || '';
const API_VERSION = process.env.META_API_VERSION || 'v20.0';
const TEST_EVENT_CODE = process.env.META_TEST_EVENT_CODE || '';

const MIME_TYPES = {
  '.avif': 'image/avif',
  '.css': 'text/css; charset=utf-8',
  '.html': 'text/html; charset=utf-8',
  '.jpg': 'image/jpeg',
  '.js': 'application/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.png': 'image/png',
  '.svg': 'image/svg+xml',
  '.ttf': 'font/ttf',
  '.webp': 'image/webp'
};

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

function json(res, statusCode, body) {
  res.writeHead(statusCode, {
    'Content-Type': 'application/json; charset=utf-8',
    'Cache-Control': 'no-store',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET,POST,OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type'
  });
  res.end(JSON.stringify(body));
}

function sendFile(res, filePath) {
  const extension = path.extname(filePath).toLowerCase();
  const mimeType = MIME_TYPES[extension] || 'application/octet-stream';

  fs.readFile(filePath, (error, fileBuffer) => {
    if (error) {
      if (error.code === 'ENOENT') {
        json(res, 404, { ok: false, error: 'Arquivo nao encontrado' });
        return;
      }

      json(res, 500, { ok: false, error: 'Falha ao ler arquivo' });
      return;
    }

    res.writeHead(200, {
      'Content-Type': mimeType,
      'Cache-Control': extension === '.html' ? 'no-cache' : 'public, max-age=3600'
    });
    res.end(fileBuffer);
  });
}

function safePathFromUrl(urlPathname) {
  const requestedPath = urlPathname === '/' ? '/index.html' : urlPathname;
  const normalizedPath = path.normalize(decodeURIComponent(requestedPath)).replace(/^(\.\.[/\\])+/, '');
  const fullPath = path.join(ROOT, normalizedPath);

  if (!fullPath.startsWith(ROOT)) {
    return null;
  }

  return fullPath;
}

function collectBody(req) {
  return new Promise((resolve, reject) => {
    let body = '';

    req.on('data', (chunk) => {
      body += chunk;

      if (body.length > 1024 * 1024) {
        reject(new Error('Payload muito grande'));
        req.destroy();
      }
    });

    req.on('end', () => resolve(body));
    req.on('error', reject);
  });
}

function getClientIp(req) {
  const forwardedFor = req.headers['x-forwarded-for'];
  if (typeof forwardedFor === 'string' && forwardedFor.length > 0) {
    return forwardedFor.split(',')[0].trim();
  }

  return req.socket.remoteAddress || '';
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

const server = http.createServer(async (req, res) => {
  const requestUrl = new URL(req.url, `http://${req.headers.host || `${HOST}:${PORT}`}`);

  if (req.method === 'OPTIONS') {
    res.writeHead(204, {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET,POST,OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
      'Access-Control-Max-Age': '86400'
    });
    res.end();
    return;
  }

  if (req.method === 'POST' && requestUrl.pathname === '/api/meta/events') {
    try {
      const rawBody = await collectBody(req);
      const input = rawBody ? JSON.parse(rawBody) : {};

      if (!input.event_name) {
        json(res, 400, { ok: false, error: 'event_name e obrigatorio' });
        return;
      }

      const result = await forwardToMeta(input, req);
      json(res, 200, { ok: true, result });
      return;
    } catch (error) {
      json(res, 500, { ok: false, error: error.message });
      return;
    }
  }

  if (req.method !== 'GET' && req.method !== 'HEAD') {
    json(res, 405, { ok: false, error: 'Metodo nao permitido' });
    return;
  }

  const filePath = safePathFromUrl(requestUrl.pathname);
  if (!filePath) {
    json(res, 400, { ok: false, error: 'Caminho invalido' });
    return;
  }

  fs.stat(filePath, (error, stats) => {
    if (error) {
      json(res, 404, { ok: false, error: 'Arquivo nao encontrado' });
      return;
    }

    if (stats.isDirectory()) {
      sendFile(res, path.join(filePath, 'index.html'));
      return;
    }

    sendFile(res, filePath);
  });
});

server.listen(PORT, HOST, () => {
  console.log(`Servidor em http://${HOST}:${PORT}`);
});
