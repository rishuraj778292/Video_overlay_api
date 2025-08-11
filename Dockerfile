# Use Node.js official image
FROM node:18-alpine

# Install ffmpeg and ffprobe
RUN apk add --no-cache ffmpeg

# Set working directory
WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm ci --only=production

# Copy application code
COPY . .

# Create required directories
RUN mkdir -p temp output

# Expose port
EXPOSE 3000

# Start the application
CMD ["npm", "start"]
