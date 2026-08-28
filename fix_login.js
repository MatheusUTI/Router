const fs = require('fs');
let code = fs.readFileSync('src/components/LoginView.tsx', 'utf-8');

const target = `
    try {
      const creds = getSavedCredentials();
      const sswOpts = creds?.usuario ? {
         headers: {
            'x-ssw-user': creds.usuario,
            'x-ssw-pass': creds.senha || ''
         }
      } : {};

      let res;
      try {
        // Authenticate via server-side endpoint /api/auth/login
        res = await fetch(getApiUrl("/api/auth/login"), {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            ...sswOpts.headers
          },
`;

const replacement = `
    try {
      let res;
      try {
        // Authenticate via server-side endpoint /api/auth/login
        res = await fetch(getApiUrl("/api/auth/login"), {
          method: "POST",
          headers: {
            "Content-Type": "application/json"
          },
`;

if (code.includes('creds?.usuario')) {
  // It's easier to just use string replace for the whole block
  const startIndex = code.indexOf('    try {\n      const creds = getSavedCredentials();');
  const endIndex = code.indexOf('          body: JSON.stringify({');
  if (startIndex !== -1 && endIndex !== -1) {
    code = code.substring(0, startIndex) + replacement + code.substring(endIndex);
    fs.writeFileSync('src/components/LoginView.tsx', code);
    console.log('Fixed LoginView.tsx');
  } else {
    console.error('Could not find replace bounds');
  }
} else {
  console.log('creds?.usuario not found');
}
