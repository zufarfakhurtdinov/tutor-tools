# Project Prompt

### **1. Executive Summary**

Create a self-contained, single-page HTML application that allows a user to upload an audio file and transcribes it. The application will first display the full transcription alongside a playable waveform of the original audio. The user can then initiate a second step to split the audio into multiple segments based on spoken English numbers (e.g., "one," "two," "three"). Finally, the user can preview the split points on the waveform and download the individual segments or a ZIP archive containing all of them. All processing must occur client-side.

### **2. Core Technical Requirements**

*   **Single File Delivery:** The entire application's custom code (HTML, CSS, JavaScript) must be contained within a single `index.html` file. Third-party libraries must be included using external `<script>` tags pointing to a reliable CDN. **To guarantee a stable and predictable script execution order and prevent race conditions with the main application module, all third-party library `<script>` tags must include the `defer` attribute.**
*   **Reliable Script Execution:** To prevent race conditions and ensure that all deferred third-party libraries are fully loaded before the main application logic runs, the entire content of the primary `<script type="module">` **must be wrapped within a `DOMContentLoaded` event listener.** This is a critical step to guarantee that library objects (e.g., `WaveSurfer`, `JSZip`) are defined and available when the application code attempts to use them.
*   **Client-Side Only:** No server-side processing or external API calls are allowed. The app must function offline once loaded (assuming the CDN-hosted libraries and models have been cached by the browser).
*   **Recommended Tech Stack:**
    *   **Audio Transcription:** Use **Transformers.js** (by Xenova/Hugging Face) to run a state-of-the-art speech recognition model. **`Xenova/whisper-base`** is recommended for a good balance of accuracy and performance.
    *   **Waveform Visualization:** Use **WaveSurfer.js (v7 or later)**, imported as an ES Module. **Crucially, the Markers Plugin must be explicitly initialized during the `WaveSurfer.create()` call** to ensure its API is available for displaying split points.
    *   **MP3 Encoding:** Use a JavaScript-based MP3 encoder like `lamejs`.
    *   **ZIP Archiving:** Use a library like `JSZip` to create the "download all" archive in the browser.

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
    *   Using an ES Module script, import the `pipeline` function and initialize the transcriber: `transcriber = await pipeline('automatic-speech-recognition', 'Xenova/whisper-base')`.
    *   Extract the mono audio data from the first channel of the stored `AudioBuffer`.
    *   **CRITICAL - Accuracy Settings:** To ensure the highest quality and prevent language detection errors, the transcriber pipeline **must** be invoked with specific parameters: `language: 'english'` and `task: 'transcribe'`.
    *   **CRITICAL - Long Audio & Memory Management:** To reliably handle audio longer than 30 seconds and avoid browser memory issues, the transcriber **must** be called with explicit chunking parameters: `{ chunk_length_s: 30, stride_length_s: 5 }`.
    *   **CRITICAL - Progressive Transcription:** The pipeline call **must** include a `progress_callback` function. As the callback receives updates for each processed chunk, the application must immediately:
        1.  Append the new chunk's text to the text display area.
        2.  Append the new chunk objects to a global `chunks` array.
        3.  Update the UI with the progress percentage.
        This ensures the full text is built in real-time and is not lost. The final object returned by the `transcriber` should only be used as a final confirmation.
    *   Transition the UI to **State 3**, displaying the waveform and the completed transcription.

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
        *   **To ensure correct functionality, use the modern WaveSurfer.js Markers Plugin API.** First, clear any pre-existing markers using **`wavesurfer.markers.clear()`**. Then, for each split point, add a new marker to the instance using **`wavesurfer.markers.add()`**.
        *   Create blob URLs for individual downloads and use JSZip to prepare the "Download All" archive.
        *   Transition the UI to **State 4**.