async function login(email, password) {
    const response = await fetch('/auth/login', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({ email, password })
    });

    if (!response.ok) {
        const data = await response.json();
        throw new Error(data.detail || 'Falha ao fazer login');
    }

    const data = await response.json();

    if (data.two_factor_required) {
        localStorage.setItem('temporary_token', data.temporary_token);
        return { two_factor: true };
    }

    localStorage.setItem('access_token', data.access_token);
    localStorage.setItem('refresh_token', data.refresh_token);
    return data;
}

async function register(data) {
    const response = await fetch('/auth/register', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify(data)
    });

    if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.detail || 'Erro ao criar conta');
    }

    return await response.json();
}
