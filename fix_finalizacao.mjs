import fs from 'fs';

let content = fs.readFileSync('src/components/FinalizacaoView.tsx', 'utf8');

// Colors replacement
content = content.replace(/bg-white dark:bg-\[#12192c\]/g, "router-card");
content = content.replace(/bg-slate-50 dark:bg-\[#101524\]/g, "router-panel");
content = content.replace(/bg-slate-50 dark:bg-\[#111625\]/g, "bg-[var(--router-surface-2)]");
content = content.replace(/bg-slate-100 dark:bg-\[#12192c\]/g, "bg-[var(--router-surface-2)]");
content = content.replace(/bg-white dark:bg-\[#111625\]/g, "bg-[var(--router-input-bg)]");
content = content.replace(/hover:bg-slate-50 dark:hover:bg-\[#161d31\]/g, "hover:bg-[var(--router-surface-2)]");
content = content.replace(/focus:bg-white dark:focus:bg-\[#161d31\]/g, "focus:bg-[var(--router-surface)]");
content = content.replace(/bg-slate-50 dark:bg-\[#12192a\]/g, "router-card-soft");
content = content.replace(/bg-\[#12192a\]/g, "bg-[var(--router-surface)]");
content = content.replace(/bg-\[#131b2e\]/g, "bg-[var(--router-input-bg)]");
content = content.replace(/hover:bg-\[#1c243a\]/g, "hover:bg-[var(--router-surface-3)]");
content = content.replace(/focus:bg-\[#1c243a\]/g, "focus:bg-[var(--router-surface-2)]");

content = content.replace(/border-slate-200 dark:border-outline-variant\/40/g, "border-[var(--router-border)]");
content = content.replace(/border-slate-200 dark:border-outline-variant\/30/g, "border-[var(--router-border)]");
content = content.replace(/border-slate-200 dark:border-outline-variant\/50/g, "border-[var(--router-border)]");
content = content.replace(/border-slate-200 dark:border-\[#22304d\]/g, "border-[var(--router-border)]");
content = content.replace(/border-\[#22304d\]/g, "border-[var(--router-border)]");
content = content.replace(/border-outline-variant\/40/g, "border-[var(--router-input-border)]");
content = content.replace(/hover:border-outline/g, "hover:border-[var(--router-primary)]");

content = content.replace(/text-slate-800 dark:text-white/g, "text-[var(--router-text)]");

fs.writeFileSync('src/components/FinalizacaoView.tsx', content);
