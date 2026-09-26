'use client'

import { useState } from 'react'
import { signIn } from '@repo/auth/client'
import Image from 'next/image'
import { 
    Card, CardContent, CardDescription, CardHeader, CardTitle 
} from '@repo/ui/components/ui/card'
import { Button } from '@repo/ui/components/ui/button'
import { Input } from '@repo/ui/components/ui/input'
import { Label } from '@repo/ui/components/ui/label'
import { 
    User, Key, Mail, Check } from 'lucide-react'
import toast from '@repo/ui/components/ui/sonner'
import { useUserStore } from '@/app/store/useUserStore'
import { changePassword, setPassword } from '@/actions/(auth)/auth/auth.actions'
import { updateUserProfile } from '@/actions/(main)/user/user.action'
import { useRouter } from "next/navigation"
import { InlineLoader } from "@repo/ui/components/ui/inline-loader"
import { DeleteAccountCard } from "./delete-account"

interface AccountSettingsContentProps {
    user: {
        id: string
        name: string | null
        email: string
        image: string | null
        emailVerified: boolean | null
        hasPassword: boolean
        createdAt: Date
    }
    linkedProviders: string[]
}

export function AccountSettingsContent({ user, linkedProviders }: AccountSettingsContentProps) {
    const router = useRouter()
    const { updateUser, fetchUser } = useUserStore()
    const [name, setName] = useState(user.name || '')
    const [isSavingName, setIsSavingName] = useState(false)
    const [currentPassword, setCurrentPassword] = useState('')
    const [newPassword, setNewPassword] = useState('')
    const [confirmPassword, setConfirmPassword] = useState('')
    const [isChangingPassword, setIsChangingPassword] = useState(false)
    const [isConnectingGoogle, setIsConnectingGoogle] = useState(false)

    const hasGoogle = linkedProviders.includes('google')

    const handleSaveName = async () => {
        if (name.trim() === user.name) return
        setIsSavingName(true)
        try {
            await updateUserProfile({ name: name.trim() })
            await updateUser({ name: name.trim() })
            await fetchUser()
            toast.success('Name updated successfully')
        } catch {
            toast.error('Failed to update name')
        } finally {
            setIsSavingName(false)
        }
    }

    const handleSetPassword = async () => {
        if (newPassword.length < 8) {
            toast.error('Password must be at least 8 characters')
            return
        }
        if (newPassword !== confirmPassword) {
            toast.error('Those passwords do not match')
            return
        }
        setIsChangingPassword(true)
        try {
            const res = await setPassword(newPassword)
            if (!res.success) {
                toast.error(res.error ?? 'Could not set a password')
                return
            }
            setNewPassword('')
            setConfirmPassword('')
            toast.success('Password set. You can now sign in with your email.')
            // The card has to switch to the change-password branch, and `hasPassword` is
            // derived on the server from the linked providers - so this needs a real
            // refresh, not local state.
            router.refresh()
        } catch {
            toast.error('Could not set a password')
        } finally {
            setIsChangingPassword(false)
        }
    }

    const handleChangePassword = async () => {
        if (newPassword.length < 8) {
            toast.error('Password must be at least 8 characters')
            return
        }
        if (newPassword !== confirmPassword) {
            toast.error('Passwords do not match')
            return
        }
        setIsChangingPassword(true)
        try {
            const result = await changePassword(currentPassword, newPassword)
            if (result.success) {
                toast.success(result.message)
                setCurrentPassword('')
                setNewPassword('')
                setConfirmPassword('')
            } else {
                toast.error(result.error)
            }
        } catch {
            toast.error('Failed to change password')
        } finally {
            setIsChangingPassword(false)
        }
    }

    const handleConnectGoogle = async () => {
        setIsConnectingGoogle(true)
        try {
            await signIn.social({ provider: 'google', callbackURL: '/settings/account' })
        } catch {
            toast.error('Failed to connect Google')
        } finally {
            setIsConnectingGoogle(false)
        }
    }

    return (
        <div className="space-y-6">
            {/* Account Information */}
            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <User className="w-5 h-5" />
                        Account Information
                    </CardTitle>
                    <CardDescription>
                        Your basic account details
                    </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                    <div className="flex items-center gap-4">
                        <div className="relative w-16 h-16 rounded-full overflow-hidden bg-muted">
                            <Image
                                src={user.image || '/default-avatar.png'}
                                alt="Avatar"
                                fill
                                className="object-cover"
                            />
                        </div>
                        <div className="flex-1 space-y-2">
                            <Label htmlFor="name">Display Name</Label>
                            <div className="flex gap-2">
                                <Input
                                    id="name"
                                    value={name}
                                    onChange={(e) => setName(e.target.value)}
                                    placeholder="Your name"
                                    className="max-w-xs"
                                />
                                <Button
                                    onClick={handleSaveName}
                                    disabled={isSavingName || name.trim() === user.name}
                                >
                                    {isSavingName ? (
                                        <InlineLoader size="sm" />
                                    ) : (
                                        'Save'
                                    )}
                                </Button>
                            </div>
                        </div>
                    </div>
                    <div className="space-y-2">
                        <Label className="flex items-center gap-2">
                            <Mail className="w-4 h-4" />
                            Email
                        </Label>
                        <div className="flex items-center gap-2">
                            <Input
                                value={user.email}
                                disabled
                                className="max-w-xs bg-muted"
                            />
                            {user.emailVerified && (
                                <span className="flex items-center gap-1 text-sm text-neutral-800 dark:text-neutral-100">
                                    <Check className="w-4 h-4" />
                                    Verified
                                </span>
                            )}
                        </div>
                        <p className="text-xs text-muted-foreground">
                            Email cannot be changed. Contact support if needed.
                        </p>
                    </div>
                </CardContent>
            </Card>

            {/* Password */}
            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <Key className="w-5 h-5" />
                        Password
                    </CardTitle>
                    <CardDescription>
                        {user.hasPassword
                            ? 'Change your password'
                            : 'Set a password to sign in with email'}
                    </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                    {user.hasPassword ? (
                        <>
                            <div className="space-y-2">
                                <Label htmlFor="current-password">Current Password</Label>
                                <Input
                                    id="current-password"
                                    type="password"
                                    value={currentPassword}
                                    onChange={(e) => setCurrentPassword(e.target.value)}
                                    placeholder="Enter current password"
                                />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="new-password">New Password</Label>
                                <Input
                                    id="new-password"
                                    type="password"
                                    value={newPassword}
                                    onChange={(e) => setNewPassword(e.target.value)}
                                    placeholder="At least 8 characters"
                                />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="confirm-password">Confirm New Password</Label>
                                <Input
                                    id="confirm-password"
                                    type="password"
                                    value={confirmPassword}
                                    onChange={(e) => setConfirmPassword(e.target.value)}
                                    placeholder="Confirm new password"
                                />
                            </div>
                            <Button
                                onClick={handleChangePassword}
                                disabled={
                                    isChangingPassword ||
                                    !currentPassword ||
                                    !newPassword ||
                                    newPassword !== confirmPassword
                                }
                            >
                                {isChangingPassword ? (
                                    <InlineLoader size="sm" className="mr-2" />
                                ) : null}
                                Change Password
                            </Button>
                        </>
                    ) : (
                        /* No password yet - Google, GitHub or a magic link. There is no current
                           password to ask for, so this branch does not, and `setPassword` is
                           guarded by the session instead.

                           This used to be a paragraph telling the user to go and use the
                           forgot-password flow on the sign-in page: sign out of the thing you
                           are signed in to, in order to prove you own an address you have
                           already proved you own. */
                        <>
                            <div className="space-y-2">
                                <Label htmlFor="set-password">New Password</Label>
                                <Input
                                    id="set-password"
                                    type="password"
                                    value={newPassword}
                                    onChange={(e) => setNewPassword(e.target.value)}
                                    placeholder="At least 8 characters"
                                />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="set-password-confirm">Confirm Password</Label>
                                <Input
                                    id="set-password-confirm"
                                    type="password"
                                    value={confirmPassword}
                                    onChange={(e) => setConfirmPassword(e.target.value)}
                                    placeholder="Confirm password"
                                />
                            </div>
                            <Button
                                onClick={handleSetPassword}
                                disabled={
                                    isChangingPassword ||
                                    newPassword.length < 8 ||
                                    newPassword !== confirmPassword
                                }
                            >
                                {isChangingPassword ? <InlineLoader size="sm" className="mr-2" /> : null}
                                Set Password
                            </Button>
                            <p className="text-sm text-muted-foreground">
                                You currently sign in with {linkedProviders.filter((p) => p !== "credential").join(", ") || "a provider"}.
                                Setting a password adds email sign-in; it does not remove that.
                            </p>
                        </>
                    )}
                </CardContent>
            </Card>

            {/* Connected Accounts */}
            <Card>
                <CardHeader>
                    <CardTitle>Connected Accounts</CardTitle>
                    <CardDescription>
                        Link your social accounts for easier sign-in
                    </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div className="flex items-center justify-between p-4 rounded-lg border bg-card">
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-lg bg-white dark:bg-neutral-800 flex items-center justify-center border">
                                <svg className="w-5 h-5" viewBox="0 0 24 24">
                                    <path
                                        fill="#4285F4"
                                        d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                                    />
                                    <path
                                        fill="#34A853"
                                        d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                                    />
                                    <path
                                        fill="#FBBC05"
                                        d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                                    />
                                    <path
                                        fill="#EA4335"
                                        d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                                    />
                                </svg>
                            </div>
                            <div>
                                <p className="font-medium">Google</p>
                                <p className="text-sm text-muted-foreground">
                                    {hasGoogle
                                        ? 'Connected'
                                        : 'Connect for easier sign-in'}
                                </p>
                            </div>
                        </div>
                        {hasGoogle ? (
                            <span className="flex items-center gap-1 text-sm text-neutral-800 dark:text-neutral-100">
                                <Check className="w-4 h-4" />
                                Connected
                            </span>
                        ) : (
                            <Button
                                variant="outline"
                                onClick={handleConnectGoogle}
                                disabled={isConnectingGoogle}
                            >
                                {isConnectingGoogle ? (
                                    <InlineLoader size="sm" />
                                ) : (
                                    'Connect'
                                )}
                            </Button>
                        )}
                    </div>
                </CardContent>
            </Card>
            <DeleteAccountCard email={user.email} />
        </div>
    )
}
