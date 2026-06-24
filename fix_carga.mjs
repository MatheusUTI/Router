import fs from 'fs';

let content = fs.readFileSync('src/components/roteirizacao/CargaItem.tsx', 'utf8');

// Badges
content = content.replace(/bg-violet-50 dark:bg-violet-500\/10/g, "bg-[var(--router-primary)]/10");
content = content.replace(/text-violet-700 dark:text-violet-300/g, "text-[var(--router-primary)]");
content = content.replace(/border-violet-200 dark:border-violet-500\/20/g, "border-[var(--router-primary)]/20");

content = content.replace(/bg-amber-50 text-amber-700 dark:text-amber-300 border border-amber-200 dark:border-amber-500\/20/g, "router-badge router-badge-warning");
content = content.replace(/text-amber-700 dark:text-amber-305/g, "text-[var(--router-warning)]");
content = content.replace(/text-amber-700 dark:text-amber-455/g, "text-[var(--router-warning)]");

content = content.replace(/bg-\[#FFE4E6\] dark:bg-red-500\/10 text-\[#BE123C\] dark:text-red-400 border-\[#FECDD3\] dark:border-red-500\/15/g, "router-badge router-badge-critical");
content = content.replace(/bg-\[#FEF3C7\] dark:bg-amber-500\/10 text-\[#92400E\] dark:text-amber-400 border-\[#FDE68A\] dark:border-amber-500\/15/g, "router-badge router-badge-warning");
content = content.replace(/bg-\[#F1F5F9\] dark:bg-slate-900\/30 text-\[#475569\] dark:text-slate-400 border-\[#E2E8F0\] dark:border-slate-755\/20/g, "router-badge router-badge-neutral");

content = content.replace(/bg-\[#E0E7FF\] dark:bg-cyan-500\/10 text-\[#3730A3\] dark:text-cyan-300 border border-\[#C7D2FE\] dark:border-cyan-500\/25/g, "router-badge router-badge-info");

content = content.replace(/bg-\[#FFE4E6\] dark:bg-red-950\/40 text-\[#BE123C\] dark:text-red-400 border-\[#FECDD3\] dark:border-red-500\/20/g, "router-badge router-badge-critical");
content = content.replace(/bg-\[#DCFCE7\] dark:bg-emerald-500\/10 text-\[#166534\] dark:text-emerald-400 border-\[#BBF7D0\] dark:border-emerald-500\/15/g, "router-badge router-badge-success");
content = content.replace(/bg-\[#DBEAFE\] dark:bg-blue-950\/40 text-\[#1D4ED8\] dark:text-blue-300 border-\[#BFDBFE\] dark:border-blue-500\/15/g, "router-badge router-badge-scheduled");
content = content.replace(/bg-\[#FEF3C7\] dark:bg-amber-950\/40 text-\[#92400E\] dark:text-amber-300 border-\[#FDE68A\] dark:border-amber-500\/15/g, "router-badge router-badge-warning");

// General Colors
content = content.replace(/text-slate-800 dark:text-slate-300/g, "text-[var(--router-text)]");
content = content.replace(/text-slate-800 dark:text-slate-105/g, "text-[var(--router-text)]");
content = content.replace(/text-slate-800 dark:text-slate-200/g, "text-[var(--router-text)]");
content = content.replace(/text-slate-700 dark:text-slate-300/g, "text-[var(--router-text)]");
content = content.replace(/text-slate-600 dark:text-slate-400/g, "text-[var(--router-text-soft)]");
content = content.replace(/text-slate-550 dark:text-slate-455/g, "text-[var(--router-text-muted)]");
content = content.replace(/text-slate-550 dark:text-slate-400/g, "text-[var(--router-text-muted)]");
content = content.replace(/text-slate-500 dark:text-slate-450/g, "text-[var(--router-text-muted)]");
content = content.replace(/text-slate-500 dark:text-slate-400/g, "text-[var(--router-text-muted)]");
content = content.replace(/text-slate-400 dark:text-slate-500/g, "text-[var(--router-text-muted)]");
content = content.replace(/text-slate-300 dark:text-slate-600/g, "text-[var(--router-text-muted)]");

content = content.replace(/text-indigo-600 dark:text-indigo-400/g, "text-[var(--router-primary)]");
content = content.replace(/text-indigo-600 dark:text-indigo-350/g, "text-[var(--router-primary)]");
content = content.replace(/text-indigo-600 dark:text-indigo-300/g, "text-[var(--router-primary)]");
content = content.replace(/text-indigo-500 dark:text-indigo-300/g, "text-[var(--router-primary)]");

content = content.replace(/bg-indigo-600 dark:bg-indigo-650 hover:bg-indigo-500 dark:hover:bg-indigo-600 text-white/g, "router-button-primary");

content = content.replace(/border-slate-200 dark:border-\[#131f38\]\/15/g, "border-[var(--router-border)]");
content = content.replace(/border-slate-200 dark:border-\[#1c2e5c\]/g, "border-[var(--router-border)]");
content = content.replace(/border-slate-150 dark:border-\[#16223f\]\/70/g, "border-[var(--router-border)]");
content = content.replace(/border-slate-200 dark:border-\[#16223f\]/g, "border-[var(--router-input-border)]");

content = content.replace(/bg-slate-50\/30 dark:bg-\[#070c14\]\/15/g, "bg-[var(--router-surface-2)]");
content = content.replace(/bg-slate-50 dark:bg-\[#0e1732\]/g, "bg-[var(--router-surface-2)]");
content = content.replace(/bg-slate-50 dark:bg-\[#05080f\]/g, "bg-[var(--router-input-bg)]");

content = content.replace(/bg-white dark:bg-\[#0b132a\]\/95/g, "bg-[var(--router-surface)]");
content = content.replace(/border-slate-200 dark:border-\[#1d2d53\]/g, "border-[var(--router-border)]");

fs.writeFileSync('src/components/roteirizacao/CargaItem.tsx', content);
