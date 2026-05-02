import fs from 'fs';
try {
    const link = fs.readlinkSync('models');
    console.log('Models symlink points to:', link);
} catch (e) {
    console.log('Error reading link:', e.message);
}
