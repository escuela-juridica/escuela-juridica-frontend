import { HttpErrorResponse } from '@angular/common/http';
import { ChangeDetectorRef, Component, DestroyRef, OnInit, inject } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import {
  AbstractControl,
  NonNullableFormBuilder,
  ReactiveFormsModule,
  Validators,
} from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { finalize } from 'rxjs';

import { RegistroApiService } from './registro-api.service';
import { AntiRobot } from './anti-robot';
import { WHATSAPP_REGISTRO, enlaceAyudaRegistro } from './registro-contacto';
import { BotonGoogle } from '../../../shared/ui/boton-google/boton-google';
import { Session } from '../../../core/session/session';
import { AccesoApiService } from '../acceso/acceso-api.service';
import { correoDeCredencialGoogle } from '../acceso/google-credencial.util';
import {
  ApiErrorRespuesta,
  ContextoRegistroGoogle,
  RegistroFormularioPeticion,
  RegistroGooglePeticion,
} from './registro.models';
import { contrasenasCoincidenValidator, politicaContrasenaValidator } from './registro.validators';

const NOMBRES_CAMPOS = [
  'nombres',
  'apellidoPaterno',
  'apellidoMaterno',
  'correo',
  'telefono',
  'documentoIdentidad',
  'contrasena',
  'confirmarContrasena',
  'aceptaTerminos',
  'evidenciaAntiRobot',
] as const;

type NombreCampoRegistro = (typeof NOMBRES_CAMPOS)[number];

const CAMPOS_NOMBRE = ['nombres', 'apellidoPaterno', 'apellidoMaterno'] as const;

const PATRON_NOMBRE_REQUERIDO = /^[A-ZÁÉÍÓÚÑÜ][A-ZÁÉÍÓÚÑÜ '-]*$/;
const PATRON_NOMBRE_OPCIONAL = /^([A-ZÁÉÍÓÚÑÜ][A-ZÁÉÍÓÚÑÜ '-]*)?$/;

@Component({
  selector: 'app-registro',
  imports: [RouterLink, ReactiveFormsModule, AntiRobot, BotonGoogle],
  templateUrl: './registro.html',
  styleUrl: './registro.scss',
})
export class Registro implements OnInit {
  readonly enlaceWhatsApp = enlaceAyudaRegistro(inject(WHATSAPP_REGISTRO));
  private readonly fb = inject(NonNullableFormBuilder);
  private readonly destroyRef = inject(DestroyRef);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly registroApi = inject(RegistroApiService);
  private readonly accesoApi = inject(AccesoApiService);
  private readonly sesion = inject(Session);
  private readonly detector = inject(ChangeDetectorRef);
  private readonly erroresServidor: Partial<Record<NombreCampoRegistro, string>> = {};

  enviando = false;
  intentoEnvio = false;
  errorGeneral = '';
  mostrarContrasena = false;
  mostrarConfirmacion = false;
  modoGoogle = false;
  cargandoContextoGoogle = false;
  validandoGoogle = false;
  contextoGoogleValido = false;
  referenciaGoogle: string | null = null;

  cuentaCreada = false;
  avisoGoogle = '';
  reinicioAntiRobot = 0;

  readonly formulario = this.fb.group(
    {
      nombres: [
        '',
        [Validators.required, Validators.maxLength(120), Validators.pattern(PATRON_NOMBRE_REQUERIDO)],
      ],
      apellidoPaterno: [
        '',
        [Validators.required, Validators.maxLength(80), Validators.pattern(PATRON_NOMBRE_REQUERIDO)],
      ],
      apellidoMaterno: [
        '',
        [Validators.maxLength(80), Validators.pattern(PATRON_NOMBRE_OPCIONAL)],
      ],
      correo: ['', [Validators.required, Validators.email, Validators.maxLength(254)]],
      telefono: ['', [Validators.maxLength(30)]],
      documentoIdentidad: ['', [Validators.maxLength(30)]],
      contrasena: ['', [Validators.required, politicaContrasenaValidator]],
      confirmarContrasena: ['', [Validators.required]],
      aceptaTerminos: [false, [Validators.requiredTrue]],
      evidenciaAntiRobot: ['', [Validators.required]],
    },
    { validators: contrasenasCoincidenValidator },
  );

  constructor() {
    for (const nombre of NOMBRES_CAMPOS) {
      const control: AbstractControl = this.formulario.controls[nombre];
      control.valueChanges.pipe(takeUntilDestroyed()).subscribe(() => {
        this.limpiarErrorCampo(nombre);
        this.detector.markForCheck();
      });
    }

    for (const nombre of CAMPOS_NOMBRE) {
      const control = this.formulario.controls[nombre];
      control.valueChanges.pipe(takeUntilDestroyed()).subscribe((valor) => {
        const mayuscula = valor.toLocaleUpperCase('es-PE');
        if (valor !== mayuscula) {
          control.setValue(mayuscula, { emitEvent: false });
        }
      });
    }
  }

  ngOnInit(): void {
    const parametros = this.route.snapshot.queryParamMap;
    const referencia = parametros.get('referenciaGoogle') ?? parametros.get('referencia');

    if (referencia) {
      this.cargarContextoGoogle(referencia);
    }
  }

  campoInvalido(nombre: NombreCampoRegistro): boolean {
    const control = this.formulario.controls[nombre];
    return control.invalid && (control.touched || this.intentoEnvio);
  }

  mensajeErrorServidor(nombre: NombreCampoRegistro): string | null {
    return this.erroresServidor[nombre] ?? null;
  }

  get valorContrasena(): string {
    return this.formulario.controls.contrasena.value;
  }

  get cumpleLongitud(): boolean {
    return this.valorContrasena.length >= 8;
  }

  get cumpleMayuscula(): boolean {
    return /\p{Uppercase}/u.test(this.valorContrasena);
  }

  get cumpleMinuscula(): boolean {
    return /\p{Lowercase}/u.test(this.valorContrasena);
  }

  get cumpleNumero(): boolean {
    return /\p{Nd}/u.test(this.valorContrasena);
  }

  get confirmacionInvalida(): boolean {
    const confirmacion = this.formulario.controls.confirmarContrasena;
    const debeMostrarError = confirmacion.touched || this.intentoEnvio;
    const noCoincide = this.formulario.hasError('contrasenasDiferentes');

    return debeMostrarError && (confirmacion.invalid || noCoincide);
  }

  registrar(): void {
    if (this.enviando || this.cargandoContextoGoogle || this.cuentaCreada) {
      return;
    }

    this.intentoEnvio = true;
    this.errorGeneral = '';
    this.limpiarTodosLosErroresServidor();
    this.normalizarCamposAntesDeValidar();

    if (this.formulario.invalid || (this.modoGoogle && !this.contextoGoogleValido)) {
      this.formulario.markAllAsTouched();
      return;
    }

    if (this.modoGoogle) {
      this.enviarRegistroGoogle();
      return;
    }

    this.enviarRegistroFormulario();
  }

  actualizarAntiRobot(token: string): void {
    this.formulario.controls.evidenciaAntiRobot.setValue(token);
    this.detector.markForCheck();
  }

  continuarConGoogle(credencial: string): void {
    if (this.validandoGoogle || this.enviando || this.cargandoContextoGoogle || this.cuentaCreada) {
      return;
    }

    this.validandoGoogle = true;
    this.errorGeneral = '';

    this.accesoApi
      .accederConGoogle(credencial)
      .pipe(
        takeUntilDestroyed(this.destroyRef),
        finalize(() => {
          this.validandoGoogle = false;
          this.detector.markForCheck();
        }),
      )
      .subscribe({
        next: (respuesta) => {
          if (respuesta.estado === 'REGISTRO' && respuesta.referenciaRegistro) {
            this.cargarContextoGoogle(respuesta.referenciaRegistro);
            return;
          }
          if (respuesta.sesion) {
            this.sesion.iniciarSesion(respuesta.sesion);
            void this.router.navigate([
              respuesta.sesion.rolPrincipal === 'ADMINISTRADOR' ? '/admin/dashboard' : '/app/panel',
            ]);
          }
        },
        error: (error: HttpErrorResponse) => this.manejarErrorAccesoGoogle(error, credencial),
      });
  }

  reiniciarGoogle(): void {
    this.modoGoogle = false;
    this.contextoGoogleValido = false;
    this.referenciaGoogle = null;
    this.errorGeneral = '';
    this.avisoGoogle = '';
    this.limpiarTodosLosErroresServidor();
    const c = this.formulario.controls;
    c.correo.enable();
    c.contrasena.setValidators([Validators.required, politicaContrasenaValidator]);
    c.confirmarContrasena.setValidators([Validators.required]);
    c.evidenciaAntiRobot.setValidators([Validators.required]);
    c.contrasena.updateValueAndValidity();
    c.confirmarContrasena.updateValueAndValidity();
    c.evidenciaAntiRobot.updateValueAndValidity();
  }

  private cargarContextoGoogle(referencia: string): void {
    this.modoGoogle = true;
    this.contextoGoogleValido = false;
    this.avisoGoogle = '';
    this.errorGeneral = '';
    this.referenciaGoogle = referencia;
    this.cargandoContextoGoogle = true;
    this.configurarControlesGoogle();

    this.registroApi
      .obtenerContextoGoogle(referencia)
      .pipe(
        takeUntilDestroyed(this.destroyRef),
        finalize(() => {
          this.cargandoContextoGoogle = false;
          this.detector.markForCheck();
        }),
      )
      .subscribe({
        next: (contexto) => this.aplicarContextoGoogle(contexto),
        error: (error: HttpErrorResponse) => this.manejarErrorContextoGoogle(error),
      });
  }

  private configurarControlesGoogle(): void {
    const { correo, contrasena, confirmarContrasena, evidenciaAntiRobot } =
      this.formulario.controls;

    correo.disable({ emitEvent: false });
    contrasena.clearValidators();
    confirmarContrasena.clearValidators();
    evidenciaAntiRobot.clearValidators();
    contrasena.setValue('', { emitEvent: false });
    confirmarContrasena.setValue('', { emitEvent: false });
    evidenciaAntiRobot.setValue('', { emitEvent: false });
    contrasena.updateValueAndValidity({ emitEvent: false });
    confirmarContrasena.updateValueAndValidity({ emitEvent: false });
    evidenciaAntiRobot.updateValueAndValidity({ emitEvent: false });
    this.formulario.updateValueAndValidity({ emitEvent: false });
  }

  private aplicarContextoGoogle(contexto: ContextoRegistroGoogle): void {
    const mayusculas = (valor?: string | null): string =>
      (valor ?? '').trim().replace(/\s+/g, ' ').toLocaleUpperCase('es-PE');
    const apellidoPrincipal = mayusculas(contexto.apellidoPaterno) || mayusculas(contexto.apellidos);

    this.formulario.patchValue(
      {
        nombres: mayusculas(contexto.nombres),
        apellidoPaterno: apellidoPrincipal,
        apellidoMaterno: mayusculas(contexto.apellidoMaterno),
        correo: contexto.correo,
      },
      { emitEvent: false },
    );

    this.contextoGoogleValido = true;
    this.formulario.updateValueAndValidity({ emitEvent: false });
  }

  private enviarRegistroFormulario(): void {
    const valores = this.formulario.getRawValue();
    const peticion: RegistroFormularioPeticion = {
      nombres: valores.nombres.trim(),
      apellidoPaterno: valores.apellidoPaterno.trim(),
      apellidoMaterno: this.textoOpcional(valores.apellidoMaterno),
      correo: valores.correo.trim().toLowerCase(),
      telefono: this.textoOpcional(valores.telefono),
      documentoIdentidad: this.textoOpcional(valores.documentoIdentidad),
      contrasena: valores.contrasena,
      confirmarContrasena: valores.confirmarContrasena,
      aceptaTerminos: valores.aceptaTerminos,
      evidenciaAntiRobot: valores.evidenciaAntiRobot,
    };

    this.enviando = true;
    this.registroApi
      .registrarFormulario(peticion)
      .pipe(
        takeUntilDestroyed(this.destroyRef),
        finalize(() => {
          this.enviando = false;
          this.actualizarAntiRobot('');
          this.reinicioAntiRobot++;
          this.detector.markForCheck();
        }),
      )
      .subscribe({
        next: (respuesta) => {
          this.cuentaCreada = true;
          void this.router.navigate(['/verificar-correo'], {
            queryParams: { referencia: respuesta.referenciaVerificacion },
            state: { envioAceptado: respuesta.envioAceptado, correo: respuesta.correo },
          });
        },
        error: (error: HttpErrorResponse) => this.manejarErrorRegistro(error),
      });
  }

  private enviarRegistroGoogle(): void {
    if (!this.referenciaGoogle) {
      this.errorGeneral =
        'La referencia de Google no está disponible. Inicia el proceso nuevamente.';
      return;
    }

    const valores = this.formulario.getRawValue();
    const peticion: RegistroGooglePeticion = {
      referencia: this.referenciaGoogle,
      nombres: valores.nombres.trim(),
      apellidoPaterno: valores.apellidoPaterno.trim(),
      apellidoMaterno: this.textoOpcional(valores.apellidoMaterno),
      telefono: this.textoOpcional(valores.telefono),
      documentoIdentidad: this.textoOpcional(valores.documentoIdentidad),
      aceptaTerminos: valores.aceptaTerminos,
    };

    this.enviando = true;
    this.registroApi
      .completarRegistroGoogle(peticion)
      .pipe(
        takeUntilDestroyed(this.destroyRef),
        finalize(() => {
          this.enviando = false;
          this.detector.markForCheck();
        }),
      )
      .subscribe({
        next: (usuario) => {
          this.cuentaCreada = true;
          this.sesion.iniciarSesion({
            nombreCompleto: usuario.nombre,
            correo: usuario.email,
            rolPrincipal: usuario.rol === 'administrador' ? 'ADMINISTRADOR' : 'ALUMNO',
          });
          void this.router.navigate(['/app/panel']);
        },
        error: (error: HttpErrorResponse) => this.manejarErrorRegistro(error),
      });
  }

  private manejarErrorRegistro(error: HttpErrorResponse): void {
    const respuesta = this.obtenerErrorApi(error);
    const tieneErroresCampo = this.aplicarErroresCampo(respuesta?.fieldErrors ?? []);

    if (
      error.status === 409 &&
      !tieneErroresCampo &&
      !this.modoGoogle &&
      ['CORREO_DUPLICADO', 'DOCUMENTO_DUPLICADO'].includes(respuesta?.code ?? '')
    ) {
      const campo: NombreCampoRegistro =
        respuesta?.code === 'DOCUMENTO_DUPLICADO' ? 'documentoIdentidad' : 'correo';
      this.marcarErrorServidor(campo, respuesta?.message ?? 'El dato ya se encuentra registrado.');
    }

    if (this.modoGoogle && respuesta?.code === 'INVALID_TOKEN') {
      this.contextoGoogleValido = false;
    }

    if (error.status === 0) {
      this.errorGeneral = 'No pudimos comunicarnos con el servidor. Inténtalo nuevamente.';
      return;
    }

    if (error.status === 400) {
      this.errorGeneral = respuesta?.message ?? 'Revisa los datos marcados e inténtalo nuevamente.';
      return;
    }

    if (error.status === 409) {
      this.errorGeneral = respuesta?.message ?? 'Ya existe una cuenta con los datos ingresados.';
      return;
    }

    this.errorGeneral = respuesta?.message ?? 'No pudimos crear tu cuenta. Inténtalo nuevamente.';
  }

  private manejarErrorAccesoGoogle(error: HttpErrorResponse, credencial: string): void {
    const respuesta = this.obtenerErrorApi(error);
    if (respuesta?.code === 'PENDING_EMAIL_VERIFICATION') {
      void this.router.navigate(['/verificar-correo'], {
        state: { correo: correoDeCredencialGoogle(credencial) },
      });
      return;
    }
    this.errorGeneral =
      respuesta?.message ?? 'No pudimos iniciar sesión con Google. Inténtalo nuevamente.';
  }

  private manejarErrorContextoGoogle(error: HttpErrorResponse): void {
    const respuesta = this.obtenerErrorApi(error);
    this.contextoGoogleValido = false;

    if (error.status === 503 && respuesta?.code === 'GOOGLE_PENDIENTE') {
      this.avisoGoogle =
        'La validación de Google está pendiente de integración con el módulo de acceso.';
      this.errorGeneral = '';
      return;
    }

    if ([400, 404, 410].includes(error.status)) {
      this.errorGeneral =
        respuesta?.message ??
        'La autorización de Google venció o no es válida. Inicia el proceso nuevamente.';
      return;
    }

    this.errorGeneral =
      error.status === 0
        ? 'No pudimos comunicarnos con el servidor para validar Google.'
        : 'No pudimos recuperar tus datos de Google. Inténtalo nuevamente.';
  }

  private aplicarErroresCampo(errores: ApiErrorRespuesta['fieldErrors']): boolean {
    let aplicados = false;

    for (const error of errores) {
      if (this.esNombreCampo(error.field)) {
        this.marcarErrorServidor(error.field, error.message);
        aplicados = true;
      }
    }

    return aplicados;
  }

  private marcarErrorServidor(nombre: NombreCampoRegistro, mensaje: string): void {
    const control = this.formulario.controls[nombre];
    this.erroresServidor[nombre] = mensaje;
    control.setErrors({ ...control.errors, servidor: true });
    control.markAsTouched();
  }

  private limpiarErrorCampo(nombre: NombreCampoRegistro): void {
    delete this.erroresServidor[nombre];
    const control = this.formulario.controls[nombre];
    const erroresRestantes = Object.fromEntries(
      Object.entries(control.errors ?? {}).filter(([clave]) => clave !== 'servidor'),
    );

    control.setErrors(Object.keys(erroresRestantes).length > 0 ? erroresRestantes : null);
  }

  private limpiarTodosLosErroresServidor(): void {
    for (const nombre of NOMBRES_CAMPOS) {
      this.limpiarErrorCampo(nombre);
    }
  }

  private normalizarCamposAntesDeValidar(): void {
    const controles = this.formulario.controls;

    controles.nombres.setValue(controles.nombres.value.trim(), { emitEvent: false });
    controles.apellidoPaterno.setValue(controles.apellidoPaterno.value.trim(), {
      emitEvent: false,
    });
    controles.apellidoMaterno.setValue(controles.apellidoMaterno.value.trim(), {
      emitEvent: false,
    });
    controles.correo.setValue(controles.correo.value.trim().toLowerCase(), { emitEvent: false });
    controles.telefono.setValue(controles.telefono.value.trim(), { emitEvent: false });
    controles.documentoIdentidad.setValue(controles.documentoIdentidad.value.trim(), {
      emitEvent: false,
    });
  }

  private obtenerErrorApi(error: HttpErrorResponse): ApiErrorRespuesta | null {
    if (typeof error.error !== 'object' || error.error === null) {
      return null;
    }

    const valor = error.error as Partial<ApiErrorRespuesta>;
    return {
      timestamp: typeof valor.timestamp === 'string' ? valor.timestamp : '',
      status: error.status,
      code: typeof valor.code === 'string' ? valor.code : '',
      message:
        typeof valor.message === 'string' ? valor.message : 'No pudimos procesar la solicitud.',
      path: typeof valor.path === 'string' ? valor.path : '',
      fieldErrors: Array.isArray(valor.fieldErrors)
        ? valor.fieldErrors.filter(
            (campo) =>
              campo && typeof campo.field === 'string' && typeof campo.message === 'string',
          )
        : [],
    };
  }

  private esNombreCampo(nombre: string): nombre is NombreCampoRegistro {
    return (NOMBRES_CAMPOS as readonly string[]).includes(nombre);
  }

  private textoOpcional(valor: string): string | null {
    const limpio = valor.trim();
    return limpio.length > 0 ? limpio : null;
  }
}
