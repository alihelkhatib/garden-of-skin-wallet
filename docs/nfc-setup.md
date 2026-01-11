# NFC Tag Setup

This guide explains how to use an NFC tag to open the Wallet pass download link.

## What the NFC tag should do
- Open the pass download URL in Safari.
- Example URL format:
  `https://gardenofskinmedspa.com/passes/<SERIAL>/pkpass`

## Tag requirements
- Use NFC tags that support NDEF URL records (most do).
- Tag should be writable and not locked until verified.

## iPhone behavior
- iPhone reads NFC tags and opens the URL in Safari.
- Wallet install requires HTTPS on a public domain.

## Recommended flow
1. Create a pass in the admin system:
   - `POST /passes`
2. Use the returned `serialNumber` to build the URL:
   - `https://gardenofskinmedspa.com/passes/<SERIAL>/pkpass`
3. Write the URL to the NFC tag using a mobile NFC writer app.
4. Test by tapping the tag with an iPhone.
5. The Wallet add sheet should appear.

## Notes
- Do not encode PII in the NFC URL.
- If you want a single tag for all customers, build a landing page that issues a new pass and redirects to the new `.pkpass`.
- For staff-only tags, use the admin POS URL: `https://gardenofskinmedspa.com/admin/pos.html`.
