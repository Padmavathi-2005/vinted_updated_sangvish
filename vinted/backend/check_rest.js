// Native fetch in Node 22
import dotenv from 'dotenv';
dotenv.config();

const listModels = async () => {
    const key = process.env.GEMINI_API_KEY;
    const url = `https://generativelanguage.googleapis.com/v1beta/models?key=${key}`;
    
    try {
        const res = await fetch(url);
        const data = await res.json();
        console.log("Models Available:", JSON.stringify(data.models?.map(m => m.name), null, 2));
    } catch (err) {
        console.error("Fetch Error:", err.message);
    }
};

listModels();
