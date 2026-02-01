"use client"

import * as React from "react"
import { ThemeProvider as NextThemesProvider } from "next-themes"
import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
// import { ReactQueryStreamedHydration } from "@tanstack/react-query-next-experimental" // Optional for advanced SSR

export function Providers({ children }: { children: React.ReactNode }) {
    const [queryClient] = React.useState(() => new QueryClient({
        defaultOptions: {
            queries: {
                staleTime: 5 * 60 * 1000, // 5 minutes
                refetchOnWindowFocus: false,
                retry: 1,
            },
        },
    }))

    return (
        <NextThemesProvider
            attribute="class"
            defaultTheme="light"
            enableSystem
            disableTransitionOnChange
        >
            <QueryClientProvider client={queryClient}>
                {/* <ReactQueryStreamedHydration> */}
                {children}
                {/* </ReactQueryStreamedHydration> */}
            </QueryClientProvider>
        </NextThemesProvider>
    )
}
