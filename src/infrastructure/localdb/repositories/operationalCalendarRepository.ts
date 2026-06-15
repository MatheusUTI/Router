import { db } from '../db';
import { OperationalCalendarEvent, OperationalNotice, Ctrc } from '../../../types';

export const OperationalCalendarRepository = {
  async getAll(): Promise<OperationalCalendarEvent[]> {
    return db.operational_calendar_events.toArray();
  },

  async getActive(): Promise<OperationalCalendarEvent[]> {
    return db.operational_calendar_events.where('active').equals(1).toArray();
  },

  async getEventsByCity(city: string): Promise<OperationalCalendarEvent[]> {
    if (!city) return [];
    const normalized = city.trim().toUpperCase();
    return db.operational_calendar_events
      .where('city')
      .equalsIgnoreCase(normalized)
      .toArray();
  },

  async putMany(events: OperationalCalendarEvent[]): Promise<void> {
    await db.operational_calendar_events.bulkPut(events);
  },

  async clear(): Promise<void> {
    await db.operational_calendar_events.clear();
  },

  /**
   * Parser corresponding to holiday TXT standard.
   */
  importFromTxt(txt: string): OperationalCalendarEvent[] {
    if (!txt) return [];
    const lines = txt.split('\n');
    let currentDateStr = '';
    const events: OperationalCalendarEvent[] = [];

    const dateRegex = /^(\d{2})\/(\d{2})\/(\d{4})$/;

    for (const rawLine of lines) {
      const line = rawLine.trim();
      if (!line) continue;

      // Check if it's a date line
      const match = line.match(dateRegex);
      if (match) {
        const [, day, month, year] = match;
        currentDateStr = `${year}-${month}-${day}`;
        continue;
      }

      if (!currentDateStr) {
        continue; // Line before any date section
      }

      const upperLine = line.toUpperCase();
      
      const isGeneralLine = (
        !line.includes(' - ') && !line.includes(' — ') && !line.includes(' – ')
      ) || (
        upperLine.includes('LEI FEDERAL') ||
        upperLine.includes('LEI COMPLEMENTAR') ||
        upperLine.includes('RES.') ||
        upperLine.includes('PORTARIA') ||
        upperLine.includes('CONFRATERNIZAÇÃO UNIVERSAL') ||
        upperLine.includes('FINADOS') ||
        upperLine.includes('PROCLAMAÇÃO DA REPÚBLICA') ||
        upperLine.includes('PROCLAMACAO DA REPUBLICA') ||
        upperLine.includes('NATAL') ||
        upperLine.includes('VÉSPERA') ||
        upperLine.includes('VESPERA') ||
        upperLine.includes('DIA DE NOSSA SENHORA APARECIDA') ||
        upperLine.includes('NOSSA SENHORA APARECIDA') ||
        upperLine.includes('DIA NACIONAL') ||
        upperLine.includes('ZUMBI') ||
        upperLine.includes('CONSCIÊNCIA NEGRA') ||
        upperLine.includes('CONSCIENCIA NEGRA') ||
        upperLine.includes('SUSP. EXPEDIENTE') ||
        upperLine.includes('SUSPENSAO DE EXPEDIENTE') ||
        upperLine.includes('SUSPENSÃO DE EXPEDIENTE') ||
        upperLine.includes('DIA DA JUSTIÇA') ||
        upperLine.includes('DIA DA JUSTICA')
      );

      let city = 'GERAL';
      let description = line;

      if (!isGeneralLine) {
        const parts = line.split(/\s*[-—–]\s+/);
        if (parts.length >= 2) {
          const left = parts[0].trim();
          const right = parts.slice(1).join(' - ').trim();
          
          const leftUpper = left.toUpperCase();
          const isLeftGeneral = (
            leftUpper.includes('SUSP') ||
            leftUpper.includes('EXPEDIENTE') ||
            leftUpper.includes('FERIADO') ||
            leftUpper.includes('VÉSPERA') ||
            leftUpper.includes('VESPERA') ||
            leftUpper.includes('DIA DE') ||
            leftUpper.includes('CONFRATERNIZAÇÃO') ||
            leftUpper.includes('CONFRATERNIZACAO') ||
            leftUpper.includes('NATAL') ||
            leftUpper.includes('FINADOS') ||
            leftUpper.includes('PROCLAMAÇÃO') ||
            leftUpper.includes('PROCLAMACAO') ||
            leftUpper.includes('DIA DA') ||
            leftUpper.includes('DIA NACIONAL')
          );

          if (isLeftGeneral) {
            city = 'GERAL';
            description = line;
          } else {
            city = left;
            description = right;
          }
        }
      }

      const descUpper = description.toUpperCase();
      
      let recurrenceType: 'FIXED_YEARLY' | 'YEAR_SPECIFIC' = 'FIXED_YEARLY';
      if (
        descUpper.includes('CARNAVAL') ||
        descUpper.includes('CORPUS') ||
        descUpper.includes('CINZAS') ||
        descUpper.includes('SANTA') || 
        descUpper.includes('PAIXÃO DE CRISTO') ||
        descUpper.includes('PAIXAO DE CRISTO') ||
        descUpper.includes('PORTARIA') ||
        descUpper.includes('L.C.') ||
        descUpper.includes('LC ') ||
        descUpper.includes('SUSP. EXPEDIENTE') ||
        descUpper.includes('SUSPENSAO DE EXPEDIENTE') ||
        descUpper.includes('SUSPENSÃO DE EXPEDIENTE')
      ) {
        recurrenceType = 'YEAR_SPECIFIC';
      }

      let eventType = 'OUTROS';
      if (
        descUpper.includes('ANIVERSÁRIO') ||
        descUpper.includes('ANIVERSARIO') ||
        descUpper.includes('EMANCIPAÇÃO') ||
        descUpper.includes('EMANCIPACAO') ||
        descUpper.includes('MUNICÍPIO') ||
        descUpper.includes('MUNICIPIO') ||
        descUpper.includes('INSTALAÇÃO') ||
        descUpper.includes('INSTALACAO') ||
        descUpper.includes('FUNDAÇÃO') ||
        descUpper.includes('FUNDACAO')
      ) {
        eventType = 'ANIVERSARIO';
      } else if (
        descUpper.includes('PADROEIRO') ||
        descUpper.includes('PADROEIRA') ||
        descUpper.includes('SÃO ') ||
        descUpper.includes('SAO ') ||
        descUpper.includes('SANTO ') ||
        descUpper.includes('SANTA ') ||
        descUpper.includes('NOSSA SENHORA') ||
        descUpper.includes('N. SRA') ||
        descUpper.includes('N.SRA') ||
        descUpper.includes('SENHOR ') ||
        descUpper.includes('IMACULADA') ||
        descUpper.includes('CRISTO') ||
        descUpper.includes('CONCEIÇÃO') ||
        descUpper.includes('CONCEICAO')
      ) {
        eventType = 'PADROEIRO';
      } else if (
        descUpper.includes('SUSP') ||
        descUpper.includes('EXPEDIENTE')
      ) {
        eventType = 'SUSPENSAO';
      } else if (
        descUpper.includes('FERIADO') ||
        descUpper.includes('CONFRATERNIZAÇÃO') ||
        descUpper.includes('CONFRATERNIZACAO') ||
        descUpper.includes('TIRADENTES') ||
        descUpper.includes('TRABALHO') ||
        descUpper.includes('INDEPENDÊNCIA') ||
        descUpper.includes('INDEPENDENCIA') ||
        descUpper.includes('FINADOS') ||
        descUpper.includes('REPÚBLICA') ||
        descUpper.includes('REPUBLICA') ||
        descUpper.includes('CONSCIÊNCIA NEGRA') ||
        descUpper.includes('CONSCIENCIA NEGRA') ||
        descUpper.includes('NATAL') ||
        descUpper.includes('CARNAVAL') ||
        descUpper.includes('CORPUS')
      ) {
        eventType = 'FERIADO';
      }

      let severity: 'INFO' | 'WARNING' | 'CRITICAL' = 'INFO';
      if (eventType === 'SUSPENSAO') {
        severity = 'CRITICAL';
      } else if (eventType === 'FERIADO' || eventType === 'ANIVERSARIO') {
        severity = 'WARNING';
      }

      const [yearStr, monthStr, dayStr] = currentDateStr.split('-');
      const slugCity = city.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]/g, '');
      const slugDesc = description.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]/g, '').slice(0, 20);
      const id = `${currentDateStr}_${slugCity}_${slugDesc}`;

      events.push({
        id,
        date: currentDateStr,
        dayMonth: `${dayStr}/${monthStr}`,
        year: parseInt(yearStr, 10),
        city,
        uf: 'MG',
        description,
        eventType,
        recurrenceType,
        active: true,
        source: 'TXT_FERIADOS_MG',
        severity,
        notes: `Importado de TXT_FERIADOS_MG`,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      });
    }

    return events;
  },

  async importAndSaveTxt(txt: string): Promise<number> {
    const events = this.importFromTxt(txt);
    if (events.length > 0) {
      await this.putMany(events);
    }
    return events.length;
  },

  async getUpcomingNotices(daysAhead: number, dateStr?: string, activeCtrcs: any[] = []): Promise<OperationalNotice[]> {
    const today = dateStr ? new Date(`${dateStr}T00:00:00`) : new Date('2026-06-02T00:00:00');
    
    // Normalize active cities on the planning board
    const activeCities = new Set<string>();
    const activeRoutesByCity = new Map<string, string>();
    
    activeCtrcs.forEach(c => {
      // Find both cidade_ent and normal city
      const citiesToCheck = [c.cidade_ent, c.cidade].filter(Boolean) as string[];
      citiesToCheck.forEach(city => {
        const normalizedCity = city.toUpperCase().trim().split(/[-/]/)[0].trim();
        activeCities.add(normalizedCity);
        
        const route = c.effectiveRoute || c.normRota || c.setor;
        if (route) {
          activeRoutesByCity.set(normalizedCity, route);
        }
      });
    });

    const allEvents = await this.getAll();
    const notices: OperationalNotice[] = [];

    const severityWeight = { CRITICAL: 3, WARNING: 2, INFO: 1 };

    for (const event of allEvents) {
      if (!event.active) continue;

      const eventDate = new Date(`${event.date}T00:00:00`);
      const diffTime = eventDate.getTime() - today.getTime();
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

      let match = false;
      let daysUntil = -1;

      if (diffDays >= 0 && diffDays <= daysAhead) {
        match = true;
        daysUntil = diffDays;
      } else if (event.recurrenceType === 'FIXED_YEARLY') {
        for (let i = 0; i <= daysAhead; i++) {
          const nextDay = new Date(today.getTime());
          nextDay.setDate(today.getDate() + i);
          
          const nextDayMonth = `${String(nextDay.getDate()).padStart(2, '0')}/${String(nextDay.getMonth() + 1).padStart(2, '0')}`;
          if (event.dayMonth === nextDayMonth) {
            match = true;
            daysUntil = i;
            break;
          }
        }
      }

      if (match && daysUntil !== -1) {
        const isGeneral = event.city === 'GERAL';
        const cleanedEventCity = event.city.toUpperCase().trim().split(/[-/]/)[0].trim();
        const isMatchingCity = activeCities.has(cleanedEventCity);

        if (isGeneral || isMatchingCity) {
          const route = !isGeneral ? activeRoutesByCity.get(cleanedEventCity) : undefined;
          
          let message = event.description;
          if (!isGeneral) {
            message = `${event.city}: ${event.description}`;
          }

          notices.push({
            id: `notice_${event.id}_${daysUntil}`,
            date: event.date,
            city: event.city,
            route,
            title: isGeneral ? 'Alerta Geral' : `Alerta: ${event.city}`,
            message,
            severity: event.severity,
            daysUntil,
            sourceEventId: event.id
          });
        }
      }
    }

    return notices.sort((a, b) => {
      if (a.daysUntil !== b.daysUntil) {
        return a.daysUntil - b.daysUntil;
      }
      return severityWeight[b.severity] - severityWeight[a.severity];
    });
  }
};
