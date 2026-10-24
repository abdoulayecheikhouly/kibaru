import { Reveal } from '../../motion';
import { Component, inject, signal, effect, input, OnInit, OnDestroy } from '@angular/core';
import { BreakpointObserver } from '@angular/cdk/layout';
import { toSignal } from '@angular/core/rxjs-interop';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { Subscription } from 'rxjs';
import { Store, money, message } from '../../store';
import type { Category, Page, Product } from '../../models';
import { ProductCard } from '../../components/product-card/product-card';
import { ProductCardSkeleton } from '../../components/product-card-skeleton/product-card-skeleton';
import { Pagination } from '../../pagination';
@Component({
  selector: 'app-catalogue',
  imports: [FormsModule, Pagination, ProductCard, ProductCardSkeleton, Reveal],
  templateUrl: './catalogue.html',
})
export class Catalogue implements OnInit, OnDestroy {
  embedded = input(false);
  wideFilters = toSignal(inject(BreakpointObserver).observe('(min-width: 1024px)'));
  store = inject(Store);
  route = inject(ActivatedRoute);
  router = inject(Router);
  money = money;
  data = signal<Page<Product> | null>(null);
  cats = signal<Category[]>([]);
  error = signal('');
  loading = signal(false);
  notice = signal('');
  sub?: Subscription;
  request = 0;
  filter = { q: '', category: '', min: '', max: '', available: false, sort: 'selection' };
  constructor(){effect(()=>{this.store.currency();void this.load(this.route.snapshot.queryParams);});}
  ngOnInit() {
    this.store
      .get<Category[]>('/categories')
      .then((v) => this.cats.set(v))
      .catch((e) => this.error.set(message(e)));
    this.sub = this.route.queryParamMap.subscribe((q) => {
      this.filter = {
        q: q.get('q') || '',
        category: q.get('category') || '',
        min: q.get('min') || '',
        max: q.get('max') || '',
        available: q.get('available') === 'true',
        sort: q.get('sort') || 'selection',
      };
      void this.load(q.keys.reduce((r, k) => ({ ...r, [k]: q.get(k) }), {}));
    });
  }
  ngOnDestroy() {
    this.sub?.unsubscribe();
    this.request++;
  }
  async load(params: Record<string, string | null>) {
    const request = ++this.request;
    this.loading.set(true);
    this.error.set('');
    try {
      const query = new URLSearchParams({currency:this.store.currency()});
      for (const [k, v] of Object.entries(params)) if (v && k !== 'currency') query.set(k, v);
      const d = await this.store.get<Page<Product>>('/products?' + query);
      if (request === this.request) this.data.set(d);
    } catch (e) {
      if (request === this.request) this.error.set(message(e));
    } finally {
      if (request === this.request) this.loading.set(false);
    }
  }
  apply() {
    const p: Record<string, string> = {};
    for (const [key, value] of Object.entries(this.filter)) if (value) p[key] = String(value);
    void this.router.navigate([], { queryParams: p });
  }
  reset() {
    void this.router.navigate([], { queryParams: {} });
  }
  page(n: number) {
    void this.router.navigate([], { queryParams: { page: n }, queryParamsHandling: 'merge' });
  }
  add(p: Product) {
    void this.router.navigate(['/produits',p.id]);
    return;

  }
}
