-- Enable foreign key support
PRAGMA foreign_keys = ON;

-- Users table
CREATE TABLE IF NOT EXISTS Users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    email TEXT UNIQUE NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    phone_number TEXT UNIQUE NOT NULL,
    password_hash TEXT NOT NULL,
    role TEXT CHECK(role IN ('ADMIN', 'CLIENT', 'NONE')) DEFAULT 'NONE'
);

-- Loans table
CREATE TABLE IF NOT EXISTS Loans (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    amount DECIMAL(10,2) NOT NULL,
    interest_rate DECIMAL(5,2) NOT NULL,
    term INTEGER NOT NULL, -- loan term in months
    status TEXT CHECK( status IN ('active', 'closed', 'defaulted') ) DEFAULT 'active',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES Users(id) ON DELETE CASCADE
    );

-- Deposits table
CREATE TABLE IF NOT EXISTS Deposits (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    amount DECIMAL(10,2) NOT NULL,
    interest_rate DECIMAL(5,2) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    term INTEGER NOT NULL, -- deposit term in months,
    status TEXT CHECK( status IN ('active', 'closed', 'defaulted') ) DEFAULT 'active',
    FOREIGN KEY (user_id) REFERENCES Users(id) ON DELETE CASCADE
    );

-- Cards table
CREATE TABLE IF NOT EXISTS Cards(
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    holder_id INTEGER NOT NULL,
    pin INTEGER NOT NULL,
    balance DECIMAL(100,2) NOT NULL,
    status TEXT CHECK( status IN ('active', 'blocked', 'waiting') ) DEFAULT 'waiting',
    FOREIGN KEY (holder_id) REFERENCES Users(id) ON DELETE CASCADE
)