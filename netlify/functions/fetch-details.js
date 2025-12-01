// fetch-details.js
const axios = require('axios');

exports.handler = async (event, context) => {
    // قراءة Event ID (eid) من الاستعلام
    const eid = event.queryStringParameters.eid;

    if (!eid) {
        return {
            statusCode: 400,
            body: JSON.stringify({ error: "Missing 'eid' query parameter." }),
        };
    }

    // 🚩 الرابط الجديد لتفاصيل المباريات (يجب أن يكون صالحًا حالياً)
    const LIVE_SCORE_DETAILS_URL = `https://prod-public-api.livescore.com/v1/api/app/match/${eid}/0/1/en`; 
    
    try {
        const response = await axios.get(LIVE_SCORE_DETAILS_URL);

        return {
            statusCode: 200,
            headers: {
                "Access-Control-Allow-Origin": "*",
                "Content-Type": "application/json",
            },
            body: JSON.stringify(response.data),
        };
    } catch (error) {
        console.error("Error fetching match details:", error.message);

        // محاولة إرجاع رسالة خطأ أكثر وضوحاً
        const errorMessage = {
            error: "Failed to fetch details from external API.",
            detail: error.response ? `Status ${error.response.status}` : error.message,
            url: LIVE_SCORE_DETAILS_URL
        };

        return {
            statusCode: error.response ? error.response.status : 500,
            body: JSON.stringify(errorMessage),
        };
    }
};
