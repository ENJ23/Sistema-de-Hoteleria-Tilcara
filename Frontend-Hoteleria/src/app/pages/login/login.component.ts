import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { Router, ActivatedRoute, RouterModule } from '@angular/router';
import { first, takeUntil } from 'rxjs/operators';
import { Subject } from 'rxjs';
import { AuthService } from '../../services/auth.service';
import { ConnectivityService } from '../../core/services/connectivity.service';

// Material
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';

@Component({
  selector: 'app-login',
  templateUrl: './login.component.html',
  styleUrls: ['./login.component.css'],
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    RouterModule,
    MatCardModule,
    MatFormFieldModule,
    MatInputModule,
    MatButtonModule,
    MatProgressSpinnerModule,
    MatSnackBarModule
  ]
})
export class LoginComponent implements OnInit, OnDestroy {
  loginForm!: FormGroup;
  loading = false;
  submitted = false;
  error = '';
  returnUrl = '/';
  isOnline = true;
  connectivityStatus = '';
  private destroy$ = new Subject<void>();

  constructor(
    private formBuilder: FormBuilder,
    private route: ActivatedRoute,
    private router: Router,
    private authService: AuthService,
    private snackBar: MatSnackBar,
    private connectivityService: ConnectivityService
  ) {
    // Redirigir a la página de inicio si ya está autenticado
    if (this.authService.currentUserValue) {
      this.router.navigate(['/']);
    }
  }

  ngOnInit() {
    this.loginForm = this.formBuilder.group({
      email: ['', [Validators.required, Validators.email]],
      password: ['', [Validators.required, Validators.minLength(6)]]
    });

    // Obtener la URL de retorno de los parámetros de consulta o por defecto a '/'
    this.returnUrl = this.route.snapshot.queryParams['returnUrl'] || '/';
    
    // Validación en tiempo real
    this.loginForm.valueChanges.subscribe(() => {
      this.error = ''; // Limpiar errores cuando el usuario modifica el formulario
    });
    
    // Verificar conectividad
    this.checkConnectivity();
  }

  ngOnDestroy() {
    this.destroy$.next();
    this.destroy$.complete();
  }

  private checkConnectivity() {
    this.connectivityService.checkConnectivity()
      .pipe(takeUntil(this.destroy$))
      .subscribe(online => {
        this.isOnline = online;
        this.connectivityStatus = online ? 'Conectado' : 'Sin conexión';
        
        if (!online) {
          this.snackBar.open('⚠️ Sin conexión al servidor. Verifica tu internet.', 'Cerrar', {
            duration: 5000,
            panelClass: ['warning-snackbar']
          });
        }
      });
  }

  // Getter de conveniencia para un fácil acceso a los controles del formulario
  get f() { return this.loginForm.controls; }

  onSubmit() {
    this.submitted = true;

    // Detenerse aquí si el formulario no es válido
    if (this.loginForm.invalid) {
      return;
    }

    // Verificar conectividad antes de intentar login
    if (!this.isOnline) {
      this.snackBar.open('⚠️ Sin conexión al servidor. Verifica tu internet.', 'Cerrar', {
        duration: 5000,
        panelClass: ['warning-snackbar']
      });
      return;
    }

    this.loading = true;
    this.error = '';

    this.authService.login(this.f['email'].value, this.f['password'].value)
      .pipe(first())
      .subscribe({
        next: () => {
          // Mostrar mensaje de éxito
          this.snackBar.open('Inicio de sesión exitoso', 'Cerrar', {
            duration: 3000,
            panelClass: ['success-snackbar']
          });
          
          // Navegar a la URL de retorno o a la página de inicio
          this.router.navigateByUrl(this.returnUrl);
        },
        error: error => {
          this.loading = false;
          
          // Manejar diferentes tipos de errores
          let errorMessage = 'Error en el inicio de sesión.';
          let errorType = 'unknown';
          
          if (error.status === 0) {
            // Error de red
            errorMessage = 'No se pudo conectar al servidor. Verifica tu conexión a internet.';
            errorType = 'network';
          } else if (error.status === 401) {
            // Credenciales incorrectas
            errorMessage = 'Correo electrónico o contraseña incorrectos.';
            errorType = 'credentials';
          } else if (error.status === 403) {
            // Cuenta desactivada
            errorMessage = 'Tu cuenta ha sido desactivada. Contacta al administrador.';
            errorType = 'account_disabled';
          } else if (error.status === 429) {
            // Demasiados intentos
            errorMessage = 'Demasiados intentos de inicio de sesión. Espera unos minutos.';
            errorType = 'rate_limit';
          } else if (error.status >= 500) {
            // Error del servidor
            errorMessage = 'Error interno del servidor. Intenta nuevamente en unos minutos.';
            errorType = 'server_error';
          } else if (error.name === 'TimeoutError') {
            // Timeout
            errorMessage = 'La petición tardó demasiado. Verifica tu conexión.';
            errorType = 'timeout';
          } else {
            // Error genérico
            errorMessage = error.error?.message || 'Error en el inicio de sesión. Verifica tus credenciales.';
            errorType = 'generic';
          }
          
          this.error = errorMessage;
          
          // Mostrar mensaje de error con clase específica
          this.snackBar.open(errorMessage, 'Cerrar', {
            duration: errorType === 'rate_limit' ? 10000 : 5000,
            panelClass: [`error-snackbar-${errorType}`]
          });
          
          // Log para debugging
          console.error('🔐 Error de login:', {
            type: errorType,
            status: error.status,
            message: errorMessage,
            originalError: error
          });
        }
      });
  }
}
