"use client";

import { Suspense } from "react";
import { ShipItHQLoader } from "@repo/ui/components/ui/shipithq-loader";
import ResetPassword from "./_components/resetpassword";

export default function ResetPasswordPage() {
    return (
        <Suspense fallback={<ShipItHQLoader />}>
            <div>
                <ResetPassword />
            </div>
        </Suspense>
    );
}