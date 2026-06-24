const fs = require('fs');
let file = fs.readFileSync('src/components/roteirizacao/CargaList.tsx', 'utf8');

file = file.replace(/border-slate-300 dark:border-slate-705/g, "border-[var(--router-border)]");
file = file.replace(/border-l border-slate-200 dark:border-\[#131f38\]\/15/g, "border-l border-[var(--router-border)]");
file = file.replace(/bg-\[#DCFCE7\] dark:bg-emerald-500\/10 border border-\[#BBF7D0\] dark:border-emerald-500\/20/g, "bg-[var(--router-success)]/10 border border-[var(--router-success)]/30");
file = file.replace(/bg-\[#DBEAFE\] dark:bg-indigo-950\/40 border border-\[#BFDBFE\] dark:border-indigo-500\/20/g, "bg-[var(--router-primary)]/10 border border-[var(--router-primary)]/30");
file = file.replace(/bg-\[#FEF3C7\] dark:bg-amber-550\/10 border border-\[#FDE68A\] dark:border-amber-500\/20/g, "bg-[var(--router-warning)]/10 border border-[var(--router-warning)]/30");
file = file.replace(/bg-\[#FFEDD5\] dark:bg-orange-500\/10 border border-\[#FED7AA\] dark:border-orange-500\/20/g, "bg-[var(--router-danger)]/10 border border-[var(--router-danger)]/30");
file = file.replace(/bg-\[#FFE4E6\] dark:bg-red-500\/10 border border-\[#FECDD3\] dark:border-red-500\/20/g, "bg-[var(--router-danger)]/10 border border-[var(--router-danger)]/30");
file = file.replace(/bg-slate-150 dark:bg-slate-850 border border-slate-300 dark:border-slate-700/g, "bg-[var(--router-surface-3)] border border-[var(--router-border)]");

fs.writeFileSync('src/components/roteirizacao/CargaList.tsx', file);
