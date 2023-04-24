[![npm version](https://badge.fury.io/js/webpack-msbuild-plugin.svg)](https://badge.fury.io/js/webpack-msbuild-plugin)
[![npm](https://img.shields.io/npm/dt/webpack-msbuild-plugin.svg)]()
# Webpack MSBuild Plugin

THIS PLUGIN IS NO LONGER SUPPORTED

This plugin allows you to run msbuild scripts at specific times using the Webpack compilation hooks. We can run multiple projects, a solution file or a combination of all at once. Script is fully configurable by the options object either at the hook level or at the project level.

_This plugin was built for Windows 10 and Windows Server 2012 - it is not tested in any other OS and most likely will have issues. Written in Node v9 for webpack 4, webpack 3 won't work as they've changed the hook functionality (can work with very little work)_


1. [Installation](#installation)
2. [Setup](#setup)
3. [Root API Options](#root-api-options)
4. [Parent Hook API options](#parent-hook-api-options)
5. [MSBuild Script Defaults](#msbuild-script-defaults)
6. [Custom Logger](#custom-logger)
7. [What is the output script it will generate?](#what-is-the-output-script-it-will-generate)

_
## Installation

`npm install webpack-msbuild-plugin`

## Setup

Building a project file when webpack has finished compilation, In `webpack.config.js`:

```js
const WebpackMSBuildPlugin = require('webpack-msbuild-plugin');

module.exports = {
    ...
    ...
    plugins: [
        new WebpackMSBuildPlugin({
            onWebpackDone: {                        
                projects: ['path/to/project.csproj']
            }
        })
    ],
    ...
}
```

If you need to configure your msbuild script with specifc options, you can do this by adding an options object which will apply to all your projects in the array:

```js
const WebpackMSBuildPlugin = require('webpack-msbuild-plugin');

module.exports = {
    ...
    ...
    plugins: [
        new WebpackMSBuildPlugin({
            onWebpackDone: {      
                options : {
                    targets: !this.env.dev ? ["Clean", "Build"] : ["Build"],
                    configuration: !this.env.dev ? 'Release' : 'Debug',
                    verbosity: 'detailed',
                    maxcpucount: 0,
                    toolsVersion: 14.0
                },
                projects: ['path/to/project.csproj']
            }
        })
    ],
    ...
}
```

It will automatically attempt to locate the msbuild.exe file, if it can't you can always use the `msbuildPath` option inside your options object, it will automatically execute and generate a script from your options, the above example will generate the script below which extends the options object with the [Script Defaults](#msbuild-script-defaults), want to see what your script will output? [see here](#what-is-the-output-script-it-will-generate)

```bash
"C:/Program Files (x86)/MSBuild/14.0/Bin/amd64/MSBuild.exe path/to/project.csproj /target:Release /verbosity:detailed /target:Release /toolsversion:14.0 /nologo /maxcpucount /property:Configuration=Release"
```

### Root API Options
* `onWebpackPre`: Configuration object for the script generator to execute before compilation **Default: {}**
* `onWebpackPost`: Configuration object for the script generator to execute after files are emitted at the end of the compilation. **Default: {}**
* `onWebpackDone`: Configuration object for the script generator to execute after Webpack's process is complete. *Note: this event also fires in `webpack --watch` when webpack has finished updating the bundle.* **Default: {}**
* `outputConsole`: By default the script will write to the console, but you can either overwrite the default output functionality or use a [Custom Logger](#custom-logger).  **Default: {log: console.log, error: console.error}**


### Parent Hook API options
**onWebpackPre**, **onWebpackPost**, **onWebpackDone**

These three parent hook configuration objects all have the same functionality, they just execute at different times, here's an extended demo of what options
are available for EACH parent hook.

```js
const WebpackMSBuildPlugin = require('webpack-msbuild-plugin');

module.exports = {
    ...
    ...
    plugins: [
        new WebpackMSBuildPlugin({
            onWebpackDone: {      
                // will extend the script defaults
                options : {
                    targets: !this.env.dev ? ["Clean", "Build"] : ["Build"],
                    configuration: !this.env.dev ? 'Release' : 'Debug',
                    verbosity: 'detailed',
                    maxcpucount: 0,
                    toolsVersion: 14.0
                },
                // if true, it will attempt to run all scripts in parallel, this requires you to
                // have all your targets and dependencies setup correctly.
                parallel: true|false
                // projects can be specified as a string if you don't need to use hooks per project
                projects: ['path/to/project.csproj'],
                // or as array of object(s) (or combination of both)
                projects: ['path/to/project.csproj', {
                    // path to prokect
                    project : 'path/to/project.csproj',                
                    // will extend the onWebpackDone.options object
                    options : {
                        verbosity: 'quiet'
                    },
                    // we can bind to individual project hooks here
                    hooks: {
                        onStart(data) {
                            // called when this particular project starts building
                        },
                        onData(data) {
                            // called whenever the child process stdout or stderr receives output
                            // from the msbuild script
                        },
                        onError(data) {
                            // if there's any issues, it will raise them here.
                        },
                        onDone(data) {
                            // called when this particular project has finished building
                        },
                    }
                }],
                hooks : {
                    onStart(data) {
                        // called when all the project scripts have been setup and are about to start executing
                    },
                    onProgress(data) {
                        // only called if there's more than 1 project, it will basically recieve data telling the output console
                        // how many projects are left, this is called at the END of a single script executing
                    },
                    onError(data) {
                        // if there's any errors in the script
                    },
                    onDone(data) {
                        // when all projects have executed successfully
                    }
                }
            }
        })
    ],
  ...
}
```



### MSBuild Script Defaults

The options object (per parent hook) group, will extend the following defaults for the msbuild script, most of these options are all [documented here](https://msdn.microsoft.com/en-us/library/ms164311.aspx).
```js
{
    targets: ['Rebuild'],
    configuration: 'Release',
    toolsVersion: 14.0,
    properties: {},
    verbosity: 'normal',
    maxcpucount: 0,
    nologo: true,
    platform: process.platform,
    architecture: detectArchitecture(),
    windir: process.env.WINDIR,
    // absolute path to the msbuild executable
    msbuildPath: '',
    fileLoggerParameters: undefined,
    consoleLoggerParameters: undefined,
    loggerParameters: undefined,
    nodeReuse: true,
    // we're able to push in custom flags to the script using this array, each option should be a string
    customArgs: [],
    // will add the Platform property to the properties object automatically
    solutionPlatform: null
}
```


### Custom Logger
If you want to stop the plugin logging out to the console, or replace it with your own logger:

```js
const WebpackMSBuildPlugin = require('webpack-msbuild-plugin');

module.exports = {
    ...
    ...
    plugins: [
        new WebpackMSBuildPlugin({
            outputConsole: {
                log(data) {
                    // data is an object, containing a type, msg and extra data like what project is sending the output, 
                    // or where abouts in the chain is it throwing the output
                    console.log(data.msg);
                },
                error(data) {
                    // data is an object, containing a type, msg and extra data like what project is sending the output, 
                    // or where abouts in the chain is it throwing the output
                    process.exit(0);
                }
            }
        })
    ],
  ...
}
```



### What is the output script it will generate?
It's easy to tell, we can write a very simple function to intercept the script before it's executed:

```js
const WebpackMSBuildPlugin = require('webpack-msbuild-plugin');

module.exports = {
    ...
    ...
    plugins: [
        new WebpackMSBuildPlugin({
            onWebpackDone: {                        
                projects: [{
                    project: 'path/to/project.csproj',
                    hooks : {
                        onStart(data) {
                            // this will basically log out a script you should be able to copy and paste into a CLI and watch it run manually.
                            console.log(data.project.script.executable,data.project.script.args.join(' '))
                        }
                    }
                }]
            }
        })
    ],
  ...
}
```


### Development

If you want to contribute or extend this plugin, clone the repository and run npm install, then there's only two scripts: npm run build, npm run watch.
There's no tests (yet), make your changes in src and the output lib will update.
