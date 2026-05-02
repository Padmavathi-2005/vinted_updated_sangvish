import fs from 'fs';

const errorHandler = (err, req, res, next) => {
    let statusCode = res.statusCode === 200 ? 500 : res.statusCode;
    if (!statusCode) statusCode = 500;

    // Log error to file
    try {
        const logMsg = `[${new Date().toISOString()}] ERROR ${statusCode}: ${err.message} at ${req.method} ${req.url}\n${err.stack}\n\n`;
        fs.appendFileSync('server_errors.log', logMsg);
    } catch (e) {
        console.error('Logging failed:', e);
    }

    console.error('SERVER ERROR:', err);

    res.status(statusCode);

    res.json({
        message: err.message,
        stack: process.env.NODE_ENV === 'production' ? null : err.stack,
    });
};

export {
    errorHandler,
};
