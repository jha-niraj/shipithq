/**
 * KnowMe Embeddings Utility
 * 
 * Handles text embedding generation using OpenAI's embedding models.
 * Embeddings are numerical representations (vectors) of text that capture semantic meaning.
 */

import { openai } from "@/lib/openai-client";
import type {
	EmbeddingChunk
} from "@/types/knowme";
import { modelFor } from "@repo/ai";

// Configuration
export const EMBEDDING_CONFIG = {
	model: modelFor("knowmeEmbedding"), // Cost-effective, good quality
	// Must match the Vectorize index exactly:
	//   npx wrangler vectorize create shipithq-knowme --dimensions=1024 --metric=cosine
	// A mismatch is rejected at upsert time, not at startup.
	dimensions: 1024,
	maxInputTokens: 8191, // Max tokens per embedding request
	batchSize: 100, // Max embeddings per batch
};

/**
 * Generate embedding for a single text
 */
export async function generateEmbedding(text: string): Promise<number[]> {
	if (!text || text.trim().length === 0) {
		throw new Error("Cannot generate embedding for empty text");
	}

	try {
		const response = await openai.embeddings.create({
			model: EMBEDDING_CONFIG.model,
			input: text.trim(),
			dimensions: EMBEDDING_CONFIG.dimensions,
		});

		return response.data[0]?.embedding ?? [];
	} catch (error) {
		console.error("Error generating embedding:", error);
		throw new Error("Failed to generate embedding");
	}
}

/**
 * Generate embeddings for multiple texts (batch processing)
 * More efficient than calling single embedding multiple times
 */
export async function generateEmbeddingsBatch(
	texts: string[]
): Promise<number[][]> {
	if (!texts || texts.length === 0) {
		return [];
	}

	// Filter out empty texts and track indices
	const validTexts: { text: string; index: number }[] = [];
	texts.forEach((text, index) => {
		if (text && text.trim().length > 0) {
			validTexts.push({ text: text.trim(), index });
		}
	});

	if (validTexts.length === 0) {
		return [];
	}

	try {
		// Process in batches if needed
		const embeddings: number[][] = new Array(texts.length).fill([]);

		for (let i = 0; i < validTexts.length; i += EMBEDDING_CONFIG.batchSize) {
			const batch = validTexts.slice(i, i + EMBEDDING_CONFIG.batchSize);

			const response = await openai.embeddings.create({
				model: EMBEDDING_CONFIG.model,
				input: batch.map((b) => b.text),
				dimensions: EMBEDDING_CONFIG.dimensions,
			}) as { data: Array<{ embedding: number[] }> };

			// Map results back to original indices
			response.data.forEach((item: { embedding: number[] }, batchIndex: number) => {
				const originalIndex = batch[batchIndex]?.index ?? 0;
				embeddings[originalIndex] = item?.embedding ?? [];
			});
		}

		return embeddings;
	} catch (error) {
		console.error("Error generating batch embeddings:", error);
		throw new Error("Failed to generate batch embeddings");
	}
}

/**
 * Generate embedding for a chunk with metadata
 */
export async function generateChunkEmbedding(
	chunk: EmbeddingChunk
): Promise<{ embedding: number[]; metadata: Record<string, unknown> }> {
	const embedding = await generateEmbedding(chunk.text);
	return {
		embedding,
		metadata: chunk.metadata as unknown as Record<string, unknown>,
	};
}

/**
 * Calculate cosine similarity between two embeddings
 * Returns value between -1 and 1, higher is more similar
 */
export function cosineSimilarity(a: number[], b: number[]): number {
	if (a.length !== b.length) {
		throw new Error("Embeddings must have same dimensions");
	}

	let dotProduct = 0;
	let normA = 0;
	let normB = 0;

	for (let i = 0; i < a.length; i++) {
		dotProduct += (a[i] ?? 0) * (b[i] ?? 0);
		normA += (a[i] ?? 0) * (a[i] ?? 0);
		normB += (b[i] ?? 0) * (b[i] ?? 0);
	}

	normA = Math.sqrt(normA);
	normB = Math.sqrt(normB);

	if (normA === 0 || normB === 0) {
		return 0;
	}

	return dotProduct / (normA * normB);
}

/**
 * Estimate token count for text (rough approximation)
 * OpenAI uses ~4 characters per token on average
 */
export function estimateTokenCount(text: string): number {
	return Math.ceil(text.length / 4);
}

/**
 * Check if text is within embedding limits
 */
export function isWithinLimits(text: string): boolean {
	return estimateTokenCount(text) <= EMBEDDING_CONFIG.maxInputTokens;
}