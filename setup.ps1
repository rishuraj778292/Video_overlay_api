# Video Overlay API Setup Script for Windows
# This script helps set up the development environment

Write-Host "🎬 Video Overlay API Setup" -ForegroundColor Cyan
Write-Host "=========================" -ForegroundColor Cyan

# Check if Node.js is installed
Write-Host "`n1. Checking Node.js..." -ForegroundColor Yellow
try {
    $nodeVersion = node --version
    Write-Host "✅ Node.js is installed: $nodeVersion" -ForegroundColor Green
}
catch {
    Write-Host "❌ Node.js is not installed. Please install Node.js from https://nodejs.org/" -ForegroundColor Red
    exit 1
}

# Check if npm is available
Write-Host "`n2. Checking npm..." -ForegroundColor Yellow
try {
    $npmVersion = npm --version
    Write-Host "✅ npm is available: $npmVersion" -ForegroundColor Green
}
catch {
    Write-Host "❌ npm is not available" -ForegroundColor Red
    exit 1
}

# Check if FFmpeg is installed
Write-Host "`n3. Checking FFmpeg..." -ForegroundColor Yellow
try {
    $ffmpegVersion = ffmpeg -version 2>$null | Select-String "ffmpeg version" | Select-Object -First 1
    if ($ffmpegVersion) {
        Write-Host "✅ FFmpeg is installed: $($ffmpegVersion.Line.Split(' ')[2])" -ForegroundColor Green
    }
    else {
        throw "FFmpeg not found"
    }
}
catch {
    Write-Host "❌ FFmpeg is not installed or not in PATH" -ForegroundColor Red
    Write-Host "📥 Install FFmpeg using one of these methods:" -ForegroundColor Yellow
    Write-Host "   - Chocolatey: choco install ffmpeg" -ForegroundColor White
    Write-Host "   - Download from: https://ffmpeg.org/download.html" -ForegroundColor White
    Write-Host "   - Add FFmpeg to your system PATH" -ForegroundColor White
    
    $choice = Read-Host "`nDo you want to continue without FFmpeg? (y/n)"
    if ($choice -ne 'y' -and $choice -ne 'Y') {
        exit 1
    }
}

# Install npm dependencies
Write-Host "`n4. Installing npm dependencies..." -ForegroundColor Yellow
try {
    npm install
    Write-Host "✅ Dependencies installed successfully" -ForegroundColor Green
}
catch {
    Write-Host "❌ Failed to install dependencies" -ForegroundColor Red
    exit 1
}

# Create directories
Write-Host "`n5. Creating required directories..." -ForegroundColor Yellow
$dirs = @("temp", "output")
foreach ($dir in $dirs) {
    if (!(Test-Path $dir)) {
        New-Item -ItemType Directory -Path $dir | Out-Null
        Write-Host "✅ Created directory: $dir" -ForegroundColor Green
    }
    else {
        Write-Host "✅ Directory already exists: $dir" -ForegroundColor Green
    }
}

# Check .env file
Write-Host "`n6. Checking environment configuration..." -ForegroundColor Yellow
if (Test-Path ".env") {
    Write-Host "✅ .env file exists" -ForegroundColor Green
}
else {
    Write-Host "⚠️ .env file not found (will use defaults)" -ForegroundColor Yellow
}

Write-Host "`n🎉 Setup completed!" -ForegroundColor Green
Write-Host "`nNext steps:" -ForegroundColor Cyan
Write-Host "1. Start the server: npm start" -ForegroundColor White
Write-Host "2. For development: npm run dev" -ForegroundColor White
Write-Host "3. Test the API: node examples/test.js" -ForegroundColor White
Write-Host "4. Open test page: examples/test.html" -ForegroundColor White

Write-Host "`n🌐 API will be available at: http://localhost:3000" -ForegroundColor Cyan

$startChoice = Read-Host "`nWould you like to start the server now? (y/n)"
if ($startChoice -eq 'y' -or $startChoice -eq 'Y') {
    Write-Host "`n🚀 Starting server..." -ForegroundColor Green
    npm start
}
