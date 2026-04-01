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
  notas?: string,
  fotoUrl?: string,
  archivoUrl?: string
): DetailedQuoteData {
  const materialBase = MATERIALES[materialKey] || MATERIALES['mdf3'];
  const material = {
    ...materialBase,
    costo: cfg.materiales?.[materialKey] ?? materialBase.costo
  };

  const lienzo = lienzoKey === 'custom' ? { ...customLienzo, nombre: 'Personalizado' } : (LIENZOS[lienzoKey] || LIENZOS['std120x240']);

  const costoFijoHora = calcularCostoFijoHora(cfg);
  const tiempoConPadding = tiempoSimulado * 1.30;
  const tiempoTotalMinutos = (tiempoConPadding * cantidad) + setup;
  const tiempoTotalHoras = tiempoTotalMinutos / 60;

  const areaHoja = lienzo.ancho * lienzo.largo * (lienzo.piezas || 1);
  
  // Cálculo basado en centímetros cuadrados (área) no lineales (dimensiones individuales)
  const areaRealIndividual = ancho * largo;
  const areaPanelIndividual = redondearComercial(areaRealIndividual, redondeo);
  const areaCobrar = areaPanelIndividual * cantidad;

  // Para visualización mantenemos los valores originales, ya que el redondeo es sobre el área
  const anchoCobrar = ancho;
  const largoCobrar = largo;

  // Aplicamos merma base del 20%, o 35% si se exige respetar la veta.
  const areaTotalNecesaria = veta ? areaCobrar * 1.35 : areaCobrar * 1.20;
  
  // Proporción del diseño respecto al lienzo completo
  const proporcionLienzo = areaTotalNecesaria / areaHoja;

  let hojasNecesarias = Math.ceil(proporcionLienzo);
  if (hojasNecesarias < 1) hojasNecesarias = 1;

  const panelesPorHoja = areaHoja / areaPanelIndividual;
  
  // Costo basado en la proporción del área utilizada + 25% de recargo por corte
  const factorLienzo = lienzo.factor || 1;
  const costoPanelBase = material.costo / panelesPorHoja;
  const costoPanelFinal = costoPanelBase * 1.25; // 25% extra por el corte
  const costoMaterial = costoPanelFinal * cantidad;
  
  const costoMaterialBase = costoPanelBase * cantidad;
  const margenMaterial = costoMaterial - costoMaterialBase;
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

  let utilidadBruta = costoTotalDirecto * margen;
  let subtotalBase = costoTotalDirecto + utilidadBruta;
  const subtotalSinDescuento = subtotalBase;
  let descuento = 0;

  if (urgencia > 1) {
    const cargoUrgencia = subtotalBase * (urgencia - 1);
    subtotalBase += cargoUrgencia;
    utilidadBruta += cargoUrgencia;
  }

  if (cantidad >= 10) {
    descuento = subtotalBase * 0.10;
  }

  const subtotal = subtotalBase - descuento;
  const utilidad = subtotal - costoTotalDirecto;
  const iva = aplicarIva ? subtotal * 0.16 : 0;
  const total = subtotal + iva;
  const precioUnitario = cantidad > 0 ? total / cantidad : 0;

  return {
    total,
    subtotal,
    iva,
    utilidad,
    utilidadBruta,
    precioUnitario,
    descuento,
    subtotalSinDescuento,
    material,
    lienzo,
    ancho,
    largo,
    anchoCobrar,
    largoCobrar,
    areaPanelIndividual,
    areaCobrar,
    cantidad,
    tiempoTotalMinutos,
    hojasNecesarias,
    proporcionLienzo,
    factorLienzo,
    aprovechamiento,
    panelesPorHoja,
    costoFijoHora,
    costoMaquina,
    costoEnergia,
    costoMaterialBase,
    margenMaterial,
    costoMaterial,
    costoDiseno,
    notas,
    fotoUrl,
    archivoUrl
  };
}
