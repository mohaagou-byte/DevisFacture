import React, { useState, useEffect } from 'react';
import { useNavigate, useParams, Link } from 'react-router-dom';
import { StorageService } from '../services/storageService';
import { Client, Payment, DocumentData, DocType, Project, ProjectImage } from '../types';
import { compressImage } from '../services/geminiService';

// --- Helper: Calculate Client Financials ---
const calculateClientFinancials = (client: Client, docs: DocumentData[]) => {
  const invoiceTotal = docs
    .filter(d => d.clientId === client.id && d.type === DocType.FACTURE)
    .reduce((sum, d) => sum + d.totalTTC, 0);

  const totalPaid = client.payments.reduce((sum, p) => sum + p.amount, 0);
  
  // Use custom total if defined and greater than 0, otherwise use invoice total
  const isCustom = client.customTotal !== undefined && client.customTotal !== null;
  const finalTotal = isCustom ? client.customTotal! : invoiceTotal;
  
  const balance = finalTotal - totalPaid;

  return { invoiceTotal, finalTotal, totalPaid, balance, isCustom };
};

// --- Client List Component ---
export const ClientsList = () => {
  const [clients, setClients] = useState<Client[]>([]);
  const [docs, setDocs] = useState<DocumentData[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const navigate = useNavigate();

  useEffect(() => {
    setClients(StorageService.getClients());
    setDocs(StorageService.getDocuments());
  }, []);

  const requestDelete = (id: string, e: React.MouseEvent) => {
     e.stopPropagation();
     setDeleteId(id);
  };

  const confirmDelete = () => {
     if (deleteId) {
        StorageService.deleteClient(deleteId);
        setClients(StorageService.getClients());
        setDeleteId(null);
     }
  };

  const filteredClients = clients.filter(c => 
    c.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    c.email.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
           <h2 className="text-2xl font-bold text-slate-800 dark:text-white">Clients</h2>
           <p className="text-slate-500 dark:text-slate-400 text-sm">Gérez vos clients et suivez leurs paiements</p>
        </div>
        <Link to="/clients/new" className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition shadow-sm font-medium flex items-center gap-2 w-full sm:w-auto justify-center">
           <span>+ Nouveau Client</span>
        </Link>
      </div>

      <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 overflow-hidden">
         <div className="p-4 border-b border-slate-100 dark:border-slate-700">
            <input 
              type="text" 
              placeholder="Rechercher un client..." 
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full md:w-80 px-4 py-2 border border-slate-300 dark:border-slate-600 dark:bg-slate-700 dark:text-white rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
            />
         </div>
         
         {filteredClients.length === 0 ? (
            <div className="p-12 text-center text-slate-500 dark:text-slate-400">
               <p>Aucun client trouvé.</p>
            </div>
         ) : (
            <>
               {/* Mobile Card View */}
               <div className="block md:hidden">
                  <div className="divide-y divide-slate-100 dark:divide-slate-700">
                     {filteredClients.map(client => {
                        const { balance, isCustom } = calculateClientFinancials(client, docs);
                        return (
                           <div key={client.id} onClick={() => navigate(`/clients/${client.id}`)} className="p-4 active:bg-slate-50 dark:active:bg-slate-700 transition-colors">
                              <div className="flex justify-between items-start mb-1">
                                 <h3 className="font-bold text-slate-900 dark:text-white">{client.name}</h3>
                                 <div className="text-right">
                                    <span className={`font-bold text-sm ${balance > 0 ? 'text-red-600' : 'text-green-600'}`}>
                                       {balance.toFixed(0)} DH
                                    </span>
                                    {isCustom && (
                                       <div className="text-[10px] text-blue-600 dark:text-blue-400 flex items-center justify-end gap-1">
                                          <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" /></svg>
                                          Modifié
                                       </div>
                                    )}
                                 </div>
                              </div>
                              <div className="text-sm text-slate-500 dark:text-slate-400 mb-1">{client.phone}</div>
                              {client.email && <div className="text-xs text-slate-400 dark:text-slate-500">{client.email}</div>}
                              
                              <div className="mt-3 flex justify-end">
                                 <button 
                                    onClick={(e) => requestDelete(client.id, e)}
                                    className="text-red-500 text-xs font-medium px-2 py-1 rounded hover:bg-red-50 dark:hover:bg-red-900/20"
                                 >
                                    Supprimer
                                 </button>
                              </div>
                           </div>
                        );
                     })}
                  </div>
               </div>

               {/* Desktop Table View */}
               <div className="hidden md:block overflow-x-auto">
                  <table className="w-full text-left text-sm">
                     <thead className="bg-slate-50 dark:bg-slate-700/50 text-slate-500 dark:text-slate-400 font-medium border-b border-slate-200 dark:border-slate-700">
                        <tr>
                           <th className="px-6 py-3">Nom</th>
                           <th className="px-6 py-3">Contact</th>
                           <th className="px-6 py-3 text-right">Reste à payer</th>
                           <th className="px-6 py-3"></th>
                        </tr>
                     </thead>
                     <tbody className="divide-y divide-slate-100 dark:divide-slate-700">
                        {filteredClients.map(client => {
                           const { balance, isCustom } = calculateClientFinancials(client, docs);
                           return (
                              <tr key={client.id} onClick={() => navigate(`/clients/${client.id}`)} className="hover:bg-slate-50 dark:hover:bg-slate-700/30 cursor-pointer transition-colors group">
                                 <td className="px-6 py-4 font-medium text-slate-900 dark:text-white">{client.name}</td>
                                 <td className="px-6 py-4 text-slate-600 dark:text-slate-300">
                                    <div className="flex flex-col">
                                       <span>{client.phone}</span>
                                       <span className="text-xs text-slate-400 dark:text-slate-500">{client.email}</span>
                                    </div>
                                 </td>
                                 <td className="px-6 py-4 text-right">
                                    <span className={`font-bold ${balance > 0 ? 'text-red-600' : 'text-green-600'}`}>
                                       {balance.toFixed(2)} DH
                                    </span>
                                    {isCustom && <span className="block text-[10px] text-blue-500 dark:text-blue-400">Ajusté manuellement</span>}
                                 </td>
                                 <td className="px-6 py-4 text-right">
                                    <button 
                                       onClick={(e) => requestDelete(client.id, e)}
                                       className="text-red-500 hover:text-red-700 opacity-0 group-hover:opacity-100 transition-opacity p-1 rounded hover:bg-red-50 dark:hover:bg-red-900/20"
                                    >
                                       <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                                    </button>
                                 </td>
                              </tr>
                           );
                        })}
                     </tbody>
                  </table>
               </div>
            </>
         )}
      </div>

      {/* Confirmation Modal */}
      {deleteId && (
         <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-in fade-in duration-200">
            <div className="bg-white dark:bg-slate-800 rounded-xl shadow-xl max-w-sm w-full p-6 animate-in zoom-in-95 duration-200">
               <h3 className="text-lg font-bold text-slate-800 dark:text-white mb-2">Supprimer le client ?</h3>
               <p className="text-slate-600 dark:text-slate-400 mb-6 text-sm">
                  Cette action est irréversible. L'historique des documents restera accessible mais ne sera plus lié à ce client.
               </p>
               <div className="flex justify-end gap-3">
                  <button 
                     onClick={() => setDeleteId(null)} 
                     className="px-4 py-2 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg text-sm font-medium"
                  >
                     Annuler
                  </button>
                  <button 
                     onClick={confirmDelete} 
                     className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 shadow-sm text-sm font-medium"
                  >
                     Supprimer
                  </button>
               </div>
            </div>
         </div>
      )}
    </div>
  );
};

// --- Client Form (Create/Edit) ---
export const ClientForm = () => {
   const { id } = useParams();
   const navigate = useNavigate();
   const [client, setClient] = useState<Client>({
      id: '',
      name: '',
      email: '',
      phone: '',
      address: '',
      ice: '',
      payments: [],
      projects: [],
      notes: '',
      createdAt: new Date().toISOString()
   });
   
   useEffect(() => {
      if (id && id !== 'new') {
         const found = StorageService.getClients().find(c => c.id === id);
         if (found) setClient({ ...found, projects: found.projects || [] });
      } else {
         setClient(prev => ({ ...prev, id: Date.now().toString() }));
      }
   }, [id]);

   const handleSubmit = (e: React.FormEvent) => {
      e.preventDefault();
      StorageService.saveClient(client);
      navigate('/clients');
   };

   return (
      <div className="max-w-2xl mx-auto space-y-6">
         <div className="flex items-center gap-4">
             <button onClick={() => navigate(-1)} className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-full text-slate-500 dark:text-slate-400">
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" /></svg>
             </button>
             <h2 className="text-2xl font-bold text-slate-800 dark:text-white">{id === 'new' ? 'Nouveau Client' : 'Modifier Client'}</h2>
         </div>

         <div className="bg-white dark:bg-slate-800 p-6 md:p-8 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700">
            <form onSubmit={handleSubmit} className="space-y-4">
               <div className="space-y-1">
                  <label className="text-sm font-medium text-slate-700 dark:text-slate-300">Nom / Raison Sociale *</label>
                  <input type="text" required value={client.name} onChange={e => setClient({...client, name: e.target.value})} className="w-full border-slate-300 dark:border-slate-600 dark:bg-slate-700 dark:text-white rounded-md shadow-sm py-2" />
               </div>
               
               <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-1">
                     <label className="text-sm font-medium text-slate-700 dark:text-slate-300">Email</label>
                     <input type="email" value={client.email} onChange={e => setClient({...client, email: e.target.value})} className="w-full border-slate-300 dark:border-slate-600 dark:bg-slate-700 dark:text-white rounded-md shadow-sm py-2" />
                  </div>
                  <div className="space-y-1">
                     <label className="text-sm font-medium text-slate-700 dark:text-slate-300">Téléphone</label>
                     <input type="tel" value={client.phone} onChange={e => setClient({...client, phone: e.target.value})} className="w-full border-slate-300 dark:border-slate-600 dark:bg-slate-700 dark:text-white rounded-md shadow-sm py-2" />
                  </div>
               </div>

               <div className="space-y-1">
                  <label className="text-sm font-medium text-slate-700 dark:text-slate-300">Adresse</label>
                  <textarea rows={3} value={client.address} onChange={e => setClient({...client, address: e.target.value})} className="w-full border-slate-300 dark:border-slate-600 dark:bg-slate-700 dark:text-white rounded-md shadow-sm py-2" />
               </div>

               <div className="space-y-1">
                  <label className="text-sm font-medium text-slate-700 dark:text-slate-300">ICE</label>
                  <input type="text" value={client.ice} onChange={e => setClient({...client, ice: e.target.value})} className="w-full border-slate-300 dark:border-slate-600 dark:bg-slate-700 dark:text-white rounded-md shadow-sm py-2" />
               </div>

               <div className="space-y-1">
                  <label className="text-sm font-medium text-slate-700 dark:text-slate-300">Notes internes</label>
                  <textarea rows={3} value={client.notes} onChange={e => setClient({...client, notes: e.target.value})} className="w-full border-slate-300 dark:border-slate-600 dark:bg-slate-700 dark:text-white rounded-md shadow-sm py-2" placeholder="Informations privées sur le client..." />
               </div>

               <div className="pt-4 flex justify-end gap-3">
                  <button type="button" onClick={() => navigate('/clients')} className="px-4 py-2 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg transition-colors font-medium">Annuler</button>
                  <button type="submit" className="px-8 py-2.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 hover:shadow-lg transition-all shadow-md font-bold text-base focus:ring-2 focus:ring-blue-500 focus:ring-offset-2">Enregistrer</button>
               </div>
            </form>
         </div>
      </div>
   );
};

// --- Client Details (Dashboard) ---
export const ClientDetails = () => {
   const { id } = useParams();
   const navigate = useNavigate();
   const [client, setClient] = useState<Client | null>(null);
   const [docs, setDocs] = useState<DocumentData[]>([]);
   const [activeTab, setActiveTab] = useState<'overview' | 'payments' | 'projects'>('overview');
   const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
   
   // Payment State
   const [newPayment, setNewPayment] = useState<Partial<Payment>>({ amount: 0, method: 'Espèces', date: new Date().toISOString().split('T')[0] });
   const [showPaymentModal, setShowPaymentModal] = useState(false);
   
   // Project State
   const [newProject, setNewProject] = useState<Partial<Project>>({ title: '', description: '', date: new Date().toISOString().split('T')[0], beforeImages: [], afterImages: [] });
   const [showProjectModal, setShowProjectModal] = useState(false);
   const [isUploadingProject, setIsUploadingProject] = useState(false);

   // Budget Adjustment State
   const [showBudgetModal, setShowBudgetModal] = useState(false);
   const [budgetAdjustment, setBudgetAdjustment] = useState<{amount: number, note: string}>({ amount: 0, note: '' });

   useEffect(() => {
      if (id) {
         const foundClient = StorageService.getClients().find(c => c.id === id);
         if (foundClient) {
            setClient({ ...foundClient, projects: foundClient.projects || [] });
            const clientDocs = StorageService.getDocuments().filter(d => d.clientId === id);
            setDocs(clientDocs);
            setBudgetAdjustment({
               amount: foundClient.customTotal || 0,
               note: foundClient.customTotalNote || ''
            });
         }
      }
   }, [id]);

   if (!client) return <div>Chargement...</div>;

   const { invoiceTotal, finalTotal, totalPaid, balance, isCustom } = calculateClientFinancials(client, docs);
   const totalDevis = docs.filter(d => d.type === DocType.DEVIS).reduce((sum, d) => sum + d.totalTTC, 0);

   const handleAddPayment = (e: React.FormEvent) => {
      e.preventDefault();
      if (!newPayment.amount || newPayment.amount <= 0) return;

      const payment: Payment = {
         id: Date.now().toString(),
         date: newPayment.date || new Date().toISOString(),
         amount: newPayment.amount,
         method: newPayment.method || 'Espèces',
         note: newPayment.note
      };

      const updatedClient = {
         ...client,
         payments: [payment, ...client.payments]
      };

      StorageService.saveClient(updatedClient);
      setClient(updatedClient);
      setShowPaymentModal(false);
      setNewPayment({ amount: 0, method: 'Espèces', date: new Date().toISOString().split('T')[0], note: '' });
   };

   const handleBudgetAdjustment = (e: React.FormEvent) => {
      e.preventDefault();
      const updatedClient = {
         ...client,
         customTotal: budgetAdjustment.amount > 0 ? budgetAdjustment.amount : undefined,
         customTotalNote: budgetAdjustment.note
      };
      
      StorageService.saveClient(updatedClient);
      setClient(updatedClient);
      setShowBudgetModal(false);
   };

   const handleDeleteClient = () => {
      StorageService.deleteClient(client.id);
      navigate('/clients');
   };

   // Project Logic
   const handleProjectImageUpload = async (e: React.ChangeEvent<HTMLInputElement>, type: 'before' | 'after') => {
      if (!e.target.files) return;
      setIsUploadingProject(true);
      
      const files: File[] = Array.from(e.target.files);
      const newImages: ProjectImage[] = [];

      try {
         for (const file of files) {
            const base64 = await new Promise<string>((resolve) => {
               const reader = new FileReader();
               reader.onloadend = () => resolve(reader.result as string);
               reader.readAsDataURL(file);
            });
            const compressed = await compressImage(base64);
            newImages.push({ id: Math.random().toString(36).substr(2, 9), url: compressed });
         }

         if (type === 'before') {
            setNewProject(prev => ({ ...prev, beforeImages: [...(prev.beforeImages || []), ...newImages] }));
         } else {
            setNewProject(prev => ({ ...prev, afterImages: [...(prev.afterImages || []), ...newImages] }));
         }
      } catch (err) {
         console.error(err);
         alert("Erreur lors de l'upload des images");
      } finally {
         setIsUploadingProject(false);
      }
   };

   const handleAddProject = (e: React.FormEvent) => {
      e.preventDefault();
      if (!newProject.title) return;

      const project: Project = {
         id: Date.now().toString(),
         title: newProject.title,
         description: newProject.description || '',
         date: newProject.date || new Date().toISOString(),
         beforeImages: newProject.beforeImages || [],
         afterImages: newProject.afterImages || []
      };

      const updatedClient = {
         ...client,
         projects: [project, ...(client.projects || [])]
      };

      StorageService.saveClient(updatedClient);
      setClient(updatedClient);
      setShowProjectModal(false);
      setNewProject({ title: '', description: '', date: new Date().toISOString().split('T')[0], beforeImages: [], afterImages: [] });
   };

   const handleDeleteProject = (projectId: string) => {
      if (confirm("Supprimer ce chantier ?")) {
         const updatedClient = {
             ...client,
             projects: client.projects.filter(p => p.id !== projectId)
         };
         StorageService.saveClient(updatedClient);
         setClient(updatedClient);
      }
   };

   return (
      <div className="space-y-6">
         {/* Header */}
         <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
            <div className="flex items-center gap-4">
               <button onClick={() => navigate('/clients')} className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-full text-slate-500 dark:text-slate-400">
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" /></svg>
               </button>
               <div>
                  <h2 className="text-2xl font-bold text-slate-800 dark:text-white">{client.name}</h2>
                  <div className="flex text-sm text-slate-500 dark:text-slate-400 gap-3">
                     <span>{client.phone}</span>
                     <span>•</span>
                     <span>{client.email}</span>
                  </div>
               </div>
            </div>
            <div className="flex gap-2">
               <Link to={`/clients/edit/${client.id}`} className="px-4 py-2 border border-slate-300 dark:border-slate-600 rounded-lg text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700 font-medium text-sm">Modifier</Link>
               <button onClick={() => setShowDeleteConfirm(true)} className="px-4 py-2 border border-red-200 dark:border-red-800 text-red-600 dark:text-red-400 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20 font-medium text-sm">Supprimer</button>
            </div>
         </div>

         {/* Stats Cards */}
         <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Total Card with Adjustment Logic */}
            <div className={`p-5 rounded-xl border shadow-sm relative overflow-hidden transition-colors ${isCustom ? 'bg-blue-50 border-blue-200 dark:bg-blue-900/20 dark:border-blue-800' : 'bg-white border-slate-200 dark:bg-slate-800 dark:border-slate-700'}`}>
               <div className="flex justify-between items-start">
                  <div>
                     <p className={`text-sm font-medium mb-1 ${isCustom ? 'text-blue-700 dark:text-blue-300' : 'text-slate-500 dark:text-slate-400'}`}>
                        {isCustom ? "Total Convenu (Manuel)" : "Total Facturé"}
                     </p>
                     <p className="text-2xl font-bold text-slate-800 dark:text-white">{finalTotal.toFixed(2)} DH</p>
                     
                     {isCustom && invoiceTotal > 0 && (
                        <p className="text-xs text-slate-500 mt-1 line-through decoration-slate-400">Calculé: {invoiceTotal.toFixed(2)} DH</p>
                     )}
                     
                     {!isCustom && (
                        <p className="text-xs text-slate-400 mt-2">{totalDevis.toFixed(2)} DH en devis</p>
                     )}
                     
                     {isCustom && client.customTotalNote && (
                        <div className="mt-2 p-2 bg-blue-100 dark:bg-blue-900/50 rounded text-xs text-blue-800 dark:text-blue-200 italic">
                           Note: {client.customTotalNote}
                        </div>
                     )}
                  </div>
                  <button 
                     onClick={() => {
                        setBudgetAdjustment({ amount: client.customTotal || invoiceTotal, note: client.customTotalNote || '' });
                        setShowBudgetModal(true);
                     }}
                     className={`p-2 rounded-full transition-colors ${isCustom ? 'bg-blue-200 dark:bg-blue-800 text-blue-700 dark:text-blue-200 hover:bg-blue-300 dark:hover:bg-blue-700' : 'bg-slate-100 dark:bg-slate-700 text-slate-500 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-600'}`}
                     title="Ajuster le montant manuellement"
                  >
                     <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" /></svg>
                  </button>
               </div>
            </div>

            <div className="bg-white dark:bg-slate-800 p-5 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm">
               <p className="text-sm font-medium text-slate-500 dark:text-slate-400 mb-1">Total Encaissé</p>
               <p className="text-2xl font-bold text-green-600 dark:text-green-400">{totalPaid.toFixed(2)} DH</p>
               <p className="text-xs text-slate-400 mt-2">{client.payments.length} paiements</p>
            </div>
            
            <div className="bg-white dark:bg-slate-800 p-5 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm">
               <p className="text-sm font-medium text-slate-500 dark:text-slate-400 mb-1">Reste à Payer</p>
               <p className={`text-2xl font-bold ${balance > 0 ? 'text-red-600 dark:text-red-400' : 'text-slate-800 dark:text-white'}`}>{balance.toFixed(2)} DH</p>
               <button 
                  onClick={() => setShowPaymentModal(true)}
                  className="mt-3 w-full py-1.5 bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 rounded text-sm font-medium hover:bg-blue-100 dark:hover:bg-blue-900/50"
               >
                  Ajouter un paiement
               </button>
            </div>
         </div>

         {/* Tabs */}
         <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 min-h-[400px]">
            <div className="border-b border-slate-100 dark:border-slate-700 flex overflow-x-auto no-scrollbar">
               <button 
                  onClick={() => setActiveTab('overview')} 
                  className={`px-6 py-3 text-sm font-medium border-b-2 transition-colors whitespace-nowrap ${activeTab === 'overview' ? 'border-blue-600 text-blue-600 dark:border-blue-400 dark:text-blue-400' : 'border-transparent text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-300'}`}
               >
                  Documents
               </button>
               <button 
                  onClick={() => setActiveTab('payments')} 
                  className={`px-6 py-3 text-sm font-medium border-b-2 transition-colors whitespace-nowrap ${activeTab === 'payments' ? 'border-blue-600 text-blue-600 dark:border-blue-400 dark:text-blue-400' : 'border-transparent text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-300'}`}
               >
                  Historique Paiements
               </button>
               <button 
                  onClick={() => setActiveTab('projects')} 
                  className={`px-6 py-3 text-sm font-medium border-b-2 transition-colors whitespace-nowrap ${activeTab === 'projects' ? 'border-blue-600 text-blue-600 dark:border-blue-400 dark:text-blue-400' : 'border-transparent text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-300'}`}
               >
                  Chantiers / Photos
               </button>
            </div>

            <div className="p-0">
               {activeTab === 'overview' && (
                  docs.length === 0 ? (
                     <div className="p-8 text-center text-slate-500 dark:text-slate-400">Aucun document pour ce client.</div>
                  ) : (
                     <div className="overflow-x-auto">
                        <table className="w-full text-left text-sm">
                           <thead className="bg-slate-50 dark:bg-slate-700/50 text-slate-500 dark:text-slate-400 font-medium border-b border-slate-200 dark:border-slate-700">
                              <tr>
                                 <th className="px-6 py-3 whitespace-nowrap">Type</th>
                                 <th className="px-6 py-3 whitespace-nowrap">Numéro</th>
                                 <th className="px-6 py-3 whitespace-nowrap">Date</th>
                                 <th className="px-6 py-3 text-right whitespace-nowrap">Montant</th>
                                 <th className="px-6 py-3 text-right whitespace-nowrap">Action</th>
                              </tr>
                           </thead>
                           <tbody className="divide-y divide-slate-100 dark:divide-slate-700">
                              {docs.map(doc => (
                                 <tr key={doc.id} className="hover:bg-slate-50 dark:hover:bg-slate-700/30">
                                    <td className="px-6 py-3"><span className={`px-2 py-0.5 rounded text-xs border ${doc.type === DocType.DEVIS ? 'bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-900/30 dark:text-blue-300 dark:border-blue-800' : 'bg-green-50 text-green-700 border-green-200 dark:bg-green-900/30 dark:text-green-300 dark:border-green-800'}`}>{doc.type}</span></td>
                                    <td className="px-6 py-3 font-medium text-slate-900 dark:text-white whitespace-nowrap">{doc.number}</td>
                                    <td className="px-6 py-3 text-slate-600 dark:text-slate-300 whitespace-nowrap">{doc.date}</td>
                                    <td className="px-6 py-3 text-right font-medium text-slate-900 dark:text-white whitespace-nowrap">{doc.totalTTC.toFixed(2)} DH</td>
                                    <td className="px-6 py-3 text-right whitespace-nowrap">
                                       <Link to={`/edit/${doc.id}`} className="text-blue-600 dark:text-blue-400 hover:underline">Ouvrir</Link>
                                    </td>
                                 </tr>
                              ))}
                           </tbody>
                        </table>
                     </div>
                  )
               )}

               {activeTab === 'payments' && (
                  <div>
                     {client.payments.length === 0 ? (
                        <div className="p-8 text-center text-slate-500 dark:text-slate-400">Aucun paiement enregistré.</div>
                     ) : (
                        <div className="overflow-x-auto">
                           <table className="w-full text-left text-sm">
                              <thead className="bg-slate-50 dark:bg-slate-700/50 text-slate-500 dark:text-slate-400 font-medium border-b border-slate-200 dark:border-slate-700">
                                 <tr>
                                    <th className="px-6 py-3 whitespace-nowrap">Date</th>
                                    <th className="px-6 py-3 whitespace-nowrap">Mode</th>
                                    <th className="px-6 py-3 whitespace-nowrap">Note</th>
                                    <th className="px-6 py-3 text-right whitespace-nowrap">Montant</th>
                                 </tr>
                              </thead>
                              <tbody className="divide-y divide-slate-100 dark:divide-slate-700">
                                 {client.payments.map((p) => (
                                    <tr key={p.id} className="hover:bg-slate-50 dark:hover:bg-slate-700/30">
                                       <td className="px-6 py-3 text-slate-900 dark:text-white whitespace-nowrap">{p.date}</td>
                                       <td className="px-6 py-3 text-slate-600 dark:text-slate-300 whitespace-nowrap">{p.method}</td>
                                       <td className="px-6 py-3 text-slate-500 dark:text-slate-400 italic whitespace-nowrap">{p.note || '-'}</td>
                                       <td className="px-6 py-3 text-right font-bold text-green-600 dark:text-green-400 whitespace-nowrap">+{p.amount.toFixed(2)} DH</td>
                                    </tr>
                                 ))}
                              </tbody>
                           </table>
                        </div>
                     )}
                  </div>
               )}

               {activeTab === 'projects' && (
                  <div className="p-6">
                     <div className="flex justify-between items-center mb-6">
                        <h3 className="font-bold text-slate-800 dark:text-white">Galerie des travaux</h3>
                        <button 
                           onClick={() => setShowProjectModal(true)}
                           className="bg-slate-800 dark:bg-slate-700 text-white px-3 py-1.5 rounded-lg text-sm font-medium hover:bg-slate-900 dark:hover:bg-slate-600"
                        >
                           + Nouveau Chantier
                        </button>
                     </div>

                     {(!client.projects || client.projects.length === 0) ? (
                        <div className="text-center py-10 border-2 border-dashed border-slate-200 dark:border-slate-700 rounded-xl bg-slate-50 dark:bg-slate-800/50">
                           <p className="text-slate-500 dark:text-slate-400 mb-2">Aucun chantier enregistré.</p>
                           <p className="text-xs text-slate-400 dark:text-slate-500">Ajoutez des photos "Avant / Après" pour suivre l'avancement.</p>
                        </div>
                     ) : (
                        <div className="space-y-8">
                           {client.projects.map(project => (
                              <div key={project.id} className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl overflow-hidden">
                                 <div className="p-4 border-b border-slate-100 dark:border-slate-700 bg-slate-50 dark:bg-slate-700/50 flex justify-between items-start">
                                    <div>
                                       <h4 className="font-bold text-slate-800 dark:text-white">{project.title}</h4>
                                       <p className="text-xs text-slate-500 dark:text-slate-400">{project.date} • {project.description}</p>
                                    </div>
                                    <button onClick={() => handleDeleteProject(project.id)} className="text-red-400 hover:text-red-600 dark:hover:text-red-300">
                                       <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                                    </button>
                                 </div>
                                 <div className="grid grid-cols-1 md:grid-cols-2 gap-0 divide-y md:divide-y-0 md:divide-x divide-slate-100 dark:divide-slate-700">
                                    {/* Before Column */}
                                    <div className="p-4">
                                       <h5 className="font-semibold text-xs uppercase tracking-wide text-slate-500 dark:text-slate-400 mb-3 text-center">Avant</h5>
                                       {project.beforeImages.length > 0 ? (
                                          <div className="grid grid-cols-2 sm:grid-cols-3 gap-1 mt-2">
                                             {project.beforeImages.map(img => (
                                                <img key={img.id} src={img.url} className="w-full h-16 object-cover rounded" alt="Avant" />
                                             ))}
                                          </div>
                                       ) : (
                                          <div className="h-32 bg-slate-50 dark:bg-slate-700/50 rounded-lg flex items-center justify-center text-slate-400 text-xs italic">Aucune photo</div>
                                       )}
                                    </div>
                                    {/* After Column */}
                                    <div className="p-4">
                                       <h5 className="font-semibold text-xs uppercase tracking-wide text-green-600 dark:text-green-400 mb-3 text-center">Après</h5>
                                       {project.afterImages.length > 0 ? (
                                          <div className="grid grid-cols-2 sm:grid-cols-3 gap-1 mt-2">
                                             {project.afterImages.map(img => (
                                                <img key={img.id} src={img.url} className="w-full h-16 object-cover rounded" alt="Après" />
                                             ))}
                                          </div>
                                       ) : (
                                          <div className="h-32 bg-slate-50 dark:bg-slate-700/50 rounded-lg flex items-center justify-center text-slate-400 text-xs italic">Aucune photo</div>
                                       )}
                                    </div>
                                 </div>
                              </div>
                           ))}
                        </div>
                     )}
                  </div>
               )}
            </div>
         </div>

         {/* Budget Adjustment Modal */}
         {showBudgetModal && (
            <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
               <div className="bg-white dark:bg-slate-800 rounded-xl shadow-xl max-w-md w-full p-6 animate-in fade-in zoom-in duration-200">
                  <div className="flex items-center gap-3 mb-4">
                     <div className="p-2 bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-300 rounded-full">
                        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                     </div>
                     <h3 className="text-lg font-bold text-slate-800 dark:text-white">Ajuster le Total à Payer</h3>
                  </div>
                  
                  <p className="text-sm text-slate-600 dark:text-slate-400 mb-4 bg-slate-50 dark:bg-slate-700/50 p-3 rounded-lg">
                     Le travail effectué diffère du devis initial ? Définissez ici le montant final convenu avec le client.
                  </p>

                  <form onSubmit={handleBudgetAdjustment} className="space-y-4">
                     <div>
                        <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Nouveau Total Convenu (DH)</label>
                        <input 
                           type="number" 
                           autoFocus
                           required
                           min="0"
                           step="0.01"
                           value={budgetAdjustment.amount} 
                           onChange={e => setBudgetAdjustment({...budgetAdjustment, amount: parseFloat(e.target.value)})}
                           className="w-full border-slate-300 dark:border-slate-600 dark:bg-slate-700 dark:text-white rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 text-lg font-bold text-slate-800 dark:text-white" 
                        />
                     </div>
                     <div>
                        <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Raison / Note</label>
                        <textarea 
                           required
                           rows={3}
                           placeholder="Ex: Rajout de peinture, Remise commerciale..."
                           value={budgetAdjustment.note} 
                           onChange={e => setBudgetAdjustment({...budgetAdjustment, note: e.target.value})}
                           className="w-full border-slate-300 dark:border-slate-600 dark:bg-slate-700 dark:text-white rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500" 
                        />
                     </div>
                     <div className="flex justify-between items-center pt-4">
                        <button 
                           type="button" 
                           onClick={() => {
                              setBudgetAdjustment({ amount: 0, note: '' });
                              // We submit with 0 to clear it
                              const updatedClient = { ...client, customTotal: undefined, customTotalNote: undefined };
                              StorageService.saveClient(updatedClient);
                              setClient(updatedClient);
                              setShowBudgetModal(false);
                           }} 
                           className="text-red-500 text-sm hover:text-red-700 dark:hover:text-red-400 underline"
                        >
                           Réinitialiser (Auto)
                        </button>
                        <div className="flex gap-2">
                           <button type="button" onClick={() => setShowBudgetModal(false)} className="px-4 py-2 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg">Annuler</button>
                           <button type="submit" className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 shadow-sm font-medium">Valider</button>
                        </div>
                     </div>
                  </form>
               </div>
            </div>
         )}

         {/* Payment Modal */}
         {showPaymentModal && (
            <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
               <div className="bg-white dark:bg-slate-800 rounded-xl shadow-xl max-w-md w-full p-6 animate-in fade-in zoom-in duration-200">
                  <h3 className="text-lg font-bold text-slate-800 dark:text-white mb-4">Enregistrer un paiement</h3>
                  <form onSubmit={handleAddPayment} className="space-y-4">
                     <div>
                        <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Montant (DH)</label>
                        <input 
                           type="number" 
                           autoFocus
                           required
                           min="0"
                           step="0.01"
                           value={newPayment.amount} 
                           onChange={e => setNewPayment({...newPayment, amount: parseFloat(e.target.value)})}
                           className="w-full border-slate-300 dark:border-slate-600 dark:bg-slate-700 dark:text-white rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 text-lg" 
                        />
                     </div>
                     <div>
                        <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Date</label>
                        <input 
                           type="date" 
                           required
                           value={newPayment.date} 
                           onChange={e => setNewPayment({...newPayment, date: e.target.value})}
                           className="w-full border-slate-300 dark:border-slate-600 dark:bg-slate-700 dark:text-white rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500" 
                        />
                     </div>
                     <div>
                        <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Mode de paiement</label>
                        <select 
                           value={newPayment.method} 
                           onChange={e => setNewPayment({...newPayment, method: e.target.value})}
                           className="w-full border-slate-300 dark:border-slate-600 dark:bg-slate-700 dark:text-white rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
                        >
                           <option>Espèces</option>
                           <option>Chèque</option>
                           <option>Virement</option>
                           <option>Autre</option>
                        </select>
                     </div>
                     <div>
                        <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Note (Optionnel)</label>
                        <input 
                           type="text" 
                           placeholder="Ex: N° Chèque..."
                           value={newPayment.note} 
                           onChange={e => setNewPayment({...newPayment, note: e.target.value})}
                           className="w-full border-slate-300 dark:border-slate-600 dark:bg-slate-700 dark:text-white rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500" 
                        />
                     </div>
                     <div className="flex justify-end gap-2 pt-4">
                        <button type="button" onClick={() => setShowPaymentModal(false)} className="px-4 py-2 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg">Annuler</button>
                        <button type="submit" className="px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 shadow-sm font-medium">Encaisser</button>
                     </div>
                  </form>
               </div>
            </div>
         )}

         {/* Project Modal */}
         {showProjectModal && (
            <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
               <div className="bg-white dark:bg-slate-800 rounded-xl shadow-xl max-w-lg w-full p-6 animate-in fade-in zoom-in duration-200 flex flex-col max-h-[90vh]">
                  <h3 className="text-lg font-bold text-slate-800 dark:text-white mb-4">Nouveau Chantier</h3>
                  <form onSubmit={handleAddProject} className="space-y-4 overflow-y-auto pr-2">
                     <div>
                        <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Titre</label>
                        <input 
                           type="text" 
                           required
                           placeholder="Ex: Rénovation Cuisine"
                           value={newProject.title} 
                           onChange={e => setNewProject({...newProject, title: e.target.value})}
                           className="w-full border-slate-300 dark:border-slate-600 dark:bg-slate-700 dark:text-white rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500" 
                        />
                     </div>
                     <div>
                        <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Date</label>
                        <input 
                           type="date" 
                           value={newProject.date} 
                           onChange={e => setNewProject({...newProject, date: e.target.value})}
                           className="w-full border-slate-300 dark:border-slate-600 dark:bg-slate-700 dark:text-white rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500" 
                        />
                     </div>
                     <div>
                        <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Description</label>
                        <textarea 
                           value={newProject.description} 
                           onChange={e => setNewProject({...newProject, description: e.target.value})}
                           className="w-full border-slate-300 dark:border-slate-600 dark:bg-slate-700 dark:text-white rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500" 
                           rows={2}
                        />
                     </div>

                     <div className="grid grid-cols-2 gap-4 pt-2">
                        <div>
                           <label className="block text-xs font-bold uppercase text-slate-500 dark:text-slate-400 mb-2">Photos Avant</label>
                           <label className="block w-full border-2 border-dashed border-slate-300 dark:border-slate-600 rounded-lg p-3 text-center cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-700/50 hover:border-slate-400 transition-colors">
                              <span className="text-xs text-blue-600 dark:text-blue-400 font-medium">Ajouter photos</span>
                              <input type="file" multiple accept="image/*" className="hidden" onChange={(e) => handleProjectImageUpload(e, 'before')} />
                           </label>
                           <div className="grid grid-cols-2 sm:grid-cols-3 gap-1 mt-2">
                              {newProject.beforeImages?.map((img, i) => (
                                 <img key={i} src={img.url} className="w-full h-16 object-cover rounded" />
                              ))}
                           </div>
                        </div>
                        <div>
                           <label className="block text-xs font-bold uppercase text-green-600 dark:text-green-400 mb-2">Photos Après</label>
                           <label className="block w-full border-2 border-dashed border-slate-300 dark:border-slate-600 rounded-lg p-3 text-center cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-700/50 hover:border-slate-400 transition-colors">
                              <span className="text-xs text-blue-600 dark:text-blue-400 font-medium">Ajouter photos</span>
                              <input type="file" multiple accept="image/*" className="hidden" onChange={(e) => handleProjectImageUpload(e, 'after')} />
                           </label>
                           <div className="grid grid-cols-2 sm:grid-cols-3 gap-1 mt-2">
                              {newProject.afterImages?.map((img, i) => (
                                 <img key={i} src={img.url} className="w-full h-16 object-cover rounded" />
                              ))}
                           </div>
                        </div>
                     </div>

                     <div className="flex justify-end gap-2 pt-4 border-t border-slate-100 dark:border-slate-700">
                        <button type="button" onClick={() => setShowProjectModal(false)} className="px-4 py-2 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg">Annuler</button>
                        <button type="submit" disabled={isUploadingProject} className="px-6 py-2 bg-slate-800 dark:bg-slate-700 text-white rounded-lg hover:bg-slate-900 dark:hover:bg-slate-600 shadow-sm font-medium disabled:opacity-50">
                           {isUploadingProject ? 'Chargement...' : 'Enregistrer'}
                        </button>
                     </div>
                  </form>
               </div>
            </div>
         )}
         
         {/* Delete Confirmation Modal */}
         {showDeleteConfirm && (
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-in fade-in duration-200">
               <div className="bg-white dark:bg-slate-800 rounded-xl shadow-xl max-w-sm w-full p-6 animate-in zoom-in-95 duration-200">
                  <h3 className="text-lg font-bold text-slate-800 dark:text-white mb-2">Supprimer le client ?</h3>
                  <p className="text-slate-600 dark:text-slate-400 mb-6 text-sm">
                     Cette action supprimera définitivement le client et toutes les informations associées.
                  </p>
                  <div className="flex justify-end gap-3">
                     <button 
                        onClick={() => setShowDeleteConfirm(false)} 
                        className="px-4 py-2 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg text-sm font-medium"
                     >
                        Annuler
                     </button>
                     <button 
                        onClick={handleDeleteClient} 
                        className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 shadow-sm text-sm font-medium"
                     >
                        Confirmer
                     </button>
                  </div>
               </div>
            </div>
         )}
      </div>
   );
};