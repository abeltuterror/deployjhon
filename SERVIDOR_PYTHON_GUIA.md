# 📚 Guía: Prender Servidor Python para Archivos HTML

## 🎯 Propósito
Esta guía te ayuda a ejecutar un servidor local para acceder a tus archivos HTML desde el navegador.

---

## ✅ Opción 1: Servidor HTTP Simple (Python 3) — RECOMENDADO

**Pasos:**
1. Abre una terminal en tu carpeta de trabajo
2. Ejecuta:
```bash
python3 -m http.server 8000
```
3. Abre tu navegador en: **http://localhost:8000**
4. Verás la lista de archivos — selecciona el que deseas (4.html, 1.html, 3.html, etc.)
5. Para detener el servidor: presiona `Ctrl + C`

---

## 🐍 Opción 2: Python 2 (Si aún lo tienes instalado)

```bash
python -m SimpleHTTPServer 8000
```

Accede a: **http://localhost:8000**

---

## 📂 Opción 3: Ejecutar desde otro directorio

Si necesitas ejecutar el servidor desde otra ubicación:

```bash
cd /home/abeldev/code/javascript_proyect/jhon
python3 -m http.server 8000
```

---

## 🔄 Opción 4: Usar un puerto diferente

Si el puerto 8000 está ocupado:

```bash
python3 -m http.server 3000
```

Luego accede a: **http://localhost:3000**

**Otros puertos disponibles:** 5000, 8080, 9000, etc.

---

## 🚀 Opción 5: Servidor Avanzado con Flask

Para más control y features:

### Instalar Flask:
```bash
pip install flask
```

### Crear archivo `app.py`:
```python
from flask import Flask
import os

app = Flask(__name__)

@app.route('/')
def index():
    return open('4.html').read()

if __name__ == '__main__':
    app.run(debug=True, port=8000)
```

### Ejecutar:
```bash
python app.py
```

Accede a: **http://localhost:8000**

---

## ⚡ Guía Rápida (5 minutos)

### Paso 1: Abre una terminal
```bash
cd /home/abeldev/code/javascript_proyect/jhon
```

### Paso 2: Inicia el servidor
```bash
python3 -m http.server 8000
```

### Paso 3: Abre tu navegador
Entra a: **http://localhost:8000**

### Paso 4: Selecciona tu archivo HTML
- 4.html
- 1.html
- 3.html

### Paso 5: Para detener
En la terminal: **Ctrl + C**

---

## 🔧 Solución de Problemas

### El puerto 8000 está en uso
```bash
python3 -m http.server 8080  # Intenta otro puerto
```

### No puedo acceder a localhost
- Verifica que escribas correctamente: `http://localhost:8000` (no HTTPS)
- Intenta `http://127.0.0.1:8000`

### Los archivos JSON no cargan
- Asegúrate que `datos.json`, `datos1.json`, etc. están en la misma carpeta
- Verifica los permisos de lectura del archivo

### Cambios en HTML no se reflejan
- Recarga la página: **Ctrl + R** o **Cmd + R**
- Limpia caché: **Ctrl + Shift + R**

---

## 📝 Notas Importantes

✅ **Ventajas de usar un servidor local:**
- Evitas problemas de CORS
- Los archivos JSON se cargan correctamente
- Mejor experiencia de desarrollo
- Similar al ambiente de producción

⚠️ **No uses directamente desde el archivo:**
- No abras los HTML con `file://` en el navegador
- Esto causa problemas de seguridad y con CORS

---

## 📌 Archivos en tu carpeta

Tu proyecto contiene:
- **4.html** — Archivo principal con paginación
- **1.html** — Versión alternativa
- **3.html** — Versión con paginación
- **datos.json** — Datos de convocatorias
- **datos1.json** — Datos adicionales
- **datos2.json** — Datos adicionales
- **datos5.json** — Datos adicionales

---

## ✨ Verificar que funciona

Una vez que el servidor esté corriendo, deberías ver en la terminal algo como:

```
Serving HTTP on 0.0.0.0 port 8000 (http://0.0.0.0:8000/) ...
```

Y cuando accedas a la página:
```
127.0.0.1 - - [28/Apr/2026 10:30:45] "GET / HTTP/1.1" 200 -
127.0.0.1 - - [28/Apr/2026 10:30:46] "GET /4.html HTTP/1.1" 200 -
```

---

## 🎉 ¡Listo!

Ya tienes tu servidor corriendo. Abre **http://localhost:8000** y disfruta de tu aplicación.

**¿Dudas?** Revisa la sección "Solución de Problemas" o contacta al soporte.
