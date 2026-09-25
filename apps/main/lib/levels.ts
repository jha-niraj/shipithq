/**
 * The XP ladder, moved out of `actions/(main)/user/level.action.ts` unchanged so a
 * page can read it: a `"use server"` file may only export async functions.
 * (plan/profile PRF-8 - the profile computed levels as `xp % 1000`, which put
 * level 2 at 1000 XP when it is 500.)
 */

// Level configuration - this could be moved to database later
export const LEVEL_CONFIG = [
    { level: 1, title: "Coding Newbie", xpRequired: 0, xpReward: 0, creditsReward: 0, description: "Welcome to the coding journey!", icon: "🌱", color: "#10B981" },
	{ level: 2, title: "Code Explorer", xpRequired: 500, xpReward: 50, creditsReward: 10, description: "Starting to explore the world of code", icon: "🔍", color: "#737373" },
	{ level: 3, title: "Bug Squasher", xpRequired: 1200, xpReward: 75, creditsReward: 15, description: "Getting good at finding and fixing bugs", icon: "🐛", color: "#a3a3a3" },
	{ level: 4, title: "Algorithm Apprentice", xpRequired: 2500, xpReward: 100, creditsReward: 25, description: "Learning the art of algorithms", icon: "⚙️", color: "#525252" },
	{ level: 5, title: "Code Artisan", xpRequired: 5000, xpReward: 150, creditsReward: 35, description: "Crafting beautiful and efficient code", icon: "🎨", color: "#EF4444" },
	{ level: 6, title: "Debug Detective", xpRequired: 8500, xpReward: 200, creditsReward: 50, description: "Master of debugging mysteries", icon: "🕵️", color: "#737373" },
	{ level: 7, title: "Algorithm Architect", xpRequired: 13500, xpReward: 300, creditsReward: 75, description: "Designing complex algorithmic solutions", icon: "🏗️", color: "#059669" },
	{ level: 8, title: "Code Virtuoso", xpRequired: 20000, xpReward: 400, creditsReward: 100, description: "Virtuoso level coding skills", icon: "🎭", color: "#DC2626" },
	{ level: 9, title: "Tech Sage", xpRequired: 30000, xpReward: 600, creditsReward: 150, description: "Wise in the ways of technology", icon: "🧙‍♂️", color: "#525252" },
	{ level: 10, title: "Code Grandmaster", xpRequired: 50000, xpReward: 1000, creditsReward: 250, description: "Grandmaster of the coding realm", icon: "👑", color: "#B91C1C" }
];


/** Lifetime XP. `totalXp` is the real counter; older users only ever had `currentXp`. */
export function lifetimeXp(user: { totalXp?: number | null; currentXp?: number | null }): number {
    return user.totalXp || user.currentXp || 0
}

// Calculate what level a user should be based on their total XP
export function calculateLevelFromXp(totalXp: number) {
    let currentLevel = 1;
    let nextLevelXp = 0;
    let currentLevelXp = 0;

    for (const config of LEVEL_CONFIG) {
        if (totalXp >= config.xpRequired) {
            currentLevel = config.level;
            currentLevelXp = config.xpRequired;
            // Find next level XP
            const nextLevel = LEVEL_CONFIG.find(l => l.level === config.level + 1);
            nextLevelXp = nextLevel ? nextLevel.xpRequired : config.xpRequired;
        } else {
            break;
        }
    }

    const progressInCurrentLevel = totalXp - currentLevelXp;
    const xpNeededForNextLevel = nextLevelXp - currentLevelXp;
    const progressPercentage = xpNeededForNextLevel > 0 ? (progressInCurrentLevel / xpNeededForNextLevel) * 100 : 100;

    return {
        currentLevel,
        progressInCurrentLevel,
        xpNeededForNextLevel: nextLevelXp - totalXp,
        progressPercentage: Math.min(100, Math.max(0, progressPercentage)),
        nextLevelXp,
        currentLevelXp
    };
}

