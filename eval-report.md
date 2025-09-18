# Audio Processing Evaluation Report

**Test Date:** September 18, 2025
**Test Duration:** 213 seconds (3m 33s)
**Evaluation Script:** eval-workflow-sequential.js

## 📊 Executive Summary

- **Total Files Tested:** 10
- **Success Rate:** 20% (2 passed, 8 failed)
- **Total Segments Extracted:** 33
- **Average Processing Time:** 19 seconds per file
- **Total Processing Time:** 186 seconds
- **Total Wall Clock Time:** 213 seconds

## 📋 Detailed Results by File

| # | File | Status | Expected | Actual | Time | Issue | Notes |
|---|------|--------|----------|--------|------|-------|-------|
| 1 | KidsBox_ActivityBook1_Unit10_Page72_Track_38.mp3 | ❌ FAIL | 6 | 4 | 14s | Segment count mismatch | |
| 2 | KidsBox_ActivityBook1_Unit10_Page73_Track_39.mp3 | ❌ FAIL | 4 | 3 | 19s | Segment count mismatch | |
| 3 | KidsBox_ActivityBook1_Unit11_Page80_Track_41.mp3 | ❌ FAIL | 6 | 2 | 14s | Segment count mismatch | **Marked by pauses** |
| 4 | KidsBox_ActivityBook1_Unit12_Page86_Track_43.mp3 | ❌ FAIL | 4 | 2 | 18s | Segment count mismatch | |
| 5 | KidsBox_ActivityBook1_Unit2_Page12_Track_06.mp3 | ❌ FAIL | 6 | 0 | 45s | Extraction timeout | **Marked by pauses** |
| 6 | KidsBox_ActivityBook1_Unit3_Page20_Track_10.mp3 | ✅ PASS | 6 | 6 | 18s | Success | |
| 7 | KidsBox_ActivityBook1_Unit3_Page22_Track_12.mp3 | ❌ FAIL | 8 | 3 | 12s | Segment count mismatch | |
| 8 | KidsBox_ActivityBook1_Unit5_Page36_Track_19.mp3 | ❌ FAIL | ? | 2 | 13s | Requires clarification | |
| 9 | KidsBox_ActivityBook1_Unit6_Page40_Track_21.mp3 | ❌ FAIL | 6 | 5 | 12s | Segment count mismatch | |
| 10 | KidsBox_ActivityBook1_Unit7_Page50_Track_26.mp3 | ✅ PASS | 6 | 6 | 22s | Success | |

## ⏱️ Performance Analysis

### Time Distribution
- **Fastest Processing:** 12s (Unit3_Track_12, Unit6_Track_21)
- **Slowest Processing:** 45s (Unit2_Track_06 - timeout case)
- **Successful Files Average:** 20s (18s + 22s / 2)
- **Failed Files Range:** 12s - 45s
- **Processing vs Wall Clock:** 186s vs 213s (87% efficiency)

### Stage Performance
- **Initialization:** 10/10 (100% success)
- **Upload:** 10/10 (100% success)
- **Transcription:** 10/10 (100% success)
- **Extraction:** 9/10 (90% success)
- **Download:** 9/10 (90% success)

## 🎯 Segment Extraction Analysis

### Expected vs Actual Segments
- **Total Expected:** 52 segments (estimated)
- **Total Extracted:** 33 segments
- **Extraction Rate:** 63.5%

### Per-File Segment Analysis
- **Perfect Matches:** 2 files (20%)
- **Close Matches (±1):** 1 file (Unit6_Track_21: 5/6)
- **Significant Gaps:** 7 files (multiple segments missing)

## 📝 Test Configuration Notes

### Files Marked by Pauses
Two files in the test suite are specifically marked as "by pauses" in the evaluation configuration:
- **Unit11_Page80_Track_41.mp3** (Line 57 in eval-workflow-sequential.js)
- **Unit2_Page12_Track_06.mp3** (Line 59 in eval-workflow-sequential.js)

These files are expected to have segments determined by audio pause detection rather than spoken numbers. Both files failed in this test run:
- Unit11_Track_41: Expected 6 segments, got 2 (major detection failure)
- Unit2_Track_06: Expected 6 segments, got 0 (complete extraction timeout)

The poor performance on pause-detected files suggests the pause detection algorithm may need significant improvements.

## 🔍 Failure Analysis

### Primary Issues
1. **Segment Count Mismatches (7 files):** Algorithm extracting fewer segments than expected
2. **Extraction Timeouts (1 file):** Unit2_Track_06 fails at extraction stage
3. **Clarification Required (1 file):** Unit5_Track_19 intentionally marked for review

### Error Patterns
- **Console Errors:** 3-5 errors per file, consistent across tests
- **Extraction Stage:** Main bottleneck with 10% failure rate
- **Timeout Threshold:** 30s may be insufficient for complex audio files

## 📈 Comparison with Historical Data

### Previous Documented Performance (CLAUDE.md)
- **Historical Success Rate:** 80% (8/10 passed)
- **Current Success Rate:** 20% (2/10 passed)
- **Performance Degradation:** 60 percentage points decline

### Possible Causes
- Algorithm changes or model updates
- Different test environment conditions
- Audio file complexity variations
- System resource constraints

## 🛠️ Recommendations

### Immediate Actions
1. **Investigate Segment Detection Algorithm:** Review why extraction is missing expected segments
2. **Analyze Unit2_Track_06:** Understand timeout root cause
3. **Review Console Errors:** Address recurring error patterns
4. **Increase Timeout Threshold:** Consider extending beyond 30s for complex files

### Long-term Improvements
1. **Algorithm Tuning:** Improve segment boundary detection accuracy
2. **Error Handling:** Better graceful degradation for problematic files
3. **Performance Monitoring:** Implement automated regression detection
4. **Test Suite Enhancement:** Add more granular segment validation

## 📊 Raw Test Output

```
📊 EVALUATION SUMMARY
====================
Total Tests: 10
Passed: 2
Failed: 8
Success Rate: 20%
Total Test Duration: 186s
Total Wall Clock Time: 213s
Average Test Duration: 19s
Total Segments Found: 33
```

---

*Report generated from eval-workflow-sequential.js run on September 18, 2025*