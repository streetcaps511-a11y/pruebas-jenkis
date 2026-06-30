import { test, expect } from '@playwright/test';

test.describe('Módulo Acceso', () => {
    
    // Evitar conflictos de sesión con otros tests (limpiar cookies y localStorage)
    test.use({ storageState: { cookies: [], origins: [] } });

    test('HU_17: Iniciar sesión con credenciales válidas e inválidas', async ({ page }) => {
        // Navegar a la página de inicio de sesión
        await page.goto('http://localhost:5173/login');
        await page.waitForLoadState('networkidle');
        await page.waitForTimeout(300); // Esperar animaciones iniciales (Firefox es más lento)

        // ── CA_17_02: Credenciales inválidas ──────────────────────────────
        // Firefox requiere triple-click para seleccionar el campo antes de escribir
        const emailInput = page.locator('input[name="correo_login_unique"]');
        const passInput  = page.locator('input[type="password"]').first();

        await emailInput.click({ clickCount: 3 });
        await emailInput.fill('usuario.invalido@test.com');

        await passInput.click({ clickCount: 3 });
        await passInput.fill('ClaveIncorrecta123');

        await page.locator('button[type="submit"]').click({ force: true });

        // Verificar mensaje de error (esperar un poco en Firefox para que aparezca)
        await page.waitForTimeout(500);
        const errorLocator = page.locator('text=/Credenciales|error|incorrect|invalid|Intenta de nuevo|correo|no encontrado/i').first();
        await expect(errorLocator).toBeVisible({ timeout: 8000 });

        // ── CA_17_01: Credenciales válidas ────────────────────────────────
        // Limpiar campos antes de rellenar (crucial en Firefox)
        await emailInput.click({ clickCount: 3 });
        await emailInput.fill('duvann1991@gmail.com');

        await passInput.click({ clickCount: 3 });
        await passInput.fill('AdminGM2024!Secure');

        await page.locator('button[type="submit"]').click({ force: true });

        // Esperar a que ocurra una de dos cosas:
        // 1. Redirección exitosa a /admin
        // 2. Aparición del botón "Usar aquí" de conflicto de sesión
        await Promise.race([
            page.waitForURL(url => url.pathname.startsWith('/admin'), { timeout: 20000 }),
            page.locator('button:has-text("Usar aquí")').waitFor({ state: 'visible', timeout: 20000 })
        ]).catch(() => {});

        // Si apareció el botón de conflicto, hacer clic y esperar de nuevo a la redirección
        if (await page.locator('button:has-text("Usar aquí")').isVisible()) {
            await page.locator('button:has-text("Usar aquí")').click({ force: true });
            await page.waitForURL(url => url.pathname.startsWith('/admin'), { timeout: 20000 });
        }

        expect(page.url()).toContain('/admin');
    });



    test('HU_18: Cerrar sesión', async ({ page }) => {
        // Pre-condición: Iniciar sesión primero
        await page.goto('http://localhost:5173/login');
        await page.waitForLoadState('networkidle');
        await page.waitForTimeout(200); // Esperar a que el useEffect de limpieza (100ms) termine

        await page.fill('input[name="correo_login_unique"]', 'duvann1991@gmail.com');
        await page.fill('input[type="password"]', 'AdminGM2024!Secure');
        await page.locator('button[type="submit"]').click({ force: true });
        
        // Esperar a que ocurra una de dos cosas:
        // 1. Redirección exitosa a /admin
        // 2. Aparición del botón "Usar aquí" de conflicto de sesión
        await Promise.race([
            page.waitForURL('**/admin**', { timeout: 15000 }),
            page.locator('button:has-text("Usar aquí")').waitFor({ state: 'visible', timeout: 15000 })
        ]).catch(() => {});

        // Si apareció el botón de conflicto, hacer clic y esperar de nuevo a la redirección
        if (await page.locator('button:has-text("Usar aquí")').isVisible()) {
            await page.locator('button:has-text("Usar aquí")').click({ force: true });
            await page.waitForURL('**/admin**', { timeout: 15000 });
        }

        // CA_18_01 y CA_18_02: Cerrar sesión
        const mobileMenuBtn = page.locator('.al-menu-toggle');
        if (await mobileMenuBtn.isVisible()) {
            await mobileMenuBtn.click({ force: true });
            await page.waitForTimeout(500); // Esperar animación del sidebar
        }
        
        const logoutBtn = page.locator('.al-logout-btn').first();
        await expect(logoutBtn).toBeAttached({ timeout: 10000 });
        await logoutBtn.click({ force: true });

        // Si hay un modal de confirmación, aceptarlo
        const confirmLogout = page.locator('.delete-modal-btn-confirm, .delete-modal-container button:has-text("Cerrar sesión")').first();
        try {
            await confirmLogout.waitFor({ state: 'visible', timeout: 3000 });
            await confirmLogout.click({ force: true });
        } catch (_e) {
            // Ignorar si no aparece el modal
        }

        // Verificar redirección al login
        await page.waitForURL('**/login**', { timeout: 8000 });
        await expect(page.url()).toContain('/login');

        // CA_18_03: Intentar acceder a ruta protegida sin sesión
        await page.goto('http://localhost:5173/admin/usuarios');
        await page.waitForURL('**/login**', { timeout: 5000 });
        await expect(page.url()).toContain('/login');
    });

    test('HU_19: Recuperar contraseña', async ({ page }) => {
        await page.goto('http://localhost:5173/login');
        await page.waitForLoadState('networkidle');
        await page.waitForTimeout(200); // Esperar a que el useEffect de limpieza (100ms) termine
        
        // CA_19_01: Enlace de recuperación visible y clickeable
        const forgotPwdLink = page.locator('button:has-text("Olvidaste tu contraseña")');
        await expect(forgotPwdLink).toBeVisible();
        await forgotPwdLink.click({ force: true }); // force:true evita el error 'element is not stable' por la animación CSS

        // Verificar que estamos en la pantalla de recuperación
        await expect(page.locator('text=/Recuperar|Restablecer|instrucciones/i').first()).toBeVisible({ timeout: 5000 });

        // CA_19_02: Ingresar correo y enviar
        const emailInput = page.locator('input[name="email"]');
        await expect(emailInput).toBeVisible();
        await emailInput.fill('duvann1991@gmail.com');
        
        // Clic en enviar/recuperar
        await page.locator('button[type="submit"]').click({ force: true });

        // Verificar mensaje de confirmación de envío (SweetAlert toast)
        await expect(page.locator('.swal2-container')).toContainText(/Enviado|correo/i, { timeout: 10000 });
    });

    test('HU_20: Restablecer contraseña con enlace de recuperación', async ({ page }) => {
        // Navegar directamente a la URL con un oobCode simulado (lo que pasaría al hacer clic en el correo)
        await page.goto('http://localhost:5173/login?oobCode=SIMULATED_TEST_CODE_123');
        await page.waitForLoadState('networkidle');
        
        // CA_20_01: Pantalla de nueva contraseña visible
        await expect(page.locator('h2:has-text("Nueva Contraseña")')).toBeVisible({ timeout: 5000 });

        // CA_20_02: Validar campos vacíos o contraseñas que no coinciden
        await page.locator('button:has-text("Guardar Nueva Clave")').click({ force: true });
        await expect(page.locator('text=/La contraseña es obligatoria/i')).toBeVisible();

        const inputs = page.locator('input[type="password"]');
        await inputs.nth(0).fill('NuevaClave123!');
        await inputs.nth(1).fill('ClaveDiferente!');
        await page.locator('button:has-text("Guardar Nueva Clave")').click({ force: true });
        await expect(page.locator('text=/no coinciden/i')).toBeVisible();

        // CA_20_03: Enviar formulario correcto (dará error porque el oobCode simulado no es válido en Firebase)
        await inputs.nth(1).fill('NuevaClave123!');
        await page.locator('button:has-text("Guardar Nueva Clave")').click({ force: true });
        
        await expect(page.locator('text=/expirado|inválido/i')).toBeVisible({ timeout: 8000 });
    });
});
