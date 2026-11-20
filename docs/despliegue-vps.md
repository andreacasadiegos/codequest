# CodeQuest en un VPS compartido

Esta configuración ejecuta CodeQuest en contenedores independientes. Escucha únicamente en el puerto local `127.0.0.1:18080`: el sitio que ya existe en el VPS puede conservar sus puertos y su configuración. Un bloque virtual del proxy del anfitrión distingue los proyectos por nombre de dominio. No uses los scripts SQL de `database/01_schema.sql` contra una base de producción: eliminan y recrean tablas.

## Datos previos

- Nombre exacto del subdominio y acceso a la zona DNS de su dominio.
- Acceso SSH y observación del proxy actual (`nginx`, Apache, Caddy o Traefik), sus sitios activos y los puertos usados.
- Por defecto, CodeQuest crea su propia base PostgreSQL en un contenedor y volumen separados. No reutilices la base del otro proyecto.
- Clave de Gemini si CodeBot debe funcionar.
- Verificar en el panel del VPS cuál es su IPv4 pública. La dirección del servidor SSH y la del registro A deben corresponder al mismo VPS; no asumir que la dirección VNC es la IP pública.

## Instalación

1. Inventariar sin cambiar nada: `docker compose version`, `sudo ss -ltnp`, `sudo nginx -T` (si usa Nginx), `docker ps`, `df -h` y `free -h`. Comprobar que `18080` está libre y cuál proxy responde en 80/443.
2. Clonar la versión aprobada del repositorio en `/opt/codequest` con acceso de solo lectura para el servidor, o transferir una copia del código. Ejecutar los comandos siguientes desde `/opt/codequest/deploy`.
3. Crear `.env` desde `.env.example` con una contraseña aleatoria larga, reemplazada en `POSTGRES_PASSWORD` y `DATABASE_URL`. Usar `chmod 600 .env`; nunca colocar `.env` en Git ni en una imagen.
4. Ejecutar `docker compose up -d --build`; el esquema se importa en la base nueva y aislada al primer arranque. Verificar `docker compose ps` y `curl -i http://127.0.0.1:18080/api/health`. El JSON debe indicar `database: conectada`.
5. Si el proxy actual es Nginx, crear un sitio nuevo basado en `nginx-host.conf.example`, sustituyendo `codequest.example.com`. No editar ni eliminar el sitio existente. Ejecutar `sudo nginx -t` antes de recargar Nginx. Si el proxy actual es otro, configurar en él un host virtual equivalente apuntando a `http://127.0.0.1:18080` y reenviando el esquema HTTPS.
6. En el proveedor DNS del dominio, crear un registro **A** del subdominio hacia la IPv4 pública del VPS. Por ejemplo, para `codequest.grupodren.com`, el nombre sería `codequest` en la zona `grupodren.com` y el valor sería la IPv4 confirmada del VPS. Crear un registro **AAAA** solo si la IPv6 está operativa y el proxy escucha en ella. Esperar propagación y comprobar el registro y `http://SUBDOMINIO/api/health` desde fuera.
7. Emitir un certificado TLS para el subdominio con el gestor de certificados del proxy existente (por ejemplo Certbot si usa Nginx). Confirmar `https://SUBDOMINIO/api/health`, un inicio de sesión y una ruta del frontend recargada directamente.

El contenedor de PostgreSQL y su volumen son exclusivos de CodeQuest. El SQL de inicialización contiene instrucciones destructivas, pero se ejecuta solamente al crear el volumen nuevo de CodeQuest; nunca lo ejecutes contra la base del otro proyecto. Si el VPS ya utiliza el puerto `18080`, cambiar solo el puerto de bucle local de `compose.yaml` y el destino del proxy.

## Despliegue automático desde GitHub

El flujo `.github/workflows/deploy-vps.yml` publica cada cambio de `main` y se puede ejecutar manualmente. Antes de activarlo, completar la instalación inicial y comprobar la salud del servicio. En el repositorio de Andrea, configurar el entorno `production` con estas variables y secretos:

| Tipo | Nombre | Valor |
| --- | --- | --- |
| Variable | `VPS_HOST` | IPv4 o nombre de host SSH verificado del VPS |
| Variable | `VPS_USER` | `codequest-deploy`, usuario aislado con permiso limitado para ejecutar el despliegue |
| Secreto | `VPS_SSH_KEY` | Clave privada exclusiva de CodeQuest, sin contraseña interactiva |
| Secreto | `VPS_KNOWN_HOSTS` | Línea de clave de host SSH verificada contra la huella del panel/VNC |

Agregar la clave pública de despliegue a `~/.ssh/authorized_keys` de ese usuario en el VPS. La clave privada se introduce únicamente como secreto de GitHub. El flujo transfiere archivos a `/opt/codequest`, excluye `.env` y la configuración local, reconstruye solo CodeQuest y comprueba que la API responda con la base conectada. El usuario SSH debe poder ejecutar `docker compose` sin contraseña interactiva. No usar la contraseña root del VPS en GitHub Actions. El archivo `.env` se crea una sola vez en el servidor y permanece fuera del repositorio.

Si se reemplaza el historial Git por una instantánea para cambiar la lista visible de autores, conservar primero una copia privada del historial y coordinar la actualización de clones y ramas abiertas. Reescribir commits no revoca permisos de colaboradores ni elimina PR, comentarios o vistas en caché de GitHub; esos accesos se gestionan aparte en la configuración del repositorio.

## Actualización y reversión

Antes de actualizar, registrar el SHA de Git publicado y respaldar la base de datos. `docker compose up -d --build` recrea solo los servicios de CodeQuest. Para volver atrás, transferir de nuevo los archivos de ese SHA y ejecutar el mismo comando; el flujo excluye `.git` del servidor. No ejecutar `docker compose down -v` en un servidor con datos.
