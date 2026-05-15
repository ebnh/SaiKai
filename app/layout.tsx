import type { Metadata } from "next";
import "@/app/globals.css";
import { NotesProvider } from "@/providers/notes-provider";

export const metadata: Metadata = {
  title: "SaiKai | 対話を再開しやすいノート",
  description: "外部AIとの会話を、再開しやすい対話ノートに変換して保存するアプリ"
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="ja">
      <body className="bg-sand text-ink antialiased">
        <NotesProvider>{children}</NotesProvider>
      </body>
    </html>
  );
}
