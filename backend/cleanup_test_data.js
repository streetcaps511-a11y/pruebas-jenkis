/**
 * cleanup_test_data.js
 * =====================================================
 * Script para limpiar TODOS los datos de prueba
 * generados por los tests E2E de Playwright.
 *
 * Módulos cubiertos:
 *   - Ventas (y DetalleVentas)
 *   - Devoluciones
 *   - Compras (y CompraDetalles)
 *   - Productos (Tallas, Imagenes)
 *   - Clientes
 *   - Proveedores
 *   - Categorías
 *   - Usuarios
 * =====================================================
 * Columnas verificadas en BD:
 *   Clientes:    IdCliente, Nombre, Email, ...
 *   Usuarios:    IdUsuario, Nombre, Correo, ...
 *   Proveedores: IdProveedor, Nombre, Contacto, Email, ...
 *   Categorias:  IdCategoria, Nombre, ...
 *   Productos:   IdProducto, Nombre, IdCategoria, ...
 *   Ventas:      IdVenta, IdCliente, ...
 *   Compras:     IdCompra, IdProveedor, ...
 * =====================================================
 */

import pkg from 'pg';
const { Pool } = pkg;
import dotenv from 'dotenv';
dotenv.config();

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

// ─── PATRONES DE DATOS DE PRUEBA ───────────────────────────────────────────

const PROD_PATTERNS   = ['%E2E%', '%Test%', '%Prueba%', '%Editado%', '%Seguro%', 'Gorra Prueba%'];
const CLI_EMAIL       = '%@test.com';
const CLI_NOMBRE      = ['%E2E%', '%Test%', '%Comprador%', '%Seguro%'];
const USR_CORREO      = ['%@test.com', '%comprador_e2e_%'];
const USR_NOMBRE      = ['%QA%', '%E2E%', '%Comprador E2E%'];
const PROV_EMAIL      = '%@test.com';
const PROV_NOMBRE     = ['%E2E%', '%Editada%', '%Editado%'];
const PROV_CONTACTO   = ['%E2E%', '%Editado%'];
const CAT_NOMBRE      = ['%E2E%', '%Editada%', '%Prueba%'];

// ─── UTILIDADES ────────────────────────────────────────────────────────────

async function dbQuery(sql, params = []) {
  const client = await pool.connect();
  try {
    return await client.query(sql, params);
  } finally {
    client.release();
  }
}

function orWhere(column, patterns, startIdx = 1) {
  const parts = [];
  const vals = [];
  let i = startIdx;
  for (const p of patterns) {
    parts.push(`${column} ILIKE $${i++}`);
    vals.push(p);
  }
  return { clause: '(' + parts.join(' OR ') + ')', vals, nextIdx: i };
}

// ─── LIMPIEZA POR MÓDULO ───────────────────────────────────────────────────

async function cleanProductos() {
  console.log('\n🛍️  Limpiando Productos de prueba...');
  const { clause, vals } = orWhere('"Nombre"', PROD_PATTERNS);
  const res = await dbQuery(
    `SELECT "IdProducto", "Nombre" FROM "Productos" WHERE ${clause}`,
    vals
  );
  console.log(`   → Encontrados: ${res.rows.length} producto(s)`);

  for (const p of res.rows) {
    console.log(`   🗑️  ${p.Nombre} (ID: ${p.IdProducto})`);
    await dbQuery('DELETE FROM "Devoluciones" WHERE "IdProducto" = $1', [p.IdProducto]);
    await dbQuery('DELETE FROM "DetalleVentas" WHERE "IdProducto" = $1', [p.IdProducto]);
    await dbQuery('DELETE FROM "CompraDetalles" WHERE "IdProducto" = $1', [p.IdProducto]);
    await dbQuery('DELETE FROM "Imagenes" WHERE "IdProducto" = $1', [p.IdProducto]);
    await dbQuery('DELETE FROM "Tallas" WHERE "IdProducto" = $1', [p.IdProducto]);
    await dbQuery('DELETE FROM "Productos" WHERE "IdProducto" = $1', [p.IdProducto]);
  }
  console.log(`   ✅ ${res.rows.length} producto(s) eliminado(s)`);
}

async function cleanClientes() {
  console.log('\n👤  Limpiando Clientes de prueba...');

  // Por Email
  const byEmail = await dbQuery(
    `SELECT "IdCliente", "Nombre", "Email" FROM "Clientes" WHERE "Email" ILIKE $1`,
    [CLI_EMAIL]
  );

  // Por Nombre
  const { clause: nc, vals: nv } = orWhere('"Nombre"', CLI_NOMBRE);
  const byName = await dbQuery(
    `SELECT "IdCliente", "Nombre", "Email" FROM "Clientes" WHERE ${nc}`,
    nv
  );

  // Deduplicar
  const seen = new Set();
  const clientes = [...byEmail.rows, ...byName.rows].filter(c => {
    if (seen.has(c.IdCliente)) return false;
    seen.add(c.IdCliente);
    return true;
  });
  console.log(`   → Encontrados: ${clientes.length} cliente(s)`);

  for (const c of clientes) {
    console.log(`   🗑️  ${c.Nombre} / ${c.Email} (ID: ${c.IdCliente})`);
    const ventas = await dbQuery(
      'SELECT "IdVenta" FROM "Ventas" WHERE "IdCliente" = $1',
      [c.IdCliente]
    );
    for (const v of ventas.rows) {
      await dbQuery('DELETE FROM "Devoluciones" WHERE "IdVenta" = $1', [v.IdVenta]);
      await dbQuery('DELETE FROM "DetalleVentas" WHERE "IdVenta" = $1', [v.IdVenta]);
      await dbQuery('DELETE FROM "Ventas" WHERE "IdVenta" = $1', [v.IdVenta]);
    }
    await dbQuery('DELETE FROM "Clientes" WHERE "IdCliente" = $1', [c.IdCliente]);
  }
  console.log(`   ✅ ${clientes.length} cliente(s) eliminado(s)`);
}

async function cleanUsuarios() {
  console.log('\n👥  Limpiando Usuarios de prueba...');

  // Combinar todas las condiciones
  const conditions = [];
  const vals = [];
  let idx = 1;

  for (const p of USR_CORREO) {
    conditions.push(`"Correo" ILIKE $${idx++}`);
    vals.push(p);
  }
  for (const p of USR_NOMBRE) {
    conditions.push(`"Nombre" ILIKE $${idx++}`);
    vals.push(p);
  }

  // Excluir admins
  const exclIdx = idx;
  const exclIdx2 = idx + 1;
  vals.push('%duvann1991%', '%streetcaps%');

  const res = await dbQuery(
    `SELECT "IdUsuario", "Nombre", "Correo" FROM "Usuarios"
     WHERE (${conditions.join(' OR ')})
       AND "Correo" NOT ILIKE $${exclIdx}
       AND "Correo" NOT ILIKE $${exclIdx2}`,
    vals
  );
  console.log(`   → Encontrados: ${res.rows.length} usuario(s)`);

  for (const u of res.rows) {
    console.log(`   🗑️  ${u.Nombre} / ${u.Correo} (ID: ${u.IdUsuario})`);

    // Limpiar cliente asociado (si se registró como comprador en la tienda)
    const clienteRes = await dbQuery(
      'SELECT "IdCliente" FROM "Clientes" WHERE "Email" = $1',
      [u.Correo]
    );
    for (const c of clienteRes.rows) {
      const ventas = await dbQuery(
        'SELECT "IdVenta" FROM "Ventas" WHERE "IdCliente" = $1',
        [c.IdCliente]
      );
      for (const v of ventas.rows) {
        await dbQuery('DELETE FROM "Devoluciones" WHERE "IdVenta" = $1', [v.IdVenta]);
        await dbQuery('DELETE FROM "DetalleVentas" WHERE "IdVenta" = $1', [v.IdVenta]);
        await dbQuery('DELETE FROM "Ventas" WHERE "IdVenta" = $1', [v.IdVenta]);
      }
      await dbQuery('DELETE FROM "Clientes" WHERE "IdCliente" = $1', [c.IdCliente]);
    }

    await dbQuery('DELETE FROM "Usuarios" WHERE "IdUsuario" = $1', [u.IdUsuario]);
  }
  console.log(`   ✅ ${res.rows.length} usuario(s) eliminado(s)`);
}

async function cleanProveedores() {
  console.log('\n🏭  Limpiando Proveedores de prueba...');

  const parts = [];
  const vals = [];
  let idx = 1;

  // Por Email
  parts.push(`"Email" ILIKE $${idx++}`);
  vals.push(PROV_EMAIL);

  // Por Nombre (columna "Nombre" según schema)
  for (const p of PROV_NOMBRE) {
    parts.push(`"Nombre" ILIKE $${idx++}`);
    vals.push(p);
  }

  // Por Contacto
  for (const p of PROV_CONTACTO) {
    parts.push(`"Contacto" ILIKE $${idx++}`);
    vals.push(p);
  }

  const res = await dbQuery(
    `SELECT "IdProveedor", "Nombre", "Contacto", "Email"
     FROM "Proveedores" WHERE ${parts.join(' OR ')}`,
    vals
  );
  console.log(`   → Encontrados: ${res.rows.length} proveedor(es)`);

  for (const p of res.rows) {
    console.log(`   🗑️  ${p.Nombre || p.Contacto} / ${p.Email} (ID: ${p.IdProveedor})`);
    const compras = await dbQuery(
      'SELECT "IdCompra" FROM "Compras" WHERE "IdProveedor" = $1',
      [p.IdProveedor]
    );
    for (const c of compras.rows) {
      await dbQuery('DELETE FROM "CompraDetalles" WHERE "IdCompra" = $1', [c.IdCompra]);
      await dbQuery('DELETE FROM "Compras" WHERE "IdCompra" = $1', [c.IdCompra]);
    }
    await dbQuery('DELETE FROM "Proveedores" WHERE "IdProveedor" = $1', [p.IdProveedor]);
  }
  console.log(`   ✅ ${res.rows.length} proveedor(es) eliminado(s)`);
}

async function cleanCategorias() {
  console.log('\n📁  Limpiando Categorías de prueba...');
  const { clause, vals } = orWhere('"Nombre"', CAT_NOMBRE);
  const res = await dbQuery(
    `SELECT "IdCategoria", "Nombre" FROM "Categorias" WHERE ${clause}`,
    vals
  );
  console.log(`   → Encontradas: ${res.rows.length} categoría(s)`);

  for (const cat of res.rows) {
    console.log(`   🗑️  ${cat.Nombre} (ID: ${cat.IdCategoria})`);
    const prods = await dbQuery(
      'SELECT "IdProducto" FROM "Productos" WHERE "IdCategoria" = $1',
      [cat.IdCategoria]
    );
    for (const p of prods.rows) {
      await dbQuery('DELETE FROM "Devoluciones" WHERE "IdProducto" = $1', [p.IdProducto]);
      await dbQuery('DELETE FROM "DetalleVentas" WHERE "IdProducto" = $1', [p.IdProducto]);
      await dbQuery('DELETE FROM "CompraDetalles" WHERE "IdProducto" = $1', [p.IdProducto]);
      await dbQuery('DELETE FROM "Imagenes" WHERE "IdProducto" = $1', [p.IdProducto]);
      await dbQuery('DELETE FROM "Tallas" WHERE "IdProducto" = $1', [p.IdProducto]);
      await dbQuery('DELETE FROM "Productos" WHERE "IdProducto" = $1', [p.IdProducto]);
    }
    await dbQuery('DELETE FROM "Categorias" WHERE "IdCategoria" = $1', [cat.IdCategoria]);
  }
  console.log(`   ✅ ${res.rows.length} categoría(s) eliminada(s)`);
}

async function cleanVentasHuerfanas() {
  console.log('\n🧾  Limpiando Ventas huérfanas (sin cliente)...');
  const res = await dbQuery(`
    SELECT v."IdVenta"
    FROM "Ventas" v
    LEFT JOIN "Clientes" c ON v."IdCliente" = c."IdCliente"
    WHERE c."IdCliente" IS NULL
  `);
  console.log(`   → Encontradas: ${res.rows.length} venta(s) huérfana(s)`);
  for (const v of res.rows) {
    await dbQuery('DELETE FROM "Devoluciones" WHERE "IdVenta" = $1', [v.IdVenta]);
    await dbQuery('DELETE FROM "DetalleVentas" WHERE "IdVenta" = $1', [v.IdVenta]);
    await dbQuery('DELETE FROM "Ventas" WHERE "IdVenta" = $1', [v.IdVenta]);
  }
  console.log(`   ✅ ${res.rows.length} venta(s) huérfana(s) eliminada(s)`);
}

async function cleanComprasHuerfanas() {
  console.log('\n📦  Limpiando Compras huérfanas (sin proveedor)...');
  const res = await dbQuery(`
    SELECT c."IdCompra"
    FROM "Compras" c
    LEFT JOIN "Proveedores" p ON c."IdProveedor" = p."IdProveedor"
    WHERE p."IdProveedor" IS NULL
  `);
  console.log(`   → Encontradas: ${res.rows.length} compra(s) huérfana(s)`);
  for (const c of res.rows) {
    await dbQuery('DELETE FROM "CompraDetalles" WHERE "IdCompra" = $1', [c.IdCompra]);
    await dbQuery('DELETE FROM "Compras" WHERE "IdCompra" = $1', [c.IdCompra]);
  }
  console.log(`   ✅ ${res.rows.length} compra(s) huérfana(s) eliminada(s)`);
}

// ─── EJECUCIÓN PRINCIPAL ───────────────────────────────────────────────────

async function main() {
  console.log('╔═══════════════════════════════════════════════╗');
  console.log('║  🧹  LIMPIEZA DE DATOS DE PRUEBA E2E          ║');
  console.log('╚═══════════════════════════════════════════════╝');
  console.log('⚠️  Conectando a la base de datos...');

  try {
    await pool.query('SELECT 1');
    console.log('✅ Conexión exitosa\n');

    // Orden: dependencias FK primero, luego padres
    await cleanClientes();         // Ventas/Devoluciones asociadas
    await cleanUsuarios();         // Clientes/Ventas del comprador E2E
    await cleanProveedores();      // Compras/CompraDetalles
    await cleanProductos();        // Tallas/Imagenes/DetalleVentas
    await cleanCategorias();       // Productos de categorías de prueba
    await cleanVentasHuerfanas();  // Ventas sin cliente
    await cleanComprasHuerfanas(); // Compras sin proveedor

    console.log('\n╔═══════════════════════════════════════════════╗');
    console.log('║  ✅  LIMPIEZA COMPLETADA EXITOSAMENTE          ║');
    console.log('╚═══════════════════════════════════════════════╝');
  } catch (err) {
    console.error('\n❌ ERROR durante la limpieza:', err.message);
    console.error(err.stack);
    process.exit(1);
  } finally {
    await pool.end();
    console.log('🔌 Conexión cerrada.');
  }
}

main();
