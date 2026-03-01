"use client";

import { useEffect, useRef } from "react";
import { useAuthStore } from "@/store/auth-store";
import { UserPayload } from "@/lib/auth-utils";

export function StoreInitializer({ user }: { user: UserPayload | null }) {
    const initialized = useRef(false);
    if (!initialized.current) {
        useAuthStore.setState({ user, isAuthenticated: !!user });
        initialized.current = true;
    }
    return null;
}
