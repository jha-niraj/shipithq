'use client'

import { ScrollArea } from "@repo/ui/components/ui/scroll-area"
import { StatBand } from "@repo/ui/components/ui/stat-band"
import { useState, useEffect } from 'react'
import {
    Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle
} from '@repo/ui/components/ui/sheet'
import {
    Tabs, TabsContent, TabsList, TabsTrigger
} from '@repo/ui/components/ui/tabs'
import { Button } from '@repo/ui/components/ui/button'
import { Input } from '@repo/ui/components/ui/input'
import { Label } from '@repo/ui/components/ui/label'
import {
    Coins, DollarSign
} from 'lucide-react'
import {
    setGoalCreditPrice, getGoalEarnings, getGoalPurchases
} from '@/actions/(main)/pathfinder'
import toast from '@repo/ui/components/ui/sonner'
import Image from 'next/image'
import { InlineLoader } from "@repo/ui/components/ui/inline-loader"

interface CreatorEarningsSheetProps {
    open: boolean
    onOpenChange: (open: boolean) => void
    goalId: string
    goalTitle: string
    isPublic: boolean
}

export function CreatorEarningsSheet({
    open,
    onOpenChange,
    goalId,
    goalTitle: _goalTitle,
    isPublic,
}: CreatorEarningsSheetProps) {
    const [price, setPrice] = useState<string>('')
    const [saving, setSaving] = useState(false)
    const [earnings, setEarnings] = useState<{ id: string; amount: number; sourceUserId: string | null; createdAt: Date }[]>([])
    const [totalEarned, setTotalEarned] = useState(0)
    const [purchases, setPurchases] = useState<Array<{
        id: string
        creditsPaid: number
        createdAt: Date
        buyer: { id: string; name: string | null; username: string | null; image: string | null }
    }>>([])

    useEffect(() => {
        if (!open || !goalId) return
        getGoalEarnings(goalId).then((r) => {
            if (r.success) {
                setEarnings(r.earnings)
                setTotalEarned(r.totalEarned)
                setPrice(r.creditPrice != null ? String(r.creditPrice) : '')
            }
        })
        getGoalPurchases(goalId).then((r) => {
            if (r.success) setPurchases(r.purchases)
        })
    }, [open, goalId])

    const handleSavePrice = async () => {
        if (!goalId) return
        const num = price.trim() === '' ? null : parseInt(price, 10)
        if (num !== null && (isNaN(num) || num < 0 || num > 9999)) {
            toast.error('Price must be between 0 and 9999')
            return
        }
        setSaving(true)
        try {
            const result = await setGoalCreditPrice(goalId, num)
            if (result.success) {
                setPrice(num != null ? String(num) : '')
                toast.success(num != null ? `Price set to ${num} credits` : 'Goal is now free')
                onOpenChange(false)
            } else {
                toast.error(result.error)
            }
        } finally {
            setSaving(false)
        }
    }

    if (!isPublic) return null

    return (
        <Sheet open={open} onOpenChange={onOpenChange}>
            <SheetContent className="sm:max-w-md lg:max-w-lg" side="right">
                <SheetHeader>
                    <SheetTitle className="flex items-center gap-2">
                        <Coins className="w-5 h-5 text-neutral-900 dark:text-neutral-100" />
                        Goal Earnings
                    </SheetTitle>
                    <SheetDescription>
                        Set a credit price for your public goal and track earnings.
                    </SheetDescription>
                </SheetHeader>
                <Tabs defaultValue="earnings" className="mt-6">
                    <TabsList className="grid w-full grid-cols-2">
                        <TabsTrigger value="earnings">Price & Earnings</TabsTrigger>
                        <TabsTrigger value="purchases">Who Purchased</TabsTrigger>
                    </TabsList>
                    <TabsContent value="earnings" className="space-y-6 mt-4">
                        <div>
                            <Label htmlFor="price">Credit price for this goal</Label>
                            <p className="text-xs text-neutral-500 dark:text-neutral-400 mb-2">
                                When others copy this goal, they pay this many credits (0 = free)
                            </p>
                            <div className="flex gap-2">
                                <Input
                                    id="price"
                                    type="number"
                                    min={0}
                                    max={9999}
                                    placeholder="0"
                                    value={price}
                                    onChange={(e) => setPrice(e.target.value)}
                                />
                                <Button onClick={handleSavePrice} disabled={saving}>
                                    {saving ? <InlineLoader size="sm" /> : 'Save'}
                                </Button>
                            </div>
                        </div>
                        <StatBand
                            size="sm"
                            cols={1}
                            items={[
                                { icon: DollarSign, label: "Total earned from this goal", value: `${totalEarned} credits` },
                            ]}
                        />

                        {
                            earnings.length > 0 && (
                                <div>
                                    <p className="text-sm font-medium mb-2">Recent transactions</p>
                                    <ScrollArea className="min-h-0 flex-1" viewportClassName="space-y-2 max-h-48" reflow>
                                        {
                                            earnings.map((e) => (
                                                <div
                                                    key={e.id}
                                                    className="flex items-center justify-between p-2 rounded border border-neutral-200 dark:border-neutral-800 text-sm"
                                                >
                                                    <span className="text-neutral-800 dark:text-neutral-100">+{e.amount} credits</span>
                                                    <span className="text-neutral-500 dark:text-neutral-400 text-xs">
                                                        {new Date(e.createdAt).toLocaleDateString()}
                                                    </span>
                                                </div>
                                            ))
                                        }
                                    </ScrollArea>
                                </div>
                            )
                        }
                    </TabsContent>
                    <TabsContent value="purchases" className="space-y-4 mt-4">
                        {
                            purchases.length === 0 ? (
                                <div className="py-8 text-center text-sm text-neutral-500 dark:text-neutral-400">
                                    No purchases yet. When users copy your goal for credits, they will appear here.
                                </div>
                            ) : (
                                <div className="space-y-2">
                                    {
                                        purchases.map((p) => (
                                            <div
                                                key={p.id}
                                                className="flex items-center gap-3 p-3 rounded-lg border border-neutral-200 dark:border-neutral-800"
                                            >
                                                <div className="w-8 h-8 rounded-full bg-neutral-200 dark:bg-neutral-700 overflow-hidden">
                                                    {
                                                        p.buyer.image ? (
                                                            <Image
                                                                src={p.buyer.image}
                                                                alt=""
                                                                width={32}
                                                                height={32}
                                                                className="w-full h-full object-cover"
                                                            />
                                                        ) : (
                                                            <div className="w-full h-full flex items-center justify-center text-xs font-medium text-neutral-500 dark:text-neutral-400">
                                                                {(p.buyer.name || p.buyer.username || '?')[0]}
                                                            </div>
                                                        )
                                                    }
                                                </div>
                                                <div className="flex-1 min-w-0">
                                                    <p className="text-sm font-medium truncate">
                                                        {p.buyer.name || p.buyer.username || 'Unknown'}
                                                    </p>
                                                    <p className="text-xs text-neutral-500 dark:text-neutral-400">
                                                        {p.creditsPaid} credits • {new Date(p.createdAt).toLocaleDateString()}
                                                    </p>
                                                </div>
                                            </div>
                                        ))
                                    }
                                </div>
                            )
                        }
                    </TabsContent>
                </Tabs>
            </SheetContent>
        </Sheet>
    )
}