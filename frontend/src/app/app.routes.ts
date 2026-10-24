import { inject } from '@angular/core';
import { Routes, CanActivateFn, Router } from '@angular/router';
import { Store } from './store';
const admin: CanActivateFn = async () => {
  const s = inject(Store),
    router = inject(Router);
  await s.ready;
  return s.user()?.role === 'admin'
    ? true
    : router.createUrlTree(['/connexion'], { queryParams: { retour: '/admin', admin: 'true' } });
};
const customer:CanActivateFn=async()=>{const s=inject(Store),router=inject(Router);await s.ready;return s.user()?true:router.createUrlTree(['/connexion'],{queryParams:{retour:router.getCurrentNavigation()?.extractedUrl.toString()||'/compte'}});};
const shop = () => import('./pages/shop/shop').then((m) => m.Shop);
export const routes: Routes = [
  { path: '', loadComponent: () => import('./pages/home/home').then((m) => m.Home) },
  {
    path: 'produits',
    loadComponent: () => import('./pages/catalogue/catalogue').then((m) => m.Catalogue),
  },
  { path: 'produits/:id', loadComponent: shop, data: { view: 'product' } },
  { path: 'panier', loadComponent: shop, data: { view: 'cart' } },
  { path: 'commande', loadComponent: shop, data: { view: 'checkout' } },
  { path: 'boutique', loadComponent: shop, data: { view: 'location' } },
  { path: 'connexion', loadComponent: () => import('./pages/auth/auth').then((m) => m.Auth) },
  {
    path: 'admin',
    loadComponent: () => import('./pages/admin/admin').then((m) => m.Admin),
    canActivate: [admin],
  },
  { path: 'compte',loadComponent:shop,canActivate:[customer],data:{view:'account'} },
  {path:'commandes/:id',loadComponent:shop,canActivate:[customer],data:{view:'order'}},
  {path:'inscription',loadComponent:()=>import('./pages/auth/auth').then(m=>m.Auth),data:{signup:true}},
  {path:'mot-de-passe-oublie',loadComponent:()=>import('./pages/auth/password').then(m=>m.Password),data:{reset:false}},
  {path:'reinitialiser',loadComponent:()=>import('./pages/auth/password').then(m=>m.Password),data:{reset:true}},
  { path: '**', redirectTo: '' },
];
