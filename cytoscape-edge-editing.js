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
        // the null checks are not theoretically required
        // but they protect from bad synchronious calls of refreshDraws()
        if (endpointShape1 === null) {
          endpointShape1 = new Konva.Circle({
            x: sourceEndPointX + length,
            y: sourceEndPointY + length,
            radius: length,
            fill: 'black'
          });
        }

        if (endpointShape2 === null) {
          endpointShape2 = new Konva.Circle({
            x: targetEndPointX + length,
            y: targetEndPointY + length,
            radius: length,
            fill: 'black'
          });
        }

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
          setTimeout(function () {
            refreshDraws();
          }, 50);
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
      if (!edge.selected()) edge.select();else {
        edge.unselect();
        edge.select();
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
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIndlYnBhY2s6Ly9jeXRvc2NhcGVFZGdlRWRpdGluZy93ZWJwYWNrL3VuaXZlcnNhbE1vZHVsZURlZmluaXRpb24iLCJ3ZWJwYWNrOi8vY3l0b3NjYXBlRWRnZUVkaXRpbmcvd2VicGFjay9ib290c3RyYXAiLCJ3ZWJwYWNrOi8vY3l0b3NjYXBlRWRnZUVkaXRpbmcvLi9zcmMvQW5jaG9yUG9pbnRVdGlsaXRpZXMuanMiLCJ3ZWJwYWNrOi8vY3l0b3NjYXBlRWRnZUVkaXRpbmcvLi9zcmMvZGVib3VuY2UuanMiLCJ3ZWJwYWNrOi8vY3l0b3NjYXBlRWRnZUVkaXRpbmcvLi9zcmMvaW5kZXguanMiLCJ3ZWJwYWNrOi8vY3l0b3NjYXBlRWRnZUVkaXRpbmcvLi9zcmMvVUlVdGlsaXRpZXMuanMiLCJ3ZWJwYWNrOi8vY3l0b3NjYXBlRWRnZUVkaXRpbmcvLi9zcmMvcmVjb25uZWN0aW9uVXRpbGl0aWVzLmpzIiwid2VicGFjazovL2N5dG9zY2FwZUVkZ2VFZGl0aW5nLy4vc3JjL3JlZ2lzdGVyVW5kb1JlZG9GdW5jdGlvbnMuanMiXSwibmFtZXMiOlsiYW5jaG9yUG9pbnRVdGlsaXRpZXMiLCJjdXJyZW50Q3R4RWRnZSIsInVuZGVmaW5lZCIsImN1cnJlbnRDdHhQb3MiLCJjdXJyZW50QW5jaG9ySW5kZXgiLCJpZ25vcmVkQ2xhc3NlcyIsInNldElnbm9yZWRDbGFzc2VzIiwiX2lnbm9yZWRDbGFzc2VzIiwic3ludGF4IiwiYmVuZCIsImVkZ2UiLCJjbGFzcyIsIm11bHRpQ2xhc3MiLCJ3ZWlnaHQiLCJkaXN0YW5jZSIsIndlaWdodENzcyIsImRpc3RhbmNlQ3NzIiwicG9pbnRQb3MiLCJjb250cm9sIiwiZ2V0RWRnZVR5cGUiLCJoYXNDbGFzcyIsImNzcyIsImRhdGEiLCJsZW5ndGgiLCJpbml0QW5jaG9yUG9pbnRzIiwiYmVuZFBvc2l0aW9uc0ZjbiIsImNvbnRyb2xQb3NpdGlvbnNGY24iLCJlZGdlcyIsImkiLCJ0eXBlIiwiaXNJZ25vcmVkRWRnZSIsImFuY2hvclBvc2l0aW9ucyIsImFwcGx5IiwicmVzdWx0IiwiY29udmVydFRvUmVsYXRpdmVQb3NpdGlvbnMiLCJkaXN0YW5jZXMiLCJ3ZWlnaHRzIiwiYWRkQ2xhc3MiLCJzdGFydFgiLCJzb3VyY2UiLCJwb3NpdGlvbiIsInN0YXJ0WSIsImVuZFgiLCJ0YXJnZXQiLCJlbmRZIiwiaWQiLCJnZXRMaW5lRGlyZWN0aW9uIiwic3JjUG9pbnQiLCJ0Z3RQb2ludCIsInkiLCJ4IiwiZ2V0U3JjVGd0UG9pbnRzQW5kVGFuZ2VudHMiLCJzb3VyY2VOb2RlIiwidGFyZ2V0Tm9kZSIsInRndFBvc2l0aW9uIiwic3JjUG9zaXRpb24iLCJtMSIsIm0yIiwiZ2V0SW50ZXJzZWN0aW9uIiwicG9pbnQiLCJzcmNUZ3RQb2ludHNBbmRUYW5nZW50cyIsImludGVyc2VjdFgiLCJpbnRlcnNlY3RZIiwiSW5maW5pdHkiLCJhMSIsImEyIiwiaW50ZXJzZWN0aW9uUG9pbnQiLCJnZXRBbmNob3JzQXNBcnJheSIsImFuY2hvckxpc3QiLCJwc3R5bGUiLCJwZlZhbHVlIiwibWluTGVuZ3RocyIsIk1hdGgiLCJtaW4iLCJzcmNQb3MiLCJ0Z3RQb3MiLCJkeSIsImR4IiwibCIsInNxcnQiLCJ2ZWN0b3IiLCJ2ZWN0b3JOb3JtIiwidmVjdG9yTm9ybUludmVyc2UiLCJzIiwidyIsImQiLCJ3MSIsIncyIiwicG9zUHRzIiwieDEiLCJ4MiIsInkxIiwieTIiLCJtaWRwdFB0cyIsImFkanVzdGVkTWlkcHQiLCJwdXNoIiwiY29udmVydFRvUmVsYXRpdmVQb3NpdGlvbiIsInBvdyIsImRpcmVjdGlvbjEiLCJkaXJlY3Rpb24yIiwiYW5jaG9yUG9pbnRzIiwiYW5jaG9yIiwicmVsYXRpdmVBbmNob3JQb3NpdGlvbiIsImdldERpc3RhbmNlc1N0cmluZyIsInN0ciIsImdldFdlaWdodHNTdHJpbmciLCJhZGRBbmNob3JQb2ludCIsIm5ld0FuY2hvclBvaW50Iiwid2VpZ2h0U3RyIiwiZGlzdGFuY2VTdHIiLCJyZWxhdGl2ZVBvc2l0aW9uIiwib3JpZ2luYWxBbmNob3JXZWlnaHQiLCJzdGFydFdlaWdodCIsImVuZFdlaWdodCIsIndlaWdodHNXaXRoVGd0U3JjIiwiY29uY2F0IiwiYW5jaG9yc0xpc3QiLCJtaW5EaXN0IiwiaW50ZXJzZWN0aW9uIiwicHRzV2l0aFRndFNyYyIsIm5ld0FuY2hvckluZGV4IiwiYjEiLCJjb21wYXJlV2l0aFByZWNpc2lvbiIsImIyIiwiYjMiLCJiNCIsInN0YXJ0IiwiZW5kIiwiY3VycmVudEludGVyc2VjdGlvbiIsImRpc3QiLCJzcGxpY2UiLCJyZW1vdmVBbmNob3IiLCJhbmNob3JJbmRleCIsImVkZ2VUeXBlSW5jb25jbHVzaXZlU2hvdWxkbnRIYXBwZW4iLCJwb3NpdGlvbkRhdGFTdHIiLCJwb3NpdGlvbnMiLCJyZW1vdmVDbGFzcyIsInJlbW92ZUFsbEFuY2hvcnMiLCJjYWxjdWxhdGVEaXN0YW5jZSIsInB0MSIsInB0MiIsImRpZmZYIiwiZGlmZlkiLCJuMSIsIm4yIiwiaXNMZXNzVGhlbk9yRXF1YWwiLCJwcmVjaXNpb24iLCJkaWZmIiwiYWJzIiwicGxhY2UiLCJjb25zb2xlIiwibG9nIiwibW9kdWxlIiwiZXhwb3J0cyIsImRlYm91bmNlIiwiRlVOQ19FUlJPUl9URVhUIiwibmF0aXZlTWF4IiwibWF4IiwibmF0aXZlTm93IiwiRGF0ZSIsIm5vdyIsImdldFRpbWUiLCJmdW5jIiwid2FpdCIsIm9wdGlvbnMiLCJhcmdzIiwibWF4VGltZW91dElkIiwic3RhbXAiLCJ0aGlzQXJnIiwidGltZW91dElkIiwidHJhaWxpbmdDYWxsIiwibGFzdENhbGxlZCIsIm1heFdhaXQiLCJ0cmFpbGluZyIsIlR5cGVFcnJvciIsImxlYWRpbmciLCJpc09iamVjdCIsImNhbmNlbCIsImNsZWFyVGltZW91dCIsImNvbXBsZXRlIiwiaXNDYWxsZWQiLCJkZWxheWVkIiwicmVtYWluaW5nIiwic2V0VGltZW91dCIsIm1heERlbGF5ZWQiLCJkZWJvdW5jZWQiLCJhcmd1bWVudHMiLCJsZWFkaW5nQ2FsbCIsInZhbHVlIiwicmVxdWlyZSIsInJlZ2lzdGVyIiwiY3l0b3NjYXBlIiwiJCIsIktvbnZhIiwidWlVdGlsaXRpZXMiLCJkZWZhdWx0cyIsImJlbmRQb3NpdGlvbnNGdW5jdGlvbiIsImVsZSIsImNvbnRyb2xQb3NpdGlvbnNGdW5jdGlvbiIsImluaXRBbmNob3JzQXV0b21hdGljYWxseSIsInVuZG9hYmxlIiwiYW5jaG9yU2hhcGVTaXplRmFjdG9yIiwiekluZGV4IiwiZW5hYmxlZCIsImJlbmRSZW1vdmFsU2Vuc2l0aXZpdHkiLCJhZGRCZW5kTWVudUl0ZW1UaXRsZSIsInJlbW92ZUJlbmRNZW51SXRlbVRpdGxlIiwicmVtb3ZlQWxsQmVuZE1lbnVJdGVtVGl0bGUiLCJhZGRDb250cm9sTWVudUl0ZW1UaXRsZSIsInJlbW92ZUNvbnRyb2xNZW51SXRlbVRpdGxlIiwicmVtb3ZlQWxsQ29udHJvbE1lbnVJdGVtVGl0bGUiLCJtb3ZlU2VsZWN0ZWRBbmNob3JzT25LZXlFdmVudHMiLCJlbmFibGVNdWx0aXBsZUFuY2hvclJlbW92YWxPcHRpb24iLCJpbml0aWFsaXplZCIsImV4dGVuZCIsIm9iaiIsImlzTmFOIiwib3B0cyIsImN5Iiwic3R5bGUiLCJzZWxlY3RvciIsImluc3RhbmNlIiwiZWxlcyIsImRlbGV0ZVNlbGVjdGVkQW5jaG9yIiwiaW5kZXgiLCJkZWZpbmUiLCJyZWNvbm5lY3Rpb25VdGlsaXRpZXMiLCJyZWdpc3RlclVuZG9SZWRvRnVuY3Rpb25zIiwic3RhZ2VJZCIsInBhcmFtcyIsImZuIiwiYWRkQmVuZFBvaW50Q3h0TWVudUlkIiwicmVtb3ZlQmVuZFBvaW50Q3h0TWVudUlkIiwicmVtb3ZlQWxsQmVuZFBvaW50Q3R4TWVudUlkIiwiYWRkQ29udHJvbFBvaW50Q3h0TWVudUlkIiwicmVtb3ZlQ29udHJvbFBvaW50Q3h0TWVudUlkIiwicmVtb3ZlQWxsQ29udHJvbFBvaW50Q3R4TWVudUlkIiwiZVN0eWxlIiwiZVJlbW92ZSIsImVBZGQiLCJlWm9vbSIsImVTZWxlY3QiLCJlVW5zZWxlY3QiLCJlVGFwU3RhcnQiLCJlVGFwU3RhcnRPbkVkZ2UiLCJlVGFwRHJhZyIsImVUYXBFbmQiLCJlQ3h0VGFwIiwiZURyYWciLCJsYXN0UGFubmluZ0VuYWJsZWQiLCJsYXN0Wm9vbWluZ0VuYWJsZWQiLCJsYXN0Qm94U2VsZWN0aW9uRW5hYmxlZCIsImxhc3RBY3RpdmVCZ09wYWNpdHkiLCJlZGdlVG9IaWdobGlnaHQiLCJudW1iZXJPZlNlbGVjdGVkRWRnZXMiLCJlbmRwb2ludFNoYXBlMSIsImVuZHBvaW50U2hhcGUyIiwiYW5jaG9yVG91Y2hlZCIsIm1vdXNlT3V0IiwiZnVuY3Rpb25zIiwiaW5pdCIsInNlbGYiLCIkY29udGFpbmVyIiwiY2FudmFzRWxlbWVudElkIiwiJGNhbnZhc0VsZW1lbnQiLCJmaW5kIiwiYXBwZW5kIiwic3RhZ2UiLCJzdGFnZXMiLCJTdGFnZSIsImNvbnRhaW5lciIsIndpZHRoIiwiaGVpZ2h0IiwiY2FudmFzIiwiZ2V0Q2hpbGRyZW4iLCJMYXllciIsImFkZCIsImFuY2hvck1hbmFnZXIiLCJlZGdlVHlwZSIsImFuY2hvcnMiLCJ0b3VjaGVkQW5jaG9yIiwidG91Y2hlZEFuY2hvckluZGV4IiwiYmluZExpc3RlbmVycyIsIm9uIiwiZU1vdXNlRG93biIsInVuYmluZExpc3RlbmVycyIsIm9mZiIsImV2ZW50IiwiYXV0b3Vuc2VsZWN0aWZ5IiwidW5zZWxlY3QiLCJtb3ZlQW5jaG9yUGFyYW0iLCJ0dXJuT2ZmQWN0aXZlQmdDb2xvciIsImRpc2FibGVHZXN0dXJlcyIsImF1dG91bmdyYWJpZnkiLCJnZXRTdGFnZSIsImVNb3VzZVVwIiwiZU1vdXNlT3V0Iiwic2VsZWN0IiwicmVzZXRBY3RpdmVCZ0NvbG9yIiwicmVzZXRHZXN0dXJlcyIsImNsZWFyQW5jaG9yc0V4Y2VwdCIsImRvbnRDbGVhbiIsImV4Y2VwdGlvbkFwcGxpZXMiLCJmb3JFYWNoIiwiZGVzdHJveSIsInJlbmRlckFuY2hvclNoYXBlcyIsImdldEFuY2hvclNoYXBlc0xlbmd0aCIsImFuY2hvclgiLCJhbmNob3JZIiwicmVuZGVyQW5jaG9yU2hhcGUiLCJkcmF3IiwidG9wTGVmdFgiLCJ0b3BMZWZ0WSIsInJlbmRlcmVkVG9wTGVmdFBvcyIsImNvbnZlcnRUb1JlbmRlcmVkUG9zaXRpb24iLCJ6b29tIiwibmV3QW5jaG9yIiwiUmVjdCIsImZpbGwiLCJzdHJva2VXaWR0aCIsImRyYWdnYWJsZSIsImN4dEFkZEJlbmRGY24iLCJjeHRBZGRBbmNob3JGY24iLCJjeHRBZGRDb250cm9sRmNuIiwiYW5jaG9yVHlwZSIsImN5VGFyZ2V0IiwicGFyYW0iLCJ1bmRvUmVkbyIsImRvIiwicmVmcmVzaERyYXdzIiwiY3h0UmVtb3ZlQW5jaG9yRmNuIiwiY3h0UmVtb3ZlQWxsQW5jaG9yc0ZjbiIsImhhbmRsZVJlY29ubmVjdEVkZ2UiLCJ2YWxpZGF0ZUVkZ2UiLCJhY3RPblVuc3VjY2Vzc2Z1bFJlY29ubmVjdGlvbiIsIm1lbnVJdGVtcyIsImNvbnRlbnQiLCJvbkNsaWNrRnVuY3Rpb24iLCJjb3JlQXNXZWxsIiwiY29udGV4dE1lbnVzIiwibWVudXMiLCJpc0FjdGl2ZSIsImFwcGVuZE1lbnVJdGVtcyIsIl9zaXplQ2FudmFzIiwiYXR0ciIsImNhbnZhc0JiIiwib2Zmc2V0IiwiY29udGFpbmVyQmIiLCJ0b3AiLCJsZWZ0Iiwic2V0V2lkdGgiLCJzZXRIZWlnaHQiLCJzaXplQ2FudmFzIiwid2luZG93IiwiYmluZCIsIm9wdENhY2hlIiwibW9kZWxQb3NpdGlvbiIsInBhbiIsInJlbmRlckVuZFBvaW50U2hhcGVzIiwiZWRnZV9wdHMiLCJzb3VyY2VQb3MiLCJzb3VyY2VFbmRwb2ludCIsInRhcmdldFBvcyIsInRhcmdldEVuZHBvaW50IiwidW5zaGlmdCIsInNyYyIsIm5leHRUb1NvdXJjZSIsIm5leHRUb1RhcmdldCIsInJlbmRlckVhY2hFbmRQb2ludFNoYXBlIiwic1RvcExlZnRYIiwic1RvcExlZnRZIiwidFRvcExlZnRYIiwidFRvcExlZnRZIiwibmV4dFRvU291cmNlWCIsIm5leHRUb1NvdXJjZVkiLCJuZXh0VG9UYXJnZXRYIiwibmV4dFRvVGFyZ2V0WSIsInJlbmRlcmVkU291cmNlUG9zIiwicmVuZGVyZWRUYXJnZXRQb3MiLCJyZW5kZXJlZE5leHRUb1NvdXJjZSIsInJlbmRlcmVkTmV4dFRvVGFyZ2V0IiwiZGlzdGFuY2VGcm9tTm9kZSIsImRpc3RhbmNlU291cmNlIiwic291cmNlRW5kUG9pbnRYIiwic291cmNlRW5kUG9pbnRZIiwiZGlzdGFuY2VUYXJnZXQiLCJ0YXJnZXRFbmRQb2ludFgiLCJ0YXJnZXRFbmRQb2ludFkiLCJDaXJjbGUiLCJyYWRpdXMiLCJmYWN0b3IiLCJwYXJzZUZsb2F0IiwiY2hlY2tJZkluc2lkZVNoYXBlIiwiY2VudGVyWCIsImNlbnRlclkiLCJtaW5YIiwibWF4WCIsIm1pblkiLCJtYXhZIiwiaW5zaWRlIiwiZ2V0Q29udGFpbmluZ1NoYXBlSW5kZXgiLCJnZXRDb250YWluaW5nRW5kUG9pbnQiLCJhbGxQdHMiLCJfcHJpdmF0ZSIsInJzY3JhdGNoIiwiYWxscHRzIiwicGFubmluZ0VuYWJsZWQiLCJ6b29taW5nRW5hYmxlZCIsImJveFNlbGVjdGlvbkVuYWJsZWQiLCJjb3JlU3R5bGUiLCJ1cGRhdGUiLCJtb3ZlQW5jaG9yUG9pbnRzIiwicG9zaXRpb25EaWZmIiwicHJldmlvdXNBbmNob3JzUG9zaXRpb24iLCJuZXh0QW5jaG9yUG9pbnRzUG9zaXRpb24iLCJ0cmlnZ2VyIiwibW92ZUFuY2hvck9uRHJhZyIsIl9tb3ZlQW5jaG9yT25EcmFnIiwic2VsZWN0ZWRFZGdlcyIsInNlbGVjdGVkIiwic3RhcnRCYXRjaCIsImVuZEJhdGNoIiwiY29ubmVjdGVkRWRnZXMiLCJtb3ZlZEFuY2hvckluZGV4IiwidGFwU3RhcnRQb3MiLCJtb3ZlZEVkZ2UiLCJjcmVhdGVBbmNob3JPbkRyYWciLCJtb3ZlZEVuZFBvaW50IiwiZHVtbXlOb2RlIiwiZGV0YWNoZWROb2RlIiwibm9kZVRvQXR0YWNoIiwiYW5jaG9yQ3JlYXRlZEJ5RHJhZyIsImN5UG9zaXRpb24iLCJjeVBvc1giLCJjeVBvc1kiLCJlbmRQb2ludCIsImRpc2Nvbm5lY3RlZEVuZCIsImRpc2Nvbm5lY3RFZGdlIiwicmVuZGVyZWRQb3NpdGlvbiIsIm5vZGUiLCJub2RlcyIsImV2ZW50UG9zIiwiaXNOb2RlIiwiZmlyZSIsImFsbEFuY2hvcnMiLCJwcmVJbmRleCIsInBvc0luZGV4IiwicHJlQW5jaG9yUG9pbnQiLCJwb3NBbmNob3JQb2ludCIsIm5lYXJUb0xpbmUiLCJuZXdOb2RlIiwiaXNWYWxpZCIsImxvY2F0aW9uIiwibmV3U291cmNlIiwibmV3VGFyZ2V0IiwiY29ubmVjdEVkZ2UiLCJyZWNvbm5lY3RlZEVkZ2UiLCJjb3B5RWRnZSIsIm5ld0VkZ2UiLCJvbGRFZGdlIiwicmVtb3ZlIiwibG9jIiwib2xkTG9jIiwidG9TdHJpbmciLCJtb3ZlYW5jaG9ycGFyYW0iLCJmaXJzdEFuY2hvciIsImVkZ2VDb250YWluaW5nRmlyc3RBbmNob3IiLCJmaXJzdEFuY2hvclBvaW50Rm91bmQiLCJlIiwiZmlyc3RUaW1lIiwiZmlyc3RBbmNob3JQb3NpdGlvbiIsImluaXRpYWxQb3MiLCJtb3ZlZEZpcnN0QW5jaG9yIiwidGFyZ2V0SXNFZGdlIiwiaXNFZGdlIiwiZXJyIiwiaGlkZU1lbnVJdGVtIiwiY3lQb3MiLCJzZWxlY3RlZEluZGV4Iiwic2hvd01lbnVJdGVtIiwiYW5jaG9yc01vdmluZyIsImtleXMiLCJrZXlEb3duIiwic2hvdWxkTW92ZSIsInRuIiwiZG9jdW1lbnQiLCJhY3RpdmVFbGVtZW50IiwidGFnTmFtZSIsImtleUNvZGUiLCJwcmV2ZW50RGVmYXVsdCIsImVsZW1lbnRzIiwibW92ZVNwZWVkIiwiYWx0S2V5Iiwic2hpZnRLZXkiLCJ1cEFycm93Q29kZSIsImRvd25BcnJvd0NvZGUiLCJsZWZ0QXJyb3dDb2RlIiwicmlnaHRBcnJvd0NvZGUiLCJrZXlVcCIsImFkZEV2ZW50TGlzdGVuZXIiLCJ1bmJpbmQiLCJBcnJheSIsInByb3RvdHlwZSIsInNsaWNlIiwiY2FsbCIsImVycm9yIiwicG9ydHMiLCJtb3ZlIiwiY29weUFuY2hvcnMiLCJjb3B5U3R5bGUiLCJicERpc3RhbmNlcyIsImJwV2VpZ2h0cyIsInVyIiwiZGVmYXVsdEFjdGlvbnMiLCJpc0RlYnVnIiwiY2hhbmdlQW5jaG9yUG9pbnRzIiwiZ2V0RWxlbWVudEJ5SWQiLCJzZXQiLCJoYWRBbmNob3JQb2ludCIsImhhZE11bHRpcGxlQW5jaG9yUG9pbnRzIiwicmVtb3ZlRGF0YSIsInNpbmdsZUNsYXNzTmFtZSIsIm11bHRpQ2xhc3NOYW1lIiwibW92ZURvIiwiYXJnIiwibW92ZUFuY2hvcnNVbmRvYWJsZSIsIm5leHRBbmNob3JzUG9zaXRpb24iLCJyZWNvbm5lY3RFZGdlIiwicmVtb3ZlUmVjb25uZWN0ZWRFZGdlIiwidG1wIiwicmVtb3ZlZCIsInJlc3RvcmUiLCJhY3Rpb24iXSwibWFwcGluZ3MiOiJBQUFBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBLENBQUM7QUFDRCxPO1FDVkE7UUFDQTs7UUFFQTtRQUNBOztRQUVBO1FBQ0E7UUFDQTtRQUNBO1FBQ0E7UUFDQTtRQUNBO1FBQ0E7UUFDQTtRQUNBOztRQUVBO1FBQ0E7O1FBRUE7UUFDQTs7UUFFQTtRQUNBO1FBQ0E7OztRQUdBO1FBQ0E7O1FBRUE7UUFDQTs7UUFFQTtRQUNBO1FBQ0E7UUFDQSwwQ0FBMEMsZ0NBQWdDO1FBQzFFO1FBQ0E7O1FBRUE7UUFDQTtRQUNBO1FBQ0Esd0RBQXdELGtCQUFrQjtRQUMxRTtRQUNBLGlEQUFpRCxjQUFjO1FBQy9EOztRQUVBO1FBQ0E7UUFDQTtRQUNBO1FBQ0E7UUFDQTtRQUNBO1FBQ0E7UUFDQTtRQUNBO1FBQ0E7UUFDQSx5Q0FBeUMsaUNBQWlDO1FBQzFFLGdIQUFnSCxtQkFBbUIsRUFBRTtRQUNySTtRQUNBOztRQUVBO1FBQ0E7UUFDQTtRQUNBLDJCQUEyQiwwQkFBMEIsRUFBRTtRQUN2RCxpQ0FBaUMsZUFBZTtRQUNoRDtRQUNBO1FBQ0E7O1FBRUE7UUFDQSxzREFBc0QsK0RBQStEOztRQUVySDtRQUNBOzs7UUFHQTtRQUNBOzs7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QWpCLENBQVY7QUFDRDs7QUFFRCxRQUFHRixRQUFRd0UsT0FBUixFQUFILEVBQXFCO0FBQ25CeEUsZ0JBQVVBLFFBQVF5RSxPQUFSLEVBQVY7QUFDQXpFLGNBQVF6SyxRQUFSO0FBQ0Q7O0FBRUQsV0FBTztBQUNMMEssZUFBU0QsT0FESjtBQUVMQSxlQUFTQztBQUZKLEtBQVA7QUFJRDs7QUFFRHFELEtBQUdvQixNQUFILENBQVUsb0JBQVYsRUFBZ0NqQixrQkFBaEMsRUFBb0RBLGtCQUFwRDtBQUNBSCxLQUFHb0IsTUFBSCxDQUFVLGtCQUFWLEVBQThCVCxNQUE5QixFQUFzQ0EsTUFBdEM7QUFDQVgsS0FBR29CLE1BQUgsQ0FBVSxlQUFWLEVBQTJCTCxhQUEzQixFQUEwQ0EsYUFBMUM7QUFDQWYsS0FBR29CLE1BQUgsQ0FBVSx1QkFBVixFQUFtQ0oscUJBQW5DLEVBQTBEQSxxQkFBMUQ7QUFDRCxDQS9KRCxDIiwiZmlsZSI6ImN5dG9zY2FwZS1lZGdlLWVkaXRpbmcuanMiLCJzb3VyY2VzQ29udGVudCI6WyIoZnVuY3Rpb24gd2VicGFja1VuaXZlcnNhbE1vZHVsZURlZmluaXRpb24ocm9vdCwgZmFjdG9yeSkge1xuXHRpZih0eXBlb2YgZXhwb3J0cyA9PT0gJ29iamVjdCcgJiYgdHlwZW9mIG1vZHVsZSA9PT0gJ29iamVjdCcpXG5cdFx0bW9kdWxlLmV4cG9ydHMgPSBmYWN0b3J5KCk7XG5cdGVsc2UgaWYodHlwZW9mIGRlZmluZSA9PT0gJ2Z1bmN0aW9uJyAmJiBkZWZpbmUuYW1kKVxuXHRcdGRlZmluZShbXSwgZmFjdG9yeSk7XG5cdGVsc2UgaWYodHlwZW9mIGV4cG9ydHMgPT09ICdvYmplY3QnKVxuXHRcdGV4cG9ydHNbXCJjeXRvc2NhcGVFZGdlRWRpdGluZ1wiXSA9IGZhY3RvcnkoKTtcblx0ZWxzZVxuXHRcdHJvb3RbXCJjeXRvc2NhcGVFZGdlRWRpdGluZ1wiXSA9IGZhY3RvcnkoKTtcbn0pKHdpbmRvdywgZnVuY3Rpb24oKSB7XG5yZXR1cm4gIiwiIFx0Ly8gVGhlIG1vZHVsZSBjYWNoZVxuIFx0dmFyIGluc3RhbGxlZE1vZHVsZXMgPSB7fTtcblxuIFx0Ly8gVGhlIHJlcXVpcmUgZnVuY3Rpb25cbiBcdGZ1bmN0aW9uIF9fd2VicGFja19yZXF1aXJlX18obW9kdWxlSWQpIHtcblxuIFx0XHQvLyBDaGVjayBpZiBtb2R1bGUgaXMgaW4gY2FjaGVcbiBcdFx0aWYoaW5zdGFsbGVkTW9kdWxlc1ttb2R1bGVJZF0pIHtcbiBcdFx0XHRyZXR1cm4gaW5zdGFsbGVkTW9kdWxlc1ttb2R1bGVJZF0uZXhwb3J0cztcbiBcdFx0fVxuIFx0XHQvLyBDcmVhdGUgYSBuZXcgbW9kdWxlIChhbmQgcHV0IGl0IGludG8gdGhlIGNhY2hlKVxuIFx0XHR2YXIgbW9kdWxlID0gaW5zdGFsbGVkTW9kdWxlc1ttb2R1bGVJZF0gPSB7XG4gXHRcdFx0aTogbW9kdWxlSWQsXG4gXHRcdFx0bDogZmFsc2UsXG4gXHRcdFx0ZXhwb3J0czoge31cbiBcdFx0fTtcblxuIFx0XHQvLyBFeGVjdXRlIHRoZSBtb2R1bGUgZnVuY3Rpb25cbiBcdFx0bW9kdWxlc1ttb2R1bGVJZF0uY2FsbChtb2R1bGUuZXhwb3J0cywgbW9kdWxlLCBtb2R1bGUuZXhwb3J0cywgX193ZWJwYWNrX3JlcXVpcmVfXyk7XG5cbiBcdFx0Ly8gRmxhZyB0aGUgbW9kdWxlIGFzIGxvYWRlZFxuIFx0XHRtb2R1bGUubCA9IHRydWU7XG5cbiBcdFx0Ly8gUmV0dXJuIHRoZSBleHBvcnRzIG9mIHRoZSBtb2R1bGVcbiBcdFx0cmV0dXJuIG1vZHVsZS5leHBvcnRzO1xuIFx0fVxuXG5cbiBcdC8vIGV4cG9zZSB0aGUgbW9kdWxlcyBvYmplY3QgKF9fd2VicGFja19tb2R1bGVzX18pXG4gXHRfX3dlYnBhY2tfcmVxdWlyZV9fLm0gPSBtb2R1bGVzO1xuXG4gXHQvLyBleHBvc2UgdGhlIG1vZHVsZSBjYWNoZVxuIFx0X193ZWJwYWNrX3JlcXVpcmVfXy5jID0gaW5zdGFsbGVkTW9kdWxlcztcblxuIFx0Ly8gZGVmaW5lIGdldHRlciBmdW5jdGlvbiBmb3IgaGFybW9ueSBleHBvcnRzXG4gXHRfX3dlYnBhY2tfcmVxdWlyZV9fLmQgPSBmdW5jdGlvbihleHBvcnRzLCBuYW1lLCBnZXR0ZXIpIHtcbiBcdFx0aWYoIV9fd2VicGFja19yZXF1aXJlX18ubyhleHBvcnRzLCBuYW1lKSkge1xuIFx0XHRcdE9iamVjdC5kZWZpbmVQcm9wZXJ0eShleHBvcnRzLCBuYW1lLCB7IGVudW1lcmFibGU6IHRydWUsIGdldDogZ2V0dGVyIH0pO1xuIFx0XHR9XG4gXHR9O1xuXG4gXHQvLyBkZWZpbmUgX19lc01vZHVsZSBvbiBleHBvcnRzXG4gXHRfX3dlYnBhY2tfcmVxdWlyZV9fLnIgPSBmdW5jdGlvbihleHBvcnRzKSB7XG4gXHRcdGlmKHR5cGVvZiBTeW1ib2wgIT09ICd1bmRlZmluZWQnICYmIFN5bWJvbC50b1N0cmluZ1RhZykge1xuIFx0XHRcdE9iamVjdC5kZWZpbmVQcm9wZXJ0eShleHBvcnRzLCBTeW1ib2wudG9TdHJpbmdUYWcsIHsgdmFsdWU6ICdNb2R1bGUnIH0pO1xuIFx0XHR9XG4gXHRcdE9iamVjdC5kZWZpbmVQcm9wZXJ0eShleHBvcnRzLCAnX19lc01vZHVsZScsIHsgdmFsdWU6IHRydWUgfSk7XG4gXHR9O1xuXG4gXHQvLyBjcmVhdGUgYSBmYWtlIG5hbWVzcGFjZSBvYmplY3RcbiBcdC8vIG1vZGUgJiAxOiB2YWx1ZSBpcyBhIG1vZHVsZSBpZCwgcmVxdWlyZSBpdFxuIFx0Ly8gbW9kZSAmIDI6IG1lcmdlIGFsbCBwcm9wZXJ0aWVzIG9mIHZhbHVlIGludG8gdGhlIG5zXG4gXHQvLyBtb2RlICYgNDogcmV0dXJuIHZhbHVlIHdoZW4gYWxyZWFkeSBucyBvYmplY3RcbiBcdC8vIG1vZGUgJiA4fDE6IGJlaGF2ZSBsaWtlIHJlcXVpcmVcbiBcdF9fd2VicGFja19yZXF1aXJlX18udCA9IGZ1bmN0aW9uKHZhbHVlLCBtb2RlKSB7XG4gXHRcdGlmKG1vZGUgJiAxKSB2YWx1ZSA9IF9fd2VicGFja19yZXF1aXJlX18odmFsdWUpO1xuIFx0XHRpZihtb2RlICYgOCkgcmV0dXJuIHZhbHVlO1xuIFx0XHRpZigobW9kZSAmIDQpICYmIHR5cGVvZiB2YWx1ZSA9PT0gJ29iamVjdCcgJiYgdmFsdWUgJiYgdmFsdWUuX19lc01vZHVsZSkgcmV0dXJuIHZhbHVlO1xuIFx0XHR2YXIgbnMgPSBPYmplY3QuY3JlYXRlKG51bGwpO1xuIFx0XHRfX3dlYnBhY2tfcmVxdWlyZV9fLnIobnMpO1xuIFx0XHRPYmplY3QuZGVmaW5lUHJvcGVydHkobnMsICdkZWZhdWx0JywgeyBlbnVtZXJhYmxlOiB0cnVlLCB2YWx1ZTogdmFsdWUgfSk7XG4gXHRcdGlmKG1vZGUgJiAyICYmIHR5cGVvZiB2YWx1ZSAhPSAnc3RyaW5nJykgZm9yKHZhciBrZXkgaW4gdmFsdWUpIF9fd2VicGFja19yZXF1aXJlX18uZChucywga2V5LCBmdW5jdGlvbihrZXkpIHsgcmV0dXJuIHZhbHVlW2tleV07IH0uYmluZChudWxsLCBrZXkpKTtcbiBcdFx0cmV0dXJuIG5zO1xuIFx0fTtcblxuIFx0Ly8gZ2V0RGVmYXVsdEV4cG9ydCBmdW5jdGlvbiBmb3IgY29tcGF0aWJpbGl0eSB3aXRoIG5vbi1oYXJtb255IG1vZHVsZXNcbiBcdF9fd2VicGFja19yZXF1aXJlX18ubiA9IGZ1bmN0aW9uKG1vZHVsZSkge1xuIFx0XHR2YXIgZ2V0dGVyID0gbW9kdWxlICYmIG1vZHVsZS5fX2VzTW9kdWxlID9cbiBcdFx0XHRmdW5jdGlvbiBnZXREZWZhdWx0KCkgeyByZXR1cm4gbW9kdWxlWydkZWZhdWx0J107IH0gOlxuIFx0XHRcdGZ1bmN0aW9uIGdldE1vZHVsZUV4cG9ydHMoKSB7IHJldHVybiBtb2R1bGU7IH07XG4gXHRcdF9fd2VicGFja19yZXF1aXJlX18uZChnZXR0ZXIsICdhJywgZ2V0dGVyKTtcbiBcdFx0cmV0dXJuIGdldHRlcjtcbiBcdH07XG5cbiBcdC8vIE9iamVjdC5wcm90b3R5cGUuaGFzT3duUHJvcGVydHkuY2FsbFxuIFx0X193ZWJwYWNrX3JlcXVpcmVfXy5vID0gZnVuY3Rpb24ob2JqZWN0LCBwcm9wZXJ0eSkgeyByZXR1cm4gT2JqZWN0LnByb3RvdHlwZS5oYXNPd25Qcm9wZXJ0eS5jYWxsKG9iamVjdCwgcHJvcGVydHkpOyB9O1xuXG4gXHQvLyBfX3dlYnBhY2tfcHVibGljX3BhdGhfX1xuIFx0X193ZWJwYWNrX3JlcXVpcmVfXy5wID0gXCJcIjtcblxuXG4gXHQvLyBMb2FkIGVudHJ5IG1vZHVsZSBhbmQgcmV0dXJuIGV4cG9ydHNcbiBcdHJldHVybiBfX3dlYnBhY2tfcmVxdWlyZV9fKF9fd2VicGFja19yZXF1aXJlX18ucyA9IDIpO1xuIiwidmFyIGFuY2hvclBvaW50VXRpbGl0aWVzID0ge1xyXG4gIGN1cnJlbnRDdHhFZGdlOiB1bmRlZmluZWQsXHJcbiAgY3VycmVudEN0eFBvczogdW5kZWZpbmVkLFxyXG4gIGN1cnJlbnRBbmNob3JJbmRleDogdW5kZWZpbmVkLFxyXG4gIGlnbm9yZWRDbGFzc2VzOiB1bmRlZmluZWQsXHJcbiAgc2V0SWdub3JlZENsYXNzZXM6IGZ1bmN0aW9uKF9pZ25vcmVkQ2xhc3Nlcykge1xyXG4gICAgdGhpcy5pZ25vcmVkQ2xhc3NlcyA9IF9pZ25vcmVkQ2xhc3NlcztcclxuICB9LFxyXG4gIHN5bnRheDoge1xyXG4gICAgYmVuZDoge1xyXG4gICAgICBlZGdlOiBcInNlZ21lbnRzXCIsXHJcbiAgICAgIGNsYXNzOiBcImVkZ2ViZW5kZWRpdGluZy1oYXNiZW5kcG9pbnRzXCIsXHJcbiAgICAgIG11bHRpQ2xhc3M6IFwiZWRnZWJlbmRlZGl0aW5nLWhhc211bHRpcGxlYmVuZHBvaW50c1wiLFxyXG4gICAgICB3ZWlnaHQ6IFwiY3llZGdlYmVuZGVkaXRpbmdXZWlnaHRzXCIsXHJcbiAgICAgIGRpc3RhbmNlOiBcImN5ZWRnZWJlbmRlZGl0aW5nRGlzdGFuY2VzXCIsXHJcbiAgICAgIHdlaWdodENzczogXCJzZWdtZW50LXdlaWdodHNcIixcclxuICAgICAgZGlzdGFuY2VDc3M6IFwic2VnbWVudC1kaXN0YW5jZXNcIixcclxuICAgICAgcG9pbnRQb3M6IFwiYmVuZFBvaW50UG9zaXRpb25zXCIsXHJcbiAgICB9LFxyXG4gICAgY29udHJvbDoge1xyXG4gICAgICBlZGdlOiBcInVuYnVuZGxlZC1iZXppZXJcIixcclxuICAgICAgY2xhc3M6IFwiZWRnZWNvbnRyb2xlZGl0aW5nLWhhc2NvbnRyb2xwb2ludHNcIixcclxuICAgICAgbXVsdGlDbGFzczogXCJlZGdlY29udHJvbGVkaXRpbmctaGFzbXVsdGlwbGVjb250cm9scG9pbnRzXCIsXHJcbiAgICAgIHdlaWdodDogXCJjeWVkZ2Vjb250cm9sZWRpdGluZ1dlaWdodHNcIixcclxuICAgICAgZGlzdGFuY2U6IFwiY3llZGdlY29udHJvbGVkaXRpbmdEaXN0YW5jZXNcIixcclxuICAgICAgd2VpZ2h0Q3NzOiBcImNvbnRyb2wtcG9pbnQtd2VpZ2h0c1wiLFxyXG4gICAgICBkaXN0YW5jZUNzczogXCJjb250cm9sLXBvaW50LWRpc3RhbmNlc1wiLFxyXG4gICAgICBwb2ludFBvczogXCJjb250cm9sUG9pbnRQb3NpdGlvbnNcIixcclxuICAgIH1cclxuICB9LFxyXG4gIC8vIGdldHMgZWRnZSB0eXBlIGFzICdiZW5kJyBvciAnY29udHJvbCdcclxuICAvLyB0aGUgaW50ZXJjaGFuZ2luZyBpZi1zIGFyZSBuZWNlc3NhcnkgdG8gc2V0IHRoZSBwcmlvcml0eSBvZiB0aGUgdGFnc1xyXG4gIC8vIGV4YW1wbGU6IGFuIGVkZ2Ugd2l0aCB0eXBlIHNlZ21lbnQgYW5kIGEgY2xhc3MgJ2hhc2NvbnRyb2xwb2ludHMnIHdpbGwgYmUgY2xhc3NpZmllZCBhcyB1bmJ1bmRsZWQgYmV6aWVyXHJcbiAgZ2V0RWRnZVR5cGU6IGZ1bmN0aW9uKGVkZ2Upe1xyXG4gICAgaWYoIWVkZ2UpXHJcbiAgICAgIHJldHVybiAnaW5jb25jbHVzaXZlJztcclxuICAgIGVsc2UgaWYoZWRnZS5oYXNDbGFzcyh0aGlzLnN5bnRheFsnYmVuZCddWydjbGFzcyddKSlcclxuICAgICAgcmV0dXJuICdiZW5kJztcclxuICAgIGVsc2UgaWYoZWRnZS5oYXNDbGFzcyh0aGlzLnN5bnRheFsnY29udHJvbCddWydjbGFzcyddKSlcclxuICAgICAgcmV0dXJuICdjb250cm9sJztcclxuICAgIGVsc2UgaWYoZWRnZS5jc3MoJ2N1cnZlLXN0eWxlJykgPT09IHRoaXMuc3ludGF4WydiZW5kJ11bJ2VkZ2UnXSlcclxuICAgICAgcmV0dXJuICdiZW5kJztcclxuICAgIGVsc2UgaWYoZWRnZS5jc3MoJ2N1cnZlLXN0eWxlJykgPT09IHRoaXMuc3ludGF4Wydjb250cm9sJ11bJ2VkZ2UnXSlcclxuICAgICAgcmV0dXJuICdjb250cm9sJztcclxuICAgIGVsc2UgaWYoZWRnZS5kYXRhKHRoaXMuc3ludGF4WydiZW5kJ11bJ3BvaW50UG9zJ10pICYmIFxyXG4gICAgICAgICAgICBlZGdlLmRhdGEodGhpcy5zeW50YXhbJ2JlbmQnXVsncG9pbnRQb3MnXSkubGVuZ3RoID4gMClcclxuICAgICAgcmV0dXJuICdiZW5kJztcclxuICAgIGVsc2UgaWYoZWRnZS5kYXRhKHRoaXMuc3ludGF4Wydjb250cm9sJ11bJ3BvaW50UG9zJ10pICYmIFxyXG4gICAgICAgICAgICBlZGdlLmRhdGEodGhpcy5zeW50YXhbJ2NvbnRyb2wnXVsncG9pbnRQb3MnXSkubGVuZ3RoID4gMClcclxuICAgICAgcmV0dXJuICdjb250cm9sJztcclxuICAgIHJldHVybiAnaW5jb25jbHVzaXZlJztcclxuICB9LFxyXG4gIC8vIGluaXRpbGl6ZSBhbmNob3IgcG9pbnRzIGJhc2VkIG9uIGJlbmRQb3NpdGlvbnNGY24gYW5kIGNvbnRyb2xQb3NpdGlvbkZjblxyXG4gIGluaXRBbmNob3JQb2ludHM6IGZ1bmN0aW9uKGJlbmRQb3NpdGlvbnNGY24sIGNvbnRyb2xQb3NpdGlvbnNGY24sIGVkZ2VzKSB7XHJcbiAgICBmb3IgKHZhciBpID0gMDsgaSA8IGVkZ2VzLmxlbmd0aDsgaSsrKSB7XHJcbiAgICAgIHZhciBlZGdlID0gZWRnZXNbaV07XHJcbiAgICAgIHZhciB0eXBlID0gdGhpcy5nZXRFZGdlVHlwZShlZGdlKTtcclxuICAgICAgXHJcbiAgICAgIGlmICh0eXBlID09PSAnaW5jb25jbHVzaXZlJykgeyBcclxuICAgICAgICBjb250aW51ZTsgXHJcbiAgICAgIH1cclxuXHJcbiAgICAgIGlmKCF0aGlzLmlzSWdub3JlZEVkZ2UoZWRnZSkpIHtcclxuXHJcbiAgICAgICAgdmFyIGFuY2hvclBvc2l0aW9ucztcclxuXHJcbiAgICAgICAgLy8gZ2V0IHRoZSBhbmNob3IgcG9zaXRpb25zIGJ5IGFwcGx5aW5nIHRoZSBmdW5jdGlvbnMgZm9yIHRoaXMgZWRnZVxyXG4gICAgICAgIGlmKHR5cGUgPT09ICdiZW5kJylcclxuICAgICAgICAgIGFuY2hvclBvc2l0aW9ucyA9IGJlbmRQb3NpdGlvbnNGY24uYXBwbHkodGhpcywgZWRnZSk7XHJcbiAgICAgICAgZWxzZSBpZih0eXBlID09PSAnY29udHJvbCcpXHJcbiAgICAgICAgICBhbmNob3JQb3NpdGlvbnMgPSBjb250cm9sUG9zaXRpb25zRmNuLmFwcGx5KHRoaXMsIGVkZ2UpO1xyXG5cclxuICAgICAgICAvLyBjYWxjdWxhdGUgcmVsYXRpdmUgYW5jaG9yIHBvc2l0aW9uc1xyXG4gICAgICAgIHZhciByZXN1bHQgPSB0aGlzLmNvbnZlcnRUb1JlbGF0aXZlUG9zaXRpb25zKGVkZ2UsIGFuY2hvclBvc2l0aW9ucyk7XHJcblxyXG4gICAgICAgIC8vIGlmIHRoZXJlIGFyZSBhbmNob3JzIHNldCB3ZWlnaHRzIGFuZCBkaXN0YW5jZXMgYWNjb3JkaW5nbHkgYW5kIGFkZCBjbGFzcyB0byBlbmFibGUgc3R5bGUgY2hhbmdlc1xyXG4gICAgICAgIGlmIChyZXN1bHQuZGlzdGFuY2VzLmxlbmd0aCA+IDApIHtcclxuICAgICAgICAgIGVkZ2UuZGF0YSh0aGlzLnN5bnRheFt0eXBlXVsnd2VpZ2h0J10sIHJlc3VsdC53ZWlnaHRzKTtcclxuICAgICAgICAgIGVkZ2UuZGF0YSh0aGlzLnN5bnRheFt0eXBlXVsnZGlzdGFuY2UnXSwgcmVzdWx0LmRpc3RhbmNlcyk7XHJcbiAgICAgICAgICBlZGdlLmFkZENsYXNzKHRoaXMuc3ludGF4W3R5cGVdWydjbGFzcyddKTtcclxuICAgICAgICAgIGlmIChyZXN1bHQuZGlzdGFuY2VzLmxlbmd0aCA+IDEpIHtcclxuICAgICAgICAgICAgZWRnZS5hZGRDbGFzcyh0aGlzLnN5bnRheFt0eXBlXVsnbXVsdGlDbGFzcyddKTtcclxuICAgICAgICAgIH1cclxuICAgICAgICB9XHJcbiAgICAgIH1cclxuICAgIH1cclxuICB9LFxyXG5cclxuICBpc0lnbm9yZWRFZGdlOiBmdW5jdGlvbihlZGdlKSB7XHJcblxyXG4gICAgdmFyIHN0YXJ0WCA9IGVkZ2Uuc291cmNlKCkucG9zaXRpb24oJ3gnKTtcclxuICAgIHZhciBzdGFydFkgPSBlZGdlLnNvdXJjZSgpLnBvc2l0aW9uKCd5Jyk7XHJcbiAgICB2YXIgZW5kWCA9IGVkZ2UudGFyZ2V0KCkucG9zaXRpb24oJ3gnKTtcclxuICAgIHZhciBlbmRZID0gZWRnZS50YXJnZXQoKS5wb3NpdGlvbigneScpO1xyXG4gICBcclxuICAgIGlmKChzdGFydFggPT0gZW5kWCAmJiBzdGFydFkgPT0gZW5kWSkgIHx8IChlZGdlLnNvdXJjZSgpLmlkKCkgPT0gZWRnZS50YXJnZXQoKS5pZCgpKSl7XHJcbiAgICAgIHJldHVybiB0cnVlO1xyXG4gICAgfVxyXG4gICAgZm9yKHZhciBpID0gMDsgdGhpcy5pZ25vcmVkQ2xhc3NlcyAmJiBpIDwgIHRoaXMuaWdub3JlZENsYXNzZXMubGVuZ3RoOyBpKyspe1xyXG4gICAgICBpZihlZGdlLmhhc0NsYXNzKHRoaXMuaWdub3JlZENsYXNzZXNbaV0pKVxyXG4gICAgICAgIHJldHVybiB0cnVlO1xyXG4gICAgfVxyXG4gICAgcmV0dXJuIGZhbHNlO1xyXG4gIH0sXHJcbiAgLy9HZXQgdGhlIGRpcmVjdGlvbiBvZiB0aGUgbGluZSBmcm9tIHNvdXJjZSBwb2ludCB0byB0aGUgdGFyZ2V0IHBvaW50XHJcbiAgZ2V0TGluZURpcmVjdGlvbjogZnVuY3Rpb24oc3JjUG9pbnQsIHRndFBvaW50KXtcclxuICAgIGlmKHNyY1BvaW50LnkgPT0gdGd0UG9pbnQueSAmJiBzcmNQb2ludC54IDwgdGd0UG9pbnQueCl7XHJcbiAgICAgIHJldHVybiAxO1xyXG4gICAgfVxyXG4gICAgaWYoc3JjUG9pbnQueSA8IHRndFBvaW50LnkgJiYgc3JjUG9pbnQueCA8IHRndFBvaW50Lngpe1xyXG4gICAgICByZXR1cm4gMjtcclxuICAgIH1cclxuICAgIGlmKHNyY1BvaW50LnkgPCB0Z3RQb2ludC55ICYmIHNyY1BvaW50LnggPT0gdGd0UG9pbnQueCl7XHJcbiAgICAgIHJldHVybiAzO1xyXG4gICAgfVxyXG4gICAgaWYoc3JjUG9pbnQueSA8IHRndFBvaW50LnkgJiYgc3JjUG9pbnQueCA+IHRndFBvaW50Lngpe1xyXG4gICAgICByZXR1cm4gNDtcclxuICAgIH1cclxuICAgIGlmKHNyY1BvaW50LnkgPT0gdGd0UG9pbnQueSAmJiBzcmNQb2ludC54ID4gdGd0UG9pbnQueCl7XHJcbiAgICAgIHJldHVybiA1O1xyXG4gICAgfVxyXG4gICAgaWYoc3JjUG9pbnQueSA+IHRndFBvaW50LnkgJiYgc3JjUG9pbnQueCA+IHRndFBvaW50Lngpe1xyXG4gICAgICByZXR1cm4gNjtcclxuICAgIH1cclxuICAgIGlmKHNyY1BvaW50LnkgPiB0Z3RQb2ludC55ICYmIHNyY1BvaW50LnggPT0gdGd0UG9pbnQueCl7XHJcbiAgICAgIHJldHVybiA3O1xyXG4gICAgfVxyXG4gICAgcmV0dXJuIDg7Ly9pZiBzcmNQb2ludC55ID4gdGd0UG9pbnQueSBhbmQgc3JjUG9pbnQueCA8IHRndFBvaW50LnhcclxuICB9LFxyXG4gIGdldFNyY1RndFBvaW50c0FuZFRhbmdlbnRzOiBmdW5jdGlvbiAoZWRnZSkge1xyXG4gICAgdmFyIHNvdXJjZU5vZGUgPSBlZGdlLnNvdXJjZSgpO1xyXG4gICAgdmFyIHRhcmdldE5vZGUgPSBlZGdlLnRhcmdldCgpO1xyXG4gICAgXHJcbiAgICB2YXIgdGd0UG9zaXRpb24gPSB0YXJnZXROb2RlLnBvc2l0aW9uKCk7XHJcbiAgICB2YXIgc3JjUG9zaXRpb24gPSBzb3VyY2VOb2RlLnBvc2l0aW9uKCk7XHJcbiAgICBcclxuICAgIHZhciBzcmNQb2ludCA9IHNvdXJjZU5vZGUucG9zaXRpb24oKTtcclxuICAgIHZhciB0Z3RQb2ludCA9IHRhcmdldE5vZGUucG9zaXRpb24oKTtcclxuXHJcblxyXG4gICAgdmFyIG0xID0gKHRndFBvaW50LnkgLSBzcmNQb2ludC55KSAvICh0Z3RQb2ludC54IC0gc3JjUG9pbnQueCk7XHJcbiAgICB2YXIgbTIgPSAtMSAvIG0xO1xyXG5cclxuICAgIHJldHVybiB7XHJcbiAgICAgIG0xOiBtMSxcclxuICAgICAgbTI6IG0yLFxyXG4gICAgICBzcmNQb2ludDogc3JjUG9pbnQsXHJcbiAgICAgIHRndFBvaW50OiB0Z3RQb2ludFxyXG4gICAgfTtcclxuICB9LFxyXG4gIGdldEludGVyc2VjdGlvbjogZnVuY3Rpb24oZWRnZSwgcG9pbnQsIHNyY1RndFBvaW50c0FuZFRhbmdlbnRzKXtcclxuICAgIGlmIChzcmNUZ3RQb2ludHNBbmRUYW5nZW50cyA9PT0gdW5kZWZpbmVkKSB7XHJcbiAgICAgIHNyY1RndFBvaW50c0FuZFRhbmdlbnRzID0gdGhpcy5nZXRTcmNUZ3RQb2ludHNBbmRUYW5nZW50cyhlZGdlKTtcclxuICAgIH1cclxuXHJcbiAgICB2YXIgc3JjUG9pbnQgPSBzcmNUZ3RQb2ludHNBbmRUYW5nZW50cy5zcmNQb2ludDtcclxuICAgIHZhciB0Z3RQb2ludCA9IHNyY1RndFBvaW50c0FuZFRhbmdlbnRzLnRndFBvaW50O1xyXG4gICAgdmFyIG0xID0gc3JjVGd0UG9pbnRzQW5kVGFuZ2VudHMubTE7XHJcbiAgICB2YXIgbTIgPSBzcmNUZ3RQb2ludHNBbmRUYW5nZW50cy5tMjtcclxuXHJcbiAgICB2YXIgaW50ZXJzZWN0WDtcclxuICAgIHZhciBpbnRlcnNlY3RZO1xyXG5cclxuICAgIGlmKG0xID09IEluZmluaXR5IHx8IG0xID09IC1JbmZpbml0eSl7XHJcbiAgICAgIGludGVyc2VjdFggPSBzcmNQb2ludC54O1xyXG4gICAgICBpbnRlcnNlY3RZID0gcG9pbnQueTtcclxuICAgIH1cclxuICAgIGVsc2UgaWYobTEgPT0gMCl7XHJcbiAgICAgIGludGVyc2VjdFggPSBwb2ludC54O1xyXG4gICAgICBpbnRlcnNlY3RZID0gc3JjUG9pbnQueTtcclxuICAgIH1cclxuICAgIGVsc2Uge1xyXG4gICAgICB2YXIgYTEgPSBzcmNQb2ludC55IC0gbTEgKiBzcmNQb2ludC54O1xyXG4gICAgICB2YXIgYTIgPSBwb2ludC55IC0gbTIgKiBwb2ludC54O1xyXG5cclxuICAgICAgaW50ZXJzZWN0WCA9IChhMiAtIGExKSAvIChtMSAtIG0yKTtcclxuICAgICAgaW50ZXJzZWN0WSA9IG0xICogaW50ZXJzZWN0WCArIGExO1xyXG4gICAgfVxyXG5cclxuICAgIC8vSW50ZXJzZWN0aW9uIHBvaW50IGlzIHRoZSBpbnRlcnNlY3Rpb24gb2YgdGhlIGxpbmVzIHBhc3NpbmcgdGhyb3VnaCB0aGUgbm9kZXMgYW5kXHJcbiAgICAvL3Bhc3NpbmcgdGhyb3VnaCB0aGUgYmVuZCBvciBjb250cm9sIHBvaW50IGFuZCBwZXJwZW5kaWN1bGFyIHRvIHRoZSBvdGhlciBsaW5lXHJcbiAgICB2YXIgaW50ZXJzZWN0aW9uUG9pbnQgPSB7XHJcbiAgICAgIHg6IGludGVyc2VjdFgsXHJcbiAgICAgIHk6IGludGVyc2VjdFlcclxuICAgIH07XHJcbiAgICBcclxuICAgIHJldHVybiBpbnRlcnNlY3Rpb25Qb2ludDtcclxuICB9LFxyXG4gIGdldEFuY2hvcnNBc0FycmF5OiBmdW5jdGlvbihlZGdlKSB7XHJcbiAgICB2YXIgdHlwZSA9IHRoaXMuZ2V0RWRnZVR5cGUoZWRnZSk7XHJcblxyXG4gICAgaWYodHlwZSA9PT0gJ2luY29uY2x1c2l2ZScpe1xyXG4gICAgICByZXR1cm4gdW5kZWZpbmVkO1xyXG4gICAgfVxyXG4gICAgXHJcbiAgICBpZiggZWRnZS5jc3MoJ2N1cnZlLXN0eWxlJykgIT09IHRoaXMuc3ludGF4W3R5cGVdWydlZGdlJ10gKSB7XHJcbiAgICAgIHJldHVybiB1bmRlZmluZWQ7XHJcbiAgICB9XHJcbiAgICBcclxuICAgIHZhciBhbmNob3JMaXN0ID0gW107XHJcblxyXG4gICAgdmFyIHdlaWdodHMgPSBlZGdlLnBzdHlsZSggdGhpcy5zeW50YXhbdHlwZV1bJ3dlaWdodENzcyddICkgPyBcclxuICAgICAgICAgICAgICAgICAgZWRnZS5wc3R5bGUoIHRoaXMuc3ludGF4W3R5cGVdWyd3ZWlnaHRDc3MnXSApLnBmVmFsdWUgOiBbXTtcclxuICAgIHZhciBkaXN0YW5jZXMgPSBlZGdlLnBzdHlsZSggdGhpcy5zeW50YXhbdHlwZV1bJ2Rpc3RhbmNlQ3NzJ10gKSA/IFxyXG4gICAgICAgICAgICAgICAgICBlZGdlLnBzdHlsZSggdGhpcy5zeW50YXhbdHlwZV1bJ2Rpc3RhbmNlQ3NzJ10gKS5wZlZhbHVlIDogW107XHJcbiAgICB2YXIgbWluTGVuZ3RocyA9IE1hdGgubWluKCB3ZWlnaHRzLmxlbmd0aCwgZGlzdGFuY2VzLmxlbmd0aCApO1xyXG4gICAgXHJcbiAgICB2YXIgc3JjUG9zID0gZWRnZS5zb3VyY2UoKS5wb3NpdGlvbigpO1xyXG4gICAgdmFyIHRndFBvcyA9IGVkZ2UudGFyZ2V0KCkucG9zaXRpb24oKTtcclxuXHJcbiAgICB2YXIgZHkgPSAoIHRndFBvcy55IC0gc3JjUG9zLnkgKTtcclxuICAgIHZhciBkeCA9ICggdGd0UG9zLnggLSBzcmNQb3MueCApO1xyXG4gICAgXHJcbiAgICB2YXIgbCA9IE1hdGguc3FydCggZHggKiBkeCArIGR5ICogZHkgKTtcclxuXHJcbiAgICB2YXIgdmVjdG9yID0ge1xyXG4gICAgICB4OiBkeCxcclxuICAgICAgeTogZHlcclxuICAgIH07XHJcblxyXG4gICAgdmFyIHZlY3Rvck5vcm0gPSB7XHJcbiAgICAgIHg6IHZlY3Rvci54IC8gbCxcclxuICAgICAgeTogdmVjdG9yLnkgLyBsXHJcbiAgICB9O1xyXG4gICAgXHJcbiAgICB2YXIgdmVjdG9yTm9ybUludmVyc2UgPSB7XHJcbiAgICAgIHg6IC12ZWN0b3JOb3JtLnksXHJcbiAgICAgIHk6IHZlY3Rvck5vcm0ueFxyXG4gICAgfTtcclxuXHJcbiAgICBmb3IoIHZhciBzID0gMDsgcyA8IG1pbkxlbmd0aHM7IHMrKyApe1xyXG4gICAgICB2YXIgdyA9IHdlaWdodHNbIHMgXTtcclxuICAgICAgdmFyIGQgPSBkaXN0YW5jZXNbIHMgXTtcclxuXHJcbiAgICAgIHZhciB3MSA9ICgxIC0gdyk7XHJcbiAgICAgIHZhciB3MiA9IHc7XHJcblxyXG4gICAgICB2YXIgcG9zUHRzID0ge1xyXG4gICAgICAgIHgxOiBzcmNQb3MueCxcclxuICAgICAgICB4MjogdGd0UG9zLngsXHJcbiAgICAgICAgeTE6IHNyY1Bvcy55LFxyXG4gICAgICAgIHkyOiB0Z3RQb3MueVxyXG4gICAgICB9O1xyXG5cclxuICAgICAgdmFyIG1pZHB0UHRzID0gcG9zUHRzO1xyXG4gICAgICBcclxuICAgICAgdmFyIGFkanVzdGVkTWlkcHQgPSB7XHJcbiAgICAgICAgeDogbWlkcHRQdHMueDEgKiB3MSArIG1pZHB0UHRzLngyICogdzIsXHJcbiAgICAgICAgeTogbWlkcHRQdHMueTEgKiB3MSArIG1pZHB0UHRzLnkyICogdzJcclxuICAgICAgfTtcclxuXHJcbiAgICAgIGFuY2hvckxpc3QucHVzaChcclxuICAgICAgICBhZGp1c3RlZE1pZHB0LnggKyB2ZWN0b3JOb3JtSW52ZXJzZS54ICogZCxcclxuICAgICAgICBhZGp1c3RlZE1pZHB0LnkgKyB2ZWN0b3JOb3JtSW52ZXJzZS55ICogZFxyXG4gICAgICApO1xyXG4gICAgfVxyXG4gICAgXHJcbiAgICByZXR1cm4gYW5jaG9yTGlzdDtcclxuICB9LFxyXG4gIGNvbnZlcnRUb1JlbGF0aXZlUG9zaXRpb246IGZ1bmN0aW9uIChlZGdlLCBwb2ludCwgc3JjVGd0UG9pbnRzQW5kVGFuZ2VudHMpIHtcclxuICAgIGlmIChzcmNUZ3RQb2ludHNBbmRUYW5nZW50cyA9PT0gdW5kZWZpbmVkKSB7XHJcbiAgICAgIHNyY1RndFBvaW50c0FuZFRhbmdlbnRzID0gdGhpcy5nZXRTcmNUZ3RQb2ludHNBbmRUYW5nZW50cyhlZGdlKTtcclxuICAgIH1cclxuICAgIFxyXG4gICAgdmFyIGludGVyc2VjdGlvblBvaW50ID0gdGhpcy5nZXRJbnRlcnNlY3Rpb24oZWRnZSwgcG9pbnQsIHNyY1RndFBvaW50c0FuZFRhbmdlbnRzKTtcclxuICAgIHZhciBpbnRlcnNlY3RYID0gaW50ZXJzZWN0aW9uUG9pbnQueDtcclxuICAgIHZhciBpbnRlcnNlY3RZID0gaW50ZXJzZWN0aW9uUG9pbnQueTtcclxuICAgIFxyXG4gICAgdmFyIHNyY1BvaW50ID0gc3JjVGd0UG9pbnRzQW5kVGFuZ2VudHMuc3JjUG9pbnQ7XHJcbiAgICB2YXIgdGd0UG9pbnQgPSBzcmNUZ3RQb2ludHNBbmRUYW5nZW50cy50Z3RQb2ludDtcclxuICAgIFxyXG4gICAgdmFyIHdlaWdodDtcclxuICAgIFxyXG4gICAgaWYoIGludGVyc2VjdFggIT0gc3JjUG9pbnQueCApIHtcclxuICAgICAgd2VpZ2h0ID0gKGludGVyc2VjdFggLSBzcmNQb2ludC54KSAvICh0Z3RQb2ludC54IC0gc3JjUG9pbnQueCk7XHJcbiAgICB9XHJcbiAgICBlbHNlIGlmKCBpbnRlcnNlY3RZICE9IHNyY1BvaW50LnkgKSB7XHJcbiAgICAgIHdlaWdodCA9IChpbnRlcnNlY3RZIC0gc3JjUG9pbnQueSkgLyAodGd0UG9pbnQueSAtIHNyY1BvaW50LnkpO1xyXG4gICAgfVxyXG4gICAgZWxzZSB7XHJcbiAgICAgIHdlaWdodCA9IDA7XHJcbiAgICB9XHJcbiAgICBcclxuICAgIHZhciBkaXN0YW5jZSA9IE1hdGguc3FydChNYXRoLnBvdygoaW50ZXJzZWN0WSAtIHBvaW50LnkpLCAyKVxyXG4gICAgICAgICsgTWF0aC5wb3coKGludGVyc2VjdFggLSBwb2ludC54KSwgMikpO1xyXG4gICAgXHJcbiAgICAvL0dldCB0aGUgZGlyZWN0aW9uIG9mIHRoZSBsaW5lIGZvcm0gc291cmNlIHBvaW50IHRvIHRhcmdldCBwb2ludFxyXG4gICAgdmFyIGRpcmVjdGlvbjEgPSB0aGlzLmdldExpbmVEaXJlY3Rpb24oc3JjUG9pbnQsIHRndFBvaW50KTtcclxuICAgIC8vR2V0IHRoZSBkaXJlY3Rpb24gb2YgdGhlIGxpbmUgZnJvbSBpbnRlc2VjdGlvbiBwb2ludCB0byB0aGUgcG9pbnRcclxuICAgIHZhciBkaXJlY3Rpb24yID0gdGhpcy5nZXRMaW5lRGlyZWN0aW9uKGludGVyc2VjdGlvblBvaW50LCBwb2ludCk7XHJcbiAgICBcclxuICAgIC8vSWYgdGhlIGRpZmZlcmVuY2UgaXMgbm90IC0yIGFuZCBub3QgNiB0aGVuIHRoZSBkaXJlY3Rpb24gb2YgdGhlIGRpc3RhbmNlIGlzIG5lZ2F0aXZlXHJcbiAgICBpZihkaXJlY3Rpb24xIC0gZGlyZWN0aW9uMiAhPSAtMiAmJiBkaXJlY3Rpb24xIC0gZGlyZWN0aW9uMiAhPSA2KXtcclxuICAgICAgaWYoZGlzdGFuY2UgIT0gMClcclxuICAgICAgICBkaXN0YW5jZSA9IC0xICogZGlzdGFuY2U7XHJcbiAgICB9XHJcbiAgICBcclxuICAgIHJldHVybiB7XHJcbiAgICAgIHdlaWdodDogd2VpZ2h0LFxyXG4gICAgICBkaXN0YW5jZTogZGlzdGFuY2VcclxuICAgIH07XHJcbiAgfSxcclxuICBjb252ZXJ0VG9SZWxhdGl2ZVBvc2l0aW9uczogZnVuY3Rpb24gKGVkZ2UsIGFuY2hvclBvaW50cykge1xyXG4gICAgdmFyIHNyY1RndFBvaW50c0FuZFRhbmdlbnRzID0gdGhpcy5nZXRTcmNUZ3RQb2ludHNBbmRUYW5nZW50cyhlZGdlKTtcclxuXHJcbiAgICB2YXIgd2VpZ2h0cyA9IFtdO1xyXG4gICAgdmFyIGRpc3RhbmNlcyA9IFtdO1xyXG5cclxuICAgIGZvciAodmFyIGkgPSAwOyBhbmNob3JQb2ludHMgJiYgaSA8IGFuY2hvclBvaW50cy5sZW5ndGg7IGkrKykge1xyXG4gICAgICB2YXIgYW5jaG9yID0gYW5jaG9yUG9pbnRzW2ldO1xyXG4gICAgICB2YXIgcmVsYXRpdmVBbmNob3JQb3NpdGlvbiA9IHRoaXMuY29udmVydFRvUmVsYXRpdmVQb3NpdGlvbihlZGdlLCBhbmNob3IsIHNyY1RndFBvaW50c0FuZFRhbmdlbnRzKTtcclxuXHJcbiAgICAgIHdlaWdodHMucHVzaChyZWxhdGl2ZUFuY2hvclBvc2l0aW9uLndlaWdodCk7XHJcbiAgICAgIGRpc3RhbmNlcy5wdXNoKHJlbGF0aXZlQW5jaG9yUG9zaXRpb24uZGlzdGFuY2UpO1xyXG4gICAgfVxyXG5cclxuICAgIHJldHVybiB7XHJcbiAgICAgIHdlaWdodHM6IHdlaWdodHMsXHJcbiAgICAgIGRpc3RhbmNlczogZGlzdGFuY2VzXHJcbiAgICB9O1xyXG4gIH0sXHJcbiAgZ2V0RGlzdGFuY2VzU3RyaW5nOiBmdW5jdGlvbiAoZWRnZSwgdHlwZSkge1xyXG4gICAgdmFyIHN0ciA9IFwiXCI7XHJcblxyXG4gICAgdmFyIGRpc3RhbmNlcyA9IGVkZ2UuZGF0YSh0aGlzLnN5bnRheFt0eXBlXVsnZGlzdGFuY2UnXSk7XHJcbiAgICBmb3IgKHZhciBpID0gMDsgZGlzdGFuY2VzICYmIGkgPCBkaXN0YW5jZXMubGVuZ3RoOyBpKyspIHtcclxuICAgICAgc3RyID0gc3RyICsgXCIgXCIgKyBkaXN0YW5jZXNbaV07XHJcbiAgICB9XHJcbiAgICBcclxuICAgIHJldHVybiBzdHI7XHJcbiAgfSxcclxuICBnZXRXZWlnaHRzU3RyaW5nOiBmdW5jdGlvbiAoZWRnZSwgdHlwZSkge1xyXG4gICAgdmFyIHN0ciA9IFwiXCI7XHJcblxyXG4gICAgdmFyIHdlaWdodHMgPSBlZGdlLmRhdGEodGhpcy5zeW50YXhbdHlwZV1bJ3dlaWdodCddKTtcclxuICAgIGZvciAodmFyIGkgPSAwOyB3ZWlnaHRzICYmIGkgPCB3ZWlnaHRzLmxlbmd0aDsgaSsrKSB7XHJcbiAgICAgIHN0ciA9IHN0ciArIFwiIFwiICsgd2VpZ2h0c1tpXTtcclxuICAgIH1cclxuICAgIFxyXG4gICAgcmV0dXJuIHN0cjtcclxuICB9LFxyXG4gIGFkZEFuY2hvclBvaW50OiBmdW5jdGlvbihlZGdlLCBuZXdBbmNob3JQb2ludCwgdHlwZSA9IHVuZGVmaW5lZCkge1xyXG4gICAgaWYoZWRnZSA9PT0gdW5kZWZpbmVkIHx8IG5ld0FuY2hvclBvaW50ID09PSB1bmRlZmluZWQpe1xyXG4gICAgICBlZGdlID0gdGhpcy5jdXJyZW50Q3R4RWRnZTtcclxuICAgICAgbmV3QW5jaG9yUG9pbnQgPSB0aGlzLmN1cnJlbnRDdHhQb3M7XHJcbiAgICB9XHJcbiAgXHJcbiAgICBpZih0eXBlID09PSB1bmRlZmluZWQpXHJcbiAgICAgIHR5cGUgPSB0aGlzLmdldEVkZ2VUeXBlKGVkZ2UpO1xyXG5cclxuICAgIHZhciB3ZWlnaHRTdHIgPSB0aGlzLnN5bnRheFt0eXBlXVsnd2VpZ2h0J107XHJcbiAgICB2YXIgZGlzdGFuY2VTdHIgPSB0aGlzLnN5bnRheFt0eXBlXVsnZGlzdGFuY2UnXTtcclxuXHJcbiAgICB2YXIgcmVsYXRpdmVQb3NpdGlvbiA9IHRoaXMuY29udmVydFRvUmVsYXRpdmVQb3NpdGlvbihlZGdlLCBuZXdBbmNob3JQb2ludCk7XHJcbiAgICB2YXIgb3JpZ2luYWxBbmNob3JXZWlnaHQgPSByZWxhdGl2ZVBvc2l0aW9uLndlaWdodDtcclxuICAgIFxyXG4gICAgdmFyIHN0YXJ0WCA9IGVkZ2Uuc291cmNlKCkucG9zaXRpb24oJ3gnKTtcclxuICAgIHZhciBzdGFydFkgPSBlZGdlLnNvdXJjZSgpLnBvc2l0aW9uKCd5Jyk7XHJcbiAgICB2YXIgZW5kWCA9IGVkZ2UudGFyZ2V0KCkucG9zaXRpb24oJ3gnKTtcclxuICAgIHZhciBlbmRZID0gZWRnZS50YXJnZXQoKS5wb3NpdGlvbigneScpO1xyXG4gICAgdmFyIHN0YXJ0V2VpZ2h0ID0gdGhpcy5jb252ZXJ0VG9SZWxhdGl2ZVBvc2l0aW9uKGVkZ2UsIHt4OiBzdGFydFgsIHk6IHN0YXJ0WX0pLndlaWdodDtcclxuICAgIHZhciBlbmRXZWlnaHQgPSB0aGlzLmNvbnZlcnRUb1JlbGF0aXZlUG9zaXRpb24oZWRnZSwge3g6IGVuZFgsIHk6IGVuZFl9KS53ZWlnaHQ7XHJcbiAgICB2YXIgd2VpZ2h0c1dpdGhUZ3RTcmMgPSBbc3RhcnRXZWlnaHRdLmNvbmNhdChlZGdlLmRhdGEod2VpZ2h0U3RyKT9lZGdlLmRhdGEod2VpZ2h0U3RyKTpbXSkuY29uY2F0KFtlbmRXZWlnaHRdKTtcclxuICAgIFxyXG4gICAgdmFyIGFuY2hvcnNMaXN0ID0gdGhpcy5nZXRBbmNob3JzQXNBcnJheShlZGdlKTtcclxuICAgIFxyXG4gICAgdmFyIG1pbkRpc3QgPSBJbmZpbml0eTtcclxuICAgIHZhciBpbnRlcnNlY3Rpb247XHJcbiAgICB2YXIgcHRzV2l0aFRndFNyYyA9IFtzdGFydFgsIHN0YXJ0WV1cclxuICAgICAgICAgICAgLmNvbmNhdChhbmNob3JzTGlzdD9hbmNob3JzTGlzdDpbXSlcclxuICAgICAgICAgICAgLmNvbmNhdChbZW5kWCwgZW5kWV0pO1xyXG4gICAgdmFyIG5ld0FuY2hvckluZGV4ID0gLTE7XHJcbiAgICBcclxuICAgIGZvcih2YXIgaSA9IDA7IGkgPCB3ZWlnaHRzV2l0aFRndFNyYy5sZW5ndGggLSAxOyBpKyspe1xyXG4gICAgICB2YXIgdzEgPSB3ZWlnaHRzV2l0aFRndFNyY1tpXTtcclxuICAgICAgdmFyIHcyID0gd2VpZ2h0c1dpdGhUZ3RTcmNbaSArIDFdO1xyXG4gICAgICBcclxuICAgICAgLy9jaGVjayBpZiB0aGUgd2VpZ2h0IGlzIGJldHdlZW4gdzEgYW5kIHcyXHJcbiAgICAgIGNvbnN0IGIxID0gdGhpcy5jb21wYXJlV2l0aFByZWNpc2lvbihvcmlnaW5hbEFuY2hvcldlaWdodCwgdzEsIHRydWUpO1xyXG4gICAgICBjb25zdCBiMiA9IHRoaXMuY29tcGFyZVdpdGhQcmVjaXNpb24ob3JpZ2luYWxBbmNob3JXZWlnaHQsIHcyKTtcclxuICAgICAgY29uc3QgYjMgPSB0aGlzLmNvbXBhcmVXaXRoUHJlY2lzaW9uKG9yaWdpbmFsQW5jaG9yV2VpZ2h0LCB3MiwgdHJ1ZSk7XHJcbiAgICAgIGNvbnN0IGI0ID0gdGhpcy5jb21wYXJlV2l0aFByZWNpc2lvbihvcmlnaW5hbEFuY2hvcldlaWdodCwgdzEpO1xyXG4gICAgICBpZiggKGIxICYmIGIyKSB8fCAoYjMgJiYgYjQpKXtcclxuICAgICAgICB2YXIgc3RhcnRYID0gcHRzV2l0aFRndFNyY1syICogaV07XHJcbiAgICAgICAgdmFyIHN0YXJ0WSA9IHB0c1dpdGhUZ3RTcmNbMiAqIGkgKyAxXTtcclxuICAgICAgICB2YXIgZW5kWCA9IHB0c1dpdGhUZ3RTcmNbMiAqIGkgKyAyXTtcclxuICAgICAgICB2YXIgZW5kWSA9IHB0c1dpdGhUZ3RTcmNbMiAqIGkgKyAzXTtcclxuICAgICAgICBcclxuICAgICAgICB2YXIgc3RhcnQgPSB7XHJcbiAgICAgICAgICB4OiBzdGFydFgsXHJcbiAgICAgICAgICB5OiBzdGFydFlcclxuICAgICAgICB9O1xyXG4gICAgICAgIFxyXG4gICAgICAgIHZhciBlbmQgPSB7XHJcbiAgICAgICAgICB4OiBlbmRYLFxyXG4gICAgICAgICAgeTogZW5kWVxyXG4gICAgICAgIH07XHJcbiAgICAgICAgXHJcbiAgICAgICAgdmFyIG0xID0gKCBzdGFydFkgLSBlbmRZICkgLyAoIHN0YXJ0WCAtIGVuZFggKTtcclxuICAgICAgICB2YXIgbTIgPSAtMSAvIG0xO1xyXG4gICAgICAgIFxyXG4gICAgICAgIHZhciBzcmNUZ3RQb2ludHNBbmRUYW5nZW50cyA9IHtcclxuICAgICAgICAgIHNyY1BvaW50OiBzdGFydCxcclxuICAgICAgICAgIHRndFBvaW50OiBlbmQsXHJcbiAgICAgICAgICBtMTogbTEsXHJcbiAgICAgICAgICBtMjogbTJcclxuICAgICAgICB9O1xyXG4gICAgICAgIFxyXG4gICAgICAgIHZhciBjdXJyZW50SW50ZXJzZWN0aW9uID0gdGhpcy5nZXRJbnRlcnNlY3Rpb24oZWRnZSwgbmV3QW5jaG9yUG9pbnQsIHNyY1RndFBvaW50c0FuZFRhbmdlbnRzKTtcclxuICAgICAgICB2YXIgZGlzdCA9IE1hdGguc3FydCggTWF0aC5wb3coIChuZXdBbmNob3JQb2ludC54IC0gY3VycmVudEludGVyc2VjdGlvbi54KSwgMiApIFxyXG4gICAgICAgICAgICAgICAgKyBNYXRoLnBvdyggKG5ld0FuY2hvclBvaW50LnkgLSBjdXJyZW50SW50ZXJzZWN0aW9uLnkpLCAyICkpO1xyXG4gICAgICAgIFxyXG4gICAgICAgIC8vVXBkYXRlIHRoZSBtaW5pbXVtIGRpc3RhbmNlXHJcbiAgICAgICAgaWYoZGlzdCA8IG1pbkRpc3Qpe1xyXG4gICAgICAgICAgbWluRGlzdCA9IGRpc3Q7XHJcbiAgICAgICAgICBpbnRlcnNlY3Rpb24gPSBjdXJyZW50SW50ZXJzZWN0aW9uO1xyXG4gICAgICAgICAgbmV3QW5jaG9ySW5kZXggPSBpO1xyXG4gICAgICAgIH1cclxuICAgICAgfVxyXG4gICAgfVxyXG4gICAgXHJcbiAgICBpZihpbnRlcnNlY3Rpb24gIT09IHVuZGVmaW5lZCl7XHJcbiAgICAgIG5ld0FuY2hvclBvaW50ID0gaW50ZXJzZWN0aW9uO1xyXG4gICAgfVxyXG4gICAgXHJcbiAgICByZWxhdGl2ZVBvc2l0aW9uID0gdGhpcy5jb252ZXJ0VG9SZWxhdGl2ZVBvc2l0aW9uKGVkZ2UsIG5ld0FuY2hvclBvaW50KTtcclxuICAgIFxyXG4gICAgaWYoaW50ZXJzZWN0aW9uID09PSB1bmRlZmluZWQpe1xyXG4gICAgICByZWxhdGl2ZVBvc2l0aW9uLmRpc3RhbmNlID0gMDtcclxuICAgIH1cclxuXHJcbiAgICB2YXIgd2VpZ2h0cyA9IGVkZ2UuZGF0YSh3ZWlnaHRTdHIpO1xyXG4gICAgdmFyIGRpc3RhbmNlcyA9IGVkZ2UuZGF0YShkaXN0YW5jZVN0cik7XHJcbiAgICBcclxuICAgIHdlaWdodHMgPSB3ZWlnaHRzP3dlaWdodHM6W107XHJcbiAgICBkaXN0YW5jZXMgPSBkaXN0YW5jZXM/ZGlzdGFuY2VzOltdO1xyXG4gICAgXHJcbiAgICBpZih3ZWlnaHRzLmxlbmd0aCA9PT0gMCkge1xyXG4gICAgICBuZXdBbmNob3JJbmRleCA9IDA7XHJcbiAgICB9XHJcbiAgICBcclxuLy8gICAgd2VpZ2h0cy5wdXNoKHJlbGF0aXZlQmVuZFBvc2l0aW9uLndlaWdodCk7XHJcbi8vICAgIGRpc3RhbmNlcy5wdXNoKHJlbGF0aXZlQmVuZFBvc2l0aW9uLmRpc3RhbmNlKTtcclxuICAgIGlmKG5ld0FuY2hvckluZGV4ICE9IC0xKXtcclxuICAgICAgd2VpZ2h0cy5zcGxpY2UobmV3QW5jaG9ySW5kZXgsIDAsIHJlbGF0aXZlUG9zaXRpb24ud2VpZ2h0KTtcclxuICAgICAgZGlzdGFuY2VzLnNwbGljZShuZXdBbmNob3JJbmRleCwgMCwgcmVsYXRpdmVQb3NpdGlvbi5kaXN0YW5jZSk7XHJcbiAgICB9XHJcbiAgIFxyXG4gICAgZWRnZS5kYXRhKHdlaWdodFN0ciwgd2VpZ2h0cyk7XHJcbiAgICBlZGdlLmRhdGEoZGlzdGFuY2VTdHIsIGRpc3RhbmNlcyk7XHJcbiAgICBcclxuICAgIGVkZ2UuYWRkQ2xhc3ModGhpcy5zeW50YXhbdHlwZV1bJ2NsYXNzJ10pO1xyXG4gICAgaWYgKHdlaWdodHMubGVuZ3RoID4gMSB8fCBkaXN0YW5jZXMubGVuZ3RoID4gMSkge1xyXG4gICAgICBlZGdlLmFkZENsYXNzKHRoaXMuc3ludGF4W3R5cGVdWydtdWx0aUNsYXNzJ10pO1xyXG4gICAgfVxyXG4gICAgXHJcbiAgICByZXR1cm4gbmV3QW5jaG9ySW5kZXg7XHJcbiAgfSxcclxuICByZW1vdmVBbmNob3I6IGZ1bmN0aW9uKGVkZ2UsIGFuY2hvckluZGV4KXtcclxuICAgIGlmKGVkZ2UgPT09IHVuZGVmaW5lZCB8fCBhbmNob3JJbmRleCA9PT0gdW5kZWZpbmVkKXtcclxuICAgICAgZWRnZSA9IHRoaXMuY3VycmVudEN0eEVkZ2U7XHJcbiAgICAgIGFuY2hvckluZGV4ID0gdGhpcy5jdXJyZW50QW5jaG9ySW5kZXg7XHJcbiAgICB9XHJcbiAgICBcclxuICAgIHZhciB0eXBlID0gdGhpcy5nZXRFZGdlVHlwZShlZGdlKTtcclxuXHJcbiAgICBpZih0aGlzLmVkZ2VUeXBlSW5jb25jbHVzaXZlU2hvdWxkbnRIYXBwZW4odHlwZSwgXCJhbmNob3JQb2ludFV0aWxpdGllcy5qcywgcmVtb3ZlQW5jaG9yXCIpKXtcclxuICAgICAgcmV0dXJuO1xyXG4gICAgfVxyXG5cclxuICAgIHZhciBkaXN0YW5jZVN0ciA9IHRoaXMuc3ludGF4W3R5cGVdWyd3ZWlnaHQnXTtcclxuICAgIHZhciB3ZWlnaHRTdHIgPSB0aGlzLnN5bnRheFt0eXBlXVsnZGlzdGFuY2UnXTtcclxuICAgIHZhciBwb3NpdGlvbkRhdGFTdHIgPSB0aGlzLnN5bnRheFt0eXBlXVsncG9pbnRQb3MnXTtcclxuXHJcbiAgICB2YXIgZGlzdGFuY2VzID0gZWRnZS5kYXRhKGRpc3RhbmNlU3RyKTtcclxuICAgIHZhciB3ZWlnaHRzID0gZWRnZS5kYXRhKHdlaWdodFN0cik7XHJcbiAgICB2YXIgcG9zaXRpb25zID0gZWRnZS5kYXRhKHBvc2l0aW9uRGF0YVN0cik7XHJcblxyXG4gICAgZGlzdGFuY2VzLnNwbGljZShhbmNob3JJbmRleCwgMSk7XHJcbiAgICB3ZWlnaHRzLnNwbGljZShhbmNob3JJbmRleCwgMSk7XHJcbiAgICAvLyBwb3NpdGlvbiBkYXRhIGlzIG5vdCBnaXZlbiBpbiBkZW1vIHNvIGl0IHRocm93cyBlcnJvciBoZXJlXHJcbiAgICAvLyBidXQgaXQgc2hvdWxkIGJlIGZyb20gdGhlIGJlZ2lubmluZ1xyXG4gICAgaWYgKHBvc2l0aW9ucylcclxuICAgICAgcG9zaXRpb25zLnNwbGljZShhbmNob3JJbmRleCwgMSk7XHJcblxyXG4gICAgLy8gb25seSBvbmUgYW5jaG9yIHBvaW50IGxlZnQgb24gZWRnZVxyXG4gICAgaWYgKGRpc3RhbmNlcy5sZW5ndGggPT0gMSB8fCB3ZWlnaHRzLmxlbmd0aCA9PSAxKSB7XHJcbiAgICAgIGVkZ2UucmVtb3ZlQ2xhc3ModGhpcy5zeW50YXhbdHlwZV1bJ211bHRpQ2xhc3MnXSlcclxuICAgIH1cclxuICAgIC8vIG5vIG1vcmUgYW5jaG9yIHBvaW50cyBvbiBlZGdlXHJcbiAgICBlbHNlIGlmKGRpc3RhbmNlcy5sZW5ndGggPT0gMCB8fCB3ZWlnaHRzLmxlbmd0aCA9PSAwKXtcclxuICAgICAgZWRnZS5yZW1vdmVDbGFzcyh0aGlzLnN5bnRheFt0eXBlXVsnY2xhc3MnXSk7XHJcbiAgICAgIGVkZ2UuZGF0YShkaXN0YW5jZVN0ciwgW10pO1xyXG4gICAgICBlZGdlLmRhdGEod2VpZ2h0U3RyLCBbXSk7XHJcbiAgICB9XHJcbiAgICBlbHNlIHtcclxuICAgICAgZWRnZS5kYXRhKGRpc3RhbmNlU3RyLCBkaXN0YW5jZXMpO1xyXG4gICAgICBlZGdlLmRhdGEod2VpZ2h0U3RyLCB3ZWlnaHRzKTtcclxuICAgIH1cclxuICB9LFxyXG4gIHJlbW92ZUFsbEFuY2hvcnM6IGZ1bmN0aW9uKGVkZ2UpIHtcclxuICAgIGlmIChlZGdlID09PSB1bmRlZmluZWQpIHtcclxuICAgICAgZWRnZSA9IHRoaXMuY3VycmVudEN0eEVkZ2U7XHJcbiAgICB9XHJcbiAgICB2YXIgdHlwZSA9IHRoaXMuZ2V0RWRnZVR5cGUoZWRnZSk7XHJcbiAgICBcclxuICAgIGlmKHRoaXMuZWRnZVR5cGVJbmNvbmNsdXNpdmVTaG91bGRudEhhcHBlbih0eXBlLCBcImFuY2hvclBvaW50VXRpbGl0aWVzLmpzLCByZW1vdmVBbGxBbmNob3JzXCIpKXtcclxuICAgICAgcmV0dXJuO1xyXG4gICAgfVxyXG5cclxuICAgIC8vIFJlbW92ZSBjbGFzc2VzIGZyb20gZWRnZVxyXG4gICAgZWRnZS5yZW1vdmVDbGFzcyh0aGlzLnN5bnRheFt0eXBlXVsnY2xhc3MnXSk7XHJcbiAgICBlZGdlLnJlbW92ZUNsYXNzKHRoaXMuc3ludGF4W3R5cGVdWydtdWx0aUNsYXNzJ10pO1xyXG5cclxuICAgIC8vIFJlbW92ZSBhbGwgYW5jaG9yIHBvaW50IGRhdGEgZnJvbSBlZGdlXHJcbiAgICB2YXIgZGlzdGFuY2VTdHIgPSB0aGlzLnN5bnRheFt0eXBlXVsnd2VpZ2h0J107XHJcbiAgICB2YXIgd2VpZ2h0U3RyID0gdGhpcy5zeW50YXhbdHlwZV1bJ2Rpc3RhbmNlJ107XHJcbiAgICB2YXIgcG9zaXRpb25EYXRhU3RyID0gdGhpcy5zeW50YXhbdHlwZV1bJ3BvaW50UG9zJ107XHJcbiAgICBlZGdlLmRhdGEoZGlzdGFuY2VTdHIsIFtdKTtcclxuICAgIGVkZ2UuZGF0YSh3ZWlnaHRTdHIsIFtdKTtcclxuICAgIC8vIHBvc2l0aW9uIGRhdGEgaXMgbm90IGdpdmVuIGluIGRlbW8gc28gaXQgdGhyb3dzIGVycm9yIGhlcmVcclxuICAgIC8vIGJ1dCBpdCBzaG91bGQgYmUgZnJvbSB0aGUgYmVnaW5uaW5nXHJcbiAgICBpZiAoZWRnZS5kYXRhKHBvc2l0aW9uRGF0YVN0cikpIHtcclxuICAgICAgZWRnZS5kYXRhKHBvc2l0aW9uRGF0YVN0ciwgW10pO1xyXG4gICAgfVxyXG4gIH0sXHJcbiAgY2FsY3VsYXRlRGlzdGFuY2U6IGZ1bmN0aW9uKHB0MSwgcHQyKSB7XHJcbiAgICB2YXIgZGlmZlggPSBwdDEueCAtIHB0Mi54O1xyXG4gICAgdmFyIGRpZmZZID0gcHQxLnkgLSBwdDIueTtcclxuICAgIFxyXG4gICAgdmFyIGRpc3QgPSBNYXRoLnNxcnQoIE1hdGgucG93KCBkaWZmWCwgMiApICsgTWF0aC5wb3coIGRpZmZZLCAyICkgKTtcclxuICAgIHJldHVybiBkaXN0O1xyXG4gIH0sXHJcbiAgLyoqIChMZXNzIHRoYW4gb3IgZXF1YWwgdG8pIGFuZCAoZ3JlYXRlciB0aGVuIGVxdWFsIHRvKSBjb21wYXJpc29ucyB3aXRoIGZsb2F0aW5nIHBvaW50IG51bWJlcnMgKi9cclxuICBjb21wYXJlV2l0aFByZWNpc2lvbjogZnVuY3Rpb24gKG4xLCBuMiwgaXNMZXNzVGhlbk9yRXF1YWwgPSBmYWxzZSwgcHJlY2lzaW9uID0gMC4wMSkge1xyXG4gICAgY29uc3QgZGlmZiA9IG4xIC0gbjI7XHJcbiAgICBpZiAoTWF0aC5hYnMoZGlmZikgPD0gcHJlY2lzaW9uKSB7XHJcbiAgICAgIHJldHVybiB0cnVlO1xyXG4gICAgfVxyXG4gICAgaWYgKGlzTGVzc1RoZW5PckVxdWFsKSB7XHJcbiAgICAgIHJldHVybiBuMSA8IG4yO1xyXG4gICAgfSBlbHNlIHtcclxuICAgICAgcmV0dXJuIG4xID4gbjI7XHJcbiAgICB9XHJcbiAgfSxcclxuICBlZGdlVHlwZUluY29uY2x1c2l2ZVNob3VsZG50SGFwcGVuOiBmdW5jdGlvbih0eXBlLCBwbGFjZSl7XHJcbiAgICBpZih0eXBlID09PSAnaW5jb25jbHVzaXZlJykge1xyXG4gICAgICBjb25zb2xlLmxvZyhgSW4gJHtwbGFjZX06IGVkZ2UgdHlwZSBpbmNvbmNsdXNpdmUgc2hvdWxkIG5ldmVyIGhhcHBlbiBoZXJlISFgKTtcclxuICAgICAgcmV0dXJuIHRydWU7XHJcbiAgICB9XHJcbiAgICByZXR1cm4gZmFsc2U7XHJcbiAgfVxyXG59O1xyXG5cclxubW9kdWxlLmV4cG9ydHMgPSBhbmNob3JQb2ludFV0aWxpdGllcztcclxuIiwidmFyIGRlYm91bmNlID0gKGZ1bmN0aW9uICgpIHtcclxuICAvKipcclxuICAgKiBsb2Rhc2ggMy4xLjEgKEN1c3RvbSBCdWlsZCkgPGh0dHBzOi8vbG9kYXNoLmNvbS8+XHJcbiAgICogQnVpbGQ6IGBsb2Rhc2ggbW9kZXJuIG1vZHVsYXJpemUgZXhwb3J0cz1cIm5wbVwiIC1vIC4vYFxyXG4gICAqIENvcHlyaWdodCAyMDEyLTIwMTUgVGhlIERvam8gRm91bmRhdGlvbiA8aHR0cDovL2Rvam9mb3VuZGF0aW9uLm9yZy8+XHJcbiAgICogQmFzZWQgb24gVW5kZXJzY29yZS5qcyAxLjguMyA8aHR0cDovL3VuZGVyc2NvcmVqcy5vcmcvTElDRU5TRT5cclxuICAgKiBDb3B5cmlnaHQgMjAwOS0yMDE1IEplcmVteSBBc2hrZW5hcywgRG9jdW1lbnRDbG91ZCBhbmQgSW52ZXN0aWdhdGl2ZSBSZXBvcnRlcnMgJiBFZGl0b3JzXHJcbiAgICogQXZhaWxhYmxlIHVuZGVyIE1JVCBsaWNlbnNlIDxodHRwczovL2xvZGFzaC5jb20vbGljZW5zZT5cclxuICAgKi9cclxuICAvKiogVXNlZCBhcyB0aGUgYFR5cGVFcnJvcmAgbWVzc2FnZSBmb3IgXCJGdW5jdGlvbnNcIiBtZXRob2RzLiAqL1xyXG4gIHZhciBGVU5DX0VSUk9SX1RFWFQgPSAnRXhwZWN0ZWQgYSBmdW5jdGlvbic7XHJcblxyXG4gIC8qIE5hdGl2ZSBtZXRob2QgcmVmZXJlbmNlcyBmb3IgdGhvc2Ugd2l0aCB0aGUgc2FtZSBuYW1lIGFzIG90aGVyIGBsb2Rhc2hgIG1ldGhvZHMuICovXHJcbiAgdmFyIG5hdGl2ZU1heCA9IE1hdGgubWF4LFxyXG4gICAgICAgICAgbmF0aXZlTm93ID0gRGF0ZS5ub3c7XHJcblxyXG4gIC8qKlxyXG4gICAqIEdldHMgdGhlIG51bWJlciBvZiBtaWxsaXNlY29uZHMgdGhhdCBoYXZlIGVsYXBzZWQgc2luY2UgdGhlIFVuaXggZXBvY2hcclxuICAgKiAoMSBKYW51YXJ5IDE5NzAgMDA6MDA6MDAgVVRDKS5cclxuICAgKlxyXG4gICAqIEBzdGF0aWNcclxuICAgKiBAbWVtYmVyT2YgX1xyXG4gICAqIEBjYXRlZ29yeSBEYXRlXHJcbiAgICogQGV4YW1wbGVcclxuICAgKlxyXG4gICAqIF8uZGVmZXIoZnVuY3Rpb24oc3RhbXApIHtcclxuICAgKiAgIGNvbnNvbGUubG9nKF8ubm93KCkgLSBzdGFtcCk7XHJcbiAgICogfSwgXy5ub3coKSk7XHJcbiAgICogLy8gPT4gbG9ncyB0aGUgbnVtYmVyIG9mIG1pbGxpc2Vjb25kcyBpdCB0b29rIGZvciB0aGUgZGVmZXJyZWQgZnVuY3Rpb24gdG8gYmUgaW52b2tlZFxyXG4gICAqL1xyXG4gIHZhciBub3cgPSBuYXRpdmVOb3cgfHwgZnVuY3Rpb24gKCkge1xyXG4gICAgcmV0dXJuIG5ldyBEYXRlKCkuZ2V0VGltZSgpO1xyXG4gIH07XHJcblxyXG4gIC8qKlxyXG4gICAqIENyZWF0ZXMgYSBkZWJvdW5jZWQgZnVuY3Rpb24gdGhhdCBkZWxheXMgaW52b2tpbmcgYGZ1bmNgIHVudGlsIGFmdGVyIGB3YWl0YFxyXG4gICAqIG1pbGxpc2Vjb25kcyBoYXZlIGVsYXBzZWQgc2luY2UgdGhlIGxhc3QgdGltZSB0aGUgZGVib3VuY2VkIGZ1bmN0aW9uIHdhc1xyXG4gICAqIGludm9rZWQuIFRoZSBkZWJvdW5jZWQgZnVuY3Rpb24gY29tZXMgd2l0aCBhIGBjYW5jZWxgIG1ldGhvZCB0byBjYW5jZWxcclxuICAgKiBkZWxheWVkIGludm9jYXRpb25zLiBQcm92aWRlIGFuIG9wdGlvbnMgb2JqZWN0IHRvIGluZGljYXRlIHRoYXQgYGZ1bmNgXHJcbiAgICogc2hvdWxkIGJlIGludm9rZWQgb24gdGhlIGxlYWRpbmcgYW5kL29yIHRyYWlsaW5nIGVkZ2Ugb2YgdGhlIGB3YWl0YCB0aW1lb3V0LlxyXG4gICAqIFN1YnNlcXVlbnQgY2FsbHMgdG8gdGhlIGRlYm91bmNlZCBmdW5jdGlvbiByZXR1cm4gdGhlIHJlc3VsdCBvZiB0aGUgbGFzdFxyXG4gICAqIGBmdW5jYCBpbnZvY2F0aW9uLlxyXG4gICAqXHJcbiAgICogKipOb3RlOioqIElmIGBsZWFkaW5nYCBhbmQgYHRyYWlsaW5nYCBvcHRpb25zIGFyZSBgdHJ1ZWAsIGBmdW5jYCBpcyBpbnZva2VkXHJcbiAgICogb24gdGhlIHRyYWlsaW5nIGVkZ2Ugb2YgdGhlIHRpbWVvdXQgb25seSBpZiB0aGUgdGhlIGRlYm91bmNlZCBmdW5jdGlvbiBpc1xyXG4gICAqIGludm9rZWQgbW9yZSB0aGFuIG9uY2UgZHVyaW5nIHRoZSBgd2FpdGAgdGltZW91dC5cclxuICAgKlxyXG4gICAqIFNlZSBbRGF2aWQgQ29yYmFjaG8ncyBhcnRpY2xlXShodHRwOi8vZHJ1cGFsbW90aW9uLmNvbS9hcnRpY2xlL2RlYm91bmNlLWFuZC10aHJvdHRsZS12aXN1YWwtZXhwbGFuYXRpb24pXHJcbiAgICogZm9yIGRldGFpbHMgb3ZlciB0aGUgZGlmZmVyZW5jZXMgYmV0d2VlbiBgXy5kZWJvdW5jZWAgYW5kIGBfLnRocm90dGxlYC5cclxuICAgKlxyXG4gICAqIEBzdGF0aWNcclxuICAgKiBAbWVtYmVyT2YgX1xyXG4gICAqIEBjYXRlZ29yeSBGdW5jdGlvblxyXG4gICAqIEBwYXJhbSB7RnVuY3Rpb259IGZ1bmMgVGhlIGZ1bmN0aW9uIHRvIGRlYm91bmNlLlxyXG4gICAqIEBwYXJhbSB7bnVtYmVyfSBbd2FpdD0wXSBUaGUgbnVtYmVyIG9mIG1pbGxpc2Vjb25kcyB0byBkZWxheS5cclxuICAgKiBAcGFyYW0ge09iamVjdH0gW29wdGlvbnNdIFRoZSBvcHRpb25zIG9iamVjdC5cclxuICAgKiBAcGFyYW0ge2Jvb2xlYW59IFtvcHRpb25zLmxlYWRpbmc9ZmFsc2VdIFNwZWNpZnkgaW52b2tpbmcgb24gdGhlIGxlYWRpbmdcclxuICAgKiAgZWRnZSBvZiB0aGUgdGltZW91dC5cclxuICAgKiBAcGFyYW0ge251bWJlcn0gW29wdGlvbnMubWF4V2FpdF0gVGhlIG1heGltdW0gdGltZSBgZnVuY2AgaXMgYWxsb3dlZCB0byBiZVxyXG4gICAqICBkZWxheWVkIGJlZm9yZSBpdCdzIGludm9rZWQuXHJcbiAgICogQHBhcmFtIHtib29sZWFufSBbb3B0aW9ucy50cmFpbGluZz10cnVlXSBTcGVjaWZ5IGludm9raW5nIG9uIHRoZSB0cmFpbGluZ1xyXG4gICAqICBlZGdlIG9mIHRoZSB0aW1lb3V0LlxyXG4gICAqIEByZXR1cm5zIHtGdW5jdGlvbn0gUmV0dXJucyB0aGUgbmV3IGRlYm91bmNlZCBmdW5jdGlvbi5cclxuICAgKiBAZXhhbXBsZVxyXG4gICAqXHJcbiAgICogLy8gYXZvaWQgY29zdGx5IGNhbGN1bGF0aW9ucyB3aGlsZSB0aGUgd2luZG93IHNpemUgaXMgaW4gZmx1eFxyXG4gICAqIGpRdWVyeSh3aW5kb3cpLm9uKCdyZXNpemUnLCBfLmRlYm91bmNlKGNhbGN1bGF0ZUxheW91dCwgMTUwKSk7XHJcbiAgICpcclxuICAgKiAvLyBpbnZva2UgYHNlbmRNYWlsYCB3aGVuIHRoZSBjbGljayBldmVudCBpcyBmaXJlZCwgZGVib3VuY2luZyBzdWJzZXF1ZW50IGNhbGxzXHJcbiAgICogalF1ZXJ5KCcjcG9zdGJveCcpLm9uKCdjbGljaycsIF8uZGVib3VuY2Uoc2VuZE1haWwsIDMwMCwge1xyXG4gICAqICAgJ2xlYWRpbmcnOiB0cnVlLFxyXG4gICAqICAgJ3RyYWlsaW5nJzogZmFsc2VcclxuICAgKiB9KSk7XHJcbiAgICpcclxuICAgKiAvLyBlbnN1cmUgYGJhdGNoTG9nYCBpcyBpbnZva2VkIG9uY2UgYWZ0ZXIgMSBzZWNvbmQgb2YgZGVib3VuY2VkIGNhbGxzXHJcbiAgICogdmFyIHNvdXJjZSA9IG5ldyBFdmVudFNvdXJjZSgnL3N0cmVhbScpO1xyXG4gICAqIGpRdWVyeShzb3VyY2UpLm9uKCdtZXNzYWdlJywgXy5kZWJvdW5jZShiYXRjaExvZywgMjUwLCB7XHJcbiAgICogICAnbWF4V2FpdCc6IDEwMDBcclxuICAgKiB9KSk7XHJcbiAgICpcclxuICAgKiAvLyBjYW5jZWwgYSBkZWJvdW5jZWQgY2FsbFxyXG4gICAqIHZhciB0b2RvQ2hhbmdlcyA9IF8uZGVib3VuY2UoYmF0Y2hMb2csIDEwMDApO1xyXG4gICAqIE9iamVjdC5vYnNlcnZlKG1vZGVscy50b2RvLCB0b2RvQ2hhbmdlcyk7XHJcbiAgICpcclxuICAgKiBPYmplY3Qub2JzZXJ2ZShtb2RlbHMsIGZ1bmN0aW9uKGNoYW5nZXMpIHtcclxuICAgKiAgIGlmIChfLmZpbmQoY2hhbmdlcywgeyAndXNlcic6ICd0b2RvJywgJ3R5cGUnOiAnZGVsZXRlJ30pKSB7XHJcbiAgICogICAgIHRvZG9DaGFuZ2VzLmNhbmNlbCgpO1xyXG4gICAqICAgfVxyXG4gICAqIH0sIFsnZGVsZXRlJ10pO1xyXG4gICAqXHJcbiAgICogLy8gLi4uYXQgc29tZSBwb2ludCBgbW9kZWxzLnRvZG9gIGlzIGNoYW5nZWRcclxuICAgKiBtb2RlbHMudG9kby5jb21wbGV0ZWQgPSB0cnVlO1xyXG4gICAqXHJcbiAgICogLy8gLi4uYmVmb3JlIDEgc2Vjb25kIGhhcyBwYXNzZWQgYG1vZGVscy50b2RvYCBpcyBkZWxldGVkXHJcbiAgICogLy8gd2hpY2ggY2FuY2VscyB0aGUgZGVib3VuY2VkIGB0b2RvQ2hhbmdlc2AgY2FsbFxyXG4gICAqIGRlbGV0ZSBtb2RlbHMudG9kbztcclxuICAgKi9cclxuICBmdW5jdGlvbiBkZWJvdW5jZShmdW5jLCB3YWl0LCBvcHRpb25zKSB7XHJcbiAgICB2YXIgYXJncyxcclxuICAgICAgICAgICAgbWF4VGltZW91dElkLFxyXG4gICAgICAgICAgICByZXN1bHQsXHJcbiAgICAgICAgICAgIHN0YW1wLFxyXG4gICAgICAgICAgICB0aGlzQXJnLFxyXG4gICAgICAgICAgICB0aW1lb3V0SWQsXHJcbiAgICAgICAgICAgIHRyYWlsaW5nQ2FsbCxcclxuICAgICAgICAgICAgbGFzdENhbGxlZCA9IDAsXHJcbiAgICAgICAgICAgIG1heFdhaXQgPSBmYWxzZSxcclxuICAgICAgICAgICAgdHJhaWxpbmcgPSB0cnVlO1xyXG5cclxuICAgIGlmICh0eXBlb2YgZnVuYyAhPSAnZnVuY3Rpb24nKSB7XHJcbiAgICAgIHRocm93IG5ldyBUeXBlRXJyb3IoRlVOQ19FUlJPUl9URVhUKTtcclxuICAgIH1cclxuICAgIHdhaXQgPSB3YWl0IDwgMCA/IDAgOiAoK3dhaXQgfHwgMCk7XHJcbiAgICBpZiAob3B0aW9ucyA9PT0gdHJ1ZSkge1xyXG4gICAgICB2YXIgbGVhZGluZyA9IHRydWU7XHJcbiAgICAgIHRyYWlsaW5nID0gZmFsc2U7XHJcbiAgICB9IGVsc2UgaWYgKGlzT2JqZWN0KG9wdGlvbnMpKSB7XHJcbiAgICAgIGxlYWRpbmcgPSAhIW9wdGlvbnMubGVhZGluZztcclxuICAgICAgbWF4V2FpdCA9ICdtYXhXYWl0JyBpbiBvcHRpb25zICYmIG5hdGl2ZU1heCgrb3B0aW9ucy5tYXhXYWl0IHx8IDAsIHdhaXQpO1xyXG4gICAgICB0cmFpbGluZyA9ICd0cmFpbGluZycgaW4gb3B0aW9ucyA/ICEhb3B0aW9ucy50cmFpbGluZyA6IHRyYWlsaW5nO1xyXG4gICAgfVxyXG5cclxuICAgIGZ1bmN0aW9uIGNhbmNlbCgpIHtcclxuICAgICAgaWYgKHRpbWVvdXRJZCkge1xyXG4gICAgICAgIGNsZWFyVGltZW91dCh0aW1lb3V0SWQpO1xyXG4gICAgICB9XHJcbiAgICAgIGlmIChtYXhUaW1lb3V0SWQpIHtcclxuICAgICAgICBjbGVhclRpbWVvdXQobWF4VGltZW91dElkKTtcclxuICAgICAgfVxyXG4gICAgICBsYXN0Q2FsbGVkID0gMDtcclxuICAgICAgbWF4VGltZW91dElkID0gdGltZW91dElkID0gdHJhaWxpbmdDYWxsID0gdW5kZWZpbmVkO1xyXG4gICAgfVxyXG5cclxuICAgIGZ1bmN0aW9uIGNvbXBsZXRlKGlzQ2FsbGVkLCBpZCkge1xyXG4gICAgICBpZiAoaWQpIHtcclxuICAgICAgICBjbGVhclRpbWVvdXQoaWQpO1xyXG4gICAgICB9XHJcbiAgICAgIG1heFRpbWVvdXRJZCA9IHRpbWVvdXRJZCA9IHRyYWlsaW5nQ2FsbCA9IHVuZGVmaW5lZDtcclxuICAgICAgaWYgKGlzQ2FsbGVkKSB7XHJcbiAgICAgICAgbGFzdENhbGxlZCA9IG5vdygpO1xyXG4gICAgICAgIHJlc3VsdCA9IGZ1bmMuYXBwbHkodGhpc0FyZywgYXJncyk7XHJcbiAgICAgICAgaWYgKCF0aW1lb3V0SWQgJiYgIW1heFRpbWVvdXRJZCkge1xyXG4gICAgICAgICAgYXJncyA9IHRoaXNBcmcgPSB1bmRlZmluZWQ7XHJcbiAgICAgICAgfVxyXG4gICAgICB9XHJcbiAgICB9XHJcblxyXG4gICAgZnVuY3Rpb24gZGVsYXllZCgpIHtcclxuICAgICAgdmFyIHJlbWFpbmluZyA9IHdhaXQgLSAobm93KCkgLSBzdGFtcCk7XHJcbiAgICAgIGlmIChyZW1haW5pbmcgPD0gMCB8fCByZW1haW5pbmcgPiB3YWl0KSB7XHJcbiAgICAgICAgY29tcGxldGUodHJhaWxpbmdDYWxsLCBtYXhUaW1lb3V0SWQpO1xyXG4gICAgICB9IGVsc2Uge1xyXG4gICAgICAgIHRpbWVvdXRJZCA9IHNldFRpbWVvdXQoZGVsYXllZCwgcmVtYWluaW5nKTtcclxuICAgICAgfVxyXG4gICAgfVxyXG5cclxuICAgIGZ1bmN0aW9uIG1heERlbGF5ZWQoKSB7XHJcbiAgICAgIGNvbXBsZXRlKHRyYWlsaW5nLCB0aW1lb3V0SWQpO1xyXG4gICAgfVxyXG5cclxuICAgIGZ1bmN0aW9uIGRlYm91bmNlZCgpIHtcclxuICAgICAgYXJncyA9IGFyZ3VtZW50cztcclxuICAgICAgc3RhbXAgPSBub3coKTtcclxuICAgICAgdGhpc0FyZyA9IHRoaXM7XHJcbiAgICAgIHRyYWlsaW5nQ2FsbCA9IHRyYWlsaW5nICYmICh0aW1lb3V0SWQgfHwgIWxlYWRpbmcpO1xyXG5cclxuICAgICAgaWYgKG1heFdhaXQgPT09IGZhbHNlKSB7XHJcbiAgICAgICAgdmFyIGxlYWRpbmdDYWxsID0gbGVhZGluZyAmJiAhdGltZW91dElkO1xyXG4gICAgICB9IGVsc2Uge1xyXG4gICAgICAgIGlmICghbWF4VGltZW91dElkICYmICFsZWFkaW5nKSB7XHJcbiAgICAgICAgICBsYXN0Q2FsbGVkID0gc3RhbXA7XHJcbiAgICAgICAgfVxyXG4gICAgICAgIHZhciByZW1haW5pbmcgPSBtYXhXYWl0IC0gKHN0YW1wIC0gbGFzdENhbGxlZCksXHJcbiAgICAgICAgICAgICAgICBpc0NhbGxlZCA9IHJlbWFpbmluZyA8PSAwIHx8IHJlbWFpbmluZyA+IG1heFdhaXQ7XHJcblxyXG4gICAgICAgIGlmIChpc0NhbGxlZCkge1xyXG4gICAgICAgICAgaWYgKG1heFRpbWVvdXRJZCkge1xyXG4gICAgICAgICAgICBtYXhUaW1lb3V0SWQgPSBjbGVhclRpbWVvdXQobWF4VGltZW91dElkKTtcclxuICAgICAgICAgIH1cclxuICAgICAgICAgIGxhc3RDYWxsZWQgPSBzdGFtcDtcclxuICAgICAgICAgIHJlc3VsdCA9IGZ1bmMuYXBwbHkodGhpc0FyZywgYXJncyk7XHJcbiAgICAgICAgfVxyXG4gICAgICAgIGVsc2UgaWYgKCFtYXhUaW1lb3V0SWQpIHtcclxuICAgICAgICAgIG1heFRpbWVvdXRJZCA9IHNldFRpbWVvdXQobWF4RGVsYXllZCwgcmVtYWluaW5nKTtcclxuICAgICAgICB9XHJcbiAgICAgIH1cclxuICAgICAgaWYgKGlzQ2FsbGVkICYmIHRpbWVvdXRJZCkge1xyXG4gICAgICAgIHRpbWVvdXRJZCA9IGNsZWFyVGltZW91dCh0aW1lb3V0SWQpO1xyXG4gICAgICB9XHJcbiAgICAgIGVsc2UgaWYgKCF0aW1lb3V0SWQgJiYgd2FpdCAhPT0gbWF4V2FpdCkge1xyXG4gICAgICAgIHRpbWVvdXRJZCA9IHNldFRpbWVvdXQoZGVsYXllZCwgd2FpdCk7XHJcbiAgICAgIH1cclxuICAgICAgaWYgKGxlYWRpbmdDYWxsKSB7XHJcbiAgICAgICAgaXNDYWxsZWQgPSB0cnVlO1xyXG4gICAgICAgIHJlc3VsdCA9IGZ1bmMuYXBwbHkodGhpc0FyZywgYXJncyk7XHJcbiAgICAgIH1cclxuICAgICAgaWYgKGlzQ2FsbGVkICYmICF0aW1lb3V0SWQgJiYgIW1heFRpbWVvdXRJZCkge1xyXG4gICAgICAgIGFyZ3MgPSB0aGlzQXJnID0gdW5kZWZpbmVkO1xyXG4gICAgICB9XHJcbiAgICAgIHJldHVybiByZXN1bHQ7XHJcbiAgICB9XHJcblxyXG4gICAgZGVib3VuY2VkLmNhbmNlbCA9IGNhbmNlbDtcclxuICAgIHJldHVybiBkZWJvdW5jZWQ7XHJcbiAgfVxyXG5cclxuICAvKipcclxuICAgKiBDaGVja3MgaWYgYHZhbHVlYCBpcyB0aGUgW2xhbmd1YWdlIHR5cGVdKGh0dHBzOi8vZXM1LmdpdGh1Yi5pby8jeDgpIG9mIGBPYmplY3RgLlxyXG4gICAqIChlLmcuIGFycmF5cywgZnVuY3Rpb25zLCBvYmplY3RzLCByZWdleGVzLCBgbmV3IE51bWJlcigwKWAsIGFuZCBgbmV3IFN0cmluZygnJylgKVxyXG4gICAqXHJcbiAgICogQHN0YXRpY1xyXG4gICAqIEBtZW1iZXJPZiBfXHJcbiAgICogQGNhdGVnb3J5IExhbmdcclxuICAgKiBAcGFyYW0geyp9IHZhbHVlIFRoZSB2YWx1ZSB0byBjaGVjay5cclxuICAgKiBAcmV0dXJucyB7Ym9vbGVhbn0gUmV0dXJucyBgdHJ1ZWAgaWYgYHZhbHVlYCBpcyBhbiBvYmplY3QsIGVsc2UgYGZhbHNlYC5cclxuICAgKiBAZXhhbXBsZVxyXG4gICAqXHJcbiAgICogXy5pc09iamVjdCh7fSk7XHJcbiAgICogLy8gPT4gdHJ1ZVxyXG4gICAqXHJcbiAgICogXy5pc09iamVjdChbMSwgMiwgM10pO1xyXG4gICAqIC8vID0+IHRydWVcclxuICAgKlxyXG4gICAqIF8uaXNPYmplY3QoMSk7XHJcbiAgICogLy8gPT4gZmFsc2VcclxuICAgKi9cclxuICBmdW5jdGlvbiBpc09iamVjdCh2YWx1ZSkge1xyXG4gICAgLy8gQXZvaWQgYSBWOCBKSVQgYnVnIGluIENocm9tZSAxOS0yMC5cclxuICAgIC8vIFNlZSBodHRwczovL2NvZGUuZ29vZ2xlLmNvbS9wL3Y4L2lzc3Vlcy9kZXRhaWw/aWQ9MjI5MSBmb3IgbW9yZSBkZXRhaWxzLlxyXG4gICAgdmFyIHR5cGUgPSB0eXBlb2YgdmFsdWU7XHJcbiAgICByZXR1cm4gISF2YWx1ZSAmJiAodHlwZSA9PSAnb2JqZWN0JyB8fCB0eXBlID09ICdmdW5jdGlvbicpO1xyXG4gIH1cclxuXHJcbiAgcmV0dXJuIGRlYm91bmNlO1xyXG5cclxufSkoKTtcclxuXHJcbm1vZHVsZS5leHBvcnRzID0gZGVib3VuY2U7IiwiOyhmdW5jdGlvbigpeyAndXNlIHN0cmljdCc7XHJcbiAgXHJcbiAgdmFyIGFuY2hvclBvaW50VXRpbGl0aWVzID0gcmVxdWlyZSgnLi9BbmNob3JQb2ludFV0aWxpdGllcycpO1xyXG4gIHZhciBkZWJvdW5jZSA9IHJlcXVpcmUoXCIuL2RlYm91bmNlXCIpO1xyXG4gIFxyXG4gIC8vIHJlZ2lzdGVycyB0aGUgZXh0ZW5zaW9uIG9uIGEgY3l0b3NjYXBlIGxpYiByZWZcclxuICB2YXIgcmVnaXN0ZXIgPSBmdW5jdGlvbiggY3l0b3NjYXBlLCAkLCBLb252YSl7XHJcbiAgICB2YXIgdWlVdGlsaXRpZXMgPSByZXF1aXJlKCcuL1VJVXRpbGl0aWVzJyk7XHJcbiAgICBcclxuICAgIGlmKCAhY3l0b3NjYXBlIHx8ICEkIHx8ICFLb252YSl7IHJldHVybjsgfSAvLyBjYW4ndCByZWdpc3RlciBpZiByZXF1aXJlZCBsaWJyYXJpZXMgdW5zcGVjaWZpZWRcclxuXHJcbiAgICB2YXIgZGVmYXVsdHMgPSB7XHJcbiAgICAgIC8vIHRoaXMgZnVuY3Rpb24gc3BlY2lmaWVzIHRoZSBwb2l0aW9ucyBvZiBiZW5kIHBvaW50c1xyXG4gICAgICAvLyBzdHJpY3RseSBuYW1lIHRoZSBwcm9wZXJ0eSAnYmVuZFBvaW50UG9zaXRpb25zJyBmb3IgdGhlIGVkZ2UgdG8gYmUgZGV0ZWN0ZWQgZm9yIGJlbmQgcG9pbnQgZWRpdGl0bmdcclxuICAgICAgYmVuZFBvc2l0aW9uc0Z1bmN0aW9uOiBmdW5jdGlvbihlbGUpIHtcclxuICAgICAgICByZXR1cm4gZWxlLmRhdGEoJ2JlbmRQb2ludFBvc2l0aW9ucycpO1xyXG4gICAgICB9LFxyXG4gICAgICAvLyB0aGlzIGZ1bmN0aW9uIHNwZWNpZmllcyB0aGUgcG9pdGlvbnMgb2YgY29udHJvbCBwb2ludHNcclxuICAgICAgLy8gc3RyaWN0bHkgbmFtZSB0aGUgcHJvcGVydHkgJ2NvbnRyb2xQb2ludFBvc2l0aW9ucycgZm9yIHRoZSBlZGdlIHRvIGJlIGRldGVjdGVkIGZvciBjb250cm9sIHBvaW50IGVkaXRpdG5nXHJcbiAgICAgIGNvbnRyb2xQb3NpdGlvbnNGdW5jdGlvbjogZnVuY3Rpb24oZWxlKSB7XHJcbiAgICAgICAgcmV0dXJuIGVsZS5kYXRhKCdjb250cm9sUG9pbnRQb3NpdGlvbnMnKTtcclxuICAgICAgfSxcclxuICAgICAgLy8gd2hldGhlciB0byBpbml0aWxpemUgYmVuZCBhbmQgY29udHJvbCBwb2ludHMgb24gY3JlYXRpb24gb2YgdGhpcyBleHRlbnNpb24gYXV0b21hdGljYWxseVxyXG4gICAgICBpbml0QW5jaG9yc0F1dG9tYXRpY2FsbHk6IHRydWUsXHJcbiAgICAgIC8vIHRoZSBjbGFzc2VzIG9mIHRob3NlIGVkZ2VzIHRoYXQgc2hvdWxkIGJlIGlnbm9yZWRcclxuICAgICAgaWdub3JlZENsYXNzZXM6IFtdLFxyXG4gICAgICAvLyB3aGV0aGVyIHRoZSBiZW5kIGFuZCBjb250cm9sIGVkaXRpbmcgb3BlcmF0aW9ucyBhcmUgdW5kb2FibGUgKHJlcXVpcmVzIGN5dG9zY2FwZS11bmRvLXJlZG8uanMpXHJcbiAgICAgIHVuZG9hYmxlOiBmYWxzZSxcclxuICAgICAgLy8gdGhlIHNpemUgb2YgYmVuZCBhbmQgY29udHJvbCBwb2ludCBzaGFwZSBpcyBvYnRhaW5lZCBieSBtdWx0aXBsaW5nIHdpZHRoIG9mIGVkZ2Ugd2l0aCB0aGlzIHBhcmFtZXRlclxyXG4gICAgICBhbmNob3JTaGFwZVNpemVGYWN0b3I6IDMsXHJcbiAgICAgIC8vIHotaW5kZXggdmFsdWUgb2YgdGhlIGNhbnZhcyBpbiB3aGljaCBiZW5kIGFuZCBjb250cm9sIHBvaW50cyBhcmUgZHJhd25cclxuICAgICAgekluZGV4OiA5OTksICAgICAgXHJcbiAgICAgIC8vIHdoZXRoZXIgdG8gc3RhcnQgdGhlIHBsdWdpbiBpbiB0aGUgZW5hYmxlZCBzdGF0ZVxyXG4gICAgICBlbmFibGVkOiB0cnVlLFxyXG4gICAgICAvL0FuIG9wdGlvbiB0aGF0IGNvbnRyb2xzIHRoZSBkaXN0YW5jZSB3aXRoaW4gd2hpY2ggYSBiZW5kIHBvaW50IGlzIGNvbnNpZGVyZWQgXCJuZWFyXCIgdGhlIGxpbmUgc2VnbWVudCBiZXR3ZWVuIGl0cyB0d28gbmVpZ2hib3JzIGFuZCB3aWxsIGJlIGF1dG9tYXRpY2FsbHkgcmVtb3ZlZFxyXG4gICAgICBiZW5kUmVtb3ZhbFNlbnNpdGl2aXR5IDogOCxcclxuICAgICAgLy8gdGl0bGUgb2YgYWRkIGJlbmQgcG9pbnQgbWVudSBpdGVtIChVc2VyIG1heSBuZWVkIHRvIGFkanVzdCB3aWR0aCBvZiBtZW51IGl0ZW1zIGFjY29yZGluZyB0byBsZW5ndGggb2YgdGhpcyBvcHRpb24pXHJcbiAgICAgIGFkZEJlbmRNZW51SXRlbVRpdGxlOiBcIkFkZCBCZW5kIFBvaW50XCIsXHJcbiAgICAgIC8vIHRpdGxlIG9mIHJlbW92ZSBiZW5kIHBvaW50IG1lbnUgaXRlbSAoVXNlciBtYXkgbmVlZCB0byBhZGp1c3Qgd2lkdGggb2YgbWVudSBpdGVtcyBhY2NvcmRpbmcgdG8gbGVuZ3RoIG9mIHRoaXMgb3B0aW9uKVxyXG4gICAgICByZW1vdmVCZW5kTWVudUl0ZW1UaXRsZTogXCJSZW1vdmUgQmVuZCBQb2ludFwiLFxyXG4gICAgICAvLyB0aXRsZSBvZiByZW1vdmUgYWxsIGJlbmQgcG9pbnRzIG1lbnUgaXRlbVxyXG4gICAgICByZW1vdmVBbGxCZW5kTWVudUl0ZW1UaXRsZTogXCJSZW1vdmUgQWxsIEJlbmQgUG9pbnRzXCIsXHJcbiAgICAgIC8vIHRpdGxlIG9mIGFkZCBjb250cm9sIHBvaW50IG1lbnUgaXRlbSAoVXNlciBtYXkgbmVlZCB0byBhZGp1c3Qgd2lkdGggb2YgbWVudSBpdGVtcyBhY2NvcmRpbmcgdG8gbGVuZ3RoIG9mIHRoaXMgb3B0aW9uKVxyXG4gICAgICBhZGRDb250cm9sTWVudUl0ZW1UaXRsZTogXCJBZGQgQ29udHJvbCBQb2ludFwiLFxyXG4gICAgICAvLyB0aXRsZSBvZiByZW1vdmUgY29udHJvbCBwb2ludCBtZW51IGl0ZW0gKFVzZXIgbWF5IG5lZWQgdG8gYWRqdXN0IHdpZHRoIG9mIG1lbnUgaXRlbXMgYWNjb3JkaW5nIHRvIGxlbmd0aCBvZiB0aGlzIG9wdGlvbilcclxuICAgICAgcmVtb3ZlQ29udHJvbE1lbnVJdGVtVGl0bGU6IFwiUmVtb3ZlIENvbnRyb2wgUG9pbnRcIixcclxuICAgICAgLy8gdGl0bGUgb2YgcmVtb3ZlIGFsbCBjb250cm9sIHBvaW50cyBtZW51IGl0ZW1cclxuICAgICAgcmVtb3ZlQWxsQ29udHJvbE1lbnVJdGVtVGl0bGU6IFwiUmVtb3ZlIEFsbCBDb250cm9sIFBvaW50c1wiLFxyXG4gICAgICAvLyB3aGV0aGVyIHRoZSBiZW5kIGFuZCBjb250cm9sIHBvaW50cyBjYW4gYmUgbW92ZWQgYnkgYXJyb3dzXHJcbiAgICAgIG1vdmVTZWxlY3RlZEFuY2hvcnNPbktleUV2ZW50czogZnVuY3Rpb24gKCkge1xyXG4gICAgICAgICAgcmV0dXJuIHRydWU7XHJcbiAgICAgIH0sXHJcbiAgICAgIC8vIHdoZXRoZXIgJ1JlbW92ZSBhbGwgYmVuZCBwb2ludHMnIGFuZCAnUmVtb3ZlIGFsbCBjb250cm9sIHBvaW50cycgb3B0aW9ucyBzaG91bGQgYmUgcHJlc2VudGVkXHJcbiAgICAgIGVuYWJsZU11bHRpcGxlQW5jaG9yUmVtb3ZhbE9wdGlvbjogZmFsc2VcclxuICAgIH07XHJcbiAgICBcclxuICAgIHZhciBvcHRpb25zO1xyXG4gICAgdmFyIGluaXRpYWxpemVkID0gZmFsc2U7XHJcbiAgICBcclxuICAgIC8vIE1lcmdlIGRlZmF1bHQgb3B0aW9ucyB3aXRoIHRoZSBvbmVzIGNvbWluZyBmcm9tIHBhcmFtZXRlclxyXG4gICAgZnVuY3Rpb24gZXh0ZW5kKGRlZmF1bHRzLCBvcHRpb25zKSB7XHJcbiAgICAgIHZhciBvYmogPSB7fTtcclxuXHJcbiAgICAgIGZvciAodmFyIGkgaW4gZGVmYXVsdHMpIHtcclxuICAgICAgICBvYmpbaV0gPSBkZWZhdWx0c1tpXTtcclxuICAgICAgfVxyXG5cclxuICAgICAgZm9yICh2YXIgaSBpbiBvcHRpb25zKSB7XHJcbiAgICAgICAgLy8gU1BMSVQgRlVOQ1RJT05BTElUWT9cclxuICAgICAgICBpZihpID09IFwiYmVuZFJlbW92YWxTZW5zaXRpdml0eVwiKXtcclxuICAgICAgICAgIHZhciB2YWx1ZSA9IG9wdGlvbnNbaV07XHJcbiAgICAgICAgICAgaWYoIWlzTmFOKHZhbHVlKSlcclxuICAgICAgICAgICB7XHJcbiAgICAgICAgICAgICAgaWYodmFsdWUgPj0gMCAmJiB2YWx1ZSA8PSAyMCl7XHJcbiAgICAgICAgICAgICAgICBvYmpbaV0gPSBvcHRpb25zW2ldO1xyXG4gICAgICAgICAgICAgIH1lbHNlIGlmKHZhbHVlIDwgMCl7XHJcbiAgICAgICAgICAgICAgICBvYmpbaV0gPSAwXHJcbiAgICAgICAgICAgICAgfWVsc2V7XHJcbiAgICAgICAgICAgICAgICBvYmpbaV0gPSAyMFxyXG4gICAgICAgICAgICAgIH1cclxuICAgICAgICAgICB9XHJcbiAgICAgICAgfWVsc2V7XHJcbiAgICAgICAgICBvYmpbaV0gPSBvcHRpb25zW2ldO1xyXG4gICAgICAgIH1cclxuXHJcbiAgICAgIH1cclxuXHJcbiAgICAgIHJldHVybiBvYmo7XHJcbiAgICB9O1xyXG4gICAgXHJcbiAgICBjeXRvc2NhcGUoICdjb3JlJywgJ2VkZ2VFZGl0aW5nJywgZnVuY3Rpb24ob3B0cyl7XHJcbiAgICAgIHZhciBjeSA9IHRoaXM7XHJcbiAgICAgIFxyXG4gICAgICBpZiggb3B0cyA9PT0gJ2luaXRpYWxpemVkJyApIHtcclxuICAgICAgICByZXR1cm4gaW5pdGlhbGl6ZWQ7XHJcbiAgICAgIH1cclxuICAgICAgXHJcbiAgICAgIGlmKCBvcHRzICE9PSAnZ2V0JyApIHtcclxuICAgICAgICAvLyBtZXJnZSB0aGUgb3B0aW9ucyB3aXRoIGRlZmF1bHQgb25lc1xyXG4gICAgICAgIG9wdGlvbnMgPSBleHRlbmQoZGVmYXVsdHMsIG9wdHMpO1xyXG4gICAgICAgIGluaXRpYWxpemVkID0gdHJ1ZTtcclxuXHJcbiAgICAgICAgLy8gZGVmaW5lIGVkZ2ViZW5kZWRpdGluZy1oYXNiZW5kcG9pbnRzIGNzcyBjbGFzc1xyXG4gICAgICAgIGN5LnN0eWxlKCkuc2VsZWN0b3IoJy5lZGdlYmVuZGVkaXRpbmctaGFzYmVuZHBvaW50cycpLmNzcyh7XHJcbiAgICAgICAgICAnY3VydmUtc3R5bGUnOiAnc2VnbWVudHMnLFxyXG4gICAgICAgICAgJ3NlZ21lbnQtZGlzdGFuY2VzJzogZnVuY3Rpb24gKGVsZSkge1xyXG4gICAgICAgICAgICByZXR1cm4gYW5jaG9yUG9pbnRVdGlsaXRpZXMuZ2V0RGlzdGFuY2VzU3RyaW5nKGVsZSwgJ2JlbmQnKTtcclxuICAgICAgICAgIH0sXHJcbiAgICAgICAgICAnc2VnbWVudC13ZWlnaHRzJzogZnVuY3Rpb24gKGVsZSkge1xyXG4gICAgICAgICAgICByZXR1cm4gYW5jaG9yUG9pbnRVdGlsaXRpZXMuZ2V0V2VpZ2h0c1N0cmluZyhlbGUsICdiZW5kJyk7XHJcbiAgICAgICAgICB9LFxyXG4gICAgICAgICAgJ2VkZ2UtZGlzdGFuY2VzJzogJ25vZGUtcG9zaXRpb24nXHJcbiAgICAgICAgfSk7XHJcblxyXG4gICAgICAgIC8vIGRlZmluZSBlZGdlY29udHJvbGVkaXRpbmctaGFzY29udHJvbHBvaW50cyBjc3MgY2xhc3NcclxuICAgICAgICBjeS5zdHlsZSgpLnNlbGVjdG9yKCcuZWRnZWNvbnRyb2xlZGl0aW5nLWhhc2NvbnRyb2xwb2ludHMnKS5jc3Moe1xyXG4gICAgICAgICAgJ2N1cnZlLXN0eWxlJzogJ3VuYnVuZGxlZC1iZXppZXInLFxyXG4gICAgICAgICAgJ2NvbnRyb2wtcG9pbnQtZGlzdGFuY2VzJzogZnVuY3Rpb24gKGVsZSkge1xyXG4gICAgICAgICAgICByZXR1cm4gYW5jaG9yUG9pbnRVdGlsaXRpZXMuZ2V0RGlzdGFuY2VzU3RyaW5nKGVsZSwgJ2NvbnRyb2wnKTtcclxuICAgICAgICAgIH0sXHJcbiAgICAgICAgICAnY29udHJvbC1wb2ludC13ZWlnaHRzJzogZnVuY3Rpb24gKGVsZSkge1xyXG4gICAgICAgICAgICByZXR1cm4gYW5jaG9yUG9pbnRVdGlsaXRpZXMuZ2V0V2VpZ2h0c1N0cmluZyhlbGUsICdjb250cm9sJyk7XHJcbiAgICAgICAgICB9LFxyXG4gICAgICAgICAgJ2VkZ2UtZGlzdGFuY2VzJzogJ25vZGUtcG9zaXRpb24nXHJcbiAgICAgICAgfSk7XHJcblxyXG4gICAgICAgIGFuY2hvclBvaW50VXRpbGl0aWVzLnNldElnbm9yZWRDbGFzc2VzKG9wdGlvbnMuaWdub3JlZENsYXNzZXMpO1xyXG5cclxuICAgICAgICAvLyBpbml0IGJlbmQgcG9zaXRpb25zIGNvbmRpdGlvbmFsbHlcclxuICAgICAgICBpZiAob3B0aW9ucy5pbml0QW5jaG9yc0F1dG9tYXRpY2FsbHkpIHtcclxuICAgICAgICAgIC8vIENIRUNLIFRISVMsIG9wdGlvbnMuaWdub3JlZENsYXNzZXMgVU5VU0VEXHJcbiAgICAgICAgICBhbmNob3JQb2ludFV0aWxpdGllcy5pbml0QW5jaG9yUG9pbnRzKG9wdGlvbnMuYmVuZFBvc2l0aW9uc0Z1bmN0aW9uLCBvcHRpb25zLmNvbnRyb2xQb3NpdGlvbnNGdW5jdGlvbiwgY3kuZWRnZXMoKSwgb3B0aW9ucy5pZ25vcmVkQ2xhc3Nlcyk7XHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICBpZihvcHRpb25zLmVuYWJsZWQpXHJcbiAgICAgICAgICB1aVV0aWxpdGllcyhvcHRpb25zLCBjeSk7XHJcbiAgICAgICAgZWxzZVxyXG4gICAgICAgICAgdWlVdGlsaXRpZXMoXCJ1bmJpbmRcIiwgY3kpO1xyXG4gICAgICB9XHJcbiAgICAgIFxyXG4gICAgICB2YXIgaW5zdGFuY2UgPSBpbml0aWFsaXplZCA/IHtcclxuICAgICAgICAvKlxyXG4gICAgICAgICogZ2V0IGJlbmQgb3IgY29udHJvbCBwb2ludHMgb2YgdGhlIGdpdmVuIGVkZ2UgaW4gYW4gYXJyYXkgQSxcclxuICAgICAgICAqIEFbMiAqIGldIGlzIHRoZSB4IGNvb3JkaW5hdGUgYW5kIEFbMiAqIGkgKyAxXSBpcyB0aGUgeSBjb29yZGluYXRlXHJcbiAgICAgICAgKiBvZiB0aGUgaXRoIGJlbmQgcG9pbnQuIChSZXR1cm5zIHVuZGVmaW5lZCBpZiB0aGUgY3VydmUgc3R5bGUgaXMgbm90IHNlZ21lbnRzIG5vciB1bmJ1bmRsZWQgYmV6aWVyKVxyXG4gICAgICAgICovXHJcbiAgICAgICAgZ2V0QW5jaG9yc0FzQXJyYXk6IGZ1bmN0aW9uKGVsZSkge1xyXG4gICAgICAgICAgcmV0dXJuIGFuY2hvclBvaW50VXRpbGl0aWVzLmdldEFuY2hvcnNBc0FycmF5KGVsZSk7XHJcbiAgICAgICAgfSxcclxuICAgICAgICAvLyBJbml0aWxpemUgcG9pbnRzIGZvciB0aGUgZ2l2ZW4gZWRnZXMgdXNpbmcgJ29wdGlvbnMuYmVuZFBvc2l0aW9uc0Z1bmN0aW9uJ1xyXG4gICAgICAgIGluaXRBbmNob3JQb2ludHM6IGZ1bmN0aW9uKGVsZXMpIHtcclxuICAgICAgICAgIGFuY2hvclBvaW50VXRpbGl0aWVzLmluaXRBbmNob3JQb2ludHMob3B0aW9ucy5iZW5kUG9zaXRpb25zRnVuY3Rpb24sIG9wdGlvbnMuY29udHJvbFBvc2l0aW9uc0Z1bmN0aW9uLCBlbGVzKTtcclxuICAgICAgICB9LFxyXG4gICAgICAgIGRlbGV0ZVNlbGVjdGVkQW5jaG9yOiBmdW5jdGlvbihlbGUsIGluZGV4KSB7XHJcbiAgICAgICAgICBhbmNob3JQb2ludFV0aWxpdGllcy5yZW1vdmVBbmNob3IoZWxlLCBpbmRleCk7XHJcbiAgICAgICAgfVxyXG4gICAgICB9IDogdW5kZWZpbmVkO1xyXG5cclxuICAgICAgcmV0dXJuIGluc3RhbmNlOyAvLyBjaGFpbmFiaWxpdHlcclxuICAgIH0gKTtcclxuXHJcbiAgfTtcclxuXHJcbiAgaWYoIHR5cGVvZiBtb2R1bGUgIT09ICd1bmRlZmluZWQnICYmIG1vZHVsZS5leHBvcnRzICl7IC8vIGV4cG9zZSBhcyBhIGNvbW1vbmpzIG1vZHVsZVxyXG4gICAgbW9kdWxlLmV4cG9ydHMgPSByZWdpc3RlcjtcclxuICB9XHJcblxyXG4gIGlmKCB0eXBlb2YgZGVmaW5lICE9PSAndW5kZWZpbmVkJyAmJiBkZWZpbmUuYW1kICl7IC8vIGV4cG9zZSBhcyBhbiBhbWQvcmVxdWlyZWpzIG1vZHVsZVxyXG4gICAgZGVmaW5lKCdjeXRvc2NhcGUtZWRnZS1lZGl0aW5nJywgZnVuY3Rpb24oKXtcclxuICAgICAgcmV0dXJuIHJlZ2lzdGVyO1xyXG4gICAgfSk7XHJcbiAgfVxyXG5cclxuICBpZiggdHlwZW9mIGN5dG9zY2FwZSAhPT0gJ3VuZGVmaW5lZCcgJiYgJCAmJiBLb252YSl7IC8vIGV4cG9zZSB0byBnbG9iYWwgY3l0b3NjYXBlIChpLmUuIHdpbmRvdy5jeXRvc2NhcGUpXHJcbiAgICByZWdpc3RlciggY3l0b3NjYXBlLCAkLCBLb252YSApO1xyXG4gIH1cclxuXHJcbn0pKCk7XHJcbiIsInZhciBkZWJvdW5jZSA9IHJlcXVpcmUoJy4vZGVib3VuY2UnKTtcclxudmFyIGFuY2hvclBvaW50VXRpbGl0aWVzID0gcmVxdWlyZSgnLi9BbmNob3JQb2ludFV0aWxpdGllcycpO1xyXG52YXIgcmVjb25uZWN0aW9uVXRpbGl0aWVzID0gcmVxdWlyZSgnLi9yZWNvbm5lY3Rpb25VdGlsaXRpZXMnKTtcclxudmFyIHJlZ2lzdGVyVW5kb1JlZG9GdW5jdGlvbnMgPSByZXF1aXJlKCcuL3JlZ2lzdGVyVW5kb1JlZG9GdW5jdGlvbnMnKTtcclxudmFyIHN0YWdlSWQgPSAwO1xyXG5cclxubW9kdWxlLmV4cG9ydHMgPSBmdW5jdGlvbiAocGFyYW1zLCBjeSkge1xyXG4gIHZhciBmbiA9IHBhcmFtcztcclxuXHJcbiAgdmFyIGFkZEJlbmRQb2ludEN4dE1lbnVJZCA9ICdjeS1lZGdlLWJlbmQtZWRpdGluZy1jeHQtYWRkLWJlbmQtcG9pbnQnICsgc3RhZ2VJZDtcclxuICB2YXIgcmVtb3ZlQmVuZFBvaW50Q3h0TWVudUlkID0gJ2N5LWVkZ2UtYmVuZC1lZGl0aW5nLWN4dC1yZW1vdmUtYmVuZC1wb2ludCcgKyBzdGFnZUlkO1xyXG4gIHZhciByZW1vdmVBbGxCZW5kUG9pbnRDdHhNZW51SWQgPSAnY3ktZWRnZS1iZW5kLWVkaXRpbmctY3h0LXJlbW92ZS1tdWx0aXBsZS1iZW5kLXBvaW50JyArIHN0YWdlSWQ7XHJcbiAgdmFyIGFkZENvbnRyb2xQb2ludEN4dE1lbnVJZCA9ICdjeS1lZGdlLWNvbnRyb2wtZWRpdGluZy1jeHQtYWRkLWNvbnRyb2wtcG9pbnQnICsgc3RhZ2VJZDtcclxuICB2YXIgcmVtb3ZlQ29udHJvbFBvaW50Q3h0TWVudUlkID0gJ2N5LWVkZ2UtY29udHJvbC1lZGl0aW5nLWN4dC1yZW1vdmUtY29udHJvbC1wb2ludCcgKyBzdGFnZUlkO1xyXG4gIHZhciByZW1vdmVBbGxDb250cm9sUG9pbnRDdHhNZW51SWQgPSAnY3ktZWRnZS1iZW5kLWVkaXRpbmctY3h0LXJlbW92ZS1tdWx0aXBsZS1jb250cm9sLXBvaW50JyArIHN0YWdlSWQ7XHJcbiAgdmFyIGVTdHlsZSwgZVJlbW92ZSwgZUFkZCwgZVpvb20sIGVTZWxlY3QsIGVVbnNlbGVjdCwgZVRhcFN0YXJ0LCBlVGFwU3RhcnRPbkVkZ2UsIGVUYXBEcmFnLCBlVGFwRW5kLCBlQ3h0VGFwLCBlRHJhZztcclxuICAvLyBsYXN0IHN0YXR1cyBvZiBnZXN0dXJlc1xyXG4gIHZhciBsYXN0UGFubmluZ0VuYWJsZWQsIGxhc3Rab29taW5nRW5hYmxlZCwgbGFzdEJveFNlbGVjdGlvbkVuYWJsZWQ7XHJcbiAgdmFyIGxhc3RBY3RpdmVCZ09wYWNpdHk7XHJcbiAgLy8gc3RhdHVzIG9mIGVkZ2UgdG8gaGlnaGxpZ2h0IGJlbmRzIGFuZCBzZWxlY3RlZCBlZGdlc1xyXG4gIHZhciBlZGdlVG9IaWdobGlnaHQsIG51bWJlck9mU2VsZWN0ZWRFZGdlcztcclxuXHJcbiAgLy8gdGhlIEthbnZhLnNoYXBlKCkgZm9yIHRoZSBlbmRwb2ludHNcclxuICB2YXIgZW5kcG9pbnRTaGFwZTEgPSBudWxsLCBlbmRwb2ludFNoYXBlMiA9IG51bGw7XHJcbiAgLy8gdXNlZCB0byBzdG9wIGNlcnRhaW4gY3kgbGlzdGVuZXJzIHdoZW4gaW50ZXJyYWN0aW5nIHdpdGggYW5jaG9yc1xyXG4gIHZhciBhbmNob3JUb3VjaGVkID0gZmFsc2U7XHJcbiAgLy8gdXNlZCBjYWxsIGVNb3VzZURvd24gb2YgYW5jaG9yTWFuYWdlciBpZiB0aGUgbW91c2UgaXMgb3V0IG9mIHRoZSBjb250ZW50IG9uIGN5Lm9uKHRhcGVuZClcclxuICB2YXIgbW91c2VPdXQ7XHJcbiAgXHJcbiAgdmFyIGZ1bmN0aW9ucyA9IHtcclxuICAgIGluaXQ6IGZ1bmN0aW9uICgpIHtcclxuICAgICAgLy8gcmVnaXN0ZXIgdW5kbyByZWRvIGZ1bmN0aW9uc1xyXG4gICAgICByZWdpc3RlclVuZG9SZWRvRnVuY3Rpb25zKGN5LCBhbmNob3JQb2ludFV0aWxpdGllcywgcGFyYW1zKTtcclxuICAgICAgXHJcbiAgICAgIHZhciBzZWxmID0gdGhpcztcclxuICAgICAgdmFyIG9wdHMgPSBwYXJhbXM7XHJcblxyXG4gICAgICAvKlxyXG4gICAgICAgIE1ha2Ugc3VyZSB3ZSBkb24ndCBhcHBlbmQgYW4gZWxlbWVudCB0aGF0IGFscmVhZHkgZXhpc3RzLlxyXG4gICAgICAgIFRoaXMgZXh0ZW5zaW9uIGNhbnZhcyB1c2VzIHRoZSBzYW1lIGh0bWwgZWxlbWVudCBhcyBlZGdlLWVkaXRpbmcuXHJcbiAgICAgICAgSXQgbWFrZXMgc2Vuc2Ugc2luY2UgaXQgYWxzbyB1c2VzIHRoZSBzYW1lIEtvbnZhIHN0YWdlLlxyXG4gICAgICAgIFdpdGhvdXQgdGhlIGJlbG93IGxvZ2ljLCBhbiBlbXB0eSBjYW52YXNFbGVtZW50IHdvdWxkIGJlIGNyZWF0ZWRcclxuICAgICAgICBmb3Igb25lIG9mIHRoZXNlIGV4dGVuc2lvbnMgZm9yIG5vIHJlYXNvbi5cclxuICAgICAgKi9cclxuICAgICAgdmFyICRjb250YWluZXIgPSAkKHRoaXMpO1xyXG4gICAgICB2YXIgY2FudmFzRWxlbWVudElkID0gJ2N5LW5vZGUtZWRnZS1lZGl0aW5nLXN0YWdlJyArIHN0YWdlSWQ7XHJcbiAgICAgIHN0YWdlSWQrKztcclxuICAgICAgdmFyICRjYW52YXNFbGVtZW50ID0gJCgnPGRpdiBpZD1cIicgKyBjYW52YXNFbGVtZW50SWQgKyAnXCI+PC9kaXY+Jyk7XHJcblxyXG4gICAgICBpZiAoJGNvbnRhaW5lci5maW5kKCcjJyArIGNhbnZhc0VsZW1lbnRJZCkubGVuZ3RoIDwgMSkge1xyXG4gICAgICAgICRjb250YWluZXIuYXBwZW5kKCRjYW52YXNFbGVtZW50KTtcclxuICAgICAgfVxyXG5cclxuICAgICAgLyogXHJcbiAgICAgICAgTWFpbnRhaW4gYSBzaW5nbGUgS29udmEuc3RhZ2Ugb2JqZWN0IHRocm91Z2hvdXQgdGhlIGFwcGxpY2F0aW9uIHRoYXQgdXNlcyB0aGlzIGV4dGVuc2lvblxyXG4gICAgICAgIHN1Y2ggYXMgTmV3dC4gVGhpcyBpcyBpbXBvcnRhbnQgc2luY2UgaGF2aW5nIGRpZmZlcmVudCBzdGFnZXMgY2F1c2VzIHdlaXJkIGJlaGF2aW9yXHJcbiAgICAgICAgb24gb3RoZXIgZXh0ZW5zaW9ucyB0aGF0IGFsc28gdXNlIEtvbnZhLCBsaWtlIG5vdCBsaXN0ZW5pbmcgdG8gbW91c2UgY2xpY2tzIGFuZCBzdWNoLlxyXG4gICAgICAgIElmIHlvdSBhcmUgc29tZW9uZSB0aGF0IGlzIGNyZWF0aW5nIGFuIGV4dGVuc2lvbiB0aGF0IHVzZXMgS29udmEgaW4gdGhlIGZ1dHVyZSwgeW91IG5lZWQgdG9cclxuICAgICAgICBiZSBjYXJlZnVsIGFib3V0IGhvdyBldmVudHMgcmVnaXN0ZXIuIElmIHlvdSB1c2UgYSBkaWZmZXJlbnQgc3RhZ2UgYWxtb3N0IGNlcnRhaW5seSBvbmVcclxuICAgICAgICBvciBib3RoIG9mIHRoZSBleHRlbnNpb25zIHRoYXQgdXNlIHRoZSBzdGFnZSBjcmVhdGVkIGJlbG93IHdpbGwgYnJlYWsuXHJcbiAgICAgICovIFxyXG4gICAgICB2YXIgc3RhZ2U7XHJcbiAgICAgIGlmIChLb252YS5zdGFnZXMubGVuZ3RoIDwgc3RhZ2VJZCkge1xyXG4gICAgICAgIHN0YWdlID0gbmV3IEtvbnZhLlN0YWdlKHtcclxuICAgICAgICAgIGlkOiAnbm9kZS1lZGdlLWVkaXRpbmctc3RhZ2UnLFxyXG4gICAgICAgICAgY29udGFpbmVyOiBjYW52YXNFbGVtZW50SWQsICAgLy8gaWQgb2YgY29udGFpbmVyIDxkaXY+XHJcbiAgICAgICAgICB3aWR0aDogJGNvbnRhaW5lci53aWR0aCgpLFxyXG4gICAgICAgICAgaGVpZ2h0OiAkY29udGFpbmVyLmhlaWdodCgpXHJcbiAgICAgICAgfSk7XHJcbiAgICAgIH1cclxuICAgICAgZWxzZSB7XHJcbiAgICAgICAgc3RhZ2UgPSBLb252YS5zdGFnZXNbc3RhZ2VJZCAtIDFdO1xyXG4gICAgICB9XHJcbiAgICAgIFxyXG4gICAgICB2YXIgY2FudmFzO1xyXG4gICAgICBpZiAoc3RhZ2UuZ2V0Q2hpbGRyZW4oKS5sZW5ndGggPCAxKSB7XHJcbiAgICAgICAgY2FudmFzID0gbmV3IEtvbnZhLkxheWVyKCk7XHJcbiAgICAgICAgc3RhZ2UuYWRkKGNhbnZhcyk7XHJcbiAgICAgIH1cclxuICAgICAgZWxzZSB7XHJcbiAgICAgICAgY2FudmFzID0gc3RhZ2UuZ2V0Q2hpbGRyZW4oKVswXTtcclxuICAgICAgfSAgXHJcbiAgICAgIFxyXG4gICAgICB2YXIgYW5jaG9yTWFuYWdlciA9IHtcclxuICAgICAgICBlZGdlOiB1bmRlZmluZWQsXHJcbiAgICAgICAgZWRnZVR5cGU6ICdpbmNvbmNsdXNpdmUnLFxyXG4gICAgICAgIGFuY2hvcnM6IFtdLFxyXG4gICAgICAgIC8vIHJlbWVtYmVycyB0aGUgdG91Y2hlZCBhbmNob3IgdG8gYXZvaWQgY2xlYXJpbmcgaXQgd2hlbiBkcmFnZ2luZyBoYXBwZW5zXHJcbiAgICAgICAgdG91Y2hlZEFuY2hvcjogdW5kZWZpbmVkLFxyXG4gICAgICAgIC8vIHJlbWVtYmVycyB0aGUgaW5kZXggb2YgdGhlIG1vdmluZyBhbmNob3JcclxuICAgICAgICB0b3VjaGVkQW5jaG9ySW5kZXg6IHVuZGVmaW5lZCxcclxuICAgICAgICBiaW5kTGlzdGVuZXJzOiBmdW5jdGlvbihhbmNob3Ipe1xyXG4gICAgICAgICAgYW5jaG9yLm9uKFwibW91c2Vkb3duIHRvdWNoc3RhcnRcIiwgdGhpcy5lTW91c2VEb3duKTtcclxuICAgICAgICB9LFxyXG4gICAgICAgIHVuYmluZExpc3RlbmVyczogZnVuY3Rpb24oYW5jaG9yKXtcclxuICAgICAgICAgIGFuY2hvci5vZmYoXCJtb3VzZWRvd24gdG91Y2hzdGFydFwiLCB0aGlzLmVNb3VzZURvd24pO1xyXG4gICAgICAgIH0sXHJcbiAgICAgICAgLy8gZ2V0cyB0cmlnZ2VyIG9uIGNsaWNraW5nIG9uIGNvbnRleHQgbWVudXMsIHdoaWxlIGN5IGxpc3RlbmVycyBkb24ndCBnZXQgdHJpZ2dlcmVkXHJcbiAgICAgICAgLy8gaXQgY2FuIGNhdXNlIHdlaXJkIGJlaGF2aW91ciBpZiBub3QgYXdhcmUgb2YgdGhpc1xyXG4gICAgICAgIGVNb3VzZURvd246IGZ1bmN0aW9uKGV2ZW50KXtcclxuICAgICAgICAgIC8vIGFuY2hvck1hbmFnZXIuZWRnZS51bnNlbGVjdCgpIHdvbid0IHdvcmsgc29tZXRpbWVzIGlmIHRoaXMgd2Fzbid0IGhlcmVcclxuICAgICAgICAgIGN5LmF1dG91bnNlbGVjdGlmeShmYWxzZSk7XHJcblxyXG4gICAgICAgICAgLy8gZU1vdXNlRG93bihzZXQpIC0+IHRhcGRyYWcodXNlZCkgLT4gZU1vdXNlVXAocmVzZXQpXHJcbiAgICAgICAgICBhbmNob3JUb3VjaGVkID0gdHJ1ZTtcclxuICAgICAgICAgIGFuY2hvck1hbmFnZXIudG91Y2hlZEFuY2hvciA9IGV2ZW50LnRhcmdldDtcclxuICAgICAgICAgIG1vdXNlT3V0ID0gZmFsc2U7XHJcbiAgICAgICAgICBhbmNob3JNYW5hZ2VyLmVkZ2UudW5zZWxlY3QoKTtcclxuXHJcbiAgICAgICAgICAvLyByZW1lbWJlciBzdGF0ZSBiZWZvcmUgY2hhbmdpbmdcclxuICAgICAgICAgIHZhciB3ZWlnaHRTdHIgPSBhbmNob3JQb2ludFV0aWxpdGllcy5zeW50YXhbYW5jaG9yTWFuYWdlci5lZGdlVHlwZV1bJ3dlaWdodCddO1xyXG4gICAgICAgICAgdmFyIGRpc3RhbmNlU3RyID0gYW5jaG9yUG9pbnRVdGlsaXRpZXMuc3ludGF4W2FuY2hvck1hbmFnZXIuZWRnZVR5cGVdWydkaXN0YW5jZSddO1xyXG5cclxuICAgICAgICAgIHZhciBlZGdlID0gYW5jaG9yTWFuYWdlci5lZGdlO1xyXG4gICAgICAgICAgbW92ZUFuY2hvclBhcmFtID0ge1xyXG4gICAgICAgICAgICBlZGdlOiBlZGdlLFxyXG4gICAgICAgICAgICB0eXBlOiBhbmNob3JNYW5hZ2VyLmVkZ2VUeXBlLFxyXG4gICAgICAgICAgICB3ZWlnaHRzOiBlZGdlLmRhdGEod2VpZ2h0U3RyKSA/IFtdLmNvbmNhdChlZGdlLmRhdGEod2VpZ2h0U3RyKSkgOiBbXSxcclxuICAgICAgICAgICAgZGlzdGFuY2VzOiBlZGdlLmRhdGEoZGlzdGFuY2VTdHIpID8gW10uY29uY2F0KGVkZ2UuZGF0YShkaXN0YW5jZVN0cikpIDogW11cclxuICAgICAgICAgIH07XHJcblxyXG4gICAgICAgICAgdHVybk9mZkFjdGl2ZUJnQ29sb3IoKTtcclxuICAgICAgICAgIGRpc2FibGVHZXN0dXJlcygpO1xyXG4gICAgICAgICAgXHJcbiAgICAgICAgICBjeS5hdXRvdW5ncmFiaWZ5KHRydWUpO1xyXG5cclxuICAgICAgICAgIGNhbnZhcy5nZXRTdGFnZSgpLm9uKFwiY29udGVudFRvdWNoZW5kIGNvbnRlbnRNb3VzZXVwXCIsIGFuY2hvck1hbmFnZXIuZU1vdXNlVXApO1xyXG4gICAgICAgICAgY2FudmFzLmdldFN0YWdlKCkub24oXCJjb250ZW50TW91c2VvdXRcIiwgYW5jaG9yTWFuYWdlci5lTW91c2VPdXQpO1xyXG4gICAgICAgIH0sXHJcbiAgICAgICAgLy8gZ2V0cyBjYWxsZWQgYmVmb3JlIGN5Lm9uKCd0YXBlbmQnKVxyXG4gICAgICAgIGVNb3VzZVVwOiBmdW5jdGlvbihldmVudCl7XHJcbiAgICAgICAgICAvLyB3b24ndCBiZSBjYWxsZWQgaWYgdGhlIG1vdXNlIGlzIHJlbGVhc2VkIG91dCBvZiBzY3JlZW5cclxuICAgICAgICAgIGFuY2hvclRvdWNoZWQgPSBmYWxzZTtcclxuICAgICAgICAgIGFuY2hvck1hbmFnZXIudG91Y2hlZEFuY2hvciA9IHVuZGVmaW5lZDtcclxuICAgICAgICAgIG1vdXNlT3V0ID0gZmFsc2U7XHJcbiAgICAgICAgICBhbmNob3JNYW5hZ2VyLmVkZ2Uuc2VsZWN0KCk7XHJcbiAgICAgICAgICBcclxuICAgICAgICAgIHJlc2V0QWN0aXZlQmdDb2xvcigpO1xyXG4gICAgICAgICAgcmVzZXRHZXN0dXJlcygpO1xyXG4gICAgICAgICAgXHJcbiAgICAgICAgICAvKiBcclxuICAgICAgICAgICAqIElNUE9SVEFOVFxyXG4gICAgICAgICAgICogQW55IHByb2dyYW1tYXRpYyBjYWxscyB0byAuc2VsZWN0KCksIC51bnNlbGVjdCgpIGFmdGVyIHRoaXMgc3RhdGVtZW50IGFyZSBpZ25vcmVkXHJcbiAgICAgICAgICAgKiB1bnRpbCBjeS5hdXRvdW5zZWxlY3RpZnkoZmFsc2UpIGlzIGNhbGxlZCBpbiBvbmUgb2YgdGhlIHByZXZpb3VzOlxyXG4gICAgICAgICAgICogXHJcbiAgICAgICAgICAgKiBjeS5vbigndGFwc3RhcnQnKVxyXG4gICAgICAgICAgICogYW5jaG9yLm9uKCdtb3VzZWRvd24gdG91Y2hzdGFydCcpXHJcbiAgICAgICAgICAgKiBkb2N1bWVudC5vbigna2V5ZG93bicpXHJcbiAgICAgICAgICAgKiBjeS5vbigndGFwZHJhcCcpXHJcbiAgICAgICAgICAgKiBcclxuICAgICAgICAgICAqIERvZXNuJ3QgYWZmZWN0IFVYLCBidXQgbWF5IGNhdXNlIGNvbmZ1c2luZyBiZWhhdmlvdXIgaWYgbm90IGF3YXJlIG9mIHRoaXMgd2hlbiBjb2RpbmdcclxuICAgICAgICAgICAqIFxyXG4gICAgICAgICAgICogV2h5IGlzIHRoaXMgaGVyZT9cclxuICAgICAgICAgICAqIFRoaXMgaXMgaW1wb3J0YW50IHRvIGtlZXAgZWRnZXMgZnJvbSBiZWluZyBhdXRvIGRlc2VsZWN0ZWQgZnJvbSB3b3JraW5nXHJcbiAgICAgICAgICAgKiB3aXRoIGFuY2hvcnMgb3V0IG9mIHRoZSBlZGdlIGJvZHkgKGZvciB1bmJ1bmRsZWQgYmV6aWVyLCB0ZWNobmljYWxseSBub3QgbmVjZXNzZXJ5IGZvciBzZWdlbWVudHMpLlxyXG4gICAgICAgICAgICogXHJcbiAgICAgICAgICAgKiBUaGVzZSBpcyBhbnRoZXIgY3kuYXV0b3NlbGVjdGlmeSh0cnVlKSBpbiBjeS5vbigndGFwZW5kJykgXHJcbiAgICAgICAgICAgKiBcclxuICAgICAgICAgICovIFxyXG4gICAgICAgICAgY3kuYXV0b3Vuc2VsZWN0aWZ5KHRydWUpO1xyXG4gICAgICAgICAgY3kuYXV0b3VuZ3JhYmlmeShmYWxzZSk7XHJcblxyXG4gICAgICAgICAgY2FudmFzLmdldFN0YWdlKCkub2ZmKFwiY29udGVudFRvdWNoZW5kIGNvbnRlbnRNb3VzZXVwXCIsIGFuY2hvck1hbmFnZXIuZU1vdXNlVXApO1xyXG4gICAgICAgICAgY2FudmFzLmdldFN0YWdlKCkub2ZmKFwiY29udGVudE1vdXNlb3V0XCIsIGFuY2hvck1hbmFnZXIuZU1vdXNlT3V0KTtcclxuICAgICAgICB9LFxyXG4gICAgICAgIC8vIGhhbmRsZSBtb3VzZSBnb2luZyBvdXQgb2YgY2FudmFzIFxyXG4gICAgICAgIGVNb3VzZU91dDogZnVuY3Rpb24gKGV2ZW50KXtcclxuICAgICAgICAgIG1vdXNlT3V0ID0gdHJ1ZTtcclxuICAgICAgICB9LFxyXG4gICAgICAgIGNsZWFyQW5jaG9yc0V4Y2VwdDogZnVuY3Rpb24oZG9udENsZWFuID0gdW5kZWZpbmVkKXtcclxuICAgICAgICAgIHZhciBleGNlcHRpb25BcHBsaWVzID0gZmFsc2U7XHJcblxyXG4gICAgICAgICAgdGhpcy5hbmNob3JzLmZvckVhY2goKGFuY2hvciwgaW5kZXgpID0+IHtcclxuICAgICAgICAgICAgaWYoZG9udENsZWFuICYmIGFuY2hvciA9PT0gZG9udENsZWFuKXtcclxuICAgICAgICAgICAgICBleGNlcHRpb25BcHBsaWVzID0gdHJ1ZTsgLy8gdGhlIGRvbnRDbGVhbiBhbmNob3IgaXMgbm90IGNsZWFyZWRcclxuICAgICAgICAgICAgICByZXR1cm47XHJcbiAgICAgICAgICAgIH1cclxuXHJcbiAgICAgICAgICAgIHRoaXMudW5iaW5kTGlzdGVuZXJzKGFuY2hvcik7XHJcbiAgICAgICAgICAgIGFuY2hvci5kZXN0cm95KCk7XHJcbiAgICAgICAgICB9KTtcclxuXHJcbiAgICAgICAgICBpZihleGNlcHRpb25BcHBsaWVzKXtcclxuICAgICAgICAgICAgdGhpcy5hbmNob3JzID0gW2RvbnRDbGVhbl07XHJcbiAgICAgICAgICB9XHJcbiAgICAgICAgICBlbHNlIHtcclxuICAgICAgICAgICAgdGhpcy5hbmNob3JzID0gW107XHJcbiAgICAgICAgICAgIHRoaXMuZWRnZSA9IHVuZGVmaW5lZDtcclxuICAgICAgICAgICAgdGhpcy5lZGdlVHlwZSA9ICdpbmNvbmNsdXNpdmUnO1xyXG4gICAgICAgICAgfVxyXG4gICAgICAgIH0sXHJcbiAgICAgICAgLy8gcmVuZGVyIHRoZSBiZW5kIGFuZCBjb250cm9sIHNoYXBlcyBvZiB0aGUgZ2l2ZW4gZWRnZVxyXG4gICAgICAgIHJlbmRlckFuY2hvclNoYXBlczogZnVuY3Rpb24oZWRnZSkge1xyXG4gICAgICAgICAgdGhpcy5lZGdlID0gZWRnZTtcclxuICAgICAgICAgIHRoaXMuZWRnZVR5cGUgPSBhbmNob3JQb2ludFV0aWxpdGllcy5nZXRFZGdlVHlwZShlZGdlKTtcclxuXHJcbiAgICAgICAgICBpZighZWRnZS5oYXNDbGFzcygnZWRnZWJlbmRlZGl0aW5nLWhhc2JlbmRwb2ludHMnKSAmJlxyXG4gICAgICAgICAgICAgICFlZGdlLmhhc0NsYXNzKCdlZGdlY29udHJvbGVkaXRpbmctaGFzY29udHJvbHBvaW50cycpKSB7XHJcbiAgICAgICAgICAgIHJldHVybjtcclxuICAgICAgICAgIH1cclxuICAgICAgICAgIFxyXG4gICAgICAgICAgdmFyIGFuY2hvckxpc3QgPSBhbmNob3JQb2ludFV0aWxpdGllcy5nZXRBbmNob3JzQXNBcnJheShlZGdlKTsvL2VkZ2UuX3ByaXZhdGUucmRhdGEuc2VncHRzO1xyXG4gICAgICAgICAgdmFyIGxlbmd0aCA9IGdldEFuY2hvclNoYXBlc0xlbmd0aChlZGdlKSAqIDAuNjU7XHJcbiAgICAgICAgICBcclxuICAgICAgICAgIHZhciBzcmNQb3MgPSBlZGdlLnNvdXJjZSgpLnBvc2l0aW9uKCk7XHJcbiAgICAgICAgICB2YXIgdGd0UG9zID0gZWRnZS50YXJnZXQoKS5wb3NpdGlvbigpO1xyXG5cclxuICAgICAgICAgIGZvcih2YXIgaSA9IDA7IGFuY2hvckxpc3QgJiYgaSA8IGFuY2hvckxpc3QubGVuZ3RoOyBpID0gaSArIDIpe1xyXG4gICAgICAgICAgICB2YXIgYW5jaG9yWCA9IGFuY2hvckxpc3RbaV07XHJcbiAgICAgICAgICAgIHZhciBhbmNob3JZID0gYW5jaG9yTGlzdFtpICsgMV07XHJcblxyXG4gICAgICAgICAgICB0aGlzLnJlbmRlckFuY2hvclNoYXBlKGFuY2hvclgsIGFuY2hvclksIGxlbmd0aCk7XHJcbiAgICAgICAgICB9XHJcblxyXG4gICAgICAgICAgY2FudmFzLmRyYXcoKTtcclxuICAgICAgICB9LFxyXG4gICAgICAgIC8vIHJlbmRlciBhIGFuY2hvciBzaGFwZSB3aXRoIHRoZSBnaXZlbiBwYXJhbWV0ZXJzXHJcbiAgICAgICAgcmVuZGVyQW5jaG9yU2hhcGU6IGZ1bmN0aW9uKGFuY2hvclgsIGFuY2hvclksIGxlbmd0aCkge1xyXG4gICAgICAgICAgLy8gZ2V0IHRoZSB0b3AgbGVmdCBjb29yZGluYXRlc1xyXG4gICAgICAgICAgdmFyIHRvcExlZnRYID0gYW5jaG9yWCAtIGxlbmd0aCAvIDI7XHJcbiAgICAgICAgICB2YXIgdG9wTGVmdFkgPSBhbmNob3JZIC0gbGVuZ3RoIC8gMjtcclxuICAgICAgICAgIFxyXG4gICAgICAgICAgLy8gY29udmVydCB0byByZW5kZXJlZCBwYXJhbWV0ZXJzXHJcbiAgICAgICAgICB2YXIgcmVuZGVyZWRUb3BMZWZ0UG9zID0gY29udmVydFRvUmVuZGVyZWRQb3NpdGlvbih7eDogdG9wTGVmdFgsIHk6IHRvcExlZnRZfSk7XHJcbiAgICAgICAgICBsZW5ndGggKj0gY3kuem9vbSgpO1xyXG4gICAgICAgICAgXHJcbiAgICAgICAgICB2YXIgbmV3QW5jaG9yID0gbmV3IEtvbnZhLlJlY3Qoe1xyXG4gICAgICAgICAgICB4OiByZW5kZXJlZFRvcExlZnRQb3MueCxcclxuICAgICAgICAgICAgeTogcmVuZGVyZWRUb3BMZWZ0UG9zLnksXHJcbiAgICAgICAgICAgIHdpZHRoOiBsZW5ndGgsXHJcbiAgICAgICAgICAgIGhlaWdodDogbGVuZ3RoLFxyXG4gICAgICAgICAgICBmaWxsOiAnYmxhY2snLFxyXG4gICAgICAgICAgICBzdHJva2VXaWR0aDogMCxcclxuICAgICAgICAgICAgZHJhZ2dhYmxlOiB0cnVlXHJcbiAgICAgICAgICB9KTtcclxuXHJcbiAgICAgICAgICB0aGlzLmFuY2hvcnMucHVzaChuZXdBbmNob3IpO1xyXG4gICAgICAgICAgdGhpcy5iaW5kTGlzdGVuZXJzKG5ld0FuY2hvcik7XHJcbiAgICAgICAgICBjYW52YXMuYWRkKG5ld0FuY2hvcik7XHJcbiAgICAgICAgfVxyXG4gICAgICB9O1xyXG5cclxuICAgICAgdmFyIGN4dEFkZEJlbmRGY24gPSBmdW5jdGlvbihldmVudCl7XHJcbiAgICAgICAgY3h0QWRkQW5jaG9yRmNuKGV2ZW50LCAnYmVuZCcpO1xyXG4gICAgICB9XHJcblxyXG4gICAgICB2YXIgY3h0QWRkQ29udHJvbEZjbiA9IGZ1bmN0aW9uKGV2ZW50KSB7XHJcbiAgICAgICAgY3h0QWRkQW5jaG9yRmNuKGV2ZW50LCAnY29udHJvbCcpO1xyXG4gICAgICB9XHJcblxyXG4gICAgICB2YXIgY3h0QWRkQW5jaG9yRmNuID0gZnVuY3Rpb24gKGV2ZW50LCBhbmNob3JUeXBlKSB7XHJcbiAgICAgICAgdmFyIGVkZ2UgPSBldmVudC50YXJnZXQgfHwgZXZlbnQuY3lUYXJnZXQ7XHJcbiAgICAgICAgaWYoIWFuY2hvclBvaW50VXRpbGl0aWVzLmlzSWdub3JlZEVkZ2UoZWRnZSkpIHtcclxuXHJcbiAgICAgICAgICB2YXIgdHlwZSA9IGFuY2hvclBvaW50VXRpbGl0aWVzLmdldEVkZ2VUeXBlKGVkZ2UpO1xyXG4gICAgICAgICAgdmFyIHdlaWdodHMsIGRpc3RhbmNlcywgd2VpZ2h0U3RyLCBkaXN0YW5jZVN0cjtcclxuXHJcbiAgICAgICAgICBpZih0eXBlID09PSAnaW5jb25jbHVzaXZlJyl7XHJcbiAgICAgICAgICAgIHdlaWdodHMgPSBbXTtcclxuICAgICAgICAgICAgZGlzdGFuY2VzID0gW107XHJcbiAgICAgICAgICB9XHJcbiAgICAgICAgICBlbHNle1xyXG4gICAgICAgICAgICB3ZWlnaHRTdHIgPSBhbmNob3JQb2ludFV0aWxpdGllcy5zeW50YXhbdHlwZV1bJ3dlaWdodCddO1xyXG4gICAgICAgICAgICBkaXN0YW5jZVN0ciA9IGFuY2hvclBvaW50VXRpbGl0aWVzLnN5bnRheFt0eXBlXVsnZGlzdGFuY2UnXTtcclxuXHJcbiAgICAgICAgICAgIHdlaWdodHMgPSBlZGdlLmRhdGEod2VpZ2h0U3RyKSA/IFtdLmNvbmNhdChlZGdlLmRhdGEod2VpZ2h0U3RyKSkgOiBlZGdlLmRhdGEod2VpZ2h0U3RyKTtcclxuICAgICAgICAgICAgZGlzdGFuY2VzID0gZWRnZS5kYXRhKGRpc3RhbmNlU3RyKSA/IFtdLmNvbmNhdChlZGdlLmRhdGEoZGlzdGFuY2VTdHIpKSA6IGVkZ2UuZGF0YShkaXN0YW5jZVN0cik7XHJcbiAgICAgICAgICB9XHJcblxyXG4gICAgICAgICAgdmFyIHBhcmFtID0ge1xyXG4gICAgICAgICAgICBlZGdlOiBlZGdlLFxyXG4gICAgICAgICAgICB0eXBlOiB0eXBlLFxyXG4gICAgICAgICAgICB3ZWlnaHRzOiB3ZWlnaHRzLFxyXG4gICAgICAgICAgICBkaXN0YW5jZXM6IGRpc3RhbmNlc1xyXG4gICAgICAgICAgfTtcclxuXHJcbiAgICAgICAgICAvLyB0aGUgdW5kZWZpbmVkIGdvIGZvciBlZGdlIGFuZCBuZXdBbmNob3JQb2ludCBwYXJhbWV0ZXJzXHJcbiAgICAgICAgICBhbmNob3JQb2ludFV0aWxpdGllcy5hZGRBbmNob3JQb2ludCh1bmRlZmluZWQsIHVuZGVmaW5lZCwgYW5jaG9yVHlwZSk7XHJcblxyXG4gICAgICAgICAgaWYgKG9wdGlvbnMoKS51bmRvYWJsZSkge1xyXG4gICAgICAgICAgICBjeS51bmRvUmVkbygpLmRvKCdjaGFuZ2VBbmNob3JQb2ludHMnLCBwYXJhbSk7XHJcbiAgICAgICAgICB9XHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICByZWZyZXNoRHJhd3MoKTtcclxuICAgICAgICBlZGdlLnNlbGVjdCgpO1xyXG4gICAgICB9O1xyXG5cclxuICAgICAgdmFyIGN4dFJlbW92ZUFuY2hvckZjbiA9IGZ1bmN0aW9uIChldmVudCkge1xyXG4gICAgICAgIHZhciBlZGdlID0gYW5jaG9yTWFuYWdlci5lZGdlO1xyXG4gICAgICAgIHZhciB0eXBlID0gYW5jaG9yUG9pbnRVdGlsaXRpZXMuZ2V0RWRnZVR5cGUoZWRnZSk7XHJcblxyXG4gICAgICAgIGlmKGFuY2hvclBvaW50VXRpbGl0aWVzLmVkZ2VUeXBlSW5jb25jbHVzaXZlU2hvdWxkbnRIYXBwZW4odHlwZSwgXCJVaVV0aWxpdGllcy5qcywgY3h0UmVtb3ZlQW5jaG9yRmNuXCIpKXtcclxuICAgICAgICAgIHJldHVybjtcclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIHZhciBwYXJhbSA9IHtcclxuICAgICAgICAgIGVkZ2U6IGVkZ2UsXHJcbiAgICAgICAgICB0eXBlOiB0eXBlLFxyXG4gICAgICAgICAgd2VpZ2h0czogW10uY29uY2F0KGVkZ2UuZGF0YShhbmNob3JQb2ludFV0aWxpdGllcy5zeW50YXhbdHlwZV1bJ3dlaWdodCddKSksXHJcbiAgICAgICAgICBkaXN0YW5jZXM6IFtdLmNvbmNhdChlZGdlLmRhdGEoYW5jaG9yUG9pbnRVdGlsaXRpZXMuc3ludGF4W3R5cGVdWydkaXN0YW5jZSddKSlcclxuICAgICAgICB9O1xyXG5cclxuICAgICAgICBhbmNob3JQb2ludFV0aWxpdGllcy5yZW1vdmVBbmNob3IoKTtcclxuICAgICAgICBcclxuICAgICAgICBpZihvcHRpb25zKCkudW5kb2FibGUpIHtcclxuICAgICAgICAgIGN5LnVuZG9SZWRvKCkuZG8oJ2NoYW5nZUFuY2hvclBvaW50cycsIHBhcmFtKTtcclxuICAgICAgICB9XHJcbiAgICAgICAgXHJcbiAgICAgICAgc2V0VGltZW91dChmdW5jdGlvbigpe3JlZnJlc2hEcmF3cygpO2VkZ2Uuc2VsZWN0KCk7fSwgNTApIDtcclxuXHJcbiAgICAgIH07XHJcblxyXG4gICAgICB2YXIgY3h0UmVtb3ZlQWxsQW5jaG9yc0ZjbiA9IGZ1bmN0aW9uIChldmVudCkge1xyXG4gICAgICAgIHZhciBlZGdlID0gYW5jaG9yTWFuYWdlci5lZGdlO1xyXG4gICAgICAgIHZhciB0eXBlID0gYW5jaG9yUG9pbnRVdGlsaXRpZXMuZ2V0RWRnZVR5cGUoZWRnZSk7XHJcbiAgICAgICAgdmFyIHBhcmFtID0ge1xyXG4gICAgICAgICAgZWRnZTogZWRnZSxcclxuICAgICAgICAgIHR5cGU6IHR5cGUsXHJcbiAgICAgICAgICB3ZWlnaHRzOiBbXS5jb25jYXQoZWRnZS5kYXRhKGFuY2hvclBvaW50VXRpbGl0aWVzLnN5bnRheFt0eXBlXVsnd2VpZ2h0J10pKSxcclxuICAgICAgICAgIGRpc3RhbmNlczogW10uY29uY2F0KGVkZ2UuZGF0YShhbmNob3JQb2ludFV0aWxpdGllcy5zeW50YXhbdHlwZV1bJ2Rpc3RhbmNlJ10pKVxyXG4gICAgICAgIH07XHJcbiAgICAgICAgXHJcbiAgICAgICAgYW5jaG9yUG9pbnRVdGlsaXRpZXMucmVtb3ZlQWxsQW5jaG9ycygpO1xyXG5cclxuICAgICAgICBpZiAob3B0aW9ucygpLnVuZG9hYmxlKSB7XHJcbiAgICAgICAgICBjeS51bmRvUmVkbygpLmRvKCdjaGFuZ2VBbmNob3JQb2ludHMnLCBwYXJhbSk7XHJcbiAgICAgICAgfVxyXG4gICAgICAgIHNldFRpbWVvdXQoZnVuY3Rpb24oKXtyZWZyZXNoRHJhd3MoKTtlZGdlLnNlbGVjdCgpO30sIDUwKTtcclxuICAgICAgfVxyXG4gICAgICBcclxuICAgICAgLy8gZnVuY3Rpb24gdG8gcmVjb25uZWN0IGVkZ2VcclxuICAgICAgdmFyIGhhbmRsZVJlY29ubmVjdEVkZ2UgPSBvcHRzLmhhbmRsZVJlY29ubmVjdEVkZ2U7XHJcbiAgICAgIC8vIGZ1bmN0aW9uIHRvIHZhbGlkYXRlIGVkZ2Ugc291cmNlIGFuZCB0YXJnZXQgb24gcmVjb25uZWN0aW9uXHJcbiAgICAgIHZhciB2YWxpZGF0ZUVkZ2UgPSBvcHRzLnZhbGlkYXRlRWRnZTsgXHJcbiAgICAgIC8vIGZ1bmN0aW9uIHRvIGJlIGNhbGxlZCBvbiBpbnZhbGlkIGVkZ2UgcmVjb25uZWN0aW9uXHJcbiAgICAgIHZhciBhY3RPblVuc3VjY2Vzc2Z1bFJlY29ubmVjdGlvbiA9IG9wdHMuYWN0T25VbnN1Y2Nlc3NmdWxSZWNvbm5lY3Rpb247XHJcbiAgICAgIFxyXG4gICAgICB2YXIgbWVudUl0ZW1zID0gW1xyXG4gICAgICAgIHtcclxuICAgICAgICAgIGlkOiBhZGRCZW5kUG9pbnRDeHRNZW51SWQsXHJcbiAgICAgICAgICBjb250ZW50OiBvcHRzLmFkZEJlbmRNZW51SXRlbVRpdGxlLFxyXG4gICAgICAgICAgc2VsZWN0b3I6ICdlZGdlJyxcclxuICAgICAgICAgIG9uQ2xpY2tGdW5jdGlvbjogY3h0QWRkQmVuZEZjblxyXG4gICAgICAgIH0sXHJcbiAgICAgICAge1xyXG4gICAgICAgICAgaWQ6IHJlbW92ZUJlbmRQb2ludEN4dE1lbnVJZCxcclxuICAgICAgICAgIGNvbnRlbnQ6IG9wdHMucmVtb3ZlQmVuZE1lbnVJdGVtVGl0bGUsXHJcbiAgICAgICAgICBzZWxlY3RvcjogJ2VkZ2UnLFxyXG4gICAgICAgICAgb25DbGlja0Z1bmN0aW9uOiBjeHRSZW1vdmVBbmNob3JGY25cclxuICAgICAgICB9LCBcclxuICAgICAgICB7XHJcbiAgICAgICAgICBpZDogcmVtb3ZlQWxsQmVuZFBvaW50Q3R4TWVudUlkLFxyXG4gICAgICAgICAgY29udGVudDogb3B0cy5yZW1vdmVBbGxCZW5kTWVudUl0ZW1UaXRsZSxcclxuICAgICAgICAgIHNlbGVjdG9yOiBvcHRzLmVuYWJsZU11bHRpcGxlQW5jaG9yUmVtb3ZhbE9wdGlvbiAmJiAnOnNlbGVjdGVkLmVkZ2ViZW5kZWRpdGluZy1oYXNtdWx0aXBsZWJlbmRwb2ludHMnLFxyXG4gICAgICAgICAgb25DbGlja0Z1bmN0aW9uOiBjeHRSZW1vdmVBbGxBbmNob3JzRmNuXHJcbiAgICAgICAgfSxcclxuICAgICAgICB7XHJcbiAgICAgICAgICBpZDogYWRkQ29udHJvbFBvaW50Q3h0TWVudUlkLFxyXG4gICAgICAgICAgY29udGVudDogb3B0cy5hZGRDb250cm9sTWVudUl0ZW1UaXRsZSxcclxuICAgICAgICAgIHNlbGVjdG9yOiAnZWRnZScsXHJcbiAgICAgICAgICBjb3JlQXNXZWxsOiB0cnVlLFxyXG4gICAgICAgICAgb25DbGlja0Z1bmN0aW9uOiBjeHRBZGRDb250cm9sRmNuXHJcbiAgICAgICAgfSxcclxuICAgICAgICB7XHJcbiAgICAgICAgICBpZDogcmVtb3ZlQ29udHJvbFBvaW50Q3h0TWVudUlkLFxyXG4gICAgICAgICAgY29udGVudDogb3B0cy5yZW1vdmVDb250cm9sTWVudUl0ZW1UaXRsZSxcclxuICAgICAgICAgIHNlbGVjdG9yOiAnZWRnZScsXHJcbiAgICAgICAgICBjb3JlQXNXZWxsOiB0cnVlLFxyXG4gICAgICAgICAgb25DbGlja0Z1bmN0aW9uOiBjeHRSZW1vdmVBbmNob3JGY25cclxuICAgICAgICB9LCBcclxuICAgICAgICB7XHJcbiAgICAgICAgICBpZDogcmVtb3ZlQWxsQ29udHJvbFBvaW50Q3R4TWVudUlkLFxyXG4gICAgICAgICAgY29udGVudDogb3B0cy5yZW1vdmVBbGxDb250cm9sTWVudUl0ZW1UaXRsZSxcclxuICAgICAgICAgIHNlbGVjdG9yOiBvcHRzLmVuYWJsZU11bHRpcGxlQW5jaG9yUmVtb3ZhbE9wdGlvbiAmJiAnOnNlbGVjdGVkLmVkZ2Vjb250cm9sZWRpdGluZy1oYXNtdWx0aXBsZWNvbnRyb2xwb2ludHMnLFxyXG4gICAgICAgICAgb25DbGlja0Z1bmN0aW9uOiBjeHRSZW1vdmVBbGxBbmNob3JzRmNuXHJcbiAgICAgICAgfSxcclxuICAgICAgXTtcclxuICAgICAgXHJcbiAgICAgIGlmKGN5LmNvbnRleHRNZW51cykge1xyXG4gICAgICAgIHZhciBtZW51cyA9IGN5LmNvbnRleHRNZW51cygnZ2V0Jyk7XHJcbiAgICAgICAgLy8gSWYgY29udGV4dCBtZW51cyBpcyBhY3RpdmUganVzdCBhcHBlbmQgbWVudSBpdGVtcyBlbHNlIGFjdGl2YXRlIHRoZSBleHRlbnNpb25cclxuICAgICAgICAvLyB3aXRoIGluaXRpYWwgbWVudSBpdGVtc1xyXG4gICAgICAgIGlmIChtZW51cy5pc0FjdGl2ZSgpKSB7XHJcbiAgICAgICAgICBtZW51cy5hcHBlbmRNZW51SXRlbXMobWVudUl0ZW1zKTtcclxuICAgICAgICB9XHJcbiAgICAgICAgZWxzZSB7XHJcbiAgICAgICAgICBjeS5jb250ZXh0TWVudXMoe1xyXG4gICAgICAgICAgICBtZW51SXRlbXM6IG1lbnVJdGVtc1xyXG4gICAgICAgICAgfSk7XHJcbiAgICAgICAgfVxyXG4gICAgICB9XHJcbiAgICAgIFxyXG4gICAgICB2YXIgX3NpemVDYW52YXMgPSBkZWJvdW5jZShmdW5jdGlvbiAoKSB7XHJcbiAgICAgICAgJGNhbnZhc0VsZW1lbnRcclxuICAgICAgICAgIC5hdHRyKCdoZWlnaHQnLCAkY29udGFpbmVyLmhlaWdodCgpKVxyXG4gICAgICAgICAgLmF0dHIoJ3dpZHRoJywgJGNvbnRhaW5lci53aWR0aCgpKVxyXG4gICAgICAgICAgLmNzcyh7XHJcbiAgICAgICAgICAgICdwb3NpdGlvbic6ICdhYnNvbHV0ZScsXHJcbiAgICAgICAgICAgICd0b3AnOiAwLFxyXG4gICAgICAgICAgICAnbGVmdCc6IDAsXHJcbiAgICAgICAgICAgICd6LWluZGV4Jzogb3B0aW9ucygpLnpJbmRleFxyXG4gICAgICAgICAgfSlcclxuICAgICAgICA7XHJcblxyXG4gICAgICAgIHNldFRpbWVvdXQoZnVuY3Rpb24gKCkge1xyXG4gICAgICAgICAgdmFyIGNhbnZhc0JiID0gJGNhbnZhc0VsZW1lbnQub2Zmc2V0KCk7XHJcbiAgICAgICAgICB2YXIgY29udGFpbmVyQmIgPSAkY29udGFpbmVyLm9mZnNldCgpO1xyXG5cclxuICAgICAgICAgICRjYW52YXNFbGVtZW50XHJcbiAgICAgICAgICAgIC5jc3Moe1xyXG4gICAgICAgICAgICAgICd0b3AnOiAtKGNhbnZhc0JiLnRvcCAtIGNvbnRhaW5lckJiLnRvcCksXHJcbiAgICAgICAgICAgICAgJ2xlZnQnOiAtKGNhbnZhc0JiLmxlZnQgLSBjb250YWluZXJCYi5sZWZ0KVxyXG4gICAgICAgICAgICB9KVxyXG4gICAgICAgICAgO1xyXG5cclxuICAgICAgICAgIGNhbnZhcy5nZXRTdGFnZSgpLnNldFdpZHRoKCRjb250YWluZXIud2lkdGgoKSk7XHJcbiAgICAgICAgICBjYW52YXMuZ2V0U3RhZ2UoKS5zZXRIZWlnaHQoJGNvbnRhaW5lci5oZWlnaHQoKSk7XHJcblxyXG4gICAgICAgICAgLy8gcmVkcmF3IG9uIGNhbnZhcyByZXNpemVcclxuICAgICAgICAgIGlmKGN5KXtcclxuICAgICAgICAgICAgcmVmcmVzaERyYXdzKCk7XHJcbiAgICAgICAgICB9XHJcbiAgICAgICAgfSwgMCk7XHJcblxyXG4gICAgICB9LCAyNTApO1xyXG5cclxuICAgICAgZnVuY3Rpb24gc2l6ZUNhbnZhcygpIHtcclxuICAgICAgICBfc2l6ZUNhbnZhcygpO1xyXG4gICAgICB9XHJcblxyXG4gICAgICBzaXplQ2FudmFzKCk7XHJcblxyXG4gICAgICAkKHdpbmRvdykuYmluZCgncmVzaXplJywgZnVuY3Rpb24gKCkge1xyXG4gICAgICAgIHNpemVDYW52YXMoKTtcclxuICAgICAgfSk7XHJcbiAgICAgIFxyXG4gICAgICAvLyB3cml0ZSBvcHRpb25zIHRvIGRhdGFcclxuICAgICAgdmFyIGRhdGEgPSAkY29udGFpbmVyLmRhdGEoJ2N5ZWRnZWVkaXRpbmcnKTtcclxuICAgICAgaWYgKGRhdGEgPT0gbnVsbCkge1xyXG4gICAgICAgIGRhdGEgPSB7fTtcclxuICAgICAgfVxyXG4gICAgICBkYXRhLm9wdGlvbnMgPSBvcHRzO1xyXG5cclxuICAgICAgdmFyIG9wdENhY2hlO1xyXG5cclxuICAgICAgZnVuY3Rpb24gb3B0aW9ucygpIHtcclxuICAgICAgICByZXR1cm4gb3B0Q2FjaGUgfHwgKG9wdENhY2hlID0gJGNvbnRhaW5lci5kYXRhKCdjeWVkZ2VlZGl0aW5nJykub3B0aW9ucyk7XHJcbiAgICAgIH1cclxuXHJcbiAgICAgIC8vIHdlIHdpbGwgbmVlZCB0byBjb252ZXJ0IG1vZGVsIHBvc2l0b25zIHRvIHJlbmRlcmVkIHBvc2l0aW9uc1xyXG4gICAgICBmdW5jdGlvbiBjb252ZXJ0VG9SZW5kZXJlZFBvc2l0aW9uKG1vZGVsUG9zaXRpb24pIHtcclxuICAgICAgICB2YXIgcGFuID0gY3kucGFuKCk7XHJcbiAgICAgICAgdmFyIHpvb20gPSBjeS56b29tKCk7XHJcblxyXG4gICAgICAgIHZhciB4ID0gbW9kZWxQb3NpdGlvbi54ICogem9vbSArIHBhbi54O1xyXG4gICAgICAgIHZhciB5ID0gbW9kZWxQb3NpdGlvbi55ICogem9vbSArIHBhbi55O1xyXG5cclxuICAgICAgICByZXR1cm4ge1xyXG4gICAgICAgICAgeDogeCxcclxuICAgICAgICAgIHk6IHlcclxuICAgICAgICB9O1xyXG4gICAgICB9XHJcbiAgICAgIFxyXG4gICAgICBmdW5jdGlvbiByZWZyZXNoRHJhd3MoKSB7XHJcblxyXG4gICAgICAgIC8vIGRvbid0IGNsZWFyIGFuY2hvciB3aGljaCBpcyBiZWluZyBtb3ZlZFxyXG4gICAgICAgIGFuY2hvck1hbmFnZXIuY2xlYXJBbmNob3JzRXhjZXB0KGFuY2hvck1hbmFnZXIudG91Y2hlZEFuY2hvcik7XHJcbiAgICAgICAgXHJcbiAgICAgICAgaWYoZW5kcG9pbnRTaGFwZTEgIT09IG51bGwpe1xyXG4gICAgICAgICAgZW5kcG9pbnRTaGFwZTEuZGVzdHJveSgpO1xyXG4gICAgICAgICAgZW5kcG9pbnRTaGFwZTEgPSBudWxsO1xyXG4gICAgICAgIH1cclxuICAgICAgICBpZihlbmRwb2ludFNoYXBlMiAhPT0gbnVsbCl7XHJcbiAgICAgICAgICBlbmRwb2ludFNoYXBlMi5kZXN0cm95KCk7XHJcbiAgICAgICAgICBlbmRwb2ludFNoYXBlMiA9IG51bGw7XHJcbiAgICAgICAgfVxyXG4gICAgICAgIGNhbnZhcy5kcmF3KCk7XHJcblxyXG4gICAgICAgIGlmKCBlZGdlVG9IaWdobGlnaHQgKSB7XHJcbiAgICAgICAgICBhbmNob3JNYW5hZ2VyLnJlbmRlckFuY2hvclNoYXBlcyhlZGdlVG9IaWdobGlnaHQpO1xyXG4gICAgICAgICAgcmVuZGVyRW5kUG9pbnRTaGFwZXMoZWRnZVRvSGlnaGxpZ2h0KTtcclxuICAgICAgICB9XHJcbiAgICAgIH1cclxuICAgICAgXHJcbiAgICAgIC8vIHJlbmRlciB0aGUgZW5kIHBvaW50cyBzaGFwZXMgb2YgdGhlIGdpdmVuIGVkZ2VcclxuICAgICAgZnVuY3Rpb24gcmVuZGVyRW5kUG9pbnRTaGFwZXMoZWRnZSkge1xyXG4gICAgICAgIGlmKCFlZGdlKXtcclxuICAgICAgICAgIHJldHVybjtcclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIHZhciBlZGdlX3B0cyA9IGFuY2hvclBvaW50VXRpbGl0aWVzLmdldEFuY2hvcnNBc0FycmF5KGVkZ2UpO1xyXG4gICAgICAgIGlmKHR5cGVvZiBlZGdlX3B0cyA9PT0gJ3VuZGVmaW5lZCcpe1xyXG4gICAgICAgICAgZWRnZV9wdHMgPSBbXTtcclxuICAgICAgICB9ICAgICAgIFxyXG4gICAgICAgIHZhciBzb3VyY2VQb3MgPSBlZGdlLnNvdXJjZUVuZHBvaW50KCk7XHJcbiAgICAgICAgdmFyIHRhcmdldFBvcyA9IGVkZ2UudGFyZ2V0RW5kcG9pbnQoKTtcclxuICAgICAgICBlZGdlX3B0cy51bnNoaWZ0KHNvdXJjZVBvcy55KTtcclxuICAgICAgICBlZGdlX3B0cy51bnNoaWZ0KHNvdXJjZVBvcy54KTtcclxuICAgICAgICBlZGdlX3B0cy5wdXNoKHRhcmdldFBvcy54KTtcclxuICAgICAgICBlZGdlX3B0cy5wdXNoKHRhcmdldFBvcy55KTsgXHJcblxyXG4gICAgICAgXHJcbiAgICAgICAgaWYoIWVkZ2VfcHRzKVxyXG4gICAgICAgICAgcmV0dXJuO1xyXG5cclxuICAgICAgICB2YXIgc3JjID0ge1xyXG4gICAgICAgICAgeDogZWRnZV9wdHNbMF0sXHJcbiAgICAgICAgICB5OiBlZGdlX3B0c1sxXVxyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgdmFyIHRhcmdldCA9IHtcclxuICAgICAgICAgIHg6IGVkZ2VfcHRzW2VkZ2VfcHRzLmxlbmd0aC0yXSxcclxuICAgICAgICAgIHk6IGVkZ2VfcHRzW2VkZ2VfcHRzLmxlbmd0aC0xXVxyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgdmFyIG5leHRUb1NvdXJjZSA9IHtcclxuICAgICAgICAgIHg6IGVkZ2VfcHRzWzJdLFxyXG4gICAgICAgICAgeTogZWRnZV9wdHNbM11cclxuICAgICAgICB9XHJcbiAgICAgICAgdmFyIG5leHRUb1RhcmdldCA9IHtcclxuICAgICAgICAgIHg6IGVkZ2VfcHRzW2VkZ2VfcHRzLmxlbmd0aC00XSxcclxuICAgICAgICAgIHk6IGVkZ2VfcHRzW2VkZ2VfcHRzLmxlbmd0aC0zXVxyXG4gICAgICAgIH1cclxuICAgICAgICB2YXIgbGVuZ3RoID0gZ2V0QW5jaG9yU2hhcGVzTGVuZ3RoKGVkZ2UpICogMC42NTtcclxuICAgICAgICBcclxuICAgICAgICByZW5kZXJFYWNoRW5kUG9pbnRTaGFwZShzcmMsIHRhcmdldCwgbGVuZ3RoLG5leHRUb1NvdXJjZSxuZXh0VG9UYXJnZXQpO1xyXG4gICAgICAgIFxyXG4gICAgICB9XHJcblxyXG4gICAgICBmdW5jdGlvbiByZW5kZXJFYWNoRW5kUG9pbnRTaGFwZShzb3VyY2UsIHRhcmdldCwgbGVuZ3RoLG5leHRUb1NvdXJjZSxuZXh0VG9UYXJnZXQpIHtcclxuICAgICAgICAvLyBnZXQgdGhlIHRvcCBsZWZ0IGNvb3JkaW5hdGVzIG9mIHNvdXJjZSBhbmQgdGFyZ2V0XHJcbiAgICAgICAgdmFyIHNUb3BMZWZ0WCA9IHNvdXJjZS54IC0gbGVuZ3RoIC8gMjtcclxuICAgICAgICB2YXIgc1RvcExlZnRZID0gc291cmNlLnkgLSBsZW5ndGggLyAyO1xyXG5cclxuICAgICAgICB2YXIgdFRvcExlZnRYID0gdGFyZ2V0LnggLSBsZW5ndGggLyAyO1xyXG4gICAgICAgIHZhciB0VG9wTGVmdFkgPSB0YXJnZXQueSAtIGxlbmd0aCAvIDI7XHJcblxyXG4gICAgICAgIHZhciBuZXh0VG9Tb3VyY2VYID0gbmV4dFRvU291cmNlLnggLSBsZW5ndGggLzI7XHJcbiAgICAgICAgdmFyIG5leHRUb1NvdXJjZVkgPSBuZXh0VG9Tb3VyY2UueSAtIGxlbmd0aCAvIDI7XHJcblxyXG4gICAgICAgIHZhciBuZXh0VG9UYXJnZXRYID0gbmV4dFRvVGFyZ2V0LnggLSBsZW5ndGggLzI7XHJcbiAgICAgICAgdmFyIG5leHRUb1RhcmdldFkgPSBuZXh0VG9UYXJnZXQueSAtIGxlbmd0aCAvMjtcclxuXHJcblxyXG4gICAgICAgIC8vIGNvbnZlcnQgdG8gcmVuZGVyZWQgcGFyYW1ldGVyc1xyXG4gICAgICAgIHZhciByZW5kZXJlZFNvdXJjZVBvcyA9IGNvbnZlcnRUb1JlbmRlcmVkUG9zaXRpb24oe3g6IHNUb3BMZWZ0WCwgeTogc1RvcExlZnRZfSk7XHJcbiAgICAgICAgdmFyIHJlbmRlcmVkVGFyZ2V0UG9zID0gY29udmVydFRvUmVuZGVyZWRQb3NpdGlvbih7eDogdFRvcExlZnRYLCB5OiB0VG9wTGVmdFl9KTtcclxuICAgICAgICBsZW5ndGggPSBsZW5ndGggKiBjeS56b29tKCkgLyAyO1xyXG5cclxuICAgICAgICB2YXIgcmVuZGVyZWROZXh0VG9Tb3VyY2UgPSBjb252ZXJ0VG9SZW5kZXJlZFBvc2l0aW9uKHt4OiBuZXh0VG9Tb3VyY2VYLCB5OiBuZXh0VG9Tb3VyY2VZfSk7XHJcbiAgICAgICAgdmFyIHJlbmRlcmVkTmV4dFRvVGFyZ2V0ID0gY29udmVydFRvUmVuZGVyZWRQb3NpdGlvbih7eDogbmV4dFRvVGFyZ2V0WCwgeTogbmV4dFRvVGFyZ2V0WX0pO1xyXG4gICAgICAgIFxyXG4gICAgICAgIC8vaG93IGZhciB0byBnbyBmcm9tIHRoZSBub2RlIGFsb25nIHRoZSBlZGdlXHJcbiAgICAgICAgdmFyIGRpc3RhbmNlRnJvbU5vZGUgPSBsZW5ndGg7XHJcblxyXG4gICAgICAgIHZhciBkaXN0YW5jZVNvdXJjZSA9IE1hdGguc3FydChNYXRoLnBvdyhyZW5kZXJlZE5leHRUb1NvdXJjZS54IC0gcmVuZGVyZWRTb3VyY2VQb3MueCwyKSArIE1hdGgucG93KHJlbmRlcmVkTmV4dFRvU291cmNlLnkgLSByZW5kZXJlZFNvdXJjZVBvcy55LDIpKTsgICAgICAgIFxyXG4gICAgICAgIHZhciBzb3VyY2VFbmRQb2ludFggPSByZW5kZXJlZFNvdXJjZVBvcy54ICsgKChkaXN0YW5jZUZyb21Ob2RlLyBkaXN0YW5jZVNvdXJjZSkqIChyZW5kZXJlZE5leHRUb1NvdXJjZS54IC0gcmVuZGVyZWRTb3VyY2VQb3MueCkpO1xyXG4gICAgICAgIHZhciBzb3VyY2VFbmRQb2ludFkgPSByZW5kZXJlZFNvdXJjZVBvcy55ICsgKChkaXN0YW5jZUZyb21Ob2RlLyBkaXN0YW5jZVNvdXJjZSkqIChyZW5kZXJlZE5leHRUb1NvdXJjZS55IC0gcmVuZGVyZWRTb3VyY2VQb3MueSkpO1xyXG5cclxuXHJcbiAgICAgICAgdmFyIGRpc3RhbmNlVGFyZ2V0ID0gTWF0aC5zcXJ0KE1hdGgucG93KHJlbmRlcmVkTmV4dFRvVGFyZ2V0LnggLSByZW5kZXJlZFRhcmdldFBvcy54LDIpICsgTWF0aC5wb3cocmVuZGVyZWROZXh0VG9UYXJnZXQueSAtIHJlbmRlcmVkVGFyZ2V0UG9zLnksMikpOyAgICAgICAgXHJcbiAgICAgICAgdmFyIHRhcmdldEVuZFBvaW50WCA9IHJlbmRlcmVkVGFyZ2V0UG9zLnggKyAoKGRpc3RhbmNlRnJvbU5vZGUvIGRpc3RhbmNlVGFyZ2V0KSogKHJlbmRlcmVkTmV4dFRvVGFyZ2V0LnggLSByZW5kZXJlZFRhcmdldFBvcy54KSk7XHJcbiAgICAgICAgdmFyIHRhcmdldEVuZFBvaW50WSA9IHJlbmRlcmVkVGFyZ2V0UG9zLnkgKyAoKGRpc3RhbmNlRnJvbU5vZGUvIGRpc3RhbmNlVGFyZ2V0KSogKHJlbmRlcmVkTmV4dFRvVGFyZ2V0LnkgLSByZW5kZXJlZFRhcmdldFBvcy55KSk7IFxyXG5cclxuICAgICAgICAvLyByZW5kZXIgZW5kIHBvaW50IHNoYXBlIGZvciBzb3VyY2UgYW5kIHRhcmdldFxyXG4gICAgICAgIC8vIHRoZSBudWxsIGNoZWNrcyBhcmUgbm90IHRoZW9yZXRpY2FsbHkgcmVxdWlyZWRcclxuICAgICAgICAvLyBidXQgdGhleSBwcm90ZWN0IGZyb20gYmFkIHN5bmNocm9uaW91cyBjYWxscyBvZiByZWZyZXNoRHJhd3MoKVxyXG4gICAgICAgIGlmKGVuZHBvaW50U2hhcGUxID09PSBudWxsKXtcclxuICAgICAgICAgIGVuZHBvaW50U2hhcGUxID0gbmV3IEtvbnZhLkNpcmNsZSh7XHJcbiAgICAgICAgICAgIHg6IHNvdXJjZUVuZFBvaW50WCArIGxlbmd0aCxcclxuICAgICAgICAgICAgeTogc291cmNlRW5kUG9pbnRZICsgbGVuZ3RoLFxyXG4gICAgICAgICAgICByYWRpdXM6IGxlbmd0aCxcclxuICAgICAgICAgICAgZmlsbDogJ2JsYWNrJyxcclxuICAgICAgICAgIH0pO1xyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgaWYoZW5kcG9pbnRTaGFwZTIgPT09IG51bGwpe1xyXG4gICAgICAgICAgZW5kcG9pbnRTaGFwZTIgPSBuZXcgS29udmEuQ2lyY2xlKHtcclxuICAgICAgICAgICAgeDogdGFyZ2V0RW5kUG9pbnRYICsgbGVuZ3RoLFxyXG4gICAgICAgICAgICB5OiB0YXJnZXRFbmRQb2ludFkgKyBsZW5ndGgsXHJcbiAgICAgICAgICAgIHJhZGl1czogbGVuZ3RoLFxyXG4gICAgICAgICAgICBmaWxsOiAnYmxhY2snLFxyXG4gICAgICAgICAgfSk7XHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICBjYW52YXMuYWRkKGVuZHBvaW50U2hhcGUxKTtcclxuICAgICAgICBjYW52YXMuYWRkKGVuZHBvaW50U2hhcGUyKTtcclxuICAgICAgICBjYW52YXMuZHJhdygpO1xyXG4gICAgICAgIFxyXG4gICAgICB9XHJcblxyXG4gICAgICAvLyBnZXQgdGhlIGxlbmd0aCBvZiBhbmNob3IgcG9pbnRzIHRvIGJlIHJlbmRlcmVkXHJcbiAgICAgIGZ1bmN0aW9uIGdldEFuY2hvclNoYXBlc0xlbmd0aChlZGdlKSB7XHJcbiAgICAgICAgdmFyIGZhY3RvciA9IG9wdGlvbnMoKS5hbmNob3JTaGFwZVNpemVGYWN0b3I7XHJcbiAgICAgICAgaWYgKHBhcnNlRmxvYXQoZWRnZS5jc3MoJ3dpZHRoJykpIDw9IDIuNSlcclxuICAgICAgICAgIHJldHVybiAyLjUgKiBmYWN0b3I7XHJcbiAgICAgICAgZWxzZSByZXR1cm4gcGFyc2VGbG9hdChlZGdlLmNzcygnd2lkdGgnKSkqZmFjdG9yO1xyXG4gICAgICB9XHJcbiAgICAgIFxyXG4gICAgICAvLyBjaGVjayBpZiB0aGUgYW5jaG9yIHJlcHJlc2VudGVkIGJ5IHt4LCB5fSBpcyBpbnNpZGUgdGhlIHBvaW50IHNoYXBlXHJcbiAgICAgIGZ1bmN0aW9uIGNoZWNrSWZJbnNpZGVTaGFwZSh4LCB5LCBsZW5ndGgsIGNlbnRlclgsIGNlbnRlclkpe1xyXG4gICAgICAgIHZhciBtaW5YID0gY2VudGVyWCAtIGxlbmd0aCAvIDI7XHJcbiAgICAgICAgdmFyIG1heFggPSBjZW50ZXJYICsgbGVuZ3RoIC8gMjtcclxuICAgICAgICB2YXIgbWluWSA9IGNlbnRlclkgLSBsZW5ndGggLyAyO1xyXG4gICAgICAgIHZhciBtYXhZID0gY2VudGVyWSArIGxlbmd0aCAvIDI7XHJcbiAgICAgICAgXHJcbiAgICAgICAgdmFyIGluc2lkZSA9ICh4ID49IG1pblggJiYgeCA8PSBtYXhYKSAmJiAoeSA+PSBtaW5ZICYmIHkgPD0gbWF4WSk7XHJcbiAgICAgICAgcmV0dXJuIGluc2lkZTtcclxuICAgICAgfVxyXG5cclxuICAgICAgLy8gZ2V0IHRoZSBpbmRleCBvZiBhbmNob3IgY29udGFpbmluZyB0aGUgcG9pbnQgcmVwcmVzZW50ZWQgYnkge3gsIHl9XHJcbiAgICAgIGZ1bmN0aW9uIGdldENvbnRhaW5pbmdTaGFwZUluZGV4KHgsIHksIGVkZ2UpIHtcclxuICAgICAgICB2YXIgdHlwZSA9IGFuY2hvclBvaW50VXRpbGl0aWVzLmdldEVkZ2VUeXBlKGVkZ2UpO1xyXG5cclxuICAgICAgICBpZih0eXBlID09PSAnaW5jb25jbHVzaXZlJyl7XHJcbiAgICAgICAgICByZXR1cm4gLTE7XHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICBpZihlZGdlLmRhdGEoYW5jaG9yUG9pbnRVdGlsaXRpZXMuc3ludGF4W3R5cGVdWyd3ZWlnaHQnXSkgPT0gbnVsbCB8fCBcclxuICAgICAgICAgIGVkZ2UuZGF0YShhbmNob3JQb2ludFV0aWxpdGllcy5zeW50YXhbdHlwZV1bJ3dlaWdodCddKS5sZW5ndGggPT0gMCl7XHJcbiAgICAgICAgICByZXR1cm4gLTE7XHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICB2YXIgYW5jaG9yTGlzdCA9IGFuY2hvclBvaW50VXRpbGl0aWVzLmdldEFuY2hvcnNBc0FycmF5KGVkZ2UpOy8vZWRnZS5fcHJpdmF0ZS5yZGF0YS5zZWdwdHM7XHJcbiAgICAgICAgdmFyIGxlbmd0aCA9IGdldEFuY2hvclNoYXBlc0xlbmd0aChlZGdlKTtcclxuXHJcbiAgICAgICAgZm9yKHZhciBpID0gMDsgYW5jaG9yTGlzdCAmJiBpIDwgYW5jaG9yTGlzdC5sZW5ndGg7IGkgPSBpICsgMil7XHJcbiAgICAgICAgICB2YXIgYW5jaG9yWCA9IGFuY2hvckxpc3RbaV07XHJcbiAgICAgICAgICB2YXIgYW5jaG9yWSA9IGFuY2hvckxpc3RbaSArIDFdO1xyXG5cclxuICAgICAgICAgIHZhciBpbnNpZGUgPSBjaGVja0lmSW5zaWRlU2hhcGUoeCwgeSwgbGVuZ3RoLCBhbmNob3JYLCBhbmNob3JZKTtcclxuICAgICAgICAgIGlmKGluc2lkZSl7XHJcbiAgICAgICAgICAgIHJldHVybiBpIC8gMjtcclxuICAgICAgICAgIH1cclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIHJldHVybiAtMTtcclxuICAgICAgfTtcclxuXHJcbiAgICAgIGZ1bmN0aW9uIGdldENvbnRhaW5pbmdFbmRQb2ludCh4LCB5LCBlZGdlKXtcclxuICAgICAgICB2YXIgbGVuZ3RoID0gZ2V0QW5jaG9yU2hhcGVzTGVuZ3RoKGVkZ2UpO1xyXG4gICAgICAgIHZhciBhbGxQdHMgPSBlZGdlLl9wcml2YXRlLnJzY3JhdGNoLmFsbHB0cztcclxuICAgICAgICB2YXIgc3JjID0ge1xyXG4gICAgICAgICAgeDogYWxsUHRzWzBdLFxyXG4gICAgICAgICAgeTogYWxsUHRzWzFdXHJcbiAgICAgICAgfVxyXG4gICAgICAgIHZhciB0YXJnZXQgPSB7XHJcbiAgICAgICAgICB4OiBhbGxQdHNbYWxsUHRzLmxlbmd0aC0yXSxcclxuICAgICAgICAgIHk6IGFsbFB0c1thbGxQdHMubGVuZ3RoLTFdXHJcbiAgICAgICAgfVxyXG4gICAgICAgIGNvbnZlcnRUb1JlbmRlcmVkUG9zaXRpb24oc3JjKTtcclxuICAgICAgICBjb252ZXJ0VG9SZW5kZXJlZFBvc2l0aW9uKHRhcmdldCk7XHJcbiAgICAgICAgXHJcbiAgICAgICAgLy8gU291cmNlOjAsIFRhcmdldDoxLCBOb25lOi0xXHJcbiAgICAgICAgaWYoY2hlY2tJZkluc2lkZVNoYXBlKHgsIHksIGxlbmd0aCwgc3JjLngsIHNyYy55KSlcclxuICAgICAgICAgIHJldHVybiAwO1xyXG4gICAgICAgIGVsc2UgaWYoY2hlY2tJZkluc2lkZVNoYXBlKHgsIHksIGxlbmd0aCwgdGFyZ2V0LngsIHRhcmdldC55KSlcclxuICAgICAgICAgIHJldHVybiAxO1xyXG4gICAgICAgIGVsc2VcclxuICAgICAgICAgIHJldHVybiAtMTtcclxuICAgICAgfVxyXG4gICAgICBcclxuICAgICAgLy8gc3RvcmUgdGhlIGN1cnJlbnQgc3RhdHVzIG9mIGdlc3R1cmVzIGFuZCBzZXQgdGhlbSB0byBmYWxzZVxyXG4gICAgICBmdW5jdGlvbiBkaXNhYmxlR2VzdHVyZXMoKSB7XHJcbiAgICAgICAgbGFzdFBhbm5pbmdFbmFibGVkID0gY3kucGFubmluZ0VuYWJsZWQoKTtcclxuICAgICAgICBsYXN0Wm9vbWluZ0VuYWJsZWQgPSBjeS56b29taW5nRW5hYmxlZCgpO1xyXG4gICAgICAgIGxhc3RCb3hTZWxlY3Rpb25FbmFibGVkID0gY3kuYm94U2VsZWN0aW9uRW5hYmxlZCgpO1xyXG5cclxuICAgICAgICBjeS56b29taW5nRW5hYmxlZChmYWxzZSlcclxuICAgICAgICAgIC5wYW5uaW5nRW5hYmxlZChmYWxzZSlcclxuICAgICAgICAgIC5ib3hTZWxlY3Rpb25FbmFibGVkKGZhbHNlKTtcclxuICAgICAgfVxyXG4gICAgICBcclxuICAgICAgLy8gcmVzZXQgdGhlIGdlc3R1cmVzIGJ5IHRoZWlyIGxhdGVzdCBzdGF0dXNcclxuICAgICAgZnVuY3Rpb24gcmVzZXRHZXN0dXJlcygpIHtcclxuICAgICAgICBjeS56b29taW5nRW5hYmxlZChsYXN0Wm9vbWluZ0VuYWJsZWQpXHJcbiAgICAgICAgICAucGFubmluZ0VuYWJsZWQobGFzdFBhbm5pbmdFbmFibGVkKVxyXG4gICAgICAgICAgLmJveFNlbGVjdGlvbkVuYWJsZWQobGFzdEJveFNlbGVjdGlvbkVuYWJsZWQpO1xyXG4gICAgICB9XHJcblxyXG4gICAgICBmdW5jdGlvbiB0dXJuT2ZmQWN0aXZlQmdDb2xvcigpe1xyXG4gICAgICAgIC8vIGZvdW5kIHRoaXMgYXQgdGhlIGN5LW5vZGUtcmVzaXplIGNvZGUsIGJ1dCBkb2Vzbid0IHNlZW0gdG8gZmluZCB0aGUgb2JqZWN0IG1vc3Qgb2YgdGhlIHRpbWVcclxuICAgICAgICBpZiggY3kuc3R5bGUoKS5fcHJpdmF0ZS5jb3JlU3R5bGVbXCJhY3RpdmUtYmctb3BhY2l0eVwiXSkge1xyXG4gICAgICAgICAgbGFzdEFjdGl2ZUJnT3BhY2l0eSA9IGN5LnN0eWxlKCkuX3ByaXZhdGUuY29yZVN0eWxlW1wiYWN0aXZlLWJnLW9wYWNpdHlcIl0udmFsdWU7XHJcbiAgICAgICAgfVxyXG4gICAgICAgIGVsc2Uge1xyXG4gICAgICAgICAgLy8gYXJiaXRyYXJ5LCBmZWVsIGZyZWUgdG8gY2hhbmdlXHJcbiAgICAgICAgICAvLyB0cmlhbCBhbmQgZXJyb3Igc2hvd2VkIHRoYXQgMC4xNSB3YXMgY2xvc2VzdCB0byB0aGUgb2xkIGNvbG9yXHJcbiAgICAgICAgICBsYXN0QWN0aXZlQmdPcGFjaXR5ID0gMC4xNTtcclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIGN5LnN0eWxlKClcclxuICAgICAgICAgIC5zZWxlY3RvcihcImNvcmVcIilcclxuICAgICAgICAgIC5zdHlsZShcImFjdGl2ZS1iZy1vcGFjaXR5XCIsIDApXHJcbiAgICAgICAgICAudXBkYXRlKCk7XHJcbiAgICAgIH1cclxuXHJcbiAgICAgIGZ1bmN0aW9uIHJlc2V0QWN0aXZlQmdDb2xvcigpe1xyXG4gICAgICAgIGN5LnN0eWxlKClcclxuICAgICAgICAgIC5zZWxlY3RvcihcImNvcmVcIilcclxuICAgICAgICAgIC5zdHlsZShcImFjdGl2ZS1iZy1vcGFjaXR5XCIsIGxhc3RBY3RpdmVCZ09wYWNpdHkpXHJcbiAgICAgICAgICAudXBkYXRlKCk7XHJcbiAgICAgIH1cclxuXHJcbiAgICAgIGZ1bmN0aW9uIG1vdmVBbmNob3JQb2ludHMocG9zaXRpb25EaWZmLCBlZGdlcykge1xyXG4gICAgICAgICAgZWRnZXMuZm9yRWFjaChmdW5jdGlvbiggZWRnZSApe1xyXG4gICAgICAgICAgICAgIHZhciBwcmV2aW91c0FuY2hvcnNQb3NpdGlvbiA9IGFuY2hvclBvaW50VXRpbGl0aWVzLmdldEFuY2hvcnNBc0FycmF5KGVkZ2UpO1xyXG4gICAgICAgICAgICAgIHZhciBuZXh0QW5jaG9yUG9pbnRzUG9zaXRpb24gPSBbXTtcclxuICAgICAgICAgICAgICBpZiAocHJldmlvdXNBbmNob3JzUG9zaXRpb24gIT0gdW5kZWZpbmVkKVxyXG4gICAgICAgICAgICAgIHtcclxuICAgICAgICAgICAgICAgIGZvciAodmFyIGk9MDsgaTxwcmV2aW91c0FuY2hvcnNQb3NpdGlvbi5sZW5ndGg7IGkrPTIpXHJcbiAgICAgICAgICAgICAgICB7XHJcbiAgICAgICAgICAgICAgICAgICAgbmV4dEFuY2hvclBvaW50c1Bvc2l0aW9uLnB1c2goe3g6IHByZXZpb3VzQW5jaG9yc1Bvc2l0aW9uW2ldK3Bvc2l0aW9uRGlmZi54LCB5OiBwcmV2aW91c0FuY2hvcnNQb3NpdGlvbltpKzFdK3Bvc2l0aW9uRGlmZi55fSk7XHJcbiAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgICB2YXIgdHlwZSA9IGFuY2hvclBvaW50VXRpbGl0aWVzLmdldEVkZ2VUeXBlKGVkZ2UpO1xyXG5cclxuICAgICAgICAgICAgICAgIGlmKGFuY2hvclBvaW50VXRpbGl0aWVzLmVkZ2VUeXBlSW5jb25jbHVzaXZlU2hvdWxkbnRIYXBwZW4odHlwZSwgXCJVaVV0aWxpdGllcy5qcywgbW92ZUFuY2hvclBvaW50c1wiKSl7XHJcbiAgICAgICAgICAgICAgICAgIHJldHVybjtcclxuICAgICAgICAgICAgICAgIH1cclxuXHJcbiAgICAgICAgICAgICAgICBlZGdlLmRhdGEoYW5jaG9yUG9pbnRVdGlsaXRpZXMuc3ludGF4W3R5cGVdWydwb2ludFBvcyddLCBuZXh0QW5jaG9yUG9pbnRzUG9zaXRpb24pO1xyXG4gICAgICAgICAgICAgIH1cclxuICAgICAgICAgIH0pO1xyXG4gICAgICAgICAgYW5jaG9yUG9pbnRVdGlsaXRpZXMuaW5pdEFuY2hvclBvaW50cyhvcHRpb25zKCkuYmVuZFBvc2l0aW9uc0Z1bmN0aW9uLCBvcHRpb25zKCkuY29udHJvbFBvc2l0aW9uc0Z1bmN0aW9uLCBlZGdlcyk7XHJcbiAgICAgICAgICBcclxuICAgICAgICAgIC8vIExpc3RlbmVyIGRlZmluZWQgaW4gb3RoZXIgZXh0ZW5zaW9uXHJcbiAgICAgICAgICAvLyBNaWdodCBoYXZlIGNvbXBhdGliaWxpdHkgaXNzdWVzIGFmdGVyIHRoZSB1bmJ1bmRsZWQgYmV6aWVyXHJcbiAgICAgICAgICBjeS50cmlnZ2VyKCdiZW5kUG9pbnRNb3ZlbWVudCcpOyBcclxuICAgICAgfVxyXG5cclxuICAgICAgZnVuY3Rpb24gbW92ZUFuY2hvck9uRHJhZyhlZGdlLCB0eXBlLCBpbmRleCwgcG9zaXRpb24pe1xyXG4gICAgICAgIHZhciB3ZWlnaHRzID0gZWRnZS5kYXRhKGFuY2hvclBvaW50VXRpbGl0aWVzLnN5bnRheFt0eXBlXVsnd2VpZ2h0J10pO1xyXG4gICAgICAgIHZhciBkaXN0YW5jZXMgPSBlZGdlLmRhdGEoYW5jaG9yUG9pbnRVdGlsaXRpZXMuc3ludGF4W3R5cGVdWydkaXN0YW5jZSddKTtcclxuICAgICAgICBcclxuICAgICAgICB2YXIgcmVsYXRpdmVBbmNob3JQb3NpdGlvbiA9IGFuY2hvclBvaW50VXRpbGl0aWVzLmNvbnZlcnRUb1JlbGF0aXZlUG9zaXRpb24oZWRnZSwgcG9zaXRpb24pO1xyXG4gICAgICAgIHdlaWdodHNbaW5kZXhdID0gcmVsYXRpdmVBbmNob3JQb3NpdGlvbi53ZWlnaHQ7XHJcbiAgICAgICAgZGlzdGFuY2VzW2luZGV4XSA9IHJlbGF0aXZlQW5jaG9yUG9zaXRpb24uZGlzdGFuY2U7XHJcbiAgICAgICAgXHJcbiAgICAgICAgZWRnZS5kYXRhKGFuY2hvclBvaW50VXRpbGl0aWVzLnN5bnRheFt0eXBlXVsnd2VpZ2h0J10sIHdlaWdodHMpO1xyXG4gICAgICAgIGVkZ2UuZGF0YShhbmNob3JQb2ludFV0aWxpdGllcy5zeW50YXhbdHlwZV1bJ2Rpc3RhbmNlJ10sIGRpc3RhbmNlcyk7XHJcbiAgICAgIH1cclxuXHJcbiAgICAgIC8vIGRlYm91bmNlZCBkdWUgdG8gbGFyZ2UgYW1vdXQgb2YgY2FsbHMgdG8gdGFwZHJhZ1xyXG4gICAgICB2YXIgX21vdmVBbmNob3JPbkRyYWcgPSBkZWJvdW5jZSggbW92ZUFuY2hvck9uRHJhZywgNSk7XHJcblxyXG4gICAgICB7ICBcclxuICAgICAgICBsYXN0UGFubmluZ0VuYWJsZWQgPSBjeS5wYW5uaW5nRW5hYmxlZCgpO1xyXG4gICAgICAgIGxhc3Rab29taW5nRW5hYmxlZCA9IGN5Lnpvb21pbmdFbmFibGVkKCk7XHJcbiAgICAgICAgbGFzdEJveFNlbGVjdGlvbkVuYWJsZWQgPSBjeS5ib3hTZWxlY3Rpb25FbmFibGVkKCk7XHJcbiAgICAgICAgXHJcbiAgICAgICAgLy8gSW5pdGlsaXplIHRoZSBlZGdlVG9IaWdobGlnaHRCZW5kcyBhbmQgbnVtYmVyT2ZTZWxlY3RlZEVkZ2VzXHJcbiAgICAgICAge1xyXG4gICAgICAgICAgdmFyIHNlbGVjdGVkRWRnZXMgPSBjeS5lZGdlcygnOnNlbGVjdGVkJyk7XHJcbiAgICAgICAgICB2YXIgbnVtYmVyT2ZTZWxlY3RlZEVkZ2VzID0gc2VsZWN0ZWRFZGdlcy5sZW5ndGg7XHJcbiAgICAgICAgICBcclxuICAgICAgICAgIGlmICggbnVtYmVyT2ZTZWxlY3RlZEVkZ2VzID09PSAxICkge1xyXG4gICAgICAgICAgICBlZGdlVG9IaWdobGlnaHQgPSBzZWxlY3RlZEVkZ2VzWzBdO1xyXG4gICAgICAgICAgfVxyXG4gICAgICAgIH1cclxuICAgICAgICBcclxuICAgICAgICBjeS5iaW5kKCd6b29tIHBhbicsIGVab29tID0gZnVuY3Rpb24gKCkge1xyXG4gICAgICAgICAgaWYgKCAhZWRnZVRvSGlnaGxpZ2h0ICkge1xyXG4gICAgICAgICAgICByZXR1cm47XHJcbiAgICAgICAgICB9XHJcbiAgICAgICAgICBcclxuICAgICAgICAgIHJlZnJlc2hEcmF3cygpO1xyXG4gICAgICAgIH0pO1xyXG5cclxuICAgICAgICAvLyBjeS5vZmYgaXMgbmV2ZXIgY2FsbGVkIG9uIHRoaXMgbGlzdGVuZXJcclxuICAgICAgICBjeS5vbignZGF0YScsICdlZGdlJywgIGZ1bmN0aW9uICgpIHtcclxuICAgICAgICAgIGlmICggIWVkZ2VUb0hpZ2hsaWdodCApIHtcclxuICAgICAgICAgICAgcmV0dXJuO1xyXG4gICAgICAgICAgfVxyXG4gICAgICAgICAgXHJcbiAgICAgICAgICByZWZyZXNoRHJhd3MoKTtcclxuICAgICAgICB9KTtcclxuXHJcbiAgICAgICAgY3kub24oJ3N0eWxlJywgJ2VkZ2UuZWRnZWJlbmRlZGl0aW5nLWhhc2JlbmRwb2ludHM6c2VsZWN0ZWQsIGVkZ2UuZWRnZWNvbnRyb2xlZGl0aW5nLWhhc2NvbnRyb2xwb2ludHM6c2VsZWN0ZWQnLCBlU3R5bGUgPSBmdW5jdGlvbiAoKSB7XHJcbiAgICAgICAgICBzZXRUaW1lb3V0KGZ1bmN0aW9uKCl7cmVmcmVzaERyYXdzKCl9LCA1MCk7XHJcbiAgICAgICAgfSk7XHJcblxyXG4gICAgICAgIGN5Lm9uKCdyZW1vdmUnLCAnZWRnZScsIGVSZW1vdmUgPSBmdW5jdGlvbiAoKSB7XHJcbiAgICAgICAgICB2YXIgZWRnZSA9IHRoaXM7XHJcbiAgICAgICAgICBpZiAoZWRnZS5zZWxlY3RlZCgpKSB7XHJcbiAgICAgICAgICAgIG51bWJlck9mU2VsZWN0ZWRFZGdlcyA9IG51bWJlck9mU2VsZWN0ZWRFZGdlcyAtIDE7XHJcbiAgICAgICAgICAgIFxyXG4gICAgICAgICAgICBjeS5zdGFydEJhdGNoKCk7XHJcbiAgICAgICAgICAgIFxyXG4gICAgICAgICAgICBpZiAoZWRnZVRvSGlnaGxpZ2h0KSB7XHJcbiAgICAgICAgICAgICAgZWRnZVRvSGlnaGxpZ2h0LnJlbW92ZUNsYXNzKCdjeS1lZGdlLWVkaXRpbmctaGlnaGxpZ2h0Jyk7XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgXHJcbiAgICAgICAgICAgIGlmIChudW1iZXJPZlNlbGVjdGVkRWRnZXMgPT09IDEpIHtcclxuICAgICAgICAgICAgICB2YXIgc2VsZWN0ZWRFZGdlcyA9IGN5LmVkZ2VzKCc6c2VsZWN0ZWQnKTtcclxuICAgICAgICAgICAgICBcclxuICAgICAgICAgICAgICAvLyBJZiB1c2VyIHJlbW92ZXMgYWxsIHNlbGVjdGVkIGVkZ2VzIGF0IGEgc2luZ2xlIG9wZXJhdGlvbiB0aGVuIG91ciAnbnVtYmVyT2ZTZWxlY3RlZEVkZ2VzJ1xyXG4gICAgICAgICAgICAgIC8vIG1heSBiZSBtaXNsZWFkaW5nLiBUaGVyZWZvcmUgd2UgbmVlZCB0byBjaGVjayBpZiB0aGUgbnVtYmVyIG9mIGVkZ2VzIHRvIGhpZ2hsaWdodCBpcyByZWFseSAxIGhlcmUuXHJcbiAgICAgICAgICAgICAgaWYgKHNlbGVjdGVkRWRnZXMubGVuZ3RoID09PSAxKSB7XHJcbiAgICAgICAgICAgICAgICBlZGdlVG9IaWdobGlnaHQgPSBzZWxlY3RlZEVkZ2VzWzBdO1xyXG4gICAgICAgICAgICAgICAgZWRnZVRvSGlnaGxpZ2h0LmFkZENsYXNzKCdjeS1lZGdlLWVkaXRpbmctaGlnaGxpZ2h0Jyk7XHJcbiAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgIGVsc2Uge1xyXG4gICAgICAgICAgICAgICAgZWRnZVRvSGlnaGxpZ2h0ID0gdW5kZWZpbmVkO1xyXG4gICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICBlbHNlIHtcclxuICAgICAgICAgICAgICBlZGdlVG9IaWdobGlnaHQgPSB1bmRlZmluZWQ7XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgXHJcbiAgICAgICAgICAgIGN5LmVuZEJhdGNoKCk7XHJcbiAgICAgICAgICB9XHJcbiAgICAgICAgICByZWZyZXNoRHJhd3MoKTtcclxuICAgICAgICB9KTtcclxuICAgICAgICBcclxuICAgICAgICAgY3kub24oJ2FkZCcsICdlZGdlJywgZUFkZCA9IGZ1bmN0aW9uICgpIHtcclxuICAgICAgICAgIHZhciBlZGdlID0gdGhpcztcclxuICAgICAgICAgIGlmIChlZGdlLnNlbGVjdGVkKCkpIHtcclxuICAgICAgICAgICAgbnVtYmVyT2ZTZWxlY3RlZEVkZ2VzID0gbnVtYmVyT2ZTZWxlY3RlZEVkZ2VzICsgMTtcclxuICAgICAgICAgICAgXHJcbiAgICAgICAgICAgIGN5LnN0YXJ0QmF0Y2goKTtcclxuICAgICAgICAgICAgXHJcbiAgICAgICAgICAgIGlmIChlZGdlVG9IaWdobGlnaHQpIHtcclxuICAgICAgICAgICAgICBlZGdlVG9IaWdobGlnaHQucmVtb3ZlQ2xhc3MoJ2N5LWVkZ2UtZWRpdGluZy1oaWdobGlnaHQnKTtcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICBcclxuICAgICAgICAgICAgaWYgKG51bWJlck9mU2VsZWN0ZWRFZGdlcyA9PT0gMSkge1xyXG4gICAgICAgICAgICAgIGVkZ2VUb0hpZ2hsaWdodCA9IGVkZ2U7XHJcbiAgICAgICAgICAgICAgZWRnZVRvSGlnaGxpZ2h0LmFkZENsYXNzKCdjeS1lZGdlLWVkaXRpbmctaGlnaGxpZ2h0Jyk7XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgZWxzZSB7XHJcbiAgICAgICAgICAgICAgZWRnZVRvSGlnaGxpZ2h0ID0gdW5kZWZpbmVkO1xyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgICAgIFxyXG4gICAgICAgICAgICBjeS5lbmRCYXRjaCgpO1xyXG4gICAgICAgICAgfVxyXG4gICAgICAgICAgcmVmcmVzaERyYXdzKCk7XHJcbiAgICAgICAgfSk7XHJcbiAgICAgICAgXHJcbiAgICAgICAgY3kub24oJ3NlbGVjdCcsICdlZGdlJywgZVNlbGVjdCA9IGZ1bmN0aW9uICgpIHtcclxuICAgICAgICAgIHZhciBlZGdlID0gdGhpcztcclxuXHJcbiAgICAgICAgICBpZihlZGdlLnRhcmdldCgpLmNvbm5lY3RlZEVkZ2VzKCkubGVuZ3RoID09IDAgfHwgZWRnZS5zb3VyY2UoKS5jb25uZWN0ZWRFZGdlcygpLmxlbmd0aCA9PSAwKXtcclxuICAgICAgICAgICAgcmV0dXJuO1xyXG4gICAgICAgICAgfVxyXG5cclxuICAgICAgICAgXHJcbiAgICAgICAgICBudW1iZXJPZlNlbGVjdGVkRWRnZXMgPSBudW1iZXJPZlNlbGVjdGVkRWRnZXMgKyAxO1xyXG4gICAgICAgICAgXHJcbiAgICAgICAgICBjeS5zdGFydEJhdGNoKCk7XHJcbiAgICAgICAgICAgIFxyXG4gICAgICAgICAgaWYgKGVkZ2VUb0hpZ2hsaWdodCkge1xyXG4gICAgICAgICAgICBlZGdlVG9IaWdobGlnaHQucmVtb3ZlQ2xhc3MoJ2N5LWVkZ2UtZWRpdGluZy1oaWdobGlnaHQnKTtcclxuICAgICAgICAgIH1cclxuICAgICAgICAgICAgXHJcbiAgICAgICAgICBpZiAobnVtYmVyT2ZTZWxlY3RlZEVkZ2VzID09PSAxKSB7XHJcbiAgICAgICAgICAgIGVkZ2VUb0hpZ2hsaWdodCA9IGVkZ2U7XHJcbiAgICAgICAgICAgIGVkZ2VUb0hpZ2hsaWdodC5hZGRDbGFzcygnY3ktZWRnZS1lZGl0aW5nLWhpZ2hsaWdodCcpO1xyXG4gICAgICAgICAgfVxyXG4gICAgICAgICAgZWxzZSB7XHJcbiAgICAgICAgICAgIGVkZ2VUb0hpZ2hsaWdodCA9IHVuZGVmaW5lZDtcclxuICAgICAgICAgIH1cclxuICAgICAgICAgIFxyXG4gICAgICAgICAgY3kuZW5kQmF0Y2goKTtcclxuICAgICAgICAgIHJlZnJlc2hEcmF3cygpO1xyXG4gICAgICAgIH0pO1xyXG4gICAgICAgIFxyXG4gICAgICAgIGN5Lm9uKCd1bnNlbGVjdCcsICdlZGdlJywgZVVuc2VsZWN0ID0gZnVuY3Rpb24gKCkge1xyXG4gICAgICAgICAgbnVtYmVyT2ZTZWxlY3RlZEVkZ2VzID0gbnVtYmVyT2ZTZWxlY3RlZEVkZ2VzIC0gMTtcclxuICAgICAgICAgICAgXHJcbiAgICAgICAgICBjeS5zdGFydEJhdGNoKCk7XHJcbiAgICAgICAgICAgIFxyXG4gICAgICAgICAgaWYgKGVkZ2VUb0hpZ2hsaWdodCkge1xyXG4gICAgICAgICAgICBlZGdlVG9IaWdobGlnaHQucmVtb3ZlQ2xhc3MoJ2N5LWVkZ2UtZWRpdGluZy1oaWdobGlnaHQnKTtcclxuICAgICAgICAgIH1cclxuICAgICAgICAgICAgXHJcbiAgICAgICAgICBpZiAobnVtYmVyT2ZTZWxlY3RlZEVkZ2VzID09PSAxKSB7XHJcbiAgICAgICAgICAgIHZhciBzZWxlY3RlZEVkZ2VzID0gY3kuZWRnZXMoJzpzZWxlY3RlZCcpO1xyXG4gICAgICAgICAgICBcclxuICAgICAgICAgICAgLy8gSWYgdXNlciB1bnNlbGVjdHMgYWxsIGVkZ2VzIGJ5IHRhcHBpbmcgdG8gdGhlIGNvcmUgZXRjLiB0aGVuIG91ciAnbnVtYmVyT2ZTZWxlY3RlZEVkZ2VzJ1xyXG4gICAgICAgICAgICAvLyBtYXkgYmUgbWlzbGVhZGluZy4gVGhlcmVmb3JlIHdlIG5lZWQgdG8gY2hlY2sgaWYgdGhlIG51bWJlciBvZiBlZGdlcyB0byBoaWdobGlnaHQgaXMgcmVhbHkgMSBoZXJlLlxyXG4gICAgICAgICAgICBpZiAoc2VsZWN0ZWRFZGdlcy5sZW5ndGggPT09IDEpIHtcclxuICAgICAgICAgICAgICBlZGdlVG9IaWdobGlnaHQgPSBzZWxlY3RlZEVkZ2VzWzBdO1xyXG4gICAgICAgICAgICAgIGVkZ2VUb0hpZ2hsaWdodC5hZGRDbGFzcygnY3ktZWRnZS1lZGl0aW5nLWhpZ2hsaWdodCcpO1xyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgICAgIGVsc2Uge1xyXG4gICAgICAgICAgICAgIGVkZ2VUb0hpZ2hsaWdodCA9IHVuZGVmaW5lZDtcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgICAgfVxyXG4gICAgICAgICAgZWxzZSB7XHJcbiAgICAgICAgICAgIGVkZ2VUb0hpZ2hsaWdodCA9IHVuZGVmaW5lZDtcclxuICAgICAgICAgIH1cclxuICAgICAgICAgIFxyXG4gICAgICAgICAgY3kuZW5kQmF0Y2goKTtcclxuICAgICAgICAgIHJlZnJlc2hEcmF3cygpO1xyXG4gICAgICAgIH0pO1xyXG4gICAgICAgIFxyXG4gICAgICAgIHZhciBtb3ZlZEFuY2hvckluZGV4O1xyXG4gICAgICAgIHZhciB0YXBTdGFydFBvcztcclxuICAgICAgICB2YXIgbW92ZWRFZGdlO1xyXG4gICAgICAgIHZhciBtb3ZlQW5jaG9yUGFyYW07XHJcbiAgICAgICAgdmFyIGNyZWF0ZUFuY2hvck9uRHJhZztcclxuICAgICAgICB2YXIgbW92ZWRFbmRQb2ludDtcclxuICAgICAgICB2YXIgZHVtbXlOb2RlO1xyXG4gICAgICAgIHZhciBkZXRhY2hlZE5vZGU7XHJcbiAgICAgICAgdmFyIG5vZGVUb0F0dGFjaDtcclxuICAgICAgICB2YXIgYW5jaG9yQ3JlYXRlZEJ5RHJhZyA9IGZhbHNlO1xyXG5cclxuICAgICAgICBjeS5vbigndGFwc3RhcnQnLCBlVGFwU3RhcnQgPSBmdW5jdGlvbihldmVudCkge1xyXG4gICAgICAgICAgdGFwU3RhcnRQb3MgPSBldmVudC5wb3NpdGlvbiB8fCBldmVudC5jeVBvc2l0aW9uO1xyXG4gICAgICAgIH0pO1xyXG5cclxuICAgICAgICBjeS5vbigndGFwc3RhcnQnLCAnZWRnZScsIGVUYXBTdGFydE9uRWRnZSA9IGZ1bmN0aW9uIChldmVudCkge1xyXG4gICAgICAgICAgdmFyIGVkZ2UgPSB0aGlzO1xyXG5cclxuICAgICAgICAgIGlmICghZWRnZVRvSGlnaGxpZ2h0IHx8IGVkZ2VUb0hpZ2hsaWdodC5pZCgpICE9PSBlZGdlLmlkKCkpIHtcclxuICAgICAgICAgICAgY3JlYXRlQW5jaG9yT25EcmFnID0gZmFsc2U7XHJcbiAgICAgICAgICAgIHJldHVybjtcclxuICAgICAgICAgIH1cclxuICAgICAgICAgIFxyXG4gICAgICAgICAgbW92ZWRFZGdlID0gZWRnZTtcclxuXHJcbiAgICAgICAgICB2YXIgdHlwZSA9IGFuY2hvclBvaW50VXRpbGl0aWVzLmdldEVkZ2VUeXBlKGVkZ2UpO1xyXG5cclxuICAgICAgICAgIC8vIHRvIGF2b2lkIGVycm9yc1xyXG4gICAgICAgICAgaWYodHlwZSA9PT0gJ2luY29uY2x1c2l2ZScpXHJcbiAgICAgICAgICAgIHR5cGUgPSAnYmVuZCc7XHJcbiAgICAgICAgICBcclxuICAgICAgICAgIHZhciBjeVBvc1ggPSB0YXBTdGFydFBvcy54O1xyXG4gICAgICAgICAgdmFyIGN5UG9zWSA9IHRhcFN0YXJ0UG9zLnk7XHJcbiAgICAgICAgICBcclxuICAgICAgICAgIC8vIEdldCB3aGljaCBlbmQgcG9pbnQgaGFzIGJlZW4gY2xpY2tlZCAoU291cmNlOjAsIFRhcmdldDoxLCBOb25lOi0xKVxyXG4gICAgICAgICAgdmFyIGVuZFBvaW50ID0gZ2V0Q29udGFpbmluZ0VuZFBvaW50KGN5UG9zWCwgY3lQb3NZLCBlZGdlKTtcclxuXHJcbiAgICAgICAgICBpZihlbmRQb2ludCA9PSAwIHx8IGVuZFBvaW50ID09IDEpe1xyXG4gICAgICAgICAgICBlZGdlLnVuc2VsZWN0KCk7XHJcbiAgICAgICAgICAgIG1vdmVkRW5kUG9pbnQgPSBlbmRQb2ludDtcclxuICAgICAgICAgICAgZGV0YWNoZWROb2RlID0gKGVuZFBvaW50ID09IDApID8gbW92ZWRFZGdlLnNvdXJjZSgpIDogbW92ZWRFZGdlLnRhcmdldCgpO1xyXG5cclxuICAgICAgICAgICAgdmFyIGRpc2Nvbm5lY3RlZEVuZCA9IChlbmRQb2ludCA9PSAwKSA/ICdzb3VyY2UnIDogJ3RhcmdldCc7XHJcbiAgICAgICAgICAgIHZhciByZXN1bHQgPSByZWNvbm5lY3Rpb25VdGlsaXRpZXMuZGlzY29ubmVjdEVkZ2UobW92ZWRFZGdlLCBjeSwgZXZlbnQucmVuZGVyZWRQb3NpdGlvbiwgZGlzY29ubmVjdGVkRW5kKTtcclxuICAgICAgICAgICAgXHJcbiAgICAgICAgICAgIGR1bW15Tm9kZSA9IHJlc3VsdC5kdW1teU5vZGU7XHJcbiAgICAgICAgICAgIG1vdmVkRWRnZSA9IHJlc3VsdC5lZGdlO1xyXG5cclxuICAgICAgICAgICAgZGlzYWJsZUdlc3R1cmVzKCk7XHJcbiAgICAgICAgICB9XHJcbiAgICAgICAgICBlbHNlIHtcclxuICAgICAgICAgICAgbW92ZWRBbmNob3JJbmRleCA9IHVuZGVmaW5lZDtcclxuICAgICAgICAgICAgY3JlYXRlQW5jaG9yT25EcmFnID0gdHJ1ZTtcclxuICAgICAgICAgIH1cclxuICAgICAgICB9KTtcclxuICAgICAgICBcclxuICAgICAgICBjeS5vbignZHJhZycsICdub2RlJywgZURyYWcgPSBmdW5jdGlvbiAoZXZlbnQpIHtcclxuICAgICAgICAgIHZhciBub2RlID0gdGhpcztcclxuICAgICAgICAgIGN5LmVkZ2VzKCkudW5zZWxlY3QoKTtcclxuICAgICAgICAgIGlmKCFub2RlLnNlbGVjdGVkKCkpe1xyXG4gICAgICAgICAgICBjeS5ub2RlcygpLnVuc2VsZWN0KCk7XHJcbiAgICAgICAgICB9ICAgICAgICAgXHJcbiAgICAgICAgfSk7XHJcbiAgICAgICAgY3kub24oJ3RhcGRyYWcnLCBlVGFwRHJhZyA9IGZ1bmN0aW9uIChldmVudCkge1xyXG4gICAgICAgICAgLyoqIFxyXG4gICAgICAgICAgICogaWYgdGhlcmUgaXMgYSBzZWxlY3RlZCBlZGdlIHNldCBhdXRvdW5zZWxlY3RpZnkgZmFsc2VcclxuICAgICAgICAgICAqIGZpeGVzIHRoZSBub2RlLWVkaXRpbmcgcHJvYmxlbSB3aGVyZSBub2RlcyB3b3VsZCBnZXRcclxuICAgICAgICAgICAqIHVuc2VsZWN0ZWQgYWZ0ZXIgcmVzaXplIGRyYWdcclxuICAgICAgICAgICovXHJcbiAgICAgICAgICBpZiAoY3kuZWRnZXMoJzpzZWxlY3RlZCcpLmxlbmd0aCA+IDApIHtcclxuICAgICAgICAgICAgY3kuYXV0b3Vuc2VsZWN0aWZ5KGZhbHNlKTtcclxuICAgICAgICAgIH1cclxuICAgICAgICAgIHZhciBlZGdlID0gbW92ZWRFZGdlO1xyXG5cclxuICAgICAgICAgIGlmKG1vdmVkRWRnZSAhPT0gdW5kZWZpbmVkICYmIGFuY2hvclBvaW50VXRpbGl0aWVzLmlzSWdub3JlZEVkZ2UoZWRnZSkgKSB7XHJcbiAgICAgICAgICAgIHJldHVybjtcclxuICAgICAgICAgIH1cclxuXHJcbiAgICAgICAgICB2YXIgdHlwZSA9IGFuY2hvclBvaW50VXRpbGl0aWVzLmdldEVkZ2VUeXBlKGVkZ2UpO1xyXG5cclxuICAgICAgICAgIGlmKGNyZWF0ZUFuY2hvck9uRHJhZyAmJiAhYW5jaG9yVG91Y2hlZCAmJiB0eXBlICE9PSAnaW5jb25jbHVzaXZlJykge1xyXG4gICAgICAgICAgICAvLyByZW1lbWJlciBzdGF0ZSBiZWZvcmUgY3JlYXRpbmcgYW5jaG9yXHJcbiAgICAgICAgICAgIHZhciB3ZWlnaHRTdHIgPSBhbmNob3JQb2ludFV0aWxpdGllcy5zeW50YXhbdHlwZV1bJ3dlaWdodCddO1xyXG4gICAgICAgICAgICB2YXIgZGlzdGFuY2VTdHIgPSBhbmNob3JQb2ludFV0aWxpdGllcy5zeW50YXhbdHlwZV1bJ2Rpc3RhbmNlJ107XHJcblxyXG4gICAgICAgICAgICBtb3ZlQW5jaG9yUGFyYW0gPSB7XHJcbiAgICAgICAgICAgICAgZWRnZTogZWRnZSxcclxuICAgICAgICAgICAgICB0eXBlOiB0eXBlLFxyXG4gICAgICAgICAgICAgIHdlaWdodHM6IGVkZ2UuZGF0YSh3ZWlnaHRTdHIpID8gW10uY29uY2F0KGVkZ2UuZGF0YSh3ZWlnaHRTdHIpKSA6IFtdLFxyXG4gICAgICAgICAgICAgIGRpc3RhbmNlczogZWRnZS5kYXRhKGRpc3RhbmNlU3RyKSA/IFtdLmNvbmNhdChlZGdlLmRhdGEoZGlzdGFuY2VTdHIpKSA6IFtdXHJcbiAgICAgICAgICAgIH07XHJcblxyXG4gICAgICAgICAgICBlZGdlLnVuc2VsZWN0KCk7XHJcblxyXG4gICAgICAgICAgICAvLyB1c2luZyB0YXBzdGFydCBwb3NpdGlvbiBmaXhlcyBidWcgb24gcXVpY2sgZHJhZ3NcclxuICAgICAgICAgICAgLy8gLS0tIFxyXG4gICAgICAgICAgICAvLyBhbHNvIG1vZGlmaWVkIGFkZEFuY2hvclBvaW50IHRvIHJldHVybiB0aGUgaW5kZXggYmVjYXVzZVxyXG4gICAgICAgICAgICAvLyBnZXRDb250YWluaW5nU2hhcGVJbmRleCBmYWlsZWQgdG8gZmluZCB0aGUgY3JlYXRlZCBhbmNob3Igb24gcXVpY2sgZHJhZ3NcclxuICAgICAgICAgICAgbW92ZWRBbmNob3JJbmRleCA9IGFuY2hvclBvaW50VXRpbGl0aWVzLmFkZEFuY2hvclBvaW50KGVkZ2UsIHRhcFN0YXJ0UG9zKTtcclxuICAgICAgICAgICAgbW92ZWRFZGdlID0gZWRnZTtcclxuICAgICAgICAgICAgY3JlYXRlQW5jaG9yT25EcmFnID0gdW5kZWZpbmVkO1xyXG4gICAgICAgICAgICBhbmNob3JDcmVhdGVkQnlEcmFnID0gdHJ1ZTtcclxuICAgICAgICAgICAgZGlzYWJsZUdlc3R1cmVzKCk7XHJcbiAgICAgICAgICB9XHJcblxyXG4gICAgICAgICAgLy8gaWYgdGhlIHRhcHN0YXJ0IGRpZCBub3QgaGl0IGFuIGVkZ2UgYW5kIGl0IGRpZCBub3QgaGl0IGFuIGFuY2hvclxyXG4gICAgICAgICAgaWYgKCFhbmNob3JUb3VjaGVkICYmIChtb3ZlZEVkZ2UgPT09IHVuZGVmaW5lZCB8fCBcclxuICAgICAgICAgICAgKG1vdmVkQW5jaG9ySW5kZXggPT09IHVuZGVmaW5lZCAmJiBtb3ZlZEVuZFBvaW50ID09PSB1bmRlZmluZWQpKSkge1xyXG4gICAgICAgICAgICByZXR1cm47XHJcbiAgICAgICAgICB9XHJcblxyXG4gICAgICAgICAgdmFyIGV2ZW50UG9zID0gZXZlbnQucG9zaXRpb24gfHwgZXZlbnQuY3lQb3NpdGlvbjtcclxuXHJcbiAgICAgICAgICAvLyBVcGRhdGUgZW5kIHBvaW50IGxvY2F0aW9uIChTb3VyY2U6MCwgVGFyZ2V0OjEpXHJcbiAgICAgICAgICBpZihtb3ZlZEVuZFBvaW50ICE9IC0xICYmIGR1bW15Tm9kZSl7XHJcbiAgICAgICAgICAgIGR1bW15Tm9kZS5wb3NpdGlvbihldmVudFBvcyk7XHJcbiAgICAgICAgICB9XHJcbiAgICAgICAgICAvLyBjaGFuZ2UgbG9jYXRpb24gb2YgYW5jaG9yIGNyZWF0ZWQgYnkgZHJhZ1xyXG4gICAgICAgICAgZWxzZSBpZihtb3ZlZEFuY2hvckluZGV4ICE9IHVuZGVmaW5lZCl7XHJcbiAgICAgICAgICAgIF9tb3ZlQW5jaG9yT25EcmFnKGVkZ2UsIHR5cGUsIG1vdmVkQW5jaG9ySW5kZXgsIGV2ZW50UG9zKTtcclxuICAgICAgICAgIH1cclxuICAgICAgICAgIC8vIGNoYW5nZSBsb2NhdGlvbiBvZiBkcmFnIGFuZCBkcm9wcGVkIGFuY2hvclxyXG4gICAgICAgICAgZWxzZSBpZihhbmNob3JUb3VjaGVkKXtcclxuXHJcbiAgICAgICAgICAgIC8vIHRoZSB0YXBTdGFydFBvcyBjaGVjayBpcyBuZWNlc3Nhcnkgd2hlbiByaWdoIGNsaWNraW5nIGFuY2hvciBwb2ludHNcclxuICAgICAgICAgICAgLy8gcmlnaHQgY2xpY2tpbmcgYW5jaG9yIHBvaW50cyB0cmlnZ2VycyBNb3VzZURvd24gZm9yIEtvbnZhLCBidXQgbm90IHRhcHN0YXJ0IGZvciBjeVxyXG4gICAgICAgICAgICAvLyB3aGVuIHRoYXQgaGFwcGVucyB0YXBTdGFydFBvcyBpcyB1bmRlZmluZWRcclxuICAgICAgICAgICAgaWYoYW5jaG9yTWFuYWdlci50b3VjaGVkQW5jaG9ySW5kZXggPT09IHVuZGVmaW5lZCAmJiB0YXBTdGFydFBvcyl7XHJcbiAgICAgICAgICAgICAgYW5jaG9yTWFuYWdlci50b3VjaGVkQW5jaG9ySW5kZXggPSBnZXRDb250YWluaW5nU2hhcGVJbmRleChcclxuICAgICAgICAgICAgICAgIHRhcFN0YXJ0UG9zLngsIFxyXG4gICAgICAgICAgICAgICAgdGFwU3RhcnRQb3MueSxcclxuICAgICAgICAgICAgICAgIGFuY2hvck1hbmFnZXIuZWRnZSk7XHJcbiAgICAgICAgICAgIH1cclxuXHJcbiAgICAgICAgICAgIGlmKGFuY2hvck1hbmFnZXIudG91Y2hlZEFuY2hvckluZGV4ICE9PSB1bmRlZmluZWQpe1xyXG4gICAgICAgICAgICAgIF9tb3ZlQW5jaG9yT25EcmFnKFxyXG4gICAgICAgICAgICAgICAgYW5jaG9yTWFuYWdlci5lZGdlLFxyXG4gICAgICAgICAgICAgICAgYW5jaG9yTWFuYWdlci5lZGdlVHlwZSxcclxuICAgICAgICAgICAgICAgIGFuY2hvck1hbmFnZXIudG91Y2hlZEFuY2hvckluZGV4LFxyXG4gICAgICAgICAgICAgICAgZXZlbnRQb3NcclxuICAgICAgICAgICAgICApO1xyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgICB9XHJcbiAgICAgICAgICBcclxuICAgICAgICAgIGlmKGV2ZW50LnRhcmdldCAmJiBldmVudC50YXJnZXRbMF0gJiYgZXZlbnQudGFyZ2V0LmlzTm9kZSgpKXtcclxuICAgICAgICAgICAgbm9kZVRvQXR0YWNoID0gZXZlbnQudGFyZ2V0O1xyXG4gICAgICAgICAgfVxyXG5cclxuICAgICAgICB9KTtcclxuICAgICAgICBcclxuICAgICAgICBjeS5vbigndGFwZW5kJywgZVRhcEVuZCA9IGZ1bmN0aW9uIChldmVudCkge1xyXG5cclxuICAgICAgICAgIGlmKG1vdXNlT3V0KXtcclxuICAgICAgICAgICAgY2FudmFzLmdldFN0YWdlKCkuZmlyZShcImNvbnRlbnRNb3VzZXVwXCIpO1xyXG4gICAgICAgICAgfVxyXG5cclxuICAgICAgICAgIHZhciBlZGdlID0gbW92ZWRFZGdlIHx8IGFuY2hvck1hbmFnZXIuZWRnZTsgXHJcbiAgICAgICAgICBcclxuICAgICAgICAgIGlmKCBlZGdlICE9PSB1bmRlZmluZWQgKSB7XHJcbiAgICAgICAgICAgIHZhciBpbmRleCA9IGFuY2hvck1hbmFnZXIudG91Y2hlZEFuY2hvckluZGV4O1xyXG4gICAgICAgICAgICBpZiggaW5kZXggIT0gdW5kZWZpbmVkICkge1xyXG4gICAgICAgICAgICAgIHZhciBzdGFydFggPSBlZGdlLnNvdXJjZSgpLnBvc2l0aW9uKCd4Jyk7XHJcbiAgICAgICAgICAgICAgdmFyIHN0YXJ0WSA9IGVkZ2Uuc291cmNlKCkucG9zaXRpb24oJ3knKTtcclxuICAgICAgICAgICAgICB2YXIgZW5kWCA9IGVkZ2UudGFyZ2V0KCkucG9zaXRpb24oJ3gnKTtcclxuICAgICAgICAgICAgICB2YXIgZW5kWSA9IGVkZ2UudGFyZ2V0KCkucG9zaXRpb24oJ3knKTtcclxuICAgICAgICAgICAgICBcclxuICAgICAgICAgICAgICB2YXIgYW5jaG9yTGlzdCA9IGFuY2hvclBvaW50VXRpbGl0aWVzLmdldEFuY2hvcnNBc0FycmF5KGVkZ2UpO1xyXG4gICAgICAgICAgICAgIHZhciBhbGxBbmNob3JzID0gW3N0YXJ0WCwgc3RhcnRZXS5jb25jYXQoYW5jaG9yTGlzdCkuY29uY2F0KFtlbmRYLCBlbmRZXSk7XHJcbiAgICAgICAgICAgICAgXHJcbiAgICAgICAgICAgICAgdmFyIGFuY2hvckluZGV4ID0gaW5kZXggKyAxO1xyXG4gICAgICAgICAgICAgIHZhciBwcmVJbmRleCA9IGFuY2hvckluZGV4IC0gMTtcclxuICAgICAgICAgICAgICB2YXIgcG9zSW5kZXggPSBhbmNob3JJbmRleCArIDE7XHJcbiAgICAgICAgICAgICAgXHJcbiAgICAgICAgICAgICAgdmFyIGFuY2hvciA9IHtcclxuICAgICAgICAgICAgICAgIHg6IGFsbEFuY2hvcnNbMiAqIGFuY2hvckluZGV4XSxcclxuICAgICAgICAgICAgICAgIHk6IGFsbEFuY2hvcnNbMiAqIGFuY2hvckluZGV4ICsgMV1cclxuICAgICAgICAgICAgICB9O1xyXG4gICAgICAgICAgICAgIFxyXG4gICAgICAgICAgICAgIHZhciBwcmVBbmNob3JQb2ludCA9IHtcclxuICAgICAgICAgICAgICAgIHg6IGFsbEFuY2hvcnNbMiAqIHByZUluZGV4XSxcclxuICAgICAgICAgICAgICAgIHk6IGFsbEFuY2hvcnNbMiAqIHByZUluZGV4ICsgMV1cclxuICAgICAgICAgICAgICB9O1xyXG4gICAgICAgICAgICAgIFxyXG4gICAgICAgICAgICAgIHZhciBwb3NBbmNob3JQb2ludCA9IHtcclxuICAgICAgICAgICAgICAgIHg6IGFsbEFuY2hvcnNbMiAqIHBvc0luZGV4XSxcclxuICAgICAgICAgICAgICAgIHk6IGFsbEFuY2hvcnNbMiAqIHBvc0luZGV4ICsgMV1cclxuICAgICAgICAgICAgICB9O1xyXG4gICAgICAgICAgICAgIFxyXG4gICAgICAgICAgICAgIHZhciBuZWFyVG9MaW5lO1xyXG4gICAgICAgICAgICAgIFxyXG4gICAgICAgICAgICAgIGlmKCAoIGFuY2hvci54ID09PSBwcmVBbmNob3JQb2ludC54ICYmIGFuY2hvci55ID09PSBwcmVBbmNob3JQb2ludC55ICkgfHwgKCBhbmNob3IueCA9PT0gcHJlQW5jaG9yUG9pbnQueCAmJiBhbmNob3IueSA9PT0gcHJlQW5jaG9yUG9pbnQueSApICkge1xyXG4gICAgICAgICAgICAgICAgbmVhclRvTGluZSA9IHRydWU7XHJcbiAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgIGVsc2Uge1xyXG4gICAgICAgICAgICAgICAgdmFyIG0xID0gKCBwcmVBbmNob3JQb2ludC55IC0gcG9zQW5jaG9yUG9pbnQueSApIC8gKCBwcmVBbmNob3JQb2ludC54IC0gcG9zQW5jaG9yUG9pbnQueCApO1xyXG4gICAgICAgICAgICAgICAgdmFyIG0yID0gLTEgLyBtMTtcclxuXHJcbiAgICAgICAgICAgICAgICB2YXIgc3JjVGd0UG9pbnRzQW5kVGFuZ2VudHMgPSB7XHJcbiAgICAgICAgICAgICAgICAgIHNyY1BvaW50OiBwcmVBbmNob3JQb2ludCxcclxuICAgICAgICAgICAgICAgICAgdGd0UG9pbnQ6IHBvc0FuY2hvclBvaW50LFxyXG4gICAgICAgICAgICAgICAgICBtMTogbTEsXHJcbiAgICAgICAgICAgICAgICAgIG0yOiBtMlxyXG4gICAgICAgICAgICAgICAgfTtcclxuXHJcbiAgICAgICAgICAgICAgICB2YXIgY3VycmVudEludGVyc2VjdGlvbiA9IGFuY2hvclBvaW50VXRpbGl0aWVzLmdldEludGVyc2VjdGlvbihlZGdlLCBhbmNob3IsIHNyY1RndFBvaW50c0FuZFRhbmdlbnRzKTtcclxuICAgICAgICAgICAgICAgIHZhciBkaXN0ID0gTWF0aC5zcXJ0KCBNYXRoLnBvdyggKGFuY2hvci54IC0gY3VycmVudEludGVyc2VjdGlvbi54KSwgMiApIFxyXG4gICAgICAgICAgICAgICAgICAgICAgICArIE1hdGgucG93KCAoYW5jaG9yLnkgLSBjdXJyZW50SW50ZXJzZWN0aW9uLnkpLCAyICkpO1xyXG4gICAgICAgICAgICAgICAgXHJcbiAgICAgICAgICAgICAgICAvLyByZW1vdmUgdGhlIGJlbmQgcG9pbnQgaWYgc2VnbWVudCBlZGdlIGJlY29tZXMgc3RyYWlnaHRcclxuICAgICAgICAgICAgICAgIHZhciB0eXBlID0gYW5jaG9yUG9pbnRVdGlsaXRpZXMuZ2V0RWRnZVR5cGUoZWRnZSk7XHJcbiAgICAgICAgICAgICAgICBpZiggKHR5cGUgPT09ICdiZW5kJyAmJiBkaXN0ICA8IG9wdGlvbnMoKS5iZW5kUmVtb3ZhbFNlbnNpdGl2aXR5KSkge1xyXG4gICAgICAgICAgICAgICAgICBuZWFyVG9MaW5lID0gdHJ1ZTtcclxuICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICAgIFxyXG4gICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICBcclxuICAgICAgICAgICAgICBpZiggbmVhclRvTGluZSApXHJcbiAgICAgICAgICAgICAge1xyXG4gICAgICAgICAgICAgICAgYW5jaG9yUG9pbnRVdGlsaXRpZXMucmVtb3ZlQW5jaG9yKGVkZ2UsIGluZGV4KTtcclxuICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgXHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgZWxzZSBpZihkdW1teU5vZGUgIT0gdW5kZWZpbmVkICYmIChtb3ZlZEVuZFBvaW50ID09IDAgfHwgbW92ZWRFbmRQb2ludCA9PSAxKSApe1xyXG4gICAgICAgICAgICAgIFxyXG4gICAgICAgICAgICAgIHZhciBuZXdOb2RlID0gZGV0YWNoZWROb2RlO1xyXG4gICAgICAgICAgICAgIHZhciBpc1ZhbGlkID0gJ3ZhbGlkJztcclxuICAgICAgICAgICAgICB2YXIgbG9jYXRpb24gPSAobW92ZWRFbmRQb2ludCA9PSAwKSA/ICdzb3VyY2UnIDogJ3RhcmdldCc7XHJcblxyXG4gICAgICAgICAgICAgIC8vIHZhbGlkYXRlIGVkZ2UgcmVjb25uZWN0aW9uXHJcbiAgICAgICAgICAgICAgaWYobm9kZVRvQXR0YWNoKXtcclxuICAgICAgICAgICAgICAgIHZhciBuZXdTb3VyY2UgPSAobW92ZWRFbmRQb2ludCA9PSAwKSA/IG5vZGVUb0F0dGFjaCA6IGVkZ2Uuc291cmNlKCk7XHJcbiAgICAgICAgICAgICAgICB2YXIgbmV3VGFyZ2V0ID0gKG1vdmVkRW5kUG9pbnQgPT0gMSkgPyBub2RlVG9BdHRhY2ggOiBlZGdlLnRhcmdldCgpO1xyXG4gICAgICAgICAgICAgICAgaWYodHlwZW9mIHZhbGlkYXRlRWRnZSA9PT0gXCJmdW5jdGlvblwiKVxyXG4gICAgICAgICAgICAgICAgICBpc1ZhbGlkID0gdmFsaWRhdGVFZGdlKGVkZ2UsIG5ld1NvdXJjZSwgbmV3VGFyZ2V0KTtcclxuICAgICAgICAgICAgICAgIG5ld05vZGUgPSAoaXNWYWxpZCA9PT0gJ3ZhbGlkJykgPyBub2RlVG9BdHRhY2ggOiBkZXRhY2hlZE5vZGU7XHJcbiAgICAgICAgICAgICAgfVxyXG5cclxuICAgICAgICAgICAgICB2YXIgbmV3U291cmNlID0gKG1vdmVkRW5kUG9pbnQgPT0gMCkgPyBuZXdOb2RlIDogZWRnZS5zb3VyY2UoKTtcclxuICAgICAgICAgICAgICB2YXIgbmV3VGFyZ2V0ID0gKG1vdmVkRW5kUG9pbnQgPT0gMSkgPyBuZXdOb2RlIDogZWRnZS50YXJnZXQoKTtcclxuICAgICAgICAgICAgICBlZGdlID0gcmVjb25uZWN0aW9uVXRpbGl0aWVzLmNvbm5lY3RFZGdlKGVkZ2UsIGRldGFjaGVkTm9kZSwgbG9jYXRpb24pO1xyXG5cclxuICAgICAgICAgICAgICBpZihkZXRhY2hlZE5vZGUuaWQoKSAhPT0gbmV3Tm9kZS5pZCgpKXtcclxuICAgICAgICAgICAgICAgIC8vIHVzZSBnaXZlbiBoYW5kbGVSZWNvbm5lY3RFZGdlIGZ1bmN0aW9uIFxyXG4gICAgICAgICAgICAgICAgaWYodHlwZW9mIGhhbmRsZVJlY29ubmVjdEVkZ2UgPT09ICdmdW5jdGlvbicpe1xyXG4gICAgICAgICAgICAgICAgICB2YXIgcmVjb25uZWN0ZWRFZGdlID0gaGFuZGxlUmVjb25uZWN0RWRnZShuZXdTb3VyY2UuaWQoKSwgbmV3VGFyZ2V0LmlkKCksIGVkZ2UuZGF0YSgpKTtcclxuICAgICAgICAgICAgICAgICAgXHJcbiAgICAgICAgICAgICAgICAgIGlmKHJlY29ubmVjdGVkRWRnZSl7XHJcbiAgICAgICAgICAgICAgICAgICAgcmVjb25uZWN0aW9uVXRpbGl0aWVzLmNvcHlFZGdlKGVkZ2UsIHJlY29ubmVjdGVkRWRnZSk7XHJcbiAgICAgICAgICAgICAgICAgICAgYW5jaG9yUG9pbnRVdGlsaXRpZXMuaW5pdEFuY2hvclBvaW50cyhvcHRpb25zKCkuYmVuZFBvc2l0aW9uc0Z1bmN0aW9uLCBcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIG9wdGlvbnMoKS5jb250cm9sUG9zaXRpb25zRnVuY3Rpb24sIFtyZWNvbm5lY3RlZEVkZ2VdKTtcclxuICAgICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgICAgICBcclxuICAgICAgICAgICAgICAgICAgaWYocmVjb25uZWN0ZWRFZGdlICYmIG9wdGlvbnMoKS51bmRvYWJsZSl7XHJcbiAgICAgICAgICAgICAgICAgICAgdmFyIHBhcmFtcyA9IHtcclxuICAgICAgICAgICAgICAgICAgICAgIG5ld0VkZ2U6IHJlY29ubmVjdGVkRWRnZSxcclxuICAgICAgICAgICAgICAgICAgICAgIG9sZEVkZ2U6IGVkZ2VcclxuICAgICAgICAgICAgICAgICAgICB9O1xyXG4gICAgICAgICAgICAgICAgICAgIGN5LnVuZG9SZWRvKCkuZG8oJ3JlbW92ZVJlY29ubmVjdGVkRWRnZScsIHBhcmFtcyk7XHJcbiAgICAgICAgICAgICAgICAgICAgZWRnZSA9IHJlY29ubmVjdGVkRWRnZTtcclxuICAgICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgICAgICBlbHNlIGlmKHJlY29ubmVjdGVkRWRnZSl7XHJcbiAgICAgICAgICAgICAgICAgICAgY3kucmVtb3ZlKGVkZ2UpO1xyXG4gICAgICAgICAgICAgICAgICAgIGVkZ2UgPSByZWNvbm5lY3RlZEVkZ2U7XHJcbiAgICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICAgIGVsc2V7XHJcbiAgICAgICAgICAgICAgICAgIHZhciBsb2MgPSAobW92ZWRFbmRQb2ludCA9PSAwKSA/IHtzb3VyY2U6IG5ld05vZGUuaWQoKX0gOiB7dGFyZ2V0OiBuZXdOb2RlLmlkKCl9O1xyXG4gICAgICAgICAgICAgICAgICB2YXIgb2xkTG9jID0gKG1vdmVkRW5kUG9pbnQgPT0gMCkgPyB7c291cmNlOiBkZXRhY2hlZE5vZGUuaWQoKX0gOiB7dGFyZ2V0OiBkZXRhY2hlZE5vZGUuaWQoKX07XHJcbiAgICAgICAgICAgICAgICAgIFxyXG4gICAgICAgICAgICAgICAgICBpZihvcHRpb25zKCkudW5kb2FibGUgJiYgbmV3Tm9kZS5pZCgpICE9PSBkZXRhY2hlZE5vZGUuaWQoKSkge1xyXG4gICAgICAgICAgICAgICAgICAgIHZhciBwYXJhbSA9IHtcclxuICAgICAgICAgICAgICAgICAgICAgIGVkZ2U6IGVkZ2UsXHJcbiAgICAgICAgICAgICAgICAgICAgICBsb2NhdGlvbjogbG9jLFxyXG4gICAgICAgICAgICAgICAgICAgICAgb2xkTG9jOiBvbGRMb2NcclxuICAgICAgICAgICAgICAgICAgICB9O1xyXG4gICAgICAgICAgICAgICAgICAgIHZhciByZXN1bHQgPSBjeS51bmRvUmVkbygpLmRvKCdyZWNvbm5lY3RFZGdlJywgcGFyYW0pO1xyXG4gICAgICAgICAgICAgICAgICAgIGVkZ2UgPSByZXN1bHQuZWRnZTtcclxuICAgICAgICAgICAgICAgICAgICAvL2VkZ2Uuc2VsZWN0KCk7XHJcbiAgICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICAgIH0gIFxyXG4gICAgICAgICAgICAgIH1cclxuXHJcbiAgICAgICAgICAgICAgLy8gaW52YWxpZCBlZGdlIHJlY29ubmVjdGlvbiBjYWxsYmFja1xyXG4gICAgICAgICAgICAgIGlmKGlzVmFsaWQgIT09ICd2YWxpZCcgJiYgdHlwZW9mIGFjdE9uVW5zdWNjZXNzZnVsUmVjb25uZWN0aW9uID09PSAnZnVuY3Rpb24nKXtcclxuICAgICAgICAgICAgICAgIGFjdE9uVW5zdWNjZXNzZnVsUmVjb25uZWN0aW9uKCk7XHJcbiAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgIGVkZ2Uuc2VsZWN0KCk7XHJcbiAgICAgICAgICAgICAgY3kucmVtb3ZlKGR1bW15Tm9kZSk7XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICAgIH1cclxuICAgICAgICAgIHZhciB0eXBlID0gYW5jaG9yUG9pbnRVdGlsaXRpZXMuZ2V0RWRnZVR5cGUoZWRnZSk7XHJcblxyXG4gICAgICAgICAgLy8gdG8gYXZvaWQgZXJyb3JzXHJcbiAgICAgICAgICBpZih0eXBlID09PSAnaW5jb25jbHVzaXZlJyl7XHJcbiAgICAgICAgICAgIHR5cGUgPSAnYmVuZCc7XHJcbiAgICAgICAgICB9XHJcblxyXG4gICAgICAgICAgaWYoYW5jaG9yTWFuYWdlci50b3VjaGVkQW5jaG9ySW5kZXggPT09IHVuZGVmaW5lZCAmJiAhYW5jaG9yQ3JlYXRlZEJ5RHJhZyl7XHJcbiAgICAgICAgICAgIG1vdmVBbmNob3JQYXJhbSA9IHVuZGVmaW5lZDtcclxuICAgICAgICAgIH1cclxuXHJcbiAgICAgICAgICB2YXIgd2VpZ2h0U3RyID0gYW5jaG9yUG9pbnRVdGlsaXRpZXMuc3ludGF4W3R5cGVdWyd3ZWlnaHQnXTtcclxuICAgICAgICAgIGlmIChlZGdlICE9PSB1bmRlZmluZWQgJiYgbW92ZUFuY2hvclBhcmFtICE9PSB1bmRlZmluZWQgJiYgXHJcbiAgICAgICAgICAgIChlZGdlLmRhdGEod2VpZ2h0U3RyKSA/IGVkZ2UuZGF0YSh3ZWlnaHRTdHIpLnRvU3RyaW5nKCkgOiBudWxsKSAhPSBtb3ZlQW5jaG9yUGFyYW0ud2VpZ2h0cy50b1N0cmluZygpKSB7XHJcbiAgICAgICAgICAgIFxyXG4gICAgICAgICAgICAvLyBhbmNob3IgY3JlYXRlZCBmcm9tIGRyYWdcclxuICAgICAgICAgICAgaWYoYW5jaG9yQ3JlYXRlZEJ5RHJhZyl7XHJcbiAgICAgICAgICAgIGVkZ2Uuc2VsZWN0KCk7IFxyXG5cclxuICAgICAgICAgICAgLy8gc3RvcHMgdGhlIHVuYnVuZGxlZCBiZXppZXIgZWRnZXMgZnJvbSBiZWluZyB1bnNlbGVjdGVkXHJcbiAgICAgICAgICAgIGN5LmF1dG91bnNlbGVjdGlmeSh0cnVlKTtcclxuICAgICAgICAgICAgfVxyXG5cclxuICAgICAgICAgICAgaWYob3B0aW9ucygpLnVuZG9hYmxlKSB7XHJcbiAgICAgICAgICAgICAgY3kudW5kb1JlZG8oKS5kbygnY2hhbmdlQW5jaG9yUG9pbnRzJywgbW92ZUFuY2hvclBhcmFtKTtcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgICAgfVxyXG4gICAgICAgICAgXHJcbiAgICAgICAgICBtb3ZlZEFuY2hvckluZGV4ID0gdW5kZWZpbmVkO1xyXG4gICAgICAgICAgbW92ZWRFZGdlID0gdW5kZWZpbmVkO1xyXG4gICAgICAgICAgbW92ZUFuY2hvclBhcmFtID0gdW5kZWZpbmVkO1xyXG4gICAgICAgICAgY3JlYXRlQW5jaG9yT25EcmFnID0gdW5kZWZpbmVkO1xyXG4gICAgICAgICAgbW92ZWRFbmRQb2ludCA9IHVuZGVmaW5lZDtcclxuICAgICAgICAgIGR1bW15Tm9kZSA9IHVuZGVmaW5lZDtcclxuICAgICAgICAgIGRldGFjaGVkTm9kZSA9IHVuZGVmaW5lZDtcclxuICAgICAgICAgIG5vZGVUb0F0dGFjaCA9IHVuZGVmaW5lZDtcclxuICAgICAgICAgIHRhcFN0YXJ0UG9zID0gdW5kZWZpbmVkO1xyXG4gICAgICAgICAgYW5jaG9yQ3JlYXRlZEJ5RHJhZyA9IGZhbHNlO1xyXG5cclxuICAgICAgICAgIGFuY2hvck1hbmFnZXIudG91Y2hlZEFuY2hvckluZGV4ID0gdW5kZWZpbmVkOyBcclxuXHJcbiAgICAgICAgICByZXNldEdlc3R1cmVzKCk7XHJcbiAgICAgICAgICBzZXRUaW1lb3V0KGZ1bmN0aW9uKCl7cmVmcmVzaERyYXdzKCl9LCA1MCk7XHJcbiAgICAgICAgfSk7XHJcblxyXG4gICAgICAgIC8vVmFyaWFibGVzIHVzZWQgZm9yIHN0YXJ0aW5nIGFuZCBlbmRpbmcgdGhlIG1vdmVtZW50IG9mIGFuY2hvciBwb2ludHMgd2l0aCBhcnJvd3NcclxuICAgICAgICB2YXIgbW92ZWFuY2hvcnBhcmFtO1xyXG4gICAgICAgIHZhciBmaXJzdEFuY2hvcjtcclxuICAgICAgICB2YXIgZWRnZUNvbnRhaW5pbmdGaXJzdEFuY2hvcjtcclxuICAgICAgICB2YXIgZmlyc3RBbmNob3JQb2ludEZvdW5kO1xyXG4gICAgICAgIGN5Lm9uKFwiZWRnZWVkaXRpbmcubW92ZXN0YXJ0XCIsIGZ1bmN0aW9uIChlLCBlZGdlcykge1xyXG4gICAgICAgICAgICBmaXJzdEFuY2hvclBvaW50Rm91bmQgPSBmYWxzZTtcclxuICAgICAgICAgICAgaWYgKGVkZ2VzWzBdICE9IHVuZGVmaW5lZClcclxuICAgICAgICAgICAge1xyXG4gICAgICAgICAgICAgICAgZWRnZXMuZm9yRWFjaChmdW5jdGlvbiggZWRnZSApe1xyXG4gICAgICAgICAgICAgICAgICBpZiAoYW5jaG9yUG9pbnRVdGlsaXRpZXMuZ2V0QW5jaG9yc0FzQXJyYXkoZWRnZSkgIT0gdW5kZWZpbmVkICYmICFmaXJzdEFuY2hvclBvaW50Rm91bmQpXHJcbiAgICAgICAgICAgICAgICAgIHtcclxuICAgICAgICAgICAgICAgICAgICAgIGZpcnN0QW5jaG9yID0geyB4OiBhbmNob3JQb2ludFV0aWxpdGllcy5nZXRBbmNob3JzQXNBcnJheShlZGdlKVswXSwgeTogYW5jaG9yUG9pbnRVdGlsaXRpZXMuZ2V0QW5jaG9yc0FzQXJyYXkoZWRnZSlbMV19O1xyXG4gICAgICAgICAgICAgICAgICAgICAgbW92ZWFuY2hvcnBhcmFtID0ge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgIGZpcnN0VGltZTogdHJ1ZSxcclxuICAgICAgICAgICAgICAgICAgICAgICAgICBmaXJzdEFuY2hvclBvc2l0aW9uOiB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHg6IGZpcnN0QW5jaG9yLngsXHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHk6IGZpcnN0QW5jaG9yLnlcclxuICAgICAgICAgICAgICAgICAgICAgICAgICB9LFxyXG4gICAgICAgICAgICAgICAgICAgICAgICAgIGVkZ2VzOiBlZGdlc1xyXG4gICAgICAgICAgICAgICAgICAgICAgfTtcclxuICAgICAgICAgICAgICAgICAgICAgIGVkZ2VDb250YWluaW5nRmlyc3RBbmNob3IgPSBlZGdlO1xyXG4gICAgICAgICAgICAgICAgICAgICAgZmlyc3RBbmNob3JQb2ludEZvdW5kID0gdHJ1ZTtcclxuICAgICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgICAgfSk7XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICB9KTtcclxuXHJcbiAgICAgICAgY3kub24oXCJlZGdlZWRpdGluZy5tb3ZlZW5kXCIsIGZ1bmN0aW9uIChlLCBlZGdlcykge1xyXG4gICAgICAgICAgICBpZiAobW92ZWFuY2hvcnBhcmFtICE9IHVuZGVmaW5lZClcclxuICAgICAgICAgICAge1xyXG4gICAgICAgICAgICAgICAgdmFyIGluaXRpYWxQb3MgPSBtb3ZlYW5jaG9ycGFyYW0uZmlyc3RBbmNob3JQb3NpdGlvbjtcclxuICAgICAgICAgICAgICAgIHZhciBtb3ZlZEZpcnN0QW5jaG9yID0ge1xyXG4gICAgICAgICAgICAgICAgICAgIHg6IGFuY2hvclBvaW50VXRpbGl0aWVzLmdldEFuY2hvcnNBc0FycmF5KGVkZ2VDb250YWluaW5nRmlyc3RBbmNob3IpWzBdLFxyXG4gICAgICAgICAgICAgICAgICAgIHk6IGFuY2hvclBvaW50VXRpbGl0aWVzLmdldEFuY2hvcnNBc0FycmF5KGVkZ2VDb250YWluaW5nRmlyc3RBbmNob3IpWzFdXHJcbiAgICAgICAgICAgICAgICB9O1xyXG5cclxuXHJcbiAgICAgICAgICAgICAgICBtb3ZlYW5jaG9ycGFyYW0ucG9zaXRpb25EaWZmID0ge1xyXG4gICAgICAgICAgICAgICAgICAgIHg6IC1tb3ZlZEZpcnN0QW5jaG9yLnggKyBpbml0aWFsUG9zLngsXHJcbiAgICAgICAgICAgICAgICAgICAgeTogLW1vdmVkRmlyc3RBbmNob3IueSArIGluaXRpYWxQb3MueVxyXG4gICAgICAgICAgICAgICAgfVxyXG5cclxuICAgICAgICAgICAgICAgIGRlbGV0ZSBtb3ZlYW5jaG9ycGFyYW0uZmlyc3RBbmNob3JQb3NpdGlvbjtcclxuXHJcbiAgICAgICAgICAgICAgICBpZihvcHRpb25zKCkudW5kb2FibGUpIHtcclxuICAgICAgICAgICAgICAgICAgICBjeS51bmRvUmVkbygpLmRvKFwibW92ZUFuY2hvclBvaW50c1wiLCBtb3ZlYW5jaG9ycGFyYW0pO1xyXG4gICAgICAgICAgICAgICAgfVxyXG5cclxuICAgICAgICAgICAgICAgIG1vdmVhbmNob3JwYXJhbSA9IHVuZGVmaW5lZDtcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgIH0pO1xyXG5cclxuICAgICAgICBjeS5vbignY3h0dGFwJywgZUN4dFRhcCA9IGZ1bmN0aW9uIChldmVudCkge1xyXG4gICAgICAgICAgdmFyIHRhcmdldCA9IGV2ZW50LnRhcmdldCB8fCBldmVudC5jeVRhcmdldDtcclxuICAgICAgICAgIHZhciB0YXJnZXRJc0VkZ2UgPSBmYWxzZTtcclxuXHJcbiAgICAgICAgICB0cnl7XHJcbiAgICAgICAgICAgIHRhcmdldElzRWRnZSA9IHRhcmdldC5pc0VkZ2UoKTtcclxuICAgICAgICAgIH1cclxuICAgICAgICAgIGNhdGNoKGVycil7XHJcbiAgICAgICAgICAgIC8vIHRoaXMgaXMgaGVyZSBqdXN0IHRvIHN1cHByZXNzIHRoZSBlcnJvclxyXG4gICAgICAgICAgfVxyXG5cclxuICAgICAgICAgIHZhciBlZGdlLCB0eXBlO1xyXG4gICAgICAgICAgaWYodGFyZ2V0SXNFZGdlKXtcclxuICAgICAgICAgICAgZWRnZSA9IHRhcmdldDtcclxuICAgICAgICAgICAgdHlwZSA9IGFuY2hvclBvaW50VXRpbGl0aWVzLmdldEVkZ2VUeXBlKGVkZ2UpO1xyXG4gICAgICAgICAgfVxyXG4gICAgICAgICAgZWxzZXtcclxuICAgICAgICAgICAgZWRnZSA9IGFuY2hvck1hbmFnZXIuZWRnZTsgICAgICAgICAgXHJcbiAgICAgICAgICAgIHR5cGUgPSBhbmNob3JNYW5hZ2VyLmVkZ2VUeXBlO1xyXG4gICAgICAgICAgfVxyXG5cclxuICAgICAgICAgIHZhciBtZW51cyA9IGN5LmNvbnRleHRNZW51cygnZ2V0Jyk7IC8vIGdldCBjb250ZXh0IG1lbnVzIGluc3RhbmNlXHJcbiAgICAgICAgICBcclxuICAgICAgICAgIGlmKCFlZGdlVG9IaWdobGlnaHQgfHwgZWRnZVRvSGlnaGxpZ2h0LmlkKCkgIT0gZWRnZS5pZCgpIHx8IGFuY2hvclBvaW50VXRpbGl0aWVzLmlzSWdub3JlZEVkZ2UoZWRnZSkgfHxcclxuICAgICAgICAgICAgICBlZGdlVG9IaWdobGlnaHQgIT09IGVkZ2UpIHtcclxuICAgICAgICAgICAgbWVudXMuaGlkZU1lbnVJdGVtKHJlbW92ZUJlbmRQb2ludEN4dE1lbnVJZCk7XHJcbiAgICAgICAgICAgIG1lbnVzLmhpZGVNZW51SXRlbShhZGRCZW5kUG9pbnRDeHRNZW51SWQpO1xyXG4gICAgICAgICAgICBtZW51cy5oaWRlTWVudUl0ZW0ocmVtb3ZlQ29udHJvbFBvaW50Q3h0TWVudUlkKTtcclxuICAgICAgICAgICAgbWVudXMuaGlkZU1lbnVJdGVtKGFkZENvbnRyb2xQb2ludEN4dE1lbnVJZCk7XHJcbiAgICAgICAgICAgIHJldHVybjtcclxuICAgICAgICAgIH1cclxuXHJcbiAgICAgICAgICB2YXIgY3lQb3MgPSBldmVudC5wb3NpdGlvbiB8fCBldmVudC5jeVBvc2l0aW9uO1xyXG4gICAgICAgICAgdmFyIHNlbGVjdGVkSW5kZXggPSBnZXRDb250YWluaW5nU2hhcGVJbmRleChjeVBvcy54LCBjeVBvcy55LCBlZGdlKTtcclxuICAgICAgICAgIC8vIG5vdCBjbGlja2VkIG9uIGFuIGFuY2hvclxyXG4gICAgICAgICAgaWYgKHNlbGVjdGVkSW5kZXggPT0gLTEpIHtcclxuICAgICAgICAgICAgbWVudXMuaGlkZU1lbnVJdGVtKHJlbW92ZUJlbmRQb2ludEN4dE1lbnVJZCk7XHJcbiAgICAgICAgICAgIG1lbnVzLmhpZGVNZW51SXRlbShyZW1vdmVDb250cm9sUG9pbnRDeHRNZW51SWQpO1xyXG4gICAgICAgICAgICBpZih0eXBlID09PSAnY29udHJvbCcgJiYgdGFyZ2V0SXNFZGdlKXtcclxuICAgICAgICAgICAgICBtZW51cy5zaG93TWVudUl0ZW0oYWRkQ29udHJvbFBvaW50Q3h0TWVudUlkKTtcclxuICAgICAgICAgICAgICBtZW51cy5oaWRlTWVudUl0ZW0oYWRkQmVuZFBvaW50Q3h0TWVudUlkKTtcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICBlbHNlIGlmKHR5cGUgPT09ICdiZW5kJyAmJiB0YXJnZXRJc0VkZ2Upe1xyXG4gICAgICAgICAgICAgIG1lbnVzLnNob3dNZW51SXRlbShhZGRCZW5kUG9pbnRDeHRNZW51SWQpO1xyXG4gICAgICAgICAgICAgIG1lbnVzLmhpZGVNZW51SXRlbShhZGRDb250cm9sUG9pbnRDeHRNZW51SWQpO1xyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgICAgIGVsc2UgaWYgKHRhcmdldElzRWRnZSl7XHJcbiAgICAgICAgICAgICAgbWVudXMuc2hvd01lbnVJdGVtKGFkZEJlbmRQb2ludEN4dE1lbnVJZCk7XHJcbiAgICAgICAgICAgICAgbWVudXMuc2hvd01lbnVJdGVtKGFkZENvbnRyb2xQb2ludEN4dE1lbnVJZCk7XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgZWxzZSB7XHJcbiAgICAgICAgICAgICAgbWVudXMuaGlkZU1lbnVJdGVtKGFkZEJlbmRQb2ludEN4dE1lbnVJZCk7XHJcbiAgICAgICAgICAgICAgbWVudXMuaGlkZU1lbnVJdGVtKGFkZENvbnRyb2xQb2ludEN4dE1lbnVJZCk7XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgYW5jaG9yUG9pbnRVdGlsaXRpZXMuY3VycmVudEN0eFBvcyA9IGN5UG9zO1xyXG4gICAgICAgICAgfVxyXG4gICAgICAgICAgLy8gY2xpY2tlZCBvbiBhbiBhbmNob3JcclxuICAgICAgICAgIGVsc2Uge1xyXG4gICAgICAgICAgICBtZW51cy5oaWRlTWVudUl0ZW0oYWRkQmVuZFBvaW50Q3h0TWVudUlkKTtcclxuICAgICAgICAgICAgbWVudXMuaGlkZU1lbnVJdGVtKGFkZENvbnRyb2xQb2ludEN4dE1lbnVJZCk7XHJcbiAgICAgICAgICAgIGlmKHR5cGUgPT09ICdjb250cm9sJyl7XHJcbiAgICAgICAgICAgICAgbWVudXMuc2hvd01lbnVJdGVtKHJlbW92ZUNvbnRyb2xQb2ludEN4dE1lbnVJZCk7XHJcbiAgICAgICAgICAgICAgbWVudXMuaGlkZU1lbnVJdGVtKHJlbW92ZUJlbmRQb2ludEN4dE1lbnVJZCk7XHJcbiAgICAgICAgICAgICAgaWYgKG9wdHMuZW5hYmxlTXVsdGlwbGVBbmNob3JSZW1vdmFsT3B0aW9uICYmIFxyXG4gICAgICAgICAgICAgICAgICBlZGdlLmhhc0NsYXNzKCdlZGdlY29udHJvbGVkaXRpbmctaGFzbXVsdGlwbGVjb250cm9scG9pbnRzJykpIHtcclxuICAgICAgICAgICAgICAgIG1lbnVzLnNob3dNZW51SXRlbShyZW1vdmVBbGxDb250cm9sUG9pbnRDdHhNZW51SWQpO1xyXG4gICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICBlbHNlIGlmKHR5cGUgPT09ICdiZW5kJyl7XHJcbiAgICAgICAgICAgICAgbWVudXMuc2hvd01lbnVJdGVtKHJlbW92ZUJlbmRQb2ludEN4dE1lbnVJZCk7XHJcbiAgICAgICAgICAgICAgbWVudXMuaGlkZU1lbnVJdGVtKHJlbW92ZUNvbnRyb2xQb2ludEN4dE1lbnVJZCk7XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgZWxzZXtcclxuICAgICAgICAgICAgICBtZW51cy5oaWRlTWVudUl0ZW0ocmVtb3ZlQmVuZFBvaW50Q3h0TWVudUlkKTtcclxuICAgICAgICAgICAgICBtZW51cy5oaWRlTWVudUl0ZW0ocmVtb3ZlQ29udHJvbFBvaW50Q3h0TWVudUlkKTtcclxuICAgICAgICAgICAgICBtZW51cy5oaWRlTWVudUl0ZW0ocmVtb3ZlQWxsQ29udHJvbFBvaW50Q3R4TWVudUlkKTtcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICBhbmNob3JQb2ludFV0aWxpdGllcy5jdXJyZW50QW5jaG9ySW5kZXggPSBzZWxlY3RlZEluZGV4O1xyXG4gICAgICAgICAgfVxyXG5cclxuICAgICAgICAgIGFuY2hvclBvaW50VXRpbGl0aWVzLmN1cnJlbnRDdHhFZGdlID0gZWRnZTtcclxuICAgICAgICB9KTtcclxuICAgICAgICBcclxuICAgICAgICBjeS5vbignY3llZGdlZWRpdGluZy5jaGFuZ2VBbmNob3JQb2ludHMnLCAnZWRnZScsIGZ1bmN0aW9uKCkge1xyXG4gICAgICAgICAgdmFyIGVkZ2UgPSB0aGlzO1xyXG4gICAgICAgICAgY3kuc3RhcnRCYXRjaCgpO1xyXG4gICAgICAgICAgY3kuZWRnZXMoKS51bnNlbGVjdCgpOyBcclxuICAgICAgICAgICAgICAgICAgICBcclxuICAgICAgICAgIC8vIExpc3RlbmVyIGRlZmluZWQgaW4gb3RoZXIgZXh0ZW5zaW9uXHJcbiAgICAgICAgICAvLyBNaWdodCBoYXZlIGNvbXBhdGliaWxpdHkgaXNzdWVzIGFmdGVyIHRoZSB1bmJ1bmRsZWQgYmV6aWVyICAgIFxyXG4gICAgICAgICAgY3kudHJpZ2dlcignYmVuZFBvaW50TW92ZW1lbnQnKTsgICAgXHJcbiAgICAgICAgICBcclxuICAgICAgICAgIGN5LmVuZEJhdGNoKCk7ICAgICAgICAgIFxyXG4gICAgICAgICAgcmVmcmVzaERyYXdzKCk7XHJcbiAgICAgICAgXHJcbiAgICAgICAgICBcclxuICAgICAgICB9KTtcclxuICAgICAgfVxyXG5cclxuICAgICAgdmFyIHNlbGVjdGVkRWRnZXM7XHJcbiAgICAgIHZhciBhbmNob3JzTW92aW5nID0gZmFsc2U7XHJcblxyXG4gICAgICAvLyB0cmFjayBhcnJvdyBrZXkgcHJlc3NlcywgZGVmYXVsdCBmYWxzZVxyXG4gICAgICAvLyBldmVudC5rZXlDb2RlIG5vcm1hbGx5IHJldHVybnMgbnVtYmVyXHJcbiAgICAgIC8vIGJ1dCBKUyB3aWxsIGNvbnZlcnQgdG8gc3RyaW5nIGFueXdheVxyXG4gICAgICB2YXIga2V5cyA9IHtcclxuICAgICAgICAnMzcnOiBmYWxzZSxcclxuICAgICAgICAnMzgnOiBmYWxzZSxcclxuICAgICAgICAnMzknOiBmYWxzZSxcclxuICAgICAgICAnNDAnOiBmYWxzZVxyXG4gICAgICB9O1xyXG5cclxuICAgICAgZnVuY3Rpb24ga2V5RG93bihlKSB7XHJcblxyXG4gICAgICAgICAgdmFyIHNob3VsZE1vdmUgPSB0eXBlb2Ygb3B0aW9ucygpLm1vdmVTZWxlY3RlZEFuY2hvcnNPbktleUV2ZW50cyA9PT0gJ2Z1bmN0aW9uJ1xyXG4gICAgICAgICAgICAgID8gb3B0aW9ucygpLm1vdmVTZWxlY3RlZEFuY2hvcnNPbktleUV2ZW50cygpIDogb3B0aW9ucygpLm1vdmVTZWxlY3RlZEFuY2hvcnNPbktleUV2ZW50cztcclxuXHJcbiAgICAgICAgICBpZiAoIXNob3VsZE1vdmUpIHtcclxuICAgICAgICAgICAgICByZXR1cm47XHJcbiAgICAgICAgICB9XHJcblxyXG4gICAgICAgICAgLy9DaGVja3MgaWYgdGhlIHRhZ25hbWUgaXMgdGV4dGFyZWEgb3IgaW5wdXRcclxuICAgICAgICAgIHZhciB0biA9IGRvY3VtZW50LmFjdGl2ZUVsZW1lbnQudGFnTmFtZTtcclxuICAgICAgICAgIGlmICh0biAhPSBcIlRFWFRBUkVBXCIgJiYgdG4gIT0gXCJJTlBVVFwiKVxyXG4gICAgICAgICAge1xyXG4gICAgICAgICAgICAgIHN3aXRjaChlLmtleUNvZGUpe1xyXG4gICAgICAgICAgICAgICAgICBjYXNlIDM3OiBjYXNlIDM5OiBjYXNlIDM4OiAgY2FzZSA0MDogLy8gQXJyb3cga2V5c1xyXG4gICAgICAgICAgICAgICAgICBjYXNlIDMyOiBlLnByZXZlbnREZWZhdWx0KCk7IGJyZWFrOyAvLyBTcGFjZVxyXG4gICAgICAgICAgICAgICAgICBkZWZhdWx0OiBicmVhazsgLy8gZG8gbm90IGJsb2NrIG90aGVyIGtleXNcclxuICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgaWYgKGUua2V5Q29kZSA8ICczNycgfHwgZS5rZXlDb2RlID4gJzQwJykge1xyXG4gICAgICAgICAgICAgICAgICByZXR1cm47XHJcbiAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgIGtleXNbZS5rZXlDb2RlXSA9IHRydWU7XHJcblxyXG4gICAgICAgICAgICAgIC8vQ2hlY2tzIGlmIG9ubHkgZWRnZXMgYXJlIHNlbGVjdGVkIChub3QgYW55IG5vZGUpIGFuZCBpZiBvbmx5IDEgZWRnZSBpcyBzZWxlY3RlZFxyXG4gICAgICAgICAgICAgIC8vSWYgdGhlIHNlY29uZCBjaGVja2luZyBpcyByZW1vdmVkIHRoZSBhbmNob3JzIG9mIG11bHRpcGxlIGVkZ2VzIHdvdWxkIG1vdmVcclxuICAgICAgICAgICAgICBpZiAoY3kuZWRnZXMoXCI6c2VsZWN0ZWRcIikubGVuZ3RoICE9IGN5LmVsZW1lbnRzKFwiOnNlbGVjdGVkXCIpLmxlbmd0aCB8fCBjeS5lZGdlcyhcIjpzZWxlY3RlZFwiKS5sZW5ndGggIT0gMSlcclxuICAgICAgICAgICAgICB7XHJcbiAgICAgICAgICAgICAgICByZXR1cm47XHJcbiAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgIGlmICghYW5jaG9yc01vdmluZylcclxuICAgICAgICAgICAgICB7XHJcbiAgICAgICAgICAgICAgICAgIHNlbGVjdGVkRWRnZXMgPSBjeS5lZGdlcygnOnNlbGVjdGVkJyk7XHJcbiAgICAgICAgICAgICAgICAgIGN5LnRyaWdnZXIoXCJlZGdlZWRpdGluZy5tb3Zlc3RhcnRcIiwgW3NlbGVjdGVkRWRnZXNdKTtcclxuICAgICAgICAgICAgICAgICAgYW5jaG9yc01vdmluZyA9IHRydWU7XHJcbiAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgIHZhciBtb3ZlU3BlZWQgPSAzO1xyXG4gICAgICAgICAgICAgICAgICAgIFxyXG4gICAgICAgICAgICAgIC8vIGRvZXNuJ3QgbWFrZSBzZW5zZSBpZiBhbHQgYW5kIHNoaWZ0IGJvdGggcHJlc3NlZFxyXG4gICAgICAgICAgICAgIGlmKGUuYWx0S2V5ICYmIGUuc2hpZnRLZXkpIHtcclxuICAgICAgICAgICAgICAgIHJldHVybjtcclxuICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgZWxzZSBpZiAoZS5hbHRLZXkpIHtcclxuICAgICAgICAgICAgICAgIG1vdmVTcGVlZCA9IDE7XHJcbiAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgIGVsc2UgaWYgKGUuc2hpZnRLZXkpIHtcclxuICAgICAgICAgICAgICAgIG1vdmVTcGVlZCA9IDEwO1xyXG4gICAgICAgICAgICAgIH1cclxuXHJcbiAgICAgICAgICAgICAgdmFyIHVwQXJyb3dDb2RlID0gMzg7XHJcbiAgICAgICAgICAgICAgdmFyIGRvd25BcnJvd0NvZGUgPSA0MDtcclxuICAgICAgICAgICAgICB2YXIgbGVmdEFycm93Q29kZSA9IDM3O1xyXG4gICAgICAgICAgICAgIHZhciByaWdodEFycm93Q29kZSA9IDM5O1xyXG5cclxuICAgICAgICAgICAgICB2YXIgZHggPSAwO1xyXG4gICAgICAgICAgICAgIHZhciBkeSA9IDA7XHJcblxyXG4gICAgICAgICAgICAgIGR4ICs9IGtleXNbcmlnaHRBcnJvd0NvZGVdID8gbW92ZVNwZWVkIDogMDtcclxuICAgICAgICAgICAgICBkeCAtPSBrZXlzW2xlZnRBcnJvd0NvZGVdID8gbW92ZVNwZWVkIDogMDtcclxuICAgICAgICAgICAgICBkeSArPSBrZXlzW2Rvd25BcnJvd0NvZGVdID8gbW92ZVNwZWVkIDogMDtcclxuICAgICAgICAgICAgICBkeSAtPSBrZXlzW3VwQXJyb3dDb2RlXSA/IG1vdmVTcGVlZCA6IDA7XHJcblxyXG4gICAgICAgICAgICAgIG1vdmVBbmNob3JQb2ludHMoe3g6ZHgsIHk6ZHl9LCBzZWxlY3RlZEVkZ2VzKTtcclxuICAgICAgICAgIH1cclxuICAgICAgfVxyXG4gICAgICBmdW5jdGlvbiBrZXlVcChlKSB7XHJcblxyXG4gICAgICAgICAgaWYgKGUua2V5Q29kZSA8ICczNycgfHwgZS5rZXlDb2RlID4gJzQwJykge1xyXG4gICAgICAgICAgICAgIHJldHVybjtcclxuICAgICAgICAgIH1cclxuICAgICAgICAgIGUucHJldmVudERlZmF1bHQoKTtcclxuICAgICAgICAgIGtleXNbZS5rZXlDb2RlXSA9IGZhbHNlO1xyXG4gICAgICAgICAgdmFyIHNob3VsZE1vdmUgPSB0eXBlb2Ygb3B0aW9ucygpLm1vdmVTZWxlY3RlZEFuY2hvcnNPbktleUV2ZW50cyA9PT0gJ2Z1bmN0aW9uJ1xyXG4gICAgICAgICAgICAgID8gb3B0aW9ucygpLm1vdmVTZWxlY3RlZEFuY2hvcnNPbktleUV2ZW50cygpIDogb3B0aW9ucygpLm1vdmVTZWxlY3RlZEFuY2hvcnNPbktleUV2ZW50cztcclxuXHJcbiAgICAgICAgICBpZiAoIXNob3VsZE1vdmUpIHtcclxuICAgICAgICAgICAgICByZXR1cm47XHJcbiAgICAgICAgICB9XHJcblxyXG4gICAgICAgICAgY3kudHJpZ2dlcihcImVkZ2VlZGl0aW5nLm1vdmVlbmRcIiwgW3NlbGVjdGVkRWRnZXNdKTtcclxuICAgICAgICAgIHNlbGVjdGVkRWRnZXMgPSB1bmRlZmluZWQ7XHJcbiAgICAgICAgICBhbmNob3JzTW92aW5nID0gZmFsc2U7XHJcblxyXG4gICAgICB9XHJcbiAgICAgIGRvY3VtZW50LmFkZEV2ZW50TGlzdGVuZXIoXCJrZXlkb3duXCIsa2V5RG93biwgdHJ1ZSk7XHJcbiAgICAgIGRvY3VtZW50LmFkZEV2ZW50TGlzdGVuZXIoXCJrZXl1cFwiLGtleVVwLCB0cnVlKTtcclxuXHJcbiAgICAgICRjb250YWluZXIuZGF0YSgnY3llZGdlZWRpdGluZycsIGRhdGEpO1xyXG4gICAgfSxcclxuICAgIHVuYmluZDogZnVuY3Rpb24gKCkge1xyXG4gICAgICAgIGN5Lm9mZigncmVtb3ZlJywgJ25vZGUnLCBlUmVtb3ZlKVxyXG4gICAgICAgICAgLm9mZignYWRkJywgJ25vZGUnLCBlQWRkKVxyXG4gICAgICAgICAgLm9mZignc3R5bGUnLCAnZWRnZS5lZGdlYmVuZGVkaXRpbmctaGFzYmVuZHBvaW50czpzZWxlY3RlZCwgZWRnZS5lZGdlY29udHJvbGVkaXRpbmctaGFzY29udHJvbHBvaW50czpzZWxlY3RlZCcsIGVTdHlsZSlcclxuICAgICAgICAgIC5vZmYoJ3NlbGVjdCcsICdlZGdlJywgZVNlbGVjdClcclxuICAgICAgICAgIC5vZmYoJ3Vuc2VsZWN0JywgJ2VkZ2UnLCBlVW5zZWxlY3QpXHJcbiAgICAgICAgICAub2ZmKCd0YXBzdGFydCcsIGVUYXBTdGFydClcclxuICAgICAgICAgIC5vZmYoJ3RhcHN0YXJ0JywgJ2VkZ2UnLCBlVGFwU3RhcnRPbkVkZ2UpXHJcbiAgICAgICAgICAub2ZmKCd0YXBkcmFnJywgZVRhcERyYWcpXHJcbiAgICAgICAgICAub2ZmKCd0YXBlbmQnLCBlVGFwRW5kKVxyXG4gICAgICAgICAgLm9mZignY3h0dGFwJywgZUN4dFRhcClcclxuICAgICAgICAgIC5vZmYoJ2RyYWcnLCAnbm9kZScsZURyYWcpO1xyXG5cclxuICAgICAgICBjeS51bmJpbmQoXCJ6b29tIHBhblwiLCBlWm9vbSk7XHJcbiAgICB9XHJcbiAgfTtcclxuXHJcbiAgaWYgKGZ1bmN0aW9uc1tmbl0pIHtcclxuICAgIHJldHVybiBmdW5jdGlvbnNbZm5dLmFwcGx5KCQoY3kuY29udGFpbmVyKCkpLCBBcnJheS5wcm90b3R5cGUuc2xpY2UuY2FsbChhcmd1bWVudHMsIDEpKTtcclxuICB9IGVsc2UgaWYgKHR5cGVvZiBmbiA9PSAnb2JqZWN0JyB8fCAhZm4pIHtcclxuICAgIHJldHVybiBmdW5jdGlvbnMuaW5pdC5hcHBseSgkKGN5LmNvbnRhaW5lcigpKSwgYXJndW1lbnRzKTtcclxuICB9IGVsc2Uge1xyXG4gICAgJC5lcnJvcignTm8gc3VjaCBmdW5jdGlvbiBgJyArIGZuICsgJ2AgZm9yIGN5dG9zY2FwZS5qcy1lZGdlLWVkaXRpbmcnKTtcclxuICB9XHJcblxyXG4gIHJldHVybiAkKHRoaXMpO1xyXG59O1xyXG4iLCJ2YXIgcmVjb25uZWN0aW9uVXRpbGl0aWVzID0ge1xyXG5cclxuICAgIC8vIGNyZWF0ZXMgYW5kIHJldHVybnMgYSBkdW1teSBub2RlIHdoaWNoIGlzIGNvbm5lY3RlZCB0byB0aGUgZGlzY29ubmVjdGVkIGVkZ2VcclxuICAgIGRpc2Nvbm5lY3RFZGdlOiBmdW5jdGlvbiAoZWRnZSwgY3ksIHBvc2l0aW9uLCBkaXNjb25uZWN0ZWRFbmQpIHtcclxuICAgICAgICBcclxuICAgICAgICB2YXIgZHVtbXlOb2RlID0ge1xyXG4gICAgICAgICAgICBkYXRhOiB7IFxyXG4gICAgICAgICAgICAgIGlkOiAnbnd0X3JlY29ubmVjdEVkZ2VfZHVtbXknLFxyXG4gICAgICAgICAgICAgIHBvcnRzOiBbXSxcclxuICAgICAgICAgICAgfSxcclxuICAgICAgICAgICAgc3R5bGU6IHtcclxuICAgICAgICAgICAgICB3aWR0aDogMSxcclxuICAgICAgICAgICAgICBoZWlnaHQ6IDEsXHJcbiAgICAgICAgICAgICAgJ3Zpc2liaWxpdHknOiAnaGlkZGVuJ1xyXG4gICAgICAgICAgICB9LFxyXG4gICAgICAgICAgICByZW5kZXJlZFBvc2l0aW9uOiBwb3NpdGlvblxyXG4gICAgICAgIH07XHJcbiAgICAgICAgY3kuYWRkKGR1bW15Tm9kZSk7XHJcblxyXG4gICAgICAgIHZhciBsb2MgPSAoZGlzY29ubmVjdGVkRW5kID09PSAnc291cmNlJykgPyBcclxuICAgICAgICAgICAge3NvdXJjZTogZHVtbXlOb2RlLmRhdGEuaWR9IDogXHJcbiAgICAgICAgICAgIHt0YXJnZXQ6IGR1bW15Tm9kZS5kYXRhLmlkfTtcclxuXHJcbiAgICAgICAgZWRnZSA9IGVkZ2UubW92ZShsb2MpWzBdO1xyXG5cclxuICAgICAgICByZXR1cm4ge1xyXG4gICAgICAgICAgICBkdW1teU5vZGU6IGN5Lm5vZGVzKFwiI1wiICsgZHVtbXlOb2RlLmRhdGEuaWQpWzBdLFxyXG4gICAgICAgICAgICBlZGdlOiBlZGdlXHJcbiAgICAgICAgfTtcclxuICAgIH0sXHJcblxyXG4gICAgY29ubmVjdEVkZ2U6IGZ1bmN0aW9uIChlZGdlLCBub2RlLCBsb2NhdGlvbikge1xyXG4gICAgICAgIGlmKCFlZGdlLmlzRWRnZSgpIHx8ICFub2RlLmlzTm9kZSgpKVxyXG4gICAgICAgICAgICByZXR1cm47XHJcblxyXG4gICAgICAgIHZhciBsb2MgPSB7fTtcclxuICAgICAgICBpZihsb2NhdGlvbiA9PT0gJ3NvdXJjZScpXHJcbiAgICAgICAgICAgIGxvYy5zb3VyY2UgPSBub2RlLmlkKCk7XHJcbiAgICAgICAgXHJcbiAgICAgICAgZWxzZSBpZihsb2NhdGlvbiA9PT0gJ3RhcmdldCcpXHJcbiAgICAgICAgICAgIGxvYy50YXJnZXQgPSBub2RlLmlkKCk7XHJcbiAgICAgICAgXHJcbiAgICAgICAgZWxzZVxyXG4gICAgICAgICAgICByZXR1cm47XHJcblxyXG4gICAgICAgIHJldHVybiBlZGdlLm1vdmUobG9jKVswXTtcclxuICAgIH0sXHJcblxyXG4gICAgY29weUVkZ2U6IGZ1bmN0aW9uIChvbGRFZGdlLCBuZXdFZGdlKSB7XHJcbiAgICAgICAgdGhpcy5jb3B5QW5jaG9ycyhvbGRFZGdlLCBuZXdFZGdlKTtcclxuICAgICAgICB0aGlzLmNvcHlTdHlsZShvbGRFZGdlLCBuZXdFZGdlKTtcclxuICAgIH0sXHJcblxyXG4gICAgY29weVN0eWxlOiBmdW5jdGlvbiAob2xkRWRnZSwgbmV3RWRnZSkge1xyXG4gICAgICAgIGlmKG9sZEVkZ2UgJiYgbmV3RWRnZSl7XHJcbiAgICAgICAgICAgIG5ld0VkZ2UuZGF0YSgnbGluZS1jb2xvcicsIG9sZEVkZ2UuZGF0YSgnbGluZS1jb2xvcicpKTtcclxuICAgICAgICAgICAgbmV3RWRnZS5kYXRhKCd3aWR0aCcsIG9sZEVkZ2UuZGF0YSgnd2lkdGgnKSk7XHJcbiAgICAgICAgICAgIG5ld0VkZ2UuZGF0YSgnY2FyZGluYWxpdHknLCBvbGRFZGdlLmRhdGEoJ2NhcmRpbmFsaXR5JykpO1xyXG4gICAgICAgIH1cclxuICAgIH0sXHJcblxyXG4gICAgY29weUFuY2hvcnM6IGZ1bmN0aW9uIChvbGRFZGdlLCBuZXdFZGdlKSB7XHJcbiAgICAgICAgaWYob2xkRWRnZS5oYXNDbGFzcygnZWRnZWJlbmRlZGl0aW5nLWhhc2JlbmRwb2ludHMnKSl7XHJcbiAgICAgICAgICAgIHZhciBicERpc3RhbmNlcyA9IG9sZEVkZ2UuZGF0YSgnY3llZGdlYmVuZGVkaXRpbmdEaXN0YW5jZXMnKTtcclxuICAgICAgICAgICAgdmFyIGJwV2VpZ2h0cyA9IG9sZEVkZ2UuZGF0YSgnY3llZGdlYmVuZGVkaXRpbmdXZWlnaHRzJyk7XHJcbiAgICAgICAgICAgIFxyXG4gICAgICAgICAgICBuZXdFZGdlLmRhdGEoJ2N5ZWRnZWJlbmRlZGl0aW5nRGlzdGFuY2VzJywgYnBEaXN0YW5jZXMpO1xyXG4gICAgICAgICAgICBuZXdFZGdlLmRhdGEoJ2N5ZWRnZWJlbmRlZGl0aW5nV2VpZ2h0cycsIGJwV2VpZ2h0cyk7XHJcbiAgICAgICAgICAgIG5ld0VkZ2UuYWRkQ2xhc3MoJ2VkZ2ViZW5kZWRpdGluZy1oYXNiZW5kcG9pbnRzJyk7XHJcbiAgICAgICAgfVxyXG4gICAgICAgIGVsc2UgaWYob2xkRWRnZS5oYXNDbGFzcygnZWRnZWNvbnRyb2xlZGl0aW5nLWhhc2NvbnRyb2xwb2ludHMnKSl7XHJcbiAgICAgICAgICAgIHZhciBicERpc3RhbmNlcyA9IG9sZEVkZ2UuZGF0YSgnY3llZGdlY29udHJvbGVkaXRpbmdEaXN0YW5jZXMnKTtcclxuICAgICAgICAgICAgdmFyIGJwV2VpZ2h0cyA9IG9sZEVkZ2UuZGF0YSgnY3llZGdlY29udHJvbGVkaXRpbmdXZWlnaHRzJyk7XHJcbiAgICAgICAgICAgIFxyXG4gICAgICAgICAgICBuZXdFZGdlLmRhdGEoJ2N5ZWRnZWNvbnRyb2xlZGl0aW5nRGlzdGFuY2VzJywgYnBEaXN0YW5jZXMpO1xyXG4gICAgICAgICAgICBuZXdFZGdlLmRhdGEoJ2N5ZWRnZWNvbnRyb2xlZGl0aW5nV2VpZ2h0cycsIGJwV2VpZ2h0cyk7XHJcbiAgICAgICAgICAgIG5ld0VkZ2UuYWRkQ2xhc3MoJ2VkZ2Vjb250cm9sZWRpdGluZy1oYXNjb250cm9scG9pbnRzJyk7XHJcbiAgICAgICAgfVxyXG4gICAgICAgIGlmIChvbGRFZGdlLmhhc0NsYXNzKCdlZGdlYmVuZGVkaXRpbmctaGFzbXVsdGlwbGViZW5kcG9pbnRzJykpIHtcclxuICAgICAgICAgICAgbmV3RWRnZS5hZGRDbGFzcygnZWRnZWJlbmRlZGl0aW5nLWhhc211bHRpcGxlYmVuZHBvaW50cycpO1xyXG4gICAgICAgIH1cclxuICAgICAgICBlbHNlIGlmIChvbGRFZGdlLmhhc0NsYXNzKCdlZGdlY29udHJvbGVkaXRpbmctaGFzbXVsdGlwbGVjb250cm9scG9pbnRzJykpIHtcclxuICAgICAgICAgICAgbmV3RWRnZS5hZGRDbGFzcygnZWRnZWNvbnRyb2xlZGl0aW5nLWhhc211bHRpcGxlY29udHJvbHBvaW50cycpO1xyXG4gICAgICAgIH1cclxuICAgIH0sXHJcbn07XHJcbiAgXHJcbm1vZHVsZS5leHBvcnRzID0gcmVjb25uZWN0aW9uVXRpbGl0aWVzO1xyXG4gICIsIm1vZHVsZS5leHBvcnRzID0gZnVuY3Rpb24gKGN5LCBhbmNob3JQb2ludFV0aWxpdGllcywgcGFyYW1zKSB7XHJcbiAgaWYgKGN5LnVuZG9SZWRvID09IG51bGwpXHJcbiAgICByZXR1cm47XHJcblxyXG4gIHZhciB1ciA9IGN5LnVuZG9SZWRvKHtcclxuICAgIGRlZmF1bHRBY3Rpb25zOiBmYWxzZSxcclxuICAgIGlzRGVidWc6IHRydWVcclxuICB9KTtcclxuXHJcbiAgZnVuY3Rpb24gY2hhbmdlQW5jaG9yUG9pbnRzKHBhcmFtKSB7XHJcbiAgICB2YXIgZWRnZSA9IGN5LmdldEVsZW1lbnRCeUlkKHBhcmFtLmVkZ2UuaWQoKSk7XHJcbiAgICB2YXIgdHlwZSA9IHBhcmFtLnR5cGUgIT09ICdpbmNvbmNsdXNpdmUnID8gcGFyYW0udHlwZSA6IGFuY2hvclBvaW50VXRpbGl0aWVzLmdldEVkZ2VUeXBlKGVkZ2UpO1xyXG4gICAgXHJcbiAgICB2YXIgd2VpZ2h0cywgZGlzdGFuY2VzLCB3ZWlnaHRTdHIsIGRpc3RhbmNlU3RyO1xyXG5cclxuICAgIGlmKHBhcmFtLnR5cGUgPT09ICdpbmNvbmNsdXNpdmUnICYmICFwYXJhbS5zZXQpe1xyXG4gICAgICB3ZWlnaHRzID0gW107XHJcbiAgICAgIGRpc3RhbmNlcyA9IFtdO1xyXG4gICAgfVxyXG4gICAgZWxzZSB7XHJcbiAgICAgIHdlaWdodFN0ciA9IGFuY2hvclBvaW50VXRpbGl0aWVzLnN5bnRheFt0eXBlXVsnd2VpZ2h0J107XHJcbiAgICAgIGRpc3RhbmNlU3RyID0gYW5jaG9yUG9pbnRVdGlsaXRpZXMuc3ludGF4W3R5cGVdWydkaXN0YW5jZSddO1xyXG5cclxuICAgICAgd2VpZ2h0cyA9IHBhcmFtLnNldCA/IGVkZ2UuZGF0YSh3ZWlnaHRTdHIpIDogcGFyYW0ud2VpZ2h0cztcclxuICAgICAgZGlzdGFuY2VzID0gcGFyYW0uc2V0ID8gZWRnZS5kYXRhKGRpc3RhbmNlU3RyKSA6IHBhcmFtLmRpc3RhbmNlcztcclxuICAgIH1cclxuXHJcbiAgICB2YXIgcmVzdWx0ID0ge1xyXG4gICAgICBlZGdlOiBlZGdlLFxyXG4gICAgICB0eXBlOiB0eXBlLFxyXG4gICAgICB3ZWlnaHRzOiB3ZWlnaHRzLFxyXG4gICAgICBkaXN0YW5jZXM6IGRpc3RhbmNlcyxcclxuICAgICAgLy9BcyB0aGUgcmVzdWx0IHdpbGwgbm90IGJlIHVzZWQgZm9yIHRoZSBmaXJzdCBmdW5jdGlvbiBjYWxsIHBhcmFtcyBzaG91bGQgYmUgdXNlZCB0byBzZXQgdGhlIGRhdGFcclxuICAgICAgc2V0OiB0cnVlXHJcbiAgICB9O1xyXG5cclxuICAgIC8vQ2hlY2sgaWYgd2UgbmVlZCB0byBzZXQgdGhlIHdlaWdodHMgYW5kIGRpc3RhbmNlcyBieSB0aGUgcGFyYW0gdmFsdWVzXHJcbiAgICBpZiAocGFyYW0uc2V0KSB7XHJcbiAgICAgIHZhciBoYWRBbmNob3JQb2ludCA9IHBhcmFtLndlaWdodHMgJiYgcGFyYW0ud2VpZ2h0cy5sZW5ndGggPiAwO1xyXG4gICAgICB2YXIgaGFkTXVsdGlwbGVBbmNob3JQb2ludHMgPSBoYWRBbmNob3JQb2ludCAmJiBwYXJhbS53ZWlnaHRzLmxlbmd0aCA+IDE7XHJcblxyXG4gICAgICBoYWRBbmNob3JQb2ludCA/IGVkZ2UuZGF0YSh3ZWlnaHRTdHIsIHBhcmFtLndlaWdodHMpIDogZWRnZS5yZW1vdmVEYXRhKHdlaWdodFN0cik7XHJcbiAgICAgIGhhZEFuY2hvclBvaW50ID8gZWRnZS5kYXRhKGRpc3RhbmNlU3RyLCBwYXJhbS5kaXN0YW5jZXMpIDogZWRnZS5yZW1vdmVEYXRhKGRpc3RhbmNlU3RyKTtcclxuXHJcbiAgICAgIHZhciBzaW5nbGVDbGFzc05hbWUgPSBhbmNob3JQb2ludFV0aWxpdGllcy5zeW50YXhbdHlwZV1bJ2NsYXNzJ107XHJcbiAgICAgIHZhciBtdWx0aUNsYXNzTmFtZSA9IGFuY2hvclBvaW50VXRpbGl0aWVzLnN5bnRheFt0eXBlXVsnbXVsdGlDbGFzcyddO1xyXG5cclxuICAgICAgLy8gUmVmcmVzaCB0aGUgY3VydmUgc3R5bGUgYXMgdGhlIG51bWJlciBvZiBhbmNob3IgcG9pbnQgd291bGQgYmUgY2hhbmdlZCBieSB0aGUgcHJldmlvdXMgb3BlcmF0aW9uXHJcbiAgICAgIC8vIEFkZGluZyBvciByZW1vdmluZyBtdWx0aSBjbGFzc2VzIGF0IG9uY2UgY2FuIGNhdXNlIGVycm9ycy4gSWYgbXVsdGlwbGUgY2xhc3NlcyBhcmUgdG8gYmUgYWRkZWQsXHJcbiAgICAgIC8vIGp1c3QgYWRkIHRoZW0gdG9nZXRoZXIgaW4gc3BhY2UgZGVsaW1ldGVkIGNsYXNzIG5hbWVzIGZvcm1hdC5cclxuICAgICAgaWYgKCFoYWRBbmNob3JQb2ludCAmJiAhaGFkTXVsdGlwbGVBbmNob3JQb2ludHMpIHtcclxuICAgICAgICAvLyBSZW1vdmUgbXVsdGlwbGUgY2xhc3NlcyBmcm9tIGVkZ2Ugd2l0aCBzcGFjZSBkZWxpbWV0ZWQgc3RyaW5nIG9mIGNsYXNzIG5hbWVzIFxyXG4gICAgICAgIGVkZ2UucmVtb3ZlQ2xhc3Moc2luZ2xlQ2xhc3NOYW1lICsgXCIgXCIgKyBtdWx0aUNsYXNzTmFtZSk7XHJcbiAgICAgIH1cclxuICAgICAgZWxzZSBpZiAoaGFkQW5jaG9yUG9pbnQgJiYgIWhhZE11bHRpcGxlQW5jaG9yUG9pbnRzKSB7IC8vIEhhZCBzaW5nbGUgYW5jaG9yXHJcbiAgICAgICAgZWRnZS5hZGRDbGFzcyhzaW5nbGVDbGFzc05hbWUpO1xyXG4gICAgICAgIGVkZ2UucmVtb3ZlQ2xhc3MobXVsdGlDbGFzc05hbWUpOyAgIFxyXG4gICAgICB9XHJcbiAgICAgIGVsc2Uge1xyXG4gICAgICAgIC8vIEhhZCBtdWx0aXBsZSBhbmNob3JzLiBBZGQgbXVsdGlwbGUgY2xhc3NlcyB3aXRoIHNwYWNlIGRlbGltZXRlZCBzdHJpbmcgb2YgY2xhc3MgbmFtZXNcclxuICAgICAgICBlZGdlLmFkZENsYXNzKHNpbmdsZUNsYXNzTmFtZSArIFwiIFwiICsgbXVsdGlDbGFzc05hbWUpO1xyXG4gICAgICB9XHJcbiAgICAgIGlmICghZWRnZS5zZWxlY3RlZCgpKVxyXG4gICAgICAgIGVkZ2Uuc2VsZWN0KCk7XHJcbiAgICAgIGVsc2Uge1xyXG4gICAgICAgIGVkZ2UudW5zZWxlY3QoKTtcclxuICAgICAgICBlZGdlLnNlbGVjdCgpO1xyXG4gICAgICB9XHJcbiAgICB9XHJcbiAgICBcclxuICAgIGVkZ2UudHJpZ2dlcignY3llZGdlZWRpdGluZy5jaGFuZ2VBbmNob3JQb2ludHMnKTtcclxuXHJcbiAgICByZXR1cm4gcmVzdWx0O1xyXG4gIH1cclxuXHJcbiAgZnVuY3Rpb24gbW92ZURvKGFyZykge1xyXG4gICAgICBpZiAoYXJnLmZpcnN0VGltZSkge1xyXG4gICAgICAgICAgZGVsZXRlIGFyZy5maXJzdFRpbWU7XHJcbiAgICAgICAgICByZXR1cm4gYXJnO1xyXG4gICAgICB9XHJcblxyXG4gICAgICB2YXIgZWRnZXMgPSBhcmcuZWRnZXM7XHJcbiAgICAgIHZhciBwb3NpdGlvbkRpZmYgPSBhcmcucG9zaXRpb25EaWZmO1xyXG4gICAgICB2YXIgcmVzdWx0ID0ge1xyXG4gICAgICAgICAgZWRnZXM6IGVkZ2VzLFxyXG4gICAgICAgICAgcG9zaXRpb25EaWZmOiB7XHJcbiAgICAgICAgICAgICAgeDogLXBvc2l0aW9uRGlmZi54LFxyXG4gICAgICAgICAgICAgIHk6IC1wb3NpdGlvbkRpZmYueVxyXG4gICAgICAgICAgfVxyXG4gICAgICB9O1xyXG4gICAgICBtb3ZlQW5jaG9yc1VuZG9hYmxlKHBvc2l0aW9uRGlmZiwgZWRnZXMpO1xyXG5cclxuICAgICAgcmV0dXJuIHJlc3VsdDtcclxuICB9XHJcblxyXG4gIGZ1bmN0aW9uIG1vdmVBbmNob3JzVW5kb2FibGUocG9zaXRpb25EaWZmLCBlZGdlcykge1xyXG4gICAgICBlZGdlcy5mb3JFYWNoKGZ1bmN0aW9uKCBlZGdlICl7XHJcbiAgICAgICAgICB2YXIgdHlwZSA9IGFuY2hvclBvaW50VXRpbGl0aWVzLmdldEVkZ2VUeXBlKGVkZ2UpO1xyXG4gICAgICAgICAgdmFyIHByZXZpb3VzQW5jaG9yc1Bvc2l0aW9uID0gYW5jaG9yUG9pbnRVdGlsaXRpZXMuZ2V0QW5jaG9yc0FzQXJyYXkoZWRnZSk7XHJcbiAgICAgICAgICB2YXIgbmV4dEFuY2hvcnNQb3NpdGlvbiA9IFtdO1xyXG4gICAgICAgICAgaWYgKHByZXZpb3VzQW5jaG9yc1Bvc2l0aW9uICE9IHVuZGVmaW5lZClcclxuICAgICAgICAgIHtcclxuICAgICAgICAgICAgICBmb3IgKHZhciBpPTA7IGk8cHJldmlvdXNBbmNob3JzUG9zaXRpb24ubGVuZ3RoOyBpKz0yKVxyXG4gICAgICAgICAgICAgIHtcclxuICAgICAgICAgICAgICAgICAgbmV4dEFuY2hvcnNQb3NpdGlvbi5wdXNoKHt4OiBwcmV2aW91c0FuY2hvcnNQb3NpdGlvbltpXStwb3NpdGlvbkRpZmYueCwgeTogcHJldmlvdXNBbmNob3JzUG9zaXRpb25baSsxXStwb3NpdGlvbkRpZmYueX0pO1xyXG4gICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICBlZGdlLmRhdGEoYW5jaG9yUG9pbnRVdGlsaXRpZXMuc3ludGF4W3R5cGVdWydwb2ludFBvcyddLCBuZXh0QW5jaG9yc1Bvc2l0aW9uKTtcclxuICAgICAgICAgIH1cclxuICAgICAgfSk7XHJcblxyXG4gICAgICBhbmNob3JQb2ludFV0aWxpdGllcy5pbml0QW5jaG9yUG9pbnRzKHBhcmFtcy5iZW5kUG9zaXRpb25zRnVuY3Rpb24sIHBhcmFtcy5jb250cm9sUG9zaXRpb25zRnVuY3Rpb24sIGVkZ2VzKTtcclxuICB9XHJcblxyXG4gIGZ1bmN0aW9uIHJlY29ubmVjdEVkZ2UocGFyYW0pe1xyXG4gICAgdmFyIGVkZ2UgICAgICA9IHBhcmFtLmVkZ2U7XHJcbiAgICB2YXIgbG9jYXRpb24gID0gcGFyYW0ubG9jYXRpb247XHJcbiAgICB2YXIgb2xkTG9jICAgID0gcGFyYW0ub2xkTG9jO1xyXG5cclxuICAgIGVkZ2UgPSBlZGdlLm1vdmUobG9jYXRpb24pWzBdO1xyXG5cclxuICAgIHZhciByZXN1bHQgPSB7XHJcbiAgICAgIGVkZ2U6ICAgICBlZGdlLFxyXG4gICAgICBsb2NhdGlvbjogb2xkTG9jLFxyXG4gICAgICBvbGRMb2M6ICAgbG9jYXRpb25cclxuICAgIH1cclxuICAgIGVkZ2UudW5zZWxlY3QoKTtcclxuICAgIHJldHVybiByZXN1bHQ7XHJcbiAgfVxyXG5cclxuICBmdW5jdGlvbiByZW1vdmVSZWNvbm5lY3RlZEVkZ2UocGFyYW0pe1xyXG4gICAgdmFyIG9sZEVkZ2UgPSBwYXJhbS5vbGRFZGdlO1xyXG4gICAgdmFyIHRtcCA9IGN5LmdldEVsZW1lbnRCeUlkKG9sZEVkZ2UuZGF0YSgnaWQnKSk7XHJcbiAgICBpZih0bXAgJiYgdG1wLmxlbmd0aCA+IDApXHJcbiAgICAgIG9sZEVkZ2UgPSB0bXA7XHJcblxyXG4gICAgdmFyIG5ld0VkZ2UgPSBwYXJhbS5uZXdFZGdlO1xyXG4gICAgdmFyIHRtcCA9IGN5LmdldEVsZW1lbnRCeUlkKG5ld0VkZ2UuZGF0YSgnaWQnKSk7XHJcbiAgICBpZih0bXAgJiYgdG1wLmxlbmd0aCA+IDApXHJcbiAgICAgIG5ld0VkZ2UgPSB0bXA7XHJcblxyXG4gICAgaWYob2xkRWRnZS5pbnNpZGUoKSl7XHJcbiAgICAgIG9sZEVkZ2UgPSBvbGRFZGdlLnJlbW92ZSgpWzBdO1xyXG4gICAgfSBcclxuICAgICAgXHJcbiAgICBpZihuZXdFZGdlLnJlbW92ZWQoKSl7XHJcbiAgICAgIG5ld0VkZ2UgPSBuZXdFZGdlLnJlc3RvcmUoKTtcclxuICAgICAgbmV3RWRnZS51bnNlbGVjdCgpO1xyXG4gICAgfVxyXG4gICAgXHJcbiAgICByZXR1cm4ge1xyXG4gICAgICBvbGRFZGdlOiBuZXdFZGdlLFxyXG4gICAgICBuZXdFZGdlOiBvbGRFZGdlXHJcbiAgICB9O1xyXG4gIH1cclxuXHJcbiAgdXIuYWN0aW9uKCdjaGFuZ2VBbmNob3JQb2ludHMnLCBjaGFuZ2VBbmNob3JQb2ludHMsIGNoYW5nZUFuY2hvclBvaW50cyk7XHJcbiAgdXIuYWN0aW9uKCdtb3ZlQW5jaG9yUG9pbnRzJywgbW92ZURvLCBtb3ZlRG8pO1xyXG4gIHVyLmFjdGlvbigncmVjb25uZWN0RWRnZScsIHJlY29ubmVjdEVkZ2UsIHJlY29ubmVjdEVkZ2UpO1xyXG4gIHVyLmFjdGlvbigncmVtb3ZlUmVjb25uZWN0ZWRFZGdlJywgcmVtb3ZlUmVjb25uZWN0ZWRFZGdlLCByZW1vdmVSZWNvbm5lY3RlZEVkZ2UpO1xyXG59O1xyXG4iXSwic291cmNlUm9vdCI6IiJ9