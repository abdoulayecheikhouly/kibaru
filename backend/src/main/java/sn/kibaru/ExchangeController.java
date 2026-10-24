package sn.kibaru;
import org.springframework.web.bind.annotation.*;
@RestController public class ExchangeController{
 final ExchangeService service;public ExchangeController(ExchangeService service){this.service=service;}
 @GetMapping("/api/currency") Object info(){return service.info();}
}
