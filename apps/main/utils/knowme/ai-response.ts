/**
 * KnowMe AI Response Generation
 * 
 * Handles generating AI responses using OpenAI with retrieved context.
 * This implements RAG (Retrieval-Augmented Generation):
 * 1. User asks question
 * 2. We search vector DB for relevant context
 * 3. We send question + context to LLM
 * 4. LLM generates informed response
 */

import type { KnowMeViewerType } from "@repo/db";
import type {
	VectorSearchResult, ChatMessageSource
} from "@/types/knowme";
import { openai } from "@/lib/openai-client";
import { modelFor } from "@repo/ai";

// Configuration
export const AI_CONFIG = {
	model: modelFor("knowmeReply"), // Cost-effective, good quality
	maxTokens: 800,
	temperature: 0.7,
	maxContextChunks: 5,
};

/**
 * Build the system prompt based on user profile and viewer type
 */
export function buildSystemPrompt(
	userName: string,
	userOccupation: string | null,
	viewerType: KnowMeViewerType
): string {
	let basePrompt = `You are an AI assistant representing ${userName}${userOccupation ? `, a ${userOccupation}` : ""}.

Your role is to answer questions about ${userName}'s background, skills, projects, and experience.
Always respond in first person as if you are ${userName}.
Be conversational, professional, and helpful.

IMPORTANT RULES:
1. Only answer based on the provided context. If information isn't available, say so politely.
2. Never make up information about ${userName}.
3. When mentioning projects or achievements, be specific with details from the context.
4. Keep responses concise but informative (under 200 words unless asked for more detail).
5. Include relevant project/skill mentions when appropriate.`;

	// Customize based on viewer type
	switch (viewerType) {
		case "RECRUITER":
			basePrompt += `

VIEWER CONTEXT: A recruiter is asking. Focus on:
- Professional achievements and metrics
- Technical skills with proficiency levels
- Project impact (users, scale, complexity)
- Availability and career interests
- Include actionable CTAs like "Would you like to schedule a call?"`;
			break;

		case "REGISTERED_USER":
			basePrompt += `

VIEWER CONTEXT: A fellow developer is asking. Focus on:
- Technical implementation details
- Architecture decisions and trade-offs
- Challenges faced and solutions
- Technologies used and why
- Be more casual and technical in language`;
			break;

		case "OWNER":
			basePrompt += `

VIEWER CONTEXT: This is ${userName} testing their own AI. 
- Be helpful and point out areas where more information would help
- Suggest improvements to the profile if relevant
- Be honest about any gaps in the knowledge base`;
			break;

		default: // ANONYMOUS or EXTERNAL_API
			basePrompt += `

VIEWER CONTEXT: An anonymous visitor is asking.
- Be professional but friendly
- Provide balanced, informative responses
- Encourage them to connect for more details`;
	}

	return basePrompt;
}

/**
 * Format retrieved context chunks into a prompt section
 */
export function formatContextForPrompt(
	chunks: VectorSearchResult[]
): string {
	if (chunks.length === 0) {
		return "No specific context available for this question.";
	}

	const contextParts = chunks.map((chunk, index) => {
		const meta = chunk.metadata;
		let header = `[Context ${index + 1}]`;

		if (meta.title) {
			header += ` - ${meta.title}`;
		}
		if (meta.sourceType && typeof meta.sourceType === 'string') {
			header += ` (${meta.sourceType.toLowerCase().replace("_", " ")})`;
		}

		return `${header}\n${chunk.text}`;
	});

	return contextParts.join("\n\n---\n\n");
}

/**
 * Extract sources from retrieved chunks for citation
 */
export function extractSources(
	chunks: VectorSearchResult[]
): ChatMessageSource[] {
	const sourcesMap = new Map<string, ChatMessageSource>();

	for (const chunk of chunks) {
		const meta = chunk.metadata as Record<string, unknown>;
		const key = `${meta.sourceType as string}-${meta.sourceId as string}`;

		if (!sourcesMap.has(key)) {
			sourcesMap.set(key, {
				type: mapSourceType(meta.sourceType as string),
				title: meta.title as string || "Unknown",
				url: meta.url as string | undefined,
				description: chunk.text.slice(0, 100) + "...",
			});
		}
	}

	return Array.from(sourcesMap.values()).slice(0, 5); // Max 5 sources
}

/**
 * Map data type to source type for UI
 */
function mapSourceType(
	dataType: string
): ChatMessageSource["type"] {
	const mapping: Record<string, ChatMessageSource["type"]> = {
		PROJECT: "project",
		ASSESSMENT: "assessment",
		GITHUB_REPO: "github",
		GITHUB_CONTRIBUTION: "github",
		LEETCODE_PROBLEM: "leetcode",
		PROFILE: "profile",
		RESUME: "resume",
	};

	return mapping[dataType] || "profile";
}

/**
 * Generate AI response with context (RAG)
 */
export async function generateResponse(
	question: string,
	context: VectorSearchResult[],
	userInfo: {
		name: string;
		occupation: string | null;
	},
	viewerType: KnowMeViewerType
): Promise<{
	answer: string;
	sources: ChatMessageSource[];
	tokensUsed: number;
	responseTimeMs: number;
}> {
	const startTime = Date.now();

	const systemPrompt = buildSystemPrompt(
		userInfo.name,
		userInfo.occupation,
		viewerType
	);

	const formattedContext = formatContextForPrompt(
		context.slice(0, AI_CONFIG.maxContextChunks)
	);

	const userPrompt = `Based on the following context about me, please answer this question:

CONTEXT:
${formattedContext}

QUESTION: ${question}

Please provide a helpful, accurate response based only on the information provided above.`;

	try {
		const response = await openai.chat.completions.create({
			model: AI_CONFIG.model,
			messages: [
				{ role: "system", content: systemPrompt },
				{ role: "user", content: userPrompt },
			],
			temperature: AI_CONFIG.temperature,
			max_tokens: AI_CONFIG.maxTokens,
		});

		const answer = response.choices[0]?.message?.content ||
			"I apologize, but I couldn't generate a response. Please try again.";

		const tokensUsed = response.usage?.total_tokens || 0;
		const responseTimeMs = Date.now() - startTime;

		return {
			answer,
			sources: extractSources(context),
			tokensUsed,
			responseTimeMs,
		};
	} catch (error) {
		console.error("Error generating AI response:", error);
		throw new Error("Failed to generate response");
	}
}

/**
 * Generate response when no context is found
 */
export async function generateNoContextResponse(
	question: string,
	userName: string
): Promise<string> {
	const prompt = `You are an AI assistant for ${userName}. Someone asked: "${question}"

However, you don't have specific information about this topic in your knowledge base.

Generate a polite, brief response (2-3 sentences) that:
1. Acknowledges you don't have specific information about this
2. Suggests they might want to contact ${userName} directly
3. Offers to help with other questions about their profile, projects, or skills`;

	try {
		const response = await openai.chat.completions.create({
			model: AI_CONFIG.model,
			messages: [{ role: "user", content: prompt }],
			temperature: 0.7,
			max_tokens: 150,
		});

		return response.choices[0]?.message?.content ||
			`I don't have specific information about that in my knowledge base. Feel free to ask about ${userName}'s projects, skills, or experience, or reach out directly for more details.`;
	} catch (error) {
		console.error("Error generating no-context response:", error);
		return `I don't have specific information about that. Please try asking about ${userName}'s projects, skills, or experience.`;
	}
}

/**
 * Detect and categorize question type
 */
export function categorizeQuestion(question: string): string {
	const lowerQuestion = question.toLowerCase();

	const categories = {
		TECHNICAL_SKILLS: [
			"experience with", "knowledge of", "familiar with", "tech stack",
			"programming", "language", "framework", "skill", "technology"
		],
		PROJECTS: [
			"project", "built", "developed", "worked on", "portfolio",
			"application", "app", "website", "system"
		],
		WORK_EXPERIENCE: [
			"worked at", "company", "job", "role", "position", "employment",
			"career", "work history"
		],
		EDUCATION: [
			"degree", "university", "college", "education", "studied",
			"major", "school", "graduate"
		],
		ASSESSMENTS: [
			"assessment", "test", "score", "ranking", "certification",
			"exam", "quiz"
		],
		AVAILABILITY: [
			"available", "hire", "opportunities", "job search", "open to",
			"looking for", "freelance"
		],
		COMPENSATION: [
			"salary", "compensation", "rate", "pay", "expected salary",
			"charge", "pricing"
		],
		SOFT_SKILLS: [
			"communication", "teamwork", "leadership", "problem-solving",
			"work style", "collaborate"
		],
	};

	for (const [category, keywords] of Object.entries(categories)) {
		for (const keyword of keywords) {
			if (lowerQuestion.includes(keyword)) {
				return category;
			}
		}
	}

	return "GENERAL";
}

/**
 * Enhance response with CTAs based on viewer type
 */
export function enhanceResponseWithCTAs(
	answer: string,
	viewerType: KnowMeViewerType,
	profileUrl: string
): string {
	let enhanced = answer;

	switch (viewerType) {
		case "RECRUITER":
			if (!answer.includes("schedule") && !answer.includes("interview")) {
				enhanced += `\n\n💼 Interested in learning more? Feel free to reach out to schedule a conversation!`;
			}
			break;

		case "ANONYMOUS":
		case "EXTERNAL_API":
			enhanced += `\n\n🔗 View full profile: ${profileUrl}`;
			break;
	}

	return enhanced;
}

