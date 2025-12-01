// netlify/functions/fetch-matches.js

const API_BASE = 'https://prod-cdn-mev-api.livescore.com/v1/api/app/date/soccer/';

exports.handler = async (event) => {
    // نستخدم تاريخ ثابت أو نطلب تمريره
    const date = event.queryStringParameters.date || '20251201';

    const API_URL = `${API_BASE}${date}/1`; 
    
    try {
        const response = await fetch(API_URL);

        if (!response.ok) {
            return {
                statusCode: response.status,
                body: JSON.stringify({ error: `External API responded with status ${response.status} for URL: ${API_URL}` })
            };
        }

        const data = await response.json();

        return {
            statusCode: 200,
            headers: { 'Access-Control-Allow-Origin': '*', 'Content-Type': 'application/json' },
            body: JSON.stringify(data)
        };
    } catch (error) {
        return { statusCode: 500, body: JSON.stringify({ error: error.message }) };
    }
};
