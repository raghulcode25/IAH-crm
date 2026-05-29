import React, { useState } from 'react';
import { motion } from 'motion/react';
import { 
  Lock, 
  User, 
  ShieldAlert, 
  Terminal, 
  Eye, 
  EyeOff, 
  CheckSquare, 
  Sparkles,
  ArrowRight
} from 'lucide-react';
import { User as UserType } from '../types';

interface LoginProps {
  users: UserType[];
  onLoginSuccess: (user: UserType) => void;
}

export default function Login({ users, onLoginSuccess }: LoginProps) {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [showPassword, setShowPassword] = useState(false);

  const handleFormSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const normUsername = username.trim().toLowerCase();
    const cleanPassword = password.trim();

    const matchedUser = users.find(u => u.username.toLowerCase() === normUsername);

    if (!matchedUser) {
      setError("Username not found in directory.");
      return;
    }

    if (matchedUser.password && matchedUser.password !== cleanPassword) {
      setError("Invalid password credentials.");
      return;
    }

    // Success
    onLoginSuccess(matchedUser);
  };

  const handleDemoLogin = (role: 'Manager' | 'Employee', demoUsername: string) => {
    const matched = users.find(u => u.username === demoUsername);
    if (matched) {
      onLoginSuccess(matched);
    } else {
      // Fallback
      onLoginSuccess({
        username: demoUsername,
        name: role === 'Manager' ? 'Admin Manager' : 'Employee Agent',
        role,
        password: role === 'Manager' ? 'admin' : 'agent'
      });
    }
  };

  return (
    <div className="min-h-screen bg-[#09090b] flex flex-col items-center justify-center p-4 relative overflow-hidden select-none">
      
      {/* Decorative ambient background flares */}
      <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-indigo-600/5 rounded-full blur-3xl pointer-events-none"></div>
      <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-emerald-500/5 rounded-full blur-3xl pointer-events-none"></div>

      <div className="w-full max-w-md z-10 space-y-6">
        
        {/* Brand visual header */}
        <div className="text-center space-y-2">
          <div className="inline-flex w-12 h-12 rounded-xl bg-indigo-600 items-center justify-center text-white text-base font-black tracking-widest shadow-xl shadow-indigo-600/10">
            IAH
          </div>
          <div>
            <h1 className="text-xl font-extrabold text-white tracking-wider uppercase font-sans">IAH CRM TOOl</h1>
            <p className="text-xs text-zinc-400 mt-1">Enterprise Provider CRM Outreach Platform</p>
          </div>
        </div>

        {/* Login credentials form main card */}
        <motion.div 
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
          className="bg-[#121214] border border-[#1f1f23] rounded-2xl shadow-2xl overflow-hidden p-6 space-y-5"
        >
          <div className="border-b border-[#1f1f23] pb-3 text-center">
            <h2 className="text-xs font-black uppercase text-zinc-300 tracking-widest">Sign In to Dashboard</h2>
          </div>

          {error && (
            <div className="bg-rose-950/45 border border-rose-500/30 text-rose-350 p-3 rounded-lg text-xs flex items-center gap-2.5">
              <ShieldAlert className="w-4 h-4 text-rose-450 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleFormSubmit} className="space-y-4">
            
            {/* Username */}
            <div className="space-y-1.5">
              <label className="block text-[10px] font-bold text-zinc-400 uppercase tracking-wider">Username</label>
              <div className="relative">
                <span className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none text-zinc-500">
                  <User className="w-3.5 h-3.5" />
                </span>
                <input
                  type="text"
                  required
                  autoFocus
                  placeholder="manager or employee"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  className="w-full bg-[#09090b] border border-[#1f1f23] rounded-lg py-2 pl-9 pr-3 text-xs text-white focus:outline-none focus:border-indigo-600 focus:ring-1 focus:ring-indigo-600/20 placeholder-zinc-650"
                />
              </div>
            </div>

            {/* Password */}
            <div className="space-y-1.5">
              <div className="flex justify-between items-center">
                <label className="block text-[10px] font-bold text-zinc-400 uppercase tracking-wider">Password</label>
              </div>
              <div className="relative">
                <span className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none text-zinc-500">
                  <Lock className="w-3.5 h-3.5" />
                </span>
                <input
                  type={showPassword ? "text" : "password"}
                  required
                  placeholder="Enter access password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full bg-[#09090b] border border-[#1f1f23] rounded-lg py-2 pl-9 pr-10 text-xs text-white focus:outline-none focus:border-indigo-600 focus:ring-1 focus:ring-indigo-600/20 placeholder-zinc-650"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute inset-y-0 right-0 pr-3 flex items-center text-zinc-500 hover:text-zinc-300 cursor-pointer"
                >
                  {showPassword ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              className="w-full bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs py-2.5 rounded-lg transition-all shadow-md shadow-indigo-600/15 flex items-center justify-center gap-1.5 cursor-pointer mt-2"
            >
              Authorize Credentials
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </form>

          {/* Quick simulation presets section: Absolute gold-standard helper */}
          <div className="border-t border-[#1f1f23] pt-4 space-y-3">
            <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest block text-center">
              Quick Testing Presets
            </span>
            
            <div className="grid grid-cols-2 gap-2 text-[10px]">
              
              <button
                onClick={() => handleDemoLogin('Manager', 'manager')}
                className="bg-[#161619] hover:bg-zinc-850 text-indigo-400 border border-indigo-500/10 hover:border-indigo-500/30 p-2.5 rounded-lg text-left space-y-1 transition-all cursor-pointer"
              >
                <div className="font-bold flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-indigo-400"></span>
                  Manager Access
                </div>
                <div className="text-[9px] text-zinc-500 font-mono">user: manager / admin</div>
              </button>

              <button
                onClick={() => handleDemoLogin('Employee', 'employee')}
                className="bg-[#161619] hover:bg-zinc-850 text-emerald-400 border border-emerald-500/10 hover:border-emerald-500/30 p-2.5 rounded-lg text-left space-y-1 transition-all cursor-pointer"
              >
                <div className="font-bold flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400"></span>
                  Employee Access
                </div>
                <div className="text-[9px] text-zinc-500 font-mono">user: employee / agent</div>
              </button>

            </div>
          </div>
        </motion.div>

        {/* Footer info line */}
        <div className="flex items-center gap-2 text-[10px] text-zinc-500 justify-center">
          <Terminal className="w-3.5 h-3.5" />
          <span>Local Persistence Protocol Secured</span>
        </div>

      </div>
    </div>
  );
}
