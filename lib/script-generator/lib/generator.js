'use strict';

Object.defineProperty(exports, "__esModule", {
    value: true
});

var _slicedToArray = function () { function sliceIterator(arr, i) { var _arr = []; var _n = true; var _d = false; var _e = undefined; try { for (var _i = arr[Symbol.iterator](), _s; !(_n = (_s = _i.next()).done); _n = true) { _arr.push(_s.value); if (i && _arr.length === i) break; } } catch (err) { _d = true; _e = err; } finally { try { if (!_n && _i["return"]) _i["return"](); } finally { if (_d) throw _e; } } return _arr; } return function (arr, i) { if (Array.isArray(arr)) { return arr; } else if (Symbol.iterator in Object(arr)) { return sliceIterator(arr, i); } else { throw new TypeError("Invalid attempt to destructure non-iterable instance"); } }; }();

var _createClass = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }();

var _locator = require('./locator');

var _locator2 = _interopRequireDefault(_locator);

var _deepExtend = require('deep-extend');

var _deepExtend2 = _interopRequireDefault(_deepExtend);

var _path = require('path');

var _path2 = _interopRequireDefault(_path);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

function _possibleConstructorReturn(self, call) { if (!self) { throw new ReferenceError("this hasn't been initialised - super() hasn't been called"); } return call && (typeof call === "object" || typeof call === "function") ? call : self; }

function _inherits(subClass, superClass) { if (typeof superClass !== "function" && superClass !== null) { throw new TypeError("Super expression must either be null or a function, not " + typeof superClass); } subClass.prototype = Object.create(superClass && superClass.prototype, { constructor: { value: subClass, enumerable: false, writable: true, configurable: true } }); if (superClass) Object.setPrototypeOf ? Object.setPrototypeOf(subClass, superClass) : subClass.__proto__ = superClass; }

var Generator = function (_Locator) {
    _inherits(Generator, _Locator);

    function Generator(options, DEFAULTS) {
        _classCallCheck(this, Generator);

        return _possibleConstructorReturn(this, (Generator.__proto__ || Object.getPrototypeOf(Generator)).call(this, options, DEFAULTS));
        // this.options is set by a subclass when it initiallises   
    }

    /**
     * @function
     * @name generate         
     * @description - This will generate an object containing the args to send to the exe, and the executable path.
     * @param {[String]} [file] - the filename/path to send to the msbuild executable
     * @param {[Object]} [options] - The options object for the msbuild task
     * @returns {[Object]} An object containing data to send back to the wrapper
     * @usedby Wrapper class.
     */

    _createClass(Generator, [{
        key: 'generate',
        value: function generate(file, options) {
            if (!options || Object.keys(options).length <= 0) {
                if (this.options.onError) this.options.onError({
                    type: 'error',
                    msg: this.constants.PLUGIN_NAME + 'No options specified!'
                });
                throw new Error(this.constants.PLUGIN_NAME + 'No options specified!');
            }
            // if no msbuildpath is specified, try to locate it.
            if (!options.msbuildPath) options.msbuildPath = this.locate(options);
            // grab our options to setup arguments for the exe.
            this.newOptions = JSON.parse(JSON.stringify(options));
            // template literal expression detector
            this.template = '<%= file.path %>';
            // loop over keys on the options object to generate the arguments.
            var _iteratorNormalCompletion = true;
            var _didIteratorError = false;
            var _iteratorError = undefined;

            try {
                for (var _iterator = Object.entries(this.newOptions.properties)[Symbol.iterator](), _step; !(_iteratorNormalCompletion = (_step = _iterator.next()).done); _iteratorNormalCompletion = true) {
                    var _step$value = _slicedToArray(_step.value, 2),
                        prop = _step$value[0],
                        value = _step$value[1];

                    // only bother running these checks if the inbound value is a string.
                    if (typeof value == 'string' && value.indexOf(this.template) > -1) {
                        if (this.options.onOutput) this.options.onOutput({
                            type: 'general',
                            msg: 'Replacing ' + this.template + ' with ' + file
                        });
                        this.newOptions.properties[prop] = value.replace(this.template, file);
                    }
                }
                // generate our arguments for the exe.
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

            this.args = this.buildArguments(this.newOptions);
            return {
                executable: _path2.default.normalize(options.msbuildPath),
                args: [file].concat(this.args)
            };
        }

        /**
         * @function
         * @name add         
         * @description - Simply method to add arguments to the args array
         * @param {[String]} [arg] - The argument to add the the args array
         * @returns {[undefined]} no return value
         */

    }, {
        key: 'add',
        value: function add(arg) {
            this.args.push(arg);
        }

        /**
         * @function
         * @name buildArguments         
         * @description - This will generate an object containing the args to send to the exe, and the executable path.
         * @param {[String]} [file] - the filename/path to send to the msbuild executable
         * @param {[Object]} [options] - The options object for the msbuild task
         * @returns {[Object]} An object containing data to send back to the wrapper
         * @usedby Wrapper class.
         */

    }, {
        key: 'buildArguments',
        value: function buildArguments(options) {
            this.args = [];
            this.add('/target:' + options.targets.join(';'));
            this.add('/verbosity:' + options.verbosity);
            this.add('/target:' + options.targets.join(';'));
            if (options.toolsVersion) {
                var version = parseFloat(options.toolsVersion).toFixed(1);
                if (isNaN(version)) version = '4.0';
                this.add('/toolsversion:' + version);
            }
            if (options.nologo) this.add('/nologo');
            if (options.fileLoggerParameters) this.add('/flp:' + options.fileLoggerParameters);
            if (options.consoleLoggerParameters) this.add('/clp:' + options.consoleLoggerParameters);
            if (options.loggerParameters) this.add('/logger:' + options.loggerParameters);
            // xbuild does not support the `maxcpucount` argument and throws if provided
            if (options.maxcpucount >= 0 && options.msbuildPath !== 'xbuild') {
                this.add('/maxcpucount' + (options.maxcpucount === 0 ? '' : ':' + options.maxcpucount));
            }
            if (options.nodeReuse === false) this.add('/nodeReuse:False');
            if (options.configuration) {
                // will set the value if not already set inside the options object.
                options.properties = (0, _deepExtend2.default)({
                    'Configuration': options.configuration
                }, options.properties);
            }
            if (options.solutionPlatform) {
                // will set the value if not already set inside the options object.
                options.properties = (0, _deepExtend2.default)({
                    'Platform': options.solutionPlatform
                }, options.properties);
            }
            // loop over all properties and push into args array.
            var _iteratorNormalCompletion2 = true;
            var _didIteratorError2 = false;
            var _iteratorError2 = undefined;

            try {
                for (var _iterator2 = Object.entries(options.properties)[Symbol.iterator](), _step2; !(_iteratorNormalCompletion2 = (_step2 = _iterator2.next()).done); _iteratorNormalCompletion2 = true) {
                    var _step2$value = _slicedToArray(_step2.value, 2),
                        property = _step2$value[0],
                        value = _step2$value[1];

                    this.add('/property:' + property + '=' + value);
                }
            } catch (err) {
                _didIteratorError2 = true;
                _iteratorError2 = err;
            } finally {
                try {
                    if (!_iteratorNormalCompletion2 && _iterator2.return) {
                        _iterator2.return();
                    }
                } finally {
                    if (_didIteratorError2) {
                        throw _iteratorError2;
                    }
                }
            }

            if (options.customArgs) this.args = this.args.concat(options.customArgs);
            return this.args;
        }
    }]);

    return Generator;
}(_locator2.default);

exports.default = Generator;