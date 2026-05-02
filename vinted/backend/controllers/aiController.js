import { GoogleGenerativeAI } from "@google/generative-ai";
import asyncHandler from 'express-async-handler';
import Category from '../models/Category.js';
import Setting from '../models/Setting.js';
import Item from '../models/Item.js';
import fs from 'fs';

// Helper to get Gemini API Key from Settings
const getGeminiApiKey = async () => {
    try {
        const settings = await Setting.findOne({ type: 'api_settings' }) || await Setting.findOne({ gemini_api_key: { $exists: true } });
        const key = settings?.gemini_api_key || process.env.GEMINI_API_KEY;
        if (!key) {
            console.error("[AI Settings] Gemini API Key is missing in DB and .env");
        }
        return key;
    } catch (error) {
        console.error("[AI Settings] Error fetching API key:", error);
        return process.env.GEMINI_API_KEY;
    }
};

const getHFKey = async () => {
    try {
        const settings = await Setting.findOne({ type: 'api_settings' }) || await Setting.findOne({ huggingface_api_key: { $exists: true } });
        return settings?.huggingface_api_key || process.env.HUGGINGFACE_API_KEY;
    } catch {
        return process.env.HUGGINGFACE_API_KEY;
    }
};

// @desc    Chat with AI assistant
// @route   POST /api/ai/chat
// @access  Public
const chatWithAI = asyncHandler(async (req, res) => {
    const { message, history } = req.body;

    if (!message) {
        return res.status(400).json({ message: "Message is required" });
    }

    try {
        const apiKey = await getGeminiApiKey();
        if (!apiKey) {
            return res.status(503).json({
                message: "AI service is currently not configured by administrator.",
                text: "I'm still learning! My AI brain isn't fully connected yet. Please check back later."
            });
        }

        const genAIInstance = new GoogleGenerativeAI(apiKey);
        
        // Fetch categories and general settings for context
        const categories = await Category.find({ is_active: true }).select('name');
        const categoryNames = categories.map(c => c.name).join(", ");
        const generalSettings = await Setting.findOne({ type: 'site_settings' }) || await Setting.findOne({ type: 'general_settings' });
        
        const siteName = generalSettings?.site_name?.en || 'Sangvish Marketplace';
        const siteUrl = generalSettings?.site_url || 'vinted.sangvish.com';

        const systemInstruction = `You are a helpful, friendly AI assistant for ${siteName}.
Speak like a real person—be helpful but not robotic.
- NEVER mention external sites or official Vinted.com.
- Our site URL is ${siteUrl}.
- Categories available: ${categoryNames}.
- If users ask how to use the site, suggest using the search bar or clicking "Sell".`;

        // Format history for Gemini
        // CRITICAL: First message MUST be 'user'
        let formattedHistory = [];
        if (history && Array.isArray(history)) {
            let firstUserIndex = history.findIndex(msg => !msg.isAi);
            if (firstUserIndex !== -1) {
                // Start from the first user message to satisfy Gemini requirements
                formattedHistory = history.slice(firstUserIndex).map(msg => ({
                    role: msg.isAi ? "model" : "user",
                    parts: [{ text: msg.text }]
                }));
            }
        }

        const fullMessage = `${systemInstruction}\n\nUser: ${message}`;
        
        // Define candidate models for fallback - Using names confirmed in REST check
        const models = ["gemini-2.0-flash", "gemini-flash-latest", "gemini-pro-latest", "gemini-1.5-flash", "gemini-pro"];
        let lastError = null;
        let text = "";

        for (const modelName of models) {
            try {
                console.log(`[AI Chat] Attempting with model: ${modelName}`);
                const model = genAIInstance.getGenerativeModel({ 
                    model: modelName,
                    generationConfig: { maxOutputTokens: 800, timeout: 8000 }
                });
                const chat = model.startChat({
                    history: formattedHistory,
                });

                const result = await chat.sendMessage(fullMessage);
                const responseData = await result.response;
                text = responseData.text();
                if (text) break; // Success!
            } catch (err) {
                console.error(`[AI Chat] Failed with ${modelName}:`, err.message);
                lastError = err;
                // Continue if timeout or quota
                if (err.message?.includes('deadline') || err.message?.includes('timeout') || err.message?.includes('429')) {
                    continue;
                }
                break;
            }
        }

        // --- SECONDARY: Hugging Face Chat Fallback ---
        if (!text) {
            const hfKey = await getHFKey();
            if (hfKey) {
                try {
                    console.log(`[AI Chat] Attempting with Hugging Face (Mistral)...`);
                    // Use a common instruct model
                    const chatRes = await fetch("https://api-inference.huggingface.co/models/mistralai/Mistral-7B-Instruct-v0.2", {
                        headers: { 
                            Authorization: `Bearer ${hfKey}`,
                            "Content-Type": "application/json"
                        },
                        method: "POST",
                        body: JSON.stringify({
                            inputs: `<s>[INST] ${systemInstruction}\n\nUser: ${message} [/INST]`,
                            parameters: { max_new_tokens: 800 }
                        }),
                    });
                    const hfResult = await chatRes.json();
                    if (Array.isArray(hfResult) && hfResult[0]?.generated_text) {
                        // Strip the instruction part from the output
                        const raw = hfResult[0].generated_text;
                        text = raw.split('[/INST]').pop().trim();
                    }
                } catch (hfErr) {
                    console.error("[AI Chat] Hugging Face failed:", hfErr.message);
                }
            }
        }

        if (!text && lastError) {
            throw lastError;
        }

        return res.json({ text });

    } catch (error) {
        console.error("=== AI CHAT ERROR ===");
        console.error(error);
        
        let userMessage = "I'm having a little trouble connecting to my service right now. Please try again in a moment!";
        let statusCode = 500;

        if (error.message?.includes('quota') || error.message?.includes('429')) {
            userMessage = "I've been talking a lot lately and need a short break! My daily limit is reached. Please try again soon or contact support to upgrade.";
            statusCode = 429;
        } else if (error.message?.includes('key') || error.message?.includes('API_KEY_INVALID')) {
            userMessage = "My connection key seems invalid. Please notify the administrator to check the AI API settings.";
        } else if (error.message?.includes('network') || error.message?.includes('fetch')) {
            userMessage = "I'm experiencing a network hiccup. Please check your internet connection and try again.";
        }

        res.status(statusCode).json({
            message: "API Limit Reached",
            text: userMessage,
            error_code: statusCode === 429 ? 'LIMIT_EXCEEDED' : 'AI_ERROR'
        });
    }
});

// @desc    Analyze image with AI for search
// @route   POST /api/search/image
// @access  Public
const imageSearch = asyncHandler(async (req, res) => {
    if (!req.file) {
        return res.status(400).json({ message: "No image uploaded" });
    }

    try {
        // --- 1. NORMAL SEARCH (Exact Match Check) ---
        // Try to see if this is an image from our own site by checking filename
        const originalName = req.file.originalname;
        const filenameParts = originalName.split('.');
        const baseName = filenameParts[0].toLowerCase();
        
        // Search if any item has an image ending with this filename
        const existingItem = await Item.findOne({
            'images': { $regex: new RegExp(`${originalName}$`, 'i') },
            status: 'active',
            is_deleted: false
        }).select('title');

        if (existingItem) {
            console.log(`[Image Search] Exact match found in DB: ${existingItem.title}`);
            // If we found it, we don't need AI. We just return the title for a directed search.
            if (req.file) await fs.promises.unlink(req.file.path).catch(() => {});
            return res.json({ query: existingItem.title, isExactMatch: true });
        }

        // --- 2. AI VISUAL SEARCH ---
        const apiKey = await getGeminiApiKey();
        if (!apiKey) {
            if (req.file) await fs.promises.unlink(req.file.path).catch(() => {});
            return res.status(503).json({ message: "Visual search is not configured." });
        }

        const genAIInstance = new GoogleGenerativeAI(apiKey);
        
        const imageBuffer = await fs.promises.readFile(req.file.path);
        const image = {
            inlineData: {
                data: imageBuffer.toString('base64'),
                mimeType: req.file.mimetype
            }
        };

        const prompt = `Identify this product exactly for a luxury fashion marketplace. 
Analyze the brand, model, color, material, and specific features (e.g., 'Nike Air Max 90 White Leather Sneakers').
Return a highly precise 4-7 word search query. 
Return ONLY the search terms, no quotes, no extra text.`;
        
        // Define candidate models for fallback
        const models = ["gemini-2.0-flash", "gemini-flash-latest", "gemini-pro-vision", "gemini-1.5-flash"];
        let lastError = null;
        let caption = "";

        for (const modelName of models) {
            try {
                console.log(`[AI Image Search] Attempting with model: ${modelName}`);
                const model = genAIInstance.getGenerativeModel({ 
                    model: modelName,
                    generationConfig: { timeout: 8000 } // Set an 8s timeout for "time exceed" fallback
                });
                const result = await model.generateContent([prompt, image]);
                const responseData = await result.response;
                caption = responseData.text().trim().replace(/['"().]+/g, '');
                if (caption && caption.length > 3) break;
            } catch (err) {
                console.error(`[AI Image Search] Failed with ${modelName}:`, err.message);
                lastError = err;
                // If it's a timeout or quota error, we might want to try next model or fallback to HF
                if (err.message?.includes('deadline') || err.message?.includes('timeout') || err.message?.includes('429')) {
                    continue; 
                }
                break;
            }
        }

        // --- SECONDARY: Hugging Face Fallback ---
        if (!caption) {
            const hfKey = await getHFKey();
            if (hfKey) {
                try {
                    console.log(`[AI Image Search] Attempting with Hugging Face (BLIP)...`);
                    const hfResponse = await fetch("https://api-inference.huggingface.co/models/Salesforce/blip-image-captioning-large", {
                        headers: { Authorization: `Bearer ${hfKey}` },
                        method: "POST",
                        body: imageBuffer,
                    });
                    const hfResult = await hfResponse.json();
                    if (Array.isArray(hfResult) && hfResult[0]?.generated_text) {
                        caption = hfResult[0].generated_text;
                    } else if (hfResult.error) {
                        console.error("[HF Error]", hfResult.error);
                    }
                } catch (hfErr) {
                    console.error("[Hugging Face] Captioning failed:", hfErr.message);
                }
            }
        }

        // --- MANIPLULATE: Filter out 'wrong' images (Classification Check) ---
        if (caption) {
            const hfKey = await getHFKey();
            if (hfKey) {
                try {
                    // Use a classification model to see if it's a 'messy' or non-product image
                    const classifyRes = await fetch("https://api-inference.huggingface.co/models/google/vit-base-patch16-224", {
                        headers: { Authorization: `Bearer ${hfKey}` },
                        method: "POST",
                        body: imageBuffer,
                    });
                    const classes = await classifyRes.json();
                    if (Array.isArray(classes) && classes.length > 0) {
                        const topClass = classes[0].label.toLowerCase();
                        const score = classes[0].score;
                        // Very high confidence non-product detection
                        const wrongClasses = ['face', 'portrait', 'headshot', 'person', 'people', 'man', 'woman', 'landscape', 'mountain', 'nature', 'sky', 'building', 'street', 'scaffold'];
                        if (wrongClasses.some(wc => topClass.includes(wc)) && score > 0.8) {
                             await fs.promises.unlink(req.file.path).catch(() => {});
                             return res.status(400).json({ 
                                 message: `I identified this as a ${topClass}. Please upload a clear photo of the product only.` 
                             });
                        }
                    }
                } catch (e) { console.error("[Guard Error]", e.message); }
            }
        }

        if (!caption && lastError) {
            throw lastError;
        }

        await fs.promises.unlink(req.file.path).catch(() => {});
        return res.json({ query: caption });

    } catch (error) {
        console.error("=== AI IMAGE SEARCH ERROR ===");
        console.error(error);
        if (req.file) await fs.promises.unlink(req.file.path).catch(() => {});

        let statusCode = 500;
        let message = "Visual search failed. Please try again with a clearer image.";
        
        if (error.message?.includes('quota') || error.message?.includes('429')) {
            message = "AI Limit Exceeded for today. Please try again later or wait for the quota to reset!";
            statusCode = 429;
        } else if (error.message?.includes('key') || error.message?.includes('API_KEY_INVALID')) {
            message = "AI API settings are invalid. Please check the admin panel.";
        }

        res.status(statusCode).json({ 
            message,
            error_code: statusCode === 429 ? 'LIMIT_EXCEEDED' : 'AI_ERROR'
        });
    }
});

export { chatWithAI, imageSearch };

