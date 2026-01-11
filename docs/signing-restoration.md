# Certificate Restoration Procedure

This project does not store certificates or keys in the repo. Signing assets are stored locally at:

`C:\Users\aliel\secure\garden-of-skin-wallet\certs`

## Restore on a new machine
1. Copy the `.p12` file and WWDR certificate into the secure local folder above.
2. Convert the `.p12` into PEM files for signing:
   ```bash
   openssl pkcs12 -in garden_of_skin_pass.p12 -out pass-cert.pem -clcerts -nokeys
   openssl pkcs12 -in garden_of_skin_pass.p12 -out pass-key.pem -nocerts -nodes
   ```
3. Set `.env` to reference the local paths:
   - `CERT_PATH` for `pass-cert.pem`
   - `KEY_PATH` for `pass-key.pem`
   - `P12_PATH` for the original `.p12` (optional)
   - `WWDR_CERT_PATH` for the Apple WWDR cert
4. Confirm `PASS_TYPE_ID` and `TEAM_ID` match Apple Developer settings.

## Notes
- Keep all certs and keys out of source control.
- Do not store PII or medical data in the pass.
