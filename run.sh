#!/bin/bash

###########################################
# React + GitHub Pages Auto Setup Script
# macOS
###########################################

set -e

SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
cd "$SCRIPT_DIR"

###########################################
# 1. Install Node, npm, yarn
###########################################

echo "🔍 Checking Node installation..."
if ! command -v node >/dev/null 2>&1; then
    echo "🟡 Node not found. Installing Node via Homebrew..."
    if ! command -v brew >/dev/null 2>&1; then
        echo "🟡 Homebrew not found. Installing Homebrew..."
        /bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"
    fi
    brew install node
else
    echo "✅ Node already installed."
fi

echo "🔍 Checking yarn..."
if ! command -v yarn >/dev/null 2>&1; then
    echo "🟡 Installing Yarn..."
    npm install -g yarn
else
    echo "✅ Yarn already installed."
fi

###########################################
# 2. Ask for GitHub repo SSH URL (first run)
###########################################

REPO_FILE=".repo_url"

if [ ! -f "$REPO_FILE" ]; then
    echo ""
    echo "🔧 Enter your GitHub SSH repo URL (example: git@github.com:username/myrepo.git):"
    read -r REPO_URL
    echo "$REPO_URL" > "$REPO_FILE"
    echo "💾 Saved to $REPO_FILE"
else
    REPO_URL=$(cat "$REPO_FILE")
    echo "✅ Using saved repository: $REPO_URL"
fi

###########################################
# 3. Git setup
###########################################

if [ ! -d ".git" ]; then
    echo "📦 First run detected: Initializing git..."
    git init
    git remote add origin "$REPO_URL"

    echo "🔧 Setting default branch to main..."
    git checkout -b main || git branch -M main
else
    echo "✅ Git repo already initialized."
fi

###########################################
# 4. Create React App (only if none exists)
###########################################

if [ ! -f "package.json" ]; then
    echo "📦 No package.json found. Creating React app..."
    npx create-react-app .
else
    echo "✅ React project already exists."
fi

###########################################
# 5. Setup GitHub Actions workflow for Pages
###########################################

WORKFLOW_DIR=".github/workflows"
WORKFLOW_FILE="$WORKFLOW_DIR/deploy.yml"

if [ ! -f "$WORKFLOW_FILE" ]; then
    echo "📝 Creating GitHub Actions workflow for React + Pages..."

    mkdir -p "$WORKFLOW_DIR"

    cat > "$WORKFLOW_FILE" <<EOF
name: Deploy React to GitHub Pages

on:
  push:
    branches: [ "main" ]

permissions:
  contents: write
  pages: write
  id-token: write

jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - name: Setup Node
        uses: actions/setup-node@v4
        with:
          node-version: 20

      - name: Install dependencies
        run: npm install

      - name: Build
        run: npm run build

      - name: Upload artifact
        uses: actions/upload-pages-artifact@v3
        with:
          path: ./build

  deploy:
    needs: build
    runs-on: ubuntu-latest
    steps:
      - id: deploy
        uses: actions/deploy-pages@v4
EOF

    echo "🎉 Workflow created at $WORKFLOW_FILE"
else
    echo "✅ Workflow already exists."
fi

###########################################
# 6. Commit + push
###########################################

echo "📤 Adding files..."
git add .

echo "📝 Commit message (default: 'update'):"
read -r MSG
MSG=${MSG:-update}

git commit -m "$MSG" || echo "ℹ️ Nothing to commit."

echo "⬆️ Pushing to GitHub..."
git push -u origin main

###########################################
# 7. Print GitHub Pages URL
###########################################

USER_REPO=$(echo "$REPO_URL" | sed 's/git@github.com://; s/\.git//')
USERNAME=$(echo "$USER_REPO" | cut -d'/' -f1)
REPONAME=$(echo "$USER_REPO" | cut -d'/' -f2)

echo ""
echo "🌐 If GitHub Pages is enabled in repository settings, your site will appear at:"
echo "➡️ https://$USERNAME.github.io/$REPONAME"
echo ""

echo "🎉 All done!"
