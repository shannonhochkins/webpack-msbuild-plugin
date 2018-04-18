import Locator from './locator';
import deep from 'deep-extend';
import path from 'path';

export default class Generator extends Locator {
    constructor(options, DEFAULTS) {
        super(options, DEFAULTS);     
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

    generate(file, options) {
        if (!options || Object.keys(options).length <= 0) {
            if (this.options.onError) this.options.onError({
                type : 'error',
                msg : this.constants.PLUGIN_NAME + 'No options specified!'
            });
            throw new Error(this.constants.PLUGIN_NAME + 'No options specified!');
        }
        // if no msbuildpath is specified, try to locate it.
        if (!options.msbuildPath) options.msbuildPath = this.locate(options);
        // grab our options to setup arguments for the exe.
        this.newOptions = JSON.parse(JSON.stringify(options));
        // template literal expression detector
        this.template = `<%= file.path %>`;
        // loop over keys on the options object to generate the arguments.
        for (const [prop, value] of Object.entries(this.newOptions.properties)) {
            // only bother running these checks if the inbound value is a string.
            if (typeof value == 'string' && value.indexOf(this.template) > -1) {
                if (this.options.onOutput) this.options.onOutput({
                    type :'general',
                    msg : `Replacing ${this.template} with ${file}`
                });
                this.newOptions.properties[prop] = value.replace(this.template, file);
            }
        }
        // generate our arguments for the exe.
        this.args = this.buildArguments(this.newOptions);
        return {
            executable: path.normalize(options.msbuildPath),
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

    add(arg) {
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

    buildArguments(options) {
        this.args = [];
        this.add('/target:' + options.targets.join(';'));
        this.add('/verbosity:' + options.verbosity);
        this.add('/target:' + options.targets.join(';'));
        if (options.toolsVersion) {
            let version = parseFloat(options.toolsVersion).toFixed(1);
            if (isNaN(version)) version = '4.0';
            this.add('/toolsversion:' + version);
        }
        if (options.nologo) this.add('/nologo');
        if (options.fileLoggerParameters) this.add('/flp:' + options.fileLoggerParameters);
        if (options.consoleLoggerParameters) this.add('/clp:' + options.consoleLoggerParameters);
        if (options.loggerParameters) this.add('/logger:' + options.loggerParameters);
        // xbuild does not support the `maxcpucount` argument and throws if provided
        if (options.maxcpucount >= 0 && options.msbuildPath !== 'xbuild') {
            this.add(`/maxcpucount${options.maxcpucount === 0 ? '' : ':' + options.maxcpucount}`);
        }
        if (options.nodeReuse === false) this.add('/nodeReuse:False');
        if (options.configuration) {
            // will set the value if not already set inside the options object.
            options.properties = deep({
                'Configuration': options.configuration
            }, options.properties);
        }
        if (options.solutionPlatform) {
            // will set the value if not already set inside the options object.
            options.properties = deep({
                'Platform': options.solutionPlatform
            }, options.properties);
        }
        // loop over all properties and push into args array.
        for (const [property, value] of Object.entries(options.properties)) this.add('/property:' + property + '=' + value);
        if (options.customArgs) this.args = this.args.concat(options.customArgs);
        return this.args;
    };

}