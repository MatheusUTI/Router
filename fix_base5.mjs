import fs from 'fs';

let content = fs.readFileSync('src/components/BaseDadosView.tsx', 'utf8');

content = content.replace(/bg-emerald-500\/10 border border-emerald-500\/20/g, "bg-[var(--router-success)]/10 border border-[var(--router-success)]/20");

fs.writeFileSync('src/components/BaseDadosView.tsx', content);
