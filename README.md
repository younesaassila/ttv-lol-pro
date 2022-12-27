<h1 align="center">
  <img src="src/assets/icon.png" height="100" width="100" alt="Icon" />
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

## Screenshots

![Popup](https://i.imgur.com/VucfuL6.png)

## Installation

`⚠️ Please disable/uninstall the official TTV LOL extension to avoid conflicts.`

### Firefox (Recommended)

> ✅ The add-on updates automatically.

1. Download the latest version of this extension in the "Releases" section (XPI file)
1. Go to `about:addons`
1. Click on the gear icon then select "Install Add-on From File…"
1. Select the XPI file you just downloaded

### Chrome

> ❌ The extension does not update automatically.

1. Download the latest version of this extension in the "Releases" section (ZIP file)
1. Unzip the ZIP file you just downloaded
1. Go to `chrome://extensions`
1. Turn on `Developer mode`
1. Click on `Load unpacked`
1. Select the unzipped folder you just created
