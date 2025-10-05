#!/bin/bash

# 🔍 Pre-Push Verification Script
# Run this before pushing to GitHub to ensure security

echo "🔐 SkyĈasino - Security Verification"
echo "====================================="
echo ""

ERRORS=0

# Check 1: .env files should NOT be in git
echo "1️⃣  Checking .env files are not tracked..."
if git ls-files | grep -q "\.env$"; then
    echo "❌ ERROR: .env file is tracked by git!"
    echo "   Run: git rm --cached .env"
    ERRORS=$((ERRORS + 1))
else
    echo "✅ PASS: No .env files tracked"
fi

# Check 2: .env.example should be tracked
echo ""
echo "2️⃣  Checking .env.example files exist..."
if [ -f .env.example ]; then
    echo "✅ PASS: Root .env.example exists"
else
    echo "❌ ERROR: Root .env.example missing"
    ERRORS=$((ERRORS + 1))
fi

if [ -f frontend/.env.example ]; then
    echo "✅ PASS: Frontend .env.example exists"
else
    echo "❌ ERROR: Frontend .env.example missing"
    ERRORS=$((ERRORS + 1))
fi

# Check 3: No hardcoded API keys in code
echo ""
echo "3️⃣  Checking for hardcoded secrets..."
SECRETS_FOUND=$(grep -r "process\.env\.\|import\.meta\.env\." . \
    --include="*.ts" --include="*.js" --include="*.tsx" \
    --exclude-dir=node_modules --exclude-dir=.git \
    --exclude-dir=dist --exclude-dir=build | \
    grep -v "\.example" | \
    grep -E "=\s*['\"]([a-f0-9]{32}|0x[a-zA-Z0-9]{40})['\"]" || true)

if [ -n "$SECRETS_FOUND" ]; then
    echo "❌ ERROR: Possible hardcoded secrets found:"
    echo "$SECRETS_FOUND"
    ERRORS=$((ERRORS + 1))
else
    echo "✅ PASS: No hardcoded secrets detected"
fi

# Check 4: Config files use env vars
echo ""
echo "4️⃣  Checking hardhat.config.ts..."
if grep -q "process\.env\.\|vars\.get" hardhat.config.ts; then
    echo "✅ PASS: hardhat.config.ts uses environment variables"
else
    echo "❌ ERROR: hardhat.config.ts doesn't use env vars"
    ERRORS=$((ERRORS + 1))
fi

echo ""
echo "5️⃣  Checking frontend/src/config.ts..."
if grep -q "import\.meta\.env\." frontend/src/config.ts; then
    echo "✅ PASS: frontend config uses environment variables"
else
    echo "❌ ERROR: frontend config doesn't use env vars"
    ERRORS=$((ERRORS + 1))
fi

# Check 6: .gitignore includes .env
echo ""
echo "6️⃣  Checking .gitignore..."
if grep -q "\.env" .gitignore; then
    echo "✅ PASS: Root .gitignore includes .env"
else
    echo "❌ ERROR: .env not in root .gitignore"
    ERRORS=$((ERRORS + 1))
fi

if grep -q "\.env" frontend/.gitignore; then
    echo "✅ PASS: Frontend .gitignore includes .env"
else
    echo "❌ ERROR: .env not in frontend .gitignore"
    ERRORS=$((ERRORS + 1))
fi

# Summary
echo ""
echo "====================================="
if [ $ERRORS -eq 0 ]; then
    echo "✅ ALL CHECKS PASSED!"
    echo ""
    echo "🚀 Your code is secure and ready to push!"
    echo ""
    echo "To push:"
    echo "  git add ."
    echo "  git commit -m \"Your commit message\""
    echo "  git push origin main"
    exit 0
else
    echo "❌ $ERRORS ERROR(S) FOUND!"
    echo ""
    echo "⚠️  Please fix the errors above before pushing."
    echo "📚 See ENV_SETUP_GUIDE.md for help"
    exit 1
fi
