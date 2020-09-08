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
    else if(edge.data(this.syntax['bend']['pointPos']) && 
            edge.data(this.syntax['bend']['pointPos']).length > 0)
      return 'bend';
    else if(edge.data(this.syntax['control']['pointPos']) && 
            edge.data(this.syntax['control']['pointPos']).length > 0)
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
    var positionDataStr = this.syntax[type]['pointPos'];

    var distances = edge.data(distanceStr);
    var weights = edge.data(weightStr);
    var positions = edge.data(positionDataStr);

    distances.splice(anchorIndex, 1);
    weights.splice(anchorIndex, 1);
    if (positions)
      positions.splice(anchorIndex, 1);

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
    var positionDataStr = this.syntax[type]['pointPos'];
    edge.data(distanceStr, []);
    edge.data(weightStr, []);
    if (edge.data(positionDataStr)) {
      edge.data(positionDataStr, []);
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
          container: canvasElementId,   // id of container <div>
          width: $container.width(),
          height: $container.height()
        });
      }
      else {
        stage = Konva.stages[stageId - 1];
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
          selector: opts.enableMultipleAnchorRemovalOption && ':selected.edgebendediting-hasmultiplebendpoints',
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
          selector: opts.enableMultipleAnchorRemovalOption && ':selected.edgecontrolediting-hasmultiplecontrolpoints',
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
          //cy.autounselectify(false);
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
          /** 
           * if there is a selected edge set autounselectify false
           * fixes the node-editing problem where nodes would get
           * unselected after resize drag
          */
          if (cy.edges(':selected').length > 0) {
            cy.autounselectify(false);
          }
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
          // not clicked on an anchor
          if (selectedIndex == -1) {
            menus.hideMenuItem(removeBendPointCxtMenuId);
            menus.hideMenuItem(removeControlPointCxtMenuId);
            if(type === 'control' && targetIsEdge){
              menus.showMenuItem(addControlPointCxtMenuId);
              menus.hideMenuItem(addBendPointCxtMenuId);
            }
            else if(type === 'bend' && targetIsEdge){
              menus.showMenuItem(addBendPointCxtMenuId);
              menus.hideMenuItem(addControlPointCxtMenuId);
            }
            else if (targetIsEdge){
              menus.showMenuItem(addBendPointCxtMenuId);
              menus.showMenuItem(addControlPointCxtMenuId);
            }
            else {
              menus.hideMenuItem(addBendPointCxtMenuId);
              menus.hideMenuItem(addControlPointCxtMenuId);
            }
            anchorPointUtilities.currentCtxPos = cyPos;
          }
          // clicked on an anchor
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
              keys[e.keyCode] = true;

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
              var moveSpeed = 3;
                    
              // doesn't make sense if alt and shift both pressed
              if(e.altKey && e.shiftKey) {
                return;
              }
              else if (e.altKey) {
                moveSpeed = 1;
              }
              else if (e.shiftKey) {
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

              moveAnchorPoints({x:dx, y:dy}, selectedEdges);
          }
      }
      function keyUp(e) {

          if (e.keyCode < '37' || e.keyCode > '40') {
              return;
          }
          e.preventDefault();
          keys[e.keyCode] = false;
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

      var singleClassName = anchorPointUtilities.syntax[type]['class'];
      var multiClassName = anchorPointUtilities.syntax[type]['multiClass'];

      // Refresh the curve style as the number of anchor point would be changed by the previous operation
      // Adding or removing multi classes at once can cause errors. If multiple classes are to be added,
      // just add them together in space delimeted class names format.
      if (!hadAnchorPoint && !hadMultipleAnchorPoints) {
        // Remove multiple classes from edge with space delimeted string of class names 
        edge.removeClass(singleClassName + " " + multiClassName);
      }
      else if (hadAnchorPoint && !hadMultipleAnchorPoints) { // Had single anchor
        edge.addClass(singleClassName);
        edge.removeClass(multiClassName);   
      }
      else {
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
      edges.forEach(function( edge ){
          var type = anchorPointUtilities.getEdgeType(edge);
          var previousAnchorsPosition = anchorPointUtilities.getAnchorsAsArray(edge);
          var nextAnchorsPosition = [];
          if (previousAnchorsPosition != undefined)
          {
              for (i=0; i<previousAnchorsPosition.length; i+=2)
              {
                  nextAnchorsPosition.push({x: previousAnchorsPosition[i]+positionDiff.x, y: previousAnchorsPosition[i+1]+positionDiff.y});
              }
              edge.data(anchorPointUtilities.syntax[type]['pointPos'], nextAnchorsPosition);
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

//# sourceMappingURL=data:application/json;charset:utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIm5vZGVfbW9kdWxlcy9icm93c2VyLXBhY2svX3ByZWx1ZGUuanMiLCJzcmMvQW5jaG9yUG9pbnRVdGlsaXRpZXMuanMiLCJzcmMvVUlVdGlsaXRpZXMuanMiLCJzcmMvZGVib3VuY2UuanMiLCJzcmMvaW5kZXguanMiLCJzcmMvcmVjb25uZWN0aW9uVXRpbGl0aWVzLmpzIiwic3JjL3JlZ2lzdGVyVW5kb1JlZG9GdW5jdGlvbnMuanMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7QUNBQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDdmlCQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNyK0NBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQzdPQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ2xMQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ3hGQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBIiwiZmlsZSI6ImdlbmVyYXRlZC5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzQ29udGVudCI6WyIoZnVuY3Rpb24gZSh0LG4scil7ZnVuY3Rpb24gcyhvLHUpe2lmKCFuW29dKXtpZighdFtvXSl7dmFyIGE9dHlwZW9mIHJlcXVpcmU9PVwiZnVuY3Rpb25cIiYmcmVxdWlyZTtpZighdSYmYSlyZXR1cm4gYShvLCEwKTtpZihpKXJldHVybiBpKG8sITApO3ZhciBmPW5ldyBFcnJvcihcIkNhbm5vdCBmaW5kIG1vZHVsZSAnXCIrbytcIidcIik7dGhyb3cgZi5jb2RlPVwiTU9EVUxFX05PVF9GT1VORFwiLGZ9dmFyIGw9bltvXT17ZXhwb3J0czp7fX07dFtvXVswXS5jYWxsKGwuZXhwb3J0cyxmdW5jdGlvbihlKXt2YXIgbj10W29dWzFdW2VdO3JldHVybiBzKG4/bjplKX0sbCxsLmV4cG9ydHMsZSx0LG4scil9cmV0dXJuIG5bb10uZXhwb3J0c312YXIgaT10eXBlb2YgcmVxdWlyZT09XCJmdW5jdGlvblwiJiZyZXF1aXJlO2Zvcih2YXIgbz0wO288ci5sZW5ndGg7bysrKXMocltvXSk7cmV0dXJuIHN9KSIsInZhciBhbmNob3JQb2ludFV0aWxpdGllcyA9IHtcclxuICBjdXJyZW50Q3R4RWRnZTogdW5kZWZpbmVkLFxyXG4gIGN1cnJlbnRDdHhQb3M6IHVuZGVmaW5lZCxcclxuICBjdXJyZW50QW5jaG9ySW5kZXg6IHVuZGVmaW5lZCxcclxuICBpZ25vcmVkQ2xhc3NlczogdW5kZWZpbmVkLFxyXG4gIHNldElnbm9yZWRDbGFzc2VzOiBmdW5jdGlvbihfaWdub3JlZENsYXNzZXMpIHtcclxuICAgIHRoaXMuaWdub3JlZENsYXNzZXMgPSBfaWdub3JlZENsYXNzZXM7XHJcbiAgfSxcclxuICBzeW50YXg6IHtcclxuICAgIGJlbmQ6IHtcclxuICAgICAgZWRnZTogXCJzZWdtZW50c1wiLFxyXG4gICAgICBjbGFzczogXCJlZGdlYmVuZGVkaXRpbmctaGFzYmVuZHBvaW50c1wiLFxyXG4gICAgICBtdWx0aUNsYXNzOiBcImVkZ2ViZW5kZWRpdGluZy1oYXNtdWx0aXBsZWJlbmRwb2ludHNcIixcclxuICAgICAgd2VpZ2h0OiBcImN5ZWRnZWJlbmRlZGl0aW5nV2VpZ2h0c1wiLFxyXG4gICAgICBkaXN0YW5jZTogXCJjeWVkZ2ViZW5kZWRpdGluZ0Rpc3RhbmNlc1wiLFxyXG4gICAgICB3ZWlnaHRDc3M6IFwic2VnbWVudC13ZWlnaHRzXCIsXHJcbiAgICAgIGRpc3RhbmNlQ3NzOiBcInNlZ21lbnQtZGlzdGFuY2VzXCIsXHJcbiAgICAgIHBvaW50UG9zOiBcImJlbmRQb2ludFBvc2l0aW9uc1wiLFxyXG4gICAgfSxcclxuICAgIGNvbnRyb2w6IHtcclxuICAgICAgZWRnZTogXCJ1bmJ1bmRsZWQtYmV6aWVyXCIsXHJcbiAgICAgIGNsYXNzOiBcImVkZ2Vjb250cm9sZWRpdGluZy1oYXNjb250cm9scG9pbnRzXCIsXHJcbiAgICAgIG11bHRpQ2xhc3M6IFwiZWRnZWNvbnRyb2xlZGl0aW5nLWhhc211bHRpcGxlY29udHJvbHBvaW50c1wiLFxyXG4gICAgICB3ZWlnaHQ6IFwiY3llZGdlY29udHJvbGVkaXRpbmdXZWlnaHRzXCIsXHJcbiAgICAgIGRpc3RhbmNlOiBcImN5ZWRnZWNvbnRyb2xlZGl0aW5nRGlzdGFuY2VzXCIsXHJcbiAgICAgIHdlaWdodENzczogXCJjb250cm9sLXBvaW50LXdlaWdodHNcIixcclxuICAgICAgZGlzdGFuY2VDc3M6IFwiY29udHJvbC1wb2ludC1kaXN0YW5jZXNcIixcclxuICAgICAgcG9pbnRQb3M6IFwiY29udHJvbFBvaW50UG9zaXRpb25zXCIsXHJcbiAgICB9XHJcbiAgfSxcclxuICAvLyBnZXRzIGVkZ2UgdHlwZSBhcyAnYmVuZCcgb3IgJ2NvbnRyb2wnXHJcbiAgLy8gdGhlIGludGVyY2hhbmdpbmcgaWYtcyBhcmUgbmVjZXNzYXJ5IHRvIHNldCB0aGUgcHJpb3JpdHkgb2YgdGhlIHRhZ3NcclxuICAvLyBleGFtcGxlOiBhbiBlZGdlIHdpdGggdHlwZSBzZWdtZW50IGFuZCBhIGNsYXNzICdoYXNjb250cm9scG9pbnRzJyB3aWxsIGJlIGNsYXNzaWZpZWQgYXMgdW5idW5kbGVkIGJlemllclxyXG4gIGdldEVkZ2VUeXBlOiBmdW5jdGlvbihlZGdlKXtcclxuICAgIGlmKCFlZGdlKVxyXG4gICAgICByZXR1cm4gJ2luY29uY2x1c2l2ZSc7XHJcbiAgICBlbHNlIGlmKGVkZ2UuaGFzQ2xhc3ModGhpcy5zeW50YXhbJ2JlbmQnXVsnY2xhc3MnXSkpXHJcbiAgICAgIHJldHVybiAnYmVuZCc7XHJcbiAgICBlbHNlIGlmKGVkZ2UuaGFzQ2xhc3ModGhpcy5zeW50YXhbJ2NvbnRyb2wnXVsnY2xhc3MnXSkpXHJcbiAgICAgIHJldHVybiAnY29udHJvbCc7XHJcbiAgICBlbHNlIGlmKGVkZ2UuY3NzKCdjdXJ2ZS1zdHlsZScpID09PSB0aGlzLnN5bnRheFsnYmVuZCddWydlZGdlJ10pXHJcbiAgICAgIHJldHVybiAnYmVuZCc7XHJcbiAgICBlbHNlIGlmKGVkZ2UuY3NzKCdjdXJ2ZS1zdHlsZScpID09PSB0aGlzLnN5bnRheFsnY29udHJvbCddWydlZGdlJ10pXHJcbiAgICAgIHJldHVybiAnY29udHJvbCc7XHJcbiAgICBlbHNlIGlmKGVkZ2UuZGF0YSh0aGlzLnN5bnRheFsnYmVuZCddWydwb2ludFBvcyddKSAmJiBcclxuICAgICAgICAgICAgZWRnZS5kYXRhKHRoaXMuc3ludGF4WydiZW5kJ11bJ3BvaW50UG9zJ10pLmxlbmd0aCA+IDApXHJcbiAgICAgIHJldHVybiAnYmVuZCc7XHJcbiAgICBlbHNlIGlmKGVkZ2UuZGF0YSh0aGlzLnN5bnRheFsnY29udHJvbCddWydwb2ludFBvcyddKSAmJiBcclxuICAgICAgICAgICAgZWRnZS5kYXRhKHRoaXMuc3ludGF4Wydjb250cm9sJ11bJ3BvaW50UG9zJ10pLmxlbmd0aCA+IDApXHJcbiAgICAgIHJldHVybiAnY29udHJvbCc7XHJcbiAgICByZXR1cm4gJ2luY29uY2x1c2l2ZSc7XHJcbiAgfSxcclxuICAvLyBpbml0aWxpemUgYW5jaG9yIHBvaW50cyBiYXNlZCBvbiBiZW5kUG9zaXRpb25zRmNuIGFuZCBjb250cm9sUG9zaXRpb25GY25cclxuICBpbml0QW5jaG9yUG9pbnRzOiBmdW5jdGlvbihiZW5kUG9zaXRpb25zRmNuLCBjb250cm9sUG9zaXRpb25zRmNuLCBlZGdlcykge1xyXG4gICAgZm9yICh2YXIgaSA9IDA7IGkgPCBlZGdlcy5sZW5ndGg7IGkrKykge1xyXG4gICAgICB2YXIgZWRnZSA9IGVkZ2VzW2ldO1xyXG4gICAgICB2YXIgdHlwZSA9IHRoaXMuZ2V0RWRnZVR5cGUoZWRnZSk7XHJcbiAgICAgIFxyXG4gICAgICBpZiAodHlwZSA9PT0gJ2luY29uY2x1c2l2ZScpIHsgXHJcbiAgICAgICAgY29udGludWU7IFxyXG4gICAgICB9XHJcblxyXG4gICAgICBpZighdGhpcy5pc0lnbm9yZWRFZGdlKGVkZ2UpKSB7XHJcblxyXG4gICAgICAgIHZhciBhbmNob3JQb3NpdGlvbnM7XHJcblxyXG4gICAgICAgIC8vIGdldCB0aGUgYW5jaG9yIHBvc2l0aW9ucyBieSBhcHBseWluZyB0aGUgZnVuY3Rpb25zIGZvciB0aGlzIGVkZ2VcclxuICAgICAgICBpZih0eXBlID09PSAnYmVuZCcpXHJcbiAgICAgICAgICBhbmNob3JQb3NpdGlvbnMgPSBiZW5kUG9zaXRpb25zRmNuLmFwcGx5KHRoaXMsIGVkZ2UpO1xyXG4gICAgICAgIGVsc2UgaWYodHlwZSA9PT0gJ2NvbnRyb2wnKVxyXG4gICAgICAgICAgYW5jaG9yUG9zaXRpb25zID0gY29udHJvbFBvc2l0aW9uc0Zjbi5hcHBseSh0aGlzLCBlZGdlKTtcclxuXHJcbiAgICAgICAgLy8gY2FsY3VsYXRlIHJlbGF0aXZlIGFuY2hvciBwb3NpdGlvbnNcclxuICAgICAgICB2YXIgcmVzdWx0ID0gdGhpcy5jb252ZXJ0VG9SZWxhdGl2ZVBvc2l0aW9ucyhlZGdlLCBhbmNob3JQb3NpdGlvbnMpO1xyXG5cclxuICAgICAgICAvLyBpZiB0aGVyZSBhcmUgYW5jaG9ycyBzZXQgd2VpZ2h0cyBhbmQgZGlzdGFuY2VzIGFjY29yZGluZ2x5IGFuZCBhZGQgY2xhc3MgdG8gZW5hYmxlIHN0eWxlIGNoYW5nZXNcclxuICAgICAgICBpZiAocmVzdWx0LmRpc3RhbmNlcy5sZW5ndGggPiAwKSB7XHJcbiAgICAgICAgICBlZGdlLmRhdGEodGhpcy5zeW50YXhbdHlwZV1bJ3dlaWdodCddLCByZXN1bHQud2VpZ2h0cyk7XHJcbiAgICAgICAgICBlZGdlLmRhdGEodGhpcy5zeW50YXhbdHlwZV1bJ2Rpc3RhbmNlJ10sIHJlc3VsdC5kaXN0YW5jZXMpO1xyXG4gICAgICAgICAgZWRnZS5hZGRDbGFzcyh0aGlzLnN5bnRheFt0eXBlXVsnY2xhc3MnXSk7XHJcbiAgICAgICAgICBpZiAocmVzdWx0LmRpc3RhbmNlcy5sZW5ndGggPiAxKSB7XHJcbiAgICAgICAgICAgIGVkZ2UuYWRkQ2xhc3ModGhpcy5zeW50YXhbdHlwZV1bJ211bHRpQ2xhc3MnXSk7XHJcbiAgICAgICAgICB9XHJcbiAgICAgICAgfVxyXG4gICAgICB9XHJcbiAgICB9XHJcbiAgfSxcclxuXHJcbiAgaXNJZ25vcmVkRWRnZTogZnVuY3Rpb24oZWRnZSkge1xyXG5cclxuICAgIHZhciBzdGFydFggPSBlZGdlLnNvdXJjZSgpLnBvc2l0aW9uKCd4Jyk7XHJcbiAgICB2YXIgc3RhcnRZID0gZWRnZS5zb3VyY2UoKS5wb3NpdGlvbigneScpO1xyXG4gICAgdmFyIGVuZFggPSBlZGdlLnRhcmdldCgpLnBvc2l0aW9uKCd4Jyk7XHJcbiAgICB2YXIgZW5kWSA9IGVkZ2UudGFyZ2V0KCkucG9zaXRpb24oJ3knKTtcclxuICAgXHJcbiAgICBpZigoc3RhcnRYID09IGVuZFggJiYgc3RhcnRZID09IGVuZFkpICB8fCAoZWRnZS5zb3VyY2UoKS5pZCgpID09IGVkZ2UudGFyZ2V0KCkuaWQoKSkpe1xyXG4gICAgICByZXR1cm4gdHJ1ZTtcclxuICAgIH1cclxuICAgIGZvcih2YXIgaSA9IDA7IHRoaXMuaWdub3JlZENsYXNzZXMgJiYgaSA8ICB0aGlzLmlnbm9yZWRDbGFzc2VzLmxlbmd0aDsgaSsrKXtcclxuICAgICAgaWYoZWRnZS5oYXNDbGFzcyh0aGlzLmlnbm9yZWRDbGFzc2VzW2ldKSlcclxuICAgICAgICByZXR1cm4gdHJ1ZTtcclxuICAgIH1cclxuICAgIHJldHVybiBmYWxzZTtcclxuICB9LFxyXG4gIC8vR2V0IHRoZSBkaXJlY3Rpb24gb2YgdGhlIGxpbmUgZnJvbSBzb3VyY2UgcG9pbnQgdG8gdGhlIHRhcmdldCBwb2ludFxyXG4gIGdldExpbmVEaXJlY3Rpb246IGZ1bmN0aW9uKHNyY1BvaW50LCB0Z3RQb2ludCl7XHJcbiAgICBpZihzcmNQb2ludC55ID09IHRndFBvaW50LnkgJiYgc3JjUG9pbnQueCA8IHRndFBvaW50Lngpe1xyXG4gICAgICByZXR1cm4gMTtcclxuICAgIH1cclxuICAgIGlmKHNyY1BvaW50LnkgPCB0Z3RQb2ludC55ICYmIHNyY1BvaW50LnggPCB0Z3RQb2ludC54KXtcclxuICAgICAgcmV0dXJuIDI7XHJcbiAgICB9XHJcbiAgICBpZihzcmNQb2ludC55IDwgdGd0UG9pbnQueSAmJiBzcmNQb2ludC54ID09IHRndFBvaW50Lngpe1xyXG4gICAgICByZXR1cm4gMztcclxuICAgIH1cclxuICAgIGlmKHNyY1BvaW50LnkgPCB0Z3RQb2ludC55ICYmIHNyY1BvaW50LnggPiB0Z3RQb2ludC54KXtcclxuICAgICAgcmV0dXJuIDQ7XHJcbiAgICB9XHJcbiAgICBpZihzcmNQb2ludC55ID09IHRndFBvaW50LnkgJiYgc3JjUG9pbnQueCA+IHRndFBvaW50Lngpe1xyXG4gICAgICByZXR1cm4gNTtcclxuICAgIH1cclxuICAgIGlmKHNyY1BvaW50LnkgPiB0Z3RQb2ludC55ICYmIHNyY1BvaW50LnggPiB0Z3RQb2ludC54KXtcclxuICAgICAgcmV0dXJuIDY7XHJcbiAgICB9XHJcbiAgICBpZihzcmNQb2ludC55ID4gdGd0UG9pbnQueSAmJiBzcmNQb2ludC54ID09IHRndFBvaW50Lngpe1xyXG4gICAgICByZXR1cm4gNztcclxuICAgIH1cclxuICAgIHJldHVybiA4Oy8vaWYgc3JjUG9pbnQueSA+IHRndFBvaW50LnkgYW5kIHNyY1BvaW50LnggPCB0Z3RQb2ludC54XHJcbiAgfSxcclxuICBnZXRTcmNUZ3RQb2ludHNBbmRUYW5nZW50czogZnVuY3Rpb24gKGVkZ2UpIHtcclxuICAgIHZhciBzb3VyY2VOb2RlID0gZWRnZS5zb3VyY2UoKTtcclxuICAgIHZhciB0YXJnZXROb2RlID0gZWRnZS50YXJnZXQoKTtcclxuICAgIFxyXG4gICAgdmFyIHRndFBvc2l0aW9uID0gdGFyZ2V0Tm9kZS5wb3NpdGlvbigpO1xyXG4gICAgdmFyIHNyY1Bvc2l0aW9uID0gc291cmNlTm9kZS5wb3NpdGlvbigpO1xyXG4gICAgXHJcbiAgICB2YXIgc3JjUG9pbnQgPSBzb3VyY2VOb2RlLnBvc2l0aW9uKCk7XHJcbiAgICB2YXIgdGd0UG9pbnQgPSB0YXJnZXROb2RlLnBvc2l0aW9uKCk7XHJcblxyXG5cclxuICAgIHZhciBtMSA9ICh0Z3RQb2ludC55IC0gc3JjUG9pbnQueSkgLyAodGd0UG9pbnQueCAtIHNyY1BvaW50LngpO1xyXG4gICAgdmFyIG0yID0gLTEgLyBtMTtcclxuXHJcbiAgICByZXR1cm4ge1xyXG4gICAgICBtMTogbTEsXHJcbiAgICAgIG0yOiBtMixcclxuICAgICAgc3JjUG9pbnQ6IHNyY1BvaW50LFxyXG4gICAgICB0Z3RQb2ludDogdGd0UG9pbnRcclxuICAgIH07XHJcbiAgfSxcclxuICBnZXRJbnRlcnNlY3Rpb246IGZ1bmN0aW9uKGVkZ2UsIHBvaW50LCBzcmNUZ3RQb2ludHNBbmRUYW5nZW50cyl7XHJcbiAgICBpZiAoc3JjVGd0UG9pbnRzQW5kVGFuZ2VudHMgPT09IHVuZGVmaW5lZCkge1xyXG4gICAgICBzcmNUZ3RQb2ludHNBbmRUYW5nZW50cyA9IHRoaXMuZ2V0U3JjVGd0UG9pbnRzQW5kVGFuZ2VudHMoZWRnZSk7XHJcbiAgICB9XHJcblxyXG4gICAgdmFyIHNyY1BvaW50ID0gc3JjVGd0UG9pbnRzQW5kVGFuZ2VudHMuc3JjUG9pbnQ7XHJcbiAgICB2YXIgdGd0UG9pbnQgPSBzcmNUZ3RQb2ludHNBbmRUYW5nZW50cy50Z3RQb2ludDtcclxuICAgIHZhciBtMSA9IHNyY1RndFBvaW50c0FuZFRhbmdlbnRzLm0xO1xyXG4gICAgdmFyIG0yID0gc3JjVGd0UG9pbnRzQW5kVGFuZ2VudHMubTI7XHJcblxyXG4gICAgdmFyIGludGVyc2VjdFg7XHJcbiAgICB2YXIgaW50ZXJzZWN0WTtcclxuXHJcbiAgICBpZihtMSA9PSBJbmZpbml0eSB8fCBtMSA9PSAtSW5maW5pdHkpe1xyXG4gICAgICBpbnRlcnNlY3RYID0gc3JjUG9pbnQueDtcclxuICAgICAgaW50ZXJzZWN0WSA9IHBvaW50Lnk7XHJcbiAgICB9XHJcbiAgICBlbHNlIGlmKG0xID09IDApe1xyXG4gICAgICBpbnRlcnNlY3RYID0gcG9pbnQueDtcclxuICAgICAgaW50ZXJzZWN0WSA9IHNyY1BvaW50Lnk7XHJcbiAgICB9XHJcbiAgICBlbHNlIHtcclxuICAgICAgdmFyIGExID0gc3JjUG9pbnQueSAtIG0xICogc3JjUG9pbnQueDtcclxuICAgICAgdmFyIGEyID0gcG9pbnQueSAtIG0yICogcG9pbnQueDtcclxuXHJcbiAgICAgIGludGVyc2VjdFggPSAoYTIgLSBhMSkgLyAobTEgLSBtMik7XHJcbiAgICAgIGludGVyc2VjdFkgPSBtMSAqIGludGVyc2VjdFggKyBhMTtcclxuICAgIH1cclxuXHJcbiAgICAvL0ludGVyc2VjdGlvbiBwb2ludCBpcyB0aGUgaW50ZXJzZWN0aW9uIG9mIHRoZSBsaW5lcyBwYXNzaW5nIHRocm91Z2ggdGhlIG5vZGVzIGFuZFxyXG4gICAgLy9wYXNzaW5nIHRocm91Z2ggdGhlIGJlbmQgb3IgY29udHJvbCBwb2ludCBhbmQgcGVycGVuZGljdWxhciB0byB0aGUgb3RoZXIgbGluZVxyXG4gICAgdmFyIGludGVyc2VjdGlvblBvaW50ID0ge1xyXG4gICAgICB4OiBpbnRlcnNlY3RYLFxyXG4gICAgICB5OiBpbnRlcnNlY3RZXHJcbiAgICB9O1xyXG4gICAgXHJcbiAgICByZXR1cm4gaW50ZXJzZWN0aW9uUG9pbnQ7XHJcbiAgfSxcclxuICBnZXRBbmNob3JzQXNBcnJheTogZnVuY3Rpb24oZWRnZSkge1xyXG4gICAgdmFyIHR5cGUgPSB0aGlzLmdldEVkZ2VUeXBlKGVkZ2UpO1xyXG5cclxuICAgIGlmKHR5cGUgPT09ICdpbmNvbmNsdXNpdmUnKXtcclxuICAgICAgcmV0dXJuIHVuZGVmaW5lZDtcclxuICAgIH1cclxuICAgIFxyXG4gICAgaWYoIGVkZ2UuY3NzKCdjdXJ2ZS1zdHlsZScpICE9PSB0aGlzLnN5bnRheFt0eXBlXVsnZWRnZSddICkge1xyXG4gICAgICByZXR1cm4gdW5kZWZpbmVkO1xyXG4gICAgfVxyXG4gICAgXHJcbiAgICB2YXIgYW5jaG9yTGlzdCA9IFtdO1xyXG5cclxuICAgIHZhciB3ZWlnaHRzID0gZWRnZS5wc3R5bGUoIHRoaXMuc3ludGF4W3R5cGVdWyd3ZWlnaHRDc3MnXSApID8gXHJcbiAgICAgICAgICAgICAgICAgIGVkZ2UucHN0eWxlKCB0aGlzLnN5bnRheFt0eXBlXVsnd2VpZ2h0Q3NzJ10gKS5wZlZhbHVlIDogW107XHJcbiAgICB2YXIgZGlzdGFuY2VzID0gZWRnZS5wc3R5bGUoIHRoaXMuc3ludGF4W3R5cGVdWydkaXN0YW5jZUNzcyddICkgPyBcclxuICAgICAgICAgICAgICAgICAgZWRnZS5wc3R5bGUoIHRoaXMuc3ludGF4W3R5cGVdWydkaXN0YW5jZUNzcyddICkucGZWYWx1ZSA6IFtdO1xyXG4gICAgdmFyIG1pbkxlbmd0aHMgPSBNYXRoLm1pbiggd2VpZ2h0cy5sZW5ndGgsIGRpc3RhbmNlcy5sZW5ndGggKTtcclxuICAgIFxyXG4gICAgdmFyIHNyY1BvcyA9IGVkZ2Uuc291cmNlKCkucG9zaXRpb24oKTtcclxuICAgIHZhciB0Z3RQb3MgPSBlZGdlLnRhcmdldCgpLnBvc2l0aW9uKCk7XHJcblxyXG4gICAgdmFyIGR5ID0gKCB0Z3RQb3MueSAtIHNyY1Bvcy55ICk7XHJcbiAgICB2YXIgZHggPSAoIHRndFBvcy54IC0gc3JjUG9zLnggKTtcclxuICAgIFxyXG4gICAgdmFyIGwgPSBNYXRoLnNxcnQoIGR4ICogZHggKyBkeSAqIGR5ICk7XHJcblxyXG4gICAgdmFyIHZlY3RvciA9IHtcclxuICAgICAgeDogZHgsXHJcbiAgICAgIHk6IGR5XHJcbiAgICB9O1xyXG5cclxuICAgIHZhciB2ZWN0b3JOb3JtID0ge1xyXG4gICAgICB4OiB2ZWN0b3IueCAvIGwsXHJcbiAgICAgIHk6IHZlY3Rvci55IC8gbFxyXG4gICAgfTtcclxuICAgIFxyXG4gICAgdmFyIHZlY3Rvck5vcm1JbnZlcnNlID0ge1xyXG4gICAgICB4OiAtdmVjdG9yTm9ybS55LFxyXG4gICAgICB5OiB2ZWN0b3JOb3JtLnhcclxuICAgIH07XHJcblxyXG4gICAgZm9yKCB2YXIgcyA9IDA7IHMgPCBtaW5MZW5ndGhzOyBzKysgKXtcclxuICAgICAgdmFyIHcgPSB3ZWlnaHRzWyBzIF07XHJcbiAgICAgIHZhciBkID0gZGlzdGFuY2VzWyBzIF07XHJcblxyXG4gICAgICB2YXIgdzEgPSAoMSAtIHcpO1xyXG4gICAgICB2YXIgdzIgPSB3O1xyXG5cclxuICAgICAgdmFyIHBvc1B0cyA9IHtcclxuICAgICAgICB4MTogc3JjUG9zLngsXHJcbiAgICAgICAgeDI6IHRndFBvcy54LFxyXG4gICAgICAgIHkxOiBzcmNQb3MueSxcclxuICAgICAgICB5MjogdGd0UG9zLnlcclxuICAgICAgfTtcclxuXHJcbiAgICAgIHZhciBtaWRwdFB0cyA9IHBvc1B0cztcclxuICAgICAgXHJcbiAgICAgIHZhciBhZGp1c3RlZE1pZHB0ID0ge1xyXG4gICAgICAgIHg6IG1pZHB0UHRzLngxICogdzEgKyBtaWRwdFB0cy54MiAqIHcyLFxyXG4gICAgICAgIHk6IG1pZHB0UHRzLnkxICogdzEgKyBtaWRwdFB0cy55MiAqIHcyXHJcbiAgICAgIH07XHJcblxyXG4gICAgICBhbmNob3JMaXN0LnB1c2goXHJcbiAgICAgICAgYWRqdXN0ZWRNaWRwdC54ICsgdmVjdG9yTm9ybUludmVyc2UueCAqIGQsXHJcbiAgICAgICAgYWRqdXN0ZWRNaWRwdC55ICsgdmVjdG9yTm9ybUludmVyc2UueSAqIGRcclxuICAgICAgKTtcclxuICAgIH1cclxuICAgIFxyXG4gICAgcmV0dXJuIGFuY2hvckxpc3Q7XHJcbiAgfSxcclxuICBjb252ZXJ0VG9SZWxhdGl2ZVBvc2l0aW9uOiBmdW5jdGlvbiAoZWRnZSwgcG9pbnQsIHNyY1RndFBvaW50c0FuZFRhbmdlbnRzKSB7XHJcbiAgICBpZiAoc3JjVGd0UG9pbnRzQW5kVGFuZ2VudHMgPT09IHVuZGVmaW5lZCkge1xyXG4gICAgICBzcmNUZ3RQb2ludHNBbmRUYW5nZW50cyA9IHRoaXMuZ2V0U3JjVGd0UG9pbnRzQW5kVGFuZ2VudHMoZWRnZSk7XHJcbiAgICB9XHJcbiAgICBcclxuICAgIHZhciBpbnRlcnNlY3Rpb25Qb2ludCA9IHRoaXMuZ2V0SW50ZXJzZWN0aW9uKGVkZ2UsIHBvaW50LCBzcmNUZ3RQb2ludHNBbmRUYW5nZW50cyk7XHJcbiAgICB2YXIgaW50ZXJzZWN0WCA9IGludGVyc2VjdGlvblBvaW50Lng7XHJcbiAgICB2YXIgaW50ZXJzZWN0WSA9IGludGVyc2VjdGlvblBvaW50Lnk7XHJcbiAgICBcclxuICAgIHZhciBzcmNQb2ludCA9IHNyY1RndFBvaW50c0FuZFRhbmdlbnRzLnNyY1BvaW50O1xyXG4gICAgdmFyIHRndFBvaW50ID0gc3JjVGd0UG9pbnRzQW5kVGFuZ2VudHMudGd0UG9pbnQ7XHJcbiAgICBcclxuICAgIHZhciB3ZWlnaHQ7XHJcbiAgICBcclxuICAgIGlmKCBpbnRlcnNlY3RYICE9IHNyY1BvaW50LnggKSB7XHJcbiAgICAgIHdlaWdodCA9IChpbnRlcnNlY3RYIC0gc3JjUG9pbnQueCkgLyAodGd0UG9pbnQueCAtIHNyY1BvaW50LngpO1xyXG4gICAgfVxyXG4gICAgZWxzZSBpZiggaW50ZXJzZWN0WSAhPSBzcmNQb2ludC55ICkge1xyXG4gICAgICB3ZWlnaHQgPSAoaW50ZXJzZWN0WSAtIHNyY1BvaW50LnkpIC8gKHRndFBvaW50LnkgLSBzcmNQb2ludC55KTtcclxuICAgIH1cclxuICAgIGVsc2Uge1xyXG4gICAgICB3ZWlnaHQgPSAwO1xyXG4gICAgfVxyXG4gICAgXHJcbiAgICB2YXIgZGlzdGFuY2UgPSBNYXRoLnNxcnQoTWF0aC5wb3coKGludGVyc2VjdFkgLSBwb2ludC55KSwgMilcclxuICAgICAgICArIE1hdGgucG93KChpbnRlcnNlY3RYIC0gcG9pbnQueCksIDIpKTtcclxuICAgIFxyXG4gICAgLy9HZXQgdGhlIGRpcmVjdGlvbiBvZiB0aGUgbGluZSBmb3JtIHNvdXJjZSBwb2ludCB0byB0YXJnZXQgcG9pbnRcclxuICAgIHZhciBkaXJlY3Rpb24xID0gdGhpcy5nZXRMaW5lRGlyZWN0aW9uKHNyY1BvaW50LCB0Z3RQb2ludCk7XHJcbiAgICAvL0dldCB0aGUgZGlyZWN0aW9uIG9mIHRoZSBsaW5lIGZyb20gaW50ZXNlY3Rpb24gcG9pbnQgdG8gdGhlIHBvaW50XHJcbiAgICB2YXIgZGlyZWN0aW9uMiA9IHRoaXMuZ2V0TGluZURpcmVjdGlvbihpbnRlcnNlY3Rpb25Qb2ludCwgcG9pbnQpO1xyXG4gICAgXHJcbiAgICAvL0lmIHRoZSBkaWZmZXJlbmNlIGlzIG5vdCAtMiBhbmQgbm90IDYgdGhlbiB0aGUgZGlyZWN0aW9uIG9mIHRoZSBkaXN0YW5jZSBpcyBuZWdhdGl2ZVxyXG4gICAgaWYoZGlyZWN0aW9uMSAtIGRpcmVjdGlvbjIgIT0gLTIgJiYgZGlyZWN0aW9uMSAtIGRpcmVjdGlvbjIgIT0gNil7XHJcbiAgICAgIGlmKGRpc3RhbmNlICE9IDApXHJcbiAgICAgICAgZGlzdGFuY2UgPSAtMSAqIGRpc3RhbmNlO1xyXG4gICAgfVxyXG4gICAgXHJcbiAgICByZXR1cm4ge1xyXG4gICAgICB3ZWlnaHQ6IHdlaWdodCxcclxuICAgICAgZGlzdGFuY2U6IGRpc3RhbmNlXHJcbiAgICB9O1xyXG4gIH0sXHJcbiAgY29udmVydFRvUmVsYXRpdmVQb3NpdGlvbnM6IGZ1bmN0aW9uIChlZGdlLCBhbmNob3JQb2ludHMpIHtcclxuICAgIHZhciBzcmNUZ3RQb2ludHNBbmRUYW5nZW50cyA9IHRoaXMuZ2V0U3JjVGd0UG9pbnRzQW5kVGFuZ2VudHMoZWRnZSk7XHJcblxyXG4gICAgdmFyIHdlaWdodHMgPSBbXTtcclxuICAgIHZhciBkaXN0YW5jZXMgPSBbXTtcclxuXHJcbiAgICBmb3IgKHZhciBpID0gMDsgYW5jaG9yUG9pbnRzICYmIGkgPCBhbmNob3JQb2ludHMubGVuZ3RoOyBpKyspIHtcclxuICAgICAgdmFyIGFuY2hvciA9IGFuY2hvclBvaW50c1tpXTtcclxuICAgICAgdmFyIHJlbGF0aXZlQW5jaG9yUG9zaXRpb24gPSB0aGlzLmNvbnZlcnRUb1JlbGF0aXZlUG9zaXRpb24oZWRnZSwgYW5jaG9yLCBzcmNUZ3RQb2ludHNBbmRUYW5nZW50cyk7XHJcblxyXG4gICAgICB3ZWlnaHRzLnB1c2gocmVsYXRpdmVBbmNob3JQb3NpdGlvbi53ZWlnaHQpO1xyXG4gICAgICBkaXN0YW5jZXMucHVzaChyZWxhdGl2ZUFuY2hvclBvc2l0aW9uLmRpc3RhbmNlKTtcclxuICAgIH1cclxuXHJcbiAgICByZXR1cm4ge1xyXG4gICAgICB3ZWlnaHRzOiB3ZWlnaHRzLFxyXG4gICAgICBkaXN0YW5jZXM6IGRpc3RhbmNlc1xyXG4gICAgfTtcclxuICB9LFxyXG4gIGdldERpc3RhbmNlc1N0cmluZzogZnVuY3Rpb24gKGVkZ2UsIHR5cGUpIHtcclxuICAgIHZhciBzdHIgPSBcIlwiO1xyXG5cclxuICAgIHZhciBkaXN0YW5jZXMgPSBlZGdlLmRhdGEodGhpcy5zeW50YXhbdHlwZV1bJ2Rpc3RhbmNlJ10pO1xyXG4gICAgZm9yICh2YXIgaSA9IDA7IGRpc3RhbmNlcyAmJiBpIDwgZGlzdGFuY2VzLmxlbmd0aDsgaSsrKSB7XHJcbiAgICAgIHN0ciA9IHN0ciArIFwiIFwiICsgZGlzdGFuY2VzW2ldO1xyXG4gICAgfVxyXG4gICAgXHJcbiAgICByZXR1cm4gc3RyO1xyXG4gIH0sXHJcbiAgZ2V0V2VpZ2h0c1N0cmluZzogZnVuY3Rpb24gKGVkZ2UsIHR5cGUpIHtcclxuICAgIHZhciBzdHIgPSBcIlwiO1xyXG5cclxuICAgIHZhciB3ZWlnaHRzID0gZWRnZS5kYXRhKHRoaXMuc3ludGF4W3R5cGVdWyd3ZWlnaHQnXSk7XHJcbiAgICBmb3IgKHZhciBpID0gMDsgd2VpZ2h0cyAmJiBpIDwgd2VpZ2h0cy5sZW5ndGg7IGkrKykge1xyXG4gICAgICBzdHIgPSBzdHIgKyBcIiBcIiArIHdlaWdodHNbaV07XHJcbiAgICB9XHJcbiAgICBcclxuICAgIHJldHVybiBzdHI7XHJcbiAgfSxcclxuICBhZGRBbmNob3JQb2ludDogZnVuY3Rpb24oZWRnZSwgbmV3QW5jaG9yUG9pbnQsIHR5cGUgPSB1bmRlZmluZWQpIHtcclxuICAgIGlmKGVkZ2UgPT09IHVuZGVmaW5lZCB8fCBuZXdBbmNob3JQb2ludCA9PT0gdW5kZWZpbmVkKXtcclxuICAgICAgZWRnZSA9IHRoaXMuY3VycmVudEN0eEVkZ2U7XHJcbiAgICAgIG5ld0FuY2hvclBvaW50ID0gdGhpcy5jdXJyZW50Q3R4UG9zO1xyXG4gICAgfVxyXG4gIFxyXG4gICAgaWYodHlwZSA9PT0gdW5kZWZpbmVkKVxyXG4gICAgICB0eXBlID0gdGhpcy5nZXRFZGdlVHlwZShlZGdlKTtcclxuXHJcbiAgICB2YXIgd2VpZ2h0U3RyID0gdGhpcy5zeW50YXhbdHlwZV1bJ3dlaWdodCddO1xyXG4gICAgdmFyIGRpc3RhbmNlU3RyID0gdGhpcy5zeW50YXhbdHlwZV1bJ2Rpc3RhbmNlJ107XHJcblxyXG4gICAgdmFyIHJlbGF0aXZlUG9zaXRpb24gPSB0aGlzLmNvbnZlcnRUb1JlbGF0aXZlUG9zaXRpb24oZWRnZSwgbmV3QW5jaG9yUG9pbnQpO1xyXG4gICAgdmFyIG9yaWdpbmFsQW5jaG9yV2VpZ2h0ID0gcmVsYXRpdmVQb3NpdGlvbi53ZWlnaHQ7XHJcbiAgICBcclxuICAgIHZhciBzdGFydFggPSBlZGdlLnNvdXJjZSgpLnBvc2l0aW9uKCd4Jyk7XHJcbiAgICB2YXIgc3RhcnRZID0gZWRnZS5zb3VyY2UoKS5wb3NpdGlvbigneScpO1xyXG4gICAgdmFyIGVuZFggPSBlZGdlLnRhcmdldCgpLnBvc2l0aW9uKCd4Jyk7XHJcbiAgICB2YXIgZW5kWSA9IGVkZ2UudGFyZ2V0KCkucG9zaXRpb24oJ3knKTtcclxuICAgIHZhciBzdGFydFdlaWdodCA9IHRoaXMuY29udmVydFRvUmVsYXRpdmVQb3NpdGlvbihlZGdlLCB7eDogc3RhcnRYLCB5OiBzdGFydFl9KS53ZWlnaHQ7XHJcbiAgICB2YXIgZW5kV2VpZ2h0ID0gdGhpcy5jb252ZXJ0VG9SZWxhdGl2ZVBvc2l0aW9uKGVkZ2UsIHt4OiBlbmRYLCB5OiBlbmRZfSkud2VpZ2h0O1xyXG4gICAgdmFyIHdlaWdodHNXaXRoVGd0U3JjID0gW3N0YXJ0V2VpZ2h0XS5jb25jYXQoZWRnZS5kYXRhKHdlaWdodFN0cik/ZWRnZS5kYXRhKHdlaWdodFN0cik6W10pLmNvbmNhdChbZW5kV2VpZ2h0XSk7XHJcbiAgICBcclxuICAgIHZhciBhbmNob3JzTGlzdCA9IHRoaXMuZ2V0QW5jaG9yc0FzQXJyYXkoZWRnZSk7XHJcbiAgICBcclxuICAgIHZhciBtaW5EaXN0ID0gSW5maW5pdHk7XHJcbiAgICB2YXIgaW50ZXJzZWN0aW9uO1xyXG4gICAgdmFyIHB0c1dpdGhUZ3RTcmMgPSBbc3RhcnRYLCBzdGFydFldXHJcbiAgICAgICAgICAgIC5jb25jYXQoYW5jaG9yc0xpc3Q/YW5jaG9yc0xpc3Q6W10pXHJcbiAgICAgICAgICAgIC5jb25jYXQoW2VuZFgsIGVuZFldKTtcclxuICAgIHZhciBuZXdBbmNob3JJbmRleCA9IC0xO1xyXG4gICAgXHJcbiAgICBmb3IodmFyIGkgPSAwOyBpIDwgd2VpZ2h0c1dpdGhUZ3RTcmMubGVuZ3RoIC0gMTsgaSsrKXtcclxuICAgICAgdmFyIHcxID0gd2VpZ2h0c1dpdGhUZ3RTcmNbaV07XHJcbiAgICAgIHZhciB3MiA9IHdlaWdodHNXaXRoVGd0U3JjW2kgKyAxXTtcclxuICAgICAgXHJcbiAgICAgIC8vY2hlY2sgaWYgdGhlIHdlaWdodCBpcyBiZXR3ZWVuIHcxIGFuZCB3MlxyXG4gICAgICBjb25zdCBiMSA9IHRoaXMuY29tcGFyZVdpdGhQcmVjaXNpb24ob3JpZ2luYWxBbmNob3JXZWlnaHQsIHcxLCB0cnVlKTtcclxuICAgICAgY29uc3QgYjIgPSB0aGlzLmNvbXBhcmVXaXRoUHJlY2lzaW9uKG9yaWdpbmFsQW5jaG9yV2VpZ2h0LCB3Mik7XHJcbiAgICAgIGNvbnN0IGIzID0gdGhpcy5jb21wYXJlV2l0aFByZWNpc2lvbihvcmlnaW5hbEFuY2hvcldlaWdodCwgdzIsIHRydWUpO1xyXG4gICAgICBjb25zdCBiNCA9IHRoaXMuY29tcGFyZVdpdGhQcmVjaXNpb24ob3JpZ2luYWxBbmNob3JXZWlnaHQsIHcxKTtcclxuICAgICAgaWYoIChiMSAmJiBiMikgfHwgKGIzICYmIGI0KSl7XHJcbiAgICAgICAgdmFyIHN0YXJ0WCA9IHB0c1dpdGhUZ3RTcmNbMiAqIGldO1xyXG4gICAgICAgIHZhciBzdGFydFkgPSBwdHNXaXRoVGd0U3JjWzIgKiBpICsgMV07XHJcbiAgICAgICAgdmFyIGVuZFggPSBwdHNXaXRoVGd0U3JjWzIgKiBpICsgMl07XHJcbiAgICAgICAgdmFyIGVuZFkgPSBwdHNXaXRoVGd0U3JjWzIgKiBpICsgM107XHJcbiAgICAgICAgXHJcbiAgICAgICAgdmFyIHN0YXJ0ID0ge1xyXG4gICAgICAgICAgeDogc3RhcnRYLFxyXG4gICAgICAgICAgeTogc3RhcnRZXHJcbiAgICAgICAgfTtcclxuICAgICAgICBcclxuICAgICAgICB2YXIgZW5kID0ge1xyXG4gICAgICAgICAgeDogZW5kWCxcclxuICAgICAgICAgIHk6IGVuZFlcclxuICAgICAgICB9O1xyXG4gICAgICAgIFxyXG4gICAgICAgIHZhciBtMSA9ICggc3RhcnRZIC0gZW5kWSApIC8gKCBzdGFydFggLSBlbmRYICk7XHJcbiAgICAgICAgdmFyIG0yID0gLTEgLyBtMTtcclxuICAgICAgICBcclxuICAgICAgICB2YXIgc3JjVGd0UG9pbnRzQW5kVGFuZ2VudHMgPSB7XHJcbiAgICAgICAgICBzcmNQb2ludDogc3RhcnQsXHJcbiAgICAgICAgICB0Z3RQb2ludDogZW5kLFxyXG4gICAgICAgICAgbTE6IG0xLFxyXG4gICAgICAgICAgbTI6IG0yXHJcbiAgICAgICAgfTtcclxuICAgICAgICBcclxuICAgICAgICB2YXIgY3VycmVudEludGVyc2VjdGlvbiA9IHRoaXMuZ2V0SW50ZXJzZWN0aW9uKGVkZ2UsIG5ld0FuY2hvclBvaW50LCBzcmNUZ3RQb2ludHNBbmRUYW5nZW50cyk7XHJcbiAgICAgICAgdmFyIGRpc3QgPSBNYXRoLnNxcnQoIE1hdGgucG93KCAobmV3QW5jaG9yUG9pbnQueCAtIGN1cnJlbnRJbnRlcnNlY3Rpb24ueCksIDIgKSBcclxuICAgICAgICAgICAgICAgICsgTWF0aC5wb3coIChuZXdBbmNob3JQb2ludC55IC0gY3VycmVudEludGVyc2VjdGlvbi55KSwgMiApKTtcclxuICAgICAgICBcclxuICAgICAgICAvL1VwZGF0ZSB0aGUgbWluaW11bSBkaXN0YW5jZVxyXG4gICAgICAgIGlmKGRpc3QgPCBtaW5EaXN0KXtcclxuICAgICAgICAgIG1pbkRpc3QgPSBkaXN0O1xyXG4gICAgICAgICAgaW50ZXJzZWN0aW9uID0gY3VycmVudEludGVyc2VjdGlvbjtcclxuICAgICAgICAgIG5ld0FuY2hvckluZGV4ID0gaTtcclxuICAgICAgICB9XHJcbiAgICAgIH1cclxuICAgIH1cclxuICAgIFxyXG4gICAgaWYoaW50ZXJzZWN0aW9uICE9PSB1bmRlZmluZWQpe1xyXG4gICAgICBuZXdBbmNob3JQb2ludCA9IGludGVyc2VjdGlvbjtcclxuICAgIH1cclxuICAgIFxyXG4gICAgcmVsYXRpdmVQb3NpdGlvbiA9IHRoaXMuY29udmVydFRvUmVsYXRpdmVQb3NpdGlvbihlZGdlLCBuZXdBbmNob3JQb2ludCk7XHJcbiAgICBcclxuICAgIGlmKGludGVyc2VjdGlvbiA9PT0gdW5kZWZpbmVkKXtcclxuICAgICAgcmVsYXRpdmVQb3NpdGlvbi5kaXN0YW5jZSA9IDA7XHJcbiAgICB9XHJcblxyXG4gICAgdmFyIHdlaWdodHMgPSBlZGdlLmRhdGEod2VpZ2h0U3RyKTtcclxuICAgIHZhciBkaXN0YW5jZXMgPSBlZGdlLmRhdGEoZGlzdGFuY2VTdHIpO1xyXG4gICAgXHJcbiAgICB3ZWlnaHRzID0gd2VpZ2h0cz93ZWlnaHRzOltdO1xyXG4gICAgZGlzdGFuY2VzID0gZGlzdGFuY2VzP2Rpc3RhbmNlczpbXTtcclxuICAgIFxyXG4gICAgaWYod2VpZ2h0cy5sZW5ndGggPT09IDApIHtcclxuICAgICAgbmV3QW5jaG9ySW5kZXggPSAwO1xyXG4gICAgfVxyXG4gICAgXHJcbi8vICAgIHdlaWdodHMucHVzaChyZWxhdGl2ZUJlbmRQb3NpdGlvbi53ZWlnaHQpO1xyXG4vLyAgICBkaXN0YW5jZXMucHVzaChyZWxhdGl2ZUJlbmRQb3NpdGlvbi5kaXN0YW5jZSk7XHJcbiAgICBpZihuZXdBbmNob3JJbmRleCAhPSAtMSl7XHJcbiAgICAgIHdlaWdodHMuc3BsaWNlKG5ld0FuY2hvckluZGV4LCAwLCByZWxhdGl2ZVBvc2l0aW9uLndlaWdodCk7XHJcbiAgICAgIGRpc3RhbmNlcy5zcGxpY2UobmV3QW5jaG9ySW5kZXgsIDAsIHJlbGF0aXZlUG9zaXRpb24uZGlzdGFuY2UpO1xyXG4gICAgfVxyXG4gICBcclxuICAgIGVkZ2UuZGF0YSh3ZWlnaHRTdHIsIHdlaWdodHMpO1xyXG4gICAgZWRnZS5kYXRhKGRpc3RhbmNlU3RyLCBkaXN0YW5jZXMpO1xyXG4gICAgXHJcbiAgICBlZGdlLmFkZENsYXNzKHRoaXMuc3ludGF4W3R5cGVdWydjbGFzcyddKTtcclxuICAgIGlmICh3ZWlnaHRzLmxlbmd0aCA+IDEgfHwgZGlzdGFuY2VzLmxlbmd0aCA+IDEpIHtcclxuICAgICAgZWRnZS5hZGRDbGFzcyh0aGlzLnN5bnRheFt0eXBlXVsnbXVsdGlDbGFzcyddKTtcclxuICAgIH1cclxuICAgIFxyXG4gICAgcmV0dXJuIG5ld0FuY2hvckluZGV4O1xyXG4gIH0sXHJcbiAgcmVtb3ZlQW5jaG9yOiBmdW5jdGlvbihlZGdlLCBhbmNob3JJbmRleCl7XHJcbiAgICBpZihlZGdlID09PSB1bmRlZmluZWQgfHwgYW5jaG9ySW5kZXggPT09IHVuZGVmaW5lZCl7XHJcbiAgICAgIGVkZ2UgPSB0aGlzLmN1cnJlbnRDdHhFZGdlO1xyXG4gICAgICBhbmNob3JJbmRleCA9IHRoaXMuY3VycmVudEFuY2hvckluZGV4O1xyXG4gICAgfVxyXG4gICAgXHJcbiAgICB2YXIgdHlwZSA9IHRoaXMuZ2V0RWRnZVR5cGUoZWRnZSk7XHJcblxyXG4gICAgaWYodGhpcy5lZGdlVHlwZUluY29uY2x1c2l2ZVNob3VsZG50SGFwcGVuKHR5cGUsIFwiYW5jaG9yUG9pbnRVdGlsaXRpZXMuanMsIHJlbW92ZUFuY2hvclwiKSl7XHJcbiAgICAgIHJldHVybjtcclxuICAgIH1cclxuXHJcbiAgICB2YXIgZGlzdGFuY2VTdHIgPSB0aGlzLnN5bnRheFt0eXBlXVsnd2VpZ2h0J107XHJcbiAgICB2YXIgd2VpZ2h0U3RyID0gdGhpcy5zeW50YXhbdHlwZV1bJ2Rpc3RhbmNlJ107XHJcbiAgICB2YXIgcG9zaXRpb25EYXRhU3RyID0gdGhpcy5zeW50YXhbdHlwZV1bJ3BvaW50UG9zJ107XHJcblxyXG4gICAgdmFyIGRpc3RhbmNlcyA9IGVkZ2UuZGF0YShkaXN0YW5jZVN0cik7XHJcbiAgICB2YXIgd2VpZ2h0cyA9IGVkZ2UuZGF0YSh3ZWlnaHRTdHIpO1xyXG4gICAgdmFyIHBvc2l0aW9ucyA9IGVkZ2UuZGF0YShwb3NpdGlvbkRhdGFTdHIpO1xyXG5cclxuICAgIGRpc3RhbmNlcy5zcGxpY2UoYW5jaG9ySW5kZXgsIDEpO1xyXG4gICAgd2VpZ2h0cy5zcGxpY2UoYW5jaG9ySW5kZXgsIDEpO1xyXG4gICAgaWYgKHBvc2l0aW9ucylcclxuICAgICAgcG9zaXRpb25zLnNwbGljZShhbmNob3JJbmRleCwgMSk7XHJcblxyXG4gICAgLy8gb25seSBvbmUgYW5jaG9yIHBvaW50IGxlZnQgb24gZWRnZVxyXG4gICAgaWYgKGRpc3RhbmNlcy5sZW5ndGggPT0gMSB8fCB3ZWlnaHRzLmxlbmd0aCA9PSAxKSB7XHJcbiAgICAgIGVkZ2UucmVtb3ZlQ2xhc3ModGhpcy5zeW50YXhbdHlwZV1bJ211bHRpQ2xhc3MnXSlcclxuICAgIH1cclxuICAgIC8vIG5vIG1vcmUgYW5jaG9yIHBvaW50cyBvbiBlZGdlXHJcbiAgICBlbHNlIGlmKGRpc3RhbmNlcy5sZW5ndGggPT0gMCB8fCB3ZWlnaHRzLmxlbmd0aCA9PSAwKXtcclxuICAgICAgZWRnZS5yZW1vdmVDbGFzcyh0aGlzLnN5bnRheFt0eXBlXVsnY2xhc3MnXSk7XHJcbiAgICAgIGVkZ2UuZGF0YShkaXN0YW5jZVN0ciwgW10pO1xyXG4gICAgICBlZGdlLmRhdGEod2VpZ2h0U3RyLCBbXSk7XHJcbiAgICB9XHJcbiAgICBlbHNlIHtcclxuICAgICAgZWRnZS5kYXRhKGRpc3RhbmNlU3RyLCBkaXN0YW5jZXMpO1xyXG4gICAgICBlZGdlLmRhdGEod2VpZ2h0U3RyLCB3ZWlnaHRzKTtcclxuICAgIH1cclxuICB9LFxyXG4gIHJlbW92ZUFsbEFuY2hvcnM6IGZ1bmN0aW9uKGVkZ2UpIHtcclxuICAgIGlmIChlZGdlID09PSB1bmRlZmluZWQpIHtcclxuICAgICAgZWRnZSA9IHRoaXMuY3VycmVudEN0eEVkZ2U7XHJcbiAgICB9XHJcbiAgICB2YXIgdHlwZSA9IHRoaXMuZ2V0RWRnZVR5cGUoZWRnZSk7XHJcbiAgICBcclxuICAgIGlmKHRoaXMuZWRnZVR5cGVJbmNvbmNsdXNpdmVTaG91bGRudEhhcHBlbih0eXBlLCBcImFuY2hvclBvaW50VXRpbGl0aWVzLmpzLCByZW1vdmVBbGxBbmNob3JzXCIpKXtcclxuICAgICAgcmV0dXJuO1xyXG4gICAgfVxyXG5cclxuICAgIC8vIFJlbW92ZSBjbGFzc2VzIGZyb20gZWRnZVxyXG4gICAgZWRnZS5yZW1vdmVDbGFzcyh0aGlzLnN5bnRheFt0eXBlXVsnY2xhc3MnXSk7XHJcbiAgICBlZGdlLnJlbW92ZUNsYXNzKHRoaXMuc3ludGF4W3R5cGVdWydtdWx0aUNsYXNzJ10pO1xyXG5cclxuICAgIC8vIFJlbW92ZSBhbGwgYW5jaG9yIHBvaW50IGRhdGEgZnJvbSBlZGdlXHJcbiAgICB2YXIgZGlzdGFuY2VTdHIgPSB0aGlzLnN5bnRheFt0eXBlXVsnd2VpZ2h0J107XHJcbiAgICB2YXIgd2VpZ2h0U3RyID0gdGhpcy5zeW50YXhbdHlwZV1bJ2Rpc3RhbmNlJ107XHJcbiAgICB2YXIgcG9zaXRpb25EYXRhU3RyID0gdGhpcy5zeW50YXhbdHlwZV1bJ3BvaW50UG9zJ107XHJcbiAgICBlZGdlLmRhdGEoZGlzdGFuY2VTdHIsIFtdKTtcclxuICAgIGVkZ2UuZGF0YSh3ZWlnaHRTdHIsIFtdKTtcclxuICAgIGlmIChlZGdlLmRhdGEocG9zaXRpb25EYXRhU3RyKSkge1xyXG4gICAgICBlZGdlLmRhdGEocG9zaXRpb25EYXRhU3RyLCBbXSk7XHJcbiAgICB9XHJcbiAgfSxcclxuICBjYWxjdWxhdGVEaXN0YW5jZTogZnVuY3Rpb24ocHQxLCBwdDIpIHtcclxuICAgIHZhciBkaWZmWCA9IHB0MS54IC0gcHQyLng7XHJcbiAgICB2YXIgZGlmZlkgPSBwdDEueSAtIHB0Mi55O1xyXG4gICAgXHJcbiAgICB2YXIgZGlzdCA9IE1hdGguc3FydCggTWF0aC5wb3coIGRpZmZYLCAyICkgKyBNYXRoLnBvdyggZGlmZlksIDIgKSApO1xyXG4gICAgcmV0dXJuIGRpc3Q7XHJcbiAgfSxcclxuICAvKiogKExlc3MgdGhhbiBvciBlcXVhbCB0bykgYW5kIChncmVhdGVyIHRoZW4gZXF1YWwgdG8pIGNvbXBhcmlzb25zIHdpdGggZmxvYXRpbmcgcG9pbnQgbnVtYmVycyAqL1xyXG4gIGNvbXBhcmVXaXRoUHJlY2lzaW9uOiBmdW5jdGlvbiAobjEsIG4yLCBpc0xlc3NUaGVuT3JFcXVhbCA9IGZhbHNlLCBwcmVjaXNpb24gPSAwLjAxKSB7XHJcbiAgICBjb25zdCBkaWZmID0gbjEgLSBuMjtcclxuICAgIGlmIChNYXRoLmFicyhkaWZmKSA8PSBwcmVjaXNpb24pIHtcclxuICAgICAgcmV0dXJuIHRydWU7XHJcbiAgICB9XHJcbiAgICBpZiAoaXNMZXNzVGhlbk9yRXF1YWwpIHtcclxuICAgICAgcmV0dXJuIG4xIDwgbjI7XHJcbiAgICB9IGVsc2Uge1xyXG4gICAgICByZXR1cm4gbjEgPiBuMjtcclxuICAgIH1cclxuICB9LFxyXG4gIGVkZ2VUeXBlSW5jb25jbHVzaXZlU2hvdWxkbnRIYXBwZW46IGZ1bmN0aW9uKHR5cGUsIHBsYWNlKXtcclxuICAgIGlmKHR5cGUgPT09ICdpbmNvbmNsdXNpdmUnKSB7XHJcbiAgICAgIGNvbnNvbGUubG9nKGBJbiAke3BsYWNlfTogZWRnZSB0eXBlIGluY29uY2x1c2l2ZSBzaG91bGQgbmV2ZXIgaGFwcGVuIGhlcmUhIWApO1xyXG4gICAgICByZXR1cm4gdHJ1ZTtcclxuICAgIH1cclxuICAgIHJldHVybiBmYWxzZTtcclxuICB9XHJcbn07XHJcblxyXG5tb2R1bGUuZXhwb3J0cyA9IGFuY2hvclBvaW50VXRpbGl0aWVzO1xyXG4iLCJ2YXIgZGVib3VuY2UgPSByZXF1aXJlKCcuL2RlYm91bmNlJyk7XHJcbnZhciBhbmNob3JQb2ludFV0aWxpdGllcyA9IHJlcXVpcmUoJy4vQW5jaG9yUG9pbnRVdGlsaXRpZXMnKTtcclxudmFyIHJlY29ubmVjdGlvblV0aWxpdGllcyA9IHJlcXVpcmUoJy4vcmVjb25uZWN0aW9uVXRpbGl0aWVzJyk7XHJcbnZhciByZWdpc3RlclVuZG9SZWRvRnVuY3Rpb25zID0gcmVxdWlyZSgnLi9yZWdpc3RlclVuZG9SZWRvRnVuY3Rpb25zJyk7XHJcbnZhciBzdGFnZUlkID0gMDtcclxuXHJcbm1vZHVsZS5leHBvcnRzID0gZnVuY3Rpb24gKHBhcmFtcywgY3kpIHtcclxuICB2YXIgZm4gPSBwYXJhbXM7XHJcblxyXG4gIHZhciBhZGRCZW5kUG9pbnRDeHRNZW51SWQgPSAnY3ktZWRnZS1iZW5kLWVkaXRpbmctY3h0LWFkZC1iZW5kLXBvaW50JyArIHN0YWdlSWQ7XHJcbiAgdmFyIHJlbW92ZUJlbmRQb2ludEN4dE1lbnVJZCA9ICdjeS1lZGdlLWJlbmQtZWRpdGluZy1jeHQtcmVtb3ZlLWJlbmQtcG9pbnQnICsgc3RhZ2VJZDtcclxuICB2YXIgcmVtb3ZlQWxsQmVuZFBvaW50Q3R4TWVudUlkID0gJ2N5LWVkZ2UtYmVuZC1lZGl0aW5nLWN4dC1yZW1vdmUtbXVsdGlwbGUtYmVuZC1wb2ludCcgKyBzdGFnZUlkO1xyXG4gIHZhciBhZGRDb250cm9sUG9pbnRDeHRNZW51SWQgPSAnY3ktZWRnZS1jb250cm9sLWVkaXRpbmctY3h0LWFkZC1jb250cm9sLXBvaW50JyArIHN0YWdlSWQ7XHJcbiAgdmFyIHJlbW92ZUNvbnRyb2xQb2ludEN4dE1lbnVJZCA9ICdjeS1lZGdlLWNvbnRyb2wtZWRpdGluZy1jeHQtcmVtb3ZlLWNvbnRyb2wtcG9pbnQnICsgc3RhZ2VJZDtcclxuICB2YXIgcmVtb3ZlQWxsQ29udHJvbFBvaW50Q3R4TWVudUlkID0gJ2N5LWVkZ2UtYmVuZC1lZGl0aW5nLWN4dC1yZW1vdmUtbXVsdGlwbGUtY29udHJvbC1wb2ludCcgKyBzdGFnZUlkO1xyXG4gIHZhciBlU3R5bGUsIGVSZW1vdmUsIGVBZGQsIGVab29tLCBlU2VsZWN0LCBlVW5zZWxlY3QsIGVUYXBTdGFydCwgZVRhcFN0YXJ0T25FZGdlLCBlVGFwRHJhZywgZVRhcEVuZCwgZUN4dFRhcCwgZURyYWc7XHJcbiAgLy8gbGFzdCBzdGF0dXMgb2YgZ2VzdHVyZXNcclxuICB2YXIgbGFzdFBhbm5pbmdFbmFibGVkLCBsYXN0Wm9vbWluZ0VuYWJsZWQsIGxhc3RCb3hTZWxlY3Rpb25FbmFibGVkO1xyXG4gIHZhciBsYXN0QWN0aXZlQmdPcGFjaXR5O1xyXG4gIC8vIHN0YXR1cyBvZiBlZGdlIHRvIGhpZ2hsaWdodCBiZW5kcyBhbmQgc2VsZWN0ZWQgZWRnZXNcclxuICB2YXIgZWRnZVRvSGlnaGxpZ2h0LCBudW1iZXJPZlNlbGVjdGVkRWRnZXM7XHJcblxyXG4gIC8vIHRoZSBLYW52YS5zaGFwZSgpIGZvciB0aGUgZW5kcG9pbnRzXHJcbiAgdmFyIGVuZHBvaW50U2hhcGUxID0gbnVsbCwgZW5kcG9pbnRTaGFwZTIgPSBudWxsO1xyXG4gIC8vIHVzZWQgdG8gc3RvcCBjZXJ0YWluIGN5IGxpc3RlbmVycyB3aGVuIGludGVycmFjdGluZyB3aXRoIGFuY2hvcnNcclxuICB2YXIgYW5jaG9yVG91Y2hlZCA9IGZhbHNlO1xyXG4gIC8vIHVzZWQgY2FsbCBlTW91c2VEb3duIG9mIGFuY2hvck1hbmFnZXIgaWYgdGhlIG1vdXNlIGlzIG91dCBvZiB0aGUgY29udGVudCBvbiBjeS5vbih0YXBlbmQpXHJcbiAgdmFyIG1vdXNlT3V0O1xyXG4gIFxyXG4gIHZhciBmdW5jdGlvbnMgPSB7XHJcbiAgICBpbml0OiBmdW5jdGlvbiAoKSB7XHJcbiAgICAgIC8vIHJlZ2lzdGVyIHVuZG8gcmVkbyBmdW5jdGlvbnNcclxuICAgICAgcmVnaXN0ZXJVbmRvUmVkb0Z1bmN0aW9ucyhjeSwgYW5jaG9yUG9pbnRVdGlsaXRpZXMsIHBhcmFtcyk7XHJcbiAgICAgIFxyXG4gICAgICB2YXIgc2VsZiA9IHRoaXM7XHJcbiAgICAgIHZhciBvcHRzID0gcGFyYW1zO1xyXG5cclxuICAgICAgLypcclxuICAgICAgICBNYWtlIHN1cmUgd2UgZG9uJ3QgYXBwZW5kIGFuIGVsZW1lbnQgdGhhdCBhbHJlYWR5IGV4aXN0cy5cclxuICAgICAgICBUaGlzIGV4dGVuc2lvbiBjYW52YXMgdXNlcyB0aGUgc2FtZSBodG1sIGVsZW1lbnQgYXMgZWRnZS1lZGl0aW5nLlxyXG4gICAgICAgIEl0IG1ha2VzIHNlbnNlIHNpbmNlIGl0IGFsc28gdXNlcyB0aGUgc2FtZSBLb252YSBzdGFnZS5cclxuICAgICAgICBXaXRob3V0IHRoZSBiZWxvdyBsb2dpYywgYW4gZW1wdHkgY2FudmFzRWxlbWVudCB3b3VsZCBiZSBjcmVhdGVkXHJcbiAgICAgICAgZm9yIG9uZSBvZiB0aGVzZSBleHRlbnNpb25zIGZvciBubyByZWFzb24uXHJcbiAgICAgICovXHJcbiAgICAgIHZhciAkY29udGFpbmVyID0gJCh0aGlzKTtcclxuICAgICAgdmFyIGNhbnZhc0VsZW1lbnRJZCA9ICdjeS1ub2RlLWVkZ2UtZWRpdGluZy1zdGFnZScgKyBzdGFnZUlkO1xyXG4gICAgICBzdGFnZUlkKys7XHJcbiAgICAgIHZhciAkY2FudmFzRWxlbWVudCA9ICQoJzxkaXYgaWQ9XCInICsgY2FudmFzRWxlbWVudElkICsgJ1wiPjwvZGl2PicpO1xyXG5cclxuICAgICAgaWYgKCRjb250YWluZXIuZmluZCgnIycgKyBjYW52YXNFbGVtZW50SWQpLmxlbmd0aCA8IDEpIHtcclxuICAgICAgICAkY29udGFpbmVyLmFwcGVuZCgkY2FudmFzRWxlbWVudCk7XHJcbiAgICAgIH1cclxuXHJcbiAgICAgIC8qIFxyXG4gICAgICAgIE1haW50YWluIGEgc2luZ2xlIEtvbnZhLnN0YWdlIG9iamVjdCB0aHJvdWdob3V0IHRoZSBhcHBsaWNhdGlvbiB0aGF0IHVzZXMgdGhpcyBleHRlbnNpb25cclxuICAgICAgICBzdWNoIGFzIE5ld3QuIFRoaXMgaXMgaW1wb3J0YW50IHNpbmNlIGhhdmluZyBkaWZmZXJlbnQgc3RhZ2VzIGNhdXNlcyB3ZWlyZCBiZWhhdmlvclxyXG4gICAgICAgIG9uIG90aGVyIGV4dGVuc2lvbnMgdGhhdCBhbHNvIHVzZSBLb252YSwgbGlrZSBub3QgbGlzdGVuaW5nIHRvIG1vdXNlIGNsaWNrcyBhbmQgc3VjaC5cclxuICAgICAgICBJZiB5b3UgYXJlIHNvbWVvbmUgdGhhdCBpcyBjcmVhdGluZyBhbiBleHRlbnNpb24gdGhhdCB1c2VzIEtvbnZhIGluIHRoZSBmdXR1cmUsIHlvdSBuZWVkIHRvXHJcbiAgICAgICAgYmUgY2FyZWZ1bCBhYm91dCBob3cgZXZlbnRzIHJlZ2lzdGVyLiBJZiB5b3UgdXNlIGEgZGlmZmVyZW50IHN0YWdlIGFsbW9zdCBjZXJ0YWlubHkgb25lXHJcbiAgICAgICAgb3IgYm90aCBvZiB0aGUgZXh0ZW5zaW9ucyB0aGF0IHVzZSB0aGUgc3RhZ2UgY3JlYXRlZCBiZWxvdyB3aWxsIGJyZWFrLlxyXG4gICAgICAqLyBcclxuICAgICAgdmFyIHN0YWdlO1xyXG4gICAgICBpZiAoS29udmEuc3RhZ2VzLmxlbmd0aCA8IHN0YWdlSWQpIHtcclxuICAgICAgICBzdGFnZSA9IG5ldyBLb252YS5TdGFnZSh7XHJcbiAgICAgICAgICBpZDogJ25vZGUtZWRnZS1lZGl0aW5nLXN0YWdlJyxcclxuICAgICAgICAgIGNvbnRhaW5lcjogY2FudmFzRWxlbWVudElkLCAgIC8vIGlkIG9mIGNvbnRhaW5lciA8ZGl2PlxyXG4gICAgICAgICAgd2lkdGg6ICRjb250YWluZXIud2lkdGgoKSxcclxuICAgICAgICAgIGhlaWdodDogJGNvbnRhaW5lci5oZWlnaHQoKVxyXG4gICAgICAgIH0pO1xyXG4gICAgICB9XHJcbiAgICAgIGVsc2Uge1xyXG4gICAgICAgIHN0YWdlID0gS29udmEuc3RhZ2VzW3N0YWdlSWQgLSAxXTtcclxuICAgICAgfVxyXG4gICAgICBcclxuICAgICAgdmFyIGNhbnZhcztcclxuICAgICAgaWYgKHN0YWdlLmdldENoaWxkcmVuKCkubGVuZ3RoIDwgMSkge1xyXG4gICAgICAgIGNhbnZhcyA9IG5ldyBLb252YS5MYXllcigpO1xyXG4gICAgICAgIHN0YWdlLmFkZChjYW52YXMpO1xyXG4gICAgICB9XHJcbiAgICAgIGVsc2Uge1xyXG4gICAgICAgIGNhbnZhcyA9IHN0YWdlLmdldENoaWxkcmVuKClbMF07XHJcbiAgICAgIH0gIFxyXG4gICAgICBcclxuICAgICAgdmFyIGFuY2hvck1hbmFnZXIgPSB7XHJcbiAgICAgICAgZWRnZTogdW5kZWZpbmVkLFxyXG4gICAgICAgIGVkZ2VUeXBlOiAnaW5jb25jbHVzaXZlJyxcclxuICAgICAgICBhbmNob3JzOiBbXSxcclxuICAgICAgICAvLyByZW1lbWJlcnMgdGhlIHRvdWNoZWQgYW5jaG9yIHRvIGF2b2lkIGNsZWFyaW5nIGl0IHdoZW4gZHJhZ2dpbmcgaGFwcGVuc1xyXG4gICAgICAgIHRvdWNoZWRBbmNob3I6IHVuZGVmaW5lZCxcclxuICAgICAgICAvLyByZW1lbWJlcnMgdGhlIGluZGV4IG9mIHRoZSBtb3ZpbmcgYW5jaG9yXHJcbiAgICAgICAgdG91Y2hlZEFuY2hvckluZGV4OiB1bmRlZmluZWQsXHJcbiAgICAgICAgYmluZExpc3RlbmVyczogZnVuY3Rpb24oYW5jaG9yKXtcclxuICAgICAgICAgIGFuY2hvci5vbihcIm1vdXNlZG93biB0b3VjaHN0YXJ0XCIsIHRoaXMuZU1vdXNlRG93bik7XHJcbiAgICAgICAgfSxcclxuICAgICAgICB1bmJpbmRMaXN0ZW5lcnM6IGZ1bmN0aW9uKGFuY2hvcil7XHJcbiAgICAgICAgICBhbmNob3Iub2ZmKFwibW91c2Vkb3duIHRvdWNoc3RhcnRcIiwgdGhpcy5lTW91c2VEb3duKTtcclxuICAgICAgICB9LFxyXG4gICAgICAgIC8vIGdldHMgdHJpZ2dlciBvbiBjbGlja2luZyBvbiBjb250ZXh0IG1lbnVzLCB3aGlsZSBjeSBsaXN0ZW5lcnMgZG9uJ3QgZ2V0IHRyaWdnZXJlZFxyXG4gICAgICAgIC8vIGl0IGNhbiBjYXVzZSB3ZWlyZCBiZWhhdmlvdXIgaWYgbm90IGF3YXJlIG9mIHRoaXNcclxuICAgICAgICBlTW91c2VEb3duOiBmdW5jdGlvbihldmVudCl7XHJcbiAgICAgICAgICAvLyBhbmNob3JNYW5hZ2VyLmVkZ2UudW5zZWxlY3QoKSB3b24ndCB3b3JrIHNvbWV0aW1lcyBpZiB0aGlzIHdhc24ndCBoZXJlXHJcbiAgICAgICAgICBjeS5hdXRvdW5zZWxlY3RpZnkoZmFsc2UpO1xyXG5cclxuICAgICAgICAgIC8vIGVNb3VzZURvd24oc2V0KSAtPiB0YXBkcmFnKHVzZWQpIC0+IGVNb3VzZVVwKHJlc2V0KVxyXG4gICAgICAgICAgYW5jaG9yVG91Y2hlZCA9IHRydWU7XHJcbiAgICAgICAgICBhbmNob3JNYW5hZ2VyLnRvdWNoZWRBbmNob3IgPSBldmVudC50YXJnZXQ7XHJcbiAgICAgICAgICBtb3VzZU91dCA9IGZhbHNlO1xyXG4gICAgICAgICAgYW5jaG9yTWFuYWdlci5lZGdlLnVuc2VsZWN0KCk7XHJcblxyXG4gICAgICAgICAgLy8gcmVtZW1iZXIgc3RhdGUgYmVmb3JlIGNoYW5naW5nXHJcbiAgICAgICAgICB2YXIgd2VpZ2h0U3RyID0gYW5jaG9yUG9pbnRVdGlsaXRpZXMuc3ludGF4W2FuY2hvck1hbmFnZXIuZWRnZVR5cGVdWyd3ZWlnaHQnXTtcclxuICAgICAgICAgIHZhciBkaXN0YW5jZVN0ciA9IGFuY2hvclBvaW50VXRpbGl0aWVzLnN5bnRheFthbmNob3JNYW5hZ2VyLmVkZ2VUeXBlXVsnZGlzdGFuY2UnXTtcclxuXHJcbiAgICAgICAgICB2YXIgZWRnZSA9IGFuY2hvck1hbmFnZXIuZWRnZTtcclxuICAgICAgICAgIG1vdmVBbmNob3JQYXJhbSA9IHtcclxuICAgICAgICAgICAgZWRnZTogZWRnZSxcclxuICAgICAgICAgICAgdHlwZTogYW5jaG9yTWFuYWdlci5lZGdlVHlwZSxcclxuICAgICAgICAgICAgd2VpZ2h0czogZWRnZS5kYXRhKHdlaWdodFN0cikgPyBbXS5jb25jYXQoZWRnZS5kYXRhKHdlaWdodFN0cikpIDogW10sXHJcbiAgICAgICAgICAgIGRpc3RhbmNlczogZWRnZS5kYXRhKGRpc3RhbmNlU3RyKSA/IFtdLmNvbmNhdChlZGdlLmRhdGEoZGlzdGFuY2VTdHIpKSA6IFtdXHJcbiAgICAgICAgICB9O1xyXG5cclxuICAgICAgICAgIHR1cm5PZmZBY3RpdmVCZ0NvbG9yKCk7XHJcbiAgICAgICAgICBkaXNhYmxlR2VzdHVyZXMoKTtcclxuICAgICAgICAgIFxyXG4gICAgICAgICAgY3kuYXV0b3VuZ3JhYmlmeSh0cnVlKTtcclxuXHJcbiAgICAgICAgICBjYW52YXMuZ2V0U3RhZ2UoKS5vbihcImNvbnRlbnRUb3VjaGVuZCBjb250ZW50TW91c2V1cFwiLCBhbmNob3JNYW5hZ2VyLmVNb3VzZVVwKTtcclxuICAgICAgICAgIGNhbnZhcy5nZXRTdGFnZSgpLm9uKFwiY29udGVudE1vdXNlb3V0XCIsIGFuY2hvck1hbmFnZXIuZU1vdXNlT3V0KTtcclxuICAgICAgICB9LFxyXG4gICAgICAgIC8vIGdldHMgY2FsbGVkIGJlZm9yZSBjeS5vbigndGFwZW5kJylcclxuICAgICAgICBlTW91c2VVcDogZnVuY3Rpb24oZXZlbnQpe1xyXG4gICAgICAgICAgLy8gd29uJ3QgYmUgY2FsbGVkIGlmIHRoZSBtb3VzZSBpcyByZWxlYXNlZCBvdXQgb2Ygc2NyZWVuXHJcbiAgICAgICAgICBhbmNob3JUb3VjaGVkID0gZmFsc2U7XHJcbiAgICAgICAgICBhbmNob3JNYW5hZ2VyLnRvdWNoZWRBbmNob3IgPSB1bmRlZmluZWQ7XHJcbiAgICAgICAgICBtb3VzZU91dCA9IGZhbHNlO1xyXG4gICAgICAgICAgYW5jaG9yTWFuYWdlci5lZGdlLnNlbGVjdCgpO1xyXG4gICAgICAgICAgXHJcbiAgICAgICAgICByZXNldEFjdGl2ZUJnQ29sb3IoKTtcclxuICAgICAgICAgIHJlc2V0R2VzdHVyZXMoKTtcclxuICAgICAgICAgIFxyXG4gICAgICAgICAgLyogXHJcbiAgICAgICAgICAgKiBJTVBPUlRBTlRcclxuICAgICAgICAgICAqIEFueSBwcm9ncmFtbWF0aWMgY2FsbHMgdG8gLnNlbGVjdCgpLCAudW5zZWxlY3QoKSBhZnRlciB0aGlzIHN0YXRlbWVudCBhcmUgaWdub3JlZFxyXG4gICAgICAgICAgICogdW50aWwgY3kuYXV0b3Vuc2VsZWN0aWZ5KGZhbHNlKSBpcyBjYWxsZWQgaW4gb25lIG9mIHRoZSBwcmV2aW91czpcclxuICAgICAgICAgICAqIFxyXG4gICAgICAgICAgICogY3kub24oJ3RhcHN0YXJ0JylcclxuICAgICAgICAgICAqIGFuY2hvci5vbignbW91c2Vkb3duIHRvdWNoc3RhcnQnKVxyXG4gICAgICAgICAgICogZG9jdW1lbnQub24oJ2tleWRvd24nKVxyXG4gICAgICAgICAgICogY3kub24oJ3RhcGRyYXAnKVxyXG4gICAgICAgICAgICogXHJcbiAgICAgICAgICAgKiBEb2Vzbid0IGFmZmVjdCBVWCwgYnV0IG1heSBjYXVzZSBjb25mdXNpbmcgYmVoYXZpb3VyIGlmIG5vdCBhd2FyZSBvZiB0aGlzIHdoZW4gY29kaW5nXHJcbiAgICAgICAgICAgKiBcclxuICAgICAgICAgICAqIFdoeSBpcyB0aGlzIGhlcmU/XHJcbiAgICAgICAgICAgKiBUaGlzIGlzIGltcG9ydGFudCB0byBrZWVwIGVkZ2VzIGZyb20gYmVpbmcgYXV0byBkZXNlbGVjdGVkIGZyb20gd29ya2luZ1xyXG4gICAgICAgICAgICogd2l0aCBhbmNob3JzIG91dCBvZiB0aGUgZWRnZSBib2R5IChmb3IgdW5idW5kbGVkIGJlemllciwgdGVjaG5pY2FsbHkgbm90IG5lY2Vzc2VyeSBmb3Igc2VnZW1lbnRzKS5cclxuICAgICAgICAgICAqIFxyXG4gICAgICAgICAgICogVGhlc2UgaXMgYW50aGVyIGN5LmF1dG9zZWxlY3RpZnkodHJ1ZSkgaW4gY3kub24oJ3RhcGVuZCcpIFxyXG4gICAgICAgICAgICogXHJcbiAgICAgICAgICAqLyBcclxuICAgICAgICAgIGN5LmF1dG91bnNlbGVjdGlmeSh0cnVlKTtcclxuICAgICAgICAgIGN5LmF1dG91bmdyYWJpZnkoZmFsc2UpO1xyXG5cclxuICAgICAgICAgIGNhbnZhcy5nZXRTdGFnZSgpLm9mZihcImNvbnRlbnRUb3VjaGVuZCBjb250ZW50TW91c2V1cFwiLCBhbmNob3JNYW5hZ2VyLmVNb3VzZVVwKTtcclxuICAgICAgICAgIGNhbnZhcy5nZXRTdGFnZSgpLm9mZihcImNvbnRlbnRNb3VzZW91dFwiLCBhbmNob3JNYW5hZ2VyLmVNb3VzZU91dCk7XHJcbiAgICAgICAgfSxcclxuICAgICAgICAvLyBoYW5kbGUgbW91c2UgZ29pbmcgb3V0IG9mIGNhbnZhcyBcclxuICAgICAgICBlTW91c2VPdXQ6IGZ1bmN0aW9uIChldmVudCl7XHJcbiAgICAgICAgICBtb3VzZU91dCA9IHRydWU7XHJcbiAgICAgICAgfSxcclxuICAgICAgICBjbGVhckFuY2hvcnNFeGNlcHQ6IGZ1bmN0aW9uKGRvbnRDbGVhbiA9IHVuZGVmaW5lZCl7XHJcbiAgICAgICAgICB2YXIgZXhjZXB0aW9uQXBwbGllcyA9IGZhbHNlO1xyXG5cclxuICAgICAgICAgIHRoaXMuYW5jaG9ycy5mb3JFYWNoKChhbmNob3IsIGluZGV4KSA9PiB7XHJcbiAgICAgICAgICAgIGlmKGRvbnRDbGVhbiAmJiBhbmNob3IgPT09IGRvbnRDbGVhbil7XHJcbiAgICAgICAgICAgICAgZXhjZXB0aW9uQXBwbGllcyA9IHRydWU7IC8vIHRoZSBkb250Q2xlYW4gYW5jaG9yIGlzIG5vdCBjbGVhcmVkXHJcbiAgICAgICAgICAgICAgcmV0dXJuO1xyXG4gICAgICAgICAgICB9XHJcblxyXG4gICAgICAgICAgICB0aGlzLnVuYmluZExpc3RlbmVycyhhbmNob3IpO1xyXG4gICAgICAgICAgICBhbmNob3IuZGVzdHJveSgpO1xyXG4gICAgICAgICAgfSk7XHJcblxyXG4gICAgICAgICAgaWYoZXhjZXB0aW9uQXBwbGllcyl7XHJcbiAgICAgICAgICAgIHRoaXMuYW5jaG9ycyA9IFtkb250Q2xlYW5dO1xyXG4gICAgICAgICAgfVxyXG4gICAgICAgICAgZWxzZSB7XHJcbiAgICAgICAgICAgIHRoaXMuYW5jaG9ycyA9IFtdO1xyXG4gICAgICAgICAgICB0aGlzLmVkZ2UgPSB1bmRlZmluZWQ7XHJcbiAgICAgICAgICAgIHRoaXMuZWRnZVR5cGUgPSAnaW5jb25jbHVzaXZlJztcclxuICAgICAgICAgIH1cclxuICAgICAgICB9LFxyXG4gICAgICAgIC8vIHJlbmRlciB0aGUgYmVuZCBhbmQgY29udHJvbCBzaGFwZXMgb2YgdGhlIGdpdmVuIGVkZ2VcclxuICAgICAgICByZW5kZXJBbmNob3JTaGFwZXM6IGZ1bmN0aW9uKGVkZ2UpIHtcclxuICAgICAgICAgIHRoaXMuZWRnZSA9IGVkZ2U7XHJcbiAgICAgICAgICB0aGlzLmVkZ2VUeXBlID0gYW5jaG9yUG9pbnRVdGlsaXRpZXMuZ2V0RWRnZVR5cGUoZWRnZSk7XHJcblxyXG4gICAgICAgICAgaWYoIWVkZ2UuaGFzQ2xhc3MoJ2VkZ2ViZW5kZWRpdGluZy1oYXNiZW5kcG9pbnRzJykgJiZcclxuICAgICAgICAgICAgICAhZWRnZS5oYXNDbGFzcygnZWRnZWNvbnRyb2xlZGl0aW5nLWhhc2NvbnRyb2xwb2ludHMnKSkge1xyXG4gICAgICAgICAgICByZXR1cm47XHJcbiAgICAgICAgICB9XHJcbiAgICAgICAgICBcclxuICAgICAgICAgIHZhciBhbmNob3JMaXN0ID0gYW5jaG9yUG9pbnRVdGlsaXRpZXMuZ2V0QW5jaG9yc0FzQXJyYXkoZWRnZSk7Ly9lZGdlLl9wcml2YXRlLnJkYXRhLnNlZ3B0cztcclxuICAgICAgICAgIHZhciBsZW5ndGggPSBnZXRBbmNob3JTaGFwZXNMZW5ndGgoZWRnZSkgKiAwLjY1O1xyXG4gICAgICAgICAgXHJcbiAgICAgICAgICB2YXIgc3JjUG9zID0gZWRnZS5zb3VyY2UoKS5wb3NpdGlvbigpO1xyXG4gICAgICAgICAgdmFyIHRndFBvcyA9IGVkZ2UudGFyZ2V0KCkucG9zaXRpb24oKTtcclxuXHJcbiAgICAgICAgICBmb3IodmFyIGkgPSAwOyBhbmNob3JMaXN0ICYmIGkgPCBhbmNob3JMaXN0Lmxlbmd0aDsgaSA9IGkgKyAyKXtcclxuICAgICAgICAgICAgdmFyIGFuY2hvclggPSBhbmNob3JMaXN0W2ldO1xyXG4gICAgICAgICAgICB2YXIgYW5jaG9yWSA9IGFuY2hvckxpc3RbaSArIDFdO1xyXG5cclxuICAgICAgICAgICAgdGhpcy5yZW5kZXJBbmNob3JTaGFwZShhbmNob3JYLCBhbmNob3JZLCBsZW5ndGgpO1xyXG4gICAgICAgICAgfVxyXG5cclxuICAgICAgICAgIGNhbnZhcy5kcmF3KCk7XHJcbiAgICAgICAgfSxcclxuICAgICAgICAvLyByZW5kZXIgYSBhbmNob3Igc2hhcGUgd2l0aCB0aGUgZ2l2ZW4gcGFyYW1ldGVyc1xyXG4gICAgICAgIHJlbmRlckFuY2hvclNoYXBlOiBmdW5jdGlvbihhbmNob3JYLCBhbmNob3JZLCBsZW5ndGgpIHtcclxuICAgICAgICAgIC8vIGdldCB0aGUgdG9wIGxlZnQgY29vcmRpbmF0ZXNcclxuICAgICAgICAgIHZhciB0b3BMZWZ0WCA9IGFuY2hvclggLSBsZW5ndGggLyAyO1xyXG4gICAgICAgICAgdmFyIHRvcExlZnRZID0gYW5jaG9yWSAtIGxlbmd0aCAvIDI7XHJcbiAgICAgICAgICBcclxuICAgICAgICAgIC8vIGNvbnZlcnQgdG8gcmVuZGVyZWQgcGFyYW1ldGVyc1xyXG4gICAgICAgICAgdmFyIHJlbmRlcmVkVG9wTGVmdFBvcyA9IGNvbnZlcnRUb1JlbmRlcmVkUG9zaXRpb24oe3g6IHRvcExlZnRYLCB5OiB0b3BMZWZ0WX0pO1xyXG4gICAgICAgICAgbGVuZ3RoICo9IGN5Lnpvb20oKTtcclxuICAgICAgICAgIFxyXG4gICAgICAgICAgdmFyIG5ld0FuY2hvciA9IG5ldyBLb252YS5SZWN0KHtcclxuICAgICAgICAgICAgeDogcmVuZGVyZWRUb3BMZWZ0UG9zLngsXHJcbiAgICAgICAgICAgIHk6IHJlbmRlcmVkVG9wTGVmdFBvcy55LFxyXG4gICAgICAgICAgICB3aWR0aDogbGVuZ3RoLFxyXG4gICAgICAgICAgICBoZWlnaHQ6IGxlbmd0aCxcclxuICAgICAgICAgICAgZmlsbDogJ2JsYWNrJyxcclxuICAgICAgICAgICAgc3Ryb2tlV2lkdGg6IDAsXHJcbiAgICAgICAgICAgIGRyYWdnYWJsZTogdHJ1ZVxyXG4gICAgICAgICAgfSk7XHJcblxyXG4gICAgICAgICAgdGhpcy5hbmNob3JzLnB1c2gobmV3QW5jaG9yKTtcclxuICAgICAgICAgIHRoaXMuYmluZExpc3RlbmVycyhuZXdBbmNob3IpO1xyXG4gICAgICAgICAgY2FudmFzLmFkZChuZXdBbmNob3IpO1xyXG4gICAgICAgIH1cclxuICAgICAgfTtcclxuXHJcbiAgICAgIHZhciBjeHRBZGRCZW5kRmNuID0gZnVuY3Rpb24oZXZlbnQpe1xyXG4gICAgICAgIGN4dEFkZEFuY2hvckZjbihldmVudCwgJ2JlbmQnKTtcclxuICAgICAgfVxyXG5cclxuICAgICAgdmFyIGN4dEFkZENvbnRyb2xGY24gPSBmdW5jdGlvbihldmVudCkge1xyXG4gICAgICAgIGN4dEFkZEFuY2hvckZjbihldmVudCwgJ2NvbnRyb2wnKTtcclxuICAgICAgfVxyXG5cclxuICAgICAgdmFyIGN4dEFkZEFuY2hvckZjbiA9IGZ1bmN0aW9uIChldmVudCwgYW5jaG9yVHlwZSkge1xyXG4gICAgICAgIHZhciBlZGdlID0gZXZlbnQudGFyZ2V0IHx8IGV2ZW50LmN5VGFyZ2V0O1xyXG4gICAgICAgIGlmKCFhbmNob3JQb2ludFV0aWxpdGllcy5pc0lnbm9yZWRFZGdlKGVkZ2UpKSB7XHJcblxyXG4gICAgICAgICAgdmFyIHR5cGUgPSBhbmNob3JQb2ludFV0aWxpdGllcy5nZXRFZGdlVHlwZShlZGdlKTtcclxuICAgICAgICAgIHZhciB3ZWlnaHRzLCBkaXN0YW5jZXMsIHdlaWdodFN0ciwgZGlzdGFuY2VTdHI7XHJcblxyXG4gICAgICAgICAgaWYodHlwZSA9PT0gJ2luY29uY2x1c2l2ZScpe1xyXG4gICAgICAgICAgICB3ZWlnaHRzID0gW107XHJcbiAgICAgICAgICAgIGRpc3RhbmNlcyA9IFtdO1xyXG4gICAgICAgICAgfVxyXG4gICAgICAgICAgZWxzZXtcclxuICAgICAgICAgICAgd2VpZ2h0U3RyID0gYW5jaG9yUG9pbnRVdGlsaXRpZXMuc3ludGF4W3R5cGVdWyd3ZWlnaHQnXTtcclxuICAgICAgICAgICAgZGlzdGFuY2VTdHIgPSBhbmNob3JQb2ludFV0aWxpdGllcy5zeW50YXhbdHlwZV1bJ2Rpc3RhbmNlJ107XHJcblxyXG4gICAgICAgICAgICB3ZWlnaHRzID0gZWRnZS5kYXRhKHdlaWdodFN0cikgPyBbXS5jb25jYXQoZWRnZS5kYXRhKHdlaWdodFN0cikpIDogZWRnZS5kYXRhKHdlaWdodFN0cik7XHJcbiAgICAgICAgICAgIGRpc3RhbmNlcyA9IGVkZ2UuZGF0YShkaXN0YW5jZVN0cikgPyBbXS5jb25jYXQoZWRnZS5kYXRhKGRpc3RhbmNlU3RyKSkgOiBlZGdlLmRhdGEoZGlzdGFuY2VTdHIpO1xyXG4gICAgICAgICAgfVxyXG5cclxuICAgICAgICAgIHZhciBwYXJhbSA9IHtcclxuICAgICAgICAgICAgZWRnZTogZWRnZSxcclxuICAgICAgICAgICAgdHlwZTogdHlwZSxcclxuICAgICAgICAgICAgd2VpZ2h0czogd2VpZ2h0cyxcclxuICAgICAgICAgICAgZGlzdGFuY2VzOiBkaXN0YW5jZXNcclxuICAgICAgICAgIH07XHJcblxyXG4gICAgICAgICAgLy8gdGhlIHVuZGVmaW5lZCBnbyBmb3IgZWRnZSBhbmQgbmV3QW5jaG9yUG9pbnQgcGFyYW1ldGVyc1xyXG4gICAgICAgICAgYW5jaG9yUG9pbnRVdGlsaXRpZXMuYWRkQW5jaG9yUG9pbnQodW5kZWZpbmVkLCB1bmRlZmluZWQsIGFuY2hvclR5cGUpO1xyXG5cclxuICAgICAgICAgIGlmIChvcHRpb25zKCkudW5kb2FibGUpIHtcclxuICAgICAgICAgICAgY3kudW5kb1JlZG8oKS5kbygnY2hhbmdlQW5jaG9yUG9pbnRzJywgcGFyYW0pO1xyXG4gICAgICAgICAgfVxyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgcmVmcmVzaERyYXdzKCk7XHJcbiAgICAgICAgZWRnZS5zZWxlY3QoKTtcclxuICAgICAgfTtcclxuXHJcbiAgICAgIHZhciBjeHRSZW1vdmVBbmNob3JGY24gPSBmdW5jdGlvbiAoZXZlbnQpIHtcclxuICAgICAgICB2YXIgZWRnZSA9IGFuY2hvck1hbmFnZXIuZWRnZTtcclxuICAgICAgICB2YXIgdHlwZSA9IGFuY2hvclBvaW50VXRpbGl0aWVzLmdldEVkZ2VUeXBlKGVkZ2UpO1xyXG5cclxuICAgICAgICBpZihhbmNob3JQb2ludFV0aWxpdGllcy5lZGdlVHlwZUluY29uY2x1c2l2ZVNob3VsZG50SGFwcGVuKHR5cGUsIFwiVWlVdGlsaXRpZXMuanMsIGN4dFJlbW92ZUFuY2hvckZjblwiKSl7XHJcbiAgICAgICAgICByZXR1cm47XHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICB2YXIgcGFyYW0gPSB7XHJcbiAgICAgICAgICBlZGdlOiBlZGdlLFxyXG4gICAgICAgICAgdHlwZTogdHlwZSxcclxuICAgICAgICAgIHdlaWdodHM6IFtdLmNvbmNhdChlZGdlLmRhdGEoYW5jaG9yUG9pbnRVdGlsaXRpZXMuc3ludGF4W3R5cGVdWyd3ZWlnaHQnXSkpLFxyXG4gICAgICAgICAgZGlzdGFuY2VzOiBbXS5jb25jYXQoZWRnZS5kYXRhKGFuY2hvclBvaW50VXRpbGl0aWVzLnN5bnRheFt0eXBlXVsnZGlzdGFuY2UnXSkpXHJcbiAgICAgICAgfTtcclxuXHJcbiAgICAgICAgYW5jaG9yUG9pbnRVdGlsaXRpZXMucmVtb3ZlQW5jaG9yKCk7XHJcbiAgICAgICAgXHJcbiAgICAgICAgaWYob3B0aW9ucygpLnVuZG9hYmxlKSB7XHJcbiAgICAgICAgICBjeS51bmRvUmVkbygpLmRvKCdjaGFuZ2VBbmNob3JQb2ludHMnLCBwYXJhbSk7XHJcbiAgICAgICAgfVxyXG4gICAgICAgIFxyXG4gICAgICAgIHNldFRpbWVvdXQoZnVuY3Rpb24oKXtyZWZyZXNoRHJhd3MoKTtlZGdlLnNlbGVjdCgpO30sIDUwKSA7XHJcblxyXG4gICAgICB9O1xyXG5cclxuICAgICAgdmFyIGN4dFJlbW92ZUFsbEFuY2hvcnNGY24gPSBmdW5jdGlvbiAoZXZlbnQpIHtcclxuICAgICAgICB2YXIgZWRnZSA9IGFuY2hvck1hbmFnZXIuZWRnZTtcclxuICAgICAgICB2YXIgdHlwZSA9IGFuY2hvclBvaW50VXRpbGl0aWVzLmdldEVkZ2VUeXBlKGVkZ2UpO1xyXG4gICAgICAgIHZhciBwYXJhbSA9IHtcclxuICAgICAgICAgIGVkZ2U6IGVkZ2UsXHJcbiAgICAgICAgICB0eXBlOiB0eXBlLFxyXG4gICAgICAgICAgd2VpZ2h0czogW10uY29uY2F0KGVkZ2UuZGF0YShhbmNob3JQb2ludFV0aWxpdGllcy5zeW50YXhbdHlwZV1bJ3dlaWdodCddKSksXHJcbiAgICAgICAgICBkaXN0YW5jZXM6IFtdLmNvbmNhdChlZGdlLmRhdGEoYW5jaG9yUG9pbnRVdGlsaXRpZXMuc3ludGF4W3R5cGVdWydkaXN0YW5jZSddKSlcclxuICAgICAgICB9O1xyXG4gICAgICAgIFxyXG4gICAgICAgIGFuY2hvclBvaW50VXRpbGl0aWVzLnJlbW92ZUFsbEFuY2hvcnMoKTtcclxuXHJcbiAgICAgICAgaWYgKG9wdGlvbnMoKS51bmRvYWJsZSkge1xyXG4gICAgICAgICAgY3kudW5kb1JlZG8oKS5kbygnY2hhbmdlQW5jaG9yUG9pbnRzJywgcGFyYW0pO1xyXG4gICAgICAgIH1cclxuICAgICAgICBzZXRUaW1lb3V0KGZ1bmN0aW9uKCl7cmVmcmVzaERyYXdzKCk7ZWRnZS5zZWxlY3QoKTt9LCA1MCk7XHJcbiAgICAgIH1cclxuICAgICAgXHJcbiAgICAgIC8vIGZ1bmN0aW9uIHRvIHJlY29ubmVjdCBlZGdlXHJcbiAgICAgIHZhciBoYW5kbGVSZWNvbm5lY3RFZGdlID0gb3B0cy5oYW5kbGVSZWNvbm5lY3RFZGdlO1xyXG4gICAgICAvLyBmdW5jdGlvbiB0byB2YWxpZGF0ZSBlZGdlIHNvdXJjZSBhbmQgdGFyZ2V0IG9uIHJlY29ubmVjdGlvblxyXG4gICAgICB2YXIgdmFsaWRhdGVFZGdlID0gb3B0cy52YWxpZGF0ZUVkZ2U7IFxyXG4gICAgICAvLyBmdW5jdGlvbiB0byBiZSBjYWxsZWQgb24gaW52YWxpZCBlZGdlIHJlY29ubmVjdGlvblxyXG4gICAgICB2YXIgYWN0T25VbnN1Y2Nlc3NmdWxSZWNvbm5lY3Rpb24gPSBvcHRzLmFjdE9uVW5zdWNjZXNzZnVsUmVjb25uZWN0aW9uO1xyXG4gICAgICBcclxuICAgICAgdmFyIG1lbnVJdGVtcyA9IFtcclxuICAgICAgICB7XHJcbiAgICAgICAgICBpZDogYWRkQmVuZFBvaW50Q3h0TWVudUlkLFxyXG4gICAgICAgICAgdGl0bGU6IG9wdHMuYWRkQmVuZE1lbnVJdGVtVGl0bGUsXHJcbiAgICAgICAgICBjb250ZW50OiAnQWRkIEJlbmQgUG9pbnQnLFxyXG4gICAgICAgICAgc2VsZWN0b3I6ICdlZGdlJyxcclxuICAgICAgICAgIG9uQ2xpY2tGdW5jdGlvbjogY3h0QWRkQmVuZEZjblxyXG4gICAgICAgIH0sXHJcbiAgICAgICAge1xyXG4gICAgICAgICAgaWQ6IHJlbW92ZUJlbmRQb2ludEN4dE1lbnVJZCxcclxuICAgICAgICAgIHRpdGxlOiBvcHRzLnJlbW92ZUJlbmRNZW51SXRlbVRpdGxlLFxyXG4gICAgICAgICAgY29udGVudDogJ1JlbW92ZSBCZW5kIFBvaW50JyxcclxuICAgICAgICAgIHNlbGVjdG9yOiAnZWRnZScsXHJcbiAgICAgICAgICBvbkNsaWNrRnVuY3Rpb246IGN4dFJlbW92ZUFuY2hvckZjblxyXG4gICAgICAgIH0sIFxyXG4gICAgICAgIHtcclxuICAgICAgICAgIGlkOiByZW1vdmVBbGxCZW5kUG9pbnRDdHhNZW51SWQsXHJcbiAgICAgICAgICB0aXRsZTogb3B0cy5yZW1vdmVBbGxCZW5kTWVudUl0ZW1UaXRsZSxcclxuICAgICAgICAgIGNvbnRlbnQ6ICdSZW1vdmUgQWxsIEJlbmQgUG9pbnRzJyxcclxuICAgICAgICAgIHNlbGVjdG9yOiBvcHRzLmVuYWJsZU11bHRpcGxlQW5jaG9yUmVtb3ZhbE9wdGlvbiAmJiAnOnNlbGVjdGVkLmVkZ2ViZW5kZWRpdGluZy1oYXNtdWx0aXBsZWJlbmRwb2ludHMnLFxyXG4gICAgICAgICAgb25DbGlja0Z1bmN0aW9uOiBjeHRSZW1vdmVBbGxBbmNob3JzRmNuXHJcbiAgICAgICAgfSxcclxuICAgICAgICB7XHJcbiAgICAgICAgICBpZDogYWRkQ29udHJvbFBvaW50Q3h0TWVudUlkLFxyXG4gICAgICAgICAgdGl0bGU6IG9wdHMuYWRkQ29udHJvbE1lbnVJdGVtVGl0bGUsXHJcbiAgICAgICAgICBjb250ZW50OiAnQWRkIENvbnRyb2wgUG9pbnQnLFxyXG4gICAgICAgICAgc2VsZWN0b3I6ICdlZGdlJyxcclxuICAgICAgICAgIGNvcmVBc1dlbGw6IHRydWUsXHJcbiAgICAgICAgICBvbkNsaWNrRnVuY3Rpb246IGN4dEFkZENvbnRyb2xGY25cclxuICAgICAgICB9LFxyXG4gICAgICAgIHtcclxuICAgICAgICAgIGlkOiByZW1vdmVDb250cm9sUG9pbnRDeHRNZW51SWQsXHJcbiAgICAgICAgICB0aXRsZTogb3B0cy5yZW1vdmVDb250cm9sTWVudUl0ZW1UaXRsZSxcclxuICAgICAgICAgIGNvbnRlbnQ6ICdSZW1vdmUgQ29udHJvbCBQb2ludCcsXHJcbiAgICAgICAgICBzZWxlY3RvcjogJ2VkZ2UnLFxyXG4gICAgICAgICAgY29yZUFzV2VsbDogdHJ1ZSxcclxuICAgICAgICAgIG9uQ2xpY2tGdW5jdGlvbjogY3h0UmVtb3ZlQW5jaG9yRmNuXHJcbiAgICAgICAgfSwgXHJcbiAgICAgICAge1xyXG4gICAgICAgICAgaWQ6IHJlbW92ZUFsbENvbnRyb2xQb2ludEN0eE1lbnVJZCxcclxuICAgICAgICAgIHRpdGxlOiBvcHRzLnJlbW92ZUFsbENvbnRyb2xNZW51SXRlbVRpdGxlLFxyXG4gICAgICAgICAgY29udGVudDogJ1JlbW92ZSBBbGwgQ29udHJvbCBQb2ludHMnLFxyXG4gICAgICAgICAgc2VsZWN0b3I6IG9wdHMuZW5hYmxlTXVsdGlwbGVBbmNob3JSZW1vdmFsT3B0aW9uICYmICc6c2VsZWN0ZWQuZWRnZWNvbnRyb2xlZGl0aW5nLWhhc211bHRpcGxlY29udHJvbHBvaW50cycsXHJcbiAgICAgICAgICBvbkNsaWNrRnVuY3Rpb246IGN4dFJlbW92ZUFsbEFuY2hvcnNGY25cclxuICAgICAgICB9LFxyXG4gICAgICBdO1xyXG4gICAgICBcclxuICAgICAgaWYoY3kuY29udGV4dE1lbnVzKSB7XHJcbiAgICAgICAgdmFyIG1lbnVzID0gY3kuY29udGV4dE1lbnVzKCdnZXQnKTtcclxuICAgICAgICAvLyBJZiBjb250ZXh0IG1lbnVzIGlzIGFjdGl2ZSBqdXN0IGFwcGVuZCBtZW51IGl0ZW1zIGVsc2UgYWN0aXZhdGUgdGhlIGV4dGVuc2lvblxyXG4gICAgICAgIC8vIHdpdGggaW5pdGlhbCBtZW51IGl0ZW1zXHJcbiAgICAgICAgaWYgKG1lbnVzLmlzQWN0aXZlKCkpIHtcclxuICAgICAgICAgIG1lbnVzLmFwcGVuZE1lbnVJdGVtcyhtZW51SXRlbXMpO1xyXG4gICAgICAgIH1cclxuICAgICAgICBlbHNlIHtcclxuICAgICAgICAgIGN5LmNvbnRleHRNZW51cyh7XHJcbiAgICAgICAgICAgIG1lbnVJdGVtczogbWVudUl0ZW1zXHJcbiAgICAgICAgICB9KTtcclxuICAgICAgICB9XHJcbiAgICAgIH1cclxuICAgICAgXHJcbiAgICAgIHZhciBfc2l6ZUNhbnZhcyA9IGRlYm91bmNlKGZ1bmN0aW9uICgpIHtcclxuICAgICAgICAkY2FudmFzRWxlbWVudFxyXG4gICAgICAgICAgLmF0dHIoJ2hlaWdodCcsICRjb250YWluZXIuaGVpZ2h0KCkpXHJcbiAgICAgICAgICAuYXR0cignd2lkdGgnLCAkY29udGFpbmVyLndpZHRoKCkpXHJcbiAgICAgICAgICAuY3NzKHtcclxuICAgICAgICAgICAgJ3Bvc2l0aW9uJzogJ2Fic29sdXRlJyxcclxuICAgICAgICAgICAgJ3RvcCc6IDAsXHJcbiAgICAgICAgICAgICdsZWZ0JzogMCxcclxuICAgICAgICAgICAgJ3otaW5kZXgnOiBvcHRpb25zKCkuekluZGV4XHJcbiAgICAgICAgICB9KVxyXG4gICAgICAgIDtcclxuXHJcbiAgICAgICAgc2V0VGltZW91dChmdW5jdGlvbiAoKSB7XHJcbiAgICAgICAgICB2YXIgY2FudmFzQmIgPSAkY2FudmFzRWxlbWVudC5vZmZzZXQoKTtcclxuICAgICAgICAgIHZhciBjb250YWluZXJCYiA9ICRjb250YWluZXIub2Zmc2V0KCk7XHJcblxyXG4gICAgICAgICAgJGNhbnZhc0VsZW1lbnRcclxuICAgICAgICAgICAgLmNzcyh7XHJcbiAgICAgICAgICAgICAgJ3RvcCc6IC0oY2FudmFzQmIudG9wIC0gY29udGFpbmVyQmIudG9wKSxcclxuICAgICAgICAgICAgICAnbGVmdCc6IC0oY2FudmFzQmIubGVmdCAtIGNvbnRhaW5lckJiLmxlZnQpXHJcbiAgICAgICAgICAgIH0pXHJcbiAgICAgICAgICA7XHJcblxyXG4gICAgICAgICAgY2FudmFzLmdldFN0YWdlKCkuc2V0V2lkdGgoJGNvbnRhaW5lci53aWR0aCgpKTtcclxuICAgICAgICAgIGNhbnZhcy5nZXRTdGFnZSgpLnNldEhlaWdodCgkY29udGFpbmVyLmhlaWdodCgpKTtcclxuXHJcbiAgICAgICAgICAvLyByZWRyYXcgb24gY2FudmFzIHJlc2l6ZVxyXG4gICAgICAgICAgaWYoY3kpe1xyXG4gICAgICAgICAgICByZWZyZXNoRHJhd3MoKTtcclxuICAgICAgICAgIH1cclxuICAgICAgICB9LCAwKTtcclxuXHJcbiAgICAgIH0sIDI1MCk7XHJcblxyXG4gICAgICBmdW5jdGlvbiBzaXplQ2FudmFzKCkge1xyXG4gICAgICAgIF9zaXplQ2FudmFzKCk7XHJcbiAgICAgIH1cclxuXHJcbiAgICAgIHNpemVDYW52YXMoKTtcclxuXHJcbiAgICAgICQod2luZG93KS5iaW5kKCdyZXNpemUnLCBmdW5jdGlvbiAoKSB7XHJcbiAgICAgICAgc2l6ZUNhbnZhcygpO1xyXG4gICAgICB9KTtcclxuICAgICAgXHJcbiAgICAgIC8vIHdyaXRlIG9wdGlvbnMgdG8gZGF0YVxyXG4gICAgICB2YXIgZGF0YSA9ICRjb250YWluZXIuZGF0YSgnY3llZGdlZWRpdGluZycpO1xyXG4gICAgICBpZiAoZGF0YSA9PSBudWxsKSB7XHJcbiAgICAgICAgZGF0YSA9IHt9O1xyXG4gICAgICB9XHJcbiAgICAgIGRhdGEub3B0aW9ucyA9IG9wdHM7XHJcblxyXG4gICAgICB2YXIgb3B0Q2FjaGU7XHJcblxyXG4gICAgICBmdW5jdGlvbiBvcHRpb25zKCkge1xyXG4gICAgICAgIHJldHVybiBvcHRDYWNoZSB8fCAob3B0Q2FjaGUgPSAkY29udGFpbmVyLmRhdGEoJ2N5ZWRnZWVkaXRpbmcnKS5vcHRpb25zKTtcclxuICAgICAgfVxyXG5cclxuICAgICAgLy8gd2Ugd2lsbCBuZWVkIHRvIGNvbnZlcnQgbW9kZWwgcG9zaXRvbnMgdG8gcmVuZGVyZWQgcG9zaXRpb25zXHJcbiAgICAgIGZ1bmN0aW9uIGNvbnZlcnRUb1JlbmRlcmVkUG9zaXRpb24obW9kZWxQb3NpdGlvbikge1xyXG4gICAgICAgIHZhciBwYW4gPSBjeS5wYW4oKTtcclxuICAgICAgICB2YXIgem9vbSA9IGN5Lnpvb20oKTtcclxuXHJcbiAgICAgICAgdmFyIHggPSBtb2RlbFBvc2l0aW9uLnggKiB6b29tICsgcGFuLng7XHJcbiAgICAgICAgdmFyIHkgPSBtb2RlbFBvc2l0aW9uLnkgKiB6b29tICsgcGFuLnk7XHJcblxyXG4gICAgICAgIHJldHVybiB7XHJcbiAgICAgICAgICB4OiB4LFxyXG4gICAgICAgICAgeTogeVxyXG4gICAgICAgIH07XHJcbiAgICAgIH1cclxuICAgICAgXHJcbiAgICAgIGZ1bmN0aW9uIHJlZnJlc2hEcmF3cygpIHtcclxuXHJcbiAgICAgICAgLy8gZG9uJ3QgY2xlYXIgYW5jaG9yIHdoaWNoIGlzIGJlaW5nIG1vdmVkXHJcbiAgICAgICAgYW5jaG9yTWFuYWdlci5jbGVhckFuY2hvcnNFeGNlcHQoYW5jaG9yTWFuYWdlci50b3VjaGVkQW5jaG9yKTtcclxuICAgICAgICBcclxuICAgICAgICBpZihlbmRwb2ludFNoYXBlMSAhPT0gbnVsbCl7XHJcbiAgICAgICAgICBlbmRwb2ludFNoYXBlMS5kZXN0cm95KCk7XHJcbiAgICAgICAgICBlbmRwb2ludFNoYXBlMSA9IG51bGw7XHJcbiAgICAgICAgfVxyXG4gICAgICAgIGlmKGVuZHBvaW50U2hhcGUyICE9PSBudWxsKXtcclxuICAgICAgICAgIGVuZHBvaW50U2hhcGUyLmRlc3Ryb3koKTtcclxuICAgICAgICAgIGVuZHBvaW50U2hhcGUyID0gbnVsbDtcclxuICAgICAgICB9XHJcbiAgICAgICAgY2FudmFzLmRyYXcoKTtcclxuXHJcbiAgICAgICAgaWYoIGVkZ2VUb0hpZ2hsaWdodCApIHtcclxuICAgICAgICAgIGFuY2hvck1hbmFnZXIucmVuZGVyQW5jaG9yU2hhcGVzKGVkZ2VUb0hpZ2hsaWdodCk7XHJcbiAgICAgICAgICByZW5kZXJFbmRQb2ludFNoYXBlcyhlZGdlVG9IaWdobGlnaHQpO1xyXG4gICAgICAgIH1cclxuICAgICAgfVxyXG4gICAgICBcclxuICAgICAgLy8gcmVuZGVyIHRoZSBlbmQgcG9pbnRzIHNoYXBlcyBvZiB0aGUgZ2l2ZW4gZWRnZVxyXG4gICAgICBmdW5jdGlvbiByZW5kZXJFbmRQb2ludFNoYXBlcyhlZGdlKSB7XHJcbiAgICAgICAgaWYoIWVkZ2Upe1xyXG4gICAgICAgICAgcmV0dXJuO1xyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgdmFyIGVkZ2VfcHRzID0gYW5jaG9yUG9pbnRVdGlsaXRpZXMuZ2V0QW5jaG9yc0FzQXJyYXkoZWRnZSk7XHJcbiAgICAgICAgaWYodHlwZW9mIGVkZ2VfcHRzID09PSAndW5kZWZpbmVkJyl7XHJcbiAgICAgICAgICBlZGdlX3B0cyA9IFtdO1xyXG4gICAgICAgIH0gICAgICAgXHJcbiAgICAgICAgdmFyIHNvdXJjZVBvcyA9IGVkZ2Uuc291cmNlRW5kcG9pbnQoKTtcclxuICAgICAgICB2YXIgdGFyZ2V0UG9zID0gZWRnZS50YXJnZXRFbmRwb2ludCgpO1xyXG4gICAgICAgIGVkZ2VfcHRzLnVuc2hpZnQoc291cmNlUG9zLnkpO1xyXG4gICAgICAgIGVkZ2VfcHRzLnVuc2hpZnQoc291cmNlUG9zLngpO1xyXG4gICAgICAgIGVkZ2VfcHRzLnB1c2godGFyZ2V0UG9zLngpO1xyXG4gICAgICAgIGVkZ2VfcHRzLnB1c2godGFyZ2V0UG9zLnkpOyBcclxuXHJcbiAgICAgICBcclxuICAgICAgICBpZighZWRnZV9wdHMpXHJcbiAgICAgICAgICByZXR1cm47XHJcblxyXG4gICAgICAgIHZhciBzcmMgPSB7XHJcbiAgICAgICAgICB4OiBlZGdlX3B0c1swXSxcclxuICAgICAgICAgIHk6IGVkZ2VfcHRzWzFdXHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICB2YXIgdGFyZ2V0ID0ge1xyXG4gICAgICAgICAgeDogZWRnZV9wdHNbZWRnZV9wdHMubGVuZ3RoLTJdLFxyXG4gICAgICAgICAgeTogZWRnZV9wdHNbZWRnZV9wdHMubGVuZ3RoLTFdXHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICB2YXIgbmV4dFRvU291cmNlID0ge1xyXG4gICAgICAgICAgeDogZWRnZV9wdHNbMl0sXHJcbiAgICAgICAgICB5OiBlZGdlX3B0c1szXVxyXG4gICAgICAgIH1cclxuICAgICAgICB2YXIgbmV4dFRvVGFyZ2V0ID0ge1xyXG4gICAgICAgICAgeDogZWRnZV9wdHNbZWRnZV9wdHMubGVuZ3RoLTRdLFxyXG4gICAgICAgICAgeTogZWRnZV9wdHNbZWRnZV9wdHMubGVuZ3RoLTNdXHJcbiAgICAgICAgfVxyXG4gICAgICAgIHZhciBsZW5ndGggPSBnZXRBbmNob3JTaGFwZXNMZW5ndGgoZWRnZSkgKiAwLjY1O1xyXG4gICAgICAgIFxyXG4gICAgICAgIHJlbmRlckVhY2hFbmRQb2ludFNoYXBlKHNyYywgdGFyZ2V0LCBsZW5ndGgsbmV4dFRvU291cmNlLG5leHRUb1RhcmdldCk7XHJcbiAgICAgICAgXHJcbiAgICAgIH1cclxuXHJcbiAgICAgIGZ1bmN0aW9uIHJlbmRlckVhY2hFbmRQb2ludFNoYXBlKHNvdXJjZSwgdGFyZ2V0LCBsZW5ndGgsbmV4dFRvU291cmNlLG5leHRUb1RhcmdldCkge1xyXG4gICAgICAgIC8vIGdldCB0aGUgdG9wIGxlZnQgY29vcmRpbmF0ZXMgb2Ygc291cmNlIGFuZCB0YXJnZXRcclxuICAgICAgICB2YXIgc1RvcExlZnRYID0gc291cmNlLnggLSBsZW5ndGggLyAyO1xyXG4gICAgICAgIHZhciBzVG9wTGVmdFkgPSBzb3VyY2UueSAtIGxlbmd0aCAvIDI7XHJcblxyXG4gICAgICAgIHZhciB0VG9wTGVmdFggPSB0YXJnZXQueCAtIGxlbmd0aCAvIDI7XHJcbiAgICAgICAgdmFyIHRUb3BMZWZ0WSA9IHRhcmdldC55IC0gbGVuZ3RoIC8gMjtcclxuXHJcbiAgICAgICAgdmFyIG5leHRUb1NvdXJjZVggPSBuZXh0VG9Tb3VyY2UueCAtIGxlbmd0aCAvMjtcclxuICAgICAgICB2YXIgbmV4dFRvU291cmNlWSA9IG5leHRUb1NvdXJjZS55IC0gbGVuZ3RoIC8gMjtcclxuXHJcbiAgICAgICAgdmFyIG5leHRUb1RhcmdldFggPSBuZXh0VG9UYXJnZXQueCAtIGxlbmd0aCAvMjtcclxuICAgICAgICB2YXIgbmV4dFRvVGFyZ2V0WSA9IG5leHRUb1RhcmdldC55IC0gbGVuZ3RoIC8yO1xyXG5cclxuXHJcbiAgICAgICAgLy8gY29udmVydCB0byByZW5kZXJlZCBwYXJhbWV0ZXJzXHJcbiAgICAgICAgdmFyIHJlbmRlcmVkU291cmNlUG9zID0gY29udmVydFRvUmVuZGVyZWRQb3NpdGlvbih7eDogc1RvcExlZnRYLCB5OiBzVG9wTGVmdFl9KTtcclxuICAgICAgICB2YXIgcmVuZGVyZWRUYXJnZXRQb3MgPSBjb252ZXJ0VG9SZW5kZXJlZFBvc2l0aW9uKHt4OiB0VG9wTGVmdFgsIHk6IHRUb3BMZWZ0WX0pO1xyXG4gICAgICAgIGxlbmd0aCA9IGxlbmd0aCAqIGN5Lnpvb20oKSAvIDI7XHJcblxyXG4gICAgICAgIHZhciByZW5kZXJlZE5leHRUb1NvdXJjZSA9IGNvbnZlcnRUb1JlbmRlcmVkUG9zaXRpb24oe3g6IG5leHRUb1NvdXJjZVgsIHk6IG5leHRUb1NvdXJjZVl9KTtcclxuICAgICAgICB2YXIgcmVuZGVyZWROZXh0VG9UYXJnZXQgPSBjb252ZXJ0VG9SZW5kZXJlZFBvc2l0aW9uKHt4OiBuZXh0VG9UYXJnZXRYLCB5OiBuZXh0VG9UYXJnZXRZfSk7XHJcbiAgICAgICAgXHJcbiAgICAgICAgLy9ob3cgZmFyIHRvIGdvIGZyb20gdGhlIG5vZGUgYWxvbmcgdGhlIGVkZ2VcclxuICAgICAgICB2YXIgZGlzdGFuY2VGcm9tTm9kZSA9IGxlbmd0aDtcclxuXHJcbiAgICAgICAgdmFyIGRpc3RhbmNlU291cmNlID0gTWF0aC5zcXJ0KE1hdGgucG93KHJlbmRlcmVkTmV4dFRvU291cmNlLnggLSByZW5kZXJlZFNvdXJjZVBvcy54LDIpICsgTWF0aC5wb3cocmVuZGVyZWROZXh0VG9Tb3VyY2UueSAtIHJlbmRlcmVkU291cmNlUG9zLnksMikpOyAgICAgICAgXHJcbiAgICAgICAgdmFyIHNvdXJjZUVuZFBvaW50WCA9IHJlbmRlcmVkU291cmNlUG9zLnggKyAoKGRpc3RhbmNlRnJvbU5vZGUvIGRpc3RhbmNlU291cmNlKSogKHJlbmRlcmVkTmV4dFRvU291cmNlLnggLSByZW5kZXJlZFNvdXJjZVBvcy54KSk7XHJcbiAgICAgICAgdmFyIHNvdXJjZUVuZFBvaW50WSA9IHJlbmRlcmVkU291cmNlUG9zLnkgKyAoKGRpc3RhbmNlRnJvbU5vZGUvIGRpc3RhbmNlU291cmNlKSogKHJlbmRlcmVkTmV4dFRvU291cmNlLnkgLSByZW5kZXJlZFNvdXJjZVBvcy55KSk7XHJcblxyXG5cclxuICAgICAgICB2YXIgZGlzdGFuY2VUYXJnZXQgPSBNYXRoLnNxcnQoTWF0aC5wb3cocmVuZGVyZWROZXh0VG9UYXJnZXQueCAtIHJlbmRlcmVkVGFyZ2V0UG9zLngsMikgKyBNYXRoLnBvdyhyZW5kZXJlZE5leHRUb1RhcmdldC55IC0gcmVuZGVyZWRUYXJnZXRQb3MueSwyKSk7ICAgICAgICBcclxuICAgICAgICB2YXIgdGFyZ2V0RW5kUG9pbnRYID0gcmVuZGVyZWRUYXJnZXRQb3MueCArICgoZGlzdGFuY2VGcm9tTm9kZS8gZGlzdGFuY2VUYXJnZXQpKiAocmVuZGVyZWROZXh0VG9UYXJnZXQueCAtIHJlbmRlcmVkVGFyZ2V0UG9zLngpKTtcclxuICAgICAgICB2YXIgdGFyZ2V0RW5kUG9pbnRZID0gcmVuZGVyZWRUYXJnZXRQb3MueSArICgoZGlzdGFuY2VGcm9tTm9kZS8gZGlzdGFuY2VUYXJnZXQpKiAocmVuZGVyZWROZXh0VG9UYXJnZXQueSAtIHJlbmRlcmVkVGFyZ2V0UG9zLnkpKTsgXHJcblxyXG4gICAgICAgIC8vIHJlbmRlciBlbmQgcG9pbnQgc2hhcGUgZm9yIHNvdXJjZSBhbmQgdGFyZ2V0XHJcbiAgICAgICAgZW5kcG9pbnRTaGFwZTEgPSBuZXcgS29udmEuQ2lyY2xlKHtcclxuICAgICAgICAgIHg6IHNvdXJjZUVuZFBvaW50WCArIGxlbmd0aCxcclxuICAgICAgICAgIHk6IHNvdXJjZUVuZFBvaW50WSArIGxlbmd0aCxcclxuICAgICAgICAgIHJhZGl1czogbGVuZ3RoLFxyXG4gICAgICAgICAgZmlsbDogJ2JsYWNrJyxcclxuICAgICAgICB9KTtcclxuXHJcbiAgICAgICAgZW5kcG9pbnRTaGFwZTIgPSBuZXcgS29udmEuQ2lyY2xlKHtcclxuICAgICAgICAgIHg6IHRhcmdldEVuZFBvaW50WCArIGxlbmd0aCxcclxuICAgICAgICAgIHk6IHRhcmdldEVuZFBvaW50WSArIGxlbmd0aCxcclxuICAgICAgICAgIHJhZGl1czogbGVuZ3RoLFxyXG4gICAgICAgICAgZmlsbDogJ2JsYWNrJyxcclxuICAgICAgICB9KTtcclxuXHJcbiAgICAgICAgY2FudmFzLmFkZChlbmRwb2ludFNoYXBlMSk7XHJcbiAgICAgICAgY2FudmFzLmFkZChlbmRwb2ludFNoYXBlMik7XHJcbiAgICAgICAgY2FudmFzLmRyYXcoKTtcclxuICAgICAgICBcclxuICAgICAgfVxyXG5cclxuICAgICAgLy8gZ2V0IHRoZSBsZW5ndGggb2YgYW5jaG9yIHBvaW50cyB0byBiZSByZW5kZXJlZFxyXG4gICAgICBmdW5jdGlvbiBnZXRBbmNob3JTaGFwZXNMZW5ndGgoZWRnZSkge1xyXG4gICAgICAgIHZhciBmYWN0b3IgPSBvcHRpb25zKCkuYW5jaG9yU2hhcGVTaXplRmFjdG9yO1xyXG4gICAgICAgIGlmIChwYXJzZUZsb2F0KGVkZ2UuY3NzKCd3aWR0aCcpKSA8PSAyLjUpXHJcbiAgICAgICAgICByZXR1cm4gMi41ICogZmFjdG9yO1xyXG4gICAgICAgIGVsc2UgcmV0dXJuIHBhcnNlRmxvYXQoZWRnZS5jc3MoJ3dpZHRoJykpKmZhY3RvcjtcclxuICAgICAgfVxyXG4gICAgICBcclxuICAgICAgLy8gY2hlY2sgaWYgdGhlIGFuY2hvciByZXByZXNlbnRlZCBieSB7eCwgeX0gaXMgaW5zaWRlIHRoZSBwb2ludCBzaGFwZVxyXG4gICAgICBmdW5jdGlvbiBjaGVja0lmSW5zaWRlU2hhcGUoeCwgeSwgbGVuZ3RoLCBjZW50ZXJYLCBjZW50ZXJZKXtcclxuICAgICAgICB2YXIgbWluWCA9IGNlbnRlclggLSBsZW5ndGggLyAyO1xyXG4gICAgICAgIHZhciBtYXhYID0gY2VudGVyWCArIGxlbmd0aCAvIDI7XHJcbiAgICAgICAgdmFyIG1pblkgPSBjZW50ZXJZIC0gbGVuZ3RoIC8gMjtcclxuICAgICAgICB2YXIgbWF4WSA9IGNlbnRlclkgKyBsZW5ndGggLyAyO1xyXG4gICAgICAgIFxyXG4gICAgICAgIHZhciBpbnNpZGUgPSAoeCA+PSBtaW5YICYmIHggPD0gbWF4WCkgJiYgKHkgPj0gbWluWSAmJiB5IDw9IG1heFkpO1xyXG4gICAgICAgIHJldHVybiBpbnNpZGU7XHJcbiAgICAgIH1cclxuXHJcbiAgICAgIC8vIGdldCB0aGUgaW5kZXggb2YgYW5jaG9yIGNvbnRhaW5pbmcgdGhlIHBvaW50IHJlcHJlc2VudGVkIGJ5IHt4LCB5fVxyXG4gICAgICBmdW5jdGlvbiBnZXRDb250YWluaW5nU2hhcGVJbmRleCh4LCB5LCBlZGdlKSB7XHJcbiAgICAgICAgdmFyIHR5cGUgPSBhbmNob3JQb2ludFV0aWxpdGllcy5nZXRFZGdlVHlwZShlZGdlKTtcclxuXHJcbiAgICAgICAgaWYodHlwZSA9PT0gJ2luY29uY2x1c2l2ZScpe1xyXG4gICAgICAgICAgcmV0dXJuIC0xO1xyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgaWYoZWRnZS5kYXRhKGFuY2hvclBvaW50VXRpbGl0aWVzLnN5bnRheFt0eXBlXVsnd2VpZ2h0J10pID09IG51bGwgfHwgXHJcbiAgICAgICAgICBlZGdlLmRhdGEoYW5jaG9yUG9pbnRVdGlsaXRpZXMuc3ludGF4W3R5cGVdWyd3ZWlnaHQnXSkubGVuZ3RoID09IDApe1xyXG4gICAgICAgICAgcmV0dXJuIC0xO1xyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgdmFyIGFuY2hvckxpc3QgPSBhbmNob3JQb2ludFV0aWxpdGllcy5nZXRBbmNob3JzQXNBcnJheShlZGdlKTsvL2VkZ2UuX3ByaXZhdGUucmRhdGEuc2VncHRzO1xyXG4gICAgICAgIHZhciBsZW5ndGggPSBnZXRBbmNob3JTaGFwZXNMZW5ndGgoZWRnZSk7XHJcblxyXG4gICAgICAgIGZvcih2YXIgaSA9IDA7IGFuY2hvckxpc3QgJiYgaSA8IGFuY2hvckxpc3QubGVuZ3RoOyBpID0gaSArIDIpe1xyXG4gICAgICAgICAgdmFyIGFuY2hvclggPSBhbmNob3JMaXN0W2ldO1xyXG4gICAgICAgICAgdmFyIGFuY2hvclkgPSBhbmNob3JMaXN0W2kgKyAxXTtcclxuXHJcbiAgICAgICAgICB2YXIgaW5zaWRlID0gY2hlY2tJZkluc2lkZVNoYXBlKHgsIHksIGxlbmd0aCwgYW5jaG9yWCwgYW5jaG9yWSk7XHJcbiAgICAgICAgICBpZihpbnNpZGUpe1xyXG4gICAgICAgICAgICByZXR1cm4gaSAvIDI7XHJcbiAgICAgICAgICB9XHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICByZXR1cm4gLTE7XHJcbiAgICAgIH07XHJcblxyXG4gICAgICBmdW5jdGlvbiBnZXRDb250YWluaW5nRW5kUG9pbnQoeCwgeSwgZWRnZSl7XHJcbiAgICAgICAgdmFyIGxlbmd0aCA9IGdldEFuY2hvclNoYXBlc0xlbmd0aChlZGdlKTtcclxuICAgICAgICB2YXIgYWxsUHRzID0gZWRnZS5fcHJpdmF0ZS5yc2NyYXRjaC5hbGxwdHM7XHJcbiAgICAgICAgdmFyIHNyYyA9IHtcclxuICAgICAgICAgIHg6IGFsbFB0c1swXSxcclxuICAgICAgICAgIHk6IGFsbFB0c1sxXVxyXG4gICAgICAgIH1cclxuICAgICAgICB2YXIgdGFyZ2V0ID0ge1xyXG4gICAgICAgICAgeDogYWxsUHRzW2FsbFB0cy5sZW5ndGgtMl0sXHJcbiAgICAgICAgICB5OiBhbGxQdHNbYWxsUHRzLmxlbmd0aC0xXVxyXG4gICAgICAgIH1cclxuICAgICAgICBjb252ZXJ0VG9SZW5kZXJlZFBvc2l0aW9uKHNyYyk7XHJcbiAgICAgICAgY29udmVydFRvUmVuZGVyZWRQb3NpdGlvbih0YXJnZXQpO1xyXG4gICAgICAgIFxyXG4gICAgICAgIC8vIFNvdXJjZTowLCBUYXJnZXQ6MSwgTm9uZTotMVxyXG4gICAgICAgIGlmKGNoZWNrSWZJbnNpZGVTaGFwZSh4LCB5LCBsZW5ndGgsIHNyYy54LCBzcmMueSkpXHJcbiAgICAgICAgICByZXR1cm4gMDtcclxuICAgICAgICBlbHNlIGlmKGNoZWNrSWZJbnNpZGVTaGFwZSh4LCB5LCBsZW5ndGgsIHRhcmdldC54LCB0YXJnZXQueSkpXHJcbiAgICAgICAgICByZXR1cm4gMTtcclxuICAgICAgICBlbHNlXHJcbiAgICAgICAgICByZXR1cm4gLTE7XHJcbiAgICAgIH1cclxuICAgICAgXHJcbiAgICAgIC8vIHN0b3JlIHRoZSBjdXJyZW50IHN0YXR1cyBvZiBnZXN0dXJlcyBhbmQgc2V0IHRoZW0gdG8gZmFsc2VcclxuICAgICAgZnVuY3Rpb24gZGlzYWJsZUdlc3R1cmVzKCkge1xyXG4gICAgICAgIGxhc3RQYW5uaW5nRW5hYmxlZCA9IGN5LnBhbm5pbmdFbmFibGVkKCk7XHJcbiAgICAgICAgbGFzdFpvb21pbmdFbmFibGVkID0gY3kuem9vbWluZ0VuYWJsZWQoKTtcclxuICAgICAgICBsYXN0Qm94U2VsZWN0aW9uRW5hYmxlZCA9IGN5LmJveFNlbGVjdGlvbkVuYWJsZWQoKTtcclxuXHJcbiAgICAgICAgY3kuem9vbWluZ0VuYWJsZWQoZmFsc2UpXHJcbiAgICAgICAgICAucGFubmluZ0VuYWJsZWQoZmFsc2UpXHJcbiAgICAgICAgICAuYm94U2VsZWN0aW9uRW5hYmxlZChmYWxzZSk7XHJcbiAgICAgIH1cclxuICAgICAgXHJcbiAgICAgIC8vIHJlc2V0IHRoZSBnZXN0dXJlcyBieSB0aGVpciBsYXRlc3Qgc3RhdHVzXHJcbiAgICAgIGZ1bmN0aW9uIHJlc2V0R2VzdHVyZXMoKSB7XHJcbiAgICAgICAgY3kuem9vbWluZ0VuYWJsZWQobGFzdFpvb21pbmdFbmFibGVkKVxyXG4gICAgICAgICAgLnBhbm5pbmdFbmFibGVkKGxhc3RQYW5uaW5nRW5hYmxlZClcclxuICAgICAgICAgIC5ib3hTZWxlY3Rpb25FbmFibGVkKGxhc3RCb3hTZWxlY3Rpb25FbmFibGVkKTtcclxuICAgICAgfVxyXG5cclxuICAgICAgZnVuY3Rpb24gdHVybk9mZkFjdGl2ZUJnQ29sb3IoKXtcclxuICAgICAgICAvLyBmb3VuZCB0aGlzIGF0IHRoZSBjeS1ub2RlLXJlc2l6ZSBjb2RlLCBidXQgZG9lc24ndCBzZWVtIHRvIGZpbmQgdGhlIG9iamVjdCBtb3N0IG9mIHRoZSB0aW1lXHJcbiAgICAgICAgaWYoIGN5LnN0eWxlKCkuX3ByaXZhdGUuY29yZVN0eWxlW1wiYWN0aXZlLWJnLW9wYWNpdHlcIl0pIHtcclxuICAgICAgICAgIGxhc3RBY3RpdmVCZ09wYWNpdHkgPSBjeS5zdHlsZSgpLl9wcml2YXRlLmNvcmVTdHlsZVtcImFjdGl2ZS1iZy1vcGFjaXR5XCJdLnZhbHVlO1xyXG4gICAgICAgIH1cclxuICAgICAgICBlbHNlIHtcclxuICAgICAgICAgIC8vIGFyYml0cmFyeSwgZmVlbCBmcmVlIHRvIGNoYW5nZVxyXG4gICAgICAgICAgLy8gdHJpYWwgYW5kIGVycm9yIHNob3dlZCB0aGF0IDAuMTUgd2FzIGNsb3Nlc3QgdG8gdGhlIG9sZCBjb2xvclxyXG4gICAgICAgICAgbGFzdEFjdGl2ZUJnT3BhY2l0eSA9IDAuMTU7XHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICBjeS5zdHlsZSgpXHJcbiAgICAgICAgICAuc2VsZWN0b3IoXCJjb3JlXCIpXHJcbiAgICAgICAgICAuc3R5bGUoXCJhY3RpdmUtYmctb3BhY2l0eVwiLCAwKVxyXG4gICAgICAgICAgLnVwZGF0ZSgpO1xyXG4gICAgICB9XHJcblxyXG4gICAgICBmdW5jdGlvbiByZXNldEFjdGl2ZUJnQ29sb3IoKXtcclxuICAgICAgICBjeS5zdHlsZSgpXHJcbiAgICAgICAgICAuc2VsZWN0b3IoXCJjb3JlXCIpXHJcbiAgICAgICAgICAuc3R5bGUoXCJhY3RpdmUtYmctb3BhY2l0eVwiLCBsYXN0QWN0aXZlQmdPcGFjaXR5KVxyXG4gICAgICAgICAgLnVwZGF0ZSgpO1xyXG4gICAgICB9XHJcblxyXG4gICAgICBmdW5jdGlvbiBtb3ZlQW5jaG9yUG9pbnRzKHBvc2l0aW9uRGlmZiwgZWRnZXMpIHtcclxuICAgICAgICAgIGVkZ2VzLmZvckVhY2goZnVuY3Rpb24oIGVkZ2UgKXtcclxuICAgICAgICAgICAgICB2YXIgcHJldmlvdXNBbmNob3JzUG9zaXRpb24gPSBhbmNob3JQb2ludFV0aWxpdGllcy5nZXRBbmNob3JzQXNBcnJheShlZGdlKTtcclxuICAgICAgICAgICAgICB2YXIgbmV4dEFuY2hvclBvaW50c1Bvc2l0aW9uID0gW107XHJcbiAgICAgICAgICAgICAgaWYgKHByZXZpb3VzQW5jaG9yc1Bvc2l0aW9uICE9IHVuZGVmaW5lZClcclxuICAgICAgICAgICAgICB7XHJcbiAgICAgICAgICAgICAgICBmb3IgKGk9MDsgaTxwcmV2aW91c0FuY2hvcnNQb3NpdGlvbi5sZW5ndGg7IGkrPTIpXHJcbiAgICAgICAgICAgICAgICB7XHJcbiAgICAgICAgICAgICAgICAgICAgbmV4dEFuY2hvclBvaW50c1Bvc2l0aW9uLnB1c2goe3g6IHByZXZpb3VzQW5jaG9yc1Bvc2l0aW9uW2ldK3Bvc2l0aW9uRGlmZi54LCB5OiBwcmV2aW91c0FuY2hvcnNQb3NpdGlvbltpKzFdK3Bvc2l0aW9uRGlmZi55fSk7XHJcbiAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgICB2YXIgdHlwZSA9IGFuY2hvclBvaW50VXRpbGl0aWVzLmdldEVkZ2VUeXBlKGVkZ2UpO1xyXG5cclxuICAgICAgICAgICAgICAgIGlmKGFuY2hvclBvaW50VXRpbGl0aWVzLmVkZ2VUeXBlSW5jb25jbHVzaXZlU2hvdWxkbnRIYXBwZW4odHlwZSwgXCJVaVV0aWxpdGllcy5qcywgbW92ZUFuY2hvclBvaW50c1wiKSl7XHJcbiAgICAgICAgICAgICAgICAgIHJldHVybjtcclxuICAgICAgICAgICAgICAgIH1cclxuXHJcbiAgICAgICAgICAgICAgICBlZGdlLmRhdGEoYW5jaG9yUG9pbnRVdGlsaXRpZXMuc3ludGF4W3R5cGVdWydwb2ludFBvcyddLCBuZXh0QW5jaG9yUG9pbnRzUG9zaXRpb24pO1xyXG4gICAgICAgICAgICAgIH1cclxuICAgICAgICAgIH0pO1xyXG4gICAgICAgICAgYW5jaG9yUG9pbnRVdGlsaXRpZXMuaW5pdEFuY2hvclBvaW50cyhvcHRpb25zKCkuYmVuZFBvc2l0aW9uc0Z1bmN0aW9uLCBvcHRpb25zKCkuY29udHJvbFBvc2l0aW9uc0Z1bmN0aW9uLCBlZGdlcyk7XHJcbiAgICAgICAgICBcclxuICAgICAgICAgIC8vIExpc3RlbmVyIGRlZmluZWQgaW4gb3RoZXIgZXh0ZW5zaW9uXHJcbiAgICAgICAgICAvLyBNaWdodCBoYXZlIGNvbXBhdGliaWxpdHkgaXNzdWVzIGFmdGVyIHRoZSB1bmJ1bmRsZWQgYmV6aWVyXHJcbiAgICAgICAgICBjeS50cmlnZ2VyKCdiZW5kUG9pbnRNb3ZlbWVudCcpOyBcclxuICAgICAgfVxyXG5cclxuICAgICAgZnVuY3Rpb24gbW92ZUFuY2hvck9uRHJhZyhlZGdlLCB0eXBlLCBpbmRleCwgcG9zaXRpb24pe1xyXG4gICAgICAgIHZhciB3ZWlnaHRzID0gZWRnZS5kYXRhKGFuY2hvclBvaW50VXRpbGl0aWVzLnN5bnRheFt0eXBlXVsnd2VpZ2h0J10pO1xyXG4gICAgICAgIHZhciBkaXN0YW5jZXMgPSBlZGdlLmRhdGEoYW5jaG9yUG9pbnRVdGlsaXRpZXMuc3ludGF4W3R5cGVdWydkaXN0YW5jZSddKTtcclxuICAgICAgICBcclxuICAgICAgICB2YXIgcmVsYXRpdmVBbmNob3JQb3NpdGlvbiA9IGFuY2hvclBvaW50VXRpbGl0aWVzLmNvbnZlcnRUb1JlbGF0aXZlUG9zaXRpb24oZWRnZSwgcG9zaXRpb24pO1xyXG4gICAgICAgIHdlaWdodHNbaW5kZXhdID0gcmVsYXRpdmVBbmNob3JQb3NpdGlvbi53ZWlnaHQ7XHJcbiAgICAgICAgZGlzdGFuY2VzW2luZGV4XSA9IHJlbGF0aXZlQW5jaG9yUG9zaXRpb24uZGlzdGFuY2U7XHJcbiAgICAgICAgXHJcbiAgICAgICAgZWRnZS5kYXRhKGFuY2hvclBvaW50VXRpbGl0aWVzLnN5bnRheFt0eXBlXVsnd2VpZ2h0J10sIHdlaWdodHMpO1xyXG4gICAgICAgIGVkZ2UuZGF0YShhbmNob3JQb2ludFV0aWxpdGllcy5zeW50YXhbdHlwZV1bJ2Rpc3RhbmNlJ10sIGRpc3RhbmNlcyk7XHJcbiAgICAgIH1cclxuXHJcbiAgICAgIC8vIGRlYm91bmNlZCBkdWUgdG8gbGFyZ2UgYW1vdXQgb2YgY2FsbHMgdG8gdGFwZHJhZ1xyXG4gICAgICB2YXIgX21vdmVBbmNob3JPbkRyYWcgPSBkZWJvdW5jZSggbW92ZUFuY2hvck9uRHJhZywgNSk7XHJcblxyXG4gICAgICB7ICBcclxuICAgICAgICBsYXN0UGFubmluZ0VuYWJsZWQgPSBjeS5wYW5uaW5nRW5hYmxlZCgpO1xyXG4gICAgICAgIGxhc3Rab29taW5nRW5hYmxlZCA9IGN5Lnpvb21pbmdFbmFibGVkKCk7XHJcbiAgICAgICAgbGFzdEJveFNlbGVjdGlvbkVuYWJsZWQgPSBjeS5ib3hTZWxlY3Rpb25FbmFibGVkKCk7XHJcbiAgICAgICAgXHJcbiAgICAgICAgLy8gSW5pdGlsaXplIHRoZSBlZGdlVG9IaWdobGlnaHRCZW5kcyBhbmQgbnVtYmVyT2ZTZWxlY3RlZEVkZ2VzXHJcbiAgICAgICAge1xyXG4gICAgICAgICAgdmFyIHNlbGVjdGVkRWRnZXMgPSBjeS5lZGdlcygnOnNlbGVjdGVkJyk7XHJcbiAgICAgICAgICB2YXIgbnVtYmVyT2ZTZWxlY3RlZEVkZ2VzID0gc2VsZWN0ZWRFZGdlcy5sZW5ndGg7XHJcbiAgICAgICAgICBcclxuICAgICAgICAgIGlmICggbnVtYmVyT2ZTZWxlY3RlZEVkZ2VzID09PSAxICkge1xyXG4gICAgICAgICAgICBlZGdlVG9IaWdobGlnaHQgPSBzZWxlY3RlZEVkZ2VzWzBdO1xyXG4gICAgICAgICAgfVxyXG4gICAgICAgIH1cclxuICAgICAgICBcclxuICAgICAgICBjeS5iaW5kKCd6b29tIHBhbicsIGVab29tID0gZnVuY3Rpb24gKCkge1xyXG4gICAgICAgICAgaWYgKCAhZWRnZVRvSGlnaGxpZ2h0ICkge1xyXG4gICAgICAgICAgICByZXR1cm47XHJcbiAgICAgICAgICB9XHJcbiAgICAgICAgICBcclxuICAgICAgICAgIHJlZnJlc2hEcmF3cygpO1xyXG4gICAgICAgIH0pO1xyXG5cclxuICAgICAgICAvLyBjeS5vZmYgaXMgbmV2ZXIgY2FsbGVkIG9uIHRoaXMgbGlzdGVuZXJcclxuICAgICAgICBjeS5vbignZGF0YScsICdlZGdlJywgIGZ1bmN0aW9uICgpIHtcclxuICAgICAgICAgIGlmICggIWVkZ2VUb0hpZ2hsaWdodCApIHtcclxuICAgICAgICAgICAgcmV0dXJuO1xyXG4gICAgICAgICAgfVxyXG4gICAgICAgICAgXHJcbiAgICAgICAgICByZWZyZXNoRHJhd3MoKTtcclxuICAgICAgICB9KTtcclxuXHJcbiAgICAgICAgY3kub24oJ3N0eWxlJywgJ2VkZ2UuZWRnZWJlbmRlZGl0aW5nLWhhc2JlbmRwb2ludHM6c2VsZWN0ZWQsIGVkZ2UuZWRnZWNvbnRyb2xlZGl0aW5nLWhhc2NvbnRyb2xwb2ludHM6c2VsZWN0ZWQnLCBlU3R5bGUgPSBmdW5jdGlvbiAoKSB7XHJcbiAgICAgICAgICByZWZyZXNoRHJhd3MoKTtcclxuICAgICAgICB9KTtcclxuXHJcbiAgICAgICAgY3kub24oJ3JlbW92ZScsICdlZGdlJywgZVJlbW92ZSA9IGZ1bmN0aW9uICgpIHtcclxuICAgICAgICAgIHZhciBlZGdlID0gdGhpcztcclxuICAgICAgICAgIGlmIChlZGdlLnNlbGVjdGVkKCkpIHtcclxuICAgICAgICAgICAgbnVtYmVyT2ZTZWxlY3RlZEVkZ2VzID0gbnVtYmVyT2ZTZWxlY3RlZEVkZ2VzIC0gMTtcclxuICAgICAgICAgICAgXHJcbiAgICAgICAgICAgIGN5LnN0YXJ0QmF0Y2goKTtcclxuICAgICAgICAgICAgXHJcbiAgICAgICAgICAgIGlmIChlZGdlVG9IaWdobGlnaHQpIHtcclxuICAgICAgICAgICAgICBlZGdlVG9IaWdobGlnaHQucmVtb3ZlQ2xhc3MoJ2N5LWVkZ2UtZWRpdGluZy1oaWdobGlnaHQnKTtcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICBcclxuICAgICAgICAgICAgaWYgKG51bWJlck9mU2VsZWN0ZWRFZGdlcyA9PT0gMSkge1xyXG4gICAgICAgICAgICAgIHZhciBzZWxlY3RlZEVkZ2VzID0gY3kuZWRnZXMoJzpzZWxlY3RlZCcpO1xyXG4gICAgICAgICAgICAgIFxyXG4gICAgICAgICAgICAgIC8vIElmIHVzZXIgcmVtb3ZlcyBhbGwgc2VsZWN0ZWQgZWRnZXMgYXQgYSBzaW5nbGUgb3BlcmF0aW9uIHRoZW4gb3VyICdudW1iZXJPZlNlbGVjdGVkRWRnZXMnXHJcbiAgICAgICAgICAgICAgLy8gbWF5IGJlIG1pc2xlYWRpbmcuIFRoZXJlZm9yZSB3ZSBuZWVkIHRvIGNoZWNrIGlmIHRoZSBudW1iZXIgb2YgZWRnZXMgdG8gaGlnaGxpZ2h0IGlzIHJlYWx5IDEgaGVyZS5cclxuICAgICAgICAgICAgICBpZiAoc2VsZWN0ZWRFZGdlcy5sZW5ndGggPT09IDEpIHtcclxuICAgICAgICAgICAgICAgIGVkZ2VUb0hpZ2hsaWdodCA9IHNlbGVjdGVkRWRnZXNbMF07XHJcbiAgICAgICAgICAgICAgICBlZGdlVG9IaWdobGlnaHQuYWRkQ2xhc3MoJ2N5LWVkZ2UtZWRpdGluZy1oaWdobGlnaHQnKTtcclxuICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgZWxzZSB7XHJcbiAgICAgICAgICAgICAgICBlZGdlVG9IaWdobGlnaHQgPSB1bmRlZmluZWQ7XHJcbiAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgICAgIGVsc2Uge1xyXG4gICAgICAgICAgICAgIGVkZ2VUb0hpZ2hsaWdodCA9IHVuZGVmaW5lZDtcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICBcclxuICAgICAgICAgICAgY3kuZW5kQmF0Y2goKTtcclxuICAgICAgICAgIH1cclxuICAgICAgICAgIHJlZnJlc2hEcmF3cygpO1xyXG4gICAgICAgIH0pO1xyXG4gICAgICAgIFxyXG4gICAgICAgICBjeS5vbignYWRkJywgJ2VkZ2UnLCBlQWRkID0gZnVuY3Rpb24gKCkge1xyXG4gICAgICAgICAgdmFyIGVkZ2UgPSB0aGlzO1xyXG4gICAgICAgICAgaWYgKGVkZ2Uuc2VsZWN0ZWQoKSkge1xyXG4gICAgICAgICAgICBudW1iZXJPZlNlbGVjdGVkRWRnZXMgPSBudW1iZXJPZlNlbGVjdGVkRWRnZXMgKyAxO1xyXG4gICAgICAgICAgICBcclxuICAgICAgICAgICAgY3kuc3RhcnRCYXRjaCgpO1xyXG4gICAgICAgICAgICBcclxuICAgICAgICAgICAgaWYgKGVkZ2VUb0hpZ2hsaWdodCkge1xyXG4gICAgICAgICAgICAgIGVkZ2VUb0hpZ2hsaWdodC5yZW1vdmVDbGFzcygnY3ktZWRnZS1lZGl0aW5nLWhpZ2hsaWdodCcpO1xyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgICAgIFxyXG4gICAgICAgICAgICBpZiAobnVtYmVyT2ZTZWxlY3RlZEVkZ2VzID09PSAxKSB7XHJcbiAgICAgICAgICAgICAgZWRnZVRvSGlnaGxpZ2h0ID0gZWRnZTtcclxuICAgICAgICAgICAgICBlZGdlVG9IaWdobGlnaHQuYWRkQ2xhc3MoJ2N5LWVkZ2UtZWRpdGluZy1oaWdobGlnaHQnKTtcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICBlbHNlIHtcclxuICAgICAgICAgICAgICBlZGdlVG9IaWdobGlnaHQgPSB1bmRlZmluZWQ7XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgXHJcbiAgICAgICAgICAgIGN5LmVuZEJhdGNoKCk7XHJcbiAgICAgICAgICB9XHJcbiAgICAgICAgICByZWZyZXNoRHJhd3MoKTtcclxuICAgICAgICB9KTtcclxuICAgICAgICBcclxuICAgICAgICBjeS5vbignc2VsZWN0JywgJ2VkZ2UnLCBlU2VsZWN0ID0gZnVuY3Rpb24gKCkge1xyXG4gICAgICAgICAgdmFyIGVkZ2UgPSB0aGlzO1xyXG5cclxuICAgICAgICAgIGlmKGVkZ2UudGFyZ2V0KCkuY29ubmVjdGVkRWRnZXMoKS5sZW5ndGggPT0gMCB8fCBlZGdlLnNvdXJjZSgpLmNvbm5lY3RlZEVkZ2VzKCkubGVuZ3RoID09IDApe1xyXG4gICAgICAgICAgICByZXR1cm47XHJcbiAgICAgICAgICB9XHJcblxyXG4gICAgICAgICBcclxuICAgICAgICAgIG51bWJlck9mU2VsZWN0ZWRFZGdlcyA9IG51bWJlck9mU2VsZWN0ZWRFZGdlcyArIDE7XHJcbiAgICAgICAgICBcclxuICAgICAgICAgIGN5LnN0YXJ0QmF0Y2goKTtcclxuICAgICAgICAgICAgXHJcbiAgICAgICAgICBpZiAoZWRnZVRvSGlnaGxpZ2h0KSB7XHJcbiAgICAgICAgICAgIGVkZ2VUb0hpZ2hsaWdodC5yZW1vdmVDbGFzcygnY3ktZWRnZS1lZGl0aW5nLWhpZ2hsaWdodCcpO1xyXG4gICAgICAgICAgfVxyXG4gICAgICAgICAgICBcclxuICAgICAgICAgIGlmIChudW1iZXJPZlNlbGVjdGVkRWRnZXMgPT09IDEpIHtcclxuICAgICAgICAgICAgZWRnZVRvSGlnaGxpZ2h0ID0gZWRnZTtcclxuICAgICAgICAgICAgZWRnZVRvSGlnaGxpZ2h0LmFkZENsYXNzKCdjeS1lZGdlLWVkaXRpbmctaGlnaGxpZ2h0Jyk7XHJcbiAgICAgICAgICB9XHJcbiAgICAgICAgICBlbHNlIHtcclxuICAgICAgICAgICAgZWRnZVRvSGlnaGxpZ2h0ID0gdW5kZWZpbmVkO1xyXG4gICAgICAgICAgfVxyXG4gICAgICAgICAgXHJcbiAgICAgICAgICBjeS5lbmRCYXRjaCgpO1xyXG4gICAgICAgICAgcmVmcmVzaERyYXdzKCk7XHJcbiAgICAgICAgfSk7XHJcbiAgICAgICAgXHJcbiAgICAgICAgY3kub24oJ3Vuc2VsZWN0JywgJ2VkZ2UnLCBlVW5zZWxlY3QgPSBmdW5jdGlvbiAoKSB7XHJcbiAgICAgICAgICBudW1iZXJPZlNlbGVjdGVkRWRnZXMgPSBudW1iZXJPZlNlbGVjdGVkRWRnZXMgLSAxO1xyXG4gICAgICAgICAgICBcclxuICAgICAgICAgIGN5LnN0YXJ0QmF0Y2goKTtcclxuICAgICAgICAgICAgXHJcbiAgICAgICAgICBpZiAoZWRnZVRvSGlnaGxpZ2h0KSB7XHJcbiAgICAgICAgICAgIGVkZ2VUb0hpZ2hsaWdodC5yZW1vdmVDbGFzcygnY3ktZWRnZS1lZGl0aW5nLWhpZ2hsaWdodCcpO1xyXG4gICAgICAgICAgfVxyXG4gICAgICAgICAgICBcclxuICAgICAgICAgIGlmIChudW1iZXJPZlNlbGVjdGVkRWRnZXMgPT09IDEpIHtcclxuICAgICAgICAgICAgdmFyIHNlbGVjdGVkRWRnZXMgPSBjeS5lZGdlcygnOnNlbGVjdGVkJyk7XHJcbiAgICAgICAgICAgIFxyXG4gICAgICAgICAgICAvLyBJZiB1c2VyIHVuc2VsZWN0cyBhbGwgZWRnZXMgYnkgdGFwcGluZyB0byB0aGUgY29yZSBldGMuIHRoZW4gb3VyICdudW1iZXJPZlNlbGVjdGVkRWRnZXMnXHJcbiAgICAgICAgICAgIC8vIG1heSBiZSBtaXNsZWFkaW5nLiBUaGVyZWZvcmUgd2UgbmVlZCB0byBjaGVjayBpZiB0aGUgbnVtYmVyIG9mIGVkZ2VzIHRvIGhpZ2hsaWdodCBpcyByZWFseSAxIGhlcmUuXHJcbiAgICAgICAgICAgIGlmIChzZWxlY3RlZEVkZ2VzLmxlbmd0aCA9PT0gMSkge1xyXG4gICAgICAgICAgICAgIGVkZ2VUb0hpZ2hsaWdodCA9IHNlbGVjdGVkRWRnZXNbMF07XHJcbiAgICAgICAgICAgICAgZWRnZVRvSGlnaGxpZ2h0LmFkZENsYXNzKCdjeS1lZGdlLWVkaXRpbmctaGlnaGxpZ2h0Jyk7XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgZWxzZSB7XHJcbiAgICAgICAgICAgICAgZWRnZVRvSGlnaGxpZ2h0ID0gdW5kZWZpbmVkO1xyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgICB9XHJcbiAgICAgICAgICBlbHNlIHtcclxuICAgICAgICAgICAgZWRnZVRvSGlnaGxpZ2h0ID0gdW5kZWZpbmVkO1xyXG4gICAgICAgICAgfVxyXG4gICAgICAgICAgXHJcbiAgICAgICAgICBjeS5lbmRCYXRjaCgpO1xyXG4gICAgICAgICAgcmVmcmVzaERyYXdzKCk7XHJcbiAgICAgICAgfSk7XHJcbiAgICAgICAgXHJcbiAgICAgICAgdmFyIG1vdmVkQW5jaG9ySW5kZXg7XHJcbiAgICAgICAgdmFyIHRhcFN0YXJ0UG9zO1xyXG4gICAgICAgIHZhciBtb3ZlZEVkZ2U7XHJcbiAgICAgICAgdmFyIG1vdmVBbmNob3JQYXJhbTtcclxuICAgICAgICB2YXIgY3JlYXRlQW5jaG9yT25EcmFnO1xyXG4gICAgICAgIHZhciBtb3ZlZEVuZFBvaW50O1xyXG4gICAgICAgIHZhciBkdW1teU5vZGU7XHJcbiAgICAgICAgdmFyIGRldGFjaGVkTm9kZTtcclxuICAgICAgICB2YXIgbm9kZVRvQXR0YWNoO1xyXG4gICAgICAgIHZhciBhbmNob3JDcmVhdGVkQnlEcmFnID0gZmFsc2U7XHJcblxyXG4gICAgICAgIGN5Lm9uKCd0YXBzdGFydCcsIGVUYXBTdGFydCA9IGZ1bmN0aW9uKGV2ZW50KSB7XHJcbiAgICAgICAgICAvL2N5LmF1dG91bnNlbGVjdGlmeShmYWxzZSk7XHJcbiAgICAgICAgICB0YXBTdGFydFBvcyA9IGV2ZW50LnBvc2l0aW9uIHx8IGV2ZW50LmN5UG9zaXRpb247XHJcbiAgICAgICAgfSk7XHJcblxyXG4gICAgICAgIGN5Lm9uKCd0YXBzdGFydCcsICdlZGdlJywgZVRhcFN0YXJ0T25FZGdlID0gZnVuY3Rpb24gKGV2ZW50KSB7XHJcbiAgICAgICAgICB2YXIgZWRnZSA9IHRoaXM7XHJcblxyXG4gICAgICAgICAgaWYgKCFlZGdlVG9IaWdobGlnaHQgfHwgZWRnZVRvSGlnaGxpZ2h0LmlkKCkgIT09IGVkZ2UuaWQoKSkge1xyXG4gICAgICAgICAgICBjcmVhdGVBbmNob3JPbkRyYWcgPSBmYWxzZTtcclxuICAgICAgICAgICAgcmV0dXJuO1xyXG4gICAgICAgICAgfVxyXG4gICAgICAgICAgXHJcbiAgICAgICAgICBtb3ZlZEVkZ2UgPSBlZGdlO1xyXG5cclxuICAgICAgICAgIHZhciB0eXBlID0gYW5jaG9yUG9pbnRVdGlsaXRpZXMuZ2V0RWRnZVR5cGUoZWRnZSk7XHJcblxyXG4gICAgICAgICAgLy8gdG8gYXZvaWQgZXJyb3JzXHJcbiAgICAgICAgICBpZih0eXBlID09PSAnaW5jb25jbHVzaXZlJylcclxuICAgICAgICAgICAgdHlwZSA9ICdiZW5kJztcclxuICAgICAgICAgIFxyXG4gICAgICAgICAgdmFyIGN5UG9zWCA9IHRhcFN0YXJ0UG9zLng7XHJcbiAgICAgICAgICB2YXIgY3lQb3NZID0gdGFwU3RhcnRQb3MueTtcclxuICAgICAgICAgIFxyXG4gICAgICAgICAgLy8gR2V0IHdoaWNoIGVuZCBwb2ludCBoYXMgYmVlbiBjbGlja2VkIChTb3VyY2U6MCwgVGFyZ2V0OjEsIE5vbmU6LTEpXHJcbiAgICAgICAgICB2YXIgZW5kUG9pbnQgPSBnZXRDb250YWluaW5nRW5kUG9pbnQoY3lQb3NYLCBjeVBvc1ksIGVkZ2UpO1xyXG5cclxuICAgICAgICAgIGlmKGVuZFBvaW50ID09IDAgfHwgZW5kUG9pbnQgPT0gMSl7XHJcbiAgICAgICAgICAgIGVkZ2UudW5zZWxlY3QoKTtcclxuICAgICAgICAgICAgbW92ZWRFbmRQb2ludCA9IGVuZFBvaW50O1xyXG4gICAgICAgICAgICBkZXRhY2hlZE5vZGUgPSAoZW5kUG9pbnQgPT0gMCkgPyBtb3ZlZEVkZ2Uuc291cmNlKCkgOiBtb3ZlZEVkZ2UudGFyZ2V0KCk7XHJcblxyXG4gICAgICAgICAgICB2YXIgZGlzY29ubmVjdGVkRW5kID0gKGVuZFBvaW50ID09IDApID8gJ3NvdXJjZScgOiAndGFyZ2V0JztcclxuICAgICAgICAgICAgdmFyIHJlc3VsdCA9IHJlY29ubmVjdGlvblV0aWxpdGllcy5kaXNjb25uZWN0RWRnZShtb3ZlZEVkZ2UsIGN5LCBldmVudC5yZW5kZXJlZFBvc2l0aW9uLCBkaXNjb25uZWN0ZWRFbmQpO1xyXG4gICAgICAgICAgICBcclxuICAgICAgICAgICAgZHVtbXlOb2RlID0gcmVzdWx0LmR1bW15Tm9kZTtcclxuICAgICAgICAgICAgbW92ZWRFZGdlID0gcmVzdWx0LmVkZ2U7XHJcblxyXG4gICAgICAgICAgICBkaXNhYmxlR2VzdHVyZXMoKTtcclxuICAgICAgICAgIH1cclxuICAgICAgICAgIGVsc2Uge1xyXG4gICAgICAgICAgICBtb3ZlZEFuY2hvckluZGV4ID0gdW5kZWZpbmVkO1xyXG4gICAgICAgICAgICBjcmVhdGVBbmNob3JPbkRyYWcgPSB0cnVlO1xyXG4gICAgICAgICAgfVxyXG4gICAgICAgIH0pO1xyXG4gICAgICAgIFxyXG4gICAgICAgIGN5Lm9uKCdkcmFnJywgJ25vZGUnLCBlRHJhZyA9IGZ1bmN0aW9uIChldmVudCkge1xyXG4gICAgICAgICAgdmFyIG5vZGUgPSB0aGlzO1xyXG4gICAgICAgICAgY3kuZWRnZXMoKS51bnNlbGVjdCgpO1xyXG4gICAgICAgICAgaWYoIW5vZGUuc2VsZWN0ZWQoKSl7XHJcbiAgICAgICAgICAgIGN5Lm5vZGVzKCkudW5zZWxlY3QoKTtcclxuICAgICAgICAgIH0gICAgICAgICBcclxuICAgICAgICB9KTtcclxuICAgICAgICBjeS5vbigndGFwZHJhZycsIGVUYXBEcmFnID0gZnVuY3Rpb24gKGV2ZW50KSB7XHJcbiAgICAgICAgICAvKiogXHJcbiAgICAgICAgICAgKiBpZiB0aGVyZSBpcyBhIHNlbGVjdGVkIGVkZ2Ugc2V0IGF1dG91bnNlbGVjdGlmeSBmYWxzZVxyXG4gICAgICAgICAgICogZml4ZXMgdGhlIG5vZGUtZWRpdGluZyBwcm9ibGVtIHdoZXJlIG5vZGVzIHdvdWxkIGdldFxyXG4gICAgICAgICAgICogdW5zZWxlY3RlZCBhZnRlciByZXNpemUgZHJhZ1xyXG4gICAgICAgICAgKi9cclxuICAgICAgICAgIGlmIChjeS5lZGdlcygnOnNlbGVjdGVkJykubGVuZ3RoID4gMCkge1xyXG4gICAgICAgICAgICBjeS5hdXRvdW5zZWxlY3RpZnkoZmFsc2UpO1xyXG4gICAgICAgICAgfVxyXG4gICAgICAgICAgdmFyIGVkZ2UgPSBtb3ZlZEVkZ2U7XHJcblxyXG4gICAgICAgICAgaWYobW92ZWRFZGdlICE9PSB1bmRlZmluZWQgJiYgYW5jaG9yUG9pbnRVdGlsaXRpZXMuaXNJZ25vcmVkRWRnZShlZGdlKSApIHtcclxuICAgICAgICAgICAgcmV0dXJuO1xyXG4gICAgICAgICAgfVxyXG5cclxuICAgICAgICAgIHZhciB0eXBlID0gYW5jaG9yUG9pbnRVdGlsaXRpZXMuZ2V0RWRnZVR5cGUoZWRnZSk7XHJcblxyXG4gICAgICAgICAgaWYoY3JlYXRlQW5jaG9yT25EcmFnICYmICFhbmNob3JUb3VjaGVkICYmIHR5cGUgIT09ICdpbmNvbmNsdXNpdmUnKSB7XHJcbiAgICAgICAgICAgIC8vIHJlbWVtYmVyIHN0YXRlIGJlZm9yZSBjcmVhdGluZyBhbmNob3JcclxuICAgICAgICAgICAgdmFyIHdlaWdodFN0ciA9IGFuY2hvclBvaW50VXRpbGl0aWVzLnN5bnRheFt0eXBlXVsnd2VpZ2h0J107XHJcbiAgICAgICAgICAgIHZhciBkaXN0YW5jZVN0ciA9IGFuY2hvclBvaW50VXRpbGl0aWVzLnN5bnRheFt0eXBlXVsnZGlzdGFuY2UnXTtcclxuXHJcbiAgICAgICAgICAgIG1vdmVBbmNob3JQYXJhbSA9IHtcclxuICAgICAgICAgICAgICBlZGdlOiBlZGdlLFxyXG4gICAgICAgICAgICAgIHR5cGU6IHR5cGUsXHJcbiAgICAgICAgICAgICAgd2VpZ2h0czogZWRnZS5kYXRhKHdlaWdodFN0cikgPyBbXS5jb25jYXQoZWRnZS5kYXRhKHdlaWdodFN0cikpIDogW10sXHJcbiAgICAgICAgICAgICAgZGlzdGFuY2VzOiBlZGdlLmRhdGEoZGlzdGFuY2VTdHIpID8gW10uY29uY2F0KGVkZ2UuZGF0YShkaXN0YW5jZVN0cikpIDogW11cclxuICAgICAgICAgICAgfTtcclxuXHJcbiAgICAgICAgICAgIGVkZ2UudW5zZWxlY3QoKTtcclxuXHJcbiAgICAgICAgICAgIC8vIHVzaW5nIHRhcHN0YXJ0IHBvc2l0aW9uIGZpeGVzIGJ1ZyBvbiBxdWljayBkcmFnc1xyXG4gICAgICAgICAgICAvLyAtLS0gXHJcbiAgICAgICAgICAgIC8vIGFsc28gbW9kaWZpZWQgYWRkQW5jaG9yUG9pbnQgdG8gcmV0dXJuIHRoZSBpbmRleCBiZWNhdXNlXHJcbiAgICAgICAgICAgIC8vIGdldENvbnRhaW5pbmdTaGFwZUluZGV4IGZhaWxlZCB0byBmaW5kIHRoZSBjcmVhdGVkIGFuY2hvciBvbiBxdWljayBkcmFnc1xyXG4gICAgICAgICAgICBtb3ZlZEFuY2hvckluZGV4ID0gYW5jaG9yUG9pbnRVdGlsaXRpZXMuYWRkQW5jaG9yUG9pbnQoZWRnZSwgdGFwU3RhcnRQb3MpO1xyXG4gICAgICAgICAgICBtb3ZlZEVkZ2UgPSBlZGdlO1xyXG4gICAgICAgICAgICBjcmVhdGVBbmNob3JPbkRyYWcgPSB1bmRlZmluZWQ7XHJcbiAgICAgICAgICAgIGFuY2hvckNyZWF0ZWRCeURyYWcgPSB0cnVlO1xyXG4gICAgICAgICAgICBkaXNhYmxlR2VzdHVyZXMoKTtcclxuICAgICAgICAgIH1cclxuXHJcbiAgICAgICAgICAvLyBpZiB0aGUgdGFwc3RhcnQgZGlkIG5vdCBoaXQgYW4gZWRnZSBhbmQgaXQgZGlkIG5vdCBoaXQgYW4gYW5jaG9yXHJcbiAgICAgICAgICBpZiAoIWFuY2hvclRvdWNoZWQgJiYgKG1vdmVkRWRnZSA9PT0gdW5kZWZpbmVkIHx8IFxyXG4gICAgICAgICAgICAobW92ZWRBbmNob3JJbmRleCA9PT0gdW5kZWZpbmVkICYmIG1vdmVkRW5kUG9pbnQgPT09IHVuZGVmaW5lZCkpKSB7XHJcbiAgICAgICAgICAgIHJldHVybjtcclxuICAgICAgICAgIH1cclxuXHJcbiAgICAgICAgICB2YXIgZXZlbnRQb3MgPSBldmVudC5wb3NpdGlvbiB8fCBldmVudC5jeVBvc2l0aW9uO1xyXG5cclxuICAgICAgICAgIC8vIFVwZGF0ZSBlbmQgcG9pbnQgbG9jYXRpb24gKFNvdXJjZTowLCBUYXJnZXQ6MSlcclxuICAgICAgICAgIGlmKG1vdmVkRW5kUG9pbnQgIT0gLTEgJiYgZHVtbXlOb2RlKXtcclxuICAgICAgICAgICAgZHVtbXlOb2RlLnBvc2l0aW9uKGV2ZW50UG9zKTtcclxuICAgICAgICAgIH1cclxuICAgICAgICAgIC8vIGNoYW5nZSBsb2NhdGlvbiBvZiBhbmNob3IgY3JlYXRlZCBieSBkcmFnXHJcbiAgICAgICAgICBlbHNlIGlmKG1vdmVkQW5jaG9ySW5kZXggIT0gdW5kZWZpbmVkKXtcclxuICAgICAgICAgICAgX21vdmVBbmNob3JPbkRyYWcoZWRnZSwgdHlwZSwgbW92ZWRBbmNob3JJbmRleCwgZXZlbnRQb3MpO1xyXG4gICAgICAgICAgfVxyXG4gICAgICAgICAgLy8gY2hhbmdlIGxvY2F0aW9uIG9mIGRyYWcgYW5kIGRyb3BwZWQgYW5jaG9yXHJcbiAgICAgICAgICBlbHNlIGlmKGFuY2hvclRvdWNoZWQpe1xyXG5cclxuICAgICAgICAgICAgLy8gdGhlIHRhcFN0YXJ0UG9zIGNoZWNrIGlzIG5lY2Vzc2FyeSB3aGVuIHJpZ2ggY2xpY2tpbmcgYW5jaG9yIHBvaW50c1xyXG4gICAgICAgICAgICAvLyByaWdodCBjbGlja2luZyBhbmNob3IgcG9pbnRzIHRyaWdnZXJzIE1vdXNlRG93biBmb3IgS29udmEsIGJ1dCBub3QgdGFwc3RhcnQgZm9yIGN5XHJcbiAgICAgICAgICAgIC8vIHdoZW4gdGhhdCBoYXBwZW5zIHRhcFN0YXJ0UG9zIGlzIHVuZGVmaW5lZFxyXG4gICAgICAgICAgICBpZihhbmNob3JNYW5hZ2VyLnRvdWNoZWRBbmNob3JJbmRleCA9PT0gdW5kZWZpbmVkICYmIHRhcFN0YXJ0UG9zKXtcclxuICAgICAgICAgICAgICBhbmNob3JNYW5hZ2VyLnRvdWNoZWRBbmNob3JJbmRleCA9IGdldENvbnRhaW5pbmdTaGFwZUluZGV4KFxyXG4gICAgICAgICAgICAgICAgdGFwU3RhcnRQb3MueCwgXHJcbiAgICAgICAgICAgICAgICB0YXBTdGFydFBvcy55LFxyXG4gICAgICAgICAgICAgICAgYW5jaG9yTWFuYWdlci5lZGdlKTtcclxuICAgICAgICAgICAgfVxyXG5cclxuICAgICAgICAgICAgaWYoYW5jaG9yTWFuYWdlci50b3VjaGVkQW5jaG9ySW5kZXggIT09IHVuZGVmaW5lZCl7XHJcbiAgICAgICAgICAgICAgX21vdmVBbmNob3JPbkRyYWcoXHJcbiAgICAgICAgICAgICAgICBhbmNob3JNYW5hZ2VyLmVkZ2UsXHJcbiAgICAgICAgICAgICAgICBhbmNob3JNYW5hZ2VyLmVkZ2VUeXBlLFxyXG4gICAgICAgICAgICAgICAgYW5jaG9yTWFuYWdlci50b3VjaGVkQW5jaG9ySW5kZXgsXHJcbiAgICAgICAgICAgICAgICBldmVudFBvc1xyXG4gICAgICAgICAgICAgICk7XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICAgIH1cclxuICAgICAgICAgIFxyXG4gICAgICAgICAgaWYoZXZlbnQudGFyZ2V0ICYmIGV2ZW50LnRhcmdldFswXSAmJiBldmVudC50YXJnZXQuaXNOb2RlKCkpe1xyXG4gICAgICAgICAgICBub2RlVG9BdHRhY2ggPSBldmVudC50YXJnZXQ7XHJcbiAgICAgICAgICB9XHJcblxyXG4gICAgICAgIH0pO1xyXG4gICAgICAgIFxyXG4gICAgICAgIGN5Lm9uKCd0YXBlbmQnLCBlVGFwRW5kID0gZnVuY3Rpb24gKGV2ZW50KSB7XHJcblxyXG4gICAgICAgICAgaWYobW91c2VPdXQpe1xyXG4gICAgICAgICAgICBjYW52YXMuZ2V0U3RhZ2UoKS5maXJlKFwiY29udGVudE1vdXNldXBcIik7XHJcbiAgICAgICAgICB9XHJcblxyXG4gICAgICAgICAgdmFyIGVkZ2UgPSBtb3ZlZEVkZ2UgfHwgYW5jaG9yTWFuYWdlci5lZGdlOyBcclxuICAgICAgICAgIFxyXG4gICAgICAgICAgaWYoIGVkZ2UgIT09IHVuZGVmaW5lZCApIHtcclxuICAgICAgICAgICAgdmFyIGluZGV4ID0gYW5jaG9yTWFuYWdlci50b3VjaGVkQW5jaG9ySW5kZXg7XHJcbiAgICAgICAgICAgIGlmKCBpbmRleCAhPSB1bmRlZmluZWQgKSB7XHJcbiAgICAgICAgICAgICAgdmFyIHN0YXJ0WCA9IGVkZ2Uuc291cmNlKCkucG9zaXRpb24oJ3gnKTtcclxuICAgICAgICAgICAgICB2YXIgc3RhcnRZID0gZWRnZS5zb3VyY2UoKS5wb3NpdGlvbigneScpO1xyXG4gICAgICAgICAgICAgIHZhciBlbmRYID0gZWRnZS50YXJnZXQoKS5wb3NpdGlvbigneCcpO1xyXG4gICAgICAgICAgICAgIHZhciBlbmRZID0gZWRnZS50YXJnZXQoKS5wb3NpdGlvbigneScpO1xyXG4gICAgICAgICAgICAgIFxyXG4gICAgICAgICAgICAgIHZhciBhbmNob3JMaXN0ID0gYW5jaG9yUG9pbnRVdGlsaXRpZXMuZ2V0QW5jaG9yc0FzQXJyYXkoZWRnZSk7XHJcbiAgICAgICAgICAgICAgdmFyIGFsbEFuY2hvcnMgPSBbc3RhcnRYLCBzdGFydFldLmNvbmNhdChhbmNob3JMaXN0KS5jb25jYXQoW2VuZFgsIGVuZFldKTtcclxuICAgICAgICAgICAgICBcclxuICAgICAgICAgICAgICB2YXIgYW5jaG9ySW5kZXggPSBpbmRleCArIDE7XHJcbiAgICAgICAgICAgICAgdmFyIHByZUluZGV4ID0gYW5jaG9ySW5kZXggLSAxO1xyXG4gICAgICAgICAgICAgIHZhciBwb3NJbmRleCA9IGFuY2hvckluZGV4ICsgMTtcclxuICAgICAgICAgICAgICBcclxuICAgICAgICAgICAgICB2YXIgYW5jaG9yID0ge1xyXG4gICAgICAgICAgICAgICAgeDogYWxsQW5jaG9yc1syICogYW5jaG9ySW5kZXhdLFxyXG4gICAgICAgICAgICAgICAgeTogYWxsQW5jaG9yc1syICogYW5jaG9ySW5kZXggKyAxXVxyXG4gICAgICAgICAgICAgIH07XHJcbiAgICAgICAgICAgICAgXHJcbiAgICAgICAgICAgICAgdmFyIHByZUFuY2hvclBvaW50ID0ge1xyXG4gICAgICAgICAgICAgICAgeDogYWxsQW5jaG9yc1syICogcHJlSW5kZXhdLFxyXG4gICAgICAgICAgICAgICAgeTogYWxsQW5jaG9yc1syICogcHJlSW5kZXggKyAxXVxyXG4gICAgICAgICAgICAgIH07XHJcbiAgICAgICAgICAgICAgXHJcbiAgICAgICAgICAgICAgdmFyIHBvc0FuY2hvclBvaW50ID0ge1xyXG4gICAgICAgICAgICAgICAgeDogYWxsQW5jaG9yc1syICogcG9zSW5kZXhdLFxyXG4gICAgICAgICAgICAgICAgeTogYWxsQW5jaG9yc1syICogcG9zSW5kZXggKyAxXVxyXG4gICAgICAgICAgICAgIH07XHJcbiAgICAgICAgICAgICAgXHJcbiAgICAgICAgICAgICAgdmFyIG5lYXJUb0xpbmU7XHJcbiAgICAgICAgICAgICAgXHJcbiAgICAgICAgICAgICAgaWYoICggYW5jaG9yLnggPT09IHByZUFuY2hvclBvaW50LnggJiYgYW5jaG9yLnkgPT09IHByZUFuY2hvclBvaW50LnkgKSB8fCAoIGFuY2hvci54ID09PSBwcmVBbmNob3JQb2ludC54ICYmIGFuY2hvci55ID09PSBwcmVBbmNob3JQb2ludC55ICkgKSB7XHJcbiAgICAgICAgICAgICAgICBuZWFyVG9MaW5lID0gdHJ1ZTtcclxuICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgZWxzZSB7XHJcbiAgICAgICAgICAgICAgICB2YXIgbTEgPSAoIHByZUFuY2hvclBvaW50LnkgLSBwb3NBbmNob3JQb2ludC55ICkgLyAoIHByZUFuY2hvclBvaW50LnggLSBwb3NBbmNob3JQb2ludC54ICk7XHJcbiAgICAgICAgICAgICAgICB2YXIgbTIgPSAtMSAvIG0xO1xyXG5cclxuICAgICAgICAgICAgICAgIHZhciBzcmNUZ3RQb2ludHNBbmRUYW5nZW50cyA9IHtcclxuICAgICAgICAgICAgICAgICAgc3JjUG9pbnQ6IHByZUFuY2hvclBvaW50LFxyXG4gICAgICAgICAgICAgICAgICB0Z3RQb2ludDogcG9zQW5jaG9yUG9pbnQsXHJcbiAgICAgICAgICAgICAgICAgIG0xOiBtMSxcclxuICAgICAgICAgICAgICAgICAgbTI6IG0yXHJcbiAgICAgICAgICAgICAgICB9O1xyXG5cclxuICAgICAgICAgICAgICAgIHZhciBjdXJyZW50SW50ZXJzZWN0aW9uID0gYW5jaG9yUG9pbnRVdGlsaXRpZXMuZ2V0SW50ZXJzZWN0aW9uKGVkZ2UsIGFuY2hvciwgc3JjVGd0UG9pbnRzQW5kVGFuZ2VudHMpO1xyXG4gICAgICAgICAgICAgICAgdmFyIGRpc3QgPSBNYXRoLnNxcnQoIE1hdGgucG93KCAoYW5jaG9yLnggLSBjdXJyZW50SW50ZXJzZWN0aW9uLngpLCAyICkgXHJcbiAgICAgICAgICAgICAgICAgICAgICAgICsgTWF0aC5wb3coIChhbmNob3IueSAtIGN1cnJlbnRJbnRlcnNlY3Rpb24ueSksIDIgKSk7XHJcbiAgICAgICAgICAgICAgICBcclxuICAgICAgICAgICAgICAgIC8vIHJlbW92ZSB0aGUgYmVuZCBwb2ludCBpZiBzZWdtZW50IGVkZ2UgYmVjb21lcyBzdHJhaWdodFxyXG4gICAgICAgICAgICAgICAgdmFyIHR5cGUgPSBhbmNob3JQb2ludFV0aWxpdGllcy5nZXRFZGdlVHlwZShlZGdlKTtcclxuICAgICAgICAgICAgICAgIGlmKCAodHlwZSA9PT0gJ2JlbmQnICYmIGRpc3QgIDwgb3B0aW9ucygpLmJlbmRSZW1vdmFsU2Vuc2l0aXZpdHkpKSB7XHJcbiAgICAgICAgICAgICAgICAgIG5lYXJUb0xpbmUgPSB0cnVlO1xyXG4gICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgICAgXHJcbiAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgIFxyXG4gICAgICAgICAgICAgIGlmKCBuZWFyVG9MaW5lIClcclxuICAgICAgICAgICAgICB7XHJcbiAgICAgICAgICAgICAgICBhbmNob3JQb2ludFV0aWxpdGllcy5yZW1vdmVBbmNob3IoZWRnZSwgaW5kZXgpO1xyXG4gICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICBcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICBlbHNlIGlmKGR1bW15Tm9kZSAhPSB1bmRlZmluZWQgJiYgKG1vdmVkRW5kUG9pbnQgPT0gMCB8fCBtb3ZlZEVuZFBvaW50ID09IDEpICl7XHJcbiAgICAgICAgICAgICAgXHJcbiAgICAgICAgICAgICAgdmFyIG5ld05vZGUgPSBkZXRhY2hlZE5vZGU7XHJcbiAgICAgICAgICAgICAgdmFyIGlzVmFsaWQgPSAndmFsaWQnO1xyXG4gICAgICAgICAgICAgIHZhciBsb2NhdGlvbiA9IChtb3ZlZEVuZFBvaW50ID09IDApID8gJ3NvdXJjZScgOiAndGFyZ2V0JztcclxuXHJcbiAgICAgICAgICAgICAgLy8gdmFsaWRhdGUgZWRnZSByZWNvbm5lY3Rpb25cclxuICAgICAgICAgICAgICBpZihub2RlVG9BdHRhY2gpe1xyXG4gICAgICAgICAgICAgICAgdmFyIG5ld1NvdXJjZSA9IChtb3ZlZEVuZFBvaW50ID09IDApID8gbm9kZVRvQXR0YWNoIDogZWRnZS5zb3VyY2UoKTtcclxuICAgICAgICAgICAgICAgIHZhciBuZXdUYXJnZXQgPSAobW92ZWRFbmRQb2ludCA9PSAxKSA/IG5vZGVUb0F0dGFjaCA6IGVkZ2UudGFyZ2V0KCk7XHJcbiAgICAgICAgICAgICAgICBpZih0eXBlb2YgdmFsaWRhdGVFZGdlID09PSBcImZ1bmN0aW9uXCIpXHJcbiAgICAgICAgICAgICAgICAgIGlzVmFsaWQgPSB2YWxpZGF0ZUVkZ2UoZWRnZSwgbmV3U291cmNlLCBuZXdUYXJnZXQpO1xyXG4gICAgICAgICAgICAgICAgbmV3Tm9kZSA9IChpc1ZhbGlkID09PSAndmFsaWQnKSA/IG5vZGVUb0F0dGFjaCA6IGRldGFjaGVkTm9kZTtcclxuICAgICAgICAgICAgICB9XHJcblxyXG4gICAgICAgICAgICAgIHZhciBuZXdTb3VyY2UgPSAobW92ZWRFbmRQb2ludCA9PSAwKSA/IG5ld05vZGUgOiBlZGdlLnNvdXJjZSgpO1xyXG4gICAgICAgICAgICAgIHZhciBuZXdUYXJnZXQgPSAobW92ZWRFbmRQb2ludCA9PSAxKSA/IG5ld05vZGUgOiBlZGdlLnRhcmdldCgpO1xyXG4gICAgICAgICAgICAgIGVkZ2UgPSByZWNvbm5lY3Rpb25VdGlsaXRpZXMuY29ubmVjdEVkZ2UoZWRnZSwgZGV0YWNoZWROb2RlLCBsb2NhdGlvbik7XHJcblxyXG4gICAgICAgICAgICAgIGlmKGRldGFjaGVkTm9kZS5pZCgpICE9PSBuZXdOb2RlLmlkKCkpe1xyXG4gICAgICAgICAgICAgICAgLy8gdXNlIGdpdmVuIGhhbmRsZVJlY29ubmVjdEVkZ2UgZnVuY3Rpb24gXHJcbiAgICAgICAgICAgICAgICBpZih0eXBlb2YgaGFuZGxlUmVjb25uZWN0RWRnZSA9PT0gJ2Z1bmN0aW9uJyl7XHJcbiAgICAgICAgICAgICAgICAgIHZhciByZWNvbm5lY3RlZEVkZ2UgPSBoYW5kbGVSZWNvbm5lY3RFZGdlKG5ld1NvdXJjZS5pZCgpLCBuZXdUYXJnZXQuaWQoKSwgZWRnZS5kYXRhKCkpO1xyXG4gICAgICAgICAgICAgICAgICBcclxuICAgICAgICAgICAgICAgICAgaWYocmVjb25uZWN0ZWRFZGdlKXtcclxuICAgICAgICAgICAgICAgICAgICByZWNvbm5lY3Rpb25VdGlsaXRpZXMuY29weUVkZ2UoZWRnZSwgcmVjb25uZWN0ZWRFZGdlKTtcclxuICAgICAgICAgICAgICAgICAgICBhbmNob3JQb2ludFV0aWxpdGllcy5pbml0QW5jaG9yUG9pbnRzKG9wdGlvbnMoKS5iZW5kUG9zaXRpb25zRnVuY3Rpb24sIFxyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgb3B0aW9ucygpLmNvbnRyb2xQb3NpdGlvbnNGdW5jdGlvbiwgW3JlY29ubmVjdGVkRWRnZV0pO1xyXG4gICAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgICAgIFxyXG4gICAgICAgICAgICAgICAgICBpZihyZWNvbm5lY3RlZEVkZ2UgJiYgb3B0aW9ucygpLnVuZG9hYmxlKXtcclxuICAgICAgICAgICAgICAgICAgICB2YXIgcGFyYW1zID0ge1xyXG4gICAgICAgICAgICAgICAgICAgICAgbmV3RWRnZTogcmVjb25uZWN0ZWRFZGdlLFxyXG4gICAgICAgICAgICAgICAgICAgICAgb2xkRWRnZTogZWRnZVxyXG4gICAgICAgICAgICAgICAgICAgIH07XHJcbiAgICAgICAgICAgICAgICAgICAgY3kudW5kb1JlZG8oKS5kbygncmVtb3ZlUmVjb25uZWN0ZWRFZGdlJywgcGFyYW1zKTtcclxuICAgICAgICAgICAgICAgICAgICBlZGdlID0gcmVjb25uZWN0ZWRFZGdlO1xyXG4gICAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgICAgIGVsc2UgaWYocmVjb25uZWN0ZWRFZGdlKXtcclxuICAgICAgICAgICAgICAgICAgICBjeS5yZW1vdmUoZWRnZSk7XHJcbiAgICAgICAgICAgICAgICAgICAgZWRnZSA9IHJlY29ubmVjdGVkRWRnZTtcclxuICAgICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgICAgZWxzZXtcclxuICAgICAgICAgICAgICAgICAgdmFyIGxvYyA9IChtb3ZlZEVuZFBvaW50ID09IDApID8ge3NvdXJjZTogbmV3Tm9kZS5pZCgpfSA6IHt0YXJnZXQ6IG5ld05vZGUuaWQoKX07XHJcbiAgICAgICAgICAgICAgICAgIHZhciBvbGRMb2MgPSAobW92ZWRFbmRQb2ludCA9PSAwKSA/IHtzb3VyY2U6IGRldGFjaGVkTm9kZS5pZCgpfSA6IHt0YXJnZXQ6IGRldGFjaGVkTm9kZS5pZCgpfTtcclxuICAgICAgICAgICAgICAgICAgXHJcbiAgICAgICAgICAgICAgICAgIGlmKG9wdGlvbnMoKS51bmRvYWJsZSAmJiBuZXdOb2RlLmlkKCkgIT09IGRldGFjaGVkTm9kZS5pZCgpKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgdmFyIHBhcmFtID0ge1xyXG4gICAgICAgICAgICAgICAgICAgICAgZWRnZTogZWRnZSxcclxuICAgICAgICAgICAgICAgICAgICAgIGxvY2F0aW9uOiBsb2MsXHJcbiAgICAgICAgICAgICAgICAgICAgICBvbGRMb2M6IG9sZExvY1xyXG4gICAgICAgICAgICAgICAgICAgIH07XHJcbiAgICAgICAgICAgICAgICAgICAgdmFyIHJlc3VsdCA9IGN5LnVuZG9SZWRvKCkuZG8oJ3JlY29ubmVjdEVkZ2UnLCBwYXJhbSk7XHJcbiAgICAgICAgICAgICAgICAgICAgZWRnZSA9IHJlc3VsdC5lZGdlO1xyXG4gICAgICAgICAgICAgICAgICAgIC8vZWRnZS5zZWxlY3QoKTtcclxuICAgICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgICAgfSAgXHJcbiAgICAgICAgICAgICAgfVxyXG5cclxuICAgICAgICAgICAgICAvLyBpbnZhbGlkIGVkZ2UgcmVjb25uZWN0aW9uIGNhbGxiYWNrXHJcbiAgICAgICAgICAgICAgaWYoaXNWYWxpZCAhPT0gJ3ZhbGlkJyAmJiB0eXBlb2YgYWN0T25VbnN1Y2Nlc3NmdWxSZWNvbm5lY3Rpb24gPT09ICdmdW5jdGlvbicpe1xyXG4gICAgICAgICAgICAgICAgYWN0T25VbnN1Y2Nlc3NmdWxSZWNvbm5lY3Rpb24oKTtcclxuICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgZWRnZS5zZWxlY3QoKTtcclxuICAgICAgICAgICAgICBjeS5yZW1vdmUoZHVtbXlOb2RlKTtcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgICAgfVxyXG4gICAgICAgICAgdmFyIHR5cGUgPSBhbmNob3JQb2ludFV0aWxpdGllcy5nZXRFZGdlVHlwZShlZGdlKTtcclxuXHJcbiAgICAgICAgICAvLyB0byBhdm9pZCBlcnJvcnNcclxuICAgICAgICAgIGlmKHR5cGUgPT09ICdpbmNvbmNsdXNpdmUnKXtcclxuICAgICAgICAgICAgdHlwZSA9ICdiZW5kJztcclxuICAgICAgICAgIH1cclxuXHJcbiAgICAgICAgICBpZihhbmNob3JNYW5hZ2VyLnRvdWNoZWRBbmNob3JJbmRleCA9PT0gdW5kZWZpbmVkICYmICFhbmNob3JDcmVhdGVkQnlEcmFnKXtcclxuICAgICAgICAgICAgbW92ZUFuY2hvclBhcmFtID0gdW5kZWZpbmVkO1xyXG4gICAgICAgICAgfVxyXG5cclxuICAgICAgICAgIHZhciB3ZWlnaHRTdHIgPSBhbmNob3JQb2ludFV0aWxpdGllcy5zeW50YXhbdHlwZV1bJ3dlaWdodCddO1xyXG4gICAgICAgICAgaWYgKGVkZ2UgIT09IHVuZGVmaW5lZCAmJiBtb3ZlQW5jaG9yUGFyYW0gIT09IHVuZGVmaW5lZCAmJiBcclxuICAgICAgICAgICAgKGVkZ2UuZGF0YSh3ZWlnaHRTdHIpID8gZWRnZS5kYXRhKHdlaWdodFN0cikudG9TdHJpbmcoKSA6IG51bGwpICE9IG1vdmVBbmNob3JQYXJhbS53ZWlnaHRzLnRvU3RyaW5nKCkpIHtcclxuICAgICAgICAgICAgXHJcbiAgICAgICAgICAgIC8vIGFuY2hvciBjcmVhdGVkIGZyb20gZHJhZ1xyXG4gICAgICAgICAgICBpZihhbmNob3JDcmVhdGVkQnlEcmFnKXtcclxuICAgICAgICAgICAgZWRnZS5zZWxlY3QoKTsgXHJcblxyXG4gICAgICAgICAgICAvLyBzdG9wcyB0aGUgdW5idW5kbGVkIGJlemllciBlZGdlcyBmcm9tIGJlaW5nIHVuc2VsZWN0ZWRcclxuICAgICAgICAgICAgY3kuYXV0b3Vuc2VsZWN0aWZ5KHRydWUpO1xyXG4gICAgICAgICAgICB9XHJcblxyXG4gICAgICAgICAgICBpZihvcHRpb25zKCkudW5kb2FibGUpIHtcclxuICAgICAgICAgICAgICBjeS51bmRvUmVkbygpLmRvKCdjaGFuZ2VBbmNob3JQb2ludHMnLCBtb3ZlQW5jaG9yUGFyYW0pO1xyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgICB9XHJcbiAgICAgICAgICBcclxuICAgICAgICAgIG1vdmVkQW5jaG9ySW5kZXggPSB1bmRlZmluZWQ7XHJcbiAgICAgICAgICBtb3ZlZEVkZ2UgPSB1bmRlZmluZWQ7XHJcbiAgICAgICAgICBtb3ZlQW5jaG9yUGFyYW0gPSB1bmRlZmluZWQ7XHJcbiAgICAgICAgICBjcmVhdGVBbmNob3JPbkRyYWcgPSB1bmRlZmluZWQ7XHJcbiAgICAgICAgICBtb3ZlZEVuZFBvaW50ID0gdW5kZWZpbmVkO1xyXG4gICAgICAgICAgZHVtbXlOb2RlID0gdW5kZWZpbmVkO1xyXG4gICAgICAgICAgZGV0YWNoZWROb2RlID0gdW5kZWZpbmVkO1xyXG4gICAgICAgICAgbm9kZVRvQXR0YWNoID0gdW5kZWZpbmVkO1xyXG4gICAgICAgICAgdGFwU3RhcnRQb3MgPSB1bmRlZmluZWQ7XHJcbiAgICAgICAgICBhbmNob3JDcmVhdGVkQnlEcmFnID0gZmFsc2U7XHJcblxyXG4gICAgICAgICAgYW5jaG9yTWFuYWdlci50b3VjaGVkQW5jaG9ySW5kZXggPSB1bmRlZmluZWQ7IFxyXG5cclxuICAgICAgICAgIHJlc2V0R2VzdHVyZXMoKTtcclxuICAgICAgICAgIHNldFRpbWVvdXQoZnVuY3Rpb24oKXtyZWZyZXNoRHJhd3MoKX0sIDUwKTtcclxuICAgICAgICB9KTtcclxuXHJcbiAgICAgICAgLy9WYXJpYWJsZXMgdXNlZCBmb3Igc3RhcnRpbmcgYW5kIGVuZGluZyB0aGUgbW92ZW1lbnQgb2YgYW5jaG9yIHBvaW50cyB3aXRoIGFycm93c1xyXG4gICAgICAgIHZhciBtb3ZlYW5jaG9ycGFyYW07XHJcbiAgICAgICAgdmFyIGZpcnN0QW5jaG9yO1xyXG4gICAgICAgIHZhciBlZGdlQ29udGFpbmluZ0ZpcnN0QW5jaG9yO1xyXG4gICAgICAgIHZhciBmaXJzdEFuY2hvclBvaW50Rm91bmQ7XHJcbiAgICAgICAgY3kub24oXCJlZGdlZWRpdGluZy5tb3Zlc3RhcnRcIiwgZnVuY3Rpb24gKGUsIGVkZ2VzKSB7XHJcbiAgICAgICAgICAgIGZpcnN0QW5jaG9yUG9pbnRGb3VuZCA9IGZhbHNlO1xyXG4gICAgICAgICAgICBpZiAoZWRnZXNbMF0gIT0gdW5kZWZpbmVkKVxyXG4gICAgICAgICAgICB7XHJcbiAgICAgICAgICAgICAgICBlZGdlcy5mb3JFYWNoKGZ1bmN0aW9uKCBlZGdlICl7XHJcbiAgICAgICAgICAgICAgICAgIGlmIChhbmNob3JQb2ludFV0aWxpdGllcy5nZXRBbmNob3JzQXNBcnJheShlZGdlKSAhPSB1bmRlZmluZWQgJiYgIWZpcnN0QW5jaG9yUG9pbnRGb3VuZClcclxuICAgICAgICAgICAgICAgICAge1xyXG4gICAgICAgICAgICAgICAgICAgICAgZmlyc3RBbmNob3IgPSB7IHg6IGFuY2hvclBvaW50VXRpbGl0aWVzLmdldEFuY2hvcnNBc0FycmF5KGVkZ2UpWzBdLCB5OiBhbmNob3JQb2ludFV0aWxpdGllcy5nZXRBbmNob3JzQXNBcnJheShlZGdlKVsxXX07XHJcbiAgICAgICAgICAgICAgICAgICAgICBtb3ZlYW5jaG9ycGFyYW0gPSB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgZmlyc3RUaW1lOiB0cnVlLFxyXG4gICAgICAgICAgICAgICAgICAgICAgICAgIGZpcnN0QW5jaG9yUG9zaXRpb246IHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgeDogZmlyc3RBbmNob3IueCxcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgeTogZmlyc3RBbmNob3IueVxyXG4gICAgICAgICAgICAgICAgICAgICAgICAgIH0sXHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgZWRnZXM6IGVkZ2VzXHJcbiAgICAgICAgICAgICAgICAgICAgICB9O1xyXG4gICAgICAgICAgICAgICAgICAgICAgZWRnZUNvbnRhaW5pbmdGaXJzdEFuY2hvciA9IGVkZ2U7XHJcbiAgICAgICAgICAgICAgICAgICAgICBmaXJzdEFuY2hvclBvaW50Rm91bmQgPSB0cnVlO1xyXG4gICAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgICB9KTtcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgIH0pO1xyXG5cclxuICAgICAgICBjeS5vbihcImVkZ2VlZGl0aW5nLm1vdmVlbmRcIiwgZnVuY3Rpb24gKGUsIGVkZ2VzKSB7XHJcbiAgICAgICAgICAgIGlmIChtb3ZlYW5jaG9ycGFyYW0gIT0gdW5kZWZpbmVkKVxyXG4gICAgICAgICAgICB7XHJcbiAgICAgICAgICAgICAgICB2YXIgaW5pdGlhbFBvcyA9IG1vdmVhbmNob3JwYXJhbS5maXJzdEFuY2hvclBvc2l0aW9uO1xyXG4gICAgICAgICAgICAgICAgdmFyIG1vdmVkRmlyc3RBbmNob3IgPSB7XHJcbiAgICAgICAgICAgICAgICAgICAgeDogYW5jaG9yUG9pbnRVdGlsaXRpZXMuZ2V0QW5jaG9yc0FzQXJyYXkoZWRnZUNvbnRhaW5pbmdGaXJzdEFuY2hvcilbMF0sXHJcbiAgICAgICAgICAgICAgICAgICAgeTogYW5jaG9yUG9pbnRVdGlsaXRpZXMuZ2V0QW5jaG9yc0FzQXJyYXkoZWRnZUNvbnRhaW5pbmdGaXJzdEFuY2hvcilbMV1cclxuICAgICAgICAgICAgICAgIH07XHJcblxyXG5cclxuICAgICAgICAgICAgICAgIG1vdmVhbmNob3JwYXJhbS5wb3NpdGlvbkRpZmYgPSB7XHJcbiAgICAgICAgICAgICAgICAgICAgeDogLW1vdmVkRmlyc3RBbmNob3IueCArIGluaXRpYWxQb3MueCxcclxuICAgICAgICAgICAgICAgICAgICB5OiAtbW92ZWRGaXJzdEFuY2hvci55ICsgaW5pdGlhbFBvcy55XHJcbiAgICAgICAgICAgICAgICB9XHJcblxyXG4gICAgICAgICAgICAgICAgZGVsZXRlIG1vdmVhbmNob3JwYXJhbS5maXJzdEFuY2hvclBvc2l0aW9uO1xyXG5cclxuICAgICAgICAgICAgICAgIGlmKG9wdGlvbnMoKS51bmRvYWJsZSkge1xyXG4gICAgICAgICAgICAgICAgICAgIGN5LnVuZG9SZWRvKCkuZG8oXCJtb3ZlQW5jaG9yUG9pbnRzXCIsIG1vdmVhbmNob3JwYXJhbSk7XHJcbiAgICAgICAgICAgICAgICB9XHJcblxyXG4gICAgICAgICAgICAgICAgbW92ZWFuY2hvcnBhcmFtID0gdW5kZWZpbmVkO1xyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgfSk7XHJcblxyXG4gICAgICAgIGN5Lm9uKCdjeHR0YXAnLCBlQ3h0VGFwID0gZnVuY3Rpb24gKGV2ZW50KSB7XHJcbiAgICAgICAgICB2YXIgdGFyZ2V0ID0gZXZlbnQudGFyZ2V0IHx8IGV2ZW50LmN5VGFyZ2V0O1xyXG4gICAgICAgICAgdmFyIHRhcmdldElzRWRnZSA9IGZhbHNlO1xyXG5cclxuICAgICAgICAgIHRyeXtcclxuICAgICAgICAgICAgdGFyZ2V0SXNFZGdlID0gdGFyZ2V0LmlzRWRnZSgpO1xyXG4gICAgICAgICAgfVxyXG4gICAgICAgICAgY2F0Y2goZXJyKXtcclxuICAgICAgICAgICAgLy8gdGhpcyBpcyBoZXJlIGp1c3QgdG8gc3VwcHJlc3MgdGhlIGVycm9yXHJcbiAgICAgICAgICB9XHJcblxyXG4gICAgICAgICAgdmFyIGVkZ2UsIHR5cGU7XHJcbiAgICAgICAgICBpZih0YXJnZXRJc0VkZ2Upe1xyXG4gICAgICAgICAgICBlZGdlID0gdGFyZ2V0O1xyXG4gICAgICAgICAgICB0eXBlID0gYW5jaG9yUG9pbnRVdGlsaXRpZXMuZ2V0RWRnZVR5cGUoZWRnZSk7XHJcbiAgICAgICAgICB9XHJcbiAgICAgICAgICBlbHNle1xyXG4gICAgICAgICAgICBlZGdlID0gYW5jaG9yTWFuYWdlci5lZGdlOyAgICAgICAgICBcclxuICAgICAgICAgICAgdHlwZSA9IGFuY2hvck1hbmFnZXIuZWRnZVR5cGU7XHJcbiAgICAgICAgICB9XHJcblxyXG4gICAgICAgICAgdmFyIG1lbnVzID0gY3kuY29udGV4dE1lbnVzKCdnZXQnKTsgLy8gZ2V0IGNvbnRleHQgbWVudXMgaW5zdGFuY2VcclxuICAgICAgICAgIFxyXG4gICAgICAgICAgaWYoIWVkZ2VUb0hpZ2hsaWdodCB8fCBlZGdlVG9IaWdobGlnaHQuaWQoKSAhPSBlZGdlLmlkKCkgfHwgYW5jaG9yUG9pbnRVdGlsaXRpZXMuaXNJZ25vcmVkRWRnZShlZGdlKSB8fFxyXG4gICAgICAgICAgICAgIGVkZ2VUb0hpZ2hsaWdodCAhPT0gZWRnZSkge1xyXG4gICAgICAgICAgICBtZW51cy5oaWRlTWVudUl0ZW0ocmVtb3ZlQmVuZFBvaW50Q3h0TWVudUlkKTtcclxuICAgICAgICAgICAgbWVudXMuaGlkZU1lbnVJdGVtKGFkZEJlbmRQb2ludEN4dE1lbnVJZCk7XHJcbiAgICAgICAgICAgIG1lbnVzLmhpZGVNZW51SXRlbShyZW1vdmVDb250cm9sUG9pbnRDeHRNZW51SWQpO1xyXG4gICAgICAgICAgICBtZW51cy5oaWRlTWVudUl0ZW0oYWRkQ29udHJvbFBvaW50Q3h0TWVudUlkKTtcclxuICAgICAgICAgICAgcmV0dXJuO1xyXG4gICAgICAgICAgfVxyXG5cclxuICAgICAgICAgIHZhciBjeVBvcyA9IGV2ZW50LnBvc2l0aW9uIHx8IGV2ZW50LmN5UG9zaXRpb247XHJcbiAgICAgICAgICB2YXIgc2VsZWN0ZWRJbmRleCA9IGdldENvbnRhaW5pbmdTaGFwZUluZGV4KGN5UG9zLngsIGN5UG9zLnksIGVkZ2UpO1xyXG4gICAgICAgICAgLy8gbm90IGNsaWNrZWQgb24gYW4gYW5jaG9yXHJcbiAgICAgICAgICBpZiAoc2VsZWN0ZWRJbmRleCA9PSAtMSkge1xyXG4gICAgICAgICAgICBtZW51cy5oaWRlTWVudUl0ZW0ocmVtb3ZlQmVuZFBvaW50Q3h0TWVudUlkKTtcclxuICAgICAgICAgICAgbWVudXMuaGlkZU1lbnVJdGVtKHJlbW92ZUNvbnRyb2xQb2ludEN4dE1lbnVJZCk7XHJcbiAgICAgICAgICAgIGlmKHR5cGUgPT09ICdjb250cm9sJyAmJiB0YXJnZXRJc0VkZ2Upe1xyXG4gICAgICAgICAgICAgIG1lbnVzLnNob3dNZW51SXRlbShhZGRDb250cm9sUG9pbnRDeHRNZW51SWQpO1xyXG4gICAgICAgICAgICAgIG1lbnVzLmhpZGVNZW51SXRlbShhZGRCZW5kUG9pbnRDeHRNZW51SWQpO1xyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgICAgIGVsc2UgaWYodHlwZSA9PT0gJ2JlbmQnICYmIHRhcmdldElzRWRnZSl7XHJcbiAgICAgICAgICAgICAgbWVudXMuc2hvd01lbnVJdGVtKGFkZEJlbmRQb2ludEN4dE1lbnVJZCk7XHJcbiAgICAgICAgICAgICAgbWVudXMuaGlkZU1lbnVJdGVtKGFkZENvbnRyb2xQb2ludEN4dE1lbnVJZCk7XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgZWxzZSBpZiAodGFyZ2V0SXNFZGdlKXtcclxuICAgICAgICAgICAgICBtZW51cy5zaG93TWVudUl0ZW0oYWRkQmVuZFBvaW50Q3h0TWVudUlkKTtcclxuICAgICAgICAgICAgICBtZW51cy5zaG93TWVudUl0ZW0oYWRkQ29udHJvbFBvaW50Q3h0TWVudUlkKTtcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICBlbHNlIHtcclxuICAgICAgICAgICAgICBtZW51cy5oaWRlTWVudUl0ZW0oYWRkQmVuZFBvaW50Q3h0TWVudUlkKTtcclxuICAgICAgICAgICAgICBtZW51cy5oaWRlTWVudUl0ZW0oYWRkQ29udHJvbFBvaW50Q3h0TWVudUlkKTtcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICBhbmNob3JQb2ludFV0aWxpdGllcy5jdXJyZW50Q3R4UG9zID0gY3lQb3M7XHJcbiAgICAgICAgICB9XHJcbiAgICAgICAgICAvLyBjbGlja2VkIG9uIGFuIGFuY2hvclxyXG4gICAgICAgICAgZWxzZSB7XHJcbiAgICAgICAgICAgIG1lbnVzLmhpZGVNZW51SXRlbShhZGRCZW5kUG9pbnRDeHRNZW51SWQpO1xyXG4gICAgICAgICAgICBtZW51cy5oaWRlTWVudUl0ZW0oYWRkQ29udHJvbFBvaW50Q3h0TWVudUlkKTtcclxuICAgICAgICAgICAgaWYodHlwZSA9PT0gJ2NvbnRyb2wnKXtcclxuICAgICAgICAgICAgICBtZW51cy5zaG93TWVudUl0ZW0ocmVtb3ZlQ29udHJvbFBvaW50Q3h0TWVudUlkKTtcclxuICAgICAgICAgICAgICBtZW51cy5oaWRlTWVudUl0ZW0ocmVtb3ZlQmVuZFBvaW50Q3h0TWVudUlkKTtcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICBlbHNlIGlmKHR5cGUgPT09ICdiZW5kJyl7XHJcbiAgICAgICAgICAgICAgbWVudXMuc2hvd01lbnVJdGVtKHJlbW92ZUJlbmRQb2ludEN4dE1lbnVJZCk7XHJcbiAgICAgICAgICAgICAgbWVudXMuaGlkZU1lbnVJdGVtKHJlbW92ZUNvbnRyb2xQb2ludEN4dE1lbnVJZCk7XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgZWxzZXtcclxuICAgICAgICAgICAgICBtZW51cy5oaWRlTWVudUl0ZW0ocmVtb3ZlQmVuZFBvaW50Q3h0TWVudUlkKTtcclxuICAgICAgICAgICAgICBtZW51cy5oaWRlTWVudUl0ZW0ocmVtb3ZlQ29udHJvbFBvaW50Q3h0TWVudUlkKTtcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICBhbmNob3JQb2ludFV0aWxpdGllcy5jdXJyZW50QW5jaG9ySW5kZXggPSBzZWxlY3RlZEluZGV4O1xyXG4gICAgICAgICAgfVxyXG5cclxuICAgICAgICAgIGFuY2hvclBvaW50VXRpbGl0aWVzLmN1cnJlbnRDdHhFZGdlID0gZWRnZTtcclxuICAgICAgICB9KTtcclxuICAgICAgICBcclxuICAgICAgICBjeS5vbignY3llZGdlZWRpdGluZy5jaGFuZ2VBbmNob3JQb2ludHMnLCAnZWRnZScsIGZ1bmN0aW9uKCkge1xyXG4gICAgICAgICAgdmFyIGVkZ2UgPSB0aGlzO1xyXG4gICAgICAgICAgY3kuc3RhcnRCYXRjaCgpO1xyXG4gICAgICAgICAgY3kuZWRnZXMoKS51bnNlbGVjdCgpOyBcclxuICAgICAgICAgICAgICAgICAgICBcclxuICAgICAgICAgIC8vIExpc3RlbmVyIGRlZmluZWQgaW4gb3RoZXIgZXh0ZW5zaW9uXHJcbiAgICAgICAgICAvLyBNaWdodCBoYXZlIGNvbXBhdGliaWxpdHkgaXNzdWVzIGFmdGVyIHRoZSB1bmJ1bmRsZWQgYmV6aWVyICAgIFxyXG4gICAgICAgICAgY3kudHJpZ2dlcignYmVuZFBvaW50TW92ZW1lbnQnKTsgICAgXHJcbiAgICAgICAgICBcclxuICAgICAgICAgIGN5LmVuZEJhdGNoKCk7ICAgICAgICAgIFxyXG4gICAgICAgICAgcmVmcmVzaERyYXdzKCk7XHJcbiAgICAgICAgXHJcbiAgICAgICAgICBcclxuICAgICAgICB9KTtcclxuICAgICAgfVxyXG5cclxuICAgICAgdmFyIHNlbGVjdGVkRWRnZXM7XHJcbiAgICAgIHZhciBhbmNob3JzTW92aW5nID0gZmFsc2U7XHJcblxyXG4gICAgICAvLyB0cmFjayBhcnJvdyBrZXkgcHJlc3NlcywgZGVmYXVsdCBmYWxzZVxyXG4gICAgICAvLyBldmVudC5rZXlDb2RlIG5vcm1hbGx5IHJldHVybnMgbnVtYmVyXHJcbiAgICAgIC8vIGJ1dCBKUyB3aWxsIGNvbnZlcnQgdG8gc3RyaW5nIGFueXdheVxyXG4gICAgICB2YXIga2V5cyA9IHtcclxuICAgICAgICAnMzcnOiBmYWxzZSxcclxuICAgICAgICAnMzgnOiBmYWxzZSxcclxuICAgICAgICAnMzknOiBmYWxzZSxcclxuICAgICAgICAnNDAnOiBmYWxzZVxyXG4gICAgICB9O1xyXG5cclxuICAgICAgZnVuY3Rpb24ga2V5RG93bihlKSB7XHJcbiAgICAgICAgY3kuYXV0b3Vuc2VsZWN0aWZ5KGZhbHNlKTtcclxuXHJcbiAgICAgICAgICB2YXIgc2hvdWxkTW92ZSA9IHR5cGVvZiBvcHRpb25zKCkubW92ZVNlbGVjdGVkQW5jaG9yc09uS2V5RXZlbnRzID09PSAnZnVuY3Rpb24nXHJcbiAgICAgICAgICAgICAgPyBvcHRpb25zKCkubW92ZVNlbGVjdGVkQW5jaG9yc09uS2V5RXZlbnRzKCkgOiBvcHRpb25zKCkubW92ZVNlbGVjdGVkQW5jaG9yc09uS2V5RXZlbnRzO1xyXG5cclxuICAgICAgICAgIGlmICghc2hvdWxkTW92ZSkge1xyXG4gICAgICAgICAgICAgIHJldHVybjtcclxuICAgICAgICAgIH1cclxuXHJcbiAgICAgICAgICAvL0NoZWNrcyBpZiB0aGUgdGFnbmFtZSBpcyB0ZXh0YXJlYSBvciBpbnB1dFxyXG4gICAgICAgICAgdmFyIHRuID0gZG9jdW1lbnQuYWN0aXZlRWxlbWVudC50YWdOYW1lO1xyXG4gICAgICAgICAgaWYgKHRuICE9IFwiVEVYVEFSRUFcIiAmJiB0biAhPSBcIklOUFVUXCIpXHJcbiAgICAgICAgICB7XHJcbiAgICAgICAgICAgICAgc3dpdGNoKGUua2V5Q29kZSl7XHJcbiAgICAgICAgICAgICAgICAgIGNhc2UgMzc6IGNhc2UgMzk6IGNhc2UgMzg6ICBjYXNlIDQwOiAvLyBBcnJvdyBrZXlzXHJcbiAgICAgICAgICAgICAgICAgIGNhc2UgMzI6IGUucHJldmVudERlZmF1bHQoKTsgYnJlYWs7IC8vIFNwYWNlXHJcbiAgICAgICAgICAgICAgICAgIGRlZmF1bHQ6IGJyZWFrOyAvLyBkbyBub3QgYmxvY2sgb3RoZXIga2V5c1xyXG4gICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICBpZiAoZS5rZXlDb2RlIDwgJzM3JyB8fCBlLmtleUNvZGUgPiAnNDAnKSB7XHJcbiAgICAgICAgICAgICAgICAgIHJldHVybjtcclxuICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAga2V5c1tlLmtleUNvZGVdID0gdHJ1ZTtcclxuXHJcbiAgICAgICAgICAgICAgLy9DaGVja3MgaWYgb25seSBlZGdlcyBhcmUgc2VsZWN0ZWQgKG5vdCBhbnkgbm9kZSkgYW5kIGlmIG9ubHkgMSBlZGdlIGlzIHNlbGVjdGVkXHJcbiAgICAgICAgICAgICAgLy9JZiB0aGUgc2Vjb25kIGNoZWNraW5nIGlzIHJlbW92ZWQgdGhlIGFuY2hvcnMgb2YgbXVsdGlwbGUgZWRnZXMgd291bGQgbW92ZVxyXG4gICAgICAgICAgICAgIGlmIChjeS5lZGdlcyhcIjpzZWxlY3RlZFwiKS5sZW5ndGggIT0gY3kuZWxlbWVudHMoXCI6c2VsZWN0ZWRcIikubGVuZ3RoIHx8IGN5LmVkZ2VzKFwiOnNlbGVjdGVkXCIpLmxlbmd0aCAhPSAxKVxyXG4gICAgICAgICAgICAgIHtcclxuICAgICAgICAgICAgICAgIHJldHVybjtcclxuICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgaWYgKCFhbmNob3JzTW92aW5nKVxyXG4gICAgICAgICAgICAgIHtcclxuICAgICAgICAgICAgICAgICAgc2VsZWN0ZWRFZGdlcyA9IGN5LmVkZ2VzKCc6c2VsZWN0ZWQnKTtcclxuICAgICAgICAgICAgICAgICAgY3kudHJpZ2dlcihcImVkZ2VlZGl0aW5nLm1vdmVzdGFydFwiLCBbc2VsZWN0ZWRFZGdlc10pO1xyXG4gICAgICAgICAgICAgICAgICBhbmNob3JzTW92aW5nID0gdHJ1ZTtcclxuICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgdmFyIG1vdmVTcGVlZCA9IDM7XHJcbiAgICAgICAgICAgICAgICAgICAgXHJcbiAgICAgICAgICAgICAgLy8gZG9lc24ndCBtYWtlIHNlbnNlIGlmIGFsdCBhbmQgc2hpZnQgYm90aCBwcmVzc2VkXHJcbiAgICAgICAgICAgICAgaWYoZS5hbHRLZXkgJiYgZS5zaGlmdEtleSkge1xyXG4gICAgICAgICAgICAgICAgcmV0dXJuO1xyXG4gICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICBlbHNlIGlmIChlLmFsdEtleSkge1xyXG4gICAgICAgICAgICAgICAgbW92ZVNwZWVkID0gMTtcclxuICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgZWxzZSBpZiAoZS5zaGlmdEtleSkge1xyXG4gICAgICAgICAgICAgICAgbW92ZVNwZWVkID0gMTA7XHJcbiAgICAgICAgICAgICAgfVxyXG5cclxuICAgICAgICAgICAgICB2YXIgdXBBcnJvd0NvZGUgPSAzODtcclxuICAgICAgICAgICAgICB2YXIgZG93bkFycm93Q29kZSA9IDQwO1xyXG4gICAgICAgICAgICAgIHZhciBsZWZ0QXJyb3dDb2RlID0gMzc7XHJcbiAgICAgICAgICAgICAgdmFyIHJpZ2h0QXJyb3dDb2RlID0gMzk7XHJcblxyXG4gICAgICAgICAgICAgIHZhciBkeCA9IDA7XHJcbiAgICAgICAgICAgICAgdmFyIGR5ID0gMDtcclxuXHJcbiAgICAgICAgICAgICAgZHggKz0ga2V5c1tyaWdodEFycm93Q29kZV0gPyBtb3ZlU3BlZWQgOiAwO1xyXG4gICAgICAgICAgICAgIGR4IC09IGtleXNbbGVmdEFycm93Q29kZV0gPyBtb3ZlU3BlZWQgOiAwO1xyXG4gICAgICAgICAgICAgIGR5ICs9IGtleXNbZG93bkFycm93Q29kZV0gPyBtb3ZlU3BlZWQgOiAwO1xyXG4gICAgICAgICAgICAgIGR5IC09IGtleXNbdXBBcnJvd0NvZGVdID8gbW92ZVNwZWVkIDogMDtcclxuXHJcbiAgICAgICAgICAgICAgbW92ZUFuY2hvclBvaW50cyh7eDpkeCwgeTpkeX0sIHNlbGVjdGVkRWRnZXMpO1xyXG4gICAgICAgICAgfVxyXG4gICAgICB9XHJcbiAgICAgIGZ1bmN0aW9uIGtleVVwKGUpIHtcclxuXHJcbiAgICAgICAgICBpZiAoZS5rZXlDb2RlIDwgJzM3JyB8fCBlLmtleUNvZGUgPiAnNDAnKSB7XHJcbiAgICAgICAgICAgICAgcmV0dXJuO1xyXG4gICAgICAgICAgfVxyXG4gICAgICAgICAgZS5wcmV2ZW50RGVmYXVsdCgpO1xyXG4gICAgICAgICAga2V5c1tlLmtleUNvZGVdID0gZmFsc2U7XHJcbiAgICAgICAgICB2YXIgc2hvdWxkTW92ZSA9IHR5cGVvZiBvcHRpb25zKCkubW92ZVNlbGVjdGVkQW5jaG9yc09uS2V5RXZlbnRzID09PSAnZnVuY3Rpb24nXHJcbiAgICAgICAgICAgICAgPyBvcHRpb25zKCkubW92ZVNlbGVjdGVkQW5jaG9yc09uS2V5RXZlbnRzKCkgOiBvcHRpb25zKCkubW92ZVNlbGVjdGVkQW5jaG9yc09uS2V5RXZlbnRzO1xyXG5cclxuICAgICAgICAgIGlmICghc2hvdWxkTW92ZSkge1xyXG4gICAgICAgICAgICAgIHJldHVybjtcclxuICAgICAgICAgIH1cclxuXHJcbiAgICAgICAgICBjeS50cmlnZ2VyKFwiZWRnZWVkaXRpbmcubW92ZWVuZFwiLCBbc2VsZWN0ZWRFZGdlc10pO1xyXG4gICAgICAgICAgc2VsZWN0ZWRFZGdlcyA9IHVuZGVmaW5lZDtcclxuICAgICAgICAgIGFuY2hvcnNNb3ZpbmcgPSBmYWxzZTtcclxuXHJcbiAgICAgIH1cclxuICAgICAgZG9jdW1lbnQuYWRkRXZlbnRMaXN0ZW5lcihcImtleWRvd25cIixrZXlEb3duLCB0cnVlKTtcclxuICAgICAgZG9jdW1lbnQuYWRkRXZlbnRMaXN0ZW5lcihcImtleXVwXCIsa2V5VXAsIHRydWUpO1xyXG5cclxuICAgICAgJGNvbnRhaW5lci5kYXRhKCdjeWVkZ2VlZGl0aW5nJywgZGF0YSk7XHJcbiAgICB9LFxyXG4gICAgdW5iaW5kOiBmdW5jdGlvbiAoKSB7XHJcbiAgICAgICAgY3kub2ZmKCdyZW1vdmUnLCAnbm9kZScsIGVSZW1vdmUpXHJcbiAgICAgICAgICAub2ZmKCdhZGQnLCAnbm9kZScsIGVBZGQpXHJcbiAgICAgICAgICAub2ZmKCdzdHlsZScsICdlZGdlLmVkZ2ViZW5kZWRpdGluZy1oYXNiZW5kcG9pbnRzOnNlbGVjdGVkLCBlZGdlLmVkZ2Vjb250cm9sZWRpdGluZy1oYXNjb250cm9scG9pbnRzOnNlbGVjdGVkJywgZVN0eWxlKVxyXG4gICAgICAgICAgLm9mZignc2VsZWN0JywgJ2VkZ2UnLCBlU2VsZWN0KVxyXG4gICAgICAgICAgLm9mZigndW5zZWxlY3QnLCAnZWRnZScsIGVVbnNlbGVjdClcclxuICAgICAgICAgIC5vZmYoJ3RhcHN0YXJ0JywgZVRhcFN0YXJ0KVxyXG4gICAgICAgICAgLm9mZigndGFwc3RhcnQnLCAnZWRnZScsIGVUYXBTdGFydE9uRWRnZSlcclxuICAgICAgICAgIC5vZmYoJ3RhcGRyYWcnLCBlVGFwRHJhZylcclxuICAgICAgICAgIC5vZmYoJ3RhcGVuZCcsIGVUYXBFbmQpXHJcbiAgICAgICAgICAub2ZmKCdjeHR0YXAnLCBlQ3h0VGFwKVxyXG4gICAgICAgICAgLm9mZignZHJhZycsICdub2RlJyxlRHJhZyk7XHJcblxyXG4gICAgICAgIGN5LnVuYmluZChcInpvb20gcGFuXCIsIGVab29tKTtcclxuICAgIH1cclxuICB9O1xyXG5cclxuICBpZiAoZnVuY3Rpb25zW2ZuXSkge1xyXG4gICAgcmV0dXJuIGZ1bmN0aW9uc1tmbl0uYXBwbHkoJChjeS5jb250YWluZXIoKSksIEFycmF5LnByb3RvdHlwZS5zbGljZS5jYWxsKGFyZ3VtZW50cywgMSkpO1xyXG4gIH0gZWxzZSBpZiAodHlwZW9mIGZuID09ICdvYmplY3QnIHx8ICFmbikge1xyXG4gICAgcmV0dXJuIGZ1bmN0aW9ucy5pbml0LmFwcGx5KCQoY3kuY29udGFpbmVyKCkpLCBhcmd1bWVudHMpO1xyXG4gIH0gZWxzZSB7XHJcbiAgICAkLmVycm9yKCdObyBzdWNoIGZ1bmN0aW9uIGAnICsgZm4gKyAnYCBmb3IgY3l0b3NjYXBlLmpzLWVkZ2UtZWRpdGluZycpO1xyXG4gIH1cclxuXHJcbiAgcmV0dXJuICQodGhpcyk7XHJcbn07XHJcbiIsInZhciBkZWJvdW5jZSA9IChmdW5jdGlvbiAoKSB7XHJcbiAgLyoqXHJcbiAgICogbG9kYXNoIDMuMS4xIChDdXN0b20gQnVpbGQpIDxodHRwczovL2xvZGFzaC5jb20vPlxyXG4gICAqIEJ1aWxkOiBgbG9kYXNoIG1vZGVybiBtb2R1bGFyaXplIGV4cG9ydHM9XCJucG1cIiAtbyAuL2BcclxuICAgKiBDb3B5cmlnaHQgMjAxMi0yMDE1IFRoZSBEb2pvIEZvdW5kYXRpb24gPGh0dHA6Ly9kb2pvZm91bmRhdGlvbi5vcmcvPlxyXG4gICAqIEJhc2VkIG9uIFVuZGVyc2NvcmUuanMgMS44LjMgPGh0dHA6Ly91bmRlcnNjb3JlanMub3JnL0xJQ0VOU0U+XHJcbiAgICogQ29weXJpZ2h0IDIwMDktMjAxNSBKZXJlbXkgQXNoa2VuYXMsIERvY3VtZW50Q2xvdWQgYW5kIEludmVzdGlnYXRpdmUgUmVwb3J0ZXJzICYgRWRpdG9yc1xyXG4gICAqIEF2YWlsYWJsZSB1bmRlciBNSVQgbGljZW5zZSA8aHR0cHM6Ly9sb2Rhc2guY29tL2xpY2Vuc2U+XHJcbiAgICovXHJcbiAgLyoqIFVzZWQgYXMgdGhlIGBUeXBlRXJyb3JgIG1lc3NhZ2UgZm9yIFwiRnVuY3Rpb25zXCIgbWV0aG9kcy4gKi9cclxuICB2YXIgRlVOQ19FUlJPUl9URVhUID0gJ0V4cGVjdGVkIGEgZnVuY3Rpb24nO1xyXG5cclxuICAvKiBOYXRpdmUgbWV0aG9kIHJlZmVyZW5jZXMgZm9yIHRob3NlIHdpdGggdGhlIHNhbWUgbmFtZSBhcyBvdGhlciBgbG9kYXNoYCBtZXRob2RzLiAqL1xyXG4gIHZhciBuYXRpdmVNYXggPSBNYXRoLm1heCxcclxuICAgICAgICAgIG5hdGl2ZU5vdyA9IERhdGUubm93O1xyXG5cclxuICAvKipcclxuICAgKiBHZXRzIHRoZSBudW1iZXIgb2YgbWlsbGlzZWNvbmRzIHRoYXQgaGF2ZSBlbGFwc2VkIHNpbmNlIHRoZSBVbml4IGVwb2NoXHJcbiAgICogKDEgSmFudWFyeSAxOTcwIDAwOjAwOjAwIFVUQykuXHJcbiAgICpcclxuICAgKiBAc3RhdGljXHJcbiAgICogQG1lbWJlck9mIF9cclxuICAgKiBAY2F0ZWdvcnkgRGF0ZVxyXG4gICAqIEBleGFtcGxlXHJcbiAgICpcclxuICAgKiBfLmRlZmVyKGZ1bmN0aW9uKHN0YW1wKSB7XHJcbiAgICogICBjb25zb2xlLmxvZyhfLm5vdygpIC0gc3RhbXApO1xyXG4gICAqIH0sIF8ubm93KCkpO1xyXG4gICAqIC8vID0+IGxvZ3MgdGhlIG51bWJlciBvZiBtaWxsaXNlY29uZHMgaXQgdG9vayBmb3IgdGhlIGRlZmVycmVkIGZ1bmN0aW9uIHRvIGJlIGludm9rZWRcclxuICAgKi9cclxuICB2YXIgbm93ID0gbmF0aXZlTm93IHx8IGZ1bmN0aW9uICgpIHtcclxuICAgIHJldHVybiBuZXcgRGF0ZSgpLmdldFRpbWUoKTtcclxuICB9O1xyXG5cclxuICAvKipcclxuICAgKiBDcmVhdGVzIGEgZGVib3VuY2VkIGZ1bmN0aW9uIHRoYXQgZGVsYXlzIGludm9raW5nIGBmdW5jYCB1bnRpbCBhZnRlciBgd2FpdGBcclxuICAgKiBtaWxsaXNlY29uZHMgaGF2ZSBlbGFwc2VkIHNpbmNlIHRoZSBsYXN0IHRpbWUgdGhlIGRlYm91bmNlZCBmdW5jdGlvbiB3YXNcclxuICAgKiBpbnZva2VkLiBUaGUgZGVib3VuY2VkIGZ1bmN0aW9uIGNvbWVzIHdpdGggYSBgY2FuY2VsYCBtZXRob2QgdG8gY2FuY2VsXHJcbiAgICogZGVsYXllZCBpbnZvY2F0aW9ucy4gUHJvdmlkZSBhbiBvcHRpb25zIG9iamVjdCB0byBpbmRpY2F0ZSB0aGF0IGBmdW5jYFxyXG4gICAqIHNob3VsZCBiZSBpbnZva2VkIG9uIHRoZSBsZWFkaW5nIGFuZC9vciB0cmFpbGluZyBlZGdlIG9mIHRoZSBgd2FpdGAgdGltZW91dC5cclxuICAgKiBTdWJzZXF1ZW50IGNhbGxzIHRvIHRoZSBkZWJvdW5jZWQgZnVuY3Rpb24gcmV0dXJuIHRoZSByZXN1bHQgb2YgdGhlIGxhc3RcclxuICAgKiBgZnVuY2AgaW52b2NhdGlvbi5cclxuICAgKlxyXG4gICAqICoqTm90ZToqKiBJZiBgbGVhZGluZ2AgYW5kIGB0cmFpbGluZ2Agb3B0aW9ucyBhcmUgYHRydWVgLCBgZnVuY2AgaXMgaW52b2tlZFxyXG4gICAqIG9uIHRoZSB0cmFpbGluZyBlZGdlIG9mIHRoZSB0aW1lb3V0IG9ubHkgaWYgdGhlIHRoZSBkZWJvdW5jZWQgZnVuY3Rpb24gaXNcclxuICAgKiBpbnZva2VkIG1vcmUgdGhhbiBvbmNlIGR1cmluZyB0aGUgYHdhaXRgIHRpbWVvdXQuXHJcbiAgICpcclxuICAgKiBTZWUgW0RhdmlkIENvcmJhY2hvJ3MgYXJ0aWNsZV0oaHR0cDovL2RydXBhbG1vdGlvbi5jb20vYXJ0aWNsZS9kZWJvdW5jZS1hbmQtdGhyb3R0bGUtdmlzdWFsLWV4cGxhbmF0aW9uKVxyXG4gICAqIGZvciBkZXRhaWxzIG92ZXIgdGhlIGRpZmZlcmVuY2VzIGJldHdlZW4gYF8uZGVib3VuY2VgIGFuZCBgXy50aHJvdHRsZWAuXHJcbiAgICpcclxuICAgKiBAc3RhdGljXHJcbiAgICogQG1lbWJlck9mIF9cclxuICAgKiBAY2F0ZWdvcnkgRnVuY3Rpb25cclxuICAgKiBAcGFyYW0ge0Z1bmN0aW9ufSBmdW5jIFRoZSBmdW5jdGlvbiB0byBkZWJvdW5jZS5cclxuICAgKiBAcGFyYW0ge251bWJlcn0gW3dhaXQ9MF0gVGhlIG51bWJlciBvZiBtaWxsaXNlY29uZHMgdG8gZGVsYXkuXHJcbiAgICogQHBhcmFtIHtPYmplY3R9IFtvcHRpb25zXSBUaGUgb3B0aW9ucyBvYmplY3QuXHJcbiAgICogQHBhcmFtIHtib29sZWFufSBbb3B0aW9ucy5sZWFkaW5nPWZhbHNlXSBTcGVjaWZ5IGludm9raW5nIG9uIHRoZSBsZWFkaW5nXHJcbiAgICogIGVkZ2Ugb2YgdGhlIHRpbWVvdXQuXHJcbiAgICogQHBhcmFtIHtudW1iZXJ9IFtvcHRpb25zLm1heFdhaXRdIFRoZSBtYXhpbXVtIHRpbWUgYGZ1bmNgIGlzIGFsbG93ZWQgdG8gYmVcclxuICAgKiAgZGVsYXllZCBiZWZvcmUgaXQncyBpbnZva2VkLlxyXG4gICAqIEBwYXJhbSB7Ym9vbGVhbn0gW29wdGlvbnMudHJhaWxpbmc9dHJ1ZV0gU3BlY2lmeSBpbnZva2luZyBvbiB0aGUgdHJhaWxpbmdcclxuICAgKiAgZWRnZSBvZiB0aGUgdGltZW91dC5cclxuICAgKiBAcmV0dXJucyB7RnVuY3Rpb259IFJldHVybnMgdGhlIG5ldyBkZWJvdW5jZWQgZnVuY3Rpb24uXHJcbiAgICogQGV4YW1wbGVcclxuICAgKlxyXG4gICAqIC8vIGF2b2lkIGNvc3RseSBjYWxjdWxhdGlvbnMgd2hpbGUgdGhlIHdpbmRvdyBzaXplIGlzIGluIGZsdXhcclxuICAgKiBqUXVlcnkod2luZG93KS5vbigncmVzaXplJywgXy5kZWJvdW5jZShjYWxjdWxhdGVMYXlvdXQsIDE1MCkpO1xyXG4gICAqXHJcbiAgICogLy8gaW52b2tlIGBzZW5kTWFpbGAgd2hlbiB0aGUgY2xpY2sgZXZlbnQgaXMgZmlyZWQsIGRlYm91bmNpbmcgc3Vic2VxdWVudCBjYWxsc1xyXG4gICAqIGpRdWVyeSgnI3Bvc3Rib3gnKS5vbignY2xpY2snLCBfLmRlYm91bmNlKHNlbmRNYWlsLCAzMDAsIHtcclxuICAgKiAgICdsZWFkaW5nJzogdHJ1ZSxcclxuICAgKiAgICd0cmFpbGluZyc6IGZhbHNlXHJcbiAgICogfSkpO1xyXG4gICAqXHJcbiAgICogLy8gZW5zdXJlIGBiYXRjaExvZ2AgaXMgaW52b2tlZCBvbmNlIGFmdGVyIDEgc2Vjb25kIG9mIGRlYm91bmNlZCBjYWxsc1xyXG4gICAqIHZhciBzb3VyY2UgPSBuZXcgRXZlbnRTb3VyY2UoJy9zdHJlYW0nKTtcclxuICAgKiBqUXVlcnkoc291cmNlKS5vbignbWVzc2FnZScsIF8uZGVib3VuY2UoYmF0Y2hMb2csIDI1MCwge1xyXG4gICAqICAgJ21heFdhaXQnOiAxMDAwXHJcbiAgICogfSkpO1xyXG4gICAqXHJcbiAgICogLy8gY2FuY2VsIGEgZGVib3VuY2VkIGNhbGxcclxuICAgKiB2YXIgdG9kb0NoYW5nZXMgPSBfLmRlYm91bmNlKGJhdGNoTG9nLCAxMDAwKTtcclxuICAgKiBPYmplY3Qub2JzZXJ2ZShtb2RlbHMudG9kbywgdG9kb0NoYW5nZXMpO1xyXG4gICAqXHJcbiAgICogT2JqZWN0Lm9ic2VydmUobW9kZWxzLCBmdW5jdGlvbihjaGFuZ2VzKSB7XHJcbiAgICogICBpZiAoXy5maW5kKGNoYW5nZXMsIHsgJ3VzZXInOiAndG9kbycsICd0eXBlJzogJ2RlbGV0ZSd9KSkge1xyXG4gICAqICAgICB0b2RvQ2hhbmdlcy5jYW5jZWwoKTtcclxuICAgKiAgIH1cclxuICAgKiB9LCBbJ2RlbGV0ZSddKTtcclxuICAgKlxyXG4gICAqIC8vIC4uLmF0IHNvbWUgcG9pbnQgYG1vZGVscy50b2RvYCBpcyBjaGFuZ2VkXHJcbiAgICogbW9kZWxzLnRvZG8uY29tcGxldGVkID0gdHJ1ZTtcclxuICAgKlxyXG4gICAqIC8vIC4uLmJlZm9yZSAxIHNlY29uZCBoYXMgcGFzc2VkIGBtb2RlbHMudG9kb2AgaXMgZGVsZXRlZFxyXG4gICAqIC8vIHdoaWNoIGNhbmNlbHMgdGhlIGRlYm91bmNlZCBgdG9kb0NoYW5nZXNgIGNhbGxcclxuICAgKiBkZWxldGUgbW9kZWxzLnRvZG87XHJcbiAgICovXHJcbiAgZnVuY3Rpb24gZGVib3VuY2UoZnVuYywgd2FpdCwgb3B0aW9ucykge1xyXG4gICAgdmFyIGFyZ3MsXHJcbiAgICAgICAgICAgIG1heFRpbWVvdXRJZCxcclxuICAgICAgICAgICAgcmVzdWx0LFxyXG4gICAgICAgICAgICBzdGFtcCxcclxuICAgICAgICAgICAgdGhpc0FyZyxcclxuICAgICAgICAgICAgdGltZW91dElkLFxyXG4gICAgICAgICAgICB0cmFpbGluZ0NhbGwsXHJcbiAgICAgICAgICAgIGxhc3RDYWxsZWQgPSAwLFxyXG4gICAgICAgICAgICBtYXhXYWl0ID0gZmFsc2UsXHJcbiAgICAgICAgICAgIHRyYWlsaW5nID0gdHJ1ZTtcclxuXHJcbiAgICBpZiAodHlwZW9mIGZ1bmMgIT0gJ2Z1bmN0aW9uJykge1xyXG4gICAgICB0aHJvdyBuZXcgVHlwZUVycm9yKEZVTkNfRVJST1JfVEVYVCk7XHJcbiAgICB9XHJcbiAgICB3YWl0ID0gd2FpdCA8IDAgPyAwIDogKCt3YWl0IHx8IDApO1xyXG4gICAgaWYgKG9wdGlvbnMgPT09IHRydWUpIHtcclxuICAgICAgdmFyIGxlYWRpbmcgPSB0cnVlO1xyXG4gICAgICB0cmFpbGluZyA9IGZhbHNlO1xyXG4gICAgfSBlbHNlIGlmIChpc09iamVjdChvcHRpb25zKSkge1xyXG4gICAgICBsZWFkaW5nID0gISFvcHRpb25zLmxlYWRpbmc7XHJcbiAgICAgIG1heFdhaXQgPSAnbWF4V2FpdCcgaW4gb3B0aW9ucyAmJiBuYXRpdmVNYXgoK29wdGlvbnMubWF4V2FpdCB8fCAwLCB3YWl0KTtcclxuICAgICAgdHJhaWxpbmcgPSAndHJhaWxpbmcnIGluIG9wdGlvbnMgPyAhIW9wdGlvbnMudHJhaWxpbmcgOiB0cmFpbGluZztcclxuICAgIH1cclxuXHJcbiAgICBmdW5jdGlvbiBjYW5jZWwoKSB7XHJcbiAgICAgIGlmICh0aW1lb3V0SWQpIHtcclxuICAgICAgICBjbGVhclRpbWVvdXQodGltZW91dElkKTtcclxuICAgICAgfVxyXG4gICAgICBpZiAobWF4VGltZW91dElkKSB7XHJcbiAgICAgICAgY2xlYXJUaW1lb3V0KG1heFRpbWVvdXRJZCk7XHJcbiAgICAgIH1cclxuICAgICAgbGFzdENhbGxlZCA9IDA7XHJcbiAgICAgIG1heFRpbWVvdXRJZCA9IHRpbWVvdXRJZCA9IHRyYWlsaW5nQ2FsbCA9IHVuZGVmaW5lZDtcclxuICAgIH1cclxuXHJcbiAgICBmdW5jdGlvbiBjb21wbGV0ZShpc0NhbGxlZCwgaWQpIHtcclxuICAgICAgaWYgKGlkKSB7XHJcbiAgICAgICAgY2xlYXJUaW1lb3V0KGlkKTtcclxuICAgICAgfVxyXG4gICAgICBtYXhUaW1lb3V0SWQgPSB0aW1lb3V0SWQgPSB0cmFpbGluZ0NhbGwgPSB1bmRlZmluZWQ7XHJcbiAgICAgIGlmIChpc0NhbGxlZCkge1xyXG4gICAgICAgIGxhc3RDYWxsZWQgPSBub3coKTtcclxuICAgICAgICByZXN1bHQgPSBmdW5jLmFwcGx5KHRoaXNBcmcsIGFyZ3MpO1xyXG4gICAgICAgIGlmICghdGltZW91dElkICYmICFtYXhUaW1lb3V0SWQpIHtcclxuICAgICAgICAgIGFyZ3MgPSB0aGlzQXJnID0gdW5kZWZpbmVkO1xyXG4gICAgICAgIH1cclxuICAgICAgfVxyXG4gICAgfVxyXG5cclxuICAgIGZ1bmN0aW9uIGRlbGF5ZWQoKSB7XHJcbiAgICAgIHZhciByZW1haW5pbmcgPSB3YWl0IC0gKG5vdygpIC0gc3RhbXApO1xyXG4gICAgICBpZiAocmVtYWluaW5nIDw9IDAgfHwgcmVtYWluaW5nID4gd2FpdCkge1xyXG4gICAgICAgIGNvbXBsZXRlKHRyYWlsaW5nQ2FsbCwgbWF4VGltZW91dElkKTtcclxuICAgICAgfSBlbHNlIHtcclxuICAgICAgICB0aW1lb3V0SWQgPSBzZXRUaW1lb3V0KGRlbGF5ZWQsIHJlbWFpbmluZyk7XHJcbiAgICAgIH1cclxuICAgIH1cclxuXHJcbiAgICBmdW5jdGlvbiBtYXhEZWxheWVkKCkge1xyXG4gICAgICBjb21wbGV0ZSh0cmFpbGluZywgdGltZW91dElkKTtcclxuICAgIH1cclxuXHJcbiAgICBmdW5jdGlvbiBkZWJvdW5jZWQoKSB7XHJcbiAgICAgIGFyZ3MgPSBhcmd1bWVudHM7XHJcbiAgICAgIHN0YW1wID0gbm93KCk7XHJcbiAgICAgIHRoaXNBcmcgPSB0aGlzO1xyXG4gICAgICB0cmFpbGluZ0NhbGwgPSB0cmFpbGluZyAmJiAodGltZW91dElkIHx8ICFsZWFkaW5nKTtcclxuXHJcbiAgICAgIGlmIChtYXhXYWl0ID09PSBmYWxzZSkge1xyXG4gICAgICAgIHZhciBsZWFkaW5nQ2FsbCA9IGxlYWRpbmcgJiYgIXRpbWVvdXRJZDtcclxuICAgICAgfSBlbHNlIHtcclxuICAgICAgICBpZiAoIW1heFRpbWVvdXRJZCAmJiAhbGVhZGluZykge1xyXG4gICAgICAgICAgbGFzdENhbGxlZCA9IHN0YW1wO1xyXG4gICAgICAgIH1cclxuICAgICAgICB2YXIgcmVtYWluaW5nID0gbWF4V2FpdCAtIChzdGFtcCAtIGxhc3RDYWxsZWQpLFxyXG4gICAgICAgICAgICAgICAgaXNDYWxsZWQgPSByZW1haW5pbmcgPD0gMCB8fCByZW1haW5pbmcgPiBtYXhXYWl0O1xyXG5cclxuICAgICAgICBpZiAoaXNDYWxsZWQpIHtcclxuICAgICAgICAgIGlmIChtYXhUaW1lb3V0SWQpIHtcclxuICAgICAgICAgICAgbWF4VGltZW91dElkID0gY2xlYXJUaW1lb3V0KG1heFRpbWVvdXRJZCk7XHJcbiAgICAgICAgICB9XHJcbiAgICAgICAgICBsYXN0Q2FsbGVkID0gc3RhbXA7XHJcbiAgICAgICAgICByZXN1bHQgPSBmdW5jLmFwcGx5KHRoaXNBcmcsIGFyZ3MpO1xyXG4gICAgICAgIH1cclxuICAgICAgICBlbHNlIGlmICghbWF4VGltZW91dElkKSB7XHJcbiAgICAgICAgICBtYXhUaW1lb3V0SWQgPSBzZXRUaW1lb3V0KG1heERlbGF5ZWQsIHJlbWFpbmluZyk7XHJcbiAgICAgICAgfVxyXG4gICAgICB9XHJcbiAgICAgIGlmIChpc0NhbGxlZCAmJiB0aW1lb3V0SWQpIHtcclxuICAgICAgICB0aW1lb3V0SWQgPSBjbGVhclRpbWVvdXQodGltZW91dElkKTtcclxuICAgICAgfVxyXG4gICAgICBlbHNlIGlmICghdGltZW91dElkICYmIHdhaXQgIT09IG1heFdhaXQpIHtcclxuICAgICAgICB0aW1lb3V0SWQgPSBzZXRUaW1lb3V0KGRlbGF5ZWQsIHdhaXQpO1xyXG4gICAgICB9XHJcbiAgICAgIGlmIChsZWFkaW5nQ2FsbCkge1xyXG4gICAgICAgIGlzQ2FsbGVkID0gdHJ1ZTtcclxuICAgICAgICByZXN1bHQgPSBmdW5jLmFwcGx5KHRoaXNBcmcsIGFyZ3MpO1xyXG4gICAgICB9XHJcbiAgICAgIGlmIChpc0NhbGxlZCAmJiAhdGltZW91dElkICYmICFtYXhUaW1lb3V0SWQpIHtcclxuICAgICAgICBhcmdzID0gdGhpc0FyZyA9IHVuZGVmaW5lZDtcclxuICAgICAgfVxyXG4gICAgICByZXR1cm4gcmVzdWx0O1xyXG4gICAgfVxyXG5cclxuICAgIGRlYm91bmNlZC5jYW5jZWwgPSBjYW5jZWw7XHJcbiAgICByZXR1cm4gZGVib3VuY2VkO1xyXG4gIH1cclxuXHJcbiAgLyoqXHJcbiAgICogQ2hlY2tzIGlmIGB2YWx1ZWAgaXMgdGhlIFtsYW5ndWFnZSB0eXBlXShodHRwczovL2VzNS5naXRodWIuaW8vI3g4KSBvZiBgT2JqZWN0YC5cclxuICAgKiAoZS5nLiBhcnJheXMsIGZ1bmN0aW9ucywgb2JqZWN0cywgcmVnZXhlcywgYG5ldyBOdW1iZXIoMClgLCBhbmQgYG5ldyBTdHJpbmcoJycpYClcclxuICAgKlxyXG4gICAqIEBzdGF0aWNcclxuICAgKiBAbWVtYmVyT2YgX1xyXG4gICAqIEBjYXRlZ29yeSBMYW5nXHJcbiAgICogQHBhcmFtIHsqfSB2YWx1ZSBUaGUgdmFsdWUgdG8gY2hlY2suXHJcbiAgICogQHJldHVybnMge2Jvb2xlYW59IFJldHVybnMgYHRydWVgIGlmIGB2YWx1ZWAgaXMgYW4gb2JqZWN0LCBlbHNlIGBmYWxzZWAuXHJcbiAgICogQGV4YW1wbGVcclxuICAgKlxyXG4gICAqIF8uaXNPYmplY3Qoe30pO1xyXG4gICAqIC8vID0+IHRydWVcclxuICAgKlxyXG4gICAqIF8uaXNPYmplY3QoWzEsIDIsIDNdKTtcclxuICAgKiAvLyA9PiB0cnVlXHJcbiAgICpcclxuICAgKiBfLmlzT2JqZWN0KDEpO1xyXG4gICAqIC8vID0+IGZhbHNlXHJcbiAgICovXHJcbiAgZnVuY3Rpb24gaXNPYmplY3QodmFsdWUpIHtcclxuICAgIC8vIEF2b2lkIGEgVjggSklUIGJ1ZyBpbiBDaHJvbWUgMTktMjAuXHJcbiAgICAvLyBTZWUgaHR0cHM6Ly9jb2RlLmdvb2dsZS5jb20vcC92OC9pc3N1ZXMvZGV0YWlsP2lkPTIyOTEgZm9yIG1vcmUgZGV0YWlscy5cclxuICAgIHZhciB0eXBlID0gdHlwZW9mIHZhbHVlO1xyXG4gICAgcmV0dXJuICEhdmFsdWUgJiYgKHR5cGUgPT0gJ29iamVjdCcgfHwgdHlwZSA9PSAnZnVuY3Rpb24nKTtcclxuICB9XHJcblxyXG4gIHJldHVybiBkZWJvdW5jZTtcclxuXHJcbn0pKCk7XHJcblxyXG5tb2R1bGUuZXhwb3J0cyA9IGRlYm91bmNlOyIsIjsoZnVuY3Rpb24oKXsgJ3VzZSBzdHJpY3QnO1xyXG4gIFxyXG4gIHZhciBhbmNob3JQb2ludFV0aWxpdGllcyA9IHJlcXVpcmUoJy4vQW5jaG9yUG9pbnRVdGlsaXRpZXMnKTtcclxuICB2YXIgZGVib3VuY2UgPSByZXF1aXJlKFwiLi9kZWJvdW5jZVwiKTtcclxuICBcclxuICAvLyByZWdpc3RlcnMgdGhlIGV4dGVuc2lvbiBvbiBhIGN5dG9zY2FwZSBsaWIgcmVmXHJcbiAgdmFyIHJlZ2lzdGVyID0gZnVuY3Rpb24oIGN5dG9zY2FwZSwgJCwgS29udmEpe1xyXG4gICAgdmFyIHVpVXRpbGl0aWVzID0gcmVxdWlyZSgnLi9VSVV0aWxpdGllcycpO1xyXG4gICAgXHJcbiAgICBpZiggIWN5dG9zY2FwZSB8fCAhJCB8fCAhS29udmEpeyByZXR1cm47IH0gLy8gY2FuJ3QgcmVnaXN0ZXIgaWYgcmVxdWlyZWQgbGlicmFyaWVzIHVuc3BlY2lmaWVkXHJcblxyXG4gICAgdmFyIGRlZmF1bHRzID0ge1xyXG4gICAgICAvLyB0aGlzIGZ1bmN0aW9uIHNwZWNpZmllcyB0aGUgcG9pdGlvbnMgb2YgYmVuZCBwb2ludHNcclxuICAgICAgLy8gc3RyaWN0bHkgbmFtZSB0aGUgcHJvcGVydHkgJ2JlbmRQb2ludFBvc2l0aW9ucycgZm9yIHRoZSBlZGdlIHRvIGJlIGRldGVjdGVkIGZvciBiZW5kIHBvaW50IGVkaXRpdG5nXHJcbiAgICAgIGJlbmRQb3NpdGlvbnNGdW5jdGlvbjogZnVuY3Rpb24oZWxlKSB7XHJcbiAgICAgICAgcmV0dXJuIGVsZS5kYXRhKCdiZW5kUG9pbnRQb3NpdGlvbnMnKTtcclxuICAgICAgfSxcclxuICAgICAgLy8gdGhpcyBmdW5jdGlvbiBzcGVjaWZpZXMgdGhlIHBvaXRpb25zIG9mIGNvbnRyb2wgcG9pbnRzXHJcbiAgICAgIC8vIHN0cmljdGx5IG5hbWUgdGhlIHByb3BlcnR5ICdjb250cm9sUG9pbnRQb3NpdGlvbnMnIGZvciB0aGUgZWRnZSB0byBiZSBkZXRlY3RlZCBmb3IgY29udHJvbCBwb2ludCBlZGl0aXRuZ1xyXG4gICAgICBjb250cm9sUG9zaXRpb25zRnVuY3Rpb246IGZ1bmN0aW9uKGVsZSkge1xyXG4gICAgICAgIHJldHVybiBlbGUuZGF0YSgnY29udHJvbFBvaW50UG9zaXRpb25zJyk7XHJcbiAgICAgIH0sXHJcbiAgICAgIC8vIHdoZXRoZXIgdG8gaW5pdGlsaXplIGJlbmQgYW5kIGNvbnRyb2wgcG9pbnRzIG9uIGNyZWF0aW9uIG9mIHRoaXMgZXh0ZW5zaW9uIGF1dG9tYXRpY2FsbHlcclxuICAgICAgaW5pdEFuY2hvcnNBdXRvbWF0aWNhbGx5OiB0cnVlLFxyXG4gICAgICAvLyB0aGUgY2xhc3NlcyBvZiB0aG9zZSBlZGdlcyB0aGF0IHNob3VsZCBiZSBpZ25vcmVkXHJcbiAgICAgIGlnbm9yZWRDbGFzc2VzOiBbXSxcclxuICAgICAgLy8gd2hldGhlciB0aGUgYmVuZCBhbmQgY29udHJvbCBlZGl0aW5nIG9wZXJhdGlvbnMgYXJlIHVuZG9hYmxlIChyZXF1aXJlcyBjeXRvc2NhcGUtdW5kby1yZWRvLmpzKVxyXG4gICAgICB1bmRvYWJsZTogZmFsc2UsXHJcbiAgICAgIC8vIHRoZSBzaXplIG9mIGJlbmQgYW5kIGNvbnRyb2wgcG9pbnQgc2hhcGUgaXMgb2J0YWluZWQgYnkgbXVsdGlwbGluZyB3aWR0aCBvZiBlZGdlIHdpdGggdGhpcyBwYXJhbWV0ZXJcclxuICAgICAgYW5jaG9yU2hhcGVTaXplRmFjdG9yOiAzLFxyXG4gICAgICAvLyB6LWluZGV4IHZhbHVlIG9mIHRoZSBjYW52YXMgaW4gd2hpY2ggYmVuZCBhbmQgY29udHJvbCBwb2ludHMgYXJlIGRyYXduXHJcbiAgICAgIHpJbmRleDogOTk5LCAgICAgIFxyXG4gICAgICAvLyB3aGV0aGVyIHRvIHN0YXJ0IHRoZSBwbHVnaW4gaW4gdGhlIGVuYWJsZWQgc3RhdGVcclxuICAgICAgZW5hYmxlZDogdHJ1ZSxcclxuICAgICAgLy9BbiBvcHRpb24gdGhhdCBjb250cm9scyB0aGUgZGlzdGFuY2Ugd2l0aGluIHdoaWNoIGEgYmVuZCBwb2ludCBpcyBjb25zaWRlcmVkIFwibmVhclwiIHRoZSBsaW5lIHNlZ21lbnQgYmV0d2VlbiBpdHMgdHdvIG5laWdoYm9ycyBhbmQgd2lsbCBiZSBhdXRvbWF0aWNhbGx5IHJlbW92ZWRcclxuICAgICAgYmVuZFJlbW92YWxTZW5zaXRpdml0eSA6IDgsXHJcbiAgICAgIC8vIHRpdGxlIG9mIGFkZCBiZW5kIHBvaW50IG1lbnUgaXRlbSAoVXNlciBtYXkgbmVlZCB0byBhZGp1c3Qgd2lkdGggb2YgbWVudSBpdGVtcyBhY2NvcmRpbmcgdG8gbGVuZ3RoIG9mIHRoaXMgb3B0aW9uKVxyXG4gICAgICBhZGRCZW5kTWVudUl0ZW1UaXRsZTogXCJBZGQgQmVuZCBQb2ludFwiLFxyXG4gICAgICAvLyB0aXRsZSBvZiByZW1vdmUgYmVuZCBwb2ludCBtZW51IGl0ZW0gKFVzZXIgbWF5IG5lZWQgdG8gYWRqdXN0IHdpZHRoIG9mIG1lbnUgaXRlbXMgYWNjb3JkaW5nIHRvIGxlbmd0aCBvZiB0aGlzIG9wdGlvbilcclxuICAgICAgcmVtb3ZlQmVuZE1lbnVJdGVtVGl0bGU6IFwiUmVtb3ZlIEJlbmQgUG9pbnRcIixcclxuICAgICAgLy8gdGl0bGUgb2YgcmVtb3ZlIGFsbCBiZW5kIHBvaW50cyBtZW51IGl0ZW1cclxuICAgICAgcmVtb3ZlQWxsQmVuZE1lbnVJdGVtVGl0bGU6IFwiUmVtb3ZlIEFsbCBCZW5kIFBvaW50c1wiLFxyXG4gICAgICAvLyB0aXRsZSBvZiBhZGQgY29udHJvbCBwb2ludCBtZW51IGl0ZW0gKFVzZXIgbWF5IG5lZWQgdG8gYWRqdXN0IHdpZHRoIG9mIG1lbnUgaXRlbXMgYWNjb3JkaW5nIHRvIGxlbmd0aCBvZiB0aGlzIG9wdGlvbilcclxuICAgICAgYWRkQ29udHJvbE1lbnVJdGVtVGl0bGU6IFwiQWRkIENvbnRyb2wgUG9pbnRcIixcclxuICAgICAgLy8gdGl0bGUgb2YgcmVtb3ZlIGNvbnRyb2wgcG9pbnQgbWVudSBpdGVtIChVc2VyIG1heSBuZWVkIHRvIGFkanVzdCB3aWR0aCBvZiBtZW51IGl0ZW1zIGFjY29yZGluZyB0byBsZW5ndGggb2YgdGhpcyBvcHRpb24pXHJcbiAgICAgIHJlbW92ZUNvbnRyb2xNZW51SXRlbVRpdGxlOiBcIlJlbW92ZSBDb250cm9sIFBvaW50XCIsXHJcbiAgICAgIC8vIHRpdGxlIG9mIHJlbW92ZSBhbGwgY29udHJvbCBwb2ludHMgbWVudSBpdGVtXHJcbiAgICAgIHJlbW92ZUFsbENvbnRyb2xNZW51SXRlbVRpdGxlOiBcIlJlbW92ZSBBbGwgQ29udHJvbCBQb2ludHNcIixcclxuICAgICAgLy8gd2hldGhlciB0aGUgYmVuZCBhbmQgY29udHJvbCBwb2ludHMgY2FuIGJlIG1vdmVkIGJ5IGFycm93c1xyXG4gICAgICBtb3ZlU2VsZWN0ZWRBbmNob3JzT25LZXlFdmVudHM6IGZ1bmN0aW9uICgpIHtcclxuICAgICAgICAgIHJldHVybiB0cnVlO1xyXG4gICAgICB9LFxyXG4gICAgICAvLyB3aGV0aGVyICdSZW1vdmUgYWxsIGJlbmQgcG9pbnRzJyBhbmQgJ1JlbW92ZSBhbGwgY29udHJvbCBwb2ludHMnIG9wdGlvbnMgc2hvdWxkIGJlIHByZXNlbnRlZFxyXG4gICAgICBlbmFibGVNdWx0aXBsZUFuY2hvclJlbW92YWxPcHRpb246IGZhbHNlXHJcbiAgICB9O1xyXG4gICAgXHJcbiAgICB2YXIgb3B0aW9ucztcclxuICAgIHZhciBpbml0aWFsaXplZCA9IGZhbHNlO1xyXG4gICAgXHJcbiAgICAvLyBNZXJnZSBkZWZhdWx0IG9wdGlvbnMgd2l0aCB0aGUgb25lcyBjb21pbmcgZnJvbSBwYXJhbWV0ZXJcclxuICAgIGZ1bmN0aW9uIGV4dGVuZChkZWZhdWx0cywgb3B0aW9ucykge1xyXG4gICAgICB2YXIgb2JqID0ge307XHJcblxyXG4gICAgICBmb3IgKHZhciBpIGluIGRlZmF1bHRzKSB7XHJcbiAgICAgICAgb2JqW2ldID0gZGVmYXVsdHNbaV07XHJcbiAgICAgIH1cclxuXHJcbiAgICAgIGZvciAodmFyIGkgaW4gb3B0aW9ucykge1xyXG4gICAgICAgIC8vIFNQTElUIEZVTkNUSU9OQUxJVFk/XHJcbiAgICAgICAgaWYoaSA9PSBcImJlbmRSZW1vdmFsU2Vuc2l0aXZpdHlcIil7XHJcbiAgICAgICAgICB2YXIgdmFsdWUgPSBvcHRpb25zW2ldO1xyXG4gICAgICAgICAgIGlmKCFpc05hTih2YWx1ZSkpXHJcbiAgICAgICAgICAge1xyXG4gICAgICAgICAgICAgIGlmKHZhbHVlID49IDAgJiYgdmFsdWUgPD0gMjApe1xyXG4gICAgICAgICAgICAgICAgb2JqW2ldID0gb3B0aW9uc1tpXTtcclxuICAgICAgICAgICAgICB9ZWxzZSBpZih2YWx1ZSA8IDApe1xyXG4gICAgICAgICAgICAgICAgb2JqW2ldID0gMFxyXG4gICAgICAgICAgICAgIH1lbHNle1xyXG4gICAgICAgICAgICAgICAgb2JqW2ldID0gMjBcclxuICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgfVxyXG4gICAgICAgIH1lbHNle1xyXG4gICAgICAgICAgb2JqW2ldID0gb3B0aW9uc1tpXTtcclxuICAgICAgICB9XHJcblxyXG4gICAgICB9XHJcblxyXG4gICAgICByZXR1cm4gb2JqO1xyXG4gICAgfTtcclxuICAgIFxyXG4gICAgY3l0b3NjYXBlKCAnY29yZScsICdlZGdlRWRpdGluZycsIGZ1bmN0aW9uKG9wdHMpe1xyXG4gICAgICB2YXIgY3kgPSB0aGlzO1xyXG4gICAgICBcclxuICAgICAgaWYoIG9wdHMgPT09ICdpbml0aWFsaXplZCcgKSB7XHJcbiAgICAgICAgcmV0dXJuIGluaXRpYWxpemVkO1xyXG4gICAgICB9XHJcbiAgICAgIFxyXG4gICAgICBpZiggb3B0cyAhPT0gJ2dldCcgKSB7XHJcbiAgICAgICAgLy8gbWVyZ2UgdGhlIG9wdGlvbnMgd2l0aCBkZWZhdWx0IG9uZXNcclxuICAgICAgICBvcHRpb25zID0gZXh0ZW5kKGRlZmF1bHRzLCBvcHRzKTtcclxuICAgICAgICBpbml0aWFsaXplZCA9IHRydWU7XHJcblxyXG4gICAgICAgIC8vIGRlZmluZSBlZGdlYmVuZGVkaXRpbmctaGFzYmVuZHBvaW50cyBjc3MgY2xhc3NcclxuICAgICAgICBjeS5zdHlsZSgpLnNlbGVjdG9yKCcuZWRnZWJlbmRlZGl0aW5nLWhhc2JlbmRwb2ludHMnKS5jc3Moe1xyXG4gICAgICAgICAgJ2N1cnZlLXN0eWxlJzogJ3NlZ21lbnRzJyxcclxuICAgICAgICAgICdzZWdtZW50LWRpc3RhbmNlcyc6IGZ1bmN0aW9uIChlbGUpIHtcclxuICAgICAgICAgICAgcmV0dXJuIGFuY2hvclBvaW50VXRpbGl0aWVzLmdldERpc3RhbmNlc1N0cmluZyhlbGUsICdiZW5kJyk7XHJcbiAgICAgICAgICB9LFxyXG4gICAgICAgICAgJ3NlZ21lbnQtd2VpZ2h0cyc6IGZ1bmN0aW9uIChlbGUpIHtcclxuICAgICAgICAgICAgcmV0dXJuIGFuY2hvclBvaW50VXRpbGl0aWVzLmdldFdlaWdodHNTdHJpbmcoZWxlLCAnYmVuZCcpO1xyXG4gICAgICAgICAgfSxcclxuICAgICAgICAgICdlZGdlLWRpc3RhbmNlcyc6ICdub2RlLXBvc2l0aW9uJ1xyXG4gICAgICAgIH0pO1xyXG5cclxuICAgICAgICAvLyBkZWZpbmUgZWRnZWNvbnRyb2xlZGl0aW5nLWhhc2NvbnRyb2xwb2ludHMgY3NzIGNsYXNzXHJcbiAgICAgICAgY3kuc3R5bGUoKS5zZWxlY3RvcignLmVkZ2Vjb250cm9sZWRpdGluZy1oYXNjb250cm9scG9pbnRzJykuY3NzKHtcclxuICAgICAgICAgICdjdXJ2ZS1zdHlsZSc6ICd1bmJ1bmRsZWQtYmV6aWVyJyxcclxuICAgICAgICAgICdjb250cm9sLXBvaW50LWRpc3RhbmNlcyc6IGZ1bmN0aW9uIChlbGUpIHtcclxuICAgICAgICAgICAgcmV0dXJuIGFuY2hvclBvaW50VXRpbGl0aWVzLmdldERpc3RhbmNlc1N0cmluZyhlbGUsICdjb250cm9sJyk7XHJcbiAgICAgICAgICB9LFxyXG4gICAgICAgICAgJ2NvbnRyb2wtcG9pbnQtd2VpZ2h0cyc6IGZ1bmN0aW9uIChlbGUpIHtcclxuICAgICAgICAgICAgcmV0dXJuIGFuY2hvclBvaW50VXRpbGl0aWVzLmdldFdlaWdodHNTdHJpbmcoZWxlLCAnY29udHJvbCcpO1xyXG4gICAgICAgICAgfSxcclxuICAgICAgICAgICdlZGdlLWRpc3RhbmNlcyc6ICdub2RlLXBvc2l0aW9uJ1xyXG4gICAgICAgIH0pO1xyXG5cclxuICAgICAgICBhbmNob3JQb2ludFV0aWxpdGllcy5zZXRJZ25vcmVkQ2xhc3NlcyhvcHRpb25zLmlnbm9yZWRDbGFzc2VzKTtcclxuXHJcbiAgICAgICAgLy8gaW5pdCBiZW5kIHBvc2l0aW9ucyBjb25kaXRpb25hbGx5XHJcbiAgICAgICAgaWYgKG9wdGlvbnMuaW5pdEFuY2hvcnNBdXRvbWF0aWNhbGx5KSB7XHJcbiAgICAgICAgICAvLyBDSEVDSyBUSElTLCBvcHRpb25zLmlnbm9yZWRDbGFzc2VzIFVOVVNFRFxyXG4gICAgICAgICAgYW5jaG9yUG9pbnRVdGlsaXRpZXMuaW5pdEFuY2hvclBvaW50cyhvcHRpb25zLmJlbmRQb3NpdGlvbnNGdW5jdGlvbiwgb3B0aW9ucy5jb250cm9sUG9zaXRpb25zRnVuY3Rpb24sIGN5LmVkZ2VzKCksIG9wdGlvbnMuaWdub3JlZENsYXNzZXMpO1xyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgaWYob3B0aW9ucy5lbmFibGVkKVxyXG4gICAgICAgICAgdWlVdGlsaXRpZXMob3B0aW9ucywgY3kpO1xyXG4gICAgICAgIGVsc2VcclxuICAgICAgICAgIHVpVXRpbGl0aWVzKFwidW5iaW5kXCIsIGN5KTtcclxuICAgICAgfVxyXG4gICAgICBcclxuICAgICAgdmFyIGluc3RhbmNlID0gaW5pdGlhbGl6ZWQgPyB7XHJcbiAgICAgICAgLypcclxuICAgICAgICAqIGdldCBiZW5kIG9yIGNvbnRyb2wgcG9pbnRzIG9mIHRoZSBnaXZlbiBlZGdlIGluIGFuIGFycmF5IEEsXHJcbiAgICAgICAgKiBBWzIgKiBpXSBpcyB0aGUgeCBjb29yZGluYXRlIGFuZCBBWzIgKiBpICsgMV0gaXMgdGhlIHkgY29vcmRpbmF0ZVxyXG4gICAgICAgICogb2YgdGhlIGl0aCBiZW5kIHBvaW50LiAoUmV0dXJucyB1bmRlZmluZWQgaWYgdGhlIGN1cnZlIHN0eWxlIGlzIG5vdCBzZWdtZW50cyBub3IgdW5idW5kbGVkIGJlemllcilcclxuICAgICAgICAqL1xyXG4gICAgICAgIGdldEFuY2hvcnNBc0FycmF5OiBmdW5jdGlvbihlbGUpIHtcclxuICAgICAgICAgIHJldHVybiBhbmNob3JQb2ludFV0aWxpdGllcy5nZXRBbmNob3JzQXNBcnJheShlbGUpO1xyXG4gICAgICAgIH0sXHJcbiAgICAgICAgLy8gSW5pdGlsaXplIHBvaW50cyBmb3IgdGhlIGdpdmVuIGVkZ2VzIHVzaW5nICdvcHRpb25zLmJlbmRQb3NpdGlvbnNGdW5jdGlvbidcclxuICAgICAgICBpbml0QW5jaG9yUG9pbnRzOiBmdW5jdGlvbihlbGVzKSB7XHJcbiAgICAgICAgICBhbmNob3JQb2ludFV0aWxpdGllcy5pbml0QW5jaG9yUG9pbnRzKG9wdGlvbnMuYmVuZFBvc2l0aW9uc0Z1bmN0aW9uLCBvcHRpb25zLmNvbnRyb2xQb3NpdGlvbnNGdW5jdGlvbiwgZWxlcyk7XHJcbiAgICAgICAgfSxcclxuICAgICAgICBkZWxldGVTZWxlY3RlZEFuY2hvcjogZnVuY3Rpb24oZWxlLCBpbmRleCkge1xyXG4gICAgICAgICAgYW5jaG9yUG9pbnRVdGlsaXRpZXMucmVtb3ZlQW5jaG9yKGVsZSwgaW5kZXgpO1xyXG4gICAgICAgIH1cclxuICAgICAgfSA6IHVuZGVmaW5lZDtcclxuXHJcbiAgICAgIHJldHVybiBpbnN0YW5jZTsgLy8gY2hhaW5hYmlsaXR5XHJcbiAgICB9ICk7XHJcblxyXG4gIH07XHJcblxyXG4gIGlmKCB0eXBlb2YgbW9kdWxlICE9PSAndW5kZWZpbmVkJyAmJiBtb2R1bGUuZXhwb3J0cyApeyAvLyBleHBvc2UgYXMgYSBjb21tb25qcyBtb2R1bGVcclxuICAgIG1vZHVsZS5leHBvcnRzID0gcmVnaXN0ZXI7XHJcbiAgfVxyXG5cclxuICBpZiggdHlwZW9mIGRlZmluZSAhPT0gJ3VuZGVmaW5lZCcgJiYgZGVmaW5lLmFtZCApeyAvLyBleHBvc2UgYXMgYW4gYW1kL3JlcXVpcmVqcyBtb2R1bGVcclxuICAgIGRlZmluZSgnY3l0b3NjYXBlLWVkZ2UtZWRpdGluZycsIGZ1bmN0aW9uKCl7XHJcbiAgICAgIHJldHVybiByZWdpc3RlcjtcclxuICAgIH0pO1xyXG4gIH1cclxuXHJcbiAgaWYoIHR5cGVvZiBjeXRvc2NhcGUgIT09ICd1bmRlZmluZWQnICYmICQgJiYgS29udmEpeyAvLyBleHBvc2UgdG8gZ2xvYmFsIGN5dG9zY2FwZSAoaS5lLiB3aW5kb3cuY3l0b3NjYXBlKVxyXG4gICAgcmVnaXN0ZXIoIGN5dG9zY2FwZSwgJCwgS29udmEgKTtcclxuICB9XHJcblxyXG59KSgpO1xyXG4iLCJ2YXIgcmVjb25uZWN0aW9uVXRpbGl0aWVzID0ge1xyXG5cclxuICAgIC8vIGNyZWF0ZXMgYW5kIHJldHVybnMgYSBkdW1teSBub2RlIHdoaWNoIGlzIGNvbm5lY3RlZCB0byB0aGUgZGlzY29ubmVjdGVkIGVkZ2VcclxuICAgIGRpc2Nvbm5lY3RFZGdlOiBmdW5jdGlvbiAoZWRnZSwgY3ksIHBvc2l0aW9uLCBkaXNjb25uZWN0ZWRFbmQpIHtcclxuICAgICAgICBcclxuICAgICAgICB2YXIgZHVtbXlOb2RlID0ge1xyXG4gICAgICAgICAgICBkYXRhOiB7IFxyXG4gICAgICAgICAgICAgIGlkOiAnbnd0X3JlY29ubmVjdEVkZ2VfZHVtbXknLFxyXG4gICAgICAgICAgICAgIHBvcnRzOiBbXSxcclxuICAgICAgICAgICAgfSxcclxuICAgICAgICAgICAgc3R5bGU6IHtcclxuICAgICAgICAgICAgICB3aWR0aDogMSxcclxuICAgICAgICAgICAgICBoZWlnaHQ6IDEsXHJcbiAgICAgICAgICAgICAgJ3Zpc2liaWxpdHknOiAnaGlkZGVuJ1xyXG4gICAgICAgICAgICB9LFxyXG4gICAgICAgICAgICByZW5kZXJlZFBvc2l0aW9uOiBwb3NpdGlvblxyXG4gICAgICAgIH07XHJcbiAgICAgICAgY3kuYWRkKGR1bW15Tm9kZSk7XHJcblxyXG4gICAgICAgIHZhciBsb2MgPSAoZGlzY29ubmVjdGVkRW5kID09PSAnc291cmNlJykgPyBcclxuICAgICAgICAgICAge3NvdXJjZTogZHVtbXlOb2RlLmRhdGEuaWR9IDogXHJcbiAgICAgICAgICAgIHt0YXJnZXQ6IGR1bW15Tm9kZS5kYXRhLmlkfTtcclxuXHJcbiAgICAgICAgZWRnZSA9IGVkZ2UubW92ZShsb2MpWzBdO1xyXG5cclxuICAgICAgICByZXR1cm4ge1xyXG4gICAgICAgICAgICBkdW1teU5vZGU6IGN5Lm5vZGVzKFwiI1wiICsgZHVtbXlOb2RlLmRhdGEuaWQpWzBdLFxyXG4gICAgICAgICAgICBlZGdlOiBlZGdlXHJcbiAgICAgICAgfTtcclxuICAgIH0sXHJcblxyXG4gICAgY29ubmVjdEVkZ2U6IGZ1bmN0aW9uIChlZGdlLCBub2RlLCBsb2NhdGlvbikge1xyXG4gICAgICAgIGlmKCFlZGdlLmlzRWRnZSgpIHx8ICFub2RlLmlzTm9kZSgpKVxyXG4gICAgICAgICAgICByZXR1cm47XHJcblxyXG4gICAgICAgIHZhciBsb2MgPSB7fTtcclxuICAgICAgICBpZihsb2NhdGlvbiA9PT0gJ3NvdXJjZScpXHJcbiAgICAgICAgICAgIGxvYy5zb3VyY2UgPSBub2RlLmlkKCk7XHJcbiAgICAgICAgXHJcbiAgICAgICAgZWxzZSBpZihsb2NhdGlvbiA9PT0gJ3RhcmdldCcpXHJcbiAgICAgICAgICAgIGxvYy50YXJnZXQgPSBub2RlLmlkKCk7XHJcbiAgICAgICAgXHJcbiAgICAgICAgZWxzZVxyXG4gICAgICAgICAgICByZXR1cm47XHJcblxyXG4gICAgICAgIHJldHVybiBlZGdlLm1vdmUobG9jKVswXTtcclxuICAgIH0sXHJcblxyXG4gICAgY29weUVkZ2U6IGZ1bmN0aW9uIChvbGRFZGdlLCBuZXdFZGdlKSB7XHJcbiAgICAgICAgdGhpcy5jb3B5QW5jaG9ycyhvbGRFZGdlLCBuZXdFZGdlKTtcclxuICAgICAgICB0aGlzLmNvcHlTdHlsZShvbGRFZGdlLCBuZXdFZGdlKTtcclxuICAgIH0sXHJcblxyXG4gICAgY29weVN0eWxlOiBmdW5jdGlvbiAob2xkRWRnZSwgbmV3RWRnZSkge1xyXG4gICAgICAgIGlmKG9sZEVkZ2UgJiYgbmV3RWRnZSl7XHJcbiAgICAgICAgICAgIG5ld0VkZ2UuZGF0YSgnbGluZS1jb2xvcicsIG9sZEVkZ2UuZGF0YSgnbGluZS1jb2xvcicpKTtcclxuICAgICAgICAgICAgbmV3RWRnZS5kYXRhKCd3aWR0aCcsIG9sZEVkZ2UuZGF0YSgnd2lkdGgnKSk7XHJcbiAgICAgICAgICAgIG5ld0VkZ2UuZGF0YSgnY2FyZGluYWxpdHknLCBvbGRFZGdlLmRhdGEoJ2NhcmRpbmFsaXR5JykpO1xyXG4gICAgICAgIH1cclxuICAgIH0sXHJcblxyXG4gICAgY29weUFuY2hvcnM6IGZ1bmN0aW9uIChvbGRFZGdlLCBuZXdFZGdlKSB7XHJcbiAgICAgICAgaWYob2xkRWRnZS5oYXNDbGFzcygnZWRnZWJlbmRlZGl0aW5nLWhhc2JlbmRwb2ludHMnKSl7XHJcbiAgICAgICAgICAgIHZhciBicERpc3RhbmNlcyA9IG9sZEVkZ2UuZGF0YSgnY3llZGdlYmVuZGVkaXRpbmdEaXN0YW5jZXMnKTtcclxuICAgICAgICAgICAgdmFyIGJwV2VpZ2h0cyA9IG9sZEVkZ2UuZGF0YSgnY3llZGdlYmVuZGVkaXRpbmdXZWlnaHRzJyk7XHJcbiAgICAgICAgICAgIFxyXG4gICAgICAgICAgICBuZXdFZGdlLmRhdGEoJ2N5ZWRnZWJlbmRlZGl0aW5nRGlzdGFuY2VzJywgYnBEaXN0YW5jZXMpO1xyXG4gICAgICAgICAgICBuZXdFZGdlLmRhdGEoJ2N5ZWRnZWJlbmRlZGl0aW5nV2VpZ2h0cycsIGJwV2VpZ2h0cyk7XHJcbiAgICAgICAgICAgIG5ld0VkZ2UuYWRkQ2xhc3MoJ2VkZ2ViZW5kZWRpdGluZy1oYXNiZW5kcG9pbnRzJyk7XHJcbiAgICAgICAgfVxyXG4gICAgICAgIGVsc2UgaWYob2xkRWRnZS5oYXNDbGFzcygnZWRnZWNvbnRyb2xlZGl0aW5nLWhhc2NvbnRyb2xwb2ludHMnKSl7XHJcbiAgICAgICAgICAgIHZhciBicERpc3RhbmNlcyA9IG9sZEVkZ2UuZGF0YSgnY3llZGdlY29udHJvbGVkaXRpbmdEaXN0YW5jZXMnKTtcclxuICAgICAgICAgICAgdmFyIGJwV2VpZ2h0cyA9IG9sZEVkZ2UuZGF0YSgnY3llZGdlY29udHJvbGVkaXRpbmdXZWlnaHRzJyk7XHJcbiAgICAgICAgICAgIFxyXG4gICAgICAgICAgICBuZXdFZGdlLmRhdGEoJ2N5ZWRnZWNvbnRyb2xlZGl0aW5nRGlzdGFuY2VzJywgYnBEaXN0YW5jZXMpO1xyXG4gICAgICAgICAgICBuZXdFZGdlLmRhdGEoJ2N5ZWRnZWNvbnRyb2xlZGl0aW5nV2VpZ2h0cycsIGJwV2VpZ2h0cyk7XHJcbiAgICAgICAgICAgIG5ld0VkZ2UuYWRkQ2xhc3MoJ2VkZ2Vjb250cm9sZWRpdGluZy1oYXNjb250cm9scG9pbnRzJyk7XHJcbiAgICAgICAgfVxyXG4gICAgICAgIGlmIChvbGRFZGdlLmhhc0NsYXNzKCdlZGdlYmVuZGVkaXRpbmctaGFzbXVsdGlwbGViZW5kcG9pbnRzJykpIHtcclxuICAgICAgICAgICAgbmV3RWRnZS5hZGRDbGFzcygnZWRnZWJlbmRlZGl0aW5nLWhhc211bHRpcGxlYmVuZHBvaW50cycpO1xyXG4gICAgICAgIH1cclxuICAgICAgICBlbHNlIGlmIChvbGRFZGdlLmhhc0NsYXNzKCdlZGdlY29udHJvbGVkaXRpbmctaGFzbXVsdGlwbGVjb250cm9scG9pbnRzJykpIHtcclxuICAgICAgICAgICAgbmV3RWRnZS5hZGRDbGFzcygnZWRnZWNvbnRyb2xlZGl0aW5nLWhhc211bHRpcGxlY29udHJvbHBvaW50cycpO1xyXG4gICAgICAgIH1cclxuICAgIH0sXHJcbn07XHJcbiAgXHJcbm1vZHVsZS5leHBvcnRzID0gcmVjb25uZWN0aW9uVXRpbGl0aWVzO1xyXG4gICIsIm1vZHVsZS5leHBvcnRzID0gZnVuY3Rpb24gKGN5LCBhbmNob3JQb2ludFV0aWxpdGllcywgcGFyYW1zKSB7XHJcbiAgaWYgKGN5LnVuZG9SZWRvID09IG51bGwpXHJcbiAgICByZXR1cm47XHJcblxyXG4gIHZhciB1ciA9IGN5LnVuZG9SZWRvKHtcclxuICAgIGRlZmF1bHRBY3Rpb25zOiBmYWxzZSxcclxuICAgIGlzRGVidWc6IHRydWVcclxuICB9KTtcclxuXHJcbiAgZnVuY3Rpb24gY2hhbmdlQW5jaG9yUG9pbnRzKHBhcmFtKSB7XHJcbiAgICB2YXIgZWRnZSA9IGN5LmdldEVsZW1lbnRCeUlkKHBhcmFtLmVkZ2UuaWQoKSk7XHJcbiAgICB2YXIgdHlwZSA9IHBhcmFtLnR5cGUgIT09ICdpbmNvbmNsdXNpdmUnID8gcGFyYW0udHlwZSA6IGFuY2hvclBvaW50VXRpbGl0aWVzLmdldEVkZ2VUeXBlKGVkZ2UpO1xyXG4gICAgXHJcbiAgICB2YXIgd2VpZ2h0cywgZGlzdGFuY2VzLCB3ZWlnaHRTdHIsIGRpc3RhbmNlU3RyO1xyXG5cclxuICAgIGlmKHBhcmFtLnR5cGUgPT09ICdpbmNvbmNsdXNpdmUnICYmICFwYXJhbS5zZXQpe1xyXG4gICAgICB3ZWlnaHRzID0gW107XHJcbiAgICAgIGRpc3RhbmNlcyA9IFtdO1xyXG4gICAgfVxyXG4gICAgZWxzZSB7XHJcbiAgICAgIHdlaWdodFN0ciA9IGFuY2hvclBvaW50VXRpbGl0aWVzLnN5bnRheFt0eXBlXVsnd2VpZ2h0J107XHJcbiAgICAgIGRpc3RhbmNlU3RyID0gYW5jaG9yUG9pbnRVdGlsaXRpZXMuc3ludGF4W3R5cGVdWydkaXN0YW5jZSddO1xyXG5cclxuICAgICAgd2VpZ2h0cyA9IHBhcmFtLnNldCA/IGVkZ2UuZGF0YSh3ZWlnaHRTdHIpIDogcGFyYW0ud2VpZ2h0cztcclxuICAgICAgZGlzdGFuY2VzID0gcGFyYW0uc2V0ID8gZWRnZS5kYXRhKGRpc3RhbmNlU3RyKSA6IHBhcmFtLmRpc3RhbmNlcztcclxuICAgIH1cclxuXHJcbiAgICB2YXIgcmVzdWx0ID0ge1xyXG4gICAgICBlZGdlOiBlZGdlLFxyXG4gICAgICB0eXBlOiB0eXBlLFxyXG4gICAgICB3ZWlnaHRzOiB3ZWlnaHRzLFxyXG4gICAgICBkaXN0YW5jZXM6IGRpc3RhbmNlcyxcclxuICAgICAgLy9BcyB0aGUgcmVzdWx0IHdpbGwgbm90IGJlIHVzZWQgZm9yIHRoZSBmaXJzdCBmdW5jdGlvbiBjYWxsIHBhcmFtcyBzaG91bGQgYmUgdXNlZCB0byBzZXQgdGhlIGRhdGFcclxuICAgICAgc2V0OiB0cnVlXHJcbiAgICB9O1xyXG5cclxuICAgIC8vQ2hlY2sgaWYgd2UgbmVlZCB0byBzZXQgdGhlIHdlaWdodHMgYW5kIGRpc3RhbmNlcyBieSB0aGUgcGFyYW0gdmFsdWVzXHJcbiAgICBpZiAocGFyYW0uc2V0KSB7XHJcbiAgICAgIHZhciBoYWRBbmNob3JQb2ludCA9IHBhcmFtLndlaWdodHMgJiYgcGFyYW0ud2VpZ2h0cy5sZW5ndGggPiAwO1xyXG4gICAgICB2YXIgaGFkTXVsdGlwbGVBbmNob3JQb2ludHMgPSBoYWRBbmNob3JQb2ludCAmJiBwYXJhbS53ZWlnaHRzLmxlbmd0aCA+IDE7XHJcblxyXG4gICAgICBoYWRBbmNob3JQb2ludCA/IGVkZ2UuZGF0YSh3ZWlnaHRTdHIsIHBhcmFtLndlaWdodHMpIDogZWRnZS5yZW1vdmVEYXRhKHdlaWdodFN0cik7XHJcbiAgICAgIGhhZEFuY2hvclBvaW50ID8gZWRnZS5kYXRhKGRpc3RhbmNlU3RyLCBwYXJhbS5kaXN0YW5jZXMpIDogZWRnZS5yZW1vdmVEYXRhKGRpc3RhbmNlU3RyKTtcclxuXHJcbiAgICAgIHZhciBzaW5nbGVDbGFzc05hbWUgPSBhbmNob3JQb2ludFV0aWxpdGllcy5zeW50YXhbdHlwZV1bJ2NsYXNzJ107XHJcbiAgICAgIHZhciBtdWx0aUNsYXNzTmFtZSA9IGFuY2hvclBvaW50VXRpbGl0aWVzLnN5bnRheFt0eXBlXVsnbXVsdGlDbGFzcyddO1xyXG5cclxuICAgICAgLy8gUmVmcmVzaCB0aGUgY3VydmUgc3R5bGUgYXMgdGhlIG51bWJlciBvZiBhbmNob3IgcG9pbnQgd291bGQgYmUgY2hhbmdlZCBieSB0aGUgcHJldmlvdXMgb3BlcmF0aW9uXHJcbiAgICAgIC8vIEFkZGluZyBvciByZW1vdmluZyBtdWx0aSBjbGFzc2VzIGF0IG9uY2UgY2FuIGNhdXNlIGVycm9ycy4gSWYgbXVsdGlwbGUgY2xhc3NlcyBhcmUgdG8gYmUgYWRkZWQsXHJcbiAgICAgIC8vIGp1c3QgYWRkIHRoZW0gdG9nZXRoZXIgaW4gc3BhY2UgZGVsaW1ldGVkIGNsYXNzIG5hbWVzIGZvcm1hdC5cclxuICAgICAgaWYgKCFoYWRBbmNob3JQb2ludCAmJiAhaGFkTXVsdGlwbGVBbmNob3JQb2ludHMpIHtcclxuICAgICAgICAvLyBSZW1vdmUgbXVsdGlwbGUgY2xhc3NlcyBmcm9tIGVkZ2Ugd2l0aCBzcGFjZSBkZWxpbWV0ZWQgc3RyaW5nIG9mIGNsYXNzIG5hbWVzIFxyXG4gICAgICAgIGVkZ2UucmVtb3ZlQ2xhc3Moc2luZ2xlQ2xhc3NOYW1lICsgXCIgXCIgKyBtdWx0aUNsYXNzTmFtZSk7XHJcbiAgICAgIH1cclxuICAgICAgZWxzZSBpZiAoaGFkQW5jaG9yUG9pbnQgJiYgIWhhZE11bHRpcGxlQW5jaG9yUG9pbnRzKSB7IC8vIEhhZCBzaW5nbGUgYW5jaG9yXHJcbiAgICAgICAgZWRnZS5hZGRDbGFzcyhzaW5nbGVDbGFzc05hbWUpO1xyXG4gICAgICAgIGVkZ2UucmVtb3ZlQ2xhc3MobXVsdGlDbGFzc05hbWUpOyAgIFxyXG4gICAgICB9XHJcbiAgICAgIGVsc2Uge1xyXG4gICAgICAgIC8vIEhhZCBtdWx0aXBsZSBhbmNob3JzLiBBZGQgbXVsdGlwbGUgY2xhc3NlcyB3aXRoIHNwYWNlIGRlbGltZXRlZCBzdHJpbmcgb2YgY2xhc3MgbmFtZXNcclxuICAgICAgICBlZGdlLmFkZENsYXNzKHNpbmdsZUNsYXNzTmFtZSArIFwiIFwiICsgbXVsdGlDbGFzc05hbWUpO1xyXG4gICAgICB9XHJcbiAgICB9XHJcbiAgICBcclxuICAgIGVkZ2UudHJpZ2dlcignY3llZGdlZWRpdGluZy5jaGFuZ2VBbmNob3JQb2ludHMnKTtcclxuXHJcbiAgICByZXR1cm4gcmVzdWx0O1xyXG4gIH1cclxuXHJcbiAgZnVuY3Rpb24gbW92ZURvKGFyZykge1xyXG4gICAgICBpZiAoYXJnLmZpcnN0VGltZSkge1xyXG4gICAgICAgICAgZGVsZXRlIGFyZy5maXJzdFRpbWU7XHJcbiAgICAgICAgICByZXR1cm4gYXJnO1xyXG4gICAgICB9XHJcblxyXG4gICAgICB2YXIgZWRnZXMgPSBhcmcuZWRnZXM7XHJcbiAgICAgIHZhciBwb3NpdGlvbkRpZmYgPSBhcmcucG9zaXRpb25EaWZmO1xyXG4gICAgICB2YXIgcmVzdWx0ID0ge1xyXG4gICAgICAgICAgZWRnZXM6IGVkZ2VzLFxyXG4gICAgICAgICAgcG9zaXRpb25EaWZmOiB7XHJcbiAgICAgICAgICAgICAgeDogLXBvc2l0aW9uRGlmZi54LFxyXG4gICAgICAgICAgICAgIHk6IC1wb3NpdGlvbkRpZmYueVxyXG4gICAgICAgICAgfVxyXG4gICAgICB9O1xyXG4gICAgICBtb3ZlQW5jaG9yc1VuZG9hYmxlKHBvc2l0aW9uRGlmZiwgZWRnZXMpO1xyXG5cclxuICAgICAgcmV0dXJuIHJlc3VsdDtcclxuICB9XHJcblxyXG4gIGZ1bmN0aW9uIG1vdmVBbmNob3JzVW5kb2FibGUocG9zaXRpb25EaWZmLCBlZGdlcykge1xyXG4gICAgICBlZGdlcy5mb3JFYWNoKGZ1bmN0aW9uKCBlZGdlICl7XHJcbiAgICAgICAgICB2YXIgdHlwZSA9IGFuY2hvclBvaW50VXRpbGl0aWVzLmdldEVkZ2VUeXBlKGVkZ2UpO1xyXG4gICAgICAgICAgdmFyIHByZXZpb3VzQW5jaG9yc1Bvc2l0aW9uID0gYW5jaG9yUG9pbnRVdGlsaXRpZXMuZ2V0QW5jaG9yc0FzQXJyYXkoZWRnZSk7XHJcbiAgICAgICAgICB2YXIgbmV4dEFuY2hvcnNQb3NpdGlvbiA9IFtdO1xyXG4gICAgICAgICAgaWYgKHByZXZpb3VzQW5jaG9yc1Bvc2l0aW9uICE9IHVuZGVmaW5lZClcclxuICAgICAgICAgIHtcclxuICAgICAgICAgICAgICBmb3IgKGk9MDsgaTxwcmV2aW91c0FuY2hvcnNQb3NpdGlvbi5sZW5ndGg7IGkrPTIpXHJcbiAgICAgICAgICAgICAge1xyXG4gICAgICAgICAgICAgICAgICBuZXh0QW5jaG9yc1Bvc2l0aW9uLnB1c2goe3g6IHByZXZpb3VzQW5jaG9yc1Bvc2l0aW9uW2ldK3Bvc2l0aW9uRGlmZi54LCB5OiBwcmV2aW91c0FuY2hvcnNQb3NpdGlvbltpKzFdK3Bvc2l0aW9uRGlmZi55fSk7XHJcbiAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgIGVkZ2UuZGF0YShhbmNob3JQb2ludFV0aWxpdGllcy5zeW50YXhbdHlwZV1bJ3BvaW50UG9zJ10sIG5leHRBbmNob3JzUG9zaXRpb24pO1xyXG4gICAgICAgICAgfVxyXG4gICAgICB9KTtcclxuXHJcbiAgICAgIGFuY2hvclBvaW50VXRpbGl0aWVzLmluaXRBbmNob3JQb2ludHMocGFyYW1zLmJlbmRQb3NpdGlvbnNGdW5jdGlvbiwgcGFyYW1zLmNvbnRyb2xQb3NpdGlvbnNGdW5jdGlvbiwgZWRnZXMpO1xyXG4gIH1cclxuXHJcbiAgZnVuY3Rpb24gcmVjb25uZWN0RWRnZShwYXJhbSl7XHJcbiAgICB2YXIgZWRnZSAgICAgID0gcGFyYW0uZWRnZTtcclxuICAgIHZhciBsb2NhdGlvbiAgPSBwYXJhbS5sb2NhdGlvbjtcclxuICAgIHZhciBvbGRMb2MgICAgPSBwYXJhbS5vbGRMb2M7XHJcblxyXG4gICAgZWRnZSA9IGVkZ2UubW92ZShsb2NhdGlvbilbMF07XHJcblxyXG4gICAgdmFyIHJlc3VsdCA9IHtcclxuICAgICAgZWRnZTogICAgIGVkZ2UsXHJcbiAgICAgIGxvY2F0aW9uOiBvbGRMb2MsXHJcbiAgICAgIG9sZExvYzogICBsb2NhdGlvblxyXG4gICAgfVxyXG4gICAgZWRnZS51bnNlbGVjdCgpO1xyXG4gICAgcmV0dXJuIHJlc3VsdDtcclxuICB9XHJcblxyXG4gIGZ1bmN0aW9uIHJlbW92ZVJlY29ubmVjdGVkRWRnZShwYXJhbSl7XHJcbiAgICB2YXIgb2xkRWRnZSA9IHBhcmFtLm9sZEVkZ2U7XHJcbiAgICB2YXIgdG1wID0gY3kuZ2V0RWxlbWVudEJ5SWQob2xkRWRnZS5kYXRhKCdpZCcpKTtcclxuICAgIGlmKHRtcCAmJiB0bXAubGVuZ3RoID4gMClcclxuICAgICAgb2xkRWRnZSA9IHRtcDtcclxuXHJcbiAgICB2YXIgbmV3RWRnZSA9IHBhcmFtLm5ld0VkZ2U7XHJcbiAgICB2YXIgdG1wID0gY3kuZ2V0RWxlbWVudEJ5SWQobmV3RWRnZS5kYXRhKCdpZCcpKTtcclxuICAgIGlmKHRtcCAmJiB0bXAubGVuZ3RoID4gMClcclxuICAgICAgbmV3RWRnZSA9IHRtcDtcclxuXHJcbiAgICBpZihvbGRFZGdlLmluc2lkZSgpKXtcclxuICAgICAgb2xkRWRnZSA9IG9sZEVkZ2UucmVtb3ZlKClbMF07XHJcbiAgICB9IFxyXG4gICAgICBcclxuICAgIGlmKG5ld0VkZ2UucmVtb3ZlZCgpKXtcclxuICAgICAgbmV3RWRnZSA9IG5ld0VkZ2UucmVzdG9yZSgpO1xyXG4gICAgICBuZXdFZGdlLnVuc2VsZWN0KCk7XHJcbiAgICB9XHJcbiAgICBcclxuICAgIHJldHVybiB7XHJcbiAgICAgIG9sZEVkZ2U6IG5ld0VkZ2UsXHJcbiAgICAgIG5ld0VkZ2U6IG9sZEVkZ2VcclxuICAgIH07XHJcbiAgfVxyXG5cclxuICB1ci5hY3Rpb24oJ2NoYW5nZUFuY2hvclBvaW50cycsIGNoYW5nZUFuY2hvclBvaW50cywgY2hhbmdlQW5jaG9yUG9pbnRzKTtcclxuICB1ci5hY3Rpb24oJ21vdmVBbmNob3JQb2ludHMnLCBtb3ZlRG8sIG1vdmVEbyk7XHJcbiAgdXIuYWN0aW9uKCdyZWNvbm5lY3RFZGdlJywgcmVjb25uZWN0RWRnZSwgcmVjb25uZWN0RWRnZSk7XHJcbiAgdXIuYWN0aW9uKCdyZW1vdmVSZWNvbm5lY3RlZEVkZ2UnLCByZW1vdmVSZWNvbm5lY3RlZEVkZ2UsIHJlbW92ZVJlY29ubmVjdGVkRWRnZSk7XHJcbn07XHJcbiJdfQ==
