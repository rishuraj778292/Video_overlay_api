module.exports = {
    apps: [{
        name: 'video-overlay-api',
        script: 'server.js',
        instances: 'max',
        exec_mode: 'cluster',
        env: {
            NODE_ENV: 'production',
            PORT: 3000
        },
        env_production: {
            NODE_ENV: 'production',
            PORT: 3000,
            TEMP_DIR: './temp',
            OUTPUT_DIR: './output',
            MAX_FILE_SIZE: '200MB'
        },
        error_file: './logs/err.log',
        out_file: './logs/out.log',
        log_file: './logs/combined.log',
        time: true,
        max_memory_restart: '1G',
        restart_delay: 4000,
        watch: false,
        ignore_watch: ['node_modules', 'temp', 'output', 'logs'],
        max_restarts: 10,
        min_uptime: '10s'
    }]
};
