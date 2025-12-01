// netlify/functions/fetch-details.js

const API_BASE = 'https://prod-cdn-mev-api.livescore.com/v1/api/app/event/soccer/';

exports.handler = async (event) => {
    // 1. استخراج 'eid' (معرّف المباراة) من طلب المتصفح
    const eid = event.queryStringParameters.eid; 

    // التحقق الأساسي: هل تم إرسال المعرّف؟
    if (!eid) {
        return { 
            statusCode: 400, 
            body: JSON.stringify({ error: 'Missing Match ID (eid) in request' }) 
        };
    }

    // 2. بناء رابط API الخارجي باستخدام المعرّف
    // نُضيف المعرّف eid إلى رابط API الأساسي، مع افتراض أن LiveScore لا يحتاج لأي معلمات أخرى هنا.
    const API_URL = `${API_BASE}${eid}/1?locale=en`; 
    
    console.log(`Fetching details for EID: ${eid} from ${API_URL}`); // تسجيل للمساعدة في تتبع الأخطاء

    try {
        // 3. جلب البيانات من API LiveScore (من الخادم إلى الخادم)
        const response = await fetch(API_URL);

        // 4. التحقق من حالة الاستجابة من LiveScore
        if (!response.ok) {
            // إذا كان الرد 404 أو 500، نعيد هذا الخطأ إلى المتصفح
            return {
                statusCode: response.status, 
                body: JSON.stringify({ 
                    error: `External API responded with status ${response.status}`,
                    url: API_URL
                })
            };
        }

        const data = await response.json();

        // 5. إرجاع البيانات إلى المتصفح مع رأس CORS (تجاوز القيود)
        return {
            statusCode: 200,
            headers: { 
                'Access-Control-Allow-Origin': '*', // مفتاح تجاوز CORS
                'Content-Type': 'application/json' 
            },
            body: JSON.stringify(data)
        };
    } catch (error) {
        // في حالة وجود خطأ في الاتصال بالشبكة
        return { statusCode: 500, body: JSON.stringify({ error: error.message }) };
    }
};
