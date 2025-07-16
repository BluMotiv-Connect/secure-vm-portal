#!/bin/bash

# Install Dependencies Script for Secure VM Portal
# This script installs all required dependencies for the project

set -e

echo "🚀 Starting dependency installation for Secure VM Portal..."

# Check if Node.js is installed
if ! command -v node &> /dev/null; then
    echo "❌ Node.js is not installed. Please install Node.js 18+ first."
    echo "Visit: https://nodejs.org/"
    exit 1
fi

# Check Node.js version
NODE_VERSION=$(node --version | cut -d'v' -f2 | cut -d'.' -f1)
if [ "$NODE_VERSION" -lt 18 ]; then
    echo "❌ Node.js version 18+ is required. Current version: $(node --version)"
    exit 1
fi

echo "✅ Node.js version: $(node --version)"

# Check if PostgreSQL is installed
if ! command -v psql &> /dev/null; then
    echo "⚠️  PostgreSQL is not installed. Installing PostgreSQL..."
    
    # Detect OS and install PostgreSQL
    if [[ "$OSTYPE" == "linux-gnu"* ]]; then
        # Ubuntu/Debian
        if command -v apt-get &> /dev/null; then
            sudo apt-get update
            sudo apt-get install -y postgresql postgresql-contrib
        # CentOS/RHEL
        elif command -v yum &> /dev/null; then
            sudo yum install -y postgresql-server postgresql-contrib
            sudo postgresql-setup initdb
        fi
    elif [[ "$OSTYPE" == "darwin"* ]]; then
        # macOS
        if command -v brew &> /dev/null; then
            brew install postgresql
        else
            echo "❌ Homebrew not found. Please install PostgreSQL manually."
            exit 1
        fi
    else
        echo "❌ Unsupported OS. Please install PostgreSQL manually."
        exit 1
    fi
fi

echo "✅ PostgreSQL is available"

# Install backend dependencies
echo "📦 Installing backend dependencies..."
cd backend
npm install

# Install frontend dependencies
echo "📦 Installing frontend dependencies..."
cd ../frontend
npm install

# Install root dependencies (if any)
cd ..
if [ -f "package.json" ]; then
    echo "📦 Installing root dependencies..."
    npm install
fi

# Install additional system dependencies for VM connections
echo "🔧 Installing system dependencies for VM connections..."

if [[ "$OSTYPE" == "linux-gnu"* ]]; then
    # Ubuntu/Debian
    if command -v apt-get &> /dev/null; then
        sudo apt-get update
        sudo apt-get install -y sshpass rdesktop freerdp2-x11
    # CentOS/RHEL
    elif command -v yum &> /dev/null; then
        sudo yum install -y sshpass rdesktop freerdp
    fi
elif [[ "$OSTYPE" == "darwin"* ]]; then
    # macOS
    if command -v brew &> /dev/null; then
        brew install sshpass freerdp
    fi
fi

# Create necessary directories
echo "📁 Creating necessary directories..."
mkdir -p logs
mkdir -p logs/application
mkdir -p logs/access
mkdir -p logs/system
mkdir -p database/backups
mkdir -p scripts/temp

# Set permissions
chmod +x scripts/setup/*.sh
chmod +x scripts/start-dev.sh

echo "✅ All dependencies installed successfully!"
echo ""
echo "Next steps:"
echo "1. Copy .env.example to .env and configure your environment variables"
echo "2. Run './scripts/setup/setup-database.sh' to set up the database"
echo "3. Run './scripts/start-dev.sh' to start the development servers"
