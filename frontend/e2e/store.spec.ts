import {test,expect} from '@playwright/test';
const cats=['Femme','Homme','Enfant','Chaussures femme','Chaussures homme'].map((name,i)=>({id:i+1,name,slug:name,visible:true}));
test.beforeEach(async({page})=>{await page.route('**/api/**',async route=>{const u=new URL(route.request().url());let json:any={};if(u.pathname.endsWith('/session'))json={user:null};else if(u.pathname.endsWith('/categories'))json=cats;else if(u.pathname.endsWith('/settings'))json={store_name:'KIBARU',tagline:'La mode se partage.',announcement:'Femme · Homme · Enfant',logo:'/assets/emblem.svg',whatsapp:'221776722701',phone:'+221776722701',about:'Kibaru',address:'Sénégal'};else if(u.pathname.endsWith('/products'))json={items:[],total:0,page:1,pages:0,limit:12};await route.fulfill({json});});});
test('responsive family shop and category navigation',async({page})=>{for(const width of[320,390,768,1440]){await page.setViewportSize({width,height:900});await page.goto('/');await expect(page.getByRole('heading',{name:'Du style. Pour toute la famille.'})).toBeVisible();expect(await page.evaluate(()=>document.documentElement.scrollWidth)).toBeLessThanOrEqual(width);await expect(page.locator('.universe-card')).toHaveCount(5);await page.screenshot({path:'../../../outputs/Kibaru-'+width+'.png',fullPage:true});}await page.locator('.universe-card').first().click();await expect(page).toHaveURL(/produits\?category=1/);});
test('search, guest checkout and admin protection',async({page})=>{await page.goto('/');await page.getByRole('searchbox').fill('robe');await page.getByRole('button',{name:'Lancer la recherche'}).click();await expect(page).toHaveURL(/produits\?q=robe/);await page.goto('/commande');await expect(page).toHaveURL(/commande/);await page.goto('/admin');await expect(page).toHaveURL(/connexion/);});
test('installable PWA assets',async({request})=>{const m=await request.get('/manifest.webmanifest');expect((await m.json()).name).toBe('Kibaru');for(const file of ['/ngsw.json','/ngsw-worker.js','/icons/icon-192.png','/icons/icon-512.png','/icons/maskable-512.png'])expect((await request.get(file)).ok()).toBeTruthy();});

test('guest checkout requires details and prepares the correct WhatsApp order',async({page})=>{
 await page.addInitScript(()=>localStorage.setItem('kibaru_cart',JSON.stringify([{product_id:1,variant_id:10,quantity:2}])));
 const item={product_id:1,variant_id:10,name:'Robe test',sku:'R-M',variant_label:'M · Corail',quantity:2,unit_price:12500,image:'/assets/femme.png',stock:3};
 await page.route('**/api/cart/quote',r=>r.fulfill({json:{items:[item],total:25000,currency:'XOF'}}));
 let sent:any;
 await page.route('**/api/guest-orders',async r=>{sent=r.request().postDataJSON();await r.fulfill({json:{order:{id:'KIB-TEST',total:25000,currency:'XOF'},whatsapp_url:'https://wa.me/221776722701?text=Commande%20KIB-TEST'}});});
 await page.route('https://wa.me/**',r=>r.fulfill({contentType:'text/html',body:'<h1>WhatsApp simulé</h1>'}));
 await page.goto('/commande');
 await expect(page.getByRole('heading',{name:'Vos coordonnées'})).toBeVisible();
 await page.getByRole('button',{name:'Continuer sur WhatsApp ↗'}).click();expect(sent).toBeUndefined();
 await page.locator('input[name="name"]').fill('Amina Test');await page.locator('input[name="phone"]').fill('+221770000001');
 await page.getByRole('button',{name:'Continuer sur WhatsApp ↗'}).click();
 await expect(page).toHaveURL(/wa.me\/221776722701/);expect(sent.customer_name).toBe('Amina Test');expect(sent.currency).toBe('XOF');expect(sent.expected_total).toBe(25000);expect(sent.items[0].variant_id).toBe(10);
});
