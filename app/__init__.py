from flask import Flask
from flask_jwt_extended import JWTManager
from flask_cors import CORS

def create_app():
    app = Flask(__name__)
    
    app.config["JWT_SECRET_KEY"] = "b379f4bd6ddcfe8b0a1b789f93c4563bb08bbf9e55a1764fa14d6efde6c1d308"
    jwt = JWTManager(app)

    CORS(app, origins=["http://localhost:8000"]) 

    from app.routes.auth_routes import auth_bp
    from app.routes.product_routes import product_bp
    from app.routes.stock_routes import stock_bp
    from app.routes.order_routes import order_bp
    from app.routes.supplier_routes import supplier_bp

    app.register_blueprint(auth_bp)
    app.register_blueprint(product_bp)
    app.register_blueprint(stock_bp)
    app.register_blueprint(order_bp)
    app.register_blueprint(supplier_bp)

    return app
