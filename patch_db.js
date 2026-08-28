const fs = require('fs');
let code = fs.readFileSync('src/infrastructure/localdb/db.ts', 'utf-8');

// Add import
code = code.replace(/import \{ ([^}]+) \} from '\.\.\/\.\.\/types';/, (match, group1) => {
  if (!group1.includes('LocalAuthRecord')) {
    return `import { ${group1}, LocalAuthRecord } from '../../types';`;
  }
  return match;
});

// Add Table declaration
code = code.replace(/audit_logs!: Table<AuditLog, string>;/, `audit_logs!: Table<AuditLog, string>;\n  local_auth!: Table<LocalAuthRecord, string>;`);

// Add to schema version 13
code = code.replace(/this\.version\(12\)\.stores\(\{\n\s+audit_logs: 'id, timestamp, entityType, action'\n\s+\}\);/, 
`this.version(12).stores({
      audit_logs: 'id, timestamp, entityType, action'
    });
    this.version(13).stores({
      local_auth: 'username, expiresAt'
    });`);

fs.writeFileSync('src/infrastructure/localdb/db.ts', code);
