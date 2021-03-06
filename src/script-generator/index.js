import Generator from './lib/generator';
import constants from './lib/constants';
import path from 'path';
import deep from 'deep-extend';

export default class Spawn extends Generator {
    constructor(options, DEFAULTS) {
        super(options, DEFAULTS);
        // this.options is set by a subclass when it initiallises
        this.constants = constants;
    }

    /**
     * @function
     * @name slash
     * @description - Simply method to replace strings that have slashes that create octal string errors when trying to parse them as
     * a valid path to a file.
     * @param {[string]} [str] - The string to process
     * @returns {[string]} The original string or the manipulated string
     * @example 
     *      some\path\to\program files\
     * 
     * willl  be converted to:
     * 
     *      some/path/to/program files/
     */

    slash(str) {
        const isExtendedLengthPath = /^\\\\\?\\/.test(str);
        const hasNonAscii = /[^\x00-\x80]+/.test(str);
        if (isExtendedLengthPath || hasNonAscii) return str;
        return str.replace(/\\/g, '/');
    }

    /**
     * @function
     * @name getMsBuildScript
     * @description - A simple method to perform some checking before actually processing the 
     * build task. This will spawn a new process for the current inbound file, options can be specified
     * for each instance, you can spawn multiple msBuilds at once concurrently if your projects
     * don't have dependencies on each other.
     * @see lib/constants for the options available.
     * @param {[Object]} [file] - This should be a file object generated by file.parse('filename');
     * @param {[Object]} [options] - This is the options to send the msbuild task
     * @returns {[Promise]} A promise to handle for anything using the msbuilder, the resolve/reject will receive 
     * the inbound file object for the resolve an rejection,
     * and any errors as second argument in the rejection.
     */

    getMsBuildScript(file, options) {
        const mergedOptions = JSON.parse(JSON.stringify(deep(this.constants.DEFAULTS, options)));
        // parse the input file to extract some information and santize
        file = path.parse(file);
        // create filename
        this.filename = path.join(file.dir, file.base);         
        // generate method comes from
        this.command = this.generate(this.filename, mergedOptions);
        // return the object to the client
        return {
            args: this.command.args.map(arg => this.slash(arg)),
            executable: this.slash(this.command.executable)
        };
    }

}