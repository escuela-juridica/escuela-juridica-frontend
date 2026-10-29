export type TabInformacionBase = 'tipoCurso' | 'categoria' | 'docente' | 'entidad' | 'firmante' | 'tipoMaterial';

export interface TipoCursoRespuesta {
  id: number;
  codigo: string;
  nombre: string;
  activo: boolean;
  orden: number;
}

export interface TipoCursoPeticion {
  codigo: string;
  nombre: string;
  orden: number;
}

export interface CategoriaRespuesta {
  id: number;
  codigo: string;
  nombre: string;
  activo: boolean;
  orden: number;
}

export interface CategoriaPeticion {
  codigo: string;
  nombre: string;
  orden: number;
}

export interface DocenteRespuesta {
  personaId: number;
  nombres: string;
  apellidoPaterno: string;
  apellidoMaterno: string | null;
  nombreCompleto: string;
  fotoUrl: string | null;
  cargoProfesional: string;
  biografiaProfesional: string | null;
  activo: boolean;
}

export interface DocentePeticion {
  nombres: string;
  apellidoPaterno: string;
  apellidoMaterno: string | null;
  fotoUrl: string | null;
  cargoProfesional: string;
  biografiaProfesional: string | null;
}

export interface EntidadRespuesta {
  id: number;
  nombre: string;
  logoUrl: string | null;
  activo: boolean;
}

export interface EntidadPeticion {
  nombre: string;
  logoUrl: string | null;
}

export interface FirmanteRespuesta {
  id: number;
  personaId: number;
  nombres: string;
  apellidoPaterno: string;
  apellidoMaterno: string | null;
  nombreCompleto: string;
  cargoFirma: string;
  imagenFirmaUrl: string | null;
  activo: boolean;
}

export interface FirmantePeticion {
  nombres: string;
  apellidoPaterno: string;
  apellidoMaterno: string | null;
  cargoFirma: string;
  imagenFirmaUrl: string | null;
}

export interface TipoMaterialRespuesta {
  id: number;
  codigo: string;
  nombre: string;
  descripcion: string | null;
  activo: boolean;
}

export interface TipoMaterialPeticion {
  codigo: string;
  nombre: string;
  descripcion: string | null;
}
