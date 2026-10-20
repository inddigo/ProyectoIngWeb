"""Fuente sintética para integración en CI; nunca utilizar en staging."""

import json
from http.server import BaseHTTPRequestHandler, HTTPServer


class Handler(BaseHTTPRequestHandler):
    def do_GET(self):
        records = [
            {
                "title": f"<b>Fixture cake {i}</b>",
                "thumbnail": f"https://example.org/fixture-{i}.jpg?utm_source=ci",
                "foreign_landing_url": f"https://example.org/fixture-{i}",
                "source": "ci-fixture",
                "creator": "Synthetic test author",
                "license": "by",
                "license_version": "4.0",
            }
            for i in range(6)
        ]
        body = json.dumps({"results": records + [records[0], {"thumbnail": "http://invalid.example/a.jpg"}]}).encode()
        self.send_response(200)
        self.send_header("Content-Type", "application/json")
        self.send_header("Content-Length", str(len(body)))
        self.end_headers()
        self.wfile.write(body)


HTTPServer(("0.0.0.0", 8090), Handler).serve_forever()
