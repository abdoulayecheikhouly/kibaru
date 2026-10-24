import { Component, inject, signal, OnInit, output } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Store, money, message } from '../../store';
interface Analytics {
  from: string;
  to: string;
  period: string;
  summary: { orders: number; revenue: number };
  units_sold: number;
  top_products: { product_id: number; name: string; quantity: number; revenue: number }[];
  inventory: { products: number; units: number; out_of_stock: number; low_stock: number };
}
@Component({
  selector: 'app-admin-dashboard',
  imports: [FormsModule],
  templateUrl: './admin-dashboard.html',
  styleUrl: './admin-dashboard.css',
})
export class AdminDashboard implements OnInit {
  store = inject(Store);
  data = signal<Analytics | null>(null);
  error = signal('');
  loading = signal(false);
  navigate = output<string>();
  period = 'month';
  currency:'MAD'|'XOF'='XOF';
  month = new Date().toISOString().slice(0, 7);
  week = '';
  locating = signal(false);
  notice = signal('');
  async gps() {
    this.locating.set(true);
    this.error.set('');
    this.notice.set('');
    try {
      await this.store.updateLocation();
      this.notice.set('La localisation GPS de la boutique a été mise à jour.');
    } catch (e) {
      this.error.set(message(e));
    } finally {
      this.locating.set(false);
    }
  }
  from = '';
  to = '';
  money=(n:number)=>money(n,this.currency);
  private request = 0;
  ngOnInit() {
    void this.load();
  }
  async load() {
    const request = ++this.request;
    this.loading.set(true);
    this.error.set('');
    try {
      const query = new URLSearchParams({ period: this.period,currency:this.currency });
      if (this.period === 'month') query.set('month', this.month);
      if (this.period === 'week' && this.week) query.set('week', this.week);
      if (this.period === 'range') {
        query.set('from', this.from);
        query.set('to', this.to);
      }
      const d = await this.store.get<Analytics>('/admin/analytics?' + query);
      if (request !== this.request) return;
      this.data.set(d);
      this.from = d.from;
      this.to = d.to;
    } catch (e) {
      if (request === this.request) this.error.set(message(e));
    } finally {
      if (request === this.request) this.loading.set(false);
    }
  }
  bar(quantity: number) {
    const max = Math.max(1, ...(this.data()?.top_products.map((p) => p.quantity) || []));
    return Math.max(3, (quantity / max) * 190);
  }
}
