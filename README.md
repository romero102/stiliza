# Stiliza

Pagina de vestidos (cliente, empleado y dueno).
Backend: Supabase.

## Config
Editar `js/supabase-config.js` con la URL y anon key del proyecto.

## Base de datos
Ejecutar `supabase_schema.sql` en el SQL Editor de Supabase.

## Dueño
Crear usuario en Authentication y actualizar el role:

```sql
update public.profiles
set role = 'dueno', full_name = 'Dueno Stiliza'
where email = 'dueno@stiliza.com';
```

## Cambios aplicados (login real contra Supabase)

- `js/auth.js`: el login de dueño/empleado ya no compara contra un password
  hardcodeado ni contra `localStorage` — usa `sb.auth.signInWithPassword()`.
- Se eliminó `OWNER_PASSWORD` del código fuente (estaba expuesto en texto plano).
- Para que un dueño/empleado pueda entrar, su usuario debe existir en
  **Authentication → Users** de Supabase con esa misma contraseña.
- `localStorage` (`stiliza_empleados_auth`, etc.) sigue usándose solo para
  saber si un correo *parece* de empleado (mostrar el campo de contraseña),
  no para validar el acceso — la validación real ahora es Supabase.

