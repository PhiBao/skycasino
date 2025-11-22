# 🚀 Deploy to Vercel - Complete Checklist

Your SkyĈasino is **ready to deploy**! Follow these steps:

---

## ✅ Pre-Deployment Checklist (COMPLETED)

- ✅ `vercel.json` created (SPA routing configured)
- ✅ `.vercelignore` created (excludes unnecessary files)
- ✅ `vite.config.ts` optimized for production
- ✅ TypeScript errors fixed
- ✅ Production build tested successfully
- ✅ All code ready for deployment

---

## 📋 What You Need

1. **GitHub account** - Your code must be on GitHub
2. **Vercel account** - Sign up free at https://vercel.com
3. **Contract address**: `0x8a15d7Ed46AeF0D89519426903dFECC2729BA0e1`
4. **Infura API key** - Get from https://infura.io

---

## 🎯 Deployment Steps (10 minutes)

### Step 1: Push to GitHub

```bash
cd /home/kiter/skycasino

# Add all changes
git add .

# Commit
git commit -m "Ready for Vercel deployment"

# Push
git push origin main
```

### Step 2: Go to Vercel

1. Visit https://vercel.com
2. Click **"Sign Up"**
3. Choose **"Continue with GitHub"**
4. Authorize Vercel

### Step 3: Import Project

1. Click **"Add New..."** → **"Project"**
2. Find `skycasino` repository
3. Click **"Import"**

### Step 4: Configure Settings

#### Root Directory

- Click **"Edit"**
- Set: `frontend`
- Click **"Continue"**

#### Framework

- Should auto-detect **"Vite"**

### Step 5: Add Environment Variables

Add these 4 variables:

```
VITE_CONTRACT_ADDRESS = 0x8a15d7Ed46AeF0D89519426903dFECC2729BA0e1
VITE_INFURA_API_KEY = your-infura-api-key-here
VITE_CHAIN_ID = 11155111
VITE_CHAIN_NAME = Sepolia
```

**Important**: Click "Add" after each one!

### Step 6: Deploy

1. Click **"Deploy"**
2. Wait 1-2 minutes
3. Done! 🎉

---

## 🎮 Test Your Site

1. Click the deployment URL
2. Connect MetaMask
3. Play a game!

---

## 🔄 Future Updates

Just push to GitHub - Vercel auto-deploys:

```bash
git add .
git commit -m "Update game"
git push origin main
```

---

## 📚 Full Guide

See **VERCEL_DEPLOYMENT.md** for:

- Detailed troubleshooting
- Custom domain setup
- CLI deployment
- Monitoring tools

---

## 🆘 Quick Fixes

**Build fails?**

- Check environment variables are set
- Verify all 4 VITE\_ variables exist

**Can't connect wallet?**

- Check contract address is correct
- Verify you're on Sepolia network

**Wrong network?**

- App will auto-prompt to switch
- Make sure VITE_CHAIN_ID is `11155111`

---

## ✨ You're Ready!

Your files are configured and tested. Just:

1. Push to GitHub
2. Import on Vercel
3. Add env variables
4. Deploy!

**Good luck! 🚀**
