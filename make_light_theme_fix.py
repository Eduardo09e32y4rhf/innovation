import os

globals_css = """@import "tailwindcss";

:root {
  --foreground-rgb: 0, 0, 0;
  --background-start-rgb: 214, 219, 220;
  --background-end-rgb: 255, 255, 255;
}

@media (prefers-color-scheme: dark) {
  :root {
    --foreground-rgb: 255, 255, 255;
    --background-start-rgb: 0, 0, 0;
    --background-end-rgb: 0, 0, 0;
  }
}

body {
  color: rgb(var(--foreground-rgb));
  background: linear-gradient(to bottom,
      transparent,
      rgb(var(--background-end-rgb))) rgb(var(--background-start-rgb));
}

@layer utilities {
  .text-balance {
    text-wrap: balance;
  }
}

/* Custom Enterprise Scrollbar */
::-webkit-scrollbar {
  width: 8px;
  height: 8px;
}

::-webkit-scrollbar-track {
  background: #f8fafc;
}

::-webkit-scrollbar-thumb {
  background: #e2e8f0;
  border-radius: 4px;
}

::-webkit-scrollbar-thumb:hover {
  background: #cbd5e1;
}

@layer components {
  .glass-panel {
    background-color: rgba(255, 255, 255, 0.7);
    @apply backdrop-blur-xl border border-slate-200 shadow-xl;
  }

  .glass-card {
    background-color: rgba(255, 255, 255, 0.4);
    @apply backdrop-blur-md border border-slate-200 rounded-xl transition-all duration-300;
  }

  .glass-card:hover {
    @apply border-purple-500/30;
  }

  .gradient-text {
    @apply bg-clip-text text-transparent bg-gradient-to-r from-purple-600 to-cyan-600;
  }

  .sidebar-link {
    @apply flex items-center gap-3 px-4 py-3 rounded-xl text-slate-500 transition-all duration-200;
  }

  .sidebar-link:hover {
    color: #0f172a;
    background-color: rgba(0, 0, 0, 0.05);
  }

  .sidebar-link.active {
    background-color: rgba(168, 85, 247, 0.1);
    @apply text-purple-600 border-l-2 border-purple-500 rounded-l-none;
  }
}

.animate-float {
  animation: float 6s ease-in-out infinite;
}

@keyframes float {
  0% {
    transform: translateY(0px);
  }

  50% {
    transform: translateY(-10px);
  }

  100% {
    transform: translateY(0px);
  }
}
"""
with open('frontend/app/globals.css', 'w') as f:
    f.write(globals_css)

print("Modifications applied!")
