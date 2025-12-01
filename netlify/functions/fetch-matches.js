// netlify/functions/fetch-matches.js

const API_URL = 'https://prod-cdn-mev-api.livescore.com/v1/api/app/date/soccer/20251201/1?locale=en';

exports.handler = async (event, context) => {
    try {
        // الوظيفة تتصل بـ API الأصلي على خادم Netlify
        const response = await fetch(API_URL);

        if (!response.ok) {
            return {
                statusCode: 500,
                body: JSON.stringify({ error: 'Failed to fetch from LiveScore API', status: response.status })
            };
        }

        const data = await response.json();

        // إرجاع البيانات إلى المتصفح مع رأس CORS للسماح بالوصول
        return {
            statusCode: 200,
            headers: {
                'Access-Control-Allow-Origin': '*', // السماح بالوصول من أي نطاق
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(data)
        };
    } catch (error) {
        return {
            statusCode: 500,
            body: JSON.stringify({ error: error.message })
        };
    }
};
