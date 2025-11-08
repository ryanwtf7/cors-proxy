import http from 'http';
import url from 'url';

// A utility function to check if the requested range is valid
const isValidRange = (start, end, total) => {
    return (start >= 0 && end < total && start <= end);
};

// Create the streaming proxy server
const server = http.createServer((req, res) => {
    const { headers, method } = req;
    const requestedUrl = req.url;
    const targetUrl = decodeURIComponent(requestedUrl);

    // Support CORS by setting headers for multiple domains
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', '*');

    // Handle preflight requests
    if (method === 'OPTIONS') {
        res.writeHead(204);
        return res.end();
    }

    const proxyRequest = http.get(targetUrl, (proxyRes) => {
        const total = parseInt(proxyRes.headers['content-length'], 10);
        const range = headers.range;

        if (!range) {
            res.writeHead(200, {'Content-Type': proxyRes.headers['content-type']});
            proxyRes.pipe(res);
        } else {
            // Parse the range
            const parts = range.replace(/bytes=/, '').split('-');
            const start = parseInt(parts[0], 10);
            const end = parts[1] ? parseInt(parts[1], 10) : total - 1;

            if (!isValidRange(start, end, total)) {
                res.writeHead(416, {'Content-Range': `bytes */${total}`});
                return res.end();
            }

            res.writeHead(206, {
                'Content-Range': `bytes ${start}-${end}/${total}`,
                'Accept-Ranges': 'bytes',
                'Content-Type': proxyRes.headers['content-type'],
                'Content-Length': end - start + 1,
            });

            // Stream the response to the client
            proxyRes.pipe(res, { start, end });
        }
    });

    proxyRequest.on('error', (err) => {
        console.error(err);
        res.writeHead(400);
        res.end('Error: Unable to process request');
    });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});
