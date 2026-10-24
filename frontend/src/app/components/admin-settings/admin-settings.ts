import { Component, inject, signal, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Store, message } from '../../store';
import { defaultSettings, SiteSettings } from '../../site-settings';
@Component({
  selector: 'app-admin-settings',
  imports: [FormsModule],
  templateUrl: './admin-settings.html',
  styleUrl: './admin-settings.css',
})
export class AdminSettings implements OnInit {
  store = inject(Store);
  values: SiteSettings = { ...defaultSettings };
  error = signal('');
  notice = signal('');
  busy = signal(false);
  loaded = signal(false);
  locating = signal(false);
  socials = [
    ['instagram', 'Instagram'],
    ['facebook', 'Facebook'],
    ['youtube', 'YouTube'],
    ['tiktok', 'TikTok'],
    ['linkedin', 'LinkedIn'],
  ];
  async ngOnInit() {
    try {
      this.values = { ...(await this.store.get<SiteSettings>('/admin/settings')) };
      this.loaded.set(true);
    } catch (e) {
      this.error.set(message(e));
    }
  }
  async save() {
    this.busy.set(true);
    this.error.set('');
    this.notice.set('');
    try {
      const result = await this.store.send<SiteSettings>('PUT', '/admin/settings', this.values);
      this.store.settings.set(result);
      this.values = { ...result };
      this.notice.set('Les informations du site ont été mises à jour.');
    } catch (e) {
      this.error.set(message(e));
    } finally {
      this.busy.set(false);
    }
  }
  async gps() {
    this.locating.set(true);
    this.error.set('');
    this.notice.set('');
    try {
      const result = await this.store.updateLocation();
      this.values = {
        ...this.values,
        latitude: result['latitude'],
        longitude: result['longitude'],
      };
      this.notice.set('La position GPS de la boutique a été enregistrée sur le site.');
    } catch (e) {
      this.error.set(message(e));
    } finally {
      this.locating.set(false);
    }
  }
  async logo(event: Event) {
    const field = event.target as HTMLInputElement,
      file = field.files?.[0];
    if (!file) return;
    this.busy.set(true);
    this.error.set('');
    try {
      if (file.size > 5 * 1024 * 1024) throw Error('Logo : 5 Mo maximum.');
      const data = new FormData();
      data.append('file', file);
      const result = await this.store.send<{ image: string }>('POST', '/admin/uploads', data);
      this.values['logo'] = result.image;
      this.notice.set('Logo chargé. Enregistrez les informations pour le publier.');
    } catch (e) {
      this.error.set(message(e));
    } finally {
      field.value = '';
      this.busy.set(false);
    }
  }
}
