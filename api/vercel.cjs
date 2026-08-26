var __create = Object.create;
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __getProtoOf = Object.getPrototypeOf;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
  }
  return to;
};
var __toESM = (mod, isNodeMode, target) => (target = mod != null ? __create(__getProtoOf(mod)) : {}, __copyProps(
  // If the importer is in node compatibility mode or this is not an ESM
  // file that has been converted to a CommonJS file using a Babel-
  // compatible transform (i.e. "__esModule" has not been set), then set
  // "default" to the CommonJS "module.exports" for node compatibility.
  isNodeMode || !mod || !mod.__esModule ? __defProp(target, "default", { value: mod, enumerable: true }) : target,
  mod
));
var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);

// api/index.ts
var index_exports = {};
__export(index_exports, {
  default: () => index_default
});
module.exports = __toCommonJS(index_exports);

// server/createApp.ts
var import_express = __toESM(require("express"));
var import_supabase_js = require("@supabase/supabase-js");

// server/ssw/registry/storagePort.ts
var InMemoryRegistryStorage = class {
  constructor(initialEntries) {
    this.store = /* @__PURE__ */ new Map();
    if (initialEntries) {
      for (const entry of initialEntries) {
        this.store.set(entry.capabilityId, { ...entry });
      }
    }
  }
  async load() {
    const copy = /* @__PURE__ */ new Map();
    for (const [id, entry] of this.store.entries()) {
      copy.set(id, { ...entry });
    }
    return copy;
  }
  async get(capabilityId) {
    const found = this.store.get(capabilityId);
    return found ? { ...found } : null;
  }
  async save(entry) {
    this.store.set(entry.capabilityId, { ...entry });
  }
  async saveAll(entries) {
    for (const entry of entries) {
      this.store.set(entry.capabilityId, { ...entry });
    }
  }
  async delete(capabilityId) {
    return this.store.delete(capabilityId);
  }
};

// server/ssw/registry/capabilityRegistry.ts
function validateConfidenceScore(score) {
  if (typeof score !== "number" || isNaN(score)) {
    throw new Error(`Score de confian\xE7a inv\xE1lido: valor num\xE9rico obrigat\xF3rio, recebido ${score}`);
  }
  if (score < 0 || score > 1) {
    throw new Error(`Score de confian\xE7a fora do intervalo permitido [0.00, 1.00]: ${score}`);
  }
  return Math.round(score * 100) / 100;
}
var SswCapabilityRegistry = class {
  constructor(storage = new InMemoryRegistryStorage(), nowProvider = () => (/* @__PURE__ */ new Date()).toISOString()) {
    this.storage = storage;
    this.nowProvider = nowProvider;
  }
  /**
   * Registra ou sobrescreve uma entrada no catálogo de capacidades.
   */
  async register(entry) {
    const validatedConfidence = validateConfidenceScore(entry.confidence);
    await this.storage.save({
      ...entry,
      confidence: validatedConfidence
    });
  }
  /**
   * Recupera a definição de uma capacidade por seu identificador lógico.
   */
  async get(capabilityId) {
    return this.storage.get(capabilityId);
  }
  /**
   * Lista todas as capacidades cadastradas no Registry.
   */
  async list() {
    const map = await this.storage.load();
    return Array.from(map.values());
  }
  /**
   * Alias para list() para compatibilidade.
   */
  async getAll() {
    return this.list();
  }
  /**
   * Atualiza o endpoint associado a uma capacidade, opcionalmente ajustando o confidence score.
   */
  async updateEndpoint(capabilityId, endpoint, confidence) {
    const entry = await this.get(capabilityId);
    if (!entry) {
      throw new Error(`Capacidade n\xE3o encontrada no Registry: ${capabilityId}`);
    }
    const updatedConfidence = confidence !== void 0 ? validateConfidenceScore(confidence) : entry.confidence;
    const updated = {
      ...entry,
      currentEndpoint: endpoint,
      confidence: updatedConfidence,
      discoveryDate: this.nowProvider()
    };
    await this.storage.save(updated);
    return updated;
  }
  /**
   * Atualiza isoladamente o score de confiança de uma capacidade.
   */
  async updateConfidence(capabilityId, confidence) {
    const entry = await this.get(capabilityId);
    if (!entry) {
      throw new Error(`Capacidade n\xE3o encontrada no Registry: ${capabilityId}`);
    }
    const validatedConfidence = validateConfidenceScore(confidence);
    const updated = {
      ...entry,
      confidence: validatedConfidence
    };
    await this.storage.save(updated);
    return updated;
  }
  /**
   * Registra uma execução bem-sucedida da capacidade, resetando a contagem de falhas.
   */
  async recordSuccess(capabilityId) {
    const entry = await this.get(capabilityId);
    if (!entry) return;
    const updated = {
      ...entry,
      failureCount: 0,
      lastSuccess: this.nowProvider(),
      status: entry.status === "DEGRADED" /* DEGRADED */ ? "ACTIVE" /* ACTIVE */ : entry.status
    };
    await this.storage.save(updated);
  }
  /**
   * Registra uma falha de execução, incrementando o contador e atualizando timestamp.
   */
  async recordFailure(capabilityId) {
    const entry = await this.get(capabilityId);
    if (!entry) return;
    const newFailureCount = (entry.failureCount || 0) + 1;
    const updated = {
      ...entry,
      failureCount: newFailureCount,
      lastFailure: this.nowProvider(),
      status: newFailureCount >= 3 ? "DEGRADED" /* DEGRADED */ : entry.status
    };
    await this.storage.save(updated);
  }
  /**
   * Altera explicitamente o status operacional de uma capacidade.
   */
  async setStatus(capabilityId, status) {
    const entry = await this.get(capabilityId);
    if (!entry) {
      throw new Error(`Capacidade n\xE3o encontrada no Registry: ${capabilityId}`);
    }
    const updated = {
      ...entry,
      status
    };
    await this.storage.save(updated);
  }
};

// server/ssw/resilience/circuitBreaker.ts
var DEFAULT_CIRCUIT_BREAKER_CONFIG = {
  failureThreshold: 3,
  successThreshold: 2,
  // 5 min, 15 min, 30 min, 60 min
  backoffStepsMs: [
    5 * 60 * 1e3,
    15 * 60 * 1e3,
    30 * 60 * 1e3,
    60 * 60 * 1e3
  ],
  now: () => Date.now()
};
var SswCircuitBreaker = class {
  constructor(config) {
    this.circuits = /* @__PURE__ */ new Map();
    this.config = {
      ...DEFAULT_CIRCUIT_BREAKER_CONFIG,
      ...config
    };
  }
  getOrCreateCircuit(capabilityId) {
    let circuit = this.circuits.get(capabilityId);
    if (!circuit) {
      circuit = {
        state: "CLOSED" /* CLOSED */,
        failureCount: 0,
        consecutiveSuccesses: 0,
        backoffLevel: 0,
        blockedUntil: 0
      };
      this.circuits.set(capabilityId, circuit);
    }
    return circuit;
  }
  /**
   * Obtém o estado atual do circuito para a capability, recalculando transições temporais (OPEN -> HALF_OPEN).
   */
  getState(capabilityId) {
    const circuit = this.getOrCreateCircuit(capabilityId);
    const now = this.config.now();
    if (circuit.state === "OPEN" /* OPEN */) {
      if (now >= circuit.blockedUntil) {
        circuit.state = "HALF_OPEN" /* HALF_OPEN */;
        circuit.consecutiveSuccesses = 0;
      }
    }
    return circuit.state;
  }
  /**
   * Avalia se a capability pode ser executada no momento.
   */
  canExecute(capabilityId) {
    const state = this.getState(capabilityId);
    return state === "CLOSED" /* CLOSED */ || state === "HALF_OPEN" /* HALF_OPEN */;
  }
  /**
   * Registra sucesso na execução.
   */
  recordSuccess(capabilityId) {
    const circuit = this.getOrCreateCircuit(capabilityId);
    const currentState = this.getState(capabilityId);
    if (currentState === "HALF_OPEN" /* HALF_OPEN */) {
      circuit.consecutiveSuccesses += 1;
      if (circuit.consecutiveSuccesses >= this.config.successThreshold) {
        circuit.state = "CLOSED" /* CLOSED */;
        circuit.failureCount = 0;
        circuit.backoffLevel = 0;
        circuit.consecutiveSuccesses = 0;
        circuit.blockedUntil = 0;
      }
    } else if (currentState === "CLOSED" /* CLOSED */) {
      circuit.failureCount = 0;
    }
  }
  /**
   * Registra falha na execução.
   */
  recordFailure(capabilityId) {
    const circuit = this.getOrCreateCircuit(capabilityId);
    const currentState = this.getState(capabilityId);
    const now = this.config.now();
    if (currentState === "HALF_OPEN" /* HALF_OPEN */) {
      circuit.state = "OPEN" /* OPEN */;
      circuit.backoffLevel = Math.min(
        circuit.backoffLevel + 1,
        this.config.backoffStepsMs.length - 1
      );
      const delay = this.config.backoffStepsMs[circuit.backoffLevel];
      circuit.blockedUntil = now + delay;
      circuit.consecutiveSuccesses = 0;
    } else if (currentState === "CLOSED" /* CLOSED */) {
      circuit.failureCount += 1;
      if (circuit.failureCount >= this.config.failureThreshold) {
        circuit.state = "OPEN" /* OPEN */;
        const delay = this.config.backoffStepsMs[circuit.backoffLevel];
        circuit.blockedUntil = now + delay;
        circuit.consecutiveSuccesses = 0;
      }
    }
  }
  /**
   * Retorna o tempo restante de bloqueio em milissegundos (0 se não bloqueado).
   */
  getRemainingBlockTimeMs(capabilityId) {
    const circuit = this.getOrCreateCircuit(capabilityId);
    if (this.getState(capabilityId) !== "OPEN" /* OPEN */) {
      return 0;
    }
    const remaining = circuit.blockedUntil - this.config.now();
    return remaining > 0 ? remaining : 0;
  }
  /**
   * Reseta manualmente o circuito de uma capability para CLOSED.
   */
  reset(capabilityId) {
    const circuit = this.getOrCreateCircuit(capabilityId);
    circuit.state = "CLOSED" /* CLOSED */;
    circuit.failureCount = 0;
    circuit.consecutiveSuccesses = 0;
    circuit.backoffLevel = 0;
    circuit.blockedUntil = 0;
  }
};

// server/ssw/resilience/retryPolicy.ts
var DEFAULT_RETRY_CONFIG = {
  maxAttempts: 3,
  baseDelayMs: 1e3,
  backoffFactor: 2,
  maxDelayMs: 3e4,
  jitter: false,
  isRetryable: () => true,
  sleepFn: (ms) => new Promise((resolve) => setTimeout(resolve, ms))
};
var SswRetryPolicy = class {
  constructor(config) {
    this.config = {
      ...DEFAULT_RETRY_CONFIG,
      ...config
    };
  }
  /**
   * Calcula o atraso em milissegundos para a tentativa informada (attempt baseada em 1).
   */
  calculateDelay(attempt) {
    const rawDelay = this.config.baseDelayMs * Math.pow(this.config.backoffFactor, attempt - 1);
    const cappedDelay = Math.min(rawDelay, this.config.maxDelayMs);
    if (this.config.jitter) {
      const jitterFactor = 0.5 + Math.random() * 0.5;
      return Math.round(cappedDelay * jitterFactor);
    }
    return cappedDelay;
  }
  /**
   * Executa a operação fornecida aplicando as políticas de retry, backoff e avaliação de erros.
   */
  async execute(operation) {
    let lastError;
    for (let attempt = 1; attempt <= this.config.maxAttempts; attempt++) {
      try {
        return await operation(attempt);
      } catch (err) {
        lastError = err;
        const isLastAttempt = attempt >= this.config.maxAttempts;
        const canRetry = this.config.isRetryable(err);
        if (isLastAttempt || !canRetry) {
          throw err;
        }
        const delay = this.calculateDelay(attempt);
        await this.config.sleepFn(delay);
      }
    }
    throw lastError;
  }
};

// server/ssw/resilience/incidentStorePort.ts
var InMemoryIncidentStore = class {
  constructor() {
    this.store = /* @__PURE__ */ new Map();
  }
  async get(id) {
    const found = this.store.get(id);
    return found ? { ...found } : null;
  }
  async list(filter) {
    let items = Array.from(this.store.values());
    if (filter?.status) {
      items = items.filter((i) => i.status === filter.status);
    }
    if (filter?.capability) {
      items = items.filter((i) => i.capability === filter.capability);
    }
    return items.map((i) => ({ ...i }));
  }
  async save(incident) {
    this.store.set(incident.id, { ...incident });
  }
  async findActiveByCapabilityAndError(capability, errorSubstring) {
    const normalizedQuery = errorSubstring.trim().toLowerCase();
    for (const incident of this.store.values()) {
      if (incident.capability === capability && (incident.status === "OPEN" /* OPEN */ || incident.status === "MANUAL_REQUIRED" /* MANUAL_REQUIRED */)) {
        const incidentError = incident.lastError.trim().toLowerCase();
        if (incidentError === normalizedQuery || incidentError.includes(normalizedQuery) || normalizedQuery.includes(incidentError)) {
          return { ...incident };
        }
      }
    }
    return null;
  }
};

// server/ssw/resilience/incidentAggregator.ts
var SswIncidentAggregator = class {
  constructor(store = new InMemoryIncidentStore(), nowProvider = () => (/* @__PURE__ */ new Date()).toISOString()) {
    this.idCounter = 1;
    this.store = store;
    this.nowProvider = nowProvider;
  }
  generateId(capability) {
    const timestamp = Date.now();
    return `INC-${capability}-${timestamp}-${this.idCounter++}`;
  }
  /**
   * Registra uma falha. Se já houver um incidente aberto correspondente à mesma capability
   * e assinatura de erro, agrega a tentativa e atualiza timestamps. Caso contrário, abre um novo incidente.
   */
  async recordIncident(capability, error, context) {
    const now = this.nowProvider();
    const existing = await this.store.findActiveByCapabilityAndError(capability, error);
    if (existing) {
      const updated = {
        ...existing,
        lastSeen: now,
        attempts: existing.attempts + 1,
        lastError: error,
        previousEndpoint: context?.previousEndpoint ?? existing.previousEndpoint,
        autoRecovery: context?.autoRecovery !== void 0 ? context.autoRecovery : existing.autoRecovery
      };
      await this.store.save(updated);
      return updated;
    }
    const newIncident = {
      id: this.generateId(capability),
      capability,
      firstSeen: now,
      lastSeen: now,
      attempts: 1,
      lastError: error,
      autoRecovery: context?.autoRecovery ?? false,
      previousEndpoint: context?.previousEndpoint,
      status: "OPEN" /* OPEN */
    };
    await this.store.save(newIncident);
    return newIncident;
  }
  /**
   * Marca um incidente como resolvido, opcionalmente associando o novo endpoint descoberto/configurado.
   */
  async resolveIncident(incidentId, newEndpoint) {
    const incident = await this.store.get(incidentId);
    if (!incident) return null;
    const resolved = {
      ...incident,
      status: incident.autoRecovery ? "AUTO_RESOLVED" /* AUTO_RESOLVED */ : "RESOLVED" /* RESOLVED */,
      newEndpoint: newEndpoint ?? incident.newEndpoint,
      lastSeen: this.nowProvider()
    };
    await this.store.save(resolved);
    return resolved;
  }
  /**
   * Lista todos os incidentes que ainda demandam atenção operacional ou auto-recuperação.
   */
  async listActiveIncidents() {
    const openItems = await this.store.list({ status: "OPEN" /* OPEN */ });
    const manualItems = await this.store.list({ status: "MANUAL_REQUIRED" /* MANUAL_REQUIRED */ });
    return [...openItems, ...manualItems];
  }
  /**
   * Alias para listActiveIncidents() para compatibilidade.
   */
  async getActiveIncidents() {
    return this.listActiveIncidents();
  }
};

// src/integrations/ssw/types/errors.ts
var SswError = class extends Error {
  constructor(code, message, options) {
    super(message);
    this.name = "SswError";
    this.code = code;
    this.capabilityId = options?.capabilityId;
    this.details = options?.details;
    this.isRetryable = options?.isRetryable ?? (code === "NETWORK_ERROR" /* NETWORK_ERROR */ || code === "QUEUE_UNAVAILABLE" /* QUEUE_UNAVAILABLE */ || code === "SESSION_EXPIRED" /* SESSION_EXPIRED */);
  }
  toDTO() {
    return {
      code: this.code,
      message: this.message,
      capabilityId: this.capabilityId,
      details: this.details,
      timestamp: (/* @__PURE__ */ new Date()).toISOString()
    };
  }
};

// server/ssw/session/sessionManager.ts
var LOGIN_HTML_INDICATORS = [
  /<input[^>]+name=["'](?:f4|senha|password|pwd)["']/i,
  /<form[^>]+action=["'][^"']*(?:ssw0422|ssw0010)[^"']*["']/i,
  /id=["'](?:senha|f4)["']/i,
  /Sess[ãa]o\s+expirada/i,
  /Usu[áa]rio\s+n[ãa]o\s+autenticado/i,
  /Acesso\s+n[ãa]o\s+autorizado/i,
  /Efetue\s+o\s+login/i,
  /Login\s+SSW/i,
  /Usu[áa]rio\s+ou\s+senha\s+inv[áa]lidos/i
];
var SswSessionManager = class {
  constructor(options) {
    this.credentials = null;
    this.state = {
      isAuthenticated: false,
      cookies: []
    };
    this.defaultBaseUrl = "https://sistema.ssw.inf.br";
    this.fetchFn = options?.fetchFn || fetch;
    if (options?.credentials) {
      this.setCredentials(options.credentials);
    } else {
      this.loadCredentialsFromEnv();
    }
  }
  /**
   * Carrega credenciais a partir das variáveis de ambiente do backend.
   * Modelagem explícita: empresa, useri, usuario, senha, unidade.
   */
  loadCredentialsFromEnv() {
    const empresa = process.env.SSW_EMPRESA || process.env.SSW_DOMAIN || "";
    const useri = process.env.SSW_USERI || process.env.SSW_USER_I || "";
    const usuario = process.env.SSW_USUARIO || process.env.SSW_USER || process.env.SSW_USERNAME || "";
    const senha = process.env.SSW_SENHA || process.env.SSW_PASSWORD || process.env.SSW_PASS || "";
    const unidade = process.env.SSW_UNIDADE || process.env.SSW_FILIAL || process.env.SSW_DEFAULT_UNID || "VGA";
    let rawBaseUrl = process.env.SSW_BASE_URL || this.defaultBaseUrl;
    rawBaseUrl = rawBaseUrl.replace(/\/bin\/ssw\d+\/?$/i, "").replace(/\/+$/, "");
    const baseUrl = rawBaseUrl || this.defaultBaseUrl;
    if (usuario && senha) {
      this.setCredentials({
        empresa,
        useri: useri || usuario,
        usuario,
        senha,
        unidade,
        baseUrl
      });
    }
  }
  /**
   * Configura credenciais programaticamente.
   */
  setCredentials(credentials) {
    const empresa = credentials.empresa || credentials.domain || "";
    const usuario = credentials.usuario || credentials.username || "";
    const useri = credentials.useri || usuario;
    const senha = credentials.senha || credentials.password || "";
    const unidade = credentials.unidade || credentials.defaultUnid || "VGA";
    let rawBaseUrl = credentials.baseUrl || this.defaultBaseUrl;
    rawBaseUrl = rawBaseUrl.replace(/\/bin\/ssw\d+\/?$/i, "").replace(/\/+$/, "");
    const baseUrl = rawBaseUrl || this.defaultBaseUrl;
    this.credentials = {
      empresa,
      useri,
      usuario,
      senha,
      unidade,
      baseUrl
    };
    this.state = {
      isAuthenticated: false,
      cookies: []
    };
  }
  /**
   * Retorna se o gerenciador possui credenciais configuradas.
   */
  isConfigured() {
    return Boolean(this.credentials?.usuario && this.credentials?.senha);
  }
  /**
   * Retorna a URL base do SSW.
   */
  getBaseUrl() {
    return this.credentials?.baseUrl || this.defaultBaseUrl;
  }
  /**
   * Retorna a filial/unidade padrão configurada.
   */
  getDefaultUnid() {
    return this.credentials?.unidade || "VGA";
  }
  /**
   * Retorna o identificador do usuário operacional (f3) autenticado no SSW.
   */
  getAuthenticatedUsername() {
    return this.credentials?.usuario || "SSW_USER";
  }
  /**
   * Retorna o identificador useri (f2) no SSW.
   */
  getAuthenticatedUseri() {
    return this.credentials?.useri || this.credentials?.usuario || "";
  }
  /**
   * Retorna a empresa/domínio configurado no SSW.
   */
  getAuthenticatedEmpresa() {
    return this.credentials?.empresa || "";
  }
  /**
   * Retorna a unidade autenticada no SSW.
   */
  getAuthenticatedUnid() {
    return this.credentials?.unidade || "VGA";
  }
  /**
   * Retorna o cabeçalho Cookie formatado para requisições HTTP.
   */
  getCookieHeader() {
    return this.state.cookies.join("; ");
  }
  /**
   * Retorna os cookies iniciais requeridos para o fluxo do SSW.
   */
  getInitialCookies() {
    if (!this.credentials) return [];
    const { empresa, useri } = this.credentials;
    return [
      "remember=1",
      `useri=${useri || ""}`,
      `sigla_emp=${empresa || ""}`,
      "ssw4importa=S",
      "ssw0197_seq_cliente=",
      `ssw_dom=${empresa || ""}`
    ];
  }
  /**
   * Verifica se o corpo da resposta HTML corresponde a uma página de login ou sessão expirada.
   */
  isLoginHtmlResponse(htmlText) {
    if (!htmlText || typeof htmlText !== "string") return false;
    return LOGIN_HTML_INDICATORS.some((pattern) => pattern.test(htmlText));
  }
  /**
   * Atualiza a coleção de cookies com base nos cabeçalhos Set-Cookie da resposta.
   */
  updateCookiesFromHeaders(headers) {
    let setCookieHeaders = [];
    if (typeof headers.getSetCookie === "function") {
      setCookieHeaders = headers.getSetCookie();
    } else {
      const single = headers.get("set-cookie");
      if (single) {
        setCookieHeaders = [single];
      }
    }
    if (setCookieHeaders.length === 0) return;
    const cookieMap = /* @__PURE__ */ new Map();
    this.state.cookies.forEach((c) => {
      const [keyVal] = c.split(";");
      const [k, v] = (keyVal || "").split("=");
      if (k && v !== void 0) cookieMap.set(k.trim(), v.trim());
    });
    setCookieHeaders.forEach((setCookieStr) => {
      const parts = setCookieStr.split(";");
      const [k, v] = (parts[0] || "").split("=");
      if (k && v !== void 0) {
        cookieMap.set(k.trim(), v.trim());
      }
    });
    this.state.cookies = Array.from(cookieMap.entries()).map(([k, v]) => `${k}=${v}`);
  }
  /**
   * Autentica no SSW e estabelece a sessão backend utilizando o protocolo comprovado do SSWTools.
   */
  async authenticate() {
    if (!this.isConfigured() || !this.credentials) {
      throw new SswError(
        "NOT_CONFIGURED" /* NOT_CONFIGURED */,
        "Credenciais do SSW (SSW_USUARIO e SSW_SENHA) n\xE3o configuradas no backend."
      );
    }
    const { empresa, useri, usuario, senha, baseUrl, unidade } = this.credentials;
    const loginUrl = `${baseUrl || this.defaultBaseUrl}/bin/ssw0422`;
    const initialCookies = this.getInitialCookies();
    const cookieMap = /* @__PURE__ */ new Map();
    initialCookies.forEach((c) => {
      const [k, v] = c.split("=");
      if (k) cookieMap.set(k.trim(), (v || "").trim());
    });
    this.state.cookies = Array.from(cookieMap.entries()).map(([k, v]) => `${k}=${v}`);
    const bodyParams = new URLSearchParams();
    bodyParams.append("act", "L");
    bodyParams.append("f1", empresa || "");
    bodyParams.append("f2", useri || usuario);
    bodyParams.append("f3", usuario);
    bodyParams.append("f4", senha);
    bodyParams.append("f6", "TRUE");
    bodyParams.append("backimg", "ssw13.jpg");
    bodyParams.append("dummy", String(Date.now()));
    try {
      const response = await this.fetchFn(loginUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
          "Cookie": this.getCookieHeader(),
          "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) RouterOperational/1.26.0",
          "Referer": `${baseUrl || this.defaultBaseUrl}/bin/ssw0422`,
          "Origin": baseUrl || this.defaultBaseUrl
        },
        body: bodyParams.toString(),
        redirect: "manual"
      });
      this.updateCookiesFromHeaders(response.headers);
      const arrayBuf = await response.arrayBuffer();
      let responseText = "";
      try {
        const decoder = new TextDecoder("iso-8859-1");
        responseText = decoder.decode(arrayBuf);
      } catch {
        responseText = new TextDecoder("utf-8").decode(arrayBuf);
      }
      const setCookiesReceived = typeof response.headers.getSetCookie === "function" ? response.headers.getSetCookie() : [response.headers.get("set-cookie")];
      const cookieNames = setCookiesReceived.filter(Boolean).map((c) => c.split(";")[0].split("=")[0].trim());
      const location = response.headers.get("location");
      console.log(`[SSW-AUTH-DIAG] POST ${loginUrl} -> Status: ${response.status}, Redirect: ${location || "none"}, Set-Cookies: [${cookieNames.join(", ")}], BodyLength: ${responseText.length}`);
      const isSuccessAutoSubmit = responseText.includes("frmlogin") && responseText.includes("menu01");
      if (!isSuccessAutoSubmit && this.isLoginHtmlResponse(responseText)) {
        this.state.isAuthenticated = false;
        console.warn("[SSW-AUTH-DIAG] Resposta classificada como formul\xE1rio de login ou sess\xE3o n\xE3o autorizada.");
        throw new SswError(
          "AUTH_FAILED" /* AUTH_FAILED */,
          "Falha na autentica\xE7\xE3o SSW: Credenciais inv\xE1lidas ou tela de login retornada."
        );
      }
      this.state.isAuthenticated = true;
      this.state.authenticatedUser = usuario;
      this.state.authenticatedUseri = useri;
      this.state.authenticatedEmpresa = empresa;
      this.state.authenticatedUnid = unidade;
      this.state.lastAuthenticatedAt = (/* @__PURE__ */ new Date()).toISOString();
      return true;
    } catch (err) {
      this.state.isAuthenticated = false;
      if (err instanceof SswError) throw err;
      throw new SswError(
        "NETWORK_ERROR" /* NETWORK_ERROR */,
        `Falha de conex\xE3o com o SSW durante login: ${err.message || "Erro de rede"}`,
        { details: err.message }
      );
    }
  }
  /**
   * Garante que existe uma sessão ativa antes de executar qualquer requisição.
   */
  async ensureAuthenticated() {
    if (!this.state.isAuthenticated || this.state.cookies.length === 0) {
      await this.authenticate();
    }
  }
  /**
   * Invalida a sessão atual (ex: após detectar expiração).
   */
  invalidateSession() {
    this.state.isAuthenticated = false;
    this.state.cookies = [];
  }
  /**
   * Retorna um resumo seguro do estado da sessão (sem expor senhas ou cookies).
   */
  getSafeStatus() {
    return {
      isConfigured: this.isConfigured(),
      isAuthenticated: this.state.isAuthenticated,
      authenticatedUser: this.state.authenticatedUser,
      authenticatedEmpresa: this.state.authenticatedEmpresa,
      authenticatedUnid: this.state.authenticatedUnid,
      lastAuthenticatedAt: this.state.lastAuthenticatedAt
    };
  }
};

// server/ssw/gateways/httpClient.ts
var SswHttpClient = class {
  constructor(sessionManager, fetchFn) {
    this.sessionManager = sessionManager;
    this.fetchFn = fetchFn || fetch;
  }
  /**
   * Executa uma requisição HTTP para o SSW com injeção automática de cookies de sessão.
   */
  async request(options) {
    if (!options.skipAuthCheck) {
      await this.sessionManager.ensureAuthenticated();
    }
    const baseUrl = this.sessionManager.getBaseUrl();
    const cleanEndpoint = options.endpoint.startsWith("/") ? options.endpoint : `/${options.endpoint}`;
    const targetUrl = `${baseUrl}${cleanEndpoint}`;
    const headers = {
      "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) RouterOperational/1.25.0",
      "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,text/csv,*/*;q=0.8",
      "Accept-Language": "pt-BR,pt;q=0.9,en-US;q=0.8,en;q=0.7",
      ...options.headers
    };
    const cookieHeader = this.sessionManager.getCookieHeader();
    if (cookieHeader) {
      headers["Cookie"] = cookieHeader;
    }
    let requestBody = void 0;
    const method = options.method || "GET";
    if (method === "POST") {
      if (typeof options.payload === "string") {
        requestBody = options.payload;
        if (!headers["Content-Type"]) {
          headers["Content-Type"] = "application/x-www-form-urlencoded";
        }
      } else if (options.payload && typeof options.payload === "object") {
        const formParams = new URLSearchParams();
        Object.entries(options.payload).forEach(([k, v]) => {
          if (v !== void 0) {
            formParams.append(k, String(v));
          }
        });
        requestBody = formParams.toString();
        headers["Content-Type"] = "application/x-www-form-urlencoded";
      }
    }
    const controller = new AbortController();
    const timeoutMs = options.timeoutMs || 3e4;
    const timer = setTimeout(() => controller.abort(), timeoutMs);
    const startMs = Date.now();
    try {
      const response = await this.fetchFn(targetUrl, {
        method,
        headers,
        body: requestBody,
        signal: controller.signal,
        redirect: "follow"
      });
      const latencyMs = Date.now() - startMs;
      clearTimeout(timer);
      this.sessionManager.updateCookiesFromHeaders(response.headers);
      const arrayBuffer = await response.arrayBuffer();
      const contentType = response.headers.get("content-type") || "";
      let bodyText = "";
      const encoding = options.expectedEncoding || (contentType.toLowerCase().includes("iso-8859") ? "iso-8859-1" : "utf-8");
      try {
        const decoder = new TextDecoder(encoding);
        bodyText = decoder.decode(arrayBuffer);
      } catch {
        const fallbackDecoder = new TextDecoder("utf-8");
        bodyText = fallbackDecoder.decode(arrayBuffer);
      }
      if (this.sessionManager.isLoginHtmlResponse(bodyText)) {
        this.sessionManager.invalidateSession();
        throw new SswError(
          "SESSION_EXPIRED" /* SESSION_EXPIRED */,
          "A sess\xE3o com o SSW expirou durante a opera\xE7\xE3o. Reautentica\xE7\xE3o necess\xE1ria.",
          { isRetryable: true }
        );
      }
      return {
        statusCode: response.status,
        headers: response.headers,
        bodyText,
        bodyBuffer: arrayBuffer,
        latencyMs,
        contentType
      };
    } catch (err) {
      clearTimeout(timer);
      if (err instanceof SswError) throw err;
      if (err.name === "AbortError") {
        throw new SswError(
          "JOB_TIMEOUT" /* JOB_TIMEOUT */,
          `Tempo limite esgotado (${timeoutMs}ms) na comunica\xE7\xE3o com o SSW em ${options.endpoint}.`,
          { isRetryable: true }
        );
      }
      throw new SswError(
        "NETWORK_ERROR" /* NETWORK_ERROR */,
        `Erro de rede na comunica\xE7\xE3o com o SSW (${options.endpoint}): ${err.message || "Falha de conex\xE3o"}`,
        { details: err.message, isRetryable: true }
      );
    }
  }
};

// src/integrations/ssw/types/config.ts
var DEFAULT_SSW_455_CONFIG = Object.freeze({
  tipoPeriodo: "AUTORIZACAO",
  unidadeTipo: "A",
  regionalTipo: "E",
  ufTipo: "R",
  clienteTipo: "T",
  tipoDocumento: "T",
  tipoFrete: "T",
  impostoRepassado: "S",
  liquidacao: "X",
  entrega: "p",
  pagamentoVista: "A",
  tipoCalculo: "T",
  entregaDificil: "A",
  reversaoFrete: "A",
  icmsIss: "T",
  ibsCbs: "A",
  averbado: "A",
  compEntregaEscaneado: "A",
  arquivo: "e",
  dadosComplementares: "B",
  basico: "N"
});
var FUTURE_SSW_CAPABILITIES = {
  "101": {
    code: "101",
    name: "Coletas e Consulta de CTRCs",
    description: "Consulta r\xE1pida de coletas pendentes e dados sum\xE1rios de CTRC por n\xFAmero/s\xE9rie.",
    status: "PLANNED",
    estimatedCycle: "SSW-101-001"
  },
  "063": {
    code: "063",
    name: "Rastreamento de Cargas",
    description: "Tracking completo de mercadorias em tr\xE2nsito e localiza\xE7\xE3o f\xEDsica.",
    status: "PLANNED",
    estimatedCycle: "SSW-063-001"
  },
  "029": {
    code: "029",
    name: "Faturas e Previs\xE3o Financeira",
    description: "Gest\xE3o de faturamento de frete, boletos emitidos e posi\xE7\xF5es a receber.",
    status: "NOT_IMPLEMENTED"
  },
  "030": {
    code: "030",
    name: "Manifestos de Carga",
    description: "Consulta e auditoria estruturada de manifestos emitidos e em tr\xE2nsito.",
    status: "NOT_IMPLEMENTED"
  },
  "023": {
    code: "023",
    name: "Ocorr\xEAncias e Pend\xEAncias",
    description: "Registro e auditoria de ocorr\xEAncias de entrega e recusas operacionais.",
    status: "NOT_IMPLEMENTED"
  },
  "264": {
    code: "264",
    name: "Descarga e Romaneios",
    description: "Controle de confer\xEAncia f\xEDsica na descarga e confer\xEAncia de romaneios.",
    status: "NOT_IMPLEMENTED"
  }
};

// server/ssw/gateways/ssw455RequestGateway.ts
function formatToDdmmyy(dateStr) {
  if (!dateStr) return "";
  const clean = dateStr.trim();
  if (/^\d{4}-\d{2}-\d{2}$/.test(clean)) {
    const [y, m, d] = clean.split("-");
    return `${d}${m}${y.slice(2)}`;
  }
  if (/^\d{2}\/\d{2}\/\d{4}$/.test(clean)) {
    const [d, m, y] = clean.split("/");
    return `${d}${m}${y.slice(2)}`;
  }
  if (/^\d{2}\/\d{2}\/\d{2}$/.test(clean)) {
    const [d, m, y] = clean.split("/");
    return `${d}${m}${y}`;
  }
  if (/^\d{6}$/.test(clean)) {
    return clean;
  }
  if (/^\d{8}$/.test(clean)) {
    return `${clean.slice(0, 4)}${clean.slice(6, 8)}`;
  }
  return clean;
}
function buildPayload455(params, config) {
  const d1 = formatToDdmmyy(params.startDate);
  const d2 = formatToDdmmyy(params.endDate);
  const tipo = (params.dataTipo || config?.tipoPeriodo || "AUTORIZACAO").toUpperCase();
  const c = {
    unidadeTipo: config?.unidadeTipo ?? DEFAULT_SSW_455_CONFIG.unidadeTipo,
    regionalTipo: config?.regionalTipo ?? DEFAULT_SSW_455_CONFIG.regionalTipo,
    ufTipo: config?.ufTipo ?? DEFAULT_SSW_455_CONFIG.ufTipo,
    clienteTipo: config?.clienteTipo ?? DEFAULT_SSW_455_CONFIG.clienteTipo,
    tipoDocumento: config?.tipoDocumento ?? DEFAULT_SSW_455_CONFIG.tipoDocumento,
    tipoFrete: config?.tipoFrete ?? DEFAULT_SSW_455_CONFIG.tipoFrete,
    impostoRepassado: config?.impostoRepassado ?? DEFAULT_SSW_455_CONFIG.impostoRepassado,
    liquidacao: config?.liquidacao ?? DEFAULT_SSW_455_CONFIG.liquidacao,
    entrega: config?.entrega ?? DEFAULT_SSW_455_CONFIG.entrega,
    pagamentoVista: config?.pagamentoVista ?? DEFAULT_SSW_455_CONFIG.pagamentoVista,
    tipoCalculo: config?.tipoCalculo ?? DEFAULT_SSW_455_CONFIG.tipoCalculo,
    entregaDificil: config?.entregaDificil ?? DEFAULT_SSW_455_CONFIG.entregaDificil,
    reversaoFrete: config?.reversaoFrete ?? DEFAULT_SSW_455_CONFIG.reversaoFrete,
    icmsIss: config?.icmsIss ?? DEFAULT_SSW_455_CONFIG.icmsIss,
    ibsCbs: config?.ibsCbs ?? DEFAULT_SSW_455_CONFIG.ibsCbs,
    averbado: config?.averbado ?? DEFAULT_SSW_455_CONFIG.averbado,
    compEntregaEscaneado: config?.compEntregaEscaneado ?? DEFAULT_SSW_455_CONFIG.compEntregaEscaneado,
    arquivo: config?.arquivo ?? DEFAULT_SSW_455_CONFIG.arquivo,
    dadosComplementares: config?.dadosComplementares ?? DEFAULT_SSW_455_CONFIG.dadosComplementares,
    basico: config?.basico ?? DEFAULT_SSW_455_CONFIG.basico
  };
  const payload = {
    act: "E1",
    cod_emp_ctb: "00",
    f2: params.unid.toUpperCase().trim(),
    f3: c.unidadeTipo,
    reg_tipo: c.regionalTipo,
    f4: "",
    f5: c.ufTipo,
    f7: "",
    f8: c.clienteTipo,
    f9: tipo === "EMISSAO" ? d1 : "",
    f10: tipo === "EMISSAO" ? d2 : "",
    f11: tipo === "AUTORIZACAO" ? d1 : "",
    f12: tipo === "AUTORIZACAO" ? d2 : "",
    f13: tipo === "PREVISAO" ? d1 : "",
    f14: tipo === "PREVISAO" ? d2 : "",
    f15: tipo === "ENTREGA" ? d1 : "",
    f16: tipo === "ENTREGA" ? d2 : "",
    f18: c.tipoDocumento,
    f19: c.tipoFrete,
    f20: c.impostoRepassado,
    f21: c.liquidacao,
    f22: c.entrega,
    f23: c.pagamentoVista,
    f25: c.tipoCalculo,
    f26: c.entregaDificil,
    f27: c.reversaoFrete,
    f28: c.icmsIss,
    ibscbs: c.ibsCbs,
    f29: c.averbado,
    f30: c.compEntregaEscaneado,
    f32: "",
    f34: "",
    f35: c.arquivo,
    f37: c.dadosComplementares,
    f38: "",
    f39: "",
    basico: c.basico,
    dummy: String(Date.now())
  };
  return payload;
}
var Ssw455RequestGateway = class {
  constructor(registry, httpClient, configProvider) {
    this.registry = registry;
    this.httpClient = httpClient;
    this.configProvider = configProvider;
  }
  /**
   * Envia requisição de geração do relatório 455 utilizando o protocolo comprovado do SSW.
   */
  async requestReport455(params, defaultUnid = "VGA", empresa = "") {
    const capability = await this.registry.get("REPORT_455_REQUEST" /* REPORT_455_REQUEST */);
    const endpoint = capability?.currentEndpoint || "/bin/ssw0230";
    const method = capability?.httpMethod || "POST";
    const unid = (params.unid || defaultUnid).toUpperCase().trim();
    const currentConfig = this.configProvider ? this.configProvider() : void 0;
    const payload = buildPayload455({
      unid,
      startDate: params.startDate,
      endDate: params.endDate,
      dataTipo: params.dataTipo,
      empresa
    }, currentConfig);
    const response = await this.httpClient.request({
      method,
      endpoint,
      payload,
      timeoutMs: 3e4
    });
    if (response.statusCode >= 400) {
      throw new SswError(
        "REQUEST_REJECTED" /* REQUEST_REJECTED */,
        `SSW rejeitou a solicita\xE7\xE3o do relat\xF3rio 455 com status HTTP ${response.statusCode}.`,
        { capabilityId: "REPORT_455_REQUEST" /* REPORT_455_REQUEST */ }
      );
    }
    const html = response.bodyText;
    const lowerHtml = html.toLowerCase();
    const errorMatch = /(?:Erro|Aten[çc][ãa]o|Inconsist[êe]ncia|Inv[áa]lido):\s*([^<]+)/i.exec(html);
    if (errorMatch && !lowerHtml.includes("solicita") && !lowerHtml.includes("processamento") && !lowerHtml.includes("sucesso")) {
      const errorMsg = errorMatch[1].trim();
      if (errorMsg.length > 3 && errorMsg.length < 150) {
        throw new SswError(
          "REQUEST_REJECTED" /* REQUEST_REJECTED */,
          `SSW retornou mensagem de rejei\xE7\xE3o: ${errorMsg}`,
          { capabilityId: "REPORT_455_REQUEST" /* REPORT_455_REQUEST */, details: errorMsg }
        );
      }
    }
    const isAccepted = lowerHtml.includes("solicita") && lowerHtml.includes("process") || lowerHtml.includes("solicitad") || lowerHtml.includes("enfileirad") || lowerHtml.includes("sucesso") || lowerHtml.includes("ssw1440") || response.statusCode === 200;
    let sequence = void 0;
    const seqMatch = /(?:sequ[êe]ncia|relat[óo]rio\s+n[úu]mero|job\s*#?|id\s*[:=]|seq\s*[:=])\s*[:=]?\s*(\d{3,10})/i.exec(html);
    if (seqMatch) {
      sequence = seqMatch[1];
    } else {
      const linkSeqMatch = /(?:ssw0424|ssw1440)[^"']*?(?:seq|id|rel)=(\d+)/i.exec(html);
      if (linkSeqMatch) {
        sequence = linkSeqMatch[1];
      }
    }
    return {
      sequence,
      rawResponse: html,
      statusCode: response.statusCode,
      isAccepted
    };
  }
};

// server/ssw/gateways/sswReportQueueGateway.ts
function decodeHtmlEntities(str) {
  if (!str) return "";
  return str.replace(/&amp;/g, "&").replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/&nbsp;/g, " ");
}
var SswReportQueueGateway = class {
  constructor(registry, httpClient) {
    this.registry = registry;
    this.httpClient = httpClient;
  }
  /**
   * Converte texto cru de status do SSW para SswReportJobStatus.
   */
  normalizeStatus(statusText, action, sequence) {
    const clean = (statusText || "").toLowerCase().trim();
    const act = (action || "").toUpperCase();
    const seq = (sequence || "").trim();
    const isConcluido = clean.includes("conclu") || clean.includes("pronto") || clean.includes("dispon");
    const hasDow = act.includes("DOW" + seq) || act.startsWith("DOW") && act.includes(seq);
    if (isConcluido && (hasDow || !action)) {
      return "COMPLETED";
    }
    if (clean.includes("aguardando") || clean.includes("na fila") || clean.includes("espera") || clean.includes("pendente")) {
      return "WAITING";
    }
    if (clean.includes("processando") || clean.includes("gerando") || clean.includes("em andamento") || clean.includes("executando")) {
      return "PROCESSING";
    }
    if (clean.includes("erro") || clean.includes("falha") || clean.includes("cancelad") || clean.includes("expirad") || clean.includes("inconsist")) {
      return "FAILED";
    }
    if (isConcluido) {
      return "COMPLETED";
    }
    return "UNKNOWN";
  }
  /**
   * Verifica se o registro está pronto para download conforme a regra comprovada:
   * status contém 'conclu' E action contém 'DOW<SEQ>'.
   */
  isRecordReady(statusRaw, action, sequence) {
    const s = (statusRaw || "").toLowerCase();
    const act = (action || "").toUpperCase();
    const seq = (sequence || "").trim();
    const isConcluido = s.includes("conclu") || s.includes("pronto") || s.includes("dispon") || s.includes("ok");
    const hasDow = act.includes("DOW" + seq) || act.startsWith("DOW") && (act.includes(seq) || !seq);
    return isConcluido && (hasDow || act.startsWith("DOW"));
  }
  /**
   * Extrai registros da Fila 156.
   * Suporta primariamente a estrutura <r><f0>...</f8></r> e fallback para tabelas HTML <tr>/<td>.
   */
  parseQueueHtml(html) {
    if (!html || typeof html !== "string") return [];
    const records = [];
    const recordRegex = /<r\b[^>]*>([\s\S]*?)<\/r>/gi;
    let rMatch;
    while ((rMatch = recordRegex.exec(html)) !== null) {
      const rContent = rMatch[1];
      const fields = {};
      const fieldRegex = /<f(\d+)\b[^>]*>([\s\S]*?)<\/f\1>/gi;
      let fMatch;
      while ((fMatch = fieldRegex.exec(rContent)) !== null) {
        const fieldIndex = fMatch[1];
        const fieldVal = decodeHtmlEntities(fMatch[2].trim());
        fields[`f${fieldIndex}`] = fieldVal;
      }
      const seq = fields["f0"] || "";
      const rep = fields["f1"] || "";
      const dt = fields["f2"] || "";
      const user = fields["f3"] || "";
      const unid = fields["f4"] || "";
      const st = fields["f6"] || fields["f5"] || "";
      const dur = fields["f7"] || "";
      const act = fields["f8"] || "";
      if (seq || rep) {
        const isReady = this.isRecordReady(st, act, seq);
        const status = this.normalizeStatus(st, act, seq);
        records.push({
          sequence: seq,
          reportType: rep,
          dateTime: dt,
          username: user,
          unidade: unid,
          statusRaw: st,
          status,
          duration: dur,
          action: act,
          isReady
        });
      }
    }
    if (records.length === 0) {
      const rowRegex = /<tr\b[^>]*>([\s\S]*?)<\/tr>/gi;
      let rowMatch;
      while ((rowMatch = rowRegex.exec(html)) !== null) {
        const rowContent = rowMatch[1];
        const cellRegex = /<td\b[^>]*>([\s\S]*?)<\/td>/gi;
        const cells = [];
        let cellMatch;
        while ((cellMatch = cellRegex.exec(rowContent)) !== null) {
          const plainText = decodeHtmlEntities(cellMatch[1].replace(/<[^>]+>/g, "").trim());
          cells.push(plainText);
        }
        if (cells.length >= 3) {
          const seq = cells.find((c) => /^\d{3,10}$/.test(c)) || cells[0];
          const rep = cells.find((c) => /\b455\b|relat[óo]rio\s*455/i.test(c)) || (cells.length > 1 ? cells[1] : "455");
          const user = cells.length > 2 ? cells[2] : "";
          const unid = cells.length > 3 ? cells[3] : "";
          const st = cells.find((c) => {
            const l = c.toLowerCase();
            return l.includes("aguardando") || l.includes("processando") || l.includes("conclui") || l.includes("conclu\xEDdo") || l.includes("erro") || l.includes("pronto");
          }) || cells[cells.length - 1] || "";
          const isConcluido = st.toLowerCase().includes("conclu") || st.toLowerCase().includes("pronto");
          const act = isConcluido ? `DOW${seq}` : "";
          if (seq && /^\d+$/.test(seq)) {
            records.push({
              sequence: seq,
              reportType: rep,
              dateTime: "",
              username: user,
              unidade: unid,
              statusRaw: st,
              status: this.normalizeStatus(st, act, seq),
              action: act,
              isReady: isConcluido
            });
          }
        }
      }
    }
    return records;
  }
  /**
   * Filtra relatórios 455 pertencentes estritamente ao usuário e unidade autenticados.
   */
  filterUser455Reports(records, username, unid) {
    const uUpper = (username || "").trim().toUpperCase();
    const unidUpper = (unid || "").trim().toUpperCase();
    return records.filter((rec) => {
      const repUpper = rec.reportType.trim().toUpperCase();
      const is455 = repUpper.startsWith("455") || repUpper.includes("455");
      if (!is455) return false;
      if (uUpper && rec.username) {
        const recUser = rec.username.trim().toUpperCase();
        if (recUser !== uUpper && !recUser.includes(uUpper) && !uUpper.includes(recUser)) {
          return false;
        }
      }
      if (unidUpper && rec.unidade) {
        const recUnid = rec.unidade.trim().toUpperCase();
        if (recUnid !== unidUpper) {
          return false;
        }
      }
      return true;
    });
  }
  /**
   * Retorna a maior sequência numérica encontrada em um conjunto de relatórios.
   */
  getMaxSequence(records) {
    let max = 0;
    records.forEach((r) => {
      const num = parseInt(r.sequence, 10);
      if (!isNaN(num) && num > max) {
        max = num;
      }
    });
    return max;
  }
  /**
   * Consulta a Fila 156 e busca registros com ownership rigoroso.
   */
  async checkQueue(options) {
    const capability = await this.registry.get("REPORT_QUEUE" /* REPORT_QUEUE */);
    const endpoint = capability?.currentEndpoint || "/bin/ssw1440";
    const method = capability?.httpMethod || "POST";
    const payload = {
      act: "",
      dummy: String(Date.now())
    };
    const response = await this.httpClient.request({
      method,
      endpoint,
      payload,
      timeoutMs: 2e4
    });
    if (response.statusCode >= 400) {
      throw new SswError(
        "QUEUE_UNAVAILABLE" /* QUEUE_UNAVAILABLE */,
        `Fila 156 do SSW indispon\xEDvel (HTTP ${response.statusCode}).`,
        { capabilityId: "REPORT_QUEUE" /* REPORT_QUEUE */ }
      );
    }
    const allRecords = this.parseQueueHtml(response.bodyText);
    const maxSeq = this.getMaxSequence(allRecords);
    const all455 = allRecords.filter((r) => {
      const rep = (r.reportType || "").trim().toUpperCase();
      return rep.startsWith("455") || rep.includes("455");
    });
    let discardedByUser = 0;
    let discardedByUnid = 0;
    const uUpper = (options.username || "").trim().toUpperCase();
    const unidUpper = (options.unidade || "").trim().toUpperCase();
    const userRecords = options.username ? all455.filter((rec) => {
      if (uUpper && rec.username) {
        const recUser = rec.username.trim().toUpperCase();
        if (recUser !== uUpper && !recUser.includes(uUpper) && !uUpper.includes(recUser)) {
          discardedByUser++;
          return false;
        }
      }
      if (unidUpper && rec.unidade) {
        const recUnid = rec.unidade.trim().toUpperCase();
        if (recUnid !== unidUpper) {
          discardedByUnid++;
          return false;
        }
      }
      return true;
    }) : allRecords;
    const userMaxSeq = this.getMaxSequence(userRecords);
    let discardedByMinSeq = 0;
    let matchedRecord = void 0;
    if (options.sequence) {
      matchedRecord = userRecords.find((r) => r.sequence === options.sequence) || allRecords.find((r) => r.sequence === options.sequence);
    } else if (options.minSequence !== void 0) {
      const newRecords = userRecords.filter((r) => {
        const num = parseInt(r.sequence, 10);
        const isHigher = !isNaN(num) && num > (options.minSequence || 0);
        if (!isHigher) discardedByMinSeq++;
        return isHigher;
      });
      if (newRecords.length > 0) {
        newRecords.sort((a, b) => (parseInt(b.sequence, 10) || 0) - (parseInt(a.sequence, 10) || 0));
        matchedRecord = newRecords[0];
      }
    } else if (userRecords.length > 0) {
      userRecords.sort((a, b) => (parseInt(b.sequence, 10) || 0) - (parseInt(a.sequence, 10) || 0));
      matchedRecord = userRecords[0];
    }
    const diagnostics = {
      httpStatus: response.statusCode,
      responseLength: response.bodyText.length,
      contentType: response.headers?.["content-type"] || "text/html",
      totalRecordsFound: allRecords.length,
      total455Found: all455.length,
      user455Count: userRecords.length,
      discardedByUser,
      discardedByUnid,
      discardedByMinSeq,
      oldSequence: options.minSequence,
      matchedSequence: matchedRecord?.sequence
    };
    console.log(
      `[SSW-1440-POLL] Status: ${diagnostics.httpStatus} | Length: ${diagnostics.responseLength} | Records: ${diagnostics.totalRecordsFound} | 455Total: ${diagnostics.total455Found} | User455: ${diagnostics.user455Count} | DiscardUser: ${discardedByUser} | DiscardUnid: ${discardedByUnid} | DiscardOldSeq: ${discardedByMinSeq} | oldSeq: ${options.minSequence ?? "none"} | Matched: ${matchedRecord ? `Seq: ${matchedRecord.sequence} (Status: ${matchedRecord.statusRaw})` : "none"}`
    );
    return {
      records: userRecords,
      matchedRecord,
      maxSequence: maxSeq,
      userMaxSequence: userMaxSeq,
      rawHtml: response.bodyText,
      diagnostics
    };
  }
};

// server/ssw/gateways/sswReportDownloadGateway.ts
function extractDownloadMeta455(html) {
  if (!html || typeof html !== "string") return null;
  let webBodyRaw = null;
  const matchDouble = /<input\b[^>]*?\bname="web_body"[^>]*?\bvalue="([^"]*)"/i.exec(html) || /<input\b[^>]*?\bvalue="([^"]*)"[^>]*?\bname="web_body"/i.exec(html);
  const matchSingle = /<input\b[^>]*?\bname='web_body'[^>]*?\bvalue='([^']*)'/i.exec(html) || /<input\b[^>]*?\bvalue='([^']*)'[^>]*?\bname='web_body'/i.exec(html);
  if (matchDouble) {
    webBodyRaw = matchDouble[1];
  } else if (matchSingle) {
    webBodyRaw = matchSingle[1];
  } else {
    const matchFallback = /web_body[^>]*?value=["']?([^"'\s>]+)/i.exec(html);
    if (matchFallback) {
      webBodyRaw = matchFallback[1];
    }
  }
  const targetsToSearch = [];
  if (webBodyRaw) {
    try {
      targetsToSearch.push(decodeURIComponent(webBodyRaw));
    } catch {
    }
    try {
      targetsToSearch.push(unescape(webBodyRaw));
    } catch {
    }
    targetsToSearch.push(webBodyRaw);
  }
  targetsToSearch.push(html);
  for (const text of targetsToSearch) {
    const abrirMatch = /abrir\s*\(\s*([^)]+)\)/i.exec(text);
    if (abrirMatch) {
      const argsRaw = abrirMatch[1];
      const stringMatches = Array.from(argsRaw.matchAll(/['"]([^'"]*)['"]/g)).map((m) => m[1].trim());
      if (stringMatches.length >= 2) {
        const internalName = stringMatches[0];
        const internalPath = stringMatches.find((s, idx) => idx > 0 && s.includes("/")) || stringMatches[stringMatches.length - 1];
        return {
          internalName,
          internalPath
        };
      }
    }
  }
  return null;
}
var SswReportDownloadGateway = class {
  constructor(registry, httpClient) {
    this.registry = registry;
    this.httpClient = httpClient;
  }
  /**
   * Valida se a string de retorno parece com um CSV legítimo e não um HTML de erro/login.
   */
  validateCsvStructure(content) {
    if (!content || content.trim().length === 0) {
      throw new SswError(
        "INVALID_REPORT_CONTENT" /* INVALID_REPORT_CONTENT */,
        "O relat\xF3rio baixado do SSW retornou conte\xFAdo vazio."
      );
    }
    const first500 = content.substring(0, 500).trim();
    if (first500.startsWith("<!DOCTYPE") || first500.startsWith("<html") || first500.startsWith("<head") || first500.startsWith("<body") || first500.includes("<table") || first500.includes("<form")) {
      throw new SswError(
        "INVALID_REPORT_CONTENT" /* INVALID_REPORT_CONTENT */,
        "O SSW retornou uma p\xE1gina HTML em vez do arquivo CSV de relat\xF3rio."
      );
    }
    const hasSemicolon = content.includes(";");
    const hasComma = content.includes(",");
    const hasLineBreak = content.includes("\n");
    if (!hasSemicolon && !hasComma || !hasLineBreak) {
      throw new SswError(
        "INVALID_REPORT_CONTENT" /* INVALID_REPORT_CONTENT */,
        "O conte\xFAdo retornado n\xE3o possui estrutura tabular v\xE1lida de CSV (delimitador ou linhas ausentes)."
      );
    }
  }
  /**
   * Baixa o relatório 455 gerado a partir do número de sequência ou URL de download.
   */
  async downloadReport(options) {
    const sequence = options.sequence?.trim();
    let meta = null;
    if (options.internalName && options.internalPath) {
      meta = {
        internalName: options.internalName,
        internalPath: options.internalPath
      };
    }
    if (!meta && sequence) {
      const queueCapability = await this.registry.get("REPORT_QUEUE" /* REPORT_QUEUE */);
      const queueEndpoint = queueCapability?.currentEndpoint || "/bin/ssw1440";
      const metaResponse = await this.httpClient.request({
        method: "POST",
        endpoint: queueEndpoint,
        payload: {
          act: `DOW${sequence}`,
          dummy: String(Date.now())
        },
        headers: {
          Referer: "https://sistema.ssw.inf.br/bin/ssw1440"
        },
        timeoutMs: 3e4
      });
      if (metaResponse.statusCode === 200) {
        meta = extractDownloadMeta455(metaResponse.bodyText);
      }
    }
    const downloadCapability = await this.registry.get("REPORT_DOWNLOAD" /* REPORT_DOWNLOAD */);
    const downloadBaseEndpoint = downloadCapability?.currentEndpoint || "/bin/ssw0424";
    let finalUrl = "";
    if (options.downloadUrl) {
      finalUrl = options.downloadUrl;
    } else if (meta) {
      const qParams = new URLSearchParams();
      qParams.append("act", meta.internalName);
      qParams.append("filename", meta.internalName);
      qParams.append("path", meta.internalPath);
      qParams.append("down", "1");
      qParams.append("nw", "1");
      finalUrl = `${downloadBaseEndpoint}?${qParams.toString()}`;
    } else if (sequence) {
      finalUrl = `${downloadBaseEndpoint}?seq=${sequence}&rel=455`;
    } else {
      finalUrl = downloadBaseEndpoint;
    }
    const response = await this.httpClient.request({
      method: "GET",
      endpoint: finalUrl,
      headers: {
        "Referer": "https://sistema.ssw.inf.br/bin/ssw1440",
        "Accept-Encoding": "identity"
      },
      timeoutMs: 6e4,
      expectedEncoding: "iso-8859-1"
    });
    if (response.statusCode >= 400) {
      throw new SswError(
        "DOWNLOAD_FAILED" /* DOWNLOAD_FAILED */,
        `Falha ao baixar o relat\xF3rio no SSW (HTTP ${response.statusCode}).`,
        { capabilityId: "REPORT_DOWNLOAD" /* REPORT_DOWNLOAD */ }
      );
    }
    const rawContent = response.bodyText.replace(/^\uFEFF/, "");
    this.validateCsvStructure(rawContent);
    return {
      csvContent: rawContent,
      byteLength: response.bodyBuffer.byteLength,
      statusCode: response.statusCode,
      metadata: meta || void 0
    };
  }
};

// server/ssw/services/jobStorePort.ts
var InMemoryJobStore = class {
  constructor() {
    this.jobs = /* @__PURE__ */ new Map();
  }
  async saveJob(job) {
    this.jobs.set(job.id, { ...job });
  }
  async getJob(id) {
    const item = this.jobs.get(id);
    return item ? { ...item } : null;
  }
  async getJobBySequence(sequence) {
    for (const job of this.jobs.values()) {
      if (job.sequence === sequence) {
        return { ...job };
      }
    }
    return null;
  }
  async getRecentJobs(limit = 20) {
    const list = Array.from(this.jobs.values());
    list.sort((a, b) => new Date(b.requestedAt).getTime() - new Date(a.requestedAt).getTime());
    return list.slice(0, limit);
  }
  async updateJobStatus(id, status, error) {
    const existing = this.jobs.get(id);
    if (existing) {
      existing.status = status;
      existing.lastCheckedAt = (/* @__PURE__ */ new Date()).toISOString();
      if (error !== void 0) {
        existing.error = error;
      }
      if (status === "COMPLETED") {
        existing.downloadAvailable = true;
      }
      this.jobs.set(id, existing);
    }
  }
};

// server/ssw/services/ssw455Service.ts
var Ssw455Service = class {
  constructor(options) {
    this.registry = options.registry;
    this.circuitBreaker = options.circuitBreaker;
    this.retryPolicy = options.retryPolicy;
    this.incidentAggregator = options.incidentAggregator;
    this.sessionManager = options.sessionManager;
    this.requestGateway = options.requestGateway;
    this.queueGateway = options.queueGateway;
    this.downloadGateway = options.downloadGateway;
    this.jobStore = options.jobStore || new InMemoryJobStore();
    this.sleepFn = options.sleepFn || ((ms) => new Promise((res) => setTimeout(res, ms)));
  }
  /**
   * Valida coerência de datas do período de solicitação.
   */
  validatePeriod(params) {
    const today = (/* @__PURE__ */ new Date()).toISOString().split("T")[0];
    const startDate = params.startDate || today;
    const endDate = params.endDate || today;
    if (/^\d{4}-\d{2}-\d{2}$/.test(startDate) && /^\d{4}-\d{2}-\d{2}$/.test(endDate)) {
      if (new Date(startDate).getTime() > new Date(endDate).getTime()) {
        throw new SswError(
          "REQUEST_REJECTED" /* REQUEST_REJECTED */,
          `Data inicial (${startDate}) n\xE3o pode ser posterior \xE0 data final (${endDate}).`
        );
      }
    }
    return { startDate, endDate };
  }
  /**
   * Solicita a geração do Relatório 455 no SSW.
   */
  async requestReport(params, requestedBy = "operador") {
    const period = this.validatePeriod(params);
    const capId = "REPORT_455_REQUEST" /* REPORT_455_REQUEST */;
    if (!this.circuitBreaker.canExecute(capId)) {
      throw new SswError(
        "CAPABILITY_DEGRADED" /* CAPABILITY_DEGRADED */,
        "Circuito temporariamente aberto para solicita\xE7\xE3o do relat\xF3rio 455 devido a falhas anteriores.",
        { capabilityId: capId }
      );
    }
    const defaultUnid = this.sessionManager.getDefaultUnid();
    const effectiveUnid = params.unid || defaultUnid;
    const empresa = this.sessionManager.getAuthenticatedEmpresa();
    const sswUser = this.sessionManager.getAuthenticatedUsername();
    let oldSeq = 0;
    try {
      const preQueue = await this.queueGateway.checkQueue({
        username: sswUser,
        unidade: effectiveUnid
      });
      oldSeq = preQueue.userMaxSequence || this.queueGateway.getMaxSequence(preQueue.records);
    } catch {
      oldSeq = 0;
    }
    try {
      const result = await this.retryPolicy.execute(
        async () => {
          return await this.requestGateway.requestReport455(
            { ...params, startDate: period.startDate, endDate: period.endDate, unid: effectiveUnid },
            defaultUnid,
            empresa
          );
        }
      );
      await this.registry.recordSuccess(capId);
      this.circuitBreaker.recordSuccess(capId);
      await this.incidentAggregator.resolveIncident(capId);
      const jobId = `job_455_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
      const job = {
        id: jobId,
        sequence: result.sequence,
        requestedBy: sswUser || requestedBy,
        requestedAt: (/* @__PURE__ */ new Date()).toISOString(),
        status: "REQUESTED",
        period,
        reportType: "455",
        unid: effectiveUnid,
        lastCheckedAt: (/* @__PURE__ */ new Date()).toISOString(),
        downloadAvailable: false,
        metadata: {
          minSequence: oldSeq,
          empresa,
          operator: requestedBy
        }
      };
      await this.jobStore.saveJob(job);
      return job;
    } catch (err) {
      await this.registry.recordFailure(capId);
      this.circuitBreaker.recordFailure(capId);
      await this.incidentAggregator.recordIncident(
        capId,
        err.message || "Falha na solicita\xE7\xE3o do relat\xF3rio 455"
      );
      throw err;
    }
  }
  /**
   * Consulta o status de um Job na Fila 156 do SSW.
   */
  async checkJobStatus(jobId) {
    const job = await this.jobStore.getJob(jobId);
    if (!job) {
      throw new SswError(
        "JOB_NOT_FOUND" /* JOB_NOT_FOUND */,
        `Job de relat\xF3rio com ID '${jobId}' n\xE3o encontrado.`
      );
    }
    const capId = "REPORT_QUEUE" /* REPORT_QUEUE */;
    if (!this.circuitBreaker.canExecute(capId)) {
      throw new SswError(
        "CAPABILITY_DEGRADED" /* CAPABILITY_DEGRADED */,
        "Circuito da Fila 156 do SSW temporariamente aberto devido a instabilidades.",
        { capabilityId: capId }
      );
    }
    try {
      const minSeq = typeof job.metadata?.minSequence === "number" ? job.metadata.minSequence : void 0;
      const sswUser = this.sessionManager.getAuthenticatedUsername() || job.requestedBy;
      const queueCheck = await this.queueGateway.checkQueue({
        sequence: job.sequence,
        username: sswUser,
        unidade: job.unid,
        minSequence: minSeq
      });
      await this.registry.recordSuccess(capId);
      this.circuitBreaker.recordSuccess(capId);
      await this.incidentAggregator.resolveIncident(capId);
      if (queueCheck.matchedRecord) {
        const item = queueCheck.matchedRecord;
        job.status = item.status;
        if (!job.sequence && item.sequence) {
          job.sequence = item.sequence;
        }
        if (item.isReady || item.status === "COMPLETED") {
          job.status = "COMPLETED";
          job.downloadAvailable = true;
        }
      } else if (job.status === "REQUESTED") {
        job.status = "WAITING";
      }
      job.lastCheckedAt = (/* @__PURE__ */ new Date()).toISOString();
      await this.jobStore.saveJob(job);
      return job;
    } catch (err) {
      await this.registry.recordFailure(capId);
      this.circuitBreaker.recordFailure(capId);
      await this.incidentAggregator.recordIncident(
        capId,
        err.message || "Falha ao consultar fila 156 do SSW"
      );
      throw err;
    }
  }
  /**
   * Executa polling controlado até que o relatório seja concluído ou o timeout seja atingido.
   */
  async pollUntilComplete(job, options) {
    const pollIntervalMs = options?.pollIntervalMs || 5e3;
    const maxWaitTimeMs = options?.maxWaitTimeMs || 3e5;
    const startTime = Date.now();
    let currentJob = { ...job };
    while (Date.now() - startTime < maxWaitTimeMs) {
      if (options?.signal?.aborted) {
        throw new SswError(
          "JOB_TIMEOUT" /* JOB_TIMEOUT */,
          "A opera\xE7\xE3o de acompanhamento do relat\xF3rio foi cancelada pelo usu\xE1rio."
        );
      }
      currentJob = await this.checkJobStatus(currentJob.id);
      if (options?.onProgress) {
        options.onProgress(currentJob);
      }
      if (currentJob.status === "COMPLETED") {
        return currentJob;
      }
      if (currentJob.status === "FAILED") {
        throw new SswError(
          "REQUEST_REJECTED" /* REQUEST_REJECTED */,
          "O relat\xF3rio falhou durante a gera\xE7\xE3o na Fila 156 do SSW.",
          { details: currentJob.error }
        );
      }
      await this.sleepFn(pollIntervalMs);
    }
    throw new SswError(
      "JOB_TIMEOUT" /* JOB_TIMEOUT */,
      `Tempo limite de espera (${maxWaitTimeMs / 1e3}s) esgotado aguardando o relat\xF3rio 455 na fila do SSW.`
    );
  }
  /**
   * Realiza o download do arquivo CSV do relatório concluído.
   */
  async downloadReport(job) {
    const capId = "REPORT_DOWNLOAD" /* REPORT_DOWNLOAD */;
    if (!this.circuitBreaker.canExecute(capId)) {
      throw new SswError(
        "CAPABILITY_DEGRADED" /* CAPABILITY_DEGRADED */,
        "Circuito de download do SSW temporariamente aberto.",
        { capabilityId: capId }
      );
    }
    try {
      const downloadResult = await this.retryPolicy.execute(
        async () => {
          return await this.downloadGateway.downloadReport({
            sequence: job.sequence
          });
        }
      );
      await this.registry.recordSuccess(capId);
      this.circuitBreaker.recordSuccess(capId);
      await this.incidentAggregator.resolveIncident(capId);
      const lines = downloadResult.csvContent.split("\n").filter((l) => l.trim().length > 0);
      const rowCount = Math.max(0, lines.length - 1);
      return {
        csvContent: downloadResult.csvContent,
        rowCount
      };
    } catch (err) {
      await this.registry.recordFailure(capId);
      this.circuitBreaker.recordFailure(capId);
      await this.incidentAggregator.recordIncident(
        capId,
        err.message || "Falha no download do relat\xF3rio 455"
      );
      throw err;
    }
  }
  /**
   * Fluxo consolidado: Solicitação -> Polling de Fila -> Download.
   */
  async acquireReport(params, requestedBy = "operador", options) {
    const nowIso = (/* @__PURE__ */ new Date()).toISOString();
    try {
      if (options?.onProgress) options.onProgress("Solicitando relat\xF3rio 455 no SSW...");
      const initialJob = await this.requestReport(params, requestedBy);
      if (options?.onProgress) options.onProgress("Aguardando processamento na Fila 156 do SSW...");
      const completedJob = await this.pollUntilComplete(initialJob, {
        pollIntervalMs: options?.pollIntervalMs,
        maxWaitTimeMs: options?.maxWaitTimeMs,
        onProgress: (j) => {
          if (options?.onProgress) {
            options.onProgress(`Status SSW: ${j.status}...`);
          }
        }
      });
      if (options?.onProgress) options.onProgress("Baixando arquivo CSV de entregas...");
      const { csvContent, rowCount } = await this.downloadReport(completedJob);
      return {
        success: true,
        job: completedJob,
        csvContent,
        rowCount,
        acquisitionTimestamp: nowIso
      };
    } catch (err) {
      return {
        success: false,
        job: {
          id: `failed_${Date.now()}`,
          requestedBy,
          requestedAt: nowIso,
          status: "FAILED",
          period: { startDate: params.startDate || "", endDate: params.endDate || "" },
          reportType: "455",
          downloadAvailable: false,
          error: err.message
        },
        acquisitionTimestamp: nowIso,
        error: err.message || "Erro durante a aquisi\xE7\xE3o do relat\xF3rio SSW 455",
        errorCode: err instanceof SswError ? err.code : "NETWORK_ERROR" /* NETWORK_ERROR */
      };
    }
  }
  /**
   * Localiza o último relatório 455 na Fila 156 pertencente ao usuário e unidade autenticados.
   * Aplica estritamente as regras de ownership (tipo 455, usuário, unidade) e validação de status.
   */
  async findLatestCompletedReport(unid) {
    const sswUser = this.sessionManager.getAuthenticatedUsername();
    const defaultUnid = this.sessionManager.getDefaultUnid();
    const effectiveUnid = unid || defaultUnid;
    const queueResult = await this.queueGateway.checkQueue({
      username: sswUser,
      unidade: effectiveUnid
    });
    const uUpper = (sswUser || "").trim().toUpperCase();
    const unidUpper = (effectiveUnid || "").trim().toUpperCase();
    const own455Records = queueResult.records.filter((r) => {
      const rep = (r.reportType || "").trim().toUpperCase();
      const is455 = rep.startsWith("455") || rep.includes("455");
      if (!is455) return false;
      if (uUpper && r.username) {
        const rUser = r.username.trim().toUpperCase();
        if (rUser !== uUpper && !rUser.includes(uUpper) && !uUpper.includes(rUser)) {
          return false;
        }
      }
      if (unidUpper && r.unidade) {
        const rUnid = r.unidade.trim().toUpperCase();
        if (rUnid !== unidUpper) {
          return false;
        }
      }
      return true;
    });
    if (own455Records.length === 0) {
      return {
        found: false,
        downloadAvailable: false,
        message: "Nenhum relat\xF3rio 455 encontrado na fila para o seu usu\xE1rio e unidade."
      };
    }
    const sorted = own455Records.sort((a, b) => {
      const numA = parseInt(a.sequence, 10) || 0;
      const numB = parseInt(b.sequence, 10) || 0;
      return numB - numA;
    });
    const latest = sorted[0];
    const isCompleted = latest.status === "COMPLETED" || /conclu/i.test(latest.statusRaw);
    const hasDow = latest.isReady && /DOW\d+/i.test(latest.action);
    return {
      found: true,
      sequence: latest.sequence,
      reportType: latest.reportType,
      dateTime: latest.dateTime,
      username: latest.username,
      unidade: latest.unidade,
      status: latest.status,
      statusRaw: latest.statusRaw,
      downloadAvailable: isCompleted && hasDow,
      action: latest.action
    };
  }
  /**
   * Sincroniza o último relatório 455 concluído da Fila 156 pertencente ao usuário.
   * Não gera um novo relatório no SSW.
   */
  async syncLatestReport(unid, requestedBy = "operador") {
    const nowIso = (/* @__PURE__ */ new Date()).toISOString();
    const effectiveUnid = unid || this.sessionManager.getDefaultUnid();
    const sswUser = this.sessionManager.getAuthenticatedUsername();
    try {
      const latestInfo = await this.findLatestCompletedReport(effectiveUnid);
      if (!latestInfo.found || !latestInfo.sequence) {
        throw new SswError(
          "JOB_NOT_FOUND" /* JOB_NOT_FOUND */,
          'Nenhum relat\xF3rio 455 foi encontrado na fila para o seu usu\xE1rio/unidade. Utilize a op\xE7\xE3o "Gerar novo 455" para solicitar uma emiss\xE3o.'
        );
      }
      if (!latestInfo.downloadAvailable) {
        throw new SswError(
          "QUEUE_UNAVAILABLE" /* QUEUE_UNAVAILABLE */,
          `O \xFAltimo relat\xF3rio 455 encontrado (Seq. ${latestInfo.sequence}) ainda n\xE3o est\xE1 conclu\xEDdo (Status: ${latestInfo.statusRaw || latestInfo.status}). Aguarde a conclus\xE3o ou tente novamente.`
        );
      }
      const job = {
        id: `sync_latest_${latestInfo.sequence}_${Date.now()}`,
        sequence: latestInfo.sequence,
        requestedBy: latestInfo.username || sswUser || requestedBy,
        requestedAt: nowIso,
        status: "COMPLETED",
        period: { startDate: "", endDate: "" },
        reportType: latestInfo.reportType || "455",
        unid: latestInfo.unidade || effectiveUnid,
        lastCheckedAt: nowIso,
        downloadAvailable: true
      };
      await this.jobStore.saveJob(job);
      const { csvContent, rowCount } = await this.downloadReport(job);
      return {
        success: true,
        job,
        csvContent,
        rowCount,
        acquisitionTimestamp: nowIso
      };
    } catch (err) {
      return {
        success: false,
        job: {
          id: `failed_sync_${Date.now()}`,
          requestedBy: sswUser || requestedBy,
          requestedAt: nowIso,
          status: "FAILED",
          period: { startDate: "", endDate: "" },
          reportType: "455",
          downloadAvailable: false,
          error: err.message
        },
        acquisitionTimestamp: nowIso,
        error: err.message || "Erro ao sincronizar o \xFAltimo relat\xF3rio SSW 455",
        errorCode: err instanceof SswError ? err.code : "NETWORK_ERROR" /* NETWORK_ERROR */
      };
    }
  }
  /**
   * Tenta novamente o download de um relatório específico pela sequência já conhecida.
   * Não gera um novo relatório no SSW.
   */
  async retryReport(sequence, requestedBy = "operador", unid) {
    const nowIso = (/* @__PURE__ */ new Date()).toISOString();
    const effectiveUnid = unid || this.sessionManager.getDefaultUnid();
    const sswUser = this.sessionManager.getAuthenticatedUsername();
    if (!sequence || typeof sequence !== "string" || !sequence.trim()) {
      return this.syncLatestReport(effectiveUnid, requestedBy);
    }
    const cleanSeq = sequence.trim();
    try {
      const job = {
        id: `retry_${cleanSeq}_${Date.now()}`,
        sequence: cleanSeq,
        requestedBy: sswUser || requestedBy,
        requestedAt: nowIso,
        status: "COMPLETED",
        period: { startDate: "", endDate: "" },
        reportType: "455",
        unid: effectiveUnid,
        lastCheckedAt: nowIso,
        downloadAvailable: true
      };
      const { csvContent, rowCount } = await this.downloadReport(job);
      await this.jobStore.saveJob(job);
      return {
        success: true,
        job,
        csvContent,
        rowCount,
        acquisitionTimestamp: nowIso
      };
    } catch (err) {
      return {
        success: false,
        job: {
          id: `failed_retry_${cleanSeq}_${Date.now()}`,
          sequence: cleanSeq,
          requestedBy: sswUser || requestedBy,
          requestedAt: nowIso,
          status: "FAILED",
          period: { startDate: "", endDate: "" },
          reportType: "455",
          downloadAvailable: false,
          error: err.message
        },
        acquisitionTimestamp: nowIso,
        error: err.message || `Erro ao tentar novamente o download da sequ\xEAncia ${cleanSeq}`,
        errorCode: err instanceof SswError ? err.code : "NETWORK_ERROR" /* NETWORK_ERROR */
      };
    }
  }
  /**
   * Compila o resumo consolidado de saúde da integração SSW para visualização e telemetria.
   */
  async getHealthSummary() {
    const allCaps = await this.registry.getAll();
    const incidents = await this.incidentAggregator.getActiveIncidents();
    let openCircuits = 0;
    let activeCapabilities = 0;
    const capabilitiesSummary = allCaps.map((c) => {
      const state = this.circuitBreaker.getState(c.capabilityId);
      if (state === "OPEN" /* OPEN */) openCircuits++;
      if (c.status === "ACTIVE" /* ACTIVE */) activeCapabilities++;
      return {
        id: c.capabilityId,
        status: c.status,
        confidence: c.confidence,
        circuitState: state,
        failureCount: c.failureCount,
        lastSuccess: c.lastSuccess,
        lastFailure: c.lastFailure
      };
    });
    let overallStatus = "HEALTHY";
    if (!this.sessionManager.isConfigured()) {
      overallStatus = "OFFLINE";
    } else if (openCircuits > 0) {
      overallStatus = openCircuits >= 2 ? "CRITICAL" : "DEGRADED";
    } else if (incidents.length > 0) {
      overallStatus = "DEGRADED";
    }
    return {
      overallStatus,
      activeCapabilities,
      totalCapabilities: allCaps.length,
      openCircuits,
      activeIncidentsCount: incidents.length,
      capabilities: capabilitiesSummary,
      recentIncidents: incidents,
      timestamp: (/* @__PURE__ */ new Date()).toISOString()
    };
  }
  /**
   * Retorna a porta de armazenamento de jobs.
   */
  getJobStore() {
    return this.jobStore;
  }
};

// server/ssw/gateways/ssw101Parser.ts
function parsePtBrNumber(val) {
  if (val === void 0 || val === null) return 0;
  if (typeof val === "number") return isNaN(val) ? 0 : val;
  const str = String(val).trim();
  if (!str) return 0;
  const clean = str.replace(/[R$\s]/g, "");
  if (/^\d{1,3}(\.\d{3})*,\d+$/.test(clean)) {
    return parseFloat(clean.replace(/\./g, "").replace(",", ".")) || 0;
  }
  if (/^\d+,\d+$/.test(clean)) {
    return parseFloat(clean.replace(",", ".")) || 0;
  }
  const direct = parseFloat(clean);
  return isNaN(direct) ? 0 : direct;
}
function stripHtml(html) {
  if (!html) return "";
  return html.replace(/<[^>]*>/g, " ").replace(/&nbsp;/gi, " ").replace(/&amp;/gi, "&").replace(/&lt;/gi, "<").replace(/&gt;/gi, ">").replace(/&quot;/gi, '"').replace(/&#39;/gi, "'").replace(/\s+/g, " ").trim();
}
var Ssw101Parser = class {
  /**
   * Faz o parse completo do HTML retornado pela consulta 101.
   */
  static parse(html) {
    if (!html || typeof html !== "string" || html.trim() === "") {
      return {
        success: false,
        found: false,
        resultsCount: 0,
        rawMessage: "Resposta vazia retornada pelo SSW."
      };
    }
    const plainText = stripHtml(html);
    if (this.isNotFoundResponse(html, plainText)) {
      return {
        success: true,
        found: false,
        resultsCount: 0,
        rawMessage: this.extractErrorMessage(plainText) || "Nenhum documento encontrado para os par\xE2metros informados."
      };
    }
    if (this.isMultipleResultsTable(html)) {
      const items = this.parseMultipleResultsTable(html);
      if (items.length > 0) {
        return {
          success: true,
          found: true,
          multipleResults: true,
          resultsCount: items.length,
          items,
          rawMessage: `${items.length} documento(s) encontrado(s).`
        };
      }
    }
    const detail = this.parseSingleCtrcDetail(html);
    if (detail && (detail.ctrc || detail.numero || detail.historico.length > 0)) {
      return {
        success: true,
        found: true,
        multipleResults: false,
        resultsCount: 1,
        detail,
        rawMessage: "CTRC localizado com sucesso."
      };
    }
    return {
      success: true,
      found: false,
      resultsCount: 0,
      rawMessage: "N\xE3o foi poss\xEDvel estruturar os dados retornados do SSW 101."
    };
  }
  /**
   * Identifica se a resposta indica que o documento não foi localizado.
   */
  static isNotFoundResponse(html, plainText) {
    const notFoundPatterns = [
      /nenhum\s+documento\s+encontrado/i,
      /ctrc\s+n[ãa]o\s+localizado/i,
      /ctrc\s+inexistente/i,
      /nota\s+fiscal\s+n[ãa]o\s+localizada/i,
      /nenhum\s+registro\s+selecionado/i,
      /documento\s+n[ãa]o\s+encontrado/i,
      /par[âa]metros\s+inv[áa]lidos/i,
      /registro\s+inexistente/i
    ];
    return notFoundPatterns.some((pattern) => pattern.test(plainText) || pattern.test(html));
  }
  /**
   * Extrai a mensagem de erro textual da tela de retorno.
   */
  static extractErrorMessage(plainText) {
    const errorMatch = /(?:erro|aten[çc][ãa]o|aviso)\s*:\s*([^.\n]+)/i.exec(plainText);
    if (errorMatch && errorMatch[1]) {
      return errorMatch[1].trim();
    }
    return null;
  }
  /**
   * Detecta se o HTML contém uma tabela com múltiplos resultados de CTRC.
   */
  static isMultipleResultsTable(html) {
    const lower = html.toLowerCase();
    const hasTable = lower.includes("<table");
    const hasMultipleHeaders = (lower.includes("ctrc") || lower.includes("conhecimento")) && lower.includes("remetente") && lower.includes("destinat");
    const rowMatches = (html.match(/<tr[^>]*>/gi) || []).length;
    return hasTable && hasMultipleHeaders && rowMatches >= 3 && (lower.includes("selecione") || lower.includes("relacao de ctrcs") || lower.includes("rela[\xE7c][\xE3a]o de documentos") || lower.includes("pesquisa de documentos") || lower.includes("t_nro_ctrc") && rowMatches > 5);
  }
  /**
   * Faz o parse da tabela com múltiplos resultados de CTRC.
   */
  static parseMultipleResultsTable(html) {
    const items = [];
    const rows = html.match(/<tr[^>]*>([\s\S]*?)<\/tr>/gi) || [];
    for (const row of rows) {
      const cells = (row.match(/<t[dh][^>]*>([\s\S]*?)<\/t[dh]>/gi) || []).map((cell) => stripHtml(cell));
      if (cells.length < 3) continue;
      const firstCell = cells[0].toUpperCase();
      if (firstCell.includes("CTRC") || firstCell.includes("CONHECIMENTO") || firstCell.includes("S\xC9RIE") || firstCell === "DOC") {
        continue;
      }
      let ctrcStr = "";
      let serie = "";
      let numero = "";
      let dataEmissao = "";
      let remetente = "";
      let destinatario = "";
      let cidadeDestino = "";
      let status = "Em Tr\xE2nsito";
      let valorMercadoria = 0;
      let nf = "";
      for (let i = 0; i < cells.length; i++) {
        const text = cells[i];
        const ctrcMatch = /^([A-Z]{2,5})?\s*[-/]?\s*(\d{1,10})$/i.exec(text);
        if (!ctrcStr && ctrcMatch) {
          serie = (ctrcMatch[1] || "BCA").toUpperCase();
          numero = ctrcMatch[2];
          ctrcStr = `${serie}-${numero.padStart(6, "0")}`;
          continue;
        }
        if (!dataEmissao && /^\d{2}\/\d{2}\/(?:\d{2}|\d{4})/.test(text)) {
          dataEmissao = text;
          continue;
        }
        if (/^\d+$/.test(text) && !nf && text.length >= 3 && text.length <= 9) {
          nf = text;
        }
        if (!remetente && text.length > 3 && !/^\d+$/.test(text) && !/^\d{2}\//.test(text)) {
          remetente = text;
          continue;
        }
        if (remetente && !destinatario && text.length > 3 && !/^\d+$/.test(text) && !/^\d{2}\//.test(text)) {
          destinatario = text;
          continue;
        }
        if (destinatario && !cidadeDestino && text.length >= 2) {
          cidadeDestino = text;
          continue;
        }
        if (text.toLowerCase().includes("entreg") || text.toLowerCase().includes("tr\xE2nsito") || text.toLowerCase().includes("retid")) {
          status = text;
        }
        if (text.includes("R$") || /^\d{1,3}(\.\d{3})*,\d{2}$/.test(text)) {
          valorMercadoria = parsePtBrNumber(text);
        }
      }
      if (ctrcStr || numero) {
        items.push({
          ctrc: ctrcStr || numero,
          serie: serie || "BCA",
          numero: numero || ctrcStr,
          dataEmissao: dataEmissao || "",
          remetente: remetente || "N/I",
          destinatario: destinatario || "N/I",
          cidadeDestino: cidadeDestino || "",
          status: status || "Pendente",
          valorMercadoria,
          nf
        });
      }
    }
    return items;
  }
  /**
   * Faz o parse analítico dos blocos de dados de um CTRC individual no SSW 101.
   */
  static parseSingleCtrcDetail(html) {
    const plain = stripHtml(html);
    let ctrc = "";
    let serie = "";
    let numero = "";
    const ctrcMatch = /(?:ctrc|conhecimento|cte|ct-e)\s*(?:n[º°o]?)?\s*:?\s*([a-z]{2,5})?\s*[-/]?\s*(\d{1,10})/i.exec(plain);
    if (ctrcMatch) {
      serie = (ctrcMatch[1] || "").toUpperCase();
      numero = ctrcMatch[2];
      ctrc = serie ? `${serie}-${numero.padStart(6, "0")}` : numero;
    } else {
      const docMatch = /(?:documento|nro)\s*:?\s*(\d{4,10})/i.exec(plain);
      if (docMatch) {
        numero = docMatch[1];
        ctrc = numero;
      }
    }
    let chaveCte = void 0;
    const chaveMatch = /(?:chave\s+(?:cte|ct-e|acesso)|cte\s*chave)\s*:?\s*(\d{44})/i.exec(plain) || /(\d{4}\s*\d{4}\s*\d{4}\s*\d{4}\s*\d{4}\s*\d{4}\s*\d{4}\s*\d{4}\s*\d{4}\s*\d{4}\s*\d{4})/i.exec(plain);
    if (chaveMatch) {
      chaveCte = chaveMatch[1].replace(/\s+/g, "");
    }
    let dataEmissao = "";
    let dataPrevisao = void 0;
    const dtEmissaoMatch = /(?:emiss[ãa]o|data\s+emiss[ãa]o|emitido\s+em)\s*:?\s*(\d{2}\/\d{2}\/(?:\d{2}|\d{4})(?:\s+\d{2}:\d{2}(?::\d{2})?)?)/i.exec(plain);
    if (dtEmissaoMatch) {
      dataEmissao = dtEmissaoMatch[1].trim();
    } else {
      const anyDateMatch = /(\d{2}\/\d{2}\/\d{4})/i.exec(plain);
      if (anyDateMatch) {
        dataEmissao = anyDateMatch[1];
      }
    }
    const dtPrevMatch = /(?:previs[ãa]o|prev\.?\s*ent\.?|previs[ãa]o\s+entrega)\s*:?\s*(\d{2}\/\d{2}\/(?:\d{2}|\d{4}))/i.exec(plain);
    if (dtPrevMatch) {
      dataPrevisao = dtPrevMatch[1].trim();
    }
    let unidadeEmissora = "";
    let unidadeDestino = "";
    let cidadeDestino = "";
    let ufDestino = "";
    const origMatch = /(?:origem|unid(?:ade)?\s+origem|emissora)\s*:?\s*([A-Z]{3})/i.exec(plain);
    if (origMatch) unidadeEmissora = origMatch[1].toUpperCase();
    const destUnidMatch = /(?:destino|unid(?:ade)?\s+destino|pra[çc]a)\s*:?\s*([A-Z]{3})/i.exec(plain);
    if (destUnidMatch) unidadeDestino = destUnidMatch[1].toUpperCase();
    const cidDestMatch = /(?:cidade\s+destino|munic[íi]pio\s+destino|destino\s+final)\s*:?\s*([A-Za-zÀ-ÖØ-öø-ÿ\s]+)(?:[-/]\s*([A-Z]{2}))?/i.exec(plain);
    if (cidDestMatch) {
      cidadeDestino = cidDestMatch[1].trim();
      if (cidDestMatch[2]) ufDestino = cidDestMatch[2].trim().toUpperCase();
    }
    const remetente = {};
    const remNomeMatch = /(?:remetente|remte|expedidor)\s*:?\s*([^-\n\r]+?)(?=(?:cnpj|cgc|end|destinat|dest|\d{2}\.\d{3}|$))/i.exec(plain);
    if (remNomeMatch) remetente.razaoSocial = remNomeMatch[1].replace(/CNPJ.*/i, "").trim();
    const remCnpjMatch = /(?:remetente|remte|expedidor)[\s\S]*?(?:cnpj|cgc)\s*:?\s*(\d{2}\.\d{3}\.\d{3}\/\d{4}-\d{2}|\d{14})/i.exec(plain) || /(?:cnpj|cgc)\s*(?:remetente)?\s*:?\s*(\d{2}\.\d{3}\.\d{3}\/\d{4}-\d{2})/i.exec(plain);
    if (remCnpjMatch) remetente.cnpj = remCnpjMatch[1].trim();
    const remEndMatch = /(?:end(?:ere[çc]o)?\s*rem(?:etente)?)\s*:?\s*([^\n\r]+)/i.exec(plain);
    if (remEndMatch) remetente.endereco = remEndMatch[1].trim();
    const remCidMatch = /(?:cidade\s*rem(?:etente)?)\s*:?\s*([A-Za-zÀ-ÖØ-öø-ÿ\s]+)(?:[-/]\s*([A-Z]{2}))?/i.exec(plain);
    if (remCidMatch) {
      remetente.cidade = remCidMatch[1].trim();
      if (remCidMatch[2]) remetente.uf = remCidMatch[2].trim().toUpperCase();
    }
    const destinatario = {};
    const destNomeMatch = /(?:destinat[áa]rio|destte|recebedor)\s*:?\s*([^-\n\r]+?)(?=(?:cnpj|cgc|end|fone|tel|\d{2}\.\d{3}|$))/i.exec(plain);
    if (destNomeMatch) destinatario.razaoSocial = destNomeMatch[1].replace(/CNPJ.*/i, "").trim();
    const destCnpjMatch = /(?:destinat[áa]rio|destte)[\s\S]*?(?:cnpj|cgc)\s*:?\s*(\d{2}\.\d{3}\.\d{3}\/\d{4}-\d{2}|\d{14})/i.exec(plain) || /(?:cnpj|cgc)\s*(?:destinat[áa]rio)?\s*:?\s*(\d{2}\.\d{3}\.\d{3}\/\d{4}-\d{2})/i.exec(plain);
    if (destCnpjMatch) destinatario.cnpj = destCnpjMatch[1].trim();
    const destEndMatch = /(?:end(?:ere[çc]o)?\s*dest(?:inat[áa]rio)?)\s*:?\s*([^\n\r]+)/i.exec(plain);
    if (destEndMatch) destinatario.endereco = destEndMatch[1].trim();
    const destBairroMatch = /(?:bairro\s*dest(?:inat[áa]rio)?)\s*:?\s*([^\n\r]+)/i.exec(plain);
    if (destBairroMatch) destinatario.bairro = destBairroMatch[1].trim();
    const destCidMatch = /(?:cidade\s*dest(?:inat[áa]rio)?)\s*:?\s*([A-Za-zÀ-ÖØ-öø-ÿ\s]+)(?:[-/]\s*([A-Z]{2}))?/i.exec(plain);
    if (destCidMatch) {
      destinatario.cidade = destCidMatch[1].trim();
      if (destCidMatch[2]) destinatario.uf = destCidMatch[2].trim().toUpperCase();
    }
    const destCepMatch = /(?:cep\s*dest(?:inat[áa]rio)?|cep)\s*:?\s*(\d{5}-\d{3}|\d{8})/i.exec(plain);
    if (destCepMatch) destinatario.cep = destCepMatch[1].trim();
    const destFoneMatch = /(?:fone|telefone|celular|tel)\s*:?\s*(\(?\d{2}\)?\s*\d{4,5}[-\s]?\d{4})/i.exec(plain);
    if (destFoneMatch) destinatario.fone = destFoneMatch[1].trim();
    let pesoBruto = 0;
    let pesoCubado = void 0;
    let volumes = 1;
    let valorMercadoria = 0;
    let valorFrete = 0;
    let especie = "VOLUMES";
    let m3 = void 0;
    let tipoFrete = "CIF";
    let natureza = "TRANSPORTE DE CARGA";
    let cfop = "";
    const pesoMatch = /(?:peso\s*(?:real|bruto|kg)?)\s*:?\s*([\d.,]+)\s*k?g?/i.exec(plain);
    if (pesoMatch) pesoBruto = parsePtBrNumber(pesoMatch[1]);
    const cubadoMatch = /(?:peso\s*cubado|cubado)\s*:?\s*([\d.,]+)\s*k?g?/i.exec(plain);
    if (cubadoMatch) pesoCubado = parsePtBrNumber(cubadoMatch[1]);
    const volMatch = /(?:volumes?|qtde\s*vol(?:umes?)?|qtd\.?\s*vol)\s*:?\s*(\d+)/i.exec(plain);
    if (volMatch) volumes = parseInt(volMatch[1], 10) || 1;
    const valMercMatch = /(?:valor\s*(?:da\s*)?mercadoria|vlr\s*merc|val\s*merc|total\s*merc)\s*:?\s*(?:R\$\s*)?([\d.,]+)/i.exec(plain);
    if (valMercMatch) valorMercadoria = parsePtBrNumber(valMercMatch[1]);
    const valFreteMatch = /(?:valor\s*(?:do\s*)?frete|vlr\s*frete|total\s*frete|frete\s*total)\s*:?\s*(?:R\$\s*)?([\d.,]+)/i.exec(plain);
    if (valFreteMatch) valorFrete = parsePtBrNumber(valFreteMatch[1]);
    if (/fob/i.test(plain) && !/cif/i.test(plain)) {
      tipoFrete = "FOB";
    }
    const cfopMatch = /(?:cfop)\s*:?\s*(\d{4})/i.exec(plain);
    if (cfopMatch) cfop = cfopMatch[1];
    const natMatch = /(?:natureza|tipo\s*op(?:era[çc][ãa]o)?)\s*:?\s*([A-Za-zÀ-ÖØ-öø-ÿ\s]+)/i.exec(plain);
    if (natMatch) natureza = natMatch[1].trim();
    const notasFiscais = this.extractNotasFiscais(html, plain);
    const historico = this.extractTrackingEvents(html, plain);
    const comprovanteEntrega = this.extractComprovanteEntrega(html, plain);
    let status = "Em Tr\xE2nsito";
    let situacaoAtual = historico.length > 0 ? historico[0].descricao : void 0;
    if (comprovanteEntrega?.dataEntrega || /entregue|entrega\s+realizada/i.test(plain)) {
      status = "Entregue";
    } else if (/sa[íi]da\s+para\s+entrega|em\s+rota/i.test(plain)) {
      status = "Em Rota";
    } else if (/retid[ao]|ocorr[êe]ncia\s+3|pend[êe]ncia/i.test(plain)) {
      status = "Retido";
    } else if (/cancelad[ao]/i.test(plain)) {
      status = "Cancelado";
    }
    return {
      ctrc: ctrc || "CTRC",
      serie: serie || (ctrc.includes("-") ? ctrc.split("-")[0] : "BCA"),
      numero: numero || ctrc,
      chaveCte,
      dataEmissao: dataEmissao || (/* @__PURE__ */ new Date()).toLocaleDateString("pt-BR"),
      dataPrevisao,
      unidadeEmissora,
      unidadeDestino: unidadeDestino || (cidadeDestino ? cidadeDestino.substring(0, 3).toUpperCase() : void 0),
      cidadeDestino,
      ufDestino,
      remetente,
      destinatario,
      pesoBruto: pesoBruto || 1,
      pesoCubado,
      volumes: volumes || 1,
      especie,
      m3,
      valorMercadoria,
      valorFrete,
      tipoFrete,
      natureza,
      cfop,
      status,
      situacaoAtual,
      notasFiscais,
      historico,
      comprovanteEntrega,
      fetchedAt: (/* @__PURE__ */ new Date()).toISOString()
    };
  }
  /**
   * Extrai a tabela de Notas Fiscais associadas ao CTRC.
   */
  static extractNotasFiscais(html, plain) {
    const nfs = [];
    const rows = html.match(/<tr[^>]*>([\s\S]*?)<\/tr>/gi) || [];
    let isNfSection = false;
    for (const row of rows) {
      const rowText = stripHtml(row);
      if (/notas?\s*fiscais?|dados\s*das?\s*nfs?|nfe|nro\s*nf/i.test(rowText)) {
        isNfSection = true;
      }
      if (isNfSection) {
        const cells = (row.match(/<t[dh][^>]*>([\s\S]*?)<\/t[dh]>/gi) || []).map((c) => stripHtml(c));
        if (cells.length >= 2) {
          const nfMatch = /^(\d{1,9})$/.exec(cells[0]) || /(?:nf|nota)\s*:?\s*(\d+)/i.exec(cells[0]);
          if (nfMatch) {
            const numero = nfMatch[1];
            let serie = "1";
            let valor = 0;
            let peso = 0;
            let volumes = 1;
            let chaveNfe = void 0;
            for (let i = 1; i < cells.length; i++) {
              const val = cells[i];
              if (val.length === 44 && /^\d+$/.test(val)) {
                chaveNfe = val;
              } else if (val.includes("R$") || /^\d{1,3}(\.\d{3})*,\d{2}$/.test(val)) {
                valor = parsePtBrNumber(val);
              } else if (/^\d{1,6}(?:,\d+)?$/.test(val) && peso === 0 && !val.includes("/")) {
                peso = parsePtBrNumber(val);
              }
            }
            nfs.push({
              numero,
              serie,
              valor,
              peso,
              volumes,
              chaveNfe
            });
          }
        }
      }
    }
    if (nfs.length === 0) {
      const nfMatches = plain.matchAll(/(?:nf|nota\s*fiscal|nro\s*nf)\s*(?:n[º°o]?)?\s*:?\s*(\d{1,9})/gi);
      for (const m of nfMatches) {
        if (!nfs.some((n) => n.numero === m[1])) {
          nfs.push({
            numero: m[1],
            serie: "1",
            volumes: 1
          });
        }
      }
    }
    return nfs;
  }
  /**
   * Extrai os eventos da timeline de rastreamento / histórico de ocorrências.
   */
  static extractTrackingEvents(html, plain) {
    const events = [];
    const rows = html.match(/<tr[^>]*>([\s\S]*?)<\/tr>/gi) || [];
    for (const row of rows) {
      const cells = (row.match(/<t[dh][^>]*>([\s\S]*?)<\/t[dh]>/gi) || []).map((c) => stripHtml(c));
      if (cells.length < 2) continue;
      let dataHora = "";
      let codigo = "";
      let descricao = "";
      let unidade = "";
      let observacao = "";
      let manifesto = "";
      for (let i = 0; i < cells.length; i++) {
        const text = cells[i];
        const dtMatch = /^(\d{2}\/\d{2}\/(?:\d{2}|\d{4})(?:\s+\d{2}:\d{2}(?::\d{2})?)?)$/.exec(text);
        if (dtMatch && !dataHora) {
          dataHora = dtMatch[1];
          continue;
        }
        const codMatch = /^(\d{1,4})$/.exec(text);
        if (codMatch && !codigo && dataHora) {
          codigo = codMatch[1].padStart(2, "0");
          continue;
        }
        if (/^[A-Z]{3}$/.test(text) && !unidade) {
          unidade = text;
          continue;
        }
        const manMatch = /(?:man(?:ifesto)?\s*:?\s*)?(\d{5,8})/i.exec(text);
        if (manMatch && !manifesto && (text.toLowerCase().includes("man") || text.toLowerCase().includes("viagem"))) {
          manifesto = manMatch[1];
        }
        if (text.length >= 3 && !descricao && !/^\d+$/.test(text) && !/^\d{2}\//.test(text) && !/^[A-Z]{3}$/.test(text)) {
          descricao = text;
          continue;
        }
        if (descricao && text.length > 2 && text !== descricao && !/^\d{2}\//.test(text)) {
          observacao = observacao ? `${observacao} | ${text}` : text;
        }
      }
      if (dataHora && (descricao || codigo)) {
        events.push({
          dataHora,
          codigo: codigo || "00",
          descricao: descricao || "EVENTO REGISTRADO",
          unidade: unidade || "VGA",
          observacao: observacao || void 0,
          manifesto: manifesto || void 0
        });
      }
    }
    if (events.length === 0) {
      const eventMatches = plain.matchAll(/(\d{2}\/\d{2}\/(?:\d{2}|\d{4})(?:\s+\d{2}:\d{2})?)\s*[-:]?\s*(?:(?:OC|OCORR[ÊE]NCIA)\s*(\d{1,4}))?\s*[-:]?\s*([A-Za-zÀ-ÖØ-öø-ÿ\s]+?)(?=(?:\d{2}\/\d{2}\/|$))/gi);
      for (const m of eventMatches) {
        events.push({
          dataHora: m[1].trim(),
          codigo: (m[2] || "00").padStart(2, "0"),
          descricao: m[3].trim(),
          unidade: "VGA"
        });
      }
    }
    return events;
  }
  /**
   * Extrai dados do comprovante de entrega / canhoto.
   */
  static extractComprovanteEntrega(html, plain) {
    let recebedor = void 0;
    let documento = void 0;
    let dataEntrega = void 0;
    let temCanhoto = false;
    let urlCanhoto = void 0;
    const recMatch = /(?:recebedor|recebido\s+por|entregue\s+a)\s*:?\s*([^-\n\r,]+)/i.exec(plain);
    if (recMatch) recebedor = recMatch[1].trim();
    const docMatch = /(?:doc(?:umento)?|rg|cpf)\s*(?:recebedor)?\s*:?\s*([\d.-]+)/i.exec(plain);
    if (docMatch) documento = docMatch[1].trim();
    const dtEntMatch = /(?:data\s+entrega|entregue\s+em)\s*:?\s*(\d{2}\/\d{2}\/(?:\d{2}|\d{4})(?:\s+\d{2}:\d{2})?)/i.exec(plain);
    if (dtEntMatch) dataEntrega = dtEntMatch[1].trim();
    if (html.toLowerCase().includes("canhoto") || html.toLowerCase().includes("comprovante") || html.toLowerCase().includes("ssw0424") || html.toLowerCase().includes(".jpg")) {
      temCanhoto = true;
      const imgMatch = /<img[^>]+src=["']([^"']*(?:canhoto|comprovante|ssw)[^"']*)["']/i.exec(html);
      if (imgMatch) {
        urlCanhoto = imgMatch[1];
      }
    }
    if (recebedor || dataEntrega || temCanhoto) {
      return {
        recebedor,
        documento,
        dataEntrega,
        temCanhoto,
        urlCanhoto
      };
    }
    return void 0;
  }
};

// server/ssw/gateways/ssw101QueryGateway.ts
function parseSswCtrcCode(rawId) {
  const value = String(rawId ?? "").trim().toUpperCase();
  if (!value) return { series: null, number: null };
  const fullMatch = value.match(/^([A-Z]{2,5})[-\s]?(\d+)(?:-\d+)?$/);
  if (fullMatch) {
    return {
      series: fullMatch[1],
      number: fullMatch[2]
    };
  }
  const digitsOnly = value.replace(/\D/g, "");
  return {
    series: null,
    number: digitsOnly || null
  };
}
var Ssw101QueryGateway = class {
  constructor(registry, httpClient) {
    this.registry = registry;
    this.httpClient = httpClient;
  }
  /**
   * Constrói o payload padronizado para a consulta SSW 101.
   */
  buildPayload(query, empresa) {
    const payload = {
      act: "P1",
      dummy: String(Date.now())
    };
    if (empresa) {
      payload.f1 = empresa;
    }
    if (query.dataIni) {
      payload.t_data_ini = formatToDdmmyy(query.dataIni);
    } else {
      const today = /* @__PURE__ */ new Date();
      const start = new Date(today);
      start.setMonth(start.getMonth() - 23);
      start.setDate(1);
      const d = String(start.getDate()).padStart(2, "0");
      const m = String(start.getMonth() + 1).padStart(2, "0");
      const y = String(start.getFullYear()).slice(-2);
      payload.t_data_ini = `${d}${m}${y}`;
    }
    if (query.dataFin) {
      payload.t_data_fin = formatToDdmmyy(query.dataFin);
    } else {
      const today = /* @__PURE__ */ new Date();
      const d = String(today.getDate()).padStart(2, "0");
      const m = String(today.getMonth() + 1).padStart(2, "0");
      const y = String(today.getFullYear()).slice(-2);
      payload.t_data_fin = `${d}${m}${y}`;
    }
    if (query.tipoConsulta === "CTRC") {
      let series = query.serie || "";
      let number = query.numero || "";
      if (!series && number) {
        const parsed = parseSswCtrcCode(number);
        if (parsed.series) series = parsed.series;
        if (parsed.number) number = parsed.number;
      }
      if (!series) {
        series = query.unidade === "SPO" ? "SPO" : "BCA";
      }
      payload.t_ser_ctrc = series.toUpperCase().trim();
      payload.t_nro_ctrc = number.trim();
    } else if (query.tipoConsulta === "NF") {
      payload.t_nro_nf = (query.numeroNf || "").trim();
      if (query.cnpjRemetente) {
        payload.t_cgc_rem = query.cnpjRemetente.replace(/\D/g, "");
      }
      if (query.cnpjDestinatario) {
        payload.t_cgc_des = query.cnpjDestinatario.replace(/\D/g, "");
      }
    } else if (query.tipoConsulta === "CHAVE") {
      const cleanKey = (query.chave || "").replace(/\D/g, "");
      payload.t_chave_cte = cleanKey;
      payload.t_chave_nfe = cleanKey;
      payload.t_chave = cleanKey;
    }
    return payload;
  }
  /**
   * Executa a requisição de consulta no SSW e retorna o DTO processado.
   */
  async executeQuery(query) {
    const capability = await this.registry.get("CTRC_101" /* CTRC_101 */);
    const endpoint = capability?.currentEndpoint || "/bin/ssw0101";
    const payload = this.buildPayload(query);
    try {
      const response = await this.httpClient.request({
        endpoint,
        method: "POST",
        payload,
        expectedEncoding: "iso-8859-1",
        timeoutMs: 25e3
      });
      if (response.statusCode >= 400) {
        throw new SswError(
          "REQUEST_REJECTED" /* REQUEST_REJECTED */,
          `SSW retornou HTTP ${response.statusCode} na consulta 101 (${endpoint}).`,
          { details: response.bodyText, isRetryable: response.statusCode >= 500 }
        );
      }
      const result = Ssw101Parser.parse(response.bodyText);
      result.latencyMs = response.latencyMs;
      result.queryParamUsed = payload;
      return result;
    } catch (err) {
      if (err instanceof SswError) throw err;
      throw new SswError(
        "NETWORK_ERROR" /* NETWORK_ERROR */,
        `Falha na comunica\xE7\xE3o com o SSW 101: ${err.message || "Erro de rede"}`,
        { details: err.message, isRetryable: true }
      );
    }
  }
};

// server/ssw/services/ssw101Service.ts
var Ssw101Service = class {
  constructor(options) {
    this.cache = /* @__PURE__ */ new Map();
    this.cacheHits = 0;
    this.cacheMisses = 0;
    this.registry = options.registry;
    this.circuitBreaker = options.circuitBreaker;
    this.retryPolicy = options.retryPolicy;
    this.incidentAggregator = options.incidentAggregator;
    this.sessionManager = options.sessionManager;
    this.queryGateway = options.queryGateway;
    this.cacheTtlMs = options.cacheTtlMs || 60 * 60 * 1e3;
    this.maxCacheEntries = options.maxCacheEntries || 500;
  }
  /**
   * Gera a chave de cache para a requisição de consulta.
   */
  generateCacheKey(query) {
    if (query.tipoConsulta === "CTRC") {
      const parsed = parseSswCtrcCode(query.numero || "");
      const s = (query.serie || parsed.series || "BCA").toUpperCase();
      const n = (parsed.number || query.numero || "").replace(/^0+/, "");
      return `CTRC:${s}:${n}`;
    }
    if (query.tipoConsulta === "NF") {
      const nf = (query.numeroNf || "").trim();
      const cnpj = (query.cnpjRemetente || "").replace(/\D/g, "");
      return `NF:${nf}:${cnpj}`;
    }
    if (query.tipoConsulta === "CHAVE") {
      const ch = (query.chave || "").replace(/\D/g, "");
      return `CHAVE:${ch}`;
    }
    return `UNKNOWN:${JSON.stringify(query)}`;
  }
  /**
   * Executa a consulta com proteção resiliente e cache.
   */
  async query(request) {
    const cacheKey = this.generateCacheKey(request);
    if (!request.forceFresh) {
      const cached = this.cache.get(cacheKey);
      if (cached && Date.now() < cached.expiresAt) {
        this.cacheHits++;
        return {
          ...cached.result,
          fromCache: true,
          detail: cached.result.detail ? { ...cached.result.detail, fromCache: true } : void 0
        };
      }
    }
    this.cacheMisses++;
    if (!this.circuitBreaker.canExecute("CTRC_101" /* CTRC_101 */)) {
      const remainingMs = this.circuitBreaker.getRemainingBlockTimeMs("CTRC_101" /* CTRC_101 */);
      const stale = this.cache.get(cacheKey);
      if (stale) {
        return {
          ...stale.result,
          fromCache: true,
          rawMessage: `Circuito degradado (bloqueio restante: ${Math.ceil(remainingMs / 1e3)}s). Exibindo dados salvos em cache offline.`
        };
      }
      throw new SswError(
        "CAPABILITY_DEGRADED" /* CAPABILITY_DEGRADED */,
        `Capacidade CTRC_101 temporariamente bloqueada pelo Circuit Breaker (${Math.ceil(remainingMs / 1e3)}s restantes).`,
        { capabilityId: "CTRC_101" /* CTRC_101 */, isRetryable: false }
      );
    }
    try {
      const result = await this.retryPolicy.execute(async () => {
        return await this.queryGateway.executeQuery(request);
      });
      this.circuitBreaker.recordSuccess("CTRC_101" /* CTRC_101 */);
      await this.registry.recordSuccess("CTRC_101" /* CTRC_101 */);
      if (result.found) {
        if (this.cache.size >= this.maxCacheEntries) {
          const oldestKey = this.cache.keys().next().value;
          if (oldestKey) this.cache.delete(oldestKey);
        }
        this.cache.set(cacheKey, {
          result,
          cachedAt: Date.now(),
          expiresAt: Date.now() + this.cacheTtlMs
        });
      }
      return result;
    } catch (err) {
      this.circuitBreaker.recordFailure("CTRC_101" /* CTRC_101 */);
      await this.registry.recordFailure("CTRC_101" /* CTRC_101 */);
      await this.incidentAggregator.recordIncident(
        "CTRC_101" /* CTRC_101 */,
        err.message || "Falha na consulta anal\xEDtica SSW 101"
      );
      const stale = this.cache.get(cacheKey);
      if (stale) {
        return {
          ...stale.result,
          fromCache: true,
          rawMessage: `Falha na consulta ao vivo (${err.message}). Exibindo \xFAltimo registro em cache.`
        };
      }
      if (err instanceof SswError) throw err;
      throw new SswError(
        "REQUEST_REJECTED" /* REQUEST_REJECTED */,
        `Erro na execu\xE7\xE3o da consulta SSW 101: ${err.message || "Falha desconhecida"}`,
        { details: err.message }
      );
    }
  }
  /**
   * Consulta direta por CTRC.
   */
  async queryCtrc(serieOrId, number, forceFresh) {
    let serie = "";
    let num = number || "";
    if (!num) {
      const parsed = parseSswCtrcCode(serieOrId);
      serie = parsed.series || "BCA";
      num = parsed.number || serieOrId;
    } else {
      serie = serieOrId;
    }
    return this.query({
      tipoConsulta: "CTRC",
      serie,
      numero: num,
      forceFresh
    });
  }
  /**
   * Consulta direta por Nota Fiscal.
   */
  async queryNf(numeroNf, cnpjRemetente, forceFresh) {
    return this.query({
      tipoConsulta: "NF",
      numeroNf,
      cnpjRemetente,
      forceFresh
    });
  }
  /**
   * Consulta direta por Chave de Acesso (CT-e ou NF-e de 44 dígitos).
   */
  async queryChave(chave, forceFresh) {
    return this.query({
      tipoConsulta: "CHAVE",
      chave,
      forceFresh
    });
  }
  /**
   * Limpa todo o cache em memória da 101.
   */
  clearCache() {
    this.cache.clear();
    this.cacheHits = 0;
    this.cacheMisses = 0;
  }
  /**
   * Retorna estatísticas de uso do cache.
   */
  getCacheStats() {
    return {
      size: this.cache.size,
      hits: this.cacheHits,
      misses: this.cacheMisses,
      maxEntries: this.maxCacheEntries
    };
  }
};

// server/ssw/signatures/sswSignatures.ts
var SSW_SIGNATURES = {
  ["REPORT_455_REQUEST" /* REPORT_455_REQUEST */]: {
    capabilityId: "REPORT_455_REQUEST" /* REPORT_455_REQUEST */,
    expectedMethod: "POST",
    expectedContentType: "application/x-www-form-urlencoded",
    requiredPayloadFields: ["act", "f2"],
    expectedResponsePattern: "(?i)(?:solicita|processando|fila|sequencia|sucesso|relatorio|ok)",
    description: "Solicita\xE7\xE3o de gera\xE7\xE3o do Relat\xF3rio SSW 455 de Entregas e Tr\xE2nsito"
  },
  ["REPORT_QUEUE" /* REPORT_QUEUE */]: {
    capabilityId: "REPORT_QUEUE" /* REPORT_QUEUE */,
    expectedMethod: "POST",
    expectedContentType: "application/x-www-form-urlencoded",
    requiredPayloadFields: ["act"],
    expectedResponsePattern: "(?i)(?:aguardando|processando|concluido|download|fila|relatorio|156)",
    description: "Acompanhamento da Fila 156 de relat\xF3rios do SSW"
  },
  ["REPORT_DOWNLOAD" /* REPORT_DOWNLOAD */]: {
    capabilityId: "REPORT_DOWNLOAD" /* REPORT_DOWNLOAD */,
    expectedMethod: "GET",
    expectedContentType: "text/csv",
    description: "Download do arquivo CSV do Relat\xF3rio 455 conclu\xEDdo"
  },
  ["CTRC_101" /* CTRC_101 */]: {
    capabilityId: "CTRC_101" /* CTRC_101 */,
    expectedMethod: "POST",
    description: "Consulta anal\xEDtica de CTRC 101"
  },
  ["EMISSIONS_063" /* EMISSIONS_063 */]: {
    capabilityId: "EMISSIONS_063" /* EMISSIONS_063 */,
    expectedMethod: "POST",
    description: "Consulta de emiss\xF5es SSW 063"
  },
  ["FORECAST_029" /* FORECAST_029 */]: {
    capabilityId: "FORECAST_029" /* FORECAST_029 */,
    expectedMethod: "POST",
    description: "Consulta de previs\xE3o de entrega SSW 029"
  },
  ["MANIFEST_030" /* MANIFEST_030 */]: {
    capabilityId: "MANIFEST_030" /* MANIFEST_030 */,
    expectedMethod: "POST",
    description: "Consulta de manifesto de carga SSW 030"
  },
  ["MANIFEST_DETAIL_023" /* MANIFEST_DETAIL_023 */]: {
    capabilityId: "MANIFEST_DETAIL_023" /* MANIFEST_DETAIL_023 */,
    expectedMethod: "POST",
    description: "Detalhamento de manifesto SSW 023"
  },
  ["UNLOADING_264" /* UNLOADING_264 */]: {
    capabilityId: "UNLOADING_264" /* UNLOADING_264 */,
    expectedMethod: "POST",
    description: "Registro e acompanhamento de descarga SSW 264"
  }
};
var DEFAULT_KNOWN_ENDPOINTS = {
  ["REPORT_455_REQUEST" /* REPORT_455_REQUEST */]: {
    endpoint: "/bin/ssw0230",
    method: "POST",
    confidence: 0.95
  },
  ["REPORT_QUEUE" /* REPORT_QUEUE */]: {
    endpoint: "/bin/ssw1440",
    method: "POST",
    confidence: 0.95
  },
  ["REPORT_DOWNLOAD" /* REPORT_DOWNLOAD */]: {
    endpoint: "/bin/ssw0424",
    method: "GET",
    confidence: 0.95
  },
  ["CTRC_101" /* CTRC_101 */]: {
    endpoint: "/bin/ssw0101",
    method: "POST",
    confidence: 0.95
  }
};

// server/ssw/config/configManager.ts
var SswConfigManager = class {
  constructor(sessionManager) {
    this.sessionManager = null;
    this.sessionManager = sessionManager || null;
    this.ssw455Config = { ...DEFAULT_SSW_455_CONFIG };
    this.lastSavedAt = (/* @__PURE__ */ new Date()).toISOString();
    const empresa = process.env.SSW_EMPRESA || process.env.SSW_DOMAIN || "";
    const useri = process.env.SSW_USERI || process.env.SSW_USER_I || "";
    const usuario = process.env.SSW_USUARIO || process.env.SSW_USER || process.env.SSW_USERNAME || "";
    const senha = process.env.SSW_SENHA || process.env.SSW_PASSWORD || process.env.SSW_PASS || "";
    const unidade = process.env.SSW_UNIDADE || process.env.SSW_FILIAL || process.env.SSW_DEFAULT_UNID || "VGA";
    const baseUrl = process.env.SSW_BASE_URL || "https://sistema.ssw.inf.br";
    this.connection = {
      empresa,
      useri: useri || usuario,
      usuario,
      senha,
      unidade,
      baseUrl: baseUrl.replace(/\/+$/, ""),
      hasPassword: Boolean(senha),
      lastUpdated: (/* @__PURE__ */ new Date()).toISOString()
    };
  }
  setSessionManager(sessionManager) {
    this.sessionManager = sessionManager;
    if (this.connection.usuario && this.connection.senha) {
      this.sessionManager.setCredentials({
        empresa: this.connection.empresa,
        useri: this.connection.useri || this.connection.usuario,
        usuario: this.connection.usuario,
        senha: this.connection.senha,
        unidade: this.connection.unidade,
        baseUrl: this.connection.baseUrl
      });
    }
  }
  /**
   * Retorna a configuração completa segura para exposição na API/Frontend (senha mascarada/removida).
   */
  getPublicConfig() {
    return {
      connection: {
        empresa: this.connection.empresa,
        useri: this.connection.useri,
        usuario: this.connection.usuario,
        unidade: this.connection.unidade,
        baseUrl: this.connection.baseUrl,
        hasPassword: Boolean(this.connection.senha && this.connection.senha.trim().length > 0),
        lastUpdated: this.connection.lastUpdated
      },
      capabilities: {
        "455": { ...this.ssw455Config },
        "101": FUTURE_SSW_CAPABILITIES["101"],
        "063": FUTURE_SSW_CAPABILITIES["063"],
        "029": FUTURE_SSW_CAPABILITIES["029"],
        "030": FUTURE_SSW_CAPABILITIES["030"],
        "023": FUTURE_SSW_CAPABILITIES["023"],
        "264": FUTURE_SSW_CAPABILITIES["264"]
      },
      lastSavedAt: this.lastSavedAt
    };
  }
  /**
   * Retorna a configuração de conexão ativa (com senha interna).
   */
  getConnectionConfig() {
    return { ...this.connection };
  }
  /**
   * Retorna os parâmetros atuais da Capability 455.
   */
  get455Config() {
    return { ...this.ssw455Config };
  }
  /**
   * Atualiza a configuração de conexão e sincroniza com o SessionManager.
   */
  updateConnectionConfig(newConn) {
    const existingPassword = this.connection.senha || "";
    const updatedPassword = newConn.senha !== void 0 && newConn.senha.trim() !== "" ? newConn.senha.trim() : existingPassword;
    this.connection = {
      empresa: newConn.empresa !== void 0 ? newConn.empresa.trim() : this.connection.empresa,
      useri: newConn.useri !== void 0 ? newConn.useri.trim() : this.connection.useri,
      usuario: newConn.usuario !== void 0 ? newConn.usuario.trim() : this.connection.usuario,
      senha: updatedPassword,
      unidade: newConn.unidade !== void 0 ? newConn.unidade.trim().toUpperCase() : this.connection.unidade,
      baseUrl: (newConn.baseUrl !== void 0 ? newConn.baseUrl.trim() : this.connection.baseUrl).replace(/\/+$/, ""),
      hasPassword: Boolean(updatedPassword && updatedPassword.length > 0),
      lastUpdated: (/* @__PURE__ */ new Date()).toISOString()
    };
    this.lastSavedAt = (/* @__PURE__ */ new Date()).toISOString();
    if (this.sessionManager) {
      this.sessionManager.setCredentials({
        empresa: this.connection.empresa,
        useri: this.connection.useri || this.connection.usuario,
        usuario: this.connection.usuario,
        senha: this.connection.senha || "",
        unidade: this.connection.unidade,
        baseUrl: this.connection.baseUrl
      });
    }
    return this.getConnectionConfig();
  }
  /**
   * Atualiza os parâmetros configuráveis da Capability 455.
   */
  update455Config(newConfig) {
    const validation = this.validate455Config(newConfig);
    if (!validation.isValid) {
      throw new Error(`Configura\xE7\xE3o 455 inv\xE1lida: ${validation.errors.join(", ")}`);
    }
    this.ssw455Config = {
      ...this.ssw455Config,
      ...validation.normalizedConfig
    };
    this.lastSavedAt = (/* @__PURE__ */ new Date()).toISOString();
    return { ...this.ssw455Config };
  }
  /**
   * Restaura os parâmetros da Capability 455 para os defaults exatos do SSWTools.
   */
  restore455Defaults() {
    this.ssw455Config = { ...DEFAULT_SSW_455_CONFIG };
    this.lastSavedAt = (/* @__PURE__ */ new Date()).toISOString();
    return { ...this.ssw455Config };
  }
  /**
   * Valida um conjunto de parâmetros da Capability 455 contra o protocolo SSWTools.
   */
  validate455Config(params) {
    const errors = [];
    const warnings = [];
    const merged = {
      ...this.ssw455Config,
      ...params
    };
    const validPeriodos = ["AUTORIZACAO", "EMISSAO", "PREVISAO", "ENTREGA"];
    if (merged.tipoPeriodo && !validPeriodos.includes(merged.tipoPeriodo.toUpperCase())) {
      errors.push(`Tipo de per\xEDodo '${merged.tipoPeriodo}' inv\xE1lido. Valores aceitos: ${validPeriodos.join(", ")}`);
    }
    if (merged.arquivo !== "e") {
      warnings.push(`Formato de arquivo configurado como '${merged.arquivo}'. O parser autom\xE1tico exige formato Excel/CSV ('e').`);
    }
    if (merged.dadosComplementares !== "B") {
      warnings.push(`Dados complementares configurado como '${merged.dadosComplementares}'. O parser padr\xE3o requer 'B' (Bloco completo).`);
    }
    if (merged.entrega !== "p") {
      warnings.push(`Status de entrega configurado como '${merged.entrega}'. O padr\xE3o operacional para novas cargas em rota \xE9 'p' (Pendentes).`);
    }
    return {
      isValid: errors.length === 0,
      errors,
      warnings,
      normalizedConfig: {
        ...merged,
        tipoPeriodo: (merged.tipoPeriodo || "AUTORIZACAO").toUpperCase()
      }
    };
  }
};
var globalConfigManager = null;
function getSswConfigManager(sessionManager) {
  if (!globalConfigManager) {
    globalConfigManager = new SswConfigManager(sessionManager);
  } else if (sessionManager) {
    globalConfigManager.setSessionManager(sessionManager);
  }
  return globalConfigManager;
}

// server/ssw/sswServiceInstance.ts
var globalSswService = null;
var globalSsw101Service = null;
var globalRegistry = null;
var globalSessionManager = null;
var globalCircuitBreaker = null;
var globalRetryPolicy = null;
var globalIncidentAggregator = null;
async function setupSswCapabilityRegistry() {
  if (globalRegistry) return globalRegistry;
  const storage = new InMemoryRegistryStorage();
  const registry = new SswCapabilityRegistry(storage);
  for (const [capIdKey, signature] of Object.entries(SSW_SIGNATURES)) {
    const capId = capIdKey;
    const defaultEndpoint = DEFAULT_KNOWN_ENDPOINTS[capId];
    await registry.register({
      capabilityId: capId,
      currentEndpoint: defaultEndpoint?.endpoint,
      httpMethod: defaultEndpoint?.method || signature.expectedMethod,
      signature,
      confidence: defaultEndpoint?.confidence || 0.9,
      status: "ACTIVE" /* ACTIVE */,
      failureCount: 0,
      discoveryDate: (/* @__PURE__ */ new Date()).toISOString()
    });
  }
  globalRegistry = registry;
  return registry;
}
function getSswSessionManager() {
  if (!globalSessionManager) {
    globalSessionManager = new SswSessionManager();
  }
  return globalSessionManager;
}
function getSswCircuitBreaker() {
  if (!globalCircuitBreaker) {
    globalCircuitBreaker = new SswCircuitBreaker({
      failureThreshold: 3,
      successThreshold: 2,
      backoffStepsMs: [3e4, 12e4, 3e5]
      // 30s, 2m, 5m
    });
  }
  return globalCircuitBreaker;
}
function getSswRetryPolicy() {
  if (!globalRetryPolicy) {
    globalRetryPolicy = new SswRetryPolicy({
      maxAttempts: 3,
      baseDelayMs: 1e3,
      maxDelayMs: 5e3,
      backoffFactor: 2
    });
  }
  return globalRetryPolicy;
}
function getSswIncidentAggregator() {
  if (!globalIncidentAggregator) {
    const incidentStore = new InMemoryIncidentStore();
    globalIncidentAggregator = new SswIncidentAggregator(incidentStore);
  }
  return globalIncidentAggregator;
}
async function getSsw455Service() {
  if (globalSswService) return globalSswService;
  const registry = await setupSswCapabilityRegistry();
  const circuitBreaker = getSswCircuitBreaker();
  const retryPolicy = getSswRetryPolicy();
  const incidentAggregator = getSswIncidentAggregator();
  const sessionManager = getSswSessionManager();
  const configManager = getSswConfigManager(sessionManager);
  const httpClient = new SswHttpClient(sessionManager);
  const requestGateway = new Ssw455RequestGateway(
    registry,
    httpClient,
    () => configManager.get455Config()
  );
  const queueGateway = new SswReportQueueGateway(registry, httpClient);
  const downloadGateway = new SswReportDownloadGateway(registry, httpClient);
  const jobStore = new InMemoryJobStore();
  globalSswService = new Ssw455Service({
    registry,
    circuitBreaker,
    retryPolicy,
    incidentAggregator,
    sessionManager,
    requestGateway,
    queueGateway,
    downloadGateway,
    jobStore
  });
  return globalSswService;
}
async function getSsw101Service() {
  if (globalSsw101Service) return globalSsw101Service;
  const registry = await setupSswCapabilityRegistry();
  const circuitBreaker = getSswCircuitBreaker();
  const retryPolicy = getSswRetryPolicy();
  const incidentAggregator = getSswIncidentAggregator();
  const sessionManager = getSswSessionManager();
  const httpClient = new SswHttpClient(sessionManager);
  const queryGateway = new Ssw101QueryGateway(registry, httpClient);
  globalSsw101Service = new Ssw101Service({
    registry,
    circuitBreaker,
    retryPolicy,
    incidentAggregator,
    sessionManager,
    queryGateway
  });
  return globalSsw101Service;
}

// server/createApp.ts
var offlineHosts = /* @__PURE__ */ new Set();
var isMainSupabaseOffline = false;
function getHostFromUrl(url) {
  if (!url) return "";
  try {
    return new URL(url).hostname;
  } catch (e) {
    if (!url.startsWith("http://") && !url.startsWith("https://")) {
      try {
        return new URL("https://" + url).hostname;
      } catch {
        return url;
      }
    }
    return url;
  }
}
function markHostOffline(url) {
  const host = getHostFromUrl(url);
  if (host && !offlineHosts.has(host)) {
    console.log(`[BACKEND] Host '${host}' marcado como OFFLINE. Redirecionando todas as consultas para o banco local.`);
    offlineHosts.add(host);
    isMainSupabaseOffline = true;
  }
}
var DEFAULT_APP_USERS = [
  {
    username: "anderson",
    password: "123",
    name: "Anderson Matheus",
    role: "Supervisor Operacional",
    is_master: true,
    unid: "VGA"
  },
  {
    username: "master",
    password: "123",
    name: "Anderson M. (Master)",
    role: "Superintendente de Log\xEDstica",
    is_master: true,
    unid: "VGA"
  },
  {
    username: "operador",
    password: "123",
    name: "Jo\xE3o Silva",
    role: "Operador de Despacho",
    is_master: false,
    unid: "VGA"
  },
  {
    username: "auditor",
    password: "123",
    name: "Maria Costa",
    role: "Auditor de Contratos",
    is_master: false,
    unid: "VGA"
  }
];
var inMemoryUsers = [...DEFAULT_APP_USERS];
var supabaseClient = null;
var supabaseInitialized = false;
function getSystemSupabaseClient() {
  if (supabaseInitialized) return supabaseClient;
  supabaseInitialized = true;
  const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || "";
  const supabaseKey = process.env.SUPABASE_KEY || process.env.VITE_SUPABASE_ANON_KEY || "";
  const mainHost = getHostFromUrl(supabaseUrl);
  if (mainHost) {
    if (mainHost.includes("pwckzqzzewiuqoqqamdo") || mainHost === "your-supabase-project.supabase.co") {
      isMainSupabaseOffline = true;
      offlineHosts.add(mainHost);
    }
  } else {
    isMainSupabaseOffline = true;
  }
  if (supabaseUrl && supabaseKey && !isMainSupabaseOffline) {
    try {
      supabaseClient = (0, import_supabase_js.createClient)(supabaseUrl, supabaseKey);
    } catch (err) {
      isMainSupabaseOffline = true;
    }
  }
  return supabaseClient;
}
function createApp() {
  const app2 = (0, import_express.default)();
  app2.use(import_express.default.json());
  function getRequestSupabaseClient(req) {
    const rxUrl = req.headers["x-supabase-url"] || req.headers["X-Supabase-Url"];
    const rxKey = req.headers["x-supabase-key"] || req.headers["X-Supabase-Key"];
    if (rxUrl && rxKey && rxUrl !== "https://your-supabase-project.supabase.co" && rxKey !== "your-supabase-anon-key") {
      const rxHost = getHostFromUrl(rxUrl);
      if (offlineHosts.has(rxHost)) {
        return null;
      }
      try {
        return (0, import_supabase_js.createClient)(rxUrl, rxKey);
      } catch (err) {
        return null;
      }
    }
    return getSystemSupabaseClient();
  }
  app2.get("/api/health", (req, res) => {
    const activeSupabase = getRequestSupabaseClient(req);
    const isVercel = !!process.env.VERCEL;
    const sswConfigured = !!((process.env.SSW_USUARIO || process.env.SSW_USER || process.env.SSW_USERNAME) && (process.env.SSW_SENHA || process.env.SSW_PASSWORD || process.env.SSW_PASS));
    res.json({
      status: "ok",
      runtime: isVercel ? "vercel" : "local",
      supabase_configured: !!activeSupabase,
      sswConfigured
    });
  });
  app2.post("/api/auth/login", async (req, res) => {
    const { username, password } = req.body;
    if (!username || !password) {
      return res.status(400).json({ success: false, error: "Nome de usu\xE1rio e senha s\xE3o obrigat\xF3rios." });
    }
    const cleanUser = username.trim().toLowerCase();
    const loginName = cleanUser.endsWith("@rotaoperational.com") ? cleanUser.replace("@rotaoperational.com", "") : cleanUser;
    const cleanPass = password.trim();
    console.log(`[BACKEND] Tentativa de login recebida para: ${cleanUser} (loginName: ${loginName})`);
    const activeSupabase = getRequestSupabaseClient(req);
    try {
      if (activeSupabase) {
        const email = cleanUser.includes("@") ? cleanUser : `${loginName}@rotaoperational.com`;
        console.log(`[BACKEND] Tentativa de login via Supabase para: ${email}`);
        let authData = null;
        let authError = null;
        try {
          const authRes = await activeSupabase.auth.signInWithPassword({
            email,
            password: cleanPass
          });
          authData = authRes.data;
          authError = authRes.error;
        } catch (fetchErr) {
          const msg = fetchErr?.message || "";
          if (msg.includes("fetch failed") || msg.includes("getaddrinfo")) {
            markHostOffline(activeSupabase.supabaseUrl);
          }
          authError = { message: "connection offline" };
        }
        if (!authError && authData?.user) {
          console.log(`[BACKEND] Login corporativo autenticado com sucesso.`);
          const meta = authData.user.user_metadata || {};
          const mappedUser = {
            username: loginName,
            name: meta.name || authData.user.email?.split("@")[0] || loginName,
            role: meta.role || "Operador de Despacho",
            is_master: meta.is_master === true || loginName === "master",
            created_at: authData.user.created_at
          };
          try {
            await activeSupabase.from("app_users").upsert({
              username: loginName,
              password: cleanPass,
              name: mappedUser.name,
              role: mappedUser.role,
              is_master: mappedUser.is_master
            });
          } catch (syncErr) {
          }
          return res.json({
            success: true,
            user: mappedUser
          });
        } else {
          const rxHost = getHostFromUrl(activeSupabase.supabaseUrl);
          const isOffline = offlineHosts.has(rxHost) || authError && authError.message === "connection offline";
          if (!isOffline) {
            try {
              let dbData = null;
              let dbError = null;
              try {
                const dbRes = await activeSupabase.from("app_users").select("*").eq("username", loginName);
                dbData = dbRes.data;
                dbError = dbRes.error;
              } catch (fetchErr) {
                const msg = fetchErr?.message || "";
                if (msg.includes("fetch failed") || msg.includes("getaddrinfo")) {
                  markHostOffline(activeSupabase.supabaseUrl);
                }
                dbError = { message: "connection offline" };
              }
              if (!dbError && dbData && dbData.length > 0) {
                const dbUser = dbData[0];
                if (dbUser.password === cleanPass) {
                  console.log(`[BACKEND] Login autenticado com sucesso via tabela local.`);
                  return res.json({
                    success: true,
                    user: {
                      username: dbUser.username,
                      name: dbUser.name,
                      role: dbUser.role,
                      is_master: !!dbUser.is_master,
                      created_at: dbUser.created_at || (/* @__PURE__ */ new Date()).toISOString()
                    }
                  });
                }
              }
            } catch (dbQueryErr) {
            }
          }
          const fallbackMatch = DEFAULT_APP_USERS.find(
            (u) => u.username.toLowerCase() === loginName && u.password === cleanPass
          );
          if (fallbackMatch) {
            console.log(`[BACKEND] Ativando conta corporativa padr\xE3o '${loginName}'.`);
            if (!isOffline && !offlineHosts.has(rxHost)) {
              try {
                await activeSupabase.auth.signUp({
                  email,
                  password: cleanPass,
                  options: {
                    data: {
                      name: fallbackMatch.name,
                      role: fallbackMatch.role,
                      is_master: fallbackMatch.is_master
                    }
                  }
                });
              } catch (signUpErr) {
                const msg = signUpErr?.message || "";
                if (msg.includes("fetch failed") || msg.includes("getaddrinfo")) {
                  markHostOffline(activeSupabase.supabaseUrl);
                }
              }
            }
            return res.json({
              success: true,
              user: {
                username: fallbackMatch.username,
                name: fallbackMatch.name,
                role: fallbackMatch.role,
                is_master: fallbackMatch.is_master,
                created_at: (/* @__PURE__ */ new Date()).toISOString()
              }
            });
          }
        }
      }
    } catch (generalErr) {
    }
    const match = inMemoryUsers.find(
      (u) => u.username.toLowerCase() === loginName && u.password === cleanPass
    );
    if (match) {
      console.log(`[BACKEND] Login realizado com sucesso via Fallback em Mem\xF3ria para: ${loginName}`);
      return res.json({
        success: true,
        user: {
          username: match.username,
          name: match.name,
          role: match.role,
          is_master: match.is_master
        }
      });
    }
    return res.status(401).json({
      success: false,
      error: "Credenciais inv\xE1lidas. Verifique o usu\xE1rio corporativo e a senha cadastrada."
    });
  });
  app2.get("/api/auth/users", async (req, res) => {
    const activeSupabase = getRequestSupabaseClient(req);
    try {
      if (activeSupabase) {
        const { data, error } = await activeSupabase.from("app_users").select("*").order("created_at", { ascending: true });
        if (!error && data) {
          const mapped = data.map((u) => ({
            username: u.username,
            password: u.password,
            name: u.name,
            role: u.role,
            is_master: !!u.is_master,
            created_at: u.created_at
          }));
          const resultList = [...mapped];
          DEFAULT_APP_USERS.forEach((fallback) => {
            if (!resultList.some((u) => u.username.toLowerCase() === fallback.username.toLowerCase())) {
              resultList.push(fallback);
            }
          });
          return res.json({ success: true, users: resultList });
        }
      }
    } catch (e) {
      console.error("[BACKEND] Erro ao buscar usu\xE1rios no Supabase:", e);
    }
    return res.json({ success: true, users: inMemoryUsers });
  });
  app2.post("/api/auth/users", async (req, res) => {
    const { username, password, name, role, is_master, unid } = req.body;
    if (!username || !name || !role) {
      return res.status(400).json({ success: false, error: "Par\xE2metros de usu\xE1rio inv\xE1lidos." });
    }
    const cleanUsername = username.toLowerCase().trim();
    const updatedUser = {
      username: cleanUsername,
      password: password || "123",
      name,
      role,
      is_master: !!is_master,
      unid: unid || "VGA"
    };
    const existingIdx = inMemoryUsers.findIndex((u) => u.username.toLowerCase() === cleanUsername);
    if (existingIdx > -1) {
      inMemoryUsers[existingIdx] = updatedUser;
    } else {
      inMemoryUsers.push(updatedUser);
    }
    const activeSupabase = getRequestSupabaseClient(req);
    if (activeSupabase) {
      try {
        const email = cleanUsername.includes("@") ? cleanUsername : `${cleanUsername}@rotaoperational.com`;
        console.log(`[BACKEND] Cadastrando usu\xE1rio '${cleanUsername}' no Supabase Auth (${email}).`);
        try {
          const { data: adminData, error: adminErr } = await activeSupabase.auth.admin.createUser({
            email,
            password: updatedUser.password,
            email_confirm: true,
            user_metadata: {
              name: updatedUser.name,
              role: updatedUser.role,
              is_master: updatedUser.is_master
            }
          });
          if (adminErr) {
            console.log(`[BACKEND] auth.admin.createUser falhou (n\xE3o \xE9 chave de servi\xE7o): ${adminErr.message}. Tentando signUp normal...`);
            const { data: signData, error: signUpError } = await activeSupabase.auth.signUp({
              email,
              password: updatedUser.password,
              options: {
                data: {
                  name: updatedUser.name,
                  role: updatedUser.role,
                  is_master: updatedUser.is_master
                }
              }
            });
            if (signUpError) {
              console.log(`[BACKEND] signUp normal tamb\xE9m reportou erro/aviso: ${signUpError.message}`);
            }
          } else {
            console.log("[BACKEND] Usu\xE1rio criado e confirmado com sucesso via API Admin do Supabase Auth.");
          }
        } catch (authErr) {
          console.warn("[BACKEND] Erro ao cadastrar no Supabase Auth:", authErr.message || authErr);
        }
        const { error: dbError } = await activeSupabase.from("app_users").upsert({
          username: cleanUsername,
          password: updatedUser.password,
          name: updatedUser.name,
          role: updatedUser.role,
          is_master: updatedUser.is_master,
          unid: updatedUser.unid
        });
        if (dbError) {
          console.warn("[BACKEND] Erro ao sincronizar usu\xE1rio no Supabase DB:", dbError.message);
          return res.json({
            success: true,
            warning: true,
            message: `Salvo localmente na sess\xE3o. Sincroniza\xE7\xE3o de tabela de dados falhou: ${dbError.message}`
          });
        }
        return res.json({ success: true, message: "Usu\xE1rio sincronizado e cadastrado no Supabase com sucesso!" });
      } catch (dbErr) {
        console.error("[BACKEND] Exce\xE7\xE3o ao persistir usu\xE1rio:", dbErr);
      }
    }
    return res.json({ success: true, message: "Usu\xE1rio persistido em mem\xF3ria com sucesso!" });
  });
  app2.delete("/api/auth/users/:username", async (req, res) => {
    const usernameToDelete = req.params.username.toLowerCase().trim();
    inMemoryUsers = inMemoryUsers.filter((u) => u.username.toLowerCase() !== usernameToDelete);
    const activeSupabase = getRequestSupabaseClient(req);
    if (activeSupabase) {
      try {
        const { error } = await activeSupabase.from("app_users").delete().eq("username", usernameToDelete);
        if (error) {
          console.warn("[BACKEND] Erro ao deletar usu\xE1rio do Supabase DB:", error.message);
          return res.status(500).json({ success: false, error: error.message });
        }
        return res.json({ success: true, message: "Usu\xE1rio removido do Supabase com sucesso!" });
      } catch (dbErr) {
        return res.status(500).json({ success: false, error: dbErr.message || dbErr });
      }
    }
    return res.json({ success: true, message: "Usu\xE1rio removido da mem\xF3ria do servidor com sucesso!" });
  });
  app2.get("/api/ssw/config", async (req, res) => {
    try {
      const sessionManager = getSswSessionManager();
      const configManager = getSswConfigManager(sessionManager);
      const config = configManager.getPublicConfig();
      const missing = [];
      if (!process.env.SSW_EMPRESA && !process.env.SSW_DOMAIN) missing.push("SSW_EMPRESA");
      if (!process.env.SSW_USERI && !process.env.SSW_USER_I) missing.push("SSW_USERI");
      if (!process.env.SSW_USUARIO && !process.env.SSW_USER && !process.env.SSW_USERNAME) missing.push("SSW_USUARIO");
      if (!process.env.SSW_SENHA && !process.env.SSW_PASSWORD && !process.env.SSW_PASS) missing.push("SSW_SENHA");
      return res.json({
        success: true,
        configured: missing.length === 0,
        missing: missing.length > 0 ? missing : void 0,
        config
      });
    } catch (err) {
      console.error("[SSW-CONFIG-API] Erro ao recuperar configura\xE7\xE3o:", err);
      return res.status(500).json({
        success: false,
        error: err.message || "Erro ao recuperar configura\xE7\xE3o central do SSW"
      });
    }
  });
  app2.put("/api/ssw/config", async (req, res) => {
    try {
      const sessionManager = getSswSessionManager();
      const configManager = getSswConfigManager(sessionManager);
      const { connection, capabilities } = req.body || {};
      if (connection) {
        configManager.updateConnectionConfig(connection);
      }
      if (capabilities && capabilities["455"]) {
        configManager.update455Config(capabilities["455"]);
      }
      return res.json({
        success: true,
        message: "Configura\xE7\xF5es da integra\xE7\xE3o SSW atualizadas com sucesso!",
        config: configManager.getPublicConfig()
      });
    } catch (err) {
      console.error("[SSW-CONFIG-API] Erro ao salvar configura\xE7\xE3o:", err);
      return res.status(400).json({
        success: false,
        error: err.message || "Falha ao salvar configura\xE7\xF5es do SSW"
      });
    }
  });
  app2.post("/api/ssw/config", async (req, res) => {
    try {
      const sessionManager = getSswSessionManager();
      const configManager = getSswConfigManager(sessionManager);
      const { connection, capabilities } = req.body || {};
      if (connection) {
        configManager.updateConnectionConfig(connection);
      }
      if (capabilities && capabilities["455"]) {
        configManager.update455Config(capabilities["455"]);
      }
      return res.json({
        success: true,
        message: "Configura\xE7\xF5es da integra\xE7\xE3o SSW atualizadas com sucesso!",
        config: configManager.getPublicConfig()
      });
    } catch (err) {
      console.error("[SSW-CONFIG-API] Erro ao salvar configura\xE7\xE3o:", err);
      return res.status(400).json({
        success: false,
        error: err.message || "Falha ao salvar configura\xE7\xF5es do SSW"
      });
    }
  });
  app2.post("/api/ssw/config/455/restore-defaults", async (req, res) => {
    try {
      const sessionManager = getSswSessionManager();
      const configManager = getSswConfigManager(sessionManager);
      const restored = configManager.restore455Defaults();
      return res.json({
        success: true,
        message: "Par\xE2metros padr\xE3o do SSWTools restaurados com sucesso para o Relat\xF3rio 455!",
        config455: restored,
        fullConfig: configManager.getPublicConfig()
      });
    } catch (err) {
      console.error("[SSW-CONFIG-API] Erro ao restaurar defaults 455:", err);
      return res.status(500).json({
        success: false,
        error: err.message || "Erro ao restaurar par\xE2metros padr\xE3o do SSWTools"
      });
    }
  });
  app2.post("/api/ssw/config/455/validate", async (req, res) => {
    try {
      const sessionManager = getSswSessionManager();
      const configManager = getSswConfigManager(sessionManager);
      const params = req.body || {};
      const result = configManager.validate455Config(params);
      return res.json({
        success: true,
        validation: result
      });
    } catch (err) {
      console.error("[SSW-CONFIG-API] Erro na valida\xE7\xE3o da config 455:", err);
      return res.status(500).json({
        success: false,
        error: err.message || "Erro ao validar configura\xE7\xE3o 455"
      });
    }
  });
  app2.get("/api/ssw/health", async (req, res) => {
    try {
      const sswService = await getSsw455Service();
      const sessionManager = getSswSessionManager();
      const health = await sswService.getHealthSummary();
      const sessionStatus = sessionManager.getSafeStatus();
      return res.json({
        success: true,
        health,
        session: sessionStatus
      });
    } catch (err) {
      console.error("[SSW-API] Erro ao obter diagn\xF3stico de sa\xFAde:", err);
      return res.status(500).json({
        success: false,
        error: err.message || "Erro interno ao obter telemetria SSW"
      });
    }
  });
  app2.post("/api/ssw/test-connection", async (req, res) => {
    try {
      const sessionManager = getSswSessionManager();
      if (!sessionManager.isConfigured()) {
        return res.status(400).json({
          success: false,
          error: "Credenciais SSW (SSW_USER e SSW_PASSWORD) n\xE3o configuradas no backend."
        });
      }
      const authenticated = await sessionManager.authenticate();
      return res.json({
        success: authenticated,
        message: "Conex\xE3o com o SSW autenticada com sucesso!",
        session: sessionManager.getSafeStatus()
      });
    } catch (err) {
      console.error("[SSW-API] Erro no teste de conex\xE3o:", err);
      const isSswError = err instanceof SswError;
      return res.status(isSswError ? 400 : 500).json({
        success: false,
        error: err.message || "Falha na autentica\xE7\xE3o SSW",
        code: isSswError ? err.code : "AUTH_FAILED"
      });
    }
  });
  app2.post("/api/ssw/455/request", async (req, res) => {
    try {
      const sswService = await getSsw455Service();
      const { startDate, endDate, unid, dataTipo } = req.body || {};
      const requestedBy = (req.body?.requestedBy || "operador").trim();
      const job = await sswService.requestReport(
        { startDate, endDate, unid, dataTipo },
        requestedBy
      );
      return res.json({
        success: true,
        job
      });
    } catch (err) {
      console.error("[SSW-API] Erro ao solicitar relat\xF3rio 455:", err);
      const isSswError = err instanceof SswError;
      return res.status(isSswError ? 400 : 500).json({
        success: false,
        error: err.message || "Erro ao solicitar relat\xF3rio 455 no SSW",
        code: isSswError ? err.code : "REQUEST_FAILED"
      });
    }
  });
  app2.get("/api/ssw/455/jobs/:id", async (req, res) => {
    try {
      const sswService = await getSsw455Service();
      const jobId = req.params.id;
      const job = await sswService.checkJobStatus(jobId);
      return res.json({
        success: true,
        job
      });
    } catch (err) {
      console.error("[SSW-API] Erro ao consultar status do job:", err);
      const isSswError = err instanceof SswError;
      return res.status(isSswError ? 404 : 500).json({
        success: false,
        error: err.message || "Job n\xE3o encontrado ou erro na fila",
        code: isSswError ? err.code : "JOB_ERROR"
      });
    }
  });
  app2.post("/api/ssw/455/jobs/:id/download", async (req, res) => {
    try {
      const sswService = await getSsw455Service();
      const jobId = req.params.id;
      const jobStore = sswService.getJobStore();
      const job = await jobStore.getJob(jobId);
      if (!job) {
        return res.status(404).json({
          success: false,
          error: `Job '${jobId}' n\xE3o encontrado.`
        });
      }
      const { csvContent, rowCount } = await sswService.downloadReport(job);
      return res.json({
        success: true,
        job,
        csvContent,
        rowCount
      });
    } catch (err) {
      console.error("[SSW-API] Erro ao baixar relat\xF3rio:", err);
      const isSswError = err instanceof SswError;
      return res.status(isSswError ? 400 : 500).json({
        success: false,
        error: err.message || "Falha ao baixar CSV do relat\xF3rio 455",
        code: isSswError ? err.code : "DOWNLOAD_ERROR"
      });
    }
  });
  app2.get("/api/ssw/455/latest", async (req, res) => {
    try {
      const sswService = await getSsw455Service();
      const unid = req.query.unid || void 0;
      const latest = await sswService.findLatestCompletedReport(unid);
      return res.json({
        success: true,
        latest
      });
    } catch (err) {
      console.error("[SSW-API] Erro ao buscar \xFAltimo relat\xF3rio 455:", err);
      const isSswError = err instanceof SswError;
      return res.status(isSswError ? 400 : 500).json({
        success: false,
        error: err.message || "Erro ao consultar \xFAltimo relat\xF3rio 455",
        code: isSswError ? err.code : "LATEST_QUERY_ERROR"
      });
    }
  });
  app2.post("/api/ssw/455/latest/sync", async (req, res) => {
    try {
      const sswService = await getSsw455Service();
      const { unid } = req.body || {};
      const requestedBy = (req.body?.requestedBy || "operador").trim();
      const result = await sswService.syncLatestReport(unid, requestedBy);
      if (!result.success) {
        return res.status(400).json(result);
      }
      return res.json(result);
    } catch (err) {
      console.error("[SSW-API] Erro ao sincronizar \xFAltimo relat\xF3rio 455:", err);
      return res.status(500).json({
        success: false,
        error: err.message || "Erro inesperado ao sincronizar \xFAltimo relat\xF3rio 455",
        errorCode: "SYNC_LATEST_FAILED"
      });
    }
  });
  app2.post("/api/ssw/455/retry", async (req, res) => {
    try {
      const sswService = await getSsw455Service();
      const { sequence, unid } = req.body || {};
      const requestedBy = (req.body?.requestedBy || "operador").trim();
      const result = await sswService.retryReport(sequence, requestedBy, unid);
      if (!result.success) {
        return res.status(400).json(result);
      }
      return res.json(result);
    } catch (err) {
      console.error("[SSW-API] Erro no retry do relat\xF3rio:", err);
      return res.status(500).json({
        success: false,
        error: err.message || "Erro inesperado ao tentar novamente o download",
        errorCode: "RETRY_FAILED"
      });
    }
  });
  app2.post("/api/ssw/455/:sequence/retry", async (req, res) => {
    try {
      const sswService = await getSsw455Service();
      const sequence = req.params.sequence;
      const { unid } = req.body || {};
      const requestedBy = (req.body?.requestedBy || "operador").trim();
      const result = await sswService.retryReport(sequence, requestedBy, unid);
      if (!result.success) {
        return res.status(400).json(result);
      }
      return res.json(result);
    } catch (err) {
      console.error("[SSW-API] Erro no retry por sequ\xEAncia:", err);
      return res.status(500).json({
        success: false,
        error: err.message || "Erro inesperado ao tentar novamente o download",
        errorCode: "RETRY_FAILED"
      });
    }
  });
  app2.post("/api/ssw/455/generate", async (req, res) => {
    try {
      const sswService = await getSsw455Service();
      const { startDate, endDate, unid, dataTipo, pollIntervalMs, maxWaitTimeMs } = req.body || {};
      const requestedBy = (req.body?.requestedBy || "operador").trim();
      const result = await sswService.acquireReport(
        { startDate, endDate, unid, dataTipo },
        requestedBy,
        { pollIntervalMs: pollIntervalMs || 5e3, maxWaitTimeMs: maxWaitTimeMs || 3e5 }
      );
      if (!result.success) {
        return res.status(400).json(result);
      }
      return res.json(result);
    } catch (err) {
      console.error("[SSW-API] Exce\xE7\xE3o na gera\xE7\xE3o sob demanda de relat\xF3rio 455:", err);
      return res.status(500).json({
        success: false,
        error: err.message || "Erro inesperado durante a gera\xE7\xE3o do relat\xF3rio 455",
        errorCode: "GENERATION_FAILED"
      });
    }
  });
  app2.post("/api/ssw/455/acquire", async (req, res) => {
    try {
      const sswService = await getSsw455Service();
      const { startDate, endDate, unid, dataTipo, pollIntervalMs, maxWaitTimeMs } = req.body || {};
      const requestedBy = (req.body?.requestedBy || "operador").trim();
      const result = await sswService.acquireReport(
        { startDate, endDate, unid, dataTipo },
        requestedBy,
        { pollIntervalMs: pollIntervalMs || 5e3, maxWaitTimeMs: maxWaitTimeMs || 3e5 }
      );
      if (!result.success) {
        return res.status(400).json(result);
      }
      return res.json(result);
    } catch (err) {
      console.error("[SSW-API] Exce\xE7\xE3o no fluxo consolidado de aquisi\xE7\xE3o:", err);
      return res.status(500).json({
        success: false,
        error: err.message || "Erro inesperado durante a aquisi\xE7\xE3o do relat\xF3rio 455",
        errorCode: "ACQUISITION_FAILED"
      });
    }
  });
  app2.post("/api/ssw/101/query", async (req, res) => {
    try {
      const ssw101Service = await getSsw101Service();
      const requestDto = req.body || {};
      if (!requestDto.tipoConsulta) {
        return res.status(400).json({
          success: false,
          error: "O campo 'tipoConsulta' ('CTRC', 'NF' ou 'CHAVE') \xE9 obrigat\xF3rio."
        });
      }
      const result = await ssw101Service.query(requestDto);
      return res.json(result);
    } catch (err) {
      console.error("[SSW-101-API] Erro na consulta 101:", err);
      const isSswError = err instanceof SswError;
      return res.status(isSswError ? 400 : 500).json({
        success: false,
        found: false,
        resultsCount: 0,
        error: err.message || "Falha na consulta SSW 101",
        code: isSswError ? err.code : "QUERY_FAILED"
      });
    }
  });
  app2.get("/api/ssw/101/ctrc/:id", async (req, res) => {
    try {
      const ssw101Service = await getSsw101Service();
      const id = req.params.id;
      const forceFresh = req.query.fresh === "true" || req.query.fresh === "1";
      const result = await ssw101Service.queryCtrc(id, void 0, forceFresh);
      return res.json(result);
    } catch (err) {
      console.error("[SSW-101-API] Erro ao consultar CTRC:", err);
      const isSswError = err instanceof SswError;
      return res.status(isSswError ? 400 : 500).json({
        success: false,
        found: false,
        resultsCount: 0,
        error: err.message || "Erro ao consultar CTRC no SSW 101",
        code: isSswError ? err.code : "CTRC_QUERY_FAILED"
      });
    }
  });
  app2.get("/api/ssw/101/nf/:numero", async (req, res) => {
    try {
      const ssw101Service = await getSsw101Service();
      const numero = req.params.numero;
      const cnpj = req.query.cnpj || void 0;
      const forceFresh = req.query.fresh === "true" || req.query.fresh === "1";
      const result = await ssw101Service.queryNf(numero, cnpj, forceFresh);
      return res.json(result);
    } catch (err) {
      console.error("[SSW-101-API] Erro ao consultar NF:", err);
      const isSswError = err instanceof SswError;
      return res.status(isSswError ? 400 : 500).json({
        success: false,
        found: false,
        resultsCount: 0,
        error: err.message || "Erro ao consultar NF no SSW 101",
        code: isSswError ? err.code : "NF_QUERY_FAILED"
      });
    }
  });
  app2.get("/api/ssw/101/chave/:chave", async (req, res) => {
    try {
      const ssw101Service = await getSsw101Service();
      const chave = req.params.chave;
      const forceFresh = req.query.fresh === "true" || req.query.fresh === "1";
      const result = await ssw101Service.queryChave(chave, forceFresh);
      return res.json(result);
    } catch (err) {
      console.error("[SSW-101-API] Erro ao consultar chave:", err);
      const isSswError = err instanceof SswError;
      return res.status(isSswError ? 400 : 500).json({
        success: false,
        found: false,
        resultsCount: 0,
        error: err.message || "Erro ao consultar chave no SSW 101",
        code: isSswError ? err.code : "CHAVE_QUERY_FAILED"
      });
    }
  });
  app2.post("/api/ssw/101/clear-cache", async (req, res) => {
    try {
      const ssw101Service = await getSsw101Service();
      ssw101Service.clearCache();
      return res.json({
        success: true,
        message: "Cache da consulta SSW 101 limpo com sucesso!"
      });
    } catch (err) {
      return res.status(500).json({
        success: false,
        error: err.message || "Erro ao limpar cache SSW 101"
      });
    }
  });
  app2.get("/api/ssw/101/cache-stats", async (req, res) => {
    try {
      const ssw101Service = await getSsw101Service();
      const stats = ssw101Service.getCacheStats();
      return res.json({
        success: true,
        stats
      });
    } catch (err) {
      return res.status(500).json({
        success: false,
        error: err.message || "Erro ao obter estat\xEDsticas do cache 101"
      });
    }
  });
  return app2;
}

// api/index.ts
var app = createApp();
var index_default = app;
module.exports = module.exports.default || module.exports;
//# sourceMappingURL=vercel.cjs.map
