import { useState, useEffect, FormEvent } from 'react';
import { Vehicle, DriverScore, VehicleRegistry } from '../types';
import { calculateSuggestedGrLimit } from '../utils/grUtils';

interface FrotaViewProps {
  vehicles: Vehicle[];
  onAddVehicle: (v: Vehicle) => void;
  onUpdateVehicle: (v: Vehicle) => void;
  onRemoveVehicle: (id: string) => void;
  drivers: DriverScore[];
  onAddDriver: (d: DriverScore) => void;
  onUpdateDriver: (d: DriverScore) => void;
  onRemoveDriver: (id: string) => void;
  searchValue: string;
  isMaster?: boolean;
  vehicleRegistries: VehicleRegistry[];
  onAddVehicleRegistry: (vr: VehicleRegistry) => void;
  onUpdateVehicleRegistry: (vr: VehicleRegistry) => void;
  onRemoveVehicleRegistry: (placa: string) => void;
}

export default function FrotaView({
  vehicles,
  onAddVehicle,
  onUpdateVehicle,
  onRemoveVehicle,
  drivers,
  onAddDriver,
  onUpdateDriver,
  onRemoveDriver,
  searchValue,
  isMaster = false,
  vehicleRegistries = [],
  onAddVehicleRegistry,
  onUpdateVehicleRegistry,
  onRemoveVehicleRegistry,
}: FrotaViewProps) {
  const [subTab, setSubTab] = useState<'cadastro_gr' | 'veiculos' | 'motoristas'>('cadastro_gr');
  const [showForm, setShowForm] = useState<boolean>(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  // Toggle Edit Mode in Consulta Mode
  const [forceEditMode, setForceEditMode] = useState<boolean>(false);
  const canEdit = isMaster || forceEditMode;

  // Form Fields for VehicleRegistry (GR)
  const [vrPlaca, setVrPlaca] = useState('');
  const [vrTipo, setVrTipo] = useState<'PROPRIO' | 'PRÓPRIO' | 'AGREGADO' | 'APOIO' | 'TERCEIRO'>('PROPRIO');
  const [vrRastreado, setVrRastreado] = useState<boolean>(true);
  const [vrLimiteGrSugerido, setVrLimiteGrSugerido] = useState<number>(500000);
  const [vrMotoristaPadrao, setVrMotoristaPadrao] = useState('');
  const [vrAjudantePadrao, setVrAjudantePadrao] = useState('');
  const [vrStatusOperacional, setVrStatusOperacional] = useState<'ATIVO' | 'MANUTENCAO' | 'MANUTENÇÃO' | 'INATIVO'>('ATIVO');
  const [vrObservacoes, setVrObservacoes] = useState('');

  // Auto-update suggested limit when type or tracking changes (only in non-editing mode, so we don't overwrite manual edits)
  useEffect(() => {
    if (!editingId) {
      setVrLimiteGrSugerido(calculateSuggestedGrLimit(vrTipo, vrRastreado));
    }
  }, [vrTipo, vrRastreado, editingId]);

  // Form Fields for Vehicle
  const [vehiclePlaca, setVehiclePlaca] = useState('');
  const [vehicleDriver, setVehicleDriver] = useState('');
  const [vehicleCap, setVehicleCap] = useState('');
  const [vehicleType, setVehicleType] = useState('Baú Seco');
  const [vehicleStatus, setVehicleStatus] = useState<'Em Rota' | 'Disponível' | 'Manutenção'>('Disponível');

  // Form Fields for Driver/Helper
  const [driverName, setDriverName] = useState('');
  const [driverRole, setDriverRole] = useState<'Motorista' | 'Ajudante'>('Motorista');
  const [driverScore, setDriverScore] = useState(85);
  const [driverBestRoute, setDriverBestRoute] = useState('');
  const [driverPhone, setDriverPhone] = useState('');
  const [driverCnh, setDriverCnh] = useState('');

  const handleEditVehicleRegistry = (vr: VehicleRegistry) => {
    setEditingId(vr.placa);
    setVrPlaca(vr.placa);
    setVrTipo(vr.tipo);
    setVrRastreado(vr.rastreado);
    setVrLimiteGrSugerido(vr.limiteGrSugerido);
    setVrMotoristaPadrao(vr.motoristaPadrao || '');
    setVrAjudantePadrao(vr.ajudantePadrao || '');
    setVrStatusOperacional(vr.statusOperacional);
    setVrObservacoes(vr.observacoes || '');
    setShowForm(true);
  };

  const handleEditVehicle = (veh: Vehicle) => {
    setEditingId(veh.id);
    setVehiclePlaca(veh.id);
    setVehicleDriver(veh.driverName);
    setVehicleCap(veh.capacity);
    setVehicleType(veh.type);
    setVehicleStatus(veh.status);
    setShowForm(true);
  };

  const handleEditDriver = (driv: DriverScore) => {
    setEditingId(driv.id);
    setDriverName(driv.name);
    setDriverRole((driv.bestRoute || '').includes('Ajudante') ? 'Ajudante' : 'Motorista');
    setDriverScore(driv.score);
    setDriverBestRoute(driv.bestRoute);
    setDriverPhone('(11) 9' + Math.floor(10000000 + Math.random() * 90000000));
    setDriverCnh('CNH-' + Math.floor(100000 + Math.random() * 900000));
    setShowForm(true);
  };

  const handleSave = (e: FormEvent) => {
    e.preventDefault();
    if (subTab === 'cadastro_gr') {
      if (!vrPlaca) {
        alert("Preencha a placa do veículo.");
        return;
      }
      const vr: VehicleRegistry = {
        placa: vrPlaca.toUpperCase().trim(),
        tipo: vrTipo,
        rastreado: vrRastreado,
        limiteGrSugerido: Number(vrLimiteGrSugerido) || 0,
        motoristaPadrao: vrMotoristaPadrao || undefined,
        ajudantePadrao: vrAjudantePadrao || undefined,
        statusOperacional: vrStatusOperacional,
        observacoes: vrObservacoes || undefined,
      };
      if (editingId) {
        onUpdateVehicleRegistry(vr);
      } else {
        const exists = vehicleRegistries.some(x => x.placa === vr.placa);
        if (exists) {
          alert(`Veículo com a placa ${vr.placa} já está cadastrado.`);
          return;
        }
        onAddVehicleRegistry(vr);
      }
    } else if (subTab === 'veiculos') {
      if (!vehiclePlaca || !vehicleCap) {
        alert("Preencha placa e capacidade do veículo.");
        return;
      }
      const veh: Vehicle = {
        id: vehiclePlaca.toUpperCase(),
        driverName: vehicleDriver || 'Não designado',
        capacity: vehicleCap,
        type: vehicleType,
        status: vehicleStatus,
      };
      if (editingId) {
        onUpdateVehicle(veh);
      } else {
        onAddVehicle(veh);
      }
    } else {
      if (!driverName) {
        alert("Preencha o nome do colaborador.");
        return;
      }
      const driv: DriverScore = {
        id: editingId || `MOT-${Math.floor(1000 + Math.random() * 9000)}`,
        name: driverName,
        score: driverScore,
        bestRoute: driverRole === 'Ajudante' ? 'Ajudante Operacional' : (driverBestRoute || 'Rotas Gerais SP'),
        status: driverScore >= 90 ? 'Excelente' : driverScore >= 80 ? 'Bom' : driverScore >= 60 ? 'Regular' : 'Atenção',
        vehicle: 'Sob Demanda',
        avgTime: 20,
        errorRate: 2.0,
        successRate: 94.0,
        avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&q=80&w=256',
      };
      if (editingId) {
        onUpdateDriver(driv);
      } else {
        onAddDriver(driv);
      }
    }

    // Reset Fields
    resetForm();
  };

  const resetForm = () => {
    setShowForm(false);
    setEditingId(null);
    setVrPlaca('');
    setVrTipo('PROPRIO');
    setVrRastreado(true);
    setVrLimiteGrSugerido(500000);
    setVrMotoristaPadrao('');
    setVrAjudantePadrao('');
    setVrStatusOperacional('ATIVO');
    setVrObservacoes('');
    setVehiclePlaca('');
    setVehicleDriver('');
    setVehicleCap('');
    setVehicleType('Baú Seco');
    setVehicleStatus('Disponível');
    setDriverName('');
    setDriverRole('Motorista');
    setDriverScore(85);
    setDriverBestRoute('');
    setDriverPhone('');
    setDriverCnh('');
  };

  const filteredVehicleRegistries = (vehicleRegistries || []).filter(
    (vr) =>
      vr.placa.toLowerCase().includes(searchValue.toLowerCase()) ||
      (vr.motoristaPadrao || '').toLowerCase().includes(searchValue.toLowerCase()) ||
      vr.tipo.toLowerCase().includes(searchValue.toLowerCase()) ||
      vr.statusOperacional.toLowerCase().includes(searchValue.toLowerCase())
  );

  const filteredVehicles = vehicles.filter(
    (v) =>
      v.id.toLowerCase().includes(searchValue.toLowerCase()) ||
      v.driverName.toLowerCase().includes(searchValue.toLowerCase()) ||
      v.type.toLowerCase().includes(searchValue.toLowerCase())
  );

  const filteredDrivers = drivers.filter(
    (d) =>
      d.name.toLowerCase().includes(searchValue.toLowerCase()) ||
      d.bestRoute.toLowerCase().includes(searchValue.toLowerCase())
  );

  const handleExportJson = () => {
    const data = subTab === 'cadastro_gr' ? vehicleRegistries : subTab === 'veiculos' ? vehicles : drivers;
    const jsonStr = JSON.stringify(data, null, 2);
    const blob = new Blob([jsonStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `bd_${subTab}_${new Date().toISOString().split('T')[0]}.json`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const handleExportCsv = () => {
    let csvStr = '';
    if (subTab === 'cadastro_gr') {
      const headers = ['placa', 'tipo', 'rastreado', 'limiteGrSugerido', 'motoristaPadrao', 'ajudantePadrao', 'statusOperacional', 'observacoes'];
      const csvRows = [headers.join(';')];
      for (const item of vehicleRegistries) {
        const values = [
          item.placa,
          item.tipo,
          item.rastreado ? 'SIM' : 'NÃO',
          String(item.limiteGrSugerido),
          item.motoristaPadrao || '',
          item.ajudantePadrao || '',
          item.statusOperacional,
          item.observacoes || ''
        ];
        const escaped = values.map(v => {
          let s = String(v).replace(/"/g, '""');
          if (s.includes(';') || s.includes('\n') || s.includes('"')) s = `"${s}"`;
          return s;
        });
        csvRows.push(escaped.join(';'));
      }
      csvStr = csvRows.join('\n');
    } else if (subTab === 'veiculos') {
      const headers = ['id', 'driverName', 'capacity', 'type', 'status'];
      const csvRows = [headers.join(';')];
      for (const item of vehicles) {
        const values = [item.id, item.driverName, item.capacity, item.type, item.status];
        const escaped = values.map(v => {
          let s = String(v).replace(/"/g, '""');
          if (s.includes(';') || s.includes('\n') || s.includes('"')) s = `"${s}"`;
          return s;
        });
        csvRows.push(escaped.join(';'));
      }
      csvStr = csvRows.join('\n');
    } else {
      const headers = ['id', 'name', 'score', 'bestRoute', 'status', 'vehicle'];
      const csvRows = [headers.join(';')];
      for (const item of drivers) {
        const values = [item.id, item.name, String(item.score), item.bestRoute, item.status, item.vehicle || ''];
        const escaped = values.map(v => {
          let s = String(v).replace(/"/g, '""');
          if (s.includes(';') || s.includes('\n') || s.includes('"')) s = `"${s}"`;
          return s;
        });
        csvRows.push(escaped.join(';'));
      }
      csvStr = csvRows.join('\n');
    }
    const blob = new Blob([csvStr], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `bd_${subTab}_${new Date().toISOString().split('T')[0]}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6">
      {/* Visual Tab Selection Row */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-[var(--router-border)]/60 pb-3">
        <div className="flex gap-2">
          <button
            onClick={() => {
              setSubTab('cadastro_gr');
              resetForm();
            }}
            className={`px-4 py-2 text-xs font-bold rounded-lg transition-colors flex items-center gap-2 ${
              subTab === 'cadastro_gr'
                ? 'bg-primary-container text-on-primary-container shadow-sm border border-primary/20'
                : 'text-[var(--router-text-muted)] hover:text-[var(--router-text)] hover:router-card'
            }`}
          >
            <span className="material-symbols-outlined text-[16px]">verified_user</span>
            Cadastro Operacional GR & Frota ({filteredVehicleRegistries.length})
          </button>
          <button
            onClick={() => {
              setSubTab('veiculos');
              resetForm();
            }}
            className={`px-4 py-2 text-xs font-bold rounded-lg transition-colors flex items-center gap-2 ${
              subTab === 'veiculos'
                ? 'bg-primary-container text-on-primary-container shadow-sm'
                : 'text-[var(--router-text-muted)] hover:text-[var(--router-text)] hover:router-card'
            }`}
          >
            <span className="material-symbols-outlined text-[16px]">local_shipping</span>
            Filtro de Veículos ({filteredVehicles.length})
          </button>
          <button
            onClick={() => {
              setSubTab('motoristas');
              resetForm();
            }}
            className={`px-4 py-2 text-xs font-bold rounded-lg transition-colors flex items-center gap-2 ${
              subTab === 'motoristas'
                ? 'bg-primary-container text-on-primary-container shadow-sm'
                : 'text-[var(--router-text-muted)] hover:text-[var(--router-text)] hover:router-card'
            }`}
          >
            <span className="material-symbols-outlined text-[16px]">badge</span>
            Motoristas & Ajudantes ({filteredDrivers.length})
          </button>
        </div>

        <div className="flex items-center gap-2 self-start md:self-auto">
          <button
            onClick={handleExportJson}
            className="bg-indigo-950/70 hover:bg-indigo-900/80 border border-[#1e3a6c]/60 text-indigo-300 px-3 py-1.5 rounded-lg text-xs font-bold font-sans cursor-pointer flex items-center gap-1.5"
          >
            📥 Exportar JSON
          </button>
          <button
            onClick={handleExportCsv}
            className="bg-indigo-950/70 hover:bg-indigo-900/80 border border-[#1e3a6c]/60 text-indigo-300 px-3 py-1.5 rounded-lg text-xs font-bold font-sans cursor-pointer flex items-center gap-1.5"
          >
            📥 Exportar CSV
          </button>

          {canEdit ? (
            <div className="flex items-center gap-2">
              {!isMaster && (
                <button
                  type="button"
                  onClick={() => setForceEditMode(false)}
                  className="px-3 py-1.5 bg-yellow-600/20 hover:bg-yellow-600/30 border border-yellow-500/30 text-yellow-400 text-xs font-bold rounded-lg transition-colors flex items-center gap-1 cursor-pointer shadow-sm"
                >
                  🔒 Voltar para Consulta
                </button>
              )}
              <button
                onClick={() => {
                  resetForm();
                  setShowForm(true);
                }}
                className="px-4 py-1.5 bg-primary hover:bg-primary-fixed text-on-primary text-xs font-bold rounded-lg flex items-center gap-1.5 shadow-md cursor-pointer"
              >
                <span className="material-symbols-outlined text-[16px]">add_circle</span>
                {subTab === 'cadastro_gr' ? 'Cadastrar Veículo GR' : subTab === 'veiculos' ? 'Cadastrar Veículo' : 'Cadastrar Colaborador'}
              </button>
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <div className="px-3.5 py-1.5 bg-[#14203a] border border-[#1a2d54] text-xs text-gray-450 rounded-lg select-none">
                🔒 Modo Consulta
              </div>
              <button
                type="button"
                onClick={() => setForceEditMode(true)}
                className="px-3 py-1.5 bg-yellow-600 hover:bg-yellow-500 text-white text-xs font-bold rounded-lg flex items-center gap-1.5 shadow-md transition-colors cursor-pointer"
              >
                🔓 Habilitar Edição
              </button>
            </div>
          )}
        </div>
      </div>

      {showForm && (
        <form onSubmit={handleSave} className="router-card-high rounded-xl border border-primary/20 p-5 space-y-4">
          <div className="flex justify-between items-center border-b border-[var(--router-border)]/50 pb-2">
            <h3 className="text-sm font-bold text-primary flex items-center gap-2">
              <span className="material-symbols-outlined text-[18px]">edit_note</span>
              {editingId ? 'Editar Detalhes' : 'Novo Cadastro'}
            </h3>
            <button
              type="button"
              onClick={resetForm}
              className="text-[var(--router-text-muted)] hover:text-[var(--router-text)] p-1 rounded-md"
            >
              <span className="material-symbols-outlined text-[18px]">close</span>
            </button>
          </div>

          {subTab === 'cadastro_gr' ? (
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div className="text-left">
                <label className="text-xs font-semibold text-[var(--router-text)] block mb-1">Placa do Veículo</label>
                <input
                  type="text"
                  placeholder="Ex: RTA3G45"
                  value={vrPlaca}
                  onChange={(e) => setVrPlaca(e.target.value.toUpperCase().trim())}
                  className="w-full bg-[var(--router-surface-2)] border border-[var(--router-border)] rounded-lg px-3 py-2 text-xs text-[var(--router-text)] focus:outline-none focus:border-primary uppercase font-mono"
                  required
                  disabled={!!editingId}
                />
              </div>

              <div className="text-left">
                <label className="text-xs font-semibold text-[var(--router-text)] block mb-1">Classificação de Frota</label>
                <select
                  value={vrTipo}
                  onChange={(e) => setVrTipo(e.target.value as any)}
                  className="w-full bg-[var(--router-surface-2)] border border-[var(--router-border)] rounded-lg px-3 py-2 text-xs text-[var(--router-text)] focus:outline-none focus:border-primary"
                >
                  <option value="PROPRIO">PRÓPRIO (Frota Própria Estável)</option>
                  <option value="AGREGADO">AGREGADO</option>
                  <option value="APOIO">APOIO (Frota de Apoio)</option>
                  <option value="TERCEIRO">TERCEIRO</option>
                </select>
              </div>

              <div className="text-left">
                <label className="text-xs font-semibold text-[var(--router-text)] block mb-1">Rastreamento GR</label>
                <select
                  value={vrRastreado ? "true" : "false"}
                  onChange={(e) => setVrRastreado(e.target.value === "true")}
                  className="w-full bg-[var(--router-surface-2)] border border-[var(--router-border)] rounded-lg px-3 py-2 text-xs text-[var(--router-text)] focus:outline-none focus:border-primary"
                >
                  <option value="true">Rastreado (Homologado)</option>
                  <option value="false">Não Rastreado</option>
                </select>
              </div>

              <div className="text-left">
                <label className="text-xs font-semibold text-[var(--router-text)] block mb-1">Limite GR Sugerido (R$)</label>
                <select
                  value={vrLimiteGrSugerido}
                  onChange={(e) => setVrLimiteGrSugerido(Number(e.target.value))}
                  className="w-full bg-[var(--router-surface-2)] border border-[var(--router-border)] rounded-lg px-3 py-2 text-xs text-[var(--router-text)] focus:outline-none focus:border-primary"
                >
                  <option value={300000}>Até R$ 300.000 (Padrão)</option>
                  <option value={500000}>Até R$ 500.000 (Avançado)</option>
                  <option value={1000000}>Até R$ 1.000.000 (Especial)</option>
                </select>
              </div>

              <div className="text-left">
                <label className="text-xs font-semibold text-[var(--router-text)] block mb-1">Motorista Padrão</label>
                <input
                  type="text"
                  placeholder="Nome do motorista principal"
                  value={vrMotoristaPadrao}
                  onChange={(e) => setVrMotoristaPadrao(e.target.value)}
                  className="w-full bg-[var(--router-surface-2)] border border-[var(--router-border)] rounded-lg px-3 py-2 text-xs text-[var(--router-text)] focus:outline-none focus:border-primary"
                />
              </div>

              <div className="text-left">
                <label className="text-xs font-semibold text-[var(--router-text)] block mb-1">Ajudante Padrão</label>
                <input
                  type="text"
                  placeholder="Nome do ajudante principal"
                  value={vrAjudantePadrao}
                  onChange={(e) => setVrAjudantePadrao(e.target.value)}
                  className="w-full bg-[var(--router-surface-2)] border border-[var(--router-border)] rounded-lg px-3 py-2 text-xs text-[var(--router-text)] focus:outline-none focus:border-primary"
                />
              </div>

              <div className="text-left">
                <label className="text-xs font-semibold text-[var(--router-text)] block mb-1">Status Operacional</label>
                <select
                  value={vrStatusOperacional}
                  onChange={(e) => setVrStatusOperacional(e.target.value as any)}
                  className="w-full bg-[var(--router-surface-2)] border border-[var(--router-border)] rounded-lg px-3 py-2 text-xs text-[var(--router-text)] focus:outline-none focus:border-primary"
                >
                  <option value="ATIVO">ATIVO (Ativo)</option>
                  <option value="MANUTENCAO">MANUTENÇÃO (Manutenção)</option>
                  <option value="INATIVO">INATIVO (Inativo)</option>
                </select>
              </div>

              <div className="text-left md:col-span-1">
                <label className="text-xs font-semibold text-[var(--router-text)] block mb-1">Observações Operacionais</label>
                <input
                  type="text"
                  placeholder="Ex: Restrições de horário, etc"
                  value={vrObservacoes}
                  onChange={(e) => setVrObservacoes(e.target.value)}
                  className="w-full bg-[var(--router-surface-2)] border border-[var(--router-border)] rounded-lg px-3 py-2 text-xs text-[var(--router-text)] focus:outline-none focus:border-primary"
                />
              </div>
            </div>
          ) : subTab === 'veiculos' ? (
            <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
              <div className="text-left">
                <label className="text-xs font-semibold text-[var(--router-text)] block mb-1">Placa do Veículo</label>
                <input
                  type="text"
                  placeholder="Ex: RTA3G45"
                  value={vehiclePlaca}
                  onChange={(e) => setVehiclePlaca(e.target.value)}
                  className="w-full bg-[var(--router-surface-2)] border border-[var(--router-border)] rounded-lg px-3 py-2 text-xs text-[var(--router-text)] focus:outline-none focus:border-primary uppercase font-mono"
                  required
                />
              </div>

              <div className="text-left">
                <label className="text-xs font-semibold text-[var(--router-text)] block mb-1">Capacidade de Carga</label>
                <input
                  type="text"
                  placeholder="Ex: 3/4 - 4.5t"
                  value={vehicleCap}
                  onChange={(e) => setVehicleCap(e.target.value)}
                  className="w-full bg-[var(--router-surface-2)] border border-[var(--router-border)] rounded-lg px-3 py-2 text-xs text-[var(--router-text)] focus:outline-none focus:border-primary"
                  required
                />
              </div>

              <div className="text-left">
                <label className="text-xs font-semibold text-[var(--router-text)] block mb-1">Motorista Vinculado</label>
                <input
                  type="text"
                  placeholder="Selecione ou digite..."
                  value={vehicleDriver}
                  onChange={(e) => setVehicleDriver(e.target.value)}
                  className="w-full bg-[var(--router-surface-2)] border border-[var(--router-border)] rounded-lg px-3 py-2 text-xs text-[var(--router-text)] focus:outline-none focus:border-primary"
                />
              </div>

              <div className="text-left">
                <label className="text-xs font-semibold text-[var(--router-text)] block mb-1">Tipo de Carroceria</label>
                <select
                  value={vehicleType}
                  onChange={(e) => setVehicleType(e.target.value)}
                  className="w-full bg-[var(--router-surface-2)] border border-[var(--router-border)] rounded-lg px-3 py-2 text-xs text-[var(--router-text)] focus:outline-none focus:border-primary"
                >
                  <option value="Baú Seco">Baú Seco</option>
                  <option value="Refrigerado">Refrigerado</option>
                  <option value="Sider">Sider</option>
                  <option value="Graneleiro">Graneleiro</option>
                  <option value="Carga de Prancha">Carga de Prancha</option>
                </select>
              </div>

              <div className="text-left">
                <label className="text-xs font-semibold text-[var(--router-text)] block mb-1">Status Operacional</label>
                <select
                  value={vehicleStatus}
                  onChange={(e) => setVehicleStatus(e.target.value as any)}
                  className="w-full bg-[var(--router-surface-2)] border border-[var(--router-border)] rounded-lg px-3 py-2 text-xs text-[var(--router-text)] focus:outline-none focus:border-primary"
                >
                  <option value="Disponível">Disponível</option>
                  <option value="Em Rota">Em Rota</option>
                  <option value="Manutenção">Manutenção</option>
                </select>
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-6 gap-4">
              <div className="text-left md:col-span-2">
                <label className="text-xs font-semibold text-[var(--router-text)] block mb-1">Nome Completo</label>
                <input
                  type="text"
                  placeholder="Nome do colaborador"
                  value={driverName}
                  onChange={(e) => setDriverName(e.target.value)}
                  className="w-full bg-[var(--router-surface-2)] border border-[var(--router-border)] rounded-lg px-3 py-2 text-xs text-[var(--router-text)] focus:outline-none focus:border-primary"
                  required
                />
              </div>

              <div className="text-left">
                <label className="text-xs font-semibold text-[var(--router-text)] block mb-1">Cargo / Função</label>
                <select
                  value={driverRole}
                  onChange={(e) => setDriverRole(e.target.value as any)}
                  className="w-full bg-[var(--router-surface-2)] border border-[var(--router-border)] rounded-lg px-3 py-2 text-xs text-[var(--router-text)] focus:outline-none focus:border-primary"
                >
                  <option value="Motorista">Motorista</option>
                  <option value="Ajudante">Ajudante</option>
                </select>
              </div>

              <div className="text-left">
                <label className="text-xs font-semibold text-[var(--router-text)] block mb-1">Pontuação Score (0-100)</label>
                <input
                  type="number"
                  min="0"
                  max="100"
                  value={driverScore}
                  onChange={(e) => setDriverScore(parseInt(e.target.value) || 0)}
                  className="w-full bg-[var(--router-surface-2)] border border-[var(--router-border)] rounded-lg px-3 py-2 text-xs text-[var(--router-text)] focus:outline-none focus:border-primary"
                />
              </div>

              <div className="text-left md:col-span-2">
                <label className="text-xs font-semibold text-[var(--router-text)] block mb-1">Setor Dominante / Melhor Rota</label>
                <input
                  type="text"
                  placeholder="Ex: São Paulo - Z. Sul"
                  disabled={driverRole === 'Ajudante'}
                  value={driverRole === 'Ajudante' ? 'Ajudante Operacional' : driverBestRoute}
                  onChange={(e) => setDriverBestRoute(e.target.value)}
                  className="w-full bg-[var(--router-surface-2)] border border-[var(--router-border)] rounded-lg px-3 py-2 text-xs text-[var(--router-text)] focus:outline-none focus:border-primary disabled:opacity-50"
                />
              </div>
            </div>
          )}

          <div className="flex justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={resetForm}
              className="px-4 py-2 bg-[var(--router-surface-2)] hover:bg-[var(--router-surface)] text-[var(--router-text)] border border-[var(--router-border)] text-xs font-bold rounded-lg transition-colors"
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="px-4 py-2 bg-primary hover:bg-primary-fixed text-on-primary text-xs font-bold rounded-lg transition-colors shadow-sm"
            >
              Confirmar Dados
            </button>
          </div>
        </form>
      )}

      {/* Lists Row based on subTab */}
      {subTab === 'cadastro_gr' ? (
        <div className="router-card rounded-xl border border-[var(--router-border)] p-5 space-y-4">
          <div className="flex justify-between items-center">
            <div>
              <h4 className="text-sm font-bold text-[var(--router-text)]">Mesa Geral de Veículos & Cadastro de Risco (GR)</h4>
              <p className="text-xs text-[var(--router-text-muted)]">Classificação de frota e rastreamento para fechamento operacional dos pré-romaneios.</p>
            </div>
            <div className="text-right text-xs text-[var(--router-text-muted)]">
              Total de Veículos Homologados: <span className="font-bold text-primary">{vehicleRegistries.length}</span>
            </div>
          </div>
          <div className="overflow-x-auto rounded-lg border border-[var(--router-border)]/60">
            <table className="w-full text-left text-xs font-sans">
              <thead className="bg-[#131b2e] border-b border-[var(--router-border)] text-[11px] font-bold text-[var(--router-text-muted)]">
                <tr>
                  <th className="px-5 py-3">Placa</th>
                  <th className="px-5 py-3">Classificação</th>
                  <th className="px-5 py-3">Rastreamento GR</th>
                  <th className="px-5 py-3">Limite Operacional</th>
                  <th className="px-5 py-3">Motorista Padrão</th>
                  <th className="px-5 py-3">Ajudante Padrão</th>
                  <th className="px-5 py-3 text-center">Status Op.</th>
                  <th className="px-5 py-3">Observações</th>
                  {canEdit && <th className="px-5 py-3 text-right">Ações</th>}
                </tr>
              </thead>
              <tbody className="divide-y divide-outline-variant/30 leading-normal">
                {filteredVehicleRegistries.map((vr) => {
                  const typeLabel =
                    vr.tipo === 'PROPRIO' || vr.tipo === 'PRÓPRIO'
                      ? 'PRÓPRIO'
                      : vr.tipo === 'AGREGADO'
                      ? 'AGREGADO'
                      : vr.tipo === 'APOIO'
                      ? 'APOIO'
                      : vr.tipo === 'TERCEIRO'
                      ? 'TERCEIRO'
                      : vr.tipo;
                  const typeColor =
                    vr.tipo === 'PROPRIO' || vr.tipo === 'PRÓPRIO'
                      ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                      : vr.tipo === 'AGREGADO'
                      ? 'bg-blue-500/10 text-blue-400 border-blue-500/20'
                      : vr.tipo === 'APOIO'
                      ? 'bg-amber-500/10 text-amber-400 border-amber-500/20'
                      : 'bg-indigo-500/10 text-indigo-400 border-indigo-500/20';

                  const trackerLabel = vr.rastreado ? 'Rastreado' : 'Sem Rastreio';
                  const trackerColor = vr.rastreado
                     ? 'bg-cyan-500/10 text-cyan-400 border-cyan-500/20'
                     : 'bg-zinc-500/10 text-zinc-400 border-zinc-500/20';

                  const statusColor =
                    vr.statusOperacional === 'ATIVO'
                      ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                      : vr.statusOperacional === 'MANUTENCAO' || vr.statusOperacional === 'MANUTENÇÃO'
                      ? 'bg-amber-500/10 text-amber-400 border-amber-500/20'
                      : 'bg-rose-500/10 text-rose-400 border-rose-500/20';

                  return (
                    <tr key={vr.placa} className="hover:bg-[var(--router-surface-2)] border-b border-[var(--router-border)]/30 transition-colors">
                      <td className="px-5 py-3.5 font-bold font-mono text-primary text-sm uppercase">{vr.placa}</td>
                      <td className="px-5 py-3.5">
                        <span className={`px-2 py-0.5 rounded-full border text-[10px] font-bold ${typeColor}`}>
                          {typeLabel}
                        </span>
                      </td>
                      <td className="px-5 py-3.5">
                        <span className={`px-2 py-0.5 rounded-full border text-[10px] font-bold ${trackerColor}`}>
                          {trackerLabel}
                        </span>
                      </td>
                      <td className="px-5 py-3.5 font-semibold text-[var(--router-text)]">
                        {vr.limiteGrSugerido.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 })}
                      </td>
                      <td className="px-5 py-3.5 text-[var(--router-text)] font-semibold">{vr.motoristaPadrao || 'Não Vinculado'}</td>
                      <td className="px-5 py-3.5 text-[var(--router-text-muted)]">{vr.ajudantePadrao || '-'}</td>
                      <td className="px-5 py-3.5 text-center">
                        <span className={`px-2 py-0.5 rounded-full border text-[10px] font-bold ${statusColor}`}>
                          {vr.statusOperacional === 'MANUTENCAO' || vr.statusOperacional === 'MANUTENÇÃO' ? 'MANUTENÇÃO' : vr.statusOperacional}
                        </span>
                      </td>
                      <td className="px-5 py-3.5 text-[var(--router-text-muted)] truncate max-w-[180px]" title={vr.observacoes}>
                        {vr.observacoes || <span className="text-zinc-600 text-[11px] italic">Sem observações</span>}
                      </td>
                      {canEdit && (
                        <td className="px-5 py-3.5 text-right">
                          <div className="flex justify-end gap-1">
                            <button
                              onClick={() => handleEditVehicleRegistry(vr)}
                              className="p-1 rounded hover:bg-[var(--router-surface)] text-[var(--router-text-muted)] hover:text-primary transition-colors cursor-pointer"
                              title="Editar"
                            >
                              <span className="material-symbols-outlined text-[16px]">edit</span>
                            </button>
                            <button
                              onClick={() => {
                                if (confirm(`Excluir o cadastro de GR do veículo ${vr.placa}?`)) {
                                  onRemoveVehicleRegistry(vr.placa);
                                }
                              }}
                              className="p-1 rounded hover:bg-[var(--router-surface)] text-[var(--router-text-muted)] hover:text-error transition-colors cursor-pointer"
                              title="Excluir"
                            >
                              <span className="material-symbols-outlined text-[16px]">delete</span>
                            </button>
                          </div>
                        </td>
                      )}
                    </tr>
                  );
                })}
                {filteredVehicleRegistries.length === 0 && (
                  <tr>
                    <td colSpan={canEdit ? 9 : 8} className="text-center py-10 text-[var(--router-text-muted)]">
                      Nenhum veículo cadastrado no GR correspondente à pesquisa.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      ) : subTab === 'veiculos' ? (
        <div className="router-card rounded-xl border border-[var(--router-border)] p-5">
          <div className="overflow-x-auto rounded-lg border border-[var(--router-border)]/60">
            <table className="w-full text-left text-xs font-sans">
              <thead className="bg-[#131b2e] border-b border-[var(--router-border)] text-[11px] font-bold text-[var(--router-text-muted)]">
                <tr>
                  <th className="px-5 py-3">Placa / Registro</th>
                  <th className="px-5 py-3">Tipo Carroceria</th>
                  <th className="px-5 py-3">Capacidade</th>
                  <th className="px-5 py-3">Motorista Atribuído</th>
                  <th className="px-5 py-3 text-center">Status</th>
                  {canEdit && <th className="px-5 py-3 text-right">Ações</th>}
                </tr>
              </thead>
              <tbody className="divide-y divide-outline-variant/30 leading-normal">
                {filteredVehicles.map((veh) => {
                  const statusColors =
                    veh.status === 'Em Rota'
                      ? 'bg-primary/10 text-primary-fixed-dim border-primary/20'
                      : veh.status === 'Disponível'
                      ? 'bg-tertiary/10 text-tertiary border-tertiary/20'
                      : 'bg-error/10 text-error border-error/20';

                  return (
                    <tr key={veh.id} className="hover:bg-[var(--router-surface-2)] border-b border-[var(--router-border)]/30 transition-colors">
                      <td className="px-5 py-3.5 font-bold font-mono text-primary">{veh.id}</td>
                      <td className="px-5 py-3.5 text-[var(--router-text)] font-semibold">{veh.type}</td>
                      <td className="px-5 py-3.5 text-[var(--router-text-muted)] font-mono">{veh.capacity}</td>
                      <td className="px-5 py-3.5 text-[var(--router-text)] font-semibold">{veh.driverName}</td>
                      <td className="px-5 py-3.5 text-center">
                        <span className={`px-2 py-0.5 rounded-full border text-[10px] font-bold ${statusColors}`}>
                          {veh.status}
                        </span>
                      </td>
                      {canEdit && (
                        <td className="px-5 py-3.5 text-right">
                          <div className="flex justify-end gap-1">
                            <button
                              onClick={() => handleEditVehicle(veh)}
                              className="p-1 rounded hover:bg-[var(--router-surface)] text-[var(--router-text-muted)] hover:text-primary transition-colors cursor-pointer"
                              title="Editar"
                            >
                              <span className="material-symbols-outlined text-[16px]">edit</span>
                            </button>
                            <button
                              disabled={veh.status === 'Em Rota'}
                               onClick={() => {
                                 if (confirm(`Excluir o veículo ${veh.id}?`)) onRemoveVehicle(veh.id);
                               }}
                              className="p-1 rounded hover:bg-[var(--router-surface)] text-[var(--router-text-muted)] hover:text-error disabled:opacity-30 transition-colors cursor-pointer"
                              title={veh.status === 'Em Rota' ? 'Não permitido em rota' : 'Excluir'}
                            >
                              <span className="material-symbols-outlined text-[16px]">delete</span>
                            </button>
                          </div>
                        </td>
                      )}
                    </tr>
                  );
                })}
                {filteredVehicles.length === 0 && (
                  <tr>
                    <td colSpan={canEdit ? 6 : 5} className="text-center py-10 text-[var(--router-text-muted)]">
                      Nenhum veículo encontrado correspondente à pesquisa.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        <div className="router-card rounded-xl border border-[var(--router-border)] p-5">
          <div className="overflow-x-auto rounded-lg border border-[var(--router-border)]/60">
            <table className="w-full text-left text-xs font-sans">
              <thead className="bg-[#131b2e] border-b border-[var(--router-border)] text-[11px] font-bold text-[var(--router-text-muted)]">
                <tr>
                  <th className="px-5 py-3">Colaborador</th>
                  <th className="px-5 py-3">Score Global</th>
                  <th className="px-5 py-3 text-center">Status</th>
                  <th className="px-5 py-3">Melhor Rota</th>
                  <th className="px-5 py-3">Taxa de Sucesso</th>
                  {canEdit && <th className="px-5 py-3 text-right">Ações</th>}
                </tr>
              </thead>
              <tbody className="divide-y divide-outline-variant/30 leading-normal">
                {filteredDrivers.map((driv) => {
                  const isAjudante = driv.bestRoute === 'Ajudante Operacional';
                  const scoreColor =
                    driv.score >= 90
                      ? 'text-tertiary bg-tertiary-container/10 border-tertiary/20'
                      : driv.score >= 80
                      ? 'text-primary bg-primary-container/10 border-primary/20'
                      : driv.score >= 60
                      ? 'text-[var(--router-text)] router-card-highest border-[var(--router-border)]/30'
                      : 'text-error bg-error-container/10 border-error/20';

                  return (
                    <tr key={driv.id} className="hover:bg-[var(--router-surface-2)] border-b border-[var(--router-border)]/30 transition-colors">
                      <td className="px-5 py-3.5">
                        <div className="flex items-center gap-3">
                          <img
                            src={driv.avatar}
                            alt=""
                            className="w-8 h-8 rounded-full border border-[var(--router-border)] object-cover"
                            referrerPolicy="no-referrer"
                          />
                          <div>
                            <p className="font-bold text-[var(--router-text)] leading-tight">{driv.name}</p>
                            <p className="text-[10px] font-mono text-[var(--router-text-muted)] mt-0.5 uppercase tracking-wide">
                              {isAjudante ? 'Ajudante' : 'Motorista Ativo'}
                            </p>
                          </div>
                        </div>
                      </td>
                      <td className="px-5 py-3.5">
                        <span className={`px-2 py-0.5 rounded-sm border text-[11px] font-mono font-bold ${scoreColor}`}>
                          {driv.score} pts
                        </span>
                      </td>
                      <td className="px-5 py-3.5 text-center">
                        <span
                          className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                            driv.status === 'Excelente'
                              ? 'bg-tertiary/20 text-tertiary'
                              : driv.status === 'Bom'
                              ? 'bg-primary/20 text-primary-fixed-dim'
                              : driv.status === 'Regular'
                              ? 'router-card-highest text-[var(--router-text-muted)]'
                              : 'bg-error/20 text-error'
                          }`}
                        >
                          {driv.status}
                        </span>
                      </td>
                      <td className="px-5 py-3.5 text-[var(--router-text)] font-semibold font-sans">{driv.bestRoute}</td>
                      <td className="px-5 py-3.5 text-[var(--router-text-muted)] font-mono">{driv.successRate}%</td>
                      {canEdit && (
                        <td className="px-5 py-3.5 text-right font-semibold">
                          <div className="flex justify-end gap-1">
                            <button
                              onClick={() => handleEditDriver(driv)}
                              className="p-1 rounded hover:bg-[var(--router-surface)] text-[var(--router-text-muted)] hover:text-primary transition-colors cursor-pointer"
                              title="Editar"
                            >
                              <span className="material-symbols-outlined text-[16px]">edit</span>
                            </button>
                            <button
                              onClick={() => {
                                if (confirm(`Excluir o registro de ${driv.name}?`)) onRemoveDriver(driv.id);
                              }}
                              className="p-1 rounded hover:bg-[var(--router-surface)] text-[var(--router-text-muted)] hover:text-error transition-colors cursor-pointer"
                              title="Excluir"
                            >
                              <span className="material-symbols-outlined text-[16px]">delete</span>
                            </button>
                          </div>
                        </td>
                      )}
                    </tr>
                  );
                })}
                {filteredDrivers.length === 0 && (
                  <tr>
                    <td colSpan={canEdit ? 6 : 5} className="text-center py-10 text-[var(--router-text-muted)]">
                      Nenhum colaborador encontrado correspondente à pesquisa.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
