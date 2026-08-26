const fs = require('fs');
const content = fs.readFileSync('src/application/services/RoutingPlanService.ts', 'utf8');

const classContent = `
  async upsertItem(item: RoutePlanningItem): Promise<{ success: boolean; error?: any }> {
    const { routingPlanItemSupabaseRepository } = await import('../../infrastructure/supabase/repositories/routingPlanItemSupabaseRepository');
    return routingPlanItemSupabaseRepository.upsertItem(item as any);
  }
}
`;

const cleaned = content.replace(/}\s*export const routingPlanService = new RoutingPlanService\(\);\s*async upsertItem[\s\S]*/, classContent + 'export const routingPlanService = new RoutingPlanService();\n');

fs.writeFileSync('src/application/services/RoutingPlanService.ts', cleaned);
