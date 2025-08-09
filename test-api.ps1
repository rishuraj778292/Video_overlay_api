# PowerShell script to test the Video Overlay API

$apiUrl = "http://localhost:3000"

Write-Host "Testing Video Overlay API" -ForegroundColor Cyan
Write-Host "=========================" -ForegroundColor Cyan

# Test 1: Health Check
Write-Host "`n1. Testing health endpoint..." -ForegroundColor Yellow
try {
    $healthResponse = Invoke-RestMethod -Uri "$apiUrl/health" -Method Get
    Write-Host "Health check successful:" -ForegroundColor Green
    $healthResponse | ConvertTo-Json
} catch {
    Write-Host "Health check failed: $($_.Exception.Message)" -ForegroundColor Red
}

# Test 2: Root endpoint
Write-Host "`n2. Testing root endpoint..." -ForegroundColor Yellow
try {
    $rootResponse = Invoke-RestMethod -Uri "$apiUrl/" -Method Get
    Write-Host "Root endpoint successful:" -ForegroundColor Green
    $rootResponse | ConvertTo-Json
} catch {
    Write-Host "Root endpoint failed: $($_.Exception.Message)" -ForegroundColor Red
}

# Test 3: Available downloads
Write-Host "`n3. Testing download list..." -ForegroundColor Yellow
try {
    $downloadResponse = Invoke-RestMethod -Uri "$apiUrl/api/download" -Method Get
    Write-Host "Download list successful:" -ForegroundColor Green
    $downloadResponse | ConvertTo-Json
} catch {
    Write-Host "Download list failed: $($_.Exception.Message)" -ForegroundColor Red
}

Write-Host "`nTesting completed!" -ForegroundColor Green
Write-Host "`nTips for video testing:" -ForegroundColor Cyan
Write-Host "1. Make sure your Google Drive video is publicly accessible" -ForegroundColor White
Write-Host "2. Use the sharing URL format: https://drive.google.com/file/d/FILE_ID/view" -ForegroundColor White
Write-Host "3. Open examples/test.html in a browser for easy testing" -ForegroundColor White
