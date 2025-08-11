const ffmpeg = require('fluent-ffmpeg');
const path = require('path');
const fs = require('fs-extra');

// Set FFmpeg path if specified in environment
if (process.env.FFMPEG_PATH) {
    ffmpeg.setFfmpegPath(process.env.FFMPEG_PATH);
}

/**
 * Add text overlay with video structure (blue background + scaled video + text)
 * @param {string} inputPath - Path to input video
 * @param {string} outputPath - Path to output video
 * @param {object} options - Text overlay options
 */
async function addTextOverlayWithStructure(inputPath, outputPath, options = {}) {
    const {
        text = 'Sample Text',
        fontSize = 30,
        fontColor = 'black',
        fontFamily = 'sans-serif',
        fontFile = './ARIALBD.TTF', // Hardcoded font file in main folder
        backgroundColor = '#fffbb3', // Text background
        backgroundVideoColor = '#00d9ff', // Video background color
        borderWidth = 7, // Border width for text box
        borderColor = 'black',
        textPadding = 3, // Padding around text inside the box
        lineSpacing = 0, // Space between text lines (set to 0 for connected boxes)
        fixedBoxHeight = 65, // Fixed height for all text boxes
        videoWidth = 900, // Scaled video width
        videoHeight = 1520, // Scaled video height
        videoX = 60, // Video position X
        videoY = 120, // Video position Y
        canvasWidth = 1080, // Canvas width
        canvasHeight = 1920// Canvas height
    } = options;

    // Advanced text wrapping: handles user line breaks + 47char auto-wrap
    function wrapText(text, maxCharsPerLine = 30) {
        console.log('📝 Original text input:', JSON.stringify(text));

        // Step 1: Split by user-entered line breaks (preserve manual breaks)
        const userLines = text.split(/\r?\n/);
        console.log('📋 User lines after split:', userLines);

        const finalLines = [];

        // Step 2: Process each user line for auto-wrapping at 47 chars
        userLines.forEach((line, lineIndex) => {
            console.log(`🔍 Processing line ${lineIndex + 1}: "${line}" (length: ${line.length})`);

            if (line.trim() === '') {
                // Empty line - preserve it
                finalLines.push('');
                console.log('➡️ Added empty line');
                return;
            }

            // If line is 30 chars or less, keep as is
            if (line.length <= maxCharsPerLine) {
                finalLines.push(line.trim());
                console.log(`➡️ Line fits: "${line.trim()}"`);
                return;
            }

            // Line is longer than 30 chars - need to wrap
            const words = line.trim().split(' ');
            let currentLine = '';

            for (const word of words) {
                const testLine = currentLine ? `${currentLine} ${word}` : word;

                if (testLine.length <= maxCharsPerLine) {
                    currentLine = testLine;
                } else {
                    // Current line is full, start new line
                    if (currentLine) {
                        finalLines.push(currentLine);
                        console.log(`➡️ Added wrapped line: "${currentLine}"`);
                        currentLine = word;
                    } else {
                        // Single word is longer than 30 chars - split it
                        if (word.length > maxCharsPerLine) {
                            let remainingWord = word;
                            while (remainingWord.length > maxCharsPerLine) {
                                const chunk = remainingWord.substring(0, maxCharsPerLine);
                                finalLines.push(chunk);
                                console.log(`➡️ Added word chunk: "${chunk}"`);
                                remainingWord = remainingWord.substring(maxCharsPerLine);
                            }
                            if (remainingWord) {
                                currentLine = remainingWord;
                            }
                        } else {
                            currentLine = word;
                        }
                    }
                }
            }

            // Add any remaining text
            if (currentLine) {
                finalLines.push(currentLine);
                console.log(`➡️ Added final line: "${currentLine}"`);
            }
        });

        console.log('✅ Final wrapped lines:', finalLines);
        console.log('📊 Total lines created:', finalLines.length);

        return finalLines; // Return array of lines
    }

    // Format and wrap the text
    const wrappedLines = wrapText(text, 30);

    // Ensure output directory exists
    const outputDir = path.dirname(outputPath);
    await fs.ensureDir(outputDir);
    console.log('📁 Ensured directories exist:', { outputDir });

    return new Promise(async (resolve, reject) => {
        try {
            console.log('🎬 Starting FFmpeg processing with video structure...');
            console.log('📁 Input file:', inputPath);
            console.log('📁 Output file:', outputPath);

            // Convert Windows paths to forward slashes for FFmpeg
            const ffmpegFontPath = fontFile.replace(/\\/g, '/');

            // Get video info first to determine aspect ratio
            const videoInfo = await getVideoInfo(inputPath);
            const videoStream = videoInfo.streams.find(stream => stream.codec_type === 'video');
            const originalWidth = videoStream.width;
            const originalHeight = videoStream.height;
            const aspectRatio = originalWidth / originalHeight;

            // Get video duration
            const videoDuration = videoInfo.format.duration || videoStream.duration;

            console.log('📹 Original video dimensions:', { originalWidth, originalHeight, aspectRatio, duration: videoDuration });

            // Create canvas with same aspect ratio but larger size
            const canvasHeight = 1080; // Fixed height
            const canvasWidth = Math.round(canvasHeight * aspectRatio);

            // Add more top padding for text area
            const topPadding = 140; // Increased top padding for text
            const sidePadding = 45;  // Side padding

            // Scale down video to create padding
            const availableHeight = canvasHeight - topPadding - sidePadding;
            const availableWidth = canvasWidth - (sidePadding * 2);

            // Calculate video size maintaining aspect ratio
            let scaledVideoWidth, scaledVideoHeight;
            if (availableWidth / availableHeight > aspectRatio) {
                // Height is the limiting factor
                scaledVideoHeight = availableHeight;
                scaledVideoWidth = Math.round(availableHeight * aspectRatio);
            } else {
                // Width is the limiting factor
                scaledVideoWidth = availableWidth;
                scaledVideoHeight = Math.round(availableWidth / aspectRatio);
            }

            // Position video (centered horizontally, with top padding)
            const videoX = Math.round((canvasWidth - scaledVideoWidth) / 2);
            const videoY = topPadding + 45;

            console.log('🎨 Canvas and video layout:', {
                canvasWidth,
                canvasHeight,
                scaledVideoWidth,
                scaledVideoHeight,
                videoX,
                videoY,
                topPadding,
                sidePadding
            });

            // Use complex filter to create the desired layout
            const complexFilterParts = [
                // Create background canvas with video duration
                `color=c=${backgroundVideoColor}:s=${canvasWidth}x${canvasHeight}:d=${videoDuration}[bg]`,
                // Scale video to fit with padding
                `[0:v]scale=${scaledVideoWidth}:${scaledVideoHeight}:force_original_aspect_ratio=decrease,setpts=PTS-STARTPTS[video]`,
                // Overlay video on background
                `[bg][video]overlay=${videoX}:${videoY}[base]`
            ];

            // Add text overlays in the top padding area with fixed height boxes and zero gaps
            let currentInput = '[base]';

            wrappedLines.forEach((line, index) => {
                if (line.trim() === '') return; // Skip empty lines

                // Position boxes with slight overlap to eliminate gaps between them
                // Reduce spacing by border width to make boxes touch/overlap
                const boxSpacing = fixedBoxHeight - (borderWidth * 2)-10;
                const boxY = 30 + (index * boxSpacing);
                // Use simple calculation for centering (compatible with older FFmpeg)
                const textY = boxY + Math.floor((fixedBoxHeight - fontSize) / 2);
                const outputLabel = index === wrappedLines.length - 1 ? '' : `[text${index}]`;

                let drawTextFilter;
                if (fontFile && fs.existsSync(fontFile)) {
                    drawTextFilter = `${currentInput}drawtext=fontfile='${ffmpegFontPath}':text='${line.replace(/'/g, "\\'")}':fontsize=${fontSize}:fontcolor=${fontColor}:x=(w-text_w)/2:y=${textY}:box=1:boxcolor=${backgroundColor}@0.9:boxborderw=${borderWidth}:bordercolor=${borderColor}${outputLabel}`;
                } else {
                    drawTextFilter = `${currentInput}drawtext=text='${line.replace(/'/g, "\\'")}':fontsize=${fontSize}:fontcolor=${fontColor}:x=(w-text_w)/2:y=${textY}:box=1:boxcolor=${backgroundColor}@0.9:boxborderw=${borderWidth}:bordercolor=${borderColor}${outputLabel}`;
                }

                complexFilterParts.push(drawTextFilter);
                currentInput = `[text${index}]`;

                console.log(`📝 Line ${index + 1}: "${line}" at boxY=${boxY}, textY=${textY} with overlapping positioning (spacing=${boxSpacing})`);
            });

            // Join all filter parts with semicolons
            const complexFilter = complexFilterParts.join(';');

            if (fontFile && fs.existsSync(fontFile)) {
                console.log('🔤 Using custom font file:', fontFile);
            }

            console.log('🎛️ FFmpeg complex filter:', complexFilter);

            const command = ffmpeg(inputPath)
                .complexFilter(complexFilter)
                .outputOptions([
                    '-c:v libx264',     // Use H.264 codec
                    '-c:a copy',        // Copy audio without re-encoding
                    '-preset ultrafast', // Faster encoding
                    '-crf 28',          // Higher CRF for smaller file size
                    '-movflags +faststart', // Optimize for web streaming
                    '-f mp4'            // Force MP4 output format
                ])
                .output(outputPath)
                .on('start', (commandLine) => {
                    console.log('🚀 FFmpeg command started:', commandLine);
                })
                .on('progress', (progress) => {
                    if (progress.percent) {
                        console.log(`⏳ Processing: ${Math.round(progress.percent)}% done (${progress.timemark})`);
                    }
                })
                .on('end', async () => {
                    console.log('✅ FFmpeg processing completed successfully');
                    console.log('📁 Output file created:', outputPath);
                    resolve();
                })
                .on('error', async (error) => {
                    console.error('❌ FFmpeg error:', error);
                    reject(new Error(`Video processing failed: ${error.message}`));
                });

            // Start the processing
            command.run();
        } catch (error) {
            console.error('❌ Error setting up FFmpeg:', error);
            reject(error);
        }
    });
}

/**
 * Get video information using FFprobe
 * @param {string} videoPath - Path to video file
 * @returns {Promise<object>} - Video metadata
 */
async function getVideoInfo(videoPath) {
    return new Promise((resolve, reject) => {
        ffmpeg.ffprobe(videoPath, (error, metadata) => {
            if (error) {
                reject(new Error(`Failed to get video info: ${error.message}`));
            } else {
                resolve(metadata);
            }
        });
    });
}

/**
 * Validate if file is a valid video
 * @param {string} videoPath - Path to video file
 * @returns {Promise<boolean>} - Whether file is valid video
 */
async function isValidVideo(videoPath) {
    try {
        const info = await getVideoInfo(videoPath);
        return info.streams && info.streams.some(stream => stream.codec_type === 'video');
    } catch {
        return false;
    }
}

/**
 * Get video duration in seconds
 * @param {string} videoPath - Path to video file
 * @returns {Promise<number>} - Duration in seconds
 */
async function getVideoDuration(videoPath) {
    const info = await getVideoInfo(videoPath);
    return parseFloat(info.format.duration);
}

/**
 * Create thumbnail from video
 * @param {string} videoPath - Path to video file
 * @param {string} thumbnailPath - Path for thumbnail output
 * @param {number} timeStamp - Time in seconds to capture thumbnail
 */
async function createThumbnail(videoPath, thumbnailPath, timeStamp = 1) {
    return new Promise((resolve, reject) => {
        ffmpeg(videoPath)
            .screenshots({
                timestamps: [timeStamp],
                filename: path.basename(thumbnailPath),
                folder: path.dirname(thumbnailPath),
                size: '320x240'
            })
            .on('end', () => {
                console.log('Thumbnail created:', thumbnailPath);
                resolve();
            })
            .on('error', (error) => {
                console.error('Thumbnail creation error:', error);
                reject(new Error(`Failed to create thumbnail: ${error.message}`));
            });
    });
}

module.exports = {

    addTextOverlayWithStructure,
    getVideoInfo,
    isValidVideo,
    getVideoDuration,
    createThumbnail
};

