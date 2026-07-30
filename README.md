rubylize
===
> https://github.com/yano3nora/rubylize

![](https://repository-images.githubusercontent.com/791747833/f35bd682-6564-45f0-9567-3fc9b238fa3f)

## Installation & Update
Prebuilt binaries are available on [GitHub Releases](https://github.com/yano3nora/rubylize/releases).

```sh
# via mise (recommended)
$ mise use -g github:yano3nora/rubylize@latest

# or download an archive (tar.gz / zip) from GitHub Releases,
# extract it, and put the binary on your PATH
```

## Usage
```sh
$ echo 'こんにちは、世界。' | rubylize
# こんにちは、<ruby>世界<rt>せかい</rt></ruby>。

$ cat messages.json | rubylize > messages.ruby.json
```

## Development
```sh
$ deno task test     # run tests
$ deno task check    # fmt --check / lint / type check
$ deno task compile  # build a local binary (./rubylize)
```

## Release
Binaries are built and published to GitHub Releases by [goreleaser](https://goreleaser.com/) (`.goreleaser.yaml`).
`scripts/release.ts` wraps the flow: version bump, check/test, a compiled-binary smoke test,
and a human-only publish gate. goreleaser itself never pushes; commit and tag are pushed atomically first.

```sh
# 1. Bump VERSION in main.ts, run check/test/smoke, then dry-run the whole
#    goreleaser pipeline (compile all targets / archive / checksum) into dist/.
#    Nothing is pushed or published.
$ mise run release:prepare -- 0.1.0

# 2. Review the diff, then commit and tag it yourself.
$ git add -A && git commit -m 'release: v0.1.0'
$ git tag v0.1.0

# 3. Push the commit + tag (atomically) and create the GitHub Release.
#    The explicit flag is a guard so this step is always a deliberate human action.
$ mise run release:publish -- 0.1.0 --i-understand-this-pushes-and-publishes
```

## Thanks
- https://deno.com
- https://github.com/azu/kuromojin
