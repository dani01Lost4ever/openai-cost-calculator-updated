declare module 'openai-token-cost-calculator-updated' {

    type ProcessingTier = 'standard' | 'batch' | 'flex' | 'fast' | 'ultrafast';

    interface LanguageModelCostOptions {
        promptTokens?: number;
        completionTokens?: number;
        /** Cached prompt tokens (included in promptTokens), billed at the cached input rate. */
        cachedTokens?: number;
        /** Prompt tokens written to the cache (included in promptTokens), billed at the cache write rate. */
        cacheWriteTokens?: number;
        processingTier?: ProcessingTier;
    }

    interface ModalityUsage {
        input?: number;
        /** Cached input tokens, included in input. */
        cachedInput?: number;
        output?: number;
    }

    interface MultimodalUsage {
        text?: ModalityUsage;
        audio?: ModalityUsage;
        image?: ModalityUsage;
    }

    interface CostResult {
        promptCost?: number;
        completionCost?: number;
        totalCost: number;
        formattedTotalCost: string;
    }

    type FineTuningOperation = 'Training' | 'TrainingHours' | 'Input' | 'CachedInput' | 'Output' | 'Usage';

    function calculateLanguageModelCost(modelName: string, options: LanguageModelCostOptions): CostResult;

    function calculateFineTuningModelCost(modelName: string, tokens: number, operation: FineTuningOperation, processingTier?: 'standard' | 'batch'): CostResult;

    function calculateEmbeddingModelCost(modelName: string, tokens: number): CostResult;

    function calculateImageModelCost(modelName: string, quality: string, resolution: string, images: number): CostResult;

    /** units: minutes for transcription/voice models, characters for tts-1 and tts-1-hd. */
    function calculateAudioModelCost(modelName: string, units: number): CostResult;

    function calculateMultimodalModelCost(modelName: string, usage: MultimodalUsage, processingTier?: 'standard' | 'batch'): CostResult;

    const prices: Record<string, any>;

    export {
        calculateLanguageModelCost,
        calculateFineTuningModelCost,
        calculateEmbeddingModelCost,
        calculateImageModelCost,
        calculateAudioModelCost,
        calculateMultimodalModelCost,
        prices
    };
}
