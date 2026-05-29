import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Users, 
  UserPlus, 
  Shield, 
  UserCheck, 
  Trash2, 
  CheckCircle2, 
  AlertTriangle,
  Lock,
  X,
  Eye,
  EyeOff,
  Pencil
} from 'lucide-react';
import { User } from '../types';

interface UserAdministrationProps {
  users: User[];
  currentUser: User;
  onAddUser: (user: User) => void;
  onDeleteUser: (username: string) => void;
  onUpdateUser: (oldUsername: string, updatedUser: User) => void;
}

export default function UserAdministration({
  users,
  currentUser,
  onAddUser,
  onDeleteUser,
  onUpdateUser,
}: UserAdministrationProps) {
  const [username, setUsername] = useState('');
  const [fullName, setFullName] = useState('');
  const [role, setRole] = useState<'Manager' | 'Employee'>('Employee');
  const [password, setPassword] = useState('');
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [visiblePasswords, setVisiblePasswords] = useState<Record<string, boolean>>({});

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setSuccessMsg(null);

    const normUsername = username.trim().toLowerCase();
    if (!normUsername) {
      setErrorMsg("Username is required.");
      return;
    }
    if (!fullName.trim()) {
      setErrorMsg("Full name is required.");
      return;
    }
    if (!password.trim()) {
      setErrorMsg("Password is required.");
      return;
    }

    if (editingUser) {
      // If username has changed, make sure new username isn't already taken
      if (editingUser.username.toLowerCase() !== normUsername && 
          users.some(u => u.username.toLowerCase() === normUsername)) {
        setErrorMsg(`A user with username "${normUsername}" already exists.`);
        return;
      }

      const updatedUser: User = {
        username: normUsername,
        name: fullName.trim(),
        role,
        password: password.trim()
      };

      onUpdateUser(editingUser.username, updatedUser);
      setSuccessMsg(`Account for "${fullName.trim()}" successfully updated!`);
      handleCancelEdit();
    } else {
      // Check if user already exists
      if (users.some(u => u.username.toLowerCase() === normUsername)) {
        setErrorMsg(`A user with username "${normUsername}" already exists.`);
        return;
      }

      const newUser: User = {
        username: normUsername,
        name: fullName.trim(),
        role,
        password: password.trim()
      };

      onAddUser(newUser);
      setSuccessMsg(`Account for "${fullName.trim()}" successfully created as ${role}!`);
      
      // Reset form
      setUsername('');
      setFullName('');
      setPassword('');
      setRole('Employee');
    }

    setTimeout(() => {
      setSuccessMsg(null);
    }, 4000);
  };

  const handleStartEdit = (user: User) => {
    setEditingUser(user);
    setUsername(user.username);
    setFullName(user.name);
    setRole(user.role);
    setPassword(user.password || '');
    setErrorMsg(null);
    setSuccessMsg(null);
  };

  const handleCancelEdit = () => {
    setEditingUser(null);
    setUsername('');
    setFullName('');
    setPassword('');
    setRole('Employee');
    setErrorMsg(null);
  };

  const togglePasswordVisibility = (username: string) => {
    setVisiblePasswords(prev => ({
      ...prev,
      [username]: !prev[username]
    }));
  };

  return (
    <div className="flex flex-col h-full bg-[#09090b] text-zinc-300 p-6 space-y-6">
      
      {/* Title block */}
      <div className="flex justify-between items-center bg-[#121214] p-5 rounded-xl border border-[#1f1f23] shadow-lg">
        <div>
          <h2 className="text-lg font-bold text-white flex items-center gap-2.5">
            <Users className="text-indigo-400 w-5 h-5" />
            Portal Access & Directory
          </h2>
          <p className="text-xs text-zinc-400 mt-1">
            As a Manager, you can register new employees, grant Manager permissions, see employee passwords, and edit active profiles.
          </p>
        </div>
        <div className="bg-indigo-600/10 border border-indigo-500/20 px-3 py-1.5 rounded-lg flex items-center gap-2">
          <Shield className="w-4 h-4 text-indigo-400" />
          <span className="text-[10px] uppercase font-black tracking-wider text-indigo-300">Manager Access active</span>
        </div>
      </div>

      {/* Messages */}
      <AnimatePresence>
        {successMsg && (
          <motion.div 
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="bg-emerald-950/40 border border-emerald-500/30 text-emerald-300 p-4 rounded-lg flex items-start gap-3 text-xs"
          >
            <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
            <span>{successMsg}</span>
          </motion.div>
        )}

        {errorMsg && (
          <motion.div 
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="bg-rose-950/40 border border-rose-500/30 text-rose-300 p-4 rounded-lg flex items-start gap-3 text-xs"
          >
            <AlertTriangle className="w-4 h-4 text-rose-450 shrink-0 mt-0.5" />
            <span>{errorMsg}</span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Content grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        
        {/* Left column (Form): col-span-5 */}
        <div className="lg:col-span-5 bg-[#121214] border border-[#1f1f23] rounded-xl shadow-lg overflow-hidden">
          <div className="px-5 py-4 bg-[#161619] border-b border-[#1f1f23] flex items-center justify-between">
            <div className="flex items-center gap-2">
              {editingUser ? (
                <Pencil className="w-4 h-4 text-emerald-400 animate-pulse" />
              ) : (
                <UserPlus className="w-4 h-4 text-indigo-400" />
              )}
              <h3 className="font-bold text-white text-xs uppercase tracking-wider">
                {editingUser ? `Edit Account: @${editingUser.username}` : 'Register Portal Account'}
              </h3>
            </div>
            {editingUser && (
              <button 
                type="button" 
                onClick={handleCancelEdit}
                className="text-zinc-400 hover:text-white text-[10px] uppercase font-bold border border-zinc-700 px-2 py-0.5 rounded cursor-pointer"
              >
                Cancel Edit
              </button>
            )}
          </div>

          <form onSubmit={handleSubmit} className="p-5 space-y-4">
            <div>
              <label className="block text-[10px] font-black text-zinc-400 uppercase tracking-widest mb-1.5">Username (Lowercase login)</label>
              <div className="relative">
                <span className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none text-zinc-500 text-xs font-mono">@</span>
                <input
                  type="text"
                  required
                  placeholder="e.g. janesmith"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  className="w-full bg-[#09090b] border border-[#1f1f23] rounded-lg py-2 pl-7 pr-3 focus:outline-none focus:border-indigo-600 focus:ring-1 focus:ring-indigo-600/20 text-xs text-white placeholder-zinc-650"
                />
              </div>
            </div>

            <div>
              <label className="block text-[10px] font-black text-zinc-400 uppercase tracking-widest mb-1.5">Employee Full Name</label>
              <input
                type="text"
                required
                placeholder="e.g. Dr. Jane Smith"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                className="w-full bg-[#09090b] border border-[#1f1f23] rounded-lg py-2 px-3 focus:outline-none focus:border-indigo-600 focus:ring-1 focus:ring-indigo-600/20 text-xs text-white placeholder-zinc-650"
              />
            </div>

            <div>
              <label className="block text-[10px] font-black text-zinc-400 uppercase tracking-widest mb-1.5">Account Role</label>
              <select
                value={role}
                onChange={(e) => setRole(e.target.value as 'Manager' | 'Employee')}
                className="w-full bg-[#09090b] border border-[#1f1f23] rounded-lg py-2 px-3 focus:outline-none focus:border-indigo-600 focus:ring-1 focus:ring-indigo-600/20 text-xs text-white cursor-pointer"
              >
                <option value="Employee">Employee (Field Representative)</option>
                <option value="Manager">Manager (Full Database & Allocation Access)</option>
              </select>
            </div>

            <div>
              <label className="block text-[10px] font-black text-zinc-400 uppercase tracking-widest mb-1.5 font-sans">Login Password</label>
              <div className="relative">
                <span className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none text-zinc-500">
                  <Lock className="w-3.5 h-3.5" />
                </span>
                <input
                  type="text" // Shown clearly during edit/view mode so managers can verify effortlessly
                  required
                  placeholder="Credentials password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full bg-[#09090b] border border-[#1f1f23] rounded-lg py-2 pl-9 pr-3 focus:outline-none focus:border-indigo-600 focus:ring-1 focus:ring-indigo-600/20 text-xs text-white placeholder-zinc-650 font-mono"
                />
              </div>
            </div>

            <div className="flex gap-2">
              <button
                type="submit"
                className={`flex-1 font-bold text-xs py-2.5 rounded-lg shadow-md transition-all active:scale-95 cursor-pointer mt-2 ${
                  editingUser 
                    ? 'bg-emerald-600 hover:bg-emerald-500 text-white shadow-emerald-600/10' 
                    : 'bg-indigo-600 hover:bg-indigo-500 text-white shadow-indigo-600/15'
                }`}
              >
                {editingUser ? 'Save Profile Changes' : 'Verify & Provision Account'}
              </button>
              
              {editingUser && (
                <button
                  type="button"
                  onClick={handleCancelEdit}
                  className="mt-2 bg-zinc-800 hover:bg-zinc-750 text-zinc-300 font-bold text-xs py-2.5 px-4 rounded-lg border border-zinc-700 active:scale-95 cursor-pointer transition-all"
                >
                  Cancel
                </button>
              )}
            </div>
          </form>
        </div>

        {/* Right column (Directory list): col-span-7 */}
        <div className="lg:col-span-7 bg-[#121214] border border-[#1f1f23] rounded-xl shadow-lg overflow-hidden">
          <div className="px-5 py-4 bg-[#161619] border-b border-[#1f1f23] flex justify-between items-center">
            <div className="flex items-center gap-2">
              <UserCheck className="w-4 h-4 text-emerald-400" />
              <h3 className="font-bold text-white text-xs uppercase tracking-wider">Security Access Directory</h3>
            </div>
            <span className="text-[10px] bg-[#09090b] text-zinc-400 border border-[#1f1f23] px-2 py-0.5 rounded-md font-mono">
              Total {users.length} Users
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-[#1f1f23] text-left text-xs text-zinc-300 border-collapse">
              <thead className="bg-[#09090b] text-[9px] text-zinc-400 font-bold uppercase tracking-widest">
                <tr>
                  <th scope="col" className="px-4 py-3">Representative Directory</th>
                  <th scope="col" className="px-4 py-3">Access Level</th>
                  <th scope="col" className="px-4 py-3">Login Username</th>
                  <th scope="col" className="px-4 py-3">Login Password</th>
                  <th scope="col" className="px-4 py-3 text-right">Scope</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#1f1f23]/50 bg-[#121214]/40">
                {users.map((dirUser) => {
                  const isSelf = dirUser.username === currentUser.username;
                  const isProtected = dirUser.username === 'manager';
                  const isRevealed = !!visiblePasswords[dirUser.username];

                  return (
                    <tr key={dirUser.username} className={`hover:bg-[#161619]/50 transition-colors ${
                      editingUser?.username === dirUser.username ? 'bg-emerald-500/5 border-l-2 border-l-emerald-500' : ''
                    }`}>
                      <td className="px-4 py-3">
                        <div className="font-bold text-white flex items-center gap-1.5">
                          {dirUser.name}
                          {isSelf && (
                            <span className="bg-indigo-600/10 text-indigo-400 text-[8px] font-bold uppercase px-1 rounded border border-indigo-400/20">
                              You
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded border ${
                          dirUser.role === 'Manager'
                            ? 'bg-indigo-500/10 text-indigo-400 border-indigo-500/20'
                            : 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                        }`}>
                          {dirUser.role}
                        </span>
                      </td>
                      <td className="px-4 py-3 font-mono text-zinc-400 text-[11px]">
                        @{dirUser.username}
                      </td>
                      <td className="px-4 py-3 font-mono text-zinc-300 text-[11px]">
                        <div className="flex items-center gap-1.5">
                          <span className="font-semibold">{isRevealed ? (dirUser.password || 'none') : '••••••••'}</span>
                          <button
                            type="button"
                            onClick={() => togglePasswordVisibility(dirUser.username)}
                            className="text-zinc-500 hover:text-white p-0.5 rounded focus:outline-none transition-colors cursor-pointer"
                            title={isRevealed ? "Hide Password" : "Show Password"}
                          >
                            {isRevealed ? (
                              <EyeOff className="w-3 h-3 text-zinc-400" />
                            ) : (
                              <Eye className="w-3 h-3 text-zinc-500" />
                            )}
                          </button>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          {/* Edit button */}
                          <button
                            onClick={() => handleStartEdit(dirUser)}
                            className="text-zinc-500 hover:text-emerald-400 p-1 rounded hover:bg-zinc-800 transition-colors cursor-pointer"
                            title="Edit Profile"
                          >
                            <Pencil className="w-3.5 h-3.5" />
                          </button>

                          <div className="flex items-center gap-1.5 text-zinc-500 text-[10px] pr-1 select-none" title="Deletions not permitted for managers">
                            <Lock className="w-3 w-3 text-zinc-600 shrink-0" />
                            <span>Guarded</span>
                          </div>
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>

      </div>

    </div>
  );
}
