import { useState } from 'react';
import { motion } from 'motion/react';
import { 
  Users, 
  UserPlus, 
  Funnel, 
  Filter, 
  CheckSquare, 
  Square,
  TrendingUp, 
  Calendar,
  Activity,
  Award,
  ChevronRight,
  ClipboardList
} from 'lucide-react';
import { Lead } from '../types';

interface WorkAllocationProps {
  leads: Lead[];
  agents: string[];
  onAllocateLeads: (leadIds: string[], agentName: string | null) => void;
}

export default function WorkAllocation({
  leads,
  agents,
  onAllocateLeads,
}: WorkAllocationProps) {
  // FILTER STATES FOR WORK ALLOCATION CONSOLE
  const [allocFilterUploadDate, setAllocFilterUploadDate] = useState('');
  const [allocFilterSpecialty, setAllocFilterSpecialty] = useState('');
  const [allocFilterCity, setAllocFilterCity] = useState('');
  const [allocFilterState, setAllocFilterState] = useState('');
  const [allocFilterProvider, setAllocFilterProvider] = useState('');
  
  // TRACKER STATES (Agent Activity tracking)
  const [trackFilterSpecialty, setTrackFilterSpecialty] = useState('');
  const [trackFilterCity, setTrackFilterCity] = useState('');
  const [trackFilterState, setTrackFilterState] = useState('');
  const [trackFilterWorkedDate, setTrackFilterWorkedDate] = useState('');
  const [trackSelectedAgent, setTrackSelectedAgent] = useState<'all' | string>('all');

  // Selected lead IDs for bulk allocation
  const [selectedLeadIds, setSelectedLeadIds] = useState<string[]>([]);
  const [assignAgentTarget, setAssignAgentTarget] = useState('');
  const [bulkFilterAssignTarget, setBulkFilterAssignTarget] = useState('');

  // Active Leads for Work Allocation (populated ONLY from active leads: status must be active!)
  const activeLeads = leads.filter(l => l.status === 'Leads' || l.status === 'Follow-Up' || l.status === 'Lead');

  // Worked Leads for Manager Activity Tracker (leads that are assigned and have been worked/have comments or status change)
  // We can treat any lead with status: 'Follow-Up', 'Lead', 'Not Interested', 'DND' OR has comments/workedDate as a "worked" file.
  const workedLeads = leads.filter(l => l.workedDate !== null || l.comments.length > 0 || l.status !== 'Leads');

  // UNIQUE FILTER OPTION GENERATIONS
  const specialties = Array.from(new Set(activeLeads.map(l => l.specialty).filter(Boolean)));
  const cities = Array.from(new Set(activeLeads.map(l => l.city).filter(Boolean)));
  const states = Array.from(new Set(activeLeads.map(l => l.state).filter(Boolean)));
  const uploadDates = Array.from(new Set(activeLeads.map(l => l.uploadedDate).filter(Boolean)));

  const trackerSpecialties = Array.from(new Set(workedLeads.map(l => l.specialty).filter(Boolean)));
  const trackerCities = Array.from(new Set(workedLeads.map(l => l.city).filter(Boolean)));
  const trackerStates = Array.from(new Set(workedLeads.map(l => l.state).filter(Boolean)));
  const trackerWorkedDates = Array.from(new Set(workedLeads.map(l => l.workedDate).filter(Boolean)));

  // FILTERING LEAD ALLOCATION ROW ITEMS
  const filteredAllocLeads = activeLeads.filter(lead => {
    if (allocFilterUploadDate && lead.uploadedDate !== allocFilterUploadDate) return false;
    if (allocFilterSpecialty && lead.specialty !== allocFilterSpecialty) return false;
    if (allocFilterCity && lead.city.toLowerCase() !== allocFilterCity.toLowerCase()) return false;
    if (allocFilterState && lead.state.toUpperCase() !== allocFilterState.toUpperCase()) return false;
    if (allocFilterProvider && !lead.providerName.toLowerCase().includes(allocFilterProvider.toLowerCase())) return false;
    return true;
  });

  // FILTERING TRACKED LEADS ROW ITEMS
  const filteredWorkedLeads = workedLeads.filter(lead => {
    if (trackSelectedAgent !== 'all' && lead.agentAssigned !== trackSelectedAgent) return false;
    if (trackFilterSpecialty && lead.specialty !== trackFilterSpecialty) return false;
    if (trackFilterCity && lead.city.toLowerCase() !== trackFilterCity.toLowerCase()) return false;
    if (trackFilterState && lead.state.toUpperCase() !== trackFilterState.toUpperCase()) return false;
    if (trackFilterWorkedDate && lead.workedDate !== trackFilterWorkedDate) return false;
    return true;
  });

  // Toggle selection
  const toggleSelectLead = (id: string) => {
    setSelectedLeadIds(prev => 
      prev.includes(id) ? prev.filter(item => item !== id) : [...prev, id]
    );
  };

  const toggleSelectAllPage = () => {
    const visibleIds = filteredAllocLeads.map(l => l.id);
    const allSelected = visibleIds.every(id => selectedLeadIds.includes(id));
    if (allSelected) {
      // Remove all visible from selection
      setSelectedLeadIds(prev => prev.filter(id => !visibleIds.includes(id)));
    } else {
      // Add all visible that aren't already selected
      setSelectedLeadIds(prev => {
        const unique = new Set([...prev, ...visibleIds]);
        return Array.from(unique);
      });
    }
  };

  // Submit allocation
  const handleBulkAllocate = () => {
    if (selectedLeadIds.length === 0) return;
    const target = assignAgentTarget === 'unassign' ? null : assignAgentTarget;
    if (assignAgentTarget === '') return;
    
    onAllocateLeads(selectedLeadIds, target);
    setSelectedLeadIds([]);
    setAssignAgentTarget('');
  };

  const handleBulkFilterAllocate = () => {
    if (filteredAllocLeads.length === 0) return;
    if (bulkFilterAssignTarget === '') return;
    const target = bulkFilterAssignTarget === 'unassign' ? null : bulkFilterAssignTarget;
    
    const leadIdsToAllocate = filteredAllocLeads.map(l => l.id);
    onAllocateLeads(leadIdsToAllocate, target);
    setBulkFilterAssignTarget('');
  };

  // Agent Stats Calculator (Active metrics for activity display)
  const getAgentMetrics = (agent: string) => {
    const assignedLeads = leads.filter(l => l.agentAssigned === agent);
    const totalAssigned = assignedLeads.length;
    const totalWorked = assignedLeads.filter(l => l.workedDate !== null || l.comments.length > 0).length;
    const totalDNDNotInterested = assignedLeads.filter(l => l.status === 'DND' || l.status === 'Not Interested').length;
    const totalInterestedLeads = assignedLeads.filter(l => l.status === 'Lead').length;

    return {
      totalAssigned,
      totalWorked,
      totalDNDNotInterested,
      totalInterestedLeads,
      completionRate: totalAssigned > 0 ? Math.round((totalWorked / totalAssigned) * 100) : 0
    };
  };

  return (
    <div className="flex flex-col h-full bg-[#09090b] text-zinc-300 p-6 space-y-6">
      
      {/* Overview Cards (Metrics Ribbon) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        
        <div className="bg-[#121214] border border-[#1f1f23] p-4 rounded-xl flex items-center justify-between shadow-lg">
          <div className="space-y-1">
            <span className="text-[10px] text-zinc-400 font-bold tracking-wider uppercase">Active Allocation Base</span>
            <div className="text-2xl font-black text-white">{activeLeads.length}</div>
            <span className="text-[10px] text-zinc-500 block">Current active list database size</span>
          </div>
          <div className="bg-indigo-500/10 p-3 rounded-lg text-indigo-400">
            <ClipboardList className="w-5 h-5" />
          </div>
        </div>

        <div className="bg-[#121214] border border-[#1f1f23] p-4 rounded-xl flex items-center justify-between shadow-lg">
          <div className="space-y-1">
            <span className="text-[10px] text-zinc-400 font-bold tracking-wider uppercase">Unallocated Pools</span>
            <div className="text-2xl font-black text-rose-450">
              {activeLeads.filter(l => l.agentAssigned === null).length}
            </div>
            <span className="text-[10px] text-zinc-500 block">Unassigned active files remaining</span>
          </div>
          <div className="bg-rose-500/10 p-3 rounded-lg text-rose-400">
            <Users className="w-5 h-5" />
          </div>
        </div>

        <div className="bg-[#121214] border border-[#1f1f23] p-4 rounded-xl flex items-center justify-between shadow-lg">
          <div className="space-y-1">
            <span className="text-[10px] text-zinc-400 font-bold tracking-wider uppercase">Total Worked Records</span>
            <div className="text-2xl font-black text-sky-450">{workedLeads.length}</div>
            <span className="text-[10px] text-zinc-500 block">Providers contacted elements</span>
          </div>
          <div className="bg-sky-500/10 p-3 rounded-lg text-sky-400">
            <Activity className="w-5 h-5" />
          </div>
        </div>

        <div className="bg-[#121214] border border-[#1f1f23] p-4 rounded-xl flex items-center justify-between shadow-lg">
          <div className="space-y-1">
            <span className="text-[10px] text-zinc-400 font-bold tracking-wider uppercase">Active Agents Status</span>
            <div className="text-2xl font-black text-amber-450">{agents.length}</div>
            <span className="text-[10px] text-zinc-500 block">Eligible queue representatives</span>
          </div>
          <div className="bg-amber-500/10 p-3 rounded-lg text-amber-400">
            <Award className="w-5 h-5" />
          </div>
        </div>

      </div>

      {/* Main Grid: Management Controls Split */}
      <div className="grid grid-cols-1 xl:grid-cols-12 gap-6 items-start">
        
        {/* Left Side (8 Cols): WORK ALLOCATION PORTAL */}
        <div className="xl:col-span-8 bg-[#121214] border border-[#1f1f23] rounded-xl shadow-lg p-5 space-y-4">
          <div className="flex justify-between items-center pb-2 border-b border-[#1f1f23]">
            <div>
              <h3 className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-2">
                <UserPlus className="w-4 h-4 text-violet-400" />
                Work Allocation Console
              </h3>
              <p className="text-[11px] text-zinc-400 mt-0.5">Filter the active leads database and bulk-assign to field agents.</p>
            </div>
            
            {/* Multi allocation bar */}
            {selectedLeadIds.length > 0 && (
              <div className="flex items-center gap-2 bg-[#09090b] border border-violet-500/20 p-1.5 px-3 rounded-lg shadow-inner">
                <span className="text-[10px] text-violet-455 font-bold">{selectedLeadIds.length} Selected</span>
                <select
                  value={assignAgentTarget}
                  onChange={(e) => setAssignAgentTarget(e.target.value)}
                  className="bg-[#161619] border border-[#1f1f23] text-[10px] rounded p-1 text-white focus:outline-none focus:border-violet-500"
                >
                  <option value="">-- Choose Agent --</option>
                  {agents.map(a => <option key={a} value={a}>{a}</option>)}
                  <option value="unassign">Unassign / Return to Pool</option>
                </select>
                <button
                  onClick={handleBulkAllocate}
                  disabled={!assignAgentTarget}
                  className="text-[10px] font-black py-1 px-3 bg-[#8b5cf6] text-white hover:bg-violet-500 rounded cursor-pointer disabled:opacity-45 transition-colors"
                >
                  Apply
                </button>
              </div>
            )}
          </div>

          {/* Quick Bulk Dispatch Engine panel */}
          <div className="bg-violet-950/10 border border-violet-500/15 p-3 rounded-xl flex flex-col md:flex-row justify-between items-start md:items-center gap-3">
            <div className="space-y-0.5">
              <span className="text-xs font-bold text-violet-300 uppercase block tracking-wide">Quick Bulk Dispatch Engine</span>
              <p className="text-[10.5px] text-zinc-400">
                Found <span className="font-bold text-white font-mono">{filteredAllocLeads.length}</span> matching provider records below. Assign them all in bulk to an employee:
              </p>
            </div>
            <div className="flex items-center gap-2 self-stretch md:self-auto shrink-0">
              <select
                value={bulkFilterAssignTarget}
                onChange={(e) => setBulkFilterAssignTarget(e.target.value)}
                className="bg-[#09090b] border border-[#1f1f23] text-[11px] rounded-lg p-2 text-white focus:outline-none focus:border-violet-500 w-full md:w-44"
              >
                <option value="">-- Select Employee --</option>
                {agents.map(a => <option key={a} value={a}>{a}</option>)}
                <option value="unassign">Unassign / Clean Slate</option>
              </select>
              <button
                onClick={handleBulkFilterAllocate}
                disabled={!bulkFilterAssignTarget || filteredAllocLeads.length === 0}
                className="text-[11px] font-bold py-2 px-3.5 bg-violet-600 hover:bg-violet-500 text-white rounded-lg disabled:opacity-30 disabled:cursor-not-allowed transition-all active:scale-95 cursor-pointer shrink-0"
              >
                Dispatch All
              </button>
            </div>
          </div>

          {/* Allocation Filtering Ribbon */}
          <div className="bg-[#09090b] p-3 rounded-lg border border-[#1f1f23] grid grid-cols-1 sm:grid-cols-5 gap-2 items-end">
            
            {/* Filter 1: Provider Name */}
            <div>
              <label className="text-[9px] font-bold text-zinc-450 uppercase block mb-1">Provider Name</label>
              <input
                type="text"
                value={allocFilterProvider}
                onChange={(e) => setAllocFilterProvider(e.target.value)}
                placeholder="Search..."
                className="w-full bg-[#161619] text-white border border-[#1f1f23] text-[10px] rounded px-2 py-1.5 focus:outline-none focus:border-violet-500"
              />
            </div>

            {/* Filter 2: Specialty */}
            <div>
              <label className="text-[9px] font-bold text-zinc-450 uppercase block mb-1">Specialty</label>
              <select
                value={allocFilterSpecialty}
                onChange={(e) => setAllocFilterSpecialty(e.target.value)}
                className="w-full bg-[#161619] text-white border border-[#1f1f23] text-[10px] rounded px-2 py-1.5 focus:outline-none focus:border-violet-500"
              >
                <option value="">All Specialties</option>
                {specialties.map(s => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>

            {/* Filter 3: City */}
            <div>
              <label className="text-[9px] font-bold text-[#a1a1aa] uppercase block mb-1">City</label>
              <select
                value={allocFilterCity}
                onChange={(e) => setAllocFilterCity(e.target.value)}
                className="w-full bg-[#161619] text-white border border-[#1f1f23] text-[10px] rounded px-2 py-1.5 focus:outline-none focus:border-violet-500 block"
              >
                <option value="">All Cities</option>
                {cities.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>

            {/* Filter 4: State */}
            <div>
              <label className="text-[9px] font-bold text-[#a1a1aa] uppercase block mb-1">State</label>
              <select
                value={allocFilterState}
                onChange={(e) => setAllocFilterState(e.target.value)}
                className="w-full bg-[#161619] text-white border border-[#1f1f23] text-[10px] rounded px-2 py-1.5 focus:outline-none focus:border-violet-500 block"
              >
                <option value="">All States</option>
                {states.map(st => <option key={st} value={st}>{st}</option>)}
              </select>
            </div>

            {/* Filter 5: Uploaded Date */}
            <div>
              <label className="text-[9px] font-bold text-[#a1a1aa] uppercase block mb-1">Upload Date</label>
              <select
                value={allocFilterUploadDate}
                onChange={(e) => setAllocFilterUploadDate(e.target.value)}
                className="w-full bg-[#161619] text-white border border-[#1f1f23] text-[10px] rounded px-2 py-1.5 focus:outline-none"
              >
                <option value="">All Upload Dates</option>
                {uploadDates.map(ud => <option key={ud} value={ud}>{ud}</option>)}
              </select>
            </div>

          </div>

          {/* Allocation Table Grid */}
          <div className="overflow-x-auto border border-[#1f1f23] rounded-lg max-h-[480px]">
            <table className="min-w-full divide-y divide-[#1f1f23] text-left text-[11px] text-zinc-300 animate-fade-in">
              <thead className="bg-[#09090b] text-[9px] text-[#a1a1aa] uppercase font-bold tracking-wider">
                <tr>
                  <th scope="col" className="px-4 py-2 text-center w-10">
                    <button
                      onClick={toggleSelectAllPage}
                      className="text-zinc-500 hover:text-white"
                      title="Toggle select all on page"
                    >
                      {filteredAllocLeads.length > 0 && 
                       filteredAllocLeads.every(l => selectedLeadIds.includes(l.id)) ? (
                        <CheckSquare className="w-3.5 h-3.5 text-violet-400 mx-auto" />
                      ) : (
                        <Square className="w-3.5 h-3.5 text-zinc-600 mx-auto" />
                      )}
                    </button>
                  </th>
                  <th scope="col" className="px-4 py-2.5">Provider / Clinic</th>
                  <th scope="col" className="px-4 py-2.5">Specialty</th>
                  <th scope="col" className="px-4 py-2.5">Territory</th>
                  <th scope="col" className="px-4 py-2.5">Upload Info</th>
                  <th scope="col" className="px-4 py-2.5">Current Agent</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#1f1f23]/60 bg-[#121214]/30">
                {filteredAllocLeads.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-4 py-8 text-center text-zinc-500 font-medium">
                      No active leads match allocation filters.
                    </td>
                  </tr>
                ) : (
                  filteredAllocLeads.map((lead) => {
                    const isSelected = selectedLeadIds.includes(lead.id);
                    return (
                      <tr 
                        key={lead.id} 
                        className={`hover:bg-[#161619]/60 cursor-pointer transition-colors ${isSelected ? 'bg-violet-500/5' : ''}`}
                        onClick={() => toggleSelectLead(lead.id)}
                      >
                        {/* Checkbox cell */}
                        <td className="px-4 py-2 w-10 text-center" onClick={(e) => e.stopPropagation()}>
                          <button onClick={() => toggleSelectLead(lead.id)} className="text-zinc-500 hover:text-white cursor-pointer">
                            {isSelected ? (
                              <CheckSquare className="w-3.5 h-3.5 text-violet-400 mx-auto animate-pulse" />
                            ) : (
                              <Square className="w-3.5 h-3.5 text-zinc-700 mx-auto" />
                            )}
                          </button>
                        </td>

                        {/* Name */}
                        <td className="px-4 py-2.5 font-bold text-white group-hover:text-violet-400">
                          {lead.providerName}
                        </td>

                        {/* Specialty */}
                        <td className="px-4 py-2.5">
                          <span className="bg-[#09090b] px-2 py-0.5 rounded text-[10px] text-violet-450 font-bold border border-[#1f1f23]">
                            {lead.specialty}
                          </span>
                        </td>

                        {/* Territory */}
                        <td className="px-4 py-2.5">
                          <span>{lead.city}, <span className="font-bold text-zinc-500 uppercase">{lead.state}</span></span>
                        </td>

                        {/* Upload date */}
                        <td className="px-4 py-2.5 font-mono text-[10px] text-zinc-400">
                          {lead.uploadedDate}
                        </td>

                        {/* Current Queue Assignee */}
                        <td className="px-4 py-2.5" onClick={(e) => e.stopPropagation()}>
                          <select
                            value={lead.agentAssigned || ''}
                            onChange={(e) => onAllocateLeads([lead.id], e.target.value || null)}
                            className="bg-[#09090b] border border-[#1f1f23] text-[10px] rounded px-1.5 py-0.5 text-zinc-300 w-full focus:outline-none focus:border-violet-500 cursor-pointer font-medium"
                          >
                            <option value="">-- Unassigned --</option>
                            {agents.map(a => <option key={a} value={a}>{a}</option>)}
                          </select>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>

        </div>

        {/* Right Side (4 Cols): AGENT ACTIVITIES & WORKED TRACKER */}
        <div className="xl:col-span-4 space-y-6">
          
          {/* Tracker Form & Worked Leads */}
          <div className="bg-[#121214] border border-[#1f1f23] rounded-xl shadow-lg p-5 space-y-4">
            <div>
              <h3 className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-2">
                <Activity className="w-4 h-4 text-sky-400" />
                Representative Tracker
              </h3>
              <p className="text-[11px] text-zinc-400 mt-0.5">Track worked/contacted leads filtered by agent, state, city, and dates.</p>
            </div>

            {/* Tracker Filters Area */}
            <div className="bg-[#09090b] p-3 rounded-lg border border-[#1f1f23] space-y-2">
              
              <div className="grid grid-cols-2 gap-2">
                {/* Select Agent */}
                <div className="col-span-2">
                  <label className="text-[9px] font-bold text-zinc-400 uppercase block mb-1">Select Field Representative</label>
                  <select
                    value={trackSelectedAgent}
                    onChange={(e) => setTrackSelectedAgent(e.target.value)}
                    className="w-full bg-[#161619] text-white border border-[#1f1f23] text-[10px] rounded px-2 py-1.5 focus:outline-none focus:border-sky-500"
                  >
                    <option value="all">Check All Representatives</option>
                    {agents.map(a => <option key={a} value={a}>{a}</option>)}
                  </select>
                </div>

                {/* State */}
                <div>
                  <label className="text-[9px] font-bold text-zinc-400 uppercase block mb-1">State</label>
                  <select
                    value={trackFilterState}
                    onChange={(e) => setTrackFilterState(e.target.value)}
                    className="w-full bg-[#161619] text-white border border-[#1f1f23] text-[10px] rounded px-2 py-1.5 focus:outline-none focus:border-sky-500"
                  >
                    <option value="">All States</option>
                    {trackerStates.map(st => <option key={st} value={st}>{st}</option>)}
                  </select>
                </div>

                {/* City */}
                <div>
                  <label className="text-[9px] font-bold text-zinc-400 uppercase block mb-1">City</label>
                  <select
                    value={trackFilterCity}
                    onChange={(e) => setTrackFilterCity(e.target.value)}
                    className="w-full bg-[#161619] text-white border border-[#1f1f23] text-[10px] rounded px-2 py-1.5 focus:outline-none focus:border-sky-500"
                  >
                    <option value="">All Cities</option>
                    {trackerCities.map(c => <option key={c} value={c}>{c}</option>)}
                  </select>
                </div>

                {/* Specialty */}
                <div>
                  <label className="text-[9px] font-bold text-zinc-400 uppercase block mb-1">Specialty</label>
                  <select
                    value={trackFilterSpecialty}
                    onChange={(e) => setTrackFilterSpecialty(e.target.value)}
                    className="w-full bg-[#161619] text-white border border-[#1f1f23] text-[10px] rounded px-2 py-1.5 focus:outline-none focus:border-sky-500"
                  >
                    <option value="">All Specialties</option>
                    {trackerSpecialties.map(s => <option key={s} value={s}>{s}</option>)}
                  </select>
                </div>

                {/* Worked Date */}
                <div>
                  <label className="text-[9px] font-bold text-zinc-400 uppercase block mb-1">Worked Date</label>
                  <select
                    value={trackFilterWorkedDate}
                    onChange={(e) => setTrackFilterWorkedDate(e.target.value)}
                    className="w-full bg-[#161619] text-white border border-[#1f1f23] text-[10px] rounded px-2 py-1.5 focus:outline-none focus:border-sky-500"
                  >
                    <option value="">All Dates</option>
                    {trackerWorkedDates.map(wd => <option key={wd} value={wd}>{wd}</option>)}
                  </select>
                </div>
              </div>

            </div>

            {/* Tracked worked list output */}
            <div className="space-y-2 max-h-[340px] overflow-y-auto pr-1">
              {filteredWorkedLeads.length === 0 ? (
                <p className="text-xs text-zinc-500 py-6 text-center bg-[#09090b] rounded-lg border border-[#1f1f23]">
                  No historical activity found match query filters.
                </p>
              ) : (
                filteredWorkedLeads.map((lead) => (
                  <div key={lead.id} className="p-3 bg-[#09090b] rounded-lg border border-[#1f1f23] space-y-2">
                    <div className="flex justify-between items-start">
                      <div>
                        <h4 className="text-[11px] font-bold text-white line-clamp-1">{lead.providerName}</h4>
                        <span className="text-[9px] text-zinc-400">{lead.specialty} • {lead.city}, {lead.state}</span>
                      </div>
                      <span className={`text-[9.5px] font-bold px-1.5 py-0.5 rounded border ${
                        lead.status === 'Lead' ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' :
                        lead.status === 'Not Interested' ? 'bg-rose-500/10 text-rose-400 border-rose-500/20' :
                        lead.status === 'DND' ? 'bg-amber-500/10 text-amber-500 border-amber-500/20' :
                        'bg-sky-500/10 text-sky-400 border-sky-500/20'
                      }`}>
                        {lead.status === 'Lead' ? 'Interested' : lead.status}
                      </span>
                    </div>

                    <div className="text-[10px] bg-[#161619] border border-[#1f1f23]/60 p-2 rounded text-zinc-300">
                      <div className="flex justify-between border-b border-[#1f1f23]/40 pb-1 mb-1 font-mono text-[9px] text-zinc-500">
                        <span>Worked by: {lead.agentAssigned || 'System'}</span>
                        <span>{lead.workedDate || 'None'}</span>
                      </div>
                      <p className="italic text-zinc-400 text-[10px] line-clamp-2">
                        {lead.comments.length > 0 
                          ? `"${lead.comments[lead.comments.length - 1].text}"`
                          : "No comment logs stored."
                        }
                      </p>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Quick Agent Load Summary list */}
          <div className="bg-[#121214] border border-[#1f1f23] rounded-xl p-5 space-y-3 shadow-lg">
            <h3 className="text-xs font-bold uppercase text-white tracking-wider flex items-center gap-1.5">
              <TrendingUp className="w-4 h-4 text-violet-400" />
              Active Queue Allocations Summaries
            </h3>
            
            <div className="space-y-2">
              {agents.map(agentName => {
                const metrics = getAgentMetrics(agentName);
                return (
                  <div key={agentName} className="p-3 bg-[#09090b] rounded-lg flex items-center justify-between text-xs border border-[#1f1f23] hover:border-zinc-750 transition-colors">
                    <div>
                      <span className="font-bold text-white block">{agentName}</span>
                      <span className="text-[10px] text-zinc-400">Completion rate: {metrics.completionRate}%</span>
                    </div>

                    <div className="flex items-center gap-3">
                      <div className="text-right">
                        <span className="font-mono font-bold text-white block">{metrics.totalWorked} / {metrics.totalAssigned}</span>
                        <span className="text-[9px] text-zinc-500 font-mono">Assigned files</span>
                      </div>
                      <ChevronRight className="w-4 h-4 text-zinc-650" />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

        </div>

      </div>

    </div>
  );
}
