import fs from 'fs';
import path from 'path';

function processFile(full) {
    let content = fs.readFileSync(full, 'utf8');
    let original = content;

    // Badges / Soft Colors
    content = content.replace(/text-slate-950/g, "text-[var(--router-text)]");
    content = content.replace(/text-slate-900/g, "text-[var(--router-text)]");
    content = content.replace(/text-slate-800/g, "text-[var(--router-text)]");
    content = content.replace(/text-slate-700/g, "text-[var(--router-text)]");
    content = content.replace(/text-slate-600/g, "text-[var(--router-text-soft)]");
    content = content.replace(/text-slate-550/g, "text-[var(--router-text-muted)]");
    content = content.replace(/text-slate-500/g, "text-[var(--router-text-muted)]");
    content = content.replace(/text-slate-455/g, "text-[var(--router-text-muted)]");
    content = content.replace(/text-slate-450/g, "text-[var(--router-text-muted)]");
    content = content.replace(/text-slate-405/g, "text-[var(--router-text-muted)]");
    content = content.replace(/text-slate-400/g, "text-[var(--router-text-muted)]");
    content = content.replace(/text-slate-350/g, "text-[var(--router-text-soft)]");
    content = content.replace(/text-slate-300/g, "text-[var(--router-text-soft)]");
    content = content.replace(/text-slate-200/g, "text-[var(--router-text)]");
    content = content.replace(/text-slate-150/g, "text-[var(--router-text)]");
    content = content.replace(/text-slate-105/g, "text-[var(--router-text)]");
    content = content.replace(/text-slate-100/g, "text-[var(--router-text)]");
    content = content.replace(/text-slate-50/g, "text-[var(--router-text)]");

    content = content.replace(/bg-slate-950/g, "bg-[var(--router-surface-3)]");
    content = content.replace(/bg-slate-900/g, "bg-[var(--router-surface-3)]");
    content = content.replace(/bg-slate-850/g, "bg-[var(--router-surface-2)]");
    content = content.replace(/bg-slate-800/g, "bg-[var(--router-surface-2)]");
    content = content.replace(/bg-slate-700/g, "bg-[var(--router-surface-2)]");
    content = content.replace(/bg-slate-600/g, "bg-[var(--router-surface-2)]");
    content = content.replace(/bg-slate-500/g, "bg-[var(--router-border)]");
    content = content.replace(/bg-slate-400/g, "bg-[var(--router-border)]");
    content = content.replace(/bg-slate-300/g, "bg-[var(--router-surface-3)]");
    content = content.replace(/bg-slate-200/g, "bg-[var(--router-surface-2)]");
    content = content.replace(/bg-slate-150/g, "bg-[var(--router-surface-2)]");
    content = content.replace(/bg-slate-100/g, "bg-[var(--router-surface-2)]");
    content = content.replace(/bg-slate-50/g, "bg-[var(--router-surface)]");

    content = content.replace(/border-slate-950/g, "border-[var(--router-border)]");
    content = content.replace(/border-slate-900/g, "border-[var(--router-border)]");
    content = content.replace(/border-slate-800/g, "border-[var(--router-border)]");
    content = content.replace(/border-slate-755/g, "border-[var(--router-border)]");
    content = content.replace(/border-slate-705/g, "border-[var(--router-border)]");
    content = content.replace(/border-slate-700/g, "border-[var(--router-border)]");
    content = content.replace(/border-slate-600/g, "border-[var(--router-border)]");
    content = content.replace(/border-slate-500/g, "border-[var(--router-border)]");
    content = content.replace(/border-slate-400/g, "border-[var(--router-border)]");
    content = content.replace(/border-slate-300/g, "border-[var(--router-border)]");
    content = content.replace(/border-slate-200/g, "border-[var(--router-border)]");
    content = content.replace(/border-slate-150/g, "border-[var(--router-border)]");
    content = content.replace(/border-slate-100/g, "border-[var(--router-border)]");
    content = content.replace(/border-slate-50/g, "border-[var(--router-border)]");

    content = content.replace(/dark:bg-\[#[0-9a-fA-F]+\](\/[0-9]+)?/g, "bg-[var(--router-surface-2)]");
    content = content.replace(/dark:border-\[#[0-9a-fA-F]+\](\/[0-9]+)?/g, "border-[var(--router-border)]");
    content = content.replace(/dark:text-\[#[0-9a-fA-F]+\]/g, "text-[var(--router-text-muted)]");

    content = content.replace(/dark:bg-slate-[0-9]+/g, "");
    content = content.replace(/dark:border-slate-[0-9]+/g, "");
    content = content.replace(/dark:text-slate-[0-9]+/g, "");
    content = content.replace(/dark:hover:bg-slate-[0-9]+/g, "");
    content = content.replace(/dark:hover:text-slate-[0-9]+/g, "");
    content = content.replace(/dark:hover:border-slate-[0-9]+/g, "");
    content = content.replace(/dark:focus:bg-slate-[0-9]+/g, "");
    content = content.replace(/dark:focus:border-slate-[0-9]+/g, "");

    content = content.replace(/bg-white/g, "bg-[var(--router-surface)]");

    if (content !== original) {
        fs.writeFileSync(full, content);
    }
}

function scan(dir) {
    let files = fs.readdirSync(dir);
    for (let f of files) {
        let full = path.join(dir, f);
        if (fs.statSync(full).isDirectory()) {
            if (f !== 'DashboardView' && f !== 'LoginView') {
                scan(full);
            }
        } else if (full.endsWith('.tsx') || full.endsWith('.ts')) {
            if (!full.includes('DashboardView') && !full.includes('LoginView') && !full.includes('App.tsx')) {
                processFile(full);
            }
        }
    }
}
scan('src/components');
