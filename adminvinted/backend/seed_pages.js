import dotenv from 'dotenv';
dotenv.config();
import connectDB from './config/db.js';
import mongoose from 'mongoose';
import Page from './models/Page.js';

const pages = [
    {
        title: 'Help Center',
        slug: 'help-center',
        isActive: true,
        content: `
<h2>Welcome to the Help Center</h2>
<p>We're here to help you have the best experience buying and selling on our platform. Browse the topics below or contact our support team.</p>

<h3>Getting Started</h3>
<ul>
  <li><strong>Creating an account:</strong> Sign up with your email address or connect with Google. It's free and only takes a minute.</li>
  <li><strong>Setting up your profile:</strong> Add a photo, bio, and your location to build trust with buyers and sellers.</li>
  <li><strong>Browsing items:</strong> Use the search bar or browse categories to find what you're looking for.</li>
</ul>

<h3>Buying</h3>
<ul>
  <li><strong>Making a purchase:</strong> Click "Buy Now" on any listing. You'll be guided through secure checkout.</li>
  <li><strong>Payments:</strong> We accept all major credit cards, PayPal, and Apple Pay. All payments are secured.</li>
  <li><strong>Tracking your order:</strong> Once your seller ships, you'll receive tracking info via email and in your profile notifications.</li>
</ul>

<h3>Selling</h3>
<ul>
  <li><strong>Listing an item:</strong> Click "Sell" in the top menu, fill in the details, upload photos, and publish.</li>
  <li><strong>Pricing your items:</strong> Research similar items on the platform to set a competitive price.</li>
  <li><strong>Shipping:</strong> Once sold, pack your item safely and ship within 3 business days.</li>
</ul>

<h3>Need More Help?</h3>
<p>If you can't find what you're looking for, our support team is available 24/7. Contact us through the in-app chat or email us at <strong>support@marketplace.com</strong>.</p>
        `
    },
    {
        title: 'Shipping Info',
        slug: 'shipping-info',
        isActive: true,
        content: `
<h2>Shipping Information</h2>
<p>We want to make sure your items arrive safely and on time. Here's everything you need to know about shipping on our platform.</p>

<h3>Shipping Timeline</h3>
<ul>
  <li>Sellers are required to ship within <strong>3 business days</strong> of receiving payment.</li>
  <li>Standard delivery takes <strong>3–7 business days</strong> depending on your location.</li>
  <li>Express shipping options may be available depending on the seller's carrier.</li>
</ul>

<h3>Shipping Carriers</h3>
<p>Sellers can ship using any reliable carrier, including:</p>
<ul>
  <li>Royal Mail / An Post / DHL / FedEx / UPS</li>
  <li>Local postal services</li>
</ul>

<h3>Tracking Your Order</h3>
<ul>
  <li>Once a seller ships, they are required to upload a tracking number.</li>
  <li>You'll receive an email notification and can track directly from your profile under "My Purchases".</li>
</ul>

<h3>International Shipping</h3>
<p>International shipping is available on selected listings. Buyers are responsible for any customs duties or import taxes that may apply in their country.</p>

<h3>Lost or Damaged Items</h3>
<p>If your item arrives damaged or is lost during transit, please open a dispute within <strong>5 days of the delivery date</strong>. We'll review the case and work to resolve it fairly.</p>
        `
    },
    {
        title: 'Returns & Refunds',
        slug: 'returns-refunds',
        isActive: true,
        content: `
<h2>Returns & Refunds Policy</h2>
<p>Your satisfaction matters to us. Our returns and refunds policy is designed to be fair to both buyers and sellers.</p>

<h3>Buyer Cancellations (Before Shipping)</h3>
<p>If the seller has not yet shipped your order, you can request a cancellation at any time. Once approved, a full refund will be issued to your original payment method within 3–5 business days.</p>

<h3>Return Window</h3>
<p>You have a <strong>5-day return window</strong> after delivery to request a return if:</p>
<ul>
  <li>The item is significantly different from the listing description.</li>
  <li>The item arrived damaged.</li>
  <li>You received the wrong item.</li>
</ul>

<h3>How to Request a Return</h3>
<ol>
  <li>Go to your profile and find the order under "My Purchases".</li>
  <li>Click "Request Return" and explain your reason.</li>
  <li>The seller has 3 business days to respond.</li>
  <li>If approved, ship the item back using a tracked service.</li>
</ol>

<h3>Refunds</h3>
<ul>
  <li><strong>Full refund:</strong> Issued once the seller confirms the returned item condition.</li>
  <li><strong>Partial refund:</strong> May be issued if the item is returned in a different condition than when it was sold. Shipping costs may be deducted.</li>
  <li>Refunds are credited to your original payment method or marketplace wallet within 3–5 business days.</li>
</ul>

<h3>Seller Initiated Refunds</h3>
<p>Sellers can issue partial or full refunds at their discretion via the order management screen in their profile.</p>
        `
    },
    {
        title: 'Item Verification',
        slug: 'item-verification',
        isActive: true,
        content: `
<h2>Item Verification</h2>
<p>We take authenticity seriously. Our item verification process helps protect buyers from counterfeit goods and ensures sellers are rewarded for selling genuine items.</p>

<h3>Why Verification Matters</h3>
<ul>
  <li>Protect buyers from fake or misrepresented products.</li>
  <li>Build trust between the community.</li>
  <li>Increase resale value of verified authentic items.</li>
</ul>

<h3>What Gets Verified?</h3>
<p>High-value items such as designer handbags, watches, sneakers, and electronics may be eligible for our verification program.</p>

<h3>How It Works</h3>
<ol>
  <li><strong>Seller lists the item</strong> with clear, accurate photos from multiple angles.</li>
  <li><strong>Our team reviews</strong> listing photos against known brand identifiers and reported fakes.</li>
  <li><strong>Verified Badge:</strong> Items that pass review receive a blue "Verified Authentic" badge on the listing.</li>
  <li><strong>Third-Party Authentication:</strong> For high-value items, we may partner with authentication experts.</li>
</ol>

<h3>Reporting a Fake</h3>
<p>If you receive an item you believe is counterfeit:</p>
<ul>
  <li>Do not use or alter the item.</li>
  <li>Open a dispute through your order page within 5 days of delivery.</li>
  <li>Provide clear photos and documentation.</li>
  <li>Our trust & safety team will investigate within 2 business days.</li>
</ul>

<h3>Consequences for Selling Fakes</h3>
<p>Accounts found selling counterfeit goods are permanently banned and reported to relevant authorities.</p>
        `
    },
    {
        title: 'Safety Center',
        slug: 'safety-center',
        isActive: true,
        content: `
<h2>Safety Center</h2>
<p>Your safety is our highest priority. Whether you're a buyer, seller, or just browsing, we're committed to creating a secure and trustworthy community.</p>

<h3>Safe Buying Tips</h3>
<ul>
  <li>Always purchase through our platform — never send money directly to a seller outside of the site.</li>
  <li>Review the seller's ratings and feedback before purchasing.</li>
  <li>If a deal seems too good to be true, it probably is.</li>
  <li>Never share personal financial information (bank account, credit card numbers) in messages.</li>
</ul>

<h3>Safe Selling Tips</h3>
<ul>
  <li>Only ship once payment has been confirmed by our platform.</li>
  <li>Use tracked shipping so you have proof of delivery.</li>
  <li>Do not accept payments outside the platform.</li>
  <li>Be cautious of buyers who ask you to cancel a transaction and pay elsewhere.</li>
</ul>

<h3>Recognizing Scams</h3>
<p>Common scam tactics include:</p>
<ul>
  <li>Requests to move conversation off-platform (WhatsApp, email).</li>
  <li>Overpayment scams where the buyer sends more than asked and requests the difference back.</li>
  <li>Fake shipping company emails.</li>
  <li>Phishing links sent via messages.</li>
</ul>

<h3>Reporting a Problem</h3>
<p>If you encounter suspicious behavior:</p>
<ol>
  <li>Use the "Report" button on any listing or user profile.</li>
  <li>Contact our Trust & Safety team at <strong>safety@marketplace.com</strong>.</li>
  <li>For urgent matters involving fraud or personal safety, contact local law enforcement.</li>
</ol>

<h3>Account Security</h3>
<ul>
  <li>Use a strong, unique password and never share it.</li>
  <li>Enable two-factor authentication (2FA) in your account settings.</li>
  <li>Log out of shared devices after use.</li>
</ul>
        `
    },
    {
        title: 'Privacy Policy',
        slug: 'privacy-policy',
        isActive: true,
        content: `
<h2>Privacy Policy</h2>
<p><em>Last updated: March 2026</em></p>
<p>We respect your privacy and are committed to protecting your personal data. This policy explains how we collect, use, and safeguard your information.</p>

<h3>What We Collect</h3>
<ul>
  <li><strong>Account information:</strong> Name, email, password (encrypted).</li>
  <li><strong>Profile information:</strong> Photo, bio, location (if provided).</li>
  <li><strong>Transaction data:</strong> Purchase history, payment information (processed securely via payment partners).</li>
  <li><strong>Usage data:</strong> Pages visited, search terms, device type.</li>
</ul>

<h3>How We Use It</h3>
<ul>
  <li>To operate and improve the platform.</li>
  <li>To process transactions and send order notifications.</li>
  <li>To send marketing emails (with your consent).</li>
  <li>To comply with legal obligations.</li>
</ul>

<h3>Your Rights</h3>
<p>You have the right to access, correct, or delete your personal data at any time. Visit your Profile Settings or contact us at <strong>privacy@marketplace.com</strong>.</p>
        `
    },
    {
        title: 'Terms of Service',
        slug: 'terms-of-service',
        isActive: true,
        content: `
<h2>Terms of Service</h2>
<p><em>Last updated: March 2026</em></p>
<p>By using our platform, you agree to these terms. Please read them carefully.</p>

<h3>Eligibility</h3>
<p>You must be at least 18 years old to create an account and use the platform.</p>

<h3>User Conduct</h3>
<p>You agree not to:</p>
<ul>
  <li>Post fraudulent, misleading, or prohibited listings.</li>
  <li>Harass or abuse other users.</li>
  <li>Use automated tools to scrape or spam the platform.</li>
  <li>Bypass our payment system.</li>
</ul>

<h3>Prohibited Items</h3>
<p>You may not list or sell counterfeit goods, illegal items, weapons, or hazardous materials.</p>

<h3>Fees</h3>
<p>We charge a small transaction fee on each successful sale. Full fee schedule is available in your account settings.</p>

<h3>Termination</h3>
<p>We reserve the right to suspend or permanently ban accounts that violate these terms.</p>

<h3>Contact</h3>
<p>Questions? Contact us at <strong>legal@marketplace.com</strong>.</p>
        `
    },
    {
        title: 'Cookie Settings',
        slug: 'cookie-settings',
        isActive: true,
        content: `
<h2>Cookie Settings</h2>
<p>We use cookies to improve your experience on our platform. Here's what they do and how you can control them.</p>

<h3>What Are Cookies?</h3>
<p>Cookies are small text files stored on your browser. They help us remember your preferences and improve site performance.</p>

<h3>Types of Cookies We Use</h3>
<ul>
  <li><strong>Essential Cookies:</strong> Required for the platform to function. Cannot be disabled.</li>
  <li><strong>Analytics Cookies:</strong> Help us understand how visitors use the site (e.g., Google Analytics).</li>
  <li><strong>Marketing Cookies:</strong> Used to show relevant ads and track campaign performance.</li>
  <li><strong>Preference Cookies:</strong> Remember your language, currency, and other settings.</li>
</ul>

<h3>Managing Your Preferences</h3>
<p>You can update your cookie preferences at any time in your browser's privacy settings, or by contacting us at <strong>privacy@marketplace.com</strong>.</p>

<h3>More Information</h3>
<p>For more details, refer to our <a href="/pages/privacy-policy">Privacy Policy</a>.</p>
        `
    }
];

const seed = async () => {
    await connectDB();

    for (const page of pages) {
        const existing = await Page.findOne({ slug: page.slug });
        if (!existing) {
            await Page.create(page);
            console.log(`✅ Created: ${page.slug}`);
        } else {
            console.log(`⏭️  Skipped (already exists): ${page.slug}`);
        }
    }

    console.log('\n🎉 All pages seeded!');
    await mongoose.disconnect();
    process.exit(0);
};

seed().catch(e => { console.error(e.message); process.exit(1); });
