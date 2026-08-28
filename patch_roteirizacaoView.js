const fs = require('fs');
let code = fs.readFileSync('src/components/roteirizacao/RoteirizacaoView.tsx', 'utf-8');

const oldCode = `      const updatedItem = await routePlanningRepository.upsertForCtrc(ctrcId, planningDate, patch);
      
      setRoutePlanningItems((prev) => {
        const index = prev.findIndex((p) => p.id === updatedItem.id);
        if (index > -1) {
          const next = [...prev];
          next[index] = updatedItem;
          return next;
        } else {
          return [...prev, updatedItem];
        }
      });

      // If active routing plan exists on Supabase, synchronize in background
      if (activeRoutingPlan) {
        const companyCode = adminUser?.unid || 'SPO';
        const remoteItem = {
          id: \`\${activeRoutingPlan.id}_\${ctrcId}\`,
          planId: activeRoutingPlan.id,
          shipmentUniqueKey: \`\${companyCode}_\${ctrcId}\`,
          ctrcId: ctrcId,
          planningDate: planningDate,
          companyCode: companyCode,
          suggestedRoute: updatedItem.suggestedRoute || undefined,
          operationalRoute: updatedItem.operationalRoute || undefined,
          planningStatus: updatedItem.planningStatus || 'A_PLANEJAR',
          manualPriority: updatedItem.manualPriority || undefined,
          operationalNote: updatedItem.operationalNote || undefined,
          vehicleId: updatedItem.vehicleId || undefined,
          vehiclePlate: updatedItem.vehiclePlate || undefined,
          driverName: updatedItem.driverName || undefined,
          helperName: updatedItem.helperName || undefined,
          lockedByUser: updatedItem.lockedByUser ? String(updatedItem.lockedByUser) : undefined,
          updatedBy: adminUser?.username || 'admin',
        };
        
        routingPlanService.upsertItem(remoteItem as any).catch((err) => {
          console.warn('[Roteirizacao] Erro silencioso ao salvar item no Supabase:', err);
        });
      }`;

const newCode = `      // 6. Use Application Service for Write-First orchestration
      const updatedItem = await routingPlanService.updatePlanningItem(
        ctrcId,
        planningDate,
        patch,
        adminUser,
        activeRoutingPlan
      );
      
      setRoutePlanningItems((prev) => {
        const index = prev.findIndex((p) => p.id === updatedItem.id);
        if (index > -1) {
          const next = [...prev];
          next[index] = updatedItem;
          return next;
        } else {
          return [...prev, updatedItem];
        }
      });`;

code = code.replace(oldCode, newCode);
fs.writeFileSync('src/components/roteirizacao/RoteirizacaoView.tsx', code);
