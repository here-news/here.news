# Changelog

All notable changes to the Here.news application will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [0.5.3] - 2025-03-26

### Changed
- Upgraded WebSocket architecture:
  - Added generic message type handling system to SimpleWebSocketManager
  - Implemented registerMessageTypeHandler for type-based and field-based message routing
  - Modified useWebSocketConnection to use the new message routing system
  - Updated UserContext, NewsDetail, and TradingPanel to register for specific message types
  - Ensured backward compatibility with existing balance handler functionality
  - Reduced duplication of WebSocket message handling logic across components

## [0.5.2] - 2025-03-23

### Added
- Implemented Nostr-based authentication system with public key pairs
- Added client-side key generation functionality
- Created SVG avatar generation from public keys
- Added login/register modal with toggle between modes
- Integrated user authentication state management

### Fixed
- Fixed modal display issues with improved z-index and styling
- Added debugging tools for troubleshooting UI issues

## [0.5.1] - 2025-03-17

### Changed
- Refined desktop news card design with single-line summaries
- Improved genre labels with white backgrounds and colored borders/text for better readability
- Fixed background color consistency in desktop view (all cards have white backgrounds)
- Reduced overall card height for more compact display
- Enhanced hover/active states with better contrast

### Fixed
- Fixed issue with scrolling and loading more news items
- Removed unexpected animated logo in desktop view
- Improved genre label contrast and readability
- Fixed inconsistent card widths when loading more content

## [0.5.0] - 2025-03-17

### Added
- Integrated search functionality in the header across all pages
- Added colorful genre badges for better content categorization

### Changed
- Redesigned news cards as slim, one-line entries for improved information density
- Converted card layout from grid to list view to show more news at once
- Optimized thumbnail size and placement for better screen real estate usage
- Improved header and footer consistency across all pages
- Enhanced typography and readability throughout the application

### Removed
- Removed action buttons from cards for cleaner interface
- Eliminated card background colors in favor of subtle separators

## [0.4.0] - 2025-03-17

### Added
- Desktop-specific news layout with rectangular cards in a vertical list
- Trading section on each news card with price, mini-chart, and LONG/SHORT buttons
- Infinite scrolling functionality to load more news when reaching the bottom
- Search bar at the top of the page for desktop view
- Bottom search bar that appears after sufficient scrolling
- "Show More" button as an alternative to scrolling
- Loading spinner for infinite scroll loading states

### Changed
- Completely redesigned desktop news card layout
- Made news cards larger on desktop with better content organization
- Improved visual hierarchy for news information
- Enhanced responsiveness for desktop view
- Better trending indicators with color-coding

## [0.3.0] - 2025-03-16

### Added
- Mobile portrait mode enforcement
- Mini price chart next to prices

### Fixed
- API host consistency issues
- Swipe order issues on mobile

## [0.2.0] - 2025-03-15

### Added
- More consistent mobile version

## [0.1.0] - 2025-03-14

### Added
- Initial working version for mobile
- Basic functionality to demonstrate the concept