(function(f){if(typeof exports==="object"&&typeof module!=="undefined"){module.exports=f()}else if(typeof define==="function"&&define.amd){define([],f)}else{var g;if(typeof window!=="undefined"){g=window}else if(typeof global!=="undefined"){g=global}else if(typeof self!=="undefined"){g=self}else{g=this}g.cytoscapeEdgeEditing = f()}})(function(){var define,module,exports;return (function e(t,n,r){function s(o,u){if(!n[o]){if(!t[o]){var a=typeof require=="function"&&require;if(!u&&a)return a(o,!0);if(i)return i(o,!0);var f=new Error("Cannot find module '"+o+"'");throw f.code="MODULE_NOT_FOUND",f}var l=n[o]={exports:{}};t[o][0].call(l.exports,function(e){var n=t[o][1][e];return s(n?n:e)},l,l.exports,e,t,n,r)}return n[o].exports}var i=typeof require=="function"&&require;for(var o=0;o<r.length;o++)s(r[o]);return s})({1:[function(_dereq_,module,exports){
  var anchorPointUtilities = {
    currentCtxEdge: undefined,
    currentCtxPos: undefined,
    currentAnchorIndex: undefined,
    ignoredClasses: undefined,
    setIgnoredClasses: function(_ignoredClasses) {
      this.ignoredClasses = _ignoredClasses;
    },
    syntax: {
      bend: {
        edge: "segments",
        class: "edgebendediting-hasbendpoints",
        weight: "cyedgebendeditingWeights",
        distance: "cyedgebendeditingDistances",
        weightCss: "segment-weights",
        distanceCss: "segment-distances",
        pointPos: "bendPointPositions",
        was: "cyedgeeditingWasSegments" // special class to remember edges which were segments
      },
      control: {
        edge: "unbundled-bezier",
        class: "edgecontrolediting-hascontrolpoints",
        weight: "cyedgecontroleditingWeights",
        distance: "cyedgecontroleditingDistances",
        weightCss: "control-point-weights",
        distanceCss: "control-point-distances",
        pointPos: "controlPointPositions",
        was: "cyedgeeditingWasUnbundledBezier"
      }
    },
    // gets edge type as 'bend' or 'control'
    getEdgeType: function(edge){
      if(!edge)
        return 'inconclusive';
      else if(edge.hasClass(this.syntax['bend']['class']) || 
              edge.hasClass(this.syntax['bend']['was']) ||
              edge.data(this.syntax['bend']['pointPos']) ||
              edge.css('curve-style') === this.syntax['bend']['edge'])
        return 'bend';
      else if(edge.hasClass(this.syntax['control']['class']) || 
              edge.hasClass(this.syntax['control']['was']) ||
              edge.data(this.syntax['control']['pointPos']) ||
              edge.css('curve-style') === this.syntax['control']['edge'])
        return 'control';
      else
        return 'inconclusive';
    },
    // initilize anchor points based on bendPositionsFcn and controlPositionFcn
    initAnchorPoints: function(bendPositionsFcn, controlPositionsFcn, edges) {
      for (var i = 0; i < edges.length; i++) {
        var edge = edges[i];
        var type = this.getEdgeType(edge);
        
        if (type === 'inconclusive') { 
          continue; 
        }
  
        if(!this.isIgnoredEdge(edge)) {
  
          var anchorPositions;
  
          // get the anchor positions by applying the functions for this edge
          if(type === 'bend')
            anchorPositions = bendPositionsFcn.apply(this, edge);
          else if(type === 'control')
            anchorPositions = controlPositionsFcn.apply(this, edge);
  
          // calculate relative anchor positions
          var result = this.convertToRelativePositions(edge, anchorPositions);
  
          // if there are anchors set weights and distances accordingly and add class to enable style changes
          if (result.distances.length > 0) {
            edge.data(this.syntax[type]['weight'], result.weights);
            edge.data(this.syntax[type]['distance'], result.distances);
            edge.addClass(this.syntax[type]['class']);
          }
        }
      }
    },
  
    isIgnoredEdge: function(edge) {
  
      var startX = edge.source().position('x');
      var startY = edge.source().position('y');
      var endX = edge.target().position('x');
      var endY = edge.target().position('y');
     
      if((startX == endX && startY == endY)  || (edge.source().id() == edge.target().id())){
        return true;
      }
      for(var i = 0; this.ignoredClasses && i <  this.ignoredClasses.length; i++){
        if(edge.hasClass(this.ignoredClasses[i]))
          return true;
      }
      return false;
    },
    //Get the direction of the line from source point to the target point
    getLineDirection: function(srcPoint, tgtPoint){
      if(srcPoint.y == tgtPoint.y && srcPoint.x < tgtPoint.x){
        return 1;
      }
      if(srcPoint.y < tgtPoint.y && srcPoint.x < tgtPoint.x){
        return 2;
      }
      if(srcPoint.y < tgtPoint.y && srcPoint.x == tgtPoint.x){
        return 3;
      }
      if(srcPoint.y < tgtPoint.y && srcPoint.x > tgtPoint.x){
        return 4;
      }
      if(srcPoint.y == tgtPoint.y && srcPoint.x > tgtPoint.x){
        return 5;
      }
      if(srcPoint.y > tgtPoint.y && srcPoint.x > tgtPoint.x){
        return 6;
      }
      if(srcPoint.y > tgtPoint.y && srcPoint.x == tgtPoint.x){
        return 7;
      }
      return 8;//if srcPoint.y > tgtPoint.y and srcPoint.x < tgtPoint.x
    },
    getSrcTgtPointsAndTangents: function (edge) {
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
    getIntersection: function(edge, point, srcTgtPointsAndTangents){
      if (srcTgtPointsAndTangents === undefined) {
        srcTgtPointsAndTangents = this.getSrcTgtPointsAndTangents(edge);
      }
  
      var srcPoint = srcTgtPointsAndTangents.srcPoint;
      var tgtPoint = srcTgtPointsAndTangents.tgtPoint;
      var m1 = srcTgtPointsAndTangents.m1;
      var m2 = srcTgtPointsAndTangents.m2;
  
      var intersectX;
      var intersectY;
  
      if(m1 == Infinity || m1 == -Infinity){
        intersectX = srcPoint.x;
        intersectY = point.y;
      }
      else if(m1 == 0){
        intersectX = point.x;
        intersectY = srcPoint.y;
      }
      else {
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
    getAnchorsAsArray: function(edge) {
      var type = this.getEdgeType(edge);
  
      if(type === 'inconclusive'){
        return undefined;
      }
      
      if( edge.css('curve-style') !== this.syntax[type]['edge'] ) {
        return undefined;
      }
      
      var anchorList = [];
  
      var weights = edge.pstyle( this.syntax[type]['weightCss'] ).pfValue;
      var distances = edge.pstyle( this.syntax[type]['distanceCss'] ).pfValue;
      var minLengths = Math.min( weights.length, distances.length );
      
      var srcPos = edge.source().position();
      var tgtPos = edge.target().position();
  
      var dy = ( tgtPos.y - srcPos.y );
      var dx = ( tgtPos.x - srcPos.x );
      
      var l = Math.sqrt( dx * dx + dy * dy );
  
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
  
      for( var s = 0; s < minLengths; s++ ){
        var w = weights[ s ];
        var d = distances[ s ];
  
        var w1 = (1 - w);
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
  
        anchorList.push(
          adjustedMidpt.x + vectorNormInverse.x * d,
          adjustedMidpt.y + vectorNormInverse.y * d
        );
      }
      
      return anchorList;
    },
    convertToRelativePosition: function (edge, point, srcTgtPointsAndTangents) {
      if (srcTgtPointsAndTangents === undefined) {
        srcTgtPointsAndTangents = this.getSrcTgtPointsAndTangents(edge);
      }
      
      var intersectionPoint = this.getIntersection(edge, point, srcTgtPointsAndTangents);
      var intersectX = intersectionPoint.x;
      var intersectY = intersectionPoint.y;
      
      var srcPoint = srcTgtPointsAndTangents.srcPoint;
      var tgtPoint = srcTgtPointsAndTangents.tgtPoint;
      
      var weight;
      
      if( intersectX != srcPoint.x ) {
        weight = (intersectX - srcPoint.x) / (tgtPoint.x - srcPoint.x);
      }
      else if( intersectY != srcPoint.y ) {
        weight = (intersectY - srcPoint.y) / (tgtPoint.y - srcPoint.y);
      }
      else {
        weight = 0;
      }
      
      var distance = Math.sqrt(Math.pow((intersectY - point.y), 2)
          + Math.pow((intersectX - point.x), 2));
      
      //Get the direction of the line form source point to target point
      var direction1 = this.getLineDirection(srcPoint, tgtPoint);
      //Get the direction of the line from intesection point to the point
      var direction2 = this.getLineDirection(intersectionPoint, point);
      
      //If the difference is not -2 and not 6 then the direction of the distance is negative
      if(direction1 - direction2 != -2 && direction1 - direction2 != 6){
        if(distance != 0)
          distance = -1 * distance;
      }
      
      return {
        weight: weight,
        distance: distance
      };
    },
    convertToRelativePositions: function (edge, anchorPoints) {
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
    getDistancesString: function (edge, type) {
      var str = "";
  
      var distances = edge.data(this.syntax[type]['distance']);
      for (var i = 0; distances && i < distances.length; i++) {
        str = str + " " + distances[i];
      }
      
      return str;
    },
    getWeightsString: function (edge, type) {
      var str = "";
  
      var weights = edge.data(this.syntax[type]['weight']);
      for (var i = 0; weights && i < weights.length; i++) {
        str = str + " " + weights[i];
      }
      
      return str;
    },
    addAnchorPoint: function(edge, newAnchorPoint) {
      if(edge === undefined || newAnchorPoint === undefined){
        edge = this.currentCtxEdge;
        newAnchorPoint = this.currentCtxPos;
      }
    
      var type = this.getEdgeType(edge);
  
      if(type === 'inconclusive'){
        return;
      }
  
      var weightStr = this.syntax[type]['weight'];
      var distanceStr = this.syntax[type]['distance'];
  
      var relativePosition = this.convertToRelativePosition(edge, newAnchorPoint);
      var originalAnchorWeight = relativePosition.weight;
      
      var startX = edge.source().position('x');
      var startY = edge.source().position('y');
      var endX = edge.target().position('x');
      var endY = edge.target().position('y');
      var startWeight = this.convertToRelativePosition(edge, {x: startX, y: startY}).weight;
      var endWeight = this.convertToRelativePosition(edge, {x: endX, y: endY}).weight;
      var weightsWithTgtSrc = [startWeight].concat(edge.data(weightStr)?edge.data(weightStr):[]).concat([endWeight]);
      
      var anchorsList = this.getAnchorsAsArray(edge);
      
      var minDist = Infinity;
      var intersection;
      var ptsWithTgtSrc = [startX, startY]
              .concat(anchorsList?anchorsList:[])
              .concat([endX, endY]);
      var newAnchorIndex = -1;
      
      for(var i = 0; i < weightsWithTgtSrc.length - 1; i++){
        var w1 = weightsWithTgtSrc[i];
        var w2 = weightsWithTgtSrc[i + 1];
        
        //check if the weight is between w1 and w2
        const b1 = this.compareWithPrecision(originalAnchorWeight, w1, true);
        const b2 = this.compareWithPrecision(originalAnchorWeight, w2);
        const b3 = this.compareWithPrecision(originalAnchorWeight, w2, true);
        const b4 = this.compareWithPrecision(originalAnchorWeight, w1);
        if( (b1 && b2) || (b3 && b4)){
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
          
          var m1 = ( startY - endY ) / ( startX - endX );
          var m2 = -1 / m1;
          
          var srcTgtPointsAndTangents = {
            srcPoint: start,
            tgtPoint: end,
            m1: m1,
            m2: m2
          };
          
          var currentIntersection = this.getIntersection(edge, newAnchorPoint, srcTgtPointsAndTangents);
          var dist = Math.sqrt( Math.pow( (newAnchorPoint.x - currentIntersection.x), 2 ) 
                  + Math.pow( (newAnchorPoint.y - currentIntersection.y), 2 ));
          
          //Update the minimum distance
          if(dist < minDist){
            minDist = dist;
            intersection = currentIntersection;
            newAnchorIndex = i;
          }
        }
      }
      
      if(intersection !== undefined){
        newAnchorPoint = intersection;
      }
      
      relativePosition = this.convertToRelativePosition(edge, newAnchorPoint);
      
      if(intersection === undefined){
        relativePosition.distance = 0;
      }
  
      var weights = edge.data(weightStr);
      var distances = edge.data(distanceStr);
      
      weights = weights?weights:[];
      distances = distances?distances:[];
      
      if(weights.length === 0) {
        newAnchorIndex = 0;
      }
      
  //    weights.push(relativeBendPosition.weight);
  //    distances.push(relativeBendPosition.distance);
      if(newAnchorIndex != -1){
        weights.splice(newAnchorIndex, 0, relativePosition.weight);
        distances.splice(newAnchorIndex, 0, relativePosition.distance);
      }
     
      edge.data(weightStr, weights);
      edge.data(distanceStr, distances);
      
      edge.addClass(this.syntax[type]['class']);
      edge.removeClass(this.syntax[type]['was']);
      
      return newAnchorIndex;
    },
    removeAnchor: function(edge, anchorIndex){
      if(edge === undefined || anchorIndex === undefined){
        edge = this.currentCtxEdge;
        anchorIndex = this.currentAnchorIndex;
      }
      
      var type = this.getEdgeType(edge);
  
      if(this.edgeTypeInconclusiveShouldntHappen(type, "anchorPointUtilities.js, removeAnchor")){
        return;
      }
  
      var distanceStr = this.syntax[type]['weight'];
      var weightStr = this.syntax[type]['distance'];
  
      var distances = edge.data(distanceStr);
      var weights = edge.data(weightStr);
      
      distances.splice(anchorIndex, 1);
      weights.splice(anchorIndex, 1);
      
      // no more anchor points on edge
      if(distances.length == 0 || weights.length == 0){
        edge.removeClass(this.syntax[type]['class']);
        edge.addClass(this.syntax[type]['was']);
        edge.data(distanceStr, []);
        edge.data(weightStr, []);
      }
      else {
        edge.data(distanceStr, distances);
        edge.data(weightStr, weights);
      }
    },
    calculateDistance: function(pt1, pt2) {
      var diffX = pt1.x - pt2.x;
      var diffY = pt1.y - pt2.y;
      
      var dist = Math.sqrt( Math.pow( diffX, 2 ) + Math.pow( diffY, 2 ) );
      return dist;
    },
    /** (Less than or equal to) and (greater then equal to) comparisons with floating point numbers */
    compareWithPrecision: function (n1, n2, isLessThenOrEqual = false, precision = 0.01) {
      const diff = n1 - n2;
      if (Math.abs(diff) <= precision) {
        return true;
      }
      if (isLessThenOrEqual) {
        return n1 < n2;
      } else {
        return n1 > n2;
      }
    },
    edgeTypeInconclusiveShouldntHappen: function(type, place){
      if(type === 'inconclusive') {
        console.log(`In ${place}: edge type inconclusive should never happen here!!`);
        return true;
      }
      return false;
    }
  };
  
  module.exports = anchorPointUtilities;
  
  },{}],2:[function(_dereq_,module,exports){
  var debounce = _dereq_('./debounce');
  var anchorPointUtilities = _dereq_('./AnchorPointUtilities');
  var reconnectionUtilities = _dereq_('./reconnectionUtilities');
  var registerUndoRedoFunctions = _dereq_('./registerUndoRedoFunctions');
  
  module.exports = function (params, cy) {
    var fn = params;
  
    var addBendPointCxtMenuId = 'cy-edge-bend-editing-cxt-add-bend-point';
    var removeBendPointCxtMenuId = 'cy-edge-bend-editing-cxt-remove-bend-point';
    var addControlPointCxtMenuId = 'cy-edge-control-editing-cxt-add-control-point';
    var removeControlPointCxtMenuId = 'cy-edge-control-editing-cxt-remove-control-point';
    var eStyle, eRemove, eAdd, eZoom, eSelect, eUnselect, eTapStart, eTapStartOnEdge, eTapDrag, eTapEnd, eCxtTap, eDrag;
    // last status of gestures
    var lastPanningEnabled, lastZoomingEnabled, lastBoxSelectionEnabled;
    var lastActiveBgOpacity;
    // status of edge to highlight bends and selected edges
    var edgeToHighlight, numberOfSelectedEdges;
  
    // the Kanva.shape() for the endpoints
    var endpointShape1 = null, endpointShape2 = null;
    // used to stop certain cy listeners when interracting with anchors
    var anchorTouched = false;
    // used call eMouseDown of anchorManager if the mouse is out of the content on cy.on(tapend)
    var mouseOut;
    
    var functions = {
      init: function () {
        // register undo redo functions
        registerUndoRedoFunctions(cy, anchorPointUtilities, params);
        
        var self = this;
        var opts = params;
        var $container = $(this);
        
        var canvasElementId = 'cy-edge-editing-stage';
        var $canvasElement = $('<div id="' + canvasElementId + '"></div>');
        $container.append($canvasElement);
  
        var stage = new Konva.Stage({
            container: canvasElementId,   // id of container <div>
            width: $container.width(),
            height: $container.height()
        });
  
        // then create layer
        var canvas = new Konva.Layer();
        // add the layer to the stage
        stage.add(canvas);
  
        var anchorManager = {
          edge: undefined,
          edgeType: 'inconclusive',
          anchors: [],
          // remembers the touched anchor to avoid clearing it when dragging happens
          touchedAnchor: undefined,
          // remembers the index of the moving anchor
          touchedAnchorIndex: undefined,
          bindListeners: function(anchor){
            anchor.on("mousedown touchstart", this.eMouseDown);
          },
          unbindListeners: function(anchor){
            anchor.off("mousedown touchstart", this.eMouseDown);
          },
          // gets trigger on clicking on context menus, while cy listeners don't get triggered
          // it can cause weird behaviour if not aware of this
          eMouseDown: function(event){
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
          eMouseUp: function(event){
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
          eMouseOut: function (event){
            mouseOut = true;
          },
          clearAnchorsExcept: function(dontClean = undefined){
            var exceptionApplies = false;
  
            this.anchors.forEach((anchor, index) => {
              if(dontClean && anchor === dontClean){
                exceptionApplies = true; // the dontClean anchor is not cleared
                return;
              }
  
              this.unbindListeners(anchor);
              anchor.destroy();
            });
  
            if(exceptionApplies){
              this.anchors = [dontClean];
            }
            else {
              this.anchors = [];
              this.edge = undefined;
              this.edgeType = 'inconclusive';
            }
          },
          // render the bend and control shapes of the given edge
          renderAnchorShapes: function(edge) {
            this.edge = edge;
            this.edgeType = anchorPointUtilities.getEdgeType(edge);
  
            if(!edge.hasClass('edgebendediting-hasbendpoints') &&
                !edge.hasClass('edgecontrolediting-hascontrolpoints')) {
              return;
            }
            
            var anchorList = anchorPointUtilities.getAnchorsAsArray(edge);//edge._private.rdata.segpts;
            var length = getAnchorShapesLength(edge) * 0.65;
            
            var srcPos = edge.source().position();
            var tgtPos = edge.target().position();
  
            for(var i = 0; anchorList && i < anchorList.length; i = i + 2){
              var anchorX = anchorList[i];
              var anchorY = anchorList[i + 1];
  
              this.renderAnchorShape(anchorX, anchorY, length);
            }
  
            canvas.draw();
          },
          // render a anchor shape with the given parameters
          renderAnchorShape: function(anchorX, anchorY, length) {
            // get the top left coordinates
            var topLeftX = anchorX - length / 2;
            var topLeftY = anchorY - length / 2;
            
            // convert to rendered parameters
            var renderedTopLeftPos = convertToRenderedPosition({x: topLeftX, y: topLeftY});
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
  
        var cxtAddAnchorFcn = function (event) {
          var edge = event.target || event.cyTarget;
          if(!anchorPointUtilities.isIgnoredEdge(edge)) {
  
            var type = anchorPointUtilities.getEdgeType(edge);
  
            if(anchorPointUtilities.edgeTypeInconclusiveShouldntHappen(type, "UiUtilities.js, cxtAddAnchorFcn")){
              return;
            }
  
            var weightStr = anchorPointUtilities.syntax[type]['weight'];
            var distanceStr = anchorPointUtilities.syntax[type]['distance'];
  
            var param = {
              edge: edge,
              weights: edge.data(weightStr) ? [].concat(edge.data(weightStr)) : edge.data(weightStr),
              distances: edge.data(distanceStr) ? [].concat(edge.data(distanceStr)) : edge.data(distanceStr)
            };
  
            anchorPointUtilities.addAnchorPoint();
  
            if (options().undoable) {
              cy.undoRedo().do('changeAnchorPoints', param);
            }
          }
  
          refreshDraws();
          edge.select();
        };
  
        var cxtRemoveAnchorFcn = function (event) {
          var edge = anchorManager.edge;
          var type = anchorPointUtilities.getEdgeType(edge);
  
          if(anchorPointUtilities.edgeTypeInconclusiveShouldntHappen(type, "UiUtilities.js, cxtRemoveAnchorFcn")){
            return;
          }
  
          var param = {
            edge: edge,
            weights: [].concat(edge.data(anchorPointUtilities.syntax[type]['weight'])),
            distances: [].concat(edge.data(anchorPointUtilities.syntax[type]['distance']))
          };
  
          anchorPointUtilities.removeAnchor();
          
          if(options().undoable) {
            cy.undoRedo().do('changeAnchorPoints', param);
          }
          
          setTimeout(function(){refreshDraws();edge.select();}, 50) ;
  
        };
        
        // function to reconnect edge
        var handleReconnectEdge = opts.handleReconnectEdge;
        // function to validate edge source and target on reconnection
        var validateEdge = opts.validateEdge; 
        // function to be called on invalid edge reconnection
        var actOnUnsuccessfulReconnection = opts.actOnUnsuccessfulReconnection;
        
        var menuItems = [
          {
            id: addBendPointCxtMenuId,
            title: opts.addBendMenuItemTitle,
            content: 'Add Bend Point',
            selector: 'edge',
            onClickFunction: cxtAddAnchorFcn
          },
          {
            id: removeBendPointCxtMenuId,
            title: opts.removeBendMenuItemTitle,
            content: 'Remove Bend Point',
            selector: 'edge',
            onClickFunction: cxtRemoveAnchorFcn
          },
          {
            id: addControlPointCxtMenuId,
            title: opts.addControlMenuItemTitle,
            content: 'Add Control Point',
            selector: 'edge',
            coreAsWell: true,
            onClickFunction: cxtAddAnchorFcn
          },
          {
            id: removeControlPointCxtMenuId,
            title: opts.removeControlMenuItemTitle,
            content: 'Remove Control Point',
            selector: 'edge',
            coreAsWell: true,
            onClickFunction: cxtRemoveAnchorFcn
          }
        ];
        
        if(cy.contextMenus) {
          var menus = cy.contextMenus('get');
          // If context menus is active just append menu items else activate the extension
          // with initial menu items
          if (menus.isActive()) {
            menus.appendMenuItems(menuItems);
          }
          else {
            cy.contextMenus({
              menuItems: menuItems
            });
          }
        }
        
        var _sizeCanvas = debounce(function () {
          $canvasElement
            .attr('height', $container.height())
            .attr('width', $container.width())
            .css({
              'position': 'absolute',
              'top': 0,
              'left': 0,
              'z-index': options().zIndex
            })
          ;
  
          setTimeout(function () {
            var canvasBb = $canvasElement.offset();
            var containerBb = $container.offset();
  
            $canvasElement
              .css({
                'top': -(canvasBb.top - containerBb.top),
                'left': -(canvasBb.left - containerBb.left)
              })
            ;
  
            canvas.getStage().setWidth($container.width());
            canvas.getStage().setHeight($container.height());
  
            // redraw on canvas resize
            if(cy){
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
          
          if(endpointShape1 !== null){
            endpointShape1.destroy();
            endpointShape1 = null;
          }
          if(endpointShape2 !== null){
            endpointShape2.destroy();
            endpointShape2 = null;
          }
          canvas.draw();
  
          if( edgeToHighlight ) {
            anchorManager.renderAnchorShapes(edgeToHighlight);
            renderEndPointShapes(edgeToHighlight);
          }
        }
        
        // render the end points shapes of the given edge
        function renderEndPointShapes(edge) {
          if(!edge){
            return;
          }
  
          var edge_pts = anchorPointUtilities.getAnchorsAsArray(edge);
          if(typeof edge_pts === 'undefined'){
            edge_pts = [];
          }       
          var sourcePos = edge.sourceEndpoint();
          var targetPos = edge.targetEndpoint();
          edge_pts.unshift(sourcePos.y);
          edge_pts.unshift(sourcePos.x);
          edge_pts.push(targetPos.x);
          edge_pts.push(targetPos.y); 
  
         
          if(!edge_pts)
            return;
  
          var src = {
            x: edge_pts[0],
            y: edge_pts[1]
          }
  
          var target = {
            x: edge_pts[edge_pts.length-2],
            y: edge_pts[edge_pts.length-1]
          }
  
          var nextToSource = {
            x: edge_pts[2],
            y: edge_pts[3]
          }
          var nextToTarget = {
            x: edge_pts[edge_pts.length-4],
            y: edge_pts[edge_pts.length-3]
          }
          var length = getAnchorShapesLength(edge) * 0.65;
          
          renderEachEndPointShape(src, target, length,nextToSource,nextToTarget);
          
        }
  
        function renderEachEndPointShape(source, target, length,nextToSource,nextToTarget) {
          // get the top left coordinates of source and target
          var sTopLeftX = source.x - length / 2;
          var sTopLeftY = source.y - length / 2;
  
          var tTopLeftX = target.x - length / 2;
          var tTopLeftY = target.y - length / 2;
  
          var nextToSourceX = nextToSource.x - length /2;
          var nextToSourceY = nextToSource.y - length / 2;
  
          var nextToTargetX = nextToTarget.x - length /2;
          var nextToTargetY = nextToTarget.y - length /2;
  
  
          // convert to rendered parameters
          var renderedSourcePos = convertToRenderedPosition({x: sTopLeftX, y: sTopLeftY});
          var renderedTargetPos = convertToRenderedPosition({x: tTopLeftX, y: tTopLeftY});
          length = length * cy.zoom() / 2;
  
          var renderedNextToSource = convertToRenderedPosition({x: nextToSourceX, y: nextToSourceY});
          var renderedNextToTarget = convertToRenderedPosition({x: nextToTargetX, y: nextToTargetY});
          
          //how far to go from the node along the edge
          var distanceFromNode = length;
  
          var distanceSource = Math.sqrt(Math.pow(renderedNextToSource.x - renderedSourcePos.x,2) + Math.pow(renderedNextToSource.y - renderedSourcePos.y,2));        
          var sourceEndPointX = renderedSourcePos.x + ((distanceFromNode/ distanceSource)* (renderedNextToSource.x - renderedSourcePos.x));
          var sourceEndPointY = renderedSourcePos.y + ((distanceFromNode/ distanceSource)* (renderedNextToSource.y - renderedSourcePos.y));
  
  
          var distanceTarget = Math.sqrt(Math.pow(renderedNextToTarget.x - renderedTargetPos.x,2) + Math.pow(renderedNextToTarget.y - renderedTargetPos.y,2));        
          var targetEndPointX = renderedTargetPos.x + ((distanceFromNode/ distanceTarget)* (renderedNextToTarget.x - renderedTargetPos.x));
          var targetEndPointY = renderedTargetPos.y + ((distanceFromNode/ distanceTarget)* (renderedNextToTarget.y - renderedTargetPos.y)); 
  
          // render end point shape for source and target
          endpointShape1 = new Konva.Circle({
            x: sourceEndPointX + length,
            y: sourceEndPointY + length,
            radius: length,
            fill: 'black',
          });
  
          endpointShape2 = new Konva.Circle({
            x: targetEndPointX + length,
            y: targetEndPointY + length,
            radius: length,
            fill: 'black',
          });
  
          canvas.add(endpointShape1);
          canvas.add(endpointShape2);
          canvas.draw();
          
        }
  
        // get the length of anchor points to be rendered
        function getAnchorShapesLength(edge) {
          var factor = options().anchorShapeSizeFactor;
          if (parseFloat(edge.css('width')) <= 2.5)
            return 2.5 * factor;
          else return parseFloat(edge.css('width'))*factor;
        }
        
        // check if the anchor represented by {x, y} is inside the point shape
        function checkIfInsideShape(x, y, length, centerX, centerY){
          var minX = centerX - length / 2;
          var maxX = centerX + length / 2;
          var minY = centerY - length / 2;
          var maxY = centerY + length / 2;
          
          var inside = (x >= minX && x <= maxX) && (y >= minY && y <= maxY);
          return inside;
        }
  
        // get the index of anchor containing the point represented by {x, y}
        function getContainingShapeIndex(x, y, edge) {
          var type = anchorPointUtilities.getEdgeType(edge);
  
          if(type === 'inconclusive'){
            return -1;
          }
  
          if(edge.data(anchorPointUtilities.syntax[type]['weight']) == null || 
            edge.data(anchorPointUtilities.syntax[type]['weight']).length == 0){
            return -1;
          }
  
          var anchorList = anchorPointUtilities.getAnchorsAsArray(edge);//edge._private.rdata.segpts;
          var length = getAnchorShapesLength(edge);
  
          for(var i = 0; anchorList && i < anchorList.length; i = i + 2){
            var anchorX = anchorList[i];
            var anchorY = anchorList[i + 1];
  
            var inside = checkIfInsideShape(x, y, length, anchorX, anchorY);
            if(inside){
              return i / 2;
            }
          }
  
          return -1;
        };
  
        function getContainingEndPoint(x, y, edge){
          var length = getAnchorShapesLength(edge);
          var allPts = edge._private.rscratch.allpts;
          var src = {
            x: allPts[0],
            y: allPts[1]
          }
          var target = {
            x: allPts[allPts.length-2],
            y: allPts[allPts.length-1]
          }
          convertToRenderedPosition(src);
          convertToRenderedPosition(target);
          
          // Source:0, Target:1, None:-1
          if(checkIfInsideShape(x, y, length, src.x, src.y))
            return 0;
          else if(checkIfInsideShape(x, y, length, target.x, target.y))
            return 1;
          else
            return -1;
        }
        
        // store the current status of gestures and set them to false
        function disableGestures() {
          lastPanningEnabled = cy.panningEnabled();
          lastZoomingEnabled = cy.zoomingEnabled();
          lastBoxSelectionEnabled = cy.boxSelectionEnabled();
  
          cy.zoomingEnabled(false)
            .panningEnabled(false)
            .boxSelectionEnabled(false);
        }
        
        // reset the gestures by their latest status
        function resetGestures() {
          cy.zoomingEnabled(lastZoomingEnabled)
            .panningEnabled(lastPanningEnabled)
            .boxSelectionEnabled(lastBoxSelectionEnabled);
        }
  
        function turnOffActiveBgColor(){
          // found this at the cy-node-resize code, but doesn't seem to find the object most of the time
          if( cy.style()._private.coreStyle["active-bg-opacity"]) {
            lastActiveBgOpacity = cy.style()._private.coreStyle["active-bg-opacity"].value;
          }
          else {
            // arbitrary, feel free to change
            // trial and error showed that 0.15 was closest to the old color
            lastActiveBgOpacity = 0.15;
          }
  
          cy.style()
            .selector("core")
            .style("active-bg-opacity", 0)
            .update();
        }
  
        function resetActiveBgColor(){
          cy.style()
            .selector("core")
            .style("active-bg-opacity", lastActiveBgOpacity)
            .update();
        }
  
        function moveAnchorPoints(positionDiff, edges) {
            edges.forEach(function( edge ){
                var previousAnchorsPosition = anchorPointUtilities.getAnchorsAsArray(edge);
                var nextAnchorPointsPosition = [];
                if (previousAnchorsPosition != undefined)
                {
                  for (i=0; i<previousAnchorsPosition.length; i+=2)
                  {
                      nextAnchorPointsPosition.push({x: previousAnchorsPosition[i]+positionDiff.x, y: previousAnchorsPosition[i+1]+positionDiff.y});
                  }
                  var type = anchorPointUtilities.getEdgeType(edge);
  
                  if(anchorPointUtilities.edgeTypeInconclusiveShouldntHappen(type, "UiUtilities.js, moveAnchorPoints")){
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
  
        function moveAnchorOnDrag(edge, type, index, position){
          var weights = edge.data(anchorPointUtilities.syntax[type]['weight']);
          var distances = edge.data(anchorPointUtilities.syntax[type]['distance']);
          
          var relativeAnchorPosition = anchorPointUtilities.convertToRelativePosition(edge, position);
          weights[index] = relativeAnchorPosition.weight;
          distances[index] = relativeAnchorPosition.distance;
          
          edge.data(anchorPointUtilities.syntax[type]['weight'], weights);
          edge.data(anchorPointUtilities.syntax[type]['distance'], distances);
        }
  
        // debounced due to large amout of calls to tapdrag
        var _moveAnchorOnDrag = debounce( moveAnchorOnDrag, 5);
  
        {  
          lastPanningEnabled = cy.panningEnabled();
          lastZoomingEnabled = cy.zoomingEnabled();
          lastBoxSelectionEnabled = cy.boxSelectionEnabled();
          
          // Initilize the edgeToHighlightBends and numberOfSelectedEdges
          {
            var selectedEdges = cy.edges(':selected');
            var numberOfSelectedEdges = selectedEdges.length;
            
            if ( numberOfSelectedEdges === 1 ) {
              edgeToHighlight = selectedEdges[0];
            }
          }
          
          cy.bind('zoom pan', eZoom = function () {
            if ( !edgeToHighlight ) {
              return;
            }
            
            refreshDraws();
          });
  
          // cy.off is never called on this listener
          cy.on('data', 'edge',  function () {
            if ( !edgeToHighlight ) {
              return;
            }
            
            refreshDraws();
          });
  
          cy.on('style', 'edge.edgebendediting-hasbendpoints:selected, edge.edgecontrolediting-hascontrolpoints:selected', eStyle = function () {
            refreshDraws();
          });
  
          cy.on('remove', 'edge', eRemove = function () {
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
                }
                else {
                  edgeToHighlight = undefined;
                }
              }
              else {
                edgeToHighlight = undefined;
              }
              
              cy.endBatch();
            }
            refreshDraws();
          });
          
           cy.on('add', 'edge', eAdd = function () {
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
              }
              else {
                edgeToHighlight = undefined;
              }
              
              cy.endBatch();
            }
            refreshDraws();
          });
          
          cy.on('select', 'edge', eSelect = function () {
            var edge = this;
  
            if(edge.target().connectedEdges().length == 0 || edge.source().connectedEdges().length == 0){
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
            }
            else {
              edgeToHighlight = undefined;
            }
            
            cy.endBatch();
            refreshDraws();
          });
          
          cy.on('unselect', 'edge', eUnselect = function () {
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
              }
              else {
                edgeToHighlight = undefined;
              }
            }
            else {
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
  
          cy.on('tapstart', eTapStart = function(event) {
            cy.autounselectify(false);
            tapStartPos = event.position || event.cyPosition;
          });
  
          cy.on('tapstart', 'edge', eTapStartOnEdge = function (event) {
            var edge = this;
  
            if (!edgeToHighlight || edgeToHighlight.id() !== edge.id()) {
              createAnchorOnDrag = false;
              return;
            }
            
            movedEdge = edge;
  
            var type = anchorPointUtilities.getEdgeType(edge);
  
            // to avoid errors
            if(type === 'inconclusive')
              type = 'bend';
            
            var cyPosX = tapStartPos.x;
            var cyPosY = tapStartPos.y;
            
            // Get which end point has been clicked (Source:0, Target:1, None:-1)
            var endPoint = getContainingEndPoint(cyPosX, cyPosY, edge);
  
            if(endPoint == 0 || endPoint == 1){
              edge.unselect();
              movedEndPoint = endPoint;
              detachedNode = (endPoint == 0) ? movedEdge.source() : movedEdge.target();
  
              var disconnectedEnd = (endPoint == 0) ? 'source' : 'target';
              var result = reconnectionUtilities.disconnectEdge(movedEdge, cy, event.renderedPosition, disconnectedEnd);
              
              dummyNode = result.dummyNode;
              movedEdge = result.edge;
  
              disableGestures();
            }
            else {
              movedAnchorIndex = undefined;
              createAnchorOnDrag = true;
            }
          });
          
          cy.on('drag', 'node', eDrag = function (event) {
            var node = this;
            cy.edges().unselect();
            if(!node.selected()){
              cy.nodes().unselect();
            }         
          });
          cy.on('tapdrag', eTapDrag = function (event) {
            cy.autounselectify(false);
            var edge = movedEdge;
  
            if(movedEdge !== undefined && anchorPointUtilities.isIgnoredEdge(edge) ) {
              return;
            }
  
            var type = anchorPointUtilities.getEdgeType(edge);
  
            if(createAnchorOnDrag && !anchorTouched && type !== 'inconclusive') {
              // remember state before creating anchor
              var weightStr = anchorPointUtilities.syntax[type]['weight'];
              var distanceStr = anchorPointUtilities.syntax[type]['distance'];
  
              moveAnchorParam = {
                edge: edge,
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
            if (!anchorTouched && (movedEdge === undefined || 
              (movedAnchorIndex === undefined && movedEndPoint === undefined))) {
              return;
            }
  
            var eventPos = event.position || event.cyPosition;
  
            // Update end point location (Source:0, Target:1)
            if(movedEndPoint != -1 && dummyNode){
              dummyNode.position(eventPos);
            }
            // change location of anchor created by drag
            else if(movedAnchorIndex != undefined){
              _moveAnchorOnDrag(edge, type, movedAnchorIndex, eventPos);
            }
            // change location of drag and dropped anchor
            else if(anchorTouched){
  
              // the tapStartPos check is necessary when righ clicking anchor points
              // right clicking anchor points triggers MouseDown for Konva, but not tapstart for cy
              // when that happens tapStartPos is undefined
              if(anchorManager.touchedAnchorIndex === undefined && tapStartPos){
                anchorManager.touchedAnchorIndex = getContainingShapeIndex(
                  tapStartPos.x, 
                  tapStartPos.y,
                  anchorManager.edge);
              }
  
              if(anchorManager.touchedAnchorIndex !== undefined){
                _moveAnchorOnDrag(
                  anchorManager.edge,
                  anchorManager.edgeType,
                  anchorManager.touchedAnchorIndex,
                  eventPos
                );
              }
            }
            
            if(event.target && event.target[0] && event.target.isNode()){
              nodeToAttach = event.target;
            }
  
          });
          
          cy.on('tapend', eTapEnd = function (event) {
  
            if(mouseOut){
              canvas.getStage().fire("contentMouseup");
            }
  
            var edge = movedEdge || anchorManager.edge; 
            
            if( edge !== undefined ) {
              var index = anchorManager.touchedAnchorIndex;
              if( index != undefined ) {
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
                
                if( ( anchor.x === preAnchorPoint.x && anchor.y === preAnchorPoint.y ) || ( anchor.x === preAnchorPoint.x && anchor.y === preAnchorPoint.y ) ) {
                  nearToLine = true;
                }
                else {
                  var m1 = ( preAnchorPoint.y - posAnchorPoint.y ) / ( preAnchorPoint.x - posAnchorPoint.x );
                  var m2 = -1 / m1;
  
                  var srcTgtPointsAndTangents = {
                    srcPoint: preAnchorPoint,
                    tgtPoint: posAnchorPoint,
                    m1: m1,
                    m2: m2
                  };
  
                  var currentIntersection = anchorPointUtilities.getIntersection(edge, anchor, srcTgtPointsAndTangents);
                  var dist = Math.sqrt( Math.pow( (anchor.x - currentIntersection.x), 2 ) 
                          + Math.pow( (anchor.y - currentIntersection.y), 2 ));
                  
                  // remove the bend point if segment edge becomes straight
                  var type = anchorPointUtilities.getEdgeType(edge);
                  if( (type === 'bend' && dist  < options().bendRemovalSensitivity)) {
                    nearToLine = true;
                  }
                  
                }
                
                if( nearToLine )
                {
                  anchorPointUtilities.removeAnchor(edge, index);
                }
                
              }
              else if(dummyNode != undefined && (movedEndPoint == 0 || movedEndPoint == 1) ){
                
                var newNode = detachedNode;
                var isValid = 'valid';
                var location = (movedEndPoint == 0) ? 'source' : 'target';
  
                // validate edge reconnection
                if(nodeToAttach){
                  var newSource = (movedEndPoint == 0) ? nodeToAttach : edge.source();
                  var newTarget = (movedEndPoint == 1) ? nodeToAttach : edge.target();
                  if(typeof validateEdge === "function")
                    isValid = validateEdge(edge, newSource, newTarget);
                  newNode = (isValid === 'valid') ? nodeToAttach : detachedNode;
                }
  
                var newSource = (movedEndPoint == 0) ? newNode : edge.source();
                var newTarget = (movedEndPoint == 1) ? newNode : edge.target();
                edge = reconnectionUtilities.connectEdge(edge, detachedNode, location);
  
                if(detachedNode.id() !== newNode.id()){
                  // use given handleReconnectEdge function 
                  if(typeof handleReconnectEdge === 'function'){
                    var reconnectedEdge = handleReconnectEdge(newSource.id(), newTarget.id(), edge.data());
                    
                    if(reconnectedEdge){
                      reconnectionUtilities.copyEdge(edge, reconnectedEdge);
                      anchorPointUtilities.initAnchorPoints(options().bendPositionsFunction, 
                                                options().controlPositionsFunction, [reconnectedEdge]);
                    }
                    
                    if(reconnectedEdge && options().undoable){
                      var params = {
                        newEdge: reconnectedEdge,
                        oldEdge: edge
                      };
                      cy.undoRedo().do('removeReconnectedEdge', params);
                      edge = reconnectedEdge;
                    }
                    else if(reconnectedEdge){
                      cy.remove(edge);
                      edge = reconnectedEdge;
                    }
                  }
                  else{
                    var loc = (movedEndPoint == 0) ? {source: newNode.id()} : {target: newNode.id()};
                    var oldLoc = (movedEndPoint == 0) ? {source: detachedNode.id()} : {target: detachedNode.id()};
                    
                    if(options().undoable && newNode.id() !== detachedNode.id()) {
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
                if(isValid !== 'valid' && typeof actOnUnsuccessfulReconnection === 'function'){
                  actOnUnsuccessfulReconnection();
                }
                edge.select();
                cy.remove(dummyNode);
              }
            }
            var type = anchorPointUtilities.getEdgeType(edge);
  
            // to avoid errors
            if(type === 'inconclusive'){
              type = 'bend';
            }
  
            if(anchorManager.touchedAnchorIndex === undefined && !anchorCreatedByDrag){
              moveAnchorParam = undefined;
            }
  
            var weightStr = anchorPointUtilities.syntax[type]['weight'];
            if (edge !== undefined && moveAnchorParam !== undefined && edge.data(weightStr)
            && edge.data(weightStr).toString() != moveAnchorParam.weights.toString()) {
              
              // anchor created from drag
              if(anchorCreatedByDrag){
              edge.select(); 
  
              // stops the unbundled bezier edges from being unselected
              cy.autounselectify(true);
              }
  
              if(options().undoable) {
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
            setTimeout(function(){refreshDraws()}, 50);
          });
  
          //Variables used for starting and ending the movement of anchor points with arrows
          var moveanchorparam;
          var firstAnchor;
          var edgeContainingFirstAnchor;
          var firstAnchorPointFound;
          cy.on("edgeediting.movestart", function (e, edges) {
              firstAnchorPointFound = false;
              if (edges[0] != undefined)
              {
                  edges.forEach(function( edge ){
                    if (anchorPointUtilities.getAnchorsAsArray(edge) != undefined && !firstAnchorPointFound)
                    {
                        firstAnchor = { x: anchorPointUtilities.getAnchorsAsArray(edge)[0], y: anchorPointUtilities.getAnchorsAsArray(edge)[1]};
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
              if (moveanchorparam != undefined)
              {
                  var initialPos = moveanchorparam.firstAnchorPosition;
                  var movedFirstAnchor = {
                      x: anchorPointUtilities.getAnchorsAsArray(edgeContainingFirstAnchor)[0],
                      y: anchorPointUtilities.getAnchorsAsArray(edgeContainingFirstAnchor)[1]
                  };
  
  
                  moveanchorparam.positionDiff = {
                      x: -movedFirstAnchor.x + initialPos.x,
                      y: -movedFirstAnchor.y + initialPos.y
                  }
  
                  delete moveanchorparam.firstAnchorPosition;
  
                  if(options().undoable) {
                      cy.undoRedo().do("moveAnchorPoints", moveanchorparam);
                  }
  
                  moveanchorparam = undefined;
              }
          });
  
          cy.on('cxttap', eCxtTap = function (event) {
            var edge = anchorManager.edge;          
            var type = anchorManager.edgeType;
  
            var menus = cy.contextMenus('get'); // get context menus instance
            
            if(!edgeToHighlight || edgeToHighlight.id() != edge.id() || anchorPointUtilities.isIgnoredEdge(edge)) {
              menus.hideMenuItem(removeBendPointCxtMenuId);
              menus.hideMenuItem(addBendPointCxtMenuId);
              menus.hideMenuItem(removeControlPointCxtMenuId);
              menus.hideMenuItem(addControlPointCxtMenuId);
              return;
            }
  
            var cyPos = event.position || event.cyPosition;
            var selectedIndex = getContainingShapeIndex(cyPos.x, cyPos.y, edge);
            if (selectedIndex == -1) {
              menus.hideMenuItem(removeBendPointCxtMenuId);
              menus.hideMenuItem(removeControlPointCxtMenuId);
              if(type === 'control'){
                menus.showMenuItem(addControlPointCxtMenuId);
                menus.hideMenuItem(addBendPointCxtMenuId);
              }
              else if(type === 'bend'){
                menus.showMenuItem(addBendPointCxtMenuId);
                menus.hideMenuItem(addControlPointCxtMenuId);
              }
              else{
                menus.hideMenuItem(addBendPointCxtMenuId);
                menus.hideMenuItem(addControlPointCxtMenuId);
              }
              anchorPointUtilities.currentCtxPos = cyPos;
            }
            else {
              menus.hideMenuItem(addBendPointCxtMenuId);
              menus.hideMenuItem(addControlPointCxtMenuId);
              if(type === 'control'){
                menus.showMenuItem(removeControlPointCxtMenuId);
                menus.hideMenuItem(removeBendPointCxtMenuId);
              }
              else if(type === 'bend'){
                menus.showMenuItem(removeBendPointCxtMenuId);
                menus.hideMenuItem(removeControlPointCxtMenuId);
              }
              else{
                menus.hideMenuItem(removeBendPointCxtMenuId);
                menus.hideMenuItem(removeControlPointCxtMenuId);
              }
              anchorPointUtilities.currentAnchorIndex = selectedIndex;
            }
  
            anchorPointUtilities.currentCtxEdge = edge;
          });
          
          cy.on('cyedgeediting.changeAnchorPoints', 'edge', function() {
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
  
        function keyDown(e) {
          cy.autounselectify(false);
  
            var shouldMove = typeof options().moveSelectedAnchorsOnKeyEvents === 'function'
                ? options().moveSelectedAnchorsOnKeyEvents() : options().moveSelectedAnchorsOnKeyEvents;
  
            if (!shouldMove) {
                return;
            }
  
            //Checks if the tagname is textarea or input
            var tn = document.activeElement.tagName;
            if (tn != "TEXTAREA" && tn != "INPUT")
            {
                switch(e.keyCode){
                    case 37: case 39: case 38:  case 40: // Arrow keys
                    case 32: e.preventDefault(); break; // Space
                    default: break; // do not block other keys
                }
  
  
                if (e.keyCode < '37' || e.keyCode > '40') {
                    return;
                }
  
                //Checks if only edges are selected (not any node) and if only 1 edge is selected
                //If the second checking is removed the anchors of multiple edges would move
                if (cy.edges(":selected").length != cy.elements(":selected").length || cy.edges(":selected").length != 1)
                {
                  return;
                }
  
                if (!anchorsMoving)
                {
                    selectedEdges = cy.edges(':selected');
                    cy.trigger("edgeediting.movestart", [selectedEdges]);
                    anchorsMoving = true;
                }
                if (e.altKey && e.which == '38') {
                    // up arrow and alt
                    moveAnchorPoints ({x:0, y:-1},selectedEdges);
                }
                else if (e.altKey && e.which == '40') {
                    // down arrow and alt
                    moveAnchorPoints ({x:0, y:1},selectedEdges);
                }
                else if (e.altKey && e.which == '37') {
                    // left arrow and alt
                    moveAnchorPoints ({x:-1, y:0},selectedEdges);
                }
                else if (e.altKey && e.which == '39') {
                    // right arrow and alt
                    moveAnchorPoints ({x:1, y:0},selectedEdges);
                }
  
                else if (e.shiftKey && e.which == '38') {
                    // up arrow and shift
                    moveAnchorPoints ({x:0, y:-10},selectedEdges);
                }
                else if (e.shiftKey && e.which == '40') {
                    // down arrow and shift
                    moveAnchorPoints ({x:0, y:10},selectedEdges);
                }
                else if (e.shiftKey && e.which == '37') {
                    // left arrow and shift
                    moveAnchorPoints ({x:-10, y:0},selectedEdges);
  
                }
                else if (e.shiftKey && e.which == '39' ) {
                    // right arrow and shift
                    moveAnchorPoints ({x:10, y:0},selectedEdges);
                }
                else if (e.keyCode == '38') {
                    // up arrow
                    moveAnchorPoints({x: 0, y: -3}, selectedEdges);
                }
  
                else if (e.keyCode == '40') {
                    // down arrow
                    moveAnchorPoints ({x:0, y:3},selectedEdges);
                }
                else if (e.keyCode == '37') {
                    // left arrow
                    moveAnchorPoints ({x:-3, y:0},selectedEdges);
                }
                else if (e.keyCode == '39') {
                    //right arrow
                    moveAnchorPoints ({x:3, y:0},selectedEdges);
                }
            }
        }
        function keyUp(e) {
  
            if (e.keyCode < '37' || e.keyCode > '40') {
                return;
            }
  
            var shouldMove = typeof options().moveSelectedAnchorsOnKeyEvents === 'function'
                ? options().moveSelectedAnchorsOnKeyEvents() : options().moveSelectedAnchorsOnKeyEvents;
  
            if (!shouldMove) {
                return;
            }
  
            cy.trigger("edgeediting.moveend", [selectedEdges]);
            selectedEdges = undefined;
            anchorsMoving = false;
  
        }
        document.addEventListener("keydown",keyDown, true);
        document.addEventListener("keyup",keyUp, true);
  
        $container.data('cyedgeediting', data);
      },
      unbind: function () {
          cy.off('remove', 'node', eRemove)
            .off('add', 'node', eAdd)
            .off('style', 'edge.edgebendediting-hasbendpoints:selected, edge.edgecontrolediting-hascontrolpoints:selected', eStyle)
            .off('select', 'edge', eSelect)
            .off('unselect', 'edge', eUnselect)
            .off('tapstart', eTapStart)
            .off('tapstart', 'edge', eTapStartOnEdge)
            .off('tapdrag', eTapDrag)
            .off('tapend', eTapEnd)
            .off('cxttap', eCxtTap)
            .off('drag', 'node',eDrag);
  
          cy.unbind("zoom pan", eZoom);
      }
    };
  
    if (functions[fn]) {
      return functions[fn].apply($(cy.container()), Array.prototype.slice.call(arguments, 1));
    } else if (typeof fn == 'object' || !fn) {
      return functions.init.apply($(cy.container()), arguments);
    } else {
      $.error('No such function `' + fn + '` for cytoscape.js-edge-editing');
    }
  
    return $(this);
  };
  
  },{"./AnchorPointUtilities":1,"./debounce":3,"./reconnectionUtilities":5,"./registerUndoRedoFunctions":6}],3:[function(_dereq_,module,exports){
  var debounce = (function () {
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
      wait = wait < 0 ? 0 : (+wait || 0);
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
          }
          else if (!maxTimeoutId) {
            maxTimeoutId = setTimeout(maxDelayed, remaining);
          }
        }
        if (isCalled && timeoutId) {
          timeoutId = clearTimeout(timeoutId);
        }
        else if (!timeoutId && wait !== maxWait) {
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
      var type = typeof value;
      return !!value && (type == 'object' || type == 'function');
    }
  
    return debounce;
  
  })();
  
  module.exports = debounce;
  },{}],4:[function(_dereq_,module,exports){
  ;(function(){ 'use strict';
    
    var anchorPointUtilities = _dereq_('./AnchorPointUtilities');
    var debounce = _dereq_("./debounce");
    
    // registers the extension on a cytoscape lib ref
    var register = function( cytoscape, $, Konva){
      var uiUtilities = _dereq_('./UIUtilities');
      
      if( !cytoscape || !$ || !Konva){ return; } // can't register if required libraries unspecified
  
      var defaults = {
        // this function specifies the poitions of bend points
        // strictly name the property 'bendPointPositions' for the edge to be detected for bend point edititng
        bendPositionsFunction: function(ele) {
          return ele.data('bendPointPositions');
        },
        // this function specifies the poitions of bend points
        // strictly name the property 'controlPointPositions' for the edge to be detected for control point edititng
        controlPositionsFunction: function(ele) {
          return ele.data('controlPointPositions');
        },
        // whether to initilize bend and control points on creation of this extension automatically
        // SPLIT FUNCTIONALITY?
        initAnchorsAutomatically: true,
        // the classes of those edges that should be ignored
        ignoredClasses: [],
        // whether the bend and control editing operations are undoable (requires cytoscape-undo-redo.js)
        undoable: false,
        // the size of bend and control point shape is obtained by multipling width of edge with this parameter
        // SPLIT FUNCTIONALITY?
        anchorShapeSizeFactor: 3,
        // z-index value of the canvas in which bend and control points are drawn
        zIndex: 999,      
        // whether to start the plugin in the enabled state
        enabled: true,
        //An option that controls the distance within which a bend point is considered "near" the line segment between its two neighbors and will be automatically removed
        bendRemovalSensitivity : 8,
        // title of add bend point menu item (User may need to adjust width of menu items according to length of this option)
        addBendMenuItemTitle: "Add Bend Point",
        // title of remove bend point menu item (User may need to adjust width of menu items according to length of this option)
        removeBendMenuItemTitle: "Remove Bend Point",
        // title of add control point menu item (User may need to adjust width of menu items according to length of this option)
        addControlMenuItemTitle: "Add Control Point",
        // title of remove control point menu item (User may need to adjust width of menu items according to length of this option)
        removeControlMenuItemTitle: "Remove Control Point",
        // whether the bend point can be moved by arrows
        // SPLIT FUNCTIONALITY?
        moveSelectedAnchorsOnKeyEvents: function () {
            return true;
        }
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
          if(i == "bendRemovalSensitivity"){
            var value = options[i];
             if(!isNaN(value))
             {
                if(value >= 0 && value <= 20){
                  obj[i] = options[i];
                }else if(value < 0){
                  obj[i] = 0
                }else{
                  obj[i] = 20
                }
             }
          }else{
            obj[i] = options[i];
          }
  
        }
  
        return obj;
      };
      
      cytoscape( 'core', 'edgeEditing', function(opts){
        var cy = this;
        
        if( opts === 'initialized' ) {
          return initialized;
        }
        
        if( opts !== 'get' ) {
          // merge the options with default ones
          options = extend(defaults, opts);
          initialized = true;
  
          // define edgebendediting-hasbendpoints css class
          cy.style().selector('.edgebendediting-hasbendpoints').css({
            'curve-style': 'segments',
            'segment-distances': function (ele) {
              return anchorPointUtilities.getDistancesString(ele, 'bend');
            },
            'segment-weights': function (ele) {
              return anchorPointUtilities.getWeightsString(ele, 'bend');
            },
            'edge-distances': 'node-position'
          });
  
          // define edgecontrolediting-hascontrolpoints css class
          cy.style().selector('.edgecontrolediting-hascontrolpoints').css({
            'curve-style': 'unbundled-bezier',
            'control-point-distances': function (ele) {
              return anchorPointUtilities.getDistancesString(ele, 'control');
            },
            'control-point-weights': function (ele) {
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
  
          if(options.enabled)
            uiUtilities(options, cy);
          else
            uiUtilities("unbind", cy);
        }
        
        var instance = initialized ? {
          /*
          * get bend or control points of the given edge in an array A,
          * A[2 * i] is the x coordinate and A[2 * i + 1] is the y coordinate
          * of the ith bend point. (Returns undefined if the curve style is not segments)
          */
          getAnchorsAsArray: function(ele) {
            return anchorPointUtilities.getAnchorsAsArray(ele);
          },
          // Initilize points for the given edges using 'options.bendPositionsFunction'
          initAnchorPoints: function(eles) {
            anchorPointUtilities.initAnchorPoints(options.bendPositionsFunction, options.controlPositionsFunction, eles);
          },
          deleteSelectedAnchor: function(ele, index) {
            anchorPointUtilities.removeAnchor(ele, index);
          }
        } : undefined;
  
        return instance; // chainability
      } );
  
    };
  
    if( typeof module !== 'undefined' && module.exports ){ // expose as a commonjs module
      module.exports = register;
    }
  
    if( typeof define !== 'undefined' && define.amd ){ // expose as an amd/requirejs module
      define('cytoscape-edge-editing', function(){
        return register;
      });
    }
  
    if( typeof cytoscape !== 'undefined' && $ && Konva){ // expose to global cytoscape (i.e. window.cytoscape)
      register( cytoscape, $, Konva );
    }
  
  })();
  
  },{"./AnchorPointUtilities":1,"./UIUtilities":2,"./debounce":3}],5:[function(_dereq_,module,exports){
  var reconnectionUtilities = {
  
      // creates and returns a dummy node which is connected to the disconnected edge
      disconnectEdge: function (edge, cy, position, disconnectedEnd) {
          
          var dummyNode = {
              data: { 
                id: 'nwt_reconnectEdge_dummy',
                ports: [],
              },
              style: {
                width: 1,
                height: 1,
                'visibility': 'hidden'
              },
              renderedPosition: position
          };
          cy.add(dummyNode);
  
          var loc = (disconnectedEnd === 'source') ? 
              {source: dummyNode.data.id} : 
              {target: dummyNode.data.id};
  
          edge = edge.move(loc)[0];
  
          return {
              dummyNode: cy.nodes("#" + dummyNode.data.id)[0],
              edge: edge
          };
      },
  
      connectEdge: function (edge, node, location) {
          if(!edge.isEdge() || !node.isNode())
              return;
  
          var loc = {};
          if(location === 'source')
              loc.source = node.id();
          
          else if(location === 'target')
              loc.target = node.id();
          
          else
              return;
  
          return edge.move(loc)[0];
      },
  
      copyEdge: function (oldEdge, newEdge) {
          this.copyAnchors(oldEdge, newEdge);
          this.copyStyle(oldEdge, newEdge);
      },
  
      copyStyle: function (oldEdge, newEdge) {
          if(oldEdge && newEdge){
              newEdge.data('line-color', oldEdge.data('line-color'));
              newEdge.data('width', oldEdge.data('width'));
              newEdge.data('cardinality', oldEdge.data('cardinality'));
          }
      },
  
      copyAnchors: function (oldEdge, newEdge) {
          if(oldEdge.hasClass('edgebendediting-hasbendpoints')){
              var bpDistances = oldEdge.data('cyedgebendeditingDistances');
              var bpWeights = oldEdge.data('cyedgebendeditingWeights');
              
              newEdge.data('cyedgebendeditingDistances', bpDistances);
              newEdge.data('cyedgebendeditingWeights', bpWeights);
              newEdge.addClass('edgebendediting-hasbendpoints');
          }
          else if(oldEdge.hasClass('edgecontrolediting-hascontrolpoints')){
              var bpDistances = oldEdge.data('cyedgecontroleditingDistances');
              var bpWeights = oldEdge.data('cyedgecontroleditingWeights');
              
              newEdge.data('cyedgecontroleditingDistances', bpDistances);
              newEdge.data('cyedgecontroleditingWeights', bpWeights);
              newEdge.addClass('edgecontrolediting-hascontrolpoints');
          }
      },
  };
    
  module.exports = reconnectionUtilities;
    
  },{}],6:[function(_dereq_,module,exports){
  module.exports = function (cy, anchorPointUtilities, params) {
    if (cy.undoRedo == null)
      return;
  
    var ur = cy.undoRedo({
      defaultActions: false,
      isDebug: true
    });
  
    function changeAnchorPoints(param) {
      var edge = cy.getElementById(param.edge.id());
      var type = anchorPointUtilities.getEdgeType(edge);
  
      if(type === 'inconclusive'){
        type = 'bend';
      }
  
      var weightStr = anchorPointUtilities.syntax[type]['weight'];
      var distanceStr = anchorPointUtilities.syntax[type]['distance'];
      var result = {
        edge: edge,
        weights: param.set ? edge.data(weightStr) : param.weights,
        distances: param.set ? edge.data(distanceStr) : param.distances,
        set: true//As the result will not be used for the first function call params should be used to set the data
      };
  
      var hasAnchorPoint = param.weights && param.weights.length > 0;
  
      //Check if we need to set the weights and distances by the param values
      if (param.set) {
        hasAnchorPoint ? edge.data(weightStr, param.weights) : edge.removeData(weightStr);
        hasAnchorPoint ? edge.data(distanceStr, param.distances) : edge.removeData(distanceStr);
  
        //refresh the curve style as the number of anchor point would be changed by the previous operation
        if (hasAnchorPoint) {
          edge.addClass(anchorPointUtilities.syntax[type]['class']);
          edge.removeClass(anchorPointUtilities.syntax[type]['was']);
        }
        else {
          edge.removeClass(anchorPointUtilities.syntax[type]['class']);
          edge.addClass(anchorPointUtilities.syntax[type]['was']);
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
        edges.forEach(function( edge ){
            edge = cy.getElementById(param.edge.id());
            var previousAnchorsPosition = anchorPointUtilities.getAnchorsAsArray(edge);
            var nextAnchorsPosition = [];
            if (previousAnchorsPosition != undefined)
            {
                for (i=0; i<previousAnchorsPosition.length; i+=2)
                {
                    nextAnchorsPosition.push({x: previousAnchorsPosition[i]+positionDiff.x, y: previousAnchorsPosition[i+1]+positionDiff.y});
                }
                edge.data(anchorPointUtilities.syntax[type]['pointPos'],nextAnchorsPosition);
            }
        });
  
        anchorPointUtilities.initAnchorPoints(params.bendPositionsFunction, params.controlPositionsFunction, edges);
    }
  
    function reconnectEdge(param){
      var edge      = param.edge;
      var location  = param.location;
      var oldLoc    = param.oldLoc;
  
      edge = edge.move(location)[0];
  
      var result = {
        edge:     edge,
        location: oldLoc,
        oldLoc:   location
      }
      edge.unselect();
      return result;
    }
  
    function removeReconnectedEdge(param){
      var oldEdge = param.oldEdge;
      var tmp = cy.getElementById(oldEdge.data('id'));
      if(tmp && tmp.length > 0)
        oldEdge = tmp;
  
      var newEdge = param.newEdge;
      var tmp = cy.getElementById(newEdge.data('id'));
      if(tmp && tmp.length > 0)
        newEdge = tmp;
  
      if(oldEdge.inside()){
        oldEdge = oldEdge.remove()[0];
      } 
        
      if(newEdge.removed()){
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
  
  },{}]},{},[4])(4)
  });
  
  //# sourceMappingURL=data:application/json;charset:utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIm5vZGVfbW9kdWxlcy9icm93c2VyLXBhY2svX3ByZWx1ZGUuanMiLCJzcmMvQW5jaG9yUG9pbnRVdGlsaXRpZXMuanMiLCJzcmMvVUlVdGlsaXRpZXMuanMiLCJzcmMvZGVib3VuY2UuanMiLCJzcmMvaW5kZXguanMiLCJzcmMvcmVjb25uZWN0aW9uVXRpbGl0aWVzLmpzIiwic3JjL3JlZ2lzdGVyVW5kb1JlZG9GdW5jdGlvbnMuanMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7QUNBQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQy9mQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDajRDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUM3T0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUMvS0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNsRkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBIiwiZmlsZSI6ImdlbmVyYXRlZC5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzQ29udGVudCI6WyIoZnVuY3Rpb24gZSh0LG4scil7ZnVuY3Rpb24gcyhvLHUpe2lmKCFuW29dKXtpZighdFtvXSl7dmFyIGE9dHlwZW9mIHJlcXVpcmU9PVwiZnVuY3Rpb25cIiYmcmVxdWlyZTtpZighdSYmYSlyZXR1cm4gYShvLCEwKTtpZihpKXJldHVybiBpKG8sITApO3ZhciBmPW5ldyBFcnJvcihcIkNhbm5vdCBmaW5kIG1vZHVsZSAnXCIrbytcIidcIik7dGhyb3cgZi5jb2RlPVwiTU9EVUxFX05PVF9GT1VORFwiLGZ9dmFyIGw9bltvXT17ZXhwb3J0czp7fX07dFtvXVswXS5jYWxsKGwuZXhwb3J0cyxmdW5jdGlvbihlKXt2YXIgbj10W29dWzFdW2VdO3JldHVybiBzKG4/bjplKX0sbCxsLmV4cG9ydHMsZSx0LG4scil9cmV0dXJuIG5bb10uZXhwb3J0c312YXIgaT10eXBlb2YgcmVxdWlyZT09XCJmdW5jdGlvblwiJiZyZXF1aXJlO2Zvcih2YXIgbz0wO288ci5sZW5ndGg7bysrKXMocltvXSk7cmV0dXJuIHN9KSIsInZhciBhbmNob3JQb2ludFV0aWxpdGllcyA9IHtcclxuICBjdXJyZW50Q3R4RWRnZTogdW5kZWZpbmVkLFxyXG4gIGN1cnJlbnRDdHhQb3M6IHVuZGVmaW5lZCxcclxuICBjdXJyZW50QW5jaG9ySW5kZXg6IHVuZGVmaW5lZCxcclxuICBpZ25vcmVkQ2xhc3NlczogdW5kZWZpbmVkLFxyXG4gIHNldElnbm9yZWRDbGFzc2VzOiBmdW5jdGlvbihfaWdub3JlZENsYXNzZXMpIHtcclxuICAgIHRoaXMuaWdub3JlZENsYXNzZXMgPSBfaWdub3JlZENsYXNzZXM7XHJcbiAgfSxcclxuICBzeW50YXg6IHtcclxuICAgIGJlbmQ6IHtcclxuICAgICAgZWRnZTogXCJzZWdtZW50c1wiLFxyXG4gICAgICBjbGFzczogXCJlZGdlYmVuZGVkaXRpbmctaGFzYmVuZHBvaW50c1wiLFxyXG4gICAgICB3ZWlnaHQ6IFwiY3llZGdlYmVuZGVkaXRpbmdXZWlnaHRzXCIsXHJcbiAgICAgIGRpc3RhbmNlOiBcImN5ZWRnZWJlbmRlZGl0aW5nRGlzdGFuY2VzXCIsXHJcbiAgICAgIHdlaWdodENzczogXCJzZWdtZW50LXdlaWdodHNcIixcclxuICAgICAgZGlzdGFuY2VDc3M6IFwic2VnbWVudC1kaXN0YW5jZXNcIixcclxuICAgICAgcG9pbnRQb3M6IFwiYmVuZFBvaW50UG9zaXRpb25zXCIsXHJcbiAgICAgIHdhczogXCJjeWVkZ2VlZGl0aW5nV2FzU2VnbWVudHNcIiAvLyBzcGVjaWFsIGNsYXNzIHRvIHJlbWVtYmVyIGVkZ2VzIHdoaWNoIHdlcmUgc2VnbWVudHNcclxuICAgIH0sXHJcbiAgICBjb250cm9sOiB7XHJcbiAgICAgIGVkZ2U6IFwidW5idW5kbGVkLWJlemllclwiLFxyXG4gICAgICBjbGFzczogXCJlZGdlY29udHJvbGVkaXRpbmctaGFzY29udHJvbHBvaW50c1wiLFxyXG4gICAgICB3ZWlnaHQ6IFwiY3llZGdlY29udHJvbGVkaXRpbmdXZWlnaHRzXCIsXHJcbiAgICAgIGRpc3RhbmNlOiBcImN5ZWRnZWNvbnRyb2xlZGl0aW5nRGlzdGFuY2VzXCIsXHJcbiAgICAgIHdlaWdodENzczogXCJjb250cm9sLXBvaW50LXdlaWdodHNcIixcclxuICAgICAgZGlzdGFuY2VDc3M6IFwiY29udHJvbC1wb2ludC1kaXN0YW5jZXNcIixcclxuICAgICAgcG9pbnRQb3M6IFwiY29udHJvbFBvaW50UG9zaXRpb25zXCIsXHJcbiAgICAgIHdhczogXCJjeWVkZ2VlZGl0aW5nV2FzVW5idW5kbGVkQmV6aWVyXCJcclxuICAgIH1cclxuICB9LFxyXG4gIC8vIGdldHMgZWRnZSB0eXBlIGFzICdiZW5kJyBvciAnY29udHJvbCdcclxuICBnZXRFZGdlVHlwZTogZnVuY3Rpb24oZWRnZSl7XHJcbiAgICBpZighZWRnZSlcclxuICAgICAgcmV0dXJuICdpbmNvbmNsdXNpdmUnO1xyXG4gICAgZWxzZSBpZihlZGdlLmhhc0NsYXNzKHRoaXMuc3ludGF4WydiZW5kJ11bJ2NsYXNzJ10pIHx8IFxyXG4gICAgICAgICAgICBlZGdlLmhhc0NsYXNzKHRoaXMuc3ludGF4WydiZW5kJ11bJ3dhcyddKSB8fFxyXG4gICAgICAgICAgICBlZGdlLmRhdGEodGhpcy5zeW50YXhbJ2JlbmQnXVsncG9pbnRQb3MnXSkgfHxcclxuICAgICAgICAgICAgZWRnZS5jc3MoJ2N1cnZlLXN0eWxlJykgPT09IHRoaXMuc3ludGF4WydiZW5kJ11bJ2VkZ2UnXSlcclxuICAgICAgcmV0dXJuICdiZW5kJztcclxuICAgIGVsc2UgaWYoZWRnZS5oYXNDbGFzcyh0aGlzLnN5bnRheFsnY29udHJvbCddWydjbGFzcyddKSB8fCBcclxuICAgICAgICAgICAgZWRnZS5oYXNDbGFzcyh0aGlzLnN5bnRheFsnY29udHJvbCddWyd3YXMnXSkgfHxcclxuICAgICAgICAgICAgZWRnZS5kYXRhKHRoaXMuc3ludGF4Wydjb250cm9sJ11bJ3BvaW50UG9zJ10pIHx8XHJcbiAgICAgICAgICAgIGVkZ2UuY3NzKCdjdXJ2ZS1zdHlsZScpID09PSB0aGlzLnN5bnRheFsnY29udHJvbCddWydlZGdlJ10pXHJcbiAgICAgIHJldHVybiAnY29udHJvbCc7XHJcbiAgICBlbHNlXHJcbiAgICAgIHJldHVybiAnaW5jb25jbHVzaXZlJztcclxuICB9LFxyXG4gIC8vIGluaXRpbGl6ZSBhbmNob3IgcG9pbnRzIGJhc2VkIG9uIGJlbmRQb3NpdGlvbnNGY24gYW5kIGNvbnRyb2xQb3NpdGlvbkZjblxyXG4gIGluaXRBbmNob3JQb2ludHM6IGZ1bmN0aW9uKGJlbmRQb3NpdGlvbnNGY24sIGNvbnRyb2xQb3NpdGlvbnNGY24sIGVkZ2VzKSB7XHJcbiAgICBmb3IgKHZhciBpID0gMDsgaSA8IGVkZ2VzLmxlbmd0aDsgaSsrKSB7XHJcbiAgICAgIHZhciBlZGdlID0gZWRnZXNbaV07XHJcbiAgICAgIHZhciB0eXBlID0gdGhpcy5nZXRFZGdlVHlwZShlZGdlKTtcclxuICAgICAgXHJcbiAgICAgIGlmICh0eXBlID09PSAnaW5jb25jbHVzaXZlJykgeyBcclxuICAgICAgICBjb250aW51ZTsgXHJcbiAgICAgIH1cclxuXHJcbiAgICAgIGlmKCF0aGlzLmlzSWdub3JlZEVkZ2UoZWRnZSkpIHtcclxuXHJcbiAgICAgICAgdmFyIGFuY2hvclBvc2l0aW9ucztcclxuXHJcbiAgICAgICAgLy8gZ2V0IHRoZSBhbmNob3IgcG9zaXRpb25zIGJ5IGFwcGx5aW5nIHRoZSBmdW5jdGlvbnMgZm9yIHRoaXMgZWRnZVxyXG4gICAgICAgIGlmKHR5cGUgPT09ICdiZW5kJylcclxuICAgICAgICAgIGFuY2hvclBvc2l0aW9ucyA9IGJlbmRQb3NpdGlvbnNGY24uYXBwbHkodGhpcywgZWRnZSk7XHJcbiAgICAgICAgZWxzZSBpZih0eXBlID09PSAnY29udHJvbCcpXHJcbiAgICAgICAgICBhbmNob3JQb3NpdGlvbnMgPSBjb250cm9sUG9zaXRpb25zRmNuLmFwcGx5KHRoaXMsIGVkZ2UpO1xyXG5cclxuICAgICAgICAvLyBjYWxjdWxhdGUgcmVsYXRpdmUgYW5jaG9yIHBvc2l0aW9uc1xyXG4gICAgICAgIHZhciByZXN1bHQgPSB0aGlzLmNvbnZlcnRUb1JlbGF0aXZlUG9zaXRpb25zKGVkZ2UsIGFuY2hvclBvc2l0aW9ucyk7XHJcblxyXG4gICAgICAgIC8vIGlmIHRoZXJlIGFyZSBhbmNob3JzIHNldCB3ZWlnaHRzIGFuZCBkaXN0YW5jZXMgYWNjb3JkaW5nbHkgYW5kIGFkZCBjbGFzcyB0byBlbmFibGUgc3R5bGUgY2hhbmdlc1xyXG4gICAgICAgIGlmIChyZXN1bHQuZGlzdGFuY2VzLmxlbmd0aCA+IDApIHtcclxuICAgICAgICAgIGVkZ2UuZGF0YSh0aGlzLnN5bnRheFt0eXBlXVsnd2VpZ2h0J10sIHJlc3VsdC53ZWlnaHRzKTtcclxuICAgICAgICAgIGVkZ2UuZGF0YSh0aGlzLnN5bnRheFt0eXBlXVsnZGlzdGFuY2UnXSwgcmVzdWx0LmRpc3RhbmNlcyk7XHJcbiAgICAgICAgICBlZGdlLmFkZENsYXNzKHRoaXMuc3ludGF4W3R5cGVdWydjbGFzcyddKTtcclxuICAgICAgICB9XHJcbiAgICAgIH1cclxuICAgIH1cclxuICB9LFxyXG5cclxuICBpc0lnbm9yZWRFZGdlOiBmdW5jdGlvbihlZGdlKSB7XHJcblxyXG4gICAgdmFyIHN0YXJ0WCA9IGVkZ2Uuc291cmNlKCkucG9zaXRpb24oJ3gnKTtcclxuICAgIHZhciBzdGFydFkgPSBlZGdlLnNvdXJjZSgpLnBvc2l0aW9uKCd5Jyk7XHJcbiAgICB2YXIgZW5kWCA9IGVkZ2UudGFyZ2V0KCkucG9zaXRpb24oJ3gnKTtcclxuICAgIHZhciBlbmRZID0gZWRnZS50YXJnZXQoKS5wb3NpdGlvbigneScpO1xyXG4gICBcclxuICAgIGlmKChzdGFydFggPT0gZW5kWCAmJiBzdGFydFkgPT0gZW5kWSkgIHx8IChlZGdlLnNvdXJjZSgpLmlkKCkgPT0gZWRnZS50YXJnZXQoKS5pZCgpKSl7XHJcbiAgICAgIHJldHVybiB0cnVlO1xyXG4gICAgfVxyXG4gICAgZm9yKHZhciBpID0gMDsgdGhpcy5pZ25vcmVkQ2xhc3NlcyAmJiBpIDwgIHRoaXMuaWdub3JlZENsYXNzZXMubGVuZ3RoOyBpKyspe1xyXG4gICAgICBpZihlZGdlLmhhc0NsYXNzKHRoaXMuaWdub3JlZENsYXNzZXNbaV0pKVxyXG4gICAgICAgIHJldHVybiB0cnVlO1xyXG4gICAgfVxyXG4gICAgcmV0dXJuIGZhbHNlO1xyXG4gIH0sXHJcbiAgLy9HZXQgdGhlIGRpcmVjdGlvbiBvZiB0aGUgbGluZSBmcm9tIHNvdXJjZSBwb2ludCB0byB0aGUgdGFyZ2V0IHBvaW50XHJcbiAgZ2V0TGluZURpcmVjdGlvbjogZnVuY3Rpb24oc3JjUG9pbnQsIHRndFBvaW50KXtcclxuICAgIGlmKHNyY1BvaW50LnkgPT0gdGd0UG9pbnQueSAmJiBzcmNQb2ludC54IDwgdGd0UG9pbnQueCl7XHJcbiAgICAgIHJldHVybiAxO1xyXG4gICAgfVxyXG4gICAgaWYoc3JjUG9pbnQueSA8IHRndFBvaW50LnkgJiYgc3JjUG9pbnQueCA8IHRndFBvaW50Lngpe1xyXG4gICAgICByZXR1cm4gMjtcclxuICAgIH1cclxuICAgIGlmKHNyY1BvaW50LnkgPCB0Z3RQb2ludC55ICYmIHNyY1BvaW50LnggPT0gdGd0UG9pbnQueCl7XHJcbiAgICAgIHJldHVybiAzO1xyXG4gICAgfVxyXG4gICAgaWYoc3JjUG9pbnQueSA8IHRndFBvaW50LnkgJiYgc3JjUG9pbnQueCA+IHRndFBvaW50Lngpe1xyXG4gICAgICByZXR1cm4gNDtcclxuICAgIH1cclxuICAgIGlmKHNyY1BvaW50LnkgPT0gdGd0UG9pbnQueSAmJiBzcmNQb2ludC54ID4gdGd0UG9pbnQueCl7XHJcbiAgICAgIHJldHVybiA1O1xyXG4gICAgfVxyXG4gICAgaWYoc3JjUG9pbnQueSA+IHRndFBvaW50LnkgJiYgc3JjUG9pbnQueCA+IHRndFBvaW50Lngpe1xyXG4gICAgICByZXR1cm4gNjtcclxuICAgIH1cclxuICAgIGlmKHNyY1BvaW50LnkgPiB0Z3RQb2ludC55ICYmIHNyY1BvaW50LnggPT0gdGd0UG9pbnQueCl7XHJcbiAgICAgIHJldHVybiA3O1xyXG4gICAgfVxyXG4gICAgcmV0dXJuIDg7Ly9pZiBzcmNQb2ludC55ID4gdGd0UG9pbnQueSBhbmQgc3JjUG9pbnQueCA8IHRndFBvaW50LnhcclxuICB9LFxyXG4gIGdldFNyY1RndFBvaW50c0FuZFRhbmdlbnRzOiBmdW5jdGlvbiAoZWRnZSkge1xyXG4gICAgdmFyIHNvdXJjZU5vZGUgPSBlZGdlLnNvdXJjZSgpO1xyXG4gICAgdmFyIHRhcmdldE5vZGUgPSBlZGdlLnRhcmdldCgpO1xyXG4gICAgXHJcbiAgICB2YXIgdGd0UG9zaXRpb24gPSB0YXJnZXROb2RlLnBvc2l0aW9uKCk7XHJcbiAgICB2YXIgc3JjUG9zaXRpb24gPSBzb3VyY2VOb2RlLnBvc2l0aW9uKCk7XHJcbiAgICBcclxuICAgIHZhciBzcmNQb2ludCA9IHNvdXJjZU5vZGUucG9zaXRpb24oKTtcclxuICAgIHZhciB0Z3RQb2ludCA9IHRhcmdldE5vZGUucG9zaXRpb24oKTtcclxuXHJcblxyXG4gICAgdmFyIG0xID0gKHRndFBvaW50LnkgLSBzcmNQb2ludC55KSAvICh0Z3RQb2ludC54IC0gc3JjUG9pbnQueCk7XHJcbiAgICB2YXIgbTIgPSAtMSAvIG0xO1xyXG5cclxuICAgIHJldHVybiB7XHJcbiAgICAgIG0xOiBtMSxcclxuICAgICAgbTI6IG0yLFxyXG4gICAgICBzcmNQb2ludDogc3JjUG9pbnQsXHJcbiAgICAgIHRndFBvaW50OiB0Z3RQb2ludFxyXG4gICAgfTtcclxuICB9LFxyXG4gIGdldEludGVyc2VjdGlvbjogZnVuY3Rpb24oZWRnZSwgcG9pbnQsIHNyY1RndFBvaW50c0FuZFRhbmdlbnRzKXtcclxuICAgIGlmIChzcmNUZ3RQb2ludHNBbmRUYW5nZW50cyA9PT0gdW5kZWZpbmVkKSB7XHJcbiAgICAgIHNyY1RndFBvaW50c0FuZFRhbmdlbnRzID0gdGhpcy5nZXRTcmNUZ3RQb2ludHNBbmRUYW5nZW50cyhlZGdlKTtcclxuICAgIH1cclxuXHJcbiAgICB2YXIgc3JjUG9pbnQgPSBzcmNUZ3RQb2ludHNBbmRUYW5nZW50cy5zcmNQb2ludDtcclxuICAgIHZhciB0Z3RQb2ludCA9IHNyY1RndFBvaW50c0FuZFRhbmdlbnRzLnRndFBvaW50O1xyXG4gICAgdmFyIG0xID0gc3JjVGd0UG9pbnRzQW5kVGFuZ2VudHMubTE7XHJcbiAgICB2YXIgbTIgPSBzcmNUZ3RQb2ludHNBbmRUYW5nZW50cy5tMjtcclxuXHJcbiAgICB2YXIgaW50ZXJzZWN0WDtcclxuICAgIHZhciBpbnRlcnNlY3RZO1xyXG5cclxuICAgIGlmKG0xID09IEluZmluaXR5IHx8IG0xID09IC1JbmZpbml0eSl7XHJcbiAgICAgIGludGVyc2VjdFggPSBzcmNQb2ludC54O1xyXG4gICAgICBpbnRlcnNlY3RZID0gcG9pbnQueTtcclxuICAgIH1cclxuICAgIGVsc2UgaWYobTEgPT0gMCl7XHJcbiAgICAgIGludGVyc2VjdFggPSBwb2ludC54O1xyXG4gICAgICBpbnRlcnNlY3RZID0gc3JjUG9pbnQueTtcclxuICAgIH1cclxuICAgIGVsc2Uge1xyXG4gICAgICB2YXIgYTEgPSBzcmNQb2ludC55IC0gbTEgKiBzcmNQb2ludC54O1xyXG4gICAgICB2YXIgYTIgPSBwb2ludC55IC0gbTIgKiBwb2ludC54O1xyXG5cclxuICAgICAgaW50ZXJzZWN0WCA9IChhMiAtIGExKSAvIChtMSAtIG0yKTtcclxuICAgICAgaW50ZXJzZWN0WSA9IG0xICogaW50ZXJzZWN0WCArIGExO1xyXG4gICAgfVxyXG5cclxuICAgIC8vSW50ZXJzZWN0aW9uIHBvaW50IGlzIHRoZSBpbnRlcnNlY3Rpb24gb2YgdGhlIGxpbmVzIHBhc3NpbmcgdGhyb3VnaCB0aGUgbm9kZXMgYW5kXHJcbiAgICAvL3Bhc3NpbmcgdGhyb3VnaCB0aGUgYmVuZCBvciBjb250cm9sIHBvaW50IGFuZCBwZXJwZW5kaWN1bGFyIHRvIHRoZSBvdGhlciBsaW5lXHJcbiAgICB2YXIgaW50ZXJzZWN0aW9uUG9pbnQgPSB7XHJcbiAgICAgIHg6IGludGVyc2VjdFgsXHJcbiAgICAgIHk6IGludGVyc2VjdFlcclxuICAgIH07XHJcbiAgICBcclxuICAgIHJldHVybiBpbnRlcnNlY3Rpb25Qb2ludDtcclxuICB9LFxyXG4gIGdldEFuY2hvcnNBc0FycmF5OiBmdW5jdGlvbihlZGdlKSB7XHJcbiAgICB2YXIgdHlwZSA9IHRoaXMuZ2V0RWRnZVR5cGUoZWRnZSk7XHJcblxyXG4gICAgaWYodHlwZSA9PT0gJ2luY29uY2x1c2l2ZScpe1xyXG4gICAgICByZXR1cm4gdW5kZWZpbmVkO1xyXG4gICAgfVxyXG4gICAgXHJcbiAgICBpZiggZWRnZS5jc3MoJ2N1cnZlLXN0eWxlJykgIT09IHRoaXMuc3ludGF4W3R5cGVdWydlZGdlJ10gKSB7XHJcbiAgICAgIHJldHVybiB1bmRlZmluZWQ7XHJcbiAgICB9XHJcbiAgICBcclxuICAgIHZhciBhbmNob3JMaXN0ID0gW107XHJcblxyXG4gICAgdmFyIHdlaWdodHMgPSBlZGdlLnBzdHlsZSggdGhpcy5zeW50YXhbdHlwZV1bJ3dlaWdodENzcyddICkucGZWYWx1ZTtcclxuICAgIHZhciBkaXN0YW5jZXMgPSBlZGdlLnBzdHlsZSggdGhpcy5zeW50YXhbdHlwZV1bJ2Rpc3RhbmNlQ3NzJ10gKS5wZlZhbHVlO1xyXG4gICAgdmFyIG1pbkxlbmd0aHMgPSBNYXRoLm1pbiggd2VpZ2h0cy5sZW5ndGgsIGRpc3RhbmNlcy5sZW5ndGggKTtcclxuICAgIFxyXG4gICAgdmFyIHNyY1BvcyA9IGVkZ2Uuc291cmNlKCkucG9zaXRpb24oKTtcclxuICAgIHZhciB0Z3RQb3MgPSBlZGdlLnRhcmdldCgpLnBvc2l0aW9uKCk7XHJcblxyXG4gICAgdmFyIGR5ID0gKCB0Z3RQb3MueSAtIHNyY1Bvcy55ICk7XHJcbiAgICB2YXIgZHggPSAoIHRndFBvcy54IC0gc3JjUG9zLnggKTtcclxuICAgIFxyXG4gICAgdmFyIGwgPSBNYXRoLnNxcnQoIGR4ICogZHggKyBkeSAqIGR5ICk7XHJcblxyXG4gICAgdmFyIHZlY3RvciA9IHtcclxuICAgICAgeDogZHgsXHJcbiAgICAgIHk6IGR5XHJcbiAgICB9O1xyXG5cclxuICAgIHZhciB2ZWN0b3JOb3JtID0ge1xyXG4gICAgICB4OiB2ZWN0b3IueCAvIGwsXHJcbiAgICAgIHk6IHZlY3Rvci55IC8gbFxyXG4gICAgfTtcclxuICAgIFxyXG4gICAgdmFyIHZlY3Rvck5vcm1JbnZlcnNlID0ge1xyXG4gICAgICB4OiAtdmVjdG9yTm9ybS55LFxyXG4gICAgICB5OiB2ZWN0b3JOb3JtLnhcclxuICAgIH07XHJcblxyXG4gICAgZm9yKCB2YXIgcyA9IDA7IHMgPCBtaW5MZW5ndGhzOyBzKysgKXtcclxuICAgICAgdmFyIHcgPSB3ZWlnaHRzWyBzIF07XHJcbiAgICAgIHZhciBkID0gZGlzdGFuY2VzWyBzIF07XHJcblxyXG4gICAgICB2YXIgdzEgPSAoMSAtIHcpO1xyXG4gICAgICB2YXIgdzIgPSB3O1xyXG5cclxuICAgICAgdmFyIHBvc1B0cyA9IHtcclxuICAgICAgICB4MTogc3JjUG9zLngsXHJcbiAgICAgICAgeDI6IHRndFBvcy54LFxyXG4gICAgICAgIHkxOiBzcmNQb3MueSxcclxuICAgICAgICB5MjogdGd0UG9zLnlcclxuICAgICAgfTtcclxuXHJcbiAgICAgIHZhciBtaWRwdFB0cyA9IHBvc1B0cztcclxuICAgICAgXHJcbiAgICAgIHZhciBhZGp1c3RlZE1pZHB0ID0ge1xyXG4gICAgICAgIHg6IG1pZHB0UHRzLngxICogdzEgKyBtaWRwdFB0cy54MiAqIHcyLFxyXG4gICAgICAgIHk6IG1pZHB0UHRzLnkxICogdzEgKyBtaWRwdFB0cy55MiAqIHcyXHJcbiAgICAgIH07XHJcblxyXG4gICAgICBhbmNob3JMaXN0LnB1c2goXHJcbiAgICAgICAgYWRqdXN0ZWRNaWRwdC54ICsgdmVjdG9yTm9ybUludmVyc2UueCAqIGQsXHJcbiAgICAgICAgYWRqdXN0ZWRNaWRwdC55ICsgdmVjdG9yTm9ybUludmVyc2UueSAqIGRcclxuICAgICAgKTtcclxuICAgIH1cclxuICAgIFxyXG4gICAgcmV0dXJuIGFuY2hvckxpc3Q7XHJcbiAgfSxcclxuICBjb252ZXJ0VG9SZWxhdGl2ZVBvc2l0aW9uOiBmdW5jdGlvbiAoZWRnZSwgcG9pbnQsIHNyY1RndFBvaW50c0FuZFRhbmdlbnRzKSB7XHJcbiAgICBpZiAoc3JjVGd0UG9pbnRzQW5kVGFuZ2VudHMgPT09IHVuZGVmaW5lZCkge1xyXG4gICAgICBzcmNUZ3RQb2ludHNBbmRUYW5nZW50cyA9IHRoaXMuZ2V0U3JjVGd0UG9pbnRzQW5kVGFuZ2VudHMoZWRnZSk7XHJcbiAgICB9XHJcbiAgICBcclxuICAgIHZhciBpbnRlcnNlY3Rpb25Qb2ludCA9IHRoaXMuZ2V0SW50ZXJzZWN0aW9uKGVkZ2UsIHBvaW50LCBzcmNUZ3RQb2ludHNBbmRUYW5nZW50cyk7XHJcbiAgICB2YXIgaW50ZXJzZWN0WCA9IGludGVyc2VjdGlvblBvaW50Lng7XHJcbiAgICB2YXIgaW50ZXJzZWN0WSA9IGludGVyc2VjdGlvblBvaW50Lnk7XHJcbiAgICBcclxuICAgIHZhciBzcmNQb2ludCA9IHNyY1RndFBvaW50c0FuZFRhbmdlbnRzLnNyY1BvaW50O1xyXG4gICAgdmFyIHRndFBvaW50ID0gc3JjVGd0UG9pbnRzQW5kVGFuZ2VudHMudGd0UG9pbnQ7XHJcbiAgICBcclxuICAgIHZhciB3ZWlnaHQ7XHJcbiAgICBcclxuICAgIGlmKCBpbnRlcnNlY3RYICE9IHNyY1BvaW50LnggKSB7XHJcbiAgICAgIHdlaWdodCA9IChpbnRlcnNlY3RYIC0gc3JjUG9pbnQueCkgLyAodGd0UG9pbnQueCAtIHNyY1BvaW50LngpO1xyXG4gICAgfVxyXG4gICAgZWxzZSBpZiggaW50ZXJzZWN0WSAhPSBzcmNQb2ludC55ICkge1xyXG4gICAgICB3ZWlnaHQgPSAoaW50ZXJzZWN0WSAtIHNyY1BvaW50LnkpIC8gKHRndFBvaW50LnkgLSBzcmNQb2ludC55KTtcclxuICAgIH1cclxuICAgIGVsc2Uge1xyXG4gICAgICB3ZWlnaHQgPSAwO1xyXG4gICAgfVxyXG4gICAgXHJcbiAgICB2YXIgZGlzdGFuY2UgPSBNYXRoLnNxcnQoTWF0aC5wb3coKGludGVyc2VjdFkgLSBwb2ludC55KSwgMilcclxuICAgICAgICArIE1hdGgucG93KChpbnRlcnNlY3RYIC0gcG9pbnQueCksIDIpKTtcclxuICAgIFxyXG4gICAgLy9HZXQgdGhlIGRpcmVjdGlvbiBvZiB0aGUgbGluZSBmb3JtIHNvdXJjZSBwb2ludCB0byB0YXJnZXQgcG9pbnRcclxuICAgIHZhciBkaXJlY3Rpb24xID0gdGhpcy5nZXRMaW5lRGlyZWN0aW9uKHNyY1BvaW50LCB0Z3RQb2ludCk7XHJcbiAgICAvL0dldCB0aGUgZGlyZWN0aW9uIG9mIHRoZSBsaW5lIGZyb20gaW50ZXNlY3Rpb24gcG9pbnQgdG8gdGhlIHBvaW50XHJcbiAgICB2YXIgZGlyZWN0aW9uMiA9IHRoaXMuZ2V0TGluZURpcmVjdGlvbihpbnRlcnNlY3Rpb25Qb2ludCwgcG9pbnQpO1xyXG4gICAgXHJcbiAgICAvL0lmIHRoZSBkaWZmZXJlbmNlIGlzIG5vdCAtMiBhbmQgbm90IDYgdGhlbiB0aGUgZGlyZWN0aW9uIG9mIHRoZSBkaXN0YW5jZSBpcyBuZWdhdGl2ZVxyXG4gICAgaWYoZGlyZWN0aW9uMSAtIGRpcmVjdGlvbjIgIT0gLTIgJiYgZGlyZWN0aW9uMSAtIGRpcmVjdGlvbjIgIT0gNil7XHJcbiAgICAgIGlmKGRpc3RhbmNlICE9IDApXHJcbiAgICAgICAgZGlzdGFuY2UgPSAtMSAqIGRpc3RhbmNlO1xyXG4gICAgfVxyXG4gICAgXHJcbiAgICByZXR1cm4ge1xyXG4gICAgICB3ZWlnaHQ6IHdlaWdodCxcclxuICAgICAgZGlzdGFuY2U6IGRpc3RhbmNlXHJcbiAgICB9O1xyXG4gIH0sXHJcbiAgY29udmVydFRvUmVsYXRpdmVQb3NpdGlvbnM6IGZ1bmN0aW9uIChlZGdlLCBhbmNob3JQb2ludHMpIHtcclxuICAgIHZhciBzcmNUZ3RQb2ludHNBbmRUYW5nZW50cyA9IHRoaXMuZ2V0U3JjVGd0UG9pbnRzQW5kVGFuZ2VudHMoZWRnZSk7XHJcblxyXG4gICAgdmFyIHdlaWdodHMgPSBbXTtcclxuICAgIHZhciBkaXN0YW5jZXMgPSBbXTtcclxuXHJcbiAgICBmb3IgKHZhciBpID0gMDsgYW5jaG9yUG9pbnRzICYmIGkgPCBhbmNob3JQb2ludHMubGVuZ3RoOyBpKyspIHtcclxuICAgICAgdmFyIGFuY2hvciA9IGFuY2hvclBvaW50c1tpXTtcclxuICAgICAgdmFyIHJlbGF0aXZlQW5jaG9yUG9zaXRpb24gPSB0aGlzLmNvbnZlcnRUb1JlbGF0aXZlUG9zaXRpb24oZWRnZSwgYW5jaG9yLCBzcmNUZ3RQb2ludHNBbmRUYW5nZW50cyk7XHJcblxyXG4gICAgICB3ZWlnaHRzLnB1c2gocmVsYXRpdmVBbmNob3JQb3NpdGlvbi53ZWlnaHQpO1xyXG4gICAgICBkaXN0YW5jZXMucHVzaChyZWxhdGl2ZUFuY2hvclBvc2l0aW9uLmRpc3RhbmNlKTtcclxuICAgIH1cclxuXHJcbiAgICByZXR1cm4ge1xyXG4gICAgICB3ZWlnaHRzOiB3ZWlnaHRzLFxyXG4gICAgICBkaXN0YW5jZXM6IGRpc3RhbmNlc1xyXG4gICAgfTtcclxuICB9LFxyXG4gIGdldERpc3RhbmNlc1N0cmluZzogZnVuY3Rpb24gKGVkZ2UsIHR5cGUpIHtcclxuICAgIHZhciBzdHIgPSBcIlwiO1xyXG5cclxuICAgIHZhciBkaXN0YW5jZXMgPSBlZGdlLmRhdGEodGhpcy5zeW50YXhbdHlwZV1bJ2Rpc3RhbmNlJ10pO1xyXG4gICAgZm9yICh2YXIgaSA9IDA7IGRpc3RhbmNlcyAmJiBpIDwgZGlzdGFuY2VzLmxlbmd0aDsgaSsrKSB7XHJcbiAgICAgIHN0ciA9IHN0ciArIFwiIFwiICsgZGlzdGFuY2VzW2ldO1xyXG4gICAgfVxyXG4gICAgXHJcbiAgICByZXR1cm4gc3RyO1xyXG4gIH0sXHJcbiAgZ2V0V2VpZ2h0c1N0cmluZzogZnVuY3Rpb24gKGVkZ2UsIHR5cGUpIHtcclxuICAgIHZhciBzdHIgPSBcIlwiO1xyXG5cclxuICAgIHZhciB3ZWlnaHRzID0gZWRnZS5kYXRhKHRoaXMuc3ludGF4W3R5cGVdWyd3ZWlnaHQnXSk7XHJcbiAgICBmb3IgKHZhciBpID0gMDsgd2VpZ2h0cyAmJiBpIDwgd2VpZ2h0cy5sZW5ndGg7IGkrKykge1xyXG4gICAgICBzdHIgPSBzdHIgKyBcIiBcIiArIHdlaWdodHNbaV07XHJcbiAgICB9XHJcbiAgICBcclxuICAgIHJldHVybiBzdHI7XHJcbiAgfSxcclxuICBhZGRBbmNob3JQb2ludDogZnVuY3Rpb24oZWRnZSwgbmV3QW5jaG9yUG9pbnQpIHtcclxuICAgIGlmKGVkZ2UgPT09IHVuZGVmaW5lZCB8fCBuZXdBbmNob3JQb2ludCA9PT0gdW5kZWZpbmVkKXtcclxuICAgICAgZWRnZSA9IHRoaXMuY3VycmVudEN0eEVkZ2U7XHJcbiAgICAgIG5ld0FuY2hvclBvaW50ID0gdGhpcy5jdXJyZW50Q3R4UG9zO1xyXG4gICAgfVxyXG4gIFxyXG4gICAgdmFyIHR5cGUgPSB0aGlzLmdldEVkZ2VUeXBlKGVkZ2UpO1xyXG5cclxuICAgIGlmKHR5cGUgPT09ICdpbmNvbmNsdXNpdmUnKXtcclxuICAgICAgcmV0dXJuO1xyXG4gICAgfVxyXG5cclxuICAgIHZhciB3ZWlnaHRTdHIgPSB0aGlzLnN5bnRheFt0eXBlXVsnd2VpZ2h0J107XHJcbiAgICB2YXIgZGlzdGFuY2VTdHIgPSB0aGlzLnN5bnRheFt0eXBlXVsnZGlzdGFuY2UnXTtcclxuXHJcbiAgICB2YXIgcmVsYXRpdmVQb3NpdGlvbiA9IHRoaXMuY29udmVydFRvUmVsYXRpdmVQb3NpdGlvbihlZGdlLCBuZXdBbmNob3JQb2ludCk7XHJcbiAgICB2YXIgb3JpZ2luYWxBbmNob3JXZWlnaHQgPSByZWxhdGl2ZVBvc2l0aW9uLndlaWdodDtcclxuICAgIFxyXG4gICAgdmFyIHN0YXJ0WCA9IGVkZ2Uuc291cmNlKCkucG9zaXRpb24oJ3gnKTtcclxuICAgIHZhciBzdGFydFkgPSBlZGdlLnNvdXJjZSgpLnBvc2l0aW9uKCd5Jyk7XHJcbiAgICB2YXIgZW5kWCA9IGVkZ2UudGFyZ2V0KCkucG9zaXRpb24oJ3gnKTtcclxuICAgIHZhciBlbmRZID0gZWRnZS50YXJnZXQoKS5wb3NpdGlvbigneScpO1xyXG4gICAgdmFyIHN0YXJ0V2VpZ2h0ID0gdGhpcy5jb252ZXJ0VG9SZWxhdGl2ZVBvc2l0aW9uKGVkZ2UsIHt4OiBzdGFydFgsIHk6IHN0YXJ0WX0pLndlaWdodDtcclxuICAgIHZhciBlbmRXZWlnaHQgPSB0aGlzLmNvbnZlcnRUb1JlbGF0aXZlUG9zaXRpb24oZWRnZSwge3g6IGVuZFgsIHk6IGVuZFl9KS53ZWlnaHQ7XHJcbiAgICB2YXIgd2VpZ2h0c1dpdGhUZ3RTcmMgPSBbc3RhcnRXZWlnaHRdLmNvbmNhdChlZGdlLmRhdGEod2VpZ2h0U3RyKT9lZGdlLmRhdGEod2VpZ2h0U3RyKTpbXSkuY29uY2F0KFtlbmRXZWlnaHRdKTtcclxuICAgIFxyXG4gICAgdmFyIGFuY2hvcnNMaXN0ID0gdGhpcy5nZXRBbmNob3JzQXNBcnJheShlZGdlKTtcclxuICAgIFxyXG4gICAgdmFyIG1pbkRpc3QgPSBJbmZpbml0eTtcclxuICAgIHZhciBpbnRlcnNlY3Rpb247XHJcbiAgICB2YXIgcHRzV2l0aFRndFNyYyA9IFtzdGFydFgsIHN0YXJ0WV1cclxuICAgICAgICAgICAgLmNvbmNhdChhbmNob3JzTGlzdD9hbmNob3JzTGlzdDpbXSlcclxuICAgICAgICAgICAgLmNvbmNhdChbZW5kWCwgZW5kWV0pO1xyXG4gICAgdmFyIG5ld0FuY2hvckluZGV4ID0gLTE7XHJcbiAgICBcclxuICAgIGZvcih2YXIgaSA9IDA7IGkgPCB3ZWlnaHRzV2l0aFRndFNyYy5sZW5ndGggLSAxOyBpKyspe1xyXG4gICAgICB2YXIgdzEgPSB3ZWlnaHRzV2l0aFRndFNyY1tpXTtcclxuICAgICAgdmFyIHcyID0gd2VpZ2h0c1dpdGhUZ3RTcmNbaSArIDFdO1xyXG4gICAgICBcclxuICAgICAgLy9jaGVjayBpZiB0aGUgd2VpZ2h0IGlzIGJldHdlZW4gdzEgYW5kIHcyXHJcbiAgICAgIGNvbnN0IGIxID0gdGhpcy5jb21wYXJlV2l0aFByZWNpc2lvbihvcmlnaW5hbEFuY2hvcldlaWdodCwgdzEsIHRydWUpO1xyXG4gICAgICBjb25zdCBiMiA9IHRoaXMuY29tcGFyZVdpdGhQcmVjaXNpb24ob3JpZ2luYWxBbmNob3JXZWlnaHQsIHcyKTtcclxuICAgICAgY29uc3QgYjMgPSB0aGlzLmNvbXBhcmVXaXRoUHJlY2lzaW9uKG9yaWdpbmFsQW5jaG9yV2VpZ2h0LCB3MiwgdHJ1ZSk7XHJcbiAgICAgIGNvbnN0IGI0ID0gdGhpcy5jb21wYXJlV2l0aFByZWNpc2lvbihvcmlnaW5hbEFuY2hvcldlaWdodCwgdzEpO1xyXG4gICAgICBpZiggKGIxICYmIGIyKSB8fCAoYjMgJiYgYjQpKXtcclxuICAgICAgICB2YXIgc3RhcnRYID0gcHRzV2l0aFRndFNyY1syICogaV07XHJcbiAgICAgICAgdmFyIHN0YXJ0WSA9IHB0c1dpdGhUZ3RTcmNbMiAqIGkgKyAxXTtcclxuICAgICAgICB2YXIgZW5kWCA9IHB0c1dpdGhUZ3RTcmNbMiAqIGkgKyAyXTtcclxuICAgICAgICB2YXIgZW5kWSA9IHB0c1dpdGhUZ3RTcmNbMiAqIGkgKyAzXTtcclxuICAgICAgICBcclxuICAgICAgICB2YXIgc3RhcnQgPSB7XHJcbiAgICAgICAgICB4OiBzdGFydFgsXHJcbiAgICAgICAgICB5OiBzdGFydFlcclxuICAgICAgICB9O1xyXG4gICAgICAgIFxyXG4gICAgICAgIHZhciBlbmQgPSB7XHJcbiAgICAgICAgICB4OiBlbmRYLFxyXG4gICAgICAgICAgeTogZW5kWVxyXG4gICAgICAgIH07XHJcbiAgICAgICAgXHJcbiAgICAgICAgdmFyIG0xID0gKCBzdGFydFkgLSBlbmRZICkgLyAoIHN0YXJ0WCAtIGVuZFggKTtcclxuICAgICAgICB2YXIgbTIgPSAtMSAvIG0xO1xyXG4gICAgICAgIFxyXG4gICAgICAgIHZhciBzcmNUZ3RQb2ludHNBbmRUYW5nZW50cyA9IHtcclxuICAgICAgICAgIHNyY1BvaW50OiBzdGFydCxcclxuICAgICAgICAgIHRndFBvaW50OiBlbmQsXHJcbiAgICAgICAgICBtMTogbTEsXHJcbiAgICAgICAgICBtMjogbTJcclxuICAgICAgICB9O1xyXG4gICAgICAgIFxyXG4gICAgICAgIHZhciBjdXJyZW50SW50ZXJzZWN0aW9uID0gdGhpcy5nZXRJbnRlcnNlY3Rpb24oZWRnZSwgbmV3QW5jaG9yUG9pbnQsIHNyY1RndFBvaW50c0FuZFRhbmdlbnRzKTtcclxuICAgICAgICB2YXIgZGlzdCA9IE1hdGguc3FydCggTWF0aC5wb3coIChuZXdBbmNob3JQb2ludC54IC0gY3VycmVudEludGVyc2VjdGlvbi54KSwgMiApIFxyXG4gICAgICAgICAgICAgICAgKyBNYXRoLnBvdyggKG5ld0FuY2hvclBvaW50LnkgLSBjdXJyZW50SW50ZXJzZWN0aW9uLnkpLCAyICkpO1xyXG4gICAgICAgIFxyXG4gICAgICAgIC8vVXBkYXRlIHRoZSBtaW5pbXVtIGRpc3RhbmNlXHJcbiAgICAgICAgaWYoZGlzdCA8IG1pbkRpc3Qpe1xyXG4gICAgICAgICAgbWluRGlzdCA9IGRpc3Q7XHJcbiAgICAgICAgICBpbnRlcnNlY3Rpb24gPSBjdXJyZW50SW50ZXJzZWN0aW9uO1xyXG4gICAgICAgICAgbmV3QW5jaG9ySW5kZXggPSBpO1xyXG4gICAgICAgIH1cclxuICAgICAgfVxyXG4gICAgfVxyXG4gICAgXHJcbiAgICBpZihpbnRlcnNlY3Rpb24gIT09IHVuZGVmaW5lZCl7XHJcbiAgICAgIG5ld0FuY2hvclBvaW50ID0gaW50ZXJzZWN0aW9uO1xyXG4gICAgfVxyXG4gICAgXHJcbiAgICByZWxhdGl2ZVBvc2l0aW9uID0gdGhpcy5jb252ZXJ0VG9SZWxhdGl2ZVBvc2l0aW9uKGVkZ2UsIG5ld0FuY2hvclBvaW50KTtcclxuICAgIFxyXG4gICAgaWYoaW50ZXJzZWN0aW9uID09PSB1bmRlZmluZWQpe1xyXG4gICAgICByZWxhdGl2ZVBvc2l0aW9uLmRpc3RhbmNlID0gMDtcclxuICAgIH1cclxuXHJcbiAgICB2YXIgd2VpZ2h0cyA9IGVkZ2UuZGF0YSh3ZWlnaHRTdHIpO1xyXG4gICAgdmFyIGRpc3RhbmNlcyA9IGVkZ2UuZGF0YShkaXN0YW5jZVN0cik7XHJcbiAgICBcclxuICAgIHdlaWdodHMgPSB3ZWlnaHRzP3dlaWdodHM6W107XHJcbiAgICBkaXN0YW5jZXMgPSBkaXN0YW5jZXM/ZGlzdGFuY2VzOltdO1xyXG4gICAgXHJcbiAgICBpZih3ZWlnaHRzLmxlbmd0aCA9PT0gMCkge1xyXG4gICAgICBuZXdBbmNob3JJbmRleCA9IDA7XHJcbiAgICB9XHJcbiAgICBcclxuLy8gICAgd2VpZ2h0cy5wdXNoKHJlbGF0aXZlQmVuZFBvc2l0aW9uLndlaWdodCk7XHJcbi8vICAgIGRpc3RhbmNlcy5wdXNoKHJlbGF0aXZlQmVuZFBvc2l0aW9uLmRpc3RhbmNlKTtcclxuICAgIGlmKG5ld0FuY2hvckluZGV4ICE9IC0xKXtcclxuICAgICAgd2VpZ2h0cy5zcGxpY2UobmV3QW5jaG9ySW5kZXgsIDAsIHJlbGF0aXZlUG9zaXRpb24ud2VpZ2h0KTtcclxuICAgICAgZGlzdGFuY2VzLnNwbGljZShuZXdBbmNob3JJbmRleCwgMCwgcmVsYXRpdmVQb3NpdGlvbi5kaXN0YW5jZSk7XHJcbiAgICB9XHJcbiAgIFxyXG4gICAgZWRnZS5kYXRhKHdlaWdodFN0ciwgd2VpZ2h0cyk7XHJcbiAgICBlZGdlLmRhdGEoZGlzdGFuY2VTdHIsIGRpc3RhbmNlcyk7XHJcbiAgICBcclxuICAgIGVkZ2UuYWRkQ2xhc3ModGhpcy5zeW50YXhbdHlwZV1bJ2NsYXNzJ10pO1xyXG4gICAgZWRnZS5yZW1vdmVDbGFzcyh0aGlzLnN5bnRheFt0eXBlXVsnd2FzJ10pO1xyXG4gICAgXHJcbiAgICByZXR1cm4gbmV3QW5jaG9ySW5kZXg7XHJcbiAgfSxcclxuICByZW1vdmVBbmNob3I6IGZ1bmN0aW9uKGVkZ2UsIGFuY2hvckluZGV4KXtcclxuICAgIGlmKGVkZ2UgPT09IHVuZGVmaW5lZCB8fCBhbmNob3JJbmRleCA9PT0gdW5kZWZpbmVkKXtcclxuICAgICAgZWRnZSA9IHRoaXMuY3VycmVudEN0eEVkZ2U7XHJcbiAgICAgIGFuY2hvckluZGV4ID0gdGhpcy5jdXJyZW50QW5jaG9ySW5kZXg7XHJcbiAgICB9XHJcbiAgICBcclxuICAgIHZhciB0eXBlID0gdGhpcy5nZXRFZGdlVHlwZShlZGdlKTtcclxuXHJcbiAgICBpZih0aGlzLmVkZ2VUeXBlSW5jb25jbHVzaXZlU2hvdWxkbnRIYXBwZW4odHlwZSwgXCJhbmNob3JQb2ludFV0aWxpdGllcy5qcywgcmVtb3ZlQW5jaG9yXCIpKXtcclxuICAgICAgcmV0dXJuO1xyXG4gICAgfVxyXG5cclxuICAgIHZhciBkaXN0YW5jZVN0ciA9IHRoaXMuc3ludGF4W3R5cGVdWyd3ZWlnaHQnXTtcclxuICAgIHZhciB3ZWlnaHRTdHIgPSB0aGlzLnN5bnRheFt0eXBlXVsnZGlzdGFuY2UnXTtcclxuXHJcbiAgICB2YXIgZGlzdGFuY2VzID0gZWRnZS5kYXRhKGRpc3RhbmNlU3RyKTtcclxuICAgIHZhciB3ZWlnaHRzID0gZWRnZS5kYXRhKHdlaWdodFN0cik7XHJcbiAgICBcclxuICAgIGRpc3RhbmNlcy5zcGxpY2UoYW5jaG9ySW5kZXgsIDEpO1xyXG4gICAgd2VpZ2h0cy5zcGxpY2UoYW5jaG9ySW5kZXgsIDEpO1xyXG4gICAgXHJcbiAgICAvLyBubyBtb3JlIGFuY2hvciBwb2ludHMgb24gZWRnZVxyXG4gICAgaWYoZGlzdGFuY2VzLmxlbmd0aCA9PSAwIHx8IHdlaWdodHMubGVuZ3RoID09IDApe1xyXG4gICAgICBlZGdlLnJlbW92ZUNsYXNzKHRoaXMuc3ludGF4W3R5cGVdWydjbGFzcyddKTtcclxuICAgICAgZWRnZS5hZGRDbGFzcyh0aGlzLnN5bnRheFt0eXBlXVsnd2FzJ10pO1xyXG4gICAgICBlZGdlLmRhdGEoZGlzdGFuY2VTdHIsIFtdKTtcclxuICAgICAgZWRnZS5kYXRhKHdlaWdodFN0ciwgW10pO1xyXG4gICAgfVxyXG4gICAgZWxzZSB7XHJcbiAgICAgIGVkZ2UuZGF0YShkaXN0YW5jZVN0ciwgZGlzdGFuY2VzKTtcclxuICAgICAgZWRnZS5kYXRhKHdlaWdodFN0ciwgd2VpZ2h0cyk7XHJcbiAgICB9XHJcbiAgfSxcclxuICBjYWxjdWxhdGVEaXN0YW5jZTogZnVuY3Rpb24ocHQxLCBwdDIpIHtcclxuICAgIHZhciBkaWZmWCA9IHB0MS54IC0gcHQyLng7XHJcbiAgICB2YXIgZGlmZlkgPSBwdDEueSAtIHB0Mi55O1xyXG4gICAgXHJcbiAgICB2YXIgZGlzdCA9IE1hdGguc3FydCggTWF0aC5wb3coIGRpZmZYLCAyICkgKyBNYXRoLnBvdyggZGlmZlksIDIgKSApO1xyXG4gICAgcmV0dXJuIGRpc3Q7XHJcbiAgfSxcclxuICAvKiogKExlc3MgdGhhbiBvciBlcXVhbCB0bykgYW5kIChncmVhdGVyIHRoZW4gZXF1YWwgdG8pIGNvbXBhcmlzb25zIHdpdGggZmxvYXRpbmcgcG9pbnQgbnVtYmVycyAqL1xyXG4gIGNvbXBhcmVXaXRoUHJlY2lzaW9uOiBmdW5jdGlvbiAobjEsIG4yLCBpc0xlc3NUaGVuT3JFcXVhbCA9IGZhbHNlLCBwcmVjaXNpb24gPSAwLjAxKSB7XHJcbiAgICBjb25zdCBkaWZmID0gbjEgLSBuMjtcclxuICAgIGlmIChNYXRoLmFicyhkaWZmKSA8PSBwcmVjaXNpb24pIHtcclxuICAgICAgcmV0dXJuIHRydWU7XHJcbiAgICB9XHJcbiAgICBpZiAoaXNMZXNzVGhlbk9yRXF1YWwpIHtcclxuICAgICAgcmV0dXJuIG4xIDwgbjI7XHJcbiAgICB9IGVsc2Uge1xyXG4gICAgICByZXR1cm4gbjEgPiBuMjtcclxuICAgIH1cclxuICB9LFxyXG4gIGVkZ2VUeXBlSW5jb25jbHVzaXZlU2hvdWxkbnRIYXBwZW46IGZ1bmN0aW9uKHR5cGUsIHBsYWNlKXtcclxuICAgIGlmKHR5cGUgPT09ICdpbmNvbmNsdXNpdmUnKSB7XHJcbiAgICAgIGNvbnNvbGUubG9nKGBJbiAke3BsYWNlfTogZWRnZSB0eXBlIGluY29uY2x1c2l2ZSBzaG91bGQgbmV2ZXIgaGFwcGVuIGhlcmUhIWApO1xyXG4gICAgICByZXR1cm4gdHJ1ZTtcclxuICAgIH1cclxuICAgIHJldHVybiBmYWxzZTtcclxuICB9XHJcbn07XHJcblxyXG5tb2R1bGUuZXhwb3J0cyA9IGFuY2hvclBvaW50VXRpbGl0aWVzO1xyXG4iLCJ2YXIgZGVib3VuY2UgPSByZXF1aXJlKCcuL2RlYm91bmNlJyk7XHJcbnZhciBhbmNob3JQb2ludFV0aWxpdGllcyA9IHJlcXVpcmUoJy4vQW5jaG9yUG9pbnRVdGlsaXRpZXMnKTtcclxudmFyIHJlY29ubmVjdGlvblV0aWxpdGllcyA9IHJlcXVpcmUoJy4vcmVjb25uZWN0aW9uVXRpbGl0aWVzJyk7XHJcbnZhciByZWdpc3RlclVuZG9SZWRvRnVuY3Rpb25zID0gcmVxdWlyZSgnLi9yZWdpc3RlclVuZG9SZWRvRnVuY3Rpb25zJyk7XHJcblxyXG5tb2R1bGUuZXhwb3J0cyA9IGZ1bmN0aW9uIChwYXJhbXMsIGN5KSB7XHJcbiAgdmFyIGZuID0gcGFyYW1zO1xyXG5cclxuICB2YXIgYWRkQmVuZFBvaW50Q3h0TWVudUlkID0gJ2N5LWVkZ2UtYmVuZC1lZGl0aW5nLWN4dC1hZGQtYmVuZC1wb2ludCc7XHJcbiAgdmFyIHJlbW92ZUJlbmRQb2ludEN4dE1lbnVJZCA9ICdjeS1lZGdlLWJlbmQtZWRpdGluZy1jeHQtcmVtb3ZlLWJlbmQtcG9pbnQnO1xyXG4gIHZhciBhZGRDb250cm9sUG9pbnRDeHRNZW51SWQgPSAnY3ktZWRnZS1jb250cm9sLWVkaXRpbmctY3h0LWFkZC1jb250cm9sLXBvaW50JztcclxuICB2YXIgcmVtb3ZlQ29udHJvbFBvaW50Q3h0TWVudUlkID0gJ2N5LWVkZ2UtY29udHJvbC1lZGl0aW5nLWN4dC1yZW1vdmUtY29udHJvbC1wb2ludCc7XHJcbiAgdmFyIGVTdHlsZSwgZVJlbW92ZSwgZUFkZCwgZVpvb20sIGVTZWxlY3QsIGVVbnNlbGVjdCwgZVRhcFN0YXJ0LCBlVGFwU3RhcnRPbkVkZ2UsIGVUYXBEcmFnLCBlVGFwRW5kLCBlQ3h0VGFwLCBlRHJhZztcclxuICAvLyBsYXN0IHN0YXR1cyBvZiBnZXN0dXJlc1xyXG4gIHZhciBsYXN0UGFubmluZ0VuYWJsZWQsIGxhc3Rab29taW5nRW5hYmxlZCwgbGFzdEJveFNlbGVjdGlvbkVuYWJsZWQ7XHJcbiAgdmFyIGxhc3RBY3RpdmVCZ09wYWNpdHk7XHJcbiAgLy8gc3RhdHVzIG9mIGVkZ2UgdG8gaGlnaGxpZ2h0IGJlbmRzIGFuZCBzZWxlY3RlZCBlZGdlc1xyXG4gIHZhciBlZGdlVG9IaWdobGlnaHQsIG51bWJlck9mU2VsZWN0ZWRFZGdlcztcclxuXHJcbiAgLy8gdGhlIEthbnZhLnNoYXBlKCkgZm9yIHRoZSBlbmRwb2ludHNcclxuICB2YXIgZW5kcG9pbnRTaGFwZTEgPSBudWxsLCBlbmRwb2ludFNoYXBlMiA9IG51bGw7XHJcbiAgLy8gdXNlZCB0byBzdG9wIGNlcnRhaW4gY3kgbGlzdGVuZXJzIHdoZW4gaW50ZXJyYWN0aW5nIHdpdGggYW5jaG9yc1xyXG4gIHZhciBhbmNob3JUb3VjaGVkID0gZmFsc2U7XHJcbiAgLy8gdXNlZCBjYWxsIGVNb3VzZURvd24gb2YgYW5jaG9yTWFuYWdlciBpZiB0aGUgbW91c2UgaXMgb3V0IG9mIHRoZSBjb250ZW50IG9uIGN5Lm9uKHRhcGVuZClcclxuICB2YXIgbW91c2VPdXQ7XHJcbiAgXHJcbiAgdmFyIGZ1bmN0aW9ucyA9IHtcclxuICAgIGluaXQ6IGZ1bmN0aW9uICgpIHtcclxuICAgICAgLy8gcmVnaXN0ZXIgdW5kbyByZWRvIGZ1bmN0aW9uc1xyXG4gICAgICByZWdpc3RlclVuZG9SZWRvRnVuY3Rpb25zKGN5LCBhbmNob3JQb2ludFV0aWxpdGllcywgcGFyYW1zKTtcclxuICAgICAgXHJcbiAgICAgIHZhciBzZWxmID0gdGhpcztcclxuICAgICAgdmFyIG9wdHMgPSBwYXJhbXM7XHJcbiAgICAgIHZhciAkY29udGFpbmVyID0gJCh0aGlzKTtcclxuICAgICAgXHJcbiAgICAgIHZhciBjYW52YXNFbGVtZW50SWQgPSAnY3ktZWRnZS1lZGl0aW5nLXN0YWdlJztcclxuICAgICAgdmFyICRjYW52YXNFbGVtZW50ID0gJCgnPGRpdiBpZD1cIicgKyBjYW52YXNFbGVtZW50SWQgKyAnXCI+PC9kaXY+Jyk7XHJcbiAgICAgICRjb250YWluZXIuYXBwZW5kKCRjYW52YXNFbGVtZW50KTtcclxuXHJcbiAgICAgIHZhciBzdGFnZSA9IG5ldyBLb252YS5TdGFnZSh7XHJcbiAgICAgICAgICBjb250YWluZXI6IGNhbnZhc0VsZW1lbnRJZCwgICAvLyBpZCBvZiBjb250YWluZXIgPGRpdj5cclxuICAgICAgICAgIHdpZHRoOiAkY29udGFpbmVyLndpZHRoKCksXHJcbiAgICAgICAgICBoZWlnaHQ6ICRjb250YWluZXIuaGVpZ2h0KClcclxuICAgICAgfSk7XHJcblxyXG4gICAgICAvLyB0aGVuIGNyZWF0ZSBsYXllclxyXG4gICAgICB2YXIgY2FudmFzID0gbmV3IEtvbnZhLkxheWVyKCk7XHJcbiAgICAgIC8vIGFkZCB0aGUgbGF5ZXIgdG8gdGhlIHN0YWdlXHJcbiAgICAgIHN0YWdlLmFkZChjYW52YXMpO1xyXG5cclxuICAgICAgdmFyIGFuY2hvck1hbmFnZXIgPSB7XHJcbiAgICAgICAgZWRnZTogdW5kZWZpbmVkLFxyXG4gICAgICAgIGVkZ2VUeXBlOiAnaW5jb25jbHVzaXZlJyxcclxuICAgICAgICBhbmNob3JzOiBbXSxcclxuICAgICAgICAvLyByZW1lbWJlcnMgdGhlIHRvdWNoZWQgYW5jaG9yIHRvIGF2b2lkIGNsZWFyaW5nIGl0IHdoZW4gZHJhZ2dpbmcgaGFwcGVuc1xyXG4gICAgICAgIHRvdWNoZWRBbmNob3I6IHVuZGVmaW5lZCxcclxuICAgICAgICAvLyByZW1lbWJlcnMgdGhlIGluZGV4IG9mIHRoZSBtb3ZpbmcgYW5jaG9yXHJcbiAgICAgICAgdG91Y2hlZEFuY2hvckluZGV4OiB1bmRlZmluZWQsXHJcbiAgICAgICAgYmluZExpc3RlbmVyczogZnVuY3Rpb24oYW5jaG9yKXtcclxuICAgICAgICAgIGFuY2hvci5vbihcIm1vdXNlZG93biB0b3VjaHN0YXJ0XCIsIHRoaXMuZU1vdXNlRG93bik7XHJcbiAgICAgICAgfSxcclxuICAgICAgICB1bmJpbmRMaXN0ZW5lcnM6IGZ1bmN0aW9uKGFuY2hvcil7XHJcbiAgICAgICAgICBhbmNob3Iub2ZmKFwibW91c2Vkb3duIHRvdWNoc3RhcnRcIiwgdGhpcy5lTW91c2VEb3duKTtcclxuICAgICAgICB9LFxyXG4gICAgICAgIC8vIGdldHMgdHJpZ2dlciBvbiBjbGlja2luZyBvbiBjb250ZXh0IG1lbnVzLCB3aGlsZSBjeSBsaXN0ZW5lcnMgZG9uJ3QgZ2V0IHRyaWdnZXJlZFxyXG4gICAgICAgIC8vIGl0IGNhbiBjYXVzZSB3ZWlyZCBiZWhhdmlvdXIgaWYgbm90IGF3YXJlIG9mIHRoaXNcclxuICAgICAgICBlTW91c2VEb3duOiBmdW5jdGlvbihldmVudCl7XHJcbiAgICAgICAgICAvLyBhbmNob3JNYW5hZ2VyLmVkZ2UudW5zZWxlY3QoKSB3b24ndCB3b3JrIHNvbWV0aW1lcyBpZiB0aGlzIHdhc24ndCBoZXJlXHJcbiAgICAgICAgICBjeS5hdXRvdW5zZWxlY3RpZnkoZmFsc2UpO1xyXG5cclxuICAgICAgICAgIC8vIGVNb3VzZURvd24oc2V0KSAtPiB0YXBkcmFnKHVzZWQpIC0+IGVNb3VzZVVwKHJlc2V0KVxyXG4gICAgICAgICAgYW5jaG9yVG91Y2hlZCA9IHRydWU7XHJcbiAgICAgICAgICBhbmNob3JNYW5hZ2VyLnRvdWNoZWRBbmNob3IgPSBldmVudC50YXJnZXQ7XHJcbiAgICAgICAgICBtb3VzZU91dCA9IGZhbHNlO1xyXG4gICAgICAgICAgYW5jaG9yTWFuYWdlci5lZGdlLnVuc2VsZWN0KCk7XHJcblxyXG4gICAgICAgICAgLy8gcmVtZW1iZXIgc3RhdGUgYmVmb3JlIGNoYW5naW5nXHJcbiAgICAgICAgICB2YXIgd2VpZ2h0U3RyID0gYW5jaG9yUG9pbnRVdGlsaXRpZXMuc3ludGF4W2FuY2hvck1hbmFnZXIuZWRnZVR5cGVdWyd3ZWlnaHQnXTtcclxuICAgICAgICAgIHZhciBkaXN0YW5jZVN0ciA9IGFuY2hvclBvaW50VXRpbGl0aWVzLnN5bnRheFthbmNob3JNYW5hZ2VyLmVkZ2VUeXBlXVsnZGlzdGFuY2UnXTtcclxuXHJcbiAgICAgICAgICB2YXIgZWRnZSA9IGFuY2hvck1hbmFnZXIuZWRnZTtcclxuICAgICAgICAgIG1vdmVBbmNob3JQYXJhbSA9IHtcclxuICAgICAgICAgICAgZWRnZTogZWRnZSxcclxuICAgICAgICAgICAgd2VpZ2h0czogZWRnZS5kYXRhKHdlaWdodFN0cikgPyBbXS5jb25jYXQoZWRnZS5kYXRhKHdlaWdodFN0cikpIDogW10sXHJcbiAgICAgICAgICAgIGRpc3RhbmNlczogZWRnZS5kYXRhKGRpc3RhbmNlU3RyKSA/IFtdLmNvbmNhdChlZGdlLmRhdGEoZGlzdGFuY2VTdHIpKSA6IFtdXHJcbiAgICAgICAgICB9O1xyXG5cclxuICAgICAgICAgIHR1cm5PZmZBY3RpdmVCZ0NvbG9yKCk7XHJcbiAgICAgICAgICBkaXNhYmxlR2VzdHVyZXMoKTtcclxuICAgICAgICAgIFxyXG4gICAgICAgICAgY3kuYXV0b3VuZ3JhYmlmeSh0cnVlKTtcclxuXHJcbiAgICAgICAgICBjYW52YXMuZ2V0U3RhZ2UoKS5vbihcImNvbnRlbnRUb3VjaGVuZCBjb250ZW50TW91c2V1cFwiLCBhbmNob3JNYW5hZ2VyLmVNb3VzZVVwKTtcclxuICAgICAgICAgIGNhbnZhcy5nZXRTdGFnZSgpLm9uKFwiY29udGVudE1vdXNlb3V0XCIsIGFuY2hvck1hbmFnZXIuZU1vdXNlT3V0KTtcclxuICAgICAgICB9LFxyXG4gICAgICAgIC8vIGdldHMgY2FsbGVkIGJlZm9yZSBjeS5vbigndGFwZW5kJylcclxuICAgICAgICBlTW91c2VVcDogZnVuY3Rpb24oZXZlbnQpe1xyXG4gICAgICAgICAgLy8gd29uJ3QgYmUgY2FsbGVkIGlmIHRoZSBtb3VzZSBpcyByZWxlYXNlZCBvdXQgb2Ygc2NyZWVuXHJcbiAgICAgICAgICBhbmNob3JUb3VjaGVkID0gZmFsc2U7XHJcbiAgICAgICAgICBhbmNob3JNYW5hZ2VyLnRvdWNoZWRBbmNob3IgPSB1bmRlZmluZWQ7XHJcbiAgICAgICAgICBtb3VzZU91dCA9IGZhbHNlO1xyXG4gICAgICAgICAgYW5jaG9yTWFuYWdlci5lZGdlLnNlbGVjdCgpO1xyXG4gICAgICAgICAgXHJcbiAgICAgICAgICByZXNldEFjdGl2ZUJnQ29sb3IoKTtcclxuICAgICAgICAgIHJlc2V0R2VzdHVyZXMoKTtcclxuICAgICAgICAgIFxyXG4gICAgICAgICAgLyogXHJcbiAgICAgICAgICAgKiBJTVBPUlRBTlRcclxuICAgICAgICAgICAqIEFueSBwcm9ncmFtbWF0aWMgY2FsbHMgdG8gLnNlbGVjdCgpLCAudW5zZWxlY3QoKSBhZnRlciB0aGlzIHN0YXRlbWVudCBhcmUgaWdub3JlZFxyXG4gICAgICAgICAgICogdW50aWwgY3kuYXV0b3Vuc2VsZWN0aWZ5KGZhbHNlKSBpcyBjYWxsZWQgaW4gb25lIG9mIHRoZSBwcmV2aW91czpcclxuICAgICAgICAgICAqIFxyXG4gICAgICAgICAgICogY3kub24oJ3RhcHN0YXJ0JylcclxuICAgICAgICAgICAqIGFuY2hvci5vbignbW91c2Vkb3duIHRvdWNoc3RhcnQnKVxyXG4gICAgICAgICAgICogZG9jdW1lbnQub24oJ2tleWRvd24nKVxyXG4gICAgICAgICAgICogY3kub24oJ3RhcGRyYXAnKVxyXG4gICAgICAgICAgICogXHJcbiAgICAgICAgICAgKiBEb2Vzbid0IGFmZmVjdCBVWCwgYnV0IG1heSBjYXVzZSBjb25mdXNpbmcgYmVoYXZpb3VyIGlmIG5vdCBhd2FyZSBvZiB0aGlzIHdoZW4gY29kaW5nXHJcbiAgICAgICAgICAgKiBcclxuICAgICAgICAgICAqIFdoeSBpcyB0aGlzIGhlcmU/XHJcbiAgICAgICAgICAgKiBUaGlzIGlzIGltcG9ydGFudCB0byBrZWVwIGVkZ2VzIGZyb20gYmVpbmcgYXV0byBkZXNlbGVjdGVkIGZyb20gd29ya2luZ1xyXG4gICAgICAgICAgICogd2l0aCBhbmNob3JzIG91dCBvZiB0aGUgZWRnZSBib2R5IChmb3IgdW5idW5kbGVkIGJlemllciwgdGVjaG5pY2FsbHkgbm90IG5lY2Vzc2VyeSBmb3Igc2VnZW1lbnRzKS5cclxuICAgICAgICAgICAqIFxyXG4gICAgICAgICAgICogVGhlc2UgaXMgYW50aGVyIGN5LmF1dG9zZWxlY3RpZnkodHJ1ZSkgaW4gY3kub24oJ3RhcGVuZCcpIFxyXG4gICAgICAgICAgICogXHJcbiAgICAgICAgICAqLyBcclxuICAgICAgICAgIGN5LmF1dG91bnNlbGVjdGlmeSh0cnVlKTtcclxuICAgICAgICAgIGN5LmF1dG91bmdyYWJpZnkoZmFsc2UpO1xyXG5cclxuICAgICAgICAgIGNhbnZhcy5nZXRTdGFnZSgpLm9mZihcImNvbnRlbnRUb3VjaGVuZCBjb250ZW50TW91c2V1cFwiLCBhbmNob3JNYW5hZ2VyLmVNb3VzZVVwKTtcclxuICAgICAgICAgIGNhbnZhcy5nZXRTdGFnZSgpLm9mZihcImNvbnRlbnRNb3VzZW91dFwiLCBhbmNob3JNYW5hZ2VyLmVNb3VzZU91dCk7XHJcbiAgICAgICAgfSxcclxuICAgICAgICAvLyBoYW5kbGUgbW91c2UgZ29pbmcgb3V0IG9mIGNhbnZhcyBcclxuICAgICAgICBlTW91c2VPdXQ6IGZ1bmN0aW9uIChldmVudCl7XHJcbiAgICAgICAgICBtb3VzZU91dCA9IHRydWU7XHJcbiAgICAgICAgfSxcclxuICAgICAgICBjbGVhckFuY2hvcnNFeGNlcHQ6IGZ1bmN0aW9uKGRvbnRDbGVhbiA9IHVuZGVmaW5lZCl7XHJcbiAgICAgICAgICB2YXIgZXhjZXB0aW9uQXBwbGllcyA9IGZhbHNlO1xyXG5cclxuICAgICAgICAgIHRoaXMuYW5jaG9ycy5mb3JFYWNoKChhbmNob3IsIGluZGV4KSA9PiB7XHJcbiAgICAgICAgICAgIGlmKGRvbnRDbGVhbiAmJiBhbmNob3IgPT09IGRvbnRDbGVhbil7XHJcbiAgICAgICAgICAgICAgZXhjZXB0aW9uQXBwbGllcyA9IHRydWU7IC8vIHRoZSBkb250Q2xlYW4gYW5jaG9yIGlzIG5vdCBjbGVhcmVkXHJcbiAgICAgICAgICAgICAgcmV0dXJuO1xyXG4gICAgICAgICAgICB9XHJcblxyXG4gICAgICAgICAgICB0aGlzLnVuYmluZExpc3RlbmVycyhhbmNob3IpO1xyXG4gICAgICAgICAgICBhbmNob3IuZGVzdHJveSgpO1xyXG4gICAgICAgICAgfSk7XHJcblxyXG4gICAgICAgICAgaWYoZXhjZXB0aW9uQXBwbGllcyl7XHJcbiAgICAgICAgICAgIHRoaXMuYW5jaG9ycyA9IFtkb250Q2xlYW5dO1xyXG4gICAgICAgICAgfVxyXG4gICAgICAgICAgZWxzZSB7XHJcbiAgICAgICAgICAgIHRoaXMuYW5jaG9ycyA9IFtdO1xyXG4gICAgICAgICAgICB0aGlzLmVkZ2UgPSB1bmRlZmluZWQ7XHJcbiAgICAgICAgICAgIHRoaXMuZWRnZVR5cGUgPSAnaW5jb25jbHVzaXZlJztcclxuICAgICAgICAgIH1cclxuICAgICAgICB9LFxyXG4gICAgICAgIC8vIHJlbmRlciB0aGUgYmVuZCBhbmQgY29udHJvbCBzaGFwZXMgb2YgdGhlIGdpdmVuIGVkZ2VcclxuICAgICAgICByZW5kZXJBbmNob3JTaGFwZXM6IGZ1bmN0aW9uKGVkZ2UpIHtcclxuICAgICAgICAgIHRoaXMuZWRnZSA9IGVkZ2U7XHJcbiAgICAgICAgICB0aGlzLmVkZ2VUeXBlID0gYW5jaG9yUG9pbnRVdGlsaXRpZXMuZ2V0RWRnZVR5cGUoZWRnZSk7XHJcblxyXG4gICAgICAgICAgaWYoIWVkZ2UuaGFzQ2xhc3MoJ2VkZ2ViZW5kZWRpdGluZy1oYXNiZW5kcG9pbnRzJykgJiZcclxuICAgICAgICAgICAgICAhZWRnZS5oYXNDbGFzcygnZWRnZWNvbnRyb2xlZGl0aW5nLWhhc2NvbnRyb2xwb2ludHMnKSkge1xyXG4gICAgICAgICAgICByZXR1cm47XHJcbiAgICAgICAgICB9XHJcbiAgICAgICAgICBcclxuICAgICAgICAgIHZhciBhbmNob3JMaXN0ID0gYW5jaG9yUG9pbnRVdGlsaXRpZXMuZ2V0QW5jaG9yc0FzQXJyYXkoZWRnZSk7Ly9lZGdlLl9wcml2YXRlLnJkYXRhLnNlZ3B0cztcclxuICAgICAgICAgIHZhciBsZW5ndGggPSBnZXRBbmNob3JTaGFwZXNMZW5ndGgoZWRnZSkgKiAwLjY1O1xyXG4gICAgICAgICAgXHJcbiAgICAgICAgICB2YXIgc3JjUG9zID0gZWRnZS5zb3VyY2UoKS5wb3NpdGlvbigpO1xyXG4gICAgICAgICAgdmFyIHRndFBvcyA9IGVkZ2UudGFyZ2V0KCkucG9zaXRpb24oKTtcclxuXHJcbiAgICAgICAgICBmb3IodmFyIGkgPSAwOyBhbmNob3JMaXN0ICYmIGkgPCBhbmNob3JMaXN0Lmxlbmd0aDsgaSA9IGkgKyAyKXtcclxuICAgICAgICAgICAgdmFyIGFuY2hvclggPSBhbmNob3JMaXN0W2ldO1xyXG4gICAgICAgICAgICB2YXIgYW5jaG9yWSA9IGFuY2hvckxpc3RbaSArIDFdO1xyXG5cclxuICAgICAgICAgICAgdGhpcy5yZW5kZXJBbmNob3JTaGFwZShhbmNob3JYLCBhbmNob3JZLCBsZW5ndGgpO1xyXG4gICAgICAgICAgfVxyXG5cclxuICAgICAgICAgIGNhbnZhcy5kcmF3KCk7XHJcbiAgICAgICAgfSxcclxuICAgICAgICAvLyByZW5kZXIgYSBhbmNob3Igc2hhcGUgd2l0aCB0aGUgZ2l2ZW4gcGFyYW1ldGVyc1xyXG4gICAgICAgIHJlbmRlckFuY2hvclNoYXBlOiBmdW5jdGlvbihhbmNob3JYLCBhbmNob3JZLCBsZW5ndGgpIHtcclxuICAgICAgICAgIC8vIGdldCB0aGUgdG9wIGxlZnQgY29vcmRpbmF0ZXNcclxuICAgICAgICAgIHZhciB0b3BMZWZ0WCA9IGFuY2hvclggLSBsZW5ndGggLyAyO1xyXG4gICAgICAgICAgdmFyIHRvcExlZnRZID0gYW5jaG9yWSAtIGxlbmd0aCAvIDI7XHJcbiAgICAgICAgICBcclxuICAgICAgICAgIC8vIGNvbnZlcnQgdG8gcmVuZGVyZWQgcGFyYW1ldGVyc1xyXG4gICAgICAgICAgdmFyIHJlbmRlcmVkVG9wTGVmdFBvcyA9IGNvbnZlcnRUb1JlbmRlcmVkUG9zaXRpb24oe3g6IHRvcExlZnRYLCB5OiB0b3BMZWZ0WX0pO1xyXG4gICAgICAgICAgbGVuZ3RoICo9IGN5Lnpvb20oKTtcclxuICAgICAgICAgIFxyXG4gICAgICAgICAgdmFyIG5ld0FuY2hvciA9IG5ldyBLb252YS5SZWN0KHtcclxuICAgICAgICAgICAgeDogcmVuZGVyZWRUb3BMZWZ0UG9zLngsXHJcbiAgICAgICAgICAgIHk6IHJlbmRlcmVkVG9wTGVmdFBvcy55LFxyXG4gICAgICAgICAgICB3aWR0aDogbGVuZ3RoLFxyXG4gICAgICAgICAgICBoZWlnaHQ6IGxlbmd0aCxcclxuICAgICAgICAgICAgZmlsbDogJ2JsYWNrJyxcclxuICAgICAgICAgICAgc3Ryb2tlV2lkdGg6IDAsXHJcbiAgICAgICAgICAgIGRyYWdnYWJsZTogdHJ1ZVxyXG4gICAgICAgICAgfSk7XHJcblxyXG4gICAgICAgICAgdGhpcy5hbmNob3JzLnB1c2gobmV3QW5jaG9yKTtcclxuICAgICAgICAgIHRoaXMuYmluZExpc3RlbmVycyhuZXdBbmNob3IpO1xyXG4gICAgICAgICAgY2FudmFzLmFkZChuZXdBbmNob3IpO1xyXG4gICAgICAgIH1cclxuICAgICAgfTtcclxuXHJcbiAgICAgIHZhciBjeHRBZGRBbmNob3JGY24gPSBmdW5jdGlvbiAoZXZlbnQpIHtcclxuICAgICAgICB2YXIgZWRnZSA9IGV2ZW50LnRhcmdldCB8fCBldmVudC5jeVRhcmdldDtcclxuICAgICAgICBpZighYW5jaG9yUG9pbnRVdGlsaXRpZXMuaXNJZ25vcmVkRWRnZShlZGdlKSkge1xyXG5cclxuICAgICAgICAgIHZhciB0eXBlID0gYW5jaG9yUG9pbnRVdGlsaXRpZXMuZ2V0RWRnZVR5cGUoZWRnZSk7XHJcblxyXG4gICAgICAgICAgaWYoYW5jaG9yUG9pbnRVdGlsaXRpZXMuZWRnZVR5cGVJbmNvbmNsdXNpdmVTaG91bGRudEhhcHBlbih0eXBlLCBcIlVpVXRpbGl0aWVzLmpzLCBjeHRBZGRBbmNob3JGY25cIikpe1xyXG4gICAgICAgICAgICByZXR1cm47XHJcbiAgICAgICAgICB9XHJcblxyXG4gICAgICAgICAgdmFyIHdlaWdodFN0ciA9IGFuY2hvclBvaW50VXRpbGl0aWVzLnN5bnRheFt0eXBlXVsnd2VpZ2h0J107XHJcbiAgICAgICAgICB2YXIgZGlzdGFuY2VTdHIgPSBhbmNob3JQb2ludFV0aWxpdGllcy5zeW50YXhbdHlwZV1bJ2Rpc3RhbmNlJ107XHJcblxyXG4gICAgICAgICAgdmFyIHBhcmFtID0ge1xyXG4gICAgICAgICAgICBlZGdlOiBlZGdlLFxyXG4gICAgICAgICAgICB3ZWlnaHRzOiBlZGdlLmRhdGEod2VpZ2h0U3RyKSA/IFtdLmNvbmNhdChlZGdlLmRhdGEod2VpZ2h0U3RyKSkgOiBlZGdlLmRhdGEod2VpZ2h0U3RyKSxcclxuICAgICAgICAgICAgZGlzdGFuY2VzOiBlZGdlLmRhdGEoZGlzdGFuY2VTdHIpID8gW10uY29uY2F0KGVkZ2UuZGF0YShkaXN0YW5jZVN0cikpIDogZWRnZS5kYXRhKGRpc3RhbmNlU3RyKVxyXG4gICAgICAgICAgfTtcclxuXHJcbiAgICAgICAgICBhbmNob3JQb2ludFV0aWxpdGllcy5hZGRBbmNob3JQb2ludCgpO1xyXG5cclxuICAgICAgICAgIGlmIChvcHRpb25zKCkudW5kb2FibGUpIHtcclxuICAgICAgICAgICAgY3kudW5kb1JlZG8oKS5kbygnY2hhbmdlQW5jaG9yUG9pbnRzJywgcGFyYW0pO1xyXG4gICAgICAgICAgfVxyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgcmVmcmVzaERyYXdzKCk7XHJcbiAgICAgICAgZWRnZS5zZWxlY3QoKTtcclxuICAgICAgfTtcclxuXHJcbiAgICAgIHZhciBjeHRSZW1vdmVBbmNob3JGY24gPSBmdW5jdGlvbiAoZXZlbnQpIHtcclxuICAgICAgICB2YXIgZWRnZSA9IGFuY2hvck1hbmFnZXIuZWRnZTtcclxuICAgICAgICB2YXIgdHlwZSA9IGFuY2hvclBvaW50VXRpbGl0aWVzLmdldEVkZ2VUeXBlKGVkZ2UpO1xyXG5cclxuICAgICAgICBpZihhbmNob3JQb2ludFV0aWxpdGllcy5lZGdlVHlwZUluY29uY2x1c2l2ZVNob3VsZG50SGFwcGVuKHR5cGUsIFwiVWlVdGlsaXRpZXMuanMsIGN4dFJlbW92ZUFuY2hvckZjblwiKSl7XHJcbiAgICAgICAgICByZXR1cm47XHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICB2YXIgcGFyYW0gPSB7XHJcbiAgICAgICAgICBlZGdlOiBlZGdlLFxyXG4gICAgICAgICAgd2VpZ2h0czogW10uY29uY2F0KGVkZ2UuZGF0YShhbmNob3JQb2ludFV0aWxpdGllcy5zeW50YXhbdHlwZV1bJ3dlaWdodCddKSksXHJcbiAgICAgICAgICBkaXN0YW5jZXM6IFtdLmNvbmNhdChlZGdlLmRhdGEoYW5jaG9yUG9pbnRVdGlsaXRpZXMuc3ludGF4W3R5cGVdWydkaXN0YW5jZSddKSlcclxuICAgICAgICB9O1xyXG5cclxuICAgICAgICBhbmNob3JQb2ludFV0aWxpdGllcy5yZW1vdmVBbmNob3IoKTtcclxuICAgICAgICBcclxuICAgICAgICBpZihvcHRpb25zKCkudW5kb2FibGUpIHtcclxuICAgICAgICAgIGN5LnVuZG9SZWRvKCkuZG8oJ2NoYW5nZUFuY2hvclBvaW50cycsIHBhcmFtKTtcclxuICAgICAgICB9XHJcbiAgICAgICAgXHJcbiAgICAgICAgc2V0VGltZW91dChmdW5jdGlvbigpe3JlZnJlc2hEcmF3cygpO2VkZ2Uuc2VsZWN0KCk7fSwgNTApIDtcclxuXHJcbiAgICAgIH07XHJcbiAgICAgIFxyXG4gICAgICAvLyBmdW5jdGlvbiB0byByZWNvbm5lY3QgZWRnZVxyXG4gICAgICB2YXIgaGFuZGxlUmVjb25uZWN0RWRnZSA9IG9wdHMuaGFuZGxlUmVjb25uZWN0RWRnZTtcclxuICAgICAgLy8gZnVuY3Rpb24gdG8gdmFsaWRhdGUgZWRnZSBzb3VyY2UgYW5kIHRhcmdldCBvbiByZWNvbm5lY3Rpb25cclxuICAgICAgdmFyIHZhbGlkYXRlRWRnZSA9IG9wdHMudmFsaWRhdGVFZGdlOyBcclxuICAgICAgLy8gZnVuY3Rpb24gdG8gYmUgY2FsbGVkIG9uIGludmFsaWQgZWRnZSByZWNvbm5lY3Rpb25cclxuICAgICAgdmFyIGFjdE9uVW5zdWNjZXNzZnVsUmVjb25uZWN0aW9uID0gb3B0cy5hY3RPblVuc3VjY2Vzc2Z1bFJlY29ubmVjdGlvbjtcclxuICAgICAgXHJcbiAgICAgIHZhciBtZW51SXRlbXMgPSBbXHJcbiAgICAgICAge1xyXG4gICAgICAgICAgaWQ6IGFkZEJlbmRQb2ludEN4dE1lbnVJZCxcclxuICAgICAgICAgIHRpdGxlOiBvcHRzLmFkZEJlbmRNZW51SXRlbVRpdGxlLFxyXG4gICAgICAgICAgY29udGVudDogJ0FkZCBCZW5kIFBvaW50JyxcclxuICAgICAgICAgIHNlbGVjdG9yOiAnZWRnZScsXHJcbiAgICAgICAgICBvbkNsaWNrRnVuY3Rpb246IGN4dEFkZEFuY2hvckZjblxyXG4gICAgICAgIH0sXHJcbiAgICAgICAge1xyXG4gICAgICAgICAgaWQ6IHJlbW92ZUJlbmRQb2ludEN4dE1lbnVJZCxcclxuICAgICAgICAgIHRpdGxlOiBvcHRzLnJlbW92ZUJlbmRNZW51SXRlbVRpdGxlLFxyXG4gICAgICAgICAgY29udGVudDogJ1JlbW92ZSBCZW5kIFBvaW50JyxcclxuICAgICAgICAgIHNlbGVjdG9yOiAnZWRnZScsXHJcbiAgICAgICAgICBvbkNsaWNrRnVuY3Rpb246IGN4dFJlbW92ZUFuY2hvckZjblxyXG4gICAgICAgIH0sXHJcbiAgICAgICAge1xyXG4gICAgICAgICAgaWQ6IGFkZENvbnRyb2xQb2ludEN4dE1lbnVJZCxcclxuICAgICAgICAgIHRpdGxlOiBvcHRzLmFkZENvbnRyb2xNZW51SXRlbVRpdGxlLFxyXG4gICAgICAgICAgY29udGVudDogJ0FkZCBDb250cm9sIFBvaW50JyxcclxuICAgICAgICAgIHNlbGVjdG9yOiAnZWRnZScsXHJcbiAgICAgICAgICBjb3JlQXNXZWxsOiB0cnVlLFxyXG4gICAgICAgICAgb25DbGlja0Z1bmN0aW9uOiBjeHRBZGRBbmNob3JGY25cclxuICAgICAgICB9LFxyXG4gICAgICAgIHtcclxuICAgICAgICAgIGlkOiByZW1vdmVDb250cm9sUG9pbnRDeHRNZW51SWQsXHJcbiAgICAgICAgICB0aXRsZTogb3B0cy5yZW1vdmVDb250cm9sTWVudUl0ZW1UaXRsZSxcclxuICAgICAgICAgIGNvbnRlbnQ6ICdSZW1vdmUgQ29udHJvbCBQb2ludCcsXHJcbiAgICAgICAgICBzZWxlY3RvcjogJ2VkZ2UnLFxyXG4gICAgICAgICAgY29yZUFzV2VsbDogdHJ1ZSxcclxuICAgICAgICAgIG9uQ2xpY2tGdW5jdGlvbjogY3h0UmVtb3ZlQW5jaG9yRmNuXHJcbiAgICAgICAgfVxyXG4gICAgICBdO1xyXG4gICAgICBcclxuICAgICAgaWYoY3kuY29udGV4dE1lbnVzKSB7XHJcbiAgICAgICAgdmFyIG1lbnVzID0gY3kuY29udGV4dE1lbnVzKCdnZXQnKTtcclxuICAgICAgICAvLyBJZiBjb250ZXh0IG1lbnVzIGlzIGFjdGl2ZSBqdXN0IGFwcGVuZCBtZW51IGl0ZW1zIGVsc2UgYWN0aXZhdGUgdGhlIGV4dGVuc2lvblxyXG4gICAgICAgIC8vIHdpdGggaW5pdGlhbCBtZW51IGl0ZW1zXHJcbiAgICAgICAgaWYgKG1lbnVzLmlzQWN0aXZlKCkpIHtcclxuICAgICAgICAgIG1lbnVzLmFwcGVuZE1lbnVJdGVtcyhtZW51SXRlbXMpO1xyXG4gICAgICAgIH1cclxuICAgICAgICBlbHNlIHtcclxuICAgICAgICAgIGN5LmNvbnRleHRNZW51cyh7XHJcbiAgICAgICAgICAgIG1lbnVJdGVtczogbWVudUl0ZW1zXHJcbiAgICAgICAgICB9KTtcclxuICAgICAgICB9XHJcbiAgICAgIH1cclxuICAgICAgXHJcbiAgICAgIHZhciBfc2l6ZUNhbnZhcyA9IGRlYm91bmNlKGZ1bmN0aW9uICgpIHtcclxuICAgICAgICAkY2FudmFzRWxlbWVudFxyXG4gICAgICAgICAgLmF0dHIoJ2hlaWdodCcsICRjb250YWluZXIuaGVpZ2h0KCkpXHJcbiAgICAgICAgICAuYXR0cignd2lkdGgnLCAkY29udGFpbmVyLndpZHRoKCkpXHJcbiAgICAgICAgICAuY3NzKHtcclxuICAgICAgICAgICAgJ3Bvc2l0aW9uJzogJ2Fic29sdXRlJyxcclxuICAgICAgICAgICAgJ3RvcCc6IDAsXHJcbiAgICAgICAgICAgICdsZWZ0JzogMCxcclxuICAgICAgICAgICAgJ3otaW5kZXgnOiBvcHRpb25zKCkuekluZGV4XHJcbiAgICAgICAgICB9KVxyXG4gICAgICAgIDtcclxuXHJcbiAgICAgICAgc2V0VGltZW91dChmdW5jdGlvbiAoKSB7XHJcbiAgICAgICAgICB2YXIgY2FudmFzQmIgPSAkY2FudmFzRWxlbWVudC5vZmZzZXQoKTtcclxuICAgICAgICAgIHZhciBjb250YWluZXJCYiA9ICRjb250YWluZXIub2Zmc2V0KCk7XHJcblxyXG4gICAgICAgICAgJGNhbnZhc0VsZW1lbnRcclxuICAgICAgICAgICAgLmNzcyh7XHJcbiAgICAgICAgICAgICAgJ3RvcCc6IC0oY2FudmFzQmIudG9wIC0gY29udGFpbmVyQmIudG9wKSxcclxuICAgICAgICAgICAgICAnbGVmdCc6IC0oY2FudmFzQmIubGVmdCAtIGNvbnRhaW5lckJiLmxlZnQpXHJcbiAgICAgICAgICAgIH0pXHJcbiAgICAgICAgICA7XHJcblxyXG4gICAgICAgICAgY2FudmFzLmdldFN0YWdlKCkuc2V0V2lkdGgoJGNvbnRhaW5lci53aWR0aCgpKTtcclxuICAgICAgICAgIGNhbnZhcy5nZXRTdGFnZSgpLnNldEhlaWdodCgkY29udGFpbmVyLmhlaWdodCgpKTtcclxuXHJcbiAgICAgICAgICAvLyByZWRyYXcgb24gY2FudmFzIHJlc2l6ZVxyXG4gICAgICAgICAgaWYoY3kpe1xyXG4gICAgICAgICAgICByZWZyZXNoRHJhd3MoKTtcclxuICAgICAgICAgIH1cclxuICAgICAgICB9LCAwKTtcclxuXHJcbiAgICAgIH0sIDI1MCk7XHJcblxyXG4gICAgICBmdW5jdGlvbiBzaXplQ2FudmFzKCkge1xyXG4gICAgICAgIF9zaXplQ2FudmFzKCk7XHJcbiAgICAgIH1cclxuXHJcbiAgICAgIHNpemVDYW52YXMoKTtcclxuXHJcbiAgICAgICQod2luZG93KS5iaW5kKCdyZXNpemUnLCBmdW5jdGlvbiAoKSB7XHJcbiAgICAgICAgc2l6ZUNhbnZhcygpO1xyXG4gICAgICB9KTtcclxuICAgICAgXHJcbiAgICAgIC8vIHdyaXRlIG9wdGlvbnMgdG8gZGF0YVxyXG4gICAgICB2YXIgZGF0YSA9ICRjb250YWluZXIuZGF0YSgnY3llZGdlZWRpdGluZycpO1xyXG4gICAgICBpZiAoZGF0YSA9PSBudWxsKSB7XHJcbiAgICAgICAgZGF0YSA9IHt9O1xyXG4gICAgICB9XHJcbiAgICAgIGRhdGEub3B0aW9ucyA9IG9wdHM7XHJcblxyXG4gICAgICB2YXIgb3B0Q2FjaGU7XHJcblxyXG4gICAgICBmdW5jdGlvbiBvcHRpb25zKCkge1xyXG4gICAgICAgIHJldHVybiBvcHRDYWNoZSB8fCAob3B0Q2FjaGUgPSAkY29udGFpbmVyLmRhdGEoJ2N5ZWRnZWVkaXRpbmcnKS5vcHRpb25zKTtcclxuICAgICAgfVxyXG5cclxuICAgICAgLy8gd2Ugd2lsbCBuZWVkIHRvIGNvbnZlcnQgbW9kZWwgcG9zaXRvbnMgdG8gcmVuZGVyZWQgcG9zaXRpb25zXHJcbiAgICAgIGZ1bmN0aW9uIGNvbnZlcnRUb1JlbmRlcmVkUG9zaXRpb24obW9kZWxQb3NpdGlvbikge1xyXG4gICAgICAgIHZhciBwYW4gPSBjeS5wYW4oKTtcclxuICAgICAgICB2YXIgem9vbSA9IGN5Lnpvb20oKTtcclxuXHJcbiAgICAgICAgdmFyIHggPSBtb2RlbFBvc2l0aW9uLnggKiB6b29tICsgcGFuLng7XHJcbiAgICAgICAgdmFyIHkgPSBtb2RlbFBvc2l0aW9uLnkgKiB6b29tICsgcGFuLnk7XHJcblxyXG4gICAgICAgIHJldHVybiB7XHJcbiAgICAgICAgICB4OiB4LFxyXG4gICAgICAgICAgeTogeVxyXG4gICAgICAgIH07XHJcbiAgICAgIH1cclxuICAgICAgXHJcbiAgICAgIGZ1bmN0aW9uIHJlZnJlc2hEcmF3cygpIHtcclxuXHJcbiAgICAgICAgLy8gZG9uJ3QgY2xlYXIgYW5jaG9yIHdoaWNoIGlzIGJlaW5nIG1vdmVkXHJcbiAgICAgICAgYW5jaG9yTWFuYWdlci5jbGVhckFuY2hvcnNFeGNlcHQoYW5jaG9yTWFuYWdlci50b3VjaGVkQW5jaG9yKTtcclxuICAgICAgICBcclxuICAgICAgICBpZihlbmRwb2ludFNoYXBlMSAhPT0gbnVsbCl7XHJcbiAgICAgICAgICBlbmRwb2ludFNoYXBlMS5kZXN0cm95KCk7XHJcbiAgICAgICAgICBlbmRwb2ludFNoYXBlMSA9IG51bGw7XHJcbiAgICAgICAgfVxyXG4gICAgICAgIGlmKGVuZHBvaW50U2hhcGUyICE9PSBudWxsKXtcclxuICAgICAgICAgIGVuZHBvaW50U2hhcGUyLmRlc3Ryb3koKTtcclxuICAgICAgICAgIGVuZHBvaW50U2hhcGUyID0gbnVsbDtcclxuICAgICAgICB9XHJcbiAgICAgICAgY2FudmFzLmRyYXcoKTtcclxuXHJcbiAgICAgICAgaWYoIGVkZ2VUb0hpZ2hsaWdodCApIHtcclxuICAgICAgICAgIGFuY2hvck1hbmFnZXIucmVuZGVyQW5jaG9yU2hhcGVzKGVkZ2VUb0hpZ2hsaWdodCk7XHJcbiAgICAgICAgICByZW5kZXJFbmRQb2ludFNoYXBlcyhlZGdlVG9IaWdobGlnaHQpO1xyXG4gICAgICAgIH1cclxuICAgICAgfVxyXG4gICAgICBcclxuICAgICAgLy8gcmVuZGVyIHRoZSBlbmQgcG9pbnRzIHNoYXBlcyBvZiB0aGUgZ2l2ZW4gZWRnZVxyXG4gICAgICBmdW5jdGlvbiByZW5kZXJFbmRQb2ludFNoYXBlcyhlZGdlKSB7XHJcbiAgICAgICAgaWYoIWVkZ2Upe1xyXG4gICAgICAgICAgcmV0dXJuO1xyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgdmFyIGVkZ2VfcHRzID0gYW5jaG9yUG9pbnRVdGlsaXRpZXMuZ2V0QW5jaG9yc0FzQXJyYXkoZWRnZSk7XHJcbiAgICAgICAgaWYodHlwZW9mIGVkZ2VfcHRzID09PSAndW5kZWZpbmVkJyl7XHJcbiAgICAgICAgICBlZGdlX3B0cyA9IFtdO1xyXG4gICAgICAgIH0gICAgICAgXHJcbiAgICAgICAgdmFyIHNvdXJjZVBvcyA9IGVkZ2Uuc291cmNlRW5kcG9pbnQoKTtcclxuICAgICAgICB2YXIgdGFyZ2V0UG9zID0gZWRnZS50YXJnZXRFbmRwb2ludCgpO1xyXG4gICAgICAgIGVkZ2VfcHRzLnVuc2hpZnQoc291cmNlUG9zLnkpO1xyXG4gICAgICAgIGVkZ2VfcHRzLnVuc2hpZnQoc291cmNlUG9zLngpO1xyXG4gICAgICAgIGVkZ2VfcHRzLnB1c2godGFyZ2V0UG9zLngpO1xyXG4gICAgICAgIGVkZ2VfcHRzLnB1c2godGFyZ2V0UG9zLnkpOyBcclxuXHJcbiAgICAgICBcclxuICAgICAgICBpZighZWRnZV9wdHMpXHJcbiAgICAgICAgICByZXR1cm47XHJcblxyXG4gICAgICAgIHZhciBzcmMgPSB7XHJcbiAgICAgICAgICB4OiBlZGdlX3B0c1swXSxcclxuICAgICAgICAgIHk6IGVkZ2VfcHRzWzFdXHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICB2YXIgdGFyZ2V0ID0ge1xyXG4gICAgICAgICAgeDogZWRnZV9wdHNbZWRnZV9wdHMubGVuZ3RoLTJdLFxyXG4gICAgICAgICAgeTogZWRnZV9wdHNbZWRnZV9wdHMubGVuZ3RoLTFdXHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICB2YXIgbmV4dFRvU291cmNlID0ge1xyXG4gICAgICAgICAgeDogZWRnZV9wdHNbMl0sXHJcbiAgICAgICAgICB5OiBlZGdlX3B0c1szXVxyXG4gICAgICAgIH1cclxuICAgICAgICB2YXIgbmV4dFRvVGFyZ2V0ID0ge1xyXG4gICAgICAgICAgeDogZWRnZV9wdHNbZWRnZV9wdHMubGVuZ3RoLTRdLFxyXG4gICAgICAgICAgeTogZWRnZV9wdHNbZWRnZV9wdHMubGVuZ3RoLTNdXHJcbiAgICAgICAgfVxyXG4gICAgICAgIHZhciBsZW5ndGggPSBnZXRBbmNob3JTaGFwZXNMZW5ndGgoZWRnZSkgKiAwLjY1O1xyXG4gICAgICAgIFxyXG4gICAgICAgIHJlbmRlckVhY2hFbmRQb2ludFNoYXBlKHNyYywgdGFyZ2V0LCBsZW5ndGgsbmV4dFRvU291cmNlLG5leHRUb1RhcmdldCk7XHJcbiAgICAgICAgXHJcbiAgICAgIH1cclxuXHJcbiAgICAgIGZ1bmN0aW9uIHJlbmRlckVhY2hFbmRQb2ludFNoYXBlKHNvdXJjZSwgdGFyZ2V0LCBsZW5ndGgsbmV4dFRvU291cmNlLG5leHRUb1RhcmdldCkge1xyXG4gICAgICAgIC8vIGdldCB0aGUgdG9wIGxlZnQgY29vcmRpbmF0ZXMgb2Ygc291cmNlIGFuZCB0YXJnZXRcclxuICAgICAgICB2YXIgc1RvcExlZnRYID0gc291cmNlLnggLSBsZW5ndGggLyAyO1xyXG4gICAgICAgIHZhciBzVG9wTGVmdFkgPSBzb3VyY2UueSAtIGxlbmd0aCAvIDI7XHJcblxyXG4gICAgICAgIHZhciB0VG9wTGVmdFggPSB0YXJnZXQueCAtIGxlbmd0aCAvIDI7XHJcbiAgICAgICAgdmFyIHRUb3BMZWZ0WSA9IHRhcmdldC55IC0gbGVuZ3RoIC8gMjtcclxuXHJcbiAgICAgICAgdmFyIG5leHRUb1NvdXJjZVggPSBuZXh0VG9Tb3VyY2UueCAtIGxlbmd0aCAvMjtcclxuICAgICAgICB2YXIgbmV4dFRvU291cmNlWSA9IG5leHRUb1NvdXJjZS55IC0gbGVuZ3RoIC8gMjtcclxuXHJcbiAgICAgICAgdmFyIG5leHRUb1RhcmdldFggPSBuZXh0VG9UYXJnZXQueCAtIGxlbmd0aCAvMjtcclxuICAgICAgICB2YXIgbmV4dFRvVGFyZ2V0WSA9IG5leHRUb1RhcmdldC55IC0gbGVuZ3RoIC8yO1xyXG5cclxuXHJcbiAgICAgICAgLy8gY29udmVydCB0byByZW5kZXJlZCBwYXJhbWV0ZXJzXHJcbiAgICAgICAgdmFyIHJlbmRlcmVkU291cmNlUG9zID0gY29udmVydFRvUmVuZGVyZWRQb3NpdGlvbih7eDogc1RvcExlZnRYLCB5OiBzVG9wTGVmdFl9KTtcclxuICAgICAgICB2YXIgcmVuZGVyZWRUYXJnZXRQb3MgPSBjb252ZXJ0VG9SZW5kZXJlZFBvc2l0aW9uKHt4OiB0VG9wTGVmdFgsIHk6IHRUb3BMZWZ0WX0pO1xyXG4gICAgICAgIGxlbmd0aCA9IGxlbmd0aCAqIGN5Lnpvb20oKSAvIDI7XHJcblxyXG4gICAgICAgIHZhciByZW5kZXJlZE5leHRUb1NvdXJjZSA9IGNvbnZlcnRUb1JlbmRlcmVkUG9zaXRpb24oe3g6IG5leHRUb1NvdXJjZVgsIHk6IG5leHRUb1NvdXJjZVl9KTtcclxuICAgICAgICB2YXIgcmVuZGVyZWROZXh0VG9UYXJnZXQgPSBjb252ZXJ0VG9SZW5kZXJlZFBvc2l0aW9uKHt4OiBuZXh0VG9UYXJnZXRYLCB5OiBuZXh0VG9UYXJnZXRZfSk7XHJcbiAgICAgICAgXHJcbiAgICAgICAgLy9ob3cgZmFyIHRvIGdvIGZyb20gdGhlIG5vZGUgYWxvbmcgdGhlIGVkZ2VcclxuICAgICAgICB2YXIgZGlzdGFuY2VGcm9tTm9kZSA9IGxlbmd0aDtcclxuXHJcbiAgICAgICAgdmFyIGRpc3RhbmNlU291cmNlID0gTWF0aC5zcXJ0KE1hdGgucG93KHJlbmRlcmVkTmV4dFRvU291cmNlLnggLSByZW5kZXJlZFNvdXJjZVBvcy54LDIpICsgTWF0aC5wb3cocmVuZGVyZWROZXh0VG9Tb3VyY2UueSAtIHJlbmRlcmVkU291cmNlUG9zLnksMikpOyAgICAgICAgXHJcbiAgICAgICAgdmFyIHNvdXJjZUVuZFBvaW50WCA9IHJlbmRlcmVkU291cmNlUG9zLnggKyAoKGRpc3RhbmNlRnJvbU5vZGUvIGRpc3RhbmNlU291cmNlKSogKHJlbmRlcmVkTmV4dFRvU291cmNlLnggLSByZW5kZXJlZFNvdXJjZVBvcy54KSk7XHJcbiAgICAgICAgdmFyIHNvdXJjZUVuZFBvaW50WSA9IHJlbmRlcmVkU291cmNlUG9zLnkgKyAoKGRpc3RhbmNlRnJvbU5vZGUvIGRpc3RhbmNlU291cmNlKSogKHJlbmRlcmVkTmV4dFRvU291cmNlLnkgLSByZW5kZXJlZFNvdXJjZVBvcy55KSk7XHJcblxyXG5cclxuICAgICAgICB2YXIgZGlzdGFuY2VUYXJnZXQgPSBNYXRoLnNxcnQoTWF0aC5wb3cocmVuZGVyZWROZXh0VG9UYXJnZXQueCAtIHJlbmRlcmVkVGFyZ2V0UG9zLngsMikgKyBNYXRoLnBvdyhyZW5kZXJlZE5leHRUb1RhcmdldC55IC0gcmVuZGVyZWRUYXJnZXRQb3MueSwyKSk7ICAgICAgICBcclxuICAgICAgICB2YXIgdGFyZ2V0RW5kUG9pbnRYID0gcmVuZGVyZWRUYXJnZXRQb3MueCArICgoZGlzdGFuY2VGcm9tTm9kZS8gZGlzdGFuY2VUYXJnZXQpKiAocmVuZGVyZWROZXh0VG9UYXJnZXQueCAtIHJlbmRlcmVkVGFyZ2V0UG9zLngpKTtcclxuICAgICAgICB2YXIgdGFyZ2V0RW5kUG9pbnRZID0gcmVuZGVyZWRUYXJnZXRQb3MueSArICgoZGlzdGFuY2VGcm9tTm9kZS8gZGlzdGFuY2VUYXJnZXQpKiAocmVuZGVyZWROZXh0VG9UYXJnZXQueSAtIHJlbmRlcmVkVGFyZ2V0UG9zLnkpKTsgXHJcblxyXG4gICAgICAgIC8vIHJlbmRlciBlbmQgcG9pbnQgc2hhcGUgZm9yIHNvdXJjZSBhbmQgdGFyZ2V0XHJcbiAgICAgICAgZW5kcG9pbnRTaGFwZTEgPSBuZXcgS29udmEuQ2lyY2xlKHtcclxuICAgICAgICAgIHg6IHNvdXJjZUVuZFBvaW50WCArIGxlbmd0aCxcclxuICAgICAgICAgIHk6IHNvdXJjZUVuZFBvaW50WSArIGxlbmd0aCxcclxuICAgICAgICAgIHJhZGl1czogbGVuZ3RoLFxyXG4gICAgICAgICAgZmlsbDogJ2JsYWNrJyxcclxuICAgICAgICB9KTtcclxuXHJcbiAgICAgICAgZW5kcG9pbnRTaGFwZTIgPSBuZXcgS29udmEuQ2lyY2xlKHtcclxuICAgICAgICAgIHg6IHRhcmdldEVuZFBvaW50WCArIGxlbmd0aCxcclxuICAgICAgICAgIHk6IHRhcmdldEVuZFBvaW50WSArIGxlbmd0aCxcclxuICAgICAgICAgIHJhZGl1czogbGVuZ3RoLFxyXG4gICAgICAgICAgZmlsbDogJ2JsYWNrJyxcclxuICAgICAgICB9KTtcclxuXHJcbiAgICAgICAgY2FudmFzLmFkZChlbmRwb2ludFNoYXBlMSk7XHJcbiAgICAgICAgY2FudmFzLmFkZChlbmRwb2ludFNoYXBlMik7XHJcbiAgICAgICAgY2FudmFzLmRyYXcoKTtcclxuICAgICAgICBcclxuICAgICAgfVxyXG5cclxuICAgICAgLy8gZ2V0IHRoZSBsZW5ndGggb2YgYW5jaG9yIHBvaW50cyB0byBiZSByZW5kZXJlZFxyXG4gICAgICBmdW5jdGlvbiBnZXRBbmNob3JTaGFwZXNMZW5ndGgoZWRnZSkge1xyXG4gICAgICAgIHZhciBmYWN0b3IgPSBvcHRpb25zKCkuYW5jaG9yU2hhcGVTaXplRmFjdG9yO1xyXG4gICAgICAgIGlmIChwYXJzZUZsb2F0KGVkZ2UuY3NzKCd3aWR0aCcpKSA8PSAyLjUpXHJcbiAgICAgICAgICByZXR1cm4gMi41ICogZmFjdG9yO1xyXG4gICAgICAgIGVsc2UgcmV0dXJuIHBhcnNlRmxvYXQoZWRnZS5jc3MoJ3dpZHRoJykpKmZhY3RvcjtcclxuICAgICAgfVxyXG4gICAgICBcclxuICAgICAgLy8gY2hlY2sgaWYgdGhlIGFuY2hvciByZXByZXNlbnRlZCBieSB7eCwgeX0gaXMgaW5zaWRlIHRoZSBwb2ludCBzaGFwZVxyXG4gICAgICBmdW5jdGlvbiBjaGVja0lmSW5zaWRlU2hhcGUoeCwgeSwgbGVuZ3RoLCBjZW50ZXJYLCBjZW50ZXJZKXtcclxuICAgICAgICB2YXIgbWluWCA9IGNlbnRlclggLSBsZW5ndGggLyAyO1xyXG4gICAgICAgIHZhciBtYXhYID0gY2VudGVyWCArIGxlbmd0aCAvIDI7XHJcbiAgICAgICAgdmFyIG1pblkgPSBjZW50ZXJZIC0gbGVuZ3RoIC8gMjtcclxuICAgICAgICB2YXIgbWF4WSA9IGNlbnRlclkgKyBsZW5ndGggLyAyO1xyXG4gICAgICAgIFxyXG4gICAgICAgIHZhciBpbnNpZGUgPSAoeCA+PSBtaW5YICYmIHggPD0gbWF4WCkgJiYgKHkgPj0gbWluWSAmJiB5IDw9IG1heFkpO1xyXG4gICAgICAgIHJldHVybiBpbnNpZGU7XHJcbiAgICAgIH1cclxuXHJcbiAgICAgIC8vIGdldCB0aGUgaW5kZXggb2YgYW5jaG9yIGNvbnRhaW5pbmcgdGhlIHBvaW50IHJlcHJlc2VudGVkIGJ5IHt4LCB5fVxyXG4gICAgICBmdW5jdGlvbiBnZXRDb250YWluaW5nU2hhcGVJbmRleCh4LCB5LCBlZGdlKSB7XHJcbiAgICAgICAgdmFyIHR5cGUgPSBhbmNob3JQb2ludFV0aWxpdGllcy5nZXRFZGdlVHlwZShlZGdlKTtcclxuXHJcbiAgICAgICAgaWYodHlwZSA9PT0gJ2luY29uY2x1c2l2ZScpe1xyXG4gICAgICAgICAgcmV0dXJuIC0xO1xyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgaWYoZWRnZS5kYXRhKGFuY2hvclBvaW50VXRpbGl0aWVzLnN5bnRheFt0eXBlXVsnd2VpZ2h0J10pID09IG51bGwgfHwgXHJcbiAgICAgICAgICBlZGdlLmRhdGEoYW5jaG9yUG9pbnRVdGlsaXRpZXMuc3ludGF4W3R5cGVdWyd3ZWlnaHQnXSkubGVuZ3RoID09IDApe1xyXG4gICAgICAgICAgcmV0dXJuIC0xO1xyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgdmFyIGFuY2hvckxpc3QgPSBhbmNob3JQb2ludFV0aWxpdGllcy5nZXRBbmNob3JzQXNBcnJheShlZGdlKTsvL2VkZ2UuX3ByaXZhdGUucmRhdGEuc2VncHRzO1xyXG4gICAgICAgIHZhciBsZW5ndGggPSBnZXRBbmNob3JTaGFwZXNMZW5ndGgoZWRnZSk7XHJcblxyXG4gICAgICAgIGZvcih2YXIgaSA9IDA7IGFuY2hvckxpc3QgJiYgaSA8IGFuY2hvckxpc3QubGVuZ3RoOyBpID0gaSArIDIpe1xyXG4gICAgICAgICAgdmFyIGFuY2hvclggPSBhbmNob3JMaXN0W2ldO1xyXG4gICAgICAgICAgdmFyIGFuY2hvclkgPSBhbmNob3JMaXN0W2kgKyAxXTtcclxuXHJcbiAgICAgICAgICB2YXIgaW5zaWRlID0gY2hlY2tJZkluc2lkZVNoYXBlKHgsIHksIGxlbmd0aCwgYW5jaG9yWCwgYW5jaG9yWSk7XHJcbiAgICAgICAgICBpZihpbnNpZGUpe1xyXG4gICAgICAgICAgICByZXR1cm4gaSAvIDI7XHJcbiAgICAgICAgICB9XHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICByZXR1cm4gLTE7XHJcbiAgICAgIH07XHJcblxyXG4gICAgICBmdW5jdGlvbiBnZXRDb250YWluaW5nRW5kUG9pbnQoeCwgeSwgZWRnZSl7XHJcbiAgICAgICAgdmFyIGxlbmd0aCA9IGdldEFuY2hvclNoYXBlc0xlbmd0aChlZGdlKTtcclxuICAgICAgICB2YXIgYWxsUHRzID0gZWRnZS5fcHJpdmF0ZS5yc2NyYXRjaC5hbGxwdHM7XHJcbiAgICAgICAgdmFyIHNyYyA9IHtcclxuICAgICAgICAgIHg6IGFsbFB0c1swXSxcclxuICAgICAgICAgIHk6IGFsbFB0c1sxXVxyXG4gICAgICAgIH1cclxuICAgICAgICB2YXIgdGFyZ2V0ID0ge1xyXG4gICAgICAgICAgeDogYWxsUHRzW2FsbFB0cy5sZW5ndGgtMl0sXHJcbiAgICAgICAgICB5OiBhbGxQdHNbYWxsUHRzLmxlbmd0aC0xXVxyXG4gICAgICAgIH1cclxuICAgICAgICBjb252ZXJ0VG9SZW5kZXJlZFBvc2l0aW9uKHNyYyk7XHJcbiAgICAgICAgY29udmVydFRvUmVuZGVyZWRQb3NpdGlvbih0YXJnZXQpO1xyXG4gICAgICAgIFxyXG4gICAgICAgIC8vIFNvdXJjZTowLCBUYXJnZXQ6MSwgTm9uZTotMVxyXG4gICAgICAgIGlmKGNoZWNrSWZJbnNpZGVTaGFwZSh4LCB5LCBsZW5ndGgsIHNyYy54LCBzcmMueSkpXHJcbiAgICAgICAgICByZXR1cm4gMDtcclxuICAgICAgICBlbHNlIGlmKGNoZWNrSWZJbnNpZGVTaGFwZSh4LCB5LCBsZW5ndGgsIHRhcmdldC54LCB0YXJnZXQueSkpXHJcbiAgICAgICAgICByZXR1cm4gMTtcclxuICAgICAgICBlbHNlXHJcbiAgICAgICAgICByZXR1cm4gLTE7XHJcbiAgICAgIH1cclxuICAgICAgXHJcbiAgICAgIC8vIHN0b3JlIHRoZSBjdXJyZW50IHN0YXR1cyBvZiBnZXN0dXJlcyBhbmQgc2V0IHRoZW0gdG8gZmFsc2VcclxuICAgICAgZnVuY3Rpb24gZGlzYWJsZUdlc3R1cmVzKCkge1xyXG4gICAgICAgIGxhc3RQYW5uaW5nRW5hYmxlZCA9IGN5LnBhbm5pbmdFbmFibGVkKCk7XHJcbiAgICAgICAgbGFzdFpvb21pbmdFbmFibGVkID0gY3kuem9vbWluZ0VuYWJsZWQoKTtcclxuICAgICAgICBsYXN0Qm94U2VsZWN0aW9uRW5hYmxlZCA9IGN5LmJveFNlbGVjdGlvbkVuYWJsZWQoKTtcclxuXHJcbiAgICAgICAgY3kuem9vbWluZ0VuYWJsZWQoZmFsc2UpXHJcbiAgICAgICAgICAucGFubmluZ0VuYWJsZWQoZmFsc2UpXHJcbiAgICAgICAgICAuYm94U2VsZWN0aW9uRW5hYmxlZChmYWxzZSk7XHJcbiAgICAgIH1cclxuICAgICAgXHJcbiAgICAgIC8vIHJlc2V0IHRoZSBnZXN0dXJlcyBieSB0aGVpciBsYXRlc3Qgc3RhdHVzXHJcbiAgICAgIGZ1bmN0aW9uIHJlc2V0R2VzdHVyZXMoKSB7XHJcbiAgICAgICAgY3kuem9vbWluZ0VuYWJsZWQobGFzdFpvb21pbmdFbmFibGVkKVxyXG4gICAgICAgICAgLnBhbm5pbmdFbmFibGVkKGxhc3RQYW5uaW5nRW5hYmxlZClcclxuICAgICAgICAgIC5ib3hTZWxlY3Rpb25FbmFibGVkKGxhc3RCb3hTZWxlY3Rpb25FbmFibGVkKTtcclxuICAgICAgfVxyXG5cclxuICAgICAgZnVuY3Rpb24gdHVybk9mZkFjdGl2ZUJnQ29sb3IoKXtcclxuICAgICAgICAvLyBmb3VuZCB0aGlzIGF0IHRoZSBjeS1ub2RlLXJlc2l6ZSBjb2RlLCBidXQgZG9lc24ndCBzZWVtIHRvIGZpbmQgdGhlIG9iamVjdCBtb3N0IG9mIHRoZSB0aW1lXHJcbiAgICAgICAgaWYoIGN5LnN0eWxlKCkuX3ByaXZhdGUuY29yZVN0eWxlW1wiYWN0aXZlLWJnLW9wYWNpdHlcIl0pIHtcclxuICAgICAgICAgIGxhc3RBY3RpdmVCZ09wYWNpdHkgPSBjeS5zdHlsZSgpLl9wcml2YXRlLmNvcmVTdHlsZVtcImFjdGl2ZS1iZy1vcGFjaXR5XCJdLnZhbHVlO1xyXG4gICAgICAgIH1cclxuICAgICAgICBlbHNlIHtcclxuICAgICAgICAgIC8vIGFyYml0cmFyeSwgZmVlbCBmcmVlIHRvIGNoYW5nZVxyXG4gICAgICAgICAgLy8gdHJpYWwgYW5kIGVycm9yIHNob3dlZCB0aGF0IDAuMTUgd2FzIGNsb3Nlc3QgdG8gdGhlIG9sZCBjb2xvclxyXG4gICAgICAgICAgbGFzdEFjdGl2ZUJnT3BhY2l0eSA9IDAuMTU7XHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICBjeS5zdHlsZSgpXHJcbiAgICAgICAgICAuc2VsZWN0b3IoXCJjb3JlXCIpXHJcbiAgICAgICAgICAuc3R5bGUoXCJhY3RpdmUtYmctb3BhY2l0eVwiLCAwKVxyXG4gICAgICAgICAgLnVwZGF0ZSgpO1xyXG4gICAgICB9XHJcblxyXG4gICAgICBmdW5jdGlvbiByZXNldEFjdGl2ZUJnQ29sb3IoKXtcclxuICAgICAgICBjeS5zdHlsZSgpXHJcbiAgICAgICAgICAuc2VsZWN0b3IoXCJjb3JlXCIpXHJcbiAgICAgICAgICAuc3R5bGUoXCJhY3RpdmUtYmctb3BhY2l0eVwiLCBsYXN0QWN0aXZlQmdPcGFjaXR5KVxyXG4gICAgICAgICAgLnVwZGF0ZSgpO1xyXG4gICAgICB9XHJcblxyXG4gICAgICBmdW5jdGlvbiBtb3ZlQW5jaG9yUG9pbnRzKHBvc2l0aW9uRGlmZiwgZWRnZXMpIHtcclxuICAgICAgICAgIGVkZ2VzLmZvckVhY2goZnVuY3Rpb24oIGVkZ2UgKXtcclxuICAgICAgICAgICAgICB2YXIgcHJldmlvdXNBbmNob3JzUG9zaXRpb24gPSBhbmNob3JQb2ludFV0aWxpdGllcy5nZXRBbmNob3JzQXNBcnJheShlZGdlKTtcclxuICAgICAgICAgICAgICB2YXIgbmV4dEFuY2hvclBvaW50c1Bvc2l0aW9uID0gW107XHJcbiAgICAgICAgICAgICAgaWYgKHByZXZpb3VzQW5jaG9yc1Bvc2l0aW9uICE9IHVuZGVmaW5lZClcclxuICAgICAgICAgICAgICB7XHJcbiAgICAgICAgICAgICAgICBmb3IgKGk9MDsgaTxwcmV2aW91c0FuY2hvcnNQb3NpdGlvbi5sZW5ndGg7IGkrPTIpXHJcbiAgICAgICAgICAgICAgICB7XHJcbiAgICAgICAgICAgICAgICAgICAgbmV4dEFuY2hvclBvaW50c1Bvc2l0aW9uLnB1c2goe3g6IHByZXZpb3VzQW5jaG9yc1Bvc2l0aW9uW2ldK3Bvc2l0aW9uRGlmZi54LCB5OiBwcmV2aW91c0FuY2hvcnNQb3NpdGlvbltpKzFdK3Bvc2l0aW9uRGlmZi55fSk7XHJcbiAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgICB2YXIgdHlwZSA9IGFuY2hvclBvaW50VXRpbGl0aWVzLmdldEVkZ2VUeXBlKGVkZ2UpO1xyXG5cclxuICAgICAgICAgICAgICAgIGlmKGFuY2hvclBvaW50VXRpbGl0aWVzLmVkZ2VUeXBlSW5jb25jbHVzaXZlU2hvdWxkbnRIYXBwZW4odHlwZSwgXCJVaVV0aWxpdGllcy5qcywgbW92ZUFuY2hvclBvaW50c1wiKSl7XHJcbiAgICAgICAgICAgICAgICAgIHJldHVybjtcclxuICAgICAgICAgICAgICAgIH1cclxuXHJcbiAgICAgICAgICAgICAgICBlZGdlLmRhdGEoYW5jaG9yUG9pbnRVdGlsaXRpZXMuc3ludGF4W3R5cGVdWydwb2ludFBvcyddLCBuZXh0QW5jaG9yUG9pbnRzUG9zaXRpb24pO1xyXG4gICAgICAgICAgICAgIH1cclxuICAgICAgICAgIH0pO1xyXG4gICAgICAgICAgYW5jaG9yUG9pbnRVdGlsaXRpZXMuaW5pdEFuY2hvclBvaW50cyhvcHRpb25zKCkuYmVuZFBvc2l0aW9uc0Z1bmN0aW9uLCBvcHRpb25zKCkuY29udHJvbFBvc2l0aW9uc0Z1bmN0aW9uLCBlZGdlcyk7XHJcbiAgICAgICAgICBcclxuICAgICAgICAgIC8vIExpc3RlbmVyIGRlZmluZWQgaW4gb3RoZXIgZXh0ZW5zaW9uXHJcbiAgICAgICAgICAvLyBNaWdodCBoYXZlIGNvbXBhdGliaWxpdHkgaXNzdWVzIGFmdGVyIHRoZSB1bmJ1bmRsZWQgYmV6aWVyXHJcbiAgICAgICAgICBjeS50cmlnZ2VyKCdiZW5kUG9pbnRNb3ZlbWVudCcpOyBcclxuICAgICAgfVxyXG5cclxuICAgICAgZnVuY3Rpb24gbW92ZUFuY2hvck9uRHJhZyhlZGdlLCB0eXBlLCBpbmRleCwgcG9zaXRpb24pe1xyXG4gICAgICAgIHZhciB3ZWlnaHRzID0gZWRnZS5kYXRhKGFuY2hvclBvaW50VXRpbGl0aWVzLnN5bnRheFt0eXBlXVsnd2VpZ2h0J10pO1xyXG4gICAgICAgIHZhciBkaXN0YW5jZXMgPSBlZGdlLmRhdGEoYW5jaG9yUG9pbnRVdGlsaXRpZXMuc3ludGF4W3R5cGVdWydkaXN0YW5jZSddKTtcclxuICAgICAgICBcclxuICAgICAgICB2YXIgcmVsYXRpdmVBbmNob3JQb3NpdGlvbiA9IGFuY2hvclBvaW50VXRpbGl0aWVzLmNvbnZlcnRUb1JlbGF0aXZlUG9zaXRpb24oZWRnZSwgcG9zaXRpb24pO1xyXG4gICAgICAgIHdlaWdodHNbaW5kZXhdID0gcmVsYXRpdmVBbmNob3JQb3NpdGlvbi53ZWlnaHQ7XHJcbiAgICAgICAgZGlzdGFuY2VzW2luZGV4XSA9IHJlbGF0aXZlQW5jaG9yUG9zaXRpb24uZGlzdGFuY2U7XHJcbiAgICAgICAgXHJcbiAgICAgICAgZWRnZS5kYXRhKGFuY2hvclBvaW50VXRpbGl0aWVzLnN5bnRheFt0eXBlXVsnd2VpZ2h0J10sIHdlaWdodHMpO1xyXG4gICAgICAgIGVkZ2UuZGF0YShhbmNob3JQb2ludFV0aWxpdGllcy5zeW50YXhbdHlwZV1bJ2Rpc3RhbmNlJ10sIGRpc3RhbmNlcyk7XHJcbiAgICAgIH1cclxuXHJcbiAgICAgIC8vIGRlYm91bmNlZCBkdWUgdG8gbGFyZ2UgYW1vdXQgb2YgY2FsbHMgdG8gdGFwZHJhZ1xyXG4gICAgICB2YXIgX21vdmVBbmNob3JPbkRyYWcgPSBkZWJvdW5jZSggbW92ZUFuY2hvck9uRHJhZywgNSk7XHJcblxyXG4gICAgICB7ICBcclxuICAgICAgICBsYXN0UGFubmluZ0VuYWJsZWQgPSBjeS5wYW5uaW5nRW5hYmxlZCgpO1xyXG4gICAgICAgIGxhc3Rab29taW5nRW5hYmxlZCA9IGN5Lnpvb21pbmdFbmFibGVkKCk7XHJcbiAgICAgICAgbGFzdEJveFNlbGVjdGlvbkVuYWJsZWQgPSBjeS5ib3hTZWxlY3Rpb25FbmFibGVkKCk7XHJcbiAgICAgICAgXHJcbiAgICAgICAgLy8gSW5pdGlsaXplIHRoZSBlZGdlVG9IaWdobGlnaHRCZW5kcyBhbmQgbnVtYmVyT2ZTZWxlY3RlZEVkZ2VzXHJcbiAgICAgICAge1xyXG4gICAgICAgICAgdmFyIHNlbGVjdGVkRWRnZXMgPSBjeS5lZGdlcygnOnNlbGVjdGVkJyk7XHJcbiAgICAgICAgICB2YXIgbnVtYmVyT2ZTZWxlY3RlZEVkZ2VzID0gc2VsZWN0ZWRFZGdlcy5sZW5ndGg7XHJcbiAgICAgICAgICBcclxuICAgICAgICAgIGlmICggbnVtYmVyT2ZTZWxlY3RlZEVkZ2VzID09PSAxICkge1xyXG4gICAgICAgICAgICBlZGdlVG9IaWdobGlnaHQgPSBzZWxlY3RlZEVkZ2VzWzBdO1xyXG4gICAgICAgICAgfVxyXG4gICAgICAgIH1cclxuICAgICAgICBcclxuICAgICAgICBjeS5iaW5kKCd6b29tIHBhbicsIGVab29tID0gZnVuY3Rpb24gKCkge1xyXG4gICAgICAgICAgaWYgKCAhZWRnZVRvSGlnaGxpZ2h0ICkge1xyXG4gICAgICAgICAgICByZXR1cm47XHJcbiAgICAgICAgICB9XHJcbiAgICAgICAgICBcclxuICAgICAgICAgIHJlZnJlc2hEcmF3cygpO1xyXG4gICAgICAgIH0pO1xyXG5cclxuICAgICAgICAvLyBjeS5vZmYgaXMgbmV2ZXIgY2FsbGVkIG9uIHRoaXMgbGlzdGVuZXJcclxuICAgICAgICBjeS5vbignZGF0YScsICdlZGdlJywgIGZ1bmN0aW9uICgpIHtcclxuICAgICAgICAgIGlmICggIWVkZ2VUb0hpZ2hsaWdodCApIHtcclxuICAgICAgICAgICAgcmV0dXJuO1xyXG4gICAgICAgICAgfVxyXG4gICAgICAgICAgXHJcbiAgICAgICAgICByZWZyZXNoRHJhd3MoKTtcclxuICAgICAgICB9KTtcclxuXHJcbiAgICAgICAgY3kub24oJ3N0eWxlJywgJ2VkZ2UuZWRnZWJlbmRlZGl0aW5nLWhhc2JlbmRwb2ludHM6c2VsZWN0ZWQsIGVkZ2UuZWRnZWNvbnRyb2xlZGl0aW5nLWhhc2NvbnRyb2xwb2ludHM6c2VsZWN0ZWQnLCBlU3R5bGUgPSBmdW5jdGlvbiAoKSB7XHJcbiAgICAgICAgICByZWZyZXNoRHJhd3MoKTtcclxuICAgICAgICB9KTtcclxuXHJcbiAgICAgICAgY3kub24oJ3JlbW92ZScsICdlZGdlJywgZVJlbW92ZSA9IGZ1bmN0aW9uICgpIHtcclxuICAgICAgICAgIHZhciBlZGdlID0gdGhpcztcclxuICAgICAgICAgIGlmIChlZGdlLnNlbGVjdGVkKCkpIHtcclxuICAgICAgICAgICAgbnVtYmVyT2ZTZWxlY3RlZEVkZ2VzID0gbnVtYmVyT2ZTZWxlY3RlZEVkZ2VzIC0gMTtcclxuICAgICAgICAgICAgXHJcbiAgICAgICAgICAgIGN5LnN0YXJ0QmF0Y2goKTtcclxuICAgICAgICAgICAgXHJcbiAgICAgICAgICAgIGlmIChlZGdlVG9IaWdobGlnaHQpIHtcclxuICAgICAgICAgICAgICBlZGdlVG9IaWdobGlnaHQucmVtb3ZlQ2xhc3MoJ2N5LWVkZ2UtZWRpdGluZy1oaWdobGlnaHQnKTtcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICBcclxuICAgICAgICAgICAgaWYgKG51bWJlck9mU2VsZWN0ZWRFZGdlcyA9PT0gMSkge1xyXG4gICAgICAgICAgICAgIHZhciBzZWxlY3RlZEVkZ2VzID0gY3kuZWRnZXMoJzpzZWxlY3RlZCcpO1xyXG4gICAgICAgICAgICAgIFxyXG4gICAgICAgICAgICAgIC8vIElmIHVzZXIgcmVtb3ZlcyBhbGwgc2VsZWN0ZWQgZWRnZXMgYXQgYSBzaW5nbGUgb3BlcmF0aW9uIHRoZW4gb3VyICdudW1iZXJPZlNlbGVjdGVkRWRnZXMnXHJcbiAgICAgICAgICAgICAgLy8gbWF5IGJlIG1pc2xlYWRpbmcuIFRoZXJlZm9yZSB3ZSBuZWVkIHRvIGNoZWNrIGlmIHRoZSBudW1iZXIgb2YgZWRnZXMgdG8gaGlnaGxpZ2h0IGlzIHJlYWx5IDEgaGVyZS5cclxuICAgICAgICAgICAgICBpZiAoc2VsZWN0ZWRFZGdlcy5sZW5ndGggPT09IDEpIHtcclxuICAgICAgICAgICAgICAgIGVkZ2VUb0hpZ2hsaWdodCA9IHNlbGVjdGVkRWRnZXNbMF07XHJcbiAgICAgICAgICAgICAgICBlZGdlVG9IaWdobGlnaHQuYWRkQ2xhc3MoJ2N5LWVkZ2UtZWRpdGluZy1oaWdobGlnaHQnKTtcclxuICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgZWxzZSB7XHJcbiAgICAgICAgICAgICAgICBlZGdlVG9IaWdobGlnaHQgPSB1bmRlZmluZWQ7XHJcbiAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgICAgIGVsc2Uge1xyXG4gICAgICAgICAgICAgIGVkZ2VUb0hpZ2hsaWdodCA9IHVuZGVmaW5lZDtcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICBcclxuICAgICAgICAgICAgY3kuZW5kQmF0Y2goKTtcclxuICAgICAgICAgIH1cclxuICAgICAgICAgIHJlZnJlc2hEcmF3cygpO1xyXG4gICAgICAgIH0pO1xyXG4gICAgICAgIFxyXG4gICAgICAgICBjeS5vbignYWRkJywgJ2VkZ2UnLCBlQWRkID0gZnVuY3Rpb24gKCkge1xyXG4gICAgICAgICAgdmFyIGVkZ2UgPSB0aGlzO1xyXG4gICAgICAgICAgaWYgKGVkZ2Uuc2VsZWN0ZWQoKSkge1xyXG4gICAgICAgICAgICBudW1iZXJPZlNlbGVjdGVkRWRnZXMgPSBudW1iZXJPZlNlbGVjdGVkRWRnZXMgKyAxO1xyXG4gICAgICAgICAgICBcclxuICAgICAgICAgICAgY3kuc3RhcnRCYXRjaCgpO1xyXG4gICAgICAgICAgICBcclxuICAgICAgICAgICAgaWYgKGVkZ2VUb0hpZ2hsaWdodCkge1xyXG4gICAgICAgICAgICAgIGVkZ2VUb0hpZ2hsaWdodC5yZW1vdmVDbGFzcygnY3ktZWRnZS1lZGl0aW5nLWhpZ2hsaWdodCcpO1xyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgICAgIFxyXG4gICAgICAgICAgICBpZiAobnVtYmVyT2ZTZWxlY3RlZEVkZ2VzID09PSAxKSB7XHJcbiAgICAgICAgICAgICAgZWRnZVRvSGlnaGxpZ2h0ID0gZWRnZTtcclxuICAgICAgICAgICAgICBlZGdlVG9IaWdobGlnaHQuYWRkQ2xhc3MoJ2N5LWVkZ2UtZWRpdGluZy1oaWdobGlnaHQnKTtcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICBlbHNlIHtcclxuICAgICAgICAgICAgICBlZGdlVG9IaWdobGlnaHQgPSB1bmRlZmluZWQ7XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgXHJcbiAgICAgICAgICAgIGN5LmVuZEJhdGNoKCk7XHJcbiAgICAgICAgICB9XHJcbiAgICAgICAgICByZWZyZXNoRHJhd3MoKTtcclxuICAgICAgICB9KTtcclxuICAgICAgICBcclxuICAgICAgICBjeS5vbignc2VsZWN0JywgJ2VkZ2UnLCBlU2VsZWN0ID0gZnVuY3Rpb24gKCkge1xyXG4gICAgICAgICAgdmFyIGVkZ2UgPSB0aGlzO1xyXG5cclxuICAgICAgICAgIGlmKGVkZ2UudGFyZ2V0KCkuY29ubmVjdGVkRWRnZXMoKS5sZW5ndGggPT0gMCB8fCBlZGdlLnNvdXJjZSgpLmNvbm5lY3RlZEVkZ2VzKCkubGVuZ3RoID09IDApe1xyXG4gICAgICAgICAgICByZXR1cm47XHJcbiAgICAgICAgICB9XHJcblxyXG4gICAgICAgICBcclxuICAgICAgICAgIG51bWJlck9mU2VsZWN0ZWRFZGdlcyA9IG51bWJlck9mU2VsZWN0ZWRFZGdlcyArIDE7XHJcbiAgICAgICAgICBcclxuICAgICAgICAgIGN5LnN0YXJ0QmF0Y2goKTtcclxuICAgICAgICAgICAgXHJcbiAgICAgICAgICBpZiAoZWRnZVRvSGlnaGxpZ2h0KSB7XHJcbiAgICAgICAgICAgIGVkZ2VUb0hpZ2hsaWdodC5yZW1vdmVDbGFzcygnY3ktZWRnZS1lZGl0aW5nLWhpZ2hsaWdodCcpO1xyXG4gICAgICAgICAgfVxyXG4gICAgICAgICAgICBcclxuICAgICAgICAgIGlmIChudW1iZXJPZlNlbGVjdGVkRWRnZXMgPT09IDEpIHtcclxuICAgICAgICAgICAgZWRnZVRvSGlnaGxpZ2h0ID0gZWRnZTtcclxuICAgICAgICAgICAgZWRnZVRvSGlnaGxpZ2h0LmFkZENsYXNzKCdjeS1lZGdlLWVkaXRpbmctaGlnaGxpZ2h0Jyk7XHJcbiAgICAgICAgICB9XHJcbiAgICAgICAgICBlbHNlIHtcclxuICAgICAgICAgICAgZWRnZVRvSGlnaGxpZ2h0ID0gdW5kZWZpbmVkO1xyXG4gICAgICAgICAgfVxyXG4gICAgICAgICAgXHJcbiAgICAgICAgICBjeS5lbmRCYXRjaCgpO1xyXG4gICAgICAgICAgcmVmcmVzaERyYXdzKCk7XHJcbiAgICAgICAgfSk7XHJcbiAgICAgICAgXHJcbiAgICAgICAgY3kub24oJ3Vuc2VsZWN0JywgJ2VkZ2UnLCBlVW5zZWxlY3QgPSBmdW5jdGlvbiAoKSB7XHJcbiAgICAgICAgICBudW1iZXJPZlNlbGVjdGVkRWRnZXMgPSBudW1iZXJPZlNlbGVjdGVkRWRnZXMgLSAxO1xyXG4gICAgICAgICAgICBcclxuICAgICAgICAgIGN5LnN0YXJ0QmF0Y2goKTtcclxuICAgICAgICAgICAgXHJcbiAgICAgICAgICBpZiAoZWRnZVRvSGlnaGxpZ2h0KSB7XHJcbiAgICAgICAgICAgIGVkZ2VUb0hpZ2hsaWdodC5yZW1vdmVDbGFzcygnY3ktZWRnZS1lZGl0aW5nLWhpZ2hsaWdodCcpO1xyXG4gICAgICAgICAgfVxyXG4gICAgICAgICAgICBcclxuICAgICAgICAgIGlmIChudW1iZXJPZlNlbGVjdGVkRWRnZXMgPT09IDEpIHtcclxuICAgICAgICAgICAgdmFyIHNlbGVjdGVkRWRnZXMgPSBjeS5lZGdlcygnOnNlbGVjdGVkJyk7XHJcbiAgICAgICAgICAgIFxyXG4gICAgICAgICAgICAvLyBJZiB1c2VyIHVuc2VsZWN0cyBhbGwgZWRnZXMgYnkgdGFwcGluZyB0byB0aGUgY29yZSBldGMuIHRoZW4gb3VyICdudW1iZXJPZlNlbGVjdGVkRWRnZXMnXHJcbiAgICAgICAgICAgIC8vIG1heSBiZSBtaXNsZWFkaW5nLiBUaGVyZWZvcmUgd2UgbmVlZCB0byBjaGVjayBpZiB0aGUgbnVtYmVyIG9mIGVkZ2VzIHRvIGhpZ2hsaWdodCBpcyByZWFseSAxIGhlcmUuXHJcbiAgICAgICAgICAgIGlmIChzZWxlY3RlZEVkZ2VzLmxlbmd0aCA9PT0gMSkge1xyXG4gICAgICAgICAgICAgIGVkZ2VUb0hpZ2hsaWdodCA9IHNlbGVjdGVkRWRnZXNbMF07XHJcbiAgICAgICAgICAgICAgZWRnZVRvSGlnaGxpZ2h0LmFkZENsYXNzKCdjeS1lZGdlLWVkaXRpbmctaGlnaGxpZ2h0Jyk7XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgZWxzZSB7XHJcbiAgICAgICAgICAgICAgZWRnZVRvSGlnaGxpZ2h0ID0gdW5kZWZpbmVkO1xyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgICB9XHJcbiAgICAgICAgICBlbHNlIHtcclxuICAgICAgICAgICAgZWRnZVRvSGlnaGxpZ2h0ID0gdW5kZWZpbmVkO1xyXG4gICAgICAgICAgfVxyXG4gICAgICAgICAgXHJcbiAgICAgICAgICBjeS5lbmRCYXRjaCgpO1xyXG4gICAgICAgICAgcmVmcmVzaERyYXdzKCk7XHJcbiAgICAgICAgfSk7XHJcbiAgICAgICAgXHJcbiAgICAgICAgdmFyIG1vdmVkQW5jaG9ySW5kZXg7XHJcbiAgICAgICAgdmFyIHRhcFN0YXJ0UG9zO1xyXG4gICAgICAgIHZhciBtb3ZlZEVkZ2U7XHJcbiAgICAgICAgdmFyIG1vdmVBbmNob3JQYXJhbTtcclxuICAgICAgICB2YXIgY3JlYXRlQW5jaG9yT25EcmFnO1xyXG4gICAgICAgIHZhciBtb3ZlZEVuZFBvaW50O1xyXG4gICAgICAgIHZhciBkdW1teU5vZGU7XHJcbiAgICAgICAgdmFyIGRldGFjaGVkTm9kZTtcclxuICAgICAgICB2YXIgbm9kZVRvQXR0YWNoO1xyXG4gICAgICAgIHZhciBhbmNob3JDcmVhdGVkQnlEcmFnID0gZmFsc2U7XHJcblxyXG4gICAgICAgIGN5Lm9uKCd0YXBzdGFydCcsIGVUYXBTdGFydCA9IGZ1bmN0aW9uKGV2ZW50KSB7XHJcbiAgICAgICAgICBjeS5hdXRvdW5zZWxlY3RpZnkoZmFsc2UpO1xyXG4gICAgICAgICAgdGFwU3RhcnRQb3MgPSBldmVudC5wb3NpdGlvbiB8fCBldmVudC5jeVBvc2l0aW9uO1xyXG4gICAgICAgIH0pO1xyXG5cclxuICAgICAgICBjeS5vbigndGFwc3RhcnQnLCAnZWRnZScsIGVUYXBTdGFydE9uRWRnZSA9IGZ1bmN0aW9uIChldmVudCkge1xyXG4gICAgICAgICAgdmFyIGVkZ2UgPSB0aGlzO1xyXG5cclxuICAgICAgICAgIGlmICghZWRnZVRvSGlnaGxpZ2h0IHx8IGVkZ2VUb0hpZ2hsaWdodC5pZCgpICE9PSBlZGdlLmlkKCkpIHtcclxuICAgICAgICAgICAgY3JlYXRlQW5jaG9yT25EcmFnID0gZmFsc2U7XHJcbiAgICAgICAgICAgIHJldHVybjtcclxuICAgICAgICAgIH1cclxuICAgICAgICAgIFxyXG4gICAgICAgICAgbW92ZWRFZGdlID0gZWRnZTtcclxuXHJcbiAgICAgICAgICB2YXIgdHlwZSA9IGFuY2hvclBvaW50VXRpbGl0aWVzLmdldEVkZ2VUeXBlKGVkZ2UpO1xyXG5cclxuICAgICAgICAgIC8vIHRvIGF2b2lkIGVycm9yc1xyXG4gICAgICAgICAgaWYodHlwZSA9PT0gJ2luY29uY2x1c2l2ZScpXHJcbiAgICAgICAgICAgIHR5cGUgPSAnYmVuZCc7XHJcbiAgICAgICAgICBcclxuICAgICAgICAgIHZhciBjeVBvc1ggPSB0YXBTdGFydFBvcy54O1xyXG4gICAgICAgICAgdmFyIGN5UG9zWSA9IHRhcFN0YXJ0UG9zLnk7XHJcbiAgICAgICAgICBcclxuICAgICAgICAgIC8vIEdldCB3aGljaCBlbmQgcG9pbnQgaGFzIGJlZW4gY2xpY2tlZCAoU291cmNlOjAsIFRhcmdldDoxLCBOb25lOi0xKVxyXG4gICAgICAgICAgdmFyIGVuZFBvaW50ID0gZ2V0Q29udGFpbmluZ0VuZFBvaW50KGN5UG9zWCwgY3lQb3NZLCBlZGdlKTtcclxuXHJcbiAgICAgICAgICBpZihlbmRQb2ludCA9PSAwIHx8IGVuZFBvaW50ID09IDEpe1xyXG4gICAgICAgICAgICBlZGdlLnVuc2VsZWN0KCk7XHJcbiAgICAgICAgICAgIG1vdmVkRW5kUG9pbnQgPSBlbmRQb2ludDtcclxuICAgICAgICAgICAgZGV0YWNoZWROb2RlID0gKGVuZFBvaW50ID09IDApID8gbW92ZWRFZGdlLnNvdXJjZSgpIDogbW92ZWRFZGdlLnRhcmdldCgpO1xyXG5cclxuICAgICAgICAgICAgdmFyIGRpc2Nvbm5lY3RlZEVuZCA9IChlbmRQb2ludCA9PSAwKSA/ICdzb3VyY2UnIDogJ3RhcmdldCc7XHJcbiAgICAgICAgICAgIHZhciByZXN1bHQgPSByZWNvbm5lY3Rpb25VdGlsaXRpZXMuZGlzY29ubmVjdEVkZ2UobW92ZWRFZGdlLCBjeSwgZXZlbnQucmVuZGVyZWRQb3NpdGlvbiwgZGlzY29ubmVjdGVkRW5kKTtcclxuICAgICAgICAgICAgXHJcbiAgICAgICAgICAgIGR1bW15Tm9kZSA9IHJlc3VsdC5kdW1teU5vZGU7XHJcbiAgICAgICAgICAgIG1vdmVkRWRnZSA9IHJlc3VsdC5lZGdlO1xyXG5cclxuICAgICAgICAgICAgZGlzYWJsZUdlc3R1cmVzKCk7XHJcbiAgICAgICAgICB9XHJcbiAgICAgICAgICBlbHNlIHtcclxuICAgICAgICAgICAgbW92ZWRBbmNob3JJbmRleCA9IHVuZGVmaW5lZDtcclxuICAgICAgICAgICAgY3JlYXRlQW5jaG9yT25EcmFnID0gdHJ1ZTtcclxuICAgICAgICAgIH1cclxuICAgICAgICB9KTtcclxuICAgICAgICBcclxuICAgICAgICBjeS5vbignZHJhZycsICdub2RlJywgZURyYWcgPSBmdW5jdGlvbiAoZXZlbnQpIHtcclxuICAgICAgICAgIHZhciBub2RlID0gdGhpcztcclxuICAgICAgICAgIGN5LmVkZ2VzKCkudW5zZWxlY3QoKTtcclxuICAgICAgICAgIGlmKCFub2RlLnNlbGVjdGVkKCkpe1xyXG4gICAgICAgICAgICBjeS5ub2RlcygpLnVuc2VsZWN0KCk7XHJcbiAgICAgICAgICB9ICAgICAgICAgXHJcbiAgICAgICAgfSk7XHJcbiAgICAgICAgY3kub24oJ3RhcGRyYWcnLCBlVGFwRHJhZyA9IGZ1bmN0aW9uIChldmVudCkge1xyXG4gICAgICAgICAgY3kuYXV0b3Vuc2VsZWN0aWZ5KGZhbHNlKTtcclxuICAgICAgICAgIHZhciBlZGdlID0gbW92ZWRFZGdlO1xyXG5cclxuICAgICAgICAgIGlmKG1vdmVkRWRnZSAhPT0gdW5kZWZpbmVkICYmIGFuY2hvclBvaW50VXRpbGl0aWVzLmlzSWdub3JlZEVkZ2UoZWRnZSkgKSB7XHJcbiAgICAgICAgICAgIHJldHVybjtcclxuICAgICAgICAgIH1cclxuXHJcbiAgICAgICAgICB2YXIgdHlwZSA9IGFuY2hvclBvaW50VXRpbGl0aWVzLmdldEVkZ2VUeXBlKGVkZ2UpO1xyXG5cclxuICAgICAgICAgIGlmKGNyZWF0ZUFuY2hvck9uRHJhZyAmJiAhYW5jaG9yVG91Y2hlZCAmJiB0eXBlICE9PSAnaW5jb25jbHVzaXZlJykge1xyXG4gICAgICAgICAgICAvLyByZW1lbWJlciBzdGF0ZSBiZWZvcmUgY3JlYXRpbmcgYW5jaG9yXHJcbiAgICAgICAgICAgIHZhciB3ZWlnaHRTdHIgPSBhbmNob3JQb2ludFV0aWxpdGllcy5zeW50YXhbdHlwZV1bJ3dlaWdodCddO1xyXG4gICAgICAgICAgICB2YXIgZGlzdGFuY2VTdHIgPSBhbmNob3JQb2ludFV0aWxpdGllcy5zeW50YXhbdHlwZV1bJ2Rpc3RhbmNlJ107XHJcblxyXG4gICAgICAgICAgICBtb3ZlQW5jaG9yUGFyYW0gPSB7XHJcbiAgICAgICAgICAgICAgZWRnZTogZWRnZSxcclxuICAgICAgICAgICAgICB3ZWlnaHRzOiBlZGdlLmRhdGEod2VpZ2h0U3RyKSA/IFtdLmNvbmNhdChlZGdlLmRhdGEod2VpZ2h0U3RyKSkgOiBbXSxcclxuICAgICAgICAgICAgICBkaXN0YW5jZXM6IGVkZ2UuZGF0YShkaXN0YW5jZVN0cikgPyBbXS5jb25jYXQoZWRnZS5kYXRhKGRpc3RhbmNlU3RyKSkgOiBbXVxyXG4gICAgICAgICAgICB9O1xyXG5cclxuICAgICAgICAgICAgZWRnZS51bnNlbGVjdCgpO1xyXG5cclxuICAgICAgICAgICAgLy8gdXNpbmcgdGFwc3RhcnQgcG9zaXRpb24gZml4ZXMgYnVnIG9uIHF1aWNrIGRyYWdzXHJcbiAgICAgICAgICAgIC8vIC0tLSBcclxuICAgICAgICAgICAgLy8gYWxzbyBtb2RpZmllZCBhZGRBbmNob3JQb2ludCB0byByZXR1cm4gdGhlIGluZGV4IGJlY2F1c2VcclxuICAgICAgICAgICAgLy8gZ2V0Q29udGFpbmluZ1NoYXBlSW5kZXggZmFpbGVkIHRvIGZpbmQgdGhlIGNyZWF0ZWQgYW5jaG9yIG9uIHF1aWNrIGRyYWdzXHJcbiAgICAgICAgICAgIG1vdmVkQW5jaG9ySW5kZXggPSBhbmNob3JQb2ludFV0aWxpdGllcy5hZGRBbmNob3JQb2ludChlZGdlLCB0YXBTdGFydFBvcyk7XHJcbiAgICAgICAgICAgIG1vdmVkRWRnZSA9IGVkZ2U7XHJcbiAgICAgICAgICAgIGNyZWF0ZUFuY2hvck9uRHJhZyA9IHVuZGVmaW5lZDtcclxuICAgICAgICAgICAgYW5jaG9yQ3JlYXRlZEJ5RHJhZyA9IHRydWU7XHJcbiAgICAgICAgICAgIGRpc2FibGVHZXN0dXJlcygpO1xyXG4gICAgICAgICAgfVxyXG5cclxuICAgICAgICAgIC8vIGlmIHRoZSB0YXBzdGFydCBkaWQgbm90IGhpdCBhbiBlZGdlIGFuZCBpdCBkaWQgbm90IGhpdCBhbiBhbmNob3JcclxuICAgICAgICAgIGlmICghYW5jaG9yVG91Y2hlZCAmJiAobW92ZWRFZGdlID09PSB1bmRlZmluZWQgfHwgXHJcbiAgICAgICAgICAgIChtb3ZlZEFuY2hvckluZGV4ID09PSB1bmRlZmluZWQgJiYgbW92ZWRFbmRQb2ludCA9PT0gdW5kZWZpbmVkKSkpIHtcclxuICAgICAgICAgICAgcmV0dXJuO1xyXG4gICAgICAgICAgfVxyXG5cclxuICAgICAgICAgIHZhciBldmVudFBvcyA9IGV2ZW50LnBvc2l0aW9uIHx8IGV2ZW50LmN5UG9zaXRpb247XHJcblxyXG4gICAgICAgICAgLy8gVXBkYXRlIGVuZCBwb2ludCBsb2NhdGlvbiAoU291cmNlOjAsIFRhcmdldDoxKVxyXG4gICAgICAgICAgaWYobW92ZWRFbmRQb2ludCAhPSAtMSAmJiBkdW1teU5vZGUpe1xyXG4gICAgICAgICAgICBkdW1teU5vZGUucG9zaXRpb24oZXZlbnRQb3MpO1xyXG4gICAgICAgICAgfVxyXG4gICAgICAgICAgLy8gY2hhbmdlIGxvY2F0aW9uIG9mIGFuY2hvciBjcmVhdGVkIGJ5IGRyYWdcclxuICAgICAgICAgIGVsc2UgaWYobW92ZWRBbmNob3JJbmRleCAhPSB1bmRlZmluZWQpe1xyXG4gICAgICAgICAgICBfbW92ZUFuY2hvck9uRHJhZyhlZGdlLCB0eXBlLCBtb3ZlZEFuY2hvckluZGV4LCBldmVudFBvcyk7XHJcbiAgICAgICAgICB9XHJcbiAgICAgICAgICAvLyBjaGFuZ2UgbG9jYXRpb24gb2YgZHJhZyBhbmQgZHJvcHBlZCBhbmNob3JcclxuICAgICAgICAgIGVsc2UgaWYoYW5jaG9yVG91Y2hlZCl7XHJcblxyXG4gICAgICAgICAgICAvLyB0aGUgdGFwU3RhcnRQb3MgY2hlY2sgaXMgbmVjZXNzYXJ5IHdoZW4gcmlnaCBjbGlja2luZyBhbmNob3IgcG9pbnRzXHJcbiAgICAgICAgICAgIC8vIHJpZ2h0IGNsaWNraW5nIGFuY2hvciBwb2ludHMgdHJpZ2dlcnMgTW91c2VEb3duIGZvciBLb252YSwgYnV0IG5vdCB0YXBzdGFydCBmb3IgY3lcclxuICAgICAgICAgICAgLy8gd2hlbiB0aGF0IGhhcHBlbnMgdGFwU3RhcnRQb3MgaXMgdW5kZWZpbmVkXHJcbiAgICAgICAgICAgIGlmKGFuY2hvck1hbmFnZXIudG91Y2hlZEFuY2hvckluZGV4ID09PSB1bmRlZmluZWQgJiYgdGFwU3RhcnRQb3Mpe1xyXG4gICAgICAgICAgICAgIGFuY2hvck1hbmFnZXIudG91Y2hlZEFuY2hvckluZGV4ID0gZ2V0Q29udGFpbmluZ1NoYXBlSW5kZXgoXHJcbiAgICAgICAgICAgICAgICB0YXBTdGFydFBvcy54LCBcclxuICAgICAgICAgICAgICAgIHRhcFN0YXJ0UG9zLnksXHJcbiAgICAgICAgICAgICAgICBhbmNob3JNYW5hZ2VyLmVkZ2UpO1xyXG4gICAgICAgICAgICB9XHJcblxyXG4gICAgICAgICAgICBpZihhbmNob3JNYW5hZ2VyLnRvdWNoZWRBbmNob3JJbmRleCAhPT0gdW5kZWZpbmVkKXtcclxuICAgICAgICAgICAgICBfbW92ZUFuY2hvck9uRHJhZyhcclxuICAgICAgICAgICAgICAgIGFuY2hvck1hbmFnZXIuZWRnZSxcclxuICAgICAgICAgICAgICAgIGFuY2hvck1hbmFnZXIuZWRnZVR5cGUsXHJcbiAgICAgICAgICAgICAgICBhbmNob3JNYW5hZ2VyLnRvdWNoZWRBbmNob3JJbmRleCxcclxuICAgICAgICAgICAgICAgIGV2ZW50UG9zXHJcbiAgICAgICAgICAgICAgKTtcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgICAgfVxyXG4gICAgICAgICAgXHJcbiAgICAgICAgICBpZihldmVudC50YXJnZXQgJiYgZXZlbnQudGFyZ2V0WzBdICYmIGV2ZW50LnRhcmdldC5pc05vZGUoKSl7XHJcbiAgICAgICAgICAgIG5vZGVUb0F0dGFjaCA9IGV2ZW50LnRhcmdldDtcclxuICAgICAgICAgIH1cclxuXHJcbiAgICAgICAgfSk7XHJcbiAgICAgICAgXHJcbiAgICAgICAgY3kub24oJ3RhcGVuZCcsIGVUYXBFbmQgPSBmdW5jdGlvbiAoZXZlbnQpIHtcclxuXHJcbiAgICAgICAgICBpZihtb3VzZU91dCl7XHJcbiAgICAgICAgICAgIGNhbnZhcy5nZXRTdGFnZSgpLmZpcmUoXCJjb250ZW50TW91c2V1cFwiKTtcclxuICAgICAgICAgIH1cclxuXHJcbiAgICAgICAgICB2YXIgZWRnZSA9IG1vdmVkRWRnZSB8fCBhbmNob3JNYW5hZ2VyLmVkZ2U7IFxyXG4gICAgICAgICAgXHJcbiAgICAgICAgICBpZiggZWRnZSAhPT0gdW5kZWZpbmVkICkge1xyXG4gICAgICAgICAgICB2YXIgaW5kZXggPSBhbmNob3JNYW5hZ2VyLnRvdWNoZWRBbmNob3JJbmRleDtcclxuICAgICAgICAgICAgaWYoIGluZGV4ICE9IHVuZGVmaW5lZCApIHtcclxuICAgICAgICAgICAgICB2YXIgc3RhcnRYID0gZWRnZS5zb3VyY2UoKS5wb3NpdGlvbigneCcpO1xyXG4gICAgICAgICAgICAgIHZhciBzdGFydFkgPSBlZGdlLnNvdXJjZSgpLnBvc2l0aW9uKCd5Jyk7XHJcbiAgICAgICAgICAgICAgdmFyIGVuZFggPSBlZGdlLnRhcmdldCgpLnBvc2l0aW9uKCd4Jyk7XHJcbiAgICAgICAgICAgICAgdmFyIGVuZFkgPSBlZGdlLnRhcmdldCgpLnBvc2l0aW9uKCd5Jyk7XHJcbiAgICAgICAgICAgICAgXHJcbiAgICAgICAgICAgICAgdmFyIGFuY2hvckxpc3QgPSBhbmNob3JQb2ludFV0aWxpdGllcy5nZXRBbmNob3JzQXNBcnJheShlZGdlKTtcclxuICAgICAgICAgICAgICB2YXIgYWxsQW5jaG9ycyA9IFtzdGFydFgsIHN0YXJ0WV0uY29uY2F0KGFuY2hvckxpc3QpLmNvbmNhdChbZW5kWCwgZW5kWV0pO1xyXG4gICAgICAgICAgICAgIFxyXG4gICAgICAgICAgICAgIHZhciBhbmNob3JJbmRleCA9IGluZGV4ICsgMTtcclxuICAgICAgICAgICAgICB2YXIgcHJlSW5kZXggPSBhbmNob3JJbmRleCAtIDE7XHJcbiAgICAgICAgICAgICAgdmFyIHBvc0luZGV4ID0gYW5jaG9ySW5kZXggKyAxO1xyXG4gICAgICAgICAgICAgIFxyXG4gICAgICAgICAgICAgIHZhciBhbmNob3IgPSB7XHJcbiAgICAgICAgICAgICAgICB4OiBhbGxBbmNob3JzWzIgKiBhbmNob3JJbmRleF0sXHJcbiAgICAgICAgICAgICAgICB5OiBhbGxBbmNob3JzWzIgKiBhbmNob3JJbmRleCArIDFdXHJcbiAgICAgICAgICAgICAgfTtcclxuICAgICAgICAgICAgICBcclxuICAgICAgICAgICAgICB2YXIgcHJlQW5jaG9yUG9pbnQgPSB7XHJcbiAgICAgICAgICAgICAgICB4OiBhbGxBbmNob3JzWzIgKiBwcmVJbmRleF0sXHJcbiAgICAgICAgICAgICAgICB5OiBhbGxBbmNob3JzWzIgKiBwcmVJbmRleCArIDFdXHJcbiAgICAgICAgICAgICAgfTtcclxuICAgICAgICAgICAgICBcclxuICAgICAgICAgICAgICB2YXIgcG9zQW5jaG9yUG9pbnQgPSB7XHJcbiAgICAgICAgICAgICAgICB4OiBhbGxBbmNob3JzWzIgKiBwb3NJbmRleF0sXHJcbiAgICAgICAgICAgICAgICB5OiBhbGxBbmNob3JzWzIgKiBwb3NJbmRleCArIDFdXHJcbiAgICAgICAgICAgICAgfTtcclxuICAgICAgICAgICAgICBcclxuICAgICAgICAgICAgICB2YXIgbmVhclRvTGluZTtcclxuICAgICAgICAgICAgICBcclxuICAgICAgICAgICAgICBpZiggKCBhbmNob3IueCA9PT0gcHJlQW5jaG9yUG9pbnQueCAmJiBhbmNob3IueSA9PT0gcHJlQW5jaG9yUG9pbnQueSApIHx8ICggYW5jaG9yLnggPT09IHByZUFuY2hvclBvaW50LnggJiYgYW5jaG9yLnkgPT09IHByZUFuY2hvclBvaW50LnkgKSApIHtcclxuICAgICAgICAgICAgICAgIG5lYXJUb0xpbmUgPSB0cnVlO1xyXG4gICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICBlbHNlIHtcclxuICAgICAgICAgICAgICAgIHZhciBtMSA9ICggcHJlQW5jaG9yUG9pbnQueSAtIHBvc0FuY2hvclBvaW50LnkgKSAvICggcHJlQW5jaG9yUG9pbnQueCAtIHBvc0FuY2hvclBvaW50LnggKTtcclxuICAgICAgICAgICAgICAgIHZhciBtMiA9IC0xIC8gbTE7XHJcblxyXG4gICAgICAgICAgICAgICAgdmFyIHNyY1RndFBvaW50c0FuZFRhbmdlbnRzID0ge1xyXG4gICAgICAgICAgICAgICAgICBzcmNQb2ludDogcHJlQW5jaG9yUG9pbnQsXHJcbiAgICAgICAgICAgICAgICAgIHRndFBvaW50OiBwb3NBbmNob3JQb2ludCxcclxuICAgICAgICAgICAgICAgICAgbTE6IG0xLFxyXG4gICAgICAgICAgICAgICAgICBtMjogbTJcclxuICAgICAgICAgICAgICAgIH07XHJcblxyXG4gICAgICAgICAgICAgICAgdmFyIGN1cnJlbnRJbnRlcnNlY3Rpb24gPSBhbmNob3JQb2ludFV0aWxpdGllcy5nZXRJbnRlcnNlY3Rpb24oZWRnZSwgYW5jaG9yLCBzcmNUZ3RQb2ludHNBbmRUYW5nZW50cyk7XHJcbiAgICAgICAgICAgICAgICB2YXIgZGlzdCA9IE1hdGguc3FydCggTWF0aC5wb3coIChhbmNob3IueCAtIGN1cnJlbnRJbnRlcnNlY3Rpb24ueCksIDIgKSBcclxuICAgICAgICAgICAgICAgICAgICAgICAgKyBNYXRoLnBvdyggKGFuY2hvci55IC0gY3VycmVudEludGVyc2VjdGlvbi55KSwgMiApKTtcclxuICAgICAgICAgICAgICAgIFxyXG4gICAgICAgICAgICAgICAgLy8gcmVtb3ZlIHRoZSBiZW5kIHBvaW50IGlmIHNlZ21lbnQgZWRnZSBiZWNvbWVzIHN0cmFpZ2h0XHJcbiAgICAgICAgICAgICAgICB2YXIgdHlwZSA9IGFuY2hvclBvaW50VXRpbGl0aWVzLmdldEVkZ2VUeXBlKGVkZ2UpO1xyXG4gICAgICAgICAgICAgICAgaWYoICh0eXBlID09PSAnYmVuZCcgJiYgZGlzdCAgPCBvcHRpb25zKCkuYmVuZFJlbW92YWxTZW5zaXRpdml0eSkpIHtcclxuICAgICAgICAgICAgICAgICAgbmVhclRvTGluZSA9IHRydWU7XHJcbiAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgICBcclxuICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgXHJcbiAgICAgICAgICAgICAgaWYoIG5lYXJUb0xpbmUgKVxyXG4gICAgICAgICAgICAgIHtcclxuICAgICAgICAgICAgICAgIGFuY2hvclBvaW50VXRpbGl0aWVzLnJlbW92ZUFuY2hvcihlZGdlLCBpbmRleCk7XHJcbiAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgIFxyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgICAgIGVsc2UgaWYoZHVtbXlOb2RlICE9IHVuZGVmaW5lZCAmJiAobW92ZWRFbmRQb2ludCA9PSAwIHx8IG1vdmVkRW5kUG9pbnQgPT0gMSkgKXtcclxuICAgICAgICAgICAgICBcclxuICAgICAgICAgICAgICB2YXIgbmV3Tm9kZSA9IGRldGFjaGVkTm9kZTtcclxuICAgICAgICAgICAgICB2YXIgaXNWYWxpZCA9ICd2YWxpZCc7XHJcbiAgICAgICAgICAgICAgdmFyIGxvY2F0aW9uID0gKG1vdmVkRW5kUG9pbnQgPT0gMCkgPyAnc291cmNlJyA6ICd0YXJnZXQnO1xyXG5cclxuICAgICAgICAgICAgICAvLyB2YWxpZGF0ZSBlZGdlIHJlY29ubmVjdGlvblxyXG4gICAgICAgICAgICAgIGlmKG5vZGVUb0F0dGFjaCl7XHJcbiAgICAgICAgICAgICAgICB2YXIgbmV3U291cmNlID0gKG1vdmVkRW5kUG9pbnQgPT0gMCkgPyBub2RlVG9BdHRhY2ggOiBlZGdlLnNvdXJjZSgpO1xyXG4gICAgICAgICAgICAgICAgdmFyIG5ld1RhcmdldCA9IChtb3ZlZEVuZFBvaW50ID09IDEpID8gbm9kZVRvQXR0YWNoIDogZWRnZS50YXJnZXQoKTtcclxuICAgICAgICAgICAgICAgIGlmKHR5cGVvZiB2YWxpZGF0ZUVkZ2UgPT09IFwiZnVuY3Rpb25cIilcclxuICAgICAgICAgICAgICAgICAgaXNWYWxpZCA9IHZhbGlkYXRlRWRnZShlZGdlLCBuZXdTb3VyY2UsIG5ld1RhcmdldCk7XHJcbiAgICAgICAgICAgICAgICBuZXdOb2RlID0gKGlzVmFsaWQgPT09ICd2YWxpZCcpID8gbm9kZVRvQXR0YWNoIDogZGV0YWNoZWROb2RlO1xyXG4gICAgICAgICAgICAgIH1cclxuXHJcbiAgICAgICAgICAgICAgdmFyIG5ld1NvdXJjZSA9IChtb3ZlZEVuZFBvaW50ID09IDApID8gbmV3Tm9kZSA6IGVkZ2Uuc291cmNlKCk7XHJcbiAgICAgICAgICAgICAgdmFyIG5ld1RhcmdldCA9IChtb3ZlZEVuZFBvaW50ID09IDEpID8gbmV3Tm9kZSA6IGVkZ2UudGFyZ2V0KCk7XHJcbiAgICAgICAgICAgICAgZWRnZSA9IHJlY29ubmVjdGlvblV0aWxpdGllcy5jb25uZWN0RWRnZShlZGdlLCBkZXRhY2hlZE5vZGUsIGxvY2F0aW9uKTtcclxuXHJcbiAgICAgICAgICAgICAgaWYoZGV0YWNoZWROb2RlLmlkKCkgIT09IG5ld05vZGUuaWQoKSl7XHJcbiAgICAgICAgICAgICAgICAvLyB1c2UgZ2l2ZW4gaGFuZGxlUmVjb25uZWN0RWRnZSBmdW5jdGlvbiBcclxuICAgICAgICAgICAgICAgIGlmKHR5cGVvZiBoYW5kbGVSZWNvbm5lY3RFZGdlID09PSAnZnVuY3Rpb24nKXtcclxuICAgICAgICAgICAgICAgICAgdmFyIHJlY29ubmVjdGVkRWRnZSA9IGhhbmRsZVJlY29ubmVjdEVkZ2UobmV3U291cmNlLmlkKCksIG5ld1RhcmdldC5pZCgpLCBlZGdlLmRhdGEoKSk7XHJcbiAgICAgICAgICAgICAgICAgIFxyXG4gICAgICAgICAgICAgICAgICBpZihyZWNvbm5lY3RlZEVkZ2Upe1xyXG4gICAgICAgICAgICAgICAgICAgIHJlY29ubmVjdGlvblV0aWxpdGllcy5jb3B5RWRnZShlZGdlLCByZWNvbm5lY3RlZEVkZ2UpO1xyXG4gICAgICAgICAgICAgICAgICAgIGFuY2hvclBvaW50VXRpbGl0aWVzLmluaXRBbmNob3JQb2ludHMob3B0aW9ucygpLmJlbmRQb3NpdGlvbnNGdW5jdGlvbiwgXHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBvcHRpb25zKCkuY29udHJvbFBvc2l0aW9uc0Z1bmN0aW9uLCBbcmVjb25uZWN0ZWRFZGdlXSk7XHJcbiAgICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICAgICAgXHJcbiAgICAgICAgICAgICAgICAgIGlmKHJlY29ubmVjdGVkRWRnZSAmJiBvcHRpb25zKCkudW5kb2FibGUpe1xyXG4gICAgICAgICAgICAgICAgICAgIHZhciBwYXJhbXMgPSB7XHJcbiAgICAgICAgICAgICAgICAgICAgICBuZXdFZGdlOiByZWNvbm5lY3RlZEVkZ2UsXHJcbiAgICAgICAgICAgICAgICAgICAgICBvbGRFZGdlOiBlZGdlXHJcbiAgICAgICAgICAgICAgICAgICAgfTtcclxuICAgICAgICAgICAgICAgICAgICBjeS51bmRvUmVkbygpLmRvKCdyZW1vdmVSZWNvbm5lY3RlZEVkZ2UnLCBwYXJhbXMpO1xyXG4gICAgICAgICAgICAgICAgICAgIGVkZ2UgPSByZWNvbm5lY3RlZEVkZ2U7XHJcbiAgICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICAgICAgZWxzZSBpZihyZWNvbm5lY3RlZEVkZ2Upe1xyXG4gICAgICAgICAgICAgICAgICAgIGN5LnJlbW92ZShlZGdlKTtcclxuICAgICAgICAgICAgICAgICAgICBlZGdlID0gcmVjb25uZWN0ZWRFZGdlO1xyXG4gICAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgICBlbHNle1xyXG4gICAgICAgICAgICAgICAgICB2YXIgbG9jID0gKG1vdmVkRW5kUG9pbnQgPT0gMCkgPyB7c291cmNlOiBuZXdOb2RlLmlkKCl9IDoge3RhcmdldDogbmV3Tm9kZS5pZCgpfTtcclxuICAgICAgICAgICAgICAgICAgdmFyIG9sZExvYyA9IChtb3ZlZEVuZFBvaW50ID09IDApID8ge3NvdXJjZTogZGV0YWNoZWROb2RlLmlkKCl9IDoge3RhcmdldDogZGV0YWNoZWROb2RlLmlkKCl9O1xyXG4gICAgICAgICAgICAgICAgICBcclxuICAgICAgICAgICAgICAgICAgaWYob3B0aW9ucygpLnVuZG9hYmxlICYmIG5ld05vZGUuaWQoKSAhPT0gZGV0YWNoZWROb2RlLmlkKCkpIHtcclxuICAgICAgICAgICAgICAgICAgICB2YXIgcGFyYW0gPSB7XHJcbiAgICAgICAgICAgICAgICAgICAgICBlZGdlOiBlZGdlLFxyXG4gICAgICAgICAgICAgICAgICAgICAgbG9jYXRpb246IGxvYyxcclxuICAgICAgICAgICAgICAgICAgICAgIG9sZExvYzogb2xkTG9jXHJcbiAgICAgICAgICAgICAgICAgICAgfTtcclxuICAgICAgICAgICAgICAgICAgICB2YXIgcmVzdWx0ID0gY3kudW5kb1JlZG8oKS5kbygncmVjb25uZWN0RWRnZScsIHBhcmFtKTtcclxuICAgICAgICAgICAgICAgICAgICBlZGdlID0gcmVzdWx0LmVkZ2U7XHJcbiAgICAgICAgICAgICAgICAgICAgLy9lZGdlLnNlbGVjdCgpO1xyXG4gICAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgICB9ICBcclxuICAgICAgICAgICAgICB9XHJcblxyXG4gICAgICAgICAgICAgIC8vIGludmFsaWQgZWRnZSByZWNvbm5lY3Rpb24gY2FsbGJhY2tcclxuICAgICAgICAgICAgICBpZihpc1ZhbGlkICE9PSAndmFsaWQnICYmIHR5cGVvZiBhY3RPblVuc3VjY2Vzc2Z1bFJlY29ubmVjdGlvbiA9PT0gJ2Z1bmN0aW9uJyl7XHJcbiAgICAgICAgICAgICAgICBhY3RPblVuc3VjY2Vzc2Z1bFJlY29ubmVjdGlvbigpO1xyXG4gICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICBlZGdlLnNlbGVjdCgpO1xyXG4gICAgICAgICAgICAgIGN5LnJlbW92ZShkdW1teU5vZGUpO1xyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgICB9XHJcbiAgICAgICAgICB2YXIgdHlwZSA9IGFuY2hvclBvaW50VXRpbGl0aWVzLmdldEVkZ2VUeXBlKGVkZ2UpO1xyXG5cclxuICAgICAgICAgIC8vIHRvIGF2b2lkIGVycm9yc1xyXG4gICAgICAgICAgaWYodHlwZSA9PT0gJ2luY29uY2x1c2l2ZScpe1xyXG4gICAgICAgICAgICB0eXBlID0gJ2JlbmQnO1xyXG4gICAgICAgICAgfVxyXG5cclxuICAgICAgICAgIGlmKGFuY2hvck1hbmFnZXIudG91Y2hlZEFuY2hvckluZGV4ID09PSB1bmRlZmluZWQgJiYgIWFuY2hvckNyZWF0ZWRCeURyYWcpe1xyXG4gICAgICAgICAgICBtb3ZlQW5jaG9yUGFyYW0gPSB1bmRlZmluZWQ7XHJcbiAgICAgICAgICB9XHJcblxyXG4gICAgICAgICAgdmFyIHdlaWdodFN0ciA9IGFuY2hvclBvaW50VXRpbGl0aWVzLnN5bnRheFt0eXBlXVsnd2VpZ2h0J107XHJcbiAgICAgICAgICBpZiAoZWRnZSAhPT0gdW5kZWZpbmVkICYmIG1vdmVBbmNob3JQYXJhbSAhPT0gdW5kZWZpbmVkICYmIGVkZ2UuZGF0YSh3ZWlnaHRTdHIpXHJcbiAgICAgICAgICAmJiBlZGdlLmRhdGEod2VpZ2h0U3RyKS50b1N0cmluZygpICE9IG1vdmVBbmNob3JQYXJhbS53ZWlnaHRzLnRvU3RyaW5nKCkpIHtcclxuICAgICAgICAgICAgXHJcbiAgICAgICAgICAgIC8vIGFuY2hvciBjcmVhdGVkIGZyb20gZHJhZ1xyXG4gICAgICAgICAgICBpZihhbmNob3JDcmVhdGVkQnlEcmFnKXtcclxuICAgICAgICAgICAgZWRnZS5zZWxlY3QoKTsgXHJcblxyXG4gICAgICAgICAgICAvLyBzdG9wcyB0aGUgdW5idW5kbGVkIGJlemllciBlZGdlcyBmcm9tIGJlaW5nIHVuc2VsZWN0ZWRcclxuICAgICAgICAgICAgY3kuYXV0b3Vuc2VsZWN0aWZ5KHRydWUpO1xyXG4gICAgICAgICAgICB9XHJcblxyXG4gICAgICAgICAgICBpZihvcHRpb25zKCkudW5kb2FibGUpIHtcclxuICAgICAgICAgICAgICBjeS51bmRvUmVkbygpLmRvKCdjaGFuZ2VBbmNob3JQb2ludHMnLCBtb3ZlQW5jaG9yUGFyYW0pO1xyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgICB9XHJcbiAgICAgICAgICBcclxuICAgICAgICAgIG1vdmVkQW5jaG9ySW5kZXggPSB1bmRlZmluZWQ7XHJcbiAgICAgICAgICBtb3ZlZEVkZ2UgPSB1bmRlZmluZWQ7XHJcbiAgICAgICAgICBtb3ZlQW5jaG9yUGFyYW0gPSB1bmRlZmluZWQ7XHJcbiAgICAgICAgICBjcmVhdGVBbmNob3JPbkRyYWcgPSB1bmRlZmluZWQ7XHJcbiAgICAgICAgICBtb3ZlZEVuZFBvaW50ID0gdW5kZWZpbmVkO1xyXG4gICAgICAgICAgZHVtbXlOb2RlID0gdW5kZWZpbmVkO1xyXG4gICAgICAgICAgZGV0YWNoZWROb2RlID0gdW5kZWZpbmVkO1xyXG4gICAgICAgICAgbm9kZVRvQXR0YWNoID0gdW5kZWZpbmVkO1xyXG4gICAgICAgICAgdGFwU3RhcnRQb3MgPSB1bmRlZmluZWQ7XHJcbiAgICAgICAgICBhbmNob3JDcmVhdGVkQnlEcmFnID0gZmFsc2U7XHJcblxyXG4gICAgICAgICAgYW5jaG9yTWFuYWdlci50b3VjaGVkQW5jaG9ySW5kZXggPSB1bmRlZmluZWQ7IFxyXG5cclxuICAgICAgICAgIHJlc2V0R2VzdHVyZXMoKTtcclxuICAgICAgICAgIHNldFRpbWVvdXQoZnVuY3Rpb24oKXtyZWZyZXNoRHJhd3MoKX0sIDUwKTtcclxuICAgICAgICB9KTtcclxuXHJcbiAgICAgICAgLy9WYXJpYWJsZXMgdXNlZCBmb3Igc3RhcnRpbmcgYW5kIGVuZGluZyB0aGUgbW92ZW1lbnQgb2YgYW5jaG9yIHBvaW50cyB3aXRoIGFycm93c1xyXG4gICAgICAgIHZhciBtb3ZlYW5jaG9ycGFyYW07XHJcbiAgICAgICAgdmFyIGZpcnN0QW5jaG9yO1xyXG4gICAgICAgIHZhciBlZGdlQ29udGFpbmluZ0ZpcnN0QW5jaG9yO1xyXG4gICAgICAgIHZhciBmaXJzdEFuY2hvclBvaW50Rm91bmQ7XHJcbiAgICAgICAgY3kub24oXCJlZGdlZWRpdGluZy5tb3Zlc3RhcnRcIiwgZnVuY3Rpb24gKGUsIGVkZ2VzKSB7XHJcbiAgICAgICAgICAgIGZpcnN0QW5jaG9yUG9pbnRGb3VuZCA9IGZhbHNlO1xyXG4gICAgICAgICAgICBpZiAoZWRnZXNbMF0gIT0gdW5kZWZpbmVkKVxyXG4gICAgICAgICAgICB7XHJcbiAgICAgICAgICAgICAgICBlZGdlcy5mb3JFYWNoKGZ1bmN0aW9uKCBlZGdlICl7XHJcbiAgICAgICAgICAgICAgICAgIGlmIChhbmNob3JQb2ludFV0aWxpdGllcy5nZXRBbmNob3JzQXNBcnJheShlZGdlKSAhPSB1bmRlZmluZWQgJiYgIWZpcnN0QW5jaG9yUG9pbnRGb3VuZClcclxuICAgICAgICAgICAgICAgICAge1xyXG4gICAgICAgICAgICAgICAgICAgICAgZmlyc3RBbmNob3IgPSB7IHg6IGFuY2hvclBvaW50VXRpbGl0aWVzLmdldEFuY2hvcnNBc0FycmF5KGVkZ2UpWzBdLCB5OiBhbmNob3JQb2ludFV0aWxpdGllcy5nZXRBbmNob3JzQXNBcnJheShlZGdlKVsxXX07XHJcbiAgICAgICAgICAgICAgICAgICAgICBtb3ZlYW5jaG9ycGFyYW0gPSB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgZmlyc3RUaW1lOiB0cnVlLFxyXG4gICAgICAgICAgICAgICAgICAgICAgICAgIGZpcnN0QW5jaG9yUG9zaXRpb246IHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgeDogZmlyc3RBbmNob3IueCxcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgeTogZmlyc3RBbmNob3IueVxyXG4gICAgICAgICAgICAgICAgICAgICAgICAgIH0sXHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgZWRnZXM6IGVkZ2VzXHJcbiAgICAgICAgICAgICAgICAgICAgICB9O1xyXG4gICAgICAgICAgICAgICAgICAgICAgZWRnZUNvbnRhaW5pbmdGaXJzdEFuY2hvciA9IGVkZ2U7XHJcbiAgICAgICAgICAgICAgICAgICAgICBmaXJzdEFuY2hvclBvaW50Rm91bmQgPSB0cnVlO1xyXG4gICAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgICB9KTtcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgIH0pO1xyXG5cclxuICAgICAgICBjeS5vbihcImVkZ2VlZGl0aW5nLm1vdmVlbmRcIiwgZnVuY3Rpb24gKGUsIGVkZ2VzKSB7XHJcbiAgICAgICAgICAgIGlmIChtb3ZlYW5jaG9ycGFyYW0gIT0gdW5kZWZpbmVkKVxyXG4gICAgICAgICAgICB7XHJcbiAgICAgICAgICAgICAgICB2YXIgaW5pdGlhbFBvcyA9IG1vdmVhbmNob3JwYXJhbS5maXJzdEFuY2hvclBvc2l0aW9uO1xyXG4gICAgICAgICAgICAgICAgdmFyIG1vdmVkRmlyc3RBbmNob3IgPSB7XHJcbiAgICAgICAgICAgICAgICAgICAgeDogYW5jaG9yUG9pbnRVdGlsaXRpZXMuZ2V0QW5jaG9yc0FzQXJyYXkoZWRnZUNvbnRhaW5pbmdGaXJzdEFuY2hvcilbMF0sXHJcbiAgICAgICAgICAgICAgICAgICAgeTogYW5jaG9yUG9pbnRVdGlsaXRpZXMuZ2V0QW5jaG9yc0FzQXJyYXkoZWRnZUNvbnRhaW5pbmdGaXJzdEFuY2hvcilbMV1cclxuICAgICAgICAgICAgICAgIH07XHJcblxyXG5cclxuICAgICAgICAgICAgICAgIG1vdmVhbmNob3JwYXJhbS5wb3NpdGlvbkRpZmYgPSB7XHJcbiAgICAgICAgICAgICAgICAgICAgeDogLW1vdmVkRmlyc3RBbmNob3IueCArIGluaXRpYWxQb3MueCxcclxuICAgICAgICAgICAgICAgICAgICB5OiAtbW92ZWRGaXJzdEFuY2hvci55ICsgaW5pdGlhbFBvcy55XHJcbiAgICAgICAgICAgICAgICB9XHJcblxyXG4gICAgICAgICAgICAgICAgZGVsZXRlIG1vdmVhbmNob3JwYXJhbS5maXJzdEFuY2hvclBvc2l0aW9uO1xyXG5cclxuICAgICAgICAgICAgICAgIGlmKG9wdGlvbnMoKS51bmRvYWJsZSkge1xyXG4gICAgICAgICAgICAgICAgICAgIGN5LnVuZG9SZWRvKCkuZG8oXCJtb3ZlQW5jaG9yUG9pbnRzXCIsIG1vdmVhbmNob3JwYXJhbSk7XHJcbiAgICAgICAgICAgICAgICB9XHJcblxyXG4gICAgICAgICAgICAgICAgbW92ZWFuY2hvcnBhcmFtID0gdW5kZWZpbmVkO1xyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgfSk7XHJcblxyXG4gICAgICAgIGN5Lm9uKCdjeHR0YXAnLCBlQ3h0VGFwID0gZnVuY3Rpb24gKGV2ZW50KSB7XHJcbiAgICAgICAgICB2YXIgZWRnZSA9IGFuY2hvck1hbmFnZXIuZWRnZTsgICAgICAgICAgXHJcbiAgICAgICAgICB2YXIgdHlwZSA9IGFuY2hvck1hbmFnZXIuZWRnZVR5cGU7XHJcblxyXG4gICAgICAgICAgdmFyIG1lbnVzID0gY3kuY29udGV4dE1lbnVzKCdnZXQnKTsgLy8gZ2V0IGNvbnRleHQgbWVudXMgaW5zdGFuY2VcclxuICAgICAgICAgIFxyXG4gICAgICAgICAgaWYoIWVkZ2VUb0hpZ2hsaWdodCB8fCBlZGdlVG9IaWdobGlnaHQuaWQoKSAhPSBlZGdlLmlkKCkgfHwgYW5jaG9yUG9pbnRVdGlsaXRpZXMuaXNJZ25vcmVkRWRnZShlZGdlKSkge1xyXG4gICAgICAgICAgICBtZW51cy5oaWRlTWVudUl0ZW0ocmVtb3ZlQmVuZFBvaW50Q3h0TWVudUlkKTtcclxuICAgICAgICAgICAgbWVudXMuaGlkZU1lbnVJdGVtKGFkZEJlbmRQb2ludEN4dE1lbnVJZCk7XHJcbiAgICAgICAgICAgIG1lbnVzLmhpZGVNZW51SXRlbShyZW1vdmVDb250cm9sUG9pbnRDeHRNZW51SWQpO1xyXG4gICAgICAgICAgICBtZW51cy5oaWRlTWVudUl0ZW0oYWRkQ29udHJvbFBvaW50Q3h0TWVudUlkKTtcclxuICAgICAgICAgICAgcmV0dXJuO1xyXG4gICAgICAgICAgfVxyXG5cclxuICAgICAgICAgIHZhciBjeVBvcyA9IGV2ZW50LnBvc2l0aW9uIHx8IGV2ZW50LmN5UG9zaXRpb247XHJcbiAgICAgICAgICB2YXIgc2VsZWN0ZWRJbmRleCA9IGdldENvbnRhaW5pbmdTaGFwZUluZGV4KGN5UG9zLngsIGN5UG9zLnksIGVkZ2UpO1xyXG4gICAgICAgICAgaWYgKHNlbGVjdGVkSW5kZXggPT0gLTEpIHtcclxuICAgICAgICAgICAgbWVudXMuaGlkZU1lbnVJdGVtKHJlbW92ZUJlbmRQb2ludEN4dE1lbnVJZCk7XHJcbiAgICAgICAgICAgIG1lbnVzLmhpZGVNZW51SXRlbShyZW1vdmVDb250cm9sUG9pbnRDeHRNZW51SWQpO1xyXG4gICAgICAgICAgICBpZih0eXBlID09PSAnY29udHJvbCcpe1xyXG4gICAgICAgICAgICAgIG1lbnVzLnNob3dNZW51SXRlbShhZGRDb250cm9sUG9pbnRDeHRNZW51SWQpO1xyXG4gICAgICAgICAgICAgIG1lbnVzLmhpZGVNZW51SXRlbShhZGRCZW5kUG9pbnRDeHRNZW51SWQpO1xyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgICAgIGVsc2UgaWYodHlwZSA9PT0gJ2JlbmQnKXtcclxuICAgICAgICAgICAgICBtZW51cy5zaG93TWVudUl0ZW0oYWRkQmVuZFBvaW50Q3h0TWVudUlkKTtcclxuICAgICAgICAgICAgICBtZW51cy5oaWRlTWVudUl0ZW0oYWRkQ29udHJvbFBvaW50Q3h0TWVudUlkKTtcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICBlbHNle1xyXG4gICAgICAgICAgICAgIG1lbnVzLmhpZGVNZW51SXRlbShhZGRCZW5kUG9pbnRDeHRNZW51SWQpO1xyXG4gICAgICAgICAgICAgIG1lbnVzLmhpZGVNZW51SXRlbShhZGRDb250cm9sUG9pbnRDeHRNZW51SWQpO1xyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgICAgIGFuY2hvclBvaW50VXRpbGl0aWVzLmN1cnJlbnRDdHhQb3MgPSBjeVBvcztcclxuICAgICAgICAgIH1cclxuICAgICAgICAgIGVsc2Uge1xyXG4gICAgICAgICAgICBtZW51cy5oaWRlTWVudUl0ZW0oYWRkQmVuZFBvaW50Q3h0TWVudUlkKTtcclxuICAgICAgICAgICAgbWVudXMuaGlkZU1lbnVJdGVtKGFkZENvbnRyb2xQb2ludEN4dE1lbnVJZCk7XHJcbiAgICAgICAgICAgIGlmKHR5cGUgPT09ICdjb250cm9sJyl7XHJcbiAgICAgICAgICAgICAgbWVudXMuc2hvd01lbnVJdGVtKHJlbW92ZUNvbnRyb2xQb2ludEN4dE1lbnVJZCk7XHJcbiAgICAgICAgICAgICAgbWVudXMuaGlkZU1lbnVJdGVtKHJlbW92ZUJlbmRQb2ludEN4dE1lbnVJZCk7XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgZWxzZSBpZih0eXBlID09PSAnYmVuZCcpe1xyXG4gICAgICAgICAgICAgIG1lbnVzLnNob3dNZW51SXRlbShyZW1vdmVCZW5kUG9pbnRDeHRNZW51SWQpO1xyXG4gICAgICAgICAgICAgIG1lbnVzLmhpZGVNZW51SXRlbShyZW1vdmVDb250cm9sUG9pbnRDeHRNZW51SWQpO1xyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgICAgIGVsc2V7XHJcbiAgICAgICAgICAgICAgbWVudXMuaGlkZU1lbnVJdGVtKHJlbW92ZUJlbmRQb2ludEN4dE1lbnVJZCk7XHJcbiAgICAgICAgICAgICAgbWVudXMuaGlkZU1lbnVJdGVtKHJlbW92ZUNvbnRyb2xQb2ludEN4dE1lbnVJZCk7XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgYW5jaG9yUG9pbnRVdGlsaXRpZXMuY3VycmVudEFuY2hvckluZGV4ID0gc2VsZWN0ZWRJbmRleDtcclxuICAgICAgICAgIH1cclxuXHJcbiAgICAgICAgICBhbmNob3JQb2ludFV0aWxpdGllcy5jdXJyZW50Q3R4RWRnZSA9IGVkZ2U7XHJcbiAgICAgICAgfSk7XHJcbiAgICAgICAgXHJcbiAgICAgICAgY3kub24oJ2N5ZWRnZWVkaXRpbmcuY2hhbmdlQW5jaG9yUG9pbnRzJywgJ2VkZ2UnLCBmdW5jdGlvbigpIHtcclxuICAgICAgICAgIHZhciBlZGdlID0gdGhpcztcclxuICAgICAgICAgIGN5LnN0YXJ0QmF0Y2goKTtcclxuICAgICAgICAgIGN5LmVkZ2VzKCkudW5zZWxlY3QoKTsgXHJcbiAgICAgICAgICAgICAgICAgICAgXHJcbiAgICAgICAgICAvLyBMaXN0ZW5lciBkZWZpbmVkIGluIG90aGVyIGV4dGVuc2lvblxyXG4gICAgICAgICAgLy8gTWlnaHQgaGF2ZSBjb21wYXRpYmlsaXR5IGlzc3VlcyBhZnRlciB0aGUgdW5idW5kbGVkIGJlemllciAgICBcclxuICAgICAgICAgIGN5LnRyaWdnZXIoJ2JlbmRQb2ludE1vdmVtZW50Jyk7ICAgIFxyXG4gICAgICAgICAgXHJcbiAgICAgICAgICBjeS5lbmRCYXRjaCgpOyAgICAgICAgICBcclxuICAgICAgICAgIHJlZnJlc2hEcmF3cygpO1xyXG4gICAgICAgIFxyXG4gICAgICAgICAgXHJcbiAgICAgICAgfSk7XHJcbiAgICAgIH1cclxuXHJcbiAgICAgIHZhciBzZWxlY3RlZEVkZ2VzO1xyXG4gICAgICB2YXIgYW5jaG9yc01vdmluZyA9IGZhbHNlO1xyXG5cclxuICAgICAgZnVuY3Rpb24ga2V5RG93bihlKSB7XHJcbiAgICAgICAgY3kuYXV0b3Vuc2VsZWN0aWZ5KGZhbHNlKTtcclxuXHJcbiAgICAgICAgICB2YXIgc2hvdWxkTW92ZSA9IHR5cGVvZiBvcHRpb25zKCkubW92ZVNlbGVjdGVkQW5jaG9yc09uS2V5RXZlbnRzID09PSAnZnVuY3Rpb24nXHJcbiAgICAgICAgICAgICAgPyBvcHRpb25zKCkubW92ZVNlbGVjdGVkQW5jaG9yc09uS2V5RXZlbnRzKCkgOiBvcHRpb25zKCkubW92ZVNlbGVjdGVkQW5jaG9yc09uS2V5RXZlbnRzO1xyXG5cclxuICAgICAgICAgIGlmICghc2hvdWxkTW92ZSkge1xyXG4gICAgICAgICAgICAgIHJldHVybjtcclxuICAgICAgICAgIH1cclxuXHJcbiAgICAgICAgICAvL0NoZWNrcyBpZiB0aGUgdGFnbmFtZSBpcyB0ZXh0YXJlYSBvciBpbnB1dFxyXG4gICAgICAgICAgdmFyIHRuID0gZG9jdW1lbnQuYWN0aXZlRWxlbWVudC50YWdOYW1lO1xyXG4gICAgICAgICAgaWYgKHRuICE9IFwiVEVYVEFSRUFcIiAmJiB0biAhPSBcIklOUFVUXCIpXHJcbiAgICAgICAgICB7XHJcbiAgICAgICAgICAgICAgc3dpdGNoKGUua2V5Q29kZSl7XHJcbiAgICAgICAgICAgICAgICAgIGNhc2UgMzc6IGNhc2UgMzk6IGNhc2UgMzg6ICBjYXNlIDQwOiAvLyBBcnJvdyBrZXlzXHJcbiAgICAgICAgICAgICAgICAgIGNhc2UgMzI6IGUucHJldmVudERlZmF1bHQoKTsgYnJlYWs7IC8vIFNwYWNlXHJcbiAgICAgICAgICAgICAgICAgIGRlZmF1bHQ6IGJyZWFrOyAvLyBkbyBub3QgYmxvY2sgb3RoZXIga2V5c1xyXG4gICAgICAgICAgICAgIH1cclxuXHJcblxyXG4gICAgICAgICAgICAgIGlmIChlLmtleUNvZGUgPCAnMzcnIHx8IGUua2V5Q29kZSA+ICc0MCcpIHtcclxuICAgICAgICAgICAgICAgICAgcmV0dXJuO1xyXG4gICAgICAgICAgICAgIH1cclxuXHJcbiAgICAgICAgICAgICAgLy9DaGVja3MgaWYgb25seSBlZGdlcyBhcmUgc2VsZWN0ZWQgKG5vdCBhbnkgbm9kZSkgYW5kIGlmIG9ubHkgMSBlZGdlIGlzIHNlbGVjdGVkXHJcbiAgICAgICAgICAgICAgLy9JZiB0aGUgc2Vjb25kIGNoZWNraW5nIGlzIHJlbW92ZWQgdGhlIGFuY2hvcnMgb2YgbXVsdGlwbGUgZWRnZXMgd291bGQgbW92ZVxyXG4gICAgICAgICAgICAgIGlmIChjeS5lZGdlcyhcIjpzZWxlY3RlZFwiKS5sZW5ndGggIT0gY3kuZWxlbWVudHMoXCI6c2VsZWN0ZWRcIikubGVuZ3RoIHx8IGN5LmVkZ2VzKFwiOnNlbGVjdGVkXCIpLmxlbmd0aCAhPSAxKVxyXG4gICAgICAgICAgICAgIHtcclxuICAgICAgICAgICAgICAgIHJldHVybjtcclxuICAgICAgICAgICAgICB9XHJcblxyXG4gICAgICAgICAgICAgIGlmICghYW5jaG9yc01vdmluZylcclxuICAgICAgICAgICAgICB7XHJcbiAgICAgICAgICAgICAgICAgIHNlbGVjdGVkRWRnZXMgPSBjeS5lZGdlcygnOnNlbGVjdGVkJyk7XHJcbiAgICAgICAgICAgICAgICAgIGN5LnRyaWdnZXIoXCJlZGdlZWRpdGluZy5tb3Zlc3RhcnRcIiwgW3NlbGVjdGVkRWRnZXNdKTtcclxuICAgICAgICAgICAgICAgICAgYW5jaG9yc01vdmluZyA9IHRydWU7XHJcbiAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgIGlmIChlLmFsdEtleSAmJiBlLndoaWNoID09ICczOCcpIHtcclxuICAgICAgICAgICAgICAgICAgLy8gdXAgYXJyb3cgYW5kIGFsdFxyXG4gICAgICAgICAgICAgICAgICBtb3ZlQW5jaG9yUG9pbnRzICh7eDowLCB5Oi0xfSxzZWxlY3RlZEVkZ2VzKTtcclxuICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgZWxzZSBpZiAoZS5hbHRLZXkgJiYgZS53aGljaCA9PSAnNDAnKSB7XHJcbiAgICAgICAgICAgICAgICAgIC8vIGRvd24gYXJyb3cgYW5kIGFsdFxyXG4gICAgICAgICAgICAgICAgICBtb3ZlQW5jaG9yUG9pbnRzICh7eDowLCB5OjF9LHNlbGVjdGVkRWRnZXMpO1xyXG4gICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICBlbHNlIGlmIChlLmFsdEtleSAmJiBlLndoaWNoID09ICczNycpIHtcclxuICAgICAgICAgICAgICAgICAgLy8gbGVmdCBhcnJvdyBhbmQgYWx0XHJcbiAgICAgICAgICAgICAgICAgIG1vdmVBbmNob3JQb2ludHMgKHt4Oi0xLCB5OjB9LHNlbGVjdGVkRWRnZXMpO1xyXG4gICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICBlbHNlIGlmIChlLmFsdEtleSAmJiBlLndoaWNoID09ICczOScpIHtcclxuICAgICAgICAgICAgICAgICAgLy8gcmlnaHQgYXJyb3cgYW5kIGFsdFxyXG4gICAgICAgICAgICAgICAgICBtb3ZlQW5jaG9yUG9pbnRzICh7eDoxLCB5OjB9LHNlbGVjdGVkRWRnZXMpO1xyXG4gICAgICAgICAgICAgIH1cclxuXHJcbiAgICAgICAgICAgICAgZWxzZSBpZiAoZS5zaGlmdEtleSAmJiBlLndoaWNoID09ICczOCcpIHtcclxuICAgICAgICAgICAgICAgICAgLy8gdXAgYXJyb3cgYW5kIHNoaWZ0XHJcbiAgICAgICAgICAgICAgICAgIG1vdmVBbmNob3JQb2ludHMgKHt4OjAsIHk6LTEwfSxzZWxlY3RlZEVkZ2VzKTtcclxuICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgZWxzZSBpZiAoZS5zaGlmdEtleSAmJiBlLndoaWNoID09ICc0MCcpIHtcclxuICAgICAgICAgICAgICAgICAgLy8gZG93biBhcnJvdyBhbmQgc2hpZnRcclxuICAgICAgICAgICAgICAgICAgbW92ZUFuY2hvclBvaW50cyAoe3g6MCwgeToxMH0sc2VsZWN0ZWRFZGdlcyk7XHJcbiAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgIGVsc2UgaWYgKGUuc2hpZnRLZXkgJiYgZS53aGljaCA9PSAnMzcnKSB7XHJcbiAgICAgICAgICAgICAgICAgIC8vIGxlZnQgYXJyb3cgYW5kIHNoaWZ0XHJcbiAgICAgICAgICAgICAgICAgIG1vdmVBbmNob3JQb2ludHMgKHt4Oi0xMCwgeTowfSxzZWxlY3RlZEVkZ2VzKTtcclxuXHJcbiAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgIGVsc2UgaWYgKGUuc2hpZnRLZXkgJiYgZS53aGljaCA9PSAnMzknICkge1xyXG4gICAgICAgICAgICAgICAgICAvLyByaWdodCBhcnJvdyBhbmQgc2hpZnRcclxuICAgICAgICAgICAgICAgICAgbW92ZUFuY2hvclBvaW50cyAoe3g6MTAsIHk6MH0sc2VsZWN0ZWRFZGdlcyk7XHJcbiAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgIGVsc2UgaWYgKGUua2V5Q29kZSA9PSAnMzgnKSB7XHJcbiAgICAgICAgICAgICAgICAgIC8vIHVwIGFycm93XHJcbiAgICAgICAgICAgICAgICAgIG1vdmVBbmNob3JQb2ludHMoe3g6IDAsIHk6IC0zfSwgc2VsZWN0ZWRFZGdlcyk7XHJcbiAgICAgICAgICAgICAgfVxyXG5cclxuICAgICAgICAgICAgICBlbHNlIGlmIChlLmtleUNvZGUgPT0gJzQwJykge1xyXG4gICAgICAgICAgICAgICAgICAvLyBkb3duIGFycm93XHJcbiAgICAgICAgICAgICAgICAgIG1vdmVBbmNob3JQb2ludHMgKHt4OjAsIHk6M30sc2VsZWN0ZWRFZGdlcyk7XHJcbiAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgIGVsc2UgaWYgKGUua2V5Q29kZSA9PSAnMzcnKSB7XHJcbiAgICAgICAgICAgICAgICAgIC8vIGxlZnQgYXJyb3dcclxuICAgICAgICAgICAgICAgICAgbW92ZUFuY2hvclBvaW50cyAoe3g6LTMsIHk6MH0sc2VsZWN0ZWRFZGdlcyk7XHJcbiAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgIGVsc2UgaWYgKGUua2V5Q29kZSA9PSAnMzknKSB7XHJcbiAgICAgICAgICAgICAgICAgIC8vcmlnaHQgYXJyb3dcclxuICAgICAgICAgICAgICAgICAgbW92ZUFuY2hvclBvaW50cyAoe3g6MywgeTowfSxzZWxlY3RlZEVkZ2VzKTtcclxuICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICB9XHJcbiAgICAgIH1cclxuICAgICAgZnVuY3Rpb24ga2V5VXAoZSkge1xyXG5cclxuICAgICAgICAgIGlmIChlLmtleUNvZGUgPCAnMzcnIHx8IGUua2V5Q29kZSA+ICc0MCcpIHtcclxuICAgICAgICAgICAgICByZXR1cm47XHJcbiAgICAgICAgICB9XHJcblxyXG4gICAgICAgICAgdmFyIHNob3VsZE1vdmUgPSB0eXBlb2Ygb3B0aW9ucygpLm1vdmVTZWxlY3RlZEFuY2hvcnNPbktleUV2ZW50cyA9PT0gJ2Z1bmN0aW9uJ1xyXG4gICAgICAgICAgICAgID8gb3B0aW9ucygpLm1vdmVTZWxlY3RlZEFuY2hvcnNPbktleUV2ZW50cygpIDogb3B0aW9ucygpLm1vdmVTZWxlY3RlZEFuY2hvcnNPbktleUV2ZW50cztcclxuXHJcbiAgICAgICAgICBpZiAoIXNob3VsZE1vdmUpIHtcclxuICAgICAgICAgICAgICByZXR1cm47XHJcbiAgICAgICAgICB9XHJcblxyXG4gICAgICAgICAgY3kudHJpZ2dlcihcImVkZ2VlZGl0aW5nLm1vdmVlbmRcIiwgW3NlbGVjdGVkRWRnZXNdKTtcclxuICAgICAgICAgIHNlbGVjdGVkRWRnZXMgPSB1bmRlZmluZWQ7XHJcbiAgICAgICAgICBhbmNob3JzTW92aW5nID0gZmFsc2U7XHJcblxyXG4gICAgICB9XHJcbiAgICAgIGRvY3VtZW50LmFkZEV2ZW50TGlzdGVuZXIoXCJrZXlkb3duXCIsa2V5RG93biwgdHJ1ZSk7XHJcbiAgICAgIGRvY3VtZW50LmFkZEV2ZW50TGlzdGVuZXIoXCJrZXl1cFwiLGtleVVwLCB0cnVlKTtcclxuXHJcbiAgICAgICRjb250YWluZXIuZGF0YSgnY3llZGdlZWRpdGluZycsIGRhdGEpO1xyXG4gICAgfSxcclxuICAgIHVuYmluZDogZnVuY3Rpb24gKCkge1xyXG4gICAgICAgIGN5Lm9mZigncmVtb3ZlJywgJ25vZGUnLCBlUmVtb3ZlKVxyXG4gICAgICAgICAgLm9mZignYWRkJywgJ25vZGUnLCBlQWRkKVxyXG4gICAgICAgICAgLm9mZignc3R5bGUnLCAnZWRnZS5lZGdlYmVuZGVkaXRpbmctaGFzYmVuZHBvaW50czpzZWxlY3RlZCwgZWRnZS5lZGdlY29udHJvbGVkaXRpbmctaGFzY29udHJvbHBvaW50czpzZWxlY3RlZCcsIGVTdHlsZSlcclxuICAgICAgICAgIC5vZmYoJ3NlbGVjdCcsICdlZGdlJywgZVNlbGVjdClcclxuICAgICAgICAgIC5vZmYoJ3Vuc2VsZWN0JywgJ2VkZ2UnLCBlVW5zZWxlY3QpXHJcbiAgICAgICAgICAub2ZmKCd0YXBzdGFydCcsIGVUYXBTdGFydClcclxuICAgICAgICAgIC5vZmYoJ3RhcHN0YXJ0JywgJ2VkZ2UnLCBlVGFwU3RhcnRPbkVkZ2UpXHJcbiAgICAgICAgICAub2ZmKCd0YXBkcmFnJywgZVRhcERyYWcpXHJcbiAgICAgICAgICAub2ZmKCd0YXBlbmQnLCBlVGFwRW5kKVxyXG4gICAgICAgICAgLm9mZignY3h0dGFwJywgZUN4dFRhcClcclxuICAgICAgICAgIC5vZmYoJ2RyYWcnLCAnbm9kZScsZURyYWcpO1xyXG5cclxuICAgICAgICBjeS51bmJpbmQoXCJ6b29tIHBhblwiLCBlWm9vbSk7XHJcbiAgICB9XHJcbiAgfTtcclxuXHJcbiAgaWYgKGZ1bmN0aW9uc1tmbl0pIHtcclxuICAgIHJldHVybiBmdW5jdGlvbnNbZm5dLmFwcGx5KCQoY3kuY29udGFpbmVyKCkpLCBBcnJheS5wcm90b3R5cGUuc2xpY2UuY2FsbChhcmd1bWVudHMsIDEpKTtcclxuICB9IGVsc2UgaWYgKHR5cGVvZiBmbiA9PSAnb2JqZWN0JyB8fCAhZm4pIHtcclxuICAgIHJldHVybiBmdW5jdGlvbnMuaW5pdC5hcHBseSgkKGN5LmNvbnRhaW5lcigpKSwgYXJndW1lbnRzKTtcclxuICB9IGVsc2Uge1xyXG4gICAgJC5lcnJvcignTm8gc3VjaCBmdW5jdGlvbiBgJyArIGZuICsgJ2AgZm9yIGN5dG9zY2FwZS5qcy1lZGdlLWVkaXRpbmcnKTtcclxuICB9XHJcblxyXG4gIHJldHVybiAkKHRoaXMpO1xyXG59O1xyXG4iLCJ2YXIgZGVib3VuY2UgPSAoZnVuY3Rpb24gKCkge1xyXG4gIC8qKlxyXG4gICAqIGxvZGFzaCAzLjEuMSAoQ3VzdG9tIEJ1aWxkKSA8aHR0cHM6Ly9sb2Rhc2guY29tLz5cclxuICAgKiBCdWlsZDogYGxvZGFzaCBtb2Rlcm4gbW9kdWxhcml6ZSBleHBvcnRzPVwibnBtXCIgLW8gLi9gXHJcbiAgICogQ29weXJpZ2h0IDIwMTItMjAxNSBUaGUgRG9qbyBGb3VuZGF0aW9uIDxodHRwOi8vZG9qb2ZvdW5kYXRpb24ub3JnLz5cclxuICAgKiBCYXNlZCBvbiBVbmRlcnNjb3JlLmpzIDEuOC4zIDxodHRwOi8vdW5kZXJzY29yZWpzLm9yZy9MSUNFTlNFPlxyXG4gICAqIENvcHlyaWdodCAyMDA5LTIwMTUgSmVyZW15IEFzaGtlbmFzLCBEb2N1bWVudENsb3VkIGFuZCBJbnZlc3RpZ2F0aXZlIFJlcG9ydGVycyAmIEVkaXRvcnNcclxuICAgKiBBdmFpbGFibGUgdW5kZXIgTUlUIGxpY2Vuc2UgPGh0dHBzOi8vbG9kYXNoLmNvbS9saWNlbnNlPlxyXG4gICAqL1xyXG4gIC8qKiBVc2VkIGFzIHRoZSBgVHlwZUVycm9yYCBtZXNzYWdlIGZvciBcIkZ1bmN0aW9uc1wiIG1ldGhvZHMuICovXHJcbiAgdmFyIEZVTkNfRVJST1JfVEVYVCA9ICdFeHBlY3RlZCBhIGZ1bmN0aW9uJztcclxuXHJcbiAgLyogTmF0aXZlIG1ldGhvZCByZWZlcmVuY2VzIGZvciB0aG9zZSB3aXRoIHRoZSBzYW1lIG5hbWUgYXMgb3RoZXIgYGxvZGFzaGAgbWV0aG9kcy4gKi9cclxuICB2YXIgbmF0aXZlTWF4ID0gTWF0aC5tYXgsXHJcbiAgICAgICAgICBuYXRpdmVOb3cgPSBEYXRlLm5vdztcclxuXHJcbiAgLyoqXHJcbiAgICogR2V0cyB0aGUgbnVtYmVyIG9mIG1pbGxpc2Vjb25kcyB0aGF0IGhhdmUgZWxhcHNlZCBzaW5jZSB0aGUgVW5peCBlcG9jaFxyXG4gICAqICgxIEphbnVhcnkgMTk3MCAwMDowMDowMCBVVEMpLlxyXG4gICAqXHJcbiAgICogQHN0YXRpY1xyXG4gICAqIEBtZW1iZXJPZiBfXHJcbiAgICogQGNhdGVnb3J5IERhdGVcclxuICAgKiBAZXhhbXBsZVxyXG4gICAqXHJcbiAgICogXy5kZWZlcihmdW5jdGlvbihzdGFtcCkge1xyXG4gICAqICAgY29uc29sZS5sb2coXy5ub3coKSAtIHN0YW1wKTtcclxuICAgKiB9LCBfLm5vdygpKTtcclxuICAgKiAvLyA9PiBsb2dzIHRoZSBudW1iZXIgb2YgbWlsbGlzZWNvbmRzIGl0IHRvb2sgZm9yIHRoZSBkZWZlcnJlZCBmdW5jdGlvbiB0byBiZSBpbnZva2VkXHJcbiAgICovXHJcbiAgdmFyIG5vdyA9IG5hdGl2ZU5vdyB8fCBmdW5jdGlvbiAoKSB7XHJcbiAgICByZXR1cm4gbmV3IERhdGUoKS5nZXRUaW1lKCk7XHJcbiAgfTtcclxuXHJcbiAgLyoqXHJcbiAgICogQ3JlYXRlcyBhIGRlYm91bmNlZCBmdW5jdGlvbiB0aGF0IGRlbGF5cyBpbnZva2luZyBgZnVuY2AgdW50aWwgYWZ0ZXIgYHdhaXRgXHJcbiAgICogbWlsbGlzZWNvbmRzIGhhdmUgZWxhcHNlZCBzaW5jZSB0aGUgbGFzdCB0aW1lIHRoZSBkZWJvdW5jZWQgZnVuY3Rpb24gd2FzXHJcbiAgICogaW52b2tlZC4gVGhlIGRlYm91bmNlZCBmdW5jdGlvbiBjb21lcyB3aXRoIGEgYGNhbmNlbGAgbWV0aG9kIHRvIGNhbmNlbFxyXG4gICAqIGRlbGF5ZWQgaW52b2NhdGlvbnMuIFByb3ZpZGUgYW4gb3B0aW9ucyBvYmplY3QgdG8gaW5kaWNhdGUgdGhhdCBgZnVuY2BcclxuICAgKiBzaG91bGQgYmUgaW52b2tlZCBvbiB0aGUgbGVhZGluZyBhbmQvb3IgdHJhaWxpbmcgZWRnZSBvZiB0aGUgYHdhaXRgIHRpbWVvdXQuXHJcbiAgICogU3Vic2VxdWVudCBjYWxscyB0byB0aGUgZGVib3VuY2VkIGZ1bmN0aW9uIHJldHVybiB0aGUgcmVzdWx0IG9mIHRoZSBsYXN0XHJcbiAgICogYGZ1bmNgIGludm9jYXRpb24uXHJcbiAgICpcclxuICAgKiAqKk5vdGU6KiogSWYgYGxlYWRpbmdgIGFuZCBgdHJhaWxpbmdgIG9wdGlvbnMgYXJlIGB0cnVlYCwgYGZ1bmNgIGlzIGludm9rZWRcclxuICAgKiBvbiB0aGUgdHJhaWxpbmcgZWRnZSBvZiB0aGUgdGltZW91dCBvbmx5IGlmIHRoZSB0aGUgZGVib3VuY2VkIGZ1bmN0aW9uIGlzXHJcbiAgICogaW52b2tlZCBtb3JlIHRoYW4gb25jZSBkdXJpbmcgdGhlIGB3YWl0YCB0aW1lb3V0LlxyXG4gICAqXHJcbiAgICogU2VlIFtEYXZpZCBDb3JiYWNobydzIGFydGljbGVdKGh0dHA6Ly9kcnVwYWxtb3Rpb24uY29tL2FydGljbGUvZGVib3VuY2UtYW5kLXRocm90dGxlLXZpc3VhbC1leHBsYW5hdGlvbilcclxuICAgKiBmb3IgZGV0YWlscyBvdmVyIHRoZSBkaWZmZXJlbmNlcyBiZXR3ZWVuIGBfLmRlYm91bmNlYCBhbmQgYF8udGhyb3R0bGVgLlxyXG4gICAqXHJcbiAgICogQHN0YXRpY1xyXG4gICAqIEBtZW1iZXJPZiBfXHJcbiAgICogQGNhdGVnb3J5IEZ1bmN0aW9uXHJcbiAgICogQHBhcmFtIHtGdW5jdGlvbn0gZnVuYyBUaGUgZnVuY3Rpb24gdG8gZGVib3VuY2UuXHJcbiAgICogQHBhcmFtIHtudW1iZXJ9IFt3YWl0PTBdIFRoZSBudW1iZXIgb2YgbWlsbGlzZWNvbmRzIHRvIGRlbGF5LlxyXG4gICAqIEBwYXJhbSB7T2JqZWN0fSBbb3B0aW9uc10gVGhlIG9wdGlvbnMgb2JqZWN0LlxyXG4gICAqIEBwYXJhbSB7Ym9vbGVhbn0gW29wdGlvbnMubGVhZGluZz1mYWxzZV0gU3BlY2lmeSBpbnZva2luZyBvbiB0aGUgbGVhZGluZ1xyXG4gICAqICBlZGdlIG9mIHRoZSB0aW1lb3V0LlxyXG4gICAqIEBwYXJhbSB7bnVtYmVyfSBbb3B0aW9ucy5tYXhXYWl0XSBUaGUgbWF4aW11bSB0aW1lIGBmdW5jYCBpcyBhbGxvd2VkIHRvIGJlXHJcbiAgICogIGRlbGF5ZWQgYmVmb3JlIGl0J3MgaW52b2tlZC5cclxuICAgKiBAcGFyYW0ge2Jvb2xlYW59IFtvcHRpb25zLnRyYWlsaW5nPXRydWVdIFNwZWNpZnkgaW52b2tpbmcgb24gdGhlIHRyYWlsaW5nXHJcbiAgICogIGVkZ2Ugb2YgdGhlIHRpbWVvdXQuXHJcbiAgICogQHJldHVybnMge0Z1bmN0aW9ufSBSZXR1cm5zIHRoZSBuZXcgZGVib3VuY2VkIGZ1bmN0aW9uLlxyXG4gICAqIEBleGFtcGxlXHJcbiAgICpcclxuICAgKiAvLyBhdm9pZCBjb3N0bHkgY2FsY3VsYXRpb25zIHdoaWxlIHRoZSB3aW5kb3cgc2l6ZSBpcyBpbiBmbHV4XHJcbiAgICogalF1ZXJ5KHdpbmRvdykub24oJ3Jlc2l6ZScsIF8uZGVib3VuY2UoY2FsY3VsYXRlTGF5b3V0LCAxNTApKTtcclxuICAgKlxyXG4gICAqIC8vIGludm9rZSBgc2VuZE1haWxgIHdoZW4gdGhlIGNsaWNrIGV2ZW50IGlzIGZpcmVkLCBkZWJvdW5jaW5nIHN1YnNlcXVlbnQgY2FsbHNcclxuICAgKiBqUXVlcnkoJyNwb3N0Ym94Jykub24oJ2NsaWNrJywgXy5kZWJvdW5jZShzZW5kTWFpbCwgMzAwLCB7XHJcbiAgICogICAnbGVhZGluZyc6IHRydWUsXHJcbiAgICogICAndHJhaWxpbmcnOiBmYWxzZVxyXG4gICAqIH0pKTtcclxuICAgKlxyXG4gICAqIC8vIGVuc3VyZSBgYmF0Y2hMb2dgIGlzIGludm9rZWQgb25jZSBhZnRlciAxIHNlY29uZCBvZiBkZWJvdW5jZWQgY2FsbHNcclxuICAgKiB2YXIgc291cmNlID0gbmV3IEV2ZW50U291cmNlKCcvc3RyZWFtJyk7XHJcbiAgICogalF1ZXJ5KHNvdXJjZSkub24oJ21lc3NhZ2UnLCBfLmRlYm91bmNlKGJhdGNoTG9nLCAyNTAsIHtcclxuICAgKiAgICdtYXhXYWl0JzogMTAwMFxyXG4gICAqIH0pKTtcclxuICAgKlxyXG4gICAqIC8vIGNhbmNlbCBhIGRlYm91bmNlZCBjYWxsXHJcbiAgICogdmFyIHRvZG9DaGFuZ2VzID0gXy5kZWJvdW5jZShiYXRjaExvZywgMTAwMCk7XHJcbiAgICogT2JqZWN0Lm9ic2VydmUobW9kZWxzLnRvZG8sIHRvZG9DaGFuZ2VzKTtcclxuICAgKlxyXG4gICAqIE9iamVjdC5vYnNlcnZlKG1vZGVscywgZnVuY3Rpb24oY2hhbmdlcykge1xyXG4gICAqICAgaWYgKF8uZmluZChjaGFuZ2VzLCB7ICd1c2VyJzogJ3RvZG8nLCAndHlwZSc6ICdkZWxldGUnfSkpIHtcclxuICAgKiAgICAgdG9kb0NoYW5nZXMuY2FuY2VsKCk7XHJcbiAgICogICB9XHJcbiAgICogfSwgWydkZWxldGUnXSk7XHJcbiAgICpcclxuICAgKiAvLyAuLi5hdCBzb21lIHBvaW50IGBtb2RlbHMudG9kb2AgaXMgY2hhbmdlZFxyXG4gICAqIG1vZGVscy50b2RvLmNvbXBsZXRlZCA9IHRydWU7XHJcbiAgICpcclxuICAgKiAvLyAuLi5iZWZvcmUgMSBzZWNvbmQgaGFzIHBhc3NlZCBgbW9kZWxzLnRvZG9gIGlzIGRlbGV0ZWRcclxuICAgKiAvLyB3aGljaCBjYW5jZWxzIHRoZSBkZWJvdW5jZWQgYHRvZG9DaGFuZ2VzYCBjYWxsXHJcbiAgICogZGVsZXRlIG1vZGVscy50b2RvO1xyXG4gICAqL1xyXG4gIGZ1bmN0aW9uIGRlYm91bmNlKGZ1bmMsIHdhaXQsIG9wdGlvbnMpIHtcclxuICAgIHZhciBhcmdzLFxyXG4gICAgICAgICAgICBtYXhUaW1lb3V0SWQsXHJcbiAgICAgICAgICAgIHJlc3VsdCxcclxuICAgICAgICAgICAgc3RhbXAsXHJcbiAgICAgICAgICAgIHRoaXNBcmcsXHJcbiAgICAgICAgICAgIHRpbWVvdXRJZCxcclxuICAgICAgICAgICAgdHJhaWxpbmdDYWxsLFxyXG4gICAgICAgICAgICBsYXN0Q2FsbGVkID0gMCxcclxuICAgICAgICAgICAgbWF4V2FpdCA9IGZhbHNlLFxyXG4gICAgICAgICAgICB0cmFpbGluZyA9IHRydWU7XHJcblxyXG4gICAgaWYgKHR5cGVvZiBmdW5jICE9ICdmdW5jdGlvbicpIHtcclxuICAgICAgdGhyb3cgbmV3IFR5cGVFcnJvcihGVU5DX0VSUk9SX1RFWFQpO1xyXG4gICAgfVxyXG4gICAgd2FpdCA9IHdhaXQgPCAwID8gMCA6ICgrd2FpdCB8fCAwKTtcclxuICAgIGlmIChvcHRpb25zID09PSB0cnVlKSB7XHJcbiAgICAgIHZhciBsZWFkaW5nID0gdHJ1ZTtcclxuICAgICAgdHJhaWxpbmcgPSBmYWxzZTtcclxuICAgIH0gZWxzZSBpZiAoaXNPYmplY3Qob3B0aW9ucykpIHtcclxuICAgICAgbGVhZGluZyA9ICEhb3B0aW9ucy5sZWFkaW5nO1xyXG4gICAgICBtYXhXYWl0ID0gJ21heFdhaXQnIGluIG9wdGlvbnMgJiYgbmF0aXZlTWF4KCtvcHRpb25zLm1heFdhaXQgfHwgMCwgd2FpdCk7XHJcbiAgICAgIHRyYWlsaW5nID0gJ3RyYWlsaW5nJyBpbiBvcHRpb25zID8gISFvcHRpb25zLnRyYWlsaW5nIDogdHJhaWxpbmc7XHJcbiAgICB9XHJcblxyXG4gICAgZnVuY3Rpb24gY2FuY2VsKCkge1xyXG4gICAgICBpZiAodGltZW91dElkKSB7XHJcbiAgICAgICAgY2xlYXJUaW1lb3V0KHRpbWVvdXRJZCk7XHJcbiAgICAgIH1cclxuICAgICAgaWYgKG1heFRpbWVvdXRJZCkge1xyXG4gICAgICAgIGNsZWFyVGltZW91dChtYXhUaW1lb3V0SWQpO1xyXG4gICAgICB9XHJcbiAgICAgIGxhc3RDYWxsZWQgPSAwO1xyXG4gICAgICBtYXhUaW1lb3V0SWQgPSB0aW1lb3V0SWQgPSB0cmFpbGluZ0NhbGwgPSB1bmRlZmluZWQ7XHJcbiAgICB9XHJcblxyXG4gICAgZnVuY3Rpb24gY29tcGxldGUoaXNDYWxsZWQsIGlkKSB7XHJcbiAgICAgIGlmIChpZCkge1xyXG4gICAgICAgIGNsZWFyVGltZW91dChpZCk7XHJcbiAgICAgIH1cclxuICAgICAgbWF4VGltZW91dElkID0gdGltZW91dElkID0gdHJhaWxpbmdDYWxsID0gdW5kZWZpbmVkO1xyXG4gICAgICBpZiAoaXNDYWxsZWQpIHtcclxuICAgICAgICBsYXN0Q2FsbGVkID0gbm93KCk7XHJcbiAgICAgICAgcmVzdWx0ID0gZnVuYy5hcHBseSh0aGlzQXJnLCBhcmdzKTtcclxuICAgICAgICBpZiAoIXRpbWVvdXRJZCAmJiAhbWF4VGltZW91dElkKSB7XHJcbiAgICAgICAgICBhcmdzID0gdGhpc0FyZyA9IHVuZGVmaW5lZDtcclxuICAgICAgICB9XHJcbiAgICAgIH1cclxuICAgIH1cclxuXHJcbiAgICBmdW5jdGlvbiBkZWxheWVkKCkge1xyXG4gICAgICB2YXIgcmVtYWluaW5nID0gd2FpdCAtIChub3coKSAtIHN0YW1wKTtcclxuICAgICAgaWYgKHJlbWFpbmluZyA8PSAwIHx8IHJlbWFpbmluZyA+IHdhaXQpIHtcclxuICAgICAgICBjb21wbGV0ZSh0cmFpbGluZ0NhbGwsIG1heFRpbWVvdXRJZCk7XHJcbiAgICAgIH0gZWxzZSB7XHJcbiAgICAgICAgdGltZW91dElkID0gc2V0VGltZW91dChkZWxheWVkLCByZW1haW5pbmcpO1xyXG4gICAgICB9XHJcbiAgICB9XHJcblxyXG4gICAgZnVuY3Rpb24gbWF4RGVsYXllZCgpIHtcclxuICAgICAgY29tcGxldGUodHJhaWxpbmcsIHRpbWVvdXRJZCk7XHJcbiAgICB9XHJcblxyXG4gICAgZnVuY3Rpb24gZGVib3VuY2VkKCkge1xyXG4gICAgICBhcmdzID0gYXJndW1lbnRzO1xyXG4gICAgICBzdGFtcCA9IG5vdygpO1xyXG4gICAgICB0aGlzQXJnID0gdGhpcztcclxuICAgICAgdHJhaWxpbmdDYWxsID0gdHJhaWxpbmcgJiYgKHRpbWVvdXRJZCB8fCAhbGVhZGluZyk7XHJcblxyXG4gICAgICBpZiAobWF4V2FpdCA9PT0gZmFsc2UpIHtcclxuICAgICAgICB2YXIgbGVhZGluZ0NhbGwgPSBsZWFkaW5nICYmICF0aW1lb3V0SWQ7XHJcbiAgICAgIH0gZWxzZSB7XHJcbiAgICAgICAgaWYgKCFtYXhUaW1lb3V0SWQgJiYgIWxlYWRpbmcpIHtcclxuICAgICAgICAgIGxhc3RDYWxsZWQgPSBzdGFtcDtcclxuICAgICAgICB9XHJcbiAgICAgICAgdmFyIHJlbWFpbmluZyA9IG1heFdhaXQgLSAoc3RhbXAgLSBsYXN0Q2FsbGVkKSxcclxuICAgICAgICAgICAgICAgIGlzQ2FsbGVkID0gcmVtYWluaW5nIDw9IDAgfHwgcmVtYWluaW5nID4gbWF4V2FpdDtcclxuXHJcbiAgICAgICAgaWYgKGlzQ2FsbGVkKSB7XHJcbiAgICAgICAgICBpZiAobWF4VGltZW91dElkKSB7XHJcbiAgICAgICAgICAgIG1heFRpbWVvdXRJZCA9IGNsZWFyVGltZW91dChtYXhUaW1lb3V0SWQpO1xyXG4gICAgICAgICAgfVxyXG4gICAgICAgICAgbGFzdENhbGxlZCA9IHN0YW1wO1xyXG4gICAgICAgICAgcmVzdWx0ID0gZnVuYy5hcHBseSh0aGlzQXJnLCBhcmdzKTtcclxuICAgICAgICB9XHJcbiAgICAgICAgZWxzZSBpZiAoIW1heFRpbWVvdXRJZCkge1xyXG4gICAgICAgICAgbWF4VGltZW91dElkID0gc2V0VGltZW91dChtYXhEZWxheWVkLCByZW1haW5pbmcpO1xyXG4gICAgICAgIH1cclxuICAgICAgfVxyXG4gICAgICBpZiAoaXNDYWxsZWQgJiYgdGltZW91dElkKSB7XHJcbiAgICAgICAgdGltZW91dElkID0gY2xlYXJUaW1lb3V0KHRpbWVvdXRJZCk7XHJcbiAgICAgIH1cclxuICAgICAgZWxzZSBpZiAoIXRpbWVvdXRJZCAmJiB3YWl0ICE9PSBtYXhXYWl0KSB7XHJcbiAgICAgICAgdGltZW91dElkID0gc2V0VGltZW91dChkZWxheWVkLCB3YWl0KTtcclxuICAgICAgfVxyXG4gICAgICBpZiAobGVhZGluZ0NhbGwpIHtcclxuICAgICAgICBpc0NhbGxlZCA9IHRydWU7XHJcbiAgICAgICAgcmVzdWx0ID0gZnVuYy5hcHBseSh0aGlzQXJnLCBhcmdzKTtcclxuICAgICAgfVxyXG4gICAgICBpZiAoaXNDYWxsZWQgJiYgIXRpbWVvdXRJZCAmJiAhbWF4VGltZW91dElkKSB7XHJcbiAgICAgICAgYXJncyA9IHRoaXNBcmcgPSB1bmRlZmluZWQ7XHJcbiAgICAgIH1cclxuICAgICAgcmV0dXJuIHJlc3VsdDtcclxuICAgIH1cclxuXHJcbiAgICBkZWJvdW5jZWQuY2FuY2VsID0gY2FuY2VsO1xyXG4gICAgcmV0dXJuIGRlYm91bmNlZDtcclxuICB9XHJcblxyXG4gIC8qKlxyXG4gICAqIENoZWNrcyBpZiBgdmFsdWVgIGlzIHRoZSBbbGFuZ3VhZ2UgdHlwZV0oaHR0cHM6Ly9lczUuZ2l0aHViLmlvLyN4OCkgb2YgYE9iamVjdGAuXHJcbiAgICogKGUuZy4gYXJyYXlzLCBmdW5jdGlvbnMsIG9iamVjdHMsIHJlZ2V4ZXMsIGBuZXcgTnVtYmVyKDApYCwgYW5kIGBuZXcgU3RyaW5nKCcnKWApXHJcbiAgICpcclxuICAgKiBAc3RhdGljXHJcbiAgICogQG1lbWJlck9mIF9cclxuICAgKiBAY2F0ZWdvcnkgTGFuZ1xyXG4gICAqIEBwYXJhbSB7Kn0gdmFsdWUgVGhlIHZhbHVlIHRvIGNoZWNrLlxyXG4gICAqIEByZXR1cm5zIHtib29sZWFufSBSZXR1cm5zIGB0cnVlYCBpZiBgdmFsdWVgIGlzIGFuIG9iamVjdCwgZWxzZSBgZmFsc2VgLlxyXG4gICAqIEBleGFtcGxlXHJcbiAgICpcclxuICAgKiBfLmlzT2JqZWN0KHt9KTtcclxuICAgKiAvLyA9PiB0cnVlXHJcbiAgICpcclxuICAgKiBfLmlzT2JqZWN0KFsxLCAyLCAzXSk7XHJcbiAgICogLy8gPT4gdHJ1ZVxyXG4gICAqXHJcbiAgICogXy5pc09iamVjdCgxKTtcclxuICAgKiAvLyA9PiBmYWxzZVxyXG4gICAqL1xyXG4gIGZ1bmN0aW9uIGlzT2JqZWN0KHZhbHVlKSB7XHJcbiAgICAvLyBBdm9pZCBhIFY4IEpJVCBidWcgaW4gQ2hyb21lIDE5LTIwLlxyXG4gICAgLy8gU2VlIGh0dHBzOi8vY29kZS5nb29nbGUuY29tL3AvdjgvaXNzdWVzL2RldGFpbD9pZD0yMjkxIGZvciBtb3JlIGRldGFpbHMuXHJcbiAgICB2YXIgdHlwZSA9IHR5cGVvZiB2YWx1ZTtcclxuICAgIHJldHVybiAhIXZhbHVlICYmICh0eXBlID09ICdvYmplY3QnIHx8IHR5cGUgPT0gJ2Z1bmN0aW9uJyk7XHJcbiAgfVxyXG5cclxuICByZXR1cm4gZGVib3VuY2U7XHJcblxyXG59KSgpO1xyXG5cclxubW9kdWxlLmV4cG9ydHMgPSBkZWJvdW5jZTsiLCI7KGZ1bmN0aW9uKCl7ICd1c2Ugc3RyaWN0JztcclxuICBcclxuICB2YXIgYW5jaG9yUG9pbnRVdGlsaXRpZXMgPSByZXF1aXJlKCcuL0FuY2hvclBvaW50VXRpbGl0aWVzJyk7XHJcbiAgdmFyIGRlYm91bmNlID0gcmVxdWlyZShcIi4vZGVib3VuY2VcIik7XHJcbiAgXHJcbiAgLy8gcmVnaXN0ZXJzIHRoZSBleHRlbnNpb24gb24gYSBjeXRvc2NhcGUgbGliIHJlZlxyXG4gIHZhciByZWdpc3RlciA9IGZ1bmN0aW9uKCBjeXRvc2NhcGUsICQsIEtvbnZhKXtcclxuICAgIHZhciB1aVV0aWxpdGllcyA9IHJlcXVpcmUoJy4vVUlVdGlsaXRpZXMnKTtcclxuICAgIFxyXG4gICAgaWYoICFjeXRvc2NhcGUgfHwgISQgfHwgIUtvbnZhKXsgcmV0dXJuOyB9IC8vIGNhbid0IHJlZ2lzdGVyIGlmIHJlcXVpcmVkIGxpYnJhcmllcyB1bnNwZWNpZmllZFxyXG5cclxuICAgIHZhciBkZWZhdWx0cyA9IHtcclxuICAgICAgLy8gdGhpcyBmdW5jdGlvbiBzcGVjaWZpZXMgdGhlIHBvaXRpb25zIG9mIGJlbmQgcG9pbnRzXHJcbiAgICAgIC8vIHN0cmljdGx5IG5hbWUgdGhlIHByb3BlcnR5ICdiZW5kUG9pbnRQb3NpdGlvbnMnIGZvciB0aGUgZWRnZSB0byBiZSBkZXRlY3RlZCBmb3IgYmVuZCBwb2ludCBlZGl0aXRuZ1xyXG4gICAgICBiZW5kUG9zaXRpb25zRnVuY3Rpb246IGZ1bmN0aW9uKGVsZSkge1xyXG4gICAgICAgIHJldHVybiBlbGUuZGF0YSgnYmVuZFBvaW50UG9zaXRpb25zJyk7XHJcbiAgICAgIH0sXHJcbiAgICAgIC8vIHRoaXMgZnVuY3Rpb24gc3BlY2lmaWVzIHRoZSBwb2l0aW9ucyBvZiBiZW5kIHBvaW50c1xyXG4gICAgICAvLyBzdHJpY3RseSBuYW1lIHRoZSBwcm9wZXJ0eSAnY29udHJvbFBvaW50UG9zaXRpb25zJyBmb3IgdGhlIGVkZ2UgdG8gYmUgZGV0ZWN0ZWQgZm9yIGNvbnRyb2wgcG9pbnQgZWRpdGl0bmdcclxuICAgICAgY29udHJvbFBvc2l0aW9uc0Z1bmN0aW9uOiBmdW5jdGlvbihlbGUpIHtcclxuICAgICAgICByZXR1cm4gZWxlLmRhdGEoJ2NvbnRyb2xQb2ludFBvc2l0aW9ucycpO1xyXG4gICAgICB9LFxyXG4gICAgICAvLyB3aGV0aGVyIHRvIGluaXRpbGl6ZSBiZW5kIGFuZCBjb250cm9sIHBvaW50cyBvbiBjcmVhdGlvbiBvZiB0aGlzIGV4dGVuc2lvbiBhdXRvbWF0aWNhbGx5XHJcbiAgICAgIC8vIFNQTElUIEZVTkNUSU9OQUxJVFk/XHJcbiAgICAgIGluaXRBbmNob3JzQXV0b21hdGljYWxseTogdHJ1ZSxcclxuICAgICAgLy8gdGhlIGNsYXNzZXMgb2YgdGhvc2UgZWRnZXMgdGhhdCBzaG91bGQgYmUgaWdub3JlZFxyXG4gICAgICBpZ25vcmVkQ2xhc3NlczogW10sXHJcbiAgICAgIC8vIHdoZXRoZXIgdGhlIGJlbmQgYW5kIGNvbnRyb2wgZWRpdGluZyBvcGVyYXRpb25zIGFyZSB1bmRvYWJsZSAocmVxdWlyZXMgY3l0b3NjYXBlLXVuZG8tcmVkby5qcylcclxuICAgICAgdW5kb2FibGU6IGZhbHNlLFxyXG4gICAgICAvLyB0aGUgc2l6ZSBvZiBiZW5kIGFuZCBjb250cm9sIHBvaW50IHNoYXBlIGlzIG9idGFpbmVkIGJ5IG11bHRpcGxpbmcgd2lkdGggb2YgZWRnZSB3aXRoIHRoaXMgcGFyYW1ldGVyXHJcbiAgICAgIC8vIFNQTElUIEZVTkNUSU9OQUxJVFk/XHJcbiAgICAgIGFuY2hvclNoYXBlU2l6ZUZhY3RvcjogMyxcclxuICAgICAgLy8gei1pbmRleCB2YWx1ZSBvZiB0aGUgY2FudmFzIGluIHdoaWNoIGJlbmQgYW5kIGNvbnRyb2wgcG9pbnRzIGFyZSBkcmF3blxyXG4gICAgICB6SW5kZXg6IDk5OSwgICAgICBcclxuICAgICAgLy8gd2hldGhlciB0byBzdGFydCB0aGUgcGx1Z2luIGluIHRoZSBlbmFibGVkIHN0YXRlXHJcbiAgICAgIGVuYWJsZWQ6IHRydWUsXHJcbiAgICAgIC8vQW4gb3B0aW9uIHRoYXQgY29udHJvbHMgdGhlIGRpc3RhbmNlIHdpdGhpbiB3aGljaCBhIGJlbmQgcG9pbnQgaXMgY29uc2lkZXJlZCBcIm5lYXJcIiB0aGUgbGluZSBzZWdtZW50IGJldHdlZW4gaXRzIHR3byBuZWlnaGJvcnMgYW5kIHdpbGwgYmUgYXV0b21hdGljYWxseSByZW1vdmVkXHJcbiAgICAgIGJlbmRSZW1vdmFsU2Vuc2l0aXZpdHkgOiA4LFxyXG4gICAgICAvLyB0aXRsZSBvZiBhZGQgYmVuZCBwb2ludCBtZW51IGl0ZW0gKFVzZXIgbWF5IG5lZWQgdG8gYWRqdXN0IHdpZHRoIG9mIG1lbnUgaXRlbXMgYWNjb3JkaW5nIHRvIGxlbmd0aCBvZiB0aGlzIG9wdGlvbilcclxuICAgICAgYWRkQmVuZE1lbnVJdGVtVGl0bGU6IFwiQWRkIEJlbmQgUG9pbnRcIixcclxuICAgICAgLy8gdGl0bGUgb2YgcmVtb3ZlIGJlbmQgcG9pbnQgbWVudSBpdGVtIChVc2VyIG1heSBuZWVkIHRvIGFkanVzdCB3aWR0aCBvZiBtZW51IGl0ZW1zIGFjY29yZGluZyB0byBsZW5ndGggb2YgdGhpcyBvcHRpb24pXHJcbiAgICAgIHJlbW92ZUJlbmRNZW51SXRlbVRpdGxlOiBcIlJlbW92ZSBCZW5kIFBvaW50XCIsXHJcbiAgICAgIC8vIHRpdGxlIG9mIGFkZCBjb250cm9sIHBvaW50IG1lbnUgaXRlbSAoVXNlciBtYXkgbmVlZCB0byBhZGp1c3Qgd2lkdGggb2YgbWVudSBpdGVtcyBhY2NvcmRpbmcgdG8gbGVuZ3RoIG9mIHRoaXMgb3B0aW9uKVxyXG4gICAgICBhZGRDb250cm9sTWVudUl0ZW1UaXRsZTogXCJBZGQgQ29udHJvbCBQb2ludFwiLFxyXG4gICAgICAvLyB0aXRsZSBvZiByZW1vdmUgY29udHJvbCBwb2ludCBtZW51IGl0ZW0gKFVzZXIgbWF5IG5lZWQgdG8gYWRqdXN0IHdpZHRoIG9mIG1lbnUgaXRlbXMgYWNjb3JkaW5nIHRvIGxlbmd0aCBvZiB0aGlzIG9wdGlvbilcclxuICAgICAgcmVtb3ZlQ29udHJvbE1lbnVJdGVtVGl0bGU6IFwiUmVtb3ZlIENvbnRyb2wgUG9pbnRcIixcclxuICAgICAgLy8gd2hldGhlciB0aGUgYmVuZCBwb2ludCBjYW4gYmUgbW92ZWQgYnkgYXJyb3dzXHJcbiAgICAgIC8vIFNQTElUIEZVTkNUSU9OQUxJVFk/XHJcbiAgICAgIG1vdmVTZWxlY3RlZEFuY2hvcnNPbktleUV2ZW50czogZnVuY3Rpb24gKCkge1xyXG4gICAgICAgICAgcmV0dXJuIHRydWU7XHJcbiAgICAgIH1cclxuICAgIH07XHJcbiAgICBcclxuICAgIHZhciBvcHRpb25zO1xyXG4gICAgdmFyIGluaXRpYWxpemVkID0gZmFsc2U7XHJcbiAgICBcclxuICAgIC8vIE1lcmdlIGRlZmF1bHQgb3B0aW9ucyB3aXRoIHRoZSBvbmVzIGNvbWluZyBmcm9tIHBhcmFtZXRlclxyXG4gICAgZnVuY3Rpb24gZXh0ZW5kKGRlZmF1bHRzLCBvcHRpb25zKSB7XHJcbiAgICAgIHZhciBvYmogPSB7fTtcclxuXHJcbiAgICAgIGZvciAodmFyIGkgaW4gZGVmYXVsdHMpIHtcclxuICAgICAgICBvYmpbaV0gPSBkZWZhdWx0c1tpXTtcclxuICAgICAgfVxyXG5cclxuICAgICAgZm9yICh2YXIgaSBpbiBvcHRpb25zKSB7XHJcbiAgICAgICAgLy8gU1BMSVQgRlVOQ1RJT05BTElUWT9cclxuICAgICAgICBpZihpID09IFwiYmVuZFJlbW92YWxTZW5zaXRpdml0eVwiKXtcclxuICAgICAgICAgIHZhciB2YWx1ZSA9IG9wdGlvbnNbaV07XHJcbiAgICAgICAgICAgaWYoIWlzTmFOKHZhbHVlKSlcclxuICAgICAgICAgICB7XHJcbiAgICAgICAgICAgICAgaWYodmFsdWUgPj0gMCAmJiB2YWx1ZSA8PSAyMCl7XHJcbiAgICAgICAgICAgICAgICBvYmpbaV0gPSBvcHRpb25zW2ldO1xyXG4gICAgICAgICAgICAgIH1lbHNlIGlmKHZhbHVlIDwgMCl7XHJcbiAgICAgICAgICAgICAgICBvYmpbaV0gPSAwXHJcbiAgICAgICAgICAgICAgfWVsc2V7XHJcbiAgICAgICAgICAgICAgICBvYmpbaV0gPSAyMFxyXG4gICAgICAgICAgICAgIH1cclxuICAgICAgICAgICB9XHJcbiAgICAgICAgfWVsc2V7XHJcbiAgICAgICAgICBvYmpbaV0gPSBvcHRpb25zW2ldO1xyXG4gICAgICAgIH1cclxuXHJcbiAgICAgIH1cclxuXHJcbiAgICAgIHJldHVybiBvYmo7XHJcbiAgICB9O1xyXG4gICAgXHJcbiAgICBjeXRvc2NhcGUoICdjb3JlJywgJ2VkZ2VFZGl0aW5nJywgZnVuY3Rpb24ob3B0cyl7XHJcbiAgICAgIHZhciBjeSA9IHRoaXM7XHJcbiAgICAgIFxyXG4gICAgICBpZiggb3B0cyA9PT0gJ2luaXRpYWxpemVkJyApIHtcclxuICAgICAgICByZXR1cm4gaW5pdGlhbGl6ZWQ7XHJcbiAgICAgIH1cclxuICAgICAgXHJcbiAgICAgIGlmKCBvcHRzICE9PSAnZ2V0JyApIHtcclxuICAgICAgICAvLyBtZXJnZSB0aGUgb3B0aW9ucyB3aXRoIGRlZmF1bHQgb25lc1xyXG4gICAgICAgIG9wdGlvbnMgPSBleHRlbmQoZGVmYXVsdHMsIG9wdHMpO1xyXG4gICAgICAgIGluaXRpYWxpemVkID0gdHJ1ZTtcclxuXHJcbiAgICAgICAgLy8gZGVmaW5lIGVkZ2ViZW5kZWRpdGluZy1oYXNiZW5kcG9pbnRzIGNzcyBjbGFzc1xyXG4gICAgICAgIGN5LnN0eWxlKCkuc2VsZWN0b3IoJy5lZGdlYmVuZGVkaXRpbmctaGFzYmVuZHBvaW50cycpLmNzcyh7XHJcbiAgICAgICAgICAnY3VydmUtc3R5bGUnOiAnc2VnbWVudHMnLFxyXG4gICAgICAgICAgJ3NlZ21lbnQtZGlzdGFuY2VzJzogZnVuY3Rpb24gKGVsZSkge1xyXG4gICAgICAgICAgICByZXR1cm4gYW5jaG9yUG9pbnRVdGlsaXRpZXMuZ2V0RGlzdGFuY2VzU3RyaW5nKGVsZSwgJ2JlbmQnKTtcclxuICAgICAgICAgIH0sXHJcbiAgICAgICAgICAnc2VnbWVudC13ZWlnaHRzJzogZnVuY3Rpb24gKGVsZSkge1xyXG4gICAgICAgICAgICByZXR1cm4gYW5jaG9yUG9pbnRVdGlsaXRpZXMuZ2V0V2VpZ2h0c1N0cmluZyhlbGUsICdiZW5kJyk7XHJcbiAgICAgICAgICB9LFxyXG4gICAgICAgICAgJ2VkZ2UtZGlzdGFuY2VzJzogJ25vZGUtcG9zaXRpb24nXHJcbiAgICAgICAgfSk7XHJcblxyXG4gICAgICAgIC8vIGRlZmluZSBlZGdlY29udHJvbGVkaXRpbmctaGFzY29udHJvbHBvaW50cyBjc3MgY2xhc3NcclxuICAgICAgICBjeS5zdHlsZSgpLnNlbGVjdG9yKCcuZWRnZWNvbnRyb2xlZGl0aW5nLWhhc2NvbnRyb2xwb2ludHMnKS5jc3Moe1xyXG4gICAgICAgICAgJ2N1cnZlLXN0eWxlJzogJ3VuYnVuZGxlZC1iZXppZXInLFxyXG4gICAgICAgICAgJ2NvbnRyb2wtcG9pbnQtZGlzdGFuY2VzJzogZnVuY3Rpb24gKGVsZSkge1xyXG4gICAgICAgICAgICByZXR1cm4gYW5jaG9yUG9pbnRVdGlsaXRpZXMuZ2V0RGlzdGFuY2VzU3RyaW5nKGVsZSwgJ2NvbnRyb2wnKTtcclxuICAgICAgICAgIH0sXHJcbiAgICAgICAgICAnY29udHJvbC1wb2ludC13ZWlnaHRzJzogZnVuY3Rpb24gKGVsZSkge1xyXG4gICAgICAgICAgICByZXR1cm4gYW5jaG9yUG9pbnRVdGlsaXRpZXMuZ2V0V2VpZ2h0c1N0cmluZyhlbGUsICdjb250cm9sJyk7XHJcbiAgICAgICAgICB9LFxyXG4gICAgICAgICAgJ2VkZ2UtZGlzdGFuY2VzJzogJ25vZGUtcG9zaXRpb24nXHJcbiAgICAgICAgfSk7XHJcblxyXG4gICAgICAgIGFuY2hvclBvaW50VXRpbGl0aWVzLnNldElnbm9yZWRDbGFzc2VzKG9wdGlvbnMuaWdub3JlZENsYXNzZXMpO1xyXG5cclxuICAgICAgICAvLyBpbml0IGJlbmQgcG9zaXRpb25zIGNvbmRpdGlvbmFsbHlcclxuICAgICAgICBpZiAob3B0aW9ucy5pbml0QW5jaG9yc0F1dG9tYXRpY2FsbHkpIHtcclxuICAgICAgICAgIC8vIENIRUNLIFRISVMsIG9wdGlvbnMuaWdub3JlZENsYXNzZXMgVU5VU0VEXHJcbiAgICAgICAgICBhbmNob3JQb2ludFV0aWxpdGllcy5pbml0QW5jaG9yUG9pbnRzKG9wdGlvbnMuYmVuZFBvc2l0aW9uc0Z1bmN0aW9uLCBvcHRpb25zLmNvbnRyb2xQb3NpdGlvbnNGdW5jdGlvbiwgY3kuZWRnZXMoKSwgb3B0aW9ucy5pZ25vcmVkQ2xhc3Nlcyk7XHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICBpZihvcHRpb25zLmVuYWJsZWQpXHJcbiAgICAgICAgICB1aVV0aWxpdGllcyhvcHRpb25zLCBjeSk7XHJcbiAgICAgICAgZWxzZVxyXG4gICAgICAgICAgdWlVdGlsaXRpZXMoXCJ1bmJpbmRcIiwgY3kpO1xyXG4gICAgICB9XHJcbiAgICAgIFxyXG4gICAgICB2YXIgaW5zdGFuY2UgPSBpbml0aWFsaXplZCA/IHtcclxuICAgICAgICAvKlxyXG4gICAgICAgICogZ2V0IGJlbmQgb3IgY29udHJvbCBwb2ludHMgb2YgdGhlIGdpdmVuIGVkZ2UgaW4gYW4gYXJyYXkgQSxcclxuICAgICAgICAqIEFbMiAqIGldIGlzIHRoZSB4IGNvb3JkaW5hdGUgYW5kIEFbMiAqIGkgKyAxXSBpcyB0aGUgeSBjb29yZGluYXRlXHJcbiAgICAgICAgKiBvZiB0aGUgaXRoIGJlbmQgcG9pbnQuIChSZXR1cm5zIHVuZGVmaW5lZCBpZiB0aGUgY3VydmUgc3R5bGUgaXMgbm90IHNlZ21lbnRzKVxyXG4gICAgICAgICovXHJcbiAgICAgICAgZ2V0QW5jaG9yc0FzQXJyYXk6IGZ1bmN0aW9uKGVsZSkge1xyXG4gICAgICAgICAgcmV0dXJuIGFuY2hvclBvaW50VXRpbGl0aWVzLmdldEFuY2hvcnNBc0FycmF5KGVsZSk7XHJcbiAgICAgICAgfSxcclxuICAgICAgICAvLyBJbml0aWxpemUgcG9pbnRzIGZvciB0aGUgZ2l2ZW4gZWRnZXMgdXNpbmcgJ29wdGlvbnMuYmVuZFBvc2l0aW9uc0Z1bmN0aW9uJ1xyXG4gICAgICAgIGluaXRBbmNob3JQb2ludHM6IGZ1bmN0aW9uKGVsZXMpIHtcclxuICAgICAgICAgIGFuY2hvclBvaW50VXRpbGl0aWVzLmluaXRBbmNob3JQb2ludHMob3B0aW9ucy5iZW5kUG9zaXRpb25zRnVuY3Rpb24sIG9wdGlvbnMuY29udHJvbFBvc2l0aW9uc0Z1bmN0aW9uLCBlbGVzKTtcclxuICAgICAgICB9LFxyXG4gICAgICAgIGRlbGV0ZVNlbGVjdGVkQW5jaG9yOiBmdW5jdGlvbihlbGUsIGluZGV4KSB7XHJcbiAgICAgICAgICBhbmNob3JQb2ludFV0aWxpdGllcy5yZW1vdmVBbmNob3IoZWxlLCBpbmRleCk7XHJcbiAgICAgICAgfVxyXG4gICAgICB9IDogdW5kZWZpbmVkO1xyXG5cclxuICAgICAgcmV0dXJuIGluc3RhbmNlOyAvLyBjaGFpbmFiaWxpdHlcclxuICAgIH0gKTtcclxuXHJcbiAgfTtcclxuXHJcbiAgaWYoIHR5cGVvZiBtb2R1bGUgIT09ICd1bmRlZmluZWQnICYmIG1vZHVsZS5leHBvcnRzICl7IC8vIGV4cG9zZSBhcyBhIGNvbW1vbmpzIG1vZHVsZVxyXG4gICAgbW9kdWxlLmV4cG9ydHMgPSByZWdpc3RlcjtcclxuICB9XHJcblxyXG4gIGlmKCB0eXBlb2YgZGVmaW5lICE9PSAndW5kZWZpbmVkJyAmJiBkZWZpbmUuYW1kICl7IC8vIGV4cG9zZSBhcyBhbiBhbWQvcmVxdWlyZWpzIG1vZHVsZVxyXG4gICAgZGVmaW5lKCdjeXRvc2NhcGUtZWRnZS1lZGl0aW5nJywgZnVuY3Rpb24oKXtcclxuICAgICAgcmV0dXJuIHJlZ2lzdGVyO1xyXG4gICAgfSk7XHJcbiAgfVxyXG5cclxuICBpZiggdHlwZW9mIGN5dG9zY2FwZSAhPT0gJ3VuZGVmaW5lZCcgJiYgJCAmJiBLb252YSl7IC8vIGV4cG9zZSB0byBnbG9iYWwgY3l0b3NjYXBlIChpLmUuIHdpbmRvdy5jeXRvc2NhcGUpXHJcbiAgICByZWdpc3RlciggY3l0b3NjYXBlLCAkLCBLb252YSApO1xyXG4gIH1cclxuXHJcbn0pKCk7XHJcbiIsInZhciByZWNvbm5lY3Rpb25VdGlsaXRpZXMgPSB7XHJcblxyXG4gICAgLy8gY3JlYXRlcyBhbmQgcmV0dXJucyBhIGR1bW15IG5vZGUgd2hpY2ggaXMgY29ubmVjdGVkIHRvIHRoZSBkaXNjb25uZWN0ZWQgZWRnZVxyXG4gICAgZGlzY29ubmVjdEVkZ2U6IGZ1bmN0aW9uIChlZGdlLCBjeSwgcG9zaXRpb24sIGRpc2Nvbm5lY3RlZEVuZCkge1xyXG4gICAgICAgIFxyXG4gICAgICAgIHZhciBkdW1teU5vZGUgPSB7XHJcbiAgICAgICAgICAgIGRhdGE6IHsgXHJcbiAgICAgICAgICAgICAgaWQ6ICdud3RfcmVjb25uZWN0RWRnZV9kdW1teScsXHJcbiAgICAgICAgICAgICAgcG9ydHM6IFtdLFxyXG4gICAgICAgICAgICB9LFxyXG4gICAgICAgICAgICBzdHlsZToge1xyXG4gICAgICAgICAgICAgIHdpZHRoOiAxLFxyXG4gICAgICAgICAgICAgIGhlaWdodDogMSxcclxuICAgICAgICAgICAgICAndmlzaWJpbGl0eSc6ICdoaWRkZW4nXHJcbiAgICAgICAgICAgIH0sXHJcbiAgICAgICAgICAgIHJlbmRlcmVkUG9zaXRpb246IHBvc2l0aW9uXHJcbiAgICAgICAgfTtcclxuICAgICAgICBjeS5hZGQoZHVtbXlOb2RlKTtcclxuXHJcbiAgICAgICAgdmFyIGxvYyA9IChkaXNjb25uZWN0ZWRFbmQgPT09ICdzb3VyY2UnKSA/IFxyXG4gICAgICAgICAgICB7c291cmNlOiBkdW1teU5vZGUuZGF0YS5pZH0gOiBcclxuICAgICAgICAgICAge3RhcmdldDogZHVtbXlOb2RlLmRhdGEuaWR9O1xyXG5cclxuICAgICAgICBlZGdlID0gZWRnZS5tb3ZlKGxvYylbMF07XHJcblxyXG4gICAgICAgIHJldHVybiB7XHJcbiAgICAgICAgICAgIGR1bW15Tm9kZTogY3kubm9kZXMoXCIjXCIgKyBkdW1teU5vZGUuZGF0YS5pZClbMF0sXHJcbiAgICAgICAgICAgIGVkZ2U6IGVkZ2VcclxuICAgICAgICB9O1xyXG4gICAgfSxcclxuXHJcbiAgICBjb25uZWN0RWRnZTogZnVuY3Rpb24gKGVkZ2UsIG5vZGUsIGxvY2F0aW9uKSB7XHJcbiAgICAgICAgaWYoIWVkZ2UuaXNFZGdlKCkgfHwgIW5vZGUuaXNOb2RlKCkpXHJcbiAgICAgICAgICAgIHJldHVybjtcclxuXHJcbiAgICAgICAgdmFyIGxvYyA9IHt9O1xyXG4gICAgICAgIGlmKGxvY2F0aW9uID09PSAnc291cmNlJylcclxuICAgICAgICAgICAgbG9jLnNvdXJjZSA9IG5vZGUuaWQoKTtcclxuICAgICAgICBcclxuICAgICAgICBlbHNlIGlmKGxvY2F0aW9uID09PSAndGFyZ2V0JylcclxuICAgICAgICAgICAgbG9jLnRhcmdldCA9IG5vZGUuaWQoKTtcclxuICAgICAgICBcclxuICAgICAgICBlbHNlXHJcbiAgICAgICAgICAgIHJldHVybjtcclxuXHJcbiAgICAgICAgcmV0dXJuIGVkZ2UubW92ZShsb2MpWzBdO1xyXG4gICAgfSxcclxuXHJcbiAgICBjb3B5RWRnZTogZnVuY3Rpb24gKG9sZEVkZ2UsIG5ld0VkZ2UpIHtcclxuICAgICAgICB0aGlzLmNvcHlBbmNob3JzKG9sZEVkZ2UsIG5ld0VkZ2UpO1xyXG4gICAgICAgIHRoaXMuY29weVN0eWxlKG9sZEVkZ2UsIG5ld0VkZ2UpO1xyXG4gICAgfSxcclxuXHJcbiAgICBjb3B5U3R5bGU6IGZ1bmN0aW9uIChvbGRFZGdlLCBuZXdFZGdlKSB7XHJcbiAgICAgICAgaWYob2xkRWRnZSAmJiBuZXdFZGdlKXtcclxuICAgICAgICAgICAgbmV3RWRnZS5kYXRhKCdsaW5lLWNvbG9yJywgb2xkRWRnZS5kYXRhKCdsaW5lLWNvbG9yJykpO1xyXG4gICAgICAgICAgICBuZXdFZGdlLmRhdGEoJ3dpZHRoJywgb2xkRWRnZS5kYXRhKCd3aWR0aCcpKTtcclxuICAgICAgICAgICAgbmV3RWRnZS5kYXRhKCdjYXJkaW5hbGl0eScsIG9sZEVkZ2UuZGF0YSgnY2FyZGluYWxpdHknKSk7XHJcbiAgICAgICAgfVxyXG4gICAgfSxcclxuXHJcbiAgICBjb3B5QW5jaG9yczogZnVuY3Rpb24gKG9sZEVkZ2UsIG5ld0VkZ2UpIHtcclxuICAgICAgICBpZihvbGRFZGdlLmhhc0NsYXNzKCdlZGdlYmVuZGVkaXRpbmctaGFzYmVuZHBvaW50cycpKXtcclxuICAgICAgICAgICAgdmFyIGJwRGlzdGFuY2VzID0gb2xkRWRnZS5kYXRhKCdjeWVkZ2ViZW5kZWRpdGluZ0Rpc3RhbmNlcycpO1xyXG4gICAgICAgICAgICB2YXIgYnBXZWlnaHRzID0gb2xkRWRnZS5kYXRhKCdjeWVkZ2ViZW5kZWRpdGluZ1dlaWdodHMnKTtcclxuICAgICAgICAgICAgXHJcbiAgICAgICAgICAgIG5ld0VkZ2UuZGF0YSgnY3llZGdlYmVuZGVkaXRpbmdEaXN0YW5jZXMnLCBicERpc3RhbmNlcyk7XHJcbiAgICAgICAgICAgIG5ld0VkZ2UuZGF0YSgnY3llZGdlYmVuZGVkaXRpbmdXZWlnaHRzJywgYnBXZWlnaHRzKTtcclxuICAgICAgICAgICAgbmV3RWRnZS5hZGRDbGFzcygnZWRnZWJlbmRlZGl0aW5nLWhhc2JlbmRwb2ludHMnKTtcclxuICAgICAgICB9XHJcbiAgICAgICAgZWxzZSBpZihvbGRFZGdlLmhhc0NsYXNzKCdlZGdlY29udHJvbGVkaXRpbmctaGFzY29udHJvbHBvaW50cycpKXtcclxuICAgICAgICAgICAgdmFyIGJwRGlzdGFuY2VzID0gb2xkRWRnZS5kYXRhKCdjeWVkZ2Vjb250cm9sZWRpdGluZ0Rpc3RhbmNlcycpO1xyXG4gICAgICAgICAgICB2YXIgYnBXZWlnaHRzID0gb2xkRWRnZS5kYXRhKCdjeWVkZ2Vjb250cm9sZWRpdGluZ1dlaWdodHMnKTtcclxuICAgICAgICAgICAgXHJcbiAgICAgICAgICAgIG5ld0VkZ2UuZGF0YSgnY3llZGdlY29udHJvbGVkaXRpbmdEaXN0YW5jZXMnLCBicERpc3RhbmNlcyk7XHJcbiAgICAgICAgICAgIG5ld0VkZ2UuZGF0YSgnY3llZGdlY29udHJvbGVkaXRpbmdXZWlnaHRzJywgYnBXZWlnaHRzKTtcclxuICAgICAgICAgICAgbmV3RWRnZS5hZGRDbGFzcygnZWRnZWNvbnRyb2xlZGl0aW5nLWhhc2NvbnRyb2xwb2ludHMnKTtcclxuICAgICAgICB9XHJcbiAgICB9LFxyXG59O1xyXG4gIFxyXG5tb2R1bGUuZXhwb3J0cyA9IHJlY29ubmVjdGlvblV0aWxpdGllcztcclxuICAiLCJtb2R1bGUuZXhwb3J0cyA9IGZ1bmN0aW9uIChjeSwgYW5jaG9yUG9pbnRVdGlsaXRpZXMsIHBhcmFtcykge1xyXG4gIGlmIChjeS51bmRvUmVkbyA9PSBudWxsKVxyXG4gICAgcmV0dXJuO1xyXG5cclxuICB2YXIgdXIgPSBjeS51bmRvUmVkbyh7XHJcbiAgICBkZWZhdWx0QWN0aW9uczogZmFsc2UsXHJcbiAgICBpc0RlYnVnOiB0cnVlXHJcbiAgfSk7XHJcblxyXG4gIGZ1bmN0aW9uIGNoYW5nZUFuY2hvclBvaW50cyhwYXJhbSkge1xyXG4gICAgdmFyIGVkZ2UgPSBjeS5nZXRFbGVtZW50QnlJZChwYXJhbS5lZGdlLmlkKCkpO1xyXG4gICAgdmFyIHR5cGUgPSBhbmNob3JQb2ludFV0aWxpdGllcy5nZXRFZGdlVHlwZShlZGdlKTtcclxuXHJcbiAgICBpZih0eXBlID09PSAnaW5jb25jbHVzaXZlJyl7XHJcbiAgICAgIHR5cGUgPSAnYmVuZCc7XHJcbiAgICB9XHJcblxyXG4gICAgdmFyIHdlaWdodFN0ciA9IGFuY2hvclBvaW50VXRpbGl0aWVzLnN5bnRheFt0eXBlXVsnd2VpZ2h0J107XHJcbiAgICB2YXIgZGlzdGFuY2VTdHIgPSBhbmNob3JQb2ludFV0aWxpdGllcy5zeW50YXhbdHlwZV1bJ2Rpc3RhbmNlJ107XHJcbiAgICB2YXIgcmVzdWx0ID0ge1xyXG4gICAgICBlZGdlOiBlZGdlLFxyXG4gICAgICB3ZWlnaHRzOiBwYXJhbS5zZXQgPyBlZGdlLmRhdGEod2VpZ2h0U3RyKSA6IHBhcmFtLndlaWdodHMsXHJcbiAgICAgIGRpc3RhbmNlczogcGFyYW0uc2V0ID8gZWRnZS5kYXRhKGRpc3RhbmNlU3RyKSA6IHBhcmFtLmRpc3RhbmNlcyxcclxuICAgICAgc2V0OiB0cnVlLy9BcyB0aGUgcmVzdWx0IHdpbGwgbm90IGJlIHVzZWQgZm9yIHRoZSBmaXJzdCBmdW5jdGlvbiBjYWxsIHBhcmFtcyBzaG91bGQgYmUgdXNlZCB0byBzZXQgdGhlIGRhdGFcclxuICAgIH07XHJcblxyXG4gICAgdmFyIGhhc0FuY2hvclBvaW50ID0gcGFyYW0ud2VpZ2h0cyAmJiBwYXJhbS53ZWlnaHRzLmxlbmd0aCA+IDA7XHJcblxyXG4gICAgLy9DaGVjayBpZiB3ZSBuZWVkIHRvIHNldCB0aGUgd2VpZ2h0cyBhbmQgZGlzdGFuY2VzIGJ5IHRoZSBwYXJhbSB2YWx1ZXNcclxuICAgIGlmIChwYXJhbS5zZXQpIHtcclxuICAgICAgaGFzQW5jaG9yUG9pbnQgPyBlZGdlLmRhdGEod2VpZ2h0U3RyLCBwYXJhbS53ZWlnaHRzKSA6IGVkZ2UucmVtb3ZlRGF0YSh3ZWlnaHRTdHIpO1xyXG4gICAgICBoYXNBbmNob3JQb2ludCA/IGVkZ2UuZGF0YShkaXN0YW5jZVN0ciwgcGFyYW0uZGlzdGFuY2VzKSA6IGVkZ2UucmVtb3ZlRGF0YShkaXN0YW5jZVN0cik7XHJcblxyXG4gICAgICAvL3JlZnJlc2ggdGhlIGN1cnZlIHN0eWxlIGFzIHRoZSBudW1iZXIgb2YgYW5jaG9yIHBvaW50IHdvdWxkIGJlIGNoYW5nZWQgYnkgdGhlIHByZXZpb3VzIG9wZXJhdGlvblxyXG4gICAgICBpZiAoaGFzQW5jaG9yUG9pbnQpIHtcclxuICAgICAgICBlZGdlLmFkZENsYXNzKGFuY2hvclBvaW50VXRpbGl0aWVzLnN5bnRheFt0eXBlXVsnY2xhc3MnXSk7XHJcbiAgICAgICAgZWRnZS5yZW1vdmVDbGFzcyhhbmNob3JQb2ludFV0aWxpdGllcy5zeW50YXhbdHlwZV1bJ3dhcyddKTtcclxuICAgICAgfVxyXG4gICAgICBlbHNlIHtcclxuICAgICAgICBlZGdlLnJlbW92ZUNsYXNzKGFuY2hvclBvaW50VXRpbGl0aWVzLnN5bnRheFt0eXBlXVsnY2xhc3MnXSk7XHJcbiAgICAgICAgZWRnZS5hZGRDbGFzcyhhbmNob3JQb2ludFV0aWxpdGllcy5zeW50YXhbdHlwZV1bJ3dhcyddKTtcclxuICAgICAgfVxyXG4gICAgfVxyXG4gICAgXHJcbiAgICBlZGdlLnRyaWdnZXIoJ2N5ZWRnZWVkaXRpbmcuY2hhbmdlQW5jaG9yUG9pbnRzJyk7XHJcblxyXG4gICAgcmV0dXJuIHJlc3VsdDtcclxuICB9XHJcblxyXG4gIGZ1bmN0aW9uIG1vdmVEbyhhcmcpIHtcclxuICAgICAgaWYgKGFyZy5maXJzdFRpbWUpIHtcclxuICAgICAgICAgIGRlbGV0ZSBhcmcuZmlyc3RUaW1lO1xyXG4gICAgICAgICAgcmV0dXJuIGFyZztcclxuICAgICAgfVxyXG5cclxuICAgICAgdmFyIGVkZ2VzID0gYXJnLmVkZ2VzO1xyXG4gICAgICB2YXIgcG9zaXRpb25EaWZmID0gYXJnLnBvc2l0aW9uRGlmZjtcclxuICAgICAgdmFyIHJlc3VsdCA9IHtcclxuICAgICAgICAgIGVkZ2VzOiBlZGdlcyxcclxuICAgICAgICAgIHBvc2l0aW9uRGlmZjoge1xyXG4gICAgICAgICAgICAgIHg6IC1wb3NpdGlvbkRpZmYueCxcclxuICAgICAgICAgICAgICB5OiAtcG9zaXRpb25EaWZmLnlcclxuICAgICAgICAgIH1cclxuICAgICAgfTtcclxuICAgICAgbW92ZUFuY2hvcnNVbmRvYWJsZShwb3NpdGlvbkRpZmYsIGVkZ2VzKTtcclxuXHJcbiAgICAgIHJldHVybiByZXN1bHQ7XHJcbiAgfVxyXG5cclxuICBmdW5jdGlvbiBtb3ZlQW5jaG9yc1VuZG9hYmxlKHBvc2l0aW9uRGlmZiwgZWRnZXMpIHtcclxuICAgICAgZWRnZXMuZm9yRWFjaChmdW5jdGlvbiggZWRnZSApe1xyXG4gICAgICAgICAgZWRnZSA9IGN5LmdldEVsZW1lbnRCeUlkKHBhcmFtLmVkZ2UuaWQoKSk7XHJcbiAgICAgICAgICB2YXIgcHJldmlvdXNBbmNob3JzUG9zaXRpb24gPSBhbmNob3JQb2ludFV0aWxpdGllcy5nZXRBbmNob3JzQXNBcnJheShlZGdlKTtcclxuICAgICAgICAgIHZhciBuZXh0QW5jaG9yc1Bvc2l0aW9uID0gW107XHJcbiAgICAgICAgICBpZiAocHJldmlvdXNBbmNob3JzUG9zaXRpb24gIT0gdW5kZWZpbmVkKVxyXG4gICAgICAgICAge1xyXG4gICAgICAgICAgICAgIGZvciAoaT0wOyBpPHByZXZpb3VzQW5jaG9yc1Bvc2l0aW9uLmxlbmd0aDsgaSs9MilcclxuICAgICAgICAgICAgICB7XHJcbiAgICAgICAgICAgICAgICAgIG5leHRBbmNob3JzUG9zaXRpb24ucHVzaCh7eDogcHJldmlvdXNBbmNob3JzUG9zaXRpb25baV0rcG9zaXRpb25EaWZmLngsIHk6IHByZXZpb3VzQW5jaG9yc1Bvc2l0aW9uW2krMV0rcG9zaXRpb25EaWZmLnl9KTtcclxuICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgZWRnZS5kYXRhKGFuY2hvclBvaW50VXRpbGl0aWVzLnN5bnRheFt0eXBlXVsncG9pbnRQb3MnXSxuZXh0QW5jaG9yc1Bvc2l0aW9uKTtcclxuICAgICAgICAgIH1cclxuICAgICAgfSk7XHJcblxyXG4gICAgICBhbmNob3JQb2ludFV0aWxpdGllcy5pbml0QW5jaG9yUG9pbnRzKHBhcmFtcy5iZW5kUG9zaXRpb25zRnVuY3Rpb24sIHBhcmFtcy5jb250cm9sUG9zaXRpb25zRnVuY3Rpb24sIGVkZ2VzKTtcclxuICB9XHJcblxyXG4gIGZ1bmN0aW9uIHJlY29ubmVjdEVkZ2UocGFyYW0pe1xyXG4gICAgdmFyIGVkZ2UgICAgICA9IHBhcmFtLmVkZ2U7XHJcbiAgICB2YXIgbG9jYXRpb24gID0gcGFyYW0ubG9jYXRpb247XHJcbiAgICB2YXIgb2xkTG9jICAgID0gcGFyYW0ub2xkTG9jO1xyXG5cclxuICAgIGVkZ2UgPSBlZGdlLm1vdmUobG9jYXRpb24pWzBdO1xyXG5cclxuICAgIHZhciByZXN1bHQgPSB7XHJcbiAgICAgIGVkZ2U6ICAgICBlZGdlLFxyXG4gICAgICBsb2NhdGlvbjogb2xkTG9jLFxyXG4gICAgICBvbGRMb2M6ICAgbG9jYXRpb25cclxuICAgIH1cclxuICAgIGVkZ2UudW5zZWxlY3QoKTtcclxuICAgIHJldHVybiByZXN1bHQ7XHJcbiAgfVxyXG5cclxuICBmdW5jdGlvbiByZW1vdmVSZWNvbm5lY3RlZEVkZ2UocGFyYW0pe1xyXG4gICAgdmFyIG9sZEVkZ2UgPSBwYXJhbS5vbGRFZGdlO1xyXG4gICAgdmFyIHRtcCA9IGN5LmdldEVsZW1lbnRCeUlkKG9sZEVkZ2UuZGF0YSgnaWQnKSk7XHJcbiAgICBpZih0bXAgJiYgdG1wLmxlbmd0aCA+IDApXHJcbiAgICAgIG9sZEVkZ2UgPSB0bXA7XHJcblxyXG4gICAgdmFyIG5ld0VkZ2UgPSBwYXJhbS5uZXdFZGdlO1xyXG4gICAgdmFyIHRtcCA9IGN5LmdldEVsZW1lbnRCeUlkKG5ld0VkZ2UuZGF0YSgnaWQnKSk7XHJcbiAgICBpZih0bXAgJiYgdG1wLmxlbmd0aCA+IDApXHJcbiAgICAgIG5ld0VkZ2UgPSB0bXA7XHJcblxyXG4gICAgaWYob2xkRWRnZS5pbnNpZGUoKSl7XHJcbiAgICAgIG9sZEVkZ2UgPSBvbGRFZGdlLnJlbW92ZSgpWzBdO1xyXG4gICAgfSBcclxuICAgICAgXHJcbiAgICBpZihuZXdFZGdlLnJlbW92ZWQoKSl7XHJcbiAgICAgIG5ld0VkZ2UgPSBuZXdFZGdlLnJlc3RvcmUoKTtcclxuICAgICAgbmV3RWRnZS51bnNlbGVjdCgpO1xyXG4gICAgfVxyXG4gICAgXHJcbiAgICByZXR1cm4ge1xyXG4gICAgICBvbGRFZGdlOiBuZXdFZGdlLFxyXG4gICAgICBuZXdFZGdlOiBvbGRFZGdlXHJcbiAgICB9O1xyXG4gIH1cclxuXHJcbiAgdXIuYWN0aW9uKCdjaGFuZ2VBbmNob3JQb2ludHMnLCBjaGFuZ2VBbmNob3JQb2ludHMsIGNoYW5nZUFuY2hvclBvaW50cyk7XHJcbiAgdXIuYWN0aW9uKCdtb3ZlQW5jaG9yUG9pbnRzJywgbW92ZURvLCBtb3ZlRG8pO1xyXG4gIHVyLmFjdGlvbigncmVjb25uZWN0RWRnZScsIHJlY29ubmVjdEVkZ2UsIHJlY29ubmVjdEVkZ2UpO1xyXG4gIHVyLmFjdGlvbigncmVtb3ZlUmVjb25uZWN0ZWRFZGdlJywgcmVtb3ZlUmVjb25uZWN0ZWRFZGdlLCByZW1vdmVSZWNvbm5lY3RlZEVkZ2UpO1xyXG59O1xyXG4iXX0=
  