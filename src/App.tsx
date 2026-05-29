import { useState, useEffect } from 'react';
import { 
  Database, 
  UserSquare2, 
  Workflow, 
  ShieldCheck, 
  FilePieChart, 
  Terminal, 
  Timer,
  Settings,
  Users,
  LogOut,
  UserCheck
} from 'lucide-react';

import DatabaseMaintenance from './components/DatabaseMaintenance';
import WorkAllocation from './components/WorkAllocation';
import AgentQueue from './components/AgentQueue';
import Reports from './components/Reports';
import UserAdministration from './components/UserAdministration';
import Login from './components/Login';

import { INITIAL_LEADS, INITIAL_UPLOADS, DEFAULT_USERS } from './data';
import { Lead, UploadHistory, LeadStatus, Comment, User } from './types';

import { 
  collection, 
  onSnapshot, 
  doc, 
  setDoc, 
  deleteDoc, 
  writeBatch, 
  getDocs 
} from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from './firebase';

export default function App() {
  // Session Authentication State
  const [currentUser, setCurrentUser] = useState<User | null>(() => {
    const savedUser = localStorage.getItem('lead_portal_current_user');
    if (savedUser) {
      try {
        const parsed = JSON.parse(savedUser);
        if (['alice', 'bob', 'charlie', 'david'].includes(parsed.username.toLowerCase())) {
          localStorage.removeItem('lead_portal_current_user');
          return null;
        }
        return parsed;
      } catch (e) {
        return null;
      }
    }
    return savedUser ? JSON.parse(savedUser) : null;
  });

  const [users, setUsers] = useState<User[]>(() => {
    const saved = localStorage.getItem('lead_portal_users');
    return saved ? JSON.parse(saved) : DEFAULT_USERS;
  });
  const [activeScreen, setActiveScreen] = useState<'database' | 'allocation' | 'agent-queue' | 'reports' | 'users'>('database');
  const [leads, setLeads] = useState<Lead[]>(() => {
    const saved = localStorage.getItem('lead_portal_leads');
    return saved ? JSON.parse(saved) : [];
  });
  const [uploads, setUploads] = useState<UploadHistory[]>(() => {
    const saved = localStorage.getItem('lead_portal_uploads');
    return saved ? JSON.parse(saved) : [];
  });
  const [activeAgent, setActiveAgent] = useState<string>('');
  const [currentTime, setCurrentTime] = useState<string>('');
  const [isSeeded, setIsSeeded] = useState(false);

  // Derived list of assignable agents (Employees)
  const agents = users.filter(u => u.role === 'Employee').map(u => u.name);

  // Live timer for UTC clock tracker
  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      const year = now.getUTCFullYear();
      const month = String(now.getUTCMonth() + 1).padStart(2, '0');
      const day = String(now.getUTCDate()).padStart(2, '0');
      const hours = String(now.getUTCHours()).padStart(2, '0');
      const minutes = String(now.getUTCMinutes()).padStart(2, '0');
      const seconds = String(now.getUTCSeconds()).padStart(2, '0');
      setCurrentTime(`${year}-${month}-${day} ${hours}:${minutes}:${seconds}`);
    };
    updateTime();
    const timer = setInterval(updateTime, 1000);
    return () => clearInterval(timer);
  }, []);

  // Sync state from Firestore in real-time & seed collections if empty
  useEffect(() => {
    const seedDatabaseIfEmpty = async () => {
      try {
        // Seed users
        const usersSnap = await getDocs(collection(db, 'users'));
        if (usersSnap.empty) {
          const savedUsersStr = localStorage.getItem('lead_portal_users');
          const seedUsers: User[] = savedUsersStr ? JSON.parse(savedUsersStr) : DEFAULT_USERS;
          for (const u of seedUsers) {
            await setDoc(doc(db, 'users', u.username), u);
          }
        }

        // Seed leads
        const leadsSnap = await getDocs(collection(db, 'leads'));
        if (leadsSnap.empty) {
          const savedLeadsStr = localStorage.getItem('lead_portal_leads');
          const seedLeads: Lead[] = savedLeadsStr ? JSON.parse(savedLeadsStr) : INITIAL_LEADS;
          if (seedLeads.length > 0) {
            const batch = writeBatch(db);
            seedLeads.forEach((l) => {
              const docRef = doc(db, 'leads', l.id);
              batch.set(docRef, l);
            });
            await batch.commit();
          }
        }

        // Seed uploads
        const uploadsSnap = await getDocs(collection(db, 'uploads'));
        if (uploadsSnap.empty) {
          const savedUploadsStr = localStorage.getItem('lead_portal_uploads');
          const seedUploads: UploadHistory[] = savedUploadsStr ? JSON.parse(savedUploadsStr) : INITIAL_UPLOADS;
          if (seedUploads.length > 0) {
            const batch = writeBatch(db);
            seedUploads.forEach((u) => {
              const docRef = doc(db, 'uploads', u.id);
              batch.set(docRef, u);
            });
            await batch.commit();
          }
        }
      } catch (e) {
        console.error("Database seeding/check error:", e);
      } finally {
        setIsSeeded(true);
      }
    };

    seedDatabaseIfEmpty();
  }, []);

  // Sync changes back to localStorage to support cold boots and refresh survival
  useEffect(() => {
    if (isSeeded) {
      localStorage.setItem('lead_portal_users', JSON.stringify(users));
    }
  }, [users, isSeeded]);

  useEffect(() => {
    if (isSeeded) {
      localStorage.setItem('lead_portal_leads', JSON.stringify(leads));
    }
  }, [leads, isSeeded]);

  useEffect(() => {
    if (isSeeded) {
      localStorage.setItem('lead_portal_uploads', JSON.stringify(uploads));
    }
  }, [uploads, isSeeded]);

  // Real-time listener for users
  useEffect(() => {
    const unsubscribe = onSnapshot(collection(db, 'users'), (snapshot) => {
      const list: User[] = [];
      snapshot.forEach((snapDoc) => {
        list.push(snapDoc.data() as User);
      });
      if (list.length > 0) {
        setUsers(list);
      }
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, 'users');
    });
    return () => unsubscribe();
  }, []);

  // Real-time listener for leads
  useEffect(() => {
    const unsubscribe = onSnapshot(collection(db, 'leads'), (snapshot) => {
      const list: Lead[] = [];
      snapshot.forEach((snapDoc) => {
        list.push(snapDoc.data() as Lead);
      });
      // Sort leads by id descending
      const sorted = [...list].sort((a, b) => b.id.localeCompare(a.id));
      setLeads(sorted);
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, 'leads');
    });
    return () => unsubscribe();
  }, []);

  // Real-time listener for uploads
  useEffect(() => {
    const unsubscribe = onSnapshot(collection(db, 'uploads'), (snapshot) => {
      const list: UploadHistory[] = [];
      snapshot.forEach((snapDoc) => {
        list.push(snapDoc.data() as UploadHistory);
      });
      // Sort uploads
      const sorted = [...list].sort((a, b) => b.id.localeCompare(a.id));
      setUploads(sorted);
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, 'uploads');
    });
    return () => unsubscribe();
  }, []);

  // Sync activeAgent and screen when login session changes
  useEffect(() => {
    if (currentUser) {
      if (currentUser.role === 'Employee') {
        setActiveAgent(currentUser.name);
        setActiveScreen('agent-queue');
      } else {
        setActiveScreen('database');
        const firstEmployee = users.find(u => u.role === 'Employee')?.name || '';
        setActiveAgent(firstEmployee);
      }
    }
  }, [currentUser, users]);

  // Persists current user session
  const handleLoginSuccess = (user: User) => {
    localStorage.setItem('lead_portal_current_user', JSON.stringify(user));
    setCurrentUser(user);
  };

  const handleLogout = () => {
    localStorage.removeItem('lead_portal_current_user');
    setCurrentUser(null);
  };

  // Add / Delete users logic (Persisted in Firestore)
  const handleAddUser = async (newUser: User) => {
    try {
      await setDoc(doc(db, 'users', newUser.username), newUser);
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, `users/${newUser.username}`);
    }
  };

  const handleUpdateUser = async (oldUsername: string, updatedUser: User) => {
    try {
      if (oldUsername !== updatedUser.username) {
        await deleteDoc(doc(db, 'users', oldUsername));
      }
      await setDoc(doc(db, 'users', updatedUser.username), updatedUser);
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, `users/${updatedUser.username}`);
    }
  };

  const handleDeleteUser = async (usernameToDelete: string) => {
    try {
      await deleteDoc(doc(db, 'users', usernameToDelete));
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, `users/${usernameToDelete}`);
    }
  };

  // HANDLERS FOR DATABASE ACTIONS
  const handleAddManualLead = async (newLeadData: Omit<Lead, 'id' | 'uploadedDate' | 'uploadId' | 'status' | 'agentAssigned' | 'comments' | 'followUpDate' | 'workedDate'>) => {
    const id = `lead-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
    const freshLead: Lead = {
      ...newLeadData,
      id,
      uploadedDate: new Date().toISOString().split('T')[0],
      uploadId: 'manual',
      status: 'Leads',
      agentAssigned: null,
      comments: [],
      followUpDate: null,
      workedDate: null
    };

    try {
      await setDoc(doc(db, 'leads', id), freshLead);
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, `leads/${id}`);
    }
  };

  const handleEditLead = async (updatedLead: Lead) => {
    try {
      await setDoc(doc(db, 'leads', updatedLead.id), updatedLead);
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, `leads/${updatedLead.id}`);
    }
  };

  const handleDeleteLead = async (leadId: string) => {
    try {
      await deleteDoc(doc(db, 'leads', leadId));
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, `leads/${leadId}`);
    }
  };

  const handleUploadFile = async (
    fileName: string, 
    parsedRawLeads: Omit<Lead, 'id' | 'uploadedDate' | 'uploadId' | 'status' | 'agentAssigned' | 'comments' | 'followUpDate' | 'workedDate'>[]
  ) => {
    const uploadId = `upload-${Date.now()}`;
    const currentDateStr = new Date().toISOString().split('T')[0];

    const newUploadHistory: UploadHistory = {
      id: uploadId,
      fileName,
      uploadDate: currentDateStr,
      recordCount: parsedRawLeads.length,
    };

    const newLeadsMapped: Lead[] = parsedRawLeads.map((item, idx) => ({
      ...item,
      id: `lead-file-${Date.now()}-${idx}`,
      uploadedDate: currentDateStr,
      uploadId: uploadId,
      status: 'Leads',
      agentAssigned: null,
      comments: [],
      followUpDate: null,
      workedDate: null,
    }));

    try {
      const batch = writeBatch(db);
      // Write upload history document
      batch.set(doc(db, 'uploads', uploadId), newUploadHistory);
      // Write lead documents
      newLeadsMapped.forEach(lead => {
        batch.set(doc(db, 'leads', lead.id), lead);
      });
      await batch.commit();
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, `bulk-upload`);
    }
  };

  // HANDLER FOR LEAD ALLOCATION (Manager)
  const handleAllocateLeads = async (leadIds: string[], agentName: string | null) => {
    try {
      const batch = writeBatch(db);
      leadIds.forEach(id => {
        const leadToUpdate = leads.find(l => l.id === id);
        if (leadToUpdate) {
          batch.set(doc(db, 'leads', id), {
            ...leadToUpdate,
            agentAssigned: agentName
          });
        }
      });
      await batch.commit();
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, `bulk-allocation`);
    }
  };

  // HANDLER FOR AGENT ACTIONS (Agent Screen)
  const handleAgentUpdateLeadStatus = async (
    leadId: string, 
    status: LeadStatus, 
    commentText: string | null, 
    followUpDate: string | null
  ) => {
    const currentDateStr = new Date().toISOString().split('T')[0];
    const authorName = currentUser?.name || 'Active Agent';

    const targetLead = leads.find(l => l.id === leadId);
    if (!targetLead) return;

    let updatedComments = [...targetLead.comments];
    if (commentText) {
      const freshComment: Comment = {
        id: `cmt-${Date.now()}`,
        author: authorName,
        text: commentText,
        timestamp: new Date().toISOString().slice(0, 16).replace('T', ' ')
      };
      updatedComments.push(freshComment);
    }

    const nextLead: Lead = {
      ...targetLead,
      status,
      comments: updatedComments,
      followUpDate: status === 'Follow-Up' ? followUpDate : null,
      workedDate: currentDateStr,
    };

    try {
      await setDoc(doc(db, 'leads', leadId), nextLead);
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, `leads/${leadId}`);
    }
  };

  // Render Login state if not authenticated
  if (!currentUser) {
    return <Login users={users} onLoginSuccess={handleLoginSuccess} />;
  }

  const isManager = currentUser.role === 'Manager';

  return (
    <div className="flex h-screen bg-[#09090b] font-sans text-zinc-200 overflow-hidden">
      
      {/* Sidebar Navigation */}
      <aside className="w-64 bg-[#121214] border-r border-[#1f1f23] flex flex-col shrink-0 select-none">
        
        {/* Brand Header */}
        <div className="p-5 border-b border-[#1f1f23] flex items-center gap-3 bg-[#161619]">
          <div className="w-8 h-8 rounded-lg bg-indigo-600 flex items-center justify-center text-white font-black tracking-widest shadow-md shadow-indigo-600/20">
            IAH
          </div>
          <div>
            <h1 className="font-extrabold text-xs text-white tracking-wider uppercase">IAH CRM TOOl</h1>
            <span className="text-[10px] text-indigo-400 font-mono font-medium">Operations System</span>
          </div>
        </div>

        {/* Navigation Sidebar List (Filtered by Role Permissions) */}
        <nav className="flex-1 p-4 space-y-1.5 overflow-y-auto focus:outline-none">
          <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest block px-3 mb-2">Systems modules</span>
          
          {isManager && (
            <>
              {/* Manager only links */}
              <button
                onClick={() => setActiveScreen('database')}
                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-xs font-semibold tracking-wide transition-all duration-150 border ${
                  activeScreen === 'database' 
                    ? 'bg-indigo-600/10 text-indigo-400 border-indigo-500/30 shadow-md shadow-indigo-500/5' 
                    : 'text-zinc-400 border-transparent hover:text-zinc-200 hover:bg-zinc-800/40'
                }`}
              >
                <Database className="w-4 h-4 shrink-0" />
                Database Maintenance
              </button>

              <button
                onClick={() => setActiveScreen('allocation')}
                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-xs font-semibold tracking-wide transition-all duration-150 border ${
                  activeScreen === 'allocation' 
                    ? 'bg-violet-500/10 text-violet-400 border-violet-500/30 shadow-md shadow-violet-500/5' 
                    : 'text-zinc-400 border-transparent hover:text-zinc-200 hover:bg-zinc-800/40'
                }`}
              >
                <Workflow className="w-4 h-4 shrink-0" />
                Work Allocation
              </button>

              <button
                onClick={() => setActiveScreen('reports')}
                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-xs font-semibold tracking-wide transition-all duration-150 border ${
                  activeScreen === 'reports' 
                    ? 'bg-rose-500/10 text-rose-400 border-rose-500/30 shadow-md shadow-rose-500/5' 
                    : 'text-zinc-400 border-transparent hover:text-zinc-200 hover:bg-zinc-800/40'
                }`}
              >
                <FilePieChart className="w-4 h-4 shrink-0" />
                Reports Access
              </button>

              <button
                onClick={() => setActiveScreen('users')}
                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-xs font-semibold tracking-wide transition-all duration-150 border ${
                  activeScreen === 'users' 
                    ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30 shadow-md shadow-emerald-500/5' 
                    : 'text-zinc-400 border-transparent hover:text-zinc-200 hover:bg-zinc-800/40'
                }`}
              >
                <Users className="w-4 h-4 shrink-0" />
                User Administration
              </button>
            </>
          )}

          {/* Employee Access Queue - Available for everyone (Simulated for manager, mandatory for employee) */}
          <button
            onClick={() => setActiveScreen('agent-queue')}
            className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-xs font-semibold tracking-wide transition-all duration-150 border ${
              activeScreen === 'agent-queue' 
                ? 'bg-sky-500/10 text-sky-400 border-sky-500/30 shadow-md shadow-sky-500/5' 
                : 'text-zinc-400 border-transparent hover:text-zinc-200 hover:bg-zinc-800/40'
            }`}
          >
            <UserSquare2 className="w-4 h-4 shrink-0" />
            Agent Work Queue
            {leads.filter(l => l.agentAssigned === activeAgent && (l.status === 'Leads' || l.status === 'Follow-Up' || l.status === 'Lead')).length > 0 && (
              <span className="ml-auto bg-zinc-950 text-sky-400 border border-sky-500/30 text-[9px] font-bold px-1.5 py-0.5 rounded-full">
                {leads.filter(l => l.agentAssigned === activeAgent && (l.status === 'Leads' || l.status === 'Follow-Up' || l.status === 'Lead')).length}
              </span>
            )}
          </button>
        </nav>

        {/* User Session Profile & Tracker Indicator */}
        <div className="border-t border-[#1f1f23] bg-[#161619] p-4 space-y-3.5 select-none shrink-0 text-xs">
          
          {/* Active Profile block */}
          <div className="bg-[#09090b] border border-[#1f1f23] p-3 rounded-xl space-y-2">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-zinc-850 flex items-center justify-center border border-[#1f1f23]">
                <UserCheck className={`w-4 h-4 ${isManager ? 'text-indigo-400' : 'text-emerald-400'}`} />
              </div>
              <div className="min-w-0 flex-1">
                <span className="block text-white font-bold leading-tight truncate" title={currentUser.name}>
                  {currentUser.name}
                </span>
                <span className="block text-[10px] text-zinc-500 font-mono truncate">
                  @{currentUser.username}
                </span>
              </div>
            </div>
            
            <div className="flex justify-between items-center text-[10px] border-t border-[#1f1f23]/65 pt-2 mt-1">
              <span className={`font-semibold uppercase tracking-wider ${isManager ? 'text-indigo-400' : 'text-emerald-400'}`}>
                {currentUser.role}
              </span>
              <button 
                onClick={handleLogout}
                className="text-zinc-550 hover:text-rose-400 transition-colors flex items-center gap-1.5 cursor-pointer font-bold uppercase tracking-wider"
              >
                <LogOut className="w-3.5 h-3.5" />
                Logout
              </button>
            </div>
          </div>

          {/* Clock Tracker */}
          <div className="space-y-1">
            <div className="flex items-center gap-2 text-[10px] text-zinc-400">
              <Timer className="w-3.5 h-3.5 text-zinc-500 shrink-0" />
              <span>UTC Clock Tracker</span>
            </div>
            <div className="p-2.5 bg-[#09090b] border border-[#1f1f23] rounded-lg text-center text-zinc-300 text-[10px] font-mono tracking-wider">
              {currentTime || '2026-05-29 07:32:55'}
            </div>
          </div>

        </div>

      </aside>

      {/* Main Workspace Page Canvas */}
      <main className="flex-1 flex flex-col h-full overflow-hidden bg-[#09090b]">
        
        {/* Workspace Portal Header */}
        <header className="h-16 border-b border-[#1f1f23] bg-[#121214] flex items-center justify-between px-6 shrink-0 select-none">
          <div className="flex items-center gap-3">
            <Terminal className="text-zinc-500 w-4 h-4" />
            <h2 className="text-xs font-black uppercase text-zinc-400 tracking-widest font-mono">
              Workspace Platform /{' '}
              <span className="text-white">
                {activeScreen === 'database' ? 'Database Maintenance' :
                 activeScreen === 'allocation' ? 'Manager Work Allocation' :
                 activeScreen === 'agent-queue' ? 'Agent Access Console' :
                 activeScreen === 'users' ? 'User Administration' :
                 'Reports & Auditing'}
              </span>
            </h2>
          </div>

          <div className="hidden sm:flex items-center gap-4 text-xs">
            <div className="text-[10px] bg-zinc-900 text-zinc-400 border border-[#1f1f23] rounded px-2.5 py-1 flex items-center gap-1.5">
              <span>Environment ID:</span>
              <span className="font-mono text-zinc-200">c5235557</span>
            </div>

            <div className="flex items-center gap-2 text-[11px] text-indigo-400">
              <Settings className="w-3.5 h-3.5 text-indigo-400 animate-spin-slow" />
              <span>Full-Stack Simulation Mode</span>
            </div>
          </div>
        </header>

        {/* Dashboard Frame Content Area */}
        <div className="flex-1 overflow-y-auto bg-[#09090b]">
          
          {activeScreen === 'database' && isManager && (
            <DatabaseMaintenance 
              leads={leads}
              uploads={uploads}
              agents={agents}
              onAddLead={handleAddManualLead}
              onEditLead={handleEditLead}
              onDeleteLead={handleDeleteLead}
              onUploadFile={handleUploadFile}
            />
          )}

          {activeScreen === 'allocation' && isManager && (
            <WorkAllocation 
              leads={leads}
              agents={agents}
              onAllocateLeads={handleAllocateLeads}
            />
          )}

          {activeScreen === 'agent-queue' && (
            <AgentQueue 
              leads={leads}
              // If employee, they can only switch or view themselves!
              agents={isManager ? agents : [currentUser.name]}
              activeAgent={activeAgent}
              onChangeAgent={isManager ? setActiveAgent : () => {}}
              onUpdateLeadStatus={handleAgentUpdateLeadStatus}
            />
          )}

          {activeScreen === 'reports' && isManager && (
            <Reports 
              leads={leads}
              users={users}
            />
          )}

          {activeScreen === 'users' && isManager && (
            <UserAdministration 
              users={users}
              currentUser={currentUser}
              onAddUser={handleAddUser}
              onDeleteUser={handleDeleteUser}
              onUpdateUser={handleUpdateUser}
            />
          )}

        </div>

      </main>

    </div>
  );
}
