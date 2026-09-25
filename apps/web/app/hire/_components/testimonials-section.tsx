"use client"

import { motion } from "framer-motion"
import { TestimonialsColumn } from "./testimonials-column";

const testimonials = [
    {
        text: "ShipItHQ completely transformed my coding journey. The AI interview prep helped me land my first internship at a startup!",
        image: "https://randomuser.me/api/portraits/men/1.jpg",
        name: "Arjun Sharma",
        role: "Computer Science Student",
    },
    {
        text: "I went from struggling with DSA to confidently solving medium-level problems. The project-based learning approach is exactly what I needed.",
        image: "https://randomuser.me/api/portraits/women/2.jpg",
        name: "Priya Patel",
        role: "Final Year BTech",
    },
    {
        text: "The open source contribution track gave me real GitHub experience. I got 5 PRs merged in my first month - that's unreal!",
        image: "https://randomuser.me/api/portraits/men/3.jpg",
        name: "Rahul Verma",
        role: "Self-taught Developer",
    },
    {
        text: "As a bootcamp grad, I needed real projects for my portfolio. The AI-generated project scaffolds are game-changing.",
        image: "https://randomuser.me/api/portraits/women/4.jpg",
        name: "Sneha Gupta",
        role: "Career Switcher",
    },
    {
        text: "The mock interview feature is brutal but effective. I failed 10 times before I got good - now I have offers from 3 companies!",
        image: "https://randomuser.me/api/portraits/men/5.jpg",
        name: "Vikram Singh",
        role: "MCA Graduate",
    },
    {
        text: "Learning to code was intimidating until I found ShipItHQ. The structured paths made everything click into place.",
        image: "https://randomuser.me/api/portraits/women/6.jpg",
        name: "Ananya Reddy",
        role: "2nd Year Engineering",
    },
    {
        text: "The system design agent helped me understand Learns that YouTube tutorials never could. Worth every credit spent!",
        image: "https://randomuser.me/api/portraits/men/7.jpg",
        name: "Karthik Menon",
        role: "Software Engineer",
    },
    {
        text: "Finally, a platform that doesn't just teach theory. I built and deployed 3 full-stack apps in 2 months.",
        image: "https://randomuser.me/api/portraits/women/8.jpg",
        name: "Ishita Jain",
        role: "BCA Student",
    },
    {
        text: "The skill assessments are rigorous but fair. My certification from here actually impressed my interviewers.",
        image: "https://randomuser.me/api/portraits/men/9.jpg",
        name: "Aditya Kumar",
        role: "Fresher Developer",
    },
];

const firstColumn = testimonials.slice(0, 3);
const secondColumn = testimonials.slice(3, 6);
const thirdColumn = testimonials.slice(6, 9);

const Testimonials = () => {
    return (
        <section className="bg-white dark:bg-neutral-950 py-24 relative border-t border-neutral-100 dark:border-neutral-800">
            <div className="container max-w-7xl z-10 mx-auto px-6">
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
                    viewport={{ once: true }}
                    className="flex flex-col items-center justify-center max-w-2xl mx-auto text-center mb-12"
                >
                    <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full border border-neutral-200 dark:border-neutral-800 bg-neutral-50 dark:bg-neutral-900 text-neutral-600 dark:text-neutral-400 text-sm font-medium mb-6">
                        Student Success Stories
                    </div>
                    <h2 className="text-4xl md:text-5xl font-bold tracking-tight text-neutral-900 dark:text-white mb-4">
                        Loved by <span className="text-neutral-400 dark:text-neutral-600">learners</span>
                    </h2>
                    <p className="text-lg text-neutral-600 dark:text-neutral-400">
                        See how students are transforming their careers with our engineering intelligence suite.
                    </p>
                </motion.div>
                <div className="flex justify-center gap-6 [mask-image:linear-gradient(to_bottom,transparent,black_25%,black_75%,transparent)] max-h-[740px] overflow-hidden">
                    <TestimonialsColumn testimonials={firstColumn} duration={15} />
                    <TestimonialsColumn testimonials={secondColumn} className="hidden md:block" duration={19} />
                    <TestimonialsColumn testimonials={thirdColumn} className="hidden lg:block" duration={17} />
                </div>
            </div>
        </section>
    );
};

export default Testimonials;