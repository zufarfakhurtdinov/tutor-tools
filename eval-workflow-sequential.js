const { chromium } = require('playwright');
const path = require('path');
const fs = require('fs');
const http = require('http');

// Simple HTTP server to serve files
function createServer(port = 8001) {
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

        server.listen(port, () => {
            resolve(server);
        });
    });
}

// Expected segment counts for each audio file
const EXPECTED_SEGMENTS = {
    'KidsBox_ActivityBook1_Unit7_Page50_Track_26.mp3': 6,
    'KidsBox_ActivityBook1_Unit3_Page20_Track_10.mp3': 6,
    'KidsBox_ActivityBook1_Unit3_Page22_Track_12.mp3': 8,
    'KidsBox_ActivityBook1_Unit5_Page36_Track_19.mp3': 2,
    'KidsBox_ActivityBook1_Unit6_Page40_Track_21.mp3': 6,
    'KidsBox_ActivityBook1_Unit10_Page72_Track_38.mp3': 6,
    'KidsBox_ActivityBook1_Unit10_Page73_Track_39.mp3': 4,
    'KidsBox_ActivityBook1_Unit11_Page80_Track_41.mp3': 'expected-fail', // by pauses - not implemented yet
    'KidsBox_ActivityBook1_Unit12_Page86_Track_43.mp3': 4,
    'KidsBox_ActivityBook1_Unit2_Page12_Track_06.mp3': 'expected-fail' // by pauses - not implemented yet
};

async function testSingleAudioFile(audioFile, server, testIndex) {
    const testId = `Test-${testIndex + 1}`;
    const fileName = path.basename(audioFile);
    const expectedSegments = EXPECTED_SEGMENTS[fileName];

    console.log(`\n🚀 [${testId}] Starting test for ${fileName}...`);

    const browser = await chromium.launch({
        headless: false, // Audio processing requires visible browser
        args: ['--enable-features=VaapiVideoDecoder,VaapiVideoEncoder,VaapiVideoDecodeLinuxGL']
    });

    const context = await browser.newContext({
        permissions: ['microphone']
    });

    const page = await context.newPage();

    // Set page timeout to 90 seconds (default is 30s)
    page.setDefaultTimeout(90000);

    // Collect console logs and errors
    const consoleLogs = [];
    const errors = [];

    page.on('console', msg => {
        const type = msg.type();
        const text = msg.text();
        consoleLogs.push({ type, text, timestamp: new Date().toISOString() });

        if (type === 'error') {
            errors.push(text);
        }

        // Log AudioSegmentExtractor messages in real-time for debugging
        if (text.includes('[AudioSegmentExtractor]')) {
            console.log(`   🔍 [${testId}] ${text}`);
        }
    });

    page.on('pageerror', error => {
        errors.push(`Page Error: ${error.message}`);
    });

    const testResult = {
        testId,
        fileName,
        success: false,
        duration: 0,
        segmentsFound: 0,
        errors: [],
        warnings: [],
        stages: {
            initialization: false,
            upload: false,
            transcription: false,
            extraction: false,
            download: false
        }
    };

    const startTime = Date.now();

    try {
        // Stage 1: Application initialization
        console.log(`   📱 [${testId}] Loading application...`);
        await page.goto('http://localhost:8001');

        await page.waitForFunction(() => {
            const dropzone = document.getElementById('dropzone');
            return dropzone && !dropzone.classList.contains('disabled') &&
                   dropzone.textContent.includes('Drop an audio file');
        }, { timeout: 120000 });

        testResult.stages.initialization = true;
        console.log(`   ✅ [${testId}] Application initialized`);

        // Check for library loading errors
        const initErrors = errors.filter(err =>
            err.includes('lamejs') ||
            err.includes('JSZip') ||
            err.includes('not defined')
        );

        if (initErrors.length > 0) {
            throw new Error(`Library loading errors: ${initErrors.join(', ')}`);
        }

        // Stage 2: File upload
        console.log(`   📤 [${testId}] Uploading ${fileName}...`);

        if (!fs.existsSync(audioFile)) {
            throw new Error(`Audio file not found: ${audioFile}`);
        }

        const fileInput = page.locator('#fileInput');
        await fileInput.setInputFiles(audioFile);

        testResult.stages.upload = true;
        console.log(`   ✅ [${testId}] File uploaded`);

        // Stage 3: Transcription
        console.log(`   🎤 [${testId}] Waiting for transcription...`);

        await page.waitForFunction(() => {
            const buttons = Array.from(document.querySelectorAll('button'));
            const extractButton = buttons.find(btn => btn.textContent.includes('Extract Segments'));
            const transcript = document.getElementById('transcript');
            return extractButton && extractButton.offsetParent !== null &&
                   transcript && transcript.innerHTML.length > 0;
        }, { timeout: 300000 }); // 5 minutes timeout

        testResult.stages.transcription = true;
        console.log(`   ✅ [${testId}] Transcription completed`);

        // Check for transcription errors
        const transcriptionErrors = errors.filter(err =>
            err.includes('subarray') ||
            err.includes('transcription') ||
            err.includes('Float32Array')
        );

        if (transcriptionErrors.length > 0) {
            throw new Error(`Transcription errors: ${transcriptionErrors.join(', ')}`);
        }

        // Stage 4: Audio extraction
        const extractButton = page.locator('button:has-text("Extract Segments")');
        await extractButton.waitFor({ state: 'visible', timeout: 10000 });

        console.log(`   🔍 [${testId}] Extracting segments...`);
        await extractButton.click();

        await page.waitForFunction(() => {
            const downloads = document.getElementById('downloads');
            return downloads && downloads.style.display !== 'none' &&
                   downloads.innerHTML.includes('mp3');
        }, { timeout: 180000 }); // 3 minutes timeout

        testResult.stages.extraction = true;
        console.log(`   ✅ [${testId}] Extraction completed`);

        // Check for MP3 encoding errors
        const mp3Errors = errors.filter(err =>
            err.includes('lamejs') ||
            err.includes('Mp3Encoder') ||
            err.includes('encoding')
        );

        if (mp3Errors.length > 0) {
            throw new Error(`MP3 encoding errors: ${mp3Errors.join(', ')}`);
        }

        // Stage 5: Download verification
        const downloadButtons = await page.locator('.download-item button').count();
        testResult.segmentsFound = downloadButtons;

        if (downloadButtons === 0) {
            throw new Error('No download buttons found after segmentation');
        }

        // Check ZIP download button
        const zipButton = page.locator('button:has-text("Download All as ZIP")');
        await zipButton.waitFor({ state: 'visible', timeout: 5000 });

        testResult.stages.download = true;
        console.log(`   ✅ [${testId}] Downloads ready (${downloadButtons} segments)`);

        // Segment count validation
        if (expectedSegments === 'need clarification') {
            throw new Error(`File requires clarification - test intentionally failed`);
        } else if (expectedSegments === 'expected-fail') {
            throw new Error(`Expected failure - feature not implemented yet (got ${downloadButtons} segments)`);
        } else if (expectedSegments !== undefined && downloadButtons !== expectedSegments) {
            throw new Error(`Segment count mismatch: expected ${expectedSegments}, got ${downloadButtons}`);
        } else if (expectedSegments !== undefined) {
            console.log(`   ✅ [${testId}] Segment count validation passed (${downloadButtons}/${expectedSegments})`);
        }

        // Final error check
        await page.waitForTimeout(5000);

        const criticalErrors = errors.filter(err =>
            !err.includes('Unable to determine content-length') &&
            !err.includes('404 (Not Found)') &&
            !err.includes('VerifyEachNodeIsAssignedToAnEp') &&
            !err.includes('session_state.cc')
        );

        if (criticalErrors.length > 0) {
            testResult.errors = criticalErrors;
            throw new Error(`Critical errors: ${criticalErrors.join(', ')}`);
        }

        // Success!
        testResult.success = true;
        testResult.duration = Date.now() - startTime;

        const segmentInfo = expectedSegments !== undefined ? `${downloadButtons}/${expectedSegments}` : `${downloadButtons}`;
        console.log(`   🎉 [${testId}] TEST PASSED - ${fileName} (${segmentInfo} segments, ${Math.round(testResult.duration/1000)}s)`);

    } catch (error) {
        testResult.duration = Date.now() - startTime;
        testResult.errors.push(error.message);

        console.log(`   ❌ [${testId}] TEST FAILED - ${fileName}: ${error.message}`);

        // Log detailed error info
        const errorLogs = consoleLogs.filter(log => log.type === 'error');
        if (errorLogs.length > 0) {
            console.log(`   📊 [${testId}] ${errorLogs.length} console errors logged`);
        }

    } finally {
        await browser.close();
    }

    // Attach console logs to test result
    testResult.consoleLogs = consoleLogs;

    return testResult;
}

async function runSequentialEvaluation() {
    console.log('🌟 Starting Sequential Audio Evaluation Workflow...');
    console.log('=================================================\n');

    // Find all audio files
    const audioFiles = [];
    const evalDir = path.resolve(__dirname, 'eval');

    if (!fs.existsSync(evalDir)) {
        console.error('❌ eval directory not found');
        process.exit(1);
    }

    const files = fs.readdirSync(evalDir);
    files.forEach(file => {
        if (file.endsWith('.mp3') || file.endsWith('.wav') || file.endsWith('.m4a') || file.endsWith('.ogg')) {
            audioFiles.push(path.join(evalDir, file));
        }
    });

    if (audioFiles.length === 0) {
        console.error('❌ No audio files found in eval directory');
        process.exit(1);
    }

    console.log(`📁 Found ${audioFiles.length} audio files to test:`);
    audioFiles.forEach((file, i) => {
        console.log(`   ${i + 1}. ${path.basename(file)}`);
    });

    // Start single HTTP server
    console.log('\n🌐 Starting HTTP server on port 8001...');
    const server = await createServer(8001);

    const results = [];
    const totalStartTime = Date.now();

    console.log('\n🚀 Starting sequential audio processing tests...');
    console.log('===============================================');

    // Run tests sequentially
    for (let i = 0; i < audioFiles.length; i++) {
        const result = await testSingleAudioFile(audioFiles[i], server, i);
        results.push(result);

        // Brief pause between tests
        await new Promise(resolve => setTimeout(resolve, 2000));
    }

    // Close server
    console.log('\n🌐 Closing HTTP server...');
    server.close();

    const totalDuration = Date.now() - totalStartTime;

    // Generate summary report
    console.log('\n📊 EVALUATION SUMMARY');
    console.log('====================');

    const successCount = results.filter(r => r.success).length;
    const failureCount = results.length - successCount;

    console.log(`Total Tests: ${results.length}`);
    console.log(`Passed: ${successCount}`);
    console.log(`Failed: ${failureCount}`);
    console.log(`Success Rate: ${Math.round((successCount/results.length) * 100)}%`);

    const testDuration = results.reduce((sum, r) => sum + r.duration, 0);
    const avgDuration = testDuration / results.length;
    console.log(`Total Test Duration: ${Math.round(testDuration/1000)}s`);
    console.log(`Total Wall Clock Time: ${Math.round(totalDuration/1000)}s`);
    console.log(`Average Test Duration: ${Math.round(avgDuration/1000)}s`);

    const totalSegments = results.reduce((sum, r) => sum + r.segmentsFound, 0);
    console.log(`Total Segments Found: ${totalSegments}`);
    console.log();

    // Detailed results
    console.log('📋 DETAILED RESULTS');
    console.log('==================');

    results.forEach((result, index) => {
        const status = result.success ? '✅ PASS' : '❌ FAIL';
        const duration = Math.round(result.duration/1000);
        const expectedSegs = EXPECTED_SEGMENTS[result.fileName];

        let segmentInfo = `${result.segmentsFound}`;
        if (expectedSegs !== undefined) {
            if (expectedSegs === 'need clarification') {
                segmentInfo = `${result.segmentsFound} (requires clarification)`;
            } else {
                segmentInfo = `${result.segmentsFound}/${expectedSegs}`;
                if (result.segmentsFound !== expectedSegs && result.success) {
                    segmentInfo += ' ⚠️';
                }
            }
        }

        console.log(`${index + 1}. ${status} ${result.fileName}`);
        console.log(`   Duration: ${duration}s | Segments: ${segmentInfo}`);

        if (result.errors.length > 0) {
            console.log(`   Errors: ${result.errors.slice(0, 2).join('; ')}${result.errors.length > 2 ? '...' : ''}`);
        }

        const stageResults = Object.entries(result.stages)
            .map(([stage, success]) => `${stage}:${success ? '✅' : '❌'}`)
            .join(' ');
        console.log(`   Stages: ${stageResults}`);
        console.log();
    });

    // Stage success analysis
    console.log('🔍 STAGE ANALYSIS');
    console.log('================');

    const stageNames = Object.keys(results[0].stages);
    stageNames.forEach(stageName => {
        const stageSuccessCount = results.filter(r => r.stages[stageName]).length;
        const stageSuccessRate = Math.round((stageSuccessCount/results.length) * 100);
        console.log(`${stageName}: ${stageSuccessCount}/${results.length} (${stageSuccessRate}%)`);
    });

    // Performance insights
    if (successCount > 0) {
        const successfulResults = results.filter(r => r.success);
        const segmentCounts = successfulResults.map(r => r.segmentsFound);
        const durations = successfulResults.map(r => r.duration);

        console.log('\n📈 PERFORMANCE INSIGHTS');
        console.log('======================');
        console.log(`Segments per file: ${Math.min(...segmentCounts)} - ${Math.max(...segmentCounts)} (avg: ${Math.round(segmentCounts.reduce((a,b) => a+b, 0)/segmentCounts.length)})`);
        console.log(`Processing time: ${Math.round(Math.min(...durations)/1000)}s - ${Math.round(Math.max(...durations)/1000)}s (avg: ${Math.round(durations.reduce((a,b) => a+b, 0)/durations.length/1000)}s)`);
    }

    console.log('\n🎯 EVALUATION COMPLETE');

    // Return results with console logs for external processing
    return {
        success: successCount === results.length,
        results: results
    };
}

// Run the evaluation
runSequentialEvaluation().then(evalResult => {
    // Write detailed console logs to file if requested via environment variable
    const logFilePath = process.env.EVAL_LOG_FILE;
    if (logFilePath) {
        console.log(`\n💾 Saving detailed console logs to ${logFilePath}...`);

        const logOutput = [];
        logOutput.push('=' .repeat(80));
        logOutput.push('DETAILED CONSOLE LOGS FROM EVALUATION');
        logOutput.push('=' .repeat(80));
        logOutput.push('');

        evalResult.results.forEach((result, index) => {
            logOutput.push(`\n${'='.repeat(80)}`);
            logOutput.push(`TEST ${index + 1}: ${result.fileName}`);
            logOutput.push(`Status: ${result.success ? 'PASS' : 'FAIL'}`);
            logOutput.push(`Duration: ${Math.round(result.duration/1000)}s`);
            logOutput.push(`Segments: ${result.segmentsFound}`);
            logOutput.push('='.repeat(80));
            logOutput.push('');

            if (result.consoleLogs && result.consoleLogs.length > 0) {
                result.consoleLogs.forEach(log => {
                    const prefix = log.type === 'error' ? '❌ ERROR' :
                                 log.type === 'warning' ? '⚠️  WARN' :
                                 '📝 LOG';
                    logOutput.push(`${prefix}: ${log.text}`);
                });
            } else {
                logOutput.push('(No console logs captured)');
            }
            logOutput.push('');
        });

        logOutput.push('\n' + '='.repeat(80));
        logOutput.push('END OF CONSOLE LOGS');
        logOutput.push('='.repeat(80));

        fs.writeFileSync(logFilePath, logOutput.join('\n'));
        console.log(`✅ Console logs saved to ${logFilePath}`);
    }

    process.exit(evalResult.success ? 0 : 1);
}).catch(error => {
    console.error('❌ Evaluation runner error:', error);
    process.exit(1);
});