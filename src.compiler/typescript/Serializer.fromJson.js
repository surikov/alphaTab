"use strict";
exports.__esModule = true;
exports.createFromJsonMethod = void 0;
var ts = require("typescript");
var BuilderHelpers_1 = require("../BuilderHelpers");
function generateFromJsonBody(serializable, importer) {
    importer('JsonHelper', '@src/io/JsonHelper');
    return ts.factory.createBlock([
        (0, BuilderHelpers_1.createNodeFromSource)("if(!m) { \n            return; \n        }", ts.SyntaxKind.IfStatement),
        serializable.isStrict
            ? (0, BuilderHelpers_1.createNodeFromSource)("JsonHelper.forEach(m, (v, k) => this.setProperty(obj, k, v));", ts.SyntaxKind.ExpressionStatement)
            : (0, BuilderHelpers_1.createNodeFromSource)("JsonHelper.forEach(m, (v, k) => this.setProperty(obj, k.toLowerCase(), v));", ts.SyntaxKind.ExpressionStatement)
    ], true);
}
function createFromJsonMethod(input, serializable, importer) {
    var methodDecl = (0, BuilderHelpers_1.createNodeFromSource)("public class Serializer {\n            public static fromJson(obj: ".concat(input.name.text, ", m: unknown): void {\n            }\n        }"), ts.SyntaxKind.MethodDeclaration);
    return (0, BuilderHelpers_1.setMethodBody)(methodDecl, generateFromJsonBody(serializable, importer));
}
exports.createFromJsonMethod = createFromJsonMethod;
