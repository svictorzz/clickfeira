from flask import Flask
from app.routes.auth_routes import auth_bp

def create_app():
    app = Flask(__name__)
    app.config.from_object('config.Config')

    app.register_blueprint(auth_bp)

    return app

if __name__ == "__main__":
    app = create_app()
    app.run(debug=True)