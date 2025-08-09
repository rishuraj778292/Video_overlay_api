const express = require('express');
const cors = require('cors');
const path = require('path');
const fs = require('fs-extra');
require('dotenv').config();

const overlayRoutes = require('./routes/overlay');
const downloadRoutes = require('./routes/download');
const { ensureDirectories } = require('./utils/fileUtils');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors({
    origin: process.env.CORS_ORIGIN || '*'
}));
app.use(express.json({ limit: '100mb' })); // Removed file size limit
app.use(express.urlencoded({ extended: true, limit: '100mb' }));

// Memory monitoring for Render
if (process.env.NODE_ENV === 'production') {
    setInterval(() => {
        const used = process.memoryUsage();
        const memMB = Math.round(used.rss / 1024 / 1024);
        if (memMB > 400) { // Warn at 400MB (80% of 512MB limit)
            console.warn(`⚠️ High memory usage: ${memMB}MB`);
        }
    }, 30000); // Check every 30 seconds
}

// Ensure required directories exist
ensureDirectories();

// Routes
app.use('/api/overlay', overlayRoutes);
app.use('/api/download', downloadRoutes);

// Health check endpoint
app.get('/health', (req, res) => {
    res.json({
        status: 'OK',
        timestamp: new Date().toISOString(),
        service: 'Video Overlay API'
    });
});

// Root endpoint
app.get('/', (req, res) => {
    res.json({
        message: 'Video Overlay API',
        version: '1.0.0',
        endpoints: {
            overlay: 'POST /api/overlay',
            download: 'GET /api/download/:filename',
            health: 'GET /health'
        }
    });
});

// Error handling middleware
app.use((err, req, res, next) => {
    console.error('Error:', err);
    res.status(500).json({
        success: false,
        error: 'Internal server error',
        message: err.message
    });
});

// 404 handler
app.use('*', (req, res) => {
    res.status(404).json({
        success: false,
        error: 'Endpoint not found'
    });
});

// Graceful shutdown
process.on('SIGINT', async () => {
    console.log('Shutting down gracefully...');

    // Clean up temp files
    try {
        await fs.emptyDir(process.env.TEMP_DIR || './temp');
        console.log('Temp files cleaned up');
    } catch (error) {
        console.error('Error cleaning temp files:', error);
    }

    process.exit(0);
});

app.listen(PORT, () => {
    console.log(`🚀 Video Overlay API running on port ${PORT}`);
    console.log(`📁 Temp directory: ${process.env.TEMP_DIR || './temp'}`);
    console.log(`📁 Output directory: ${process.env.OUTPUT_DIR || './output'}`);
    console.log(`🌐 Access the API at: http://localhost:${PORT}`);
});
