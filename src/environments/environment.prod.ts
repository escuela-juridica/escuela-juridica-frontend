export const environment = {
  production: true,
  // TODO: ajustar cuando se defina el dominio de despliegue. Si frontend y
  // backend quedan en el mismo origen (o el servidor web reescribe /api hacia
  // el backend), dejar '/api'. Si quedan en dominios distintos, usar la URL
  // absoluta del backend real y habilitar CORS para ese origen.
  apiUrl: '/api',
};
