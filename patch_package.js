const fs = require('fs');
let pkg = JSON.parse(fs.readFileSync('package.json', 'utf-8'));
pkg.scripts.test = "tsx test/local_first/write_first.test.ts && tsx test/local_first/auth.test.ts && tsx test/ssw/resilience.test.ts && tsx test/ssw/ssw455.test.ts && tsx test/ssw/ssw455_ux.test.ts && tsx test/ssw/ssw455_payload.test.ts";
fs.writeFileSync('package.json', JSON.stringify(pkg, null, 2));
