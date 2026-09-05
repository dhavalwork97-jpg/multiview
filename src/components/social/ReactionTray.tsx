"use client";
import { motion } from "framer-motion";
import { REACTIONS, type Reaction } from "@/lib/social-types";
export function ReactionTray({ onReact }: { onReact: (reaction: Reaction) => void }) { return <div className="flex justify-between gap-1 rounded-card border border-arena-700 bg-arena-900/95 p-1.5 sm:max-w-sm" aria-label="Live reactions">{REACTIONS.map((reaction) => <motion.button whileTap={{ scale: 0.82 }} key={reaction} onClick={() => onReact(reaction)} className="min-h-11 min-w-11 rounded-card text-xl hover:bg-arena-700 focus:outline-none focus:ring-2 focus:ring-signal-live" aria-label={`React ${reaction}`}>{reaction}</motion.button>)}</div>; }
