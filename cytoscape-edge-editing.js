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
      multiClass: "edgebendediting-hasmultiplebendpoints",
      weight: "cyedgebendeditingWeights",
      distance: "cyedgebendeditingDistances",
      weightCss: "segment-weights",
      distanceCss: "segment-distances",
      pointPos: "bendPointPositions",
    },
    control: {
      edge: "unbundled-bezier",
      class: "edgecontrolediting-hascontrolpoints",
      multiClass: "edgecontrolediting-hasmultiplecontrolpoints",
      weight: "cyedgecontroleditingWeights",
      distance: "cyedgecontroleditingDistances",
      weightCss: "control-point-weights",
      distanceCss: "control-point-distances",
      pointPos: "controlPointPositions",
    }
  },
  // gets edge type as 'bend' or 'control'
  // the interchanging if-s are necessary to set the priority of the tags
  // example: an edge with type segment and a class 'hascontrolpoints' will be classified as unbundled bezier
  getEdgeType: function(edge){
    if(!edge)
      return 'inconclusive';
    else if(edge.hasClass(this.syntax['bend']['class']))
      return 'bend';
    else if(edge.hasClass(this.syntax['control']['class']))
      return 'control';
    else if(edge.css('curve-style') === this.syntax['bend']['edge'])
      return 'bend';
    else if(edge.css('curve-style') === this.syntax['control']['edge'])
      return 'control';
    else if(edge.data(this.syntax['bend']['pointPos']))
      return 'bend';
    else if(edge.data(this.syntax['control']['pointPos']))
      return 'control';
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
          if (result.distances.length > 1) {
            edge.addClass(this.syntax[type]['multiClass']);
          }
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

    var weights = edge.pstyle( this.syntax[type]['weightCss'] ) ? 
                  edge.pstyle( this.syntax[type]['weightCss'] ).pfValue : [];
    var distances = edge.pstyle( this.syntax[type]['distanceCss'] ) ? 
                  edge.pstyle( this.syntax[type]['distanceCss'] ).pfValue : [];
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
  addAnchorPoint: function(edge, newAnchorPoint, type = undefined) {
    if(edge === undefined || newAnchorPoint === undefined){
      edge = this.currentCtxEdge;
      newAnchorPoint = this.currentCtxPos;
    }
  
    if(type === undefined)
      type = this.getEdgeType(edge);

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
    if (weights.length > 1 || distances.length > 1) {
      edge.addClass(this.syntax[type]['multiClass']);
    }
    
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
    
    // only one anchor point left on edge
    if (distances.length == 1 || weights.length == 1) {
      edge.removeClass(this.syntax[type]['multiClass'])
    }
    // no more anchor points on edge
    else if(distances.length == 0 || weights.length == 0){
      edge.removeClass(this.syntax[type]['class']);
      edge.data(distanceStr, []);
      edge.data(weightStr, []);
    }
    else {
      edge.data(distanceStr, distances);
      edge.data(weightStr, weights);
    }
  },
  removeAllAnchors: function(edge) {
    if (edge === undefined) {
      edge = this.currentCtxEdge;
    }
    var type = this.getEdgeType(edge);
    
    if(this.edgeTypeInconclusiveShouldntHappen(type, "anchorPointUtilities.js, removeAllAnchors")){
      return;
    }

    // Remove classes from edge
    edge.removeClass(this.syntax[type]['class']);
    edge.removeClass(this.syntax[type]['multiClass']);

    // Remove all anchor point data from edge
    var distanceStr = this.syntax[type]['weight'];
    var weightStr = this.syntax[type]['distance'];
    edge.data(distanceStr, []);
    edge.data(weightStr, []);

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
  var removeAllBendPointCtxMenuId = 'cy-edge-bend-editing-cxt-remove-multiple-bend-point';
  var addControlPointCxtMenuId = 'cy-edge-control-editing-cxt-add-control-point';
  var removeControlPointCxtMenuId = 'cy-edge-control-editing-cxt-remove-control-point';
  var removeAllControlPointCtxMenuId = 'cy-edge-bend-editing-cxt-remove-multiple-control-point';
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

      /*
        Make sure we don't append an element that already exists.
        This extension canvas uses the same html element as edge-editing.
        It makes sense since it also uses the same Konva stage.
        Without the below logic, an empty canvasElement would be created
        for one of these extensions for no reason.
      */
      var $container = $(this);
      var canvasElementId = 'cy-node-edge-editing-stage';
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
      if (Konva.stages.length < 1) {
        stage = new Konva.Stage({
          id: 'node-edge-editing-stage',
          container: canvasElementId,   // id of container <div>
          width: $container.width(),
          height: $container.height()
        });
      }
      else {
        stage = Konva.stages[0];
      }
      
      var canvas;
      if (stage.getChildren().length < 1) {
        canvas = new Konva.Layer();
        stage.add(canvas);
      }
      else {
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

      var cxtAddBendFcn = function(event){
        cxtAddAnchorFcn(event, 'bend');
      }

      var cxtAddControlFcn = function(event) {
        cxtAddAnchorFcn(event, 'control');
      }

      var cxtAddAnchorFcn = function (event, anchorType) {
        var edge = event.target || event.cyTarget;
        if(!anchorPointUtilities.isIgnoredEdge(edge)) {

          var type = anchorPointUtilities.getEdgeType(edge);
          var weights, distances, weightStr, distanceStr;

          if(type === 'inconclusive'){
            weights = [];
            distances = [];
          }
          else{
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

      var cxtRemoveAnchorFcn = function (event) {
        var edge = anchorManager.edge;
        var type = anchorPointUtilities.getEdgeType(edge);

        if(anchorPointUtilities.edgeTypeInconclusiveShouldntHappen(type, "UiUtilities.js, cxtRemoveAnchorFcn")){
          return;
        }

        var param = {
          edge: edge,
          type: type,
          weights: [].concat(edge.data(anchorPointUtilities.syntax[type]['weight'])),
          distances: [].concat(edge.data(anchorPointUtilities.syntax[type]['distance']))
        };

        anchorPointUtilities.removeAnchor();
        
        if(options().undoable) {
          cy.undoRedo().do('changeAnchorPoints', param);
        }
        
        setTimeout(function(){refreshDraws();edge.select();}, 50) ;

      };

      var cxtRemoveAllAnchorsFcn = function (event) {
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
        setTimeout(function(){refreshDraws();edge.select();}, 50);
      }
      
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
          onClickFunction: cxtAddBendFcn
        },
        {
          id: removeBendPointCxtMenuId,
          title: opts.removeBendMenuItemTitle,
          content: 'Remove Bend Point',
          selector: 'edge',
          onClickFunction: cxtRemoveAnchorFcn
        }, 
        {
          id: removeAllBendPointCtxMenuId,
          title: opts.removeAllBendMenuItemTitle,
          content: 'Remove All Bend Points',
          selector: opts.enableMultipleAnchorRemovalOption && '.edgebendediting-hasmultiplebendpoints',
          onClickFunction: cxtRemoveAllAnchorsFcn
        },
        {
          id: addControlPointCxtMenuId,
          title: opts.addControlMenuItemTitle,
          content: 'Add Control Point',
          selector: 'edge',
          coreAsWell: true,
          onClickFunction: cxtAddControlFcn
        },
        {
          id: removeControlPointCxtMenuId,
          title: opts.removeControlMenuItemTitle,
          content: 'Remove Control Point',
          selector: 'edge',
          coreAsWell: true,
          onClickFunction: cxtRemoveAnchorFcn
        }, 
        {
          id: removeAllControlPointCtxMenuId,
          title: opts.removeAllControlMenuItemTitle,
          content: 'Remove All Control Points',
          selector: opts.enableMultipleAnchorRemovalOption && '.edgecontrolediting-hasmultiplecontrolpoints',
          onClickFunction: cxtRemoveAllAnchorsFcn
        },
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
          if (edge !== undefined && moveAnchorParam !== undefined && 
            (edge.data(weightStr) ? edge.data(weightStr).toString() : null) != moveAnchorParam.weights.toString()) {
            
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
          var target = event.target || event.cyTarget;
          var targetIsEdge = false;

          try{
            targetIsEdge = target.isEdge();
          }
          catch(err){
            // this is here just to suppress the error
          }

          var edge, type;
          if(targetIsEdge){
            edge = target;
            type = anchorPointUtilities.getEdgeType(edge);
          }
          else{
            edge = anchorManager.edge;          
            type = anchorManager.edgeType;
          }

          var menus = cy.contextMenus('get'); // get context menus instance
          
          if(!edgeToHighlight || edgeToHighlight.id() != edge.id() || anchorPointUtilities.isIgnoredEdge(edge) ||
              edgeToHighlight !== edge) {
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
              menus.showMenuItem(addBendPointCxtMenuId);
              menus.showMenuItem(addControlPointCxtMenuId);
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
      // this function specifies the poitions of control points
      // strictly name the property 'controlPointPositions' for the edge to be detected for control point edititng
      controlPositionsFunction: function(ele) {
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
      bendRemovalSensitivity : 8,
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
      moveSelectedAnchorsOnKeyEvents: function () {
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
        * of the ith bend point. (Returns undefined if the curve style is not segments nor unbundled bezier)
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
        if (oldEdge.hasClass('edgebendediting-hasmultiplebendpoints')) {
            newEdge.addClass('edgebendediting-hasmultiplebendpoints');
        }
        else if (oldEdge.hasClass('edgecontrolediting-hasmultiplecontrolpoints')) {
            newEdge.addClass('edgecontrolediting-hasmultiplecontrolpoints');
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
    var type = param.type !== 'inconclusive' ? param.type : anchorPointUtilities.getEdgeType(edge);
    
    var weights, distances, weightStr, distanceStr;

    if(param.type === 'inconclusive' && !param.set){
      weights = [];
      distances = [];
    }
    else {
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

      //refresh the curve style as the number of anchor point would be changed by the previous operation
      if (hadMultipleAnchorPoints) {
          edge.addClass(anchorPointUtilities.syntax[type]['multiClass']);
      }
      else {
          edge.removeClass(anchorPointUtilities.syntax[type]['multiClass']);
      }

      if (hadAnchorPoint) {
          edge.addClass(anchorPointUtilities.syntax[type]['class']);
      }
      else {
          edge.removeClass(anchorPointUtilities.syntax[type]['class']);
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

//# sourceMappingURL=data:application/json;charset:utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIm5vZGVfbW9kdWxlcy9icm93c2VyLXBhY2svX3ByZWx1ZGUuanMiLCJzcmMvQW5jaG9yUG9pbnRVdGlsaXRpZXMuanMiLCJzcmMvVUlVdGlsaXRpZXMuanMiLCJzcmMvZGVib3VuY2UuanMiLCJzcmMvaW5kZXguanMiLCJzcmMvcmVjb25uZWN0aW9uVXRpbGl0aWVzLmpzIiwic3JjL3JlZ2lzdGVyVW5kb1JlZG9GdW5jdGlvbnMuanMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7QUNBQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDOWhCQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNyK0NBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQzdPQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ2xMQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ3hGQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQSIsImZpbGUiOiJnZW5lcmF0ZWQuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlc0NvbnRlbnQiOlsiKGZ1bmN0aW9uIGUodCxuLHIpe2Z1bmN0aW9uIHMobyx1KXtpZighbltvXSl7aWYoIXRbb10pe3ZhciBhPXR5cGVvZiByZXF1aXJlPT1cImZ1bmN0aW9uXCImJnJlcXVpcmU7aWYoIXUmJmEpcmV0dXJuIGEobywhMCk7aWYoaSlyZXR1cm4gaShvLCEwKTt2YXIgZj1uZXcgRXJyb3IoXCJDYW5ub3QgZmluZCBtb2R1bGUgJ1wiK28rXCInXCIpO3Rocm93IGYuY29kZT1cIk1PRFVMRV9OT1RfRk9VTkRcIixmfXZhciBsPW5bb109e2V4cG9ydHM6e319O3Rbb11bMF0uY2FsbChsLmV4cG9ydHMsZnVuY3Rpb24oZSl7dmFyIG49dFtvXVsxXVtlXTtyZXR1cm4gcyhuP246ZSl9LGwsbC5leHBvcnRzLGUsdCxuLHIpfXJldHVybiBuW29dLmV4cG9ydHN9dmFyIGk9dHlwZW9mIHJlcXVpcmU9PVwiZnVuY3Rpb25cIiYmcmVxdWlyZTtmb3IodmFyIG89MDtvPHIubGVuZ3RoO28rKylzKHJbb10pO3JldHVybiBzfSkiLCJ2YXIgYW5jaG9yUG9pbnRVdGlsaXRpZXMgPSB7XHJcbiAgY3VycmVudEN0eEVkZ2U6IHVuZGVmaW5lZCxcclxuICBjdXJyZW50Q3R4UG9zOiB1bmRlZmluZWQsXHJcbiAgY3VycmVudEFuY2hvckluZGV4OiB1bmRlZmluZWQsXHJcbiAgaWdub3JlZENsYXNzZXM6IHVuZGVmaW5lZCxcclxuICBzZXRJZ25vcmVkQ2xhc3NlczogZnVuY3Rpb24oX2lnbm9yZWRDbGFzc2VzKSB7XHJcbiAgICB0aGlzLmlnbm9yZWRDbGFzc2VzID0gX2lnbm9yZWRDbGFzc2VzO1xyXG4gIH0sXHJcbiAgc3ludGF4OiB7XHJcbiAgICBiZW5kOiB7XHJcbiAgICAgIGVkZ2U6IFwic2VnbWVudHNcIixcclxuICAgICAgY2xhc3M6IFwiZWRnZWJlbmRlZGl0aW5nLWhhc2JlbmRwb2ludHNcIixcclxuICAgICAgbXVsdGlDbGFzczogXCJlZGdlYmVuZGVkaXRpbmctaGFzbXVsdGlwbGViZW5kcG9pbnRzXCIsXHJcbiAgICAgIHdlaWdodDogXCJjeWVkZ2ViZW5kZWRpdGluZ1dlaWdodHNcIixcclxuICAgICAgZGlzdGFuY2U6IFwiY3llZGdlYmVuZGVkaXRpbmdEaXN0YW5jZXNcIixcclxuICAgICAgd2VpZ2h0Q3NzOiBcInNlZ21lbnQtd2VpZ2h0c1wiLFxyXG4gICAgICBkaXN0YW5jZUNzczogXCJzZWdtZW50LWRpc3RhbmNlc1wiLFxyXG4gICAgICBwb2ludFBvczogXCJiZW5kUG9pbnRQb3NpdGlvbnNcIixcclxuICAgIH0sXHJcbiAgICBjb250cm9sOiB7XHJcbiAgICAgIGVkZ2U6IFwidW5idW5kbGVkLWJlemllclwiLFxyXG4gICAgICBjbGFzczogXCJlZGdlY29udHJvbGVkaXRpbmctaGFzY29udHJvbHBvaW50c1wiLFxyXG4gICAgICBtdWx0aUNsYXNzOiBcImVkZ2Vjb250cm9sZWRpdGluZy1oYXNtdWx0aXBsZWNvbnRyb2xwb2ludHNcIixcclxuICAgICAgd2VpZ2h0OiBcImN5ZWRnZWNvbnRyb2xlZGl0aW5nV2VpZ2h0c1wiLFxyXG4gICAgICBkaXN0YW5jZTogXCJjeWVkZ2Vjb250cm9sZWRpdGluZ0Rpc3RhbmNlc1wiLFxyXG4gICAgICB3ZWlnaHRDc3M6IFwiY29udHJvbC1wb2ludC13ZWlnaHRzXCIsXHJcbiAgICAgIGRpc3RhbmNlQ3NzOiBcImNvbnRyb2wtcG9pbnQtZGlzdGFuY2VzXCIsXHJcbiAgICAgIHBvaW50UG9zOiBcImNvbnRyb2xQb2ludFBvc2l0aW9uc1wiLFxyXG4gICAgfVxyXG4gIH0sXHJcbiAgLy8gZ2V0cyBlZGdlIHR5cGUgYXMgJ2JlbmQnIG9yICdjb250cm9sJ1xyXG4gIC8vIHRoZSBpbnRlcmNoYW5naW5nIGlmLXMgYXJlIG5lY2Vzc2FyeSB0byBzZXQgdGhlIHByaW9yaXR5IG9mIHRoZSB0YWdzXHJcbiAgLy8gZXhhbXBsZTogYW4gZWRnZSB3aXRoIHR5cGUgc2VnbWVudCBhbmQgYSBjbGFzcyAnaGFzY29udHJvbHBvaW50cycgd2lsbCBiZSBjbGFzc2lmaWVkIGFzIHVuYnVuZGxlZCBiZXppZXJcclxuICBnZXRFZGdlVHlwZTogZnVuY3Rpb24oZWRnZSl7XHJcbiAgICBpZighZWRnZSlcclxuICAgICAgcmV0dXJuICdpbmNvbmNsdXNpdmUnO1xyXG4gICAgZWxzZSBpZihlZGdlLmhhc0NsYXNzKHRoaXMuc3ludGF4WydiZW5kJ11bJ2NsYXNzJ10pKVxyXG4gICAgICByZXR1cm4gJ2JlbmQnO1xyXG4gICAgZWxzZSBpZihlZGdlLmhhc0NsYXNzKHRoaXMuc3ludGF4Wydjb250cm9sJ11bJ2NsYXNzJ10pKVxyXG4gICAgICByZXR1cm4gJ2NvbnRyb2wnO1xyXG4gICAgZWxzZSBpZihlZGdlLmNzcygnY3VydmUtc3R5bGUnKSA9PT0gdGhpcy5zeW50YXhbJ2JlbmQnXVsnZWRnZSddKVxyXG4gICAgICByZXR1cm4gJ2JlbmQnO1xyXG4gICAgZWxzZSBpZihlZGdlLmNzcygnY3VydmUtc3R5bGUnKSA9PT0gdGhpcy5zeW50YXhbJ2NvbnRyb2wnXVsnZWRnZSddKVxyXG4gICAgICByZXR1cm4gJ2NvbnRyb2wnO1xyXG4gICAgZWxzZSBpZihlZGdlLmRhdGEodGhpcy5zeW50YXhbJ2JlbmQnXVsncG9pbnRQb3MnXSkpXHJcbiAgICAgIHJldHVybiAnYmVuZCc7XHJcbiAgICBlbHNlIGlmKGVkZ2UuZGF0YSh0aGlzLnN5bnRheFsnY29udHJvbCddWydwb2ludFBvcyddKSlcclxuICAgICAgcmV0dXJuICdjb250cm9sJztcclxuICAgIHJldHVybiAnaW5jb25jbHVzaXZlJztcclxuICB9LFxyXG4gIC8vIGluaXRpbGl6ZSBhbmNob3IgcG9pbnRzIGJhc2VkIG9uIGJlbmRQb3NpdGlvbnNGY24gYW5kIGNvbnRyb2xQb3NpdGlvbkZjblxyXG4gIGluaXRBbmNob3JQb2ludHM6IGZ1bmN0aW9uKGJlbmRQb3NpdGlvbnNGY24sIGNvbnRyb2xQb3NpdGlvbnNGY24sIGVkZ2VzKSB7XHJcbiAgICBmb3IgKHZhciBpID0gMDsgaSA8IGVkZ2VzLmxlbmd0aDsgaSsrKSB7XHJcbiAgICAgIHZhciBlZGdlID0gZWRnZXNbaV07XHJcbiAgICAgIHZhciB0eXBlID0gdGhpcy5nZXRFZGdlVHlwZShlZGdlKTtcclxuICAgICAgXHJcbiAgICAgIGlmICh0eXBlID09PSAnaW5jb25jbHVzaXZlJykgeyBcclxuICAgICAgICBjb250aW51ZTsgXHJcbiAgICAgIH1cclxuXHJcbiAgICAgIGlmKCF0aGlzLmlzSWdub3JlZEVkZ2UoZWRnZSkpIHtcclxuXHJcbiAgICAgICAgdmFyIGFuY2hvclBvc2l0aW9ucztcclxuXHJcbiAgICAgICAgLy8gZ2V0IHRoZSBhbmNob3IgcG9zaXRpb25zIGJ5IGFwcGx5aW5nIHRoZSBmdW5jdGlvbnMgZm9yIHRoaXMgZWRnZVxyXG4gICAgICAgIGlmKHR5cGUgPT09ICdiZW5kJylcclxuICAgICAgICAgIGFuY2hvclBvc2l0aW9ucyA9IGJlbmRQb3NpdGlvbnNGY24uYXBwbHkodGhpcywgZWRnZSk7XHJcbiAgICAgICAgZWxzZSBpZih0eXBlID09PSAnY29udHJvbCcpXHJcbiAgICAgICAgICBhbmNob3JQb3NpdGlvbnMgPSBjb250cm9sUG9zaXRpb25zRmNuLmFwcGx5KHRoaXMsIGVkZ2UpO1xyXG5cclxuICAgICAgICAvLyBjYWxjdWxhdGUgcmVsYXRpdmUgYW5jaG9yIHBvc2l0aW9uc1xyXG4gICAgICAgIHZhciByZXN1bHQgPSB0aGlzLmNvbnZlcnRUb1JlbGF0aXZlUG9zaXRpb25zKGVkZ2UsIGFuY2hvclBvc2l0aW9ucyk7XHJcblxyXG4gICAgICAgIC8vIGlmIHRoZXJlIGFyZSBhbmNob3JzIHNldCB3ZWlnaHRzIGFuZCBkaXN0YW5jZXMgYWNjb3JkaW5nbHkgYW5kIGFkZCBjbGFzcyB0byBlbmFibGUgc3R5bGUgY2hhbmdlc1xyXG4gICAgICAgIGlmIChyZXN1bHQuZGlzdGFuY2VzLmxlbmd0aCA+IDApIHtcclxuICAgICAgICAgIGVkZ2UuZGF0YSh0aGlzLnN5bnRheFt0eXBlXVsnd2VpZ2h0J10sIHJlc3VsdC53ZWlnaHRzKTtcclxuICAgICAgICAgIGVkZ2UuZGF0YSh0aGlzLnN5bnRheFt0eXBlXVsnZGlzdGFuY2UnXSwgcmVzdWx0LmRpc3RhbmNlcyk7XHJcbiAgICAgICAgICBlZGdlLmFkZENsYXNzKHRoaXMuc3ludGF4W3R5cGVdWydjbGFzcyddKTtcclxuICAgICAgICAgIGlmIChyZXN1bHQuZGlzdGFuY2VzLmxlbmd0aCA+IDEpIHtcclxuICAgICAgICAgICAgZWRnZS5hZGRDbGFzcyh0aGlzLnN5bnRheFt0eXBlXVsnbXVsdGlDbGFzcyddKTtcclxuICAgICAgICAgIH1cclxuICAgICAgICB9XHJcbiAgICAgIH1cclxuICAgIH1cclxuICB9LFxyXG5cclxuICBpc0lnbm9yZWRFZGdlOiBmdW5jdGlvbihlZGdlKSB7XHJcblxyXG4gICAgdmFyIHN0YXJ0WCA9IGVkZ2Uuc291cmNlKCkucG9zaXRpb24oJ3gnKTtcclxuICAgIHZhciBzdGFydFkgPSBlZGdlLnNvdXJjZSgpLnBvc2l0aW9uKCd5Jyk7XHJcbiAgICB2YXIgZW5kWCA9IGVkZ2UudGFyZ2V0KCkucG9zaXRpb24oJ3gnKTtcclxuICAgIHZhciBlbmRZID0gZWRnZS50YXJnZXQoKS5wb3NpdGlvbigneScpO1xyXG4gICBcclxuICAgIGlmKChzdGFydFggPT0gZW5kWCAmJiBzdGFydFkgPT0gZW5kWSkgIHx8IChlZGdlLnNvdXJjZSgpLmlkKCkgPT0gZWRnZS50YXJnZXQoKS5pZCgpKSl7XHJcbiAgICAgIHJldHVybiB0cnVlO1xyXG4gICAgfVxyXG4gICAgZm9yKHZhciBpID0gMDsgdGhpcy5pZ25vcmVkQ2xhc3NlcyAmJiBpIDwgIHRoaXMuaWdub3JlZENsYXNzZXMubGVuZ3RoOyBpKyspe1xyXG4gICAgICBpZihlZGdlLmhhc0NsYXNzKHRoaXMuaWdub3JlZENsYXNzZXNbaV0pKVxyXG4gICAgICAgIHJldHVybiB0cnVlO1xyXG4gICAgfVxyXG4gICAgcmV0dXJuIGZhbHNlO1xyXG4gIH0sXHJcbiAgLy9HZXQgdGhlIGRpcmVjdGlvbiBvZiB0aGUgbGluZSBmcm9tIHNvdXJjZSBwb2ludCB0byB0aGUgdGFyZ2V0IHBvaW50XHJcbiAgZ2V0TGluZURpcmVjdGlvbjogZnVuY3Rpb24oc3JjUG9pbnQsIHRndFBvaW50KXtcclxuICAgIGlmKHNyY1BvaW50LnkgPT0gdGd0UG9pbnQueSAmJiBzcmNQb2ludC54IDwgdGd0UG9pbnQueCl7XHJcbiAgICAgIHJldHVybiAxO1xyXG4gICAgfVxyXG4gICAgaWYoc3JjUG9pbnQueSA8IHRndFBvaW50LnkgJiYgc3JjUG9pbnQueCA8IHRndFBvaW50Lngpe1xyXG4gICAgICByZXR1cm4gMjtcclxuICAgIH1cclxuICAgIGlmKHNyY1BvaW50LnkgPCB0Z3RQb2ludC55ICYmIHNyY1BvaW50LnggPT0gdGd0UG9pbnQueCl7XHJcbiAgICAgIHJldHVybiAzO1xyXG4gICAgfVxyXG4gICAgaWYoc3JjUG9pbnQueSA8IHRndFBvaW50LnkgJiYgc3JjUG9pbnQueCA+IHRndFBvaW50Lngpe1xyXG4gICAgICByZXR1cm4gNDtcclxuICAgIH1cclxuICAgIGlmKHNyY1BvaW50LnkgPT0gdGd0UG9pbnQueSAmJiBzcmNQb2ludC54ID4gdGd0UG9pbnQueCl7XHJcbiAgICAgIHJldHVybiA1O1xyXG4gICAgfVxyXG4gICAgaWYoc3JjUG9pbnQueSA+IHRndFBvaW50LnkgJiYgc3JjUG9pbnQueCA+IHRndFBvaW50Lngpe1xyXG4gICAgICByZXR1cm4gNjtcclxuICAgIH1cclxuICAgIGlmKHNyY1BvaW50LnkgPiB0Z3RQb2ludC55ICYmIHNyY1BvaW50LnggPT0gdGd0UG9pbnQueCl7XHJcbiAgICAgIHJldHVybiA3O1xyXG4gICAgfVxyXG4gICAgcmV0dXJuIDg7Ly9pZiBzcmNQb2ludC55ID4gdGd0UG9pbnQueSBhbmQgc3JjUG9pbnQueCA8IHRndFBvaW50LnhcclxuICB9LFxyXG4gIGdldFNyY1RndFBvaW50c0FuZFRhbmdlbnRzOiBmdW5jdGlvbiAoZWRnZSkge1xyXG4gICAgdmFyIHNvdXJjZU5vZGUgPSBlZGdlLnNvdXJjZSgpO1xyXG4gICAgdmFyIHRhcmdldE5vZGUgPSBlZGdlLnRhcmdldCgpO1xyXG4gICAgXHJcbiAgICB2YXIgdGd0UG9zaXRpb24gPSB0YXJnZXROb2RlLnBvc2l0aW9uKCk7XHJcbiAgICB2YXIgc3JjUG9zaXRpb24gPSBzb3VyY2VOb2RlLnBvc2l0aW9uKCk7XHJcbiAgICBcclxuICAgIHZhciBzcmNQb2ludCA9IHNvdXJjZU5vZGUucG9zaXRpb24oKTtcclxuICAgIHZhciB0Z3RQb2ludCA9IHRhcmdldE5vZGUucG9zaXRpb24oKTtcclxuXHJcblxyXG4gICAgdmFyIG0xID0gKHRndFBvaW50LnkgLSBzcmNQb2ludC55KSAvICh0Z3RQb2ludC54IC0gc3JjUG9pbnQueCk7XHJcbiAgICB2YXIgbTIgPSAtMSAvIG0xO1xyXG5cclxuICAgIHJldHVybiB7XHJcbiAgICAgIG0xOiBtMSxcclxuICAgICAgbTI6IG0yLFxyXG4gICAgICBzcmNQb2ludDogc3JjUG9pbnQsXHJcbiAgICAgIHRndFBvaW50OiB0Z3RQb2ludFxyXG4gICAgfTtcclxuICB9LFxyXG4gIGdldEludGVyc2VjdGlvbjogZnVuY3Rpb24oZWRnZSwgcG9pbnQsIHNyY1RndFBvaW50c0FuZFRhbmdlbnRzKXtcclxuICAgIGlmIChzcmNUZ3RQb2ludHNBbmRUYW5nZW50cyA9PT0gdW5kZWZpbmVkKSB7XHJcbiAgICAgIHNyY1RndFBvaW50c0FuZFRhbmdlbnRzID0gdGhpcy5nZXRTcmNUZ3RQb2ludHNBbmRUYW5nZW50cyhlZGdlKTtcclxuICAgIH1cclxuXHJcbiAgICB2YXIgc3JjUG9pbnQgPSBzcmNUZ3RQb2ludHNBbmRUYW5nZW50cy5zcmNQb2ludDtcclxuICAgIHZhciB0Z3RQb2ludCA9IHNyY1RndFBvaW50c0FuZFRhbmdlbnRzLnRndFBvaW50O1xyXG4gICAgdmFyIG0xID0gc3JjVGd0UG9pbnRzQW5kVGFuZ2VudHMubTE7XHJcbiAgICB2YXIgbTIgPSBzcmNUZ3RQb2ludHNBbmRUYW5nZW50cy5tMjtcclxuXHJcbiAgICB2YXIgaW50ZXJzZWN0WDtcclxuICAgIHZhciBpbnRlcnNlY3RZO1xyXG5cclxuICAgIGlmKG0xID09IEluZmluaXR5IHx8IG0xID09IC1JbmZpbml0eSl7XHJcbiAgICAgIGludGVyc2VjdFggPSBzcmNQb2ludC54O1xyXG4gICAgICBpbnRlcnNlY3RZID0gcG9pbnQueTtcclxuICAgIH1cclxuICAgIGVsc2UgaWYobTEgPT0gMCl7XHJcbiAgICAgIGludGVyc2VjdFggPSBwb2ludC54O1xyXG4gICAgICBpbnRlcnNlY3RZID0gc3JjUG9pbnQueTtcclxuICAgIH1cclxuICAgIGVsc2Uge1xyXG4gICAgICB2YXIgYTEgPSBzcmNQb2ludC55IC0gbTEgKiBzcmNQb2ludC54O1xyXG4gICAgICB2YXIgYTIgPSBwb2ludC55IC0gbTIgKiBwb2ludC54O1xyXG5cclxuICAgICAgaW50ZXJzZWN0WCA9IChhMiAtIGExKSAvIChtMSAtIG0yKTtcclxuICAgICAgaW50ZXJzZWN0WSA9IG0xICogaW50ZXJzZWN0WCArIGExO1xyXG4gICAgfVxyXG5cclxuICAgIC8vSW50ZXJzZWN0aW9uIHBvaW50IGlzIHRoZSBpbnRlcnNlY3Rpb24gb2YgdGhlIGxpbmVzIHBhc3NpbmcgdGhyb3VnaCB0aGUgbm9kZXMgYW5kXHJcbiAgICAvL3Bhc3NpbmcgdGhyb3VnaCB0aGUgYmVuZCBvciBjb250cm9sIHBvaW50IGFuZCBwZXJwZW5kaWN1bGFyIHRvIHRoZSBvdGhlciBsaW5lXHJcbiAgICB2YXIgaW50ZXJzZWN0aW9uUG9pbnQgPSB7XHJcbiAgICAgIHg6IGludGVyc2VjdFgsXHJcbiAgICAgIHk6IGludGVyc2VjdFlcclxuICAgIH07XHJcbiAgICBcclxuICAgIHJldHVybiBpbnRlcnNlY3Rpb25Qb2ludDtcclxuICB9LFxyXG4gIGdldEFuY2hvcnNBc0FycmF5OiBmdW5jdGlvbihlZGdlKSB7XHJcbiAgICB2YXIgdHlwZSA9IHRoaXMuZ2V0RWRnZVR5cGUoZWRnZSk7XHJcblxyXG4gICAgaWYodHlwZSA9PT0gJ2luY29uY2x1c2l2ZScpe1xyXG4gICAgICByZXR1cm4gdW5kZWZpbmVkO1xyXG4gICAgfVxyXG4gICAgXHJcbiAgICBpZiggZWRnZS5jc3MoJ2N1cnZlLXN0eWxlJykgIT09IHRoaXMuc3ludGF4W3R5cGVdWydlZGdlJ10gKSB7XHJcbiAgICAgIHJldHVybiB1bmRlZmluZWQ7XHJcbiAgICB9XHJcbiAgICBcclxuICAgIHZhciBhbmNob3JMaXN0ID0gW107XHJcblxyXG4gICAgdmFyIHdlaWdodHMgPSBlZGdlLnBzdHlsZSggdGhpcy5zeW50YXhbdHlwZV1bJ3dlaWdodENzcyddICkgPyBcclxuICAgICAgICAgICAgICAgICAgZWRnZS5wc3R5bGUoIHRoaXMuc3ludGF4W3R5cGVdWyd3ZWlnaHRDc3MnXSApLnBmVmFsdWUgOiBbXTtcclxuICAgIHZhciBkaXN0YW5jZXMgPSBlZGdlLnBzdHlsZSggdGhpcy5zeW50YXhbdHlwZV1bJ2Rpc3RhbmNlQ3NzJ10gKSA/IFxyXG4gICAgICAgICAgICAgICAgICBlZGdlLnBzdHlsZSggdGhpcy5zeW50YXhbdHlwZV1bJ2Rpc3RhbmNlQ3NzJ10gKS5wZlZhbHVlIDogW107XHJcbiAgICB2YXIgbWluTGVuZ3RocyA9IE1hdGgubWluKCB3ZWlnaHRzLmxlbmd0aCwgZGlzdGFuY2VzLmxlbmd0aCApO1xyXG4gICAgXHJcbiAgICB2YXIgc3JjUG9zID0gZWRnZS5zb3VyY2UoKS5wb3NpdGlvbigpO1xyXG4gICAgdmFyIHRndFBvcyA9IGVkZ2UudGFyZ2V0KCkucG9zaXRpb24oKTtcclxuXHJcbiAgICB2YXIgZHkgPSAoIHRndFBvcy55IC0gc3JjUG9zLnkgKTtcclxuICAgIHZhciBkeCA9ICggdGd0UG9zLnggLSBzcmNQb3MueCApO1xyXG4gICAgXHJcbiAgICB2YXIgbCA9IE1hdGguc3FydCggZHggKiBkeCArIGR5ICogZHkgKTtcclxuXHJcbiAgICB2YXIgdmVjdG9yID0ge1xyXG4gICAgICB4OiBkeCxcclxuICAgICAgeTogZHlcclxuICAgIH07XHJcblxyXG4gICAgdmFyIHZlY3Rvck5vcm0gPSB7XHJcbiAgICAgIHg6IHZlY3Rvci54IC8gbCxcclxuICAgICAgeTogdmVjdG9yLnkgLyBsXHJcbiAgICB9O1xyXG4gICAgXHJcbiAgICB2YXIgdmVjdG9yTm9ybUludmVyc2UgPSB7XHJcbiAgICAgIHg6IC12ZWN0b3JOb3JtLnksXHJcbiAgICAgIHk6IHZlY3Rvck5vcm0ueFxyXG4gICAgfTtcclxuXHJcbiAgICBmb3IoIHZhciBzID0gMDsgcyA8IG1pbkxlbmd0aHM7IHMrKyApe1xyXG4gICAgICB2YXIgdyA9IHdlaWdodHNbIHMgXTtcclxuICAgICAgdmFyIGQgPSBkaXN0YW5jZXNbIHMgXTtcclxuXHJcbiAgICAgIHZhciB3MSA9ICgxIC0gdyk7XHJcbiAgICAgIHZhciB3MiA9IHc7XHJcblxyXG4gICAgICB2YXIgcG9zUHRzID0ge1xyXG4gICAgICAgIHgxOiBzcmNQb3MueCxcclxuICAgICAgICB4MjogdGd0UG9zLngsXHJcbiAgICAgICAgeTE6IHNyY1Bvcy55LFxyXG4gICAgICAgIHkyOiB0Z3RQb3MueVxyXG4gICAgICB9O1xyXG5cclxuICAgICAgdmFyIG1pZHB0UHRzID0gcG9zUHRzO1xyXG4gICAgICBcclxuICAgICAgdmFyIGFkanVzdGVkTWlkcHQgPSB7XHJcbiAgICAgICAgeDogbWlkcHRQdHMueDEgKiB3MSArIG1pZHB0UHRzLngyICogdzIsXHJcbiAgICAgICAgeTogbWlkcHRQdHMueTEgKiB3MSArIG1pZHB0UHRzLnkyICogdzJcclxuICAgICAgfTtcclxuXHJcbiAgICAgIGFuY2hvckxpc3QucHVzaChcclxuICAgICAgICBhZGp1c3RlZE1pZHB0LnggKyB2ZWN0b3JOb3JtSW52ZXJzZS54ICogZCxcclxuICAgICAgICBhZGp1c3RlZE1pZHB0LnkgKyB2ZWN0b3JOb3JtSW52ZXJzZS55ICogZFxyXG4gICAgICApO1xyXG4gICAgfVxyXG4gICAgXHJcbiAgICByZXR1cm4gYW5jaG9yTGlzdDtcclxuICB9LFxyXG4gIGNvbnZlcnRUb1JlbGF0aXZlUG9zaXRpb246IGZ1bmN0aW9uIChlZGdlLCBwb2ludCwgc3JjVGd0UG9pbnRzQW5kVGFuZ2VudHMpIHtcclxuICAgIGlmIChzcmNUZ3RQb2ludHNBbmRUYW5nZW50cyA9PT0gdW5kZWZpbmVkKSB7XHJcbiAgICAgIHNyY1RndFBvaW50c0FuZFRhbmdlbnRzID0gdGhpcy5nZXRTcmNUZ3RQb2ludHNBbmRUYW5nZW50cyhlZGdlKTtcclxuICAgIH1cclxuICAgIFxyXG4gICAgdmFyIGludGVyc2VjdGlvblBvaW50ID0gdGhpcy5nZXRJbnRlcnNlY3Rpb24oZWRnZSwgcG9pbnQsIHNyY1RndFBvaW50c0FuZFRhbmdlbnRzKTtcclxuICAgIHZhciBpbnRlcnNlY3RYID0gaW50ZXJzZWN0aW9uUG9pbnQueDtcclxuICAgIHZhciBpbnRlcnNlY3RZID0gaW50ZXJzZWN0aW9uUG9pbnQueTtcclxuICAgIFxyXG4gICAgdmFyIHNyY1BvaW50ID0gc3JjVGd0UG9pbnRzQW5kVGFuZ2VudHMuc3JjUG9pbnQ7XHJcbiAgICB2YXIgdGd0UG9pbnQgPSBzcmNUZ3RQb2ludHNBbmRUYW5nZW50cy50Z3RQb2ludDtcclxuICAgIFxyXG4gICAgdmFyIHdlaWdodDtcclxuICAgIFxyXG4gICAgaWYoIGludGVyc2VjdFggIT0gc3JjUG9pbnQueCApIHtcclxuICAgICAgd2VpZ2h0ID0gKGludGVyc2VjdFggLSBzcmNQb2ludC54KSAvICh0Z3RQb2ludC54IC0gc3JjUG9pbnQueCk7XHJcbiAgICB9XHJcbiAgICBlbHNlIGlmKCBpbnRlcnNlY3RZICE9IHNyY1BvaW50LnkgKSB7XHJcbiAgICAgIHdlaWdodCA9IChpbnRlcnNlY3RZIC0gc3JjUG9pbnQueSkgLyAodGd0UG9pbnQueSAtIHNyY1BvaW50LnkpO1xyXG4gICAgfVxyXG4gICAgZWxzZSB7XHJcbiAgICAgIHdlaWdodCA9IDA7XHJcbiAgICB9XHJcbiAgICBcclxuICAgIHZhciBkaXN0YW5jZSA9IE1hdGguc3FydChNYXRoLnBvdygoaW50ZXJzZWN0WSAtIHBvaW50LnkpLCAyKVxyXG4gICAgICAgICsgTWF0aC5wb3coKGludGVyc2VjdFggLSBwb2ludC54KSwgMikpO1xyXG4gICAgXHJcbiAgICAvL0dldCB0aGUgZGlyZWN0aW9uIG9mIHRoZSBsaW5lIGZvcm0gc291cmNlIHBvaW50IHRvIHRhcmdldCBwb2ludFxyXG4gICAgdmFyIGRpcmVjdGlvbjEgPSB0aGlzLmdldExpbmVEaXJlY3Rpb24oc3JjUG9pbnQsIHRndFBvaW50KTtcclxuICAgIC8vR2V0IHRoZSBkaXJlY3Rpb24gb2YgdGhlIGxpbmUgZnJvbSBpbnRlc2VjdGlvbiBwb2ludCB0byB0aGUgcG9pbnRcclxuICAgIHZhciBkaXJlY3Rpb24yID0gdGhpcy5nZXRMaW5lRGlyZWN0aW9uKGludGVyc2VjdGlvblBvaW50LCBwb2ludCk7XHJcbiAgICBcclxuICAgIC8vSWYgdGhlIGRpZmZlcmVuY2UgaXMgbm90IC0yIGFuZCBub3QgNiB0aGVuIHRoZSBkaXJlY3Rpb24gb2YgdGhlIGRpc3RhbmNlIGlzIG5lZ2F0aXZlXHJcbiAgICBpZihkaXJlY3Rpb24xIC0gZGlyZWN0aW9uMiAhPSAtMiAmJiBkaXJlY3Rpb24xIC0gZGlyZWN0aW9uMiAhPSA2KXtcclxuICAgICAgaWYoZGlzdGFuY2UgIT0gMClcclxuICAgICAgICBkaXN0YW5jZSA9IC0xICogZGlzdGFuY2U7XHJcbiAgICB9XHJcbiAgICBcclxuICAgIHJldHVybiB7XHJcbiAgICAgIHdlaWdodDogd2VpZ2h0LFxyXG4gICAgICBkaXN0YW5jZTogZGlzdGFuY2VcclxuICAgIH07XHJcbiAgfSxcclxuICBjb252ZXJ0VG9SZWxhdGl2ZVBvc2l0aW9uczogZnVuY3Rpb24gKGVkZ2UsIGFuY2hvclBvaW50cykge1xyXG4gICAgdmFyIHNyY1RndFBvaW50c0FuZFRhbmdlbnRzID0gdGhpcy5nZXRTcmNUZ3RQb2ludHNBbmRUYW5nZW50cyhlZGdlKTtcclxuXHJcbiAgICB2YXIgd2VpZ2h0cyA9IFtdO1xyXG4gICAgdmFyIGRpc3RhbmNlcyA9IFtdO1xyXG5cclxuICAgIGZvciAodmFyIGkgPSAwOyBhbmNob3JQb2ludHMgJiYgaSA8IGFuY2hvclBvaW50cy5sZW5ndGg7IGkrKykge1xyXG4gICAgICB2YXIgYW5jaG9yID0gYW5jaG9yUG9pbnRzW2ldO1xyXG4gICAgICB2YXIgcmVsYXRpdmVBbmNob3JQb3NpdGlvbiA9IHRoaXMuY29udmVydFRvUmVsYXRpdmVQb3NpdGlvbihlZGdlLCBhbmNob3IsIHNyY1RndFBvaW50c0FuZFRhbmdlbnRzKTtcclxuXHJcbiAgICAgIHdlaWdodHMucHVzaChyZWxhdGl2ZUFuY2hvclBvc2l0aW9uLndlaWdodCk7XHJcbiAgICAgIGRpc3RhbmNlcy5wdXNoKHJlbGF0aXZlQW5jaG9yUG9zaXRpb24uZGlzdGFuY2UpO1xyXG4gICAgfVxyXG5cclxuICAgIHJldHVybiB7XHJcbiAgICAgIHdlaWdodHM6IHdlaWdodHMsXHJcbiAgICAgIGRpc3RhbmNlczogZGlzdGFuY2VzXHJcbiAgICB9O1xyXG4gIH0sXHJcbiAgZ2V0RGlzdGFuY2VzU3RyaW5nOiBmdW5jdGlvbiAoZWRnZSwgdHlwZSkge1xyXG4gICAgdmFyIHN0ciA9IFwiXCI7XHJcblxyXG4gICAgdmFyIGRpc3RhbmNlcyA9IGVkZ2UuZGF0YSh0aGlzLnN5bnRheFt0eXBlXVsnZGlzdGFuY2UnXSk7XHJcbiAgICBmb3IgKHZhciBpID0gMDsgZGlzdGFuY2VzICYmIGkgPCBkaXN0YW5jZXMubGVuZ3RoOyBpKyspIHtcclxuICAgICAgc3RyID0gc3RyICsgXCIgXCIgKyBkaXN0YW5jZXNbaV07XHJcbiAgICB9XHJcbiAgICBcclxuICAgIHJldHVybiBzdHI7XHJcbiAgfSxcclxuICBnZXRXZWlnaHRzU3RyaW5nOiBmdW5jdGlvbiAoZWRnZSwgdHlwZSkge1xyXG4gICAgdmFyIHN0ciA9IFwiXCI7XHJcblxyXG4gICAgdmFyIHdlaWdodHMgPSBlZGdlLmRhdGEodGhpcy5zeW50YXhbdHlwZV1bJ3dlaWdodCddKTtcclxuICAgIGZvciAodmFyIGkgPSAwOyB3ZWlnaHRzICYmIGkgPCB3ZWlnaHRzLmxlbmd0aDsgaSsrKSB7XHJcbiAgICAgIHN0ciA9IHN0ciArIFwiIFwiICsgd2VpZ2h0c1tpXTtcclxuICAgIH1cclxuICAgIFxyXG4gICAgcmV0dXJuIHN0cjtcclxuICB9LFxyXG4gIGFkZEFuY2hvclBvaW50OiBmdW5jdGlvbihlZGdlLCBuZXdBbmNob3JQb2ludCwgdHlwZSA9IHVuZGVmaW5lZCkge1xyXG4gICAgaWYoZWRnZSA9PT0gdW5kZWZpbmVkIHx8IG5ld0FuY2hvclBvaW50ID09PSB1bmRlZmluZWQpe1xyXG4gICAgICBlZGdlID0gdGhpcy5jdXJyZW50Q3R4RWRnZTtcclxuICAgICAgbmV3QW5jaG9yUG9pbnQgPSB0aGlzLmN1cnJlbnRDdHhQb3M7XHJcbiAgICB9XHJcbiAgXHJcbiAgICBpZih0eXBlID09PSB1bmRlZmluZWQpXHJcbiAgICAgIHR5cGUgPSB0aGlzLmdldEVkZ2VUeXBlKGVkZ2UpO1xyXG5cclxuICAgIHZhciB3ZWlnaHRTdHIgPSB0aGlzLnN5bnRheFt0eXBlXVsnd2VpZ2h0J107XHJcbiAgICB2YXIgZGlzdGFuY2VTdHIgPSB0aGlzLnN5bnRheFt0eXBlXVsnZGlzdGFuY2UnXTtcclxuXHJcbiAgICB2YXIgcmVsYXRpdmVQb3NpdGlvbiA9IHRoaXMuY29udmVydFRvUmVsYXRpdmVQb3NpdGlvbihlZGdlLCBuZXdBbmNob3JQb2ludCk7XHJcbiAgICB2YXIgb3JpZ2luYWxBbmNob3JXZWlnaHQgPSByZWxhdGl2ZVBvc2l0aW9uLndlaWdodDtcclxuICAgIFxyXG4gICAgdmFyIHN0YXJ0WCA9IGVkZ2Uuc291cmNlKCkucG9zaXRpb24oJ3gnKTtcclxuICAgIHZhciBzdGFydFkgPSBlZGdlLnNvdXJjZSgpLnBvc2l0aW9uKCd5Jyk7XHJcbiAgICB2YXIgZW5kWCA9IGVkZ2UudGFyZ2V0KCkucG9zaXRpb24oJ3gnKTtcclxuICAgIHZhciBlbmRZID0gZWRnZS50YXJnZXQoKS5wb3NpdGlvbigneScpO1xyXG4gICAgdmFyIHN0YXJ0V2VpZ2h0ID0gdGhpcy5jb252ZXJ0VG9SZWxhdGl2ZVBvc2l0aW9uKGVkZ2UsIHt4OiBzdGFydFgsIHk6IHN0YXJ0WX0pLndlaWdodDtcclxuICAgIHZhciBlbmRXZWlnaHQgPSB0aGlzLmNvbnZlcnRUb1JlbGF0aXZlUG9zaXRpb24oZWRnZSwge3g6IGVuZFgsIHk6IGVuZFl9KS53ZWlnaHQ7XHJcbiAgICB2YXIgd2VpZ2h0c1dpdGhUZ3RTcmMgPSBbc3RhcnRXZWlnaHRdLmNvbmNhdChlZGdlLmRhdGEod2VpZ2h0U3RyKT9lZGdlLmRhdGEod2VpZ2h0U3RyKTpbXSkuY29uY2F0KFtlbmRXZWlnaHRdKTtcclxuICAgIFxyXG4gICAgdmFyIGFuY2hvcnNMaXN0ID0gdGhpcy5nZXRBbmNob3JzQXNBcnJheShlZGdlKTtcclxuICAgIFxyXG4gICAgdmFyIG1pbkRpc3QgPSBJbmZpbml0eTtcclxuICAgIHZhciBpbnRlcnNlY3Rpb247XHJcbiAgICB2YXIgcHRzV2l0aFRndFNyYyA9IFtzdGFydFgsIHN0YXJ0WV1cclxuICAgICAgICAgICAgLmNvbmNhdChhbmNob3JzTGlzdD9hbmNob3JzTGlzdDpbXSlcclxuICAgICAgICAgICAgLmNvbmNhdChbZW5kWCwgZW5kWV0pO1xyXG4gICAgdmFyIG5ld0FuY2hvckluZGV4ID0gLTE7XHJcbiAgICBcclxuICAgIGZvcih2YXIgaSA9IDA7IGkgPCB3ZWlnaHRzV2l0aFRndFNyYy5sZW5ndGggLSAxOyBpKyspe1xyXG4gICAgICB2YXIgdzEgPSB3ZWlnaHRzV2l0aFRndFNyY1tpXTtcclxuICAgICAgdmFyIHcyID0gd2VpZ2h0c1dpdGhUZ3RTcmNbaSArIDFdO1xyXG4gICAgICBcclxuICAgICAgLy9jaGVjayBpZiB0aGUgd2VpZ2h0IGlzIGJldHdlZW4gdzEgYW5kIHcyXHJcbiAgICAgIGNvbnN0IGIxID0gdGhpcy5jb21wYXJlV2l0aFByZWNpc2lvbihvcmlnaW5hbEFuY2hvcldlaWdodCwgdzEsIHRydWUpO1xyXG4gICAgICBjb25zdCBiMiA9IHRoaXMuY29tcGFyZVdpdGhQcmVjaXNpb24ob3JpZ2luYWxBbmNob3JXZWlnaHQsIHcyKTtcclxuICAgICAgY29uc3QgYjMgPSB0aGlzLmNvbXBhcmVXaXRoUHJlY2lzaW9uKG9yaWdpbmFsQW5jaG9yV2VpZ2h0LCB3MiwgdHJ1ZSk7XHJcbiAgICAgIGNvbnN0IGI0ID0gdGhpcy5jb21wYXJlV2l0aFByZWNpc2lvbihvcmlnaW5hbEFuY2hvcldlaWdodCwgdzEpO1xyXG4gICAgICBpZiggKGIxICYmIGIyKSB8fCAoYjMgJiYgYjQpKXtcclxuICAgICAgICB2YXIgc3RhcnRYID0gcHRzV2l0aFRndFNyY1syICogaV07XHJcbiAgICAgICAgdmFyIHN0YXJ0WSA9IHB0c1dpdGhUZ3RTcmNbMiAqIGkgKyAxXTtcclxuICAgICAgICB2YXIgZW5kWCA9IHB0c1dpdGhUZ3RTcmNbMiAqIGkgKyAyXTtcclxuICAgICAgICB2YXIgZW5kWSA9IHB0c1dpdGhUZ3RTcmNbMiAqIGkgKyAzXTtcclxuICAgICAgICBcclxuICAgICAgICB2YXIgc3RhcnQgPSB7XHJcbiAgICAgICAgICB4OiBzdGFydFgsXHJcbiAgICAgICAgICB5OiBzdGFydFlcclxuICAgICAgICB9O1xyXG4gICAgICAgIFxyXG4gICAgICAgIHZhciBlbmQgPSB7XHJcbiAgICAgICAgICB4OiBlbmRYLFxyXG4gICAgICAgICAgeTogZW5kWVxyXG4gICAgICAgIH07XHJcbiAgICAgICAgXHJcbiAgICAgICAgdmFyIG0xID0gKCBzdGFydFkgLSBlbmRZICkgLyAoIHN0YXJ0WCAtIGVuZFggKTtcclxuICAgICAgICB2YXIgbTIgPSAtMSAvIG0xO1xyXG4gICAgICAgIFxyXG4gICAgICAgIHZhciBzcmNUZ3RQb2ludHNBbmRUYW5nZW50cyA9IHtcclxuICAgICAgICAgIHNyY1BvaW50OiBzdGFydCxcclxuICAgICAgICAgIHRndFBvaW50OiBlbmQsXHJcbiAgICAgICAgICBtMTogbTEsXHJcbiAgICAgICAgICBtMjogbTJcclxuICAgICAgICB9O1xyXG4gICAgICAgIFxyXG4gICAgICAgIHZhciBjdXJyZW50SW50ZXJzZWN0aW9uID0gdGhpcy5nZXRJbnRlcnNlY3Rpb24oZWRnZSwgbmV3QW5jaG9yUG9pbnQsIHNyY1RndFBvaW50c0FuZFRhbmdlbnRzKTtcclxuICAgICAgICB2YXIgZGlzdCA9IE1hdGguc3FydCggTWF0aC5wb3coIChuZXdBbmNob3JQb2ludC54IC0gY3VycmVudEludGVyc2VjdGlvbi54KSwgMiApIFxyXG4gICAgICAgICAgICAgICAgKyBNYXRoLnBvdyggKG5ld0FuY2hvclBvaW50LnkgLSBjdXJyZW50SW50ZXJzZWN0aW9uLnkpLCAyICkpO1xyXG4gICAgICAgIFxyXG4gICAgICAgIC8vVXBkYXRlIHRoZSBtaW5pbXVtIGRpc3RhbmNlXHJcbiAgICAgICAgaWYoZGlzdCA8IG1pbkRpc3Qpe1xyXG4gICAgICAgICAgbWluRGlzdCA9IGRpc3Q7XHJcbiAgICAgICAgICBpbnRlcnNlY3Rpb24gPSBjdXJyZW50SW50ZXJzZWN0aW9uO1xyXG4gICAgICAgICAgbmV3QW5jaG9ySW5kZXggPSBpO1xyXG4gICAgICAgIH1cclxuICAgICAgfVxyXG4gICAgfVxyXG4gICAgXHJcbiAgICBpZihpbnRlcnNlY3Rpb24gIT09IHVuZGVmaW5lZCl7XHJcbiAgICAgIG5ld0FuY2hvclBvaW50ID0gaW50ZXJzZWN0aW9uO1xyXG4gICAgfVxyXG4gICAgXHJcbiAgICByZWxhdGl2ZVBvc2l0aW9uID0gdGhpcy5jb252ZXJ0VG9SZWxhdGl2ZVBvc2l0aW9uKGVkZ2UsIG5ld0FuY2hvclBvaW50KTtcclxuICAgIFxyXG4gICAgaWYoaW50ZXJzZWN0aW9uID09PSB1bmRlZmluZWQpe1xyXG4gICAgICByZWxhdGl2ZVBvc2l0aW9uLmRpc3RhbmNlID0gMDtcclxuICAgIH1cclxuXHJcbiAgICB2YXIgd2VpZ2h0cyA9IGVkZ2UuZGF0YSh3ZWlnaHRTdHIpO1xyXG4gICAgdmFyIGRpc3RhbmNlcyA9IGVkZ2UuZGF0YShkaXN0YW5jZVN0cik7XHJcbiAgICBcclxuICAgIHdlaWdodHMgPSB3ZWlnaHRzP3dlaWdodHM6W107XHJcbiAgICBkaXN0YW5jZXMgPSBkaXN0YW5jZXM/ZGlzdGFuY2VzOltdO1xyXG4gICAgXHJcbiAgICBpZih3ZWlnaHRzLmxlbmd0aCA9PT0gMCkge1xyXG4gICAgICBuZXdBbmNob3JJbmRleCA9IDA7XHJcbiAgICB9XHJcbiAgICBcclxuLy8gICAgd2VpZ2h0cy5wdXNoKHJlbGF0aXZlQmVuZFBvc2l0aW9uLndlaWdodCk7XHJcbi8vICAgIGRpc3RhbmNlcy5wdXNoKHJlbGF0aXZlQmVuZFBvc2l0aW9uLmRpc3RhbmNlKTtcclxuICAgIGlmKG5ld0FuY2hvckluZGV4ICE9IC0xKXtcclxuICAgICAgd2VpZ2h0cy5zcGxpY2UobmV3QW5jaG9ySW5kZXgsIDAsIHJlbGF0aXZlUG9zaXRpb24ud2VpZ2h0KTtcclxuICAgICAgZGlzdGFuY2VzLnNwbGljZShuZXdBbmNob3JJbmRleCwgMCwgcmVsYXRpdmVQb3NpdGlvbi5kaXN0YW5jZSk7XHJcbiAgICB9XHJcbiAgIFxyXG4gICAgZWRnZS5kYXRhKHdlaWdodFN0ciwgd2VpZ2h0cyk7XHJcbiAgICBlZGdlLmRhdGEoZGlzdGFuY2VTdHIsIGRpc3RhbmNlcyk7XHJcbiAgICBcclxuICAgIGVkZ2UuYWRkQ2xhc3ModGhpcy5zeW50YXhbdHlwZV1bJ2NsYXNzJ10pO1xyXG4gICAgaWYgKHdlaWdodHMubGVuZ3RoID4gMSB8fCBkaXN0YW5jZXMubGVuZ3RoID4gMSkge1xyXG4gICAgICBlZGdlLmFkZENsYXNzKHRoaXMuc3ludGF4W3R5cGVdWydtdWx0aUNsYXNzJ10pO1xyXG4gICAgfVxyXG4gICAgXHJcbiAgICByZXR1cm4gbmV3QW5jaG9ySW5kZXg7XHJcbiAgfSxcclxuICByZW1vdmVBbmNob3I6IGZ1bmN0aW9uKGVkZ2UsIGFuY2hvckluZGV4KXtcclxuICAgIGlmKGVkZ2UgPT09IHVuZGVmaW5lZCB8fCBhbmNob3JJbmRleCA9PT0gdW5kZWZpbmVkKXtcclxuICAgICAgZWRnZSA9IHRoaXMuY3VycmVudEN0eEVkZ2U7XHJcbiAgICAgIGFuY2hvckluZGV4ID0gdGhpcy5jdXJyZW50QW5jaG9ySW5kZXg7XHJcbiAgICB9XHJcbiAgICBcclxuICAgIHZhciB0eXBlID0gdGhpcy5nZXRFZGdlVHlwZShlZGdlKTtcclxuXHJcbiAgICBpZih0aGlzLmVkZ2VUeXBlSW5jb25jbHVzaXZlU2hvdWxkbnRIYXBwZW4odHlwZSwgXCJhbmNob3JQb2ludFV0aWxpdGllcy5qcywgcmVtb3ZlQW5jaG9yXCIpKXtcclxuICAgICAgcmV0dXJuO1xyXG4gICAgfVxyXG5cclxuICAgIHZhciBkaXN0YW5jZVN0ciA9IHRoaXMuc3ludGF4W3R5cGVdWyd3ZWlnaHQnXTtcclxuICAgIHZhciB3ZWlnaHRTdHIgPSB0aGlzLnN5bnRheFt0eXBlXVsnZGlzdGFuY2UnXTtcclxuXHJcbiAgICB2YXIgZGlzdGFuY2VzID0gZWRnZS5kYXRhKGRpc3RhbmNlU3RyKTtcclxuICAgIHZhciB3ZWlnaHRzID0gZWRnZS5kYXRhKHdlaWdodFN0cik7XHJcbiAgICBcclxuICAgIGRpc3RhbmNlcy5zcGxpY2UoYW5jaG9ySW5kZXgsIDEpO1xyXG4gICAgd2VpZ2h0cy5zcGxpY2UoYW5jaG9ySW5kZXgsIDEpO1xyXG4gICAgXHJcbiAgICAvLyBvbmx5IG9uZSBhbmNob3IgcG9pbnQgbGVmdCBvbiBlZGdlXHJcbiAgICBpZiAoZGlzdGFuY2VzLmxlbmd0aCA9PSAxIHx8IHdlaWdodHMubGVuZ3RoID09IDEpIHtcclxuICAgICAgZWRnZS5yZW1vdmVDbGFzcyh0aGlzLnN5bnRheFt0eXBlXVsnbXVsdGlDbGFzcyddKVxyXG4gICAgfVxyXG4gICAgLy8gbm8gbW9yZSBhbmNob3IgcG9pbnRzIG9uIGVkZ2VcclxuICAgIGVsc2UgaWYoZGlzdGFuY2VzLmxlbmd0aCA9PSAwIHx8IHdlaWdodHMubGVuZ3RoID09IDApe1xyXG4gICAgICBlZGdlLnJlbW92ZUNsYXNzKHRoaXMuc3ludGF4W3R5cGVdWydjbGFzcyddKTtcclxuICAgICAgZWRnZS5kYXRhKGRpc3RhbmNlU3RyLCBbXSk7XHJcbiAgICAgIGVkZ2UuZGF0YSh3ZWlnaHRTdHIsIFtdKTtcclxuICAgIH1cclxuICAgIGVsc2Uge1xyXG4gICAgICBlZGdlLmRhdGEoZGlzdGFuY2VTdHIsIGRpc3RhbmNlcyk7XHJcbiAgICAgIGVkZ2UuZGF0YSh3ZWlnaHRTdHIsIHdlaWdodHMpO1xyXG4gICAgfVxyXG4gIH0sXHJcbiAgcmVtb3ZlQWxsQW5jaG9yczogZnVuY3Rpb24oZWRnZSkge1xyXG4gICAgaWYgKGVkZ2UgPT09IHVuZGVmaW5lZCkge1xyXG4gICAgICBlZGdlID0gdGhpcy5jdXJyZW50Q3R4RWRnZTtcclxuICAgIH1cclxuICAgIHZhciB0eXBlID0gdGhpcy5nZXRFZGdlVHlwZShlZGdlKTtcclxuICAgIFxyXG4gICAgaWYodGhpcy5lZGdlVHlwZUluY29uY2x1c2l2ZVNob3VsZG50SGFwcGVuKHR5cGUsIFwiYW5jaG9yUG9pbnRVdGlsaXRpZXMuanMsIHJlbW92ZUFsbEFuY2hvcnNcIikpe1xyXG4gICAgICByZXR1cm47XHJcbiAgICB9XHJcblxyXG4gICAgLy8gUmVtb3ZlIGNsYXNzZXMgZnJvbSBlZGdlXHJcbiAgICBlZGdlLnJlbW92ZUNsYXNzKHRoaXMuc3ludGF4W3R5cGVdWydjbGFzcyddKTtcclxuICAgIGVkZ2UucmVtb3ZlQ2xhc3ModGhpcy5zeW50YXhbdHlwZV1bJ211bHRpQ2xhc3MnXSk7XHJcblxyXG4gICAgLy8gUmVtb3ZlIGFsbCBhbmNob3IgcG9pbnQgZGF0YSBmcm9tIGVkZ2VcclxuICAgIHZhciBkaXN0YW5jZVN0ciA9IHRoaXMuc3ludGF4W3R5cGVdWyd3ZWlnaHQnXTtcclxuICAgIHZhciB3ZWlnaHRTdHIgPSB0aGlzLnN5bnRheFt0eXBlXVsnZGlzdGFuY2UnXTtcclxuICAgIGVkZ2UuZGF0YShkaXN0YW5jZVN0ciwgW10pO1xyXG4gICAgZWRnZS5kYXRhKHdlaWdodFN0ciwgW10pO1xyXG5cclxuICB9LFxyXG4gIGNhbGN1bGF0ZURpc3RhbmNlOiBmdW5jdGlvbihwdDEsIHB0Mikge1xyXG4gICAgdmFyIGRpZmZYID0gcHQxLnggLSBwdDIueDtcclxuICAgIHZhciBkaWZmWSA9IHB0MS55IC0gcHQyLnk7XHJcbiAgICBcclxuICAgIHZhciBkaXN0ID0gTWF0aC5zcXJ0KCBNYXRoLnBvdyggZGlmZlgsIDIgKSArIE1hdGgucG93KCBkaWZmWSwgMiApICk7XHJcbiAgICByZXR1cm4gZGlzdDtcclxuICB9LFxyXG4gIC8qKiAoTGVzcyB0aGFuIG9yIGVxdWFsIHRvKSBhbmQgKGdyZWF0ZXIgdGhlbiBlcXVhbCB0bykgY29tcGFyaXNvbnMgd2l0aCBmbG9hdGluZyBwb2ludCBudW1iZXJzICovXHJcbiAgY29tcGFyZVdpdGhQcmVjaXNpb246IGZ1bmN0aW9uIChuMSwgbjIsIGlzTGVzc1RoZW5PckVxdWFsID0gZmFsc2UsIHByZWNpc2lvbiA9IDAuMDEpIHtcclxuICAgIGNvbnN0IGRpZmYgPSBuMSAtIG4yO1xyXG4gICAgaWYgKE1hdGguYWJzKGRpZmYpIDw9IHByZWNpc2lvbikge1xyXG4gICAgICByZXR1cm4gdHJ1ZTtcclxuICAgIH1cclxuICAgIGlmIChpc0xlc3NUaGVuT3JFcXVhbCkge1xyXG4gICAgICByZXR1cm4gbjEgPCBuMjtcclxuICAgIH0gZWxzZSB7XHJcbiAgICAgIHJldHVybiBuMSA+IG4yO1xyXG4gICAgfVxyXG4gIH0sXHJcbiAgZWRnZVR5cGVJbmNvbmNsdXNpdmVTaG91bGRudEhhcHBlbjogZnVuY3Rpb24odHlwZSwgcGxhY2Upe1xyXG4gICAgaWYodHlwZSA9PT0gJ2luY29uY2x1c2l2ZScpIHtcclxuICAgICAgY29uc29sZS5sb2coYEluICR7cGxhY2V9OiBlZGdlIHR5cGUgaW5jb25jbHVzaXZlIHNob3VsZCBuZXZlciBoYXBwZW4gaGVyZSEhYCk7XHJcbiAgICAgIHJldHVybiB0cnVlO1xyXG4gICAgfVxyXG4gICAgcmV0dXJuIGZhbHNlO1xyXG4gIH1cclxufTtcclxuXHJcbm1vZHVsZS5leHBvcnRzID0gYW5jaG9yUG9pbnRVdGlsaXRpZXM7XHJcbiIsInZhciBkZWJvdW5jZSA9IHJlcXVpcmUoJy4vZGVib3VuY2UnKTtcclxudmFyIGFuY2hvclBvaW50VXRpbGl0aWVzID0gcmVxdWlyZSgnLi9BbmNob3JQb2ludFV0aWxpdGllcycpO1xyXG52YXIgcmVjb25uZWN0aW9uVXRpbGl0aWVzID0gcmVxdWlyZSgnLi9yZWNvbm5lY3Rpb25VdGlsaXRpZXMnKTtcclxudmFyIHJlZ2lzdGVyVW5kb1JlZG9GdW5jdGlvbnMgPSByZXF1aXJlKCcuL3JlZ2lzdGVyVW5kb1JlZG9GdW5jdGlvbnMnKTtcclxuXHJcbm1vZHVsZS5leHBvcnRzID0gZnVuY3Rpb24gKHBhcmFtcywgY3kpIHtcclxuICB2YXIgZm4gPSBwYXJhbXM7XHJcblxyXG4gIHZhciBhZGRCZW5kUG9pbnRDeHRNZW51SWQgPSAnY3ktZWRnZS1iZW5kLWVkaXRpbmctY3h0LWFkZC1iZW5kLXBvaW50JztcclxuICB2YXIgcmVtb3ZlQmVuZFBvaW50Q3h0TWVudUlkID0gJ2N5LWVkZ2UtYmVuZC1lZGl0aW5nLWN4dC1yZW1vdmUtYmVuZC1wb2ludCc7XHJcbiAgdmFyIHJlbW92ZUFsbEJlbmRQb2ludEN0eE1lbnVJZCA9ICdjeS1lZGdlLWJlbmQtZWRpdGluZy1jeHQtcmVtb3ZlLW11bHRpcGxlLWJlbmQtcG9pbnQnO1xyXG4gIHZhciBhZGRDb250cm9sUG9pbnRDeHRNZW51SWQgPSAnY3ktZWRnZS1jb250cm9sLWVkaXRpbmctY3h0LWFkZC1jb250cm9sLXBvaW50JztcclxuICB2YXIgcmVtb3ZlQ29udHJvbFBvaW50Q3h0TWVudUlkID0gJ2N5LWVkZ2UtY29udHJvbC1lZGl0aW5nLWN4dC1yZW1vdmUtY29udHJvbC1wb2ludCc7XHJcbiAgdmFyIHJlbW92ZUFsbENvbnRyb2xQb2ludEN0eE1lbnVJZCA9ICdjeS1lZGdlLWJlbmQtZWRpdGluZy1jeHQtcmVtb3ZlLW11bHRpcGxlLWNvbnRyb2wtcG9pbnQnO1xyXG4gIHZhciBlU3R5bGUsIGVSZW1vdmUsIGVBZGQsIGVab29tLCBlU2VsZWN0LCBlVW5zZWxlY3QsIGVUYXBTdGFydCwgZVRhcFN0YXJ0T25FZGdlLCBlVGFwRHJhZywgZVRhcEVuZCwgZUN4dFRhcCwgZURyYWc7XHJcbiAgLy8gbGFzdCBzdGF0dXMgb2YgZ2VzdHVyZXNcclxuICB2YXIgbGFzdFBhbm5pbmdFbmFibGVkLCBsYXN0Wm9vbWluZ0VuYWJsZWQsIGxhc3RCb3hTZWxlY3Rpb25FbmFibGVkO1xyXG4gIHZhciBsYXN0QWN0aXZlQmdPcGFjaXR5O1xyXG4gIC8vIHN0YXR1cyBvZiBlZGdlIHRvIGhpZ2hsaWdodCBiZW5kcyBhbmQgc2VsZWN0ZWQgZWRnZXNcclxuICB2YXIgZWRnZVRvSGlnaGxpZ2h0LCBudW1iZXJPZlNlbGVjdGVkRWRnZXM7XHJcblxyXG4gIC8vIHRoZSBLYW52YS5zaGFwZSgpIGZvciB0aGUgZW5kcG9pbnRzXHJcbiAgdmFyIGVuZHBvaW50U2hhcGUxID0gbnVsbCwgZW5kcG9pbnRTaGFwZTIgPSBudWxsO1xyXG4gIC8vIHVzZWQgdG8gc3RvcCBjZXJ0YWluIGN5IGxpc3RlbmVycyB3aGVuIGludGVycmFjdGluZyB3aXRoIGFuY2hvcnNcclxuICB2YXIgYW5jaG9yVG91Y2hlZCA9IGZhbHNlO1xyXG4gIC8vIHVzZWQgY2FsbCBlTW91c2VEb3duIG9mIGFuY2hvck1hbmFnZXIgaWYgdGhlIG1vdXNlIGlzIG91dCBvZiB0aGUgY29udGVudCBvbiBjeS5vbih0YXBlbmQpXHJcbiAgdmFyIG1vdXNlT3V0O1xyXG4gIFxyXG4gIHZhciBmdW5jdGlvbnMgPSB7XHJcbiAgICBpbml0OiBmdW5jdGlvbiAoKSB7XHJcbiAgICAgIC8vIHJlZ2lzdGVyIHVuZG8gcmVkbyBmdW5jdGlvbnNcclxuICAgICAgcmVnaXN0ZXJVbmRvUmVkb0Z1bmN0aW9ucyhjeSwgYW5jaG9yUG9pbnRVdGlsaXRpZXMsIHBhcmFtcyk7XHJcbiAgICAgIFxyXG4gICAgICB2YXIgc2VsZiA9IHRoaXM7XHJcbiAgICAgIHZhciBvcHRzID0gcGFyYW1zO1xyXG5cclxuICAgICAgLypcclxuICAgICAgICBNYWtlIHN1cmUgd2UgZG9uJ3QgYXBwZW5kIGFuIGVsZW1lbnQgdGhhdCBhbHJlYWR5IGV4aXN0cy5cclxuICAgICAgICBUaGlzIGV4dGVuc2lvbiBjYW52YXMgdXNlcyB0aGUgc2FtZSBodG1sIGVsZW1lbnQgYXMgZWRnZS1lZGl0aW5nLlxyXG4gICAgICAgIEl0IG1ha2VzIHNlbnNlIHNpbmNlIGl0IGFsc28gdXNlcyB0aGUgc2FtZSBLb252YSBzdGFnZS5cclxuICAgICAgICBXaXRob3V0IHRoZSBiZWxvdyBsb2dpYywgYW4gZW1wdHkgY2FudmFzRWxlbWVudCB3b3VsZCBiZSBjcmVhdGVkXHJcbiAgICAgICAgZm9yIG9uZSBvZiB0aGVzZSBleHRlbnNpb25zIGZvciBubyByZWFzb24uXHJcbiAgICAgICovXHJcbiAgICAgIHZhciAkY29udGFpbmVyID0gJCh0aGlzKTtcclxuICAgICAgdmFyIGNhbnZhc0VsZW1lbnRJZCA9ICdjeS1ub2RlLWVkZ2UtZWRpdGluZy1zdGFnZSc7XHJcbiAgICAgIHZhciAkY2FudmFzRWxlbWVudCA9ICQoJzxkaXYgaWQ9XCInICsgY2FudmFzRWxlbWVudElkICsgJ1wiPjwvZGl2PicpO1xyXG5cclxuICAgICAgaWYgKCRjb250YWluZXIuZmluZCgnIycgKyBjYW52YXNFbGVtZW50SWQpLmxlbmd0aCA8IDEpIHtcclxuICAgICAgICAkY29udGFpbmVyLmFwcGVuZCgkY2FudmFzRWxlbWVudCk7XHJcbiAgICAgIH1cclxuXHJcbiAgICAgIC8qIFxyXG4gICAgICAgIE1haW50YWluIGEgc2luZ2xlIEtvbnZhLnN0YWdlIG9iamVjdCB0aHJvdWdob3V0IHRoZSBhcHBsaWNhdGlvbiB0aGF0IHVzZXMgdGhpcyBleHRlbnNpb25cclxuICAgICAgICBzdWNoIGFzIE5ld3QuIFRoaXMgaXMgaW1wb3J0YW50IHNpbmNlIGhhdmluZyBkaWZmZXJlbnQgc3RhZ2VzIGNhdXNlcyB3ZWlyZCBiZWhhdmlvclxyXG4gICAgICAgIG9uIG90aGVyIGV4dGVuc2lvbnMgdGhhdCBhbHNvIHVzZSBLb252YSwgbGlrZSBub3QgbGlzdGVuaW5nIHRvIG1vdXNlIGNsaWNrcyBhbmQgc3VjaC5cclxuICAgICAgICBJZiB5b3UgYXJlIHNvbWVvbmUgdGhhdCBpcyBjcmVhdGluZyBhbiBleHRlbnNpb24gdGhhdCB1c2VzIEtvbnZhIGluIHRoZSBmdXR1cmUsIHlvdSBuZWVkIHRvXHJcbiAgICAgICAgYmUgY2FyZWZ1bCBhYm91dCBob3cgZXZlbnRzIHJlZ2lzdGVyLiBJZiB5b3UgdXNlIGEgZGlmZmVyZW50IHN0YWdlIGFsbW9zdCBjZXJ0YWlubHkgb25lXHJcbiAgICAgICAgb3IgYm90aCBvZiB0aGUgZXh0ZW5zaW9ucyB0aGF0IHVzZSB0aGUgc3RhZ2UgY3JlYXRlZCBiZWxvdyB3aWxsIGJyZWFrLlxyXG4gICAgICAqLyBcclxuICAgICAgdmFyIHN0YWdlO1xyXG4gICAgICBpZiAoS29udmEuc3RhZ2VzLmxlbmd0aCA8IDEpIHtcclxuICAgICAgICBzdGFnZSA9IG5ldyBLb252YS5TdGFnZSh7XHJcbiAgICAgICAgICBpZDogJ25vZGUtZWRnZS1lZGl0aW5nLXN0YWdlJyxcclxuICAgICAgICAgIGNvbnRhaW5lcjogY2FudmFzRWxlbWVudElkLCAgIC8vIGlkIG9mIGNvbnRhaW5lciA8ZGl2PlxyXG4gICAgICAgICAgd2lkdGg6ICRjb250YWluZXIud2lkdGgoKSxcclxuICAgICAgICAgIGhlaWdodDogJGNvbnRhaW5lci5oZWlnaHQoKVxyXG4gICAgICAgIH0pO1xyXG4gICAgICB9XHJcbiAgICAgIGVsc2Uge1xyXG4gICAgICAgIHN0YWdlID0gS29udmEuc3RhZ2VzWzBdO1xyXG4gICAgICB9XHJcbiAgICAgIFxyXG4gICAgICB2YXIgY2FudmFzO1xyXG4gICAgICBpZiAoc3RhZ2UuZ2V0Q2hpbGRyZW4oKS5sZW5ndGggPCAxKSB7XHJcbiAgICAgICAgY2FudmFzID0gbmV3IEtvbnZhLkxheWVyKCk7XHJcbiAgICAgICAgc3RhZ2UuYWRkKGNhbnZhcyk7XHJcbiAgICAgIH1cclxuICAgICAgZWxzZSB7XHJcbiAgICAgICAgY2FudmFzID0gc3RhZ2UuZ2V0Q2hpbGRyZW4oKVswXTtcclxuICAgICAgfSAgXHJcbiAgICAgIFxyXG4gICAgICB2YXIgYW5jaG9yTWFuYWdlciA9IHtcclxuICAgICAgICBlZGdlOiB1bmRlZmluZWQsXHJcbiAgICAgICAgZWRnZVR5cGU6ICdpbmNvbmNsdXNpdmUnLFxyXG4gICAgICAgIGFuY2hvcnM6IFtdLFxyXG4gICAgICAgIC8vIHJlbWVtYmVycyB0aGUgdG91Y2hlZCBhbmNob3IgdG8gYXZvaWQgY2xlYXJpbmcgaXQgd2hlbiBkcmFnZ2luZyBoYXBwZW5zXHJcbiAgICAgICAgdG91Y2hlZEFuY2hvcjogdW5kZWZpbmVkLFxyXG4gICAgICAgIC8vIHJlbWVtYmVycyB0aGUgaW5kZXggb2YgdGhlIG1vdmluZyBhbmNob3JcclxuICAgICAgICB0b3VjaGVkQW5jaG9ySW5kZXg6IHVuZGVmaW5lZCxcclxuICAgICAgICBiaW5kTGlzdGVuZXJzOiBmdW5jdGlvbihhbmNob3Ipe1xyXG4gICAgICAgICAgYW5jaG9yLm9uKFwibW91c2Vkb3duIHRvdWNoc3RhcnRcIiwgdGhpcy5lTW91c2VEb3duKTtcclxuICAgICAgICB9LFxyXG4gICAgICAgIHVuYmluZExpc3RlbmVyczogZnVuY3Rpb24oYW5jaG9yKXtcclxuICAgICAgICAgIGFuY2hvci5vZmYoXCJtb3VzZWRvd24gdG91Y2hzdGFydFwiLCB0aGlzLmVNb3VzZURvd24pO1xyXG4gICAgICAgIH0sXHJcbiAgICAgICAgLy8gZ2V0cyB0cmlnZ2VyIG9uIGNsaWNraW5nIG9uIGNvbnRleHQgbWVudXMsIHdoaWxlIGN5IGxpc3RlbmVycyBkb24ndCBnZXQgdHJpZ2dlcmVkXHJcbiAgICAgICAgLy8gaXQgY2FuIGNhdXNlIHdlaXJkIGJlaGF2aW91ciBpZiBub3QgYXdhcmUgb2YgdGhpc1xyXG4gICAgICAgIGVNb3VzZURvd246IGZ1bmN0aW9uKGV2ZW50KXtcclxuICAgICAgICAgIC8vIGFuY2hvck1hbmFnZXIuZWRnZS51bnNlbGVjdCgpIHdvbid0IHdvcmsgc29tZXRpbWVzIGlmIHRoaXMgd2Fzbid0IGhlcmVcclxuICAgICAgICAgIGN5LmF1dG91bnNlbGVjdGlmeShmYWxzZSk7XHJcblxyXG4gICAgICAgICAgLy8gZU1vdXNlRG93bihzZXQpIC0+IHRhcGRyYWcodXNlZCkgLT4gZU1vdXNlVXAocmVzZXQpXHJcbiAgICAgICAgICBhbmNob3JUb3VjaGVkID0gdHJ1ZTtcclxuICAgICAgICAgIGFuY2hvck1hbmFnZXIudG91Y2hlZEFuY2hvciA9IGV2ZW50LnRhcmdldDtcclxuICAgICAgICAgIG1vdXNlT3V0ID0gZmFsc2U7XHJcbiAgICAgICAgICBhbmNob3JNYW5hZ2VyLmVkZ2UudW5zZWxlY3QoKTtcclxuXHJcbiAgICAgICAgICAvLyByZW1lbWJlciBzdGF0ZSBiZWZvcmUgY2hhbmdpbmdcclxuICAgICAgICAgIHZhciB3ZWlnaHRTdHIgPSBhbmNob3JQb2ludFV0aWxpdGllcy5zeW50YXhbYW5jaG9yTWFuYWdlci5lZGdlVHlwZV1bJ3dlaWdodCddO1xyXG4gICAgICAgICAgdmFyIGRpc3RhbmNlU3RyID0gYW5jaG9yUG9pbnRVdGlsaXRpZXMuc3ludGF4W2FuY2hvck1hbmFnZXIuZWRnZVR5cGVdWydkaXN0YW5jZSddO1xyXG5cclxuICAgICAgICAgIHZhciBlZGdlID0gYW5jaG9yTWFuYWdlci5lZGdlO1xyXG4gICAgICAgICAgbW92ZUFuY2hvclBhcmFtID0ge1xyXG4gICAgICAgICAgICBlZGdlOiBlZGdlLFxyXG4gICAgICAgICAgICB0eXBlOiBhbmNob3JNYW5hZ2VyLmVkZ2VUeXBlLFxyXG4gICAgICAgICAgICB3ZWlnaHRzOiBlZGdlLmRhdGEod2VpZ2h0U3RyKSA/IFtdLmNvbmNhdChlZGdlLmRhdGEod2VpZ2h0U3RyKSkgOiBbXSxcclxuICAgICAgICAgICAgZGlzdGFuY2VzOiBlZGdlLmRhdGEoZGlzdGFuY2VTdHIpID8gW10uY29uY2F0KGVkZ2UuZGF0YShkaXN0YW5jZVN0cikpIDogW11cclxuICAgICAgICAgIH07XHJcblxyXG4gICAgICAgICAgdHVybk9mZkFjdGl2ZUJnQ29sb3IoKTtcclxuICAgICAgICAgIGRpc2FibGVHZXN0dXJlcygpO1xyXG4gICAgICAgICAgXHJcbiAgICAgICAgICBjeS5hdXRvdW5ncmFiaWZ5KHRydWUpO1xyXG5cclxuICAgICAgICAgIGNhbnZhcy5nZXRTdGFnZSgpLm9uKFwiY29udGVudFRvdWNoZW5kIGNvbnRlbnRNb3VzZXVwXCIsIGFuY2hvck1hbmFnZXIuZU1vdXNlVXApO1xyXG4gICAgICAgICAgY2FudmFzLmdldFN0YWdlKCkub24oXCJjb250ZW50TW91c2VvdXRcIiwgYW5jaG9yTWFuYWdlci5lTW91c2VPdXQpO1xyXG4gICAgICAgIH0sXHJcbiAgICAgICAgLy8gZ2V0cyBjYWxsZWQgYmVmb3JlIGN5Lm9uKCd0YXBlbmQnKVxyXG4gICAgICAgIGVNb3VzZVVwOiBmdW5jdGlvbihldmVudCl7XHJcbiAgICAgICAgICAvLyB3b24ndCBiZSBjYWxsZWQgaWYgdGhlIG1vdXNlIGlzIHJlbGVhc2VkIG91dCBvZiBzY3JlZW5cclxuICAgICAgICAgIGFuY2hvclRvdWNoZWQgPSBmYWxzZTtcclxuICAgICAgICAgIGFuY2hvck1hbmFnZXIudG91Y2hlZEFuY2hvciA9IHVuZGVmaW5lZDtcclxuICAgICAgICAgIG1vdXNlT3V0ID0gZmFsc2U7XHJcbiAgICAgICAgICBhbmNob3JNYW5hZ2VyLmVkZ2Uuc2VsZWN0KCk7XHJcbiAgICAgICAgICBcclxuICAgICAgICAgIHJlc2V0QWN0aXZlQmdDb2xvcigpO1xyXG4gICAgICAgICAgcmVzZXRHZXN0dXJlcygpO1xyXG4gICAgICAgICAgXHJcbiAgICAgICAgICAvKiBcclxuICAgICAgICAgICAqIElNUE9SVEFOVFxyXG4gICAgICAgICAgICogQW55IHByb2dyYW1tYXRpYyBjYWxscyB0byAuc2VsZWN0KCksIC51bnNlbGVjdCgpIGFmdGVyIHRoaXMgc3RhdGVtZW50IGFyZSBpZ25vcmVkXHJcbiAgICAgICAgICAgKiB1bnRpbCBjeS5hdXRvdW5zZWxlY3RpZnkoZmFsc2UpIGlzIGNhbGxlZCBpbiBvbmUgb2YgdGhlIHByZXZpb3VzOlxyXG4gICAgICAgICAgICogXHJcbiAgICAgICAgICAgKiBjeS5vbigndGFwc3RhcnQnKVxyXG4gICAgICAgICAgICogYW5jaG9yLm9uKCdtb3VzZWRvd24gdG91Y2hzdGFydCcpXHJcbiAgICAgICAgICAgKiBkb2N1bWVudC5vbigna2V5ZG93bicpXHJcbiAgICAgICAgICAgKiBjeS5vbigndGFwZHJhcCcpXHJcbiAgICAgICAgICAgKiBcclxuICAgICAgICAgICAqIERvZXNuJ3QgYWZmZWN0IFVYLCBidXQgbWF5IGNhdXNlIGNvbmZ1c2luZyBiZWhhdmlvdXIgaWYgbm90IGF3YXJlIG9mIHRoaXMgd2hlbiBjb2RpbmdcclxuICAgICAgICAgICAqIFxyXG4gICAgICAgICAgICogV2h5IGlzIHRoaXMgaGVyZT9cclxuICAgICAgICAgICAqIFRoaXMgaXMgaW1wb3J0YW50IHRvIGtlZXAgZWRnZXMgZnJvbSBiZWluZyBhdXRvIGRlc2VsZWN0ZWQgZnJvbSB3b3JraW5nXHJcbiAgICAgICAgICAgKiB3aXRoIGFuY2hvcnMgb3V0IG9mIHRoZSBlZGdlIGJvZHkgKGZvciB1bmJ1bmRsZWQgYmV6aWVyLCB0ZWNobmljYWxseSBub3QgbmVjZXNzZXJ5IGZvciBzZWdlbWVudHMpLlxyXG4gICAgICAgICAgICogXHJcbiAgICAgICAgICAgKiBUaGVzZSBpcyBhbnRoZXIgY3kuYXV0b3NlbGVjdGlmeSh0cnVlKSBpbiBjeS5vbigndGFwZW5kJykgXHJcbiAgICAgICAgICAgKiBcclxuICAgICAgICAgICovIFxyXG4gICAgICAgICAgY3kuYXV0b3Vuc2VsZWN0aWZ5KHRydWUpO1xyXG4gICAgICAgICAgY3kuYXV0b3VuZ3JhYmlmeShmYWxzZSk7XHJcblxyXG4gICAgICAgICAgY2FudmFzLmdldFN0YWdlKCkub2ZmKFwiY29udGVudFRvdWNoZW5kIGNvbnRlbnRNb3VzZXVwXCIsIGFuY2hvck1hbmFnZXIuZU1vdXNlVXApO1xyXG4gICAgICAgICAgY2FudmFzLmdldFN0YWdlKCkub2ZmKFwiY29udGVudE1vdXNlb3V0XCIsIGFuY2hvck1hbmFnZXIuZU1vdXNlT3V0KTtcclxuICAgICAgICB9LFxyXG4gICAgICAgIC8vIGhhbmRsZSBtb3VzZSBnb2luZyBvdXQgb2YgY2FudmFzIFxyXG4gICAgICAgIGVNb3VzZU91dDogZnVuY3Rpb24gKGV2ZW50KXtcclxuICAgICAgICAgIG1vdXNlT3V0ID0gdHJ1ZTtcclxuICAgICAgICB9LFxyXG4gICAgICAgIGNsZWFyQW5jaG9yc0V4Y2VwdDogZnVuY3Rpb24oZG9udENsZWFuID0gdW5kZWZpbmVkKXtcclxuICAgICAgICAgIHZhciBleGNlcHRpb25BcHBsaWVzID0gZmFsc2U7XHJcblxyXG4gICAgICAgICAgdGhpcy5hbmNob3JzLmZvckVhY2goKGFuY2hvciwgaW5kZXgpID0+IHtcclxuICAgICAgICAgICAgaWYoZG9udENsZWFuICYmIGFuY2hvciA9PT0gZG9udENsZWFuKXtcclxuICAgICAgICAgICAgICBleGNlcHRpb25BcHBsaWVzID0gdHJ1ZTsgLy8gdGhlIGRvbnRDbGVhbiBhbmNob3IgaXMgbm90IGNsZWFyZWRcclxuICAgICAgICAgICAgICByZXR1cm47XHJcbiAgICAgICAgICAgIH1cclxuXHJcbiAgICAgICAgICAgIHRoaXMudW5iaW5kTGlzdGVuZXJzKGFuY2hvcik7XHJcbiAgICAgICAgICAgIGFuY2hvci5kZXN0cm95KCk7XHJcbiAgICAgICAgICB9KTtcclxuXHJcbiAgICAgICAgICBpZihleGNlcHRpb25BcHBsaWVzKXtcclxuICAgICAgICAgICAgdGhpcy5hbmNob3JzID0gW2RvbnRDbGVhbl07XHJcbiAgICAgICAgICB9XHJcbiAgICAgICAgICBlbHNlIHtcclxuICAgICAgICAgICAgdGhpcy5hbmNob3JzID0gW107XHJcbiAgICAgICAgICAgIHRoaXMuZWRnZSA9IHVuZGVmaW5lZDtcclxuICAgICAgICAgICAgdGhpcy5lZGdlVHlwZSA9ICdpbmNvbmNsdXNpdmUnO1xyXG4gICAgICAgICAgfVxyXG4gICAgICAgIH0sXHJcbiAgICAgICAgLy8gcmVuZGVyIHRoZSBiZW5kIGFuZCBjb250cm9sIHNoYXBlcyBvZiB0aGUgZ2l2ZW4gZWRnZVxyXG4gICAgICAgIHJlbmRlckFuY2hvclNoYXBlczogZnVuY3Rpb24oZWRnZSkge1xyXG4gICAgICAgICAgdGhpcy5lZGdlID0gZWRnZTtcclxuICAgICAgICAgIHRoaXMuZWRnZVR5cGUgPSBhbmNob3JQb2ludFV0aWxpdGllcy5nZXRFZGdlVHlwZShlZGdlKTtcclxuXHJcbiAgICAgICAgICBpZighZWRnZS5oYXNDbGFzcygnZWRnZWJlbmRlZGl0aW5nLWhhc2JlbmRwb2ludHMnKSAmJlxyXG4gICAgICAgICAgICAgICFlZGdlLmhhc0NsYXNzKCdlZGdlY29udHJvbGVkaXRpbmctaGFzY29udHJvbHBvaW50cycpKSB7XHJcbiAgICAgICAgICAgIHJldHVybjtcclxuICAgICAgICAgIH1cclxuICAgICAgICAgIFxyXG4gICAgICAgICAgdmFyIGFuY2hvckxpc3QgPSBhbmNob3JQb2ludFV0aWxpdGllcy5nZXRBbmNob3JzQXNBcnJheShlZGdlKTsvL2VkZ2UuX3ByaXZhdGUucmRhdGEuc2VncHRzO1xyXG4gICAgICAgICAgdmFyIGxlbmd0aCA9IGdldEFuY2hvclNoYXBlc0xlbmd0aChlZGdlKSAqIDAuNjU7XHJcbiAgICAgICAgICBcclxuICAgICAgICAgIHZhciBzcmNQb3MgPSBlZGdlLnNvdXJjZSgpLnBvc2l0aW9uKCk7XHJcbiAgICAgICAgICB2YXIgdGd0UG9zID0gZWRnZS50YXJnZXQoKS5wb3NpdGlvbigpO1xyXG5cclxuICAgICAgICAgIGZvcih2YXIgaSA9IDA7IGFuY2hvckxpc3QgJiYgaSA8IGFuY2hvckxpc3QubGVuZ3RoOyBpID0gaSArIDIpe1xyXG4gICAgICAgICAgICB2YXIgYW5jaG9yWCA9IGFuY2hvckxpc3RbaV07XHJcbiAgICAgICAgICAgIHZhciBhbmNob3JZID0gYW5jaG9yTGlzdFtpICsgMV07XHJcblxyXG4gICAgICAgICAgICB0aGlzLnJlbmRlckFuY2hvclNoYXBlKGFuY2hvclgsIGFuY2hvclksIGxlbmd0aCk7XHJcbiAgICAgICAgICB9XHJcblxyXG4gICAgICAgICAgY2FudmFzLmRyYXcoKTtcclxuICAgICAgICB9LFxyXG4gICAgICAgIC8vIHJlbmRlciBhIGFuY2hvciBzaGFwZSB3aXRoIHRoZSBnaXZlbiBwYXJhbWV0ZXJzXHJcbiAgICAgICAgcmVuZGVyQW5jaG9yU2hhcGU6IGZ1bmN0aW9uKGFuY2hvclgsIGFuY2hvclksIGxlbmd0aCkge1xyXG4gICAgICAgICAgLy8gZ2V0IHRoZSB0b3AgbGVmdCBjb29yZGluYXRlc1xyXG4gICAgICAgICAgdmFyIHRvcExlZnRYID0gYW5jaG9yWCAtIGxlbmd0aCAvIDI7XHJcbiAgICAgICAgICB2YXIgdG9wTGVmdFkgPSBhbmNob3JZIC0gbGVuZ3RoIC8gMjtcclxuICAgICAgICAgIFxyXG4gICAgICAgICAgLy8gY29udmVydCB0byByZW5kZXJlZCBwYXJhbWV0ZXJzXHJcbiAgICAgICAgICB2YXIgcmVuZGVyZWRUb3BMZWZ0UG9zID0gY29udmVydFRvUmVuZGVyZWRQb3NpdGlvbih7eDogdG9wTGVmdFgsIHk6IHRvcExlZnRZfSk7XHJcbiAgICAgICAgICBsZW5ndGggKj0gY3kuem9vbSgpO1xyXG4gICAgICAgICAgXHJcbiAgICAgICAgICB2YXIgbmV3QW5jaG9yID0gbmV3IEtvbnZhLlJlY3Qoe1xyXG4gICAgICAgICAgICB4OiByZW5kZXJlZFRvcExlZnRQb3MueCxcclxuICAgICAgICAgICAgeTogcmVuZGVyZWRUb3BMZWZ0UG9zLnksXHJcbiAgICAgICAgICAgIHdpZHRoOiBsZW5ndGgsXHJcbiAgICAgICAgICAgIGhlaWdodDogbGVuZ3RoLFxyXG4gICAgICAgICAgICBmaWxsOiAnYmxhY2snLFxyXG4gICAgICAgICAgICBzdHJva2VXaWR0aDogMCxcclxuICAgICAgICAgICAgZHJhZ2dhYmxlOiB0cnVlXHJcbiAgICAgICAgICB9KTtcclxuXHJcbiAgICAgICAgICB0aGlzLmFuY2hvcnMucHVzaChuZXdBbmNob3IpO1xyXG4gICAgICAgICAgdGhpcy5iaW5kTGlzdGVuZXJzKG5ld0FuY2hvcik7XHJcbiAgICAgICAgICBjYW52YXMuYWRkKG5ld0FuY2hvcik7XHJcbiAgICAgICAgfVxyXG4gICAgICB9O1xyXG5cclxuICAgICAgdmFyIGN4dEFkZEJlbmRGY24gPSBmdW5jdGlvbihldmVudCl7XHJcbiAgICAgICAgY3h0QWRkQW5jaG9yRmNuKGV2ZW50LCAnYmVuZCcpO1xyXG4gICAgICB9XHJcblxyXG4gICAgICB2YXIgY3h0QWRkQ29udHJvbEZjbiA9IGZ1bmN0aW9uKGV2ZW50KSB7XHJcbiAgICAgICAgY3h0QWRkQW5jaG9yRmNuKGV2ZW50LCAnY29udHJvbCcpO1xyXG4gICAgICB9XHJcblxyXG4gICAgICB2YXIgY3h0QWRkQW5jaG9yRmNuID0gZnVuY3Rpb24gKGV2ZW50LCBhbmNob3JUeXBlKSB7XHJcbiAgICAgICAgdmFyIGVkZ2UgPSBldmVudC50YXJnZXQgfHwgZXZlbnQuY3lUYXJnZXQ7XHJcbiAgICAgICAgaWYoIWFuY2hvclBvaW50VXRpbGl0aWVzLmlzSWdub3JlZEVkZ2UoZWRnZSkpIHtcclxuXHJcbiAgICAgICAgICB2YXIgdHlwZSA9IGFuY2hvclBvaW50VXRpbGl0aWVzLmdldEVkZ2VUeXBlKGVkZ2UpO1xyXG4gICAgICAgICAgdmFyIHdlaWdodHMsIGRpc3RhbmNlcywgd2VpZ2h0U3RyLCBkaXN0YW5jZVN0cjtcclxuXHJcbiAgICAgICAgICBpZih0eXBlID09PSAnaW5jb25jbHVzaXZlJyl7XHJcbiAgICAgICAgICAgIHdlaWdodHMgPSBbXTtcclxuICAgICAgICAgICAgZGlzdGFuY2VzID0gW107XHJcbiAgICAgICAgICB9XHJcbiAgICAgICAgICBlbHNle1xyXG4gICAgICAgICAgICB3ZWlnaHRTdHIgPSBhbmNob3JQb2ludFV0aWxpdGllcy5zeW50YXhbdHlwZV1bJ3dlaWdodCddO1xyXG4gICAgICAgICAgICBkaXN0YW5jZVN0ciA9IGFuY2hvclBvaW50VXRpbGl0aWVzLnN5bnRheFt0eXBlXVsnZGlzdGFuY2UnXTtcclxuXHJcbiAgICAgICAgICAgIHdlaWdodHMgPSBlZGdlLmRhdGEod2VpZ2h0U3RyKSA/IFtdLmNvbmNhdChlZGdlLmRhdGEod2VpZ2h0U3RyKSkgOiBlZGdlLmRhdGEod2VpZ2h0U3RyKTtcclxuICAgICAgICAgICAgZGlzdGFuY2VzID0gZWRnZS5kYXRhKGRpc3RhbmNlU3RyKSA/IFtdLmNvbmNhdChlZGdlLmRhdGEoZGlzdGFuY2VTdHIpKSA6IGVkZ2UuZGF0YShkaXN0YW5jZVN0cik7XHJcbiAgICAgICAgICB9XHJcblxyXG4gICAgICAgICAgdmFyIHBhcmFtID0ge1xyXG4gICAgICAgICAgICBlZGdlOiBlZGdlLFxyXG4gICAgICAgICAgICB0eXBlOiB0eXBlLFxyXG4gICAgICAgICAgICB3ZWlnaHRzOiB3ZWlnaHRzLFxyXG4gICAgICAgICAgICBkaXN0YW5jZXM6IGRpc3RhbmNlc1xyXG4gICAgICAgICAgfTtcclxuXHJcbiAgICAgICAgICAvLyB0aGUgdW5kZWZpbmVkIGdvIGZvciBlZGdlIGFuZCBuZXdBbmNob3JQb2ludCBwYXJhbWV0ZXJzXHJcbiAgICAgICAgICBhbmNob3JQb2ludFV0aWxpdGllcy5hZGRBbmNob3JQb2ludCh1bmRlZmluZWQsIHVuZGVmaW5lZCwgYW5jaG9yVHlwZSk7XHJcblxyXG4gICAgICAgICAgaWYgKG9wdGlvbnMoKS51bmRvYWJsZSkge1xyXG4gICAgICAgICAgICBjeS51bmRvUmVkbygpLmRvKCdjaGFuZ2VBbmNob3JQb2ludHMnLCBwYXJhbSk7XHJcbiAgICAgICAgICB9XHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICByZWZyZXNoRHJhd3MoKTtcclxuICAgICAgICBlZGdlLnNlbGVjdCgpO1xyXG4gICAgICB9O1xyXG5cclxuICAgICAgdmFyIGN4dFJlbW92ZUFuY2hvckZjbiA9IGZ1bmN0aW9uIChldmVudCkge1xyXG4gICAgICAgIHZhciBlZGdlID0gYW5jaG9yTWFuYWdlci5lZGdlO1xyXG4gICAgICAgIHZhciB0eXBlID0gYW5jaG9yUG9pbnRVdGlsaXRpZXMuZ2V0RWRnZVR5cGUoZWRnZSk7XHJcblxyXG4gICAgICAgIGlmKGFuY2hvclBvaW50VXRpbGl0aWVzLmVkZ2VUeXBlSW5jb25jbHVzaXZlU2hvdWxkbnRIYXBwZW4odHlwZSwgXCJVaVV0aWxpdGllcy5qcywgY3h0UmVtb3ZlQW5jaG9yRmNuXCIpKXtcclxuICAgICAgICAgIHJldHVybjtcclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIHZhciBwYXJhbSA9IHtcclxuICAgICAgICAgIGVkZ2U6IGVkZ2UsXHJcbiAgICAgICAgICB0eXBlOiB0eXBlLFxyXG4gICAgICAgICAgd2VpZ2h0czogW10uY29uY2F0KGVkZ2UuZGF0YShhbmNob3JQb2ludFV0aWxpdGllcy5zeW50YXhbdHlwZV1bJ3dlaWdodCddKSksXHJcbiAgICAgICAgICBkaXN0YW5jZXM6IFtdLmNvbmNhdChlZGdlLmRhdGEoYW5jaG9yUG9pbnRVdGlsaXRpZXMuc3ludGF4W3R5cGVdWydkaXN0YW5jZSddKSlcclxuICAgICAgICB9O1xyXG5cclxuICAgICAgICBhbmNob3JQb2ludFV0aWxpdGllcy5yZW1vdmVBbmNob3IoKTtcclxuICAgICAgICBcclxuICAgICAgICBpZihvcHRpb25zKCkudW5kb2FibGUpIHtcclxuICAgICAgICAgIGN5LnVuZG9SZWRvKCkuZG8oJ2NoYW5nZUFuY2hvclBvaW50cycsIHBhcmFtKTtcclxuICAgICAgICB9XHJcbiAgICAgICAgXHJcbiAgICAgICAgc2V0VGltZW91dChmdW5jdGlvbigpe3JlZnJlc2hEcmF3cygpO2VkZ2Uuc2VsZWN0KCk7fSwgNTApIDtcclxuXHJcbiAgICAgIH07XHJcblxyXG4gICAgICB2YXIgY3h0UmVtb3ZlQWxsQW5jaG9yc0ZjbiA9IGZ1bmN0aW9uIChldmVudCkge1xyXG4gICAgICAgIHZhciBlZGdlID0gYW5jaG9yTWFuYWdlci5lZGdlO1xyXG4gICAgICAgIHZhciB0eXBlID0gYW5jaG9yUG9pbnRVdGlsaXRpZXMuZ2V0RWRnZVR5cGUoZWRnZSk7XHJcbiAgICAgICAgdmFyIHBhcmFtID0ge1xyXG4gICAgICAgICAgZWRnZTogZWRnZSxcclxuICAgICAgICAgIHR5cGU6IHR5cGUsXHJcbiAgICAgICAgICB3ZWlnaHRzOiBbXS5jb25jYXQoZWRnZS5kYXRhKGFuY2hvclBvaW50VXRpbGl0aWVzLnN5bnRheFt0eXBlXVsnd2VpZ2h0J10pKSxcclxuICAgICAgICAgIGRpc3RhbmNlczogW10uY29uY2F0KGVkZ2UuZGF0YShhbmNob3JQb2ludFV0aWxpdGllcy5zeW50YXhbdHlwZV1bJ2Rpc3RhbmNlJ10pKVxyXG4gICAgICAgIH07XHJcbiAgICAgICAgXHJcbiAgICAgICAgYW5jaG9yUG9pbnRVdGlsaXRpZXMucmVtb3ZlQWxsQW5jaG9ycygpO1xyXG5cclxuICAgICAgICBpZiAob3B0aW9ucygpLnVuZG9hYmxlKSB7XHJcbiAgICAgICAgICBjeS51bmRvUmVkbygpLmRvKCdjaGFuZ2VBbmNob3JQb2ludHMnLCBwYXJhbSk7XHJcbiAgICAgICAgfVxyXG4gICAgICAgIHNldFRpbWVvdXQoZnVuY3Rpb24oKXtyZWZyZXNoRHJhd3MoKTtlZGdlLnNlbGVjdCgpO30sIDUwKTtcclxuICAgICAgfVxyXG4gICAgICBcclxuICAgICAgLy8gZnVuY3Rpb24gdG8gcmVjb25uZWN0IGVkZ2VcclxuICAgICAgdmFyIGhhbmRsZVJlY29ubmVjdEVkZ2UgPSBvcHRzLmhhbmRsZVJlY29ubmVjdEVkZ2U7XHJcbiAgICAgIC8vIGZ1bmN0aW9uIHRvIHZhbGlkYXRlIGVkZ2Ugc291cmNlIGFuZCB0YXJnZXQgb24gcmVjb25uZWN0aW9uXHJcbiAgICAgIHZhciB2YWxpZGF0ZUVkZ2UgPSBvcHRzLnZhbGlkYXRlRWRnZTsgXHJcbiAgICAgIC8vIGZ1bmN0aW9uIHRvIGJlIGNhbGxlZCBvbiBpbnZhbGlkIGVkZ2UgcmVjb25uZWN0aW9uXHJcbiAgICAgIHZhciBhY3RPblVuc3VjY2Vzc2Z1bFJlY29ubmVjdGlvbiA9IG9wdHMuYWN0T25VbnN1Y2Nlc3NmdWxSZWNvbm5lY3Rpb247XHJcbiAgICAgIFxyXG4gICAgICB2YXIgbWVudUl0ZW1zID0gW1xyXG4gICAgICAgIHtcclxuICAgICAgICAgIGlkOiBhZGRCZW5kUG9pbnRDeHRNZW51SWQsXHJcbiAgICAgICAgICB0aXRsZTogb3B0cy5hZGRCZW5kTWVudUl0ZW1UaXRsZSxcclxuICAgICAgICAgIGNvbnRlbnQ6ICdBZGQgQmVuZCBQb2ludCcsXHJcbiAgICAgICAgICBzZWxlY3RvcjogJ2VkZ2UnLFxyXG4gICAgICAgICAgb25DbGlja0Z1bmN0aW9uOiBjeHRBZGRCZW5kRmNuXHJcbiAgICAgICAgfSxcclxuICAgICAgICB7XHJcbiAgICAgICAgICBpZDogcmVtb3ZlQmVuZFBvaW50Q3h0TWVudUlkLFxyXG4gICAgICAgICAgdGl0bGU6IG9wdHMucmVtb3ZlQmVuZE1lbnVJdGVtVGl0bGUsXHJcbiAgICAgICAgICBjb250ZW50OiAnUmVtb3ZlIEJlbmQgUG9pbnQnLFxyXG4gICAgICAgICAgc2VsZWN0b3I6ICdlZGdlJyxcclxuICAgICAgICAgIG9uQ2xpY2tGdW5jdGlvbjogY3h0UmVtb3ZlQW5jaG9yRmNuXHJcbiAgICAgICAgfSwgXHJcbiAgICAgICAge1xyXG4gICAgICAgICAgaWQ6IHJlbW92ZUFsbEJlbmRQb2ludEN0eE1lbnVJZCxcclxuICAgICAgICAgIHRpdGxlOiBvcHRzLnJlbW92ZUFsbEJlbmRNZW51SXRlbVRpdGxlLFxyXG4gICAgICAgICAgY29udGVudDogJ1JlbW92ZSBBbGwgQmVuZCBQb2ludHMnLFxyXG4gICAgICAgICAgc2VsZWN0b3I6IG9wdHMuZW5hYmxlTXVsdGlwbGVBbmNob3JSZW1vdmFsT3B0aW9uICYmICcuZWRnZWJlbmRlZGl0aW5nLWhhc211bHRpcGxlYmVuZHBvaW50cycsXHJcbiAgICAgICAgICBvbkNsaWNrRnVuY3Rpb246IGN4dFJlbW92ZUFsbEFuY2hvcnNGY25cclxuICAgICAgICB9LFxyXG4gICAgICAgIHtcclxuICAgICAgICAgIGlkOiBhZGRDb250cm9sUG9pbnRDeHRNZW51SWQsXHJcbiAgICAgICAgICB0aXRsZTogb3B0cy5hZGRDb250cm9sTWVudUl0ZW1UaXRsZSxcclxuICAgICAgICAgIGNvbnRlbnQ6ICdBZGQgQ29udHJvbCBQb2ludCcsXHJcbiAgICAgICAgICBzZWxlY3RvcjogJ2VkZ2UnLFxyXG4gICAgICAgICAgY29yZUFzV2VsbDogdHJ1ZSxcclxuICAgICAgICAgIG9uQ2xpY2tGdW5jdGlvbjogY3h0QWRkQ29udHJvbEZjblxyXG4gICAgICAgIH0sXHJcbiAgICAgICAge1xyXG4gICAgICAgICAgaWQ6IHJlbW92ZUNvbnRyb2xQb2ludEN4dE1lbnVJZCxcclxuICAgICAgICAgIHRpdGxlOiBvcHRzLnJlbW92ZUNvbnRyb2xNZW51SXRlbVRpdGxlLFxyXG4gICAgICAgICAgY29udGVudDogJ1JlbW92ZSBDb250cm9sIFBvaW50JyxcclxuICAgICAgICAgIHNlbGVjdG9yOiAnZWRnZScsXHJcbiAgICAgICAgICBjb3JlQXNXZWxsOiB0cnVlLFxyXG4gICAgICAgICAgb25DbGlja0Z1bmN0aW9uOiBjeHRSZW1vdmVBbmNob3JGY25cclxuICAgICAgICB9LCBcclxuICAgICAgICB7XHJcbiAgICAgICAgICBpZDogcmVtb3ZlQWxsQ29udHJvbFBvaW50Q3R4TWVudUlkLFxyXG4gICAgICAgICAgdGl0bGU6IG9wdHMucmVtb3ZlQWxsQ29udHJvbE1lbnVJdGVtVGl0bGUsXHJcbiAgICAgICAgICBjb250ZW50OiAnUmVtb3ZlIEFsbCBDb250cm9sIFBvaW50cycsXHJcbiAgICAgICAgICBzZWxlY3Rvcjogb3B0cy5lbmFibGVNdWx0aXBsZUFuY2hvclJlbW92YWxPcHRpb24gJiYgJy5lZGdlY29udHJvbGVkaXRpbmctaGFzbXVsdGlwbGVjb250cm9scG9pbnRzJyxcclxuICAgICAgICAgIG9uQ2xpY2tGdW5jdGlvbjogY3h0UmVtb3ZlQWxsQW5jaG9yc0ZjblxyXG4gICAgICAgIH0sXHJcbiAgICAgIF07XHJcbiAgICAgIFxyXG4gICAgICBpZihjeS5jb250ZXh0TWVudXMpIHtcclxuICAgICAgICB2YXIgbWVudXMgPSBjeS5jb250ZXh0TWVudXMoJ2dldCcpO1xyXG4gICAgICAgIC8vIElmIGNvbnRleHQgbWVudXMgaXMgYWN0aXZlIGp1c3QgYXBwZW5kIG1lbnUgaXRlbXMgZWxzZSBhY3RpdmF0ZSB0aGUgZXh0ZW5zaW9uXHJcbiAgICAgICAgLy8gd2l0aCBpbml0aWFsIG1lbnUgaXRlbXNcclxuICAgICAgICBpZiAobWVudXMuaXNBY3RpdmUoKSkge1xyXG4gICAgICAgICAgbWVudXMuYXBwZW5kTWVudUl0ZW1zKG1lbnVJdGVtcyk7XHJcbiAgICAgICAgfVxyXG4gICAgICAgIGVsc2Uge1xyXG4gICAgICAgICAgY3kuY29udGV4dE1lbnVzKHtcclxuICAgICAgICAgICAgbWVudUl0ZW1zOiBtZW51SXRlbXNcclxuICAgICAgICAgIH0pO1xyXG4gICAgICAgIH1cclxuICAgICAgfVxyXG4gICAgICBcclxuICAgICAgdmFyIF9zaXplQ2FudmFzID0gZGVib3VuY2UoZnVuY3Rpb24gKCkge1xyXG4gICAgICAgICRjYW52YXNFbGVtZW50XHJcbiAgICAgICAgICAuYXR0cignaGVpZ2h0JywgJGNvbnRhaW5lci5oZWlnaHQoKSlcclxuICAgICAgICAgIC5hdHRyKCd3aWR0aCcsICRjb250YWluZXIud2lkdGgoKSlcclxuICAgICAgICAgIC5jc3Moe1xyXG4gICAgICAgICAgICAncG9zaXRpb24nOiAnYWJzb2x1dGUnLFxyXG4gICAgICAgICAgICAndG9wJzogMCxcclxuICAgICAgICAgICAgJ2xlZnQnOiAwLFxyXG4gICAgICAgICAgICAnei1pbmRleCc6IG9wdGlvbnMoKS56SW5kZXhcclxuICAgICAgICAgIH0pXHJcbiAgICAgICAgO1xyXG5cclxuICAgICAgICBzZXRUaW1lb3V0KGZ1bmN0aW9uICgpIHtcclxuICAgICAgICAgIHZhciBjYW52YXNCYiA9ICRjYW52YXNFbGVtZW50Lm9mZnNldCgpO1xyXG4gICAgICAgICAgdmFyIGNvbnRhaW5lckJiID0gJGNvbnRhaW5lci5vZmZzZXQoKTtcclxuXHJcbiAgICAgICAgICAkY2FudmFzRWxlbWVudFxyXG4gICAgICAgICAgICAuY3NzKHtcclxuICAgICAgICAgICAgICAndG9wJzogLShjYW52YXNCYi50b3AgLSBjb250YWluZXJCYi50b3ApLFxyXG4gICAgICAgICAgICAgICdsZWZ0JzogLShjYW52YXNCYi5sZWZ0IC0gY29udGFpbmVyQmIubGVmdClcclxuICAgICAgICAgICAgfSlcclxuICAgICAgICAgIDtcclxuXHJcbiAgICAgICAgICBjYW52YXMuZ2V0U3RhZ2UoKS5zZXRXaWR0aCgkY29udGFpbmVyLndpZHRoKCkpO1xyXG4gICAgICAgICAgY2FudmFzLmdldFN0YWdlKCkuc2V0SGVpZ2h0KCRjb250YWluZXIuaGVpZ2h0KCkpO1xyXG5cclxuICAgICAgICAgIC8vIHJlZHJhdyBvbiBjYW52YXMgcmVzaXplXHJcbiAgICAgICAgICBpZihjeSl7XHJcbiAgICAgICAgICAgIHJlZnJlc2hEcmF3cygpO1xyXG4gICAgICAgICAgfVxyXG4gICAgICAgIH0sIDApO1xyXG5cclxuICAgICAgfSwgMjUwKTtcclxuXHJcbiAgICAgIGZ1bmN0aW9uIHNpemVDYW52YXMoKSB7XHJcbiAgICAgICAgX3NpemVDYW52YXMoKTtcclxuICAgICAgfVxyXG5cclxuICAgICAgc2l6ZUNhbnZhcygpO1xyXG5cclxuICAgICAgJCh3aW5kb3cpLmJpbmQoJ3Jlc2l6ZScsIGZ1bmN0aW9uICgpIHtcclxuICAgICAgICBzaXplQ2FudmFzKCk7XHJcbiAgICAgIH0pO1xyXG4gICAgICBcclxuICAgICAgLy8gd3JpdGUgb3B0aW9ucyB0byBkYXRhXHJcbiAgICAgIHZhciBkYXRhID0gJGNvbnRhaW5lci5kYXRhKCdjeWVkZ2VlZGl0aW5nJyk7XHJcbiAgICAgIGlmIChkYXRhID09IG51bGwpIHtcclxuICAgICAgICBkYXRhID0ge307XHJcbiAgICAgIH1cclxuICAgICAgZGF0YS5vcHRpb25zID0gb3B0cztcclxuXHJcbiAgICAgIHZhciBvcHRDYWNoZTtcclxuXHJcbiAgICAgIGZ1bmN0aW9uIG9wdGlvbnMoKSB7XHJcbiAgICAgICAgcmV0dXJuIG9wdENhY2hlIHx8IChvcHRDYWNoZSA9ICRjb250YWluZXIuZGF0YSgnY3llZGdlZWRpdGluZycpLm9wdGlvbnMpO1xyXG4gICAgICB9XHJcblxyXG4gICAgICAvLyB3ZSB3aWxsIG5lZWQgdG8gY29udmVydCBtb2RlbCBwb3NpdG9ucyB0byByZW5kZXJlZCBwb3NpdGlvbnNcclxuICAgICAgZnVuY3Rpb24gY29udmVydFRvUmVuZGVyZWRQb3NpdGlvbihtb2RlbFBvc2l0aW9uKSB7XHJcbiAgICAgICAgdmFyIHBhbiA9IGN5LnBhbigpO1xyXG4gICAgICAgIHZhciB6b29tID0gY3kuem9vbSgpO1xyXG5cclxuICAgICAgICB2YXIgeCA9IG1vZGVsUG9zaXRpb24ueCAqIHpvb20gKyBwYW4ueDtcclxuICAgICAgICB2YXIgeSA9IG1vZGVsUG9zaXRpb24ueSAqIHpvb20gKyBwYW4ueTtcclxuXHJcbiAgICAgICAgcmV0dXJuIHtcclxuICAgICAgICAgIHg6IHgsXHJcbiAgICAgICAgICB5OiB5XHJcbiAgICAgICAgfTtcclxuICAgICAgfVxyXG4gICAgICBcclxuICAgICAgZnVuY3Rpb24gcmVmcmVzaERyYXdzKCkge1xyXG5cclxuICAgICAgICAvLyBkb24ndCBjbGVhciBhbmNob3Igd2hpY2ggaXMgYmVpbmcgbW92ZWRcclxuICAgICAgICBhbmNob3JNYW5hZ2VyLmNsZWFyQW5jaG9yc0V4Y2VwdChhbmNob3JNYW5hZ2VyLnRvdWNoZWRBbmNob3IpO1xyXG4gICAgICAgIFxyXG4gICAgICAgIGlmKGVuZHBvaW50U2hhcGUxICE9PSBudWxsKXtcclxuICAgICAgICAgIGVuZHBvaW50U2hhcGUxLmRlc3Ryb3koKTtcclxuICAgICAgICAgIGVuZHBvaW50U2hhcGUxID0gbnVsbDtcclxuICAgICAgICB9XHJcbiAgICAgICAgaWYoZW5kcG9pbnRTaGFwZTIgIT09IG51bGwpe1xyXG4gICAgICAgICAgZW5kcG9pbnRTaGFwZTIuZGVzdHJveSgpO1xyXG4gICAgICAgICAgZW5kcG9pbnRTaGFwZTIgPSBudWxsO1xyXG4gICAgICAgIH1cclxuICAgICAgICBjYW52YXMuZHJhdygpO1xyXG5cclxuICAgICAgICBpZiggZWRnZVRvSGlnaGxpZ2h0ICkge1xyXG4gICAgICAgICAgYW5jaG9yTWFuYWdlci5yZW5kZXJBbmNob3JTaGFwZXMoZWRnZVRvSGlnaGxpZ2h0KTtcclxuICAgICAgICAgIHJlbmRlckVuZFBvaW50U2hhcGVzKGVkZ2VUb0hpZ2hsaWdodCk7XHJcbiAgICAgICAgfVxyXG4gICAgICB9XHJcbiAgICAgIFxyXG4gICAgICAvLyByZW5kZXIgdGhlIGVuZCBwb2ludHMgc2hhcGVzIG9mIHRoZSBnaXZlbiBlZGdlXHJcbiAgICAgIGZ1bmN0aW9uIHJlbmRlckVuZFBvaW50U2hhcGVzKGVkZ2UpIHtcclxuICAgICAgICBpZighZWRnZSl7XHJcbiAgICAgICAgICByZXR1cm47XHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICB2YXIgZWRnZV9wdHMgPSBhbmNob3JQb2ludFV0aWxpdGllcy5nZXRBbmNob3JzQXNBcnJheShlZGdlKTtcclxuICAgICAgICBpZih0eXBlb2YgZWRnZV9wdHMgPT09ICd1bmRlZmluZWQnKXtcclxuICAgICAgICAgIGVkZ2VfcHRzID0gW107XHJcbiAgICAgICAgfSAgICAgICBcclxuICAgICAgICB2YXIgc291cmNlUG9zID0gZWRnZS5zb3VyY2VFbmRwb2ludCgpO1xyXG4gICAgICAgIHZhciB0YXJnZXRQb3MgPSBlZGdlLnRhcmdldEVuZHBvaW50KCk7XHJcbiAgICAgICAgZWRnZV9wdHMudW5zaGlmdChzb3VyY2VQb3MueSk7XHJcbiAgICAgICAgZWRnZV9wdHMudW5zaGlmdChzb3VyY2VQb3MueCk7XHJcbiAgICAgICAgZWRnZV9wdHMucHVzaCh0YXJnZXRQb3MueCk7XHJcbiAgICAgICAgZWRnZV9wdHMucHVzaCh0YXJnZXRQb3MueSk7IFxyXG5cclxuICAgICAgIFxyXG4gICAgICAgIGlmKCFlZGdlX3B0cylcclxuICAgICAgICAgIHJldHVybjtcclxuXHJcbiAgICAgICAgdmFyIHNyYyA9IHtcclxuICAgICAgICAgIHg6IGVkZ2VfcHRzWzBdLFxyXG4gICAgICAgICAgeTogZWRnZV9wdHNbMV1cclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIHZhciB0YXJnZXQgPSB7XHJcbiAgICAgICAgICB4OiBlZGdlX3B0c1tlZGdlX3B0cy5sZW5ndGgtMl0sXHJcbiAgICAgICAgICB5OiBlZGdlX3B0c1tlZGdlX3B0cy5sZW5ndGgtMV1cclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIHZhciBuZXh0VG9Tb3VyY2UgPSB7XHJcbiAgICAgICAgICB4OiBlZGdlX3B0c1syXSxcclxuICAgICAgICAgIHk6IGVkZ2VfcHRzWzNdXHJcbiAgICAgICAgfVxyXG4gICAgICAgIHZhciBuZXh0VG9UYXJnZXQgPSB7XHJcbiAgICAgICAgICB4OiBlZGdlX3B0c1tlZGdlX3B0cy5sZW5ndGgtNF0sXHJcbiAgICAgICAgICB5OiBlZGdlX3B0c1tlZGdlX3B0cy5sZW5ndGgtM11cclxuICAgICAgICB9XHJcbiAgICAgICAgdmFyIGxlbmd0aCA9IGdldEFuY2hvclNoYXBlc0xlbmd0aChlZGdlKSAqIDAuNjU7XHJcbiAgICAgICAgXHJcbiAgICAgICAgcmVuZGVyRWFjaEVuZFBvaW50U2hhcGUoc3JjLCB0YXJnZXQsIGxlbmd0aCxuZXh0VG9Tb3VyY2UsbmV4dFRvVGFyZ2V0KTtcclxuICAgICAgICBcclxuICAgICAgfVxyXG5cclxuICAgICAgZnVuY3Rpb24gcmVuZGVyRWFjaEVuZFBvaW50U2hhcGUoc291cmNlLCB0YXJnZXQsIGxlbmd0aCxuZXh0VG9Tb3VyY2UsbmV4dFRvVGFyZ2V0KSB7XHJcbiAgICAgICAgLy8gZ2V0IHRoZSB0b3AgbGVmdCBjb29yZGluYXRlcyBvZiBzb3VyY2UgYW5kIHRhcmdldFxyXG4gICAgICAgIHZhciBzVG9wTGVmdFggPSBzb3VyY2UueCAtIGxlbmd0aCAvIDI7XHJcbiAgICAgICAgdmFyIHNUb3BMZWZ0WSA9IHNvdXJjZS55IC0gbGVuZ3RoIC8gMjtcclxuXHJcbiAgICAgICAgdmFyIHRUb3BMZWZ0WCA9IHRhcmdldC54IC0gbGVuZ3RoIC8gMjtcclxuICAgICAgICB2YXIgdFRvcExlZnRZID0gdGFyZ2V0LnkgLSBsZW5ndGggLyAyO1xyXG5cclxuICAgICAgICB2YXIgbmV4dFRvU291cmNlWCA9IG5leHRUb1NvdXJjZS54IC0gbGVuZ3RoIC8yO1xyXG4gICAgICAgIHZhciBuZXh0VG9Tb3VyY2VZID0gbmV4dFRvU291cmNlLnkgLSBsZW5ndGggLyAyO1xyXG5cclxuICAgICAgICB2YXIgbmV4dFRvVGFyZ2V0WCA9IG5leHRUb1RhcmdldC54IC0gbGVuZ3RoIC8yO1xyXG4gICAgICAgIHZhciBuZXh0VG9UYXJnZXRZID0gbmV4dFRvVGFyZ2V0LnkgLSBsZW5ndGggLzI7XHJcblxyXG5cclxuICAgICAgICAvLyBjb252ZXJ0IHRvIHJlbmRlcmVkIHBhcmFtZXRlcnNcclxuICAgICAgICB2YXIgcmVuZGVyZWRTb3VyY2VQb3MgPSBjb252ZXJ0VG9SZW5kZXJlZFBvc2l0aW9uKHt4OiBzVG9wTGVmdFgsIHk6IHNUb3BMZWZ0WX0pO1xyXG4gICAgICAgIHZhciByZW5kZXJlZFRhcmdldFBvcyA9IGNvbnZlcnRUb1JlbmRlcmVkUG9zaXRpb24oe3g6IHRUb3BMZWZ0WCwgeTogdFRvcExlZnRZfSk7XHJcbiAgICAgICAgbGVuZ3RoID0gbGVuZ3RoICogY3kuem9vbSgpIC8gMjtcclxuXHJcbiAgICAgICAgdmFyIHJlbmRlcmVkTmV4dFRvU291cmNlID0gY29udmVydFRvUmVuZGVyZWRQb3NpdGlvbih7eDogbmV4dFRvU291cmNlWCwgeTogbmV4dFRvU291cmNlWX0pO1xyXG4gICAgICAgIHZhciByZW5kZXJlZE5leHRUb1RhcmdldCA9IGNvbnZlcnRUb1JlbmRlcmVkUG9zaXRpb24oe3g6IG5leHRUb1RhcmdldFgsIHk6IG5leHRUb1RhcmdldFl9KTtcclxuICAgICAgICBcclxuICAgICAgICAvL2hvdyBmYXIgdG8gZ28gZnJvbSB0aGUgbm9kZSBhbG9uZyB0aGUgZWRnZVxyXG4gICAgICAgIHZhciBkaXN0YW5jZUZyb21Ob2RlID0gbGVuZ3RoO1xyXG5cclxuICAgICAgICB2YXIgZGlzdGFuY2VTb3VyY2UgPSBNYXRoLnNxcnQoTWF0aC5wb3cocmVuZGVyZWROZXh0VG9Tb3VyY2UueCAtIHJlbmRlcmVkU291cmNlUG9zLngsMikgKyBNYXRoLnBvdyhyZW5kZXJlZE5leHRUb1NvdXJjZS55IC0gcmVuZGVyZWRTb3VyY2VQb3MueSwyKSk7ICAgICAgICBcclxuICAgICAgICB2YXIgc291cmNlRW5kUG9pbnRYID0gcmVuZGVyZWRTb3VyY2VQb3MueCArICgoZGlzdGFuY2VGcm9tTm9kZS8gZGlzdGFuY2VTb3VyY2UpKiAocmVuZGVyZWROZXh0VG9Tb3VyY2UueCAtIHJlbmRlcmVkU291cmNlUG9zLngpKTtcclxuICAgICAgICB2YXIgc291cmNlRW5kUG9pbnRZID0gcmVuZGVyZWRTb3VyY2VQb3MueSArICgoZGlzdGFuY2VGcm9tTm9kZS8gZGlzdGFuY2VTb3VyY2UpKiAocmVuZGVyZWROZXh0VG9Tb3VyY2UueSAtIHJlbmRlcmVkU291cmNlUG9zLnkpKTtcclxuXHJcblxyXG4gICAgICAgIHZhciBkaXN0YW5jZVRhcmdldCA9IE1hdGguc3FydChNYXRoLnBvdyhyZW5kZXJlZE5leHRUb1RhcmdldC54IC0gcmVuZGVyZWRUYXJnZXRQb3MueCwyKSArIE1hdGgucG93KHJlbmRlcmVkTmV4dFRvVGFyZ2V0LnkgLSByZW5kZXJlZFRhcmdldFBvcy55LDIpKTsgICAgICAgIFxyXG4gICAgICAgIHZhciB0YXJnZXRFbmRQb2ludFggPSByZW5kZXJlZFRhcmdldFBvcy54ICsgKChkaXN0YW5jZUZyb21Ob2RlLyBkaXN0YW5jZVRhcmdldCkqIChyZW5kZXJlZE5leHRUb1RhcmdldC54IC0gcmVuZGVyZWRUYXJnZXRQb3MueCkpO1xyXG4gICAgICAgIHZhciB0YXJnZXRFbmRQb2ludFkgPSByZW5kZXJlZFRhcmdldFBvcy55ICsgKChkaXN0YW5jZUZyb21Ob2RlLyBkaXN0YW5jZVRhcmdldCkqIChyZW5kZXJlZE5leHRUb1RhcmdldC55IC0gcmVuZGVyZWRUYXJnZXRQb3MueSkpOyBcclxuXHJcbiAgICAgICAgLy8gcmVuZGVyIGVuZCBwb2ludCBzaGFwZSBmb3Igc291cmNlIGFuZCB0YXJnZXRcclxuICAgICAgICBlbmRwb2ludFNoYXBlMSA9IG5ldyBLb252YS5DaXJjbGUoe1xyXG4gICAgICAgICAgeDogc291cmNlRW5kUG9pbnRYICsgbGVuZ3RoLFxyXG4gICAgICAgICAgeTogc291cmNlRW5kUG9pbnRZICsgbGVuZ3RoLFxyXG4gICAgICAgICAgcmFkaXVzOiBsZW5ndGgsXHJcbiAgICAgICAgICBmaWxsOiAnYmxhY2snLFxyXG4gICAgICAgIH0pO1xyXG5cclxuICAgICAgICBlbmRwb2ludFNoYXBlMiA9IG5ldyBLb252YS5DaXJjbGUoe1xyXG4gICAgICAgICAgeDogdGFyZ2V0RW5kUG9pbnRYICsgbGVuZ3RoLFxyXG4gICAgICAgICAgeTogdGFyZ2V0RW5kUG9pbnRZICsgbGVuZ3RoLFxyXG4gICAgICAgICAgcmFkaXVzOiBsZW5ndGgsXHJcbiAgICAgICAgICBmaWxsOiAnYmxhY2snLFxyXG4gICAgICAgIH0pO1xyXG5cclxuICAgICAgICBjYW52YXMuYWRkKGVuZHBvaW50U2hhcGUxKTtcclxuICAgICAgICBjYW52YXMuYWRkKGVuZHBvaW50U2hhcGUyKTtcclxuICAgICAgICBjYW52YXMuZHJhdygpO1xyXG4gICAgICAgIFxyXG4gICAgICB9XHJcblxyXG4gICAgICAvLyBnZXQgdGhlIGxlbmd0aCBvZiBhbmNob3IgcG9pbnRzIHRvIGJlIHJlbmRlcmVkXHJcbiAgICAgIGZ1bmN0aW9uIGdldEFuY2hvclNoYXBlc0xlbmd0aChlZGdlKSB7XHJcbiAgICAgICAgdmFyIGZhY3RvciA9IG9wdGlvbnMoKS5hbmNob3JTaGFwZVNpemVGYWN0b3I7XHJcbiAgICAgICAgaWYgKHBhcnNlRmxvYXQoZWRnZS5jc3MoJ3dpZHRoJykpIDw9IDIuNSlcclxuICAgICAgICAgIHJldHVybiAyLjUgKiBmYWN0b3I7XHJcbiAgICAgICAgZWxzZSByZXR1cm4gcGFyc2VGbG9hdChlZGdlLmNzcygnd2lkdGgnKSkqZmFjdG9yO1xyXG4gICAgICB9XHJcbiAgICAgIFxyXG4gICAgICAvLyBjaGVjayBpZiB0aGUgYW5jaG9yIHJlcHJlc2VudGVkIGJ5IHt4LCB5fSBpcyBpbnNpZGUgdGhlIHBvaW50IHNoYXBlXHJcbiAgICAgIGZ1bmN0aW9uIGNoZWNrSWZJbnNpZGVTaGFwZSh4LCB5LCBsZW5ndGgsIGNlbnRlclgsIGNlbnRlclkpe1xyXG4gICAgICAgIHZhciBtaW5YID0gY2VudGVyWCAtIGxlbmd0aCAvIDI7XHJcbiAgICAgICAgdmFyIG1heFggPSBjZW50ZXJYICsgbGVuZ3RoIC8gMjtcclxuICAgICAgICB2YXIgbWluWSA9IGNlbnRlclkgLSBsZW5ndGggLyAyO1xyXG4gICAgICAgIHZhciBtYXhZID0gY2VudGVyWSArIGxlbmd0aCAvIDI7XHJcbiAgICAgICAgXHJcbiAgICAgICAgdmFyIGluc2lkZSA9ICh4ID49IG1pblggJiYgeCA8PSBtYXhYKSAmJiAoeSA+PSBtaW5ZICYmIHkgPD0gbWF4WSk7XHJcbiAgICAgICAgcmV0dXJuIGluc2lkZTtcclxuICAgICAgfVxyXG5cclxuICAgICAgLy8gZ2V0IHRoZSBpbmRleCBvZiBhbmNob3IgY29udGFpbmluZyB0aGUgcG9pbnQgcmVwcmVzZW50ZWQgYnkge3gsIHl9XHJcbiAgICAgIGZ1bmN0aW9uIGdldENvbnRhaW5pbmdTaGFwZUluZGV4KHgsIHksIGVkZ2UpIHtcclxuICAgICAgICB2YXIgdHlwZSA9IGFuY2hvclBvaW50VXRpbGl0aWVzLmdldEVkZ2VUeXBlKGVkZ2UpO1xyXG5cclxuICAgICAgICBpZih0eXBlID09PSAnaW5jb25jbHVzaXZlJyl7XHJcbiAgICAgICAgICByZXR1cm4gLTE7XHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICBpZihlZGdlLmRhdGEoYW5jaG9yUG9pbnRVdGlsaXRpZXMuc3ludGF4W3R5cGVdWyd3ZWlnaHQnXSkgPT0gbnVsbCB8fCBcclxuICAgICAgICAgIGVkZ2UuZGF0YShhbmNob3JQb2ludFV0aWxpdGllcy5zeW50YXhbdHlwZV1bJ3dlaWdodCddKS5sZW5ndGggPT0gMCl7XHJcbiAgICAgICAgICByZXR1cm4gLTE7XHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICB2YXIgYW5jaG9yTGlzdCA9IGFuY2hvclBvaW50VXRpbGl0aWVzLmdldEFuY2hvcnNBc0FycmF5KGVkZ2UpOy8vZWRnZS5fcHJpdmF0ZS5yZGF0YS5zZWdwdHM7XHJcbiAgICAgICAgdmFyIGxlbmd0aCA9IGdldEFuY2hvclNoYXBlc0xlbmd0aChlZGdlKTtcclxuXHJcbiAgICAgICAgZm9yKHZhciBpID0gMDsgYW5jaG9yTGlzdCAmJiBpIDwgYW5jaG9yTGlzdC5sZW5ndGg7IGkgPSBpICsgMil7XHJcbiAgICAgICAgICB2YXIgYW5jaG9yWCA9IGFuY2hvckxpc3RbaV07XHJcbiAgICAgICAgICB2YXIgYW5jaG9yWSA9IGFuY2hvckxpc3RbaSArIDFdO1xyXG5cclxuICAgICAgICAgIHZhciBpbnNpZGUgPSBjaGVja0lmSW5zaWRlU2hhcGUoeCwgeSwgbGVuZ3RoLCBhbmNob3JYLCBhbmNob3JZKTtcclxuICAgICAgICAgIGlmKGluc2lkZSl7XHJcbiAgICAgICAgICAgIHJldHVybiBpIC8gMjtcclxuICAgICAgICAgIH1cclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIHJldHVybiAtMTtcclxuICAgICAgfTtcclxuXHJcbiAgICAgIGZ1bmN0aW9uIGdldENvbnRhaW5pbmdFbmRQb2ludCh4LCB5LCBlZGdlKXtcclxuICAgICAgICB2YXIgbGVuZ3RoID0gZ2V0QW5jaG9yU2hhcGVzTGVuZ3RoKGVkZ2UpO1xyXG4gICAgICAgIHZhciBhbGxQdHMgPSBlZGdlLl9wcml2YXRlLnJzY3JhdGNoLmFsbHB0cztcclxuICAgICAgICB2YXIgc3JjID0ge1xyXG4gICAgICAgICAgeDogYWxsUHRzWzBdLFxyXG4gICAgICAgICAgeTogYWxsUHRzWzFdXHJcbiAgICAgICAgfVxyXG4gICAgICAgIHZhciB0YXJnZXQgPSB7XHJcbiAgICAgICAgICB4OiBhbGxQdHNbYWxsUHRzLmxlbmd0aC0yXSxcclxuICAgICAgICAgIHk6IGFsbFB0c1thbGxQdHMubGVuZ3RoLTFdXHJcbiAgICAgICAgfVxyXG4gICAgICAgIGNvbnZlcnRUb1JlbmRlcmVkUG9zaXRpb24oc3JjKTtcclxuICAgICAgICBjb252ZXJ0VG9SZW5kZXJlZFBvc2l0aW9uKHRhcmdldCk7XHJcbiAgICAgICAgXHJcbiAgICAgICAgLy8gU291cmNlOjAsIFRhcmdldDoxLCBOb25lOi0xXHJcbiAgICAgICAgaWYoY2hlY2tJZkluc2lkZVNoYXBlKHgsIHksIGxlbmd0aCwgc3JjLngsIHNyYy55KSlcclxuICAgICAgICAgIHJldHVybiAwO1xyXG4gICAgICAgIGVsc2UgaWYoY2hlY2tJZkluc2lkZVNoYXBlKHgsIHksIGxlbmd0aCwgdGFyZ2V0LngsIHRhcmdldC55KSlcclxuICAgICAgICAgIHJldHVybiAxO1xyXG4gICAgICAgIGVsc2VcclxuICAgICAgICAgIHJldHVybiAtMTtcclxuICAgICAgfVxyXG4gICAgICBcclxuICAgICAgLy8gc3RvcmUgdGhlIGN1cnJlbnQgc3RhdHVzIG9mIGdlc3R1cmVzIGFuZCBzZXQgdGhlbSB0byBmYWxzZVxyXG4gICAgICBmdW5jdGlvbiBkaXNhYmxlR2VzdHVyZXMoKSB7XHJcbiAgICAgICAgbGFzdFBhbm5pbmdFbmFibGVkID0gY3kucGFubmluZ0VuYWJsZWQoKTtcclxuICAgICAgICBsYXN0Wm9vbWluZ0VuYWJsZWQgPSBjeS56b29taW5nRW5hYmxlZCgpO1xyXG4gICAgICAgIGxhc3RCb3hTZWxlY3Rpb25FbmFibGVkID0gY3kuYm94U2VsZWN0aW9uRW5hYmxlZCgpO1xyXG5cclxuICAgICAgICBjeS56b29taW5nRW5hYmxlZChmYWxzZSlcclxuICAgICAgICAgIC5wYW5uaW5nRW5hYmxlZChmYWxzZSlcclxuICAgICAgICAgIC5ib3hTZWxlY3Rpb25FbmFibGVkKGZhbHNlKTtcclxuICAgICAgfVxyXG4gICAgICBcclxuICAgICAgLy8gcmVzZXQgdGhlIGdlc3R1cmVzIGJ5IHRoZWlyIGxhdGVzdCBzdGF0dXNcclxuICAgICAgZnVuY3Rpb24gcmVzZXRHZXN0dXJlcygpIHtcclxuICAgICAgICBjeS56b29taW5nRW5hYmxlZChsYXN0Wm9vbWluZ0VuYWJsZWQpXHJcbiAgICAgICAgICAucGFubmluZ0VuYWJsZWQobGFzdFBhbm5pbmdFbmFibGVkKVxyXG4gICAgICAgICAgLmJveFNlbGVjdGlvbkVuYWJsZWQobGFzdEJveFNlbGVjdGlvbkVuYWJsZWQpO1xyXG4gICAgICB9XHJcblxyXG4gICAgICBmdW5jdGlvbiB0dXJuT2ZmQWN0aXZlQmdDb2xvcigpe1xyXG4gICAgICAgIC8vIGZvdW5kIHRoaXMgYXQgdGhlIGN5LW5vZGUtcmVzaXplIGNvZGUsIGJ1dCBkb2Vzbid0IHNlZW0gdG8gZmluZCB0aGUgb2JqZWN0IG1vc3Qgb2YgdGhlIHRpbWVcclxuICAgICAgICBpZiggY3kuc3R5bGUoKS5fcHJpdmF0ZS5jb3JlU3R5bGVbXCJhY3RpdmUtYmctb3BhY2l0eVwiXSkge1xyXG4gICAgICAgICAgbGFzdEFjdGl2ZUJnT3BhY2l0eSA9IGN5LnN0eWxlKCkuX3ByaXZhdGUuY29yZVN0eWxlW1wiYWN0aXZlLWJnLW9wYWNpdHlcIl0udmFsdWU7XHJcbiAgICAgICAgfVxyXG4gICAgICAgIGVsc2Uge1xyXG4gICAgICAgICAgLy8gYXJiaXRyYXJ5LCBmZWVsIGZyZWUgdG8gY2hhbmdlXHJcbiAgICAgICAgICAvLyB0cmlhbCBhbmQgZXJyb3Igc2hvd2VkIHRoYXQgMC4xNSB3YXMgY2xvc2VzdCB0byB0aGUgb2xkIGNvbG9yXHJcbiAgICAgICAgICBsYXN0QWN0aXZlQmdPcGFjaXR5ID0gMC4xNTtcclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIGN5LnN0eWxlKClcclxuICAgICAgICAgIC5zZWxlY3RvcihcImNvcmVcIilcclxuICAgICAgICAgIC5zdHlsZShcImFjdGl2ZS1iZy1vcGFjaXR5XCIsIDApXHJcbiAgICAgICAgICAudXBkYXRlKCk7XHJcbiAgICAgIH1cclxuXHJcbiAgICAgIGZ1bmN0aW9uIHJlc2V0QWN0aXZlQmdDb2xvcigpe1xyXG4gICAgICAgIGN5LnN0eWxlKClcclxuICAgICAgICAgIC5zZWxlY3RvcihcImNvcmVcIilcclxuICAgICAgICAgIC5zdHlsZShcImFjdGl2ZS1iZy1vcGFjaXR5XCIsIGxhc3RBY3RpdmVCZ09wYWNpdHkpXHJcbiAgICAgICAgICAudXBkYXRlKCk7XHJcbiAgICAgIH1cclxuXHJcbiAgICAgIGZ1bmN0aW9uIG1vdmVBbmNob3JQb2ludHMocG9zaXRpb25EaWZmLCBlZGdlcykge1xyXG4gICAgICAgICAgZWRnZXMuZm9yRWFjaChmdW5jdGlvbiggZWRnZSApe1xyXG4gICAgICAgICAgICAgIHZhciBwcmV2aW91c0FuY2hvcnNQb3NpdGlvbiA9IGFuY2hvclBvaW50VXRpbGl0aWVzLmdldEFuY2hvcnNBc0FycmF5KGVkZ2UpO1xyXG4gICAgICAgICAgICAgIHZhciBuZXh0QW5jaG9yUG9pbnRzUG9zaXRpb24gPSBbXTtcclxuICAgICAgICAgICAgICBpZiAocHJldmlvdXNBbmNob3JzUG9zaXRpb24gIT0gdW5kZWZpbmVkKVxyXG4gICAgICAgICAgICAgIHtcclxuICAgICAgICAgICAgICAgIGZvciAoaT0wOyBpPHByZXZpb3VzQW5jaG9yc1Bvc2l0aW9uLmxlbmd0aDsgaSs9MilcclxuICAgICAgICAgICAgICAgIHtcclxuICAgICAgICAgICAgICAgICAgICBuZXh0QW5jaG9yUG9pbnRzUG9zaXRpb24ucHVzaCh7eDogcHJldmlvdXNBbmNob3JzUG9zaXRpb25baV0rcG9zaXRpb25EaWZmLngsIHk6IHByZXZpb3VzQW5jaG9yc1Bvc2l0aW9uW2krMV0rcG9zaXRpb25EaWZmLnl9KTtcclxuICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICAgIHZhciB0eXBlID0gYW5jaG9yUG9pbnRVdGlsaXRpZXMuZ2V0RWRnZVR5cGUoZWRnZSk7XHJcblxyXG4gICAgICAgICAgICAgICAgaWYoYW5jaG9yUG9pbnRVdGlsaXRpZXMuZWRnZVR5cGVJbmNvbmNsdXNpdmVTaG91bGRudEhhcHBlbih0eXBlLCBcIlVpVXRpbGl0aWVzLmpzLCBtb3ZlQW5jaG9yUG9pbnRzXCIpKXtcclxuICAgICAgICAgICAgICAgICAgcmV0dXJuO1xyXG4gICAgICAgICAgICAgICAgfVxyXG5cclxuICAgICAgICAgICAgICAgIGVkZ2UuZGF0YShhbmNob3JQb2ludFV0aWxpdGllcy5zeW50YXhbdHlwZV1bJ3BvaW50UG9zJ10sIG5leHRBbmNob3JQb2ludHNQb3NpdGlvbik7XHJcbiAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgfSk7XHJcbiAgICAgICAgICBhbmNob3JQb2ludFV0aWxpdGllcy5pbml0QW5jaG9yUG9pbnRzKG9wdGlvbnMoKS5iZW5kUG9zaXRpb25zRnVuY3Rpb24sIG9wdGlvbnMoKS5jb250cm9sUG9zaXRpb25zRnVuY3Rpb24sIGVkZ2VzKTtcclxuICAgICAgICAgIFxyXG4gICAgICAgICAgLy8gTGlzdGVuZXIgZGVmaW5lZCBpbiBvdGhlciBleHRlbnNpb25cclxuICAgICAgICAgIC8vIE1pZ2h0IGhhdmUgY29tcGF0aWJpbGl0eSBpc3N1ZXMgYWZ0ZXIgdGhlIHVuYnVuZGxlZCBiZXppZXJcclxuICAgICAgICAgIGN5LnRyaWdnZXIoJ2JlbmRQb2ludE1vdmVtZW50Jyk7IFxyXG4gICAgICB9XHJcblxyXG4gICAgICBmdW5jdGlvbiBtb3ZlQW5jaG9yT25EcmFnKGVkZ2UsIHR5cGUsIGluZGV4LCBwb3NpdGlvbil7XHJcbiAgICAgICAgdmFyIHdlaWdodHMgPSBlZGdlLmRhdGEoYW5jaG9yUG9pbnRVdGlsaXRpZXMuc3ludGF4W3R5cGVdWyd3ZWlnaHQnXSk7XHJcbiAgICAgICAgdmFyIGRpc3RhbmNlcyA9IGVkZ2UuZGF0YShhbmNob3JQb2ludFV0aWxpdGllcy5zeW50YXhbdHlwZV1bJ2Rpc3RhbmNlJ10pO1xyXG4gICAgICAgIFxyXG4gICAgICAgIHZhciByZWxhdGl2ZUFuY2hvclBvc2l0aW9uID0gYW5jaG9yUG9pbnRVdGlsaXRpZXMuY29udmVydFRvUmVsYXRpdmVQb3NpdGlvbihlZGdlLCBwb3NpdGlvbik7XHJcbiAgICAgICAgd2VpZ2h0c1tpbmRleF0gPSByZWxhdGl2ZUFuY2hvclBvc2l0aW9uLndlaWdodDtcclxuICAgICAgICBkaXN0YW5jZXNbaW5kZXhdID0gcmVsYXRpdmVBbmNob3JQb3NpdGlvbi5kaXN0YW5jZTtcclxuICAgICAgICBcclxuICAgICAgICBlZGdlLmRhdGEoYW5jaG9yUG9pbnRVdGlsaXRpZXMuc3ludGF4W3R5cGVdWyd3ZWlnaHQnXSwgd2VpZ2h0cyk7XHJcbiAgICAgICAgZWRnZS5kYXRhKGFuY2hvclBvaW50VXRpbGl0aWVzLnN5bnRheFt0eXBlXVsnZGlzdGFuY2UnXSwgZGlzdGFuY2VzKTtcclxuICAgICAgfVxyXG5cclxuICAgICAgLy8gZGVib3VuY2VkIGR1ZSB0byBsYXJnZSBhbW91dCBvZiBjYWxscyB0byB0YXBkcmFnXHJcbiAgICAgIHZhciBfbW92ZUFuY2hvck9uRHJhZyA9IGRlYm91bmNlKCBtb3ZlQW5jaG9yT25EcmFnLCA1KTtcclxuXHJcbiAgICAgIHsgIFxyXG4gICAgICAgIGxhc3RQYW5uaW5nRW5hYmxlZCA9IGN5LnBhbm5pbmdFbmFibGVkKCk7XHJcbiAgICAgICAgbGFzdFpvb21pbmdFbmFibGVkID0gY3kuem9vbWluZ0VuYWJsZWQoKTtcclxuICAgICAgICBsYXN0Qm94U2VsZWN0aW9uRW5hYmxlZCA9IGN5LmJveFNlbGVjdGlvbkVuYWJsZWQoKTtcclxuICAgICAgICBcclxuICAgICAgICAvLyBJbml0aWxpemUgdGhlIGVkZ2VUb0hpZ2hsaWdodEJlbmRzIGFuZCBudW1iZXJPZlNlbGVjdGVkRWRnZXNcclxuICAgICAgICB7XHJcbiAgICAgICAgICB2YXIgc2VsZWN0ZWRFZGdlcyA9IGN5LmVkZ2VzKCc6c2VsZWN0ZWQnKTtcclxuICAgICAgICAgIHZhciBudW1iZXJPZlNlbGVjdGVkRWRnZXMgPSBzZWxlY3RlZEVkZ2VzLmxlbmd0aDtcclxuICAgICAgICAgIFxyXG4gICAgICAgICAgaWYgKCBudW1iZXJPZlNlbGVjdGVkRWRnZXMgPT09IDEgKSB7XHJcbiAgICAgICAgICAgIGVkZ2VUb0hpZ2hsaWdodCA9IHNlbGVjdGVkRWRnZXNbMF07XHJcbiAgICAgICAgICB9XHJcbiAgICAgICAgfVxyXG4gICAgICAgIFxyXG4gICAgICAgIGN5LmJpbmQoJ3pvb20gcGFuJywgZVpvb20gPSBmdW5jdGlvbiAoKSB7XHJcbiAgICAgICAgICBpZiAoICFlZGdlVG9IaWdobGlnaHQgKSB7XHJcbiAgICAgICAgICAgIHJldHVybjtcclxuICAgICAgICAgIH1cclxuICAgICAgICAgIFxyXG4gICAgICAgICAgcmVmcmVzaERyYXdzKCk7XHJcbiAgICAgICAgfSk7XHJcblxyXG4gICAgICAgIC8vIGN5Lm9mZiBpcyBuZXZlciBjYWxsZWQgb24gdGhpcyBsaXN0ZW5lclxyXG4gICAgICAgIGN5Lm9uKCdkYXRhJywgJ2VkZ2UnLCAgZnVuY3Rpb24gKCkge1xyXG4gICAgICAgICAgaWYgKCAhZWRnZVRvSGlnaGxpZ2h0ICkge1xyXG4gICAgICAgICAgICByZXR1cm47XHJcbiAgICAgICAgICB9XHJcbiAgICAgICAgICBcclxuICAgICAgICAgIHJlZnJlc2hEcmF3cygpO1xyXG4gICAgICAgIH0pO1xyXG5cclxuICAgICAgICBjeS5vbignc3R5bGUnLCAnZWRnZS5lZGdlYmVuZGVkaXRpbmctaGFzYmVuZHBvaW50czpzZWxlY3RlZCwgZWRnZS5lZGdlY29udHJvbGVkaXRpbmctaGFzY29udHJvbHBvaW50czpzZWxlY3RlZCcsIGVTdHlsZSA9IGZ1bmN0aW9uICgpIHtcclxuICAgICAgICAgIHJlZnJlc2hEcmF3cygpO1xyXG4gICAgICAgIH0pO1xyXG5cclxuICAgICAgICBjeS5vbigncmVtb3ZlJywgJ2VkZ2UnLCBlUmVtb3ZlID0gZnVuY3Rpb24gKCkge1xyXG4gICAgICAgICAgdmFyIGVkZ2UgPSB0aGlzO1xyXG4gICAgICAgICAgaWYgKGVkZ2Uuc2VsZWN0ZWQoKSkge1xyXG4gICAgICAgICAgICBudW1iZXJPZlNlbGVjdGVkRWRnZXMgPSBudW1iZXJPZlNlbGVjdGVkRWRnZXMgLSAxO1xyXG4gICAgICAgICAgICBcclxuICAgICAgICAgICAgY3kuc3RhcnRCYXRjaCgpO1xyXG4gICAgICAgICAgICBcclxuICAgICAgICAgICAgaWYgKGVkZ2VUb0hpZ2hsaWdodCkge1xyXG4gICAgICAgICAgICAgIGVkZ2VUb0hpZ2hsaWdodC5yZW1vdmVDbGFzcygnY3ktZWRnZS1lZGl0aW5nLWhpZ2hsaWdodCcpO1xyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgICAgIFxyXG4gICAgICAgICAgICBpZiAobnVtYmVyT2ZTZWxlY3RlZEVkZ2VzID09PSAxKSB7XHJcbiAgICAgICAgICAgICAgdmFyIHNlbGVjdGVkRWRnZXMgPSBjeS5lZGdlcygnOnNlbGVjdGVkJyk7XHJcbiAgICAgICAgICAgICAgXHJcbiAgICAgICAgICAgICAgLy8gSWYgdXNlciByZW1vdmVzIGFsbCBzZWxlY3RlZCBlZGdlcyBhdCBhIHNpbmdsZSBvcGVyYXRpb24gdGhlbiBvdXIgJ251bWJlck9mU2VsZWN0ZWRFZGdlcydcclxuICAgICAgICAgICAgICAvLyBtYXkgYmUgbWlzbGVhZGluZy4gVGhlcmVmb3JlIHdlIG5lZWQgdG8gY2hlY2sgaWYgdGhlIG51bWJlciBvZiBlZGdlcyB0byBoaWdobGlnaHQgaXMgcmVhbHkgMSBoZXJlLlxyXG4gICAgICAgICAgICAgIGlmIChzZWxlY3RlZEVkZ2VzLmxlbmd0aCA9PT0gMSkge1xyXG4gICAgICAgICAgICAgICAgZWRnZVRvSGlnaGxpZ2h0ID0gc2VsZWN0ZWRFZGdlc1swXTtcclxuICAgICAgICAgICAgICAgIGVkZ2VUb0hpZ2hsaWdodC5hZGRDbGFzcygnY3ktZWRnZS1lZGl0aW5nLWhpZ2hsaWdodCcpO1xyXG4gICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICBlbHNlIHtcclxuICAgICAgICAgICAgICAgIGVkZ2VUb0hpZ2hsaWdodCA9IHVuZGVmaW5lZDtcclxuICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgZWxzZSB7XHJcbiAgICAgICAgICAgICAgZWRnZVRvSGlnaGxpZ2h0ID0gdW5kZWZpbmVkO1xyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgICAgIFxyXG4gICAgICAgICAgICBjeS5lbmRCYXRjaCgpO1xyXG4gICAgICAgICAgfVxyXG4gICAgICAgICAgcmVmcmVzaERyYXdzKCk7XHJcbiAgICAgICAgfSk7XHJcbiAgICAgICAgXHJcbiAgICAgICAgIGN5Lm9uKCdhZGQnLCAnZWRnZScsIGVBZGQgPSBmdW5jdGlvbiAoKSB7XHJcbiAgICAgICAgICB2YXIgZWRnZSA9IHRoaXM7XHJcbiAgICAgICAgICBpZiAoZWRnZS5zZWxlY3RlZCgpKSB7XHJcbiAgICAgICAgICAgIG51bWJlck9mU2VsZWN0ZWRFZGdlcyA9IG51bWJlck9mU2VsZWN0ZWRFZGdlcyArIDE7XHJcbiAgICAgICAgICAgIFxyXG4gICAgICAgICAgICBjeS5zdGFydEJhdGNoKCk7XHJcbiAgICAgICAgICAgIFxyXG4gICAgICAgICAgICBpZiAoZWRnZVRvSGlnaGxpZ2h0KSB7XHJcbiAgICAgICAgICAgICAgZWRnZVRvSGlnaGxpZ2h0LnJlbW92ZUNsYXNzKCdjeS1lZGdlLWVkaXRpbmctaGlnaGxpZ2h0Jyk7XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgXHJcbiAgICAgICAgICAgIGlmIChudW1iZXJPZlNlbGVjdGVkRWRnZXMgPT09IDEpIHtcclxuICAgICAgICAgICAgICBlZGdlVG9IaWdobGlnaHQgPSBlZGdlO1xyXG4gICAgICAgICAgICAgIGVkZ2VUb0hpZ2hsaWdodC5hZGRDbGFzcygnY3ktZWRnZS1lZGl0aW5nLWhpZ2hsaWdodCcpO1xyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgICAgIGVsc2Uge1xyXG4gICAgICAgICAgICAgIGVkZ2VUb0hpZ2hsaWdodCA9IHVuZGVmaW5lZDtcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICBcclxuICAgICAgICAgICAgY3kuZW5kQmF0Y2goKTtcclxuICAgICAgICAgIH1cclxuICAgICAgICAgIHJlZnJlc2hEcmF3cygpO1xyXG4gICAgICAgIH0pO1xyXG4gICAgICAgIFxyXG4gICAgICAgIGN5Lm9uKCdzZWxlY3QnLCAnZWRnZScsIGVTZWxlY3QgPSBmdW5jdGlvbiAoKSB7XHJcbiAgICAgICAgICB2YXIgZWRnZSA9IHRoaXM7XHJcblxyXG4gICAgICAgICAgaWYoZWRnZS50YXJnZXQoKS5jb25uZWN0ZWRFZGdlcygpLmxlbmd0aCA9PSAwIHx8IGVkZ2Uuc291cmNlKCkuY29ubmVjdGVkRWRnZXMoKS5sZW5ndGggPT0gMCl7XHJcbiAgICAgICAgICAgIHJldHVybjtcclxuICAgICAgICAgIH1cclxuXHJcbiAgICAgICAgIFxyXG4gICAgICAgICAgbnVtYmVyT2ZTZWxlY3RlZEVkZ2VzID0gbnVtYmVyT2ZTZWxlY3RlZEVkZ2VzICsgMTtcclxuICAgICAgICAgIFxyXG4gICAgICAgICAgY3kuc3RhcnRCYXRjaCgpO1xyXG4gICAgICAgICAgICBcclxuICAgICAgICAgIGlmIChlZGdlVG9IaWdobGlnaHQpIHtcclxuICAgICAgICAgICAgZWRnZVRvSGlnaGxpZ2h0LnJlbW92ZUNsYXNzKCdjeS1lZGdlLWVkaXRpbmctaGlnaGxpZ2h0Jyk7XHJcbiAgICAgICAgICB9XHJcbiAgICAgICAgICAgIFxyXG4gICAgICAgICAgaWYgKG51bWJlck9mU2VsZWN0ZWRFZGdlcyA9PT0gMSkge1xyXG4gICAgICAgICAgICBlZGdlVG9IaWdobGlnaHQgPSBlZGdlO1xyXG4gICAgICAgICAgICBlZGdlVG9IaWdobGlnaHQuYWRkQ2xhc3MoJ2N5LWVkZ2UtZWRpdGluZy1oaWdobGlnaHQnKTtcclxuICAgICAgICAgIH1cclxuICAgICAgICAgIGVsc2Uge1xyXG4gICAgICAgICAgICBlZGdlVG9IaWdobGlnaHQgPSB1bmRlZmluZWQ7XHJcbiAgICAgICAgICB9XHJcbiAgICAgICAgICBcclxuICAgICAgICAgIGN5LmVuZEJhdGNoKCk7XHJcbiAgICAgICAgICByZWZyZXNoRHJhd3MoKTtcclxuICAgICAgICB9KTtcclxuICAgICAgICBcclxuICAgICAgICBjeS5vbigndW5zZWxlY3QnLCAnZWRnZScsIGVVbnNlbGVjdCA9IGZ1bmN0aW9uICgpIHtcclxuICAgICAgICAgIG51bWJlck9mU2VsZWN0ZWRFZGdlcyA9IG51bWJlck9mU2VsZWN0ZWRFZGdlcyAtIDE7XHJcbiAgICAgICAgICAgIFxyXG4gICAgICAgICAgY3kuc3RhcnRCYXRjaCgpO1xyXG4gICAgICAgICAgICBcclxuICAgICAgICAgIGlmIChlZGdlVG9IaWdobGlnaHQpIHtcclxuICAgICAgICAgICAgZWRnZVRvSGlnaGxpZ2h0LnJlbW92ZUNsYXNzKCdjeS1lZGdlLWVkaXRpbmctaGlnaGxpZ2h0Jyk7XHJcbiAgICAgICAgICB9XHJcbiAgICAgICAgICAgIFxyXG4gICAgICAgICAgaWYgKG51bWJlck9mU2VsZWN0ZWRFZGdlcyA9PT0gMSkge1xyXG4gICAgICAgICAgICB2YXIgc2VsZWN0ZWRFZGdlcyA9IGN5LmVkZ2VzKCc6c2VsZWN0ZWQnKTtcclxuICAgICAgICAgICAgXHJcbiAgICAgICAgICAgIC8vIElmIHVzZXIgdW5zZWxlY3RzIGFsbCBlZGdlcyBieSB0YXBwaW5nIHRvIHRoZSBjb3JlIGV0Yy4gdGhlbiBvdXIgJ251bWJlck9mU2VsZWN0ZWRFZGdlcydcclxuICAgICAgICAgICAgLy8gbWF5IGJlIG1pc2xlYWRpbmcuIFRoZXJlZm9yZSB3ZSBuZWVkIHRvIGNoZWNrIGlmIHRoZSBudW1iZXIgb2YgZWRnZXMgdG8gaGlnaGxpZ2h0IGlzIHJlYWx5IDEgaGVyZS5cclxuICAgICAgICAgICAgaWYgKHNlbGVjdGVkRWRnZXMubGVuZ3RoID09PSAxKSB7XHJcbiAgICAgICAgICAgICAgZWRnZVRvSGlnaGxpZ2h0ID0gc2VsZWN0ZWRFZGdlc1swXTtcclxuICAgICAgICAgICAgICBlZGdlVG9IaWdobGlnaHQuYWRkQ2xhc3MoJ2N5LWVkZ2UtZWRpdGluZy1oaWdobGlnaHQnKTtcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICBlbHNlIHtcclxuICAgICAgICAgICAgICBlZGdlVG9IaWdobGlnaHQgPSB1bmRlZmluZWQ7XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICAgIH1cclxuICAgICAgICAgIGVsc2Uge1xyXG4gICAgICAgICAgICBlZGdlVG9IaWdobGlnaHQgPSB1bmRlZmluZWQ7XHJcbiAgICAgICAgICB9XHJcbiAgICAgICAgICBcclxuICAgICAgICAgIGN5LmVuZEJhdGNoKCk7XHJcbiAgICAgICAgICByZWZyZXNoRHJhd3MoKTtcclxuICAgICAgICB9KTtcclxuICAgICAgICBcclxuICAgICAgICB2YXIgbW92ZWRBbmNob3JJbmRleDtcclxuICAgICAgICB2YXIgdGFwU3RhcnRQb3M7XHJcbiAgICAgICAgdmFyIG1vdmVkRWRnZTtcclxuICAgICAgICB2YXIgbW92ZUFuY2hvclBhcmFtO1xyXG4gICAgICAgIHZhciBjcmVhdGVBbmNob3JPbkRyYWc7XHJcbiAgICAgICAgdmFyIG1vdmVkRW5kUG9pbnQ7XHJcbiAgICAgICAgdmFyIGR1bW15Tm9kZTtcclxuICAgICAgICB2YXIgZGV0YWNoZWROb2RlO1xyXG4gICAgICAgIHZhciBub2RlVG9BdHRhY2g7XHJcbiAgICAgICAgdmFyIGFuY2hvckNyZWF0ZWRCeURyYWcgPSBmYWxzZTtcclxuXHJcbiAgICAgICAgY3kub24oJ3RhcHN0YXJ0JywgZVRhcFN0YXJ0ID0gZnVuY3Rpb24oZXZlbnQpIHtcclxuICAgICAgICAgIGN5LmF1dG91bnNlbGVjdGlmeShmYWxzZSk7XHJcbiAgICAgICAgICB0YXBTdGFydFBvcyA9IGV2ZW50LnBvc2l0aW9uIHx8IGV2ZW50LmN5UG9zaXRpb247XHJcbiAgICAgICAgfSk7XHJcblxyXG4gICAgICAgIGN5Lm9uKCd0YXBzdGFydCcsICdlZGdlJywgZVRhcFN0YXJ0T25FZGdlID0gZnVuY3Rpb24gKGV2ZW50KSB7XHJcbiAgICAgICAgICB2YXIgZWRnZSA9IHRoaXM7XHJcblxyXG4gICAgICAgICAgaWYgKCFlZGdlVG9IaWdobGlnaHQgfHwgZWRnZVRvSGlnaGxpZ2h0LmlkKCkgIT09IGVkZ2UuaWQoKSkge1xyXG4gICAgICAgICAgICBjcmVhdGVBbmNob3JPbkRyYWcgPSBmYWxzZTtcclxuICAgICAgICAgICAgcmV0dXJuO1xyXG4gICAgICAgICAgfVxyXG4gICAgICAgICAgXHJcbiAgICAgICAgICBtb3ZlZEVkZ2UgPSBlZGdlO1xyXG5cclxuICAgICAgICAgIHZhciB0eXBlID0gYW5jaG9yUG9pbnRVdGlsaXRpZXMuZ2V0RWRnZVR5cGUoZWRnZSk7XHJcblxyXG4gICAgICAgICAgLy8gdG8gYXZvaWQgZXJyb3JzXHJcbiAgICAgICAgICBpZih0eXBlID09PSAnaW5jb25jbHVzaXZlJylcclxuICAgICAgICAgICAgdHlwZSA9ICdiZW5kJztcclxuICAgICAgICAgIFxyXG4gICAgICAgICAgdmFyIGN5UG9zWCA9IHRhcFN0YXJ0UG9zLng7XHJcbiAgICAgICAgICB2YXIgY3lQb3NZID0gdGFwU3RhcnRQb3MueTtcclxuICAgICAgICAgIFxyXG4gICAgICAgICAgLy8gR2V0IHdoaWNoIGVuZCBwb2ludCBoYXMgYmVlbiBjbGlja2VkIChTb3VyY2U6MCwgVGFyZ2V0OjEsIE5vbmU6LTEpXHJcbiAgICAgICAgICB2YXIgZW5kUG9pbnQgPSBnZXRDb250YWluaW5nRW5kUG9pbnQoY3lQb3NYLCBjeVBvc1ksIGVkZ2UpO1xyXG5cclxuICAgICAgICAgIGlmKGVuZFBvaW50ID09IDAgfHwgZW5kUG9pbnQgPT0gMSl7XHJcbiAgICAgICAgICAgIGVkZ2UudW5zZWxlY3QoKTtcclxuICAgICAgICAgICAgbW92ZWRFbmRQb2ludCA9IGVuZFBvaW50O1xyXG4gICAgICAgICAgICBkZXRhY2hlZE5vZGUgPSAoZW5kUG9pbnQgPT0gMCkgPyBtb3ZlZEVkZ2Uuc291cmNlKCkgOiBtb3ZlZEVkZ2UudGFyZ2V0KCk7XHJcblxyXG4gICAgICAgICAgICB2YXIgZGlzY29ubmVjdGVkRW5kID0gKGVuZFBvaW50ID09IDApID8gJ3NvdXJjZScgOiAndGFyZ2V0JztcclxuICAgICAgICAgICAgdmFyIHJlc3VsdCA9IHJlY29ubmVjdGlvblV0aWxpdGllcy5kaXNjb25uZWN0RWRnZShtb3ZlZEVkZ2UsIGN5LCBldmVudC5yZW5kZXJlZFBvc2l0aW9uLCBkaXNjb25uZWN0ZWRFbmQpO1xyXG4gICAgICAgICAgICBcclxuICAgICAgICAgICAgZHVtbXlOb2RlID0gcmVzdWx0LmR1bW15Tm9kZTtcclxuICAgICAgICAgICAgbW92ZWRFZGdlID0gcmVzdWx0LmVkZ2U7XHJcblxyXG4gICAgICAgICAgICBkaXNhYmxlR2VzdHVyZXMoKTtcclxuICAgICAgICAgIH1cclxuICAgICAgICAgIGVsc2Uge1xyXG4gICAgICAgICAgICBtb3ZlZEFuY2hvckluZGV4ID0gdW5kZWZpbmVkO1xyXG4gICAgICAgICAgICBjcmVhdGVBbmNob3JPbkRyYWcgPSB0cnVlO1xyXG4gICAgICAgICAgfVxyXG4gICAgICAgIH0pO1xyXG4gICAgICAgIFxyXG4gICAgICAgIGN5Lm9uKCdkcmFnJywgJ25vZGUnLCBlRHJhZyA9IGZ1bmN0aW9uIChldmVudCkge1xyXG4gICAgICAgICAgdmFyIG5vZGUgPSB0aGlzO1xyXG4gICAgICAgICAgY3kuZWRnZXMoKS51bnNlbGVjdCgpO1xyXG4gICAgICAgICAgaWYoIW5vZGUuc2VsZWN0ZWQoKSl7XHJcbiAgICAgICAgICAgIGN5Lm5vZGVzKCkudW5zZWxlY3QoKTtcclxuICAgICAgICAgIH0gICAgICAgICBcclxuICAgICAgICB9KTtcclxuICAgICAgICBjeS5vbigndGFwZHJhZycsIGVUYXBEcmFnID0gZnVuY3Rpb24gKGV2ZW50KSB7XHJcbiAgICAgICAgICBjeS5hdXRvdW5zZWxlY3RpZnkoZmFsc2UpO1xyXG4gICAgICAgICAgdmFyIGVkZ2UgPSBtb3ZlZEVkZ2U7XHJcblxyXG4gICAgICAgICAgaWYobW92ZWRFZGdlICE9PSB1bmRlZmluZWQgJiYgYW5jaG9yUG9pbnRVdGlsaXRpZXMuaXNJZ25vcmVkRWRnZShlZGdlKSApIHtcclxuICAgICAgICAgICAgcmV0dXJuO1xyXG4gICAgICAgICAgfVxyXG5cclxuICAgICAgICAgIHZhciB0eXBlID0gYW5jaG9yUG9pbnRVdGlsaXRpZXMuZ2V0RWRnZVR5cGUoZWRnZSk7XHJcblxyXG4gICAgICAgICAgaWYoY3JlYXRlQW5jaG9yT25EcmFnICYmICFhbmNob3JUb3VjaGVkICYmIHR5cGUgIT09ICdpbmNvbmNsdXNpdmUnKSB7XHJcbiAgICAgICAgICAgIC8vIHJlbWVtYmVyIHN0YXRlIGJlZm9yZSBjcmVhdGluZyBhbmNob3JcclxuICAgICAgICAgICAgdmFyIHdlaWdodFN0ciA9IGFuY2hvclBvaW50VXRpbGl0aWVzLnN5bnRheFt0eXBlXVsnd2VpZ2h0J107XHJcbiAgICAgICAgICAgIHZhciBkaXN0YW5jZVN0ciA9IGFuY2hvclBvaW50VXRpbGl0aWVzLnN5bnRheFt0eXBlXVsnZGlzdGFuY2UnXTtcclxuXHJcbiAgICAgICAgICAgIG1vdmVBbmNob3JQYXJhbSA9IHtcclxuICAgICAgICAgICAgICBlZGdlOiBlZGdlLFxyXG4gICAgICAgICAgICAgIHR5cGU6IHR5cGUsXHJcbiAgICAgICAgICAgICAgd2VpZ2h0czogZWRnZS5kYXRhKHdlaWdodFN0cikgPyBbXS5jb25jYXQoZWRnZS5kYXRhKHdlaWdodFN0cikpIDogW10sXHJcbiAgICAgICAgICAgICAgZGlzdGFuY2VzOiBlZGdlLmRhdGEoZGlzdGFuY2VTdHIpID8gW10uY29uY2F0KGVkZ2UuZGF0YShkaXN0YW5jZVN0cikpIDogW11cclxuICAgICAgICAgICAgfTtcclxuXHJcbiAgICAgICAgICAgIGVkZ2UudW5zZWxlY3QoKTtcclxuXHJcbiAgICAgICAgICAgIC8vIHVzaW5nIHRhcHN0YXJ0IHBvc2l0aW9uIGZpeGVzIGJ1ZyBvbiBxdWljayBkcmFnc1xyXG4gICAgICAgICAgICAvLyAtLS0gXHJcbiAgICAgICAgICAgIC8vIGFsc28gbW9kaWZpZWQgYWRkQW5jaG9yUG9pbnQgdG8gcmV0dXJuIHRoZSBpbmRleCBiZWNhdXNlXHJcbiAgICAgICAgICAgIC8vIGdldENvbnRhaW5pbmdTaGFwZUluZGV4IGZhaWxlZCB0byBmaW5kIHRoZSBjcmVhdGVkIGFuY2hvciBvbiBxdWljayBkcmFnc1xyXG4gICAgICAgICAgICBtb3ZlZEFuY2hvckluZGV4ID0gYW5jaG9yUG9pbnRVdGlsaXRpZXMuYWRkQW5jaG9yUG9pbnQoZWRnZSwgdGFwU3RhcnRQb3MpO1xyXG4gICAgICAgICAgICBtb3ZlZEVkZ2UgPSBlZGdlO1xyXG4gICAgICAgICAgICBjcmVhdGVBbmNob3JPbkRyYWcgPSB1bmRlZmluZWQ7XHJcbiAgICAgICAgICAgIGFuY2hvckNyZWF0ZWRCeURyYWcgPSB0cnVlO1xyXG4gICAgICAgICAgICBkaXNhYmxlR2VzdHVyZXMoKTtcclxuICAgICAgICAgIH1cclxuXHJcbiAgICAgICAgICAvLyBpZiB0aGUgdGFwc3RhcnQgZGlkIG5vdCBoaXQgYW4gZWRnZSBhbmQgaXQgZGlkIG5vdCBoaXQgYW4gYW5jaG9yXHJcbiAgICAgICAgICBpZiAoIWFuY2hvclRvdWNoZWQgJiYgKG1vdmVkRWRnZSA9PT0gdW5kZWZpbmVkIHx8IFxyXG4gICAgICAgICAgICAobW92ZWRBbmNob3JJbmRleCA9PT0gdW5kZWZpbmVkICYmIG1vdmVkRW5kUG9pbnQgPT09IHVuZGVmaW5lZCkpKSB7XHJcbiAgICAgICAgICAgIHJldHVybjtcclxuICAgICAgICAgIH1cclxuXHJcbiAgICAgICAgICB2YXIgZXZlbnRQb3MgPSBldmVudC5wb3NpdGlvbiB8fCBldmVudC5jeVBvc2l0aW9uO1xyXG5cclxuICAgICAgICAgIC8vIFVwZGF0ZSBlbmQgcG9pbnQgbG9jYXRpb24gKFNvdXJjZTowLCBUYXJnZXQ6MSlcclxuICAgICAgICAgIGlmKG1vdmVkRW5kUG9pbnQgIT0gLTEgJiYgZHVtbXlOb2RlKXtcclxuICAgICAgICAgICAgZHVtbXlOb2RlLnBvc2l0aW9uKGV2ZW50UG9zKTtcclxuICAgICAgICAgIH1cclxuICAgICAgICAgIC8vIGNoYW5nZSBsb2NhdGlvbiBvZiBhbmNob3IgY3JlYXRlZCBieSBkcmFnXHJcbiAgICAgICAgICBlbHNlIGlmKG1vdmVkQW5jaG9ySW5kZXggIT0gdW5kZWZpbmVkKXtcclxuICAgICAgICAgICAgX21vdmVBbmNob3JPbkRyYWcoZWRnZSwgdHlwZSwgbW92ZWRBbmNob3JJbmRleCwgZXZlbnRQb3MpO1xyXG4gICAgICAgICAgfVxyXG4gICAgICAgICAgLy8gY2hhbmdlIGxvY2F0aW9uIG9mIGRyYWcgYW5kIGRyb3BwZWQgYW5jaG9yXHJcbiAgICAgICAgICBlbHNlIGlmKGFuY2hvclRvdWNoZWQpe1xyXG5cclxuICAgICAgICAgICAgLy8gdGhlIHRhcFN0YXJ0UG9zIGNoZWNrIGlzIG5lY2Vzc2FyeSB3aGVuIHJpZ2ggY2xpY2tpbmcgYW5jaG9yIHBvaW50c1xyXG4gICAgICAgICAgICAvLyByaWdodCBjbGlja2luZyBhbmNob3IgcG9pbnRzIHRyaWdnZXJzIE1vdXNlRG93biBmb3IgS29udmEsIGJ1dCBub3QgdGFwc3RhcnQgZm9yIGN5XHJcbiAgICAgICAgICAgIC8vIHdoZW4gdGhhdCBoYXBwZW5zIHRhcFN0YXJ0UG9zIGlzIHVuZGVmaW5lZFxyXG4gICAgICAgICAgICBpZihhbmNob3JNYW5hZ2VyLnRvdWNoZWRBbmNob3JJbmRleCA9PT0gdW5kZWZpbmVkICYmIHRhcFN0YXJ0UG9zKXtcclxuICAgICAgICAgICAgICBhbmNob3JNYW5hZ2VyLnRvdWNoZWRBbmNob3JJbmRleCA9IGdldENvbnRhaW5pbmdTaGFwZUluZGV4KFxyXG4gICAgICAgICAgICAgICAgdGFwU3RhcnRQb3MueCwgXHJcbiAgICAgICAgICAgICAgICB0YXBTdGFydFBvcy55LFxyXG4gICAgICAgICAgICAgICAgYW5jaG9yTWFuYWdlci5lZGdlKTtcclxuICAgICAgICAgICAgfVxyXG5cclxuICAgICAgICAgICAgaWYoYW5jaG9yTWFuYWdlci50b3VjaGVkQW5jaG9ySW5kZXggIT09IHVuZGVmaW5lZCl7XHJcbiAgICAgICAgICAgICAgX21vdmVBbmNob3JPbkRyYWcoXHJcbiAgICAgICAgICAgICAgICBhbmNob3JNYW5hZ2VyLmVkZ2UsXHJcbiAgICAgICAgICAgICAgICBhbmNob3JNYW5hZ2VyLmVkZ2VUeXBlLFxyXG4gICAgICAgICAgICAgICAgYW5jaG9yTWFuYWdlci50b3VjaGVkQW5jaG9ySW5kZXgsXHJcbiAgICAgICAgICAgICAgICBldmVudFBvc1xyXG4gICAgICAgICAgICAgICk7XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICAgIH1cclxuICAgICAgICAgIFxyXG4gICAgICAgICAgaWYoZXZlbnQudGFyZ2V0ICYmIGV2ZW50LnRhcmdldFswXSAmJiBldmVudC50YXJnZXQuaXNOb2RlKCkpe1xyXG4gICAgICAgICAgICBub2RlVG9BdHRhY2ggPSBldmVudC50YXJnZXQ7XHJcbiAgICAgICAgICB9XHJcblxyXG4gICAgICAgIH0pO1xyXG4gICAgICAgIFxyXG4gICAgICAgIGN5Lm9uKCd0YXBlbmQnLCBlVGFwRW5kID0gZnVuY3Rpb24gKGV2ZW50KSB7XHJcblxyXG4gICAgICAgICAgaWYobW91c2VPdXQpe1xyXG4gICAgICAgICAgICBjYW52YXMuZ2V0U3RhZ2UoKS5maXJlKFwiY29udGVudE1vdXNldXBcIik7XHJcbiAgICAgICAgICB9XHJcblxyXG4gICAgICAgICAgdmFyIGVkZ2UgPSBtb3ZlZEVkZ2UgfHwgYW5jaG9yTWFuYWdlci5lZGdlOyBcclxuICAgICAgICAgIFxyXG4gICAgICAgICAgaWYoIGVkZ2UgIT09IHVuZGVmaW5lZCApIHtcclxuICAgICAgICAgICAgdmFyIGluZGV4ID0gYW5jaG9yTWFuYWdlci50b3VjaGVkQW5jaG9ySW5kZXg7XHJcbiAgICAgICAgICAgIGlmKCBpbmRleCAhPSB1bmRlZmluZWQgKSB7XHJcbiAgICAgICAgICAgICAgdmFyIHN0YXJ0WCA9IGVkZ2Uuc291cmNlKCkucG9zaXRpb24oJ3gnKTtcclxuICAgICAgICAgICAgICB2YXIgc3RhcnRZID0gZWRnZS5zb3VyY2UoKS5wb3NpdGlvbigneScpO1xyXG4gICAgICAgICAgICAgIHZhciBlbmRYID0gZWRnZS50YXJnZXQoKS5wb3NpdGlvbigneCcpO1xyXG4gICAgICAgICAgICAgIHZhciBlbmRZID0gZWRnZS50YXJnZXQoKS5wb3NpdGlvbigneScpO1xyXG4gICAgICAgICAgICAgIFxyXG4gICAgICAgICAgICAgIHZhciBhbmNob3JMaXN0ID0gYW5jaG9yUG9pbnRVdGlsaXRpZXMuZ2V0QW5jaG9yc0FzQXJyYXkoZWRnZSk7XHJcbiAgICAgICAgICAgICAgdmFyIGFsbEFuY2hvcnMgPSBbc3RhcnRYLCBzdGFydFldLmNvbmNhdChhbmNob3JMaXN0KS5jb25jYXQoW2VuZFgsIGVuZFldKTtcclxuICAgICAgICAgICAgICBcclxuICAgICAgICAgICAgICB2YXIgYW5jaG9ySW5kZXggPSBpbmRleCArIDE7XHJcbiAgICAgICAgICAgICAgdmFyIHByZUluZGV4ID0gYW5jaG9ySW5kZXggLSAxO1xyXG4gICAgICAgICAgICAgIHZhciBwb3NJbmRleCA9IGFuY2hvckluZGV4ICsgMTtcclxuICAgICAgICAgICAgICBcclxuICAgICAgICAgICAgICB2YXIgYW5jaG9yID0ge1xyXG4gICAgICAgICAgICAgICAgeDogYWxsQW5jaG9yc1syICogYW5jaG9ySW5kZXhdLFxyXG4gICAgICAgICAgICAgICAgeTogYWxsQW5jaG9yc1syICogYW5jaG9ySW5kZXggKyAxXVxyXG4gICAgICAgICAgICAgIH07XHJcbiAgICAgICAgICAgICAgXHJcbiAgICAgICAgICAgICAgdmFyIHByZUFuY2hvclBvaW50ID0ge1xyXG4gICAgICAgICAgICAgICAgeDogYWxsQW5jaG9yc1syICogcHJlSW5kZXhdLFxyXG4gICAgICAgICAgICAgICAgeTogYWxsQW5jaG9yc1syICogcHJlSW5kZXggKyAxXVxyXG4gICAgICAgICAgICAgIH07XHJcbiAgICAgICAgICAgICAgXHJcbiAgICAgICAgICAgICAgdmFyIHBvc0FuY2hvclBvaW50ID0ge1xyXG4gICAgICAgICAgICAgICAgeDogYWxsQW5jaG9yc1syICogcG9zSW5kZXhdLFxyXG4gICAgICAgICAgICAgICAgeTogYWxsQW5jaG9yc1syICogcG9zSW5kZXggKyAxXVxyXG4gICAgICAgICAgICAgIH07XHJcbiAgICAgICAgICAgICAgXHJcbiAgICAgICAgICAgICAgdmFyIG5lYXJUb0xpbmU7XHJcbiAgICAgICAgICAgICAgXHJcbiAgICAgICAgICAgICAgaWYoICggYW5jaG9yLnggPT09IHByZUFuY2hvclBvaW50LnggJiYgYW5jaG9yLnkgPT09IHByZUFuY2hvclBvaW50LnkgKSB8fCAoIGFuY2hvci54ID09PSBwcmVBbmNob3JQb2ludC54ICYmIGFuY2hvci55ID09PSBwcmVBbmNob3JQb2ludC55ICkgKSB7XHJcbiAgICAgICAgICAgICAgICBuZWFyVG9MaW5lID0gdHJ1ZTtcclxuICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgZWxzZSB7XHJcbiAgICAgICAgICAgICAgICB2YXIgbTEgPSAoIHByZUFuY2hvclBvaW50LnkgLSBwb3NBbmNob3JQb2ludC55ICkgLyAoIHByZUFuY2hvclBvaW50LnggLSBwb3NBbmNob3JQb2ludC54ICk7XHJcbiAgICAgICAgICAgICAgICB2YXIgbTIgPSAtMSAvIG0xO1xyXG5cclxuICAgICAgICAgICAgICAgIHZhciBzcmNUZ3RQb2ludHNBbmRUYW5nZW50cyA9IHtcclxuICAgICAgICAgICAgICAgICAgc3JjUG9pbnQ6IHByZUFuY2hvclBvaW50LFxyXG4gICAgICAgICAgICAgICAgICB0Z3RQb2ludDogcG9zQW5jaG9yUG9pbnQsXHJcbiAgICAgICAgICAgICAgICAgIG0xOiBtMSxcclxuICAgICAgICAgICAgICAgICAgbTI6IG0yXHJcbiAgICAgICAgICAgICAgICB9O1xyXG5cclxuICAgICAgICAgICAgICAgIHZhciBjdXJyZW50SW50ZXJzZWN0aW9uID0gYW5jaG9yUG9pbnRVdGlsaXRpZXMuZ2V0SW50ZXJzZWN0aW9uKGVkZ2UsIGFuY2hvciwgc3JjVGd0UG9pbnRzQW5kVGFuZ2VudHMpO1xyXG4gICAgICAgICAgICAgICAgdmFyIGRpc3QgPSBNYXRoLnNxcnQoIE1hdGgucG93KCAoYW5jaG9yLnggLSBjdXJyZW50SW50ZXJzZWN0aW9uLngpLCAyICkgXHJcbiAgICAgICAgICAgICAgICAgICAgICAgICsgTWF0aC5wb3coIChhbmNob3IueSAtIGN1cnJlbnRJbnRlcnNlY3Rpb24ueSksIDIgKSk7XHJcbiAgICAgICAgICAgICAgICBcclxuICAgICAgICAgICAgICAgIC8vIHJlbW92ZSB0aGUgYmVuZCBwb2ludCBpZiBzZWdtZW50IGVkZ2UgYmVjb21lcyBzdHJhaWdodFxyXG4gICAgICAgICAgICAgICAgdmFyIHR5cGUgPSBhbmNob3JQb2ludFV0aWxpdGllcy5nZXRFZGdlVHlwZShlZGdlKTtcclxuICAgICAgICAgICAgICAgIGlmKCAodHlwZSA9PT0gJ2JlbmQnICYmIGRpc3QgIDwgb3B0aW9ucygpLmJlbmRSZW1vdmFsU2Vuc2l0aXZpdHkpKSB7XHJcbiAgICAgICAgICAgICAgICAgIG5lYXJUb0xpbmUgPSB0cnVlO1xyXG4gICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgICAgXHJcbiAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgIFxyXG4gICAgICAgICAgICAgIGlmKCBuZWFyVG9MaW5lIClcclxuICAgICAgICAgICAgICB7XHJcbiAgICAgICAgICAgICAgICBhbmNob3JQb2ludFV0aWxpdGllcy5yZW1vdmVBbmNob3IoZWRnZSwgaW5kZXgpO1xyXG4gICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICBcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICBlbHNlIGlmKGR1bW15Tm9kZSAhPSB1bmRlZmluZWQgJiYgKG1vdmVkRW5kUG9pbnQgPT0gMCB8fCBtb3ZlZEVuZFBvaW50ID09IDEpICl7XHJcbiAgICAgICAgICAgICAgXHJcbiAgICAgICAgICAgICAgdmFyIG5ld05vZGUgPSBkZXRhY2hlZE5vZGU7XHJcbiAgICAgICAgICAgICAgdmFyIGlzVmFsaWQgPSAndmFsaWQnO1xyXG4gICAgICAgICAgICAgIHZhciBsb2NhdGlvbiA9IChtb3ZlZEVuZFBvaW50ID09IDApID8gJ3NvdXJjZScgOiAndGFyZ2V0JztcclxuXHJcbiAgICAgICAgICAgICAgLy8gdmFsaWRhdGUgZWRnZSByZWNvbm5lY3Rpb25cclxuICAgICAgICAgICAgICBpZihub2RlVG9BdHRhY2gpe1xyXG4gICAgICAgICAgICAgICAgdmFyIG5ld1NvdXJjZSA9IChtb3ZlZEVuZFBvaW50ID09IDApID8gbm9kZVRvQXR0YWNoIDogZWRnZS5zb3VyY2UoKTtcclxuICAgICAgICAgICAgICAgIHZhciBuZXdUYXJnZXQgPSAobW92ZWRFbmRQb2ludCA9PSAxKSA/IG5vZGVUb0F0dGFjaCA6IGVkZ2UudGFyZ2V0KCk7XHJcbiAgICAgICAgICAgICAgICBpZih0eXBlb2YgdmFsaWRhdGVFZGdlID09PSBcImZ1bmN0aW9uXCIpXHJcbiAgICAgICAgICAgICAgICAgIGlzVmFsaWQgPSB2YWxpZGF0ZUVkZ2UoZWRnZSwgbmV3U291cmNlLCBuZXdUYXJnZXQpO1xyXG4gICAgICAgICAgICAgICAgbmV3Tm9kZSA9IChpc1ZhbGlkID09PSAndmFsaWQnKSA/IG5vZGVUb0F0dGFjaCA6IGRldGFjaGVkTm9kZTtcclxuICAgICAgICAgICAgICB9XHJcblxyXG4gICAgICAgICAgICAgIHZhciBuZXdTb3VyY2UgPSAobW92ZWRFbmRQb2ludCA9PSAwKSA/IG5ld05vZGUgOiBlZGdlLnNvdXJjZSgpO1xyXG4gICAgICAgICAgICAgIHZhciBuZXdUYXJnZXQgPSAobW92ZWRFbmRQb2ludCA9PSAxKSA/IG5ld05vZGUgOiBlZGdlLnRhcmdldCgpO1xyXG4gICAgICAgICAgICAgIGVkZ2UgPSByZWNvbm5lY3Rpb25VdGlsaXRpZXMuY29ubmVjdEVkZ2UoZWRnZSwgZGV0YWNoZWROb2RlLCBsb2NhdGlvbik7XHJcblxyXG4gICAgICAgICAgICAgIGlmKGRldGFjaGVkTm9kZS5pZCgpICE9PSBuZXdOb2RlLmlkKCkpe1xyXG4gICAgICAgICAgICAgICAgLy8gdXNlIGdpdmVuIGhhbmRsZVJlY29ubmVjdEVkZ2UgZnVuY3Rpb24gXHJcbiAgICAgICAgICAgICAgICBpZih0eXBlb2YgaGFuZGxlUmVjb25uZWN0RWRnZSA9PT0gJ2Z1bmN0aW9uJyl7XHJcbiAgICAgICAgICAgICAgICAgIHZhciByZWNvbm5lY3RlZEVkZ2UgPSBoYW5kbGVSZWNvbm5lY3RFZGdlKG5ld1NvdXJjZS5pZCgpLCBuZXdUYXJnZXQuaWQoKSwgZWRnZS5kYXRhKCkpO1xyXG4gICAgICAgICAgICAgICAgICBcclxuICAgICAgICAgICAgICAgICAgaWYocmVjb25uZWN0ZWRFZGdlKXtcclxuICAgICAgICAgICAgICAgICAgICByZWNvbm5lY3Rpb25VdGlsaXRpZXMuY29weUVkZ2UoZWRnZSwgcmVjb25uZWN0ZWRFZGdlKTtcclxuICAgICAgICAgICAgICAgICAgICBhbmNob3JQb2ludFV0aWxpdGllcy5pbml0QW5jaG9yUG9pbnRzKG9wdGlvbnMoKS5iZW5kUG9zaXRpb25zRnVuY3Rpb24sIFxyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgb3B0aW9ucygpLmNvbnRyb2xQb3NpdGlvbnNGdW5jdGlvbiwgW3JlY29ubmVjdGVkRWRnZV0pO1xyXG4gICAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgICAgIFxyXG4gICAgICAgICAgICAgICAgICBpZihyZWNvbm5lY3RlZEVkZ2UgJiYgb3B0aW9ucygpLnVuZG9hYmxlKXtcclxuICAgICAgICAgICAgICAgICAgICB2YXIgcGFyYW1zID0ge1xyXG4gICAgICAgICAgICAgICAgICAgICAgbmV3RWRnZTogcmVjb25uZWN0ZWRFZGdlLFxyXG4gICAgICAgICAgICAgICAgICAgICAgb2xkRWRnZTogZWRnZVxyXG4gICAgICAgICAgICAgICAgICAgIH07XHJcbiAgICAgICAgICAgICAgICAgICAgY3kudW5kb1JlZG8oKS5kbygncmVtb3ZlUmVjb25uZWN0ZWRFZGdlJywgcGFyYW1zKTtcclxuICAgICAgICAgICAgICAgICAgICBlZGdlID0gcmVjb25uZWN0ZWRFZGdlO1xyXG4gICAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgICAgIGVsc2UgaWYocmVjb25uZWN0ZWRFZGdlKXtcclxuICAgICAgICAgICAgICAgICAgICBjeS5yZW1vdmUoZWRnZSk7XHJcbiAgICAgICAgICAgICAgICAgICAgZWRnZSA9IHJlY29ubmVjdGVkRWRnZTtcclxuICAgICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgICAgZWxzZXtcclxuICAgICAgICAgICAgICAgICAgdmFyIGxvYyA9IChtb3ZlZEVuZFBvaW50ID09IDApID8ge3NvdXJjZTogbmV3Tm9kZS5pZCgpfSA6IHt0YXJnZXQ6IG5ld05vZGUuaWQoKX07XHJcbiAgICAgICAgICAgICAgICAgIHZhciBvbGRMb2MgPSAobW92ZWRFbmRQb2ludCA9PSAwKSA/IHtzb3VyY2U6IGRldGFjaGVkTm9kZS5pZCgpfSA6IHt0YXJnZXQ6IGRldGFjaGVkTm9kZS5pZCgpfTtcclxuICAgICAgICAgICAgICAgICAgXHJcbiAgICAgICAgICAgICAgICAgIGlmKG9wdGlvbnMoKS51bmRvYWJsZSAmJiBuZXdOb2RlLmlkKCkgIT09IGRldGFjaGVkTm9kZS5pZCgpKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgdmFyIHBhcmFtID0ge1xyXG4gICAgICAgICAgICAgICAgICAgICAgZWRnZTogZWRnZSxcclxuICAgICAgICAgICAgICAgICAgICAgIGxvY2F0aW9uOiBsb2MsXHJcbiAgICAgICAgICAgICAgICAgICAgICBvbGRMb2M6IG9sZExvY1xyXG4gICAgICAgICAgICAgICAgICAgIH07XHJcbiAgICAgICAgICAgICAgICAgICAgdmFyIHJlc3VsdCA9IGN5LnVuZG9SZWRvKCkuZG8oJ3JlY29ubmVjdEVkZ2UnLCBwYXJhbSk7XHJcbiAgICAgICAgICAgICAgICAgICAgZWRnZSA9IHJlc3VsdC5lZGdlO1xyXG4gICAgICAgICAgICAgICAgICAgIC8vZWRnZS5zZWxlY3QoKTtcclxuICAgICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgICAgfSAgXHJcbiAgICAgICAgICAgICAgfVxyXG5cclxuICAgICAgICAgICAgICAvLyBpbnZhbGlkIGVkZ2UgcmVjb25uZWN0aW9uIGNhbGxiYWNrXHJcbiAgICAgICAgICAgICAgaWYoaXNWYWxpZCAhPT0gJ3ZhbGlkJyAmJiB0eXBlb2YgYWN0T25VbnN1Y2Nlc3NmdWxSZWNvbm5lY3Rpb24gPT09ICdmdW5jdGlvbicpe1xyXG4gICAgICAgICAgICAgICAgYWN0T25VbnN1Y2Nlc3NmdWxSZWNvbm5lY3Rpb24oKTtcclxuICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgZWRnZS5zZWxlY3QoKTtcclxuICAgICAgICAgICAgICBjeS5yZW1vdmUoZHVtbXlOb2RlKTtcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgICAgfVxyXG4gICAgICAgICAgdmFyIHR5cGUgPSBhbmNob3JQb2ludFV0aWxpdGllcy5nZXRFZGdlVHlwZShlZGdlKTtcclxuXHJcbiAgICAgICAgICAvLyB0byBhdm9pZCBlcnJvcnNcclxuICAgICAgICAgIGlmKHR5cGUgPT09ICdpbmNvbmNsdXNpdmUnKXtcclxuICAgICAgICAgICAgdHlwZSA9ICdiZW5kJztcclxuICAgICAgICAgIH1cclxuXHJcbiAgICAgICAgICBpZihhbmNob3JNYW5hZ2VyLnRvdWNoZWRBbmNob3JJbmRleCA9PT0gdW5kZWZpbmVkICYmICFhbmNob3JDcmVhdGVkQnlEcmFnKXtcclxuICAgICAgICAgICAgbW92ZUFuY2hvclBhcmFtID0gdW5kZWZpbmVkO1xyXG4gICAgICAgICAgfVxyXG5cclxuICAgICAgICAgIHZhciB3ZWlnaHRTdHIgPSBhbmNob3JQb2ludFV0aWxpdGllcy5zeW50YXhbdHlwZV1bJ3dlaWdodCddO1xyXG4gICAgICAgICAgaWYgKGVkZ2UgIT09IHVuZGVmaW5lZCAmJiBtb3ZlQW5jaG9yUGFyYW0gIT09IHVuZGVmaW5lZCAmJiBcclxuICAgICAgICAgICAgKGVkZ2UuZGF0YSh3ZWlnaHRTdHIpID8gZWRnZS5kYXRhKHdlaWdodFN0cikudG9TdHJpbmcoKSA6IG51bGwpICE9IG1vdmVBbmNob3JQYXJhbS53ZWlnaHRzLnRvU3RyaW5nKCkpIHtcclxuICAgICAgICAgICAgXHJcbiAgICAgICAgICAgIC8vIGFuY2hvciBjcmVhdGVkIGZyb20gZHJhZ1xyXG4gICAgICAgICAgICBpZihhbmNob3JDcmVhdGVkQnlEcmFnKXtcclxuICAgICAgICAgICAgZWRnZS5zZWxlY3QoKTsgXHJcblxyXG4gICAgICAgICAgICAvLyBzdG9wcyB0aGUgdW5idW5kbGVkIGJlemllciBlZGdlcyBmcm9tIGJlaW5nIHVuc2VsZWN0ZWRcclxuICAgICAgICAgICAgY3kuYXV0b3Vuc2VsZWN0aWZ5KHRydWUpO1xyXG4gICAgICAgICAgICB9XHJcblxyXG4gICAgICAgICAgICBpZihvcHRpb25zKCkudW5kb2FibGUpIHtcclxuICAgICAgICAgICAgICBjeS51bmRvUmVkbygpLmRvKCdjaGFuZ2VBbmNob3JQb2ludHMnLCBtb3ZlQW5jaG9yUGFyYW0pO1xyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgICB9XHJcbiAgICAgICAgICBcclxuICAgICAgICAgIG1vdmVkQW5jaG9ySW5kZXggPSB1bmRlZmluZWQ7XHJcbiAgICAgICAgICBtb3ZlZEVkZ2UgPSB1bmRlZmluZWQ7XHJcbiAgICAgICAgICBtb3ZlQW5jaG9yUGFyYW0gPSB1bmRlZmluZWQ7XHJcbiAgICAgICAgICBjcmVhdGVBbmNob3JPbkRyYWcgPSB1bmRlZmluZWQ7XHJcbiAgICAgICAgICBtb3ZlZEVuZFBvaW50ID0gdW5kZWZpbmVkO1xyXG4gICAgICAgICAgZHVtbXlOb2RlID0gdW5kZWZpbmVkO1xyXG4gICAgICAgICAgZGV0YWNoZWROb2RlID0gdW5kZWZpbmVkO1xyXG4gICAgICAgICAgbm9kZVRvQXR0YWNoID0gdW5kZWZpbmVkO1xyXG4gICAgICAgICAgdGFwU3RhcnRQb3MgPSB1bmRlZmluZWQ7XHJcbiAgICAgICAgICBhbmNob3JDcmVhdGVkQnlEcmFnID0gZmFsc2U7XHJcblxyXG4gICAgICAgICAgYW5jaG9yTWFuYWdlci50b3VjaGVkQW5jaG9ySW5kZXggPSB1bmRlZmluZWQ7IFxyXG5cclxuICAgICAgICAgIHJlc2V0R2VzdHVyZXMoKTtcclxuICAgICAgICAgIHNldFRpbWVvdXQoZnVuY3Rpb24oKXtyZWZyZXNoRHJhd3MoKX0sIDUwKTtcclxuICAgICAgICB9KTtcclxuXHJcbiAgICAgICAgLy9WYXJpYWJsZXMgdXNlZCBmb3Igc3RhcnRpbmcgYW5kIGVuZGluZyB0aGUgbW92ZW1lbnQgb2YgYW5jaG9yIHBvaW50cyB3aXRoIGFycm93c1xyXG4gICAgICAgIHZhciBtb3ZlYW5jaG9ycGFyYW07XHJcbiAgICAgICAgdmFyIGZpcnN0QW5jaG9yO1xyXG4gICAgICAgIHZhciBlZGdlQ29udGFpbmluZ0ZpcnN0QW5jaG9yO1xyXG4gICAgICAgIHZhciBmaXJzdEFuY2hvclBvaW50Rm91bmQ7XHJcbiAgICAgICAgY3kub24oXCJlZGdlZWRpdGluZy5tb3Zlc3RhcnRcIiwgZnVuY3Rpb24gKGUsIGVkZ2VzKSB7XHJcbiAgICAgICAgICAgIGZpcnN0QW5jaG9yUG9pbnRGb3VuZCA9IGZhbHNlO1xyXG4gICAgICAgICAgICBpZiAoZWRnZXNbMF0gIT0gdW5kZWZpbmVkKVxyXG4gICAgICAgICAgICB7XHJcbiAgICAgICAgICAgICAgICBlZGdlcy5mb3JFYWNoKGZ1bmN0aW9uKCBlZGdlICl7XHJcbiAgICAgICAgICAgICAgICAgIGlmIChhbmNob3JQb2ludFV0aWxpdGllcy5nZXRBbmNob3JzQXNBcnJheShlZGdlKSAhPSB1bmRlZmluZWQgJiYgIWZpcnN0QW5jaG9yUG9pbnRGb3VuZClcclxuICAgICAgICAgICAgICAgICAge1xyXG4gICAgICAgICAgICAgICAgICAgICAgZmlyc3RBbmNob3IgPSB7IHg6IGFuY2hvclBvaW50VXRpbGl0aWVzLmdldEFuY2hvcnNBc0FycmF5KGVkZ2UpWzBdLCB5OiBhbmNob3JQb2ludFV0aWxpdGllcy5nZXRBbmNob3JzQXNBcnJheShlZGdlKVsxXX07XHJcbiAgICAgICAgICAgICAgICAgICAgICBtb3ZlYW5jaG9ycGFyYW0gPSB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgZmlyc3RUaW1lOiB0cnVlLFxyXG4gICAgICAgICAgICAgICAgICAgICAgICAgIGZpcnN0QW5jaG9yUG9zaXRpb246IHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgeDogZmlyc3RBbmNob3IueCxcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgeTogZmlyc3RBbmNob3IueVxyXG4gICAgICAgICAgICAgICAgICAgICAgICAgIH0sXHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgZWRnZXM6IGVkZ2VzXHJcbiAgICAgICAgICAgICAgICAgICAgICB9O1xyXG4gICAgICAgICAgICAgICAgICAgICAgZWRnZUNvbnRhaW5pbmdGaXJzdEFuY2hvciA9IGVkZ2U7XHJcbiAgICAgICAgICAgICAgICAgICAgICBmaXJzdEFuY2hvclBvaW50Rm91bmQgPSB0cnVlO1xyXG4gICAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgICB9KTtcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgIH0pO1xyXG5cclxuICAgICAgICBjeS5vbihcImVkZ2VlZGl0aW5nLm1vdmVlbmRcIiwgZnVuY3Rpb24gKGUsIGVkZ2VzKSB7XHJcbiAgICAgICAgICAgIGlmIChtb3ZlYW5jaG9ycGFyYW0gIT0gdW5kZWZpbmVkKVxyXG4gICAgICAgICAgICB7XHJcbiAgICAgICAgICAgICAgICB2YXIgaW5pdGlhbFBvcyA9IG1vdmVhbmNob3JwYXJhbS5maXJzdEFuY2hvclBvc2l0aW9uO1xyXG4gICAgICAgICAgICAgICAgdmFyIG1vdmVkRmlyc3RBbmNob3IgPSB7XHJcbiAgICAgICAgICAgICAgICAgICAgeDogYW5jaG9yUG9pbnRVdGlsaXRpZXMuZ2V0QW5jaG9yc0FzQXJyYXkoZWRnZUNvbnRhaW5pbmdGaXJzdEFuY2hvcilbMF0sXHJcbiAgICAgICAgICAgICAgICAgICAgeTogYW5jaG9yUG9pbnRVdGlsaXRpZXMuZ2V0QW5jaG9yc0FzQXJyYXkoZWRnZUNvbnRhaW5pbmdGaXJzdEFuY2hvcilbMV1cclxuICAgICAgICAgICAgICAgIH07XHJcblxyXG5cclxuICAgICAgICAgICAgICAgIG1vdmVhbmNob3JwYXJhbS5wb3NpdGlvbkRpZmYgPSB7XHJcbiAgICAgICAgICAgICAgICAgICAgeDogLW1vdmVkRmlyc3RBbmNob3IueCArIGluaXRpYWxQb3MueCxcclxuICAgICAgICAgICAgICAgICAgICB5OiAtbW92ZWRGaXJzdEFuY2hvci55ICsgaW5pdGlhbFBvcy55XHJcbiAgICAgICAgICAgICAgICB9XHJcblxyXG4gICAgICAgICAgICAgICAgZGVsZXRlIG1vdmVhbmNob3JwYXJhbS5maXJzdEFuY2hvclBvc2l0aW9uO1xyXG5cclxuICAgICAgICAgICAgICAgIGlmKG9wdGlvbnMoKS51bmRvYWJsZSkge1xyXG4gICAgICAgICAgICAgICAgICAgIGN5LnVuZG9SZWRvKCkuZG8oXCJtb3ZlQW5jaG9yUG9pbnRzXCIsIG1vdmVhbmNob3JwYXJhbSk7XHJcbiAgICAgICAgICAgICAgICB9XHJcblxyXG4gICAgICAgICAgICAgICAgbW92ZWFuY2hvcnBhcmFtID0gdW5kZWZpbmVkO1xyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgfSk7XHJcblxyXG4gICAgICAgIGN5Lm9uKCdjeHR0YXAnLCBlQ3h0VGFwID0gZnVuY3Rpb24gKGV2ZW50KSB7XHJcbiAgICAgICAgICB2YXIgdGFyZ2V0ID0gZXZlbnQudGFyZ2V0IHx8IGV2ZW50LmN5VGFyZ2V0O1xyXG4gICAgICAgICAgdmFyIHRhcmdldElzRWRnZSA9IGZhbHNlO1xyXG5cclxuICAgICAgICAgIHRyeXtcclxuICAgICAgICAgICAgdGFyZ2V0SXNFZGdlID0gdGFyZ2V0LmlzRWRnZSgpO1xyXG4gICAgICAgICAgfVxyXG4gICAgICAgICAgY2F0Y2goZXJyKXtcclxuICAgICAgICAgICAgLy8gdGhpcyBpcyBoZXJlIGp1c3QgdG8gc3VwcHJlc3MgdGhlIGVycm9yXHJcbiAgICAgICAgICB9XHJcblxyXG4gICAgICAgICAgdmFyIGVkZ2UsIHR5cGU7XHJcbiAgICAgICAgICBpZih0YXJnZXRJc0VkZ2Upe1xyXG4gICAgICAgICAgICBlZGdlID0gdGFyZ2V0O1xyXG4gICAgICAgICAgICB0eXBlID0gYW5jaG9yUG9pbnRVdGlsaXRpZXMuZ2V0RWRnZVR5cGUoZWRnZSk7XHJcbiAgICAgICAgICB9XHJcbiAgICAgICAgICBlbHNle1xyXG4gICAgICAgICAgICBlZGdlID0gYW5jaG9yTWFuYWdlci5lZGdlOyAgICAgICAgICBcclxuICAgICAgICAgICAgdHlwZSA9IGFuY2hvck1hbmFnZXIuZWRnZVR5cGU7XHJcbiAgICAgICAgICB9XHJcblxyXG4gICAgICAgICAgdmFyIG1lbnVzID0gY3kuY29udGV4dE1lbnVzKCdnZXQnKTsgLy8gZ2V0IGNvbnRleHQgbWVudXMgaW5zdGFuY2VcclxuICAgICAgICAgIFxyXG4gICAgICAgICAgaWYoIWVkZ2VUb0hpZ2hsaWdodCB8fCBlZGdlVG9IaWdobGlnaHQuaWQoKSAhPSBlZGdlLmlkKCkgfHwgYW5jaG9yUG9pbnRVdGlsaXRpZXMuaXNJZ25vcmVkRWRnZShlZGdlKSB8fFxyXG4gICAgICAgICAgICAgIGVkZ2VUb0hpZ2hsaWdodCAhPT0gZWRnZSkge1xyXG4gICAgICAgICAgICBtZW51cy5oaWRlTWVudUl0ZW0ocmVtb3ZlQmVuZFBvaW50Q3h0TWVudUlkKTtcclxuICAgICAgICAgICAgbWVudXMuaGlkZU1lbnVJdGVtKGFkZEJlbmRQb2ludEN4dE1lbnVJZCk7XHJcbiAgICAgICAgICAgIG1lbnVzLmhpZGVNZW51SXRlbShyZW1vdmVDb250cm9sUG9pbnRDeHRNZW51SWQpO1xyXG4gICAgICAgICAgICBtZW51cy5oaWRlTWVudUl0ZW0oYWRkQ29udHJvbFBvaW50Q3h0TWVudUlkKTtcclxuICAgICAgICAgICAgcmV0dXJuO1xyXG4gICAgICAgICAgfVxyXG5cclxuICAgICAgICAgIHZhciBjeVBvcyA9IGV2ZW50LnBvc2l0aW9uIHx8IGV2ZW50LmN5UG9zaXRpb247XHJcbiAgICAgICAgICB2YXIgc2VsZWN0ZWRJbmRleCA9IGdldENvbnRhaW5pbmdTaGFwZUluZGV4KGN5UG9zLngsIGN5UG9zLnksIGVkZ2UpO1xyXG4gICAgICAgICAgaWYgKHNlbGVjdGVkSW5kZXggPT0gLTEpIHtcclxuICAgICAgICAgICAgbWVudXMuaGlkZU1lbnVJdGVtKHJlbW92ZUJlbmRQb2ludEN4dE1lbnVJZCk7XHJcbiAgICAgICAgICAgIG1lbnVzLmhpZGVNZW51SXRlbShyZW1vdmVDb250cm9sUG9pbnRDeHRNZW51SWQpO1xyXG4gICAgICAgICAgICBpZih0eXBlID09PSAnY29udHJvbCcpe1xyXG4gICAgICAgICAgICAgIG1lbnVzLnNob3dNZW51SXRlbShhZGRDb250cm9sUG9pbnRDeHRNZW51SWQpO1xyXG4gICAgICAgICAgICAgIG1lbnVzLmhpZGVNZW51SXRlbShhZGRCZW5kUG9pbnRDeHRNZW51SWQpO1xyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgICAgIGVsc2UgaWYodHlwZSA9PT0gJ2JlbmQnKXtcclxuICAgICAgICAgICAgICBtZW51cy5zaG93TWVudUl0ZW0oYWRkQmVuZFBvaW50Q3h0TWVudUlkKTtcclxuICAgICAgICAgICAgICBtZW51cy5oaWRlTWVudUl0ZW0oYWRkQ29udHJvbFBvaW50Q3h0TWVudUlkKTtcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICBlbHNle1xyXG4gICAgICAgICAgICAgIG1lbnVzLnNob3dNZW51SXRlbShhZGRCZW5kUG9pbnRDeHRNZW51SWQpO1xyXG4gICAgICAgICAgICAgIG1lbnVzLnNob3dNZW51SXRlbShhZGRDb250cm9sUG9pbnRDeHRNZW51SWQpO1xyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgICAgIGFuY2hvclBvaW50VXRpbGl0aWVzLmN1cnJlbnRDdHhQb3MgPSBjeVBvcztcclxuICAgICAgICAgIH1cclxuICAgICAgICAgIGVsc2Uge1xyXG4gICAgICAgICAgICBtZW51cy5oaWRlTWVudUl0ZW0oYWRkQmVuZFBvaW50Q3h0TWVudUlkKTtcclxuICAgICAgICAgICAgbWVudXMuaGlkZU1lbnVJdGVtKGFkZENvbnRyb2xQb2ludEN4dE1lbnVJZCk7XHJcbiAgICAgICAgICAgIGlmKHR5cGUgPT09ICdjb250cm9sJyl7XHJcbiAgICAgICAgICAgICAgbWVudXMuc2hvd01lbnVJdGVtKHJlbW92ZUNvbnRyb2xQb2ludEN4dE1lbnVJZCk7XHJcbiAgICAgICAgICAgICAgbWVudXMuaGlkZU1lbnVJdGVtKHJlbW92ZUJlbmRQb2ludEN4dE1lbnVJZCk7XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgZWxzZSBpZih0eXBlID09PSAnYmVuZCcpe1xyXG4gICAgICAgICAgICAgIG1lbnVzLnNob3dNZW51SXRlbShyZW1vdmVCZW5kUG9pbnRDeHRNZW51SWQpO1xyXG4gICAgICAgICAgICAgIG1lbnVzLmhpZGVNZW51SXRlbShyZW1vdmVDb250cm9sUG9pbnRDeHRNZW51SWQpO1xyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgICAgIGVsc2V7XHJcbiAgICAgICAgICAgICAgbWVudXMuaGlkZU1lbnVJdGVtKHJlbW92ZUJlbmRQb2ludEN4dE1lbnVJZCk7XHJcbiAgICAgICAgICAgICAgbWVudXMuaGlkZU1lbnVJdGVtKHJlbW92ZUNvbnRyb2xQb2ludEN4dE1lbnVJZCk7XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgYW5jaG9yUG9pbnRVdGlsaXRpZXMuY3VycmVudEFuY2hvckluZGV4ID0gc2VsZWN0ZWRJbmRleDtcclxuICAgICAgICAgIH1cclxuXHJcbiAgICAgICAgICBhbmNob3JQb2ludFV0aWxpdGllcy5jdXJyZW50Q3R4RWRnZSA9IGVkZ2U7XHJcbiAgICAgICAgfSk7XHJcbiAgICAgICAgXHJcbiAgICAgICAgY3kub24oJ2N5ZWRnZWVkaXRpbmcuY2hhbmdlQW5jaG9yUG9pbnRzJywgJ2VkZ2UnLCBmdW5jdGlvbigpIHtcclxuICAgICAgICAgIHZhciBlZGdlID0gdGhpcztcclxuICAgICAgICAgIGN5LnN0YXJ0QmF0Y2goKTtcclxuICAgICAgICAgIGN5LmVkZ2VzKCkudW5zZWxlY3QoKTsgXHJcbiAgICAgICAgICAgICAgICAgICAgXHJcbiAgICAgICAgICAvLyBMaXN0ZW5lciBkZWZpbmVkIGluIG90aGVyIGV4dGVuc2lvblxyXG4gICAgICAgICAgLy8gTWlnaHQgaGF2ZSBjb21wYXRpYmlsaXR5IGlzc3VlcyBhZnRlciB0aGUgdW5idW5kbGVkIGJlemllciAgICBcclxuICAgICAgICAgIGN5LnRyaWdnZXIoJ2JlbmRQb2ludE1vdmVtZW50Jyk7ICAgIFxyXG4gICAgICAgICAgXHJcbiAgICAgICAgICBjeS5lbmRCYXRjaCgpOyAgICAgICAgICBcclxuICAgICAgICAgIHJlZnJlc2hEcmF3cygpO1xyXG4gICAgICAgIFxyXG4gICAgICAgICAgXHJcbiAgICAgICAgfSk7XHJcbiAgICAgIH1cclxuXHJcbiAgICAgIHZhciBzZWxlY3RlZEVkZ2VzO1xyXG4gICAgICB2YXIgYW5jaG9yc01vdmluZyA9IGZhbHNlO1xyXG5cclxuICAgICAgZnVuY3Rpb24ga2V5RG93bihlKSB7XHJcbiAgICAgICAgY3kuYXV0b3Vuc2VsZWN0aWZ5KGZhbHNlKTtcclxuXHJcbiAgICAgICAgICB2YXIgc2hvdWxkTW92ZSA9IHR5cGVvZiBvcHRpb25zKCkubW92ZVNlbGVjdGVkQW5jaG9yc09uS2V5RXZlbnRzID09PSAnZnVuY3Rpb24nXHJcbiAgICAgICAgICAgICAgPyBvcHRpb25zKCkubW92ZVNlbGVjdGVkQW5jaG9yc09uS2V5RXZlbnRzKCkgOiBvcHRpb25zKCkubW92ZVNlbGVjdGVkQW5jaG9yc09uS2V5RXZlbnRzO1xyXG5cclxuICAgICAgICAgIGlmICghc2hvdWxkTW92ZSkge1xyXG4gICAgICAgICAgICAgIHJldHVybjtcclxuICAgICAgICAgIH1cclxuXHJcbiAgICAgICAgICAvL0NoZWNrcyBpZiB0aGUgdGFnbmFtZSBpcyB0ZXh0YXJlYSBvciBpbnB1dFxyXG4gICAgICAgICAgdmFyIHRuID0gZG9jdW1lbnQuYWN0aXZlRWxlbWVudC50YWdOYW1lO1xyXG4gICAgICAgICAgaWYgKHRuICE9IFwiVEVYVEFSRUFcIiAmJiB0biAhPSBcIklOUFVUXCIpXHJcbiAgICAgICAgICB7XHJcbiAgICAgICAgICAgICAgc3dpdGNoKGUua2V5Q29kZSl7XHJcbiAgICAgICAgICAgICAgICAgIGNhc2UgMzc6IGNhc2UgMzk6IGNhc2UgMzg6ICBjYXNlIDQwOiAvLyBBcnJvdyBrZXlzXHJcbiAgICAgICAgICAgICAgICAgIGNhc2UgMzI6IGUucHJldmVudERlZmF1bHQoKTsgYnJlYWs7IC8vIFNwYWNlXHJcbiAgICAgICAgICAgICAgICAgIGRlZmF1bHQ6IGJyZWFrOyAvLyBkbyBub3QgYmxvY2sgb3RoZXIga2V5c1xyXG4gICAgICAgICAgICAgIH1cclxuXHJcblxyXG4gICAgICAgICAgICAgIGlmIChlLmtleUNvZGUgPCAnMzcnIHx8IGUua2V5Q29kZSA+ICc0MCcpIHtcclxuICAgICAgICAgICAgICAgICAgcmV0dXJuO1xyXG4gICAgICAgICAgICAgIH1cclxuXHJcbiAgICAgICAgICAgICAgLy9DaGVja3MgaWYgb25seSBlZGdlcyBhcmUgc2VsZWN0ZWQgKG5vdCBhbnkgbm9kZSkgYW5kIGlmIG9ubHkgMSBlZGdlIGlzIHNlbGVjdGVkXHJcbiAgICAgICAgICAgICAgLy9JZiB0aGUgc2Vjb25kIGNoZWNraW5nIGlzIHJlbW92ZWQgdGhlIGFuY2hvcnMgb2YgbXVsdGlwbGUgZWRnZXMgd291bGQgbW92ZVxyXG4gICAgICAgICAgICAgIGlmIChjeS5lZGdlcyhcIjpzZWxlY3RlZFwiKS5sZW5ndGggIT0gY3kuZWxlbWVudHMoXCI6c2VsZWN0ZWRcIikubGVuZ3RoIHx8IGN5LmVkZ2VzKFwiOnNlbGVjdGVkXCIpLmxlbmd0aCAhPSAxKVxyXG4gICAgICAgICAgICAgIHtcclxuICAgICAgICAgICAgICAgIHJldHVybjtcclxuICAgICAgICAgICAgICB9XHJcblxyXG4gICAgICAgICAgICAgIGlmICghYW5jaG9yc01vdmluZylcclxuICAgICAgICAgICAgICB7XHJcbiAgICAgICAgICAgICAgICAgIHNlbGVjdGVkRWRnZXMgPSBjeS5lZGdlcygnOnNlbGVjdGVkJyk7XHJcbiAgICAgICAgICAgICAgICAgIGN5LnRyaWdnZXIoXCJlZGdlZWRpdGluZy5tb3Zlc3RhcnRcIiwgW3NlbGVjdGVkRWRnZXNdKTtcclxuICAgICAgICAgICAgICAgICAgYW5jaG9yc01vdmluZyA9IHRydWU7XHJcbiAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgIGlmIChlLmFsdEtleSAmJiBlLndoaWNoID09ICczOCcpIHtcclxuICAgICAgICAgICAgICAgICAgLy8gdXAgYXJyb3cgYW5kIGFsdFxyXG4gICAgICAgICAgICAgICAgICBtb3ZlQW5jaG9yUG9pbnRzICh7eDowLCB5Oi0xfSxzZWxlY3RlZEVkZ2VzKTtcclxuICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgZWxzZSBpZiAoZS5hbHRLZXkgJiYgZS53aGljaCA9PSAnNDAnKSB7XHJcbiAgICAgICAgICAgICAgICAgIC8vIGRvd24gYXJyb3cgYW5kIGFsdFxyXG4gICAgICAgICAgICAgICAgICBtb3ZlQW5jaG9yUG9pbnRzICh7eDowLCB5OjF9LHNlbGVjdGVkRWRnZXMpO1xyXG4gICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICBlbHNlIGlmIChlLmFsdEtleSAmJiBlLndoaWNoID09ICczNycpIHtcclxuICAgICAgICAgICAgICAgICAgLy8gbGVmdCBhcnJvdyBhbmQgYWx0XHJcbiAgICAgICAgICAgICAgICAgIG1vdmVBbmNob3JQb2ludHMgKHt4Oi0xLCB5OjB9LHNlbGVjdGVkRWRnZXMpO1xyXG4gICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICBlbHNlIGlmIChlLmFsdEtleSAmJiBlLndoaWNoID09ICczOScpIHtcclxuICAgICAgICAgICAgICAgICAgLy8gcmlnaHQgYXJyb3cgYW5kIGFsdFxyXG4gICAgICAgICAgICAgICAgICBtb3ZlQW5jaG9yUG9pbnRzICh7eDoxLCB5OjB9LHNlbGVjdGVkRWRnZXMpO1xyXG4gICAgICAgICAgICAgIH1cclxuXHJcbiAgICAgICAgICAgICAgZWxzZSBpZiAoZS5zaGlmdEtleSAmJiBlLndoaWNoID09ICczOCcpIHtcclxuICAgICAgICAgICAgICAgICAgLy8gdXAgYXJyb3cgYW5kIHNoaWZ0XHJcbiAgICAgICAgICAgICAgICAgIG1vdmVBbmNob3JQb2ludHMgKHt4OjAsIHk6LTEwfSxzZWxlY3RlZEVkZ2VzKTtcclxuICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgZWxzZSBpZiAoZS5zaGlmdEtleSAmJiBlLndoaWNoID09ICc0MCcpIHtcclxuICAgICAgICAgICAgICAgICAgLy8gZG93biBhcnJvdyBhbmQgc2hpZnRcclxuICAgICAgICAgICAgICAgICAgbW92ZUFuY2hvclBvaW50cyAoe3g6MCwgeToxMH0sc2VsZWN0ZWRFZGdlcyk7XHJcbiAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgIGVsc2UgaWYgKGUuc2hpZnRLZXkgJiYgZS53aGljaCA9PSAnMzcnKSB7XHJcbiAgICAgICAgICAgICAgICAgIC8vIGxlZnQgYXJyb3cgYW5kIHNoaWZ0XHJcbiAgICAgICAgICAgICAgICAgIG1vdmVBbmNob3JQb2ludHMgKHt4Oi0xMCwgeTowfSxzZWxlY3RlZEVkZ2VzKTtcclxuXHJcbiAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgIGVsc2UgaWYgKGUuc2hpZnRLZXkgJiYgZS53aGljaCA9PSAnMzknICkge1xyXG4gICAgICAgICAgICAgICAgICAvLyByaWdodCBhcnJvdyBhbmQgc2hpZnRcclxuICAgICAgICAgICAgICAgICAgbW92ZUFuY2hvclBvaW50cyAoe3g6MTAsIHk6MH0sc2VsZWN0ZWRFZGdlcyk7XHJcbiAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgIGVsc2UgaWYgKGUua2V5Q29kZSA9PSAnMzgnKSB7XHJcbiAgICAgICAgICAgICAgICAgIC8vIHVwIGFycm93XHJcbiAgICAgICAgICAgICAgICAgIG1vdmVBbmNob3JQb2ludHMoe3g6IDAsIHk6IC0zfSwgc2VsZWN0ZWRFZGdlcyk7XHJcbiAgICAgICAgICAgICAgfVxyXG5cclxuICAgICAgICAgICAgICBlbHNlIGlmIChlLmtleUNvZGUgPT0gJzQwJykge1xyXG4gICAgICAgICAgICAgICAgICAvLyBkb3duIGFycm93XHJcbiAgICAgICAgICAgICAgICAgIG1vdmVBbmNob3JQb2ludHMgKHt4OjAsIHk6M30sc2VsZWN0ZWRFZGdlcyk7XHJcbiAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgIGVsc2UgaWYgKGUua2V5Q29kZSA9PSAnMzcnKSB7XHJcbiAgICAgICAgICAgICAgICAgIC8vIGxlZnQgYXJyb3dcclxuICAgICAgICAgICAgICAgICAgbW92ZUFuY2hvclBvaW50cyAoe3g6LTMsIHk6MH0sc2VsZWN0ZWRFZGdlcyk7XHJcbiAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgIGVsc2UgaWYgKGUua2V5Q29kZSA9PSAnMzknKSB7XHJcbiAgICAgICAgICAgICAgICAgIC8vcmlnaHQgYXJyb3dcclxuICAgICAgICAgICAgICAgICAgbW92ZUFuY2hvclBvaW50cyAoe3g6MywgeTowfSxzZWxlY3RlZEVkZ2VzKTtcclxuICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICB9XHJcbiAgICAgIH1cclxuICAgICAgZnVuY3Rpb24ga2V5VXAoZSkge1xyXG5cclxuICAgICAgICAgIGlmIChlLmtleUNvZGUgPCAnMzcnIHx8IGUua2V5Q29kZSA+ICc0MCcpIHtcclxuICAgICAgICAgICAgICByZXR1cm47XHJcbiAgICAgICAgICB9XHJcblxyXG4gICAgICAgICAgdmFyIHNob3VsZE1vdmUgPSB0eXBlb2Ygb3B0aW9ucygpLm1vdmVTZWxlY3RlZEFuY2hvcnNPbktleUV2ZW50cyA9PT0gJ2Z1bmN0aW9uJ1xyXG4gICAgICAgICAgICAgID8gb3B0aW9ucygpLm1vdmVTZWxlY3RlZEFuY2hvcnNPbktleUV2ZW50cygpIDogb3B0aW9ucygpLm1vdmVTZWxlY3RlZEFuY2hvcnNPbktleUV2ZW50cztcclxuXHJcbiAgICAgICAgICBpZiAoIXNob3VsZE1vdmUpIHtcclxuICAgICAgICAgICAgICByZXR1cm47XHJcbiAgICAgICAgICB9XHJcblxyXG4gICAgICAgICAgY3kudHJpZ2dlcihcImVkZ2VlZGl0aW5nLm1vdmVlbmRcIiwgW3NlbGVjdGVkRWRnZXNdKTtcclxuICAgICAgICAgIHNlbGVjdGVkRWRnZXMgPSB1bmRlZmluZWQ7XHJcbiAgICAgICAgICBhbmNob3JzTW92aW5nID0gZmFsc2U7XHJcblxyXG4gICAgICB9XHJcbiAgICAgIGRvY3VtZW50LmFkZEV2ZW50TGlzdGVuZXIoXCJrZXlkb3duXCIsa2V5RG93biwgdHJ1ZSk7XHJcbiAgICAgIGRvY3VtZW50LmFkZEV2ZW50TGlzdGVuZXIoXCJrZXl1cFwiLGtleVVwLCB0cnVlKTtcclxuXHJcbiAgICAgICRjb250YWluZXIuZGF0YSgnY3llZGdlZWRpdGluZycsIGRhdGEpO1xyXG4gICAgfSxcclxuICAgIHVuYmluZDogZnVuY3Rpb24gKCkge1xyXG4gICAgICAgIGN5Lm9mZigncmVtb3ZlJywgJ25vZGUnLCBlUmVtb3ZlKVxyXG4gICAgICAgICAgLm9mZignYWRkJywgJ25vZGUnLCBlQWRkKVxyXG4gICAgICAgICAgLm9mZignc3R5bGUnLCAnZWRnZS5lZGdlYmVuZGVkaXRpbmctaGFzYmVuZHBvaW50czpzZWxlY3RlZCwgZWRnZS5lZGdlY29udHJvbGVkaXRpbmctaGFzY29udHJvbHBvaW50czpzZWxlY3RlZCcsIGVTdHlsZSlcclxuICAgICAgICAgIC5vZmYoJ3NlbGVjdCcsICdlZGdlJywgZVNlbGVjdClcclxuICAgICAgICAgIC5vZmYoJ3Vuc2VsZWN0JywgJ2VkZ2UnLCBlVW5zZWxlY3QpXHJcbiAgICAgICAgICAub2ZmKCd0YXBzdGFydCcsIGVUYXBTdGFydClcclxuICAgICAgICAgIC5vZmYoJ3RhcHN0YXJ0JywgJ2VkZ2UnLCBlVGFwU3RhcnRPbkVkZ2UpXHJcbiAgICAgICAgICAub2ZmKCd0YXBkcmFnJywgZVRhcERyYWcpXHJcbiAgICAgICAgICAub2ZmKCd0YXBlbmQnLCBlVGFwRW5kKVxyXG4gICAgICAgICAgLm9mZignY3h0dGFwJywgZUN4dFRhcClcclxuICAgICAgICAgIC5vZmYoJ2RyYWcnLCAnbm9kZScsZURyYWcpO1xyXG5cclxuICAgICAgICBjeS51bmJpbmQoXCJ6b29tIHBhblwiLCBlWm9vbSk7XHJcbiAgICB9XHJcbiAgfTtcclxuXHJcbiAgaWYgKGZ1bmN0aW9uc1tmbl0pIHtcclxuICAgIHJldHVybiBmdW5jdGlvbnNbZm5dLmFwcGx5KCQoY3kuY29udGFpbmVyKCkpLCBBcnJheS5wcm90b3R5cGUuc2xpY2UuY2FsbChhcmd1bWVudHMsIDEpKTtcclxuICB9IGVsc2UgaWYgKHR5cGVvZiBmbiA9PSAnb2JqZWN0JyB8fCAhZm4pIHtcclxuICAgIHJldHVybiBmdW5jdGlvbnMuaW5pdC5hcHBseSgkKGN5LmNvbnRhaW5lcigpKSwgYXJndW1lbnRzKTtcclxuICB9IGVsc2Uge1xyXG4gICAgJC5lcnJvcignTm8gc3VjaCBmdW5jdGlvbiBgJyArIGZuICsgJ2AgZm9yIGN5dG9zY2FwZS5qcy1lZGdlLWVkaXRpbmcnKTtcclxuICB9XHJcblxyXG4gIHJldHVybiAkKHRoaXMpO1xyXG59O1xyXG4iLCJ2YXIgZGVib3VuY2UgPSAoZnVuY3Rpb24gKCkge1xyXG4gIC8qKlxyXG4gICAqIGxvZGFzaCAzLjEuMSAoQ3VzdG9tIEJ1aWxkKSA8aHR0cHM6Ly9sb2Rhc2guY29tLz5cclxuICAgKiBCdWlsZDogYGxvZGFzaCBtb2Rlcm4gbW9kdWxhcml6ZSBleHBvcnRzPVwibnBtXCIgLW8gLi9gXHJcbiAgICogQ29weXJpZ2h0IDIwMTItMjAxNSBUaGUgRG9qbyBGb3VuZGF0aW9uIDxodHRwOi8vZG9qb2ZvdW5kYXRpb24ub3JnLz5cclxuICAgKiBCYXNlZCBvbiBVbmRlcnNjb3JlLmpzIDEuOC4zIDxodHRwOi8vdW5kZXJzY29yZWpzLm9yZy9MSUNFTlNFPlxyXG4gICAqIENvcHlyaWdodCAyMDA5LTIwMTUgSmVyZW15IEFzaGtlbmFzLCBEb2N1bWVudENsb3VkIGFuZCBJbnZlc3RpZ2F0aXZlIFJlcG9ydGVycyAmIEVkaXRvcnNcclxuICAgKiBBdmFpbGFibGUgdW5kZXIgTUlUIGxpY2Vuc2UgPGh0dHBzOi8vbG9kYXNoLmNvbS9saWNlbnNlPlxyXG4gICAqL1xyXG4gIC8qKiBVc2VkIGFzIHRoZSBgVHlwZUVycm9yYCBtZXNzYWdlIGZvciBcIkZ1bmN0aW9uc1wiIG1ldGhvZHMuICovXHJcbiAgdmFyIEZVTkNfRVJST1JfVEVYVCA9ICdFeHBlY3RlZCBhIGZ1bmN0aW9uJztcclxuXHJcbiAgLyogTmF0aXZlIG1ldGhvZCByZWZlcmVuY2VzIGZvciB0aG9zZSB3aXRoIHRoZSBzYW1lIG5hbWUgYXMgb3RoZXIgYGxvZGFzaGAgbWV0aG9kcy4gKi9cclxuICB2YXIgbmF0aXZlTWF4ID0gTWF0aC5tYXgsXHJcbiAgICAgICAgICBuYXRpdmVOb3cgPSBEYXRlLm5vdztcclxuXHJcbiAgLyoqXHJcbiAgICogR2V0cyB0aGUgbnVtYmVyIG9mIG1pbGxpc2Vjb25kcyB0aGF0IGhhdmUgZWxhcHNlZCBzaW5jZSB0aGUgVW5peCBlcG9jaFxyXG4gICAqICgxIEphbnVhcnkgMTk3MCAwMDowMDowMCBVVEMpLlxyXG4gICAqXHJcbiAgICogQHN0YXRpY1xyXG4gICAqIEBtZW1iZXJPZiBfXHJcbiAgICogQGNhdGVnb3J5IERhdGVcclxuICAgKiBAZXhhbXBsZVxyXG4gICAqXHJcbiAgICogXy5kZWZlcihmdW5jdGlvbihzdGFtcCkge1xyXG4gICAqICAgY29uc29sZS5sb2coXy5ub3coKSAtIHN0YW1wKTtcclxuICAgKiB9LCBfLm5vdygpKTtcclxuICAgKiAvLyA9PiBsb2dzIHRoZSBudW1iZXIgb2YgbWlsbGlzZWNvbmRzIGl0IHRvb2sgZm9yIHRoZSBkZWZlcnJlZCBmdW5jdGlvbiB0byBiZSBpbnZva2VkXHJcbiAgICovXHJcbiAgdmFyIG5vdyA9IG5hdGl2ZU5vdyB8fCBmdW5jdGlvbiAoKSB7XHJcbiAgICByZXR1cm4gbmV3IERhdGUoKS5nZXRUaW1lKCk7XHJcbiAgfTtcclxuXHJcbiAgLyoqXHJcbiAgICogQ3JlYXRlcyBhIGRlYm91bmNlZCBmdW5jdGlvbiB0aGF0IGRlbGF5cyBpbnZva2luZyBgZnVuY2AgdW50aWwgYWZ0ZXIgYHdhaXRgXHJcbiAgICogbWlsbGlzZWNvbmRzIGhhdmUgZWxhcHNlZCBzaW5jZSB0aGUgbGFzdCB0aW1lIHRoZSBkZWJvdW5jZWQgZnVuY3Rpb24gd2FzXHJcbiAgICogaW52b2tlZC4gVGhlIGRlYm91bmNlZCBmdW5jdGlvbiBjb21lcyB3aXRoIGEgYGNhbmNlbGAgbWV0aG9kIHRvIGNhbmNlbFxyXG4gICAqIGRlbGF5ZWQgaW52b2NhdGlvbnMuIFByb3ZpZGUgYW4gb3B0aW9ucyBvYmplY3QgdG8gaW5kaWNhdGUgdGhhdCBgZnVuY2BcclxuICAgKiBzaG91bGQgYmUgaW52b2tlZCBvbiB0aGUgbGVhZGluZyBhbmQvb3IgdHJhaWxpbmcgZWRnZSBvZiB0aGUgYHdhaXRgIHRpbWVvdXQuXHJcbiAgICogU3Vic2VxdWVudCBjYWxscyB0byB0aGUgZGVib3VuY2VkIGZ1bmN0aW9uIHJldHVybiB0aGUgcmVzdWx0IG9mIHRoZSBsYXN0XHJcbiAgICogYGZ1bmNgIGludm9jYXRpb24uXHJcbiAgICpcclxuICAgKiAqKk5vdGU6KiogSWYgYGxlYWRpbmdgIGFuZCBgdHJhaWxpbmdgIG9wdGlvbnMgYXJlIGB0cnVlYCwgYGZ1bmNgIGlzIGludm9rZWRcclxuICAgKiBvbiB0aGUgdHJhaWxpbmcgZWRnZSBvZiB0aGUgdGltZW91dCBvbmx5IGlmIHRoZSB0aGUgZGVib3VuY2VkIGZ1bmN0aW9uIGlzXHJcbiAgICogaW52b2tlZCBtb3JlIHRoYW4gb25jZSBkdXJpbmcgdGhlIGB3YWl0YCB0aW1lb3V0LlxyXG4gICAqXHJcbiAgICogU2VlIFtEYXZpZCBDb3JiYWNobydzIGFydGljbGVdKGh0dHA6Ly9kcnVwYWxtb3Rpb24uY29tL2FydGljbGUvZGVib3VuY2UtYW5kLXRocm90dGxlLXZpc3VhbC1leHBsYW5hdGlvbilcclxuICAgKiBmb3IgZGV0YWlscyBvdmVyIHRoZSBkaWZmZXJlbmNlcyBiZXR3ZWVuIGBfLmRlYm91bmNlYCBhbmQgYF8udGhyb3R0bGVgLlxyXG4gICAqXHJcbiAgICogQHN0YXRpY1xyXG4gICAqIEBtZW1iZXJPZiBfXHJcbiAgICogQGNhdGVnb3J5IEZ1bmN0aW9uXHJcbiAgICogQHBhcmFtIHtGdW5jdGlvbn0gZnVuYyBUaGUgZnVuY3Rpb24gdG8gZGVib3VuY2UuXHJcbiAgICogQHBhcmFtIHtudW1iZXJ9IFt3YWl0PTBdIFRoZSBudW1iZXIgb2YgbWlsbGlzZWNvbmRzIHRvIGRlbGF5LlxyXG4gICAqIEBwYXJhbSB7T2JqZWN0fSBbb3B0aW9uc10gVGhlIG9wdGlvbnMgb2JqZWN0LlxyXG4gICAqIEBwYXJhbSB7Ym9vbGVhbn0gW29wdGlvbnMubGVhZGluZz1mYWxzZV0gU3BlY2lmeSBpbnZva2luZyBvbiB0aGUgbGVhZGluZ1xyXG4gICAqICBlZGdlIG9mIHRoZSB0aW1lb3V0LlxyXG4gICAqIEBwYXJhbSB7bnVtYmVyfSBbb3B0aW9ucy5tYXhXYWl0XSBUaGUgbWF4aW11bSB0aW1lIGBmdW5jYCBpcyBhbGxvd2VkIHRvIGJlXHJcbiAgICogIGRlbGF5ZWQgYmVmb3JlIGl0J3MgaW52b2tlZC5cclxuICAgKiBAcGFyYW0ge2Jvb2xlYW59IFtvcHRpb25zLnRyYWlsaW5nPXRydWVdIFNwZWNpZnkgaW52b2tpbmcgb24gdGhlIHRyYWlsaW5nXHJcbiAgICogIGVkZ2Ugb2YgdGhlIHRpbWVvdXQuXHJcbiAgICogQHJldHVybnMge0Z1bmN0aW9ufSBSZXR1cm5zIHRoZSBuZXcgZGVib3VuY2VkIGZ1bmN0aW9uLlxyXG4gICAqIEBleGFtcGxlXHJcbiAgICpcclxuICAgKiAvLyBhdm9pZCBjb3N0bHkgY2FsY3VsYXRpb25zIHdoaWxlIHRoZSB3aW5kb3cgc2l6ZSBpcyBpbiBmbHV4XHJcbiAgICogalF1ZXJ5KHdpbmRvdykub24oJ3Jlc2l6ZScsIF8uZGVib3VuY2UoY2FsY3VsYXRlTGF5b3V0LCAxNTApKTtcclxuICAgKlxyXG4gICAqIC8vIGludm9rZSBgc2VuZE1haWxgIHdoZW4gdGhlIGNsaWNrIGV2ZW50IGlzIGZpcmVkLCBkZWJvdW5jaW5nIHN1YnNlcXVlbnQgY2FsbHNcclxuICAgKiBqUXVlcnkoJyNwb3N0Ym94Jykub24oJ2NsaWNrJywgXy5kZWJvdW5jZShzZW5kTWFpbCwgMzAwLCB7XHJcbiAgICogICAnbGVhZGluZyc6IHRydWUsXHJcbiAgICogICAndHJhaWxpbmcnOiBmYWxzZVxyXG4gICAqIH0pKTtcclxuICAgKlxyXG4gICAqIC8vIGVuc3VyZSBgYmF0Y2hMb2dgIGlzIGludm9rZWQgb25jZSBhZnRlciAxIHNlY29uZCBvZiBkZWJvdW5jZWQgY2FsbHNcclxuICAgKiB2YXIgc291cmNlID0gbmV3IEV2ZW50U291cmNlKCcvc3RyZWFtJyk7XHJcbiAgICogalF1ZXJ5KHNvdXJjZSkub24oJ21lc3NhZ2UnLCBfLmRlYm91bmNlKGJhdGNoTG9nLCAyNTAsIHtcclxuICAgKiAgICdtYXhXYWl0JzogMTAwMFxyXG4gICAqIH0pKTtcclxuICAgKlxyXG4gICAqIC8vIGNhbmNlbCBhIGRlYm91bmNlZCBjYWxsXHJcbiAgICogdmFyIHRvZG9DaGFuZ2VzID0gXy5kZWJvdW5jZShiYXRjaExvZywgMTAwMCk7XHJcbiAgICogT2JqZWN0Lm9ic2VydmUobW9kZWxzLnRvZG8sIHRvZG9DaGFuZ2VzKTtcclxuICAgKlxyXG4gICAqIE9iamVjdC5vYnNlcnZlKG1vZGVscywgZnVuY3Rpb24oY2hhbmdlcykge1xyXG4gICAqICAgaWYgKF8uZmluZChjaGFuZ2VzLCB7ICd1c2VyJzogJ3RvZG8nLCAndHlwZSc6ICdkZWxldGUnfSkpIHtcclxuICAgKiAgICAgdG9kb0NoYW5nZXMuY2FuY2VsKCk7XHJcbiAgICogICB9XHJcbiAgICogfSwgWydkZWxldGUnXSk7XHJcbiAgICpcclxuICAgKiAvLyAuLi5hdCBzb21lIHBvaW50IGBtb2RlbHMudG9kb2AgaXMgY2hhbmdlZFxyXG4gICAqIG1vZGVscy50b2RvLmNvbXBsZXRlZCA9IHRydWU7XHJcbiAgICpcclxuICAgKiAvLyAuLi5iZWZvcmUgMSBzZWNvbmQgaGFzIHBhc3NlZCBgbW9kZWxzLnRvZG9gIGlzIGRlbGV0ZWRcclxuICAgKiAvLyB3aGljaCBjYW5jZWxzIHRoZSBkZWJvdW5jZWQgYHRvZG9DaGFuZ2VzYCBjYWxsXHJcbiAgICogZGVsZXRlIG1vZGVscy50b2RvO1xyXG4gICAqL1xyXG4gIGZ1bmN0aW9uIGRlYm91bmNlKGZ1bmMsIHdhaXQsIG9wdGlvbnMpIHtcclxuICAgIHZhciBhcmdzLFxyXG4gICAgICAgICAgICBtYXhUaW1lb3V0SWQsXHJcbiAgICAgICAgICAgIHJlc3VsdCxcclxuICAgICAgICAgICAgc3RhbXAsXHJcbiAgICAgICAgICAgIHRoaXNBcmcsXHJcbiAgICAgICAgICAgIHRpbWVvdXRJZCxcclxuICAgICAgICAgICAgdHJhaWxpbmdDYWxsLFxyXG4gICAgICAgICAgICBsYXN0Q2FsbGVkID0gMCxcclxuICAgICAgICAgICAgbWF4V2FpdCA9IGZhbHNlLFxyXG4gICAgICAgICAgICB0cmFpbGluZyA9IHRydWU7XHJcblxyXG4gICAgaWYgKHR5cGVvZiBmdW5jICE9ICdmdW5jdGlvbicpIHtcclxuICAgICAgdGhyb3cgbmV3IFR5cGVFcnJvcihGVU5DX0VSUk9SX1RFWFQpO1xyXG4gICAgfVxyXG4gICAgd2FpdCA9IHdhaXQgPCAwID8gMCA6ICgrd2FpdCB8fCAwKTtcclxuICAgIGlmIChvcHRpb25zID09PSB0cnVlKSB7XHJcbiAgICAgIHZhciBsZWFkaW5nID0gdHJ1ZTtcclxuICAgICAgdHJhaWxpbmcgPSBmYWxzZTtcclxuICAgIH0gZWxzZSBpZiAoaXNPYmplY3Qob3B0aW9ucykpIHtcclxuICAgICAgbGVhZGluZyA9ICEhb3B0aW9ucy5sZWFkaW5nO1xyXG4gICAgICBtYXhXYWl0ID0gJ21heFdhaXQnIGluIG9wdGlvbnMgJiYgbmF0aXZlTWF4KCtvcHRpb25zLm1heFdhaXQgfHwgMCwgd2FpdCk7XHJcbiAgICAgIHRyYWlsaW5nID0gJ3RyYWlsaW5nJyBpbiBvcHRpb25zID8gISFvcHRpb25zLnRyYWlsaW5nIDogdHJhaWxpbmc7XHJcbiAgICB9XHJcblxyXG4gICAgZnVuY3Rpb24gY2FuY2VsKCkge1xyXG4gICAgICBpZiAodGltZW91dElkKSB7XHJcbiAgICAgICAgY2xlYXJUaW1lb3V0KHRpbWVvdXRJZCk7XHJcbiAgICAgIH1cclxuICAgICAgaWYgKG1heFRpbWVvdXRJZCkge1xyXG4gICAgICAgIGNsZWFyVGltZW91dChtYXhUaW1lb3V0SWQpO1xyXG4gICAgICB9XHJcbiAgICAgIGxhc3RDYWxsZWQgPSAwO1xyXG4gICAgICBtYXhUaW1lb3V0SWQgPSB0aW1lb3V0SWQgPSB0cmFpbGluZ0NhbGwgPSB1bmRlZmluZWQ7XHJcbiAgICB9XHJcblxyXG4gICAgZnVuY3Rpb24gY29tcGxldGUoaXNDYWxsZWQsIGlkKSB7XHJcbiAgICAgIGlmIChpZCkge1xyXG4gICAgICAgIGNsZWFyVGltZW91dChpZCk7XHJcbiAgICAgIH1cclxuICAgICAgbWF4VGltZW91dElkID0gdGltZW91dElkID0gdHJhaWxpbmdDYWxsID0gdW5kZWZpbmVkO1xyXG4gICAgICBpZiAoaXNDYWxsZWQpIHtcclxuICAgICAgICBsYXN0Q2FsbGVkID0gbm93KCk7XHJcbiAgICAgICAgcmVzdWx0ID0gZnVuYy5hcHBseSh0aGlzQXJnLCBhcmdzKTtcclxuICAgICAgICBpZiAoIXRpbWVvdXRJZCAmJiAhbWF4VGltZW91dElkKSB7XHJcbiAgICAgICAgICBhcmdzID0gdGhpc0FyZyA9IHVuZGVmaW5lZDtcclxuICAgICAgICB9XHJcbiAgICAgIH1cclxuICAgIH1cclxuXHJcbiAgICBmdW5jdGlvbiBkZWxheWVkKCkge1xyXG4gICAgICB2YXIgcmVtYWluaW5nID0gd2FpdCAtIChub3coKSAtIHN0YW1wKTtcclxuICAgICAgaWYgKHJlbWFpbmluZyA8PSAwIHx8IHJlbWFpbmluZyA+IHdhaXQpIHtcclxuICAgICAgICBjb21wbGV0ZSh0cmFpbGluZ0NhbGwsIG1heFRpbWVvdXRJZCk7XHJcbiAgICAgIH0gZWxzZSB7XHJcbiAgICAgICAgdGltZW91dElkID0gc2V0VGltZW91dChkZWxheWVkLCByZW1haW5pbmcpO1xyXG4gICAgICB9XHJcbiAgICB9XHJcblxyXG4gICAgZnVuY3Rpb24gbWF4RGVsYXllZCgpIHtcclxuICAgICAgY29tcGxldGUodHJhaWxpbmcsIHRpbWVvdXRJZCk7XHJcbiAgICB9XHJcblxyXG4gICAgZnVuY3Rpb24gZGVib3VuY2VkKCkge1xyXG4gICAgICBhcmdzID0gYXJndW1lbnRzO1xyXG4gICAgICBzdGFtcCA9IG5vdygpO1xyXG4gICAgICB0aGlzQXJnID0gdGhpcztcclxuICAgICAgdHJhaWxpbmdDYWxsID0gdHJhaWxpbmcgJiYgKHRpbWVvdXRJZCB8fCAhbGVhZGluZyk7XHJcblxyXG4gICAgICBpZiAobWF4V2FpdCA9PT0gZmFsc2UpIHtcclxuICAgICAgICB2YXIgbGVhZGluZ0NhbGwgPSBsZWFkaW5nICYmICF0aW1lb3V0SWQ7XHJcbiAgICAgIH0gZWxzZSB7XHJcbiAgICAgICAgaWYgKCFtYXhUaW1lb3V0SWQgJiYgIWxlYWRpbmcpIHtcclxuICAgICAgICAgIGxhc3RDYWxsZWQgPSBzdGFtcDtcclxuICAgICAgICB9XHJcbiAgICAgICAgdmFyIHJlbWFpbmluZyA9IG1heFdhaXQgLSAoc3RhbXAgLSBsYXN0Q2FsbGVkKSxcclxuICAgICAgICAgICAgICAgIGlzQ2FsbGVkID0gcmVtYWluaW5nIDw9IDAgfHwgcmVtYWluaW5nID4gbWF4V2FpdDtcclxuXHJcbiAgICAgICAgaWYgKGlzQ2FsbGVkKSB7XHJcbiAgICAgICAgICBpZiAobWF4VGltZW91dElkKSB7XHJcbiAgICAgICAgICAgIG1heFRpbWVvdXRJZCA9IGNsZWFyVGltZW91dChtYXhUaW1lb3V0SWQpO1xyXG4gICAgICAgICAgfVxyXG4gICAgICAgICAgbGFzdENhbGxlZCA9IHN0YW1wO1xyXG4gICAgICAgICAgcmVzdWx0ID0gZnVuYy5hcHBseSh0aGlzQXJnLCBhcmdzKTtcclxuICAgICAgICB9XHJcbiAgICAgICAgZWxzZSBpZiAoIW1heFRpbWVvdXRJZCkge1xyXG4gICAgICAgICAgbWF4VGltZW91dElkID0gc2V0VGltZW91dChtYXhEZWxheWVkLCByZW1haW5pbmcpO1xyXG4gICAgICAgIH1cclxuICAgICAgfVxyXG4gICAgICBpZiAoaXNDYWxsZWQgJiYgdGltZW91dElkKSB7XHJcbiAgICAgICAgdGltZW91dElkID0gY2xlYXJUaW1lb3V0KHRpbWVvdXRJZCk7XHJcbiAgICAgIH1cclxuICAgICAgZWxzZSBpZiAoIXRpbWVvdXRJZCAmJiB3YWl0ICE9PSBtYXhXYWl0KSB7XHJcbiAgICAgICAgdGltZW91dElkID0gc2V0VGltZW91dChkZWxheWVkLCB3YWl0KTtcclxuICAgICAgfVxyXG4gICAgICBpZiAobGVhZGluZ0NhbGwpIHtcclxuICAgICAgICBpc0NhbGxlZCA9IHRydWU7XHJcbiAgICAgICAgcmVzdWx0ID0gZnVuYy5hcHBseSh0aGlzQXJnLCBhcmdzKTtcclxuICAgICAgfVxyXG4gICAgICBpZiAoaXNDYWxsZWQgJiYgIXRpbWVvdXRJZCAmJiAhbWF4VGltZW91dElkKSB7XHJcbiAgICAgICAgYXJncyA9IHRoaXNBcmcgPSB1bmRlZmluZWQ7XHJcbiAgICAgIH1cclxuICAgICAgcmV0dXJuIHJlc3VsdDtcclxuICAgIH1cclxuXHJcbiAgICBkZWJvdW5jZWQuY2FuY2VsID0gY2FuY2VsO1xyXG4gICAgcmV0dXJuIGRlYm91bmNlZDtcclxuICB9XHJcblxyXG4gIC8qKlxyXG4gICAqIENoZWNrcyBpZiBgdmFsdWVgIGlzIHRoZSBbbGFuZ3VhZ2UgdHlwZV0oaHR0cHM6Ly9lczUuZ2l0aHViLmlvLyN4OCkgb2YgYE9iamVjdGAuXHJcbiAgICogKGUuZy4gYXJyYXlzLCBmdW5jdGlvbnMsIG9iamVjdHMsIHJlZ2V4ZXMsIGBuZXcgTnVtYmVyKDApYCwgYW5kIGBuZXcgU3RyaW5nKCcnKWApXHJcbiAgICpcclxuICAgKiBAc3RhdGljXHJcbiAgICogQG1lbWJlck9mIF9cclxuICAgKiBAY2F0ZWdvcnkgTGFuZ1xyXG4gICAqIEBwYXJhbSB7Kn0gdmFsdWUgVGhlIHZhbHVlIHRvIGNoZWNrLlxyXG4gICAqIEByZXR1cm5zIHtib29sZWFufSBSZXR1cm5zIGB0cnVlYCBpZiBgdmFsdWVgIGlzIGFuIG9iamVjdCwgZWxzZSBgZmFsc2VgLlxyXG4gICAqIEBleGFtcGxlXHJcbiAgICpcclxuICAgKiBfLmlzT2JqZWN0KHt9KTtcclxuICAgKiAvLyA9PiB0cnVlXHJcbiAgICpcclxuICAgKiBfLmlzT2JqZWN0KFsxLCAyLCAzXSk7XHJcbiAgICogLy8gPT4gdHJ1ZVxyXG4gICAqXHJcbiAgICogXy5pc09iamVjdCgxKTtcclxuICAgKiAvLyA9PiBmYWxzZVxyXG4gICAqL1xyXG4gIGZ1bmN0aW9uIGlzT2JqZWN0KHZhbHVlKSB7XHJcbiAgICAvLyBBdm9pZCBhIFY4IEpJVCBidWcgaW4gQ2hyb21lIDE5LTIwLlxyXG4gICAgLy8gU2VlIGh0dHBzOi8vY29kZS5nb29nbGUuY29tL3AvdjgvaXNzdWVzL2RldGFpbD9pZD0yMjkxIGZvciBtb3JlIGRldGFpbHMuXHJcbiAgICB2YXIgdHlwZSA9IHR5cGVvZiB2YWx1ZTtcclxuICAgIHJldHVybiAhIXZhbHVlICYmICh0eXBlID09ICdvYmplY3QnIHx8IHR5cGUgPT0gJ2Z1bmN0aW9uJyk7XHJcbiAgfVxyXG5cclxuICByZXR1cm4gZGVib3VuY2U7XHJcblxyXG59KSgpO1xyXG5cclxubW9kdWxlLmV4cG9ydHMgPSBkZWJvdW5jZTsiLCI7KGZ1bmN0aW9uKCl7ICd1c2Ugc3RyaWN0JztcclxuICBcclxuICB2YXIgYW5jaG9yUG9pbnRVdGlsaXRpZXMgPSByZXF1aXJlKCcuL0FuY2hvclBvaW50VXRpbGl0aWVzJyk7XHJcbiAgdmFyIGRlYm91bmNlID0gcmVxdWlyZShcIi4vZGVib3VuY2VcIik7XHJcbiAgXHJcbiAgLy8gcmVnaXN0ZXJzIHRoZSBleHRlbnNpb24gb24gYSBjeXRvc2NhcGUgbGliIHJlZlxyXG4gIHZhciByZWdpc3RlciA9IGZ1bmN0aW9uKCBjeXRvc2NhcGUsICQsIEtvbnZhKXtcclxuICAgIHZhciB1aVV0aWxpdGllcyA9IHJlcXVpcmUoJy4vVUlVdGlsaXRpZXMnKTtcclxuICAgIFxyXG4gICAgaWYoICFjeXRvc2NhcGUgfHwgISQgfHwgIUtvbnZhKXsgcmV0dXJuOyB9IC8vIGNhbid0IHJlZ2lzdGVyIGlmIHJlcXVpcmVkIGxpYnJhcmllcyB1bnNwZWNpZmllZFxyXG5cclxuICAgIHZhciBkZWZhdWx0cyA9IHtcclxuICAgICAgLy8gdGhpcyBmdW5jdGlvbiBzcGVjaWZpZXMgdGhlIHBvaXRpb25zIG9mIGJlbmQgcG9pbnRzXHJcbiAgICAgIC8vIHN0cmljdGx5IG5hbWUgdGhlIHByb3BlcnR5ICdiZW5kUG9pbnRQb3NpdGlvbnMnIGZvciB0aGUgZWRnZSB0byBiZSBkZXRlY3RlZCBmb3IgYmVuZCBwb2ludCBlZGl0aXRuZ1xyXG4gICAgICBiZW5kUG9zaXRpb25zRnVuY3Rpb246IGZ1bmN0aW9uKGVsZSkge1xyXG4gICAgICAgIHJldHVybiBlbGUuZGF0YSgnYmVuZFBvaW50UG9zaXRpb25zJyk7XHJcbiAgICAgIH0sXHJcbiAgICAgIC8vIHRoaXMgZnVuY3Rpb24gc3BlY2lmaWVzIHRoZSBwb2l0aW9ucyBvZiBjb250cm9sIHBvaW50c1xyXG4gICAgICAvLyBzdHJpY3RseSBuYW1lIHRoZSBwcm9wZXJ0eSAnY29udHJvbFBvaW50UG9zaXRpb25zJyBmb3IgdGhlIGVkZ2UgdG8gYmUgZGV0ZWN0ZWQgZm9yIGNvbnRyb2wgcG9pbnQgZWRpdGl0bmdcclxuICAgICAgY29udHJvbFBvc2l0aW9uc0Z1bmN0aW9uOiBmdW5jdGlvbihlbGUpIHtcclxuICAgICAgICByZXR1cm4gZWxlLmRhdGEoJ2NvbnRyb2xQb2ludFBvc2l0aW9ucycpO1xyXG4gICAgICB9LFxyXG4gICAgICAvLyB3aGV0aGVyIHRvIGluaXRpbGl6ZSBiZW5kIGFuZCBjb250cm9sIHBvaW50cyBvbiBjcmVhdGlvbiBvZiB0aGlzIGV4dGVuc2lvbiBhdXRvbWF0aWNhbGx5XHJcbiAgICAgIGluaXRBbmNob3JzQXV0b21hdGljYWxseTogdHJ1ZSxcclxuICAgICAgLy8gdGhlIGNsYXNzZXMgb2YgdGhvc2UgZWRnZXMgdGhhdCBzaG91bGQgYmUgaWdub3JlZFxyXG4gICAgICBpZ25vcmVkQ2xhc3NlczogW10sXHJcbiAgICAgIC8vIHdoZXRoZXIgdGhlIGJlbmQgYW5kIGNvbnRyb2wgZWRpdGluZyBvcGVyYXRpb25zIGFyZSB1bmRvYWJsZSAocmVxdWlyZXMgY3l0b3NjYXBlLXVuZG8tcmVkby5qcylcclxuICAgICAgdW5kb2FibGU6IGZhbHNlLFxyXG4gICAgICAvLyB0aGUgc2l6ZSBvZiBiZW5kIGFuZCBjb250cm9sIHBvaW50IHNoYXBlIGlzIG9idGFpbmVkIGJ5IG11bHRpcGxpbmcgd2lkdGggb2YgZWRnZSB3aXRoIHRoaXMgcGFyYW1ldGVyXHJcbiAgICAgIGFuY2hvclNoYXBlU2l6ZUZhY3RvcjogMyxcclxuICAgICAgLy8gei1pbmRleCB2YWx1ZSBvZiB0aGUgY2FudmFzIGluIHdoaWNoIGJlbmQgYW5kIGNvbnRyb2wgcG9pbnRzIGFyZSBkcmF3blxyXG4gICAgICB6SW5kZXg6IDk5OSwgICAgICBcclxuICAgICAgLy8gd2hldGhlciB0byBzdGFydCB0aGUgcGx1Z2luIGluIHRoZSBlbmFibGVkIHN0YXRlXHJcbiAgICAgIGVuYWJsZWQ6IHRydWUsXHJcbiAgICAgIC8vQW4gb3B0aW9uIHRoYXQgY29udHJvbHMgdGhlIGRpc3RhbmNlIHdpdGhpbiB3aGljaCBhIGJlbmQgcG9pbnQgaXMgY29uc2lkZXJlZCBcIm5lYXJcIiB0aGUgbGluZSBzZWdtZW50IGJldHdlZW4gaXRzIHR3byBuZWlnaGJvcnMgYW5kIHdpbGwgYmUgYXV0b21hdGljYWxseSByZW1vdmVkXHJcbiAgICAgIGJlbmRSZW1vdmFsU2Vuc2l0aXZpdHkgOiA4LFxyXG4gICAgICAvLyB0aXRsZSBvZiBhZGQgYmVuZCBwb2ludCBtZW51IGl0ZW0gKFVzZXIgbWF5IG5lZWQgdG8gYWRqdXN0IHdpZHRoIG9mIG1lbnUgaXRlbXMgYWNjb3JkaW5nIHRvIGxlbmd0aCBvZiB0aGlzIG9wdGlvbilcclxuICAgICAgYWRkQmVuZE1lbnVJdGVtVGl0bGU6IFwiQWRkIEJlbmQgUG9pbnRcIixcclxuICAgICAgLy8gdGl0bGUgb2YgcmVtb3ZlIGJlbmQgcG9pbnQgbWVudSBpdGVtIChVc2VyIG1heSBuZWVkIHRvIGFkanVzdCB3aWR0aCBvZiBtZW51IGl0ZW1zIGFjY29yZGluZyB0byBsZW5ndGggb2YgdGhpcyBvcHRpb24pXHJcbiAgICAgIHJlbW92ZUJlbmRNZW51SXRlbVRpdGxlOiBcIlJlbW92ZSBCZW5kIFBvaW50XCIsXHJcbiAgICAgIC8vIHRpdGxlIG9mIHJlbW92ZSBhbGwgYmVuZCBwb2ludHMgbWVudSBpdGVtXHJcbiAgICAgIHJlbW92ZUFsbEJlbmRNZW51SXRlbVRpdGxlOiBcIlJlbW92ZSBBbGwgQmVuZCBQb2ludHNcIixcclxuICAgICAgLy8gdGl0bGUgb2YgYWRkIGNvbnRyb2wgcG9pbnQgbWVudSBpdGVtIChVc2VyIG1heSBuZWVkIHRvIGFkanVzdCB3aWR0aCBvZiBtZW51IGl0ZW1zIGFjY29yZGluZyB0byBsZW5ndGggb2YgdGhpcyBvcHRpb24pXHJcbiAgICAgIGFkZENvbnRyb2xNZW51SXRlbVRpdGxlOiBcIkFkZCBDb250cm9sIFBvaW50XCIsXHJcbiAgICAgIC8vIHRpdGxlIG9mIHJlbW92ZSBjb250cm9sIHBvaW50IG1lbnUgaXRlbSAoVXNlciBtYXkgbmVlZCB0byBhZGp1c3Qgd2lkdGggb2YgbWVudSBpdGVtcyBhY2NvcmRpbmcgdG8gbGVuZ3RoIG9mIHRoaXMgb3B0aW9uKVxyXG4gICAgICByZW1vdmVDb250cm9sTWVudUl0ZW1UaXRsZTogXCJSZW1vdmUgQ29udHJvbCBQb2ludFwiLFxyXG4gICAgICAvLyB0aXRsZSBvZiByZW1vdmUgYWxsIGNvbnRyb2wgcG9pbnRzIG1lbnUgaXRlbVxyXG4gICAgICByZW1vdmVBbGxDb250cm9sTWVudUl0ZW1UaXRsZTogXCJSZW1vdmUgQWxsIENvbnRyb2wgUG9pbnRzXCIsXHJcbiAgICAgIC8vIHdoZXRoZXIgdGhlIGJlbmQgYW5kIGNvbnRyb2wgcG9pbnRzIGNhbiBiZSBtb3ZlZCBieSBhcnJvd3NcclxuICAgICAgbW92ZVNlbGVjdGVkQW5jaG9yc09uS2V5RXZlbnRzOiBmdW5jdGlvbiAoKSB7XHJcbiAgICAgICAgICByZXR1cm4gdHJ1ZTtcclxuICAgICAgfSxcclxuICAgICAgLy8gd2hldGhlciAnUmVtb3ZlIGFsbCBiZW5kIHBvaW50cycgYW5kICdSZW1vdmUgYWxsIGNvbnRyb2wgcG9pbnRzJyBvcHRpb25zIHNob3VsZCBiZSBwcmVzZW50ZWRcclxuICAgICAgZW5hYmxlTXVsdGlwbGVBbmNob3JSZW1vdmFsT3B0aW9uOiBmYWxzZVxyXG4gICAgfTtcclxuICAgIFxyXG4gICAgdmFyIG9wdGlvbnM7XHJcbiAgICB2YXIgaW5pdGlhbGl6ZWQgPSBmYWxzZTtcclxuICAgIFxyXG4gICAgLy8gTWVyZ2UgZGVmYXVsdCBvcHRpb25zIHdpdGggdGhlIG9uZXMgY29taW5nIGZyb20gcGFyYW1ldGVyXHJcbiAgICBmdW5jdGlvbiBleHRlbmQoZGVmYXVsdHMsIG9wdGlvbnMpIHtcclxuICAgICAgdmFyIG9iaiA9IHt9O1xyXG5cclxuICAgICAgZm9yICh2YXIgaSBpbiBkZWZhdWx0cykge1xyXG4gICAgICAgIG9ialtpXSA9IGRlZmF1bHRzW2ldO1xyXG4gICAgICB9XHJcblxyXG4gICAgICBmb3IgKHZhciBpIGluIG9wdGlvbnMpIHtcclxuICAgICAgICAvLyBTUExJVCBGVU5DVElPTkFMSVRZP1xyXG4gICAgICAgIGlmKGkgPT0gXCJiZW5kUmVtb3ZhbFNlbnNpdGl2aXR5XCIpe1xyXG4gICAgICAgICAgdmFyIHZhbHVlID0gb3B0aW9uc1tpXTtcclxuICAgICAgICAgICBpZighaXNOYU4odmFsdWUpKVxyXG4gICAgICAgICAgIHtcclxuICAgICAgICAgICAgICBpZih2YWx1ZSA+PSAwICYmIHZhbHVlIDw9IDIwKXtcclxuICAgICAgICAgICAgICAgIG9ialtpXSA9IG9wdGlvbnNbaV07XHJcbiAgICAgICAgICAgICAgfWVsc2UgaWYodmFsdWUgPCAwKXtcclxuICAgICAgICAgICAgICAgIG9ialtpXSA9IDBcclxuICAgICAgICAgICAgICB9ZWxzZXtcclxuICAgICAgICAgICAgICAgIG9ialtpXSA9IDIwXHJcbiAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgIH1cclxuICAgICAgICB9ZWxzZXtcclxuICAgICAgICAgIG9ialtpXSA9IG9wdGlvbnNbaV07XHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgfVxyXG5cclxuICAgICAgcmV0dXJuIG9iajtcclxuICAgIH07XHJcbiAgICBcclxuICAgIGN5dG9zY2FwZSggJ2NvcmUnLCAnZWRnZUVkaXRpbmcnLCBmdW5jdGlvbihvcHRzKXtcclxuICAgICAgdmFyIGN5ID0gdGhpcztcclxuICAgICAgXHJcbiAgICAgIGlmKCBvcHRzID09PSAnaW5pdGlhbGl6ZWQnICkge1xyXG4gICAgICAgIHJldHVybiBpbml0aWFsaXplZDtcclxuICAgICAgfVxyXG4gICAgICBcclxuICAgICAgaWYoIG9wdHMgIT09ICdnZXQnICkge1xyXG4gICAgICAgIC8vIG1lcmdlIHRoZSBvcHRpb25zIHdpdGggZGVmYXVsdCBvbmVzXHJcbiAgICAgICAgb3B0aW9ucyA9IGV4dGVuZChkZWZhdWx0cywgb3B0cyk7XHJcbiAgICAgICAgaW5pdGlhbGl6ZWQgPSB0cnVlO1xyXG5cclxuICAgICAgICAvLyBkZWZpbmUgZWRnZWJlbmRlZGl0aW5nLWhhc2JlbmRwb2ludHMgY3NzIGNsYXNzXHJcbiAgICAgICAgY3kuc3R5bGUoKS5zZWxlY3RvcignLmVkZ2ViZW5kZWRpdGluZy1oYXNiZW5kcG9pbnRzJykuY3NzKHtcclxuICAgICAgICAgICdjdXJ2ZS1zdHlsZSc6ICdzZWdtZW50cycsXHJcbiAgICAgICAgICAnc2VnbWVudC1kaXN0YW5jZXMnOiBmdW5jdGlvbiAoZWxlKSB7XHJcbiAgICAgICAgICAgIHJldHVybiBhbmNob3JQb2ludFV0aWxpdGllcy5nZXREaXN0YW5jZXNTdHJpbmcoZWxlLCAnYmVuZCcpO1xyXG4gICAgICAgICAgfSxcclxuICAgICAgICAgICdzZWdtZW50LXdlaWdodHMnOiBmdW5jdGlvbiAoZWxlKSB7XHJcbiAgICAgICAgICAgIHJldHVybiBhbmNob3JQb2ludFV0aWxpdGllcy5nZXRXZWlnaHRzU3RyaW5nKGVsZSwgJ2JlbmQnKTtcclxuICAgICAgICAgIH0sXHJcbiAgICAgICAgICAnZWRnZS1kaXN0YW5jZXMnOiAnbm9kZS1wb3NpdGlvbidcclxuICAgICAgICB9KTtcclxuXHJcbiAgICAgICAgLy8gZGVmaW5lIGVkZ2Vjb250cm9sZWRpdGluZy1oYXNjb250cm9scG9pbnRzIGNzcyBjbGFzc1xyXG4gICAgICAgIGN5LnN0eWxlKCkuc2VsZWN0b3IoJy5lZGdlY29udHJvbGVkaXRpbmctaGFzY29udHJvbHBvaW50cycpLmNzcyh7XHJcbiAgICAgICAgICAnY3VydmUtc3R5bGUnOiAndW5idW5kbGVkLWJlemllcicsXHJcbiAgICAgICAgICAnY29udHJvbC1wb2ludC1kaXN0YW5jZXMnOiBmdW5jdGlvbiAoZWxlKSB7XHJcbiAgICAgICAgICAgIHJldHVybiBhbmNob3JQb2ludFV0aWxpdGllcy5nZXREaXN0YW5jZXNTdHJpbmcoZWxlLCAnY29udHJvbCcpO1xyXG4gICAgICAgICAgfSxcclxuICAgICAgICAgICdjb250cm9sLXBvaW50LXdlaWdodHMnOiBmdW5jdGlvbiAoZWxlKSB7XHJcbiAgICAgICAgICAgIHJldHVybiBhbmNob3JQb2ludFV0aWxpdGllcy5nZXRXZWlnaHRzU3RyaW5nKGVsZSwgJ2NvbnRyb2wnKTtcclxuICAgICAgICAgIH0sXHJcbiAgICAgICAgICAnZWRnZS1kaXN0YW5jZXMnOiAnbm9kZS1wb3NpdGlvbidcclxuICAgICAgICB9KTtcclxuXHJcbiAgICAgICAgYW5jaG9yUG9pbnRVdGlsaXRpZXMuc2V0SWdub3JlZENsYXNzZXMob3B0aW9ucy5pZ25vcmVkQ2xhc3Nlcyk7XHJcblxyXG4gICAgICAgIC8vIGluaXQgYmVuZCBwb3NpdGlvbnMgY29uZGl0aW9uYWxseVxyXG4gICAgICAgIGlmIChvcHRpb25zLmluaXRBbmNob3JzQXV0b21hdGljYWxseSkge1xyXG4gICAgICAgICAgLy8gQ0hFQ0sgVEhJUywgb3B0aW9ucy5pZ25vcmVkQ2xhc3NlcyBVTlVTRURcclxuICAgICAgICAgIGFuY2hvclBvaW50VXRpbGl0aWVzLmluaXRBbmNob3JQb2ludHMob3B0aW9ucy5iZW5kUG9zaXRpb25zRnVuY3Rpb24sIG9wdGlvbnMuY29udHJvbFBvc2l0aW9uc0Z1bmN0aW9uLCBjeS5lZGdlcygpLCBvcHRpb25zLmlnbm9yZWRDbGFzc2VzKTtcclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIGlmKG9wdGlvbnMuZW5hYmxlZClcclxuICAgICAgICAgIHVpVXRpbGl0aWVzKG9wdGlvbnMsIGN5KTtcclxuICAgICAgICBlbHNlXHJcbiAgICAgICAgICB1aVV0aWxpdGllcyhcInVuYmluZFwiLCBjeSk7XHJcbiAgICAgIH1cclxuICAgICAgXHJcbiAgICAgIHZhciBpbnN0YW5jZSA9IGluaXRpYWxpemVkID8ge1xyXG4gICAgICAgIC8qXHJcbiAgICAgICAgKiBnZXQgYmVuZCBvciBjb250cm9sIHBvaW50cyBvZiB0aGUgZ2l2ZW4gZWRnZSBpbiBhbiBhcnJheSBBLFxyXG4gICAgICAgICogQVsyICogaV0gaXMgdGhlIHggY29vcmRpbmF0ZSBhbmQgQVsyICogaSArIDFdIGlzIHRoZSB5IGNvb3JkaW5hdGVcclxuICAgICAgICAqIG9mIHRoZSBpdGggYmVuZCBwb2ludC4gKFJldHVybnMgdW5kZWZpbmVkIGlmIHRoZSBjdXJ2ZSBzdHlsZSBpcyBub3Qgc2VnbWVudHMgbm9yIHVuYnVuZGxlZCBiZXppZXIpXHJcbiAgICAgICAgKi9cclxuICAgICAgICBnZXRBbmNob3JzQXNBcnJheTogZnVuY3Rpb24oZWxlKSB7XHJcbiAgICAgICAgICByZXR1cm4gYW5jaG9yUG9pbnRVdGlsaXRpZXMuZ2V0QW5jaG9yc0FzQXJyYXkoZWxlKTtcclxuICAgICAgICB9LFxyXG4gICAgICAgIC8vIEluaXRpbGl6ZSBwb2ludHMgZm9yIHRoZSBnaXZlbiBlZGdlcyB1c2luZyAnb3B0aW9ucy5iZW5kUG9zaXRpb25zRnVuY3Rpb24nXHJcbiAgICAgICAgaW5pdEFuY2hvclBvaW50czogZnVuY3Rpb24oZWxlcykge1xyXG4gICAgICAgICAgYW5jaG9yUG9pbnRVdGlsaXRpZXMuaW5pdEFuY2hvclBvaW50cyhvcHRpb25zLmJlbmRQb3NpdGlvbnNGdW5jdGlvbiwgb3B0aW9ucy5jb250cm9sUG9zaXRpb25zRnVuY3Rpb24sIGVsZXMpO1xyXG4gICAgICAgIH0sXHJcbiAgICAgICAgZGVsZXRlU2VsZWN0ZWRBbmNob3I6IGZ1bmN0aW9uKGVsZSwgaW5kZXgpIHtcclxuICAgICAgICAgIGFuY2hvclBvaW50VXRpbGl0aWVzLnJlbW92ZUFuY2hvcihlbGUsIGluZGV4KTtcclxuICAgICAgICB9XHJcbiAgICAgIH0gOiB1bmRlZmluZWQ7XHJcblxyXG4gICAgICByZXR1cm4gaW5zdGFuY2U7IC8vIGNoYWluYWJpbGl0eVxyXG4gICAgfSApO1xyXG5cclxuICB9O1xyXG5cclxuICBpZiggdHlwZW9mIG1vZHVsZSAhPT0gJ3VuZGVmaW5lZCcgJiYgbW9kdWxlLmV4cG9ydHMgKXsgLy8gZXhwb3NlIGFzIGEgY29tbW9uanMgbW9kdWxlXHJcbiAgICBtb2R1bGUuZXhwb3J0cyA9IHJlZ2lzdGVyO1xyXG4gIH1cclxuXHJcbiAgaWYoIHR5cGVvZiBkZWZpbmUgIT09ICd1bmRlZmluZWQnICYmIGRlZmluZS5hbWQgKXsgLy8gZXhwb3NlIGFzIGFuIGFtZC9yZXF1aXJlanMgbW9kdWxlXHJcbiAgICBkZWZpbmUoJ2N5dG9zY2FwZS1lZGdlLWVkaXRpbmcnLCBmdW5jdGlvbigpe1xyXG4gICAgICByZXR1cm4gcmVnaXN0ZXI7XHJcbiAgICB9KTtcclxuICB9XHJcblxyXG4gIGlmKCB0eXBlb2YgY3l0b3NjYXBlICE9PSAndW5kZWZpbmVkJyAmJiAkICYmIEtvbnZhKXsgLy8gZXhwb3NlIHRvIGdsb2JhbCBjeXRvc2NhcGUgKGkuZS4gd2luZG93LmN5dG9zY2FwZSlcclxuICAgIHJlZ2lzdGVyKCBjeXRvc2NhcGUsICQsIEtvbnZhICk7XHJcbiAgfVxyXG5cclxufSkoKTtcclxuIiwidmFyIHJlY29ubmVjdGlvblV0aWxpdGllcyA9IHtcclxuXHJcbiAgICAvLyBjcmVhdGVzIGFuZCByZXR1cm5zIGEgZHVtbXkgbm9kZSB3aGljaCBpcyBjb25uZWN0ZWQgdG8gdGhlIGRpc2Nvbm5lY3RlZCBlZGdlXHJcbiAgICBkaXNjb25uZWN0RWRnZTogZnVuY3Rpb24gKGVkZ2UsIGN5LCBwb3NpdGlvbiwgZGlzY29ubmVjdGVkRW5kKSB7XHJcbiAgICAgICAgXHJcbiAgICAgICAgdmFyIGR1bW15Tm9kZSA9IHtcclxuICAgICAgICAgICAgZGF0YTogeyBcclxuICAgICAgICAgICAgICBpZDogJ253dF9yZWNvbm5lY3RFZGdlX2R1bW15JyxcclxuICAgICAgICAgICAgICBwb3J0czogW10sXHJcbiAgICAgICAgICAgIH0sXHJcbiAgICAgICAgICAgIHN0eWxlOiB7XHJcbiAgICAgICAgICAgICAgd2lkdGg6IDEsXHJcbiAgICAgICAgICAgICAgaGVpZ2h0OiAxLFxyXG4gICAgICAgICAgICAgICd2aXNpYmlsaXR5JzogJ2hpZGRlbidcclxuICAgICAgICAgICAgfSxcclxuICAgICAgICAgICAgcmVuZGVyZWRQb3NpdGlvbjogcG9zaXRpb25cclxuICAgICAgICB9O1xyXG4gICAgICAgIGN5LmFkZChkdW1teU5vZGUpO1xyXG5cclxuICAgICAgICB2YXIgbG9jID0gKGRpc2Nvbm5lY3RlZEVuZCA9PT0gJ3NvdXJjZScpID8gXHJcbiAgICAgICAgICAgIHtzb3VyY2U6IGR1bW15Tm9kZS5kYXRhLmlkfSA6IFxyXG4gICAgICAgICAgICB7dGFyZ2V0OiBkdW1teU5vZGUuZGF0YS5pZH07XHJcblxyXG4gICAgICAgIGVkZ2UgPSBlZGdlLm1vdmUobG9jKVswXTtcclxuXHJcbiAgICAgICAgcmV0dXJuIHtcclxuICAgICAgICAgICAgZHVtbXlOb2RlOiBjeS5ub2RlcyhcIiNcIiArIGR1bW15Tm9kZS5kYXRhLmlkKVswXSxcclxuICAgICAgICAgICAgZWRnZTogZWRnZVxyXG4gICAgICAgIH07XHJcbiAgICB9LFxyXG5cclxuICAgIGNvbm5lY3RFZGdlOiBmdW5jdGlvbiAoZWRnZSwgbm9kZSwgbG9jYXRpb24pIHtcclxuICAgICAgICBpZighZWRnZS5pc0VkZ2UoKSB8fCAhbm9kZS5pc05vZGUoKSlcclxuICAgICAgICAgICAgcmV0dXJuO1xyXG5cclxuICAgICAgICB2YXIgbG9jID0ge307XHJcbiAgICAgICAgaWYobG9jYXRpb24gPT09ICdzb3VyY2UnKVxyXG4gICAgICAgICAgICBsb2Muc291cmNlID0gbm9kZS5pZCgpO1xyXG4gICAgICAgIFxyXG4gICAgICAgIGVsc2UgaWYobG9jYXRpb24gPT09ICd0YXJnZXQnKVxyXG4gICAgICAgICAgICBsb2MudGFyZ2V0ID0gbm9kZS5pZCgpO1xyXG4gICAgICAgIFxyXG4gICAgICAgIGVsc2VcclxuICAgICAgICAgICAgcmV0dXJuO1xyXG5cclxuICAgICAgICByZXR1cm4gZWRnZS5tb3ZlKGxvYylbMF07XHJcbiAgICB9LFxyXG5cclxuICAgIGNvcHlFZGdlOiBmdW5jdGlvbiAob2xkRWRnZSwgbmV3RWRnZSkge1xyXG4gICAgICAgIHRoaXMuY29weUFuY2hvcnMob2xkRWRnZSwgbmV3RWRnZSk7XHJcbiAgICAgICAgdGhpcy5jb3B5U3R5bGUob2xkRWRnZSwgbmV3RWRnZSk7XHJcbiAgICB9LFxyXG5cclxuICAgIGNvcHlTdHlsZTogZnVuY3Rpb24gKG9sZEVkZ2UsIG5ld0VkZ2UpIHtcclxuICAgICAgICBpZihvbGRFZGdlICYmIG5ld0VkZ2Upe1xyXG4gICAgICAgICAgICBuZXdFZGdlLmRhdGEoJ2xpbmUtY29sb3InLCBvbGRFZGdlLmRhdGEoJ2xpbmUtY29sb3InKSk7XHJcbiAgICAgICAgICAgIG5ld0VkZ2UuZGF0YSgnd2lkdGgnLCBvbGRFZGdlLmRhdGEoJ3dpZHRoJykpO1xyXG4gICAgICAgICAgICBuZXdFZGdlLmRhdGEoJ2NhcmRpbmFsaXR5Jywgb2xkRWRnZS5kYXRhKCdjYXJkaW5hbGl0eScpKTtcclxuICAgICAgICB9XHJcbiAgICB9LFxyXG5cclxuICAgIGNvcHlBbmNob3JzOiBmdW5jdGlvbiAob2xkRWRnZSwgbmV3RWRnZSkge1xyXG4gICAgICAgIGlmKG9sZEVkZ2UuaGFzQ2xhc3MoJ2VkZ2ViZW5kZWRpdGluZy1oYXNiZW5kcG9pbnRzJykpe1xyXG4gICAgICAgICAgICB2YXIgYnBEaXN0YW5jZXMgPSBvbGRFZGdlLmRhdGEoJ2N5ZWRnZWJlbmRlZGl0aW5nRGlzdGFuY2VzJyk7XHJcbiAgICAgICAgICAgIHZhciBicFdlaWdodHMgPSBvbGRFZGdlLmRhdGEoJ2N5ZWRnZWJlbmRlZGl0aW5nV2VpZ2h0cycpO1xyXG4gICAgICAgICAgICBcclxuICAgICAgICAgICAgbmV3RWRnZS5kYXRhKCdjeWVkZ2ViZW5kZWRpdGluZ0Rpc3RhbmNlcycsIGJwRGlzdGFuY2VzKTtcclxuICAgICAgICAgICAgbmV3RWRnZS5kYXRhKCdjeWVkZ2ViZW5kZWRpdGluZ1dlaWdodHMnLCBicFdlaWdodHMpO1xyXG4gICAgICAgICAgICBuZXdFZGdlLmFkZENsYXNzKCdlZGdlYmVuZGVkaXRpbmctaGFzYmVuZHBvaW50cycpO1xyXG4gICAgICAgIH1cclxuICAgICAgICBlbHNlIGlmKG9sZEVkZ2UuaGFzQ2xhc3MoJ2VkZ2Vjb250cm9sZWRpdGluZy1oYXNjb250cm9scG9pbnRzJykpe1xyXG4gICAgICAgICAgICB2YXIgYnBEaXN0YW5jZXMgPSBvbGRFZGdlLmRhdGEoJ2N5ZWRnZWNvbnRyb2xlZGl0aW5nRGlzdGFuY2VzJyk7XHJcbiAgICAgICAgICAgIHZhciBicFdlaWdodHMgPSBvbGRFZGdlLmRhdGEoJ2N5ZWRnZWNvbnRyb2xlZGl0aW5nV2VpZ2h0cycpO1xyXG4gICAgICAgICAgICBcclxuICAgICAgICAgICAgbmV3RWRnZS5kYXRhKCdjeWVkZ2Vjb250cm9sZWRpdGluZ0Rpc3RhbmNlcycsIGJwRGlzdGFuY2VzKTtcclxuICAgICAgICAgICAgbmV3RWRnZS5kYXRhKCdjeWVkZ2Vjb250cm9sZWRpdGluZ1dlaWdodHMnLCBicFdlaWdodHMpO1xyXG4gICAgICAgICAgICBuZXdFZGdlLmFkZENsYXNzKCdlZGdlY29udHJvbGVkaXRpbmctaGFzY29udHJvbHBvaW50cycpO1xyXG4gICAgICAgIH1cclxuICAgICAgICBpZiAob2xkRWRnZS5oYXNDbGFzcygnZWRnZWJlbmRlZGl0aW5nLWhhc211bHRpcGxlYmVuZHBvaW50cycpKSB7XHJcbiAgICAgICAgICAgIG5ld0VkZ2UuYWRkQ2xhc3MoJ2VkZ2ViZW5kZWRpdGluZy1oYXNtdWx0aXBsZWJlbmRwb2ludHMnKTtcclxuICAgICAgICB9XHJcbiAgICAgICAgZWxzZSBpZiAob2xkRWRnZS5oYXNDbGFzcygnZWRnZWNvbnRyb2xlZGl0aW5nLWhhc211bHRpcGxlY29udHJvbHBvaW50cycpKSB7XHJcbiAgICAgICAgICAgIG5ld0VkZ2UuYWRkQ2xhc3MoJ2VkZ2Vjb250cm9sZWRpdGluZy1oYXNtdWx0aXBsZWNvbnRyb2xwb2ludHMnKTtcclxuICAgICAgICB9XHJcbiAgICB9LFxyXG59O1xyXG4gIFxyXG5tb2R1bGUuZXhwb3J0cyA9IHJlY29ubmVjdGlvblV0aWxpdGllcztcclxuICAiLCJtb2R1bGUuZXhwb3J0cyA9IGZ1bmN0aW9uIChjeSwgYW5jaG9yUG9pbnRVdGlsaXRpZXMsIHBhcmFtcykge1xyXG4gIGlmIChjeS51bmRvUmVkbyA9PSBudWxsKVxyXG4gICAgcmV0dXJuO1xyXG5cclxuICB2YXIgdXIgPSBjeS51bmRvUmVkbyh7XHJcbiAgICBkZWZhdWx0QWN0aW9uczogZmFsc2UsXHJcbiAgICBpc0RlYnVnOiB0cnVlXHJcbiAgfSk7XHJcblxyXG4gIGZ1bmN0aW9uIGNoYW5nZUFuY2hvclBvaW50cyhwYXJhbSkge1xyXG4gICAgdmFyIGVkZ2UgPSBjeS5nZXRFbGVtZW50QnlJZChwYXJhbS5lZGdlLmlkKCkpO1xyXG4gICAgdmFyIHR5cGUgPSBwYXJhbS50eXBlICE9PSAnaW5jb25jbHVzaXZlJyA/IHBhcmFtLnR5cGUgOiBhbmNob3JQb2ludFV0aWxpdGllcy5nZXRFZGdlVHlwZShlZGdlKTtcclxuICAgIFxyXG4gICAgdmFyIHdlaWdodHMsIGRpc3RhbmNlcywgd2VpZ2h0U3RyLCBkaXN0YW5jZVN0cjtcclxuXHJcbiAgICBpZihwYXJhbS50eXBlID09PSAnaW5jb25jbHVzaXZlJyAmJiAhcGFyYW0uc2V0KXtcclxuICAgICAgd2VpZ2h0cyA9IFtdO1xyXG4gICAgICBkaXN0YW5jZXMgPSBbXTtcclxuICAgIH1cclxuICAgIGVsc2Uge1xyXG4gICAgICB3ZWlnaHRTdHIgPSBhbmNob3JQb2ludFV0aWxpdGllcy5zeW50YXhbdHlwZV1bJ3dlaWdodCddO1xyXG4gICAgICBkaXN0YW5jZVN0ciA9IGFuY2hvclBvaW50VXRpbGl0aWVzLnN5bnRheFt0eXBlXVsnZGlzdGFuY2UnXTtcclxuXHJcbiAgICAgIHdlaWdodHMgPSBwYXJhbS5zZXQgPyBlZGdlLmRhdGEod2VpZ2h0U3RyKSA6IHBhcmFtLndlaWdodHM7XHJcbiAgICAgIGRpc3RhbmNlcyA9IHBhcmFtLnNldCA/IGVkZ2UuZGF0YShkaXN0YW5jZVN0cikgOiBwYXJhbS5kaXN0YW5jZXM7XHJcbiAgICB9XHJcblxyXG4gICAgdmFyIHJlc3VsdCA9IHtcclxuICAgICAgZWRnZTogZWRnZSxcclxuICAgICAgdHlwZTogdHlwZSxcclxuICAgICAgd2VpZ2h0czogd2VpZ2h0cyxcclxuICAgICAgZGlzdGFuY2VzOiBkaXN0YW5jZXMsXHJcbiAgICAgIC8vQXMgdGhlIHJlc3VsdCB3aWxsIG5vdCBiZSB1c2VkIGZvciB0aGUgZmlyc3QgZnVuY3Rpb24gY2FsbCBwYXJhbXMgc2hvdWxkIGJlIHVzZWQgdG8gc2V0IHRoZSBkYXRhXHJcbiAgICAgIHNldDogdHJ1ZVxyXG4gICAgfTtcclxuXHJcbiAgICAvL0NoZWNrIGlmIHdlIG5lZWQgdG8gc2V0IHRoZSB3ZWlnaHRzIGFuZCBkaXN0YW5jZXMgYnkgdGhlIHBhcmFtIHZhbHVlc1xyXG4gICAgaWYgKHBhcmFtLnNldCkge1xyXG4gICAgICB2YXIgaGFkQW5jaG9yUG9pbnQgPSBwYXJhbS53ZWlnaHRzICYmIHBhcmFtLndlaWdodHMubGVuZ3RoID4gMDtcclxuICAgICAgdmFyIGhhZE11bHRpcGxlQW5jaG9yUG9pbnRzID0gaGFkQW5jaG9yUG9pbnQgJiYgcGFyYW0ud2VpZ2h0cy5sZW5ndGggPiAxO1xyXG5cclxuICAgICAgaGFkQW5jaG9yUG9pbnQgPyBlZGdlLmRhdGEod2VpZ2h0U3RyLCBwYXJhbS53ZWlnaHRzKSA6IGVkZ2UucmVtb3ZlRGF0YSh3ZWlnaHRTdHIpO1xyXG4gICAgICBoYWRBbmNob3JQb2ludCA/IGVkZ2UuZGF0YShkaXN0YW5jZVN0ciwgcGFyYW0uZGlzdGFuY2VzKSA6IGVkZ2UucmVtb3ZlRGF0YShkaXN0YW5jZVN0cik7XHJcblxyXG4gICAgICAvL3JlZnJlc2ggdGhlIGN1cnZlIHN0eWxlIGFzIHRoZSBudW1iZXIgb2YgYW5jaG9yIHBvaW50IHdvdWxkIGJlIGNoYW5nZWQgYnkgdGhlIHByZXZpb3VzIG9wZXJhdGlvblxyXG4gICAgICBpZiAoaGFkTXVsdGlwbGVBbmNob3JQb2ludHMpIHtcclxuICAgICAgICAgIGVkZ2UuYWRkQ2xhc3MoYW5jaG9yUG9pbnRVdGlsaXRpZXMuc3ludGF4W3R5cGVdWydtdWx0aUNsYXNzJ10pO1xyXG4gICAgICB9XHJcbiAgICAgIGVsc2Uge1xyXG4gICAgICAgICAgZWRnZS5yZW1vdmVDbGFzcyhhbmNob3JQb2ludFV0aWxpdGllcy5zeW50YXhbdHlwZV1bJ211bHRpQ2xhc3MnXSk7XHJcbiAgICAgIH1cclxuXHJcbiAgICAgIGlmIChoYWRBbmNob3JQb2ludCkge1xyXG4gICAgICAgICAgZWRnZS5hZGRDbGFzcyhhbmNob3JQb2ludFV0aWxpdGllcy5zeW50YXhbdHlwZV1bJ2NsYXNzJ10pO1xyXG4gICAgICB9XHJcbiAgICAgIGVsc2Uge1xyXG4gICAgICAgICAgZWRnZS5yZW1vdmVDbGFzcyhhbmNob3JQb2ludFV0aWxpdGllcy5zeW50YXhbdHlwZV1bJ2NsYXNzJ10pO1xyXG4gICAgICB9XHJcbiAgICB9XHJcbiAgICBcclxuICAgIGVkZ2UudHJpZ2dlcignY3llZGdlZWRpdGluZy5jaGFuZ2VBbmNob3JQb2ludHMnKTtcclxuXHJcbiAgICByZXR1cm4gcmVzdWx0O1xyXG4gIH1cclxuXHJcbiAgZnVuY3Rpb24gbW92ZURvKGFyZykge1xyXG4gICAgICBpZiAoYXJnLmZpcnN0VGltZSkge1xyXG4gICAgICAgICAgZGVsZXRlIGFyZy5maXJzdFRpbWU7XHJcbiAgICAgICAgICByZXR1cm4gYXJnO1xyXG4gICAgICB9XHJcblxyXG4gICAgICB2YXIgZWRnZXMgPSBhcmcuZWRnZXM7XHJcbiAgICAgIHZhciBwb3NpdGlvbkRpZmYgPSBhcmcucG9zaXRpb25EaWZmO1xyXG4gICAgICB2YXIgcmVzdWx0ID0ge1xyXG4gICAgICAgICAgZWRnZXM6IGVkZ2VzLFxyXG4gICAgICAgICAgcG9zaXRpb25EaWZmOiB7XHJcbiAgICAgICAgICAgICAgeDogLXBvc2l0aW9uRGlmZi54LFxyXG4gICAgICAgICAgICAgIHk6IC1wb3NpdGlvbkRpZmYueVxyXG4gICAgICAgICAgfVxyXG4gICAgICB9O1xyXG4gICAgICBtb3ZlQW5jaG9yc1VuZG9hYmxlKHBvc2l0aW9uRGlmZiwgZWRnZXMpO1xyXG5cclxuICAgICAgcmV0dXJuIHJlc3VsdDtcclxuICB9XHJcblxyXG4gIGZ1bmN0aW9uIG1vdmVBbmNob3JzVW5kb2FibGUocG9zaXRpb25EaWZmLCBlZGdlcykge1xyXG4gICAgICBlZGdlcy5mb3JFYWNoKGZ1bmN0aW9uKCBlZGdlICl7XHJcbiAgICAgICAgICBlZGdlID0gY3kuZ2V0RWxlbWVudEJ5SWQocGFyYW0uZWRnZS5pZCgpKTtcclxuICAgICAgICAgIHZhciBwcmV2aW91c0FuY2hvcnNQb3NpdGlvbiA9IGFuY2hvclBvaW50VXRpbGl0aWVzLmdldEFuY2hvcnNBc0FycmF5KGVkZ2UpO1xyXG4gICAgICAgICAgdmFyIG5leHRBbmNob3JzUG9zaXRpb24gPSBbXTtcclxuICAgICAgICAgIGlmIChwcmV2aW91c0FuY2hvcnNQb3NpdGlvbiAhPSB1bmRlZmluZWQpXHJcbiAgICAgICAgICB7XHJcbiAgICAgICAgICAgICAgZm9yIChpPTA7IGk8cHJldmlvdXNBbmNob3JzUG9zaXRpb24ubGVuZ3RoOyBpKz0yKVxyXG4gICAgICAgICAgICAgIHtcclxuICAgICAgICAgICAgICAgICAgbmV4dEFuY2hvcnNQb3NpdGlvbi5wdXNoKHt4OiBwcmV2aW91c0FuY2hvcnNQb3NpdGlvbltpXStwb3NpdGlvbkRpZmYueCwgeTogcHJldmlvdXNBbmNob3JzUG9zaXRpb25baSsxXStwb3NpdGlvbkRpZmYueX0pO1xyXG4gICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICBlZGdlLmRhdGEoYW5jaG9yUG9pbnRVdGlsaXRpZXMuc3ludGF4W3R5cGVdWydwb2ludFBvcyddLG5leHRBbmNob3JzUG9zaXRpb24pO1xyXG4gICAgICAgICAgfVxyXG4gICAgICB9KTtcclxuXHJcbiAgICAgIGFuY2hvclBvaW50VXRpbGl0aWVzLmluaXRBbmNob3JQb2ludHMocGFyYW1zLmJlbmRQb3NpdGlvbnNGdW5jdGlvbiwgcGFyYW1zLmNvbnRyb2xQb3NpdGlvbnNGdW5jdGlvbiwgZWRnZXMpO1xyXG4gIH1cclxuXHJcbiAgZnVuY3Rpb24gcmVjb25uZWN0RWRnZShwYXJhbSl7XHJcbiAgICB2YXIgZWRnZSAgICAgID0gcGFyYW0uZWRnZTtcclxuICAgIHZhciBsb2NhdGlvbiAgPSBwYXJhbS5sb2NhdGlvbjtcclxuICAgIHZhciBvbGRMb2MgICAgPSBwYXJhbS5vbGRMb2M7XHJcblxyXG4gICAgZWRnZSA9IGVkZ2UubW92ZShsb2NhdGlvbilbMF07XHJcblxyXG4gICAgdmFyIHJlc3VsdCA9IHtcclxuICAgICAgZWRnZTogICAgIGVkZ2UsXHJcbiAgICAgIGxvY2F0aW9uOiBvbGRMb2MsXHJcbiAgICAgIG9sZExvYzogICBsb2NhdGlvblxyXG4gICAgfVxyXG4gICAgZWRnZS51bnNlbGVjdCgpO1xyXG4gICAgcmV0dXJuIHJlc3VsdDtcclxuICB9XHJcblxyXG4gIGZ1bmN0aW9uIHJlbW92ZVJlY29ubmVjdGVkRWRnZShwYXJhbSl7XHJcbiAgICB2YXIgb2xkRWRnZSA9IHBhcmFtLm9sZEVkZ2U7XHJcbiAgICB2YXIgdG1wID0gY3kuZ2V0RWxlbWVudEJ5SWQob2xkRWRnZS5kYXRhKCdpZCcpKTtcclxuICAgIGlmKHRtcCAmJiB0bXAubGVuZ3RoID4gMClcclxuICAgICAgb2xkRWRnZSA9IHRtcDtcclxuXHJcbiAgICB2YXIgbmV3RWRnZSA9IHBhcmFtLm5ld0VkZ2U7XHJcbiAgICB2YXIgdG1wID0gY3kuZ2V0RWxlbWVudEJ5SWQobmV3RWRnZS5kYXRhKCdpZCcpKTtcclxuICAgIGlmKHRtcCAmJiB0bXAubGVuZ3RoID4gMClcclxuICAgICAgbmV3RWRnZSA9IHRtcDtcclxuXHJcbiAgICBpZihvbGRFZGdlLmluc2lkZSgpKXtcclxuICAgICAgb2xkRWRnZSA9IG9sZEVkZ2UucmVtb3ZlKClbMF07XHJcbiAgICB9IFxyXG4gICAgICBcclxuICAgIGlmKG5ld0VkZ2UucmVtb3ZlZCgpKXtcclxuICAgICAgbmV3RWRnZSA9IG5ld0VkZ2UucmVzdG9yZSgpO1xyXG4gICAgICBuZXdFZGdlLnVuc2VsZWN0KCk7XHJcbiAgICB9XHJcbiAgICBcclxuICAgIHJldHVybiB7XHJcbiAgICAgIG9sZEVkZ2U6IG5ld0VkZ2UsXHJcbiAgICAgIG5ld0VkZ2U6IG9sZEVkZ2VcclxuICAgIH07XHJcbiAgfVxyXG5cclxuICB1ci5hY3Rpb24oJ2NoYW5nZUFuY2hvclBvaW50cycsIGNoYW5nZUFuY2hvclBvaW50cywgY2hhbmdlQW5jaG9yUG9pbnRzKTtcclxuICB1ci5hY3Rpb24oJ21vdmVBbmNob3JQb2ludHMnLCBtb3ZlRG8sIG1vdmVEbyk7XHJcbiAgdXIuYWN0aW9uKCdyZWNvbm5lY3RFZGdlJywgcmVjb25uZWN0RWRnZSwgcmVjb25uZWN0RWRnZSk7XHJcbiAgdXIuYWN0aW9uKCdyZW1vdmVSZWNvbm5lY3RlZEVkZ2UnLCByZW1vdmVSZWNvbm5lY3RlZEVkZ2UsIHJlbW92ZVJlY29ubmVjdGVkRWRnZSk7XHJcbn07XHJcbiJdfQ==
