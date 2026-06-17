import { useState, FormEvent } from 'react';
import { Vehicle, DriverScore } from '../types';

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
}: FrotaViewProps) {
  const [subTab, setSubTab] = useState<'veiculos' | 'motoristas'>('veiculos');
  const [showForm, setShowForm] = useState<boolean>(false);
  const [editingId, setEditingId] = useState<string | null>(null);

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
    if (subTab === 'veiculos') {
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
    const data = subTab === 'veiculos' ? vehicles : drivers;
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
    if (subTab === 'veiculos') {
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
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-outline-variant/60 pb-3">
        <div className="flex gap-2">
          <button
            onClick={() => {
              setSubTab('veiculos');
              resetForm();
            }}
            className={`px-4 py-2 text-xs font-bold rounded-lg transition-colors flex items-center gap-2 ${
              subTab === 'veiculos'
                ? 'bg-primary-container text-on-primary-container shadow-sm'
                : 'text-on-surface-variant hover:text-on-surface hover:bg-surface-container'
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
                : 'text-on-surface-variant hover:text-on-surface hover:bg-surface-container'
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

          {isMaster ? (
            <button
              onClick={() => {
                resetForm();
                setShowForm(true);
              }}
              className="px-4 py-1.5 bg-primary hover:bg-primary-fixed text-on-primary text-xs font-bold rounded-lg flex items-center gap-1.5 shadow-md"
            >
              <span className="material-symbols-outlined text-[16px]">add_circle</span>
              {subTab === 'veiculos' ? 'Cadastrar Veículo' : 'Cadastrar Colaborador'}
            </button>
          ) : (
            <div className="px-3.5 py-1.5 bg-[#14203a] border border-[#1a2d54] text-xs text-gray-450 rounded-lg select-none">
              🔒 Modo Consulta
            </div>
          )}
        </div>
      </div>

      {showForm && (
        <form onSubmit={handleSave} className="bg-surface-container-high rounded-xl border border-primary/20 p-5 space-y-4">
          <div className="flex justify-between items-center border-b border-outline-variant/50 pb-2">
            <h3 className="text-sm font-bold text-primary flex items-center gap-2">
              <span className="material-symbols-outlined text-[18px]">edit_note</span>
              {editingId ? 'Editar Detalhes' : 'Novo Cadastro'}
            </h3>
            <button
              type="button"
              onClick={resetForm}
              className="text-on-surface-variant hover:text-on-surface p-1 rounded-md"
            >
              <span className="material-symbols-outlined text-[18px]">close</span>
            </button>
          </div>

          {subTab === 'veiculos' ? (
            <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
              <div className="text-left">
                <label className="text-xs font-semibold text-on-surface block mb-1">Placa do Veículo</label>
                <input
                  type="text"
                  placeholder="Ex: RTA3G45"
                  value={vehiclePlaca}
                  onChange={(e) => setVehiclePlaca(e.target.value)}
                  className="w-full bg-surface border border-outline-variant rounded-lg px-3 py-2 text-xs text-on-surface focus:outline-none focus:border-primary uppercase font-mono"
                  required
                />
              </div>

              <div className="text-left">
                <label className="text-xs font-semibold text-on-surface block mb-1">Capacidade de Carga</label>
                <input
                  type="text"
                  placeholder="Ex: 3/4 - 4.5t"
                  value={vehicleCap}
                  onChange={(e) => setVehicleCap(e.target.value)}
                  className="w-full bg-surface border border-outline-variant rounded-lg px-3 py-2 text-xs text-on-surface focus:outline-none focus:border-primary"
                  required
                />
              </div>

              <div className="text-left">
                <label className="text-xs font-semibold text-on-surface block mb-1">Motorista Vinculado</label>
                <input
                  type="text"
                  placeholder="Selecione ou digite..."
                  value={vehicleDriver}
                  onChange={(e) => setVehicleDriver(e.target.value)}
                  className="w-full bg-surface border border-outline-variant rounded-lg px-3 py-2 text-xs text-on-surface focus:outline-none focus:border-primary"
                />
              </div>

              <div className="text-left">
                <label className="text-xs font-semibold text-on-surface block mb-1">Tipo de Carroceria</label>
                <select
                  value={vehicleType}
                  onChange={(e) => setVehicleType(e.target.value)}
                  className="w-full bg-surface border border-outline-variant rounded-lg px-3 py-2 text-xs text-on-surface focus:outline-none focus:border-primary"
                >
                  <option value="Baú Seco">Baú Seco</option>
                  <option value="Refrigerado">Refrigerado</option>
                  <option value="Sider">Sider</option>
                  <option value="Graneleiro">Graneleiro</option>
                  <option value="Carga de Prancha">Carga de Prancha</option>
                </select>
              </div>

              <div className="text-left">
                <label className="text-xs font-semibold text-on-surface block mb-1">Status Operacional</label>
                <select
                  value={vehicleStatus}
                  onChange={(e) => setVehicleStatus(e.target.value as any)}
                  className="w-full bg-surface border border-outline-variant rounded-lg px-3 py-2 text-xs text-on-surface focus:outline-none focus:border-primary"
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
                <label className="text-xs font-semibold text-on-surface block mb-1">Nome Completo</label>
                <input
                  type="text"
                  placeholder="Nome do colaborador"
                  value={driverName}
                  onChange={(e) => setDriverName(e.target.value)}
                  className="w-full bg-surface border border-outline-variant rounded-lg px-3 py-2 text-xs text-on-surface focus:outline-none focus:border-primary"
                  required
                />
              </div>

              <div className="text-left">
                <label className="text-xs font-semibold text-on-surface block mb-1">Cargo / Função</label>
                <select
                  value={driverRole}
                  onChange={(e) => setDriverRole(e.target.value as any)}
                  className="w-full bg-surface border border-outline-variant rounded-lg px-3 py-2 text-xs text-on-surface focus:outline-none focus:border-primary"
                >
                  <option value="Motorista">Motorista</option>
                  <option value="Ajudante">Ajudante</option>
                </select>
              </div>

              <div className="text-left">
                <label className="text-xs font-semibold text-on-surface block mb-1">Pontuação Score (0-100)</label>
                <input
                  type="number"
                  min="0"
                  max="100"
                  value={driverScore}
                  onChange={(e) => setDriverScore(parseInt(e.target.value) || 0)}
                  className="w-full bg-surface border border-outline-variant rounded-lg px-3 py-2 text-xs text-on-surface focus:outline-none focus:border-primary"
                />
              </div>

              <div className="text-left md:col-span-2">
                <label className="text-xs font-semibold text-on-surface block mb-1">Setor Dominante / Melhor Rota</label>
                <input
                  type="text"
                  placeholder="Ex: São Paulo - Z. Sul"
                  disabled={driverRole === 'Ajudante'}
                  value={driverRole === 'Ajudante' ? 'Ajudante Operacional' : driverBestRoute}
                  onChange={(e) => setDriverBestRoute(e.target.value)}
                  className="w-full bg-surface border border-outline-variant rounded-lg px-3 py-2 text-xs text-on-surface focus:outline-none focus:border-primary disabled:opacity-50"
                />
              </div>
            </div>
          )}

          <div className="flex justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={resetForm}
              className="px-4 py-2 bg-surface hover:bg-surface-bright text-on-surface border border-outline-variant text-xs font-bold rounded-lg transition-colors"
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
      {subTab === 'veiculos' ? (
        <div className="bg-surface-container rounded-xl border border-outline-variant p-5">
          <div className="overflow-x-auto rounded-lg border border-outline-variant/60">
            <table className="w-full text-left text-xs font-sans">
              <thead className="bg-[#131b2e] border-b border-outline-variant text-[11px] font-bold text-on-surface-variant">
                <tr>
                  <th className="px-5 py-3">Placa / Registro</th>
                  <th className="px-5 py-3">Tipo Carroceria</th>
                  <th className="px-5 py-3">Capacidade</th>
                  <th className="px-5 py-3">Motorista Atribuído</th>
                  <th className="px-5 py-3 text-center">Status</th>
                  {isMaster && <th className="px-5 py-3 text-right">Ações</th>}
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
                    <tr key={veh.id} className="hover:bg-surface border-b border-outline-variant/30 transition-colors">
                      <td className="px-5 py-3.5 font-bold font-mono text-primary">{veh.id}</td>
                      <td className="px-5 py-3.5 text-on-surface font-semibold">{veh.type}</td>
                      <td className="px-5 py-3.5 text-on-surface-variant font-mono">{veh.capacity}</td>
                      <td className="px-5 py-3.5 text-on-surface font-semibold">{veh.driverName}</td>
                      <td className="px-5 py-3.5 text-center">
                        <span className={`px-2 py-0.5 rounded-full border text-[10px] font-bold ${statusColors}`}>
                          {veh.status}
                        </span>
                      </td>
                      {isMaster && (
                        <td className="px-5 py-3.5 text-right">
                          <div className="flex justify-end gap-1">
                            <button
                              onClick={() => handleEditVehicle(veh)}
                              className="p-1 rounded hover:bg-surface-bright text-on-surface-variant hover:text-primary transition-colors"
                              title="Editar"
                            >
                              <span className="material-symbols-outlined text-[16px]">edit</span>
                            </button>
                            <button
                              disabled={veh.status === 'Em Rota'}
                              onClick={() => {
                                if (confirm(`Excluir o veículo ${veh.id}?`)) onRemoveVehicle(veh.id);
                              }}
                              className="p-1 rounded hover:bg-surface-bright text-on-surface-variant hover:text-error disabled:opacity-30 transition-colors"
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
                    <td colSpan={isMaster ? 6 : 5} className="text-center py-10 text-on-surface-variant">
                      Nenhum veículo encontrado correspondente à pesquisa.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        <div className="bg-surface-container rounded-xl border border-outline-variant p-5">
          <div className="overflow-x-auto rounded-lg border border-outline-variant/60">
            <table className="w-full text-left text-xs font-sans">
              <thead className="bg-[#131b2e] border-b border-outline-variant text-[11px] font-bold text-on-surface-variant">
                <tr>
                  <th className="px-5 py-3">Colaborador</th>
                  <th className="px-5 py-3">Score Global</th>
                  <th className="px-5 py-3 text-center">Status</th>
                  <th className="px-5 py-3">Melhor Rota</th>
                  <th className="px-5 py-3">Taxa de Sucesso</th>
                  {isMaster && <th className="px-5 py-3 text-right">Ações</th>}
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
                      ? 'text-on-surface bg-surface-container-highest border-outline-variant/30'
                      : 'text-error bg-error-container/10 border-error/20';

                  return (
                    <tr key={driv.id} className="hover:bg-surface border-b border-outline-variant/30 transition-colors">
                      <td className="px-5 py-3.5">
                        <div className="flex items-center gap-3">
                          <img
                            src={driv.avatar}
                            alt=""
                            className="w-8 h-8 rounded-full border border-outline-variant object-cover"
                            referrerPolicy="no-referrer"
                          />
                          <div>
                            <p className="font-bold text-on-surface leading-tight">{driv.name}</p>
                            <p className="text-[10px] font-mono text-on-surface-variant mt-0.5 uppercase tracking-wide">
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
                              ? 'bg-surface-container-highest text-on-surface-variant'
                              : 'bg-error/20 text-error'
                          }`}
                        >
                          {driv.status}
                        </span>
                      </td>
                      <td className="px-5 py-3.5 text-on-surface font-semibold font-sans">{driv.bestRoute}</td>
                      <td className="px-5 py-3.5 text-on-surface-variant font-mono">{driv.successRate}%</td>
                      {isMaster && (
                        <td className="px-5 py-3.5 text-right font-semibold">
                          <div className="flex justify-end gap-1">
                            <button
                              onClick={() => handleEditDriver(driv)}
                              className="p-1 rounded hover:bg-surface-bright text-on-surface-variant hover:text-primary transition-colors"
                              title="Editar"
                            >
                              <span className="material-symbols-outlined text-[16px]">edit</span>
                            </button>
                            <button
                              onClick={() => {
                                if (confirm(`Excluir o registro de ${driv.name}?`)) onRemoveDriver(driv.id);
                              }}
                              className="p-1 rounded hover:bg-surface-bright text-on-surface-variant hover:text-error transition-colors"
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
                    <td colSpan={isMaster ? 6 : 5} className="text-center py-10 text-on-surface-variant">
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
