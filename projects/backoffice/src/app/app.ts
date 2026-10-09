import { Component, signal } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { ButtonModule } from '@openng/optimus-ui/button';
import { CardModule } from '@openng/optimus-ui/card';
import { TagModule } from '@openng/optimus-ui/tag';

@Component({
  imports: [RouterOutlet, ButtonModule, CardModule, TagModule],
  selector: 'app-root',
  styleUrl: './app.css',
  templateUrl: './app.html',
})
export class App {
  protected readonly title = signal('EcoTanti Backoffice');
}
