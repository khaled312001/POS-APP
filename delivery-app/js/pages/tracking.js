/**
 * tracking.js — /order/:slug/track/:token (old links) hands over to the
 * standalone tracking page /track/:token, which is what WhatsApp messages
 * link to and what works best on slow connections.
 */
window.pages = window.pages || {};

pages.tracking = {
  render(params, container) {
    container.innerHTML = ui.spinner();
    if (params && params.token) location.replace(kx.trackUrl(params.token));
    else router.replace("account");
  },
};
