const { isValidGDriveUrl } = require('./driveUtils');

/**
 * Validate overlay request body
 * @param {object} body - Request body
 * @returns {object} - Validation result
 */
function validateOverlayRequest(body) {
    const errors = [];

    // Check required fields
    if (!body.videoUrl) {
        errors.push('videoUrl is required');
    } else if (typeof body.videoUrl !== 'string') {
        errors.push('videoUrl must be a string');
    } else if (!isValidGDriveUrl(body.videoUrl)) {
        errors.push('videoUrl must be a valid Google Drive URL');
    }

    if (!body.text) {
        errors.push('text is required');
    } else if (typeof body.text !== 'string') {
        errors.push('text must be a string');
    } else if (body.text.length > 100) {
        errors.push('text must be 100 characters or less');
    }

    // Validate optional fields
    if (body.fontSize !== undefined) {
        if (!Number.isInteger(body.fontSize) || body.fontSize < 8 || body.fontSize > 72) {
            errors.push('fontSize must be an integer between 8 and 72');
        }
    }

    if (body.fontColor !== undefined) {
        if (typeof body.fontColor !== 'string' || !isValidColor(body.fontColor)) {
            errors.push('fontColor must be a valid color (e.g., "white", "red", "#FF0000", "rgb(255,0,0)")');
        }
    }

    if (body.fontFamily !== undefined) {
        if (typeof body.fontFamily !== 'string' || body.fontFamily.length > 50) {
            errors.push('fontFamily must be a string with 50 characters or less');
        }
    }

    return {
        isValid: errors.length === 0,
        errors
    };
}

/**
 * Validate color string
 * @param {string} color - Color string
 * @returns {boolean} - Whether color is valid
 */
function isValidColor(color) {
    // Basic color validation - accepts named colors, hex, rgb, rgba
    const colorPatterns = [
        /^[a-zA-Z]+$/,                                    // Named colors (red, blue, etc.)
        /^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/,           // Hex colors
        /^rgb\(\s*\d+\s*,\s*\d+\s*,\s*\d+\s*\)$/,       // RGB
        /^rgba\(\s*\d+\s*,\s*\d+\s*,\s*\d+\s*,\s*[\d.]+\s*\)$/ // RGBA
    ];

    return colorPatterns.some(pattern => pattern.test(color.trim()));
}

/**
 * Sanitize text for FFmpeg
 * @param {string} text - Input text
 * @returns {string} - Sanitized text
 */
function sanitizeText(text) {
    // Remove or escape problematic characters for FFmpeg
    return text
        .replace(/['"]/g, '') // Remove quotes
        .replace(/[\\]/g, '') // Remove backslashes
        .replace(/[:]/g, '\\:') // Escape colons
        .trim();
}

/**
 * Validate file size
 * @param {number} size - File size in bytes
 * @param {number} maxSize - Maximum allowed size in bytes
 * @returns {boolean} - Whether size is valid
 */
function isValidFileSize(size, maxSize = 100 * 1024 * 1024) { // Default 100MB
    return size > 0 && size <= maxSize;
}

/**
 * Parse max file size from environment variable
 * @param {string} sizeStr - Size string (e.g., "100MB", "1GB")
 * @returns {number} - Size in bytes
 */
function parseMaxFileSize(sizeStr = '100MB') {
    const units = {
        'B': 1,
        'KB': 1024,
        'MB': 1024 * 1024,
        'GB': 1024 * 1024 * 1024
    };

    const match = sizeStr.match(/^(\d+)(B|KB|MB|GB)$/i);
    if (!match) {
        return 100 * 1024 * 1024; // Default to 100MB
    }

    const [, size, unit] = match;
    return parseInt(size) * (units[unit.toUpperCase()] || 1);
}

module.exports = {
    validateOverlayRequest,
    isValidColor,
    sanitizeText,
    isValidFileSize,
    parseMaxFileSize
};
