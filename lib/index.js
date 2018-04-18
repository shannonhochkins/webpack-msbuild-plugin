'use strict';

Object.defineProperty(exports, "__esModule", {
    value: true
});

var _typeof = typeof Symbol === "function" && typeof Symbol.iterator === "symbol" ? function (obj) { return typeof obj; } : function (obj) { return obj && typeof Symbol === "function" && obj.constructor === Symbol && obj !== Symbol.prototype ? "symbol" : typeof obj; };

var _createClass = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }();

var _scriptGenerator = require('./script-generator');

var _scriptGenerator2 = _interopRequireDefault(_scriptGenerator);

var _child_process = require('child_process');

var _os = require('os');

var _os2 = _interopRequireDefault(_os);

var _path = require('path');

var _path2 = _interopRequireDefault(_path);

var _deepExtend = require('deep-extend');

var _deepExtend2 = _interopRequireDefault(_deepExtend);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

function _possibleConstructorReturn(self, call) { if (!self) { throw new ReferenceError("this hasn't been initialised - super() hasn't been called"); } return call && (typeof call === "object" || typeof call === "function") ? call : self; }

function _inherits(subClass, superClass) { if (typeof superClass !== "function" && superClass !== null) { throw new TypeError("Super expression must either be null or a function, not " + typeof superClass); } subClass.prototype = Object.create(superClass && superClass.prototype, { constructor: { value: subClass, enumerable: false, writable: true, configurable: true } }); if (superClass) Object.setPrototypeOf ? Object.setPrototypeOf(subClass, superClass) : subClass.__proto__ = superClass; }

var DEFAULTS = {
    onWebpackPre: {
        options: {},
        hooks: {},
        projects: [],
        parallel: false
    },
    onWebpackPost: {
        options: {},
        hooks: {},
        projects: [],
        parallel: false
    },
    onWebpackDone: {
        options: {},
        hooks: {},
        projects: [],
        parallel: false
    },
    outputConsole: {
        log: console.log,
        error: console.error
    }
};

var WebpackMSBuildPlugin = function (_ScriptGenerator) {
    _inherits(WebpackMSBuildPlugin, _ScriptGenerator);

    function WebpackMSBuildPlugin(options) {
        _classCallCheck(this, WebpackMSBuildPlugin);

        var _this = _possibleConstructorReturn(this, (WebpackMSBuildPlugin.__proto__ || Object.getPrototypeOf(WebpackMSBuildPlugin)).call(this, options, DEFAULTS));

        _this.hasCustomOutputLog = typeof options.outputConsole.log == 'function';
        _this.hasCustomOutputError = typeof options.outputConsole.error == 'function';
        // this.options is set by a subclass when it initiallises
        _this.configureScripts(_this.options);
        return _this;
    }

    /**
     * @description - a helper method to run hooks and process console automation.
     * 
     * @param {any} out - the output object to send to the hook or the custom output log function, if no custom output console is
     * used, it will just use console log and output the msg directly.
     * @param {any} project - optional argument, if present it will try to run the hook on the project object if it exists.
     * @returns {undefined} no return value
     * @memberof WebpackMSBuildPlugin
     */


    _createClass(WebpackMSBuildPlugin, [{
        key: 'log',
        value: function log(out, project) {
            this.options.outputConsole.log(this.hasCustomOutputLog ? out : out.msg);
            if (project) this.runProjectHook('onData', project, out);
        }

        /**
         * @description - a helper method to run hooks and process console automation.
         * This will also throw the error sent to the out object and the message will be the msg key on the out object..
         * @param {any} out - the output object to send to the hook or the custom output log function, if no custom output console is
         * used, it will just use console log and output the msg directly.     
         * @param {any} project - optional argument, if present it will try to run the hook on the project object if it exists.
         * @returns {undefined} no return value
         * @memberof WebpackMSBuildPlugin
         */

    }, {
        key: 'error',
        value: function error(out, project) {
            this.options.outputConsole.error(this.hasCustomOutputError ? out : out.msg);
            if (project) this.runProjectHook('onError', project, out);
            throw new Error(out.msg);
        }

        /**
         * @description - Will loop over the three main 'type groups' in "when" we can run our project scripts, this will loop over
         * all three, santize the input values on the config object when we instantiate the plugin and make sure everything is okay. 
         * It will also automatically generate a msbuild script based on the project path with optional options object.
         * The options object is very important
         * 
         * We can have an options object on the group level:
         * 
         * onWebpackPost: {
         *      // optional - extends the msbuild script defaults when present
         *      options : {
         *      },
         *      projects : [
         *          {
         *              project : 'path/to/project.csproj',
         *              // optional - extends the onWebpackPost.options object if it exists, else it will extend the defaults
         *              options : {
        *               }
         *          }
         *      ]
         * }
         * 
         * @returns {undefined} no return value
         * @memberof WebpackMSBuildPlugin
         */

    }, {
        key: 'configureScripts',
        value: function configureScripts() {
            var _this2 = this;

            ['onWebpackPre', 'onWebpackPost', 'onWebpackDone'].forEach(function (hook) {
                if (!_this2.options[hook] || !_this2.options[hook].projects || !_this2.options[hook].projects.length) return;
                // scripts should be an array, a string will indicate default build options will be used, 
                // an object is configurable and will generate a custom script
                _this2.options[hook].projects = _this2.options[hook].projects.map(function (project, i) {
                    var options = (0, _deepExtend2.default)({}, _this2.constants.DEFAULTS, _this2.options[hook].options || {}, (typeof project === 'undefined' ? 'undefined' : _typeof(project)) == 'object' ? project.options || {} : {});
                    if (typeof project == 'string') {
                        // update the value of the object
                        return {
                            script: _this2.getMsBuildScript(project, options),
                            project: project,
                            options: options,
                            hooks: {}
                        };
                    } else if ((typeof project === 'undefined' ? 'undefined' : _typeof(project)) == 'object') {
                        return (0, _deepExtend2.default)({
                            hooks: {}
                        }, project, {
                            script: _this2.getMsBuildScript(project.project, options),
                            project: project.project,
                            options: options
                        });
                    } else {
                        throw new Error('Invalid configuration, project must be either a string or object.');
                    }
                });
            });
        }

        /**
         * @description - Will run the hooks (if present) present on the current group type, there are three hooks available:
         * 
         * onWebpackPost: {
         *      // called when we're about to start processing the scripts
         *      onStart: data => {
         *          console.log(data.msg);
         *      },
         *      // will be called if there's more than one project script to run
         *      // this will fire at the end of one script closing
         *      onProgress: data => {
         *          console.log(data.msg);
         *      },
         *      // called when a script closes and it's the last script to run
         *      onDone: data => {
         *          console.log(data.msg);
         *      }
         * }
         * @param {string} [type] - the group type to run ['onWebpackPre', 'onWebpackPost', 'onWebpackDone']
         * @param {string} [name] - The name of the hook [onStart, onProgress, onDone]
         * @param {object} [output] - the data to send to the hook
         * @returns {undefined} no return value
         * @memberof WebpackMSBuildPlugin
         */

    }, {
        key: 'runTypeHook',
        value: function runTypeHook(type, name, output) {
            try {
                this.options[type].hooks[name](output);
            } catch (e) {
                // hook must not exist or arguments passed were wrong.
            }
        }

        /**
         * @description - Will attempt to run hooks at the project level (if present on object)
         * 
         * onWebpackPost: {
                projects : [
                    {
                        project : 'path/to/project.csproj',
                        hooks : {
                            onStart(data) {
                              },
                            onDone(data) {
                              },
                            onData(data) {
                                will recieve data from this plugin and also from the stdout process stream
                            },
                            onError(data) {
                              }
                        }
                    }
                ]
         * }
         * @param {string} [type] - the group type to run ['onWebpackPre', 'onWebpackPost', 'onWebpackDone']
         * @param {string} [name] - The name of the hook [onStart, onProgress, onDone]
         * @param {object} [output] - the data to send to the hook
         * @returns {undefined} no return value
         * @memberof WebpackMSBuildPlugin
         */

    }, {
        key: 'runProjectHook',
        value: function runProjectHook(name, project, output) {
            try {
                project.script.hooks[name](output);
            } catch (e) {
                // hook must not exist or arguments passed were wrong.
            }
        }

        /**
         * @description - A helper method to automatically bind to the process for both parallell
         * and non parallel executions - this way both have the same hooks and logic available.
         * @param {any} proc - the current process
         * @param {any} resolve - the resolver (if present) to resolve the parent promise (only used in non parallel executions)
         * @param {any} project - the current project object
         * @returns {undefined} - no return value
         * @memberof WebpackMSBuildPlugin
         */

    }, {
        key: 'spreader',
        value: function spreader(proc, resolve, project) {
            var _this3 = this;

            var output = {
                type: 'start',
                project: project,
                msg: 'Executing script asynchronously with spawn' + (!resolve ? 'Sync' : '') + '()'
            };
            this.runProjectHook('onStart', project, output);
            this.log(output, project);
            proc.stdout.on('data', function (data) {
                _this3.log({
                    type: 'stdout',
                    project: project,
                    msg: data.toString()
                }, project);
            });
            proc.stderr.on('data', function (data) {
                _this3.error({
                    type: 'error',
                    project: project,
                    msg: data.toString()
                }, project);
            });
            proc.on('close', function (code) {
                var output = {
                    type: 'done',
                    project: project,
                    msg: code
                };
                _this3.runProjectHook('onDone', project, output);
                _this3.log(output, project);
                _this3.options[project.executionType].completedCount += 1;
                if (_this3.options[project.executionType].projects.length == _this3.options[project.executionType].completedCount) {
                    // we've finished and closed all scripts
                    _this3.runTypeHook(project.executionType, 'onDone', {
                        type: 'done',
                        projects: _this3.options[project.executionType].projects,
                        msg: 'Completed all ' + _this3.options[project.executionType].projects.length + ' project scripts: ' + project.executionType
                    });
                } else {
                    _this3.runTypeHook(project.executionType, 'onProgress', {
                        type: 'progress',
                        projects: _this3.options[project.executionType].projects,
                        msg: 'Completed ' + _this3.options[project.executionType].completedCount + ' of ' + _this3.options[project.executionType].projects.length + ' project scripts: ' + project.executionType
                    });
                }
                if (resolve) resolve(output);
            });
        }

        /**
         * @description -Makes sure we have a script object inside our project object, with the script containing the msbuild executable
         * @param {any} project - the current project object
         * @returns {undefined} - no return value
         * @memberof WebpackMSBuildPlugin
         */

    }, {
        key: 'validateScript',
        value: function validateScript(project) {
            if (_typeof(project.script) == 'object' || typeof project.script.executable != 'string') return;
            var msg = 'Unsupported script sent. ' + (project.script.args.length ? project.script.executable : project.script.args[0]);
            var output = {
                type: 'error',
                project: project,
                msg: msg
            };
            this.error(output, project);
        }

        /**
         * @description - For syncronous builds - it will just call them all at once and they'll close when they finish, bind to the hooks
         * to catch when the process is done.
         * @param {any} project - the current project object
         * @returns {undefined} - no return value
         * @memberof WebpackMSBuildPlugin
         */

    }, {
        key: 'handleScriptSync',
        value: function handleScriptSync(project) {
            this.log({
                type: 'general',
                project: project,
                msg: 'Executing script synchronously with spawnSync()'
            }, project);
            this.spreader((0, _child_process.spawnSync)(project.script.executable, project.script.args || []), undefined, project);
        }

        /**
         * @description - For Asyncronous builds - It will resolve and return a promise when the input project script is closed.
         * Once closed the next script is able to execute.
         * @param {any} project - the current project object
         * @returns {handleScriptAsync} - the promise to automatically resolve by the spreader
         * @memberof WebpackMSBuildPlugin
         */

    }, {
        key: 'handleScriptAsync',
        value: function handleScriptAsync(project) {
            var _this4 = this;

            return new Promise(function (resolve) {
                _this4.spreader((0, _child_process.spawn)(project.script.executable, project.script.args || []), resolve, project);
            });
        }

        /**
         * @description - This will grab the group (if present), look for projects (if present), then
         * start to execute the scripts in the projects array in order they're included.
         * We can choose to run them in parallell or not parallel
         * @param {string} type - The type of 'group' to execute and process.
         * @returns {undefined} - no return value
         * @memberof WebpackMSBuildPlugin
         */

    }, {
        key: 'executeScripts',
        value: async function executeScripts(type) {
            var groupType = this.options[type];
            if ((typeof groupType === 'undefined' ? 'undefined' : _typeof(groupType)) != 'object' || !groupType.projects || !groupType.projects.length) return;
            if (typeof groupType.parallel !== 'boolean') {
                this.error({
                    type: 'error',
                    msg: 'Configuration not supported on ' + type + ', parallel must be a boolean'
                });
            }
            // start a counter
            groupType.completedCount = 0;
            var startOutput = {
                type: 'start',
                projects: groupType.projects,
                msg: groupType.projects.length + ' project scripts to execute: ' + type
            };
            this.log(startOutput);
            this.runTypeHook(type, 'onStart', startOutput);
            // validate the current project
            var _iteratorNormalCompletion = true;
            var _didIteratorError = false;
            var _iteratorError = undefined;

            try {
                for (var _iterator = groupType.projects[Symbol.iterator](), _step; !(_iteratorNormalCompletion = (_step = _iterator.next()).done); _iteratorNormalCompletion = true) {
                    var project = _step.value;

                    this.validateScript(project);
                    project.executionType = type;
                    if (groupType.parallel) {
                        this.handleScriptSync(project);
                    } else {
                        await this.handleScriptAsync(project);
                    }
                }
            } catch (err) {
                _didIteratorError = true;
                _iteratorError = err;
            } finally {
                try {
                    if (!_iteratorNormalCompletion && _iterator.return) {
                        _iterator.return();
                    }
                } finally {
                    if (_didIteratorError) {
                        throw _iteratorError;
                    }
                }
            }
        }

        /**
         * @description - Every webpkac plugin must have an apply method, which receives the compiler, then we can bind to the webpack hooks
         * we care about and make sure we execute the scripts on the groups we've allocated on the config object for the plugin.
         * - onWebpackPre
         * - onWebpackPost
         * - onWebpackDone
         * @param {any} compiler - The current webpack compiler
         * @returns {undefined} - no return value
         * @memberof WebpackMSBuildPlugin
         */

    }, {
        key: 'apply',
        value: function apply(compiler) {
            var _this5 = this;

            var $plugin = 'WebpackMSBuild';
            compiler.hooks.compile.tap($plugin, function (compilation) {
                _this5.executeScripts('onWebpackPre');
            });
            compiler.hooks.afterEmit.tap($plugin, function (compilation, callback) {
                _this5.executeScripts('onWebpackPost');
            });
            compiler.hooks.done.tap($plugin, function () {
                _this5.executeScripts('onWebpackDone');
            });
        }
    }]);

    return WebpackMSBuildPlugin;
}(_scriptGenerator2.default);

exports.default = WebpackMSBuildPlugin;