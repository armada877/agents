import http.server
import json
import socket

PAGE = """<!doctype html>
<html>
<head><meta charset="utf-8"><title>Sandbox hello</title></head>
<body>
<h1>Hello from hc-sandbox</h1>
<p id="status">loading</p>
<script>
fetch("/api/count").then(r => r.json()).then(d => {
  document.getElementById("status").textContent = "count is " + d.count;
});
</script>
</body>
</html>
"""


class Handler(http.server.BaseHTTPRequestHandler):
    count = 0

    def send(self, status, content_type, body):
        self.send_response(status)
        self.send_header("Content-Type", content_type)
        self.end_headers()
        self.wfile.write(body.encode())

    def do_GET(self):
        if self.path == "/":
            self.send(200, "text/html", PAGE)
        elif self.path == "/api/count":
            Handler.count += 1
            self.send(200, "application/json", json.dumps({"count": Handler.count}))
        else:
            self.send(404, "text/plain", "not found")


def serve(port):
    http.server.ThreadingHTTPServer((socket.gethostbyname(socket.gethostname()), port), Handler).serve_forever()


if __name__ == "__main__":
    serve(8000)
