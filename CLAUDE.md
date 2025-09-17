# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is an audio transcription and segmentation tool built as a single-page HTML application. The main application is contained in `index.html` which processes audio files client-side to transcribe speech and split audio based on spoken numbers.

## Build and Development Commands

**Package Manager**: npm

**Dependencies Installation**:
```bash
npm install
```

**Main Testing Workflow**:
```bash
node test-workflow.js
```

## Testing Framework

**Primary Test**: `test-workflow.js` - Comprehensive end-to-end Playwright test that validates the complete audio processing workflow including:
- Application initialization and library loading
- Audio file upload and transcription
- Audio segmentation and MP3 encoding
- Download functionality and ZIP creation

The test uses a local HTTP server on port 8001 and processes the included `1.mp3` file to verify all components work together correctly.

**Test Requirements**:
- Playwright (automatically installed via package.json)
- Chrome browser (automatically installed by Playwright)
- Local audio file: `1.mp3` (included in repository - contains spoken numbers "1, 2, 3, 4, 5, 6", expected to extract 6 audio segments)

## Architecture Overview

- **Single File Application**: All functionality contained in `index.html`
- **Client-Side Processing**: Uses WebGPU/CPU with Whisper AI model for transcription
- **Libraries**: WaveSurfer.js (audio visualization), Transformers.js (AI), lamejs (MP3 encoding), JSZip (archiving)
- **Audio Processing**: 30-second chunked processing with memory management

## Key Files

- `index.html` - Main application (single-page HTML with embedded JavaScript)
- `test-workflow.js` - End-to-end Playwright testing workflow
- `1.mp3` - Sample audio file for testing
- `project_prompt.md` - Comprehensive technical specification
- `package.json` - Dependencies (mainly Playwright for testing)

## Development Workflow

When making changes to the application:
1. Edit `index.html` directly
2. Run `node test-workflow.js` to verify complete functionality
3. Check console output for any library loading or processing errors
4. Test with different audio files if needed

The test workflow validates the entire pipeline from file upload through final download generation.