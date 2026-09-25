"use server"

import { requirePermission } from "@/lib/permissions"

// ============================================
// INTERVIEW ROUND TEMPLATES
// ============================================

// Get round templates (pre-built templates for common round types)
export async function getRoundTemplates() {
    const auth = await requirePermission()
    if (!auth.ok) return { success: false, error: auth.error, data: [] }
    return {
        success: true,
        data: [
            {
                roundType: "PHONE_SCREEN",
                title: "Phone Screen",
                durationMinutes: 30,
                format: "VOICE",
                description: "Initial phone conversation to assess basic qualifications and cultural fit.",
                whatToExpect: [
                    "Brief introduction and company overview",
                    "Discussion of your background and experience",
                    "Basic technical questions related to the role",
                    "Salary expectations and availability"
                ],
                tipsForCandidates: [
                    "Have your resume ready for reference",
                    "Be prepared to discuss your career goals",
                    "Research the company beforehand",
                    "Have questions ready about the role"
                ]
            },
            {
                roundType: "TECHNICAL_CODING",
                title: "Technical Coding Round",
                durationMinutes: 60,
                format: "LIVE_CODING",
                description: "Coding interview to assess problem-solving skills and coding ability.",
                whatToExpect: [
                    "1-2 coding problems of medium difficulty",
                    "Focus on data structures and algorithms",
                    "Code review and optimization discussion",
                    "Time to ask clarifying questions"
                ],
                tipsForCandidates: [
                    "Practice on LeetCode or HackerRank",
                    "Think out loud while solving problems",
                    "Start with brute force, then optimize",
                    "Test your code with edge cases"
                ]
            },
            {
                roundType: "SYSTEM_DESIGN",
                title: "System Design Round",
                durationMinutes: 60,
                format: "WHITEBOARD",
                description: "Design discussion to evaluate architectural thinking and scalability knowledge.",
                whatToExpect: [
                    "Design a large-scale system from scratch",
                    "Discussion of trade-offs and decisions",
                    "Deep dive into specific components",
                    "Questions about scalability and reliability"
                ],
                tipsForCandidates: [
                    "Clarify requirements before designing",
                    "Start with high-level architecture",
                    "Consider scalability from the beginning",
                    "Discuss trade-offs openly"
                ]
            },
            {
                roundType: "BEHAVIORAL",
                title: "Behavioral Round",
                durationMinutes: 45,
                format: "VIDEO",
                description: "Interview to assess soft skills, teamwork, and cultural fit.",
                whatToExpect: [
                    "Questions about past experiences",
                    "Situational scenarios",
                    "Discussion of teamwork and leadership",
                    "Questions about handling conflict"
                ],
                tipsForCandidates: [
                    "Use the STAR method (Situation, Task, Action, Result)",
                    "Prepare specific examples from your experience",
                    "Be honest about challenges and failures",
                    "Show self-awareness and growth mindset"
                ]
            },
            {
                roundType: "TAKE_HOME",
                title: "Take-Home Assignment",
                durationMinutes: 180,
                format: "TAKE_HOME",
                description: "A practical project to demonstrate your skills in a realistic setting.",
                whatToExpect: [
                    "A real-world problem to solve",
                    "3-5 days to complete typically",
                    "Clear requirements and deliverables",
                    "Follow-up discussion about your solution"
                ],
                tipsForCandidates: [
                    "Read all requirements carefully",
                    "Manage your time effectively",
                    "Write clean, documented code",
                    "Include a README with setup instructions"
                ]
            },
            {
                roundType: "HIRING_MANAGER",
                title: "Hiring Manager Round",
                durationMinutes: 45,
                format: "VIDEO",
                description: "Final discussion with the hiring manager about the role and team.",
                whatToExpect: [
                    "Deep dive into your experience",
                    "Discussion of team dynamics",
                    "Questions about career goals",
                    "Opportunity to ask detailed questions"
                ],
                tipsForCandidates: [
                    "Prepare thoughtful questions about the team",
                    "Be ready to discuss your long-term goals",
                    "Show genuine interest in the role",
                    "Be yourself - this is about mutual fit"
                ]
            }
        ]
    }
}
