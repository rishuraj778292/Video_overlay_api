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
        position = 'top-center',
        backgroundColor = '#FFFACD@0.8', // Light yellow/cream
        borderWidth = 1,
        borderColor = 'black'
    } = options;

    // Format text: capitalize first letter of each word and handle wrapping
    const formattedText = text.split(' ')
        .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
        .join(' ');

    return new Promise((resolve, reject) => {
        console.log('Starting FFmpeg processing...');
        console.log('Input:', inputPath);
        console.log('Output:', outputPath);
        console.log('Text options:', { text: formattedText, fontSize, fontColor, fontFamily });

        // Ensure output directory exists
        fs.ensureDirSync(path.dirname(outputPath));

        // Build the drawtext filter with text wrapping and proper positioning
        // Calculate max width based on video width (80% of video width for padding)
        const drawTextFilter = `drawtext=text='${formattedText.replace(/'/g, "\\'")}':fontsize=${fontSize}:fontcolor=${fontColor}:x=(w-text_w)/2:y=50:box=1:boxcolor=${backgroundColor}:boxborderw=${borderWidth}:bordercolor=${borderColor}:line_spacing=10:text_align=center`;

        const command = ffmpeg(inputPath)
            .videoFilters([drawTextFilter])
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
                console.log('FFmpeg command:', commandLine);
            })
            .on('progress', (progress) => {
                if (progress.percent) {
                    console.log(`Processing: ${Math.round(progress.percent)}% done`);
                }
            })
            .on('end', () => {
                console.log('FFmpeg processing completed successfully');
                resolve();
            })
            .on('error', (error) => {
                console.error('FFmpeg error:', error);
                reject(new Error(`Video processing failed: ${error.message}`));
            });

        // Start the processing
        command.run();
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
