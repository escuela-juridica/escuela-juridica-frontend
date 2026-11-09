export function correoDeCredencialGoogle(credencial: string): string {
  try {
    const carga = credencial.split('.')[1] ?? '';
    const base64 = carga.replaceAll('-', '+').replaceAll('_', '/');
    const bytes = Uint8Array.from(atob(base64), (caracter) => caracter.charCodeAt(0));
    const datos = JSON.parse(new TextDecoder().decode(bytes)) as { email?: unknown };
    return typeof datos.email === 'string' ? datos.email : '';
  } catch {
    return '';
  }
}
