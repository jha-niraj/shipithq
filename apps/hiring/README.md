# ShipItHQ Hiring Platform

The intelligent hiring platform for tech companies to find pre-vetted engineers with verified skills.

## Overview

ShipItHQ Hiring is a comprehensive recruitment platform designed specifically for tech companies. It leverages AI-powered assessments, real project verification, and smart candidate matching to streamline the hiring process.

## Features

### For Companies/HR

- **Job Management**: Create and manage job postings with detailed requirements
- **Candidate Pipeline**: Track applications through customizable interview stages
- **AI-Powered Screening**: Automatic resume analysis and candidate scoring
- **Interview Scheduling**: Built-in interview scheduling and management
- **Take-Home Assignments**: Create and evaluate coding assignments
- **Team Collaboration**: Invite team members with role-based access
- **Analytics Dashboard**: Track hiring metrics and performance

### For Candidates (via Main Platform)

- **Pre-verified Profiles**: Skills verified through real projects
- **Interview Preparation**: AI-powered mock interviews
- **Application Tracking**: Real-time status updates
- **Interview Journey**: Step-by-step interview process guidance

## Tech Stack

- **Framework**: Next.js 15 (App Router)
- **Styling**: Tailwind CSS + shadcn/ui
- **Database**: PostgreSQL with Prisma ORM
- **Authentication**: NextAuth.js
- **AI Integration**: OpenAI, Sarvam (speech)
- **Payments**: Dodo Payments
- **Monorepo**: Turborepo

## Getting Started

### Prerequisites

- Node.js 18+
- pnpm 9+
- PostgreSQL database

### Installation

1. Clone the repository and navigate to the project root:
```bash
cd shipitofficial
```

2. Install dependencies:
```bash
pnpm install
```

3. Set up environment variables:
```bash
cp apps/hiring/.env.example apps/hiring/.env
```

4. Generate Prisma client:
```bash
pnpm db:generate
```

5. Run database migrations:
```bash
pnpm db:push
```

6. Start the development server:
```bash
pnpm dev --filter=hiring
```

Open [http://localhost:3001](http://localhost:3001) to view the application.

## Project Structure

```
apps/hiring/
├── actions/           # Server actions
│   ├── applications/  # Application management
│   ├── jobs/          # Job posting actions
│   └── (common)/      # Shared actions
├── app/
│   ├── (auth)/        # Authentication pages
│   ├── (home)/        # Public pages (billing, help)
│   ├── (landing)/     # Landing page
│   └── (main)/        # Dashboard and main app
├── components/
│   ├── landingpage/   # Landing page components
│   └── shared/        # Shared components
├── lib/               # Utility functions
└── types/             # TypeScript types
```

## Environment Variables

Required environment variables:

```env
# Database
DATABASE_URL=

# Authentication
BETTER_AUTH_SECRET=
BETTER_AUTH_URL=

# AI Services
OPENAI_API_KEY=
SARVAM_API_KEY=

# Payments
DODO_PAYMENTS_API_KEY=
```

## Scripts

- `pnpm dev --filter=hiring` - Start development server
- `pnpm build --filter=hiring` - Build for production
- `pnpm lint --filter=hiring` - Run linting
- `pnpm typecheck --filter=hiring` - Type checking

## Subscription Plans

| Feature | Free | Pro | Enterprise |
|---------|------|-----|------------|
| Active Job Posts | 3 | 10 | Unlimited |
| Applications/month | 50 | 500 | Unlimited |
| Interview Templates | 1 | 5 | Unlimited |
| AI Resume Screening | ❌ | ✅ | ✅ |
| Team Members | 1 | 5 | Unlimited |
| API Access | ❌ | ❌ | ✅ |
| SSO/SAML | ❌ | ❌ | ✅ |

## Contributing

Please read our contributing guidelines before submitting pull requests.

## License

Proprietary - All rights reserved.

## Support

- Documentation: [docs.shipithq.com](https://docs.shipithq.com)
- Email: support@shipithq.com
- Discord: [Join our community](https://discord.gg/coderzai)
