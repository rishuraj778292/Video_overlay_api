const axios = require('axios');
const fs = require('fs-extra');

/**
 * Extract file ID from Google Drive URL
 * @param {string} url - Google Drive URL
 * @returns {string} - File ID
 */
function extractFileId(url) {
    // Handle different Google Drive URL formats
    const patterns = [
        /\/file\/d\/([a-zA-Z0-9-_]+)/,  // Standard sharing URL
        /id=([a-zA-Z0-9-_]+)/,          // Direct download URL
        /\/d\/([a-zA-Z0-9-_]+)/         // Short URL format
    ];

    for (const pattern of patterns) {
        const match = url.match(pattern);
        if (match) {
            return match[1];
        }
    }

    throw new Error('Invalid Google Drive URL format');
}

/**
 * Convert Google Drive sharing URL to direct download URL
 * @param {string} shareUrl - Google Drive sharing URL
 * @returns {string} - Direct download URL
 */
function getDirectDownloadUrl(shareUrl) {
    const fileId = extractFileId(shareUrl);
    return `https://drive.google.com/uc?export=download&id=${fileId}`;
}

/**
 * Download video from Google Drive
 * @param {string} driveUrl - Google Drive URL
 * @param {string} outputPath - Local path to save the video
 */
async function downloadVideoFromGDrive(driveUrl, outputPath) {
    try {
        console.log('Processing Google Drive URL:', driveUrl);

        // Convert to direct download URL
        const downloadUrl = getDirectDownloadUrl(driveUrl);
        console.log('Direct download URL:', downloadUrl);

        // Ensure output directory exists
        await fs.ensureDir(require('path').dirname(outputPath));

        // Download the file
        const response = await axios({
            method: 'GET',
            url: downloadUrl,
            responseType: 'stream',
            timeout: 300000, // 5 minutes timeout
            maxRedirects: 5,
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
            }
        });

        // Check if response is HTML (indicating file is too large or requires confirmation)
        const contentType = response.headers['content-type'] || '';
        if (contentType.includes('text/html')) {
            throw new Error('File may be too large or requires manual download confirmation. Please ensure the file is publicly accessible and not too large.');
        }

        // Create write stream and pipe the response
        const writer = fs.createWriteStream(outputPath);
        response.data.pipe(writer);

        return new Promise((resolve, reject) => {
            writer.on('finish', () => {
                console.log('Download completed:', outputPath);
                resolve();
            });

            writer.on('error', (error) => {
                console.error('Write error:', error);
                reject(new Error(`Failed to write file: ${error.message}`));
            });

            response.data.on('error', (error) => {
                console.error('Download error:', error);
                reject(new Error(`Download failed: ${error.message}`));
            });
        });

    } catch (error) {
        console.error('Error downloading from Google Drive:', error);

        if (error.response) {
            if (error.response.status === 404) {
                throw new Error('Video not found. Please check if the Google Drive link is correct and the file is publicly accessible.');
            } else if (error.response.status === 403) {
                throw new Error('Access denied. Please ensure the Google Drive file is publicly accessible.');
            }
        }

        if (error.code === 'ECONNABORTED') {
            throw new Error('Download timeout. The file may be too large or connection is slow.');
        }

        throw new Error(`Failed to download video: ${error.message}`);
    }
}

/**
 * Validate Google Drive URL format
 * @param {string} url - URL to validate
 * @returns {boolean} - Whether URL is valid
 */
function isValidGDriveUrl(url) {
    try {
        extractFileId(url);
        return true;
    } catch {
        return false;
    }
}

module.exports = {
    downloadVideoFromGDrive,
    extractFileId,
    getDirectDownloadUrl,
    isValidGDriveUrl
};
