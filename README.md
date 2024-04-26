rubylize
===
> https://deno.land/x/rubylize

![](https://repository-images.githubusercontent.com/791747833/f35bd682-6564-45f0-9567-3fc9b238fa3f)

## Installation & Update
```sh
$ deno install -f -n rubylize -A https://deno.land/x/rubylize/main.ts
```

## Usage
```sh
$ echo 'こんにちは、世界。' | rubylize -
# こんにちは、<ruby>世界<rt>せかい</rt></ruby>。

$ cat messages.json | rubylize > messages.ruby.json
```

## Thanks
- https://deno.com
- https://github.com/azu/kuromojin
