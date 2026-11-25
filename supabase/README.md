# Activar cuentas y sincronización

1. Crea un proyecto en Supabase.
2. Abre **SQL Editor** y ejecuta [`schema.sql`](./schema.sql).
3. En **Project Settings > API**, copia la URL del proyecto y la publishable/anon key.
4. Pon esos valores en `js/cloud-config.js`.
5. Publica nuevamente la aplicación.

La aplicación usa la sesión de Supabase para proteger cada plan con Row Level Security. El navegador solo debe recibir la publishable/anon key; nunca coloques una `service_role key` en el frontend.

## Cobro por uso

Los eventos de uso se guardan en `usage_events`. Para cobrar dinero real hace falta un backend o Edge Function que valide esos eventos y los envíe a un medidor de Stripe. No se debe confiar en un contador enviado directamente por el navegador para facturar.
