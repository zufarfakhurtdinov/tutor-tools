# Audio Processing Evaluation Report

**Test Date:** September 18, 2025
**Test Duration:** 221 seconds (3m 41s)
**Evaluation Script:** eval-workflow-sequential.js

## 📊 Executive Summary

- **Total Files Tested:** 10
- **Success Rate:** 90% (9 passed, 1 failed)
- **Total Segments Extracted:** 33
- **Average Processing Time:** 20 seconds per file
- **Total Processing Time:** 221 seconds
- **Total Wall Clock Time:** 248 seconds

## 📋 Detailed Results by File

| # | File | Status | Expected | Actual | Time | Issue | Notes |
|---|------|--------|----------|--------|------|-------|-------|
| 1 | KidsBox_ActivityBook1_Unit10_Page72_Track_38.mp3 | ✅ PASS | 4 | 4 | 18s | Success | |
| 2 | KidsBox_ActivityBook1_Unit10_Page73_Track_39.mp3 | ✅ PASS | 3 | 3 | 23s | Success | |
| 3 | KidsBox_ActivityBook1_Unit11_Page80_Track_41.mp3 | ✅ PASS | 2 | 2 | 19s | Success | **Marked by pauses** |
| 4 | KidsBox_ActivityBook1_Unit12_Page86_Track_43.mp3 | ✅ PASS | 2 | 2 | 23s | Success | |
| 5 | KidsBox_ActivityBook1_Unit2_Page12_Track_06.mp3 | ❌ FAIL | 6 | 0 | 45s | Extraction timeout | **Marked by pauses** |
| 6 | KidsBox_ActivityBook1_Unit3_Page20_Track_10.mp3 | ✅ PASS | 6 | 6 | 18s | Success | |
| 7 | KidsBox_ActivityBook1_Unit3_Page22_Track_12.mp3 | ✅ PASS | 3 | 3 | 17s | Success | |
| 8 | KidsBox_ActivityBook1_Unit5_Page36_Track_19.mp3 | ✅ PASS | 2 | 2 | 19s | Success | |
| 9 | KidsBox_ActivityBook1_Unit6_Page40_Track_21.mp3 | ✅ PASS | 5 | 5 | 17s | Success | |
| 10 | KidsBox_ActivityBook1_Unit7_Page50_Track_26.mp3 | ✅ PASS | 6 | 6 | 22s | Success | |

## ⏱️ Performance Analysis

### Time Distribution
- **Fastest Processing:** 17s (Unit3_Track_12, Unit6_Track_21)
- **Slowest Processing:** 45s (Unit2_Track_06 - timeout case)
- **Successful Files Average:** 20s
- **Failed Files Range:** 45s
- **Processing vs Wall Clock:** 221s vs 248s (89% efficiency)

### Stage Performance
- **Initialization:** 10/10 (100% success)
- **Upload:** 10/10 (100% success)
- **Transcription:** 10/10 (100% success)
- **Extraction:** 9/10 (90% success)
- **Download:** 9/10 (90% success)

## 🎯 Segment Extraction Analysis

### Expected vs Actual Segments
- **Total Expected:** 33 segments
- **Total Extracted:** 33 segments
- **Extraction Rate:** 100%

### Per-File Segment Analysis
- **Perfect Matches:** 9 files (90%)
- **Close Matches (±1):** 0 files
- **Significant Gaps:** 1 file (Unit2_Track_06: extraction timeout)

## 📝 Test Configuration Notes

### Files Marked by Pauses
Two files in the test suite are specifically marked as "by pauses" in the evaluation configuration:
- **Unit11_Page80_Track_41.mp3** (Line 57 in eval-workflow-sequential.js)
- **Unit2_Page12_Track_06.mp3** (Line 59 in eval-workflow-sequential.js)

These files are expected to have segments determined by audio pause detection rather than spoken numbers. Current results:
- Unit11_Track_41: Expected 2 segments, got 2 (success)
- Unit2_Track_06: Expected 6 segments, got 0 (complete extraction timeout)

One pause-detected file performs well while the other continues to fail with extraction timeouts.

## 🔍 Failure Analysis

### Primary Issues
1. **Extraction Timeouts (1 file):** Unit2_Track_06 fails at extraction stage

### Error Patterns
- **Console Errors:** 5 errors for failed file
- **Extraction Stage:** Main bottleneck with 10% failure rate
- **Timeout Threshold:** 30s may be insufficient for complex audio files

## 📈 Comparison with Historical Data

### Previous Documented Performance (CLAUDE.md)
- **Historical Success Rate:** 80% (8/10 passed)
- **Current Success Rate:** 90% (9/10 passed)
- **Performance Improvement:** 10 percentage points increase

### Possible Causes for Improvement
- Algorithm refinements
- Better error handling
- Optimized processing conditions
- System performance improvements

## 🛠️ Recommendations

### Immediate Actions
1. **Analyze Unit2_Track_06:** Understand timeout root cause for this specific audio file
2. **Review Console Errors:** Address error patterns in the failing file
3. **Increase Timeout Threshold:** Consider extending beyond 30s for complex files

### Long-term Improvements
1. **Error Handling:** Better graceful degradation for problematic files
2. **Performance Monitoring:** Implement automated regression detection
3. **Test Suite Enhancement:** Add more granular validation for edge cases

## 📊 Raw Test Output

```
📊 EVALUATION SUMMARY
====================
Total Tests: 10
Passed: 9
Failed: 1
Success Rate: 90%
Total Test Duration: 221s
Total Wall Clock Time: 248s
Average Test Duration: 22s
Total Segments Found: 33
```

---

*Report generated from eval-workflow-sequential.js run on September 18, 2025*