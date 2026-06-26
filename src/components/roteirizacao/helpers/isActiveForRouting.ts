export function isActiveForRouting(ctrcOrShipment: any): boolean {
  if (!ctrcOrShipment) return false;

  const status = typeof ctrcOrShipment.status === 'string' ? ctrcOrShipment.status.toUpperCase() : '';
  
  if (
    status === 'ENTREGUE' ||
    status === 'FINALIZADO' ||
    status === 'CANCELADO' ||
    status === 'BAIXA REALIZADA' ||
    status === 'ENTREGA REALIZADA'
  ) {
    return false;
  }

  if (ctrcOrShipment.is_delivered === true || ctrcOrShipment.isDelivered === true) {
    return false;
  }

  if (ctrcOrShipment.isActiveForRouting === false) {
    return false;
  }

  if (
    ctrcOrShipment.delivery_date ||
    ctrcOrShipment.deliveryDate ||
    ctrcOrShipment.realDeliveryDate ||
    ctrcOrShipment.dataEntregaRealizada ||
    ctrcOrShipment.data_entrega_realizada
  ) {
    return false;
  }

  // Check raw_payload / payload
  const payload = ctrcOrShipment.raw_payload || ctrcOrShipment.payload || ctrcOrShipment;
  if (
    payload.delivery_date ||
    payload.deliveryDate ||
    payload.realDeliveryDate ||
    payload.dataEntregaRealizada ||
    payload.data_entrega_realizada ||
    payload.is_delivered === true ||
    payload.isDelivered === true
  ) {
    return false;
  }

  // Specific occurrences that mean delivered
  const ocorrencia = typeof ctrcOrShipment.ocorrencia === 'string' ? ctrcOrShipment.ocorrencia.toUpperCase() : '';
  const descOcorrencia = typeof ctrcOrShipment.descricao_ocorr === 'string' ? ctrcOrShipment.descricao_ocorr.toUpperCase() : '';
  
  if (
    ocorrencia.includes('ENTREGUE') ||
    ocorrencia.includes('ENTREGA REALIZADA') ||
    descOcorrencia.includes('ENTREGUE') ||
    descOcorrencia.includes('ENTREGA REALIZADA')
  ) {
    return false;
  }

  return true;
}
