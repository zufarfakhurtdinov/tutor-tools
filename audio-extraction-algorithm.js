/**
 * Audio Extraction Algorithm
 *
 * Extracts phrases that follow each number, implementing
 * multi-tier detection with configurable pause thresholds.
 *
 * Input Structure: <intro> <small-pause> <phrase0> <pause> <One> <pause> <phrase1> <pause> <Two> <pause> <phrase2> <pause> <Three> <pause> <phrase3>
 * Output Mapping: phrase1 → 1.mp3, phrase2 → 2.mp3, phrase3 → 3.mp3
 *
 * Segments contain only the phrases after numbers, not the numbers themselves.
 * Example: "One" at 6.0-6.3s followed by phrase "This is first" at 7.5-8.6s → 1.mp3 contains 7.5-10.0s
 */

class AudioSegmentExtractor {
    constructor(transcriptionWords, options = {}) {
        this.words = this.validateInput(transcriptionWords);
        this.config = {
            pauseThreshold: options.pauseThreshold || 500, // 500ms default (configurable 100-2000ms)
            minSegmentDuration: options.minSegmentDuration || 500, // 500ms minimum
            maxSegmentDuration: options.maxSegmentDuration || 60000, // 60s maximum
            preferLaterOccurrences: options.preferLater !== false,
            debugMode: options.debug || false
        };
        this.debugLog('Initialized with config:', this.config);
    }

    /**
     * Main extraction method with adaptive threshold and multi-tier detection
     * @returns {Array} Array of extraction instructions with segments
     */
    extractAudioSegments() {
        try {
            // Phase 1: Adaptive Threshold Calculation
            const adaptiveThreshold = this.calculateAdaptiveThreshold();
            this.debugLog(`Calculated adaptive threshold: ${adaptiveThreshold.toFixed(0)}ms`);

            // Update config with calculated threshold
            const originalThreshold = this.config.pauseThreshold;
            this.config.pauseThreshold = adaptiveThreshold;

            // Phase 2: Structural Number Detection (with adaptive threshold)
            let structuralNumbers = this.findStructuralNumbers();
            this.debugLog(`Found ${structuralNumbers.length} structural numbers with adaptive threshold`);

            // Phase 3: Fallback Algorithm - Sequential Number Detection
            if (structuralNumbers.length < 2) {
                this.debugLog('Insufficient structural numbers, using fallback detection');
                structuralNumbers = this.findSequentialNumbers();
            }

            if (structuralNumbers.length === 0) {
                throw new Error('No sequential numbers found in transcription');
            }

            // Phase 4: Segment Creation
            const segments = this.createExtractionSegments(structuralNumbers);
            this.validateSegments(segments);

            // Restore original threshold in config
            this.config.pauseThreshold = originalThreshold;

            return segments;
        } catch (error) {
            this.debugLog('Extraction failed:', error.message);
            throw error;
        }
    }

    /**
     * Primary Algorithm: Find structural numbers with significant pauses
     * @returns {Array} Array of structural number candidates
     */
    findStructuralNumbers() {
        const candidates = [];
        const pauseThresholdSeconds = this.config.pauseThreshold / 1000;

        this.words.forEach((word, index) => {
            if (this.isNumber(word.text)) {
                const pauseAnalysis = this.analyzePauses(index);

                // Check if this number has significant pauses (structural)
                if (pauseAnalysis.afterNumber >= pauseThresholdSeconds) {
                    candidates.push({
                        numberValue: this.parseNumber(word.text),
                        numberText: word.text,
                        wordIndex: index,
                        numberWordTiming: {
                            start: word.timestamp[0],
                            end: word.timestamp[1]
                        },
                        pauseAnalysis: pauseAnalysis,
                        isStructural: true
                    });
                }
            }
        });

        return this.selectSequentialNumbers(candidates);
    }

    /**
     * Fallback Algorithm: Find any sequential numbers regardless of pause
     * @returns {Array} Array of sequential number candidates
     */
    findSequentialNumbers() {
        const allNumbers = [];

        this.words.forEach((word, index) => {
            if (this.isNumber(word.text)) {
                const pauseAnalysis = this.analyzePauses(index);

                allNumbers.push({
                    numberValue: this.parseNumber(word.text),
                    numberText: word.text,
                    wordIndex: index,
                    numberWordTiming: {
                        start: word.timestamp[0],
                        end: word.timestamp[1]
                    },
                    pauseAnalysis: pauseAnalysis,
                    isStructural: false
                });
            }
        });

        return this.selectSequentialNumbers(allNumbers);
    }

    /**
     * Select sequential numbers and resolve conflicts
     * @param {Array} candidates - All number candidates
     * @returns {Array} Sequential numbers in order
     */
    selectSequentialNumbers(candidates) {
        // Group by number value
        const groupedByNumber = {};
        candidates.forEach(candidate => {
            const num = candidate.numberValue;
            if (!groupedByNumber[num]) {
                groupedByNumber[num] = [];
            }
            groupedByNumber[num].push(candidate);
        });

        // Select best candidate for each number (prefer structural, then later position)
        const selectedNumbers = {};
        Object.keys(groupedByNumber).forEach(number => {
            const candidatesForNumber = groupedByNumber[number];

            candidatesForNumber.sort((a, b) => {
                // Prefer structural numbers
                if (a.isStructural !== b.isStructural) {
                    return b.isStructural - a.isStructural;
                }
                // Then prefer longer pauses
                const pauseDiff = Math.abs(a.pauseAnalysis.totalDuration - b.pauseAnalysis.totalDuration);
                if (pauseDiff > 0.1) { // 100ms threshold
                    return b.pauseAnalysis.totalDuration - a.pauseAnalysis.totalDuration;
                }
                // Finally prefer later occurrence (end-bias)
                return b.wordIndex - a.wordIndex;
            });

            selectedNumbers[number] = candidatesForNumber[0];
        });

        // Return sequential numbers (1, 2, 3, ...) in order
        const sequential = [];
        for (let i = 1; i <= 99; i++) {
            if (selectedNumbers[i]) {
                sequential.push(selectedNumbers[i]);
            } else {
                break; // Stop at first missing number
            }
        }

        this.debugLog(`Selected ${sequential.length} sequential numbers:`, sequential.map(n => n.numberValue));
        return sequential;
    }

    /**
     * Create extraction segments from selected numbers
     * @param {Array} sequentialNumbers - Sequential numbers in order
     * @returns {Array} Array of segment extraction instructions
     */
    createExtractionSegments(sequentialNumbers) {
        const segments = [];

        sequentialNumbers.forEach((numberData, index) => {
            // Extract phrase after the number, not including the number
            const phraseStart = numberData.numberWordTiming.end + numberData.pauseAnalysis.afterNumber;

            // Find phrase end (start of next number or end of audio)
            let phraseEnd;
            if (index < sequentialNumbers.length - 1) {
                const nextNumber = sequentialNumbers[index + 1];
                phraseEnd = nextNumber.numberWordTiming.start - nextNumber.pauseAnalysis.beforeNumber;
            } else {
                // Last segment - use end of audio
                phraseEnd = this.words[this.words.length - 1].timestamp[1];
            }

            const duration = phraseEnd - phraseStart;

            segments.push({
                numberValue: numberData.numberValue,
                outputFile: `${numberData.numberValue}.mp3`,
                segmentBoundaries: {
                    start: phraseStart,
                    end: phraseEnd,
                    duration: duration
                },
                sourceNumber: {
                    text: numberData.numberText,
                    wordIndex: numberData.wordIndex,
                    timing: numberData.numberWordTiming,
                    pauses: numberData.pauseAnalysis,
                    isStructural: numberData.isStructural
                }
            });
        });

        return segments;
    }

    /**
     * Analyze pauses around a word with clear naming
     * @param {number} index - Word index
     * @returns {Object} Pause analysis object
     */
    analyzePauses(index) {
        const beforeNumber = this.calculatePauseBefore(index);
        const afterNumber = this.calculatePauseAfter(index);

        return {
            beforeNumber: beforeNumber,
            afterNumber: afterNumber,
            totalDuration: beforeNumber + afterNumber
        };
    }

    /**
     * Calculate pause duration before a word
     * @param {number} index - Word index
     * @returns {number} Pause duration in seconds
     */
    calculatePauseBefore(index) {
        if (index === 0) return 0;

        const currentStart = this.words[index].timestamp[0];
        const previousEnd = this.words[index - 1].timestamp[1];
        return Math.max(0, currentStart - previousEnd);
    }

    /**
     * Calculate pause duration after a word
     * @param {number} index - Word index
     * @returns {number} Pause duration in seconds
     */
    calculatePauseAfter(index) {
        if (index >= this.words.length - 1) return 0;

        const currentEnd = this.words[index].timestamp[1];
        const nextStart = this.words[index + 1].timestamp[0];
        return Math.max(0, nextStart - currentEnd);
    }

    /**
     * Validate input transcription data
     * @param {Array} words - Transcription words array
     * @returns {Array} Validated words array
     */
    validateInput(words) {
        if (!Array.isArray(words) || words.length === 0) {
            throw new Error('Invalid transcription data: must be non-empty array');
        }

        words.forEach((word, index) => {
            if (!word.text || !word.timestamp || !Array.isArray(word.timestamp) || word.timestamp.length !== 2) {
                throw new Error(`Invalid word data at index ${index}: missing text or timestamp`);
            }
            if (word.timestamp[0] >= word.timestamp[1]) {
                throw new Error(`Invalid timestamp at index ${index}: start >= end`);
            }
        });

        return words;
    }

    /**
     * Validate generated segments
     * @param {Array} segments - Generated segments
     */
    validateSegments(segments) {
        segments.forEach(segment => {
            const duration = segment.segmentBoundaries.duration;

            if (duration < this.config.minSegmentDuration / 1000) {
                this.debugLog(`Warning: Segment ${segment.numberValue} too short: ${duration.toFixed(2)}s`);
            }

            if (duration > this.config.maxSegmentDuration / 1000) {
                this.debugLog(`Warning: Segment ${segment.numberValue} too long: ${duration.toFixed(2)}s`);
            }
        });
    }

    /**
     * Calculate adaptive threshold based on pause patterns around numbers
     * @returns {number} Calculated threshold in milliseconds
     */
    calculateAdaptiveThreshold() {
        this.debugLog('=== Adaptive Threshold Calculation Phase ===');

        // Find all numbers in transcription with their pause data
        const numberPauseData = this.analyzeAllNumberPauses();

        if (numberPauseData.length === 0) {
            this.debugLog('No numbers found for threshold calculation, using default 500ms');
            return 500;
        }

        // Extract all pause durations (before and after each number)
        const allPauses = [];
        numberPauseData.forEach(data => {
            allPauses.push(data.pauseAnalysis.beforeNumber);
            allPauses.push(data.pauseAnalysis.afterNumber);
        });

        // Remove zero pauses and sort
        const nonZeroPauses = allPauses.filter(pause => pause > 0).sort((a, b) => b - a);

        if (nonZeroPauses.length === 0) {
            this.debugLog('No significant pauses found, using default 500ms');
            return 500;
        }

        // Calculate 75% of the longest pause
        const longestPause = nonZeroPauses[0];
        const calculatedThreshold = longestPause * 0.75 * 1000; // Convert to milliseconds

        // Apply reasonable bounds (100ms - 3000ms)
        const boundedThreshold = Math.max(100, Math.min(3000, calculatedThreshold));

        this.debugLog(`Pause analysis:`, {
            numbersFound: numberPauseData.length,
            allPauses: nonZeroPauses.map(p => `${(p * 1000).toFixed(0)}ms`),
            longestPause: `${(longestPause * 1000).toFixed(0)}ms`,
            calculated75Percent: `${calculatedThreshold.toFixed(0)}ms`,
            finalThreshold: `${boundedThreshold.toFixed(0)}ms`
        });

        return boundedThreshold;
    }

    /**
     * Analyze pause patterns around all numbers (independent phase)
     * @returns {Array} Array of number pause data
     */
    analyzeAllNumberPauses() {
        const numberPauseData = [];

        this.words.forEach((word, index) => {
            if (this.isNumber(word.text)) {
                const pauseAnalysis = this.analyzePauses(index);

                numberPauseData.push({
                    numberValue: this.parseNumber(word.text),
                    numberText: word.text,
                    wordIndex: index,
                    numberWordTiming: {
                        start: word.timestamp[0],
                        end: word.timestamp[1]
                    },
                    pauseAnalysis: pauseAnalysis
                });
            }
        });

        return numberPauseData;
    }

    /**
     * Debug logging helper
     * @param {...any} args - Arguments to log
     */
    debugLog(...args) {
        if (this.config.debugMode) {
            console.log('[AudioSegmentExtractor]', ...args);
        }
    }

    /**
     * Check if a word represents a number (supports 1-99 range)
     * @param {string} text - Word text
     * @returns {boolean} True if the word is a number
     */
    isNumber(text) {
        // Check for digit numbers (1-99)
        if (/^\d{1,2}$/.test(text)) {
            const num = parseInt(text);
            return num >= 1 && num <= 99;
        }

        // Check for ordinal numbers
        if (/^\d{1,2}(st|nd|rd|th)$/i.test(text)) {
            const num = parseInt(text);
            return num >= 1 && num <= 99;
        }

        // Check for written numbers and ordinals
        return this.getNumberMap().hasOwnProperty(text.toLowerCase());
    }

    /**
     * Parse number from text (supports 1-99 range)
     * @param {string} text - Word text
     * @returns {number} Numeric value
     */
    parseNumber(text) {
        // Handle digit numbers and ordinals
        const digitMatch = text.match(/^(\d{1,2})(st|nd|rd|th)?$/i);
        if (digitMatch) {
            const num = parseInt(digitMatch[1]);
            return (num >= 1 && num <= 99) ? num : 0;
        }

        // Handle written numbers
        return this.getNumberMap()[text.toLowerCase()] || 0;
    }

    /**
     * Get comprehensive number mapping (1-99)
     * @returns {Object} Number word to value mapping
     */
    getNumberMap() {
        // Cache the number map
        if (!this._numberMap) {
            this._numberMap = {
                // Basic numbers
                'one': 1, 'two': 2, 'three': 3, 'four': 4, 'five': 5,
                'six': 6, 'seven': 7, 'eight': 8, 'nine': 9, 'ten': 10,
                'eleven': 11, 'twelve': 12, 'thirteen': 13, 'fourteen': 14, 'fifteen': 15,
                'sixteen': 16, 'seventeen': 17, 'eighteen': 18, 'nineteen': 19,

                // Tens
                'twenty': 20, 'thirty': 30, 'forty': 40, 'fifty': 50,
                'sixty': 60, 'seventy': 70, 'eighty': 80, 'ninety': 90,

                // Ordinals
                'first': 1, 'second': 2, 'third': 3, 'fourth': 4, 'fifth': 5,
                'sixth': 6, 'seventh': 7, 'eighth': 8, 'ninth': 9, 'tenth': 10,

                // Common transcription errors
                'to': 2, 'too': 2, 'for': 4, 'fore': 4, 'ate': 8
            };

            // Add hyphenated numbers (twenty-one, twenty-two, etc.)
            const tens = ['twenty', 'thirty', 'forty', 'fifty', 'sixty', 'seventy', 'eighty', 'ninety'];
            const ones = ['one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'nine'];

            tens.forEach((ten, tenIndex) => {
                ones.forEach((one, oneIndex) => {
                    const value = (tenIndex + 2) * 10 + (oneIndex + 1);
                    this._numberMap[`${ten}-${one}`] = value;
                    this._numberMap[`${ten} ${one}`] = value; // Space variant
                });
            });
        }

        return this._numberMap;
    }
}

/**
 * Example usage function
 */
function extractAudio(transcriptionWords, options = {}) {
    const extractor = new AudioSegmentExtractor(transcriptionWords, {
        pauseThreshold: options.pauseThreshold || 500, // ms
        debug: options.debug || false,
        ...options
    });

    try {
        const segments = extractor.extractAudioSegments();

        console.log('\n=== Audio Extraction Plan ===');
        console.log(`Found ${segments.length} segments to extract:\n`);

        segments.forEach(segment => {
            const { start, end, duration } = segment.segmentBoundaries;
            const source = segment.sourceNumber;

            console.log(`${segment.outputFile}: ${start.toFixed(2)}s - ${end.toFixed(2)}s (${duration.toFixed(2)}s)`);
            console.log(`  Source: "${source.text}" at word ${source.wordIndex} (${source.isStructural ? 'structural' : 'sequential'})`);
            console.log(`  Number timing: ${source.timing.start.toFixed(2)}s - ${source.timing.end.toFixed(2)}s`);
            console.log(`  Pauses: before=${source.pauses.beforeNumber.toFixed(2)}s, after=${source.pauses.afterNumber.toFixed(2)}s\n`);
        });

        return segments;
    } catch (error) {
        console.error('Extraction failed:', error.message);
        throw error;
    }
}

// Example transcription data structure
const exampleTranscription = [
    { text: "Welcome", timestamp: [0.0, 0.5] },
    { text: "to", timestamp: [0.6, 0.8] },
    { text: "our", timestamp: [0.9, 1.1] },
    { text: "lesson", timestamp: [1.2, 1.6] },
    { text: "number", timestamp: [1.7, 2.0] },
    { text: "one", timestamp: [2.1, 2.3] },    // intro number - should be ignored
    { text: "today", timestamp: [2.4, 2.8] },
    { text: "Hello", timestamp: [4.0, 4.4] },  // phrase0 starts
    { text: "world", timestamp: [4.5, 4.9] },
    { text: "One", timestamp: [6.0, 6.3] },    // target number 1
    { text: "This", timestamp: [7.5, 7.8] },  // phrase1 starts
    { text: "is", timestamp: [7.9, 8.1] },
    { text: "first", timestamp: [8.2, 8.6] },
    { text: "Two", timestamp: [10.0, 10.3] },  // target number 2
    { text: "Second", timestamp: [11.5, 11.9] }, // phrase2 starts
    { text: "example", timestamp: [12.0, 12.5] },
    { text: "Three", timestamp: [14.0, 14.3] }, // target number 3
    { text: "Final", timestamp: [15.5, 15.8] }, // phrase3 starts
    { text: "phrase", timestamp: [15.9, 16.3] }
];

module.exports = {
    AudioSegmentExtractor,
    extractAudio
};