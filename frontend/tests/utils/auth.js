export const CREDENCIALES_ADMIN = {
    correo: 'duvann1991@gmail.com',
    clave: 'AdminGM2024!Secure'
};

/**
 * Inicia sesión como administrador en la aplicación.
 * Esta función puede ser importada en cualquier módulo de pruebas.
 * @param {import('@playwright/test').Page} page - La página de Playwright
 */
export async function loginComoAdmin(page) {
    // 1. Ir a la página de login
    await page.goto('http://localhost:5173/login');

    // 2. Llenar los campos usando las credenciales centralizadas
    await page.fill('input[name="correo_login_unique"]', CREDENCIALES_ADMIN.correo);
    await page.fill('input[name="clave_login_unique"]', CREDENCIALES_ADMIN.clave);

    // 3. Clic en iniciar sesión
    await page.click('button:has-text("Ingresar")');

    // 4. Esperar a que la navegación al dashboard se complete
    await page.waitForURL('**/admin/dashboard');
}
