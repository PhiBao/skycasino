# 🚀 Vercel Deployment Guide

Deploy your SkyĈasino Blackjack frontend to Vercel in minutes!

## 📋 Prerequisites

- GitHub account
- Vercel account (free - sign up at https://vercel.com)
- Your contract deployed on Sepolia
- Infura API key

---

## 🎯 Step-by-Step Deployment

### Step 1: Prepare Your Repository

First, make sure your code is pushed to GitHub:

```bash
cd /home/kiter/skycasino

# Add all changes
git add .

# Commit
git commit -m "Prepare for Vercel deployment"

# Push to GitHub
git push origin main
```

### Step 2: Sign Up for Vercel

1. Go to https://vercel.com
2. Click **"Sign Up"**
3. Choose **"Continue with GitHub"**
4. Authorize Vercel to access your GitHub account

### Step 3: Import Your Project

1. On Vercel dashboard, click **"Add New..."** → **"Project"**
2. Find your `skycasino` repository
3. Click **"Import"**

### Step 4: Configure Project Settings

On the import screen:

#### Root Directory

- Click **"Edit"** next to Root Directory
- Set to: `frontend`
- Click **"Continue"**

#### Framework Preset

- Should auto-detect as **"Vite"**
- If not, select **"Vite"** from dropdown

#### Build Settings (auto-detected from vercel.json)

- **Build Command**: `npm run build`
- **Output Directory**: `dist`
- **Install Command**: `npm install`

### Step 5: Add Environment Variables

Click **"Environment Variables"** section and add:

| Name                    | Value                                        | Notes                  |
| ----------------------- | -------------------------------------------- | ---------------------- |
| `VITE_CONTRACT_ADDRESS` | `0x8a15d7Ed46AeF0D89519426903dFECC2729BA0e1` | Your deployed contract |
| `VITE_INFURA_API_KEY`   | `your-infura-api-key`                        | From Infura dashboard  |
| `VITE_CHAIN_ID`         | `11155111`                                   | Sepolia chain ID       |
| `VITE_CHAIN_NAME`       | `Sepolia`                                    | Network name           |

**Important**:

- Click **"Add"** after each variable
- Make sure all 4 variables are added before deploying

### Step 6: Deploy!

1. Click **"Deploy"** button
2. Wait 1-2 minutes for build to complete
3. You'll see: ✅ **"Your project has been successfully deployed"**

### Step 7: Visit Your Live Site

1. Click **"Continue to Dashboard"**
2. Click on the deployment URL (e.g., `skycasino-xyz.vercel.app`)
3. Your blackjack game is now LIVE! 🎉

---

## 🔧 Post-Deployment Setup

### Get Your Production URL

After deployment, Vercel provides:

- **Production URL**: `https://skycasino.vercel.app` (or similar)
- **Deployment URL**: `https://skycasino-abc123.vercel.app`

### Custom Domain (Optional)

1. Go to Project Settings → **Domains**
2. Click **"Add"**
3. Enter your domain (e.g., `blackjack.yourdomain.com`)
4. Follow DNS configuration instructions

---

## 🎮 Test Your Deployment

1. Open your Vercel URL
2. Click **"Connect Wallet"**
3. MetaMask should prompt to connect
4. Switch to Sepolia network
5. Start a game!

---

## 🔄 Continuous Deployment

Vercel automatically redeploys when you push to GitHub:

```bash
# Make changes to your code
nano frontend/src/Blackjack.tsx

# Commit and push
git add .
git commit -m "Update game UI"
git push origin main

# Vercel automatically deploys the new version!
```

Check deployment status at: https://vercel.com/dashboard

---

## 🐛 Troubleshooting

### Build Failed

**Check build logs**:

1. Go to Vercel dashboard
2. Click on failed deployment
3. Read build logs for errors

**Common issues**:

- Missing dependencies → Run `npm install` locally first
- TypeScript errors → Run `npm run build` locally to test
- Environment variables → Check all 4 VITE\_ vars are set

### App Loads But Can't Connect

**Environment variables not set**:

1. Go to Project Settings → **Environment Variables**
2. Verify all 4 variables exist
3. Click **"Redeploy"** if you added them after deployment

### MetaMask Not Connecting

**Check console**:

1. Open browser DevTools (F12)
2. Look for errors in Console tab
3. Common issue: wrong `VITE_CONTRACT_ADDRESS`

### Wrong Network

**Contract address mismatch**:

1. Verify `VITE_CONTRACT_ADDRESS` matches your Sepolia deployment
2. Check `VITE_CHAIN_ID` is `11155111`
3. Redeploy after fixing

---

## 🔐 Environment Variables Management

### Update Variables

1. Go to Vercel dashboard
2. Select your project
3. Go to **Settings** → **Environment Variables**
4. Click **"Edit"** on the variable
5. Update value
6. Click **"Save"**
7. Go to **Deployments** → Click **"Redeploy"**

### Add New Variables

```bash
# If you add new VITE_ variables to your code:
# 1. Update frontend/.env locally
# 2. Add the same variable in Vercel dashboard
# 3. Redeploy
```

---

## 📊 Monitor Your Deployment

### Analytics (Free)

Vercel provides built-in analytics:

1. Go to your project dashboard
2. Click **"Analytics"** tab
3. See visitor stats, page views, etc.

### Deployment Logs

1. Click **"Deployments"** tab
2. Click any deployment
3. View build logs, runtime logs, and errors

---

## 🚀 Advanced: Deploy from CLI

Install Vercel CLI:

```bash
npm install -g vercel

# Login
vercel login

# Deploy from frontend directory
cd frontend
vercel

# Follow prompts to link project
```

---

## 📝 Deployment Checklist

Before deploying, verify:

- ✅ Code pushed to GitHub
- ✅ Contract deployed on Sepolia
- ✅ Infura API key ready
- ✅ Contract address confirmed
- ✅ Frontend builds locally (`npm run build`)
- ✅ No sensitive data in code (use env vars)

After deploying, verify:

- ✅ Site loads correctly
- ✅ MetaMask connects
- ✅ Network switch works
- ✅ Can start game
- ✅ Can hit/stand
- ✅ Results display correctly

---

## 🎯 Quick Commands Reference

```bash
# Test build locally
cd frontend
npm run build
npm run preview

# Check for errors
npm run lint

# Deploy via CLI
vercel

# Deploy to production
vercel --prod

# View deployment logs
vercel logs
```

---

## 🌐 Your Live URLs

After deployment, you'll have:

- **Production**: `https://skycasino.vercel.app`
- **Preview**: `https://skycasino-git-main-yourusername.vercel.app`
- **Latest**: `https://skycasino-abc123.vercel.app`

Share the production URL with others!

---

## 🎉 Success!

Your SkyĈasino Blackjack is now:

- ✅ Live on the internet
- ✅ Automatically deploying from GitHub
- ✅ Using Sepolia testnet
- ✅ Fully encrypted with FHEVM
- ✅ Ready to share with the world!

**Share your game**: Post your Vercel URL on Twitter/X with #FHEVM #ZamaFHE 🎰

---

## 📚 Additional Resources

- **Vercel Docs**: https://vercel.com/docs
- **Vite Deployment**: https://vitejs.dev/guide/static-deploy.html
- **Vercel CLI**: https://vercel.com/docs/cli
- **Custom Domains**: https://vercel.com/docs/custom-domains

---

**Need help?** Check deployment logs on Vercel dashboard or open an issue on GitHub!
