// Innovation.ia - Payment Service
// Handles connection to backend for checkout

async function assinarPlano(tipoPlano) {
    console.log(`Iniciando assinatura para o plano: ${tipoPlano}`);
    
    // Get token from storage (adapt key if needed, e.g. 'access_token' or 'token')
    const token = localStorage.getItem('access_token');
    
    if (!token) {
        alert("Você precisa estar logado para assinar um plano.");
        window.location.href = '/login';
        return;
    }

    try {
        // Adjust API URL if different in production
        const API_URL = 'http://localhost:8000'; 
        
        const response = await fetch(`${API_URL}/api/payments/create-preference/${tipoPlano}`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            }
        });

        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.detail || 'Erro ao conectar com o servidor de pagamento.');
        }

        const data = await response.json();
        
        if (data.checkout_url) {
            console.log("Redirecionando para Mercado Pago...", data.checkout_url);
            // Redireciona o usuário para o Mercado Pago
            window.location.href = data.checkout_url;
        } else {
            alert("Erro ao gerar link de pagamento. Tente novamente.");
        }
    } catch (error) {
        console.error("Erro no pagamento:", error);
        alert(`Não foi possível iniciar o pagamento: ${error.message}`);
    }
}
