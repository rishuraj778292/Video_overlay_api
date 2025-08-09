# Render Deployment Guide

Deploy your Video Overlay API to Render (Free Tier)

## Render Free Tier Suitability

✅ **Good for**:
- Personal use (40 requests/day)
- Small videos (50-100MB)
- Learning/demo purposes

⚠️ **Limitations**:
- Files deleted on service restart
- Service sleeps after 15 min inactivity
- 512MB RAM limit
- Shared CPU (slower processing)

## Prerequisites

1. GitHub account with your code
2. Render account (free)

## Step 1: Prepare Your Code for Render

### Update package.json for Render

```json
{
  "engines": {
    "node": "18.x"
  },
  "scripts": {
    "start": "node server.js",
    "build": "echo 'No build step required'"
  }
}
```

### Create render.yaml (Optional)

```yaml
services:
  - type: web
    name: video-overlay-api
    env: node
    plan: free
    buildCommand: npm install
    startCommand: npm start
    envVars:
      - key: NODE_ENV
        value: production
      - key: PORT
        value: 10000
      - key: TEMP_DIR
        value: /tmp
      - key: OUTPUT_DIR
        value: /tmp
      - key: MAX_FILE_SIZE
        value: 50MB
```

## Step 2: Deploy to Render

1. **Push code to GitHub**
2. **Connect to Render**:
   - Go to render.com
   - Sign up/Login
   - Click "New +" → "Web Service"
   - Connect your GitHub repository

3. **Configure Service**:
   - **Name**: video-overlay-api
   - **Environment**: Node
   - **Build Command**: `npm install`
   - **Start Command**: `npm start`
   - **Plan**: Free

4. **Environment Variables**:
   ```
   NODE_ENV=production
   TEMP_DIR=/tmp
   OUTPUT_DIR=/tmp
   MAX_FILE_SIZE=50MB
   FFMPEG_PATH=ffmpeg
   ```

## Step 3: Handle Render-Specific Issues

### File Storage Solution

Since Render free tier has ephemeral storage, you have options:

1. **Accept file loss** (simplest for personal use)
2. **Use external storage** (AWS S3, Cloudinary)
3. **Stream download** (don't store, process and stream)

### Memory Optimization

For 512MB limit:
- Process videos sequentially (not parallel)
- Use lower quality settings
- Add memory monitoring

## Step 4: Test Deployment

Once deployed:
- Your API will be at: `https://your-service-name.onrender.com`
- Test with: `https://your-service-name.onrender.com/health`
- Use the test HTML (update API URL)

## Performance Expectations

- **Small videos (10-20MB)**: 1-3 minutes
- **Medium videos (50MB)**: 3-8 minutes
- **First request after sleep**: +30 seconds wake time

## Cost Considerations

- **Free tier**: $0/month
- **Starter plan**: $7/month (better for production)
  - No sleep
- **More storage
  - Better performance

## Alternative: Railway

If Render doesn't work well:
- Railway has similar free tier
- Better for video processing
- $5/month for better performance

## Recommendation

For personal use with 40 requests/day and small videos, Render free tier should work, but expect:
- Slower processing
- Files lost on restart
- Sleep delays

Would you like me to help set up the deployment?
