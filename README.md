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

  - removes banner ads,
  - removes ads on VODs.

- [vaft/video-swap-new](https://github.com/pixeltris/TwitchAdSolutions#scripts)

  - increases ad removal success rate,
  - reduces frequency of TTV LOL PRO player resets (momentary black screens).

## Screenshot

<div align="center">
  <img
    src="https://user-images.githubusercontent.com/47226184/230387477-fa47fc75-69d5-42d2-b3ea-fb4e8f513035.png"
    alt="Popup on Firefox"
    height="450"
  />
</div>

## Installation

`⚠️ Please disable/uninstall the official TTV LOL extension to avoid conflicts.`

### 🦊 Firefox (Recommended)

1. Download the [latest version](https://github.com/younesaassila/ttv-lol-pro/releases/latest) of this extension from the [Releases page](https://github.com/younesaassila/ttv-lol-pro/releases) (XPI file)
1. Go to `about:addons`
1. Click on the gear icon then select "Install Add-on From File…"
1. Select the XPI file you just downloaded

### 🌐 Chromium (Chrome, Edge, or Brave)

#### Without Automatic Updates (All operating systems)

1. Download the [latest version](https://github.com/younesaassila/ttv-lol-pro/releases/latest) of this extension from the [Releases page](https://github.com/younesaassila/ttv-lol-pro/releases) (ZIP file)
1. Unzip the ZIP file you just downloaded
1. Go to `chrome://extensions`
1. Turn on `Developer mode`
1. Click on `Load unpacked`
1. Select the unzipped folder you just created

> ℹ️ Deleting the unzipped folder will remove the extension from your browser.

#### With Automatic Updates (Windows & Linux)

> ⚠️ **For Windows users:** Please note that Chromium browsers only support auto-updates for `.crx` extensions. Unfortunately, these browsers do not allow the installation of third-party `.crx` extensions by default. To allow the installation of third-party `.crx` extensions, the "ExtensionInstallAllowlist" Enterprise policy must be enabled via the Windows Registry. Using this policy will make your browser display a warning message stating "Your browser is managed by your organization." because it thinks that the policy was set by a system administrator in your organization (since users don't typically mess with the Registry) -- that is not the case, so you can safely ignore this message. Your browser will still be managed by you and you only.
> **If you are not comfortable having your browser display a warning message, please use the method above (without automatic updates).**

1. Download the [latest version](https://github.com/younesaassila/ttv-lol-pro/releases/latest) of this extension as a CRX file (Save link as…) from the [Releases page](https://github.com/younesaassila/ttv-lol-pro/releases)
1. Go to `chrome://extensions`
1. Turn on "Developer mode" (top right-hand corner)
1. Drag and drop the CRX file anywhere on the extensions page (you should see something like [this](https://user-images.githubusercontent.com/47226184/213722956-73fcc824-8065-441f-a893-ed96c33c2139.png) on Windows)
1. **For Windows users only:** Add this extension to your browser's allowlist via the Registry Editor _(if you don't do this, Chrome will disable the extension the next time it launches and prevent Automatic Updates)_
   1. **Recommended:** Read the warning above to make sure you understand why this is necessary
   1. Download the `allowlist.zip` file from the [latest release](https://github.com/younesaassila/ttv-lol-pro/releases/latest)
   1. Unzip the ZIP file you just downloaded
   1. Run the REG file for your browser (Chrome, Edge, or Brave)
   1. Fully close and restart your browser
   1. _You can see the policy changes applied at `chrome://policy`_

> ℹ️ If you want to revert the changes made to the Registry, an `unallow` folder is included in the `allowlist.zip` file. You can run the REG file in that folder to revert the policy changes.
