import { readFileSync } from 'fs';
import pkg from 'pg';
const { Pool } = pkg;
import dotenv from 'dotenv';
dotenv.config();

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: {
    rejectUnauthorized: false
  }
});

async function run() {
  try {
    const res = await pool.query(`
      SELECT "IdProducto", "Nombre" FROM "Productos"
      WHERE "Nombre" ILIKE '%Test%' 
         OR "Nombre" ILIKE '%Prueba%' 
         OR "Nombre" ILIKE '%E2E%' 
         OR "Nombre" ILIKE '%Editado%';
    `);
    
    console.log(`Found ${res.rows.length} test products.`);
    
    for (const p of res.rows) {
      console.log(`Deleting: ${p.Nombre} (ID: ${p.IdProducto})`);
      
      // Delete from Imagenes
      await pool.query('DELETE FROM "Imagenes" WHERE "IdProducto" = $1', [p.IdProducto]);
      
      // Delete from Tallas
      await pool.query('DELETE FROM "Tallas" WHERE "IdProducto" = $1', [p.IdProducto]);

      // Delete from CompraDetalles
      await pool.query('DELETE FROM "CompraDetalles" WHERE "IdProducto" = $1', [p.IdProducto]);

      // Delete from DetalleVentas
      await pool.query('DELETE FROM "DetalleVentas" WHERE "IdProducto" = $1', [p.IdProducto]);

      // Delete from Devoluciones
      await pool.query('DELETE FROM "Devoluciones" WHERE "IdProducto" = $1', [p.IdProducto]);

      // Delete the product itself
      await pool.query('DELETE FROM "Productos" WHERE "IdProducto" = $1', [p.IdProducto]);
    }
    
    console.log('Cleanup complete!');
  } catch(e) {
    console.error('Error:', e);
  } finally {
    await pool.end();
  }
}

run();
