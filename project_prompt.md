# Project Prompt

### **1. Executive Summary**

Create a self-contained, single-page HTML application that allows a user to upload an audio file and transcribes it. The application will first display the full transcription alongside a playable waveform of the original audio. The user can then initiate a second step to split the audio into multiple segments based on spoken English numbers (e.g., "one," "two," "three"). Finally, the user can preview the split points on the waveform and download the individual segments or a ZIP archive containing all of them. All processing must occur client-side.

### **2. Core Technical Requirements**

*   **Single File Delivery:** The entire application's custom code (HTML, CSS, JavaScript) must be contained within a single `index.html` file. Use a hybrid approach: load utility libraries (JSZip, lamejs) via CDN `<script>` tags, and import modern libraries (Transformers.js) as ES modules within the main application script.
*   **Reliable Script Execution:** Use ES modules for the main application logic. ES modules naturally wait for dependencies and handle execution order correctly. Utility libraries loaded via script tags will be available globally before the module executes.
*   **Client-Side Only:** No server-side processing or external API calls are allowed. The app must function offline once loaded (assuming the CDN-hosted libraries and models have been cached by the browser).
*   **Required Tech Stack (Latest Versions):**
    *   **Audio Transcription:** Use **@huggingface/transformers v3.7.3** (latest) with `Xenova/whisper-small` model for optimal performance. Import via ES module: `import { pipeline } from 'https://cdn.jsdelivr.net/npm/@huggingface/transformers@3.7.3'`
    *   **Waveform Visualization:** Use **WaveSurfer.js v7.10.1** (latest) with the Regions plugin for split point visualization. Load via UMD: `<script src="https://unpkg.com/wavesurfer.js@7/dist/wavesurfer.umd.min.js"></script>`
    *   **MP3 Encoding:** Use **lamejs v1.2.1** via CDN: `<script src="https://cdnjs.cloudflare.com/ajax/libs/lamejs/1.2.1/lame.all.min.js"></script>`
    *   **ZIP Archiving:** Use **JSZip v3.10.1** via CDN: `<script src="https://cdnjs.cloudflare.com/ajax/libs/jszip/3.10.1/jszip.min.js"></script>`

### **3. User Input**

*   **Primary Input:** A single audio file.
*   **Input Methods:**
    *   A large, clearly marked drag-and-drop area.
    *   **The drag-and-drop area must also function as a clickable button that opens the system's file browser.**
*   **Supported Formats:** The application should reliably handle standard web audio formats like WAV, MP3, OGG, and FLAC.

### **4. Application Output**

*   **Primary Output:** A collection of audio segments.
*   **Output Format:** All generated audio segments should be encoded as MP3 files (defaulting to 128kbps bitrate).
*   **File Naming:** Segments should be sequentially named based on the detected number: `1.mp3`, `2.mp3`, `3.mp3`, etc.
*   **Download Options:**
    *   A list of the generated segments, with an individual download button next to each one.
    *   A primary "Download All as ZIP" button that downloads a single archive named `split_audio.zip`.

### **5. UI and User Experience (UX) Flow**

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
    *   **Transcription Display:** A scrollable text area showing the full transcription.
    *   **Action Button:** A prominent button labeled **"Find & Split Segments"**. The download components are hidden at this stage.
*   **State 4: Segmented Results (Splitting Complete)**
    *   This state is shown after the user clicks the "Find & Split Segments" button.
    *   The UI from State 3 remains, but is now enhanced with:
    *   **Split Markers:** Vertical lines on the waveform at each calculated split point.
    *   **Download Component:** A list of downloadable segments and a "Download All as ZIP" button now become visible.

### **6. Core Algorithm (Detailed Steps)**

*   **File Load & Audio Decoding:**
    *   On file drop/select, use `URL.createObjectURL()` to create a local URL for the file.
    *   Load this URL into WaveSurfer.js to visualize the waveform and retrieve the raw `AudioBuffer`. Store the `AudioBuffer` in a global variable.

*   **Audio Transcription (First Stage):**
    *   Import and initialize the transcriber: `const transcriber = await pipeline('automatic-speech-recognition', 'Xenova/whisper-small', { device: 'webgpu', dtype: 'q4' })` (use WebGPU acceleration if available, with 4-bit quantization for performance).
    *   Extract mono audio data from the `AudioBuffer` first channel and convert to the format expected by Transformers.js.
    *   **CRITICAL - Accuracy Settings:** Invoke the transcriber with: `language: 'english'`, `task: 'transcribe'`, `chunk_length_s: 30`, `stride_length_s: 5`.
    *   **CRITICAL - Progressive Transcription:** Use the `progress_callback` parameter to:
        1.  Update the UI progress indicator in real-time
        2.  Append transcription chunks to a global `chunks` array with timestamps
        3.  Display partial transcription text as it becomes available
    *   Transition to **State 3** showing the complete waveform and transcription.

*   **Segment Splitting (Second Stage - Triggered by Button Click):**
    *   When the user clicks "Find & Split Segments":
    *   **Number Identification:** Default to English and initialize an array of number words (`['one', 'two', 'three', ...]`).
    *   **Splitting Logic:**
        *   Iterate through the globally stored `chunks` array.
        *   For each chunk, check if its `text` (trimmed and lowercased) matches the next expected number in the sequence.
        *   If the correct sequential number is found, store its **end timestamp** as a split point. Increment the number counter.
    *   **Audio Slicing and Encoding:**
        *   Define audio segments by the collected timestamps. The first segment runs from time `0` to the first split point. `1.mp3` will contain audio from `0` to the end-time of "one", `2.mp3` will be from the end-time of "one" to the end-time of "two", and so on.
        *   For each segment, create a new `AudioBuffer` by slicing the original `AudioBuffer` and encode it to MP3 using `lamejs`.
    *   **UI Update & Download Generation:**
        *   **Use WaveSurfer.js v7+ Regions Plugin API (Markers are deprecated).** Initialize regions: `const regions = wavesurfer.registerPlugin(Regions.create())`. Clear existing regions: `regions.clear()`. Add split markers as regions: `regions.addRegion({ start: timestamp, end: timestamp + 0.1, color: 'rgba(255,0,0,0.3)' })`.
        *   Create blob URLs for individual MP3 downloads using lamejs encoding.
        *   Use JSZip to bundle all segments: `const zip = new JSZip(); zip.file('1.mp3', mp3Blob1); const zipBlob = await zip.generateAsync({type: 'blob'})`.
        *   Transition to **State 4** with visible download components.

### **7. Implementation Structure**

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
    <script src="https://cdnjs.cloudflare.com/ajax/libs/lamejs/1.2.1/lame.all.min.js"></script>
    <script src="https://unpkg.com/wavesurfer.js@7/dist/wavesurfer.umd.min.js"></script>
</head>
<body>
    <div id="app">
        <div id="dropzone">Drop audio file here or click to select</div>
        <div id="waveform"></div>
        <div id="transcript"></div>
        <div id="controls"></div>
        <div id="downloads"></div>
    </div>

    <script type="module">
        // Import modern libraries as ES modules
        import { pipeline } from 'https://cdn.jsdelivr.net/npm/@huggingface/transformers@3.7.3';
        import Regions from 'https://unpkg.com/wavesurfer.js@7/dist/plugins/regions.esm.js';

        // Main application logic here
        // Global libraries (JSZip, lamejs, WaveSurfer) are available
        // ES module imports are handled automatically

        let transcriber, wavesurfer, regions;

        async function initializeApp() {
            try {
                // Initialize AI model with performance optimizations
                transcriber = await pipeline('automatic-speech-recognition', 'Xenova/whisper-small', {
                    device: 'webgpu', // Use WebGPU if available
                    dtype: 'q4'       // 4-bit quantization for better performance
                });

                // Initialize WaveSurfer
                wavesurfer = WaveSurfer.create({
                    container: '#waveform',
                    waveColor: '#4A90E2',
                    progressColor: '#1976D2'
                });

                // Initialize Regions plugin
                regions = wavesurfer.registerPlugin(Regions.create());

                console.log('Application initialized successfully');
            } catch (error) {
                console.error('Failed to initialize:', error);
                // Handle initialization errors gracefully
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
- **Latest library versions** with specific version numbers for stability
- **Modern API usage** - Regions instead of deprecated Markers, WebGPU acceleration
- **Proper error handling** structure for robust initialization
- **Performance optimizations** - 4-bit quantization, WebGPU acceleration when available