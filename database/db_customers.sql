--creacion de tablas de clientes y grupos de clientes
CREATE TABLE customer_groups 
(customer_group_id SERIAL PRIMARY KEY,
group_name VARCHAR(30) UNIQUE NOT NULL,
description TEXT,
created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL);

-- Tabla de clientes con referencias a grupos de clientes
CREATE TABLE customers 
(customer_id SERIAL PRIMARY KEY,
customer_name VARCHAR(30) NOT NULL,
customer_type VARCHAR(30) DEFAULT 'Individual' NOT NULL,
tax_id VARCHAR(30) UNIQUE,
phone_number VARCHAR(15),
email VARCHAR(45) UNIQUE,
website VARCHAR(255),
credit_limit DECIMAL(18,2) DEFAULT 0.00 NOT NULL,
payment_terms_description VARCHAR(100),
customer_group_id INTEGER REFERENCES customer_groups(customer_group_id) ON DELETE SET NULL,
is_active BOOLEAN DEFAULT TRUE NOT NULL,
created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL);

-- Tabla de direcciones de clientes
CREATE TABLE customer_addresses 
(customer_address_id SERIAL PRIMARY KEY,
customer_id INTEGER NOT NULL REFERENCES customers(customer_id) ON DELETE CASCADE,
address_type VARCHAR(50) NOT NULL,
address_line1 VARCHAR(255) NOT NULL,
city VARCHAR(100) NOT NULL,
state_province VARCHAR(100),
postal_code VARCHAR(20),
country VARCHAR(100) NOT NULL,
is_primary BOOLEAN DEFAULT FALSE NOT NULL,
created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL);

-- Tabla de contactos de clientes
CREATE TABLE customer_contacts (customer_contact_id SERIAL PRIMARY KEY,
customer_id INTEGER NOT NULL REFERENCES customers(customer_id) ON DELETE CASCADE,
first_name VARCHAR(100) NOT NULL,last_name VARCHAR(100) NOT NULL,title VARCHAR(100),
email VARCHAR(255),phone_number VARCHAR(50),is_primary BOOLEAN DEFAULT FALSE NOT NULL,
created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL);

-- Tabla de notas de clientes
CREATE TABLE customer_notes ( customer_note_id SERIAL PRIMARY KEY,
customer_id INTEGER NOT NULL REFERENCES customers(customer_id) ON DELETE CASCADE,
note_text TEXT NOT NULL,
created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL);

-- Tabla de historial de transacciones de clientes
CREATE TABLE customer_transaction_history 
(customer_transaction_id SERIAL PRIMARY KEY,
customer_id INTEGER NOT NULL REFERENCES customers(customer_id) ON DELETE CASCADE,
transaction_type VARCHAR(50) NOT NULL,
transaction_date TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
amount DECIMAL(18,2) NOT NULL,
description TEXT,
created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL);

-- Índices para optimizar consultas
CREATE INDEX idx_customer_name ON customers(customer_name);
CREATE INDEX idx_customer_email ON customers(email);
CREATE INDEX idx_customer_group ON customers(customer_group_id);
CREATE INDEX idx_customer_address_type ON customer_addresses(address_type);
CREATE INDEX idx_customer_contact_email ON customer_contacts(email);
CREATE INDEX idx_transaction_type ON customer_transaction_history(transaction_type);
CREATE INDEX idx_transaction_date ON customer_transaction_history(transaction_date);
CREATE INDEX idx_transaction_customer ON customer_transaction_history(customer_id);
CREATE INDEX idx_customer_note ON customer_notes(customer_id);
CREATE INDEX idx_customer_address ON customer_addresses(customer_id);
CREATE INDEX idx_customer_contact ON customer_contacts(customer_id);
CREATE INDEX idx_customer_transaction ON customer_transaction_history(customer_id);
CREATE INDEX idx_customer_group_name ON customer_groups(group_name);
CREATE INDEX idx_customer_group_description ON customer_groups(description);
CREATE INDEX idx_customer_credit_limit ON customers(credit_limit);
CREATE INDEX idx_customer_is_active ON customers(is_active);
CREATE INDEX idx_customer_created_at ON customers(created_at);
CREATE INDEX idx_customer_updated_at ON customers(updated_at);
CREATE INDEX idx_customer_address_created_at ON customer_addresses(created_at);
CREATE INDEX idx_customer_address_updated_at ON customer_addresses(updated_at);
CREATE INDEX idx_customer_contact_created_at ON customer_contacts(created_at);
CREATE INDEX idx_customer_contact_updated_at ON customer_contacts(updated_at);
CREATE INDEX idx_customer_note_created_at ON customer_notes(created_at);
CREATE INDEX idx_customer_note_updated_at ON customer_notes(updated_at);
CREATE INDEX idx_customer_transaction_created_at ON customer_transaction_history(created_at);