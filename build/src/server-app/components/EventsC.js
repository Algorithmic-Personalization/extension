"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __generator = (this && this.__generator) || function (thisArg, body) {
    var _ = { label: 0, sent: function() { if (t[0] & 1) throw t[1]; return t[1]; }, trys: [], ops: [] }, f, y, t, g;
    return g = { next: verb(0), "throw": verb(1), "return": verb(2) }, typeof Symbol === "function" && (g[Symbol.iterator] = function() { return this; }), g;
    function verb(n) { return function (v) { return step([n, v]); }; }
    function step(op) {
        if (f) throw new TypeError("Generator is already executing.");
        while (g && (g = 0, op[0] && (_ = 0)), _) try {
            if (f = 1, y && (t = op[0] & 2 ? y["return"] : op[0] ? y["throw"] || ((t = y["return"]) && t.call(y), 0) : y.next) && !(t = t.call(y, op[1])).done) return t;
            if (y = 0, t) op = [op[0] & 2, t.value];
            switch (op[0]) {
                case 0: case 1: t = op; break;
                case 4: _.label++; return { value: op[1], done: false };
                case 5: _.label++; y = op[1]; op = [0]; continue;
                case 7: op = _.ops.pop(); _.trys.pop(); continue;
                default:
                    if (!(t = _.trys, t = t.length > 0 && t[t.length - 1]) && (op[0] === 6 || op[0] === 2)) { _ = 0; continue; }
                    if (op[0] === 3 && (!t || (op[1] > t[0] && op[1] < t[3]))) { _.label = op[1]; break; }
                    if (op[0] === 6 && _.label < t[1]) { _.label = t[1]; t = op; break; }
                    if (t && _.label < t[2]) { _.label = t[2]; _.ops.push(op); break; }
                    if (t[2]) _.ops.pop();
                    _.trys.pop(); continue;
            }
            op = body.call(thisArg, _);
        } catch (e) { op = [6, e]; y = 0; } finally { f = t = 0; }
        if (op[0] & 5) throw op[1]; return { value: op[0] ? op[1] : void 0, done: true };
    }
};
var __read = (this && this.__read) || function (o, n) {
    var m = typeof Symbol === "function" && o[Symbol.iterator];
    if (!m) return o;
    var i = m.call(o), r, ar = [], e;
    try {
        while ((n === void 0 || n-- > 0) && !(r = i.next()).done) ar.push(r.value);
    }
    catch (error) { e = { error: error }; }
    finally {
        try {
            if (r && !r.done && (m = i["return"])) m.call(i);
        }
        finally { if (e) throw e.error; }
    }
    return ar;
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
exports.__esModule = true;
exports.EventsC = void 0;
var react_1 = __importStar(require("react"));
var material_1 = require("@mui/material");
var adminApiProvider_1 = require("../adminApiProvider");
var CardC_1 = __importDefault(require("./CardC"));
var EventC = function (_a) {
    var event = _a.event;
    return (react_1["default"].createElement(material_1.Grid, { container: true, item: true, xs: 12, sm: 6, md: 3 },
        react_1["default"].createElement(CardC_1["default"], null,
            react_1["default"].createElement("strong", null,
                "Event #",
                event.id,
                ": ",
                event.type),
            react_1["default"].createElement("dl", null,
                react_1["default"].createElement("dt", null,
                    react_1["default"].createElement(material_1.Typography, null, "Timestamp")),
                react_1["default"].createElement("dd", null,
                    react_1["default"].createElement(material_1.Typography, null, new Date(event.createdAt).toISOString())),
                react_1["default"].createElement("dt", null,
                    react_1["default"].createElement(material_1.Typography, null, "Session")),
                react_1["default"].createElement("dd", null,
                    react_1["default"].createElement(material_1.Typography, null, event.sessionUuid)),
                react_1["default"].createElement("dt", null,
                    react_1["default"].createElement(material_1.Typography, null, "URL")),
                react_1["default"].createElement("dd", null,
                    react_1["default"].createElement(material_1.Typography, null, event.url))))));
};
var EventsC = function () {
    var _a = __read((0, react_1.useState)('1'), 2), pageNumberControl = _a[0], setPageNumberControl = _a[1];
    var _b = __read((0, react_1.useState)(1), 2), pageNumber = _b[0], setPageNumber = _b[1];
    var _c = __read((0, react_1.useState)(0), 2), pageCount = _c[0], setPageCount = _c[1];
    var _d = __read((0, react_1.useState)([]), 2), events = _d[0], setEvents = _d[1];
    var api = (0, adminApiProvider_1.useAdminApi)();
    var handlePageNumberChange = function (e) {
        setPageNumberControl(e.target.value);
        var n = parseInt(e.target.value, 10);
        if (Number.isInteger(n) && n > 0) {
            setPageNumber(n);
        }
    };
    (0, react_1.useEffect)(function () {
        (function () { return __awaiter(void 0, void 0, void 0, function () {
            var res;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0: return [4 /*yield*/, api.getEvents(pageNumber - 1)];
                    case 1:
                        res = _a.sent();
                        if (res.kind === 'Success') {
                            setPageCount(res.value.pageCount);
                            setEvents(res.value.results);
                        }
                        return [2 /*return*/];
                }
            });
        }); })();
    }, [pageNumber]);
    var ui = (react_1["default"].createElement(material_1.Box, { component: 'main' },
        react_1["default"].createElement(material_1.Typography, { variant: 'h1', sx: { mb: 4 } }, "Events"),
        react_1["default"].createElement(material_1.Typography, { sx: { display: 'flex', alignItems: 'center', mb: 2 } },
            react_1["default"].createElement("span", null, "Page\u00A0"),
            react_1["default"].createElement("input", { type: 'number', value: pageNumberControl, onChange: handlePageNumberChange, min: 1, max: pageCount, step: 1 }),
            react_1["default"].createElement("span", null, "\u00A0/\u00A0"),
            react_1["default"].createElement("span", null, pageCount)),
        react_1["default"].createElement(material_1.Grid, { container: true, spacing: 2 }, events.map(function (event) { return react_1["default"].createElement(EventC, { key: event.id, event: event }); }))));
    return ui;
};
exports.EventsC = EventsC;
exports["default"] = exports.EventsC;
