const express = require('express');
const router = express.Router();
const { v4: uuidv4 } = require('uuid');
const path = require('path');
const fs = require('fs-extra');
const { downloadVideoFromGDrive } = require('../utils/driveUtils');
const { addTextOverlay } = require('../utils/videoUtils');
const { validateOverlayRequest } = require('../utils/validation');

router.post('/', async (req, res) => {
    const requestId = uuidv4();
    console.log(`[${requestId}] Processing overlay request`);

    try {
        // Validate request
        const validation = validateOverlayRequest(req.body);
        if (!validation.isValid) {
            return res.status(400).json({
                success: false,
                error: 'Validation failed',
                details: validation.errors
            });
        }

        const { videoUrl, text, fontSize = 24, fontColor = 'black', fontFamily = 'sans-serif' } = req.body;

        console.log(`[${requestId}] Request details:`, {
            videoUrl: videoUrl.substring(0, 50) + '...',
            text,
            fontSize,
            fontColor,
            fontFamily
        });

        // Create temporary filename for input video
        const tempDir = process.env.TEMP_DIR || './temp';
        const outputDir = process.env.OUTPUT_DIR || './output';

        const inputFileName = `input_${requestId}.mp4`;
        const outputFileName = `overlay_${requestId}_${Date.now()}.mp4`;

        const inputPath = path.join(tempDir, inputFileName);
        const outputPath = path.join(outputDir, outputFileName);

        // Step 1: Download video from Google Drive
        console.log(`[${requestId}] Downloading video from Google Drive...`);
        await downloadVideoFromGDrive(videoUrl, inputPath);
        console.log(`[${requestId}] Video downloaded successfully`);

        // Step 2: Add text overlay
        console.log(`[${requestId}] Adding text overlay...`);
        await addTextOverlay(inputPath, outputPath, {
            text,
            fontSize,
            fontColor,
            fontFamily
        });
        console.log(`[${requestId}] Text overlay added successfully`);

        // Step 3: Clean up input file
        await fs.remove(inputPath);
        console.log(`[${requestId}] Temporary files cleaned up`);

        // Step 4: Return download URL
        const downloadUrl = `/api/download/${outputFileName}`;

        res.json({
            success: true,
            downloadUrl,
            filename: outputFileName,
            message: 'Video processed successfully',
            requestId
        });

        console.log(`[${requestId}] Request completed successfully`);

    } catch (error) {
        console.error(`[${requestId}] Error processing request:`, error);

        // Clean up any temporary files
        try {
            const tempDir = process.env.TEMP_DIR || './temp';
            const inputFileName = `input_${requestId}.mp4`;
            const inputPath = path.join(tempDir, inputFileName);

            if (await fs.pathExists(inputPath)) {
                await fs.remove(inputPath);
            }
        } catch (cleanupError) {
            console.error(`[${requestId}] Error during cleanup:`, cleanupError);
        }

        res.status(500).json({
            success: false,
            error: 'Processing failed',
            message: error.message,
            requestId
        });
    }
});

module.exports = router;
