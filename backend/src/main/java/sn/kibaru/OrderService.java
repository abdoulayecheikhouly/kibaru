package sn.kibaru;
import org.springframework.stereotype.Service;import org.springframework.transaction.annotation.Transactional;import org.springframework.jdbc.core.JdbcTemplate;
import java.util.*;import java.math.BigDecimal;import java.net.URLEncoder;import java.nio.charset.StandardCharsets;
import static sn.kibaru.CatalogService.*;
@Service public class OrderService {
 final JdbcTemplate db;final CatalogService catalog;final SettingsService settings;
 public OrderService(JdbcTemplate db,CatalogService catalog,SettingsService settings){this.db=db;this.catalog=catalog;this.settings=settings;}
 public Map<String,Object> quote(List<Requests.Item> items,String currency){
  if(!Set.of("MAD","XOF").contains(currency))throw new ApiException(400,"Devise invalide");
  var merged=new TreeMap<Long,Integer>();var products=new HashMap<Long,Long>();
  for(var i:items){if(products.putIfAbsent(i.variantId(),i.productId())!=null&&!products.get(i.variantId()).equals(i.productId()))throw new ApiException(400,"Variante incohérente");merged.merge(i.variantId(),i.quantity(),Integer::sum);}
  var result=new ArrayList<Map<String,Object>>();BigDecimal total=BigDecimal.ZERO;
  for(var e:merged.entrySet()){
   if(e.getValue()>100)throw new ApiException(400,"Quantité maximale dépassée");
   var rows=db.queryForList("SELECT p.*,v.id AS variant_id,v.sku AS variant_sku,v.size,v.color,v.capacity,v.stock AS variant_stock FROM product_variant v JOIN product p ON p.id=v.product_id JOIN category c ON c.id=p.category_id WHERE v.id=? AND p.id=? AND v.active=TRUE AND p.reference_only=FALSE AND p.status='published' AND c.visible=TRUE",e.getKey(),products.get(e.getKey()));
   if(rows.isEmpty())throw new ApiException(409,"Une variante n’est plus disponible");var p=rows.getFirst();if(num(p.get("variant_stock"))<e.getValue())throw new ApiException(409,"Stock insuffisant : "+p.get("name"));
   BigDecimal price=new BigDecimal(p.get(currency.equals("MAD")?"price_mad":"price_xof").toString());total=total.add(price.multiply(BigDecimal.valueOf(e.getValue())));
   var item=new LinkedHashMap<String,Object>();item.put("product_id",p.get("id"));item.put("variant_id",p.get("variant_id"));item.put("variant_label",label(p));item.put("name",p.get("name"));item.put("sku",p.get("variant_sku"));item.put("quantity",e.getValue());item.put("unit_price",price);item.put("image",p.get("image"));item.put("stock",p.get("variant_stock"));result.add(item);
  }
  return Map.of("items",result,"total",total,"currency",currency);
 }
 static String label(Map<String,Object> v){return java.util.stream.Stream.of("size","color","capacity").map(k->Objects.toString(v.get(k),"")).filter(s->!s.isBlank()).collect(java.util.stream.Collectors.joining(" · "));}
 Map<String,Object> view(Map<String,Object> order){var result=new LinkedHashMap<>(order);result.remove("idempotency_key");result.remove("guest_key");result.put("items",db.queryForList("SELECT product_id,variant_id,variant_label,name,sku,quantity,unit_price FROM order_item WHERE order_id=? ORDER BY id",order.get("id")));result.put("history",db.queryForList("SELECT status,created_at FROM order_event WHERE order_id=? ORDER BY id",order.get("id")));return result;}
 String link(Map<String,Object> order){var site=settings.get();String phone=site.get("whatsapp");if(phone==null||!phone.matches("[1-9][0-9]{7,14}"))throw new ApiException(503,"Le numéro de commande de la boutique est à configurer");
  var text=new StringBuilder("Bonjour Kibaru,\nCommande "+order.get("id")+"\n");for(var i:db.queryForList("SELECT * FROM order_item WHERE order_id=?",order.get("id")))text.append(i.get("quantity")).append(" × ").append(i.get("name")).append(" · ").append(i.get("variant_label")).append("\n");
  text.append("Total articles : ").append(order.get("total")).append(' ').append(order.get("currency")).append("\nNom : ").append(order.get("customer_name")).append("\nTéléphone : ").append(order.get("phone")).append("\nMode : ").append(order.get("delivery_method")).append("\nAdresse : ").append(order.get("address")).append("\nNote : ").append(order.get("note")).append("\nMerci de confirmer les disponibilités et les éventuels frais de livraison. Aucun paiement en ligne effectué.");return "https://wa.me/"+phone+"?text="+URLEncoder.encode(text.toString(),StandardCharsets.UTF_8);
 }
 @Transactional public Map<String,Object> create(String email,String key,Requests.Order p){
  try{if(!UUID.fromString(key).toString().equalsIgnoreCase(key))throw new IllegalArgumentException();}catch(Exception e){throw new ApiException(400,"Clé de commande invalide");}
  if(p.deliveryMethod().equals("delivery")&&clean(p.address()).isBlank())throw new ApiException(400,"Adresse de livraison obligatoire");
  Object owner=null;
  if(email==null){db.queryForObject("SELECT id FROM guest_order_guard WHERE id=1 FOR UPDATE",Integer.class);}else{owner=db.queryForMap("SELECT id FROM shop_user WHERE email=? FOR UPDATE",email).get("id");}
  var prior=email==null?db.queryForList("SELECT * FROM shop_order WHERE guest_key=?",key):db.queryForList("SELECT * FROM shop_order WHERE user_id=? AND idempotency_key=?",owner,key);
  if(!prior.isEmpty()){var old=prior.getFirst();return Map.of("order",view(old),"whatsapp_url",link(old));}
  var q=quote(p.items(),p.currency());if(((BigDecimal)q.get("total")).compareTo(p.expectedTotal())!=0)throw new ApiException(409,"Les prix ont changé. Actualisez votre panier.");
  String id="KIB-"+UUID.randomUUID().toString().toUpperCase(Locale.ROOT);
  db.update("INSERT INTO shop_order(id,user_id,customer_name,phone,note,total,idempotency_key,currency,address,delivery_method,guest_key) VALUES(?,?,?,?,?,?,?,?,?,?,?)",id,owner,p.customerName().trim(),p.phone().trim(),clean(p.note()),q.get("total"),key,p.currency(),clean(p.address()),p.deliveryMethod(),email==null?key:null);
  @SuppressWarnings("unchecked") var items=(List<Map<String,Object>>)q.get("items");for(var i:items)db.update("INSERT INTO order_item(order_id,product_id,variant_id,variant_label,name,sku,quantity,unit_price) VALUES(?,?,?,?,?,?,?,?)",id,i.get("product_id"),i.get("variant_id"),i.get("variant_label"),i.get("name"),i.get("sku"),i.get("quantity"),i.get("unit_price"));
  db.update("INSERT INTO order_event(order_id,status) VALUES(?,'awaiting_confirmation')",id);var order=db.queryForMap("SELECT * FROM shop_order WHERE id=?",id);return Map.of("order",view(order),"whatsapp_url",link(order));
 }
 public Object orders(String email,int page,int limit,boolean admin){String where=admin?"":" WHERE user_id=(SELECT id FROM shop_user WHERE email=?)";List<Object> args=admin?List.of():List.of(email);var result=new HashMap<>(catalog.list("SELECT * FROM shop_order"+where+" ORDER BY created_at DESC,id DESC","SELECT COUNT(*) FROM shop_order"+where,args,page,limit));@SuppressWarnings("unchecked") var rows=(List<Map<String,Object>>)result.get("items");result.put("items",rows.stream().map(this::view).toList());return result;}
 public Object detail(String email,String id){var rows=db.queryForList("SELECT * FROM shop_order WHERE id=? AND user_id=(SELECT id FROM shop_user WHERE email=?)",id,email);if(rows.isEmpty())throw new ApiException(404,"Commande introuvable");return view(rows.getFirst());}
 static boolean committed(String status){return Set.of("confirmed","preparing","shipped","delivered").contains(status);}
 @Transactional public Object status(String id,String next){
  var rows=db.queryForList("SELECT * FROM shop_order WHERE id=? FOR UPDATE",id);if(rows.isEmpty())throw new ApiException(404,"Commande introuvable");var order=rows.getFirst();String old=order.get("status").toString();if(old.equals(next))return view(order);
  Set<String> allowed=switch(old){case "awaiting_confirmation"->Set.of("confirmed","cancelled");case "confirmed"->Set.of("preparing","cancelled");case "preparing"->Set.of("shipped","cancelled");case "shipped"->Set.of("delivered");default->Set.of();};
  if(!allowed.contains(next))throw new ApiException(409,"Transition de commande impossible : "+old+" → "+next);
  var items=db.queryForList("SELECT * FROM order_item WHERE order_id=? ORDER BY product_id,variant_id",id);var productIds=new TreeSet<Long>();for(var i:items)productIds.add(num(i.get("product_id")));
  if(old.equals("awaiting_confirmation")&&next.equals("confirmed")||next.equals("cancelled")&&committed(old)){
   for(long productId:productIds)db.queryForObject("SELECT id FROM product WHERE id=? FOR UPDATE",Long.class,productId);
   for(var i:items){long variant=num(i.get("variant_id")),pid=num(i.get("product_id"));var v=db.queryForMap("SELECT stock,active FROM product_variant WHERE id=? FOR UPDATE",variant);long before=num(v.get("stock"));long change=num(i.get("quantity"))*(next.equals("cancelled")?1:-1);
    if(change<0&&(!Boolean.TRUE.equals(v.get("active"))||before+change<0))throw new ApiException(409,"Stock insuffisant ou variante retirée : "+i.get("name"));
    db.update("UPDATE product_variant SET stock=stock+? WHERE id=?",change,variant);db.update("INSERT INTO stock_movement(product_id,variant_id,previous_stock,new_stock,reason) VALUES(?,?,?,?,?)",pid,variant,before,before+change,"Commande "+id+" "+next);
   }
   for(long pid:productIds){catalog.refreshStock(pid);db.update("UPDATE product SET version=version+1,updated_at=CURRENT_TIMESTAMP WHERE id=?",pid);}
  }
  db.update("UPDATE shop_order SET status=?,confirmed_at=CASE WHEN ?='confirmed' THEN CURRENT_TIMESTAMP ELSE confirmed_at END WHERE id=?",next,next,id);
  db.update("INSERT INTO order_event(order_id,status) VALUES(?,?)",id,next);return view(db.queryForMap("SELECT * FROM shop_order WHERE id=?",id));
 }
}
