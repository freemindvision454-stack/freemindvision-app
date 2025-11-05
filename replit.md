# FreeMind Vision

FreeMind Vision is a global creator platform inspired by TikTok, YouTube, and Twitter, designed to empower creators worldwide to share content, build audiences, and monetize their creativity.

## Project Overview

**Mission**: Enable creators to express themselves, grow their audience, and earn real money through an accessible, creator-first video platform.

**Target Audience**: Content creators globally, with special focus on African creators and international markets.

## Key Features (MVP)

### Authentication & User Management
- Multi-provider authentication via Replit Auth (Google, GitHub, Email)
- User profiles with bio, stats, and creator status
- Currency preferences (FCFA, USD, EUR, etc.)
- Credit balance (YimiCoins) tracking

### Video Platform
- TikTok-style vertical video feed with auto-play
- Video upload with drag-and-drop interface
- Custom thumbnails support
- Video metadata (title, description)
- Views and likes tracking
- Comments system

### Monetization System
- **YimiCoins**: Virtual currency for supporting creators
- **Credit Shop**: Purchase YimiCoins packages
- **Virtual Gifts**: 6 gift types (Heart, Star, Crown, Diamond, Lightning, Trophy)
- **60/40 Revenue Split**: Creators keep 60% of all gifts received
- **Multi-currency Support**: Display earnings in FCFA, USD, etc.

### Creator Dashboard
- Total earnings tracking (60% of gift value)
- Video performance metrics (views, likes, gifts)
- Revenue breakdown visualization
- Individual video earnings

### Social Features
- Like videos
- Comment on videos
- Share functionality (prepared for implementation)
- User profiles with video galleries

## Tech Stack

### Frontend
- **React** with TypeScript
- **Wouter** for routing
- **TailwindCSS** + Shadcn UI for beautiful components
- **TanStack Query** for data fetching
- **React Hook Form** with Zod validation

### Backend
- **Express.js** with TypeScript
- **PostgreSQL** (Neon) for data persistence
- **Drizzle ORM** for type-safe database queries
- **Replit Auth** (OpenID Connect) for authentication
- **Multer** for file uploads
- **Passport.js** for session management

## Database Schema

### Core Tables
- **users**: User accounts with profile data, creator status, credits, earnings
- **videos**: Video metadata, URLs, stats (views, likes)
- **comments**: User comments on videos
- **likes**: Many-to-many relationship for video likes
- **giftTypes**: Predefined virtual gifts with credit costs and USD values
- **gifts**: Gift transactions between users
- **creditPackages**: YimiCoins purchase packages
- **transactions**: Financial transaction history
- **sessions**: Passport session storage

## Revenue Model

### Creator Earnings (60/40 Split)
- Creators receive **60%** of gift value in USD
- Platform retains **40%** for infrastructure and operations
- Automatic conversion from YimiCoins to USD
- Real-time earnings tracking in dashboard

### Example:
- User sends 1 Diamond gift (100 YimiCoins = $1.00 USD)
- Creator receives: $0.60 USD
- Platform receives: $0.40 USD

## Payment Methods Supported

### For Users (Buying Credits)
- Credit/Debit Cards (Visa, Mastercard)
- Mobile Money (Orange Money, MTN Money, Wave, Airtel Money)
- PayPal
- Bank Transfer

### For Creators (Withdrawals)
- Mobile Money (Africa)
- PayPal (International)
- Bank Transfer (International)
- Stripe (Coming soon)

## Project Structure

```
├── client/                 # React frontend
│   ├── src/
│   │   ├── pages/         # Page components
│   │   │   ├── Landing.tsx        # Marketing landing page
│   │   │   ├── Feed.tsx           # TikTok-style video feed
│   │   │   ├── Upload.tsx         # Video upload interface
│   │   │   ├── Dashboard.tsx      # Creator earnings dashboard
│   │   │   ├── Profile.tsx        # User/creator profiles
│   │   │   └── CreditShop.tsx     # YimiCoins purchase
│   │   ├── components/    # Reusable components
│   │   │   ├── AppLayout.tsx      # Main navigation layout
│   │   │   ├── GiftModal.tsx      # Gift sending modal
│   │   │   └── ui/                # Shadcn components
│   │   ├── hooks/         # Custom React hooks
│   │   └── lib/           # Utilities
├── server/                 # Express backend
│   ├── routes.ts          # API endpoints
│   ├── storage.ts         # Database operations
│   ├── db.ts              # Database connection
│   ├── replitAuth.ts      # Authentication setup
│   └── seed.ts            # Database seeding
├── shared/
│   └── schema.ts          # Shared types & Drizzle schema
└── uploaded_videos/       # Video file storage
```

## API Endpoints

### Authentication
- `GET /api/login` - Initiate OAuth flow
- `GET /api/logout` - End user session
- `GET /api/auth/user` - Get current user

### Videos
- `GET /api/videos` - Fetch video feed
- `POST /api/videos` - Upload new video (with multer)
- `POST /api/videos/:id/view` - Increment view count
- `POST /api/videos/:id/like` - Like a video
- `DELETE /api/videos/:id/like` - Unlike a video

### Comments
- `GET /api/comments/:videoId` - Get video comments
- `POST /api/comments` - Create comment

### Gifts
- `GET /api/gift-types` - Get available gifts
- `POST /api/gifts/send` - Send gift to creator

### Credits
- `GET /api/credit-packages` - Get YimiCoins packages
- `POST /api/credits/purchase` - Buy credits

### Dashboard
- `GET /api/dashboard/stats` - Get creator stats
- `GET /api/dashboard/videos` - Get creator videos with earnings

### Profile
- `GET /api/profile/:userId` - Get user profile with videos

## Design System

### Colors
- **Primary**: Pink/Magenta (#e91e63) - Brand color, CTAs
- **Gradients**: Pink to purple for hero sections
- **Typography**: Inter (body), Poppins (headings)
- **Spacing**: Consistent 4, 6, 8, 12, 16 units
- **Interactions**: Subtle hover-elevate and active-elevate-2 effects

### Components
- All components use Shadcn UI primitives
- Responsive design (mobile-first)
- Smooth animations and transitions
- Accessible (WCAG AA contrast)

## Development Commands

```bash
# Install dependencies
npm install

# Run development server
npm run dev

# Push database schema
npm run db:push

# Seed database
npx tsx server/seed.ts
```

## Environment Variables

Required secrets (managed by Replit):
- `DATABASE_URL` - PostgreSQL connection string
- `SESSION_SECRET` - Session encryption key
- `REPL_ID` - Replit app ID (for auth)
- `ISSUER_URL` - OAuth issuer (defaults to Replit)

## Future Enhancements (Phase 2)

- Live streaming with real-time chat
- Video filters and effects (TikTok-style)
- AI-powered content moderation
- Recommendation algorithm
- Mobile app (React Native)
- Multiple language support with auto-translation
- Analytics dashboard
- Stripe integration for real payments
- Mobile Money API integration
- Follow/follower system
- Notification system
- Direct messaging

## Recent Changes

**2025-11-05**: Phase 2 - Real Payment Integration
- **Stripe Integration**: Full credit card payment processing with Stripe
  - Payment intent creation for secure transactions (API version 2024-06-20)
  - Stripe webhook handling with signature verification (production-ready)
  - Customer management with saved Stripe IDs
  - Payment method modal for selecting payment options
  - Dedicated checkout page with Stripe Elements integration
  - Proper error handling and fallback modes
- **Mobile Money Support**: Orange Money, MTN Money, Wave payment pages
  - Dedicated payment pages for each Mobile Money provider
  - Phone number validation and payment instructions
  - FCFA currency conversion (1 USD = 655 FCFA)
  - Mobile Money initiation endpoint with pending payment tracking
  - Auto-completion simulation for testing (production requires real APIs)
- **Bank Transfer Support**: ECO BANQUE and other banks
  - Bank account details display with copy-to-clipboard functionality
  - Payment reference generation for transaction tracking
  - Comprehensive wire transfer instructions
  - FCFA amount display with USD conversion
- **Database Enhancements**:
  - Added stripeCustomerId and stripeConnectId to users table
  - Added paymentMethod and paymentProvider to transactions table
  - Transaction status management (pending, completed, failed, cancelled)
  - updateUser and updateTransactionStatus methods in storage layer
- **Payment Flow**: Seamless multi-method payment experience
  - Payment method selection modal with 5 options
  - Route-based payment pages (/checkout, /payment/orange_money, etc.)
  - Fallback test mode for development without API keys
  - French language interface for African markets
- **Security**: Webhook signature verification, encrypted transactions, no stored card data
- **TODO**: Stripe Connect for creator withdrawals (Phase 3)

**2025-01-05**: Initial MVP implementation
- Complete database schema with all relations
- Authentication with Replit Auth (Google, GitHub, Email)
- Video upload with multer and storage
- TikTok-style video feed with vertical scrolling
- Gift system with 6 virtual gifts
- Credit shop with 6 packages
- Creator dashboard with revenue tracking (60/40 split)
- Multi-currency support (FCFA, USD)
- Responsive UI with Shadcn components
- All core features functional and tested

## User Preferences

- Design: Modern, vibrant, TikTok-inspired
- Target: Global creators with Africa focus
- Revenue split: 60% creator / 40% platform
- Primary currency: FCFA for Africa, USD internationally
