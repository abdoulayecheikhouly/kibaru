package sn.kibaru;
import org.springframework.stereotype.Service;
import org.springframework.scheduling.annotation.*;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.transaction.support.TransactionTemplate;
import org.springframework.transaction.PlatformTransactionManager;
import com.fasterxml.jackson.databind.ObjectMapper;
import java.net.URI;import java.net.http.*;import java.time.*;import java.math.*;import java.util.*;
@Service @EnableScheduling
public class ExchangeService {
 final JdbcTemplate db;final ObjectMapper json;final TransactionTemplate tx;
 @Value("${shop.exchange-enabled:false}") boolean enabled;
 public ExchangeService(JdbcTemplate db,ObjectMapper json,PlatformTransactionManager manager){this.db=db;this.json=json;tx=new TransactionTemplate(manager);}
 @Scheduled(initialDelay=1000,fixedDelay=3600000) public void refresh(){if(!enabled)return;var rows=db.queryForList("SELECT rate FROM exchange_rate WHERE id=1 AND updated_at>CURRENT_TIMESTAMP-INTERVAL '24' HOUR");if(!rows.isEmpty())return;
  try{var client=HttpClient.newBuilder().connectTimeout(Duration.ofSeconds(8)).build();var response=client.send(HttpRequest.newBuilder(URI.create("https://open.er-api.com/v6/latest/MAD")).timeout(Duration.ofSeconds(12)).GET().build(),HttpResponse.BodyHandlers.ofString());if(response.statusCode()!=200)return;var data=json.readTree(response.body());if(!data.path("result").asText().equals("success")||!data.path("base_code").asText().equals("MAD"))return;var rate=data.path("rates").path("XOF").decimalValue();var instant=Instant.ofEpochSecond(data.path("time_last_update_unix").asLong());if(rate.compareTo(BigDecimal.ONE)<0||rate.compareTo(new BigDecimal("1000"))>0||instant.isBefore(Instant.now().minusSeconds(7*86400))||instant.isAfter(Instant.now().plusSeconds(3600)))return;applyRate(rate,instant);
  }catch(Exception ex){org.slf4j.LoggerFactory.getLogger(getClass()).warn("Currency update unavailable; retaining last stored rate");}
 }
 public void applyRate(BigDecimal rate,Instant date){tx.executeWithoutResult(status->{db.queryForList("SELECT id FROM product ORDER BY id FOR UPDATE");if(db.update("UPDATE exchange_rate SET rate=?,updated_at=? WHERE id=1",rate,java.sql.Timestamp.from(date))==0)db.update("INSERT INTO exchange_rate(id,rate,updated_at) VALUES(1,?,?)",rate,java.sql.Timestamp.from(date));db.update("UPDATE product SET price_xof=GREATEST(1,ROUND(price_mad*?)),version=version+1,updated_at=CURRENT_TIMESTAMP",rate);});}
 public long xof(BigDecimal mad,Long fallback){if(!enabled)return fallback;var rows=db.queryForList("SELECT rate FROM exchange_rate WHERE id=1");if(rows.isEmpty())throw new ApiException(503,"Conversion indisponible. Réessayez après la mise à jour du taux.");return mad.multiply(new BigDecimal(rows.getFirst().get("rate").toString())).setScale(0,RoundingMode.HALF_UP).max(BigDecimal.ONE).longValueExact();}
 public Map<String,Object> info(){var rows=db.queryForList("SELECT rate,updated_at FROM exchange_rate WHERE id=1");var result=new HashMap<String,Object>();result.put("automatic",enabled);result.put("base","MAD");result.put("target","XOF");if(!rows.isEmpty())result.putAll(rows.getFirst());return result;}
}
