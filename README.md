# Video Overlay API

A Node.js API that takes Google Drive video links and adds text overlay to the center-top of the video, providing downloadable links.

## Features

- Download videos from Google Drive public links
- Add custom text overlay to videos
- Configurable text styling (font, size, color)
- RESTful API endpoints
- Local file serving for downloads
- FFmpeg-based video processing

## Prerequisites

- Node.js (v14 or higher)
- FFmpeg installed on your system
- npm or yarn

## Installation

1. Clone this repository
2. Install dependencies:
   ```bash
   npm install
   ```
3. Install FFmpeg:
   - **Windows**: Download from https://ffmpeg.org/download.html or use chocolatey: `choco install ffmpeg`
   - **macOS**: `brew install ffmpeg`
   - **Linux**: `sudo apt-get install ffmpeg` (Ubuntu/Debian)

4. Create a `.env` file in the root directory:
   ```
   PORT=3000
   TEMP_DIR=./temp
   OUTPUT_DIR=./output
   MAX_FILE_SIZE=100MB
   ```

5. Start the server:
   ```bash
   npm run dev
   ```

## API Endpoints

### POST /api/overlay

Add text overlay to a video from Google Drive.

**Request Body:**
```json
{
  "videoUrl": "https://drive.google.com/file/d/FILE_ID/view",
  "text": "Your overlay text",
  "fontSize": 24,
  "fontColor": "white",
  "fontFamily": "Arial"
}
```

**Response:**
```json
{
  "success": true,
  "downloadUrl": "/api/download/unique-filename.mp4",
  "message": "Video processed successfully"
}
```

### GET /api/download/:filename

Download the processed video file.

## Usage Example

```bash
curl -X POST http://localhost:3000/api/overlay \
  -H "Content-Type: application/json" \
  -d '{
    "videoUrl": "https://drive.google.com/file/d/your-file-id/view",
    "text": "Hello World!",
    "fontSize": 32,
    "fontColor": "yellow"
  }'
```

## Google Drive URL Format

Make sure your Google Drive video is publicly accessible. The URL should be in this format:
`https://drive.google.com/file/d/FILE_ID/view`

To get the direct download link, the API converts it to:
`https://drive.google.com/uc?export=download&id=FILE_ID`

## Deployment to Oracle Cloud

1. Set up Oracle Cloud Compute Instance
2. Install Node.js and FFmpeg on the instance
3. Configure environment variables
4. Set up reverse proxy with Nginx
5. Configure SSL certificates
6. Set up process manager (PM2)

## License

MIT
