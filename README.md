# Building the extension

## Pre-requisites

Any OS should do, but the following was tested under Ubuntu 22.10.

You will need to have a recent (>= 16.18.1) version of [Node.js](https://nodejs.org/en/) and
have the [yarn](https://yarnpkg.com/) package manager installed globally.

## Clone the repository recursively (with submodules)

In the terminal:

`git clone https://github.com/djfm/ytdpnl-extension.git --recursive`

In order to be sure to get the version corresponding to the submitted extension,
please checkout this commit for v1.1.2:

```bash
cd ytdpnl-extension
git checkout 3e5e6f05
```

## Install the dependencies

```
yarn
```

## Build the extension

```
yarn build
```

The extension will be output in the `dist` folder.
