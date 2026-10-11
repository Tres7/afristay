/** Help centre in English (same sections and order as the French version in page.tsx). */
export const SECTIONS_EN = [
  {
    id: "reservations",
    title: "Bookings",
    items: [
      { q: "How do I book a place?", a: "Choose your dates and number of guests on the listing page, then click “Book”. Pick a payment method and pay: the booking is confirmed as soon as payment is received and appears in “My bookings”." },
      { q: "Can I book if the place is already taken?", a: "No. Dates already booked are blocked, and a search with dates only shows places available for that period." },
      { q: "How do I contact my host?", a: "On the listing page, click “Contact”. The conversation is then available in “Messages”." },
    ],
  },
  {
    id: "annulation",
    title: "Cancellation",
    items: [
      { q: "How do I cancel a booking?", a: "In Profile → My bookings, click “Cancel” on the stay. You can cancel until the day before check-in." },
      { q: "Can I cancel a stay that has started?", a: "No, a stay that has started or ended can no longer be cancelled online. Contact your host through messaging." },
    ],
  },
  {
    id: "paiement",
    title: "Payment",
    items: [
      { q: "Which payment methods are accepted?", a: "Mobile Money (Moov, T-Money, MTN, Orange, Airtel…) and Visa or Mastercard via FedaPay, or PayPal (charged in euros). You choose when booking." },
      { q: "When am I charged?", a: "When you book, on FedaPay's or PayPal's secure page. The dates are held for 30 minutes while you pay; the booking is confirmed as soon as payment is received." },
      { q: "When is the host paid?", a: "Kwa-Ba holds your payment until you arrive and only pays the host 24 hours after the stay begins. If there's a problem on arrival, report it within that time." },
      { q: "How am I refunded?", a: "To the payment method you used, according to the cancellation policy: in full more than 7 days before check-in, partially between 7 days and 48 hours." },
      { q: "What do the service fees cover?", a: "An 8% service fee is added to the nightly price. The breakdown is shown before you confirm." },
    ],
  },
  {
    id: "transferts",
    title: "Airport transfer",
    items: [
      { q: "How do I book a driver at the airport?", a: "From “Airport transfer” (or from your stay confirmation): enter your flight, choose the vehicle and pay. Book at least 6 hours before landing." },
      { q: "When will I know who my driver is?", a: "Their name, number and vehicle are emailed to you by the day before you arrive at the latest, and appear in Profile → My transfers." },
      { q: "My flight is delayed", a: "The driver waits up to 60 minutes after the scheduled time. Beyond that, let them know by phone or WhatsApp: their number is in your transfer." },
      { q: "Can I cancel?", a: "Yes, free of charge up to 24 hours before arrival. After that, the transfer is no longer refunded." },
    ],
  },
  {
    id: "compte",
    title: "My account",
    items: [
      { q: "I didn't get my verification code", a: "Check your spam folder, then use “Resend code” on the verification page (a new code every 60 seconds). The code is valid for 10 minutes." },
      { q: "I forgot my password", a: "Click “Forgot your password?” on the log-in page: we'll email you a code to choose a new password." },
      { q: "How do I become a host?", a: "From Profile → Become a host, activate your host account, then list your place from the Host space." },
      { q: "How do I change the language?", a: "Use the FR / EN switch at the top of the page or in the footer, or go to Profile → Language & region. Your choice is remembered on this device." },
    ],
  },
  {
    id: "conditions",
    title: "Terms of use",
    items: [
      { q: "Travellers' commitments", a: "Provide accurate information and respect the place, the number of guests booked and the host's house rules." },
      { q: "Hosts' commitments", a: "Publish accurate listings (photos, price, amenities), honour confirmed bookings and reply to travellers." },
    ],
  },
  {
    id: "confidentialite",
    title: "Privacy",
    items: [
      { q: "What data is collected?", a: "Name, email, phone (optional), your bookings, favourites and messages. This data is only used to run the service." },
      { q: "Is my password protected?", a: "Yes: it is stored in encrypted (hashed) form and is never visible, not even to the Kwa-Ba team." },
    ],
  },
];
