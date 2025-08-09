const axios = require('axios');

const API_BASE = 'http://localhost:3000';

async function testAPI() {
    console.log('🧪 Video Overlay API Test');
    console.log('=========================\n');

    try {
        // Test 1: Health Check
        console.log('1. Testing health endpoint...');
        const healthResponse = await axios.get(`${API_BASE}/health`);
        console.log('✅ Health check:', healthResponse.data);

        // Test 2: Root endpoint
        console.log('\n2. Testing root endpoint...');
        const rootResponse = await axios.get(`${API_BASE}/`);
        console.log('✅ Root endpoint:', rootResponse.data);

        // Test 3: List downloads
        console.log('\n3. Testing download list...');
        const listResponse = await axios.get(`${API_BASE}/api/download`);
        console.log('✅ Download list:', listResponse.data);

        // Test 4: Invalid overlay request
        console.log('\n4. Testing invalid overlay request...');
        try {
            await axios.post(`${API_BASE}/api/overlay`, {
                videoUrl: 'invalid-url',
                text: ''
            });
        } catch (error) {
            if (error.response && error.response.status === 400) {
                console.log('✅ Validation working:', error.response.data);
            } else {
                console.log('❌ Unexpected error:', error.message);
            }
        }

        console.log('\n🏁 Basic tests completed successfully!');
        console.log('\nTo test video processing:');
        console.log('1. Ensure you have FFmpeg installed');
        console.log('2. Use a public Google Drive video URL');
        console.log('3. Send POST request to /api/overlay with valid data');

    } catch (error) {
        console.error('❌ Test failed:', error.message);
        if (error.code === 'ECONNREFUSED') {
            console.log('💡 Make sure the API server is running on port 3000');
        }
    }
}

// Example of a complete overlay request
function showExampleRequest() {
    console.log('\n📋 Example overlay request:');
    console.log('curl -X POST http://localhost:3000/api/overlay \\');
    console.log('  -H "Content-Type: application/json" \\');
    console.log('  -d \'{\n' +
        '    "videoUrl": "https://drive.google.com/file/d/YOUR_FILE_ID/view",\n' +
        '    "text": "Hello World!",\n' +
        '    "fontSize": 32,\n' +
        '    "fontColor": "yellow",\n' +
        '    "fontFamily": "Arial"\n' +
        '  }\'');
}

// Run tests
testAPI();
showExampleRequest();
