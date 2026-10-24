import { Component, inject, signal, effect, OnDestroy } from '@angular/core';
import { RouterOutlet, Router } from '@angular/router';
import { SiteHeader } from './components/site-header/site-header';
import { SiteFooter } from './components/site-footer/site-footer';
import { MatMenuModule } from '@angular/material/menu';
import { MatButtonModule } from '@angular/material/button';
import { SwUpdate } from '@angular/service-worker';
import { Store, message } from './store';

type InstallPrompt = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: string }>;
};
@Component({
  imports: [RouterOutlet, MatMenuModule, MatButtonModule, SiteHeader, SiteFooter],
  selector: 'app-root',
  styleUrl: './app.css',
  templateUrl: './app.html',
})
export class App implements OnDestroy {
  online = signal(navigator.onLine);
  installPrompt = signal<InstallPrompt | null>(null);
  updateReady = signal(false);
  private connectionChanged = () => this.online.set(navigator.onLine);
  private beforeInstall = (event: Event) => {
    event.preventDefault();
    this.installPrompt.set(event as InstallPrompt);
  };
  private installed = () => this.installPrompt.set(null);
  constructor() {
    effect(() => {
      const settings = this.store.settings();
      document.title = settings['store_name'] + ' · ' + settings['tagline'];
      document
        .querySelector('meta[name="description"]')
        ?.setAttribute('content', settings['about']);
      document.querySelector('link[rel="icon"]')?.setAttribute('href', settings['logo']);
    });
    window.addEventListener('online', this.connectionChanged);
    window.addEventListener('offline', this.connectionChanged);
    window.addEventListener('beforeinstallprompt', this.beforeInstall);
    window.addEventListener('appinstalled', this.installed);
    const updates = inject(SwUpdate);
    if (updates.isEnabled)
      updates.versionUpdates.subscribe((e) => {
        if (e.type === 'VERSION_READY') this.updateReady.set(true);
      });
  }
  ngOnDestroy() {
    window.removeEventListener('online', this.connectionChanged);
    window.removeEventListener('offline', this.connectionChanged);
    window.removeEventListener('beforeinstallprompt', this.beforeInstall);
    window.removeEventListener('appinstalled', this.installed);
  }
  async install() {
    const prompt = this.installPrompt();
    if (prompt) {
      await prompt.prompt();
      await prompt.userChoice;
      this.installPrompt.set(null);
    }
  }
  refresh() {
    location.reload();
  }

  store = inject(Store);
  router = inject(Router);
  async logout() {
    try {
      await this.store.logout();
      await this.router.navigateByUrl('/');
    } catch (e) {
      this.store.error.set(message(e));
    }
  }
}
