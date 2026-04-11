# Guia paso a paso para crear una PR al repo principal y generar una nueva compilacion

Esta guia esta pensada para este repositorio, que hoy tiene estos remotos:

- `origin`: `https://github.com/javijec/PoeTradePlus.git`
- `upstream`: repo principal `https://github.com/KroxiLabs/Kroxitrade.git`
- rama base principal: `main`

Importante:

- La PR no crea por si sola el release final.
- En este repo, el workflow de release se ejecuta cuando se hace `push` de un tag con formato `v*`, por ejemplo `v1.0.69`.
- Ademas existe un workflow manual llamado `Submit to Web Store`.

## 1. Traer lo ultimo del repo principal

Desde la raiz del proyecto:

```powershell
git checkout main
git fetch upstream
git pull upstream main
```

Si quieres mantener sincronizado tu remoto de trabajo tambien:

```powershell
git push origin main
```

## 2. Crear una rama para tu cambio

Usa un nombre claro:

```powershell
git checkout -b feat/nombre-del-cambio
```

Ejemplos:

```powershell
git checkout -b fix/sidebar-history
git checkout -b feat/actions-menu
```

## 3. Hacer los cambios y probar localmente

Si todavia no instalaste dependencias:

```powershell
npm install
```

Para validar la extension:

```powershell
npm run build
```

Si necesitas generar los paquetes localmente:

```powershell
npm run package
```

## 4. Revisar que solo estes subiendo lo correcto

```powershell
git status
git diff
```

Si todo esta bien, agrega los archivos:

```powershell
git add .
```

Si prefieres agregar archivos puntuales:

```powershell
git add ruta/del/archivo
```

## 5. Crear el commit

Haz un commit corto y claro:

```powershell
git commit -m "feat: describe tu cambio"
```

Ejemplos:

```powershell
git commit -m "fix: corrige el calculo de historial"
git commit -m "feat: agrega acciones rapidas al menu"
```

## 6. Subir la rama a tu repo en GitHub

En esta configuracion, tu remoto de trabajo es `origin`:

```powershell
git push -u origin feat/nombre-del-cambio
```

Ejemplo:

```powershell
git push -u origin feat/actions-menu
```

## 7. Crear la PR hacia el repo principal

Tienes dos formas.

### Opcion A. Desde GitHub web

1. Entra al repo donde subiste la rama.
2. GitHub normalmente mostrara el boton `Compare & pull request` apenas subas la rama.
3. Asegurate de que quede asi:
   - `base repository`: `KroxiLabs/Kroxitrade`
   - `base`: `main`
   - `head repository`: el repo donde subiste tu rama
   - `compare`: `feat/nombre-del-cambio`
4. Completa el titulo y la descripcion.
5. Crea la PR.

Ejemplo de link directo si la rama la subiste a `origin` (`javijec/PoeTradePlus`):

```text
https://github.com/KroxiLabs/Kroxitrade/compare/main...javijec:feat/nombre-del-cambio?expand=1
```

### Opcion B. Con GitHub CLI

Si tienes `gh` configurado:

```powershell
gh pr create --repo KroxiLabs/Kroxitrade --base main --head javijec:feat/nombre-del-cambio --title "feat: describe tu cambio" --body "Resumen del cambio"
```

## 8. Esperar revision y merge

Una vez abierta la PR:

1. Espera comentarios o checks.
2. Si te piden cambios, hazlos en la misma rama.
3. Vuelve a ejecutar:

```powershell
git add .
git commit -m "fix: ajustes de revision"
git push
```

La PR se actualiza sola.

## 9. Cuando la PR se mergea

Despues del merge, actualiza tu local:

```powershell
git checkout main
git fetch upstream
git pull upstream main
git push origin main
```

Opcionalmente borra tu rama local:

```powershell
git branch -d feat/nombre-del-cambio
```

## 10. Como se genera la nueva compilacion o release

En este repo hay que separar 3 escenarios:

### Escenario A. Solo abrir una PR

- Sirve para revision y merge.
- No crea el release publico automaticamente.

### Escenario B. Crear un release de GitHub con los zip

El workflow `.github/workflows/release.yml` se ejecuta al subir un tag como `v1.0.69`.

Pasos recomendados:

1. Asegurate de estar en `main` y con lo ultimo del repo principal.
2. Crea el tag:

```powershell
git checkout main
git fetch upstream
git pull upstream main
git tag v1.0.69
```

3. Sube el tag al repo principal:

```powershell
git push upstream v1.0.69
```

Eso dispara el workflow de release y adjunta los `.zip` generados a una release de GitHub.

### Escenario C. Publicar en la Web Store

El workflow `.github/workflows/submit.yml` es manual (`workflow_dispatch`).

Eso significa que alguien con permisos en el repo principal debe entrar a:

- `GitHub > Actions > Submit to Web Store > Run workflow`

y ejecutarlo manualmente.

## 11. Flujo corto recomendado

Si tu objetivo es "subir mi cambio al principal":

1. Crear rama desde `main`
2. Hacer cambios
3. Probar con `npm run build`
4. Commit
5. `git push -u origin tu-rama`
6. Abrir PR desde `javijec/PoeTradePlus` hacia `KroxiLabs/Kroxitrade:main`
7. Esperar merge

Si ademas quieres "que salga una nueva compilacion/release":

8. Despues del merge, crear y subir un tag `v*` al repo principal
9. Si tambien hace falta publicar en tienda, correr manualmente `Submit to Web Store`

## 12. Comandos resumidos

```powershell
git checkout main
git fetch upstream
git pull upstream main
git checkout -b feat/nombre-del-cambio

# hacer cambios

npm run build
git add .
git commit -m "feat: describe tu cambio"
git push -u origin feat/nombre-del-cambio
```

Despues, abre la PR hacia:

- base: `KroxiLabs/Kroxitrade/main`
- head: `javijec/PoeTradePlus/feat/nombre-del-cambio`

## 13. Nota importante sobre permisos

Para poder:

- hacer merge en el repo principal
- subir tags a `upstream`
- ejecutar el workflow manual de publicacion

necesitas permisos en `KroxiLabs/Kroxitrade`.

Si no tienes esos permisos, igual puedes hacer todo hasta abrir la PR, y luego alguien del repo principal tendra que mergear y lanzar el release.
