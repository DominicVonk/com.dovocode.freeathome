# Release 2.0.0

This release requires Homey 8.0+. The app/package/generated manifest versions
must all be 2.0.0. Existing lightswitch and thermostat driver IDs and
serialNumber/channel pairing data are preserved. Previously paired dimmers
continue to work as switches; adding through the Dimmer driver exposes dimming.

## Automated checks

```sh
npm ci
npm test
npm run validate
npm run build:homey
```

Use Node.js 18+ for tests; the pinned release tool version used for validation,
Homey CLI 4.6.0, requires Node.js 24+. The Homey runtime is separate from the
machine running the release tools. `app.json` is generated from Homey Compose;
commit its current generated version. Test fixtures are excluded from deployment.

Tests exercise discovery/HTTP errors, malformed messages, reconnect recovery,
heartbeats, request cancellation/timeouts, concurrent snapshot/socket updates,
credential changes, paired-device recovery, subscription cleanup, legacy dimmer
pairings, command addressing/scaling and numeric boundary cases.

## Physical hardware smoke test (required before publishing)

Automated checks use real local HTTP/WebSocket servers and a mocked Homey SDK;
they do not establish compatibility with an actual SysAP firmware or validate
physical actuation. No hardware test result is claimed by this PR.

1. Upgrade an installation with existing switches/thermostats and confirm its
   devices, IDs and flows remain usable. Verify an existing dimmer paired as a
   switch still switches.
2. Pair each supported channel type present in the installation. Check dimming,
   shutter up/down/stop, blind tilt, thermostat readings/on-off/target/eco mode,
   movement and contact feedback from physical devices.
3. Disconnect the SysAP network, change physical state while disconnected, then
   reconnect. Homey must become unavailable, recover without an app restart,
   and display current state. Repeat after a SysAP restart.
4. Try invalid credentials, restore valid credentials, and confirm actionable
   pairing errors followed by recovery. A startup with the SysAP offline must
   recover when it becomes reachable.
5. Save new connection settings while connected; ensure old sockets do not
   reconnect and devices/listeners do not duplicate. Remove a paired device.

Do not mark the discovery/unreachable reports fixed on hardware until the
relevant reporters or a maintainer validate those scenarios. Keep the PR open
for the release decision; preparation does not merge it or publish to the store.
