"use strict";
exports.__esModule = true;
var ts = require("typescript");
function createDiagnosticReporter(pretty) {
    var host = {
        getCurrentDirectory: function () { return ts.sys.getCurrentDirectory(); },
        getNewLine: function () { return ts.sys.newLine; },
        getCanonicalFileName: ts.sys.useCaseSensitiveFileNames
            ? function (x) { return x; }
            : function (x) { return x.toLowerCase(); }
    };
    if (!pretty) {
        return function (diagnostic) { return ts.sys.write(ts.formatDiagnostic(diagnostic, host)); };
    }
    return function (diagnostic) {
        ts.sys.write(ts.formatDiagnosticsWithColorAndContext([diagnostic], host) + host.getNewLine());
    };
}
function default_1(emitters, handleErrors) {
    var _a, _b;
    if (handleErrors === void 0) { handleErrors = false; }
    console.log('Parsing...');
    var commandLine = ts.parseCommandLine(ts.sys.args);
    if (!commandLine.options.project) {
        commandLine.options.project = 'tsconfig.json';
    }
    var reportDiagnostic = createDiagnosticReporter();
    var parseConfigFileHost = ts.sys;
    parseConfigFileHost.onUnRecoverableConfigFileDiagnostic = function (diagnostic) {
        reportDiagnostic(diagnostic);
        ts.sys.exit(ts.ExitStatus.InvalidProject_OutputsSkipped);
    };
    var parsedCommandLine = ts.getParsedCommandLineOfConfigFile(commandLine.options.project, commandLine.options, parseConfigFileHost, /*extendedConfigCache*/ undefined, commandLine.watchOptions);
    var pretty = !!((_b = (_a = ts.sys).writeOutputIsTTY) === null || _b === void 0 ? void 0 : _b.call(_a));
    if (pretty) {
        reportDiagnostic = createDiagnosticReporter(true);
    }
    var program = ts.createProgram({
        rootNames: parsedCommandLine.fileNames,
        options: parsedCommandLine.options,
        projectReferences: parsedCommandLine.projectReferences,
        host: ts.createCompilerHost(parsedCommandLine.options)
    });
    var allDiagnostics = [];
    if (handleErrors) {
        allDiagnostics = program.getConfigFileParsingDiagnostics().slice();
        var syntacticDiagnostics = program.getSyntacticDiagnostics();
        if (syntacticDiagnostics.length) {
            allDiagnostics.push.apply(allDiagnostics, syntacticDiagnostics);
        }
        else {
            allDiagnostics.push.apply(allDiagnostics, program.getOptionsDiagnostics());
            allDiagnostics.push.apply(allDiagnostics, program.getGlobalDiagnostics());
            allDiagnostics.push.apply(allDiagnostics, program.getSemanticDiagnostics());
        }
    }
    program.getTypeChecker();
    for (var _i = 0, emitters_1 = emitters; _i < emitters_1.length; _i++) {
        var emitter = emitters_1[_i];
        console.log("[".concat(emitter.name, "] Emitting..."));
        emitter.emit(program, allDiagnostics);
    }
    if (handleErrors) {
        var diagnostics = ts.sortAndDeduplicateDiagnostics(allDiagnostics);
        var errorCount = 0;
        var warningCount = 0;
        for (var _c = 0, diagnostics_1 = diagnostics; _c < diagnostics_1.length; _c++) {
            var d = diagnostics_1[_c];
            switch (d.category) {
                case ts.DiagnosticCategory.Error:
                    errorCount++;
                    break;
                case ts.DiagnosticCategory.Warning:
                    warningCount++;
                    break;
            }
            reportDiagnostic(d);
        }
        if (pretty) {
            reportDiagnostic({
                file: undefined,
                start: undefined,
                length: undefined,
                code: 6194,
                messageText: "Compilation completed with ".concat(errorCount, " errors and ").concat(warningCount, " warnings").concat(ts.sys.newLine),
                category: errorCount > 0 ? ts.DiagnosticCategory.Error : warningCount > 0 ? ts.DiagnosticCategory.Warning : ts.DiagnosticCategory.Message
            });
        }
        if (errorCount > 0) {
            ts.sys.exit(ts.ExitStatus.DiagnosticsPresent_OutputsGenerated);
        }
        else {
            ts.sys.exit(ts.ExitStatus.Success);
        }
    }
    console.log('Done');
}
exports["default"] = default_1;
