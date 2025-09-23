import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';

// Componentes
import { LoginComponent  } from '../pages/login/login.component';
import { RegisterComponent } from '../pages/register/register.component';

// Servicios
import { AuthService } from '../services/auth.service';

// Guards
import { AuthGuard } from '../guards/auth.guard';
import { RoleGuard } from '../guards/role.guard';

// Interceptores
import { AuthInterceptor } from '../interceptors/auth.interceptor';
import { HTTP_INTERCEPTORS } from '@angular/common/http';

@NgModule({
  declarations: [
    LoginComponent,
    RegisterComponent
  ],
  imports: [
    CommonModule,
    ReactiveFormsModule,
    RouterModule.forChild([
      { path: 'login', component: LoginComponent },
      { path: 'register', component: RegisterComponent, canActivate: [AuthGuard, RoleGuard], data: { roles: ['admin'] } }
    ])
  ],
  providers: [
    AuthService,
    AuthGuard,
    RoleGuard,
    {
      provide: HTTP_INTERCEPTORS,
      useClass: AuthInterceptor,
      multi: true
    }
  ]
})
export class AuthModule { }
