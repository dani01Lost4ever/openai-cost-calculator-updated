# openai-token-cost-calculator-updated
## Forked from  [openai-cost-calculator](https://github.com/codergautam/openai-cost-calculator)

`openai-token-cost-calculator-updated` is a reliable npm module that provides cost calculations for various AI models offered by OpenAI. Pricing is maintained regularly to stay on top of OpenAI's pricing changes. Whether you need to calculate costs for OpenAI Language Models, Fine Tuning Models, Embedding Models, Image Models, or Audio Models, this module has got you covered.

## Installation

**Using npm:**
```
npm install openai-token-cost-calculator-updated
```

**Using yarn:**
```
yarn add openai-token-cost-calculator-updated
```

## Importing

**CommonJS:**
```javascript
const costCalculator = require('openai-token-cost-calculator-updated');
```

**ES6:**
```javascript
import * as costCalculator from 'openai-token-cost-calculator-updated';
```

## Functions

### 1. calculateLanguageModelCost

**Usage:**
```javascript
const cost = costCalculator.calculateLanguageModelCost('gpt-4', { promptTokens: 5000, completionTokens: 10000 });
console.log(cost);
```

**Example Output:**
```json
{
  "promptCost": 0.15,
  "completionCost": 0.6,
  "totalCost": 0.75,
  "formattedTotalCost": "$0.75"
}
```

**Options:**

| Option | Description |
| --- | --- |
| `promptTokens` | Input tokens |
| `completionTokens` | Output tokens (reasoning tokens included) |
| `cachedTokens` | Part of `promptTokens` read from the prompt cache, billed at the cached input rate |
| `cacheWriteTokens` | Part of `promptTokens` written to the prompt cache, billed at the cache write rate (models that have one) |
| `processingTier` | `standard` (default), `batch`, `flex`, `fast` or `ultrafast`, when the model supports it |

Long context pricing is applied automatically when `promptTokens` exceeds 272K for models that have it (e.g. `gpt-5.4`, `gpt-5.5`, `gpt-6-*`). Dated snapshots such as `gpt-5-2025-08-07` fall back to the base model price.

```javascript
const cost = costCalculator.calculateLanguageModelCost('gpt-5.4-mini', {
  promptTokens: 20000,
  cachedTokens: 15000,
  completionTokens: 2000,
  processingTier: 'batch'
});
```

# Combining openai-gpt-token-counter with openai-cost-calculator

You can combine the `openai-gpt-token-counter` module with this one to estimate the cost of processing text using a specific OpenAI model.

Before we begin, make sure that you have `openai-token-cost-calculator-updated` installed. If not, you can install it using npm:
```shell
npm install openai-gpt-token-counter
```

## Usage
```javascript
// Importing the required modules
const tokenCounter = require('openai-gpt-token-counter');
const costCalculator = require('openai-token-cost-calculator-updated');

const messages = [
  { role: "user", content: "This is a test prompt to test out the cost calculation functionality of openai-cost-calculator" },
  // Add more messages if needed
];

const model = "gpt-4"; // Replace with your desired OpenAI chat model

const tokenCount = tokenCounter.chat(messages, model);
console.log(`Token count: ${tokenCount}`);

// Calculate the cost of processing the text
const cost = costCalculator.calculateLanguageModelCost(model, { promptTokens: tokenCount });
console.log(`Processing cost: ${cost.formattedTotalCost}`);
```

This script first counts the number of tokens in a text for a specific OpenAI model using the `openai-gpt-token-counter` module. Then, it calculates the cost of processing these tokens using the `openai-cost-calculator` module. The result is the estimated cost of processing your text with the chosen OpenAI model.

Remember to replace `"This is a test sentence."` with your text and `"gpt-4"` with your desired OpenAI model. You can use any model supported by `openai-gpt-token-counter` and `openai-cost-calculator`.

With this approach, you can estimate the cost of using OpenAI models in your projects and ensure that you stay within your budget.

---

### 2. calculateFineTuningModelCost

**Usage:**
```javascript
// 1st Param - Model
// 2nd Param - Number of tokens
// 3rd Param - Operation: 'Training', 'TrainingHours' (o4-mini RFT, billed per hour), 'Input', 'CachedInput' or 'Output'
// 4th Param - Optional processing tier, 'standard' or 'batch' (inference only)
const cost = costCalculator.calculateFineTuningModelCost('babbage-002', 10000, 'Training');
console.log(cost);
```

**Example Output:**
```json
{
  "totalCost": 0.004,
  "formattedTotalCost": "$0.004"
}
```

### 3. calculateEmbeddingModelCost

**Usage:**
```javascript
// 1st Param - Model
// 2nd Param - Number of tokens
const cost = costCalculator.calculateEmbeddingModelCost('text-embedding-ada-002', 10000);
console.log(cost);
```

**Example Output:**
```json
{
  "totalCost": 0.001,
  "formattedTotalCost": "$0.001"
}
```

### 4. calculateImageModelCost

**Usage:**
```javascript
// 1st Param - Model
// 2nd Param - Quality (Low, Medium, High for GPT Image; Standard, HD for DALL·E)
// 3rd Param - Resolution
// 4th Param - Count of Images
const cost = costCalculator.calculateImageModelCost('gpt-image-1', 'High', '1024x1536', 2);
console.log(cost);
```

**Example Output:**
```json
{
  "totalCost": 0.5,
  "formattedTotalCost": "$0.50"
}
```

Per-image prices only cover image output. For token-based estimates (including `gpt-image-2.5-*`, which is only priced per token) use `calculateMultimodalModelCost`.

### 5. calculateAudioModelCost

**Usage:**
```javascript
// 1st Param - Model
// 2nd Param - Minutes for transcription/voice models, characters for tts-1 and tts-1-hd
const cost = costCalculator.calculateAudioModelCost('whisper-1', 60);
console.log(cost);
```

**Example Output:**
```json
{
  "totalCost": 0.36,
  "formattedTotalCost": "$0.36"
}
```

### 6. calculateMultimodalModelCost

For token-billed realtime, audio and image models, priced per modality (`text`, `audio`, `image`). `cachedInput` is part of `input`.

**Usage:**
```javascript
const cost = costCalculator.calculateMultimodalModelCost('gpt-realtime-2', {
  audio: { input: 12000, cachedInput: 4000, output: 8000 },
  text: { input: 2000, output: 500 }
});
console.log(cost.formattedTotalCost);
```

### Raw prices

The full price table is exported as `costCalculator.prices`. Token prices are USD per 1K tokens.

## Available Models

Prices were last updated on **2026-09-30** from the [official OpenAI pricing page](https://developers.openai.com/api/docs/pricing). Models no longer listed there keep their last published price.

- **Language Models**: gpt-6-astra, gpt-6.1-sol, gpt-6-luna, gpt-6-sol, gpt-5.6-sol, gpt-5.6-terra, gpt-5.6-luna, gpt-5.5, gpt-5.5-pro, gpt-5.4, gpt-5.4-mini, gpt-5.4-nano, gpt-5.4-pro, gpt-5.2, gpt-5.2-pro, gpt-5.1, gpt-5, gpt-5-mini, gpt-5-nano, gpt-5-pro, gpt-4.1, gpt-4.1-mini, gpt-4.1-nano, gpt-4o, gpt-4o-2024-05-13, gpt-4o-mini, o1, o1-pro, o3-pro, o3, o4-mini, o3-mini, gpt-4-turbo-2024-04-09, gpt-4-0613, gpt-3.5-turbo, gpt-3.5-turbo-0125, gpt-3.5-turbo-1106, gpt-3.5-turbo-instruct, davinci-002, babbage-002, gpt-5.6-cyber, gpt-5.5-cyber, chat-latest, gpt-5.3-codex, gpt-rosalind-research, gpt-5-search-api, omni-moderation-latest, gpt-4o-2024-08-06, gpt-4o-2024-11-20, gpt-4o-mini-2024-07-18, gpt-4.1-2025-04-14, gpt-4.1-mini-2025-04-14, gpt-4.1-nano-2025-04-14, gpt-4-turbo, gpt-4, o4-mini-2025-04-16, o3-2025-04-16, chatgpt-4o-latest, gpt-4-32k, gpt-4-0125-preview, gpt-4-1106-preview, gpt-4-vision-preview, gpt-3.5-turbo-0613, gpt-3.5-turbo-16k-0613, gpt-3.5-turbo-0301
- **Fine Tuning Models**: o4-mini-2025-04-16, o4-mini-2025-04-16 (data sharing), gpt-4.1-2025-04-14, gpt-4.1-mini-2025-04-14, gpt-4.1-nano-2025-04-14, gpt-4o-2024-08-06, gpt-4o-mini-2024-07-18, gpt-3.5-turbo, davinci-002, babbage-002
- **Embedding Models**: text-embedding-3-small, text-embedding-3-large, text-embedding-ada-002, ada v2
- **Image Models**: gpt-image-2.5-sunburst, gpt-image-2.5-flare, gpt-image-2, gpt-image-1.5, gpt-image-1-mini, gpt-image-1, chatgpt-image-latest, dall-e 3, dall-e 2
- **Multimodal (realtime/audio token) Models**: gpt-realtime-2.1, gpt-realtime-2.1-mini, gpt-realtime-2, gpt-realtime-1.5, gpt-realtime-mini, gpt-realtime, gpt-audio-1.5, gpt-audio-mini, gpt-audio, gpt-4o-mini-tts
- **Audio Models**: gpt-live-1, gpt-realtime-translate, gpt-live-transcribe, gpt-realtime-whisper, gpt-transcribe, gpt-4o-transcribe, gpt-4o-mini-transcribe, gpt-4o-transcribe-diarize, whisper-1, whisper, tts-1, tts-1-hd, tts, tts hd

## Contributions

Contributions to improve `openai-token-cost-calculator-updated` are more than welcome. Feel free to submit a pull request or report an issue on our [GitHub repository](https://github.com/dani01Lost4ever/openai-cost-calculator-updated).