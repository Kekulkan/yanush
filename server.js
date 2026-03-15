const express = require('express');
const fetch = require('node-fetch');
const cors = require('cors');
require('dotenv').config();

const app = express();
const PORT = 3000;

app.use(cors({
    origin: true,
    credentials: true
}));

app.use(express.json({ limit: '50mb' }));

app.get('/health', (req, res) => res.json({ status: 'ok' }));

app.post('/api/proxy', async (req, res) => {
    try {
        let body = req.body || {};
        if (req.query.url) {
            const parts = req.query.url.split(':');
            if (parts.length > 1) body.model = parts.slice(1).join(':'); 
        }

        const headers = { ...req.headers };
        delete headers['host'];
        delete headers['connection'];
        delete headers['content-length'];
        delete headers['origin'];
        delete headers['referer'];
        
        headers['x-relay-secret'] = process.env.RELAY_SECRET;
        headers['content-type'] = 'application/json';

        const response = await fetch(`${process.env.RELAY_URL}/relay/openrouter`, {
            method: 'POST',
            headers: headers,
            body: JSON.stringify(body)
        });

        if (body.stream) {
            res.setHeader('Content-Type', 'text/event-stream');
            res.setHeader('Cache-Control', 'no-cache');
            res.setHeader('Connection', 'keep-alive');
            response.body.pipe(res);
        } else {
            const data = await response.json();
            res.status(response.status).json(data);
        }
    } catch (e) {
        res.status(502).json({ error: 'proxy_error', message: e.message });
    }
});

app.use('/supabase-proxy', async (req, res) => {
    try {
        const restOfPath = req.originalUrl.replace('/supabase-proxy', '');
        const targetUrl = `${process.env.SUPABASE_URL}${restOfPath}`;
        
        const headers = { ...req.headers };
        delete headers['host'];
        delete headers['connection'];
        delete headers['content-length'];
        delete headers['origin'];
        delete headers['referer'];
        
        headers['x-relay-secret'] = process.env.RELAY_SECRET;
        headers['x-target-url'] = targetUrl;

        const options = { method: req.method, headers };
        if (req.method !== 'GET' && req.method !== 'HEAD') {
            options.body = JSON.stringify(req.body);
        }

        const response = await fetch(`${process.env.RELAY_URL}/relay/supabase`, options);

        res.status(response.status);
        response.headers.forEach((val, key) => {
            const k = key.toLowerCase();
            // Вырезаем CORS-заголовки Supabase, чтобы не было конфликта с нашими
            if (!k.startsWith('access-control-') && !['content-encoding', 'transfer-encoding', 'connection'].includes(k)) {
                res.setHeader(key, val);
            }
        });

        response.body.pipe(res);
    } catch (e) {
        res.status(502).json({ error: 'proxy_error', message: e.message });
    }
});

app.listen(PORT, '127.0.0.1');