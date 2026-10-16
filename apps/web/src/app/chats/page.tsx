'use client';
// S8 — Chat / negotiation hub. Empty state until the Communication engine lesson.
import { StateScreen } from '@/components/ui';

export default function ChatsPage() {
  return (
    <div className="space-y-4">
      <h1 className="text-xl font-bold">Chats</h1>
      <StateScreen
        emoji="💬"
        title="No conversations yet"
        body="Buyer-seller chats, offers and negotiations will live here once the Communication engine is built."
      />
    </div>
  );
}
