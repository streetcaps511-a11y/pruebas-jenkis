import { test as setup, expect } from '@playwright/test';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import fs from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// ✅ Ruta raíz del proyecto: pruebasjenkis/.auth/
const authDir  = join(__dirname, '..', '..', '.auth');
const authFile = join(authDir, 'user.json');

const BACKEND_URL = 'http://localhost:3000';
const FRONTEND_URL = 'http://localhost:5173';

const CREDENCIALES = {
    correo: 'duvann1991@gmail.com',
    clave:  'AdminGM2024!Secure',
};

setup('authenticate', async ({ page, request }) => {

    // 0. Asegurar que existe el directorio .auth/
    if (!fs.existsSync(authDir)) {
        fs.mkdirSync(authDir, { recursive: true });
    }

    // ──────────────────────────────────────────────────────────────────
    // 1. LOGIN VÍA API DIRECTA (evita problemas de formulario React y
    //    modal de conflicto de sesión).
    //    Usamos force:true para cerrar sesiones previas activas.
    // ──────────────────────────────────────────────────────────────────
    const loginResponse = await request.post(`${BACKEND_URL}/api/auth/login`, {
        data: {
            correo: CREDENCIALES.correo,
            clave:  CREDENCIALES.clave,
            force:  true,           // 🔑 Cierra sesión activa si existe
        },
    });

    expect(loginResponse.ok(), `Login API falló: ${loginResponse.status()} ${await loginResponse.text()}`).toBeTruthy();

    const body = await loginResponse.json();
    expect(body.success, `Respuesta inesperada: ${JSON.stringify(body)}`).toBe(true);

    const { token, refreshToken, usuario } = body.data;

    // Construir el objeto user que el frontend guarda en sessionStorage
    const userData = {
        id:                usuario.id,
        IdUsuario:         usuario.id,
        IdCliente:         usuario.IdCliente,
        nombre:            usuario.nombre,
        Correo:            usuario.email,
        IdRol:             usuario.idRol,
        Rol:               usuario.rol || usuario.rolData?.nombre || 'Administrador',
        rol:               usuario.rol || usuario.rolData?.nombre || 'Administrador',
        Estado:            usuario.estado,
        avatarUrl:         usuario.avatarUrl,
        sessionId:         usuario.sessionId,
        permisos:          usuario.permisos || [],
        mustChangePassword: false,
        token,
        userType:          'admin',
    };

    // ──────────────────────────────────────────────────────────────────
    // 2. INYECTAR TOKEN EN SESSIONSTORAGE desde el frontend
    //    (el app usa sessionStorage, no localStorage)
    // ──────────────────────────────────────────────────────────────────
    await page.goto(FRONTEND_URL);
    await page.waitForLoadState('domcontentloaded');

    await page.evaluate(({ userData, token, refreshToken }) => {
        sessionStorage.setItem('user',         JSON.stringify(userData));
        sessionStorage.setItem('token',        token);
        if (refreshToken) {
            sessionStorage.setItem('refreshToken', refreshToken);
        }
    }, { userData, token, refreshToken: refreshToken || '' });

    // ──────────────────────────────────────────────────────────────────
    // 3. VERIFICAR QUE EL TOKEN FUNCIONA navegando al panel admin
    // ──────────────────────────────────────────────────────────────────
    await page.goto(`${FRONTEND_URL}/admin`);
    await page.waitForURL(url => url.pathname.startsWith('/admin'), { timeout: 15000 });

    console.log(`✅ Sesión iniciada correctamente como: ${userData.nombre} (${userData.rol})`);

    // ──────────────────────────────────────────────────────────────────
    // 4. GUARDAR EL ESTADO: cookies + localStorage → .auth/user.json
    //    Nota: sessionStorage NO lo guarda storageState (limitación del browser).
    //    Por eso inyectamos manualmente en cada test via addInitScript.
    // ──────────────────────────────────────────────────────────────────
    await page.context().storageState({ path: authFile });

    // Guardar sessionStorage por separado para que los tests puedan restaurarlo
    const sessionJson = JSON.stringify({ userData, token, refreshToken: refreshToken || '' }, null, 2);
    fs.writeFileSync(join(authDir, 'session.json'), sessionJson, 'utf-8');

    console.log(`✅ Auth guardado en: ${authFile}`);
});