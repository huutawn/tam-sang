import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"
import { cn } from "@/lib/utils"

const badgeVariants = cva(
    "inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold transition-colors",
    {
        variants: {
            variant: {
                default: "border-transparent bg-primary text-primary-foreground",
                secondary: "border-transparent bg-secondary text-secondary-foreground",
                destructive: "border-transparent bg-red-100 text-red-700",
                outline: "text-foreground",
                success: "border-transparent bg-emerald-100 text-emerald-700",
                warning: "border-transparent bg-amber-100 text-amber-700",
                info: "border-transparent bg-blue-100 text-blue-700",
                purple: "border-transparent bg-purple-100 text-purple-700",
                teal: "border-transparent bg-teal-100 text-teal-700",
            },
        },
        defaultVariants: {
            variant: "default",
        },
    }
)

const Badge = React.forwardRef<
    HTMLDivElement,
    React.HTMLAttributes<HTMLDivElement> & VariantProps<typeof badgeVariants>
>(({ className, variant, ...props }, ref) => (
    <div ref={ref} className={cn(badgeVariants({ variant }), className)} {...props} />
))
Badge.displayName = "Badge"

export { Badge, badgeVariants }
