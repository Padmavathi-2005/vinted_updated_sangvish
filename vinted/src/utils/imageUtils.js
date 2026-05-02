/**
 * Resizes an image file to a fixed width while maintaining aspect ratio,
 * but only if the original image meets a minimum size requirement.
 * 
 * @param {File} file - The image file to process
 * @param {number} minSize - Minimum width/height required (default 500)
 * @param {number} targetWidth - The width to resize to (default 500)
 * @returns {Promise<Blob>} - Resolves with the resized image blob
 */
export const validateAndResizeImage = (file, minSize = 500, targetWidth = 500) => {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.readAsDataURL(file);
        reader.onload = (event) => {
            const img = new Image();
            img.src = event.target.result;
            img.onload = () => {
                // Check minimum dimensions
                if (img.width < minSize || img.height < minSize) {
                    reject(new Error(`Image is too small. Minimum size required is ${minSize}x${minSize}px. Regular size: ${img.width}x${img.height}px.`));
                    return;
                }

                // If it passes, we resize to targetWidth
                const canvas = document.createElement('canvas');
                const scaleFactor = targetWidth / img.width;
                canvas.width = targetWidth;
                canvas.height = img.height * scaleFactor;

                const ctx = canvas.getContext('2d');
                ctx.drawImage(img, 0, 0, canvas.width, canvas.height);

                canvas.toBlob((blob) => {
                    resolve(blob);
                }, 'image/jpeg', 0.9);
            };
            img.onerror = () => reject(new Error('Invalid image file.'));
        };
        reader.onerror = () => reject(new Error('Error reading file.'));
    });
};
