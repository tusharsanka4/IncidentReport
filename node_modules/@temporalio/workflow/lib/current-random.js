"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.currentRandom = currentRandom;
const global_attributes_1 = require("./global-attributes");
function currentRandom() {
    return (0, global_attributes_1.assertInWorkflowContext)('Workflow random APIs may only be used from workflow context.').currentRandom();
}
//# sourceMappingURL=current-random.js.map