
import React, { useState, useEffect, useCallback } from 'react';
import { DocumentData, DocItem, DocType, DocStatus, CompanyProfile, TemplateType, Client } from '../types';
import { StorageService } from '../services/storageService';
import { useNavigate, Link } from 'react-router-dom';

interface EditorProps {
  initialData: DocumentData;
  isNew?: boolean;
}

export const DocumentEditor: React.FC<EditorProps> = ({ initialData, isNew }) => {
  // Ensure default value for hasVat and hasDeposit if it doesn't exist in old data
  const [doc, setDoc] = useState<DocumentData>({
      ...initialData,
      hasVat: initialData.hasVat ?? false,
      template: initialData.template ?? 'classic',
      hasDeposit: initialData.hasDeposit ?? (initialData.type === DocType.DEVIS), // Default enabled for Devis
      depositPercentage: initialData.depositPercentage ?? 50,
      depositAmount: initialData.depositAmount ?? 0,
      clientEmail: initialData.clientEmail ?? '',
      clientPhone: initialData.clientPhone ?? '',
      clientId: initialData.clientId ?? ''
  });
  const [activeTab, setActiveTab] = useState<'edit' | 'preview'>('edit');
  const [showShareModal, setShowShareModal] = useState(false);
  const [showSendModal, setShowSendModal] = useState(false);
  const [shareLink, setShareLink] = useState('');
  
  // Client Selector Modal
  const [showClientSelector, setShowClientSelector] = useState(false);
  const [clients, setClients] = useState<Client[]>([]);
  
  // Send Modal States
  const [sendMethod, setSendMethod] = useState<'email' | 'whatsapp'>('email');
  const [emailSubject, setEmailSubject] = useState('');
  const [messageBody, setMessageBody] = useState('');
  
  const navigate = useNavigate();
  const profile = StorageService.getProfile();

  useEffect(() => {
     setClients(StorageService.getClients());
  }, []);

  // Auto-calculation Effect
  useEffect(() => {
    let subTotal = 0;
    const newItems = doc.items.map(item => {
      // Skip logic for section headers
      if (item.isSectionHeader) return item;

      // Calculate auto total
      const autoTotal = item.quantity * item.unitPrice;
      
      // Determine final total for this row
      const finalTotal = item.isTotalOverridden ? item.total : autoTotal;
      
      subTotal += finalTotal;
      
      if (!item.isTotalOverridden && item.total !== autoTotal) {
        return { ...item, total: autoTotal };
      }
      return item;
    });

    const itemsChanged = JSON.stringify(newItems) !== JSON.stringify(doc.items);
    
    // Calculate global totals
    const vatAmount = doc.hasVat ? subTotal * (doc.vatRate / 100) : 0;
    const totalTTC = subTotal + vatAmount;
    
    // Calculate Deposit
    // Only calculate if hasDeposit is true
    const depositAmount = (doc.hasDeposit && doc.depositPercentage && doc.depositPercentage > 0) 
        ? totalTTC * (doc.depositPercentage / 100) 
        : 0;

    if (itemsChanged || subTotal !== doc.subTotal || totalTTC !== doc.totalTTC || vatAmount !== doc.vatAmount || depositAmount !== doc.depositAmount) {
      setDoc(prev => ({
        ...prev,
        items: itemsChanged ? newItems : prev.items,
        subTotal,
        vatAmount,
        totalTTC,
        depositAmount
      }));
    }
  }, [doc.items, doc.vatRate, doc.hasVat, doc.depositPercentage, doc.hasDeposit]);

  const handleItemChange = (id: string, field: keyof DocItem, value: any) => {
    setDoc(prev => ({
      ...prev,
      items: prev.items.map(item => {
        if (item.id === id) {
          const updates: Partial<DocItem> = { [field]: value };
          if (field === 'quantity' || field === 'unitPrice') {
             updates.isTotalOverridden = false;
          }
          if (field === 'total') {
            updates.isTotalOverridden = true;
          }
          return { ...item, ...updates };
        }
        return item;
      })
    }));
  };

  const addItem = () => {
    const newItem: DocItem = {
      id: Math.random().toString(36).substr(2, 9),
      designation: '',
      quantity: 1,
      unitPrice: 0,
      total: 0,
      isTotalOverridden: false,
      isSectionHeader: false
    };
    setDoc(prev => ({ ...prev, items: [...prev.items, newItem] }));
  };

  const addSection = () => {
    const newItem: DocItem = {
      id: Math.random().toString(36).substr(2, 9),
      designation: 'Nouvelle section',
      quantity: 0,
      unitPrice: 0,
      total: 0,
      isTotalOverridden: true,
      isSectionHeader: true
    };
    setDoc(prev => ({ ...prev, items: [...prev.items, newItem] }));
  };

  const deleteItem = (id: string) => {
    setDoc(prev => ({ ...prev, items: prev.items.filter(i => i.id !== id) }));
  };

  const moveItem = (index: number, direction: 'up' | 'down') => {
    const newItems = [...doc.items];
    if (direction === 'up' && index > 0) {
      [newItems[index], newItems[index - 1]] = [newItems[index - 1], newItems[index]];
    } else if (direction === 'down' && index < newItems.length - 1) {
      [newItems[index], newItems[index + 1]] = [newItems[index + 1], newItems[index]];
    }
    setDoc(prev => ({ ...prev, items: newItems }));
  };

  const saveDocument = () => {
    StorageService.saveDocument(doc);
    navigate('/');
  };

  const printDocument = () => {
    setActiveTab('preview');
    // Delay to allow render
    setTimeout(() => window.print(), 100);
  };

  const downloadPdf = () => {
    setActiveTab('preview');
    setTimeout(() => {
        const element = document.getElementById('preview-container');
        if (element && (window as any).html2pdf) {
            const opt = {
              margin: [0,0,0,0],
              filename: `${doc.type}_${doc.number}.pdf`,
              image: { type: 'jpeg', quality: 0.98 },
              html2canvas: { scale: 2 },
              jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' }
            };
            (window as any).html2pdf().set(opt).from(element).save();
        } else {
            // Fallback
            window.print();
        }
    }, 100);
  };

  const generateShareLink = () => {
    const shareData = { doc, profile };
    const json = JSON.stringify(shareData);
    const encoded = btoa(unescape(encodeURIComponent(json)));
    return `${window.location.origin}${window.location.pathname}#/share?data=${encoded}`;
  };

  const handleShare = () => {
    const url = generateShareLink();
    setShareLink(url);
    setShowShareModal(true);
  };
  
  const handleOpenSendModal = () => {
    const link = generateShareLink();
    setEmailSubject(`${doc.type} N° ${doc.number} - ${profile.name}`);
    
    const body = `Bonjour ${doc.clientName},\n\nVeuillez trouver ci-joint votre ${doc.type} N° ${doc.number} du ${new Date(doc.date).toLocaleDateString()}.\n\nVous pouvez consulter et télécharger le document via ce lien sécurisé :\n${link}\n\nCordialement,\n${profile.name}`;
    setMessageBody(body);
    setShowSendModal(true);
  };
  
  const sendEmail = () => {
    const mailtoLink = `mailto:${doc.clientEmail || ''}?subject=${encodeURIComponent(emailSubject)}&body=${encodeURIComponent(messageBody)}`;
    window.location.href = mailtoLink;
  };

  const sendWhatsApp = () => {
    // Basic cleaning of phone number
    const phone = doc.clientPhone?.replace(/[^0-9+]/g, '') || '';
    const waLink = `https://wa.me/${phone}?text=${encodeURIComponent(messageBody)}`;
    window.open(waLink, '_blank');
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text).then(() => {
      alert("Copié dans le presse-papier !");
    });
  };

  const selectClient = (client: Client) => {
     setDoc({
        ...doc,
        clientId: client.id,
        clientName: client.name,
        clientAddress: client.address,
        clientEmail: client.email,
        clientPhone: client.phone,
        clientIce: client.ice
     });
     setShowClientSelector(false);
  };

  return (
    <div className="space-y-6 relative pb-10">
      {/* Toolbar */}
      <div className="flex flex-col xl:flex-row justify-between items-start xl:items-center gap-4 bg-white dark:bg-slate-800 p-4 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 no-print">
        <div className="flex items-center space-x-2">
          <LinkButton to="/" label="←" secondary />
          <h2 className="text-lg md:text-xl font-bold text-slate-800 dark:text-white truncate">
            {isNew ? 'Nouveau' : doc.number}
          </h2>
        </div>
        
        {/* Actions Scrollable for Mobile */}
        <div className="flex overflow-x-auto w-full xl:w-auto pb-2 xl:pb-0 gap-2 items-center no-scrollbar">
          <div className="flex bg-slate-100 dark:bg-slate-700 rounded-lg p-1 shrink-0">
            <button 
              onClick={() => setActiveTab('edit')}
              className={`px-3 py-1.5 rounded-md text-sm font-medium transition-all ${activeTab === 'edit' ? 'bg-white dark:bg-slate-600 text-blue-700 dark:text-blue-300 shadow-sm' : 'text-slate-600 dark:text-slate-400'}`}
            >
              Éditer
            </button>
            <button 
              onClick={() => setActiveTab('preview')}
              className={`px-3 py-1.5 rounded-md text-sm font-medium transition-all ${activeTab === 'preview' ? 'bg-white dark:bg-slate-600 text-blue-700 dark:text-blue-300 shadow-sm' : 'text-slate-600 dark:text-slate-400'}`}
            >
              Aperçu
            </button>
          </div>
          
          <div className="h-6 w-px bg-slate-300 dark:bg-slate-600 mx-1 shrink-0"></div>

          <button onClick={handleShare} className="shrink-0 bg-indigo-50 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-300 hover:bg-indigo-100 dark:hover:bg-indigo-900/50 px-3 py-2 rounded-lg text-sm font-medium shadow-sm flex items-center">
             <span className="hidden md:inline">Partager</span>
             <span className="md:hidden">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" /></svg>
             </span>
          </button>
          
          <button onClick={handleOpenSendModal} className="shrink-0 bg-orange-50 dark:bg-orange-900/30 text-orange-700 dark:text-orange-300 hover:bg-orange-100 dark:hover:bg-orange-900/50 px-3 py-2 rounded-lg text-sm font-medium shadow-sm flex items-center">
             <span className="hidden md:inline mr-1">Envoyer</span>
             <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" /></svg>
          </button>
          
          <button onClick={downloadPdf} className="shrink-0 bg-green-50 dark:bg-green-900/30 text-green-700 dark:text-green-300 hover:bg-green-100 dark:hover:bg-green-900/50 px-3 py-2 rounded-lg text-sm font-medium shadow-sm flex items-center">
             <span className="hidden md:inline mr-1">PDF</span>
             <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" /></svg>
          </button>

          <button onClick={printDocument} className="shrink-0 bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-600 px-3 py-2 rounded-lg text-sm font-medium shadow-sm flex items-center">
             <span className="hidden md:inline mr-1">Imprimer</span>
             <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" /></svg>
          </button>

          <button onClick={saveDocument} className="shrink-0 bg-blue-600 hover:bg-blue-700 text-white px-5 py-2 rounded-lg text-sm font-medium shadow-sm">
            Sauver
          </button>
        </div>
      </div>

      {activeTab === 'edit' ? (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 no-print">
          {/* Main Editor Column */}
          <div className="lg:col-span-2 space-y-6">
            
            {/* Document Header Info */}
            <div className="bg-white dark:bg-slate-800 p-4 md:p-6 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormInput label="Numéro" value={doc.number} onChange={(v: any) => setDoc({...doc, number: v})} />
                <FormInput label="Date" type="date" value={doc.date} onChange={(v: any) => setDoc({...doc, date: v})} />
                <div className="md:col-span-2">
                   <FormInput label="Objet" value={doc.object} onChange={(v: any) => setDoc({...doc, object: v})} placeholder="Ex: Rénovation appartement A2" />
                </div>
              </div>
            </div>

            {/* Items Editor */}
            <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 overflow-hidden">
              <div className="p-4 bg-slate-50 dark:bg-slate-700/50 border-b border-slate-200 dark:border-slate-700 flex justify-between items-center sticky left-0 top-0 z-10">
                <h3 className="font-semibold text-slate-700 dark:text-slate-200 text-sm md:text-base">Lignes</h3>
                <div className="flex space-x-2">
                  <button onClick={addItem} className="text-xs md:text-sm bg-white dark:bg-slate-700 border border-slate-300 dark:border-slate-600 hover:bg-slate-50 dark:hover:bg-slate-600 text-slate-700 dark:text-slate-200 px-2 py-1 md:px-3 md:py-1.5 rounded-md shadow-sm transition-colors">+ Article</button>
                  <button onClick={addSection} className="text-xs md:text-sm bg-white dark:bg-slate-700 border border-slate-300 dark:border-slate-600 hover:bg-slate-50 dark:hover:bg-slate-600 text-slate-700 dark:text-slate-200 px-2 py-1 md:px-3 md:py-1.5 rounded-md shadow-sm transition-colors">+ Section</button>
                </div>
              </div>
              
              {/* Mobile Item Cards View */}
              <div className="block md:hidden p-4 space-y-4 bg-slate-50/50 dark:bg-slate-900/50">
                 {doc.items.map((item, index) => (
                    <div key={item.id} className={`bg-white dark:bg-slate-800 p-4 rounded-xl shadow-sm border ${item.isSectionHeader ? 'border-slate-300 dark:border-slate-600 bg-slate-50 dark:bg-slate-700' : 'border-slate-200 dark:border-slate-700'}`}>
                       <div className="flex justify-between items-start mb-3">
                          <textarea 
                             rows={item.isSectionHeader ? 1 : 2}
                             placeholder={item.isSectionHeader ? "Nom de la section..." : "Désignation..."}
                             value={item.designation}
                             onChange={(e) => handleItemChange(item.id, 'designation', e.target.value)}
                             className={`w-full bg-transparent border-none p-0 focus:ring-0 resize-none ${item.isSectionHeader ? 'font-bold text-slate-800 dark:text-white' : 'text-slate-700 dark:text-slate-200'}`}
                          />
                          <button onClick={() => deleteItem(item.id)} className="text-slate-400 hover:text-red-500 ml-2">
                             ✕
                          </button>
                       </div>
                       
                       {!item.isSectionHeader && (
                          <div className="grid grid-cols-3 gap-3 mb-3">
                             <div>
                                <label className="text-[10px] uppercase text-slate-400 font-bold">Qté</label>
                                <input 
                                   type="number" 
                                   value={item.quantity} 
                                   onChange={(e) => handleItemChange(item.id, 'quantity', parseFloat(e.target.value) || 0)}
                                   className="w-full border-slate-200 dark:border-slate-600 dark:bg-slate-700 dark:text-white rounded-lg text-right p-2 text-sm focus:border-blue-500 focus:ring-blue-500"
                                />
                             </div>
                             <div>
                                <label className="text-[10px] uppercase text-slate-400 font-bold">Prix U.</label>
                                <input 
                                   type="number" 
                                   value={item.unitPrice} 
                                   onChange={(e) => handleItemChange(item.id, 'unitPrice', parseFloat(e.target.value) || 0)}
                                   className="w-full border-slate-200 dark:border-slate-600 dark:bg-slate-700 dark:text-white rounded-lg text-right p-2 text-sm focus:border-blue-500 focus:ring-blue-500"
                                />
                             </div>
                             <div>
                                <label className="text-[10px] uppercase text-slate-400 font-bold">Total</label>
                                <div className="p-2 text-right text-sm font-bold text-slate-800 dark:text-white bg-slate-50 dark:bg-slate-700 rounded-lg border border-transparent">
                                   {item.total.toFixed(0)}
                                </div>
                             </div>
                          </div>
                       )}

                       <div className="flex justify-end space-x-2 pt-2 border-t border-slate-100 dark:border-slate-700">
                          <button onClick={() => moveItem(index, 'up')} disabled={index === 0} className="p-1 text-slate-400 hover:text-blue-600 disabled:opacity-30">▲</button>
                          <button onClick={() => moveItem(index, 'down')} disabled={index === doc.items.length - 1} className="p-1 text-slate-400 hover:text-blue-600 disabled:opacity-30">▼</button>
                       </div>
                    </div>
                 ))}
                 {doc.items.length === 0 && <div className="text-center text-slate-400 py-4">Aucune ligne. Ajoutez un article.</div>}
              </div>

              {/* Desktop Table View */}
              <div className="hidden md:block overflow-x-auto pb-2">
                <table className="min-w-[600px] w-full text-left text-sm">
                  <thead>
                    <tr className="bg-slate-50 dark:bg-slate-700/50 text-slate-500 dark:text-slate-400 border-b border-slate-200 dark:border-slate-700">
                      <th className="px-2 py-3 font-medium w-8"></th>
                      <th className="px-2 py-3 font-medium">Désignation</th>
                      <th className="px-2 py-3 font-medium w-16 md:w-20">Qté</th>
                      <th className="px-2 py-3 font-medium w-20 md:w-28">Prix U.</th>
                      <th className="px-2 py-3 font-medium w-24 md:w-28">Total</th>
                      <th className="px-2 py-3 font-medium w-8"></th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-700">
                    {doc.items.map((item, index) => (
                      <tr key={item.id} className={`group ${item.isSectionHeader ? 'bg-slate-50 dark:bg-slate-700/30' : 'hover:bg-slate-50 dark:hover:bg-slate-700/30'}`}>
                        <td className="px-1 py-2 text-center text-slate-300">
                          <div className="flex flex-col space-y-1">
                            <button className="p-1 hover:text-blue-600" onClick={() => moveItem(index, 'up')} disabled={index === 0}>▲</button>
                            <button className="p-1 hover:text-blue-600" onClick={() => moveItem(index, 'down')} disabled={index === doc.items.length - 1}>▼</button>
                          </div>
                        </td>
                        <td className="px-2 py-2">
                           <input 
                            type="text" 
                            value={item.designation} 
                            onChange={(e) => handleItemChange(item.id, 'designation', e.target.value)}
                            className={`w-full bg-transparent focus:ring-2 focus:ring-blue-500 rounded px-2 py-3 ${item.isSectionHeader ? 'font-bold text-slate-800 dark:text-white' : 'text-slate-700 dark:text-slate-200'}`}
                            placeholder={item.isSectionHeader ? "Nom de la section..." : "Description..."}
                          />
                        </td>
                        {item.isSectionHeader ? (
                          <td colSpan={3}></td>
                        ) : (
                          <>
                            <td className="px-2 py-2">
                              <input 
                                type="number" 
                                value={item.quantity} 
                                onChange={(e) => handleItemChange(item.id, 'quantity', parseFloat(e.target.value) || 0)}
                                className="w-full bg-transparent border-slate-200 dark:border-slate-600 dark:text-slate-200 focus:ring-2 focus:ring-blue-500 rounded px-2 py-3 text-right"
                              />
                            </td>
                            <td className="px-2 py-2">
                              <input 
                                type="number" 
                                value={item.unitPrice} 
                                onChange={(e) => handleItemChange(item.id, 'unitPrice', parseFloat(e.target.value) || 0)}
                                className="w-full bg-transparent border-slate-200 dark:border-slate-600 dark:text-slate-200 focus:ring-2 focus:ring-blue-500 rounded px-2 py-3 text-right"
                              />
                            </td>
                            <td className="px-2 py-2 relative">
                              <input 
                                type="number" 
                                value={item.total} 
                                onChange={(e) => handleItemChange(item.id, 'total', parseFloat(e.target.value) || 0)}
                                className={`w-full bg-transparent border-slate-200 dark:border-slate-600 focus:ring-2 focus:ring-blue-500 rounded px-2 py-3 text-right font-medium ${item.isTotalOverridden ? 'text-amber-600 bg-amber-50 dark:bg-amber-900/30 dark:text-amber-400' : 'text-slate-700 dark:text-slate-200'}`}
                              />
                              {item.isTotalOverridden && (
                                <button 
                                  title="Recalculer"
                                  onClick={() => handleItemChange(item.id, 'isTotalOverridden', false)}
                                  className="absolute right-0 top-0 text-amber-500 text-lg p-1"
                                >
                                  ↺
                                </button>
                              )}
                            </td>
                          </>
                        )}
                        <td className="px-1 py-2">
                          <button onClick={() => deleteItem(item.id)} className="text-slate-400 hover:text-red-500 p-2 rounded transition-colors">
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
            
            <div className="bg-white dark:bg-slate-800 p-4 md:p-6 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700">
               <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">Notes & Conditions</label>
               <textarea 
                  value={doc.notes || ''} 
                  onChange={(e) => setDoc({...doc, notes: e.target.value})}
                  className="w-full border-slate-300 dark:border-slate-600 dark:bg-slate-700 dark:text-white rounded-lg shadow-sm focus:border-blue-500 focus:ring-blue-500 min-h-[100px] text-base md:text-sm py-2"
                  placeholder="Conditions de paiement, délai de livraison, etc."
               />
            </div>
          </div>

          {/* Sidebar Settings Column */}
          <div className="space-y-6">
             <div className="bg-white dark:bg-slate-800 p-4 md:p-5 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700">
                <div className="flex justify-between items-center mb-4 border-b dark:border-slate-700 pb-2">
                   <h3 className="font-semibold text-slate-800 dark:text-white">Client</h3>
                   <button 
                     onClick={() => setShowClientSelector(true)}
                     className="text-xs bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 px-2 py-1 rounded hover:bg-blue-100 dark:hover:bg-blue-900/50 font-medium"
                   >
                     Importer
                   </button>
                </div>
                <div className="space-y-3">
                  <FormInput label="Nom du Client" value={doc.clientName} onChange={(v: any) => setDoc({...doc, clientName: v})} placeholder="Client SARL" />
                  <div className="space-y-1">
                     <label className="text-sm font-medium text-slate-700 dark:text-slate-300">Adresse</label>
                     <textarea 
                      value={doc.clientAddress} 
                      onChange={(e) => setDoc({...doc, clientAddress: e.target.value})} 
                      className="w-full border-slate-300 dark:border-slate-600 dark:bg-slate-700 dark:text-white rounded-md shadow-sm focus:border-blue-500 focus:ring-blue-500 text-base md:text-sm py-2"
                      rows={3}
                     />
                  </div>
                  <FormInput label="ICE Client" value={doc.clientIce || ''} onChange={(v: any) => setDoc({...doc, clientIce: v})} placeholder="Optionnel" />
                  
                  {/* NEW CONTACT FIELDS */}
                  <FormInput label="Email Client" value={doc.clientEmail || ''} onChange={(v: any) => setDoc({...doc, clientEmail: v})} placeholder="email@client.com" type="email" />
                  <FormInput label="Téléphone Client" value={doc.clientPhone || ''} onChange={(v: any) => setDoc({...doc, clientPhone: v})} placeholder="+212..." type="tel" />
                </div>
             </div>

             <div className="bg-white dark:bg-slate-800 p-4 md:p-5 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700">
                <h3 className="font-semibold text-slate-800 dark:text-white mb-4 border-b dark:border-slate-700 pb-2">Paramètres</h3>
                <div className="space-y-3">
                   <div>
                     <label className="text-sm font-medium text-slate-700 dark:text-slate-300 block mb-1">Type de document</label>
                     <div className="flex rounded-md shadow-sm">
                        <button 
                          onClick={() => setDoc({...doc, type: DocType.DEVIS})}
                          className={`flex-1 px-4 py-3 md:py-2 text-sm border rounded-l-md ${doc.type === DocType.DEVIS ? 'bg-blue-600 text-white border-blue-600' : 'bg-white dark:bg-slate-700 text-slate-700 dark:text-slate-200 border-slate-300 dark:border-slate-600 hover:bg-slate-50 dark:hover:bg-slate-600'}`}
                        >
                          Devis
                        </button>
                        <button 
                          onClick={() => setDoc({...doc, type: DocType.FACTURE})}
                          className={`flex-1 px-4 py-3 md:py-2 text-sm border-t border-b border-r rounded-r-md ${doc.type === DocType.FACTURE ? 'bg-blue-600 text-white border-blue-600' : 'bg-white dark:bg-slate-700 text-slate-700 dark:text-slate-200 border-slate-300 dark:border-slate-600 hover:bg-slate-50 dark:hover:bg-slate-600'}`}
                        >
                          Facture
                        </button>
                     </div>
                   </div>

                   <div>
                     <label className="text-sm font-medium text-slate-700 dark:text-slate-300 block mb-1">Modèle PDF</label>
                     <div className="flex rounded-md shadow-sm">
                        <button 
                          onClick={() => setDoc({...doc, template: 'classic'})}
                          className={`flex-1 px-2 py-2 text-xs md:text-sm border rounded-l-md ${doc.template === 'classic' ? 'bg-slate-700 text-white border-slate-700' : 'bg-white dark:bg-slate-700 text-slate-700 dark:text-slate-200 border-slate-300 dark:border-slate-600 hover:bg-slate-50 dark:hover:bg-slate-600'}`}
                        >
                          Classique
                        </button>
                        <button 
                          onClick={() => setDoc({...doc, template: 'minimal'})}
                          className={`flex-1 px-2 py-2 text-xs md:text-sm border-t border-b border-r ${doc.template === 'minimal' ? 'bg-slate-700 text-white border-slate-700' : 'bg-white dark:bg-slate-700 text-slate-700 dark:text-slate-200 border-slate-300 dark:border-slate-600 hover:bg-slate-50 dark:hover:bg-slate-600'}`}
                        >
                          Minimal
                        </button>
                        <button 
                          onClick={() => setDoc({...doc, template: 'modern'})}
                          className={`flex-1 px-2 py-2 text-xs md:text-sm border-t border-b border-r rounded-r-md ${doc.template === 'modern' ? 'bg-slate-700 text-white border-slate-700' : 'bg-white dark:bg-slate-700 text-slate-700 dark:text-slate-200 border-slate-300 dark:border-slate-600 hover:bg-slate-50 dark:hover:bg-slate-600'}`}
                        >
                          Moderne
                        </button>
                     </div>
                   </div>
                   
                   <FormInput label="Devise" value={doc.currency} onChange={(v: any) => setDoc({...doc, currency: v})} />
                   
                   {doc.type === DocType.DEVIS && (
                      <div className="bg-slate-50 dark:bg-slate-700/50 p-3 rounded-lg border border-slate-100 dark:border-slate-700 mt-2">
                         <div className="flex items-center space-x-2 mb-2">
                            <input 
                              type="checkbox" 
                              id="hasDeposit" 
                              checked={doc.hasDeposit} 
                              onChange={(e) => setDoc({...doc, hasDeposit: e.target.checked})}
                              className="h-4 w-4 text-blue-600 border-slate-300 rounded focus:ring-blue-500"
                            />
                            <label htmlFor="hasDeposit" className="text-sm font-medium text-slate-700 dark:text-slate-300">Acompte à la commande</label>
                         </div>
                         
                         {doc.hasDeposit && (
                            <div className="animate-in fade-in slide-in-from-top-2 duration-200">
                               <label className="flex justify-between text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                                  <span>Pourcentage (%)</span>
                                  {doc.depositAmount && doc.depositAmount > 0 ? (
                                      <span className="text-slate-500 dark:text-slate-400 font-normal">{doc.depositAmount.toFixed(0)} {doc.currency}</span>
                                  ) : null}
                               </label>
                               <input 
                                  type="number" 
                                  min="0" 
                                  max="100" 
                                  value={doc.depositPercentage || 0} 
                                  onChange={(e) => setDoc({...doc, depositPercentage: parseFloat(e.target.value) || 0})} 
                                  className="w-full border-slate-300 dark:border-slate-600 dark:bg-slate-700 dark:text-white rounded-md shadow-sm focus:border-blue-500 focus:ring-blue-500 text-base md:text-sm py-2" 
                               />
                            </div>
                         )}
                      </div>
                   )}

                   <div className="flex items-center space-x-2 py-2">
                       <input 
                         type="checkbox" 
                         id="hasVat" 
                         checked={doc.hasVat} 
                         onChange={(e) => setDoc({...doc, hasVat: e.target.checked})}
                         className="h-4 w-4 text-blue-600 border-slate-300 rounded focus:ring-blue-500"
                       />
                       <label htmlFor="hasVat" className="text-sm font-medium text-slate-700 dark:text-slate-300">Appliquer la TVA</label>
                   </div>

                   {doc.hasVat && (
                    <div className="animate-in fade-in slide-in-from-top-2 duration-200">
                       <label className="flex justify-between text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                          <span>Taux TVA (%)</span>
                          <span className="text-slate-500 dark:text-slate-400">{doc.vatAmount.toFixed(2)} {doc.currency}</span>
                       </label>
                       <input type="number" value={doc.vatRate} onChange={(e) => setDoc({...doc, vatRate: parseFloat(e.target.value) || 0})} className="w-full border-slate-300 dark:border-slate-600 dark:bg-slate-700 dark:text-white rounded-md shadow-sm focus:border-blue-500 focus:ring-blue-500 text-base md:text-sm py-2" />
                     </div>
                   )}

                   <div className="pt-4 border-t border-slate-100 dark:border-slate-700">
                      {doc.hasVat ? (
                        <>
                           <div className="flex justify-between items-center mb-1">
                             <span className="text-slate-600 dark:text-slate-400">Total HT</span>
                             <span className="font-medium text-slate-800 dark:text-white">{doc.subTotal.toFixed(2)} {doc.currency}</span>
                           </div>
                           <div className="flex justify-between items-center mb-1 text-slate-500 dark:text-slate-400">
                               <span>TVA ({doc.vatRate}%)</span>
                               <span>{doc.vatAmount.toFixed(2)} {doc.currency}</span>
                           </div>
                           <div className="flex justify-between items-center mt-3 pt-3 border-t border-slate-100 dark:border-slate-700">
                             <span className="text-lg font-bold text-slate-800 dark:text-white">Total TTC</span>
                             <span className="text-lg font-bold text-blue-700 dark:text-blue-400">{doc.totalTTC.toFixed(2)} {doc.currency}</span>
                           </div>
                        </>
                      ) : (
                         <div className="flex justify-between items-center mt-3 pt-3 border-t border-slate-100 dark:border-slate-700">
                            <span className="text-lg font-bold text-slate-800 dark:text-white">Total HT</span>
                            <span className="text-lg font-bold text-blue-700 dark:text-blue-400">{doc.totalTTC.toFixed(2)} {doc.currency}</span>
                         </div>
                      )}
                      
                      {doc.type === DocType.DEVIS && doc.hasDeposit && doc.depositAmount && doc.depositAmount > 0 ? (
                         <div className="flex justify-between items-center mt-1 pt-1 border-t border-dashed border-slate-200 dark:border-slate-700 text-slate-500 dark:text-slate-400 text-sm">
                             <span>Acompte ({doc.depositPercentage}%)</span>
                             <span>{doc.depositAmount.toFixed(2)} {doc.currency}</span>
                         </div>
                      ) : null}
                   </div>
                </div>
             </div>
          </div>
        </div>
      ) : (
        <div id="preview-container">
          <DocumentPreview doc={doc} profile={profile} />
        </div>
      )}

      {/* Share Modal */}
      {showShareModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-800 rounded-xl shadow-xl max-w-lg w-full p-6 animate-in fade-in zoom-in duration-200">
            <h3 className="text-xl font-bold text-slate-800 dark:text-white mb-4">Partager le document</h3>
            <p className="text-slate-600 dark:text-slate-400 text-sm mb-4">
              Voici un lien sécurisé pour visualiser ce document en lecture seule. Vous pouvez envoyer ce lien à votre client.
            </p>
            
            <div className="bg-slate-50 dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-lg p-3 flex items-center gap-2 mb-6">
              <input 
                type="text" 
                readOnly 
                value={shareLink} 
                className="flex-1 bg-transparent border-none text-sm text-slate-600 dark:text-slate-300 focus:ring-0 truncate"
              />
              <button 
                onClick={() => copyToClipboard(shareLink)}
                className="text-blue-600 dark:text-blue-400 hover:text-blue-800 text-sm font-medium whitespace-nowrap"
              >
                Copier
              </button>
            </div>

            <div className="flex justify-end">
              <button 
                onClick={() => setShowShareModal(false)}
                className="bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 dark:hover:bg-slate-600 text-slate-800 dark:text-white px-4 py-2 rounded-lg font-medium transition-colors"
              >
                Fermer
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Send Modal */}
      {showSendModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-800 rounded-xl shadow-xl max-w-xl w-full flex flex-col max-h-[90vh] animate-in fade-in zoom-in duration-200">
             {/* Header */}
             <div className="p-4 border-b border-slate-100 dark:border-slate-700 flex justify-between items-center">
                <h3 className="text-xl font-bold text-slate-800 dark:text-white">Envoyer le document</h3>
                <button onClick={() => setShowSendModal(false)} className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-300">
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                </button>
             </div>

             {/* Tabs */}
             <div className="flex border-b border-slate-100 dark:border-slate-700">
                <button 
                  onClick={() => setSendMethod('email')}
                  className={`flex-1 py-3 text-sm font-medium transition-colors ${sendMethod === 'email' ? 'text-blue-600 dark:text-blue-400 border-b-2 border-blue-600 dark:border-blue-400' : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200'}`}
                >
                  <span className="flex items-center justify-center gap-2">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" /></svg>
                    Email
                  </span>
                </button>
                <button 
                  onClick={() => setSendMethod('whatsapp')}
                  className={`flex-1 py-3 text-sm font-medium transition-colors ${sendMethod === 'whatsapp' ? 'text-green-600 dark:text-green-400 border-b-2 border-green-600 dark:border-green-400' : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200'}`}
                >
                  <span className="flex items-center justify-center gap-2">
                    <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z"/></svg>
                    WhatsApp
                  </span>
                </button>
             </div>

             {/* Content */}
             <div className="p-6 overflow-y-auto flex-1">
               {sendMethod === 'email' ? (
                 <div className="space-y-4">
                    <FormInput label="Email destinataire" type="email" value={doc.clientEmail} onChange={(v: any) => setDoc({...doc, clientEmail: v})} />
                    <FormInput label="Sujet" value={emailSubject} onChange={setEmailSubject} />
                    <div className="space-y-1">
                      <label className="block text-sm font-medium text-slate-700 dark:text-slate-300">Message</label>
                      <textarea 
                        value={messageBody} 
                        onChange={(e) => setMessageBody(e.target.value)} 
                        className="w-full border-slate-300 dark:border-slate-600 dark:bg-slate-700 dark:text-white rounded-md shadow-sm focus:border-blue-500 focus:ring-blue-500 text-sm py-2"
                        rows={8}
                      />
                    </div>
                    <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 p-3 rounded-lg text-xs text-amber-800 dark:text-amber-200">
                       Note : Le PDF ne peut pas être attaché automatiquement via le navigateur. Un lien de téléchargement a été inclus dans le message. Vous pouvez également télécharger le PDF manuellement ci-dessous pour l'ajouter à votre email.
                    </div>
                 </div>
               ) : (
                 <div className="space-y-4">
                    <FormInput label="Numéro WhatsApp (avec indicatif)" type="tel" value={doc.clientPhone} onChange={(v: any) => setDoc({...doc, clientPhone: v})} placeholder="+212 6..." />
                    <div className="space-y-1">
                      <label className="block text-sm font-medium text-slate-700 dark:text-slate-300">Message</label>
                      <textarea 
                        value={messageBody} 
                        onChange={(e) => setMessageBody(e.target.value)} 
                        className="w-full border-slate-300 dark:border-slate-600 dark:bg-slate-700 dark:text-white rounded-md shadow-sm focus:border-green-500 focus:ring-green-500 text-sm py-2"
                        rows={8}
                      />
                    </div>
                 </div>
               )}
             </div>

             {/* Footer Actions */}
             <div className="p-4 border-t border-slate-100 dark:border-slate-700 flex justify-between items-center bg-slate-50 dark:bg-slate-700/50">
               <button onClick={downloadPdf} className="text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white text-sm font-medium flex items-center gap-1">
                 <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" /></svg>
                 Télécharger PDF
               </button>
               
               <div className="flex gap-2">
                 <button onClick={() => setShowSendModal(false)} className="px-4 py-2 text-slate-600 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200 font-medium">
                   Annuler
                 </button>
                 {sendMethod === 'email' ? (
                   <button onClick={sendEmail} className="px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium shadow-sm flex items-center gap-2">
                     Ouvrir Client Mail
                     <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 5l7 7m0 0l-7 7m7-7H3" /></svg>
                   </button>
                 ) : (
                   <button onClick={sendWhatsApp} className="px-6 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg font-medium shadow-sm flex items-center gap-2">
                     Ouvrir WhatsApp
                     <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 5l7 7m0 0l-7 7m7-7H3" /></svg>
                   </button>
                 )}
               </div>
             </div>
          </div>
        </div>
      )}

      {/* Client Selector Modal */}
      {showClientSelector && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
           <div className="bg-white dark:bg-slate-800 rounded-xl shadow-xl max-w-lg w-full p-4 animate-in fade-in zoom-in duration-200">
               <div className="flex justify-between items-center mb-4">
                  <h3 className="text-lg font-bold text-slate-800 dark:text-white">Sélectionner un client</h3>
                  <button onClick={() => setShowClientSelector(false)} className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-300">✕</button>
               </div>
               
               <div className="max-h-[60vh] overflow-y-auto">
                  {clients.length === 0 ? (
                     <p className="text-slate-500 text-center py-4">Aucun client enregistré.</p>
                  ) : (
                     <div className="space-y-2">
                        {clients.map(client => (
                           <button 
                              key={client.id}
                              onClick={() => selectClient(client)}
                              className="w-full text-left p-3 hover:bg-blue-50 dark:hover:bg-blue-900/30 rounded-lg border border-transparent hover:border-blue-100 dark:hover:border-blue-800 transition-colors group"
                           >
                              <div className="font-bold text-slate-800 dark:text-white group-hover:text-blue-700 dark:group-hover:text-blue-400">{client.name}</div>
                              <div className="text-sm text-slate-500 dark:text-slate-400">{client.address}</div>
                           </button>
                        ))}
                     </div>
                  )}
               </div>
               
               <div className="mt-4 pt-4 border-t border-slate-100 dark:border-slate-700 flex justify-end">
                  <button onClick={() => navigate('/clients/new')} className="text-blue-600 dark:text-blue-400 text-sm font-medium hover:underline">
                     + Créer un nouveau client
                  </button>
               </div>
           </div>
        </div>
      )}
    </div>
  );
};

const LinkButton = ({ to, label, secondary }: { to: string, label: string, secondary?: boolean }) => (
  <Link to={to} className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${secondary ? 'bg-slate-100 text-slate-700 hover:bg-slate-200 dark:bg-slate-700 dark:text-slate-300 dark:hover:bg-slate-600' : 'bg-blue-600 text-white hover:bg-blue-700'}`}>
    {label}
  </Link>
);

const FormInput = ({ label, value, onChange, type = "text", placeholder }: any) => (
  <div className="space-y-1">
    <label className="block text-sm font-medium text-slate-700 dark:text-slate-300">{label}</label>
    <input 
      type={type} 
      value={value} 
      onChange={(e) => onChange(e.target.value)} 
      className="w-full border-slate-300 dark:border-slate-600 dark:bg-slate-700 dark:text-white rounded-md shadow-sm focus:border-blue-500 focus:ring-blue-500 text-base md:text-sm py-2"
      placeholder={placeholder}
    />
  </div>
);

// --- Preview Component Dispatcher ---
export const DocumentPreview: React.FC<{ doc: DocumentData; profile: CompanyProfile }> = ({ doc, profile }) => {
  if (doc.template === 'minimal') {
    return <MinimalTemplate doc={doc} profile={profile} />;
  }
  if (doc.template === 'modern') {
    return <ModernTemplate doc={doc} profile={profile} />;
  }
  return <ClassicTemplate doc={doc} profile={profile} />;
};

// --- Minimal Template ---
const MinimalTemplate: React.FC<{ doc: DocumentData; profile: CompanyProfile }> = ({ doc, profile }) => {
  return (
    <div className="bg-white shadow-lg mx-auto max-w-[21cm] min-h-[29.7cm] p-[2cm] print:p-0 print:shadow-none print:w-full print:max-w-none text-black leading-relaxed font-sans">
      {/* Minimal Header */}
      <div className="flex justify-between items-start mb-16">
        <div>
           {profile.logoUrl && (
             <div className="h-12 w-auto mb-4">
                 <img src={profile.logoUrl} className="h-full object-contain" alt="Logo" />
             </div>
           )}
           <h2 className="font-bold text-lg uppercase tracking-wider">{profile.name}</h2>
           <p className="text-sm text-gray-600 whitespace-pre-line mt-1">{profile.address}</p>
           <p className="text-sm text-gray-600">{profile.email} • {profile.phone}</p>
        </div>
        <div className="text-right">
           <h1 className="text-3xl font-light tracking-wide text-gray-900 mb-2">{doc.type}</h1>
           <p className="text-sm text-gray-600">Nº{doc.number}</p>
           <p className="text-sm text-gray-600">Date: {new Date(doc.date).toLocaleDateString('fr-FR')}</p>
        </div>
      </div>

      {/* Client Info (Simple text block) */}
      <div className="mb-12">
        <p className="text-xs uppercase tracking-widest text-gray-400 mb-2">Pour</p>
        <p className="font-bold text-xl">{doc.clientName || 'Client'}</p>
        <p className="text-gray-700 whitespace-pre-line mt-1">{doc.clientAddress}</p>
        {doc.clientIce && <p className="text-sm text-gray-500 mt-1">ICE: {doc.clientIce}</p>}
      </div>

      {/* Object */}
      {doc.object && (
        <div className="mb-8 border-l-2 border-gray-900 pl-4 py-1">
          <p className="text-gray-900 font-medium">{doc.object}</p>
        </div>
      )}

      {/* Minimal Table */}
      <table className="w-full mb-12">
        <thead>
          <tr className="border-b border-gray-900">
            <th className="text-left py-2 font-medium text-xs uppercase tracking-wider text-gray-500">Description</th>
            <th className="text-right py-2 font-medium text-xs uppercase tracking-wider text-gray-500 w-20">Qté</th>
            <th className="text-right py-2 font-medium text-xs uppercase tracking-wider text-gray-500 w-32">Prix U.</th>
            <th className="text-right py-2 font-medium text-xs uppercase tracking-wider text-gray-500 w-32">Total</th>
          </tr>
        </thead>
        <tbody>
          {doc.items.map(item => (
            <tr key={item.id} className="border-b border-gray-100 last:border-0">
              {item.isSectionHeader ? (
                 <td colSpan={4} className="py-4 font-bold text-gray-900 pt-6">
                  {item.designation}
                </td>
              ) : (
                <>
                  <td className="py-4 text-sm text-gray-800">{item.designation}</td>
                  <td className="py-4 text-sm text-gray-600 text-right">{item.quantity}</td>
                  <td className="py-4 text-sm text-gray-600 text-right">{item.unitPrice.toFixed(2)}</td>
                  <td className="py-4 text-sm text-gray-900 font-medium text-right">{item.total.toFixed(2)}</td>
                </>
              )}
            </tr>
          ))}
        </tbody>
      </table>

      {/* Minimal Totals */}
      <div className="flex justify-end mb-16">
        <div className="w-1/2 md:w-1/3">
           {doc.hasVat ? (
               <div className="space-y-3">
                  <div className="flex justify-between text-sm text-gray-600">
                     <span>Total HT</span>
                     <span>{doc.subTotal.toFixed(2)} {doc.currency}</span>
                  </div>
                  <div className="flex justify-between text-sm text-gray-600">
                     <span>TVA ({doc.vatRate}%)</span>
                     <span>{doc.vatAmount.toFixed(2)} {doc.currency}</span>
                  </div>
                  <div className="flex justify-between text-2xl font-bold text-gray-900 pt-4 border-t border-gray-200">
                     <span>Total TTC</span>
                     <span>{doc.totalTTC.toFixed(2)} {doc.currency}</span>
                  </div>
               </div>
           ) : (
                <div className="flex justify-between text-2xl font-bold text-gray-900 pt-4 border-t border-gray-900">
                   <span>Total HT</span>
                   <span>{doc.totalTTC.toFixed(2)} {doc.currency}</span>
                </div>
           )}
           {doc.type === DocType.DEVIS && doc.hasDeposit && doc.depositAmount && doc.depositAmount > 0 && (
              <div className="mt-4 pt-2 border-t border-gray-100">
                  <p className="font-bold text-xs uppercase text-gray-600">NOTE: ACOMPTE DE {doc.depositPercentage}% A LA COMMANDE</p>
                  <p className="font-bold text-lg text-gray-900">{doc.depositAmount.toFixed(2)} {doc.currency}</p>
              </div>
           )}
        </div>
      </div>

      {/* Footer (Minimal) */}
      <div className="mt-auto border-t border-gray-100 pt-6">
        {doc.notes && (
          <div className="mb-6 text-sm text-gray-600">
             <p className="font-bold mb-1 text-xs uppercase tracking-wide">Notes</p>
             <p className="whitespace-pre-wrap">{doc.notes}</p>
          </div>
        )}
        <div className="text-center text-[10px] text-gray-400 uppercase tracking-widest">
           {profile.name} • ICE {profile.ice} • RC {profile.rc}
        </div>
      </div>
    </div>
  );
};

// --- Modern Template (Replicating Screenshot) ---
const ModernTemplate: React.FC<{ doc: DocumentData; profile: CompanyProfile }> = ({ doc, profile }) => {
  const themeColor = 'bg-[#E6F0E6]'; // Light sage green background for header/footer

  return (
    <div className="bg-white shadow-lg mx-auto max-w-[21cm] min-h-[29.7cm] flex flex-col print:p-0 print:shadow-none print:w-full print:max-w-none text-slate-900 font-sans">
      
      {/* Header Strip */}
      <div className={`${themeColor} p-8 flex justify-between items-start h-40`}>
         {/* Logo Left */}
         <div className="flex items-center">
            {profile.logoUrl ? (
                <img src={profile.logoUrl} className="h-16 object-contain mr-4" alt="Logo" />
            ) : (
                <div className="text-2xl font-bold text-slate-800">{profile.name}</div>
            )}
         </div>

         {/* Title Right */}
         <div className="text-right">
            <h1 className="text-4xl text-slate-700 font-normal mb-1">{doc.type} <span className="text-slate-500">Nº{doc.number}</span></h1>
            <p className="text-slate-800 font-bold">Date : {new Date(doc.date).toLocaleDateString('fr-FR')}</p>
         </div>
      </div>

      <div className="px-10 py-8 flex justify-between items-start">
         {/* Client Info (Left) */}
         <div className="w-5/12">
            <h3 className="text-blue-900 font-bold text-lg mb-2">Client: {doc.clientName || '...'}</h3>
            <p className="text-slate-700 whitespace-pre-line text-sm leading-relaxed">
              {doc.clientAddress}
            </p>
             {doc.clientIce && <p className="text-sm text-slate-600 mt-2">{doc.clientIce}</p>}
         </div>

         {/* Company Info (Right) */}
         <div className="w-5/12 text-right">
             <p className="text-slate-800 font-bold whitespace-pre-line text-sm leading-relaxed mb-2">
               {profile.address}
             </p>
             <p className="text-slate-800 font-bold text-sm">{profile.phone}</p>
             <p className="text-slate-800 font-bold text-sm">{profile.email}</p>
         </div>
      </div>

      {/* Object */}
      {doc.object && (
        <div className="px-10 mb-6">
           <h2 className="text-xl font-bold text-black border-b border-transparent inline-block">Objet: {doc.object}</h2>
        </div>
      )}

      {/* Table */}
      <div className="px-10 flex-1">
        <table className="w-full">
          <thead>
            <tr className="border-t-2 border-b-2 border-black">
              <th className="text-left py-2 font-bold text-black text-sm uppercase">Désignation</th>
              <th className="text-center py-2 font-bold text-black text-sm uppercase w-20">Qté</th>
              <th className="text-center py-2 font-bold text-black text-sm uppercase w-32">Prix</th>
              <th className="text-right py-2 font-bold text-black text-sm uppercase w-32">Total ({doc.currency})</th>
            </tr>
          </thead>
          <tbody>
            {doc.items.map(item => (
              <tr key={item.id} className="border-b border-slate-300">
                {item.isSectionHeader ? (
                  <td colSpan={4} className="py-3 font-bold text-slate-900 text-sm pl-2 bg-slate-50">
                    {item.designation}
                  </td>
                ) : (
                  <>
                    <td className="py-3 text-sm text-slate-900 pl-2">{item.designation}</td>
                    <td className="py-3 text-sm text-slate-900 text-center">{item.quantity || ''}</td>
                    <td className="py-3 text-sm text-slate-900 text-center">{item.unitPrice > 0 ? item.unitPrice.toFixed(0) : ''}</td>
                    <td className="py-3 text-sm text-slate-900 text-right pr-2 font-medium">{item.total.toFixed(0)}</td>
                  </>
                )}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Bottom Section: Signature & Totals */}
      <div className="px-10 mt-8 mb-12 flex justify-between items-start">
         {/* Signature Box */}
         <div className="w-5/12">
            {doc.type === DocType.DEVIS && doc.hasDeposit && doc.depositPercentage && doc.depositPercentage > 0 ? (
               <p className="font-bold text-black mb-3 text-sm">NOTE: ACOMPTE DE {doc.depositPercentage}% A LA COMMANDE {doc.depositAmount ? doc.depositAmount.toFixed(0).replace(/\B(?=(\d{3})+(?!\d))/g, " ") : ''} {doc.currency}</p>
            ) : null}
            <div className="border border-slate-300 rounded-2xl h-32 p-4 relative">
               <span className="text-blue-900 font-bold text-sm">Signature:</span>
            </div>
         </div>

         {/* Totals Box */}
         <div className={`w-5/12 ${themeColor} p-6`}>
            {doc.hasVat ? (
               <div className="space-y-3">
                  <div className="flex justify-between text-lg font-bold text-black">
                     <span>Total HT :</span>
                     <span>{doc.subTotal.toFixed(0).replace(/\B(?=(\d{3})+(?!\d))/g, " ")} {doc.currency}</span>
                  </div>
                  <div className="flex justify-between text-lg font-bold text-black">
                     <span>TVA ({doc.vatRate}%) :</span>
                     <span>{doc.vatAmount.toFixed(0).replace(/\B(?=(\d{3})+(?!\d))/g, " ")} {doc.currency}</span>
                  </div>
                  <div className="flex justify-between text-lg font-bold text-black pt-2">
                     <span>Total TTC :</span>
                     <span>{doc.totalTTC.toFixed(0).replace(/\B(?=(\d{3})+(?!\d))/g, " ")} {doc.currency}</span>
                  </div>
               </div>
            ) : (
                <div className="flex justify-between text-lg font-bold text-black">
                   <span>Total HT :</span>
                   <span>{doc.totalTTC.toFixed(0).replace(/\B(?=(\d{3})+(?!\d))/g, " ")} {doc.currency}</span>
                </div>
            )}
         </div>
      </div>

      <div className="text-center mb-4 text-sm font-medium text-slate-800 uppercase tracking-wide">
         MERCI DE VOTRE CONFIANCE
      </div>

      {/* Footer Strip */}
      <div className={`${themeColor} p-4 text-center text-[10px] text-slate-900`}>
         <p>R.C.N: {profile.rc || '...'} // ICE: {profile.ice || '...'} // Patente: {profile.patente || '...'}</p>
         <p>{profile.bankName ? `Banque: ${profile.bankName} - RIB: ${profile.rib}` : ''}</p>
         {doc.notes && <p className="mt-1 font-bold">{doc.notes}</p>}
      </div>

    </div>
  );
};

// --- Classic Template (Enhanced) ---
const ClassicTemplate: React.FC<{ doc: DocumentData; profile: CompanyProfile }> = ({ doc, profile }) => {
  const accentColor = doc.type === DocType.DEVIS ? 'text-blue-700' : 'text-green-700';
  const borderColor = doc.type === DocType.DEVIS ? 'border-blue-700' : 'border-green-700';
  const headerBg = doc.type === DocType.DEVIS ? 'bg-blue-50' : 'bg-green-50';

  return (
    <div className="bg-white shadow-lg mx-auto max-w-[21cm] min-h-[29.7cm] p-[2cm] print:p-0 print:shadow-none print:w-full print:max-w-none text-slate-900 leading-normal">
      {/* Header */}
      <div className="flex justify-between items-start mb-12">
        <div className="w-1/2">
          {/* Logo Placeholder */}
          <div className="w-32 h-16 bg-slate-50 flex items-center justify-center text-slate-400 font-bold mb-4 rounded border border-slate-200 overflow-hidden">
             {profile.logoUrl ? <img src={profile.logoUrl} className="object-contain w-full h-full" alt="Logo" /> : 'LOGO'}
          </div>
          <h2 className="text-xl font-bold uppercase text-slate-800">{profile.name}</h2>
          <p className="text-sm text-slate-600 whitespace-pre-line">{profile.address}</p>
          <p className="text-sm text-slate-600 mt-1">Tel: {profile.phone}</p>
          <p className="text-sm text-slate-600">Email: {profile.email}</p>
        </div>
        <div className="w-1/2 text-right">
           <h1 className={`text-4xl font-light mb-4 tracking-widest ${accentColor}`}>{doc.type}</h1>
           <p className="text-lg font-bold text-slate-800">Nº{doc.number}</p>
           <p className="text-slate-600">Date: {new Date(doc.date).toLocaleDateString('fr-FR')}</p>
        </div>
      </div>

      {/* Client Box */}
      <div className="mb-12 flex justify-end">
         <div className={`w-1/2 p-6 rounded border border-slate-100 ${headerBg}`}>
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-2">Facturer à</h3>
            <p className="text-lg font-bold text-slate-900">{doc.clientName || 'Client Inconnu'}</p>
            <p className="text-sm text-slate-700 whitespace-pre-line mt-1">{doc.clientAddress}</p>
            {doc.clientIce && <p className="text-sm text-slate-500 mt-2">ICE: {doc.clientIce}</p>}
         </div>
      </div>

      {/* Object */}
      {doc.object && (
        <div className="mb-8">
          <span className="font-bold text-slate-800">Objet:</span> <span className="text-slate-700">{doc.object}</span>
        </div>
      )}

      {/* Table */}
      <table className="w-full mb-8">
        <thead>
          <tr className={`border-b-2 ${borderColor}`}>
            <th className="text-left py-3 font-bold text-slate-800 text-sm uppercase tracking-wide">Désignation</th>
            <th className="text-right py-3 font-bold text-slate-800 text-sm uppercase tracking-wide w-20">Qté</th>
            <th className="text-right py-3 font-bold text-slate-800 text-sm uppercase tracking-wide w-32">Prix Unitaire</th>
            <th className="text-right py-3 font-bold text-slate-800 text-sm uppercase tracking-wide w-32">Total</th>
          </tr>
        </thead>
        <tbody>
          {doc.items.map(item => (
            <tr key={item.id} className={item.isSectionHeader ? "bg-slate-50" : ""}>
              {item.isSectionHeader ? (
                <td colSpan={4} className="py-3 font-bold text-slate-800 text-sm uppercase tracking-wider pt-6">
                  {item.designation}
                </td>
              ) : (
                <>
                  <td className="py-3 text-sm text-slate-700">{item.designation}</td>
                  <td className="py-3 text-sm text-slate-700 text-right">{item.quantity}</td>
                  <td className="py-3 text-sm text-slate-700 text-right">{item.unitPrice.toFixed(2)}</td>
                  <td className="py-3 text-sm text-slate-900 font-medium text-right">{item.total.toFixed(2)}</td>
                </>
              )}
            </tr>
          ))}
        </tbody>
      </table>

      {/* Totals */}
      <div className="flex justify-end mb-12">
         <div className="w-1/2 space-y-2">
            {doc.hasVat ? (
               <>
                  <div className="flex justify-between text-sm">
                     <span className="font-medium text-slate-600">Total HT</span>
                     <span className="font-bold text-slate-800">{doc.subTotal.toFixed(2)} {doc.currency}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                     <span className="font-medium text-slate-600">TVA ({doc.vatRate}%)</span>
                     <span className="font-bold text-slate-800">{doc.vatAmount.toFixed(2)} {doc.currency}</span>
                  </div>
                  <div className={`flex justify-between text-xl pt-4 border-t-2 ${borderColor} mt-2`}>
                     <span className="font-bold text-slate-900">Total TTC</span>
                     <span className={`font-bold ${accentColor}`}>{doc.totalTTC.toFixed(2)} {doc.currency}</span>
                  </div>
               </>
            ) : (
                <div className={`flex justify-between text-xl pt-4 border-t-2 ${borderColor} mt-2`}>
                   <span className="font-bold text-slate-900">Total HT</span>
                   <span className={`font-bold ${accentColor}`}>{doc.totalTTC.toFixed(2)} {doc.currency}</span>
                </div>
            )}
            
            {doc.type === DocType.DEVIS && doc.hasDeposit && doc.depositAmount && doc.depositAmount > 0 && (
              <div className="mt-4 pt-2 border-t border-dashed border-slate-300">
                  <p className="font-bold text-xs uppercase text-slate-500">NOTE: ACOMPTE DE {doc.depositPercentage}% A LA COMMANDE</p>
                  <p className="font-bold text-lg text-slate-800">{doc.depositAmount.toFixed(2)} {doc.currency}</p>
              </div>
           )}
         </div>
      </div>

      {/* Footer Info */}
      <div className="border-t border-slate-200 pt-8 text-xs text-slate-500 text-center space-y-1 mt-auto">
        <p>{profile.name} - {profile.address}</p>
        <p>ICE: {profile.ice} - RC: {profile.rc} - IF: {profile.if_tax} - Patente: {profile.patente}</p>
        {profile.bankName && <p>Banque: {profile.bankName} - RIB: {profile.rib}</p>}
        {doc.notes && (
          <div className="mt-4 p-4 bg-slate-50 border border-slate-100 rounded text-left">
            <p className="font-bold mb-1">Notes:</p>
            <p className="whitespace-pre-wrap">{doc.notes}</p>
          </div>
        )}
      </div>
    </div>
  );
};
