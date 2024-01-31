"use strict";
exports.__esModule = true;
exports.createToJsonMethod = void 0;
var ts = require("typescript");
var BuilderHelpers_1 = require("../BuilderHelpers");
var Serializer_common_1 = require("./Serializer.common");
function isPrimitiveToJson(type, typeChecker) {
    if (!type) {
        return false;
    }
    var isArray = (0, BuilderHelpers_1.isTypedArray)(type);
    var arrayItemType = (0, BuilderHelpers_1.unwrapArrayItemType)(type, typeChecker);
    if ((0, BuilderHelpers_1.hasFlag)(type, ts.TypeFlags.Unknown)) {
        return true;
    }
    if ((0, BuilderHelpers_1.hasFlag)(type, ts.TypeFlags.Number)) {
        return true;
    }
    if ((0, BuilderHelpers_1.hasFlag)(type, ts.TypeFlags.String)) {
        return true;
    }
    if ((0, BuilderHelpers_1.hasFlag)(type, ts.TypeFlags.Boolean)) {
        return true;
    }
    if (arrayItemType) {
        if (isArray && (0, BuilderHelpers_1.hasFlag)(arrayItemType, ts.TypeFlags.Number)) {
            return true;
        }
        if (isArray && (0, BuilderHelpers_1.hasFlag)(arrayItemType, ts.TypeFlags.String)) {
            return true;
        }
        if (isArray && (0, BuilderHelpers_1.hasFlag)(arrayItemType, ts.TypeFlags.Boolean)) {
            return true;
        }
    }
    else if (type.symbol) {
        switch (type.symbol.name) {
            case 'Uint8Array':
            case 'Uint16Array':
            case 'Uint32Array':
            case 'Int8Array':
            case 'Int16Array':
            case 'Int32Array':
            case 'Float32Array':
            case 'Float64Array':
                return true;
        }
    }
    return false;
}
function generateToJsonBody(program, serializable, importer) {
    var statements = [];
    statements.push((0, BuilderHelpers_1.createNodeFromSource)("\n            if(!obj) {\n                return null;\n            }\n        ", ts.SyntaxKind.IfStatement));
    statements.push((0, BuilderHelpers_1.createNodeFromSource)("\n            const o = new Map<string, unknown>();\n        ", ts.SyntaxKind.VariableStatement));
    var _loop_1 = function (prop) {
        var fieldName = prop.property.name.text;
        var jsonName = prop.jsonNames.filter(function (n) { return n !== ''; })[0];
        if (!jsonName || prop.isReadOnly) {
            return "continue";
        }
        var typeChecker = program.getTypeChecker();
        var type = (0, BuilderHelpers_1.getTypeWithNullableInfo)(typeChecker, prop.property.type, false);
        var isArray = (0, BuilderHelpers_1.isTypedArray)(type.type);
        var propertyStatements = [];
        if (isPrimitiveToJson(type.type, typeChecker)) {
            propertyStatements.push((0, BuilderHelpers_1.createNodeFromSource)("\n                    o.set(".concat(JSON.stringify(jsonName), ", obj.").concat(fieldName, ");\n                "), ts.SyntaxKind.ExpressionStatement));
        }
        else if ((0, BuilderHelpers_1.isEnumType)(type.type)) {
            if (type.isNullable) {
                propertyStatements.push((0, BuilderHelpers_1.createNodeFromSource)("\n                        o.set(".concat(JSON.stringify(jsonName), ", obj.").concat(fieldName, " as number|null);\n                    "), ts.SyntaxKind.ExpressionStatement));
            }
            else {
                propertyStatements.push((0, BuilderHelpers_1.createNodeFromSource)("\n                        o.set(".concat(JSON.stringify(jsonName), ", obj.").concat(fieldName, " as number);\n                    "), ts.SyntaxKind.ExpressionStatement));
            }
        }
        else if (isArray) {
            var arrayItemType = (0, BuilderHelpers_1.unwrapArrayItemType)(type.type, typeChecker);
            var itemSerializer = arrayItemType.symbol.name + 'Serializer';
            importer(itemSerializer, (0, Serializer_common_1.findSerializerModule)(arrayItemType, program.getCompilerOptions()));
            if (type.isNullable) {
                propertyStatements.push((0, BuilderHelpers_1.createNodeFromSource)("if(obj.".concat(fieldName, " !== null) {\n                            o.set(").concat(JSON.stringify(jsonName), ", obj.").concat(fieldName, "?.map(i => ").concat(itemSerializer, ".toJson(i)));\n                        }"), ts.SyntaxKind.IfStatement));
            }
            else {
                propertyStatements.push((0, BuilderHelpers_1.createNodeFromSource)("\n                        o.set(".concat(JSON.stringify(jsonName), ", obj.").concat(fieldName, ".map(i => ").concat(itemSerializer, ".toJson(i)));\n                    "), ts.SyntaxKind.ExpressionStatement));
            }
        }
        else if ((0, BuilderHelpers_1.isMap)(type.type)) {
            var mapType = type.type;
            if (!(0, BuilderHelpers_1.isPrimitiveType)(mapType.typeArguments[0])) {
                throw new Error('only Map<Primitive, *> maps are supported extend if needed!');
            }
            var serializeBlock = void 0;
            if (isPrimitiveToJson(mapType.typeArguments[1], typeChecker)) {
                serializeBlock = (0, BuilderHelpers_1.createNodeFromSource)("{\n                    const m = new Map<string, unknown>();\n                    o.set(".concat(JSON.stringify(jsonName), ", m);\n                    for(const [k, v] of obj.").concat(fieldName, "!) {\n                        m.set(k.toString(), v);\n                    }\n                }"), ts.SyntaxKind.Block);
            }
            else if ((0, BuilderHelpers_1.isEnumType)(mapType.typeArguments[1])) {
                serializeBlock = (0, BuilderHelpers_1.createNodeFromSource)("{\n                    const m = new Map<string, unknown>();\n                    o.set(".concat(JSON.stringify(jsonName), ", m);\n                    for(const [k, v] of obj.").concat(fieldName, "!) {\n                        m.set(k.toString(), v as number);\n                    }\n                }"), ts.SyntaxKind.Block);
            }
            else {
                var itemSerializer = mapType.typeArguments[1].symbol.name + 'Serializer';
                importer(itemSerializer, (0, Serializer_common_1.findSerializerModule)(mapType.typeArguments[1], program.getCompilerOptions()));
                serializeBlock = (0, BuilderHelpers_1.createNodeFromSource)("{\n                    const m = new Map<string, unknown>();\n                    o.set(".concat(JSON.stringify(jsonName), ", m);\n                    for(const [k, v] of obj.").concat(fieldName, "!) {\n                        m.set(k.toString(), ").concat(itemSerializer, ".toJson(v));\n                    }\n                }"), ts.SyntaxKind.Block);
            }
            if (type.isNullable) {
                propertyStatements.push(ts.factory.createIfStatement(ts.factory.createBinaryExpression(ts.factory.createPropertyAccessExpression(ts.factory.createIdentifier('obj'), fieldName), ts.SyntaxKind.ExclamationEqualsEqualsToken, ts.factory.createNull()), serializeBlock));
            }
            else {
                propertyStatements.push(serializeBlock);
            }
        }
        else if ((0, Serializer_common_1.isImmutable)(type.type)) {
            var itemSerializer = type.type.symbol.name;
            importer(itemSerializer, (0, Serializer_common_1.findModule)(type.type, program.getCompilerOptions()));
            propertyStatements.push((0, BuilderHelpers_1.createNodeFromSource)("\n                    o.set(".concat(JSON.stringify(jsonName), ", ").concat(itemSerializer, ".toJson(obj.").concat(fieldName, "));\n                "), ts.SyntaxKind.ExpressionStatement));
        }
        else {
            var itemSerializer = type.type.symbol.name + 'Serializer';
            importer(itemSerializer, (0, Serializer_common_1.findSerializerModule)(type.type, program.getCompilerOptions()));
            propertyStatements.push((0, BuilderHelpers_1.createNodeFromSource)("\n                    o.set(".concat(JSON.stringify(jsonName), ", ").concat(itemSerializer, ".toJson(obj.").concat(fieldName, "));\n                "), ts.SyntaxKind.ExpressionStatement));
        }
        if (prop.target) {
            propertyStatements = propertyStatements.map(function (s) {
                return ts.addSyntheticLeadingComment(s, ts.SyntaxKind.MultiLineCommentTrivia, "@target ".concat(prop.target), true);
            });
        }
        statements.push.apply(statements, propertyStatements);
    };
    for (var _i = 0, _a = serializable.properties; _i < _a.length; _i++) {
        var prop = _a[_i];
        _loop_1(prop);
    }
    if (serializable.hasToJsonExtension) {
        statements.push((0, BuilderHelpers_1.createNodeFromSource)("obj.toJson(o);", ts.SyntaxKind.ExpressionStatement));
    }
    statements.push(ts.factory.createReturnStatement(ts.factory.createIdentifier('o')));
    return ts.factory.createBlock(statements, true);
}
function createToJsonMethod(program, input, serializable, importer) {
    var methodDecl = (0, BuilderHelpers_1.createNodeFromSource)("public class Serializer {\n            public static toJson(obj: ".concat(input.name.text, " | null): Map<string, unknown> | null {\n            }\n        }"), ts.SyntaxKind.MethodDeclaration);
    return (0, BuilderHelpers_1.setMethodBody)(methodDecl, generateToJsonBody(program, serializable, importer));
}
exports.createToJsonMethod = createToJsonMethod;
