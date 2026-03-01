"use client"

import { Sidebar } from "@/components/layout/Sidebar"
import { Bell } from "lucide-react"

export default function DashboardLayout({
    children,
}: {
    children: React.ReactNode
}) {
    return (
        <div className="flex min-h-screen" style={{ backgroundColor: "#f5f7f3" }}>
            <Sidebar />
            <div className="flex-1 flex flex-col min-w-0">
                {/* Top bar */}
                <header className="sticky top-0 z-40 flex items-center justify-end gap-4 h-14 px-6 bg-white/80 backdrop-blur" style={{ borderBottom: "1px solid #e8f0e4" }}>
                    <button className="relative p-2 rounded-full hover:bg-gray-100 transition-colors">
                        <Bell className="w-5 h-5 text-gray-500" />
                        <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-red-500 rounded-full" />
                    </button>
                    <div className="flex items-center justify-center w-9 h-9 rounded-full bg-emerald-600 text-white text-sm font-bold">
                        NV
                    </div>
                </header>
                {/* Main content */}
                <main className="flex-1 p-6 overflow-auto">
                    {children}
                </main>
            </div>
        </div>
    )
}
