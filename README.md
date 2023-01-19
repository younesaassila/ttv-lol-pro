<h1 align="center">
  <img src="src/images/brand/icon.png" height="100" width="100" alt="Icon" />
  <br />
  TTV LOL PRO
  <br />
</h1>

<div align="center">
  <a href="https://github.com/younesaassila/ttv-lol-pro/issues">
    <img
      alt="GitHub issues"
      src="https://img.shields.io/github/issues/younesaassila/ttv-lol-pro"
    />
  </a>
  <a href="https://github.com/younesaassila/ttv-lol-pro/stargazers">
    <img
      alt="GitHub stars"
      src="https://img.shields.io/github/stars/younesaassila/ttv-lol-pro"
    />
  </a>
  <a href="https://github.com/younesaassila/ttv-lol-pro/releases">
    <img
      alt="GitHub all releases"
      src="https://img.shields.io/github/downloads/younesaassila/ttv-lol-pro/total"
    />
  </a>
</div>

<br />

> ℹ️ This is a fork of the original project at https://github.com/TTV-LOL/extensions

> ℹ️ TTV LOL PRO uses the same backend server as the official TTV LOL extension, meaning it experiences the same server issues (if there are any).

TTV LOL PRO removes livestream ads from [Twitch](https://www.twitch.tv/).

This fork:

- disables TTV LOL for channels you are subscribed to,
- lets you whitelist channels,
- improves TTV LOL's popup by showing stream status and "Whitelist" button,
- falls back to the stream with ads if the API server errors out,
- improves your privacy by removing your Twitch token from API requests,
- lets you add custom primary/fallback proxies.

**Recommendations:**

- [uBlock Origin](https://ublockorigin.com/)

  - remove banner ads,
  - block ads on VODs.

## Screenshot

<div align="center">
  <img
    src="https://user-images.githubusercontent.com/47226184/210093901-2d0c7f62-5e1f-4ce2-83f3-e35812361e20.png"
    alt="Popup on Firefox"
  />
</div>

## Installation

`⚠️ Please disable/uninstall the official TTV LOL extension to avoid conflicts.`

### Firefox (Recommended)

#### ✅ With Automatic Updates

1. Download the latest version of this extension in the "Releases" section (XPI file)
1. Go to `about:addons`
1. Click on the gear icon then select "Install Add-on From File…"
1. Select the XPI file you just downloaded

### Chrome

#### ✅ With Automatic Updates (Requires registry editing on Windows)

1. Download the latest version of this extension in the "Releases" section (CRX file) using the `Save link as…` button
1. Go to `chrome://extensions`
1. Turn on `Developer mode` (top right corner)
1. Drag and drop the CRX file you just downloaded into the extensions page (if an error occurs, restart your browser and try again)
1. Add this extension to your browser's allowlist (if you don't do this, the extension will be disabled at the next browser restart)
   - For Windows users:
     1. Open the registry editor (`regedit.exe`)
     1. Create the following key (if it doesn't exist):
        - `HKEY_LOCAL_MACHINE\SOFTWARE\Policies\Google\Chrome\ExtensionInstallAllowlist` for Chrome
        - `HKEY_LOCAL_MACHINE\SOFTWARE\Policies\Microsoft\Edge\ExtensionInstallAllowlist` for Edge
        - `HKEY_LOCAL_MACHINE\SOFTWARE\Policies\BraveSoftware\Brave\ExtensionInstallAllowlist` for Brave
     1. Create a new `REG_SZ` (string) value named `1` (or any number) and set its value to `gfolbeacfbanmnohmnppjgenmmajffop` (the extension ID)
     1. Restart your browser
   - For Mac users: Look up how to allow local installations of extensions on Mac, or use the "Without Automatic Updates" method
   - For Linux users: Chromium-based browsers on Linux allow local installations of extensions

#### ❌ Without Automatic Updates

1. Download the latest version of this extension in the "Releases" section (ZIP file)
1. Unzip the ZIP file you just downloaded
1. Go to `chrome://extensions`
1. Turn on `Developer mode`
1. Click on `Load unpacked`
1. Select the unzipped folder you just created
