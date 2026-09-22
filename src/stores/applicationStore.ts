import { create } from 'zustand';
import { toDisplayStatus } from '../applicationStatuses';
import { applications as demoApplications } from '../data';
import { friendlyError } from '../lib/errors';
import type { ApplicationFormValues } from '../schemas/applicationSchema';
import * as applicationService from '../services/applicationService';
import type { Application, ApplicationStatus } from '../types/domain';

const seededDemo: Application[] = demoApplications.map(item => ({
  ...item,
  rawStatus: item.status.toUpperCase() as ApplicationStatus,
  favorite: item.id === '1',
  archived: false,
}));

type ApplicationState = {
  items: Application[];
  loading: boolean;
  refreshing: boolean;
  error: string | null;
  demo: boolean;
  load: (demo: boolean, refresh?: boolean) => Promise<void>;
  create: (values: ApplicationFormValues) => Promise<boolean>;
  update: (id: string, values: ApplicationFormValues) => Promise<boolean>;
  updateStatus: (id: string, status: ApplicationStatus) => Promise<boolean>;
  toggleFavorite: (id: string) => Promise<boolean>;
  archive: (id: string) => Promise<boolean>;
  remove: (id: string) => Promise<boolean>;
  duplicate: (id: string) => Promise<boolean>;
  clear: () => void;
};

export const useApplicationStore = create<ApplicationState>((set, get) => ({
  items: [], loading: false, refreshing: false, error: null, demo: false,
  load: async (demo, refresh = false) => {
    if (demo) return set({ items: seededDemo, demo: true, loading: false, refreshing: false, error: null });
    if (refresh) set({ refreshing: true, demo: false, error: null });
    else set({ items: [], loading: true, demo: false, error: null });
    try { const items = await applicationService.getApplications(); set({ items, loading: false, refreshing: false }); }
    catch (error) { set({ loading: false, refreshing: false, error: friendlyError(error, 'Unable to load applications.') }); }
  },
  create: async values => {
    if (get().demo) {
      const id = `demo-${Date.now()}`;
      const created: Application = { id, company: values.companyName, title: values.jobTitle, location: values.location || 'Location not set', mode: values.workMode === 'ONSITE' ? 'On-site' : `${values.workMode[0]}${values.workMode.slice(1).toLowerCase()}`, age: 'today', status: toDisplayStatus(values.status), rawStatus: values.status, priority: `${values.priority[0]}${values.priority.slice(1).toLowerCase()}` as Application['priority'], salary: values.salaryMin ? `${values.currency} ${values.salaryMin}${values.salaryMax ? `–${values.salaryMax}` : ''}` : undefined, initials: values.companyName[0].toUpperCase(), logoColor: '#5B5FEF', source: values.source, favorite: false, archived: false };
      set(state => ({ items: [created, ...state.items] })); return true;
    }
    try { const created = await applicationService.createApplication(values); set(state => ({ items: [created, ...state.items], error: null })); return true; }
    catch (error) { set({ error: friendlyError(error, 'Unable to create the application.') }); return false; }
  },
  update: async (id, values) => {
    if (get().demo) {
      set(state => ({ items: state.items.map(item => item.id === id ? { ...item, company: values.companyName, title: values.jobTitle, location: values.location || 'Location not set', mode: values.workMode === 'ONSITE' ? 'On-site' : `${values.workMode[0]}${values.workMode.slice(1).toLowerCase()}`, status: toDisplayStatus(values.status), rawStatus: values.status, priority: `${values.priority[0]}${values.priority.slice(1).toLowerCase()}` as Application['priority'], source: values.source } : item) }));
      return true;
    }
    try { const updated = await applicationService.updateApplication(id, values); set(state => ({ items: state.items.map(item => item.id === id ? updated : item), error: null })); return true; }
    catch (error) { set({ error: friendlyError(error, 'Unable to update the application.') }); return false; }
  },
  updateStatus: async (id, status) => {
    const previous = get().items;
    set({ items: previous.map(item => item.id === id ? { ...item, rawStatus: status, status: toDisplayStatus(status) } : item) });
    if (get().demo) return true;
    try { const updated = await applicationService.updateApplicationStatus(id, status); set(state => ({ items: state.items.map(item => item.id === id ? updated : item), error: null })); return true; }
    catch (error) { set({ items: previous, error: friendlyError(error, 'Status update failed. Your change was rolled back.') }); return false; }
  },
  toggleFavorite: async id => {
    const target = get().items.find(item => item.id === id); if (!target) return false;
    const next = !target.favorite; const previous = get().items;
    set({ items: previous.map(item => item.id === id ? { ...item, favorite: next } : item) });
    if (get().demo) return true;
    try { await applicationService.toggleFavorite(id, next); return true; } catch (error) { set({ items: previous, error: friendlyError(error) }); return false; }
  },
  archive: async id => {
    const previous = get().items; set({ items: previous.filter(item => item.id !== id) });
    if (get().demo) return true;
    try { await applicationService.archiveApplication(id); return true; } catch (error) { set({ items: previous, error: friendlyError(error) }); return false; }
  },
  remove: async id => {
    const previous = get().items; set({ items: previous.filter(item => item.id !== id) });
    if (get().demo) return true;
    try { await applicationService.deleteApplication(id); return true; } catch (error) { set({ items: previous, error: friendlyError(error) }); return false; }
  },
  duplicate: async id => {
    const source = get().items.find(item => item.id === id); if (!source) return false;
    if (get().demo) { set(state => ({ items: [{ ...source, id: `demo-${Date.now()}`, title: `${source.title} (copy)`, status: 'Saved', rawStatus: 'SAVED', age: 'today' }, ...state.items] })); return true; }
    try { const created = await applicationService.duplicateApplication(id); set(state => ({ items: [created, ...state.items] })); return true; } catch (error) { set({ error: friendlyError(error) }); return false; }
  },
  clear: () => set({ items: [], error: null, demo: false, loading: false, refreshing: false }),
}));
