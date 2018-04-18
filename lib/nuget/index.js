'use strict';

Object.defineProperty(exports, "__esModule", {
	value: true
});

var _createClass = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }();

var _child_process = require('child_process');

var _path = require('path');

var _path2 = _interopRequireDefault(_path);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

var Nuget = function () {
	function Nuget($parent) {
		_classCallCheck(this, Nuget);

		this.$parent = $parent;
	}

	/**
  * @function
  * @name restore
  * @decription - Will get missing nuget packages, or skip them if they're already there.
  */

	_createClass(Nuget, [{
		key: 'restore',
		value: async function restore(resolve, reject) {
			this.$parent.$interface.info('Restoring Nuget packages');
			await this.nuget({
				file: _path2.default.resolve(this.$parent.paths.root, 'dj.sln')
			});
		}

		/**
   * @description Restoring Nuget packages for the microsoft platform.
   * @function
   * @name nuget
   * @description - We can restore our packages by using the nuget executable, we can
   * use execFile and pase it arguments as we need to.
   */

	}, {
		key: 'nuget',
		value: function nuget(options) {
			var _this = this;

			var nugetPath = _path2.default.join(__dirname, './nuget.exe'),
			    monoPath = null,
			    cmdArgs = ["restore"],
			    file = options.file || null,
			    targetFile = nugetPath;

			if (options) {
				nugetPath = options.nugetPath || nugetPath;
				monoPath = options.monoPath || monoPath;
				if (options.additionalArgs && options.additionalArgs.length > 0) {
					cmdArgs = cmdArgs.concat(options.additionalArgs);
				}
			}
			if (monoPath && monoPath.length > 0) {
				targetFile = monoPath;
				cmdArgs.unshift(nugetPath);
			}
			cmdArgs.push(file);
			return new Promise(function (resolve, reject) {
				return (0, _child_process.execFile)(targetFile, cmdArgs, function (error, stdout, stderror) {
					if (stdout.trim()) _this.$parent.$interface.info(stdout);
					// only log this out if there's output in the stdout, but not error, error will log itself later
					if (stderror.trim() && !error) _this.$parent.$interface.title('error', 'ERROR', 'Nuget standard error: ' + stderror);
					if (error) {
						reject({ msg: error, loc: 'Nuget.exe' });
					}
					if (resolve) resolve(options);
				});
			});
		}
	}]);

	return Nuget;
}();

exports.default = Nuget;