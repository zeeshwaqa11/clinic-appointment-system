# API Reference

Base URL: `http://localhost:4000/api`

All request/response bodies are JSON. Authenticated routes require an `Authorization: Bearer <token>` header, where `<token>` is the JWT returned by `/auth/login` or `/auth/register`.

Every error response has the shape:

```json
{ "error": { "code": "VALIDATION_ERROR", "message": "...", "details": null } }
```

`code` is one of `VALIDATION_ERROR` (400), `UNAUTHORIZED` (401), `FORBIDDEN` (403), `NOT_FOUND` (404), `CONFLICT` (409), `UNPROCESSABLE` (422), `INTERNAL_ERROR` (500).

---

## Auth

### `POST /auth/register`
Role: public. Always creates a `PATIENT` account.

Request:
```json
{ "name": "Jane Doe", "email": "jane@example.com", "password": "password123" }
```

Response `201`:
```json
{ "token": "eyJhbGc...", "user": { "id": "...", "name": "Jane Doe", "email": "jane@example.com", "role": "PATIENT" } }
```

### `POST /auth/login`
Role: public.

Request: `{ "email": "jane@example.com", "password": "password123" }`
Response `200`: same shape as register.

### `GET /auth/me`
Role: any authenticated user. Returns `{ "user": { ... } }`.

---

## Specialties & doctors

### `GET /specialties`
Role: public. Returns `{ "specialties": [{ "id", "name" }] }`.

### `GET /doctors?specialtyId=`
Role: public. Returns each doctor's `nextAvailableSlot`.
```json
{ "doctors": [{ "id", "name", "specialty", "bio", "slotMinutes", "nextAvailableSlot": { "start", "end" } | null }] }
```

### `GET /doctors/:id`
Role: public. `{ "doctor": { "id", "name", "specialty", "bio", "slotMinutes" } }`.

### `GET /doctors/:id/slots?from=YYYY-MM-DD&to=YYYY-MM-DD`
Role: public. Runs the slot engine live (never stored). `{ "slots": [{ "start", "end" }] }`.

### `GET /doctors/:id/schedule`
Role: that doctor, or admin. `{ "blocks": [{ "id", "doctorId", "weekday", "startTime", "endTime" }] }`.

### `PUT /doctors/:id/schedule`
Role: that doctor, or admin. Replaces the doctor's entire weekly schedule; every block must fall inside clinic opening hours (`422` otherwise).

Request: `{ "blocks": [{ "weekday": 1, "startTime": "09:00", "endTime": "17:00" }] }`

### `GET /doctors/:id/exceptions`
Role: that doctor, or admin.

### `POST /doctors/:id/exceptions`
Role: that doctor, or admin.

Request (full day off): `{ "date": "2026-11-03", "type": "OFF" }`
Request (partial off / extra hours): `{ "date": "2026-11-03", "type": "EXTRA", "startTime": "10:00", "endTime": "12:00" }`

### `DELETE /doctors/:id/exceptions/:exceptionId`
Role: that doctor, or admin. `204 No Content`.

---

## Appointments

All routes below require authentication. Patients only ever see/act on their own appointments; doctors only their own; admins see everything.

### `POST /appointments`
Role: patient.

Request: `{ "doctorId": "...", "start": "2026-11-03T09:00:00.000Z", "reason": "Check-up" }`

Re-validates the slot against the slot engine and re-checks patient overlap / max-upcoming limits server-side. Returns `409 CONFLICT` if the slot is no longer free, overlaps another of the patient's appointments, or the patient is already at their upcoming-appointment limit.

### `GET /appointments?doctorId=&status=&from=&to=`
Role: any. Patients/doctors are scoped to their own appointments regardless of the `doctorId`/`patientId` query; admins can filter freely.

### `GET /appointments/:id`
Role: the patient, the doctor, or admin. `403` otherwise.

### `POST /appointments/:id/transition`
Role: doctor (own appointments), admin (any), or patient (own, `CANCELLED` only).

Request: `{ "to": "CONFIRMED" | "COMPLETED" | "NO_SHOW" | "CANCELLED", "note": "...", "visitNotes": "..." }`

- `COMPLETED`/`NO_SHOW` require the actor to be a doctor or admin, and the appointment's start time to have passed. `409` otherwise.
- `CANCELLED` by a doctor/admin requires `note` (the reason). By a patient it requires being at least `cancelCutoffHours` before the start time.
- Any transition not in `BOOKED → CONFIRMED → COMPLETED|NO_SHOW`, `BOOKED|CONFIRMED → CANCELLED` returns `409`.

### `POST /appointments/:id/reschedule`
Role: the patient who owns it, or admin. Moves the appointment to a new slot atomically; re-validates availability and patient-overlap first.

Request: `{ "start": "2026-11-04T10:00:00.000Z" }`

### `POST /appointments/:id/cancel`
Role: the patient, the doctor, or admin. Convenience wrapper around `transition` with `to: "CANCELLED"`.

Request: `{ "reason": "..." }` (required for doctor/admin, optional for a patient cancelling in time).

---

## Admin

All routes below require the `ADMIN` role (`403` for everyone else).

### `GET/PUT /admin/settings`
`{ "settings": { "timezone", "minNoticeMinutes", "bookingWindowDays", "patientMaxUpcoming", "cancelCutoffHours" } }`

### `GET/PUT /admin/hours`
`{ "hours": [{ "weekday", "openTime", "closeTime" }] }` — `PUT` replaces the full week.

### `GET/POST /admin/holidays`, `DELETE /admin/holidays/:id`
`{ "date": "2026-12-25", "name": "Christmas Day" }`

### `POST /admin/doctors`
Creates a doctor account + profile.

Request: `{ "name", "email", "password", "specialtyId", "bio", "slotMinutes": 15|20|30 }`

### `GET /admin/stats?from=&to=`
Defaults to the current week (clinic-local). `{ "stats": [{ "doctorId", "doctorName", "appointmentCount", "utilization", "noShowRate" }] }`. `utilization` and `noShowRate` are fractions in `[0, 1]`.

---

## Notifications

### `GET /notifications`
Role: any authenticated user. Their own notifications, newest first.

### `POST /notifications/:id/read`
Role: any authenticated user (their own notification only). `204 No Content`.

---

## Misc

### `GET /clinic-info`
Role: public. `{ "timezone": "Europe/London" }` — used by the frontend to display all times in clinic-local time.

### `GET /health`
Role: public. `{ "status": "ok" }`.
