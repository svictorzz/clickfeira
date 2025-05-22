export const API_URL = "http://127.0.0.1:5000";

async function loginUser(email, senha) {
    try {
        const response = await fetch(`${API_URL}/auth/login`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ email, senha }),
        });

        const data = await response.json();

        if (!response.ok) {
            console.error("Erro de autenticação:", data.message || "Erro desconhecido");
            return { message: data.message || "Credenciais inválidas." };
        }

        return data;
    } catch (error) {
        console.error("Erro de login:", error);
        return { message: "Erro ao conectar com o servidor." };
    }
}

async function registerUser(userData) {
    try {
        const response = await fetch(`${API_URL}/auth/register`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(userData),
        });

        const data = await response.json();

        if (!response.ok) { 
            console.error("Erro no cadastro:", data.message);
            return { message: data.message || "Erro ao cadastrar usuário." };
        }
        
        localStorage.setItem("token", data.token);  
        localStorage.setItem("idComerciante", data.idComerciante);  

        return data;
    } catch (error) {
        console.error("Erro ao cadastrar:", error);
        return { message: "Falha na comunicação com o servidor." };
    }
}