import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, useNavigate, useParams, useLocation, Link } from 'react-router-dom';
import { Layout } from './components/Layout';
import { DocumentEditor, DocumentPreview } from './components/DocumentEditor';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { ThemeProvider, useTheme } from './contexts/ThemeContext';
import { Login, Register } from './components/Auth';
import { ClientsList, ClientForm, ClientDetails } from './components/Clients';
import { SuppliersList, SupplierForm } from './components/Suppliers';
import { StorageService } from './services/storageService';
import { analyzeDocumentImage, analyzeCompanyDocument, compressImage } from './services/geminiService';
import { INITIAL_DOCUMENT, INITIAL_PROFILE } from './constants';
import { DocumentData, DocType, DocStatus, CompanyProfile } from './types';

// Helper function to generate document numbers
const getNextDocumentNumber = (docs: DocumentData[], format: string = 'seq-mmyy', prefix: string = ''): string => {
  const now = new Date();
  const month = (now.getMonth() + 1).toString().padStart(2, '0');
  const year = now.getFullYear().toString().slice(-2);
  const fullYear = now.getFullYear().toString();
  
  // Find the highest sequence number for the current period if needed
  // This is a simplified auto-increment.
  const count = docs.length + 1;
  
  let number = `${count}`;
  
  if (format === 'seq-mmyy') number = `${count}-${month}${year}`;
  if (format === 'seq/yyyy') number = `${count}/${fullYear}`;
  if (format === 'yyyy-seq') number = `${fullYear}-${count}`;
  if (format === 'seq') number = `${count}`;
  
  return prefix ? `${prefix}${number}` : number;
};

// --- New Document / OCR Upload Component ---
const NewDocument = () => {
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const navigate = useNavigate();

  const handleManualCreate = () => {
    const allDocs = StorageService.getDocuments();
    const profile = StorageService.getProfile();
    const nextNumber = getNextDocumentNumber(allDocs, profile.docNumberFormat, profile.docNumberPrefix);

    const newDoc = { 
      ...INITIAL_DOCUMENT, 
      id: Date.now().toString(),
      number: nextNumber,
      date: new Date().toISOString().split('T')[0]
    };
    StorageService.saveDocument(newDoc);
    navigate(`/edit/${newDoc.id}`);
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploading(true);
    setError(null);

    try {
      const reader = new FileReader();
      reader.onload = async () => {
        try {
          const base64 = reader.result as string;
          const analyzedData = await analyzeDocumentImage(base64);
          
          const allDocs = StorageService.getDocuments();
          const profile = StorageService.getProfile();
          const nextNumber = getNextDocumentNumber(allDocs, profile.docNumberFormat, profile.docNumberPrefix);

          const newDoc: DocumentData = {
            ...INITIAL_DOCUMENT,
            ...analyzedData,
            number: analyzedData.number || nextNumber,
            id: Date.now().toString()
          };
          
          StorageService.saveDocument(newDoc);
          navigate(`/edit/${newDoc.id}`);
        } catch (err: any) {
          setError(err.message || "Erreur lors de l'analyse du document.");
          setIsUploading(false);
        }
      };
      reader.readAsDataURL(file);
    } catch (err) {
      setError("Erreur de lecture du fichier.");
      setIsUploading(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-8 py-4 md:py-10 px-4">
      <div className="text-center space-y-2">
        <h2 className="text-2xl md:text-3xl font-bold text-slate-900 dark:text-white">Nouveau Document</h2>
        <p className="text-slate-600 dark:text-slate-400">Comment souhaitez-vous créer votre devis/facture ?</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Manual Option */}
        <button 
          onClick={handleManualCreate}
          className="group relative bg-white dark:bg-slate-800 p-6 rounded-2xl shadow-sm border-2 border-slate-100 dark:border-slate-700 hover:border-blue-500 dark:hover:border-blue-500 hover:shadow-md transition-all text-left flex flex-col items-center text-center h-full"
        >
          <div className="w-16 h-16 bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 rounded-2xl flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
             <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" /></svg>
          </div>
          <h3 className="text-lg font-bold text-slate-800 dark:text-white mb-1">Manuellement</h3>
          <p className="text-slate-500 dark:text-slate-400 text-sm">Remplir une grille vierge à partir de zéro.</p>
        </button>

        {/* Camera Option */}
        <div className="group relative bg-white dark:bg-slate-800 p-6 rounded-2xl shadow-sm border-2 border-slate-100 dark:border-slate-700 hover:border-indigo-500 dark:hover:border-indigo-500 hover:shadow-md transition-all text-left cursor-pointer flex flex-col items-center text-center h-full">
          <div className="w-16 h-16 bg-indigo-100 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 rounded-2xl flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
             {isUploading ? (
                <svg className="animate-spin w-8 h-8" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
             ) : (
                <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
             )}
          </div>
          <h3 className="text-lg font-bold text-slate-800 dark:text-white mb-1">Scanner (Caméra)</h3>
          <p className="text-slate-500 dark:text-slate-400 text-sm">Prenez une photo de votre devis papier.</p>
          <input 
            type="file" 
            accept="image/*"
            capture="environment"
            onChange={handleFileUpload} 
            disabled={isUploading}
            className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
          />
        </div>

        {/* Gallery Option */}
        <div className="group relative bg-white dark:bg-slate-800 p-6 rounded-2xl shadow-sm border-2 border-slate-100 dark:border-slate-700 hover:border-purple-500 dark:hover:border-purple-500 hover:shadow-md transition-all text-left cursor-pointer flex flex-col items-center text-center h-full">
          <div className="w-16 h-16 bg-purple-100 dark:bg-purple-900/30 text-purple-600 dark:text-purple-400 rounded-2xl flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
             {isUploading ? (
                <svg className="animate-spin w-8 h-8" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
             ) : (
                <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
             )}
          </div>
          <h3 className="text-lg font-bold text-slate-800 dark:text-white mb-1">Importer (Galerie)</h3>
          <p className="text-slate-500 dark:text-slate-400 text-sm">Choisissez une image existante.</p>
          <input 
            type="file" 
            accept="image/*"
            // No capture attribute implies gallery/file picker preference
            onChange={handleFileUpload} 
            disabled={isUploading}
            className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
          />
        </div>
      </div>
      
      {error && (
        <div className="bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-300 p-4 rounded-lg border border-red-200 dark:border-red-800">
          <strong>Erreur:</strong> {error}
        </div>
      )}
    </div>
  );
};

// --- Edit Route Wrapper ---
const EditRoute = () => {
  const { id } = useParams();
  const [doc, setDoc] = useState<DocumentData | null>(null);

  useEffect(() => {
    if (id) {
      const all = StorageService.getDocuments();
      const found = all.find(d => d.id === id);
      if (found) setDoc(found);
    }
  }, [id]);

  if (!doc) return <div className="p-8">Chargement...</div>;

  return <DocumentEditor initialData={doc} isNew={false} />;
};

// --- Shared Document Route ---
const SharedDocument = () => {
  const location = useLocation();
  const [data, setData] = useState<{doc: DocumentData, profile: CompanyProfile} | null>(null);
  const [error, setError] = useState<string>("");

  useEffect(() => {
    try {
      const searchParams = new URLSearchParams(location.search);
      const encodedData = searchParams.get('data');
      if (encodedData) {
        // Decode base64 utf-8
        const json = decodeURIComponent(escape(atob(encodedData)));
        const parsed = JSON.parse(json);
        if (parsed.doc && parsed.profile) {
          setData(parsed);
        } else {
          setError("Données du document invalides.");
        }
      } else {
        setError("Aucun lien de document détecté.");
      }
    } catch (e) {
      console.error(e);
      setError("Impossible de lire le document partagé. Le lien est peut-être corrompu.");
    }
  }, [location]);

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="bg-white p-8 rounded-lg shadow-md max-w-md text-center">
          <div className="text-red-500 text-5xl mb-4">⚠️</div>
          <h1 className="text-xl font-bold text-slate-800 mb-2">Erreur</h1>
          <p className="text-slate-600 mb-6">{error}</p>
          <Link to="/" className="text-blue-600 hover:underline">Aller à l'accueil</Link>
        </div>
      </div>
    );
  }

  if (!data) {
    return <div className="p-8 text-center text-slate-500">Chargement du document partagé...</div>;
  }

  return (
    <div className="min-h-screen bg-slate-100 py-8">
      <div className="max-w-5xl mx-auto px-4">
        <div className="mb-6 flex justify-between items-center no-print">
          <div className="bg-blue-100 text-blue-800 px-4 py-2 rounded-full text-sm font-medium">
             👀 Mode Lecture Seule
          </div>
          <Link to="/" className="text-slate-600 hover:text-slate-900 font-medium">
            Accéder à l'application
          </Link>
        </div>
        <DocumentPreview doc={data.doc} profile={data.profile} />
        <div className="mt-8 text-center no-print">
          <button onClick={() => window.print()} className="bg-slate-800 text-white px-6 py-2 rounded-lg font-medium shadow-lg hover:bg-slate-900 transition">
            Imprimer / Télécharger PDF
          </button>
        </div>
      </div>
    </div>
  );
};

// --- Profile Page ---
const ProfilePage = () => {
  const [profile, setProfile] = useState<CompanyProfile>(INITIAL_PROFILE);
  const [saved, setSaved] = useState(false);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [docs, setDocs] = useState<DocumentData[]>([]);
  
  const { user } = useAuth();
  const { mode, toggleMode, primaryColor, setPrimaryColor } = useTheme();

  useEffect(() => {
    let p = StorageService.getProfile();
    if (!p.email && user?.email) p.email = user.email;
    setProfile(p);
    setDocs(StorageService.getDocuments());
  }, [user]);

  const handleSave = () => {
    StorageService.saveProfile(profile);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  const handleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 2 * 1024 * 1024) {
        alert("L'image est trop volumineuse (max 2MB).");
        return;
      }
      const reader = new FileReader();
      reader.onloadend = () => {
        setProfile({ ...profile, logoUrl: reader.result as string });
      };
      reader.readAsDataURL(file);
    }
  };

  const handleDocAnalyze = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsAnalyzing(true);
    try {
      const reader = new FileReader();
      reader.onloadend = async () => {
        try {
          const base64 = reader.result as string;
          const analyzed = await analyzeCompanyDocument(base64);
          setProfile(prev => ({
            ...prev,
            name: analyzed.name || prev.name,
            address: analyzed.address || prev.address,
            phone: analyzed.phone || prev.phone,
            email: analyzed.email || prev.email,
            ice: analyzed.ice || prev.ice,
            rc: analyzed.rc || prev.rc,
            if_tax: analyzed.if_tax || prev.if_tax,
            patente: analyzed.patente || prev.patente,
            bankName: analyzed.bankName || prev.bankName,
            rib: analyzed.rib || prev.rib,
          }));
          alert("Informations extraites avec succès ! Vérifiez les champs.");
        } catch (error) {
           console.error(error);
           alert("Erreur lors de l'analyse du document.");
        } finally {
           setIsAnalyzing(false);
        }
      };
      reader.readAsDataURL(file);
    } catch (err) {
      setIsAnalyzing(false);
    }
  };

  const PRESET_COLORS = [
    { name: 'Océan', value: '#2563eb' },
    { name: 'Forêt', value: '#059669' },
    { name: 'Baie', value: '#db2777' },
    { name: 'Soleil', value: '#ea580c' },
    { name: 'Nuit', value: '#7c3aed' },
    { name: 'Ardoise', value: '#475569' },
  ];

  const nextNumPreview = getNextDocumentNumber(docs, profile.docNumberFormat, profile.docNumberPrefix);

  return (
    <div className="max-w-4xl mx-auto space-y-6">
       
       {/* Theme Settings */}
       <div className="bg-white dark:bg-slate-800 p-6 md:p-8 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700">
          <h3 className="font-semibold text-slate-900 dark:text-white border-b border-slate-100 dark:border-slate-700 pb-2 mb-4">Apparence & Thème</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
             <div>
                <label className="text-sm font-medium text-slate-700 dark:text-slate-300 block mb-3">Mode d'affichage</label>
                <div className="flex bg-slate-100 dark:bg-slate-700 p-1 rounded-lg inline-flex">
                   <button 
                      onClick={() => mode === 'dark' && toggleMode()}
                      className={`px-4 py-2 rounded-md text-sm font-medium transition-all ${mode === 'light' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 dark:text-slate-400'}`}
                   >
                      <span className="flex items-center gap-2">☀️ Clair</span>
                   </button>
                   <button 
                      onClick={() => mode === 'light' && toggleMode()}
                      className={`px-4 py-2 rounded-md text-sm font-medium transition-all ${mode === 'dark' ? 'bg-slate-600 text-white shadow-sm' : 'text-slate-500'}`}
                   >
                      <span className="flex items-center gap-2">🌙 Sombre</span>
                   </button>
                </div>
             </div>
             
             <div>
                <label className="text-sm font-medium text-slate-700 dark:text-slate-300 block mb-3">Couleur Principale</label>
                <div className="flex flex-wrap gap-3 items-center">
                   {PRESET_COLORS.map(c => (
                      <button 
                        key={c.value}
                        onClick={() => setPrimaryColor(c.value)}
                        className={`w-8 h-8 rounded-full border-2 transition-transform hover:scale-110 ${primaryColor === c.value ? 'border-slate-900 dark:border-white ring-2 ring-offset-2 ring-blue-500' : 'border-transparent'}`}
                        style={{ backgroundColor: c.value }}
                        title={c.name}
                      />
                   ))}
                   <div className="relative ml-2">
                      <input 
                        type="color" 
                        value={primaryColor}
                        onChange={(e) => setPrimaryColor(e.target.value)}
                        className="w-8 h-8 rounded-full overflow-hidden cursor-pointer border-0 p-0"
                      />
                   </div>
                </div>
             </div>
          </div>
       </div>

       {/* Numbering Settings */}
       <div className="bg-white dark:bg-slate-800 p-6 md:p-8 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700">
          <h3 className="font-semibold text-slate-900 dark:text-white border-b border-slate-100 dark:border-slate-700 pb-2 mb-4">Numérotation des documents</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="text-sm font-medium text-slate-700 dark:text-slate-300 block mb-3">Format</label>
                <select 
                  value={profile.docNumberFormat || 'seq-mmyy'}
                  onChange={(e) => setProfile({...profile, docNumberFormat: e.target.value as any})}
                  className="w-full border-slate-300 dark:border-slate-600 dark:bg-slate-700 dark:text-white rounded-md py-2 text-sm focus:border-blue-500 focus:ring-blue-500"
                >
                  <option value="seq-mmyy">Séquentiel-MoisAnnée (Ex: 1-1225)</option>
                  <option value="seq/yyyy">Séquentiel/Année (Ex: 1/2025)</option>
                  <option value="yyyy-seq">Année-Séquentiel (Ex: 2025-001)</option>
                  <option value="seq">Simple (Ex: 0001)</option>
                </select>
              </div>
               <div>
                <label className="text-sm font-medium text-slate-700 dark:text-slate-300 block mb-3">Préfixe (Optionnel)</label>
                <input 
                  type="text" 
                  value={profile.docNumberPrefix || ''}
                  onChange={(e) => setProfile({...profile, docNumberPrefix: e.target.value})}
                  placeholder="Ex: FACT-"
                  className="w-full border-slate-300 dark:border-slate-600 dark:bg-slate-700 dark:text-white rounded-md py-2 text-sm focus:border-blue-500 focus:ring-blue-500"
                />
              </div>
          </div>
          <div className="mt-4 p-3 bg-slate-50 dark:bg-slate-900/50 rounded-lg text-sm text-slate-600 dark:text-slate-400">
             Aperçu du prochain numéro : <strong className="text-blue-600 dark:text-blue-400 font-mono text-base ml-2">{nextNumPreview}</strong>
          </div>
       </div>

       {/* Company Form */}
       <div className="flex justify-between items-center">
          <h2 className="text-2xl font-bold text-slate-800 dark:text-white">Mon Entreprise</h2>
          <div className="relative">
             <input type="file" id="docScan" accept="image/*" className="hidden" onChange={handleDocAnalyze} disabled={isAnalyzing} />
             <label htmlFor="docScan" className="bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 px-4 py-2 rounded-lg font-medium hover:bg-blue-100 dark:hover:bg-blue-900/50 cursor-pointer flex items-center gap-2 text-sm">
                {isAnalyzing ? (
                   <span className="animate-spin">⌛</span>
                ) : (
                   <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
                )}
                Auto-remplir (Carte Visite/RC)
             </label>
          </div>
       </div>

       <div className="bg-white dark:bg-slate-800 p-6 md:p-8 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-4">
              <h3 className="font-semibold text-slate-900 dark:text-white border-b dark:border-slate-700 pb-2">Informations Générales</h3>
              <div className="space-y-3">
                 <div className="space-y-1">
                    <label className="text-sm font-medium text-slate-700 dark:text-slate-300">Nom de la société</label>
                    <input type="text" value={profile.name} onChange={e => setProfile({...profile, name: e.target.value})} className="w-full border-slate-300 dark:border-slate-600 dark:bg-slate-700 dark:text-white rounded-md py-3 md:py-2 text-base md:text-sm" />
                 </div>
                 <div className="space-y-1">
                    <label className="text-sm font-medium text-slate-700 dark:text-slate-300">Adresse</label>
                    <textarea value={profile.address} onChange={e => setProfile({...profile, address: e.target.value})} className="w-full border-slate-300 dark:border-slate-600 dark:bg-slate-700 dark:text-white rounded-md py-3 md:py-2 text-base md:text-sm" rows={3} />
                 </div>
                 <div className="space-y-1">
                    <label className="text-sm font-medium text-slate-700 dark:text-slate-300">Téléphone</label>
                    <input type="text" value={profile.phone} onChange={e => setProfile({...profile, phone: e.target.value})} className="w-full border-slate-300 dark:border-slate-600 dark:bg-slate-700 dark:text-white rounded-md py-3 md:py-2 text-base md:text-sm" />
                 </div>
                  <div className="space-y-1">
                    <label className="text-sm font-medium text-slate-700 dark:text-slate-300">Email</label>
                    <input type="text" value={profile.email} onChange={e => setProfile({...profile, email: e.target.value})} className="w-full border-slate-300 dark:border-slate-600 dark:bg-slate-700 dark:text-white rounded-md py-3 md:py-2 text-base md:text-sm" />
                 </div>
              </div>
            </div>

            <div className="space-y-4">
              <h3 className="font-semibold text-slate-900 dark:text-white border-b dark:border-slate-700 pb-2">Fiscal & Légal</h3>
              <div className="space-y-3">
                 <div className="space-y-1">
                    <label className="text-sm font-medium text-slate-700 dark:text-slate-300">ICE</label>
                    <input type="text" value={profile.ice} onChange={e => setProfile({...profile, ice: e.target.value})} className="w-full border-slate-300 dark:border-slate-600 dark:bg-slate-700 dark:text-white rounded-md py-3 md:py-2 text-base md:text-sm" />
                 </div>
                 <div className="space-y-1">
                    <label className="text-sm font-medium text-slate-700 dark:text-slate-300">RC</label>
                    <input type="text" value={profile.rc} onChange={e => setProfile({...profile, rc: e.target.value})} className="w-full border-slate-300 dark:border-slate-600 dark:bg-slate-700 dark:text-white rounded-md py-3 md:py-2 text-base md:text-sm" />
                 </div>
                 <div className="space-y-1">
                    <label className="text-sm font-medium text-slate-700 dark:text-slate-300">IF</label>
                    <input type="text" value={profile.if_tax} onChange={e => setProfile({...profile, if_tax: e.target.value})} className="w-full border-slate-300 dark:border-slate-600 dark:bg-slate-700 dark:text-white rounded-md py-3 md:py-2 text-base md:text-sm" />
                 </div>
                 <div className="space-y-1">
                    <label className="text-sm font-medium text-slate-700 dark:text-slate-300">Patente</label>
                    <input type="text" value={profile.patente} onChange={e => setProfile({...profile, patente: e.target.value})} className="w-full border-slate-300 dark:border-slate-600 dark:bg-slate-700 dark:text-white rounded-md py-3 md:py-2 text-base md:text-sm" />
                 </div>
              </div>
            </div>
            
             <div className="md:col-span-2 space-y-4">
              <h3 className="font-semibold text-slate-900 dark:text-white border-b dark:border-slate-700 pb-2">Banque</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-1">
                    <label className="text-sm font-medium text-slate-700 dark:text-slate-300">Nom de la banque</label>
                    <input type="text" value={profile.bankName} onChange={e => setProfile({...profile, bankName: e.target.value})} className="w-full border-slate-300 dark:border-slate-600 dark:bg-slate-700 dark:text-white rounded-md py-3 md:py-2 text-base md:text-sm" />
                 </div>
                 <div className="space-y-1">
                    <label className="text-sm font-medium text-slate-700 dark:text-slate-300">RIB</label>
                    <input type="text" value={profile.rib} onChange={e => setProfile({...profile, rib: e.target.value})} className="w-full border-slate-300 dark:border-slate-600 dark:bg-slate-700 dark:text-white rounded-md py-3 md:py-2 text-base md:text-sm" />
                 </div>
              </div>
            </div>
             <div className="md:col-span-2 space-y-4">
              <h3 className="font-semibold text-slate-900 dark:text-white border-b dark:border-slate-700 pb-2">Logo</h3>
              <div className="space-y-4">
                 <div className="flex items-start space-x-4">
                    <div className="h-20 w-20 bg-slate-100 dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-lg flex items-center justify-center overflow-hidden shrink-0">
                        {profile.logoUrl ? (
                            <img src={profile.logoUrl} alt="Logo" className="h-full w-full object-contain" />
                        ) : (
                            <span className="text-slate-400 text-xs text-center p-1">Aucun logo</span>
                        )}
                    </div>
                    <div className="space-y-2 flex-1">
                        <div>
                            <label className="inline-flex items-center px-4 py-2 bg-white dark:bg-slate-700 border border-slate-300 dark:border-slate-600 rounded-md font-medium text-slate-700 dark:text-slate-200 shadow-sm hover:bg-slate-50 dark:hover:bg-slate-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 cursor-pointer text-sm">
                                <span>Téléverser une image</span>
                                <input type="file" accept="image/*" className="hidden" onChange={handleLogoUpload} />
                            </label>
                            {profile.logoUrl && (
                                <button 
                                    onClick={() => setProfile({...profile, logoUrl: undefined})}
                                    className="ml-3 text-sm text-red-600 hover:text-red-800"
                                >
                                    Supprimer
                                </button>
                            )}
                        </div>
                        <p className="text-xs text-slate-500 dark:text-slate-400">Formats supportés: PNG, JPG. Max 2MB.</p>
                    </div>
                 </div>

                 <div className="space-y-1">
                    <label className="text-sm font-medium text-slate-700 dark:text-slate-300">Ou lien URL direct</label>
                    <input type="text" value={profile.logoUrl || ''} onChange={e => setProfile({...profile, logoUrl: e.target.value})} className="w-full border-slate-300 dark:border-slate-600 dark:bg-slate-700 dark:text-white rounded-md py-3 md:py-2 text-base md:text-sm" placeholder="https://..." />
                 </div>
              </div>
            </div>
          </div>

          <div className="flex justify-end pt-4 pb-12 md:pb-0">
             <button onClick={handleSave} className="w-full md:w-auto bg-blue-600 text-white px-6 py-3 rounded-lg font-medium hover:bg-blue-700 transition">
               {saved ? 'Sauvegardé !' : 'Enregistrer les modifications'}
             </button>
          </div>
       </div>
    </div>
  );
};

const Input = ({ label, value, onChange, type = 'text' }: any) => (
    <div className="space-y-1">
        <label className="block text-sm font-medium text-slate-700 dark:text-slate-300">{label}</label>
        {type === 'textarea' ? (
            <textarea value={value} onChange={e => onChange(e.target.value)} className="w-full border-slate-300 dark:border-slate-600 dark:bg-slate-700 dark:text-white rounded-md shadow-sm py-2" rows={2} />
        ) : (
            <input type={type} value={value} onChange={e => onChange(e.target.value)} className="w-full border-slate-300 dark:border-slate-600 dark:bg-slate-700 dark:text-white rounded-md shadow-sm py-2" />
        )}
    </div>
);

// --- Dashboard Component ---
const Dashboard = () => {
  const [docs, setDocs] = useState<DocumentData[]>([]);
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
     setDocs(StorageService.getDocuments());
  }, []);
  
  const handleDelete = (id: string, e: React.MouseEvent) => {
      e.preventDefault();
      e.stopPropagation();
      if(confirm('Supprimer ce document ?')) {
          StorageService.deleteDocument(id);
          setDocs(StorageService.getDocuments());
      }
  };

  const filtered = docs.filter(d => 
      d.clientName?.toLowerCase().includes(searchTerm.toLowerCase()) || 
      d.number?.toLowerCase().includes(searchTerm.toLowerCase())
  ).sort((a,b) => new Date(b.date).getTime() - new Date(a.date).getTime());

  return (
    <div className="space-y-6">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <h2 className="text-2xl font-bold text-slate-800 dark:text-white">Tableau de bord</h2>
            <div className="w-full sm:w-auto">
                <input 
                  type="text" 
                  placeholder="Rechercher..." 
                  value={searchTerm}
                  onChange={e => setSearchTerm(e.target.value)}
                  className="w-full px-4 py-2 border border-slate-300 dark:border-slate-600 dark:bg-slate-700 dark:text-white rounded-lg"
                />
            </div>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filtered.map(doc => (
                <div key={doc.id} className="bg-white dark:bg-slate-800 p-4 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 hover:shadow-md transition-shadow relative group">
                    <div className="flex justify-between items-start mb-2">
                        <span className={`px-2 py-1 rounded text-xs font-bold ${doc.type === DocType.DEVIS ? 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200' : 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'}`}>
                            {doc.type}
                        </span>
                        <span className="text-sm text-slate-500 dark:text-slate-400">{doc.date}</span>
                    </div>
                    <h3 className="font-bold text-lg text-slate-800 dark:text-white mb-1">{doc.clientName || 'Client Inconnu'}</h3>
                    <p className="text-sm text-slate-600 dark:text-slate-300 mb-3">N° {doc.number}</p>
                    <div className="flex justify-between items-end border-t border-slate-100 dark:border-slate-700 pt-3">
                        <span className="font-bold text-slate-900 dark:text-white text-lg">{doc.totalTTC.toFixed(2)} {doc.currency}</span>
                        <div className="flex space-x-2">
                             <a href={`#/edit/${doc.id}`} className="text-blue-600 dark:text-blue-400 hover:underline text-sm font-medium">Ouvrir</a>
                             <button onClick={(e) => handleDelete(doc.id, e)} className="text-red-500 hover:text-red-700 text-sm">Supprimer</button>
                        </div>
                    </div>
                </div>
            ))}
            {filtered.length === 0 && (
                <div className="col-span-full text-center py-10 text-slate-500 dark:text-slate-400">
                    Aucun document trouvé. Créez-en un nouveau !
                </div>
            )}
        </div>
    </div>
  );
};

const EditDocumentWrapper = () => {
    const { id } = useParams();
    const [doc, setDoc] = useState<DocumentData | null>(null);

    useEffect(() => {
        if (id) {
            const found = StorageService.getDocuments().find(d => d.id === id);
            if (found) setDoc(found);
        }
    }, [id]);

    if (!doc) return <div>Chargement...</div>;

    return <DocumentEditor initialData={doc} isNew={false} />;
};

const ProtectedRoute = ({ children }: { children: React.ReactNode }) => {
    const { user, isLoading } = useAuth();
    if (isLoading) return <div className="min-h-screen flex items-center justify-center">Chargement...</div>;
    if (!user) return <Navigate to="/login" replace />;
    return <Layout>{children}</Layout>;
};

function App() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <Router>
          <Routes>
            <Route path="/login" element={<Login />} />
            <Route path="/register" element={<Register />} />
            
            <Route path="/share" element={<SharedDocument />} />

            <Route path="/" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
            <Route path="/new" element={<ProtectedRoute><NewDocument /></ProtectedRoute>} />
            <Route path="/edit/:id" element={<ProtectedRoute><EditDocumentWrapper /></ProtectedRoute>} />
            
            <Route path="/clients" element={<ProtectedRoute><ClientsList /></ProtectedRoute>} />
            <Route path="/clients/new" element={<ProtectedRoute><ClientForm /></ProtectedRoute>} />
            <Route path="/clients/edit/:id" element={<ProtectedRoute><ClientForm /></ProtectedRoute>} />
            <Route path="/clients/:id" element={<ProtectedRoute><ClientDetails /></ProtectedRoute>} />
            
            <Route path="/suppliers" element={<ProtectedRoute><SuppliersList /></ProtectedRoute>} />
            <Route path="/suppliers/new" element={<ProtectedRoute><SupplierForm /></ProtectedRoute>} />
            <Route path="/suppliers/edit/:id" element={<ProtectedRoute><SupplierForm /></ProtectedRoute>} />
            
            <Route path="/profile" element={<ProtectedRoute><ProfilePage /></ProtectedRoute>} />
          </Routes>
        </Router>
      </AuthProvider>
    </ThemeProvider>
  );
}

export default App;