"use strict";
exports.__esModule = true;
exports.findSerializerModule = exports.findModule = exports.toImportPath = exports.createStringUnknownMapNode = exports.isImmutable = void 0;
var ts = require("typescript");
var path = require("path");
function isImmutable(type) {
    if (!type || !type.symbol) {
        return false;
    }
    var declaration = type.symbol.valueDeclaration;
    if (declaration) {
        return !!ts.getJSDocTags(declaration).find(function (t) { return t.tagName.text === 'json_immutable'; });
    }
    return false;
}
exports.isImmutable = isImmutable;
function createStringUnknownMapNode() {
    return ts.factory.createTypeReferenceNode('Map', [
        ts.factory.createKeywordTypeNode(ts.SyntaxKind.StringKeyword),
        ts.factory.createKeywordTypeNode(ts.SyntaxKind.UnknownKeyword)
    ]);
}
exports.createStringUnknownMapNode = createStringUnknownMapNode;
function removeExtension(fileName) {
    return fileName.substring(0, fileName.lastIndexOf('.'));
}
function toImportPath(fileName) {
    return '@' + removeExtension(fileName).split('\\').join('/');
}
exports.toImportPath = toImportPath;
function findModule(type, options) {
    if (type.symbol && type.symbol.declarations) {
        for (var _i = 0, _a = type.symbol.declarations; _i < _a.length; _i++) {
            var decl = _a[_i];
            var file = decl.getSourceFile();
            if (file) {
                var relative = path.relative(path.join(path.resolve(options.baseUrl)), path.resolve(file.fileName));
                return toImportPath(relative);
            }
        }
        return './' + type.symbol.name;
    }
    return '';
}
exports.findModule = findModule;
function findSerializerModule(type, options) {
    var module = findModule(type, options);
    var importPath = module.split('/');
    importPath.splice(1, 0, 'generated');
    importPath[importPath.length - 1] = type.symbol.name + 'Serializer';
    return importPath.join('/');
}
exports.findSerializerModule = findSerializerModule;
