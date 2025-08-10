const ffmpeg = require('fluent-ffmpeg');
const path = require('path');
const fs = require('fs-extra');

// Set FFmpeg path if specified in environment
if (process.env.FFMPEG_PATH) {
    ffmpeg.setFfmpegPath(process.env.FFMPEG_PATH);
}

/**
 * Add text overlay to video
 * @param {string} inputPath - Path to input video
 * @param {string} outputPath - Path to output video
 * @param {object} options - Text overlay options
 */
async function addTextOverlay(inputPath, outputPath, options = {}) {
    const {
        text = 'Sample Text',
        fontSize = 24,
        fontColor = 'black',
        fontFamily = 'sans-serif',
        fontFile = './ARIALBD.TTF', // Hardcoded font file in main folder
        position = 'top-center',
        backgroundColor = '#FFFACD@0.8', // Light yellow/cream
        borderWidth = 4,
        borderColor = 'black'
    } = options;

    // Advanced text wrapping: handles user line breaks + 30 char auto-wrap
    function wrapText(text, maxCharsPerLine = 30) {
        console.log('📝 Original text input:', JSON.stringify(text));

        // Step 1: Split by user-entered line breaks (preserve manual breaks)
        const userLines = text.split(/\r?\n/);
        console.log('📋 User lines after split:', userLines);

        const finalLines = [];

        // Step 2: Process each user line for auto-wrapping at 30 chars
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

    // Create text file for FFmpeg to use
    const tempDir = process.env.TEMP_DIR || './temp';
    const textFileName = `text_${Date.now()}_${Math.random().toString(36).substring(7)}.txt`;
    const textFilePath = path.join(tempDir, textFileName);

    // Ensure temp directory exists
    await fs.ensureDir(tempDir);

    // Ensure output directory exists
    const outputDir = path.dirname(outputPath);
    await fs.ensureDir(outputDir);
    console.log('📁 Ensured directories exist:', { tempDir, outputDir });

    // Write wrapped text to file (each line on separate line)
    const textContent = wrappedLines.join('\n');
    await fs.writeFile(textFilePath, textContent, 'utf8');

    console.log('📄 Created text file:', textFilePath);
    console.log('📝 Text file content:');
    console.log(textContent);

    return new Promise(async (resolve, reject) => {
        try {
            console.log('🎬 Starting FFmpeg processing...');
            console.log('📁 Input file:', inputPath);
            console.log('📁 Output file:', outputPath);
            console.log('🎨 Text options:', {
                originalText: text,
                wrappedLines: wrappedLines,
                textFilePath: textFilePath,
                fontSize,
                fontColor,
                fontFamily,
                fontFile
            });

            // Build multiple drawtext filters - one for each line to create separate boxes
            // Convert Windows paths to forward slashes for FFmpeg
            const ffmpegFontPath = fontFile.replace(/\\/g, '/');

            const drawTextFilters = [];
            const verticalPadding = 0; // Padding above and below text
            const boxHeight = fontSize + (verticalPadding * 2); // Actual box height with padding
            const gap = 6; // Space between boxes

            wrappedLines.forEach((line, index) => {
                if (line.trim() === '') return; // Skip empty lines

                const yPosition = 30 + (index * (boxHeight + gap)); // Use actual box height for even spacing
                let filter;

                if (fontFile && fs.existsSync(fontFile)) {
                    filter = `drawtext=fontfile='${ffmpegFontPath}':text='${line.replace(/'/g, "\\'")}':fontsize=${fontSize}:fontcolor=${fontColor}:x=(w-text_w)/2:y=${yPosition}:box=1:boxcolor=${backgroundColor}:boxborderw=${borderWidth}:bordercolor=${borderColor}`;
                } else if (fontFamily !== 'sans-serif') {
                    filter = `drawtext=fontfile='${fontFamily}':text='${line.replace(/'/g, "\\'")}':fontsize=${fontSize}:fontcolor=${fontColor}:x=(w-text_w)/2:y=${yPosition}:box=1:boxcolor=${backgroundColor}:boxborderw=${borderWidth}:bordercolor=${borderColor}`;
                } else {
                    filter = `drawtext=text='${line.replace(/'/g, "\\'")}':fontsize=${fontSize}:fontcolor=${fontColor}:x=(w-text_w)/2:y=${yPosition}:box=1:boxcolor=${backgroundColor}:boxborderw=${borderWidth}:bordercolor=${borderColor}`;
                }

                drawTextFilters.push(filter);
                console.log(`📝 Line ${index + 1}: "${line}" at Y=${yPosition}`);
            });

            if (fontFile && fs.existsSync(fontFile)) {
                console.log('🔤 Using custom font file:', fontFile);
            }

            console.log('🎛️ FFmpeg filters:', drawTextFilters);

            const command = ffmpeg(inputPath)
                .videoFilters(drawTextFilters)
                .outputOptions([
                    '-c:v libx264',     // Use H.264 codec
                    '-c:a copy',        // Copy audio without re-encoding
                    '-preset ultrafast', // Faster encoding for Render's limited resources
                    '-crf 28',          // Higher CRF for smaller file size and faster processing
                    '-movflags +faststart', // Optimize for web streaming
                    '-f mp4'            // Force MP4 output format for consistency
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

                    // Clean up the text file
                    try {
                        await fs.remove(textFilePath);
                        console.log('🧹 Text file cleaned up:', textFilePath);
                    } catch (cleanupError) {
                        console.error('⚠️ Error cleaning up text file:', cleanupError);
                    }

                    resolve();
                })
                .on('error', async (error) => {
                    console.error('❌ FFmpeg error:', error);

                    // Clean up the text file even on error
                    try {
                        await fs.remove(textFilePath);
                        console.log('🧹 Text file cleaned up after error:', textFilePath);
                    } catch (cleanupError) {
                        console.error('⚠️ Error cleaning up text file:', cleanupError);
                    }

                    reject(new Error(`Video processing failed: ${error.message}`));
                });

            // Start the processing
            command.run();
        } catch (error) {
            console.error('❌ Error setting up FFmpeg:', error);
            // Clean up the text file on setup error
            try {
                await fs.remove(textFilePath);
                console.log('🧹 Text file cleaned up after setup error:', textFilePath);
            } catch (cleanupError) {
                console.error('⚠️ Error cleaning up text file:', cleanupError);
            }
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
    addTextOverlay,
    getVideoInfo,
    isValidVideo,
    getVideoDuration,
    createThumbnail
};
