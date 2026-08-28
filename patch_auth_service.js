const fs = require('fs');
let code = fs.readFileSync('src/application/services/LocalAuthService.ts', 'utf-8');

code = code.replace(/window\.crypto/g, "globalThis.crypto");

fs.writeFileSync('src/application/services/LocalAuthService.ts', code);
