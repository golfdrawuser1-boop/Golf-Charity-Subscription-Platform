# Golf Charity Subscription Platform — Backend API

Full backend for the Golf Charity Subscription Platform as per PRD by Digital Heroes.

---

## Tech Stack
- **Node.js + Express.js** — API server
- **Supabase** — PostgreSQL database + Auth
- **Stripe** — Subscription payments (test mode)
- **Nodemailer** — Email notifications

---

## Project Structure

```
backend/
├── config/
│   ├── supabase.js        # Supabase client (anon + admin)
│   └── stripe.js          # Stripe config + plan IDs
├── middleware/
│   └── auth.js            # JWT auth, subscription check, admin check
├── routes/
│   ├── auth.js            # Register, login, logout, profile
│   ├── scores.js          # 5-score rolling system (per PRD)
│   ├── subscriptions.js   # Stripe checkout, webhook, cancel
│   ├── charities.js       # Charity listing, profiles, donations
│   ├── draws.js           # Draw results, participation history
│   ├── winners.js         # Winnings, proof upload
│   └── admin.js           # Full admin panel endpoints
├── utils/
│   ├── drawEngine.js      # Random + algorithmic draw logic
│   ├── prizePool.js       # Prize pool calculations (per PRD)
│   └── email.js           # Email templates + nodemailer
├── schema.sql             # Full Supabase database schema
├── .env.example           # Environment variables template
└── server.js              # Express app entry point
```

---

## Setup Instructions

### Step 1 — Install dependencies
```bash
cd backend
npm install
```

### Step 2 — Create Supabase project
1. Go to [supabase.com](https://supabase.com)
2. Create a **new project** (not personal — per PRD)
3. Go to **Settings → API**
4. Copy: `Project URL`, `anon public key`, `service_role key`

### Step 3 — Run database schema
1. In Supabase dashboard → **SQL Editor**
2. Click **New Query**
3. Paste the entire contents of `schema.sql`
4. Click **Run**
5. All tables will be created with sample charities seeded

### Step 4 — Set up Stripe (test mode)
1. Go to [stripe.com](https://stripe.com) → create account
2. Get your **Secret Key** from Dashboard → Developers → API Keys
3. Create two products in Stripe:
   - Monthly Plan (e.g. £19.99/month)
   - Yearly Plan (e.g. £199.99/year)
4. Copy the **Price IDs** (start with `price_`)
5. For webhooks: Stripe Dashboard → Webhooks → Add endpoint
   - URL: `https://your-backend-url/api/subscriptions/webhook`
   - Events: `checkout.session.completed`, `customer.subscription.updated`, `customer.subscription.deleted`, `invoice.payment_failed`

### Step 5 — Configure environment variables
```bash
cp .env.example .env
```
Fill in your `.env` file:
```
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key

STRIPE_SECRET_KEY=sk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...
STRIPE_MONTHLY_PRICE_ID=price_...
STRIPE_YEARLY_PRICE_ID=price_...

PORT=5000
NODE_ENV=development
FRONTEND_URL=http://localhost:5173
ADMIN_URL=http://localhost:5174

EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=587
EMAIL_USER=your-email@gmail.com
EMAIL_PASS=your-gmail-app-password
```

### Step 6 — Create admin user
After registering via `/api/auth/register`, go to Supabase dashboard:
- Table Editor → users → find your user → change `role` to `admin`

### Step 7 — Start the server
```bash
npm start
# or for development with auto-reload:
npm run dev
```

Server starts on `http://localhost:5000`

---

## API Endpoints Reference

### Auth
| Method | Route | Description | Auth |
|--------|-------|-------------|------|
| POST | `/api/auth/register` | Register new user | Public |
| POST | `/api/auth/login` | Login | Public |
| POST | `/api/auth/logout` | Logout | Private |
| POST | `/api/auth/refresh` | Refresh token | Public |
| GET | `/api/auth/me` | Get current user | Private |
| PUT | `/api/auth/profile` | Update profile | Private |
| POST | `/api/auth/forgot-password` | Send reset email | Public |

### Scores (requires active subscription)
| Method | Route | Description |
|--------|-------|-------------|
| GET | `/api/scores` | Get latest 5 scores |
| POST | `/api/scores` | Add score (auto-removes oldest) |
| PUT | `/api/scores/:id` | Edit a score |
| DELETE | `/api/scores/:id` | Delete a score |

### Subscriptions
| Method | Route | Description |
|--------|-------|-------------|
| POST | `/api/subscriptions/create-checkout` | Start Stripe checkout |
| POST | `/api/subscriptions/webhook` | Stripe webhook handler |
| GET | `/api/subscriptions/status` | Get subscription status |
| POST | `/api/subscriptions/cancel` | Cancel subscription |
| GET | `/api/subscriptions/portal` | Stripe billing portal |

### Charities
| Method | Route | Description |
|--------|-------|-------------|
| GET | `/api/charities` | List all (with search/filter) |
| GET | `/api/charities/featured` | Get spotlight charity |
| GET | `/api/charities/:id` | Charity profile + events |
| POST | `/api/charities/:id/donate` | Independent donation |
| PUT | `/api/charities/select` | User selects charity |

### Draws
| Method | Route | Description |
|--------|-------|-------------|
| GET | `/api/draws` | All published draws |
| GET | `/api/draws/upcoming` | Next upcoming draw |
| GET | `/api/draws/:id` | Single draw + results |
| GET | `/api/draws/my/participation` | User participation history |

### Winners
| Method | Route | Description |
|--------|-------|-------------|
| GET | `/api/winners` | Public winners list |
| GET | `/api/winners/my-winnings` | User winnings overview |
| POST | `/api/winners/:id/upload-proof` | Submit proof screenshot |

### Admin (admin role required)
| Method | Route | Description |
|--------|-------|-------------|
| GET | `/api/admin/analytics` | Full reports & analytics |
| GET | `/api/admin/users` | All users (paginated) |
| PUT | `/api/admin/users/:id` | Edit user |
| PUT | `/api/admin/users/:id/scores/:scoreId` | Admin edit score |
| PUT | `/api/admin/subscriptions/:id` | Manage subscription |
| POST | `/api/admin/draws/simulate` | Simulate draw (no publish) |
| POST | `/api/admin/draws/run` | Run + publish official draw |
| GET | `/api/admin/draws` | All draws including unpublished |
| POST | `/api/admin/charities` | Add charity |
| PUT | `/api/admin/charities/:id` | Edit charity |
| DELETE | `/api/admin/charities/:id` | Remove charity |
| POST | `/api/admin/charities/:id/events` | Add charity golf day |
| GET | `/api/admin/winners` | All winners for verification |
| PUT | `/api/admin/winners/:id/verify` | Approve/reject proof |
| PUT | `/api/admin/winners/:id/payout` | Mark as paid |

---

## Draw System (per PRD)

### Match Types & Prize Distribution
| Match | Pool Share | Rollover |
|-------|-----------|---------|
| 5-Number Match | 40% | Yes (Jackpot) |
| 4-Number Match | 35% | No |
| 3-Number Match | 25% | No |

### Draw Logic Options
- **Random** — Standard lottery-style (5 unique numbers, range 1-45)
- **Algorithmic** — Weighted by most/least frequent user scores

### Winner Verification Flow
```
Win Draw → Pending → Upload Proof → Verification Pending → Admin Reviews → Verified → Paid
```

---

## Deployment

### Railway (Backend)
```bash
# Install Railway CLI
npm install -g @railway/cli
railway login
railway init
railway up
```
Set all `.env` variables in Railway dashboard.

### Vercel (Frontend + Admin)
- Create NEW Vercel account (per PRD requirement)
- Deploy frontend and admin as separate projects
- Set `VITE_API_URL` to your Railway backend URL

---

## Health Check
```
GET /health
```
Returns server status and timestamp.
