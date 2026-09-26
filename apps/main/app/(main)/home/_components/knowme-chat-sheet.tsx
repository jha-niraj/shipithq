"use client";

import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import {
    Bot, Send, MessageSquare, ExternalLink
} from "lucide-react";
import { Button } from "@repo/ui/components/ui/button";
import { Input } from "@repo/ui/components/ui/input";
import {
    Sheet, SheetContent, SheetHeader, SheetTitle
} from "@repo/ui/components/ui/sheet";
import { cn } from "@repo/ui/lib/utils";
import toast from "@repo/ui/components/ui/sonner";
import {
    hasKnowMeProfile, getMyKnowMeProfile
} from "@/actions/(main)/knowme/profile.action";
import {
    sendChatMessage, getOrCreateChatSession
} from "@/actions/(main)/knowme";
import type { KnowMeProfileFull } from "@/types/knowme";
import { InlineLoader } from "@repo/ui/components/ui/inline-loader"
import { ScrollArea } from "@repo/ui/components/ui/scroll-area"

interface ChatMessage {
    id: string;
    role: "user" | "assistant" | "system";
    content: string;
    createdAt: Date;
}

interface KnowmeChatSheetProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
}

export default function KnowmeChatSheet({
    open,
    onOpenChange,
}: KnowmeChatSheetProps) {
    const [profile, setProfile] = useState<KnowMeProfileFull | null>(null);
    const [isLoadingProfile, setIsLoadingProfile] = useState(false);
    const [messages, setMessages] = useState<ChatMessage[]>([]);
    const [inputValue, setInputValue] = useState("");
    const [isLoading, setIsLoading] = useState(false);
    const [sessionId, setSessionId] = useState<string | null>(null);
    const messagesEndRef = useRef<HTMLDivElement>(null);

    // Fetch profile when sheet opens
    useEffect(() => {
        if (!open) return;

        setIsLoadingProfile(true);
        setProfile(null);
        setMessages([]);
        setSessionId(null);

        hasKnowMeProfile()
            .then((check) => {
                if (!check.success || !check.data?.exists || check.data.status !== "ACTIVE") {
                    setProfile(null);
                    return;
                }
                return getMyKnowMeProfile();
            })
            .then((result) => {
                if (result?.success && result.data) {
                    setProfile(result.data);
                } else {
                    setProfile(null);
                }
            })
            .catch(() => setProfile(null))
            .finally(() => setIsLoadingProfile(false));
    }, [open]);

    // Initialize chat session when profile is loaded
    useEffect(() => {
        if (!profile?.id || !open) return;

        getOrCreateChatSession(profile.id)
            .then((result) => {
                if (result.success && result.data) {
                    setSessionId(result.data.id);
                    if (result.data.messages.length > 0) {
                        setMessages(
                            result.data.messages.map((m) => ({
                                id: m.id,
                                role: m.role,
                                content: m.content,
                                createdAt: m.createdAt,
                            }))
                        );
                    }
                }
            })
            .catch(() => { });
    }, [profile?.id, open]);

    // Auto-scroll to bottom
    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }, [messages]);

    const handleSendMessage = async () => {
        if (!inputValue.trim() || isLoading || !sessionId) return;

        const userMessage: ChatMessage = {
            id: Date.now().toString(),
            role: "user",
            content: inputValue.trim(),
            createdAt: new Date(),
        };

        setMessages((prev) => [...prev, userMessage]);
        setInputValue("");
        setIsLoading(true);

        try {
            const result = await sendChatMessage(sessionId, inputValue.trim());

            if (result.success && result.answer) {
                const aiMessage: ChatMessage = {
                    id: (Date.now() + 1).toString(),
                    role: "assistant",
                    content: result.answer,
                    createdAt: new Date(),
                };
                setMessages((prev) => [...prev, aiMessage]);
            } else {
                toast.error(result.error || "Failed to get response");
            }
        } catch {
            toast.error("Something went wrong");
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <Sheet open={open} onOpenChange={onOpenChange}>
            <SheetContent
                side="right"
                className="flex w-full flex-col p-0 sm:max-w-2xl"
            >
                <SheetHeader className="p-4 border-b shrink-0">
                    <SheetTitle className="flex items-center gap-2">
                        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-neutral-900 to-neutral-800 flex items-center justify-center">
                            <Bot className="w-5 h-5 text-white" />
                        </div>
                        KnowMe Chat
                    </SheetTitle>
                </SheetHeader>

                <div className="flex-1 min-h-0 flex flex-col overflow-hidden">
                    {
                        isLoadingProfile ? (
                            <div className="flex-1 flex items-center justify-center">
                                <InlineLoader size="lg" className="text-muted-foreground" />
                            </div>
                        ) : !profile ? (
                            <div className="flex-1 flex flex-col items-center justify-center p-6 text-center">
                                <div className="w-16 h-16 rounded-2xl bg-muted flex items-center justify-center mb-4">
                                    <MessageSquare className="w-8 h-8 text-muted-foreground" />
                                </div>
                                <p className="font-medium mb-2">Set up KnowMe first</p>
                                <p className="text-sm text-muted-foreground mb-4 max-w-xs">
                                    Create your AI portfolio assistant to chat with it from anywhere.
                                </p>
                                <Link href="/knowme" onClick={() => onOpenChange(false)}>
                                    <Button>Go to KnowMe</Button>
                                </Link>
                            </div>
                        ) : (
                            <>
                                <ScrollArea className="min-h-0 flex-1" viewportClassName="p-4 space-y-4" reflow>
                                    {
                                        messages.length === 0 && (
                                            <div className="text-center py-8">
                                                <p className="text-muted-foreground text-sm mb-2">
                                                    Ask a question about yourself
                                                </p>
                                                <p className="text-xs text-muted-foreground/80 max-w-xs mx-auto">
                                                    Try: &quot;What are my skills?&quot; or &quot;Tell me about my projects&quot;
                                                </p>
                                            </div>
                                        )
                                    }

                                    <AnimatePresence>
                                        {
                                            messages.map((message, index) => (
                                                <motion.div
                                                    key={message.id}
                                                    initial={{ opacity: 0, y: 10 }}
                                                    animate={{ opacity: 1, y: 0 }}
                                                    transition={{ delay: index * 0.03 }}
                                                    className={cn(
                                                        "flex gap-3",
                                                        message.role === "user" && "justify-end"
                                                    )}
                                                >
                                                    {
                                                        message.role === "assistant" && (
                                                            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-neutral-900 to-neutral-800 flex items-center justify-center flex-shrink-0">
                                                                <Bot className="w-4 h-4 text-white" />
                                                            </div>
                                                        )
                                                    }
                                                    <div
                                                        className={cn(
                                                            "max-w-[85%] rounded-2xl px-4 py-3 text-sm",
                                                            message.role === "user"
                                                                ? "bg-primary text-primary-foreground rounded-tr-none"
                                                                : "bg-muted rounded-tl-none"
                                                        )}
                                                    >
                                                        <p className="whitespace-pre-wrap">{message.content}</p>
                                                    </div>
                                                </motion.div>
                                            ))
                                        }
                                    </AnimatePresence>

                                    {
                                        isLoading && (
                                            <div className="flex gap-3">
                                                <div className="w-8 h-8 rounded-full bg-gradient-to-br from-neutral-900 to-neutral-800 flex items-center justify-center flex-shrink-0">
                                                    <Bot className="w-4 h-4 text-white" />
                                                </div>
                                                <div className="bg-muted rounded-2xl rounded-tl-none px-4 py-3">
                                                    <div className="flex gap-1">
                                                        <span className="w-2 h-2 rounded-full bg-muted-foreground animate-bounce [animation-delay:0ms]" />
                                                        <span className="w-2 h-2 rounded-full bg-muted-foreground animate-bounce [animation-delay:150ms]" />
                                                        <span className="w-2 h-2 rounded-full bg-muted-foreground animate-bounce [animation-delay:300ms]" />
                                                    </div>
                                                </div>
                                            </div>
                                        )
                                    }

                                    <div ref={messagesEndRef} />
                                </ScrollArea>
                                <div className="p-4 border-t shrink-0">
                                    <form
                                        onSubmit={(e) => {
                                            e.preventDefault();
                                            handleSendMessage();
                                        }}
                                        className="flex gap-3"
                                    >
                                        <Input
                                            value={inputValue}
                                            onChange={(e) => setInputValue(e.target.value)}
                                            placeholder="Ask about your skills, projects..."
                                            className="flex-1 rounded-xl"
                                            disabled={isLoading}
                                        />
                                        <Button
                                            type="submit"
                                            disabled={!inputValue.trim() || isLoading}
                                            className="shrink-0"
                                        >
                                            <Send className="w-4 h-4" />
                                        </Button>
                                    </form>
                                    <Link
                                        href="/knowme"
                                        className="inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground mt-2"
                                        onClick={() => onOpenChange(false)}
                                    >
                                        <ExternalLink className="w-3.5 h-3.5" />
                                        Open full KnowMe dashboard
                                    </Link>
                                </div>
                            </>
                        )
                    }
                </div>
            </SheetContent>
        </Sheet>
    );
}