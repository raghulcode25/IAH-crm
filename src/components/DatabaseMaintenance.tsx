import React, { useState, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Upload, 
  Download, 
  Plus, 
  Edit, 
  Trash2, 
  CheckCircle, 
  FileText, 
  Search, 
  X, 
  Sparkles,
  AlertCircle,
  Lock
} from 'lucide-react';
import { Lead, UploadHistory, LeadStatus } from '../types';

interface DatabaseMaintenanceProps {
  leads: Lead[];
  uploads: UploadHistory[];
  agents: string[];
  onAddLead: (lead: Omit<Lead, 'id' | 'uploadedDate' | 'uploadId' | 'status' | 'agentAssigned' | 'comments' | 'followUpDate' | 'workedDate'>) => void;
  onEditLead: (updatedLead: Lead) => void;
  onDeleteLead: (leadId: string) => void;
  onUploadFile: (fileName: string, parsedLeads: Omit<Lead, 'id' | 'uploadedDate' | 'uploadId' | 'status' | 'agentAssigned' | 'comments' | 'followUpDate' | 'workedDate'>[]) => void;
}

export default function DatabaseMaintenance({
  leads,
  uploads,
  agents,
  onAddLead,
  onEditLead,
  onDeleteLead,
  onUploadFile,
}: DatabaseMaintenanceProps) {
  const [activeTab, setActiveTab] = useState<'leads' | 'not-interested' | 'dnd' | 'uploads'>('leads');
  const [searchQuery, setSearchQuery] = useState('');
  const [dragActive, setDragActive] = useState(false);
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingLead, setEditingLead] = useState<Lead | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Manual Form State
  const [formData, setFormData] = useState({
    providerName: '',
    specialty: '',
    city: '',
    state: '',
    phone: '',
    email: '',
  });

  // Filter leads according to categories
  // "Leads" tab displays status = 'Leads' or 'Follow-Up' or 'Lead' (since "Once moved to Not Interested or DND, it shouldn't show in active Leads table")
  const activeLeads = leads.filter(l => l.status === 'Leads' || l.status === 'Follow-Up' || l.status === 'Lead');
  const notInterestedLeads = leads.filter(l => l.status === 'Not Interested');
  const dndLeads = leads.filter(l => l.status === 'DND');

  const visibleLeads = (() => {
    let list: Lead[] = [];
    if (activeTab === 'leads') list = activeLeads;
    else if (activeTab === 'not-interested') list = notInterestedLeads;
    else if (activeTab === 'dnd') list = dndLeads;
    else return [];

    if (!searchQuery) return list;
    const q = searchQuery.toLowerCase();
    return list.filter(l => 
      l.providerName.toLowerCase().includes(q) ||
      l.specialty.toLowerCase().includes(q) ||
      l.city.toLowerCase().includes(q) ||
      l.state.toLowerCase().includes(q) ||
      l.email.toLowerCase().includes(q) ||
      l.phone.includes(q)
    );
  })();

  // Handle Drag & Drop Events
  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const processCSVText = (text: string, fileName: string) => {
    try {
      const lines = text.split(/\r?\n/).filter(line => line.trim() !== '');
      if (lines.length === 0) {
        throw new Error('The file is empty.');
      }
      
      const header = lines[0].split(',').map(h => h.trim().replace(/^["']|["']$/g, ''));
      const expectedFields = ['Provider Name', 'Specialty', 'City', 'State', 'Phone', 'Email'];
      
      // Validation check
      const containsAll = expectedFields.every(field => 
        header.some(h => h.toLowerCase() === field.toLowerCase())
      );

      if (!containsAll) {
        throw new Error(`Invalid headers. Read columns: [${header.join(', ')}]. File must match template structure exactly: [Provider Name, Specialty, City, State, Phone, Email]`);
      }

      // Map indices
      const idxName = header.findIndex(h => h.toLowerCase() === 'provider name');
      const idxSpecialty = header.findIndex(h => h.toLowerCase() === 'specialty');
      const idxCity = header.findIndex(h => h.toLowerCase() === 'city');
      const idxState = header.findIndex(h => h.toLowerCase() === 'state');
      const idxPhone = header.findIndex(h => h.toLowerCase() === 'phone');
      const idxEmail = header.findIndex(h => h.toLowerCase() === 'email');

      const parsedLeads: Omit<Lead, 'id' | 'uploadedDate' | 'uploadId' | 'status' | 'agentAssigned' | 'comments' | 'followUpDate' | 'workedDate'>[] = [];

      for (let i = 1; i < lines.length; i++) {
        // Regex to handle commas inside quotes cleanly
        const parsedLine = lines[i].match(/(".*?"|[^",\s]+)(?=\s*,|\s*$)/g) || lines[i].split(',');
        const row = parsedLine.map(v => v.trim().replace(/^["']|["']$/g, ''));
        
        if (row.length < 5) continue; // Skip incomplete lines

        const pName = row[idxName] || '';
        const pSpecialty = row[idxSpecialty] || '';
        const pCity = row[idxCity] || '';
        const pState = row[idxState] || '';
        const pPhone = row[idxPhone] || '';
        const pEmail = row[idxEmail] || '';

        if (!pName) continue; // Require provider name

        parsedLeads.push({
          providerName: pName,
          specialty: pSpecialty,
          city: pCity,
          state: pState,
          phone: pPhone,
          email: pEmail
        });
      }

      if (parsedLeads.length === 0) {
        throw new Error('No valid lead records found after parsing row details.');
      }

      onUploadFile(fileName, parsedLeads);
      setSuccessMsg(`Successfully uploaded "${fileName}" and imported ${parsedLeads.length} leads.`);
      setErrorMsg(null);
      setTimeout(() => setSuccessMsg(null), 5000);
    } catch (err: any) {
      setErrorMsg(err.message || 'Error occurred while processing file.');
      setSuccessMsg(null);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      const file = e.dataTransfer.files[0];
      const reader = new FileReader();
      reader.onload = (evt) => {
        if (evt.target?.result) {
          processCSVText(evt.target.result as string, file.name);
        }
      };
      reader.readAsText(file);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      const reader = new FileReader();
      reader.onload = (evt) => {
        if (evt.target?.result) {
          processCSVText(evt.target.result as string, file.name);
        }
      };
      reader.readAsText(file);
    }
  };

  // Generate and Download Template File
  const handleDownloadTemplate = () => {
    const csvContent = 
      "Provider Name,Specialty,City,State,Phone,Email\n" +
      "Dr. Gregory House,Diagnostics,Princeton,NJ,609-555-0810,ghouse@princetonmed.org\n" +
      "Dr. Meredith Grey,General Surgery,Seattle,WA,206-555-0199,mgrey@seattlegrace.org\n" +
      "Dr. Stephen Strange,Neurosurgery,New York,NY,212-555-0770,strange@santummed.org\n" +
      "Dr. Leonard McCoy,Exomedicine,Boston,MA,617-555-0321,mccoy@enterprisehealth.com\n" +
      "Dr. Michaela Quinn,Family Medicine,Denver,CO,303-555-4089,mquinn@coloradomed.net\n";

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", "lead_operations_template.csv");
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const triggerFileSelect = () => {
    fileInputRef.current?.click();
  };

  // Submit manual add
  const handleAddSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.providerName.trim()) {
      setErrorMsg("Provider Name is required.");
      return;
    }
    onAddLead(formData);
    setSuccessMsg(`Lead "${formData.providerName}" successfully created.`);
    setShowAddModal(false);
    setFormData({
      providerName: '',
      specialty: '',
      city: '',
      state: '',
      phone: '',
      email: '',
    });
    setTimeout(() => setSuccessMsg(null), 4000);
  };

  // Submit edit
  const handleEditSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (editingLead) {
      if (!editingLead.providerName.trim()) return;
      onEditLead(editingLead);
      setSuccessMsg(`Lead "${editingLead.providerName}" successfully updated.`);
      setEditingLead(null);
      setTimeout(() => setSuccessMsg(null), 4000);
    }
  };

  return (
    <div className="flex flex-col h-full bg-[#09090b] text-zinc-300 p-6 space-y-6">
      {/* Top Controls Area */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-[#121214] p-5 rounded-xl border border-[#1f1f23] shadow-lg shadow-black/10">
        <div>
          <h2 className="text-lg font-bold text-white flex items-center gap-2.5">
            <Sparkles className="text-indigo-400 w-5 h-5" />
            Database Maintenance
          </h2>
          <p className="text-xs text-zinc-400 mt-1">
            Maintain provider records, batch import CSV files, track upload logs, or manually add or edit data.
          </p>
        </div>
        
        <div className="flex items-center gap-3">
          <button
            onClick={handleDownloadTemplate}
            className="flex items-center gap-2 bg-[#161619] hover:bg-zinc-800 text-indigo-400 text-xs font-semibold py-2 px-3.5 rounded-lg border border-[#1f1f23] transition-colors"
          >
            <Download className="w-3.5 h-3.5" />
            Download CSV Template
          </button>
          
          <button
            onClick={() => {
              setErrorMsg(null);
              setShowAddModal(true);
            }}
            className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold py-2 px-4 rounded-lg shadow-md shadow-indigo-600/15 transition-transform active:scale-95 cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            Add Lead Manually
          </button>
        </div>
      </div>

      {/* Notifications */}
      <AnimatePresence>
        {successMsg && (
          <motion.div 
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="bg-emerald-950/40 border border-emerald-500/30 text-emerald-300 p-4 rounded-lg flex items-start gap-3 text-sm"
          >
            <CheckCircle className="w-5 h-5 text-emerald-400 shrink-0 mt-0.5" />
            <span>{successMsg}</span>
          </motion.div>
        )}

        {errorMsg && (
          <motion.div 
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="bg-rose-950/40 border border-rose-500/30 text-rose-300 p-4 rounded-lg flex items-start gap-3 text-sm"
          >
            <AlertCircle className="w-5 h-5 text-rose-400 shrink-0 mt-0.5" />
            <div className="flex-1">
              <span className="font-semibold block mb-0.5">Import / Validation Error</span>
              <span>{errorMsg}</span>
            </div>
            <button onClick={() => setErrorMsg(null)} className="text-rose-400 hover:text-white">
              <X className="w-4 h-4" />
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Main Grid: Upload Area & Table Tabs */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 items-start">
        
        {/* Left Side: Upload Panel & History */}
        <div className="lg:col-span-1 space-y-6">
          
          {/* File drag drop block */}
          <div 
            onDragEnter={handleDrag}
            onDragOver={handleDrag}
            onDragLeave={handleDrag}
            onDrop={handleDrop}
            onClick={triggerFileSelect}
            className={`border-2 border-dashed rounded-xl p-6 text-center cursor-pointer transition-all ${
              dragActive 
                ? 'border-indigo-500 bg-indigo-950/10' 
                : 'border-[#1f1f23] bg-[#121214]/50 hover:bg-[#121214]/80'
            }`}
          >
            <input 
              ref={fileInputRef}
              type="file" 
              accept=".csv" 
              className="hidden" 
              onChange={handleFileChange}
            />
            <div className="flex flex-col items-center gap-3">
              <div className="w-12 h-12 bg-indigo-500/10 rounded-full flex items-center justify-center text-indigo-400">
                <Upload className="w-6 h-6 animate-bounce" />
              </div>
              <div>
                <p className="text-sm font-semibold text-white">Drag & drop CSV lead file</p>
                <p className="text-xs text-zinc-500 mt-1">or click to browse local files</p>
              </div>
              <div className="text-[10px] text-zinc-400 bg-[#09090b] py-1 px-2.5 rounded-full mt-2 inline-block">
                Must match template headers exactly
              </div>
            </div>
          </div>

          {/* Upload History list */}
          <div className="bg-[#121214] rounded-xl border border-[#1f1f23] p-4">
            <h3 className="text-xs font-bold tracking-wider text-zinc-400 uppercase mb-3 flex items-center gap-1.5">
              <FileText className="w-3.5 h-3.5 text-zinc-400" />
              Uploaded Files Log ({uploads.length})
            </h3>
            
            {uploads.length === 0 ? (
              <p className="text-xs text-zinc-500 py-4 text-center">No uploads recorded yet.</p>
            ) : (
              <div className="space-y-2 max-h-[220px] overflow-y-auto pr-1">
                {uploads.map((up) => (
                  <div key={up.id} className="p-3 bg-[#09090b] rounded-lg border border-[#1f1f23] flex flex-col gap-1 hover:border-zinc-700">
                    <span className="text-xs font-medium text-white line-clamp-1" title={up.fileName}>
                      {up.fileName}
                    </span>
                    <div className="flex justify-between items-center text-[10px] text-zinc-400 mt-1">
                      <span>Imported {up.recordCount} rows</span>
                      <span className="font-mono">{up.uploadDate}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Right Side: Database Grid View */}
        <div className="lg:col-span-3 bg-[#121214] rounded-xl border border-[#1f1f23] shadow-lg overflow-hidden">
          
          {/* Tab Navigation & Search */}
          <div className="flex flex-col md:flex-row justify-between items-stretch md:items-center p-4 border-b border-[#1f1f23] bg-[#161619] gap-3">
            <div className="flex items-center bg-[#09090b] p-1 rounded-lg border border-[#1f1f23] self-start">
              <button
                onClick={() => { setActiveTab('leads'); setSearchQuery(''); }}
                className={`text-xs font-bold px-4 py-2 rounded-md transition-all cursor-pointer ${
                  activeTab === 'leads' 
                    ? 'bg-indigo-600/10 text-indigo-400 border border-indigo-500/20 shadow-md' 
                    : 'text-zinc-400 hover:text-zinc-200'
                }`}
              >
                Leads Active ({activeLeads.length})
              </button>
              
              <button
                onClick={() => { setActiveTab('not-interested'); setSearchQuery(''); }}
                className={`text-xs font-bold px-4 py-2 rounded-md transition-all cursor-pointer ${
                  activeTab === 'not-interested' 
                    ? 'bg-rose-500/10 text-rose-450 border border-rose-500/30' 
                    : 'text-zinc-400 hover:text-zinc-200'
                }`}
              >
                Not Interested ({notInterestedLeads.length})
              </button>

              <button
                onClick={() => { setActiveTab('dnd'); setSearchQuery(''); }}
                className={`text-xs font-bold px-4 py-2 rounded-md transition-all cursor-pointer ${
                  activeTab === 'dnd' 
                    ? 'bg-amber-500/10 text-amber-400 border border-amber-500/30' 
                    : 'text-zinc-400 hover:text-zinc-200'
                }`}
              >
                DND ({dndLeads.length})
              </button>
            </div>

            <div className="relative">
              <span className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none">
                <Search className="h-4 w-4 text-zinc-500" />
              </span>
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search database records..."
                className="block w-full md:w-64 bg-[#09090b] text-zinc-200 text-xs pl-9 pr-4 py-2 rounded-lg border border-[#1f1f23] focus:outline-none focus:border-indigo-600 focus:ring-1 focus:ring-indigo-600/20 transition-all font-medium placeholder-zinc-500"
              />
            </div>
          </div>

          {/* Database Grid Table */}
          <div className="overflow-x-auto min-h-[350px]">
            <table className="min-w-full divide-y divide-[#1f1f23] text-left text-xs text-zinc-300">
              <thead className="bg-[#09090b] text-[10px] text-zinc-400 font-bold uppercase tracking-wider">
                <tr>
                  <th scope="col" className="px-5 py-3">Provider Details</th>
                  <th scope="col" className="px-5 py-3">Specialty</th>
                  <th scope="col" className="px-5 py-3">Location</th>
                  <th scope="col" className="px-5 py-3">Contact</th>
                  <th scope="col" className="px-5 py-3">System Info</th>
                  <th scope="col" className="px-5 py-3 text-center">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#1f1f23]/60 bg-[#121214]/20">
                {visibleLeads.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-5 py-12 text-center text-zinc-500 font-medium">
                      No matching records found in this category.
                    </td>
                  </tr>
                ) : (
                  visibleLeads.map((lead) => (
                    <tr key={lead.id} className="hover:bg-[#161619]/60 transition-colors group">
                      {/* Name */}
                      <td className="px-5 py-3.5">
                        <div className="font-bold text-white group-hover:text-indigo-400 transition-colors">
                          {lead.providerName}
                        </div>
                        <div className="text-[10px] text-zinc-500 mt-0.5 font-mono">
                          ID: <span>{lead.id}</span>
                        </div>
                      </td>

                      {/* Specialty */}
                      <td className="px-5 py-3.5 whitespace-nowrap">
                        <span className="bg-zinc-800 text-zinc-300 text-[10px] font-semibold px-2.5 py-1 rounded-md">
                          {lead.specialty || 'General'}
                        </span>
                      </td>

                      {/* Location */}
                      <td className="px-5 py-3.5">
                        <div className="font-medium text-zinc-300">{lead.city}</div>
                        <div className="text-[10px] text-zinc-500 mt-0.5 font-bold uppercase tracking-wider">{lead.state}</div>
                      </td>

                      {/* Contact */}
                      <td className="px-5 py-3.5">
                        <div className="font-mono text-[11px] text-zinc-300">{lead.phone || '—'}</div>
                        <div className="text-zinc-400 text-[11px] hover:underline cursor-pointer">{lead.email || '—'}</div>
                      </td>

                      {/* Status / Log */}
                      <td className="px-5 py-3.5 text-[10px]">
                        <div className="flex items-center gap-1.5">
                          <span className="text-zinc-500">Status:</span>
                          <span className={`font-semibold ${
                            lead.status === 'Leads' ? 'text-zinc-400' :
                            lead.status === 'Not Interested' ? 'text-rose-450' :
                            lead.status === 'DND' ? 'text-amber-500' :
                            lead.status === 'Lead' ? 'text-teal-400' :
                            'text-sky-400' // Follow-Up
                          }`}>
                            {lead.status === 'Lead' ? 'Interested' : lead.status}
                          </span>
                        </div>
                        <div className="text-zinc-400 mt-1">
                          Assigned: <span className="text-zinc-300 font-mono font-medium">{lead.agentAssigned || 'Unallocated'}</span>
                        </div>
                        <div className="text-[9px] text-zinc-500 mt-0.5">
                          Uploaded: {lead.uploadedDate}
                        </div>
                      </td>

                      {/* Operations */}
                      <td className="px-5 py-3.5 text-center whitespace-nowrap">
                        <div className="flex items-center justify-center gap-1.5">
                          <button
                            onClick={() => setEditingLead({ ...lead })}
                            className="bg-zinc-800 hover:bg-zinc-700 text-indigo-400 p-2 rounded-lg transition-transform active:scale-90 cursor-pointer"
                            title="Edit Record"
                          >
                            <Edit className="w-3.5 h-3.5" />
                          </button>
                          
                          <button
                            disabled
                            className="bg-zinc-900 text-zinc-600 p-2 rounded-lg cursor-not-allowed opacity-55"
                            title="Deletions not permitted for managers"
                          >
                            <Lock className="w-3.5 h-3.5 text-zinc-500" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
          
          {/* Footer stats */}
          <div className="bg-[#09090b] px-5 py-3 text-[10px] text-zinc-400 border-t border-[#1f1f23] flex justify-between">
            <span>Showing {visibleLeads.length} providers</span>
            <span>Active database leads: {activeLeads.length} | DND leads: {dndLeads.length}</span>
          </div>

        </div>
      </div>

      {/* Manual Add Lead Modal */}
      <AnimatePresence>
        {showAddModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
            <motion.div 
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-[#121214] w-full max-w-lg rounded-xl border border-[#1f1f23] overflow-hidden shadow-2xl"
            >
              {/* Modal Header */}
              <div className="px-6 py-4 bg-[#09090b] border-b border-[#1f1f23] flex justify-between items-center">
                <h3 className="font-bold text-white text-sm tracking-wide">Create Provider Lead Record</h3>
                <button 
                  onClick={() => setShowAddModal(false)}
                  className="text-zinc-400 hover:text-white transition-transform active:scale-90 cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Modal Form */}
              <form onSubmit={handleAddSubmit} className="p-6 space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  
                  <div className="col-span-2">
                    <label className="block text-[10px] font-bold text-zinc-400 uppercase tracking-wider mb-1.5">Provider Name *</label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. Dr. Jane Smith"
                      value={formData.providerName}
                      onChange={(e) => setFormData({ ...formData, providerName: e.target.value })}
                      className="w-full bg-[#09090b] border border-[#1f1f23] rounded-lg py-2 px-3 focus:outline-none focus:border-indigo-600 focus:ring-1 focus:ring-indigo-600/20 text-xs text-white"
                    />
                  </div>

                  <div>
                    <label className="block text-[10px] font-bold text-zinc-400 uppercase tracking-wider mb-1.5">Specialty</label>
                    <input
                      type="text"
                      placeholder="e.g. Cardiology"
                      value={formData.specialty}
                      onChange={(e) => setFormData({ ...formData, specialty: e.target.value })}
                      className="w-full bg-[#09090b] border border-[#1f1f23] rounded-lg py-2 px-3 focus:outline-none focus:border-indigo-600 focus:ring-1 focus:ring-indigo-600/20 text-xs text-white"
                    />
                  </div>

                  <div>
                    <label className="block text-[10px] font-bold text-zinc-400 uppercase tracking-wider mb-1.5">Email Address</label>
                    <input
                      type="email"
                      placeholder="e.g. jsmith@cardio.com"
                      value={formData.email}
                      onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                      className="w-full bg-[#09090b] border border-[#1f1f23] rounded-lg py-2 px-3 focus:outline-none focus:border-indigo-600 focus:ring-1 focus:ring-indigo-600/20 text-xs text-white"
                    />
                  </div>

                  <div>
                    <label className="block text-[10px] font-bold text-zinc-400 uppercase tracking-wider mb-1.5">Phone Number</label>
                    <input
                      type="text"
                      placeholder="e.g. 212-555-0100"
                      value={formData.phone}
                      onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                      className="w-full bg-[#09090b] border border-[#1f1f23] rounded-lg py-2 px-3 focus:outline-none focus:border-indigo-600 focus:ring-1 focus:ring-indigo-600/20 text-xs text-white"
                    />
                  </div>

                  <div>
                    <label className="block text-[10px] font-bold text-zinc-400 uppercase tracking-wider mb-1.5">State (2 Letter)</label>
                    <input
                      type="text"
                      maxLength={2}
                      placeholder="e.g. NY"
                      value={formData.state}
                      onChange={(e) => setFormData({ ...formData, state: e.target.value.toUpperCase() })}
                      className="w-full bg-[#09090b] border border-[#1f1f23] rounded-lg py-2 px-3 focus:outline-none focus:border-indigo-600 focus:ring-1 focus:ring-indigo-600/20 text-xs text-white uppercase font-semibold text-center"
                    />
                  </div>

                  <div className="col-span-2">
                    <label className="block text-[10px] font-bold text-zinc-400 uppercase tracking-wider mb-1.5">City</label>
                    <input
                      type="text"
                      placeholder="e.g. New York"
                      value={formData.city}
                      onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                      className="w-full bg-[#09090b] border border-[#1f1f23] rounded-lg py-2 px-3 focus:outline-none focus:border-indigo-600 focus:ring-1 focus:ring-indigo-600/20 text-xs text-white"
                    />
                  </div>

                </div>

                <div className="pt-4 border-t border-[#1f1f23] flex justify-end gap-3">
                  <button
                    type="button"
                    onClick={() => setShowAddModal(false)}
                    className="bg-zinc-800 hover:bg-zinc-700 text-zinc-300 font-semibold text-xs py-2 px-4 rounded-lg cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs py-2 px-6 rounded-lg shadow-md shadow-indigo-600/15 cursor-pointer"
                  >
                    Create Lead
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Edit Lead Modal */}
      <AnimatePresence>
        {editingLead && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
            <motion.div 
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-[#121214] w-full max-w-lg rounded-xl border border-[#1f1f23] overflow-hidden shadow-2xl"
            >
              {/* Modal Header */}
              <div className="px-6 py-4 bg-[#09090b] border-b border-[#1f1f23] flex justify-between items-center">
                <h3 className="font-bold text-white text-sm tracking-wide">Edit Lead Informational Record</h3>
                <button 
                  onClick={() => setEditingLead(null)}
                  className="text-zinc-400 hover:text-white transition-transform active:scale-90 cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Modal Form */}
              <form onSubmit={handleEditSubmit} className="p-6 space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  
                  <div className="col-span-2">
                    <label className="block text-[10px] font-bold text-zinc-400 uppercase tracking-wider mb-1.5">Provider Name *</label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. Dr. Jane Smith"
                      value={editingLead.providerName}
                      onChange={(e) => setEditingLead({ ...editingLead, providerName: e.target.value })}
                      className="w-full bg-[#09090b] border border-[#1f1f23] rounded-lg py-2 px-3 focus:outline-none focus:border-indigo-600 focus:ring-1 focus:ring-indigo-600/20 text-xs text-white"
                    />
                  </div>

                  <div>
                    <label className="block text-[10px] font-bold text-zinc-400 uppercase tracking-wider mb-1.5">Specialty</label>
                    <input
                      type="text"
                      placeholder="e.g. Cardiology"
                      value={editingLead.specialty}
                      onChange={(e) => setEditingLead({ ...editingLead, specialty: e.target.value })}
                      className="w-full bg-[#09090b] border border-[#1f1f23] rounded-lg py-2 px-3 focus:outline-none focus:border-indigo-600 focus:ring-1 focus:ring-indigo-600/20 text-xs text-white"
                    />
                  </div>

                  <div>
                    <label className="block text-[10px] font-bold text-zinc-400 uppercase tracking-wider mb-1.5">Email Address</label>
                    <input
                      type="email"
                      placeholder="e.g. jsmith@cardio.com"
                      value={editingLead.email}
                      onChange={(e) => setEditingLead({ ...editingLead, email: e.target.value })}
                      className="w-full bg-[#09090b] border border-[#1f1f23] rounded-lg py-2 px-3 focus:outline-none focus:border-indigo-600 focus:ring-1 focus:ring-indigo-600/20 text-xs text-white"
                    />
                  </div>

                  <div>
                    <label className="block text-[10px] font-bold text-zinc-400 uppercase tracking-wider mb-1.5">Phone Number</label>
                    <input
                      type="text"
                      placeholder="e.g. 212-555-0100"
                      value={editingLead.phone}
                      onChange={(e) => setEditingLead({ ...editingLead, phone: e.target.value })}
                      className="w-full bg-[#09090b] border border-[#1f1f23] rounded-lg py-2 px-3 focus:outline-none focus:border-indigo-600 focus:ring-1 focus:ring-indigo-600/20 text-xs text-white"
                    />
                  </div>

                  <div>
                    <label className="block text-[10px] font-bold text-zinc-400 uppercase tracking-wider mb-1.5">State (2 Letter)</label>
                    <input
                      type="text"
                      maxLength={2}
                      placeholder="e.g. NY"
                      value={editingLead.state}
                      onChange={(e) => setEditingLead({ ...editingLead, state: e.target.value.toUpperCase() })}
                      className="w-full bg-[#09090b] border border-[#1f1f23] rounded-lg py-2 px-3 focus:outline-none focus:border-indigo-600 focus:ring-1 focus:ring-indigo-600/20 text-xs text-white uppercase font-semibold text-center"
                    />
                  </div>

                  <div className="col-span-2">
                    <label className="block text-[10px] font-bold text-zinc-400 uppercase tracking-wider mb-1.5">City</label>
                    <input
                      type="text"
                      placeholder="e.g. New York"
                      value={editingLead.city}
                      onChange={(e) => setEditingLead({ ...editingLead, city: e.target.value })}
                      className="w-full bg-[#09090b] border border-[#1f1f23] rounded-lg py-2 px-3 focus:outline-none focus:border-indigo-600 focus:ring-1 focus:ring-indigo-600/20 text-xs text-white"
                    />
                  </div>

                  <div>
                    <label className="block text-[10px] font-bold text-zinc-400 uppercase tracking-wider mb-1.5">Global Status</label>
                    <select
                      value={editingLead.status}
                      onChange={(e) => setEditingLead({ ...editingLead, status: e.target.value as LeadStatus })}
                      className="w-full bg-[#09090b] border border-[#1f1f23] rounded-lg py-2 px-3 focus:outline-none focus:border-indigo-600 focus:ring-1 focus:ring-indigo-600/20 text-xs text-white"
                    >
                      <option value="Leads">Leads (Active)</option>
                      <option value="Follow-Up font-sans">Follow-Up (Active)</option>
                      <option value="Lead font-sans">Lead - Interested (Active)</option>
                      <option value="Not Interested font-sans">Not Interested (Database Tab)</option>
                      <option value="DND font-sans">DND (Do Not Disturb)</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-[10px] font-bold text-zinc-400 uppercase tracking-wider mb-1.5">Assigned Agent</label>
                    <select
                      value={editingLead.agentAssigned || ''}
                      onChange={(e) => setEditingLead({ ...editingLead, agentAssigned: e.target.value || null })}
                      className="w-full bg-[#09090b] border border-[#1f1f23] rounded-lg py-2 px-3 focus:outline-none focus:border-indigo-600 focus:ring-1 focus:ring-indigo-600/20 text-xs text-white"
                    >
                      <option value="">-- Unassigned --</option>
                      {agents.map(a => (
                        <option key={a} value={a}>{a}</option>
                      ))}
                    </select>
                  </div>

                </div>

                <div className="pt-4 border-t border-[#1f1f23] flex justify-end gap-3">
                  <button
                    type="button"
                    onClick={() => setEditingLead(null)}
                    className="bg-zinc-800 hover:bg-zinc-700 text-zinc-300 font-semibold text-xs py-2 px-4 rounded-lg cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs py-2 px-6 rounded-lg shadow-md shadow-indigo-600/15 cursor-pointer"
                  >
                    Save Changes
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
