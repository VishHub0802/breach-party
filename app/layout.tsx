import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Breach Party · A cybersecurity party game",
  description: "Create a room and race through ten cybersecurity scenarios. Choose Standard (6–7 minutes) or Hard (9–10 minutes) for 2–8 players.",
  icons: {
    icon: { url: "/favicon.svg?v=dossier-b", type: "image/svg+xml" },
    shortcut: "/favicon.svg?v=dossier-b",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" data-theme="light" suppressHydrationWarning>
      <body className="antialiased">
        <script dangerouslySetInnerHTML={{__html: "try{document.documentElement.dataset.theme=localStorage.getItem('breach-party-theme-v1')==='dark'?'dark':'light'}catch{}"}} />
        {children}
      </body>
    </html>
  );
}
