(function (root, factory) {
    if (typeof define === 'function' && define.amd) {
        define(["./client"], function(CoCreateIndustry) {
        	return factory(CoCreateIndustry)
        });
    } else if (typeof module === 'object' && module.exports) {
      const CoCreateIndustry = require("./server.js")
      module.exports = factory(CoCreateIndustry);
    } else {
        root.returnExports = factory(root["./client.js"]);
  }
}(typeof self !== 'undefined' ? self : this, function (CoCreateIndustry) {
  return CoCreateIndustry;
}));