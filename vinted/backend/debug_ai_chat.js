import Setting from './models/Setting.js';
import Category from './models/Category.js';
import { chatWithAI } from './controllers/aiController.js';
import connectDB from './config/db.js';
import dotenv from 'dotenv';

dotenv.config();

const testChat = async () => {
    await connectDB();
    
    // Mock req/res
    const req = {
        body: {
            message: "Hello assistant",
            history: []
        }
    };
    
    const res = {
        status: function(code) {
            this.statusCode = code;
            return this;
        },
        json: function(data) {
            console.log("Response Status:", this.statusCode || 200);
            console.log("Response Data:", JSON.stringify(data, null, 2));
        }
    };
    
    try {
        await chatWithAI(req, res);
    } catch (err) {
        console.error("CATCAHED ERROR:", err);
    }
    
    process.exit();
};

testChat();
