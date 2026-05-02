import sharp from 'sharp';
import fs from 'fs';
import path from 'path';

/**
 * Middleware to optimize uploaded images before they are saved/processed by controllers.
 */
const optimizeImages = async (req, res, next) => {
    const files = [];
    if (req.file) files.push(req.file);
    if (req.files) {
        if (Array.isArray(req.files)) {
            files.push(...req.files);
        } else {
            Object.values(req.files).forEach(fieldFiles => {
                files.push(...fieldFiles);
            });
        }
    }

    if (files.length === 0) return next();

    try {
        await Promise.all(files.map(async (file) => {
            if (!file.mimetype.startsWith('image/')) return;

            const filePath = file.path;

            let minDim = 600;
            let maxDim = 1200;

            if (file.fieldname === 'profile_image') {
                minDim = 300;
                maxDim = 500;
            } else if (['site_logo', 'site_favicon', 'stripe_logo', 'paypal_logo', 'category_image', 'image_not_found', 'empty_table_image'].includes(file.fieldname)) {
                minDim = 0;
                maxDim = 800;
            } else if (file.fieldname === 'image') {
                // Frontend Content (often hero banners)
                minDim = 0;
                maxDim = 1920;
            }

            const metadata = await sharp(filePath).metadata();
            
            // Read to buffer first to avoid file lock issues on Windows
            const inputBuffer = await fs.promises.readFile(filePath);
            let pipeline = sharp(inputBuffer);

            // ... (resizing logic remains same)
            if (minDim > 0 && (metadata.width < minDim || metadata.height < minDim)) {
                pipeline = pipeline.resize({
                    width: metadata.width < minDim ? minDim : null,
                    height: metadata.height < minDim ? minDim : null,
                    fit: 'inside',
                    withoutEnlargement: false
                });
            }

            if (maxDim > 0 && (metadata.width > maxDim || metadata.height > maxDim)) {
                pipeline = pipeline.resize({
                    width: maxDim,
                    height: maxDim,
                    fit: 'inside',
                    withoutEnlargement: true
                });
            }

            const ext = path.extname(filePath).toLowerCase();
            if (ext === '.jpg' || ext === '.jpeg') {
                pipeline = pipeline.jpeg({ quality: 80, mozjpeg: true });
            } else if (ext === '.png') {
                pipeline = pipeline.png({ palette: true, quality: 80 });
            } else {
                pipeline = pipeline.webp({ quality: 80 });
            }

            // Output to buffer and then write back
            const outputBuffer = await pipeline.toBuffer();
            await fs.promises.writeFile(filePath, outputBuffer);

            // Update file size
            file.size = outputBuffer.length;
        }));

        next();
    } catch (error) {
        console.error('Image optimization failed:', error);
        next();
    }
};

export default optimizeImages;
