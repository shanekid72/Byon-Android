"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.buildRoutes = void 0;
const express_1 = require("express");
const router = (0, express_1.Router)();
exports.buildRoutes = router;
router.get('/', (req, res) => res.json({ message: 'Build routes placeholder' }));
//# sourceMappingURL=build.routes.js.map