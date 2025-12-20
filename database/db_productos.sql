
CREATE TABLE roles (role_id BIGSERIAL PRIMARY KEY,
 role_name VARCHAR(50) NOT NULL, 
 description TEXT);
 
 CREATE TABLE users (user_id BIGSERIAL PRIMARY KEY,
  username VARCHAR(100) NOT NULL UNIQUE,
   password_hash VARCHAR(255) NOT NULL, 
   email VARCHAR(255) NOT NULL UNIQUE,
    role_id BIGINT NOT NULL REFERENCES roles(role_id),
     created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP, 
     updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP);
     
     CREATE TABLE product_categories (category_id BIGSERIAL PRIMARY KEY, 
     name VARCHAR(100) NOT NULL UNIQUE, 
     description TEXT);
     
     CREATE TABLE products (product_id BIGSERIAL PRIMARY KEY,
     name VARCHAR(255) NOT NULL, description TEXT,
     sku VARCHAR(50) UNIQUE, 
     price DECIMAL(10,2) NOT NULL, 
     category_id BIGINT NOT NULL REFERENCES product_categories(category_id), 
     created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP, 
     updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP);
     
     CREATE TABLE warehouses (warehouse_id BIGSERIAL PRIMARY KEY, 
     name VARCHAR(100) NOT NULL UNIQUE, 
     location TEXT);
     
     CREATE TABLE suppliers (supplier_id BIGSERIAL PRIMARY KEY, 
     name VARCHAR(255) NOT NULL UNIQUE, 
     contact_person VARCHAR(255), 
     phone VARCHAR(50), 
     email VARCHAR(255));
     
     CREATE TABLE stock_movements (movement_id BIGSERIAL PRIMARY KEY, 
     product_id BIGINT NOT NULL REFERENCES products(product_id), 
     warehouse_id BIGINT NOT NULL REFERENCES warehouses(warehouse_id), 
     supplier_id BIGINT REFERENCES suppliers(supplier_id), 
     movement_type VARCHAR(50) NOT NULL, 
     quantity INTEGER NOT NULL, 
     movement_date TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP, 
     user_id BIGINT REFERENCES users(user_id), 
     notes TEXT);
     
     CREATE TABLE sales (sale_id BIGSERIAL PRIMARY KEY, 
     customer_id BIGINT NOT NULL REFERENCES customers(customer_id), 
     sale_date TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP, 
     total_amount DECIMAL(12,2) NOT NULL, status VARCHAR(50) NOT NULL, 
     user_id BIGINT REFERENCES users(user_id), 
     created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP, 
     updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP);
     
     CREATE TABLE sale_items (sale_item_id BIGSERIAL PRIMARY KEY, 
     sale_id BIGINT NOT NULL REFERENCES sales(sale_id), 
     product_id BIGINT NOT NULL REFERENCES products(product_id), 
     quantity INTEGER NOT NULL, unit_price DECIMAL(10,2) NOT NULL, 
     subtotal DECIMAL(12,2) NOT NULL);
     
     CREATE TABLE accounts (account_id BIGSERIAL PRIMARY KEY, 
     account_name VARCHAR(255) NOT NULL UNIQUE, 
     account_type VARCHAR(50) NOT NULL, 
     parent_account_id BIGINT REFERENCES accounts(account_id), 
     description TEXT);
     
     CREATE TABLE journal_entries (entry_id BIGSERIAL PRIMARY KEY, 
     entry_date DATE NOT NULL, description TEXT, 
     created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP);
     
     CREATE TABLE journal_entry_items (item_id BIGSERIAL PRIMARY KEY, 
     entry_id BIGINT NOT NULL REFERENCES journal_entries(entry_id), 
     account_id BIGINT NOT NULL REFERENCES accounts(account_id), 
     debit DECIMAL(12,2) NOT NULL DEFAULT 0.00, 
     credit DECIMAL(12,2) NOT NULL DEFAULT 0.00);