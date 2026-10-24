import { Component, inject, signal, OnInit } from '@angular/core';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { FormsModule } from '@angular/forms';
import { RouterLink, ActivatedRoute, Router } from '@angular/router';
import { Store, message } from '../../store';
@Component({
  selector: 'app-auth',
  imports: [FormsModule, RouterLink, MatFormFieldModule, MatInputModule, MatButtonModule],
  templateUrl: './auth.html',
})
export class Auth implements OnInit {
  store = inject(Store);
  route = inject(ActivatedRoute);
  router = inject(Router);
  signup = false;
  admin = false;
  hidePassword = true;
  name = '';
  phone = '';
  email = '';
  password = '';
  error = signal('');
  busy = signal(false);
  target = '/produits';
  ngOnInit() {
    this.signup = !!this.route.snapshot.data['signup'];
    this.admin = this.route.snapshot.queryParamMap.get('admin') === 'true';
    const t = this.route.snapshot.queryParamMap.get('retour') || '/produits';
    this.target = t.startsWith('/') && !t.startsWith('//') ? t : '/produits';
    if(this.target==='/admin')this.admin=true;
    if (this.store.user()?.role === 'customer' && this.target === '/admin')
      this.error.set('Cet espace est réservé à l’équipe. Utilisez vos accès administrateur.');
  }
  async submit() {
    this.busy.set(true);
    this.error.set('');
    try {
      await this.store.ready;
      const data: Record<string, unknown> = { email: this.email, password: this.password };
      if (this.signup) {
        data['name'] = this.name;
        data['phone'] = this.phone;
      }
      await this.store.authenticate(this.signup ? '/auth/register' : '/auth/login', data);
      if (this.target === '/admin' && this.store.user()?.role !== 'admin') {
        this.error.set('Accès administrateur requis');
        return;
      }
      await this.router.navigateByUrl(this.target);
    } catch (e) {
      this.error.set(message(e));
    } finally {
      this.busy.set(false);
    }
  }
}
