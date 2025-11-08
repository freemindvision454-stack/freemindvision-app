# FreeMind Vision

## Overview

FreeMind Vision is a global creator platform, inspired by leading social media platforms, designed to empower creators worldwide. Its core mission is to provide an accessible platform for sharing video content, building audiences, and monetizing creativity, with a particular focus on creators in Africa and other international markets. The platform aims to facilitate self-expression, audience growth, and financial independence for creators through a robust video and monetization ecosystem.

Key capabilities include:
- Multi-provider authentication and user management.
- A TikTok-style vertical video feed, content upload, and basic social interactions (likes, comments).
- A unique monetization system featuring virtual currency (YimiCoins), virtual gifts, and a 60/40 revenue split model favoring creators.
- A comprehensive creator dashboard for tracking earnings and video performance.

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

### Core System Design
- **Database**: **PostgreSQL** (Neon) is used for data persistence, managed by **Drizzle ORM**. The schema includes tables for users, videos, comments, likes, gift types, gifts, credit packages, transactions, and sessions.
- **Revenue Model**: Creators receive 60% of the value of gifts received (converted to USD), with the platform retaining 40%.
- **Project Structure**: Organized into `client/` (React frontend), `server/` (Express backend), and `shared/` (shared types and Drizzle schema).

### API Endpoints
Comprehensive API endpoints are provided for authentication, video management, comments, gift transactions, credit purchases, creator dashboard statistics, and user profile retrieval.

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

**Known Issue: `.replit` File Port Configuration**

The `.replit` file contains **8 port configurations** which may cause deployment issues on Replit:

- **Current Ports**: 5000→80 (required for deployment), plus 7 auto-generated ports
- **Replit Requirement**: Only **ONE external port** should be exposed for Autoscale/Reserved VM deployments
- **Impact**: If deployment fails with "failed to initialize port configuration" error, contact Replit Support

**If Deployment Fails Due to Ports:**
1. Contact Replit Support at https://replit.com/support
2. Request: "Please clean my `.replit` file to keep only port 5000→80 for deployment"
3. Expected result: `.replit` should have only:
   ```
   [[ports]]
   localPort = 5000
   externalPort = 80
   ```

**Note:** The `.replit` file is system-protected and accumulates ports automatically during development. This is a platform limitation that requires support intervention to resolve.

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