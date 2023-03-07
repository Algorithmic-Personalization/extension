/******/ (() => { // webpackBootstrap
/******/ 	"use strict";
/******/ 	var __webpack_modules__ = ({

/***/ 98136:
/*!***************************!*\
  !*** ./src/background.ts ***!
  \***************************/
/***/ (function() {


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
var getCurrentTab = function (callback) { return __awaiter(void 0, void 0, void 0, function () {
    var queryOptions;
    return __generator(this, function (_a) {
        queryOptions = { active: true, lastFocusedWindow: true };
        chrome.tabs.query(queryOptions, function (_a) {
            var _b = __read(_a, 1), tab = _b[0];
            if (chrome.runtime.lastError) {
                console.error(chrome.runtime.lastError);
                return;
            }
            // `tab` will either be a `tabs.Tab` instance or `undefined`.
            callback(tab);
        });
        return [2 /*return*/];
    });
}); };
getCurrentTab(function (tab) {
    console.log(tab);
})["catch"](console.error);
chrome.tabs.onActivated.addListener(function (tab) {
    console.log('Active tab:', tab);
});
var main = function () { return __awaiter(void 0, void 0, void 0, function () {
    return __generator(this, function (_a) {
        chrome.tabs.query({}, function (_a) {
            var _b = __read(_a), tabs = _b.slice(0);
            console.log('Tabs found:', tabs);
        });
        return [2 /*return*/];
    });
}); };
main()["catch"](console.error);


/***/ })

/******/ 	});
/************************************************************************/
/******/ 	
/******/ 	// startup
/******/ 	// Load entry module and return exports
/******/ 	// This entry module is referenced by other modules so it can't be inlined
/******/ 	var __webpack_exports__ = {};
/******/ 	__webpack_modules__[98136]();
/******/ 	
/******/ })()
;
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiYmFja2dyb3VuZC5qcyIsIm1hcHBpbmdzIjoiOzs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7QUFFQSxJQUFNLGFBQWEsR0FBRyxVQUFPLFFBQXFCOzs7UUFDM0MsWUFBWSxHQUFHLEVBQUMsTUFBTSxFQUFFLElBQUksRUFBRSxpQkFBaUIsRUFBRSxJQUFJLEVBQUMsQ0FBQztRQUM3RCxNQUFNLENBQUMsSUFBSSxDQUFDLEtBQUssQ0FBQyxZQUFZLEVBQUUsVUFBQyxFQUFLO2dCQUFMLGtCQUFLLEVBQUosR0FBRztZQUNwQyxJQUFJLE1BQU0sQ0FBQyxPQUFPLENBQUMsU0FBUyxFQUFFO2dCQUM3QixPQUFPLENBQUMsS0FBSyxDQUFDLE1BQU0sQ0FBQyxPQUFPLENBQUMsU0FBUyxDQUFDLENBQUM7Z0JBQ3hDLE9BQU87YUFDUDtZQUNELDZEQUE2RDtZQUU3RCxRQUFRLENBQUMsR0FBRyxDQUFDLENBQUM7UUFDZixDQUFDLENBQUMsQ0FBQzs7O0tBQ0gsQ0FBQztBQUVGLGFBQWEsQ0FBQyxhQUFHO0lBQ2hCLE9BQU8sQ0FBQyxHQUFHLENBQUMsR0FBRyxDQUFDLENBQUM7QUFDbEIsQ0FBQyxDQUFDLENBQUMsT0FBSyxFQUFDLE9BQU8sQ0FBQyxLQUFLLENBQUMsQ0FBQztBQUV4QixNQUFNLENBQUMsSUFBSSxDQUFDLFdBQVcsQ0FBQyxXQUFXLENBQUMsYUFBRztJQUN0QyxPQUFPLENBQUMsR0FBRyxDQUFDLGFBQWEsRUFBRSxHQUFHLENBQUMsQ0FBQztBQUNqQyxDQUFDLENBQUMsQ0FBQztBQUVILElBQU0sSUFBSSxHQUFHOztRQUNaLE1BQU0sQ0FBQyxJQUFJLENBQUMsS0FBSyxDQUFDLEVBQUUsRUFBRSxVQUFDLEVBQVM7Z0JBQVQsZUFBUyxFQUFMLElBQUk7WUFDOUIsT0FBTyxDQUFDLEdBQUcsQ0FBQyxhQUFhLEVBQUUsSUFBSSxDQUFDLENBQUM7UUFDbEMsQ0FBQyxDQUFDLENBQUM7OztLQUNILENBQUM7QUFFRixJQUFJLEVBQUUsQ0FBQyxPQUFLLEVBQUMsT0FBTyxDQUFDLEtBQUssQ0FBQyxDQUFDOzs7Ozs7OztVRTdCNUI7VUFDQTtVQUNBO1VBQ0E7VUFDQSIsInNvdXJjZXMiOlsid2VicGFjazovL3l0ZHBubC8uL3NyYy9iYWNrZ3JvdW5kLnRzIiwid2VicGFjazovL3l0ZHBubC93ZWJwYWNrL2JlZm9yZS1zdGFydHVwIiwid2VicGFjazovL3l0ZHBubC93ZWJwYWNrL3N0YXJ0dXAiLCJ3ZWJwYWNrOi8veXRkcG5sL3dlYnBhY2svYWZ0ZXItc3RhcnR1cCJdLCJzb3VyY2VzQ29udGVudCI6WyJ0eXBlIFRhYkNhbGxiYWNrID0gKHRhYjogY2hyb21lLnRhYnMuVGFiKSA9PiB2b2lkO1xuXG5jb25zdCBnZXRDdXJyZW50VGFiID0gYXN5bmMgKGNhbGxiYWNrOiBUYWJDYWxsYmFjaykgPT4ge1xuXHRjb25zdCBxdWVyeU9wdGlvbnMgPSB7YWN0aXZlOiB0cnVlLCBsYXN0Rm9jdXNlZFdpbmRvdzogdHJ1ZX07XG5cdGNocm9tZS50YWJzLnF1ZXJ5KHF1ZXJ5T3B0aW9ucywgKFt0YWJdKSA9PiB7XG5cdFx0aWYgKGNocm9tZS5ydW50aW1lLmxhc3RFcnJvcikge1xuXHRcdFx0Y29uc29sZS5lcnJvcihjaHJvbWUucnVudGltZS5sYXN0RXJyb3IpO1xuXHRcdFx0cmV0dXJuO1xuXHRcdH1cblx0XHQvLyBgdGFiYCB3aWxsIGVpdGhlciBiZSBhIGB0YWJzLlRhYmAgaW5zdGFuY2Ugb3IgYHVuZGVmaW5lZGAuXG5cblx0XHRjYWxsYmFjayh0YWIpO1xuXHR9KTtcbn07XG5cbmdldEN1cnJlbnRUYWIodGFiID0+IHtcblx0Y29uc29sZS5sb2codGFiKTtcbn0pLmNhdGNoKGNvbnNvbGUuZXJyb3IpO1xuXG5jaHJvbWUudGFicy5vbkFjdGl2YXRlZC5hZGRMaXN0ZW5lcih0YWIgPT4ge1xuXHRjb25zb2xlLmxvZygnQWN0aXZlIHRhYjonLCB0YWIpO1xufSk7XG5cbmNvbnN0IG1haW4gPSBhc3luYyAoKSA9PiB7XG5cdGNocm9tZS50YWJzLnF1ZXJ5KHt9LCAoWy4uLnRhYnNdKSA9PiB7XG5cdFx0Y29uc29sZS5sb2coJ1RhYnMgZm91bmQ6JywgdGFicyk7XG5cdH0pO1xufTtcblxubWFpbigpLmNhdGNoKGNvbnNvbGUuZXJyb3IpO1xuIiwiIiwiLy8gc3RhcnR1cFxuLy8gTG9hZCBlbnRyeSBtb2R1bGUgYW5kIHJldHVybiBleHBvcnRzXG4vLyBUaGlzIGVudHJ5IG1vZHVsZSBpcyByZWZlcmVuY2VkIGJ5IG90aGVyIG1vZHVsZXMgc28gaXQgY2FuJ3QgYmUgaW5saW5lZFxudmFyIF9fd2VicGFja19leHBvcnRzX18gPSB7fTtcbl9fd2VicGFja19tb2R1bGVzX19bOTgxMzZdKCk7XG4iLCIiXSwibmFtZXMiOltdLCJzb3VyY2VSb290IjoiIn0=