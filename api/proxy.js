import http from 'http';
import https from 'https';
import url from 'url';

// Allowed domains list
const ALLOWED_DOMAINS = [
    'streamwish.to',
    'vidwish.live',
    'megaplay.buzz',
    'megacloud.club'
];

// CORS configuration
const CORS_HEADERS = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, OPTIONS',
    'Access-Control-Allow-Headers': '*'
};

export default function handler(req, res) {
    // Handle CORS preflight
    if (req.method === 'OPTIONS') {
        res.writeHead(204, CORS_HEADERS);
        return res.end();
    }

    const { query } = url.parse(req.url, true);
    const targetUrl = query.url;

    if (!targetUrl) {
        res.writeHead(400, { 'Content-Type': 'application/json' });
        return res.end(JSON.stringify({ error: 'Missing url parameter' }));
    }

    try {
        const parsedUrl = new URL(targetUrl);
        
        // Check if domain is allowed
        if (!ALLOWED_DOMAINS.includes(parsedUrl.hostname)) {
            res.writeHead(403, { 'Content-Type': 'application/json' });
            return res.end(JSON.stringify({ error: 'Domain not allowed' }));
        }

        const protocol = parsedUrl.protocol === 'https:' ? https : http;
        const proxyReq = protocol.get(targetUrl, (proxyRes) => {
            // Forward all headers
            const headers = { ...proxyRes.headers, ...CORS_HEADERS };
            res.writeHead(proxyRes.statusCode, headers);

            // Stream the response
            proxyRes.pipe(res);
        });

        proxyReq.on('error', (err) => {
            console.error('Proxy error:', err);
            res.writeHead(502, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ error: 'Proxy request failed' }));
        });

        // Forward the original request body if any
        if (req.body) {
            proxyReq.write(req.body);
        }
        
        proxyReq.end();

    } catch (err) {
        console.error('URL parsing error:', err);
        res.writeHead(400, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'Invalid URL' }));
    }
}