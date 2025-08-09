#!/bin/bash

# Video Overlay API Test Script
# This script tests the API endpoints using curl

API_BASE="http://localhost:3000"

echo "🧪 Video Overlay API Test Script"
echo "================================="

# Test 1: Health Check
echo ""
echo "1. Testing health endpoint..."
curl -s "$API_BASE/health" | jq '.' 2>/dev/null || echo "Health check failed or jq not installed"

# Test 2: Root endpoint
echo ""
echo "2. Testing root endpoint..."
curl -s "$API_BASE/" | jq '.' 2>/dev/null || echo "Root endpoint failed or jq not installed"

# Test 3: List available downloads
echo ""
echo "3. Testing download list endpoint..."
curl -s "$API_BASE/api/download" | jq '.' 2>/dev/null || echo "Download list failed or jq not installed"

# Test 4: Video overlay processing (requires manual input)
echo ""
echo "4. Testing video overlay processing..."
echo "Note: You need to provide a valid Google Drive URL for this test"

read -p "Enter Google Drive video URL (or press Enter to skip): " DRIVE_URL

if [ -n "$DRIVE_URL" ]; then
    echo "Processing video overlay..."
    
    RESPONSE=$(curl -s -X POST "$API_BASE/api/overlay" \
        -H "Content-Type: application/json" \
        -d "{
            \"videoUrl\": \"$DRIVE_URL\",
            \"text\": \"API Test Overlay\",
            \"fontSize\": 28,
            \"fontColor\": \"yellow\",
            \"fontFamily\": \"Arial\"
        }")
    
    echo "$RESPONSE" | jq '.' 2>/dev/null || echo "$RESPONSE"
    
    # Extract download URL if successful
    DOWNLOAD_URL=$(echo "$RESPONSE" | jq -r '.downloadUrl' 2>/dev/null)
    
    if [ "$DOWNLOAD_URL" != "null" ] && [ -n "$DOWNLOAD_URL" ]; then
        echo ""
        echo "✅ Processing successful!"
        echo "Download URL: $API_BASE$DOWNLOAD_URL"
        echo ""
        read -p "Download the processed video? (y/n): " DOWNLOAD_CHOICE
        
        if [ "$DOWNLOAD_CHOICE" = "y" ] || [ "$DOWNLOAD_CHOICE" = "Y" ]; then
            FILENAME=$(basename "$DOWNLOAD_URL")
            echo "Downloading $FILENAME..."
            curl -L "$API_BASE$DOWNLOAD_URL" -o "$FILENAME"
            echo "Downloaded: $FILENAME"
        fi
    else
        echo "❌ Processing failed"
    fi
else
    echo "Skipping video processing test"
fi

echo ""
echo "🏁 Test script completed!"
echo ""
echo "Available endpoints:"
echo "- GET  $API_BASE/health"
echo "- GET  $API_BASE/"
echo "- POST $API_BASE/api/overlay"
echo "- GET  $API_BASE/api/download"
echo "- GET  $API_BASE/api/download/:filename"
