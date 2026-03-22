import { UserConfig, DetailedQuoteData, MATERIALES, LIENZOS } from '../types';

export function calcularCostoFijoHora(cfg: UserConfig): number {
  const depreciacionMes = cfg.inversion / (cfg.vidaUtil * 12);
  const sueldoMes = cfg.sueldoSemanal * 4.33;
  const mantMes = cfg.mantenimientoAnual / 12;
  const totalFijoMes = cfg.renta + cfg.internet + depreciacionMes + sueldoMes + mantMes;
  return totalFijoMes / cfg.horasMes;
}

export function redondearComercial(valor: number, redondeo: number): number {
  if (redondeo === 0) return valor;
  return Math.ceil(valor / redondeo) * redondeo;
}

export function calcularCotizacion(
  cfg: UserConfig,
  materialKey: string,
  lienzoKey: string,
  customLienzo: { ancho: number; largo: number },
  ancho: number,
  largo: number,
  cantidad: number,
  redondeo: number,
  tiempoSimulado: number,
  setup: number,
  minutosDiseno: number,
  margen: number,
  urgencia: number,
  veta: boolean,
  proceso: string,
  complejidad: string,
  aplicarIva: boolean,
  notas?: string
): DetailedQuoteData {
  const materialBase = MATERIALES[materialKey];
  const material = {
    ...materialBase,
    costo: cfg.materiales?.[materialKey] ?? materialBase.costo
  };

  const lienzo = lienzoKey === 'custom' ? { ...customLienzo, nombre: 'Personalizado' } : LIENZOS[lienzoKey];

  const costoFijoHora = calcularCostoFijoHora(cfg);
  const tiempoConPadding = tiempoSimulado * 1.30;
  const tiempoTotalMinutos = (tiempoConPadding + setup) * cantidad;
  const tiempoTotalHoras = tiempoTotalMinutos / 60;

  const areaHoja = lienzo.ancho * lienzo.largo;
  
  const anchoCobrar = redondearComercial(ancho, redondeo);
  const largoCobrar = redondearComercial(largo, redondeo);
  const areaCobrar = anchoCobrar * largoCobrar * cantidad;

  // El precio de la hoja se divide en 18 paneles (cortes de 40x40cm = 1600cm2)
  const areaPanel = 40 * 40; // 1600 cm2
  const precioPorPanel = material.costo / 18;
  
  // Al cobrar por paneles completos, el desperdicio ya se absorbe al redondear hacia arriba.
  // Solo aplicamos merma extra si se exige respetar la veta (35%).
  const areaParaPaneles = veta ? areaCobrar * 1.35 : areaCobrar;
  
  let panelesNecesarios = Math.ceil(areaParaPaneles / areaPanel);
  if (panelesNecesarios < 1) panelesNecesarios = 1;

  let hojasNecesarias = Math.ceil(areaParaPaneles / areaHoja);
  if (hojasNecesarias < 1) hojasNecesarias = 1;

  // Costo basado en los paneles de 40x40 utilizados
  const costoMaterial = panelesNecesarios * precioPorPanel;
  const aprovechamiento = Math.min(100, (areaCobrar / (panelesNecesarios * areaPanel)) * 100);

  let procesoMultiplier = 1;
  if (proceso === 'grabado') procesoMultiplier = 1.5;
  if (proceso === 'mixto') procesoMultiplier = 1.3;

  let complejidadMultiplier = 1;
  if (complejidad === 'estandar') complejidadMultiplier = 1.5;
  if (complejidad === 'complejo') complejidadMultiplier = 2.0;

  const costoMaquina = tiempoTotalHoras * costoFijoHora * procesoMultiplier * complejidadMultiplier;
  const costoEnergia = tiempoTotalHoras * 3 * cfg.kwh;
  const costoDiseno = (minutosDiseno / 60) * 100;
  const costoTotalDirecto = costoMaquina + costoEnergia + costoMaterial + costoDiseno;

  let utilidad = costoTotalDirecto * margen;
  let subtotal = costoTotalDirecto + utilidad;

  if (urgencia > 1) {
    const cargoUrgencia = subtotal * (urgencia - 1);
    subtotal += cargoUrgencia;
    utilidad += cargoUrgencia;
  }

  if (cantidad >= 10) {
    const descuento = subtotal * 0.10;
    subtotal -= descuento;
    utilidad -= descuento;
  }

  const iva = aplicarIva ? subtotal * 0.16 : 0;
  const total = subtotal + iva;

  return {
    total,
    subtotal,
    iva,
    utilidad,
    material,
    lienzo,
    ancho,
    largo,
    anchoCobrar,
    largoCobrar,
    cantidad,
    tiempoTotalMinutos,
    hojasNecesarias,
    panelesNecesarios,
    aprovechamiento,
    costoFijoHora,
    costoMaquina,
    costoEnergia,
    costoMaterial,
    costoDiseno,
    notas
  };
}
