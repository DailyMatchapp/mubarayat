// netlify/functions/fetch-details.js

const API_BASE = 'https://prod-cdn-mev-api.livescore.com/v1/api/app/event/soccer/';

exports.handler = async (event) => {
    const eid = event.queryStringParameters.eid; 

    if (!eid) {
        return { statusCode: 400, body: JSON.stringify({ error: 'Missing Match ID (eid) in request' }) };
    }

    // 🚩 الصيغة الأكثر اكتمالاً لجلب تفاصيل المباراة (Events/H2H)
    const API_URL = `${API_BASE}${eid}/0/1/en`; 
    
    try {
        const response = await fetch(API_URL);

        if (!response.ok) {
            return {
                statusCode: response.status, 
                body: JSON.stringify({ 
                    error: `External API responded with status ${response.status}. Final URL attempted: ${API_URL}`,
                    url: API_URL
                })
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
