import path from 'path';
import fs from 'fs';
import deep from 'deep-extend';

export default class Locator {
    constructor(options, DEFAULTS) {        
        // upadte all parent classes with the options inherited
        this.options = deep(DEFAULTS, options);
    }

    /**
     * @function
     * @name detectMsBuild15Dir
     * @description - Will try to find the 2017 visual studio path.
     * @param {[String]} [pathRoot] The root directory fir visual studio.
     * @returns {[String]} A path containing the msbuilddir or undefined if not found.
     */

    detectMsBuild15Dir(pathRoot) {
        const vs2017Path = path.join(pathRoot, 'Microsoft Visual Studio', '2017'),
            possibleFolders = ['BuildTools', 'Enterprise', 'Professional', 'Community'];
        for (const possibleFolder of possibleFolders) {
            try {
                const folderPath = path.join(vs2017Path, possibleFolder);
                fs.statSync(folderPath);
                return folderPath;
            } catch (e) {}
        }
    }

    /**
     * @function
     * @name autoDetectVersion
     * @description - Will attempt to find the visual studio exe location.
     * @param {[String]} [pathRoot] The root directory for visual studio.
     * @returns {[String]} A path containing the msbuilddir or undefined if not found.
     */

    autoDetectVersion(pathRoot) {
        // Try to detect MSBuild 15.0.
        const msbuild15Dir = this.detectMsBuild15Dir(pathRoot);
        if (msbuild15Dir) return [msbuild15Dir, 15.0];
        // Detect MSBuild lower than 15.0.
        // ported from https://github.com/stevewillcock/grunt-msbuild/blob/master/tasks/msbuild.js#L167-L181
        const msbuildDir = path.join(pathRoot, 'MSBuild');
        let msbuildDirExists = true;
        try {
            fs.statSync(msbuildDir);
        } catch (e) {
            msbuildDirExists = false;
        }
        if (!msbuildDirExists) return [pathRoot, 4.0];
        const msbuildVersions = fs.readdirSync(msbuildDir)
            .filter(entryName => {
                let binDirExists = true;
                const binDirPath = path.join(msbuildDir, entryName, 'Bin');
                try {
                    fs.statSync(binDirPath);
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

    locate(options) {
        if (!options.platform.match(/^win/)) return 'xbuild';
        let msbuildRoot;
        const is64Bit = options.architecture === 'x64';
        // On 64-bit systems msbuild is always under the x86 directory. If this
        // doesn't exist we are on a 32-bit system. See also:
        // https://blogs.msdn.microsoft.com/visualstudio/2013/07/24/msbuild-is-now-part-of-visual-studio/
        let pathRoot;
        if (is64Bit) {
            pathRoot = process.env['ProgramFiles(x86)'] || 'C:/Program Files (x86)';
        } else {
            pathRoot = process.env['ProgramFiles'] || 'C:/Program Files';
        }
        if (options.toolsVersion === 'auto') {
            const result = this.autoDetectVersion(pathRoot);
            msbuildRoot = result[0]
            options.toolsVersion = result[1];
        } else {
            if (options.toolsVersion === 15.0) {
                let msbuildDir = this.detectMsBuild15Dir(pathRoot);
                msbuildRoot = msbuildDir ? msbuildDir : pathRoot
            } else {
                msbuildRoot = pathRoot;
            }
        }

        const version = this.constants.MSBUILD_VERSIONS[options.toolsVersion];
        if (!version) {
            if (this.options.onError) this.options.onError({
                type : 'error',
                msg : this.constants.PLUGIN_NAME + 'No MSBuild Version was supplied!'
            });
        }
        if (version === '12.0' || version === '14.0' || version === '15.0') {
            const x64_dir = is64Bit ? 'amd64' : '';
            return path.join(msbuildRoot, 'MSBuild', version, 'Bin', x64_dir, 'MSBuild.exe');
        } else {
            const framework = is64Bit ? 'Framework64' : 'Framework';
            return path.join(options.windir, 'Microsoft.Net', framework, version, 'MSBuild.exe');
        }
    }
}