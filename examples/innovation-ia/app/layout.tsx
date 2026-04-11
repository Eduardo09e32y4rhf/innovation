import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
    title: "Innovation IA - Vercel Brain",
    description: "Estrategista Mestre da Innovation.ia",
};

export default function RootLayout({
    children,
}: Readonly<{
    children: React.ReactNode;
}>) {
    return (
        <html lang="pt-br">
            <body>{children}</body>
        </html>
    );
}
