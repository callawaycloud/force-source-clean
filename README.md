# force-source-clean

![npm](https://img.shields.io/npm/v/force-source-clean)

An sfdx plugin which runs `force:source:retrieve --manifest ...` and removes any stale files after refresh.

## Setup

run `sfdx plugins:install force-source-clean`

## Usage

<!-- commands -->
* [`sfdx force:source:clean [-x <string>] [-n] [-u <string>] [--apiversion <string>] [--json] [--loglevel trace|debug|info|warn|error|fatal|TRACE|DEBUG|INFO|WARN|ERROR|FATAL]`](#sfdx-forcesourceclean--x-string--n--u-string---apiversion-string---json---loglevel-tracedebuginfowarnerrorfataltracedebuginfowarnerrorfatal)

## `sfdx force:source:clean [-x <string>] [-n] [-u <string>] [--apiversion <string>] [--json] [--loglevel trace|debug|info|warn|error|fatal|TRACE|DEBUG|INFO|WARN|ERROR|FATAL]`

Runs 'sfdx force:source:retrieve -manifest' AND deletes any source no longer found in the org

```
USAGE
  $ sfdx force:source:clean [-x <string>] [-n] [-u <string>] [--apiversion <string>] [--json] [--loglevel
    trace|debug|info|warn|error|fatal|TRACE|DEBUG|INFO|WARN|ERROR|FATAL]

FLAGS
  -n, --noprompt                                                                    Skips the warning and 'continue'
                                                                                    prompt.  Only use if you already
                                                                                    understand the impacts!
  -u, --targetusername=<value>                                                      username or alias for the target
                                                                                    org; overrides default target org
  -x, --manifest=<value>                                                            [default: manifest/package.xml] The
                                                                                    complete path for the manifest
                                                                                    (package.xml) file that specifies
                                                                                    the components to retrieve.
  --apiversion=<value>                                                              override the api version used for
                                                                                    api requests made by this command
  --json                                                                            format output as json
  --loglevel=(trace|debug|info|warn|error|fatal|TRACE|DEBUG|INFO|WARN|ERROR|FATAL)  [default: warn] logging level for
                                                                                    this command invocation

DESCRIPTION
  Runs 'sfdx force:source:retrieve -manifest' AND deletes any source no longer found in the org

EXAMPLES
  $ sfdx force:source:clean -x manifest/package.xml

  $ sfdx force:source:clean -x manifest/package.xml --noprompt
```

_See code: [src/commands/force/source/clean.ts](https://github.com/ChuckJonas/force-source-clean/blob/v1.0.1/src/commands/force/source/clean.ts)_
<!-- commandsstop -->


## How it works

The implementation of this command is VERY simple.  

It basically just replaces the contents of ALL the files with in `packageDirectories` with "marker content" (EG `[DELETE_ME]`).  After refresh, it then looks for any files which still contain the "marker" and removes them.

The original plan to look at last modified timestamps, but the `force:source:retrieve` command is optimized to not write if the file has not changed.

If the retrieve command fails, it will revert the "marked" contents.  

## Debugging your plugin
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


## Disclaimer

I have only tested this command with my personal configuration.  As with anything you install, I highly recommend you take time to read the source and understand what it does before executing it.

### LEGAL

THIS SOFTWARE IS PROVIDED "AS IS" AND ANY EXPRESSED OR IMPLIED WARRANTIES, INCLUDING, BUT NOT LIMITED TO, THE IMPLIED WARRANTIES OF MERCHANTABILITY AND FITNESS FOR A PARTICULAR PURPOSE ARE DISCLAIMED. IN NO EVENT SHALL THE REGENTS OR CONTRIBUTORS BE LIABLE FOR ANY DIRECT, INDIRECT, INCIDENTAL, SPECIAL, EXEMPLARY, OR CONSEQUENTIAL DAMAGES (INCLUDING, BUT NOT LIMITED TO, PROCUREMENT OF SUBSTITUTE GOODS OR SERVICES; LOSS OF USE, DATA, OR PROFITS; OR BUSINESS INTERRUPTION) HOWEVER CAUSED AND ON ANY THEORY OF LIABILITY, WHETHER IN CONTRACT, STRICT LIABILITY, OR TORT (INCLUDING NEGLIGENCE OR OTHERWISE) ARISING IN ANY WAY OUT OF THE USE OF THIS SOFTWARE, EVEN IF ADVISED OF THE POSSIBILITY OF SUCH DAMAGE.
