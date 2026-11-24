/**
 * Shared Upstash Redis / Vercel KV REST helper for Vercel Serverless Functions.
 * Zero external dependencies — uses native Node.js fetch (Vercel Node 18+).
 */

const MAX_BODY_BYTES = 16384;

function parseUpstashConnectionUrl(connStr) {
  if (!connStr || !/^rediss?:\/\//i.test(connStr)) return null;
  try {
    const parsed = new URL(connStr);
    if (!/\.upstash\.io$/i.test(parsed.hostname) || !parsed.password) return null;
    return {
      url: `https://${parsed.hostname}`,
      token: decodeURIComponent(parsed.password)
    };
  } catch (_) {
    return null;
  }
}

function getRedisConfig() {
  const explicitPairs = [
    ["UPSTASH_REDIS_REST_URL", "UPSTASH_REDIS_REST_TOKEN"],
    ["KV_REST_API_URL", "KV_REST_API_TOKEN"]
  ];

  for (const [urlKey, tokenKey] of explicitPairs) {
    const url = process.env[urlKey];
    const token = process.env[tokenKey];
    if (url && token) {
      return { url: url.replace(/\/+$/, ""), token };
    }
  }

  for (const key of Object.keys(process.env)) {
    if (!/(?:^|_)(?:REDIS_REST_URL|KV_REST_API_URL)$/i.test(key)) continue;
    const prefix = key.replace(/_URL$/i, "");
    const url = process.env[key];
    const token = process.env[`${prefix}_TOKEN`];
    if (url && token) {
      return { url: url.replace(/\/+$/, ""), token };
    }
  }

  for (const key of ["UPSTASH_REDIS_URL", "KV_URL", "REDIS_URL", ...Object.keys(process.env)]) {
    if (!/(?:^|_)(?:REDIS_URL|KV_URL)$/i.test(key)) continue;
    const parsed = parseUpstashConnectionUrl(process.env[key]);
    if (parsed) return parsed;
  }

  return null;
}

function getRedisDiagnosticReason() {
  if (process.env.REDIS_URL && !parseUpstashConnectionUrl(process.env.REDIS_URL)) {
    return "NON_UPSTASH_REDIS_URL";
  }
  return "MISSING_STORAGE_ENV";
}

async function redisRequest(config, pathSuffix, body) {
  const res = await fetch(`${config.url}${pathSuffix}`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${config.token}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify(body)
  });

  if (!res.ok) {
    const detail = await res.text().catch(() => "");
    throw new Error(`Redis REST HTTP ${res.status}: ${detail.slice(0, 200)}`);
  }

  return res.json();
}

async function redisCommand(config, command) {
  const data = await redisRequest(config, "", command);
  if (data && data.error) throw new Error(String(data.error));
  return data ? data.result : null;
}

async function redisPipeline(config, commands) {
  const data = await redisRequest(config, "/pipeline", commands);
  if (!Array.isArray(data)) {
    throw new Error("Unexpected Redis pipeline response");
  }
  return data.map((item) => {
    if (item && item.error) throw new Error(String(item.error));
    return item ? item.result : null;
  });
}

async function readJsonBody(req) {
  if (req.body !== undefined && req.body !== null) {
    if (typeof req.body === "object" && !Buffer.isBuffer(req.body)) {
      return req.body;
    }
    const text = Buffer.isBuffer(req.body) ? req.body.toString("utf8") : String(req.body);
    return text.trim() ? JSON.parse(text) : {};
  }

  const chunks = [];
  let total = 0;
  for await (const chunk of req) {
    total += chunk.length;
    if (total > MAX_BODY_BYTES) {
      throw Object.assign(new Error("PAYLOAD_TOO_LARGE"), { statusCode: 413 });
    }
    chunks.push(chunk);
  }
  const raw = Buffer.concat(chunks).toString("utf8").trim();
  return raw ? JSON.parse(raw) : {};
}

function sendJson(res, statusCode, payload) {
  res.statusCode = statusCode;
  res.setHeader("Content-Type", "application/json; charset=utf-8");
  res.setHeader("Cache-Control", "no-store, no-cache, must-revalidate");
  res.setHeader("Pragma", "no-cache");
  res.end(JSON.stringify(payload));
}

function isRemovedSeedWish(item) {
  return (
    Boolean(item) &&
    String(item.name || "").trim() === "Team Thiết Kế" &&
    String(item.message || "").includes("Hẹn gặp Phúc & Vy ngày 29/11")
  );
}

function parseJsonList(rawItems) {
  if (!Array.isArray(rawItems)) return [];
  const parsed = [];
  for (const raw of rawItems) {
    try {
      const obj = typeof raw === "string" ? JSON.parse(raw) : raw;
      if (obj && typeof obj === "object") parsed.push(obj);
    } catch (_) {
      // Ignore malformed legacy entry rather than breaking reads.
    }
  }
  return parsed;
}

module.exports = {
  getRedisConfig,
  getRedisDiagnosticReason,
  redisCommand,
  redisPipeline,
  readJsonBody,
  sendJson,
  isRemovedSeedWish,
  parseJsonList
};
