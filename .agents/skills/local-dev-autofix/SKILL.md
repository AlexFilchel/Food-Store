---
name: local-dev-autofix
description: >
  Diagnostica y repara problemas comunes del entorno local (Windows) en Food-Store: puerto 8000 ocupado, CORS para Vite 5173/5174, variables .env.
  Trigger: cuando el usuario diga que el frontend no conecta, "connection refused", login falla, CORS, 8000 ocupado, o quiera un arreglo automático.
license: Apache-2.0
metadata:
  author: gentleman-programming
  version: "1.0"
---

## When to Use

- El frontend muestra errores tipo “localhost refused to connect”, “No pudimos iniciar tu sesión”, o se queda en blanco.
- CORS falla cuando Vite cambia de puerto (5173/5174).
- El backend no arranca porque el puerto 8000 está ocupado o “secuestrado”.
- Se necesita un flujo repetible para volver a un estado “known good”.

## Critical Patterns (MUST)

- **Read-only primero**: antes de proponer cambios, recolectar evidencia (puertos, procesos, .env).
- **Pedir permiso antes de acciones destructivas**:
  - matar procesos (Stop-Process / taskkill)
  - reset de winsock/IP
  - editar archivos `.env`
- **No correr builds** (ni `npm run build`, ni pipelines) como parte del fix.
- **No adivinar**: siempre mostrar el comando y el output relevante.
- **Minimizar impacto**:
  1) identificar exactamente qué proceso ocupa el puerto
  2) proponer kill selectivo (PIDs concretos)
  3) recién después opciones más agresivas

## Decision Tree

| Síntoma | Verificar | Fix (con permiso) |
|---|---|---|
| 8000 ocupado | `netstat -abno | findstr :8000` / `Get-NetTCPConnection -LocalPort 8000` | matar `python.exe`/`uvicorn` huérfanos (spawn_main) por PID |
| CORS | revisar `backend/.env` (`CORS_ORIGINS`) | agregar `http://localhost:5173` y `http://localhost:5174` |
| Front en blanco | DevTools Console/Network | si hay 422, confirmar normalización de ProblemDetails y revisar response |
| Login 401 | request/response del frontend | revisar credenciales/headers; comparar con Swagger |

## Commands

> Estos comandos son para **copiar/pegar** en PowerShell (Windows). La skill debe pedir permiso antes de ejecutar los que matan procesos o modifican archivos.

### Diagnóstico de puerto 8000

```powershell
netstat -abno | findstr :8000
Get-NetTCPConnection -LocalPort 8000 -State Listen | Select-Object LocalAddress,LocalPort,OwningProcess
```

### Ver proceso por PID

```powershell
Get-Process -Id <PID>
wmic process where (ProcessId=<PID>) get CommandLine
```

### Matar proceso por PID (CON PERMISO)

```powershell
Stop-Process -Id <PID> -Force
# o
taskkill /PID <PID> /F
```

### Verificación backend

- Abrir: `http://127.0.0.1:8000/docs`

## File Touch Points

- `backend/.env` — `CORS_ORIGINS` debe permitir `http://localhost:5173` y `http://localhost:5174`.
- `frontend/.env` — `VITE_API_URL=http://localhost:8000`.
- `frontend/src/shared/api/problem-details.ts` — normaliza errores 422 default de FastAPI.
- `backend/run_dev.py` — runner Windows recomendado.

## Resources

- **Templates/Scripts**: ver `assets/` (si existieran scripts auxiliares).
