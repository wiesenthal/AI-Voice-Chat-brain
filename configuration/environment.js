import dotenv from 'dotenv';

dotenv.config();

const OPENAI_API_KEY = process.env.OPENAI_API_KEY;
const MODEL = process.env.MODEL || "gpt-3.5-turbo-16k";

export { OPENAI_API_KEY, MODEL };