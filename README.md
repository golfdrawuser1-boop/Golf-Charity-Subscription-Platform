# GolfDraw — Golf Charity Subscription Platform

## Payment Gateway: Razorpay (INR)
## Auth: Supabase
## Backend: Node.js / Express
## Frontend + Admin: React + Vite

---

## Quick Setup

### 1. Backend
```bash
cd backend
npm install
# Fill in backend/.env (see below)
npm run dev     # starts on port 5000
```

### 2. Frontend
```bash
cd frontend
npm install
# Fill in frontend/.env
npm run dev     # starts on port 5173
```

### 3. Admin Panel
```bash
cd admin
npm install
npm run dev     # starts on port 5174
```

---

## Environment Variables

### backend/.env
```
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_ANON_KEY=your_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key

RAZORPAY_KEY_ID=rzp_test_xxxxxxxxxx
RAZORPAY_KEY_SECRET=your_razorpay_key_secret
RAZORPAY_WEBHOOK_SECRET=your_webhook_secret

PORT=5000
NODE_ENV=development
FRONTEND_URL=http://localhost:5173
ADMIN_URL=http://localhost:5174

EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=587
EMAIL_USER=your_email@gmail.com
EMAIL_PASS=your_app_password

PRIZE_POOL_PERCENTAGE=60
MIN_CHARITY_PERCENTAGE=10
```

### frontend/.env
```
VITE_API_URL=http://localhost:5000
VITE_RAZORPAY_KEY_ID=rzp_test_xxxxxxxxxx
```

### admin/.env
```
VITE_API_URL=http://localhost:5000
```

---

## Razorpay Setup
1. Create account at https://dashboard.razorpay.com
2. Go to Settings → API Keys → Generate Test Key
3. Copy Key ID → `RAZORPAY_KEY_ID` (and `VITE_RAZORPAY_KEY_ID`)
4. Copy Key Secret → `RAZORPAY_KEY_SECRET`
5. For webhooks: Settings → Webhooks → Add URL: `https://yourbackend.com/api/subscriptions/webhook`

## Test Cards (Razorpay)
- **Success:** 4111 1111 1111 1111 | Any future date | Any CVV
- **Failure:** 4000 0000 0000 0002

---

## Database Setup
1. Go to Supabase Dashboard → SQL Editor
2. Paste entire contents of `backend/schema.sql`
3. Click Run

---

## Admin Account Setup
1. Register a regular account via the frontend
2. Go to Supabase → Table Editor → `users` table
3. Find your user → change `role` from `user` to `admin`
4. Log in at the admin panel (port 5174)

---

## Payment Flow
1. User selects plan → clicks Subscribe
2. Frontend calls `POST /api/subscriptions/create-order` → gets Razorpay order
3. Razorpay checkout modal opens in-browser
4. User pays → Razorpay calls `handler` with `razorpay_payment_id`, `razorpay_signature`
5. Frontend calls `POST /api/subscriptions/verify-payment`
6. Backend verifies HMAC signature → saves subscription to DB → returns success
7. User lands on `/success` page → auto-redirects to dashboard
