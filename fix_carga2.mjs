import fs from 'fs';

let content = fs.readFileSync('src/components/roteirizacao/CargaItem.tsx', 'utf8');

content = content.replace(/hover:bg-red-50 dark:hover:bg-red-500\/10/g, "hover:bg-[var(--router-surface-3)]");
content = content.replace(/hover:bg-amber-50 dark:hover:bg-amber-500\/10/g, "hover:bg-[var(--router-surface-3)]");
content = content.replace(/hover:bg-orange-50 dark:hover:bg-orange-500\/10/g, "hover:bg-[var(--router-surface-3)]");
content = content.replace(/hover:bg-slate-100 dark:hover:bg-slate-700\/15/g, "hover:bg-[var(--router-surface-3)]");
content = content.replace(/hover:bg-cyan-50 dark:hover:bg-cyan-500\/10/g, "hover:bg-[var(--router-surface-3)]");

fs.writeFileSync('src/components/roteirizacao/CargaItem.tsx', content);
