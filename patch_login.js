const fs = require('fs');
let code = fs.readFileSync('src/components/LoginView.tsx', 'utf-8');

// We need to import LocalAuthService
code = code.replace(/import \{ getApiUrl \} from '\.\.\/config\/api';/, 
  "import { getApiUrl } from '../config/api';\nimport { LocalAuthService } from '../application/services/LocalAuthService';");

const oldHandleSubmit = `
  const handleLoginSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setSuccessMsg(null);

    const cleanUser = username.trim();
    const cleanPass = password.trim();

    if (!cleanUser || !cleanPass) {
      setErrorMsg("Por favor, preencha todos os campos.");
      return;
    }

    setIsLoading(true);

    const uNormal = cleanUser.toLowerCase();
    const uNoDomain = uNormal.endsWith("@rotaoperational.com") ? uNormal.replace("@rotaoperational.com", "") : uNormal;

    const tryLocalFallback = async (): Promise<boolean> => {
      try {
        const localUsers = await getAppUsers();
        const userMatch = localUsers.find(u => {
          const dbUserLower = u.username.toLowerCase();
          return (dbUserLower === uNormal || dbUserLower === uNoDomain) && u.password === cleanPass;
        });

        if (userMatch) {
          setSuccessMsg("Autenticação efetuada com sucesso!");
          const isMaster = !!userMatch.is_master;
          if (isMaster) {
            localStorage.setItem('master_last_unid', loginUnid);
          }
          const finalUnid = isMaster ? loginUnid : (userMatch.unid || DEFAULT_OPERATIONAL_UNIT);
          setTimeout(() => {
            onLoginSuccess({
              ...userMatch,
              unid: finalUnid
            });
          }, 800);
          return true;
        }
      } catch (localErr) {
        console.error("Erro no login local de fallback:", localErr);
      }
      return false;
    };

    try {
      const creds = getSavedCredentials();
      const sswOpts = creds?.usuario ? {
         headers: {
            'x-ssw-user': creds.usuario,
            'x-ssw-pass': creds.senha || ''
         }
      } : {};

      // Authenticate via server-side endpoint /api/auth/login
      const res = await fetch(getApiUrl("/api/auth/login"), {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...sswOpts.headers
        },
        body: JSON.stringify({
          username: cleanUser,
          password: cleanPass
        })
      });

      if (res.ok) {
        const data = await res.json();
        setSuccessMsg("Autenticação online efetuada com sucesso!");
        const isMaster = !!data.user.is_master;
        if (isMaster) {
          localStorage.setItem('master_last_unid', loginUnid);
        }
        const finalUnid = isMaster ? loginUnid : (data.user.unid || DEFAULT_OPERATIONAL_UNIT);
        
        setTimeout(() => {
          onLoginSuccess({
            ...data.user,
            unid: finalUnid
          });
        }, 800);
      } else {
        // Quando /api/auth/login responder erro, antes de mostrar o erro final:
        const locallyAuthenticated = await tryLocalFallback();
        if (!locallyAuthenticated) {
          setErrorMsg("Credenciais inválidas ou usuário não sincronizado.");
        }
      }
    } catch (err: any) {
      console.warn("API de login offline, testando login local fallback:", err);
      const locallyAuthenticated = await tryLocalFallback();
      if (!locallyAuthenticated) {
        setErrorMsg("Credenciais inválidas ou usuário não sincronizado.");
      }
    } finally {
      setIsLoading(false);
    }
  };
`;

const newHandleSubmit = `
  const handleLoginSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setSuccessMsg(null);

    const cleanUser = username.trim();
    const cleanPass = password.trim();

    if (!cleanUser || !cleanPass) {
      setErrorMsg("Por favor, preencha todos os campos.");
      return;
    }

    setIsLoading(true);

    const uNormal = cleanUser.toLowerCase();
    const uNoDomain = uNormal.endsWith("@rotaoperational.com") ? uNormal.replace("@rotaoperational.com", "") : uNormal;

    const performOfflineAuth = async () => {
      try {
        const cachedUser = await LocalAuthService.attemptOfflineAuth(uNoDomain, cleanPass);
        if (cachedUser) {
          setSuccessMsg("Modo offline — acesso validado localmente.");
          const isMaster = !!cachedUser.is_master;
          if (isMaster) {
            localStorage.setItem('master_last_unid', loginUnid);
          }
          const finalUnid = isMaster ? loginUnid : (cachedUser.unid || DEFAULT_OPERATIONAL_UNIT);
          
          setTimeout(() => {
            onLoginSuccess({
              ...cachedUser,
              unid: finalUnid,
              authMode: 'OFFLINE_CACHED'
            } as any);
          }, 800);
          return true;
        }
      } catch (err) {
        console.error("Erro na autorização offline:", err);
      }
      return false;
    };

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
          body: JSON.stringify({
            username: cleanUser,
            password: cleanPass
          })
        });
      } catch (fetchErr: any) {
        // NETWORK ERROR - Try offline auth
        console.warn("API de login offline, testando login local fallback:", fetchErr);
        const locallyAuthenticated = await performOfflineAuth();
        if (!locallyAuthenticated) {
          setErrorMsg("Servidor inacessível e não há sessão offline válida para este usuário.");
        }
        return;
      }

      if (res.ok) {
        const data = await res.json();
        setSuccessMsg("Autenticação online efetuada com sucesso!");
        
        const isMaster = !!data.user.is_master;
        if (isMaster) {
          localStorage.setItem('master_last_unid', loginUnid);
        }
        const finalUnid = isMaster ? loginUnid : (data.user.unid || DEFAULT_OPERATIONAL_UNIT);
        
        const userProfile = {
          ...data.user,
          unid: finalUnid
        };

        // Provision offline authorization!
        await LocalAuthService.provisionOfflineAuth(uNoDomain, cleanPass, userProfile);

        setTimeout(() => {
          onLoginSuccess({
            ...userProfile,
            authMode: 'ONLINE'
          } as any);
        }, 800);
      } else {
        // CREDENTIALS INVALID or other backend error
        // DO NOT fallback to offline auth if the authoritative server rejected the credentials!
        const errData = await res.json().catch(() => ({}));
        setErrorMsg(errData.error || "Credenciais inválidas. Acesso negado pelo servidor.");
      }
    } catch (err: any) {
      console.error("Erro inesperado no login:", err);
      setErrorMsg("Erro inesperado durante a autenticação.");
    } finally {
      setIsLoading(false);
    }
  };
`;

const startIndex = code.indexOf('const handleLoginSubmit = async (e: FormEvent) => {');
const endIndex = code.indexOf('const handleQuickDemoAccess = async () => {');
if (startIndex !== -1 && endIndex !== -1) {
  code = code.substring(0, startIndex) + newHandleSubmit + '\n  ' + code.substring(endIndex);
  fs.writeFileSync('src/components/LoginView.tsx', code);
} else {
  console.error('Could not find replace bounds');
}
