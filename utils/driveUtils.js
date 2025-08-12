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
 * Alternative download URL for large files
 * @param {string} shareUrl - Google Drive sharing URL
 * @returns {string} - Alternative download URL
 */
function getAlternativeDownloadUrl(shareUrl) {
    const fileId = extractFileId(shareUrl);
    return `https://drive.usercontent.google.com/download?id=${fileId}&export=download&authuser=0&confirm=t`;
}

/**
 * Extract confirmation token from HTML response
 * @param {string} htmlContent - HTML content from Google Drive
 * @returns {string|null} - Confirmation token or null
 */
function extractConfirmationToken(htmlContent) {
    // Look for various patterns that Google Drive uses for confirmation
    const patterns = [
        /confirm=([a-zA-Z0-9-_]+)/,
        /&amp;confirm=([a-zA-Z0-9-_]+)/,
        /"confirm":"([a-zA-Z0-9-_]+)"/,
        /confirm=([^&"']+)/
    ];

    for (const pattern of patterns) {
        const match = htmlContent.match(pattern);
        if (match) {
            return match[1];
        }
    }

    // Look for download links in the HTML
    const downloadLinkPatterns = [
        /href="(https:\/\/drive\.usercontent\.google\.com\/download[^"]+)"/,
        /href="(https:\/\/drive\.google\.com\/uc\?export=download[^"]+)"/
    ];

    for (const pattern of downloadLinkPatterns) {
        const match = htmlContent.match(pattern);
        if (match) {
            // Extract the URL and decode HTML entities
            const url = match[1].replace(/&amp;/g, '&');
            return url;
        }
    }

    return null;
}

/**
 * Download video from Google Drive with enhanced error handling
 * @param {string} driveUrl - Google Drive URL
 * @param {string} outputPath - Local path to save the video
 */
async function downloadVideoFromGDrive(driveUrl, outputPath) {
    try {
        // Convert to direct download URL
        const downloadUrl = getDirectDownloadUrl(driveUrl);
        

        // Ensure output directory exists
        await fs.ensureDir(require('path').dirname(outputPath));

        // First attempt - try direct download
        let response = await downloadWithFallback(downloadUrl);

        // Check if response is HTML (indicating file requires confirmation)
        const contentType = response.headers['content-type'] || '';
        if (contentType.includes('text/html')) {
     

            // Convert stream to string to parse HTML
            let htmlContent = '';
            response.data.on('data', chunk => {
                htmlContent += chunk.toString();
            });

            await new Promise((resolve, reject) => {
                response.data.on('end', resolve);
                response.data.on('error', reject);
            });

    

            // Try to extract confirmation token or direct download link
            const confirmationResult = extractConfirmationToken(htmlContent);

            if (confirmationResult) {
                let confirmedDownloadUrl;

                if (confirmationResult.startsWith('http')) {
                    // It's a direct download URL
                    confirmedDownloadUrl = confirmationResult;
                } else {
                    // It's a confirmation token
                    const fileId = extractFileId(driveUrl);
                    confirmedDownloadUrl = `https://drive.google.com/uc?export=download&id=${fileId}&confirm=${confirmationResult}`;
                }

             

                // Try downloading with the confirmed URL
                response = await downloadWithFallback(confirmedDownloadUrl);

                // Check again if it's still HTML
                const newContentType = response.headers['content-type'] || '';
                if (newContentType.includes('text/html')) {
                    // Try alternative download method
       
                    const altUrl = getAlternativeDownloadUrl(driveUrl);
          
                    response = await downloadWithFallback(altUrl);

                    const altContentType = response.headers['content-type'] || '';
                    if (altContentType.includes('text/html')) {
                        throw new Error('File may be too large, requires additional verification, or access permissions are insufficient. Please try:\n1. Ensuring the file is publicly accessible\n2. Using a smaller file\n3. Sharing the file with "Anyone with the link can view" permissions');
                    }
                }
            } else {
                // Could not extract confirmation token, try alternative method

                const altUrl = getAlternativeDownloadUrl(driveUrl);
       

                try {
                    response = await downloadWithFallback(altUrl);
                    const altContentType = response.headers['content-type'] || '';
                    if (altContentType.includes('text/html')) {
                        throw new Error('Unable to bypass Google Drive download confirmation. This may happen with:\n1. Very large files (>100MB)\n2. Files that require additional verification\n3. Files with restricted access\n\nPlease try with a smaller file or ensure proper sharing permissions.');
                    }
                } catch (altError) {
                    throw new Error('File may be too large or requires manual download confirmation. Please ensure the file is publicly accessible and not too large.');
                }
            }
        }



        // Create write stream and pipe the response
        const writer = fs.createWriteStream(outputPath);
        response.data.pipe(writer);

        return new Promise((resolve, reject) => {
            writer.on('finish', () => {
          
                resolve();
            });

            writer.on('error', (error) => {
       
                reject(new Error(`Failed to write file: ${error.message}`));
            });

            response.data.on('error', (error) => {
         
                reject(new Error(`Download failed: ${error.message}`));
            });
        });

    } catch (error) {


        if (error.response) {
            if (error.response.status === 404) {
                throw new Error('Video not found. Please check if the Google Drive link is correct and the file is publicly accessible.');
            } else if (error.response.status === 403) {
                throw new Error('Access denied. Please ensure the Google Drive file is publicly accessible with "Anyone with the link can view" permissions.');
            }
        }

        if (error.code === 'ECONNABORTED') {
            throw new Error('Download timeout. The file may be too large or connection is slow.');
        }

        if (error.code === 'ENOTFOUND' && error.hostname && error.hostname.includes('drive.usercontent.google.com')) {
            throw new Error('DNS resolution failed for Google Drive content server. This may be a temporary network issue. Please try again or check your internet connection.');
        }

        throw new Error(`Failed to download video: ${error.message}`);
    }
}

/**
 * Download with DNS fallback mechanism and retry logic
 * @param {string} downloadUrl - URL to download
 * @returns {Promise} - Axios response
 */
async function downloadWithFallback(downloadUrl) {
    const configs = [
        // Primary config - standard approach
        {
            method: 'GET',
            url: downloadUrl,
            responseType: 'stream',
            timeout: 300000, // 5 minutes timeout
            maxRedirects: 5,
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
            }
        },
        // Fallback config 1 - with different user agent and shorter timeout
        {
            method: 'GET',
            url: downloadUrl,
            responseType: 'stream',
            timeout: 180000, // 3 minutes
            maxRedirects: 5,
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
            }
        },
        // Fallback config 2 - with curl user agent and reduced redirects
        {
            method: 'GET',
            url: downloadUrl,
            responseType: 'stream',
            timeout: 120000, // 2 minutes
            maxRedirects: 3,
            headers: {
                'User-Agent': 'curl/7.68.0'
            }
        }
    ];

    let lastError;

    for (let i = 0; i < configs.length; i++) {
        // For DNS errors, try each config multiple times
        const maxRetries = 3;

        for (let retry = 0; retry < maxRetries; retry++) {
            try {
           
                const response = await axios(configs[i]);
                
                return response;
            } catch (error) {
                lastError = error;

                // If it's not a DNS or network error, no point retrying
                if (error.code !== 'ENOTFOUND' && error.code !== 'ECONNRESET' && error.code !== 'ETIMEDOUT') {
                    break;
                }

                // Wait before retrying (exponential backoff)
                if (retry < maxRetries - 1) {
                    const delay = Math.pow(2, retry) * 1000; // 1s, 2s, 4s
                 
                    await new Promise(resolve => setTimeout(resolve, delay));
                }
            }
        }

        // If the last retry succeeded, we wouldn't reach here
        // If it's not a network error, try next config
        if (lastError.code !== 'ENOTFOUND' && lastError.code !== 'ECONNRESET' && lastError.code !== 'ETIMEDOUT') {
            throw lastError;
        }

        // Wait before trying next config
        if (i < configs.length - 1) {
     
            await new Promise(resolve => setTimeout(resolve, 2000));
        }
    }

    // If all configs and retries failed, throw the last error
    throw lastError;
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
    getAlternativeDownloadUrl,
    extractConfirmationToken,
    isValidGDriveUrl
};
