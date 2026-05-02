
import dotenv from 'dotenv';
import { GoogleGenerativeAI } from "@google/generative-ai";

dotenv.config({ path: 'e:/vinted-user&admin/vinted/backend/.env' });

const listModels = async () => {
    const key = process.env.GEMINI_API_KEY;
    const genAI = new GoogleGenerativeAI(key);
    try {
        // Unfortunately, the JS SDK doesn't have a direct listModels, 
        // but we can try common names.
        console.log("Testing gemini-1.5-flash...");
        const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
        const result = await model.generateContent("Hi");
        console.log("Success with gemini-1.5-flash");
    } catch (error) {
        console.log("Failed with gemini-1.5-flash:", error.message);
        try {
            console.log("Testing gemini-pro...");
            const model2 = genAI.getGenerativeModel({ model: "gemini-pro" });
            await model2.generateContent("Hi");
            console.log("Success with gemini-pro");
        } catch (e) {
            console.log("Failed with gemini-pro:", e.message);
        }
    }
}

listModels();
