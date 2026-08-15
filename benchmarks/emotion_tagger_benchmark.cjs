const { performance } = require('perf_hooks');

const selectedEmotions = Array.from({ length: 100 }, (_, i) => `emotion_${i}`);
const emotionsByType = {
  type1: Array.from({ length: 50 }, (_, i) => ({ key: `emotion_${i}` })),
  type2: Array.from({ length: 50 }, (_, i) => ({ key: `emotion_${i + 50}` })),
  type3: Array.from({ length: 50 }, (_, i) => ({ key: `emotion_${i + 100}` })), // None selected
};

function originalHasSelectedEmotionsInType(type) {
  return emotionsByType[type].some(e => selectedEmotions.includes(e.key));
}

function runOriginal() {
  let count = 0;
  for (let i = 0; i < 10000; i++) {
    if (originalHasSelectedEmotionsInType('type1')) count++;
    if (originalHasSelectedEmotionsInType('type2')) count++;
    if (originalHasSelectedEmotionsInType('type3')) count++;
  }
  return count;
}

const selectedEmotionsSet = new Set(selectedEmotions);
function optimizedHasSelectedEmotionsInType(type) {
  return emotionsByType[type].some(e => selectedEmotionsSet.has(e.key));
}

function runOptimized() {
  let count = 0;
  for (let i = 0; i < 10000; i++) {
    if (optimizedHasSelectedEmotionsInType('type1')) count++;
    if (optimizedHasSelectedEmotionsInType('type2')) count++;
    if (optimizedHasSelectedEmotionsInType('type3')) count++;
  }
  return count;
}

console.log("Warming up...");
runOriginal();
runOptimized();

console.log("Benchmarking original...");
const startOrig = performance.now();
for(let i=0; i<10; i++) runOriginal();
const endOrig = performance.now();
console.log(`Original: ${(endOrig - startOrig).toFixed(2)} ms`);

console.log("Benchmarking optimized...");
const startOpt = performance.now();
for(let i=0; i<10; i++) runOptimized();
const endOpt = performance.now();
console.log(`Optimized: ${(endOpt - startOpt).toFixed(2)} ms`);

console.log(`Improvement: ${((startOrig - endOrig) / (startOpt - endOpt)).toFixed(2)}x faster`);
