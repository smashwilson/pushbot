# Shhh

This directory contains shell scripts that can be sourced to provided runtime secrets for pushbot. A file called `botrc.sh` will be loaded by `bin/bot` by default if one is present.

To get started:

```sh
$ cp secrets/botrc.example.sh secrets/botrc.sh
$ atom secrets/botrc.sh
$ bin/bot
```

If you wish, you can maintain several independent configurations by creating different `botrc.NAME.sh` files in this directory. Select a non-default configuration by providing NAME as an argument to `bin/bot`.

```sh
$ cp secrets/botrc.example.sh secrets/botrc.pushbot.sh
$ atom secrets/botrc.pushbot.sh
$ bin/bot pushbot
```
