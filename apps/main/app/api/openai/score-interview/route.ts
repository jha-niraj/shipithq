import { NextRequest, NextResponse } from 'next/server';
import { openai } from '@/lib/openai-client';
import { modelFor } from '@repo/ai';

export async function POST(request: NextRequest) {
	try {
		if (!process.env.OPENAI_API_KEY) {
			return NextResponse.json(
				{ error: 'OpenAI API key not configured' },
				{ status: 500 }
			);
		}

		// openai imported from @/lib/openai-client

		const body = await request.json();
		const { transcript, project } = body;

		if (!transcript || !project) {
			return NextResponse.json(
				{ error: 'Missing transcript or project data' },
				{ status: 400 }
			);
		}

		const prompt = `
You are an expert technical interviewer evaluating a mock interview for a ${project.title} project.

Project Context:
- Title: ${project.title}
- Core learn: ${project.coreLearn}
- Technologies: ${project.technologies?.join(', ')}
- Essential Components: ${project.essentialComponents?.join(', ')}

Interview Transcript:
${transcript}

Please evaluate this interview and provide:
1. A score from 0-100 based on:
   - Technical accuracy (40%)
   - Understanding of core Learns (30%)
   - Problem-solving approach (20%)
   - Communication clarity (10%)

2. Constructive feedback highlighting:
   - What the candidate did well
   - Areas for improvement
   - Specific technical points to focus on

Format your response as JSON:
{
  "score": <number 0-100>,
  "feedback": "<detailed feedback string>",
  "breakdown": {
    "technical_accuracy": <score>,
    "Learn_understanding": <score>,
    "problem_solving": <score>,
    "communication": <score>
  }
}
`;

		const completion = await openai.chat.completions.create({
			model: modelFor("mockInterviewScore"),
			messages: [
				{
					role: "system",
					content: "You are an expert technical interviewer. Provide fair, constructive, and detailed feedback on technical interviews."
				},
				{
					role: "user",
					content: prompt
				}
			],
			temperature: 0.3,
			max_tokens: 1000,
		});

		const responseContent = completion.choices[0]?.message?.content;
		if (!responseContent) {
			throw new Error('No response from OpenAI');
		}

		// Try to parse JSON response
		let result;
		try {
			result = JSON.parse(responseContent);
		} catch (parseError) {
			console.log("Error occurred while parseing: " + parseError);
			// If JSON parsing fails, extract score and feedback manually
			const scoreMatch = responseContent.match(/score['"]\s*:\s*(\d+)/i);
			const score = scoreMatch ? parseInt(scoreMatch[1] || '75') : 75;

			result = {
				score,
				feedback: responseContent.replace(/```json|```/g, '').trim(),
				breakdown: {
					technical_accuracy: Math.round(score * 0.4),
					Learn_understanding: Math.round(score * 0.3),
					problem_solving: Math.round(score * 0.2),
					communication: Math.round(score * 0.1)
				}
			};
		}

		return NextResponse.json({
			success: true,
			...result
		});

	} catch (error) {
		console.error('Error scoring interview:', error);
		return NextResponse.json(
			{
				error: 'Failed to score interview',
				details: error instanceof Error ? error.message : 'Unknown error'
			},
			{ status: 500 }
		);
	}
} 