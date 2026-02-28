import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Bot, Menu, X } from "lucide-react"
import { useState } from "react"

export function Navbar() {
    const [isOpen, setIsOpen] = useState(false)

    return (
        <nav className="fixed top-0 z-50 w-full border-b border-zinc-800 bg-black/50 backdrop-blur-lg">
            <div className="container mx-auto flex h-16 items-center justify-between px-4">
                <Link href="/" className="flex items-center space-x-2">
                    <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-purple-500 to-pink-500">
                        <Bot className="h-5 w-5 text-white" />
                    </div>
                    <span className="text-xl font-bold tracking-tight">Innovation.ia</span>
                </Link>

                {/* Desktop Menu */}
                <div className="hidden md:flex md:items-center md:space-x-8">
                    <Link href="/solutions" className="text-sm font-medium text-zinc-400 hover:text-white transition-colors">
                        Soluções
                    </Link>
                    <Link href="/pricing" className="text-sm font-medium text-zinc-400 hover:text-white transition-colors">
                        Preços
                    </Link>
                    <Link href="/about" className="text-sm font-medium text-zinc-400 hover:text-white transition-colors">
                        Sobre
                    </Link>
                    <div className="flex items-center space-x-4">
                        <Link href="/login">
                            <Button variant="ghost" size="sm">Entrar</Button>
                        </Link>
                        <Link href="/register">
                            <Button size="sm">Começar Agora</Button>
                        </Link>
                    </div>
                </div>

                {/* Mobile Toggle */}
                <button className="md:hidden" onClick={() => setIsOpen(!isOpen)}>
                    {isOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
                </button>
            </div>

            {/* Mobile Menu */}
            {isOpen && (
                <div className="border-b border-zinc-800 bg-black md:hidden">
                    <div className="flex flex-col space-y-4 p-4">
                        <Link href="/solutions" className="text-sm font-medium text-zinc-400 hover:text-white">
                            Soluções
                        </Link>
                        <Link href="/pricing" className="text-sm font-medium text-zinc-400 hover:text-white">
                            Preços
                        </Link>
                        <Link href="/about" className="text-sm font-medium text-zinc-400 hover:text-white">
                            Sobre
                        </Link>
                        <hr className="border-zinc-800" />
                        <Link href="/login">
                            <Button variant="ghost" className="w-full justify-start">Entrar</Button>
                        </Link>
                        <Link href="/register">
                            <Button className="w-full">Começar Agora</Button>
                        </Link>
                    </div>
                </div>
            )}
        </nav>
    )
}
