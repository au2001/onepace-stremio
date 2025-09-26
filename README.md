# One Pace x One Piece Kai Stremio Addon

Join the [#onepace:garnier.dev](https://matrix.to/#/#onepace:garnier.dev) Matrix channel to receive updates when new episodes are released!

## Overview

[Stremio](https://www.stremio.com) is a modern media center that gives you the freedom to watch everything you want.\
Thanks to its addon system, it allows accessing a variety of content.

[One Pace](https://onepace.net) is a fan project that recuts One Piece to bring it more in line with the pacing of the original manga by Eiichiro Oda.\
It is distributed through torrent files on their website, which can be cumbersome to watch, and is missing some parts.

[One Piece Kai](https://www.reddit.com/comments/mbsv0n/) is another fan project made by [u/Emigliore (NSFW)](https://www.reddit.com/user/Emigliore) in March 2021, similar to One Pace but without any missing part.\
It stops after the first "half" of the One Piece anime though, and has Japanese audio with hardcoded English subtitles[^1].

[^1]: An older [English dub](https://www.reddit.com/comments/g7aro3/) also exists if you prefer – [updated](https://www.reddit.com/comments/17phccc/) in November 2023 (up to the first half of Wano).

This addon brings all three together to provide the optimal One Piece watching experience.\
You will see a new One Piece series on Stremio which contains One Pace, with missing parts filled in from One Piece Kai.\
It is automatically kept up to date with the latest releases nightly.

## Usage

First of all, you will need [Stremio](https://www.stremio.com/downloads).\
It is available on Windows, macOS, Linux, Android TV, Samsung TV, Android, Stream Deck, and web browsers.\
The iOS version only allows seeing episodes' metadata but not streaming due to App Store regulations.

Please note:

- This addon does not work well alongside previous versions. Uninstall any other One Pace addon before using this one.
- Subtitles might not work properly on Android. Go to Settings -> Player -> Switch to LibVLC for a much better experience.
- Some One Pace episodes are dubbed in English. Change your preferred language in Stremio settings to set the default track.

### Quick Install

1. Log into [Stremio for Browser](https://app.strem.io) with the same account you will use on your device.
2. [Click HERE](https://app.strem.io/#/addons/community/all?addon=https%3A%2F%2Fonepace.arl.sh%2Fmanifest.json) and hit the `Install` button.
3. One Pace should now be available in the `Discover` tab or [here](https://app.strem.io/#/detail/series/onepace/).
4. The addon will synchronize with any other device under the same account so you can watch from anywhere.

### Manual Install

1. Go to Stremio's `Addons` tab.
2. In `Search addons`, paste the following link: `https://onepace.arl.sh/manifest.json`.
3. Hit the `Install` button.
4. One Pace should now be available in the `Discover` tab.

## Addon History

[fedew04](https://github.com/fedew04) created the original version of this addon in December 2022 before joining the One Pace team, not including One Piece Kai.\
It is hosted on GitHub and is still maintained manually with new releases: [fedew04/OnePaceStremio](https://github.com/fedew04/OnePaceStremio).

[vasujain275](https://github.com/vasujain275) developed another addon in parallel in July 2023 which shows the latest One Pace episodes in real time.\
It is hosted on [BeamUp](https://github.com/Stremio/stremio-beamup) and the source code is available on GitHub: [vasujain275/onepace-stremio-v2](https://github.com/vasujain275/onepace-stremio-v2).

[roshank231](https://github.com/roshank231) forked the original addon in August 2023, integrating One Piece Kai episodes to fill in missing sections in One Pace.\
This second version is also available on GitHub but is no longer actively maintained: [roshank231/optest](https://github.com/roshank231/optest).

I, [au2001](https://github.com/au2001), then started improving on this third addon in October 2023 by updating it with newly released One Pace episodes.\
[trulow](https://github.com/trulow) further helped maintain it by adding new episodes as they were being released.

In January 2024, I automated the update process for adding new One Pace episodes, removing the need for manual intervention.\
In March 2024, I then created the Matrix channel to receive notifications when new episodes are released.\
In April 2024, One Pace changed their website very slightly which temporarly broke the automated updates. I switched to a more robust method using the official GraphQL API which I discovered through [vasujain275](https://github.com/vasujain275)'s addon.\
In July 2024, One Pace's website got taken down with its GraphQL API, breaking automated updates for over a year.\
In September 2025, I finally restored automated updates by using the official Google Sheets documents, waiting for a new GraphQL API.

Thank you to everyone involved, especially [One Pace volunteers](https://onepace.net/about) for their incredible, ongoing effort.

## Support

If you encounter any problem or have questions, feel free to open an [Issue](https://github.com/au2001/onepace-stremio/issues) on this repository.\
Enhancements and bug fixes are welcome through [Pull Requests](https://github.com/au2001/onepace-stremio/pulls) on this repository.
