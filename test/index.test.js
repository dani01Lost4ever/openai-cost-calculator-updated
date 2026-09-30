const test = require('node:test');
const assert = require('node:assert');
const calc = require('../src/index');

const close = (actual, expected) => assert.ok(Math.abs(actual - expected) < 1e-9, `${actual} !== ${expected}`);

test('language model cost uses input and output prices', () => {
    const cost = calc.calculateLanguageModelCost('gpt-4', { promptTokens: 5000, completionTokens: 10000 });
    close(cost.promptCost, 0.15);
    close(cost.completionCost, 0.6);
    close(cost.totalCost, 0.75);
    assert.strictEqual(cost.formattedTotalCost, '$0.75');
});

test('current flagship model pricing', () => {
    // gpt-5.5: $5 / 1M input, $30 / 1M output
    const cost = calc.calculateLanguageModelCost('gpt-5.5', { promptTokens: 200000, completionTokens: 1000000 });
    close(cost.totalCost, 1 + 30);
});

test('cached tokens are billed at the cached input rate', () => {
    // gpt-4.1: $2 input, $0.50 cached input per 1M
    const cost = calc.calculateLanguageModelCost('gpt-4.1', { promptTokens: 1000000, cachedTokens: 500000 });
    close(cost.promptCost, 1 + 0.25);
});

test('long context pricing applies above 272K input tokens', () => {
    // gpt-5.4 long context: $5 input, $22.50 output per 1M
    const cost = calc.calculateLanguageModelCost('gpt-5.4', { promptTokens: 300000, completionTokens: 100000 });
    close(cost.promptCost, 1.5);
    close(cost.completionCost, 2.25);
});

test('processing tiers', () => {
    const batch = calc.calculateLanguageModelCost('gpt-5-mini', { promptTokens: 1000000, processingTier: 'batch' });
    close(batch.totalCost, 0.125);
    assert.throws(() => calc.calculateLanguageModelCost('gpt-3.5-turbo', { promptTokens: 1, processingTier: 'flex' }), /no `flex` pricing/);
});

test('dated snapshots fall back to the base model', () => {
    const cost = calc.calculateLanguageModelCost('gpt-5-2025-08-07', { promptTokens: 1000000 });
    close(cost.totalCost, 1.25);
});

test('unknown models suggest the closest one', () => {
    assert.throws(() => calc.calculateLanguageModelCost('gpt-4.2', {}), /Did you mean/);
});

test('fine-tuning cost', () => {
    close(calc.calculateFineTuningModelCost('babbage-002', 10000, 'Training').totalCost, 0.004);
    close(calc.calculateFineTuningModelCost('o4-mini-2025-04-16', 2, 'TrainingHours').totalCost, 200);
    close(calc.calculateFineTuningModelCost('gpt-4.1-mini-2025-04-14', 1000000, 'Output', 'batch').totalCost, 1.6);
});

test('embedding cost', () => {
    close(calc.calculateEmbeddingModelCost('ada v2', 10000).totalCost, 0.001);
    close(calc.calculateEmbeddingModelCost('text-embedding-3-small', 1000000).totalCost, 0.02);
});

test('image cost', () => {
    close(calc.calculateImageModelCost('gpt-image-1', 'high', '1024x1536', 2).totalCost, 0.5);
    close(calc.calculateImageModelCost('dall-e 3', 'HD', '1024x1024', 1).totalCost, 0.08);
});

test('audio cost', () => {
    close(calc.calculateAudioModelCost('whisper-1', 10).totalCost, 0.06);
    close(calc.calculateAudioModelCost('tts-1-hd', 1000000).totalCost, 30);
});

test('audio models accept OpenAI API names and legacy aliases (#1)', () => {
    close(calc.calculateAudioModelCost('whisper-1', 10).totalCost, calc.calculateAudioModelCost('whisper', 10).totalCost);
    close(calc.calculateAudioModelCost('tts-1', 1000).totalCost, calc.calculateAudioModelCost('tts', 1000).totalCost);
    close(calc.calculateAudioModelCost('tts-1-hd', 1000).totalCost, calc.calculateAudioModelCost('tts hd', 1000).totalCost);
});

test('transcription cost is per minute, as documented (#2)', () => {
    // whisper-1: $0.006 / minute, so 60 minutes cost $0.36 (the README example)
    assert.strictEqual(calc.calculateAudioModelCost('whisper-1', 60).formattedTotalCost, '$0.36');
});

test('multimodal token cost', () => {
    const cost = calc.calculateMultimodalModelCost('gpt-realtime-2', {
        audio: { input: 1000000, output: 1000000 },
        text: { input: 1000000, cachedInput: 1000000 },
    });
    close(cost.totalCost, 32 + 64 + 0.4);
    const image = calc.calculateMultimodalModelCost('gpt-image-2', { image: { output: 1000000 } });
    close(image.totalCost, 30);
});

test('every language model has numeric input and output prices', () => {
    for (const [name, p] of Object.entries(calc.prices.LanguageModels)) {
        assert.strictEqual(typeof p.Input, 'number', name);
        assert.strictEqual(typeof p.Output, 'number', name);
    }
});
