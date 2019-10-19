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

OPTIONS
  -n, --noprompt                                                                    Skips the warning and 'continue'
                                                                                    prompt.  Only use if you already
                                                                                    understand the impacts!

  -u, --targetusername=targetusername                                               username or alias for the target
                                                                                    org; overrides default target org

  -x, --manifest=manifest                                                           [default: manifest/package.xml] The
                                                                                    complete path for the manifest
                                                                                    (package.xml) file that specifies
                                                                                    the components to retrieve.

  --apiversion=apiversion                                                           override the api version used for
                                                                                    api requests made by this command

  --json                                                                            format output as json

  --loglevel=(trace|debug|info|warn|error|fatal|TRACE|DEBUG|INFO|WARN|ERROR|FATAL)  [default: warn] logging level for
                                                                                    this command invocation

EXAMPLES
  $ sfdx force:source:clean -x manifest/package.xml
  $ sfdx force:source:clean -x manifest/package.xml --noprompt
```

_See code: [lib/commands/force/source/clean.js](https://github.com/ChuckJonas/force-source-clean/blob/v0.0.5/lib/commands/force/source/clean.js)_
<!-- commandsstop -->


## How it works

The implementation of this command is VERY simple.  

It basically just replaces the contents of ALL the files with in `packageDirectories` with "marker content" (EG `[DELETE_ME]`).  After refresh, it then looks for any files which still contain the "marker" and removes them.

The original plan to look at last modified timestamps, but the `force:source:retrieve` command is optimized to not write if the file has not changed.

As of this release, if the retrieve command fails, it will not revert the "marked" contents.  Hopefully you heeded the warning and have everything in source control. 


## Disclaimer

I have only tested this command with my personal configuration.  As with anything you install, I highly recommend you take time to read the source and understand what it does before executing it.

### LEGAL

THIS SOFTWARE IS PROVIDED "AS IS" AND ANY EXPRESSED OR IMPLIED WARRANTIES, INCLUDING, BUT NOT LIMITED TO, THE IMPLIED WARRANTIES OF MERCHANTABILITY AND FITNESS FOR A PARTICULAR PURPOSE ARE DISCLAIMED. IN NO EVENT SHALL THE REGENTS OR CONTRIBUTORS BE LIABLE FOR ANY DIRECT, INDIRECT, INCIDENTAL, SPECIAL, EXEMPLARY, OR CONSEQUENTIAL DAMAGES (INCLUDING, BUT NOT LIMITED TO, PROCUREMENT OF SUBSTITUTE GOODS OR SERVICES; LOSS OF USE, DATA, OR PROFITS; OR BUSINESS INTERRUPTION) HOWEVER CAUSED AND ON ANY THEORY OF LIABILITY, WHETHER IN CONTRACT, STRICT LIABILITY, OR TORT (INCLUDING NEGLIGENCE OR OTHERWISE) ARISING IN ANY WAY OUT OF THE USE OF THIS SOFTWARE, EVEN IF ADVISED OF THE POSSIBILITY OF SUCH DAMAGE.
