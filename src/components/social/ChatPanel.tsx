"use client";

import { useEffect, useMemo, useState } from "react";
import { useSocket } from "@/hooks/useSocket";
import { CHAT_EMOTES } from "@/lib/chat";

type ChatMessage = {
  id: string; matchId: string; parentId: string | null; body: string; status: string; createdAt: string;
  user: { id: string; username: string; displayName: string | null; avatarUrl: string | null };
  emotes: string[];
};

const MOD_ROLES = new Set(["ADMIN", "OWNER", "OPERATOR"]);

export function ChatPanel({ matchId }: { matchId: string }) {
  const socket = useSocket({ matchId });
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [viewerId, setViewerId] = useState<string | null>(null);
  const [viewerRole, setViewerRole] = useState<string | null>(null);
  const [body, setBody] = useState("");
  const [replyTo, setReplyTo] = useState<ChatMessage | null>(null);
  const [status, setStatus] = useState<string | null>(null);
  const [sending, setSending] = useState(false);

  useEffect(() => {
    let active = true;
    void fetch(`/api/social/chat?matchId=${encodeURIComponent(matchId)}`, { cache: "no-store" })
      .then(async (response) => { const data = await response.json(); if (!response.ok) throw new Error(data.error ?? "Unable to load chat"); if (active) { setMessages(data.messages ?? []); setViewerId(data.viewer?.id ?? null); setViewerRole(data.viewer?.role ?? null); } })
      .catch(() => active && setStatus("Chat is temporarily unavailable."));
    return () => { active = false; };
  }, [matchId]);

  useEffect(() => {
    function onMessage(event: { matchId: string; message: ChatMessage }) {
      if (event.matchId !== matchId) return;
      setMessages((current) => current.some((item) => item.id === event.message.id) ? current : [...current, event.message].slice(-100));
    }
    function onModerated(event: { matchId: string; messageId: string; action: string }) {
      if (event.matchId !== matchId) return;
      setMessages((current) => event.action === "delete" || event.action === "hide" ? current.filter((item) => item.id !== event.messageId) : current);
    }
    socket.on("chat:message", onMessage);
    socket.on("chat:moderated", onModerated);
    return () => { socket.off("chat:message", onMessage); socket.off("chat:moderated", onModerated); };
  }, [socket, matchId]);

  const grouped = useMemo(() => {
    const roots = messages.filter((message) => !message.parentId);
    return roots.map((root) => ({ root, replies: messages.filter((message) => message.parentId === root.id) }));
  }, [messages]);

  function insertEmote(token: string) {
    setBody((value) => `${value}${value && !value.endsWith(" ") ? " " : ""}${token} `);
  }

  async function sendMessage() {
    if (!body.trim() || sending) return;
    setSending(true); setStatus(null);
    try {
      const response = await fetch("/api/social/chat", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ matchId, body, parentId: replyTo?.id ?? null }) });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error ?? "Unable to send message");
      setMessages((current) => current.some((item) => item.id === data.message.id) ? current : [...current, data.message].slice(-100));
      setBody(""); setReplyTo(null);
    } catch (error) { setStatus(error instanceof Error ? error.message : "Unable to send message"); }
    finally { setSending(false); }
  }

  async function moderate(message: ChatMessage, action: "hide" | "delete" | "mute") {
    const durationMinutes = action === "mute" ? 10 : undefined;
    const response = await fetch("/api/social/chat", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action, messageId: message.id, durationMinutes }) });
    if (!response.ok) { const data = await response.json().catch(() => ({})); setStatus(data.error ?? "Moderation failed"); }
  }

  async function report(message: ChatMessage) {
    const response = await fetch("/api/social/chat", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "report", messageId: message.id, reason: "Inappropriate or disruptive chat" }) });
    setStatus(response.ok ? "Thanks — the message was reported." : "Unable to report this message.");
  }

  function renderMessage(message: ChatMessage, nested = false) {
    return (
      <article key={message.id} className={`${nested ? "ml-5 border-l border-ink-faint/20 pl-3" : ""} group py-2`}>
        <div className="flex items-start gap-2">
          <div className="min-w-0 flex-1">
            <div className="flex items-baseline gap-2"><span className="text-xs font-semibold text-ink">{message.user.displayName || message.user.username}</span><span className="text-[10px] text-ink-muted">@{message.user.username}</span><time className="ml-auto text-[10px] text-ink-faint">{new Date(message.createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</time></div>
            <p className="mt-0.5 break-words text-sm text-ink-secondary">{message.body}</p>
            <div className="mt-1 flex flex-wrap gap-1 opacity-0 transition group-hover:opacity-100 focus-within:opacity-100">
              <button type="button" onClick={() => setReplyTo(message)} className="text-[10px] text-ink-muted hover:text-ink">Reply</button>
              {viewerId !== message.user.id && <button type="button" onClick={() => void report(message)} className="text-[10px] text-ink-muted hover:text-ink">Report</button>}
              {(viewerId === message.user.id || MOD_ROLES.has(viewerRole ?? "")) && <button type="button" onClick={() => void moderate(message, "delete")} className="text-[10px] text-ink-muted hover:text-ink">Delete</button>}
              {MOD_ROLES.has(viewerRole ?? "") && viewerId !== message.user.id && <><button type="button" onClick={() => void moderate(message, "hide")} className="text-[10px] text-ink-muted hover:text-ink">Hide</button><button type="button" onClick={() => void moderate(message, "mute")} className="text-[10px] text-ink-muted hover:text-ink">Mute 10m</button></>}
            </div>
          </div>
        </div>
      </article>
    );
  }

  return (
    <section className="surface-card flex min-h-[24rem] flex-col overflow-hidden" aria-label="Live chat">
      <header className="flex items-center justify-between border-b border-ink-faint/20 px-4 py-3"><div><h2 className="text-sm font-semibold text-ink">Live chat</h2><p className="text-[11px] text-ink-muted">Realtime conversation · threaded replies</p></div><span className="status-neutral text-[10px]">{messages.length} messages</span></header>
      <div className="min-h-0 flex-1 overflow-y-auto px-4" aria-live="polite">
        {grouped.length === 0 ? <div className="flex h-48 items-center justify-center text-xs text-ink-muted">Be the first to say GG.</div> : grouped.map(({ root, replies }) => <div key={root.id}>{renderMessage(root)}{replies.map((reply) => renderMessage(reply, true))}</div>)}
      </div>
      <div className="border-t border-ink-faint/20 p-3">
        {replyTo && <div className="mb-2 flex items-center justify-between rounded border border-corner-p1/20 bg-corner-p1/5 px-2 py-1 text-[11px] text-ink-muted"><span>Replying to @{replyTo.user.username}</span><button type="button" onClick={() => setReplyTo(null)} className="text-ink hover:underline">Cancel</button></div>}
        <div className="mb-2 flex flex-wrap gap-1">{CHAT_EMOTES.map((emote) => <button key={emote.token} type="button" onClick={() => insertEmote(emote.token)} className="rounded border border-ink-faint/20 px-2 py-1 text-[10px] text-ink-muted hover:border-corner-p1/40 hover:text-ink">{emote.label}</button>)}</div>
        <div className="flex gap-2"><input value={body} onChange={(event) => setBody(event.target.value)} onKeyDown={(event) => { if (event.key === "Enter" && !event.shiftKey) { event.preventDefault(); void sendMessage(); } }} maxLength={500} placeholder="Message the viewers…" className="min-w-0 flex-1 rounded border border-ink-faint/30 bg-arena-950 px-3 py-2 text-sm text-ink outline-none placeholder:text-ink-faint focus:border-corner-p1/50" aria-label="Chat message" /><button type="button" disabled={!body.trim() || sending} onClick={() => void sendMessage()} className="rounded border border-corner-p1/40 bg-corner-p1/10 px-3 py-2 text-xs font-semibold text-ink hover:bg-corner-p1/20 disabled:opacity-50">{sending ? "…" : "Send"}</button></div>
        {status && <p role="status" className="mt-2 text-[11px] text-ink-muted">{status}</p>}
      </div>
    </section>
  );
}
