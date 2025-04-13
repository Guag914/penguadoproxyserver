const express = require('express');
const request = require('request');
const app = express();
const port = 3000;

const externalProxy = 'http://207.55.243.40:56907';  // External proxy

app.use('/proxy', (req, res) => {
    const targetUrl = req.query.url;
    if (!targetUrl) {
        return res.status(400).send('Missing URL parameter');
    }

    if (!/^https?:\/\//.test(targetUrl)) {
        return res.status(400).send('Invalid URL');
    }

    // Request options with proxy
    const options = {
        url: targetUrl,
        proxy: externalProxy,
        gzip: true,
        headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)',
        },
    };

    request(options, (error, response, body) => {
        if (error) {
            return res.status(500).send(`Error with proxy request: ${error.message}`);
        }

        const contentType = response.headers['content-type'];
        res.setHeader('Content-Type', contentType);

        if (contentType && contentType.includes('text/html')) {
            const baseUrl = new URL(targetUrl);

            const rewrittenBody = body.replace(/(href|src)=["'](.*?)["']/g, (match, attr, value) => {
                if (value.startsWith('http')) {
                    return `${attr}="/proxy?url=${encodeURIComponent(value)}"`;
                }
                if (value.startsWith('//')) {
                    return `${attr}="/proxy?url=${encodeURIComponent('http:' + value)}"`;
                }
                if (value.startsWith('/')) {
                    return `${attr}="/proxy?url=${encodeURIComponent(baseUrl.origin + value)}"`;
                }
                return `${attr}="/proxy?url=${encodeURIComponent(baseUrl.origin + '/' + value)}"`;
            });

            res.send(rewrittenBody);
        } else {
            res.send(body);
        }
    });
});

app.get('/', (req, res) => {
    res.send(`
        <html>
            <head>
                <title>Proxy Search</title>
            </head>
            <body style="font-family: Arial, sans-serif; text-align: center; margin-top: 50px;">
                <h1>Enter URL to Proxy</h1>
                <form action="/proxy" method="get">
                    <input type="text" name="url" placeholder="Enter URL (e.g., https://search.google.com)" required style="padding: 10px; width: 300px; font-size: 16px;">
                    <button type="submit" style="padding: 10px; font-size: 16px;">Search</button>
                </form>
            </body>
        </html>
    `);
});

app.listen(port, () => {
    console.log(`Proxy server running at http://localhost:${port}`);
});
