#!/bin/bash
echo "🚀 Script de déploiement GitHub pour FreeMind Vision"
echo ""
echo "Veuillez entrer l'URL de votre repository GitHub:"
echo "Exemple: https://github.com/freemindvision454/freemind-vision.git"
read -p "URL du repository: " REPO_URL

echo ""
echo "📝 Configuration Git..."
git config --global user.email "freemindvision454@gmail.com"
git config --global user.name "FreeMind Vision"

echo ""
echo "📦 Préparation des fichiers..."
git add .

echo ""
echo "💾 Création du commit..."
git commit -m "FreeMind Vision - Application complète prête pour déploiement"

echo ""
echo "🔗 Connexion à GitHub..."
git remote remove origin 2>/dev/null || true
git remote add origin "$REPO_URL"

echo ""
echo "🌿 Configuration de la branche principale..."
git branch -M main

echo ""
echo "⬆️  Envoi du code sur GitHub..."
git push -u origin main

echo ""
echo "✅ SUCCÈS ! Votre code est maintenant sur GitHub !"
echo ""
echo "🚂 Prochaine étape : Déployer sur Railway"
echo "   Allez sur https://railway.app"
echo "   → Login with GitHub"
echo "   → New Project → Deploy from GitHub repo"
echo "   → Sélectionnez 'freemind-vision'"
echo ""
