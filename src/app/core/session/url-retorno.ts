const RUTAS_PUBLICAS_DE_ACCESO = ['/acceso', '/registro', '/verificar-correo', '/recuperar-password', '/nueva-password'];

export function urlRetornoSegura(valor: string | null | undefined): string | null {
  if (!valor || !valor.startsWith('/') || valor.startsWith('//') || valor.includes('\\') || valor.includes('://')) {
    return null;
  }
  const ruta = valor.split(/[?#]/)[0];
  const esRutaDeAcceso = RUTAS_PUBLICAS_DE_ACCESO.some((base) => ruta === base || ruta.startsWith(`${base}/`));
  return esRutaDeAcceso ? null : valor;
}
