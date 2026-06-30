import { sequelize, Producto, Categoria } from './src/models/index.js';

async function test() {
  try {
    await sequelize.authenticate();
    console.log('✅ Connection has been established successfully.');
    
    console.log('Running query similar to getAllProductos...');
    const result = await Producto.findAndCountAll({
      include: [
        {
          model: Categoria,
          as: 'categoriaData',
          attributes: ['id', 'nombre', 'estado'],
          where: { estado: true },
          required: true
        }
      ]
    });
    console.log('✅ Query succeeded! Count:', result.count);
  } catch (error) {
    console.error('❌ Error executing query:', error);
  } finally {
    await sequelize.close();
  }
}

test();
