// netlify/functions/fetch-details.js

// الرابط الأساسي لجلب تفاصيل مباراة واحدة (نستخدم EID)
// يجب أن يكون هذا الرابط هو الصحيح لجلب تفاصيل المباراة (H2H, Events)
const API_BASE = 'https://prod-cdn-mev-api.livescore.com/v1/api/app/event/soccer/';

exports.handler = async (event) => {
    // 1. استخراج 'eid' (معرّف المباراة) من الطلب
    const eid = event.queryStringParameters.eid; 

    if (!eid) {
        return { 
            statusCode: 400, 
            body: JSON.stringify({ error: 'Missing Match ID (eid) in request' }) 
        };
    }

    // 2. بناء رابط API الخارجي
    // 🚩 التصحيح هنا: نستخدم EID فقط مع إضافة بارامترات الموقع إن وجدت.
    // جرب هذا الرابط، وإذا لم يعمل، قم بمطابقته يدوياً مع ما تراه في أدوات المطور على موقع LiveScore.
    const API_URL = `${API_BASE}${eid}`;
    
    console.log(`Attempting to fetch details from: ${API_URL}`);

    try {
        // 3. جلب البيانات من API LiveScore 
        const response = await fetch(API_URL);

        // 4. التحقق من حالة الاستجابة من LiveScore
        if (!response.ok) {
            // إعادة خطأ 404 أو 500 إذا كان من مصدر خارجي
            return {
                statusCode: response.status, 
                body: JSON.stringify({ 
                    error: `External API responded with status ${response.status} for URL: ${API_URL}`,
                    url: API_URL
                })
            };
        }

        const data = await response.json();

        // 5. إرجاع البيانات إلى المتصفح مع رأس CORS
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
