'use strict';

Object.defineProperty(exports, "__esModule", {
    value: true
});

var _createClass = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }();

var _path = require('path');

var _path2 = _interopRequireDefault(_path);

var _fs = require('fs');

var _fs2 = _interopRequireDefault(_fs);

var _deepExtend = require('deep-extend');

var _deepExtend2 = _interopRequireDefault(_deepExtend);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

var Locator = function () {
    function Locator(options, DEFAULTS) {
        _classCallCheck(this, Locator);

        // upadte all parent classes with the options inherited
        this.options = (0, _deepExtend2.default)(DEFAULTS, options);
    }

    /**
     * @function
     * @name detectMsBuild15Dir
     * @description - Will try to find the 2017 visual studio path.
     * @param {[String]} [pathRoot] The root directory fir visual studio.
     * @returns {[String]} A path containing the msbuilddir or undefined if not found.
     */

    _createClass(Locator, [{
        key: 'detectMsBuild15Dir',
        value: function detectMsBuild15Dir(pathRoot) {
            var vs2017Path = _path2.default.join(pathRoot, 'Microsoft Visual Studio', '2017'),
                possibleFolders = ['BuildTools', 'Enterprise', 'Professional', 'Community'];
            var _iteratorNormalCompletion = true;
            var _didIteratorError = false;
            var _iteratorError = undefined;

            try {
                for (var _iterator = possibleFolders[Symbol.iterator](), _step; !(_iteratorNormalCompletion = (_step = _iterator.next()).done); _iteratorNormalCompletion = true) {
                    var possibleFolder = _step.value;

                    try {
                        var folderPath = _path2.default.join(vs2017Path, possibleFolder);
                        _fs2.default.statSync(folderPath);
                        return folderPath;
                    } catch (e) {}
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
         * @function
         * @name autoDetectVersion
         * @description - Will attempt to find the visual studio exe location.
         * @param {[String]} [pathRoot] The root directory for visual studio.
         * @returns {[String]} A path containing the msbuilddir or undefined if not found.
         */

    }, {
        key: 'autoDetectVersion',
        value: function autoDetectVersion(pathRoot) {
            // Try to detect MSBuild 15.0.
            var msbuild15Dir = this.detectMsBuild15Dir(pathRoot);
            if (msbuild15Dir) return [msbuild15Dir, 15.0];
            // Detect MSBuild lower than 15.0.
            // ported from https://github.com/stevewillcock/grunt-msbuild/blob/master/tasks/msbuild.js#L167-L181
            var msbuildDir = _path2.default.join(pathRoot, 'MSBuild');
            var msbuildDirExists = true;
            try {
                _fs2.default.statSync(msbuildDir);
            } catch (e) {
                msbuildDirExists = false;
            }
            if (!msbuildDirExists) return [pathRoot, 4.0];
            var msbuildVersions = _fs2.default.readdirSync(msbuildDir).filter(function (entryName) {
                var binDirExists = true;
                var binDirPath = _path2.default.join(msbuildDir, entryName, 'Bin');
                try {
                    _fs2.default.statSync(binDirPath);
                } catch (e) {
                    binDirExists = false;
                }
                return entryName.indexOf('1') === 0 && binDirExists;
            });
            // Return latest installed msbuild version
            if (msbuildVersions.length > 0) return [pathRoot, parseFloat(msbuildVersions.pop())];
        }

        /**
         * @function
         * @name locate
         * @description - Will attempt to find the visual studio exe location.
         * @param {[String]} [options] - The options object for the msbuild, it should contain the platform, architecure etc.
         * @returns {[String]} A path containing the msbuilddir or undefined if not found.
         */

    }, {
        key: 'locate',
        value: function locate(options) {
            if (!options.platform.match(/^win/)) return 'xbuild';
            var msbuildRoot = void 0;
            var is64Bit = options.architecture === 'x64';
            // On 64-bit systems msbuild is always under the x86 directory. If this
            // doesn't exist we are on a 32-bit system. See also:
            // https://blogs.msdn.microsoft.com/visualstudio/2013/07/24/msbuild-is-now-part-of-visual-studio/
            var pathRoot = void 0;
            if (is64Bit) {
                pathRoot = process.env['ProgramFiles(x86)'] || 'C:/Program Files (x86)';
            } else {
                pathRoot = process.env['ProgramFiles'] || 'C:/Program Files';
            }
            if (options.toolsVersion === 'auto') {
                var result = this.autoDetectVersion(pathRoot);
                msbuildRoot = result[0];
                options.toolsVersion = result[1];
            } else {
                if (options.toolsVersion === 15.0) {
                    var msbuildDir = this.detectMsBuild15Dir(pathRoot);
                    msbuildRoot = msbuildDir ? msbuildDir : pathRoot;
                } else {
                    msbuildRoot = pathRoot;
                }
            }

            var version = this.constants.MSBUILD_VERSIONS[options.toolsVersion];
            if (!version) {
                if (this.options.onError) this.options.onError({
                    type: 'error',
                    msg: this.constants.PLUGIN_NAME + 'No MSBuild Version was supplied!'
                });
            }
            if (version === '12.0' || version === '14.0' || version === '15.0') {
                var x64_dir = is64Bit ? 'amd64' : '';
                return _path2.default.join(msbuildRoot, 'MSBuild', version, 'Bin', x64_dir, 'MSBuild.exe');
            } else {
                var framework = is64Bit ? 'Framework64' : 'Framework';
                return _path2.default.join(options.windir, 'Microsoft.Net', framework, version, 'MSBuild.exe');
            }
        }
    }]);

    return Locator;
}();

exports.default = Locator;