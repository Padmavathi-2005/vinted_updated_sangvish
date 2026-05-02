import asyncHandler from 'express-async-handler';
import mongoose from 'mongoose';
import path from 'path';
import fs from 'fs';
import { exec } from 'child_process';
import { fileURLToPath } from 'url';

// Models to clean
import User from '../models/User.js';
import Item from '../models/Item.js';
import Order from '../models/Order.js';
import Report from '../models/Report.js';
import Message from '../models/Message.js';
import Conversation from '../models/Conversation.js';
import Favorite from '../models/Favorite.js';
import Follow from '../models/Follow.js';
import ItemView from '../models/ItemView.js';
import Notification from '../models/Notification.js';
import Review from '../models/Review.js';
import SearchHistory from '../models/SearchHistory.js';
import Transaction from '../models/Transaction.js';
import WithdrawalRequest from '../models/WithdrawalRequest.js';
import Wallet from '../models/Wallet.js';
import Newsletter from '../models/Newsletter.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// @desc    Reset all user content but keep categories/settings
// @route   POST /api/system/reset-data
// @access  Private (Admin)
const resetData = asyncHandler(async (req, res) => {
    try {
        await Promise.all([
            User.deleteMany({}),
            Item.deleteMany({}),
            Order.deleteMany({}),
            Report.deleteMany({}),
            Message.deleteMany({}),
            Conversation.deleteMany({}),
            Favorite.deleteMany({}),
            Follow.deleteMany({}),
            ItemView.deleteMany({}),
            Notification.deleteMany({}),
            Review.deleteMany({}),
            SearchHistory.deleteMany({}),
            Transaction.deleteMany({}),
            WithdrawalRequest.deleteMany({}),
            Wallet.deleteMany({}),
            Newsletter.deleteMany({})
        ]);

        // Also clean up uploaded images in profile and items (optional but good)
        // We'll skip for now to be safe, or just clear the database records as requested.

        res.json({ message: 'All user content has been successfully deleted. Categories and settings remain intact.' });
    } catch (error) {
        res.status(500);
        throw new Error('Failed to reset data: ' + error.message);
    }
});

// @desc    Generate a database backup
// @route   POST /api/system/backup
// @access  Private (Admin)
const createBackup = asyncHandler(async (req, res) => {
    const backupDir = path.join(__dirname, '../backups');
    if (!fs.existsSync(backupDir)) {
        fs.mkdirSync(backupDir, { recursive: true });
    }

    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const fileName = `backup-${timestamp}.json`;
    const filePath = path.join(backupDir, fileName);

    try {
        // Simple JSON-based backup for ease of implementation without mongodump dependencies
        const collections = [
            'Admin', 'User', 'Item', 'Category', 'Subcategory', 'ItemType', 
            'Setting', 'Page', 'Language', 'Currency', 'FrontendContent'
        ];
        
        const backupData = {};
        
        for (const colName of collections) {
            const model = mongoose.model(colName);
            backupData[colName] = await model.find({});
        }

        fs.writeFileSync(filePath, JSON.stringify(backupData, null, 2));

        res.json({ 
            message: 'Backup created successfully', 
            fileName,
            downloadUrl: `/api/system/download-backup/${fileName}`
        });
    } catch (error) {
        res.status(500);
        throw new Error('Backup failed: ' + error.message);
    }
});

// @desc    Download a backup file
// @route   GET /api/system/download-backup/:fileName
// @access  Private (Admin)
const downloadBackup = asyncHandler(async (req, res) => {
    const { fileName } = req.params;
    const filePath = path.join(__dirname, '../backups', fileName);

    if (fs.existsSync(filePath)) {
        res.download(filePath);
    } else {
        res.status(404);
        throw new Error('Backup file not found');
    }
});

// @desc    Get list of all backups
// @route   GET /api/system/backups
// @access  Private (Admin)
const getBackups = asyncHandler(async (req, res) => {
    const backupDir = path.join(__dirname, '../backups');
    if (!fs.existsSync(backupDir)) {
        return res.json([]);
    }

    const files = fs.readdirSync(backupDir)
        .filter(file => file.endsWith('.json'))
        .map(file => {
            const stats = fs.statSync(path.join(backupDir, file));
            return {
                name: file,
                size: stats.size,
                createdAt: stats.birthtime,
                downloadUrl: `/api/system/download-backup/${file}`
            };
        })
        .sort((a, b) => b.createdAt - a.createdAt);

    res.json(files);
});

// @desc    Delete a backup file
// @route   DELETE /api/system/backups/:fileName
// @access  Private (Admin)
const deleteBackup = asyncHandler(async (req, res) => {
    const { fileName } = req.params;
    const filePath = path.join(__dirname, '../backups', fileName);

    if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
        res.json({ message: 'Backup deleted successfully' });
    } else {
        res.status(404);
        throw new Error('Backup file not found');
    }
});

export {
    resetData,
    createBackup,
    downloadBackup,
    getBackups,
    deleteBackup
};
