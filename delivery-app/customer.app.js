/* Kassenta Customer SPA (served at /customer/, wrapped by the "Kassenta Order"
   Android app). Plain ES5, no build step.

   Hash routes:
     #/intro  #/login[/email]  #/register  #/home  #/restaurants  #/menu/:slug
     #/broadcast  #/cart  #/checkout  #/waiting/:token  #/orders  #/track/:token
     #/chat/:orderId  #/account

   Built to work on slow or filtered connections (Syria): every request has a
   timeout and an error state, and nothing third-party (Google, Stripe,
   Leaflet, fonts) is required for the page to render or for an order to be
   placed. Google and Stripe are only loaded when the customer asks for them.
*/

// ─── Translations (en / de / ar) ───────────────────────────────────────────
// Kept in this file because the server only serves /customer/app.js.
// {name} placeholders are filled by t(key, vars).
window.KASSENTA_I18N = {
  en: {
    doc_title: "Kassenta — Order", back: "Back", close: "Close", ok: "OK", confirm: "Confirm", cancel: "Cancel",
    continue: "Continue", save: "Save", skip: "Skip", retry: "Retry", try_again: "Try again", please_wait: "Please wait…",
    loading: "Loading…", saved: "Saved", copy: "Copy", copied: "Copied", or: "or", remove: "Remove", add: "Add",
    decrease: "Decrease", increase: "Increase", send: "Send", sort: "Sort", optional: "Optional", required: "Required",
    unavailable: "Unavailable", processing: "Processing…", confirming: "Confirming…",
    err_title: "Something went wrong", err_server: "The server had a problem. Please try again.",
    err_network_title: "No connection", err_network: "We couldn't reach Kassenta. Check your internet connection and try again.",
    session_expired: "Your session has expired. Please sign in again.", too_many: "Too many attempts. Please wait a moment and try again.",
    // intro / auth
    intro_title: "Order from local stores", intro_sub: "Restaurants, pharmacies and markets near you — delivered or ready for pickup.",
    feat_whatsapp: "WhatsApp updates", feat_tracking: "Live tracking", feat_cash: "Pay cash on delivery",
    continue_phone: "Continue with phone number", continue_google: "Continue with Google", continue_guest: "Continue as guest",
    sign_in_email: "Sign in with email", are_you_store: "Are you a store?", open_dashboard: "Kassenta for business →",
    welcome: "Welcome", welcome_name: "Welcome, {name}!", login_sub: "Sign in to order and follow your orders.",
    login_title: "Sign in", login_email_title: "Sign in with email", email: "Email", password: "Password",
    password_hint: "At least 6 characters", sign_in: "Sign in", signing_in: "Signing in…",
    no_account: "No account yet?", create_account: "Create account", creating: "Creating account…", have_account: "Already have an account?",
    use_phone_instead: "Use phone number instead", use_email_instead: "Use email and password instead",
    phone_number: "Phone number", phone_hint: "With country code, e.g. +41 79 123 45 67", phone_hint_sy: "Syrian number, e.g. 09xx xxx xxx or +963 9xx xxx xxx",
    phone_invalid: "Please enter a valid phone number.", send_code: "Send code via WhatsApp", sending: "Sending…",
    otp_note: "We'll send a 6-digit code to your WhatsApp. No password needed.",
    otp_sent_title: "Check your WhatsApp", otp_sent_to: "We sent a code to", otp_sent_toast: "Code sent via WhatsApp",
    otp_code: "6-digit code", otp_enter: "Enter the 6-digit code.", verify: "Verify", verifying: "Verifying…",
    otp_wrong: "That code is wrong or has expired.", otp_failed: "We couldn't send the code. Please try again.",
    otp_too_many: "Too many codes requested. Please wait a few minutes.", resend_code: "Resend code", resend_in: "Resend in {s}s",
    change_number: "Change number", your_name_title: "What's your name?", your_name_msg: "The store uses it for your order.",
    your_name_ph: "Your name", fill_required: "Please fill in all required fields.", invalid_credentials: "Wrong email or password.",
    name_required: "Please enter your name.", password_short: "The password must be at least 6 characters.",
    guest_title: "Continue as guest", guest_msg: "Tell us your name so the store knows who the order is for.",
    google_failed: "Google sign-in failed. Please try again or use your phone number.",
    google_cancelled: "Google sign-in was cancelled.", google_popup_blocked: "The Google window was blocked. Allow pop-ups or use your phone number.",
    google_unavailable_title: "Google isn't available", google_unavailable_msg: "Google sign-in can't be reached right now. Please continue with your phone number — we'll send a code via WhatsApp.",
    logout: "Sign out", logout_title: "Sign out?", logout_msg: "Your cart stays on this device.", stay: "Stay signed in",
    // home & stores
    hello: "Hello", there: "there", greet_morning: "Good morning — what would you like today?",
    greet_afternoon: "Good afternoon — what would you like today?", greet_evening: "Good evening — what would you like today?",
    search_everything: "Search dishes, products, stores…", quick_order: "Quick Order",
    quick_order_sub: "Pick items from any store — the first store to accept prepares your order.",
    recent_orders: "Your orders", see_all: "See all", stores: "Stores", categories: "Categories", popular: "Popular right now",
    no_stores: "No stores open for online orders yet", check_back: "Please check back soon.",
    n_items: "{n} items", n_stores: "{n} stores", min_short: "{n} min", min_order_short: "Min. {v}", closed: "Closed",
    no_results: "Nothing found", try_other_search: "Try another search term.", search_stores: "Search stores",
    search_menu: "Search the menu", search_items: "Search items", delivery_free_short: "Free delivery",
    store_closed_note: "This store is closed right now. You can browse, but orders may be accepted later.",
    call_store: "Call store", all: "All", no_items: "No items available", from_price: "from {v}",
    bc_sub: "{d} items from {r} stores", bc_how_title: "How Quick Order works",
    bc_how: "Add items from any store. We send your order to the stores and the first one to accept prepares and delivers it. Pay cash on delivery.",
    sort_popular: "Popular", sort_price_asc: "Price: low to high", sort_price_desc: "Price: high to low", sort_name: "Name A–Z",
    all_items: "All items",
    // product sheet
    choose_option: "Choose an option", option_n: "Option {n}", options: "Options", pick_any: "Choose any", pick_one: "Choose one",
    addons: "Add-ons", notes: "Notes", item_notes_ph: "E.g. no onions", add_to_cart: "Add to cart",
    choose_required: "Please choose: {g}", added_to_cart: "Added to cart",
    // cart
    cart: "Cart", cart_empty: "Your cart is empty", cart_empty_sub: "Add something tasty from a store.", browse_stores: "Browse stores",
    bc_cart_note: "Quick Order: the first store to accept prepares your order.", add_more: "Add more items", clear_cart: "Clear cart",
    subtotal: "Subtotal", go_checkout: "Checkout", view_cart: "View cart",
    min_order_note: "Minimum order is {min}. Add {left} more for delivery.",
    clear_cart_q: "Clear the cart?", clear_cart_msg: "All items will be removed.",
    replace_cart_title: "Start a new cart?", replace_cart_msg: "Your cart has items from another store. Clear it and add this item?",
    replace_cart_ok: "Start new cart", keep_cart: "Keep my cart",
    // checkout
    checkout: "Checkout", bc_checkout_note: "Sent to all nearby stores — the first to accept prepares it. Pay cash on delivery.",
    delivery: "Delivery", pickup: "Pickup", contact: "Contact", full_name: "Full name", email_optional: "Email (optional)",
    delivery_address: "Delivery address", area_city: "Area / city", area_ph: "Neighbourhood, city", street: "Street",
    street_ph: "Street and nearby landmark", building: "Building", floor: "Floor", addr_notes: "Directions for the driver",
    addr_notes_ph: "E.g. next to the pharmacy, 2nd door", location_added: "Location added", add_location: "Add my location",
    location_optional: "Optional — the written address is enough.", locating: "Finding your location…",
    location_unavailable: "Location isn't available on this device.", location_denied: "We couldn't get your location. The written address is enough.",
    pickup_from: "Pick up from", payment: "Payment", pay_cash: "Cash on delivery", pay_pickup: "Pay at pickup",
    pay_card: "Card", pay_shamcash: "Sham Cash", pay_cash_sub: "Pay the driver when your order arrives",
    pay_pickup_sub: "Pay at the store when you collect", pay_card_sub: "Pay securely now by card",
    pay_shamcash_sub: "Transfer with Sham Cash after placing the order",
    order_notes: "Order notes", order_notes_ph: "Anything the store should know?", summary: "Summary", delivery_fee: "Delivery fee",
    free: "Free", total: "Total", discount: "Discount", total_note: "The store confirms the final price.",
    bc_total_note: "Prices may differ slightly depending on the store that accepts.",
    place_order: "Place order", send_order: "Send order", placing: "Placing order…",
    order_placed: "Order placed!", order_failed_title: "Order not placed",
    uncertain_title: "Did your order go through?", uncertain_msg: "The connection dropped while sending your order. Please check your orders before trying again so you don't order twice.",
    check_orders: "Check my orders", stay_here: "Stay here",
    // payment
    pay_order_n: "Pay order #{n}", loading_payment: "Loading secure payment…", stripe_note: "Payments are processed securely by Stripe.",
    card_unavailable: "Card payment isn't available right now.", card_load_timeout: "The payment form took too long to load. Check your connection and try again.",
    pay_now: "Pay now", payment_failed: "Payment failed. Please try again.", pay_at_pickup_instead: "Pay at pickup instead",
    pay_on_delivery_instead: "Pay on delivery instead", paid_thanks: "Payment received — thank you!",
    payment_processing: "Your payment is being processed.", order_unpaid_note: "Your order is placed. You can pay from the order page.",
    payment_not_completed: "The payment wasn't completed.", confirming_payment: "Confirming your payment…",
    order: "Order", shamcash_instructions: "Send the amount below with Sham Cash to this account, then tap \"I have paid\".",
    shamcash_number: "Sham Cash account", account_name: "Account name", shamcash_ref: "Transfer reference",
    i_have_paid: "I have paid", shamcash_store_confirms: "The store confirms your transfer before preparing the order.",
    shamcash_thanks: "Thanks! The store will confirm your transfer.",
    // quick order waiting
    waiting_title: "Finding a store…", waiting_sub: "We sent your order to nearby stores. The first to accept will prepare it.",
    cancel_request: "Cancel request", cancel_request_q: "Cancel this request?", keep_waiting: "Keep waiting",
    claimed_title: "{store} accepted your order!", claimed_sub: "Opening your order…", bc_cancelled: "Request cancelled",
    bc_expired: "No store accepted in time", bc_expired_sub: "Your items are saved. You can try again or order from a specific store.",
    restore_cart: "Back to my cart", your_items: "Your items",
    // statuses
    st_pending: "Waiting for the store", st_accepted: "Accepted", st_preparing: "Being prepared", st_ready: "Ready",
    st_ready_pickup: "Ready for pickup", st_on_way: "On the way", st_delivered: "Delivered", st_completed: "Completed",
    st_picked_up: "Picked up", st_cancelled: "Cancelled", st_rejected: "Declined by the store", st_refunded: "Refunded",
    // orders & tracking
    my_orders: "My orders", no_orders: "No orders yet", no_orders_sub: "Your orders will show up here.",
    active_orders: "Active", past_orders: "Past orders", order_not_found: "Order not found", order_n: "Order #{n}",
    track_failed_sub: "Sorry about that. Contact the store if you have questions.", track_done_sub: "Thanks for ordering!",
    track_live_sub: "This page updates automatically.", eta_min: "Estimated time: {n} min", paid: "Paid", unpaid: "Not paid yet",
    order_details: "Order details", chat: "Chat", chat_with_store: "Chat with store", open_app_home: "Order again",
    no_messages: "No messages yet", no_messages_sub: "Ask the store anything about your order.", store: "Store",
    type_message: "Type a message…",
    // account
    account: "Account", guest: "Guest", guest_session: "Guest session", edit_name: "Edit name",
    guest_upgrade_title: "Save your orders", guest_upgrade_sub: "Sign in with your phone to keep your orders on any device.",
    loyalty: "Loyalty points", n_points: "{n} points", wallet: "Wallet", preferences: "Preferences", language: "Language",
    dark_mode: "Dark mode", dark_on: "Dark theme is on", light_on: "Light theme is on", more: "More", for_stores: "Kassenta for stores",
    // tabs
    tab_home: "Home", tab_stores: "Stores", tab_quick: "Quick", tab_orders: "Orders", tab_account: "Account"
  },

  de: {
    doc_title: "Kassenta — Bestellen", back: "Zurück", close: "Schliessen", ok: "OK", confirm: "Bestätigen", cancel: "Abbrechen",
    continue: "Weiter", save: "Speichern", skip: "Überspringen", retry: "Erneut versuchen", try_again: "Nochmals versuchen", please_wait: "Bitte warten…",
    loading: "Wird geladen…", saved: "Gespeichert", copy: "Kopieren", copied: "Kopiert", or: "oder", remove: "Entfernen", add: "Hinzufügen",
    decrease: "Weniger", increase: "Mehr", send: "Senden", sort: "Sortieren", optional: "Optional", required: "Pflicht",
    unavailable: "Nicht verfügbar", processing: "Wird verarbeitet…", confirming: "Wird bestätigt…",
    err_title: "Etwas ist schiefgelaufen", err_server: "Der Server hatte ein Problem. Bitte versuche es erneut.",
    err_network_title: "Keine Verbindung", err_network: "Kassenta ist nicht erreichbar. Prüfe deine Internetverbindung und versuche es erneut.",
    session_expired: "Deine Sitzung ist abgelaufen. Bitte melde dich erneut an.", too_many: "Zu viele Versuche. Bitte warte kurz.",
    intro_title: "Bestelle bei lokalen Geschäften", intro_sub: "Restaurants, Apotheken und Märkte in deiner Nähe — geliefert oder zum Abholen.",
    feat_whatsapp: "Updates per WhatsApp", feat_tracking: "Live-Verfolgung", feat_cash: "Bar bei Lieferung",
    continue_phone: "Weiter mit Telefonnummer", continue_google: "Weiter mit Google", continue_guest: "Als Gast fortfahren",
    sign_in_email: "Mit E-Mail anmelden", are_you_store: "Sie sind ein Geschäft?", open_dashboard: "Kassenta für Geschäfte →",
    welcome: "Willkommen", welcome_name: "Willkommen, {name}!", login_sub: "Melde dich an, um zu bestellen und Bestellungen zu verfolgen.",
    login_title: "Anmelden", login_email_title: "Mit E-Mail anmelden", email: "E-Mail", password: "Passwort",
    password_hint: "Mindestens 6 Zeichen", sign_in: "Anmelden", signing_in: "Anmeldung…",
    no_account: "Noch kein Konto?", create_account: "Konto erstellen", creating: "Konto wird erstellt…", have_account: "Schon ein Konto?",
    use_phone_instead: "Stattdessen Telefonnummer verwenden", use_email_instead: "Stattdessen E-Mail und Passwort verwenden",
    phone_number: "Telefonnummer", phone_hint: "Mit Landesvorwahl, z. B. +41 79 123 45 67", phone_hint_sy: "Syrische Nummer, z. B. 09xx xxx xxx oder +963 9xx xxx xxx",
    phone_invalid: "Bitte gib eine gültige Telefonnummer ein.", send_code: "Code per WhatsApp senden", sending: "Wird gesendet…",
    otp_note: "Wir senden dir einen 6-stelligen Code per WhatsApp. Kein Passwort nötig.",
    otp_sent_title: "Schau in WhatsApp", otp_sent_to: "Code gesendet an", otp_sent_toast: "Code per WhatsApp gesendet",
    otp_code: "6-stelliger Code", otp_enter: "Gib den 6-stelligen Code ein.", verify: "Bestätigen", verifying: "Wird geprüft…",
    otp_wrong: "Der Code ist falsch oder abgelaufen.", otp_failed: "Der Code konnte nicht gesendet werden. Bitte erneut versuchen.",
    otp_too_many: "Zu viele Codes angefordert. Bitte warte ein paar Minuten.", resend_code: "Code erneut senden", resend_in: "Erneut senden in {s} s",
    change_number: "Nummer ändern", your_name_title: "Wie heisst du?", your_name_msg: "Das Geschäft braucht ihn für deine Bestellung.",
    your_name_ph: "Dein Name", fill_required: "Bitte fülle alle Pflichtfelder aus.", invalid_credentials: "E-Mail oder Passwort falsch.",
    name_required: "Bitte gib deinen Namen ein.", password_short: "Das Passwort muss mindestens 6 Zeichen haben.",
    guest_title: "Als Gast fortfahren", guest_msg: "Sag uns deinen Namen, damit das Geschäft weiss, für wen die Bestellung ist.",
    google_failed: "Google-Anmeldung fehlgeschlagen. Versuche es erneut oder nutze deine Telefonnummer.",
    google_cancelled: "Google-Anmeldung abgebrochen.", google_popup_blocked: "Das Google-Fenster wurde blockiert. Erlaube Pop-ups oder nutze deine Telefonnummer.",
    google_unavailable_title: "Google nicht erreichbar", google_unavailable_msg: "Die Google-Anmeldung ist gerade nicht erreichbar. Fahre mit deiner Telefonnummer fort — wir senden einen Code per WhatsApp.",
    logout: "Abmelden", logout_title: "Abmelden?", logout_msg: "Dein Warenkorb bleibt auf diesem Gerät.", stay: "Angemeldet bleiben",
    hello: "Hallo", there: "", greet_morning: "Guten Morgen — worauf hast du Lust?",
    greet_afternoon: "Guten Tag — worauf hast du Lust?", greet_evening: "Guten Abend — worauf hast du Lust?",
    search_everything: "Gerichte, Produkte, Geschäfte suchen…", quick_order: "Schnellbestellung",
    quick_order_sub: "Wähle Artikel aus beliebigen Geschäften — das erste, das annimmt, bereitet deine Bestellung zu.",
    recent_orders: "Deine Bestellungen", see_all: "Alle", stores: "Geschäfte", categories: "Kategorien", popular: "Gerade beliebt",
    no_stores: "Noch keine Geschäfte mit Online-Bestellung", check_back: "Schau bald wieder vorbei.",
    n_items: "{n} Artikel", n_stores: "{n} Geschäfte", min_short: "{n} Min.", min_order_short: "Min. {v}", closed: "Geschlossen",
    no_results: "Nichts gefunden", try_other_search: "Versuche einen anderen Suchbegriff.", search_stores: "Geschäfte suchen",
    search_menu: "Menü durchsuchen", search_items: "Artikel suchen", delivery_free_short: "Gratis Lieferung",
    store_closed_note: "Dieses Geschäft ist gerade geschlossen. Du kannst stöbern, Bestellungen werden evtl. später angenommen.",
    call_store: "Anrufen", all: "Alle", no_items: "Keine Artikel verfügbar", from_price: "ab {v}",
    bc_sub: "{d} Artikel aus {r} Geschäften", bc_how_title: "So funktioniert die Schnellbestellung",
    bc_how: "Füge Artikel aus beliebigen Geschäften hinzu. Wir senden deine Bestellung an die Geschäfte, und das erste, das annimmt, bereitet sie zu und liefert. Bezahlung bar bei Lieferung.",
    sort_popular: "Beliebt", sort_price_asc: "Preis aufsteigend", sort_price_desc: "Preis absteigend", sort_name: "Name A–Z",
    all_items: "Alle Artikel",
    choose_option: "Option wählen", option_n: "Option {n}", options: "Optionen", pick_any: "Beliebig wählen", pick_one: "Eine wählen",
    addons: "Extras", notes: "Hinweise", item_notes_ph: "z. B. ohne Zwiebeln", add_to_cart: "Hinzufügen",
    choose_required: "Bitte wählen: {g}", added_to_cart: "Zum Warenkorb hinzugefügt",
    cart: "Warenkorb", cart_empty: "Dein Warenkorb ist leer", cart_empty_sub: "Füge etwas Leckeres aus einem Geschäft hinzu.", browse_stores: "Geschäfte ansehen",
    bc_cart_note: "Schnellbestellung: Das erste Geschäft, das annimmt, bereitet deine Bestellung zu.", add_more: "Weitere Artikel", clear_cart: "Warenkorb leeren",
    subtotal: "Zwischensumme", go_checkout: "Zur Kasse", view_cart: "Warenkorb ansehen",
    min_order_note: "Mindestbestellwert {min}. Noch {left} für die Lieferung.",
    clear_cart_q: "Warenkorb leeren?", clear_cart_msg: "Alle Artikel werden entfernt.",
    replace_cart_title: "Neuen Warenkorb starten?", replace_cart_msg: "Dein Warenkorb enthält Artikel eines anderen Geschäfts. Leeren und diesen Artikel hinzufügen?",
    replace_cart_ok: "Neuer Warenkorb", keep_cart: "Warenkorb behalten",
    checkout: "Kasse", bc_checkout_note: "Geht an alle Geschäfte in der Nähe — das erste, das annimmt, bereitet sie zu. Bezahlung bar bei Lieferung.",
    delivery: "Lieferung", pickup: "Abholung", contact: "Kontakt", full_name: "Vollständiger Name", email_optional: "E-Mail (optional)",
    delivery_address: "Lieferadresse", area_city: "Ort / Quartier", area_ph: "z. B. Zürich Kreis 4", street: "Strasse",
    street_ph: "Strasse und Hausnummer", building: "Gebäude", floor: "Stockwerk", addr_notes: "Hinweise für den Fahrer",
    addr_notes_ph: "z. B. Hintereingang, 2. Klingel", location_added: "Standort hinzugefügt", add_location: "Meinen Standort hinzufügen",
    location_optional: "Optional — die geschriebene Adresse reicht.", locating: "Standort wird ermittelt…",
    location_unavailable: "Standort ist auf diesem Gerät nicht verfügbar.", location_denied: "Standort nicht verfügbar. Die geschriebene Adresse reicht.",
    pickup_from: "Abholen bei", payment: "Bezahlung", pay_cash: "Bar bei Lieferung", pay_pickup: "Bei Abholung bezahlen",
    pay_card: "Karte", pay_shamcash: "Sham Cash", pay_cash_sub: "Bezahle beim Fahrer, wenn die Bestellung ankommt",
    pay_pickup_sub: "Bezahle im Geschäft bei der Abholung", pay_card_sub: "Jetzt sicher mit Karte bezahlen",
    pay_shamcash_sub: "Nach der Bestellung per Sham Cash überweisen",
    order_notes: "Bemerkungen", order_notes_ph: "Etwas, das das Geschäft wissen sollte?", summary: "Übersicht", delivery_fee: "Liefergebühr",
    free: "Gratis", total: "Total", discount: "Rabatt", total_note: "Das Geschäft bestätigt den Endpreis.",
    bc_total_note: "Preise können je nach annehmendem Geschäft leicht abweichen.",
    place_order: "Bestellung aufgeben", send_order: "Bestellung senden", placing: "Bestellung wird gesendet…",
    order_placed: "Bestellung aufgegeben!", order_failed_title: "Bestellung nicht aufgegeben",
    uncertain_title: "Ist deine Bestellung angekommen?", uncertain_msg: "Die Verbindung brach beim Senden ab. Prüfe bitte deine Bestellungen, bevor du es erneut versuchst, damit du nicht doppelt bestellst.",
    check_orders: "Bestellungen prüfen", stay_here: "Hier bleiben",
    pay_order_n: "Bestellung #{n} bezahlen", loading_payment: "Sichere Zahlung wird geladen…", stripe_note: "Zahlungen werden sicher über Stripe abgewickelt.",
    card_unavailable: "Kartenzahlung ist gerade nicht verfügbar.", card_load_timeout: "Das Zahlungsformular lädt zu lange. Prüfe deine Verbindung und versuche es erneut.",
    pay_now: "Jetzt bezahlen", payment_failed: "Zahlung fehlgeschlagen. Bitte erneut versuchen.", pay_at_pickup_instead: "Stattdessen bei Abholung bezahlen",
    pay_on_delivery_instead: "Stattdessen bei Lieferung bezahlen", paid_thanks: "Zahlung erhalten — danke!",
    payment_processing: "Deine Zahlung wird verarbeitet.", order_unpaid_note: "Deine Bestellung ist aufgegeben. Du kannst auf der Bestellseite bezahlen.",
    payment_not_completed: "Die Zahlung wurde nicht abgeschlossen.", confirming_payment: "Zahlung wird bestätigt…",
    order: "Bestellung", shamcash_instructions: "Überweise den Betrag mit Sham Cash an dieses Konto und tippe dann auf «Ich habe bezahlt».",
    shamcash_number: "Sham-Cash-Konto", account_name: "Kontoinhaber", shamcash_ref: "Überweisungsreferenz",
    i_have_paid: "Ich habe bezahlt", shamcash_store_confirms: "Das Geschäft bestätigt deine Überweisung, bevor es die Bestellung zubereitet.",
    shamcash_thanks: "Danke! Das Geschäft bestätigt deine Überweisung.",
    waiting_title: "Geschäft wird gesucht…", waiting_sub: "Wir haben deine Bestellung an Geschäfte in der Nähe gesendet. Das erste, das annimmt, bereitet sie zu.",
    cancel_request: "Anfrage abbrechen", cancel_request_q: "Anfrage abbrechen?", keep_waiting: "Weiter warten",
    claimed_title: "{store} hat deine Bestellung angenommen!", claimed_sub: "Bestellung wird geöffnet…", bc_cancelled: "Anfrage abgebrochen",
    bc_expired: "Kein Geschäft hat rechtzeitig angenommen", bc_expired_sub: "Deine Artikel sind gespeichert. Versuche es erneut oder bestelle bei einem bestimmten Geschäft.",
    restore_cart: "Zurück zum Warenkorb", your_items: "Deine Artikel",
    st_pending: "Wartet auf das Geschäft", st_accepted: "Angenommen", st_preparing: "In Zubereitung", st_ready: "Bereit",
    st_ready_pickup: "Bereit zur Abholung", st_on_way: "Unterwegs", st_delivered: "Geliefert", st_completed: "Abgeschlossen",
    st_picked_up: "Abgeholt", st_cancelled: "Storniert", st_rejected: "Vom Geschäft abgelehnt", st_refunded: "Erstattet",
    my_orders: "Meine Bestellungen", no_orders: "Noch keine Bestellungen", no_orders_sub: "Deine Bestellungen erscheinen hier.",
    active_orders: "Aktiv", past_orders: "Frühere Bestellungen", order_not_found: "Bestellung nicht gefunden", order_n: "Bestellung #{n}",
    track_failed_sub: "Das tut uns leid. Bei Fragen wende dich an das Geschäft.", track_done_sub: "Danke für deine Bestellung!",
    track_live_sub: "Diese Seite aktualisiert sich automatisch.", eta_min: "Geschätzte Zeit: {n} Min.", paid: "Bezahlt", unpaid: "Noch nicht bezahlt",
    order_details: "Bestelldetails", chat: "Chat", chat_with_store: "Chat mit dem Geschäft", open_app_home: "Nochmals bestellen",
    no_messages: "Noch keine Nachrichten", no_messages_sub: "Frag das Geschäft alles zu deiner Bestellung.", store: "Geschäft",
    type_message: "Nachricht schreiben…",
    account: "Konto", guest: "Gast", guest_session: "Gastsitzung", edit_name: "Name ändern",
    guest_upgrade_title: "Bestellungen speichern", guest_upgrade_sub: "Melde dich mit deiner Telefonnummer an, um deine Bestellungen auf jedem Gerät zu sehen.",
    loyalty: "Treuepunkte", n_points: "{n} Punkte", wallet: "Guthaben", preferences: "Einstellungen", language: "Sprache",
    dark_mode: "Dunkler Modus", dark_on: "Dunkles Design ist aktiv", light_on: "Helles Design ist aktiv", more: "Mehr", for_stores: "Kassenta für Geschäfte",
    tab_home: "Start", tab_stores: "Geschäfte", tab_quick: "Schnell", tab_orders: "Bestellungen", tab_account: "Konto"
  },

  ar: {
    doc_title: "كاسنتا — اطلب الآن", back: "رجوع", close: "إغلاق", ok: "حسناً", confirm: "تأكيد", cancel: "إلغاء",
    continue: "متابعة", save: "حفظ", skip: "تخطٍّ", retry: "إعادة المحاولة", try_again: "حاول مجدداً", please_wait: "يرجى الانتظار…",
    loading: "جارٍ التحميل…", saved: "تم الحفظ", copy: "نسخ", copied: "تم النسخ", or: "أو", remove: "حذف", add: "إضافة",
    decrease: "إنقاص", increase: "زيادة", send: "إرسال", sort: "ترتيب", optional: "اختياري", required: "مطلوب",
    unavailable: "غير متاح", processing: "جارٍ المعالجة…", confirming: "جارٍ التأكيد…",
    err_title: "حدث خطأ", err_server: "حدثت مشكلة في الخادم. يرجى المحاولة مرة أخرى.",
    err_network_title: "لا يوجد اتصال", err_network: "تعذّر الوصول إلى كاسنتا. تحقّق من اتصالك بالإنترنت وحاول مجدداً.",
    session_expired: "انتهت جلستك. يرجى تسجيل الدخول مرة أخرى.", too_many: "محاولات كثيرة. يرجى الانتظار قليلاً ثم المحاولة.",
    intro_title: "اطلب من المتاجر القريبة منك", intro_sub: "مطاعم وصيدليات وأسواق بالقرب منك — توصيل إلى بابك أو استلام من المتجر.",
    feat_whatsapp: "تحديثات عبر واتساب", feat_tracking: "تتبّع مباشر", feat_cash: "الدفع نقداً عند الاستلام",
    continue_phone: "المتابعة برقم الهاتف", continue_google: "المتابعة باستخدام Google", continue_guest: "المتابعة كضيف",
    sign_in_email: "تسجيل الدخول بالبريد الإلكتروني", are_you_store: "هل لديك متجر؟", open_dashboard: "كاسنتا للأعمال ←",
    welcome: "أهلاً بك", welcome_name: "أهلاً {name}!", login_sub: "سجّل الدخول لتطلب وتتابع طلباتك.",
    login_title: "تسجيل الدخول", login_email_title: "الدخول بالبريد الإلكتروني", email: "البريد الإلكتروني", password: "كلمة المرور",
    password_hint: "6 أحرف على الأقل", sign_in: "تسجيل الدخول", signing_in: "جارٍ تسجيل الدخول…",
    no_account: "ليس لديك حساب؟", create_account: "إنشاء حساب", creating: "جارٍ إنشاء الحساب…", have_account: "لديك حساب بالفعل؟",
    use_phone_instead: "استخدم رقم الهاتف بدلاً من ذلك", use_email_instead: "استخدم البريد الإلكتروني وكلمة المرور",
    phone_number: "رقم الهاتف", phone_hint: "مع رمز الدولة، مثال: ‎+963 9xx xxx xxx", phone_hint_sy: "رقم سوري، مثال: 09xx xxx xxx أو ‎+963 9xx xxx xxx",
    phone_invalid: "يرجى إدخال رقم هاتف صحيح.", send_code: "إرسال الرمز عبر واتساب", sending: "جارٍ الإرسال…",
    otp_note: "سنرسل رمزاً من 6 أرقام إلى واتساب الخاص بك. لا حاجة لكلمة مرور.",
    otp_sent_title: "تحقّق من واتساب", otp_sent_to: "أرسلنا الرمز إلى", otp_sent_toast: "تم إرسال الرمز عبر واتساب",
    otp_code: "الرمز المكوّن من 6 أرقام", otp_enter: "أدخل الرمز المكوّن من 6 أرقام.", verify: "تحقّق", verifying: "جارٍ التحقّق…",
    otp_wrong: "الرمز غير صحيح أو منتهي الصلاحية.", otp_failed: "تعذّر إرسال الرمز. يرجى المحاولة مرة أخرى.",
    otp_too_many: "طلبت رموزاً كثيرة. يرجى الانتظار بضع دقائق.", resend_code: "إعادة إرسال الرمز", resend_in: "إعادة الإرسال بعد {s} ث",
    change_number: "تغيير الرقم", your_name_title: "ما اسمك؟", your_name_msg: "يستخدمه المتجر لتجهيز طلبك.",
    your_name_ph: "اسمك", fill_required: "يرجى تعبئة جميع الحقول المطلوبة.", invalid_credentials: "البريد الإلكتروني أو كلمة المرور غير صحيحة.",
    name_required: "يرجى إدخال اسمك.", password_short: "يجب أن تتكوّن كلمة المرور من 6 أحرف على الأقل.",
    guest_title: "المتابعة كضيف", guest_msg: "أخبرنا باسمك ليعرف المتجر لمن الطلب.",
    google_failed: "فشل تسجيل الدخول عبر Google. حاول مجدداً أو استخدم رقم هاتفك.",
    google_cancelled: "تم إلغاء تسجيل الدخول عبر Google.", google_popup_blocked: "تم حظر نافذة Google. اسمح بالنوافذ المنبثقة أو استخدم رقم هاتفك.",
    google_unavailable_title: "Google غير متاح", google_unavailable_msg: "لا يمكن الوصول إلى تسجيل الدخول عبر Google حالياً. تابع برقم هاتفك وسنرسل لك رمزاً عبر واتساب.",
    logout: "تسجيل الخروج", logout_title: "تسجيل الخروج؟", logout_msg: "ستبقى سلّتك محفوظة على هذا الجهاز.", stay: "البقاء متصلاً",
    hello: "مرحباً", there: "", greet_morning: "صباح الخير — ماذا تحب أن تطلب اليوم؟",
    greet_afternoon: "نهارك سعيد — ماذا تحب أن تطلب اليوم؟", greet_evening: "مساء الخير — ماذا تحب أن تطلب اليوم؟",
    search_everything: "ابحث عن أطباق أو منتجات أو متاجر…", quick_order: "الطلب السريع",
    quick_order_sub: "اختر من أي متجر — وأول متجر يقبل الطلب يجهّزه لك.",
    recent_orders: "طلباتك", see_all: "عرض الكل", stores: "المتاجر", categories: "الأقسام", popular: "الأكثر طلباً الآن",
    no_stores: "لا توجد متاجر تستقبل الطلبات حالياً", check_back: "يرجى العودة لاحقاً.",
    n_items: "{n} منتج", n_stores: "{n} متجر", min_short: "{n} دقيقة", min_order_short: "الحد الأدنى {v}", closed: "مغلق",
    no_results: "لا توجد نتائج", try_other_search: "جرّب كلمة بحث أخرى.", search_stores: "ابحث عن متجر",
    search_menu: "ابحث في القائمة", search_items: "ابحث عن منتج", delivery_free_short: "توصيل مجاني",
    store_closed_note: "هذا المتجر مغلق حالياً. يمكنك التصفّح، وقد تُقبل الطلبات لاحقاً.",
    call_store: "اتصل بالمتجر", all: "الكل", no_items: "لا توجد منتجات متاحة", from_price: "ابتداءً من {v}",
    bc_sub: "{d} منتج من {r} متجر", bc_how_title: "كيف يعمل الطلب السريع",
    bc_how: "أضف منتجات من أي متجر. نرسل طلبك إلى المتاجر، وأول متجر يقبله يجهّزه ويوصله إليك. الدفع نقداً عند الاستلام.",
    sort_popular: "الأكثر طلباً", sort_price_asc: "السعر: من الأقل", sort_price_desc: "السعر: من الأعلى", sort_name: "الاسم أ–ي",
    all_items: "كل المنتجات",
    choose_option: "اختر خياراً", option_n: "خيار {n}", options: "الخيارات", pick_any: "اختر ما تشاء", pick_one: "اختر واحداً",
    addons: "إضافات", notes: "ملاحظات", item_notes_ph: "مثال: بدون بصل", add_to_cart: "أضف للسلة",
    choose_required: "يرجى الاختيار: {g}", added_to_cart: "تمت الإضافة إلى السلة",
    cart: "السلة", cart_empty: "سلّتك فارغة", cart_empty_sub: "أضف شيئاً من أحد المتاجر.", browse_stores: "تصفّح المتاجر",
    bc_cart_note: "الطلب السريع: أول متجر يقبل الطلب يجهّزه لك.", add_more: "إضافة المزيد", clear_cart: "إفراغ السلة",
    subtotal: "المجموع الفرعي", go_checkout: "إتمام الطلب", view_cart: "عرض السلة",
    min_order_note: "الحد الأدنى للطلب {min}. أضف {left} للتوصيل.",
    clear_cart_q: "إفراغ السلة؟", clear_cart_msg: "ستُحذف جميع المنتجات.",
    replace_cart_title: "بدء سلة جديدة؟", replace_cart_msg: "سلّتك تحتوي منتجات من متجر آخر. هل تريد إفراغها وإضافة هذا المنتج؟",
    replace_cart_ok: "سلة جديدة", keep_cart: "الإبقاء على سلّتي",
    checkout: "إتمام الطلب", bc_checkout_note: "يُرسل إلى جميع المتاجر القريبة — وأول متجر يقبله يجهّزه. الدفع نقداً عند الاستلام.",
    delivery: "توصيل", pickup: "استلام من المتجر", contact: "بيانات التواصل", full_name: "الاسم الكامل", email_optional: "البريد الإلكتروني (اختياري)",
    delivery_address: "عنوان التوصيل", area_city: "المنطقة / المدينة", area_ph: "مثال: المزة، دمشق", street: "الشارع",
    street_ph: "الشارع وأقرب معلم", building: "البناء", floor: "الطابق", addr_notes: "إرشادات للسائق",
    addr_notes_ph: "مثال: بجانب الصيدلية، الباب الثاني", location_added: "تمت إضافة الموقع", add_location: "إضافة موقعي",
    location_optional: "اختياري — العنوان المكتوب كافٍ.", locating: "جارٍ تحديد موقعك…",
    location_unavailable: "تحديد الموقع غير متاح على هذا الجهاز.", location_denied: "تعذّر تحديد موقعك. العنوان المكتوب كافٍ.",
    pickup_from: "الاستلام من", payment: "طريقة الدفع", pay_cash: "نقداً عند الاستلام", pay_pickup: "الدفع عند الاستلام من المتجر",
    pay_card: "بطاقة", pay_shamcash: "شام كاش", pay_cash_sub: "ادفع للسائق عند وصول طلبك",
    pay_pickup_sub: "ادفع في المتجر عند استلام طلبك", pay_card_sub: "ادفع الآن بأمان بالبطاقة",
    pay_shamcash_sub: "حوّل المبلغ عبر شام كاش بعد تأكيد الطلب",
    order_notes: "ملاحظات الطلب", order_notes_ph: "هل هناك ما يجب أن يعرفه المتجر؟", summary: "ملخّص الطلب", delivery_fee: "رسوم التوصيل",
    free: "مجاناً", total: "المجموع", discount: "الخصم", total_note: "يؤكّد المتجر السعر النهائي.",
    bc_total_note: "قد تختلف الأسعار قليلاً حسب المتجر الذي يقبل الطلب.",
    place_order: "تأكيد الطلب", send_order: "إرسال الطلب", placing: "جارٍ إرسال الطلب…",
    order_placed: "تم إرسال طلبك!", order_failed_title: "لم يتم إرسال الطلب",
    uncertain_title: "هل وصل طلبك؟", uncertain_msg: "انقطع الاتصال أثناء إرسال طلبك. يرجى التحقّق من طلباتك قبل المحاولة مجدداً حتى لا يتكرّر الطلب.",
    check_orders: "عرض طلباتي", stay_here: "البقاء هنا",
    pay_order_n: "دفع الطلب رقم {n}", loading_payment: "جارٍ تحميل الدفع الآمن…", stripe_note: "تتم معالجة الدفع بأمان عبر Stripe.",
    card_unavailable: "الدفع بالبطاقة غير متاح حالياً.", card_load_timeout: "استغرق تحميل نموذج الدفع وقتاً طويلاً. تحقّق من اتصالك وحاول مجدداً.",
    pay_now: "ادفع الآن", payment_failed: "فشل الدفع. يرجى المحاولة مرة أخرى.", pay_at_pickup_instead: "الدفع عند الاستلام بدلاً من ذلك",
    pay_on_delivery_instead: "الدفع عند التوصيل بدلاً من ذلك", paid_thanks: "تم استلام الدفعة — شكراً لك!",
    payment_processing: "جارٍ معالجة دفعتك.", order_unpaid_note: "تم إرسال طلبك. يمكنك الدفع من صفحة الطلب.",
    payment_not_completed: "لم تكتمل عملية الدفع.", confirming_payment: "جارٍ تأكيد الدفع…",
    order: "طلب", shamcash_instructions: "حوّل المبلغ أدناه عبر شام كاش إلى هذا الحساب، ثم اضغط «لقد دفعت».",
    shamcash_number: "حساب شام كاش", account_name: "اسم صاحب الحساب", shamcash_ref: "رقم عملية التحويل",
    i_have_paid: "لقد دفعت", shamcash_store_confirms: "يؤكّد المتجر وصول التحويل قبل تجهيز الطلب.",
    shamcash_thanks: "شكراً! سيؤكّد المتجر وصول التحويل.",
    waiting_title: "جارٍ البحث عن متجر…", waiting_sub: "أرسلنا طلبك إلى المتاجر القريبة. أول متجر يقبل الطلب سيجهّزه.",
    cancel_request: "إلغاء الطلب", cancel_request_q: "إلغاء هذا الطلب؟", keep_waiting: "متابعة الانتظار",
    claimed_title: "{store} قبل طلبك!", claimed_sub: "جارٍ فتح طلبك…", bc_cancelled: "تم إلغاء الطلب",
    bc_expired: "لم يقبل أي متجر الطلب في الوقت المحدد", bc_expired_sub: "منتجاتك محفوظة. يمكنك المحاولة مجدداً أو الطلب من متجر محدد.",
    restore_cart: "العودة إلى سلّتي", your_items: "منتجاتك",
    st_pending: "بانتظار المتجر", st_accepted: "تم القبول", st_preparing: "قيد التحضير", st_ready: "جاهز",
    st_ready_pickup: "جاهز للاستلام", st_on_way: "في الطريق إليك", st_delivered: "تم التوصيل", st_completed: "مكتمل",
    st_picked_up: "تم الاستلام", st_cancelled: "ملغى", st_rejected: "رفضه المتجر", st_refunded: "تم استرداد المبلغ",
    my_orders: "طلباتي", no_orders: "لا توجد طلبات بعد", no_orders_sub: "ستظهر طلباتك هنا.",
    active_orders: "طلبات جارية", past_orders: "طلبات سابقة", order_not_found: "الطلب غير موجود", order_n: "طلب رقم {n}",
    track_failed_sub: "نعتذر عن ذلك. تواصل مع المتجر إذا كان لديك استفسار.", track_done_sub: "شكراً لطلبك!",
    track_live_sub: "تتحدّث هذه الصفحة تلقائياً.", eta_min: "الوقت المتوقع: {n} دقيقة", paid: "مدفوع", unpaid: "غير مدفوع بعد",
    order_details: "تفاصيل الطلب", chat: "محادثة", chat_with_store: "محادثة المتجر", open_app_home: "اطلب مجدداً",
    no_messages: "لا توجد رسائل بعد", no_messages_sub: "اسأل المتجر عن أي شيء يخص طلبك.", store: "المتجر",
    type_message: "اكتب رسالة…",
    account: "حسابي", guest: "ضيف", guest_session: "جلسة ضيف", edit_name: "تعديل الاسم",
    guest_upgrade_title: "احفظ طلباتك", guest_upgrade_sub: "سجّل الدخول برقم هاتفك لتصل إلى طلباتك من أي جهاز.",
    loyalty: "نقاط الولاء", n_points: "{n} نقطة", wallet: "المحفظة", preferences: "التفضيلات", language: "اللغة",
    dark_mode: "الوضع الداكن", dark_on: "الوضع الداكن مفعّل", light_on: "الوضع الفاتح مفعّل", more: "المزيد", for_stores: "كاسنتا للمتاجر",
    tab_home: "الرئيسية", tab_stores: "المتاجر", tab_quick: "سريع", tab_orders: "طلباتي", tab_account: "حسابي"
  }
};
(function () {
  "use strict";

  // ─── Small helpers ────────────────────────────────────────────────────────
  function lsGet(k, d) { try { var v = localStorage.getItem(k); return v == null ? d : v; } catch (e) { return d; } }
  function lsSet(k, v) { try { localStorage.setItem(k, v); } catch (e) { /* storage full or blocked */ } }
  function lsDel(k) { try { localStorage.removeItem(k); } catch (e) { /* ignore */ } }
  function lsJson(k, d) { try { var v = localStorage.getItem(k); return v ? (JSON.parse(v) || d) : d; } catch (e) { return d; } }
  function esc(s) { return String(s == null ? "" : s).replace(/[&<>"']/g, function (c) { return ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", "\"": "&quot;", "'": "&#39;" })[c]; }); }
  function $(id) { return document.getElementById(id); }
  function $$(sel, root) { return Array.prototype.slice.call((root || document).querySelectorAll(sel)); }
  function num(v, d) { var n = typeof v === "number" ? v : parseFloat(v); return isFinite(n) ? n : (d || 0); }
  function parseJsonArr(v) {
    if (Array.isArray(v)) return v;
    if (typeof v === "string" && v.trim()) { try { var p = JSON.parse(v); return Array.isArray(p) ? p : []; } catch (e) { return []; } }
    return [];
  }
  function sleep(ms) { return new Promise(function (r) { setTimeout(r, ms); }); }
  function withTimeout(p, ms, msg) {
    return new Promise(function (resolve, reject) {
      var done = false;
      var tm = setTimeout(function () { if (!done) { done = true; var e = new Error(msg || "timeout"); e.network = true; reject(e); } }, ms);
      p.then(function (v) { if (!done) { done = true; clearTimeout(tm); resolve(v); } },
             function (e) { if (!done) { done = true; clearTimeout(tm); reject(e); } });
    });
  }

  var CFG = window.KASSENTA_CONFIG || {};
  // Customer accounts live on the platform tenant; the store only matters
  // once an order is placed.
  var PLATFORM_TENANT = 24;
  var DEFAULT_CURRENCY = String(CFG.currency || "CHF").toUpperCase();
  var IS_NATIVE = !!(window.__KASSENTA_NATIVE__ && window.ReactNativeWebView);

  // ─── i18n ─────────────────────────────────────────────────────────────────
  var I18N = window.KASSENTA_I18N || { en: {} };
  function pickInitialLang() {
    var saved = lsGet("bc_lang");
    if (saved && I18N[saved]) return saved;
    var q = null; try { q = new URLSearchParams(location.search).get("lang"); } catch (e) { /* old webview */ }
    if (q && I18N[q]) return q;
    var nav = String((navigator.languages && navigator.languages[0]) || navigator.language || "en").toLowerCase();
    if (nav.indexOf("ar") === 0 && I18N.ar) return "ar";
    if (nav.indexOf("de") === 0 && I18N.de) return "de";
    return "en";
  }

  // ─── State ────────────────────────────────────────────────────────────────
  var state = {
    auth: lsJson("bc_auth", null),
    lang: pickInitialLang(),
    cart: lsJson("bc_cart", []),
    cartMode: "broadcast",          // "broadcast" | "tenant"
    route: null,
    routeArgs: [],
    cleanup: null,                  // teardown for the current page (timers)
  };
  if (state.auth && !state.auth.token) state.auth = null;
  if (!Array.isArray(state.cart)) state.cart = [];
  state.cart = state.cart.filter(function (it) { return it && it.productId && it.quantity > 0; });
  (function () {
    var m = lsGet("bc_cart_mode", "broadcast");
    state.cartMode = m.indexOf("tenant") === 0 ? "tenant" : "broadcast";
  })();

  function t(key, vars) {
    var d = I18N[state.lang] || {};
    var s = d[key];
    if (s == null) s = (I18N.en || {})[key];
    if (s == null) s = key;
    if (vars) s = s.replace(/\{(\w+)\}/g, function (_, k) { return vars[k] != null ? vars[k] : ""; });
    return s;
  }
  function isRtl() { return state.lang === "ar"; }
  function locale() { return state.lang === "ar" ? "ar-SY-u-nu-latn" : state.lang === "de" ? "de-CH" : "en-GB"; }
  function fmtDate(d) {
    try { return new Date(d).toLocaleString(locale(), { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" }); }
    catch (e) { return String(d || ""); }
  }
  function fmtTime(d) {
    try { return new Date(d).toLocaleTimeString(locale(), { hour: "2-digit", minute: "2-digit" }); } catch (e) { return ""; }
  }

  function applyStaticI18n() {
    var html = document.documentElement;
    html.lang = state.lang;
    html.dir = isRtl() ? "rtl" : "ltr";
    document.body.setAttribute("dir", html.dir);
    $$("[data-i18n]").forEach(function (el) { el.textContent = t(el.getAttribute("data-i18n")); });
    $$("[data-i18n-ph]").forEach(function (el) { el.setAttribute("placeholder", t(el.getAttribute("data-i18n-ph"))); });
    $$("[data-i18n-aria]").forEach(function (el) { el.setAttribute("aria-label", t(el.getAttribute("data-i18n-aria"))); });
    document.title = t("doc_title");
  }

  function setLang(lang, explicit) {
    if (!I18N[lang]) return;
    if (explicit) lsSet("bc_lang", lang);
    if (state.lang === lang) return;
    state.lang = lang;
    applyStaticI18n();
    refreshCartUi();
    if (state.route) renderRoute();
  }
  // Syrian stores price in SYP and their customers read Arabic: switch to it
  // unless the customer has picked a language themselves.
  function autoLangFor(currency) {
    if (String(currency || "").toUpperCase() === "SYP" && !lsGet("bc_lang") && state.lang !== "ar") setLang("ar", false);
  }

  // ─── Money ────────────────────────────────────────────────────────────────
  var ZERO_DECIMAL = { SYP: 1 };
  var CURRENCY_SUFFIX = { SYP: "ل.س" };
  var tenantCurrency = lsJson("bc_currencies", {});
  function rememberCurrency(tenantId, code) {
    if (tenantId == null || !code) return;
    code = String(code).toUpperCase();
    if (tenantCurrency[String(tenantId)] === code) return;
    tenantCurrency[String(tenantId)] = code;
    lsSet("bc_currencies", JSON.stringify(tenantCurrency));
  }
  function curFor(tenantId) { return (tenantId != null && tenantCurrency[String(tenantId)]) || DEFAULT_CURRENCY; }
  function roundFor(v, code) {
    return ZERO_DECIMAL[String(code || "").toUpperCase()] ? Math.round(num(v)) : Math.round(num(v) * 100) / 100;
  }
  // "CHF 12.50" / "12,000 ل.س" (SYP has no minor unit).
  function money(value, code) {
    code = String(code || DEFAULT_CURRENCY).toUpperCase();
    var n = num(value);
    if (ZERO_DECIMAL[code]) {
      var txt = Math.round(n).toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",");
      return txt + " " + (CURRENCY_SUFFIX[code] || code);
    }
    return code + " " + n.toFixed(2);
  }

  // ─── Phone numbers ────────────────────────────────────────────────────────
  // Normalised to international digits without "+" (9639xxxxxxxx), which is
  // what the WhatsApp bridge needs. Syrian and Egyptian local forms are
  // recognised everywhere; other 0-prefixed numbers use the region of the
  // store being ordered from.
  function regionHint() {
    var cur = state.cart.length ? cartCurrency() : null;
    if (cur === "SYP") return "SY";
    if (cur === "CHF") return "CH";
    return state.lang === "ar" ? "SY" : "CH";
  }
  function normalizePhone(raw, hint) {
    var s = String(raw || "").trim();
    if (!s) return "";
    // Arabic-Indic and Persian digits → ASCII
    s = s.replace(/[٠-٩]/g, function (c) { return String(c.charCodeAt(0) - 0x0660); })
         .replace(/[۰-۹]/g, function (c) { return String(c.charCodeAt(0) - 0x06F0); });
    var plus = /^\s*\+/.test(s);
    var d = s.replace(/\D/g, "");
    if (!d) return "";
    if (plus) return d;
    if (d.indexOf("00") === 0) return d.slice(2);
    hint = hint || regionHint();
    if (/^09\d{8}$/.test(d)) return "963" + d.slice(1);            // Syria mobile, local
    if (/^9\d{8}$/.test(d) && hint === "SY") return "963" + d;      // Syria mobile without 0
    if (/^01[0125]\d{8}$/.test(d)) return "20" + d.slice(1);        // Egypt mobile, local
    if (/^07[5-9]\d{7}$/.test(d)) return "41" + d.slice(1);         // Swiss mobile, local
    if (/^0\d{9}$/.test(d)) return (hint === "SY" ? "963" : "41") + d.slice(1);
    if (/^0\d{8}$/.test(d) && hint === "SY") return "963" + d.slice(1); // Syrian landline
    return d;
  }
  function phoneValid(p) { return /^\d{10,15}$/.test(p || ""); }
  function prettyPhone(p) { return p ? "+" + String(p).replace(/^\+/, "") : ""; }
  function realPhone(p) { return p && !/^guest-/.test(String(p)) ? String(p) : ""; }

  // ─── Icons ────────────────────────────────────────────────────────────────
  var ICONS = {
    bolt: '<path d="M13 2L3 14h7l-1 8 10-12h-7l1-8z"/>',
    cart: '<circle cx="9" cy="21" r="1.5"/><circle cx="18" cy="21" r="1.5"/><path d="M3 3h2l3 12h11l3-8H6"/>',
    store: '<path d="M3 9l1.5-5h15L21 9M3 9v11a1 1 0 0 0 1 1h16a1 1 0 0 0 1-1V9M3 9h18M9 21v-6h6v6"/>',
    menu: '<path d="M4 6h16M4 12h16M4 18h10"/>',
    search: '<circle cx="11" cy="11" r="7"/><path d="M21 21l-4.3-4.3"/>',
    plus: '<path d="M12 5v14M5 12h14"/>',
    minus: '<path d="M5 12h14"/>',
    check: '<path d="M5 12l5 5L20 7"/>',
    x: '<path d="M18 6L6 18M6 6l12 12"/>',
    back: '<path d="M15 18l-6-6 6-6"/>',
    next: '<path d="M9 18l6-6-6-6"/>',
    user: '<circle cx="12" cy="8" r="4"/><path d="M4 21c0-4.4 3.6-8 8-8s8 3.6 8 8"/>',
    phone: '<path d="M22 16.9v3a2 2 0 0 1-2.2 2 19.8 19.8 0 0 1-8.6-3 19.5 19.5 0 0 1-6-6 19.8 19.8 0 0 1-3-8.7A2 2 0 0 1 4.1 2h3a2 2 0 0 1 2 1.7c.1.9.3 1.7.6 2.5a2 2 0 0 1-.5 2.1L8 9.6a16 16 0 0 0 6 6l1.3-1.2a2 2 0 0 1 2.1-.5c.8.3 1.6.5 2.5.6A2 2 0 0 1 22 17z"/>',
    mail: '<rect x="2" y="4" width="20" height="16" rx="2"/><path d="M22 6l-10 7L2 6"/>',
    pin: '<path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/>',
    locate: '<circle cx="12" cy="12" r="3"/><path d="M12 2v3M12 19v3M2 12h3M19 12h3"/><circle cx="12" cy="12" r="8"/>',
    clock: '<circle cx="12" cy="12" r="10"/><path d="M12 6v6l4 2"/>',
    chat: '<path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>',
    trash: '<path d="M3 6h18M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/>',
    edit: '<path d="M12 20h9"/><path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4z"/>',
    logout: '<path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4M16 17l5-5-5-5M21 12H9"/>',
    receipt: '<path d="M4 2v20l3-2 3 2 3-2 3 2 3-2 1 .7V2l-1 .7-3-2-3 2-3-2-3 2-3-2z"/><path d="M8 7h8M8 11h8M8 15h5"/>',
    bag: '<path d="M6 2L3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z"/><path d="M3 6h18M16 10a4 4 0 1 1-8 0"/>',
    delivery: '<rect x="1" y="3" width="15" height="13" rx="1"/><path d="M16 8h4l3 3v5h-7"/><circle cx="5.5" cy="18.5" r="2.5"/><circle cx="18.5" cy="18.5" r="2.5"/>',
    walk: '<circle cx="13" cy="4" r="2"/><path d="M9 20l3-6 3 3v4M7 12l3-4 4 2 3 3M10 8l-2 6"/>',
    info: '<circle cx="12" cy="12" r="10"/><path d="M12 16v-4M12 8h.01"/>',
    alert: '<path d="M10.3 3.9L1.8 18a2 2 0 0 0 1.7 3h17a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0z"/><path d="M12 9v4M12 17h.01"/>',
    card: '<rect x="2" y="5" width="20" height="14" rx="2"/><path d="M2 10h20"/>',
    cash: '<rect x="2" y="6" width="20" height="12" rx="2"/><circle cx="12" cy="12" r="3"/><path d="M6 12h.01M18 12h.01"/>',
    qr: '<rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><path d="M14 14h3v3h-3zM20 14v.01M14 20h.01M17 20h4v-3"/>',
    copy: '<rect x="9" y="9" width="12" height="12" rx="2"/><path d="M5 15H4a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1h10a1 1 0 0 1 1 1v1"/>',
    globe: '<circle cx="12" cy="12" r="10"/><path d="M2 12h20M12 2a15 15 0 0 1 0 20M12 2a15 15 0 0 0 0 20"/>',
    moon: '<path d="M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8z"/>',
    sun: '<circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4"/>',
    refresh: '<path d="M21 12a9 9 0 1 1-2.6-6.4L21 8"/><path d="M21 3v5h-5"/>',
    grid: '<rect x="3" y="3" width="7" height="7" rx="1.5"/><rect x="14" y="3" width="7" height="7" rx="1.5"/><rect x="3" y="14" width="7" height="7" rx="1.5"/><rect x="14" y="14" width="7" height="7" rx="1.5"/>',
    tag: '<path d="M20.6 13.4l-7.2 7.2a2 2 0 0 1-2.8 0L3 13V3h10l7.6 7.6a2 2 0 0 1 0 2.8z"/><circle cx="7.5" cy="7.5" r="1.5"/>',
    note: '<path d="M4 4h16v12l-4 4H4z"/><path d="M16 20v-4h4M8 9h8M8 13h5"/>',
    wallet: '<path d="M20 7H5a2 2 0 0 1 0-4h13v4"/><path d="M3 5v14a2 2 0 0 0 2 2h15V7"/><circle cx="16" cy="14" r="1.5"/>',
    star: '<path d="M12 2l3 7h7l-5.5 4.5L18 21l-6-4-6 4 1.5-7.5L2 9h7z"/>',
    home: '<path d="M3 11l9-8 9 8"/><path d="M5 10v10a1 1 0 0 0 1 1h4v-6h4v6h4a1 1 0 0 0 1-1V10"/>',
    list: '<path d="M9 6h12M9 12h12M9 18h12M4 6h.01M4 12h.01M4 18h.01"/>',
    external: '<path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6M15 3h6v6M10 14L21 3"/>',
  };
  function icon(name, cls) {
    var inner = ICONS[name]; if (!inner) return "";
    return '<svg class="ic' + (cls ? " " + cls : "") + '" viewBox="0 0 24 24" aria-hidden="true">' + inner + "</svg>";
  }
  function spinner() { return '<span class="spin" aria-hidden="true"></span>'; }
  function imgTag(src, alt, cls) {
    if (!src) return "";
    return '<img src="' + esc(src) + '" alt="' + esc(alt || "") + '"' + (cls ? ' class="' + cls + '"' : "") +
      ' loading="lazy" decoding="async" onerror="this.remove()">';
  }

  // ─── Toast ────────────────────────────────────────────────────────────────
  function toast(msg, kind) {
    var wrap = $("toasts"); if (!wrap || !msg) return;
    var el = document.createElement("div");
    el.className = "toast" + (kind ? " toast--" + kind : "");
    el.setAttribute("role", kind === "error" ? "alert" : "status");
    el.textContent = msg;
    wrap.appendChild(el);
    while (wrap.children.length > 3) wrap.removeChild(wrap.firstChild);
    setTimeout(function () { el.classList.add("toast--out"); }, kind === "error" ? 4200 : 2800);
    setTimeout(function () { if (el.parentNode) el.parentNode.removeChild(el); }, kind === "error" ? 4600 : 3200);
  }

  // ─── Layers (sheets / dialogs) and the back button ────────────────────────
  // Each open sheet gets its own history entry, so the Android back button
  // (which calls WebView.goBack) closes the sheet instead of leaving the page.
  var layers = [];
  var afterLayersClosed = null;
  function openLayer(name, onClose) {
    layers.push({ name: name, onClose: onClose });
    try { history.pushState({ kLayer: name, n: layers.length }, ""); } catch (e) { /* ignore */ }
    document.body.classList.add("has-layer");
  }
  function closeTopLayer() {
    if (!layers.length) return;
    try { history.back(); } catch (e) { popLayersTo(layers.length - 1); }
  }
  function popLayersTo(depth) {
    while (layers.length > depth) {
      var l = layers.pop();
      try { l.onClose(); } catch (e) { console.error(e); }
    }
    if (!layers.length) document.body.classList.remove("has-layer");
    if (!layers.length && afterLayersClosed) { var f = afterLayersClosed; afterLayersClosed = null; setTimeout(f, 0); }
  }
  function closeLayersThen(fn) {
    if (!layers.length) { fn(); return; }
    afterLayersClosed = fn;
    try { history.go(-layers.length); } catch (e) { popLayersTo(0); }
  }
  window.addEventListener("popstate", function (e) {
    var st = e.state;
    var depth = st && st.kLayer ? st.n : 0;
    if (layers.length > depth) popLayersTo(depth);
  });

  // ─── Dialog ───────────────────────────────────────────────────────────────
  var dialog = (function () {
    var bd = $("modal-backdrop"), iconEl = $("modal-icon"), titleEl = $("modal-title"),
        msgEl = $("modal-msg"), fieldsEl = $("modal-fields"), okBtn = $("modal-ok"), cancelBtn = $("modal-cancel");
    var cur = null;
    function finish() {
      if (!cur) return;
      var c = cur; cur = null;
      bd.classList.remove("open");
      bd.setAttribute("aria-hidden", "true");
      c.resolve(c.result !== undefined ? c.result : c.cancelValue);
    }
    function done(result) { if (!cur) return; cur.result = result; closeTopLayer(); }
    okBtn.addEventListener("click", function () {
      if (!cur) return;
      if (cur.kind === "prompt") {
        var inp = fieldsEl.querySelector("input");
        var v = (inp && inp.value || "").trim();
        if (cur.required && !v) { inp.classList.add("inp--error"); inp.focus(); return; }
        return done(v);
      }
      done(true);
    });
    cancelBtn.addEventListener("click", function () { if (cur) done(cur.cancelValue); });
    bd.addEventListener("click", function (e) { if (e.target === bd && cur && cur.kind !== "alert") done(cur.cancelValue); });
    document.addEventListener("keydown", function (e) {
      if (!cur) return;
      if (e.key === "Escape") { e.preventDefault(); done(cur.cancelValue); }
      else if (e.key === "Enter" && (cur.kind === "prompt" || cur.kind === "alert")) { e.preventDefault(); okBtn.click(); }
    });
    function open(o) {
      return new Promise(function (resolve) {
        cur = { kind: o.kind, required: o.required, resolve: resolve, result: undefined,
                cancelValue: o.kind === "confirm" ? false : o.kind === "alert" ? true : null };
        iconEl.className = "modal__icon" + (o.tone ? " modal__icon--" + o.tone : "");
        iconEl.innerHTML = icon(o.icon || "info");
        titleEl.textContent = o.title || "";
        msgEl.textContent = o.msg || "";
        msgEl.hidden = !o.msg;
        fieldsEl.innerHTML = "";
        if (o.kind === "prompt") {
          var inp = document.createElement("input");
          inp.className = "inp"; inp.type = o.inputType || "text";
          inp.placeholder = o.placeholder || ""; inp.value = o.value || "";
          if (o.autocomplete) inp.autocomplete = o.autocomplete;
          inp.maxLength = 80;
          fieldsEl.appendChild(inp);
          setTimeout(function () { inp.focus(); }, 60);
        }
        fieldsEl.hidden = o.kind !== "prompt";
        cancelBtn.hidden = o.kind === "alert";
        cancelBtn.textContent = o.cancelLabel || t("cancel");
        okBtn.textContent = o.okLabel || (o.kind === "alert" ? t("ok") : t("confirm"));
        okBtn.className = "btn" + (o.tone === "danger" && o.kind !== "alert" ? " btn--danger" : "");
        bd.classList.add("open");
        bd.removeAttribute("aria-hidden");
        openLayer("dialog", finish);
        if (o.kind !== "prompt") setTimeout(function () { okBtn.focus(); }, 60);
      });
    }
    return {
      alert: function (title, msg, o) { return open(Object.assign({ kind: "alert", title: title, msg: msg }, o || {})); },
      confirm: function (title, msg, o) { return open(Object.assign({ kind: "confirm", title: title, msg: msg, icon: "info" }, o || {})); },
      prompt: function (title, o) { return open(Object.assign({ kind: "prompt", title: title, icon: "edit" }, o || {})); },
    };
  })();

  // ─── API ──────────────────────────────────────────────────────────────────
  // Timeout on every request; GETs retry once on a network failure or a
  // gateway error. A 401 on an endpoint that needs the session ends it.
  function api(method, path, body, opts) {
    opts = opts || {};
    var timeout = opts.timeout || (method === "GET" ? 15000 : 25000);
    var retries = opts.retries != null ? opts.retries : (method === "GET" ? 1 : 0);
    function attempt(left) {
      var headers = { "Content-Type": "application/json", "Accept": "application/json" };
      if (opts.auth !== false && state.auth && state.auth.token) headers.Authorization = "Bearer " + state.auth.token;
      if (opts.headers) Object.keys(opts.headers).forEach(function (k) { headers[k] = opts.headers[k]; });
      var ctrl = typeof AbortController !== "undefined" ? new AbortController() : null;
      var req = fetch(path, {
        method: method, headers: headers, credentials: "same-origin",
        body: body ? JSON.stringify(body) : undefined,
        signal: ctrl ? ctrl.signal : undefined,
      });
      return withTimeout(req, timeout, "timeout").then(function (r) {
        return r.text().then(function (txt) {
          var json = null; try { json = txt ? JSON.parse(txt) : null; } catch (e) { /* not JSON */ }
          if (!r.ok) {
            // 5xx bodies are internal (and English only); show our own copy.
            var srvMsg = r.status >= 500 ? null : r.status === 429 ? t("too_many") : (json && (json.error || json.message));
            var err = new Error(srvMsg || t("err_server"));
            err.status = r.status;
            err.data = json;
            throw err;
          }
          return json;
        });
      }, function (e) {
        if (ctrl) { try { ctrl.abort(); } catch (_) { /* ignore */ } }
        var err = new Error(t("err_network"));
        err.network = true;
        throw err;
      }).catch(function (err) {
        var gateway = err.status === 502 || err.status === 503 || err.status === 504;
        if (left > 0 && (err.network || gateway)) return sleep(900).then(function () { return attempt(left - 1); });
        if (err.status === 401 && opts.authRequired && state.auth) sessionExpired();
        throw err;
      });
    }
    return attempt(retries);
  }

  function sessionExpired() {
    if (!state.auth) return;
    state.auth = null;
    lsDel("bc_auth");
    toast(t("session_expired"), "error");
    navigate("intro", null, { replace: true });
  }

  function saveAuth() { if (state.auth) lsSet("bc_auth", JSON.stringify(state.auth)); else lsDel("bc_auth"); }
  function setAuth(data, isGuest) {
    var c = data.customer || {};
    state.auth = { token: data.token, customer: c, isGuest: !!isGuest };
    saveAuth();
  }

  // ─── Data loaders (cached) ────────────────────────────────────────────────
  var cache = { bc: null, bcAt: 0, rest: null, restAt: 0, stores: {}, payCfg: {} };
  var FRESH_MS = 5 * 60 * 1000;

  function normProduct(p, extra) {
    extra = extra || {};
    var tenantId = p.tenantId != null ? Number(p.tenantId) : extra.tenantId;
    var currency = String(p.currency || extra.currency || curFor(tenantId)).toUpperCase();
    return {
      id: Number(p.id),
      tenantId: tenantId,
      tenantName: p.tenantName || extra.tenantName || "",
      tenantSlug: p.tenantSlug || extra.tenantSlug || "",
      currency: currency,
      name: String(p.name || ""),
      nameAr: p.nameAr || "",
      description: p.description || "",
      price: num(p.price),
      imageUrl: p.imageUrl || p.image || "",
      category: p.category || extra.category || "",
      categoryId: p.categoryId,
      modifiers: parseJsonArr(p.modifiers),
      variants: parseJsonArr(p.variants),
      isAddon: !!p.isAddon,
    };
  }
  function displayName(p) { return state.lang === "ar" && p.nameAr ? p.nameAr : p.name; }

  function loadBroadcastMenu(force) {
    if (!force && cache.bc && Date.now() - cache.bcAt < FRESH_MS) return Promise.resolve(cache.bc);
    return api("GET", "/api/delivery/broadcast/menu", null, { auth: false }).then(function (d) {
      d = d || {};
      (d.restaurants || []).forEach(function (r) { rememberCurrency(r.id, r.currency); });
      var products = (d.products || []).map(function (p) { return normProduct(p); });
      var addons = (d.addons || []).map(function (p) { return normProduct(p); });
      products.forEach(function (p) { rememberCurrency(p.tenantId, p.currency); });
      cache.bc = { restaurants: d.restaurants || [], products: products, addons: addons,
                   categories: (d.categories || []).filter(Boolean) };
      cache.bcAt = Date.now();
      return cache.bc;
    });
  }

  function loadRestaurants(force) {
    if (!force && cache.rest && Date.now() - cache.restAt < FRESH_MS) return Promise.resolve(storesForLang(cache.rest));
    // /restaurants carries covers, ETA and minimum order; the broadcast menu
    // knows which stores actually take online orders and their currency.
    return Promise.all([
      api("GET", "/api/delivery/restaurants", null, { auth: false }).catch(function () { return null; }),
      loadBroadcastMenu().catch(function () { return null; }),
    ]).then(function (out) {
      var list = out[0], bc = out[1];
      if (!list && !bc) { var e = new Error(t("err_network")); e.network = true; throw e; }
      var bcById = {};
      ((bc && bc.restaurants) || []).forEach(function (r) { bcById[r.id] = r; });
      var rs;
      if (list && list.length) {
        rs = list.filter(function (r) { return !bc || bcById[r.id]; }).map(function (r) {
          var b = bcById[r.id] || {};
          return {
            id: r.id, slug: r.slug || b.slug, name: b.name || r.name, cover: r.coverImage || r.logo || b.logo || "",
            cuisine: r.cuisine || "", eta: num(r.deliveryTime, 0), fee: num(r.deliveryFee, 0), minOrder: num(r.minOrder, 0),
            isOpen: r.isOpen !== false, currency: String(b.currency || curFor(r.id)).toUpperCase(),
          };
        });
      } else {
        rs = ((bc && bc.restaurants) || []).map(function (b) {
          return { id: b.id, slug: b.slug, name: b.name, cover: b.logo || "", cuisine: "", eta: 0, fee: 0, minOrder: 0,
                   isOpen: true, currency: String(b.currency || curFor(b.id)).toUpperCase() };
        });
      }
      rs.forEach(function (r) {
        rememberCurrency(r.id, r.currency);
        if (!r.cover && bc) {
          var s = bc.products.find(function (p) { return p.tenantId === r.id && p.imageUrl; });
          if (s) r.cover = s.imageUrl;
        }
      });
      cache.rest = rs; cache.restAt = Date.now();
      return storesForLang(rs);
    });
  }
  // Syrian (SYP) stores first for Arabic readers, the rest first otherwise.
  function storesForLang(rs) {
    var ar = state.lang === "ar";
    return rs.slice().sort(function (a, b) {
      var sa = a.currency === "SYP" ? 0 : 1, sb = b.currency === "SYP" ? 0 : 1;
      return ar ? sa - sb : sb - sa;
    });
  }

  function loadStore(slug, force) {
    var c = cache.stores[slug];
    if (!force && c && Date.now() - c.at < FRESH_MS) return Promise.resolve(c);
    var enc = encodeURIComponent(slug);
    return Promise.all([
      api("GET", "/api/delivery/store/" + enc, null, { auth: false }),
      api("GET", "/api/delivery/store/" + enc + "/menu", null, { auth: false }),
    ]).then(function (out) {
      var store = out[0] || {}, m = out[1] || {};
      var currency = String(store.currency || curFor(store.tenantId)).toUpperCase();
      rememberCurrency(store.tenantId, currency);
      var catName = {}, catRank = {}, cats = [];
      (m.categories || []).forEach(function (cat, i) { catName[cat.id] = cat.name; catRank[cat.id] = i; cats.push(cat.name); });
      var raw = Array.isArray(m) ? m : (m.allProducts || m.products || []);
      var extra = { tenantId: Number(store.tenantId), tenantName: store.storeName || store.name || "", tenantSlug: store.slug || slug, currency: currency };
      var products = raw.filter(function (p) { return p.isActive !== false && (num(p.price) > 0 || p.isAddon); }).map(function (p) {
        var n = normProduct(p, extra);
        n.category = catName[p.categoryId] || n.category || "";
        n.rank = catRank[p.categoryId] == null ? 999 : catRank[p.categoryId];
        return n;
      });
      products.sort(function (a, b) { return a.rank - b.rank; });
      var entry = { store: store, currency: currency, products: products, categories: cats.filter(function (cn) {
        return products.some(function (p) { return p.category === cn; });
      }), at: Date.now() };
      cache.stores[slug] = entry;
      return entry;
    });
  }

  function findSlugForTenant(tenantId) {
    var r = (cache.rest || []).find(function (x) { return x.id === tenantId; }) ||
            ((cache.bc && cache.bc.restaurants) || []).find(function (x) { return x.id === tenantId; });
    return r ? r.slug : null;
  }

  // Which payment methods a store really offers, from its own gateway config.
  // Card is never offered for SYP (Stripe does not operate in Syria) or when
  // the gateway's currency differs from the store's prices.
  var STRIPE_BLOCKED = { SYP: 1 };
  function loadPayCfg(tenantId, storeCurrency) {
    var key = String(tenantId);
    if (cache.payCfg[key]) return Promise.resolve(cache.payCfg[key]);
    return api("GET", "/api/payments/config?tenantId=" + encodeURIComponent(tenantId), null, { auth: false, timeout: 9000, retries: 1 })
      .catch(function () { return null; })
      .then(function (cfg) {
        var cur = String(storeCurrency || curFor(tenantId)).toUpperCase();
        var em = cfg && Array.isArray(cfg.enabledMethods) ? cfg.enabledMethods : null;
        var stripe = (cfg && cfg.stripe) || {};
        var cardOk = !!(cfg && stripe.status === "connected" && stripe.publishableKey &&
          cfg.cardAvailable !== false && (!em || em.indexOf("card") >= 0) && !STRIPE_BLOCKED[cur] &&
          String(cfg.currency || "").toUpperCase() === cur && window.KassentaPay);
        var cashOk = !(cfg && cfg.cash && cfg.cash.enabled === false) && (!em || em.indexOf("cash") >= 0);
        var sc = (cfg && cfg.shamcash && cfg.shamcash.enabled) ? cfg.shamcash : null;
        if (!cardOk && !sc) cashOk = true; // never leave a store with no way to pay
        var res = { card: cardOk, cash: cashOk, shamcash: sc, raw: cfg };
        if (cfg) cache.payCfg[key] = res;
        return res;
      });
  }

  // ─── Cart ─────────────────────────────────────────────────────────────────
  function saveCart() {
    lsSet("bc_cart", JSON.stringify(state.cart));
    var tid = state.cart.length ? state.cart[0].tenantId : "";
    lsSet("bc_cart_mode", state.cartMode === "tenant" ? "tenant:" + tid : "broadcast");
  }
  function lineSig(it) {
    return [it.productId, it.tenantId, it.variant || "", (it.modifiers || []).join("|"), it.notes || ""].join("§");
  }
  function cartCurrency() {
    if (!state.cart.length) return null;
    var it = state.cart[0];
    return String(it.currency || curFor(it.tenantId)).toUpperCase();
  }
  function cartCount() { return state.cart.reduce(function (s, it) { return s + (it.quantity || 0); }, 0); }
  function cartSubtotal() {
    var cur = cartCurrency();
    return roundFor(state.cart.reduce(function (s, it) { return s + it.quantity * num(it.estimatedPrice); }, 0), cur);
  }
  function cartTenant() { return state.cartMode === "tenant" && state.cart.length ? state.cart[0].tenantId : null; }
  function cartStoreName() { return state.cart.length ? state.cart[0].tenantName : ""; }
  function cartQtyFor(productId, tenantId) {
    return state.cart.filter(function (it) { return it.productId === productId && it.tenantId === tenantId; })
      .reduce(function (s, it) { return s + it.quantity; }, 0);
  }

  /** ctx: "tenant" (ordering from one store's menu) or "broadcast" (Quick Order). */
  function cartAdd(lines, ctx) {
    if (!lines.length) return Promise.resolve(false);
    var first = lines[0];
    var needReplace = false;
    if (state.cart.length) {
      var cur = cartCurrency();
      if (first.currency && cur && first.currency !== cur) needReplace = true;
      else if (ctx === "tenant") needReplace = state.cart.some(function (it) { return it.tenantId !== first.tenantId; });
      else needReplace = state.cartMode === "tenant" && state.cart[0].tenantId !== first.tenantId;
    }
    function commit() {
      if (!state.cart.length) state.cartMode = ctx === "tenant" ? "tenant" : "broadcast";
      else if (ctx === "tenant") state.cartMode = "tenant";
      lines.forEach(function (line) {
        var sig = lineSig(line);
        var ex = state.cart.find(function (it) { return lineSig(it) === sig; });
        if (ex) ex.quantity = Math.min(99, ex.quantity + line.quantity);
        else state.cart.push(line);
      });
      saveCart(); refreshCartUi();
      return true;
    }
    if (!needReplace) return Promise.resolve(commit());
    return dialog.confirm(t("replace_cart_title"), t("replace_cart_msg"), {
      icon: "cart", tone: "warn", okLabel: t("replace_cart_ok"), cancelLabel: t("keep_cart"),
    }).then(function (ok) {
      if (!ok) return false;
      state.cart = [];
      return commit();
    });
  }
  function cartSetQty(idx, qty) {
    var it = state.cart[idx]; if (!it) return;
    if (qty <= 0) state.cart.splice(idx, 1); else it.quantity = Math.min(99, qty);
    if (!state.cart.length) state.cartMode = "broadcast";
    saveCart(); refreshCartUi();
  }
  function cartClear() { state.cart = []; state.cartMode = "broadcast"; saveCart(); refreshCartUi(); }

  var FAB_ROUTES = { home: 1, restaurants: 1, menu: 1, broadcast: 1 };
  function refreshCartUi() {
    var n = cartCount();
    var fab = $("cart-fab");
    var show = n > 0 && FAB_ROUTES[state.route];
    fab.hidden = !show;
    document.body.classList.toggle("has-fab", !!show);
    if (n > 0) {
      $("cart-fab-count").textContent = String(n);
      $("cart-fab-label").textContent = t("view_cart");
      $("cart-fab-total").textContent = money(cartSubtotal(), cartCurrency());
    }
    var b = $("tab-badge-cart");
    if (b) { b.hidden = !n; b.textContent = String(n); }
  }

  // ─── Router ───────────────────────────────────────────────────────────────
  var routes = {
    intro: renderIntro, login: renderLogin, register: renderRegister, home: renderHome,
    restaurants: renderRestaurants, menu: renderMenu, broadcast: renderBroadcast, cart: renderCart,
    checkout: renderCheckout, waiting: renderWaiting, orders: renderOrders, track: renderTrack,
    chat: renderChat, account: renderAccount,
  };
  var PUBLIC_ROUTES = { intro: 1, login: 1, register: 1, track: 1 };
  var TAB_ROUTES = { home: 1, restaurants: 1, broadcast: 1, orders: 1, account: 1 };
  var NO_TABS = { intro: 1, login: 1, register: 1, chat: 1, checkout: 1, waiting: 1 };

  var nav = { depth: num(sessionStorage.getItem("k_depth"), 0), expect: null, replacing: null };
  function setDepth(d) { nav.depth = Math.max(0, d); try { sessionStorage.setItem("k_depth", String(nav.depth)); } catch (e) { /* ignore */ } }

  function hashFor(name, args) {
    return "#/" + name + (args && args.length ? "/" + args.map(function (a) { return encodeURIComponent(String(a)); }).join("/") : "");
  }
  function navigate(name, args, opts) {
    opts = opts || {};
    var hash = hashFor(name, args);
    function go() {
      if (location.hash === hash) { applyRoute(); return; }
      if (opts.replace) {
        nav.replacing = hash;
        location.replace(location.pathname + location.search + hash);
      } else {
        setDepth(nav.depth + 1);
        nav.expect = hash;
        location.hash = hash;
      }
    }
    if (layers.length) closeLayersThen(go); else go();
  }
  /** In-app back: real history when we have it, otherwise a sensible parent. */
  function goBack(fallback, args) {
    if (nav.depth > 0) history.back();
    else navigate(fallback || "home", args, { replace: true });
  }
  // Tabs replace each other in history so back from a tab lands on Home, then exits.
  function tabNavigate(name) {
    if (name === state.route && !state.routeArgs.length) { window.scrollTo(0, 0); return; }
    if (name === "home") { if (nav.depth > 0 && state.route !== "home") { navigate("home", null, { replace: true }); } else navigate("home"); return; }
    navigate(name, null, { replace: TAB_ROUTES[state.route] && state.route !== "home" });
  }

  window.addEventListener("hashchange", function () {
    if (nav.expect && location.hash === nav.expect) nav.expect = null;
    else if (nav.replacing && location.hash === nav.replacing) nav.replacing = null;
    else setDepth(nav.depth - 1);
    applyRoute();
  });

  function parseHash() {
    var h = location.hash.replace(/^#\/?/, "");
    var parts = h.split("/").filter(Boolean).map(function (p) { try { return decodeURIComponent(p); } catch (e) { return p; } });
    return { name: parts[0] || "", args: parts.slice(1) };
  }

  function applyRoute() {
    var r = parseHash();
    var name = r.name;
    if (!routes[name]) { navigate(state.auth ? "home" : "intro", null, { replace: true }); return; }
    if (!state.auth && !PUBLIC_ROUTES[name]) {
      state.afterLogin = location.hash;
      navigate("intro", null, { replace: true });
      return;
    }
    if (state.auth && (name === "intro" || name === "login" || name === "register")) {
      navigate("home", null, { replace: true });
      return;
    }
    if (typeof state.cleanup === "function") { try { state.cleanup(); } catch (e) { /* ignore */ } }
    state.cleanup = null;
    var sameRoute = state.route === name && state.routeArgs.join("/") === r.args.join("/");
    state.route = name;
    state.routeArgs = r.args;
    $$(".page").forEach(function (p) { p.classList.toggle("active", p.id === "page-" + name); });
    $("tab-bar").hidden = !!NO_TABS[name] || !state.auth;
    document.body.classList.toggle("no-tabs", !!NO_TABS[name] || !state.auth);
    $$(".tab").forEach(function (tb) {
      var on = tb.getAttribute("data-tab") === name || (name === "menu" && tb.getAttribute("data-tab") === "restaurants") ||
               (name === "track" && tb.getAttribute("data-tab") === "orders");
      tb.classList.toggle("active", on);
      if (on) tb.setAttribute("aria-current", "page"); else tb.removeAttribute("aria-current");
    });
    refreshCartUi();
    renderRoute();
    if (!sameRoute) window.scrollTo(0, 0);
  }
  function renderRoute() {
    try { routes[state.route].apply(null, state.routeArgs); }
    catch (e) { console.error(state.route + " render error:", e); }
  }

  /** Error block with a retry button, used by every page that loads data. */
  function errorHtml(err, withRetry) {
    var msg = (err && err.network) ? t("err_network") : ((err && err.message) || t("err_server"));
    return '<div class="empty empty--error">' + icon("alert", "empty__ic") +
      '<div class="empty__title">' + esc(err && err.network ? t("err_network_title") : t("err_title")) + "</div>" +
      '<div class="empty__sub">' + esc(msg) + "</div>" +
      (withRetry !== false ? '<button class="btn btn--soft btn--sm" type="button" data-retry>' + icon("refresh") + " " + esc(t("retry")) + "</button>" : "") +
      "</div>";
  }
  function bindRetry(root, fn) {
    $$("[data-retry]", root).forEach(function (b) { b.onclick = function () { fn(); }; });
  }
  function emptyHtml(ic, title, sub, cta) {
    return '<div class="empty">' + icon(ic, "empty__ic") + '<div class="empty__title">' + esc(title) + "</div>" +
      (sub ? '<div class="empty__sub">' + esc(sub) + "</div>" : "") + (cta || "") + "</div>";
  }

  // ─── Intro / auth ─────────────────────────────────────────────────────────
  function renderIntro() {
    renderLangSwitch($("intro-lang"));
    preloadGoogle();
  }

  function renderLangSwitch(el) {
    if (!el) return;
    var langs = [["en", "English"], ["de", "Deutsch"], ["ar", "العربية"]].filter(function (l) { return I18N[l[0]]; });
    el.innerHTML = langs.map(function (l) {
      return '<button type="button" class="seg__btn' + (state.lang === l[0] ? " active" : "") + '" data-lang="' + l[0] + '" lang="' + l[0] + '">' + l[1] + "</button>";
    }).join("");
    $$("[data-lang]", el).forEach(function (b) {
      b.onclick = function () { setLang(b.getAttribute("data-lang"), true); };
    });
  }

  var otp = { phone: "", step: "phone", cooldownUntil: 0, timer: null };
  function renderLogin(mode) {
    preloadGoogle();
    var body = $("login-body");
    var emailMode = mode === "email";
    $("login-title").textContent = emailMode ? t("login_email_title") : t("login_title");
    if (emailMode) {
      body.innerHTML =
        '<form id="form-login" class="form" novalidate autocomplete="on">' +
          field("login-email", t("email"), '<input class="inp" type="email" id="login-email" autocomplete="email" inputmode="email" required placeholder="you@example.com" dir="ltr">') +
          field("login-password", t("password"), '<input class="inp" type="password" id="login-password" autocomplete="current-password" required placeholder="••••••••" dir="ltr">') +
          '<p class="form__err" id="login-err" hidden></p>' +
          '<button class="btn" type="submit" id="btn-login-submit">' + esc(t("sign_in")) + "</button>" +
        "</form>" +
        '<p class="auth-foot">' + esc(t("no_account")) + ' <a href="#/register">' + esc(t("create_account")) + "</a></p>" +
        '<p class="auth-foot"><a href="#/login">' + esc(t("use_phone_instead")) + "</a></p>";
      $("form-login").addEventListener("submit", handleEmailLogin);
      return;
    }
    if (otp.step === "code" && otp.phone) {
      body.innerHTML =
        '<div class="otp-sent">' + icon("chat") + "<div><strong>" + esc(t("otp_sent_title")) + "</strong><span>" +
          esc(t("otp_sent_to")) + ' <bdi dir="ltr">' + esc(prettyPhone(otp.phone)) + "</bdi></span></div></div>" +
        '<form id="form-otp" class="form" novalidate>' +
          field("otp-code", t("otp_code"), '<input class="inp inp--code" id="otp-code" inputmode="numeric" autocomplete="one-time-code" maxlength="6" pattern="[0-9]*" placeholder="••••••" dir="ltr">') +
          '<p class="form__err" id="otp-err" hidden></p>' +
          '<button class="btn" type="submit" id="btn-otp-verify">' + esc(t("verify")) + "</button>" +
        "</form>" +
        '<div class="otp-actions"><button type="button" class="link-btn" id="btn-otp-resend"></button>' +
        '<button type="button" class="link-btn" id="btn-otp-change">' + esc(t("change_number")) + "</button></div>";
      $("form-otp").addEventListener("submit", verifyOtp);
      var codeInp = $("otp-code");
      codeInp.addEventListener("input", function () {
        codeInp.value = codeInp.value.replace(/[٠-٩]/g, function (c) { return String(c.charCodeAt(0) - 0x0660); }).replace(/\D/g, "").slice(0, 6);
        if (codeInp.value.length === 6) verifyOtp();
      });
      $("btn-otp-change").onclick = function () { otp.step = "phone"; renderLogin(); };
      $("btn-otp-resend").onclick = function () { if (Date.now() >= otp.cooldownUntil) requestOtp(otp.phone); };
      tickResend();
      setTimeout(function () { codeInp.focus(); }, 80);
      return;
    }
    body.innerHTML =
      '<form id="form-phone" class="form" novalidate>' +
        field("otp-phone", t("phone_number"), '<input class="inp" type="tel" id="otp-phone" autocomplete="tel" inputmode="tel" required placeholder="' +
          esc(regionHint() === "SY" ? "09xx xxx xxx" : "+41 79 123 45 67") + '" dir="ltr" value="' + esc(otp.phone ? prettyPhone(otp.phone) : "") + '">',
          t(regionHint() === "SY" ? "phone_hint_sy" : "phone_hint")) +
        '<p class="form__err" id="otp-err" hidden></p>' +
        '<button class="btn" type="submit" id="btn-otp-send">' + icon("chat") + " " + esc(t("send_code")) + "</button>" +
      "</form>" +
      '<p class="auth-note">' + esc(t("otp_note")) + "</p>" +
      '<div class="auth-divider"><span>' + esc(t("or")) + "</span></div>" +
      googleButtonHtml("btn-login-google") +
      '<p class="auth-foot"><a href="#/login/email">' + esc(t("use_email_instead")) + "</a></p>";
    $("form-phone").addEventListener("submit", function (e) { e.preventDefault(); requestOtp($("otp-phone").value); });
    bindGoogleButtons();
  }
  function field(id, label, inner, hint) {
    return '<div class="field"><label for="' + id + '">' + esc(label) + "</label>" + inner +
      (hint ? '<small class="field__hint">' + esc(hint) + "</small>" : "") + "</div>";
  }
  function showErr(id, msg) { var el = $(id); if (!el) return; el.textContent = msg || ""; el.hidden = !msg; }
  function setBusy(btn, busy, label) {
    if (!btn) return;
    if (busy) { btn.dataset.label = btn.dataset.label || btn.innerHTML; btn.disabled = true; btn.innerHTML = spinner() + " " + esc(label || t("please_wait")); }
    else { btn.disabled = false; if (btn.dataset.label) btn.innerHTML = btn.dataset.label; delete btn.dataset.label; }
  }

  function requestOtp(raw) {
    var phone = normalizePhone(raw);
    if (!phoneValid(phone)) { showErr("otp-err", t("phone_invalid")); var pi = $("otp-phone"); if (pi) pi.focus(); return; }
    showErr("otp-err", "");
    var btn = $("btn-otp-send") || $("btn-otp-resend");
    setBusy(btn, true, t("sending"));
    api("POST", "/api/delivery/auth/request-otp", { phone: phone, tenantId: PLATFORM_TENANT }, { auth: false, timeout: 30000 })
      .then(function (res) {
        otp.phone = phone; otp.step = "code"; otp.cooldownUntil = Date.now() + 45000;
        renderLogin();
        if (res && res.otp) { var ci = $("otp-code"); if (ci) ci.value = String(res.otp); }
        toast(t("otp_sent_toast"), "success");
      })
      .catch(function (err) {
        setBusy(btn, false);
        var msg = err.status === 429 ? t("otp_too_many") : err.network ? t("err_network") : (err.message || t("otp_failed"));
        showErr("otp-err", msg);
        if (otp.step === "code") toast(msg, "error");
      });
  }
  function tickResend() {
    clearInterval(otp.timer);
    function upd() {
      var b = $("btn-otp-resend"); if (!b) { clearInterval(otp.timer); return; }
      var left = Math.ceil((otp.cooldownUntil - Date.now()) / 1000);
      if (left > 0) { b.disabled = true; b.textContent = t("resend_in", { s: left }); }
      else { b.disabled = false; b.textContent = t("resend_code"); clearInterval(otp.timer); }
    }
    upd(); otp.timer = setInterval(upd, 1000);
  }
  var verifying = false;
  function verifyOtp(e) {
    if (e && e.preventDefault) e.preventDefault();
    if (verifying) return;
    var code = ($("otp-code").value || "").replace(/\D/g, "");
    if (code.length < 4) { showErr("otp-err", t("otp_enter")); return; }
    verifying = true;
    var btn = $("btn-otp-verify");
    setBusy(btn, true, t("verifying"));
    showErr("otp-err", "");
    api("POST", "/api/delivery/auth/verify-otp", { phone: otp.phone, tenantId: PLATFORM_TENANT, otp: code }, { auth: false })
      .then(function (data) {
        setAuth(data, false);
        otp.step = "phone";
        var c = state.auth.customer || {};
        if (!c.phone) c.phone = otp.phone;
        var needsName = !c.name || /^\+?[\d\s-]+$/.test(c.name) || c.name === c.phone;
        return (needsName ? askName() : Promise.resolve()).then(afterLogin);
      })
      .catch(function (err) {
        setBusy(btn, false);
        showErr("otp-err", err.network ? t("err_network") : (err.message || t("otp_wrong")));
      })
      .then(function () { verifying = false; });
  }
  function askName() {
    return dialog.prompt(t("your_name_title"), {
      msg: t("your_name_msg"), placeholder: t("your_name_ph"), okLabel: t("save"), cancelLabel: t("skip"),
      icon: "user", autocomplete: "name",
    }).then(function (name) {
      if (!name) return;
      state.auth.customer.name = name; saveAuth();
      return api("PUT", "/api/delivery/auth/me", { name: name }).catch(function () { /* name is cosmetic */ });
    });
  }
  function afterLogin() {
    var c = (state.auth && state.auth.customer) || {};
    toast(c.name ? t("welcome_name", { name: String(c.name).split(" ")[0] }) : t("welcome"), "success");
    var target = state.afterLogin; state.afterLogin = null;
    if (target && !/#\/(intro|login|register)/.test(target)) { location.replace(location.pathname + location.search + target); return; }
    navigate("home", null, { replace: true });
  }

  function handleEmailLogin(e) {
    e.preventDefault();
    var email = $("login-email").value.trim(), password = $("login-password").value;
    if (!email || !password) { showErr("login-err", t("fill_required")); return; }
    var btn = $("btn-login-submit");
    setBusy(btn, true, t("signing_in"));
    api("POST", "/api/delivery/auth/login", { email: email, password: password, tenantId: PLATFORM_TENANT }, { auth: false })
      .then(function (data) { setAuth(data, false); afterLogin(); })
      .catch(function (err) {
        setBusy(btn, false);
        showErr("login-err", err.status === 401 ? t("invalid_credentials") : err.status === 429 ? t("too_many") : err.message);
      });
  }

  function renderRegister() {
    var f = $("form-register");
    if (f && !f.__wired) { f.addEventListener("submit", handleRegister); f.__wired = true; }
    var ph = $("reg-phone"); if (ph) ph.placeholder = regionHint() === "SY" ? "09xx xxx xxx" : "+41 79 123 45 67";
  }
  function handleRegister(e) {
    e.preventDefault();
    var name = $("reg-name").value.trim();
    var phone = normalizePhone($("reg-phone").value);
    var email = $("reg-email").value.trim() || null;
    var password = $("reg-password").value;
    if (!name) { showErr("reg-err", t("name_required")); return; }
    if (!phoneValid(phone)) { showErr("reg-err", t("phone_invalid")); return; }
    if (!password || password.length < 6) { showErr("reg-err", t("password_short")); return; }
    showErr("reg-err", "");
    var btn = $("btn-register-submit");
    setBusy(btn, true, t("creating"));
    api("POST", "/api/delivery/auth/register", { name: name, phone: phone, email: email, password: password, tenantId: PLATFORM_TENANT }, { auth: false })
      .then(function (data) {
        data.customer = { id: data.customer && data.customer.id, name: name, phone: phone, email: email };
        setAuth(data, false);
        afterLogin();
      })
      .catch(function (err) { setBusy(btn, false); showErr("reg-err", err.message); });
  }

  var guestBusy = false;
  function handleGuest() {
    if (guestBusy) return;
    dialog.prompt(t("guest_title"), {
      msg: t("guest_msg"), placeholder: t("your_name_ph"), okLabel: t("continue"), required: true, icon: "user", autocomplete: "name",
    }).then(function (name) {
      if (!name) return;
      guestBusy = true;
      var btn = $("btn-go-guest");
      setBusy(btn, true);
      api("POST", "/api/delivery/auth/guest", { name: name, tenantId: PLATFORM_TENANT }, { auth: false })
        .then(function (data) { setAuth(data, true); afterLogin(); })
        .catch(function (err) { toast(err.message || t("err_server"), "error"); })
        .then(function () { guestBusy = false; setBusy(btn, false); });
    });
  }

  function logout() {
    dialog.confirm(t("logout_title"), t("logout_msg"), { icon: "logout", tone: "warn", okLabel: t("logout"), cancelLabel: t("stay") })
      .then(function (ok) {
        if (!ok) return;
        api("POST", "/api/delivery/auth/logout", {}, { timeout: 6000 }).catch(function () { /* best effort */ });
        state.auth = null; saveAuth();
        cartClear();
        lsDel("bc_my_orders");
        lsDel("bc_pending_broadcast");
        setDepth(0);
        navigate("intro", null, { replace: true });
      });
  }

  // ─── Google sign-in ───────────────────────────────────────────────────────
  // In the Android app the wrapper signs in with Play Services
  // (window.__KASSENTA_NATIVE__ + postMessage "google-signin", answer on
  // window.__kassentaGoogleResult), exactly like /order/:slug's login.js.
  // In a browser Google's script is loaded lazily with a timeout, so a
  // blocked accounts.google.com never stalls the page.
  var GOOGLE_CLIENT_ID = "852311970344-8q8a01gm3jip4k9vooljk8ttjpd30802.apps.googleusercontent.com";
  var gis = null, googleBusyTimer = null;
  function googleButtonHtml(id) {
    return '<button class="btn btn--google" id="' + id + '" type="button" data-google>' +
      '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.76h3.56c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/><path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.56-2.76c-.98.66-2.24 1.06-3.72 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84A11 11 0 0 0 12 23z" fill="#34A853"/><path d="M5.84 14.11c-.22-.66-.35-1.36-.35-2.11s.13-1.45.35-2.11V7.05H2.18A11 11 0 0 0 1 12c0 1.77.42 3.45 1.18 4.95l3.66-2.84z" fill="#FBBC05"/><path d="M12 5.36c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1A11 11 0 0 0 2.18 7.05l3.66 2.84C6.71 7.29 9.14 5.36 12 5.36z" fill="#EA4335"/></svg>' +
      "<span>" + esc(t("continue_google")) + "</span></button>";
  }
  function bindGoogleButtons() {
    $$("[data-google]").forEach(function (b) { if (!b.__wired) { b.addEventListener("click", startGoogleSignIn); b.__wired = true; } });
  }
  function loadGis(timeoutMs) {
    if (window.google && window.google.accounts && window.google.accounts.oauth2) return Promise.resolve(window.google);
    if (!gis) {
      gis = new Promise(function (resolve, reject) {
        var s = document.createElement("script");
        s.src = "https://accounts.google.com/gsi/client";
        s.async = true; s.defer = true;
        s.onload = function () { window.google && window.google.accounts ? resolve(window.google) : reject(new Error("gis")); };
        s.onerror = function () { gis = null; reject(new Error("gis")); };
        document.head.appendChild(s);
      });
    }
    return withTimeout(gis, timeoutMs || 8000, "gis-timeout");
  }
  function preloadGoogle() { if (!IS_NATIVE) loadGis(15000).catch(function () { /* shown on click */ }); }
  function setGoogleBusy(busy) {
    $$("[data-google]").forEach(function (b) {
      b.disabled = busy;
      b.classList.toggle("is-busy", busy);
      var span = b.querySelector("span"); if (span) span.textContent = busy ? t("please_wait") : t("continue_google");
    });
    clearTimeout(googleBusyTimer);
    if (busy) googleBusyTimer = setTimeout(function () { setGoogleBusy(false); }, 90000);
  }
  function googleSessionFrom(payload) {
    return api("POST", "/api/delivery/auth/google", Object.assign({ tenantId: PLATFORM_TENANT }, payload), { auth: false })
      .then(function (data) { setAuth(data, false); setGoogleBusy(false); afterLogin(); })
      .catch(function (err) { setGoogleBusy(false); toast(err.network ? t("err_network") : (err.message || t("google_failed")), "error"); });
  }
  window.__kassentaGoogleResult = function (res) {
    if (!res || !res.ok) {
      setGoogleBusy(false);
      // The native error text is English SDK jargon; show our own message.
      if (!res || !res.cancelled) toast(t("google_failed"), "error");
      return;
    }
    googleSessionFrom({ credential: res.idToken });
  };
  function startGoogleSignIn() {
    setGoogleBusy(true);
    if (IS_NATIVE) {
      try { window.ReactNativeWebView.postMessage(JSON.stringify({ type: "google-signin" })); }
      catch (e) { setGoogleBusy(false); toast(t("google_failed"), "error"); }
      return;
    }
    loadGis(8000).then(function (google) {
      var client = google.accounts.oauth2.initTokenClient({
        client_id: GOOGLE_CLIENT_ID,
        scope: "openid email profile",
        callback: function (resp) {
          if (!resp || !resp.access_token) { setGoogleBusy(false); toast(t("google_cancelled"), "error"); return; }
          googleSessionFrom({ accessToken: resp.access_token });
        },
        error_callback: function (err) {
          setGoogleBusy(false);
          var type = (err && err.type) || "";
          if (type === "popup_closed") return;
          toast(type === "popup_failed_to_open" ? t("google_popup_blocked") : t("google_failed"), "error");
        },
      });
      client.requestAccessToken();
    }).catch(function () {
      setGoogleBusy(false);
      dialog.alert(t("google_unavailable_title"), t("google_unavailable_msg"), { icon: "alert", tone: "warn" });
    });
  }

  // ─── Home ─────────────────────────────────────────────────────────────────
  function renderHome() {
    var c = (state.auth && state.auth.customer) || {};
    var first = String(c.name || "").split(" ")[0];
    $("home-greet-name").textContent = first || t("there");
    var h = new Date().getHours();
    $("home-greet-sub").textContent = t(h < 12 ? "greet_morning" : h < 18 ? "greet_afternoon" : "greet_evening");
    var restEl = $("home-restaurants"), catEl = $("home-cuisines"), popEl = $("home-popular");
    if (!cache.rest) {
      restEl.innerHTML = '<div class="skeleton skel-rest"></div><div class="skeleton skel-rest"></div>';
    }
    loadRestaurants().then(function (rs) {
      if (state.route !== "home") return;
      restEl.innerHTML = rs.length ? rs.slice(0, 6).map(restCard).join("") : emptyHtml("store", t("no_stores"), t("check_back"));
      bindRestCards(restEl);
      var bc = cache.bc;
      if (bc) { renderHomeCats(catEl, bc); renderHomePopular(popEl, bc); }
    }).catch(function (err) {
      if (state.route !== "home") return;
      restEl.innerHTML = errorHtml(err);
      bindRetry(restEl, renderHome);
      catEl.innerHTML = ""; popEl.innerHTML = "";
    });
    renderHomeOrders();
  }

  function renderHomeCats(el, bc) {
    var counts = {};
    bc.products.forEach(function (p) { if (p.category) counts[p.category] = (counts[p.category] || 0) + 1; });
    var cats = Object.keys(counts).sort(function (a, b) { return counts[b] - counts[a]; }).slice(0, 14);
    $("home-cats-section").hidden = !cats.length;
    el.innerHTML = cats.map(function (cat) {
      return '<button type="button" class="cat-tile" data-cat="' + esc(cat) + '"><span class="cat-tile__ic">' + icon("grid") + "</span>" +
        '<span class="cat-tile__name">' + esc(cat) + '</span><span class="cat-tile__count">' + esc(t("n_items", { n: counts[cat] })) + "</span></button>";
    }).join("");
    $$("[data-cat]", el).forEach(function (b) {
      b.onclick = function () { bcState.cat = b.getAttribute("data-cat"); bcState.q = ""; navigate("broadcast"); };
    });
  }
  function renderHomePopular(el, bc) {
    var seen = {}, picks = [];
    for (var i = 0; i < bc.products.length && picks.length < 12; i++) {
      var p = bc.products[i];
      if (!p.imageUrl || !p.tenantSlug || seen[p.tenantId + ":" + p.name]) continue;
      // spread picks across stores
      if (picks.filter(function (x) { return x.tenantId === p.tenantId; }).length >= 3) continue;
      seen[p.tenantId + ":" + p.name] = 1; picks.push(p);
    }
    $("home-popular-section").hidden = !picks.length;
    el.innerHTML = picks.map(function (p) {
      return '<button type="button" class="pop-card" data-pid="' + p.id + '" data-slug="' + esc(p.tenantSlug) + '">' +
        '<span class="pop-card__img">' + imgTag(p.imageUrl, displayName(p)) + '<span class="pop-card__store">' + esc(p.tenantName) + "</span></span>" +
        '<span class="pop-card__body"><span class="pop-card__name">' + esc(displayName(p)) + '</span><span class="price">' + esc(money(p.price, p.currency)) + "</span></span></button>";
    }).join("");
    $$("[data-pid]", el).forEach(function (b) {
      b.onclick = function () {
        state.openProductAfterLoad = Number(b.getAttribute("data-pid"));
        navigate("menu", [b.getAttribute("data-slug")]);
      };
    });
  }
  function renderHomeOrders() {
    var el = $("home-orders");
    var list = mergedOrders().slice(0, 3);
    $("home-orders-section").hidden = !list.length;
    el.innerHTML = list.map(orderRow).join("");
    bindOrderRows(el);
    syncOrders().then(function () {
      if (state.route !== "home") return;
      var l2 = mergedOrders().slice(0, 3);
      $("home-orders-section").hidden = !l2.length;
      el.innerHTML = l2.map(orderRow).join("");
      bindOrderRows(el);
    });
  }

  function restCard(r) {
    var meta = [];
    if (r.eta) meta.push('<span>' + icon("clock") + " " + esc(t("min_short", { n: r.eta })) + "</span>");
    if (r.minOrder) meta.push("<span>" + icon("bag") + " " + esc(t("min_order_short", { v: money(r.minOrder, r.currency) })) + "</span>");
    if (r.fee > 0) meta.push("<span>" + icon("delivery") + " " + esc(money(r.fee, r.currency)) + "</span>");
    return '<button type="button" class="rest-card" data-slug="' + esc(r.slug || "") + '">' +
      '<span class="rest-card__cover">' + imgTag(r.cover, r.name) + (!r.isOpen ? '<span class="pill pill--closed">' + esc(t("closed")) + "</span>" : "") + "</span>" +
      '<span class="rest-card__body"><span class="rest-card__name">' + esc(r.name) + "</span>" +
      (r.cuisine ? '<span class="rest-card__sub">' + esc(r.cuisine) + "</span>" : "") +
      (meta.length ? '<span class="rest-card__meta">' + meta.join("") + "</span>" : "") + "</span></button>";
  }
  function bindRestCards(root) {
    $$("[data-slug]", root).forEach(function (n) {
      n.onclick = function () { var s = n.getAttribute("data-slug"); if (s) navigate("menu", [s]); };
    });
  }

  // ─── Stores list ──────────────────────────────────────────────────────────
  function renderRestaurants() {
    var listEl = $("restaurants-list"), inp = $("restaurants-search");
    if (!cache.rest) listEl.innerHTML = '<div class="skeleton skel-rest"></div><div class="skeleton skel-rest"></div><div class="skeleton skel-rest"></div>';
    loadRestaurants().then(function (rs) {
      if (state.route !== "restaurants") return;
      $("restaurants-count").textContent = t("n_stores", { n: rs.length });
      function draw() {
        var q = (inp.value || "").toLowerCase().trim();
        var f = q ? rs.filter(function (r) { return (r.name + " " + r.cuisine).toLowerCase().indexOf(q) > -1; }) : rs;
        listEl.innerHTML = f.length ? f.map(restCard).join("") : emptyHtml("search", t("no_results"), t("try_other_search"));
        bindRestCards(listEl);
      }
      inp.oninput = draw;
      draw();
    }).catch(function (err) {
      $("restaurants-count").textContent = "";
      listEl.innerHTML = errorHtml(err); bindRetry(listEl, renderRestaurants);
    });
  }

  // ─── Store menu ───────────────────────────────────────────────────────────
  var menuState = { slug: null, cat: "all", q: "" };
  function renderMenu(slug) {
    if (!slug) { navigate("restaurants", null, { replace: true }); return; }
    if (menuState.slug !== slug) { menuState = { slug: slug, cat: "all", q: "" }; $("menu-search").value = ""; }
    var hero = $("menu-hero"), listEl = $("menu-products"), catsEl = $("menu-cats");
    var cached = cache.stores[slug];
    if (!cached) {
      $("menu-title").textContent = "";
      hero.innerHTML = '<div class="skeleton skel-hero"></div>';
      catsEl.innerHTML = "";
      listEl.innerHTML = '<div class="skeleton skel-row"></div><div class="skeleton skel-row"></div><div class="skeleton skel-row"></div>';
    }
    loadStore(slug).then(function (m) {
      if (state.route !== "menu" || state.routeArgs[0] !== slug) return;
      autoLangFor(m.currency);
      var s = m.store;
      var name = s.storeName || s.name || "";
      $("menu-title").textContent = name;
      var rest = (cache.rest || []).find(function (r) { return r.slug === slug; });
      var meta = [];
      var eta = s.minDeliveryTime && s.maxDeliveryTime ? s.minDeliveryTime + "–" + s.maxDeliveryTime : (s.estimatedDeliveryTime || "");
      if (eta) meta.push("<span>" + icon("clock") + " " + esc(t("min_short", { n: eta })) + "</span>");
      if (num(s.minOrderAmount) > 0) meta.push("<span>" + icon("bag") + " " + esc(t("min_order_short", { v: money(s.minOrderAmount, m.currency) })) + "</span>");
      meta.push("<span>" + icon("delivery") + " " + esc(num(s.deliveryFee) > 0 ? money(s.deliveryFee, m.currency) : t("delivery_free_short")) + "</span>");
      var cover = s.coverImage || s.logo || (rest && rest.cover) || "";
      hero.innerHTML =
        '<div class="store-hero">' +
          '<div class="store-hero__cover">' + imgTag(cover, name) + "</div>" +
          '<div class="store-hero__body">' +
            "<h2>" + esc(name) + "</h2>" +
            (s.cuisine || (rest && rest.cuisine) ? '<p class="store-hero__sub">' + esc(s.cuisine || rest.cuisine) + "</p>" : "") +
            '<div class="store-hero__meta">' + meta.join("") + "</div>" +
            (rest && !rest.isOpen ? '<p class="notice notice--warn">' + icon("clock") + " " + esc(t("store_closed_note")) + "</p>" : "") +
            (s.openingHours ? '<p class="store-hero__hours">' + icon("info") + " " + esc(s.openingHours) + "</p>" : "") +
            '<div class="store-hero__actions">' +
              (s.supportPhone || s.phone ? '<a class="btn btn--soft btn--sm" href="tel:' + esc(String(s.supportPhone || s.phone).replace(/[^\d+]/g, "")) + '">' + icon("phone") + " " + esc(t("call_store")) + "</a>" : "") +
              (s.address ? '<span class="store-hero__addr">' + icon("pin") + " " + esc(s.address) + "</span>" : "") +
            "</div>" +
          "</div>" +
        "</div>";
      var cats = ["all"].concat(m.categories);
      if (cats.indexOf(menuState.cat) < 0) menuState.cat = "all";
      catsEl.innerHTML = cats.length > 2 ? cats.map(function (c) {
        return '<button type="button" class="chip' + (c === menuState.cat ? " active" : "") + '" data-cat="' + esc(c) + '">' + esc(c === "all" ? t("all") : c) + "</button>";
      }).join("") : "";
      $$("[data-cat]", catsEl).forEach(function (b) {
        b.onclick = function () {
          menuState.cat = b.getAttribute("data-cat");
          $$(".chip", catsEl).forEach(function (x) { x.classList.toggle("active", x === b); });
          drawMenuProducts(m);
        };
      });
      $("menu-search").oninput = function () { menuState.q = this.value; drawMenuProducts(m); };
      drawMenuProducts(m);
      if (state.openProductAfterLoad) {
        var pid = state.openProductAfterLoad; state.openProductAfterLoad = null;
        var p = m.products.find(function (x) { return x.id === pid; });
        if (p) openProductSheet(p, "tenant", m.products.filter(function (x) { return x.isAddon; }));
      }
    }).catch(function (err) {
      if (state.route !== "menu") return;
      hero.innerHTML = "";
      listEl.innerHTML = errorHtml(err);
      bindRetry(listEl, function () { renderMenu(slug); });
    });
  }
  function drawMenuProducts(m) {
    var listEl = $("menu-products");
    var q = (menuState.q || "").toLowerCase().trim();
    var f = m.products.filter(function (p) {
      if (menuState.cat !== "all" && p.category !== menuState.cat) return false;
      if (q && (p.name + " " + p.nameAr + " " + p.description).toLowerCase().indexOf(q) < 0) return false;
      return true;
    });
    if (!f.length) { listEl.innerHTML = emptyHtml(q ? "search" : "bag", q ? t("no_results") : t("no_items"), q ? t("try_other_search") : ""); return; }
    // Group by category when showing everything
    var html = "", lastCat = null;
    f.forEach(function (p) {
      if (menuState.cat === "all" && !q && p.category !== lastCat) {
        lastCat = p.category;
        if (p.category) html += '<h3 class="menu-cat-title">' + esc(p.category) + "</h3>";
      }
      html += prodRow(p);
    });
    listEl.innerHTML = html;
    var addons = m.products.filter(function (x) { return x.isAddon; });
    $$("[data-pid]", listEl).forEach(function (el) {
      el.onclick = function () {
        var p = m.products.find(function (x) { return x.id === Number(el.getAttribute("data-pid")); });
        if (p) openProductSheet(p, "tenant", addons);
      };
    });
  }
  function priceLabel(p) {
    if (p.variants.length) {
      var min = Math.min.apply(null, p.variants.map(function (v) { return num(v.price, p.price); }));
      return t("from_price", { v: money(min, p.currency) });
    }
    return money(p.price, p.currency);
  }
  function prodRow(p) {
    var q = cartQtyFor(p.id, p.tenantId);
    return '<button type="button" class="prod" data-pid="' + p.id + '">' +
      '<span class="prod__body"><span class="prod__name">' + esc(displayName(p)) + "</span>" +
      (p.description ? '<span class="prod__desc">' + esc(p.description) + "</span>" : "") +
      '<span class="price">' + esc(priceLabel(p)) + "</span></span>" +
      '<span class="prod__media">' + (p.imageUrl ? imgTag(p.imageUrl, displayName(p)) : '<span class="prod__ph">' + icon("bag") + "</span>") +
      (q ? '<span class="prod__qty">' + q + "</span>" : '<span class="prod__add" aria-hidden="true">' + icon("plus") + "</span>") +
      "</span></button>";
  }

  // ─── Quick order (broadcast) ──────────────────────────────────────────────
  var bcState = { cat: "all", sort: "popular", q: "" };
  function renderBroadcast() {
    var grid = $("bc-products");
    if (!cache.bc) grid.innerHTML = '<div class="skeleton skel-card"></div><div class="skeleton skel-card"></div><div class="skeleton skel-card"></div><div class="skeleton skel-card"></div>';
    wireBroadcastUi();
    $("bc-search").value = bcState.q;
    loadBroadcastMenu().then(function (bc) {
      if (state.route !== "broadcast") return;
      var rCount = bc.restaurants.length;
      $("broadcast-sub").textContent = t("bc_sub", { d: bc.products.length, r: rCount });
      var strip = $("bc-rest-strip");
      strip.innerHTML = bc.restaurants.map(function (r) {
        var s = bc.products.find(function (p) { return p.tenantId === r.id && p.imageUrl; });
        return '<button type="button" class="store-chip" data-slug="' + esc(r.slug || "") + '">' +
          '<span class="store-chip__img">' + (s ? imgTag(s.imageUrl, r.name) : icon("store")) + "</span>" +
          '<span class="store-chip__name">' + esc(r.name) + "</span></button>";
      }).join("");
      bindRestCards(strip);
      var cats = ["all"].concat(bc.categories);
      if (cats.indexOf(bcState.cat) < 0) bcState.cat = "all";
      var chips = $("bc-cats");
      chips.innerHTML = cats.map(function (c) {
        return '<button type="button" class="chip' + (c === bcState.cat ? " active" : "") + '" data-cat="' + esc(c) + '">' + esc(c === "all" ? t("all") : c) + "</button>";
      }).join("");
      $$("[data-cat]", chips).forEach(function (b) {
        b.onclick = function () {
          bcState.cat = b.getAttribute("data-cat");
          $$(".chip", chips).forEach(function (x) { x.classList.toggle("active", x === b); });
          drawBroadcastProducts();
        };
      });
      drawBroadcastProducts();
      if (state.focusSearch) { state.focusSearch = false; setTimeout(function () { $("bc-search").focus(); }, 150); }
    }).catch(function (err) {
      if (state.route !== "broadcast") return;
      grid.innerHTML = '<div class="grid-span">' + errorHtml(err) + "</div>";
      bindRetry(grid, renderBroadcast);
    });
  }
  function wireBroadcastUi() {
    var s = $("bc-search");
    if (!s.__wired) { s.addEventListener("input", function () { bcState.q = s.value; drawBroadcastProducts(); }); s.__wired = true; }
    var sel = $("bc-sort");
    if (!sel.__wired) { sel.addEventListener("change", function () { bcState.sort = sel.value; drawBroadcastProducts(); }); sel.__wired = true; }
    $$("option", sel).forEach(function (o) { o.textContent = t("sort_" + o.value.replace("-", "_")); });
    sel.value = bcState.sort;
  }
  function drawBroadcastProducts() {
    var bc = cache.bc; if (!bc) return;
    var q = (bcState.q || "").toLowerCase().trim();
    var f = bc.products.filter(function (p) {
      if (bcState.cat !== "all" && p.category !== bcState.cat) return false;
      if (!q) return true;
      return (p.name + " " + p.tenantName + " " + p.category + " " + p.nameAr + " " + p.description).toLowerCase().indexOf(q) > -1;
    });
    if (bcState.sort === "price-asc") f.sort(function (a, b) { return a.price - b.price; });
    else if (bcState.sort === "price-desc") f.sort(function (a, b) { return b.price - a.price; });
    else if (bcState.sort === "name") f.sort(function (a, b) { return displayName(a).localeCompare(displayName(b)); });
    $("bc-section-title").textContent = bcState.cat === "all" ? t("all_items") : bcState.cat;
    $("bc-section-count").textContent = t("n_items", { n: f.length });
    var grid = $("bc-products");
    if (!f.length) { grid.innerHTML = '<div class="grid-span">' + emptyHtml("search", t("no_results"), t("try_other_search")) + "</div>"; return; }
    grid.innerHTML = f.slice(0, 120).map(function (p) {
      var qn = cartQtyFor(p.id, p.tenantId);
      var opts = p.modifiers.length || p.variants.length;
      return '<button type="button" class="pcard" data-pid="' + p.id + '">' +
        '<span class="pcard__img">' + imgTag(p.imageUrl, displayName(p)) + '<span class="pcard__store">' + esc(p.tenantName) + "</span></span>" +
        '<span class="pcard__body"><span class="pcard__name">' + esc(displayName(p)) + "</span>" +
        (p.description ? '<span class="pcard__desc">' + esc(p.description) + "</span>" : "") +
        '<span class="pcard__foot"><span class="price">' + esc(priceLabel(p)) + "</span>" +
        (qn ? '<span class="pcard__in">' + icon("check") + " " + qn + "</span>" : '<span class="pcard__add" aria-hidden="true">' + icon(opts ? "menu" : "plus") + "</span>") +
        "</span></span></button>";
    }).join("");
    $$("[data-pid]", grid).forEach(function (el) {
      el.onclick = function () {
        var p = bc.products.find(function (x) { return x.id === Number(el.getAttribute("data-pid")); });
        if (p) openProductSheet(p, "broadcast", bc.addons.filter(function (a) { return a.tenantId === p.tenantId; }));
      };
    });
  }

  // ─── Product sheet (options, add-ons, quantity, notes) ────────────────────
  var SIZE_RX = /size|gr[öo]ss|grösse|größe|klein|kleine|grosse|حجم|الحجم|كبير|صغير/i;
  var sheet = null;
  function groupRules(g) {
    var required = !!g.required;
    var multi = g.multiple === true || (g.multiple == null && !required && !SIZE_RX.test(String(g.name || "")));
    return { required: required, multi: multi };
  }
  function openProductSheet(product, ctx, addons) {
    var groups = product.modifiers.map(function (g) { return groupRules(g); });
    sheet = {
      product: product, ctx: ctx, qty: 1, notes: "",
      variant: product.variants.length ? 0 : -1,
      sel: product.modifiers.map(function (g, i) {
        // A required single choice starts on its first option (usually the base size).
        return groups[i].required && !groups[i].multi && (g.options || []).length ? [0] : [];
      }),
      rules: groups,
      addons: (addons || []).filter(function (a) { return a.id !== product.id; }),
      addonQty: {},
    };
    $("cust-name").textContent = displayName(product);
    $("cust-tenant").textContent = product.tenantName || "";
    var cover = $("cust-cover");
    var old = cover.querySelector("img"); if (old) old.remove();
    cover.classList.toggle("cust-cover--noimg", !product.imageUrl);
    if (product.imageUrl) {
      var img = document.createElement("img");
      img.src = product.imageUrl; img.alt = ""; img.decoding = "async";
      img.onerror = function () { img.remove(); cover.classList.add("cust-cover--noimg"); };
      cover.insertBefore(img, cover.firstChild);
    }
    drawSheet();
    $("cust-sheet").removeAttribute("inert");
    $("cust-sheet").setAttribute("aria-hidden", "false");
    $("cust-overlay").classList.add("open");
    $("cust-sheet").classList.add("open");
    $("cust-body").scrollTop = 0;
    openLayer("sheet", hideSheet);
  }
  function hideSheet() {
    var active = document.activeElement;
    if (active && $("cust-sheet").contains(active)) active.blur();
    $("cust-overlay").classList.remove("open");
    $("cust-sheet").classList.remove("open");
    $("cust-sheet").setAttribute("inert", "");
    $("cust-sheet").setAttribute("aria-hidden", "true");
    sheet = null;
  }
  function drawSheet() {
    if (!sheet) return;
    var p = sheet.product, cur = p.currency, html = "";
    if (p.description) html += '<p class="cust-desc">' + esc(p.description) + "</p>";
    if (p.variants.length) {
      html += '<section class="cust-sec"><div class="cust-sec__head"><h4>' + esc(t("choose_option")) + '</h4><span class="tag tag--req">' + esc(t("required")) + "</span></div><div class=\"opts\">";
      p.variants.forEach(function (v, i) {
        html += optHtml("v", i, v.name || t("option_n", { n: i + 1 }), money(num(v.price, p.price), cur), sheet.variant === i, false);
      });
      html += "</div></section>";
    }
    p.modifiers.forEach(function (g, gi) {
      var r = sheet.rules[gi];
      html += '<section class="cust-sec" data-group="' + gi + '"><div class="cust-sec__head"><h4>' + esc(g.name || t("options")) + "</h4>" +
        (r.required ? '<span class="tag tag--req">' + esc(t("required")) + "</span>" : '<span class="tag">' + esc(r.multi ? t("pick_any") : t("pick_one")) + "</span>") +
        '</div><div class="opts">';
      (g.options || []).forEach(function (op, oi) {
        var pr = num(op.price);
        html += optHtml("m" + gi, oi, op.label || op.name || t("option_n", { n: oi + 1 }), pr > 0 ? "+" + money(pr, cur) : "", sheet.sel[gi].indexOf(oi) > -1, r.multi);
      });
      html += "</div></section>";
    });
    if (sheet.addons.length) {
      var groups = {};
      sheet.addons.forEach(function (a) { var k = a.category || t("addons"); (groups[k] = groups[k] || []).push(a); });
      Object.keys(groups).forEach(function (k) {
        html += '<section class="cust-sec"><div class="cust-sec__head"><h4>' + esc(k) + '</h4><span class="tag">' + esc(t("optional")) + '</span></div><div class="addons">';
        groups[k].forEach(function (a) {
          var q = sheet.addonQty[a.id] || 0;
          html += '<div class="addon' + (q ? " selected" : "") + '"><span class="addon__img">' + (a.imageUrl ? imgTag(a.imageUrl, "") : icon("bag")) + "</span>" +
            '<span class="addon__body"><span class="addon__name">' + esc(displayName(a)) + '</span><span class="addon__price">' + esc(money(a.price, cur)) + "</span></span>" +
            stepperHtml("a", a.id, q, true) + "</div>";
        });
        html += "</div></section>";
      });
    }
    html += '<section class="cust-sec"><div class="cust-sec__head"><h4>' + esc(t("notes")) + '</h4><span class="tag">' + esc(t("optional")) + "</span></div>" +
      '<textarea class="inp txt" id="cust-notes" rows="2" maxlength="200" placeholder="' + esc(t("item_notes_ph")) + '">' + esc(sheet.notes) + "</textarea></section>";
    $("cust-body").innerHTML = html;
    $("cust-qty").innerHTML = stepperHtml("q", 0, sheet.qty, false);
    $$("[data-opt]", $("cust-body")).forEach(function (el) {
      el.onclick = function () {
        var kind = el.getAttribute("data-opt"), idx = Number(el.getAttribute("data-idx"));
        if (kind === "v") sheet.variant = idx;
        else {
          var gi = Number(kind.slice(1)), arr = sheet.sel[gi], r = sheet.rules[gi];
          if (r.multi) { var pos = arr.indexOf(idx); if (pos > -1) arr.splice(pos, 1); else arr.push(idx); }
          else sheet.sel[gi] = (arr[0] === idx && !r.required) ? [] : [idx];
          var sec = el.closest(".cust-sec"); if (sec) sec.classList.remove("cust-sec--error");
        }
        drawSheetKeepScroll();
      };
    });
    $$("[data-step]", $("cust-sheet")).forEach(function (b) {
      b.onclick = function (e) {
        e.stopPropagation();
        var kind = b.getAttribute("data-step"), id = Number(b.getAttribute("data-id")), d = Number(b.getAttribute("data-d"));
        if (kind === "q") sheet.qty = Math.max(1, Math.min(99, sheet.qty + d));
        else { var q = Math.max(0, Math.min(20, (sheet.addonQty[id] || 0) + d)); if (q) sheet.addonQty[id] = q; else delete sheet.addonQty[id]; }
        drawSheetKeepScroll();
      };
    });
    var n = $("cust-notes"); n.oninput = function () { sheet.notes = n.value; };
    updateSheetTotal();
  }
  function drawSheetKeepScroll() { var b = $("cust-body"), top = b.scrollTop; drawSheet(); b.scrollTop = top; }
  function optHtml(kind, idx, label, price, selected, multi) {
    return '<button type="button" class="opt' + (selected ? " selected" : "") + (multi ? " opt--multi" : "") + '" data-opt="' + kind + '" data-idx="' + idx + '" aria-pressed="' + selected + '">' +
      '<span class="opt__check">' + (selected ? icon("check") : "") + '</span><span class="opt__label">' + esc(label) + "</span>" +
      (price ? '<span class="opt__price">' + esc(price) + "</span>" : "") + "</button>";
  }
  function stepperHtml(kind, id, q, compactWhenZero) {
    if (compactWhenZero && !q) return '<button type="button" class="step-add" data-step="' + kind + '" data-id="' + id + '" data-d="1" aria-label="' + esc(t("add")) + '">' + icon("plus") + "</button>";
    return '<span class="stepper"><button type="button" data-step="' + kind + '" data-id="' + id + '" data-d="-1" aria-label="' + esc(t("decrease")) + '">' + icon("minus") + "</button>" +
      '<span class="stepper__n">' + q + '</span><button type="button" data-step="' + kind + '" data-id="' + id + '" data-d="1" aria-label="' + esc(t("increase")) + '">' + icon("plus") + "</button></span>";
  }
  function sheetUnit() {
    var p = sheet.product;
    var base = sheet.variant >= 0 ? num(p.variants[sheet.variant].price, p.price) : p.price;
    sheet.sel.forEach(function (arr, gi) {
      arr.forEach(function (oi) { var op = (p.modifiers[gi].options || [])[oi]; if (op) base += num(op.price); });
    });
    return roundFor(base, p.currency);
  }
  function sheetAddonsTotal() {
    return sheet.addons.reduce(function (s, a) { return s + (sheet.addonQty[a.id] || 0) * a.price; }, 0);
  }
  function updateSheetTotal() {
    if (!sheet) return;
    $("cust-total").textContent = money(sheetUnit() * sheet.qty + sheetAddonsTotal(), sheet.product.currency);
  }
  function commitSheet() {
    if (!sheet) return;
    var p = sheet.product;
    var missing = -1;
    sheet.rules.forEach(function (r, gi) { if (missing < 0 && r.required && !sheet.sel[gi].length && (p.modifiers[gi].options || []).length) missing = gi; });
    if (missing > -1) {
      var sec = $("cust-body").querySelector('[data-group="' + missing + '"]');
      if (sec) { sec.classList.add("cust-sec--error"); sec.scrollIntoView({ behavior: "smooth", block: "center" }); }
      toast(t("choose_required", { g: p.modifiers[missing].name || t("options") }), "error");
      return;
    }
    var mods = [], labels = [];
    sheet.sel.forEach(function (arr, gi) {
      if (!arr.length) return;
      var g = p.modifiers[gi];
      var picked = arr.slice().sort(function (a, b) { return a - b; }).map(function (oi) { var o = g.options[oi]; return o && (o.label || o.name); }).filter(Boolean);
      if (!picked.length) return;
      mods.push((g.name || "") + ": " + picked.join(", "));
      labels.push(picked.join(", "));
    });
    var variant = sheet.variant >= 0 ? (p.variants[sheet.variant].name || null) : null;
    if (variant) labels.unshift(variant);
    var base = {
      tenantId: p.tenantId, tenantName: p.tenantName, tenantSlug: p.tenantSlug, currency: p.currency,
    };
    var lines = [Object.assign({}, base, {
      productId: p.id, name: p.name, nameAr: p.nameAr, label: labels.join(" · "), variant: variant, modifiers: mods,
      notes: (sheet.notes || "").trim() || null, quantity: sheet.qty, estimatedPrice: sheetUnit(), imageUrl: p.imageUrl,
    })];
    sheet.addons.forEach(function (a) {
      var q = sheet.addonQty[a.id]; if (!q) return;
      lines.push(Object.assign({}, base, { productId: a.id, name: a.name, nameAr: a.nameAr, label: "", variant: null, modifiers: [],
        notes: null, quantity: q, estimatedPrice: a.price, imageUrl: a.imageUrl, isAddon: true }));
    });
    var ctx = sheet.ctx;
    var btn = $("cust-add"); btn.disabled = true;
    cartAdd(lines, ctx).then(function (ok) {
      btn.disabled = false;
      if (!ok) return;
      closeTopLayer();
      toast(t("added_to_cart"), "success");
      if (state.route === "menu") { var m = cache.stores[menuState.slug]; if (m) drawMenuProducts(m); }
      if (state.route === "broadcast") drawBroadcastProducts();
    });
  }

  // ─── Cart page ────────────────────────────────────────────────────────────
  function lineName(it) { return state.lang === "ar" && it.nameAr ? it.nameAr : it.name; }
  function renderCart() {
    var body = $("cart-body"), bar = $("cart-bar");
    if (!state.cart.length) {
      $("cart-sub").textContent = "";
      body.innerHTML = emptyHtml("cart", t("cart_empty"), t("cart_empty_sub"), '<a class="btn btn--soft btn--sm" href="#/restaurants">' + esc(t("browse_stores")) + "</a>");
      bar.hidden = true;
      return;
    }
    var cur = cartCurrency();
    var isB = state.cartMode === "broadcast";
    $("cart-sub").textContent = isB ? t("quick_order") : cartStoreName();
    var slug = state.cart[0].tenantSlug || findSlugForTenant(state.cart[0].tenantId);
    var html = isB ? '<p class="notice">' + icon("bolt") + " " + esc(t("bc_cart_note")) + "</p>" : "";
    html += '<div class="panel cart-lines">' + state.cart.map(function (it, i) {
      return '<div class="cline">' +
        '<span class="cline__img">' + (it.imageUrl ? imgTag(it.imageUrl, "") : icon("bag")) + "</span>" +
        '<span class="cline__body"><span class="cline__name">' + esc(lineName(it)) + "</span>" +
        (it.label ? '<span class="cline__opts">' + esc(it.label) + "</span>" : "") +
        (it.notes ? '<span class="cline__opts">' + icon("note") + " " + esc(it.notes) + "</span>" : "") +
        (isB ? '<span class="cline__opts">' + icon("store") + " " + esc(it.tenantName) + "</span>" : "") +
        '<span class="cline__foot"><span class="price">' + esc(money(it.quantity * num(it.estimatedPrice), cur)) + "</span>" +
        '<span class="stepper stepper--sm"><button type="button" data-line="' + i + '" data-d="-1" aria-label="' + esc(it.quantity === 1 ? t("remove") : t("decrease")) + '">' + icon(it.quantity === 1 ? "trash" : "minus") + "</button>" +
        '<span class="stepper__n">' + it.quantity + '</span><button type="button" data-line="' + i + '" data-d="1" aria-label="' + esc(t("increase")) + '">' + icon("plus") + "</button></span>" +
        "</span></span></div>";
    }).join("") + "</div>";
    html += '<div class="cart-links">' +
      (!isB && slug ? '<a class="link-btn" href="#/menu/' + encodeURIComponent(slug) + '">' + icon("plus") + " " + esc(t("add_more")) + "</a>" : '<a class="link-btn" href="#/broadcast">' + icon("plus") + " " + esc(t("add_more")) + "</a>") +
      '<button type="button" class="link-btn link-btn--danger" id="btn-cart-clear">' + icon("trash") + " " + esc(t("clear_cart")) + "</button></div>";
    html += '<div class="panel summary"><div class="sum-row"><span>' + esc(t("subtotal")) + "</span><span>" + esc(money(cartSubtotal(), cur)) + "</span></div>" +
      '<div id="cart-minorder"></div></div>';
    body.innerHTML = html;
    $$("[data-line]", body).forEach(function (b) {
      b.onclick = function () {
        var i = Number(b.getAttribute("data-line")), it = state.cart[i]; if (!it) return;
        cartSetQty(i, it.quantity + Number(b.getAttribute("data-d")));
        renderCart();
      };
    });
    $("btn-cart-clear").onclick = function () {
      dialog.confirm(t("clear_cart_q"), t("clear_cart_msg"), { icon: "trash", tone: "danger", okLabel: t("clear_cart"), cancelLabel: t("cancel") })
        .then(function (ok) { if (ok) { cartClear(); renderCart(); } });
    };
    bar.hidden = false;
    $("cart-bar-total").textContent = money(cartSubtotal(), cur);
    if (!isB && slug) {
      loadStore(slug).then(function (m) {
        var min = num(m.store.minOrderAmount);
        var el = $("cart-minorder");
        if (el && min > 0 && cartSubtotal() < min) {
          el.innerHTML = '<p class="notice notice--warn">' + icon("info") + " " + esc(t("min_order_note", { min: money(min, cur), left: money(min - cartSubtotal(), cur) })) + "</p>";
        }
      }).catch(function () { /* checkout re-checks */ });
    }
  }

  // ─── Checkout ─────────────────────────────────────────────────────────────
  var co = null;   // checkout state
  var placing = false;
  function contactDefaults() {
    var saved = lsJson("bc_contact", {});
    var c = (state.auth && state.auth.customer) || {};
    return {
      name: saved.name || c.name || "",
      phone: saved.phone || realPhone(c.phone) || "",
      email: saved.email || c.email || "",
      area: saved.area || "", street: saved.street || "", building: saved.building || "",
      floor: saved.floor || "", addrNotes: saved.addrNotes || "",
    };
  }
  function renderCheckout() {
    var body = $("checkout-body");
    if (!state.cart.length) { navigate("cart", null, { replace: true }); return; }
    if (placing) return;
    var isB = state.cartMode === "broadcast";
    var cur = cartCurrency();
    autoLangFor(cur);
    var tenantId = state.cart[0].tenantId;
    var slug = state.cart[0].tenantSlug || findSlugForTenant(tenantId);
    body.innerHTML = '<div class="skeleton skel-row"></div><div class="skeleton skel-row"></div><div class="skeleton skel-hero"></div>';
    $("checkout-bar").hidden = true;
    var storeP = isB || !slug ? Promise.resolve(null) : loadStore(slug);
    var payP = isB ? Promise.resolve({ cash: true, card: false, shamcash: null }) : loadPayCfg(tenantId, cur);
    Promise.all([storeP, payP]).then(function (out) {
      if (state.route !== "checkout") return;
      var m = out[0], pay = out[1];
      var store = m ? m.store : null;
      var types = [];
      if (isB || !store || store.enableDelivery !== false) types.push("delivery");
      if (!isB && store && store.enablePickup !== false) types.push("pickup");
      if (!types.length) types.push("delivery");
      var prev = co || {};
      co = {
        isB: isB, cur: cur, tenantId: tenantId, store: store, pay: pay, types: types,
        type: types.indexOf(prev.type) > -1 ? prev.type : types[0],
        method: null, loc: prev.loc || null, vals: prev.vals || contactDefaults(), notes: prev.notes || "",
      };
      var methods = payMethods();
      co.method = methods.indexOf(prev.method) > -1 ? prev.method : methods[0];
      drawCheckout();
    }).catch(function (err) {
      if (state.route !== "checkout") return;
      body.innerHTML = errorHtml(err); bindRetry(body, renderCheckout);
    });
  }
  function payMethods() {
    if (co.isB) return ["cash"];
    var m = [];
    if (co.pay.cash) m.push("cash");
    if (co.pay.shamcash) m.push("shamcash");
    if (co.pay.card) m.push("card");
    if (!m.length) m.push("cash");
    return m;
  }
  function deliveryFee() {
    if (co.type !== "delivery" || !co.store) return 0;
    return roundFor(num(co.store.deliveryFee), co.cur);
  }
  function minOrder() { return co.store && co.type === "delivery" ? num(co.store.minOrderAmount) : 0; }
  function drawCheckout() {
    var body = $("checkout-body"), v = co.vals, cur = co.cur;
    $("checkout-sub").textContent = co.isB ? t("quick_order") : cartStoreName();
    var html = "";
    if (co.isB) html += '<p class="notice">' + icon("bolt") + " " + esc(t("bc_checkout_note")) + "</p>";
    if (co.types.length > 1) {
      html += '<div class="seg seg--lg" role="tablist">' + co.types.map(function (tp) {
        return '<button type="button" class="seg__btn' + (co.type === tp ? " active" : "") + '" data-type="' + tp + '" role="tab" aria-selected="' + (co.type === tp) + '">' +
          icon(tp === "delivery" ? "delivery" : "walk") + " " + esc(t(tp)) + "</button>";
      }).join("") + "</div>";
    }
    var phHint = cur === "SYP" ? t("phone_hint_sy") : t("phone_hint");
    html += '<section class="panel form-panel"><h3 class="panel__title">' + icon("user") + " " + esc(t("contact")) + "</h3>" +
      field("co-name", t("full_name") + " *", '<input class="inp" id="co-name" autocomplete="name" maxlength="80" value="' + esc(v.name) + '">') +
      field("co-phone", t("phone_number") + " *", '<input class="inp" id="co-phone" type="tel" inputmode="tel" autocomplete="tel" dir="ltr" maxlength="24" placeholder="' + esc(cur === "SYP" ? "09xx xxx xxx" : "+41 79 123 45 67") + '" value="' + esc(v.phone ? (/^\d+$/.test(v.phone) ? prettyPhone(v.phone) : v.phone) : "") + '">', phHint) +
      (cur === "SYP" ? "" : field("co-email", t("email_optional"), '<input class="inp" id="co-email" type="email" inputmode="email" autocomplete="email" dir="ltr" maxlength="120" value="' + esc(v.email) + '">')) +
      "</section>";
    if (co.type === "delivery") {
      html += '<section class="panel form-panel"><h3 class="panel__title">' + icon("pin") + " " + esc(t("delivery_address")) + "</h3>" +
        field("co-area", t("area_city") + " *", '<input class="inp" id="co-area" autocomplete="address-level2" maxlength="80" placeholder="' + esc(t("area_ph")) + '" value="' + esc(v.area) + '">') +
        field("co-street", t("street") + " *", '<input class="inp" id="co-street" autocomplete="address-line1" maxlength="120" placeholder="' + esc(t("street_ph")) + '" value="' + esc(v.street) + '">') +
        '<div class="grid-2">' +
          field("co-building", t("building"), '<input class="inp" id="co-building" maxlength="60" value="' + esc(v.building) + '">') +
          field("co-floor", t("floor"), '<input class="inp" id="co-floor" maxlength="20" value="' + esc(v.floor) + '">') +
        "</div>" +
        field("co-addrnotes", t("addr_notes"), '<input class="inp" id="co-addrnotes" maxlength="160" placeholder="' + esc(t("addr_notes_ph")) + '" value="' + esc(v.addrNotes) + '">') +
        '<div class="locate"><button type="button" class="btn btn--soft btn--sm" id="btn-locate">' + icon("locate") + " " +
          esc(co.loc ? t("location_added") : t("add_location")) + "</button>" +
          (co.loc ? '<button type="button" class="link-btn" id="btn-locate-clear">' + esc(t("remove")) + "</button>" : "") +
          '<small class="field__hint">' + esc(t("location_optional")) + "</small></div>" +
        "</section>";
    } else if (co.store) {
      html += '<section class="panel form-panel"><h3 class="panel__title">' + icon("store") + " " + esc(t("pickup_from")) + "</h3>" +
        '<p class="pickup-addr"><strong>' + esc(co.store.storeName || co.store.name || "") + "</strong>" +
        (co.store.address ? "<span>" + esc(co.store.address) + "</span>" : "") + "</p></section>";
    }
    var methods = payMethods();
    html += '<section class="panel form-panel"><h3 class="panel__title">' + icon("wallet") + " " + esc(t("payment")) + '</h3><div class="pay-opts" role="radiogroup">' +
      methods.map(function (mt) {
        var title = mt === "cash" ? t(co.type === "pickup" ? "pay_pickup" : "pay_cash") : mt === "card" ? t("pay_card") : t("pay_shamcash");
        var sub = mt === "cash" ? t(co.type === "pickup" ? "pay_pickup_sub" : "pay_cash_sub") : mt === "card" ? t("pay_card_sub") : t("pay_shamcash_sub");
        return '<button type="button" class="pay-opt' + (co.method === mt ? " selected" : "") + '" data-method="' + mt + '" role="radio" aria-checked="' + (co.method === mt) + '">' +
          '<span class="pay-opt__ic">' + icon(mt === "cash" ? "cash" : mt === "card" ? "card" : "qr") + "</span>" +
          '<span class="pay-opt__body"><strong>' + esc(title) + "</strong><span>" + esc(sub) + "</span></span>" +
          '<span class="pay-opt__radio"></span></button>';
      }).join("") + "</div></section>";
    html += '<section class="panel form-panel"><h3 class="panel__title">' + icon("note") + " " + esc(t("order_notes")) + "</h3>" +
      '<textarea class="inp txt" id="co-notes" rows="2" maxlength="500" placeholder="' + esc(t("order_notes_ph")) + '">' + esc(co.notes) + "</textarea></section>";
    var sub = cartSubtotal(), fee = deliveryFee(), total = roundFor(sub + fee, cur), min = minOrder();
    html += '<section class="panel summary"><h3 class="panel__title">' + icon("receipt") + " " + esc(t("summary")) + "</h3>" +
      state.cart.map(function (it) {
        return '<div class="sum-line"><span><b>' + it.quantity + "×</b> " + esc(lineName(it)) + (it.label ? " <small>(" + esc(it.label) + ")</small>" : "") + "</span><span>" + esc(money(it.quantity * num(it.estimatedPrice), cur)) + "</span></div>";
      }).join("") +
      '<div class="sum-row"><span>' + esc(t("subtotal")) + "</span><span>" + esc(money(sub, cur)) + "</span></div>" +
      (co.type === "delivery" && !co.isB ? '<div class="sum-row"><span>' + esc(t("delivery_fee")) + "</span><span>" + esc(fee > 0 ? money(fee, cur) : t("free")) + "</span></div>" : "") +
      '<div class="sum-row sum-row--total"><span>' + esc(t("total")) + "</span><span>" + esc(money(total, cur)) + "</span></div>" +
      '<p class="sum-note">' + esc(co.isB ? t("bc_total_note") : t("total_note")) + "</p>" +
      (min > 0 && sub < min ? '<p class="notice notice--warn" id="co-min">' + icon("info") + " " + esc(t("min_order_note", { min: money(min, cur), left: money(min - sub, cur) })) + "</p>" : "") +
      "</section>";
    body.innerHTML = html;
    $("checkout-bar").hidden = false;
    $("checkout-bar-total").textContent = money(total, cur);
    var btn = $("btn-place");
    btn.disabled = placing || (min > 0 && sub < min);
    btn.innerHTML = placing ? spinner() + " " + esc(t("placing")) : esc(co.isB ? t("send_order") : t("place_order"));

    $$("[data-type]", body).forEach(function (b) { b.onclick = function () { readCheckoutForm(); co.type = b.getAttribute("data-type"); if (payMethods().indexOf(co.method) < 0) co.method = payMethods()[0]; drawCheckoutKeepScroll(); }; });
    $$("[data-method]", body).forEach(function (b) { b.onclick = function () { readCheckoutForm(); co.method = b.getAttribute("data-method"); drawCheckoutKeepScroll(); }; });
    $$("input, textarea", body).forEach(function (el) { el.addEventListener("change", readCheckoutForm); el.addEventListener("input", function () { el.classList.remove("inp--error"); }); });
    var lb = $("btn-locate"); if (lb) lb.onclick = locateMe;
    var lc = $("btn-locate-clear"); if (lc) lc.onclick = function () { readCheckoutForm(); co.loc = null; drawCheckoutKeepScroll(); };
  }
  function drawCheckoutKeepScroll() { var y = window.scrollY; drawCheckout(); window.scrollTo(0, y); }
  function val(id) { var el = $(id); return el ? el.value.trim() : ""; }
  function readCheckoutForm() {
    if (!co) return;
    var v = co.vals;
    if ($("co-name")) v.name = val("co-name");
    if ($("co-phone")) v.phone = val("co-phone");
    if ($("co-email")) v.email = val("co-email");
    if ($("co-area")) { v.area = val("co-area"); v.street = val("co-street"); v.building = val("co-building"); v.floor = val("co-floor"); v.addrNotes = val("co-addrnotes"); }
    if ($("co-notes")) co.notes = val("co-notes");
  }
  function locateMe() {
    readCheckoutForm();
    if (!navigator.geolocation) { toast(t("location_unavailable"), "error"); return; }
    var b = $("btn-locate"); setBusy(b, true, t("locating"));
    var done = false;
    var guard = setTimeout(function () { if (!done) { done = true; setBusy(b, false); toast(t("location_unavailable"), "error"); } }, 15000);
    navigator.geolocation.getCurrentPosition(function (pos) {
      if (done) return; done = true; clearTimeout(guard);
      co.loc = { lat: Math.round(pos.coords.latitude * 1e6) / 1e6, lng: Math.round(pos.coords.longitude * 1e6) / 1e6 };
      toast(t("location_added"), "success");
      drawCheckoutKeepScroll();
    }, function () {
      if (done) return; done = true; clearTimeout(guard);
      setBusy(b, false); toast(t("location_denied"), "error");
    }, { enableHighAccuracy: true, timeout: 12000, maximumAge: 120000 });
  }
  function markErr(id) { var el = $(id); if (el) { el.classList.add("inp--error"); } return el; }
  function validateCheckout() {
    readCheckoutForm();
    var v = co.vals, firstBad = null;
    function bad(id) { var el = markErr(id); if (!firstBad) firstBad = el; }
    if (!v.name) bad("co-name");
    var phone = normalizePhone(v.phone, co.cur === "SYP" ? "SY" : co.cur === "CHF" ? "CH" : null);
    if (!phoneValid(phone)) bad("co-phone");
    if (v.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v.email)) bad("co-email");
    if (co.type === "delivery") { if (!v.area) bad("co-area"); if (!v.street) bad("co-street"); }
    if (firstBad) {
      firstBad.scrollIntoView({ behavior: "smooth", block: "center" });
      setTimeout(function () { try { firstBad.focus({ preventScroll: true }); } catch (e) { firstBad.focus(); } }, 300);
      toast(firstBad.id === "co-phone" ? t("phone_invalid") : t("fill_required"), "error");
      return null;
    }
    lsSet("bc_contact", JSON.stringify(v));
    return phone;
  }
  function composedAddress() {
    var v = co.vals;
    return [v.street, v.building ? t("building") + " " + v.building : "", v.floor ? t("floor") + " " + v.floor : "", v.area].filter(Boolean).join(isRtl() ? "، " : ", ");
  }

  function placeOrder() {
    if (placing || !co) return;
    var phone = validateCheckout();
    if (!phone) return;
    var sub = cartSubtotal(), min = minOrder();
    if (min > 0 && sub < min) { toast(t("min_order_note", { min: money(min, co.cur), left: money(min - sub, co.cur) }), "error"); return; }
    placing = true;
    var btn = $("btn-place");
    btn.disabled = true; btn.innerHTML = spinner() + " " + esc(t("placing"));
    var v = co.vals, cur = co.cur;
    // One key per checkout: a manual retry after an uncertain failure sends
    // the same key, so a server that honours it cannot create a duplicate.
    var ref = co.idemKey || (co.idemKey = "k" + Date.now().toString(36) + Math.random().toString(36).slice(2, 8));
    var req;
    if (co.isB) {
      req = api("POST", "/api/delivery/broadcast", {
        customerName: v.name, customerPhone: phone, customerEmail: v.email || null,
        // The broadcast table has no floor/notes columns: keep driver directions in the address.
        customerAddress: composedAddress() + (v.addrNotes ? " — " + v.addrNotes : ""),
        customerLat: co.loc ? co.loc.lat : null, customerLng: co.loc ? co.loc.lng : null,
        items: state.cart.map(function (it) {
          return { productId: it.productId, name: it.name, quantity: it.quantity, estimatedPrice: it.estimatedPrice,
                   tenantName: it.tenantName, variant: it.variant || null, modifiers: it.modifiers || [], notes: it.notes || null };
        }),
        notes: co.notes || null, estimatedTotal: sub, paymentMethod: "cash",
      }, { headers: { "Idempotency-Key": ref }, timeout: 30000 });
    } else {
      var fee = deliveryFee();
      req = api("POST", "/api/delivery/orders", {
        tenantId: co.tenantId, customerName: v.name, customerPhone: phone, customerEmail: v.email || null,
        customerAddress: co.type === "delivery" ? composedAddress() : null,
        floor: co.type === "delivery" ? (v.floor || null) : null,
        buildingName: co.type === "delivery" ? (v.building || null) : null,
        addressNotes: co.type === "delivery" ? (v.addrNotes || null) : null,
        customerLat: co.type === "delivery" && co.loc ? co.loc.lat : null,
        customerLng: co.type === "delivery" && co.loc ? co.loc.lng : null,
        items: state.cart.map(function (it) {
          return { productId: it.productId, name: it.name, quantity: it.quantity, unitPrice: it.estimatedPrice,
                   total: roundFor(it.quantity * num(it.estimatedPrice), cur), variant: it.variant || null,
                   modifiers: it.modifiers || [], notes: it.notes || null };
        }),
        notes: co.notes || null, subtotal: sub, deliveryFee: fee, totalAmount: roundFor(sub + fee, cur),
        paymentMethod: co.method, orderType: co.type, language: state.lang,
      }, { headers: { "Idempotency-Key": ref }, timeout: 30000 });
    }
    req.then(function (resp) {
      resp = resp || {};
      var snapshot = state.cart.slice();
      var storeName = co.isB ? t("quick_order") : cartStoreName();
      cartClear();
      if (co.isB) {
        var pend = { token: resp.token, expiresAt: resp.expiresAt, createdAt: new Date().toISOString(), items: snapshot, total: sub, currency: cur };
        lsSet("bc_pending_broadcast", JSON.stringify(pend));
        placing = false; co = null;
        navigate("waiting", [resp.token], { replace: true });
        return;
      }
      rememberOrder({
        token: resp.trackingToken, id: resp.orderId, orderNumber: resp.orderNumber, tenantId: co.tenantId,
        storeName: storeName, currency: cur, total: resp.totalAmount != null ? resp.totalAmount : roundFor(sub + deliveryFee(), cur),
        status: "pending", orderType: co.type, paymentMethod: co.method, createdAt: new Date().toISOString(),
      });
      var method = co.method, pay = co.pay, order = { orderId: resp.orderId, orderNumber: resp.orderNumber, trackingToken: resp.trackingToken,
        totalAmount: resp.totalAmount, currency: cur, tenantId: co.tenantId, orderType: co.type };
      placing = false; co = null;
      var after = Promise.resolve();
      if (method === "card" && resp.orderId) after = openPaymentSheet(order).then(function (r) {
        if (r && r.paid) toast(t("paid_thanks"), "success");
        else if (r && r.status === "pending") toast(t("payment_processing"));
        else toast(t("order_unpaid_note"));
      });
      else if (method === "shamcash" && resp.orderId && pay.shamcash) after = openShamCashSheet(order, pay.shamcash).then(function (r) {
        toast(r && r.sent ? t("shamcash_thanks") : t("order_placed"), "success");
      });
      else toast(t("order_placed"), "success");
      after.then(function () {
        if (resp.trackingToken) navigate("track", [resp.trackingToken], { replace: true });
        else navigate("orders", null, { replace: true });
      });
    }).catch(function (err) {
      placing = false;
      if (state.route === "checkout" && co) drawCheckoutKeepScroll();
      if (err.network || err.status === 502 || err.status === 504) {
        // The request may have reached the server (a gateway timeout does not
        // mean the order failed). Never resubmit silently.
        dialog.confirm(t("uncertain_title"), t("uncertain_msg"), { icon: "alert", tone: "warn", okLabel: t("check_orders"), cancelLabel: t("stay_here") })
          .then(function (goOrders) { if (goOrders) navigate("orders"); });
      } else {
        dialog.alert(t("order_failed_title"), err.message || t("err_server"), { icon: "alert", tone: "danger" });
      }
    });
  }

  // ─── Payment sheets ───────────────────────────────────────────────────────
  function xsheet(html) {
    var wrap = document.createElement("div");
    wrap.className = "xsheet-backdrop";
    wrap.setAttribute("dir", isRtl() ? "rtl" : "ltr");
    wrap.innerHTML = '<div class="xsheet" role="dialog" aria-modal="true">' + html + "</div>";
    document.body.appendChild(wrap);
    requestAnimationFrame(function () { wrap.classList.add("open"); });
    return wrap;
  }
  function removeXsheet(wrap) { wrap.classList.remove("open"); setTimeout(function () { if (wrap.parentNode) wrap.parentNode.removeChild(wrap); }, 220); }

  /** Stripe PaymentElement for an order that already exists. Card-capable stores only. */
  function openPaymentSheet(order) {
    return new Promise(function (resolve) {
      var laterLabel = order.orderType === "pickup" ? t("pay_at_pickup_instead") : t("pay_on_delivery_instead");
      var wrap = xsheet(
        '<div class="xsheet__head"><strong>' + esc(t("pay_order_n", { n: order.orderNumber || "" })) + '</strong><button type="button" class="icon-btn" data-x aria-label="' + esc(t("close")) + '">' + icon("x") + "</button></div>" +
        '<div class="xsheet__amount" data-amount>' + (order.totalAmount != null ? esc(money(order.totalAmount, order.currency)) : "") + "</div>" +
        '<div class="pay-element" data-el><div class="pay-loading">' + spinner() + " " + esc(t("loading_payment")) + "</div></div>" +
        '<p class="form__err" data-err hidden></p>' +
        '<button type="button" class="btn" data-go disabled>' + esc(t("loading")) + "</button>" +
        '<button type="button" class="btn btn--ghost" data-later>' + esc(laterLabel) + "</button>" +
        '<p class="xsheet__note">' + icon("info") + " " + esc(t("stripe_note")) + "</p>");
      var errEl = wrap.querySelector("[data-err]"), go = wrap.querySelector("[data-go]");
      var finished = false, busy = false;
      function finish(r) { if (finished) return; finished = true; result = r; closeTopLayer(); }
      var result = { paid: false, reason: "closed" };
      openLayer("pay", function () { removeXsheet(wrap); finished = true; resolve(result); });
      function showErr(m) { errEl.textContent = m; errEl.hidden = false; }
      wrap.querySelector("[data-x]").onclick = function () { if (!busy) finish({ paid: false, reason: "closed" }); };
      wrap.querySelector("[data-later]").onclick = function () { if (!busy) finish({ paid: false, reason: "later" }); };
      var P = window.KassentaPay;
      if (!P) { showErr(t("card_unavailable")); go.textContent = t("unavailable"); return; }
      withTimeout(P.init({ basePath: "", tenantId: order.tenantId }), 10000)
        .then(function () {
          if (!P.isAvailable()) throw new Error(t("card_unavailable"));
          return withTimeout(P.createOrderIntent(order.orderId, order.trackingToken), 20000);
        })
        .then(function (intent) {
          var a = wrap.querySelector("[data-amount]");
          if (a && intent.amount != null) {
            var code = String(intent.currency || order.currency || "").toUpperCase();
            a.textContent = money(ZERO_DECIMAL[code] ? intent.amount : intent.amount / 100, code);
          }
          var host = wrap.querySelector("[data-el]"); host.innerHTML = "";
          return withTimeout(P.mount(host, intent.clientSecret, {
            dark: activeTheme() === "dark", primaryColor: activeTheme() === "dark" ? "#2DD4C4" : "#0A6E65",
            locale: state.lang || "auto",
          }), 25000);
        })
        .then(function () {
          go.disabled = false; go.textContent = t("pay_now");
          go.onclick = function () {
            if (busy) return;
            busy = true; go.disabled = true; go.innerHTML = spinner() + " " + esc(t("processing"));
            errEl.hidden = true;
            var back = P.returnUrl({ order_id: order.orderId, tracking_token: order.trackingToken });
            P.confirm(back).then(function (intent) {
              if (!intent) return; // redirected away; resumed on return
              go.innerHTML = spinner() + " " + esc(t("confirming"));
              return P.waitForSettlement(intent.id).then(function (r) { busy = false; finish({ paid: r.settled, status: r.status }); });
            }).catch(function (e) {
              busy = false; go.disabled = false; go.textContent = t("try_again");
              showErr(e.message || t("payment_failed"));
            });
          };
        })
        .catch(function (e) {
          var host = wrap.querySelector("[data-el]"); if (host) host.innerHTML = "";
          showErr(e && e.network ? t("card_load_timeout") : ((e && e.message) || t("card_unavailable")));
          go.textContent = t("unavailable");
        });
    });
  }

  /** Sham Cash manual transfer: the store's QR code / number + optional reference. */
  function openShamCashSheet(order, sc) {
    return new Promise(function (resolve) {
      var laterLabel = order.orderType === "pickup" ? t("pay_at_pickup_instead") : t("pay_on_delivery_instead");
      function row(label, value) {
        if (!value) return "";
        return '<div class="kv"><span>' + esc(label) + '</span><span class="kv__v"><bdi dir="ltr">' + esc(value) + '</bdi><button type="button" class="chip chip--sm" data-copy="' + esc(value) + '">' + icon("copy") + " " + esc(t("copy")) + "</button></span></div>";
      }
      var img = sc.qrImage ? (/^(https?:|data:)/.test(sc.qrImage) ? sc.qrImage : (sc.qrImage.indexOf("/api/") === 0 ? sc.qrImage : "/api" + sc.qrImage)) : "";
      var wrap = xsheet(
        '<div class="xsheet__head"><strong>' + esc(t("pay_shamcash")) + '</strong><button type="button" class="icon-btn" data-x aria-label="' + esc(t("close")) + '">' + icon("x") + "</button></div>" +
        (order.totalAmount != null ? '<div class="xsheet__amount">' + esc(money(order.totalAmount, order.currency)) + "</div>" : "") +
        '<p class="xsheet__sub">' + esc(t("order")) + " " + esc(order.orderNumber || "") + "</p>" +
        '<p class="xsheet__text">' + esc(t("shamcash_instructions")) + "</p>" +
        (img ? '<div class="qr-box"><img src="' + esc(img) + '" alt="Sham Cash QR" decoding="async" onerror="this.parentNode.remove()"></div>' : "") +
        row(t("shamcash_number"), sc.phone) +
        (sc.holderName ? '<div class="kv"><span>' + esc(t("account_name")) + "</span><strong>" + esc(sc.holderName) + "</strong></div>" : "") +
        field("sc-ref", t("shamcash_ref"), '<input class="inp" id="sc-ref" inputmode="numeric" dir="ltr" maxlength="40" placeholder="' + esc(t("optional")) + '">') +
        '<p class="form__err" data-err hidden></p>' +
        '<button type="button" class="btn" data-done>' + esc(t("i_have_paid")) + "</button>" +
        '<button type="button" class="btn btn--ghost" data-later>' + esc(laterLabel) + "</button>" +
        '<p class="xsheet__note">' + icon("info") + " " + esc(t("shamcash_store_confirms")) + "</p>");
      var result = { sent: false };
      openLayer("shamcash", function () { removeXsheet(wrap); resolve(result); });
      function finish(r) { result = r; closeTopLayer(); }
      $$("[data-copy]", wrap).forEach(function (b) {
        b.onclick = function () {
          var txt = b.getAttribute("data-copy");
          var ok = function () { b.innerHTML = icon("check") + " " + esc(t("copied")); };
          try { navigator.clipboard.writeText(txt).then(ok, function () { fallbackCopy(txt); ok(); }); } catch (e) { fallbackCopy(txt); ok(); }
        };
      });
      wrap.querySelector("[data-x]").onclick = function () { finish({ sent: false }); };
      wrap.querySelector("[data-later]").onclick = function () { finish({ sent: false }); };
      var doneBtn = wrap.querySelector("[data-done]"), errEl = wrap.querySelector("[data-err]");
      doneBtn.onclick = function () {
        var refv = (wrap.querySelector("#sc-ref").value || "").trim();
        if (!refv) { finish({ sent: true }); return; }
        setBusy(doneBtn, true);
        api("POST", "/api/payments/order/" + encodeURIComponent(order.orderId) + "/shamcash/reference", { trackingToken: order.trackingToken, reference: refv }, { auth: false, retries: 1 })
          .then(function () { finish({ sent: true }); })
          .catch(function (e) { setBusy(doneBtn, false); errEl.textContent = e.message || t("err_server"); errEl.hidden = false; });
      };
    });
  }
  function fallbackCopy(txt) {
    try { var ta = document.createElement("textarea"); ta.value = txt; ta.style.position = "fixed"; ta.style.opacity = "0"; document.body.appendChild(ta); ta.select(); document.execCommand("copy"); ta.remove(); } catch (e) { /* ignore */ }
  }

  /** A customer coming back from a 3-D Secure redirect. */
  function resumePaymentReturn() {
    var P = window.KassentaPay;
    if (!P) return;
    var ret = P.pendingReturn();
    if (!ret || !ret.paymentIntentId) return;
    P.clearReturn();
    toast(t("confirming_payment"));
    P.waitForSettlement(ret.paymentIntentId, { timeoutMs: 40000 }).then(function (r) {
      if (r.settled) toast(t("paid_thanks"), "success");
      else if (r.status === "pending") toast(t("payment_processing"));
      else toast(t("payment_not_completed"), "error");
      if (ret.trackingToken) navigate("track", [ret.trackingToken], { replace: true });
      else if (state.auth) navigate("orders", null, { replace: true });
    });
  }

  // ─── Broadcast waiting ────────────────────────────────────────────────────
  function renderWaiting(token) {
    var el = $("waiting-body");
    var pend = lsJson("bc_pending_broadcast", null);
    if (!token && pend) token = pend.token;
    if (!token) { navigate("orders", null, { replace: true }); return; }
    if (!pend || pend.token !== token) pend = { token: token };
    var stopped = false, timer = null, tick = null, lastStatus = "pending", data = null;
    state.cleanup = function () { stopped = true; clearTimeout(timer); clearInterval(tick); };
    function draw() {
      var st = data ? data.status : "pending";
      var exp = (data && data.expiresAt) || pend.expiresAt;
      var left = exp ? Math.max(0, Math.round((new Date(exp).getTime() - Date.now()) / 1000)) : null;
      var itemsHtml = (pend.items || []).map(function (it) {
        return '<div class="sum-line"><span><b>' + it.quantity + "×</b> " + esc(lineName(it)) + "</span><span>" + esc(it.tenantName || "") + "</span></div>";
      }).join("");
      var head;
      if (st === "pending") {
        head = '<div class="wait-hero"><div class="pulse">' + icon("bolt") + "</div><h2>" + esc(t("waiting_title")) + "</h2><p>" + esc(t("waiting_sub")) + "</p>" +
          (left != null ? '<div class="countdown">' + Math.floor(left / 60) + ":" + ("0" + (left % 60)).slice(-2) + "</div>" : "") + "</div>" +
          '<button type="button" class="btn btn--ghost" id="btn-bc-cancel">' + esc(t("cancel_request")) + "</button>";
      } else if (st === "claimed") {
        head = '<div class="wait-hero wait-hero--ok"><div class="pulse pulse--ok">' + icon("check") + "</div><h2>" + esc(t("claimed_title", { store: data.claimedByName || "" })) + "</h2><p>" + esc(t("claimed_sub")) + "</p>" + spinner() + "</div>";
      } else {
        head = '<div class="wait-hero wait-hero--bad"><div class="pulse pulse--bad">' + icon("x") + "</div><h2>" + esc(st === "cancelled" ? t("bc_cancelled") : t("bc_expired")) + "</h2><p>" + esc(t("bc_expired_sub")) + "</p></div>" +
          ((pend.items || []).length ? '<button type="button" class="btn" id="btn-bc-restore">' + esc(t("restore_cart")) + "</button>" : "") +
          '<a class="btn btn--ghost" href="#/restaurants">' + esc(t("browse_stores")) + "</a>";
      }
      el.innerHTML = head + (itemsHtml ? '<section class="panel summary"><h3 class="panel__title">' + icon("receipt") + " " + esc(t("your_items")) + "</h3>" + itemsHtml + "</section>" : "");
      var cb = $("btn-bc-cancel");
      if (cb) cb.onclick = function () {
        dialog.confirm(t("cancel_request_q"), "", { icon: "x", tone: "danger", okLabel: t("cancel_request"), cancelLabel: t("keep_waiting") }).then(function (ok) {
          if (!ok) return;
          setBusy(cb, true);
          api("POST", "/api/delivery/broadcast/" + encodeURIComponent(token) + "/cancel", {}, { auth: false })
            .then(function () { data = Object.assign({}, data || {}, { status: "cancelled" }); draw(); })
            .catch(function (e) { setBusy(cb, false); toast(e.message, "error"); poll(); });
        });
      };
      var rb = $("btn-bc-restore");
      if (rb) rb.onclick = function () {
        state.cart = (pend.items || []).slice(); state.cartMode = "broadcast"; saveCart(); refreshCartUi();
        lsDel("bc_pending_broadcast");
        navigate("cart", null, { replace: true });
      };
    }
    function poll() {
      if (stopped) return;
      api("GET", "/api/delivery/broadcast/" + encodeURIComponent(token), null, { auth: false, timeout: 12000 }).then(function (d) {
        if (stopped) return;
        data = d; lastStatus = d.status;
        if (d.status === "claimed" && d.trackingToken) {
          lsDel("bc_pending_broadcast");
          rememberOrder({ token: d.trackingToken, id: d.onlineOrderId, orderNumber: d.orderNumber, tenantId: d.claimedByTenantId,
                          storeName: d.claimedByName || "", currency: pend.currency, total: pend.total, status: "accepted", orderType: "delivery",
                          paymentMethod: "cash", createdAt: pend.createdAt || new Date().toISOString() });
          toast(t("claimed_title", { store: d.claimedByName || "" }), "success");
          navigate("track", [d.trackingToken], { replace: true });
          return;
        }
        if (d.status === "expired" || d.status === "cancelled") { draw(); return; }
        draw();
        timer = setTimeout(poll, 4000);
      }).catch(function (err) {
        if (stopped) return;
        if (err.status === 404) { lsDel("bc_pending_broadcast"); data = { status: "expired" }; draw(); return; }
        timer = setTimeout(poll, 6000);
      });
    }
    draw();
    tick = setInterval(function () { if (lastStatus === "pending") draw(); }, 1000);
    poll();
  }

  // ─── Orders ───────────────────────────────────────────────────────────────
  // The history endpoint only sees orders tied to the account's own tenant,
  // so the app keeps its own list of placed orders (tracking tokens) too.
  var TERMINAL = { delivered: 1, completed: 1, cancelled: 1, rejected: 1, picked_up: 1, refunded: 1 };
  function myOrders() { return lsJson("bc_my_orders", []); }
  function rememberOrder(o) {
    if (!o || !o.token) return;
    var list = myOrders().filter(function (x) { return x.token !== o.token; });
    var prev = myOrders().find(function (x) { return x.token === o.token; }) || {};
    list.unshift(Object.assign({}, prev, o));
    list.sort(function (a, b) { return new Date(b.createdAt || 0) - new Date(a.createdAt || 0); });
    lsSet("bc_my_orders", JSON.stringify(list.slice(0, 40)));
  }
  var remoteOrders = [];
  function mergedOrders() {
    var byToken = {};
    var out = [];
    myOrders().forEach(function (o) { byToken[o.token] = o; out.push(o); });
    remoteOrders.forEach(function (r) {
      if (!r.trackingToken) return;
      var o = byToken[r.trackingToken];
      var mapped = { token: r.trackingToken, id: r.id, orderNumber: r.orderNumber, tenantId: r.tenantId, total: r.totalAmount,
                     status: r.status, createdAt: r.createdAt, orderType: r.orderType, paymentMethod: r.paymentMethod };
      if (o) Object.assign(o, mapped, { storeName: o.storeName });
      else { byToken[r.trackingToken] = mapped; out.push(mapped); }
    });
    out.sort(function (a, b) { return new Date(b.createdAt || 0) - new Date(a.createdAt || 0); });
    return out;
  }
  var syncing = null;
  function syncOrders() {
    if (syncing) return syncing;
    var jobs = [];
    if (state.auth && !state.auth.isGuest) {
      jobs.push(api("GET", "/api/delivery/orders/history", null, { authRequired: true, timeout: 12000 })
        .then(function (list) { remoteOrders = Array.isArray(list) ? list : []; }).catch(function () { /* local list still shows */ }));
    }
    myOrders().filter(function (o) { return !TERMINAL[o.status]; }).slice(0, 8).forEach(function (o) {
      jobs.push(api("GET", "/api/delivery/orders/track/" + encodeURIComponent(o.token), null, { auth: false, timeout: 12000, retries: 0 })
        .then(function (d) { if (d && d.order) rememberOrder(orderSummaryFrom(d, o)); })
        .catch(function () { /* keep last known */ }));
    });
    syncing = Promise.all(jobs).then(function () { syncing = null; updateOrdersBadge(); });
    return syncing;
  }
  function orderSummaryFrom(d, prev) {
    var o = d.order, s = d.store || {};
    if (s.currency) rememberCurrency(o.tenantId, s.currency);
    return {
      token: o.trackingToken || (prev && prev.token), id: o.id, orderNumber: o.orderNumber, tenantId: o.tenantId,
      storeName: s.name || (prev && prev.storeName) || "", currency: (s.currency || curFor(o.tenantId)).toUpperCase(),
      total: o.totalAmount, status: o.status, orderType: o.orderType, paymentMethod: o.paymentMethod,
      createdAt: o.createdAt || (prev && prev.createdAt),
    };
  }
  function updateOrdersBadge() {
    var n = mergedOrders().filter(function (o) { return !TERMINAL[o.status]; }).length;
    var b = $("tab-badge-orders");
    if (b) { b.hidden = !n; b.textContent = String(n); }
  }
  function statusLabel(s, type) {
    s = s || "pending";
    if (s === "ready") return t(type === "pickup" ? "st_ready_pickup" : "st_ready");
    if ((s === "delivered" || s === "completed" || s === "picked_up") && type === "pickup") return t("st_picked_up");
    return t("st_" + s) === "st_" + s ? s.replace(/_/g, " ") : t("st_" + s);
  }
  function orderRow(o) {
    var cur = o.currency || curFor(o.tenantId);
    return '<button type="button" class="order-row" data-token="' + esc(o.token) + '">' +
      '<span class="order-row__ic">' + icon(TERMINAL[o.status] ? "receipt" : "delivery") + "</span>" +
      '<span class="order-row__body"><span class="order-row__title">' + esc(o.storeName || t("order")) + "</span>" +
      '<span class="order-row__sub">#' + esc(o.orderNumber || o.id || "") + " · " + esc(fmtDate(o.createdAt)) + "</span></span>" +
      '<span class="order-row__end"><span class="status-pill" data-s="' + esc(o.status || "pending") + '">' + esc(statusLabel(o.status, o.orderType)) + "</span>" +
      (o.total != null ? '<span class="order-row__total">' + esc(money(o.total, cur)) + "</span>" : "") + "</span></button>";
  }
  function bindOrderRows(root) {
    $$("[data-token]", root).forEach(function (n) { n.onclick = function () { navigate("track", [n.getAttribute("data-token")]); }; });
  }
  function renderOrders() {
    var el = $("orders-list");
    var pend = lsJson("bc_pending_broadcast", null);
    function draw() {
      var list = mergedOrders();
      var html = "";
      if (pend && pend.token) {
        html += '<button type="button" class="order-row order-row--live" id="btn-pending-bc"><span class="order-row__ic">' + icon("bolt") + "</span>" +
          '<span class="order-row__body"><span class="order-row__title">' + esc(t("quick_order")) + '</span><span class="order-row__sub">' + esc(t("waiting_title")) + "</span></span>" +
          '<span class="order-row__end">' + icon("next") + "</span></button>";
      }
      if (!list.length && !html) {
        el.innerHTML = emptyHtml("receipt", t("no_orders"), t("no_orders_sub"), '<a class="btn btn--soft btn--sm" href="#/restaurants">' + esc(t("browse_stores")) + "</a>");
        return;
      }
      var active = list.filter(function (o) { return !TERMINAL[o.status]; }), past = list.filter(function (o) { return TERMINAL[o.status]; });
      if (active.length) html += '<h3 class="list-title">' + esc(t("active_orders")) + "</h3>" + active.map(orderRow).join("");
      if (past.length) html += '<h3 class="list-title">' + esc(t("past_orders")) + "</h3>" + past.map(orderRow).join("");
      el.innerHTML = html;
      bindOrderRows(el);
      var pb = $("btn-pending-bc"); if (pb) pb.onclick = function () { navigate("waiting", [pend.token]); };
    }
    if (!mergedOrders().length) el.innerHTML = '<div class="skeleton skel-row"></div><div class="skeleton skel-row"></div>';
    else draw();
    syncOrders().then(function () { if (state.route === "orders") draw(); });
  }

  // ─── Tracking ─────────────────────────────────────────────────────────────
  var leafletP = null;
  function loadLeaflet() {
    if (window.L) return Promise.resolve(window.L);
    if (!leafletP) {
      leafletP = new Promise(function (resolve, reject) {
        var css = document.createElement("link"); css.rel = "stylesheet"; css.href = "https://unpkg.com/leaflet@1.9.4/dist/leaflet.css";
        document.head.appendChild(css);
        var s = document.createElement("script"); s.src = "https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"; s.async = true;
        s.onload = function () { window.L ? resolve(window.L) : reject(new Error("leaflet")); };
        s.onerror = function () { leafletP = null; reject(new Error("leaflet")); };
        document.head.appendChild(s);
      });
    }
    return withTimeout(leafletP, 10000);
  }
  function stepsFor(type) {
    return type === "pickup" ? ["pending", "accepted", "preparing", "ready", "delivered"] : ["pending", "accepted", "preparing", "ready", "on_way", "delivered"];
  }
  function renderTrack(token) {
    var el = $("track-content");
    if (!token) { navigate("orders", null, { replace: true }); return; }
    $("track-title").textContent = t("order");
    $("track-sub").textContent = "";
    $("btn-open-chat").hidden = true;
    var known = myOrders().find(function (o) { return o.token === token; });
    if (!el.dataset.token || el.dataset.token !== token) el.innerHTML = '<div class="skeleton skel-hero"></div><div class="skeleton skel-row"></div><div class="skeleton skel-row"></div>';
    el.dataset.token = token;
    var stopped = false, timer = null, lastSig = "";
    state.cleanup = function () { stopped = true; clearTimeout(timer); };
    function load(first) {
      api("GET", "/api/delivery/orders/track/" + encodeURIComponent(token), null, { auth: false, timeout: 15000 }).then(function (d) {
        if (stopped) return;
        var o = d.order, s = d.store || {};
        var cur = String(s.currency || curFor(o.tenantId)).toUpperCase();
        rememberCurrency(o.tenantId, cur);
        if (state.auth) rememberOrder(orderSummaryFrom(d, known));
        updateOrdersBadge();
        var sig = [o.status, o.paymentStatus, o.driverLat, o.driverLng].join("|");
        if (sig !== lastSig) { lastSig = sig; drawTrack(d, cur, token); }
        if (!TERMINAL[o.status]) timer = setTimeout(function () { load(false); }, 15000);
      }).catch(function (err) {
        if (stopped) return;
        if (first) { el.innerHTML = err.status === 404 ? emptyHtml("receipt", t("order_not_found"), "") : errorHtml(err); bindRetry(el, function () { load(true); }); }
        else timer = setTimeout(function () { load(false); }, 20000);
      });
    }
    load(true);
  }
  function drawTrack(d, cur, token) {
    var o = d.order, s = d.store || {}, el = $("track-content");
    var type = o.orderType || "delivery";
    $("track-title").textContent = t("order_n", { n: o.orderNumber || o.id });
    $("track-sub").textContent = [s.name, fmtDate(o.createdAt)].filter(Boolean).join(" · ");
    var chatBtn = $("btn-open-chat");
    chatBtn.hidden = !state.auth;
    chatBtn.onclick = function () { navigate("chat", [o.id]); };
    var st = o.status || "pending";
    var failed = st === "cancelled" || st === "rejected";
    var steps = stepsFor(type);
    var idx = steps.indexOf(st === "completed" || st === "picked_up" ? "delivered" : st);
    var html = '<section class="status-hero' + (failed ? " status-hero--bad" : TERMINAL[st] ? " status-hero--ok" : "") + '">' +
      '<span class="status-hero__ic">' + icon(failed ? "x" : TERMINAL[st] ? "check" : type === "pickup" ? "store" : "delivery") + "</span>" +
      '<div><h2>' + esc(statusLabel(st, type)) + "</h2><p>" + esc(failed ? t("track_failed_sub") : TERMINAL[st] ? t("track_done_sub") :
        (o.estimatedTime ? t("eta_min", { n: o.estimatedTime }) : t("track_live_sub"))) + "</p></div></section>";
    if (!failed) {
      html += '<section class="panel"><div class="pipeline">' + steps.map(function (k, i) {
        var cls = i < idx || (i === idx && TERMINAL[st]) ? "done" : i === idx ? "active" : "";
        return '<div class="step ' + cls + '"><span class="step__dot">' + (cls === "done" ? icon("check") : i + 1) + '</span><span class="step__label">' + esc(statusLabel(k, type)) + "</span></div>";
      }).join("") + "</div></section>";
    }
    html += '<div id="track-map" class="track-map" hidden></div>';
    // Payment
    var pm = o.paymentMethod || "cash";
    var paid = o.paymentStatus === "paid";
    var pmLabel = pm === "card" || pm === "online" ? t("pay_card") : pm === "shamcash" ? t("pay_shamcash") : t(type === "pickup" ? "pay_pickup" : "pay_cash");
    html += '<section class="panel"><h3 class="panel__title">' + icon("wallet") + " " + esc(t("payment")) + "</h3>" +
      '<div class="kv"><span>' + esc(pmLabel) + '</span><span class="status-pill" data-s="' + (paid ? "delivered" : "pending") + '">' + esc(paid ? t("paid") : t("unpaid")) + "</span></div>" +
      '<div id="track-pay-action"></div></section>';
    if (type === "delivery" && o.customerAddress) {
      html += '<section class="panel"><h3 class="panel__title">' + icon("pin") + " " + esc(t("delivery_address")) + "</h3><p class=\"addr\">" + esc(o.customerAddress) +
        (o.addressNotes ? "<br><small>" + esc(o.addressNotes) + "</small>" : "") + "</p></section>";
    }
    var items = Array.isArray(o.items) ? o.items : [];
    html += '<section class="panel summary"><h3 class="panel__title">' + icon("receipt") + " " + esc(t("order_details")) + "</h3>" +
      items.map(function (it) {
        var mods = parseJsonArr(it.modifiers);
        var extra = [it.variant].concat(mods.map(function (m) { return String(m).replace(/^[^:]*:\s*/, ""); })).filter(Boolean).join(" · ");
        return '<div class="sum-line"><span><b>' + (it.quantity || 1) + "×</b> " + esc(it.name || "") + (extra ? " <small>(" + esc(extra) + ")</small>" : "") +
          (it.notes ? "<br><small>" + esc(it.notes) + "</small>" : "") + "</span><span>" +
          esc(money(it.total != null ? it.total : num(it.unitPrice) * (it.quantity || 1), cur)) + "</span></div>";
      }).join("") +
      (o.subtotal != null ? '<div class="sum-row"><span>' + esc(t("subtotal")) + "</span><span>" + esc(money(o.subtotal, cur)) + "</span></div>" : "") +
      (num(o.discountAmount) > 0 ? '<div class="sum-row"><span>' + esc(t("discount")) + "</span><span>−" + esc(money(o.discountAmount, cur)) + "</span></div>" : "") +
      (type === "delivery" && o.deliveryFee != null ? '<div class="sum-row"><span>' + esc(t("delivery_fee")) + "</span><span>" + esc(num(o.deliveryFee) > 0 ? money(o.deliveryFee, cur) : t("free")) + "</span></div>" : "") +
      '<div class="sum-row sum-row--total"><span>' + esc(t("total")) + "</span><span>" + esc(money(o.totalAmount, cur)) + "</span></div></section>";
    if (s.supportPhone || s.slug) {
      html += '<div class="track-actions">' +
        (s.supportPhone ? '<a class="btn btn--soft" href="tel:' + esc(String(s.supportPhone).replace(/[^\d+]/g, "")) + '">' + icon("phone") + " " + esc(t("call_store")) + "</a>" : "") +
        (state.auth ? '<button type="button" class="btn btn--soft" id="btn-track-chat">' + icon("chat") + " " + esc(t("chat")) + "</button>" : "") +
        "</div>";
    }
    if (!state.auth) html += '<a class="btn btn--ghost" href="#/intro">' + esc(t("open_app_home")) + "</a>";
    $("track-content").innerHTML = html;
    var tc = $("btn-track-chat"); if (tc) tc.onclick = function () { navigate("chat", [o.id]); };
    // Pay again (card) or Sham Cash, while unpaid and still live
    if (!paid && !failed && !TERMINAL[st] && (pm === "card" || pm === "online" || pm === "shamcash")) {
      loadPayCfg(o.tenantId, cur).then(function (pay) {
        var box = $("track-pay-action"); if (!box) return;
        var order = { orderId: o.id, orderNumber: o.orderNumber, trackingToken: o.trackingToken || token, totalAmount: o.totalAmount, currency: cur, tenantId: o.tenantId, orderType: type };
        if ((pm === "card" || pm === "online") && pay.card) {
          box.innerHTML = '<button type="button" class="btn btn--sm" id="btn-pay-again">' + icon("card") + " " + esc(t("pay_now")) + "</button>";
          $("btn-pay-again").onclick = function () { openPaymentSheet(order).then(function (r) { if (r && r.paid) toast(t("paid_thanks"), "success"); renderTrack(token); }); };
        } else if (pm === "shamcash" && pay.shamcash) {
          box.innerHTML = '<button type="button" class="btn btn--sm" id="btn-pay-again">' + icon("qr") + " " + esc(t("pay_shamcash")) + "</button>";
          $("btn-pay-again").onclick = function () { openShamCashSheet(order, pay.shamcash).then(function (r) { if (r && r.sent) toast(t("shamcash_thanks"), "success"); }); };
        }
      });
    }
    // Map only when there are real coordinates; nothing is geocoded.
    var hasC = o.customerLat && o.customerLng, drv = d.driver || {};
    var dLat = o.driverLat || drv.lat || drv.latitude, dLng = o.driverLng || drv.lng || drv.longitude;
    if ((hasC || (dLat && dLng)) && !failed && !TERMINAL[st]) {
      loadLeaflet().then(function (L) {
        var box = $("track-map"); if (!box) return;
        box.hidden = false;
        var lat = num(hasC ? o.customerLat : dLat), lng = num(hasC ? o.customerLng : dLng);
        var map = L.map(box, { zoomControl: true, attributionControl: true }).setView([lat, lng], 14);
        L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", { attribution: "© OpenStreetMap", maxZoom: 19 }).addTo(map);
        if (hasC) L.marker([num(o.customerLat), num(o.customerLng)]).addTo(map);
        if (dLat && dLng) L.circleMarker([num(dLat), num(dLng)], { radius: 10, color: "#fff", weight: 3, fillColor: "#0A6E65", fillOpacity: 1 }).addTo(map);
      }).catch(function () { /* map is optional */ });
    }
  }

  // ─── Chat ─────────────────────────────────────────────────────────────────
  function renderChat(orderId) {
    if (!orderId) { navigate("orders", null, { replace: true }); return; }
    var box = $("chat-box");
    $("chat-title").textContent = t("chat_with_store");
    $("chat-sub").textContent = t("order_n", { n: orderId });
    box.innerHTML = '<div class="skeleton skel-row"></div><div class="skeleton skel-row"></div>';
    var stopped = false, timer = null, count = -1;
    state.cleanup = function () { stopped = true; clearTimeout(timer); };
    function load(first) {
      api("GET", "/api/customer/chats/order/" + encodeURIComponent(orderId), null, { authRequired: true, timeout: 12000, retries: first ? 1 : 0 })
        .then(function (d) {
          if (stopped) return;
          var msgs = (d && d.messages) || [];
          if (msgs.length !== count) {
            count = msgs.length;
            box.innerHTML = msgs.length ? '<div class="chat-msgs" id="chat-msgs">' + msgs.map(chatMsgHtml).join("") + "</div>"
              : emptyHtml("chat", t("no_messages"), t("no_messages_sub"));
            window.scrollTo(0, document.body.scrollHeight);
          }
          timer = setTimeout(function () { load(false); }, 6000);
        })
        .catch(function (err) {
          if (stopped) return;
          if (first) { box.innerHTML = errorHtml(err); bindRetry(box, function () { load(true); }); }
          else timer = setTimeout(function () { load(false); }, 10000);
        });
    }
    load(true);
    $("chat-input").onkeydown = function (e) { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); sendChat(orderId, function () { count = -1; clearTimeout(timer); load(false); }); } };
    $("btn-send-chat").onclick = function () { sendChat(orderId, function () { count = -1; clearTimeout(timer); load(false); }); };
  }
  function chatMsgHtml(m) {
    var mine = m.senderType === "customer";
    return '<div class="chat-msg ' + (mine ? "me" : "them") + '">' +
      (mine ? "" : '<strong class="chat-msg__who">' + esc(m.senderName || t("store")) + "</strong>") +
      esc(m.body) + '<span class="chat-msg__time">' + esc(fmtTime(m.createdAt)) + "</span></div>";
  }
  var sendingChat = false;
  function sendChat(orderId, after) {
    var inp = $("chat-input"), body = inp.value.trim();
    if (!body || sendingChat) return;
    sendingChat = true;
    var btn = $("btn-send-chat"); btn.disabled = true;
    api("POST", "/api/customer/chats/order/" + encodeURIComponent(orderId) + "/messages", { body: body }, { authRequired: true })
      .then(function () { inp.value = ""; after(); })
      .catch(function (err) { toast(err.message || t("err_server"), "error"); })
      .then(function () { sendingChat = false; btn.disabled = false; inp.focus(); });
  }

  // ─── Account ──────────────────────────────────────────────────────────────
  function renderAccount() {
    var el = $("account-body");
    var a = state.auth || {}, c = a.customer || {};
    var guest = !!a.isGuest;
    var phone = realPhone(c.phone);
    var html = '<section class="panel profile">' +
      '<span class="avatar">' + esc((c.name || "?").trim().slice(0, 1).toUpperCase()) + "</span>" +
      '<div class="profile__body"><strong>' + esc(c.name || t("guest")) + "</strong>" +
      "<span>" + esc(guest ? t("guest_session") : (phone ? prettyPhone(phone) : (c.email || ""))) + "</span></div>" +
      '<button type="button" class="icon-btn" id="btn-edit-name" aria-label="' + esc(t("edit_name")) + '">' + icon("edit") + "</button></section>";
    if (guest) {
      html += '<section class="panel cta-panel"><div><strong>' + esc(t("guest_upgrade_title")) + "</strong><span>" + esc(t("guest_upgrade_sub")) + "</span></div>" +
        '<button type="button" class="btn btn--sm" id="btn-guest-signin">' + esc(t("sign_in")) + "</button></section>";
    } else if (num(c.loyaltyPoints) > 0 || num(c.walletBalance) > 0) {
      // Points and wallet live on the platform account (CHF); only worth
      // showing once there is something in them.
      html += '<div class="stats">' +
        (num(c.loyaltyPoints) > 0 ? '<div class="stat"><span>' + esc(t("loyalty")) + "</span><strong>" + esc(t("n_points", { n: num(c.loyaltyPoints) })) + "</strong></div>" : "") +
        (num(c.walletBalance) > 0 ? '<div class="stat"><span>' + esc(t("wallet")) + "</span><strong>" + esc(money(c.walletBalance, DEFAULT_CURRENCY)) + "</strong></div>" : "") +
        "</div>";
    }
    html += '<h3 class="list-title">' + esc(t("preferences")) + "</h3>" +
      '<div class="panel menu-list">' +
        '<div class="menu-item"><span class="menu-item__ic">' + icon("globe") + '</span><span class="menu-item__label">' + esc(t("language")) + '</span><div class="seg seg--sm" id="account-lang"></div></div>' +
        '<label class="menu-item" for="theme-toggle"><span class="menu-item__ic" id="theme-icon">' + icon("sun") + '</span><span class="menu-item__label">' + esc(t("dark_mode")) +
          '<small id="theme-hint"></small></span><span class="switch"><input type="checkbox" id="theme-toggle" role="switch"><span class="switch__track"></span><span class="switch__thumb"></span></span></label>' +
      "</div>" +
      '<h3 class="list-title">' + esc(t("more")) + "</h3>" +
      '<div class="panel menu-list">' +
        '<a class="menu-item" href="#/orders"><span class="menu-item__ic">' + icon("receipt") + '</span><span class="menu-item__label">' + esc(t("my_orders")) + "</span>" + icon("next", "chev") + "</a>" +
        '<a class="menu-item" href="#/cart"><span class="menu-item__ic">' + icon("cart") + '</span><span class="menu-item__label">' + esc(t("cart")) + "</span>" + icon("next", "chev") + "</a>" +
        (IS_NATIVE ? "" : '<a class="menu-item" href="https://kassenta.com/" target="_blank" rel="noopener"><span class="menu-item__ic">' + icon("store") + '</span><span class="menu-item__label">' + esc(t("for_stores")) + "</span>" + icon("external", "chev") + "</a>") +
      "</div>" +
      '<button type="button" class="btn btn--ghost btn--danger-text" id="btn-logout">' + icon("logout") + " " + esc(t("logout")) + "</button>";
    el.innerHTML = html;
    renderLangSwitch($("account-lang"));
    initThemeControl();
    $("btn-logout").onclick = logout;
    var gs = $("btn-guest-signin");
    if (gs) gs.onclick = function () {
      // Leave the guest session; the phone / Google login creates the real account.
      state.auth = null; saveAuth(); setDepth(0);
      navigate("login", null, { replace: true });
    };
    $("btn-edit-name").onclick = function () {
      dialog.prompt(t("edit_name"), { value: c.name || "", placeholder: t("your_name_ph"), okLabel: t("save"), required: true, icon: "user", autocomplete: "name" })
        .then(function (name) {
          if (!name || name === c.name) return;
          state.auth.customer.name = name; saveAuth(); renderAccount();
          if (!guest) api("PUT", "/api/delivery/auth/me", { name: name }, { authRequired: true }).then(function () { toast(t("saved"), "success"); })
            .catch(function (e) { toast(e.message || t("err_server"), "error"); });
        });
    };
    // Refresh points / wallet from the server (the login response is a snapshot).
    if (!guest && !renderAccount.__fetching) {
      renderAccount.__fetching = true;
      api("GET", "/api/delivery/auth/me", null, { authRequired: true, timeout: 10000 }).then(function (d) {
        var cc = d && d.customer; if (!cc || !state.auth) return;
        var keep = state.auth.customer || {};
        state.auth.customer = { id: cc.id, name: cc.name || keep.name, phone: cc.phone || keep.phone, email: cc.email || keep.email,
          loyaltyPoints: cc.loyaltyPoints, loyaltyTier: cc.loyaltyTier, walletBalance: cc.walletBalance };
        saveAuth();
        if (state.route === "account") renderAccount();
      }).catch(function () { /* keep snapshot */ }).then(function () { setTimeout(function () { renderAccount.__fetching = false; }, 30000); });
    }
  }

  // ─── Theme ────────────────────────────────────────────────────────────────
  var THEME_KEY = "kassenta_theme";
  function storedTheme() { var v = lsGet(THEME_KEY); return v === "dark" || v === "light" ? v : null; }
  function activeTheme() {
    var ex = document.documentElement.getAttribute("data-theme");
    if (ex === "dark" || ex === "light") return ex;
    try { return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light"; } catch (e) { return "light"; }
  }
  function syncThemeChrome() {
    var mode = activeTheme();
    var color = mode === "dark" ? "#040E32" : "#F2F6F5";
    $$('meta[name="theme-color"]').forEach(function (m) { m.remove(); });
    var m = document.createElement("meta"); m.name = "theme-color"; m.content = color; document.head.appendChild(m);
    if (IS_NATIVE) { try { window.ReactNativeWebView.postMessage(JSON.stringify({ type: "theme", mode: mode, color: color })); } catch (e) { /* old app */ } }
  }
  function applyTheme(mode) {
    document.documentElement.setAttribute("data-theme", mode);
    lsSet(THEME_KEY, mode);
    syncThemeChrome();
    initThemeControl();
  }
  function initThemeControl() {
    var box = $("theme-toggle"); if (!box) return;
    var mode = activeTheme();
    box.checked = mode === "dark";
    var hint = $("theme-hint"); if (hint) hint.textContent = mode === "dark" ? t("dark_on") : t("light_on");
    var ic = $("theme-icon"); if (ic) ic.innerHTML = icon(mode === "dark" ? "moon" : "sun");
    box.onchange = function () { applyTheme(box.checked ? "dark" : "light"); };
  }

  // ─── Wiring ───────────────────────────────────────────────────────────────
  document.addEventListener("click", function (e) {
    var tab = e.target.closest("[data-tab]");
    if (tab && tab.classList.contains("tab")) { e.preventDefault(); tabNavigate(tab.getAttribute("data-tab")); return; }
    var nb = e.target.closest("[data-nav]");
    if (nb) { e.preventDefault(); navigate(nb.getAttribute("data-nav")); return; }
    var bk = e.target.closest("[data-back]");
    if (bk) { e.preventDefault(); goBack(bk.getAttribute("data-back")); }
  });
  $("btn-intro-phone").onclick = function () { otp.step = "phone"; navigate("login"); };
  $("btn-go-guest").onclick = handleGuest;
  $("home-search").onclick = function () { state.focusSearch = true; navigate("broadcast"); };
  $("cart-fab").onclick = function () { navigate("cart"); };
  $("btn-cart-checkout").onclick = function () { navigate("checkout"); };
  $("btn-place").onclick = placeOrder;
  $("cust-overlay").addEventListener("click", function () { if (sheet) closeTopLayer(); });
  $("cust-close").addEventListener("click", function () { if (sheet) closeTopLayer(); });
  $("cust-add").addEventListener("click", commitSheet);
  document.addEventListener("keydown", function (e) { if (e.key === "Escape" && sheet && layers.length && layers[layers.length - 1].name === "sheet") closeTopLayer(); });
  if (IS_NATIVE) { document.documentElement.classList.add("is-native"); $$(".web-only").forEach(function (n) { n.remove(); }); }
  bindGoogleButtons();

  // Google's OAuth redirect URI is /customer/login.
  if (/^\/(api\/)?customer\/login\/?$/.test(location.pathname) && location.hash.indexOf("#/login") !== 0) {
    location.replace(location.pathname + location.search + "#/login");
  }
  try {
    var mq = window.matchMedia("(prefers-color-scheme: dark)");
    var onOs = function () { if (!storedTheme()) { syncThemeChrome(); initThemeControl(); } };
    if (mq.addEventListener) mq.addEventListener("change", onOs); else if (mq.addListener) mq.addListener(onOs);
  } catch (e) { /* ignore */ }

  // ─── Boot ─────────────────────────────────────────────────────────────────
  if (state.cart.length) autoLangFor(cartCurrency());
  applyStaticI18n();
  syncThemeChrome();
  refreshCartUi();
  updateOrdersBadge();
  if (!location.hash || location.hash === "#" || location.hash === "#/") {
    navigate(state.auth ? "home" : "intro", null, { replace: true });
  } else {
    applyRoute();
  }
  resumePaymentReturn();
  document.documentElement.classList.add("app-ready");
})();
