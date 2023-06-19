# Contributing

Thank you for your interest in contributing to TTV LOL PRO! This web extension is coded in TypeScript and utilizes the [`webextension-polyfill`](https://www.npmjs.com/package/webextension-polyfill) npm package. The build process is handled by [Parcel](https://parceljs.org/), and we use the [`@parcel/config-webextension`](https://www.npmjs.com/package/@parcel/config-webextension) plugin.

## Requirements

- [Node.js](https://nodejs.org/en)
- [npm](https://www.npmjs.com/)

## Installation

To install the dependencies, run the following command:

```sh
npm install
```

## Development

To start the development server, run the following command:

- For Firefox:

```sh
npm run dev:firefox
```

- For Chromium-based browsers:

```sh
npm run dev:chromium
```

This will start a server on `localhost:1234` and will watch for changes in the `src` folder.

## Build

To build the extension, run the following command:

- For Firefox:

```sh
npm run build:firefox
```

- For Chromium-based browsers:

```sh
npm run build:chromium
```

## Lint

To check for linting errors, run the following command:

```sh
npm run lint
```

To fix linting errors, run the following command:

```sh
npm run lint:fix
```

## Pull requests

We appreciate pull requests! If you plan to make significant changes, we recommend opening an issue first to discuss your proposed modifications.

We welcome contributions from developers of all skill levels, so don't hesitate to get involved. If you have any questions or need assistance, please feel free to reach out to us. Happy coding!
