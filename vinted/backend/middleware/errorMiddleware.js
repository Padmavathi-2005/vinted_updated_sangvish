import fs from 'fs';

const errorHandler = (err, req, res, next) => {
    const statusCode = res.statusCode ? res.statusCode : 500;
    
    // Log error to file
    try {
        const logMsg = `[${new Date().toISOString()}] ERROR ${statusCode}: ${err.message} at ${req.method} ${req.url}\n${err.stack}\n\n`;
        // Use synchronous append for reliability in error handlers
        fs.appendFileSync('server_errors.log', logMsg);
    } catch (e) {
        console.error('Logging failed:', e);
    }

    res.status(statusCode);
    res.json({
        message: err.message,
        stack: process.env.NODE_ENV === 'production' ? null : err.stack,
    });
};

export {
    errorHandler,
};
