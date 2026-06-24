import fs from 'fs';

let content = fs.readFileSync('src/components/roteirizacao/RoteirizacaoHeader.tsx', 'utf8');

content = content.replace(/text-slate-800 dark:text-white/g, "text-[var(--router-text)]");
content = content.replace(/text-slate-500/g, "text-[var(--router-text-muted)]");

fs.writeFileSync('src/components/roteirizacao/RoteirizacaoHeader.tsx', content);
