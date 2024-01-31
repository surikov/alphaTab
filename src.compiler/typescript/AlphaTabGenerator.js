"use strict";
exports.__esModule = true;
var ts = require("typescript");
var CloneEmitter_1 = require("./CloneEmitter");
var EmitterBase_1 = require("./EmitterBase");
var SerializerEmitter_1 = require("./SerializerEmitter");
var TranspilerBase_1 = require("../TranspilerBase");
var fs = require("fs");
(0, TranspilerBase_1["default"])([{
        name: 'Clone',
        emit: CloneEmitter_1["default"]
    }, {
        name: 'Serializer',
        emit: SerializerEmitter_1["default"]
    }], false);
// Write version file
var packageJson = JSON.parse(fs.readFileSync('package.json', 'utf-8'));
var version = packageJson.version;
var fileHandle = fs.openSync('src/generated/VersionInfo.ts', 'w');
fs.writeSync(fileHandle, "".concat(EmitterBase_1.GENERATED_FILE_HEADER, "\nexport class VersionInfo {\n    public static readonly version: string = '").concat(version, "';\n    public static readonly date: string = '").concat(new Date().toISOString(), "';\n}\n"));
ts.sys.exit(ts.ExitStatus.Success);
