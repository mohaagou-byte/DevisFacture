import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, useNavigate, useParams } from 'react-router-dom';
import { Layout } from './components/Layout';
import { DocumentEditor } from './components/DocumentEditor';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { ThemeProvider } from './contexts/ThemeContext';
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
    <div className="max-w-2xl mx-auto space-y-8 py-4 md:py-10">
      <div className="text-center space-y-2">
        <h2 className="text-2xl md:text-3xl font-bold text-slate-900 dark:text-white">Nouveau Document</h2>
        <p className="text-slate-600 dark:text-slate-400">Choisissez comment vous souhaitez commencer</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6">
        <button 
          onClick={handleManualCreate}
          className="group relative bg-white dark:bg-slate-800 p-6 md:p-8 rounded-2xl shadow-sm border-2 border-slate-100 dark:border-slate-700 hover:border-blue-500 dark:hover:border-blue-500 hover:shadow-md transition-all text-left"
        >
          <div className="w-12 h-12 bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 rounded-xl flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
             <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" /></svg>
          </div>
          <h3 className="text-lg font-bold text-slate-800 dark:text-white">Manuellement</h3>
          <p className="text-slate-500 dark:text-slate-400 text-sm mt-2">Utilisez l'éditeur pour remplir une grille vierge.</p>
        </button>

        <div className="group relative bg-white dark:bg-slate-800 p-6 md:p-8 rounded-2xl shadow-sm border-2 border-slate-100 dark:border-slate-700 hover:border-indigo-500 dark:hover:border-indigo-500 hover:shadow-md transition-all text-left cursor-pointer">
          <div className="w-12 h-12 bg-indigo-100 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 rounded-xl flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
             {isUploading ? (
                <svg className="animate-spin w-6 h-6" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
             ) : (
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
             )}
          </div>
          <h3 className="text-lg font-bold text-slate-800 dark:text-white">Scanner ou Importer (IA)</h3>
          <p className="text-slate-500 dark:text-slate-400 text-sm mt-2">Prenez une photo ou importez une image de la galerie.</p>
          <input 
            type="file" 
            accept="image/*"
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

// --- Profile Component ---
const Profile = () => {
  const [profile, setProfile] = useState<CompanyProfile>(INITIAL_PROFILE);
  const [isAnalyzing, setIsAnalyzing] = useState(false);

  useEffect(() => {
    setProfile(StorageService.getProfile());
  }, []);

  const handleChange = (field: keyof CompanyProfile, value: any) => {
    setProfile(prev => ({ ...prev, [field]: value }));
  };

  const handleSave = () => {
    StorageService.saveProfile(profile);
    alert('Profil sauvegardé !');
  };

  const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
        const reader = new FileReader();
        reader.onload = async () => {
            const base64 = reader.result as string;
            const compressed = await compressImage(base64);
            handleChange('logoUrl', compressed);
        };
        reader.readAsDataURL(file);
    }
  };
  
  const handleAutoFill = async (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file) return;
      setIsAnalyzing(true);
      try {
          const reader = new FileReader();
          reader.onload = async () => {
              const base64 = reader.result as string;
              try {
                  const data = await analyzeCompanyDocument(base64);
                  setProfile(prev => ({ ...prev, ...data }));
              } catch (err) {
                  alert("Erreur lors de l'analyse");
              } finally {
                  setIsAnalyzing(false);
              }
          };
          reader.readAsDataURL(file);
      } catch (e) {
          setIsAnalyzing(false);
      }
  };

  return (
    <div className="max-w-2xl mx-auto space-y-6">
        <div className="flex justify-between items-center">
             <h2 className="text-2xl font-bold text-slate-800 dark:text-white">Profil Entreprise</h2>
             <div className="relative">
                 <input type="file" onChange={handleAutoFill} className="hidden" id="scan-profile" accept="image/*" />
                 <label htmlFor="scan-profile" className="cursor-pointer bg-indigo-50 text-indigo-700 px-3 py-2 rounded-lg text-sm font-medium hover:bg-indigo-100 flex items-center gap-2">
                     {isAnalyzing ? 'Analyse...' : 'Scanner Carte Visite / RC'}
                 </label>
             </div>
        </div>
        
        <div className="bg-white dark:bg-slate-800 p-6 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 space-y-4">
             <div className="flex items-center space-x-4 mb-4">
                 <div className="h-20 w-20 bg-slate-100 dark:bg-slate-700 rounded-lg flex items-center justify-center overflow-hidden border border-slate-200 dark:border-slate-600">
                     {profile.logoUrl ? <img src={profile.logoUrl} className="h-full w-full object-contain" alt="Logo" /> : <span className="text-slate-400 text-xs">Logo</span>}
                 </div>
                 <div>
                     <input type="file" onChange={handleLogoUpload} className="block w-full text-sm text-slate-500 dark:text-slate-400 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100" />
                 </div>
             </div>

             <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                 <Input label="Nom Société" value={profile.name} onChange={(v: string) => handleChange('name', v)} />
                 <Input label="Téléphone" value={profile.phone} onChange={(v: string) => handleChange('phone', v)} />
             </div>
             
             <Input label="Email" value={profile.email} onChange={(v: string) => handleChange('email', v)} />
             <Input label="Adresse" value={profile.address} onChange={(v: string) => handleChange('address', v)} type="textarea" />
             
             <div className="grid grid-cols-2 gap-4">
                 <Input label="ICE" value={profile.ice || ''} onChange={(v: string) => handleChange('ice', v)} />
                 <Input label="RC" value={profile.rc || ''} onChange={(v: string) => handleChange('rc', v)} />
                 <Input label="IF" value={profile.if_tax || ''} onChange={(v: string) => handleChange('if_tax', v)} />
                 <Input label="Patente" value={profile.patente || ''} onChange={(v: string) => handleChange('patente', v)} />
             </div>
             
             <div className="grid grid-cols-1 md:grid-cols-2 gap-4 border-t border-slate-100 dark:border-slate-700 pt-4">
                 <Input label="Banque" value={profile.bankName || ''} onChange={(v: string) => handleChange('bankName', v)} />
                 <Input label="RIB" value={profile.rib || ''} onChange={(v: string) => handleChange('rib', v)} />
             </div>

             <div className="border-t border-slate-100 dark:border-slate-700 pt-4">
                 <h3 className="font-medium text-slate-800 dark:text-white mb-2">Format de numérotation</h3>
                 <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                     <div className="space-y-1">
                        <label className="block text-sm font-medium text-slate-700 dark:text-slate-300">Format</label>
                        <select 
                            value={profile.docNumberFormat || 'seq-mmyy'} 
                            onChange={e => handleChange('docNumberFormat', e.target.value)}
                            className="w-full border-slate-300 dark:border-slate-600 dark:bg-slate-700 dark:text-white rounded-md shadow-sm py-2"
                        >
                            <option value="seq-mmyy">N° 1-0923 (Séquence-MoisAnnée)</option>
                            <option value="seq/yyyy">N° 1/2023 (Séquence/Année)</option>
                            <option value="yyyy-seq">N° 2023-1 (Année-Séquence)</option>
                            <option value="seq">N° 1 (Séquence simple)</option>
                        </select>
                     </div>
                     <Input label="Préfixe (ex: FAC-)" value={profile.docNumberPrefix || ''} onChange={(v: string) => handleChange('docNumberPrefix', v)} />
                 </div>
             </div>
             
             <div className="flex justify-end pt-4">
                 <button onClick={handleSave} className="bg-blue-600 text-white px-6 py-2 rounded-lg font-medium hover:bg-blue-700">Enregistrer</button>
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
            
            <Route path="/profile" element={<ProtectedRoute><Profile /></ProtectedRoute>} />
          </Routes>
        </Router>
      </AuthProvider>
    </ThemeProvider>
  );
}

export default App;