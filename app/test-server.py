#!/usr/bin/env python3
"""
Development server with API proxy for testing
Serves local files and proxies API requests to avoid CORS issues
"""

import http.server
import socketserver
import urllib.request
import urllib.error
import json
from urllib.parse import urlparse, parse_qs

PORT = 9000
PROXY_HOST = "https://iwalton.com"

class ProxyHTTPRequestHandler(http.server.SimpleHTTPRequestHandler):
    """HTTP request handler with API proxy support"""

    def do_GET(self):
        """Handle GET requests"""
        if self.path.startswith('/spa-api') or self.path.startswith('/spwg-api') or self.path.startswith('/theme/'):
            self.proxy_request('GET')
        else:
            # Check if it's a file request (has extension) or directory
            parsed = urlparse(self.path)
            path = parsed.path

            # If path has no extension and is not a directory, serve index.html (SPA routing)
            if not '.' in path.split('/')[-1] and path != '/':
                try:
                    # Try to see if the path is a directory
                    import os
                    full_path = os.path.join(os.getcwd(), path.lstrip('/'))
                    if not os.path.isdir(full_path):
                        # Not a directory, serve index.html for SPA routing
                        self.path = '/index.html'
                except:
                    self.path = '/index.html'

            # Serve local files
            super().do_GET()

    def do_POST(self):
        """Handle POST requests"""
        if self.path.startswith('/spa-api') or self.path.startswith('/spwg-api') or self.path.startswith('/theme/'):
            self.proxy_request('POST')
        else:
            self.send_error(405, "Method Not Allowed")

    def proxy_request(self, method):
        """Proxy request to remote server"""
        try:
            # Build target URL
            target_url = PROXY_HOST + self.path

            print(f"[PROXY] {method} {self.path} -> {target_url}")

            # Read request body for POST
            content_length = 0
            body = None
            if method == 'POST':
                content_length = int(self.headers.get('Content-Length', 0))
                if content_length > 0:
                    body = self.rfile.read(content_length)

            # Create request
            headers = {
                'User-Agent': self.headers.get('User-Agent', 'Mozilla/5.0'),
                'Content-Type': self.headers.get('Content-Type', 'application/json'),
            }

            # Add cookies if present
            if 'Cookie' in self.headers:
                headers['Cookie'] = self.headers['Cookie']

            req = urllib.request.Request(
                target_url,
                data=body,
                headers=headers,
                method=method
            )

            # Make request
            with urllib.request.urlopen(req) as response:
                # Send response
                self.send_response(response.status)

                # Copy headers
                for header, value in response.headers.items():
                    # Skip some headers
                    if header.lower() not in ['transfer-encoding', 'connection']:
                        # Strip Secure flag from Set-Cookie for localhost development
                        if header.lower() == 'set-cookie':
                            value = value.replace('; Secure', '').replace(';Secure', '')
                        self.send_header(header, value)

                # Add CORS headers
                self.send_header('Access-Control-Allow-Origin', '*')
                self.send_header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS')
                self.send_header('Access-Control-Allow-Headers', 'Content-Type')

                self.end_headers()

                # Copy body
                self.wfile.write(response.read())

        except urllib.error.HTTPError as e:
            print(f"[PROXY ERROR] HTTP {e.code}: {e.reason}")
            self.send_error(e.code, e.reason)
        except Exception as e:
            print(f"[PROXY ERROR] {type(e).__name__}: {e}")
            self.send_error(500, f"Proxy error: {e}")

    def do_OPTIONS(self):
        """Handle OPTIONS for CORS preflight"""
        self.send_response(200)
        self.send_header('Access-Control-Allow-Origin', '*')
        self.send_header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS')
        self.send_header('Access-Control-Allow-Headers', 'Content-Type')
        self.end_headers()

    def log_message(self, format, *args):
        """Custom log format"""
        if not (self.path.startswith('/spa-api') or self.path.startswith('/spwg-api') or self.path.startswith('/theme/')):
            # Only log local file requests
            print(f"[LOCAL] {args[0]}")

def run_server():
    """Start the development server"""
    handler = ProxyHTTPRequestHandler

    # Allow socket reuse to prevent "Address already in use" errors
    socketserver.TCPServer.allow_reuse_address = True

    with socketserver.TCPServer(("", PORT), handler) as httpd:
        print("=" * 60)
        print(f"🚀 Development Server Running")
        print("=" * 60)
        print(f"Local files:  http://localhost:{PORT}/")
        print(f"API proxy:    /spa-api/* -> {PROXY_HOST}/spa-api/*")
        print(f"              /spwg-api/* -> {PROXY_HOST}/spwg-api/*")
        print(f"              /theme/* -> {PROXY_HOST}/theme/*")
        print("=" * 60)
        print("Press Ctrl+C to stop")
        print()

        try:
            httpd.serve_forever()
        except KeyboardInterrupt:
            print("\n\n👋 Server stopped")

if __name__ == "__main__":
    run_server()
