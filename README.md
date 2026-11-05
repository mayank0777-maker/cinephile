# 🎬 Cinephile: MERN Movie Ticket Booking Platform

Cinephile is a full-stack movie discovery and online ticket booking platform, similar to BookMyShow or PVR. Customers browse movies, pick a city, cinema and showtime, choose seats on a live seat map and pay through Razorpay (test mode). Admins manage movies, theatres, shows, bookings and users from a separate dashboard.

| App | Tech | URL (dev) |
|---|---|---|
| **backend/** (REST API) | Node.js, Express 5, MongoDB, Mongoose, JWT, bcrypt, Multer, Razorpay | http://localhost:5000 |
| **frontend/** (customer site) | React 19, Vite, React Router 7, Tailwind CSS 4, Axios, Lucide icons | http://localhost:5173 |
| **admin/** (admin panel) | React 19, Vite, React Router 7, Tailwind CSS 4, Axios, Lucide icons | http://localhost:5174 |

---

## ✨ Features

**Customers**
- Cinematic homepage: trending hero carousel, Now Showing, Coming Soon, Popular, explore by genre, cinemas in your city
- Live search with suggestions, plus browse with genre, language and status filters, sorting and pagination
- Movie details: poster, backdrop, rating, audience score, cast and crew, YouTube trailer, reviews (rate 1 to 10)
- City picker, then a date strip covering the next 7 days, then theatres with colour-coded showtimes (available / filling fast / almost full)
- Interactive seat map with categories (Classic, Prime, Recliner, …), live availability, sold / held / selected states and a price summary
- **Seat holding with an 8-minute countdown**, so nobody else can buy your seats while you pay
- Razorpay checkout (test mode), with failure and cancellation handling and retry while the hold is valid
- Booking confirmation page with an m-ticket (booking ID and barcode) that you can print
- Dashboard: upcoming, past and cancelled bookings, cancellation with refund (up to 2 h before the show), watchlist, profile, change password
- JWT authentication, protected routes, toasts, loading skeletons, empty and error states, fully responsive

**Admins** (role-based, separate app)
- Dashboard: revenue, bookings, customers, movies, theatres, upcoming shows, 14-day revenue chart, status breakdown, revenue by city, top movies, recent bookings
- Movies: add, edit and delete, **poster and backdrop upload** (or image URL), cast and crew editor, trending and popular flags
- Theatres: add, edit and delete venues with multiple screens and a **seat-layout editor** (categories, prices, rows, aisles)
- Shows: bulk scheduling (dates × times), automatic overlap detection per screen, per-show price overrides, edit, cancel (cascades refunds) and delete
- Bookings: search and filter, view details, cancel (with refund), confirm a pending booking paid at the box office
- Users: search, promote to or demote from admin, block or unblock, delete

---

## 📁 Project structure

```
Cinephile/
├── package.json            ← one-command scripts (install:all, seed, dev, test:api)
├── README.md               ← you are here
├── API.md                  ← REST API reference (Postman-ready)
├── backend/
│   ├── config/             env.js (all env vars), db.js (MongoDB), razorpay.js
│   ├── controllers/        auth, movie, theatre, show, booking, payment, review, user, admin
│   ├── middleware/         auth.js (protect / adminOnly), errorHandler.js, upload.js (multer)
│   ├── models/             User, Movie, Theatre, Show, Booking, Payment, Review
│   ├── routes/             one router per resource
│   ├── utils/              seatService.js (seat locking), helpers, seed.js, seedData.js, apiSmokeTest.js
│   ├── uploads/            uploaded posters (served at /uploads)
│   ├── .env.example
│   └── server.js
├── frontend/
│   └── src/
│       ├── components/     Navbar, Footer, HeroCarousel, MovieCard, MovieRow, SeatMap, TrailerModal, CityPicker, ui
│       ├── pages/          Home, Movies, MovieDetails, ShowTimes, SeatSelection, Checkout, BookingDetails, Account, Theatres, Auth
│       ├── context/        AuthContext, CityContext
│       ├── services/       api.js (Axios instance + endpoint helpers)
│       ├── hooks/          useAsync, useDebounce, useCountdown
│       └── App.jsx
└── admin/
    └── src/
        ├── components/     Layout (sidebar), ui
        ├── pages/          Login, Dashboard, Movies, Theatres, Shows, Bookings, Users
        ├── context/        AuthContext (admin-only session)
        └── services/       api.js
```

---

## 🚀 Getting started

### Prerequisites
- **Node.js 18+** (tested on Node 22)
- **MongoDB** running locally on `mongodb://127.0.0.1:27017`, **or** a MongoDB Atlas connection string
- Internet access for the sample movie posters (served from TMDB's image CDN) and trailers (YouTube)

### 1. Install dependencies (all three apps)
```bash
npm run install:all
```

### 2. Configure environment variables
```bash
cp backend/.env.example backend/.env
cp frontend/.env.example frontend/.env
cp admin/.env.example admin/.env
```
Then open `backend/.env` and set a long random `JWT_SECRET`. You can generate one with:
```bash
node -e "console.log(require('crypto').randomBytes(48).toString('hex'))"
```
On Windows PowerShell, use `copy` instead of `cp`.

### 3. Seed the database with demo data
```bash
npm run seed
```
This **wipes** the users, movies, theatres, shows, bookings, payments and reviews collections in the `MONGO_URI` database. It then inserts 18 movies, 8 theatres in 5 cities, a week of upcoming shows, about two weeks of past shows with sample bookings (so the dashboard has revenue history), reviews and these accounts:

| Role | Email | Password |
|---|---|---|
| Admin | `admin@cinephile.com` | `Admin@123` |
| Customer | `user@cinephile.com` | `User@123` |

### 4. Run everything
```bash
npm run dev
```
This starts the API (5000), customer site (5173) and admin panel (5174) together. To run them separately, use one terminal each:
```bash
npm run dev:backend
```
```bash
npm run dev:frontend
```
```bash
npm run dev:admin
```

### 5. Test the API (optional)
With the backend running and the DB seeded:
```bash
npm run test:api
```
This runs 55 end-to-end checks: auth, catalogue, seat holds, a **concurrent double-booking race**, demo payment, cancellation, watchlist, reviews and admin authorisation. It creates a few test users, so run `npm run seed` again afterwards if you want a clean demo.

---

## 💳 Payments (Razorpay test mode)

1. Create a free Razorpay account, switch the dashboard to **Test Mode**, and generate API keys (Settings → API Keys).
2. Put them in `backend/.env`:
   ```
   RAZORPAY_KEY_ID=rzp_test_xxxxxxxx
   RAZORPAY_KEY_SECRET=xxxxxxxxxxxxxxxx
   ```
3. Restart the backend. The log shows `Payment mode: razorpay`.
4. At checkout, use Razorpay's test card or UPI details from their docs (for example UPI `success@razorpay`).

**How it is secured:**
- The server creates the order (`POST /api/payments/order`) with the amount **calculated on the server** from the seat layout. The browser never sends prices.
- After checkout, the server recomputes `HMAC_SHA256(order_id + "|" + payment_id, KEY_SECRET)` and compares it with Razorpay's signature using a timing-safe comparison. **Only then** is the booking confirmed and the seats sold.
- The key secret is read only from `backend/.env` and never reaches the frontend. Only the public key id is sent.
- If the checkout is closed or fails, the attempt is recorded as failed and the seats stay held so the user can retry until the timer ends. "Cancel and release seats" frees them immediately.

**No keys yet?** With `ALLOW_DEMO_PAYMENTS=true` (the default in `.env.example`) and no Razorpay keys, checkout opens a clearly labelled **demo gateway** where you choose "Simulate successful payment" or "Simulate failed payment". It runs through the same server-side confirmation logic and is switched off automatically once Razorpay keys are present. Set `ALLOW_DEMO_PAYMENTS=false` to disable it entirely.

---

## 🔒 How double booking is prevented (good viva topic)

Each `Show` document stores `bookedSeats: ["A1", …]` (sold) and `seatLocks: [{ seatId, user, booking, expiresAt }]` (temporary holds).

1. **Hold:** when the user clicks *Proceed to pay*, the server runs **one atomic `findOneAndUpdate`**. Its filter matches only if none of the requested seats is in `bookedSeats` or in a lock that hasn't expired. MongoDB applies single-document updates atomically, so if two people click at the same instant, only one update matches and the other gets *"seat just taken"* (HTTP 409). The API test fires 6 parallel requests for one seat and checks that exactly one wins.
2. **Pay:** the user has `SEAT_LOCK_MINUTES` (default 8) to pay. Other users see the seats as "being booked".
3. **Confirm:** after payment verification, another conditional atomic update moves the seats from `seatLocks` to `bookedSeats`.
4. **Expire:** a job runs every minute and marks unpaid bookings `expired`, which releases their holds. Expired locks are also ignored by every query.
5. **Edge case:** if a payment completes after the hold expired *and* someone else bought the seats in the meantime, the booking is marked failed and a refund is initiated automatically.

---

## 🗄️ Database design

| Model | Key fields | Relations |
|---|---|---|
| **User** | name, email (unique), password (bcrypt, `select:false`), role `user\|admin`, phone, city, watchlist, isBlocked | watchlist → Movie |
| **Movie** | title, slug (unique), description, genres[], languages[], formats[], duration, releaseDate, certificate, rating, userRating{average,count}, poster, backdrop, trailerUrl, cast[], crew[], status `now_showing\|upcoming\|ended`, isTrending, isPopular | |
| **Theatre** | name, city, address, amenities[], screens[{ name, formats, layout{ categories[{name, price, rows[]}], seatsPerRow, aisleAfter[] } }], isActive | |
| **Show** | movie, theatre, screenName, startTime, endTime, language, format, layout (price snapshot), bookedSeats[], seatLocks[], status | → Movie, → Theatre |
| **Booking** | bookingId (unique, e.g. `CNP-7K2M9QX4`), user, show, movie, theatre, snapshot{…}, seats[{seatId, category, price}], subtotal, convenienceFee, totalAmount, status, paymentStatus, expiresAt | → User, Show, Movie, Theatre, Payment |
| **Payment** | booking, user, provider `razorpay\|demo`, orderId (unique), paymentId, signature, amount (paise), status, refundId | → Booking, → User |
| **Review** | user, movie, rating 1–10, comment (unique per user + movie) | → User, → Movie |

Indexes include a text index on movies, `{status, releaseDate}`, `{movie, startTime}`, `{theatre, startTime}`, a unique `{theatre, screenName, startTime}`, `{user, createdAt}` on bookings and `{status, expiresAt}` for the expiry job. All schemas use validation and `timestamps`.

---

## 🧰 Useful scripts

| Command (from project root) | What it does |
|---|---|
| `npm run install:all` | Installs root, backend, frontend and admin dependencies |
| `npm run seed` | Resets and seeds the database |
| `npm run dev` | Runs API, customer site and admin panel together |
| `npm run test:api` | End-to-end API smoke test (backend must be running) |
| `npm run build` | Production builds of frontend and admin (`dist/`) |

---

## 🩺 Troubleshooting

- **`JWT_SECRET is missing`**: you haven't created `backend/.env`. Copy `.env.example` and set the secret.
- **`Could not connect to MongoDB`**: start MongoDB (Windows: `net start MongoDB`, or the MongoDB service in Services) or fix `MONGO_URI`.
- **"Cannot reach the server" in the browser**: the backend isn't running, or `VITE_API_URL` in `frontend/.env` / `admin/.env` doesn't point to it.
- **CORS error**: add your frontend URL to `CLIENT_URLS` in `backend/.env`.
- **No showtimes**: seeded shows cover 7 days from the day you ran `npm run seed`. Run it again or schedule new shows in the admin panel.
- **Posters missing**: the sample posters load from `image.tmdb.org`, so check your internet connection. Uploaded posters are stored in `backend/uploads/`.

---

*Movie titles, posters and trailers in the seed data are used for educational demonstration only (artwork via TMDB, trailers via YouTube). Theatre names are fictional.*
