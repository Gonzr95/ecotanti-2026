import { Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { NonNullableFormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';

// Optimus UI & Icons (según .gemini/optimus_ui_guidelines.md)
import { Button } from '@openng/optimus-ui/button';
import { InputText } from '@openng/optimus-ui/inputtext';
import { IconField } from '@openng/optimus-ui/iconfield';
import { InputIcon } from '@openng/optimus-ui/inputicon';
import { PasswordModule } from '@openng/optimus-ui/password';
import { ToastModule } from '@openng/optimus-ui/toast';
import { MessageService } from '@openng/optimus-ui/api';

// Shared Auth
import { AuthService } from '@ecotanti/shared-auth';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    RouterLink,
    Button,
    InputText,
    IconField,
    InputIcon,
    PasswordModule,
    ToastModule,
  ],
  providers: [MessageService],
  templateUrl: './login.html',
  styleUrl: './login.css',
})
export class LoginComponent {
  private readonly fb = inject(NonNullableFormBuilder);
  private readonly authService = inject(AuthService);
  private readonly messageService = inject(MessageService);
  private readonly router = inject(Router);

  // Estado reactivo con Signals
  readonly loading = signal<boolean>(false);
  readonly errorMessage = signal<string | null>(null);

  // Formulario reactivo tipado
  readonly loginForm = this.fb.group({
    email: ['', [Validators.required, Validators.email]],
    password: ['', [Validators.required, Validators.minLength(6)]],
  });

  // Getters de conveniencia para validación en template
  get emailControl() {
    return this.loginForm.controls.email;
  }

  get passwordControl() {
    return this.loginForm.controls.password;
  }

  async onSubmit(): Promise<void> {
    if (this.loginForm.invalid) {
      this.loginForm.markAllAsTouched();
      return;
    }

    this.loading.set(true);
    this.errorMessage.set(null);

    const { email, password } = this.loginForm.getRawValue();
    const result = await this.authService.loginStaff(email, password);
    this.loading.set(false);

    if (result.success) {
      this.messageService.add({
        severity: 'success',
        summary: 'Acceso Autorizado',
        detail: 'Iniciando sesión en el panel...',
      });
      await this.router.navigate(['/home']);
    } else {
      const err = result.error || 'Credenciales incorrectas';
      this.errorMessage.set(err);
      this.messageService.add({
        severity: 'error',
        summary: 'Acceso Denegado',
        detail: err,
      });
    }
  }
}
