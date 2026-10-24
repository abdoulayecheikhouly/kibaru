package sn.kibaru;
import org.springframework.web.bind.annotation.*;import org.springframework.beans.factory.annotation.Value;import org.springframework.jdbc.core.JdbcTemplate;import org.springframework.security.crypto.password.PasswordEncoder;import org.springframework.mail.javamail.JavaMailSender;import org.springframework.mail.SimpleMailMessage;import org.springframework.transaction.annotation.Transactional;import jakarta.validation.Valid;import jakarta.servlet.http.HttpServletRequest;import java.util.*;import java.security.*;import java.nio.charset.StandardCharsets;import java.sql.Timestamp;import java.time.Instant;
@RestController @RequestMapping("/api/auth") public class PasswordController {
 final JdbcTemplate db;final PasswordEncoder encoder;final JavaMailSender mail;
 @Value("${shop.mail-enabled:false}") boolean enabled;@Value("${shop.mail-from:}") String from;@Value("${shop.origin}") String origin;
 public PasswordController(JdbcTemplate db,PasswordEncoder encoder,JavaMailSender mail){this.db=db;this.encoder=encoder;this.mail=mail;}
 static String hash(String value){try{return HexFormat.of().formatHex(MessageDigest.getInstance("SHA-256").digest(value.getBytes(StandardCharsets.UTF_8)));}catch(NoSuchAlgorithmException e){throw new IllegalStateException(e);}}
 @GetMapping("/password-reset/config") Object config(){return Map.of("enabled",enabled&&!from.isBlank());}
 @PostMapping("/forgot-password") @ResponseStatus(org.springframework.http.HttpStatus.ACCEPTED) @Transactional Object forgot(@Valid @RequestBody Requests.Forgot input){
  if(!enabled||from.isBlank())throw new ApiException(503,"L’envoi des e-mails est en cours de configuration. Contactez Kibaru sur WhatsApp.");
  var users=db.queryForList("SELECT id FROM shop_user WHERE email=?",input.email().trim().toLowerCase(Locale.ROOT));
  if(!users.isEmpty()){
   byte[] random=new byte[32];new SecureRandom().nextBytes(random);String token=Base64.getUrlEncoder().withoutPadding().encodeToString(random);Object id=users.getFirst().get("id");
   db.update("DELETE FROM password_reset WHERE user_id=? OR expires_at<CURRENT_TIMESTAMP",id);
   db.update("INSERT INTO password_reset(token_hash,user_id,expires_at) VALUES(?,?,?)",hash(token),id,Timestamp.from(Instant.now().plusSeconds(1800)));
   var message=new SimpleMailMessage();message.setFrom(from);message.setTo(input.email().trim());message.setSubject("Réinitialisation de votre mot de passe Kibaru");message.setText("Utilisez ce lien valable 30 minutes :\n"+origin+"/reinitialiser?token="+token+"\nSi vous n’êtes pas à l’origine de cette demande, ignorez cet e-mail.");
   try{mail.send(message);}catch(org.springframework.mail.MailException e){throw new ApiException(503,"L’envoi est momentanément indisponible. Réessayez plus tard.");}
  }
  return Map.of("message","Si cette adresse correspond à un compte, un lien de réinitialisation sera envoyé.");
 }
 @PostMapping("/reset-password") @Transactional Object reset(@Valid @RequestBody Requests.Reset input,HttpServletRequest request){
  var rows=db.queryForList("SELECT user_id,expires_at,used FROM password_reset WHERE token_hash=? FOR UPDATE",hash(input.token()));
  if(rows.isEmpty()||Boolean.TRUE.equals(rows.getFirst().get("used"))||db.queryForObject("SELECT COUNT(*) FROM password_reset WHERE token_hash=? AND expires_at>CURRENT_TIMESTAMP",Integer.class,hash(input.token()))==0)throw new ApiException(400,"Lien expiré ou invalide. Demandez un nouveau lien.");
  db.update("UPDATE shop_user SET password_hash=?,auth_version=auth_version+1 WHERE id=?",encoder.encode(input.password()),rows.getFirst().get("user_id"));
  db.update("UPDATE password_reset SET used=TRUE WHERE user_id=?",rows.getFirst().get("user_id"));
  if(request.getSession(false)!=null)request.getSession(false).invalidate();org.springframework.security.core.context.SecurityContextHolder.clearContext();
  return Map.of("message","Votre mot de passe a été mis à jour. Connectez-vous à nouveau.");
 }
}
