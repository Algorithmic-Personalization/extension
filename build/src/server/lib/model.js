"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
exports.__esModule = true;
exports.Model = void 0;
var typeorm_1 = require("typeorm");
var class_validator_1 = require("class-validator");
var Model = /** @class */ (function () {
    function Model() {
        this.id = 0;
        this.createdAt = new Date();
        this.updatedAt = new Date();
    }
    __decorate([
        (0, typeorm_1.PrimaryGeneratedColumn)(),
        (0, class_validator_1.IsInt)(),
        (0, class_validator_1.IsPositive)(),
        __metadata("design:type", Object)
    ], Model.prototype, "id");
    __decorate([
        (0, typeorm_1.Column)(),
        (0, class_validator_1.IsDate)(),
        __metadata("design:type", Date)
    ], Model.prototype, "createdAt");
    __decorate([
        (0, typeorm_1.Column)(),
        (0, class_validator_1.IsDate)(),
        __metadata("design:type", Date)
    ], Model.prototype, "updatedAt");
    return Model;
}());
exports.Model = Model;
exports["default"] = Model;
