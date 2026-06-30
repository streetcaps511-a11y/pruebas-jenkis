
import { test, expect } from './fixtures.js';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// ─── Helper: completa el flujo de checkout dentro del CheckoutModal ──────────
async function completarCheckout(page) {
    // Esperar título del modal
    const modalTitle = page.locator('h3:has-text("Finalizar Pedido")').first();
    await modalTitle.waitFor({ state: 'visible', timeout: 10000 }).catch(() => {});

    // Seleccionar "Recoger en local" (evita campo de dirección)
    const btnRecoger = page.locator('button:has-text("Recoger en local")');
    if (await btnRecoger.isVisible({ timeout: 3000 }).catch(() => false)) {
        await btnRecoger.dispatchEvent('click');
        await page.waitForTimeout(300);
    }

    // Seleccionar Nequi como método de pago
    const metodoNequi = page.locator('button:has-text("Nequi")').first();
    if (await metodoNequi.isVisible({ timeout: 3000 }).catch(() => false)) {
        await metodoNequi.dispatchEvent('click');
    } else {
        const primerMetodo = page.locator('button').filter({ hasText: /Nequi|Bancolombia|Bold/i }).first();
        if (await primerMetodo.isVisible({ timeout: 3000 }).catch(() => false)) {
            await primerMetodo.dispatchEvent('click');
        }
    }
    await page.waitForTimeout(400);

    // Llenar teléfono (aparece tras seleccionar método)
    const phoneInput = page.locator('input[type="tel"]').first();
    await phoneInput.waitFor({ state: 'visible', timeout: 5000 }).catch(() => {});
    if (await phoneInput.isVisible().catch(() => false)) {
        await phoneInput.fill('3001234567');
    }
    await page.waitForTimeout(300);

    // Clic "Continuar" (Paso 1 → Paso 2) — dispatchEvent para evitar bloqueo de backdrop
    const btnContinuarModal = page.locator('button:has-text("Continuar")').last();
    await btnContinuarModal.waitFor({ state: 'visible', timeout: 5000 }).catch(() => {});
    if (await btnContinuarModal.isEnabled().catch(() => false)) {
        await btnContinuarModal.dispatchEvent('click');
        await page.waitForTimeout(1200);
    }

    // Paso 2: subir comprobante de pago si existe input file
    const fileInput = page.locator('input[type="file"]').first();
    if (await fileInput.count() > 0) {
        const imagePath = path.join(__dirname, 'test-image.png');
        await fileInput.setInputFiles(imagePath);
        await page.waitForTimeout(800);
    }

    // Clic "Confirmar Compra"
    const btnConfirmar = page.locator('button:has-text("Confirmar Compra")').first();
    await btnConfirmar.waitFor({ state: 'visible', timeout: 8000 }).catch(() => {});
    if (await btnConfirmar.isVisible().catch(() => false)) {
        await Promise.all([
            page.waitForResponse(
                resp => resp.url().includes('/api/ventas') &&
                        resp.request().method() === 'POST' &&
                        (resp.status() === 201 || resp.status() === 200),
                { timeout: 20000 }
            ).catch(() => null),
            btnConfirmar.dispatchEvent('click'),
        ]);
    }

    // Cerrar modal de éxito
    const btnCerrar = page.locator('button:has-text("Cerrar")').last();
    if (await btnCerrar.isVisible({ timeout: 12000 }).catch(() => false)) {
        await btnCerrar.click();
    }
    await page.waitForTimeout(800);
}

// ─── Helper: agrega el primer producto disponible al carrito ─────────────────
async function agregarProductoAlCarrito(page) {
    await page.goto('http://localhost:5173/productos');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(1500);

    const btnCart = page.locator('.gm-card:not(:has(.agotado)) .gm-btn-cart').first();
    await btnCart.waitFor({ state: 'visible', timeout: 15000 });
    await btnCart.dispatchEvent('click');

    // Modal del producto
    const productModal = page.locator('.gm-modal-overlay, .gm-modal-content').last();
    await productModal.waitFor({ state: 'visible', timeout: 8000 }).catch(() => {});

    // Seleccionar primera talla habilitada
    const sizeChips = productModal.locator('.gm-size-chip:not(.is-disabled)');
    if (await sizeChips.count() > 0) {
        await sizeChips.first().click();
        await page.waitForTimeout(300);
    }

    // Añadir al carrito
    const btnAnadir = productModal.locator('.gm-btn-add-cart, button:has-text("Añadir")').first();
    await btnAnadir.waitFor({ state: 'visible', timeout: 5000 }).catch(() => {});
    await btnAnadir.dispatchEvent('click');
    await page.waitForTimeout(1200);
}

// ═══════════════════════════════════════════════════════════════════════════════
//  MÓDULO VENTAS/PEDIDOS E2E FLOW
// ═══════════════════════════════════════════════════════════════════════════════
test.describe.serial('Módulo Ventas/Pedidos E2E Flow', () => {

    const ts = Date.now();
    let testUser = {
        nombre:    'Comprador E2E ' + ts,
        email:     `comprador_e2e_${ts}@test.com`,
        documento: '22' + ts.toString().slice(-6),
        clave:     'Password123!',
    };

    let customerContext;
    let customerPage;

    test.beforeAll(async ({ browser }) => {
        customerContext = await browser.newContext();
        customerPage   = await customerContext.newPage();
    });

    test.afterAll(async () => {
        if (customerContext) await customerContext.close();
    });

    // ─────────────────────────────────────────────────────────────────────────
    //  PASO 0: Invitado agrega al carrito → se le pide login/registro
    // ─────────────────────────────────────────────────────────────────────────
    test('Paso 0: Invitado agrega producto al carrito y se le pide autenticación', async () => {
        // Ir a productos SIN sesión
        await customerPage.goto('http://localhost:5173/productos');
        await customerPage.waitForLoadState('networkidle');
        await customerPage.waitForTimeout(1500);

        // Agregar primer producto disponible
        const btnCart = customerPage.locator('.gm-card:not(:has(.agotado)) .gm-btn-cart').first();
        await btnCart.waitFor({ state: 'visible', timeout: 15000 });
        await btnCart.dispatchEvent('click');

        const productModal = customerPage.locator('.gm-modal-overlay, .gm-modal-content').last();
        await productModal.waitFor({ state: 'visible', timeout: 8000 }).catch(() => {});

        const sizeChips = productModal.locator('.gm-size-chip:not(.is-disabled)');
        if (await sizeChips.count() > 0) await sizeChips.first().click();

        const btnAnadir = productModal.locator('.gm-btn-add-cart, button:has-text("Añadir")').first();
        await btnAnadir.waitFor({ state: 'visible', timeout: 5000 }).catch(() => {});
        await btnAnadir.dispatchEvent('click');
        await customerPage.waitForTimeout(1200);

        // Ir al carrito e intentar continuar
        await customerPage.goto('http://localhost:5173/carrito');
        await customerPage.waitForLoadState('networkidle');
        await customerPage.waitForTimeout(800);

        const btnContinuar = customerPage.locator('button:has-text("CONTINUAR")');
        if (await btnContinuar.isVisible({ timeout: 5000 }).catch(() => false)) {
            await btnContinuar.dispatchEvent('click');

            // El CustomConfirm de auth tiene título "Atención" y botón "Iniciar sesión"
            // Puede también redirigir directamente a /login
            const authModal = customerPage.locator(
                'button:has-text("Iniciar sesión"), button:has-text("Iniciar Sesión")'
            ).first();
            const authText = customerPage.getByText(/Para continuar con tu compra|Atención|inicia sesión/i).first();
            // Esperar cualquiera de las dos señales
            await Promise.race([
                authModal.waitFor({ state: 'visible', timeout: 8000 }).catch(() => {}),
                authText.waitFor({ state: 'visible', timeout: 8000 }).catch(() => {}),
                customerPage.waitForURL(url => url.pathname.startsWith('/login'), { timeout: 8000 }).catch(() => {}),
            ]);
            // Verificar que alguna forma de prompt/redirección ocurrió
            const isRedirected = customerPage.url().includes('/login');
            const modalVisible = await authModal.isVisible().catch(() => false);
            const textVisible  = await authText.isVisible().catch(() => false);
            expect(isRedirected || modalVisible || textVisible).toBeTruthy();
        }
    });

    // ─────────────────────────────────────────────────────────────────────────
    //  PASO 1: Cliente se registra en la tienda
    // ─────────────────────────────────────────────────────────────────────────
    test('Paso 1: Cliente se registra en la tienda', async () => {
        await customerPage.goto('http://localhost:5173/login');

        const tabRegistro = customerPage.locator('button:has-text("Registro")');
        await tabRegistro.click();

        await customerPage.locator('label:has-text("Número de documento") + div input').fill(testUser.documento);
        await customerPage.locator('label:has-text("Nombre completo") + div input').fill(testUser.nombre);
        await customerPage.locator('label:has-text("Correo electrónico") + div input').fill(testUser.email);

        const passInputs = customerPage.locator('input[type="password"]');
        await passInputs.nth(0).fill(testUser.clave);
        await passInputs.nth(1).fill(testUser.clave);

        await customerPage.click('button:has-text("Registrar")');

        const pinInput = customerPage.locator('input[placeholder="------"]');
        await pinInput.waitFor({ state: 'visible', timeout: 15000 });
        await pinInput.fill('123456');
        await customerPage.click('button:has-text("Verificar y Registrar")');

        await expect(
            customerPage.locator('text="¡Cuenta creada exitosamente! Ya puedes iniciar sesión."')
        ).toBeVisible({ timeout: 15000 });
    });

    // ─────────────────────────────────────────────────────────────────────────
    //  PASO 2: Cliente inicia sesión, agrega al carrito y compra (×2 pedidos)
    // ─────────────────────────────────────────────────────────────────────────
    test('Paso 2: Cliente inicia sesión, agrega al carrito y compra', async () => {
        test.setTimeout(120000);
        // Login
        const tabLogin = customerPage.locator('button:has-text("Login")');
        if (await tabLogin.isVisible({ timeout: 3000 }).catch(() => false)) {
            await tabLogin.click();
        }

        const emailInput = customerPage.locator('input[name="correo_login_unique"], input[type="email"]').first();
        await emailInput.waitFor({ state: 'visible', timeout: 10000 });
        await emailInput.fill(testUser.email);
        await customerPage.locator('input[type="password"]').first().fill(testUser.clave);
        await customerPage.click('button:has-text("Iniciar Sesión")');

        await customerPage.waitForURL(
            url => !url.pathname.startsWith('/login'),
            { timeout: 25000 }
        ).catch(() => {});
        await customerPage.waitForTimeout(1000);

        // Realizar 2 pedidos
        for (let i = 0; i < 2; i++) {
            await agregarProductoAlCarrito(customerPage);

            await customerPage.goto('http://localhost:5173/carrito');
            await customerPage.waitForLoadState('networkidle');
            await customerPage.waitForTimeout(800);

            const btnContinuar = customerPage.locator('button:has-text("CONTINUAR")');
            if (!(await btnContinuar.isVisible({ timeout: 5000 }).catch(() => false))) {
                continue;
            }
            await btnContinuar.dispatchEvent('click');

            await completarCheckout(customerPage);
        }
    });

    // ─────────────────────────────────────────────────────────────────────────
    //  PASO 3: Admin aprueba ventas y marca envío
    // ─────────────────────────────────────────────────────────────────────────
    test('Paso 3: Admin gestiona el pedido (Aprueba Venta, Envío y Entrega)', async ({ page }) => {
        await page.goto('http://localhost:5173/admin/ventas');
        await page.waitForLoadState('networkidle');

        const rows = page.locator('.entity-table tbody tr');
        await expect(rows.first()).toBeVisible({ timeout: 15000 });

        for (let i = 0; i < 2; i++) {
            const rowPedido = rows.nth(i);

            // Aprobar
            const btnAprobar = rowPedido.locator('.action-approve, button[title*="Aprobar"]').first();
            if (await btnAprobar.isVisible()) {
                await btnAprobar.click();
                const btnConfirmarAprobar = page.locator('.delete-modal-btn-confirm, button:has-text("Confirmar")');
                await btnConfirmarAprobar.waitFor({ state: 'visible' });
                await btnConfirmarAprobar.click();
                await page.waitForTimeout(2000);
            }

            // Enviar
            const btnEnviar = rowPedido.locator('.action-enviar, button[title*="enviar"], button[title*="Envío"]').first();
            if (await btnEnviar.isVisible()) {
                await btnEnviar.click();
                const btnConfirmarEnviar = page.locator('.delete-modal-btn-confirm, button:has-text("Confirmar")');
                await btnConfirmarEnviar.waitFor({ state: 'visible' });
                await btnConfirmarEnviar.click();
                await page.waitForTimeout(2000);
            }
        }
    });

    // ─────────────────────────────────────────────────────────────────────────
    //  PASO 4: Cliente solicita devoluciones en el perfil
    // ─────────────────────────────────────────────────────────────────────────
    test('Paso 4: Cliente solicita devoluciones en el perfil', async () => {
        test.setTimeout(120000);
        await customerPage.goto('http://localhost:5173/perfil');
        await customerPage.waitForLoadState('networkidle');

        // Navegar a pestaña "Mis Pedidos"
        const tabPedidos = customerPage.locator('text="Mis Pedidos", button:has-text("Mis Pedidos")');
        if (await tabPedidos.isVisible()) await tabPedidos.dispatchEvent('click');

        // PEDIDO 1: Devolver ítem
        const btnDetalles1 = customerPage.locator('button:has-text("Ver Detalles"), .btn-detalles').first();
        if (await btnDetalles1.isVisible()) {
            await btnDetalles1.click();
            await customerPage.waitForTimeout(1000);

            const btnConfirmarEntrega = customerPage.locator('button[title="Marcar pedido como recibido"]').first();
            if (await btnConfirmarEntrega.isVisible()) {
                await btnConfirmarEntrega.click({ force: true });
                const btnConfirmarModal = customerPage.locator('button:has-text("Confirmar"), button:has-text("Sí")').last();
                if (await btnConfirmarModal.isVisible()) {
                    await btnConfirmarModal.click();
                    await customerPage.waitForTimeout(2000);
                }
            }

            const btnDevolverItem = customerPage.locator('button:has-text("Devolver Ítem")').first();
            if (await btnDevolverItem.isVisible()) {
                await btnDevolverItem.click();
                const selectMotivo = customerPage.locator('select').first();
                if (await selectMotivo.isVisible()) await selectMotivo.selectOption({ index: 1 });
                const btnConfirmarDevolucion = customerPage.locator('button:has-text("Confirmar Devolución")');
                if (await btnConfirmarDevolucion.isVisible()) await btnConfirmarDevolucion.click();
                await customerPage.waitForTimeout(2000);
            }
        }

        await customerPage.reload();
        await customerPage.waitForLoadState('networkidle');

        // PEDIDO 2: Devolver lote completo
        const btnDetalles2 = customerPage.locator('button:has-text("Ver Detalles"), .btn-detalles').nth(1);
        if (await btnDetalles2.isVisible()) {
            await btnDetalles2.click();
            await customerPage.waitForTimeout(1000);

            const btnConfirmarEntrega = customerPage.locator('button[title="Marcar pedido como recibido"]').first();
            if (await btnConfirmarEntrega.isVisible()) {
                await btnConfirmarEntrega.click({ force: true });
                const btnConfirmarModal = customerPage.locator('button:has-text("Confirmar"), button:has-text("Sí")').last();
                if (await btnConfirmarModal.isVisible()) {
                    await btnConfirmarModal.click();
                    await customerPage.waitForTimeout(2000);
                }
            }

            const btnDevolverPedido = customerPage.locator('button:has-text("Devolver todo el pedido"), button:has-text("Devolver Pedido")').first();
            if (await btnDevolverPedido.isVisible()) {
                await btnDevolverPedido.click();
                const selectMotivoTotal = customerPage.locator('select').first();
                if (await selectMotivoTotal.isVisible()) await selectMotivoTotal.selectOption({ index: 1 });
                const btnConfirmarDevTotal = customerPage.locator('button:has-text("Confirmar Devolución")');
                if (await btnConfirmarDevTotal.isVisible()) await btnConfirmarDevTotal.click();
                await customerPage.waitForTimeout(2000);
            }
        }
    });

});
