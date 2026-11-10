import json
import threading
import unittest
import urllib.request
from http.server import ThreadingHTTPServer

import app


class AppTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.server = ThreadingHTTPServer(("127.0.0.1", 0), app.Handler)
        threading.Thread(target=cls.server.serve_forever, daemon=True).start()
        cls.base = f"http://127.0.0.1:{cls.server.server_address[1]}"

    @classmethod
    def tearDownClass(cls):
        cls.server.shutdown()

    def test_page(self):
        with urllib.request.urlopen(self.base + "/") as response:
            self.assertIn("Hello from hc-sandbox", response.read().decode())

    def test_count(self):
        with urllib.request.urlopen(self.base + "/api/count") as response:
            self.assertGreater(json.load(response)["count"], 0)


if __name__ == "__main__":
    unittest.main()
