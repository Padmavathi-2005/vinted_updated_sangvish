import fs from 'fs';
import { GoogleGenerativeAI } from '@google/generative-ai';
import dotenv from 'dotenv';
import mongoose from 'mongoose';
dotenv.config();

import Setting from './models/Setting.js';

async function run() {
    try {
        await mongoose.connect('mongodb+srv://support_db_uuser:gyhkuN-jammy8-voxqub@vinted.ek5p4it.mongodb.net/vinted_db?appName=vinted');
        const settings = await Setting.findOne({ gemini_api_key: { $exists: true } });
        const apiKey = settings?.gemini_api_key;
        
        if (!apiKey) {
            console.error("No API key found in DB");
            process.exit(1);
        }

        const genAIInstance = new GoogleGenerativeAI(apiKey);
        const model = genAIInstance.getGenerativeModel({ model: "gemini-1.5-flash" });

        const enPath = './locales/en/translation.json';
        const enData = fs.readFileSync(enPath, 'utf8');

        const prompt = `You are an expert, native German translator for a luxury fashion marketplace.
Translate the following JSON object containing English UI strings into completely natural, correct German.
Return strictly ONLY a valid JSON object with the exact same structure and keys, but the values translated to German.
Do not wrap your output in markdown blocks. Do not add any extra text.

JSON:
${enData}`;

        console.log("Translating full English file to German...");
        const result = await model.generateContent({
            contents: [{ role: 'user', parts: [{ text: prompt }] }],
            generationConfig: { maxOutputTokens: 8192 }
        });
        const text = result.response.text();
        const cleanText = text.replace(/```json/gi, '').replace(/```/g, '').trim();
        const parsed = JSON.parse(cleanText);
        
        const dePaths = [
            './locales/de/translation.json',
            '../../vinted-next/locales/de/translation.json',
            '../src/locales/de/translation.json'
        ];
        
        for (const p of dePaths) {
            if (fs.existsSync(p.substring(0, p.lastIndexOf('/')))) {
                fs.writeFileSync(p, JSON.stringify(parsed, null, 4));
                console.log("Written to", p);
            }
        }
        console.log("Translation complete!");
        process.exit(0);
    } catch (e) {
        console.error("Error during translation:", e);
        process.exit(1);
    }
}

run();
