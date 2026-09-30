const prices = require('./prices.json');
const { didYouMean } = require('./suggester');

const PROCESSING_TIERS = ['standard', 'batch', 'flex', 'fast', 'ultrafast'];

function formattedTotalCost(totalCost) {
    if(totalCost < 0.001) {
        return "$"+totalCost.toFixed(4);
    } else if(totalCost < 0.01) {
        return "$"+totalCost.toFixed(3);
    } else {
        return "$"+totalCost.toFixed(2);
    }
}

function capitalize(str) {
    return str.charAt(0).toUpperCase() + str.slice(1);
}

// Looks up a model, falling back to the undated name for snapshots like `gpt-4.1-2025-04-14`.
function findModel(table, modelName, kind) {
    const name = modelName.toLowerCase();
    if (table[name]) return table[name];
    const undated = name.replace(/-\d{4}-\d{2}-\d{2}$/, '');
    if (table[undated]) return table[undated];
    throw new Error('Unknown ' + kind + ' `' + modelName + '`, Did you mean `' + didYouMean(name, Object.keys(table)) + '`?');
}

function tierPrices(modelPrices, modelName, processingTier) {
    const tier = (processingTier || 'standard').toLowerCase();
    if (!PROCESSING_TIERS.includes(tier)) {
        throw new Error('Unknown processing tier `' + processingTier + '`, expected one of ' + PROCESSING_TIERS.join(', '));
    }
    if (tier === 'standard') return modelPrices;
    const tierData = modelPrices[capitalize(tier)];
    if (!tierData) {
        throw new Error('Model `' + modelName + '` has no `' + tier + '` pricing');
    }
    return tierData;
}

const calculateLanguageModelCost = (modelName, {promptTokens, completionTokens, cachedTokens, cacheWriteTokens, processingTier} = {}) => {
    const modelPrices = findModel(prices.LanguageModels, modelName, 'model');
    let pricePerToken = tierPrices(modelPrices, modelName, processingTier);
    if(!promptTokens) promptTokens = 0;
    if(!completionTokens) completionTokens = 0;
    if(!cachedTokens) cachedTokens = 0;
    if(!cacheWriteTokens) cacheWriteTokens = 0;

    // Long context pricing applies to the whole request once the input exceeds the threshold
    const longContext = pricePerToken["LongContext"];
    if (longContext && promptTokens > longContext["Threshold"]) {
        pricePerToken = Object.assign({}, pricePerToken, longContext);
    }

    // cachedTokens and cacheWriteTokens are part of promptTokens (as reported by the API usage object)
    const cachedPrice = pricePerToken["CachedInput"] != null ? pricePerToken["CachedInput"] : pricePerToken["Input"];
    const cacheWritePrice = pricePerToken["CacheWrite"] != null ? pricePerToken["CacheWrite"] : pricePerToken["Input"];
    const uncachedTokens = Math.max(promptTokens - cachedTokens - cacheWriteTokens, 0);

    const promptCost = (pricePerToken["Input"] * uncachedTokens
        + cachedPrice * cachedTokens
        + cacheWritePrice * cacheWriteTokens) / 1000;
    const completionCost = pricePerToken["Output"] * completionTokens / 1000;
    const totalCost = promptCost + completionCost;
    return {
        promptCost,
        completionCost,
        totalCost,
        formattedTotalCost: formattedTotalCost(totalCost)
    }
}

const calculateFineTuningModelCost = (modelName, tokens, operation, processingTier) => {
    const modelPrices = findModel(prices.FineTuningModels, modelName, 'model');
    // 'Usage' is kept as an alias of 'Input' for backwards compatibility
    const op = operation === 'Usage' ? 'Input' : operation;
    let totalCost;
    if (op === 'TrainingHours') {
        if (modelPrices["TrainingPerHour"] == null) {
            throw new Error('Model `' + modelName + '` is billed per training token, use the `Training` operation');
        }
        totalCost = modelPrices["TrainingPerHour"] * tokens;
    } else if (op === 'Training') {
        if (modelPrices["Training"] == null) {
            throw new Error('Model `' + modelName + '` is billed per training hour, use the `TrainingHours` operation');
        }
        totalCost = modelPrices["Training"] * tokens / 1000;
    } else {
        const pricePerToken = tierPrices(modelPrices, modelName, processingTier)[op];
        if (pricePerToken == null) {
            throw new Error('Unknown operation `' + operation + '`, expected Training, TrainingHours, Input, CachedInput or Output');
        }
        totalCost = pricePerToken * tokens / 1000;
    }
    return {
        totalCost,
        formattedTotalCost: formattedTotalCost(totalCost)
    };
}

const calculateEmbeddingModelCost = (modelName, tokens) => {
    const pricePerToken = findModel(prices.EmbeddingModels, modelName, 'model')["Usage"];
    const totalCost = pricePerToken * tokens / 1000;
    return {
        totalCost,
        formattedTotalCost: formattedTotalCost(totalCost)
    };
}

const calculateImageModelCost = (modelName, quality, resolution, images) => {
    const modelPrices = findModel(prices.ImageModels, modelName, 'model');
    const qualities = modelPrices["Quality"];
    if (!qualities) {
        throw new Error('Model `' + modelName + '` has no per-image pricing, use calculateMultimodalModelCost with token counts');
    }
    const qualityKey = Object.keys(qualities).find(q => q.toLowerCase() === String(quality).toLowerCase());
    if (!qualityKey) {
        throw new Error('Unknown quality `' + quality + '`, expected one of ' + Object.keys(qualities).join(', '));
    }
    const pricePerImage = qualities[qualityKey]["Resolution"][resolution];
    if (pricePerImage == null) {
        throw new Error('Unknown resolution `' + resolution + '`, expected one of ' + Object.keys(qualities[qualityKey]["Resolution"]).join(', '));
    }
    const totalCost = pricePerImage * images;
    return {
        totalCost,
        formattedTotalCost: formattedTotalCost(totalCost)
    };
}

// `units` is minutes for transcription/voice models and characters for tts-1 / tts-1-hd
const calculateAudioModelCost = (modelName, units) => {
    const modelPrices = findModel(prices.AudioModels, modelName, 'model');
    const perThousand = modelPrices["Unit"] === '1K characters';
    const totalCost = modelPrices["Usage"] * units / (perThousand ? 1000 : 1);
    return {
        totalCost,
        formattedTotalCost: formattedTotalCost(totalCost)
    };
}

// Token-billed realtime, audio and image models, priced per modality:
// usage = { text: { input, cachedInput, output }, audio: {...}, image: {...} }
const calculateMultimodalModelCost = (modelName, usage = {}, processingTier) => {
    let modelPrices = prices.MultimodalModels[modelName.toLowerCase()];
    if (!modelPrices) {
        const imageModel = findModel(prices.ImageModels, modelName, 'model');
        modelPrices = imageModel["Tokens"];
        if ((processingTier || 'standard').toLowerCase() === 'batch') {
            if (!imageModel["Batch"]) throw new Error('Model `' + modelName + '` has no `batch` pricing');
            modelPrices = imageModel["Batch"]["Tokens"];
        }
        if (!modelPrices) {
            throw new Error('Model `' + modelName + '` has no token pricing');
        }
    }
    let totalCost = 0;
    for (const modality of Object.keys(usage)) {
        const modalityPrices = modelPrices[capitalize(modality.toLowerCase())];
        if (!modalityPrices) {
            throw new Error('Model `' + modelName + '` has no `' + modality + '` pricing');
        }
        const { input = 0, cachedInput = 0, output = 0 } = usage[modality];
        const cachedPrice = modalityPrices["CachedInput"] != null ? modalityPrices["CachedInput"] : modalityPrices["Input"];
        totalCost += ((modalityPrices["Input"] || 0) * Math.max(input - cachedInput, 0)
            + (cachedPrice || 0) * cachedInput
            + (modalityPrices["Output"] || 0) * output) / 1000;
    }
    return {
        totalCost,
        formattedTotalCost: formattedTotalCost(totalCost)
    };
}

module.exports = {
    calculateLanguageModelCost,
    calculateFineTuningModelCost,
    calculateEmbeddingModelCost,
    calculateImageModelCost,
    calculateAudioModelCost,
    calculateMultimodalModelCost,
    prices
}
