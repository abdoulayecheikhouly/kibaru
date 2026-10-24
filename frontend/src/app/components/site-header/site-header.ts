import { BasketPulse } from '../../motion';
import { Component, inject } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { MatMenuModule } from '@angular/material/menu';
import { MatButtonModule } from '@angular/material/button';
import { FormsModule } from '@angular/forms';
import { Store } from '../../store';
@Component({
  selector: 'app-site-header',
  imports: [RouterLink, MatMenuModule, MatButtonModule, BasketPulse, FormsModule],
  templateUrl: './site-header.html',
  styleUrl: './site-header.css',
})
export class SiteHeader {
  store = inject(Store);
  router = inject(Router);
  search = '';
  submit(event: Event) {
    event.preventDefault();
    void this.router.navigate(['/produits'], {
      queryParams: this.search.trim() ? { q: this.search.trim() } : {},
    });
  }
}
