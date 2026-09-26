/**
 * No chrome here: the sign-in screens use the shared auth shell in `(shell)`
 * (plan/auth AUTH-4), and onboarding keeps the marketing navbar and footer in its
 * own layout.
 */
export default function AuthLayout({ children }: Readonly<{ children: React.ReactNode }>) {
    return <>{children}</>;
}
