import type { Testimonial } from "./types"

/**
 * DEMO testimonials (Niraj, 2026-09-26: "add the testimonial section with a demo ...
 * we will see how it's showing"). These are NOT real people or real quotes.
 *
 * They render only where `showDemoTestimonials()` is true: in development, or on a build
 * with NEXT_PUBLIC_DEMO_TESTIMONIALS="1" (a preview). A production build without that
 * flag never shows them, and the wall carries a "Demo" label whenever they are on
 * screen. Replace them by filling students.ts / companies.ts with real, consented quotes;
 * once a file has enough real entries, the demo list for it is ignored.
 */

export function showDemoTestimonials(): boolean {
    return process.env.NODE_ENV !== "production" || process.env.NEXT_PUBLIC_DEMO_TESTIMONIALS === "1"
}

export const DEMO_STUDENTS: Testimonial[] = [
    { name: "Aarav Mehta", handle: "aarav_builds", role: "Final year, CSE", source: "x", date: "2026-09-12", text: "The sprint mock asked me why I picked Postgres over Mongo for my own project. That is exactly what the interviewer asked two weeks later.", featured: true },
    { name: "Sneha Iyer", role: "SDE-1, fintech", source: "linkedin", date: "2026-09-08", text: "Code actually running in a container changed how I practise. No more 'works in my head' solutions." },
    { name: "Rohan Das", handle: "rohandas", role: "Career switcher", source: "x", date: "2026-09-03", text: "Four sprints, one finished project, and for once I could talk about every decision in it." },
    { name: "Ishita Kapoor", role: "Third year, IT", source: "email", date: "2026-08-29", text: "The ATS score told me the three keywords my resume was missing for the role. Got the call." },
    { name: "Karthik R", handle: "karthik_dev", role: "Backend intern", source: "x", date: "2026-08-24", text: "Hidden tests are humbling. My 'accepted' now actually means accepted." },
    { name: "Meera Nair", role: "New grad", source: "linkedin", date: "2026-08-20", text: "Voice mocks at 11pm, no one to schedule with. I stopped freezing on phone screens." },
    { name: "Vikram Singh", handle: "vsingh", role: "Full-stack developer", source: "x", date: "2026-08-15", text: "The match score on jobs is blunt, and that is the point. I stopped applying blind." },
    { name: "Ananya Rao", role: "Final year, ECE", source: "email", date: "2026-08-09", text: "System design on a canvas instead of a blank doc. It finally clicked." },
    { name: "Dev Patel", handle: "devpatel", role: "Self-taught", source: "x", date: "2026-08-02", text: "A public profile link with my projects did more than my PDF resume ever did." },
    { name: "Priya Menon", role: "SDE intern", source: "linkedin", date: "2026-07-28", text: "The mentor remembering what I got wrong last week is the feature I did not know I needed." },
]

export const DEMO_COMPANIES: Testimonial[] = [
    { name: "Neha Sharma", role: "Engineering Manager, SaaS startup", source: "linkedin", date: "2026-09-10", text: "We designed the loop once and every candidate got the same rounds. Our debriefs got shorter and calmer." },
    { name: "Arjun Malhotra", role: "Founder, dev tools", source: "email", date: "2026-09-05", text: "Hard gates on aptitude and DSA meant we only spent interview hours on people who could code." },
    { name: "Kavya Reddy", role: "Tech Recruiter", source: "linkedin", date: "2026-08-30", text: "One board from Applied to Hired replaced three spreadsheets and a lot of Slack threads." },
    { name: "Siddharth Jain", role: "CTO, logistics", source: "email", date: "2026-08-26", text: "The AI draft gave us a sensible pipeline in a minute. We changed two pass marks and shipped it." },
    { name: "Pooja Verma", role: "Hiring Manager, fintech", source: "linkedin", date: "2026-08-19", text: "Custom roles let our interviewers see candidates without seeing salary notes. Small thing, big relief." },
    { name: "Rahul Bose", role: "Head of Engineering", source: "email", date: "2026-08-12", text: "Take-homes scored on the same board as everything else. Finally one place for the whole decision." },
    { name: "Tanvi Kulkarni", role: "Talent Lead, edtech", source: "linkedin", date: "2026-08-06", text: "Company-email-only sign-up sounds strict until you have cleaned up a shared workspace once." },
    { name: "Manish Gupta", role: "Engineering Lead", source: "email", date: "2026-07-30", text: "The question pool drawing fresh sets per attempt stopped answers going around the college groups." },
]

/** Demo quotes for /uni (REV-31); same gate and label as the others. Not real people. */
export const DEMO_UNIVERSITIES: Testimonial[] = [
    { name: "Dr. Meenakshi Rao", role: "Training and Placement Officer", source: "email", date: "2026-09-11", featured: true, text: "For the first time I walked into placement season knowing which departments needed help, and I knew it in July, not December." },
    { name: "Prof. Sanjay Kulkarni", role: "Head of Department, CSE", source: "linkedin", date: "2026-09-06", text: "Every section got a fresh project brief for their stack. Nobody could hand in last year's repo." },
    { name: "Anita Joseph", role: "Placement Officer", source: "linkedin", date: "2026-09-01", text: "Voice mocks ran overnight for the whole batch. Faculty only sat in on the final round." },
    { name: "Dr. Harish Menon", role: "Dean of Academics", source: "email", date: "2026-08-27", text: "Roles meant our TAs could help with assignments without seeing anything they should not." },
    { name: "Ritu Saxena", role: "Assistant Professor, IT", source: "linkedin", date: "2026-08-20", text: "The assessments with deadlines replaced a Google Form, three reminders and a spreadsheet." },
    { name: "Vikram Patil", role: "Placement Coordinator", source: "email", date: "2026-08-14", text: "Companies asked about students' projects in the first round. Our students could actually answer." },
    { name: "Dr. Farah Khan", role: "Principal", source: "linkedin", date: "2026-08-08", text: "One place to see how ready the batch is. That is what I had been asking the placement cell for." },
]
