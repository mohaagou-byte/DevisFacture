
import { DocumentData, CompanyProfile, Client, Supplier } from '../types';
import { INITIAL_PROFILE } from '../constants';

const KEYS = {
  DOCS: 'devisfacture_docs',
  PROFILE: 'devisfacture_profile',
  CLIENTS: 'devisfacture_clients',
  SUPPLIERS: 'devisfacture_suppliers'
};

export const StorageService = {
  getDocuments: (): DocumentData[] => {
    try {
      const data = localStorage.getItem(KEYS.DOCS);
      return data ? JSON.parse(data) : [];
    } catch (e) {
      console.error("Failed to load docs", e);
      return [];
    }
  },

  saveDocument: (doc: DocumentData) => {
    const docs = StorageService.getDocuments();
    const index = docs.findIndex(d => d.id === doc.id);
    if (index >= 0) {
      docs[index] = doc;
    } else {
      docs.push(doc);
    }
    localStorage.setItem(KEYS.DOCS, JSON.stringify(docs));
  },

  deleteDocument: (id: string) => {
    const docs = StorageService.getDocuments();
    const newDocs = docs.filter(d => d.id !== id);
    localStorage.setItem(KEYS.DOCS, JSON.stringify(newDocs));
  },

  getProfile: (): CompanyProfile => {
    try {
      const data = localStorage.getItem(KEYS.PROFILE);
      return data ? JSON.parse(data) : INITIAL_PROFILE;
    } catch (e) {
      return INITIAL_PROFILE;
    }
  },

  saveProfile: (profile: CompanyProfile) => {
    localStorage.setItem(KEYS.PROFILE, JSON.stringify(profile));
  },

  getClients: (): Client[] => {
    try {
      const data = localStorage.getItem(KEYS.CLIENTS);
      return data ? JSON.parse(data) : [];
    } catch (e) {
      return [];
    }
  },

  saveClient: (client: Client) => {
    const clients = StorageService.getClients();
    const index = clients.findIndex(c => c.id === client.id);
    if (index >= 0) {
      clients[index] = client;
    } else {
      clients.push(client);
    }
    localStorage.setItem(KEYS.CLIENTS, JSON.stringify(clients));
  },

  deleteClient: (id: string) => {
    const clients = StorageService.getClients();
    const newClients = clients.filter(c => c.id !== id);
    localStorage.setItem(KEYS.CLIENTS, JSON.stringify(newClients));
  },

  getSuppliers: (): Supplier[] => {
    try {
      const data = localStorage.getItem(KEYS.SUPPLIERS);
      return data ? JSON.parse(data) : [];
    } catch (e) {
      return [];
    }
  },

  saveSupplier: (supplier: Supplier) => {
    const suppliers = StorageService.getSuppliers();
    const index = suppliers.findIndex(s => s.id === supplier.id);
    if (index >= 0) {
      suppliers[index] = supplier;
    } else {
      suppliers.push(supplier);
    }
    localStorage.setItem(KEYS.SUPPLIERS, JSON.stringify(suppliers));
  },

  deleteSupplier: (id: string) => {
    const suppliers = StorageService.getSuppliers();
    const newSuppliers = suppliers.filter(s => s.id !== id);
    localStorage.setItem(KEYS.SUPPLIERS, JSON.stringify(newSuppliers));
  }
};
