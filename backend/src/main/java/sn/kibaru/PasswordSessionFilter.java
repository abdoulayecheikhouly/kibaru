package sn.kibaru;
import org.springframework.web.filter.OncePerRequestFilter;import org.springframework.jdbc.core.JdbcTemplate;import org.springframework.security.core.context.SecurityContextHolder;import jakarta.servlet.*;import jakarta.servlet.http.*;import java.io.IOException;import java.util.Objects;
final class PasswordSessionFilter extends OncePerRequestFilter {
 final JdbcTemplate db;PasswordSessionFilter(JdbcTemplate db){this.db=db;}
 protected void doFilterInternal(HttpServletRequest req,HttpServletResponse res,FilterChain chain)throws ServletException,IOException{
  var session=req.getSession(false);var auth=SecurityContextHolder.getContext().getAuthentication();
  if(session!=null&&auth!=null&&auth.isAuthenticated()&&session.getAttribute("auth_version")!=null){var rows=db.queryForList("SELECT auth_version FROM shop_user WHERE email=?",auth.getName());if(rows.isEmpty()||!Objects.equals(session.getAttribute("auth_version"),((Number)rows.getFirst().get("auth_version")).longValue())){session.invalidate();SecurityContextHolder.clearContext();}}
  chain.doFilter(req,res);
 }
}
