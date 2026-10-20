Free@Home for Homey

Requirements
- Homey 8.0 or newer, with access to the same network as the System Access Point.
- The free@home local API enabled on the System Access Point.
- A local API username and password with access to the required devices. These
  are the credentials configured on the System Access Point, not the ABB cloud
  account. The installer account helped some older installations, but is not a
  universal requirement or a substitute for enabling local API permissions.

Installation
Open the app settings in Homey. Enter the System Access Point's IP address or
hostname (optionally with a port), username and password, then save. An http://
or https:// address is also accepted. Do not include /fhapi paths in the host.
Add devices in Homey and choose the corresponding device type.

Supported channels (function IDs are hexadecimal)
- 0007: light switch (on/off)
- 0012: dimmer (on/off and brightness)
- 0023: room temperature controller without fan
- 0009: shutter (up/down/stop)
- 0061: blind (up/down/stop and tilt)
- 0011: movement detector
- 000F: window/door contact
Other function IDs are reported in discovery diagnostics. A product name alone
is not enough to establish support: its channel function and pairing IDs matter.

Existing light-switch devices that represent dimmers remain compatible without
re-pairing. Pair new dimmers through the Dimmer driver to expose brightness.
Existing serialNumber/channel pairing data and driver IDs are unchanged.

Troubleshooting
- Access denied: check the local user credentials and local API permissions.
- Cannot reach the System Access Point: check its address, port and network.
- No matching devices: the pairing error shows supported channel counts and
  unsupported function IDs. Try the corresponding device type and verify the
  user's device permissions. A discovery/authentication error is shown as an
  error, rather than being converted into an empty device list.
- Unavailable devices: the app reconnects automatically after network failure,
  reloads device state, and restores availability when the device returns.
- Enable a Homey diagnostic report when reporting a problem. Include Homey and
  System Access Point firmware versions and function IDs. Never share passwords
  or Authorization headers; redact serial numbers from configuration exports.

Development
Use npm ci and npm test (Node.js 18+). Tests compile TypeScript and exercise local
HTTP/WebSocket servers and a mocked Homey SDK. Install Homey CLI 4.6.0 with its
required Node.js 24+ runtime for release checks, then run npm run validate and
npm run build:homey. No new npm runtime dependency was added by the hardening.

Release verification and remaining hardware checks: see RELEASE.md.
Protocol references:
https://developer.eu.mybuildings.abb.com/fah_local/reference/functionids/
https://developer.eu.mybuildings.abb.com/fah_local/reference/pairingids/
