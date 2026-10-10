import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Button } from '@openng/optimus-ui/button';

@Component({
  selector: 'app-brands',
  standalone: true,
  imports: [CommonModule, Button],
  templateUrl: './brands.html',
})
export class BrandsComponent {}

