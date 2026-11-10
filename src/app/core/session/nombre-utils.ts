const PARTICULAS = new Set(['de', 'del', 'la', 'las', 'los', 'y', 'e', 'da', 'das', 'do', 'dos', 'van', 'von', 'der', 'di', 'du', 'le']);

function formatearPalabra(palabra: string, primera: boolean): string {
  const tieneMayusculas = palabra !== palabra.toLowerCase();
  const tieneMinusculas = palabra !== palabra.toUpperCase();
  if (tieneMayusculas && tieneMinusculas) {
    return palabra;
  }
  const minuscula = palabra.toLowerCase();
  if (!primera && PARTICULAS.has(minuscula)) {
    return minuscula;
  }
  return minuscula.replace(/(^|[-'\u2019])(\p{L})/gu, (_, separador: string, letra: string) => separador + letra.toUpperCase());
}

export function formatearNombrePropio(nombre: string | null | undefined): string {
  const texto = (nombre ?? '').trim();
  if (!texto) {
    return nombre ?? '';
  }
  return texto
    .split(/\s+/)
    .map((palabra, indice) => formatearPalabra(palabra, indice === 0))
    .join(' ');
}

export function obtenerIniciales(nombreCompleto: string | null | undefined): string {
  const palabras = (nombreCompleto ?? '').trim().split(/\s+/).filter(Boolean);
  if (palabras.length === 0) {
    return '';
  }
  const primera = palabras[0].charAt(0);
  const segunda = palabras.length > 1 ? palabras[1].charAt(0) : '';
  return (primera + segunda).toUpperCase();
}
