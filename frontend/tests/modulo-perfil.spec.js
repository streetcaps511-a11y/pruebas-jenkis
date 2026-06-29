/**
 * MÓDULO PERFIL DE CLIENTE (TIENDA)
 *
 * Flujo:
 *  Setup 1: Registrar + loguear un cliente de prueba
 *  Setup 2: Crear un pedido (para tener datos en el perfil)
 *  Setup 3: Admin aprueba + envía el pedido
 *  HU_Perfil_01 – Ver dashboard y navegar pestañas del perfil
 *  HU_Perfil_02 – Ver listado de pedidos
 *  HU_Perfil_03 – Ver detalle de un pedido
 *  HU_Perfil_04 – Confirmar entrega de un pedido (marcar como recibido)
 *  HU_Perfil_05 – Solicitar devolución de ítem desde el perfil
 *  HU_Perfil_06 – Ver historial de devoluciones
 */

import { test, expect } from './fixtures.js';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname  = path.dirname(__filename);
const BASE       = 'http://localhost:5173';

// ─── Helpers reutilizables ────────────────────────────────────────────────────

async function agregarProductoAlCarrito(page) {
    await page.goto(`${BASE}/productos`);
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(1500);

    const btnCart = page.locator('.gm-card:not(:has(.agotado)) .gm-btn-cart').first();
    await btnCart.waitFor({ state: 'visible', timeout: 15000 });
    await btnCart.dispatchEvent('click');

    const productModal = page.locator('.gm-modal-overlay, .gm-modal-content').last();
    await productModal.waitFor({ state: 'visible', timeout: 8000 }).catch(() => {});

    const sizeChips = productModal.locator('.gm-size-chip:not(.is-disabled)');
    if (await sizeChips.count() > 0) {
        await sizeChips.first().click();
        await page.waitForTimeout(300);
    }

    const btnAnadir = productModal.locator('.gm-btn-add-cart, button:has-text("Añadir")').first();
    await btnAnadir.waitFor({ state: 'visible', timeout: 5000 }).catch(() => {});
    await btnAnadir.dispatchEvent('click');
    await page.waitForTimeout(1200);
}

async function completarCheckout(page) {
    const modalTitle = page.locator('h3:has-text("Finalizar Pedido")').first();
    await modalTitle.waitFor({ state: 'visible', timeout: 10000 }).catch(() => {});

    const btnRecoger = page.locator('button:has-text("Recoger en local")');
    if (await btnRecoger.isVisible({ timeout: 3000 }).catch(() => false)) {
        await btnRecoger.dispatchEvent('click');
        await page.waitForTimeout(300);
    }

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

    const phoneInput = page.locator('input[type="tel"]').first();
    await phoneInput.waitFor({ state: 'visible', timeout: 5000 }).catch(() => {});
    if (await phoneInput.isVisible().catch(() => false)) {
        await phoneInput.fill('3001234567');
    }
    await page.waitForTimeout(300);

    const btnContinuarModal = page.locator('button:has-text("Continuar")').last();
    await btnContinuarModal.waitFor({ state: 'visible', timeout: 5000 }).catch(() => {});
    if (await btnContinuarModal.isEnabled().catch(() => false)) {
        await btnContinuarModal.dispatchEvent('click');
        await page.waitForTimeout(1200);
    }

    const fileInput = page.locator('input[type="file"]').first();
    if (await fileInput.count() > 0) {
        await fileInput.setInputFiles(path.join(__dirname, 'test-image.png'));
        await page.waitForTimeout(800);
    }

    const btnConfirmar = page.locator('button:has-text("Confirmar Compra")').first();
    await btnConfirmar.waitFor({ state: 'visible', timeout: 8000 }).catch(() => {});
    if (await btnConfirmar.isVisible().catch(() => false)) {
        await Promise.all([
            page.waitForResponse(
                r => r.url().includes('/api/ventas') && r.request().method() === 'POST' &&
                     (r.status() === 201 || r.status() === 200),
                { timeout: 20000 }
            ).catch(() => null),
            btnConfirmar.dispatchEvent('click'),
        ]);
    }

    const btnCerrar = page.locator('button:has-text("Cerrar")').last();
    if (await btnCerrar.isVisible({ timeout: 12000 }).catch(() => false)) {
        await btnCerrar.click();
    }
    await page.waitForTimeout(800);
}

// ═══════════════════════════════════════════════════════════════════════════════
//  DESCRIBE SERIAL (flujo E2E del perfil del cliente)
// ═══════════════════════════════════════════════════════════════════════════════
test.describe.serial('Módulo Perfil de Cliente', () => {

    const ts = Date.now();
    const testUser = {
        nombre:    'Perfil E2E ' + ts,
        email:     `perfil_e2e_${ts}@test.com`,
        documento: '33' + ts.toString().slice(-6),
        clave:     'Password123!',
    };

    let clientContext;
    let clientPage;

    test.beforeAll(async ({ browser }) => {
        clientContext = await browser.newContext();
        clientPage    = await clientContext.newPage();
    });

    test.afterAll(async () => {
        if (clientContext) await clientContext.close();
    });

    // ─── Setup 1: Registro del cliente ───────────────────────────────────────
    test('Setup 1: Registrar cliente de prueba para perfil', async () => {
        await clientPage.goto(`${BASE}/login`);
        await clientPage.locator('button:has-text("Registro")').click();

        await clientPage.locator('label:has-text("Número de documento") + div input').fill(testUser.documento);
        await clientPage.locator('label:has-text("Nombre completo") + div input').fill(testUser.nombre);
        await clientPage.locator('label:has-text("Correo electrónico") + div input').fill(testUser.email);

        const passInputs = clientPage.locator('input[type="password"]');
        await passInputs.nth(0).fill(testUser.clave);
        await passInputs.nth(1).fill(testUser.clave);

        await clientPage.click('button:has-text("Registrar")');

        const pinInput = clientPage.locator('input[placeholder="------"]');
        await pinInput.waitFor({ state: 'visible', timeout: 15000 });
        await pinInput.fill('123456');
        await clientPage.click('button:has-text("Verificar y Registrar")');

        await expect(
            clientPage.locator('text="¡Cuenta creada exitosamente! Ya puedes iniciar sesión."')
        ).toBeVisible({ timeout: 15000 });
    });

    // ─── Setup 2: Login + Pedido ──────────────────────────────────────────────
    test('Setup 2: Cliente inicia sesión y realiza un pedido', async () => {
        const tabLogin = clientPage.locator('button:has-text("Login")');
        if (await tabLogin.isVisible({ timeout: 3000 }).catch(() => false)) {
            await tabLogin.click();
        }
        const emailInput = clientPage.locator('input[name="correo_login_unique"], input[type="email"]').first();
        await emailInput.waitFor({ state: 'visible', timeout: 10000 });
        await emailInput.fill(testUser.email);
        await clientPage.locator('input[type="password"]').first().fill(testUser.clave);
        await clientPage.click('button:has-text("Iniciar Sesión")');
        await clientPage.waitForURL(url => !url.pathname.startsWith('/login'), { timeout: 25000 }).catch(() => {});
        await clientPage.waitForTimeout(1000);

        // Agregar producto y comprar
        await agregarProductoAlCarrito(clientPage);
        await clientPage.goto(`${BASE}/carrito`);
        await clientPage.waitForLoadState('networkidle');
        await clientPage.waitForTimeout(800);

        const btnContinuar = clientPage.locator('button:has-text("CONTINUAR")');
        if (await btnContinuar.isVisible({ timeout: 5000 }).catch(() => false)) {
            await btnContinuar.dispatchEvent('click');
            await completarCheckout(clientPage);
        }
    });

    // ─── Setup 3: Admin aprueba y envía el pedido ─────────────────────────────
    test('Setup 3: Admin aprueba y envía el pedido del cliente', async ({ page }) => {
        await page.goto(`${BASE}/admin/ventas`);
        await page.waitForLoadState('networkidle');

        const rows = page.locator('.entity-table tbody tr');
        await expect(rows.first()).toBeVisible({ timeout: 15000 });

        const rowPedido = rows.first();

        const btnAprobar = rowPedido.locator('.action-approve, button[title*="Aprobar"]').first();
        if (await btnAprobar.isVisible()) {
            await btnAprobar.click();
            const btnConfirmarAprobar = page.locator('.delete-modal-btn-confirm, button:has-text("Confirmar")');
            await btnConfirmarAprobar.waitFor({ state: 'visible' });
            await btnConfirmarAprobar.click();
            await page.waitForTimeout(2000);
        }

        const btnEnviar = rowPedido.locator('.action-enviar, button[title*="enviar"], button[title*="Envío"]').first();
        if (await btnEnviar.isVisible()) {
            await btnEnviar.click();
            const btnConfirmarEnviar = page.locator('.delete-modal-btn-confirm, button:has-text("Confirmar")');
            await btnConfirmarEnviar.waitFor({ state: 'visible' });
            await btnConfirmarEnviar.click();
            await page.waitForTimeout(2000);
        }
    });

    // ─────────────────────────────────────────────────────────────────────────
    //  HU_Perfil_01: Dashboard y navegación de pestañas
    // ─────────────────────────────────────────────────────────────────────────
    test('HU_Perfil_01: Cargar página de perfil y navegar pestañas', async () => {
        await clientPage.goto(`${BASE}/perfil`);
        await clientPage.waitForLoadState('networkidle');
        await clientPage.waitForTimeout(800);

        // En la vista de cliente debe renderizar la página de perfil
        // Usar solo clases específicas del componente (sin [class*="profile"] que es demasiado amplio)
        const profilePage = clientPage.locator('.gm-profile-page, .gm-profile-layout, .gm-profile-main');
        await expect(profilePage.first()).toBeVisible({ timeout: 10000 });

        // Sidebar del perfil visible
        const sidebar = clientPage.locator('.gm-profile-sidebar').first();
        await expect(sidebar).toBeVisible({ timeout: 5000 });

        // Navegar pestaña Información
        const tabInfo = clientPage.locator(
            'button:has-text("Información"), button:has-text("Mis datos"), [data-tab="info"]'
        ).first();
        if (await tabInfo.isVisible()) { await tabInfo.click(); await clientPage.waitForTimeout(500); }

        // Navegar pestaña Mis Pedidos
        const tabPedidos = clientPage.locator(
            'button:has-text("Mis Pedidos"), button:has-text("Pedidos"), [data-tab="orders"]'
        ).first();
        if (await tabPedidos.isVisible()) { await tabPedidos.click(); await clientPage.waitForTimeout(500); }

        // Navegar pestaña Devoluciones
        const tabDev = clientPage.locator(
            'button:has-text("Devoluciones"), button:has-text("Mis Devoluciones"), [data-tab="returns"]'
        ).first();
        if (await tabDev.isVisible()) { await tabDev.click(); await clientPage.waitForTimeout(500); }
    });

    // ─────────────────────────────────────────────────────────────────────────
    //  HU_Perfil_02: Listado de pedidos
    // ─────────────────────────────────────────────────────────────────────────
    test('HU_Perfil_02: Ver listado de pedidos en el perfil', async () => {
        await clientPage.goto(`${BASE}/perfil`);
        await clientPage.waitForLoadState('networkidle');
        await clientPage.waitForTimeout(800);

        const tabPedidos = clientPage.locator(
            'button:has-text("Mis Pedidos"), button:has-text("Pedidos")'
        ).first();
        if (await tabPedidos.isVisible({ timeout: 5000 }).catch(() => false)) {
            await tabPedidos.click();
            await clientPage.waitForTimeout(800);
        }

        const ordersList = clientPage.locator('.orders-section, [class*="order"], .gm-orders, .entity-table').first();
        const emptyMsg   = clientPage.getByText(/No tienes pedidos|Sin pedidos/i).first();
        const sectionVisible = await ordersList.isVisible({ timeout: 6000 }).catch(() => false);
        const emptyVisible   = await emptyMsg.isVisible({ timeout: 3000 }).catch(() => false);
        expect(sectionVisible || emptyVisible).toBeTruthy();
    });

    // ─────────────────────────────────────────────────────────────────────────
    //  HU_Perfil_03: Detalle de pedido
    // ─────────────────────────────────────────────────────────────────────────
    test('HU_Perfil_03: Abrir detalle de un pedido desde el perfil', async () => {
        await clientPage.goto(`${BASE}/perfil`);
        await clientPage.waitForLoadState('networkidle');
        await clientPage.waitForTimeout(800);

        const tabPedidos = clientPage.locator(
            'button:has-text("Mis Pedidos"), button:has-text("Pedidos")'
        ).first();
        if (await tabPedidos.isVisible({ timeout: 5000 }).catch(() => false)) {
            await tabPedidos.click();
            await clientPage.waitForTimeout(800);
        }

        const btnVerDetalles = clientPage.locator(
            'button:has-text("Ver Detalles"), .btn-detalles, button:has-text("Detalles")'
        ).first();
        if (await btnVerDetalles.isVisible({ timeout: 6000 }).catch(() => false)) {
            await btnVerDetalles.click();
            await clientPage.waitForTimeout(1000);

            const detalle = clientPage.locator('[class*="detail"], [class*="order-detail"]')
                .or(clientPage.getByText(/Estado|Pedido Nro|Total/i).first()).first();
            await expect(detalle).toBeVisible({ timeout: 8000 });

            const btnVolver = clientPage.locator(
                'button:has-text("Volver"), button:has-text("← Volver"), .btn-back'
            ).first();
            if (await btnVolver.isVisible()) await btnVolver.click();
        }
    });

    // ─────────────────────────────────────────────────────────────────────────
    //  HU_Perfil_04: Confirmar entrega
    // ─────────────────────────────────────────────────────────────────────────
    test('HU_Perfil_04: Confirmar entrega de un pedido desde el perfil', async () => {
        await clientPage.goto(`${BASE}/perfil`);
        await clientPage.waitForLoadState('networkidle');
        await clientPage.waitForTimeout(800);

        const tabPedidos = clientPage.locator(
            'button:has-text("Mis Pedidos"), button:has-text("Pedidos")'
        ).first();
        if (await tabPedidos.isVisible({ timeout: 5000 }).catch(() => false)) {
            await tabPedidos.click();
            await clientPage.waitForTimeout(800);
        }

        const btnVerDetalles = clientPage.locator(
            'button:has-text("Ver Detalles"), .btn-detalles'
        ).first();
        if (await btnVerDetalles.isVisible({ timeout: 6000 }).catch(() => false)) {
            await btnVerDetalles.click();
            await clientPage.waitForTimeout(1000);

            const btnConfirmarEntrega = clientPage.locator(
                'button[title="Marcar pedido como recibido"], button:has-text("Marcar como recibido"), button:has-text("Confirmar entrega")'
            ).first();

            if (await btnConfirmarEntrega.isVisible({ timeout: 3000 }).catch(() => false)) {
                await btnConfirmarEntrega.click({ force: true });
                await clientPage.waitForTimeout(500);

                const btnConfirmarModal = clientPage.locator(
                    'button:has-text("Confirmar"), button:has-text("Sí"), .delete-modal-btn-confirm'
                ).last();
                if (await btnConfirmarModal.isVisible()) {
                    await btnConfirmarModal.click();
                    await clientPage.waitForTimeout(2000);
                }
            }
        }
    });

    // ─────────────────────────────────────────────────────────────────────────
    //  HU_Perfil_05: Solicitar devolución de ítem
    // ─────────────────────────────────────────────────────────────────────────
    test('HU_Perfil_05: Solicitar devolución de ítem desde el perfil del cliente', async () => {
        await clientPage.goto(`${BASE}/perfil`);
        await clientPage.waitForLoadState('networkidle');
        await clientPage.waitForTimeout(800);

        const tabPedidos = clientPage.locator(
            'button:has-text("Mis Pedidos"), button:has-text("Pedidos")'
        ).first();
        if (await tabPedidos.isVisible({ timeout: 5000 }).catch(() => false)) {
            await tabPedidos.click();
            await clientPage.waitForTimeout(800);
        }

        const btnVerDetalles = clientPage.locator(
            'button:has-text("Ver Detalles"), .btn-detalles'
        ).first();
        if (await btnVerDetalles.isVisible({ timeout: 6000 }).catch(() => false)) {
            await btnVerDetalles.click();
            await clientPage.waitForTimeout(1000);

            const btnDevolverItem = clientPage.locator(
                'button:has-text("Devolver Ítem"), button:has-text("Devolver ítem")'
            ).first();

            if (await btnDevolverItem.isVisible({ timeout: 3000 }).catch(() => false)) {
                await btnDevolverItem.click();
                await clientPage.waitForTimeout(500);

                const selectMotivo = clientPage.locator('select').first();
                if (await selectMotivo.isVisible({ timeout: 3000 }).catch(() => false)) {
                    await selectMotivo.selectOption({ index: 1 });
                }

                const btnConfirmarDevolucion = clientPage.locator(
                    'button:has-text("Confirmar Devolución"), button:has-text("Confirmar devolución")'
                ).first();
                if (await btnConfirmarDevolucion.isVisible()) {
                    await Promise.all([
                        clientPage.waitForResponse(
                            r => r.url().includes('/api/devoluciones') && r.request().method() === 'POST' &&
                                 (r.status() === 201 || r.status() === 200),
                            { timeout: 15000 }
                        ).catch(() => null),
                        btnConfirmarDevolucion.click(),
                    ]);
                    await clientPage.waitForTimeout(1500);
                }
            }
        }
    });

    // ─────────────────────────────────────────────────────────────────────────
    //  HU_Perfil_06: Historial de devoluciones
    // ─────────────────────────────────────────────────────────────────────────
    test('HU_Perfil_06: Ver sección de devoluciones en el perfil', async () => {
        await clientPage.goto(`${BASE}/perfil`);
        await clientPage.waitForLoadState('networkidle');
        await clientPage.waitForTimeout(800);

        const tabDevoluciones = clientPage.locator(
            'button:has-text("Devoluciones"), button:has-text("Mis Devoluciones")'
        ).first();

        if (await tabDevoluciones.isVisible({ timeout: 5000 }).catch(() => false)) {
            await tabDevoluciones.click();
            await clientPage.waitForTimeout(800);

            const returnsSection = clientPage.locator('[class*="return"], .gm-returns').first();
            const emptyMsg       = clientPage.getByText(/No hay devoluciones|Sin devoluciones/i).first();
            const sectionVisible = await returnsSection.isVisible({ timeout: 6000 }).catch(() => false);
            const emptyVisible   = await emptyMsg.isVisible({ timeout: 3000 }).catch(() => false);
            expect(sectionVisible || emptyVisible).toBeTruthy();
        }
    });

});
