import { Component, inject, InjectionToken, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { NonNullableFormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';

// Injection token para configurar la demora visual antes de redirigir (testable)
export const REDIRECT_DELAY_MS = new InjectionToken<number>('REDIRECT_DELAY_MS', {
  factory: () => 1200,
});

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
  private readonly redirectDelayMs = inject(REDIRECT_DELAY_MS, { optional: true }) ?? 1200;

  // Estado reactivo con Signals
  readonly loading = signal<boolean>(false);
  readonly isRedirecting = signal<boolean>(false);
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

    if (result.success) {
      // Activar overlay de transición con blur y spinner en primer plano
      this.isRedirecting.set(true);

      // Breve pausa deliberada para percibir la carga del panel
      if (this.redirectDelayMs > 0) {
        await new Promise((resolve) => setTimeout(resolve, this.redirectDelayMs));
      }

      await this.router.navigate(['/home']);
      this.loading.set(false);
      this.isRedirecting.set(false);
    } else {
      this.loading.set(false);
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
