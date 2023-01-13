<!-- toc -->
<!-- install -->
<!-- usage -->
<!-- commands -->
<!-- debugging-your-plugin -->

# Getting Started
See (tutorial for setup)[https://developer.salesforce.com/blogs/2018/05/create-your-first-salesforce-cli-plugin]

# Debugging your plugin
We recommend using the Visual Studio Code (VS Code) IDE for your plugin development. Included in the `.vscode` directory of this plugin is a `launch.json` config file, which allows you to attach a debugger to the node process when running your commands.

To debug the `source:source:clean` command: 

1. Run `npm run watch` to watch for changes and recompile your plugin on save.

2. From inside a valid SFDX project run, call the command using:

```sh-session
NODE_OPTIONS=--inspect-brk ~/path/to/force-source-clean/bin/run force:source:clean
```

*This will start the inspector and suspend the process on the first line of the program.*

4. Start the debugger, using the "Attach to Remote" launch configuration.

5. The debugger will now be attached to the node process and you can step through your code.
