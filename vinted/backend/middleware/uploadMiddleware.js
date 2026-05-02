import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        let dest = 'images/';

        if (file.fieldname === 'profile_image') {
            dest += 'profile';
        } else if (['site_logo', 'site_favicon', 'image_not_found', 'empty_table_image', 'image', 'stripe_logo', 'paypal_logo'].includes(file.fieldname)) {
            dest += 'site';
        } else if (file.fieldname === 'category_image') {
            dest += 'categories';
        } else {
            dest += 'items';
        }

        const fullPath = path.join(__dirname, '../', dest);
        if (!fs.existsSync(fullPath)) {
            fs.mkdirSync(fullPath, { recursive: true });
        }
        cb(null, fullPath);
    },
    filename: (req, file, cb) => {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        cb(null, file.fieldname + '-' + uniqueSuffix + path.extname(file.originalname));
    }
});

const upload = multer({
    storage,
    fileFilter: (req, file, cb) => {
        if (file.mimetype.startsWith('image/')) {
            cb(null, true);
        } else {
            cb(new Error('Only images are allowed'));
        }
    }
});

export default upload;
