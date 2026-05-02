import sharp from 'sharp';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const inputDir = 'C:\\Users\\SAI\\.gemini\\antigravity\\brain\\5ad3cee6-9338-413b-84dc-e4eb3cdadcff';
const outputDir = path.join(__dirname, '../images/icons/subcategories');

const iconMapping = [
    { from: 'clothing_flat_icon_1773918130103.png', to: 'clothing.png' },
    { from: 'shoes_flat_icon_1773918335174.png', to: 'shoes.png' },
    { from: 'bags_flat_icon_1773918356903.png', to: 'bags.png' },
    { from: 'accessories_flat_icon_1773918378240.png', to: 'accessories.png' },
    { from: 'beauty_flat_icon_1773918401423.png', to: 'beauty.png' },
    { from: 'toys_flat_icon_1773918421876.png', to: 'toys.png' },
    { from: 'furniture_flat_icon_1773918444824.png', to: 'furniture.png' }
];

async function processIcons() {
    if (!fs.existsSync(outputDir)) {
        fs.mkdirSync(outputDir, { recursive: true });
    }

    for (const item of iconMapping) {
        const inputPath = path.join(inputDir, item.from);
        const outputPath = path.join(outputDir, item.to);

        if (!fs.existsSync(inputPath)) {
            console.log(`Missing input: ${inputPath}`);
            continue;
        }

        try {
            // Processing: Remove white background
            // We use ensureAlpha and then use transparency threshold
            await sharp(inputPath)
                .ensureAlpha()
                .unflatten()
                .raw()
                .toBuffer({ resolveWithObject: true })
                .then(({ data, info }) => {
                    const { width, height, channels } = info;
                    for (let i = 0; i < data.length; i += channels) {
                        const r = data[i];
                        const g = data[i + 1];
                        const b = data[i + 2];
                        // If pixel is very close to white, make it transparent
                        if (r > 245 && g > 245 && b > 245) {
                            data[i + 3] = 0;
                        }
                    }
                    return sharp(data, { raw: { width, height, channels } })
                        .png()
                        .toFile(outputPath);
                });

            console.log(`✅ Processed: ${item.to}`);
        } catch (err) {
            console.error(`❌ Error processing ${item.to}:`, err);
        }
    }
}

processIcons();
