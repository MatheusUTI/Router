const fs = require('fs');
let code = fs.readFileSync('src/types.ts', 'utf-8');

code = code.replace(/export interface AppUser {/, "export interface AppUser {\n  authMode?: 'ONLINE' | 'OFFLINE_CACHED';");
fs.writeFileSync('src/types.ts', code);
