// ─── Auth Messages ────────────────────────────────────────────
export const AUTH_MESSAGES = {
  SIGNUP_SUCCESS: 'Account created successfully. Please login to get your token.',
  LOGIN_SUCCESS: 'Logged in successfully.',
  EMAIL_EXISTS: 'Email already registered. Please log in.',
  INVALID_CREDENTIALS_EMAIL: 'Invalid credentials. No account found with this email.',
  INVALID_CREDENTIALS_PASSWORD: 'Invalid credentials. Incorrect password.',
  USER_NOT_FOUND: 'User no longer exists. Please log in again.',
  TOKEN_INVALID: 'Invalid token. Please log in again.',
  TOKEN_EXPIRED: 'Token expired. Please log in again.',
  NO_TOKEN: 'Access denied. No token provided. Please log in.',
};

// ─── Role Messages ────────────────────────────────────────────
export const ROLE_MESSAGES = {
  ACCESS_DENIED: (roles: string[], userRole: string) =>
    `Access denied. This route is for: ${roles.join(', ')} only. Your role: ${userRole}`,
};

// ─── Doctor Messages ──────────────────────────────────────────
export const DOCTOR_MESSAGES = {
  PROFILE_CREATED: 'Doctor profile created successfully.',
  PROFILE_UPDATED: 'Doctor profile updated successfully.',
  PROFILE_EXISTS: 'Doctor profile already exists. Use PATCH /doctor/profile to update it.',
  PROFILE_NOT_FOUND: 'Doctor profile not found. Please complete onboarding via POST /doctor/profile.',
  DOCTOR_NOT_FOUND: (id: string) => `Doctor with ID ${id} not found.`,
  INVALID_ID: 'Invalid doctor ID format.',
  NO_DOCTORS_FOUND: 'No doctors found matching your criteria.',
};

// ─── Patient Messages ─────────────────────────────────────────
export const PATIENT_MESSAGES = {
  PROFILE_CREATED: 'Patient profile created successfully.',
  PROFILE_UPDATED: 'Patient profile updated successfully.',
  PROFILE_EXISTS: 'Patient profile already exists. Use PATCH /patient/profile to update it.',
  PROFILE_NOT_FOUND: 'Patient profile not found. Please complete onboarding via POST /patient/profile.',
};

// ─── Availability Messages ────────────────────────────────────
export const AVAILABILITY_MESSAGES = {
  RECURRING_CREATED: 'Recurring availability created successfully.',
  RECURRING_UPDATED: 'Recurring availability updated successfully.',
  RECURRING_DELETED: 'Recurring availability deleted successfully.',
  OVERRIDE_CREATED: 'Custom availability override created successfully.',
  NOT_FOUND: (id: string) => `Availability slot with ID ${id} not found.`,
  NO_AVAILABILITY: 'No recurring availability found. Please add availability via POST /doctor/availability.',
  OVERLAP: (day: string) => `Overlapping time slot detected for ${day}. Please choose a non-overlapping time.`,
  INVALID_TIME_RANGE: (start: string, end: string) =>
    `Invalid time range: startTime (${start}) must be before endTime (${end}).`,
  PAST_DATE: (date: string) => `Invalid date: ${date} is in the past.`,
  UNAUTHORIZED: 'You can only update your own availability.',
  UNAUTHORIZED_DELETE: 'You can only delete your own availability.',
  DATE_UNAVAILABLE: 'Doctor is unavailable on this date.',
  NO_AVAILABILITY_DAY: (day: string) => `No availability set for ${day}.`,
  MISSING_DATE: 'Please provide a date query param. e.g. ?date=2026-06-15',
  INVALID_DATE_FORMAT: 'Invalid date format. Use YYYY-MM-DD (e.g. 2026-06-15).',
};

// ─── Slot Messages ────────────────────────────────────────────
export const SLOT_MESSAGES = {
  GENERATED: (count: number) => `${count} slots generated successfully.`,
  ALREADY_GENERATED: (date: string) =>
    `Slots already generated for ${date}. Delete existing slots first.`,
  NO_AVAILABILITY: (date: string) =>
    `No availability found for ${date}. Please set availability first.`,
  WINDOW_TOO_SMALL: (duration: number) =>
    `No slots could be generated. The availability window is too small for ${duration} min slots.`,
  NOT_FOUND: (date: string) =>
    `No slots found for ${date}. Generate slots via POST /doctor/slots/generate.`,
  NO_AVAILABLE_SLOTS: 'No available slots found for this date.',
  PAST_DATE: (date: string) => `Cannot view slots for past date: ${date}.`,
  MISSING_DATE: 'Please provide a date. e.g. ?date=2026-06-20',
  INVALID_DATE_FORMAT: 'Invalid date format. Use YYYY-MM-DD (e.g. 2026-06-20).',
};

// ─── Appointment Messages ─────────────────────────────────────
export const APPOINTMENT_MESSAGES = {
  BOOKED: 'Appointment booked successfully.',
  CANCELLED: 'Appointment cancelled successfully.',
  NOT_FOUND: (id: string) => `Appointment with ID ${id} not found.`,
  SLOT_NOT_FOUND: (date: string, start: string, end: string) =>
    `Slot not found for ${date} at ${start}-${end}.`,
  SLOT_ALREADY_BOOKED: (start: string, end: string, date: string) =>
    `Slot at ${start}-${end} on ${date} is already booked.`,
  PAST_DATE: (date: string) => `Cannot book appointment for past date: ${date}.`,
  PAST_TIME: (time: string) => `Cannot book appointment for past time: ${time}.`,
  DUPLICATE: (time: string, date: string) =>
    `You already have an appointment at ${time} on ${date}.`,
  ALREADY_CANCELLED: 'Appointment is already cancelled.',
  CANNOT_CANCEL_PAST: 'Cannot cancel a past appointment.',
  UNAUTHORIZED: 'You can only cancel your own appointments.',
  NO_APPOINTMENTS: 'No appointments found.',
};
