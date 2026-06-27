import { test, expect } from '@playwright/test';

test.describe('Módulo Acceso', () => {
    
    test('HU_17: Iniciar sesión con credenciales válidas e inválidas', async ({ page }) => {
        // Navegar a la página de inicio de sesión
        await page.goto('http://localhost:5173/login');
        await page.waitForLoadState('networkidle');

        // CA_17_02: Credenciales inválidas
        await page.fill('input[type="email"]', 'usuario.invalido@test.com');
        await page.fill('input[type="password"]', 'ClaveIncorrecta123');
        await page.click('button[type="submit"]');

        // Verificar mensaje de error
        await expect(page.locator('.alert-container, .error-message')).toBeVisible({ timeout: 5000 });
        await expect(page.locator('.alert-container, .error-message')).toContainText(/error|incorrect|invalid/i);

        // CA_17_01: Credenciales válidas (Asumiendo admin predeterminado para la prueba E2E)
        await page.fill('input[type="email"]', 'duvan@gmail.com');
        await page.fill('input[type="password"]', 'Duvan12345');
        await page.click('button[type="submit"]');

        // Verificar redirección al dashboard/admin
        await page.waitForURL('**/admin**', { timeout: 8000 });
        await expect(page.url()).toContain('/admin');
    });

    test('HU_18: Cerrar sesión', async ({ page }) => {
        // Pre-condición: Iniciar sesión primero
        await page.goto('http://localhost:5173/login');
        await page.fill('input[type="email"]', 'duvan@gmail.com');
        await page.fill('input[type="password"]', 'Duvan12345');
        await page.click('button[type="submit"]');
        await page.waitForURL('**/admin**');

        // CA_18_01 y CA_18_02: Cerrar sesión
        // Localizar el botón de cerrar sesión en el menú o header
        // Asumiendo que hay un botón con texto "Cerrar sesión" o un ícono específico
        const logoutBtn = page.locator('button:has-text("Cerrar"), a:has-text("Cerrar"), .logout-btn, [title*="Cerrar"]');
        await logoutBtn.first().click();

        // Si hay un modal de confirmación, aceptarlo
        const confirmLogout = page.locator('button:has-text("Sí"), button:has-text("Confirmar")');
        if (await confirmLogout.isVisible()) {
            await confirmLogout.click();
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
        
        // CA_19_01: Enlace de recuperación visible y clickeable
        const forgotPwdLink = page.locator('a:has-text("Olvidaste"), a:has-text("Recuperar")');
        await expect(forgotPwdLink).toBeVisible();
        await forgotPwdLink.click();

        // Verificar que estamos en la pantalla de recuperación
        await expect(page.locator('text=/Recuperar|Restablecer/i')).toBeVisible({ timeout: 5000 });

        // CA_19_02: Ingresar correo y enviar
        const emailInput = page.locator('input[type="email"]');
        await expect(emailInput).toBeVisible();
        await emailInput.fill('duvan@gmail.com');
        
        // Clic en enviar/recuperar
        await page.locator('button[type="submit"]').click();

        // Verificar mensaje de confirmación de envío (dependiendo de la UI, puede ser un alert o cambio de estado)
        await expect(page.locator('.alert-container, .success-message, text=/correo|instrucciones/i').first()).toBeVisible({ timeout: 8000 });
    });
});
