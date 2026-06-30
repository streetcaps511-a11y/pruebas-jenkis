// check_columns.js - temporal para inspeccionar columnas
import pkg from 'pg';
const { Pool } = pkg;
import dotenv from 'dotenv';
dotenv.config();

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

async function run() {
  const tables = ['Clientes', 'Usuarios', 'Proveedores', 'Categorias', 'Productos', 'Ventas', 'Compras', 'DetalleVentas', 'CompraDetalles', 'Devoluciones', 'Imagenes', 'Tallas'];
  
  for (const t of tables) {
    try {
      const r = await pool.query(`SELECT * FROM "${t}" LIMIT 0`);
      console.log(`\n📋 ${t}: ${r.fields.map(f => f.name).join(', ')}`);
    } catch(e) {
      console.log(`\n❌ ${t}:`, e);
    }
  }
  await pool.end();
}

run();
