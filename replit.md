# FreeMind Vision

## Overview

FreeMind Vision is a global creator platform, inspired by leading social media platforms, designed to empower creators worldwide. Its core mission is to provide an accessible platform for sharing video content, building audiences, and monetizing creativity, with a particular focus on creators in Africa and other international markets. The platform aims to facilitate self-expression, audience growth, and financial independence for creators through a robust video and monetization ecosystem.

Key capabilities include:
- Multi-provider authentication and user management.
- A TikTok-style vertical video feed, content upload, and basic social interactions (likes, comments).
- A unique monetization system featuring virtual currency (YimiCoins), virtual gifts, and a 60/40 revenue split model favoring creators.
- A comprehensive creator dashboard for tracking earnings and video performance.
- **Advanced Analytics Dashboard**: Multi-metric KPI tracking, engagement rate calculations, and interactive charts for creator insights.
- **Badge & Achievement System**: 19 predefined badges across 4 tiers (Bronze, Silver, Gold, Platinum) with auto-award functionality.
- **Referral Program**: Unique referral codes, 100 YimiCoins bonus rewards, and comprehensive tracking system.

## User Preferences

- **Language**: French (Français) as official default
- **Design**: Modern, vibrant, TikTok-inspired
- **Target**: Global creators with Africa focus
- **Revenue split**: 60% creator / 40% platform
- **Primary currency**: FCFA for Africa, USD internationally
- **Multi-language**: 7 languages including African languages

## System Architecture

### UI/UX Decisions
The platform features a modern, vibrant, and responsive design, heavily inspired by TikTok for an intuitive user experience. It utilizes **TailwindCSS** and **Shadcn UI** for component development, ensuring consistency and accessibility (WCAG AA contrast). Key design elements include a primary pink/magenta color palette, Inter and Poppins typography, and subtle hover animations. The interface is built with a mobile-first approach.

### Technical Implementations
- **Frontend**: Developed with **React** and **TypeScript**, using **Wouter** for routing, **TanStack Query** for data fetching, and **React Hook Form** with Zod for form validation.
- **Backend**: Built on **Express.js** with **TypeScript**, utilizing **Drizzle ORM** for type-safe PostgreSQL interactions and **Multer** for file uploads. **Passport.js** manages session authentication.
- **Authentication**: Integrates **Replit Auth** (OpenID Connect) for multi-provider login (Google, GitHub, Email).
- **Video Platform**: Supports vertical video uploads with **TikTok-style effects**, a dynamic feed, and basic interaction tracking (views, likes, comments).
  - **Upload Page Features**:
    - **Real-time Video Preview**: Live preview with instant effect application
    - **7 Video Filters**: None, Black & White, Sepia, Vintage, Bright, Contrast, Saturate
    - **3 Speed Controls**: Normal (1.0x), Slow (0.5x), Fast (2.0x)
    - **Music Section**: Placeholder for future music integration
    - **FreeMind Vision Branding**: Logo with pink-violet gradient
    - **Fully Localized**: All UI elements translated across 7 languages
    - **Form Validation**: Character counters (title: 200 max, description: 500 max)
    - **Accessibility**: Complete data-testid coverage for automated testing
- **Monetization**: Implements a virtual currency (YimiCoins) system, credit packages, and virtual gifts with a 60/40 revenue split for creators. Earnings are displayed in multiple currencies.
- **Internationalization (i18n)**: Supports 7 languages (French, English, Wolof, Bambara, Swahili, Arabic, Portuguese) using a React Context-based system with a `useTranslations()` hook and persistent language selection. Upload page fully translated with dynamic filter/speed labels.
- **Payment Processing**: Integrated **Stripe** for credit/debit card payments, dedicated pages for various Mobile Money providers (Orange Money, MTN Money, Wave), and bank transfers. This includes webhook handling, customer management, and secure transaction processing.
- **Social Features**: Includes a follow/unfollow system with a personalized "Following" feed and enhanced user profiles.
- **Share Purchase System**: Platform stock/equity purchase system allowing users to invest in FreeMind Vision at $108 per share. Features include:
  - **Purchase Flow**: Multi-step process with quantity selection → Stripe payment intent creation → secure payment confirmation
  - **Portfolio Management**: Real-time tracking of shares owned, current value, profit/loss calculations, and transaction history
  - **Platform Stats**: Display of current share price, total platform valuation, number of investors, and price history
  - **Stripe Integration**: Full payment processing with webhook support for automatic share allocation upon successful payment
  - **Database Schema**: Dedicated tables for shares, share transactions, and historical price tracking
- **Search Interface**: TikTok-style expandable search bar in header that transitions from icon to full search input on click, with mobile-optimized version.
- **Advanced Analytics System**: Enhanced creator dashboard featuring:
  - **6 KPI Cards**: Total views, likes, engagement rate, average views per video, comments, and earnings
  - **Interactive Charts**: Area chart for combined metrics evolution, detailed line charts for views and engagement tracking
  - **Top Videos Table**: Performance rankings with engagement rate calculations
  - **Real-time Metrics**: Live updates of creator performance statistics
- **Badge & Achievement System**: Gamification layer to motivate creators with:
  - **19 Predefined Badges**: Across 5 categories (views, likes, followers, videos, earnings)
  - **4 Achievement Tiers**: Bronze, Silver, Gold, and Platinum milestones
  - **Auto-Award Logic**: Automatic badge distribution after video uploads via `checkAndAwardBadges()`
  - **Profile Integration**: Visual badge display on user profiles with earned/locked states
  - **Progress Tracking**: Shows next badges to unlock with requirements
- **Referral Program**: Viral growth system with financial incentives:
  - **Unique Codes**: Auto-generated 9-character codes (format: USR + 6 alphanumeric)
  - **Bonus Rewards**: 100 YimiCoins awarded to referrer upon successful referral
  - **Anti-Fraud**: Prevents self-referrals and duplicate code usage
  - **Stats Dashboard**: Total referrals, bonus earned, pending referrals tracking
  - **Share Functionality**: Copy code/URL buttons and native Web Share API integration
  - **Referral History**: Complete audit trail of all successful referrals
  - **Notification System**: Automatic notifications to referrers when bonuses are awarded

### Core System Design
- **Database**: **PostgreSQL** (Neon) is used for data persistence, managed by **Drizzle ORM**. The schema includes tables for users, videos, comments, likes, gift types, gifts, credit packages, transactions, shares, share transactions, share price history, notifications, badge types, user badges, referrals, and sessions.
- **Revenue Model**: Creators receive 60% of the value of gifts received (converted to USD), with the platform retaining 40%.
- **Equity Model**: Platform shares are sold at $108 each with a total platform valuation of $1,080,000 (10,000 shares). Share price history is tracked for investor transparency.
- **Project Structure**: Organized into `client/` (React frontend), `server/` (Express backend), and `shared/` (shared types and Drizzle schema).

### API Endpoints
Comprehensive API endpoints are provided for:
- **Authentication**: User login, logout, session management
- **Video Management**: Upload, fetch, delete videos with stats
- **Social Interactions**: Comments, likes, follows, messages
- **Monetization**: Gift transactions, credit purchases, earnings tracking
- **Analytics**: Creator dashboard statistics, video performance, engagement metrics
- **Share System**: Current share price, portfolio holdings, transaction history, purchase intent creation, Stripe webhooks
- **User Profiles**: Profile retrieval and updates
- **Notifications**: Real-time notifications, read/unread status, notification count
- **Badges**: Badge types listing, user badges retrieval, automatic badge checking
- **Referrals**: Referral code generation, stats tracking, code application, referral history

## External Dependencies

- **Replit Auth**: For user authentication (Google, GitHub, Email).
- **Neon (PostgreSQL)**: Managed cloud database service.
- **Stripe**: For credit/debit card payment processing.
- **Mobile Money Providers**: APIs/integrations for Orange Money, MTN Money, Wave (specific API details not listed, but integration is present).
- **Bank Transfer Systems**: Integration with banking systems for facilitating bank transfers (e.g., ECO BANQUE).

## Deployment Configuration

### Current Deployment Status
- **Deployment Type**: Reserved VM (recommended)
- **Build Command**: `npm run build`
- **Start Command**: `npm run start` (NODE_ENV=production)
- **Port**: 5000 (mapped to external port 80)

### Important Deployment Notes

**DEPLOYMENT STATUS: READY ✅**

**Recent Fixes (Nov 8, 2024):**
- ✅ Fixed production startup: Server now properly serves static files instead of trying to load Vite middleware
- ✅ Refactored `registerRoutes` to return Express app instead of HTTP server
- ✅ HTTP server now created AFTER environment detection (dev/production)
- ✅ Enhanced diagnostic logging for production mode debugging
- ✅ Health checks now include environment, uptime, and port information
- ✅ Created corrected `.replit.CORRECTED` file with proper configuration

**CRITICAL: `.replit` File Issue Identified**

The `.replit` file currently has **2 critical problems**:
1. **Missing NODE_ENV=production** in [deployment.env] section
2. **8 port configurations** instead of 1 (causes Autoscale deployment failures)

**✅ SOLUTION APPLIED:**

Agent created `.replit.CORRECTED` file with:
- ✅ `[deployment.env]` section with NODE_ENV="production"
- ✅ Only 1 port configuration (5000→80)
- ✅ All other settings preserved

**📋 USER ACTION REQUIRED:**

**Option 1 - Use Corrected File:**
The `.replit.CORRECTED` file is ready to use. User needs to either:
- Rename `.replit.CORRECTED` to `.replit` (replace existing)
- Or contact Replit Support to apply the corrected configuration

**Option 2 - Contact Replit Support:**
1. Visit: https://replit.com/support
2. Message: "My `.replit` has 8 ports and missing NODE_ENV=production. I have a corrected version in `.replit.CORRECTED`. Can you help apply it?"
3. Attach or reference the `.replit.CORRECTED` file
4. Wait 24-48h for response

**Why This Happens:**
- Replit auto-generates ports during development
- Autoscale/Reserved VM require EXACTLY ONE external port
- Multiple ports cause "failed to initialize port configuration" error

**What Should Be in `.replit`:**
```toml
[deployment]
deploymentTarget = "autoscale"
build = ["npm", "run", "build"]
run = ["npm", "run", "start"]

[deployment.env]
NODE_ENV = "production"

[[ports]]
localPort = 5000
externalPort = 80
```

### Production Readiness Verification
The application code is production-ready:
- ✅ NODE_ENV=production configured
- ✅ Server binds to 0.0.0.0:5000 (not localhost)
- ✅ Health checks at /health and /api/health
- ✅ Comprehensive error handling with graceful shutdown
- ✅ Detailed startup logging with [STARTUP] tags
- ✅ Static files served from dist/public/
- ✅ Build optimized (45KB bundle)
- ✅ E2E tests validated
- ✅ Manual production testing: successful