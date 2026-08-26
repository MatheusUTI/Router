import { ICtrcRepository } from '../domain/repositories/ICtrcRepository';
import { IRoutePlanningRepository } from '../domain/repositories/IRoutePlanningRepository';
import { IPreRomaneioRepository } from '../domain/repositories/IPreRomaneioRepository';
import { IUserPreferenceRepository } from '../domain/repositories/IUserPreferenceRepository';

import { CtrcRepository } from './localdb/repositories/ctrcRepository';
import { RoutePlanningRepository } from './localdb/repositories/routePlanningRepository';
import { PreRomaneioRepository } from './localdb/repositories/preRomaneioRepository';
import { UserPreferenceRepository } from './localdb/repositories/userPreferenceRepository';

import { AuditLogRepository } from './localdb/repositories/auditLogRepository';
import { CurvaAClientRepository } from './localdb/repositories/curvaAClientRepository';
import { CidadeRotaRepository } from './localdb/repositories/cidadeRotaRepository';
import { HelperRepository } from './localdb/repositories/helperRepository';
import { RouteGateRepository } from './localdb/repositories/routeGateRepository';
import { CidadeAtendidaSSWRepository } from './localdb/repositories/cidadeAtendidaSSWRepository';
import { OccurrenceRepository } from './localdb/repositories/occurrenceRepository';

export const ctrcRepository: ICtrcRepository = CtrcRepository;
export const routePlanningRepository: IRoutePlanningRepository = RoutePlanningRepository;
export const preRomaneioRepository: IPreRomaneioRepository = PreRomaneioRepository;
export const userPreferenceRepository: IUserPreferenceRepository = UserPreferenceRepository;

// Unported repositories (to be ported when needed)
export const auditLogRepository = AuditLogRepository;
export const curvaAClientRepository = CurvaAClientRepository;
export const cidadeRotaRepository = CidadeRotaRepository;
export const helperRepository = HelperRepository;
export const routeGateRepository = RouteGateRepository;
export const cidadeAtendidaSSWRepository = CidadeAtendidaSSWRepository;
export const occurrenceRepository = OccurrenceRepository;
import { SyncQueueRepository } from './localdb/repositories/syncQueueRepository';
import { TripRepository } from './localdb/repositories/tripRepository';

export const syncQueueRepository = SyncQueueRepository;
export const tripRepository = TripRepository;
import { OperationalCalendarRepository } from './localdb/repositories/operationalCalendarRepository';
import { OperationalUnitBIRepository } from './localdb/repositories/operationalUnitBIRepository';

export const operationalCalendarRepository = OperationalCalendarRepository;
export const operationalUnitBIRepository = OperationalUnitBIRepository;

// Aliasing exports with upper-camel-case to prevent massive refactoring in views
export { 
  CtrcRepository, 
  RoutePlanningRepository, 
  PreRomaneioRepository, 
  UserPreferenceRepository, 
  AuditLogRepository,
  CurvaAClientRepository,
  CidadeRotaRepository,
  HelperRepository,
  RouteGateRepository,
  CidadeAtendidaSSWRepository,
  OccurrenceRepository,
  SyncQueueRepository,
  TripRepository,
  OperationalCalendarRepository,
  OperationalUnitBIRepository
};
