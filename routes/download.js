const express = require('express');
const router = express.Router();
const path = require('path');
const fs = require('fs-extra');

router.get('/:filename', async (req, res) => {
    try {
        console.log("call recieved")
        const { filename } = req.params;
        const outputDir = process.env.OUTPUT_DIR || './output';
        const filePath = path.join(outputDir, filename);

        // Security check: ensure filename doesn't contain path traversal
        const normalizedPath = path.normalize(path.resolve(filePath));
        const normalizedOutputDir = path.normalize(path.resolve(outputDir));

        console.log('🔍 Path validation:');
        console.log('  - Filename:', filename);
        console.log('  - File path:', filePath);
        console.log('  - Normalized file path:', normalizedPath);
        console.log('  - Normalized output dir:', normalizedOutputDir);
        console.log('  - Starts with check:', normalizedPath.startsWith(normalizedOutputDir));

        if (!normalizedPath.startsWith(normalizedOutputDir)) {
            console.error('❌ Security check failed - path traversal detected');
            return res.status(400).json({
                success: false,
                error: 'Invalid filename'
            });
        }

        // Check if file exists
        if (!(await fs.pathExists(filePath))) {
            return res.status(404).json({
                success: false,
                error: 'File not found'
            });
        }

        // Get file stats
        const stats = await fs.stat(filePath);
        const fileSize = stats.size;

        // Set headers for video download
        res.setHeader('Content-Type', 'video/mp4');
        res.setHeader('Content-Length', fileSize);
        res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
        res.setHeader('Accept-Ranges', 'bytes');

        // Handle range requests for video streaming
        const range = req.headers.range;
        if (range) {
            const parts = range.replace(/bytes=/, "").split("-");
            const start = parseInt(parts[0], 10);
            const end = parts[1] ? parseInt(parts[1], 10) : fileSize - 1;
            const chunksize = (end - start) + 1;

            res.status(206);
            res.setHeader('Content-Range', `bytes ${start}-${end}/${fileSize}`);
            res.setHeader('Content-Length', chunksize);

            const stream = fs.createReadStream(filePath, { start, end });
            stream.pipe(res);
        } else {
            // Stream the entire file
            const stream = fs.createReadStream(filePath);
            stream.pipe(res);
        }

        // Log download
        console.log(`File downloaded: ${filename} (${(fileSize / 1024 / 1024).toFixed(2)} MB)`);

        // Auto-delete file after serving for Render storage optimization
        setTimeout(async () => {
            try {
                if (await fs.pathExists(filePath)) {
                    await fs.remove(filePath);
                    console.log(`Auto-deleted: ${filename}`);
                }
            } catch (error) {
                console.error(`Error auto-deleting ${filename}:`, error);
            }
        }, 5000); // Delete after 5 seconds

    } catch (error) {
        console.error('Download error:', error);
        res.status(500).json({
            success: false,
            error: 'Download failed',
            message: error.message
        });
    }
});

// Endpoint to list available files (for debugging)
router.get('/', async (req, res) => {
    try {
        const outputDir = process.env.OUTPUT_DIR || './output';

        if (!(await fs.pathExists(outputDir))) {
            return res.json({
                success: true,
                files: [],
                message: 'Output directory not found'
            });
        }

        const files = await fs.readdir(outputDir);
        const fileDetails = await Promise.all(
            files.map(async (file) => {
                const filePath = path.join(outputDir, file);
                const stats = await fs.stat(filePath);
                return {
                    filename: file,
                    size: stats.size,
                    sizeFormatted: `${(stats.size / 1024 / 1024).toFixed(2)} MB`,
                    created: stats.birthtime,
                    downloadUrl: `/api/download/${file}`
                };
            })
        );

        res.json({
            success: true,
            files: fileDetails,
            count: fileDetails.length
        });

    } catch (error) {
        console.error('List files error:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to list files',
            message: error.message
        });
    }
});

module.exports = router;
