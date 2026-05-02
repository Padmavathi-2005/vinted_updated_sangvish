try {
    const messageController = require('./controllers/messageController');
    const notificationController = require('./controllers/notificationController');
    console.log('Controllers loaded successfully');
    process.exit(0);
} catch (error) {
    console.error('FAIL:', error);
    process.exit(1);
}
