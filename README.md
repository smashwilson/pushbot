# PushBot

[![Build Status](https://travis-ci.org/smashwilson/pushbot.svg?branch=master)](https://travis-ci.org/smashwilson/pushbot) | [![Docker Repository on Quay.io](https://quay.io/repository/smashwilson/pushbot/status "Docker Repository on Quay.io")](https://quay.io/repository/smashwilson/pushbot)

This is a version of GitHub's chat bot, [Hubot](https://hubot.github.com/). We use it to do silly things in our Slack chat.

### Getting started

The easiest way to run pushbot locally is to use Docker. Install [the Docker distribution for your platform of choice](https://docs.docker.com/#run-docker-anywhere). Make sure that you also have [docker-compose](https://docs.docker.com/compose/overview/); it's included in the Mac and Windows bundles, but on Linux you may need to install it separately.

Once Docker is installed and running, build and pull containers with:

```bash
# One-time setup
script/bootstrap
```

Then, to run pushbot with a shell adapter in the current terminal window:

```bash
bin/bot
```

### References

Want to contribute scripts? Here are a few references that might be handy.

 * If you need a reference for JavaScript itself, I recommend the [Mozilla developer network](https://developer.mozilla.org/en-US/docs/Web/JavaScript).
 * The core node.js API is documented at [the official node website](https://nodejs.org/dist/latest-v7.x/docs/api/). Pushbot is currently running on node 7.9.
 * You can use modern JavaScript here, including class expressions, let and const, and async/await. I like to use [node.green](http://node.green/) to see what JavaScript features are available natively.
 * Non-core packages, like `request`, can be found on [npm](https://www.npmjs.com/).
 * Hubot's scripting API is documented [in the hubot repo](https://github.com/github/hubot/blob/master/docs/scripting.md). You can also use the other scripts in `scripts/` for reference, of course.

If your script starts to become big and complicated, you should consider extracting it to its own npm package. I did this for [hubot-markov](https://github.com/smashwilson/hubot-markov) if you'd like to see an example. [hubot-example](https://github.com/hubot-scripts/hubot-example) is a template library that you can clone as a starting point: make sure you edit the `package.json` info before you publish!
