package sn.kibaru;
import jakarta.validation.Valid;import jakarta.validation.constraints.*;import java.util.List;import java.math.BigDecimal;
public final class Requests {
 private Requests(){}
 public record Signup(@NotBlank @Size(max=100) String name,@NotBlank @Email @Size(max=254) String email,@Pattern(regexp="^$|^\\+?[0-9 ()-]{8,24}$") String phone,@NotBlank @Size(min=12,max=72) String password){}
 public record Login(@NotBlank @Email String email,@NotBlank @Size(max=72) String password){}
 public record Category(@NotBlank @Size(max=100) String name,@NotBlank @Size(max=120) @Pattern(regexp="[a-z0-9]+(?:-[a-z0-9]+)*") String slug,@Size(max=2000) String description,boolean visible){}
 public record Variant(@Positive Long id,@NotBlank @Size(max=80) String sku,@Size(max=40) String size,@Size(max=60) String color,@Size(max=40) String capacity,@NotNull @Min(0) @Max(1000000) Integer stock){}
 public record Product(@NotBlank @Size(max=160) String name,@NotBlank @Size(max=80) String sku,@Size(max=8000) String description,@NotNull @Positive Long categoryId,@NotNull @DecimalMin("0") @DecimalMax("100000000") @Digits(integer=9,fraction=2) BigDecimal priceMad,@NotNull @Min(1) @Max(100000000) Long priceXof,@NotBlank @Pattern(regexp="draft|published") String status,@NotBlank @Pattern(regexp="(?:/assets/[a-zA-Z0-9_.-]+\\.(?:jpeg|jpg|png|webp)|/api/media/[a-f0-9-]{36}\\.jpg)") String image,@Size(max=8) List<@NotBlank @Pattern(regexp="(?:/assets/[a-zA-Z0-9_.-]+\\.(?:jpeg|jpg|png|webp)|/api/media/[a-f0-9-]{36}\\.jpg)") String> images,@Min(0) Long version,@NotEmpty @Size(max=100) List<@Valid Variant> variants,boolean referenceOnly){}
 public record Item(@NotNull @Positive Long productId,@NotNull @Positive Long variantId,@NotNull @Min(1) @Max(100) Integer quantity){}
 public record Cart(@NotEmpty @Size(max=50) List<@Valid Item> items,@NotBlank @Pattern(regexp="MAD|XOF") String currency){}
 public record Order(@NotEmpty @Size(max=50) List<@Valid Item> items,@NotBlank @Size(max=100) String customerName,@NotBlank @Pattern(regexp="^\\+?[0-9 ()-]{8,24}$") String phone,@Size(max=1000) String note,@NotNull @DecimalMin("0") BigDecimal expectedTotal,@NotBlank @Pattern(regexp="MAD|XOF") String currency,@NotBlank @Pattern(regexp="pickup|delivery") String deliveryMethod,@Size(max=500) String address){}
 public record Status(@NotBlank @Pattern(regexp="confirmed|preparing|shipped|delivered|cancelled") String status){}
 public record Stock(@NotNull @Min(0) @Max(1000000) Integer stock,@Size(max=200) String reason,@NotNull @Min(0) Long version,@NotNull @Positive Long variantId){}
 public record Rating(@NotNull @Min(1) @Max(5) Integer score){}
 public record Forgot(@NotBlank @Email @Size(max=254) String email){}
 public record Reset(@NotBlank @Size(max=128) String token,@NotBlank @Size(min=12,max=72) String password){}
}
