import type { Metadata } from "next";
import { DM_Sans, Lexend } from "next/font/google";
// @ts-ignore
// Global stylesheet imported once for the whole app (Tailwind base styles, CSS variables, etc.).
import "./globals.css";
import { ThemeProvider } from "@/components/theme-provider";
import ControlsProvider from "@/components/controls-provider";
import { PrimeReactProvider } from "primereact/api";
import Tailwind from 'primereact/passthrough/tailwind';
import { KnobPassThroughType } from "primereact/knob";
import { SVGProps } from "react";

// Load the default UI font (Next.js will self-host and inject the CSS automatically).
const dmSans = DM_Sans({ subsets: ['latin'] });

// Load an alternative font used for the dyslexia-friendly mode.
// `variable` registers the font as a CSS custom property so we can toggle it via a class.
const lexend = Lexend({
    subsets: ["latin"],
    variable: "--font-dyslexia",
});

// Metadata used by Next.js to populate the document title/description (SEO + browser tab text).
export const metadata: Metadata = {
    title: "Web-Based DAW",
    description: "A Web-Based Digital Audio Workstation",
};

export default function RootLayout({
    children,
}: Readonly<{
    // `children` is the page content for the current route.
    children: React.ReactNode;
}>) {
    return (
        // `<html>` and `<body>` here define the overall document shell for all routes.
        <html lang="en" suppressHydrationWarning>
            <body
                // Apply the default font, register the dyslexia font variable, and improve text rendering.
                className={`${dmSans.className} ${lexend.variable} antialiased`}
            >
                {/* PrimeReact provider: configures how PrimeReact components render across the app. */}
                <PrimeReactProvider value={{
                    unstyled: true, pt: {
                        // Start with PrimeReact's Tailwind passthrough preset...
                        ...Tailwind,
                        // ...and override specific component classes (here: the Knob component).
                        knob: {
                            ...Tailwind.knob,
                            // Type assertions are used because PrimeReact's passthrough types are strict for SVG props.
                            label: "text-primary fill-primary" as KnobPassThroughType<SVGProps<SVGTextElement>>,
                            range: 'stroke-current transition duration-100 ease-in stroke-muted fill-none' as KnobPassThroughType<SVGProps<SVGTextElement>>,
                            value: 'animate-dash-frame stroke-primary fill-none' as KnobPassThroughType<SVGProps<SVGTextElement>>
                        }
                    }
                }}>
                    {/* Controls provider: stores global DAW transport state (time, play/pause, zoom, AudioContext, etc.). */}
                    <ControlsProvider>
                        {/* Theme provider: toggles light/dark theme by writing a class onto the document. */}
                        <ThemeProvider
                            attribute="class"
                            // Default to system, but allow user to override.
                            defaultTheme="system"
                            enableSystem
                            // Avoid CSS transition flashes when switching themes.
                            disableTransitionOnChange
                        >
                            {children}
                        </ThemeProvider>
                    </ControlsProvider>
                </PrimeReactProvider>
            </body>
        </html>
    );
}
