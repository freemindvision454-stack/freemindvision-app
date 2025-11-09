# FreeMind Vision

## Overview

FreeMind Vision is a global creator platform designed to empower creators by providing an accessible platform for sharing video content, building audiences, and monetizing creativity. Inspired by leading social media platforms, it focuses on creators in Africa and other international markets, aiming to facilitate self-expression, audience growth, and financial independence through a robust video and monetization ecosystem.

Key capabilities include:
- Multi-provider authentication and user management.
- A TikTok-style vertical video feed, content upload, and basic social interactions.
- A unique monetization system with virtual currency (YimiCoins), virtual gifts, and a 60/40 revenue split favoring creators.
- A comprehensive creator dashboard with advanced analytics, KPI tracking, and interactive charts.
- A gamified Badge & Achievement System with 19 predefined badges across 4 tiers.
- A Referral Program offering unique codes and bonus rewards.
- A Share Purchase System allowing users to invest in the platform's equity.

## User Preferences

- **Language**: French (Français) as official default
- **Design**: Modern, vibrant, TikTok-inspired
- **Target**: Global creators with Africa focus
- **Revenue split**: 60% creator / 40% platform
- **Primary currency**: FCFA for Africa, USD internationally
- **Multi-language**: 7 languages including African languages

## System Architecture

### UI/UX Decisions
The platform features a modern, vibrant, and responsive design, inspired by TikTok. It uses **TailwindCSS** and **Shadcn UI** for components, ensuring accessibility and consistency with a primary pink/magenta color palette. The design is mobile-first, utilizing Inter and Poppins typography.

### Technical Implementations
- **Frontend**: Developed with **React** and **TypeScript**, using **Wouter** for routing, **TanStack Query** for data fetching, and **React Hook Form** with Zod for form validation.
- **Backend**: Built on **Express.js** with **TypeScript**, utilizing **Drizzle ORM** for type-safe PostgreSQL interactions and **Multer** for file uploads. **Passport.js** manages session authentication.
- **Authentication**: A **hybrid system** supports both Replit Auth (Google, GitHub, Email via OIDC) and a standalone email/password system (Bcrypt, Passport Local Strategy, Zod validation, rate limiting).
- **Video Platform**: Supports vertical video uploads with real-time preview, 7 filters, 3 speed controls, FreeMind Vision branding, and full localization.
- **Monetization**: Implements a virtual currency (YimiCoins) system, credit packages, and virtual gifts with a 60/40 revenue split.
- **Internationalization (i18n)**: Supports 7 languages (French, English, Wolof, Bambara, Swahili, Arabic, Portuguese) using a React Context-based system.
- **Payment Processing**: Integrates **Stripe** for card payments, and dedicated pages for Mobile Money providers (Orange Money, MTN Money, Wave) and bank transfers.
- **Social Features**: Includes follow/unfollow system and enhanced user profiles.
- **Share Purchase System**: Allows users to buy platform equity at $108 per share, featuring a multi-step purchase flow, portfolio management, and real-time platform statistics.
- **Search Interface**: TikTok-style expandable search bar.
- **Advanced Analytics System**: Creator dashboard with 6 KPI cards, interactive charts, and a top videos table.
- **Badge & Achievement System**: Gamification with 19 badges across 4 tiers, auto-award logic, and profile integration.
- **Referral Program**: Unique 9-character codes, 100 YimiCoins bonus rewards, anti-fraud measures, and a stats dashboard.

### Core System Design
- **Database**: **PostgreSQL** managed by **Drizzle ORM**, with intelligent driver selection (Neon WebSocket for Neon, standard pg for others). Schema includes users, videos, monetization, shares, notifications, badges, and referrals.
- **Revenue Model**: Creators receive 60% of gift value, platform retains 40%.
- **Equity Model**: Platform shares are $108 each (total valuation $1,080,000 for 10,000 shares), with tracked price history.
- **Project Structure**: Organized into `client/` (React), `server/` (Express), and `shared/` (types/schema).

### API Endpoints
Comprehensive APIs cover authentication, video management, social interactions, monetization, analytics, share system, user profiles, notifications, badges, and referrals.

## External Dependencies

- **Replit Auth**: For multi-provider user authentication (Google, GitHub, Email).
- **Neon (PostgreSQL)**: Managed cloud database service.
- **Stripe**: For credit/debit card payment processing.
- **Mobile Money Providers**: Integrations for Orange Money, MTN Money, Wave.
- **Bank Transfer Systems**: Integration with banking systems (e.g., ECO BANQUE).