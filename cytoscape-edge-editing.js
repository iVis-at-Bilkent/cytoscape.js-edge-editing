(function webpackUniversalModuleDefinition(root, factory) {
	if(typeof exports === 'object' && typeof module === 'object')
		module.exports = factory();
	else if(typeof define === 'function' && define.amd)
		define([], factory);
	else if(typeof exports === 'object')
		exports["cytoscapeEdgeEditing"] = factory();
	else
		root["cytoscapeEdgeEditing"] = factory();
})(window, function() {
return /******/ (function(modules) { // webpackBootstrap
/******/ 	// The module cache
/******/ 	var installedModules = {};
/******/
/******/ 	// The require function
/******/ 	function __webpack_require__(moduleId) {
/******/
/******/ 		// Check if module is in cache
/******/ 		if(installedModules[moduleId]) {
/******/ 			return installedModules[moduleId].exports;
/******/ 		}
/******/ 		// Create a new module (and put it into the cache)
/******/ 		var module = installedModules[moduleId] = {
/******/ 			i: moduleId,
/******/ 			l: false,
/******/ 			exports: {}
/******/ 		};
/******/
/******/ 		// Execute the module function
/******/ 		modules[moduleId].call(module.exports, module, module.exports, __webpack_require__);
/******/
/******/ 		// Flag the module as loaded
/******/ 		module.l = true;
/******/
/******/ 		// Return the exports of the module
/******/ 		return module.exports;
/******/ 	}
/******/
/******/
/******/ 	// expose the modules object (__webpack_modules__)
/******/ 	__webpack_require__.m = modules;
/******/
/******/ 	// expose the module cache
/******/ 	__webpack_require__.c = installedModules;
/******/
/******/ 	// define getter function for harmony exports
/******/ 	__webpack_require__.d = function(exports, name, getter) {
/******/ 		if(!__webpack_require__.o(exports, name)) {
/******/ 			Object.defineProperty(exports, name, { enumerable: true, get: getter });
/******/ 		}
/******/ 	};
/******/
/******/ 	// define __esModule on exports
/******/ 	__webpack_require__.r = function(exports) {
/******/ 		if(typeof Symbol !== 'undefined' && Symbol.toStringTag) {
/******/ 			Object.defineProperty(exports, Symbol.toStringTag, { value: 'Module' });
/******/ 		}
/******/ 		Object.defineProperty(exports, '__esModule', { value: true });
/******/ 	};
/******/
/******/ 	// create a fake namespace object
/******/ 	// mode & 1: value is a module id, require it
/******/ 	// mode & 2: merge all properties of value into the ns
/******/ 	// mode & 4: return value when already ns object
/******/ 	// mode & 8|1: behave like require
/******/ 	__webpack_require__.t = function(value, mode) {
/******/ 		if(mode & 1) value = __webpack_require__(value);
/******/ 		if(mode & 8) return value;
/******/ 		if((mode & 4) && typeof value === 'object' && value && value.__esModule) return value;
/******/ 		var ns = Object.create(null);
/******/ 		__webpack_require__.r(ns);
/******/ 		Object.defineProperty(ns, 'default', { enumerable: true, value: value });
/******/ 		if(mode & 2 && typeof value != 'string') for(var key in value) __webpack_require__.d(ns, key, function(key) { return value[key]; }.bind(null, key));
/******/ 		return ns;
/******/ 	};
/******/
/******/ 	// getDefaultExport function for compatibility with non-harmony modules
/******/ 	__webpack_require__.n = function(module) {
/******/ 		var getter = module && module.__esModule ?
/******/ 			function getDefault() { return module['default']; } :
/******/ 			function getModuleExports() { return module; };
/******/ 		__webpack_require__.d(getter, 'a', getter);
/******/ 		return getter;
/******/ 	};
/******/
/******/ 	// Object.prototype.hasOwnProperty.call
/******/ 	__webpack_require__.o = function(object, property) { return Object.prototype.hasOwnProperty.call(object, property); };
/******/
/******/ 	// __webpack_public_path__
/******/ 	__webpack_require__.p = "";
/******/
/******/
/******/ 	// Load entry module and return exports
/******/ 	return __webpack_require__(__webpack_require__.s = 2);
/******/ })
/************************************************************************/
/******/ ([
/* 0 */
/***/ (function(module, exports, __webpack_require__) {

"use strict";


var anchorPointUtilities = {
  currentCtxEdge: undefined,
  currentCtxPos: undefined,
  currentAnchorIndex: undefined,
  ignoredClasses: undefined,
  setIgnoredClasses: function setIgnoredClasses(_ignoredClasses) {
    this.ignoredClasses = _ignoredClasses;
  },
  syntax: {
    bend: {
      edge: "segments",
      class: "edgebendediting-hasbendpoints",
      multiClass: "edgebendediting-hasmultiplebendpoints",
      weight: "cyedgebendeditingWeights",
      distance: "cyedgebendeditingDistances",
      weightCss: "segment-weights",
      distanceCss: "segment-distances",
      pointPos: "bendPointPositions"
    },
    control: {
      edge: "unbundled-bezier",
      class: "edgecontrolediting-hascontrolpoints",
      multiClass: "edgecontrolediting-hasmultiplecontrolpoints",
      weight: "cyedgecontroleditingWeights",
      distance: "cyedgecontroleditingDistances",
      weightCss: "control-point-weights",
      distanceCss: "control-point-distances",
      pointPos: "controlPointPositions"
    }
  },
  // gets edge type as 'bend' or 'control'
  // the interchanging if-s are necessary to set the priority of the tags
  // example: an edge with type segment and a class 'hascontrolpoints' will be classified as unbundled bezier
  getEdgeType: function getEdgeType(edge) {
    if (!edge) return 'inconclusive';else if (edge.hasClass(this.syntax['bend']['class'])) return 'bend';else if (edge.hasClass(this.syntax['control']['class'])) return 'control';else if (edge.css('curve-style') === this.syntax['bend']['edge']) return 'bend';else if (edge.css('curve-style') === this.syntax['control']['edge']) return 'control';else if (edge.data(this.syntax['bend']['pointPos']) && edge.data(this.syntax['bend']['pointPos']).length > 0) return 'bend';else if (edge.data(this.syntax['control']['pointPos']) && edge.data(this.syntax['control']['pointPos']).length > 0) return 'control';
    return 'inconclusive';
  },
  // initilize anchor points based on bendPositionsFcn and controlPositionFcn
  initAnchorPoints: function initAnchorPoints(bendPositionsFcn, controlPositionsFcn, edges) {
    for (var i = 0; i < edges.length; i++) {
      var edge = edges[i];
      var type = this.getEdgeType(edge);

      if (type === 'inconclusive') {
        continue;
      }

      if (!this.isIgnoredEdge(edge)) {

        var anchorPositions;

        // get the anchor positions by applying the functions for this edge
        if (type === 'bend') anchorPositions = bendPositionsFcn.apply(this, edge);else if (type === 'control') anchorPositions = controlPositionsFcn.apply(this, edge);

        // calculate relative anchor positions
        var result = this.convertToRelativePositions(edge, anchorPositions);

        // if there are anchors set weights and distances accordingly and add class to enable style changes
        if (result.distances.length > 0) {
          edge.data(this.syntax[type]['weight'], result.weights);
          edge.data(this.syntax[type]['distance'], result.distances);
          edge.addClass(this.syntax[type]['class']);
          if (result.distances.length > 1) {
            edge.addClass(this.syntax[type]['multiClass']);
          }
        }
      }
    }
  },

  isIgnoredEdge: function isIgnoredEdge(edge) {

    var startX = edge.source().position('x');
    var startY = edge.source().position('y');
    var endX = edge.target().position('x');
    var endY = edge.target().position('y');

    if (startX == endX && startY == endY || edge.source().id() == edge.target().id()) {
      return true;
    }
    for (var i = 0; this.ignoredClasses && i < this.ignoredClasses.length; i++) {
      if (edge.hasClass(this.ignoredClasses[i])) return true;
    }
    return false;
  },
  //Get the direction of the line from source point to the target point
  getLineDirection: function getLineDirection(srcPoint, tgtPoint) {
    if (srcPoint.y == tgtPoint.y && srcPoint.x < tgtPoint.x) {
      return 1;
    }
    if (srcPoint.y < tgtPoint.y && srcPoint.x < tgtPoint.x) {
      return 2;
    }
    if (srcPoint.y < tgtPoint.y && srcPoint.x == tgtPoint.x) {
      return 3;
    }
    if (srcPoint.y < tgtPoint.y && srcPoint.x > tgtPoint.x) {
      return 4;
    }
    if (srcPoint.y == tgtPoint.y && srcPoint.x > tgtPoint.x) {
      return 5;
    }
    if (srcPoint.y > tgtPoint.y && srcPoint.x > tgtPoint.x) {
      return 6;
    }
    if (srcPoint.y > tgtPoint.y && srcPoint.x == tgtPoint.x) {
      return 7;
    }
    return 8; //if srcPoint.y > tgtPoint.y and srcPoint.x < tgtPoint.x
  },
  getSrcTgtPointsAndTangents: function getSrcTgtPointsAndTangents(edge) {
    var sourceNode = edge.source();
    var targetNode = edge.target();

    var tgtPosition = targetNode.position();
    var srcPosition = sourceNode.position();

    var srcPoint = sourceNode.position();
    var tgtPoint = targetNode.position();

    var m1 = (tgtPoint.y - srcPoint.y) / (tgtPoint.x - srcPoint.x);
    var m2 = -1 / m1;

    return {
      m1: m1,
      m2: m2,
      srcPoint: srcPoint,
      tgtPoint: tgtPoint
    };
  },
  getIntersection: function getIntersection(edge, point, srcTgtPointsAndTangents) {
    if (srcTgtPointsAndTangents === undefined) {
      srcTgtPointsAndTangents = this.getSrcTgtPointsAndTangents(edge);
    }

    var srcPoint = srcTgtPointsAndTangents.srcPoint;
    var tgtPoint = srcTgtPointsAndTangents.tgtPoint;
    var m1 = srcTgtPointsAndTangents.m1;
    var m2 = srcTgtPointsAndTangents.m2;

    var intersectX;
    var intersectY;

    if (m1 == Infinity || m1 == -Infinity) {
      intersectX = srcPoint.x;
      intersectY = point.y;
    } else if (m1 == 0) {
      intersectX = point.x;
      intersectY = srcPoint.y;
    } else {
      var a1 = srcPoint.y - m1 * srcPoint.x;
      var a2 = point.y - m2 * point.x;

      intersectX = (a2 - a1) / (m1 - m2);
      intersectY = m1 * intersectX + a1;
    }

    //Intersection point is the intersection of the lines passing through the nodes and
    //passing through the bend or control point and perpendicular to the other line
    var intersectionPoint = {
      x: intersectX,
      y: intersectY
    };

    return intersectionPoint;
  },
  getAnchorsAsArray: function getAnchorsAsArray(edge) {
    var type = this.getEdgeType(edge);

    if (type === 'inconclusive') {
      return undefined;
    }

    if (edge.css('curve-style') !== this.syntax[type]['edge']) {
      return undefined;
    }

    var anchorList = [];

    var weights = edge.pstyle(this.syntax[type]['weightCss']) ? edge.pstyle(this.syntax[type]['weightCss']).pfValue : [];
    var distances = edge.pstyle(this.syntax[type]['distanceCss']) ? edge.pstyle(this.syntax[type]['distanceCss']).pfValue : [];
    var minLengths = Math.min(weights.length, distances.length);

    var srcPos = edge.source().position();
    var tgtPos = edge.target().position();

    var dy = tgtPos.y - srcPos.y;
    var dx = tgtPos.x - srcPos.x;

    var l = Math.sqrt(dx * dx + dy * dy);

    var vector = {
      x: dx,
      y: dy
    };

    var vectorNorm = {
      x: vector.x / l,
      y: vector.y / l
    };

    var vectorNormInverse = {
      x: -vectorNorm.y,
      y: vectorNorm.x
    };

    for (var s = 0; s < minLengths; s++) {
      var w = weights[s];
      var d = distances[s];

      var w1 = 1 - w;
      var w2 = w;

      var posPts = {
        x1: srcPos.x,
        x2: tgtPos.x,
        y1: srcPos.y,
        y2: tgtPos.y
      };

      var midptPts = posPts;

      var adjustedMidpt = {
        x: midptPts.x1 * w1 + midptPts.x2 * w2,
        y: midptPts.y1 * w1 + midptPts.y2 * w2
      };

      anchorList.push(adjustedMidpt.x + vectorNormInverse.x * d, adjustedMidpt.y + vectorNormInverse.y * d);
    }

    return anchorList;
  },
  convertToRelativePosition: function convertToRelativePosition(edge, point, srcTgtPointsAndTangents) {
    if (srcTgtPointsAndTangents === undefined) {
      srcTgtPointsAndTangents = this.getSrcTgtPointsAndTangents(edge);
    }

    var intersectionPoint = this.getIntersection(edge, point, srcTgtPointsAndTangents);
    var intersectX = intersectionPoint.x;
    var intersectY = intersectionPoint.y;

    var srcPoint = srcTgtPointsAndTangents.srcPoint;
    var tgtPoint = srcTgtPointsAndTangents.tgtPoint;

    var weight;

    if (intersectX != srcPoint.x) {
      weight = (intersectX - srcPoint.x) / (tgtPoint.x - srcPoint.x);
    } else if (intersectY != srcPoint.y) {
      weight = (intersectY - srcPoint.y) / (tgtPoint.y - srcPoint.y);
    } else {
      weight = 0;
    }

    var distance = Math.sqrt(Math.pow(intersectY - point.y, 2) + Math.pow(intersectX - point.x, 2));

    //Get the direction of the line form source point to target point
    var direction1 = this.getLineDirection(srcPoint, tgtPoint);
    //Get the direction of the line from intesection point to the point
    var direction2 = this.getLineDirection(intersectionPoint, point);

    //If the difference is not -2 and not 6 then the direction of the distance is negative
    if (direction1 - direction2 != -2 && direction1 - direction2 != 6) {
      if (distance != 0) distance = -1 * distance;
    }

    return {
      weight: weight,
      distance: distance
    };
  },
  convertToRelativePositions: function convertToRelativePositions(edge, anchorPoints) {
    var srcTgtPointsAndTangents = this.getSrcTgtPointsAndTangents(edge);

    var weights = [];
    var distances = [];

    for (var i = 0; anchorPoints && i < anchorPoints.length; i++) {
      var anchor = anchorPoints[i];
      var relativeAnchorPosition = this.convertToRelativePosition(edge, anchor, srcTgtPointsAndTangents);

      weights.push(relativeAnchorPosition.weight);
      distances.push(relativeAnchorPosition.distance);
    }

    return {
      weights: weights,
      distances: distances
    };
  },
  getDistancesString: function getDistancesString(edge, type) {
    var str = "";

    var distances = edge.data(this.syntax[type]['distance']);
    for (var i = 0; distances && i < distances.length; i++) {
      str = str + " " + distances[i];
    }

    return str;
  },
  getWeightsString: function getWeightsString(edge, type) {
    var str = "";

    var weights = edge.data(this.syntax[type]['weight']);
    for (var i = 0; weights && i < weights.length; i++) {
      str = str + " " + weights[i];
    }

    return str;
  },
  addAnchorPoint: function addAnchorPoint(edge, newAnchorPoint) {
    var type = arguments.length > 2 && arguments[2] !== undefined ? arguments[2] : undefined;

    if (edge === undefined || newAnchorPoint === undefined) {
      edge = this.currentCtxEdge;
      newAnchorPoint = this.currentCtxPos;
    }

    if (type === undefined) type = this.getEdgeType(edge);

    var weightStr = this.syntax[type]['weight'];
    var distanceStr = this.syntax[type]['distance'];

    var relativePosition = this.convertToRelativePosition(edge, newAnchorPoint);
    var originalAnchorWeight = relativePosition.weight;

    var startX = edge.source().position('x');
    var startY = edge.source().position('y');
    var endX = edge.target().position('x');
    var endY = edge.target().position('y');
    var startWeight = this.convertToRelativePosition(edge, { x: startX, y: startY }).weight;
    var endWeight = this.convertToRelativePosition(edge, { x: endX, y: endY }).weight;
    var weightsWithTgtSrc = [startWeight].concat(edge.data(weightStr) ? edge.data(weightStr) : []).concat([endWeight]);

    var anchorsList = this.getAnchorsAsArray(edge);

    var minDist = Infinity;
    var intersection;
    var ptsWithTgtSrc = [startX, startY].concat(anchorsList ? anchorsList : []).concat([endX, endY]);
    var newAnchorIndex = -1;

    for (var i = 0; i < weightsWithTgtSrc.length - 1; i++) {
      var w1 = weightsWithTgtSrc[i];
      var w2 = weightsWithTgtSrc[i + 1];

      //check if the weight is between w1 and w2
      var b1 = this.compareWithPrecision(originalAnchorWeight, w1, true);
      var b2 = this.compareWithPrecision(originalAnchorWeight, w2);
      var b3 = this.compareWithPrecision(originalAnchorWeight, w2, true);
      var b4 = this.compareWithPrecision(originalAnchorWeight, w1);
      if (b1 && b2 || b3 && b4) {
        var startX = ptsWithTgtSrc[2 * i];
        var startY = ptsWithTgtSrc[2 * i + 1];
        var endX = ptsWithTgtSrc[2 * i + 2];
        var endY = ptsWithTgtSrc[2 * i + 3];

        var start = {
          x: startX,
          y: startY
        };

        var end = {
          x: endX,
          y: endY
        };

        var m1 = (startY - endY) / (startX - endX);
        var m2 = -1 / m1;

        var srcTgtPointsAndTangents = {
          srcPoint: start,
          tgtPoint: end,
          m1: m1,
          m2: m2
        };

        var currentIntersection = this.getIntersection(edge, newAnchorPoint, srcTgtPointsAndTangents);
        var dist = Math.sqrt(Math.pow(newAnchorPoint.x - currentIntersection.x, 2) + Math.pow(newAnchorPoint.y - currentIntersection.y, 2));

        //Update the minimum distance
        if (dist < minDist) {
          minDist = dist;
          intersection = currentIntersection;
          newAnchorIndex = i;
        }
      }
    }

    if (intersection !== undefined) {
      newAnchorPoint = intersection;
    }

    relativePosition = this.convertToRelativePosition(edge, newAnchorPoint);

    if (intersection === undefined) {
      relativePosition.distance = 0;
    }

    var weights = edge.data(weightStr);
    var distances = edge.data(distanceStr);

    weights = weights ? weights : [];
    distances = distances ? distances : [];

    if (weights.length === 0) {
      newAnchorIndex = 0;
    }

    //    weights.push(relativeBendPosition.weight);
    //    distances.push(relativeBendPosition.distance);
    if (newAnchorIndex != -1) {
      weights.splice(newAnchorIndex, 0, relativePosition.weight);
      distances.splice(newAnchorIndex, 0, relativePosition.distance);
    }

    edge.data(weightStr, weights);
    edge.data(distanceStr, distances);

    edge.addClass(this.syntax[type]['class']);
    if (weights.length > 1 || distances.length > 1) {
      edge.addClass(this.syntax[type]['multiClass']);
    }

    return newAnchorIndex;
  },
  removeAnchor: function removeAnchor(edge, anchorIndex) {
    if (edge === undefined || anchorIndex === undefined) {
      edge = this.currentCtxEdge;
      anchorIndex = this.currentAnchorIndex;
    }

    var type = this.getEdgeType(edge);

    if (this.edgeTypeInconclusiveShouldntHappen(type, "anchorPointUtilities.js, removeAnchor")) {
      return;
    }

    var distanceStr = this.syntax[type]['weight'];
    var weightStr = this.syntax[type]['distance'];
    var positionDataStr = this.syntax[type]['pointPos'];

    var distances = edge.data(distanceStr);
    var weights = edge.data(weightStr);
    var positions = edge.data(positionDataStr);

    distances.splice(anchorIndex, 1);
    weights.splice(anchorIndex, 1);
    // position data is not given in demo so it throws error here
    // but it should be from the beginning
    if (positions) positions.splice(anchorIndex, 1);

    // only one anchor point left on edge
    if (distances.length == 1 || weights.length == 1) {
      edge.removeClass(this.syntax[type]['multiClass']);
    }
    // no more anchor points on edge
    else if (distances.length == 0 || weights.length == 0) {
        edge.removeClass(this.syntax[type]['class']);
        edge.data(distanceStr, []);
        edge.data(weightStr, []);
      } else {
        edge.data(distanceStr, distances);
        edge.data(weightStr, weights);
      }
  },
  removeAllAnchors: function removeAllAnchors(edge) {
    if (edge === undefined) {
      edge = this.currentCtxEdge;
    }
    var type = this.getEdgeType(edge);

    if (this.edgeTypeInconclusiveShouldntHappen(type, "anchorPointUtilities.js, removeAllAnchors")) {
      return;
    }

    // Remove classes from edge
    edge.removeClass(this.syntax[type]['class']);
    edge.removeClass(this.syntax[type]['multiClass']);

    // Remove all anchor point data from edge
    var distanceStr = this.syntax[type]['weight'];
    var weightStr = this.syntax[type]['distance'];
    var positionDataStr = this.syntax[type]['pointPos'];
    edge.data(distanceStr, []);
    edge.data(weightStr, []);
    // position data is not given in demo so it throws error here
    // but it should be from the beginning
    if (edge.data(positionDataStr)) {
      edge.data(positionDataStr, []);
    }
  },
  calculateDistance: function calculateDistance(pt1, pt2) {
    var diffX = pt1.x - pt2.x;
    var diffY = pt1.y - pt2.y;

    var dist = Math.sqrt(Math.pow(diffX, 2) + Math.pow(diffY, 2));
    return dist;
  },
  /** (Less than or equal to) and (greater then equal to) comparisons with floating point numbers */
  compareWithPrecision: function compareWithPrecision(n1, n2) {
    var isLessThenOrEqual = arguments.length > 2 && arguments[2] !== undefined ? arguments[2] : false;
    var precision = arguments.length > 3 && arguments[3] !== undefined ? arguments[3] : 0.01;

    var diff = n1 - n2;
    if (Math.abs(diff) <= precision) {
      return true;
    }
    if (isLessThenOrEqual) {
      return n1 < n2;
    } else {
      return n1 > n2;
    }
  },
  edgeTypeInconclusiveShouldntHappen: function edgeTypeInconclusiveShouldntHappen(type, place) {
    if (type === 'inconclusive') {
      console.log("In " + place + ": edge type inconclusive should never happen here!!");
      return true;
    }
    return false;
  }
};

module.exports = anchorPointUtilities;

/***/ }),
/* 1 */
/***/ (function(module, exports, __webpack_require__) {

"use strict";


var _typeof = typeof Symbol === "function" && typeof Symbol.iterator === "symbol" ? function (obj) { return typeof obj; } : function (obj) { return obj && typeof Symbol === "function" && obj.constructor === Symbol && obj !== Symbol.prototype ? "symbol" : typeof obj; };

var debounce = function () {
  /**
   * lodash 3.1.1 (Custom Build) <https://lodash.com/>
   * Build: `lodash modern modularize exports="npm" -o ./`
   * Copyright 2012-2015 The Dojo Foundation <http://dojofoundation.org/>
   * Based on Underscore.js 1.8.3 <http://underscorejs.org/LICENSE>
   * Copyright 2009-2015 Jeremy Ashkenas, DocumentCloud and Investigative Reporters & Editors
   * Available under MIT license <https://lodash.com/license>
   */
  /** Used as the `TypeError` message for "Functions" methods. */
  var FUNC_ERROR_TEXT = 'Expected a function';

  /* Native method references for those with the same name as other `lodash` methods. */
  var nativeMax = Math.max,
      nativeNow = Date.now;

  /**
   * Gets the number of milliseconds that have elapsed since the Unix epoch
   * (1 January 1970 00:00:00 UTC).
   *
   * @static
   * @memberOf _
   * @category Date
   * @example
   *
   * _.defer(function(stamp) {
   *   console.log(_.now() - stamp);
   * }, _.now());
   * // => logs the number of milliseconds it took for the deferred function to be invoked
   */
  var now = nativeNow || function () {
    return new Date().getTime();
  };

  /**
   * Creates a debounced function that delays invoking `func` until after `wait`
   * milliseconds have elapsed since the last time the debounced function was
   * invoked. The debounced function comes with a `cancel` method to cancel
   * delayed invocations. Provide an options object to indicate that `func`
   * should be invoked on the leading and/or trailing edge of the `wait` timeout.
   * Subsequent calls to the debounced function return the result of the last
   * `func` invocation.
   *
   * **Note:** If `leading` and `trailing` options are `true`, `func` is invoked
   * on the trailing edge of the timeout only if the the debounced function is
   * invoked more than once during the `wait` timeout.
   *
   * See [David Corbacho's article](http://drupalmotion.com/article/debounce-and-throttle-visual-explanation)
   * for details over the differences between `_.debounce` and `_.throttle`.
   *
   * @static
   * @memberOf _
   * @category Function
   * @param {Function} func The function to debounce.
   * @param {number} [wait=0] The number of milliseconds to delay.
   * @param {Object} [options] The options object.
   * @param {boolean} [options.leading=false] Specify invoking on the leading
   *  edge of the timeout.
   * @param {number} [options.maxWait] The maximum time `func` is allowed to be
   *  delayed before it's invoked.
   * @param {boolean} [options.trailing=true] Specify invoking on the trailing
   *  edge of the timeout.
   * @returns {Function} Returns the new debounced function.
   * @example
   *
   * // avoid costly calculations while the window size is in flux
   * jQuery(window).on('resize', _.debounce(calculateLayout, 150));
   *
   * // invoke `sendMail` when the click event is fired, debouncing subsequent calls
   * jQuery('#postbox').on('click', _.debounce(sendMail, 300, {
   *   'leading': true,
   *   'trailing': false
   * }));
   *
   * // ensure `batchLog` is invoked once after 1 second of debounced calls
   * var source = new EventSource('/stream');
   * jQuery(source).on('message', _.debounce(batchLog, 250, {
   *   'maxWait': 1000
   * }));
   *
   * // cancel a debounced call
   * var todoChanges = _.debounce(batchLog, 1000);
   * Object.observe(models.todo, todoChanges);
   *
   * Object.observe(models, function(changes) {
   *   if (_.find(changes, { 'user': 'todo', 'type': 'delete'})) {
   *     todoChanges.cancel();
   *   }
   * }, ['delete']);
   *
   * // ...at some point `models.todo` is changed
   * models.todo.completed = true;
   *
   * // ...before 1 second has passed `models.todo` is deleted
   * // which cancels the debounced `todoChanges` call
   * delete models.todo;
   */
  function debounce(func, wait, options) {
    var args,
        maxTimeoutId,
        result,
        stamp,
        thisArg,
        timeoutId,
        trailingCall,
        lastCalled = 0,
        maxWait = false,
        trailing = true;

    if (typeof func != 'function') {
      throw new TypeError(FUNC_ERROR_TEXT);
    }
    wait = wait < 0 ? 0 : +wait || 0;
    if (options === true) {
      var leading = true;
      trailing = false;
    } else if (isObject(options)) {
      leading = !!options.leading;
      maxWait = 'maxWait' in options && nativeMax(+options.maxWait || 0, wait);
      trailing = 'trailing' in options ? !!options.trailing : trailing;
    }

    function cancel() {
      if (timeoutId) {
        clearTimeout(timeoutId);
      }
      if (maxTimeoutId) {
        clearTimeout(maxTimeoutId);
      }
      lastCalled = 0;
      maxTimeoutId = timeoutId = trailingCall = undefined;
    }

    function complete(isCalled, id) {
      if (id) {
        clearTimeout(id);
      }
      maxTimeoutId = timeoutId = trailingCall = undefined;
      if (isCalled) {
        lastCalled = now();
        result = func.apply(thisArg, args);
        if (!timeoutId && !maxTimeoutId) {
          args = thisArg = undefined;
        }
      }
    }

    function delayed() {
      var remaining = wait - (now() - stamp);
      if (remaining <= 0 || remaining > wait) {
        complete(trailingCall, maxTimeoutId);
      } else {
        timeoutId = setTimeout(delayed, remaining);
      }
    }

    function maxDelayed() {
      complete(trailing, timeoutId);
    }

    function debounced() {
      args = arguments;
      stamp = now();
      thisArg = this;
      trailingCall = trailing && (timeoutId || !leading);

      if (maxWait === false) {
        var leadingCall = leading && !timeoutId;
      } else {
        if (!maxTimeoutId && !leading) {
          lastCalled = stamp;
        }
        var remaining = maxWait - (stamp - lastCalled),
            isCalled = remaining <= 0 || remaining > maxWait;

        if (isCalled) {
          if (maxTimeoutId) {
            maxTimeoutId = clearTimeout(maxTimeoutId);
          }
          lastCalled = stamp;
          result = func.apply(thisArg, args);
        } else if (!maxTimeoutId) {
          maxTimeoutId = setTimeout(maxDelayed, remaining);
        }
      }
      if (isCalled && timeoutId) {
        timeoutId = clearTimeout(timeoutId);
      } else if (!timeoutId && wait !== maxWait) {
        timeoutId = setTimeout(delayed, wait);
      }
      if (leadingCall) {
        isCalled = true;
        result = func.apply(thisArg, args);
      }
      if (isCalled && !timeoutId && !maxTimeoutId) {
        args = thisArg = undefined;
      }
      return result;
    }

    debounced.cancel = cancel;
    return debounced;
  }

  /**
   * Checks if `value` is the [language type](https://es5.github.io/#x8) of `Object`.
   * (e.g. arrays, functions, objects, regexes, `new Number(0)`, and `new String('')`)
   *
   * @static
   * @memberOf _
   * @category Lang
   * @param {*} value The value to check.
   * @returns {boolean} Returns `true` if `value` is an object, else `false`.
   * @example
   *
   * _.isObject({});
   * // => true
   *
   * _.isObject([1, 2, 3]);
   * // => true
   *
   * _.isObject(1);
   * // => false
   */
  function isObject(value) {
    // Avoid a V8 JIT bug in Chrome 19-20.
    // See https://code.google.com/p/v8/issues/detail?id=2291 for more details.
    var type = typeof value === 'undefined' ? 'undefined' : _typeof(value);
    return !!value && (type == 'object' || type == 'function');
  }

  return debounce;
}();

module.exports = debounce;

/***/ }),
/* 2 */
/***/ (function(module, exports, __webpack_require__) {

"use strict";
var __WEBPACK_AMD_DEFINE_RESULT__;

;(function () {
  'use strict';

  var anchorPointUtilities = __webpack_require__(0);
  var debounce = __webpack_require__(1);

  // registers the extension on a cytoscape lib ref
  var register = function register(cytoscape, $, Konva) {
    var uiUtilities = __webpack_require__(3);

    if (!cytoscape || !$ || !Konva) {
      return;
    } // can't register if required libraries unspecified

    var defaults = {
      // this function specifies the poitions of bend points
      // strictly name the property 'bendPointPositions' for the edge to be detected for bend point edititng
      bendPositionsFunction: function bendPositionsFunction(ele) {
        return ele.data('bendPointPositions');
      },
      // this function specifies the poitions of control points
      // strictly name the property 'controlPointPositions' for the edge to be detected for control point edititng
      controlPositionsFunction: function controlPositionsFunction(ele) {
        return ele.data('controlPointPositions');
      },
      // whether to initilize bend and control points on creation of this extension automatically
      initAnchorsAutomatically: true,
      // the classes of those edges that should be ignored
      ignoredClasses: [],
      // whether the bend and control editing operations are undoable (requires cytoscape-undo-redo.js)
      undoable: false,
      // the size of bend and control point shape is obtained by multipling width of edge with this parameter
      anchorShapeSizeFactor: 3,
      // z-index value of the canvas in which bend and control points are drawn
      zIndex: 999,
      // whether to start the plugin in the enabled state
      enabled: true,
      //An option that controls the distance within which a bend point is considered "near" the line segment between its two neighbors and will be automatically removed
      bendRemovalSensitivity: 8,
      // title of add bend point menu item (User may need to adjust width of menu items according to length of this option)
      addBendMenuItemTitle: "Add Bend Point",
      // title of remove bend point menu item (User may need to adjust width of menu items according to length of this option)
      removeBendMenuItemTitle: "Remove Bend Point",
      // title of remove all bend points menu item
      removeAllBendMenuItemTitle: "Remove All Bend Points",
      // title of add control point menu item (User may need to adjust width of menu items according to length of this option)
      addControlMenuItemTitle: "Add Control Point",
      // title of remove control point menu item (User may need to adjust width of menu items according to length of this option)
      removeControlMenuItemTitle: "Remove Control Point",
      // title of remove all control points menu item
      removeAllControlMenuItemTitle: "Remove All Control Points",
      // whether the bend and control points can be moved by arrows
      moveSelectedAnchorsOnKeyEvents: function moveSelectedAnchorsOnKeyEvents() {
        return true;
      },
      // whether 'Remove all bend points' and 'Remove all control points' options should be presented
      enableMultipleAnchorRemovalOption: false
    };

    var options;
    var initialized = false;

    // Merge default options with the ones coming from parameter
    function extend(defaults, options) {
      var obj = {};

      for (var i in defaults) {
        obj[i] = defaults[i];
      }

      for (var i in options) {
        // SPLIT FUNCTIONALITY?
        if (i == "bendRemovalSensitivity") {
          var value = options[i];
          if (!isNaN(value)) {
            if (value >= 0 && value <= 20) {
              obj[i] = options[i];
            } else if (value < 0) {
              obj[i] = 0;
            } else {
              obj[i] = 20;
            }
          }
        } else {
          obj[i] = options[i];
        }
      }

      return obj;
    };

    cytoscape('core', 'edgeEditing', function (opts) {
      var cy = this;

      if (opts === 'initialized') {
        return initialized;
      }

      if (opts !== 'get') {
        // merge the options with default ones
        options = extend(defaults, opts);
        initialized = true;

        // define edgebendediting-hasbendpoints css class
        cy.style().selector('.edgebendediting-hasbendpoints').css({
          'curve-style': 'segments',
          'segment-distances': function segmentDistances(ele) {
            return anchorPointUtilities.getDistancesString(ele, 'bend');
          },
          'segment-weights': function segmentWeights(ele) {
            return anchorPointUtilities.getWeightsString(ele, 'bend');
          },
          'edge-distances': 'node-position'
        });

        // define edgecontrolediting-hascontrolpoints css class
        cy.style().selector('.edgecontrolediting-hascontrolpoints').css({
          'curve-style': 'unbundled-bezier',
          'control-point-distances': function controlPointDistances(ele) {
            return anchorPointUtilities.getDistancesString(ele, 'control');
          },
          'control-point-weights': function controlPointWeights(ele) {
            return anchorPointUtilities.getWeightsString(ele, 'control');
          },
          'edge-distances': 'node-position'
        });

        anchorPointUtilities.setIgnoredClasses(options.ignoredClasses);

        // init bend positions conditionally
        if (options.initAnchorsAutomatically) {
          // CHECK THIS, options.ignoredClasses UNUSED
          anchorPointUtilities.initAnchorPoints(options.bendPositionsFunction, options.controlPositionsFunction, cy.edges(), options.ignoredClasses);
        }

        if (options.enabled) uiUtilities(options, cy);else uiUtilities("unbind", cy);
      }

      var instance = initialized ? {
        /*
        * get bend or control points of the given edge in an array A,
        * A[2 * i] is the x coordinate and A[2 * i + 1] is the y coordinate
        * of the ith bend point. (Returns undefined if the curve style is not segments nor unbundled bezier)
        */
        getAnchorsAsArray: function getAnchorsAsArray(ele) {
          return anchorPointUtilities.getAnchorsAsArray(ele);
        },
        // Initilize points for the given edges using 'options.bendPositionsFunction'
        initAnchorPoints: function initAnchorPoints(eles) {
          anchorPointUtilities.initAnchorPoints(options.bendPositionsFunction, options.controlPositionsFunction, eles);
        },
        deleteSelectedAnchor: function deleteSelectedAnchor(ele, index) {
          anchorPointUtilities.removeAnchor(ele, index);
        }
      } : undefined;

      return instance; // chainability
    });
  };

  if ( true && module.exports) {
    // expose as a commonjs module
    module.exports = register;
  }

  if (true) {
    // expose as an amd/requirejs module
    !(__WEBPACK_AMD_DEFINE_RESULT__ = (function () {
      return register;
    }).call(exports, __webpack_require__, exports, module),
				__WEBPACK_AMD_DEFINE_RESULT__ !== undefined && (module.exports = __WEBPACK_AMD_DEFINE_RESULT__));
  }

  if (typeof cytoscape !== 'undefined' && $ && Konva) {
    // expose to global cytoscape (i.e. window.cytoscape)
    register(cytoscape, $, Konva);
  }
})();

/***/ }),
/* 3 */
/***/ (function(module, exports, __webpack_require__) {

"use strict";


var _typeof = typeof Symbol === "function" && typeof Symbol.iterator === "symbol" ? function (obj) { return typeof obj; } : function (obj) { return obj && typeof Symbol === "function" && obj.constructor === Symbol && obj !== Symbol.prototype ? "symbol" : typeof obj; };

var debounce = __webpack_require__(1);
var anchorPointUtilities = __webpack_require__(0);
var reconnectionUtilities = __webpack_require__(4);
var registerUndoRedoFunctions = __webpack_require__(5);
var stageId = 0;

module.exports = function (params, cy) {
  var fn = params;

  var addBendPointCxtMenuId = 'cy-edge-bend-editing-cxt-add-bend-point' + stageId;
  var removeBendPointCxtMenuId = 'cy-edge-bend-editing-cxt-remove-bend-point' + stageId;
  var removeAllBendPointCtxMenuId = 'cy-edge-bend-editing-cxt-remove-multiple-bend-point' + stageId;
  var addControlPointCxtMenuId = 'cy-edge-control-editing-cxt-add-control-point' + stageId;
  var removeControlPointCxtMenuId = 'cy-edge-control-editing-cxt-remove-control-point' + stageId;
  var removeAllControlPointCtxMenuId = 'cy-edge-bend-editing-cxt-remove-multiple-control-point' + stageId;
  var eStyle, eRemove, eAdd, eZoom, eSelect, eUnselect, eTapStart, eTapStartOnEdge, eTapDrag, eTapEnd, eCxtTap, eDrag;
  // last status of gestures
  var lastPanningEnabled, lastZoomingEnabled, lastBoxSelectionEnabled;
  var lastActiveBgOpacity;
  // status of edge to highlight bends and selected edges
  var edgeToHighlight, numberOfSelectedEdges;

  // the Kanva.shape() for the endpoints
  var endpointShape1 = null,
      endpointShape2 = null;
  // used to stop certain cy listeners when interracting with anchors
  var anchorTouched = false;
  // used call eMouseDown of anchorManager if the mouse is out of the content on cy.on(tapend)
  var mouseOut;

  var functions = {
    init: function init() {
      // register undo redo functions
      registerUndoRedoFunctions(cy, anchorPointUtilities, params);

      var self = this;
      var opts = params;

      /*
        Make sure we don't append an element that already exists.
        This extension canvas uses the same html element as edge-editing.
        It makes sense since it also uses the same Konva stage.
        Without the below logic, an empty canvasElement would be created
        for one of these extensions for no reason.
      */
      var $container = $(this);
      var canvasElementId = 'cy-node-edge-editing-stage' + stageId;
      stageId++;
      var $canvasElement = $('<div id="' + canvasElementId + '"></div>');

      if ($container.find('#' + canvasElementId).length < 1) {
        $container.append($canvasElement);
      }

      /* 
        Maintain a single Konva.stage object throughout the application that uses this extension
        such as Newt. This is important since having different stages causes weird behavior
        on other extensions that also use Konva, like not listening to mouse clicks and such.
        If you are someone that is creating an extension that uses Konva in the future, you need to
        be careful about how events register. If you use a different stage almost certainly one
        or both of the extensions that use the stage created below will break.
      */
      var stage;
      if (Konva.stages.length < stageId) {
        stage = new Konva.Stage({
          id: 'node-edge-editing-stage',
          container: canvasElementId, // id of container <div>
          width: $container.width(),
          height: $container.height()
        });
      } else {
        stage = Konva.stages[stageId - 1];
      }

      var canvas;
      if (stage.getChildren().length < 1) {
        canvas = new Konva.Layer();
        stage.add(canvas);
      } else {
        canvas = stage.getChildren()[0];
      }

      var anchorManager = {
        edge: undefined,
        edgeType: 'inconclusive',
        anchors: [],
        // remembers the touched anchor to avoid clearing it when dragging happens
        touchedAnchor: undefined,
        // remembers the index of the moving anchor
        touchedAnchorIndex: undefined,
        bindListeners: function bindListeners(anchor) {
          anchor.on("mousedown touchstart", this.eMouseDown);
        },
        unbindListeners: function unbindListeners(anchor) {
          anchor.off("mousedown touchstart", this.eMouseDown);
        },
        // gets trigger on clicking on context menus, while cy listeners don't get triggered
        // it can cause weird behaviour if not aware of this
        eMouseDown: function eMouseDown(event) {
          // anchorManager.edge.unselect() won't work sometimes if this wasn't here
          cy.autounselectify(false);

          // eMouseDown(set) -> tapdrag(used) -> eMouseUp(reset)
          anchorTouched = true;
          anchorManager.touchedAnchor = event.target;
          mouseOut = false;
          anchorManager.edge.unselect();

          // remember state before changing
          var weightStr = anchorPointUtilities.syntax[anchorManager.edgeType]['weight'];
          var distanceStr = anchorPointUtilities.syntax[anchorManager.edgeType]['distance'];

          var edge = anchorManager.edge;
          moveAnchorParam = {
            edge: edge,
            type: anchorManager.edgeType,
            weights: edge.data(weightStr) ? [].concat(edge.data(weightStr)) : [],
            distances: edge.data(distanceStr) ? [].concat(edge.data(distanceStr)) : []
          };

          turnOffActiveBgColor();
          disableGestures();

          cy.autoungrabify(true);

          canvas.getStage().on("contentTouchend contentMouseup", anchorManager.eMouseUp);
          canvas.getStage().on("contentMouseout", anchorManager.eMouseOut);
        },
        // gets called before cy.on('tapend')
        eMouseUp: function eMouseUp(event) {
          // won't be called if the mouse is released out of screen
          anchorTouched = false;
          anchorManager.touchedAnchor = undefined;
          mouseOut = false;
          anchorManager.edge.select();

          resetActiveBgColor();
          resetGestures();

          /* 
           * IMPORTANT
           * Any programmatic calls to .select(), .unselect() after this statement are ignored
           * until cy.autounselectify(false) is called in one of the previous:
           * 
           * cy.on('tapstart')
           * anchor.on('mousedown touchstart')
           * document.on('keydown')
           * cy.on('tapdrap')
           * 
           * Doesn't affect UX, but may cause confusing behaviour if not aware of this when coding
           * 
           * Why is this here?
           * This is important to keep edges from being auto deselected from working
           * with anchors out of the edge body (for unbundled bezier, technically not necessery for segements).
           * 
           * These is anther cy.autoselectify(true) in cy.on('tapend') 
           * 
          */
          cy.autounselectify(true);
          cy.autoungrabify(false);

          canvas.getStage().off("contentTouchend contentMouseup", anchorManager.eMouseUp);
          canvas.getStage().off("contentMouseout", anchorManager.eMouseOut);
        },
        // handle mouse going out of canvas 
        eMouseOut: function eMouseOut(event) {
          mouseOut = true;
        },
        clearAnchorsExcept: function clearAnchorsExcept() {
          var _this = this;

          var dontClean = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : undefined;

          var exceptionApplies = false;

          this.anchors.forEach(function (anchor, index) {
            if (dontClean && anchor === dontClean) {
              exceptionApplies = true; // the dontClean anchor is not cleared
              return;
            }

            _this.unbindListeners(anchor);
            anchor.destroy();
          });

          if (exceptionApplies) {
            this.anchors = [dontClean];
          } else {
            this.anchors = [];
            this.edge = undefined;
            this.edgeType = 'inconclusive';
          }
        },
        // render the bend and control shapes of the given edge
        renderAnchorShapes: function renderAnchorShapes(edge) {
          this.edge = edge;
          this.edgeType = anchorPointUtilities.getEdgeType(edge);

          if (!edge.hasClass('edgebendediting-hasbendpoints') && !edge.hasClass('edgecontrolediting-hascontrolpoints')) {
            return;
          }

          var anchorList = anchorPointUtilities.getAnchorsAsArray(edge); //edge._private.rdata.segpts;
          var length = getAnchorShapesLength(edge) * 0.65;

          var srcPos = edge.source().position();
          var tgtPos = edge.target().position();

          for (var i = 0; anchorList && i < anchorList.length; i = i + 2) {
            var anchorX = anchorList[i];
            var anchorY = anchorList[i + 1];

            this.renderAnchorShape(anchorX, anchorY, length);
          }

          canvas.draw();
        },
        // render a anchor shape with the given parameters
        renderAnchorShape: function renderAnchorShape(anchorX, anchorY, length) {
          // get the top left coordinates
          var topLeftX = anchorX - length / 2;
          var topLeftY = anchorY - length / 2;

          // convert to rendered parameters
          var renderedTopLeftPos = convertToRenderedPosition({ x: topLeftX, y: topLeftY });
          length *= cy.zoom();

          var newAnchor = new Konva.Rect({
            x: renderedTopLeftPos.x,
            y: renderedTopLeftPos.y,
            width: length,
            height: length,
            fill: 'black',
            strokeWidth: 0,
            draggable: true
          });

          this.anchors.push(newAnchor);
          this.bindListeners(newAnchor);
          canvas.add(newAnchor);
        }
      };

      var cxtAddBendFcn = function cxtAddBendFcn(event) {
        cxtAddAnchorFcn(event, 'bend');
      };

      var cxtAddControlFcn = function cxtAddControlFcn(event) {
        cxtAddAnchorFcn(event, 'control');
      };

      var cxtAddAnchorFcn = function cxtAddAnchorFcn(event, anchorType) {
        var edge = event.target || event.cyTarget;
        if (!anchorPointUtilities.isIgnoredEdge(edge)) {

          var type = anchorPointUtilities.getEdgeType(edge);
          var weights, distances, weightStr, distanceStr;

          if (type === 'inconclusive') {
            weights = [];
            distances = [];
          } else {
            weightStr = anchorPointUtilities.syntax[type]['weight'];
            distanceStr = anchorPointUtilities.syntax[type]['distance'];

            weights = edge.data(weightStr) ? [].concat(edge.data(weightStr)) : edge.data(weightStr);
            distances = edge.data(distanceStr) ? [].concat(edge.data(distanceStr)) : edge.data(distanceStr);
          }

          var param = {
            edge: edge,
            type: type,
            weights: weights,
            distances: distances
          };

          // the undefined go for edge and newAnchorPoint parameters
          anchorPointUtilities.addAnchorPoint(undefined, undefined, anchorType);

          if (options().undoable) {
            cy.undoRedo().do('changeAnchorPoints', param);
          }
        }

        refreshDraws();
        edge.select();
      };

      var cxtRemoveAnchorFcn = function cxtRemoveAnchorFcn(event) {
        var edge = anchorManager.edge;
        var type = anchorPointUtilities.getEdgeType(edge);

        if (anchorPointUtilities.edgeTypeInconclusiveShouldntHappen(type, "UiUtilities.js, cxtRemoveAnchorFcn")) {
          return;
        }

        var param = {
          edge: edge,
          type: type,
          weights: [].concat(edge.data(anchorPointUtilities.syntax[type]['weight'])),
          distances: [].concat(edge.data(anchorPointUtilities.syntax[type]['distance']))
        };

        anchorPointUtilities.removeAnchor();

        if (options().undoable) {
          cy.undoRedo().do('changeAnchorPoints', param);
        }

        setTimeout(function () {
          refreshDraws();edge.select();
        }, 50);
      };

      var cxtRemoveAllAnchorsFcn = function cxtRemoveAllAnchorsFcn(event) {
        var edge = anchorManager.edge;
        var type = anchorPointUtilities.getEdgeType(edge);
        var param = {
          edge: edge,
          type: type,
          weights: [].concat(edge.data(anchorPointUtilities.syntax[type]['weight'])),
          distances: [].concat(edge.data(anchorPointUtilities.syntax[type]['distance']))
        };

        anchorPointUtilities.removeAllAnchors();

        if (options().undoable) {
          cy.undoRedo().do('changeAnchorPoints', param);
        }
        setTimeout(function () {
          refreshDraws();edge.select();
        }, 50);
      };

      // function to reconnect edge
      var handleReconnectEdge = opts.handleReconnectEdge;
      // function to validate edge source and target on reconnection
      var validateEdge = opts.validateEdge;
      // function to be called on invalid edge reconnection
      var actOnUnsuccessfulReconnection = opts.actOnUnsuccessfulReconnection;

      var menuItems = [{
        id: addBendPointCxtMenuId,
        content: opts.addBendMenuItemTitle,
        selector: 'edge',
        onClickFunction: cxtAddBendFcn
      }, {
        id: removeBendPointCxtMenuId,
        content: opts.removeBendMenuItemTitle,
        selector: 'edge',
        onClickFunction: cxtRemoveAnchorFcn
      }, {
        id: removeAllBendPointCtxMenuId,
        content: opts.removeAllBendMenuItemTitle,
        selector: opts.enableMultipleAnchorRemovalOption && ':selected.edgebendediting-hasmultiplebendpoints',
        onClickFunction: cxtRemoveAllAnchorsFcn
      }, {
        id: addControlPointCxtMenuId,
        content: opts.addControlMenuItemTitle,
        selector: 'edge',
        coreAsWell: true,
        onClickFunction: cxtAddControlFcn
      }, {
        id: removeControlPointCxtMenuId,
        content: opts.removeControlMenuItemTitle,
        selector: 'edge',
        coreAsWell: true,
        onClickFunction: cxtRemoveAnchorFcn
      }, {
        id: removeAllControlPointCtxMenuId,
        content: opts.removeAllControlMenuItemTitle,
        selector: opts.enableMultipleAnchorRemovalOption && ':selected.edgecontrolediting-hasmultiplecontrolpoints',
        onClickFunction: cxtRemoveAllAnchorsFcn
      }];

      if (cy.contextMenus) {
        var menus = cy.contextMenus('get');
        // If context menus is active just append menu items else activate the extension
        // with initial menu items
        if (menus.isActive()) {
          menus.appendMenuItems(menuItems);
        } else {
          cy.contextMenus({
            menuItems: menuItems
          });
        }
      }

      var _sizeCanvas = debounce(function () {
        $canvasElement.attr('height', $container.height()).attr('width', $container.width()).css({
          'position': 'absolute',
          'top': 0,
          'left': 0,
          'z-index': options().zIndex
        });

        setTimeout(function () {
          var canvasBb = $canvasElement.offset();
          var containerBb = $container.offset();

          $canvasElement.css({
            'top': -(canvasBb.top - containerBb.top),
            'left': -(canvasBb.left - containerBb.left)
          });

          canvas.getStage().setWidth($container.width());
          canvas.getStage().setHeight($container.height());

          // redraw on canvas resize
          if (cy) {
            refreshDraws();
          }
        }, 0);
      }, 250);

      function sizeCanvas() {
        _sizeCanvas();
      }

      sizeCanvas();

      $(window).bind('resize', function () {
        sizeCanvas();
      });

      // write options to data
      var data = $container.data('cyedgeediting');
      if (data == null) {
        data = {};
      }
      data.options = opts;

      var optCache;

      function options() {
        return optCache || (optCache = $container.data('cyedgeediting').options);
      }

      // we will need to convert model positons to rendered positions
      function convertToRenderedPosition(modelPosition) {
        var pan = cy.pan();
        var zoom = cy.zoom();

        var x = modelPosition.x * zoom + pan.x;
        var y = modelPosition.y * zoom + pan.y;

        return {
          x: x,
          y: y
        };
      }

      function refreshDraws() {

        // don't clear anchor which is being moved
        anchorManager.clearAnchorsExcept(anchorManager.touchedAnchor);

        if (endpointShape1 !== null) {
          endpointShape1.destroy();
          endpointShape1 = null;
        }
        if (endpointShape2 !== null) {
          endpointShape2.destroy();
          endpointShape2 = null;
        }
        canvas.draw();

        if (edgeToHighlight) {
          anchorManager.renderAnchorShapes(edgeToHighlight);
          renderEndPointShapes(edgeToHighlight);
        }
      }

      // render the end points shapes of the given edge
      function renderEndPointShapes(edge) {
        if (!edge) {
          return;
        }

        var edge_pts = anchorPointUtilities.getAnchorsAsArray(edge);
        if (typeof edge_pts === 'undefined') {
          edge_pts = [];
        }
        var sourcePos = edge.sourceEndpoint();
        var targetPos = edge.targetEndpoint();
        edge_pts.unshift(sourcePos.y);
        edge_pts.unshift(sourcePos.x);
        edge_pts.push(targetPos.x);
        edge_pts.push(targetPos.y);

        if (!edge_pts) return;

        var src = {
          x: edge_pts[0],
          y: edge_pts[1]
        };

        var target = {
          x: edge_pts[edge_pts.length - 2],
          y: edge_pts[edge_pts.length - 1]
        };

        var nextToSource = {
          x: edge_pts[2],
          y: edge_pts[3]
        };
        var nextToTarget = {
          x: edge_pts[edge_pts.length - 4],
          y: edge_pts[edge_pts.length - 3]
        };
        var length = getAnchorShapesLength(edge) * 0.65;

        renderEachEndPointShape(src, target, length, nextToSource, nextToTarget);
      }

      function renderEachEndPointShape(source, target, length, nextToSource, nextToTarget) {
        // get the top left coordinates of source and target
        var sTopLeftX = source.x - length / 2;
        var sTopLeftY = source.y - length / 2;

        var tTopLeftX = target.x - length / 2;
        var tTopLeftY = target.y - length / 2;

        var nextToSourceX = nextToSource.x - length / 2;
        var nextToSourceY = nextToSource.y - length / 2;

        var nextToTargetX = nextToTarget.x - length / 2;
        var nextToTargetY = nextToTarget.y - length / 2;

        // convert to rendered parameters
        var renderedSourcePos = convertToRenderedPosition({ x: sTopLeftX, y: sTopLeftY });
        var renderedTargetPos = convertToRenderedPosition({ x: tTopLeftX, y: tTopLeftY });
        length = length * cy.zoom() / 2;

        var renderedNextToSource = convertToRenderedPosition({ x: nextToSourceX, y: nextToSourceY });
        var renderedNextToTarget = convertToRenderedPosition({ x: nextToTargetX, y: nextToTargetY });

        //how far to go from the node along the edge
        var distanceFromNode = length;

        var distanceSource = Math.sqrt(Math.pow(renderedNextToSource.x - renderedSourcePos.x, 2) + Math.pow(renderedNextToSource.y - renderedSourcePos.y, 2));
        var sourceEndPointX = renderedSourcePos.x + distanceFromNode / distanceSource * (renderedNextToSource.x - renderedSourcePos.x);
        var sourceEndPointY = renderedSourcePos.y + distanceFromNode / distanceSource * (renderedNextToSource.y - renderedSourcePos.y);

        var distanceTarget = Math.sqrt(Math.pow(renderedNextToTarget.x - renderedTargetPos.x, 2) + Math.pow(renderedNextToTarget.y - renderedTargetPos.y, 2));
        var targetEndPointX = renderedTargetPos.x + distanceFromNode / distanceTarget * (renderedNextToTarget.x - renderedTargetPos.x);
        var targetEndPointY = renderedTargetPos.y + distanceFromNode / distanceTarget * (renderedNextToTarget.y - renderedTargetPos.y);

        // render end point shape for source and target
        endpointShape1 = new Konva.Circle({
          x: sourceEndPointX + length,
          y: sourceEndPointY + length,
          radius: length,
          fill: 'black'
        });

        endpointShape2 = new Konva.Circle({
          x: targetEndPointX + length,
          y: targetEndPointY + length,
          radius: length,
          fill: 'black'
        });

        canvas.add(endpointShape1);
        canvas.add(endpointShape2);
        canvas.draw();
      }

      // get the length of anchor points to be rendered
      function getAnchorShapesLength(edge) {
        var factor = options().anchorShapeSizeFactor;
        if (parseFloat(edge.css('width')) <= 2.5) return 2.5 * factor;else return parseFloat(edge.css('width')) * factor;
      }

      // check if the anchor represented by {x, y} is inside the point shape
      function checkIfInsideShape(x, y, length, centerX, centerY) {
        var minX = centerX - length / 2;
        var maxX = centerX + length / 2;
        var minY = centerY - length / 2;
        var maxY = centerY + length / 2;

        var inside = x >= minX && x <= maxX && y >= minY && y <= maxY;
        return inside;
      }

      // get the index of anchor containing the point represented by {x, y}
      function getContainingShapeIndex(x, y, edge) {
        var type = anchorPointUtilities.getEdgeType(edge);

        if (type === 'inconclusive') {
          return -1;
        }

        if (edge.data(anchorPointUtilities.syntax[type]['weight']) == null || edge.data(anchorPointUtilities.syntax[type]['weight']).length == 0) {
          return -1;
        }

        var anchorList = anchorPointUtilities.getAnchorsAsArray(edge); //edge._private.rdata.segpts;
        var length = getAnchorShapesLength(edge);

        for (var i = 0; anchorList && i < anchorList.length; i = i + 2) {
          var anchorX = anchorList[i];
          var anchorY = anchorList[i + 1];

          var inside = checkIfInsideShape(x, y, length, anchorX, anchorY);
          if (inside) {
            return i / 2;
          }
        }

        return -1;
      };

      function getContainingEndPoint(x, y, edge) {
        var length = getAnchorShapesLength(edge);
        var allPts = edge._private.rscratch.allpts;
        var src = {
          x: allPts[0],
          y: allPts[1]
        };
        var target = {
          x: allPts[allPts.length - 2],
          y: allPts[allPts.length - 1]
        };
        convertToRenderedPosition(src);
        convertToRenderedPosition(target);

        // Source:0, Target:1, None:-1
        if (checkIfInsideShape(x, y, length, src.x, src.y)) return 0;else if (checkIfInsideShape(x, y, length, target.x, target.y)) return 1;else return -1;
      }

      // store the current status of gestures and set them to false
      function disableGestures() {
        lastPanningEnabled = cy.panningEnabled();
        lastZoomingEnabled = cy.zoomingEnabled();
        lastBoxSelectionEnabled = cy.boxSelectionEnabled();

        cy.zoomingEnabled(false).panningEnabled(false).boxSelectionEnabled(false);
      }

      // reset the gestures by their latest status
      function resetGestures() {
        cy.zoomingEnabled(lastZoomingEnabled).panningEnabled(lastPanningEnabled).boxSelectionEnabled(lastBoxSelectionEnabled);
      }

      function turnOffActiveBgColor() {
        // found this at the cy-node-resize code, but doesn't seem to find the object most of the time
        if (cy.style()._private.coreStyle["active-bg-opacity"]) {
          lastActiveBgOpacity = cy.style()._private.coreStyle["active-bg-opacity"].value;
        } else {
          // arbitrary, feel free to change
          // trial and error showed that 0.15 was closest to the old color
          lastActiveBgOpacity = 0.15;
        }

        cy.style().selector("core").style("active-bg-opacity", 0).update();
      }

      function resetActiveBgColor() {
        cy.style().selector("core").style("active-bg-opacity", lastActiveBgOpacity).update();
      }

      function moveAnchorPoints(positionDiff, edges) {
        edges.forEach(function (edge) {
          var previousAnchorsPosition = anchorPointUtilities.getAnchorsAsArray(edge);
          var nextAnchorPointsPosition = [];
          if (previousAnchorsPosition != undefined) {
            for (var i = 0; i < previousAnchorsPosition.length; i += 2) {
              nextAnchorPointsPosition.push({ x: previousAnchorsPosition[i] + positionDiff.x, y: previousAnchorsPosition[i + 1] + positionDiff.y });
            }
            var type = anchorPointUtilities.getEdgeType(edge);

            if (anchorPointUtilities.edgeTypeInconclusiveShouldntHappen(type, "UiUtilities.js, moveAnchorPoints")) {
              return;
            }

            edge.data(anchorPointUtilities.syntax[type]['pointPos'], nextAnchorPointsPosition);
          }
        });
        anchorPointUtilities.initAnchorPoints(options().bendPositionsFunction, options().controlPositionsFunction, edges);

        // Listener defined in other extension
        // Might have compatibility issues after the unbundled bezier
        cy.trigger('bendPointMovement');
      }

      function moveAnchorOnDrag(edge, type, index, position) {
        var weights = edge.data(anchorPointUtilities.syntax[type]['weight']);
        var distances = edge.data(anchorPointUtilities.syntax[type]['distance']);

        var relativeAnchorPosition = anchorPointUtilities.convertToRelativePosition(edge, position);
        weights[index] = relativeAnchorPosition.weight;
        distances[index] = relativeAnchorPosition.distance;

        edge.data(anchorPointUtilities.syntax[type]['weight'], weights);
        edge.data(anchorPointUtilities.syntax[type]['distance'], distances);
      }

      // debounced due to large amout of calls to tapdrag
      var _moveAnchorOnDrag = debounce(moveAnchorOnDrag, 5);

      {
        lastPanningEnabled = cy.panningEnabled();
        lastZoomingEnabled = cy.zoomingEnabled();
        lastBoxSelectionEnabled = cy.boxSelectionEnabled();

        // Initilize the edgeToHighlightBends and numberOfSelectedEdges
        {
          var selectedEdges = cy.edges(':selected');
          var numberOfSelectedEdges = selectedEdges.length;

          if (numberOfSelectedEdges === 1) {
            edgeToHighlight = selectedEdges[0];
          }
        }

        cy.bind('zoom pan', eZoom = function eZoom() {
          if (!edgeToHighlight) {
            return;
          }

          refreshDraws();
        });

        // cy.off is never called on this listener
        cy.on('data', 'edge', function () {
          if (!edgeToHighlight) {
            return;
          }

          refreshDraws();
        });

        cy.on('style', 'edge.edgebendediting-hasbendpoints:selected, edge.edgecontrolediting-hascontrolpoints:selected', eStyle = function eStyle() {
          refreshDraws();
        });

        cy.on('remove', 'edge', eRemove = function eRemove() {
          var edge = this;
          if (edge.selected()) {
            numberOfSelectedEdges = numberOfSelectedEdges - 1;

            cy.startBatch();

            if (edgeToHighlight) {
              edgeToHighlight.removeClass('cy-edge-editing-highlight');
            }

            if (numberOfSelectedEdges === 1) {
              var selectedEdges = cy.edges(':selected');

              // If user removes all selected edges at a single operation then our 'numberOfSelectedEdges'
              // may be misleading. Therefore we need to check if the number of edges to highlight is realy 1 here.
              if (selectedEdges.length === 1) {
                edgeToHighlight = selectedEdges[0];
                edgeToHighlight.addClass('cy-edge-editing-highlight');
              } else {
                edgeToHighlight = undefined;
              }
            } else {
              edgeToHighlight = undefined;
            }

            cy.endBatch();
          }
          refreshDraws();
        });

        cy.on('add', 'edge', eAdd = function eAdd() {
          var edge = this;
          if (edge.selected()) {
            numberOfSelectedEdges = numberOfSelectedEdges + 1;

            cy.startBatch();

            if (edgeToHighlight) {
              edgeToHighlight.removeClass('cy-edge-editing-highlight');
            }

            if (numberOfSelectedEdges === 1) {
              edgeToHighlight = edge;
              edgeToHighlight.addClass('cy-edge-editing-highlight');
            } else {
              edgeToHighlight = undefined;
            }

            cy.endBatch();
          }
          refreshDraws();
        });

        cy.on('select', 'edge', eSelect = function eSelect() {
          var edge = this;

          if (edge.target().connectedEdges().length == 0 || edge.source().connectedEdges().length == 0) {
            return;
          }

          numberOfSelectedEdges = numberOfSelectedEdges + 1;

          cy.startBatch();

          if (edgeToHighlight) {
            edgeToHighlight.removeClass('cy-edge-editing-highlight');
          }

          if (numberOfSelectedEdges === 1) {
            edgeToHighlight = edge;
            edgeToHighlight.addClass('cy-edge-editing-highlight');
          } else {
            edgeToHighlight = undefined;
          }

          cy.endBatch();
          refreshDraws();
        });

        cy.on('unselect', 'edge', eUnselect = function eUnselect() {
          numberOfSelectedEdges = numberOfSelectedEdges - 1;

          cy.startBatch();

          if (edgeToHighlight) {
            edgeToHighlight.removeClass('cy-edge-editing-highlight');
          }

          if (numberOfSelectedEdges === 1) {
            var selectedEdges = cy.edges(':selected');

            // If user unselects all edges by tapping to the core etc. then our 'numberOfSelectedEdges'
            // may be misleading. Therefore we need to check if the number of edges to highlight is realy 1 here.
            if (selectedEdges.length === 1) {
              edgeToHighlight = selectedEdges[0];
              edgeToHighlight.addClass('cy-edge-editing-highlight');
            } else {
              edgeToHighlight = undefined;
            }
          } else {
            edgeToHighlight = undefined;
          }

          cy.endBatch();
          refreshDraws();
        });

        var movedAnchorIndex;
        var tapStartPos;
        var movedEdge;
        var moveAnchorParam;
        var createAnchorOnDrag;
        var movedEndPoint;
        var dummyNode;
        var detachedNode;
        var nodeToAttach;
        var anchorCreatedByDrag = false;

        cy.on('tapstart', eTapStart = function eTapStart(event) {
          tapStartPos = event.position || event.cyPosition;
        });

        cy.on('tapstart', 'edge', eTapStartOnEdge = function eTapStartOnEdge(event) {
          var edge = this;

          if (!edgeToHighlight || edgeToHighlight.id() !== edge.id()) {
            createAnchorOnDrag = false;
            return;
          }

          movedEdge = edge;

          var type = anchorPointUtilities.getEdgeType(edge);

          // to avoid errors
          if (type === 'inconclusive') type = 'bend';

          var cyPosX = tapStartPos.x;
          var cyPosY = tapStartPos.y;

          // Get which end point has been clicked (Source:0, Target:1, None:-1)
          var endPoint = getContainingEndPoint(cyPosX, cyPosY, edge);

          if (endPoint == 0 || endPoint == 1) {
            edge.unselect();
            movedEndPoint = endPoint;
            detachedNode = endPoint == 0 ? movedEdge.source() : movedEdge.target();

            var disconnectedEnd = endPoint == 0 ? 'source' : 'target';
            var result = reconnectionUtilities.disconnectEdge(movedEdge, cy, event.renderedPosition, disconnectedEnd);

            dummyNode = result.dummyNode;
            movedEdge = result.edge;

            disableGestures();
          } else {
            movedAnchorIndex = undefined;
            createAnchorOnDrag = true;
          }
        });

        cy.on('drag', 'node', eDrag = function eDrag(event) {
          var node = this;
          cy.edges().unselect();
          if (!node.selected()) {
            cy.nodes().unselect();
          }
        });
        cy.on('tapdrag', eTapDrag = function eTapDrag(event) {
          /** 
           * if there is a selected edge set autounselectify false
           * fixes the node-editing problem where nodes would get
           * unselected after resize drag
          */
          if (cy.edges(':selected').length > 0) {
            cy.autounselectify(false);
          }
          var edge = movedEdge;

          if (movedEdge !== undefined && anchorPointUtilities.isIgnoredEdge(edge)) {
            return;
          }

          var type = anchorPointUtilities.getEdgeType(edge);

          if (createAnchorOnDrag && !anchorTouched && type !== 'inconclusive') {
            // remember state before creating anchor
            var weightStr = anchorPointUtilities.syntax[type]['weight'];
            var distanceStr = anchorPointUtilities.syntax[type]['distance'];

            moveAnchorParam = {
              edge: edge,
              type: type,
              weights: edge.data(weightStr) ? [].concat(edge.data(weightStr)) : [],
              distances: edge.data(distanceStr) ? [].concat(edge.data(distanceStr)) : []
            };

            edge.unselect();

            // using tapstart position fixes bug on quick drags
            // --- 
            // also modified addAnchorPoint to return the index because
            // getContainingShapeIndex failed to find the created anchor on quick drags
            movedAnchorIndex = anchorPointUtilities.addAnchorPoint(edge, tapStartPos);
            movedEdge = edge;
            createAnchorOnDrag = undefined;
            anchorCreatedByDrag = true;
            disableGestures();
          }

          // if the tapstart did not hit an edge and it did not hit an anchor
          if (!anchorTouched && (movedEdge === undefined || movedAnchorIndex === undefined && movedEndPoint === undefined)) {
            return;
          }

          var eventPos = event.position || event.cyPosition;

          // Update end point location (Source:0, Target:1)
          if (movedEndPoint != -1 && dummyNode) {
            dummyNode.position(eventPos);
          }
          // change location of anchor created by drag
          else if (movedAnchorIndex != undefined) {
              _moveAnchorOnDrag(edge, type, movedAnchorIndex, eventPos);
            }
            // change location of drag and dropped anchor
            else if (anchorTouched) {

                // the tapStartPos check is necessary when righ clicking anchor points
                // right clicking anchor points triggers MouseDown for Konva, but not tapstart for cy
                // when that happens tapStartPos is undefined
                if (anchorManager.touchedAnchorIndex === undefined && tapStartPos) {
                  anchorManager.touchedAnchorIndex = getContainingShapeIndex(tapStartPos.x, tapStartPos.y, anchorManager.edge);
                }

                if (anchorManager.touchedAnchorIndex !== undefined) {
                  _moveAnchorOnDrag(anchorManager.edge, anchorManager.edgeType, anchorManager.touchedAnchorIndex, eventPos);
                }
              }

          if (event.target && event.target[0] && event.target.isNode()) {
            nodeToAttach = event.target;
          }
        });

        cy.on('tapend', eTapEnd = function eTapEnd(event) {

          if (mouseOut) {
            canvas.getStage().fire("contentMouseup");
          }

          var edge = movedEdge || anchorManager.edge;

          if (edge !== undefined) {
            var index = anchorManager.touchedAnchorIndex;
            if (index != undefined) {
              var startX = edge.source().position('x');
              var startY = edge.source().position('y');
              var endX = edge.target().position('x');
              var endY = edge.target().position('y');

              var anchorList = anchorPointUtilities.getAnchorsAsArray(edge);
              var allAnchors = [startX, startY].concat(anchorList).concat([endX, endY]);

              var anchorIndex = index + 1;
              var preIndex = anchorIndex - 1;
              var posIndex = anchorIndex + 1;

              var anchor = {
                x: allAnchors[2 * anchorIndex],
                y: allAnchors[2 * anchorIndex + 1]
              };

              var preAnchorPoint = {
                x: allAnchors[2 * preIndex],
                y: allAnchors[2 * preIndex + 1]
              };

              var posAnchorPoint = {
                x: allAnchors[2 * posIndex],
                y: allAnchors[2 * posIndex + 1]
              };

              var nearToLine;

              if (anchor.x === preAnchorPoint.x && anchor.y === preAnchorPoint.y || anchor.x === preAnchorPoint.x && anchor.y === preAnchorPoint.y) {
                nearToLine = true;
              } else {
                var m1 = (preAnchorPoint.y - posAnchorPoint.y) / (preAnchorPoint.x - posAnchorPoint.x);
                var m2 = -1 / m1;

                var srcTgtPointsAndTangents = {
                  srcPoint: preAnchorPoint,
                  tgtPoint: posAnchorPoint,
                  m1: m1,
                  m2: m2
                };

                var currentIntersection = anchorPointUtilities.getIntersection(edge, anchor, srcTgtPointsAndTangents);
                var dist = Math.sqrt(Math.pow(anchor.x - currentIntersection.x, 2) + Math.pow(anchor.y - currentIntersection.y, 2));

                // remove the bend point if segment edge becomes straight
                var type = anchorPointUtilities.getEdgeType(edge);
                if (type === 'bend' && dist < options().bendRemovalSensitivity) {
                  nearToLine = true;
                }
              }

              if (nearToLine) {
                anchorPointUtilities.removeAnchor(edge, index);
              }
            } else if (dummyNode != undefined && (movedEndPoint == 0 || movedEndPoint == 1)) {

              var newNode = detachedNode;
              var isValid = 'valid';
              var location = movedEndPoint == 0 ? 'source' : 'target';

              // validate edge reconnection
              if (nodeToAttach) {
                var newSource = movedEndPoint == 0 ? nodeToAttach : edge.source();
                var newTarget = movedEndPoint == 1 ? nodeToAttach : edge.target();
                if (typeof validateEdge === "function") isValid = validateEdge(edge, newSource, newTarget);
                newNode = isValid === 'valid' ? nodeToAttach : detachedNode;
              }

              var newSource = movedEndPoint == 0 ? newNode : edge.source();
              var newTarget = movedEndPoint == 1 ? newNode : edge.target();
              edge = reconnectionUtilities.connectEdge(edge, detachedNode, location);

              if (detachedNode.id() !== newNode.id()) {
                // use given handleReconnectEdge function 
                if (typeof handleReconnectEdge === 'function') {
                  var reconnectedEdge = handleReconnectEdge(newSource.id(), newTarget.id(), edge.data());

                  if (reconnectedEdge) {
                    reconnectionUtilities.copyEdge(edge, reconnectedEdge);
                    anchorPointUtilities.initAnchorPoints(options().bendPositionsFunction, options().controlPositionsFunction, [reconnectedEdge]);
                  }

                  if (reconnectedEdge && options().undoable) {
                    var params = {
                      newEdge: reconnectedEdge,
                      oldEdge: edge
                    };
                    cy.undoRedo().do('removeReconnectedEdge', params);
                    edge = reconnectedEdge;
                  } else if (reconnectedEdge) {
                    cy.remove(edge);
                    edge = reconnectedEdge;
                  }
                } else {
                  var loc = movedEndPoint == 0 ? { source: newNode.id() } : { target: newNode.id() };
                  var oldLoc = movedEndPoint == 0 ? { source: detachedNode.id() } : { target: detachedNode.id() };

                  if (options().undoable && newNode.id() !== detachedNode.id()) {
                    var param = {
                      edge: edge,
                      location: loc,
                      oldLoc: oldLoc
                    };
                    var result = cy.undoRedo().do('reconnectEdge', param);
                    edge = result.edge;
                    //edge.select();
                  }
                }
              }

              // invalid edge reconnection callback
              if (isValid !== 'valid' && typeof actOnUnsuccessfulReconnection === 'function') {
                actOnUnsuccessfulReconnection();
              }
              edge.select();
              cy.remove(dummyNode);
            }
          }
          var type = anchorPointUtilities.getEdgeType(edge);

          // to avoid errors
          if (type === 'inconclusive') {
            type = 'bend';
          }

          if (anchorManager.touchedAnchorIndex === undefined && !anchorCreatedByDrag) {
            moveAnchorParam = undefined;
          }

          var weightStr = anchorPointUtilities.syntax[type]['weight'];
          if (edge !== undefined && moveAnchorParam !== undefined && (edge.data(weightStr) ? edge.data(weightStr).toString() : null) != moveAnchorParam.weights.toString()) {

            // anchor created from drag
            if (anchorCreatedByDrag) {
              edge.select();

              // stops the unbundled bezier edges from being unselected
              cy.autounselectify(true);
            }

            if (options().undoable) {
              cy.undoRedo().do('changeAnchorPoints', moveAnchorParam);
            }
          }

          movedAnchorIndex = undefined;
          movedEdge = undefined;
          moveAnchorParam = undefined;
          createAnchorOnDrag = undefined;
          movedEndPoint = undefined;
          dummyNode = undefined;
          detachedNode = undefined;
          nodeToAttach = undefined;
          tapStartPos = undefined;
          anchorCreatedByDrag = false;

          anchorManager.touchedAnchorIndex = undefined;

          resetGestures();
          setTimeout(function () {
            refreshDraws();
          }, 50);
        });

        //Variables used for starting and ending the movement of anchor points with arrows
        var moveanchorparam;
        var firstAnchor;
        var edgeContainingFirstAnchor;
        var firstAnchorPointFound;
        cy.on("edgeediting.movestart", function (e, edges) {
          firstAnchorPointFound = false;
          if (edges[0] != undefined) {
            edges.forEach(function (edge) {
              if (anchorPointUtilities.getAnchorsAsArray(edge) != undefined && !firstAnchorPointFound) {
                firstAnchor = { x: anchorPointUtilities.getAnchorsAsArray(edge)[0], y: anchorPointUtilities.getAnchorsAsArray(edge)[1] };
                moveanchorparam = {
                  firstTime: true,
                  firstAnchorPosition: {
                    x: firstAnchor.x,
                    y: firstAnchor.y
                  },
                  edges: edges
                };
                edgeContainingFirstAnchor = edge;
                firstAnchorPointFound = true;
              }
            });
          }
        });

        cy.on("edgeediting.moveend", function (e, edges) {
          if (moveanchorparam != undefined) {
            var initialPos = moveanchorparam.firstAnchorPosition;
            var movedFirstAnchor = {
              x: anchorPointUtilities.getAnchorsAsArray(edgeContainingFirstAnchor)[0],
              y: anchorPointUtilities.getAnchorsAsArray(edgeContainingFirstAnchor)[1]
            };

            moveanchorparam.positionDiff = {
              x: -movedFirstAnchor.x + initialPos.x,
              y: -movedFirstAnchor.y + initialPos.y
            };

            delete moveanchorparam.firstAnchorPosition;

            if (options().undoable) {
              cy.undoRedo().do("moveAnchorPoints", moveanchorparam);
            }

            moveanchorparam = undefined;
          }
        });

        cy.on('cxttap', eCxtTap = function eCxtTap(event) {
          var target = event.target || event.cyTarget;
          var targetIsEdge = false;

          try {
            targetIsEdge = target.isEdge();
          } catch (err) {
            // this is here just to suppress the error
          }

          var edge, type;
          if (targetIsEdge) {
            edge = target;
            type = anchorPointUtilities.getEdgeType(edge);
          } else {
            edge = anchorManager.edge;
            type = anchorManager.edgeType;
          }

          var menus = cy.contextMenus('get'); // get context menus instance

          if (!edgeToHighlight || edgeToHighlight.id() != edge.id() || anchorPointUtilities.isIgnoredEdge(edge) || edgeToHighlight !== edge) {
            menus.hideMenuItem(removeBendPointCxtMenuId);
            menus.hideMenuItem(addBendPointCxtMenuId);
            menus.hideMenuItem(removeControlPointCxtMenuId);
            menus.hideMenuItem(addControlPointCxtMenuId);
            return;
          }

          var cyPos = event.position || event.cyPosition;
          var selectedIndex = getContainingShapeIndex(cyPos.x, cyPos.y, edge);
          // not clicked on an anchor
          if (selectedIndex == -1) {
            menus.hideMenuItem(removeBendPointCxtMenuId);
            menus.hideMenuItem(removeControlPointCxtMenuId);
            if (type === 'control' && targetIsEdge) {
              menus.showMenuItem(addControlPointCxtMenuId);
              menus.hideMenuItem(addBendPointCxtMenuId);
            } else if (type === 'bend' && targetIsEdge) {
              menus.showMenuItem(addBendPointCxtMenuId);
              menus.hideMenuItem(addControlPointCxtMenuId);
            } else if (targetIsEdge) {
              menus.showMenuItem(addBendPointCxtMenuId);
              menus.showMenuItem(addControlPointCxtMenuId);
            } else {
              menus.hideMenuItem(addBendPointCxtMenuId);
              menus.hideMenuItem(addControlPointCxtMenuId);
            }
            anchorPointUtilities.currentCtxPos = cyPos;
          }
          // clicked on an anchor
          else {
              menus.hideMenuItem(addBendPointCxtMenuId);
              menus.hideMenuItem(addControlPointCxtMenuId);
              if (type === 'control') {
                menus.showMenuItem(removeControlPointCxtMenuId);
                menus.hideMenuItem(removeBendPointCxtMenuId);
                if (opts.enableMultipleAnchorRemovalOption && edge.hasClass('edgecontrolediting-hasmultiplecontrolpoints')) {
                  menus.showMenuItem(removeAllControlPointCtxMenuId);
                }
              } else if (type === 'bend') {
                menus.showMenuItem(removeBendPointCxtMenuId);
                menus.hideMenuItem(removeControlPointCxtMenuId);
              } else {
                menus.hideMenuItem(removeBendPointCxtMenuId);
                menus.hideMenuItem(removeControlPointCxtMenuId);
                menus.hideMenuItem(removeAllControlPointCtxMenuId);
              }
              anchorPointUtilities.currentAnchorIndex = selectedIndex;
            }

          anchorPointUtilities.currentCtxEdge = edge;
        });

        cy.on('cyedgeediting.changeAnchorPoints', 'edge', function () {
          var edge = this;
          cy.startBatch();
          cy.edges().unselect();

          // Listener defined in other extension
          // Might have compatibility issues after the unbundled bezier    
          cy.trigger('bendPointMovement');

          cy.endBatch();
          refreshDraws();
        });
      }

      var selectedEdges;
      var anchorsMoving = false;

      // track arrow key presses, default false
      // event.keyCode normally returns number
      // but JS will convert to string anyway
      var keys = {
        '37': false,
        '38': false,
        '39': false,
        '40': false
      };

      function keyDown(e) {

        var shouldMove = typeof options().moveSelectedAnchorsOnKeyEvents === 'function' ? options().moveSelectedAnchorsOnKeyEvents() : options().moveSelectedAnchorsOnKeyEvents;

        if (!shouldMove) {
          return;
        }

        //Checks if the tagname is textarea or input
        var tn = document.activeElement.tagName;
        if (tn != "TEXTAREA" && tn != "INPUT") {
          switch (e.keyCode) {
            case 37:case 39:case 38:case 40: // Arrow keys
            case 32:
              e.preventDefault();break; // Space
            default:
              break; // do not block other keys
          }
          if (e.keyCode < '37' || e.keyCode > '40') {
            return;
          }
          keys[e.keyCode] = true;

          //Checks if only edges are selected (not any node) and if only 1 edge is selected
          //If the second checking is removed the anchors of multiple edges would move
          if (cy.edges(":selected").length != cy.elements(":selected").length || cy.edges(":selected").length != 1) {
            return;
          }
          if (!anchorsMoving) {
            selectedEdges = cy.edges(':selected');
            cy.trigger("edgeediting.movestart", [selectedEdges]);
            anchorsMoving = true;
          }
          var moveSpeed = 3;

          // doesn't make sense if alt and shift both pressed
          if (e.altKey && e.shiftKey) {
            return;
          } else if (e.altKey) {
            moveSpeed = 1;
          } else if (e.shiftKey) {
            moveSpeed = 10;
          }

          var upArrowCode = 38;
          var downArrowCode = 40;
          var leftArrowCode = 37;
          var rightArrowCode = 39;

          var dx = 0;
          var dy = 0;

          dx += keys[rightArrowCode] ? moveSpeed : 0;
          dx -= keys[leftArrowCode] ? moveSpeed : 0;
          dy += keys[downArrowCode] ? moveSpeed : 0;
          dy -= keys[upArrowCode] ? moveSpeed : 0;

          moveAnchorPoints({ x: dx, y: dy }, selectedEdges);
        }
      }
      function keyUp(e) {

        if (e.keyCode < '37' || e.keyCode > '40') {
          return;
        }
        e.preventDefault();
        keys[e.keyCode] = false;
        var shouldMove = typeof options().moveSelectedAnchorsOnKeyEvents === 'function' ? options().moveSelectedAnchorsOnKeyEvents() : options().moveSelectedAnchorsOnKeyEvents;

        if (!shouldMove) {
          return;
        }

        cy.trigger("edgeediting.moveend", [selectedEdges]);
        selectedEdges = undefined;
        anchorsMoving = false;
      }
      document.addEventListener("keydown", keyDown, true);
      document.addEventListener("keyup", keyUp, true);

      $container.data('cyedgeediting', data);
    },
    unbind: function unbind() {
      cy.off('remove', 'node', eRemove).off('add', 'node', eAdd).off('style', 'edge.edgebendediting-hasbendpoints:selected, edge.edgecontrolediting-hascontrolpoints:selected', eStyle).off('select', 'edge', eSelect).off('unselect', 'edge', eUnselect).off('tapstart', eTapStart).off('tapstart', 'edge', eTapStartOnEdge).off('tapdrag', eTapDrag).off('tapend', eTapEnd).off('cxttap', eCxtTap).off('drag', 'node', eDrag);

      cy.unbind("zoom pan", eZoom);
    }
  };

  if (functions[fn]) {
    return functions[fn].apply($(cy.container()), Array.prototype.slice.call(arguments, 1));
  } else if ((typeof fn === 'undefined' ? 'undefined' : _typeof(fn)) == 'object' || !fn) {
    return functions.init.apply($(cy.container()), arguments);
  } else {
    $.error('No such function `' + fn + '` for cytoscape.js-edge-editing');
  }

  return $(this);
};

/***/ }),
/* 4 */
/***/ (function(module, exports, __webpack_require__) {

"use strict";


var reconnectionUtilities = {

    // creates and returns a dummy node which is connected to the disconnected edge
    disconnectEdge: function disconnectEdge(edge, cy, position, disconnectedEnd) {

        var dummyNode = {
            data: {
                id: 'nwt_reconnectEdge_dummy',
                ports: []
            },
            style: {
                width: 1,
                height: 1,
                'visibility': 'hidden'
            },
            renderedPosition: position
        };
        cy.add(dummyNode);

        var loc = disconnectedEnd === 'source' ? { source: dummyNode.data.id } : { target: dummyNode.data.id };

        edge = edge.move(loc)[0];

        return {
            dummyNode: cy.nodes("#" + dummyNode.data.id)[0],
            edge: edge
        };
    },

    connectEdge: function connectEdge(edge, node, location) {
        if (!edge.isEdge() || !node.isNode()) return;

        var loc = {};
        if (location === 'source') loc.source = node.id();else if (location === 'target') loc.target = node.id();else return;

        return edge.move(loc)[0];
    },

    copyEdge: function copyEdge(oldEdge, newEdge) {
        this.copyAnchors(oldEdge, newEdge);
        this.copyStyle(oldEdge, newEdge);
    },

    copyStyle: function copyStyle(oldEdge, newEdge) {
        if (oldEdge && newEdge) {
            newEdge.data('line-color', oldEdge.data('line-color'));
            newEdge.data('width', oldEdge.data('width'));
            newEdge.data('cardinality', oldEdge.data('cardinality'));
        }
    },

    copyAnchors: function copyAnchors(oldEdge, newEdge) {
        if (oldEdge.hasClass('edgebendediting-hasbendpoints')) {
            var bpDistances = oldEdge.data('cyedgebendeditingDistances');
            var bpWeights = oldEdge.data('cyedgebendeditingWeights');

            newEdge.data('cyedgebendeditingDistances', bpDistances);
            newEdge.data('cyedgebendeditingWeights', bpWeights);
            newEdge.addClass('edgebendediting-hasbendpoints');
        } else if (oldEdge.hasClass('edgecontrolediting-hascontrolpoints')) {
            var bpDistances = oldEdge.data('cyedgecontroleditingDistances');
            var bpWeights = oldEdge.data('cyedgecontroleditingWeights');

            newEdge.data('cyedgecontroleditingDistances', bpDistances);
            newEdge.data('cyedgecontroleditingWeights', bpWeights);
            newEdge.addClass('edgecontrolediting-hascontrolpoints');
        }
        if (oldEdge.hasClass('edgebendediting-hasmultiplebendpoints')) {
            newEdge.addClass('edgebendediting-hasmultiplebendpoints');
        } else if (oldEdge.hasClass('edgecontrolediting-hasmultiplecontrolpoints')) {
            newEdge.addClass('edgecontrolediting-hasmultiplecontrolpoints');
        }
    }
};

module.exports = reconnectionUtilities;

/***/ }),
/* 5 */
/***/ (function(module, exports, __webpack_require__) {

"use strict";


module.exports = function (cy, anchorPointUtilities, params) {
  if (cy.undoRedo == null) return;

  var ur = cy.undoRedo({
    defaultActions: false,
    isDebug: true
  });

  function changeAnchorPoints(param) {
    var edge = cy.getElementById(param.edge.id());
    var type = param.type !== 'inconclusive' ? param.type : anchorPointUtilities.getEdgeType(edge);

    var weights, distances, weightStr, distanceStr;

    if (param.type === 'inconclusive' && !param.set) {
      weights = [];
      distances = [];
    } else {
      weightStr = anchorPointUtilities.syntax[type]['weight'];
      distanceStr = anchorPointUtilities.syntax[type]['distance'];

      weights = param.set ? edge.data(weightStr) : param.weights;
      distances = param.set ? edge.data(distanceStr) : param.distances;
    }

    var result = {
      edge: edge,
      type: type,
      weights: weights,
      distances: distances,
      //As the result will not be used for the first function call params should be used to set the data
      set: true
    };

    //Check if we need to set the weights and distances by the param values
    if (param.set) {
      var hadAnchorPoint = param.weights && param.weights.length > 0;
      var hadMultipleAnchorPoints = hadAnchorPoint && param.weights.length > 1;

      hadAnchorPoint ? edge.data(weightStr, param.weights) : edge.removeData(weightStr);
      hadAnchorPoint ? edge.data(distanceStr, param.distances) : edge.removeData(distanceStr);

      var singleClassName = anchorPointUtilities.syntax[type]['class'];
      var multiClassName = anchorPointUtilities.syntax[type]['multiClass'];

      // Refresh the curve style as the number of anchor point would be changed by the previous operation
      // Adding or removing multi classes at once can cause errors. If multiple classes are to be added,
      // just add them together in space delimeted class names format.
      if (!hadAnchorPoint && !hadMultipleAnchorPoints) {
        // Remove multiple classes from edge with space delimeted string of class names 
        edge.removeClass(singleClassName + " " + multiClassName);
      } else if (hadAnchorPoint && !hadMultipleAnchorPoints) {
        // Had single anchor
        edge.addClass(singleClassName);
        edge.removeClass(multiClassName);
      } else {
        // Had multiple anchors. Add multiple classes with space delimeted string of class names
        edge.addClass(singleClassName + " " + multiClassName);
      }
    }

    edge.trigger('cyedgeediting.changeAnchorPoints');

    return result;
  }

  function moveDo(arg) {
    if (arg.firstTime) {
      delete arg.firstTime;
      return arg;
    }

    var edges = arg.edges;
    var positionDiff = arg.positionDiff;
    var result = {
      edges: edges,
      positionDiff: {
        x: -positionDiff.x,
        y: -positionDiff.y
      }
    };
    moveAnchorsUndoable(positionDiff, edges);

    return result;
  }

  function moveAnchorsUndoable(positionDiff, edges) {
    edges.forEach(function (edge) {
      var type = anchorPointUtilities.getEdgeType(edge);
      var previousAnchorsPosition = anchorPointUtilities.getAnchorsAsArray(edge);
      var nextAnchorsPosition = [];
      if (previousAnchorsPosition != undefined) {
        for (var i = 0; i < previousAnchorsPosition.length; i += 2) {
          nextAnchorsPosition.push({ x: previousAnchorsPosition[i] + positionDiff.x, y: previousAnchorsPosition[i + 1] + positionDiff.y });
        }
        edge.data(anchorPointUtilities.syntax[type]['pointPos'], nextAnchorsPosition);
      }
    });

    anchorPointUtilities.initAnchorPoints(params.bendPositionsFunction, params.controlPositionsFunction, edges);
  }

  function reconnectEdge(param) {
    var edge = param.edge;
    var location = param.location;
    var oldLoc = param.oldLoc;

    edge = edge.move(location)[0];

    var result = {
      edge: edge,
      location: oldLoc,
      oldLoc: location
    };
    edge.unselect();
    return result;
  }

  function removeReconnectedEdge(param) {
    var oldEdge = param.oldEdge;
    var tmp = cy.getElementById(oldEdge.data('id'));
    if (tmp && tmp.length > 0) oldEdge = tmp;

    var newEdge = param.newEdge;
    var tmp = cy.getElementById(newEdge.data('id'));
    if (tmp && tmp.length > 0) newEdge = tmp;

    if (oldEdge.inside()) {
      oldEdge = oldEdge.remove()[0];
    }

    if (newEdge.removed()) {
      newEdge = newEdge.restore();
      newEdge.unselect();
    }

    return {
      oldEdge: newEdge,
      newEdge: oldEdge
    };
  }

  ur.action('changeAnchorPoints', changeAnchorPoints, changeAnchorPoints);
  ur.action('moveAnchorPoints', moveDo, moveDo);
  ur.action('reconnectEdge', reconnectEdge, reconnectEdge);
  ur.action('removeReconnectedEdge', removeReconnectedEdge, removeReconnectedEdge);
};

/***/ })
/******/ ]);
});
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIndlYnBhY2s6Ly9jeXRvc2NhcGVFZGdlRWRpdGluZy93ZWJwYWNrL3VuaXZlcnNhbE1vZHVsZURlZmluaXRpb24iLCJ3ZWJwYWNrOi8vY3l0b3NjYXBlRWRnZUVkaXRpbmcvd2VicGFjay9ib290c3RyYXAiLCJ3ZWJwYWNrOi8vY3l0b3NjYXBlRWRnZUVkaXRpbmcvLi9zcmMvQW5jaG9yUG9pbnRVdGlsaXRpZXMuanMiLCJ3ZWJwYWNrOi8vY3l0b3NjYXBlRWRnZUVkaXRpbmcvLi9zcmMvZGVib3VuY2UuanMiLCJ3ZWJwYWNrOi8vY3l0b3NjYXBlRWRnZUVkaXRpbmcvLi9zcmMvaW5kZXguanMiLCJ3ZWJwYWNrOi8vY3l0b3NjYXBlRWRnZUVkaXRpbmcvLi9zcmMvVUlVdGlsaXRpZXMuanMiLCJ3ZWJwYWNrOi8vY3l0b3NjYXBlRWRnZUVkaXRpbmcvLi9zcmMvcmVjb25uZWN0aW9uVXRpbGl0aWVzLmpzIiwid2VicGFjazovL2N5dG9zY2FwZUVkZ2VFZGl0aW5nLy4vc3JjL3JlZ2lzdGVyVW5kb1JlZG9GdW5jdGlvbnMuanMiXSwibmFtZXMiOlsiYW5jaG9yUG9pbnRVdGlsaXRpZXMiLCJjdXJyZW50Q3R4RWRnZSIsInVuZGVmaW5lZCIsImN1cnJlbnRDdHhQb3MiLCJjdXJyZW50QW5jaG9ySW5kZXgiLCJpZ25vcmVkQ2xhc3NlcyIsInNldElnbm9yZWRDbGFzc2VzIiwiX2lnbm9yZWRDbGFzc2VzIiwic3ludGF4IiwiYmVuZCIsImVkZ2UiLCJjbGFzcyIsIm11bHRpQ2xhc3MiLCJ3ZWlnaHQiLCJkaXN0YW5jZSIsIndlaWdodENzcyIsImRpc3RhbmNlQ3NzIiwicG9pbnRQb3MiLCJjb250cm9sIiwiZ2V0RWRnZVR5cGUiLCJoYXNDbGFzcyIsImNzcyIsImRhdGEiLCJsZW5ndGgiLCJpbml0QW5jaG9yUG9pbnRzIiwiYmVuZFBvc2l0aW9uc0ZjbiIsImNvbnRyb2xQb3NpdGlvbnNGY24iLCJlZGdlcyIsImkiLCJ0eXBlIiwiaXNJZ25vcmVkRWRnZSIsImFuY2hvclBvc2l0aW9ucyIsImFwcGx5IiwicmVzdWx0IiwiY29udmVydFRvUmVsYXRpdmVQb3NpdGlvbnMiLCJkaXN0YW5jZXMiLCJ3ZWlnaHRzIiwiYWRkQ2xhc3MiLCJzdGFydFgiLCJzb3VyY2UiLCJwb3NpdGlvbiIsInN0YXJ0WSIsImVuZFgiLCJ0YXJnZXQiLCJlbmRZIiwiaWQiLCJnZXRMaW5lRGlyZWN0aW9uIiwic3JjUG9pbnQiLCJ0Z3RQb2ludCIsInkiLCJ4IiwiZ2V0U3JjVGd0UG9pbnRzQW5kVGFuZ2VudHMiLCJzb3VyY2VOb2RlIiwidGFyZ2V0Tm9kZSIsInRndFBvc2l0aW9uIiwic3JjUG9zaXRpb24iLCJtMSIsIm0yIiwiZ2V0SW50ZXJzZWN0aW9uIiwicG9pbnQiLCJzcmNUZ3RQb2ludHNBbmRUYW5nZW50cyIsImludGVyc2VjdFgiLCJpbnRlcnNlY3RZIiwiSW5maW5pdHkiLCJhMSIsImEyIiwiaW50ZXJzZWN0aW9uUG9pbnQiLCJnZXRBbmNob3JzQXNBcnJheSIsImFuY2hvckxpc3QiLCJwc3R5bGUiLCJwZlZhbHVlIiwibWluTGVuZ3RocyIsIk1hdGgiLCJtaW4iLCJzcmNQb3MiLCJ0Z3RQb3MiLCJkeSIsImR4IiwibCIsInNxcnQiLCJ2ZWN0b3IiLCJ2ZWN0b3JOb3JtIiwidmVjdG9yTm9ybUludmVyc2UiLCJzIiwidyIsImQiLCJ3MSIsIncyIiwicG9zUHRzIiwieDEiLCJ4MiIsInkxIiwieTIiLCJtaWRwdFB0cyIsImFkanVzdGVkTWlkcHQiLCJwdXNoIiwiY29udmVydFRvUmVsYXRpdmVQb3NpdGlvbiIsInBvdyIsImRpcmVjdGlvbjEiLCJkaXJlY3Rpb24yIiwiYW5jaG9yUG9pbnRzIiwiYW5jaG9yIiwicmVsYXRpdmVBbmNob3JQb3NpdGlvbiIsImdldERpc3RhbmNlc1N0cmluZyIsInN0ciIsImdldFdlaWdodHNTdHJpbmciLCJhZGRBbmNob3JQb2ludCIsIm5ld0FuY2hvclBvaW50Iiwid2VpZ2h0U3RyIiwiZGlzdGFuY2VTdHIiLCJyZWxhdGl2ZVBvc2l0aW9uIiwib3JpZ2luYWxBbmNob3JXZWlnaHQiLCJzdGFydFdlaWdodCIsImVuZFdlaWdodCIsIndlaWdodHNXaXRoVGd0U3JjIiwiY29uY2F0IiwiYW5jaG9yc0xpc3QiLCJtaW5EaXN0IiwiaW50ZXJzZWN0aW9uIiwicHRzV2l0aFRndFNyYyIsIm5ld0FuY2hvckluZGV4IiwiYjEiLCJjb21wYXJlV2l0aFByZWNpc2lvbiIsImIyIiwiYjMiLCJiNCIsInN0YXJ0IiwiZW5kIiwiY3VycmVudEludGVyc2VjdGlvbiIsImRpc3QiLCJzcGxpY2UiLCJyZW1vdmVBbmNob3IiLCJhbmNob3JJbmRleCIsImVkZ2VUeXBlSW5jb25jbHVzaXZlU2hvdWxkbnRIYXBwZW4iLCJwb3NpdGlvbkRhdGFTdHIiLCJwb3NpdGlvbnMiLCJyZW1vdmVDbGFzcyIsInJlbW92ZUFsbEFuY2hvcnMiLCJjYWxjdWxhdGVEaXN0YW5jZSIsInB0MSIsInB0MiIsImRpZmZYIiwiZGlmZlkiLCJuMSIsIm4yIiwiaXNMZXNzVGhlbk9yRXF1YWwiLCJwcmVjaXNpb24iLCJkaWZmIiwiYWJzIiwicGxhY2UiLCJjb25zb2xlIiwibG9nIiwibW9kdWxlIiwiZXhwb3J0cyIsImRlYm91bmNlIiwiRlVOQ19FUlJPUl9URVhUIiwibmF0aXZlTWF4IiwibWF4IiwibmF0aXZlTm93IiwiRGF0ZSIsIm5vdyIsImdldFRpbWUiLCJmdW5jIiwid2FpdCIsIm9wdGlvbnMiLCJhcmdzIiwibWF4VGltZW91dElkIiwic3RhbXAiLCJ0aGlzQXJnIiwidGltZW91dElkIiwidHJhaWxpbmdDYWxsIiwibGFzdENhbGxlZCIsIm1heFdhaXQiLCJ0cmFpbGluZyIsIlR5cGVFcnJvciIsImxlYWRpbmciLCJpc09iamVjdCIsImNhbmNlbCIsImNsZWFyVGltZW91dCIsImNvbXBsZXRlIiwiaXNDYWxsZWQiLCJkZWxheWVkIiwicmVtYWluaW5nIiwic2V0VGltZW91dCIsIm1heERlbGF5ZWQiLCJkZWJvdW5jZWQiLCJhcmd1bWVudHMiLCJsZWFkaW5nQ2FsbCIsInZhbHVlIiwicmVxdWlyZSIsInJlZ2lzdGVyIiwiY3l0b3NjYXBlIiwiJCIsIktvbnZhIiwidWlVdGlsaXRpZXMiLCJkZWZhdWx0cyIsImJlbmRQb3NpdGlvbnNGdW5jdGlvbiIsImVsZSIsImNvbnRyb2xQb3NpdGlvbnNGdW5jdGlvbiIsImluaXRBbmNob3JzQXV0b21hdGljYWxseSIsInVuZG9hYmxlIiwiYW5jaG9yU2hhcGVTaXplRmFjdG9yIiwiekluZGV4IiwiZW5hYmxlZCIsImJlbmRSZW1vdmFsU2Vuc2l0aXZpdHkiLCJhZGRCZW5kTWVudUl0ZW1UaXRsZSIsInJlbW92ZUJlbmRNZW51SXRlbVRpdGxlIiwicmVtb3ZlQWxsQmVuZE1lbnVJdGVtVGl0bGUiLCJhZGRDb250cm9sTWVudUl0ZW1UaXRsZSIsInJlbW92ZUNvbnRyb2xNZW51SXRlbVRpdGxlIiwicmVtb3ZlQWxsQ29udHJvbE1lbnVJdGVtVGl0bGUiLCJtb3ZlU2VsZWN0ZWRBbmNob3JzT25LZXlFdmVudHMiLCJlbmFibGVNdWx0aXBsZUFuY2hvclJlbW92YWxPcHRpb24iLCJpbml0aWFsaXplZCIsImV4dGVuZCIsIm9iaiIsImlzTmFOIiwib3B0cyIsImN5Iiwic3R5bGUiLCJzZWxlY3RvciIsImluc3RhbmNlIiwiZWxlcyIsImRlbGV0ZVNlbGVjdGVkQW5jaG9yIiwiaW5kZXgiLCJkZWZpbmUiLCJyZWNvbm5lY3Rpb25VdGlsaXRpZXMiLCJyZWdpc3RlclVuZG9SZWRvRnVuY3Rpb25zIiwic3RhZ2VJZCIsInBhcmFtcyIsImZuIiwiYWRkQmVuZFBvaW50Q3h0TWVudUlkIiwicmVtb3ZlQmVuZFBvaW50Q3h0TWVudUlkIiwicmVtb3ZlQWxsQmVuZFBvaW50Q3R4TWVudUlkIiwiYWRkQ29udHJvbFBvaW50Q3h0TWVudUlkIiwicmVtb3ZlQ29udHJvbFBvaW50Q3h0TWVudUlkIiwicmVtb3ZlQWxsQ29udHJvbFBvaW50Q3R4TWVudUlkIiwiZVN0eWxlIiwiZVJlbW92ZSIsImVBZGQiLCJlWm9vbSIsImVTZWxlY3QiLCJlVW5zZWxlY3QiLCJlVGFwU3RhcnQiLCJlVGFwU3RhcnRPbkVkZ2UiLCJlVGFwRHJhZyIsImVUYXBFbmQiLCJlQ3h0VGFwIiwiZURyYWciLCJsYXN0UGFubmluZ0VuYWJsZWQiLCJsYXN0Wm9vbWluZ0VuYWJsZWQiLCJsYXN0Qm94U2VsZWN0aW9uRW5hYmxlZCIsImxhc3RBY3RpdmVCZ09wYWNpdHkiLCJlZGdlVG9IaWdobGlnaHQiLCJudW1iZXJPZlNlbGVjdGVkRWRnZXMiLCJlbmRwb2ludFNoYXBlMSIsImVuZHBvaW50U2hhcGUyIiwiYW5jaG9yVG91Y2hlZCIsIm1vdXNlT3V0IiwiZnVuY3Rpb25zIiwiaW5pdCIsInNlbGYiLCIkY29udGFpbmVyIiwiY2FudmFzRWxlbWVudElkIiwiJGNhbnZhc0VsZW1lbnQiLCJmaW5kIiwiYXBwZW5kIiwic3RhZ2UiLCJzdGFnZXMiLCJTdGFnZSIsImNvbnRhaW5lciIsIndpZHRoIiwiaGVpZ2h0IiwiY2FudmFzIiwiZ2V0Q2hpbGRyZW4iLCJMYXllciIsImFkZCIsImFuY2hvck1hbmFnZXIiLCJlZGdlVHlwZSIsImFuY2hvcnMiLCJ0b3VjaGVkQW5jaG9yIiwidG91Y2hlZEFuY2hvckluZGV4IiwiYmluZExpc3RlbmVycyIsIm9uIiwiZU1vdXNlRG93biIsInVuYmluZExpc3RlbmVycyIsIm9mZiIsImV2ZW50IiwiYXV0b3Vuc2VsZWN0aWZ5IiwidW5zZWxlY3QiLCJtb3ZlQW5jaG9yUGFyYW0iLCJ0dXJuT2ZmQWN0aXZlQmdDb2xvciIsImRpc2FibGVHZXN0dXJlcyIsImF1dG91bmdyYWJpZnkiLCJnZXRTdGFnZSIsImVNb3VzZVVwIiwiZU1vdXNlT3V0Iiwic2VsZWN0IiwicmVzZXRBY3RpdmVCZ0NvbG9yIiwicmVzZXRHZXN0dXJlcyIsImNsZWFyQW5jaG9yc0V4Y2VwdCIsImRvbnRDbGVhbiIsImV4Y2VwdGlvbkFwcGxpZXMiLCJmb3JFYWNoIiwiZGVzdHJveSIsInJlbmRlckFuY2hvclNoYXBlcyIsImdldEFuY2hvclNoYXBlc0xlbmd0aCIsImFuY2hvclgiLCJhbmNob3JZIiwicmVuZGVyQW5jaG9yU2hhcGUiLCJkcmF3IiwidG9wTGVmdFgiLCJ0b3BMZWZ0WSIsInJlbmRlcmVkVG9wTGVmdFBvcyIsImNvbnZlcnRUb1JlbmRlcmVkUG9zaXRpb24iLCJ6b29tIiwibmV3QW5jaG9yIiwiUmVjdCIsImZpbGwiLCJzdHJva2VXaWR0aCIsImRyYWdnYWJsZSIsImN4dEFkZEJlbmRGY24iLCJjeHRBZGRBbmNob3JGY24iLCJjeHRBZGRDb250cm9sRmNuIiwiYW5jaG9yVHlwZSIsImN5VGFyZ2V0IiwicGFyYW0iLCJ1bmRvUmVkbyIsImRvIiwicmVmcmVzaERyYXdzIiwiY3h0UmVtb3ZlQW5jaG9yRmNuIiwiY3h0UmVtb3ZlQWxsQW5jaG9yc0ZjbiIsImhhbmRsZVJlY29ubmVjdEVkZ2UiLCJ2YWxpZGF0ZUVkZ2UiLCJhY3RPblVuc3VjY2Vzc2Z1bFJlY29ubmVjdGlvbiIsIm1lbnVJdGVtcyIsImNvbnRlbnQiLCJvbkNsaWNrRnVuY3Rpb24iLCJjb3JlQXNXZWxsIiwiY29udGV4dE1lbnVzIiwibWVudXMiLCJpc0FjdGl2ZSIsImFwcGVuZE1lbnVJdGVtcyIsIl9zaXplQ2FudmFzIiwiYXR0ciIsImNhbnZhc0JiIiwib2Zmc2V0IiwiY29udGFpbmVyQmIiLCJ0b3AiLCJsZWZ0Iiwic2V0V2lkdGgiLCJzZXRIZWlnaHQiLCJzaXplQ2FudmFzIiwid2luZG93IiwiYmluZCIsIm9wdENhY2hlIiwibW9kZWxQb3NpdGlvbiIsInBhbiIsInJlbmRlckVuZFBvaW50U2hhcGVzIiwiZWRnZV9wdHMiLCJzb3VyY2VQb3MiLCJzb3VyY2VFbmRwb2ludCIsInRhcmdldFBvcyIsInRhcmdldEVuZHBvaW50IiwidW5zaGlmdCIsInNyYyIsIm5leHRUb1NvdXJjZSIsIm5leHRUb1RhcmdldCIsInJlbmRlckVhY2hFbmRQb2ludFNoYXBlIiwic1RvcExlZnRYIiwic1RvcExlZnRZIiwidFRvcExlZnRYIiwidFRvcExlZnRZIiwibmV4dFRvU291cmNlWCIsIm5leHRUb1NvdXJjZVkiLCJuZXh0VG9UYXJnZXRYIiwibmV4dFRvVGFyZ2V0WSIsInJlbmRlcmVkU291cmNlUG9zIiwicmVuZGVyZWRUYXJnZXRQb3MiLCJyZW5kZXJlZE5leHRUb1NvdXJjZSIsInJlbmRlcmVkTmV4dFRvVGFyZ2V0IiwiZGlzdGFuY2VGcm9tTm9kZSIsImRpc3RhbmNlU291cmNlIiwic291cmNlRW5kUG9pbnRYIiwic291cmNlRW5kUG9pbnRZIiwiZGlzdGFuY2VUYXJnZXQiLCJ0YXJnZXRFbmRQb2ludFgiLCJ0YXJnZXRFbmRQb2ludFkiLCJDaXJjbGUiLCJyYWRpdXMiLCJmYWN0b3IiLCJwYXJzZUZsb2F0IiwiY2hlY2tJZkluc2lkZVNoYXBlIiwiY2VudGVyWCIsImNlbnRlclkiLCJtaW5YIiwibWF4WCIsIm1pblkiLCJtYXhZIiwiaW5zaWRlIiwiZ2V0Q29udGFpbmluZ1NoYXBlSW5kZXgiLCJnZXRDb250YWluaW5nRW5kUG9pbnQiLCJhbGxQdHMiLCJfcHJpdmF0ZSIsInJzY3JhdGNoIiwiYWxscHRzIiwicGFubmluZ0VuYWJsZWQiLCJ6b29taW5nRW5hYmxlZCIsImJveFNlbGVjdGlvbkVuYWJsZWQiLCJjb3JlU3R5bGUiLCJ1cGRhdGUiLCJtb3ZlQW5jaG9yUG9pbnRzIiwicG9zaXRpb25EaWZmIiwicHJldmlvdXNBbmNob3JzUG9zaXRpb24iLCJuZXh0QW5jaG9yUG9pbnRzUG9zaXRpb24iLCJ0cmlnZ2VyIiwibW92ZUFuY2hvck9uRHJhZyIsIl9tb3ZlQW5jaG9yT25EcmFnIiwic2VsZWN0ZWRFZGdlcyIsInNlbGVjdGVkIiwic3RhcnRCYXRjaCIsImVuZEJhdGNoIiwiY29ubmVjdGVkRWRnZXMiLCJtb3ZlZEFuY2hvckluZGV4IiwidGFwU3RhcnRQb3MiLCJtb3ZlZEVkZ2UiLCJjcmVhdGVBbmNob3JPbkRyYWciLCJtb3ZlZEVuZFBvaW50IiwiZHVtbXlOb2RlIiwiZGV0YWNoZWROb2RlIiwibm9kZVRvQXR0YWNoIiwiYW5jaG9yQ3JlYXRlZEJ5RHJhZyIsImN5UG9zaXRpb24iLCJjeVBvc1giLCJjeVBvc1kiLCJlbmRQb2ludCIsImRpc2Nvbm5lY3RlZEVuZCIsImRpc2Nvbm5lY3RFZGdlIiwicmVuZGVyZWRQb3NpdGlvbiIsIm5vZGUiLCJub2RlcyIsImV2ZW50UG9zIiwiaXNOb2RlIiwiZmlyZSIsImFsbEFuY2hvcnMiLCJwcmVJbmRleCIsInBvc0luZGV4IiwicHJlQW5jaG9yUG9pbnQiLCJwb3NBbmNob3JQb2ludCIsIm5lYXJUb0xpbmUiLCJuZXdOb2RlIiwiaXNWYWxpZCIsImxvY2F0aW9uIiwibmV3U291cmNlIiwibmV3VGFyZ2V0IiwiY29ubmVjdEVkZ2UiLCJyZWNvbm5lY3RlZEVkZ2UiLCJjb3B5RWRnZSIsIm5ld0VkZ2UiLCJvbGRFZGdlIiwicmVtb3ZlIiwibG9jIiwib2xkTG9jIiwidG9TdHJpbmciLCJtb3ZlYW5jaG9ycGFyYW0iLCJmaXJzdEFuY2hvciIsImVkZ2VDb250YWluaW5nRmlyc3RBbmNob3IiLCJmaXJzdEFuY2hvclBvaW50Rm91bmQiLCJlIiwiZmlyc3RUaW1lIiwiZmlyc3RBbmNob3JQb3NpdGlvbiIsImluaXRpYWxQb3MiLCJtb3ZlZEZpcnN0QW5jaG9yIiwidGFyZ2V0SXNFZGdlIiwiaXNFZGdlIiwiZXJyIiwiaGlkZU1lbnVJdGVtIiwiY3lQb3MiLCJzZWxlY3RlZEluZGV4Iiwic2hvd01lbnVJdGVtIiwiYW5jaG9yc01vdmluZyIsImtleXMiLCJrZXlEb3duIiwic2hvdWxkTW92ZSIsInRuIiwiZG9jdW1lbnQiLCJhY3RpdmVFbGVtZW50IiwidGFnTmFtZSIsImtleUNvZGUiLCJwcmV2ZW50RGVmYXVsdCIsImVsZW1lbnRzIiwibW92ZVNwZWVkIiwiYWx0S2V5Iiwic2hpZnRLZXkiLCJ1cEFycm93Q29kZSIsImRvd25BcnJvd0NvZGUiLCJsZWZ0QXJyb3dDb2RlIiwicmlnaHRBcnJvd0NvZGUiLCJrZXlVcCIsImFkZEV2ZW50TGlzdGVuZXIiLCJ1bmJpbmQiLCJBcnJheSIsInByb3RvdHlwZSIsInNsaWNlIiwiY2FsbCIsImVycm9yIiwicG9ydHMiLCJtb3ZlIiwiY29weUFuY2hvcnMiLCJjb3B5U3R5bGUiLCJicERpc3RhbmNlcyIsImJwV2VpZ2h0cyIsInVyIiwiZGVmYXVsdEFjdGlvbnMiLCJpc0RlYnVnIiwiY2hhbmdlQW5jaG9yUG9pbnRzIiwiZ2V0RWxlbWVudEJ5SWQiLCJzZXQiLCJoYWRBbmNob3JQb2ludCIsImhhZE11bHRpcGxlQW5jaG9yUG9pbnRzIiwicmVtb3ZlRGF0YSIsInNpbmdsZUNsYXNzTmFtZSIsIm11bHRpQ2xhc3NOYW1lIiwibW92ZURvIiwiYXJnIiwibW92ZUFuY2hvcnNVbmRvYWJsZSIsIm5leHRBbmNob3JzUG9zaXRpb24iLCJyZWNvbm5lY3RFZGdlIiwicmVtb3ZlUmVjb25uZWN0ZWRFZGdlIiwidG1wIiwicmVtb3ZlZCIsInJlc3RvcmUiLCJhY3Rpb24iXSwibWFwcGluZ3MiOiJBQUFBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBLENBQUM7QUFDRCxPO1FDVkE7UUFDQTs7UUFFQTtRQUNBOztRQUVBO1FBQ0E7UUFDQTtRQUNBO1FBQ0E7UUFDQTtRQUNBO1FBQ0E7UUFDQTtRQUNBOztRQUVBO1FBQ0E7O1FBRUE7UUFDQTs7UUFFQTtRQUNBO1FBQ0E7OztRQUdBO1FBQ0E7O1FBRUE7UUFDQTs7UUFFQTtRQUNBO1FBQ0E7UUFDQSwwQ0FBMEMsZ0NBQWdDO1FBQzFFO1FBQ0E7O1FBRUE7UUFDQTtRQUNBO1FBQ0Esd0RBQXdELGtCQUFrQjtRQUMxRTtRQUNBLGlEQUFpRCxjQUFjO1FBQy9EOztRQUVBO1FBQ0E7UUFDQTtRQUNBO1FBQ0E7UUFDQTtRQUNBO1FBQ0E7UUFDQTtRQUNBO1FBQ0E7UUFDQSx5Q0FBeUMsaUNBQWlDO1FBQzFFLGdIQUFnSCxtQkFBbUIsRUFBRTtRQUNySTtRQUNBOztRQUVBO1FBQ0E7UUFDQTtRQUNBLDJCQUEyQiwwQkFBMEIsRUFBRTtRQUN2RCxpQ0FBaUMsZUFBZTtRQUNoRDtRQUNBO1FBQ0E7O1FBRUE7UUFDQSxzREFBc0QsK0RBQStEOztRQUVySDtRQUNBOzs7UUFHQTtRQUNBOzs7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QUdvQixNQUFILENBQVUsa0JBQVYsRUFBOEJULE1BQTlCLEVBQXNDQSxNQUF0QztBQUNBWCxLQUFHb0IsTUFBSCxDQUFVLGVBQVYsRUFBMkJMLGFBQTNCLEVBQTBDQSxhQUExQztBQUNBZixLQUFHb0IsTUFBSCxDQUFVLHVCQUFWLEVBQW1DSixxQkFBbkMsRUFBMERBLHFCQUExRDtBQUNELENBekpELEMiLCJmaWxlIjoiY3l0b3NjYXBlLWVkZ2UtZWRpdGluZy5qcyIsInNvdXJjZXNDb250ZW50IjpbIihmdW5jdGlvbiB3ZWJwYWNrVW5pdmVyc2FsTW9kdWxlRGVmaW5pdGlvbihyb290LCBmYWN0b3J5KSB7XG5cdGlmKHR5cGVvZiBleHBvcnRzID09PSAnb2JqZWN0JyAmJiB0eXBlb2YgbW9kdWxlID09PSAnb2JqZWN0Jylcblx0XHRtb2R1bGUuZXhwb3J0cyA9IGZhY3RvcnkoKTtcblx0ZWxzZSBpZih0eXBlb2YgZGVmaW5lID09PSAnZnVuY3Rpb24nICYmIGRlZmluZS5hbWQpXG5cdFx0ZGVmaW5lKFtdLCBmYWN0b3J5KTtcblx0ZWxzZSBpZih0eXBlb2YgZXhwb3J0cyA9PT0gJ29iamVjdCcpXG5cdFx0ZXhwb3J0c1tcImN5dG9zY2FwZUVkZ2VFZGl0aW5nXCJdID0gZmFjdG9yeSgpO1xuXHRlbHNlXG5cdFx0cm9vdFtcImN5dG9zY2FwZUVkZ2VFZGl0aW5nXCJdID0gZmFjdG9yeSgpO1xufSkod2luZG93LCBmdW5jdGlvbigpIHtcbnJldHVybiAiLCIgXHQvLyBUaGUgbW9kdWxlIGNhY2hlXG4gXHR2YXIgaW5zdGFsbGVkTW9kdWxlcyA9IHt9O1xuXG4gXHQvLyBUaGUgcmVxdWlyZSBmdW5jdGlvblxuIFx0ZnVuY3Rpb24gX193ZWJwYWNrX3JlcXVpcmVfXyhtb2R1bGVJZCkge1xuXG4gXHRcdC8vIENoZWNrIGlmIG1vZHVsZSBpcyBpbiBjYWNoZVxuIFx0XHRpZihpbnN0YWxsZWRNb2R1bGVzW21vZHVsZUlkXSkge1xuIFx0XHRcdHJldHVybiBpbnN0YWxsZWRNb2R1bGVzW21vZHVsZUlkXS5leHBvcnRzO1xuIFx0XHR9XG4gXHRcdC8vIENyZWF0ZSBhIG5ldyBtb2R1bGUgKGFuZCBwdXQgaXQgaW50byB0aGUgY2FjaGUpXG4gXHRcdHZhciBtb2R1bGUgPSBpbnN0YWxsZWRNb2R1bGVzW21vZHVsZUlkXSA9IHtcbiBcdFx0XHRpOiBtb2R1bGVJZCxcbiBcdFx0XHRsOiBmYWxzZSxcbiBcdFx0XHRleHBvcnRzOiB7fVxuIFx0XHR9O1xuXG4gXHRcdC8vIEV4ZWN1dGUgdGhlIG1vZHVsZSBmdW5jdGlvblxuIFx0XHRtb2R1bGVzW21vZHVsZUlkXS5jYWxsKG1vZHVsZS5leHBvcnRzLCBtb2R1bGUsIG1vZHVsZS5leHBvcnRzLCBfX3dlYnBhY2tfcmVxdWlyZV9fKTtcblxuIFx0XHQvLyBGbGFnIHRoZSBtb2R1bGUgYXMgbG9hZGVkXG4gXHRcdG1vZHVsZS5sID0gdHJ1ZTtcblxuIFx0XHQvLyBSZXR1cm4gdGhlIGV4cG9ydHMgb2YgdGhlIG1vZHVsZVxuIFx0XHRyZXR1cm4gbW9kdWxlLmV4cG9ydHM7XG4gXHR9XG5cblxuIFx0Ly8gZXhwb3NlIHRoZSBtb2R1bGVzIG9iamVjdCAoX193ZWJwYWNrX21vZHVsZXNfXylcbiBcdF9fd2VicGFja19yZXF1aXJlX18ubSA9IG1vZHVsZXM7XG5cbiBcdC8vIGV4cG9zZSB0aGUgbW9kdWxlIGNhY2hlXG4gXHRfX3dlYnBhY2tfcmVxdWlyZV9fLmMgPSBpbnN0YWxsZWRNb2R1bGVzO1xuXG4gXHQvLyBkZWZpbmUgZ2V0dGVyIGZ1bmN0aW9uIGZvciBoYXJtb255IGV4cG9ydHNcbiBcdF9fd2VicGFja19yZXF1aXJlX18uZCA9IGZ1bmN0aW9uKGV4cG9ydHMsIG5hbWUsIGdldHRlcikge1xuIFx0XHRpZighX193ZWJwYWNrX3JlcXVpcmVfXy5vKGV4cG9ydHMsIG5hbWUpKSB7XG4gXHRcdFx0T2JqZWN0LmRlZmluZVByb3BlcnR5KGV4cG9ydHMsIG5hbWUsIHsgZW51bWVyYWJsZTogdHJ1ZSwgZ2V0OiBnZXR0ZXIgfSk7XG4gXHRcdH1cbiBcdH07XG5cbiBcdC8vIGRlZmluZSBfX2VzTW9kdWxlIG9uIGV4cG9ydHNcbiBcdF9fd2VicGFja19yZXF1aXJlX18uciA9IGZ1bmN0aW9uKGV4cG9ydHMpIHtcbiBcdFx0aWYodHlwZW9mIFN5bWJvbCAhPT0gJ3VuZGVmaW5lZCcgJiYgU3ltYm9sLnRvU3RyaW5nVGFnKSB7XG4gXHRcdFx0T2JqZWN0LmRlZmluZVByb3BlcnR5KGV4cG9ydHMsIFN5bWJvbC50b1N0cmluZ1RhZywgeyB2YWx1ZTogJ01vZHVsZScgfSk7XG4gXHRcdH1cbiBcdFx0T2JqZWN0LmRlZmluZVByb3BlcnR5KGV4cG9ydHMsICdfX2VzTW9kdWxlJywgeyB2YWx1ZTogdHJ1ZSB9KTtcbiBcdH07XG5cbiBcdC8vIGNyZWF0ZSBhIGZha2UgbmFtZXNwYWNlIG9iamVjdFxuIFx0Ly8gbW9kZSAmIDE6IHZhbHVlIGlzIGEgbW9kdWxlIGlkLCByZXF1aXJlIGl0XG4gXHQvLyBtb2RlICYgMjogbWVyZ2UgYWxsIHByb3BlcnRpZXMgb2YgdmFsdWUgaW50byB0aGUgbnNcbiBcdC8vIG1vZGUgJiA0OiByZXR1cm4gdmFsdWUgd2hlbiBhbHJlYWR5IG5zIG9iamVjdFxuIFx0Ly8gbW9kZSAmIDh8MTogYmVoYXZlIGxpa2UgcmVxdWlyZVxuIFx0X193ZWJwYWNrX3JlcXVpcmVfXy50ID0gZnVuY3Rpb24odmFsdWUsIG1vZGUpIHtcbiBcdFx0aWYobW9kZSAmIDEpIHZhbHVlID0gX193ZWJwYWNrX3JlcXVpcmVfXyh2YWx1ZSk7XG4gXHRcdGlmKG1vZGUgJiA4KSByZXR1cm4gdmFsdWU7XG4gXHRcdGlmKChtb2RlICYgNCkgJiYgdHlwZW9mIHZhbHVlID09PSAnb2JqZWN0JyAmJiB2YWx1ZSAmJiB2YWx1ZS5fX2VzTW9kdWxlKSByZXR1cm4gdmFsdWU7XG4gXHRcdHZhciBucyA9IE9iamVjdC5jcmVhdGUobnVsbCk7XG4gXHRcdF9fd2VicGFja19yZXF1aXJlX18ucihucyk7XG4gXHRcdE9iamVjdC5kZWZpbmVQcm9wZXJ0eShucywgJ2RlZmF1bHQnLCB7IGVudW1lcmFibGU6IHRydWUsIHZhbHVlOiB2YWx1ZSB9KTtcbiBcdFx0aWYobW9kZSAmIDIgJiYgdHlwZW9mIHZhbHVlICE9ICdzdHJpbmcnKSBmb3IodmFyIGtleSBpbiB2YWx1ZSkgX193ZWJwYWNrX3JlcXVpcmVfXy5kKG5zLCBrZXksIGZ1bmN0aW9uKGtleSkgeyByZXR1cm4gdmFsdWVba2V5XTsgfS5iaW5kKG51bGwsIGtleSkpO1xuIFx0XHRyZXR1cm4gbnM7XG4gXHR9O1xuXG4gXHQvLyBnZXREZWZhdWx0RXhwb3J0IGZ1bmN0aW9uIGZvciBjb21wYXRpYmlsaXR5IHdpdGggbm9uLWhhcm1vbnkgbW9kdWxlc1xuIFx0X193ZWJwYWNrX3JlcXVpcmVfXy5uID0gZnVuY3Rpb24obW9kdWxlKSB7XG4gXHRcdHZhciBnZXR0ZXIgPSBtb2R1bGUgJiYgbW9kdWxlLl9fZXNNb2R1bGUgP1xuIFx0XHRcdGZ1bmN0aW9uIGdldERlZmF1bHQoKSB7IHJldHVybiBtb2R1bGVbJ2RlZmF1bHQnXTsgfSA6XG4gXHRcdFx0ZnVuY3Rpb24gZ2V0TW9kdWxlRXhwb3J0cygpIHsgcmV0dXJuIG1vZHVsZTsgfTtcbiBcdFx0X193ZWJwYWNrX3JlcXVpcmVfXy5kKGdldHRlciwgJ2EnLCBnZXR0ZXIpO1xuIFx0XHRyZXR1cm4gZ2V0dGVyO1xuIFx0fTtcblxuIFx0Ly8gT2JqZWN0LnByb3RvdHlwZS5oYXNPd25Qcm9wZXJ0eS5jYWxsXG4gXHRfX3dlYnBhY2tfcmVxdWlyZV9fLm8gPSBmdW5jdGlvbihvYmplY3QsIHByb3BlcnR5KSB7IHJldHVybiBPYmplY3QucHJvdG90eXBlLmhhc093blByb3BlcnR5LmNhbGwob2JqZWN0LCBwcm9wZXJ0eSk7IH07XG5cbiBcdC8vIF9fd2VicGFja19wdWJsaWNfcGF0aF9fXG4gXHRfX3dlYnBhY2tfcmVxdWlyZV9fLnAgPSBcIlwiO1xuXG5cbiBcdC8vIExvYWQgZW50cnkgbW9kdWxlIGFuZCByZXR1cm4gZXhwb3J0c1xuIFx0cmV0dXJuIF9fd2VicGFja19yZXF1aXJlX18oX193ZWJwYWNrX3JlcXVpcmVfXy5zID0gMik7XG4iLCJ2YXIgYW5jaG9yUG9pbnRVdGlsaXRpZXMgPSB7XHJcbiAgY3VycmVudEN0eEVkZ2U6IHVuZGVmaW5lZCxcclxuICBjdXJyZW50Q3R4UG9zOiB1bmRlZmluZWQsXHJcbiAgY3VycmVudEFuY2hvckluZGV4OiB1bmRlZmluZWQsXHJcbiAgaWdub3JlZENsYXNzZXM6IHVuZGVmaW5lZCxcclxuICBzZXRJZ25vcmVkQ2xhc3NlczogZnVuY3Rpb24oX2lnbm9yZWRDbGFzc2VzKSB7XHJcbiAgICB0aGlzLmlnbm9yZWRDbGFzc2VzID0gX2lnbm9yZWRDbGFzc2VzO1xyXG4gIH0sXHJcbiAgc3ludGF4OiB7XHJcbiAgICBiZW5kOiB7XHJcbiAgICAgIGVkZ2U6IFwic2VnbWVudHNcIixcclxuICAgICAgY2xhc3M6IFwiZWRnZWJlbmRlZGl0aW5nLWhhc2JlbmRwb2ludHNcIixcclxuICAgICAgbXVsdGlDbGFzczogXCJlZGdlYmVuZGVkaXRpbmctaGFzbXVsdGlwbGViZW5kcG9pbnRzXCIsXHJcbiAgICAgIHdlaWdodDogXCJjeWVkZ2ViZW5kZWRpdGluZ1dlaWdodHNcIixcclxuICAgICAgZGlzdGFuY2U6IFwiY3llZGdlYmVuZGVkaXRpbmdEaXN0YW5jZXNcIixcclxuICAgICAgd2VpZ2h0Q3NzOiBcInNlZ21lbnQtd2VpZ2h0c1wiLFxyXG4gICAgICBkaXN0YW5jZUNzczogXCJzZWdtZW50LWRpc3RhbmNlc1wiLFxyXG4gICAgICBwb2ludFBvczogXCJiZW5kUG9pbnRQb3NpdGlvbnNcIixcclxuICAgIH0sXHJcbiAgICBjb250cm9sOiB7XHJcbiAgICAgIGVkZ2U6IFwidW5idW5kbGVkLWJlemllclwiLFxyXG4gICAgICBjbGFzczogXCJlZGdlY29udHJvbGVkaXRpbmctaGFzY29udHJvbHBvaW50c1wiLFxyXG4gICAgICBtdWx0aUNsYXNzOiBcImVkZ2Vjb250cm9sZWRpdGluZy1oYXNtdWx0aXBsZWNvbnRyb2xwb2ludHNcIixcclxuICAgICAgd2VpZ2h0OiBcImN5ZWRnZWNvbnRyb2xlZGl0aW5nV2VpZ2h0c1wiLFxyXG4gICAgICBkaXN0YW5jZTogXCJjeWVkZ2Vjb250cm9sZWRpdGluZ0Rpc3RhbmNlc1wiLFxyXG4gICAgICB3ZWlnaHRDc3M6IFwiY29udHJvbC1wb2ludC13ZWlnaHRzXCIsXHJcbiAgICAgIGRpc3RhbmNlQ3NzOiBcImNvbnRyb2wtcG9pbnQtZGlzdGFuY2VzXCIsXHJcbiAgICAgIHBvaW50UG9zOiBcImNvbnRyb2xQb2ludFBvc2l0aW9uc1wiLFxyXG4gICAgfVxyXG4gIH0sXHJcbiAgLy8gZ2V0cyBlZGdlIHR5cGUgYXMgJ2JlbmQnIG9yICdjb250cm9sJ1xyXG4gIC8vIHRoZSBpbnRlcmNoYW5naW5nIGlmLXMgYXJlIG5lY2Vzc2FyeSB0byBzZXQgdGhlIHByaW9yaXR5IG9mIHRoZSB0YWdzXHJcbiAgLy8gZXhhbXBsZTogYW4gZWRnZSB3aXRoIHR5cGUgc2VnbWVudCBhbmQgYSBjbGFzcyAnaGFzY29udHJvbHBvaW50cycgd2lsbCBiZSBjbGFzc2lmaWVkIGFzIHVuYnVuZGxlZCBiZXppZXJcclxuICBnZXRFZGdlVHlwZTogZnVuY3Rpb24oZWRnZSl7XHJcbiAgICBpZighZWRnZSlcclxuICAgICAgcmV0dXJuICdpbmNvbmNsdXNpdmUnO1xyXG4gICAgZWxzZSBpZihlZGdlLmhhc0NsYXNzKHRoaXMuc3ludGF4WydiZW5kJ11bJ2NsYXNzJ10pKVxyXG4gICAgICByZXR1cm4gJ2JlbmQnO1xyXG4gICAgZWxzZSBpZihlZGdlLmhhc0NsYXNzKHRoaXMuc3ludGF4Wydjb250cm9sJ11bJ2NsYXNzJ10pKVxyXG4gICAgICByZXR1cm4gJ2NvbnRyb2wnO1xyXG4gICAgZWxzZSBpZihlZGdlLmNzcygnY3VydmUtc3R5bGUnKSA9PT0gdGhpcy5zeW50YXhbJ2JlbmQnXVsnZWRnZSddKVxyXG4gICAgICByZXR1cm4gJ2JlbmQnO1xyXG4gICAgZWxzZSBpZihlZGdlLmNzcygnY3VydmUtc3R5bGUnKSA9PT0gdGhpcy5zeW50YXhbJ2NvbnRyb2wnXVsnZWRnZSddKVxyXG4gICAgICByZXR1cm4gJ2NvbnRyb2wnO1xyXG4gICAgZWxzZSBpZihlZGdlLmRhdGEodGhpcy5zeW50YXhbJ2JlbmQnXVsncG9pbnRQb3MnXSkgJiYgXHJcbiAgICAgICAgICAgIGVkZ2UuZGF0YSh0aGlzLnN5bnRheFsnYmVuZCddWydwb2ludFBvcyddKS5sZW5ndGggPiAwKVxyXG4gICAgICByZXR1cm4gJ2JlbmQnO1xyXG4gICAgZWxzZSBpZihlZGdlLmRhdGEodGhpcy5zeW50YXhbJ2NvbnRyb2wnXVsncG9pbnRQb3MnXSkgJiYgXHJcbiAgICAgICAgICAgIGVkZ2UuZGF0YSh0aGlzLnN5bnRheFsnY29udHJvbCddWydwb2ludFBvcyddKS5sZW5ndGggPiAwKVxyXG4gICAgICByZXR1cm4gJ2NvbnRyb2wnO1xyXG4gICAgcmV0dXJuICdpbmNvbmNsdXNpdmUnO1xyXG4gIH0sXHJcbiAgLy8gaW5pdGlsaXplIGFuY2hvciBwb2ludHMgYmFzZWQgb24gYmVuZFBvc2l0aW9uc0ZjbiBhbmQgY29udHJvbFBvc2l0aW9uRmNuXHJcbiAgaW5pdEFuY2hvclBvaW50czogZnVuY3Rpb24oYmVuZFBvc2l0aW9uc0ZjbiwgY29udHJvbFBvc2l0aW9uc0ZjbiwgZWRnZXMpIHtcclxuICAgIGZvciAodmFyIGkgPSAwOyBpIDwgZWRnZXMubGVuZ3RoOyBpKyspIHtcclxuICAgICAgdmFyIGVkZ2UgPSBlZGdlc1tpXTtcclxuICAgICAgdmFyIHR5cGUgPSB0aGlzLmdldEVkZ2VUeXBlKGVkZ2UpO1xyXG4gICAgICBcclxuICAgICAgaWYgKHR5cGUgPT09ICdpbmNvbmNsdXNpdmUnKSB7IFxyXG4gICAgICAgIGNvbnRpbnVlOyBcclxuICAgICAgfVxyXG5cclxuICAgICAgaWYoIXRoaXMuaXNJZ25vcmVkRWRnZShlZGdlKSkge1xyXG5cclxuICAgICAgICB2YXIgYW5jaG9yUG9zaXRpb25zO1xyXG5cclxuICAgICAgICAvLyBnZXQgdGhlIGFuY2hvciBwb3NpdGlvbnMgYnkgYXBwbHlpbmcgdGhlIGZ1bmN0aW9ucyBmb3IgdGhpcyBlZGdlXHJcbiAgICAgICAgaWYodHlwZSA9PT0gJ2JlbmQnKVxyXG4gICAgICAgICAgYW5jaG9yUG9zaXRpb25zID0gYmVuZFBvc2l0aW9uc0Zjbi5hcHBseSh0aGlzLCBlZGdlKTtcclxuICAgICAgICBlbHNlIGlmKHR5cGUgPT09ICdjb250cm9sJylcclxuICAgICAgICAgIGFuY2hvclBvc2l0aW9ucyA9IGNvbnRyb2xQb3NpdGlvbnNGY24uYXBwbHkodGhpcywgZWRnZSk7XHJcblxyXG4gICAgICAgIC8vIGNhbGN1bGF0ZSByZWxhdGl2ZSBhbmNob3IgcG9zaXRpb25zXHJcbiAgICAgICAgdmFyIHJlc3VsdCA9IHRoaXMuY29udmVydFRvUmVsYXRpdmVQb3NpdGlvbnMoZWRnZSwgYW5jaG9yUG9zaXRpb25zKTtcclxuXHJcbiAgICAgICAgLy8gaWYgdGhlcmUgYXJlIGFuY2hvcnMgc2V0IHdlaWdodHMgYW5kIGRpc3RhbmNlcyBhY2NvcmRpbmdseSBhbmQgYWRkIGNsYXNzIHRvIGVuYWJsZSBzdHlsZSBjaGFuZ2VzXHJcbiAgICAgICAgaWYgKHJlc3VsdC5kaXN0YW5jZXMubGVuZ3RoID4gMCkge1xyXG4gICAgICAgICAgZWRnZS5kYXRhKHRoaXMuc3ludGF4W3R5cGVdWyd3ZWlnaHQnXSwgcmVzdWx0LndlaWdodHMpO1xyXG4gICAgICAgICAgZWRnZS5kYXRhKHRoaXMuc3ludGF4W3R5cGVdWydkaXN0YW5jZSddLCByZXN1bHQuZGlzdGFuY2VzKTtcclxuICAgICAgICAgIGVkZ2UuYWRkQ2xhc3ModGhpcy5zeW50YXhbdHlwZV1bJ2NsYXNzJ10pO1xyXG4gICAgICAgICAgaWYgKHJlc3VsdC5kaXN0YW5jZXMubGVuZ3RoID4gMSkge1xyXG4gICAgICAgICAgICBlZGdlLmFkZENsYXNzKHRoaXMuc3ludGF4W3R5cGVdWydtdWx0aUNsYXNzJ10pO1xyXG4gICAgICAgICAgfVxyXG4gICAgICAgIH1cclxuICAgICAgfVxyXG4gICAgfVxyXG4gIH0sXHJcblxyXG4gIGlzSWdub3JlZEVkZ2U6IGZ1bmN0aW9uKGVkZ2UpIHtcclxuXHJcbiAgICB2YXIgc3RhcnRYID0gZWRnZS5zb3VyY2UoKS5wb3NpdGlvbigneCcpO1xyXG4gICAgdmFyIHN0YXJ0WSA9IGVkZ2Uuc291cmNlKCkucG9zaXRpb24oJ3knKTtcclxuICAgIHZhciBlbmRYID0gZWRnZS50YXJnZXQoKS5wb3NpdGlvbigneCcpO1xyXG4gICAgdmFyIGVuZFkgPSBlZGdlLnRhcmdldCgpLnBvc2l0aW9uKCd5Jyk7XHJcbiAgIFxyXG4gICAgaWYoKHN0YXJ0WCA9PSBlbmRYICYmIHN0YXJ0WSA9PSBlbmRZKSAgfHwgKGVkZ2Uuc291cmNlKCkuaWQoKSA9PSBlZGdlLnRhcmdldCgpLmlkKCkpKXtcclxuICAgICAgcmV0dXJuIHRydWU7XHJcbiAgICB9XHJcbiAgICBmb3IodmFyIGkgPSAwOyB0aGlzLmlnbm9yZWRDbGFzc2VzICYmIGkgPCAgdGhpcy5pZ25vcmVkQ2xhc3Nlcy5sZW5ndGg7IGkrKyl7XHJcbiAgICAgIGlmKGVkZ2UuaGFzQ2xhc3ModGhpcy5pZ25vcmVkQ2xhc3Nlc1tpXSkpXHJcbiAgICAgICAgcmV0dXJuIHRydWU7XHJcbiAgICB9XHJcbiAgICByZXR1cm4gZmFsc2U7XHJcbiAgfSxcclxuICAvL0dldCB0aGUgZGlyZWN0aW9uIG9mIHRoZSBsaW5lIGZyb20gc291cmNlIHBvaW50IHRvIHRoZSB0YXJnZXQgcG9pbnRcclxuICBnZXRMaW5lRGlyZWN0aW9uOiBmdW5jdGlvbihzcmNQb2ludCwgdGd0UG9pbnQpe1xyXG4gICAgaWYoc3JjUG9pbnQueSA9PSB0Z3RQb2ludC55ICYmIHNyY1BvaW50LnggPCB0Z3RQb2ludC54KXtcclxuICAgICAgcmV0dXJuIDE7XHJcbiAgICB9XHJcbiAgICBpZihzcmNQb2ludC55IDwgdGd0UG9pbnQueSAmJiBzcmNQb2ludC54IDwgdGd0UG9pbnQueCl7XHJcbiAgICAgIHJldHVybiAyO1xyXG4gICAgfVxyXG4gICAgaWYoc3JjUG9pbnQueSA8IHRndFBvaW50LnkgJiYgc3JjUG9pbnQueCA9PSB0Z3RQb2ludC54KXtcclxuICAgICAgcmV0dXJuIDM7XHJcbiAgICB9XHJcbiAgICBpZihzcmNQb2ludC55IDwgdGd0UG9pbnQueSAmJiBzcmNQb2ludC54ID4gdGd0UG9pbnQueCl7XHJcbiAgICAgIHJldHVybiA0O1xyXG4gICAgfVxyXG4gICAgaWYoc3JjUG9pbnQueSA9PSB0Z3RQb2ludC55ICYmIHNyY1BvaW50LnggPiB0Z3RQb2ludC54KXtcclxuICAgICAgcmV0dXJuIDU7XHJcbiAgICB9XHJcbiAgICBpZihzcmNQb2ludC55ID4gdGd0UG9pbnQueSAmJiBzcmNQb2ludC54ID4gdGd0UG9pbnQueCl7XHJcbiAgICAgIHJldHVybiA2O1xyXG4gICAgfVxyXG4gICAgaWYoc3JjUG9pbnQueSA+IHRndFBvaW50LnkgJiYgc3JjUG9pbnQueCA9PSB0Z3RQb2ludC54KXtcclxuICAgICAgcmV0dXJuIDc7XHJcbiAgICB9XHJcbiAgICByZXR1cm4gODsvL2lmIHNyY1BvaW50LnkgPiB0Z3RQb2ludC55IGFuZCBzcmNQb2ludC54IDwgdGd0UG9pbnQueFxyXG4gIH0sXHJcbiAgZ2V0U3JjVGd0UG9pbnRzQW5kVGFuZ2VudHM6IGZ1bmN0aW9uIChlZGdlKSB7XHJcbiAgICB2YXIgc291cmNlTm9kZSA9IGVkZ2Uuc291cmNlKCk7XHJcbiAgICB2YXIgdGFyZ2V0Tm9kZSA9IGVkZ2UudGFyZ2V0KCk7XHJcbiAgICBcclxuICAgIHZhciB0Z3RQb3NpdGlvbiA9IHRhcmdldE5vZGUucG9zaXRpb24oKTtcclxuICAgIHZhciBzcmNQb3NpdGlvbiA9IHNvdXJjZU5vZGUucG9zaXRpb24oKTtcclxuICAgIFxyXG4gICAgdmFyIHNyY1BvaW50ID0gc291cmNlTm9kZS5wb3NpdGlvbigpO1xyXG4gICAgdmFyIHRndFBvaW50ID0gdGFyZ2V0Tm9kZS5wb3NpdGlvbigpO1xyXG5cclxuXHJcbiAgICB2YXIgbTEgPSAodGd0UG9pbnQueSAtIHNyY1BvaW50LnkpIC8gKHRndFBvaW50LnggLSBzcmNQb2ludC54KTtcclxuICAgIHZhciBtMiA9IC0xIC8gbTE7XHJcblxyXG4gICAgcmV0dXJuIHtcclxuICAgICAgbTE6IG0xLFxyXG4gICAgICBtMjogbTIsXHJcbiAgICAgIHNyY1BvaW50OiBzcmNQb2ludCxcclxuICAgICAgdGd0UG9pbnQ6IHRndFBvaW50XHJcbiAgICB9O1xyXG4gIH0sXHJcbiAgZ2V0SW50ZXJzZWN0aW9uOiBmdW5jdGlvbihlZGdlLCBwb2ludCwgc3JjVGd0UG9pbnRzQW5kVGFuZ2VudHMpe1xyXG4gICAgaWYgKHNyY1RndFBvaW50c0FuZFRhbmdlbnRzID09PSB1bmRlZmluZWQpIHtcclxuICAgICAgc3JjVGd0UG9pbnRzQW5kVGFuZ2VudHMgPSB0aGlzLmdldFNyY1RndFBvaW50c0FuZFRhbmdlbnRzKGVkZ2UpO1xyXG4gICAgfVxyXG5cclxuICAgIHZhciBzcmNQb2ludCA9IHNyY1RndFBvaW50c0FuZFRhbmdlbnRzLnNyY1BvaW50O1xyXG4gICAgdmFyIHRndFBvaW50ID0gc3JjVGd0UG9pbnRzQW5kVGFuZ2VudHMudGd0UG9pbnQ7XHJcbiAgICB2YXIgbTEgPSBzcmNUZ3RQb2ludHNBbmRUYW5nZW50cy5tMTtcclxuICAgIHZhciBtMiA9IHNyY1RndFBvaW50c0FuZFRhbmdlbnRzLm0yO1xyXG5cclxuICAgIHZhciBpbnRlcnNlY3RYO1xyXG4gICAgdmFyIGludGVyc2VjdFk7XHJcblxyXG4gICAgaWYobTEgPT0gSW5maW5pdHkgfHwgbTEgPT0gLUluZmluaXR5KXtcclxuICAgICAgaW50ZXJzZWN0WCA9IHNyY1BvaW50Lng7XHJcbiAgICAgIGludGVyc2VjdFkgPSBwb2ludC55O1xyXG4gICAgfVxyXG4gICAgZWxzZSBpZihtMSA9PSAwKXtcclxuICAgICAgaW50ZXJzZWN0WCA9IHBvaW50Lng7XHJcbiAgICAgIGludGVyc2VjdFkgPSBzcmNQb2ludC55O1xyXG4gICAgfVxyXG4gICAgZWxzZSB7XHJcbiAgICAgIHZhciBhMSA9IHNyY1BvaW50LnkgLSBtMSAqIHNyY1BvaW50Lng7XHJcbiAgICAgIHZhciBhMiA9IHBvaW50LnkgLSBtMiAqIHBvaW50Lng7XHJcblxyXG4gICAgICBpbnRlcnNlY3RYID0gKGEyIC0gYTEpIC8gKG0xIC0gbTIpO1xyXG4gICAgICBpbnRlcnNlY3RZID0gbTEgKiBpbnRlcnNlY3RYICsgYTE7XHJcbiAgICB9XHJcblxyXG4gICAgLy9JbnRlcnNlY3Rpb24gcG9pbnQgaXMgdGhlIGludGVyc2VjdGlvbiBvZiB0aGUgbGluZXMgcGFzc2luZyB0aHJvdWdoIHRoZSBub2RlcyBhbmRcclxuICAgIC8vcGFzc2luZyB0aHJvdWdoIHRoZSBiZW5kIG9yIGNvbnRyb2wgcG9pbnQgYW5kIHBlcnBlbmRpY3VsYXIgdG8gdGhlIG90aGVyIGxpbmVcclxuICAgIHZhciBpbnRlcnNlY3Rpb25Qb2ludCA9IHtcclxuICAgICAgeDogaW50ZXJzZWN0WCxcclxuICAgICAgeTogaW50ZXJzZWN0WVxyXG4gICAgfTtcclxuICAgIFxyXG4gICAgcmV0dXJuIGludGVyc2VjdGlvblBvaW50O1xyXG4gIH0sXHJcbiAgZ2V0QW5jaG9yc0FzQXJyYXk6IGZ1bmN0aW9uKGVkZ2UpIHtcclxuICAgIHZhciB0eXBlID0gdGhpcy5nZXRFZGdlVHlwZShlZGdlKTtcclxuXHJcbiAgICBpZih0eXBlID09PSAnaW5jb25jbHVzaXZlJyl7XHJcbiAgICAgIHJldHVybiB1bmRlZmluZWQ7XHJcbiAgICB9XHJcbiAgICBcclxuICAgIGlmKCBlZGdlLmNzcygnY3VydmUtc3R5bGUnKSAhPT0gdGhpcy5zeW50YXhbdHlwZV1bJ2VkZ2UnXSApIHtcclxuICAgICAgcmV0dXJuIHVuZGVmaW5lZDtcclxuICAgIH1cclxuICAgIFxyXG4gICAgdmFyIGFuY2hvckxpc3QgPSBbXTtcclxuXHJcbiAgICB2YXIgd2VpZ2h0cyA9IGVkZ2UucHN0eWxlKCB0aGlzLnN5bnRheFt0eXBlXVsnd2VpZ2h0Q3NzJ10gKSA/IFxyXG4gICAgICAgICAgICAgICAgICBlZGdlLnBzdHlsZSggdGhpcy5zeW50YXhbdHlwZV1bJ3dlaWdodENzcyddICkucGZWYWx1ZSA6IFtdO1xyXG4gICAgdmFyIGRpc3RhbmNlcyA9IGVkZ2UucHN0eWxlKCB0aGlzLnN5bnRheFt0eXBlXVsnZGlzdGFuY2VDc3MnXSApID8gXHJcbiAgICAgICAgICAgICAgICAgIGVkZ2UucHN0eWxlKCB0aGlzLnN5bnRheFt0eXBlXVsnZGlzdGFuY2VDc3MnXSApLnBmVmFsdWUgOiBbXTtcclxuICAgIHZhciBtaW5MZW5ndGhzID0gTWF0aC5taW4oIHdlaWdodHMubGVuZ3RoLCBkaXN0YW5jZXMubGVuZ3RoICk7XHJcbiAgICBcclxuICAgIHZhciBzcmNQb3MgPSBlZGdlLnNvdXJjZSgpLnBvc2l0aW9uKCk7XHJcbiAgICB2YXIgdGd0UG9zID0gZWRnZS50YXJnZXQoKS5wb3NpdGlvbigpO1xyXG5cclxuICAgIHZhciBkeSA9ICggdGd0UG9zLnkgLSBzcmNQb3MueSApO1xyXG4gICAgdmFyIGR4ID0gKCB0Z3RQb3MueCAtIHNyY1Bvcy54ICk7XHJcbiAgICBcclxuICAgIHZhciBsID0gTWF0aC5zcXJ0KCBkeCAqIGR4ICsgZHkgKiBkeSApO1xyXG5cclxuICAgIHZhciB2ZWN0b3IgPSB7XHJcbiAgICAgIHg6IGR4LFxyXG4gICAgICB5OiBkeVxyXG4gICAgfTtcclxuXHJcbiAgICB2YXIgdmVjdG9yTm9ybSA9IHtcclxuICAgICAgeDogdmVjdG9yLnggLyBsLFxyXG4gICAgICB5OiB2ZWN0b3IueSAvIGxcclxuICAgIH07XHJcbiAgICBcclxuICAgIHZhciB2ZWN0b3JOb3JtSW52ZXJzZSA9IHtcclxuICAgICAgeDogLXZlY3Rvck5vcm0ueSxcclxuICAgICAgeTogdmVjdG9yTm9ybS54XHJcbiAgICB9O1xyXG5cclxuICAgIGZvciggdmFyIHMgPSAwOyBzIDwgbWluTGVuZ3RoczsgcysrICl7XHJcbiAgICAgIHZhciB3ID0gd2VpZ2h0c1sgcyBdO1xyXG4gICAgICB2YXIgZCA9IGRpc3RhbmNlc1sgcyBdO1xyXG5cclxuICAgICAgdmFyIHcxID0gKDEgLSB3KTtcclxuICAgICAgdmFyIHcyID0gdztcclxuXHJcbiAgICAgIHZhciBwb3NQdHMgPSB7XHJcbiAgICAgICAgeDE6IHNyY1Bvcy54LFxyXG4gICAgICAgIHgyOiB0Z3RQb3MueCxcclxuICAgICAgICB5MTogc3JjUG9zLnksXHJcbiAgICAgICAgeTI6IHRndFBvcy55XHJcbiAgICAgIH07XHJcblxyXG4gICAgICB2YXIgbWlkcHRQdHMgPSBwb3NQdHM7XHJcbiAgICAgIFxyXG4gICAgICB2YXIgYWRqdXN0ZWRNaWRwdCA9IHtcclxuICAgICAgICB4OiBtaWRwdFB0cy54MSAqIHcxICsgbWlkcHRQdHMueDIgKiB3MixcclxuICAgICAgICB5OiBtaWRwdFB0cy55MSAqIHcxICsgbWlkcHRQdHMueTIgKiB3MlxyXG4gICAgICB9O1xyXG5cclxuICAgICAgYW5jaG9yTGlzdC5wdXNoKFxyXG4gICAgICAgIGFkanVzdGVkTWlkcHQueCArIHZlY3Rvck5vcm1JbnZlcnNlLnggKiBkLFxyXG4gICAgICAgIGFkanVzdGVkTWlkcHQueSArIHZlY3Rvck5vcm1JbnZlcnNlLnkgKiBkXHJcbiAgICAgICk7XHJcbiAgICB9XHJcbiAgICBcclxuICAgIHJldHVybiBhbmNob3JMaXN0O1xyXG4gIH0sXHJcbiAgY29udmVydFRvUmVsYXRpdmVQb3NpdGlvbjogZnVuY3Rpb24gKGVkZ2UsIHBvaW50LCBzcmNUZ3RQb2ludHNBbmRUYW5nZW50cykge1xyXG4gICAgaWYgKHNyY1RndFBvaW50c0FuZFRhbmdlbnRzID09PSB1bmRlZmluZWQpIHtcclxuICAgICAgc3JjVGd0UG9pbnRzQW5kVGFuZ2VudHMgPSB0aGlzLmdldFNyY1RndFBvaW50c0FuZFRhbmdlbnRzKGVkZ2UpO1xyXG4gICAgfVxyXG4gICAgXHJcbiAgICB2YXIgaW50ZXJzZWN0aW9uUG9pbnQgPSB0aGlzLmdldEludGVyc2VjdGlvbihlZGdlLCBwb2ludCwgc3JjVGd0UG9pbnRzQW5kVGFuZ2VudHMpO1xyXG4gICAgdmFyIGludGVyc2VjdFggPSBpbnRlcnNlY3Rpb25Qb2ludC54O1xyXG4gICAgdmFyIGludGVyc2VjdFkgPSBpbnRlcnNlY3Rpb25Qb2ludC55O1xyXG4gICAgXHJcbiAgICB2YXIgc3JjUG9pbnQgPSBzcmNUZ3RQb2ludHNBbmRUYW5nZW50cy5zcmNQb2ludDtcclxuICAgIHZhciB0Z3RQb2ludCA9IHNyY1RndFBvaW50c0FuZFRhbmdlbnRzLnRndFBvaW50O1xyXG4gICAgXHJcbiAgICB2YXIgd2VpZ2h0O1xyXG4gICAgXHJcbiAgICBpZiggaW50ZXJzZWN0WCAhPSBzcmNQb2ludC54ICkge1xyXG4gICAgICB3ZWlnaHQgPSAoaW50ZXJzZWN0WCAtIHNyY1BvaW50LngpIC8gKHRndFBvaW50LnggLSBzcmNQb2ludC54KTtcclxuICAgIH1cclxuICAgIGVsc2UgaWYoIGludGVyc2VjdFkgIT0gc3JjUG9pbnQueSApIHtcclxuICAgICAgd2VpZ2h0ID0gKGludGVyc2VjdFkgLSBzcmNQb2ludC55KSAvICh0Z3RQb2ludC55IC0gc3JjUG9pbnQueSk7XHJcbiAgICB9XHJcbiAgICBlbHNlIHtcclxuICAgICAgd2VpZ2h0ID0gMDtcclxuICAgIH1cclxuICAgIFxyXG4gICAgdmFyIGRpc3RhbmNlID0gTWF0aC5zcXJ0KE1hdGgucG93KChpbnRlcnNlY3RZIC0gcG9pbnQueSksIDIpXHJcbiAgICAgICAgKyBNYXRoLnBvdygoaW50ZXJzZWN0WCAtIHBvaW50LngpLCAyKSk7XHJcbiAgICBcclxuICAgIC8vR2V0IHRoZSBkaXJlY3Rpb24gb2YgdGhlIGxpbmUgZm9ybSBzb3VyY2UgcG9pbnQgdG8gdGFyZ2V0IHBvaW50XHJcbiAgICB2YXIgZGlyZWN0aW9uMSA9IHRoaXMuZ2V0TGluZURpcmVjdGlvbihzcmNQb2ludCwgdGd0UG9pbnQpO1xyXG4gICAgLy9HZXQgdGhlIGRpcmVjdGlvbiBvZiB0aGUgbGluZSBmcm9tIGludGVzZWN0aW9uIHBvaW50IHRvIHRoZSBwb2ludFxyXG4gICAgdmFyIGRpcmVjdGlvbjIgPSB0aGlzLmdldExpbmVEaXJlY3Rpb24oaW50ZXJzZWN0aW9uUG9pbnQsIHBvaW50KTtcclxuICAgIFxyXG4gICAgLy9JZiB0aGUgZGlmZmVyZW5jZSBpcyBub3QgLTIgYW5kIG5vdCA2IHRoZW4gdGhlIGRpcmVjdGlvbiBvZiB0aGUgZGlzdGFuY2UgaXMgbmVnYXRpdmVcclxuICAgIGlmKGRpcmVjdGlvbjEgLSBkaXJlY3Rpb24yICE9IC0yICYmIGRpcmVjdGlvbjEgLSBkaXJlY3Rpb24yICE9IDYpe1xyXG4gICAgICBpZihkaXN0YW5jZSAhPSAwKVxyXG4gICAgICAgIGRpc3RhbmNlID0gLTEgKiBkaXN0YW5jZTtcclxuICAgIH1cclxuICAgIFxyXG4gICAgcmV0dXJuIHtcclxuICAgICAgd2VpZ2h0OiB3ZWlnaHQsXHJcbiAgICAgIGRpc3RhbmNlOiBkaXN0YW5jZVxyXG4gICAgfTtcclxuICB9LFxyXG4gIGNvbnZlcnRUb1JlbGF0aXZlUG9zaXRpb25zOiBmdW5jdGlvbiAoZWRnZSwgYW5jaG9yUG9pbnRzKSB7XHJcbiAgICB2YXIgc3JjVGd0UG9pbnRzQW5kVGFuZ2VudHMgPSB0aGlzLmdldFNyY1RndFBvaW50c0FuZFRhbmdlbnRzKGVkZ2UpO1xyXG5cclxuICAgIHZhciB3ZWlnaHRzID0gW107XHJcbiAgICB2YXIgZGlzdGFuY2VzID0gW107XHJcblxyXG4gICAgZm9yICh2YXIgaSA9IDA7IGFuY2hvclBvaW50cyAmJiBpIDwgYW5jaG9yUG9pbnRzLmxlbmd0aDsgaSsrKSB7XHJcbiAgICAgIHZhciBhbmNob3IgPSBhbmNob3JQb2ludHNbaV07XHJcbiAgICAgIHZhciByZWxhdGl2ZUFuY2hvclBvc2l0aW9uID0gdGhpcy5jb252ZXJ0VG9SZWxhdGl2ZVBvc2l0aW9uKGVkZ2UsIGFuY2hvciwgc3JjVGd0UG9pbnRzQW5kVGFuZ2VudHMpO1xyXG5cclxuICAgICAgd2VpZ2h0cy5wdXNoKHJlbGF0aXZlQW5jaG9yUG9zaXRpb24ud2VpZ2h0KTtcclxuICAgICAgZGlzdGFuY2VzLnB1c2gocmVsYXRpdmVBbmNob3JQb3NpdGlvbi5kaXN0YW5jZSk7XHJcbiAgICB9XHJcblxyXG4gICAgcmV0dXJuIHtcclxuICAgICAgd2VpZ2h0czogd2VpZ2h0cyxcclxuICAgICAgZGlzdGFuY2VzOiBkaXN0YW5jZXNcclxuICAgIH07XHJcbiAgfSxcclxuICBnZXREaXN0YW5jZXNTdHJpbmc6IGZ1bmN0aW9uIChlZGdlLCB0eXBlKSB7XHJcbiAgICB2YXIgc3RyID0gXCJcIjtcclxuXHJcbiAgICB2YXIgZGlzdGFuY2VzID0gZWRnZS5kYXRhKHRoaXMuc3ludGF4W3R5cGVdWydkaXN0YW5jZSddKTtcclxuICAgIGZvciAodmFyIGkgPSAwOyBkaXN0YW5jZXMgJiYgaSA8IGRpc3RhbmNlcy5sZW5ndGg7IGkrKykge1xyXG4gICAgICBzdHIgPSBzdHIgKyBcIiBcIiArIGRpc3RhbmNlc1tpXTtcclxuICAgIH1cclxuICAgIFxyXG4gICAgcmV0dXJuIHN0cjtcclxuICB9LFxyXG4gIGdldFdlaWdodHNTdHJpbmc6IGZ1bmN0aW9uIChlZGdlLCB0eXBlKSB7XHJcbiAgICB2YXIgc3RyID0gXCJcIjtcclxuXHJcbiAgICB2YXIgd2VpZ2h0cyA9IGVkZ2UuZGF0YSh0aGlzLnN5bnRheFt0eXBlXVsnd2VpZ2h0J10pO1xyXG4gICAgZm9yICh2YXIgaSA9IDA7IHdlaWdodHMgJiYgaSA8IHdlaWdodHMubGVuZ3RoOyBpKyspIHtcclxuICAgICAgc3RyID0gc3RyICsgXCIgXCIgKyB3ZWlnaHRzW2ldO1xyXG4gICAgfVxyXG4gICAgXHJcbiAgICByZXR1cm4gc3RyO1xyXG4gIH0sXHJcbiAgYWRkQW5jaG9yUG9pbnQ6IGZ1bmN0aW9uKGVkZ2UsIG5ld0FuY2hvclBvaW50LCB0eXBlID0gdW5kZWZpbmVkKSB7XHJcbiAgICBpZihlZGdlID09PSB1bmRlZmluZWQgfHwgbmV3QW5jaG9yUG9pbnQgPT09IHVuZGVmaW5lZCl7XHJcbiAgICAgIGVkZ2UgPSB0aGlzLmN1cnJlbnRDdHhFZGdlO1xyXG4gICAgICBuZXdBbmNob3JQb2ludCA9IHRoaXMuY3VycmVudEN0eFBvcztcclxuICAgIH1cclxuICBcclxuICAgIGlmKHR5cGUgPT09IHVuZGVmaW5lZClcclxuICAgICAgdHlwZSA9IHRoaXMuZ2V0RWRnZVR5cGUoZWRnZSk7XHJcblxyXG4gICAgdmFyIHdlaWdodFN0ciA9IHRoaXMuc3ludGF4W3R5cGVdWyd3ZWlnaHQnXTtcclxuICAgIHZhciBkaXN0YW5jZVN0ciA9IHRoaXMuc3ludGF4W3R5cGVdWydkaXN0YW5jZSddO1xyXG5cclxuICAgIHZhciByZWxhdGl2ZVBvc2l0aW9uID0gdGhpcy5jb252ZXJ0VG9SZWxhdGl2ZVBvc2l0aW9uKGVkZ2UsIG5ld0FuY2hvclBvaW50KTtcclxuICAgIHZhciBvcmlnaW5hbEFuY2hvcldlaWdodCA9IHJlbGF0aXZlUG9zaXRpb24ud2VpZ2h0O1xyXG4gICAgXHJcbiAgICB2YXIgc3RhcnRYID0gZWRnZS5zb3VyY2UoKS5wb3NpdGlvbigneCcpO1xyXG4gICAgdmFyIHN0YXJ0WSA9IGVkZ2Uuc291cmNlKCkucG9zaXRpb24oJ3knKTtcclxuICAgIHZhciBlbmRYID0gZWRnZS50YXJnZXQoKS5wb3NpdGlvbigneCcpO1xyXG4gICAgdmFyIGVuZFkgPSBlZGdlLnRhcmdldCgpLnBvc2l0aW9uKCd5Jyk7XHJcbiAgICB2YXIgc3RhcnRXZWlnaHQgPSB0aGlzLmNvbnZlcnRUb1JlbGF0aXZlUG9zaXRpb24oZWRnZSwge3g6IHN0YXJ0WCwgeTogc3RhcnRZfSkud2VpZ2h0O1xyXG4gICAgdmFyIGVuZFdlaWdodCA9IHRoaXMuY29udmVydFRvUmVsYXRpdmVQb3NpdGlvbihlZGdlLCB7eDogZW5kWCwgeTogZW5kWX0pLndlaWdodDtcclxuICAgIHZhciB3ZWlnaHRzV2l0aFRndFNyYyA9IFtzdGFydFdlaWdodF0uY29uY2F0KGVkZ2UuZGF0YSh3ZWlnaHRTdHIpP2VkZ2UuZGF0YSh3ZWlnaHRTdHIpOltdKS5jb25jYXQoW2VuZFdlaWdodF0pO1xyXG4gICAgXHJcbiAgICB2YXIgYW5jaG9yc0xpc3QgPSB0aGlzLmdldEFuY2hvcnNBc0FycmF5KGVkZ2UpO1xyXG4gICAgXHJcbiAgICB2YXIgbWluRGlzdCA9IEluZmluaXR5O1xyXG4gICAgdmFyIGludGVyc2VjdGlvbjtcclxuICAgIHZhciBwdHNXaXRoVGd0U3JjID0gW3N0YXJ0WCwgc3RhcnRZXVxyXG4gICAgICAgICAgICAuY29uY2F0KGFuY2hvcnNMaXN0P2FuY2hvcnNMaXN0OltdKVxyXG4gICAgICAgICAgICAuY29uY2F0KFtlbmRYLCBlbmRZXSk7XHJcbiAgICB2YXIgbmV3QW5jaG9ySW5kZXggPSAtMTtcclxuICAgIFxyXG4gICAgZm9yKHZhciBpID0gMDsgaSA8IHdlaWdodHNXaXRoVGd0U3JjLmxlbmd0aCAtIDE7IGkrKyl7XHJcbiAgICAgIHZhciB3MSA9IHdlaWdodHNXaXRoVGd0U3JjW2ldO1xyXG4gICAgICB2YXIgdzIgPSB3ZWlnaHRzV2l0aFRndFNyY1tpICsgMV07XHJcbiAgICAgIFxyXG4gICAgICAvL2NoZWNrIGlmIHRoZSB3ZWlnaHQgaXMgYmV0d2VlbiB3MSBhbmQgdzJcclxuICAgICAgY29uc3QgYjEgPSB0aGlzLmNvbXBhcmVXaXRoUHJlY2lzaW9uKG9yaWdpbmFsQW5jaG9yV2VpZ2h0LCB3MSwgdHJ1ZSk7XHJcbiAgICAgIGNvbnN0IGIyID0gdGhpcy5jb21wYXJlV2l0aFByZWNpc2lvbihvcmlnaW5hbEFuY2hvcldlaWdodCwgdzIpO1xyXG4gICAgICBjb25zdCBiMyA9IHRoaXMuY29tcGFyZVdpdGhQcmVjaXNpb24ob3JpZ2luYWxBbmNob3JXZWlnaHQsIHcyLCB0cnVlKTtcclxuICAgICAgY29uc3QgYjQgPSB0aGlzLmNvbXBhcmVXaXRoUHJlY2lzaW9uKG9yaWdpbmFsQW5jaG9yV2VpZ2h0LCB3MSk7XHJcbiAgICAgIGlmKCAoYjEgJiYgYjIpIHx8IChiMyAmJiBiNCkpe1xyXG4gICAgICAgIHZhciBzdGFydFggPSBwdHNXaXRoVGd0U3JjWzIgKiBpXTtcclxuICAgICAgICB2YXIgc3RhcnRZID0gcHRzV2l0aFRndFNyY1syICogaSArIDFdO1xyXG4gICAgICAgIHZhciBlbmRYID0gcHRzV2l0aFRndFNyY1syICogaSArIDJdO1xyXG4gICAgICAgIHZhciBlbmRZID0gcHRzV2l0aFRndFNyY1syICogaSArIDNdO1xyXG4gICAgICAgIFxyXG4gICAgICAgIHZhciBzdGFydCA9IHtcclxuICAgICAgICAgIHg6IHN0YXJ0WCxcclxuICAgICAgICAgIHk6IHN0YXJ0WVxyXG4gICAgICAgIH07XHJcbiAgICAgICAgXHJcbiAgICAgICAgdmFyIGVuZCA9IHtcclxuICAgICAgICAgIHg6IGVuZFgsXHJcbiAgICAgICAgICB5OiBlbmRZXHJcbiAgICAgICAgfTtcclxuICAgICAgICBcclxuICAgICAgICB2YXIgbTEgPSAoIHN0YXJ0WSAtIGVuZFkgKSAvICggc3RhcnRYIC0gZW5kWCApO1xyXG4gICAgICAgIHZhciBtMiA9IC0xIC8gbTE7XHJcbiAgICAgICAgXHJcbiAgICAgICAgdmFyIHNyY1RndFBvaW50c0FuZFRhbmdlbnRzID0ge1xyXG4gICAgICAgICAgc3JjUG9pbnQ6IHN0YXJ0LFxyXG4gICAgICAgICAgdGd0UG9pbnQ6IGVuZCxcclxuICAgICAgICAgIG0xOiBtMSxcclxuICAgICAgICAgIG0yOiBtMlxyXG4gICAgICAgIH07XHJcbiAgICAgICAgXHJcbiAgICAgICAgdmFyIGN1cnJlbnRJbnRlcnNlY3Rpb24gPSB0aGlzLmdldEludGVyc2VjdGlvbihlZGdlLCBuZXdBbmNob3JQb2ludCwgc3JjVGd0UG9pbnRzQW5kVGFuZ2VudHMpO1xyXG4gICAgICAgIHZhciBkaXN0ID0gTWF0aC5zcXJ0KCBNYXRoLnBvdyggKG5ld0FuY2hvclBvaW50LnggLSBjdXJyZW50SW50ZXJzZWN0aW9uLngpLCAyICkgXHJcbiAgICAgICAgICAgICAgICArIE1hdGgucG93KCAobmV3QW5jaG9yUG9pbnQueSAtIGN1cnJlbnRJbnRlcnNlY3Rpb24ueSksIDIgKSk7XHJcbiAgICAgICAgXHJcbiAgICAgICAgLy9VcGRhdGUgdGhlIG1pbmltdW0gZGlzdGFuY2VcclxuICAgICAgICBpZihkaXN0IDwgbWluRGlzdCl7XHJcbiAgICAgICAgICBtaW5EaXN0ID0gZGlzdDtcclxuICAgICAgICAgIGludGVyc2VjdGlvbiA9IGN1cnJlbnRJbnRlcnNlY3Rpb247XHJcbiAgICAgICAgICBuZXdBbmNob3JJbmRleCA9IGk7XHJcbiAgICAgICAgfVxyXG4gICAgICB9XHJcbiAgICB9XHJcbiAgICBcclxuICAgIGlmKGludGVyc2VjdGlvbiAhPT0gdW5kZWZpbmVkKXtcclxuICAgICAgbmV3QW5jaG9yUG9pbnQgPSBpbnRlcnNlY3Rpb247XHJcbiAgICB9XHJcbiAgICBcclxuICAgIHJlbGF0aXZlUG9zaXRpb24gPSB0aGlzLmNvbnZlcnRUb1JlbGF0aXZlUG9zaXRpb24oZWRnZSwgbmV3QW5jaG9yUG9pbnQpO1xyXG4gICAgXHJcbiAgICBpZihpbnRlcnNlY3Rpb24gPT09IHVuZGVmaW5lZCl7XHJcbiAgICAgIHJlbGF0aXZlUG9zaXRpb24uZGlzdGFuY2UgPSAwO1xyXG4gICAgfVxyXG5cclxuICAgIHZhciB3ZWlnaHRzID0gZWRnZS5kYXRhKHdlaWdodFN0cik7XHJcbiAgICB2YXIgZGlzdGFuY2VzID0gZWRnZS5kYXRhKGRpc3RhbmNlU3RyKTtcclxuICAgIFxyXG4gICAgd2VpZ2h0cyA9IHdlaWdodHM/d2VpZ2h0czpbXTtcclxuICAgIGRpc3RhbmNlcyA9IGRpc3RhbmNlcz9kaXN0YW5jZXM6W107XHJcbiAgICBcclxuICAgIGlmKHdlaWdodHMubGVuZ3RoID09PSAwKSB7XHJcbiAgICAgIG5ld0FuY2hvckluZGV4ID0gMDtcclxuICAgIH1cclxuICAgIFxyXG4vLyAgICB3ZWlnaHRzLnB1c2gocmVsYXRpdmVCZW5kUG9zaXRpb24ud2VpZ2h0KTtcclxuLy8gICAgZGlzdGFuY2VzLnB1c2gocmVsYXRpdmVCZW5kUG9zaXRpb24uZGlzdGFuY2UpO1xyXG4gICAgaWYobmV3QW5jaG9ySW5kZXggIT0gLTEpe1xyXG4gICAgICB3ZWlnaHRzLnNwbGljZShuZXdBbmNob3JJbmRleCwgMCwgcmVsYXRpdmVQb3NpdGlvbi53ZWlnaHQpO1xyXG4gICAgICBkaXN0YW5jZXMuc3BsaWNlKG5ld0FuY2hvckluZGV4LCAwLCByZWxhdGl2ZVBvc2l0aW9uLmRpc3RhbmNlKTtcclxuICAgIH1cclxuICAgXHJcbiAgICBlZGdlLmRhdGEod2VpZ2h0U3RyLCB3ZWlnaHRzKTtcclxuICAgIGVkZ2UuZGF0YShkaXN0YW5jZVN0ciwgZGlzdGFuY2VzKTtcclxuICAgIFxyXG4gICAgZWRnZS5hZGRDbGFzcyh0aGlzLnN5bnRheFt0eXBlXVsnY2xhc3MnXSk7XHJcbiAgICBpZiAod2VpZ2h0cy5sZW5ndGggPiAxIHx8IGRpc3RhbmNlcy5sZW5ndGggPiAxKSB7XHJcbiAgICAgIGVkZ2UuYWRkQ2xhc3ModGhpcy5zeW50YXhbdHlwZV1bJ211bHRpQ2xhc3MnXSk7XHJcbiAgICB9XHJcbiAgICBcclxuICAgIHJldHVybiBuZXdBbmNob3JJbmRleDtcclxuICB9LFxyXG4gIHJlbW92ZUFuY2hvcjogZnVuY3Rpb24oZWRnZSwgYW5jaG9ySW5kZXgpe1xyXG4gICAgaWYoZWRnZSA9PT0gdW5kZWZpbmVkIHx8IGFuY2hvckluZGV4ID09PSB1bmRlZmluZWQpe1xyXG4gICAgICBlZGdlID0gdGhpcy5jdXJyZW50Q3R4RWRnZTtcclxuICAgICAgYW5jaG9ySW5kZXggPSB0aGlzLmN1cnJlbnRBbmNob3JJbmRleDtcclxuICAgIH1cclxuICAgIFxyXG4gICAgdmFyIHR5cGUgPSB0aGlzLmdldEVkZ2VUeXBlKGVkZ2UpO1xyXG5cclxuICAgIGlmKHRoaXMuZWRnZVR5cGVJbmNvbmNsdXNpdmVTaG91bGRudEhhcHBlbih0eXBlLCBcImFuY2hvclBvaW50VXRpbGl0aWVzLmpzLCByZW1vdmVBbmNob3JcIikpe1xyXG4gICAgICByZXR1cm47XHJcbiAgICB9XHJcblxyXG4gICAgdmFyIGRpc3RhbmNlU3RyID0gdGhpcy5zeW50YXhbdHlwZV1bJ3dlaWdodCddO1xyXG4gICAgdmFyIHdlaWdodFN0ciA9IHRoaXMuc3ludGF4W3R5cGVdWydkaXN0YW5jZSddO1xyXG4gICAgdmFyIHBvc2l0aW9uRGF0YVN0ciA9IHRoaXMuc3ludGF4W3R5cGVdWydwb2ludFBvcyddO1xyXG5cclxuICAgIHZhciBkaXN0YW5jZXMgPSBlZGdlLmRhdGEoZGlzdGFuY2VTdHIpO1xyXG4gICAgdmFyIHdlaWdodHMgPSBlZGdlLmRhdGEod2VpZ2h0U3RyKTtcclxuICAgIHZhciBwb3NpdGlvbnMgPSBlZGdlLmRhdGEocG9zaXRpb25EYXRhU3RyKTtcclxuXHJcbiAgICBkaXN0YW5jZXMuc3BsaWNlKGFuY2hvckluZGV4LCAxKTtcclxuICAgIHdlaWdodHMuc3BsaWNlKGFuY2hvckluZGV4LCAxKTtcclxuICAgIC8vIHBvc2l0aW9uIGRhdGEgaXMgbm90IGdpdmVuIGluIGRlbW8gc28gaXQgdGhyb3dzIGVycm9yIGhlcmVcclxuICAgIC8vIGJ1dCBpdCBzaG91bGQgYmUgZnJvbSB0aGUgYmVnaW5uaW5nXHJcbiAgICBpZiAocG9zaXRpb25zKVxyXG4gICAgICBwb3NpdGlvbnMuc3BsaWNlKGFuY2hvckluZGV4LCAxKTtcclxuXHJcbiAgICAvLyBvbmx5IG9uZSBhbmNob3IgcG9pbnQgbGVmdCBvbiBlZGdlXHJcbiAgICBpZiAoZGlzdGFuY2VzLmxlbmd0aCA9PSAxIHx8IHdlaWdodHMubGVuZ3RoID09IDEpIHtcclxuICAgICAgZWRnZS5yZW1vdmVDbGFzcyh0aGlzLnN5bnRheFt0eXBlXVsnbXVsdGlDbGFzcyddKVxyXG4gICAgfVxyXG4gICAgLy8gbm8gbW9yZSBhbmNob3IgcG9pbnRzIG9uIGVkZ2VcclxuICAgIGVsc2UgaWYoZGlzdGFuY2VzLmxlbmd0aCA9PSAwIHx8IHdlaWdodHMubGVuZ3RoID09IDApe1xyXG4gICAgICBlZGdlLnJlbW92ZUNsYXNzKHRoaXMuc3ludGF4W3R5cGVdWydjbGFzcyddKTtcclxuICAgICAgZWRnZS5kYXRhKGRpc3RhbmNlU3RyLCBbXSk7XHJcbiAgICAgIGVkZ2UuZGF0YSh3ZWlnaHRTdHIsIFtdKTtcclxuICAgIH1cclxuICAgIGVsc2Uge1xyXG4gICAgICBlZGdlLmRhdGEoZGlzdGFuY2VTdHIsIGRpc3RhbmNlcyk7XHJcbiAgICAgIGVkZ2UuZGF0YSh3ZWlnaHRTdHIsIHdlaWdodHMpO1xyXG4gICAgfVxyXG4gIH0sXHJcbiAgcmVtb3ZlQWxsQW5jaG9yczogZnVuY3Rpb24oZWRnZSkge1xyXG4gICAgaWYgKGVkZ2UgPT09IHVuZGVmaW5lZCkge1xyXG4gICAgICBlZGdlID0gdGhpcy5jdXJyZW50Q3R4RWRnZTtcclxuICAgIH1cclxuICAgIHZhciB0eXBlID0gdGhpcy5nZXRFZGdlVHlwZShlZGdlKTtcclxuICAgIFxyXG4gICAgaWYodGhpcy5lZGdlVHlwZUluY29uY2x1c2l2ZVNob3VsZG50SGFwcGVuKHR5cGUsIFwiYW5jaG9yUG9pbnRVdGlsaXRpZXMuanMsIHJlbW92ZUFsbEFuY2hvcnNcIikpe1xyXG4gICAgICByZXR1cm47XHJcbiAgICB9XHJcblxyXG4gICAgLy8gUmVtb3ZlIGNsYXNzZXMgZnJvbSBlZGdlXHJcbiAgICBlZGdlLnJlbW92ZUNsYXNzKHRoaXMuc3ludGF4W3R5cGVdWydjbGFzcyddKTtcclxuICAgIGVkZ2UucmVtb3ZlQ2xhc3ModGhpcy5zeW50YXhbdHlwZV1bJ211bHRpQ2xhc3MnXSk7XHJcblxyXG4gICAgLy8gUmVtb3ZlIGFsbCBhbmNob3IgcG9pbnQgZGF0YSBmcm9tIGVkZ2VcclxuICAgIHZhciBkaXN0YW5jZVN0ciA9IHRoaXMuc3ludGF4W3R5cGVdWyd3ZWlnaHQnXTtcclxuICAgIHZhciB3ZWlnaHRTdHIgPSB0aGlzLnN5bnRheFt0eXBlXVsnZGlzdGFuY2UnXTtcclxuICAgIHZhciBwb3NpdGlvbkRhdGFTdHIgPSB0aGlzLnN5bnRheFt0eXBlXVsncG9pbnRQb3MnXTtcclxuICAgIGVkZ2UuZGF0YShkaXN0YW5jZVN0ciwgW10pO1xyXG4gICAgZWRnZS5kYXRhKHdlaWdodFN0ciwgW10pO1xyXG4gICAgLy8gcG9zaXRpb24gZGF0YSBpcyBub3QgZ2l2ZW4gaW4gZGVtbyBzbyBpdCB0aHJvd3MgZXJyb3IgaGVyZVxyXG4gICAgLy8gYnV0IGl0IHNob3VsZCBiZSBmcm9tIHRoZSBiZWdpbm5pbmdcclxuICAgIGlmIChlZGdlLmRhdGEocG9zaXRpb25EYXRhU3RyKSkge1xyXG4gICAgICBlZGdlLmRhdGEocG9zaXRpb25EYXRhU3RyLCBbXSk7XHJcbiAgICB9XHJcbiAgfSxcclxuICBjYWxjdWxhdGVEaXN0YW5jZTogZnVuY3Rpb24ocHQxLCBwdDIpIHtcclxuICAgIHZhciBkaWZmWCA9IHB0MS54IC0gcHQyLng7XHJcbiAgICB2YXIgZGlmZlkgPSBwdDEueSAtIHB0Mi55O1xyXG4gICAgXHJcbiAgICB2YXIgZGlzdCA9IE1hdGguc3FydCggTWF0aC5wb3coIGRpZmZYLCAyICkgKyBNYXRoLnBvdyggZGlmZlksIDIgKSApO1xyXG4gICAgcmV0dXJuIGRpc3Q7XHJcbiAgfSxcclxuICAvKiogKExlc3MgdGhhbiBvciBlcXVhbCB0bykgYW5kIChncmVhdGVyIHRoZW4gZXF1YWwgdG8pIGNvbXBhcmlzb25zIHdpdGggZmxvYXRpbmcgcG9pbnQgbnVtYmVycyAqL1xyXG4gIGNvbXBhcmVXaXRoUHJlY2lzaW9uOiBmdW5jdGlvbiAobjEsIG4yLCBpc0xlc3NUaGVuT3JFcXVhbCA9IGZhbHNlLCBwcmVjaXNpb24gPSAwLjAxKSB7XHJcbiAgICBjb25zdCBkaWZmID0gbjEgLSBuMjtcclxuICAgIGlmIChNYXRoLmFicyhkaWZmKSA8PSBwcmVjaXNpb24pIHtcclxuICAgICAgcmV0dXJuIHRydWU7XHJcbiAgICB9XHJcbiAgICBpZiAoaXNMZXNzVGhlbk9yRXF1YWwpIHtcclxuICAgICAgcmV0dXJuIG4xIDwgbjI7XHJcbiAgICB9IGVsc2Uge1xyXG4gICAgICByZXR1cm4gbjEgPiBuMjtcclxuICAgIH1cclxuICB9LFxyXG4gIGVkZ2VUeXBlSW5jb25jbHVzaXZlU2hvdWxkbnRIYXBwZW46IGZ1bmN0aW9uKHR5cGUsIHBsYWNlKXtcclxuICAgIGlmKHR5cGUgPT09ICdpbmNvbmNsdXNpdmUnKSB7XHJcbiAgICAgIGNvbnNvbGUubG9nKGBJbiAke3BsYWNlfTogZWRnZSB0eXBlIGluY29uY2x1c2l2ZSBzaG91bGQgbmV2ZXIgaGFwcGVuIGhlcmUhIWApO1xyXG4gICAgICByZXR1cm4gdHJ1ZTtcclxuICAgIH1cclxuICAgIHJldHVybiBmYWxzZTtcclxuICB9XHJcbn07XHJcblxyXG5tb2R1bGUuZXhwb3J0cyA9IGFuY2hvclBvaW50VXRpbGl0aWVzO1xyXG4iLCJ2YXIgZGVib3VuY2UgPSAoZnVuY3Rpb24gKCkge1xyXG4gIC8qKlxyXG4gICAqIGxvZGFzaCAzLjEuMSAoQ3VzdG9tIEJ1aWxkKSA8aHR0cHM6Ly9sb2Rhc2guY29tLz5cclxuICAgKiBCdWlsZDogYGxvZGFzaCBtb2Rlcm4gbW9kdWxhcml6ZSBleHBvcnRzPVwibnBtXCIgLW8gLi9gXHJcbiAgICogQ29weXJpZ2h0IDIwMTItMjAxNSBUaGUgRG9qbyBGb3VuZGF0aW9uIDxodHRwOi8vZG9qb2ZvdW5kYXRpb24ub3JnLz5cclxuICAgKiBCYXNlZCBvbiBVbmRlcnNjb3JlLmpzIDEuOC4zIDxodHRwOi8vdW5kZXJzY29yZWpzLm9yZy9MSUNFTlNFPlxyXG4gICAqIENvcHlyaWdodCAyMDA5LTIwMTUgSmVyZW15IEFzaGtlbmFzLCBEb2N1bWVudENsb3VkIGFuZCBJbnZlc3RpZ2F0aXZlIFJlcG9ydGVycyAmIEVkaXRvcnNcclxuICAgKiBBdmFpbGFibGUgdW5kZXIgTUlUIGxpY2Vuc2UgPGh0dHBzOi8vbG9kYXNoLmNvbS9saWNlbnNlPlxyXG4gICAqL1xyXG4gIC8qKiBVc2VkIGFzIHRoZSBgVHlwZUVycm9yYCBtZXNzYWdlIGZvciBcIkZ1bmN0aW9uc1wiIG1ldGhvZHMuICovXHJcbiAgdmFyIEZVTkNfRVJST1JfVEVYVCA9ICdFeHBlY3RlZCBhIGZ1bmN0aW9uJztcclxuXHJcbiAgLyogTmF0aXZlIG1ldGhvZCByZWZlcmVuY2VzIGZvciB0aG9zZSB3aXRoIHRoZSBzYW1lIG5hbWUgYXMgb3RoZXIgYGxvZGFzaGAgbWV0aG9kcy4gKi9cclxuICB2YXIgbmF0aXZlTWF4ID0gTWF0aC5tYXgsXHJcbiAgICAgICAgICBuYXRpdmVOb3cgPSBEYXRlLm5vdztcclxuXHJcbiAgLyoqXHJcbiAgICogR2V0cyB0aGUgbnVtYmVyIG9mIG1pbGxpc2Vjb25kcyB0aGF0IGhhdmUgZWxhcHNlZCBzaW5jZSB0aGUgVW5peCBlcG9jaFxyXG4gICAqICgxIEphbnVhcnkgMTk3MCAwMDowMDowMCBVVEMpLlxyXG4gICAqXHJcbiAgICogQHN0YXRpY1xyXG4gICAqIEBtZW1iZXJPZiBfXHJcbiAgICogQGNhdGVnb3J5IERhdGVcclxuICAgKiBAZXhhbXBsZVxyXG4gICAqXHJcbiAgICogXy5kZWZlcihmdW5jdGlvbihzdGFtcCkge1xyXG4gICAqICAgY29uc29sZS5sb2coXy5ub3coKSAtIHN0YW1wKTtcclxuICAgKiB9LCBfLm5vdygpKTtcclxuICAgKiAvLyA9PiBsb2dzIHRoZSBudW1iZXIgb2YgbWlsbGlzZWNvbmRzIGl0IHRvb2sgZm9yIHRoZSBkZWZlcnJlZCBmdW5jdGlvbiB0byBiZSBpbnZva2VkXHJcbiAgICovXHJcbiAgdmFyIG5vdyA9IG5hdGl2ZU5vdyB8fCBmdW5jdGlvbiAoKSB7XHJcbiAgICByZXR1cm4gbmV3IERhdGUoKS5nZXRUaW1lKCk7XHJcbiAgfTtcclxuXHJcbiAgLyoqXHJcbiAgICogQ3JlYXRlcyBhIGRlYm91bmNlZCBmdW5jdGlvbiB0aGF0IGRlbGF5cyBpbnZva2luZyBgZnVuY2AgdW50aWwgYWZ0ZXIgYHdhaXRgXHJcbiAgICogbWlsbGlzZWNvbmRzIGhhdmUgZWxhcHNlZCBzaW5jZSB0aGUgbGFzdCB0aW1lIHRoZSBkZWJvdW5jZWQgZnVuY3Rpb24gd2FzXHJcbiAgICogaW52b2tlZC4gVGhlIGRlYm91bmNlZCBmdW5jdGlvbiBjb21lcyB3aXRoIGEgYGNhbmNlbGAgbWV0aG9kIHRvIGNhbmNlbFxyXG4gICAqIGRlbGF5ZWQgaW52b2NhdGlvbnMuIFByb3ZpZGUgYW4gb3B0aW9ucyBvYmplY3QgdG8gaW5kaWNhdGUgdGhhdCBgZnVuY2BcclxuICAgKiBzaG91bGQgYmUgaW52b2tlZCBvbiB0aGUgbGVhZGluZyBhbmQvb3IgdHJhaWxpbmcgZWRnZSBvZiB0aGUgYHdhaXRgIHRpbWVvdXQuXHJcbiAgICogU3Vic2VxdWVudCBjYWxscyB0byB0aGUgZGVib3VuY2VkIGZ1bmN0aW9uIHJldHVybiB0aGUgcmVzdWx0IG9mIHRoZSBsYXN0XHJcbiAgICogYGZ1bmNgIGludm9jYXRpb24uXHJcbiAgICpcclxuICAgKiAqKk5vdGU6KiogSWYgYGxlYWRpbmdgIGFuZCBgdHJhaWxpbmdgIG9wdGlvbnMgYXJlIGB0cnVlYCwgYGZ1bmNgIGlzIGludm9rZWRcclxuICAgKiBvbiB0aGUgdHJhaWxpbmcgZWRnZSBvZiB0aGUgdGltZW91dCBvbmx5IGlmIHRoZSB0aGUgZGVib3VuY2VkIGZ1bmN0aW9uIGlzXHJcbiAgICogaW52b2tlZCBtb3JlIHRoYW4gb25jZSBkdXJpbmcgdGhlIGB3YWl0YCB0aW1lb3V0LlxyXG4gICAqXHJcbiAgICogU2VlIFtEYXZpZCBDb3JiYWNobydzIGFydGljbGVdKGh0dHA6Ly9kcnVwYWxtb3Rpb24uY29tL2FydGljbGUvZGVib3VuY2UtYW5kLXRocm90dGxlLXZpc3VhbC1leHBsYW5hdGlvbilcclxuICAgKiBmb3IgZGV0YWlscyBvdmVyIHRoZSBkaWZmZXJlbmNlcyBiZXR3ZWVuIGBfLmRlYm91bmNlYCBhbmQgYF8udGhyb3R0bGVgLlxyXG4gICAqXHJcbiAgICogQHN0YXRpY1xyXG4gICAqIEBtZW1iZXJPZiBfXHJcbiAgICogQGNhdGVnb3J5IEZ1bmN0aW9uXHJcbiAgICogQHBhcmFtIHtGdW5jdGlvbn0gZnVuYyBUaGUgZnVuY3Rpb24gdG8gZGVib3VuY2UuXHJcbiAgICogQHBhcmFtIHtudW1iZXJ9IFt3YWl0PTBdIFRoZSBudW1iZXIgb2YgbWlsbGlzZWNvbmRzIHRvIGRlbGF5LlxyXG4gICAqIEBwYXJhbSB7T2JqZWN0fSBbb3B0aW9uc10gVGhlIG9wdGlvbnMgb2JqZWN0LlxyXG4gICAqIEBwYXJhbSB7Ym9vbGVhbn0gW29wdGlvbnMubGVhZGluZz1mYWxzZV0gU3BlY2lmeSBpbnZva2luZyBvbiB0aGUgbGVhZGluZ1xyXG4gICAqICBlZGdlIG9mIHRoZSB0aW1lb3V0LlxyXG4gICAqIEBwYXJhbSB7bnVtYmVyfSBbb3B0aW9ucy5tYXhXYWl0XSBUaGUgbWF4aW11bSB0aW1lIGBmdW5jYCBpcyBhbGxvd2VkIHRvIGJlXHJcbiAgICogIGRlbGF5ZWQgYmVmb3JlIGl0J3MgaW52b2tlZC5cclxuICAgKiBAcGFyYW0ge2Jvb2xlYW59IFtvcHRpb25zLnRyYWlsaW5nPXRydWVdIFNwZWNpZnkgaW52b2tpbmcgb24gdGhlIHRyYWlsaW5nXHJcbiAgICogIGVkZ2Ugb2YgdGhlIHRpbWVvdXQuXHJcbiAgICogQHJldHVybnMge0Z1bmN0aW9ufSBSZXR1cm5zIHRoZSBuZXcgZGVib3VuY2VkIGZ1bmN0aW9uLlxyXG4gICAqIEBleGFtcGxlXHJcbiAgICpcclxuICAgKiAvLyBhdm9pZCBjb3N0bHkgY2FsY3VsYXRpb25zIHdoaWxlIHRoZSB3aW5kb3cgc2l6ZSBpcyBpbiBmbHV4XHJcbiAgICogalF1ZXJ5KHdpbmRvdykub24oJ3Jlc2l6ZScsIF8uZGVib3VuY2UoY2FsY3VsYXRlTGF5b3V0LCAxNTApKTtcclxuICAgKlxyXG4gICAqIC8vIGludm9rZSBgc2VuZE1haWxgIHdoZW4gdGhlIGNsaWNrIGV2ZW50IGlzIGZpcmVkLCBkZWJvdW5jaW5nIHN1YnNlcXVlbnQgY2FsbHNcclxuICAgKiBqUXVlcnkoJyNwb3N0Ym94Jykub24oJ2NsaWNrJywgXy5kZWJvdW5jZShzZW5kTWFpbCwgMzAwLCB7XHJcbiAgICogICAnbGVhZGluZyc6IHRydWUsXHJcbiAgICogICAndHJhaWxpbmcnOiBmYWxzZVxyXG4gICAqIH0pKTtcclxuICAgKlxyXG4gICAqIC8vIGVuc3VyZSBgYmF0Y2hMb2dgIGlzIGludm9rZWQgb25jZSBhZnRlciAxIHNlY29uZCBvZiBkZWJvdW5jZWQgY2FsbHNcclxuICAgKiB2YXIgc291cmNlID0gbmV3IEV2ZW50U291cmNlKCcvc3RyZWFtJyk7XHJcbiAgICogalF1ZXJ5KHNvdXJjZSkub24oJ21lc3NhZ2UnLCBfLmRlYm91bmNlKGJhdGNoTG9nLCAyNTAsIHtcclxuICAgKiAgICdtYXhXYWl0JzogMTAwMFxyXG4gICAqIH0pKTtcclxuICAgKlxyXG4gICAqIC8vIGNhbmNlbCBhIGRlYm91bmNlZCBjYWxsXHJcbiAgICogdmFyIHRvZG9DaGFuZ2VzID0gXy5kZWJvdW5jZShiYXRjaExvZywgMTAwMCk7XHJcbiAgICogT2JqZWN0Lm9ic2VydmUobW9kZWxzLnRvZG8sIHRvZG9DaGFuZ2VzKTtcclxuICAgKlxyXG4gICAqIE9iamVjdC5vYnNlcnZlKG1vZGVscywgZnVuY3Rpb24oY2hhbmdlcykge1xyXG4gICAqICAgaWYgKF8uZmluZChjaGFuZ2VzLCB7ICd1c2VyJzogJ3RvZG8nLCAndHlwZSc6ICdkZWxldGUnfSkpIHtcclxuICAgKiAgICAgdG9kb0NoYW5nZXMuY2FuY2VsKCk7XHJcbiAgICogICB9XHJcbiAgICogfSwgWydkZWxldGUnXSk7XHJcbiAgICpcclxuICAgKiAvLyAuLi5hdCBzb21lIHBvaW50IGBtb2RlbHMudG9kb2AgaXMgY2hhbmdlZFxyXG4gICAqIG1vZGVscy50b2RvLmNvbXBsZXRlZCA9IHRydWU7XHJcbiAgICpcclxuICAgKiAvLyAuLi5iZWZvcmUgMSBzZWNvbmQgaGFzIHBhc3NlZCBgbW9kZWxzLnRvZG9gIGlzIGRlbGV0ZWRcclxuICAgKiAvLyB3aGljaCBjYW5jZWxzIHRoZSBkZWJvdW5jZWQgYHRvZG9DaGFuZ2VzYCBjYWxsXHJcbiAgICogZGVsZXRlIG1vZGVscy50b2RvO1xyXG4gICAqL1xyXG4gIGZ1bmN0aW9uIGRlYm91bmNlKGZ1bmMsIHdhaXQsIG9wdGlvbnMpIHtcclxuICAgIHZhciBhcmdzLFxyXG4gICAgICAgICAgICBtYXhUaW1lb3V0SWQsXHJcbiAgICAgICAgICAgIHJlc3VsdCxcclxuICAgICAgICAgICAgc3RhbXAsXHJcbiAgICAgICAgICAgIHRoaXNBcmcsXHJcbiAgICAgICAgICAgIHRpbWVvdXRJZCxcclxuICAgICAgICAgICAgdHJhaWxpbmdDYWxsLFxyXG4gICAgICAgICAgICBsYXN0Q2FsbGVkID0gMCxcclxuICAgICAgICAgICAgbWF4V2FpdCA9IGZhbHNlLFxyXG4gICAgICAgICAgICB0cmFpbGluZyA9IHRydWU7XHJcblxyXG4gICAgaWYgKHR5cGVvZiBmdW5jICE9ICdmdW5jdGlvbicpIHtcclxuICAgICAgdGhyb3cgbmV3IFR5cGVFcnJvcihGVU5DX0VSUk9SX1RFWFQpO1xyXG4gICAgfVxyXG4gICAgd2FpdCA9IHdhaXQgPCAwID8gMCA6ICgrd2FpdCB8fCAwKTtcclxuICAgIGlmIChvcHRpb25zID09PSB0cnVlKSB7XHJcbiAgICAgIHZhciBsZWFkaW5nID0gdHJ1ZTtcclxuICAgICAgdHJhaWxpbmcgPSBmYWxzZTtcclxuICAgIH0gZWxzZSBpZiAoaXNPYmplY3Qob3B0aW9ucykpIHtcclxuICAgICAgbGVhZGluZyA9ICEhb3B0aW9ucy5sZWFkaW5nO1xyXG4gICAgICBtYXhXYWl0ID0gJ21heFdhaXQnIGluIG9wdGlvbnMgJiYgbmF0aXZlTWF4KCtvcHRpb25zLm1heFdhaXQgfHwgMCwgd2FpdCk7XHJcbiAgICAgIHRyYWlsaW5nID0gJ3RyYWlsaW5nJyBpbiBvcHRpb25zID8gISFvcHRpb25zLnRyYWlsaW5nIDogdHJhaWxpbmc7XHJcbiAgICB9XHJcblxyXG4gICAgZnVuY3Rpb24gY2FuY2VsKCkge1xyXG4gICAgICBpZiAodGltZW91dElkKSB7XHJcbiAgICAgICAgY2xlYXJUaW1lb3V0KHRpbWVvdXRJZCk7XHJcbiAgICAgIH1cclxuICAgICAgaWYgKG1heFRpbWVvdXRJZCkge1xyXG4gICAgICAgIGNsZWFyVGltZW91dChtYXhUaW1lb3V0SWQpO1xyXG4gICAgICB9XHJcbiAgICAgIGxhc3RDYWxsZWQgPSAwO1xyXG4gICAgICBtYXhUaW1lb3V0SWQgPSB0aW1lb3V0SWQgPSB0cmFpbGluZ0NhbGwgPSB1bmRlZmluZWQ7XHJcbiAgICB9XHJcblxyXG4gICAgZnVuY3Rpb24gY29tcGxldGUoaXNDYWxsZWQsIGlkKSB7XHJcbiAgICAgIGlmIChpZCkge1xyXG4gICAgICAgIGNsZWFyVGltZW91dChpZCk7XHJcbiAgICAgIH1cclxuICAgICAgbWF4VGltZW91dElkID0gdGltZW91dElkID0gdHJhaWxpbmdDYWxsID0gdW5kZWZpbmVkO1xyXG4gICAgICBpZiAoaXNDYWxsZWQpIHtcclxuICAgICAgICBsYXN0Q2FsbGVkID0gbm93KCk7XHJcbiAgICAgICAgcmVzdWx0ID0gZnVuYy5hcHBseSh0aGlzQXJnLCBhcmdzKTtcclxuICAgICAgICBpZiAoIXRpbWVvdXRJZCAmJiAhbWF4VGltZW91dElkKSB7XHJcbiAgICAgICAgICBhcmdzID0gdGhpc0FyZyA9IHVuZGVmaW5lZDtcclxuICAgICAgICB9XHJcbiAgICAgIH1cclxuICAgIH1cclxuXHJcbiAgICBmdW5jdGlvbiBkZWxheWVkKCkge1xyXG4gICAgICB2YXIgcmVtYWluaW5nID0gd2FpdCAtIChub3coKSAtIHN0YW1wKTtcclxuICAgICAgaWYgKHJlbWFpbmluZyA8PSAwIHx8IHJlbWFpbmluZyA+IHdhaXQpIHtcclxuICAgICAgICBjb21wbGV0ZSh0cmFpbGluZ0NhbGwsIG1heFRpbWVvdXRJZCk7XHJcbiAgICAgIH0gZWxzZSB7XHJcbiAgICAgICAgdGltZW91dElkID0gc2V0VGltZW91dChkZWxheWVkLCByZW1haW5pbmcpO1xyXG4gICAgICB9XHJcbiAgICB9XHJcblxyXG4gICAgZnVuY3Rpb24gbWF4RGVsYXllZCgpIHtcclxuICAgICAgY29tcGxldGUodHJhaWxpbmcsIHRpbWVvdXRJZCk7XHJcbiAgICB9XHJcblxyXG4gICAgZnVuY3Rpb24gZGVib3VuY2VkKCkge1xyXG4gICAgICBhcmdzID0gYXJndW1lbnRzO1xyXG4gICAgICBzdGFtcCA9IG5vdygpO1xyXG4gICAgICB0aGlzQXJnID0gdGhpcztcclxuICAgICAgdHJhaWxpbmdDYWxsID0gdHJhaWxpbmcgJiYgKHRpbWVvdXRJZCB8fCAhbGVhZGluZyk7XHJcblxyXG4gICAgICBpZiAobWF4V2FpdCA9PT0gZmFsc2UpIHtcclxuICAgICAgICB2YXIgbGVhZGluZ0NhbGwgPSBsZWFkaW5nICYmICF0aW1lb3V0SWQ7XHJcbiAgICAgIH0gZWxzZSB7XHJcbiAgICAgICAgaWYgKCFtYXhUaW1lb3V0SWQgJiYgIWxlYWRpbmcpIHtcclxuICAgICAgICAgIGxhc3RDYWxsZWQgPSBzdGFtcDtcclxuICAgICAgICB9XHJcbiAgICAgICAgdmFyIHJlbWFpbmluZyA9IG1heFdhaXQgLSAoc3RhbXAgLSBsYXN0Q2FsbGVkKSxcclxuICAgICAgICAgICAgICAgIGlzQ2FsbGVkID0gcmVtYWluaW5nIDw9IDAgfHwgcmVtYWluaW5nID4gbWF4V2FpdDtcclxuXHJcbiAgICAgICAgaWYgKGlzQ2FsbGVkKSB7XHJcbiAgICAgICAgICBpZiAobWF4VGltZW91dElkKSB7XHJcbiAgICAgICAgICAgIG1heFRpbWVvdXRJZCA9IGNsZWFyVGltZW91dChtYXhUaW1lb3V0SWQpO1xyXG4gICAgICAgICAgfVxyXG4gICAgICAgICAgbGFzdENhbGxlZCA9IHN0YW1wO1xyXG4gICAgICAgICAgcmVzdWx0ID0gZnVuYy5hcHBseSh0aGlzQXJnLCBhcmdzKTtcclxuICAgICAgICB9XHJcbiAgICAgICAgZWxzZSBpZiAoIW1heFRpbWVvdXRJZCkge1xyXG4gICAgICAgICAgbWF4VGltZW91dElkID0gc2V0VGltZW91dChtYXhEZWxheWVkLCByZW1haW5pbmcpO1xyXG4gICAgICAgIH1cclxuICAgICAgfVxyXG4gICAgICBpZiAoaXNDYWxsZWQgJiYgdGltZW91dElkKSB7XHJcbiAgICAgICAgdGltZW91dElkID0gY2xlYXJUaW1lb3V0KHRpbWVvdXRJZCk7XHJcbiAgICAgIH1cclxuICAgICAgZWxzZSBpZiAoIXRpbWVvdXRJZCAmJiB3YWl0ICE9PSBtYXhXYWl0KSB7XHJcbiAgICAgICAgdGltZW91dElkID0gc2V0VGltZW91dChkZWxheWVkLCB3YWl0KTtcclxuICAgICAgfVxyXG4gICAgICBpZiAobGVhZGluZ0NhbGwpIHtcclxuICAgICAgICBpc0NhbGxlZCA9IHRydWU7XHJcbiAgICAgICAgcmVzdWx0ID0gZnVuYy5hcHBseSh0aGlzQXJnLCBhcmdzKTtcclxuICAgICAgfVxyXG4gICAgICBpZiAoaXNDYWxsZWQgJiYgIXRpbWVvdXRJZCAmJiAhbWF4VGltZW91dElkKSB7XHJcbiAgICAgICAgYXJncyA9IHRoaXNBcmcgPSB1bmRlZmluZWQ7XHJcbiAgICAgIH1cclxuICAgICAgcmV0dXJuIHJlc3VsdDtcclxuICAgIH1cclxuXHJcbiAgICBkZWJvdW5jZWQuY2FuY2VsID0gY2FuY2VsO1xyXG4gICAgcmV0dXJuIGRlYm91bmNlZDtcclxuICB9XHJcblxyXG4gIC8qKlxyXG4gICAqIENoZWNrcyBpZiBgdmFsdWVgIGlzIHRoZSBbbGFuZ3VhZ2UgdHlwZV0oaHR0cHM6Ly9lczUuZ2l0aHViLmlvLyN4OCkgb2YgYE9iamVjdGAuXHJcbiAgICogKGUuZy4gYXJyYXlzLCBmdW5jdGlvbnMsIG9iamVjdHMsIHJlZ2V4ZXMsIGBuZXcgTnVtYmVyKDApYCwgYW5kIGBuZXcgU3RyaW5nKCcnKWApXHJcbiAgICpcclxuICAgKiBAc3RhdGljXHJcbiAgICogQG1lbWJlck9mIF9cclxuICAgKiBAY2F0ZWdvcnkgTGFuZ1xyXG4gICAqIEBwYXJhbSB7Kn0gdmFsdWUgVGhlIHZhbHVlIHRvIGNoZWNrLlxyXG4gICAqIEByZXR1cm5zIHtib29sZWFufSBSZXR1cm5zIGB0cnVlYCBpZiBgdmFsdWVgIGlzIGFuIG9iamVjdCwgZWxzZSBgZmFsc2VgLlxyXG4gICAqIEBleGFtcGxlXHJcbiAgICpcclxuICAgKiBfLmlzT2JqZWN0KHt9KTtcclxuICAgKiAvLyA9PiB0cnVlXHJcbiAgICpcclxuICAgKiBfLmlzT2JqZWN0KFsxLCAyLCAzXSk7XHJcbiAgICogLy8gPT4gdHJ1ZVxyXG4gICAqXHJcbiAgICogXy5pc09iamVjdCgxKTtcclxuICAgKiAvLyA9PiBmYWxzZVxyXG4gICAqL1xyXG4gIGZ1bmN0aW9uIGlzT2JqZWN0KHZhbHVlKSB7XHJcbiAgICAvLyBBdm9pZCBhIFY4IEpJVCBidWcgaW4gQ2hyb21lIDE5LTIwLlxyXG4gICAgLy8gU2VlIGh0dHBzOi8vY29kZS5nb29nbGUuY29tL3AvdjgvaXNzdWVzL2RldGFpbD9pZD0yMjkxIGZvciBtb3JlIGRldGFpbHMuXHJcbiAgICB2YXIgdHlwZSA9IHR5cGVvZiB2YWx1ZTtcclxuICAgIHJldHVybiAhIXZhbHVlICYmICh0eXBlID09ICdvYmplY3QnIHx8IHR5cGUgPT0gJ2Z1bmN0aW9uJyk7XHJcbiAgfVxyXG5cclxuICByZXR1cm4gZGVib3VuY2U7XHJcblxyXG59KSgpO1xyXG5cclxubW9kdWxlLmV4cG9ydHMgPSBkZWJvdW5jZTsiLCI7KGZ1bmN0aW9uKCl7ICd1c2Ugc3RyaWN0JztcclxuICBcclxuICB2YXIgYW5jaG9yUG9pbnRVdGlsaXRpZXMgPSByZXF1aXJlKCcuL0FuY2hvclBvaW50VXRpbGl0aWVzJyk7XHJcbiAgdmFyIGRlYm91bmNlID0gcmVxdWlyZShcIi4vZGVib3VuY2VcIik7XHJcbiAgXHJcbiAgLy8gcmVnaXN0ZXJzIHRoZSBleHRlbnNpb24gb24gYSBjeXRvc2NhcGUgbGliIHJlZlxyXG4gIHZhciByZWdpc3RlciA9IGZ1bmN0aW9uKCBjeXRvc2NhcGUsICQsIEtvbnZhKXtcclxuICAgIHZhciB1aVV0aWxpdGllcyA9IHJlcXVpcmUoJy4vVUlVdGlsaXRpZXMnKTtcclxuICAgIFxyXG4gICAgaWYoICFjeXRvc2NhcGUgfHwgISQgfHwgIUtvbnZhKXsgcmV0dXJuOyB9IC8vIGNhbid0IHJlZ2lzdGVyIGlmIHJlcXVpcmVkIGxpYnJhcmllcyB1bnNwZWNpZmllZFxyXG5cclxuICAgIHZhciBkZWZhdWx0cyA9IHtcclxuICAgICAgLy8gdGhpcyBmdW5jdGlvbiBzcGVjaWZpZXMgdGhlIHBvaXRpb25zIG9mIGJlbmQgcG9pbnRzXHJcbiAgICAgIC8vIHN0cmljdGx5IG5hbWUgdGhlIHByb3BlcnR5ICdiZW5kUG9pbnRQb3NpdGlvbnMnIGZvciB0aGUgZWRnZSB0byBiZSBkZXRlY3RlZCBmb3IgYmVuZCBwb2ludCBlZGl0aXRuZ1xyXG4gICAgICBiZW5kUG9zaXRpb25zRnVuY3Rpb246IGZ1bmN0aW9uKGVsZSkge1xyXG4gICAgICAgIHJldHVybiBlbGUuZGF0YSgnYmVuZFBvaW50UG9zaXRpb25zJyk7XHJcbiAgICAgIH0sXHJcbiAgICAgIC8vIHRoaXMgZnVuY3Rpb24gc3BlY2lmaWVzIHRoZSBwb2l0aW9ucyBvZiBjb250cm9sIHBvaW50c1xyXG4gICAgICAvLyBzdHJpY3RseSBuYW1lIHRoZSBwcm9wZXJ0eSAnY29udHJvbFBvaW50UG9zaXRpb25zJyBmb3IgdGhlIGVkZ2UgdG8gYmUgZGV0ZWN0ZWQgZm9yIGNvbnRyb2wgcG9pbnQgZWRpdGl0bmdcclxuICAgICAgY29udHJvbFBvc2l0aW9uc0Z1bmN0aW9uOiBmdW5jdGlvbihlbGUpIHtcclxuICAgICAgICByZXR1cm4gZWxlLmRhdGEoJ2NvbnRyb2xQb2ludFBvc2l0aW9ucycpO1xyXG4gICAgICB9LFxyXG4gICAgICAvLyB3aGV0aGVyIHRvIGluaXRpbGl6ZSBiZW5kIGFuZCBjb250cm9sIHBvaW50cyBvbiBjcmVhdGlvbiBvZiB0aGlzIGV4dGVuc2lvbiBhdXRvbWF0aWNhbGx5XHJcbiAgICAgIGluaXRBbmNob3JzQXV0b21hdGljYWxseTogdHJ1ZSxcclxuICAgICAgLy8gdGhlIGNsYXNzZXMgb2YgdGhvc2UgZWRnZXMgdGhhdCBzaG91bGQgYmUgaWdub3JlZFxyXG4gICAgICBpZ25vcmVkQ2xhc3NlczogW10sXHJcbiAgICAgIC8vIHdoZXRoZXIgdGhlIGJlbmQgYW5kIGNvbnRyb2wgZWRpdGluZyBvcGVyYXRpb25zIGFyZSB1bmRvYWJsZSAocmVxdWlyZXMgY3l0b3NjYXBlLXVuZG8tcmVkby5qcylcclxuICAgICAgdW5kb2FibGU6IGZhbHNlLFxyXG4gICAgICAvLyB0aGUgc2l6ZSBvZiBiZW5kIGFuZCBjb250cm9sIHBvaW50IHNoYXBlIGlzIG9idGFpbmVkIGJ5IG11bHRpcGxpbmcgd2lkdGggb2YgZWRnZSB3aXRoIHRoaXMgcGFyYW1ldGVyXHJcbiAgICAgIGFuY2hvclNoYXBlU2l6ZUZhY3RvcjogMyxcclxuICAgICAgLy8gei1pbmRleCB2YWx1ZSBvZiB0aGUgY2FudmFzIGluIHdoaWNoIGJlbmQgYW5kIGNvbnRyb2wgcG9pbnRzIGFyZSBkcmF3blxyXG4gICAgICB6SW5kZXg6IDk5OSwgICAgICBcclxuICAgICAgLy8gd2hldGhlciB0byBzdGFydCB0aGUgcGx1Z2luIGluIHRoZSBlbmFibGVkIHN0YXRlXHJcbiAgICAgIGVuYWJsZWQ6IHRydWUsXHJcbiAgICAgIC8vQW4gb3B0aW9uIHRoYXQgY29udHJvbHMgdGhlIGRpc3RhbmNlIHdpdGhpbiB3aGljaCBhIGJlbmQgcG9pbnQgaXMgY29uc2lkZXJlZCBcIm5lYXJcIiB0aGUgbGluZSBzZWdtZW50IGJldHdlZW4gaXRzIHR3byBuZWlnaGJvcnMgYW5kIHdpbGwgYmUgYXV0b21hdGljYWxseSByZW1vdmVkXHJcbiAgICAgIGJlbmRSZW1vdmFsU2Vuc2l0aXZpdHkgOiA4LFxyXG4gICAgICAvLyB0aXRsZSBvZiBhZGQgYmVuZCBwb2ludCBtZW51IGl0ZW0gKFVzZXIgbWF5IG5lZWQgdG8gYWRqdXN0IHdpZHRoIG9mIG1lbnUgaXRlbXMgYWNjb3JkaW5nIHRvIGxlbmd0aCBvZiB0aGlzIG9wdGlvbilcclxuICAgICAgYWRkQmVuZE1lbnVJdGVtVGl0bGU6IFwiQWRkIEJlbmQgUG9pbnRcIixcclxuICAgICAgLy8gdGl0bGUgb2YgcmVtb3ZlIGJlbmQgcG9pbnQgbWVudSBpdGVtIChVc2VyIG1heSBuZWVkIHRvIGFkanVzdCB3aWR0aCBvZiBtZW51IGl0ZW1zIGFjY29yZGluZyB0byBsZW5ndGggb2YgdGhpcyBvcHRpb24pXHJcbiAgICAgIHJlbW92ZUJlbmRNZW51SXRlbVRpdGxlOiBcIlJlbW92ZSBCZW5kIFBvaW50XCIsXHJcbiAgICAgIC8vIHRpdGxlIG9mIHJlbW92ZSBhbGwgYmVuZCBwb2ludHMgbWVudSBpdGVtXHJcbiAgICAgIHJlbW92ZUFsbEJlbmRNZW51SXRlbVRpdGxlOiBcIlJlbW92ZSBBbGwgQmVuZCBQb2ludHNcIixcclxuICAgICAgLy8gdGl0bGUgb2YgYWRkIGNvbnRyb2wgcG9pbnQgbWVudSBpdGVtIChVc2VyIG1heSBuZWVkIHRvIGFkanVzdCB3aWR0aCBvZiBtZW51IGl0ZW1zIGFjY29yZGluZyB0byBsZW5ndGggb2YgdGhpcyBvcHRpb24pXHJcbiAgICAgIGFkZENvbnRyb2xNZW51SXRlbVRpdGxlOiBcIkFkZCBDb250cm9sIFBvaW50XCIsXHJcbiAgICAgIC8vIHRpdGxlIG9mIHJlbW92ZSBjb250cm9sIHBvaW50IG1lbnUgaXRlbSAoVXNlciBtYXkgbmVlZCB0byBhZGp1c3Qgd2lkdGggb2YgbWVudSBpdGVtcyBhY2NvcmRpbmcgdG8gbGVuZ3RoIG9mIHRoaXMgb3B0aW9uKVxyXG4gICAgICByZW1vdmVDb250cm9sTWVudUl0ZW1UaXRsZTogXCJSZW1vdmUgQ29udHJvbCBQb2ludFwiLFxyXG4gICAgICAvLyB0aXRsZSBvZiByZW1vdmUgYWxsIGNvbnRyb2wgcG9pbnRzIG1lbnUgaXRlbVxyXG4gICAgICByZW1vdmVBbGxDb250cm9sTWVudUl0ZW1UaXRsZTogXCJSZW1vdmUgQWxsIENvbnRyb2wgUG9pbnRzXCIsXHJcbiAgICAgIC8vIHdoZXRoZXIgdGhlIGJlbmQgYW5kIGNvbnRyb2wgcG9pbnRzIGNhbiBiZSBtb3ZlZCBieSBhcnJvd3NcclxuICAgICAgbW92ZVNlbGVjdGVkQW5jaG9yc09uS2V5RXZlbnRzOiBmdW5jdGlvbiAoKSB7XHJcbiAgICAgICAgICByZXR1cm4gdHJ1ZTtcclxuICAgICAgfSxcclxuICAgICAgLy8gd2hldGhlciAnUmVtb3ZlIGFsbCBiZW5kIHBvaW50cycgYW5kICdSZW1vdmUgYWxsIGNvbnRyb2wgcG9pbnRzJyBvcHRpb25zIHNob3VsZCBiZSBwcmVzZW50ZWRcclxuICAgICAgZW5hYmxlTXVsdGlwbGVBbmNob3JSZW1vdmFsT3B0aW9uOiBmYWxzZVxyXG4gICAgfTtcclxuICAgIFxyXG4gICAgdmFyIG9wdGlvbnM7XHJcbiAgICB2YXIgaW5pdGlhbGl6ZWQgPSBmYWxzZTtcclxuICAgIFxyXG4gICAgLy8gTWVyZ2UgZGVmYXVsdCBvcHRpb25zIHdpdGggdGhlIG9uZXMgY29taW5nIGZyb20gcGFyYW1ldGVyXHJcbiAgICBmdW5jdGlvbiBleHRlbmQoZGVmYXVsdHMsIG9wdGlvbnMpIHtcclxuICAgICAgdmFyIG9iaiA9IHt9O1xyXG5cclxuICAgICAgZm9yICh2YXIgaSBpbiBkZWZhdWx0cykge1xyXG4gICAgICAgIG9ialtpXSA9IGRlZmF1bHRzW2ldO1xyXG4gICAgICB9XHJcblxyXG4gICAgICBmb3IgKHZhciBpIGluIG9wdGlvbnMpIHtcclxuICAgICAgICAvLyBTUExJVCBGVU5DVElPTkFMSVRZP1xyXG4gICAgICAgIGlmKGkgPT0gXCJiZW5kUmVtb3ZhbFNlbnNpdGl2aXR5XCIpe1xyXG4gICAgICAgICAgdmFyIHZhbHVlID0gb3B0aW9uc1tpXTtcclxuICAgICAgICAgICBpZighaXNOYU4odmFsdWUpKVxyXG4gICAgICAgICAgIHtcclxuICAgICAgICAgICAgICBpZih2YWx1ZSA+PSAwICYmIHZhbHVlIDw9IDIwKXtcclxuICAgICAgICAgICAgICAgIG9ialtpXSA9IG9wdGlvbnNbaV07XHJcbiAgICAgICAgICAgICAgfWVsc2UgaWYodmFsdWUgPCAwKXtcclxuICAgICAgICAgICAgICAgIG9ialtpXSA9IDBcclxuICAgICAgICAgICAgICB9ZWxzZXtcclxuICAgICAgICAgICAgICAgIG9ialtpXSA9IDIwXHJcbiAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgIH1cclxuICAgICAgICB9ZWxzZXtcclxuICAgICAgICAgIG9ialtpXSA9IG9wdGlvbnNbaV07XHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgfVxyXG5cclxuICAgICAgcmV0dXJuIG9iajtcclxuICAgIH07XHJcbiAgICBcclxuICAgIGN5dG9zY2FwZSggJ2NvcmUnLCAnZWRnZUVkaXRpbmcnLCBmdW5jdGlvbihvcHRzKXtcclxuICAgICAgdmFyIGN5ID0gdGhpcztcclxuICAgICAgXHJcbiAgICAgIGlmKCBvcHRzID09PSAnaW5pdGlhbGl6ZWQnICkge1xyXG4gICAgICAgIHJldHVybiBpbml0aWFsaXplZDtcclxuICAgICAgfVxyXG4gICAgICBcclxuICAgICAgaWYoIG9wdHMgIT09ICdnZXQnICkge1xyXG4gICAgICAgIC8vIG1lcmdlIHRoZSBvcHRpb25zIHdpdGggZGVmYXVsdCBvbmVzXHJcbiAgICAgICAgb3B0aW9ucyA9IGV4dGVuZChkZWZhdWx0cywgb3B0cyk7XHJcbiAgICAgICAgaW5pdGlhbGl6ZWQgPSB0cnVlO1xyXG5cclxuICAgICAgICAvLyBkZWZpbmUgZWRnZWJlbmRlZGl0aW5nLWhhc2JlbmRwb2ludHMgY3NzIGNsYXNzXHJcbiAgICAgICAgY3kuc3R5bGUoKS5zZWxlY3RvcignLmVkZ2ViZW5kZWRpdGluZy1oYXNiZW5kcG9pbnRzJykuY3NzKHtcclxuICAgICAgICAgICdjdXJ2ZS1zdHlsZSc6ICdzZWdtZW50cycsXHJcbiAgICAgICAgICAnc2VnbWVudC1kaXN0YW5jZXMnOiBmdW5jdGlvbiAoZWxlKSB7XHJcbiAgICAgICAgICAgIHJldHVybiBhbmNob3JQb2ludFV0aWxpdGllcy5nZXREaXN0YW5jZXNTdHJpbmcoZWxlLCAnYmVuZCcpO1xyXG4gICAgICAgICAgfSxcclxuICAgICAgICAgICdzZWdtZW50LXdlaWdodHMnOiBmdW5jdGlvbiAoZWxlKSB7XHJcbiAgICAgICAgICAgIHJldHVybiBhbmNob3JQb2ludFV0aWxpdGllcy5nZXRXZWlnaHRzU3RyaW5nKGVsZSwgJ2JlbmQnKTtcclxuICAgICAgICAgIH0sXHJcbiAgICAgICAgICAnZWRnZS1kaXN0YW5jZXMnOiAnbm9kZS1wb3NpdGlvbidcclxuICAgICAgICB9KTtcclxuXHJcbiAgICAgICAgLy8gZGVmaW5lIGVkZ2Vjb250cm9sZWRpdGluZy1oYXNjb250cm9scG9pbnRzIGNzcyBjbGFzc1xyXG4gICAgICAgIGN5LnN0eWxlKCkuc2VsZWN0b3IoJy5lZGdlY29udHJvbGVkaXRpbmctaGFzY29udHJvbHBvaW50cycpLmNzcyh7XHJcbiAgICAgICAgICAnY3VydmUtc3R5bGUnOiAndW5idW5kbGVkLWJlemllcicsXHJcbiAgICAgICAgICAnY29udHJvbC1wb2ludC1kaXN0YW5jZXMnOiBmdW5jdGlvbiAoZWxlKSB7XHJcbiAgICAgICAgICAgIHJldHVybiBhbmNob3JQb2ludFV0aWxpdGllcy5nZXREaXN0YW5jZXNTdHJpbmcoZWxlLCAnY29udHJvbCcpO1xyXG4gICAgICAgICAgfSxcclxuICAgICAgICAgICdjb250cm9sLXBvaW50LXdlaWdodHMnOiBmdW5jdGlvbiAoZWxlKSB7XHJcbiAgICAgICAgICAgIHJldHVybiBhbmNob3JQb2ludFV0aWxpdGllcy5nZXRXZWlnaHRzU3RyaW5nKGVsZSwgJ2NvbnRyb2wnKTtcclxuICAgICAgICAgIH0sXHJcbiAgICAgICAgICAnZWRnZS1kaXN0YW5jZXMnOiAnbm9kZS1wb3NpdGlvbidcclxuICAgICAgICB9KTtcclxuXHJcbiAgICAgICAgYW5jaG9yUG9pbnRVdGlsaXRpZXMuc2V0SWdub3JlZENsYXNzZXMob3B0aW9ucy5pZ25vcmVkQ2xhc3Nlcyk7XHJcblxyXG4gICAgICAgIC8vIGluaXQgYmVuZCBwb3NpdGlvbnMgY29uZGl0aW9uYWxseVxyXG4gICAgICAgIGlmIChvcHRpb25zLmluaXRBbmNob3JzQXV0b21hdGljYWxseSkge1xyXG4gICAgICAgICAgLy8gQ0hFQ0sgVEhJUywgb3B0aW9ucy5pZ25vcmVkQ2xhc3NlcyBVTlVTRURcclxuICAgICAgICAgIGFuY2hvclBvaW50VXRpbGl0aWVzLmluaXRBbmNob3JQb2ludHMob3B0aW9ucy5iZW5kUG9zaXRpb25zRnVuY3Rpb24sIG9wdGlvbnMuY29udHJvbFBvc2l0aW9uc0Z1bmN0aW9uLCBjeS5lZGdlcygpLCBvcHRpb25zLmlnbm9yZWRDbGFzc2VzKTtcclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIGlmKG9wdGlvbnMuZW5hYmxlZClcclxuICAgICAgICAgIHVpVXRpbGl0aWVzKG9wdGlvbnMsIGN5KTtcclxuICAgICAgICBlbHNlXHJcbiAgICAgICAgICB1aVV0aWxpdGllcyhcInVuYmluZFwiLCBjeSk7XHJcbiAgICAgIH1cclxuICAgICAgXHJcbiAgICAgIHZhciBpbnN0YW5jZSA9IGluaXRpYWxpemVkID8ge1xyXG4gICAgICAgIC8qXHJcbiAgICAgICAgKiBnZXQgYmVuZCBvciBjb250cm9sIHBvaW50cyBvZiB0aGUgZ2l2ZW4gZWRnZSBpbiBhbiBhcnJheSBBLFxyXG4gICAgICAgICogQVsyICogaV0gaXMgdGhlIHggY29vcmRpbmF0ZSBhbmQgQVsyICogaSArIDFdIGlzIHRoZSB5IGNvb3JkaW5hdGVcclxuICAgICAgICAqIG9mIHRoZSBpdGggYmVuZCBwb2ludC4gKFJldHVybnMgdW5kZWZpbmVkIGlmIHRoZSBjdXJ2ZSBzdHlsZSBpcyBub3Qgc2VnbWVudHMgbm9yIHVuYnVuZGxlZCBiZXppZXIpXHJcbiAgICAgICAgKi9cclxuICAgICAgICBnZXRBbmNob3JzQXNBcnJheTogZnVuY3Rpb24oZWxlKSB7XHJcbiAgICAgICAgICByZXR1cm4gYW5jaG9yUG9pbnRVdGlsaXRpZXMuZ2V0QW5jaG9yc0FzQXJyYXkoZWxlKTtcclxuICAgICAgICB9LFxyXG4gICAgICAgIC8vIEluaXRpbGl6ZSBwb2ludHMgZm9yIHRoZSBnaXZlbiBlZGdlcyB1c2luZyAnb3B0aW9ucy5iZW5kUG9zaXRpb25zRnVuY3Rpb24nXHJcbiAgICAgICAgaW5pdEFuY2hvclBvaW50czogZnVuY3Rpb24oZWxlcykge1xyXG4gICAgICAgICAgYW5jaG9yUG9pbnRVdGlsaXRpZXMuaW5pdEFuY2hvclBvaW50cyhvcHRpb25zLmJlbmRQb3NpdGlvbnNGdW5jdGlvbiwgb3B0aW9ucy5jb250cm9sUG9zaXRpb25zRnVuY3Rpb24sIGVsZXMpO1xyXG4gICAgICAgIH0sXHJcbiAgICAgICAgZGVsZXRlU2VsZWN0ZWRBbmNob3I6IGZ1bmN0aW9uKGVsZSwgaW5kZXgpIHtcclxuICAgICAgICAgIGFuY2hvclBvaW50VXRpbGl0aWVzLnJlbW92ZUFuY2hvcihlbGUsIGluZGV4KTtcclxuICAgICAgICB9XHJcbiAgICAgIH0gOiB1bmRlZmluZWQ7XHJcblxyXG4gICAgICByZXR1cm4gaW5zdGFuY2U7IC8vIGNoYWluYWJpbGl0eVxyXG4gICAgfSApO1xyXG5cclxuICB9O1xyXG5cclxuICBpZiggdHlwZW9mIG1vZHVsZSAhPT0gJ3VuZGVmaW5lZCcgJiYgbW9kdWxlLmV4cG9ydHMgKXsgLy8gZXhwb3NlIGFzIGEgY29tbW9uanMgbW9kdWxlXHJcbiAgICBtb2R1bGUuZXhwb3J0cyA9IHJlZ2lzdGVyO1xyXG4gIH1cclxuXHJcbiAgaWYoIHR5cGVvZiBkZWZpbmUgIT09ICd1bmRlZmluZWQnICYmIGRlZmluZS5hbWQgKXsgLy8gZXhwb3NlIGFzIGFuIGFtZC9yZXF1aXJlanMgbW9kdWxlXHJcbiAgICBkZWZpbmUoJ2N5dG9zY2FwZS1lZGdlLWVkaXRpbmcnLCBmdW5jdGlvbigpe1xyXG4gICAgICByZXR1cm4gcmVnaXN0ZXI7XHJcbiAgICB9KTtcclxuICB9XHJcblxyXG4gIGlmKCB0eXBlb2YgY3l0b3NjYXBlICE9PSAndW5kZWZpbmVkJyAmJiAkICYmIEtvbnZhKXsgLy8gZXhwb3NlIHRvIGdsb2JhbCBjeXRvc2NhcGUgKGkuZS4gd2luZG93LmN5dG9zY2FwZSlcclxuICAgIHJlZ2lzdGVyKCBjeXRvc2NhcGUsICQsIEtvbnZhICk7XHJcbiAgfVxyXG5cclxufSkoKTtcclxuIiwidmFyIGRlYm91bmNlID0gcmVxdWlyZSgnLi9kZWJvdW5jZScpO1xyXG52YXIgYW5jaG9yUG9pbnRVdGlsaXRpZXMgPSByZXF1aXJlKCcuL0FuY2hvclBvaW50VXRpbGl0aWVzJyk7XHJcbnZhciByZWNvbm5lY3Rpb25VdGlsaXRpZXMgPSByZXF1aXJlKCcuL3JlY29ubmVjdGlvblV0aWxpdGllcycpO1xyXG52YXIgcmVnaXN0ZXJVbmRvUmVkb0Z1bmN0aW9ucyA9IHJlcXVpcmUoJy4vcmVnaXN0ZXJVbmRvUmVkb0Z1bmN0aW9ucycpO1xyXG52YXIgc3RhZ2VJZCA9IDA7XHJcblxyXG5tb2R1bGUuZXhwb3J0cyA9IGZ1bmN0aW9uIChwYXJhbXMsIGN5KSB7XHJcbiAgdmFyIGZuID0gcGFyYW1zO1xyXG5cclxuICB2YXIgYWRkQmVuZFBvaW50Q3h0TWVudUlkID0gJ2N5LWVkZ2UtYmVuZC1lZGl0aW5nLWN4dC1hZGQtYmVuZC1wb2ludCcgKyBzdGFnZUlkO1xyXG4gIHZhciByZW1vdmVCZW5kUG9pbnRDeHRNZW51SWQgPSAnY3ktZWRnZS1iZW5kLWVkaXRpbmctY3h0LXJlbW92ZS1iZW5kLXBvaW50JyArIHN0YWdlSWQ7XHJcbiAgdmFyIHJlbW92ZUFsbEJlbmRQb2ludEN0eE1lbnVJZCA9ICdjeS1lZGdlLWJlbmQtZWRpdGluZy1jeHQtcmVtb3ZlLW11bHRpcGxlLWJlbmQtcG9pbnQnICsgc3RhZ2VJZDtcclxuICB2YXIgYWRkQ29udHJvbFBvaW50Q3h0TWVudUlkID0gJ2N5LWVkZ2UtY29udHJvbC1lZGl0aW5nLWN4dC1hZGQtY29udHJvbC1wb2ludCcgKyBzdGFnZUlkO1xyXG4gIHZhciByZW1vdmVDb250cm9sUG9pbnRDeHRNZW51SWQgPSAnY3ktZWRnZS1jb250cm9sLWVkaXRpbmctY3h0LXJlbW92ZS1jb250cm9sLXBvaW50JyArIHN0YWdlSWQ7XHJcbiAgdmFyIHJlbW92ZUFsbENvbnRyb2xQb2ludEN0eE1lbnVJZCA9ICdjeS1lZGdlLWJlbmQtZWRpdGluZy1jeHQtcmVtb3ZlLW11bHRpcGxlLWNvbnRyb2wtcG9pbnQnICsgc3RhZ2VJZDtcclxuICB2YXIgZVN0eWxlLCBlUmVtb3ZlLCBlQWRkLCBlWm9vbSwgZVNlbGVjdCwgZVVuc2VsZWN0LCBlVGFwU3RhcnQsIGVUYXBTdGFydE9uRWRnZSwgZVRhcERyYWcsIGVUYXBFbmQsIGVDeHRUYXAsIGVEcmFnO1xyXG4gIC8vIGxhc3Qgc3RhdHVzIG9mIGdlc3R1cmVzXHJcbiAgdmFyIGxhc3RQYW5uaW5nRW5hYmxlZCwgbGFzdFpvb21pbmdFbmFibGVkLCBsYXN0Qm94U2VsZWN0aW9uRW5hYmxlZDtcclxuICB2YXIgbGFzdEFjdGl2ZUJnT3BhY2l0eTtcclxuICAvLyBzdGF0dXMgb2YgZWRnZSB0byBoaWdobGlnaHQgYmVuZHMgYW5kIHNlbGVjdGVkIGVkZ2VzXHJcbiAgdmFyIGVkZ2VUb0hpZ2hsaWdodCwgbnVtYmVyT2ZTZWxlY3RlZEVkZ2VzO1xyXG5cclxuICAvLyB0aGUgS2FudmEuc2hhcGUoKSBmb3IgdGhlIGVuZHBvaW50c1xyXG4gIHZhciBlbmRwb2ludFNoYXBlMSA9IG51bGwsIGVuZHBvaW50U2hhcGUyID0gbnVsbDtcclxuICAvLyB1c2VkIHRvIHN0b3AgY2VydGFpbiBjeSBsaXN0ZW5lcnMgd2hlbiBpbnRlcnJhY3Rpbmcgd2l0aCBhbmNob3JzXHJcbiAgdmFyIGFuY2hvclRvdWNoZWQgPSBmYWxzZTtcclxuICAvLyB1c2VkIGNhbGwgZU1vdXNlRG93biBvZiBhbmNob3JNYW5hZ2VyIGlmIHRoZSBtb3VzZSBpcyBvdXQgb2YgdGhlIGNvbnRlbnQgb24gY3kub24odGFwZW5kKVxyXG4gIHZhciBtb3VzZU91dDtcclxuICBcclxuICB2YXIgZnVuY3Rpb25zID0ge1xyXG4gICAgaW5pdDogZnVuY3Rpb24gKCkge1xyXG4gICAgICAvLyByZWdpc3RlciB1bmRvIHJlZG8gZnVuY3Rpb25zXHJcbiAgICAgIHJlZ2lzdGVyVW5kb1JlZG9GdW5jdGlvbnMoY3ksIGFuY2hvclBvaW50VXRpbGl0aWVzLCBwYXJhbXMpO1xyXG4gICAgICBcclxuICAgICAgdmFyIHNlbGYgPSB0aGlzO1xyXG4gICAgICB2YXIgb3B0cyA9IHBhcmFtcztcclxuXHJcbiAgICAgIC8qXHJcbiAgICAgICAgTWFrZSBzdXJlIHdlIGRvbid0IGFwcGVuZCBhbiBlbGVtZW50IHRoYXQgYWxyZWFkeSBleGlzdHMuXHJcbiAgICAgICAgVGhpcyBleHRlbnNpb24gY2FudmFzIHVzZXMgdGhlIHNhbWUgaHRtbCBlbGVtZW50IGFzIGVkZ2UtZWRpdGluZy5cclxuICAgICAgICBJdCBtYWtlcyBzZW5zZSBzaW5jZSBpdCBhbHNvIHVzZXMgdGhlIHNhbWUgS29udmEgc3RhZ2UuXHJcbiAgICAgICAgV2l0aG91dCB0aGUgYmVsb3cgbG9naWMsIGFuIGVtcHR5IGNhbnZhc0VsZW1lbnQgd291bGQgYmUgY3JlYXRlZFxyXG4gICAgICAgIGZvciBvbmUgb2YgdGhlc2UgZXh0ZW5zaW9ucyBmb3Igbm8gcmVhc29uLlxyXG4gICAgICAqL1xyXG4gICAgICB2YXIgJGNvbnRhaW5lciA9ICQodGhpcyk7XHJcbiAgICAgIHZhciBjYW52YXNFbGVtZW50SWQgPSAnY3ktbm9kZS1lZGdlLWVkaXRpbmctc3RhZ2UnICsgc3RhZ2VJZDtcclxuICAgICAgc3RhZ2VJZCsrO1xyXG4gICAgICB2YXIgJGNhbnZhc0VsZW1lbnQgPSAkKCc8ZGl2IGlkPVwiJyArIGNhbnZhc0VsZW1lbnRJZCArICdcIj48L2Rpdj4nKTtcclxuXHJcbiAgICAgIGlmICgkY29udGFpbmVyLmZpbmQoJyMnICsgY2FudmFzRWxlbWVudElkKS5sZW5ndGggPCAxKSB7XHJcbiAgICAgICAgJGNvbnRhaW5lci5hcHBlbmQoJGNhbnZhc0VsZW1lbnQpO1xyXG4gICAgICB9XHJcblxyXG4gICAgICAvKiBcclxuICAgICAgICBNYWludGFpbiBhIHNpbmdsZSBLb252YS5zdGFnZSBvYmplY3QgdGhyb3VnaG91dCB0aGUgYXBwbGljYXRpb24gdGhhdCB1c2VzIHRoaXMgZXh0ZW5zaW9uXHJcbiAgICAgICAgc3VjaCBhcyBOZXd0LiBUaGlzIGlzIGltcG9ydGFudCBzaW5jZSBoYXZpbmcgZGlmZmVyZW50IHN0YWdlcyBjYXVzZXMgd2VpcmQgYmVoYXZpb3JcclxuICAgICAgICBvbiBvdGhlciBleHRlbnNpb25zIHRoYXQgYWxzbyB1c2UgS29udmEsIGxpa2Ugbm90IGxpc3RlbmluZyB0byBtb3VzZSBjbGlja3MgYW5kIHN1Y2guXHJcbiAgICAgICAgSWYgeW91IGFyZSBzb21lb25lIHRoYXQgaXMgY3JlYXRpbmcgYW4gZXh0ZW5zaW9uIHRoYXQgdXNlcyBLb252YSBpbiB0aGUgZnV0dXJlLCB5b3UgbmVlZCB0b1xyXG4gICAgICAgIGJlIGNhcmVmdWwgYWJvdXQgaG93IGV2ZW50cyByZWdpc3Rlci4gSWYgeW91IHVzZSBhIGRpZmZlcmVudCBzdGFnZSBhbG1vc3QgY2VydGFpbmx5IG9uZVxyXG4gICAgICAgIG9yIGJvdGggb2YgdGhlIGV4dGVuc2lvbnMgdGhhdCB1c2UgdGhlIHN0YWdlIGNyZWF0ZWQgYmVsb3cgd2lsbCBicmVhay5cclxuICAgICAgKi8gXHJcbiAgICAgIHZhciBzdGFnZTtcclxuICAgICAgaWYgKEtvbnZhLnN0YWdlcy5sZW5ndGggPCBzdGFnZUlkKSB7XHJcbiAgICAgICAgc3RhZ2UgPSBuZXcgS29udmEuU3RhZ2Uoe1xyXG4gICAgICAgICAgaWQ6ICdub2RlLWVkZ2UtZWRpdGluZy1zdGFnZScsXHJcbiAgICAgICAgICBjb250YWluZXI6IGNhbnZhc0VsZW1lbnRJZCwgICAvLyBpZCBvZiBjb250YWluZXIgPGRpdj5cclxuICAgICAgICAgIHdpZHRoOiAkY29udGFpbmVyLndpZHRoKCksXHJcbiAgICAgICAgICBoZWlnaHQ6ICRjb250YWluZXIuaGVpZ2h0KClcclxuICAgICAgICB9KTtcclxuICAgICAgfVxyXG4gICAgICBlbHNlIHtcclxuICAgICAgICBzdGFnZSA9IEtvbnZhLnN0YWdlc1tzdGFnZUlkIC0gMV07XHJcbiAgICAgIH1cclxuICAgICAgXHJcbiAgICAgIHZhciBjYW52YXM7XHJcbiAgICAgIGlmIChzdGFnZS5nZXRDaGlsZHJlbigpLmxlbmd0aCA8IDEpIHtcclxuICAgICAgICBjYW52YXMgPSBuZXcgS29udmEuTGF5ZXIoKTtcclxuICAgICAgICBzdGFnZS5hZGQoY2FudmFzKTtcclxuICAgICAgfVxyXG4gICAgICBlbHNlIHtcclxuICAgICAgICBjYW52YXMgPSBzdGFnZS5nZXRDaGlsZHJlbigpWzBdO1xyXG4gICAgICB9ICBcclxuICAgICAgXHJcbiAgICAgIHZhciBhbmNob3JNYW5hZ2VyID0ge1xyXG4gICAgICAgIGVkZ2U6IHVuZGVmaW5lZCxcclxuICAgICAgICBlZGdlVHlwZTogJ2luY29uY2x1c2l2ZScsXHJcbiAgICAgICAgYW5jaG9yczogW10sXHJcbiAgICAgICAgLy8gcmVtZW1iZXJzIHRoZSB0b3VjaGVkIGFuY2hvciB0byBhdm9pZCBjbGVhcmluZyBpdCB3aGVuIGRyYWdnaW5nIGhhcHBlbnNcclxuICAgICAgICB0b3VjaGVkQW5jaG9yOiB1bmRlZmluZWQsXHJcbiAgICAgICAgLy8gcmVtZW1iZXJzIHRoZSBpbmRleCBvZiB0aGUgbW92aW5nIGFuY2hvclxyXG4gICAgICAgIHRvdWNoZWRBbmNob3JJbmRleDogdW5kZWZpbmVkLFxyXG4gICAgICAgIGJpbmRMaXN0ZW5lcnM6IGZ1bmN0aW9uKGFuY2hvcil7XHJcbiAgICAgICAgICBhbmNob3Iub24oXCJtb3VzZWRvd24gdG91Y2hzdGFydFwiLCB0aGlzLmVNb3VzZURvd24pO1xyXG4gICAgICAgIH0sXHJcbiAgICAgICAgdW5iaW5kTGlzdGVuZXJzOiBmdW5jdGlvbihhbmNob3Ipe1xyXG4gICAgICAgICAgYW5jaG9yLm9mZihcIm1vdXNlZG93biB0b3VjaHN0YXJ0XCIsIHRoaXMuZU1vdXNlRG93bik7XHJcbiAgICAgICAgfSxcclxuICAgICAgICAvLyBnZXRzIHRyaWdnZXIgb24gY2xpY2tpbmcgb24gY29udGV4dCBtZW51cywgd2hpbGUgY3kgbGlzdGVuZXJzIGRvbid0IGdldCB0cmlnZ2VyZWRcclxuICAgICAgICAvLyBpdCBjYW4gY2F1c2Ugd2VpcmQgYmVoYXZpb3VyIGlmIG5vdCBhd2FyZSBvZiB0aGlzXHJcbiAgICAgICAgZU1vdXNlRG93bjogZnVuY3Rpb24oZXZlbnQpe1xyXG4gICAgICAgICAgLy8gYW5jaG9yTWFuYWdlci5lZGdlLnVuc2VsZWN0KCkgd29uJ3Qgd29yayBzb21ldGltZXMgaWYgdGhpcyB3YXNuJ3QgaGVyZVxyXG4gICAgICAgICAgY3kuYXV0b3Vuc2VsZWN0aWZ5KGZhbHNlKTtcclxuXHJcbiAgICAgICAgICAvLyBlTW91c2VEb3duKHNldCkgLT4gdGFwZHJhZyh1c2VkKSAtPiBlTW91c2VVcChyZXNldClcclxuICAgICAgICAgIGFuY2hvclRvdWNoZWQgPSB0cnVlO1xyXG4gICAgICAgICAgYW5jaG9yTWFuYWdlci50b3VjaGVkQW5jaG9yID0gZXZlbnQudGFyZ2V0O1xyXG4gICAgICAgICAgbW91c2VPdXQgPSBmYWxzZTtcclxuICAgICAgICAgIGFuY2hvck1hbmFnZXIuZWRnZS51bnNlbGVjdCgpO1xyXG5cclxuICAgICAgICAgIC8vIHJlbWVtYmVyIHN0YXRlIGJlZm9yZSBjaGFuZ2luZ1xyXG4gICAgICAgICAgdmFyIHdlaWdodFN0ciA9IGFuY2hvclBvaW50VXRpbGl0aWVzLnN5bnRheFthbmNob3JNYW5hZ2VyLmVkZ2VUeXBlXVsnd2VpZ2h0J107XHJcbiAgICAgICAgICB2YXIgZGlzdGFuY2VTdHIgPSBhbmNob3JQb2ludFV0aWxpdGllcy5zeW50YXhbYW5jaG9yTWFuYWdlci5lZGdlVHlwZV1bJ2Rpc3RhbmNlJ107XHJcblxyXG4gICAgICAgICAgdmFyIGVkZ2UgPSBhbmNob3JNYW5hZ2VyLmVkZ2U7XHJcbiAgICAgICAgICBtb3ZlQW5jaG9yUGFyYW0gPSB7XHJcbiAgICAgICAgICAgIGVkZ2U6IGVkZ2UsXHJcbiAgICAgICAgICAgIHR5cGU6IGFuY2hvck1hbmFnZXIuZWRnZVR5cGUsXHJcbiAgICAgICAgICAgIHdlaWdodHM6IGVkZ2UuZGF0YSh3ZWlnaHRTdHIpID8gW10uY29uY2F0KGVkZ2UuZGF0YSh3ZWlnaHRTdHIpKSA6IFtdLFxyXG4gICAgICAgICAgICBkaXN0YW5jZXM6IGVkZ2UuZGF0YShkaXN0YW5jZVN0cikgPyBbXS5jb25jYXQoZWRnZS5kYXRhKGRpc3RhbmNlU3RyKSkgOiBbXVxyXG4gICAgICAgICAgfTtcclxuXHJcbiAgICAgICAgICB0dXJuT2ZmQWN0aXZlQmdDb2xvcigpO1xyXG4gICAgICAgICAgZGlzYWJsZUdlc3R1cmVzKCk7XHJcbiAgICAgICAgICBcclxuICAgICAgICAgIGN5LmF1dG91bmdyYWJpZnkodHJ1ZSk7XHJcblxyXG4gICAgICAgICAgY2FudmFzLmdldFN0YWdlKCkub24oXCJjb250ZW50VG91Y2hlbmQgY29udGVudE1vdXNldXBcIiwgYW5jaG9yTWFuYWdlci5lTW91c2VVcCk7XHJcbiAgICAgICAgICBjYW52YXMuZ2V0U3RhZ2UoKS5vbihcImNvbnRlbnRNb3VzZW91dFwiLCBhbmNob3JNYW5hZ2VyLmVNb3VzZU91dCk7XHJcbiAgICAgICAgfSxcclxuICAgICAgICAvLyBnZXRzIGNhbGxlZCBiZWZvcmUgY3kub24oJ3RhcGVuZCcpXHJcbiAgICAgICAgZU1vdXNlVXA6IGZ1bmN0aW9uKGV2ZW50KXtcclxuICAgICAgICAgIC8vIHdvbid0IGJlIGNhbGxlZCBpZiB0aGUgbW91c2UgaXMgcmVsZWFzZWQgb3V0IG9mIHNjcmVlblxyXG4gICAgICAgICAgYW5jaG9yVG91Y2hlZCA9IGZhbHNlO1xyXG4gICAgICAgICAgYW5jaG9yTWFuYWdlci50b3VjaGVkQW5jaG9yID0gdW5kZWZpbmVkO1xyXG4gICAgICAgICAgbW91c2VPdXQgPSBmYWxzZTtcclxuICAgICAgICAgIGFuY2hvck1hbmFnZXIuZWRnZS5zZWxlY3QoKTtcclxuICAgICAgICAgIFxyXG4gICAgICAgICAgcmVzZXRBY3RpdmVCZ0NvbG9yKCk7XHJcbiAgICAgICAgICByZXNldEdlc3R1cmVzKCk7XHJcbiAgICAgICAgICBcclxuICAgICAgICAgIC8qIFxyXG4gICAgICAgICAgICogSU1QT1JUQU5UXHJcbiAgICAgICAgICAgKiBBbnkgcHJvZ3JhbW1hdGljIGNhbGxzIHRvIC5zZWxlY3QoKSwgLnVuc2VsZWN0KCkgYWZ0ZXIgdGhpcyBzdGF0ZW1lbnQgYXJlIGlnbm9yZWRcclxuICAgICAgICAgICAqIHVudGlsIGN5LmF1dG91bnNlbGVjdGlmeShmYWxzZSkgaXMgY2FsbGVkIGluIG9uZSBvZiB0aGUgcHJldmlvdXM6XHJcbiAgICAgICAgICAgKiBcclxuICAgICAgICAgICAqIGN5Lm9uKCd0YXBzdGFydCcpXHJcbiAgICAgICAgICAgKiBhbmNob3Iub24oJ21vdXNlZG93biB0b3VjaHN0YXJ0JylcclxuICAgICAgICAgICAqIGRvY3VtZW50Lm9uKCdrZXlkb3duJylcclxuICAgICAgICAgICAqIGN5Lm9uKCd0YXBkcmFwJylcclxuICAgICAgICAgICAqIFxyXG4gICAgICAgICAgICogRG9lc24ndCBhZmZlY3QgVVgsIGJ1dCBtYXkgY2F1c2UgY29uZnVzaW5nIGJlaGF2aW91ciBpZiBub3QgYXdhcmUgb2YgdGhpcyB3aGVuIGNvZGluZ1xyXG4gICAgICAgICAgICogXHJcbiAgICAgICAgICAgKiBXaHkgaXMgdGhpcyBoZXJlP1xyXG4gICAgICAgICAgICogVGhpcyBpcyBpbXBvcnRhbnQgdG8ga2VlcCBlZGdlcyBmcm9tIGJlaW5nIGF1dG8gZGVzZWxlY3RlZCBmcm9tIHdvcmtpbmdcclxuICAgICAgICAgICAqIHdpdGggYW5jaG9ycyBvdXQgb2YgdGhlIGVkZ2UgYm9keSAoZm9yIHVuYnVuZGxlZCBiZXppZXIsIHRlY2huaWNhbGx5IG5vdCBuZWNlc3NlcnkgZm9yIHNlZ2VtZW50cykuXHJcbiAgICAgICAgICAgKiBcclxuICAgICAgICAgICAqIFRoZXNlIGlzIGFudGhlciBjeS5hdXRvc2VsZWN0aWZ5KHRydWUpIGluIGN5Lm9uKCd0YXBlbmQnKSBcclxuICAgICAgICAgICAqIFxyXG4gICAgICAgICAgKi8gXHJcbiAgICAgICAgICBjeS5hdXRvdW5zZWxlY3RpZnkodHJ1ZSk7XHJcbiAgICAgICAgICBjeS5hdXRvdW5ncmFiaWZ5KGZhbHNlKTtcclxuXHJcbiAgICAgICAgICBjYW52YXMuZ2V0U3RhZ2UoKS5vZmYoXCJjb250ZW50VG91Y2hlbmQgY29udGVudE1vdXNldXBcIiwgYW5jaG9yTWFuYWdlci5lTW91c2VVcCk7XHJcbiAgICAgICAgICBjYW52YXMuZ2V0U3RhZ2UoKS5vZmYoXCJjb250ZW50TW91c2VvdXRcIiwgYW5jaG9yTWFuYWdlci5lTW91c2VPdXQpO1xyXG4gICAgICAgIH0sXHJcbiAgICAgICAgLy8gaGFuZGxlIG1vdXNlIGdvaW5nIG91dCBvZiBjYW52YXMgXHJcbiAgICAgICAgZU1vdXNlT3V0OiBmdW5jdGlvbiAoZXZlbnQpe1xyXG4gICAgICAgICAgbW91c2VPdXQgPSB0cnVlO1xyXG4gICAgICAgIH0sXHJcbiAgICAgICAgY2xlYXJBbmNob3JzRXhjZXB0OiBmdW5jdGlvbihkb250Q2xlYW4gPSB1bmRlZmluZWQpe1xyXG4gICAgICAgICAgdmFyIGV4Y2VwdGlvbkFwcGxpZXMgPSBmYWxzZTtcclxuXHJcbiAgICAgICAgICB0aGlzLmFuY2hvcnMuZm9yRWFjaCgoYW5jaG9yLCBpbmRleCkgPT4ge1xyXG4gICAgICAgICAgICBpZihkb250Q2xlYW4gJiYgYW5jaG9yID09PSBkb250Q2xlYW4pe1xyXG4gICAgICAgICAgICAgIGV4Y2VwdGlvbkFwcGxpZXMgPSB0cnVlOyAvLyB0aGUgZG9udENsZWFuIGFuY2hvciBpcyBub3QgY2xlYXJlZFxyXG4gICAgICAgICAgICAgIHJldHVybjtcclxuICAgICAgICAgICAgfVxyXG5cclxuICAgICAgICAgICAgdGhpcy51bmJpbmRMaXN0ZW5lcnMoYW5jaG9yKTtcclxuICAgICAgICAgICAgYW5jaG9yLmRlc3Ryb3koKTtcclxuICAgICAgICAgIH0pO1xyXG5cclxuICAgICAgICAgIGlmKGV4Y2VwdGlvbkFwcGxpZXMpe1xyXG4gICAgICAgICAgICB0aGlzLmFuY2hvcnMgPSBbZG9udENsZWFuXTtcclxuICAgICAgICAgIH1cclxuICAgICAgICAgIGVsc2Uge1xyXG4gICAgICAgICAgICB0aGlzLmFuY2hvcnMgPSBbXTtcclxuICAgICAgICAgICAgdGhpcy5lZGdlID0gdW5kZWZpbmVkO1xyXG4gICAgICAgICAgICB0aGlzLmVkZ2VUeXBlID0gJ2luY29uY2x1c2l2ZSc7XHJcbiAgICAgICAgICB9XHJcbiAgICAgICAgfSxcclxuICAgICAgICAvLyByZW5kZXIgdGhlIGJlbmQgYW5kIGNvbnRyb2wgc2hhcGVzIG9mIHRoZSBnaXZlbiBlZGdlXHJcbiAgICAgICAgcmVuZGVyQW5jaG9yU2hhcGVzOiBmdW5jdGlvbihlZGdlKSB7XHJcbiAgICAgICAgICB0aGlzLmVkZ2UgPSBlZGdlO1xyXG4gICAgICAgICAgdGhpcy5lZGdlVHlwZSA9IGFuY2hvclBvaW50VXRpbGl0aWVzLmdldEVkZ2VUeXBlKGVkZ2UpO1xyXG5cclxuICAgICAgICAgIGlmKCFlZGdlLmhhc0NsYXNzKCdlZGdlYmVuZGVkaXRpbmctaGFzYmVuZHBvaW50cycpICYmXHJcbiAgICAgICAgICAgICAgIWVkZ2UuaGFzQ2xhc3MoJ2VkZ2Vjb250cm9sZWRpdGluZy1oYXNjb250cm9scG9pbnRzJykpIHtcclxuICAgICAgICAgICAgcmV0dXJuO1xyXG4gICAgICAgICAgfVxyXG4gICAgICAgICAgXHJcbiAgICAgICAgICB2YXIgYW5jaG9yTGlzdCA9IGFuY2hvclBvaW50VXRpbGl0aWVzLmdldEFuY2hvcnNBc0FycmF5KGVkZ2UpOy8vZWRnZS5fcHJpdmF0ZS5yZGF0YS5zZWdwdHM7XHJcbiAgICAgICAgICB2YXIgbGVuZ3RoID0gZ2V0QW5jaG9yU2hhcGVzTGVuZ3RoKGVkZ2UpICogMC42NTtcclxuICAgICAgICAgIFxyXG4gICAgICAgICAgdmFyIHNyY1BvcyA9IGVkZ2Uuc291cmNlKCkucG9zaXRpb24oKTtcclxuICAgICAgICAgIHZhciB0Z3RQb3MgPSBlZGdlLnRhcmdldCgpLnBvc2l0aW9uKCk7XHJcblxyXG4gICAgICAgICAgZm9yKHZhciBpID0gMDsgYW5jaG9yTGlzdCAmJiBpIDwgYW5jaG9yTGlzdC5sZW5ndGg7IGkgPSBpICsgMil7XHJcbiAgICAgICAgICAgIHZhciBhbmNob3JYID0gYW5jaG9yTGlzdFtpXTtcclxuICAgICAgICAgICAgdmFyIGFuY2hvclkgPSBhbmNob3JMaXN0W2kgKyAxXTtcclxuXHJcbiAgICAgICAgICAgIHRoaXMucmVuZGVyQW5jaG9yU2hhcGUoYW5jaG9yWCwgYW5jaG9yWSwgbGVuZ3RoKTtcclxuICAgICAgICAgIH1cclxuXHJcbiAgICAgICAgICBjYW52YXMuZHJhdygpO1xyXG4gICAgICAgIH0sXHJcbiAgICAgICAgLy8gcmVuZGVyIGEgYW5jaG9yIHNoYXBlIHdpdGggdGhlIGdpdmVuIHBhcmFtZXRlcnNcclxuICAgICAgICByZW5kZXJBbmNob3JTaGFwZTogZnVuY3Rpb24oYW5jaG9yWCwgYW5jaG9yWSwgbGVuZ3RoKSB7XHJcbiAgICAgICAgICAvLyBnZXQgdGhlIHRvcCBsZWZ0IGNvb3JkaW5hdGVzXHJcbiAgICAgICAgICB2YXIgdG9wTGVmdFggPSBhbmNob3JYIC0gbGVuZ3RoIC8gMjtcclxuICAgICAgICAgIHZhciB0b3BMZWZ0WSA9IGFuY2hvclkgLSBsZW5ndGggLyAyO1xyXG4gICAgICAgICAgXHJcbiAgICAgICAgICAvLyBjb252ZXJ0IHRvIHJlbmRlcmVkIHBhcmFtZXRlcnNcclxuICAgICAgICAgIHZhciByZW5kZXJlZFRvcExlZnRQb3MgPSBjb252ZXJ0VG9SZW5kZXJlZFBvc2l0aW9uKHt4OiB0b3BMZWZ0WCwgeTogdG9wTGVmdFl9KTtcclxuICAgICAgICAgIGxlbmd0aCAqPSBjeS56b29tKCk7XHJcbiAgICAgICAgICBcclxuICAgICAgICAgIHZhciBuZXdBbmNob3IgPSBuZXcgS29udmEuUmVjdCh7XHJcbiAgICAgICAgICAgIHg6IHJlbmRlcmVkVG9wTGVmdFBvcy54LFxyXG4gICAgICAgICAgICB5OiByZW5kZXJlZFRvcExlZnRQb3MueSxcclxuICAgICAgICAgICAgd2lkdGg6IGxlbmd0aCxcclxuICAgICAgICAgICAgaGVpZ2h0OiBsZW5ndGgsXHJcbiAgICAgICAgICAgIGZpbGw6ICdibGFjaycsXHJcbiAgICAgICAgICAgIHN0cm9rZVdpZHRoOiAwLFxyXG4gICAgICAgICAgICBkcmFnZ2FibGU6IHRydWVcclxuICAgICAgICAgIH0pO1xyXG5cclxuICAgICAgICAgIHRoaXMuYW5jaG9ycy5wdXNoKG5ld0FuY2hvcik7XHJcbiAgICAgICAgICB0aGlzLmJpbmRMaXN0ZW5lcnMobmV3QW5jaG9yKTtcclxuICAgICAgICAgIGNhbnZhcy5hZGQobmV3QW5jaG9yKTtcclxuICAgICAgICB9XHJcbiAgICAgIH07XHJcblxyXG4gICAgICB2YXIgY3h0QWRkQmVuZEZjbiA9IGZ1bmN0aW9uKGV2ZW50KXtcclxuICAgICAgICBjeHRBZGRBbmNob3JGY24oZXZlbnQsICdiZW5kJyk7XHJcbiAgICAgIH1cclxuXHJcbiAgICAgIHZhciBjeHRBZGRDb250cm9sRmNuID0gZnVuY3Rpb24oZXZlbnQpIHtcclxuICAgICAgICBjeHRBZGRBbmNob3JGY24oZXZlbnQsICdjb250cm9sJyk7XHJcbiAgICAgIH1cclxuXHJcbiAgICAgIHZhciBjeHRBZGRBbmNob3JGY24gPSBmdW5jdGlvbiAoZXZlbnQsIGFuY2hvclR5cGUpIHtcclxuICAgICAgICB2YXIgZWRnZSA9IGV2ZW50LnRhcmdldCB8fCBldmVudC5jeVRhcmdldDtcclxuICAgICAgICBpZighYW5jaG9yUG9pbnRVdGlsaXRpZXMuaXNJZ25vcmVkRWRnZShlZGdlKSkge1xyXG5cclxuICAgICAgICAgIHZhciB0eXBlID0gYW5jaG9yUG9pbnRVdGlsaXRpZXMuZ2V0RWRnZVR5cGUoZWRnZSk7XHJcbiAgICAgICAgICB2YXIgd2VpZ2h0cywgZGlzdGFuY2VzLCB3ZWlnaHRTdHIsIGRpc3RhbmNlU3RyO1xyXG5cclxuICAgICAgICAgIGlmKHR5cGUgPT09ICdpbmNvbmNsdXNpdmUnKXtcclxuICAgICAgICAgICAgd2VpZ2h0cyA9IFtdO1xyXG4gICAgICAgICAgICBkaXN0YW5jZXMgPSBbXTtcclxuICAgICAgICAgIH1cclxuICAgICAgICAgIGVsc2V7XHJcbiAgICAgICAgICAgIHdlaWdodFN0ciA9IGFuY2hvclBvaW50VXRpbGl0aWVzLnN5bnRheFt0eXBlXVsnd2VpZ2h0J107XHJcbiAgICAgICAgICAgIGRpc3RhbmNlU3RyID0gYW5jaG9yUG9pbnRVdGlsaXRpZXMuc3ludGF4W3R5cGVdWydkaXN0YW5jZSddO1xyXG5cclxuICAgICAgICAgICAgd2VpZ2h0cyA9IGVkZ2UuZGF0YSh3ZWlnaHRTdHIpID8gW10uY29uY2F0KGVkZ2UuZGF0YSh3ZWlnaHRTdHIpKSA6IGVkZ2UuZGF0YSh3ZWlnaHRTdHIpO1xyXG4gICAgICAgICAgICBkaXN0YW5jZXMgPSBlZGdlLmRhdGEoZGlzdGFuY2VTdHIpID8gW10uY29uY2F0KGVkZ2UuZGF0YShkaXN0YW5jZVN0cikpIDogZWRnZS5kYXRhKGRpc3RhbmNlU3RyKTtcclxuICAgICAgICAgIH1cclxuXHJcbiAgICAgICAgICB2YXIgcGFyYW0gPSB7XHJcbiAgICAgICAgICAgIGVkZ2U6IGVkZ2UsXHJcbiAgICAgICAgICAgIHR5cGU6IHR5cGUsXHJcbiAgICAgICAgICAgIHdlaWdodHM6IHdlaWdodHMsXHJcbiAgICAgICAgICAgIGRpc3RhbmNlczogZGlzdGFuY2VzXHJcbiAgICAgICAgICB9O1xyXG5cclxuICAgICAgICAgIC8vIHRoZSB1bmRlZmluZWQgZ28gZm9yIGVkZ2UgYW5kIG5ld0FuY2hvclBvaW50IHBhcmFtZXRlcnNcclxuICAgICAgICAgIGFuY2hvclBvaW50VXRpbGl0aWVzLmFkZEFuY2hvclBvaW50KHVuZGVmaW5lZCwgdW5kZWZpbmVkLCBhbmNob3JUeXBlKTtcclxuXHJcbiAgICAgICAgICBpZiAob3B0aW9ucygpLnVuZG9hYmxlKSB7XHJcbiAgICAgICAgICAgIGN5LnVuZG9SZWRvKCkuZG8oJ2NoYW5nZUFuY2hvclBvaW50cycsIHBhcmFtKTtcclxuICAgICAgICAgIH1cclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIHJlZnJlc2hEcmF3cygpO1xyXG4gICAgICAgIGVkZ2Uuc2VsZWN0KCk7XHJcbiAgICAgIH07XHJcblxyXG4gICAgICB2YXIgY3h0UmVtb3ZlQW5jaG9yRmNuID0gZnVuY3Rpb24gKGV2ZW50KSB7XHJcbiAgICAgICAgdmFyIGVkZ2UgPSBhbmNob3JNYW5hZ2VyLmVkZ2U7XHJcbiAgICAgICAgdmFyIHR5cGUgPSBhbmNob3JQb2ludFV0aWxpdGllcy5nZXRFZGdlVHlwZShlZGdlKTtcclxuXHJcbiAgICAgICAgaWYoYW5jaG9yUG9pbnRVdGlsaXRpZXMuZWRnZVR5cGVJbmNvbmNsdXNpdmVTaG91bGRudEhhcHBlbih0eXBlLCBcIlVpVXRpbGl0aWVzLmpzLCBjeHRSZW1vdmVBbmNob3JGY25cIikpe1xyXG4gICAgICAgICAgcmV0dXJuO1xyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgdmFyIHBhcmFtID0ge1xyXG4gICAgICAgICAgZWRnZTogZWRnZSxcclxuICAgICAgICAgIHR5cGU6IHR5cGUsXHJcbiAgICAgICAgICB3ZWlnaHRzOiBbXS5jb25jYXQoZWRnZS5kYXRhKGFuY2hvclBvaW50VXRpbGl0aWVzLnN5bnRheFt0eXBlXVsnd2VpZ2h0J10pKSxcclxuICAgICAgICAgIGRpc3RhbmNlczogW10uY29uY2F0KGVkZ2UuZGF0YShhbmNob3JQb2ludFV0aWxpdGllcy5zeW50YXhbdHlwZV1bJ2Rpc3RhbmNlJ10pKVxyXG4gICAgICAgIH07XHJcblxyXG4gICAgICAgIGFuY2hvclBvaW50VXRpbGl0aWVzLnJlbW92ZUFuY2hvcigpO1xyXG4gICAgICAgIFxyXG4gICAgICAgIGlmKG9wdGlvbnMoKS51bmRvYWJsZSkge1xyXG4gICAgICAgICAgY3kudW5kb1JlZG8oKS5kbygnY2hhbmdlQW5jaG9yUG9pbnRzJywgcGFyYW0pO1xyXG4gICAgICAgIH1cclxuICAgICAgICBcclxuICAgICAgICBzZXRUaW1lb3V0KGZ1bmN0aW9uKCl7cmVmcmVzaERyYXdzKCk7ZWRnZS5zZWxlY3QoKTt9LCA1MCkgO1xyXG5cclxuICAgICAgfTtcclxuXHJcbiAgICAgIHZhciBjeHRSZW1vdmVBbGxBbmNob3JzRmNuID0gZnVuY3Rpb24gKGV2ZW50KSB7XHJcbiAgICAgICAgdmFyIGVkZ2UgPSBhbmNob3JNYW5hZ2VyLmVkZ2U7XHJcbiAgICAgICAgdmFyIHR5cGUgPSBhbmNob3JQb2ludFV0aWxpdGllcy5nZXRFZGdlVHlwZShlZGdlKTtcclxuICAgICAgICB2YXIgcGFyYW0gPSB7XHJcbiAgICAgICAgICBlZGdlOiBlZGdlLFxyXG4gICAgICAgICAgdHlwZTogdHlwZSxcclxuICAgICAgICAgIHdlaWdodHM6IFtdLmNvbmNhdChlZGdlLmRhdGEoYW5jaG9yUG9pbnRVdGlsaXRpZXMuc3ludGF4W3R5cGVdWyd3ZWlnaHQnXSkpLFxyXG4gICAgICAgICAgZGlzdGFuY2VzOiBbXS5jb25jYXQoZWRnZS5kYXRhKGFuY2hvclBvaW50VXRpbGl0aWVzLnN5bnRheFt0eXBlXVsnZGlzdGFuY2UnXSkpXHJcbiAgICAgICAgfTtcclxuICAgICAgICBcclxuICAgICAgICBhbmNob3JQb2ludFV0aWxpdGllcy5yZW1vdmVBbGxBbmNob3JzKCk7XHJcblxyXG4gICAgICAgIGlmIChvcHRpb25zKCkudW5kb2FibGUpIHtcclxuICAgICAgICAgIGN5LnVuZG9SZWRvKCkuZG8oJ2NoYW5nZUFuY2hvclBvaW50cycsIHBhcmFtKTtcclxuICAgICAgICB9XHJcbiAgICAgICAgc2V0VGltZW91dChmdW5jdGlvbigpe3JlZnJlc2hEcmF3cygpO2VkZ2Uuc2VsZWN0KCk7fSwgNTApO1xyXG4gICAgICB9XHJcbiAgICAgIFxyXG4gICAgICAvLyBmdW5jdGlvbiB0byByZWNvbm5lY3QgZWRnZVxyXG4gICAgICB2YXIgaGFuZGxlUmVjb25uZWN0RWRnZSA9IG9wdHMuaGFuZGxlUmVjb25uZWN0RWRnZTtcclxuICAgICAgLy8gZnVuY3Rpb24gdG8gdmFsaWRhdGUgZWRnZSBzb3VyY2UgYW5kIHRhcmdldCBvbiByZWNvbm5lY3Rpb25cclxuICAgICAgdmFyIHZhbGlkYXRlRWRnZSA9IG9wdHMudmFsaWRhdGVFZGdlOyBcclxuICAgICAgLy8gZnVuY3Rpb24gdG8gYmUgY2FsbGVkIG9uIGludmFsaWQgZWRnZSByZWNvbm5lY3Rpb25cclxuICAgICAgdmFyIGFjdE9uVW5zdWNjZXNzZnVsUmVjb25uZWN0aW9uID0gb3B0cy5hY3RPblVuc3VjY2Vzc2Z1bFJlY29ubmVjdGlvbjtcclxuICAgICAgXHJcbiAgICAgIHZhciBtZW51SXRlbXMgPSBbXHJcbiAgICAgICAge1xyXG4gICAgICAgICAgaWQ6IGFkZEJlbmRQb2ludEN4dE1lbnVJZCxcclxuICAgICAgICAgIGNvbnRlbnQ6IG9wdHMuYWRkQmVuZE1lbnVJdGVtVGl0bGUsXHJcbiAgICAgICAgICBzZWxlY3RvcjogJ2VkZ2UnLFxyXG4gICAgICAgICAgb25DbGlja0Z1bmN0aW9uOiBjeHRBZGRCZW5kRmNuXHJcbiAgICAgICAgfSxcclxuICAgICAgICB7XHJcbiAgICAgICAgICBpZDogcmVtb3ZlQmVuZFBvaW50Q3h0TWVudUlkLFxyXG4gICAgICAgICAgY29udGVudDogb3B0cy5yZW1vdmVCZW5kTWVudUl0ZW1UaXRsZSxcclxuICAgICAgICAgIHNlbGVjdG9yOiAnZWRnZScsXHJcbiAgICAgICAgICBvbkNsaWNrRnVuY3Rpb246IGN4dFJlbW92ZUFuY2hvckZjblxyXG4gICAgICAgIH0sIFxyXG4gICAgICAgIHtcclxuICAgICAgICAgIGlkOiByZW1vdmVBbGxCZW5kUG9pbnRDdHhNZW51SWQsXHJcbiAgICAgICAgICBjb250ZW50OiBvcHRzLnJlbW92ZUFsbEJlbmRNZW51SXRlbVRpdGxlLFxyXG4gICAgICAgICAgc2VsZWN0b3I6IG9wdHMuZW5hYmxlTXVsdGlwbGVBbmNob3JSZW1vdmFsT3B0aW9uICYmICc6c2VsZWN0ZWQuZWRnZWJlbmRlZGl0aW5nLWhhc211bHRpcGxlYmVuZHBvaW50cycsXHJcbiAgICAgICAgICBvbkNsaWNrRnVuY3Rpb246IGN4dFJlbW92ZUFsbEFuY2hvcnNGY25cclxuICAgICAgICB9LFxyXG4gICAgICAgIHtcclxuICAgICAgICAgIGlkOiBhZGRDb250cm9sUG9pbnRDeHRNZW51SWQsXHJcbiAgICAgICAgICBjb250ZW50OiBvcHRzLmFkZENvbnRyb2xNZW51SXRlbVRpdGxlLFxyXG4gICAgICAgICAgc2VsZWN0b3I6ICdlZGdlJyxcclxuICAgICAgICAgIGNvcmVBc1dlbGw6IHRydWUsXHJcbiAgICAgICAgICBvbkNsaWNrRnVuY3Rpb246IGN4dEFkZENvbnRyb2xGY25cclxuICAgICAgICB9LFxyXG4gICAgICAgIHtcclxuICAgICAgICAgIGlkOiByZW1vdmVDb250cm9sUG9pbnRDeHRNZW51SWQsXHJcbiAgICAgICAgICBjb250ZW50OiBvcHRzLnJlbW92ZUNvbnRyb2xNZW51SXRlbVRpdGxlLFxyXG4gICAgICAgICAgc2VsZWN0b3I6ICdlZGdlJyxcclxuICAgICAgICAgIGNvcmVBc1dlbGw6IHRydWUsXHJcbiAgICAgICAgICBvbkNsaWNrRnVuY3Rpb246IGN4dFJlbW92ZUFuY2hvckZjblxyXG4gICAgICAgIH0sIFxyXG4gICAgICAgIHtcclxuICAgICAgICAgIGlkOiByZW1vdmVBbGxDb250cm9sUG9pbnRDdHhNZW51SWQsXHJcbiAgICAgICAgICBjb250ZW50OiBvcHRzLnJlbW92ZUFsbENvbnRyb2xNZW51SXRlbVRpdGxlLFxyXG4gICAgICAgICAgc2VsZWN0b3I6IG9wdHMuZW5hYmxlTXVsdGlwbGVBbmNob3JSZW1vdmFsT3B0aW9uICYmICc6c2VsZWN0ZWQuZWRnZWNvbnRyb2xlZGl0aW5nLWhhc211bHRpcGxlY29udHJvbHBvaW50cycsXHJcbiAgICAgICAgICBvbkNsaWNrRnVuY3Rpb246IGN4dFJlbW92ZUFsbEFuY2hvcnNGY25cclxuICAgICAgICB9LFxyXG4gICAgICBdO1xyXG4gICAgICBcclxuICAgICAgaWYoY3kuY29udGV4dE1lbnVzKSB7XHJcbiAgICAgICAgdmFyIG1lbnVzID0gY3kuY29udGV4dE1lbnVzKCdnZXQnKTtcclxuICAgICAgICAvLyBJZiBjb250ZXh0IG1lbnVzIGlzIGFjdGl2ZSBqdXN0IGFwcGVuZCBtZW51IGl0ZW1zIGVsc2UgYWN0aXZhdGUgdGhlIGV4dGVuc2lvblxyXG4gICAgICAgIC8vIHdpdGggaW5pdGlhbCBtZW51IGl0ZW1zXHJcbiAgICAgICAgaWYgKG1lbnVzLmlzQWN0aXZlKCkpIHtcclxuICAgICAgICAgIG1lbnVzLmFwcGVuZE1lbnVJdGVtcyhtZW51SXRlbXMpO1xyXG4gICAgICAgIH1cclxuICAgICAgICBlbHNlIHtcclxuICAgICAgICAgIGN5LmNvbnRleHRNZW51cyh7XHJcbiAgICAgICAgICAgIG1lbnVJdGVtczogbWVudUl0ZW1zXHJcbiAgICAgICAgICB9KTtcclxuICAgICAgICB9XHJcbiAgICAgIH1cclxuICAgICAgXHJcbiAgICAgIHZhciBfc2l6ZUNhbnZhcyA9IGRlYm91bmNlKGZ1bmN0aW9uICgpIHtcclxuICAgICAgICAkY2FudmFzRWxlbWVudFxyXG4gICAgICAgICAgLmF0dHIoJ2hlaWdodCcsICRjb250YWluZXIuaGVpZ2h0KCkpXHJcbiAgICAgICAgICAuYXR0cignd2lkdGgnLCAkY29udGFpbmVyLndpZHRoKCkpXHJcbiAgICAgICAgICAuY3NzKHtcclxuICAgICAgICAgICAgJ3Bvc2l0aW9uJzogJ2Fic29sdXRlJyxcclxuICAgICAgICAgICAgJ3RvcCc6IDAsXHJcbiAgICAgICAgICAgICdsZWZ0JzogMCxcclxuICAgICAgICAgICAgJ3otaW5kZXgnOiBvcHRpb25zKCkuekluZGV4XHJcbiAgICAgICAgICB9KVxyXG4gICAgICAgIDtcclxuXHJcbiAgICAgICAgc2V0VGltZW91dChmdW5jdGlvbiAoKSB7XHJcbiAgICAgICAgICB2YXIgY2FudmFzQmIgPSAkY2FudmFzRWxlbWVudC5vZmZzZXQoKTtcclxuICAgICAgICAgIHZhciBjb250YWluZXJCYiA9ICRjb250YWluZXIub2Zmc2V0KCk7XHJcblxyXG4gICAgICAgICAgJGNhbnZhc0VsZW1lbnRcclxuICAgICAgICAgICAgLmNzcyh7XHJcbiAgICAgICAgICAgICAgJ3RvcCc6IC0oY2FudmFzQmIudG9wIC0gY29udGFpbmVyQmIudG9wKSxcclxuICAgICAgICAgICAgICAnbGVmdCc6IC0oY2FudmFzQmIubGVmdCAtIGNvbnRhaW5lckJiLmxlZnQpXHJcbiAgICAgICAgICAgIH0pXHJcbiAgICAgICAgICA7XHJcblxyXG4gICAgICAgICAgY2FudmFzLmdldFN0YWdlKCkuc2V0V2lkdGgoJGNvbnRhaW5lci53aWR0aCgpKTtcclxuICAgICAgICAgIGNhbnZhcy5nZXRTdGFnZSgpLnNldEhlaWdodCgkY29udGFpbmVyLmhlaWdodCgpKTtcclxuXHJcbiAgICAgICAgICAvLyByZWRyYXcgb24gY2FudmFzIHJlc2l6ZVxyXG4gICAgICAgICAgaWYoY3kpe1xyXG4gICAgICAgICAgICByZWZyZXNoRHJhd3MoKTtcclxuICAgICAgICAgIH1cclxuICAgICAgICB9LCAwKTtcclxuXHJcbiAgICAgIH0sIDI1MCk7XHJcblxyXG4gICAgICBmdW5jdGlvbiBzaXplQ2FudmFzKCkge1xyXG4gICAgICAgIF9zaXplQ2FudmFzKCk7XHJcbiAgICAgIH1cclxuXHJcbiAgICAgIHNpemVDYW52YXMoKTtcclxuXHJcbiAgICAgICQod2luZG93KS5iaW5kKCdyZXNpemUnLCBmdW5jdGlvbiAoKSB7XHJcbiAgICAgICAgc2l6ZUNhbnZhcygpO1xyXG4gICAgICB9KTtcclxuICAgICAgXHJcbiAgICAgIC8vIHdyaXRlIG9wdGlvbnMgdG8gZGF0YVxyXG4gICAgICB2YXIgZGF0YSA9ICRjb250YWluZXIuZGF0YSgnY3llZGdlZWRpdGluZycpO1xyXG4gICAgICBpZiAoZGF0YSA9PSBudWxsKSB7XHJcbiAgICAgICAgZGF0YSA9IHt9O1xyXG4gICAgICB9XHJcbiAgICAgIGRhdGEub3B0aW9ucyA9IG9wdHM7XHJcblxyXG4gICAgICB2YXIgb3B0Q2FjaGU7XHJcblxyXG4gICAgICBmdW5jdGlvbiBvcHRpb25zKCkge1xyXG4gICAgICAgIHJldHVybiBvcHRDYWNoZSB8fCAob3B0Q2FjaGUgPSAkY29udGFpbmVyLmRhdGEoJ2N5ZWRnZWVkaXRpbmcnKS5vcHRpb25zKTtcclxuICAgICAgfVxyXG5cclxuICAgICAgLy8gd2Ugd2lsbCBuZWVkIHRvIGNvbnZlcnQgbW9kZWwgcG9zaXRvbnMgdG8gcmVuZGVyZWQgcG9zaXRpb25zXHJcbiAgICAgIGZ1bmN0aW9uIGNvbnZlcnRUb1JlbmRlcmVkUG9zaXRpb24obW9kZWxQb3NpdGlvbikge1xyXG4gICAgICAgIHZhciBwYW4gPSBjeS5wYW4oKTtcclxuICAgICAgICB2YXIgem9vbSA9IGN5Lnpvb20oKTtcclxuXHJcbiAgICAgICAgdmFyIHggPSBtb2RlbFBvc2l0aW9uLnggKiB6b29tICsgcGFuLng7XHJcbiAgICAgICAgdmFyIHkgPSBtb2RlbFBvc2l0aW9uLnkgKiB6b29tICsgcGFuLnk7XHJcblxyXG4gICAgICAgIHJldHVybiB7XHJcbiAgICAgICAgICB4OiB4LFxyXG4gICAgICAgICAgeTogeVxyXG4gICAgICAgIH07XHJcbiAgICAgIH1cclxuICAgICAgXHJcbiAgICAgIGZ1bmN0aW9uIHJlZnJlc2hEcmF3cygpIHtcclxuXHJcbiAgICAgICAgLy8gZG9uJ3QgY2xlYXIgYW5jaG9yIHdoaWNoIGlzIGJlaW5nIG1vdmVkXHJcbiAgICAgICAgYW5jaG9yTWFuYWdlci5jbGVhckFuY2hvcnNFeGNlcHQoYW5jaG9yTWFuYWdlci50b3VjaGVkQW5jaG9yKTtcclxuICAgICAgICBcclxuICAgICAgICBpZihlbmRwb2ludFNoYXBlMSAhPT0gbnVsbCl7XHJcbiAgICAgICAgICBlbmRwb2ludFNoYXBlMS5kZXN0cm95KCk7XHJcbiAgICAgICAgICBlbmRwb2ludFNoYXBlMSA9IG51bGw7XHJcbiAgICAgICAgfVxyXG4gICAgICAgIGlmKGVuZHBvaW50U2hhcGUyICE9PSBudWxsKXtcclxuICAgICAgICAgIGVuZHBvaW50U2hhcGUyLmRlc3Ryb3koKTtcclxuICAgICAgICAgIGVuZHBvaW50U2hhcGUyID0gbnVsbDtcclxuICAgICAgICB9XHJcbiAgICAgICAgY2FudmFzLmRyYXcoKTtcclxuXHJcbiAgICAgICAgaWYoIGVkZ2VUb0hpZ2hsaWdodCApIHtcclxuICAgICAgICAgIGFuY2hvck1hbmFnZXIucmVuZGVyQW5jaG9yU2hhcGVzKGVkZ2VUb0hpZ2hsaWdodCk7XHJcbiAgICAgICAgICByZW5kZXJFbmRQb2ludFNoYXBlcyhlZGdlVG9IaWdobGlnaHQpO1xyXG4gICAgICAgIH1cclxuICAgICAgfVxyXG4gICAgICBcclxuICAgICAgLy8gcmVuZGVyIHRoZSBlbmQgcG9pbnRzIHNoYXBlcyBvZiB0aGUgZ2l2ZW4gZWRnZVxyXG4gICAgICBmdW5jdGlvbiByZW5kZXJFbmRQb2ludFNoYXBlcyhlZGdlKSB7XHJcbiAgICAgICAgaWYoIWVkZ2Upe1xyXG4gICAgICAgICAgcmV0dXJuO1xyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgdmFyIGVkZ2VfcHRzID0gYW5jaG9yUG9pbnRVdGlsaXRpZXMuZ2V0QW5jaG9yc0FzQXJyYXkoZWRnZSk7XHJcbiAgICAgICAgaWYodHlwZW9mIGVkZ2VfcHRzID09PSAndW5kZWZpbmVkJyl7XHJcbiAgICAgICAgICBlZGdlX3B0cyA9IFtdO1xyXG4gICAgICAgIH0gICAgICAgXHJcbiAgICAgICAgdmFyIHNvdXJjZVBvcyA9IGVkZ2Uuc291cmNlRW5kcG9pbnQoKTtcclxuICAgICAgICB2YXIgdGFyZ2V0UG9zID0gZWRnZS50YXJnZXRFbmRwb2ludCgpO1xyXG4gICAgICAgIGVkZ2VfcHRzLnVuc2hpZnQoc291cmNlUG9zLnkpO1xyXG4gICAgICAgIGVkZ2VfcHRzLnVuc2hpZnQoc291cmNlUG9zLngpO1xyXG4gICAgICAgIGVkZ2VfcHRzLnB1c2godGFyZ2V0UG9zLngpO1xyXG4gICAgICAgIGVkZ2VfcHRzLnB1c2godGFyZ2V0UG9zLnkpOyBcclxuXHJcbiAgICAgICBcclxuICAgICAgICBpZighZWRnZV9wdHMpXHJcbiAgICAgICAgICByZXR1cm47XHJcblxyXG4gICAgICAgIHZhciBzcmMgPSB7XHJcbiAgICAgICAgICB4OiBlZGdlX3B0c1swXSxcclxuICAgICAgICAgIHk6IGVkZ2VfcHRzWzFdXHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICB2YXIgdGFyZ2V0ID0ge1xyXG4gICAgICAgICAgeDogZWRnZV9wdHNbZWRnZV9wdHMubGVuZ3RoLTJdLFxyXG4gICAgICAgICAgeTogZWRnZV9wdHNbZWRnZV9wdHMubGVuZ3RoLTFdXHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICB2YXIgbmV4dFRvU291cmNlID0ge1xyXG4gICAgICAgICAgeDogZWRnZV9wdHNbMl0sXHJcbiAgICAgICAgICB5OiBlZGdlX3B0c1szXVxyXG4gICAgICAgIH1cclxuICAgICAgICB2YXIgbmV4dFRvVGFyZ2V0ID0ge1xyXG4gICAgICAgICAgeDogZWRnZV9wdHNbZWRnZV9wdHMubGVuZ3RoLTRdLFxyXG4gICAgICAgICAgeTogZWRnZV9wdHNbZWRnZV9wdHMubGVuZ3RoLTNdXHJcbiAgICAgICAgfVxyXG4gICAgICAgIHZhciBsZW5ndGggPSBnZXRBbmNob3JTaGFwZXNMZW5ndGgoZWRnZSkgKiAwLjY1O1xyXG4gICAgICAgIFxyXG4gICAgICAgIHJlbmRlckVhY2hFbmRQb2ludFNoYXBlKHNyYywgdGFyZ2V0LCBsZW5ndGgsbmV4dFRvU291cmNlLG5leHRUb1RhcmdldCk7XHJcbiAgICAgICAgXHJcbiAgICAgIH1cclxuXHJcbiAgICAgIGZ1bmN0aW9uIHJlbmRlckVhY2hFbmRQb2ludFNoYXBlKHNvdXJjZSwgdGFyZ2V0LCBsZW5ndGgsbmV4dFRvU291cmNlLG5leHRUb1RhcmdldCkge1xyXG4gICAgICAgIC8vIGdldCB0aGUgdG9wIGxlZnQgY29vcmRpbmF0ZXMgb2Ygc291cmNlIGFuZCB0YXJnZXRcclxuICAgICAgICB2YXIgc1RvcExlZnRYID0gc291cmNlLnggLSBsZW5ndGggLyAyO1xyXG4gICAgICAgIHZhciBzVG9wTGVmdFkgPSBzb3VyY2UueSAtIGxlbmd0aCAvIDI7XHJcblxyXG4gICAgICAgIHZhciB0VG9wTGVmdFggPSB0YXJnZXQueCAtIGxlbmd0aCAvIDI7XHJcbiAgICAgICAgdmFyIHRUb3BMZWZ0WSA9IHRhcmdldC55IC0gbGVuZ3RoIC8gMjtcclxuXHJcbiAgICAgICAgdmFyIG5leHRUb1NvdXJjZVggPSBuZXh0VG9Tb3VyY2UueCAtIGxlbmd0aCAvMjtcclxuICAgICAgICB2YXIgbmV4dFRvU291cmNlWSA9IG5leHRUb1NvdXJjZS55IC0gbGVuZ3RoIC8gMjtcclxuXHJcbiAgICAgICAgdmFyIG5leHRUb1RhcmdldFggPSBuZXh0VG9UYXJnZXQueCAtIGxlbmd0aCAvMjtcclxuICAgICAgICB2YXIgbmV4dFRvVGFyZ2V0WSA9IG5leHRUb1RhcmdldC55IC0gbGVuZ3RoIC8yO1xyXG5cclxuXHJcbiAgICAgICAgLy8gY29udmVydCB0byByZW5kZXJlZCBwYXJhbWV0ZXJzXHJcbiAgICAgICAgdmFyIHJlbmRlcmVkU291cmNlUG9zID0gY29udmVydFRvUmVuZGVyZWRQb3NpdGlvbih7eDogc1RvcExlZnRYLCB5OiBzVG9wTGVmdFl9KTtcclxuICAgICAgICB2YXIgcmVuZGVyZWRUYXJnZXRQb3MgPSBjb252ZXJ0VG9SZW5kZXJlZFBvc2l0aW9uKHt4OiB0VG9wTGVmdFgsIHk6IHRUb3BMZWZ0WX0pO1xyXG4gICAgICAgIGxlbmd0aCA9IGxlbmd0aCAqIGN5Lnpvb20oKSAvIDI7XHJcblxyXG4gICAgICAgIHZhciByZW5kZXJlZE5leHRUb1NvdXJjZSA9IGNvbnZlcnRUb1JlbmRlcmVkUG9zaXRpb24oe3g6IG5leHRUb1NvdXJjZVgsIHk6IG5leHRUb1NvdXJjZVl9KTtcclxuICAgICAgICB2YXIgcmVuZGVyZWROZXh0VG9UYXJnZXQgPSBjb252ZXJ0VG9SZW5kZXJlZFBvc2l0aW9uKHt4OiBuZXh0VG9UYXJnZXRYLCB5OiBuZXh0VG9UYXJnZXRZfSk7XHJcbiAgICAgICAgXHJcbiAgICAgICAgLy9ob3cgZmFyIHRvIGdvIGZyb20gdGhlIG5vZGUgYWxvbmcgdGhlIGVkZ2VcclxuICAgICAgICB2YXIgZGlzdGFuY2VGcm9tTm9kZSA9IGxlbmd0aDtcclxuXHJcbiAgICAgICAgdmFyIGRpc3RhbmNlU291cmNlID0gTWF0aC5zcXJ0KE1hdGgucG93KHJlbmRlcmVkTmV4dFRvU291cmNlLnggLSByZW5kZXJlZFNvdXJjZVBvcy54LDIpICsgTWF0aC5wb3cocmVuZGVyZWROZXh0VG9Tb3VyY2UueSAtIHJlbmRlcmVkU291cmNlUG9zLnksMikpOyAgICAgICAgXHJcbiAgICAgICAgdmFyIHNvdXJjZUVuZFBvaW50WCA9IHJlbmRlcmVkU291cmNlUG9zLnggKyAoKGRpc3RhbmNlRnJvbU5vZGUvIGRpc3RhbmNlU291cmNlKSogKHJlbmRlcmVkTmV4dFRvU291cmNlLnggLSByZW5kZXJlZFNvdXJjZVBvcy54KSk7XHJcbiAgICAgICAgdmFyIHNvdXJjZUVuZFBvaW50WSA9IHJlbmRlcmVkU291cmNlUG9zLnkgKyAoKGRpc3RhbmNlRnJvbU5vZGUvIGRpc3RhbmNlU291cmNlKSogKHJlbmRlcmVkTmV4dFRvU291cmNlLnkgLSByZW5kZXJlZFNvdXJjZVBvcy55KSk7XHJcblxyXG5cclxuICAgICAgICB2YXIgZGlzdGFuY2VUYXJnZXQgPSBNYXRoLnNxcnQoTWF0aC5wb3cocmVuZGVyZWROZXh0VG9UYXJnZXQueCAtIHJlbmRlcmVkVGFyZ2V0UG9zLngsMikgKyBNYXRoLnBvdyhyZW5kZXJlZE5leHRUb1RhcmdldC55IC0gcmVuZGVyZWRUYXJnZXRQb3MueSwyKSk7ICAgICAgICBcclxuICAgICAgICB2YXIgdGFyZ2V0RW5kUG9pbnRYID0gcmVuZGVyZWRUYXJnZXRQb3MueCArICgoZGlzdGFuY2VGcm9tTm9kZS8gZGlzdGFuY2VUYXJnZXQpKiAocmVuZGVyZWROZXh0VG9UYXJnZXQueCAtIHJlbmRlcmVkVGFyZ2V0UG9zLngpKTtcclxuICAgICAgICB2YXIgdGFyZ2V0RW5kUG9pbnRZID0gcmVuZGVyZWRUYXJnZXRQb3MueSArICgoZGlzdGFuY2VGcm9tTm9kZS8gZGlzdGFuY2VUYXJnZXQpKiAocmVuZGVyZWROZXh0VG9UYXJnZXQueSAtIHJlbmRlcmVkVGFyZ2V0UG9zLnkpKTsgXHJcblxyXG4gICAgICAgIC8vIHJlbmRlciBlbmQgcG9pbnQgc2hhcGUgZm9yIHNvdXJjZSBhbmQgdGFyZ2V0XHJcbiAgICAgICAgZW5kcG9pbnRTaGFwZTEgPSBuZXcgS29udmEuQ2lyY2xlKHtcclxuICAgICAgICAgIHg6IHNvdXJjZUVuZFBvaW50WCArIGxlbmd0aCxcclxuICAgICAgICAgIHk6IHNvdXJjZUVuZFBvaW50WSArIGxlbmd0aCxcclxuICAgICAgICAgIHJhZGl1czogbGVuZ3RoLFxyXG4gICAgICAgICAgZmlsbDogJ2JsYWNrJyxcclxuICAgICAgICB9KTtcclxuXHJcbiAgICAgICAgZW5kcG9pbnRTaGFwZTIgPSBuZXcgS29udmEuQ2lyY2xlKHtcclxuICAgICAgICAgIHg6IHRhcmdldEVuZFBvaW50WCArIGxlbmd0aCxcclxuICAgICAgICAgIHk6IHRhcmdldEVuZFBvaW50WSArIGxlbmd0aCxcclxuICAgICAgICAgIHJhZGl1czogbGVuZ3RoLFxyXG4gICAgICAgICAgZmlsbDogJ2JsYWNrJyxcclxuICAgICAgICB9KTtcclxuXHJcbiAgICAgICAgY2FudmFzLmFkZChlbmRwb2ludFNoYXBlMSk7XHJcbiAgICAgICAgY2FudmFzLmFkZChlbmRwb2ludFNoYXBlMik7XHJcbiAgICAgICAgY2FudmFzLmRyYXcoKTtcclxuICAgICAgICBcclxuICAgICAgfVxyXG5cclxuICAgICAgLy8gZ2V0IHRoZSBsZW5ndGggb2YgYW5jaG9yIHBvaW50cyB0byBiZSByZW5kZXJlZFxyXG4gICAgICBmdW5jdGlvbiBnZXRBbmNob3JTaGFwZXNMZW5ndGgoZWRnZSkge1xyXG4gICAgICAgIHZhciBmYWN0b3IgPSBvcHRpb25zKCkuYW5jaG9yU2hhcGVTaXplRmFjdG9yO1xyXG4gICAgICAgIGlmIChwYXJzZUZsb2F0KGVkZ2UuY3NzKCd3aWR0aCcpKSA8PSAyLjUpXHJcbiAgICAgICAgICByZXR1cm4gMi41ICogZmFjdG9yO1xyXG4gICAgICAgIGVsc2UgcmV0dXJuIHBhcnNlRmxvYXQoZWRnZS5jc3MoJ3dpZHRoJykpKmZhY3RvcjtcclxuICAgICAgfVxyXG4gICAgICBcclxuICAgICAgLy8gY2hlY2sgaWYgdGhlIGFuY2hvciByZXByZXNlbnRlZCBieSB7eCwgeX0gaXMgaW5zaWRlIHRoZSBwb2ludCBzaGFwZVxyXG4gICAgICBmdW5jdGlvbiBjaGVja0lmSW5zaWRlU2hhcGUoeCwgeSwgbGVuZ3RoLCBjZW50ZXJYLCBjZW50ZXJZKXtcclxuICAgICAgICB2YXIgbWluWCA9IGNlbnRlclggLSBsZW5ndGggLyAyO1xyXG4gICAgICAgIHZhciBtYXhYID0gY2VudGVyWCArIGxlbmd0aCAvIDI7XHJcbiAgICAgICAgdmFyIG1pblkgPSBjZW50ZXJZIC0gbGVuZ3RoIC8gMjtcclxuICAgICAgICB2YXIgbWF4WSA9IGNlbnRlclkgKyBsZW5ndGggLyAyO1xyXG4gICAgICAgIFxyXG4gICAgICAgIHZhciBpbnNpZGUgPSAoeCA+PSBtaW5YICYmIHggPD0gbWF4WCkgJiYgKHkgPj0gbWluWSAmJiB5IDw9IG1heFkpO1xyXG4gICAgICAgIHJldHVybiBpbnNpZGU7XHJcbiAgICAgIH1cclxuXHJcbiAgICAgIC8vIGdldCB0aGUgaW5kZXggb2YgYW5jaG9yIGNvbnRhaW5pbmcgdGhlIHBvaW50IHJlcHJlc2VudGVkIGJ5IHt4LCB5fVxyXG4gICAgICBmdW5jdGlvbiBnZXRDb250YWluaW5nU2hhcGVJbmRleCh4LCB5LCBlZGdlKSB7XHJcbiAgICAgICAgdmFyIHR5cGUgPSBhbmNob3JQb2ludFV0aWxpdGllcy5nZXRFZGdlVHlwZShlZGdlKTtcclxuXHJcbiAgICAgICAgaWYodHlwZSA9PT0gJ2luY29uY2x1c2l2ZScpe1xyXG4gICAgICAgICAgcmV0dXJuIC0xO1xyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgaWYoZWRnZS5kYXRhKGFuY2hvclBvaW50VXRpbGl0aWVzLnN5bnRheFt0eXBlXVsnd2VpZ2h0J10pID09IG51bGwgfHwgXHJcbiAgICAgICAgICBlZGdlLmRhdGEoYW5jaG9yUG9pbnRVdGlsaXRpZXMuc3ludGF4W3R5cGVdWyd3ZWlnaHQnXSkubGVuZ3RoID09IDApe1xyXG4gICAgICAgICAgcmV0dXJuIC0xO1xyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgdmFyIGFuY2hvckxpc3QgPSBhbmNob3JQb2ludFV0aWxpdGllcy5nZXRBbmNob3JzQXNBcnJheShlZGdlKTsvL2VkZ2UuX3ByaXZhdGUucmRhdGEuc2VncHRzO1xyXG4gICAgICAgIHZhciBsZW5ndGggPSBnZXRBbmNob3JTaGFwZXNMZW5ndGgoZWRnZSk7XHJcblxyXG4gICAgICAgIGZvcih2YXIgaSA9IDA7IGFuY2hvckxpc3QgJiYgaSA8IGFuY2hvckxpc3QubGVuZ3RoOyBpID0gaSArIDIpe1xyXG4gICAgICAgICAgdmFyIGFuY2hvclggPSBhbmNob3JMaXN0W2ldO1xyXG4gICAgICAgICAgdmFyIGFuY2hvclkgPSBhbmNob3JMaXN0W2kgKyAxXTtcclxuXHJcbiAgICAgICAgICB2YXIgaW5zaWRlID0gY2hlY2tJZkluc2lkZVNoYXBlKHgsIHksIGxlbmd0aCwgYW5jaG9yWCwgYW5jaG9yWSk7XHJcbiAgICAgICAgICBpZihpbnNpZGUpe1xyXG4gICAgICAgICAgICByZXR1cm4gaSAvIDI7XHJcbiAgICAgICAgICB9XHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICByZXR1cm4gLTE7XHJcbiAgICAgIH07XHJcblxyXG4gICAgICBmdW5jdGlvbiBnZXRDb250YWluaW5nRW5kUG9pbnQoeCwgeSwgZWRnZSl7XHJcbiAgICAgICAgdmFyIGxlbmd0aCA9IGdldEFuY2hvclNoYXBlc0xlbmd0aChlZGdlKTtcclxuICAgICAgICB2YXIgYWxsUHRzID0gZWRnZS5fcHJpdmF0ZS5yc2NyYXRjaC5hbGxwdHM7XHJcbiAgICAgICAgdmFyIHNyYyA9IHtcclxuICAgICAgICAgIHg6IGFsbFB0c1swXSxcclxuICAgICAgICAgIHk6IGFsbFB0c1sxXVxyXG4gICAgICAgIH1cclxuICAgICAgICB2YXIgdGFyZ2V0ID0ge1xyXG4gICAgICAgICAgeDogYWxsUHRzW2FsbFB0cy5sZW5ndGgtMl0sXHJcbiAgICAgICAgICB5OiBhbGxQdHNbYWxsUHRzLmxlbmd0aC0xXVxyXG4gICAgICAgIH1cclxuICAgICAgICBjb252ZXJ0VG9SZW5kZXJlZFBvc2l0aW9uKHNyYyk7XHJcbiAgICAgICAgY29udmVydFRvUmVuZGVyZWRQb3NpdGlvbih0YXJnZXQpO1xyXG4gICAgICAgIFxyXG4gICAgICAgIC8vIFNvdXJjZTowLCBUYXJnZXQ6MSwgTm9uZTotMVxyXG4gICAgICAgIGlmKGNoZWNrSWZJbnNpZGVTaGFwZSh4LCB5LCBsZW5ndGgsIHNyYy54LCBzcmMueSkpXHJcbiAgICAgICAgICByZXR1cm4gMDtcclxuICAgICAgICBlbHNlIGlmKGNoZWNrSWZJbnNpZGVTaGFwZSh4LCB5LCBsZW5ndGgsIHRhcmdldC54LCB0YXJnZXQueSkpXHJcbiAgICAgICAgICByZXR1cm4gMTtcclxuICAgICAgICBlbHNlXHJcbiAgICAgICAgICByZXR1cm4gLTE7XHJcbiAgICAgIH1cclxuICAgICAgXHJcbiAgICAgIC8vIHN0b3JlIHRoZSBjdXJyZW50IHN0YXR1cyBvZiBnZXN0dXJlcyBhbmQgc2V0IHRoZW0gdG8gZmFsc2VcclxuICAgICAgZnVuY3Rpb24gZGlzYWJsZUdlc3R1cmVzKCkge1xyXG4gICAgICAgIGxhc3RQYW5uaW5nRW5hYmxlZCA9IGN5LnBhbm5pbmdFbmFibGVkKCk7XHJcbiAgICAgICAgbGFzdFpvb21pbmdFbmFibGVkID0gY3kuem9vbWluZ0VuYWJsZWQoKTtcclxuICAgICAgICBsYXN0Qm94U2VsZWN0aW9uRW5hYmxlZCA9IGN5LmJveFNlbGVjdGlvbkVuYWJsZWQoKTtcclxuXHJcbiAgICAgICAgY3kuem9vbWluZ0VuYWJsZWQoZmFsc2UpXHJcbiAgICAgICAgICAucGFubmluZ0VuYWJsZWQoZmFsc2UpXHJcbiAgICAgICAgICAuYm94U2VsZWN0aW9uRW5hYmxlZChmYWxzZSk7XHJcbiAgICAgIH1cclxuICAgICAgXHJcbiAgICAgIC8vIHJlc2V0IHRoZSBnZXN0dXJlcyBieSB0aGVpciBsYXRlc3Qgc3RhdHVzXHJcbiAgICAgIGZ1bmN0aW9uIHJlc2V0R2VzdHVyZXMoKSB7XHJcbiAgICAgICAgY3kuem9vbWluZ0VuYWJsZWQobGFzdFpvb21pbmdFbmFibGVkKVxyXG4gICAgICAgICAgLnBhbm5pbmdFbmFibGVkKGxhc3RQYW5uaW5nRW5hYmxlZClcclxuICAgICAgICAgIC5ib3hTZWxlY3Rpb25FbmFibGVkKGxhc3RCb3hTZWxlY3Rpb25FbmFibGVkKTtcclxuICAgICAgfVxyXG5cclxuICAgICAgZnVuY3Rpb24gdHVybk9mZkFjdGl2ZUJnQ29sb3IoKXtcclxuICAgICAgICAvLyBmb3VuZCB0aGlzIGF0IHRoZSBjeS1ub2RlLXJlc2l6ZSBjb2RlLCBidXQgZG9lc24ndCBzZWVtIHRvIGZpbmQgdGhlIG9iamVjdCBtb3N0IG9mIHRoZSB0aW1lXHJcbiAgICAgICAgaWYoIGN5LnN0eWxlKCkuX3ByaXZhdGUuY29yZVN0eWxlW1wiYWN0aXZlLWJnLW9wYWNpdHlcIl0pIHtcclxuICAgICAgICAgIGxhc3RBY3RpdmVCZ09wYWNpdHkgPSBjeS5zdHlsZSgpLl9wcml2YXRlLmNvcmVTdHlsZVtcImFjdGl2ZS1iZy1vcGFjaXR5XCJdLnZhbHVlO1xyXG4gICAgICAgIH1cclxuICAgICAgICBlbHNlIHtcclxuICAgICAgICAgIC8vIGFyYml0cmFyeSwgZmVlbCBmcmVlIHRvIGNoYW5nZVxyXG4gICAgICAgICAgLy8gdHJpYWwgYW5kIGVycm9yIHNob3dlZCB0aGF0IDAuMTUgd2FzIGNsb3Nlc3QgdG8gdGhlIG9sZCBjb2xvclxyXG4gICAgICAgICAgbGFzdEFjdGl2ZUJnT3BhY2l0eSA9IDAuMTU7XHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICBjeS5zdHlsZSgpXHJcbiAgICAgICAgICAuc2VsZWN0b3IoXCJjb3JlXCIpXHJcbiAgICAgICAgICAuc3R5bGUoXCJhY3RpdmUtYmctb3BhY2l0eVwiLCAwKVxyXG4gICAgICAgICAgLnVwZGF0ZSgpO1xyXG4gICAgICB9XHJcblxyXG4gICAgICBmdW5jdGlvbiByZXNldEFjdGl2ZUJnQ29sb3IoKXtcclxuICAgICAgICBjeS5zdHlsZSgpXHJcbiAgICAgICAgICAuc2VsZWN0b3IoXCJjb3JlXCIpXHJcbiAgICAgICAgICAuc3R5bGUoXCJhY3RpdmUtYmctb3BhY2l0eVwiLCBsYXN0QWN0aXZlQmdPcGFjaXR5KVxyXG4gICAgICAgICAgLnVwZGF0ZSgpO1xyXG4gICAgICB9XHJcblxyXG4gICAgICBmdW5jdGlvbiBtb3ZlQW5jaG9yUG9pbnRzKHBvc2l0aW9uRGlmZiwgZWRnZXMpIHtcclxuICAgICAgICAgIGVkZ2VzLmZvckVhY2goZnVuY3Rpb24oIGVkZ2UgKXtcclxuICAgICAgICAgICAgICB2YXIgcHJldmlvdXNBbmNob3JzUG9zaXRpb24gPSBhbmNob3JQb2ludFV0aWxpdGllcy5nZXRBbmNob3JzQXNBcnJheShlZGdlKTtcclxuICAgICAgICAgICAgICB2YXIgbmV4dEFuY2hvclBvaW50c1Bvc2l0aW9uID0gW107XHJcbiAgICAgICAgICAgICAgaWYgKHByZXZpb3VzQW5jaG9yc1Bvc2l0aW9uICE9IHVuZGVmaW5lZClcclxuICAgICAgICAgICAgICB7XHJcbiAgICAgICAgICAgICAgICBmb3IgKHZhciBpPTA7IGk8cHJldmlvdXNBbmNob3JzUG9zaXRpb24ubGVuZ3RoOyBpKz0yKVxyXG4gICAgICAgICAgICAgICAge1xyXG4gICAgICAgICAgICAgICAgICAgIG5leHRBbmNob3JQb2ludHNQb3NpdGlvbi5wdXNoKHt4OiBwcmV2aW91c0FuY2hvcnNQb3NpdGlvbltpXStwb3NpdGlvbkRpZmYueCwgeTogcHJldmlvdXNBbmNob3JzUG9zaXRpb25baSsxXStwb3NpdGlvbkRpZmYueX0pO1xyXG4gICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgICAgdmFyIHR5cGUgPSBhbmNob3JQb2ludFV0aWxpdGllcy5nZXRFZGdlVHlwZShlZGdlKTtcclxuXHJcbiAgICAgICAgICAgICAgICBpZihhbmNob3JQb2ludFV0aWxpdGllcy5lZGdlVHlwZUluY29uY2x1c2l2ZVNob3VsZG50SGFwcGVuKHR5cGUsIFwiVWlVdGlsaXRpZXMuanMsIG1vdmVBbmNob3JQb2ludHNcIikpe1xyXG4gICAgICAgICAgICAgICAgICByZXR1cm47XHJcbiAgICAgICAgICAgICAgICB9XHJcblxyXG4gICAgICAgICAgICAgICAgZWRnZS5kYXRhKGFuY2hvclBvaW50VXRpbGl0aWVzLnN5bnRheFt0eXBlXVsncG9pbnRQb3MnXSwgbmV4dEFuY2hvclBvaW50c1Bvc2l0aW9uKTtcclxuICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICB9KTtcclxuICAgICAgICAgIGFuY2hvclBvaW50VXRpbGl0aWVzLmluaXRBbmNob3JQb2ludHMob3B0aW9ucygpLmJlbmRQb3NpdGlvbnNGdW5jdGlvbiwgb3B0aW9ucygpLmNvbnRyb2xQb3NpdGlvbnNGdW5jdGlvbiwgZWRnZXMpO1xyXG4gICAgICAgICAgXHJcbiAgICAgICAgICAvLyBMaXN0ZW5lciBkZWZpbmVkIGluIG90aGVyIGV4dGVuc2lvblxyXG4gICAgICAgICAgLy8gTWlnaHQgaGF2ZSBjb21wYXRpYmlsaXR5IGlzc3VlcyBhZnRlciB0aGUgdW5idW5kbGVkIGJlemllclxyXG4gICAgICAgICAgY3kudHJpZ2dlcignYmVuZFBvaW50TW92ZW1lbnQnKTsgXHJcbiAgICAgIH1cclxuXHJcbiAgICAgIGZ1bmN0aW9uIG1vdmVBbmNob3JPbkRyYWcoZWRnZSwgdHlwZSwgaW5kZXgsIHBvc2l0aW9uKXtcclxuICAgICAgICB2YXIgd2VpZ2h0cyA9IGVkZ2UuZGF0YShhbmNob3JQb2ludFV0aWxpdGllcy5zeW50YXhbdHlwZV1bJ3dlaWdodCddKTtcclxuICAgICAgICB2YXIgZGlzdGFuY2VzID0gZWRnZS5kYXRhKGFuY2hvclBvaW50VXRpbGl0aWVzLnN5bnRheFt0eXBlXVsnZGlzdGFuY2UnXSk7XHJcbiAgICAgICAgXHJcbiAgICAgICAgdmFyIHJlbGF0aXZlQW5jaG9yUG9zaXRpb24gPSBhbmNob3JQb2ludFV0aWxpdGllcy5jb252ZXJ0VG9SZWxhdGl2ZVBvc2l0aW9uKGVkZ2UsIHBvc2l0aW9uKTtcclxuICAgICAgICB3ZWlnaHRzW2luZGV4XSA9IHJlbGF0aXZlQW5jaG9yUG9zaXRpb24ud2VpZ2h0O1xyXG4gICAgICAgIGRpc3RhbmNlc1tpbmRleF0gPSByZWxhdGl2ZUFuY2hvclBvc2l0aW9uLmRpc3RhbmNlO1xyXG4gICAgICAgIFxyXG4gICAgICAgIGVkZ2UuZGF0YShhbmNob3JQb2ludFV0aWxpdGllcy5zeW50YXhbdHlwZV1bJ3dlaWdodCddLCB3ZWlnaHRzKTtcclxuICAgICAgICBlZGdlLmRhdGEoYW5jaG9yUG9pbnRVdGlsaXRpZXMuc3ludGF4W3R5cGVdWydkaXN0YW5jZSddLCBkaXN0YW5jZXMpO1xyXG4gICAgICB9XHJcblxyXG4gICAgICAvLyBkZWJvdW5jZWQgZHVlIHRvIGxhcmdlIGFtb3V0IG9mIGNhbGxzIHRvIHRhcGRyYWdcclxuICAgICAgdmFyIF9tb3ZlQW5jaG9yT25EcmFnID0gZGVib3VuY2UoIG1vdmVBbmNob3JPbkRyYWcsIDUpO1xyXG5cclxuICAgICAgeyAgXHJcbiAgICAgICAgbGFzdFBhbm5pbmdFbmFibGVkID0gY3kucGFubmluZ0VuYWJsZWQoKTtcclxuICAgICAgICBsYXN0Wm9vbWluZ0VuYWJsZWQgPSBjeS56b29taW5nRW5hYmxlZCgpO1xyXG4gICAgICAgIGxhc3RCb3hTZWxlY3Rpb25FbmFibGVkID0gY3kuYm94U2VsZWN0aW9uRW5hYmxlZCgpO1xyXG4gICAgICAgIFxyXG4gICAgICAgIC8vIEluaXRpbGl6ZSB0aGUgZWRnZVRvSGlnaGxpZ2h0QmVuZHMgYW5kIG51bWJlck9mU2VsZWN0ZWRFZGdlc1xyXG4gICAgICAgIHtcclxuICAgICAgICAgIHZhciBzZWxlY3RlZEVkZ2VzID0gY3kuZWRnZXMoJzpzZWxlY3RlZCcpO1xyXG4gICAgICAgICAgdmFyIG51bWJlck9mU2VsZWN0ZWRFZGdlcyA9IHNlbGVjdGVkRWRnZXMubGVuZ3RoO1xyXG4gICAgICAgICAgXHJcbiAgICAgICAgICBpZiAoIG51bWJlck9mU2VsZWN0ZWRFZGdlcyA9PT0gMSApIHtcclxuICAgICAgICAgICAgZWRnZVRvSGlnaGxpZ2h0ID0gc2VsZWN0ZWRFZGdlc1swXTtcclxuICAgICAgICAgIH1cclxuICAgICAgICB9XHJcbiAgICAgICAgXHJcbiAgICAgICAgY3kuYmluZCgnem9vbSBwYW4nLCBlWm9vbSA9IGZ1bmN0aW9uICgpIHtcclxuICAgICAgICAgIGlmICggIWVkZ2VUb0hpZ2hsaWdodCApIHtcclxuICAgICAgICAgICAgcmV0dXJuO1xyXG4gICAgICAgICAgfVxyXG4gICAgICAgICAgXHJcbiAgICAgICAgICByZWZyZXNoRHJhd3MoKTtcclxuICAgICAgICB9KTtcclxuXHJcbiAgICAgICAgLy8gY3kub2ZmIGlzIG5ldmVyIGNhbGxlZCBvbiB0aGlzIGxpc3RlbmVyXHJcbiAgICAgICAgY3kub24oJ2RhdGEnLCAnZWRnZScsICBmdW5jdGlvbiAoKSB7XHJcbiAgICAgICAgICBpZiAoICFlZGdlVG9IaWdobGlnaHQgKSB7XHJcbiAgICAgICAgICAgIHJldHVybjtcclxuICAgICAgICAgIH1cclxuICAgICAgICAgIFxyXG4gICAgICAgICAgcmVmcmVzaERyYXdzKCk7XHJcbiAgICAgICAgfSk7XHJcblxyXG4gICAgICAgIGN5Lm9uKCdzdHlsZScsICdlZGdlLmVkZ2ViZW5kZWRpdGluZy1oYXNiZW5kcG9pbnRzOnNlbGVjdGVkLCBlZGdlLmVkZ2Vjb250cm9sZWRpdGluZy1oYXNjb250cm9scG9pbnRzOnNlbGVjdGVkJywgZVN0eWxlID0gZnVuY3Rpb24gKCkge1xyXG4gICAgICAgICAgcmVmcmVzaERyYXdzKCk7XHJcbiAgICAgICAgfSk7XHJcblxyXG4gICAgICAgIGN5Lm9uKCdyZW1vdmUnLCAnZWRnZScsIGVSZW1vdmUgPSBmdW5jdGlvbiAoKSB7XHJcbiAgICAgICAgICB2YXIgZWRnZSA9IHRoaXM7XHJcbiAgICAgICAgICBpZiAoZWRnZS5zZWxlY3RlZCgpKSB7XHJcbiAgICAgICAgICAgIG51bWJlck9mU2VsZWN0ZWRFZGdlcyA9IG51bWJlck9mU2VsZWN0ZWRFZGdlcyAtIDE7XHJcbiAgICAgICAgICAgIFxyXG4gICAgICAgICAgICBjeS5zdGFydEJhdGNoKCk7XHJcbiAgICAgICAgICAgIFxyXG4gICAgICAgICAgICBpZiAoZWRnZVRvSGlnaGxpZ2h0KSB7XHJcbiAgICAgICAgICAgICAgZWRnZVRvSGlnaGxpZ2h0LnJlbW92ZUNsYXNzKCdjeS1lZGdlLWVkaXRpbmctaGlnaGxpZ2h0Jyk7XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgXHJcbiAgICAgICAgICAgIGlmIChudW1iZXJPZlNlbGVjdGVkRWRnZXMgPT09IDEpIHtcclxuICAgICAgICAgICAgICB2YXIgc2VsZWN0ZWRFZGdlcyA9IGN5LmVkZ2VzKCc6c2VsZWN0ZWQnKTtcclxuICAgICAgICAgICAgICBcclxuICAgICAgICAgICAgICAvLyBJZiB1c2VyIHJlbW92ZXMgYWxsIHNlbGVjdGVkIGVkZ2VzIGF0IGEgc2luZ2xlIG9wZXJhdGlvbiB0aGVuIG91ciAnbnVtYmVyT2ZTZWxlY3RlZEVkZ2VzJ1xyXG4gICAgICAgICAgICAgIC8vIG1heSBiZSBtaXNsZWFkaW5nLiBUaGVyZWZvcmUgd2UgbmVlZCB0byBjaGVjayBpZiB0aGUgbnVtYmVyIG9mIGVkZ2VzIHRvIGhpZ2hsaWdodCBpcyByZWFseSAxIGhlcmUuXHJcbiAgICAgICAgICAgICAgaWYgKHNlbGVjdGVkRWRnZXMubGVuZ3RoID09PSAxKSB7XHJcbiAgICAgICAgICAgICAgICBlZGdlVG9IaWdobGlnaHQgPSBzZWxlY3RlZEVkZ2VzWzBdO1xyXG4gICAgICAgICAgICAgICAgZWRnZVRvSGlnaGxpZ2h0LmFkZENsYXNzKCdjeS1lZGdlLWVkaXRpbmctaGlnaGxpZ2h0Jyk7XHJcbiAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgIGVsc2Uge1xyXG4gICAgICAgICAgICAgICAgZWRnZVRvSGlnaGxpZ2h0ID0gdW5kZWZpbmVkO1xyXG4gICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICBlbHNlIHtcclxuICAgICAgICAgICAgICBlZGdlVG9IaWdobGlnaHQgPSB1bmRlZmluZWQ7XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgXHJcbiAgICAgICAgICAgIGN5LmVuZEJhdGNoKCk7XHJcbiAgICAgICAgICB9XHJcbiAgICAgICAgICByZWZyZXNoRHJhd3MoKTtcclxuICAgICAgICB9KTtcclxuICAgICAgICBcclxuICAgICAgICAgY3kub24oJ2FkZCcsICdlZGdlJywgZUFkZCA9IGZ1bmN0aW9uICgpIHtcclxuICAgICAgICAgIHZhciBlZGdlID0gdGhpcztcclxuICAgICAgICAgIGlmIChlZGdlLnNlbGVjdGVkKCkpIHtcclxuICAgICAgICAgICAgbnVtYmVyT2ZTZWxlY3RlZEVkZ2VzID0gbnVtYmVyT2ZTZWxlY3RlZEVkZ2VzICsgMTtcclxuICAgICAgICAgICAgXHJcbiAgICAgICAgICAgIGN5LnN0YXJ0QmF0Y2goKTtcclxuICAgICAgICAgICAgXHJcbiAgICAgICAgICAgIGlmIChlZGdlVG9IaWdobGlnaHQpIHtcclxuICAgICAgICAgICAgICBlZGdlVG9IaWdobGlnaHQucmVtb3ZlQ2xhc3MoJ2N5LWVkZ2UtZWRpdGluZy1oaWdobGlnaHQnKTtcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICBcclxuICAgICAgICAgICAgaWYgKG51bWJlck9mU2VsZWN0ZWRFZGdlcyA9PT0gMSkge1xyXG4gICAgICAgICAgICAgIGVkZ2VUb0hpZ2hsaWdodCA9IGVkZ2U7XHJcbiAgICAgICAgICAgICAgZWRnZVRvSGlnaGxpZ2h0LmFkZENsYXNzKCdjeS1lZGdlLWVkaXRpbmctaGlnaGxpZ2h0Jyk7XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgZWxzZSB7XHJcbiAgICAgICAgICAgICAgZWRnZVRvSGlnaGxpZ2h0ID0gdW5kZWZpbmVkO1xyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgICAgIFxyXG4gICAgICAgICAgICBjeS5lbmRCYXRjaCgpO1xyXG4gICAgICAgICAgfVxyXG4gICAgICAgICAgcmVmcmVzaERyYXdzKCk7XHJcbiAgICAgICAgfSk7XHJcbiAgICAgICAgXHJcbiAgICAgICAgY3kub24oJ3NlbGVjdCcsICdlZGdlJywgZVNlbGVjdCA9IGZ1bmN0aW9uICgpIHtcclxuICAgICAgICAgIHZhciBlZGdlID0gdGhpcztcclxuXHJcbiAgICAgICAgICBpZihlZGdlLnRhcmdldCgpLmNvbm5lY3RlZEVkZ2VzKCkubGVuZ3RoID09IDAgfHwgZWRnZS5zb3VyY2UoKS5jb25uZWN0ZWRFZGdlcygpLmxlbmd0aCA9PSAwKXtcclxuICAgICAgICAgICAgcmV0dXJuO1xyXG4gICAgICAgICAgfVxyXG5cclxuICAgICAgICAgXHJcbiAgICAgICAgICBudW1iZXJPZlNlbGVjdGVkRWRnZXMgPSBudW1iZXJPZlNlbGVjdGVkRWRnZXMgKyAxO1xyXG4gICAgICAgICAgXHJcbiAgICAgICAgICBjeS5zdGFydEJhdGNoKCk7XHJcbiAgICAgICAgICAgIFxyXG4gICAgICAgICAgaWYgKGVkZ2VUb0hpZ2hsaWdodCkge1xyXG4gICAgICAgICAgICBlZGdlVG9IaWdobGlnaHQucmVtb3ZlQ2xhc3MoJ2N5LWVkZ2UtZWRpdGluZy1oaWdobGlnaHQnKTtcclxuICAgICAgICAgIH1cclxuICAgICAgICAgICAgXHJcbiAgICAgICAgICBpZiAobnVtYmVyT2ZTZWxlY3RlZEVkZ2VzID09PSAxKSB7XHJcbiAgICAgICAgICAgIGVkZ2VUb0hpZ2hsaWdodCA9IGVkZ2U7XHJcbiAgICAgICAgICAgIGVkZ2VUb0hpZ2hsaWdodC5hZGRDbGFzcygnY3ktZWRnZS1lZGl0aW5nLWhpZ2hsaWdodCcpO1xyXG4gICAgICAgICAgfVxyXG4gICAgICAgICAgZWxzZSB7XHJcbiAgICAgICAgICAgIGVkZ2VUb0hpZ2hsaWdodCA9IHVuZGVmaW5lZDtcclxuICAgICAgICAgIH1cclxuICAgICAgICAgIFxyXG4gICAgICAgICAgY3kuZW5kQmF0Y2goKTtcclxuICAgICAgICAgIHJlZnJlc2hEcmF3cygpO1xyXG4gICAgICAgIH0pO1xyXG4gICAgICAgIFxyXG4gICAgICAgIGN5Lm9uKCd1bnNlbGVjdCcsICdlZGdlJywgZVVuc2VsZWN0ID0gZnVuY3Rpb24gKCkge1xyXG4gICAgICAgICAgbnVtYmVyT2ZTZWxlY3RlZEVkZ2VzID0gbnVtYmVyT2ZTZWxlY3RlZEVkZ2VzIC0gMTtcclxuICAgICAgICAgICAgXHJcbiAgICAgICAgICBjeS5zdGFydEJhdGNoKCk7XHJcbiAgICAgICAgICAgIFxyXG4gICAgICAgICAgaWYgKGVkZ2VUb0hpZ2hsaWdodCkge1xyXG4gICAgICAgICAgICBlZGdlVG9IaWdobGlnaHQucmVtb3ZlQ2xhc3MoJ2N5LWVkZ2UtZWRpdGluZy1oaWdobGlnaHQnKTtcclxuICAgICAgICAgIH1cclxuICAgICAgICAgICAgXHJcbiAgICAgICAgICBpZiAobnVtYmVyT2ZTZWxlY3RlZEVkZ2VzID09PSAxKSB7XHJcbiAgICAgICAgICAgIHZhciBzZWxlY3RlZEVkZ2VzID0gY3kuZWRnZXMoJzpzZWxlY3RlZCcpO1xyXG4gICAgICAgICAgICBcclxuICAgICAgICAgICAgLy8gSWYgdXNlciB1bnNlbGVjdHMgYWxsIGVkZ2VzIGJ5IHRhcHBpbmcgdG8gdGhlIGNvcmUgZXRjLiB0aGVuIG91ciAnbnVtYmVyT2ZTZWxlY3RlZEVkZ2VzJ1xyXG4gICAgICAgICAgICAvLyBtYXkgYmUgbWlzbGVhZGluZy4gVGhlcmVmb3JlIHdlIG5lZWQgdG8gY2hlY2sgaWYgdGhlIG51bWJlciBvZiBlZGdlcyB0byBoaWdobGlnaHQgaXMgcmVhbHkgMSBoZXJlLlxyXG4gICAgICAgICAgICBpZiAoc2VsZWN0ZWRFZGdlcy5sZW5ndGggPT09IDEpIHtcclxuICAgICAgICAgICAgICBlZGdlVG9IaWdobGlnaHQgPSBzZWxlY3RlZEVkZ2VzWzBdO1xyXG4gICAgICAgICAgICAgIGVkZ2VUb0hpZ2hsaWdodC5hZGRDbGFzcygnY3ktZWRnZS1lZGl0aW5nLWhpZ2hsaWdodCcpO1xyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgICAgIGVsc2Uge1xyXG4gICAgICAgICAgICAgIGVkZ2VUb0hpZ2hsaWdodCA9IHVuZGVmaW5lZDtcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgICAgfVxyXG4gICAgICAgICAgZWxzZSB7XHJcbiAgICAgICAgICAgIGVkZ2VUb0hpZ2hsaWdodCA9IHVuZGVmaW5lZDtcclxuICAgICAgICAgIH1cclxuICAgICAgICAgIFxyXG4gICAgICAgICAgY3kuZW5kQmF0Y2goKTtcclxuICAgICAgICAgIHJlZnJlc2hEcmF3cygpO1xyXG4gICAgICAgIH0pO1xyXG4gICAgICAgIFxyXG4gICAgICAgIHZhciBtb3ZlZEFuY2hvckluZGV4O1xyXG4gICAgICAgIHZhciB0YXBTdGFydFBvcztcclxuICAgICAgICB2YXIgbW92ZWRFZGdlO1xyXG4gICAgICAgIHZhciBtb3ZlQW5jaG9yUGFyYW07XHJcbiAgICAgICAgdmFyIGNyZWF0ZUFuY2hvck9uRHJhZztcclxuICAgICAgICB2YXIgbW92ZWRFbmRQb2ludDtcclxuICAgICAgICB2YXIgZHVtbXlOb2RlO1xyXG4gICAgICAgIHZhciBkZXRhY2hlZE5vZGU7XHJcbiAgICAgICAgdmFyIG5vZGVUb0F0dGFjaDtcclxuICAgICAgICB2YXIgYW5jaG9yQ3JlYXRlZEJ5RHJhZyA9IGZhbHNlO1xyXG5cclxuICAgICAgICBjeS5vbigndGFwc3RhcnQnLCBlVGFwU3RhcnQgPSBmdW5jdGlvbihldmVudCkge1xyXG4gICAgICAgICAgdGFwU3RhcnRQb3MgPSBldmVudC5wb3NpdGlvbiB8fCBldmVudC5jeVBvc2l0aW9uO1xyXG4gICAgICAgIH0pO1xyXG5cclxuICAgICAgICBjeS5vbigndGFwc3RhcnQnLCAnZWRnZScsIGVUYXBTdGFydE9uRWRnZSA9IGZ1bmN0aW9uIChldmVudCkge1xyXG4gICAgICAgICAgdmFyIGVkZ2UgPSB0aGlzO1xyXG5cclxuICAgICAgICAgIGlmICghZWRnZVRvSGlnaGxpZ2h0IHx8IGVkZ2VUb0hpZ2hsaWdodC5pZCgpICE9PSBlZGdlLmlkKCkpIHtcclxuICAgICAgICAgICAgY3JlYXRlQW5jaG9yT25EcmFnID0gZmFsc2U7XHJcbiAgICAgICAgICAgIHJldHVybjtcclxuICAgICAgICAgIH1cclxuICAgICAgICAgIFxyXG4gICAgICAgICAgbW92ZWRFZGdlID0gZWRnZTtcclxuXHJcbiAgICAgICAgICB2YXIgdHlwZSA9IGFuY2hvclBvaW50VXRpbGl0aWVzLmdldEVkZ2VUeXBlKGVkZ2UpO1xyXG5cclxuICAgICAgICAgIC8vIHRvIGF2b2lkIGVycm9yc1xyXG4gICAgICAgICAgaWYodHlwZSA9PT0gJ2luY29uY2x1c2l2ZScpXHJcbiAgICAgICAgICAgIHR5cGUgPSAnYmVuZCc7XHJcbiAgICAgICAgICBcclxuICAgICAgICAgIHZhciBjeVBvc1ggPSB0YXBTdGFydFBvcy54O1xyXG4gICAgICAgICAgdmFyIGN5UG9zWSA9IHRhcFN0YXJ0UG9zLnk7XHJcbiAgICAgICAgICBcclxuICAgICAgICAgIC8vIEdldCB3aGljaCBlbmQgcG9pbnQgaGFzIGJlZW4gY2xpY2tlZCAoU291cmNlOjAsIFRhcmdldDoxLCBOb25lOi0xKVxyXG4gICAgICAgICAgdmFyIGVuZFBvaW50ID0gZ2V0Q29udGFpbmluZ0VuZFBvaW50KGN5UG9zWCwgY3lQb3NZLCBlZGdlKTtcclxuXHJcbiAgICAgICAgICBpZihlbmRQb2ludCA9PSAwIHx8IGVuZFBvaW50ID09IDEpe1xyXG4gICAgICAgICAgICBlZGdlLnVuc2VsZWN0KCk7XHJcbiAgICAgICAgICAgIG1vdmVkRW5kUG9pbnQgPSBlbmRQb2ludDtcclxuICAgICAgICAgICAgZGV0YWNoZWROb2RlID0gKGVuZFBvaW50ID09IDApID8gbW92ZWRFZGdlLnNvdXJjZSgpIDogbW92ZWRFZGdlLnRhcmdldCgpO1xyXG5cclxuICAgICAgICAgICAgdmFyIGRpc2Nvbm5lY3RlZEVuZCA9IChlbmRQb2ludCA9PSAwKSA/ICdzb3VyY2UnIDogJ3RhcmdldCc7XHJcbiAgICAgICAgICAgIHZhciByZXN1bHQgPSByZWNvbm5lY3Rpb25VdGlsaXRpZXMuZGlzY29ubmVjdEVkZ2UobW92ZWRFZGdlLCBjeSwgZXZlbnQucmVuZGVyZWRQb3NpdGlvbiwgZGlzY29ubmVjdGVkRW5kKTtcclxuICAgICAgICAgICAgXHJcbiAgICAgICAgICAgIGR1bW15Tm9kZSA9IHJlc3VsdC5kdW1teU5vZGU7XHJcbiAgICAgICAgICAgIG1vdmVkRWRnZSA9IHJlc3VsdC5lZGdlO1xyXG5cclxuICAgICAgICAgICAgZGlzYWJsZUdlc3R1cmVzKCk7XHJcbiAgICAgICAgICB9XHJcbiAgICAgICAgICBlbHNlIHtcclxuICAgICAgICAgICAgbW92ZWRBbmNob3JJbmRleCA9IHVuZGVmaW5lZDtcclxuICAgICAgICAgICAgY3JlYXRlQW5jaG9yT25EcmFnID0gdHJ1ZTtcclxuICAgICAgICAgIH1cclxuICAgICAgICB9KTtcclxuICAgICAgICBcclxuICAgICAgICBjeS5vbignZHJhZycsICdub2RlJywgZURyYWcgPSBmdW5jdGlvbiAoZXZlbnQpIHtcclxuICAgICAgICAgIHZhciBub2RlID0gdGhpcztcclxuICAgICAgICAgIGN5LmVkZ2VzKCkudW5zZWxlY3QoKTtcclxuICAgICAgICAgIGlmKCFub2RlLnNlbGVjdGVkKCkpe1xyXG4gICAgICAgICAgICBjeS5ub2RlcygpLnVuc2VsZWN0KCk7XHJcbiAgICAgICAgICB9ICAgICAgICAgXHJcbiAgICAgICAgfSk7XHJcbiAgICAgICAgY3kub24oJ3RhcGRyYWcnLCBlVGFwRHJhZyA9IGZ1bmN0aW9uIChldmVudCkge1xyXG4gICAgICAgICAgLyoqIFxyXG4gICAgICAgICAgICogaWYgdGhlcmUgaXMgYSBzZWxlY3RlZCBlZGdlIHNldCBhdXRvdW5zZWxlY3RpZnkgZmFsc2VcclxuICAgICAgICAgICAqIGZpeGVzIHRoZSBub2RlLWVkaXRpbmcgcHJvYmxlbSB3aGVyZSBub2RlcyB3b3VsZCBnZXRcclxuICAgICAgICAgICAqIHVuc2VsZWN0ZWQgYWZ0ZXIgcmVzaXplIGRyYWdcclxuICAgICAgICAgICovXHJcbiAgICAgICAgICBpZiAoY3kuZWRnZXMoJzpzZWxlY3RlZCcpLmxlbmd0aCA+IDApIHtcclxuICAgICAgICAgICAgY3kuYXV0b3Vuc2VsZWN0aWZ5KGZhbHNlKTtcclxuICAgICAgICAgIH1cclxuICAgICAgICAgIHZhciBlZGdlID0gbW92ZWRFZGdlO1xyXG5cclxuICAgICAgICAgIGlmKG1vdmVkRWRnZSAhPT0gdW5kZWZpbmVkICYmIGFuY2hvclBvaW50VXRpbGl0aWVzLmlzSWdub3JlZEVkZ2UoZWRnZSkgKSB7XHJcbiAgICAgICAgICAgIHJldHVybjtcclxuICAgICAgICAgIH1cclxuXHJcbiAgICAgICAgICB2YXIgdHlwZSA9IGFuY2hvclBvaW50VXRpbGl0aWVzLmdldEVkZ2VUeXBlKGVkZ2UpO1xyXG5cclxuICAgICAgICAgIGlmKGNyZWF0ZUFuY2hvck9uRHJhZyAmJiAhYW5jaG9yVG91Y2hlZCAmJiB0eXBlICE9PSAnaW5jb25jbHVzaXZlJykge1xyXG4gICAgICAgICAgICAvLyByZW1lbWJlciBzdGF0ZSBiZWZvcmUgY3JlYXRpbmcgYW5jaG9yXHJcbiAgICAgICAgICAgIHZhciB3ZWlnaHRTdHIgPSBhbmNob3JQb2ludFV0aWxpdGllcy5zeW50YXhbdHlwZV1bJ3dlaWdodCddO1xyXG4gICAgICAgICAgICB2YXIgZGlzdGFuY2VTdHIgPSBhbmNob3JQb2ludFV0aWxpdGllcy5zeW50YXhbdHlwZV1bJ2Rpc3RhbmNlJ107XHJcblxyXG4gICAgICAgICAgICBtb3ZlQW5jaG9yUGFyYW0gPSB7XHJcbiAgICAgICAgICAgICAgZWRnZTogZWRnZSxcclxuICAgICAgICAgICAgICB0eXBlOiB0eXBlLFxyXG4gICAgICAgICAgICAgIHdlaWdodHM6IGVkZ2UuZGF0YSh3ZWlnaHRTdHIpID8gW10uY29uY2F0KGVkZ2UuZGF0YSh3ZWlnaHRTdHIpKSA6IFtdLFxyXG4gICAgICAgICAgICAgIGRpc3RhbmNlczogZWRnZS5kYXRhKGRpc3RhbmNlU3RyKSA/IFtdLmNvbmNhdChlZGdlLmRhdGEoZGlzdGFuY2VTdHIpKSA6IFtdXHJcbiAgICAgICAgICAgIH07XHJcblxyXG4gICAgICAgICAgICBlZGdlLnVuc2VsZWN0KCk7XHJcblxyXG4gICAgICAgICAgICAvLyB1c2luZyB0YXBzdGFydCBwb3NpdGlvbiBmaXhlcyBidWcgb24gcXVpY2sgZHJhZ3NcclxuICAgICAgICAgICAgLy8gLS0tIFxyXG4gICAgICAgICAgICAvLyBhbHNvIG1vZGlmaWVkIGFkZEFuY2hvclBvaW50IHRvIHJldHVybiB0aGUgaW5kZXggYmVjYXVzZVxyXG4gICAgICAgICAgICAvLyBnZXRDb250YWluaW5nU2hhcGVJbmRleCBmYWlsZWQgdG8gZmluZCB0aGUgY3JlYXRlZCBhbmNob3Igb24gcXVpY2sgZHJhZ3NcclxuICAgICAgICAgICAgbW92ZWRBbmNob3JJbmRleCA9IGFuY2hvclBvaW50VXRpbGl0aWVzLmFkZEFuY2hvclBvaW50KGVkZ2UsIHRhcFN0YXJ0UG9zKTtcclxuICAgICAgICAgICAgbW92ZWRFZGdlID0gZWRnZTtcclxuICAgICAgICAgICAgY3JlYXRlQW5jaG9yT25EcmFnID0gdW5kZWZpbmVkO1xyXG4gICAgICAgICAgICBhbmNob3JDcmVhdGVkQnlEcmFnID0gdHJ1ZTtcclxuICAgICAgICAgICAgZGlzYWJsZUdlc3R1cmVzKCk7XHJcbiAgICAgICAgICB9XHJcblxyXG4gICAgICAgICAgLy8gaWYgdGhlIHRhcHN0YXJ0IGRpZCBub3QgaGl0IGFuIGVkZ2UgYW5kIGl0IGRpZCBub3QgaGl0IGFuIGFuY2hvclxyXG4gICAgICAgICAgaWYgKCFhbmNob3JUb3VjaGVkICYmIChtb3ZlZEVkZ2UgPT09IHVuZGVmaW5lZCB8fCBcclxuICAgICAgICAgICAgKG1vdmVkQW5jaG9ySW5kZXggPT09IHVuZGVmaW5lZCAmJiBtb3ZlZEVuZFBvaW50ID09PSB1bmRlZmluZWQpKSkge1xyXG4gICAgICAgICAgICByZXR1cm47XHJcbiAgICAgICAgICB9XHJcblxyXG4gICAgICAgICAgdmFyIGV2ZW50UG9zID0gZXZlbnQucG9zaXRpb24gfHwgZXZlbnQuY3lQb3NpdGlvbjtcclxuXHJcbiAgICAgICAgICAvLyBVcGRhdGUgZW5kIHBvaW50IGxvY2F0aW9uIChTb3VyY2U6MCwgVGFyZ2V0OjEpXHJcbiAgICAgICAgICBpZihtb3ZlZEVuZFBvaW50ICE9IC0xICYmIGR1bW15Tm9kZSl7XHJcbiAgICAgICAgICAgIGR1bW15Tm9kZS5wb3NpdGlvbihldmVudFBvcyk7XHJcbiAgICAgICAgICB9XHJcbiAgICAgICAgICAvLyBjaGFuZ2UgbG9jYXRpb24gb2YgYW5jaG9yIGNyZWF0ZWQgYnkgZHJhZ1xyXG4gICAgICAgICAgZWxzZSBpZihtb3ZlZEFuY2hvckluZGV4ICE9IHVuZGVmaW5lZCl7XHJcbiAgICAgICAgICAgIF9tb3ZlQW5jaG9yT25EcmFnKGVkZ2UsIHR5cGUsIG1vdmVkQW5jaG9ySW5kZXgsIGV2ZW50UG9zKTtcclxuICAgICAgICAgIH1cclxuICAgICAgICAgIC8vIGNoYW5nZSBsb2NhdGlvbiBvZiBkcmFnIGFuZCBkcm9wcGVkIGFuY2hvclxyXG4gICAgICAgICAgZWxzZSBpZihhbmNob3JUb3VjaGVkKXtcclxuXHJcbiAgICAgICAgICAgIC8vIHRoZSB0YXBTdGFydFBvcyBjaGVjayBpcyBuZWNlc3Nhcnkgd2hlbiByaWdoIGNsaWNraW5nIGFuY2hvciBwb2ludHNcclxuICAgICAgICAgICAgLy8gcmlnaHQgY2xpY2tpbmcgYW5jaG9yIHBvaW50cyB0cmlnZ2VycyBNb3VzZURvd24gZm9yIEtvbnZhLCBidXQgbm90IHRhcHN0YXJ0IGZvciBjeVxyXG4gICAgICAgICAgICAvLyB3aGVuIHRoYXQgaGFwcGVucyB0YXBTdGFydFBvcyBpcyB1bmRlZmluZWRcclxuICAgICAgICAgICAgaWYoYW5jaG9yTWFuYWdlci50b3VjaGVkQW5jaG9ySW5kZXggPT09IHVuZGVmaW5lZCAmJiB0YXBTdGFydFBvcyl7XHJcbiAgICAgICAgICAgICAgYW5jaG9yTWFuYWdlci50b3VjaGVkQW5jaG9ySW5kZXggPSBnZXRDb250YWluaW5nU2hhcGVJbmRleChcclxuICAgICAgICAgICAgICAgIHRhcFN0YXJ0UG9zLngsIFxyXG4gICAgICAgICAgICAgICAgdGFwU3RhcnRQb3MueSxcclxuICAgICAgICAgICAgICAgIGFuY2hvck1hbmFnZXIuZWRnZSk7XHJcbiAgICAgICAgICAgIH1cclxuXHJcbiAgICAgICAgICAgIGlmKGFuY2hvck1hbmFnZXIudG91Y2hlZEFuY2hvckluZGV4ICE9PSB1bmRlZmluZWQpe1xyXG4gICAgICAgICAgICAgIF9tb3ZlQW5jaG9yT25EcmFnKFxyXG4gICAgICAgICAgICAgICAgYW5jaG9yTWFuYWdlci5lZGdlLFxyXG4gICAgICAgICAgICAgICAgYW5jaG9yTWFuYWdlci5lZGdlVHlwZSxcclxuICAgICAgICAgICAgICAgIGFuY2hvck1hbmFnZXIudG91Y2hlZEFuY2hvckluZGV4LFxyXG4gICAgICAgICAgICAgICAgZXZlbnRQb3NcclxuICAgICAgICAgICAgICApO1xyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgICB9XHJcbiAgICAgICAgICBcclxuICAgICAgICAgIGlmKGV2ZW50LnRhcmdldCAmJiBldmVudC50YXJnZXRbMF0gJiYgZXZlbnQudGFyZ2V0LmlzTm9kZSgpKXtcclxuICAgICAgICAgICAgbm9kZVRvQXR0YWNoID0gZXZlbnQudGFyZ2V0O1xyXG4gICAgICAgICAgfVxyXG5cclxuICAgICAgICB9KTtcclxuICAgICAgICBcclxuICAgICAgICBjeS5vbigndGFwZW5kJywgZVRhcEVuZCA9IGZ1bmN0aW9uIChldmVudCkge1xyXG5cclxuICAgICAgICAgIGlmKG1vdXNlT3V0KXtcclxuICAgICAgICAgICAgY2FudmFzLmdldFN0YWdlKCkuZmlyZShcImNvbnRlbnRNb3VzZXVwXCIpO1xyXG4gICAgICAgICAgfVxyXG5cclxuICAgICAgICAgIHZhciBlZGdlID0gbW92ZWRFZGdlIHx8IGFuY2hvck1hbmFnZXIuZWRnZTsgXHJcbiAgICAgICAgICBcclxuICAgICAgICAgIGlmKCBlZGdlICE9PSB1bmRlZmluZWQgKSB7XHJcbiAgICAgICAgICAgIHZhciBpbmRleCA9IGFuY2hvck1hbmFnZXIudG91Y2hlZEFuY2hvckluZGV4O1xyXG4gICAgICAgICAgICBpZiggaW5kZXggIT0gdW5kZWZpbmVkICkge1xyXG4gICAgICAgICAgICAgIHZhciBzdGFydFggPSBlZGdlLnNvdXJjZSgpLnBvc2l0aW9uKCd4Jyk7XHJcbiAgICAgICAgICAgICAgdmFyIHN0YXJ0WSA9IGVkZ2Uuc291cmNlKCkucG9zaXRpb24oJ3knKTtcclxuICAgICAgICAgICAgICB2YXIgZW5kWCA9IGVkZ2UudGFyZ2V0KCkucG9zaXRpb24oJ3gnKTtcclxuICAgICAgICAgICAgICB2YXIgZW5kWSA9IGVkZ2UudGFyZ2V0KCkucG9zaXRpb24oJ3knKTtcclxuICAgICAgICAgICAgICBcclxuICAgICAgICAgICAgICB2YXIgYW5jaG9yTGlzdCA9IGFuY2hvclBvaW50VXRpbGl0aWVzLmdldEFuY2hvcnNBc0FycmF5KGVkZ2UpO1xyXG4gICAgICAgICAgICAgIHZhciBhbGxBbmNob3JzID0gW3N0YXJ0WCwgc3RhcnRZXS5jb25jYXQoYW5jaG9yTGlzdCkuY29uY2F0KFtlbmRYLCBlbmRZXSk7XHJcbiAgICAgICAgICAgICAgXHJcbiAgICAgICAgICAgICAgdmFyIGFuY2hvckluZGV4ID0gaW5kZXggKyAxO1xyXG4gICAgICAgICAgICAgIHZhciBwcmVJbmRleCA9IGFuY2hvckluZGV4IC0gMTtcclxuICAgICAgICAgICAgICB2YXIgcG9zSW5kZXggPSBhbmNob3JJbmRleCArIDE7XHJcbiAgICAgICAgICAgICAgXHJcbiAgICAgICAgICAgICAgdmFyIGFuY2hvciA9IHtcclxuICAgICAgICAgICAgICAgIHg6IGFsbEFuY2hvcnNbMiAqIGFuY2hvckluZGV4XSxcclxuICAgICAgICAgICAgICAgIHk6IGFsbEFuY2hvcnNbMiAqIGFuY2hvckluZGV4ICsgMV1cclxuICAgICAgICAgICAgICB9O1xyXG4gICAgICAgICAgICAgIFxyXG4gICAgICAgICAgICAgIHZhciBwcmVBbmNob3JQb2ludCA9IHtcclxuICAgICAgICAgICAgICAgIHg6IGFsbEFuY2hvcnNbMiAqIHByZUluZGV4XSxcclxuICAgICAgICAgICAgICAgIHk6IGFsbEFuY2hvcnNbMiAqIHByZUluZGV4ICsgMV1cclxuICAgICAgICAgICAgICB9O1xyXG4gICAgICAgICAgICAgIFxyXG4gICAgICAgICAgICAgIHZhciBwb3NBbmNob3JQb2ludCA9IHtcclxuICAgICAgICAgICAgICAgIHg6IGFsbEFuY2hvcnNbMiAqIHBvc0luZGV4XSxcclxuICAgICAgICAgICAgICAgIHk6IGFsbEFuY2hvcnNbMiAqIHBvc0luZGV4ICsgMV1cclxuICAgICAgICAgICAgICB9O1xyXG4gICAgICAgICAgICAgIFxyXG4gICAgICAgICAgICAgIHZhciBuZWFyVG9MaW5lO1xyXG4gICAgICAgICAgICAgIFxyXG4gICAgICAgICAgICAgIGlmKCAoIGFuY2hvci54ID09PSBwcmVBbmNob3JQb2ludC54ICYmIGFuY2hvci55ID09PSBwcmVBbmNob3JQb2ludC55ICkgfHwgKCBhbmNob3IueCA9PT0gcHJlQW5jaG9yUG9pbnQueCAmJiBhbmNob3IueSA9PT0gcHJlQW5jaG9yUG9pbnQueSApICkge1xyXG4gICAgICAgICAgICAgICAgbmVhclRvTGluZSA9IHRydWU7XHJcbiAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgIGVsc2Uge1xyXG4gICAgICAgICAgICAgICAgdmFyIG0xID0gKCBwcmVBbmNob3JQb2ludC55IC0gcG9zQW5jaG9yUG9pbnQueSApIC8gKCBwcmVBbmNob3JQb2ludC54IC0gcG9zQW5jaG9yUG9pbnQueCApO1xyXG4gICAgICAgICAgICAgICAgdmFyIG0yID0gLTEgLyBtMTtcclxuXHJcbiAgICAgICAgICAgICAgICB2YXIgc3JjVGd0UG9pbnRzQW5kVGFuZ2VudHMgPSB7XHJcbiAgICAgICAgICAgICAgICAgIHNyY1BvaW50OiBwcmVBbmNob3JQb2ludCxcclxuICAgICAgICAgICAgICAgICAgdGd0UG9pbnQ6IHBvc0FuY2hvclBvaW50LFxyXG4gICAgICAgICAgICAgICAgICBtMTogbTEsXHJcbiAgICAgICAgICAgICAgICAgIG0yOiBtMlxyXG4gICAgICAgICAgICAgICAgfTtcclxuXHJcbiAgICAgICAgICAgICAgICB2YXIgY3VycmVudEludGVyc2VjdGlvbiA9IGFuY2hvclBvaW50VXRpbGl0aWVzLmdldEludGVyc2VjdGlvbihlZGdlLCBhbmNob3IsIHNyY1RndFBvaW50c0FuZFRhbmdlbnRzKTtcclxuICAgICAgICAgICAgICAgIHZhciBkaXN0ID0gTWF0aC5zcXJ0KCBNYXRoLnBvdyggKGFuY2hvci54IC0gY3VycmVudEludGVyc2VjdGlvbi54KSwgMiApIFxyXG4gICAgICAgICAgICAgICAgICAgICAgICArIE1hdGgucG93KCAoYW5jaG9yLnkgLSBjdXJyZW50SW50ZXJzZWN0aW9uLnkpLCAyICkpO1xyXG4gICAgICAgICAgICAgICAgXHJcbiAgICAgICAgICAgICAgICAvLyByZW1vdmUgdGhlIGJlbmQgcG9pbnQgaWYgc2VnbWVudCBlZGdlIGJlY29tZXMgc3RyYWlnaHRcclxuICAgICAgICAgICAgICAgIHZhciB0eXBlID0gYW5jaG9yUG9pbnRVdGlsaXRpZXMuZ2V0RWRnZVR5cGUoZWRnZSk7XHJcbiAgICAgICAgICAgICAgICBpZiggKHR5cGUgPT09ICdiZW5kJyAmJiBkaXN0ICA8IG9wdGlvbnMoKS5iZW5kUmVtb3ZhbFNlbnNpdGl2aXR5KSkge1xyXG4gICAgICAgICAgICAgICAgICBuZWFyVG9MaW5lID0gdHJ1ZTtcclxuICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICAgIFxyXG4gICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICBcclxuICAgICAgICAgICAgICBpZiggbmVhclRvTGluZSApXHJcbiAgICAgICAgICAgICAge1xyXG4gICAgICAgICAgICAgICAgYW5jaG9yUG9pbnRVdGlsaXRpZXMucmVtb3ZlQW5jaG9yKGVkZ2UsIGluZGV4KTtcclxuICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgXHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgZWxzZSBpZihkdW1teU5vZGUgIT0gdW5kZWZpbmVkICYmIChtb3ZlZEVuZFBvaW50ID09IDAgfHwgbW92ZWRFbmRQb2ludCA9PSAxKSApe1xyXG4gICAgICAgICAgICAgIFxyXG4gICAgICAgICAgICAgIHZhciBuZXdOb2RlID0gZGV0YWNoZWROb2RlO1xyXG4gICAgICAgICAgICAgIHZhciBpc1ZhbGlkID0gJ3ZhbGlkJztcclxuICAgICAgICAgICAgICB2YXIgbG9jYXRpb24gPSAobW92ZWRFbmRQb2ludCA9PSAwKSA/ICdzb3VyY2UnIDogJ3RhcmdldCc7XHJcblxyXG4gICAgICAgICAgICAgIC8vIHZhbGlkYXRlIGVkZ2UgcmVjb25uZWN0aW9uXHJcbiAgICAgICAgICAgICAgaWYobm9kZVRvQXR0YWNoKXtcclxuICAgICAgICAgICAgICAgIHZhciBuZXdTb3VyY2UgPSAobW92ZWRFbmRQb2ludCA9PSAwKSA/IG5vZGVUb0F0dGFjaCA6IGVkZ2Uuc291cmNlKCk7XHJcbiAgICAgICAgICAgICAgICB2YXIgbmV3VGFyZ2V0ID0gKG1vdmVkRW5kUG9pbnQgPT0gMSkgPyBub2RlVG9BdHRhY2ggOiBlZGdlLnRhcmdldCgpO1xyXG4gICAgICAgICAgICAgICAgaWYodHlwZW9mIHZhbGlkYXRlRWRnZSA9PT0gXCJmdW5jdGlvblwiKVxyXG4gICAgICAgICAgICAgICAgICBpc1ZhbGlkID0gdmFsaWRhdGVFZGdlKGVkZ2UsIG5ld1NvdXJjZSwgbmV3VGFyZ2V0KTtcclxuICAgICAgICAgICAgICAgIG5ld05vZGUgPSAoaXNWYWxpZCA9PT0gJ3ZhbGlkJykgPyBub2RlVG9BdHRhY2ggOiBkZXRhY2hlZE5vZGU7XHJcbiAgICAgICAgICAgICAgfVxyXG5cclxuICAgICAgICAgICAgICB2YXIgbmV3U291cmNlID0gKG1vdmVkRW5kUG9pbnQgPT0gMCkgPyBuZXdOb2RlIDogZWRnZS5zb3VyY2UoKTtcclxuICAgICAgICAgICAgICB2YXIgbmV3VGFyZ2V0ID0gKG1vdmVkRW5kUG9pbnQgPT0gMSkgPyBuZXdOb2RlIDogZWRnZS50YXJnZXQoKTtcclxuICAgICAgICAgICAgICBlZGdlID0gcmVjb25uZWN0aW9uVXRpbGl0aWVzLmNvbm5lY3RFZGdlKGVkZ2UsIGRldGFjaGVkTm9kZSwgbG9jYXRpb24pO1xyXG5cclxuICAgICAgICAgICAgICBpZihkZXRhY2hlZE5vZGUuaWQoKSAhPT0gbmV3Tm9kZS5pZCgpKXtcclxuICAgICAgICAgICAgICAgIC8vIHVzZSBnaXZlbiBoYW5kbGVSZWNvbm5lY3RFZGdlIGZ1bmN0aW9uIFxyXG4gICAgICAgICAgICAgICAgaWYodHlwZW9mIGhhbmRsZVJlY29ubmVjdEVkZ2UgPT09ICdmdW5jdGlvbicpe1xyXG4gICAgICAgICAgICAgICAgICB2YXIgcmVjb25uZWN0ZWRFZGdlID0gaGFuZGxlUmVjb25uZWN0RWRnZShuZXdTb3VyY2UuaWQoKSwgbmV3VGFyZ2V0LmlkKCksIGVkZ2UuZGF0YSgpKTtcclxuICAgICAgICAgICAgICAgICAgXHJcbiAgICAgICAgICAgICAgICAgIGlmKHJlY29ubmVjdGVkRWRnZSl7XHJcbiAgICAgICAgICAgICAgICAgICAgcmVjb25uZWN0aW9uVXRpbGl0aWVzLmNvcHlFZGdlKGVkZ2UsIHJlY29ubmVjdGVkRWRnZSk7XHJcbiAgICAgICAgICAgICAgICAgICAgYW5jaG9yUG9pbnRVdGlsaXRpZXMuaW5pdEFuY2hvclBvaW50cyhvcHRpb25zKCkuYmVuZFBvc2l0aW9uc0Z1bmN0aW9uLCBcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIG9wdGlvbnMoKS5jb250cm9sUG9zaXRpb25zRnVuY3Rpb24sIFtyZWNvbm5lY3RlZEVkZ2VdKTtcclxuICAgICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgICAgICBcclxuICAgICAgICAgICAgICAgICAgaWYocmVjb25uZWN0ZWRFZGdlICYmIG9wdGlvbnMoKS51bmRvYWJsZSl7XHJcbiAgICAgICAgICAgICAgICAgICAgdmFyIHBhcmFtcyA9IHtcclxuICAgICAgICAgICAgICAgICAgICAgIG5ld0VkZ2U6IHJlY29ubmVjdGVkRWRnZSxcclxuICAgICAgICAgICAgICAgICAgICAgIG9sZEVkZ2U6IGVkZ2VcclxuICAgICAgICAgICAgICAgICAgICB9O1xyXG4gICAgICAgICAgICAgICAgICAgIGN5LnVuZG9SZWRvKCkuZG8oJ3JlbW92ZVJlY29ubmVjdGVkRWRnZScsIHBhcmFtcyk7XHJcbiAgICAgICAgICAgICAgICAgICAgZWRnZSA9IHJlY29ubmVjdGVkRWRnZTtcclxuICAgICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgICAgICBlbHNlIGlmKHJlY29ubmVjdGVkRWRnZSl7XHJcbiAgICAgICAgICAgICAgICAgICAgY3kucmVtb3ZlKGVkZ2UpO1xyXG4gICAgICAgICAgICAgICAgICAgIGVkZ2UgPSByZWNvbm5lY3RlZEVkZ2U7XHJcbiAgICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICAgIGVsc2V7XHJcbiAgICAgICAgICAgICAgICAgIHZhciBsb2MgPSAobW92ZWRFbmRQb2ludCA9PSAwKSA/IHtzb3VyY2U6IG5ld05vZGUuaWQoKX0gOiB7dGFyZ2V0OiBuZXdOb2RlLmlkKCl9O1xyXG4gICAgICAgICAgICAgICAgICB2YXIgb2xkTG9jID0gKG1vdmVkRW5kUG9pbnQgPT0gMCkgPyB7c291cmNlOiBkZXRhY2hlZE5vZGUuaWQoKX0gOiB7dGFyZ2V0OiBkZXRhY2hlZE5vZGUuaWQoKX07XHJcbiAgICAgICAgICAgICAgICAgIFxyXG4gICAgICAgICAgICAgICAgICBpZihvcHRpb25zKCkudW5kb2FibGUgJiYgbmV3Tm9kZS5pZCgpICE9PSBkZXRhY2hlZE5vZGUuaWQoKSkge1xyXG4gICAgICAgICAgICAgICAgICAgIHZhciBwYXJhbSA9IHtcclxuICAgICAgICAgICAgICAgICAgICAgIGVkZ2U6IGVkZ2UsXHJcbiAgICAgICAgICAgICAgICAgICAgICBsb2NhdGlvbjogbG9jLFxyXG4gICAgICAgICAgICAgICAgICAgICAgb2xkTG9jOiBvbGRMb2NcclxuICAgICAgICAgICAgICAgICAgICB9O1xyXG4gICAgICAgICAgICAgICAgICAgIHZhciByZXN1bHQgPSBjeS51bmRvUmVkbygpLmRvKCdyZWNvbm5lY3RFZGdlJywgcGFyYW0pO1xyXG4gICAgICAgICAgICAgICAgICAgIGVkZ2UgPSByZXN1bHQuZWRnZTtcclxuICAgICAgICAgICAgICAgICAgICAvL2VkZ2Uuc2VsZWN0KCk7XHJcbiAgICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICAgIH0gIFxyXG4gICAgICAgICAgICAgIH1cclxuXHJcbiAgICAgICAgICAgICAgLy8gaW52YWxpZCBlZGdlIHJlY29ubmVjdGlvbiBjYWxsYmFja1xyXG4gICAgICAgICAgICAgIGlmKGlzVmFsaWQgIT09ICd2YWxpZCcgJiYgdHlwZW9mIGFjdE9uVW5zdWNjZXNzZnVsUmVjb25uZWN0aW9uID09PSAnZnVuY3Rpb24nKXtcclxuICAgICAgICAgICAgICAgIGFjdE9uVW5zdWNjZXNzZnVsUmVjb25uZWN0aW9uKCk7XHJcbiAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgIGVkZ2Uuc2VsZWN0KCk7XHJcbiAgICAgICAgICAgICAgY3kucmVtb3ZlKGR1bW15Tm9kZSk7XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICAgIH1cclxuICAgICAgICAgIHZhciB0eXBlID0gYW5jaG9yUG9pbnRVdGlsaXRpZXMuZ2V0RWRnZVR5cGUoZWRnZSk7XHJcblxyXG4gICAgICAgICAgLy8gdG8gYXZvaWQgZXJyb3JzXHJcbiAgICAgICAgICBpZih0eXBlID09PSAnaW5jb25jbHVzaXZlJyl7XHJcbiAgICAgICAgICAgIHR5cGUgPSAnYmVuZCc7XHJcbiAgICAgICAgICB9XHJcblxyXG4gICAgICAgICAgaWYoYW5jaG9yTWFuYWdlci50b3VjaGVkQW5jaG9ySW5kZXggPT09IHVuZGVmaW5lZCAmJiAhYW5jaG9yQ3JlYXRlZEJ5RHJhZyl7XHJcbiAgICAgICAgICAgIG1vdmVBbmNob3JQYXJhbSA9IHVuZGVmaW5lZDtcclxuICAgICAgICAgIH1cclxuXHJcbiAgICAgICAgICB2YXIgd2VpZ2h0U3RyID0gYW5jaG9yUG9pbnRVdGlsaXRpZXMuc3ludGF4W3R5cGVdWyd3ZWlnaHQnXTtcclxuICAgICAgICAgIGlmIChlZGdlICE9PSB1bmRlZmluZWQgJiYgbW92ZUFuY2hvclBhcmFtICE9PSB1bmRlZmluZWQgJiYgXHJcbiAgICAgICAgICAgIChlZGdlLmRhdGEod2VpZ2h0U3RyKSA/IGVkZ2UuZGF0YSh3ZWlnaHRTdHIpLnRvU3RyaW5nKCkgOiBudWxsKSAhPSBtb3ZlQW5jaG9yUGFyYW0ud2VpZ2h0cy50b1N0cmluZygpKSB7XHJcbiAgICAgICAgICAgIFxyXG4gICAgICAgICAgICAvLyBhbmNob3IgY3JlYXRlZCBmcm9tIGRyYWdcclxuICAgICAgICAgICAgaWYoYW5jaG9yQ3JlYXRlZEJ5RHJhZyl7XHJcbiAgICAgICAgICAgIGVkZ2Uuc2VsZWN0KCk7IFxyXG5cclxuICAgICAgICAgICAgLy8gc3RvcHMgdGhlIHVuYnVuZGxlZCBiZXppZXIgZWRnZXMgZnJvbSBiZWluZyB1bnNlbGVjdGVkXHJcbiAgICAgICAgICAgIGN5LmF1dG91bnNlbGVjdGlmeSh0cnVlKTtcclxuICAgICAgICAgICAgfVxyXG5cclxuICAgICAgICAgICAgaWYob3B0aW9ucygpLnVuZG9hYmxlKSB7XHJcbiAgICAgICAgICAgICAgY3kudW5kb1JlZG8oKS5kbygnY2hhbmdlQW5jaG9yUG9pbnRzJywgbW92ZUFuY2hvclBhcmFtKTtcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgICAgfVxyXG4gICAgICAgICAgXHJcbiAgICAgICAgICBtb3ZlZEFuY2hvckluZGV4ID0gdW5kZWZpbmVkO1xyXG4gICAgICAgICAgbW92ZWRFZGdlID0gdW5kZWZpbmVkO1xyXG4gICAgICAgICAgbW92ZUFuY2hvclBhcmFtID0gdW5kZWZpbmVkO1xyXG4gICAgICAgICAgY3JlYXRlQW5jaG9yT25EcmFnID0gdW5kZWZpbmVkO1xyXG4gICAgICAgICAgbW92ZWRFbmRQb2ludCA9IHVuZGVmaW5lZDtcclxuICAgICAgICAgIGR1bW15Tm9kZSA9IHVuZGVmaW5lZDtcclxuICAgICAgICAgIGRldGFjaGVkTm9kZSA9IHVuZGVmaW5lZDtcclxuICAgICAgICAgIG5vZGVUb0F0dGFjaCA9IHVuZGVmaW5lZDtcclxuICAgICAgICAgIHRhcFN0YXJ0UG9zID0gdW5kZWZpbmVkO1xyXG4gICAgICAgICAgYW5jaG9yQ3JlYXRlZEJ5RHJhZyA9IGZhbHNlO1xyXG5cclxuICAgICAgICAgIGFuY2hvck1hbmFnZXIudG91Y2hlZEFuY2hvckluZGV4ID0gdW5kZWZpbmVkOyBcclxuXHJcbiAgICAgICAgICByZXNldEdlc3R1cmVzKCk7XHJcbiAgICAgICAgICBzZXRUaW1lb3V0KGZ1bmN0aW9uKCl7cmVmcmVzaERyYXdzKCl9LCA1MCk7XHJcbiAgICAgICAgfSk7XHJcblxyXG4gICAgICAgIC8vVmFyaWFibGVzIHVzZWQgZm9yIHN0YXJ0aW5nIGFuZCBlbmRpbmcgdGhlIG1vdmVtZW50IG9mIGFuY2hvciBwb2ludHMgd2l0aCBhcnJvd3NcclxuICAgICAgICB2YXIgbW92ZWFuY2hvcnBhcmFtO1xyXG4gICAgICAgIHZhciBmaXJzdEFuY2hvcjtcclxuICAgICAgICB2YXIgZWRnZUNvbnRhaW5pbmdGaXJzdEFuY2hvcjtcclxuICAgICAgICB2YXIgZmlyc3RBbmNob3JQb2ludEZvdW5kO1xyXG4gICAgICAgIGN5Lm9uKFwiZWRnZWVkaXRpbmcubW92ZXN0YXJ0XCIsIGZ1bmN0aW9uIChlLCBlZGdlcykge1xyXG4gICAgICAgICAgICBmaXJzdEFuY2hvclBvaW50Rm91bmQgPSBmYWxzZTtcclxuICAgICAgICAgICAgaWYgKGVkZ2VzWzBdICE9IHVuZGVmaW5lZClcclxuICAgICAgICAgICAge1xyXG4gICAgICAgICAgICAgICAgZWRnZXMuZm9yRWFjaChmdW5jdGlvbiggZWRnZSApe1xyXG4gICAgICAgICAgICAgICAgICBpZiAoYW5jaG9yUG9pbnRVdGlsaXRpZXMuZ2V0QW5jaG9yc0FzQXJyYXkoZWRnZSkgIT0gdW5kZWZpbmVkICYmICFmaXJzdEFuY2hvclBvaW50Rm91bmQpXHJcbiAgICAgICAgICAgICAgICAgIHtcclxuICAgICAgICAgICAgICAgICAgICAgIGZpcnN0QW5jaG9yID0geyB4OiBhbmNob3JQb2ludFV0aWxpdGllcy5nZXRBbmNob3JzQXNBcnJheShlZGdlKVswXSwgeTogYW5jaG9yUG9pbnRVdGlsaXRpZXMuZ2V0QW5jaG9yc0FzQXJyYXkoZWRnZSlbMV19O1xyXG4gICAgICAgICAgICAgICAgICAgICAgbW92ZWFuY2hvcnBhcmFtID0ge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgIGZpcnN0VGltZTogdHJ1ZSxcclxuICAgICAgICAgICAgICAgICAgICAgICAgICBmaXJzdEFuY2hvclBvc2l0aW9uOiB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHg6IGZpcnN0QW5jaG9yLngsXHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHk6IGZpcnN0QW5jaG9yLnlcclxuICAgICAgICAgICAgICAgICAgICAgICAgICB9LFxyXG4gICAgICAgICAgICAgICAgICAgICAgICAgIGVkZ2VzOiBlZGdlc1xyXG4gICAgICAgICAgICAgICAgICAgICAgfTtcclxuICAgICAgICAgICAgICAgICAgICAgIGVkZ2VDb250YWluaW5nRmlyc3RBbmNob3IgPSBlZGdlO1xyXG4gICAgICAgICAgICAgICAgICAgICAgZmlyc3RBbmNob3JQb2ludEZvdW5kID0gdHJ1ZTtcclxuICAgICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgICAgfSk7XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICB9KTtcclxuXHJcbiAgICAgICAgY3kub24oXCJlZGdlZWRpdGluZy5tb3ZlZW5kXCIsIGZ1bmN0aW9uIChlLCBlZGdlcykge1xyXG4gICAgICAgICAgICBpZiAobW92ZWFuY2hvcnBhcmFtICE9IHVuZGVmaW5lZClcclxuICAgICAgICAgICAge1xyXG4gICAgICAgICAgICAgICAgdmFyIGluaXRpYWxQb3MgPSBtb3ZlYW5jaG9ycGFyYW0uZmlyc3RBbmNob3JQb3NpdGlvbjtcclxuICAgICAgICAgICAgICAgIHZhciBtb3ZlZEZpcnN0QW5jaG9yID0ge1xyXG4gICAgICAgICAgICAgICAgICAgIHg6IGFuY2hvclBvaW50VXRpbGl0aWVzLmdldEFuY2hvcnNBc0FycmF5KGVkZ2VDb250YWluaW5nRmlyc3RBbmNob3IpWzBdLFxyXG4gICAgICAgICAgICAgICAgICAgIHk6IGFuY2hvclBvaW50VXRpbGl0aWVzLmdldEFuY2hvcnNBc0FycmF5KGVkZ2VDb250YWluaW5nRmlyc3RBbmNob3IpWzFdXHJcbiAgICAgICAgICAgICAgICB9O1xyXG5cclxuXHJcbiAgICAgICAgICAgICAgICBtb3ZlYW5jaG9ycGFyYW0ucG9zaXRpb25EaWZmID0ge1xyXG4gICAgICAgICAgICAgICAgICAgIHg6IC1tb3ZlZEZpcnN0QW5jaG9yLnggKyBpbml0aWFsUG9zLngsXHJcbiAgICAgICAgICAgICAgICAgICAgeTogLW1vdmVkRmlyc3RBbmNob3IueSArIGluaXRpYWxQb3MueVxyXG4gICAgICAgICAgICAgICAgfVxyXG5cclxuICAgICAgICAgICAgICAgIGRlbGV0ZSBtb3ZlYW5jaG9ycGFyYW0uZmlyc3RBbmNob3JQb3NpdGlvbjtcclxuXHJcbiAgICAgICAgICAgICAgICBpZihvcHRpb25zKCkudW5kb2FibGUpIHtcclxuICAgICAgICAgICAgICAgICAgICBjeS51bmRvUmVkbygpLmRvKFwibW92ZUFuY2hvclBvaW50c1wiLCBtb3ZlYW5jaG9ycGFyYW0pO1xyXG4gICAgICAgICAgICAgICAgfVxyXG5cclxuICAgICAgICAgICAgICAgIG1vdmVhbmNob3JwYXJhbSA9IHVuZGVmaW5lZDtcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgIH0pO1xyXG5cclxuICAgICAgICBjeS5vbignY3h0dGFwJywgZUN4dFRhcCA9IGZ1bmN0aW9uIChldmVudCkge1xyXG4gICAgICAgICAgdmFyIHRhcmdldCA9IGV2ZW50LnRhcmdldCB8fCBldmVudC5jeVRhcmdldDtcclxuICAgICAgICAgIHZhciB0YXJnZXRJc0VkZ2UgPSBmYWxzZTtcclxuXHJcbiAgICAgICAgICB0cnl7XHJcbiAgICAgICAgICAgIHRhcmdldElzRWRnZSA9IHRhcmdldC5pc0VkZ2UoKTtcclxuICAgICAgICAgIH1cclxuICAgICAgICAgIGNhdGNoKGVycil7XHJcbiAgICAgICAgICAgIC8vIHRoaXMgaXMgaGVyZSBqdXN0IHRvIHN1cHByZXNzIHRoZSBlcnJvclxyXG4gICAgICAgICAgfVxyXG5cclxuICAgICAgICAgIHZhciBlZGdlLCB0eXBlO1xyXG4gICAgICAgICAgaWYodGFyZ2V0SXNFZGdlKXtcclxuICAgICAgICAgICAgZWRnZSA9IHRhcmdldDtcclxuICAgICAgICAgICAgdHlwZSA9IGFuY2hvclBvaW50VXRpbGl0aWVzLmdldEVkZ2VUeXBlKGVkZ2UpO1xyXG4gICAgICAgICAgfVxyXG4gICAgICAgICAgZWxzZXtcclxuICAgICAgICAgICAgZWRnZSA9IGFuY2hvck1hbmFnZXIuZWRnZTsgICAgICAgICAgXHJcbiAgICAgICAgICAgIHR5cGUgPSBhbmNob3JNYW5hZ2VyLmVkZ2VUeXBlO1xyXG4gICAgICAgICAgfVxyXG5cclxuICAgICAgICAgIHZhciBtZW51cyA9IGN5LmNvbnRleHRNZW51cygnZ2V0Jyk7IC8vIGdldCBjb250ZXh0IG1lbnVzIGluc3RhbmNlXHJcbiAgICAgICAgICBcclxuICAgICAgICAgIGlmKCFlZGdlVG9IaWdobGlnaHQgfHwgZWRnZVRvSGlnaGxpZ2h0LmlkKCkgIT0gZWRnZS5pZCgpIHx8IGFuY2hvclBvaW50VXRpbGl0aWVzLmlzSWdub3JlZEVkZ2UoZWRnZSkgfHxcclxuICAgICAgICAgICAgICBlZGdlVG9IaWdobGlnaHQgIT09IGVkZ2UpIHtcclxuICAgICAgICAgICAgbWVudXMuaGlkZU1lbnVJdGVtKHJlbW92ZUJlbmRQb2ludEN4dE1lbnVJZCk7XHJcbiAgICAgICAgICAgIG1lbnVzLmhpZGVNZW51SXRlbShhZGRCZW5kUG9pbnRDeHRNZW51SWQpO1xyXG4gICAgICAgICAgICBtZW51cy5oaWRlTWVudUl0ZW0ocmVtb3ZlQ29udHJvbFBvaW50Q3h0TWVudUlkKTtcclxuICAgICAgICAgICAgbWVudXMuaGlkZU1lbnVJdGVtKGFkZENvbnRyb2xQb2ludEN4dE1lbnVJZCk7XHJcbiAgICAgICAgICAgIHJldHVybjtcclxuICAgICAgICAgIH1cclxuXHJcbiAgICAgICAgICB2YXIgY3lQb3MgPSBldmVudC5wb3NpdGlvbiB8fCBldmVudC5jeVBvc2l0aW9uO1xyXG4gICAgICAgICAgdmFyIHNlbGVjdGVkSW5kZXggPSBnZXRDb250YWluaW5nU2hhcGVJbmRleChjeVBvcy54LCBjeVBvcy55LCBlZGdlKTtcclxuICAgICAgICAgIC8vIG5vdCBjbGlja2VkIG9uIGFuIGFuY2hvclxyXG4gICAgICAgICAgaWYgKHNlbGVjdGVkSW5kZXggPT0gLTEpIHtcclxuICAgICAgICAgICAgbWVudXMuaGlkZU1lbnVJdGVtKHJlbW92ZUJlbmRQb2ludEN4dE1lbnVJZCk7XHJcbiAgICAgICAgICAgIG1lbnVzLmhpZGVNZW51SXRlbShyZW1vdmVDb250cm9sUG9pbnRDeHRNZW51SWQpO1xyXG4gICAgICAgICAgICBpZih0eXBlID09PSAnY29udHJvbCcgJiYgdGFyZ2V0SXNFZGdlKXtcclxuICAgICAgICAgICAgICBtZW51cy5zaG93TWVudUl0ZW0oYWRkQ29udHJvbFBvaW50Q3h0TWVudUlkKTtcclxuICAgICAgICAgICAgICBtZW51cy5oaWRlTWVudUl0ZW0oYWRkQmVuZFBvaW50Q3h0TWVudUlkKTtcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICBlbHNlIGlmKHR5cGUgPT09ICdiZW5kJyAmJiB0YXJnZXRJc0VkZ2Upe1xyXG4gICAgICAgICAgICAgIG1lbnVzLnNob3dNZW51SXRlbShhZGRCZW5kUG9pbnRDeHRNZW51SWQpO1xyXG4gICAgICAgICAgICAgIG1lbnVzLmhpZGVNZW51SXRlbShhZGRDb250cm9sUG9pbnRDeHRNZW51SWQpO1xyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgICAgIGVsc2UgaWYgKHRhcmdldElzRWRnZSl7XHJcbiAgICAgICAgICAgICAgbWVudXMuc2hvd01lbnVJdGVtKGFkZEJlbmRQb2ludEN4dE1lbnVJZCk7XHJcbiAgICAgICAgICAgICAgbWVudXMuc2hvd01lbnVJdGVtKGFkZENvbnRyb2xQb2ludEN4dE1lbnVJZCk7XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgZWxzZSB7XHJcbiAgICAgICAgICAgICAgbWVudXMuaGlkZU1lbnVJdGVtKGFkZEJlbmRQb2ludEN4dE1lbnVJZCk7XHJcbiAgICAgICAgICAgICAgbWVudXMuaGlkZU1lbnVJdGVtKGFkZENvbnRyb2xQb2ludEN4dE1lbnVJZCk7XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgYW5jaG9yUG9pbnRVdGlsaXRpZXMuY3VycmVudEN0eFBvcyA9IGN5UG9zO1xyXG4gICAgICAgICAgfVxyXG4gICAgICAgICAgLy8gY2xpY2tlZCBvbiBhbiBhbmNob3JcclxuICAgICAgICAgIGVsc2Uge1xyXG4gICAgICAgICAgICBtZW51cy5oaWRlTWVudUl0ZW0oYWRkQmVuZFBvaW50Q3h0TWVudUlkKTtcclxuICAgICAgICAgICAgbWVudXMuaGlkZU1lbnVJdGVtKGFkZENvbnRyb2xQb2ludEN4dE1lbnVJZCk7XHJcbiAgICAgICAgICAgIGlmKHR5cGUgPT09ICdjb250cm9sJyl7XHJcbiAgICAgICAgICAgICAgbWVudXMuc2hvd01lbnVJdGVtKHJlbW92ZUNvbnRyb2xQb2ludEN4dE1lbnVJZCk7XHJcbiAgICAgICAgICAgICAgbWVudXMuaGlkZU1lbnVJdGVtKHJlbW92ZUJlbmRQb2ludEN4dE1lbnVJZCk7XHJcbiAgICAgICAgICAgICAgaWYgKG9wdHMuZW5hYmxlTXVsdGlwbGVBbmNob3JSZW1vdmFsT3B0aW9uICYmIFxyXG4gICAgICAgICAgICAgICAgICBlZGdlLmhhc0NsYXNzKCdlZGdlY29udHJvbGVkaXRpbmctaGFzbXVsdGlwbGVjb250cm9scG9pbnRzJykpIHtcclxuICAgICAgICAgICAgICAgIG1lbnVzLnNob3dNZW51SXRlbShyZW1vdmVBbGxDb250cm9sUG9pbnRDdHhNZW51SWQpO1xyXG4gICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICBlbHNlIGlmKHR5cGUgPT09ICdiZW5kJyl7XHJcbiAgICAgICAgICAgICAgbWVudXMuc2hvd01lbnVJdGVtKHJlbW92ZUJlbmRQb2ludEN4dE1lbnVJZCk7XHJcbiAgICAgICAgICAgICAgbWVudXMuaGlkZU1lbnVJdGVtKHJlbW92ZUNvbnRyb2xQb2ludEN4dE1lbnVJZCk7XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgZWxzZXtcclxuICAgICAgICAgICAgICBtZW51cy5oaWRlTWVudUl0ZW0ocmVtb3ZlQmVuZFBvaW50Q3h0TWVudUlkKTtcclxuICAgICAgICAgICAgICBtZW51cy5oaWRlTWVudUl0ZW0ocmVtb3ZlQ29udHJvbFBvaW50Q3h0TWVudUlkKTtcclxuICAgICAgICAgICAgICBtZW51cy5oaWRlTWVudUl0ZW0ocmVtb3ZlQWxsQ29udHJvbFBvaW50Q3R4TWVudUlkKTtcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICBhbmNob3JQb2ludFV0aWxpdGllcy5jdXJyZW50QW5jaG9ySW5kZXggPSBzZWxlY3RlZEluZGV4O1xyXG4gICAgICAgICAgfVxyXG5cclxuICAgICAgICAgIGFuY2hvclBvaW50VXRpbGl0aWVzLmN1cnJlbnRDdHhFZGdlID0gZWRnZTtcclxuICAgICAgICB9KTtcclxuICAgICAgICBcclxuICAgICAgICBjeS5vbignY3llZGdlZWRpdGluZy5jaGFuZ2VBbmNob3JQb2ludHMnLCAnZWRnZScsIGZ1bmN0aW9uKCkge1xyXG4gICAgICAgICAgdmFyIGVkZ2UgPSB0aGlzO1xyXG4gICAgICAgICAgY3kuc3RhcnRCYXRjaCgpO1xyXG4gICAgICAgICAgY3kuZWRnZXMoKS51bnNlbGVjdCgpOyBcclxuICAgICAgICAgICAgICAgICAgICBcclxuICAgICAgICAgIC8vIExpc3RlbmVyIGRlZmluZWQgaW4gb3RoZXIgZXh0ZW5zaW9uXHJcbiAgICAgICAgICAvLyBNaWdodCBoYXZlIGNvbXBhdGliaWxpdHkgaXNzdWVzIGFmdGVyIHRoZSB1bmJ1bmRsZWQgYmV6aWVyICAgIFxyXG4gICAgICAgICAgY3kudHJpZ2dlcignYmVuZFBvaW50TW92ZW1lbnQnKTsgICAgXHJcbiAgICAgICAgICBcclxuICAgICAgICAgIGN5LmVuZEJhdGNoKCk7ICAgICAgICAgIFxyXG4gICAgICAgICAgcmVmcmVzaERyYXdzKCk7XHJcbiAgICAgICAgXHJcbiAgICAgICAgICBcclxuICAgICAgICB9KTtcclxuICAgICAgfVxyXG5cclxuICAgICAgdmFyIHNlbGVjdGVkRWRnZXM7XHJcbiAgICAgIHZhciBhbmNob3JzTW92aW5nID0gZmFsc2U7XHJcblxyXG4gICAgICAvLyB0cmFjayBhcnJvdyBrZXkgcHJlc3NlcywgZGVmYXVsdCBmYWxzZVxyXG4gICAgICAvLyBldmVudC5rZXlDb2RlIG5vcm1hbGx5IHJldHVybnMgbnVtYmVyXHJcbiAgICAgIC8vIGJ1dCBKUyB3aWxsIGNvbnZlcnQgdG8gc3RyaW5nIGFueXdheVxyXG4gICAgICB2YXIga2V5cyA9IHtcclxuICAgICAgICAnMzcnOiBmYWxzZSxcclxuICAgICAgICAnMzgnOiBmYWxzZSxcclxuICAgICAgICAnMzknOiBmYWxzZSxcclxuICAgICAgICAnNDAnOiBmYWxzZVxyXG4gICAgICB9O1xyXG5cclxuICAgICAgZnVuY3Rpb24ga2V5RG93bihlKSB7XHJcblxyXG4gICAgICAgICAgdmFyIHNob3VsZE1vdmUgPSB0eXBlb2Ygb3B0aW9ucygpLm1vdmVTZWxlY3RlZEFuY2hvcnNPbktleUV2ZW50cyA9PT0gJ2Z1bmN0aW9uJ1xyXG4gICAgICAgICAgICAgID8gb3B0aW9ucygpLm1vdmVTZWxlY3RlZEFuY2hvcnNPbktleUV2ZW50cygpIDogb3B0aW9ucygpLm1vdmVTZWxlY3RlZEFuY2hvcnNPbktleUV2ZW50cztcclxuXHJcbiAgICAgICAgICBpZiAoIXNob3VsZE1vdmUpIHtcclxuICAgICAgICAgICAgICByZXR1cm47XHJcbiAgICAgICAgICB9XHJcblxyXG4gICAgICAgICAgLy9DaGVja3MgaWYgdGhlIHRhZ25hbWUgaXMgdGV4dGFyZWEgb3IgaW5wdXRcclxuICAgICAgICAgIHZhciB0biA9IGRvY3VtZW50LmFjdGl2ZUVsZW1lbnQudGFnTmFtZTtcclxuICAgICAgICAgIGlmICh0biAhPSBcIlRFWFRBUkVBXCIgJiYgdG4gIT0gXCJJTlBVVFwiKVxyXG4gICAgICAgICAge1xyXG4gICAgICAgICAgICAgIHN3aXRjaChlLmtleUNvZGUpe1xyXG4gICAgICAgICAgICAgICAgICBjYXNlIDM3OiBjYXNlIDM5OiBjYXNlIDM4OiAgY2FzZSA0MDogLy8gQXJyb3cga2V5c1xyXG4gICAgICAgICAgICAgICAgICBjYXNlIDMyOiBlLnByZXZlbnREZWZhdWx0KCk7IGJyZWFrOyAvLyBTcGFjZVxyXG4gICAgICAgICAgICAgICAgICBkZWZhdWx0OiBicmVhazsgLy8gZG8gbm90IGJsb2NrIG90aGVyIGtleXNcclxuICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgaWYgKGUua2V5Q29kZSA8ICczNycgfHwgZS5rZXlDb2RlID4gJzQwJykge1xyXG4gICAgICAgICAgICAgICAgICByZXR1cm47XHJcbiAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgIGtleXNbZS5rZXlDb2RlXSA9IHRydWU7XHJcblxyXG4gICAgICAgICAgICAgIC8vQ2hlY2tzIGlmIG9ubHkgZWRnZXMgYXJlIHNlbGVjdGVkIChub3QgYW55IG5vZGUpIGFuZCBpZiBvbmx5IDEgZWRnZSBpcyBzZWxlY3RlZFxyXG4gICAgICAgICAgICAgIC8vSWYgdGhlIHNlY29uZCBjaGVja2luZyBpcyByZW1vdmVkIHRoZSBhbmNob3JzIG9mIG11bHRpcGxlIGVkZ2VzIHdvdWxkIG1vdmVcclxuICAgICAgICAgICAgICBpZiAoY3kuZWRnZXMoXCI6c2VsZWN0ZWRcIikubGVuZ3RoICE9IGN5LmVsZW1lbnRzKFwiOnNlbGVjdGVkXCIpLmxlbmd0aCB8fCBjeS5lZGdlcyhcIjpzZWxlY3RlZFwiKS5sZW5ndGggIT0gMSlcclxuICAgICAgICAgICAgICB7XHJcbiAgICAgICAgICAgICAgICByZXR1cm47XHJcbiAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgIGlmICghYW5jaG9yc01vdmluZylcclxuICAgICAgICAgICAgICB7XHJcbiAgICAgICAgICAgICAgICAgIHNlbGVjdGVkRWRnZXMgPSBjeS5lZGdlcygnOnNlbGVjdGVkJyk7XHJcbiAgICAgICAgICAgICAgICAgIGN5LnRyaWdnZXIoXCJlZGdlZWRpdGluZy5tb3Zlc3RhcnRcIiwgW3NlbGVjdGVkRWRnZXNdKTtcclxuICAgICAgICAgICAgICAgICAgYW5jaG9yc01vdmluZyA9IHRydWU7XHJcbiAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgIHZhciBtb3ZlU3BlZWQgPSAzO1xyXG4gICAgICAgICAgICAgICAgICAgIFxyXG4gICAgICAgICAgICAgIC8vIGRvZXNuJ3QgbWFrZSBzZW5zZSBpZiBhbHQgYW5kIHNoaWZ0IGJvdGggcHJlc3NlZFxyXG4gICAgICAgICAgICAgIGlmKGUuYWx0S2V5ICYmIGUuc2hpZnRLZXkpIHtcclxuICAgICAgICAgICAgICAgIHJldHVybjtcclxuICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgZWxzZSBpZiAoZS5hbHRLZXkpIHtcclxuICAgICAgICAgICAgICAgIG1vdmVTcGVlZCA9IDE7XHJcbiAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgIGVsc2UgaWYgKGUuc2hpZnRLZXkpIHtcclxuICAgICAgICAgICAgICAgIG1vdmVTcGVlZCA9IDEwO1xyXG4gICAgICAgICAgICAgIH1cclxuXHJcbiAgICAgICAgICAgICAgdmFyIHVwQXJyb3dDb2RlID0gMzg7XHJcbiAgICAgICAgICAgICAgdmFyIGRvd25BcnJvd0NvZGUgPSA0MDtcclxuICAgICAgICAgICAgICB2YXIgbGVmdEFycm93Q29kZSA9IDM3O1xyXG4gICAgICAgICAgICAgIHZhciByaWdodEFycm93Q29kZSA9IDM5O1xyXG5cclxuICAgICAgICAgICAgICB2YXIgZHggPSAwO1xyXG4gICAgICAgICAgICAgIHZhciBkeSA9IDA7XHJcblxyXG4gICAgICAgICAgICAgIGR4ICs9IGtleXNbcmlnaHRBcnJvd0NvZGVdID8gbW92ZVNwZWVkIDogMDtcclxuICAgICAgICAgICAgICBkeCAtPSBrZXlzW2xlZnRBcnJvd0NvZGVdID8gbW92ZVNwZWVkIDogMDtcclxuICAgICAgICAgICAgICBkeSArPSBrZXlzW2Rvd25BcnJvd0NvZGVdID8gbW92ZVNwZWVkIDogMDtcclxuICAgICAgICAgICAgICBkeSAtPSBrZXlzW3VwQXJyb3dDb2RlXSA/IG1vdmVTcGVlZCA6IDA7XHJcblxyXG4gICAgICAgICAgICAgIG1vdmVBbmNob3JQb2ludHMoe3g6ZHgsIHk6ZHl9LCBzZWxlY3RlZEVkZ2VzKTtcclxuICAgICAgICAgIH1cclxuICAgICAgfVxyXG4gICAgICBmdW5jdGlvbiBrZXlVcChlKSB7XHJcblxyXG4gICAgICAgICAgaWYgKGUua2V5Q29kZSA8ICczNycgfHwgZS5rZXlDb2RlID4gJzQwJykge1xyXG4gICAgICAgICAgICAgIHJldHVybjtcclxuICAgICAgICAgIH1cclxuICAgICAgICAgIGUucHJldmVudERlZmF1bHQoKTtcclxuICAgICAgICAgIGtleXNbZS5rZXlDb2RlXSA9IGZhbHNlO1xyXG4gICAgICAgICAgdmFyIHNob3VsZE1vdmUgPSB0eXBlb2Ygb3B0aW9ucygpLm1vdmVTZWxlY3RlZEFuY2hvcnNPbktleUV2ZW50cyA9PT0gJ2Z1bmN0aW9uJ1xyXG4gICAgICAgICAgICAgID8gb3B0aW9ucygpLm1vdmVTZWxlY3RlZEFuY2hvcnNPbktleUV2ZW50cygpIDogb3B0aW9ucygpLm1vdmVTZWxlY3RlZEFuY2hvcnNPbktleUV2ZW50cztcclxuXHJcbiAgICAgICAgICBpZiAoIXNob3VsZE1vdmUpIHtcclxuICAgICAgICAgICAgICByZXR1cm47XHJcbiAgICAgICAgICB9XHJcblxyXG4gICAgICAgICAgY3kudHJpZ2dlcihcImVkZ2VlZGl0aW5nLm1vdmVlbmRcIiwgW3NlbGVjdGVkRWRnZXNdKTtcclxuICAgICAgICAgIHNlbGVjdGVkRWRnZXMgPSB1bmRlZmluZWQ7XHJcbiAgICAgICAgICBhbmNob3JzTW92aW5nID0gZmFsc2U7XHJcblxyXG4gICAgICB9XHJcbiAgICAgIGRvY3VtZW50LmFkZEV2ZW50TGlzdGVuZXIoXCJrZXlkb3duXCIsa2V5RG93biwgdHJ1ZSk7XHJcbiAgICAgIGRvY3VtZW50LmFkZEV2ZW50TGlzdGVuZXIoXCJrZXl1cFwiLGtleVVwLCB0cnVlKTtcclxuXHJcbiAgICAgICRjb250YWluZXIuZGF0YSgnY3llZGdlZWRpdGluZycsIGRhdGEpO1xyXG4gICAgfSxcclxuICAgIHVuYmluZDogZnVuY3Rpb24gKCkge1xyXG4gICAgICAgIGN5Lm9mZigncmVtb3ZlJywgJ25vZGUnLCBlUmVtb3ZlKVxyXG4gICAgICAgICAgLm9mZignYWRkJywgJ25vZGUnLCBlQWRkKVxyXG4gICAgICAgICAgLm9mZignc3R5bGUnLCAnZWRnZS5lZGdlYmVuZGVkaXRpbmctaGFzYmVuZHBvaW50czpzZWxlY3RlZCwgZWRnZS5lZGdlY29udHJvbGVkaXRpbmctaGFzY29udHJvbHBvaW50czpzZWxlY3RlZCcsIGVTdHlsZSlcclxuICAgICAgICAgIC5vZmYoJ3NlbGVjdCcsICdlZGdlJywgZVNlbGVjdClcclxuICAgICAgICAgIC5vZmYoJ3Vuc2VsZWN0JywgJ2VkZ2UnLCBlVW5zZWxlY3QpXHJcbiAgICAgICAgICAub2ZmKCd0YXBzdGFydCcsIGVUYXBTdGFydClcclxuICAgICAgICAgIC5vZmYoJ3RhcHN0YXJ0JywgJ2VkZ2UnLCBlVGFwU3RhcnRPbkVkZ2UpXHJcbiAgICAgICAgICAub2ZmKCd0YXBkcmFnJywgZVRhcERyYWcpXHJcbiAgICAgICAgICAub2ZmKCd0YXBlbmQnLCBlVGFwRW5kKVxyXG4gICAgICAgICAgLm9mZignY3h0dGFwJywgZUN4dFRhcClcclxuICAgICAgICAgIC5vZmYoJ2RyYWcnLCAnbm9kZScsZURyYWcpO1xyXG5cclxuICAgICAgICBjeS51bmJpbmQoXCJ6b29tIHBhblwiLCBlWm9vbSk7XHJcbiAgICB9XHJcbiAgfTtcclxuXHJcbiAgaWYgKGZ1bmN0aW9uc1tmbl0pIHtcclxuICAgIHJldHVybiBmdW5jdGlvbnNbZm5dLmFwcGx5KCQoY3kuY29udGFpbmVyKCkpLCBBcnJheS5wcm90b3R5cGUuc2xpY2UuY2FsbChhcmd1bWVudHMsIDEpKTtcclxuICB9IGVsc2UgaWYgKHR5cGVvZiBmbiA9PSAnb2JqZWN0JyB8fCAhZm4pIHtcclxuICAgIHJldHVybiBmdW5jdGlvbnMuaW5pdC5hcHBseSgkKGN5LmNvbnRhaW5lcigpKSwgYXJndW1lbnRzKTtcclxuICB9IGVsc2Uge1xyXG4gICAgJC5lcnJvcignTm8gc3VjaCBmdW5jdGlvbiBgJyArIGZuICsgJ2AgZm9yIGN5dG9zY2FwZS5qcy1lZGdlLWVkaXRpbmcnKTtcclxuICB9XHJcblxyXG4gIHJldHVybiAkKHRoaXMpO1xyXG59O1xyXG4iLCJ2YXIgcmVjb25uZWN0aW9uVXRpbGl0aWVzID0ge1xyXG5cclxuICAgIC8vIGNyZWF0ZXMgYW5kIHJldHVybnMgYSBkdW1teSBub2RlIHdoaWNoIGlzIGNvbm5lY3RlZCB0byB0aGUgZGlzY29ubmVjdGVkIGVkZ2VcclxuICAgIGRpc2Nvbm5lY3RFZGdlOiBmdW5jdGlvbiAoZWRnZSwgY3ksIHBvc2l0aW9uLCBkaXNjb25uZWN0ZWRFbmQpIHtcclxuICAgICAgICBcclxuICAgICAgICB2YXIgZHVtbXlOb2RlID0ge1xyXG4gICAgICAgICAgICBkYXRhOiB7IFxyXG4gICAgICAgICAgICAgIGlkOiAnbnd0X3JlY29ubmVjdEVkZ2VfZHVtbXknLFxyXG4gICAgICAgICAgICAgIHBvcnRzOiBbXSxcclxuICAgICAgICAgICAgfSxcclxuICAgICAgICAgICAgc3R5bGU6IHtcclxuICAgICAgICAgICAgICB3aWR0aDogMSxcclxuICAgICAgICAgICAgICBoZWlnaHQ6IDEsXHJcbiAgICAgICAgICAgICAgJ3Zpc2liaWxpdHknOiAnaGlkZGVuJ1xyXG4gICAgICAgICAgICB9LFxyXG4gICAgICAgICAgICByZW5kZXJlZFBvc2l0aW9uOiBwb3NpdGlvblxyXG4gICAgICAgIH07XHJcbiAgICAgICAgY3kuYWRkKGR1bW15Tm9kZSk7XHJcblxyXG4gICAgICAgIHZhciBsb2MgPSAoZGlzY29ubmVjdGVkRW5kID09PSAnc291cmNlJykgPyBcclxuICAgICAgICAgICAge3NvdXJjZTogZHVtbXlOb2RlLmRhdGEuaWR9IDogXHJcbiAgICAgICAgICAgIHt0YXJnZXQ6IGR1bW15Tm9kZS5kYXRhLmlkfTtcclxuXHJcbiAgICAgICAgZWRnZSA9IGVkZ2UubW92ZShsb2MpWzBdO1xyXG5cclxuICAgICAgICByZXR1cm4ge1xyXG4gICAgICAgICAgICBkdW1teU5vZGU6IGN5Lm5vZGVzKFwiI1wiICsgZHVtbXlOb2RlLmRhdGEuaWQpWzBdLFxyXG4gICAgICAgICAgICBlZGdlOiBlZGdlXHJcbiAgICAgICAgfTtcclxuICAgIH0sXHJcblxyXG4gICAgY29ubmVjdEVkZ2U6IGZ1bmN0aW9uIChlZGdlLCBub2RlLCBsb2NhdGlvbikge1xyXG4gICAgICAgIGlmKCFlZGdlLmlzRWRnZSgpIHx8ICFub2RlLmlzTm9kZSgpKVxyXG4gICAgICAgICAgICByZXR1cm47XHJcblxyXG4gICAgICAgIHZhciBsb2MgPSB7fTtcclxuICAgICAgICBpZihsb2NhdGlvbiA9PT0gJ3NvdXJjZScpXHJcbiAgICAgICAgICAgIGxvYy5zb3VyY2UgPSBub2RlLmlkKCk7XHJcbiAgICAgICAgXHJcbiAgICAgICAgZWxzZSBpZihsb2NhdGlvbiA9PT0gJ3RhcmdldCcpXHJcbiAgICAgICAgICAgIGxvYy50YXJnZXQgPSBub2RlLmlkKCk7XHJcbiAgICAgICAgXHJcbiAgICAgICAgZWxzZVxyXG4gICAgICAgICAgICByZXR1cm47XHJcblxyXG4gICAgICAgIHJldHVybiBlZGdlLm1vdmUobG9jKVswXTtcclxuICAgIH0sXHJcblxyXG4gICAgY29weUVkZ2U6IGZ1bmN0aW9uIChvbGRFZGdlLCBuZXdFZGdlKSB7XHJcbiAgICAgICAgdGhpcy5jb3B5QW5jaG9ycyhvbGRFZGdlLCBuZXdFZGdlKTtcclxuICAgICAgICB0aGlzLmNvcHlTdHlsZShvbGRFZGdlLCBuZXdFZGdlKTtcclxuICAgIH0sXHJcblxyXG4gICAgY29weVN0eWxlOiBmdW5jdGlvbiAob2xkRWRnZSwgbmV3RWRnZSkge1xyXG4gICAgICAgIGlmKG9sZEVkZ2UgJiYgbmV3RWRnZSl7XHJcbiAgICAgICAgICAgIG5ld0VkZ2UuZGF0YSgnbGluZS1jb2xvcicsIG9sZEVkZ2UuZGF0YSgnbGluZS1jb2xvcicpKTtcclxuICAgICAgICAgICAgbmV3RWRnZS5kYXRhKCd3aWR0aCcsIG9sZEVkZ2UuZGF0YSgnd2lkdGgnKSk7XHJcbiAgICAgICAgICAgIG5ld0VkZ2UuZGF0YSgnY2FyZGluYWxpdHknLCBvbGRFZGdlLmRhdGEoJ2NhcmRpbmFsaXR5JykpO1xyXG4gICAgICAgIH1cclxuICAgIH0sXHJcblxyXG4gICAgY29weUFuY2hvcnM6IGZ1bmN0aW9uIChvbGRFZGdlLCBuZXdFZGdlKSB7XHJcbiAgICAgICAgaWYob2xkRWRnZS5oYXNDbGFzcygnZWRnZWJlbmRlZGl0aW5nLWhhc2JlbmRwb2ludHMnKSl7XHJcbiAgICAgICAgICAgIHZhciBicERpc3RhbmNlcyA9IG9sZEVkZ2UuZGF0YSgnY3llZGdlYmVuZGVkaXRpbmdEaXN0YW5jZXMnKTtcclxuICAgICAgICAgICAgdmFyIGJwV2VpZ2h0cyA9IG9sZEVkZ2UuZGF0YSgnY3llZGdlYmVuZGVkaXRpbmdXZWlnaHRzJyk7XHJcbiAgICAgICAgICAgIFxyXG4gICAgICAgICAgICBuZXdFZGdlLmRhdGEoJ2N5ZWRnZWJlbmRlZGl0aW5nRGlzdGFuY2VzJywgYnBEaXN0YW5jZXMpO1xyXG4gICAgICAgICAgICBuZXdFZGdlLmRhdGEoJ2N5ZWRnZWJlbmRlZGl0aW5nV2VpZ2h0cycsIGJwV2VpZ2h0cyk7XHJcbiAgICAgICAgICAgIG5ld0VkZ2UuYWRkQ2xhc3MoJ2VkZ2ViZW5kZWRpdGluZy1oYXNiZW5kcG9pbnRzJyk7XHJcbiAgICAgICAgfVxyXG4gICAgICAgIGVsc2UgaWYob2xkRWRnZS5oYXNDbGFzcygnZWRnZWNvbnRyb2xlZGl0aW5nLWhhc2NvbnRyb2xwb2ludHMnKSl7XHJcbiAgICAgICAgICAgIHZhciBicERpc3RhbmNlcyA9IG9sZEVkZ2UuZGF0YSgnY3llZGdlY29udHJvbGVkaXRpbmdEaXN0YW5jZXMnKTtcclxuICAgICAgICAgICAgdmFyIGJwV2VpZ2h0cyA9IG9sZEVkZ2UuZGF0YSgnY3llZGdlY29udHJvbGVkaXRpbmdXZWlnaHRzJyk7XHJcbiAgICAgICAgICAgIFxyXG4gICAgICAgICAgICBuZXdFZGdlLmRhdGEoJ2N5ZWRnZWNvbnRyb2xlZGl0aW5nRGlzdGFuY2VzJywgYnBEaXN0YW5jZXMpO1xyXG4gICAgICAgICAgICBuZXdFZGdlLmRhdGEoJ2N5ZWRnZWNvbnRyb2xlZGl0aW5nV2VpZ2h0cycsIGJwV2VpZ2h0cyk7XHJcbiAgICAgICAgICAgIG5ld0VkZ2UuYWRkQ2xhc3MoJ2VkZ2Vjb250cm9sZWRpdGluZy1oYXNjb250cm9scG9pbnRzJyk7XHJcbiAgICAgICAgfVxyXG4gICAgICAgIGlmIChvbGRFZGdlLmhhc0NsYXNzKCdlZGdlYmVuZGVkaXRpbmctaGFzbXVsdGlwbGViZW5kcG9pbnRzJykpIHtcclxuICAgICAgICAgICAgbmV3RWRnZS5hZGRDbGFzcygnZWRnZWJlbmRlZGl0aW5nLWhhc211bHRpcGxlYmVuZHBvaW50cycpO1xyXG4gICAgICAgIH1cclxuICAgICAgICBlbHNlIGlmIChvbGRFZGdlLmhhc0NsYXNzKCdlZGdlY29udHJvbGVkaXRpbmctaGFzbXVsdGlwbGVjb250cm9scG9pbnRzJykpIHtcclxuICAgICAgICAgICAgbmV3RWRnZS5hZGRDbGFzcygnZWRnZWNvbnRyb2xlZGl0aW5nLWhhc211bHRpcGxlY29udHJvbHBvaW50cycpO1xyXG4gICAgICAgIH1cclxuICAgIH0sXHJcbn07XHJcbiAgXHJcbm1vZHVsZS5leHBvcnRzID0gcmVjb25uZWN0aW9uVXRpbGl0aWVzO1xyXG4gICIsIm1vZHVsZS5leHBvcnRzID0gZnVuY3Rpb24gKGN5LCBhbmNob3JQb2ludFV0aWxpdGllcywgcGFyYW1zKSB7XHJcbiAgaWYgKGN5LnVuZG9SZWRvID09IG51bGwpXHJcbiAgICByZXR1cm47XHJcblxyXG4gIHZhciB1ciA9IGN5LnVuZG9SZWRvKHtcclxuICAgIGRlZmF1bHRBY3Rpb25zOiBmYWxzZSxcclxuICAgIGlzRGVidWc6IHRydWVcclxuICB9KTtcclxuXHJcbiAgZnVuY3Rpb24gY2hhbmdlQW5jaG9yUG9pbnRzKHBhcmFtKSB7XHJcbiAgICB2YXIgZWRnZSA9IGN5LmdldEVsZW1lbnRCeUlkKHBhcmFtLmVkZ2UuaWQoKSk7XHJcbiAgICB2YXIgdHlwZSA9IHBhcmFtLnR5cGUgIT09ICdpbmNvbmNsdXNpdmUnID8gcGFyYW0udHlwZSA6IGFuY2hvclBvaW50VXRpbGl0aWVzLmdldEVkZ2VUeXBlKGVkZ2UpO1xyXG4gICAgXHJcbiAgICB2YXIgd2VpZ2h0cywgZGlzdGFuY2VzLCB3ZWlnaHRTdHIsIGRpc3RhbmNlU3RyO1xyXG5cclxuICAgIGlmKHBhcmFtLnR5cGUgPT09ICdpbmNvbmNsdXNpdmUnICYmICFwYXJhbS5zZXQpe1xyXG4gICAgICB3ZWlnaHRzID0gW107XHJcbiAgICAgIGRpc3RhbmNlcyA9IFtdO1xyXG4gICAgfVxyXG4gICAgZWxzZSB7XHJcbiAgICAgIHdlaWdodFN0ciA9IGFuY2hvclBvaW50VXRpbGl0aWVzLnN5bnRheFt0eXBlXVsnd2VpZ2h0J107XHJcbiAgICAgIGRpc3RhbmNlU3RyID0gYW5jaG9yUG9pbnRVdGlsaXRpZXMuc3ludGF4W3R5cGVdWydkaXN0YW5jZSddO1xyXG5cclxuICAgICAgd2VpZ2h0cyA9IHBhcmFtLnNldCA/IGVkZ2UuZGF0YSh3ZWlnaHRTdHIpIDogcGFyYW0ud2VpZ2h0cztcclxuICAgICAgZGlzdGFuY2VzID0gcGFyYW0uc2V0ID8gZWRnZS5kYXRhKGRpc3RhbmNlU3RyKSA6IHBhcmFtLmRpc3RhbmNlcztcclxuICAgIH1cclxuXHJcbiAgICB2YXIgcmVzdWx0ID0ge1xyXG4gICAgICBlZGdlOiBlZGdlLFxyXG4gICAgICB0eXBlOiB0eXBlLFxyXG4gICAgICB3ZWlnaHRzOiB3ZWlnaHRzLFxyXG4gICAgICBkaXN0YW5jZXM6IGRpc3RhbmNlcyxcclxuICAgICAgLy9BcyB0aGUgcmVzdWx0IHdpbGwgbm90IGJlIHVzZWQgZm9yIHRoZSBmaXJzdCBmdW5jdGlvbiBjYWxsIHBhcmFtcyBzaG91bGQgYmUgdXNlZCB0byBzZXQgdGhlIGRhdGFcclxuICAgICAgc2V0OiB0cnVlXHJcbiAgICB9O1xyXG5cclxuICAgIC8vQ2hlY2sgaWYgd2UgbmVlZCB0byBzZXQgdGhlIHdlaWdodHMgYW5kIGRpc3RhbmNlcyBieSB0aGUgcGFyYW0gdmFsdWVzXHJcbiAgICBpZiAocGFyYW0uc2V0KSB7XHJcbiAgICAgIHZhciBoYWRBbmNob3JQb2ludCA9IHBhcmFtLndlaWdodHMgJiYgcGFyYW0ud2VpZ2h0cy5sZW5ndGggPiAwO1xyXG4gICAgICB2YXIgaGFkTXVsdGlwbGVBbmNob3JQb2ludHMgPSBoYWRBbmNob3JQb2ludCAmJiBwYXJhbS53ZWlnaHRzLmxlbmd0aCA+IDE7XHJcblxyXG4gICAgICBoYWRBbmNob3JQb2ludCA/IGVkZ2UuZGF0YSh3ZWlnaHRTdHIsIHBhcmFtLndlaWdodHMpIDogZWRnZS5yZW1vdmVEYXRhKHdlaWdodFN0cik7XHJcbiAgICAgIGhhZEFuY2hvclBvaW50ID8gZWRnZS5kYXRhKGRpc3RhbmNlU3RyLCBwYXJhbS5kaXN0YW5jZXMpIDogZWRnZS5yZW1vdmVEYXRhKGRpc3RhbmNlU3RyKTtcclxuXHJcbiAgICAgIHZhciBzaW5nbGVDbGFzc05hbWUgPSBhbmNob3JQb2ludFV0aWxpdGllcy5zeW50YXhbdHlwZV1bJ2NsYXNzJ107XHJcbiAgICAgIHZhciBtdWx0aUNsYXNzTmFtZSA9IGFuY2hvclBvaW50VXRpbGl0aWVzLnN5bnRheFt0eXBlXVsnbXVsdGlDbGFzcyddO1xyXG5cclxuICAgICAgLy8gUmVmcmVzaCB0aGUgY3VydmUgc3R5bGUgYXMgdGhlIG51bWJlciBvZiBhbmNob3IgcG9pbnQgd291bGQgYmUgY2hhbmdlZCBieSB0aGUgcHJldmlvdXMgb3BlcmF0aW9uXHJcbiAgICAgIC8vIEFkZGluZyBvciByZW1vdmluZyBtdWx0aSBjbGFzc2VzIGF0IG9uY2UgY2FuIGNhdXNlIGVycm9ycy4gSWYgbXVsdGlwbGUgY2xhc3NlcyBhcmUgdG8gYmUgYWRkZWQsXHJcbiAgICAgIC8vIGp1c3QgYWRkIHRoZW0gdG9nZXRoZXIgaW4gc3BhY2UgZGVsaW1ldGVkIGNsYXNzIG5hbWVzIGZvcm1hdC5cclxuICAgICAgaWYgKCFoYWRBbmNob3JQb2ludCAmJiAhaGFkTXVsdGlwbGVBbmNob3JQb2ludHMpIHtcclxuICAgICAgICAvLyBSZW1vdmUgbXVsdGlwbGUgY2xhc3NlcyBmcm9tIGVkZ2Ugd2l0aCBzcGFjZSBkZWxpbWV0ZWQgc3RyaW5nIG9mIGNsYXNzIG5hbWVzIFxyXG4gICAgICAgIGVkZ2UucmVtb3ZlQ2xhc3Moc2luZ2xlQ2xhc3NOYW1lICsgXCIgXCIgKyBtdWx0aUNsYXNzTmFtZSk7XHJcbiAgICAgIH1cclxuICAgICAgZWxzZSBpZiAoaGFkQW5jaG9yUG9pbnQgJiYgIWhhZE11bHRpcGxlQW5jaG9yUG9pbnRzKSB7IC8vIEhhZCBzaW5nbGUgYW5jaG9yXHJcbiAgICAgICAgZWRnZS5hZGRDbGFzcyhzaW5nbGVDbGFzc05hbWUpO1xyXG4gICAgICAgIGVkZ2UucmVtb3ZlQ2xhc3MobXVsdGlDbGFzc05hbWUpOyAgIFxyXG4gICAgICB9XHJcbiAgICAgIGVsc2Uge1xyXG4gICAgICAgIC8vIEhhZCBtdWx0aXBsZSBhbmNob3JzLiBBZGQgbXVsdGlwbGUgY2xhc3NlcyB3aXRoIHNwYWNlIGRlbGltZXRlZCBzdHJpbmcgb2YgY2xhc3MgbmFtZXNcclxuICAgICAgICBlZGdlLmFkZENsYXNzKHNpbmdsZUNsYXNzTmFtZSArIFwiIFwiICsgbXVsdGlDbGFzc05hbWUpO1xyXG4gICAgICB9XHJcbiAgICB9XHJcbiAgICBcclxuICAgIGVkZ2UudHJpZ2dlcignY3llZGdlZWRpdGluZy5jaGFuZ2VBbmNob3JQb2ludHMnKTtcclxuXHJcbiAgICByZXR1cm4gcmVzdWx0O1xyXG4gIH1cclxuXHJcbiAgZnVuY3Rpb24gbW92ZURvKGFyZykge1xyXG4gICAgICBpZiAoYXJnLmZpcnN0VGltZSkge1xyXG4gICAgICAgICAgZGVsZXRlIGFyZy5maXJzdFRpbWU7XHJcbiAgICAgICAgICByZXR1cm4gYXJnO1xyXG4gICAgICB9XHJcblxyXG4gICAgICB2YXIgZWRnZXMgPSBhcmcuZWRnZXM7XHJcbiAgICAgIHZhciBwb3NpdGlvbkRpZmYgPSBhcmcucG9zaXRpb25EaWZmO1xyXG4gICAgICB2YXIgcmVzdWx0ID0ge1xyXG4gICAgICAgICAgZWRnZXM6IGVkZ2VzLFxyXG4gICAgICAgICAgcG9zaXRpb25EaWZmOiB7XHJcbiAgICAgICAgICAgICAgeDogLXBvc2l0aW9uRGlmZi54LFxyXG4gICAgICAgICAgICAgIHk6IC1wb3NpdGlvbkRpZmYueVxyXG4gICAgICAgICAgfVxyXG4gICAgICB9O1xyXG4gICAgICBtb3ZlQW5jaG9yc1VuZG9hYmxlKHBvc2l0aW9uRGlmZiwgZWRnZXMpO1xyXG5cclxuICAgICAgcmV0dXJuIHJlc3VsdDtcclxuICB9XHJcblxyXG4gIGZ1bmN0aW9uIG1vdmVBbmNob3JzVW5kb2FibGUocG9zaXRpb25EaWZmLCBlZGdlcykge1xyXG4gICAgICBlZGdlcy5mb3JFYWNoKGZ1bmN0aW9uKCBlZGdlICl7XHJcbiAgICAgICAgICB2YXIgdHlwZSA9IGFuY2hvclBvaW50VXRpbGl0aWVzLmdldEVkZ2VUeXBlKGVkZ2UpO1xyXG4gICAgICAgICAgdmFyIHByZXZpb3VzQW5jaG9yc1Bvc2l0aW9uID0gYW5jaG9yUG9pbnRVdGlsaXRpZXMuZ2V0QW5jaG9yc0FzQXJyYXkoZWRnZSk7XHJcbiAgICAgICAgICB2YXIgbmV4dEFuY2hvcnNQb3NpdGlvbiA9IFtdO1xyXG4gICAgICAgICAgaWYgKHByZXZpb3VzQW5jaG9yc1Bvc2l0aW9uICE9IHVuZGVmaW5lZClcclxuICAgICAgICAgIHtcclxuICAgICAgICAgICAgICBmb3IgKHZhciBpPTA7IGk8cHJldmlvdXNBbmNob3JzUG9zaXRpb24ubGVuZ3RoOyBpKz0yKVxyXG4gICAgICAgICAgICAgIHtcclxuICAgICAgICAgICAgICAgICAgbmV4dEFuY2hvcnNQb3NpdGlvbi5wdXNoKHt4OiBwcmV2aW91c0FuY2hvcnNQb3NpdGlvbltpXStwb3NpdGlvbkRpZmYueCwgeTogcHJldmlvdXNBbmNob3JzUG9zaXRpb25baSsxXStwb3NpdGlvbkRpZmYueX0pO1xyXG4gICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICBlZGdlLmRhdGEoYW5jaG9yUG9pbnRVdGlsaXRpZXMuc3ludGF4W3R5cGVdWydwb2ludFBvcyddLCBuZXh0QW5jaG9yc1Bvc2l0aW9uKTtcclxuICAgICAgICAgIH1cclxuICAgICAgfSk7XHJcblxyXG4gICAgICBhbmNob3JQb2ludFV0aWxpdGllcy5pbml0QW5jaG9yUG9pbnRzKHBhcmFtcy5iZW5kUG9zaXRpb25zRnVuY3Rpb24sIHBhcmFtcy5jb250cm9sUG9zaXRpb25zRnVuY3Rpb24sIGVkZ2VzKTtcclxuICB9XHJcblxyXG4gIGZ1bmN0aW9uIHJlY29ubmVjdEVkZ2UocGFyYW0pe1xyXG4gICAgdmFyIGVkZ2UgICAgICA9IHBhcmFtLmVkZ2U7XHJcbiAgICB2YXIgbG9jYXRpb24gID0gcGFyYW0ubG9jYXRpb247XHJcbiAgICB2YXIgb2xkTG9jICAgID0gcGFyYW0ub2xkTG9jO1xyXG5cclxuICAgIGVkZ2UgPSBlZGdlLm1vdmUobG9jYXRpb24pWzBdO1xyXG5cclxuICAgIHZhciByZXN1bHQgPSB7XHJcbiAgICAgIGVkZ2U6ICAgICBlZGdlLFxyXG4gICAgICBsb2NhdGlvbjogb2xkTG9jLFxyXG4gICAgICBvbGRMb2M6ICAgbG9jYXRpb25cclxuICAgIH1cclxuICAgIGVkZ2UudW5zZWxlY3QoKTtcclxuICAgIHJldHVybiByZXN1bHQ7XHJcbiAgfVxyXG5cclxuICBmdW5jdGlvbiByZW1vdmVSZWNvbm5lY3RlZEVkZ2UocGFyYW0pe1xyXG4gICAgdmFyIG9sZEVkZ2UgPSBwYXJhbS5vbGRFZGdlO1xyXG4gICAgdmFyIHRtcCA9IGN5LmdldEVsZW1lbnRCeUlkKG9sZEVkZ2UuZGF0YSgnaWQnKSk7XHJcbiAgICBpZih0bXAgJiYgdG1wLmxlbmd0aCA+IDApXHJcbiAgICAgIG9sZEVkZ2UgPSB0bXA7XHJcblxyXG4gICAgdmFyIG5ld0VkZ2UgPSBwYXJhbS5uZXdFZGdlO1xyXG4gICAgdmFyIHRtcCA9IGN5LmdldEVsZW1lbnRCeUlkKG5ld0VkZ2UuZGF0YSgnaWQnKSk7XHJcbiAgICBpZih0bXAgJiYgdG1wLmxlbmd0aCA+IDApXHJcbiAgICAgIG5ld0VkZ2UgPSB0bXA7XHJcblxyXG4gICAgaWYob2xkRWRnZS5pbnNpZGUoKSl7XHJcbiAgICAgIG9sZEVkZ2UgPSBvbGRFZGdlLnJlbW92ZSgpWzBdO1xyXG4gICAgfSBcclxuICAgICAgXHJcbiAgICBpZihuZXdFZGdlLnJlbW92ZWQoKSl7XHJcbiAgICAgIG5ld0VkZ2UgPSBuZXdFZGdlLnJlc3RvcmUoKTtcclxuICAgICAgbmV3RWRnZS51bnNlbGVjdCgpO1xyXG4gICAgfVxyXG4gICAgXHJcbiAgICByZXR1cm4ge1xyXG4gICAgICBvbGRFZGdlOiBuZXdFZGdlLFxyXG4gICAgICBuZXdFZGdlOiBvbGRFZGdlXHJcbiAgICB9O1xyXG4gIH1cclxuXHJcbiAgdXIuYWN0aW9uKCdjaGFuZ2VBbmNob3JQb2ludHMnLCBjaGFuZ2VBbmNob3JQb2ludHMsIGNoYW5nZUFuY2hvclBvaW50cyk7XHJcbiAgdXIuYWN0aW9uKCdtb3ZlQW5jaG9yUG9pbnRzJywgbW92ZURvLCBtb3ZlRG8pO1xyXG4gIHVyLmFjdGlvbigncmVjb25uZWN0RWRnZScsIHJlY29ubmVjdEVkZ2UsIHJlY29ubmVjdEVkZ2UpO1xyXG4gIHVyLmFjdGlvbigncmVtb3ZlUmVjb25uZWN0ZWRFZGdlJywgcmVtb3ZlUmVjb25uZWN0ZWRFZGdlLCByZW1vdmVSZWNvbm5lY3RlZEVkZ2UpO1xyXG59O1xyXG4iXSwic291cmNlUm9vdCI6IiJ9