const {
  getRedisConfig,
  redisCommand,
  redisPipeline,
  readJsonBody,
  sendJson,
  parseJsonList
} = require("./_store");

const RSVP_KEY = "wedding:phuc_vy:rsvp:v1";
const MAX_RSVP = 500;

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
        counts: { total: 0, attending: 0, declined: 0 }
      });
      return;
    }

    try {
      const records = parseJsonList(await redisCommand(config, ["LRANGE", RSVP_KEY, 0, MAX_RSVP - 1]));
      const attending = records.filter((r) => r.status === "yes").length;
      const counts = {
        total: records.length,
        attending,
        declined: records.length - attending
      };

      const adminKey = process.env.RSVP_ADMIN_KEY;
      const reqUrl = new URL(req.url || "/api/rsvp", "http://localhost");
      const providedKey = req.headers["x-admin-key"] || reqUrl.searchParams.get("key") || "";
      const includeRecords = Boolean(adminKey && providedKey === adminKey);

      sendJson(
        res,
        200,
        includeRecords
          ? { ok: true, configured: true, counts, records }
          : { ok: true, configured: true, counts }
      );
    } catch (err) {
      console.error("GET /api/rsvp error:", err);
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

    const name = String(body.name || "").trim().slice(0, 80);
    if (!name) {
      sendJson(res, 400, { ok: false, error: "NAME_REQUIRED" });
      return;
    }

    const status = body.status === "no" ? "no" : "yes";
    const side = body.side === "Nhà trai" ? "Nhà trai" : "Nhà gái";
    const phone = String(body.phone || "").trim().slice(0, 30);
    const note = String(body.note || "").trim().slice(0, 500);
    const nowMs = Date.now();

    const record = {
      id: `r_${nowMs}_${Math.random().toString(36).slice(2, 8)}`,
      name,
      status,
      side,
      phone,
      note,
      createdAt:
        typeof body.createdAt === "string" && !Number.isNaN(Date.parse(body.createdAt))
          ? body.createdAt
          : new Date(nowMs).toISOString()
    };

    try {
      await redisPipeline(config, [
        ["LPUSH", RSVP_KEY, JSON.stringify(record)],
        ["LTRIM", RSVP_KEY, 0, MAX_RSVP - 1]
      ]);
      sendJson(res, 201, { ok: true, configured: true, record });
    } catch (err) {
      console.error("POST /api/rsvp error:", err);
      sendJson(res, 500, { ok: false, configured: true, error: "STORAGE_WRITE_FAILED" });
    }
    return;
  }

  res.setHeader("Allow", "GET, POST, OPTIONS");
  sendJson(res, 405, { ok: false, error: "METHOD_NOT_ALLOWED" });
};
