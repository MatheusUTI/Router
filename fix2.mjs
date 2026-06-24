import fs from 'fs';

let file = fs.readFileSync('src/components/roteirizacao/CargaList.tsx', 'utf8');

file = file.replace(/text-slate-500 dark:text-slate-400/g, "text-[var(--router-text-muted)]");
file = file.replace(/text-slate-500/g, "text-[var(--router-text-muted)]");

fs.writeFileSync('src/components/roteirizacao/CargaList.tsx', file);
