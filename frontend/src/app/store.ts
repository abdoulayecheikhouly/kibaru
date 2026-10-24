import { inject, Injectable, signal, computed } from '@angular/core';
import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import { defaultSettings, SiteSettings } from './site-settings';
import type { Category, User, CartItem } from './models';
export type Currency='MAD'|'XOF';
function savedCurrency():Currency{return 'XOF';}
const selectedCurrency=signal<Currency>(savedCurrency());
export const money=(n:number,currency:Currency=selectedCurrency())=>new Intl.NumberFormat('fr-FR',{style:'currency',currency,maximumFractionDigits:currency==='MAD'?2:0}).format(n);
export const message = (e: unknown) =>
  e instanceof HttpErrorResponse
    ? e.error?.error || 'Le serveur est indisponible. Réessayez.'
    : (e as Error).message;
@Injectable({ providedIn: 'root' })
export class Store {
  currency=selectedCurrency;
  setCurrency(value:string){if(value!=='MAD'&&value!=='XOF')return;this.currency.set(value);try{localStorage.setItem('kibaru_currency',value);}catch{}}
  price(p:{price_mad:number;price_xof:number}){return this.currency()==='MAD'?p.price_mad:p.price_xof;}

  exchange = signal<{automatic:boolean;rate?:number;updated_at?:string}>({automatic:false});
  settings = signal<SiteSettings>({ ...defaultSettings });
  categories = signal<Category[]>([]);
  constructor() {
    void this.refreshContent();
    void this.get<{automatic:boolean;rate?:number;updated_at?:string}>('/currency').then(v=>this.exchange.set(v)).catch(()=>{});
  }
  async refreshContent() {
    try {
      const [settings, categories] = await Promise.all([
        this.get<SiteSettings>('/settings'),
        this.get<Category[]>('/categories'),
      ]);
      this.settings.set(settings);
      this.categories.set(categories);
    } catch {
      /* Static brand defaults remain available offline. */
    }
  }
  telephone(value: string) {
    return 'tel:' + value.replace(/[^+0-9]/g, '');
  }
  get whatsapp() {
    return 'https://wa.me/' + this.settings()['whatsapp'];
  }
  get maps() {
    const s = this.settings();
    return (
      'https://www.google.com/maps/search/?api=1&query=' +
      encodeURIComponent(
        s['latitude'] && s['longitude'] ? s['latitude'] + ',' + s['longitude'] : s['address'],
      )
    );
  }
  async updateLocation() {
    if (!navigator.geolocation)
      throw Error(
        'Localisation indisponible sur cet appareil. Saisissez les coordonnées dans les réglages.',
      );
    const position = await new Promise<GeolocationPosition>((resolve, reject) =>
      navigator.geolocation.getCurrentPosition(
        resolve,
        (error) =>
          reject(
            Error(
              error.code === 1
                ? 'Autorisez la localisation dans le navigateur, ou saisissez les coordonnées dans les réglages.'
                : 'Position indisponible. Réessayez depuis la boutique.',
            ),
          ),
        { enableHighAccuracy: true, timeout: 20000, maximumAge: 0 },
      ),
    );
    const result = await this.send<SiteSettings>('PUT', '/admin/settings', {
      latitude: position.coords.latitude.toFixed(6),
      longitude: position.coords.longitude.toFixed(6),
    });
    this.settings.set(result);
    return result;
  }

  http = inject(HttpClient);
  user = signal<User | null>(null);
  error = signal('');
  cart = signal<CartItem[]>(this.readCart());
  count = computed(() => this.cart().reduce((s, i) => s + i.quantity, 0));
  ready = this.refresh();
  async refresh() {
    try {
      const s = await this.get<{ user: User | null }>('/session');
      this.user.set(s.user);
      this.error.set('');
    } catch (e) {
      this.error.set(message(e));
    }
  }
  get<T>(path: string) {
    return firstValueFrom(this.http.get<T>('/api' + path));
  }
  async send<T>(method: string, path: string, body?: unknown, headers?: Record<string, string>) {
    await this.ready;
    return firstValueFrom(this.http.request<T>(method, '/api' + path, { body, headers }));
  }
  async authenticate(path: string, data: unknown) {
    const s = await this.send<{ user: User }>('POST', path, data);
    this.user.set(s.user);
    await this.refresh();
  }
  async logout() {
    await this.send('POST', '/auth/logout');
    this.user.set(null);
    await this.refresh();
  }
  readCart(): CartItem[] {
    try {
      const v = JSON.parse(localStorage.getItem('kibaru_cart') || '[]');
      return Array.isArray(v)
        ? v
            .filter(
              (i) =>
                Number.isSafeInteger(i.variant_id) && i.variant_id>0 && Number.isSafeInteger(i.product_id) &&
                i.product_id > 0 &&
                Number.isInteger(i.quantity) &&
                i.quantity > 0 &&
                i.quantity <= 100,
            )
            .slice(0, 50)
        : [];
    } catch {
      return [];
    }
  }
  persist(cart: CartItem[]) {
    this.cart.set(cart);
    try {
      localStorage.setItem('kibaru_cart', JSON.stringify(cart));
    } catch {}
  }
  add(productId:number,variantId:number,n=1){
    const old=this.cart();if(!old.some(i=>i.variant_id===variantId)&&old.length>=50)throw Error('Le panier est limité à 50 variantes');
    this.persist(old.some(i=>i.variant_id===variantId)?old.map(i=>i.variant_id===variantId?{...i,quantity:Math.min(100,i.quantity+n)}:i):[...old,{product_id:productId,variant_id:variantId,quantity:Math.min(100,n)}]);
  }
  quantity(variantId:number,n:number){if(!Number.isInteger(n))return;this.persist(n<=0?this.cart().filter(i=>i.variant_id!==variantId):this.cart().map(i=>i.variant_id===variantId?{...i,quantity:Math.min(100,n)}:i));}
  clear() {
    this.persist([]);
  }
}
