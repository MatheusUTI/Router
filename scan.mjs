import fs from 'fs';
import path from 'path';

function scan(dir) {
    let files = fs.readdirSync(dir);
    for (let f of files) {
        let full = path.join(dir, f);
        if (fs.statSync(full).isDirectory()) {
            scan(full);
        } else if (full.endsWith('.tsx') || full.endsWith('.ts')) {
            let content = fs.readFileSync(full, 'utf8');
            let matches = content.match(/(bg-\[#[0-9a-fA-F]+\]|border-\[#[0-9a-fA-F]+\]|dark:bg|dark:text|dark:border|bg-slate-\d+|text-slate-\d+|border-slate-\d+)/g);
            if (matches) {
                console.log(full, matches.length, 'matches');
            }
        }
    }
}
scan('src/components');
