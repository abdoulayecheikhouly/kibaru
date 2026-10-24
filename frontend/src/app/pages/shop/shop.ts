import { Component, inject, signal, effect, OnInit } from '@angular/core';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { ProductZoom } from '../../components/product-zoom';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { Store, money, message } from '../../store';
import type { Product, Quote, Order, Page } from '../../models';
import { CartItem } from '../../components/cart-item/cart-item';
import { Pagination } from '../../pagination';
@Component({
  selector: 'app-shop',
  imports: [FormsModule, RouterLink, Pagination, CartItem, MatDialogModule],
  templateUrl: './shop.html',
})
export class Shop implements OnInit {
  store = inject(Store);
  route = inject(ActivatedRoute);
  router = inject(Router);
  view = signal('');
  product = signal<Product | null>(null);
  quote = signal<Quote | null>(null);
  orders = signal<Page<Order> | null>(null);
  error = signal('');
  busy = signal(false);
  result = signal<{ order: Order; whatsapp_url: string } | null>(null);
  money = money;
  selectedImage = signal('');
  ratingBusy = signal(false);
  ratingNotice = signal('');
  rating = 0;
  dialog = inject(MatDialog);
  zoom() {
    const p = this.product();
    if (p)
      this.dialog.open(ProductZoom, {
        data: {
          images: p.images?.length ? p.images : [p.image],
          name: p.name,
          selected: this.selectedImage() || p.image,
        },
        maxWidth: '96vw',
        width: '1000px',
        autoFocus: 'first-tabbable',
      });
  }
  async rate() {
    const p = this.product();
    if (!p || !this.rating) return;
    this.ratingBusy.set(true);
    this.error.set('');
    this.ratingNotice.set('');
    try {
      const summary = await this.store.send<{ rating_average: number; rating_count: number }>(
        'POST',
        '/products/' + p.id + '/ratings',
        { score: Number(this.rating) },
      );
      this.product.set({ ...p, ...summary });
      this.ratingNotice.set('Merci, votre note a été enregistrée.');
    } catch (e) {
      this.error.set(message(e));
    } finally {
      this.ratingBusy.set(false);
    }
  }
  average(n: number | undefined) {
    return Number(n || 0).toLocaleString('fr-FR', { maximumFractionDigits: 1 });
  }
  variantId=0;
  detailOrder=signal<Order|null>(null);
  deliveryMethod='pickup';address='';
  get variant(){return this.product()?.variants?.find(v=>v.id===Number(this.variantId));}
  variantLabel(v:{size:string;color:string;capacity:string;sku:string}){return [v.size,v.color,v.capacity].filter(Boolean).join(' · ')||v.sku;}
  qty = 1;
  page = 1;
  name = '';
  phone = '';
  note = '';
  key = crypto.randomUUID();
  request = 0;
  get maps() {
    return this.store.maps;
  }
  constructor() {
    effect(() => {
      const items = this.store.cart();
      const currency=this.store.currency();
      const v = this.view();
      if (v === 'cart' || v === 'checkout') {
        const seq = ++this.request;
        this.quote.set(null);
        if (!items.length) return;
        this.store
          .send<Quote>('POST', '/cart/quote', { items,currency })
          .then((q) => {
            if (seq === this.request) this.quote.set(q);
          })
          .catch((e) => {
            if (seq === this.request) this.error.set(message(e));
          });
      }
    });
  }
  ngOnInit() {
    this.view.set(this.route.snapshot.data['view']);
    this.name = this.store.user()?.name || '';
    this.phone = this.store.user()?.phone || '';
    if (this.view() === 'product')
      this.store
        .get<Product>('/products/' + this.route.snapshot.paramMap.get('id'))
        .then((p) => {this.product.set(p);this.variantId=p.variants?.find(v=>v.stock>0)?.id||p.variants?.[0]?.id||0;})
        .catch((e) => this.error.set(message(e)));
    if(this.view()==='order')this.store.get<Order>('/orders/'+this.route.snapshot.paramMap.get('id')).then(o=>this.detailOrder.set(o)).catch(e=>this.error.set(message(e)));
    if (this.view() === 'account') void this.loadOrders();
  }
  add() {
    const p = this.product();
    if (p && Number.isInteger(this.qty) && this.qty > 0 && this.qty <= Math.min(100, this.variant?.stock||0)) {
      this.store.add(p.id,this.variantId,this.qty);
      void this.router.navigateByUrl('/panier');
    }
  }
  quantity(id: number, n: number) {
    this.error.set('');
    this.store.quantity(id, n);
  }
  async order() {
    const quote = this.quote();
    if (!quote) return;
    this.error.set('');
    this.busy.set(true);
    try {
      const r = await this.store.send<{ order: Order; whatsapp_url: string }>(
        'POST',
        this.store.user() ? '/orders' : '/guest-orders',
        {
          items: this.store.cart(),
          customer_name: this.name,
          phone: this.phone,
          note: this.note,
          expected_total: quote.total,
          currency:quote.currency,delivery_method:this.deliveryMethod,address:this.address,
        },
        { 'Idempotency-Key': this.key },
      );
      this.result.set(r);
      this.store.clear();
      window.location.assign(r.whatsapp_url);
    } catch (e) {
      this.error.set(message(e));
    } finally {
      this.busy.set(false);
    }
  }
  async loadOrders(page = 1) {
    this.page = page;
    try {
      this.orders.set(await this.store.get<Page<Order>>('/orders?page=' + page));
    } catch (e) {
      this.error.set(message(e));
    }
  }
  status(s: string) {
    return (
      (
        {
          awaiting_confirmation: 'À confirmer avec la boutique',
          confirmed: 'Confirmée par la boutique',
          preparing:'En préparation',shipped:'Expédiée',delivered:'Livrée',
          cancelled: 'Annulée',
        } as Record<string, string>
      )[s] || s
    );
  }
}
