import fs from 'fs';

let content = fs.readFileSync('src/components/BaseDadosView.tsx', 'utf8');

// Colors
content = content.replace(/text-gray-500/g, "text-[var(--router-text-muted)]");
content = content.replace(/text-gray-400/g, "text-[var(--router-text-muted)]");
content = content.replace(/text-gray-300/g, "text-[var(--router-text-soft)]");
content = content.replace(/text-gray-200/g, "text-[var(--router-text)]");
content = content.replace(/text-slate-100/g, "text-[var(--router-text)]");
content = content.replace(/text-white/g, "text-[var(--router-text)]");
content = content.replace(/text-slate-500/g, "text-[var(--router-text-muted)]");
content = content.replace(/text-slate-400/g, "text-[var(--router-text-muted)]");
content = content.replace(/text-slate-300/g, "text-[var(--router-text-soft)]");
content = content.replace(/text-slate-200/g, "text-[var(--router-text)]");
content = content.replace(/border-\[#14203a\]/g, "border-[var(--router-border)]");
content = content.replace(/border-\[#1a2d54\]/g, "border-[var(--router-border)]");
content = content.replace(/border-\[#1e3a6c\]\/30/g, "border-[var(--router-border)]");
content = content.replace(/border-\[#1e3a6c\]\/50/g, "border-[var(--router-border)]");

content = content.replace(/border-slate-800/g, "border-[var(--router-border)]");
content = content.replace(/border-slate-700/g, "border-[var(--router-border)]");
content = content.replace(/border-slate-600/g, "border-[var(--router-border)]");
content = content.replace(/bg-\[#14203a\]/g, "bg-[var(--router-surface-2)]");

// Backgrounds
content = content.replace(/bg-\[#0e1726\]\/40/g, "bg-[var(--router-surface)]");
content = content.replace(/bg-\[#0e1726\]\/30/g, "bg-[var(--router-surface)]");
content = content.replace(/bg-\[#0e1726\]/g, "bg-[var(--router-surface-2)]");
content = content.replace(/hover:bg-\[#0e1726\]\/60/g, "hover:bg-[var(--router-surface-3)]");
content = content.replace(/hover:bg-\[#121c30\]\/40/g, "hover:bg-[var(--router-surface-3)]");
content = content.replace(/bg-black\/10/g, "bg-[var(--router-surface-2)]");

// Form inputs
content = content.replace(/w-full bg-\[var\(--router-surface-2\)\] border border-\[var\(--router-border\)\] rounded px-3 py-2 text-\[var\(--router-text\)\] placeholder-\[var\(--router-text-muted\)\] focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500/g, "router-input w-full px-3 py-2");

// Buttons
content = content.replace(/bg-indigo-600 hover:bg-indigo-500 text-\[var\(--router-text\)\]/g, "router-button-primary");
content = content.replace(/bg-indigo-600 hover:bg-indigo-500 text-white/g, "router-button-primary");
content = content.replace(/bg-\[var\(--router-surface-2\)\] hover:bg-\[#1a2d54\] text-\[var\(--router-text-soft\)\]/g, "router-button-secondary");

// Status classes
content = content.replace(/text-emerald-400/g, "text-[var(--router-success)]");
content = content.replace(/text-rose-400/g, "text-[var(--router-danger)]");
content = content.replace(/text-amber-400/g, "text-[var(--router-warning)]");
content = content.replace(/text-blue-400/g, "text-[var(--router-info)]");

fs.writeFileSync('src/components/BaseDadosView.tsx', content);
