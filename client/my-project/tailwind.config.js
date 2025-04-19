/** @type {import('tailwindcss').Config} */
export default {
    content: [
        "./index.html",
        "./src/**/*.{js,ts,jsx,tsx}",
    ],
    theme: {
        extend: {
            typography: {
                invert: {
                    css: {
                        '--tw-prose-body': '#fff',
                        '--tw-prose-headings': '#f87171',
                        '--tw-prose-bold': '#fff',
                    }
                }
            }
        },
    },
    plugins: [
        require('@tailwindcss/typography'),
    ],
}
