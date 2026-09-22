import type { Metadata } from "next";
import { getLearnerProfile } from "@/actions/(main)/practice/memory.action";
import { MemoryView } from "./_components/memory-view";

export const metadata: Metadata = {
    title: "What the mentor knows | ShipItHQ",
    description: "The concepts and mistakes the DSA mentor has recorded about you, with the evidence behind each.",
};

// Note: /practice/memory has two path segments, so the practice layout wrapper
// keeps the sidebar (it treats three or more as a full-screen workspace). A
// future route under here with three segments would lose it; see
// practice-layout-wrapper.tsx.
export default async function PracticeMemoryPage() {
    const profile = await getLearnerProfile();
    return <MemoryView profile={profile ?? { concepts: [], mistakes: [] }} />;
}
