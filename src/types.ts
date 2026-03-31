export interface UserConfig {
  uid: string;
  inversion: number;
  vidaUtil: number;
  renta: number;
  sueldoSemanal: number;
  internet: number;
  mantenimientoAnual: number;
  kwh: number;
  horasMes: number;
  materiales: Record<string, number>;
  updatedAt: string;
}

export interface Quote {
  id?: string;
  uid: string;
  fecha: string;
  cliente: string;
  material: string;
  lienzo: string;
  total: number;
  datos: string; // JSON stringified DetailedQuoteData
}

export interface DetailedQuoteData {
  total: number;
  subtotal: number;
  iva: number;
  utilidad: number;
  material: {
    nombre: string;
    costo: number;
  };
  lienzo: {
    ancho: number;
    largo: number;
    nombre: string;
    piezas?: number;
    factor?: number;
  };
  ancho: number;
  largo: number;
  anchoCobrar: number;
  largoCobrar: number;
  cantidad: number;
  tiempoTotalMinutos: number;
  hojasNecesarias: number;
  proporcionLienzo: number;
  factorLienzo: number;
  aprovechamiento: number;
  costoFijoHora: number;
  costoMaquina: number;
  costoEnergia: number;
  costoMaterialBase: number;
  margenMaterial: number;
  costoMaterial: number;
  costoDiseno: number;
  notas?: string;
  fotoUrl?: string;
  archivoUrl?: string;
}

export const DEFAULT_CONFIG: Omit<UserConfig, 'uid' | 'updatedAt'> = {
  inversion: 300000,
  vidaUtil: 7,
  renta: 5000,
  sueldoSemanal: 1200,
  internet: 1850,
  mantenimientoAnual: 1000,
  kwh: 2.50,
  horasMes: 160,
  materiales: {
    mdf3: 185,
    mdf6: 345,
    acrilico3: 1450,
    espejo: 750
  }
};

export const MATERIALES: Record<string, { nombre: string; costo: number }> = {
  mdf3: { nombre: 'MDF 3mm', costo: 185 },
  mdf6: { nombre: 'MDF 6mm', costo: 345 },
  acrilico3: { nombre: 'Acrílico 3mm', costo: 1450 },
  espejo: { nombre: 'Espejo 3mm', costo: 750 }
};

export const LIENZOS: Record<string, { ancho: number; largo: number; nombre: string; piezas?: number; factor?: number }> = {
  std120x240: { ancho: 120, largo: 240, nombre: 'Estándar' },
  espejo120x180: { ancho: 120, largo: 180, nombre: 'Espejo' },
  tableros40x40: { ancho: 40, largo: 40, nombre: 'Tableros', piezas: 18, factor: 4 },
  custom: { ancho: 120, largo: 240, nombre: 'Personalizado' }
};

export enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

export interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId?: string;
    email?: string | null;
    emailVerified?: boolean;
    isAnonymous?: boolean;
    tenantId?: string | null;
    providerInfo: {
      providerId: string;
      displayName: string | null;
      email: string | null;
      photoUrl: string | null;
    }[];
  }
}
