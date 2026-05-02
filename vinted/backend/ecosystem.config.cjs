module.exports = {
    apps: [
        {
            name: 'vinted-backend',
            script: './server.js', // Or whatever your main entry file is (e.g., index.js)
            instances: 1, // Number of instances to run (1 is safe for general use without Redis setup)
            autorestart: true, // Automatically restart if the app crashes
            watch: false, // Don't restart on file changes in production
            max_memory_restart: '1G', // Restart if the app uses more than 1GB of RAM to prevent memory leak crashes
            env: {
                NODE_ENV: 'development',
            },
            env_production: {
                NODE_ENV: 'production',
                // Example of adding environment variables dynamically for production
                // PORT: 5000 
            }
        }
    ]
};
