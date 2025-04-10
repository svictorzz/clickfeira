import random, string

#vou deixar um usuario generico enquanto nao vinculo com o banco

users = {
    "admin": "123456",
    "comerciante": "senha123"
}

def login_user(username, password):
    user_password = users.get(username)
    if user_password and user_password == password: # Valida se o usuario ta na lista 
        return True
    return False

def register_user(username, password):
    if username in users:
        return False  # Usuário ja existe
    users[username] = password
    return True

def recover_password(username):
    if username in users:
        new_password = ''.join(random.choices(string.ascii_letters + string.digits, k=8))
        users[username] = new_password
        return new_password
    return None