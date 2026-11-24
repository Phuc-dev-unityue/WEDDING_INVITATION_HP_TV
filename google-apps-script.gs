/**
 * Google Apps Script cho Thiệp Cưới — Lưu & đồng bộ Lưu bút + RSVP trên Google Sheets
 * Cách dùng: Mở Google Sheets -> Tiện ích mở rộng -> Apps Script -> Dán toàn bộ code này -> Triển khai (Ứng dụng web, Ai cũng có quyền truy cập).
 */

const SHEET_WISHES = "LuuBut";
const SHEET_RSVP = "RSVP";
const MAX_WISHES = 200;

function getOrCreateSheet_(ss, name, headers) {
  let sheet = ss.getSheetByName(name);
  if (!sheet) {
    sheet = ss.insertSheet(name);
    sheet.appendRow(headers);
    sheet.getRange(1, 1, 1, headers.length).setFontWeight("bold");
    sheet.setFrozenRows(1);
  } else if (sheet.getLastRow() === 0) {
    sheet.appendRow(headers);
    sheet.getRange(1, 1, 1, headers.length).setFontWeight("bold");
    sheet.setFrozenRows(1);
  }
  return sheet;
}

function readWishesList_(ss) {
  const sheet = getOrCreateSheet_(ss, SHEET_WISHES, ["ID", "Họ tên", "Lời chúc", "Thời gian"]);
  const lastRow = sheet.getLastRow();
  if (lastRow < 2) return [];
  const rows = sheet.getRange(2, 1, lastRow - 1, 4).getValues();
  const wishes = [];
  for (let i = rows.length - 1; i >= 0; i--) {
    const [id, name, message, createdAt] = rows[i];
    const cleanName = String(name || "").trim();
    const cleanMsg = String(message || "").trim();
    if (!cleanName || !cleanMsg) continue;
    if (cleanName === "Team Thiết Kế" && cleanMsg.indexOf("Hẹn gặp Phúc & Vy ngày 29/11") !== -1) continue;
    wishes.push({
      id: id ? String(id) : "",
      name: cleanName.slice(0, 60),
      message: cleanMsg.slice(0, 500),
      createdAt: createdAt ? String(createdAt) : ""
    });
    if (wishes.length >= MAX_WISHES) break;
  }
  return wishes;
}

function jsonOutput_(obj) {
  return ContentService
    .createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON);
}

function doGet(e) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const type = e && e.parameter && e.parameter.type ? String(e.parameter.type) : "wishes";
  if (type === "rsvp") {
    const sheet = getOrCreateSheet_(ss, SHEET_RSVP, ["ID", "Họ tên", "Trạng thái", "Khách của", "Số liên hệ", "Ghi chú", "Thời gian"]);
    const total = Math.max(0, sheet.getLastRow() - 1);
    return jsonOutput_({ ok: true, configured: true, counts: { total: total } });
  }
  return jsonOutput_({ ok: true, configured: true, wishes: readWishesList_(ss) });
}

function doPost(e) {
  const lock = LockService.getScriptLock();
  lock.waitLock(10000);
  try {
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    const raw = e && e.postData && e.postData.contents ? e.postData.contents : "{}";
    const body = JSON.parse(raw);
    const action = body.action || (body.message ? "wish" : "rsvp");
    const nowIso = new Date().toISOString();

    if (action === "rsvp") {
      const name = String(body.name || "").trim().slice(0, 80);
      if (!name) return jsonOutput_({ ok: false, configured: true, error: "NAME_REQUIRED" });
      const sheet = getOrCreateSheet_(ss, SHEET_RSVP, ["ID", "Họ tên", "Trạng thái", "Khách của", "Số liên hệ", "Ghi chú", "Thời gian"]);
      const rowIdx = sheet.getLastRow() + 1;
      const phone = String(body.phone || "").trim().slice(0, 30);
      const id = "r_" + Date.now();
      const statusLabel = body.status === "no" ? "Không thể tham dự" : "Tham dự được";
      const side = body.side === "Nhà trai" ? "Nhà trai" : "Nhà gái";
      const note = String(body.note || "").trim().slice(0, 500);
      const createdAt = body.createdAt ? String(body.createdAt) : nowIso;
      sheet.getRange(rowIdx, 5).setNumberFormat("@");
      sheet.getRange(rowIdx, 1, 1, 7).setValues([[id, name, statusLabel, side, phone, note, createdAt]]);
      return jsonOutput_({ ok: true, configured: true });
    }

    const name = String(body.name || "").trim().slice(0, 60);
    const message = String(body.message || "").trim().slice(0, 500);
    if (!name || !message) {
      return jsonOutput_({ ok: false, configured: true, error: "NAME_AND_MESSAGE_REQUIRED" });
    }

    const id = String(body.id || ("w_" + Date.now())).trim().slice(0, 64);
    const createdAt = body.createdAt ? String(body.createdAt) : nowIso;
    const sheet = getOrCreateSheet_(ss, SHEET_WISHES, ["ID", "Họ tên", "Lời chúc", "Thời gian"]);
    const current = readWishesList_(ss);
    const duplicate = current.some(function (w) {
      if (w.id && w.id === id) return true;
      return w.name === name && w.message === message;
    });
    if (!duplicate) {
      sheet.appendRow([id, name, message, createdAt]);
    }
    return jsonOutput_({ ok: true, configured: true, wishes: readWishesList_(ss) });
  } catch (err) {
    return jsonOutput_({ ok: false, configured: true, error: String(err) });
  } finally {
    lock.releaseLock();
  }
}
