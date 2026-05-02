
import dotenv from 'dotenv';
import { GoogleGenerativeAI } from "@google/generative-ai";

dotenv.config({ path: 'e:/vinted-user&admin/vinted/backend/.env' });

const testAI = async () => {
    const key = process.env.GEMINI_API_KEY;
    console.log("Using Key:", key ? key.substring(0, 5) + "..." : "MISSING");

    const genAI = new GoogleGenerativeAI(key);
    try {
        const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
        const result = await model.generateContent("Hello");
        const response = await result.response;
        console.log("Response:", response.text());
    } catch (error) {
        console.error("AI Error Details:", error);
    }
}

testAI();
