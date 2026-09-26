import {
    AtSign, Bell, Briefcase, CircleCheck, CircleX, FileCheck2, Inbox, Mail, MessageSquare, RotateCcw, ShieldCheck, Sparkles, Trophy, UserPlus, Users,
} from "lucide-react"
import type { LucideIcon } from "lucide-react"

/** One icon per kind for the meta row (plan/inbox IN-3). Unknown kinds get a bell. */
const ICONS: Record<string, LucideIcon> = {
    THREAD: MessageSquare,
    MESSAGE_FROM_COMPANY: MessageSquare,
    MESSAGE_FROM_STUDENT: MessageSquare,
    INVITED: Mail,
    DECLINED: CircleX,
    OUTCOME: Trophy,
    STUDENT_OUTCOME: Trophy,
    ROUND_SCORED: CircleCheck,
    SEND_VIEWED: AtSign,
    SEND_RECEIVED: FileCheck2,
    SEND_WITHDRAWN: RotateCcw,
    COMPANY_PUBLISHED: Briefcase,
    COMPANY_REQUEST_REJECTED: CircleX,
    PRACTICE_REMINDER: Sparkles,
    TEAM_INVITE: UserPlus,
    MEMBER_JOINED: Users,
    CLAIM_APPROVED: ShieldCheck,
    GENERAL: Inbox,
}

export function kindIcon(kind: string): LucideIcon {
    return ICONS[kind] ?? Bell
}
