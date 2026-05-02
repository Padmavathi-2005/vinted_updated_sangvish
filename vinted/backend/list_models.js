import { GoogleGenerativeAI } from "@google/generative-ai";
import dotenv from 'dotenv';
dotenv.config();

const listModels = async () => {
    const key = process.env.GEMINI_API_KEY;
    const genAI = new GoogleGenerativeAI(key);
    try {
        // There isn't a direct listModels in the client usually, but let's try to see if we can find it
        // Actually, let's just try gemini-pro
        const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
        console.log("Model initialized");
        const result = await model.generateContent("test");
        console.log("Success");
    } catch (err) {
        console.error("Error with gemini-1.5-flash:", err.message);
    }
    
    try {
        const model = genAI.getGenerativeModel({ model: "gemini-pro" });
        const result = await model.generateContent("test");
        console.log("Success with gemini-pro");
    } catch (err) {
        console.error("Error with gemini-pro:", err.message);
    }
};

listModels();
