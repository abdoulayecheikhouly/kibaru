import { Component, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { Store } from '../../store';
@Component({
  selector: 'app-site-footer',
  imports: [RouterLink],
  templateUrl: './site-footer.html',
  styleUrl: './site-footer.css',
})
export class SiteFooter {
  store = inject(Store);
  socials = [
    ['instagram', 'Instagram', '◎'],
    ['facebook', 'Facebook', 'f'],
    ['youtube', 'YouTube', '▶'],
    ['tiktok', 'TikTok', '♪'],
    ['linkedin', 'LinkedIn', 'in'],
  ];
  year = new Date().getFullYear();
}
