# Project Prompt

### **1. Executive Summary**

Create a self-contained, single-page HTML application that allows a user to upload an audio file and transcribes it. The application will first display the full transcription alongside a playable waveform of the original audio. The user can then initiate a second step to extract audio segments containing phrases that follow spoken English numbers (e.g., "one," "two," "three"). Finally, the user can preview the extraction markers on the waveform and download the individual segments or a ZIP archive containing all of them. All processing must occur client-side.

**🔥 IMPLEMENTATION REQUIREMENTS:** This specification includes required fixes for common issues:
- **CDN Library Loading:** Verified working links and initialization verification to prevent "lamejs is not defined" errors
- **Audio Data Format:** Mandatory AudioBuffer to Float32Array conversion to prevent "e.subarray is not a function" errors
- **Error Handling:** Comprehensive error detection and user-friendly messaging
- **Testing Requirements:** End-to-end Playwright testing to ensure all components work together

### **2. Core Technical Requirements**

*   **Single File Delivery:** The entire application's custom code (HTML, CSS, JavaScript) must be contained within a single `index.html` file. Use a hybrid approach: load utility libraries (JSZip, lamejs, Whisper.cpp WASM) via CDN `<script>` tags within the main application script.
*   **Reliable Script Execution:** Use standard script tags for all libraries. Libraries loaded via script tags will be available globally and execute in order.
*   **Client-Side Only:** No server-side processing or external API calls are allowed. The app must function offline once loaded (assuming the CDN-hosted libraries and models have been cached by the browser).
*   **Browser Compatibility:** Target **Google Chrome 140.0.7339.133 or newer only**. The application does not need to support other browsers, older Chrome versions, or cross-browser compatibility. Use modern Chrome-specific features freely.
*   **Accessibility Scope:** This is a desktop-only application for Chrome. **Explicitly exclude:**
    *   Keyboard navigation support
    *   Screen reader compatibility
    *   Mobile/touch device considerations
    The application should work exclusively in a desktop Chrome browser environment.
*   **Required Tech Stack (Verified Working Versions - CDN Links Tested):**

    **🔥 CRITICAL: Use the specified library versions and CDN links below.**

    **✅ VERIFIED: Whisper.cpp WASM supports granular timestamps with `--max-len 1` parameter (segments ~1 word each, not true word-level like transformers.js).**

    **⚠️ REQUIRED CDN LINKS:**

    | Library | Version | CDN Link | Status | Plugins |
    |---------|---------|----------|--------|---------|
    | whisper.cpp WASM | v1.0.3 | `https://cdn.jsdelivr.net/npm/whisper.cpp@1.0.3/whisper.js` | ✅ Verified | N/A |
    | WaveSurfer.js | v7.10.1 | `https://unpkg.com/wavesurfer.js@7/dist/wavesurfer.min.js` | ✅ Verified | Regions Plugin |
    | Regions Plugin | v7.10.1 | `https://unpkg.com/wavesurfer.js@7/dist/plugins/regions.min.js` | ✅ Verified | N/A |
    | lamejs | v1.2.0 | `https://cdn.jsdelivr.net/npm/lamejs@1.2.0/lame.all.js` | ✅ Verified | N/A |
    | JSZip | v3.10.1 | `https://cdnjs.cloudflare.com/ajax/libs/jszip/3.10.1/jszip.min.js` | ✅ Verified | N/A |

    **❌ INCOMPATIBLE LINKS:**
    - `@breezystack/lamejs@1.2.7` - Returns 404 error
    - Any `@breezystack/lamejs` versions - Package does not exist

    *   **Audio Transcription:** Use **whisper.cpp WASM v1.0.3** with `ggml-small` model for better accuracy and performance. Load via CDN: `<script src="https://cdn.jsdelivr.net/npm/whisper.cpp@1.0.3/whisper.js"></script>`
    *   **Waveform Visualization:** Use **WaveSurfer.js v7.10.1** (latest) with the Regions plugin for extraction marker visualization. Load via CDN: `<script src="https://unpkg.com/wavesurfer.js@7/dist/wavesurfer.min.js"></script>` and `<script src="https://unpkg.com/wavesurfer.js@7/dist/plugins/regions.min.js"></script>`
    *   **MP3 Encoding:** Use **lamejs v1.2.0** (stable version) via CDN: `<script src="https://cdn.jsdelivr.net/npm/lamejs@1.2.0/lame.all.js"></script>`
        *   **CRITICAL - Library Loading Verification:** The lamejs library must be properly loaded and accessible before MP3 encoding. Add defensive checks to verify library availability:
            ```javascript
            // Check if lamejs is loaded before using
            if (typeof lamejs === 'undefined') {
                throw new Error('lamejs library not loaded. Please check CDN connection.');
            }

            // Check for different global names the library might use
            const lameLib = window.lamejs || window.LAME || window.lame;
            if (!lameLib || !lameLib.Mp3Encoder) {
                throw new Error('MP3 encoder not available. lamejs library may not be properly loaded.');
            }
            ```
    *   **ZIP Archiving:** Use **JSZip v3.10.1** via CDN: `<script src="https://cdnjs.cloudflare.com/ajax/libs/jszip/3.10.1/jszip.min.js"></script>`

### **2.1. Interactive Transcript Requirements (Bidirectional Audio-Text Alignment)**

**UI State Integration:** These requirements apply to **State 3** (Transcription Results) and **State 4** (Segmented Results) as described in Section 5.

**Progressive Activation Timeline:**
*   **State 1-2:** Interactive features are **disabled** - transcript is not yet available
*   **State 3:** **All interactive features activate** immediately when transcription completes:
    *   Click-to-seek functionality (FR3)
    *   Real-time playback highlighting (FR4)
    *   Auto-scroll during playback (FR5)
*   **State 4:** **All features continue functioning** while segment markers and downloads are added

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
*   Audio playback should commence automatically from the selected position
*   Implementation: Single click event listener on parent transcript `<div>` using event delegation pattern

**FR4: Real-time Playback Highlighting**
*   While audio is playing, the word currently being spoken must be visually highlighted in transcript
*   Highlight must move word-to-word in real-time, synchronized with audio playback
*   When audio playback is paused, stopped, or finished, highlighting must be removed
*   Implementation: WaveSurfer `timeupdate` event listener with efficient span finding logic

**FR5: Auto-Scroll Functionality**
*   For transcripts exceeding visible container area, view must automatically scroll to keep currently highlighted word visible
*   Implementation: `scrollIntoView({ behavior: 'smooth', block: 'center' })` on highlighted elements

**Implementation Requirements:**
*   Use `return_timestamps: 'word'` to get individual word timestamps
*   Use `<div>` containing `<span>` elements for each word (not `<textarea>`)
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
    *   A primary "Download All as ZIP" button that downloads a single archive named `extracted_audio.zip`.

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
*   **State 3: Transcription Results (Awaiting Extraction Command)**
    *   This state is shown immediately after transcription is complete.
    *   **Waveform Player:** A visual waveform of the full audio.
    *   **Playback Controls:** Explicit **"Play" and "Stop" buttons** that control audio playback of the waveform. The "Play" button should toggle to a "Pause" state during playback.
    *   **Interactive Transcript Display:** An interactive transcript implementing all requirements from Section 2.1, where each word can be clicked to seek audio playback, with real-time highlighting during playback.
    *   **Pause Threshold Configuration:** An editable input field allowing users to adjust the big pause threshold (default 500ms, range 100-2000ms) for structural number detection.
    *   **Action Button:** A prominent button labeled **"Extract Segments"**. The download components are hidden at this stage.
*   **State 4: Extracted Results (Extraction Complete)**
    *   This state is shown after the user clicks the "Extract Segments" button.
    *   The UI from State 3 remains, but with additional components:
    *   **Interactive Transcript:** All Section 2.1 features continue to function (click-to-seek, real-time highlighting, auto-scroll)
    *   **Segment Markers:** Visual indicators showing extraction boundaries for each detected segment. All segment markers must use consistent, clearly visible styling with fixed color and opacity to ensure equal visibility regardless of detection order.
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
    *   Initialize the Whisper.cpp WASM transcriber:
        ```javascript
        // Initialize Whisper.cpp WASM
        console.log('Initializing Whisper.cpp WASM with ggml-small model');
        const whisperInstance = await Module.init({
            model: 'https://huggingface.co/ggerganov/whisper.cpp/resolve/main/ggml-small.bin'
        });
        ```
    *   **Memory-Efficient Audio Processing (For Transcription Only):**
        *   **CRITICAL:** Process transcription audio from the extracted `originalBuffer` obtained via `wavesurfer.getDecodedData()`
        *   **Implementation Strategy:**
            ```javascript
            // Whisper.cpp WASM expects 16kHz mono PCM data
            const transcriptionContext = new AudioContext({sampleRate: 16000});

            // Resample original buffer to 16kHz for transcription
            const transcriptionBuffer = await resampleBuffer(originalBuffer, 16000);

            // Convert to mono Float32Array for Whisper.cpp
            const monoFloat32 = convertToMonoFloat32(transcriptionBuffer);
            ```
        *   Process transcription audio in 30-second chunks with streaming approach
        *   **Memory Management:** Original buffer remains in WaveSurfer, transcription buffers are cleared after each chunk
        *   **Timestamp Synchronization:** Account for sample rate differences when mapping word timestamps back to original audio
    *   **🔥 MANDATORY: Audio Data Format Conversion:** Before passing audio data to Whisper.cpp WASM, the AudioBuffer MUST be converted to Float32Array format. Whisper.cpp expects 16kHz mono Float32Array input.

        **IMPLEMENTATION REQUIREMENT:** This conversion function MUST be implemented exactly as shown:
        ```javascript
        // REQUIRED: Convert AudioBuffer to Float32Array for Whisper.cpp
        function audioBufferToFloat32Array(audioBuffer) {
            // For mono audio, extract the first channel
            if (audioBuffer.numberOfChannels === 1) {
                return audioBuffer.getChannelData(0);
            }

            // For stereo/multi-channel, average all channels to mono
            const firstChannel = audioBuffer.getChannelData(0);
            const audioData = new Float32Array(firstChannel.length);

            for (let i = 0; i < firstChannel.length; i++) {
                let sum = 0;
                for (let channel = 0; channel < audioBuffer.numberOfChannels; channel++) {
                    sum += audioBuffer.getChannelData(channel)[i];
                }
                audioData[i] = sum / audioBuffer.numberOfChannels;
            }

            return audioData;
        }

        // MANDATORY: Usage before transcription with defensive check
        const audioData = audioBufferToFloat32Array(chunkBuffer);
        if (!(audioData instanceof Float32Array)) {
            throw new Error('Audio data must be Float32Array for transcription');
        }
        const result = await whisperInstance.transcribe(audioData, { maxLen: 1 });
        ```
    *   **CRITICAL - Accuracy Settings:** Invoke Whisper.cpp with: `language: 'en'`, `translate: false`, `maxLen: 1`, `maxSegmentLength: 30`. Use 30-second chunk streaming processing for all files.
    *   **CRITICAL - Word-Level Timestamp Handling:** The transcription process must be configured to return detailed timestamp data for each transcribed word. The `maxLen: 1` parameter creates granular segments (~1 word each) that provide word-level timing data with start/end timestamp pairs.
    *   **CRITICAL - Progressive Transcription:** Use progress callbacks to:
        1.  Update the UI progress indicator in real-time
        2.  Append word-level transcription data to a global `wordTimestamps` array
        3.  Display partial transcription text as it becomes available
        4.  Show chunked processing progress (e.g., "Processing chunk 3 of 12...") with 30-second streaming chunks
    *   **Memory Management:** Maximum working memory per chunk: 600MB, Maximum peak memory usage: 1GB
        *   **Note:** Original buffer remains in WaveSurfer's memory (~200-400MB for 80MB file), transcription processing uses additional ~200-400MB per chunk, cleared after processing
    *   Transition to **State 3** showing the complete waveform and transcription.

*   **Segment Extraction (Second Stage - Triggered by Button Click):**
    *   **CRITICAL - Robust Extraction Logic:** Before attempting to find and extract segments, the code must validate that the `wordTimestamps` variable is a non-empty array. If the model fails to return this word-level data (resulting in undefined or an empty array), the application must not crash. Instead, it should disable the "Extract Segments" button and display a clear, user-friendly error message explaining that the necessary word-level timestamp data could not be generated, and that extraction is therefore not possible.
    *   **User Configuration Interface:** Add an editable input field for pause threshold configuration:
        ```html
        <div class="pause-config">
            <label for="pause-threshold">
                Big Pause Threshold:
                <input type="number"
                       id="pause-threshold"
                       value="500"
                       min="100"
                       max="2000"
                       step="50"> ms
            </label>
        </div>
        ```
    *   When the user clicks "Extract Segments":
    *   **Audio Extraction Algorithm:** The application supports two distinct audio structures with automatic detection:

    **Structure Type 1: Number-Based Segmentation**
        *   **Input Structure:** `<intro> <small-pause> <phrase0> <pause> <One> <pause> <phrase1> <pause> <Two> <pause> <phrase2> <pause> <Three> <pause> <phrase3>`
        *   **Output Mapping:** phrase1 → 1.mp3, phrase2 → 2.mp3, phrase3 → 3.mp3
        *   **Detection Method:** Identifies spoken numbers (1, 2, 3... or one, two, three...) followed by phrases
        *   **Segments contain only the phrases after numbers, not the numbers themselves**

    **Structure Type 2: Pause-Based Segmentation**
        *   **Input Structure:** `<intro> <pause> <phrase1> <pause> <phrase2> <pause> <phrase3>`
        *   **Output Mapping:** phrase1 → 1.mp3, phrase2 → 2.mp3, phrase3 → 3.mp3
        *   **Detection Method:** Identifies significant pauses to determine segment boundaries
        *   **Segments contain phrases separated by natural pauses in speech**

    **Automatic Mode Detection:**
        *   The algorithm analyzes the transcription to determine which structure type is present
        *   Falls back to pause-based segmentation when insufficient sequential numbers are detected
        *   Provides clear feedback about which detection mode was used
    *   **Multi-Phase Algorithm:**
        *   **Phase 1 - Adaptive Threshold Calculation:**
            *   Analyze pause patterns around all numbers in the transcription
            *   Calculate optimal threshold as 75% of the longest pause duration
            *   Apply reasonable bounds (100ms - 3000ms) to prevent extreme values
        *   **Phase 2 - Structural Number Detection:**
            *   Identify sequential numbers (1, 2, 3... or one, two, three...) with pauses exceeding the adaptive threshold
            *   Extract phrases between the end of each structural number and start of the next structural number
            *   Validate phrase segments have minimum duration (500ms) and maximum duration (60 seconds)
        *   **Phase 3 - Fallback Sequential Detection:**
            *   If insufficient structural numbers found (< 2), detect any sequential numbers regardless of pause duration
            *   Create segments containing content between consecutive numbers
            *   Handle various audio patterns and speaking styles
    *   **Number Recognition (1-99 range):**
        *   **Number Words:** `['one', 'two', 'three', ..., 'twenty', 'twenty-one', ..., 'ninety-nine']`
        *   **Digits:** `['1', '2', '3', ..., '99']`
        *   **Ordinals:** `['1st', '2nd', '3rd', 'first', 'second', 'third']`
        *   **Transcription Error Handling:** Common errors like "to"→"two", "for"→"four", "ate"→"eight"
        *   **Mixed Format Support:** Handle sequences with mixed formats (e.g., "one", "2", "three", "4")
    *   **Audio Segment Extraction and Encoding (Using Original Audio):**
        *   **Segment Definition:** Audio segments contain phrases after structural numbers. `1.mp3` contains audio from end-time of "one" to start-time of "two" (the phrase following "one"), `2.mp3` contains audio from end-time of "two" to start-time of "three" (the phrase following "two"), and so on.
        *   **Audio Source:** Use the original `AudioBuffer` extracted from WaveSurfer via `wavesurfer.getDecodedData()` for all segment creation
        *   **Timestamp Mapping:** Convert word timestamps from 16kHz transcription back to original sample rate before slicing:
            ```javascript
            const originalSampleRate = originalBuffer.sampleRate;
            const scaleFactor = originalSampleRate / 16000;
            const adjustedTimestamp = transcriptionTimestamp * scaleFactor;
            ```
        *   For each segment, create an `AudioBuffer` by slicing the original `AudioBuffer` at the adjusted timestamps and encode it to MP3 using `lamejs`.
        *   **Quality Preservation Settings:**
            *   **Detect original audio characteristics:** sample rate, channel count, and estimated quality
            *   **Dynamic MP3 bitrate:** For lossy sources (MP3, AAC, OGG), use original bitrate when available, fallback to file size estimation (capped at 320kbps maximum). For lossless sources (WAV, FLAC), use 128kbps bitrate.
            *   **Preserve channel configuration:** mono sources → mono MP3, stereo sources → stereo MP3
            *   **Maintain sample rate:** Use original sample rate for MP3 encoding (don't downsample to 44.1kHz)
        *   **Memory-Efficient Encoding:** Process segments one at a time, encoding each segment to MP3 immediately and clearing intermediate buffers to prevent memory buildup.
    *   **UI Update & Download Generation:**
        *   **Use WaveSurfer.js v7+ Regions Plugin API.** Complete region management workflow:
            ```javascript
            // Clear existing regions before adding ones
            regions.clearRegions();

            // Add segment markers as regions (ONLY after 'ready' event)
            wavesurfer.on('ready', () => {
                segmentBoundaries.forEach((timestamp, index) => {
                    regions.addRegion({
                        start: timestamp,
                        end: timestamp + 0.1, // 0.1 second marker width
                        color: 'rgba(255, 0, 0, 0.3)',
                        drag: false,          // Prevent user dragging
                        resize: false,        // Prevent user resizing
                        content: `Segment ${index + 1}`, // Optional label
                        id: `segment-${index + 1}`       // Unique identifier
                    });
                });
            });
            ```
        *   Create blob URLs for individual MP3 downloads using lamejs encoding.
        *   Use JSZip to bundle all segments: `const zip = JSZip(); zip.file('1.mp3', mp3Blob1); const zipBlob = await zip.generateAsync({type: 'blob'})`.
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

### **7.1. Robust Timestamp Handling Requirements**

**🔥 CRITICAL: Timestamp Validation & Sanitization**

The system MUST validate all timestamps from transcription models and automatically correct invalid ranges where start >= end. This prevents runtime crashes during audio segmentation.

**Functional Requirements:**

1. **Timestamp Validation During Generation**: Validate timestamps as they are created during transcription processing:
   ```javascript
   // REQUIRED: Validate timestamp before adding to wordTimestamps array
   if (adjustedEnd > adjustedStart) {
       wordTimestamps.push({
           text: chunk.text.trim(),
           start: adjustedStart,
           end: adjustedEnd
       });
   } else if (adjustedStart === adjustedEnd) {
       // Handle zero-duration words by adding minimal duration
       wordTimestamps.push({
           text: chunk.text.trim(),
           start: adjustedStart,
           end: adjustedStart + 0.001 // 1ms minimum duration
       });
   } else {
       // Skip invalid timestamps where start > end
       console.warn(`Skipping invalid timestamp: ${chunk.text} [${adjustedStart}, ${adjustedEnd}]`);
   }
   ```

2. **Validation Function**: The AudioSegmentExtractor validateInput method MUST correct invalid timestamps and handle errors:
   ```javascript
   validateInput(words) {
       if (!Array.isArray(words) || words.length === 0) {
           throw new Error('Invalid transcription data: must be non-empty array');
       }

       const validWords = words.filter((word, index) => {
           // Normalize timestamp format
           if (word.timestamp && Array.isArray(word.timestamp)) {
               word.start = word.timestamp[0];
               word.end = word.timestamp[1];
           }

           if (word.start >= word.end) {
               console.warn(`Correcting invalid timestamp at index ${index}: ${word.text} [${word.start}, ${word.end}]`);
               if (word.start === word.end) {
                   word.end = word.start + 0.001; // Add 1ms duration
                   return true; // Keep corrected word
               } else {
                   // Remove words with severely invalid timestamps
                   console.warn(`Removing word with invalid timestamp: ${word.text}`);
                   return false; // Filter out this word
               }
           }
           return true; // Keep valid words
       });

       return validWords;
   }
   ```

3. **Edge Case Handling**: The system MUST gracefully handle transcription edge cases including:
   - Zero-duration words (start == end) → Add 1ms minimum duration
   - Negative duration words (start > end) → Remove from processing
   - Overlapping speech segments → Log warnings but continue processing
   - Model artifacts and precision errors → Apply defensive validation

4. **Fallback Mechanisms**: When automatic timestamp correction fails, the system MUST:
   - Provide meaningful error messages to users
   - Continue processing with remaining valid words
   - Log detailed information for debugging

5. **Quality Assurance**: The system MUST include comprehensive validation for:
   - Timestamp chronological ordering within segments
   - Minimum segment duration thresholds (1ms minimum)
   - Audio duration boundary checks
   - Word count validation after filtering

6. **Error Recovery**: Failed timestamp validation MUST NOT crash the application but instead:
   - Log specific validation issues with word details
   - Filter out problematic words automatically
   - Provide actionable feedback if too many words are filtered
   - Continue segmentation with remaining valid words

**Required Error Handling:**
*   **🔥 MANDATORY: Initialization Phase Library Verification:**
    *   **CRITICAL:** During `initializeApp()`, verify ALL CDN libraries are loaded BEFORE initializing any other components
    *   **Step 1:** Check `typeof lamejs !== 'undefined'` and `typeof JSZip !== 'undefined'` at the very start of initialization
    *   **Step 2:** Check for different global names: `window.lamejs || window.LAME || window.lame` for lamejs library
    *   **Step 3:** Test lamejs functionality: `lamejs.Mp3Encoder(1, 16000, 128)` to ensure it's working
    *   **Step 4:** Fail fast with clear error messages if any required library is missing: "lamejs library not loaded. Please check CDN connection."
    *   **Step 5:** Log successful library verification: `console.log('All CDN libraries verified successfully')`
    *   **IMPLEMENTATION REQUIREMENT:** This verification MUST complete successfully before any AI model initialization
*   **Audio Data Format Errors:**
    *   **CRITICAL:** Handle "e.subarray is not a function" error by ensuring all audio data passed to the transcriber is converted to Float32Array format
    *   Implement defensive checks to verify audio data type before transcription: `if (!(audioData instanceof Float32Array)) { throw new Error('Audio data must be Float32Array for transcription'); }`
    *   Provide clear error message if AudioBuffer is passed directly to transcriber without conversion
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
    *   Handle transcription errors (e.g., "to"→"two", "for"→"four")
    *   **🔥 CRITICAL: Handle punctuation in transcribed words** - Strip punctuation before number detection (e.g., "Three.", "Four.", "Five." → "three", "four", "five"). The transcription model often adds punctuation to spoken numbers, which must be removed in both `isNumber()` and `parseNumber()` functions using `text.replace(/[^\w]/g, '')` before processing.
    *   Provide fallback message when no sequential numbers are detected (minimum 2 consecutive numbers required)
    *   Handle partial number sequences up to 99 (e.g., sequence from "one" to "fifty-seven")
*   **Library Loading & CDN Issues:**
    *   **CRITICAL:** Verify all CDN libraries are loaded before use with defensive checks: `if (typeof lamejs === 'undefined')`, `if (typeof JSZip === 'undefined')`
    *   Handle cases where CDN libraries fail to load or expose different global names
    *   Provide clear error messages when required libraries are missing: "MP3 encoding unavailable - lamejs library not loaded"
    *   **Multiple Global Name Support:** Check different global names for libraries that may expose various object names (e.g., `window.lamejs || window.LAME || window.lame`)
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
        *   Always call `regions.clearRegions()` before adding regions
        *   Only call `regions.addRegion()` after 'ready' event is fired
        *   Use proper cleanup with `regions.destroy()` when switching files
        *   Handle cases where regions plugin fails to initialize

**7.5. Robust Progress Indicator Handling**

**Context:** The application relies on progress callbacks from Whisper.cpp WASM to provide real-time feedback during model loading and transcription. The callback is straightforward and passes a simple numeric percentage.

**Problem Statement:** The progress callback sends percentage updates:
*   **Model Loading/Transcription Progress:** Simple numeric value from 0 to 100
*   **Calculation:** `(100*(seek - seek_start))/(seek_end - seek_start)`

The callback is simple but defensive checks are still recommended for robust error handling.

**Functional Requirements:**

*   **Defensive Data Access:** The progress callback handler should validate that the percentage parameter is a valid number.

*   **Type Validation:** Before attempting to perform any number-specific operations (like `Math.round()`) on the percentage, the code should verify that the parameter is of type `number`.

*   **Adaptive UI Updates:** The user-facing status message should display the percentage if it's possible and if it's a convenient and performant way to get this info:
    *   **When percentage is available:** `"Processing audio... 45%"`
    *   **When percentage is not available:** `"Processing audio..."`

*   **Zero-Crash Guarantee:** The implementation must prevent any `TypeError` or unhandled runtime exceptions, regardless of the data passed by the Whisper.cpp WASM library.

**Required Implementation Pattern:**
```javascript
function handleProgressCallback(percentage) {
    let statusText = 'Processing audio...';

    // CRITICAL: Defensive check before using percentage
    if (typeof percentage === 'number' && percentage >= 0 && percentage <= 100) {
        statusText = `Processing audio... ${Math.round(percentage)}%`;
    }

    updateStatus(statusText);
}

// Usage in whisper.cpp WASM initialization
const whisperInstance = await Module.init({
    model: 'https://huggingface.co/ggerganov/whisper.cpp/resolve/main/ggml-small.bin',
    onProgress: handleProgressCallback
});
```

### **8. Testing Requirements**

**🔥 MANDATORY: End-to-End Testing with Playwright**

All implementations MUST be tested with the complete workflow to ensure no regressions. Use the following testing approach:

*   **Test Environment Setup:**
    ```bash
    npm init -y
    npm install playwright
    npx playwright install chromium
    ```

*   **Required Test Coverage:**
    1. **Library Loading Verification:** Confirm all CDN libraries load without 404 errors
    2. **Application Initialization:** Verify lamejs and JSZip are available and functional
    3. **File Upload Processing:** Test with real audio file (MP3 format recommended)
    4. **Audio Transcription:** Confirm word-level timestamps are extracted correctly
    5. **Audio Extraction:** Verify number sequence detection and segment extraction
    6. **MP3 Encoding:** Test that lamejs successfully creates downloadable segments
    7. **Download Functionality:** Confirm individual downloads and ZIP creation work

*   **Success Criteria:**
    - ✅ No "lamejs is not defined" errors
    - ✅ No "e.subarray is not a function" errors
    - ✅ All library verification logs appear: "All CDN libraries verified successfully"
    - ✅ Transcription completes with word count: "Transcription complete: X words processed"
    - ✅ Extraction succeeds: "Found X numbers in sequence" and "Extracted X audio segments"
    - ✅ Download buttons appear for each segment plus ZIP download
    - ✅ **For KidsBox_ActivityBook1_Unit7_Page50_Track_26.mp3**: Should create exactly 6 download buttons (segments 1.mp3 through 6.mp3)
    - ✅ **Punctuation handling verified**: Algorithm correctly processes transcribed words with punctuation like "Three.", "Four.", "Five.", "Six."

*   **Acceptable Warnings (Non-Critical):**
    - ONNX runtime optimization warnings about execution providers
    - "Unable to determine content-length" for model downloads
    - 404 errors for non-essential resources (favicon, etc.)

*   **Test File Requirements:**
    - Audio file should contain spoken numbers in sequence (e.g., "one, two, three, four, five, six")
    - Duration: 60-120 seconds for reasonable test time
    - Format: MP3 or WAV with clear speech
    - **Reference file**: `eval/KidsBox_ActivityBook1_Unit7_Page50_Track_26.mp3` contains spoken numbers "1, 2, 3, 4, 5, 6" and should extract 6 audio segments

### **9. Implementation Structure**

**HTML Structure:**
```html
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Audio Transcription & Segmentation Tool</title>

    <!-- Load all libraries via CDN (available globally) -->
    <script src="https://cdnjs.cloudflare.com/ajax/libs/jszip/3.10.1/jszip.min.js"></script>
    <script src="https://cdn.jsdelivr.net/npm/lamejs@1.2.0/lame.all.js"></script>
    <script src="https://cdn.jsdelivr.net/npm/whisper.cpp@1.0.3/whisper.js"></script>
    <script src="https://unpkg.com/wavesurfer.js@7/dist/wavesurfer.min.js"></script>
    <script src="https://unpkg.com/wavesurfer.js@7/dist/plugins/regions.min.js"></script>
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

    <script>
        // All libraries are now available globally
        // Global libraries (JSZip, lamejs, WhisperCpp, WaveSurfer) are available

        let whisperInstance, wavesurfer, regions;

        // Simple error handling function
        function showError(message) {
            console.error('Audio App Error:', message);
            const errorDiv = document.getElementById('error-display');
            errorDiv.innerHTML = `<div class="error-message">${message}</div>`;
            errorDiv.style.display = 'block';
        }

        async function initializeApp() {
            try {
                // 🔥 MANDATORY: CDN Library Verification Phase
                // This MUST be the first step in initialization to prevent runtime errors

                // Check lamejs library availability
                if (typeof lamejs === 'undefined') {
                    const lameLib = window.lamejs || window.LAME || window.lame;
                    if (!lameLib || !lameLib.Mp3Encoder) {
                        throw new Error('lamejs library not loaded. Please check CDN connection and ensure lame.all.js is accessible.');
                    }
                    // Assign to global lamejs if found under different name
                    window.lamejs = lameLib;
                }

                // Check JSZip library availability
                if (typeof JSZip === 'undefined') {
                    throw new Error('JSZip library not loaded. Please check CDN connection.');
                }

                // Check Whisper.cpp WASM availability
                if (typeof Module === 'undefined') {
                    throw new Error('Whisper.cpp WASM library not loaded. Please check CDN connection.');
                }

                // Check WaveSurfer availability
                if (typeof WaveSurfer === 'undefined') {
                    throw new Error('WaveSurfer library not loaded. Please check CDN connection.');
                }

                // REQUIRED: Log successful verification
                console.log('All CDN libraries verified successfully');

                // 🔥 MANDATORY: Test lamejs functionality before proceeding
                try {
                    const testEncoder = new lamejs.Mp3Encoder(1, 16000, 128);
                    if (!testEncoder || typeof testEncoder.encodeBuffer !== 'function') {
                        throw new Error('lamejs Mp3Encoder not functional');
                    }
                } catch (error) {
                    throw new Error(`lamejs library test failed: ${error.message}`);
                }

                console.log('lamejs Mp3Encoder functionality verified');

                // Initialize Whisper.cpp WASM instance
                whisperInstance = await Module.init({
                    model: 'https://huggingface.co/ggerganov/whisper.cpp/resolve/main/ggml-small.bin',
                    onProgress: (progress) => {
                        if (typeof progress === 'number' && progress >= 0 && progress <= 100) {
                            console.log(`Loading model... ${Math.round(progress)}%`);
                        }
                    }
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
                regions = wavesurfer.registerPlugin(WaveSurfer.Regions.create({
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

**Key Features:**
- **Script Loading** - CDN for all libraries loaded as globals
- **Verified library versions** with specific version numbers for stability
- **API Usage** - WaveSurfer Regions plugin, Whisper.cpp WASM transcription
- **Comprehensive error handling** structure for robust initialization and processing
- **Memory-optimized processing** - chunked processing, progressive cleanup, 1GB memory management
- **Performance optimizations** - WASM acceleration, Web Audio API resampling