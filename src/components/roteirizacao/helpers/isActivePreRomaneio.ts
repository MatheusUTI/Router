import { PreRomaneio } from "../../../types";

export function isActivePreRomaneio(preRomaneio: PreRomaneio | any, hideConverted: boolean = false): boolean {
  if (!preRomaneio) return false;

  const status = preRomaneio.status || '';

  if (status === 'CANCELADO') {
    return false;
  }

  if (hideConverted && status === 'CONVERTIDO_ROMANEIO') {
    return false;
  }

  // Check for deleted or cancelled flags if they exist on the object
  if (preRomaneio.cancelled_at || preRomaneio.cancelledAt) {
    return false;
  }

  if (preRomaneio.is_deleted || preRomaneio.isDeleted) {
    return false;
  }

  return true;
}
