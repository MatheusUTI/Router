import fs from 'fs';

let content = fs.readFileSync('src/components/BaseDadosView.tsx', 'utf8');

content = content.replace(/bg-\[#0b1322\]\/90/g, "bg-[var(--router-bg)]");
content = content.replace(/bg-\[#0c1322\]/g, "bg-[var(--router-bg)]");
content = content.replace(/bg-\[#0b1322\]/g, "bg-[var(--router-bg)]");

content = content.replace(/border-\[#1a2b4b\]/g, "border-[var(--router-border)]");
content = content.replace(/border-\[#1e2e4f\]\/70/g, "border-[var(--router-border)]");
content = content.replace(/border-\[#1e2e4f\]/g, "border-[var(--router-border)]");

content = content.replace(/bg-surface text-on-surface border border-\[#1e3a6c\]\/60/g, "bg-[var(--router-input-bg)] border-[var(--router-input-border)] text-[var(--router-text)]");
content = content.replace(/border-\[#1e3a6c\]\/60/g, "border-[var(--router-input-border)]");

content = content.replace(/bg-indigo-950\/70 hover:bg-indigo-900\/80 text-indigo-300/g, "bg-[var(--router-surface-2)] hover:bg-[var(--router-surface-3)] text-[var(--router-text-soft)]");
content = content.replace(/bg-indigo-950\/70 hover:bg-indigo-900\/80 border border-\[var\(--router-input-border\)\] text-indigo-300/g, "bg-[var(--router-surface-2)] hover:bg-[var(--router-surface-3)] text-[var(--router-text-soft)]");

content = content.replace(/focus:border-indigo-400 focus:ring-1 focus:ring-indigo-400\/30/g, "focus:border-[var(--router-primary)] focus:ring-1 focus:ring-[var(--router-primary)]/30");
content = content.replace(/focus:border-indigo-400/g, "focus:border-[var(--router-primary)]");

content = content.replace(/text-indigo-450/g, "text-[var(--router-primary)]");

fs.writeFileSync('src/components/BaseDadosView.tsx', content);
