# Calendario de prácticas

Aplicación web local para gestionar horas de prácticas profesionales, asistencias y fechas estimadas. No requiere dependencias ni servidor de base de datos.

## Ejecutar
1. Extrae el ZIP y abre esta carpeta en Visual Studio Code.
2. Abre `index.html` directamente, o usa Live Server. Alternativamente, ejecuta `python -m http.server 8000` desde esta carpeta y abre http://localhost:8000.
3. Configura la fecha inicial, meta, horario y personalización.

## Funciones
- Calendario mensual y registro editable.
- Dashboard, modo noche, color y logo personalizable.
- Impresión/PDF desde el navegador, Excel XLSX con Times New Roman 16 y respaldos JSON.
- Los datos se almacenan en localStorage del navegador; exporta respaldos periódicamente. No hay sincronización entre dispositivos ni autenticación.
- Los días hábiles pasados sin cambios se presumen asistidos; verifica manualmente los registros antes de emitir informes oficiales.

## Publicar en GitHub
Crea un repositorio vacío, preferiblemente privado si planeas vender el código. Desde la terminal de VS Code:

```sh
git init
git add .
git commit -m "Versión inicial del calendario"
git branch -M main
git remote add origin https://github.com/TU-USUARIO/TU-REPOSITORIO.git
git push -u origin main
```

Para una demostración pública puedes activar GitHub Pages en Settings > Pages, seleccionando la rama main y la raíz, si tu plan y visibilidad lo permiten. No publiques respaldos personales, logos de terceros ni información institucional sin permiso.

## Distribución comercial
Elige tus condiciones de licencia antes de publicar. No se ha asignado una licencia de código abierto. Una versión descargable puede distribuirse como ZIP; la protección contra copias no está implementada. Para suscripciones, añade autenticación, servidor, base de datos, pagos y controles de acceso.

## Sistema conectado

Por defecto la aplicación funciona en modo local y conserva los datos en el navegador. También incluye una PWA instalable, búsqueda y filtros de registros, y un modo opcional de cuentas y sincronización con Supabase.

Para activar usuarios y sincronización, ejecuta [`supabase/schema.sql`](supabase/schema.sql), sigue [`supabase/README.md`](supabase/README.md) y configura `js/cloud-config.js`. Nunca pongas una `service_role key` en el frontend.

Los eventos de uso se registran en Supabase, pero el navegador no puede cobrar de forma segura. Para cobrar por uso se necesita una cuenta de Stripe y un backend/webhook que valide eventos, aplique límites y procese los pagos hacia tu cuenta.

## Pruebas recomendadas
Verifica edición de días, recálculo, persistencia, importación/exportación, contraste del tema, logo y vista previa de impresión. Revisa el Excel en Microsoft Excel.
