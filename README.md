# PushBot

This is a version of GitHub's chat bot, [Hubot](https://hubot.github.com/). We use it to do silly things in our Slack chat.

### Getting started

If you want to run PushBot, you'll need a few things on your system:

 * [node.js](http://nodejs.org/) and `npm`, the server-side JavaScript runtime. You can grab the tarballs from there or follow [Joyent's other installation instructions](https://www.joyent.com/blog/installing-node-and-npm). Personally, I use [nvm](https://github.com/creationix/nvm), which is installed by my [dotfiles](https://github.com/smashwilson/dotfiles/blob/master/script/ansible/reusable/nvm.yml).
 * [Redis](http://redis.io/), a key-value store that's used for persistent storage. You should have a package for this for your operating system.

### Testing Hubot Locally

You can test your hubot locally by running the following:

    % bin/hubot

You'll see some start up output about where your scripts come from and a
prompt.

    [Sun, 04 Dec 2011 18:41:11 GMT] INFO Loading adapter shell
    [Sun, 04 Dec 2011 18:41:11 GMT] INFO Loading scripts from /home/tomb/Development/hubot/scripts
    [Sun, 04 Dec 2011 18:41:11 GMT] INFO Loading scripts from /home/tomb/Development/hubot/src/scripts
    Hubot>

Then you can interact with hubot by typing `hubot help`.

    Hubot> hubot help

    Hubot> animate me <query> - The same thing as `image me`, except adds a few
    convert me <expression> to <units> - Convert expression to given units.
    help - Displays all of the help commands that Hubot knows about.
    ...

### References

Want to contribute scripts? Here are a few references that might be handy.

 * Scripts are written in a language called [CoffeeScript](http://coffeescript.org/), a JavaScript transpiler.
 * If you need a reference for JavaScript itself, I recommend the [Mozilla developer network](https://developer.mozilla.org/en-US/docs/Web/JavaScript).
 * Hubot's scripting API is documented [in the hubot repo](https://github.com/github/hubot/blob/master/docs/scripting.md). You can also use the other scripts in `scripts/` for reference, of course.

If your script starts to become big and complicated, you should consider extracting it to its own npm package. I did this for [hubot-markov](https://github.com/smashwilson/hubot-markov) if you'd like to see an example. [hubot-example](https://github.com/hubot-scripts/hubot-example) is a template library that you can clone as a starting point: make sure you edit the `package.json` info before you publish!
