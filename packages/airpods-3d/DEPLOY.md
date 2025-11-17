# Guía de Deploy - AirPods 3D

Esta guía te ayudará a desplegar tu proyecto a producción en diferentes plataformas.

## 📦 Pre-Deploy Checklist

Antes de hacer deploy, verifica:

- ✅ `npm run build` se ejecuta sin errores
- ✅ `npm test` pasa todos los tests
- ✅ `npm run lint` no tiene errores críticos
- ✅ El proyecto funciona localmente con `npm run preview`
- ✅ Has configurado las variables de entorno necesarias (si las hay)
- ✅ Has optimizado las imágenes y assets

## 🚀 Deploy a Vercel (Recomendado)

### Opción 1: CLI de Vercel

```bash
# Instalar Vercel CLI
npm i -g vercel

# Login
vercel login

# Deploy
vercel

# Deploy a producción
vercel --prod
```

### Opción 2: GitHub Integration

1. Push tu código a GitHub
2. Visita [vercel.com/new](https://vercel.com/new)
3. Importa tu repositorio
4. Vercel detectará automáticamente Vite
5. Click en "Deploy"

**Configuración automática**:
- Build Command: `npm run build`
- Output Directory: `dist`
- Install Command: `npm install`

**Variables de entorno** (si necesitas):
```env
# En Vercel Dashboard > Settings > Environment Variables
VITE_API_URL=https://api.example.com
```

## 🌐 Deploy a Netlify

### Opción 1: Netlify CLI

```bash
# Instalar Netlify CLI
npm i -g netlify-cli

# Login
netlify login

# Deploy
netlify deploy

# Deploy a producción
netlify deploy --prod --dir=dist
```

### Opción 2: Netlify Drop

1. Ejecuta `npm run build`
2. Arrastra la carpeta `dist/` a [app.netlify.com/drop](https://app.netlify.com/drop)

### Opción 3: GitHub Integration

1. Conecta tu repo en [app.netlify.com](https://app.netlify.com)
2. Configuración:
   ```
   Build command: npm run build
   Publish directory: dist
   ```

## 📄 Deploy a GitHub Pages

### Configuración

1. Instala `gh-pages`:
```bash
npm install -D gh-pages
```

2. Actualiza `vite.config.ts`:
```typescript
export default defineConfig({
  base: '/nombre-repo/', // 👈 Importante!
  // ...resto de la config
})
```

3. Agrega script a `package.json`:
```json
{
  "scripts": {
    "deploy": "npm run build && gh-pages -d dist"
  }
}
```

4. Deploy:
```bash
npm run deploy
```

5. Habilita GitHub Pages:
   - Ve a Settings > Pages
   - Source: `gh-pages` branch

**URL**: `https://tu-usuario.github.io/nombre-repo/`

## ☁️ Deploy a Cloudflare Pages

### Opción 1: CLI Wrangler

```bash
# Instalar Wrangler
npm i -g wrangler

# Login
wrangler login

# Deploy
npm run build
wrangler pages deploy dist
```

### Opción 2: Dashboard

1. Visita [dash.cloudflare.com](https://dash.cloudflare.com)
2. Pages > Create a project
3. Conecta tu repo
4. Configuración:
   ```
   Build command: npm run build
   Build output directory: dist
   ```

## 🐳 Deploy con Docker

### Dockerfile

Crea `Dockerfile` en la raíz:

```dockerfile
# Build stage
FROM node:18-alpine AS builder

WORKDIR /app

COPY package*.json ./
RUN npm ci

COPY . .
RUN npm run build

# Production stage
FROM nginx:alpine

COPY --from=builder /app/dist /usr/share/nginx/html

# Nginx config para SPA
RUN echo 'server { \
    listen 80; \
    location / { \
        root /usr/share/nginx/html; \
        index index.html; \
        try_files $uri $uri/ /index.html; \
    } \
}' > /etc/nginx/conf.d/default.conf

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
```

### Docker Compose

Crea `docker-compose.yml`:

```yaml
version: '3.8'

services:
  airpods-3d:
    build: .
    ports:
      - "3000:80"
    restart: unless-stopped
```

### Comandos

```bash
# Build
docker build -t airpods-3d .

# Run
docker run -p 3000:80 airpods-3d

# Con docker-compose
docker-compose up -d
```

## 🔧 Deploy a Render

1. Conecta tu repo en [render.com](https://render.com)
2. New > Static Site
3. Configuración:
   ```
   Build Command: npm run build
   Publish Directory: dist
   ```

**Auto-deploy** cada push a main.

## 🌍 Deploy a AWS S3 + CloudFront

### 1. Build

```bash
npm run build
```

### 2. Crear bucket S3

```bash
aws s3 mb s3://airpods-3d-website
aws s3 website s3://airpods-3d-website --index-document index.html
```

### 3. Upload

```bash
aws s3 sync dist/ s3://airpods-3d-website --delete
```

### 4. CloudFront (opcional, para CDN)

- Crea distribución CloudFront
- Origin: tu bucket S3
- Default Root Object: `index.html`

## 🔐 Configuración de Dominio Personalizado

### Vercel

1. Project Settings > Domains
2. Agrega tu dominio
3. Configura DNS:
   ```
   CNAME www vercel-deployment.vercel.app
   A @ 76.76.21.21
   ```

### Netlify

1. Domain Settings > Add custom domain
2. Configura DNS:
   ```
   CNAME www your-site.netlify.app
   A @ 75.2.60.5
   ```

### Cloudflare

- Automático si usas Cloudflare DNS

## 📊 Monitoreo Post-Deploy

### Verificar

```bash
# Verificar que el sitio carga
curl -I https://tu-sitio.com

# Verificar WebGL
# Abre DevTools > Console, busca errores
```

### Analytics

Agrega en `index.html`:

```html
<!-- Google Analytics -->
<script async src="https://www.googletagmanager.com/gtag/js?id=G-XXXXXXXXXX"></script>
<script>
  window.dataLayer = window.dataLayer || [];
  function gtag(){dataLayer.push(arguments);}
  gtag('js', new Date());
  gtag('config', 'G-XXXXXXXXXX');
</script>
```

### Performance Monitoring

- [Web Vitals](https://web.dev/vitals/)
- [Lighthouse CI](https://github.com/GoogleChrome/lighthouse-ci)
- Sentry para error tracking

## ⚡ Optimizaciones Post-Deploy

### 1. CDN para Assets

```typescript
// vite.config.ts
export default defineConfig({
  build: {
    rollupOptions: {
      output: {
        assetFileNames: 'assets/[name].[hash][extname]'
      }
    }
  }
})
```

### 2. Comprimir Assets

```bash
# Brotli compression
find dist -type f \( -name '*.js' -o -name '*.css' -o -name '*.html' \) -exec brotli {} \;

# Gzip
find dist -type f \( -name '*.js' -o -name '*.css' -o -name '*.html' \) -exec gzip -k {} \;
```

### 3. Headers de caché

Para Netlify, crea `netlify.toml`:

```toml
[[headers]]
  for = "/*"
  [headers.values]
    X-Frame-Options = "DENY"
    X-XSS-Protection = "1; mode=block"
    X-Content-Type-Options = "nosniff"

[[headers]]
  for = "/assets/*"
  [headers.values]
    Cache-Control = "public, max-age=31536000, immutable"
```

Para Vercel, crea `vercel.json`:

```json
{
  "headers": [
    {
      "source": "/assets/(.*)",
      "headers": [
        {
          "key": "Cache-Control",
          "value": "public, max-age=31536000, immutable"
        }
      ]
    }
  ]
}
```

## 🐛 Troubleshooting

### Error: "Failed to load module"

**Causa**: Base URL incorrecta

**Solución**: Verifica `base` en `vite.config.ts`

### Canvas 3D no se muestra

**Causa**: WebGL no soportado o bloqueado

**Solución**:
- Verifica soporte WebGL: https://get.webgl.org/webgl2/
- Agrega fallback con detección

### Imágenes o modelos no cargan

**Causa**: Rutas incorrectas

**Solución**:
- Usa rutas relativas desde `/public`
- Verifica que los assets estén en `dist/` después del build

### 404 en rutas

**Causa**: SPA routing no configurado

**Solución**: Configura rewrites

**Vercel** (`vercel.json`):
```json
{
  "rewrites": [
    { "source": "/(.*)", "destination": "/index.html" }
  ]
}
```

**Netlify** (`_redirects` en `/public`):
```
/*    /index.html   200
```

## 📝 Checklist Final

Antes de considerar el deploy completo:

- [ ] Sitio accesible públicamente
- [ ] WebGL funciona correctamente
- [ ] Todas las animaciones fluidas
- [ ] Responsive en móvil y desktop
- [ ] Meta tags SEO verificados
- [ ] Lighthouse score > 80
- [ ] Sin errores en consola
- [ ] SSL/HTTPS configurado
- [ ] Dominio personalizado (opcional)
- [ ] Analytics configurado (opcional)

## 🎉 Post-Deploy

Una vez deployed:

1. **Comparte**: En redes sociales, portfolio
2. **Documenta**: Agrega URL al README
3. **Monitorea**: Revisa analytics y errores
4. **Actualiza**: Mantén dependencias al día
5. **Backup**: Guarda código en Git

## 📞 Soporte

Para problemas específicos de plataforma:

- **Vercel**: [vercel.com/support](https://vercel.com/support)
- **Netlify**: [docs.netlify.com](https://docs.netlify.com)
- **Cloudflare**: [developers.cloudflare.com](https://developers.cloudflare.com)
- **Render**: [render.com/docs](https://render.com/docs)

---

**¡Tu proyecto está listo para el mundo!** 🌍🚀
