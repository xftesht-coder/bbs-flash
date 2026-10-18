# Android + OTG: compatibility checkpoint

The 3.5 configurator uses native Web Serial. A responsive page or PWA installation does not add USB-serial drivers. Android browser motor configuration is **not yet implemented or verified**.

Use [USB cable check](../usb-check.html) in Chrome on the owner's iQOO Z11 Turbo. Connect only the programming cable through a data-capable OTG adapter; the motor is unnecessary. Select the cable in the browser prompt, then copy its VID/PID report. This identifies the adapter for choosing a USB driver, not the Bafang controller or a guarantee of support.

The tool reads USB descriptor properties only after a user gesture and browser permission. It never opens/claims the device, transfers USB data, requests a serial port or sends UART commands. It does not read the USB serial number, persist identifiers or upload a report. An empty picker may indicate an OTG/adapter/permission/browser issue. The presence of the API alone is not proof of communication.

Next step depends on the actual cable chipset: implement a scoped WebUSB serial transport preserving the existing read/backup/write/readback flow, or a native Android USB host bridge. Test 1200/8N1, fragmentation, cancellation, unplugging and timeout handling before motor writes. Desktop safety gates must not be bypassed. Physical phone/cable testing remains required.

Sources: [Chrome Web Serial / Android WebUSB guidance](https://developer.chrome.com/docs/capabilities/serial), [Google's archived CDC-ACM prototype](https://github.com/google/web-serial-polyfill), [usb-serial-for-android driver library](https://github.com/mik3y/usb-serial-for-android). Do not assume an arbitrary AliExpress cable is CDC-ACM or that a generic polyfill supports it.
