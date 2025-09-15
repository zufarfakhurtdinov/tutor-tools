/**
 * Interactive Transcript Implementation Code
 *
 * EXTRACTED FROM: project_prompt.md, Section 2.1 "Interactive Transcript Requirements"
 * ORIGINAL LOCATION: Lines 72-123 in "Technical Implementation Strategy" subsection
 * EXTRACTION DATE: 2025-09-15
 *
 * This file contains detailed JavaScript implementation code that was originally
 * embedded within the requirements document. It has been extracted to keep the
 * main project prompt focused on high-level requirements rather than specific
 * implementation details.
 *
 * CONTEXT: This code implements bidirectional audio-text alignment for an
 * interactive transcript feature where users can click words to seek audio
 * playback and see real-time highlighting during audio playback.
 */

// Step 1: Word-level timestamp retrieval
const transcriptionResult = await transcriber(audioData, {
    return_timestamps: 'word',  // Critical for word-level granularity
    language: 'english',
    task: 'transcribe'
});

// Step 2: Interactive transcript population
function populateTranscript(wordTimestamps) {
    const transcriptDiv = document.getElementById('transcript');
    transcriptDiv.innerHTML = ''; // Clear existing content

    wordTimestamps.forEach((wordData, index) => {
        const wordSpan = document.createElement('span');
        wordSpan.textContent = wordData.text + ' ';
        wordSpan.dataset.startTime = wordData.timestamp[0];
        wordSpan.dataset.endTime = wordData.timestamp[1];
        wordSpan.dataset.wordIndex = index;
        wordSpan.className = 'transcript-word';
        transcriptDiv.appendChild(wordSpan);
    });
}

// Step 3: Bidirectional event handling
// Click-to-seek functionality
document.getElementById('transcript').addEventListener('click', (event) => {
    if (event.target.classList.contains('transcript-word')) {
        const startTime = parseFloat(event.target.dataset.startTime);
        const duration = wavesurfer.getDuration();
        const seekPosition = startTime / duration;
        wavesurfer.seekTo(seekPosition);
        wavesurfer.play();
    }
});

// Real-time highlighting with auto-scroll
wavesurfer.on('timeupdate', (currentTime) => {
    const activeWord = findActiveWord(currentTime);
    if (activeWord && activeWord !== currentlyHighlightedWord) {
        // Remove previous highlight
        if (currentlyHighlightedWord) {
            currentlyHighlightedWord.classList.remove('highlight');
        }
        // Add new highlight
        activeWord.classList.add('highlight');
        activeWord.scrollIntoView({ behavior: 'smooth', block: 'center' });
        currentlyHighlightedWord = activeWord;
    }
});