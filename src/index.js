import ScriptGenerator from './script-generator';
import {spawn, spawnSync} from 'child_process';
import os from 'os';
import path from 'path';
import deep from 'deep-extend';


const DEFAULTS = {
    onWebpackPre: {
        options: {},
        hooks : {},
        projects: [],
        parallel: false
    },
    onWebpackPost: {
        options: {},
        hooks : {},
        projects: [],
        parallel: false
    },
    onWebpackDone: {
        options: {},
        hooks : {},
        projects: [],
        parallel: false
    },
    outputConsole: {
        log: console.log,
        error: console.error,
    }
};

export default class WebpackMSBuildPlugin extends ScriptGenerator {
    constructor(options) {
        super(options, DEFAULTS);
        this.hasCustomOutputLog = typeof options.outputConsole.log == 'function';
        this.hasCustomOutputError = typeof options.outputConsole.error == 'function';
        // this.options is set by a subclass when it initiallises
        this.configureScripts(this.options);
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
    log(out, project) {
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
    error(out, project) {
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
    configureScripts() {
        ['onWebpackPre', 'onWebpackPost', 'onWebpackDone'].forEach(hook => {
            if (!this.options[hook] || !this.options[hook].projects || !this.options[hook].projects.length) return;
            // scripts should be an array, a string will indicate default build options will be used, 
            // an object is configurable and will generate a custom script
            this.options[hook].projects = this.options[hook].projects.map( (project, i) => {
                let options = deep({}, this.constants.DEFAULTS, this.options[hook].options || {}, typeof project == 'object' ? project.options || {} : {});
                if (typeof project == 'string') {
                    // update the value of the object
                    return {
                        script: this.getMsBuildScript(project, options),
                        project,
                        options,
                        hooks: {}
                    }
                } else if (typeof project == 'object') {
                    return deep({
                        hooks: {}
                    }, project, {
                        script: this.getMsBuildScript(project.project, options),
                        project: project.project,
                        options
                    });
                } else {
                    throw new Error(`Invalid configuration, project must be either a string or object.`);
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
    runTypeHook(type, name, output) {
        try {
            this.options[type].hooks[name](output);
        } catch(e) {
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
    runProjectHook(name, project, output) {
        try {
            project.hooks[name](output);
        } catch(e) {
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
    spreader(proc, resolve, project) {
        const output = {
            type : 'start',
            project,
            msg : `Executing script asynchronously with spawn${!resolve ? 'Sync' : ''}()`
        };
        this.runProjectHook('onStart', project, output);
        this.log(output, project);        
        proc.stdout.on('data', (data) => {
            this.log({
                type : 'stdout',
                project,
                msg : data.toString()
            }, project);
        });
        proc.stderr.on('data', (data) => {
            this.error({
                type : 'error',
                project,
                msg : data.toString()
            }, project);
        });
        proc.on('close', code => {
            if (code >= 1) this.error({
                type: 'error',
                project: project,
                msg: `Failed with code: ${code}`,
                projects: this.options[project.executionType].projects
            }, project);
            this.options[project.executionType].completedCount += 1;
            const percentage = this.options[project.executionType].completedCount / this.options[project.executionType].projects.length * 100;
            const output = {
                type : 'done',
                project,
                projects: this.options[project.executionType].projects,
                percentageInt: percentage,
                percentage: `${percentage}%`,
                msg : code
            };
            this.runProjectHook('onDone', project, output);
            this.log(output, project);
            this.runTypeHook(project.executionType, 'onProgress', {
                type : 'progress',
                project,
                percentageInt: percentage,
                percentage: `${percentage}%`,
                projects: this.options[project.executionType].projects,
                msg : `Completed ${this.options[project.executionType].completedCount} of ${this.options[project.executionType].projects.length} project scripts: ${project.executionType}`
            });
            if (this.options[project.executionType].projects.length == this.options[project.executionType].completedCount) {
                // we've finished and closed all scripts
                this.runTypeHook(project.executionType, 'onDone', {
                    type : 'done',
                    project,
                    percentageInt: percentage,
                    percentage: `${percentage}%`,
                    projects: this.options[project.executionType].projects,
                    msg : `Completed all ${this.options[project.executionType].projects.length} project scripts: ${project.executionType}`
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
    validateScript(project) {
        if (typeof project.script == 'object' || typeof project.script.executable != 'string') return;
        const msg = `Unsupported script sent. ${project.script.args.length ? project.script.executable: project.script.args[0]}`;
        const output = {
            type : 'error',
            project,
            msg
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
    handleScriptSync(project) {
        this.log({
            type : 'general',
            project,
            msg : `Executing script synchronously with spawnSync()`
        }, project);
        this.spreader(spawnSync(project.script.executable, project.script.args || []), undefined, project);
    }

    /**
     * @description - For Asyncronous builds - It will resolve and return a promise when the input project script is closed.
     * Once closed the next script is able to execute.
     * @param {any} project - the current project object
     * @returns {handleScriptAsync} - the promise to automatically resolve by the spreader
     * @memberof WebpackMSBuildPlugin
     */
    handleScriptAsync(project) {
        return new Promise(resolve => {            
            this.spreader(spawn(project.script.executable, project.script.args || []), resolve, project);
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
    async executeScripts(type) {
        const groupType = this.options[type];  
        if (typeof groupType != 'object' || !groupType.projects || !groupType.projects.length) return;
        if (typeof groupType.parallel !== 'boolean') {
            this.error({
                type : 'error',
                msg : `Configuration not supported on ${type}, parallel must be a boolean`
            });            
        }
        // start a counter
        groupType.completedCount = 0;
        const startOutput = {
            type : 'start',
            projects: groupType.projects,
            msg: `${groupType.projects.length} project scripts to execute: ${type}`
        };
        this.log(startOutput);
        this.runTypeHook(type, 'onStart', startOutput);
        // validate the current project
        for (const project of groupType.projects) {
            this.validateScript(project);
            project.executionType = type;            
            if (groupType.parallel) {
                this.handleScriptSync(project);
            } else {
                await this.handleScriptAsync(project);                
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
    apply(compiler) {
        const $plugin = 'WebpackMSBuild';
        compiler.hooks.compile.tap($plugin, compilation => {
            this.executeScripts('onWebpackPre');
        });
        compiler.hooks.afterEmit.tap($plugin, (compilation, callback) => {
            this.executeScripts('onWebpackPost');
        });
        compiler.hooks.done.tap($plugin, () => {
            this.executeScripts('onWebpackDone');
        });
    }
}