import fs from 'fs';

let content = fs.readFileSync('src/components/BaseDadosView.tsx', 'utf8');

// Badges
content = content.replace(/bg-indigo-950 text-indigo-300/g, "router-badge router-badge-info");
content = content.replace(/bg-emerald-950 text-emerald-300/g, "router-badge router-badge-success");
content = content.replace(/bg-amber-950 text-amber-300/g, "router-badge router-badge-warning");
content = content.replace(/bg-emerald-900\/50 text-emerald-350 cursor-pointer hover:bg-emerald-800/g, "router-badge router-badge-available cursor-pointer");
content = content.replace(/bg-red-950 text-red-300 cursor-pointer hover:bg-red-900/g, "router-badge router-badge-critical cursor-pointer");
content = content.replace(/bg-red-900\/45 text-red-300/g, "router-badge router-badge-critical");
content = content.replace(/bg-rose-950 text-rose-350/g, "router-badge router-badge-danger");
content = content.replace(/bg-emerald-500\/10 text-\[var\(--router-success\)\] border border-emerald-500\/20/g, "router-badge router-badge-success");
content = content.replace(/bg-gray-500\/10 border border-gray-500\/20/g, "router-badge router-badge-neutral");

// Buttons & Actions
content = content.replace(/bg-indigo-600 hover:bg-indigo-500 border border-indigo-400\/30 text-\[var\(--router-text\)\] px-3.5 py-1.5 rounded-lg text-xs font-bold font-sans cursor-pointer flex items-center gap-1/g, "router-button-primary");
content = content.replace(/bg-indigo-900\/40 hover:bg-indigo-850 border border-indigo-700\/30 text-indigo-200/g, "bg-[var(--router-surface-2)] hover:bg-[var(--router-surface-3)] text-[var(--router-text)] border border-[var(--router-border)]");
content = content.replace(/bg-red-950\/40 hover:bg-red-900\/50 border border-red-800\/20 text-red-300/g, "bg-[var(--router-danger)]/10 hover:bg-[var(--router-danger)]/20 border border-[var(--router-danger)]/30 text-[var(--router-danger)]");
content = content.replace(/hover:bg-amber-500\/10 text-amber-500/g, "hover:opacity-80 text-[var(--router-warning)]");
content = content.replace(/hover:bg-emerald-500\/10 text-\[var\(--router-success\)\]/g, "hover:opacity-80 text-[var(--router-success)]");

// Backgrounds
content = content.replace(/hover:bg-indigo-950\/20/g, "hover:bg-[var(--router-surface-3)]");
content = content.replace(/hover:bg-indigo-950\/15/g, "hover:bg-[var(--router-surface-3)]");
content = content.replace(/bg-emerald-400/g, "bg-[var(--router-success)]");
content = content.replace(/bg-gray-400/g, "bg-[var(--router-text-muted)]");

fs.writeFileSync('src/components/BaseDadosView.tsx', content);
