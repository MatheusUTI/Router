import fs from 'fs';

let content = fs.readFileSync('src/components/BaseDadosView.tsx', 'utf8');

content = content.replace(/bg-amber-900\/40 text-amber-300/g, "router-badge router-badge-warning");
content = content.replace(/bg-slate-800 text-slate-350/g, "router-badge router-badge-neutral");
content = content.replace(/text-slate-350/g, "text-[var(--router-text-soft)]");

content = content.replace(/border-indigo-500\/50/g, "border-[var(--router-primary)]/50");
content = content.replace(/border-indigo-500/g, "border-[var(--router-primary)]");
content = content.replace(/bg-indigo-500\/10/g, "bg-[var(--router-primary)]/10");
content = content.replace(/text-indigo-400/g, "text-[var(--router-primary)]");

fs.writeFileSync('src/components/BaseDadosView.tsx', content);
