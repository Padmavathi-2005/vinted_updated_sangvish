import dotenv from 'dotenv';
dotenv.config();

import mongoose from 'mongoose';
import * as dbConfig from './config/db.js';
import Category from './models/Category.js';

console.log('Mongoose in test script:', mongoose.version);
console.log('Mongoose imported by Category:', Category.base.version);
console.log('Is it the same mongoose instance?', Category.base === mongoose);

process.exit(0);
