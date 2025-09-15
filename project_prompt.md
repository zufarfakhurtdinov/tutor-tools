# Project Prompt

### **1. Executive Summary**

Create a self-contained, single-page HTML application that allows a user to upload an audio file and transcribes it. The application will first display the full transcription alongside a playable waveform of the original audio. The user can then initiate a second step to split the audio into multiple segments based on spoken English numbers (e.g., "one," "two," "three"). Finally, the user can preview the split points on the waveform and download the individual segments or a ZIP archive containing all of them. All processing must occur client-side.

### **2. Core Technical Requirements**

*   **Single File Delivery:** The entire application's custom code (HTML, CSS, JavaScript) must be contained within a single `index.html` file. Use a hybrid approach: load utility libraries (JSZip, lamejs) via CDN `<script>` tags, and import modern libraries (Transformers.js) as ES modules within the main application script.
*   **Reliable Script Execution:** Use ES modules for the main application logic. ES modules naturally wait for dependencies and handle execution order correctly. Utility libraries loaded via script tags will be available globally before the module executes.
*   **Client-Side Only:** No server-side processing or external API calls are allowed. The app must function offline once loaded (assuming the CDN-hosted libraries and models have been cached by the browser).
*   **Browser Compatibility:** Target **Google Chrome 140.0.7339.133 or newer only**. The application does not need to support other browsers, older Chrome versions, or cross-browser compatibility. Use modern Chrome-specific features freely.
*   **Accessibility Scope:** This is a desktop-only application for Chrome. **Explicitly exclude:**
    *   Keyboard navigation support
    *   Screen reader compatibility
    *   Mobile/touch device considerations
    The application should work exclusively in a desktop Chrome browser environment.
*   **Required Tech Stack (Latest Versions - All Verified):**

    **All libraries below have been verified for latest stable versions and valid CDN links:**

    **✅ VERIFIED: @huggingface/transformers v3.7.2 supports `return_timestamps: 'word'` parameter for word-level timestamp extraction. This functionality was introduced in v2.4.0 and continues to work in v3.7.2.**

    | Library | Version | CDN Link | Plugins |
    |---------|---------|----------|---------|
    | @huggingface/transformers | v3.7.2 | `https://cdn.jsdelivr.net/npm/@huggingface/transformers@3.7.2/dist/transformers.min.js` | N/A |
    | WaveSurfer.js | v7.10.1 | `https://unpkg.com/wavesurfer.js@7/dist/wavesurfer.esm.js` | Regions Plugin |
    | Regions Plugin | v7.10.1 | `https://unpkg.com/wavesurfer.js@7/dist/plugins/regions.esm.js` | N/A |
    | @breezystack/lamejs | v1.2.7 | `https://cdn.jsdelivr.net/npm/@breezystack/lamejs@1.2.7/lame.all.js` | N/A |
    | JSZip | v3.10.1 | `https://cdnjs.cloudflare.com/ajax/libs/jszip/3.10.1/jszip.min.js` | N/A |

    *   **Audio Transcription:** Use **@huggingface/transformers v3.7.2** (latest stable) with `Xenova/whisper-tiny` model for maximum client-side performance and reduced initial load time. Import via official CDN: `import { pipeline, env } from 'https://cdn.jsdelivr.net/npm/@huggingface/transformers@3.7.2/dist/transformers.min.js'`
    *   **Waveform Visualization:** Use **WaveSurfer.js v7.10.1** (latest) with the Regions plugin for split point visualization. Import both as ES modules: `import WaveSurfer from 'https://unpkg.com/wavesurfer.js@7/dist/wavesurfer.esm.js'` and `import Regions from 'https://unpkg.com/wavesurfer.js@7/dist/plugins/regions.esm.js'`
    *   **MP3 Encoding:** Use **@breezystack/lamejs v1.2.7** (latest with TypeScript support) via CDN: `<script src="https://cdn.jsdelivr.net/npm/@breezystack/lamejs@1.2.7/lame.all.js"></script>`
    *   **ZIP Archiving:** Use **JSZip v3.10.1** via CDN: `<script src="https://cdnjs.cloudflare.com/ajax/libs/jszip/3.10.1/jszip.min.js"></script>`

### **2.1. Interactive Transcript Requirements (Bidirectional Audio-Text Alignment)**

**UI State Integration:** These requirements apply to **State 3** (Transcription Results) and **State 4** (Segmented Results) as described in Section 5.

**Progressive Activation Timeline:**
*   **State 1-2:** Interactive features are **disabled** - transcript is not yet available
*   **State 3:** **All interactive features activate** immediately when transcription completes:
    *   Click-to-seek functionality (FR3)
    *   Real-time playback highlighting (FR4)
    *   Auto-scroll during playback (FR5)
*   **State 4:** **All features continue functioning** while split markers and downloads are added

Interactive features become available only after transcription completion.

**UI Coordination:** The interactive transcript works alongside existing playback controls (Play/Stop buttons from State 3). Both transcript clicks and button clicks control the same underlying WaveSurfer audio player instance.

**Core Problem Analysis:**
The application must establish a bidirectional relationship between the audio player and text display:
*   **From Text to Audio:** User controls audio playback by interacting with the text
*   **From Audio to Text:** Visual feedback in text reflects current audio playback state

**Functional Requirements:**

**FR1: High-Granularity Timestamp Acquisition**
*   The system must request the highest possible temporal resolution from the transcription model
*   Required output: data structure containing each transcribed word mapped to precise start and end timestamps
*   **CRITICAL:** Use `return_timestamps: 'word'` parameter for word-level timestamp granularity
*   Chunk-level or sentence-level timestamps are insufficient for this feature

**FR2: Interactive Transcript User Interface**
*   Transcript display must allow individual word interactivity
*   Standard `<textarea>` elements are not suitable - must use `<div>` with dynamic content
*   Each word must be individually addressable for both visual styling and user input events
*   Implementation: Create `populateTranscript(wordTimestamps)` function that generates `<span>` elements for each word
*   Each `<span>` must store corresponding start/end times in `data-*` attributes (e.g., `data-start-time="1.23"`, `data-end-time="1.45"`)

**FR3: Click-to-Seek Functionality**
*   When user clicks any word in transcript display, audio player must immediately seek to start time of that word
*   Audio playback should commence automatically from the new position
*   Implementation: Single click event listener on parent transcript `<div>` using event delegation pattern

**FR4: Real-time Playback Highlighting**
*   While audio is playing, the word currently being spoken must be visually highlighted in transcript
*   Highlight must move word-to-word in real-time, synchronized with audio playback
*   When audio playback is paused, stopped, or finished, highlighting must be removed
*   Implementation: WaveSurfer `timeupdate` event listener with efficient span finding logic

**FR5: User Experience Enhancement (Auto-Scroll)**
*   For transcripts exceeding visible container area, view must automatically scroll to keep currently highlighted word visible
*   Implementation: `scrollIntoView({ behavior: 'smooth', block: 'center' })` on highlighted elements

**Implementation Requirements:**
*   Use `return_timestamps: 'word'` to get individual word timestamps
*   Replace standard `<textarea>` with `<div>` containing `<span>` elements for each word
*   Store word timing data in `data-*` attributes on each `<span>` element
*   Implement click-to-seek using event delegation pattern on parent container
*   Add real-time highlighting synchronized with audio playback using WaveSurfer's `timeupdate` event
*   Include auto-scroll functionality to keep highlighted words visible

### **3. User Input**

*   **Primary Input:** A single audio file.
*   **Input Methods:**
    *   A large, clearly marked drag-and-drop area.
    *   **The drag-and-drop area must also function as a clickable button that opens the system's file browser.**
*   **Supported Formats:** The application should reliably handle standard web audio formats like WAV, MP3, OGG, and FLAC.
*   **File Size Limit:** Maximum audio file size is **80MB**. Files exceeding this limit should be rejected with a clear error message.
*   **Duration Limit:** Maximum audio duration is **60 minutes**. Longer files should be rejected.
*   **Memory Management:** All files are processed in 30-second chunks to manage memory usage efficiently.

### **4. Application Output**

*   **Primary Output:** A collection of audio segments.
*   **Output Format:** All generated audio segments should be encoded as MP3 files preserving original audio characteristics.
*   **Audio Quality Preservation:**
    *   **Maintain original sample rate** (e.g., 44.1kHz, 48kHz, etc.)
    *   **Maintain original bit depth equivalent** through appropriate MP3 bitrate selection
    *   **Preserve original channel configuration** (mono, stereo, etc.)
    *   **Dynamic bitrate selection:** For lossy source formats (MP3, AAC, OGG), use original bitrate (capped at 320kbps maximum). For lossless sources (WAV, FLAC), use 128kbps bitrate.
*   **File Naming:** Segments should be sequentially named based on the detected number: `1.mp3`, `2.mp3`, `3.mp3`, etc.
*   **Download Options:**
    *   A list of the generated segments, with an individual download button next to each one.
    *   A primary "Download All as ZIP" button that downloads a single archive named `split_audio.zip`.

### **5. UI and User Experience (UX) Flow**

**Progress Indicators Required:**
The application must provide detailed progress feedback for all long-running operations:
*   **Model downloading/initialization** - Show download progress percentage and current operation (e.g., "Downloading model... 45%", "Initializing WebGPU...")
*   **Audio processing** - Display chunked processing progress for all files (e.g., "Processing chunk 8 of 15... 53%") using 30-second chunks
*   **Audio encoding (MP3 conversion)** - Display encoding progress per segment (e.g., "Encoding segment 2 of 5... 60%")
*   **ZIP generation** - Show compression progress (e.g., "Creating ZIP archive... 80%")
*   **Memory management** - Show memory usage warnings when approaching limits

The application should have four distinct states:
*   **State 1: Initial (Awaiting File)**
    *   On first load, the application will begin initializing the AI model in the background. During this time, the large drop/click area must be visible but appear **disabled** (e.g., grayed out, `cursor: not-allowed`). The text inside should inform the user of this one-time setup (e.g., "Initializing AI Model...").
    *   Once the model is ready, the drop/click area becomes fully interactive with its standard instructive text (e.g., "Drop an audio file here or click to select").
*   **State 2: Processing (File Loaded)**
    *   Once a file is loaded, the drop area should be replaced by a processing indicator (e.g., a spinner).
    *   The status text must update dynamically to show transcription progress (e.g., "Transcribing... 25%").
*   **State 3: Transcription Results (Awaiting Split Command)**
    *   This state is shown immediately after transcription is complete.
    *   **Waveform Player:** A visual waveform of the full audio.
    *   **Playback Controls:** Explicit **"Play" and "Stop" buttons** that control audio playback of the waveform. The "Play" button should toggle to a "Pause" state during playback.
    *   **Interactive Transcript Display:** An interactive transcript implementing all requirements from Section 2.1, where each word can be clicked to seek audio playback, with real-time highlighting during playback.
    *   **Action Button:** A prominent button labeled **"Find & Split Segments"**. The download components are hidden at this stage.
*   **State 4: Segmented Results (Splitting Complete)**
    *   This state is shown after the user clicks the "Find & Split Segments" button.
    *   The UI from State 3 remains, but is now enhanced with:
    *   **Interactive Transcript:** All Section 2.1 features continue to function (click-to-seek, real-time highlighting, auto-scroll)
    *   **Split Markers:** Vertical lines on the waveform at each calculated split point.
    *   **Download Component:** A list of downloadable segments and a "Download All as ZIP" button now become visible.

### **6. Core Algorithm (Detailed Steps)**

*   **File Load & Dual Audio Processing:**
    *   On file drop/select, use `URL.createObjectURL()` to create a local URL for the file.
    *   **Dual Audio Workflow (Specific Implementation Order):**
        *   **Step 1 - WaveSurfer Loading:** Load the file into WaveSurfer.js first for waveform visualization:
            ```javascript
            await wavesurfer.load(fileUrl);
            ```
        *   **Step 2 - Extract Original Buffer:** After WaveSurfer loading completes, extract the AudioBuffer using the v7 API:
            ```javascript
            const originalBuffer = wavesurfer.getDecodedData(); // Preserves original format
            ```
        *   **Step 3 - Create Transcription Buffer:** Generate a separate 16kHz mono version from the extracted original buffer for AI transcription processing, without modifying the original buffer.

*   **Audio Transcription (First Stage):**
    *   Configure the environment and initialize the transcriber:
        ```javascript
        env.allowRemoteModels = true;
        env.allowLocalModels = false;
        console.log('Initializing transcription model: Xenova/whisper-tiny');
        const transcriber = await pipeline('automatic-speech-recognition', 'Xenova/whisper-tiny', { device: 'webgpu', dtype: 'q4' });
        ```
    *   **Memory-Efficient Audio Processing (For Transcription Only):**
        *   **CRITICAL:** Process transcription audio from the extracted `originalBuffer` obtained via `wavesurfer.getDecodedData()`
        *   **Implementation Strategy:**
            ```javascript
            // Create transcription-specific AudioContext
            const transcriptionContext = new AudioContext({sampleRate: 16000});

            // Resample original buffer to 16kHz for transcription
            const transcriptionBuffer = await resampleBuffer(originalBuffer, 16000);

            // Convert to mono if needed: (left + right) / 2
            const monoBuffer = convertToMono(transcriptionBuffer);
            ```
        *   Process transcription audio in 30-second chunks with streaming approach
        *   **Memory Management:** Original buffer remains in WaveSurfer, transcription buffers are cleared after each chunk
        *   **Timestamp Synchronization:** Account for sample rate differences when mapping word timestamps back to original audio
    *   **CRITICAL - Accuracy Settings:** Invoke the transcriber with: `language: 'english'`, `task: 'transcribe'`, `chunk_length_s: 30`, `stride_length_s: 5`, `return_timestamps: 'word'`. Use 30-second chunk streaming processing for all files.
    *   **CRITICAL - Word-Level Timestamp Handling:** The transcription process must be configured to return detailed timestamp data for each transcribed word. The `return_timestamps: 'word'` parameter must guarantee that the output includes a word-level data array containing objects with individual word text and timestamp ([start, end]) pairs.
    *   **CRITICAL - Progressive Transcription:** Use the `progress_callback` parameter to:
        1.  Update the UI progress indicator in real-time
        2.  Append word-level transcription data to a global `wordTimestamps` array
        3.  Display partial transcription text as it becomes available
        4.  Show chunked processing progress (e.g., "Processing chunk 3 of 12...") with 30-second streaming chunks
    *   **Memory Management:** Maximum working memory per chunk: 600MB, Maximum peak memory usage: 1GB
        *   **Note:** Original buffer remains in WaveSurfer's memory (~200-400MB for 80MB file), transcription processing uses additional ~200-400MB per chunk, cleared after processing
    *   Transition to **State 3** showing the complete waveform and transcription.

*   **Segment Splitting (Second Stage - Triggered by Button Click):**
    *   **CRITICAL - Robust Splitting Logic:** Before attempting to find and split segments, the code must validate that the `wordTimestamps` variable is a non-empty array. If the model fails to return this word-level data (resulting in undefined or an empty array), the application must not crash. Instead, it should disable the "Find & Split Segments" button and display a clear, user-friendly error message explaining that the necessary word-level timestamp data could not be generated, and that splitting is therefore not possible.
    *   When the user clicks "Find & Split Segments":
    *   **Number Identification:** Support numbers from 1-99 in both formats:
        *   **Number Words:** `['one', 'two', 'three', ..., 'twenty', 'twenty-one', ..., 'ninety-nine']`
        *   **Digits:** `['1', '2', '3', ..., '99']`
        *   **Mixed Recognition:** The system should detect either format interchangeably (e.g., sequence could be "one", "2", "three", "4")
    *   **Splitting Logic:**
        *   Create comprehensive number mapping arrays for both words and digits (1-99).
        *   Iterate through the globally stored `wordTimestamps` array.
        *   For each word entry, normalize the `text` (trimmed, lowercased, punctuation removed) and check if it matches the next expected number in the sequence (supporting both "twenty-one" and "21" formats).
        *   **Flexible Matching:** Handle transcription variations (e.g., "twenty one" vs "twenty-one", "1st" vs "one", etc.).
        *   If the correct sequential number is found, store its **end timestamp** as a split point. Increment the number counter.
    *   **Audio Slicing and Encoding (Using Original Audio):**
        *   Define audio segments by the collected timestamps. The first segment runs from time `0` to the first split point. `1.mp3` will contain audio from `0` to the end-time of "one", `2.mp3` will be from the end-time of "one" to the end-time of "two", and so on.
        *   **CRITICAL:** Use the original `AudioBuffer` extracted from WaveSurfer via `wavesurfer.getDecodedData()` for all segment creation
        *   **Timestamp Mapping:** Convert word timestamps from 16kHz transcription back to original sample rate before slicing:
            ```javascript
            const originalSampleRate = originalBuffer.sampleRate;
            const scaleFactor = originalSampleRate / 16000;
            const adjustedTimestamp = transcriptionTimestamp * scaleFactor;
            ```
        *   For each segment, create a new `AudioBuffer` by slicing the original `AudioBuffer` at the adjusted timestamps and encode it to MP3 using `lamejs`.
        *   **Quality Preservation Settings:**
            *   **Detect original audio characteristics:** sample rate, channel count, and estimated quality
            *   **Dynamic MP3 bitrate:** For lossy sources (MP3, AAC, OGG), use original bitrate when available, fallback to file size estimation (capped at 320kbps maximum). For lossless sources (WAV, FLAC), use 128kbps bitrate.
            *   **Preserve channel configuration:** mono sources → mono MP3, stereo sources → stereo MP3
            *   **Maintain sample rate:** Use original sample rate for MP3 encoding (don't downsample to 44.1kHz)
        *   **Memory-Efficient Encoding:** Process segments one at a time, encoding each segment to MP3 immediately and clearing intermediate buffers to prevent memory buildup.
    *   **UI Update & Download Generation:**
        *   **Use WaveSurfer.js v7+ Regions Plugin API (Markers are deprecated).** Complete region management workflow:
            ```javascript
            // Clear existing regions before adding new ones
            regions.clearRegions();

            // Add split markers as regions (ONLY after 'ready' event)
            wavesurfer.on('ready', () => {
                splitTimestamps.forEach((timestamp, index) => {
                    regions.addRegion({
                        start: timestamp,
                        end: timestamp + 0.1, // 0.1 second marker width
                        color: 'rgba(255, 0, 0, 0.3)',
                        drag: false,          // Prevent user dragging
                        resize: false,        // Prevent user resizing
                        content: `Split ${index + 1}`, // Optional label
                        id: `split-${index + 1}`       // Unique identifier
                    });
                });
            });
            ```
        *   Create blob URLs for individual MP3 downloads using lamejs encoding.
        *   Use JSZip to bundle all segments: `const zip = new JSZip(); zip.file('1.mp3', mp3Blob1); const zipBlob = await zip.generateAsync({type: 'blob'})`.
        *   **Progressive ZIP Creation:** Add files to ZIP incrementally with progress updates to prevent UI blocking.
        *   Transition to **State 4** with visible download components.

### **7. Error Handling & Edge Cases**

**Simple Error Handling Strategy:**
*   **Console Logging:** All errors must be logged to browser console with descriptive messages
*   **Visual Error Display:** Create a dedicated HTML element (`<div id="error-display">`) to show user-friendly error messages
*   **No Dialogs/Alerts:** Avoid `alert()`, `confirm()`, or modal dialogs - use inline HTML elements only
*   **Error Message Format:**
    ```javascript
    function showError(message) {
        console.error('Audio App Error:', message);
        const errorDiv = document.getElementById('error-display');
        errorDiv.innerHTML = `<div class="error-message">${message}</div>`;
        errorDiv.style.display = 'block';
    }
    ```
*   **Error Recovery:** Provide clear instructions in error messages on how user can proceed or retry

**Required Error Handling:**
*   **File Validation:**
    *   Reject files with unsupported sample rates (<8kHz or >192kHz)
    *   Validate audio codec compatibility before processing
    *   Check file integrity and handle corrupted audio gracefully
    *   **Audio Quality Detection:** Automatically detect original sample rate, bit depth, and channel configuration for preservation
    *   **Bitrate Estimation:** For lossy sources (MP3, AAC, OGG), extract original audio bitrate from file metadata when available, fallback to file size/duration calculation for MP3 encoding bitrate. For lossless sources (WAV, FLAC), use 128kbps for MP3 encoding.
*   **Memory Management:**
    *   Monitor browser memory usage and warn when approaching limits
    *   Provide graceful degradation for low-memory devices
    *   Implement automatic cleanup on processing failures
*   **Number Detection Edge Cases:**
    *   Handle out-of-sequence numbers (e.g., "one, three, two")
    *   Skip repeated numbers and continue sequence
    *   Support mixed formats within same sequence (e.g., "one, 2, three, 4, five")
    *   Handle ordinal numbers (e.g., "1st", "2nd", "first", "second")
    *   Normalize compound numbers (e.g., "twenty one" → "twenty-one" → "21")
    *   Handle transcription errors (e.g., "to" instead of "two", "for" instead of "four")
    *   Provide fallback message when no sequential numbers are detected (minimum 2 consecutive numbers required)
    *   Handle partial number sequences up to 99 (e.g., sequence from "one" to "fifty-seven")
*   **Network & Model Loading:**
    *   Implement retry mechanism for model download failures
    *   Provide offline fallback message when CDN resources are unavailable
    *   Handle WebGPU initialization failures with CPU fallback
*   **Browser Compatibility:**
    *   Detect and handle missing Web Audio API support
    *   Gracefully handle quota exceeded errors for large files
    *   Handle WebGPU unavailability with automatic CPU fallback
    *   Provide clear error messages for unsupported browser features
    *   **WaveSurfer Region Management:**
        *   Always call `regions.clearRegions()` before adding new regions
        *   Only call `regions.addRegion()` after 'ready' event is fired
        *   Use proper cleanup with `regions.destroy()` when switching files
        *   Handle cases where regions plugin fails to initialize

**7.5. Robust Progress Indicator Handling**

**Context:** The application relies on the `progress_callback` function from the Hugging Face Transformers.js library to provide real-time feedback during model initialization. This callback is asynchronous and its data structure is not guaranteed to be consistent across all events.

**Problem Statement:** The `progress_callback` sends different types of updates:
*   **File Download Progress:** `{ status: 'progress', name: 'model.bin', progress: 55.6789 }`
*   **Status Change:** `{ status: 'done', name: 'model.bin' }` or `{ status: 'initializing' }`

Assuming a fixed data structure can lead to unhandled exceptions when accessing undefined properties.

**Functional Requirements:**

*   **Defensive Data Access:** The `progress_callback` handler MUST NOT assume the existence of the numerical `progress` property on the event object. All access to this property must be conditional.

*   **Type Validation:** Before attempting to perform any number-specific operations (like `.toFixed()`) on the `progress` property, the code MUST first execute a check to verify that the property both exists and is of type `number`.

*   **Differentiated UI Updates:** The user-facing status message must intelligently adapt to the information provided:
    *   **When numerical `progress` property is present:** Display both status and formatted percentage
        *   Example: `"Downloading model... (45.50%)"`
    *   **When numerical `progress` property is absent:** Display only status text without percentage
        *   Example: `"Initializing model..."` or `"Download complete"`

*   **Zero-Crash Guarantee:** The implementation must prevent any `TypeError` or unhandled runtime exceptions, regardless of the data structure passed by the Transformers.js library.

**Required Implementation Pattern:**
```javascript
function handleProgressCallback(progress) {
    let statusText = `Initializing Model... ${progress.status}`;

    // CRITICAL: Defensive check before accessing progress.progress
    if (typeof progress.progress === 'number') {
        const percent = progress.progress.toFixed(2);
        statusText += ` (${percent}%)`;
    }

    updateStatus(statusText);
}

// Usage in transcriber initialization
const transcriber = await pipeline('automatic-speech-recognition', 'Xenova/whisper-tiny', {
    device: 'webgpu',
    dtype: 'q4',
    progress_callback: handleProgressCallback
});
```

### **8. Implementation Structure**

**Recommended HTML Structure:**
```html
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Audio Transcription & Segmentation Tool</title>

    <!-- Load utility libraries via CDN (available globally) -->
    <script src="https://cdnjs.cloudflare.com/ajax/libs/jszip/3.10.1/jszip.min.js"></script>
    <script src="https://cdn.jsdelivr.net/npm/@breezystack/lamejs@1.2.7/lame.all.js"></script>
</head>
<body>
    <div id="app">
        <div id="error-display" style="display: none;"></div>
        <div id="dropzone">Drop audio file here or click to select</div>
        <div id="waveform"></div>
        <div id="transcript"></div>
        <div id="controls"></div>
        <div id="downloads"></div>
    </div>

    <script type="module">
        // Import modern libraries as ES modules
        import { pipeline, env } from 'https://cdn.jsdelivr.net/npm/@huggingface/transformers@3.7.2/dist/transformers.min.js';
        import WaveSurfer from 'https://unpkg.com/wavesurfer.js@7/dist/wavesurfer.esm.js';
        import Regions from 'https://unpkg.com/wavesurfer.js@7/dist/plugins/regions.esm.js';

        // Main application logic here
        // Global libraries (JSZip, lamejs, WaveSurfer) are available
        // ES module imports are handled automatically

        let transcriber, wavesurfer, regions;

        // Simple error handling function
        function showError(message) {
            console.error('Audio App Error:', message);
            const errorDiv = document.getElementById('error-display');
            errorDiv.innerHTML = `<div class="error-message">${message}</div>`;
            errorDiv.style.display = 'block';
        }

        async function initializeApp() {
            try {
                // Configure environment for remote model loading
                env.allowRemoteModels = true;
                env.allowLocalModels = false;

                // Initialize AI model with WebGPU fallback to CPU
                let device = 'webgpu';
                try {
                    // Test WebGPU availability
                    if (!navigator.gpu) device = 'cpu';
                } catch {
                    device = 'cpu';
                }

                transcriber = await pipeline('automatic-speech-recognition', 'Xenova/whisper-tiny', {
                    device: device,
                    dtype: device === 'webgpu' ? 'q4' : 'fp32'
                });

                // Initialize WaveSurfer with complete configuration
                wavesurfer = WaveSurfer.create({
                    container: '#waveform',
                    waveColor: '#4A90E2',
                    progressColor: '#1976D2',
                    interact: true,
                    dragToSeek: true,
                    height: 100
                });

                // Initialize Regions plugin with proper registration
                regions = wavesurfer.registerPlugin(Regions.create({
                    dragSelection: false // Prevent accidental region creation
                }));

                // Setup event handlers for proper region management
                wavesurfer.on('ready', () => {
                    console.log('WaveSurfer ready - can now add regions safely');
                });

                wavesurfer.on('destroy', () => {
                    if (regions) {
                        regions.destroy();
                    }
                });

                console.log('Application initialized successfully');
            } catch (error) {
                showError('Failed to initialize application. Please refresh the page and try again.');
            }
        }

        // Start initialization
        initializeApp();
    </script>
</body>
</html>
```

**Key Improvements:**
- **No conflicting script loading approaches** - uses CDN for globals, ES modules for modern libraries
- **Latest verified library versions** with specific version numbers for stability
- **Modern API usage** - Regions instead of deprecated Markers, WebGPU acceleration with CPU fallback
- **Comprehensive error handling** structure for robust initialization and processing
- **Memory-optimized processing** - chunked processing, progressive cleanup, 1GB memory management
- **Performance optimizations** - 4-bit quantization, WebGPU acceleration, Web Audio API resampling