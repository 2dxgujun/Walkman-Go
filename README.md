# Walkman Go (beta)

> A CLI for sync playlists to Sony Walkman deivce

Shipping playlists to Walkman device is a very grunt work, you will need a Windows PC with Media Go or foobar2000 installed, then you download songs and export the playlists to Walkman device manually. Also it's on your own to care about the album artwork. If your playlists grown up, and you want to update these playlists on your Walkman device, you will need to export the entire playlists again.

With Walkman Go, just plug Walkman device into usb, that's all.

## Features

* Download Hi-Fi music, payment required music, unavailable music
* Sync online playlists to local disk every five minutes
* Add High-Resolution album artwork
* Auto sync your playlists to Walkman device on plugged

## Install

```
$ npm i -g walkman-go
```

## Usage

Firstly, install as a global package.

Secondly, create a work directory, for example `~/WalkmanGo`, put **walkman-go.ini** into the directory.

```ini
# walkman-go.ini
[general]
workdir = ~/WalkmanGo
# Available bitrate: flac,320,128
bitrate = flac

[personal]
# Your QQ number
uin = 414236069
playlists[] = Playlist1
playlists[] = Playlist2
```

Start WalkmanGo:

```
$ walkman-go
```

## Tested On

* NW-A35