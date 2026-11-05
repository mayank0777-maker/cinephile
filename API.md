# Cinephile REST API

Base URL: `http://localhost:5000/api`

- **Auth:** send `Authorization: Bearer <token>` (the token comes from `/auth/login` or `/auth/register`).
- 🔓 public · 🔑 logged-in user · 🛡️ admin only
- **Responses:** JSON. Success responses have `"success": true`. Errors look like `{ "success": false, "message": "…", "details"?: {…} }`.
- **Status codes:** `200` OK, `201` created, `400` validation error, `401` not logged in / bad token, `403` forbidden (not admin / blocked), `404` not found, `409` conflict (seat taken, duplicate, overlap), `410` seat hold expired, `502` payment gateway error, `503` payments not configured.

### Postman quick start
1. `POST /auth/login` with `{ "email": "admin@cinephile.com", "password": "Admin@123" }`.
2. Copy `token` into a collection variable, and set the Authorization type to *Bearer Token* with value `{{token}}`.

---

## Health
| Method | Path | | Description |
|---|---|---|---|
| GET | `/health` | 🔓 | Server status and current payment mode (`razorpay` / `demo` / `disabled`) |

## Auth `/auth`
| Method | Path | | Body | Notes |
|---|---|---|---|---|
| POST | `/auth/register` | 🔓 | `{ name, email, password, phone?, city? }` | Returns `{ token, user }`. The role is always `user`. |
| POST | `/auth/login` | 🔓 | `{ email, password, adminOnly? }` | `adminOnly: true` rejects non-admins with 403 (used by the admin panel) |
| GET | `/auth/me` | 🔑 | | Current user |
| PUT | `/auth/me` | 🔑 | `{ name?, phone?, city?, avatar? }` | Update profile |
| PUT | `/auth/password` | 🔑 | `{ currentPassword, newPassword }` | Returns a fresh token |

## Movies `/movies`
| Method | Path | | Notes |
|---|---|---|---|
| GET | `/movies` | 🔓 | Query: `status` (`now_showing`/`upcoming`/`ended`), `genre`, `language` (comma lists OK), `search`, `trending=true`, `popular=true`, `sort` (`latest`, `oldest`, `rating`, `popular`, `title`), `page`, `limit`. Admins can add `all=true` to include ended movies. Returns `{ items, total, page, pages }` |
| GET | `/movies/filters` | 🔓 | `{ genres[], languages[] }` |
| GET | `/movies/:idOrSlug` | 🔓 | `{ movie, inWatchlist }` |
| POST | `/movies` | 🛡️ | **multipart/form-data**: `title, description, genres, languages, formats, duration, releaseDate, certificate, rating, status, trailerUrl, tagline, isTrending, isPopular, cast (JSON), crew (JSON)` plus a `poster` file (or `posterUrl`) and an optional `backdrop` file (or `backdropUrl`). Max 5 MB, images only |
| PUT | `/movies/:id` | 🛡️ | Same fields, all optional |
| DELETE | `/movies/:id` | 🛡️ | 409 if active bookings exist for upcoming shows |
| GET | `/movies/:movieId/reviews` | 🔓 | `{ items, total, mine }` (`mine` = your review when logged in) |
| POST | `/movies/:movieId/reviews` | 🔑 | `{ rating: 1-10, comment? }`. Creates or updates your review |
| DELETE | `/reviews/:id` | 🔑 | Owner or admin |

Example `cast` value: `[{"name":"Zendaya","role":"Chani","image":""}]`

## Theatres `/theatres`
| Method | Path | | Notes |
|---|---|---|---|
| GET | `/theatres` | 🔓 | Query: `city`, `search` (admins: `all=true` includes inactive) |
| GET | `/theatres/cities` | 🔓 | `{ cities[] }` |
| GET | `/theatres/:id` | 🔓 | |
| POST | `/theatres` | 🛡️ | See body below |
| PUT | `/theatres/:id` | 🛡️ | Existing shows keep their own layout snapshot |
| DELETE | `/theatres/:id` | 🛡️ | 409 if active bookings exist |

```json
{
  "name": "Starlight Multiplex: Lower Parel",
  "city": "Mumbai",
  "address": "Phoenix Palladium, Lower Parel",
  "amenities": ["Dolby Atmos", "Recliners"],
  "screens": [
    {
      "name": "Screen 1",
      "formats": ["2D", "3D"],
      "layout": {
        "seatsPerRow": 16,
        "aisleAfter": [4, 12],
        "categories": [
          { "name": "Classic", "price": 180, "rows": ["A", "B", "C"] },
          { "name": "Prime", "price": 280, "rows": ["D", "E", "F", "G", "H"] },
          { "name": "Recliner", "price": 480, "rows": ["J", "K"] }
        ]
      }
    }
  ]
}
```

## Shows `/shows`
| Method | Path | | Notes |
|---|---|---|---|
| GET | `/shows` | 🔓 | Query: `movie`, `theatre`, `city`, `from`, `to` (ISO dates), `page`, `limit`. Only future, scheduled shows unless an admin passes `includePast=true` / `status=all`. Each item includes `totalSeats`, `availableSeats`, `minPrice`, `maxPrice`, populated `movie` and `theatre` |
| GET | `/shows/:id` | 🔓 | `{ show, seats: { booked[], locked[], mine[] }, serverTime }`, used by the seat map |
| POST | `/shows` | 🛡️ | `{ movie, theatre, screenName, language, format?, startTimes: [ISO…], prices?: { "Recliner": 500 } }`. Overlapping or past times are skipped and reported in `skipped[]` |
| PUT | `/shows/:id` | 🛡️ | `{ startTime?, language?, format?, prices?, status? }`. `status: "cancelled"` cancels every booking and initiates refunds |
| DELETE | `/shows/:id` | 🛡️ | 409 if confirmed bookings exist (cancel the show instead) |

## Bookings `/bookings`
| Method | Path | | Notes |
|---|---|---|---|
| POST | `/bookings` | 🔑 | `{ showId, seats: ["F5","F6"] }`. Validates seats, **prices them on the server**, holds them atomically for `SEAT_LOCK_MINUTES` and returns a `pending` booking with `expiresAt`. 409 if any seat was taken |
| GET | `/bookings/my?type=upcoming\|past\|cancelled\|all` | 🔑 | Your bookings |
| GET | `/bookings/:id` | 🔑 | By Mongo `_id` **or** booking reference (`CNP-…`). Owner or admin. Includes `canCancel` |
| POST | `/bookings/:id/cancel` | 🔑 | Confirmed bookings only, up to `CANCELLATION_CUTOFF_HOURS` before showtime. Seats are freed and a refund initiated |
| POST | `/bookings/:id/release` | 🔑 | Abandon a pending checkout (frees held seats immediately) |
| GET | `/bookings` | 🛡️ | Query: `status`, `search` (booking id / movie / customer), `from`, `to`, `page`, `limit` |
| PATCH | `/bookings/:id/status` | 🛡️ | `{ status: "cancelled" \| "confirmed", reason? }`. `confirmed` is for pending bookings paid at the box office |

## Payments `/payments`
| Method | Path | | Notes |
|---|---|---|---|
| GET | `/payments/config` | 🔓 | `{ mode, keyId }`. Only the public key id is exposed |
| POST | `/payments/order` | 🔑 | `{ bookingId }` creates a Razorpay order for the booking total. Returns `{ orderId, amount (paise), keyId, prefill }` |
| POST | `/payments/verify` | 🔑 | `{ razorpay_order_id, razorpay_payment_id, razorpay_signature }`. Verifies the HMAC-SHA256 signature, then confirms the booking. Safe to call twice |
| POST | `/payments/failed` | 🔑 | `{ orderId, reason?, release? }`. Records a failed or cancelled attempt. The hold is kept for retry unless `release: true` |
| POST | `/payments/demo/complete` | 🔑 | `{ orderId }`. **Demo mode only** (no Razorpay keys and `ALLOW_DEMO_PAYMENTS=true`) |

## Users `/users`
| Method | Path | | Notes |
|---|---|---|---|
| GET | `/users/watchlist` | 🔑 | Your watchlist movies |
| POST | `/users/watchlist/:movieId` | 🔑 | Add |
| DELETE | `/users/watchlist/:movieId` | 🔑 | Remove |
| GET | `/users` | 🛡️ | Query: `search`, `role`, `page`, `limit`. Includes `bookings` and `spent` per user |
| PATCH | `/users/:id` | 🛡️ | `{ role?: "user"\|"admin", isBlocked?: boolean }` (not yourself) |
| DELETE | `/users/:id` | 🛡️ | 409 if the user has upcoming confirmed bookings |

## Admin `/admin`
| Method | Path | | Notes |
|---|---|---|---|
| GET | `/admin/stats?days=14` | 🛡️ | Totals (users, movies, theatres, upcoming shows, bookings, revenue, tickets), `revenueSeries[]`, `statusCounts`, `topMovies[]`, `revenueByCity[]`, `recentBookings[]` |

---

## Typical booking flow (customer)
```
GET  /movies?status=now_showing            → pick a movie
GET  /shows?movie=<id>&city=Mumbai         → pick a showtime
GET  /shows/<showId>                       → draw the seat map
POST /bookings {showId, seats}             → seats held, booking "pending"
POST /payments/order {bookingId}           → Razorpay order
     (Razorpay Checkout in the browser)
POST /payments/verify {…signature}         → booking "confirmed", seats sold
GET  /bookings/CNP-XXXXXXXX                → m-ticket
```
