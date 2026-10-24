package sn.kibaru;
import org.springframework.stereotype.Service;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.transaction.annotation.Transactional;
import java.util.*;

@Service
public class CatalogService {
 final JdbcTemplate db;final ExchangeService exchange;
 public CatalogService(JdbcTemplate db,ExchangeService exchange){this.db=db;this.exchange=exchange;}
 public void health(){db.queryForObject("SELECT 1",Integer.class);}
 public Map<String,Object> adminProduct(long id){var rows=db.queryForList("SELECT p.*,c.name AS category_name FROM product p JOIN category c ON c.id=p.category_id WHERE p.id=?",id);if(rows.isEmpty())throw new ApiException(404,"Produit introuvable");return enrich(rows.getFirst());}
 static String clean(String s){return s==null?"":s.trim();}
 static long num(Object n){return ((Number)n).longValue();}
 static void page(int page,int limit){if(page<1||page>100000||limit<1||limit>100)throw new ApiException(400,"Pagination invalide");}
 Map<String,Object> list(String select,String count,List<Object> args,int page,int limit){page(page,limit);long total=db.queryForObject(count,Long.class,args.toArray());var values=new ArrayList<>(args);values.add(limit);values.add((page-1)*limit);return Map.of("items",db.queryForList(select+" LIMIT ? OFFSET ?",values.toArray()),"total",total,"page",page,"limit",limit,"pages",(total+limit-1)/limit);}
 public Map<String,Object> products(String q,Long category,Long min,Long max,boolean available,String sort,int page,int limit,boolean admin,String status,String currency){String priceColumn=currency.equals("MAD")?"price_mad":"price_xof";if(!Set.of("MAD","XOF").contains(currency))throw new ApiException(400,"Devise invalide");var args=new ArrayList<Object>();var clauses=new ArrayList<String>();if(!admin){clauses.add("p.status='published'");clauses.add("c.visible=TRUE");}if(!clean(q).isEmpty()){clauses.add("(LOWER(p.name) LIKE ? OR LOWER(p.sku) LIKE ?)");args.add("%"+clean(q).toLowerCase(Locale.ROOT)+"%");args.add(args.getLast());}if(category!=null){clauses.add("p.category_id=?");args.add(category);}if(min!=null){if(min<0)throw new ApiException(400,"Prix invalide");clauses.add("p."+priceColumn+">=?");args.add(min);}if(max!=null){if(max<0)throw new ApiException(400,"Prix invalide");clauses.add("p."+priceColumn+"<=?");args.add(max);}if(available)clauses.add("p.stock>0");if(admin&&!clean(status).isEmpty()){if(!Set.of("draft","published").contains(status))throw new ApiException(400,"Statut invalide");clauses.add("p.status=?");args.add(status);}String ordering=switch(sort){case "selection"->"p.id DESC";case "price_asc"->"p."+priceColumn+",p.id";case "price_desc"->"p."+priceColumn+" DESC,p.id";case "name"->"p.name,p.id";default->throw new ApiException(400,"Tri invalide");};String from=" FROM product p JOIN category c ON c.id=p.category_id"+(clauses.isEmpty()?"":" WHERE "+String.join(" AND ",clauses));var result=list("SELECT p.*,c.name AS category_name"+from+" ORDER BY "+ordering,"SELECT COUNT(*)"+from,args,page,limit); @SuppressWarnings("unchecked") var items=(List<Map<String,Object>>)result.get("items");items.forEach(p->{enrich(p);p.put("price",p.get(priceColumn));p.put("currency",currency);});return result;}
 public Map<String,Object> product(long id){var rows=db.queryForList("SELECT p.*,c.name AS category_name FROM product p JOIN category c ON c.id=p.category_id WHERE p.id=? AND p.status='published' AND c.visible=TRUE",id);if(rows.isEmpty())throw new ApiException(404,"Produit introuvable");return enrich(rows.getFirst());}
 public List<Map<String,Object>> categories(boolean admin){return db.queryForList("SELECT c.*,COUNT(p.id) AS product_count FROM category c LEFT JOIN product p ON p.category_id=c.id"+(admin?"":" AND p.status='published'")+(admin?"":" WHERE c.visible=TRUE")+" GROUP BY c.id ORDER BY c.id");}
 @Transactional public Map<String,Object> saveCategory(Long id,Requests.Category p){if(id==null){db.update("INSERT INTO category(name,slug,description,visible) VALUES(?,?,?,?)",p.name().trim(),p.slug(),clean(p.description()),p.visible());return db.queryForMap("SELECT * FROM category WHERE slug=?",p.slug());}if(db.update("UPDATE category SET name=?,slug=?,description=?,visible=? WHERE id=?",p.name().trim(),p.slug(),clean(p.description()),p.visible(),id)==0)throw new ApiException(404,"Catégorie introuvable");return db.queryForMap("SELECT * FROM category WHERE id=?",id);}
 @Transactional public void deleteCategory(long id){if(db.queryForObject("SELECT COUNT(*) FROM product WHERE category_id=?",Long.class,id)>0)throw new ApiException(409,"Réaffectez les produits avant de supprimer la catégorie");if(db.update("DELETE FROM category WHERE id=?",id)==0)throw new ApiException(404,"Catégorie introuvable");}
 @Transactional public Map<String,Object> saveProduct(Long id,Requests.Product p){
  if(db.queryForObject("SELECT COUNT(*) FROM category WHERE id=?",Long.class,p.categoryId())==0)throw new ApiException(400,"Catégorie introuvable");
  var photos=photos(p);var skus=new HashSet<String>();for(var v:p.variants())if(!skus.add(v.sku().trim()))throw new ApiException(400,"Référence variante en double");
  if(id==null){db.update("INSERT INTO product(name,sku,description,category_id,price,price_mad,price_xof,stock,status,image) VALUES(?,?,?,?,0,?,?,0,?,?)",p.name().trim(),p.sku().trim(),clean(p.description()),p.categoryId(),p.priceMad(),exchange.xof(p.priceMad(),p.priceXof()),p.status(),photos.getFirst());id=db.queryForObject("SELECT id FROM product WHERE sku=?",Long.class,p.sku().trim());}
  else {requireVersion(p.version());var old=db.queryForList("SELECT id FROM product WHERE id=? FOR UPDATE",id);if(old.isEmpty())throw new ApiException(404,"Produit introuvable");if(db.update("UPDATE product SET name=?,sku=?,description=?,category_id=?,price_mad=?,price_xof=?,status=?,image=?,version=version+1,updated_at=CURRENT_TIMESTAMP WHERE id=? AND version=?",p.name().trim(),p.sku().trim(),clean(p.description()),p.categoryId(),p.priceMad(),exchange.xof(p.priceMad(),p.priceXof()),p.status(),photos.getFirst(),id,p.version())==0)throw conflict();}
  var oldVariants=db.queryForList("SELECT * FROM product_variant WHERE product_id=?",id);db.update("UPDATE product_variant SET active=FALSE WHERE product_id=?",id);
  var seen=new HashSet<Long>();
  for(var v:p.variants()){
   if(v.id()==null){db.update("INSERT INTO product_variant(product_id,sku,size,color,capacity,stock) VALUES(?,?,?,?,?,?)",id,v.sku().trim(),clean(v.size()),clean(v.color()),clean(v.capacity()),v.stock());}
   else {if(!seen.add(v.id()))throw new ApiException(400,"Variante répétée");var old=oldVariants.stream().filter(o->num(o.get("id"))==v.id()).findFirst().orElseThrow(()->new ApiException(400,"Variante inconnue pour ce produit"));
    db.update("UPDATE product_variant SET sku=?,size=?,color=?,capacity=?,stock=?,active=TRUE WHERE id=? AND product_id=?",v.sku().trim(),clean(v.size()),clean(v.color()),clean(v.capacity()),v.stock(),v.id(),id);
    if(num(old.get("stock"))!=v.stock())db.update("INSERT INTO stock_movement(product_id,variant_id,previous_stock,new_stock,reason) VALUES(?,?,?,?,?)",id,v.id(),old.get("stock"),v.stock(),"Édition de variante");
   }
  }
  db.update("UPDATE product SET reference_only=? WHERE id=?",p.referenceOnly(),id);
  refreshStock(id);savePhotos(id,photos);return adminProduct(id);
 }
 void refreshStock(long id){db.update("UPDATE product SET stock=(SELECT COALESCE(SUM(v.stock),0) FROM product_variant v WHERE v.product_id=product.id AND v.active=TRUE) WHERE id=?",id);}

 List<String> photos(Requests.Product p){var all=new LinkedHashSet<String>();all.add(p.image());if(p.images()!=null)all.addAll(p.images());if(all.size()>8)throw new ApiException(400,"8 photos maximum par produit");for(String image:all){if(image.startsWith("/api/media/")&&!java.nio.file.Files.isRegularFile(uploadDir.resolve(image.substring(11))))throw new ApiException(400,"Photo importée introuvable");}return new ArrayList<>(all);}
 @org.springframework.beans.factory.annotation.Value("${shop.uploads}") String uploads;
 java.nio.file.Path uploadDir;
 @jakarta.annotation.PostConstruct void initUploads(){uploadDir=java.nio.file.Path.of(uploads).toAbsolutePath().normalize();}
 void savePhotos(long id,List<String> images){db.update("DELETE FROM product_image WHERE product_id=?",id);for(int i=0;i<images.size();i++)db.update("INSERT INTO product_image(product_id,position,image) VALUES(?,?,?)",id,i,images.get(i));}
 Map<String,Object> enrich(Map<String,Object> p){long id=num(p.get("id"));var images=db.queryForList("SELECT image FROM product_image WHERE product_id=? ORDER BY position",String.class,id);p.put("images",images.isEmpty()?List.of(p.get("image")):images);p.putAll(ratingSummary(id));p.put("price",p.get("price_xof"));p.put("variants",db.queryForList("SELECT id,sku,size,color,capacity,stock,active FROM product_variant WHERE product_id=? AND active=TRUE ORDER BY id",id));return p;}
 Map<String,Object> ratingSummary(long id){return db.queryForMap("SELECT COALESCE(AVG(CAST(score AS DECIMAL(10,2))),0) AS rating_average,COUNT(*) AS rating_count FROM product_rating WHERE product_id=?",id);}
 @Transactional public Map<String,Object> rate(long id,String visitor,int score){var rows=db.queryForList("SELECT p.id FROM product p JOIN category c ON c.id=p.category_id WHERE p.id=? AND p.status='published' AND c.visible=TRUE FOR UPDATE",id);if(rows.isEmpty())throw new ApiException(404,"Produit introuvable");if(db.update("UPDATE product_rating SET score=?,updated_at=CURRENT_TIMESTAMP WHERE product_id=? AND visitor_id=?",score,id,visitor)==0)db.update("INSERT INTO product_rating(product_id,visitor_id,score) VALUES(?,?,?)",id,visitor,score);return ratingSummary(id);}
 static void requireVersion(Long version){if(version==null)throw new ApiException(400,"Version du produit obligatoire. Rechargez la fiche.");}
 static ApiException conflict(){return new ApiException(409,"Ce produit a été modifié depuis son ouverture. Rechargez sa fiche avant de réessayer.");}
 @Transactional public void archive(long id,long version){if(db.queryForObject("SELECT COUNT(*) FROM product WHERE id=?",Long.class,id)==0)throw new ApiException(404,"Produit introuvable");if(db.update("UPDATE product SET status='draft',updated_at=CURRENT_TIMESTAMP,version=version+1 WHERE id=? AND version=?",id,version)==0)throw conflict();}
}
