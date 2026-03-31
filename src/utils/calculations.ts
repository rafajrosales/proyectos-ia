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
  const materialBase = MATERIALES[materialKey] || MATERIALES['mdf3'];
  const material = {
    ...materialBase,
    costo: cfg.materiales?.[materialKey] ?? materialBase.costo
  };

  const lienzo = lienzoKey === 'custom' ? { ...customLienzo, nombre: 'Personalizado' } : (LIENZOS[lienzoKey] || LIENZOS['std120x240']);

  const costoFijoHora = calcularCostoFijoHora(cfg);
  const tiempoConPadding = tiempoSimulado * 1.30;
  const tiempoTotalMinutos = (tiempoConPadding + setup) * cantidad;
  const tiempoTotalHoras = tiempoTotalMinutos / 60;

  const areaHoja = lienzo.ancho * lienzo.largo * (lienzo.piezas || 1);
  
  const anchoCobrar = redondearComercial(ancho, redondeo);
  const largoCobrar = redondearComercial(largo, redondeo);
  const areaCobrar = anchoCobrar * largoCobrar * cantidad;

  // Solo aplicamos merma extra si se exige respetar la veta (35%).
  const areaTotalNecesaria = veta ? areaCobrar * 1.35 : areaCobrar;
  
  // Proporción del diseño respecto al lienzo completo
  const proporcionLienzo = areaTotalNecesaria / areaHoja;

  let hojasNecesarias = Math.ceil(proporcionLienzo);
  if (hojasNecesarias < 1) hojasNecesarias = 1;

  // Costo basado en la proporción del lienzo utilizado más un 50% extra
  const factorLienzo = lienzo.factor || 1;
  const costoMaterialBase = proporcionLienzo * material.costo * factorLienzo;
  const margenMaterial = costoMaterialBase * 0.5;
  const costoMaterial = costoMaterialBase + margenMaterial;
  const aprovechamiento = Math.min(100, (areaCobrar / areaTotalNecesaria) * 100);

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
    proporcionLienzo,
    aprovechamiento,
    costoFijoHora,
    costoMaquina,
    costoEnergia,
    costoMaterialBase,
    margenMaterial,
    costoMaterial,
    costoDiseno,
    notas
  };
}
