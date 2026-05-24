import { useState } from 'react';
import { ViewType, Vehicle, DriverScore, Ctrc, Expense, Ticket, CriticClient, AppUser, DeliveryOccurrence, CurvaAClient } from './types';
import {
  initialVehicles,
  initialDrivers,
  initialAvailableCtrcs,
  initialLinkedCtrcs,
  initialExpenses,
  initialTickets,
  initialCriticalClients,
  initialDeliveryOccurrences,
  initialCurvaAClients,
} from './data';
import {
  syncVehicleToSupabase,
  removeVehicleFromSupabase,
  syncDriverToSupabase,
  removeDriverFromSupabase,
  syncOccurrenceToSupabase,
  removeOccurrenceFromSupabase,
  syncCurvaAClientToSupabase,
  removeCurvaAClientFromSupabase
} from './supabase';

// Import Views
import Sidebar from './components/Sidebar';
import Header from './components/Header';
import DashboardView from './components/DashboardView';
import ImportacaoView from './components/ImportacaoView';
import FrotaView from './components/FrotaView';
import DesempenhoView from './components/DesempenhoView';
import ClientesView from './components/ClientesView';
import RoteirizacaoView from './components/RoteirizacaoView';
import FinalizacaoView from './components/FinalizacaoView';
import SolucaoView from './components/SolucaoView';
import ConfiguracoesView from './components/ConfiguracoesView';
import LoginView from './components/LoginView';
import OcorrenciasView from './components/OcorrenciasView';
import CurvaAView from './components/CurvaAView';

export default function App() {
  const [currentView, setCurrentView] = useState<ViewType>('login');
  const [sidebarOpen, setSidebarOpen] = useState(false);
  
  // Operator profile state
  const [adminProfile, setAdminProfile] = useState<AppUser>({
    username: 'master',
    name: 'Anderson M. (Master)',
    role: 'Superintendente de Logística',
    is_master: true
  });

  // Global Operational Databases State
  const [vehicles, setVehicles] = useState<Vehicle[]>(initialVehicles);
  const [drivers, setDrivers] = useState<DriverScore[]>(initialDrivers);
  const [availableCtrcs, setAvailableCtrcs] = useState<Ctrc[]>(initialAvailableCtrcs);
  const [linkedCtrcs, setLinkedCtrcs] = useState<Ctrc[]>(initialLinkedCtrcs);
  const [savedRomaneios, setSavedRomaneios] = useState<any[]>(() => {
    const saved = localStorage.getItem('saved_romaneios');
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (e) {
        return [];
      }
    }
    // Static initial romaneio representing a realistic preloaded historical routing check
    return [
      {
        id: '2981',
        date: '24/05/2026',
        vehicleId: 'RUE3B11',
        vehiclePlate: 'RUE3B11',
        driverName: 'HIAN THAYRON SOARES DE OLIVEIRA',
        helperName: 'VALDECI CARDOSO',
        ctrcs: [
          {
            id: 'SPO684122-2',
            destinatario: 'A.P. AUTO PECAS E ACESSORIOS LTD',
            cidade: 'ALFENAS',
            cidade_ent: 'ALFENAS, SP',
            weight: 350,
            volume: 4,
            type: 'NORMAL',
            status: 'Pendente',
            remetente: 'RODOBENS DISTRIBUIDORA',
            setor: 'SUL-1'
          },
          {
            id: 'BHS040163-3',
            destinatario: 'VARGINHA COMERCIAL LTDA',
            cidade: 'VARGINHA',
            cidade_ent: 'VARGINHA, MG',
            weight: 710,
            volume: 12,
            type: 'NORMAL',
            status: 'Pendente',
            remetente: 'SAMS CLUB SPO',
            setor: 'SUL-2'
          }
        ],
        observations: 'Roteirizado sob encomenda prioritária. Checar cubagem traseira.'
      }
    ];
  });
  const [expenses, setExpenses] = useState<Expense[]>(initialExpenses);
  const [tickets, setTickets] = useState<Ticket[]>(initialTickets);
  const [clients, setClients] = useState<CriticClient[]>(initialCriticalClients);
  const [occurrences, setOccurrences] = useState<DeliveryOccurrence[]>(initialDeliveryOccurrences);
  const [curvaAClients, setCurvaAClients] = useState<CurvaAClient[]>(initialCurvaAClients);

  // Syncing state spinner
  const [isSyncing, setIsSyncing] = useState<boolean>(false);

  // Active Romaneio Vehicle Tracker
  const [activeRomaneioVehicleId, setActiveRomaneioVehicleId] = useState<string | null>('RTA3G45');

  // Search filter
  const [searchValue, setSearchValue] = useState<string>('');

  // ---------------------------------------------------------
  // LOGIN FLOW HANDLER
  // ---------------------------------------------------------
  const handleLoginSuccess = (user: AppUser) => {
    setAdminProfile(user);
    setCurrentView('dashboard');
  };

  const handleLogout = () => {
    setCurrentView('login');
    setSearchValue('');
  };

  // ---------------------------------------------------------
  // OPERATIONAL STATE CHANGERS (FROTA)
  // ---------------------------------------------------------
  const handleAddVehicle = async (v: Vehicle) => {
    setVehicles((prev) => [...prev, v]);
    setIsSyncing(true);
    await syncVehicleToSupabase(v);
    setIsSyncing(false);
  };

  const handleUpdateVehicle = async (v: Vehicle) => {
    setVehicles((prev) => prev.map((item) => (item.id === v.id ? v : item)));
    setIsSyncing(true);
    await syncVehicleToSupabase(v);
    setIsSyncing(false);
  };

  const handleRemoveVehicle = async (id: string) => {
    setVehicles((prev) => prev.filter((item) => item.id !== id));
    setIsSyncing(true);
    await removeVehicleFromSupabase(id);
    setIsSyncing(false);
  };

  const handleAddDriver = async (d: DriverScore) => {
    setDrivers((prev) => [...prev, d]);
    setIsSyncing(true);
    await syncDriverToSupabase(d);
    setIsSyncing(false);
  };

  const handleUpdateDriver = async (d: DriverScore) => {
    setDrivers((prev) => prev.map((item) => (item.id === d.id ? d : item)));
    setIsSyncing(true);
    await syncDriverToSupabase(d);
    setIsSyncing(false);
  };

  const handleRemoveDriver = async (id: string) => {
    setDrivers((prev) => prev.filter((item) => item.id !== id));
    setIsSyncing(true);
    await removeDriverFromSupabase(id);
    setIsSyncing(false);
  };

  // ---------------------------------------------------------
  // OPERATIONAL STATE CHANGERS (OCORRENCIAS & CURVA A)
  // ---------------------------------------------------------
  const handleAddOccurrence = async (o: DeliveryOccurrence) => {
    setOccurrences((prev) => [...prev, o]);
    setIsSyncing(true);
    await syncOccurrenceToSupabase(o);
    setIsSyncing(false);
  };

  const handleUpdateOccurrence = async (o: DeliveryOccurrence) => {
    setOccurrences((prev) => prev.map((item) => (item.codigo === o.codigo ? o : item)));
    setIsSyncing(true);
    await syncOccurrenceToSupabase(o);
    setIsSyncing(false);
  };

  const handleRemoveOccurrence = async (codigo: string) => {
    setOccurrences((prev) => prev.filter((item) => item.codigo !== codigo));
    setIsSyncing(true);
    await removeOccurrenceFromSupabase(codigo);
    setIsSyncing(false);
  };

  const handleBulkImportOccurrences = async (list: DeliveryOccurrence[]) => {
    setOccurrences((prev) => {
      const filteredPrev = prev.filter(p => !list.some(l => l.codigo === p.codigo));
      return [...filteredPrev, ...list];
    });
    setIsSyncing(true);
    for (const o of list) {
      await syncOccurrenceToSupabase(o);
    }
    setIsSyncing(false);
  };

  const handleAddCurvaA = async (c: CurvaAClient) => {
    setCurvaAClients((prev) => [...prev, c]);
    setIsSyncing(true);
    await syncCurvaAClientToSupabase(c);
    setIsSyncing(false);
  };

  const handleUpdateCurvaA = async (c: CurvaAClient) => {
    setCurvaAClients((prev) => prev.map((item) => (item.cnpj_remetente === c.cnpj_remetente ? c : item)));
    setIsSyncing(true);
    await syncCurvaAClientToSupabase(c);
    setIsSyncing(false);
  };

  const handleRemoveCurvaA = async (cnpj: string) => {
    setCurvaAClients((prev) => prev.filter((item) => item.cnpj_remetente !== cnpj));
    setIsSyncing(true);
    await removeCurvaAClientFromSupabase(cnpj);
    setIsSyncing(false);
  };

  const handleBulkImportCurvaA = async (list: CurvaAClient[]) => {
    setCurvaAClients((prev) => {
      const filteredPrev = prev.filter(p => !list.some(l => l.cnpj_remetente === p.cnpj_remetente));
      return [...filteredPrev, ...list];
    });
    setIsSyncing(true);
    for (const c of list) {
      await syncCurvaAClientToSupabase(c);
    }
    setIsSyncing(false);
  };

  // ---------------------------------------------------------
  // IMPORTAÇÃO DE CTRC
  // ---------------------------------------------------------
  const handleAddCtrcs = (newCtrcs: Ctrc[]) => {
    setAvailableCtrcs((prev) => [...prev, ...newCtrcs]);
  };

  // ---------------------------------------------------------
  // ROTEIRIZAÇÃO FLOW HANDLER
  // ---------------------------------------------------------
  const handleAssignCtre = (ctrcId: string, vehicleId: string) => {
    // Flag vehicle status to active "Em Rota" when cargo starts mapping
    setVehicles((prev) =>
      prev.map((v) => (v.id === vehicleId ? { ...v, status: 'Em Rota' } : v))
    );
  };

  const handleConsolidateRomaneio = (vehicleId: string, assignedCtrcs: Ctrc[]) => {
    // Purge from pending/available list
    const assignedIds = assignedCtrcs.map((c) => c.id);
    setAvailableCtrcs((prev) => prev.filter((c) => !assignedIds.includes(c.id)));

    // Set the designated vehicle ID for the active session
    setActiveRomaneioVehicleId(vehicleId);

    // Append to Romaneio's linked CTRCs checklist
    setLinkedCtrcs((prev) => [
      ...prev,
      ...assignedCtrcs.map((c) => ({ ...c, status: 'Pendente' as const })),
    ]);

    // Go to finalization page!
    setCurrentView('finalizacao');
  };

  // ---------------------------------------------------------
  // FINALIZAÇÃO DE ROMANEIO & FINANCEIRO
  // ---------------------------------------------------------
  const handleUpdateCtrcStatus = (id: string, status: 'Pendente' | 'Entregue' | 'Recusado') => {
    setLinkedCtrcs((prev) =>
      prev.map((item) => (item.id === id ? { ...item, status } : item))
    );
  };

  const handleAddExpense = (exp: Expense) => {
    setExpenses((prev) => [...prev, exp]);
  };

  const handleRemoveExpense = (id: string) => {
    setExpenses((prev) => prev.filter((item) => item.id !== id));
  };

  const handleCloseRomaneio = () => {
    // Purge linked list representing the manifest closing session
    setLinkedCtrcs([]);
    // Restore primary vehicles to "Disponível"
    setVehicles((prev) =>
      prev.map((v) => (v.status === 'Em Rota' ? { ...v, status: 'Disponível' } : v))
    );
    // Reset vehicle tracker
    setActiveRomaneioVehicleId(null);
  };

  const handleSaveRomaneio = (newRom: any) => {
    setSavedRomaneios((prev) => {
      const updated = [newRom, ...prev];
      localStorage.setItem('saved_romaneios', JSON.stringify(updated));
      return updated;
    });
  };

  const handleDeleteRomaneio = (id: string) => {
    setSavedRomaneios((prev) => {
      const updated = prev.filter((r) => r.id !== id);
      localStorage.setItem('saved_romaneios', JSON.stringify(updated));
      return updated;
    });
  };

  // ---------------------------------------------------------
  // SOLUTIONS TICKETS DE DESERVIÇO
  // ---------------------------------------------------------
  const handleResolveTicket = (
    id: string,
    resolution: 'Re-agendado' | 'Devolvido' | 'Troca Motorista'
  ) => {
    setTickets((prev) =>
      prev.map((t) => (t.id === id ? { ...t, status: resolution } : t))
    );
  };

  // ---------------------------------------------------------
  // CLIENTES CRÍTICOS AUDITING NOTES APPENDER
  // ---------------------------------------------------------
  const handleAddAuditNote = (clientId: string, note: string, author: string) => {
    setClients((prev) =>
      prev.map((c) => {
        if (c.id === clientId) {
          return {
            ...c,
            auditUser: author,
            auditTime: 'Há poucos segundos',
            auditDetail: note,
          };
        }
        return c;
      })
    );
  };

  // ---------------------------------------------------------
  // SYSTEM RESETS (GOVERNANÇA)
  // ---------------------------------------------------------
  const handleResetOP01 = () => {
    setVehicles(initialVehicles);
    setDrivers(initialDrivers);
  };

  const handleResetOP02 = () => {
    setAvailableCtrcs(initialAvailableCtrcs);
    setTickets(initialTickets);
  };

  const handleResetOP03 = () => {
    setClients(initialCriticalClients);
    setOccurrences(initialDeliveryOccurrences);
    setCurvaAClients(initialCurvaAClients);
  };

  // Resolve counts for notifications indicator
  const pendingTicketsCount = tickets.filter((t) => t.status === 'Pendente').length;

  const handleClearNotifications = () => {
    // Simply navigate to problem ticket resolving
    setCurrentView('solucao');
  };

  const handleNavigateFromDash = (view: 'importacao' | 'frota' | 'roteirizacao') => {
    setCurrentView(view);
  };

  // ---------------------------------------------------------
  // CONDITIONAL VIEW DISPATCHER
  // ---------------------------------------------------------
  const renderActiveView = () => {
    switch (currentView) {
      case 'dashboard':
        return (
          <DashboardView
            onNavigateToView={handleNavigateFromDash}
            searchValue={searchValue}
          />
        );
      case 'importacao':
        return <ImportacaoView onAddCtrcs={handleAddCtrcs} />;
      case 'frota':
        return (
          <FrotaView
            vehicles={vehicles}
            onAddVehicle={handleAddVehicle}
            onUpdateVehicle={handleUpdateVehicle}
            onRemoveVehicle={handleRemoveVehicle}
            drivers={drivers}
            onAddDriver={handleAddDriver}
            onUpdateDriver={handleUpdateDriver}
            onRemoveDriver={handleRemoveDriver}
            searchValue={searchValue}
          />
        );
      case 'roteirizacao':
        return (
          <RoteirizacaoView
            availableCtrcs={availableCtrcs}
            vehicles={vehicles}
            onAssignCtre={handleAssignCtre}
            onConsolidateRomaneio={handleConsolidateRomaneio}
            adminUser={adminProfile}
          />
        );
      case 'finalizacao':
        return (
          <FinalizacaoView
            linkedCtrcs={linkedCtrcs}
            onUpdateCtrcStatus={handleUpdateCtrcStatus}
            expenses={expenses}
            onAddExpense={handleAddExpense}
            onRemoveExpense={handleRemoveExpense}
            onCloseRomaneio={handleCloseRomaneio}
            activeVehicle={vehicles.find((v) => v.id === activeRomaneioVehicleId)}
            savedRomaneios={savedRomaneios}
            onSaveRomaneio={handleSaveRomaneio}
            onDeleteRomaneio={handleDeleteRomaneio}
          />
        );
      case 'desempenho':
        return <DesempenhoView drivers={drivers} searchValue={searchValue} />;
      case 'solucao':
        return (
          <SolucaoView
            tickets={tickets}
            onResolveTicket={handleResolveTicket}
            searchValue={searchValue}
          />
        );
      case 'clientes':
        return (
          <ClientesView
            clients={clients}
            onAddAuditNote={handleAddAuditNote}
            searchValue={searchValue}
          />
        );
      case 'ocorrencias':
        return (
          <OcorrenciasView
            occurrences={occurrences}
            onAddOccurrence={handleAddOccurrence}
            onUpdateOccurrence={handleUpdateOccurrence}
            onRemoveOccurrence={handleRemoveOccurrence}
            onBulkImportOccurrences={handleBulkImportOccurrences}
            isSyncing={isSyncing}
          />
        );
      case 'curva_a':
        return (
          <CurvaAView
            clients={curvaAClients}
            onAddClient={handleAddCurvaA}
            onUpdateClient={handleUpdateCurvaA}
            onRemoveClient={handleRemoveCurvaA}
            onBulkImportClients={handleBulkImportCurvaA}
            isSyncing={isSyncing}
          />
        );
      case 'configuracoes':
        return (
          <ConfiguracoesView
            onResetOP01={handleResetOP01}
            onResetOP02={handleResetOP02}
            onResetOP03={handleResetOP03}
            adminUser={adminProfile}
            onUpdateAdminUser={(user) => setAdminProfile(user)}
            vehicles={vehicles}
            drivers={drivers}
            availableCtrcs={availableCtrcs}
            tickets={tickets}
            clients={clients}
            occurrences={occurrences}
            curvaAClients={curvaAClients}
            onSyncFromSupabase={(data) => {
              if (data.vehicles) setVehicles(data.vehicles);
              if (data.drivers) setDrivers(data.drivers);
              if (data.ctrcs) setAvailableCtrcs(data.ctrcs);
              if (data.tickets) setTickets(data.tickets);
              if (data.clients) setClients(data.clients);
              if (data.occurrences) setOccurrences(data.occurrences);
              if (data.curvaAClients) setCurvaAClients(data.curvaAClients);
            }}
          />
        );
      default:
        return (
          <DashboardView
            onNavigateToView={handleNavigateFromDash}
            searchValue={searchValue}
          />
        );
    }
  };

  if (currentView === 'login') {
    return <LoginView onLoginSuccess={handleLoginSuccess} />;
  }

  return (
    <div className="min-h-screen bg-background text-[#dae2fd] font-sans antialiased pt-16 md:pl-[72px] transition-all duration-300">
      {/* Collapsible overlay sidebar */}
      <Sidebar
        currentView={currentView}
        onViewChange={setCurrentView}
        adminName={adminProfile.name}
        adminRole={adminProfile.role}
        onLogout={handleLogout}
        isOpen={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
      />

      {/* Global page top-header */}
      <Header
        currentView={currentView}
        searchValue={searchValue}
        onSearchChange={setSearchValue}
        notificationCount={pendingTicketsCount}
        onClearNotifications={handleClearNotifications}
        onToggleSidebar={() => setSidebarOpen((prev) => !prev)}
      />

      {/* Main Content viewport container */}
      <main className="p-4 sm:p-6 md:p-8 max-w-7xl mx-auto min-h-[calc(100vh-4rem)]">
        {renderActiveView()}
      </main>
    </div>
  );
}
