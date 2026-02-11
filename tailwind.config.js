/** @type {import('tailwindcss').Config} */
export default {
    content: [
        './index.html',
        './src/**/*.{js,ts,jsx,tsx}',
        '../nablon-lego-ux/dist/**/*.{js,ts,jsx,tsx}',
        '../nablon-lego-ux/src/**/*.{js,ts,jsx,tsx}',
    ],
    theme: {
        extend: {
            animation: {
                'spin-slow': 'spin 3s linear infinite',
                'shimmer': 'shimmer 2s linear infinite',
                'pulse-glow': 'pulse-glow 2s ease-in-out infinite',
            },
            keyframes: {
                shimmer: {
                    '0%': { backgroundPosition: '200% 0' },
                    '100%': { backgroundPosition: '-200% 0' },
                },
                'pulse-glow': {
                    '0%, 100%': { opacity: '1', boxShadow: '0 0 20px rgba(6, 182, 212, 0.5)' },
                    '50%': { opacity: '0.8', boxShadow: '0 0 30px rgba(6, 182, 212, 0.8)' },
                },
            },
            colors: {
                'bg-primary': '#09090b',
                'bg-surface': 'rgba(255, 255, 255, 0.05)',
                'text-primary': '#ededed',
                'text-secondary': '#9ca3af',
                'text-tertiary': '#6b7280',
            },
        },
    },
    plugins: [],
}
