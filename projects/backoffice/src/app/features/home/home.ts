import { Component, inject, OnInit, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { AuthService } from '@ecotanti/shared-auth';

@Component({
  selector: 'app-home',
  standalone: true,
  imports: [RouterLink],
  templateUrl: './home.html',
})
export class HomeComponent implements OnInit {
  private readonly authService = inject(AuthService);

  readonly userEmail = signal<string | null>(null);

  async ngOnInit(): Promise<void> {
    const user = await this.authService.getCurrentUser();
    this.userEmail.set(user?.email ?? null);
  }
}
