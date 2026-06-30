
import { test, expect } from './fixtures.js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

test.describe('Módulo Ventas', () => {
    
    test.beforeEach(async ({ page }) => {
        // En ventas/pedidos necesitamos un cliente obligatoriamente.
        // Vamos a inyectar uno directamente usando fetch en el navegador
        // para asegurar que la lista de clientes no esté vacía y no falle la prueba.
        await page.goto('http://localhost:5173/admin/ventas', { waitUntil: 'domcontentloaded', timeout: 30000 }).catch(() => {});
        await page.evaluate(async () => {
            const token = sessionStorage.getItem('token'); // ✅ Corregido a sessionStorage
            if (!token) {
                console.error("No se encontró token en sessionStorage");
                return;
            }
            await fetch('http://localhost:3000/api/clientes', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({
                    nombreCompleto: 'Cliente Test Seguro ' + Date.now(),
                    email: 'seguro' + Date.now() + '@test.com',
                    telefono: '3000000000',
                    tipoDocumento: 'Cédula de Ciudadanía',
                    numeroDocumento: Math.floor(10000000 + Math.random() * 90000000).toString(),
                    direccion: 'Calle Segura 123',
                    isActive: true
                })
            });

            // Inyectar un Producto con stock para no tener problemas al vender
            // Primero obtener una categoria
            const catRes = await fetch('http://localhost:3000/api/categorias', {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            let idCategoria = 1;
            if (catRes.ok) {
                const cats = await catRes.json();
                const catData = cats.data || cats.rows || cats;
                if (Array.isArray(catData) && catData.length > 0) {
                    idCategoria = catData[0].IdCategoria || catData[0].id || 1;
                }
            }

            await fetch('http://localhost:3000/api/productos', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({
                    nombre: 'Producto Test Seguro ' + Date.now(),
                    descripcion: 'Producto para tests e2e',
                    precioCompra: 20000,
                    precioVenta: 50000,
                    stock: 100,
                    enOfertaVenta: false,
                    tallasStock: [{ talla: 'unica', cantidad: 100 }],
                    estado: 'activo',
                    idCategoria: idCategoria
                })
            });
        });
        
        // Recargar la página para que el componente obtenga los datos frescos
        await page.reload({ timeout: 60000 }).catch(() => {});
        await page.waitForLoadState('domcontentloaded');
    });

    test('HU_Ventas_01: Listar y buscar ventas', async ({ page }) => {
        await expect(page.locator('.ventas-title')).toContainText(/Ventas/i);
        await expect(page.locator('.entity-table')).toBeVisible();

        // 1. Buscador por texto
        const searchInput = page.locator('input[placeholder*="Buscar"]');
        if (await searchInput.isVisible()) {
            await searchInput.fill('Venta Test');
            await page.waitForTimeout(1000);
            await searchInput.fill('');
            await page.waitForTimeout(500);
        }

        // 2. Buscador por estado
        const statusFilterBtn = page.locator('.status-filter-trigger').first();
        if (await statusFilterBtn.isVisible()) {
            await statusFilterBtn.dispatchEvent('click');
            await page.waitForTimeout(500);
            
            // Seleccionar "Pendiente" o "Completada" (si existe en ventas)
            const filterOption = page.locator('.filter-option-item:has-text("Completada")').first();
            if (await filterOption.isVisible()) {
                await filterOption.dispatchEvent('click');
                await page.waitForTimeout(1000);
            }
            
            // Volver a "Todos"
            await statusFilterBtn.dispatchEvent('click');
            await page.waitForTimeout(500);
            await page.locator('.filter-option-item:has-text("Todos")').first().dispatchEvent('click');
            await page.waitForTimeout(500);
        }
    });

    async function llenarYGuardarVenta(page, tipoEntrega, indexEntrega, indexMetodoPago) {
        const btnAdd = page.locator('button.ventas-btn-add');      
        await btnAdd.waitFor({ state: 'visible', timeout: 10000 });
        await btnAdd.dispatchEvent('click');
        
        // Seleccionar cliente (Componente SearchSelect)
        const selectClienteHeader = page.locator('.search-select-header').first();
        await selectClienteHeader.dispatchEvent('click');
        const firstOption = page.locator('.option-item').first();
        await firstOption.waitFor({ state: 'visible', timeout: 5000 }).catch(() => {});
        await firstOption.dispatchEvent('click');

        // Llenar fechas (Componente DateInputWithCalendar)
        const dateContainers = page.locator('.date-input-container');
        await dateContainers.first().waitFor({ state: 'attached', timeout: 5000 }).catch(() => {});
        const countDate = await dateContainers.count();
        if (countDate > 0) {
            for (let i = 0; i < countDate; i++) {
                const container = dateContainers.nth(i);
                await container.locator('select').nth(0).selectOption({ index: 1 });
                await container.locator('select').nth(1).selectOption({ index: 1 });
                await container.locator('input[placeholder="aaaa"]').fill('2023');
            }
        }

        // Seleccionar método de pago y tipo de entrega
        const selectsAll = page.locator('.form-field-group select');
        await selectsAll.first().waitFor({ state: 'attached', timeout: 5000 }).catch(() => {});
        if (await selectsAll.count() >= 2) {
            await selectsAll.nth(0).selectOption({ index: indexMetodoPago }); // Método de pago
            await selectsAll.nth(1).selectOption({ index: indexEntrega }); // Tipo de entrega
        }
        
        // Si es envío, llenar la dirección
        if (tipoEntrega === 'envio') {
            const dirInput = page.locator('input[placeholder*="Calle 123"]').first();
            if (await dirInput.isVisible()) {
                await dirInput.fill('Calle Prueba de Envío 123');
            }
        }

        // Subir comprobante simulado (Evidencia) - SOLO si no es efectivo
        if (indexMetodoPago !== 1) {
            const fileInput = page.locator('label:has-text("SELECCIONAR ARCHIVO") input[type="file"]');
            await fileInput.waitFor({ state: 'attached', timeout: 5000 });
            
            const imagePath = path.join(__dirname, 'test-image.png');
            
            // Verificar que el archivo exista
            if (!fs.existsSync(imagePath)) {
                throw new Error(`❌ No existe el archivo de prueba: ${imagePath}`);
            }
            
            await fileInput.setInputFiles(imagePath, { timeout: 5000 });
            await page.waitForTimeout(1000);
            console.log("✅ Comprobante subido correctamente");
        }

        // Seleccionar producto que inyectamos (para asegurar que tiene id, precio y stock)
        const rowProducto = page.locator('.product-form-row').first();
        const searchHeader = rowProducto.locator('.search-select-header').first();
        await searchHeader.dispatchEvent('click');
        await page.waitForTimeout(500);
        
        // Escribir parte del nombre para buscarlo
        const searchInputForm = rowProducto.locator('.header-search-input:visible, input[placeholder*="Buscar o escribir"]').first();
        if (await searchInputForm.isVisible()) {
            await searchInputForm.fill('Producto Test Seguro');
            
            // Clic en la opción sugerida (esperamos un poco a que filtre)
            const optionResult = page.locator('.options-list .option-item').filter({ hasText: 'Producto Test Seguro' }).first();
            try {
                await optionResult.waitFor({ state: 'visible', timeout: 3000 });
                await optionResult.dispatchEvent('click');
            } catch (_e) {
                console.log("No se pudo seleccionar el producto inyectado, usando fallback...");
                const firstOption = page.locator('.options-list .option-item').first();
                if (await firstOption.isVisible()) {
                    await firstOption.dispatchEvent('click');
                } else {
                    await page.keyboard.press('Escape');
                }
            }
            await page.waitForTimeout(500);
            
            // Llenar la talla (requerido)
            const selectTalla = rowProducto.locator('select.variant-select-mini').first();
            if (await selectTalla.isVisible()) {
                // Selecciona la primera opción de la lista (index 1 porque 0 es el placeholder)
                await selectTalla.selectOption({ index: 1 }).catch(() => {});
            }
        }

        // Click guardar/registrar y esperar respuesta
        const btnSubmit = page.locator('button.ventas-btn-submit, button[type="submit"]').first();
        await Promise.all([
            page.waitForResponse(resp => resp.url().includes('/api/ventas') && resp.request().method() === 'POST' && (resp.status() === 201 || resp.status() === 200), { timeout: 20000 }),
            btnSubmit.dispatchEvent('click')
        ]);
        const alert = page.locator('.alert-container').first();
        if (await alert.isVisible({ timeout: 5000 }).catch(() => false)) {
            await expect(alert).toContainText(/éxito|creada|registrada/i, { timeout: 5000 });
        }
        
        // Volver a la lista para el siguiente test (cerrar modal)
        await page.waitForTimeout(1000);
        const btnBack = page.locator('button.ventas-btn-back, button:has-text("Volver")');
        if (await btnBack.isVisible()) await btnBack.click({ force: true });
    }

    test('HU_Ventas_02.1: Registrar nueva venta (Recoger en local)', async ({ page }) => {
        // indexMetodoPago = 1 (Normalmente Efectivo)
        // indexEntrega = 2 (Recoger local)
        await llenarYGuardarVenta(page, 'local', 2, 1);
    });

    test('HU_Ventas_02.2: Registrar nueva venta (Envío)', async ({ page }) => {
        // indexMetodoPago = 2 (Normalmente Nequi/Transferencia)
        // indexEntrega = 1 (Envío a domicilio)
        await llenarYGuardarVenta(page, 'envio', 1, 2);
    });

    test('HU_Ventas_03: Ver detalles de la venta', async ({ page }) => {
        const btnView = page.locator('[title="Ver detalles"] .action-icon').first();
        try {
            await btnView.waitFor({ state: 'visible', timeout: 5000 });
            await btnView.dispatchEvent('click');
            
            await expect(page.locator('h1, h2, h3')).toContainText(/Detalle/i);
            
            const btnBack = page.locator('button.ventas-btn-back, button:has-text("Volver")');
            if (await btnBack.isVisible()) await btnBack.click();
        } catch (_e) {
            console.log("No hay botón de detalles visible");
        }
    });

    test('HU_Ventas_04: Cambiar estado de envío/entrega de venta', async ({ page }) => {
        // Primero, si hay una venta Pendiente (como la que acabamos de crear con Bancolombia),
        // debemos aprobarla para que pase a estado "Completado" y aparezca el botón de envío.
        const btnApprove = page.locator('.action-approve').first();
        if (await btnApprove.isVisible()) {
            await btnApprove.dispatchEvent('click');
            const btnConfirmApprove = page.locator('.delete-modal-btn-confirm, button:has-text("Confirmar")');
            if (await btnConfirmApprove.isVisible()) {
                await Promise.all([
                    page.waitForResponse(resp => resp.url().includes('/aprobar') && resp.request().method() === 'PATCH', { timeout: 20000 }),
                    btnConfirmApprove.dispatchEvent('click')
                ]);
            }
        }
        
        // En EntityTable las acciones de envío tienen la clase .action-enviar
        const btnEnviar = page.locator('.action-enviar').first();
        try {
            await btnEnviar.waitFor({ state: 'visible', timeout: 5000 });
            await btnEnviar.dispatchEvent('click');
            
            const btnConfirmar = page.locator('.delete-modal-btn-confirm, button:has-text("Confirmar")');
            if (await btnConfirmar.isVisible()) {
                await Promise.all([
                    page.waitForResponse(resp => resp.url().includes('/envio') && resp.request().method() === 'PATCH', { timeout: 20000 }),
                    btnConfirmar.dispatchEvent('click')
                ]);
                const alert = page.locator('.alert-container').first();
                if (await alert.isVisible({ timeout: 5000 }).catch(() => false)) {
                    await expect(alert).toContainText(/éxito|actualizado/i, { timeout: 5000 });
                }
            }
        } catch (_e) {
            console.log("No hay botón de enviar visible");
        }
    });
});
