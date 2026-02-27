import * as React from "react"
import { cn } from "@/lib/utils"

export interface ButtonProps
    extends React.ButtonHTMLAttributes<HTMLButtonElement> {
    variant?: "primary" | "secondary" | "ghost" | "destructive" | "outline"
    size?: "default" | "sm" | "lg" | "icon"
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
    ({ className, variant = "primary", size = "default", ...props }, ref) => {
        return (
            <button
                ref={ref}
                className={cn(
                    "inline-flex items-center justify-center rounded-xl font-medium transition-all duration-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50",
                    {
                        "bg-gradient-to-r from-purple-600 to-pink-600 text-white hover:scale-105 shadow-lg shadow-purple-500/25 border-0":
                            variant === "primary",
                        "bg-zinc-800 text-zinc-100 hover:bg-zinc-700 border border-zinc-700":
                            variant === "secondary",
                        "hover:bg-zinc-800/50 text-zinc-300 hover:text-white":
                            variant === "ghost",
                        "bg-red-500/10 text-red-500 hover:bg-red-500/20 border border-red-500/50":
                            variant === "destructive",
                        "border border-zinc-700 bg-transparent hover:bg-zinc-800 text-zinc-100":
                            variant === "outline",
                        "h-10 px-4 py-2": size === "default",
                        "h-9 px-3 text-xs": size === "sm",
                        "h-12 px-8 text-lg": size === "lg",
                        "h-10 w-10": size === "icon",
                    },
                    className
                )}
                {...props}
            />
        )
    }
)
Button.displayName = "Button"

export { Button }
