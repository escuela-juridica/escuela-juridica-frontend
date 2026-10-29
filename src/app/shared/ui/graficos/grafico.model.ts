/** Un punto de una serie en el tiempo o una barra de una distribución. */
export interface PuntoGrafico {
  etiqueta: string;
  valor: number;
}

/** Redondea hacia arriba a un máximo "limpio" (1, 2, 5 × 10ⁿ) para que los ejes lean fácil. */
export function maximoLimpio(maximo: number): number {
  if (maximo <= 0) return 4;
  const exponente = Math.pow(10, Math.floor(Math.log10(maximo)));
  const fraccion = maximo / exponente;
  const paso = fraccion <= 1 ? 1 : fraccion <= 2 ? 2 : fraccion <= 5 ? 5 : 10;
  return paso * exponente;
}

/** Máximo para un conteo: cuatro tramos de un paso entero y «limpio» (1, 2, 5, 10, 20…), nunca de 0,5. */
export function maximoEntero(maximo: number): number {
  const minimo = Math.max(1, Math.ceil(maximo / 4));
  return maximoLimpio(minimo) * 4;
}

/** 1.200 → «1,2 K»; los valores pequeños se muestran completos. */
export function compacto(valor: number): string {
  if (valor >= 1_000_000) return `${(valor / 1_000_000).toFixed(1).replace(/\.0$/, '')} M`;
  if (valor >= 1000) return `${(valor / 1000).toFixed(1).replace(/\.0$/, '')} K`;
  return String(Math.round(valor * 100) / 100);
}
