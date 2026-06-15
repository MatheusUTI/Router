import { useState, useCallback } from 'react';

export function useVehicleAllocation() {
  // Staging Draft assignments: mapping of { [ctrcId]: vehicleId }
  const [draftAssignments, setDraftAssignments] = useState<Record<string, string>>({});

  const assignCargasToVehicle = useCallback((cargaIds: string[], vehicleId: string) => {
    setDraftAssignments((prev) => {
      const updated = { ...prev };
      cargaIds.forEach((id) => {
        updated[id] = vehicleId;
      });
      return updated;
    });
  }, []);

  const unassignCarga = useCallback((cargaId: string) => {
    setDraftAssignments((prev) => {
      const updated = { ...prev };
      delete updated[cargaId];
      return updated;
    });
  }, []);

  const clearVehicleDraft = useCallback((vehicleId: string) => {
    setDraftAssignments((prev) => {
      const updated = { ...prev };
      Object.keys(updated).forEach((id) => {
        if (updated[id] === vehicleId) {
          delete updated[id];
        }
      });
      return updated;
    });
  }, []);

  const clearAllDrafts = useCallback(() => {
    setDraftAssignments({});
  }, []);

  return {
    draftAssignments,
    setDraftAssignments,
    assignCargasToVehicle,
    unassignCarga,
    clearVehicleDraft,
    clearAllDrafts
  };
}
