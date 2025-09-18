# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is an audio transcription and extraction tool built as a single-page HTML application. The main application is contained in `index.html` which processes audio files client-side to transcribe speech and extract segments based on spoken numbers.

## Build and Development Commands

**Package Manager**: npm

**Dependencies Installation**:
```bash
npm install
```

**Main Testing Workflows**:
```bash
# Single file test (original)
node test-workflow.js

# Full evaluation of all audio files
node eval-workflow-sequential.js
```

## Testing Framework

**CRITICAL: EVAL IS ALWAYS RIGHT - IT IS THE SOURCE OF TRUTH**
The evaluation workflow (`eval-workflow-sequential.js`) is the definitive authority on application correctness and performance. Its results must be used as requirements and any changes to the application must satisfy the evaluation criteria.

**Primary Test**: `test-workflow.js` - Comprehensive end-to-end Playwright test that validates the complete audio processing workflow including:
- Application initialization and library loading
- Audio file upload and transcription
- Audio segment extraction and MP3 encoding
- Download functionality and ZIP creation

**Evaluation Workflow**: Comprehensive testing of all audio files in the `eval/` directory:
- `eval-workflow-sequential.js` - Tests all 10 audio files sequentially (reliable and efficient)

**Current Test Results** (from eval-workflow-sequential.js):
- See `eval-report.md` for detailed test results and analysis

**Test Requirements**:
- Playwright (automatically installed via package.json)
- Chrome browser (automatically installed by Playwright)
- Audio files in `eval/` directory (10 KidsBox educational content files included)

## Architecture Overview

- **Single File Application**: All functionality contained in `index.html`
- **Client-Side Processing**: Uses WebGPU/CPU with Whisper AI model for transcription
- **Libraries**: WaveSurfer.js (audio visualization), Transformers.js (AI), lamejs (MP3 encoding), JSZip (archiving)
- **Audio Processing**: 30-second chunked processing with memory management

## Key Files

- `index.html` - Main application (single-page HTML with embedded JavaScript)
- `test-workflow.js` - End-to-end Playwright testing workflow (single file test)
- `eval-workflow-sequential.js` - Sequential evaluation of all audio files
- `eval-report.md` - Detailed evaluation results and performance analysis
- `eval/` - Directory containing 10 test audio files (KidsBox educational content)
- `project_prompt.md` - Comprehensive technical specification
- `package.json` - Dependencies (mainly Playwright for testing)

## Development Workflow

When making changes to the application:
1. Edit `index.html` directly
2. Run `node test-workflow.js` for quick single-file verification
3. Run `node eval-workflow-sequential.js` for comprehensive testing of all audio files
4. Check console output for any library loading or processing errors
5. Review detailed test reports for performance and error analysis

**Testing Strategy**:
- **Development**: Use `test-workflow.js` for rapid iteration
- **Pre-commit**: Use `eval-workflow-sequential.js` for thorough validation
- **CI/CD**: Use `eval-workflow-sequential.js` for reliable automated testing

The evaluation workflow provides comprehensive validation across 10 different audio files, detecting edge cases and ensuring robust performance across various content types. Sequential processing has proven to be the most reliable approach for this audio processing application.