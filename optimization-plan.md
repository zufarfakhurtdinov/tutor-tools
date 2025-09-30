# Transformers.js Whisper Optimization Plan

## SUCCESS CRITERIA ⭐

**MANDATORY REQUIREMENT**: Must achieve **80% pass rate** in evaluation workflow (eval-workflow-sequential.js), excluding "by pauses" test cases. All test cases with spoken numbers (1, 2, 3, 4, 5, 6) must pass with correct segment counts.

**Current Performance (v1 - whisper-small)**:
- Model: Xenova/whisper-small with q4/fp32 quantization
- Processing time: ~2-3 minutes for 105s audio
- Evaluation: Unknown (needs baseline run)

**Target Performance**:
- ✅ 80%+ pass rate on ALL 10 test cases
- ⏱️ 4-6x faster processing (30-45s for 105s audio)
- 📦 50% smaller model download

**Test Files (from eval-workflow-sequential.js)**:
1. KidsBox_ActivityBook1_Unit7_Page50_Track_26.mp3 - 6 segments (numbers)
2. KidsBox_ActivityBook1_Unit3_Page20_Track_10.mp3 - 6 segments (numbers)
3. KidsBox_ActivityBook1_Unit3_Page22_Track_12.mp3 - 8 segments (numbers)
4. KidsBox_ActivityBook1_Unit5_Page36_Track_19.mp3 - 'need clarification' (expected fail)
5. KidsBox_ActivityBook1_Unit6_Page40_Track_21.mp3 - 6 segments (numbers)
6. KidsBox_ActivityBook1_Unit10_Page72_Track_38.mp3 - 6 segments (numbers)
7. KidsBox_ActivityBook1_Unit10_Page73_Track_39.mp3 - 4 segments (numbers)
8. KidsBox_ActivityBook1_Unit11_Page80_Track_41.mp3 - 6 segments (by pauses)
9. KidsBox_ActivityBook1_Unit12_Page86_Track_43.mp3 - 4 segments (numbers)
10. KidsBox_ActivityBook1_Unit2_Page12_Track_06.mp3 - 6 segments (by pauses)

**Scoring**: 
- **Total tests**: 10
- **Expected passes**: 8 (excluding Unit5_Track_19 'need clarification' + allow 1 failure)
- **Required for 80%**: 8/10 = 80%
- **Number-based tests**: 7 (tests 1,2,3,5,6,7,9)
- **Pause-based tests**: 2 (tests 8,10)

---

## Current Implementation Analysis (v1 branch)

### Configuration
```javascript
// index.html:631-635
transcriber = await pipeline('automatic-speech-recognition', 'Xenova/whisper-small', {
    device: device,                    // 'webgpu' or 'cpu'
    dtype: device === 'webgpu' ? 'q4' : 'fp32',
    progress_callback: handleProgressCallback
});
```

### Performance Baseline (Need to Measure)
- Model download: ~240MB (whisper-small ONNX)
- First load: Unknown (need to run eval)
- Processing time: Unknown (need to run eval)
- Segment accuracy: Unknown (need to run eval)

---

## Key Research Findings

### 1. WASM is Faster Than WebGPU for Whisper! 🔥

**Benchmark data** (Mac mini M2, 60s audio, transformers.js #894):

| Configuration | Device | Time | Speed vs Current |
|--------------|--------|------|------------------|
| **fp32+fp32** | **WASM** | **4.9s** | **Baseline (fastest)** |
| **fp32+q4** | **WASM** | **5.9s** | **+20% slower** |
| q8+q8 | WASM | 5.2s | +6% slower |
| fp32+q4 | WebGPU | 9.5s | 94% slower ❌ |
| fp32+fp32 | WebGPU | 9.6s | 96% slower ❌ |
| q8+q8 | WebGPU | 27s | 451% slower ❌❌ |

**Key insight**: Current config (WebGPU q4) is nearly **2x slower** than WASM fp32!

### 2. Distil-Whisper Performance

**Official benchmarks**:
- 6x faster inference than whisper-small
- 50% smaller model size
- <1% word error rate (WER) increase
- Fully compatible with transformers.js (confirmed by Xenova)

**Available models**:
- `onnx-community/distil-small.en` - English-only, ~120MB
- `distil-whisper/distil-large-v3.5-ONNX` - Multilingual, larger

### 3. Model Size Comparison

| Model | Size | Relative Speed | WER vs Baseline |
|-------|------|----------------|-----------------|
| whisper-tiny.en | ~80MB | 6x faster | +3% |
| **distil-small.en** | **~120MB** | **18x faster** | **+1%** |
| whisper-small | ~240MB | 1x (baseline) | 0% |
| distil-medium.en | ~400MB | 9x faster | -1% |

---

## Optimization Strategy

### Phase 1: Quick Performance Wins ⚡
**Goal**: 4-6x faster processing, maintain ≥80% pass rate
**Effort**: 1-2 hours
**Risk**: Low

#### Step 1.1: Switch to Distil-Whisper + WASM
```javascript
// Change in index.html (line ~616-635)
env.allowLocalModels = true;
env.allowRemoteModels = true;

transcriber = await pipeline('automatic-speech-recognition', 
    'onnx-community/distil-small.en',  // Was: Xenova/whisper-small
    {
        device: 'wasm',              // Was: device (webgpu/cpu)
        dtype: 'fp32',               // Was: q4/fp32
        progress_callback: handleProgressCallback
    }
);
```

**Expected impact**:
- ⬇️ 50% smaller download (~120MB vs ~240MB)
- ⚡ 6x faster inference
- ✅ Maintained accuracy (<1% WER increase)

#### Step 1.2: Run Baseline Evaluation
```bash
# Run full evaluation to establish baseline
node eval-workflow-sequential.js > eval-baseline-v1.txt 2>&1

# Parse results and calculate pass rate
```

#### Step 1.3: Apply Optimization
- Implement distil-whisper + WASM config
- Test single file: `node test-workflow.js`
- Run full eval: `node eval-workflow-sequential.js > eval-distil-wasm.txt 2>&1`

#### Step 1.4: Validate Success Criteria
- ✅ Pass rate ≥80% (8/10 tests)
- ✅ Processing time reduced 4-6x
- ✅ Model download reduced ~50%

**Rollback plan**: If accuracy drops below 80%, revert to whisper-small but keep WASM backend

---

### Phase 2: Persistent Performance (If Phase 1 Passes) 🚀
**Goal**: Near-instant subsequent loads
**Effort**: 2-3 hours
**Risk**: Low

#### Step 2.1: Service Worker Caching
```javascript
// Add service worker registration
if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('/sw.js')
        .then(() => console.log('Service Worker registered'))
        .catch(err => console.log('SW registration failed'));
}
```

#### Step 2.2: IndexedDB Model Caching
```javascript
// Already partially implemented via env settings
env.allowLocalModels = true;
env.cacheDir = '.hf-transformers-cache';
```

**Expected impact**:
- First load: 30-45s (model download + inference)
- Subsequent loads: 5-10s (cached model + inference)
- Offline capability

---

### Phase 3: Advanced Optimizations (Optional) 🔬
**Goal**: Real-time or near-real-time performance
**Effort**: 8-16 hours
**Risk**: Medium-High

#### Option 3.1: Web Worker Parallel Processing
- Process multiple audio chunks simultaneously
- Expected: 2-3x faster on multi-core systems
- Complexity: High (requires worker thread management)

#### Option 3.2: Streaming Inference
- Stream audio processing as it uploads
- Expected: Better UX, perceived performance
- Complexity: High (requires streaming API)

#### Option 3.3: Adaptive Chunking
- Adjust chunk size based on content complexity
- Expected: 10-20% improvement
- Complexity: Medium

---

## Implementation Checklist

### Prerequisites
- [x] Research complete
- [x] v1 branch checked out
- [x] Test files available in eval/
- [ ] Baseline evaluation run

### Phase 1 Implementation
- [ ] Run baseline eval: `node eval-workflow-sequential.js`
- [ ] Document baseline pass rate and timing
- [ ] Modify index.html with distil-small.en + WASM
- [ ] Test single file: `node test-workflow.js`
- [ ] Run full eval with optimizations
- [ ] Verify ≥80% pass rate (8/10 tests)
- [ ] Document performance improvements
- [ ] Commit changes if successful

### Phase 2 Implementation (Conditional)
- [ ] Create service worker (sw.js)
- [ ] Add SW registration to index.html
- [ ] Test caching behavior
- [ ] Measure cached vs uncached load times
- [ ] Commit changes

### Phase 3 (Optional, Future)
- [ ] Evaluate need based on Phase 1/2 results
- [ ] Prototype web worker approach
- [ ] Benchmark improvements
- [ ] Implement if ROI justifies effort

---

## Risk Mitigation

### Risk 1: Distil-Whisper Accuracy Drop
**Probability**: Low
**Impact**: High (fails 80% criteria)
**Mitigation**: 
- Run baseline eval first
- Compare distil-small vs whisper-small accuracy
- Fallback: Use whisper-tiny.en (faster than small, more accurate than distil)
- Ultimate fallback: Keep whisper-small, only switch to WASM backend

### Risk 2: WASM Slower on Some Hardware
**Probability**: Low (benchmark shows opposite)
**Impact**: Medium
**Mitigation**:
- Test on multiple devices
- Keep WebGPU as optional fallback
- Allow user device selection if needed

### Risk 3: Model Compatibility Issues
**Probability**: Low (Xenova confirmed compatibility)
**Impact**: Medium
**Mitigation**:
- Test thoroughly before committing
- Check transformers.js version compatibility
- Monitor console for ONNX errors

---

## Expected Results

### Baseline (whisper-small + WebGPU q4)
- Model size: ~240MB
- Processing: ~2-3min for 105s audio
- Pass rate: Unknown (need to measure)

### Optimized (distil-small.en + WASM fp32)
- Model size: ~120MB (-50%)
- Processing: ~30-45s for 105s audio (4-6x faster)
- Pass rate: ≥80% (8/10 tests pass)

### With Caching (Phase 2)
- First load: ~30-45s
- Cached load: ~5-10s (6-9x faster)
- Offline: ✅ Enabled

---

## Measurement & Validation

### Metrics to Track
1. **Accuracy Metrics**:
   - Pass rate on ALL 10 tests (target: ≥80%, i.e., 8/10)
   - Segment count correctness per file
   - Word error rate (WER) if measurable

2. **Performance Metrics**:
   - Model download size (MB)
   - First load time (seconds)
   - Cached load time (seconds)
   - Per-chunk processing time (seconds)
   - Total processing time for 105s audio (seconds)

3. **User Experience Metrics**:
   - Time to first interaction (model loaded)
   - Time to results (download buttons visible)
   - Offline capability (yes/no)

### Validation Commands
```bash
# Baseline evaluation
node eval-workflow-sequential.js > eval-baseline-v1.txt 2>&1

# Optimized evaluation
node eval-workflow-sequential.js > eval-optimized.txt 2>&1

# Compare results
diff eval-baseline-v1.txt eval-optimized.txt

# Count passes
grep "✅.*TEST PASSED" eval-baseline-v1.txt | wc -l
grep "✅.*TEST PASSED" eval-optimized.txt | wc -l
```

---

## References

- **Transformers.js Issue #894**: WebGPU vs WASM performance benchmarks
- **Distil-Whisper Paper**: "6x faster, 50% smaller, <1% WER"
- **Xenova Tweet**: Confirmed distil-whisper compatibility with transformers.js
- **ONNX Community Models**: `onnx-community/distil-small.en` available
- **Current Implementation**: v1 branch, index.html:591-635

---

## Next Actions

1. ✅ **RUN BASELINE EVAL** - Must establish current accuracy before changes
2. Switch to distil-small.en + WASM
3. Re-run eval and validate ≥80% pass rate (8/10 tests)
4. Document results in this file
5. Commit if successful, rollback if not

**Start with**: `node eval-workflow-sequential.js > eval-baseline-v1.txt 2>&1`
