"use client"

export default function Register() {
  const handleSubmit = (e) => {
    e.preventDefault();
    const formData = new FormData(e.target);
    const name = formData.get('name');
    const email = formData.get('email');
    const phone = formData.get('phone');
    const password = formData.get('password');
    
    // Simula register
    localStorage.setItem('user', email);
    window.location.href = '/dashboard';
  };

  return (
    <div style={{padding: '50px', maxWidth: '400px', margin: 'auto'}}>
      <h1>Registro Innovation IA</h1>
      <form onSubmit={handleSubmit}>
        <input name="name" type="text" placeholder="Nome" style={{width: '100%', padding: '10px', margin: '10px 0'}} required />
        <input name="email" type="email" placeholder="Email" style={{width: '100%', padding: '10px', margin: '10px 0'}} required />
        <input name="phone" type="tel" placeholder="Telefone" style={{width: '100%', padding: '10px', margin: '10px 0'}} required />
        <input name="password" type="password" placeholder="Senha" style={{width: '100%', padding: '10px', margin: '10px 0'}} required />
        <button type="submit" style={{width: '100%', padding: '10px', background: 'green', color: 'white'}}>Registrar</button>
      </form>
      <p><a href="/login">Já tem conta? Login</a></p>
    </div>
  );
}

