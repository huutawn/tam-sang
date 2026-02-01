"use client"

import { Button } from "@/components/ui/button"
import { motion } from "framer-motion"
import { ArrowRight } from "lucide-react"

export function HeroSection() {
    return (
        <section className="relative overflow-hidden py-20 sm:py-32 lg:pb-32 xl:pb-36">
            <div className="container px-4 md:px-6">
                <div className="flex flex-col items-center gap-4 text-center">
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.5 }}
                    >
                        <h1 className="text-3xl font-bold tracking-tighter sm:text-5xl md:text-6xl lg:text-7xl bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent">
                            Transparency at the Heart of Giving
                        </h1>
                    </motion.div>
                    <motion.p
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.5, delay: 0.2 }}
                        className="max-w-[700px] text-muted-foreground md:text-xl"
                    >
                        Experience a new era of charity where every donation is tracked, verified by AI, and recorded on an immutable ledger.
                    </motion.p>
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.5, delay: 0.4 }}
                        className="flex flex-col gap-2 min-[400px]:flex-row"
                    >
                        <Button size="lg" className="gap-2">
                            Start Donating <ArrowRight className="h-4 w-4" />
                        </Button>
                        <Button size="lg" variant="outline">
                            Learn More
                        </Button>
                    </motion.div>
                </div>
            </div>

            {/* Abstract Background Element */}
            <div className="absolute top-0 left-0 -z-10 h-full w-full overflow-hidden opacity-20 transform -skew-y-6">
                <div className="absolute top-[20%] left-[10%] h-72 w-72 rounded-full bg-primary blur-[100px]" />
                <div className="absolute bottom-[20%] right-[10%] h-72 w-72 rounded-full bg-secondary blur-[100px]" />
            </div>
        </section>
    )
}
