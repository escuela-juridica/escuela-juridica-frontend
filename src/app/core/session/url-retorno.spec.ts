import { urlRetornoSegura } from './url-retorno';

describe('urlRetornoSegura', () => {
  it('acepta rutas internas con parámetros', () => {
    expect(urlRetornoSegura('/cursos/derecho-societario')).toBe('/cursos/derecho-societario');
    expect(urlRetornoSegura('/app/pagar/curso?x=1#a')).toBe('/app/pagar/curso?x=1#a');
  });

  it('rechaza direcciones externas, vacías o que vuelven al acceso', () => {
    expect(urlRetornoSegura(null)).toBeNull();
    expect(urlRetornoSegura('')).toBeNull();
    expect(urlRetornoSegura('https://sitio-malo.com')).toBeNull();
    expect(urlRetornoSegura('//sitio-malo.com')).toBeNull();
    expect(urlRetornoSegura('/\\sitio-malo.com')).toBeNull();
    expect(urlRetornoSegura('cursos/x')).toBeNull();
    expect(urlRetornoSegura('/acceso?returnUrl=%2Fx')).toBeNull();
    expect(urlRetornoSegura('/registro')).toBeNull();
  });
});
