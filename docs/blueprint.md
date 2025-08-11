# **App Name**: YourSubLink

## Core Features:

- User Authentication: Allow users to sign up and log in using Google Sign-In and email/password authentication.
- Dashboard Interface: A dashboard to view, manage, and create shortened links.
- Link Shortening: Generate shortened URLs from long URLs provided by the user.
- My Links Page: Display all created shortened links, with options to copy or manage each link.

## 🆕 New Advanced Features (Latest Updates):

- **AI-Powered Security Analysis**: Automated fraud detection using AI to analyze click patterns and identify suspicious activity
- **Custom CPM System**: Individual CPM rates per user, overriding global rates for specific users
- **Global Rules System**: Administrator-defined rules that automatically apply to all links
- **Enhanced Suspension Controls**: Granular suspension system for both users and individual links
- **Smart Click Validation**: Temporal validation to prevent rapid-fire fake clicks
- **Real-time Notifications**: Comprehensive notification system for CPM changes, suspensions, and security alerts

## Technical Architecture Updates:

- **Genkit AI Framework**: Integration with Google's Genkit for AI-powered features
- **Firebase Firestore**: Enhanced with new collections for security logs, global rules, and custom CPM tracking
- **TypeScript**: Fully typed system with enhanced type definitions for new features
- **Atomic Transactions**: writeBatch implementation for financial operation integrity

## Style Guidelines:

- Primary color: Deep indigo (#3F51B5), suggesting trust, security and efficiency.
- Background color: Light gray (#F5F5F5), a neutral backdrop for a clean interface.
- Accent color: Vibrant orange (#FF9800) to draw the user's eye to important action items or to provide important visual feedback to user actions, giving a sense of energy and movement.
- Body and headline font: 'Inter' (sans-serif) for a modern, neutral and readable text.
- Use clean, simple, and consistent icons from a library like Material Icons for intuitive navigation and actions.
- A clean and intuitive layout, ensuring ease of use and accessibility across different devices.
- Subtle animations to improve user experience during link creation and dashboard interactions.

## 🔒 Security & Anti-Fraud Measures:

- **AI-Based Pattern Recognition**: Machine learning analysis of click timestamps to detect bot activity
- **Temporal Validation**: Minimum completion time requirements for monetization gates
- **Suspension System**: Multi-level suspension capabilities (user-level and link-level)
- **Audit Trails**: Comprehensive logging of all financial transactions and security events