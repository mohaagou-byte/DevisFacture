
import React, { useState, useEffect } from 'react';
import { useNavigate, useParams, Link } from 'react-router-dom';
import { StorageService } from '../services/storageService';
import { Supplier } from '../types';

// --- Supplier List Component ---
export const SuppliersList = () => {
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const navigate = useNavigate();

  useEffect(() => {
    setSuppliers(StorageService.getSuppliers());
  }, []);

  const handleDelete = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (confirm('Êtes-vous sûr de vouloir supprimer ce fournisseur ?')) {
      StorageService.deleteSupplier(id);
      setSuppliers(StorageService.getSuppliers());
    }
  };

  const filteredSuppliers = suppliers.filter(s => 
    s.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    s.category.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
           <h2 className="text-2xl font-bold text-slate-800">Fournisseurs</h2>
           <p className="text-slate-500 text-sm">Gérez vos fournisseurs et contacts</p>
        </div>
        <Link to="/suppliers/new" className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition shadow-sm font-medium flex items-center gap-2 w-full sm:w-auto justify-center">
           <span>+ Nouveau Fournisseur</span>
        </Link>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
         <div className="p-4 border-b border-slate-100">
            <input 
              type="text" 
              placeholder="Rechercher..." 
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full md:w-80 px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
            />
         </div>
         
         {filteredSuppliers.length === 0 ? (
            <div className="p-12 text-center text-slate-500">
               <p>Aucun fournisseur trouvé.</p>
            </div>
         ) : (
            <>
               {/* Mobile Card View */}
               <div className="block md:hidden">
                  <div className="divide-y divide-slate-100">
                     {filteredSuppliers.map(supplier => (
                        <div key={supplier.id} onClick={() => navigate(`/suppliers/edit/${supplier.id}`)} className="p-4 active:bg-slate-50 transition-colors">
                           <div className="flex justify-between items-start mb-1">
                              <h3 className="font-bold text-slate-900">{supplier.name}</h3>
                              {supplier.category && <span className="bg-slate-100 text-slate-700 px-2 py-0.5 rounded text-xs">{supplier.category}</span>}
                           </div>
                           <div className="text-sm text-slate-600">{supplier.phone}</div>
                           {supplier.email && <div className="text-xs text-slate-400">{supplier.email}</div>}
                        </div>
                     ))}
                  </div>
               </div>

               {/* Desktop Table View */}
               <div className="hidden md:block overflow-x-auto">
                  <table className="w-full text-left text-sm">
                     <thead className="bg-slate-50 text-slate-500 font-medium border-b border-slate-200">
                        <tr>
                           <th className="px-6 py-3">Nom</th>
                           <th className="px-6 py-3">Catégorie</th>
                           <th className="px-6 py-3">Contact</th>
                           <th className="px-6 py-3 text-right">Actions</th>
                        </tr>
                     </thead>
                     <tbody className="divide-y divide-slate-100">
                        {filteredSuppliers.map(supplier => (
                           <tr key={supplier.id} onClick={() => navigate(`/suppliers/edit/${supplier.id}`)} className="hover:bg-slate-50 cursor-pointer transition-colors">
                              <td className="px-6 py-4 font-medium text-slate-900">{supplier.name}</td>
                              <td className="px-6 py-4">
                                 <span className="bg-slate-100 text-slate-700 px-2 py-1 rounded text-xs">{supplier.category}</span>
                              </td>
                              <td className="px-6 py-4 text-slate-600">
                                 <div className="flex flex-col">
                                    <span>{supplier.phone}</span>
                                    <span className="text-xs text-slate-400">{supplier.email}</span>
                                 </div>
                              </td>
                              <td className="px-6 py-4 text-right">
                                 <button 
                                    onClick={(e) => handleDelete(supplier.id, e)}
                                    className="text-red-500 hover:text-red-700 text-sm font-medium px-2 py-1 rounded hover:bg-red-50"
                                 >
                                    Supprimer
                                 </button>
                              </td>
                           </tr>
                        ))}
                     </tbody>
                  </table>
               </div>
            </>
         )}
      </div>
    </div>
  );
};

// --- Supplier Form ---
export const SupplierForm = () => {
   const { id } = useParams();
   const navigate = useNavigate();
   const [supplier, setSupplier] = useState<Supplier>({
      id: '',
      name: '',
      category: '',
      email: '',
      phone: '',
      address: '',
      ice: '',
      notes: ''
   });
   
   useEffect(() => {
      if (id && id !== 'new') {
         const found = StorageService.getSuppliers().find(s => s.id === id);
         if (found) setSupplier(found);
      } else {
         setSupplier(prev => ({ ...prev, id: Date.now().toString() }));
      }
   }, [id]);

   const handleSubmit = (e: React.FormEvent) => {
      e.preventDefault();
      StorageService.saveSupplier(supplier);
      navigate('/suppliers');
   };

   return (
      <div className="max-w-2xl mx-auto space-y-6">
         <div className="flex items-center gap-4">
             <button onClick={() => navigate(-1)} className="p-2 hover:bg-slate-100 rounded-full text-slate-500">
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" /></svg>
             </button>
             <h2 className="text-2xl font-bold text-slate-800">{id === 'new' ? 'Nouveau Fournisseur' : 'Modifier Fournisseur'}</h2>
         </div>

         <div className="bg-white p-6 md:p-8 rounded-xl shadow-sm border border-slate-200">
            <form onSubmit={handleSubmit} className="space-y-4">
               <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-1">
                     <label className="text-sm font-medium text-slate-700">Nom *</label>
                     <input type="text" required value={supplier.name} onChange={e => setSupplier({...supplier, name: e.target.value})} className="w-full border-slate-300 rounded-md shadow-sm py-2" />
                  </div>
                  <div className="space-y-1">
                     <label className="text-sm font-medium text-slate-700">Catégorie</label>
                     <input type="text" placeholder="Ex: Matériaux, Peinture..." value={supplier.category} onChange={e => setSupplier({...supplier, category: e.target.value})} className="w-full border-slate-300 rounded-md shadow-sm py-2" />
                  </div>
               </div>
               
               <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-1">
                     <label className="text-sm font-medium text-slate-700">Email</label>
                     <input type="email" value={supplier.email} onChange={e => setSupplier({...supplier, email: e.target.value})} className="w-full border-slate-300 rounded-md shadow-sm py-2" />
                  </div>
                  <div className="space-y-1">
                     <label className="text-sm font-medium text-slate-700">Téléphone</label>
                     <input type="tel" value={supplier.phone} onChange={e => setSupplier({...supplier, phone: e.target.value})} className="w-full border-slate-300 rounded-md shadow-sm py-2" />
                  </div>
               </div>

               <div className="space-y-1">
                  <label className="text-sm font-medium text-slate-700">Adresse</label>
                  <textarea rows={2} value={supplier.address} onChange={e => setSupplier({...supplier, address: e.target.value})} className="w-full border-slate-300 rounded-md shadow-sm py-2" />
               </div>

               <div className="space-y-1">
                  <label className="text-sm font-medium text-slate-700">ICE</label>
                  <input type="text" value={supplier.ice} onChange={e => setSupplier({...supplier, ice: e.target.value})} className="w-full border-slate-300 rounded-md shadow-sm py-2" />
               </div>

               <div className="space-y-1">
                  <label className="text-sm font-medium text-slate-700">Notes</label>
                  <textarea rows={3} value={supplier.notes} onChange={e => setSupplier({...supplier, notes: e.target.value})} className="w-full border-slate-300 rounded-md shadow-sm py-2" />
               </div>

               <div className="pt-4 flex justify-end gap-3">
                  <button type="button" onClick={() => navigate('/suppliers')} className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-lg">Annuler</button>
                  <button type="submit" className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 shadow-sm font-medium">Enregistrer</button>
               </div>
            </form>
         </div>
      </div>
   );
};
