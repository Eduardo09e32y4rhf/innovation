ElevatedButton(
  onPressed: () async {
    final success = await AuthService.login(
      emailController.text,
      passwordController.text,
    );

    if (success) {
      Navigator.pushReplacementNamed(context, '/dashboard');
    } else {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Login inválido')),
      );
    }
  },
  child: const Text('Entrar'),
)
