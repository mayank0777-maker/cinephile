/**
 * End-to-end API smoke test.  Start the server first (npm run dev), seed the DB, then:
 *    npm run test:api
 * Exercises auth, catalogue, seat locking (including a concurrent double-booking race),
 * demo payment, cancellation, watchlist, reviews and admin authorisation.
 * Requires ALLOW_DEMO_PAYMENTS=true and no Razorpay keys for the payment steps.
 */
const BASE = process.env.API_URL || "http://localhost:5000/api";
let passed = 0;
let failed = 0;

async function call(method, path, { token, body } = {}) {
  const res = await fetch(BASE + path, {
    method,
    headers: { "Content-Type": "application/json", ...(token ? { Authorization: `Bearer ${token}` } : {}) },
    body: body ? JSON.stringify(body) : undefined,
  });
  let json = {};
  try { json = await res.json(); } catch { /* empty body */ }
  return { ...json, status: res.status }; // HTTP status wins over any "status" field in the body
}

function check(name, cond, extra = "") {
  if (cond) { passed++; console.log(`  ✔ ${name}`); }
  else { failed++; console.log(`  ✘ ${name} ${extra}`); }
}

async function main() {
  console.log(`\nCinephile API smoke test → ${BASE}\n`);
  const stamp = Date.now();

  const health = await call("GET", "/health");
  check("health endpoint", health.status === 200 && health.success, JSON.stringify(health));

  // --- auth
  const reg = await call("POST", "/auth/register", { body: { name: "Smoke Tester", email: `smoke${stamp}@test.com`, password: "secret123" } });
  check("register new user → 201 + token", reg.status === 201 && reg.token);
  const dup = await call("POST", "/auth/register", { body: { name: "Smoke Tester", email: `smoke${stamp}@test.com`, password: "secret123" } });
  check("duplicate email → 409", dup.status === 409);
  const sneaky = await call("POST", "/auth/register", { body: { name: "Sneaky", email: `sneaky${stamp}@test.com`, password: "secret123", role: "admin" } });
  check("role cannot be self-assigned on register", sneaky.user?.role === "user");
  const badLogin = await call("POST", "/auth/login", { body: { email: `smoke${stamp}@test.com`, password: "wrong" } });
  check("wrong password → 401", badLogin.status === 401);
  const userA = (await call("POST", "/auth/login", { body: { email: `smoke${stamp}@test.com`, password: "secret123" } })).token;
  check("login → token", Boolean(userA));
  const userB = sneaky.token;
  const meRes = await call("GET", "/auth/me", { token: userA });
  check("GET /auth/me with token", meRes.status === 200 && meRes.user?.email === `smoke${stamp}@test.com`);
  check("GET /auth/me without token → 401", (await call("GET", "/auth/me")).status === 401);
  const adminLoginAsUser = await call("POST", "/auth/login", { body: { email: `smoke${stamp}@test.com`, password: "secret123", adminOnly: true } });
  check("admin-only login rejects normal user → 403", adminLoginAsUser.status === 403);
  const admin = (await call("POST", "/auth/login", { body: { email: "admin@cinephile.com", password: "Admin@123", adminOnly: true } })).token;
  check("admin login", Boolean(admin));

  // --- catalogue
  const movies = await call("GET", "/movies?status=now_showing&limit=50");
  check("list now showing movies", movies.items?.length > 0);
  const filters = await call("GET", "/movies/filters");
  check("genre/language filters", filters.genres?.length > 0 && filters.languages?.length > 0);
  const search = await call("GET", "/movies?search=dune");
  check("search movies (dune)", search.items?.some((m) => /dune/i.test(m.title)));
  const byGenre = await call("GET", "/movies?genre=Animation");
  check("filter by genre", byGenre.items?.length > 0 && byGenre.items.every((m) => m.genres.includes("Animation")));
  const movie = movies.items[0];
  const detail = await call("GET", `/movies/${movie.slug}`);
  check("movie details by slug (cast/crew)", detail.movie?._id === movie._id && Array.isArray(detail.movie.cast));
  check("unknown movie → 404", (await call("GET", "/movies/000000000000000000000000")).status === 404);
  const cities = await call("GET", "/theatres/cities");
  check("cities list", cities.cities?.includes("Mumbai"));

  const shows = await call("GET", `/shows?movie=${movie._id}&city=Mumbai`);
  check("shows for movie in Mumbai", shows.items?.length > 0, JSON.stringify(shows).slice(0, 200));
  const show = shows.items.find((x) => x.availableSeats > 10);
  const showDetail = await call("GET", `/shows/${show._id}`);
  check("show detail with seat status", showDetail.show?.layout && Array.isArray(showDetail.seats?.booked));

  // pick 2 free seats
  const layout = showDetail.show.layout;
  const taken = new Set([...showDetail.seats.booked, ...showDetail.seats.locked]);
  const free = [];
  for (const c of layout.categories) for (const r of c.rows) for (let n = 1; n <= layout.seatsPerRow; n++) if (!taken.has(`${r}${n}`)) free.push(`${r}${n}`);
  const seats = free.slice(0, 2);

  // --- booking + locking
  check("booking without login → 401", (await call("POST", "/bookings", { body: { showId: show._id, seats } })).status === 401);
  check("invalid seat → 400", (await call("POST", "/bookings", { token: userA, body: { showId: show._id, seats: ["Z99"] } })).status === 400);
  const b1 = await call("POST", "/bookings", { token: userA, body: { showId: show._id, seats } });
  check("user A holds 2 seats → 201 pending", b1.status === 201 && b1.booking?.status === "pending", JSON.stringify(b1));
  const expectedSubtotal = seats.reduce((n, id) => n + layout.categories.find((c) => c.rows.includes(id[0])).price, 0);
  check("server-side price calculation", b1.booking?.subtotal === expectedSubtotal && b1.booking.totalAmount === expectedSubtotal + b1.booking.convenienceFee);
  const b2 = await call("POST", "/bookings", { token: userB, body: { showId: show._id, seats: [seats[1]] } });
  check("user B cannot take a held seat → 409", b2.status === 409);
  const viewB = await call("GET", `/shows/${show._id}`, { token: userB });
  check("held seat shows as locked for others", viewB.seats.locked.includes(seats[0]));

  // concurrent race: 6 parallel requests for the same free seat
  const raceSeat = free[5];
  const racers = await Promise.all(
    Array.from({ length: 6 }, async (_, i) => {
      const r = await call("POST", "/auth/register", { body: { name: `Racer ${i}`, email: `racer${i}_${stamp}@test.com`, password: "secret123" } });
      return r.token;
    })
  );
  const results = await Promise.all(racers.map((t) => call("POST", "/bookings", { token: t, body: { showId: show._id, seats: [raceSeat] } })));
  const wins = results.filter((r) => r.status === 201).length;
  check(`concurrent race for seat ${raceSeat}: exactly 1 winner (got ${wins})`, wins === 1);
  const winner = results.find((r) => r.status === 201);
  if (winner) await call("POST", `/bookings/${winner.booking._id}/release`, { token: racers[results.indexOf(winner)] });
  const afterRelease = await call("GET", `/shows/${show._id}`);
  check("released seat becomes available again", !afterRelease.seats.locked.includes(raceSeat));

  // --- payment (demo mode)
  const cfg = await call("GET", "/payments/config");
  check(`payment config (mode=${cfg.mode})`, ["razorpay", "demo", "disabled"].includes(cfg.mode) && !("keySecret" in cfg));
  if (cfg.mode === "demo") {
    const order = await call("POST", "/payments/order", { token: userA, body: { bookingId: b1.booking._id } });
    check("create payment order", order.status === 201 && order.orderId && order.amount === b1.booking.totalAmount * 100);
    const otherUserPay = await call("POST", "/payments/demo/complete", { token: userB, body: { orderId: order.orderId } });
    check("another user cannot complete my payment → 404", otherUserPay.status === 404);
    const fail = await call("POST", "/payments/failed", { token: userA, body: { orderId: order.orderId, reason: "User closed checkout" } });
    check("cancelled checkout recorded, hold kept", fail.status === 200 && fail.booking?.status === "pending");
    const order2 = await call("POST", "/payments/order", { token: userA, body: { bookingId: b1.booking._id } });
    const paid = await call("POST", "/payments/demo/complete", { token: userA, body: { orderId: order2.orderId } });
    check("retry payment → booking confirmed", paid.status === 200 && paid.booking?.status === "confirmed" && paid.booking.paymentStatus === "paid");
    const after = await call("GET", `/shows/${show._id}`);
    check("paid seats are now permanently booked", seats.every((x) => after.seats.booked.includes(x)));
    const again = await call("POST", "/bookings", { token: userB, body: { showId: show._id, seats: [seats[0]] } });
    check("booked seat cannot be re-booked → 409", again.status === 409);

    const ticket = await call("GET", `/bookings/${b1.booking.bookingId}`, { token: userA });
    check("fetch ticket by booking reference", ticket.booking?.bookingId === b1.booking.bookingId);
    check("other user cannot view my booking → 404", (await call("GET", `/bookings/${b1.booking._id}`, { token: userB })).status === 404);
    const mine = await call("GET", "/bookings/my?type=upcoming", { token: userA });
    check("my upcoming bookings", mine.items?.some((x) => x._id === b1.booking._id));
    if (ticket.canCancel) {
      const cancel = await call("POST", `/bookings/${b1.booking._id}/cancel`, { token: userA });
      check("cancel booking → refund initiated, seats freed", cancel.booking?.status === "cancelled" && ["refunded", "refund_initiated"].includes(cancel.booking.paymentStatus));
      const freed = await call("GET", `/shows/${show._id}`);
      check("cancelled seats returned to inventory", seats.every((x) => !freed.seats.booked.includes(x)));
    }
  }

  // --- watchlist & reviews
  const wl = await call("POST", `/users/watchlist/${movie._id}`, { token: userA });
  check("add to watchlist", wl.inWatchlist === true);
  const wlList = await call("GET", "/users/watchlist", { token: userA });
  check("get watchlist", wlList.items?.some((m) => m._id === movie._id));
  const rv = await call("POST", `/movies/${movie._id}/reviews`, { token: userA, body: { rating: 9, comment: "Smoke test review" } });
  check("post review", rv.status === 201 && rv.review?.rating === 9);
  check("invalid rating → 400", (await call("POST", `/movies/${movie._id}/reviews`, { token: userA, body: { rating: 42 } })).status === 400);
  if (rv.review) await call("DELETE", `/reviews/${rv.review._id}`, { token: userA });

  // --- admin authorisation
  check("user cannot access admin stats → 403", (await call("GET", "/admin/stats", { token: userA })).status === 403);
  check("user cannot create movie → 403", (await call("POST", "/movies", { token: userA, body: { title: "x" } })).status === 403);
  const stats = await call("GET", "/admin/stats", { token: admin });
  check("admin stats", stats.totals?.movies > 0 && Array.isArray(stats.revenueSeries));
  const newMovie = await call("POST", "/movies", {
    token: admin,
    body: { title: `Smoke Movie ${stamp}`, description: "Created by the smoke test", genres: "Drama, Thriller", languages: "English", duration: 120, releaseDate: new Date().toISOString(), posterUrl: "https://example.com/p.jpg" },
  });
  check("admin creates movie", newMovie.status === 201 && newMovie.movie?.genres.length === 2);
  const invalidMovie = await call("POST", "/movies", { token: admin, body: { title: "No description" } });
  check("movie validation errors → 400", invalidMovie.status === 400);
  const theatres = await call("GET", "/theatres?city=Mumbai");
  const t = theatres.items[0];
  const start = new Date(Date.now() + 30 * 24 * 3600 * 1000);
  start.setUTCHours(4, 30, 0, 0);
  const created = await call("POST", "/shows", { token: admin, body: { movie: newMovie.movie._id, theatre: t._id, screenName: t.screens[0].name, language: "English", startTimes: [start.toISOString()] } });
  check("admin schedules show", created.status === 201 && created.created?.length === 1, JSON.stringify(created).slice(0, 200));
  const overlap = await call("POST", "/shows", { token: admin, body: { movie: newMovie.movie._id, theatre: t._id, screenName: t.screens[0].name, language: "English", startTimes: [new Date(start.getTime() + 30 * 60000).toISOString()] } });
  check("overlapping show on same screen rejected → 409", overlap.status === 409);
  if (created.created?.[0]) check("admin deletes show", (await call("DELETE", `/shows/${created.created[0]._id}`, { token: admin })).status === 200);
  check("admin deletes movie", (await call("DELETE", `/movies/${newMovie.movie._id}`, { token: admin })).status === 200);
  const users = await call("GET", "/users?limit=5", { token: admin });
  check("admin lists users", users.items?.length > 0 && users.items.every((u) => !("password" in u)));
  const allBookings = await call("GET", "/bookings?limit=5", { token: admin });
  check("admin lists bookings", allBookings.items?.length > 0);
  check("unknown route → 404 JSON", (await call("GET", "/nope")).status === 404);

  console.log(`\n${passed} passed, ${failed} failed\n`);
  process.exit(failed ? 1 : 0);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
