import { createOpenRouter } from "@openrouter/ai-sdk-provider";

// Cache the model instance so it's only created once
let cachedModel: ReturnType<ReturnType<typeof createOpenRouter>> | null = null;

/**
 * Retrieves the configured OpenRouter default model.
 * Validates environment variables and caches the model instance.
 */
export function getAgentProvider() {
    if (cachedModel) {
        return cachedModel;
    }

    const apiKey = process.env.OPENROUTER_API_KEY;
    if (!apiKey) {
        throw new Error(
            "Missing OPENROUTER_API_KEY in environment variables. Please check your .env file."
        );
    }

    const modelId = process.env.OPENROUTER_DEFAULT_MODEL;
    if (!modelId) {
        throw new Error(
            "Missing OPENROUTER_DEFAULT_MODEL in environment variables. Please check your .env file."
        );
    }

    const provider = createOpenRouter({ apiKey });
    cachedModel = provider(modelId);

    return cachedModel;
}
