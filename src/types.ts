export interface Comment {
  id: string;
  author: string;
  text: string;
  timestamp: string;
}

export type LeadStatus = 'Leads' | 'Not Interested' | 'DND' | 'Follow-Up' | 'Lead';

export interface Lead {
  id: string;
  providerName: string;
  specialty: string;
  city: string;
  state: string;
  phone: string;
  email: string;
  uploadedDate: string;
  uploadId: string;
  status: LeadStatus;
  agentAssigned: string | null;
  comments: Comment[];
  followUpDate: string | null;
  workedDate: string | null;
}

export interface UploadHistory {
  id: string;
  fileName: string;
  uploadDate: string;
  recordCount: number;
}

export interface User {
  username: string;
  name: string;
  role: 'Manager' | 'Employee';
  password?: string;
}

export interface AppState {
  leads: Lead[];
  uploads: UploadHistory[];
  agents: string[];
  currentUser: User | null;
}
