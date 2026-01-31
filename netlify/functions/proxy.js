const https = require('https');
const http = require('http');

exports.handler = async function(event, context) {
    const targetUrl = event.queryStringParameters.url;

    if (!targetUrl) {
        return { statusCode: 400, body: "URL parameter missing" };
    }

    // تحديد البروتوكول المناسب (http أو https)
    const client = targetUrl.startsWith('https') ? https : http;

    return new Promise((resolve, reject) => {
        const req = client.get(targetUrl, (res) => {
            let data = '';

            res.on('data', (chunk) => {
                data += chunk;
            });

            res.on('end', () => {
                resolve({
                    statusCode: 200,
                    headers: {
                        "Access-Control-Allow-Origin": "*", // السماح للموقع بالوصول
                        "Content-Type": "application/json"
                    },
                    body: data
                });
            });
        });

        req.on('error', (e) => {
            resolve({ statusCode: 500, body: e.message });
        });
    });
};
