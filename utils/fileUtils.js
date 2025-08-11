const fs = require('fs-extra');
const path = require('path');

/**
 * Ensure required directories exist
 */
async function ensureDirectories() {
    const tempDir = process.env.TEMP_DIR || './temp';
    const outputDir = process.env.OUTPUT_DIR || './output';

    try {
        await fs.ensureDir(tempDir);
        await fs.ensureDir(outputDir);
    } catch (error) {
        console.error('Error creating directories:', error);
        throw error;
    }
}

/**
 * Clean up old files in a directory
 * @param {string} directory - Directory to clean
 * @param {number} maxAgeHours - Maximum age in hours
 */
async function cleanupOldFiles(directory, maxAgeHours = 24) {
    try {
        if (!(await fs.pathExists(directory))) {
            return;
        }

        const files = await fs.readdir(directory);
        const now = Date.now();
        const maxAgeMs = maxAgeHours * 60 * 60 * 1000;

        for (const file of files) {
            const filePath = path.join(directory, file);
            const stats = await fs.stat(filePath);

            if (now - stats.mtimeMs > maxAgeMs) {
                await fs.remove(filePath);
            }
        }
    } catch (error) {
        console.error('Error during cleanup:', error);
    }
}

/**
 * Get directory size in bytes
 * @param {string} directory - Directory path
 * @returns {Promise<number>} - Size in bytes
 */
async function getDirectorySize(directory) {
    let size = 0;

    try {
        if (!(await fs.pathExists(directory))) {
            return 0;
        }

        const items = await fs.readdir(directory);

        for (const item of items) {
            const itemPath = path.join(directory, item);
            const stats = await fs.stat(itemPath);

            if (stats.isDirectory()) {
                size += await getDirectorySize(itemPath);
            } else {
                size += stats.size;
            }
        }
    } catch (error) {
        console.error('Error calculating directory size:', error);
    }

    return size;
}

/**
 * Format bytes to human readable format
 * @param {number} bytes - Bytes
 * @returns {string} - Formatted string
 */
function formatBytes(bytes) {
    if (bytes === 0) return '0 Bytes';

    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));

    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

/**
 * Generate unique filename with timestamp
 * @param {string} prefix - Filename prefix
 * @param {string} extension - File extension
 * @returns {string} - Unique filename
 */
function generateUniqueFilename(prefix = 'file', extension = '.mp4') {
    const timestamp = Date.now();
    const random = Math.random().toString(36).substring(2, 8);
    return `${prefix}_${timestamp}_${random}${extension}`;
}

/**
 * Check if file exists and is accessible
 * @param {string} filePath - Path to file
 * @returns {Promise<boolean>} - Whether file exists and is accessible
 */
async function isFileAccessible(filePath) {
    try {
        await fs.access(filePath, fs.constants.F_OK | fs.constants.R_OK);
        return true;
    } catch {
        return false;
    }
}

/**
 * Safe file removal with error handling
 * @param {string} filePath - Path to file
 */
async function safeRemove(filePath) {
    try {
        if (await fs.pathExists(filePath)) {
            await fs.remove(filePath);
        }
    } catch (error) {
        console.error(`Error removing file ${filePath}:`, error);
    }
}

/**
 * Get file extension from filename
 * @param {string} filename - Filename
 * @returns {string} - File extension
 */
function getFileExtension(filename) {
    return path.extname(filename).toLowerCase();
}

/**
 * Check if file has video extension
 * @param {string} filename - Filename
 * @returns {boolean} - Whether file has video extension
 */
function isVideoFile(filename) {
    const videoExtensions = ['.mp4', '.mov', '.avi', '.mkv', '.wmv', '.flv', '.webm'];
    return videoExtensions.includes(getFileExtension(filename));
}

module.exports = {
    ensureDirectories,
    cleanupOldFiles,
    getDirectorySize,
    formatBytes,
    generateUniqueFilename,
    isFileAccessible,
    safeRemove,
    getFileExtension,
    isVideoFile
};
