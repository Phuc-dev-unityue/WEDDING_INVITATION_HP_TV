"""Lightweight static preview server with HTTP byte-range + local guestbook/RSVP API support."""

from datetime import datetime, timezone
import http.server
import json
import os
import re
import socketserver
import sys
import threading
import time
import urllib.parse
from functools import partial

RANGE_RE = re.compile(r"bytes=(\d*)-(\d*)$")
DATA_LOCK = threading.Lock()
DATA_FILE = os.path.join(os.path.dirname(os.path.abspath(__file__)), ".local-data", "guestbook.json")


def _load_store():
    if not os.path.isfile(DATA_FILE):
        return {"wishes": [], "rsvp": []}
    try:
        with open(DATA_FILE, "r", encoding="utf-8") as fh:
            data = json.load(fh)
            return {
                "wishes": data.get("wishes", []) if isinstance(data.get("wishes"), list) else [],
                "rsvp": data.get("rsvp", []) if isinstance(data.get("rsvp"), list) else [],
            }
    except Exception:
        return {"wishes": [], "rsvp": []}


def _save_store(data):
    os.makedirs(os.path.dirname(DATA_FILE), exist_ok=True)
    with open(DATA_FILE, "w", encoding="utf-8") as fh:
        json.dump(data, fh, ensure_ascii=False, indent=2)


class RangeHTTPRequestHandler(http.server.SimpleHTTPRequestHandler):
    def _send_json(self, status_code, payload):
        raw = json.dumps(payload, ensure_ascii=False).encode("utf-8")
        self.send_response(status_code)
        self.send_header("Content-Type", "application/json; charset=utf-8")
        self.send_header("Cache-Control", "no-store, no-cache, must-revalidate")
        self.send_header("Content-Length", str(len(raw)))
        self.end_headers()
        self.wfile.write(raw)

    def _read_json(self):
        try:
            length = int(self.headers.get("Content-Length") or "0")
        except ValueError:
            return None
        if length <= 0 or length > 16384:
            return None
        raw = self.rfile.read(length)
        try:
            return json.loads(raw.decode("utf-8"))
        except Exception:
            return None

    def do_OPTIONS(self):
        route = urllib.parse.urlsplit(self.path).path
        if route in ("/api/wishes", "/api/rsvp"):
            self.send_response(204)
            self.send_header("Allow", "GET, POST, OPTIONS")
            self.end_headers()
            return
        self.send_error(http.HTTPStatus.METHOD_NOT_ALLOWED)

    def do_GET(self):
        route = urllib.parse.urlsplit(self.path).path
        if route == "/api/wishes":
            with DATA_LOCK:
                wishes = _load_store()["wishes"]
            self._send_json(200, {"ok": True, "configured": True, "wishes": wishes})
            return
        if route == "/api/rsvp":
            with DATA_LOCK:
                records = _load_store()["rsvp"]
            attending = sum(1 for r in records if r.get("status") == "yes")
            self._send_json(
                200,
                {
                    "ok": True,
                    "configured": True,
                    "counts": {"total": len(records), "attending": attending, "declined": len(records) - attending},
                },
            )
            return
        super().do_GET()

    def do_POST(self):
        route = urllib.parse.urlsplit(self.path).path
        if route not in ("/api/wishes", "/api/rsvp"):
            self._send_json(404, {"ok": False, "error": "NOT_FOUND"})
            return

        body = self._read_json()
        if not isinstance(body, dict):
            self._send_json(400, {"ok": False, "error": "INVALID_JSON"})
            return

        now_iso = datetime.now(timezone.utc).isoformat()
        now_ms = int(time.time() * 1000)

        if route == "/api/wishes":
            name = str(body.get("name") or "").strip()[:60]
            message = str(body.get("message") or "").strip()[:500]
            if not name or not message:
                self._send_json(400, {"ok": False, "error": "NAME_AND_MESSAGE_REQUIRED"})
                return
            entry = {
                "id": str(body.get("id") or f"w_{now_ms}")[:64],
                "name": name,
                "message": message,
                "createdAt": str(body.get("createdAt") or now_iso),
            }
            with DATA_LOCK:
                store = _load_store()
                if not any(w.get("id") == entry["id"] for w in store["wishes"][:10]):
                    store["wishes"].insert(0, entry)
                    store["wishes"] = store["wishes"][:200]
                    _save_store(store)
                wishes = store["wishes"]
            self._send_json(201, {"ok": True, "configured": True, "wish": entry, "wishes": wishes})
            return

        name = str(body.get("name") or "").strip()[:80]
        if not name:
            self._send_json(400, {"ok": False, "error": "NAME_REQUIRED"})
            return
        record = {
            "id": f"r_{now_ms}",
            "name": name,
            "status": "no" if body.get("status") == "no" else "yes",
            "side": "Nhà trai" if body.get("side") == "Nhà trai" else "Nhà gái",
            "phone": str(body.get("phone") or "").strip()[:30],
            "note": str(body.get("note") or "").strip()[:500],
            "createdAt": str(body.get("createdAt") or now_iso),
        }
        with DATA_LOCK:
            store = _load_store()
            store["rsvp"].insert(0, record)
            store["rsvp"] = store["rsvp"][:500]
            _save_store(store)
        self._send_json(201, {"ok": True, "configured": True, "record": record})
    def send_head(self):
        path = self.translate_path(self.path)
        if os.path.isdir(path):
            index_file = os.path.join(path, "index.html")
            if os.path.isfile(index_file):
                path = index_file
            else:
                return super().send_head()

        ctype = self.guess_type(path)
        try:
            f = open(path, "rb")
        except OSError:
            self.send_error(http.HTTPStatus.NOT_FOUND, "File not found")
            return None

        try:
            fs = os.fstat(f.fileno())
            size = fs.st_size
            range_header = self.headers.get("Range")
            if range_header:
                m = RANGE_RE.match(range_header.strip())
                if m and size > 0:
                    start_s, end_s = m.groups()
                    start = int(start_s) if start_s else 0
                    end = int(end_s) if end_s else size - 1
                    end = min(end, size - 1)
                    if 0 <= start <= end:
                        length = end - start + 1
                        f.seek(start)
                        self.send_response(http.HTTPStatus.PARTIAL_CONTENT)
                        self.send_header("Content-type", ctype)
                        self.send_header("Accept-Ranges", "bytes")
                        self.send_header("Content-Range", f"bytes {start}-{end}/{size}")
                        self.send_header("Content-Length", str(length))
                        self.send_header("Last-Modified", self.date_time_string(fs.st_mtime))
                        self.end_headers()
                        self._range_remaining = length
                        return f

            self.send_response(http.HTTPStatus.OK)
            self.send_header("Content-type", ctype)
            self.send_header("Accept-Ranges", "bytes")
            self.send_header("Content-Length", str(size))
            self.send_header("Last-Modified", self.date_time_string(fs.st_mtime))
            if ctype and any(t in ctype for t in ("text/html", "text/css", "javascript")):
                self.send_header("Cache-Control", "no-cache, must-revalidate")
            self.end_headers()
            self._range_remaining = None
            return f
        except Exception:
            f.close()
            raise

    def copyfile(self, source, outputfile):
        remaining = getattr(self, "_range_remaining", None)
        if remaining is None:
            return super().copyfile(source, outputfile)
        bufsize = 64 * 1024
        while remaining > 0:
            chunk = source.read(min(bufsize, remaining))
            if not chunk:
                break
            outputfile.write(chunk)
            remaining -= len(chunk)


class ThreadingTCPServer(socketserver.ThreadingMixIn, socketserver.TCPServer):
    allow_reuse_address = True
    daemon_threads = True


def main():
    port = int(sys.argv[1]) if len(sys.argv) > 1 else 8765
    host = sys.argv[2] if len(sys.argv) > 2 else "0.0.0.0"
    directory = os.path.dirname(os.path.abspath(__file__))
    handler = partial(RangeHTTPRequestHandler, directory=directory)
    with ThreadingTCPServer((host, port), handler) as httpd:
        print(f"Serving {directory} at http://127.0.0.1:{port} (bound {host}, HTTP Range enabled)", flush=True)
        httpd.serve_forever()


if __name__ == "__main__":
    main()
