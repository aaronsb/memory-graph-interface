#!/bin/bash

# Memory Graph Interface Setup Script
# This script sets up everything needed to run the Memory Graph Interface

# Color codes for output formatting
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Function to print section headers
print_header() {
  echo -e "\n${BLUE}=== $1 ===${NC}\n"
}

# Function to print success messages
print_success() {
  echo -e "${GREEN}✓ $1${NC}"
}

# Function to print information messages
print_info() {
  echo -e "${YELLOW}➜ $1${NC}"
}

# Function to print error messages
print_error() {
  echo -e "${RED}✗ $1${NC}"
}

# Welcome message
clear
echo -e "${BLUE}╔════════════════════════════════════════╗${NC}"
echo -e "${BLUE}║   Memory Graph Interface Setup Tool    ║${NC}"
echo -e "${BLUE}╚════════════════════════════════════════╝${NC}"
echo -e "\nThis script will set up your environment for the Memory Graph Interface.\n"

# Check if Node.js is installed
print_header "Checking Prerequisites"
if command -v node &> /dev/null; then
  NODE_VERSION=$(node -v)
  print_success "Node.js is installed (version $NODE_VERSION)"
else
  print_error "Node.js is not installed. Please install Node.js v16 or later."
  exit 1
fi

if command -v npm &> /dev/null; then
  NPM_VERSION=$(npm -v)
  print_success "npm is installed (version $NPM_VERSION)"
else
  print_error "npm is not installed. Please install npm v8 or later."
  exit 1
fi

# Install dependencies
print_header "Installing Dependencies"
echo "This may take a minute..."
if npm install; then
  print_success "Dependencies installed successfully"
else
  print_error "Failed to install dependencies"
  exit 1
fi

# Create .env file if it doesn't exist
print_header "Setting Up Environment"
if [ ! -f .env ]; then
  if [ -f .env.example ]; then
    cp .env.example .env
    print_success "Created .env file from template"
    
    # Check if a database file exists in the current directory
    DB_FILES=(*.db)
    if [ -f "${DB_FILES[0]}" ]; then
      # Update the .env file with the first found database
      sed -i "s|DB_PATH=.*|DB_PATH=./${DB_FILES[0]}|" .env
      print_success "Found database file: ${DB_FILES[0]}"
      print_info "Updated .env to use this database"
    else
      print_info "No database files found in the current directory"
      print_info "You'll need to set the DB_PATH in .env to point to your database"
    fi
  else
    print_error "Cannot find .env.example template"
    exit 1
  fi
else
  print_info "A .env file already exists. Keeping existing configuration."
fi

# Build JavaScript bundle
print_header "Building JavaScript Bundle"
if npm run build:js; then
  print_success "JavaScript bundle built successfully"
else
  print_error "Failed to build JavaScript bundle"
  exit 1
fi

# Setup complete
print_header "Setup Complete!"
echo -e "Your Memory Graph Interface environment is now ready."
echo -e "\n${YELLOW}Quick Start Guide:${NC}"
echo -e "1. To start the application in development mode:${NC}"
echo -e "   ${GREEN}npm run dev${NC}"
echo -e "\n2. To start the application in production mode:${NC}"
echo -e "   ${GREEN}npm start${NC}"
echo -e "\n3. To use Docker:${NC}"
echo -e "   ${GREEN}npm run docker:build${NC}"
echo -e "   ${GREEN}npm run docker:start${NC}"
echo -e "\n${YELLOW}Your database path is set to:${NC}"
DB_PATH=$(grep DB_PATH .env | cut -d= -f2)
echo -e "   ${GREEN}$DB_PATH${NC}"
echo -e "\n${YELLOW}If you need to change your database path, edit the .env file${NC}"
echo -e "   ${GREEN}nano .env${NC}"
echo -e "\nFor more information, check out the documentation:"
echo -e "   ${GREEN}README.md${NC}"
echo -e "   ${GREEN}CONTRIBUTING.md${NC}"
echo -e "   ${GREEN}docs/database-schema.md${NC}"
echo -e "\n${BLUE}Happy exploring your memory graph!${NC}\n"