
export enum DocType {
  DEVIS = 'DEVIS',
  FACTURE = 'FACTURE'
}

export enum DocStatus {
  DRAFT = 'BROUILLON',
  SENT = 'ENVOYÉ',
  PAID = 'PAYÉ',
  ACCEPTED = 'ACCEPTÉ'
}

export type TemplateType = 'classic' | 'minimal' | 'modern';

export interface User {
  id: string;
  name: string;
  email: string;
  avatarUrl?: string;
}

export interface CompanyProfile {
  name: string;
  address: string;
  phone: string;
  email: string;
  website?: string;
  ice?: string; // Identifiant Commun de l'Entreprise (Morocco)
  rc?: string;  // Registre de Commerce
  if_tax?: string; // Identifiant Fiscal
  cnss?: string;
  patente?: string;
  bankName?: string;
  rib?: string;
  logoUrl?: string;
}

export interface Payment {
  id: string;
  date: string;
  amount: number;
  method: string; // Espèces, Chèque, Virement
  note?: string;
}

export interface ProjectImage {
  id: string;
  url: string; // Base64
  caption?: string;
}

export interface Project {
  id: string;
  title: string;
  description: string;
  date: string;
  beforeImages: ProjectImage[];
  afterImages: ProjectImage[];
}

export interface Client {
  id: string;
  name: string;
  email: string;
  phone: string;
  address: string;
  ice: string;
  payments: Payment[];
  projects: Project[];
  notes?: string;
  createdAt: string;
  // New fields for manual budget adjustment
  customTotal?: number; 
  customTotalNote?: string;
}

export interface Supplier {
  id: string;
  name: string;
  category: string; // e.g., Matériaux, Transport, Service
  phone: string;
  email: string;
  address: string;
  ice?: string;
  notes?: string;
}

export interface DocItem {
  id: string;
  designation: string;
  quantity: number;
  unitPrice: number;
  total: number;
  isTotalOverridden: boolean; // If true, total is not auto-calculated
  isSectionHeader: boolean; // If true, this row acts as a category header
}

export interface DocumentData {
  id: string;
  clientId?: string; // Link to Client
  type: DocType;
  number: string;
  date: string; // YYYY-MM-DD
  status: DocStatus;
  template: TemplateType;
  
  // Client Snapshot (to preserve history if client changes)
  clientName: string;
  clientAddress: string;
  clientIce?: string;
  clientEmail?: string;
  clientPhone?: string;
  
  object: string; // "Objet: Travaux de rénovation"
  
  items: DocItem[];
  
  // Totals
  subTotal: number; // Total HT
  hasVat: boolean; // Determines if VAT is applied
  vatRate: number; // Percentage (e.g., 20)
  vatAmount: number;
  totalTTC: number;
  
  hasDeposit?: boolean; // Toggle for deposit
  depositPercentage?: number; // Percentage (0-100)
  depositAmount?: number; // Acompte
  
  notes?: string;
  currency: string;
}
