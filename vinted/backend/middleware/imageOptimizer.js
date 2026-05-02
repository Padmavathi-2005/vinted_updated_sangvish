import sharp from 'sharp';
import fs from 'fs';
import path from 'path';

/**
 * Middleware to optimize uploaded images before they are saved/processed by controllers.
 * - Resizes images to a standard range (min 600px, max 1200px for items).
 * - Compresses images to reduce file size (quality: 80).
 * - Maintains aspect ratio.
 */
const optimizeImages = async (req, res, next) => {
    // Check if there are any files to process
    const files = [];
    if (req.file) files.push(req.file);
    if (req.files) {
        if (Array.isArray(req.files)) {
            files.push(...req.files);
        } else {
            // Handle cases where req.files is an object (multer.fields)
            Object.values(req.files).forEach(fieldFiles => {
                files.push(...fieldFiles);
            });
        }
    }

    if (files.length === 0) return next();

    try {
        await Promise.all(files.map(async (file) => {
            // Only process images
            if (!file.mimetype.startsWith('image/')) return;

            const filePath = file.path;
            // Define constraints based on fieldname
            let minDim = 600;
            let maxDim = 1200;

            if (file.fieldname === 'profile_image') {
                minDim = 300;
                maxDim = 500;
            } else if (['site_logo', 'site_favicon', 'stripe_logo', 'paypal_logo', 'category_image'].includes(file.fieldname)) {
                minDim = 0; // Allow small icons/logos as-is
                maxDim = 800;
            }

            const metadata = await sharp(filePath).metadata();
            
            // Read to buffer first to avoid file lock issues on Windows
            const inputBuffer = await fs.promises.readFile(filePath);
            let pipeline = sharp(inputBuffer);

            // 1. Handle Minimum Size (Upscale if too small to ensure clarity as requested)
            if (minDim > 0 && (metadata.width < minDim || metadata.height < minDim)) {
                pipeline = pipeline.resize({
                    width: metadata.width < minDim ? minDim : null,
                    height: metadata.height < minDim ? minDim : null,
                    fit: 'inside', // maintains aspect ratio while hitting at least one dimension
                    withoutEnlargement: false
                });
            }

            // 2. Handle Maximum Size (Downscale if too large for performance)
            if (maxDim > 0 && (metadata.width > maxDim || metadata.height > maxDim)) {
                pipeline = pipeline.resize({
                    width: maxDim,
                    height: maxDim,
                    fit: 'inside',
                    withoutEnlargement: true
                });
            }

            // 3. Compression settings
            const ext = path.extname(filePath).toLowerCase();
            if (ext === '.jpg' || ext === '.jpeg') {
                pipeline = pipeline.jpeg({ quality: 80, mozjpeg: true });
            } else if (ext === '.png') {
                pipeline = pipeline.png({ palette: true, quality: 80 });
            } else if (ext === '.webp') {
                pipeline = pipeline.webp({ quality: 80 });
            } else {
                // Fallback to webp for better compression if unknown
                pipeline = pipeline.webp({ quality: 80 });
            }

            // Output to buffer and then write back
            const outputBuffer = await pipeline.toBuffer();
            await fs.promises.writeFile(filePath, outputBuffer);

            // Update file size in file object for downstream logic
            file.size = outputBuffer.length;
        }));

        next();
    } catch (error) {
        console.error('Image optimization failed:', error);
        // We call next() to avoid blocking the user request if something goes wrong with optimization
        next();
    }
};

export default optimizeImages;
