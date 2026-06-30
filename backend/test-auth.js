async function run() {
  const resAuth = await fetch('http://127.0.0.1:3000/api/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ correo: 'duvann1991@gmail.com', clave: 'AdminGM2024!Secure' })
  });
  const authData = await resAuth.json();
  console.log(authData);
}
run();
