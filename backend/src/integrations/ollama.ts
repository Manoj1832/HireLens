import { config } from '../config/index.js';
import { logger } from '../utils/logger.js';

export async function getEmbedding(text: string, model = 'all-minilm'): Promise<number[]> {
  const url = `${config.ollamaUrl}/api/embeddings`;
  
  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ model, prompt: text }),
    });

    if (!response.ok) {
      // If model not found, try to trigger a pull or throw clear error
      if (response.status === 404) {
        throw new Error(`Ollama model '${model}' not found or endpoint invalid.`);
      }
      const errText = await response.text();
      throw new Error(`Ollama request failed: ${response.statusText} - ${errText}`);
    }

    const result = (await response.json()) as { embedding: number[] };
    if (!result.embedding || !Array.isArray(result.embedding)) {
      throw new Error('Ollama response did not contain embedding array');
    }

    return result.embedding;
  } catch (error) {
    logger.error('Error generating embedding via Ollama', {
      service: 'ollama',
      model,
      error: error instanceof Error ? error.message : String(error),
    });
    throw error;
  }
}

/**
 * Utility to check Ollama connection and pull the required model if missing.
 */
export async function ensureOllamaModel(model = 'all-minilm'): Promise<boolean> {
  const listUrl = `${config.ollamaUrl}/api/tags`;
  const pullUrl = `${config.ollamaUrl}/api/pull`;

  try {
    const listRes = await fetch(listUrl);
    if (!listRes.ok) {
      logger.warn('Could not query Ollama models list endpoint', { service: 'ollama' });
      return false;
    }

    const data = (await listRes.json()) as { models?: { name: string }[] };
    const hasModel = data.models?.some((m) => m.name.startsWith(model)) ?? false;

    if (hasModel) {
      logger.info(`Ollama model '${model}' is ready.`, { service: 'ollama' });
      return true;
    }

    logger.info(`Ollama model '${model}' not found. Attempting to pull it...`, { service: 'ollama' });
    
    // Pull the model asynchronously
    const pullRes = await fetch(pullUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: model, stream: false }),
    });

    if (pullRes.ok) {
      logger.info(`Successfully pulled Ollama model '${model}'.`, { service: 'ollama' });
      return true;
    } else {
      logger.error(`Failed to pull Ollama model '${model}': ${pullRes.statusText}`, { service: 'ollama' });
      return false;
    }
  } catch (error) {
    logger.warn('Ollama service is offline or unreachable. Embeddings will fail.', {
      service: 'ollama',
      error: error instanceof Error ? error.message : String(error),
    });
    return false;
  }
}
