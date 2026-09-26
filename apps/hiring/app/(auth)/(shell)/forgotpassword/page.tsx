"use client"

import { ForgotPasswordForm } from "@repo/ui/components/auth/password-reset";
import { emailOtp } from "@repo/auth/client";

export default function ForgotPasswordPage() {
    return (
        <ForgotPasswordForm
            placeholder="you@company.com"
            request={async (email) => {
                const { error } = await emailOtp.requestPasswordReset({ email });
                return error ? error.message || "Error sending the reset code" : null;
            }}
        />
    );
}
