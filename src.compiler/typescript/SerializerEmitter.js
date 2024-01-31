"use strict";
/**
 * This file contains an emitter which generates classes to serialize
 * any data models to and from JSON following certain rules.
 */
var __spreadArray = (this && this.__spreadArray) || function (to, from, pack) {
    if (pack || arguments.length === 2) for (var i = 0, l = from.length, ar; i < l; i++) {
        if (ar || !(i in from)) {
            if (!ar) ar = Array.prototype.slice.call(from, 0, i);
            ar[i] = from[i];
        }
    }
    return to.concat(ar || Array.prototype.slice.call(from));
};
exports.__esModule = true;
var path = require("path");
var ts = require("typescript");
var EmitterBase_1 = require("./EmitterBase");
var Serializer_common_1 = require("./Serializer.common");
var Serializer_setProperty_1 = require("./Serializer.setProperty");
var Serializer_fromJson_1 = require("./Serializer.fromJson");
var Serializer_toJson_1 = require("./Serializer.toJson");
exports["default"] = (0, EmitterBase_1["default"])('json', function (program, input) {
    console.log("Writing Serializer for ".concat(input.name.text));
    var sourceFileName = path.relative(path.join(path.resolve(program.getCompilerOptions().baseUrl)), path.resolve(input.getSourceFile().fileName));
    var serializable = {
        properties: [],
        isStrict: !!ts.getJSDocTags(input).find(function (t) { return t.tagName.text === 'json_strict'; }),
        hasToJsonExtension: false,
        hasSetPropertyExtension: false
    };
    input.members.forEach(function (member) {
        var _a;
        if (ts.isPropertyDeclaration(member)) {
            var propertyDeclaration = member;
            if (!propertyDeclaration.modifiers.find(function (m) { return m.kind === ts.SyntaxKind.StaticKeyword || m.kind === ts.SyntaxKind.PrivateKeyword; })) {
                var jsonNames = [member.name.text.toLowerCase()];
                if (ts.getJSDocTags(member).find(function (t) { return t.tagName.text === 'json_on_parent'; })) {
                    jsonNames.push('');
                }
                if (!ts.getJSDocTags(member).find(function (t) { return t.tagName.text === 'json_ignore'; })) {
                    serializable.properties.push({
                        property: propertyDeclaration,
                        jsonNames: jsonNames,
                        partialNames: !!ts.getJSDocTags(member).find(function (t) { return t.tagName.text === 'json_partial_names'; }),
                        target: (_a = ts.getJSDocTags(member).find(function (t) { return t.tagName.text === 'target'; })) === null || _a === void 0 ? void 0 : _a.comment,
                        isReadOnly: !!ts.getJSDocTags(member).find(function (t) { return t.tagName.text === 'json_read_only'; })
                    });
                }
            }
        }
        else if (ts.isMethodDeclaration(member)) {
            switch (member.name.text) {
                case 'toJson':
                    serializable.hasToJsonExtension = true;
                    break;
                case 'setProperty':
                    serializable.hasSetPropertyExtension = true;
                    break;
            }
        }
    });
    var statements = [];
    var importedNames = new Set();
    function importer(name, module) {
        if (importedNames.has(name)) {
            return;
        }
        importedNames.add(name);
        statements.push(ts.factory.createImportDeclaration(undefined, ts.factory.createImportClause(false, undefined, ts.factory.createNamedImports([
            ts.factory.createImportSpecifier(false, undefined, ts.factory.createIdentifier(name))
        ])), ts.factory.createStringLiteral(module)));
    }
    statements.push(ts.factory.createClassDeclaration([ts.factory.createModifier(ts.SyntaxKind.ExportKeyword)], input.name.text + 'Serializer', undefined, undefined, [
        (0, Serializer_fromJson_1.createFromJsonMethod)(input, serializable, importer),
        (0, Serializer_toJson_1.createToJsonMethod)(program, input, serializable, importer),
        (0, Serializer_setProperty_1.createSetPropertyMethod)(program, input, serializable, importer)
    ]));
    var sourceFile = ts.factory.createSourceFile(__spreadArray([
        ts.factory.createImportDeclaration(undefined, ts.factory.createImportClause(false, undefined, ts.factory.createNamedImports([
            ts.factory.createImportSpecifier(false, undefined, ts.factory.createIdentifier(input.name.text))
        ])), ts.factory.createStringLiteral((0, Serializer_common_1.toImportPath)(sourceFileName)))
    ], statements, true), ts.factory.createToken(ts.SyntaxKind.EndOfFileToken), ts.NodeFlags.None);
    return sourceFile;
});
