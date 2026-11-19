"""Lightweight static preview server with HTTP byte-range support for audio seeking."""

import http.server
import os
import re
import socketserver
import sys
from functools import partial

RANGE_RE = re.compile(r"bytes=(\d*)-(\d*)$")


class RangeHTTPRequestHandler(http.server.SimpleHTTPRequestHandler):
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
