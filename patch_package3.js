const fs = require('fs');
let pkg = JSON.parse(fs.readFileSync('package.json', 'utf-8'));
pkg.scripts.test = "npx tsx test/local_first/write_first.test.ts && npx tsx test/local_first/auth.test.ts && npx tsx test/ssw/resilience.test.ts && npx tsx test/ssw/ssw455.test.ts && npx tsx test/ssw/ssw455_ux.test.ts && npx tsx test/ssw/ssw455_payload.test.ts";
fs.writeFileSync('package.json', JSON.stringify(pkg, null, 2));
