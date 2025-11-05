# FreeMind Vision - Design Guidelines

## Design Approach
**Reference-Based**: Primary inspiration from **TikTok** for main feed and social features, **YouTube Creator Studio** for creator dashboard, and **Stripe** for payment/monetization interfaces. The design balances playful social engagement with professional creator tools.

## Core Design Principles
1. **Mobile-First Mindset**: Design for vertical video consumption even on web
2. **Creator Empowerment**: Make monetization features prominent and transparent
3. **Vibrant Energy**: Bold, engaging aesthetics that celebrate creativity
4. **Clarity in Commerce**: Financial features should be trustworthy and clear

---

## Typography
- **Primary Font**: Inter (Google Fonts) - clean, modern, multilingual support
- **Accent Font**: Poppins (Google Fonts) - for headings and CTAs
- **Hierarchy**:
  - Hero/Main Headings: Poppins Bold, 2.5rem-4rem
  - Section Headings: Poppins SemiBold, 1.5rem-2rem
  - Body Text: Inter Regular, 1rem
  - Captions/Metadata: Inter Medium, 0.875rem
  - Numbers/Stats: Poppins SemiBold (for revenue displays)

## Layout System
**Spacing Units**: Use Tailwind units of **2, 4, 6, 8, 12, 16** (e.g., p-4, gap-8, mb-12)
- Tight spacing: 2-4 for inline elements
- Standard spacing: 6-8 for component padding
- Section spacing: 12-16 for vertical rhythm
- Max content width: `max-w-7xl` for main containers
- Video feed: Full-width with `max-w-2xl` center constraint for desktop

## Component Library

### Navigation
- **Top Bar**: Fixed position with logo left, search center, user actions right
- Height: h-16, backdrop blur effect
- Icons: Heroicons (outline style) - Home, Explore, Upload, Notifications, Profile
- Mobile: Bottom navigation with 5 primary actions

### Video Feed (TikTok-style)
- **Card Structure**: Full viewport height sections (h-screen on mobile, controlled height on desktop)
- Video: Aspect ratio 9:16, object-fit cover
- Overlay gradient: Bottom fade for text readability
- Interaction sidebar: Right-aligned vertical stack (like, comment, share, gift icons)
- Creator info: Bottom-left overlay with avatar, username, caption
- Progress indicator: Thin bar showing watch progress

### Creator Dashboard
- **Sidebar Navigation**: Fixed left sidebar (w-64) with sections: Overview, Videos, Analytics, Earnings, Settings
- **Revenue Cards**: Large, prominent cards showing total earnings, pending, withdrawn
- Display format: "450,000 FCFA" or "$500 USD" with currency flags
- **Stats Grid**: 3-4 columns showing views, likes, followers, engagement rate
- Charts: Line graphs for earnings over time, bar charts for video performance

### Gift/Credit System
- **Gift Gallery**: Grid layout (3-4 columns) showing animated gift previews
- Each gift card: Icon/animation preview, name, credit cost
- Purchase flow: Modal with credit balance display and confirmation
- Credit balance: Always visible in top-right corner with coin icon

### Upload Interface
- **Drag-drop zone**: Large, prominent area with dashed border
- Video preview: Show thumbnail and duration after upload
- Metadata form: Title (max 100 chars), Description (max 500 chars), Thumbnail upload
- Progress bar: Chunky, animated during upload

### Forms & Inputs
- Input fields: h-12, rounded-lg, border-2, focus:ring-4 ring-opacity-20
- Buttons: h-12, px-8, rounded-full for primary CTAs
- Primary CTA: Bold, high contrast (e.g., bg-gradient from pink to purple)
- Secondary: Outline style with hover fill

### Modals & Overlays
- Full-screen on mobile, centered card on desktop (max-w-md)
- Backdrop: bg-black/60 with backdrop-blur
- Close button: Top-right, large touch target (p-4)

## Images
**Hero Section**: Full-width hero showcasing diverse creator content
- Placement: Homepage top section
- Content: Collage/mosaic of video thumbnails from platform creators
- Overlay: Gradient overlay with main CTA "Start Creating Today"
- Style: Dynamic, energetic composition

**Creator Profiles**: Avatar images (circular, 40px-120px depending on context)

**Video Thumbnails**: 9:16 aspect ratio, auto-generated or custom uploaded

**Gift Icons**: Colorful, animated SVG icons (sourced from existing libraries, not generated)

## Animations
**Minimal and Purposeful**:
- Video feed: Smooth scroll snap between videos
- Like button: Simple scale animation on tap (scale-110)
- Gift send: Particle effect when gift is sent (use lightweight library)
- Loading states: Subtle skeleton screens for content loading
- **Avoid**: Complex page transitions, excessive micro-interactions

## Key Screens Layout

### 1. Homepage/Video Feed
- Full-screen vertical video player
- Minimalist UI: videos are the focus
- Swipe/scroll to next video
- Persistent top navigation (thin, semi-transparent)

### 2. Creator Dashboard
- Two-column layout: Sidebar navigation + main content area
- Revenue overview: Prominent cards at top showing FCFA/USD amounts
- Quick actions: Upload video, withdraw earnings, view analytics
- Recent videos table: Thumbnail, title, views, earnings per video

### 3. Profile Page
- Header: Cover image (optional), large avatar, username, bio, follower count
- Stats row: Total views, followers, likes
- Video grid: 3-column grid of published videos (9:16 thumbnails)
- Follow/Edit Profile CTA

### 4. Credit Shop
- Hero banner: Current balance display
- Gift packages: Grid of credit bundles (100, 500, 1000, 5000 coins)
- Payment methods: Display accepted methods (Mobile Money, cards, PayPal icons)

### 5. Upload Page
- Center-focused single-column layout
- Large upload zone at top
- Form fields below: metadata, thumbnail, publish settings
- Preview panel showing how video will appear

## Accessibility
- All interactive elements: min touch target 44px × 44px
- Form labels: Always visible, not placeholder-dependent
- Video controls: Keyboard navigable, clear play/pause states
- Alt text: Required for all thumbnails and creator avatars
- Contrast: Maintain WCAG AA for all text (especially on video overlays)

---

**Final Note**: This platform prioritizes **creator success** and **engaging content discovery**. Every design decision should make creating, sharing, and monetizing content feel effortless and rewarding.