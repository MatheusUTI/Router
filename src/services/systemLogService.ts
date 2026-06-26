export type LogLevel = 'INFO' | 'WARN' | 'ERROR' | 'SUCCESS' | 'DEBUG';

export interface SystemLog {
  id: string;
  timestamp: string;
  level: LogLevel;
  source: string;
  message: string;
  details?: any;
}

type Subscriber = (logs: SystemLog[]) => void;

const MAX_LOGS = 300;
const STORAGE_KEY = 'router_system_logs';

class SystemLogService {
  private logs: SystemLog[] = [];
  private subscribers: Set<Subscriber> = new Set();

  constructor() {
    this.loadFromStorage();
  }

  private loadFromStorage() {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        this.logs = JSON.parse(stored);
      }
    } catch (err) {
      console.warn('Failed to load system logs from localStorage', err);
    }
  }

  private saveToStorage() {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(this.logs));
    } catch (err) {
      console.warn('Failed to save system logs to localStorage', err);
    }
  }

  private notifySubscribers() {
    this.subscribers.forEach((sub) => sub([...this.logs]));
  }

  public subscribe(callback: Subscriber) {
    this.subscribers.add(callback);
    callback([...this.logs]);
    return () => this.subscribers.delete(callback);
  }

  public maskSensitiveData(data: any): any {
    if (!data) return data;
    
    if (typeof data === 'string') {
      // Regex to mask Supabase anon/publishable keys (typically starts with eyJ and has 3 parts or sb_)
      let masked = data.replace(/(eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9\.[A-Za-z0-9-_]+\.[A-Za-z0-9-_]+)/g, '***JWT_TOKEN***');
      masked = masked.replace(/(sb_publishable_[A-Za-z0-9-_]+)/g, '***SUPABASE_PUBLISHABLE_KEY***');
      masked = masked.replace(/(sb_secret_[A-Za-z0-9-_]+)/g, '***SUPABASE_SECRET_KEY***');
      masked = masked.replace(/(apikey=[A-Za-z0-9-_]+)/gi, 'apikey=***HIDDEN***');
      return masked;
    }

    if (typeof data === 'object') {
      const copy = Array.isArray(data) ? [...data] : { ...data };
      for (const key in copy) {
        if (typeof copy[key] === 'string' && (key.toLowerCase().includes('key') || key.toLowerCase().includes('token') || key.toLowerCase().includes('password'))) {
          const val = copy[key];
          if (val && val.length > 12) {
            copy[key] = `${val.substring(0, 8)}...${val.substring(val.length - 4)}`;
          } else {
            copy[key] = '***HIDDEN***';
          }
        } else if (typeof copy[key] === 'object') {
          copy[key] = this.maskSensitiveData(copy[key]);
        } else if (typeof copy[key] === 'string') {
          copy[key] = this.maskSensitiveData(copy[key]);
        }
      }
      return copy;
    }
    
    return data;
  }

  public addLog(level: LogLevel, source: string, message: string, details?: any) {
    const log: SystemLog = {
      id: crypto.randomUUID ? crypto.randomUUID() : Math.random().toString(36).substring(2, 15),
      timestamp: new Date().toISOString(),
      level,
      source,
      message,
      details: this.maskSensitiveData(details),
    };

    this.logs.unshift(log);
    
    if (this.logs.length > MAX_LOGS) {
      this.logs = this.logs.slice(0, MAX_LOGS);
    }

    this.saveToStorage();
    this.notifySubscribers();

    // Also output to console, appropriately
    const consoleMsg = `[${level}] [${source}] ${message}`;
    if (level === 'ERROR') {
      console.error(consoleMsg, log.details || '');
    } else if (level === 'WARN') {
      console.warn(consoleMsg, log.details || '');
    } else {
      console.log(consoleMsg, log.details || '');
    }
  }

  public logInfo(source: string, message: string, details?: any) {
    this.addLog('INFO', source, message, details);
  }

  public logWarn(source: string, message: string, details?: any) {
    this.addLog('WARN', source, message, details);
  }

  public logError(source: string, message: string, details?: any) {
    this.addLog('ERROR', source, message, details);
  }

  public logSuccess(source: string, message: string, details?: any) {
    this.addLog('SUCCESS', source, message, details);
  }

  public logDebug(source: string, message: string, details?: any) {
    this.addLog('DEBUG', source, message, details);
  }

  public getLogs(): SystemLog[] {
    return [...this.logs];
  }

  public clearLogs() {
    this.logs = [];
    this.saveToStorage();
    this.notifySubscribers();
  }

  public exportLogsAsText(): string {
    return this.logs
      .map((l) => {
        const detailsStr = l.details ? `\nDetails: ${JSON.stringify(l.details, null, 2)}` : '';
        return `[${l.timestamp}] [${l.level}] [${l.source}] ${l.message}${detailsStr}`;
      })
      .join('\n\n');
  }
}

export const systemLogService = new SystemLogService();
