import { useState } from 'react';
import { ViewType, Vehicle, DriverScore, Ctrc, Expense, Ticket, CriticClient, AppUser } from './types';
import {
  initialVehicles,
  initialDrivers,
  initialAvailableCtrcs,
  initialLinkedCtrcs,
  initialExpenses,
  initialTickets,
  initialCriticalClients,
} from './data';

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
  const [expenses, setExpenses] = useState<Expense[]>(initialExpenses);
  const [tickets, setTickets] = useState<Ticket[]>(initialTickets);
  const [clients, setClients] = useState<CriticClient[]>(initialCriticalClients);

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
  const handleAddVehicle = (v: Vehicle) => {
    setVehicles((prev) => [...prev, v]);
  };

  const handleUpdateVehicle = (v: Vehicle) => {
    setVehicles((prev) => prev.map((item) => (item.id === v.id ? v : item)));
  };

  const handleRemoveVehicle = (id: string) => {
    setVehicles((prev) => prev.filter((item) => item.id !== id));
  };

  const handleAddDriver = (d: DriverScore) => {
    setDrivers((prev) => [...prev, d]);
  };

  const handleUpdateDriver = (d: DriverScore) => {
    setDrivers((prev) => prev.map((item) => (item.id === d.id ? d : item)));
  };

  const handleRemoveDriver = (id: string) => {
    setDrivers((prev) => prev.filter((item) => item.id !== id));
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
            onSyncFromSupabase={(data) => {
              if (data.vehicles) setVehicles(data.vehicles);
              if (data.drivers) setDrivers(data.drivers);
              if (data.ctrcs) setAvailableCtrcs(data.ctrcs);
              if (data.tickets) setTickets(data.tickets);
              if (data.clients) setClients(data.clients);
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
