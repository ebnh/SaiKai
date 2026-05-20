import { Suspense } from "react";
import { ImportResumedConversationScreen } from "@/components/import-resumed-conversation-screen";

export default function ImportResumedConversationPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-sand p-6 text-sm text-ink/70 dark:bg-[#0f141c] dark:text-slate-300">読み込み中...</div>}>
      <ImportResumedConversationScreen />
    </Suspense>
  );
}
