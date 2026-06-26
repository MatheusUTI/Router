import React, { useState, useEffect } from 'react';
import { systemLogService, SystemLog, LogLevel } from '../../services/systemLogService';
import { getSupabaseClient, checkSupabaseHealth } from '../../infrastructure/supabase/client';

export const SystemLogsPanel: React.FC = () => {
  const [logs, setLogs] = useState<SystemLog[]>([]);
  const [filterLevel, setFilterLevel] = useState<LogLevel | 'TODOS'>('TODOS');
  const [isTestingSupabase, setIsTestingSupabase] = useState(false);

  useEffect(() => {
    const unsubscribe = systemLogService.subscribe((newLogs) => {
      setLogs(newLogs);
    });
    return unsubscribe;
  }, []);

  const filteredLogs = logs.filter((log) => filterLevel === 'TODOS' || log.level === filterLevel);

  const handleClearLogs = () => {
    systemLogService.clearLogs();
  };

  const handleCopyLogs = () => {
    const text = systemLogService.exportLogsAsText();
    navigator.clipboard.writeText(text).then(() => {
      alert('Logs copiados para a área de transferência!');
    });
  };

  const handleExportTxt = () => {
    const text = systemLogService.exportLogsAsText();
    const blob = new Blob([text], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `system_logs_${new Date().toISOString().replace(/:/g, '-')}.txt`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleTestSupabase = async () => {
    setIsTestingSupabase(true);
    systemLogService.logInfo('Testes Manuais', 'Iniciando Teste Supabase...');
    
    try {
      const client = getSupabaseClient();
      if (!client) {
        systemLogService.logError('Testes Manuais', 'Falha: Cliente Supabase não inicializado.');
        setIsTestingSupabase(false);
        return;
      }

      systemLogService.logInfo('Testes Manuais', 'URL e Key presentes. Testando conexões com as tabelas...');

      // Test app_users
      const { error: errUsers } = await client.from('app_users').select('id').limit(1);
      if (errUsers) {
        systemLogService.logError('Testes Manuais', 'Erro ao consultar app_users', errUsers);
      } else {
        systemLogService.logSuccess('Testes Manuais', 'Sucesso ao consultar app_users');
      }

      // Test vehicles
      const { error: errVehicles } = await client.from('vehicles').select('id').limit(1);
      if (errVehicles) {
        systemLogService.logError('Testes Manuais', 'Erro ao consultar vehicles', errVehicles);
      } else {
        systemLogService.logSuccess('Testes Manuais', 'Sucesso ao consultar vehicles');
      }

      // Test routing_plans
      const { error: errPlans } = await client.from('routing_plans').select('id').limit(1);
      if (errPlans) {
        systemLogService.logError('Testes Manuais', 'Erro ao consultar routing_plans', errPlans);
      } else {
        systemLogService.logSuccess('Testes Manuais', 'Sucesso ao consultar routing_plans');
      }

      // Test routing_plan_items
      const { error: errItems } = await client.from('routing_plan_items').select('id').limit(1);
      if (errItems) {
        systemLogService.logError('Testes Manuais', 'Erro ao consultar routing_plan_items', errItems);
      } else {
        systemLogService.logSuccess('Testes Manuais', 'Sucesso ao consultar routing_plan_items');
      }

    } catch (err: any) {
      systemLogService.logError('Testes Manuais', 'Exceção não tratada durante o Teste Supabase', err);
    } finally {
      setIsTestingSupabase(false);
    }
  };

  const handleTestIndexedDB = () => {
    systemLogService.logInfo('Testes Manuais', 'Iniciando teste IndexedDB...');
    try {
      if (!window.indexedDB) {
        systemLogService.logError('Testes Manuais', 'IndexedDB não suportado pelo navegador.');
        return;
      }
      systemLogService.logSuccess('Testes Manuais', 'IndexedDB está disponível e funcional.');
    } catch (err) {
      systemLogService.logError('Testes Manuais', 'Erro ao acessar IndexedDB.', err);
    }
  };

  const handleTestEnvVars = () => {
    systemLogService.logInfo('Testes Manuais', 'Verificando Variáveis de Ambiente...');
    
    const envVars = {
      VITE_SUPABASE_URL: (import.meta as any).env?.VITE_SUPABASE_URL,
      VITE_SUPABASE_ANON_KEY: (import.meta as any).env?.VITE_SUPABASE_ANON_KEY,
      VITE_SUPABASE_PUBLISHABLE_KEY: (import.meta as any).env?.VITE_SUPABASE_PUBLISHABLE_KEY,
      NEXT_PUBLIC_SUPABASE_URL: (import.meta as any).env?.NEXT_PUBLIC_SUPABASE_URL,
      NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: (import.meta as any).env?.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
    };

    const details: any = {};
    for (const [key, value] of Object.entries(envVars)) {
      if (value) {
        if (value.length > 12) {
          details[key] = `${value.substring(0, 8)}...${value.substring(value.length - 4)}`;
        } else {
          details[key] = '***HIDDEN***';
        }
      } else {
        details[key] = 'AUSENTE';
      }
    }
    
    details.origem_ativa = localStorage.getItem('router_supabase_url') ? 'localStorage' : (envVars.VITE_SUPABASE_URL ? 'env' : 'none');

    systemLogService.logSuccess('Testes Manuais', 'Resultado do teste de Variáveis de Ambiente', details);
  };

  const getLogColor = (level: LogLevel) => {
    switch (level) {
      case 'ERROR': return 'text-red-600 bg-red-100';
      case 'WARN': return 'text-yellow-600 bg-yellow-100';
      case 'SUCCESS': return 'text-green-600 bg-green-100';
      case 'INFO': return 'text-blue-600 bg-blue-100';
      case 'DEBUG': return 'text-gray-600 bg-gray-100';
      default: return 'text-gray-600 bg-gray-100';
    }
  };

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 mt-6">
      <div className="flex flex-wrap gap-4 items-center justify-between mb-4">
        <h3 className="text-lg font-bold text-gray-800">Logs do Sistema / Diagnóstico</h3>
        
        <div className="flex flex-wrap gap-2">
          <button
            onClick={handleTestSupabase}
            disabled={isTestingSupabase}
            className="bg-indigo-600 hover:bg-indigo-700 text-white px-3 py-1.5 rounded text-sm font-medium disabled:opacity-50"
          >
            {isTestingSupabase ? 'Testando...' : 'Teste Supabase'}
          </button>
          <button
            onClick={handleTestIndexedDB}
            className="bg-blue-600 hover:bg-blue-700 text-white px-3 py-1.5 rounded text-sm font-medium"
          >
            Teste IndexedDB
          </button>
          <button
            onClick={handleTestEnvVars}
            className="bg-teal-600 hover:bg-teal-700 text-white px-3 py-1.5 rounded text-sm font-medium"
          >
            Teste Variáveis de Ambiente
          </button>
        </div>
      </div>

      <div className="flex items-center gap-2 mb-4 border-b pb-4">
        <span className="text-sm font-semibold text-gray-700">Filtro:</span>
        {(['TODOS', 'ERROR', 'WARN', 'INFO', 'SUCCESS', 'DEBUG'] as const).map((level) => (
          <button
            key={level}
            onClick={() => setFilterLevel(level)}
            className={`px-2 py-1 rounded text-xs font-semibold ${
              filterLevel === level
                ? 'bg-gray-800 text-white'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            {level}
          </button>
        ))}

        <div className="flex-1" />

        <button onClick={handleClearLogs} className="text-xs text-red-600 hover:text-red-800 font-medium px-2 py-1">
          Limpar logs
        </button>
        <button onClick={handleCopyLogs} className="text-xs text-indigo-600 hover:text-indigo-800 font-medium px-2 py-1">
          Copiar logs
        </button>
        <button onClick={handleExportTxt} className="text-xs text-indigo-600 hover:text-indigo-800 font-medium px-2 py-1">
          Exportar TXT
        </button>
      </div>

      <div className="bg-gray-50 border border-gray-200 rounded p-2 h-96 overflow-y-auto font-mono text-xs">
        {filteredLogs.length === 0 ? (
          <div className="text-gray-400 text-center mt-10 italic">Nenhum log para exibir.</div>
        ) : (
          filteredLogs.map((log) => (
            <div key={log.id} className="mb-3 border-b border-gray-200 pb-2 last:border-0">
              <div className="flex items-start gap-2 mb-1">
                <span className="text-gray-500 whitespace-nowrap">
                  {new Date(log.timestamp).toLocaleTimeString()}
                </span>
                <span className={`px-1.5 py-0.5 rounded font-bold ${getLogColor(log.level)}`}>
                  {log.level}
                </span>
                <span className="font-semibold text-gray-700">[{log.source}]</span>
                <span className="text-gray-900 break-words flex-1">{log.message}</span>
              </div>
              {log.details && (
                <div className="ml-24 bg-gray-100 p-2 rounded text-gray-600 overflow-x-auto whitespace-pre-wrap">
                  {typeof log.details === 'object'
                    ? JSON.stringify(log.details, null, 2)
                    : String(log.details)}
                </div>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  );
};
