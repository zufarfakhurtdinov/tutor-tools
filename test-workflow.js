const { chromium } = require('playwright');
const path = require('path');
const fs = require('fs');
const http = require('http');
const { promisify } = require('util');

// Simple HTTP server to serve files
function createServer() {
    return new Promise((resolve) => {
        const server = http.createServer((req, res) => {
            let filePath = '.' + req.url;
            if (filePath === './') filePath = './index.html';

            const extname = String(path.extname(filePath)).toLowerCase();
            const mimeTypes = {
                '.html': 'text/html',
                '.js': 'text/javascript',
                '.css': 'text/css',
                '.mp3': 'audio/mpeg'
            };

            const contentType = mimeTypes[extname] || 'application/octet-stream';

            fs.readFile(filePath, (error, content) => {
                if (error) {
                    if(error.code == 'ENOENT') {
                        res.writeHead(404);
                        res.end('File not found');
                    } else {
                        res.writeHead(500);
                        res.end('Server error: ' + error.code);
                    }
                } else {
                    res.writeHead(200, {
                        'Content-Type': contentType,
                        'Access-Control-Allow-Origin': '*'
                    });
                    res.end(content, 'utf-8');
                }
            });
        });

        server.listen(8001, () => {
            console.log('🌐 Test server running on http://localhost:8001');
            resolve(server);
        });
    });
}

async function testAudioWorkflow() {
    console.log('🚀 Starting Playwright test for audio transcription workflow...');

    // Start local server
    const server = await createServer();

    const browser = await chromium.launch({
        headless: false, // Show browser for debugging
        args: ['--enable-features=VaapiVideoDecoder,VaapiVideoEncoder,VaapiVideoDecodeLinuxGL']
    });

    const context = await browser.newContext({
        permissions: ['microphone'] // Grant microphone permission if needed
    });

    const page = await context.newPage();

    // Collect console logs and errors
    const consoleLogs = [];
    const errors = [];

    page.on('console', msg => {
        const type = msg.type();
        const text = msg.text();
        consoleLogs.push({ type, text, timestamp: new Date().toISOString() });

        if (type === 'error') {
            console.log(`❌ Console Error: ${text}`);
            errors.push(text);
        } else {
            console.log(`📝 Console ${type.toUpperCase()}: ${text}`);
        }
    });

    page.on('pageerror', error => {
        console.log(`💥 Page Error: ${error.message}`);
        errors.push(`Page Error: ${error.message}`);
    });

    try {
        console.log('📂 Loading HTML file via HTTP server...');
        await page.goto('http://localhost:8001');

        // Wait for application initialization
        console.log('⏳ Waiting for application initialization...');
        await page.waitForFunction(() => {
            // Check if dropzone is ready and not disabled
            const dropzone = document.getElementById('dropzone');
            return dropzone && !dropzone.classList.contains('disabled') &&
                   dropzone.textContent.includes('Drop an audio file');
        }, { timeout: 120000 });

        console.log('✅ Application initialized successfully');

        // Check for library loading errors
        const initErrors = errors.filter(err =>
            err.includes('lamejs') ||
            err.includes('JSZip') ||
            err.includes('not defined')
        );

        if (initErrors.length > 0) {
            throw new Error(`Library loading errors detected: ${initErrors.join(', ')}`);
        }

        console.log('✅ No library loading errors detected');

        // Upload the 1.mp3 file using the hidden file input
        console.log('📤 Uploading 1.mp3 file...');
        const audioFilePath = path.resolve(__dirname, '1.mp3');

        if (!fs.existsSync(audioFilePath)) {
            throw new Error('1.mp3 file not found');
        }

        // Use the file input directly (it's connected to the dropzone click handler)
        const fileInput = page.locator('#fileInput');
        await fileInput.setInputFiles(audioFilePath);

        console.log('✅ File upload triggered');

        // Wait for transcription to complete
        console.log('🎤 Waiting for transcription to complete...');
        await page.waitForFunction(() => {
            // Check if we're in state 3 (transcription complete) by looking for elements
            const buttons = Array.from(document.querySelectorAll('button'));
            const splitButton = buttons.find(btn => btn.textContent.includes('Find & Split Segments'));
            const transcript = document.getElementById('transcript');
            return splitButton && splitButton.offsetParent !== null &&
                   transcript && transcript.innerHTML.length > 0;
        }, { timeout: 300000 }); // 5 minutes timeout for transcription

        console.log('✅ Transcription completed');

        // Check for transcription errors
        const transcriptionErrors = errors.filter(err =>
            err.includes('subarray') ||
            err.includes('transcription') ||
            err.includes('Float32Array')
        );

        if (transcriptionErrors.length > 0) {
            throw new Error(`Transcription errors detected: ${transcriptionErrors.join(', ')}`);
        }

        console.log('✅ No transcription errors detected');

        // Wait for the split button to be available
        const splitButton = page.locator('button:has-text("Find & Split Segments")');
        await splitButton.waitFor({ state: 'visible', timeout: 10000 });

        console.log('🔍 Clicking Find & Split Segments button...');
        await splitButton.click();

        // Wait for segmentation to complete
        console.log('✂️ Waiting for audio segmentation to complete...');
        await page.waitForFunction(() => {
            const downloads = document.getElementById('downloads');
            return downloads && downloads.style.display !== 'none' &&
                   downloads.innerHTML.includes('mp3');
        }, { timeout: 180000 }); // 3 minutes timeout for segmentation

        console.log('✅ Audio segmentation completed');

        // Check for MP3 encoding errors
        const mp3Errors = errors.filter(err =>
            err.includes('lamejs') ||
            err.includes('Mp3Encoder') ||
            err.includes('encoding')
        );

        if (mp3Errors.length > 0) {
            throw new Error(`MP3 encoding errors detected: ${mp3Errors.join(', ')}`);
        }

        console.log('✅ No MP3 encoding errors detected');

        // Check that download buttons are available
        const downloadButtons = await page.locator('.download-item button').count();
        console.log(`📥 Found ${downloadButtons} download buttons`);

        if (downloadButtons === 0) {
            throw new Error('No download buttons found after segmentation');
        }

        // Check that ZIP download button is available
        const zipButton = page.locator('button:has-text("Download All as ZIP")');
        await zipButton.waitFor({ state: 'visible', timeout: 5000 });
        console.log('✅ ZIP download button is available');

        // Final verification - check for any critical errors (ignore harmless warnings)
        await page.waitForTimeout(10000);

        const criticalErrors = errors.filter(err =>
            !err.includes('Unable to determine content-length') &&
            !err.includes('404 (Not Found)') && // Harmless resource requests
            !err.includes('VerifyEachNodeIsAssignedToAnEp') && // ONNX optimization warnings
            !err.includes('session_state.cc') // ONNX runtime warnings
        );

        if (criticalErrors.length > 0) {
            console.log('❌ Critical errors found:');
            criticalErrors.forEach(err => console.log(`   - ${err}`));
            throw new Error(`Workflow failed with critical errors: ${criticalErrors.join(', ')}`);
        }

        // Log harmless warnings for info
        const harmlessWarnings = errors.filter(err =>
            err.includes('404 (Not Found)') ||
            err.includes('VerifyEachNodeIsAssignedToAnEp')
        );

        if (harmlessWarnings.length > 0) {
            console.log('ℹ️ Harmless warnings (expected):');
            harmlessWarnings.forEach(err => console.log(`   - ${err.substring(0, 100)}...`));
        }

        console.log('🎉 WORKFLOW TEST PASSED! All components working correctly:');
        console.log('   ✅ Application initialization');
        console.log('   ✅ Library loading (lamejs, JSZip)');
        console.log('   ✅ Audio file upload');
        console.log('   ✅ Audio transcription');
        console.log('   ✅ Audio segmentation');
        console.log('   ✅ MP3 encoding');
        console.log('   ✅ Download functionality');

        return true;

    } catch (error) {
        console.log('❌ WORKFLOW TEST FAILED:');
        console.log(`   Error: ${error.message}`);

        console.log('\n📊 Console Log Summary:');
        const errorLogs = consoleLogs.filter(log => log.type === 'error');
        const warningLogs = consoleLogs.filter(log => log.type === 'warn');

        console.log(`   Errors: ${errorLogs.length}`);
        console.log(`   Warnings: ${warningLogs.length}`);
        console.log(`   Total logs: ${consoleLogs.length}`);

        if (errorLogs.length > 0) {
            console.log('\n🔴 Error Details:');
            errorLogs.forEach(log => console.log(`   [${log.timestamp}] ${log.text}`));
        }

        return false;

    } finally {
        // Keep browser open for 5 seconds to see final state
        console.log('⏳ Keeping browser open for 5 seconds...');
        await page.waitForTimeout(5000);
        await browser.close();

        // Close the test server
        server.close();
        console.log('🌐 Test server closed');
    }
}

// Run the test
testAudioWorkflow().then(success => {
    process.exit(success ? 0 : 1);
}).catch(error => {
    console.error('❌ Test runner error:', error);
    process.exit(1);
});