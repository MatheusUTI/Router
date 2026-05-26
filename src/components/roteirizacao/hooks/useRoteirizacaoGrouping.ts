import { useState, useMemo } from 'react';

export type GroupingMode = 'city' | 'sector' | 'destinatario' | 'previsao' | 'none';

export function useRoteirizacaoGrouping<T extends { normCidade: string; normSetor: string; destinatario?: string; prev_ent?: string }>(items: T[]) {
  const [groupingMode, setGroupingMode] = useState<GroupingMode>('city');
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
        key = item.normCidade;
      } else if (groupingMode === 'sector') {
        key = item.normSetor;
      } else if (groupingMode === 'destinatario') {
        key = item.destinatario ? item.destinatario.toUpperCase().trim() : 'REMETENTE/DESTINATÁRIO INDEFINIDO';
      } else if (groupingMode === 'previsao') {
        key = item.prev_ent ? item.prev_ent.trim() : 'SEM PREVISÃO';
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
