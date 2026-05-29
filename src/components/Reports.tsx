import { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  FileSpreadsheet, 
  Download, 
  SlidersHorizontal, 
  ArrowUpDown, 
  TrendingUp, 
  PieChart, 
  X, 
  RefreshCw,
  Search,
  MessageCircle,
  FileDown,
  Calendar,
  User as UserIcon,
  Archive,
  Clock,
  CheckCircle2,
  ClipboardList,
  AlertCircle,
  Phone,
  Mail,
  ArrowRight,
  UserCheck2,
  FileText
} from 'lucide-react';
import { Lead, User } from '../types';

interface ReportsProps {
  leads: Lead[];
  users?: User[];
}

type SortField = 'providerName' | 'uploadedDate' | 'workedDate' | 'specialty';
type SortOrder = 'asc' | 'desc';

export default function Reports({ leads, users = [] }: ReportsProps) {
  // Filters
  const [filterCity, setFilterCity] = useState('');
  const [filterState, setFilterState] = useState('');
  const [filterSpecialty, setFilterSpecialty] = useState('');
  const [filterWorkedDate, setFilterWorkedDate] = useState('');
  const [filterUploadedDate, setFilterUploadedDate] = useState('');
  const [searchTerm, setSearchTerm] = useState('');

  // Sorting
  const [sortField, setSortField] = useState<SortField>('providerName');
  const [sortOrder, setSortOrder] = useState<SortOrder>('asc');

  // Today helper
  const getTodayDateString = () => {
    const d = new Date();
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  // Archive Selected States
  const [selectedArchiveDate, setSelectedArchiveDate] = useState<string>(getTodayDateString());
  const [selectedArchiveAgent, setSelectedArchiveAgent] = useState<string>(() => {
    const defaultEmp = users.find(u => u.role === 'Employee');
    return defaultEmp ? defaultEmp.name : '';
  });
  const [selectedArchiveLead, setSelectedArchiveLead] = useState<Lead | null>(null);

  const targetAgentUser = users.find(u => u.name === selectedArchiveAgent || u.username === selectedArchiveAgent);

  // Filter tasks for selected agent on selected date
  const archiveCompleteTasks = leads.filter(lead => {
    const isAssigned = lead.agentAssigned && (
      lead.agentAssigned === selectedArchiveAgent || (targetAgentUser && lead.agentAssigned.toLowerCase() === targetAgentUser.username.toLowerCase())
    );
    if (!isAssigned) return false;

    const workedOnDate = lead.workedDate === selectedArchiveDate;
    const hasCommentOnDate = lead.comments.some(c => {
      const commentDate = c.timestamp.split(' ')[0];
      const authorMatch = c.author === selectedArchiveAgent || (targetAgentUser && c.author.toLowerCase() === targetAgentUser.username.toLowerCase());
      return commentDate === selectedArchiveDate && authorMatch;
    });

    return workedOnDate || hasCommentOnDate;
  });

  const archivePendingTasks = leads.filter(lead => {
    const isAssigned = lead.agentAssigned && (
      lead.agentAssigned === selectedArchiveAgent || (targetAgentUser && lead.agentAssigned.toLowerCase() === targetAgentUser.username.toLowerCase())
    );
    if (!isAssigned) return false;

    const workedOnDate = lead.workedDate === selectedArchiveDate;
    const hasCommentOnDate = lead.comments.some(c => {
      const commentDate = c.timestamp.split(' ')[0];
      const authorMatch = c.author === selectedArchiveAgent || (targetAgentUser && c.author.toLowerCase() === targetAgentUser.username.toLowerCase());
      return commentDate === selectedArchiveDate && authorMatch;
    });
    if (workedOnDate || hasCommentOnDate) return false;

    const matchesFollowUp = lead.followUpDate === selectedArchiveDate;
    const isUnworkedOrFollowUp = lead.status === 'Leads' || lead.status === 'Follow-Up';

    return matchesFollowUp || isUnworkedOrFollowUp;
  });

  const totalArchiveTasks = archiveCompleteTasks.length + archivePendingTasks.length;
  const archiveCompletionPercent = totalArchiveTasks > 0 ? Math.round((archiveCompleteTasks.length / totalArchiveTasks) * 100) : 0;

  // Filter Arrays
  const cities = Array.from(new Set(leads.map(l => l.city).filter(Boolean)));
  const states = Array.from(new Set(leads.map(l => l.state).filter(Boolean)));
  const specialties = Array.from(new Set(leads.map(l => l.specialty).filter(Boolean)));
  const workedDates = Array.from(new Set(leads.map(l => l.workedDate).filter(Boolean)));
  const uploadedDates = Array.from(new Set(leads.map(l => l.uploadedDate).filter(Boolean)));

  // Filter Leads
  const filteredLeads = leads.filter(lead => {
    if (filterCity && lead.city.toLowerCase() !== filterCity.toLowerCase()) return false;
    if (filterState && lead.state.toUpperCase() !== filterState.toUpperCase()) return false;
    if (filterSpecialty && lead.specialty !== filterSpecialty) return false;
    if (filterWorkedDate && lead.workedDate !== filterWorkedDate) return false;
    if (filterUploadedDate && lead.uploadedDate !== filterUploadedDate) return false;
    
    if (searchTerm) {
      const q = searchTerm.toLowerCase();
      return (
        lead.providerName.toLowerCase().includes(q) ||
        lead.id.toLowerCase().includes(q) ||
        (lead.agentAssigned?.toLowerCase() || '').includes(q)
      );
    }
    return true;
  });

  // Sort Leads
  const sortedLeads = [...filteredLeads].sort((a, b) => {
    let valA = a[sortField] || '';
    let valB = b[sortField] || '';

    if (sortField === 'providerName') {
      valA = a.providerName.toLowerCase();
      valB = b.providerName.toLowerCase();
    } else if (sortField === 'specialty') {
      valA = (a.specialty || '').toLowerCase();
      valB = (b.specialty || '').toLowerCase();
    }

    if (valA < valB) return sortOrder === 'asc' ? -1 : 1;
    if (valA > valB) return sortOrder === 'asc' ? 1 : -1;
    return 0;
  });

  // Export Filtered Dataset to CSV
  const handleExportCSV = () => {
    // Generate Header Row matching our tracking database properties
    const headers = [
      'Lead ID',
      'Provider Name',
      'Specialty',
      'City',
      'State',
      'Phone',
      'Email',
      'Uploaded Date',
      'Worked Date',
      'Follow-Up Date',
      'Live Status',
      'Agent Assigned',
      'Comments Log / Call Notes'
    ];

    const rows = sortedLeads.map(lead => {
      // Concatenate comments text to a single long line, escaping quotes
      const commentsText = lead.comments.length > 0 
        ? lead.comments.map(c => `[${c.author} @ ${c.timestamp}]: ${c.text}`).join(' | ') 
        : 'No comments logged.';

      return [
        `"${lead.id}"`,
        `"${lead.providerName.replace(/"/g, '""')}"`,
        `"${(lead.specialty || '').replace(/"/g, '""')}"`,
        `"${(lead.city || '').replace(/"/g, '""')}"`,
        `"${(lead.state || '').replace(/"/g, '""')}"`,
        `"${lead.phone || ''}"`,
        `"${lead.email || ''}"`,
        `"${lead.uploadedDate}"`,
        `"${lead.workedDate || 'Unworked'}"`,
        `"${lead.followUpDate || ''}"`,
        `"${lead.status}"`,
        `"${lead.agentAssigned || 'Unassigned'}"`,
        `"${commentsText.replace(/"/g, '""')}"`
      ];
    });

    const csvContent = [
      headers.join(','),
      ...rows.map(r => r.join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", `lead_operations_report_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Export Filtered Dataset to a styled Excel Sheet with grids, bold text, and colored header
  const handleExportExcel = () => {
    const headers = [
      'Lead ID',
      'Provider Name',
      'Specialty',
      'City',
      'State',
      'Phone',
      'Email',
      'Uploaded Date',
      'Worked Date',
      'Follow-Up Date',
      'Live Status',
      'Agent Assigned',
      'Comments Log / Call Notes'
    ];

    // Colored, bold header cells
    const headerHtml = headers.map(h => 
      `<th style="background-color: #10b981; color: #ffffff; font-weight: bold; border: 1px solid #94a3b8; padding: 10px; font-family: 'Segoe UI', Arial, sans-serif; font-size: 11pt; text-align: left;">${h}</th>`
    ).join('');

    // Cells with standard grid borders
    const rowsHtml = sortedLeads.map(lead => {
      const commentsText = lead.comments.length > 0 
        ? lead.comments.map(c => `[${c.author} @ ${c.timestamp}]: ${c.text}`).join(' | ') 
        : 'No comments logged.';

      const cells = [
        lead.id,
        lead.providerName,
        lead.specialty || '',
        lead.city || '',
        lead.state || '',
        lead.phone || '',
        lead.email || '',
        lead.uploadedDate,
        lead.workedDate || 'Unworked',
        lead.followUpDate || '',
        lead.status,
        lead.agentAssigned || 'Unassigned',
        commentsText
      ];

      return `<tr>${cells.map(cell => {
        const val = (cell || '')
          .toString()
          .replace(/&/g, '&amp;')
          .replace(/</g, '&lt;')
          .replace(/>/g, '&gt;');
        return `<td style="border: 1px solid #cbd5e1; padding: 8px; font-family: 'Segoe UI', Arial, sans-serif; font-size: 10pt; text-align: left;">${val}</td>`;
      }).join('')}</tr>`;
    }).join('\n');

    // XML Worksheet Options forces Excel to display active gridlines
    const excelTemplate = `
      <html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:x="urn:schemas-microsoft-com:office:excel" xmlns="http://www.w3.org/TR/REC-html40">
      <head>
        <!--[if gte mso 9]>
        <xml>
          <x:ExcelWorkbook>
            <x:ExcelWorksheets>
              <x:ExcelWorksheet>
                <x:Name>Lead Operations Report</x:Name>
                <x:WorksheetOptions>
                  <x:DisplayGridlines/>
                </x:WorksheetOptions>
              </x:ExcelWorksheet>
            </x:ExcelWorksheets>
          </x:ExcelWorkbook>
        </xml>
        <![endif]-->
        <meta charset="utf-8">
        <style>
          table { border-collapse: collapse; }
          th { background-color: #10b981; color: #ffffff; font-weight: bold; border: 1px solid #94a3b8; }
          td { border: 1px solid #cbd5e1; }
        </style>
      </head>
      <body>
        <table>
          <thead>
            <tr>${headerHtml}</tr>
          </thead>
          <tbody>
            ${rowsHtml}
          </tbody>
        </table>
      </body>
      </html>
    `;

    const blob = new Blob([excelTemplate], { type: 'application/vnd.ms-excel;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", `lead_operations_report_${new Date().toISOString().split('T')[0]}.xls`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Metric Aggregators for top report insights
  const totalLeads = leads.length;
  const interestedLeads = leads.filter(l => l.status === 'Lead').length;
  const notInterestedLeads = leads.filter(l => l.status === 'Not Interested').length;
  const dndLeads = leads.filter(l => l.status === 'DND').length;
  const followUpLeads = leads.filter(l => l.status === 'Follow-Up').length;
  const unworkedLeads = leads.filter(l => l.workedDate === null && l.status === 'Leads').length;

  const handleResetFilters = () => {
    setFilterCity('');
    setFilterState('');
    setFilterSpecialty('');
    setFilterWorkedDate('');
    setFilterUploadedDate('');
    setSearchTerm('');
  };

  const toggleSort = (field: SortField) => {
    if (sortField === field) {
      setSortOrder(prev => prev === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortOrder('asc');
    }
  };

  return (
    <div className="flex flex-col h-full bg-[#09090b] text-zinc-300 p-6 space-y-6">
      
      {/* Title & CSV Export Bar */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center p-5 bg-[#121214] border border-[#1f1f23] rounded-xl gap-4">
        <div>
          <h2 className="text-xl font-bold text-white flex items-center gap-2">
            <FileSpreadsheet className="text-emerald-400 w-5 h-5" />
            Report Analytics & Audits
          </h2>
          <p className="text-sm text-gray-400 mt-1">
            Query the entire communication workspace of agent comments, worked timelines, and upload logs.
          </p>
        </div>

        <div className="flex flex-col sm:flex-row gap-3">
          <button
            onClick={handleExportExcel}
            disabled={sortedLeads.length === 0}
            className="flex items-center gap-2 bg-emerald-500 hover:bg-emerald-600 text-[#0b0c10] text-xs font-bold py-2.5 px-4 rounded-lg shadow-lg shadow-emerald-500/10 disabled:opacity-40 transition-transform active:scale-95 cursor-pointer"
          >
            <FileSpreadsheet className="w-4 h-4 text-[#0b0c10] shrink-0" />
            Export Styled Excel (.xls)
          </button>

          <button
            onClick={handleExportCSV}
            disabled={sortedLeads.length === 0}
            className="flex items-center gap-2 bg-[#1b1c21] hover:bg-zinc-850 text-zinc-300 hover:text-white text-xs font-bold py-2.5 px-4 rounded-lg border border-[#1f1f23] disabled:opacity-40 transition-transform active:scale-95 cursor-pointer"
          >
            <FileDown className="w-4 h-4 text-zinc-400 shrink-0" />
            Standard CSV
          </button>
        </div>
      </div>

      {/* Aggregate metrics dashboards mini block */}
      <div className="grid grid-cols-2 md:grid-cols-6 gap-3">
        <div className="bg-[#1f2833]/60 border border-slate-850 p-3 rounded-lg text-center">
          <span className="text-[9px] text-gray-400 block font-bold uppercase tracking-wider">Total Database</span>
          <span className="text-lg font-black text-white">{totalLeads}</span>
        </div>
        <div className="bg-[#1f2833]/60 border border-slate-850 p-3 rounded-lg text-center">
          <span className="text-[9px] text-emerald-400 block font-bold uppercase tracking-wider">Interested (Leads)</span>
          <span className="text-lg font-black text-emerald-400">{interestedLeads}</span>
        </div>
        <div className="bg-[#1f2833]/60 border border-slate-850 p-3 rounded-lg text-center">
          <span className="text-[9px] text-rose-400 block font-bold uppercase tracking-wider">Not Interested</span>
          <span className="text-lg font-black text-rose-400">{notInterestedLeads}</span>
        </div>
        <div className="bg-[#1f2833]/60 border border-slate-850 p-3 rounded-lg text-center">
          <span className="text-[9px] text-amber-500 block font-bold uppercase tracking-wider">DND (Opt-Out)</span>
          <span className="text-lg font-black text-amber-500">{dndLeads}</span>
        </div>
        <div className="bg-[#1f2833]/60 border border-slate-850 p-3 rounded-lg text-center">
          <span className="text-[9px] text-amber-300 block font-bold uppercase tracking-wider">Follow-Up Pending</span>
          <span className="text-lg font-black text-amber-300">{followUpLeads}</span>
        </div>
        <div className="bg-[#1f2833]/60 border border-slate-850 p-3 rounded-lg text-center">
          <span className="text-[9px] text-slate-400 block font-bold uppercase tracking-wider">Not Handled / Pool</span>
          <span className="text-lg font-black text-gray-400">{unworkedLeads}</span>
        </div>
      </div>

      {/* Main 2-Column Reports Directory Workspace */}
      <div className="grid grid-cols-1 xl:grid-cols-12 gap-6 items-start">
        
        {/* Left Side: General Queries and Main Dataset Ledger (col-span-8) */}
        <div className="xl:col-span-8 space-y-6">
          
          {/* Query Filters Section */}
          <div className="bg-[#121214] border border-[#1f1f23] p-5 rounded-xl space-y-4 shadow-lg">
            <div className="flex justify-between items-center">
              <h3 className="text-xs font-bold uppercase text-white tracking-wider flex items-center gap-1.5">
                <SlidersHorizontal className="w-4 h-4 text-emerald-400" />
                Query Builder Filtings
              </h3>
              <button
                onClick={handleResetFilters}
                className="text-[10px] text-zinc-400 hover:text-white flex items-center gap-1 bg-[#09090b] border border-[#1f1f23] py-1 px-3 rounded cursor-pointer transition-colors"
              >
                <RefreshCw className="w-3 h-3" />
                Reset Query
              </button>
            </div>

            {/* Input grids filter row */}
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-6 gap-3">
              
              {/* Keyword Search */}
              <div className="md:col-span-1">
                <label className="text-[9px] font-bold text-zinc-400 uppercase block mb-1">Text Match</label>
                <div className="relative">
                  <span className="absolute inset-y-0 left-0 flex items-center pl-2 pointer-events-none">
                    <Search className="h-3 w-3 text-zinc-500" />
                  </span>
                  <input
                    type="text"
                    placeholder="Name, ID, Agent..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full bg-[#09090b] border border-[#1f1f23] text-[10px] text-white rounded p-1.5 pl-7 focus:outline-none focus:border-emerald-500 font-medium"
                  />
                </div>
              </div>

              {/* Specialty */}
              <div>
                <label className="text-[9px] font-bold text-zinc-400 uppercase block mb-1">Specialty</label>
                <select
                  value={filterSpecialty}
                  onChange={(e) => setFilterSpecialty(e.target.value)}
                  className="w-full bg-[#09090b] border border-[#1f1f23] text-[10px] text-white rounded p-1.5 focus:outline-none"
                >
                  <option value="">All Specialties</option>
                  {specialties.map(s => <option key={s} value={s}>{s}</option>)}
                </select>
              </div>

              {/* City */}
              <div>
                <label className="text-[9px] font-bold text-zinc-400 uppercase block mb-1">City Location</label>
                <select
                  value={filterCity}
                  onChange={(e) => setFilterCity(e.target.value)}
                  className="w-full bg-[#09090b] border border-[#1f1f23] text-[10px] text-white rounded p-1.5 focus:outline-none"
                >
                  <option value="">All Cities</option>
                  {cities.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>

              {/* State */}
              <div>
                <label className="text-[9px] font-bold text-zinc-400 uppercase block mb-1">State Code</label>
                <select
                  value={filterState}
                  onChange={(e) => setFilterState(e.target.value)}
                  className="w-full bg-[#09090b] border border-[#1f1f23] text-[10px] text-white rounded p-1.5 focus:outline-none"
                >
                  <option value="">All States</option>
                  {states.map(st => <option key={st} value={st}>{st}</option>)}
                </select>
              </div>

              {/* Worked Date */}
              <div>
                <label className="text-[9px] font-bold text-zinc-400 uppercase block mb-1">Worked Date</label>
                <select
                  value={filterWorkedDate}
                  onChange={(e) => setFilterWorkedDate(e.target.value)}
                  className="w-full bg-[#09090b] border border-[#1f1f23] text-[10px] text-white rounded p-1.5 focus:outline-none"
                >
                  <option value="">All Worked Dates</option>
                  {workedDates.map(wd => <option key={wd} value={wd}>{wd}</option>)}
                </select>
              </div>

              {/* Uploaded Date */}
              <div>
                <label className="text-[9px] font-bold text-zinc-400 uppercase block mb-1">Uploaded Date</label>
                <select
                  value={filterUploadedDate}
                  onChange={(e) => setFilterUploadedDate(e.target.value)}
                  className="w-full bg-[#09090b] border border-[#1f1f23] text-[10px] text-white rounded p-1.5 focus:outline-none"
                >
                  <option value="">All Uploaded Dates</option>
                  {uploadedDates.map(ud => <option key={ud} value={ud}>{ud}</option>)}
                </select>
              </div>

            </div>
          </div>

          {/* Structured Reports Ledger Grid */}
          <div className="bg-[#121214] border border-[#1f1f23] rounded-xl overflow-hidden shadow-xl">
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-[#1f1f23]/60 text-left text-xs text-zinc-300">
                <thead className="bg-[#09090b] text-[9px] text-[#fafafa] uppercase font-bold tracking-wider selection:bg-none border-b border-[#1f1f23]">
                  <tr>
                    <th scope="col" className="px-5 py-3 cursor-pointer select-none hover:text-white border-r border-[#1f1f23]/40" onClick={() => toggleSort('providerName')}>
                      <div className="flex items-center gap-1">
                        Provider Name
                        <ArrowUpDown className="w-3 h-3 text-zinc-550" />
                      </div>
                    </th>
                    <th scope="col" className="px-5 py-3 cursor-pointer select-none hover:text-white border-r border-[#1f1f23]/40" onClick={() => toggleSort('specialty')}>
                      <div className="flex items-center gap-1">
                        Specialty
                        <ArrowUpDown className="w-3 h-3 text-zinc-550" />
                      </div>
                    </th>
                    <th scope="col" className="px-5 py-3 border-r border-[#1f1f23]/40">Location Space</th>
                    <th scope="col" className="px-5 py-3 border-r border-[#1f1f23]/40">Assigned Representative</th>
                    <th scope="col" className="px-5 py-3 cursor-pointer select-none hover:text-white border-r border-[#1f1f23]/40" onClick={() => toggleSort('uploadedDate')}>
                      <div className="flex items-center gap-1">
                        Uploaded Date
                        <ArrowUpDown className="w-3 h-3 text-zinc-550" />
                      </div>
                    </th>
                    <th scope="col" className="px-5 py-3 cursor-pointer select-none hover:text-white border-r border-[#1f1f23]/40" onClick={() => toggleSort('workedDate')}>
                      <div className="flex items-center gap-1">
                        Worked Date
                        <ArrowUpDown className="w-3 h-3 text-zinc-550" />
                      </div>
                    </th>
                    <th scope="col" className="px-5 py-3 border-r border-[#1f1f23]/40">Outreach Status</th>
                    <th scope="col" className="px-5 py-3 w-80">Latest Comment left during Representative Call</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#1f1f23]/45 bg-[#121214]/60">
                  {sortedLeads.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="px-5 py-12 text-center text-zinc-500 bg-[#09090b]/20">
                        No leads or activity trails found matching custom query boundaries.
                      </td>
                    </tr>
                  ) : (
                    sortedLeads.map((lead) => (
                      <tr key={lead.id} className="hover:bg-[#161619] transition-colors border-b border-[#1f1f23]/40">
                        {/* Name */}
                        <td className="px-5 py-3 font-semibold text-white">
                          {lead.providerName}
                        </td>

                        {/* Specialty */}
                        <td className="px-5 py-3 whitespace-nowrap">
                          <span className="bg-[#161619] text-zinc-300 text-[10px] font-bold px-2.5 py-0.5 rounded border border-[#1f1f23]">
                            {lead.specialty}
                          </span>
                        </td>

                        {/* Territoy block */}
                        <td className="px-5 py-3">
                          <div className="font-medium text-zinc-200">{lead.city}</div>
                          <div className="text-[10px] text-gray-550 font-bold uppercase">{lead.state}</div>
                        </td>

                        {/* Agent */}
                        <td className="px-5 py-3">
                          <span className="font-mono text-zinc-300 font-semibold">{lead.agentAssigned || 'Unassigned'}</span>
                        </td>

                        {/* Uploaded date */}
                        <td className="px-5 py-3 font-mono text-[10px] text-gray-450">
                          {lead.uploadedDate}
                        </td>

                        {/* Worked Date */}
                        <td className="px-5 py-3 font-mono text-[10px] text-emerald-400 font-semibold">
                          {lead.workedDate || <span className="text-gray-600 italic font-normal">Uncontacted</span>}
                        </td>

                        {/* Outreach State */}
                        <td className="px-5 py-3">
                          <span className={`text-[9px] font-black tracking-wide px-2 py-0.5 rounded uppercase border ${
                            lead.status === 'Lead' ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' :
                            lead.status === 'Not Interested' ? 'bg-rose-500/10 text-rose-400 border-rose-500/20' :
                            lead.status === 'DND' ? 'bg-amber-500/10 text-amber-500 border-amber-500/20' :
                            lead.status === 'Follow-Up' ? 'bg-amber-300/10 text-amber-300 border-amber-350/20' :
                            'bg-zinc-800 text-zinc-400'
                          }`}>
                            {lead.status === 'Lead' ? 'Interested' : lead.status}
                          </span>
                        </td>

                        {/* Latest Comment details */}
                        <td className="px-5 py-3">
                          {lead.comments.length > 0 ? (
                            <div className="flex gap-1.5 items-start">
                              <MessageCircle className="w-3.5 h-3.5 text-zinc-550 mt-0.5 shrink-0" />
                              <div>
                                <p className="text-[11px] text-zinc-300 leading-tight">
                                  {lead.comments[lead.comments.length - 1].text}
                                </p>
                                <span className="text-[9px] text-zinc-500 font-mono block mt-0.5">
                                  - logged by {lead.comments[lead.comments.length - 1].author}
                                </span>
                              </div>
                            </div>
                          ) : (
                            <span className="text-gray-600 text-[10px] italic">No outreach logs recorded.</span>
                          )}
                        </td>

                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
            
            {/* Reports matching feedback bottom strip */}
            <div className="bg-[#09090b] px-5 py-3.5 text-[10px] text-zinc-500 flex justify-between font-bold uppercase tracking-wider border-t border-[#1f1f23]">
              <span>Active Filtered Records: {sortedLeads.length} listings</span>
              <span>Lead Operations Report Audit Console</span>
            </div>
          </div>

        </div>

        {/* Right Side: Agent Task Archive Column (col-span-4) */}
        <div className="xl:col-span-4 bg-[#121214] border border-[#1f1f23] rounded-xl shadow-xl overflow-hidden p-5 flex flex-col space-y-5">
          
          <div className="flex items-center gap-2 pb-3 border-b border-[#1f1f23]">
            <Archive className="w-5 h-5 text-indigo-400" />
            <div>
              <h3 className="text-sm font-bold text-white uppercase tracking-wider font-sans">Representative Archive</h3>
              <p className="text-[10px] text-zinc-400 mt-0.5">Track any user's daily outreach tasks, complete & pending.</p>
            </div>
          </div>

          {/* Filtering Controls */}
          <div className="space-y-3.5 bg-[#09090b] p-3.5 rounded-lg border border-[#1f1f23]">
            <div>
              <label className="block text-[9px] font-black text-zinc-400 uppercase tracking-wider mb-1 flex items-center gap-1">
                <Calendar className="w-3 h-3 text-indigo-400" /> Date Selection
              </label>
              <input
                type="date"
                value={selectedArchiveDate}
                onChange={(e) => setSelectedArchiveDate(e.target.value)}
                className="w-full bg-[#121214] border border-[#1f1f23] text-xs text-white rounded p-1.5 focus:outline-none focus:border-indigo-600 focus:ring-1 focus:ring-indigo-600/20 font-medium"
              />
            </div>

            <div>
              <label className="block text-[9px] font-black text-zinc-400 uppercase tracking-wider mb-1 flex items-center gap-1">
                <UserIcon className="w-3 h-3 text-indigo-400" /> Representative User
              </label>
              <select
                value={selectedArchiveAgent}
                onChange={(e) => setSelectedArchiveAgent(e.target.value)}
                className="w-full bg-[#121214] border border-[#1f1f23] text-xs text-white rounded p-1.5 focus:outline-none focus:border-indigo-600 cursor-pointer"
              >
                <option value="">-- Choose Representative --</option>
                {users.map((u) => (
                  <option key={u.username} value={u.name}>
                    {u.name} ({u.role})
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Productivity Dashboard metrics for selected layout */}
          {selectedArchiveAgent ? (
            <div className="bg-[#09090b]/50 border border-[#1f1f23] p-4 rounded-lg space-y-3">
              <div className="flex justify-between items-center text-[10px] uppercase font-bold text-zinc-400">
                <span className="flex items-center gap-1">
                  <TrendingUp className="w-3.5 h-3.5 text-emerald-400" /> Progression Yield
                </span>
                <span className="text-emerald-400 font-mono text-xs">{archiveCompletionPercent}%</span>
              </div>
              
              <div className="w-full bg-zinc-800 h-2 rounded-full overflow-hidden">
                <div 
                  className="bg-emerald-500 h-full transition-all duration-500 rounded-full shadow-[0_0_10px_rgba(16,185,129,0.3)]" 
                  style={{ width: `${archiveCompletionPercent}%` }}
                />
              </div>

              <div className="flex justify-between text-[10px] text-zinc-400 font-mono font-medium">
                <span className="flex items-center gap-1">
                  <span className="w-2 h-2 rounded-full bg-emerald-500" />
                  {archiveCompleteTasks.length} Completed
                </span>
                <span className="flex items-center gap-1">
                  <span className="w-2 h-2 rounded-full bg-amber-500" />
                  {archivePendingTasks.length} Pending
                </span>
              </div>
            </div>
          ) : (
            <div className="bg-zinc-800/20 border border-dashed border-zinc-750 p-4 rounded-lg text-center text-xs text-zinc-500">
              Please select a user to render performance metrics.
            </div>
          )}

          {/* Complete and Pending Task lists column */}
          {selectedArchiveAgent ? (
            <div className="flex-1 flex flex-col space-y-4 max-h-[480px] overflow-y-auto pr-1">
              
              {/* Complete Section */}
              <div className="space-y-2">
                <div className="flex items-center justify-between text-[10px] font-black tracking-widest text-emerald-400 uppercase pt-2 bg-[#121214] sticky top-0 pb-1 z-10">
                  <span className="flex items-center gap-1.5">
                    <CheckCircle2 className="w-3.5 h-3.5" /> Completed Tasks ({archiveCompleteTasks.length})
                  </span>
                </div>
                
                {archiveCompleteTasks.length === 0 ? (
                  <p className="text-[11px] text-zinc-500 italic p-3 bg-zinc-900/20 border border-[#1f1f23]/40 rounded-lg">
                    No tasks marked complete or contacted by {selectedArchiveAgent} on this date.
                  </p>
                ) : (
                  <div className="space-y-2">
                    {archiveCompleteTasks.map((lead) => (
                      <div
                        key={lead.id}
                        onClick={() => setSelectedArchiveLead(lead)}
                        className="bg-[#0b0c10]/40 hover:bg-[#161619] p-3 rounded-lg border border-emerald-500/20 hover:border-emerald-500/50 transition-all cursor-pointer group text-left"
                      >
                        <div className="flex justify-between items-start gap-1">
                          <h4 className="font-bold text-xs text-white group-hover:text-emerald-300 transition-colors">
                            {lead.providerName}
                          </h4>
                          <span className={`text-[8px] font-bold px-1.5 rounded uppercase border whitespace-nowrap ${
                            lead.status === 'Lead' ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' :
                            lead.status === 'Not Interested' ? 'bg-rose-500/10 text-rose-400 border-rose-500/20' :
                            lead.status === 'DND' ? 'bg-amber-500/10 text-amber-500 border-amber-500/20' :
                            'bg-zinc-850 text-zinc-400'
                          }`}>
                            {lead.status === 'Lead' ? 'Interested' : lead.status}
                          </span>
                        </div>
                        <p className="text-[10px] text-zinc-400 font-medium mt-0.5">{lead.specialty}</p>
                        
                        {/* Short call-log extract snippet if present */}
                        {lead.comments.length > 0 && (
                          <div className="mt-2 bg-[#121214]/60 p-2 rounded text-[10px] text-zinc-350 border-l border-emerald-500/40">
                            <span className="font-bold text-[8px] block uppercase text-zinc-500 font-sans">Latest Call Comment:</span>
                            <p className="line-clamp-2 mt-0.5 leading-tight italic">
                              "{lead.comments[lead.comments.length - 1].text}"
                            </p>
                          </div>
                        )}
                        
                        <div className="flex items-center justify-between text-[9px] text-zinc-550 mt-2 font-mono pt-1.5 border-t border-[#1f1f23]/35">
                          <span>Worked on: {lead.workedDate}</span>
                          <span className="text-zinc-400 group-hover:translate-x-0.5 transition-transform flex items-center gap-0.5">
                            Audit logs <ArrowRight className="w-2.5 h-2.5" />
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Pending Section */}
              <div className="space-y-2">
                <div className="flex items-center justify-between text-[10px] font-black tracking-widest text-amber-400 uppercase pt-2 bg-[#121214] sticky top-0 pb-1 z-10">
                  <span className="flex items-center gap-1.5">
                    <Clock className="w-3.5 h-3.5" /> Pending / Queue ({archivePendingTasks.length})
                  </span>
                </div>

                {archivePendingTasks.length === 0 ? (
                  <p className="text-[11px] text-zinc-550 italic p-3 bg-zinc-900/20 border border-[#1f1f23]/40 rounded-lg">
                    Representative has caught up! No pending assignments found.
                  </p>
                ) : (
                  <div className="space-y-2">
                    {archivePendingTasks.map((lead) => (
                      <div
                        key={lead.id}
                        onClick={() => setSelectedArchiveLead(lead)}
                        className="bg-[#0b0c10]/40 hover:bg-[#161619] p-3 rounded-lg border border-amber-500/10 hover:border-amber-500/40 transition-all cursor-pointer group text-left"
                      >
                        <div className="flex justify-between items-start gap-1">
                          <h4 className="font-bold text-xs text-zinc-200 group-hover:text-amber-400 transition-colors">
                            {lead.providerName}
                          </h4>
                          <span className="text-[8px] font-bold px-1.5 rounded uppercase bg-amber-500/10 text-amber-400 border border-amber-500/20 whitespace-nowrap">
                            {lead.status}
                          </span>
                        </div>
                        <p className="text-[10px] text-zinc-400 font-medium mt-0.5">{lead.specialty}</p>
                        
                        <div className="flex flex-col gap-1 mt-2 text-[10px] text-zinc-400 font-mono">
                          {lead.followUpDate && (
                            <span className="text-amber-300 bg-amber-500/5 py-0.5 px-1.5 rounded max-w-max text-[9px] font-bold">
                              🗓️ Follow Up Scheduled: {lead.followUpDate}
                            </span>
                          )}
                          <div className="flex justify-between items-center text-[9px] text-zinc-555 mt-1 pt-1.5 border-t border-[#1f1f23]/35 font-sans font-semibold">
                            <span>Phone: {lead.phone || 'None'}</span>
                            <span className="text-zinc-400 flex items-center gap-0.5 group-hover:translate-x-0.5 transition-transform font-mono">
                              Inspect <ArrowRight className="w-2.5 h-2.5" />
                            </span>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

            </div>
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center py-12 text-center text-zinc-500 space-y-2 bg-[#09090b]/20 border border-[#1f1f23] border-dashed rounded-lg">
              <ClipboardList className="w-8 h-8 text-zinc-600" />
              <p className="text-xs">Select a representative from the user directory menu above to inspect their daily outreach load.</p>
            </div>
          )}

        </div>

      </div>

      {/* Selected Archive Lead Quick Details Modal Pop-Up Dialog */}
      <AnimatePresence>
        {selectedArchiveLead && (
          <div className="fixed inset-0 bg-black/75 flex items-center justify-center p-4 z-50 backdrop-blur-xs">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-[#121214] border border-[#1f1f23] rounded-xl overflow-hidden w-full max-w-xl shadow-2xl flex flex-col max-h-[85vh]"
            >
              <div className="p-4 border-b border-[#1f1f23] flex justify-between items-center bg-[#161619]">
                <div className="flex items-center gap-2">
                  <FileText className="w-4 h-4 text-indigo-400" />
                  <span className="text-[10px] uppercase font-black tracking-widest text-zinc-400 font-mono">Provider Outreach Profile</span>
                </div>
                <button
                  onClick={() => setSelectedArchiveLead(null)}
                  className="p-1 rounded bg-[#09090b]/50 border border-[#1f1f23] hover:text-white transition-colors cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="p-5 overflow-y-auto space-y-4 text-xs">
                
                {/* Header info */}
                <div>
                  <h3 className="text-base font-bold text-white leading-tight">{selectedArchiveLead.providerName}</h3>
                  <p className="text-emerald-400 font-semibold text-xs mt-0.5">{selectedArchiveLead.specialty}</p>
                </div>

                {/* Primary Card metrics details */}
                <div className="grid grid-cols-2 gap-3 bg-[#09090b] p-4 rounded-lg border border-[#1f1f23]">
                  <div>
                    <span className="text-[9px] font-bold uppercase tracking-wider text-zinc-500 block">Lead ID</span>
                    <span className="text-[10px] font-mono text-zinc-300 font-medium">{selectedArchiveLead.id}</span>
                  </div>
                  <div>
                    <span className="text-[9px] font-bold uppercase tracking-wider text-zinc-500 block">Outreach Status</span>
                    <span className={`inline-block text-[9px] font-bold uppercase tracking-wide px-2 py-0.5 rounded border mt-0.5 ${
                      selectedArchiveLead.status === 'Lead' ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' :
                      selectedArchiveLead.status === 'Not Interested' ? 'bg-rose-500/10 text-rose-400 border-rose-500/20' :
                      selectedArchiveLead.status === 'DND' ? 'bg-amber-500/10 text-amber-500 border-amber-500/20' :
                      selectedArchiveLead.status === 'Follow-Up' ? 'bg-amber-300/10 text-amber-300 border-amber-350/20' :
                      'bg-zinc-800 text-zinc-400'
                    }`}>
                      {selectedArchiveLead.status === 'Lead' ? 'Interested' : selectedArchiveLead.status}
                    </span>
                  </div>

                  <div>
                    <span className="text-[9px] font-bold uppercase tracking-wider text-zinc-500 block mt-1">Telephone Line</span>
                    <span className="text-zinc-200 flex items-center gap-1 font-mono font-medium">
                      <Phone className="w-3.5 h-3.5 text-zinc-500" /> {selectedArchiveLead.phone || 'No phone listed'}
                    </span>
                  </div>
                  <div>
                    <span className="text-[9px] font-bold uppercase tracking-wider text-zinc-500 block mt-1">Email Connection</span>
                    <span className="text-zinc-200 flex items-center gap-1 font-mono font-medium truncate">
                      <Mail className="w-3.5 h-3.5 text-zinc-500" /> {selectedArchiveLead.email || 'No email listed'}
                    </span>
                  </div>

                  <div>
                    <span className="text-[9px] font-bold uppercase tracking-wider text-zinc-500 block mt-1">State & City Location</span>
                    <span className="text-zinc-200 font-medium">
                      {selectedArchiveLead.city}, {selectedArchiveLead.state}
                    </span>
                  </div>
                  <div>
                    <span className="text-[9px] font-bold uppercase tracking-wider text-zinc-500 block mt-1">Assigned Executive</span>
                    <span className="text-indigo-400 font-semibold font-mono">
                      {selectedArchiveLead.agentAssigned || 'Unassigned / Pool'}
                    </span>
                  </div>
                </div>

                {/* Sub audit timelines */}
                <div className="grid grid-cols-2 gap-3 text-[10px] bg-[#09090b]/50 p-2.5 rounded border border-[#1f1f23]">
                  <div>
                    <span className="text-zinc-500">File Uploaded Date:</span>
                    <span className="font-mono text-zinc-350 font-bold block">{selectedArchiveLead.uploadedDate}</span>
                  </div>
                  <div>
                    <span className="text-zinc-500">Last Outbound Contact:</span>
                    <span className="font-mono text-emerald-400 font-bold block">
                      {selectedArchiveLead.workedDate || 'Never Contacted'}
                    </span>
                  </div>
                  {selectedArchiveLead.followUpDate && (
                    <div className="col-span-2 text-amber-400 font-bold">
                      ⚠️ Next Follow-Up Scheduled on: {selectedArchiveLead.followUpDate}
                    </div>
                  )}
                </div>

                {/* All logged dialog notes comments */}
                <div className="space-y-2">
                  <h4 className="font-bold text-xs text-white uppercase tracking-wider">Representative Conversation Trail</h4>
                  
                  {selectedArchiveLead.comments.length === 0 ? (
                    <p className="text-zinc-500 italic text-[11px] p-3 text-center bg-[#09090b] rounded border border-[#1f1f23]">
                      No recorded outbound attempts or talk details are logged.
                    </p>
                  ) : (
                    <div className="space-y-2 max-h-40 overflow-y-auto pr-1">
                      {selectedArchiveLead.comments.map((cm) => (
                        <div key={cm.id} className="bg-[#09090b] p-3 rounded-lg border border-[#1f1f23] space-y-1">
                          <p className="text-zinc-300 font-sans italic">"{cm.text}"</p>
                          <div className="flex justify-between text-[9px] text-zinc-550 font-mono">
                            <span>Author: @{cm.author}</span>
                            <span>{cm.timestamp}</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

              </div>
              <div className="p-3 bg-[#161619] border-t border-[#1f1f23] flex justify-end">
                <button
                  type="button"
                  onClick={() => setSelectedArchiveLead(null)}
                  className="bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs py-1.5 px-4 rounded-lg cursor-pointer transition-colors"
                >
                  Close Lookup
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

    </div>
  );
}
