// netlify/functions/fetch-standings.js

// الرابط الأساسي لجلب جدول الترتيب
const API_BASE = 'https://prod-cdn-mev-api.livescore.com/v1/api/app/standings/soccer/';

exports.handler = async (event) => {
    // 1. استخراج 'sid' (معرّف الدوري) من طلب المتصفح
    const sid = event.queryStringParameters.sid; 

    if (!sid) {
        return { 
            statusCode: 400, 
            body: JSON.stringify({ error: 'Missing Stage ID (sid) in request' }) 
        };
    }

    // 2. بناء رابط API الخارجي
    // 🚩 التصحيح: الصيغة الأكثر شيوعاً تتطلب SID، ثم رقم المنطقة (عادة 1) واللغة (en)
    const API_URL = `${API_BASE}${sid}/1/en`; 
    
    console.log(`Attempting to fetch standings from: ${API_URL}`);

    try {
        // 3. جلب البيانات من API LiveScore 
        const response = await fetch(API_URL);

        if (!response.ok) {
            // إعادة خطأ 404 أو 500 إذا كان من مصدر خارجي
            return {
                statusCode: response.status, 
                body: JSON.stringify({ 
                    error: `External API responded with status ${response.status}. Final URL attempted: ${API_URL}`,
                    url: API_URL
                })
            };
        }

        const data = await response.json();

        // 4. إرجاع البيانات إلى المتصفح مع رأس CORS
        return {
            statusCode: 200,
            headers: { 
                'Access-Control-Allow-Origin': '*', 
                'Content-Type': 'application/json' 
            },
            body: JSON.stringify(data)
        };
    } catch (error) {
        // خطأ في الاتصال بالشبكة
        return { statusCode: 500, body: JSON.stringify({ error: error.message }) };
    }
};
