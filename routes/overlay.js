const express = require('express');
const router = express.Router();
const { v4: uuidv4 } = require('uuid');
const path = require('path');
const fs = require('fs-extra');
const { downloadVideoFromGDrive } = require('../utils/driveUtils');
const { addTextOverlayWithStructure } = require('../utils/videoUtils');
const { validateOverlayRequest } = require('../utils/validation');

// Simple in-memory store to prevent duplicate requests
const processingRequests = new Map();

router.post('/', async (req, res) => {
    // Create a unique key based on request content to detect duplicates
    const requestKey = Buffer.from(JSON.stringify({ videoUrl: req.body.videoUrl, text: req.body.text })).toString('base64');
    
    // Check if this exact request is already being processed
    if (processingRequests.has(requestKey)) {
        console.log(`🔄 Duplicate request detected for key: ${requestKey.substring(0, 20)}...`);
        return res.status(429).json({
            success: false,
            error: 'Duplicate request',
            message: 'This request is already being processed. Please wait for completion.'
        });
    }

    const requestId = uuidv4();
    console.log(`[${requestId}] 🎬 Processing overlay request`);
    
    // Mark this request as being processed
    processingRequests.set(requestKey, { requestId, startTime: Date.now() });

    try {
        // Validate request
        const validation = validateOverlayRequest(req.body);
        if (!validation.isValid) {
            processingRequests.delete(requestKey); // Clean up on validation failure
            return res.status(400).json({
                success: false,
                error: 'Validation failed',
                details: validation.errors
            });
        }

        const { videoUrl, text } = req.body;

        console.log(`[${requestId}] 📋 Request details:`, {
            videoUrl: videoUrl.substring(0, 50) + '...',
            text: text
        });        // Create temporary filename for input video
        const tempDir = process.env.TEMP_DIR || './temp';
        const outputDir = process.env.OUTPUT_DIR || './output';

        const inputFileName = `input_${requestId}.mp4`;
        const outputFileName = `overlay_${requestId}_${Date.now()}.mp4`;

        const inputPath = path.join(tempDir, inputFileName);
        const outputPath = path.join(outputDir, outputFileName);

        // Step 1: Download video from Google Drive
        console.log(`[${requestId}] 📥 Downloading video from Google Drive...`);
        await downloadVideoFromGDrive(videoUrl, inputPath);
        console.log(`[${requestId}] ✅ Video downloaded successfully`);

        // Step 2: Add text overlay with video structure (light blue background + scaled video + text)
        console.log(`[${requestId}] 🎨 Adding text overlay with video structure...`);
        await addTextOverlayWithStructure(inputPath, outputPath, {
            text,
            fontSize: 30, // Smaller font size to fit in fixed height boxes
            fontColor: 'black',
            fontFamily: 'sans-serif',
            fontFile: './ARIALBD.TTF',
            backgroundColor: '#fffbb3', // Light yellow text background
            backgroundVideoColor: '#00d9ff', // Light blue video background color
            borderWidth: 7, // Reduced border width for cleaner look
            borderColor: '#333333', // Dark gray border
            textPadding: 6, // Padding around text inside the box
            lineSpacing: 0, // Zero spacing for connected boxes
            fixedBoxHeight: 65, // Fixed height for uniform text boxes (centered text)
            videoWidth: 1200, // Reduced video width
            videoHeight: 675, // Proportional video height (16:9 aspect)
            videoX: 40, // Small left padding
            videoY: 140, // Enough top padding for text
            canvasWidth: 1280, // Reduced canvas width
            canvasHeight: 855 // Reduced canvas height (140 + 675 + 40 padding)
        });
        console.log(`[${requestId}] ✅ Text overlay added successfully`);

        // Step 3: Clean up input file
        await fs.remove(inputPath);
        console.log(`[${requestId}] 🧹 Temporary files cleaned up`);

        // Step 4: Return download URL
        const downloadUrl = `https://video-overlay-api-17wf.onrender.com/api/download/${outputFileName}`;

        console.log(`[${requestId}] 🎉 Request completed successfully`);

        // Clean up the processing request tracker
        processingRequests.delete(requestKey);

        res.json({
            success: true,
            downloadUrl,
            filename: outputFileName,
            message: 'Video processed successfully',
            requestId
        });

    } catch (error) {
        console.error(`[${requestId}] ❌ Error processing request:`, error);

        // Clean up the processing request tracker on error
        processingRequests.delete(requestKey);

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
    } finally {
        // Ensure cleanup happens even if there are unexpected errors
        processingRequests.delete(requestKey);
    }
});

// Clean up old processing requests (older than 10 minutes)
setInterval(() => {
    const now = Date.now();
    const tenMinutesAgo = now - (10 * 60 * 1000);
    
    for (const [key, value] of processingRequests.entries()) {
        if (value.startTime < tenMinutesAgo) {
            console.log(`🧹 Cleaning up old processing request: ${key.substring(0, 20)}...`);
            processingRequests.delete(key);
        }
    }
}, 60000); // Run every minute

module.exports = router;
