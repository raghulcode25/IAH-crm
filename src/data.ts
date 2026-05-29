import { Lead, UploadHistory, User } from './types';

export const INITIAL_UPLOADS: UploadHistory[] = [];

export const INITIAL_LEADS: Lead[] = [];

export const INITIAL_AGENTS: string[] = [];

export const DEFAULT_USERS: User[] = [
  { username: 'manager', name: 'Admin Manager', role: 'Manager', password: 'admin' },
  { username: 'employee', name: 'Employee Agent', role: 'Employee', password: 'agent' }
];

