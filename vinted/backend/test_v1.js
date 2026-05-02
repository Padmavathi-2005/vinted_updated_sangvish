import { GoogleGenerativeAI } from "@google/generative-ai";
import dotenv from 'dotenv';
dotenv.config();

const testV1 = async () => {
    const key = process.env.GEMINI_API_KEY;
    const genAI = new GoogleGenerativeAI(key);
    
    try {
        console.log("Testing with v1...");
        // The library might not expose an easy way to change apiVersion per request if not in constructor
        // But let's see if we can use gemini-1.5-flash
        const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" }, { apiVersion: 'v1' });
        const result = await model.generateContent("hello");
        const response = await result.response;
        console.log("Success with v1:", response.text().substring(0, 20));
    } catch (err) {
        console.error("Error with v1:", err.message);
    }
};

testV1();
