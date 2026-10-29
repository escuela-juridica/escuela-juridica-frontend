/** Iniciales para el avatar de cuenta: primera letra del nombre + primera letra del apellido. */
export function obtenerIniciales(nombreCompleto: string | null | undefined): string {
  const palabras = (nombreCompleto ?? '').trim().split(/\s+/).filter(Boolean);
  if (palabras.length === 0) {
    return '';
  }
  const primera = palabras[0].charAt(0);
  const segunda = palabras.length > 1 ? palabras[1].charAt(0) : '';
  return (primera + segunda).toUpperCase();
}
