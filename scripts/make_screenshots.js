const sharp = require('sharp');
const fs = require('fs');

if (!fs.existsSync('assets/images/screenshots')) {
  fs.mkdirSync('assets/images/screenshots', { recursive: true });
}

const C = {
  BG: '#0A0E27', SURFACE: '#0D1433', ACCENT: '#2FD3C6',
  PRIMARY: '#6B4FFF', TEXT: '#E8EAED', TEXT2: '#8892B0',
  CARD: '#131B3A', BORDER: '#1E2A4A', DANGER: '#FF4757',
  SUCCESS: '#22C55E', WARNING: '#F59E0B'
};

async function save(svg, file) {
  await sharp(Buffer.from(svg)).png().toFile(file);
  console.log('Created:', file);
}

const s1 = `<svg width="1080" height="1920" xmlns="http://www.w3.org/2000/svg">
<defs>
  <linearGradient id="acc" x1="0%" y1="0%" x2="100%" y2="0%">
    <stop offset="0%" stop-color="${C.ACCENT}"/>
    <stop offset="100%" stop-color="${C.PRIMARY}"/>
  </linearGradient>
</defs>
<rect width="1080" height="1920" fill="${C.BG}"/>
<rect width="1080" height="60" fill="#080B1E"/>
<text x="60" y="42" font-family="Arial" font-size="24" fill="${C.TEXT2}">9:41</text>
<rect width="1080" height="90" y="60" fill="${C.SURFACE}"/>
<rect width="1080" height="1.5" y="149" fill="${C.BORDER}"/>
<text x="60" y="118" font-family="Arial" font-size="34" font-weight="700" fill="${C.TEXT}">Point of Sale</text>
<rect x="30" y="165" width="1020" height="66" rx="16" fill="${C.CARD}" stroke="${C.BORDER}" stroke-width="1.5"/>
<text x="70" y="206" font-family="Arial" font-size="26" fill="${C.TEXT2}">Search products...</text>
<rect x="30" y="252" width="120" height="46" rx="23" fill="${C.ACCENT}"/>
<text x="90" y="280" font-family="Arial" font-size="22" font-weight="700" fill="#fff" text-anchor="middle">All</text>
<rect x="166" y="252" width="160" height="46" rx="23" fill="${C.CARD}" stroke="${C.BORDER}" stroke-width="1"/>
<text x="246" y="280" font-family="Arial" font-size="22" fill="${C.TEXT2}" text-anchor="middle">Drinks</text>
<rect x="342" y="252" width="150" height="46" rx="23" fill="${C.CARD}" stroke="${C.BORDER}" stroke-width="1"/>
<text x="417" y="280" font-family="Arial" font-size="22" fill="${C.TEXT2}" text-anchor="middle">Food</text>
<rect x="508" y="252" width="180" height="46" rx="23" fill="${C.CARD}" stroke="${C.BORDER}" stroke-width="1"/>
<text x="598" y="280" font-family="Arial" font-size="22" fill="${C.TEXT2}" text-anchor="middle">Desserts</text>
<rect x="30" y="318" width="498" height="210" rx="18" fill="${C.CARD}" stroke="${C.BORDER}" stroke-width="1"/>
<rect x="30" y="318" width="498" height="105" rx="18" fill="${C.PRIMARY}20"/>
<text x="279" y="395" font-family="Arial" font-size="56" text-anchor="middle">&#9749;</text>
<text x="58" y="455" font-family="Arial" font-size="24" font-weight="700" fill="${C.TEXT}">Espresso</text>
<text x="58" y="488" font-family="Arial" font-size="22" fill="${C.ACCENT}" font-weight="700">CHF 3.50</text>
<rect x="440" y="454" width="60" height="40" rx="12" fill="${C.ACCENT}"/>
<text x="470" y="480" font-family="Arial" font-size="28" fill="#fff" text-anchor="middle" font-weight="700">+</text>
<rect x="552" y="318" width="498" height="210" rx="18" fill="${C.CARD}" stroke="${C.BORDER}" stroke-width="1"/>
<rect x="552" y="318" width="498" height="105" rx="18" fill="${C.ACCENT}12"/>
<text x="801" y="395" font-family="Arial" font-size="56" text-anchor="middle">&#129360;</text>
<text x="580" y="455" font-family="Arial" font-size="24" font-weight="700" fill="${C.TEXT}">Croissant</text>
<text x="580" y="488" font-family="Arial" font-size="22" fill="${C.ACCENT}" font-weight="700">CHF 4.20</text>
<rect x="962" y="454" width="60" height="40" rx="12" fill="${C.ACCENT}"/>
<text x="992" y="480" font-family="Arial" font-size="28" fill="#fff" text-anchor="middle" font-weight="700">+</text>
<rect x="30" y="548" width="498" height="210" rx="18" fill="${C.CARD}" stroke="${C.BORDER}" stroke-width="1"/>
<rect x="30" y="548" width="498" height="105" rx="18" fill="${C.SUCCESS}15"/>
<text x="279" y="625" font-family="Arial" font-size="56" text-anchor="middle">&#127861;</text>
<text x="58" y="685" font-family="Arial" font-size="24" font-weight="700" fill="${C.TEXT}">Green Tea</text>
<text x="58" y="718" font-family="Arial" font-size="22" fill="${C.ACCENT}" font-weight="700">CHF 2.80</text>
<rect x="440" y="684" width="60" height="40" rx="12" fill="${C.ACCENT}"/>
<text x="470" y="710" font-family="Arial" font-size="28" fill="#fff" text-anchor="middle" font-weight="700">+</text>
<rect x="552" y="548" width="498" height="210" rx="18" fill="${C.CARD}" stroke="${C.BORDER}" stroke-width="1"/>
<rect x="552" y="548" width="498" height="105" rx="18" fill="${C.DANGER}12"/>
<text x="801" y="625" font-family="Arial" font-size="56" text-anchor="middle">&#127774;</text>
<text x="580" y="685" font-family="Arial" font-size="24" font-weight="700" fill="${C.TEXT}">Cupcake</text>
<text x="580" y="718" font-family="Arial" font-size="22" fill="${C.ACCENT}" font-weight="700">CHF 5.50</text>
<rect x="962" y="684" width="60" height="40" rx="12" fill="${C.ACCENT}"/>
<text x="992" y="710" font-family="Arial" font-size="28" fill="#fff" text-anchor="middle" font-weight="700">+</text>
<rect x="30" y="778" width="498" height="210" rx="18" fill="${C.CARD}" stroke="${C.BORDER}" stroke-width="1"/>
<rect x="30" y="778" width="498" height="105" rx="18" fill="${C.WARNING}15"/>
<text x="279" y="855" font-family="Arial" font-size="56" text-anchor="middle">&#127822;</text>
<text x="58" y="915" font-family="Arial" font-size="24" font-weight="700" fill="${C.TEXT}">Lemonade</text>
<text x="58" y="948" font-family="Arial" font-size="22" fill="${C.ACCENT}" font-weight="700">CHF 3.90</text>
<rect x="440" y="914" width="60" height="40" rx="12" fill="${C.ACCENT}"/>
<text x="470" y="940" font-family="Arial" font-size="28" fill="#fff" text-anchor="middle" font-weight="700">+</text>
<rect x="552" y="778" width="498" height="210" rx="18" fill="${C.CARD}" stroke="${C.BORDER}" stroke-width="1"/>
<rect x="552" y="778" width="498" height="105" rx="18" fill="${C.PRIMARY}12"/>
<text x="801" y="855" font-family="Arial" font-size="56" text-anchor="middle">&#127803;</text>
<text x="580" y="915" font-family="Arial" font-size="24" font-weight="700" fill="${C.TEXT}">Garden Salad</text>
<text x="580" y="948" font-family="Arial" font-size="22" fill="${C.ACCENT}" font-weight="700">CHF 8.90</text>
<rect x="962" y="914" width="60" height="40" rx="12" fill="${C.ACCENT}"/>
<text x="992" y="940" font-family="Arial" font-size="28" fill="#fff" text-anchor="middle" font-weight="700">+</text>
<rect x="0" y="1060" width="1080" height="740" rx="28" fill="${C.SURFACE}"/>
<rect x="0" y="1060" width="1080" height="2" fill="${C.BORDER}"/>
<text x="60" y="1120" font-family="Arial" font-size="30" font-weight="700" fill="${C.TEXT}">Cart  (2 items)</text>
<rect x="30" y="1140" width="1020" height="78" rx="14" fill="${C.CARD}"/>
<text x="60" y="1186" font-family="Arial" font-size="26" fill="${C.TEXT}">Espresso</text>
<text x="790" y="1186" font-family="Arial" font-size="26" fill="${C.ACCENT}" font-weight="700">CHF 3.50</text>
<text x="960" y="1186" font-family="Arial" font-size="26" fill="${C.TEXT2}" text-anchor="middle">x1</text>
<rect x="30" y="1232" width="1020" height="78" rx="14" fill="${C.CARD}"/>
<text x="60" y="1278" font-family="Arial" font-size="26" fill="${C.TEXT}">Croissant</text>
<text x="790" y="1278" font-family="Arial" font-size="26" fill="${C.ACCENT}" font-weight="700">CHF 8.40</text>
<text x="960" y="1278" font-family="Arial" font-size="26" fill="${C.TEXT2}" text-anchor="middle">x2</text>
<line x1="30" y1="1332" x2="1050" y2="1332" stroke="${C.BORDER}" stroke-width="1"/>
<text x="60" y="1380" font-family="Arial" font-size="26" fill="${C.TEXT2}">Subtotal</text>
<text x="1020" y="1380" font-family="Arial" font-size="26" fill="${C.TEXT}" text-anchor="end">CHF 11.90</text>
<text x="60" y="1426" font-family="Arial" font-size="26" fill="${C.TEXT2}">Tax (7.7%)</text>
<text x="1020" y="1426" font-family="Arial" font-size="26" fill="${C.TEXT}" text-anchor="end">CHF 0.92</text>
<line x1="30" y1="1456" x2="1050" y2="1456" stroke="${C.BORDER}" stroke-width="1.5"/>
<text x="60" y="1508" font-family="Arial" font-size="34" font-weight="800" fill="${C.TEXT}">Total</text>
<text x="1020" y="1508" font-family="Arial" font-size="38" font-weight="800" fill="${C.ACCENT}" text-anchor="end">CHF 12.82</text>
<rect x="30" y="1534" width="1020" height="86" rx="20" fill="url(#acc)"/>
<text x="540" y="1587" font-family="Arial" font-size="30" font-weight="800" fill="#fff" text-anchor="middle">Checkout  —  CHF 12.82</text>
<rect x="0" y="1800" width="1080" height="120" fill="#080B1E"/>
<rect x="0" y="1800" width="1080" height="1.5" fill="${C.BORDER}"/>
<text x="108" y="1868" font-family="Arial" font-size="20" fill="${C.ACCENT}" text-anchor="middle">POS</text>
<text x="324" y="1868" font-family="Arial" font-size="20" fill="${C.TEXT2}" text-anchor="middle">Products</text>
<text x="540" y="1868" font-family="Arial" font-size="20" fill="${C.TEXT2}" text-anchor="middle">Customers</text>
<text x="756" y="1868" font-family="Arial" font-size="20" fill="${C.TEXT2}" text-anchor="middle">Reports</text>
<text x="972" y="1868" font-family="Arial" font-size="20" fill="${C.TEXT2}" text-anchor="middle">More</text>
</svg>`;

const s2 = `<svg width="1080" height="1920" xmlns="http://www.w3.org/2000/svg">
<defs>
  <linearGradient id="acc" x1="0%" y1="0%" x2="100%" y2="0%">
    <stop offset="0%" stop-color="${C.ACCENT}"/>
    <stop offset="100%" stop-color="${C.PRIMARY}"/>
  </linearGradient>
</defs>
<rect width="1080" height="1920" fill="${C.BG}"/>
<rect width="1080" height="60" fill="#080B1E"/>
<text x="60" y="42" font-family="Arial" font-size="24" fill="${C.TEXT2}">9:41</text>
<rect width="1080" height="90" y="60" fill="${C.SURFACE}"/>
<rect width="1080" height="1.5" y="149" fill="${C.BORDER}"/>
<text x="60" y="118" font-family="Arial" font-size="34" font-weight="700" fill="${C.TEXT}">Reports &amp; Analytics</text>
<rect x="30" y="170" width="300" height="44" rx="22" fill="${C.ACCENT}"/>
<text x="180" y="197" font-family="Arial" font-size="20" font-weight="700" fill="#fff" text-anchor="middle">Today</text>
<rect x="346" y="170" width="160" height="44" rx="22" fill="${C.CARD}" stroke="${C.BORDER}" stroke-width="1"/>
<text x="426" y="197" font-family="Arial" font-size="20" fill="${C.TEXT2}" text-anchor="middle">Week</text>
<rect x="522" y="170" width="160" height="44" rx="22" fill="${C.CARD}" stroke="${C.BORDER}" stroke-width="1"/>
<text x="602" y="197" font-family="Arial" font-size="20" fill="${C.TEXT2}" text-anchor="middle">Month</text>
<rect x="30" y="234" width="488" height="200" rx="18" fill="${C.CARD}" stroke="${C.BORDER}" stroke-width="1"/>
<rect x="30" y="234" width="488" height="5" rx="3" fill="url(#acc)"/>
<text x="274" y="294" font-family="Arial" font-size="22" fill="${C.TEXT2}" text-anchor="middle">Today Revenue</text>
<text x="274" y="362" font-family="Arial" font-size="52" font-weight="900" fill="${C.ACCENT}" text-anchor="middle">CHF 842</text>
<text x="274" y="402" font-family="Arial" font-size="20" fill="${C.SUCCESS}" text-anchor="middle">+12.4% vs yesterday</text>
<rect x="562" y="234" width="488" height="200" rx="18" fill="${C.CARD}" stroke="${C.BORDER}" stroke-width="1"/>
<rect x="562" y="234" width="488" height="5" rx="3" fill="${C.SUCCESS}"/>
<text x="806" y="294" font-family="Arial" font-size="22" fill="${C.TEXT2}" text-anchor="middle">Transactions</text>
<text x="806" y="362" font-family="Arial" font-size="52" font-weight="900" fill="${C.SUCCESS}" text-anchor="middle">47</text>
<text x="806" y="402" font-family="Arial" font-size="20" fill="${C.ACCENT}" text-anchor="middle">Avg CHF 17.91</text>
<rect x="30" y="454" width="488" height="200" rx="18" fill="${C.CARD}" stroke="${C.BORDER}" stroke-width="1"/>
<rect x="30" y="454" width="488" height="5" rx="3" fill="${C.WARNING}"/>
<text x="274" y="514" font-family="Arial" font-size="22" fill="${C.TEXT2}" text-anchor="middle">Items Sold</text>
<text x="274" y="582" font-family="Arial" font-size="52" font-weight="900" fill="${C.WARNING}" text-anchor="middle">124</text>
<text x="274" y="622" font-family="Arial" font-size="20" fill="${C.TEXT2}" text-anchor="middle">across 47 orders</text>
<rect x="562" y="454" width="488" height="200" rx="18" fill="${C.CARD}" stroke="${C.BORDER}" stroke-width="1"/>
<rect x="562" y="454" width="488" height="5" rx="3" fill="${C.DANGER}"/>
<text x="806" y="514" font-family="Arial" font-size="22" fill="${C.TEXT2}" text-anchor="middle">New Customers</text>
<text x="806" y="582" font-family="Arial" font-size="52" font-weight="900" fill="${C.DANGER}" text-anchor="middle">9</text>
<text x="806" y="622" font-family="Arial" font-size="20" fill="${C.TEXT2}" text-anchor="middle">38 total today</text>
<text x="60" y="706" font-family="Arial" font-size="28" font-weight="700" fill="${C.TEXT}">Revenue This Week</text>
<rect x="30" y="724" width="1020" height="310" rx="18" fill="${C.CARD}" stroke="${C.BORDER}" stroke-width="1"/>
<line x1="80" y1="990" x2="1000" y2="990" stroke="${C.BORDER}" stroke-width="1"/>
<text x="110" y="1018" font-family="Arial" font-size="18" fill="${C.TEXT2}">Mon</text>
<text x="245" y="1018" font-family="Arial" font-size="18" fill="${C.TEXT2}">Tue</text>
<text x="380" y="1018" font-family="Arial" font-size="18" fill="${C.TEXT2}">Wed</text>
<text x="515" y="1018" font-family="Arial" font-size="18" fill="${C.TEXT2}">Thu</text>
<text x="650" y="1018" font-family="Arial" font-size="18" fill="${C.TEXT2}">Fri</text>
<text x="785" y="1018" font-family="Arial" font-size="18" fill="${C.TEXT2}">Sat</text>
<text x="920" y="1018" font-family="Arial" font-size="18" fill="${C.TEXT2}">Sun</text>
<rect x="90" y="890" width="80" height="100" rx="8" fill="${C.PRIMARY}60"/>
<rect x="225" y="850" width="80" height="140" rx="8" fill="${C.PRIMARY}60"/>
<rect x="360" y="810" width="80" height="180" rx="8" fill="${C.ACCENT}80"/>
<rect x="495" y="830" width="80" height="160" rx="8" fill="${C.PRIMARY}60"/>
<rect x="630" y="760" width="80" height="230" rx="8" fill="${C.ACCENT}"/>
<rect x="765" y="860" width="80" height="130" rx="8" fill="${C.PRIMARY}60"/>
<rect x="900" y="870" width="80" height="120" rx="8" fill="${C.PRIMARY}60"/>
<text x="60" y="1088" font-family="Arial" font-size="28" font-weight="700" fill="${C.TEXT}">Top Products</text>
<rect x="30" y="1106" width="1020" height="72" rx="14" fill="${C.CARD}"/>
<rect x="30" y="1106" width="5" height="72" rx="2" fill="${C.ACCENT}"/>
<text x="60" y="1149" font-family="Arial" font-size="24" font-weight="700" fill="${C.TEXT}">1.  Espresso</text>
<text x="790" y="1149" font-family="Arial" font-size="24" fill="${C.ACCENT}">CHF 248.50</text>
<text x="1020" y="1149" font-family="Arial" font-size="22" fill="${C.TEXT2}" text-anchor="end">71 sold</text>
<rect x="30" y="1190" width="1020" height="72" rx="14" fill="${C.CARD}"/>
<rect x="30" y="1190" width="5" height="72" rx="2" fill="${C.PRIMARY}"/>
<text x="60" y="1233" font-family="Arial" font-size="24" font-weight="700" fill="${C.TEXT}">2.  Croissant</text>
<text x="790" y="1233" font-family="Arial" font-size="24" fill="${C.ACCENT}">CHF 193.20</text>
<text x="1020" y="1233" font-family="Arial" font-size="22" fill="${C.TEXT2}" text-anchor="end">46 sold</text>
<rect x="30" y="1274" width="1020" height="72" rx="14" fill="${C.CARD}"/>
<rect x="30" y="1274" width="5" height="72" rx="2" fill="${C.WARNING}"/>
<text x="60" y="1317" font-family="Arial" font-size="24" font-weight="700" fill="${C.TEXT}">3.  Lemonade</text>
<text x="790" y="1317" font-family="Arial" font-size="24" fill="${C.ACCENT}">CHF 152.10</text>
<text x="1020" y="1317" font-family="Arial" font-size="22" fill="${C.TEXT2}" text-anchor="end">39 sold</text>
<rect x="30" y="1358" width="1020" height="72" rx="14" fill="${C.CARD}"/>
<rect x="30" y="1358" width="5" height="72" rx="2" fill="${C.SUCCESS}"/>
<text x="60" y="1401" font-family="Arial" font-size="24" font-weight="700" fill="${C.TEXT}">4.  Green Tea</text>
<text x="790" y="1401" font-family="Arial" font-size="24" fill="${C.ACCENT}">CHF 112.00</text>
<text x="1020" y="1401" font-family="Arial" font-size="22" fill="${C.TEXT2}" text-anchor="end">40 sold</text>
<rect x="0" y="1800" width="1080" height="120" fill="#080B1E"/>
<rect x="0" y="1800" width="1080" height="1.5" fill="${C.BORDER}"/>
<text x="108" y="1868" font-family="Arial" font-size="20" fill="${C.TEXT2}" text-anchor="middle">POS</text>
<text x="324" y="1868" font-family="Arial" font-size="20" fill="${C.TEXT2}" text-anchor="middle">Products</text>
<text x="540" y="1868" font-family="Arial" font-size="20" fill="${C.TEXT2}" text-anchor="middle">Customers</text>
<text x="756" y="1868" font-family="Arial" font-size="20" fill="${C.ACCENT}" text-anchor="middle">Reports</text>
<text x="972" y="1868" font-family="Arial" font-size="20" fill="${C.TEXT2}" text-anchor="middle">More</text>
</svg>`;

const s3 = `<svg width="1080" height="1920" xmlns="http://www.w3.org/2000/svg">
<defs>
  <linearGradient id="acc" x1="0%" y1="0%" x2="100%" y2="0%">
    <stop offset="0%" stop-color="${C.ACCENT}"/>
    <stop offset="100%" stop-color="${C.PRIMARY}"/>
  </linearGradient>
</defs>
<rect width="1080" height="1920" fill="${C.BG}"/>
<rect width="1080" height="60" fill="#080B1E"/>
<text x="60" y="42" font-family="Arial" font-size="24" fill="${C.TEXT2}">9:41</text>
<rect width="1080" height="90" y="60" fill="${C.SURFACE}"/>
<rect width="1080" height="1.5" y="149" fill="${C.BORDER}"/>
<text x="60" y="118" font-family="Arial" font-size="34" font-weight="700" fill="${C.TEXT}">Online Orders</text>
<rect x="820" y="76" width="220" height="56" rx="28" fill="${C.DANGER}18" stroke="${C.DANGER}50" stroke-width="1"/>
<text x="930" y="110" font-family="Arial" font-size="20" fill="${C.DANGER}" font-weight="700" text-anchor="middle">3 Pending</text>
<rect x="30" y="168" width="220" height="44" rx="22" fill="${C.DANGER}"/>
<text x="140" y="195" font-family="Arial" font-size="20" font-weight="700" fill="#fff" text-anchor="middle">Pending (3)</text>
<rect x="266" y="168" width="230" height="44" rx="22" fill="${C.CARD}" stroke="${C.BORDER}" stroke-width="1"/>
<text x="381" y="195" font-family="Arial" font-size="20" fill="${C.TEXT2}" text-anchor="middle">Accepted (5)</text>
<rect x="512" y="168" width="250" height="44" rx="22" fill="${C.CARD}" stroke="${C.BORDER}" stroke-width="1"/>
<text x="637" y="195" font-family="Arial" font-size="20" fill="${C.TEXT2}" text-anchor="middle">Completed (28)</text>
<rect x="30" y="228" width="1020" height="220" rx="18" fill="${C.CARD}" stroke="${C.DANGER}50" stroke-width="2"/>
<rect x="30" y="228" width="1020" height="5" rx="3" fill="${C.DANGER}"/>
<text x="60" y="274" font-family="Arial" font-size="24" font-weight="700" fill="${C.TEXT}">Order #2847</text>
<rect x="820" y="242" width="210" height="44" rx="22" fill="${C.DANGER}20"/>
<text x="925" y="270" font-family="Arial" font-size="20" fill="${C.DANGER}" font-weight="700" text-anchor="middle">PENDING</text>
<text x="60" y="314" font-family="Arial" font-size="22" fill="${C.TEXT2}">Table 4  -  Dine-in  -  3 items</text>
<text x="60" y="380" font-family="Arial" font-size="28" font-weight="700" fill="${C.ACCENT}">CHF 28.90</text>
<rect x="616" y="350" width="200" height="50" rx="14" fill="${C.DANGER}18" stroke="${C.DANGER}40" stroke-width="1"/>
<text x="716" y="381" font-family="Arial" font-size="20" fill="${C.DANGER}" text-anchor="middle">Decline</text>
<rect x="834" y="350" width="210" height="50" rx="14" fill="${C.SUCCESS}"/>
<text x="939" y="381" font-family="Arial" font-size="20" fill="#fff" font-weight="700" text-anchor="middle">Accept</text>
<rect x="30" y="464" width="1020" height="220" rx="18" fill="${C.CARD}" stroke="${C.DANGER}50" stroke-width="2"/>
<rect x="30" y="464" width="1020" height="5" rx="3" fill="${C.DANGER}"/>
<text x="60" y="510" font-family="Arial" font-size="24" font-weight="700" fill="${C.TEXT}">Order #2846</text>
<rect x="820" y="478" width="210" height="44" rx="22" fill="${C.DANGER}20"/>
<text x="925" y="506" font-family="Arial" font-size="20" fill="${C.DANGER}" font-weight="700" text-anchor="middle">PENDING</text>
<text x="60" y="550" font-family="Arial" font-size="22" fill="${C.TEXT2}">Delivery  -  2 items</text>
<text x="60" y="616" font-family="Arial" font-size="28" font-weight="700" fill="${C.ACCENT}">CHF 14.30</text>
<rect x="616" y="586" width="200" height="50" rx="14" fill="${C.DANGER}18" stroke="${C.DANGER}40" stroke-width="1"/>
<text x="716" y="617" font-family="Arial" font-size="20" fill="${C.DANGER}" text-anchor="middle">Decline</text>
<rect x="834" y="586" width="210" height="50" rx="14" fill="${C.SUCCESS}"/>
<text x="939" y="617" font-family="Arial" font-size="20" fill="#fff" font-weight="700" text-anchor="middle">Accept</text>
<rect x="30" y="700" width="1020" height="200" rx="18" fill="${C.CARD}" stroke="${C.WARNING}50" stroke-width="1.5"/>
<rect x="30" y="700" width="1020" height="5" rx="3" fill="${C.WARNING}"/>
<text x="60" y="746" font-family="Arial" font-size="24" font-weight="700" fill="${C.TEXT}">Order #2845</text>
<rect x="820" y="714" width="210" height="44" rx="22" fill="${C.WARNING}20"/>
<text x="925" y="742" font-family="Arial" font-size="20" fill="${C.WARNING}" font-weight="700" text-anchor="middle">PREPARING</text>
<text x="60" y="786" font-family="Arial" font-size="22" fill="${C.TEXT2}">Takeout  -  4 items</text>
<text x="60" y="870" font-family="Arial" font-size="28" font-weight="700" fill="${C.ACCENT}">CHF 22.40</text>
<rect x="820" y="840" width="220" height="50" rx="14" fill="${C.ACCENT}20" stroke="${C.ACCENT}40" stroke-width="1"/>
<text x="930" y="871" font-family="Arial" font-size="20" fill="${C.ACCENT}" font-weight="700" text-anchor="middle">Mark Ready</text>
<rect x="30" y="918" width="1020" height="190" rx="18" fill="${C.CARD}" stroke="${C.SUCCESS}40" stroke-width="1"/>
<rect x="30" y="918" width="1020" height="5" rx="3" fill="${C.SUCCESS}"/>
<text x="60" y="964" font-family="Arial" font-size="24" font-weight="700" fill="${C.TEXT}">Order #2844</text>
<rect x="820" y="932" width="210" height="44" rx="22" fill="${C.SUCCESS}20"/>
<text x="925" y="960" font-family="Arial" font-size="20" fill="${C.SUCCESS}" font-weight="700" text-anchor="middle">COMPLETED</text>
<text x="60" y="1004" font-family="Arial" font-size="22" fill="${C.TEXT2}">Dine-in  Table 2  -  5 items</text>
<text x="60" y="1082" font-family="Arial" font-size="28" font-weight="700" fill="${C.TEXT2}">CHF 31.20</text>
<rect x="0" y="1800" width="1080" height="120" fill="#080B1E"/>
<rect x="0" y="1800" width="1080" height="1.5" fill="${C.BORDER}"/>
<text x="108" y="1868" font-family="Arial" font-size="20" fill="${C.TEXT2}" text-anchor="middle">POS</text>
<text x="324" y="1868" font-family="Arial" font-size="20" fill="${C.TEXT2}" text-anchor="middle">Products</text>
<text x="540" y="1868" font-family="Arial" font-size="20" fill="${C.TEXT2}" text-anchor="middle">Customers</text>
<text x="756" y="1868" font-family="Arial" font-size="20" fill="${C.TEXT2}" text-anchor="middle">Reports</text>
<text x="972" y="1868" font-family="Arial" font-size="20" fill="${C.ACCENT}" text-anchor="middle">Orders</text>
</svg>`;

const s4 = `<svg width="1080" height="1920" xmlns="http://www.w3.org/2000/svg">
<defs>
  <linearGradient id="acc" x1="0%" y1="0%" x2="100%" y2="0%">
    <stop offset="0%" stop-color="${C.ACCENT}"/>
    <stop offset="100%" stop-color="${C.PRIMARY}"/>
  </linearGradient>
</defs>
<rect width="1080" height="1920" fill="${C.BG}"/>
<rect width="1080" height="60" fill="#080B1E"/>
<text x="60" y="42" font-family="Arial" font-size="24" fill="${C.TEXT2}">9:41</text>
<rect width="1080" height="90" y="60" fill="${C.SURFACE}"/>
<rect width="1080" height="1.5" y="149" fill="${C.BORDER}"/>
<text x="60" y="118" font-family="Arial" font-size="34" font-weight="700" fill="${C.TEXT}">Products</text>
<rect x="856" y="76" width="184" height="60" rx="16" fill="url(#acc)"/>
<text x="948" y="114" font-family="Arial" font-size="24" fill="#fff" text-anchor="middle" font-weight="700">+ Add</text>
<rect x="30" y="168" width="1020" height="62" rx="16" fill="${C.CARD}" stroke="${C.BORDER}" stroke-width="1.5"/>
<text x="70" y="207" font-family="Arial" font-size="24" fill="${C.TEXT2}">Search products...</text>
<text x="60" y="278" font-family="Arial" font-size="22" font-weight="700" fill="${C.TEXT2}">All Products  (24 items)</text>
<rect x="30" y="294" width="1020" height="116" rx="16" fill="${C.CARD}" stroke="${C.BORDER}" stroke-width="1"/>
<rect x="30" y="294" width="7" height="116" rx="3" fill="${C.ACCENT}"/>
<text x="60" y="357" font-family="Arial" font-size="40" fill="${C.TEXT}">&#9749;</text>
<text x="130" y="342" font-family="Arial" font-size="26" font-weight="700" fill="${C.TEXT}">Espresso</text>
<text x="130" y="374" font-family="Arial" font-size="20" fill="${C.TEXT2}">Drinks  -  In Stock: 999</text>
<text x="790" y="358" font-family="Arial" font-size="28" font-weight="800" fill="${C.ACCENT}" text-anchor="end">CHF 3.50</text>
<rect x="806" y="320" width="88" height="38" rx="10" fill="${C.CARD}" stroke="${C.BORDER}" stroke-width="1"/>
<text x="850" y="344" font-family="Arial" font-size="20" fill="${C.TEXT2}" text-anchor="middle">Edit</text>
<rect x="908" y="320" width="88" height="38" rx="10" fill="${C.DANGER}15"/>
<text x="952" y="344" font-family="Arial" font-size="20" fill="${C.DANGER}" text-anchor="middle">Del</text>
<rect x="30" y="422" width="1020" height="116" rx="16" fill="${C.CARD}" stroke="${C.BORDER}" stroke-width="1"/>
<rect x="30" y="422" width="7" height="116" rx="3" fill="${C.PRIMARY}"/>
<text x="60" y="485" font-family="Arial" font-size="40" fill="${C.TEXT}">&#129360;</text>
<text x="130" y="470" font-family="Arial" font-size="26" font-weight="700" fill="${C.TEXT}">Croissant</text>
<text x="130" y="502" font-family="Arial" font-size="20" fill="${C.TEXT2}">Bakery  -  In Stock: 42</text>
<text x="790" y="486" font-family="Arial" font-size="28" font-weight="800" fill="${C.ACCENT}" text-anchor="end">CHF 4.20</text>
<rect x="806" y="448" width="88" height="38" rx="10" fill="${C.CARD}" stroke="${C.BORDER}" stroke-width="1"/>
<text x="850" y="472" font-family="Arial" font-size="20" fill="${C.TEXT2}" text-anchor="middle">Edit</text>
<rect x="908" y="448" width="88" height="38" rx="10" fill="${C.DANGER}15"/>
<text x="952" y="472" font-family="Arial" font-size="20" fill="${C.DANGER}" text-anchor="middle">Del</text>
<rect x="30" y="550" width="1020" height="116" rx="16" fill="${C.CARD}" stroke="${C.BORDER}" stroke-width="1"/>
<rect x="30" y="550" width="7" height="116" rx="3" fill="${C.SUCCESS}"/>
<text x="60" y="613" font-family="Arial" font-size="40" fill="${C.TEXT}">&#127861;</text>
<text x="130" y="598" font-family="Arial" font-size="26" font-weight="700" fill="${C.TEXT}">Green Tea</text>
<text x="130" y="630" font-family="Arial" font-size="20" fill="${C.TEXT2}">Drinks  -  In Stock: 87</text>
<text x="790" y="614" font-family="Arial" font-size="28" font-weight="800" fill="${C.ACCENT}" text-anchor="end">CHF 2.80</text>
<rect x="806" y="576" width="88" height="38" rx="10" fill="${C.CARD}" stroke="${C.BORDER}" stroke-width="1"/>
<text x="850" y="600" font-family="Arial" font-size="20" fill="${C.TEXT2}" text-anchor="middle">Edit</text>
<rect x="908" y="576" width="88" height="38" rx="10" fill="${C.DANGER}15"/>
<text x="952" y="600" font-family="Arial" font-size="20" fill="${C.DANGER}" text-anchor="middle">Del</text>
<rect x="30" y="678" width="1020" height="116" rx="16" fill="${C.CARD}" stroke="${C.BORDER}" stroke-width="1"/>
<rect x="30" y="678" width="7" height="116" rx="3" fill="${C.WARNING}"/>
<text x="60" y="741" font-family="Arial" font-size="40" fill="${C.TEXT}">&#127774;</text>
<text x="130" y="726" font-family="Arial" font-size="26" font-weight="700" fill="${C.TEXT}">Cupcake</text>
<text x="130" y="758" font-family="Arial" font-size="20" fill="${C.TEXT2}">Desserts  -  In Stock: 15</text>
<text x="790" y="742" font-family="Arial" font-size="28" font-weight="800" fill="${C.ACCENT}" text-anchor="end">CHF 5.50</text>
<rect x="806" y="704" width="88" height="38" rx="10" fill="${C.CARD}" stroke="${C.BORDER}" stroke-width="1"/>
<text x="850" y="728" font-family="Arial" font-size="20" fill="${C.TEXT2}" text-anchor="middle">Edit</text>
<rect x="908" y="704" width="88" height="38" rx="10" fill="${C.DANGER}15"/>
<text x="952" y="728" font-family="Arial" font-size="20" fill="${C.DANGER}" text-anchor="middle">Del</text>
<rect x="30" y="806" width="1020" height="116" rx="16" fill="${C.CARD}" stroke="${C.DANGER}40" stroke-width="1.5"/>
<rect x="30" y="806" width="7" height="116" rx="3" fill="${C.DANGER}"/>
<text x="60" y="869" font-family="Arial" font-size="40" fill="${C.TEXT}">&#127822;</text>
<text x="130" y="854" font-family="Arial" font-size="26" font-weight="700" fill="${C.TEXT}">Lemonade</text>
<text x="130" y="886" font-family="Arial" font-size="20" fill="${C.TEXT2}">Drinks  -  Low Stock!</text>
<rect x="600" y="840" width="140" height="32" rx="12" fill="${C.WARNING}20"/>
<text x="670" y="862" font-family="Arial" font-size="18" fill="${C.WARNING}" text-anchor="middle">Low Stock: 3</text>
<text x="790" y="870" font-family="Arial" font-size="28" font-weight="800" fill="${C.ACCENT}" text-anchor="end">CHF 3.90</text>
<rect x="806" y="832" width="88" height="38" rx="10" fill="${C.CARD}" stroke="${C.BORDER}" stroke-width="1"/>
<text x="850" y="856" font-family="Arial" font-size="20" fill="${C.TEXT2}" text-anchor="middle">Edit</text>
<rect x="908" y="832" width="88" height="38" rx="10" fill="${C.DANGER}15"/>
<text x="952" y="856" font-family="Arial" font-size="20" fill="${C.DANGER}" text-anchor="middle">Del</text>
<rect x="30" y="934" width="1020" height="116" rx="16" fill="${C.CARD}" stroke="${C.BORDER}" stroke-width="1"/>
<rect x="30" y="934" width="7" height="116" rx="3" fill="${C.ACCENT}60"/>
<text x="60" y="997" font-family="Arial" font-size="40" fill="${C.TEXT}">&#127803;</text>
<text x="130" y="982" font-family="Arial" font-size="26" font-weight="700" fill="${C.TEXT}">Garden Salad</text>
<text x="130" y="1014" font-family="Arial" font-size="20" fill="${C.TEXT2}">Food  -  In Stock: 25</text>
<text x="790" y="998" font-family="Arial" font-size="28" font-weight="800" fill="${C.ACCENT}" text-anchor="end">CHF 8.90</text>
<rect x="806" y="960" width="88" height="38" rx="10" fill="${C.CARD}" stroke="${C.BORDER}" stroke-width="1"/>
<text x="850" y="984" font-family="Arial" font-size="20" fill="${C.TEXT2}" text-anchor="middle">Edit</text>
<rect x="908" y="960" width="88" height="38" rx="10" fill="${C.DANGER}15"/>
<text x="952" y="984" font-family="Arial" font-size="20" fill="${C.DANGER}" text-anchor="middle">Del</text>
<rect x="0" y="1800" width="1080" height="120" fill="#080B1E"/>
<rect x="0" y="1800" width="1080" height="1.5" fill="${C.BORDER}"/>
<text x="108" y="1868" font-family="Arial" font-size="20" fill="${C.TEXT2}" text-anchor="middle">POS</text>
<text x="324" y="1868" font-family="Arial" font-size="20" fill="${C.ACCENT}" text-anchor="middle">Products</text>
<text x="540" y="1868" font-family="Arial" font-size="20" fill="${C.TEXT2}" text-anchor="middle">Customers</text>
<text x="756" y="1868" font-family="Arial" font-size="20" fill="${C.TEXT2}" text-anchor="middle">Reports</text>
<text x="972" y="1868" font-family="Arial" font-size="20" fill="${C.TEXT2}" text-anchor="middle">More</text>
</svg>`;

async function run() {
  await save(s1, 'assets/images/screenshots/phone_1_pos.png');
  await save(s2, 'assets/images/screenshots/phone_2_reports.png');
  await save(s3, 'assets/images/screenshots/phone_3_orders.png');
  await save(s4, 'assets/images/screenshots/phone_4_products.png');

  const pairs = [
    ['assets/images/screenshots/phone_1_pos.png', 'tablet7_1_pos.png'],
    ['assets/images/screenshots/phone_2_reports.png', 'tablet7_2_reports.png'],
    ['assets/images/screenshots/phone_3_orders.png', 'tablet7_3_orders.png'],
    ['assets/images/screenshots/phone_4_products.png', 'tablet7_4_products.png'],
  ];
  for (const [src, name] of pairs) {
    await sharp(src).resize(1200, 1920, { fit: 'fill' }).png().toFile('assets/images/screenshots/' + name);
    console.log('Tablet 7in:', name);
  }

  const pairs10 = [
    ['assets/images/screenshots/phone_1_pos.png', 'tablet10_1_pos.png'],
    ['assets/images/screenshots/phone_2_reports.png', 'tablet10_2_reports.png'],
    ['assets/images/screenshots/phone_3_orders.png', 'tablet10_3_orders.png'],
    ['assets/images/screenshots/phone_4_products.png', 'tablet10_4_products.png'],
  ];
  for (const [src, name] of pairs10) {
    await sharp(src).resize(1600, 2560, { fit: 'fill' }).png().toFile('assets/images/screenshots/' + name);
    console.log('Tablet 10in:', name);
  }
  console.log('ALL DONE');
}

run().catch(console.error);
