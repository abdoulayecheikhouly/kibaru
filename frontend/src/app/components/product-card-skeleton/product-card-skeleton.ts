import { Component } from '@angular/core';
@Component({
  selector: 'app-product-card-skeleton',
  template:
    '<div aria-hidden="true" class="skeleton-card"><div class="skeleton-photo"></div><div class="skeleton-line"></div><div class="skeleton-line short"></div></div>',
  styleUrl: './product-card-skeleton.css',
})
export class ProductCardSkeleton {}
