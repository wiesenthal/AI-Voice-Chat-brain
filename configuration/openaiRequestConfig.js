import dotenv from 'dotenv';

dotenv.config();

const openAIRequestConfig = {
    hostname: 'api.openai.com',
    path: '/v1/chat/completions',
    method: 'POST',
    headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`
    }
};

function setHeadersForOpenAI(res) {
    res.setHeader('Content-Type', 'text/plain; charset=utf-8');
    res.setHeader('Transfer-Encoding', 'chunked');
}

export { openAIRequestConfig, setHeadersForOpenAI };