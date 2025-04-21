from flask import Flask
from app.routes.auth_routes import auth_bp
from app.routes.product_routes import product_bp
from app.routes.stock_routes import stock_bp
from app.routes.order_routes import order_bp

def create_app():
    app = Flask(__name__)
    app.config.from_object('config.Config')

    app.register_blueprint(auth_bp)
    app.register_blueprint(product_bp)
    app.register_blueprint(stock_bp)
    app.register_blueprint(order_bp)
  
    return app

if __name__ == "__main__":
    app = create_app()
    app.run(debug=True)