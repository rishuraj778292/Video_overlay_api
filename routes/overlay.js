const express = require('express');
const router = express.Router();
const { v4: uuidv4 } = require('uuid');
const path = require('path');
const fs = require('fs-extra');
const { downloadVideoFromGDrive } = require('../utils/driveUtils');
const { addTextOverlayWithStructure, addTextOverlayWithoutBackground } = require('../utils/videoUtils');
const { validateOverlayRequest } = require('../utils/validation');

router.post('/', async (req, res) => {
    const requestId = uuidv4();

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

        const { videoUrl, text, typeOfVideo } = req.body;

        // Default to "edit background" if typeOfVideo is not provided
        const videoType = typeOfVideo ? typeOfVideo.toLowerCase() : 'edit background';

        console.log(`[${requestId}] 🎬 Processing video with type: "${videoType}"`);
        console.log(`[${requestId}] 📁 Video URL: ${videoUrl}`);

        // Create temporary filename for input video
        const tempDir = process.env.TEMP_DIR || './temp';
        const outputDir = process.env.OUTPUT_DIR || './output';

        const inputFileName = `input_${requestId}.mp4`;
        const outputFileName = `overlay_${requestId}_${Date.now()}.mp4`;

        const inputPath = path.join(tempDir, inputFileName);
        const outputPath = path.join(outputDir, outputFileName);

        console.log(`[${requestId}] 📥 Starting download to: ${inputPath}`);

        // Step 1: Download video from Google Drive
        await downloadVideoFromGDrive(videoUrl, inputPath);

        console.log(`[${requestId}] ✅ Download completed, starting video processing...`);

        // Step 2: Add text overlay based on video type
        if (videoType === 'edit background') {
            console.log(`[${requestId}] 🎨 Processing with background editing...`);
            // Add text overlay with video structure (light blue background + scaled video + text)
            await addTextOverlayWithStructure(inputPath, outputPath, {
                text,
                fontSize: 28, // Smaller font size to fit in fixed height boxes
                fontColor: 'black',
                fontFamily: 'sans-serif',
                fontFile: './ARIALBD.TTF',
                backgroundColor: '#fffbb3', // Light yellow text background
                backgroundVideoColor: '#00BCD5', // Light blue video background color
                borderWidth: 15, // Reduced border width for cleaner look
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
        } else {
            console.log(`[${requestId}] 🎬 Processing without background editing...`);
            // Add text overlay without background editing (directly on top of video)
            await addTextOverlayWithoutBackground(inputPath, outputPath, {
                text,
                fontSize: 42, // Same font size
                fontColor: 'black',
                fontFamily: 'sans-serif',
                fontFile: './ARIALBD.TTF',
                backgroundColor: '#fffbb3', // Same light yellow text background
                borderWidth: 20, // Same border width
                textPadding: 6, // Same padding
                lineSpacing: 0, // Same spacing
                fixedBoxHeight: 100 // Same fixed height for uniform text boxes
            });
        }

        console.log(`[${requestId}] 🎥 Video processing completed successfully`);

        // Step 3: Clean up input file
        await fs.remove(inputPath);

        console.log(`[${requestId}] 🗑️ Cleaned up temporary files`);

        // Step 4: Return download URL
        const downloadUrl = `/api/download/${outputFileName}`;

        console.log(`[${requestId}] ✅ Processing completed, download URL: ${downloadUrl}`);

        res.json({
            success: true,
            downloadUrl,
            filename: outputFileName,
            message: 'Video processed successfully',
            requestId
        });

    } catch (error) {
        console.error(`[${requestId}] ❌ Error processing request:`, error);

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
