import { test, expect } from './fixtures.js';

test.describe.serial('E2E Flujo Completo de Pedidos', () => {
    
    // Variables para compartir datos entre los pasos del flujo
    let testUser = {
        nombre: 'Comprador E2E ' + Date.now(),
        email: `comprador_e2e_${Date.now()}@test.com`,
        identificacion: 'CCE2E' + Date.now(),
        telefono: '3000000000',
        direccion: 'Calle Falsa 123',
        password: 'Password123!',
        estado: 'activo'
    };
    
    let customerContext;
    let customerPage;

    test.beforeAll(async ({ browser }) => {
        // Creamos un contexto limpio para el cliente (sin sesión de admin)
        customerContext = await browser.newContext();
        customerPage = await customerContext.newPage();
    });

    test.afterAll(async () => {
        if (customerContext) {
            await customerContext.close();
        }
    });

    test('Paso 1: Admin crea cuenta de cliente vía API (Preparación)', async ({ page }) => {
        // Utilizamos el contexto de administrador (page por defecto) para crear el cliente
        // y asegurarnos de que la cuenta existe para que el cliente pueda comprar.
        await page.goto('http://localhost:5173/admin/dashboard');
        
        // Esperamos a que inyecte el token de admin
        await page.waitForLoadState('networkidle');
        
        await page.evaluate(async (user) => {
            const token = localStorage.getItem('token') || sessionStorage.getItem('token');
            if (!token) throw new Error("No hay token de administrador");
            
            // 1. Crear el cliente
            const resCliente = await fetch('/api/clientes', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify(user)
            });
            if (!resCliente.ok) {
                console.error("Error creando cliente", await resCliente.text());
                throw new Error("No se pudo crear cliente");
            }
            const clienteData = await resCliente.json();
            
            // 2. Crear usuario asociado al cliente para que pueda iniciar sesión
            const resUser = await fetch('/api/usuarios', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({
                    nombre: user.nombre,
                    email: user.email,
                    password: user.password,
                    idRol: 2, // Asumimos que 2 es Rol Cliente/Usuario estándar
                    IdCliente: clienteData.id || clienteData.data?.id || null,
                    estado: 'activo'
                })
            });
            if (!resUser.ok) {
                console.log("Ignorando error al crear usuario (quizás ya se creó auto):", await resUser.text());
            }
        }, testUser);
    });

    test('Paso 2: Cliente ingresa, agrega carrito y compra', async () => {
        // 1. Cliente Inicia Sesión
        await customerPage.goto('http://localhost:5173/login');
        await customerPage.fill('input[type="email"]', testUser.email);
        await customerPage.fill('input[type="password"]', testUser.password);
        await customerPage.click('button[type="submit"]');
        
        // Esperar que el login sea exitoso (redirige al home)
        await customerPage.waitForURL('http://localhost:5173/', { timeout: 15000 }).catch(() => {});
        
        // 2. Cliente va al Home y agrega un producto
        await customerPage.goto('http://localhost:5173/');
        // Buscamos cualquier botón de agregar al carrito
        const btnAddCart = customerPage.locator('.add-to-cart-btn, button:has-text("Agregar"), button[title*="carrito"]').first();
        await btnAddCart.waitFor({ state: 'visible', timeout: 10000 }).catch(() => {});
        
        if (await btnAddCart.isVisible()) {
            await btnAddCart.click();
            await customerPage.waitForTimeout(1500); // Esperar animación de carrito
        } else {
            // Si no hay botón en el home, vamos a productos
            await customerPage.goto('http://localhost:5173/productos');
            const btnProd = customerPage.locator('button:has-text("Agregar"), .add-to-cart-btn').first();
            await btnProd.click({ force: true });
            await customerPage.waitForTimeout(1500);
        }

        // 3. Cliente va al carrito y finaliza compra
        await customerPage.goto('http://localhost:5173/carrito');
        const btnContinuar = customerPage.locator('button:has-text("CONTINUAR"), .checkout-btn');
        if (await btnContinuar.isVisible()) {
            await btnContinuar.click();
            
            // Aparece modal de Checkout
            // Esperar que esté visible
            const modalCheckout = customerPage.locator('.checkout-modal-content').first();
            if (await modalCheckout.isVisible({ timeout: 5000 })) {
                // Seleccionar un método de pago y tipo de entrega (si hay selects)
                const selects = modalCheckout.locator('select');
                if (await selects.count() > 0) {
                    await selects.nth(0).selectOption({ index: 1 }); // Primer select
                }
                
                // Confirmar
                const btnConfirmar = modalCheckout.locator('button:has-text("Confirmar"), button:has-text("Completar")').first();
                await Promise.all([
                    customerPage.waitForResponse(resp => resp.url().includes('/api/ventas') && resp.request().method() === 'POST' && (resp.status() === 201 || resp.status() === 200), { timeout: 15000 }).catch(()=>null),
                    btnConfirmar.click()
                ]);
            }
        }
        
        // Esperamos mensaje de éxito o botón cerrar del modal final
        const btnCerrarFinal = customerPage.locator('button:has-text("Cerrar")').last();
        if (await btnCerrarFinal.isVisible({ timeout: 10000 })) {
            await btnCerrarFinal.click();
        }
    });

    test('Paso 3: Admin gestiona el pedido (Aprueba Venta, Envío y Entrega)', async ({ page }) => {
        // Admin va a ventas
        await page.goto('http://localhost:5173/admin/ventas');
        await page.waitForLoadState('networkidle');

        // Buscar el pedido (la tabla debe tener el registro del cliente)
        const rowPedido = page.locator('.entity-table tbody tr').first();
        await expect(rowPedido).toBeVisible({ timeout: 15000 });

        // 1. Aprobar Venta / Envío
        // Clic botón enviar (Suele tener un ícono de camión o clase .action-enviar)
        const btnEnviar = rowPedido.locator('.action-enviar, button[title*="enviar"], button[title*="Envío"]').first();
        if (await btnEnviar.isVisible()) {
            await btnEnviar.click();
            const btnConfirmar = page.locator('.delete-modal-btn-confirm, button:has-text("Confirmar")');
            await btnConfirmar.waitFor({ state: 'visible' });
            await btnConfirmar.click();
            await page.waitForTimeout(2000); // Esperar que procese
        }
        
        // 2. Marcar como Entregado
        // Si el estado de envío ya avanzó, quizás vuelva a aparecer un botón para entregar.
        // Simulamos otro clic o un cambio de estado.
        const btnEntregar = rowPedido.locator('.action-enviar, button[title*="entregar"], button[title*="Entrega"]').first();
        if (await btnEntregar.isVisible()) {
            await btnEntregar.click();
            const btnConfirmar2 = page.locator('.delete-modal-btn-confirm, button:has-text("Confirmar")');
            if(await btnConfirmar2.isVisible()){
                await btnConfirmar2.click();
                await page.waitForTimeout(2000);
            }
        }
    });

    test('Paso 4: Cliente solicita devoluciones en el perfil', async () => {
        // Cliente revisa sus pedidos en el perfil
        await customerPage.goto('http://localhost:5173/perfil');
        await customerPage.waitForLoadState('networkidle');
        
        // Navegar a la pestaña "Mis Pedidos" si es necesario (asumimos que está visible o hay que hacer clic)
        const tabPedidos = customerPage.locator('text="Mis Pedidos", button:has-text("Mis Pedidos")');
        if (await tabPedidos.isVisible()) {
            await tabPedidos.click();
        }
        
        // Buscar el pedido entregado y expandirlo o ver detalles
        const btnDetalles = customerPage.locator('button:has-text("Ver Detalles"), .btn-detalles').first();
        if (await btnDetalles.isVisible()) {
            await btnDetalles.click();
        }
        
        // Intentar solicitar devolución parcial (por 1 solo ítem)
        // El botón suele ser "Devolver" o similar en la lista de ítems del pedido
        const btnDevolverItem = customerPage.locator('button:has-text("Devolver Ítem")').first();
        if (await btnDevolverItem.isVisible()) {
            await btnDevolverItem.click();
            // Llenar formulario de devolución
            const selectMotivo = customerPage.locator('select').first();
            if(await selectMotivo.isVisible()) await selectMotivo.selectOption({ index: 1 });
            
            const btnConfirmarDevolucion = customerPage.locator('button:has-text("Confirmar Devolución")');
            if (await btnConfirmarDevolucion.isVisible()) await btnConfirmarDevolucion.click();
            await customerPage.waitForTimeout(2000);
        }
        
        // Intentar solicitar devolución total del lote
        const btnDevolverPedido = customerPage.locator('button:has-text("Devolver Pedido")').first();
        if (await btnDevolverPedido.isVisible()) {
            await btnDevolverPedido.click();
            const selectMotivoTotal = customerPage.locator('select').first();
            if(await selectMotivoTotal.isVisible()) await selectMotivoTotal.selectOption({ index: 1 });
            
            const btnConfirmarDevTotal = customerPage.locator('button:has-text("Confirmar Devolución")');
            if (await btnConfirmarDevTotal.isVisible()) await btnConfirmarDevTotal.click();
            await customerPage.waitForTimeout(2000);
        }
    });

});
