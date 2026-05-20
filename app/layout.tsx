import type { Metadata } from "next";
import "@/app/globals.css";
import { NotesProvider } from "@/providers/notes-provider";
import { ThemeProvider } from "@/providers/theme-provider";

export const metadata: Metadata = {
  title: "SaiKai | 対話を再開しやすいノート",
  description: "外部AIとの会話を、再開しやすい対話ノートに変換して保存するアプリ"
};

const themeScript = `(() => {
  try {
    const stored = localStorage.getItem('saikai-theme');
    const theme = stored === 'dark' || stored === 'light'
      ? stored
      : (window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light');
    document.documentElement.classList.toggle('dark', theme === 'dark');
    document.documentElement.dataset.theme = theme;
    document.documentElement.style.colorScheme = theme;
  } catch {}
})();`;

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="ja" suppressHydrationWarning>
      <body className="bg-sand text-ink antialiased dark:bg-[#0f141c] dark:text-slate-100">
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
        <ThemeProvider>
          <NotesProvider>{children}</NotesProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
