import fs from 'fs';

let content = fs.readFileSync('src/components/ConfiguracoesView.tsx', 'utf8');

// Replace specific background/border hex codes
content = content.replace(/bg-\[#101524\]/g, "bg-[var(--router-surface)]");
content = content.replace(/bg-\[#4d8eff\]/g, "bg-[var(--router-primary)]");
content = content.replace(/border-\[#4d8eff\]/g, "border-[var(--router-primary)]");
content = content.replace(/text-\[#4d8eff\]/g, "text-[var(--router-primary)]");
content = content.replace(/bg-\[#93000a\]/g, "bg-[var(--router-danger)]");
content = content.replace(/bg-\[#3ecf8e\]/g, "bg-[var(--router-success)]");
content = content.replace(/text-\[#3ecf8e\]/g, "text-[var(--router-success)]");
content = content.replace(/bg-\[#efb810\]/g, "bg-[var(--router-warning)]");
content = content.replace(/bg-\[#001f11\]/g, "text-white");
content = content.replace(/text-\[#001f11\]/g, "text-[var(--router-surface)]");
content = content.replace(/bg-\[#32b479\]/g, "bg-[var(--router-success)]");

content = content.replace(/bg-primary/g, "bg-[var(--router-primary)]");
content = content.replace(/text-primary/g, "text-[var(--router-primary)]");

fs.writeFileSync('src/components/ConfiguracoesView.tsx', content);
