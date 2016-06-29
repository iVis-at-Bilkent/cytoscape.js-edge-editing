(function(f){if(typeof exports==="object"&&typeof module!=="undefined"){module.exports=f()}else if(typeof define==="function"&&define.amd){define([],f)}else{var g;if(typeof window!=="undefined"){g=window}else if(typeof global!=="undefined"){g=global}else if(typeof self!=="undefined"){g=self}else{g=this}g.cytoscapeEdgeBendEditing = f()}})(function(){var define,module,exports;return (function e(t,n,r){function s(o,u){if(!n[o]){if(!t[o]){var a=typeof require=="function"&&require;if(!u&&a)return a(o,!0);if(i)return i(o,!0);var f=new Error("Cannot find module '"+o+"'");throw f.code="MODULE_NOT_FOUND",f}var l=n[o]={exports:{}};t[o][0].call(l.exports,function(e){var n=t[o][1][e];return s(n?n:e)},l,l.exports,e,t,n,r)}return n[o].exports}var i=typeof require=="function"&&require;for(var o=0;o<r.length;o++)s(r[o]);return s})({1:[function(_dereq_,module,exports){
var debounce = _dereq_('./debounce');
var bendPointUtilities = _dereq_('./bendPointUtilities');
var registerUndoRedoFunctions = _dereq_('./registerUndoRedoFunctions');

module.exports = function (params) {
  var fn = params;

  var ePosition, eRemove, eZoom, eSelect, eUnselect, eTapStart, eTapDrag, eTapEnd, eCxtTap, eTap;
  var functions = {
    init: function () {
      // register undo redo functions
      registerUndoRedoFunctions();
      
      var self = this;
      var opts = params;
      var $container = $(this);
      var cy;
      var $canvas = $('<canvas></canvas>');

      $container.append($canvas);
      
      var $ctxAddBendPoint = $('<menu title="Add Bend Point" id="cy-edge-bend-editing-ctx-add-bend-point" class="cy-edge-bend-editing-ctx-operation"></menu>');
      var $ctxRemoveBendPoint = $('<menu title="Remove Bend Point" id="cy-edge-bend-editing-ctx-remove-bend-point" class="cy-edge-bend-editing-ctx-operation"></menu>');
      
      $('body').append($ctxAddBendPoint);
      $('body').append($ctxRemoveBendPoint);
      
      document.getElementById("cy-edge-bend-editing-ctx-add-bend-point").addEventListener("contextmenu",function(event){
        event.preventDefault();
      },false);

      document.getElementById("cy-edge-bend-editing-ctx-remove-bend-point").addEventListener("contextmenu",function(event){
          event.preventDefault();
      },false);

      $('.cy-edge-bend-editing-ctx-operation').click(function (e) {
        $('.cy-edge-bend-editing-ctx-operation').css('display', 'none');
      });

      $ctxAddBendPoint.click(function (e) {
        var edge = bendPointUtilities.currentCtxEdge;
        
        if(!edge.selected()) {
          return;
        }
        
        var param = {
          edge: edge,
          weights: edge.data('weights')?[].concat(edge.data('weights')):edge.data('weights'),
          distances: edge.data('distances')?[].concat(edge.data('distances')):edge.data('distances')
        };
        
        bendPointUtilities.addBendPoint();
        
        if(options().undoable) {
          cy.undoRedo().do('changeBendPoints', param);
        }
        
        clearDraws();
        renderBendShapes(edge);
        
      });

      $ctxRemoveBendPoint.click(function (e) {
        var edge = bendPointUtilities.currentCtxEdge;
        
        if(!edge.selected()) {
          return;
        }
        
        var param = {
          edge: edge,
          weights: [].concat(edge.data('weights')),
          distances: [].concat(edge.data('distances'))
        };

        bendPointUtilities.removeBendPoint();
        
        if(options().undoable) {
          cy.undoRedo().do('changeBendPoints', param);
        }
        
        clearDraws();
        renderBendShapes(edge);
      });
      
      var _sizeCanvas = debounce(function () {
        $canvas
          .attr('height', $container.height())
          .attr('width', $container.width())
          .css({
            'position': 'absolute',
            'top': 0,
            'left': 0,
            'z-index': '999'
          })
        ;

        setTimeout(function () {
          var canvasBb = $canvas.offset();
          var containerBb = $container.offset();

          $canvas
            .css({
              'top': -(canvasBb.top - containerBb.top),
              'left': -(canvasBb.left - containerBb.left)
            })
          ;

          // redraw on canvas resize
          if(cy){
            clearDraws(true);
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

      var ctx = $canvas[0].getContext('2d');

      // write options to data
      var data = $container.data('cyedgebendediting');
      if (data == null) {
        data = {};
      }
      data.options = opts;

      var optCache;

      function options() {
        return optCache || (optCache = $container.data('cyedgebendediting').options);
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

      function clearDraws(renderSelectedBendShapes) {

        var w = $container.width();
        var h = $container.height();

        ctx.clearRect(0, 0, w, h);
        
        if( renderSelectedBendShapes ) {
          var selectedEdges = cy.edges(':selected');
        
          for( var i = 0; i < selectedEdges.length; i++ ) {
            var edge = selectedEdges[i];
            renderBendShapes(edge);
          }
        }
      }
      
      
      // render the bend shapes of the given edge
      function renderBendShapes(edge) {
        var cy = edge.cy();
        
        if(!edge.hasClass('edgebendediting-hasbendpoints')) {
          return;
        }
        
        var segpts = bendPointUtilities.getSegmentPoints(edge);//edge._private.rscratch.segpts;
        var length = getBendShapesLenght(edge);
        
        var srcPos = edge.source().position();
        var tgtPos = edge.target().position();
        
        var weights = edge.data('weights');
        var distances = edge.data('distances');

        for(var i = 0; segpts && i < segpts.length; i = i + 2){
          var bendX = segpts[i];
          var bendY = segpts[i + 1];

          var oldStyle = ctx.fillStyle;
          ctx.fillStyle = edge.css('line-color');
          renderBendShape(bendX, bendY, length);
          ctx.fillStyle = oldStyle;
        }
      }
      
      // render a bend shape with the given parameters
      function renderBendShape(bendX, bendY, length) {
        // get the top left coordinates
        var topLeftX = bendX - length / 2;
        var topLeftY = bendY - length / 2;
        
        // convert to rendered parameters
        var renderedTopLeftPos = convertToRenderedPosition({x: topLeftX, y: topLeftY});
        length *= cy.zoom();
        
        // render bend shape
        ctx.beginPath();
        ctx.rect(renderedTopLeftPos.x, renderedTopLeftPos.y, length, length);
        ctx.fill();
        ctx.closePath();
      }
      
      // get the length of bend points to be rendered
      function getBendShapesLenght(edge) {
        var factor = 6;
        var length = parseFloat(edge.css('width')) * factor;
        return length;
      }
      
      // check if the point represented by {x, y} is inside the bend shape
      function checkIfInsideBendShape(x, y, length, centerX, centerY){
        var minX = centerX - length / 2;
        var maxX = centerX + length / 2;
        var minY = centerY - length / 2;
        var maxY = centerY + length / 2;
        
        var inside = (x >= minX && x <= maxX) && (y >= minY && y <= maxY);
        return inside;
      }

      // get tge index of bend point containing the point represented by {x, y}
      function getContainingBendShapeIndex(x, y, edge) {
        if(edge.data('weights') == null || edge.data('weights').lenght == 0){
          return -1;
        }

        var segpts = edge._private.rscratch.segpts;
        var length = getBendShapesLenght(edge);

        for(var i = 0; segpts && i < segpts.length; i = i + 2){
          var bendX = segpts[i];
          var bendY = segpts[i + 1];

          var inside = checkIfInsideBendShape(x, y, length, bendX, bendY);
          if(inside){
            return i / 2;
          }
        }

        return -1;
      };

      // last status of gestures
      var lastPanningEnabled, lastZoomingEnabled, lastBoxSelectionEnabled;
      
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

      $container.cytoscape(function (e) {
        cy = this;
        clearDraws(true);
        
        lastPanningEnabled = cy.panningEnabled();
        lastZoomingEnabled = cy.zoomingEnabled();
        lastBoxSelectionEnabled = cy.boxSelectionEnabled();
        
        cy.bind('zoom pan', eZoom = function () {
          clearDraws(true);
        });

        cy.on('position', 'node', ePosition = function () {
          var node = this;
          
          clearDraws(true);
        });

        cy.on('remove', 'edge', eRemove = function () {
          var node = this;
          
          // TODO
        });
        
        cy.on('select', 'edge', eSelect = function () {
          var edge = this;
          
          renderBendShapes(edge);
        });
        
        cy.on('unselect', 'edge', eUnselect = function () {
          var edge = this;
          
          clearDraws(true);
        });
        
        var movedBendIndex;
        var movedBendEdge;
        var moveBendParam;
        
        cy.on('tapstart', 'edge', eTapStart = function (event) {
          var edge = this;
          
          moveBendParam = {
            edge: edge,
            weights: edge.data('weights') ? [].concat(edge.data('weights')) : edge.data('weights'),
            distances: edge.data('distances') ? [].concat(edge.data('distances')) : edge.data('distances')
          };
          
          var cyPosX = event.cyPosition.x;
          var cyPosY = event.cyPosition.y;

          var index = getContainingBendShapeIndex(cyPosX, cyPosY, edge);
          if (index != -1) {
            movedBendIndex = index;
            movedBendEdge = edge;
            disableGestures();
          }
        });
        
        cy.on('tapdrag', eTapDrag = function (event) {
          var edge = movedBendEdge;
          
          if (movedBendEdge === undefined || movedBendIndex === undefined) {
            return;
          }

          var weights = edge.data('weights');
          var distances = edge.data('distances');

          var relativeBendPosition = bendPointUtilities.convertToRelativeBendPosition(edge, event.cyPosition);
          weights[movedBendIndex] = relativeBendPosition.weight;
          distances[movedBendIndex] = relativeBendPosition.distance;

          edge.data('weights', weights);
          edge.data('distances', distances);
          
          clearDraws();
          renderBendShapes(edge);
        });
        
        cy.on('tapend', eTapEnd = function (event) {
          var edge = movedBendEdge;
          
          if (edge !== undefined && moveBendParam !== undefined && edge.data('weights')
                  && edge.data('weights').toString() != moveBendParam.weights.toString()) {
            
            if(options().undoable) {
              cy.undoRedo().do('changeBendPoints', moveBendParam);
            }
          }

          movedBendIndex = undefined;
          movedBendEdge = undefined;
          moveBendParam = undefined;

          resetGestures();
          clearDraws(true);
        });
        
        cy.on('cxttap', 'edge', eCxtTap = function (event) {
          var edge = this;
          var containerPos = $(cy.container()).position();

          var left = containerPos.left + event.cyRenderedPosition.x;
          left = left.toString() + 'px';

          var top = containerPos.top + event.cyRenderedPosition.y;
          top = top.toString() + 'px';

          $('.cy-edge-bend-editing-ctx-operation').css('display', 'none');

          var selectedBendIndex = getContainingBendShapeIndex(event.cyPosition.x, event.cyPosition.y, edge);
          if (selectedBendIndex == -1) {
            $ctxAddBendPoint.css('display', 'block');
            bendPointUtilities.currentCtxPos = event.cyPosition;
            ctxMenu = document.getElementById("cy-edge-bend-editing-ctx-add-bend-point");
          }
          else {
            $ctxRemoveBendPoint.css('display', 'block');
            bendPointUtilities.currentBendIndex = selectedBendIndex;
            ctxMenu = document.getElementById("cy-edge-bend-editing-ctx-remove-bend-point");
          }

          ctxMenu.style.display = "block";
          ctxMenu.style.left = left;
          ctxMenu.style.top = top;

          bendPointUtilities.currentCtxEdge = edge;
        });
        
        cy.on('tap', eTap = function(event) {
          $('.cy-edge-bend-editing-ctx-operation').css('display', 'none');
        });
        
        cy.on('changeBendPoints', 'edge', function() {
          var edge = this;
          clearDraws();
          renderBendShapes(edge);
        });
        
      });

      $container.data('cyedgebendediting', data);
    },
    unbind: function () {
        cy.off('position', 'node', ePosition)
          .off('remove', 'node', eRemove)
          .off('select', 'edge', eSelect)
          .off('unselect', 'edge', eUnselect)
          .off('tapstart', 'edge', eTapStart)
          .off('tapdrag', eTapDrag)
          .off('tapend', eTapEnd)
          .off('cxttap', eCxtTap)
          .off('tap', eTap);

        cy.unbind("zoom pan", eZoom);
    }
  };

  if (functions[fn]) {
    return functions[fn].apply(this, Array.prototype.slice.call(arguments, 1));
  } else if (typeof fn == 'object' || !fn) {
    return functions.init.apply(this, arguments);
  } else {
    $.error('No such function `' + fn + '` for cytoscape.js-edge-bend-editing');
  }

  return $(this);
};
},{"./bendPointUtilities":2,"./debounce":3,"./registerUndoRedoFunctions":5}],2:[function(_dereq_,module,exports){
var bendPointUtilities = {
  currentCtxEdge: undefined,
  currentCtxPos: undefined,
  currentBendIndex: undefined,
  // initilize bend points based on bendPositionsFcn
  initBendPoints: function(bendPositionsFcn) {
    var edges = cy.edges();

    for (var i = 0; i < edges.length; i++) {
      var edge = edges[i];
      
      // get the bend positions by applying the function for this edge
      var bendPositions = bendPositionsFcn.apply(this, edge);
      // calculate relative bend positions
      var result = this.convertToRelativeBendPositions(edge, bendPositions);

      // if there are bend points set weights and distances accordingly and add class to enable style changes
      if (result.distances.length > 0) {
        edge.data('weights', result.weights);
        edge.data('distances', result.distances);
        edge.addClass('edgebendediting-hasbendpoints');
      }
    }
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
    //passing through the bend point and perpendicular to the other line
    var intersectionPoint = {
      x: intersectX,
      y: intersectY
    };
    
    return intersectionPoint;
  },
  getSegmentPoints: function(edge) {
    var segpts = [];

    var segmentWs = edge.pstyle( 'segment-weights' ).pfValue;
    var segmentDs = edge.pstyle( 'segment-distances' ).pfValue;
    var segmentsN = Math.min( segmentWs.length, segmentDs.length );
    
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

    for( var s = 0; s < segmentsN; s++ ){
      var w = segmentWs[ s ];
      var d = segmentDs[ s ];

      // d = swappedDirection ? -d : d;
      //
      // d = Math.abs(d);

      // var w1 = !swappedDirection ? (1 - w) : w;
      // var w2 = !swappedDirection ? w : (1 - w);

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

      segpts.push(
        adjustedMidpt.x + vectorNormInverse.x * d,
        adjustedMidpt.y + vectorNormInverse.y * d
      );
    }
    
    return segpts;
  },
//  convertToBendPosition: function(srcPos, tgtPos, weight, distance) {
//    var realPosX;
//    var realPosY;
//    
//    var m = -1 / ( ( tgtPos.y - srcPos.y ) / ( tgtPos.x - srcPos.x ) );
//    
//    var crossingEdgePosition = {
//      x: srcPos.x + (tgtPos.x - srcPos.x) * weight,
//      y: srcPos.y + (tgtPos.y - srcPos.y) * weight
//    };
//    
//    if (m == -Infinity) {
//      realPosX = crossingEdgePosition.x;
//      realPosY = crossingEdgePosition.y + distance;
//    }
//    else {
//      var xDiff = distance / Math.sqrt( ( Math.pow(m, 2) + 1 ) );
//      realPosX = crossingEdgePosition.x + Math.sign(m) * xDiff;
//      realPosY = crossingEdgePosition.y + m * xDiff;
//    }
// 
//    return {
//      x: realPosX,
//      y: realPosY
//    };
//  },
  convertToRelativeBendPosition: function (edge, bendPoint, srcTgtPointsAndTangents) {
    if (srcTgtPointsAndTangents === undefined) {
      srcTgtPointsAndTangents = this.getSrcTgtPointsAndTangents(edge);
    }
    
    var intersectionPoint = this.getIntersection(edge, bendPoint, srcTgtPointsAndTangents);
    var intersectX = intersectionPoint.x;
    var intersectY = intersectionPoint.y;
    
    var srcPoint = srcTgtPointsAndTangents.srcPoint;
    var tgtPoint = srcTgtPointsAndTangents.tgtPoint;
    
    var weight = intersectX == srcPoint.x?0:(intersectX - srcPoint.x) / (tgtPoint.x - srcPoint.x);
    var distance = Math.sqrt(Math.pow((intersectY - bendPoint.y), 2)
        + Math.pow((intersectX - bendPoint.x), 2));
    
    //Get the direction of the line form source point to target point
    var direction1 = this.getLineDirection(srcPoint, tgtPoint);
    //Get the direction of the line from intesection point to bend point
    var direction2 = this.getLineDirection(intersectionPoint, bendPoint);
    
    //If the difference is not -2 and not 6 then the direction of the distance is negative
    if(direction1 - direction2 != -2 && direction1 - direction2 != 6){
      if(distance != 0)
        distance = -1 * distance;
    }
    
    var minDiff = 0.001;
    
    if(Math.abs(weight - 0) < minDiff){
      weight = minDiff;
    }
    else if(Math.abs(weight - 1) < minDiff){
      weight = 1 - minDiff;
    }
    
    return {
      weight: weight,
      distance: distance
    };
  },
  convertToRelativeBendPositions: function (edge, bendPoints) {
    var srcTgtPointsAndTangents = this.getSrcTgtPointsAndTangents(edge);
//    var bendPoints = edge.data('bendPointPositions');
    //output variables
    var weights = [];
    var distances = [];

    for (var i = 0; bendPoints && i < bendPoints.length; i++) {
      var bendPoint = bendPoints[i];
      var relativeBendPosition = this.convertToRelativeBendPosition(edge, bendPoint, srcTgtPointsAndTangents);

      weights.push(relativeBendPosition.weight);
      distances.push(relativeBendPosition.distance);
    }

    return {
      weights: weights,
      distances: distances
    };
  },
  getSegmentDistancesString: function (edge) {
    var str = "";

    var distances = edge.data('distances');
    for (var i = 0; distances && i < distances.length; i++) {
      str = str + " " + distances[i];
    }
    
    return str;
  },
  getSegmentWeightsString: function (edge) {
    var str = "";

    var weights = edge.data('weights');
    for (var i = 0; weights && i < weights.length; i++) {
      str = str + " " + weights[i];
    }
    
    return str;
  },
  addBendPoint: function(edge, newBendPoint) {
    if(edge === undefined || newBendPoint === undefined){
      edge = this.currentCtxEdge;
      newBendPoint = this.currentCtxPos;
    }
    
    var relativeBendPosition = this.convertToRelativeBendPosition(edge, newBendPoint);
    var originalPointWeight = relativeBendPosition.weight;
    
    var edgeStartX = edge._private.rscratch.startX;
    var edgeStartY = edge._private.rscratch.startY;
    var edgeEndX = edge._private.rscratch.endX;
    var edgeEndY = edge._private.rscratch.endY;
    
    var startWeight = this.convertToRelativeBendPosition(edge, {x: edgeStartX, y: edgeStartY}).weight;
    var endWeight = this.convertToRelativeBendPosition(edge, {x: edgeEndX, y: edgeEndY}).weight;
    var weightsWithTgtSrc = [startWeight].concat(edge.data('weights')?edge.data('weights'):[]).concat([endWeight]);
    
    var minDist = Infinity;
    var intersection;
    var segptsWithTgtSrc = [edgeStartX, edgeStartY]
            .concat(edge._private.rscratch.segpts?edge._private.rscratch.segpts:[])
            .concat([edgeEndX, edgeEndY]);
    var newBendIndex = -1;
    
    for(var i = 0; i < weightsWithTgtSrc.length - 1; i++){
      var w1 = weightsWithTgtSrc[i];
      var w2 = weightsWithTgtSrc[i + 1];
      
      //check if the weight is between w1 and w2
      if((originalPointWeight <= w1 && originalPointWeight >= w2) || (originalPointWeight <= w2 && originalPointWeight >= w1)){
        var startX = segptsWithTgtSrc[2 * i];
        var startY = segptsWithTgtSrc[2 * i + 1];
        var endX = segptsWithTgtSrc[2 * i + 2];
        var endY = segptsWithTgtSrc[2 * i + 3];
        
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
        
        //get the intersection of the current segment with the new bend point
        var currentIntersection = this.getIntersection(edge, newBendPoint, srcTgtPointsAndTangents);
        var dist = Math.sqrt( Math.pow( (newBendPoint.x - currentIntersection.x), 2 ) 
                + Math.pow( (newBendPoint.y - currentIntersection.y), 2 ));
        
        //Update the minimum distance
        if(dist < minDist){
          minDist = dist;
          intersection = currentIntersection;
          newBendIndex = i;
        }
      }
    }
    
    if(intersection !== undefined){
      newBendPoint = intersection;
    }
    
    relativeBendPosition = this.convertToRelativeBendPosition(edge, newBendPoint);
    
    if(intersection === undefined){
      relativeBendPosition.distance = 0;
    }

    var weights = edge.data('weights');
    var distances = edge.data('distances');
    
    weights = weights?weights:[];
    distances = distances?distances:[];
    
    if(weights.length === 0) {
      newBendIndex = 0;
    }
    
//    weights.push(relativeBendPosition.weight);
//    distances.push(relativeBendPosition.distance);
    if(newBendIndex != -1){
      weights.splice(newBendIndex, 0, relativeBendPosition.weight);
      distances.splice(newBendIndex, 0, relativeBendPosition.distance);
    }
   
    edge.data('weights', weights);
    edge.data('distances', distances);
    
    edge.addClass('edgebendediting-hasbendpoints');
    
    return relativeBendPosition;
  },
  removeBendPoint: function(edge, bendPointIndex){
    if(edge === undefined || bendPointIndex === undefined){
      edge = this.currentCtxEdge;
      bendPointIndex = this.currentBendIndex;
    }
    
    var distances = edge.data('distances');
    var weights = edge.data('weights');
    
    distances.splice(bendPointIndex, 1);
    weights.splice(bendPointIndex, 1);
    
    
    if(distances.length == 0 || weights.lenght == 0){
      edge.removeClass('edgebendediting-hasbendpoints');
    }
    else {
      edge.data('distances', distances);
      edge.data('weights', weights);
    }
  }
};

module.exports = bendPointUtilities;
},{}],3:[function(_dereq_,module,exports){
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
;(function($$, $){ 'use strict';
  
  var bendPointUtilities = _dereq_('./bendPointUtilities');
  $.fn.cytoscapeEdgeBendEditing = _dereq_('./UIUtilities');

  
  // registers the extension on a cytoscape lib ref
  var register = function( cytoscape ){
    
    if( !cytoscape ){ return; } // can't register if cytoscape unspecified

    var options = {
      // this function specifies the poitions of bend points
      bendPositionsFunction: function(ele) {
        return ele.data('bendPointPositions');
      },
      undoable: false
    };
    
    function setOptions(from) {
      var tempOpts = {};
      for (var key in options)
        tempOpts[key] = options[key];

      for (var key in from)
        if (tempOpts.hasOwnProperty(key))
          tempOpts[key] = from[key];
      return tempOpts;
    }
    
    cytoscape( 'core', 'edgeBendEditing', function(opts){
      var cy = this;
      
      // merge the options with default ones
      options = setOptions(opts);
      
      // define edgebendediting-hasbendpoints css class
      cy.style().selector('.edgebendediting-hasbendpoints').css({
        'curve-style': 'segments',
        'segment-distances': function (ele) {
          return bendPointUtilities.getSegmentDistancesString(ele);
        },
        'segment-weights': function (ele) {
          return bendPointUtilities.getSegmentWeightsString(ele);
        },
        'edge-distances': 'node-position'
      });
      
      // init bend positions
      bendPointUtilities.initBendPoints(options.bendPositionsFunction);
      
      $(cy.container()).cytoscapeEdgeBendEditing(options);

      return this; // chainability
    } );

  };

  if( typeof module !== 'undefined' && module.exports ){ // expose as a commonjs module
    module.exports = register;
  }

  if( typeof define !== 'undefined' && define.amd ){ // expose as an amd/requirejs module
    define('cytoscape-edge-bend-editing', function(){
      return register;
    });
  }

  if( typeof cytoscape !== 'undefined' ){ // expose to global cytoscape (i.e. window.cytoscape)
    register( cytoscape );
  }

})(cytoscape, jQuery);

},{"./UIUtilities":1,"./bendPointUtilities":2}],5:[function(_dereq_,module,exports){
module.exports = function () {
  if (cy.undoRedo == null)
    return;

  var ur = cy.undoRedo({
    defaultActions: false,
    isDebug: true
  });

  function changeBendPoints(param) {
    var edge = param.edge;
    var result = {
      edge: edge,
      weights: param.set ? edge.data('weights') : param.weights,
      distances: param.set ? edge.data('distances') : param.distances,
      set: true//As the result will not be used for the first function call params should be used to set the data
    };

    //Check if we need to set the weights and distances by the param values
    if (param.set) {
      param.weights ? edge.data('weights', param.weights) : edge.removeData('weights');
      param.distances ? edge.data('distances', param.distances) : edge.removeData('distances');

      //refresh the curve style as the number of bend point would be changed by the previous operation
      if (param.weights) {
        edge.addClass('edgebendediting-hasbendpoints');
      }
      else {
        edge.removeClass('edgebendediting-hasbendpoints');
      }
    }
    
    edge.trigger('changeBendPoints');

    return result;
  }

  ur.action('changeBendPoints', changeBendPoints, changeBendPoints);
};
},{}]},{},[4])(4)
});
//# sourceMappingURL=data:application/json;charset:utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIm5vZGVfbW9kdWxlcy9icm93c2VyaWZ5L25vZGVfbW9kdWxlcy9icm93c2VyLXBhY2svX3ByZWx1ZGUuanMiLCJzcmMvVUlVdGlsaXRpZXMuanMiLCJzcmMvYmVuZFBvaW50VXRpbGl0aWVzLmpzIiwic3JjL2RlYm91bmNlLmpzIiwic3JjL2luZGV4LmpzIiwic3JjL3JlZ2lzdGVyVW5kb1JlZG9GdW5jdGlvbnMuanMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7QUNBQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDamNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUMxWkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDN09BO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDekVBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQSIsImZpbGUiOiJnZW5lcmF0ZWQuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlc0NvbnRlbnQiOlsiKGZ1bmN0aW9uIGUodCxuLHIpe2Z1bmN0aW9uIHMobyx1KXtpZighbltvXSl7aWYoIXRbb10pe3ZhciBhPXR5cGVvZiByZXF1aXJlPT1cImZ1bmN0aW9uXCImJnJlcXVpcmU7aWYoIXUmJmEpcmV0dXJuIGEobywhMCk7aWYoaSlyZXR1cm4gaShvLCEwKTt2YXIgZj1uZXcgRXJyb3IoXCJDYW5ub3QgZmluZCBtb2R1bGUgJ1wiK28rXCInXCIpO3Rocm93IGYuY29kZT1cIk1PRFVMRV9OT1RfRk9VTkRcIixmfXZhciBsPW5bb109e2V4cG9ydHM6e319O3Rbb11bMF0uY2FsbChsLmV4cG9ydHMsZnVuY3Rpb24oZSl7dmFyIG49dFtvXVsxXVtlXTtyZXR1cm4gcyhuP246ZSl9LGwsbC5leHBvcnRzLGUsdCxuLHIpfXJldHVybiBuW29dLmV4cG9ydHN9dmFyIGk9dHlwZW9mIHJlcXVpcmU9PVwiZnVuY3Rpb25cIiYmcmVxdWlyZTtmb3IodmFyIG89MDtvPHIubGVuZ3RoO28rKylzKHJbb10pO3JldHVybiBzfSkiLCJ2YXIgZGVib3VuY2UgPSByZXF1aXJlKCcuL2RlYm91bmNlJyk7XG52YXIgYmVuZFBvaW50VXRpbGl0aWVzID0gcmVxdWlyZSgnLi9iZW5kUG9pbnRVdGlsaXRpZXMnKTtcbnZhciByZWdpc3RlclVuZG9SZWRvRnVuY3Rpb25zID0gcmVxdWlyZSgnLi9yZWdpc3RlclVuZG9SZWRvRnVuY3Rpb25zJyk7XG5cbm1vZHVsZS5leHBvcnRzID0gZnVuY3Rpb24gKHBhcmFtcykge1xuICB2YXIgZm4gPSBwYXJhbXM7XG5cbiAgdmFyIGVQb3NpdGlvbiwgZVJlbW92ZSwgZVpvb20sIGVTZWxlY3QsIGVVbnNlbGVjdCwgZVRhcFN0YXJ0LCBlVGFwRHJhZywgZVRhcEVuZCwgZUN4dFRhcCwgZVRhcDtcbiAgdmFyIGZ1bmN0aW9ucyA9IHtcbiAgICBpbml0OiBmdW5jdGlvbiAoKSB7XG4gICAgICAvLyByZWdpc3RlciB1bmRvIHJlZG8gZnVuY3Rpb25zXG4gICAgICByZWdpc3RlclVuZG9SZWRvRnVuY3Rpb25zKCk7XG4gICAgICBcbiAgICAgIHZhciBzZWxmID0gdGhpcztcbiAgICAgIHZhciBvcHRzID0gcGFyYW1zO1xuICAgICAgdmFyICRjb250YWluZXIgPSAkKHRoaXMpO1xuICAgICAgdmFyIGN5O1xuICAgICAgdmFyICRjYW52YXMgPSAkKCc8Y2FudmFzPjwvY2FudmFzPicpO1xuXG4gICAgICAkY29udGFpbmVyLmFwcGVuZCgkY2FudmFzKTtcbiAgICAgIFxuICAgICAgdmFyICRjdHhBZGRCZW5kUG9pbnQgPSAkKCc8bWVudSB0aXRsZT1cIkFkZCBCZW5kIFBvaW50XCIgaWQ9XCJjeS1lZGdlLWJlbmQtZWRpdGluZy1jdHgtYWRkLWJlbmQtcG9pbnRcIiBjbGFzcz1cImN5LWVkZ2UtYmVuZC1lZGl0aW5nLWN0eC1vcGVyYXRpb25cIj48L21lbnU+Jyk7XG4gICAgICB2YXIgJGN0eFJlbW92ZUJlbmRQb2ludCA9ICQoJzxtZW51IHRpdGxlPVwiUmVtb3ZlIEJlbmQgUG9pbnRcIiBpZD1cImN5LWVkZ2UtYmVuZC1lZGl0aW5nLWN0eC1yZW1vdmUtYmVuZC1wb2ludFwiIGNsYXNzPVwiY3ktZWRnZS1iZW5kLWVkaXRpbmctY3R4LW9wZXJhdGlvblwiPjwvbWVudT4nKTtcbiAgICAgIFxuICAgICAgJCgnYm9keScpLmFwcGVuZCgkY3R4QWRkQmVuZFBvaW50KTtcbiAgICAgICQoJ2JvZHknKS5hcHBlbmQoJGN0eFJlbW92ZUJlbmRQb2ludCk7XG4gICAgICBcbiAgICAgIGRvY3VtZW50LmdldEVsZW1lbnRCeUlkKFwiY3ktZWRnZS1iZW5kLWVkaXRpbmctY3R4LWFkZC1iZW5kLXBvaW50XCIpLmFkZEV2ZW50TGlzdGVuZXIoXCJjb250ZXh0bWVudVwiLGZ1bmN0aW9uKGV2ZW50KXtcbiAgICAgICAgZXZlbnQucHJldmVudERlZmF1bHQoKTtcbiAgICAgIH0sZmFsc2UpO1xuXG4gICAgICBkb2N1bWVudC5nZXRFbGVtZW50QnlJZChcImN5LWVkZ2UtYmVuZC1lZGl0aW5nLWN0eC1yZW1vdmUtYmVuZC1wb2ludFwiKS5hZGRFdmVudExpc3RlbmVyKFwiY29udGV4dG1lbnVcIixmdW5jdGlvbihldmVudCl7XG4gICAgICAgICAgZXZlbnQucHJldmVudERlZmF1bHQoKTtcbiAgICAgIH0sZmFsc2UpO1xuXG4gICAgICAkKCcuY3ktZWRnZS1iZW5kLWVkaXRpbmctY3R4LW9wZXJhdGlvbicpLmNsaWNrKGZ1bmN0aW9uIChlKSB7XG4gICAgICAgICQoJy5jeS1lZGdlLWJlbmQtZWRpdGluZy1jdHgtb3BlcmF0aW9uJykuY3NzKCdkaXNwbGF5JywgJ25vbmUnKTtcbiAgICAgIH0pO1xuXG4gICAgICAkY3R4QWRkQmVuZFBvaW50LmNsaWNrKGZ1bmN0aW9uIChlKSB7XG4gICAgICAgIHZhciBlZGdlID0gYmVuZFBvaW50VXRpbGl0aWVzLmN1cnJlbnRDdHhFZGdlO1xuICAgICAgICBcbiAgICAgICAgaWYoIWVkZ2Uuc2VsZWN0ZWQoKSkge1xuICAgICAgICAgIHJldHVybjtcbiAgICAgICAgfVxuICAgICAgICBcbiAgICAgICAgdmFyIHBhcmFtID0ge1xuICAgICAgICAgIGVkZ2U6IGVkZ2UsXG4gICAgICAgICAgd2VpZ2h0czogZWRnZS5kYXRhKCd3ZWlnaHRzJyk/W10uY29uY2F0KGVkZ2UuZGF0YSgnd2VpZ2h0cycpKTplZGdlLmRhdGEoJ3dlaWdodHMnKSxcbiAgICAgICAgICBkaXN0YW5jZXM6IGVkZ2UuZGF0YSgnZGlzdGFuY2VzJyk/W10uY29uY2F0KGVkZ2UuZGF0YSgnZGlzdGFuY2VzJykpOmVkZ2UuZGF0YSgnZGlzdGFuY2VzJylcbiAgICAgICAgfTtcbiAgICAgICAgXG4gICAgICAgIGJlbmRQb2ludFV0aWxpdGllcy5hZGRCZW5kUG9pbnQoKTtcbiAgICAgICAgXG4gICAgICAgIGlmKG9wdGlvbnMoKS51bmRvYWJsZSkge1xuICAgICAgICAgIGN5LnVuZG9SZWRvKCkuZG8oJ2NoYW5nZUJlbmRQb2ludHMnLCBwYXJhbSk7XG4gICAgICAgIH1cbiAgICAgICAgXG4gICAgICAgIGNsZWFyRHJhd3MoKTtcbiAgICAgICAgcmVuZGVyQmVuZFNoYXBlcyhlZGdlKTtcbiAgICAgICAgXG4gICAgICB9KTtcblxuICAgICAgJGN0eFJlbW92ZUJlbmRQb2ludC5jbGljayhmdW5jdGlvbiAoZSkge1xuICAgICAgICB2YXIgZWRnZSA9IGJlbmRQb2ludFV0aWxpdGllcy5jdXJyZW50Q3R4RWRnZTtcbiAgICAgICAgXG4gICAgICAgIGlmKCFlZGdlLnNlbGVjdGVkKCkpIHtcbiAgICAgICAgICByZXR1cm47XG4gICAgICAgIH1cbiAgICAgICAgXG4gICAgICAgIHZhciBwYXJhbSA9IHtcbiAgICAgICAgICBlZGdlOiBlZGdlLFxuICAgICAgICAgIHdlaWdodHM6IFtdLmNvbmNhdChlZGdlLmRhdGEoJ3dlaWdodHMnKSksXG4gICAgICAgICAgZGlzdGFuY2VzOiBbXS5jb25jYXQoZWRnZS5kYXRhKCdkaXN0YW5jZXMnKSlcbiAgICAgICAgfTtcblxuICAgICAgICBiZW5kUG9pbnRVdGlsaXRpZXMucmVtb3ZlQmVuZFBvaW50KCk7XG4gICAgICAgIFxuICAgICAgICBpZihvcHRpb25zKCkudW5kb2FibGUpIHtcbiAgICAgICAgICBjeS51bmRvUmVkbygpLmRvKCdjaGFuZ2VCZW5kUG9pbnRzJywgcGFyYW0pO1xuICAgICAgICB9XG4gICAgICAgIFxuICAgICAgICBjbGVhckRyYXdzKCk7XG4gICAgICAgIHJlbmRlckJlbmRTaGFwZXMoZWRnZSk7XG4gICAgICB9KTtcbiAgICAgIFxuICAgICAgdmFyIF9zaXplQ2FudmFzID0gZGVib3VuY2UoZnVuY3Rpb24gKCkge1xuICAgICAgICAkY2FudmFzXG4gICAgICAgICAgLmF0dHIoJ2hlaWdodCcsICRjb250YWluZXIuaGVpZ2h0KCkpXG4gICAgICAgICAgLmF0dHIoJ3dpZHRoJywgJGNvbnRhaW5lci53aWR0aCgpKVxuICAgICAgICAgIC5jc3Moe1xuICAgICAgICAgICAgJ3Bvc2l0aW9uJzogJ2Fic29sdXRlJyxcbiAgICAgICAgICAgICd0b3AnOiAwLFxuICAgICAgICAgICAgJ2xlZnQnOiAwLFxuICAgICAgICAgICAgJ3otaW5kZXgnOiAnOTk5J1xuICAgICAgICAgIH0pXG4gICAgICAgIDtcblxuICAgICAgICBzZXRUaW1lb3V0KGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICB2YXIgY2FudmFzQmIgPSAkY2FudmFzLm9mZnNldCgpO1xuICAgICAgICAgIHZhciBjb250YWluZXJCYiA9ICRjb250YWluZXIub2Zmc2V0KCk7XG5cbiAgICAgICAgICAkY2FudmFzXG4gICAgICAgICAgICAuY3NzKHtcbiAgICAgICAgICAgICAgJ3RvcCc6IC0oY2FudmFzQmIudG9wIC0gY29udGFpbmVyQmIudG9wKSxcbiAgICAgICAgICAgICAgJ2xlZnQnOiAtKGNhbnZhc0JiLmxlZnQgLSBjb250YWluZXJCYi5sZWZ0KVxuICAgICAgICAgICAgfSlcbiAgICAgICAgICA7XG5cbiAgICAgICAgICAvLyByZWRyYXcgb24gY2FudmFzIHJlc2l6ZVxuICAgICAgICAgIGlmKGN5KXtcbiAgICAgICAgICAgIGNsZWFyRHJhd3ModHJ1ZSk7XG4gICAgICAgICAgfVxuICAgICAgICB9LCAwKTtcblxuICAgICAgfSwgMjUwKTtcblxuICAgICAgZnVuY3Rpb24gc2l6ZUNhbnZhcygpIHtcbiAgICAgICAgX3NpemVDYW52YXMoKTtcbiAgICAgIH1cblxuICAgICAgc2l6ZUNhbnZhcygpO1xuXG4gICAgICAkKHdpbmRvdykuYmluZCgncmVzaXplJywgZnVuY3Rpb24gKCkge1xuICAgICAgICBzaXplQ2FudmFzKCk7XG4gICAgICB9KTtcblxuICAgICAgdmFyIGN0eCA9ICRjYW52YXNbMF0uZ2V0Q29udGV4dCgnMmQnKTtcblxuICAgICAgLy8gd3JpdGUgb3B0aW9ucyB0byBkYXRhXG4gICAgICB2YXIgZGF0YSA9ICRjb250YWluZXIuZGF0YSgnY3llZGdlYmVuZGVkaXRpbmcnKTtcbiAgICAgIGlmIChkYXRhID09IG51bGwpIHtcbiAgICAgICAgZGF0YSA9IHt9O1xuICAgICAgfVxuICAgICAgZGF0YS5vcHRpb25zID0gb3B0cztcblxuICAgICAgdmFyIG9wdENhY2hlO1xuXG4gICAgICBmdW5jdGlvbiBvcHRpb25zKCkge1xuICAgICAgICByZXR1cm4gb3B0Q2FjaGUgfHwgKG9wdENhY2hlID0gJGNvbnRhaW5lci5kYXRhKCdjeWVkZ2ViZW5kZWRpdGluZycpLm9wdGlvbnMpO1xuICAgICAgfVxuICAgICAgXG4gICAgICAvLyB3ZSB3aWxsIG5lZWQgdG8gY29udmVydCBtb2RlbCBwb3NpdG9ucyB0byByZW5kZXJlZCBwb3NpdGlvbnNcbiAgICAgIGZ1bmN0aW9uIGNvbnZlcnRUb1JlbmRlcmVkUG9zaXRpb24obW9kZWxQb3NpdGlvbikge1xuICAgICAgICB2YXIgcGFuID0gY3kucGFuKCk7XG4gICAgICAgIHZhciB6b29tID0gY3kuem9vbSgpO1xuXG4gICAgICAgIHZhciB4ID0gbW9kZWxQb3NpdGlvbi54ICogem9vbSArIHBhbi54O1xuICAgICAgICB2YXIgeSA9IG1vZGVsUG9zaXRpb24ueSAqIHpvb20gKyBwYW4ueTtcblxuICAgICAgICByZXR1cm4ge1xuICAgICAgICAgIHg6IHgsXG4gICAgICAgICAgeTogeVxuICAgICAgICB9O1xuICAgICAgfVxuXG4gICAgICBmdW5jdGlvbiBjbGVhckRyYXdzKHJlbmRlclNlbGVjdGVkQmVuZFNoYXBlcykge1xuXG4gICAgICAgIHZhciB3ID0gJGNvbnRhaW5lci53aWR0aCgpO1xuICAgICAgICB2YXIgaCA9ICRjb250YWluZXIuaGVpZ2h0KCk7XG5cbiAgICAgICAgY3R4LmNsZWFyUmVjdCgwLCAwLCB3LCBoKTtcbiAgICAgICAgXG4gICAgICAgIGlmKCByZW5kZXJTZWxlY3RlZEJlbmRTaGFwZXMgKSB7XG4gICAgICAgICAgdmFyIHNlbGVjdGVkRWRnZXMgPSBjeS5lZGdlcygnOnNlbGVjdGVkJyk7XG4gICAgICAgIFxuICAgICAgICAgIGZvciggdmFyIGkgPSAwOyBpIDwgc2VsZWN0ZWRFZGdlcy5sZW5ndGg7IGkrKyApIHtcbiAgICAgICAgICAgIHZhciBlZGdlID0gc2VsZWN0ZWRFZGdlc1tpXTtcbiAgICAgICAgICAgIHJlbmRlckJlbmRTaGFwZXMoZWRnZSk7XG4gICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICB9XG4gICAgICBcbiAgICAgIFxuICAgICAgLy8gcmVuZGVyIHRoZSBiZW5kIHNoYXBlcyBvZiB0aGUgZ2l2ZW4gZWRnZVxuICAgICAgZnVuY3Rpb24gcmVuZGVyQmVuZFNoYXBlcyhlZGdlKSB7XG4gICAgICAgIHZhciBjeSA9IGVkZ2UuY3koKTtcbiAgICAgICAgXG4gICAgICAgIGlmKCFlZGdlLmhhc0NsYXNzKCdlZGdlYmVuZGVkaXRpbmctaGFzYmVuZHBvaW50cycpKSB7XG4gICAgICAgICAgcmV0dXJuO1xuICAgICAgICB9XG4gICAgICAgIFxuICAgICAgICB2YXIgc2VncHRzID0gYmVuZFBvaW50VXRpbGl0aWVzLmdldFNlZ21lbnRQb2ludHMoZWRnZSk7Ly9lZGdlLl9wcml2YXRlLnJzY3JhdGNoLnNlZ3B0cztcbiAgICAgICAgdmFyIGxlbmd0aCA9IGdldEJlbmRTaGFwZXNMZW5naHQoZWRnZSk7XG4gICAgICAgIFxuICAgICAgICB2YXIgc3JjUG9zID0gZWRnZS5zb3VyY2UoKS5wb3NpdGlvbigpO1xuICAgICAgICB2YXIgdGd0UG9zID0gZWRnZS50YXJnZXQoKS5wb3NpdGlvbigpO1xuICAgICAgICBcbiAgICAgICAgdmFyIHdlaWdodHMgPSBlZGdlLmRhdGEoJ3dlaWdodHMnKTtcbiAgICAgICAgdmFyIGRpc3RhbmNlcyA9IGVkZ2UuZGF0YSgnZGlzdGFuY2VzJyk7XG5cbiAgICAgICAgZm9yKHZhciBpID0gMDsgc2VncHRzICYmIGkgPCBzZWdwdHMubGVuZ3RoOyBpID0gaSArIDIpe1xuICAgICAgICAgIHZhciBiZW5kWCA9IHNlZ3B0c1tpXTtcbiAgICAgICAgICB2YXIgYmVuZFkgPSBzZWdwdHNbaSArIDFdO1xuXG4gICAgICAgICAgdmFyIG9sZFN0eWxlID0gY3R4LmZpbGxTdHlsZTtcbiAgICAgICAgICBjdHguZmlsbFN0eWxlID0gZWRnZS5jc3MoJ2xpbmUtY29sb3InKTtcbiAgICAgICAgICByZW5kZXJCZW5kU2hhcGUoYmVuZFgsIGJlbmRZLCBsZW5ndGgpO1xuICAgICAgICAgIGN0eC5maWxsU3R5bGUgPSBvbGRTdHlsZTtcbiAgICAgICAgfVxuICAgICAgfVxuICAgICAgXG4gICAgICAvLyByZW5kZXIgYSBiZW5kIHNoYXBlIHdpdGggdGhlIGdpdmVuIHBhcmFtZXRlcnNcbiAgICAgIGZ1bmN0aW9uIHJlbmRlckJlbmRTaGFwZShiZW5kWCwgYmVuZFksIGxlbmd0aCkge1xuICAgICAgICAvLyBnZXQgdGhlIHRvcCBsZWZ0IGNvb3JkaW5hdGVzXG4gICAgICAgIHZhciB0b3BMZWZ0WCA9IGJlbmRYIC0gbGVuZ3RoIC8gMjtcbiAgICAgICAgdmFyIHRvcExlZnRZID0gYmVuZFkgLSBsZW5ndGggLyAyO1xuICAgICAgICBcbiAgICAgICAgLy8gY29udmVydCB0byByZW5kZXJlZCBwYXJhbWV0ZXJzXG4gICAgICAgIHZhciByZW5kZXJlZFRvcExlZnRQb3MgPSBjb252ZXJ0VG9SZW5kZXJlZFBvc2l0aW9uKHt4OiB0b3BMZWZ0WCwgeTogdG9wTGVmdFl9KTtcbiAgICAgICAgbGVuZ3RoICo9IGN5Lnpvb20oKTtcbiAgICAgICAgXG4gICAgICAgIC8vIHJlbmRlciBiZW5kIHNoYXBlXG4gICAgICAgIGN0eC5iZWdpblBhdGgoKTtcbiAgICAgICAgY3R4LnJlY3QocmVuZGVyZWRUb3BMZWZ0UG9zLngsIHJlbmRlcmVkVG9wTGVmdFBvcy55LCBsZW5ndGgsIGxlbmd0aCk7XG4gICAgICAgIGN0eC5maWxsKCk7XG4gICAgICAgIGN0eC5jbG9zZVBhdGgoKTtcbiAgICAgIH1cbiAgICAgIFxuICAgICAgLy8gZ2V0IHRoZSBsZW5ndGggb2YgYmVuZCBwb2ludHMgdG8gYmUgcmVuZGVyZWRcbiAgICAgIGZ1bmN0aW9uIGdldEJlbmRTaGFwZXNMZW5naHQoZWRnZSkge1xuICAgICAgICB2YXIgZmFjdG9yID0gNjtcbiAgICAgICAgdmFyIGxlbmd0aCA9IHBhcnNlRmxvYXQoZWRnZS5jc3MoJ3dpZHRoJykpICogZmFjdG9yO1xuICAgICAgICByZXR1cm4gbGVuZ3RoO1xuICAgICAgfVxuICAgICAgXG4gICAgICAvLyBjaGVjayBpZiB0aGUgcG9pbnQgcmVwcmVzZW50ZWQgYnkge3gsIHl9IGlzIGluc2lkZSB0aGUgYmVuZCBzaGFwZVxuICAgICAgZnVuY3Rpb24gY2hlY2tJZkluc2lkZUJlbmRTaGFwZSh4LCB5LCBsZW5ndGgsIGNlbnRlclgsIGNlbnRlclkpe1xuICAgICAgICB2YXIgbWluWCA9IGNlbnRlclggLSBsZW5ndGggLyAyO1xuICAgICAgICB2YXIgbWF4WCA9IGNlbnRlclggKyBsZW5ndGggLyAyO1xuICAgICAgICB2YXIgbWluWSA9IGNlbnRlclkgLSBsZW5ndGggLyAyO1xuICAgICAgICB2YXIgbWF4WSA9IGNlbnRlclkgKyBsZW5ndGggLyAyO1xuICAgICAgICBcbiAgICAgICAgdmFyIGluc2lkZSA9ICh4ID49IG1pblggJiYgeCA8PSBtYXhYKSAmJiAoeSA+PSBtaW5ZICYmIHkgPD0gbWF4WSk7XG4gICAgICAgIHJldHVybiBpbnNpZGU7XG4gICAgICB9XG5cbiAgICAgIC8vIGdldCB0Z2UgaW5kZXggb2YgYmVuZCBwb2ludCBjb250YWluaW5nIHRoZSBwb2ludCByZXByZXNlbnRlZCBieSB7eCwgeX1cbiAgICAgIGZ1bmN0aW9uIGdldENvbnRhaW5pbmdCZW5kU2hhcGVJbmRleCh4LCB5LCBlZGdlKSB7XG4gICAgICAgIGlmKGVkZ2UuZGF0YSgnd2VpZ2h0cycpID09IG51bGwgfHwgZWRnZS5kYXRhKCd3ZWlnaHRzJykubGVuZ2h0ID09IDApe1xuICAgICAgICAgIHJldHVybiAtMTtcbiAgICAgICAgfVxuXG4gICAgICAgIHZhciBzZWdwdHMgPSBlZGdlLl9wcml2YXRlLnJzY3JhdGNoLnNlZ3B0cztcbiAgICAgICAgdmFyIGxlbmd0aCA9IGdldEJlbmRTaGFwZXNMZW5naHQoZWRnZSk7XG5cbiAgICAgICAgZm9yKHZhciBpID0gMDsgc2VncHRzICYmIGkgPCBzZWdwdHMubGVuZ3RoOyBpID0gaSArIDIpe1xuICAgICAgICAgIHZhciBiZW5kWCA9IHNlZ3B0c1tpXTtcbiAgICAgICAgICB2YXIgYmVuZFkgPSBzZWdwdHNbaSArIDFdO1xuXG4gICAgICAgICAgdmFyIGluc2lkZSA9IGNoZWNrSWZJbnNpZGVCZW5kU2hhcGUoeCwgeSwgbGVuZ3RoLCBiZW5kWCwgYmVuZFkpO1xuICAgICAgICAgIGlmKGluc2lkZSl7XG4gICAgICAgICAgICByZXR1cm4gaSAvIDI7XG4gICAgICAgICAgfVxuICAgICAgICB9XG5cbiAgICAgICAgcmV0dXJuIC0xO1xuICAgICAgfTtcblxuICAgICAgLy8gbGFzdCBzdGF0dXMgb2YgZ2VzdHVyZXNcbiAgICAgIHZhciBsYXN0UGFubmluZ0VuYWJsZWQsIGxhc3Rab29taW5nRW5hYmxlZCwgbGFzdEJveFNlbGVjdGlvbkVuYWJsZWQ7XG4gICAgICBcbiAgICAgIC8vIHN0b3JlIHRoZSBjdXJyZW50IHN0YXR1cyBvZiBnZXN0dXJlcyBhbmQgc2V0IHRoZW0gdG8gZmFsc2VcbiAgICAgIGZ1bmN0aW9uIGRpc2FibGVHZXN0dXJlcygpIHtcbiAgICAgICAgbGFzdFBhbm5pbmdFbmFibGVkID0gY3kucGFubmluZ0VuYWJsZWQoKTtcbiAgICAgICAgbGFzdFpvb21pbmdFbmFibGVkID0gY3kuem9vbWluZ0VuYWJsZWQoKTtcbiAgICAgICAgbGFzdEJveFNlbGVjdGlvbkVuYWJsZWQgPSBjeS5ib3hTZWxlY3Rpb25FbmFibGVkKCk7XG5cbiAgICAgICAgY3kuem9vbWluZ0VuYWJsZWQoZmFsc2UpXG4gICAgICAgICAgLnBhbm5pbmdFbmFibGVkKGZhbHNlKVxuICAgICAgICAgIC5ib3hTZWxlY3Rpb25FbmFibGVkKGZhbHNlKTtcbiAgICAgIH1cbiAgICAgIFxuICAgICAgLy8gcmVzZXQgdGhlIGdlc3R1cmVzIGJ5IHRoZWlyIGxhdGVzdCBzdGF0dXNcbiAgICAgIGZ1bmN0aW9uIHJlc2V0R2VzdHVyZXMoKSB7XG4gICAgICAgIGN5Lnpvb21pbmdFbmFibGVkKGxhc3Rab29taW5nRW5hYmxlZClcbiAgICAgICAgICAucGFubmluZ0VuYWJsZWQobGFzdFBhbm5pbmdFbmFibGVkKVxuICAgICAgICAgIC5ib3hTZWxlY3Rpb25FbmFibGVkKGxhc3RCb3hTZWxlY3Rpb25FbmFibGVkKTtcbiAgICAgIH1cblxuICAgICAgJGNvbnRhaW5lci5jeXRvc2NhcGUoZnVuY3Rpb24gKGUpIHtcbiAgICAgICAgY3kgPSB0aGlzO1xuICAgICAgICBjbGVhckRyYXdzKHRydWUpO1xuICAgICAgICBcbiAgICAgICAgbGFzdFBhbm5pbmdFbmFibGVkID0gY3kucGFubmluZ0VuYWJsZWQoKTtcbiAgICAgICAgbGFzdFpvb21pbmdFbmFibGVkID0gY3kuem9vbWluZ0VuYWJsZWQoKTtcbiAgICAgICAgbGFzdEJveFNlbGVjdGlvbkVuYWJsZWQgPSBjeS5ib3hTZWxlY3Rpb25FbmFibGVkKCk7XG4gICAgICAgIFxuICAgICAgICBjeS5iaW5kKCd6b29tIHBhbicsIGVab29tID0gZnVuY3Rpb24gKCkge1xuICAgICAgICAgIGNsZWFyRHJhd3ModHJ1ZSk7XG4gICAgICAgIH0pO1xuXG4gICAgICAgIGN5Lm9uKCdwb3NpdGlvbicsICdub2RlJywgZVBvc2l0aW9uID0gZnVuY3Rpb24gKCkge1xuICAgICAgICAgIHZhciBub2RlID0gdGhpcztcbiAgICAgICAgICBcbiAgICAgICAgICBjbGVhckRyYXdzKHRydWUpO1xuICAgICAgICB9KTtcblxuICAgICAgICBjeS5vbigncmVtb3ZlJywgJ2VkZ2UnLCBlUmVtb3ZlID0gZnVuY3Rpb24gKCkge1xuICAgICAgICAgIHZhciBub2RlID0gdGhpcztcbiAgICAgICAgICBcbiAgICAgICAgICAvLyBUT0RPXG4gICAgICAgIH0pO1xuICAgICAgICBcbiAgICAgICAgY3kub24oJ3NlbGVjdCcsICdlZGdlJywgZVNlbGVjdCA9IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICB2YXIgZWRnZSA9IHRoaXM7XG4gICAgICAgICAgXG4gICAgICAgICAgcmVuZGVyQmVuZFNoYXBlcyhlZGdlKTtcbiAgICAgICAgfSk7XG4gICAgICAgIFxuICAgICAgICBjeS5vbigndW5zZWxlY3QnLCAnZWRnZScsIGVVbnNlbGVjdCA9IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICB2YXIgZWRnZSA9IHRoaXM7XG4gICAgICAgICAgXG4gICAgICAgICAgY2xlYXJEcmF3cyh0cnVlKTtcbiAgICAgICAgfSk7XG4gICAgICAgIFxuICAgICAgICB2YXIgbW92ZWRCZW5kSW5kZXg7XG4gICAgICAgIHZhciBtb3ZlZEJlbmRFZGdlO1xuICAgICAgICB2YXIgbW92ZUJlbmRQYXJhbTtcbiAgICAgICAgXG4gICAgICAgIGN5Lm9uKCd0YXBzdGFydCcsICdlZGdlJywgZVRhcFN0YXJ0ID0gZnVuY3Rpb24gKGV2ZW50KSB7XG4gICAgICAgICAgdmFyIGVkZ2UgPSB0aGlzO1xuICAgICAgICAgIFxuICAgICAgICAgIG1vdmVCZW5kUGFyYW0gPSB7XG4gICAgICAgICAgICBlZGdlOiBlZGdlLFxuICAgICAgICAgICAgd2VpZ2h0czogZWRnZS5kYXRhKCd3ZWlnaHRzJykgPyBbXS5jb25jYXQoZWRnZS5kYXRhKCd3ZWlnaHRzJykpIDogZWRnZS5kYXRhKCd3ZWlnaHRzJyksXG4gICAgICAgICAgICBkaXN0YW5jZXM6IGVkZ2UuZGF0YSgnZGlzdGFuY2VzJykgPyBbXS5jb25jYXQoZWRnZS5kYXRhKCdkaXN0YW5jZXMnKSkgOiBlZGdlLmRhdGEoJ2Rpc3RhbmNlcycpXG4gICAgICAgICAgfTtcbiAgICAgICAgICBcbiAgICAgICAgICB2YXIgY3lQb3NYID0gZXZlbnQuY3lQb3NpdGlvbi54O1xuICAgICAgICAgIHZhciBjeVBvc1kgPSBldmVudC5jeVBvc2l0aW9uLnk7XG5cbiAgICAgICAgICB2YXIgaW5kZXggPSBnZXRDb250YWluaW5nQmVuZFNoYXBlSW5kZXgoY3lQb3NYLCBjeVBvc1ksIGVkZ2UpO1xuICAgICAgICAgIGlmIChpbmRleCAhPSAtMSkge1xuICAgICAgICAgICAgbW92ZWRCZW5kSW5kZXggPSBpbmRleDtcbiAgICAgICAgICAgIG1vdmVkQmVuZEVkZ2UgPSBlZGdlO1xuICAgICAgICAgICAgZGlzYWJsZUdlc3R1cmVzKCk7XG4gICAgICAgICAgfVxuICAgICAgICB9KTtcbiAgICAgICAgXG4gICAgICAgIGN5Lm9uKCd0YXBkcmFnJywgZVRhcERyYWcgPSBmdW5jdGlvbiAoZXZlbnQpIHtcbiAgICAgICAgICB2YXIgZWRnZSA9IG1vdmVkQmVuZEVkZ2U7XG4gICAgICAgICAgXG4gICAgICAgICAgaWYgKG1vdmVkQmVuZEVkZ2UgPT09IHVuZGVmaW5lZCB8fCBtb3ZlZEJlbmRJbmRleCA9PT0gdW5kZWZpbmVkKSB7XG4gICAgICAgICAgICByZXR1cm47XG4gICAgICAgICAgfVxuXG4gICAgICAgICAgdmFyIHdlaWdodHMgPSBlZGdlLmRhdGEoJ3dlaWdodHMnKTtcbiAgICAgICAgICB2YXIgZGlzdGFuY2VzID0gZWRnZS5kYXRhKCdkaXN0YW5jZXMnKTtcblxuICAgICAgICAgIHZhciByZWxhdGl2ZUJlbmRQb3NpdGlvbiA9IGJlbmRQb2ludFV0aWxpdGllcy5jb252ZXJ0VG9SZWxhdGl2ZUJlbmRQb3NpdGlvbihlZGdlLCBldmVudC5jeVBvc2l0aW9uKTtcbiAgICAgICAgICB3ZWlnaHRzW21vdmVkQmVuZEluZGV4XSA9IHJlbGF0aXZlQmVuZFBvc2l0aW9uLndlaWdodDtcbiAgICAgICAgICBkaXN0YW5jZXNbbW92ZWRCZW5kSW5kZXhdID0gcmVsYXRpdmVCZW5kUG9zaXRpb24uZGlzdGFuY2U7XG5cbiAgICAgICAgICBlZGdlLmRhdGEoJ3dlaWdodHMnLCB3ZWlnaHRzKTtcbiAgICAgICAgICBlZGdlLmRhdGEoJ2Rpc3RhbmNlcycsIGRpc3RhbmNlcyk7XG4gICAgICAgICAgXG4gICAgICAgICAgY2xlYXJEcmF3cygpO1xuICAgICAgICAgIHJlbmRlckJlbmRTaGFwZXMoZWRnZSk7XG4gICAgICAgIH0pO1xuICAgICAgICBcbiAgICAgICAgY3kub24oJ3RhcGVuZCcsIGVUYXBFbmQgPSBmdW5jdGlvbiAoZXZlbnQpIHtcbiAgICAgICAgICB2YXIgZWRnZSA9IG1vdmVkQmVuZEVkZ2U7XG4gICAgICAgICAgXG4gICAgICAgICAgaWYgKGVkZ2UgIT09IHVuZGVmaW5lZCAmJiBtb3ZlQmVuZFBhcmFtICE9PSB1bmRlZmluZWQgJiYgZWRnZS5kYXRhKCd3ZWlnaHRzJylcbiAgICAgICAgICAgICAgICAgICYmIGVkZ2UuZGF0YSgnd2VpZ2h0cycpLnRvU3RyaW5nKCkgIT0gbW92ZUJlbmRQYXJhbS53ZWlnaHRzLnRvU3RyaW5nKCkpIHtcbiAgICAgICAgICAgIFxuICAgICAgICAgICAgaWYob3B0aW9ucygpLnVuZG9hYmxlKSB7XG4gICAgICAgICAgICAgIGN5LnVuZG9SZWRvKCkuZG8oJ2NoYW5nZUJlbmRQb2ludHMnLCBtb3ZlQmVuZFBhcmFtKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICB9XG5cbiAgICAgICAgICBtb3ZlZEJlbmRJbmRleCA9IHVuZGVmaW5lZDtcbiAgICAgICAgICBtb3ZlZEJlbmRFZGdlID0gdW5kZWZpbmVkO1xuICAgICAgICAgIG1vdmVCZW5kUGFyYW0gPSB1bmRlZmluZWQ7XG5cbiAgICAgICAgICByZXNldEdlc3R1cmVzKCk7XG4gICAgICAgICAgY2xlYXJEcmF3cyh0cnVlKTtcbiAgICAgICAgfSk7XG4gICAgICAgIFxuICAgICAgICBjeS5vbignY3h0dGFwJywgJ2VkZ2UnLCBlQ3h0VGFwID0gZnVuY3Rpb24gKGV2ZW50KSB7XG4gICAgICAgICAgdmFyIGVkZ2UgPSB0aGlzO1xuICAgICAgICAgIHZhciBjb250YWluZXJQb3MgPSAkKGN5LmNvbnRhaW5lcigpKS5wb3NpdGlvbigpO1xuXG4gICAgICAgICAgdmFyIGxlZnQgPSBjb250YWluZXJQb3MubGVmdCArIGV2ZW50LmN5UmVuZGVyZWRQb3NpdGlvbi54O1xuICAgICAgICAgIGxlZnQgPSBsZWZ0LnRvU3RyaW5nKCkgKyAncHgnO1xuXG4gICAgICAgICAgdmFyIHRvcCA9IGNvbnRhaW5lclBvcy50b3AgKyBldmVudC5jeVJlbmRlcmVkUG9zaXRpb24ueTtcbiAgICAgICAgICB0b3AgPSB0b3AudG9TdHJpbmcoKSArICdweCc7XG5cbiAgICAgICAgICAkKCcuY3ktZWRnZS1iZW5kLWVkaXRpbmctY3R4LW9wZXJhdGlvbicpLmNzcygnZGlzcGxheScsICdub25lJyk7XG5cbiAgICAgICAgICB2YXIgc2VsZWN0ZWRCZW5kSW5kZXggPSBnZXRDb250YWluaW5nQmVuZFNoYXBlSW5kZXgoZXZlbnQuY3lQb3NpdGlvbi54LCBldmVudC5jeVBvc2l0aW9uLnksIGVkZ2UpO1xuICAgICAgICAgIGlmIChzZWxlY3RlZEJlbmRJbmRleCA9PSAtMSkge1xuICAgICAgICAgICAgJGN0eEFkZEJlbmRQb2ludC5jc3MoJ2Rpc3BsYXknLCAnYmxvY2snKTtcbiAgICAgICAgICAgIGJlbmRQb2ludFV0aWxpdGllcy5jdXJyZW50Q3R4UG9zID0gZXZlbnQuY3lQb3NpdGlvbjtcbiAgICAgICAgICAgIGN0eE1lbnUgPSBkb2N1bWVudC5nZXRFbGVtZW50QnlJZChcImN5LWVkZ2UtYmVuZC1lZGl0aW5nLWN0eC1hZGQtYmVuZC1wb2ludFwiKTtcbiAgICAgICAgICB9XG4gICAgICAgICAgZWxzZSB7XG4gICAgICAgICAgICAkY3R4UmVtb3ZlQmVuZFBvaW50LmNzcygnZGlzcGxheScsICdibG9jaycpO1xuICAgICAgICAgICAgYmVuZFBvaW50VXRpbGl0aWVzLmN1cnJlbnRCZW5kSW5kZXggPSBzZWxlY3RlZEJlbmRJbmRleDtcbiAgICAgICAgICAgIGN0eE1lbnUgPSBkb2N1bWVudC5nZXRFbGVtZW50QnlJZChcImN5LWVkZ2UtYmVuZC1lZGl0aW5nLWN0eC1yZW1vdmUtYmVuZC1wb2ludFwiKTtcbiAgICAgICAgICB9XG5cbiAgICAgICAgICBjdHhNZW51LnN0eWxlLmRpc3BsYXkgPSBcImJsb2NrXCI7XG4gICAgICAgICAgY3R4TWVudS5zdHlsZS5sZWZ0ID0gbGVmdDtcbiAgICAgICAgICBjdHhNZW51LnN0eWxlLnRvcCA9IHRvcDtcblxuICAgICAgICAgIGJlbmRQb2ludFV0aWxpdGllcy5jdXJyZW50Q3R4RWRnZSA9IGVkZ2U7XG4gICAgICAgIH0pO1xuICAgICAgICBcbiAgICAgICAgY3kub24oJ3RhcCcsIGVUYXAgPSBmdW5jdGlvbihldmVudCkge1xuICAgICAgICAgICQoJy5jeS1lZGdlLWJlbmQtZWRpdGluZy1jdHgtb3BlcmF0aW9uJykuY3NzKCdkaXNwbGF5JywgJ25vbmUnKTtcbiAgICAgICAgfSk7XG4gICAgICAgIFxuICAgICAgICBjeS5vbignY2hhbmdlQmVuZFBvaW50cycsICdlZGdlJywgZnVuY3Rpb24oKSB7XG4gICAgICAgICAgdmFyIGVkZ2UgPSB0aGlzO1xuICAgICAgICAgIGNsZWFyRHJhd3MoKTtcbiAgICAgICAgICByZW5kZXJCZW5kU2hhcGVzKGVkZ2UpO1xuICAgICAgICB9KTtcbiAgICAgICAgXG4gICAgICB9KTtcblxuICAgICAgJGNvbnRhaW5lci5kYXRhKCdjeWVkZ2ViZW5kZWRpdGluZycsIGRhdGEpO1xuICAgIH0sXG4gICAgdW5iaW5kOiBmdW5jdGlvbiAoKSB7XG4gICAgICAgIGN5Lm9mZigncG9zaXRpb24nLCAnbm9kZScsIGVQb3NpdGlvbilcbiAgICAgICAgICAub2ZmKCdyZW1vdmUnLCAnbm9kZScsIGVSZW1vdmUpXG4gICAgICAgICAgLm9mZignc2VsZWN0JywgJ2VkZ2UnLCBlU2VsZWN0KVxuICAgICAgICAgIC5vZmYoJ3Vuc2VsZWN0JywgJ2VkZ2UnLCBlVW5zZWxlY3QpXG4gICAgICAgICAgLm9mZigndGFwc3RhcnQnLCAnZWRnZScsIGVUYXBTdGFydClcbiAgICAgICAgICAub2ZmKCd0YXBkcmFnJywgZVRhcERyYWcpXG4gICAgICAgICAgLm9mZigndGFwZW5kJywgZVRhcEVuZClcbiAgICAgICAgICAub2ZmKCdjeHR0YXAnLCBlQ3h0VGFwKVxuICAgICAgICAgIC5vZmYoJ3RhcCcsIGVUYXApO1xuXG4gICAgICAgIGN5LnVuYmluZChcInpvb20gcGFuXCIsIGVab29tKTtcbiAgICB9XG4gIH07XG5cbiAgaWYgKGZ1bmN0aW9uc1tmbl0pIHtcbiAgICByZXR1cm4gZnVuY3Rpb25zW2ZuXS5hcHBseSh0aGlzLCBBcnJheS5wcm90b3R5cGUuc2xpY2UuY2FsbChhcmd1bWVudHMsIDEpKTtcbiAgfSBlbHNlIGlmICh0eXBlb2YgZm4gPT0gJ29iamVjdCcgfHwgIWZuKSB7XG4gICAgcmV0dXJuIGZ1bmN0aW9ucy5pbml0LmFwcGx5KHRoaXMsIGFyZ3VtZW50cyk7XG4gIH0gZWxzZSB7XG4gICAgJC5lcnJvcignTm8gc3VjaCBmdW5jdGlvbiBgJyArIGZuICsgJ2AgZm9yIGN5dG9zY2FwZS5qcy1lZGdlLWJlbmQtZWRpdGluZycpO1xuICB9XG5cbiAgcmV0dXJuICQodGhpcyk7XG59OyIsInZhciBiZW5kUG9pbnRVdGlsaXRpZXMgPSB7XHJcbiAgY3VycmVudEN0eEVkZ2U6IHVuZGVmaW5lZCxcclxuICBjdXJyZW50Q3R4UG9zOiB1bmRlZmluZWQsXHJcbiAgY3VycmVudEJlbmRJbmRleDogdW5kZWZpbmVkLFxyXG4gIC8vIGluaXRpbGl6ZSBiZW5kIHBvaW50cyBiYXNlZCBvbiBiZW5kUG9zaXRpb25zRmNuXHJcbiAgaW5pdEJlbmRQb2ludHM6IGZ1bmN0aW9uKGJlbmRQb3NpdGlvbnNGY24pIHtcclxuICAgIHZhciBlZGdlcyA9IGN5LmVkZ2VzKCk7XHJcblxyXG4gICAgZm9yICh2YXIgaSA9IDA7IGkgPCBlZGdlcy5sZW5ndGg7IGkrKykge1xyXG4gICAgICB2YXIgZWRnZSA9IGVkZ2VzW2ldO1xyXG4gICAgICBcclxuICAgICAgLy8gZ2V0IHRoZSBiZW5kIHBvc2l0aW9ucyBieSBhcHBseWluZyB0aGUgZnVuY3Rpb24gZm9yIHRoaXMgZWRnZVxyXG4gICAgICB2YXIgYmVuZFBvc2l0aW9ucyA9IGJlbmRQb3NpdGlvbnNGY24uYXBwbHkodGhpcywgZWRnZSk7XHJcbiAgICAgIC8vIGNhbGN1bGF0ZSByZWxhdGl2ZSBiZW5kIHBvc2l0aW9uc1xyXG4gICAgICB2YXIgcmVzdWx0ID0gdGhpcy5jb252ZXJ0VG9SZWxhdGl2ZUJlbmRQb3NpdGlvbnMoZWRnZSwgYmVuZFBvc2l0aW9ucyk7XHJcblxyXG4gICAgICAvLyBpZiB0aGVyZSBhcmUgYmVuZCBwb2ludHMgc2V0IHdlaWdodHMgYW5kIGRpc3RhbmNlcyBhY2NvcmRpbmdseSBhbmQgYWRkIGNsYXNzIHRvIGVuYWJsZSBzdHlsZSBjaGFuZ2VzXHJcbiAgICAgIGlmIChyZXN1bHQuZGlzdGFuY2VzLmxlbmd0aCA+IDApIHtcclxuICAgICAgICBlZGdlLmRhdGEoJ3dlaWdodHMnLCByZXN1bHQud2VpZ2h0cyk7XHJcbiAgICAgICAgZWRnZS5kYXRhKCdkaXN0YW5jZXMnLCByZXN1bHQuZGlzdGFuY2VzKTtcclxuICAgICAgICBlZGdlLmFkZENsYXNzKCdlZGdlYmVuZGVkaXRpbmctaGFzYmVuZHBvaW50cycpO1xyXG4gICAgICB9XHJcbiAgICB9XHJcbiAgfSxcclxuICAvL0dldCB0aGUgZGlyZWN0aW9uIG9mIHRoZSBsaW5lIGZyb20gc291cmNlIHBvaW50IHRvIHRoZSB0YXJnZXQgcG9pbnRcclxuICBnZXRMaW5lRGlyZWN0aW9uOiBmdW5jdGlvbihzcmNQb2ludCwgdGd0UG9pbnQpe1xyXG4gICAgaWYoc3JjUG9pbnQueSA9PSB0Z3RQb2ludC55ICYmIHNyY1BvaW50LnggPCB0Z3RQb2ludC54KXtcclxuICAgICAgcmV0dXJuIDE7XHJcbiAgICB9XHJcbiAgICBpZihzcmNQb2ludC55IDwgdGd0UG9pbnQueSAmJiBzcmNQb2ludC54IDwgdGd0UG9pbnQueCl7XHJcbiAgICAgIHJldHVybiAyO1xyXG4gICAgfVxyXG4gICAgaWYoc3JjUG9pbnQueSA8IHRndFBvaW50LnkgJiYgc3JjUG9pbnQueCA9PSB0Z3RQb2ludC54KXtcclxuICAgICAgcmV0dXJuIDM7XHJcbiAgICB9XHJcbiAgICBpZihzcmNQb2ludC55IDwgdGd0UG9pbnQueSAmJiBzcmNQb2ludC54ID4gdGd0UG9pbnQueCl7XHJcbiAgICAgIHJldHVybiA0O1xyXG4gICAgfVxyXG4gICAgaWYoc3JjUG9pbnQueSA9PSB0Z3RQb2ludC55ICYmIHNyY1BvaW50LnggPiB0Z3RQb2ludC54KXtcclxuICAgICAgcmV0dXJuIDU7XHJcbiAgICB9XHJcbiAgICBpZihzcmNQb2ludC55ID4gdGd0UG9pbnQueSAmJiBzcmNQb2ludC54ID4gdGd0UG9pbnQueCl7XHJcbiAgICAgIHJldHVybiA2O1xyXG4gICAgfVxyXG4gICAgaWYoc3JjUG9pbnQueSA+IHRndFBvaW50LnkgJiYgc3JjUG9pbnQueCA9PSB0Z3RQb2ludC54KXtcclxuICAgICAgcmV0dXJuIDc7XHJcbiAgICB9XHJcbiAgICByZXR1cm4gODsvL2lmIHNyY1BvaW50LnkgPiB0Z3RQb2ludC55IGFuZCBzcmNQb2ludC54IDwgdGd0UG9pbnQueFxyXG4gIH0sXHJcbiAgZ2V0U3JjVGd0UG9pbnRzQW5kVGFuZ2VudHM6IGZ1bmN0aW9uIChlZGdlKSB7XHJcbiAgICB2YXIgc291cmNlTm9kZSA9IGVkZ2Uuc291cmNlKCk7XHJcbiAgICB2YXIgdGFyZ2V0Tm9kZSA9IGVkZ2UudGFyZ2V0KCk7XHJcbiAgICBcclxuICAgIHZhciB0Z3RQb3NpdGlvbiA9IHRhcmdldE5vZGUucG9zaXRpb24oKTtcclxuICAgIHZhciBzcmNQb3NpdGlvbiA9IHNvdXJjZU5vZGUucG9zaXRpb24oKTtcclxuICAgIFxyXG4gICAgdmFyIHNyY1BvaW50ID0gc291cmNlTm9kZS5wb3NpdGlvbigpO1xyXG4gICAgdmFyIHRndFBvaW50ID0gdGFyZ2V0Tm9kZS5wb3NpdGlvbigpO1xyXG5cclxuXHJcbiAgICB2YXIgbTEgPSAodGd0UG9pbnQueSAtIHNyY1BvaW50LnkpIC8gKHRndFBvaW50LnggLSBzcmNQb2ludC54KTtcclxuICAgIHZhciBtMiA9IC0xIC8gbTE7XHJcblxyXG4gICAgcmV0dXJuIHtcclxuICAgICAgbTE6IG0xLFxyXG4gICAgICBtMjogbTIsXHJcbiAgICAgIHNyY1BvaW50OiBzcmNQb2ludCxcclxuICAgICAgdGd0UG9pbnQ6IHRndFBvaW50XHJcbiAgICB9O1xyXG4gIH0sXHJcbiAgZ2V0SW50ZXJzZWN0aW9uOiBmdW5jdGlvbihlZGdlLCBwb2ludCwgc3JjVGd0UG9pbnRzQW5kVGFuZ2VudHMpe1xyXG4gICAgaWYgKHNyY1RndFBvaW50c0FuZFRhbmdlbnRzID09PSB1bmRlZmluZWQpIHtcclxuICAgICAgc3JjVGd0UG9pbnRzQW5kVGFuZ2VudHMgPSB0aGlzLmdldFNyY1RndFBvaW50c0FuZFRhbmdlbnRzKGVkZ2UpO1xyXG4gICAgfVxyXG5cclxuICAgIHZhciBzcmNQb2ludCA9IHNyY1RndFBvaW50c0FuZFRhbmdlbnRzLnNyY1BvaW50O1xyXG4gICAgdmFyIHRndFBvaW50ID0gc3JjVGd0UG9pbnRzQW5kVGFuZ2VudHMudGd0UG9pbnQ7XHJcbiAgICB2YXIgbTEgPSBzcmNUZ3RQb2ludHNBbmRUYW5nZW50cy5tMTtcclxuICAgIHZhciBtMiA9IHNyY1RndFBvaW50c0FuZFRhbmdlbnRzLm0yO1xyXG5cclxuICAgIHZhciBpbnRlcnNlY3RYO1xyXG4gICAgdmFyIGludGVyc2VjdFk7XHJcblxyXG4gICAgaWYobTEgPT0gSW5maW5pdHkgfHwgbTEgPT0gLUluZmluaXR5KXtcclxuICAgICAgaW50ZXJzZWN0WCA9IHNyY1BvaW50Lng7XHJcbiAgICAgIGludGVyc2VjdFkgPSBwb2ludC55O1xyXG4gICAgfVxyXG4gICAgZWxzZSBpZihtMSA9PSAwKXtcclxuICAgICAgaW50ZXJzZWN0WCA9IHBvaW50Lng7XHJcbiAgICAgIGludGVyc2VjdFkgPSBzcmNQb2ludC55O1xyXG4gICAgfVxyXG4gICAgZWxzZSB7XHJcbiAgICAgIHZhciBhMSA9IHNyY1BvaW50LnkgLSBtMSAqIHNyY1BvaW50Lng7XHJcbiAgICAgIHZhciBhMiA9IHBvaW50LnkgLSBtMiAqIHBvaW50Lng7XHJcblxyXG4gICAgICBpbnRlcnNlY3RYID0gKGEyIC0gYTEpIC8gKG0xIC0gbTIpO1xyXG4gICAgICBpbnRlcnNlY3RZID0gbTEgKiBpbnRlcnNlY3RYICsgYTE7XHJcbiAgICB9XHJcblxyXG4gICAgLy9JbnRlcnNlY3Rpb24gcG9pbnQgaXMgdGhlIGludGVyc2VjdGlvbiBvZiB0aGUgbGluZXMgcGFzc2luZyB0aHJvdWdoIHRoZSBub2RlcyBhbmRcclxuICAgIC8vcGFzc2luZyB0aHJvdWdoIHRoZSBiZW5kIHBvaW50IGFuZCBwZXJwZW5kaWN1bGFyIHRvIHRoZSBvdGhlciBsaW5lXHJcbiAgICB2YXIgaW50ZXJzZWN0aW9uUG9pbnQgPSB7XHJcbiAgICAgIHg6IGludGVyc2VjdFgsXHJcbiAgICAgIHk6IGludGVyc2VjdFlcclxuICAgIH07XHJcbiAgICBcclxuICAgIHJldHVybiBpbnRlcnNlY3Rpb25Qb2ludDtcclxuICB9LFxyXG4gIGdldFNlZ21lbnRQb2ludHM6IGZ1bmN0aW9uKGVkZ2UpIHtcclxuICAgIHZhciBzZWdwdHMgPSBbXTtcclxuXHJcbiAgICB2YXIgc2VnbWVudFdzID0gZWRnZS5wc3R5bGUoICdzZWdtZW50LXdlaWdodHMnICkucGZWYWx1ZTtcclxuICAgIHZhciBzZWdtZW50RHMgPSBlZGdlLnBzdHlsZSggJ3NlZ21lbnQtZGlzdGFuY2VzJyApLnBmVmFsdWU7XHJcbiAgICB2YXIgc2VnbWVudHNOID0gTWF0aC5taW4oIHNlZ21lbnRXcy5sZW5ndGgsIHNlZ21lbnREcy5sZW5ndGggKTtcclxuICAgIFxyXG4gICAgdmFyIHNyY1BvcyA9IGVkZ2Uuc291cmNlKCkucG9zaXRpb24oKTtcclxuICAgIHZhciB0Z3RQb3MgPSBlZGdlLnRhcmdldCgpLnBvc2l0aW9uKCk7XHJcblxyXG4gICAgdmFyIGR5ID0gKCB0Z3RQb3MueSAtIHNyY1Bvcy55ICk7XHJcbiAgICB2YXIgZHggPSAoIHRndFBvcy54IC0gc3JjUG9zLnggKTtcclxuICAgIFxyXG4gICAgdmFyIGwgPSBNYXRoLnNxcnQoIGR4ICogZHggKyBkeSAqIGR5ICk7XHJcblxyXG4gICAgdmFyIHZlY3RvciA9IHtcclxuICAgICAgeDogZHgsXHJcbiAgICAgIHk6IGR5XHJcbiAgICB9O1xyXG5cclxuICAgIHZhciB2ZWN0b3JOb3JtID0ge1xyXG4gICAgICB4OiB2ZWN0b3IueCAvIGwsXHJcbiAgICAgIHk6IHZlY3Rvci55IC8gbFxyXG4gICAgfTtcclxuICAgIFxyXG4gICAgdmFyIHZlY3Rvck5vcm1JbnZlcnNlID0ge1xyXG4gICAgICB4OiAtdmVjdG9yTm9ybS55LFxyXG4gICAgICB5OiB2ZWN0b3JOb3JtLnhcclxuICAgIH07XHJcblxyXG4gICAgZm9yKCB2YXIgcyA9IDA7IHMgPCBzZWdtZW50c047IHMrKyApe1xyXG4gICAgICB2YXIgdyA9IHNlZ21lbnRXc1sgcyBdO1xyXG4gICAgICB2YXIgZCA9IHNlZ21lbnREc1sgcyBdO1xyXG5cclxuICAgICAgLy8gZCA9IHN3YXBwZWREaXJlY3Rpb24gPyAtZCA6IGQ7XHJcbiAgICAgIC8vXHJcbiAgICAgIC8vIGQgPSBNYXRoLmFicyhkKTtcclxuXHJcbiAgICAgIC8vIHZhciB3MSA9ICFzd2FwcGVkRGlyZWN0aW9uID8gKDEgLSB3KSA6IHc7XHJcbiAgICAgIC8vIHZhciB3MiA9ICFzd2FwcGVkRGlyZWN0aW9uID8gdyA6ICgxIC0gdyk7XHJcblxyXG4gICAgICB2YXIgdzEgPSAoMSAtIHcpO1xyXG4gICAgICB2YXIgdzIgPSB3O1xyXG5cclxuICAgICAgdmFyIHBvc1B0cyA9IHtcclxuICAgICAgICB4MTogc3JjUG9zLngsXHJcbiAgICAgICAgeDI6IHRndFBvcy54LFxyXG4gICAgICAgIHkxOiBzcmNQb3MueSxcclxuICAgICAgICB5MjogdGd0UG9zLnlcclxuICAgICAgfTtcclxuXHJcbiAgICAgIHZhciBtaWRwdFB0cyA9IHBvc1B0cztcclxuICAgICAgXHJcbiAgICAgIFxyXG5cclxuICAgICAgdmFyIGFkanVzdGVkTWlkcHQgPSB7XHJcbiAgICAgICAgeDogbWlkcHRQdHMueDEgKiB3MSArIG1pZHB0UHRzLngyICogdzIsXHJcbiAgICAgICAgeTogbWlkcHRQdHMueTEgKiB3MSArIG1pZHB0UHRzLnkyICogdzJcclxuICAgICAgfTtcclxuXHJcbiAgICAgIHNlZ3B0cy5wdXNoKFxyXG4gICAgICAgIGFkanVzdGVkTWlkcHQueCArIHZlY3Rvck5vcm1JbnZlcnNlLnggKiBkLFxyXG4gICAgICAgIGFkanVzdGVkTWlkcHQueSArIHZlY3Rvck5vcm1JbnZlcnNlLnkgKiBkXHJcbiAgICAgICk7XHJcbiAgICB9XHJcbiAgICBcclxuICAgIHJldHVybiBzZWdwdHM7XHJcbiAgfSxcclxuLy8gIGNvbnZlcnRUb0JlbmRQb3NpdGlvbjogZnVuY3Rpb24oc3JjUG9zLCB0Z3RQb3MsIHdlaWdodCwgZGlzdGFuY2UpIHtcclxuLy8gICAgdmFyIHJlYWxQb3NYO1xyXG4vLyAgICB2YXIgcmVhbFBvc1k7XHJcbi8vICAgIFxyXG4vLyAgICB2YXIgbSA9IC0xIC8gKCAoIHRndFBvcy55IC0gc3JjUG9zLnkgKSAvICggdGd0UG9zLnggLSBzcmNQb3MueCApICk7XHJcbi8vICAgIFxyXG4vLyAgICB2YXIgY3Jvc3NpbmdFZGdlUG9zaXRpb24gPSB7XHJcbi8vICAgICAgeDogc3JjUG9zLnggKyAodGd0UG9zLnggLSBzcmNQb3MueCkgKiB3ZWlnaHQsXHJcbi8vICAgICAgeTogc3JjUG9zLnkgKyAodGd0UG9zLnkgLSBzcmNQb3MueSkgKiB3ZWlnaHRcclxuLy8gICAgfTtcclxuLy8gICAgXHJcbi8vICAgIGlmIChtID09IC1JbmZpbml0eSkge1xyXG4vLyAgICAgIHJlYWxQb3NYID0gY3Jvc3NpbmdFZGdlUG9zaXRpb24ueDtcclxuLy8gICAgICByZWFsUG9zWSA9IGNyb3NzaW5nRWRnZVBvc2l0aW9uLnkgKyBkaXN0YW5jZTtcclxuLy8gICAgfVxyXG4vLyAgICBlbHNlIHtcclxuLy8gICAgICB2YXIgeERpZmYgPSBkaXN0YW5jZSAvIE1hdGguc3FydCggKCBNYXRoLnBvdyhtLCAyKSArIDEgKSApO1xyXG4vLyAgICAgIHJlYWxQb3NYID0gY3Jvc3NpbmdFZGdlUG9zaXRpb24ueCArIE1hdGguc2lnbihtKSAqIHhEaWZmO1xyXG4vLyAgICAgIHJlYWxQb3NZID0gY3Jvc3NpbmdFZGdlUG9zaXRpb24ueSArIG0gKiB4RGlmZjtcclxuLy8gICAgfVxyXG4vLyBcclxuLy8gICAgcmV0dXJuIHtcclxuLy8gICAgICB4OiByZWFsUG9zWCxcclxuLy8gICAgICB5OiByZWFsUG9zWVxyXG4vLyAgICB9O1xyXG4vLyAgfSxcclxuICBjb252ZXJ0VG9SZWxhdGl2ZUJlbmRQb3NpdGlvbjogZnVuY3Rpb24gKGVkZ2UsIGJlbmRQb2ludCwgc3JjVGd0UG9pbnRzQW5kVGFuZ2VudHMpIHtcclxuICAgIGlmIChzcmNUZ3RQb2ludHNBbmRUYW5nZW50cyA9PT0gdW5kZWZpbmVkKSB7XHJcbiAgICAgIHNyY1RndFBvaW50c0FuZFRhbmdlbnRzID0gdGhpcy5nZXRTcmNUZ3RQb2ludHNBbmRUYW5nZW50cyhlZGdlKTtcclxuICAgIH1cclxuICAgIFxyXG4gICAgdmFyIGludGVyc2VjdGlvblBvaW50ID0gdGhpcy5nZXRJbnRlcnNlY3Rpb24oZWRnZSwgYmVuZFBvaW50LCBzcmNUZ3RQb2ludHNBbmRUYW5nZW50cyk7XHJcbiAgICB2YXIgaW50ZXJzZWN0WCA9IGludGVyc2VjdGlvblBvaW50Lng7XHJcbiAgICB2YXIgaW50ZXJzZWN0WSA9IGludGVyc2VjdGlvblBvaW50Lnk7XHJcbiAgICBcclxuICAgIHZhciBzcmNQb2ludCA9IHNyY1RndFBvaW50c0FuZFRhbmdlbnRzLnNyY1BvaW50O1xyXG4gICAgdmFyIHRndFBvaW50ID0gc3JjVGd0UG9pbnRzQW5kVGFuZ2VudHMudGd0UG9pbnQ7XHJcbiAgICBcclxuICAgIHZhciB3ZWlnaHQgPSBpbnRlcnNlY3RYID09IHNyY1BvaW50Lng/MDooaW50ZXJzZWN0WCAtIHNyY1BvaW50LngpIC8gKHRndFBvaW50LnggLSBzcmNQb2ludC54KTtcclxuICAgIHZhciBkaXN0YW5jZSA9IE1hdGguc3FydChNYXRoLnBvdygoaW50ZXJzZWN0WSAtIGJlbmRQb2ludC55KSwgMilcclxuICAgICAgICArIE1hdGgucG93KChpbnRlcnNlY3RYIC0gYmVuZFBvaW50LngpLCAyKSk7XHJcbiAgICBcclxuICAgIC8vR2V0IHRoZSBkaXJlY3Rpb24gb2YgdGhlIGxpbmUgZm9ybSBzb3VyY2UgcG9pbnQgdG8gdGFyZ2V0IHBvaW50XHJcbiAgICB2YXIgZGlyZWN0aW9uMSA9IHRoaXMuZ2V0TGluZURpcmVjdGlvbihzcmNQb2ludCwgdGd0UG9pbnQpO1xyXG4gICAgLy9HZXQgdGhlIGRpcmVjdGlvbiBvZiB0aGUgbGluZSBmcm9tIGludGVzZWN0aW9uIHBvaW50IHRvIGJlbmQgcG9pbnRcclxuICAgIHZhciBkaXJlY3Rpb24yID0gdGhpcy5nZXRMaW5lRGlyZWN0aW9uKGludGVyc2VjdGlvblBvaW50LCBiZW5kUG9pbnQpO1xyXG4gICAgXHJcbiAgICAvL0lmIHRoZSBkaWZmZXJlbmNlIGlzIG5vdCAtMiBhbmQgbm90IDYgdGhlbiB0aGUgZGlyZWN0aW9uIG9mIHRoZSBkaXN0YW5jZSBpcyBuZWdhdGl2ZVxyXG4gICAgaWYoZGlyZWN0aW9uMSAtIGRpcmVjdGlvbjIgIT0gLTIgJiYgZGlyZWN0aW9uMSAtIGRpcmVjdGlvbjIgIT0gNil7XHJcbiAgICAgIGlmKGRpc3RhbmNlICE9IDApXHJcbiAgICAgICAgZGlzdGFuY2UgPSAtMSAqIGRpc3RhbmNlO1xyXG4gICAgfVxyXG4gICAgXHJcbiAgICB2YXIgbWluRGlmZiA9IDAuMDAxO1xyXG4gICAgXHJcbiAgICBpZihNYXRoLmFicyh3ZWlnaHQgLSAwKSA8IG1pbkRpZmYpe1xyXG4gICAgICB3ZWlnaHQgPSBtaW5EaWZmO1xyXG4gICAgfVxyXG4gICAgZWxzZSBpZihNYXRoLmFicyh3ZWlnaHQgLSAxKSA8IG1pbkRpZmYpe1xyXG4gICAgICB3ZWlnaHQgPSAxIC0gbWluRGlmZjtcclxuICAgIH1cclxuICAgIFxyXG4gICAgcmV0dXJuIHtcclxuICAgICAgd2VpZ2h0OiB3ZWlnaHQsXHJcbiAgICAgIGRpc3RhbmNlOiBkaXN0YW5jZVxyXG4gICAgfTtcclxuICB9LFxyXG4gIGNvbnZlcnRUb1JlbGF0aXZlQmVuZFBvc2l0aW9uczogZnVuY3Rpb24gKGVkZ2UsIGJlbmRQb2ludHMpIHtcclxuICAgIHZhciBzcmNUZ3RQb2ludHNBbmRUYW5nZW50cyA9IHRoaXMuZ2V0U3JjVGd0UG9pbnRzQW5kVGFuZ2VudHMoZWRnZSk7XHJcbi8vICAgIHZhciBiZW5kUG9pbnRzID0gZWRnZS5kYXRhKCdiZW5kUG9pbnRQb3NpdGlvbnMnKTtcclxuICAgIC8vb3V0cHV0IHZhcmlhYmxlc1xyXG4gICAgdmFyIHdlaWdodHMgPSBbXTtcclxuICAgIHZhciBkaXN0YW5jZXMgPSBbXTtcclxuXHJcbiAgICBmb3IgKHZhciBpID0gMDsgYmVuZFBvaW50cyAmJiBpIDwgYmVuZFBvaW50cy5sZW5ndGg7IGkrKykge1xyXG4gICAgICB2YXIgYmVuZFBvaW50ID0gYmVuZFBvaW50c1tpXTtcclxuICAgICAgdmFyIHJlbGF0aXZlQmVuZFBvc2l0aW9uID0gdGhpcy5jb252ZXJ0VG9SZWxhdGl2ZUJlbmRQb3NpdGlvbihlZGdlLCBiZW5kUG9pbnQsIHNyY1RndFBvaW50c0FuZFRhbmdlbnRzKTtcclxuXHJcbiAgICAgIHdlaWdodHMucHVzaChyZWxhdGl2ZUJlbmRQb3NpdGlvbi53ZWlnaHQpO1xyXG4gICAgICBkaXN0YW5jZXMucHVzaChyZWxhdGl2ZUJlbmRQb3NpdGlvbi5kaXN0YW5jZSk7XHJcbiAgICB9XHJcblxyXG4gICAgcmV0dXJuIHtcclxuICAgICAgd2VpZ2h0czogd2VpZ2h0cyxcclxuICAgICAgZGlzdGFuY2VzOiBkaXN0YW5jZXNcclxuICAgIH07XHJcbiAgfSxcclxuICBnZXRTZWdtZW50RGlzdGFuY2VzU3RyaW5nOiBmdW5jdGlvbiAoZWRnZSkge1xyXG4gICAgdmFyIHN0ciA9IFwiXCI7XHJcblxyXG4gICAgdmFyIGRpc3RhbmNlcyA9IGVkZ2UuZGF0YSgnZGlzdGFuY2VzJyk7XHJcbiAgICBmb3IgKHZhciBpID0gMDsgZGlzdGFuY2VzICYmIGkgPCBkaXN0YW5jZXMubGVuZ3RoOyBpKyspIHtcclxuICAgICAgc3RyID0gc3RyICsgXCIgXCIgKyBkaXN0YW5jZXNbaV07XHJcbiAgICB9XHJcbiAgICBcclxuICAgIHJldHVybiBzdHI7XHJcbiAgfSxcclxuICBnZXRTZWdtZW50V2VpZ2h0c1N0cmluZzogZnVuY3Rpb24gKGVkZ2UpIHtcclxuICAgIHZhciBzdHIgPSBcIlwiO1xyXG5cclxuICAgIHZhciB3ZWlnaHRzID0gZWRnZS5kYXRhKCd3ZWlnaHRzJyk7XHJcbiAgICBmb3IgKHZhciBpID0gMDsgd2VpZ2h0cyAmJiBpIDwgd2VpZ2h0cy5sZW5ndGg7IGkrKykge1xyXG4gICAgICBzdHIgPSBzdHIgKyBcIiBcIiArIHdlaWdodHNbaV07XHJcbiAgICB9XHJcbiAgICBcclxuICAgIHJldHVybiBzdHI7XHJcbiAgfSxcclxuICBhZGRCZW5kUG9pbnQ6IGZ1bmN0aW9uKGVkZ2UsIG5ld0JlbmRQb2ludCkge1xyXG4gICAgaWYoZWRnZSA9PT0gdW5kZWZpbmVkIHx8IG5ld0JlbmRQb2ludCA9PT0gdW5kZWZpbmVkKXtcclxuICAgICAgZWRnZSA9IHRoaXMuY3VycmVudEN0eEVkZ2U7XHJcbiAgICAgIG5ld0JlbmRQb2ludCA9IHRoaXMuY3VycmVudEN0eFBvcztcclxuICAgIH1cclxuICAgIFxyXG4gICAgdmFyIHJlbGF0aXZlQmVuZFBvc2l0aW9uID0gdGhpcy5jb252ZXJ0VG9SZWxhdGl2ZUJlbmRQb3NpdGlvbihlZGdlLCBuZXdCZW5kUG9pbnQpO1xyXG4gICAgdmFyIG9yaWdpbmFsUG9pbnRXZWlnaHQgPSByZWxhdGl2ZUJlbmRQb3NpdGlvbi53ZWlnaHQ7XHJcbiAgICBcclxuICAgIHZhciBlZGdlU3RhcnRYID0gZWRnZS5fcHJpdmF0ZS5yc2NyYXRjaC5zdGFydFg7XHJcbiAgICB2YXIgZWRnZVN0YXJ0WSA9IGVkZ2UuX3ByaXZhdGUucnNjcmF0Y2guc3RhcnRZO1xyXG4gICAgdmFyIGVkZ2VFbmRYID0gZWRnZS5fcHJpdmF0ZS5yc2NyYXRjaC5lbmRYO1xyXG4gICAgdmFyIGVkZ2VFbmRZID0gZWRnZS5fcHJpdmF0ZS5yc2NyYXRjaC5lbmRZO1xyXG4gICAgXHJcbiAgICB2YXIgc3RhcnRXZWlnaHQgPSB0aGlzLmNvbnZlcnRUb1JlbGF0aXZlQmVuZFBvc2l0aW9uKGVkZ2UsIHt4OiBlZGdlU3RhcnRYLCB5OiBlZGdlU3RhcnRZfSkud2VpZ2h0O1xyXG4gICAgdmFyIGVuZFdlaWdodCA9IHRoaXMuY29udmVydFRvUmVsYXRpdmVCZW5kUG9zaXRpb24oZWRnZSwge3g6IGVkZ2VFbmRYLCB5OiBlZGdlRW5kWX0pLndlaWdodDtcclxuICAgIHZhciB3ZWlnaHRzV2l0aFRndFNyYyA9IFtzdGFydFdlaWdodF0uY29uY2F0KGVkZ2UuZGF0YSgnd2VpZ2h0cycpP2VkZ2UuZGF0YSgnd2VpZ2h0cycpOltdKS5jb25jYXQoW2VuZFdlaWdodF0pO1xyXG4gICAgXHJcbiAgICB2YXIgbWluRGlzdCA9IEluZmluaXR5O1xyXG4gICAgdmFyIGludGVyc2VjdGlvbjtcclxuICAgIHZhciBzZWdwdHNXaXRoVGd0U3JjID0gW2VkZ2VTdGFydFgsIGVkZ2VTdGFydFldXHJcbiAgICAgICAgICAgIC5jb25jYXQoZWRnZS5fcHJpdmF0ZS5yc2NyYXRjaC5zZWdwdHM/ZWRnZS5fcHJpdmF0ZS5yc2NyYXRjaC5zZWdwdHM6W10pXHJcbiAgICAgICAgICAgIC5jb25jYXQoW2VkZ2VFbmRYLCBlZGdlRW5kWV0pO1xyXG4gICAgdmFyIG5ld0JlbmRJbmRleCA9IC0xO1xyXG4gICAgXHJcbiAgICBmb3IodmFyIGkgPSAwOyBpIDwgd2VpZ2h0c1dpdGhUZ3RTcmMubGVuZ3RoIC0gMTsgaSsrKXtcclxuICAgICAgdmFyIHcxID0gd2VpZ2h0c1dpdGhUZ3RTcmNbaV07XHJcbiAgICAgIHZhciB3MiA9IHdlaWdodHNXaXRoVGd0U3JjW2kgKyAxXTtcclxuICAgICAgXHJcbiAgICAgIC8vY2hlY2sgaWYgdGhlIHdlaWdodCBpcyBiZXR3ZWVuIHcxIGFuZCB3MlxyXG4gICAgICBpZigob3JpZ2luYWxQb2ludFdlaWdodCA8PSB3MSAmJiBvcmlnaW5hbFBvaW50V2VpZ2h0ID49IHcyKSB8fCAob3JpZ2luYWxQb2ludFdlaWdodCA8PSB3MiAmJiBvcmlnaW5hbFBvaW50V2VpZ2h0ID49IHcxKSl7XHJcbiAgICAgICAgdmFyIHN0YXJ0WCA9IHNlZ3B0c1dpdGhUZ3RTcmNbMiAqIGldO1xyXG4gICAgICAgIHZhciBzdGFydFkgPSBzZWdwdHNXaXRoVGd0U3JjWzIgKiBpICsgMV07XHJcbiAgICAgICAgdmFyIGVuZFggPSBzZWdwdHNXaXRoVGd0U3JjWzIgKiBpICsgMl07XHJcbiAgICAgICAgdmFyIGVuZFkgPSBzZWdwdHNXaXRoVGd0U3JjWzIgKiBpICsgM107XHJcbiAgICAgICAgXHJcbiAgICAgICAgdmFyIHN0YXJ0ID0ge1xyXG4gICAgICAgICAgeDogc3RhcnRYLFxyXG4gICAgICAgICAgeTogc3RhcnRZXHJcbiAgICAgICAgfTtcclxuICAgICAgICBcclxuICAgICAgICB2YXIgZW5kID0ge1xyXG4gICAgICAgICAgeDogZW5kWCxcclxuICAgICAgICAgIHk6IGVuZFlcclxuICAgICAgICB9O1xyXG4gICAgICAgIFxyXG4gICAgICAgIHZhciBtMSA9ICggc3RhcnRZIC0gZW5kWSApIC8gKCBzdGFydFggLSBlbmRYICk7XHJcbiAgICAgICAgdmFyIG0yID0gLTEgLyBtMTtcclxuICAgICAgICBcclxuICAgICAgICB2YXIgc3JjVGd0UG9pbnRzQW5kVGFuZ2VudHMgPSB7XHJcbiAgICAgICAgICBzcmNQb2ludDogc3RhcnQsXHJcbiAgICAgICAgICB0Z3RQb2ludDogZW5kLFxyXG4gICAgICAgICAgbTE6IG0xLFxyXG4gICAgICAgICAgbTI6IG0yXHJcbiAgICAgICAgfTtcclxuICAgICAgICBcclxuICAgICAgICAvL2dldCB0aGUgaW50ZXJzZWN0aW9uIG9mIHRoZSBjdXJyZW50IHNlZ21lbnQgd2l0aCB0aGUgbmV3IGJlbmQgcG9pbnRcclxuICAgICAgICB2YXIgY3VycmVudEludGVyc2VjdGlvbiA9IHRoaXMuZ2V0SW50ZXJzZWN0aW9uKGVkZ2UsIG5ld0JlbmRQb2ludCwgc3JjVGd0UG9pbnRzQW5kVGFuZ2VudHMpO1xyXG4gICAgICAgIHZhciBkaXN0ID0gTWF0aC5zcXJ0KCBNYXRoLnBvdyggKG5ld0JlbmRQb2ludC54IC0gY3VycmVudEludGVyc2VjdGlvbi54KSwgMiApIFxyXG4gICAgICAgICAgICAgICAgKyBNYXRoLnBvdyggKG5ld0JlbmRQb2ludC55IC0gY3VycmVudEludGVyc2VjdGlvbi55KSwgMiApKTtcclxuICAgICAgICBcclxuICAgICAgICAvL1VwZGF0ZSB0aGUgbWluaW11bSBkaXN0YW5jZVxyXG4gICAgICAgIGlmKGRpc3QgPCBtaW5EaXN0KXtcclxuICAgICAgICAgIG1pbkRpc3QgPSBkaXN0O1xyXG4gICAgICAgICAgaW50ZXJzZWN0aW9uID0gY3VycmVudEludGVyc2VjdGlvbjtcclxuICAgICAgICAgIG5ld0JlbmRJbmRleCA9IGk7XHJcbiAgICAgICAgfVxyXG4gICAgICB9XHJcbiAgICB9XHJcbiAgICBcclxuICAgIGlmKGludGVyc2VjdGlvbiAhPT0gdW5kZWZpbmVkKXtcclxuICAgICAgbmV3QmVuZFBvaW50ID0gaW50ZXJzZWN0aW9uO1xyXG4gICAgfVxyXG4gICAgXHJcbiAgICByZWxhdGl2ZUJlbmRQb3NpdGlvbiA9IHRoaXMuY29udmVydFRvUmVsYXRpdmVCZW5kUG9zaXRpb24oZWRnZSwgbmV3QmVuZFBvaW50KTtcclxuICAgIFxyXG4gICAgaWYoaW50ZXJzZWN0aW9uID09PSB1bmRlZmluZWQpe1xyXG4gICAgICByZWxhdGl2ZUJlbmRQb3NpdGlvbi5kaXN0YW5jZSA9IDA7XHJcbiAgICB9XHJcblxyXG4gICAgdmFyIHdlaWdodHMgPSBlZGdlLmRhdGEoJ3dlaWdodHMnKTtcclxuICAgIHZhciBkaXN0YW5jZXMgPSBlZGdlLmRhdGEoJ2Rpc3RhbmNlcycpO1xyXG4gICAgXHJcbiAgICB3ZWlnaHRzID0gd2VpZ2h0cz93ZWlnaHRzOltdO1xyXG4gICAgZGlzdGFuY2VzID0gZGlzdGFuY2VzP2Rpc3RhbmNlczpbXTtcclxuICAgIFxyXG4gICAgaWYod2VpZ2h0cy5sZW5ndGggPT09IDApIHtcclxuICAgICAgbmV3QmVuZEluZGV4ID0gMDtcclxuICAgIH1cclxuICAgIFxyXG4vLyAgICB3ZWlnaHRzLnB1c2gocmVsYXRpdmVCZW5kUG9zaXRpb24ud2VpZ2h0KTtcclxuLy8gICAgZGlzdGFuY2VzLnB1c2gocmVsYXRpdmVCZW5kUG9zaXRpb24uZGlzdGFuY2UpO1xyXG4gICAgaWYobmV3QmVuZEluZGV4ICE9IC0xKXtcclxuICAgICAgd2VpZ2h0cy5zcGxpY2UobmV3QmVuZEluZGV4LCAwLCByZWxhdGl2ZUJlbmRQb3NpdGlvbi53ZWlnaHQpO1xyXG4gICAgICBkaXN0YW5jZXMuc3BsaWNlKG5ld0JlbmRJbmRleCwgMCwgcmVsYXRpdmVCZW5kUG9zaXRpb24uZGlzdGFuY2UpO1xyXG4gICAgfVxyXG4gICBcclxuICAgIGVkZ2UuZGF0YSgnd2VpZ2h0cycsIHdlaWdodHMpO1xyXG4gICAgZWRnZS5kYXRhKCdkaXN0YW5jZXMnLCBkaXN0YW5jZXMpO1xyXG4gICAgXHJcbiAgICBlZGdlLmFkZENsYXNzKCdlZGdlYmVuZGVkaXRpbmctaGFzYmVuZHBvaW50cycpO1xyXG4gICAgXHJcbiAgICByZXR1cm4gcmVsYXRpdmVCZW5kUG9zaXRpb247XHJcbiAgfSxcclxuICByZW1vdmVCZW5kUG9pbnQ6IGZ1bmN0aW9uKGVkZ2UsIGJlbmRQb2ludEluZGV4KXtcclxuICAgIGlmKGVkZ2UgPT09IHVuZGVmaW5lZCB8fCBiZW5kUG9pbnRJbmRleCA9PT0gdW5kZWZpbmVkKXtcclxuICAgICAgZWRnZSA9IHRoaXMuY3VycmVudEN0eEVkZ2U7XHJcbiAgICAgIGJlbmRQb2ludEluZGV4ID0gdGhpcy5jdXJyZW50QmVuZEluZGV4O1xyXG4gICAgfVxyXG4gICAgXHJcbiAgICB2YXIgZGlzdGFuY2VzID0gZWRnZS5kYXRhKCdkaXN0YW5jZXMnKTtcclxuICAgIHZhciB3ZWlnaHRzID0gZWRnZS5kYXRhKCd3ZWlnaHRzJyk7XHJcbiAgICBcclxuICAgIGRpc3RhbmNlcy5zcGxpY2UoYmVuZFBvaW50SW5kZXgsIDEpO1xyXG4gICAgd2VpZ2h0cy5zcGxpY2UoYmVuZFBvaW50SW5kZXgsIDEpO1xyXG4gICAgXHJcbiAgICBcclxuICAgIGlmKGRpc3RhbmNlcy5sZW5ndGggPT0gMCB8fCB3ZWlnaHRzLmxlbmdodCA9PSAwKXtcclxuICAgICAgZWRnZS5yZW1vdmVDbGFzcygnZWRnZWJlbmRlZGl0aW5nLWhhc2JlbmRwb2ludHMnKTtcclxuICAgIH1cclxuICAgIGVsc2Uge1xyXG4gICAgICBlZGdlLmRhdGEoJ2Rpc3RhbmNlcycsIGRpc3RhbmNlcyk7XHJcbiAgICAgIGVkZ2UuZGF0YSgnd2VpZ2h0cycsIHdlaWdodHMpO1xyXG4gICAgfVxyXG4gIH1cclxufTtcclxuXHJcbm1vZHVsZS5leHBvcnRzID0gYmVuZFBvaW50VXRpbGl0aWVzOyIsInZhciBkZWJvdW5jZSA9IChmdW5jdGlvbiAoKSB7XHJcbiAgLyoqXHJcbiAgICogbG9kYXNoIDMuMS4xIChDdXN0b20gQnVpbGQpIDxodHRwczovL2xvZGFzaC5jb20vPlxyXG4gICAqIEJ1aWxkOiBgbG9kYXNoIG1vZGVybiBtb2R1bGFyaXplIGV4cG9ydHM9XCJucG1cIiAtbyAuL2BcclxuICAgKiBDb3B5cmlnaHQgMjAxMi0yMDE1IFRoZSBEb2pvIEZvdW5kYXRpb24gPGh0dHA6Ly9kb2pvZm91bmRhdGlvbi5vcmcvPlxyXG4gICAqIEJhc2VkIG9uIFVuZGVyc2NvcmUuanMgMS44LjMgPGh0dHA6Ly91bmRlcnNjb3JlanMub3JnL0xJQ0VOU0U+XHJcbiAgICogQ29weXJpZ2h0IDIwMDktMjAxNSBKZXJlbXkgQXNoa2VuYXMsIERvY3VtZW50Q2xvdWQgYW5kIEludmVzdGlnYXRpdmUgUmVwb3J0ZXJzICYgRWRpdG9yc1xyXG4gICAqIEF2YWlsYWJsZSB1bmRlciBNSVQgbGljZW5zZSA8aHR0cHM6Ly9sb2Rhc2guY29tL2xpY2Vuc2U+XHJcbiAgICovXHJcbiAgLyoqIFVzZWQgYXMgdGhlIGBUeXBlRXJyb3JgIG1lc3NhZ2UgZm9yIFwiRnVuY3Rpb25zXCIgbWV0aG9kcy4gKi9cclxuICB2YXIgRlVOQ19FUlJPUl9URVhUID0gJ0V4cGVjdGVkIGEgZnVuY3Rpb24nO1xyXG5cclxuICAvKiBOYXRpdmUgbWV0aG9kIHJlZmVyZW5jZXMgZm9yIHRob3NlIHdpdGggdGhlIHNhbWUgbmFtZSBhcyBvdGhlciBgbG9kYXNoYCBtZXRob2RzLiAqL1xyXG4gIHZhciBuYXRpdmVNYXggPSBNYXRoLm1heCxcclxuICAgICAgICAgIG5hdGl2ZU5vdyA9IERhdGUubm93O1xyXG5cclxuICAvKipcclxuICAgKiBHZXRzIHRoZSBudW1iZXIgb2YgbWlsbGlzZWNvbmRzIHRoYXQgaGF2ZSBlbGFwc2VkIHNpbmNlIHRoZSBVbml4IGVwb2NoXHJcbiAgICogKDEgSmFudWFyeSAxOTcwIDAwOjAwOjAwIFVUQykuXHJcbiAgICpcclxuICAgKiBAc3RhdGljXHJcbiAgICogQG1lbWJlck9mIF9cclxuICAgKiBAY2F0ZWdvcnkgRGF0ZVxyXG4gICAqIEBleGFtcGxlXHJcbiAgICpcclxuICAgKiBfLmRlZmVyKGZ1bmN0aW9uKHN0YW1wKSB7XHJcbiAgICogICBjb25zb2xlLmxvZyhfLm5vdygpIC0gc3RhbXApO1xyXG4gICAqIH0sIF8ubm93KCkpO1xyXG4gICAqIC8vID0+IGxvZ3MgdGhlIG51bWJlciBvZiBtaWxsaXNlY29uZHMgaXQgdG9vayBmb3IgdGhlIGRlZmVycmVkIGZ1bmN0aW9uIHRvIGJlIGludm9rZWRcclxuICAgKi9cclxuICB2YXIgbm93ID0gbmF0aXZlTm93IHx8IGZ1bmN0aW9uICgpIHtcclxuICAgIHJldHVybiBuZXcgRGF0ZSgpLmdldFRpbWUoKTtcclxuICB9O1xyXG5cclxuICAvKipcclxuICAgKiBDcmVhdGVzIGEgZGVib3VuY2VkIGZ1bmN0aW9uIHRoYXQgZGVsYXlzIGludm9raW5nIGBmdW5jYCB1bnRpbCBhZnRlciBgd2FpdGBcclxuICAgKiBtaWxsaXNlY29uZHMgaGF2ZSBlbGFwc2VkIHNpbmNlIHRoZSBsYXN0IHRpbWUgdGhlIGRlYm91bmNlZCBmdW5jdGlvbiB3YXNcclxuICAgKiBpbnZva2VkLiBUaGUgZGVib3VuY2VkIGZ1bmN0aW9uIGNvbWVzIHdpdGggYSBgY2FuY2VsYCBtZXRob2QgdG8gY2FuY2VsXHJcbiAgICogZGVsYXllZCBpbnZvY2F0aW9ucy4gUHJvdmlkZSBhbiBvcHRpb25zIG9iamVjdCB0byBpbmRpY2F0ZSB0aGF0IGBmdW5jYFxyXG4gICAqIHNob3VsZCBiZSBpbnZva2VkIG9uIHRoZSBsZWFkaW5nIGFuZC9vciB0cmFpbGluZyBlZGdlIG9mIHRoZSBgd2FpdGAgdGltZW91dC5cclxuICAgKiBTdWJzZXF1ZW50IGNhbGxzIHRvIHRoZSBkZWJvdW5jZWQgZnVuY3Rpb24gcmV0dXJuIHRoZSByZXN1bHQgb2YgdGhlIGxhc3RcclxuICAgKiBgZnVuY2AgaW52b2NhdGlvbi5cclxuICAgKlxyXG4gICAqICoqTm90ZToqKiBJZiBgbGVhZGluZ2AgYW5kIGB0cmFpbGluZ2Agb3B0aW9ucyBhcmUgYHRydWVgLCBgZnVuY2AgaXMgaW52b2tlZFxyXG4gICAqIG9uIHRoZSB0cmFpbGluZyBlZGdlIG9mIHRoZSB0aW1lb3V0IG9ubHkgaWYgdGhlIHRoZSBkZWJvdW5jZWQgZnVuY3Rpb24gaXNcclxuICAgKiBpbnZva2VkIG1vcmUgdGhhbiBvbmNlIGR1cmluZyB0aGUgYHdhaXRgIHRpbWVvdXQuXHJcbiAgICpcclxuICAgKiBTZWUgW0RhdmlkIENvcmJhY2hvJ3MgYXJ0aWNsZV0oaHR0cDovL2RydXBhbG1vdGlvbi5jb20vYXJ0aWNsZS9kZWJvdW5jZS1hbmQtdGhyb3R0bGUtdmlzdWFsLWV4cGxhbmF0aW9uKVxyXG4gICAqIGZvciBkZXRhaWxzIG92ZXIgdGhlIGRpZmZlcmVuY2VzIGJldHdlZW4gYF8uZGVib3VuY2VgIGFuZCBgXy50aHJvdHRsZWAuXHJcbiAgICpcclxuICAgKiBAc3RhdGljXHJcbiAgICogQG1lbWJlck9mIF9cclxuICAgKiBAY2F0ZWdvcnkgRnVuY3Rpb25cclxuICAgKiBAcGFyYW0ge0Z1bmN0aW9ufSBmdW5jIFRoZSBmdW5jdGlvbiB0byBkZWJvdW5jZS5cclxuICAgKiBAcGFyYW0ge251bWJlcn0gW3dhaXQ9MF0gVGhlIG51bWJlciBvZiBtaWxsaXNlY29uZHMgdG8gZGVsYXkuXHJcbiAgICogQHBhcmFtIHtPYmplY3R9IFtvcHRpb25zXSBUaGUgb3B0aW9ucyBvYmplY3QuXHJcbiAgICogQHBhcmFtIHtib29sZWFufSBbb3B0aW9ucy5sZWFkaW5nPWZhbHNlXSBTcGVjaWZ5IGludm9raW5nIG9uIHRoZSBsZWFkaW5nXHJcbiAgICogIGVkZ2Ugb2YgdGhlIHRpbWVvdXQuXHJcbiAgICogQHBhcmFtIHtudW1iZXJ9IFtvcHRpb25zLm1heFdhaXRdIFRoZSBtYXhpbXVtIHRpbWUgYGZ1bmNgIGlzIGFsbG93ZWQgdG8gYmVcclxuICAgKiAgZGVsYXllZCBiZWZvcmUgaXQncyBpbnZva2VkLlxyXG4gICAqIEBwYXJhbSB7Ym9vbGVhbn0gW29wdGlvbnMudHJhaWxpbmc9dHJ1ZV0gU3BlY2lmeSBpbnZva2luZyBvbiB0aGUgdHJhaWxpbmdcclxuICAgKiAgZWRnZSBvZiB0aGUgdGltZW91dC5cclxuICAgKiBAcmV0dXJucyB7RnVuY3Rpb259IFJldHVybnMgdGhlIG5ldyBkZWJvdW5jZWQgZnVuY3Rpb24uXHJcbiAgICogQGV4YW1wbGVcclxuICAgKlxyXG4gICAqIC8vIGF2b2lkIGNvc3RseSBjYWxjdWxhdGlvbnMgd2hpbGUgdGhlIHdpbmRvdyBzaXplIGlzIGluIGZsdXhcclxuICAgKiBqUXVlcnkod2luZG93KS5vbigncmVzaXplJywgXy5kZWJvdW5jZShjYWxjdWxhdGVMYXlvdXQsIDE1MCkpO1xyXG4gICAqXHJcbiAgICogLy8gaW52b2tlIGBzZW5kTWFpbGAgd2hlbiB0aGUgY2xpY2sgZXZlbnQgaXMgZmlyZWQsIGRlYm91bmNpbmcgc3Vic2VxdWVudCBjYWxsc1xyXG4gICAqIGpRdWVyeSgnI3Bvc3Rib3gnKS5vbignY2xpY2snLCBfLmRlYm91bmNlKHNlbmRNYWlsLCAzMDAsIHtcclxuICAgKiAgICdsZWFkaW5nJzogdHJ1ZSxcclxuICAgKiAgICd0cmFpbGluZyc6IGZhbHNlXHJcbiAgICogfSkpO1xyXG4gICAqXHJcbiAgICogLy8gZW5zdXJlIGBiYXRjaExvZ2AgaXMgaW52b2tlZCBvbmNlIGFmdGVyIDEgc2Vjb25kIG9mIGRlYm91bmNlZCBjYWxsc1xyXG4gICAqIHZhciBzb3VyY2UgPSBuZXcgRXZlbnRTb3VyY2UoJy9zdHJlYW0nKTtcclxuICAgKiBqUXVlcnkoc291cmNlKS5vbignbWVzc2FnZScsIF8uZGVib3VuY2UoYmF0Y2hMb2csIDI1MCwge1xyXG4gICAqICAgJ21heFdhaXQnOiAxMDAwXHJcbiAgICogfSkpO1xyXG4gICAqXHJcbiAgICogLy8gY2FuY2VsIGEgZGVib3VuY2VkIGNhbGxcclxuICAgKiB2YXIgdG9kb0NoYW5nZXMgPSBfLmRlYm91bmNlKGJhdGNoTG9nLCAxMDAwKTtcclxuICAgKiBPYmplY3Qub2JzZXJ2ZShtb2RlbHMudG9kbywgdG9kb0NoYW5nZXMpO1xyXG4gICAqXHJcbiAgICogT2JqZWN0Lm9ic2VydmUobW9kZWxzLCBmdW5jdGlvbihjaGFuZ2VzKSB7XHJcbiAgICogICBpZiAoXy5maW5kKGNoYW5nZXMsIHsgJ3VzZXInOiAndG9kbycsICd0eXBlJzogJ2RlbGV0ZSd9KSkge1xyXG4gICAqICAgICB0b2RvQ2hhbmdlcy5jYW5jZWwoKTtcclxuICAgKiAgIH1cclxuICAgKiB9LCBbJ2RlbGV0ZSddKTtcclxuICAgKlxyXG4gICAqIC8vIC4uLmF0IHNvbWUgcG9pbnQgYG1vZGVscy50b2RvYCBpcyBjaGFuZ2VkXHJcbiAgICogbW9kZWxzLnRvZG8uY29tcGxldGVkID0gdHJ1ZTtcclxuICAgKlxyXG4gICAqIC8vIC4uLmJlZm9yZSAxIHNlY29uZCBoYXMgcGFzc2VkIGBtb2RlbHMudG9kb2AgaXMgZGVsZXRlZFxyXG4gICAqIC8vIHdoaWNoIGNhbmNlbHMgdGhlIGRlYm91bmNlZCBgdG9kb0NoYW5nZXNgIGNhbGxcclxuICAgKiBkZWxldGUgbW9kZWxzLnRvZG87XHJcbiAgICovXHJcbiAgZnVuY3Rpb24gZGVib3VuY2UoZnVuYywgd2FpdCwgb3B0aW9ucykge1xyXG4gICAgdmFyIGFyZ3MsXHJcbiAgICAgICAgICAgIG1heFRpbWVvdXRJZCxcclxuICAgICAgICAgICAgcmVzdWx0LFxyXG4gICAgICAgICAgICBzdGFtcCxcclxuICAgICAgICAgICAgdGhpc0FyZyxcclxuICAgICAgICAgICAgdGltZW91dElkLFxyXG4gICAgICAgICAgICB0cmFpbGluZ0NhbGwsXHJcbiAgICAgICAgICAgIGxhc3RDYWxsZWQgPSAwLFxyXG4gICAgICAgICAgICBtYXhXYWl0ID0gZmFsc2UsXHJcbiAgICAgICAgICAgIHRyYWlsaW5nID0gdHJ1ZTtcclxuXHJcbiAgICBpZiAodHlwZW9mIGZ1bmMgIT0gJ2Z1bmN0aW9uJykge1xyXG4gICAgICB0aHJvdyBuZXcgVHlwZUVycm9yKEZVTkNfRVJST1JfVEVYVCk7XHJcbiAgICB9XHJcbiAgICB3YWl0ID0gd2FpdCA8IDAgPyAwIDogKCt3YWl0IHx8IDApO1xyXG4gICAgaWYgKG9wdGlvbnMgPT09IHRydWUpIHtcclxuICAgICAgdmFyIGxlYWRpbmcgPSB0cnVlO1xyXG4gICAgICB0cmFpbGluZyA9IGZhbHNlO1xyXG4gICAgfSBlbHNlIGlmIChpc09iamVjdChvcHRpb25zKSkge1xyXG4gICAgICBsZWFkaW5nID0gISFvcHRpb25zLmxlYWRpbmc7XHJcbiAgICAgIG1heFdhaXQgPSAnbWF4V2FpdCcgaW4gb3B0aW9ucyAmJiBuYXRpdmVNYXgoK29wdGlvbnMubWF4V2FpdCB8fCAwLCB3YWl0KTtcclxuICAgICAgdHJhaWxpbmcgPSAndHJhaWxpbmcnIGluIG9wdGlvbnMgPyAhIW9wdGlvbnMudHJhaWxpbmcgOiB0cmFpbGluZztcclxuICAgIH1cclxuXHJcbiAgICBmdW5jdGlvbiBjYW5jZWwoKSB7XHJcbiAgICAgIGlmICh0aW1lb3V0SWQpIHtcclxuICAgICAgICBjbGVhclRpbWVvdXQodGltZW91dElkKTtcclxuICAgICAgfVxyXG4gICAgICBpZiAobWF4VGltZW91dElkKSB7XHJcbiAgICAgICAgY2xlYXJUaW1lb3V0KG1heFRpbWVvdXRJZCk7XHJcbiAgICAgIH1cclxuICAgICAgbGFzdENhbGxlZCA9IDA7XHJcbiAgICAgIG1heFRpbWVvdXRJZCA9IHRpbWVvdXRJZCA9IHRyYWlsaW5nQ2FsbCA9IHVuZGVmaW5lZDtcclxuICAgIH1cclxuXHJcbiAgICBmdW5jdGlvbiBjb21wbGV0ZShpc0NhbGxlZCwgaWQpIHtcclxuICAgICAgaWYgKGlkKSB7XHJcbiAgICAgICAgY2xlYXJUaW1lb3V0KGlkKTtcclxuICAgICAgfVxyXG4gICAgICBtYXhUaW1lb3V0SWQgPSB0aW1lb3V0SWQgPSB0cmFpbGluZ0NhbGwgPSB1bmRlZmluZWQ7XHJcbiAgICAgIGlmIChpc0NhbGxlZCkge1xyXG4gICAgICAgIGxhc3RDYWxsZWQgPSBub3coKTtcclxuICAgICAgICByZXN1bHQgPSBmdW5jLmFwcGx5KHRoaXNBcmcsIGFyZ3MpO1xyXG4gICAgICAgIGlmICghdGltZW91dElkICYmICFtYXhUaW1lb3V0SWQpIHtcclxuICAgICAgICAgIGFyZ3MgPSB0aGlzQXJnID0gdW5kZWZpbmVkO1xyXG4gICAgICAgIH1cclxuICAgICAgfVxyXG4gICAgfVxyXG5cclxuICAgIGZ1bmN0aW9uIGRlbGF5ZWQoKSB7XHJcbiAgICAgIHZhciByZW1haW5pbmcgPSB3YWl0IC0gKG5vdygpIC0gc3RhbXApO1xyXG4gICAgICBpZiAocmVtYWluaW5nIDw9IDAgfHwgcmVtYWluaW5nID4gd2FpdCkge1xyXG4gICAgICAgIGNvbXBsZXRlKHRyYWlsaW5nQ2FsbCwgbWF4VGltZW91dElkKTtcclxuICAgICAgfSBlbHNlIHtcclxuICAgICAgICB0aW1lb3V0SWQgPSBzZXRUaW1lb3V0KGRlbGF5ZWQsIHJlbWFpbmluZyk7XHJcbiAgICAgIH1cclxuICAgIH1cclxuXHJcbiAgICBmdW5jdGlvbiBtYXhEZWxheWVkKCkge1xyXG4gICAgICBjb21wbGV0ZSh0cmFpbGluZywgdGltZW91dElkKTtcclxuICAgIH1cclxuXHJcbiAgICBmdW5jdGlvbiBkZWJvdW5jZWQoKSB7XHJcbiAgICAgIGFyZ3MgPSBhcmd1bWVudHM7XHJcbiAgICAgIHN0YW1wID0gbm93KCk7XHJcbiAgICAgIHRoaXNBcmcgPSB0aGlzO1xyXG4gICAgICB0cmFpbGluZ0NhbGwgPSB0cmFpbGluZyAmJiAodGltZW91dElkIHx8ICFsZWFkaW5nKTtcclxuXHJcbiAgICAgIGlmIChtYXhXYWl0ID09PSBmYWxzZSkge1xyXG4gICAgICAgIHZhciBsZWFkaW5nQ2FsbCA9IGxlYWRpbmcgJiYgIXRpbWVvdXRJZDtcclxuICAgICAgfSBlbHNlIHtcclxuICAgICAgICBpZiAoIW1heFRpbWVvdXRJZCAmJiAhbGVhZGluZykge1xyXG4gICAgICAgICAgbGFzdENhbGxlZCA9IHN0YW1wO1xyXG4gICAgICAgIH1cclxuICAgICAgICB2YXIgcmVtYWluaW5nID0gbWF4V2FpdCAtIChzdGFtcCAtIGxhc3RDYWxsZWQpLFxyXG4gICAgICAgICAgICAgICAgaXNDYWxsZWQgPSByZW1haW5pbmcgPD0gMCB8fCByZW1haW5pbmcgPiBtYXhXYWl0O1xyXG5cclxuICAgICAgICBpZiAoaXNDYWxsZWQpIHtcclxuICAgICAgICAgIGlmIChtYXhUaW1lb3V0SWQpIHtcclxuICAgICAgICAgICAgbWF4VGltZW91dElkID0gY2xlYXJUaW1lb3V0KG1heFRpbWVvdXRJZCk7XHJcbiAgICAgICAgICB9XHJcbiAgICAgICAgICBsYXN0Q2FsbGVkID0gc3RhbXA7XHJcbiAgICAgICAgICByZXN1bHQgPSBmdW5jLmFwcGx5KHRoaXNBcmcsIGFyZ3MpO1xyXG4gICAgICAgIH1cclxuICAgICAgICBlbHNlIGlmICghbWF4VGltZW91dElkKSB7XHJcbiAgICAgICAgICBtYXhUaW1lb3V0SWQgPSBzZXRUaW1lb3V0KG1heERlbGF5ZWQsIHJlbWFpbmluZyk7XHJcbiAgICAgICAgfVxyXG4gICAgICB9XHJcbiAgICAgIGlmIChpc0NhbGxlZCAmJiB0aW1lb3V0SWQpIHtcclxuICAgICAgICB0aW1lb3V0SWQgPSBjbGVhclRpbWVvdXQodGltZW91dElkKTtcclxuICAgICAgfVxyXG4gICAgICBlbHNlIGlmICghdGltZW91dElkICYmIHdhaXQgIT09IG1heFdhaXQpIHtcclxuICAgICAgICB0aW1lb3V0SWQgPSBzZXRUaW1lb3V0KGRlbGF5ZWQsIHdhaXQpO1xyXG4gICAgICB9XHJcbiAgICAgIGlmIChsZWFkaW5nQ2FsbCkge1xyXG4gICAgICAgIGlzQ2FsbGVkID0gdHJ1ZTtcclxuICAgICAgICByZXN1bHQgPSBmdW5jLmFwcGx5KHRoaXNBcmcsIGFyZ3MpO1xyXG4gICAgICB9XHJcbiAgICAgIGlmIChpc0NhbGxlZCAmJiAhdGltZW91dElkICYmICFtYXhUaW1lb3V0SWQpIHtcclxuICAgICAgICBhcmdzID0gdGhpc0FyZyA9IHVuZGVmaW5lZDtcclxuICAgICAgfVxyXG4gICAgICByZXR1cm4gcmVzdWx0O1xyXG4gICAgfVxyXG5cclxuICAgIGRlYm91bmNlZC5jYW5jZWwgPSBjYW5jZWw7XHJcbiAgICByZXR1cm4gZGVib3VuY2VkO1xyXG4gIH1cclxuXHJcbiAgLyoqXHJcbiAgICogQ2hlY2tzIGlmIGB2YWx1ZWAgaXMgdGhlIFtsYW5ndWFnZSB0eXBlXShodHRwczovL2VzNS5naXRodWIuaW8vI3g4KSBvZiBgT2JqZWN0YC5cclxuICAgKiAoZS5nLiBhcnJheXMsIGZ1bmN0aW9ucywgb2JqZWN0cywgcmVnZXhlcywgYG5ldyBOdW1iZXIoMClgLCBhbmQgYG5ldyBTdHJpbmcoJycpYClcclxuICAgKlxyXG4gICAqIEBzdGF0aWNcclxuICAgKiBAbWVtYmVyT2YgX1xyXG4gICAqIEBjYXRlZ29yeSBMYW5nXHJcbiAgICogQHBhcmFtIHsqfSB2YWx1ZSBUaGUgdmFsdWUgdG8gY2hlY2suXHJcbiAgICogQHJldHVybnMge2Jvb2xlYW59IFJldHVybnMgYHRydWVgIGlmIGB2YWx1ZWAgaXMgYW4gb2JqZWN0LCBlbHNlIGBmYWxzZWAuXHJcbiAgICogQGV4YW1wbGVcclxuICAgKlxyXG4gICAqIF8uaXNPYmplY3Qoe30pO1xyXG4gICAqIC8vID0+IHRydWVcclxuICAgKlxyXG4gICAqIF8uaXNPYmplY3QoWzEsIDIsIDNdKTtcclxuICAgKiAvLyA9PiB0cnVlXHJcbiAgICpcclxuICAgKiBfLmlzT2JqZWN0KDEpO1xyXG4gICAqIC8vID0+IGZhbHNlXHJcbiAgICovXHJcbiAgZnVuY3Rpb24gaXNPYmplY3QodmFsdWUpIHtcclxuICAgIC8vIEF2b2lkIGEgVjggSklUIGJ1ZyBpbiBDaHJvbWUgMTktMjAuXHJcbiAgICAvLyBTZWUgaHR0cHM6Ly9jb2RlLmdvb2dsZS5jb20vcC92OC9pc3N1ZXMvZGV0YWlsP2lkPTIyOTEgZm9yIG1vcmUgZGV0YWlscy5cclxuICAgIHZhciB0eXBlID0gdHlwZW9mIHZhbHVlO1xyXG4gICAgcmV0dXJuICEhdmFsdWUgJiYgKHR5cGUgPT0gJ29iamVjdCcgfHwgdHlwZSA9PSAnZnVuY3Rpb24nKTtcclxuICB9XHJcblxyXG4gIHJldHVybiBkZWJvdW5jZTtcclxuXHJcbn0pKCk7XHJcblxyXG5tb2R1bGUuZXhwb3J0cyA9IGRlYm91bmNlOyIsIjsoZnVuY3Rpb24oJCQsICQpeyAndXNlIHN0cmljdCc7XG4gIFxuICB2YXIgYmVuZFBvaW50VXRpbGl0aWVzID0gcmVxdWlyZSgnLi9iZW5kUG9pbnRVdGlsaXRpZXMnKTtcbiAgJC5mbi5jeXRvc2NhcGVFZGdlQmVuZEVkaXRpbmcgPSByZXF1aXJlKCcuL1VJVXRpbGl0aWVzJyk7XG5cbiAgXG4gIC8vIHJlZ2lzdGVycyB0aGUgZXh0ZW5zaW9uIG9uIGEgY3l0b3NjYXBlIGxpYiByZWZcbiAgdmFyIHJlZ2lzdGVyID0gZnVuY3Rpb24oIGN5dG9zY2FwZSApe1xuICAgIFxuICAgIGlmKCAhY3l0b3NjYXBlICl7IHJldHVybjsgfSAvLyBjYW4ndCByZWdpc3RlciBpZiBjeXRvc2NhcGUgdW5zcGVjaWZpZWRcblxuICAgIHZhciBvcHRpb25zID0ge1xuICAgICAgLy8gdGhpcyBmdW5jdGlvbiBzcGVjaWZpZXMgdGhlIHBvaXRpb25zIG9mIGJlbmQgcG9pbnRzXG4gICAgICBiZW5kUG9zaXRpb25zRnVuY3Rpb246IGZ1bmN0aW9uKGVsZSkge1xuICAgICAgICByZXR1cm4gZWxlLmRhdGEoJ2JlbmRQb2ludFBvc2l0aW9ucycpO1xuICAgICAgfSxcbiAgICAgIHVuZG9hYmxlOiBmYWxzZVxuICAgIH07XG4gICAgXG4gICAgZnVuY3Rpb24gc2V0T3B0aW9ucyhmcm9tKSB7XG4gICAgICB2YXIgdGVtcE9wdHMgPSB7fTtcbiAgICAgIGZvciAodmFyIGtleSBpbiBvcHRpb25zKVxuICAgICAgICB0ZW1wT3B0c1trZXldID0gb3B0aW9uc1trZXldO1xuXG4gICAgICBmb3IgKHZhciBrZXkgaW4gZnJvbSlcbiAgICAgICAgaWYgKHRlbXBPcHRzLmhhc093blByb3BlcnR5KGtleSkpXG4gICAgICAgICAgdGVtcE9wdHNba2V5XSA9IGZyb21ba2V5XTtcbiAgICAgIHJldHVybiB0ZW1wT3B0cztcbiAgICB9XG4gICAgXG4gICAgY3l0b3NjYXBlKCAnY29yZScsICdlZGdlQmVuZEVkaXRpbmcnLCBmdW5jdGlvbihvcHRzKXtcbiAgICAgIHZhciBjeSA9IHRoaXM7XG4gICAgICBcbiAgICAgIC8vIG1lcmdlIHRoZSBvcHRpb25zIHdpdGggZGVmYXVsdCBvbmVzXG4gICAgICBvcHRpb25zID0gc2V0T3B0aW9ucyhvcHRzKTtcbiAgICAgIFxuICAgICAgLy8gZGVmaW5lIGVkZ2ViZW5kZWRpdGluZy1oYXNiZW5kcG9pbnRzIGNzcyBjbGFzc1xuICAgICAgY3kuc3R5bGUoKS5zZWxlY3RvcignLmVkZ2ViZW5kZWRpdGluZy1oYXNiZW5kcG9pbnRzJykuY3NzKHtcbiAgICAgICAgJ2N1cnZlLXN0eWxlJzogJ3NlZ21lbnRzJyxcbiAgICAgICAgJ3NlZ21lbnQtZGlzdGFuY2VzJzogZnVuY3Rpb24gKGVsZSkge1xuICAgICAgICAgIHJldHVybiBiZW5kUG9pbnRVdGlsaXRpZXMuZ2V0U2VnbWVudERpc3RhbmNlc1N0cmluZyhlbGUpO1xuICAgICAgICB9LFxuICAgICAgICAnc2VnbWVudC13ZWlnaHRzJzogZnVuY3Rpb24gKGVsZSkge1xuICAgICAgICAgIHJldHVybiBiZW5kUG9pbnRVdGlsaXRpZXMuZ2V0U2VnbWVudFdlaWdodHNTdHJpbmcoZWxlKTtcbiAgICAgICAgfSxcbiAgICAgICAgJ2VkZ2UtZGlzdGFuY2VzJzogJ25vZGUtcG9zaXRpb24nXG4gICAgICB9KTtcbiAgICAgIFxuICAgICAgLy8gaW5pdCBiZW5kIHBvc2l0aW9uc1xuICAgICAgYmVuZFBvaW50VXRpbGl0aWVzLmluaXRCZW5kUG9pbnRzKG9wdGlvbnMuYmVuZFBvc2l0aW9uc0Z1bmN0aW9uKTtcbiAgICAgIFxuICAgICAgJChjeS5jb250YWluZXIoKSkuY3l0b3NjYXBlRWRnZUJlbmRFZGl0aW5nKG9wdGlvbnMpO1xuXG4gICAgICByZXR1cm4gdGhpczsgLy8gY2hhaW5hYmlsaXR5XG4gICAgfSApO1xuXG4gIH07XG5cbiAgaWYoIHR5cGVvZiBtb2R1bGUgIT09ICd1bmRlZmluZWQnICYmIG1vZHVsZS5leHBvcnRzICl7IC8vIGV4cG9zZSBhcyBhIGNvbW1vbmpzIG1vZHVsZVxuICAgIG1vZHVsZS5leHBvcnRzID0gcmVnaXN0ZXI7XG4gIH1cblxuICBpZiggdHlwZW9mIGRlZmluZSAhPT0gJ3VuZGVmaW5lZCcgJiYgZGVmaW5lLmFtZCApeyAvLyBleHBvc2UgYXMgYW4gYW1kL3JlcXVpcmVqcyBtb2R1bGVcbiAgICBkZWZpbmUoJ2N5dG9zY2FwZS1lZGdlLWJlbmQtZWRpdGluZycsIGZ1bmN0aW9uKCl7XG4gICAgICByZXR1cm4gcmVnaXN0ZXI7XG4gICAgfSk7XG4gIH1cblxuICBpZiggdHlwZW9mIGN5dG9zY2FwZSAhPT0gJ3VuZGVmaW5lZCcgKXsgLy8gZXhwb3NlIHRvIGdsb2JhbCBjeXRvc2NhcGUgKGkuZS4gd2luZG93LmN5dG9zY2FwZSlcbiAgICByZWdpc3RlciggY3l0b3NjYXBlICk7XG4gIH1cblxufSkoY3l0b3NjYXBlLCBqUXVlcnkpO1xuIiwibW9kdWxlLmV4cG9ydHMgPSBmdW5jdGlvbiAoKSB7XG4gIGlmIChjeS51bmRvUmVkbyA9PSBudWxsKVxuICAgIHJldHVybjtcblxuICB2YXIgdXIgPSBjeS51bmRvUmVkbyh7XG4gICAgZGVmYXVsdEFjdGlvbnM6IGZhbHNlLFxuICAgIGlzRGVidWc6IHRydWVcbiAgfSk7XG5cbiAgZnVuY3Rpb24gY2hhbmdlQmVuZFBvaW50cyhwYXJhbSkge1xuICAgIHZhciBlZGdlID0gcGFyYW0uZWRnZTtcbiAgICB2YXIgcmVzdWx0ID0ge1xuICAgICAgZWRnZTogZWRnZSxcbiAgICAgIHdlaWdodHM6IHBhcmFtLnNldCA/IGVkZ2UuZGF0YSgnd2VpZ2h0cycpIDogcGFyYW0ud2VpZ2h0cyxcbiAgICAgIGRpc3RhbmNlczogcGFyYW0uc2V0ID8gZWRnZS5kYXRhKCdkaXN0YW5jZXMnKSA6IHBhcmFtLmRpc3RhbmNlcyxcbiAgICAgIHNldDogdHJ1ZS8vQXMgdGhlIHJlc3VsdCB3aWxsIG5vdCBiZSB1c2VkIGZvciB0aGUgZmlyc3QgZnVuY3Rpb24gY2FsbCBwYXJhbXMgc2hvdWxkIGJlIHVzZWQgdG8gc2V0IHRoZSBkYXRhXG4gICAgfTtcblxuICAgIC8vQ2hlY2sgaWYgd2UgbmVlZCB0byBzZXQgdGhlIHdlaWdodHMgYW5kIGRpc3RhbmNlcyBieSB0aGUgcGFyYW0gdmFsdWVzXG4gICAgaWYgKHBhcmFtLnNldCkge1xuICAgICAgcGFyYW0ud2VpZ2h0cyA/IGVkZ2UuZGF0YSgnd2VpZ2h0cycsIHBhcmFtLndlaWdodHMpIDogZWRnZS5yZW1vdmVEYXRhKCd3ZWlnaHRzJyk7XG4gICAgICBwYXJhbS5kaXN0YW5jZXMgPyBlZGdlLmRhdGEoJ2Rpc3RhbmNlcycsIHBhcmFtLmRpc3RhbmNlcykgOiBlZGdlLnJlbW92ZURhdGEoJ2Rpc3RhbmNlcycpO1xuXG4gICAgICAvL3JlZnJlc2ggdGhlIGN1cnZlIHN0eWxlIGFzIHRoZSBudW1iZXIgb2YgYmVuZCBwb2ludCB3b3VsZCBiZSBjaGFuZ2VkIGJ5IHRoZSBwcmV2aW91cyBvcGVyYXRpb25cbiAgICAgIGlmIChwYXJhbS53ZWlnaHRzKSB7XG4gICAgICAgIGVkZ2UuYWRkQ2xhc3MoJ2VkZ2ViZW5kZWRpdGluZy1oYXNiZW5kcG9pbnRzJyk7XG4gICAgICB9XG4gICAgICBlbHNlIHtcbiAgICAgICAgZWRnZS5yZW1vdmVDbGFzcygnZWRnZWJlbmRlZGl0aW5nLWhhc2JlbmRwb2ludHMnKTtcbiAgICAgIH1cbiAgICB9XG4gICAgXG4gICAgZWRnZS50cmlnZ2VyKCdjaGFuZ2VCZW5kUG9pbnRzJyk7XG5cbiAgICByZXR1cm4gcmVzdWx0O1xuICB9XG5cbiAgdXIuYWN0aW9uKCdjaGFuZ2VCZW5kUG9pbnRzJywgY2hhbmdlQmVuZFBvaW50cywgY2hhbmdlQmVuZFBvaW50cyk7XG59OyJdfQ==
