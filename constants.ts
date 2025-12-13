
import { CompanyProfile, DocumentData, DocType, DocStatus } from './types';

const now = new Date();
const month = (now.getMonth() + 1).toString().padStart(2, '0');
const year = now.getFullYear().toString().slice(-2);

export const INITIAL_PROFILE: CompanyProfile = {
  name: "Ma Société S.A.R.L",
  address: "123 Bd Mohammed V, Casablanca, Maroc",
  phone: "+212 6 00 00 00 00",
  email: "contact@masociete.com",
  ice: "001234567890000",
  rc: "12345",
  if_tax: "9876543",
  bankName: "Attijariwafa Bank",
  rib: "123 456 7890000000000000 00",
  docNumberFormat: 'seq-mmyy',
  docNumberPrefix: ''
};

export const INITIAL_DOCUMENT: DocumentData = {
  id: '',
  type: DocType.DEVIS,
  number: `1-${month}${year}`,
  date: new Date().toISOString().split('T')[0],
  status: DocStatus.DRAFT,
  template: 'classic',
  clientName: "",
  clientAddress: "",
  clientIce: "",
  clientEmail: "",
  clientPhone: "",
  object: "",
  items: [
    { id: '1', designation: 'Service ou produit exemple', quantity: 1, unitPrice: 100, total: 100, isTotalOverridden: false, isSectionHeader: false }
  ],
  subTotal: 100,
  hasVat: false,
  vatRate: 20,
  vatAmount: 0,
  totalTTC: 100,
  hasDeposit: true,
  depositPercentage: 50,
  depositAmount: 50,
  currency: 'DH'
};