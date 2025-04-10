# PDD v0.1

## 1. Homepage

### 1.1 Desktop Version
- [ ] **Dynamic Relevance-Based Card Movement** (Cards that adjust position based on calculated relevance)
  - [ ] Implement backend relevance calculation (Algorithm that scores content by user interests and trends)
  - [ ] Create card animations (Smooth transitions when cards move, appear, or disappear)
  - [ ] Develop real-time update mechanism (Ensures UI reflects latest relevance scores without page refresh)

- [ ] **Publication Card Design** (Visual representation of content items)
  - [ ] Develop card component with title, source, and visual elements (Clean, informative display of key content details)
  - [ ] Implement hover effects and interactions (Visual feedback when users interact with cards)
  - [ ] Ensure visual distinction between different types of content (Clear differentiation between news and synthesized stories)

- [ ] **Masonry-Style Grid Layout** (Efficient space utilization with variable-sized content)
  - [ ] Create responsive grid system (Adapts to different screen sizes while maintaining design integrity)
  - [ ] Implement size variation based on relevance (More important content appears larger and more prominent)
  - [ ] Ensure proper spacing and alignment (Consistent visual rhythm across the interface)

- [ ] **Real-Time Updates** (Live content refreshes without user intervention)
  - [ ] Add pulse/glow effects for new/updated content (Subtle visual cues for fresh content)
  - [ ] Implement fade-out animations for less relevant content (Graceful removal of content losing relevance)
  - [ ] Optimize performance for smooth transitions (Ensuring animations don't impact page responsiveness)

- [ ] **Interactive Filters** (User controls for content personalization)
  - [ ] Create filter UI (Clean, accessible filtering controls that don't overwhelm the interface)
  - [ ] Implement category and type filtering (Allow users to focus on specific content categories)
  - [ ] Ensure smooth transitions when applying filters (Content adjusts fluidly when filters change)

- [ ] **Desktop-Specific Features** (Optimized for larger screens and pointer devices)
  - [ ] Develop hover preview functionality (Additional content details appear on mouse hover)
  - [ ] Create side panel for detailed content viewing (Read content without leaving the homepage)
  - [ ] Implement seamless transitions between states (Smooth UI state changes maintain user context)

### 1.2 Mobile Version
- [ ] **Dynamic Relevance-Based Card Movement** (Adapted for mobile interaction patterns)
  - [ ] Optimize animations for mobile performance (Lighter animations that don't drain battery or resources)
  - [ ] Adapt movement patterns for vertical layout (Card movements designed for portrait orientation)

- [ ] **Simplified Publication Cards** (Touch-optimized content presentation)
  - [ ] Create mobile-optimized card design (Sized appropriately for thumbs and touch interaction)
  - [ ] Implement single-column stacked layout (Vertically scrolling feed of content)
  - [ ] Ensure touch-friendly interactions (Appropriately sized tap targets)

- [ ] **Vertical Feed Layout** (Efficient content presentation on narrow screens)
  - [ ] Develop scrollable feed with proper loading (Smooth scrolling with progressive loading)
  - [ ] Sort content by relevance in vertical flow (Most relevant content at top of feed)
  - [ ] Implement efficient scroll performance (No stuttering or lag during scrolling)

- [ ] **Real-Time Updates** (Battery-efficient live content refreshes)
  - [ ] Create mobile-specific animations for content updates (Simpler animations for mobile)
  - [ ] Implement low-power animations for battery efficiency (Reduced animation complexity to save power)

- [ ] **Mobile-Specific Features** (Touch-centric interaction design)
  - [ ] Develop swipe gesture system for quick actions (Intuitive gestures for common actions)
  - [ ] Create collapsible filter menu/floating button (Space-efficient filtering mechanism)
  - [ ] Implement full-screen modal for content details (Immersive content viewing experience)

### 1.3 Shared Features & Implementation
- [ ] **Dynamic Animations** (Consistent motion design across platforms)
  - [ ] Create consistent animation library for both platforms (Unified motion language)
  - [ ] Implement performance optimizations (Smooth animations even on lower-end devices)

- [ ] **Card Design System** (Reusable components for content display)
  - [ ] Develop unified design system for cards (Consistent visual language across platforms)
  - [ ] Create shared component library (Reusable code for different views)

- [ ] **Relevance Indicators** (Visual cues for content importance)
  - [ ] Design visual system for trend indicators (Icons or symbols showing relevance trends)
  - [ ] Implement relevance score display (Numerical or visual representation of content importance)

- [ ] **Backend Integration** (Data services powering the dynamic interface)
  - [ ] Create WebSocket/polling system for updates (Real-time data pipeline for content updates)
  - [ ] Develop relevance calculation API (Service that computes and delivers content scores)

- [ ] **Implementation Tasks** (Core development activities)
  - [ ] Create `PublicationCard` component with required props (Fundamental building block of the interface)
  - [ ] Implement real-time update system (Infrastructure for live content updates)
  - [ ] Develop responsive layouts (Adaptable designs for various screen sizes)
  - [ ] Create filtering system (Backend and frontend for content filtering)
  - [ ] Build platform-specific detail views (Optimized content viewing experiences)
  - [ ] Optimize performance across platforms (Ensuring smooth experience on all devices)

- [ ] **Manual Refresh Mechanism** (Intuitive content refreshing)
  - [ ] Implement mobile pull-to-refresh (Swipe down gesture at top of feed to refresh content)
  - [ ] Create desktop scroll-to-top refresh (Refreshing content when user scrolls to the top)
  - [ ] Design refresh animations and indicators (Visual feedback during refresh process)
  - [ ] Implement refresh cooldown timer (Prevent excessive server requests)
  - [ ] Add error handling for failed refreshes (Clear feedback when refresh encounters issues)

## 2. Publication Belief Market Page

- [x] **Page Structure** (Overall layout and organization)
  - [x] Design layout for publication details (Clear presentation of publication information)
  - [x] Create section for belief market interface (Dedicated area for trading functionality)

### 2.1 TradingPanel Improvements
- [x] **Terminology Updates** (More intuitive language for trading actions)
  - [x] Replace "BUY YES"/"BUY NO" with clearer terms (Use "Support YES"/"Support NO" for better understanding)
  - [x] Implement consistent button labeling (Uniform terminology throughout the interface)

- [x] **Price Difference Explanation** (Help users understand market mechanics)
  - [x] Add tooltips/info icons (Contextual help for pricing concepts)
  - [x] Display belief ratio prominently (Clear visualization of market sentiment)
  - [x] Create visual indicators for market sentiment (Intuitive graphics showing market direction)

- [ ] **Fair Price Mechanism** (User control over trade pricing)
  - [ ] Implement limit price input/slider (Allow users to set their preferred price)
  - [ ] Create order placement system (Backend for processing custom-priced orders)
  - [ ] Design UI for custom price setting (Intuitive controls for price selection)

- [x] **YES/NO Visual Differentiation** (Clear distinction between opposing positions)
  - [x] Implement color coding (Green for YES/up, red for NO/down)
  - [x] Add directional icons (Arrows indicating market direction)
  - [x] Ensure accessible visual distinctions (Considerations for color-blind users)

- [x] **Contextual Market Information** (Supporting data for informed decisions)
  - [x] Display potential payout information (Show potential returns for trades)
  - [ ] Show recent trade activity (Timeline of recent market transactions)
  - [ ] Display market depth statistics (Show available shares at different price points)

- [x] **UI Simplification** (Reduce cognitive load for users)
  - [x] Group related actions logically (Organize UI elements by function)
  - [x] Create tabs/sections for advanced options (Progressive disclosure of complex features)
  - [x] Implement intuitive layout for trading actions (Clear visual hierarchy for primary actions)

- [x] **User Feedback System** (Confirmation and status information)
  - [x] Design confirmation messages (Clear indicators of successful actions)
  - [x] Create position tracking display (Show users their current market positions)
  - [x] Implement profit/loss visualization (Visual representation of trading performance)

### 2.2 Mobile-Desktop Experience Unification
- [ ] **Consistent Navigation Behavior** (Ensure unified user journey across devices)
  - [x] Update mobile news card click behavior to navigate to news detail page
  - [ ] Ensure trading panel is accessible on news detail page on both platforms
  - [ ] Create consistent UI patterns for desktop and mobile interactions

- [ ] **Mobile-Optimized Trading Panel** (Tailored for small screens)
  - [ ] Implement collapsible panel design for mobile devices
  - [ ] Add quick-action buttons for collapsed state
  - [ ] Optimize UI components for touch interaction
  - [ ] Support responsive layout adapting to screen size

- [ ] **Cross-Platform Trading Experience** (Feature parity across devices)
  - [ ] Ensure all trading functionality available on both platforms
  - [ ] Maintain consistent visual language between desktop and mobile
  - [ ] Optimize performance for mobile devices

## 3. Registration/Login & Profile
- [ ] **Registration/Login Page** (User authentication experience)
  - [ ] Nostr public key pair login with browser extension support (desktop); on Mobile, use QR scanning or password manager to save private key(?)
  - [ ] Design user authentication forms (Clean, accessible forms for account access)
  - [ ] Implement secure login process (Industry-standard authentication security)
  - [ ] Create account creation workflow (Streamlined onboarding process)

- [ ] **Profile Page** (Wallet, Portfolio, and Settings)
  - [ ] Design user profile layout (Organized presentation of user's investment and timeline)
  - [ ] Implement wallet balance display (Real-time balance updates: cash and shares)
  - [ ] Deposit and withdrawal functionality (User controls for managing funds)
  - [ ] Develop settings management interface (User controls for account preferences)


## 4. Technical Framework
- [ ] **Frontend Framework** (React, Next.js, Tailwind CSS)
  - [ ] Set up React or Typescript for project structure (Organized file and component structure)
  - [ ] Integrate Next.js for server-side rendering (Improved performance and SEO)
  - [ ] Implement Tailwind CSS for styling (Utility-first CSS framework for rapid design)
- [ ] **Backend Framework** (Node.js, Express, DB)
  - [ ] Set up Node.js server (Basic server configuration and routing)
  - [ ] Integrate Express for API development (Framework for building RESTful APIs)
  - [ ] choose MongoDB or Postgres (Database selection based on project needs)
  - [ ] Implement DB for data storage (Database setup andd schema design)