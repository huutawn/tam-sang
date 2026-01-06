CREATE TABLE users (
    id varchar(255) PRIMARY KEY,
    email VARCHAR(50) NOT NULL,
    password VARCHAR(255) NOT NULL,
    first_name VARCHAR(50),
    last_name VARCHAR(50),
    is_black_list BOOLEAN DEFAULT FALSE,
    IC_hash VARCHAR(255),
    kyc_status VARCHAR(255),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    last_sign TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE roles (
    name VARCHAR(20) PRIMARY KEY,
    description varchar(255)
);

CREATE TABLE users_roles (
    user_id varchar(255),
    roles_name varchar(20),
    PRIMARY KEY (user_id, roles_name),
    FOREIGN KEY (user_id) REFERENCES users(id),
    FOREIGN KEY (roles_name) REFERENCES roles(name)
);

INSERT INTO roles (name, description) VALUES ('USER', 'User role'), ('ADMIN', 'Admin role'), ('SELLER', 'Seller role');

CREATE TABLE invalidate_token(
id VARCHAR(255) PRIMARY KEY,
expiry_time TIMESTAMP
);
