const {
  getRedisConfig,
  getRedisDiagnosticReason,
  redisCommand,
  redisPipeline,
  readJsonBody,
  sendJson,
  isRemovedSeedWish,
  parseJsonList
} = require("./_store");

const WISHES_KEY = "wedding:phuc_vy:wishes:v1";
const MAX_WISHES = 200;

function sanitizeWishes(rawItems) {
  return parseJsonList(rawItems)
    .filter((w) => w.name && w.message && !isRemovedSeedWish(w))
    .map((w) => ({
      id: w.id ? String(w.id) : undefined,
      name: String(w.name).trim().slice(0, 60),
      message: String(w.message).trim().slice(0, 500),
      createdAt: w.createdAt ? String(w.createdAt) : ""
    }));
}

module.exports = async function handler(req, res) {
  if (req.method === "OPTIONS") {
    res.statusCode = 204;
    res.setHeader("Allow", "GET, POST, OPTIONS");
    res.end();
    return;
  }

  const config = getRedisConfig();

  if (req.method === "GET") {
    if (!config) {
      sendJson(res, 200, {
        ok: true,
        configured: false,
        reason: getRedisDiagnosticReason(),
        wishes: []
      });
      return;
    }

    try {
      const rawItems = await redisCommand(config, ["LRANGE", WISHES_KEY, 0, MAX_WISHES - 1]);
      sendJson(res, 200, { ok: true, configured: true, wishes: sanitizeWishes(rawItems) });
    } catch (err) {
      console.error("GET /api/wishes error:", err);
      sendJson(res, 500, { ok: false, configured: true, error: "STORAGE_READ_FAILED" });
    }
    return;
  }

  if (req.method === "POST") {
    if (!config) {
      sendJson(res, 503, { ok: false, configured: false, error: "STORAGE_NOT_CONFIGURED" });
      return;
    }

    let body;
    try {
      body = await readJsonBody(req);
    } catch (err) {
      sendJson(res, err.statusCode || 400, { ok: false, error: "INVALID_JSON" });
      return;
    }

    const name = String(body.name || "").trim().slice(0, 60);
    const message = String(body.message || "").trim().slice(0, 500);
    if (!name || !message) {
      sendJson(res, 400, { ok: false, error: "NAME_AND_MESSAGE_REQUIRED" });
      return;
    }

    const nowMs = Date.now();
    const rawId = String(body.id || "").trim().slice(0, 64);
    const entry = {
      id: rawId || `w_${nowMs}_${Math.random().toString(36).slice(2, 8)}`,
      name,
      message,
      createdAt:
        typeof body.createdAt === "string" && !Number.isNaN(Date.parse(body.createdAt))
          ? body.createdAt
          : new Date(nowMs).toISOString()
    };

    try {
      const recent = sanitizeWishes(await redisCommand(config, ["LRANGE", WISHES_KEY, 0, 9]));
      const duplicate = recent.find((item) => {
        if (item.id && item.id === entry.id) return true;
        if (item.name !== entry.name || item.message !== entry.message) return false;
        const t = Date.parse(item.createdAt);
        return !Number.isNaN(t) && Math.abs(nowMs - t) < 15000;
      });

      if (duplicate) {
        const allRaw = await redisCommand(config, ["LRANGE", WISHES_KEY, 0, MAX_WISHES - 1]);
        sendJson(res, 200, { ok: true, configured: true, wish: duplicate, wishes: sanitizeWishes(allRaw) });
        return;
      }

      const [, , listRaw] = await redisPipeline(config, [
        ["LPUSH", WISHES_KEY, JSON.stringify(entry)],
        ["LTRIM", WISHES_KEY, 0, MAX_WISHES - 1],
        ["LRANGE", WISHES_KEY, 0, MAX_WISHES - 1]
      ]);

      sendJson(res, 201, { ok: true, configured: true, wish: entry, wishes: sanitizeWishes(listRaw) });
    } catch (err) {
      console.error("POST /api/wishes error:", err);
      sendJson(res, 500, { ok: false, configured: true, error: "STORAGE_WRITE_FAILED" });
    }
    return;
  }

  res.setHeader("Allow", "GET, POST, OPTIONS");
  sendJson(res, 405, { ok: false, error: "METHOD_NOT_ALLOWED" });
};
