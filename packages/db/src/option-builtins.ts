/*
 * The built-in choices for fields that used to be free text (plan/hiring-ui HU-2).
 * No imports, so a client component can read them. Values typed through "Other" go
 * to `option_value` (src/options.ts) and join these for everyone once 3 different
 * organisations have used them (Niraj, 2026-09-28).
 */

export const OPTION_KINDS = [
    "department", "job_title", "location", "skill", "benefit", "industry", "city", "tech", "member_title",
    // Students' profiles, resumes and prep in apps/main (plan/ui-forms).
    "company", "university", "degree", "field_of_study", "skill_category",
] as const
export type OptionKind = (typeof OPTION_KINDS)[number]

export const OPTION_BUILTINS: Record<OptionKind, readonly string[]> = {
    department: [
        "Engineering", "Product", "Design", "Data", "DevOps and Infrastructure", "Quality Assurance", "Security",
        "Sales", "Marketing", "Customer Success", "Operations", "Finance", "People and HR", "Legal",
    ],
    job_title: [
        "Software Engineer", "Software Engineer Intern", "Frontend Engineer", "Backend Engineer", "Full Stack Engineer",
        "Mobile Engineer", "Android Engineer", "iOS Engineer", "Data Engineer", "Data Analyst", "Data Scientist",
        "Machine Learning Engineer", "DevOps Engineer", "Site Reliability Engineer", "QA Engineer", "SDET",
        "Security Engineer", "Engineering Manager", "Product Manager", "Product Designer", "UI/UX Designer",
        "Technical Writer", "Solutions Engineer",
    ],
    location: [
        "Remote (India)", "Bengaluru", "Hyderabad", "Pune", "Mumbai", "Delhi NCR", "Gurugram", "Noida", "Chennai",
        "Kolkata", "Ahmedabad", "Jaipur", "Kochi", "Chandigarh", "Indore", "Coimbatore", "Remote (Worldwide)",
    ],
    skill: [
        "JavaScript", "TypeScript", "React", "Next.js", "Node.js", "Python", "Java", "Go", "Rust", "C++", "C#",
        "Kotlin", "Swift", "SQL", "PostgreSQL", "MySQL", "MongoDB", "Redis", "GraphQL", "REST API", "AWS", "GCP",
        "Azure", "Docker", "Kubernetes", "Terraform", "Git", "CI/CD", "Linux", "System Design", "Data Structures",
        "Machine Learning", "Figma", "Agile",
    ],
    benefit: [
        "Health insurance", "Family health insurance", "Remote work", "Hybrid work", "Flexible hours", "ESOPs",
        "Learning budget", "Home office allowance", "Paid time off", "Parental leave", "Performance bonus",
        "Meal allowance", "Gym membership", "Laptop provided",
    ],
    industry: [
        "Technology", "Software (SaaS)", "Fintech", "E-commerce", "Edtech", "Healthtech", "AI and Machine Learning",
        "Developer Tools", "Gaming", "Media", "Consulting", "Manufacturing", "Retail", "Real Estate", "Logistics",
    ],
    city: [
        "Bengaluru", "Hyderabad", "Pune", "Mumbai", "New Delhi", "Gurugram", "Noida", "Chennai", "Kolkata",
        "Ahmedabad", "Jaipur", "Kochi", "Chandigarh", "Indore", "Coimbatore",
    ],
    tech: [
        "React", "Next.js", "Node.js", "TypeScript", "Python", "Go", "Java", "PostgreSQL", "MongoDB", "Redis",
        "AWS", "GCP", "Azure", "Docker", "Kubernetes", "Kafka", "GraphQL", "Cloudflare",
    ],
    member_title: [
        "Founder", "Co-founder", "CEO", "CTO", "VP Engineering", "Engineering Manager", "Tech Lead", "Head of HR",
        "HR Manager", "Recruiter", "Talent Acquisition", "Hiring Manager", "Software Engineer",
    ],
    company: [
        "Google", "Microsoft", "Amazon", "Meta", "Apple", "Atlassian", "Uber", "Adobe", "Salesforce", "Oracle",
        "Flipkart", "Swiggy", "Zomato", "Razorpay", "CRED", "PhonePe", "Paytm", "Zerodha", "Meesho", "Freshworks",
        "Infosys", "TCS", "Wipro", "HCLTech", "Accenture", "Cognizant", "Tech Mahindra", "Capgemini", "Deloitte",
    ],
    university: [
        "IIT Bombay", "IIT Delhi", "IIT Madras", "IIT Kanpur", "IIT Kharagpur", "IIT Roorkee", "IIT Guwahati",
        "IIT Hyderabad", "IIT (BHU) Varanasi", "IIIT Hyderabad", "IIIT Bangalore", "IIIT Delhi", "BITS Pilani",
        "NIT Trichy", "NIT Surathkal", "NIT Warangal", "NIT Calicut", "Delhi Technological University (DTU)",
        "Netaji Subhas University of Technology (NSUT)", "Jadavpur University", "Anna University", "VIT Vellore",
        "Manipal Institute of Technology", "SRM Institute of Science and Technology", "Amity University",
        "Thapar Institute of Engineering and Technology", "PES University", "RV College of Engineering",
        "College of Engineering Pune (COEP)", "Delhi University", "Mumbai University", "Chandigarh University",
        "Lovely Professional University", "KIIT University",
    ],
    degree: [
        "B.Tech", "B.E.", "B.Sc", "BCA", "B.Com", "BBA", "B.A.", "Diploma", "M.Tech", "M.E.", "M.Sc", "MCA", "MBA",
        "M.A.", "PhD", "Class 12", "Class 10",
    ],
    field_of_study: [
        "Computer Science", "Computer Science and Engineering", "Information Technology", "Electronics and Communication",
        "Electrical Engineering", "Electrical and Electronics", "Mechanical Engineering", "Civil Engineering",
        "Chemical Engineering", "Data Science", "Artificial Intelligence and Machine Learning", "Mathematics",
        "Mathematics and Computing", "Physics", "Statistics", "Commerce", "Economics", "Business Administration", "Design",
    ],
    skill_category: [
        "Languages", "Frontend", "Backend", "Databases", "Cloud and DevOps", "Mobile", "Data and ML", "Tools",
        "Testing", "Soft skills",
    ],
}

/** "node js", "Node.JS" and "NodeJS" are one value: lower case, letters and digits only. */
export function optionKey(value: string): string {
    return value.toLowerCase().normalize("NFKD").replace(/[^a-z0-9+#]+/g, "")
}

/** A value fit to save and show others, or why not. */
export function checkOptionValue(raw: string): { ok: true; value: string } | { ok: false; reason: string } {
    const value = raw.replace(/\s+/g, " ").trim()
    if (value.length < 2) return { ok: false, reason: "Too short." }
    if (value.length > 60) return { ok: false, reason: "Keep it under 60 characters." }
    if (/https?:|www\.|@|<|>/i.test(value)) return { ok: false, reason: "No links, emails or tags." }
    if (!/[a-z]/i.test(value)) return { ok: false, reason: "Use letters." }
    if (/(.)\1{3,}/i.test(value)) return { ok: false, reason: "That doesn't look like a real value." }
    return { ok: true, value }
}
