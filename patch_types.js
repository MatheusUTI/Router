const fs = require('fs');
let code = fs.readFileSync('src/types.ts', 'utf-8');

const newTypes = `
export interface LocalAuthRecord {
  username: string; // PK
  userProfile: AppUser;
  salt: string;
  verifier: string;
  iterations: number;
  validatedAt: string;
  expiresAt: string;
}
`;

code = code + newTypes;
fs.writeFileSync('src/types.ts', code);
