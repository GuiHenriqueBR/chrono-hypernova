#!/bin/bash

# Script para inicializar o projeto

echo "🚀 Inicializando Crono Hypernova..."

# Backend
echo ""
echo "📦 Instalando dependências do backend..."
cd backend
npm install
cd ..

echo ""
echo "✅ Dependências do backend instaladas!"

# Frontend
echo ""
echo "📦 Instalando dependências do frontend..."
cd frontend
npm install
cd ..

echo ""
echo "✅ Dependências do frontend instaladas!"

echo ""
echo "🎯 Projeto inicializado com sucesso!"
echo ""
echo "Para iniciar o desenvolvimento:"
echo ""
echo "  Terminal 1 - Backend:"
echo "  cd backend && npm run dev"
echo ""
echo "  Terminal 2 - Frontend:"
echo "  cd frontend && npm run dev"
echo ""
echo "📚 Consulte o README.md para mais informações"
