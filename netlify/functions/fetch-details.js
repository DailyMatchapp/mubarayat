// netlify/functions/fetch-details.js

// الرابط الأساسي
const API_BASE = 'https://prod-cdn-mev-api.livescore.com/v1/api/app/event/soccer/';

exports.handler = async (event) => {
    const eid = event.queryStringParameters.eid; 

    if (!eid) {
        return { 
            statusCode: 400, 
            body: JSON.stringify({ error: 'Missing Match ID (eid) in request' }) 
        };
    }

    // 🚩 التصحيح الأخير للرابط: استخدام صيغة EID/CountryID/Language
    // نفترض أن رقم 1 هو معرف الدولة أو المنطقة المطلوبة (مفتاح شائع)
    const API_URL = `${API_BASE}${eid}/1/en`; 
    
    console.log(`Final fetch attempt from: ${API_URL}`);

    try {
        const response = await fetch(API_URL);

        if (!response.ok) {
            // سنعيد رسالة خطأ أوضح
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
            headers: { 
                'Access-Control-Allow-Origin': '*', 
                'Content-Type': 'application/json' 
            },
            body: JSON.stringify(data)
        };
    } catch (error) {
        return { statusCode: 500, body: JSON.stringify({ error: error.message }) };
    }
};
