"use client";

import ResetPassword from "./resetpassword";

/** The form reads `?email=` and owns its Suspense boundary (the kit's ResetPasswordForm). */
export default function ResetPasswordClient() {
    return <ResetPassword />;
}
