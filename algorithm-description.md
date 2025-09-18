# Audio Extraction Algorithm

## Overview

The audio extraction algorithm identifies sequential numbers in transcribed audio and extracts the phrases that follow each number into separate audio files. The algorithm uses adaptive threshold calculation and multi-tier detection to handle various speaking styles and audio patterns.

## Input Structure

```
<intro> <small-pause> <phrase0> <pause> <One> <pause> <phrase1> <pause> <Two> <pause> <phrase2> <pause> <Three> <pause> <phrase3>
```

## Output Mapping

- phrase1 → 1.mp3
- phrase2 → 2.mp3
- phrase3 → 3.mp3

**Key Principle**: Segments contain only the phrases after numbers, not the numbers themselves.

## Algorithm Phases

### Phase 1: Adaptive Threshold Calculation

The algorithm automatically calculates an optimal pause threshold based on the specific audio content:

1. **Analyze All Number Pauses**: Find every number in the transcription and measure pause durations before and after each number
2. **Extract Pause Data**: Collect all pause durations around numbers
3. **Calculate Threshold**: Use 75% of the longest pause as the threshold
4. **Apply Bounds**: Limit threshold to reasonable range (100ms - 3000ms)

**Formula**: `threshold = max(100, min(3000, longestPause * 0.75 * 1000))`

### Phase 2: Structural Number Detection

Identify numbers that have significant pauses, indicating structural separation:

1. **Find Numbers**: Locate all numbers (1-99) in word/digit/ordinal formats
2. **Analyze Pauses**: Calculate pause durations before and after each number
3. **Apply Threshold**: Select numbers with pause durations ≥ adaptive threshold
4. **Resolve Conflicts**: For duplicate numbers, prefer structural over sequential, then longer pauses, then later position

### Phase 3: Fallback Detection

If insufficient structural numbers found (< 2), use fallback approach:

1. **Sequential Detection**: Find any consecutive numbers regardless of pause duration
2. **Conflict Resolution**: Same priority system as structural detection
3. **Sequence Validation**: Ensure numbers form valid sequence (1, 2, 3, ...)

### Phase 4: Segment Creation

Generate extraction boundaries for each sequential number:

1. **Phrase Start**: `numberEndTime + pauseAfterNumber`
2. **Phrase End**: `nextNumberStartTime - pauseBeforeNextNumber` (or end of audio for last segment)
3. **Validation**: Check segment duration against minimum (500ms) and maximum (60s) limits

## Number Recognition

### Supported Formats (1-99 range)

- **Digits**: 1, 2, 3, ..., 99
- **Written**: one, two, three, ..., ninety-nine
- **Ordinals**: 1st, 2nd, 3rd, first, second, third
- **Compound**: twenty-one, thirty-two, forty-five
- **Transcription Errors**: to→2, for→4, ate→8

### Recognition Logic

```javascript
isNumber(text) {
    // Digit numbers (1-99)
    if (/^\d{1,2}$/.test(text)) return true;

    // Ordinal numbers (1st, 2nd, 3rd)
    if (/^\d{1,2}(st|nd|rd|th)$/i.test(text)) return true;

    // Written numbers and variants
    return getNumberMap().hasOwnProperty(text.toLowerCase());
}
```

## Multi-Tier Detection Strategy

### Primary: Structural Detection
- Uses adaptive threshold calculated from audio content
- Identifies numbers with significant surrounding pauses
- Most reliable for well-structured content

### Fallback: Sequential Detection
- Activates when < 2 structural numbers found
- Finds any consecutive numbers regardless of pause duration
- Ensures compatibility with various speaking styles

## Error Handling

### Input Validation
- Verify transcription data format and structure
- Check timestamp validity and ordering
- Handle missing or malformed word data

### Edge Cases
- No numbers found: Clear error message
- Out-of-sequence numbers: Skip and continue
- Repeated numbers: Use conflict resolution
- Short segments: Log warnings but proceed
- Mixed number formats: Handle seamlessly

### Debug Information
- Adaptive threshold calculation details
- Number detection results
- Pause analysis data
- Segment boundary calculations

## Example Walkthrough

**Audio**: "Welcome to lesson one today. Hello world. Two. This is second. Three. Final phrase."

**Step 1 - Threshold Calculation**:
```
Numbers found: one (pauses: 0.1s, 0.2s), Two (pauses: 1.2s, 0.8s), Three (pauses: 1.5s, 0.3s)
All pauses: [1.5, 1.2, 0.8, 0.3, 0.2, 0.1]
Longest: 1.5s → Threshold: 1.5 * 0.75 = 1125ms
```

**Step 2 - Structural Detection**:
```
one: max pause = 0.2s < 1.125s ❌
Two: max pause = 1.2s > 1.125s ✅
Three: max pause = 1.5s > 1.125s ✅
```

**Step 3 - Sequential Selection**:
```
Selected: [one, Two, Three] (fallback includes "one")
```

**Step 4 - Segment Creation**:
```
1.mp3: 2.4s - 4.9s ("today Hello world")
2.mp3: 7.5s - 9.4s ("This is second")
3.mp3: 12.5s - 14.5s ("Final phrase")
```

## Integration Requirements

### Transcription Input Format
```javascript
[
    { text: "word", timestamp: [startTime, endTime] },
    // ... more words
]
```

### Output Format
```javascript
[
    {
        numberValue: 1,
        outputFile: "1.mp3",
        segmentBoundaries: {
            start: 2.4,
            end: 4.9,
            duration: 2.5
        },
        sourceNumber: {
            text: "one",
            wordIndex: 5,
            timing: { start: 2.1, end: 2.3 },
            pauses: { beforeNumber: 0.1, afterNumber: 0.1 },
            isStructural: false
        }
    }
    // ... more segments
]
```

## Configuration Options

```javascript
const extractor = new AudioSegmentExtractor(words, {
    pauseThreshold: 500,        // Manual threshold (overridden by adaptive)
    minSegmentDuration: 500,    // Minimum segment length (ms)
    maxSegmentDuration: 60000,  // Maximum segment length (ms)
    preferLaterOccurrences: true, // Resolve conflicts by position
    debug: false                // Enable debug logging
});
```