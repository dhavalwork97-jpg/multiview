"use client";
import { AnimatePresence, motion } from "framer-motion";
export function FloatingReactionCanvas({ reactions }: { reactions: Array<{ id: string; reaction: string }> }) { return <div aria-hidden className="pointer-events-none absolute inset-0 overflow-hidden"><AnimatePresence>{reactions.map((item, index) => <motion.span key={item.id} initial={{ opacity: 0, y: 20, x: `${20 + (index * 17) % 60}%` }} animate={{ opacity: 1, y: -180 }} exit={{ opacity: 0 }} transition={{ duration: 3.5 }} className="absolute bottom-4 text-3xl">{item.reaction}</motion.span>)}</AnimatePresence></div>; }
