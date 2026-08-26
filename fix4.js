const fs = require('fs');
let content = fs.readFileSync('src/components/roteirizacao/RoteirizacaoView.tsx', 'utf8');
const lines = content.split('\n');

// we want to remove lines 648 to 711 (0-indexed 647 to 710)
lines.splice(647, 711 - 648 + 1);

const newPerformSync = `  const performFullSync = async (active = true, showToast = true) => {
    const companyCode = adminUser?.unid || 'SPO';
    const username = adminUser?.username || 'admin';
    const adminUserName = adminUser?.name || '';
    const isAdminMaster = !!adminUser?.is_master;
    
    setIsSyncingPlan(true);

    try {
      const result = await routingPlanService.performFullSync(
        companyCode,
        username,
        planningDate,
        activeRoutingPlan?.id,
        isAdminMaster,
        adminUserName
      );
      
      setOnlineStatus(result.isOnline);
      if (!result.isOnline && showToast) {
        setToastMessage('⚠️ Supabase offline. Trabalhando localmente.');
        setTimeout(() => setToastMessage(null), 3000);
      }
      
      if (active) {
        setActiveUsersList(result.activeUsers);
        setActiveUsersCount(result.activeUsers.length);
        if (result.activePlan) setActiveRoutingPlan(result.activePlan);
        setRoutePlanningItems(result.items);
      }
    } catch (err) {
      console.error('[Roteirizacao] Erro sincronizando plano:', err);
      if (showToast) {
        setToastMessage('❌ Erro de conexão ao sincronizar mesa.');
        setTimeout(() => setToastMessage(null), 3000);
      }
    } finally {
      setIsSyncingPlan(false);
    }
  };`;

lines.splice(647, 0, newPerformSync);

fs.writeFileSync('src/components/roteirizacao/RoteirizacaoView.tsx', lines.join('\n'));
