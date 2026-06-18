import { useState, useMemo } from 'react';

export type GroupingMode = 'sector' | 'city' | 'destinatario' | 'previsao' | 'priority' | 'status' | 'location' | 'none';

export function useRoteirizacaoGrouping<T extends { 
  normCidade: string; 
  normSetor: string; 
  destinatario?: string; 
  prev_ent?: string;
  effectiveRoute?: string;
  normRota?: string;
  manualPriority?: string;
  planningStatus?: string;
  locationLabel?: string;
  localizacao?: string;
}>(items: T[]) {
  const [groupingMode, setGroupingMode] = useState<GroupingMode>('none');
  const [expandedGroups, setExpandedGroups] = useState<Record<string, boolean>>({});

  // Reset expansions when mode shifts
  const changeGroupingMode = (mode: GroupingMode) => {
    setGroupingMode(mode);
    setExpandedGroups({});
  };

  const toggleGroup = (groupKey: string) => {
    setExpandedGroups((prev) => ({
      ...prev,
      // If was expanded (true) or default expand, make it collapse
      [groupKey]: prev[groupKey] === false ? true : false,
    }));
  };

  // Grouped datasets calculation
  const groupedData = useMemo(() => {
    const map: Record<string, T[]> = {};

    if (groupingMode === 'none') {
      return { 'Fila de Cargas': items };
    }

    items.forEach((item) => {
      let key = '';
      if (groupingMode === 'city') {
        key = item.normCidade || 'CIDADE NÃO INFORMADA';
      } else if (groupingMode === 'sector') {
        key = item.effectiveRoute || item.normRota || 'ROTA NÃO MAPEADA';
      } else if (groupingMode === 'destinatario') {
        key = item.destinatario ? item.destinatario.toUpperCase().trim() : 'REMETENTE/DESTINATÁRIO INDEFINIDO';
      } else if (groupingMode === 'previsao') {
        key = item.prev_ent ? item.prev_ent.trim() : 'SEM PREVISÃO';
      } else if (groupingMode === 'priority') {
        key = item.manualPriority || 'NORMAL';
      } else if (groupingMode === 'status') {
        key = item.planningStatus || 'A_PLANEJAR';
      } else if (groupingMode === 'location') {
        key = (item.locationLabel || 'SEM LOCALIZAÇÃO').replace(/📍/g, '').trim();
      }

      const groupKey = key || 'NÃO ESPECIFICADO';

      if (!map[groupKey]) {
        map[groupKey] = [];
      }
      map[groupKey].push(item);
    });

    return map;
  }, [items, groupingMode]);

  return {
    groupingMode,
    setGroupingMode: changeGroupingMode,
    expandedGroups,
    toggleGroup,
    groupedData,
  };
}
