async function run() {
  try {
    const resAuth = await fetch('http://127.0.0.1:3000/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ correo: 'duvann1991@gmail.com', clave: 'AdminGM2024!Secure' })
    });
    const authData = await resAuth.json();
    const token = authData.token;
    
    const resRoles = await fetch('http://127.0.0.1:3000/api/roles', {
      headers: { Authorization: `Bearer ${token}` }
    });
    const rolesData = await resRoles.json();
    const roles = rolesData.data;
    const targetRole = roles.find(r => r.nombre !== 'Administrador' && r.nombre !== 'Cliente');
    console.log("Target role ID:", targetRole.id, "Estado actual:", targetRole.isActive);

    const resUpdate = await fetch(`http://127.0.0.1:3000/api/roles/${targetRole.id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({ ...targetRole, Estado: false, isActive: false })
    });
    const updateData = await resUpdate.json();
    console.log("Update success?", updateData.success, updateData.message || "");
    console.log("Returned Estado:", updateData.data?.isActive);

    const resRoles2 = await fetch('http://127.0.0.1:3000/api/roles', {
      headers: { Authorization: `Bearer ${token}` }
    });
    const rolesData2 = await resRoles2.json();
    const updatedRole = rolesData2.data.find(r => r.id === targetRole.id);
    console.log("Role after update:", updatedRole.isActive);
  } catch (err) {
    console.error(err);
  }
}
run();
