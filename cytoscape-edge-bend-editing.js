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
        var factor = options().bendShapeSizeFactor;
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
      undoable: false,
      // the size of bend shape is obtained by multipling width of edge with this parameter
      bendShapeSizeFactor: 6
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
//# sourceMappingURL=data:application/json;charset:utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIm5vZGVfbW9kdWxlcy9icm93c2VyaWZ5L25vZGVfbW9kdWxlcy9icm93c2VyLXBhY2svX3ByZWx1ZGUuanMiLCJzcmMvVUlVdGlsaXRpZXMuanMiLCJzcmMvYmVuZFBvaW50VXRpbGl0aWVzLmpzIiwic3JjL2RlYm91bmNlLmpzIiwic3JjL2luZGV4LmpzIiwic3JjL3JlZ2lzdGVyVW5kb1JlZG9GdW5jdGlvbnMuanMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7QUNBQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDamNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ2hZQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUM3T0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDM0VBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQSIsImZpbGUiOiJnZW5lcmF0ZWQuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlc0NvbnRlbnQiOlsiKGZ1bmN0aW9uIGUodCxuLHIpe2Z1bmN0aW9uIHMobyx1KXtpZighbltvXSl7aWYoIXRbb10pe3ZhciBhPXR5cGVvZiByZXF1aXJlPT1cImZ1bmN0aW9uXCImJnJlcXVpcmU7aWYoIXUmJmEpcmV0dXJuIGEobywhMCk7aWYoaSlyZXR1cm4gaShvLCEwKTt2YXIgZj1uZXcgRXJyb3IoXCJDYW5ub3QgZmluZCBtb2R1bGUgJ1wiK28rXCInXCIpO3Rocm93IGYuY29kZT1cIk1PRFVMRV9OT1RfRk9VTkRcIixmfXZhciBsPW5bb109e2V4cG9ydHM6e319O3Rbb11bMF0uY2FsbChsLmV4cG9ydHMsZnVuY3Rpb24oZSl7dmFyIG49dFtvXVsxXVtlXTtyZXR1cm4gcyhuP246ZSl9LGwsbC5leHBvcnRzLGUsdCxuLHIpfXJldHVybiBuW29dLmV4cG9ydHN9dmFyIGk9dHlwZW9mIHJlcXVpcmU9PVwiZnVuY3Rpb25cIiYmcmVxdWlyZTtmb3IodmFyIG89MDtvPHIubGVuZ3RoO28rKylzKHJbb10pO3JldHVybiBzfSkiLCJ2YXIgZGVib3VuY2UgPSByZXF1aXJlKCcuL2RlYm91bmNlJyk7XG52YXIgYmVuZFBvaW50VXRpbGl0aWVzID0gcmVxdWlyZSgnLi9iZW5kUG9pbnRVdGlsaXRpZXMnKTtcbnZhciByZWdpc3RlclVuZG9SZWRvRnVuY3Rpb25zID0gcmVxdWlyZSgnLi9yZWdpc3RlclVuZG9SZWRvRnVuY3Rpb25zJyk7XG5cbm1vZHVsZS5leHBvcnRzID0gZnVuY3Rpb24gKHBhcmFtcykge1xuICB2YXIgZm4gPSBwYXJhbXM7XG5cbiAgdmFyIGVQb3NpdGlvbiwgZVJlbW92ZSwgZVpvb20sIGVTZWxlY3QsIGVVbnNlbGVjdCwgZVRhcFN0YXJ0LCBlVGFwRHJhZywgZVRhcEVuZCwgZUN4dFRhcCwgZVRhcDtcbiAgdmFyIGZ1bmN0aW9ucyA9IHtcbiAgICBpbml0OiBmdW5jdGlvbiAoKSB7XG4gICAgICAvLyByZWdpc3RlciB1bmRvIHJlZG8gZnVuY3Rpb25zXG4gICAgICByZWdpc3RlclVuZG9SZWRvRnVuY3Rpb25zKCk7XG4gICAgICBcbiAgICAgIHZhciBzZWxmID0gdGhpcztcbiAgICAgIHZhciBvcHRzID0gcGFyYW1zO1xuICAgICAgdmFyICRjb250YWluZXIgPSAkKHRoaXMpO1xuICAgICAgdmFyIGN5O1xuICAgICAgdmFyICRjYW52YXMgPSAkKCc8Y2FudmFzPjwvY2FudmFzPicpO1xuXG4gICAgICAkY29udGFpbmVyLmFwcGVuZCgkY2FudmFzKTtcbiAgICAgIFxuICAgICAgdmFyICRjdHhBZGRCZW5kUG9pbnQgPSAkKCc8bWVudSB0aXRsZT1cIkFkZCBCZW5kIFBvaW50XCIgaWQ9XCJjeS1lZGdlLWJlbmQtZWRpdGluZy1jdHgtYWRkLWJlbmQtcG9pbnRcIiBjbGFzcz1cImN5LWVkZ2UtYmVuZC1lZGl0aW5nLWN0eC1vcGVyYXRpb25cIj48L21lbnU+Jyk7XG4gICAgICB2YXIgJGN0eFJlbW92ZUJlbmRQb2ludCA9ICQoJzxtZW51IHRpdGxlPVwiUmVtb3ZlIEJlbmQgUG9pbnRcIiBpZD1cImN5LWVkZ2UtYmVuZC1lZGl0aW5nLWN0eC1yZW1vdmUtYmVuZC1wb2ludFwiIGNsYXNzPVwiY3ktZWRnZS1iZW5kLWVkaXRpbmctY3R4LW9wZXJhdGlvblwiPjwvbWVudT4nKTtcbiAgICAgIFxuICAgICAgJCgnYm9keScpLmFwcGVuZCgkY3R4QWRkQmVuZFBvaW50KTtcbiAgICAgICQoJ2JvZHknKS5hcHBlbmQoJGN0eFJlbW92ZUJlbmRQb2ludCk7XG4gICAgICBcbiAgICAgIGRvY3VtZW50LmdldEVsZW1lbnRCeUlkKFwiY3ktZWRnZS1iZW5kLWVkaXRpbmctY3R4LWFkZC1iZW5kLXBvaW50XCIpLmFkZEV2ZW50TGlzdGVuZXIoXCJjb250ZXh0bWVudVwiLGZ1bmN0aW9uKGV2ZW50KXtcbiAgICAgICAgZXZlbnQucHJldmVudERlZmF1bHQoKTtcbiAgICAgIH0sZmFsc2UpO1xuXG4gICAgICBkb2N1bWVudC5nZXRFbGVtZW50QnlJZChcImN5LWVkZ2UtYmVuZC1lZGl0aW5nLWN0eC1yZW1vdmUtYmVuZC1wb2ludFwiKS5hZGRFdmVudExpc3RlbmVyKFwiY29udGV4dG1lbnVcIixmdW5jdGlvbihldmVudCl7XG4gICAgICAgICAgZXZlbnQucHJldmVudERlZmF1bHQoKTtcbiAgICAgIH0sZmFsc2UpO1xuXG4gICAgICAkKCcuY3ktZWRnZS1iZW5kLWVkaXRpbmctY3R4LW9wZXJhdGlvbicpLmNsaWNrKGZ1bmN0aW9uIChlKSB7XG4gICAgICAgICQoJy5jeS1lZGdlLWJlbmQtZWRpdGluZy1jdHgtb3BlcmF0aW9uJykuY3NzKCdkaXNwbGF5JywgJ25vbmUnKTtcbiAgICAgIH0pO1xuXG4gICAgICAkY3R4QWRkQmVuZFBvaW50LmNsaWNrKGZ1bmN0aW9uIChlKSB7XG4gICAgICAgIHZhciBlZGdlID0gYmVuZFBvaW50VXRpbGl0aWVzLmN1cnJlbnRDdHhFZGdlO1xuICAgICAgICBcbiAgICAgICAgaWYoIWVkZ2Uuc2VsZWN0ZWQoKSkge1xuICAgICAgICAgIHJldHVybjtcbiAgICAgICAgfVxuICAgICAgICBcbiAgICAgICAgdmFyIHBhcmFtID0ge1xuICAgICAgICAgIGVkZ2U6IGVkZ2UsXG4gICAgICAgICAgd2VpZ2h0czogZWRnZS5kYXRhKCd3ZWlnaHRzJyk/W10uY29uY2F0KGVkZ2UuZGF0YSgnd2VpZ2h0cycpKTplZGdlLmRhdGEoJ3dlaWdodHMnKSxcbiAgICAgICAgICBkaXN0YW5jZXM6IGVkZ2UuZGF0YSgnZGlzdGFuY2VzJyk/W10uY29uY2F0KGVkZ2UuZGF0YSgnZGlzdGFuY2VzJykpOmVkZ2UuZGF0YSgnZGlzdGFuY2VzJylcbiAgICAgICAgfTtcbiAgICAgICAgXG4gICAgICAgIGJlbmRQb2ludFV0aWxpdGllcy5hZGRCZW5kUG9pbnQoKTtcbiAgICAgICAgXG4gICAgICAgIGlmKG9wdGlvbnMoKS51bmRvYWJsZSkge1xuICAgICAgICAgIGN5LnVuZG9SZWRvKCkuZG8oJ2NoYW5nZUJlbmRQb2ludHMnLCBwYXJhbSk7XG4gICAgICAgIH1cbiAgICAgICAgXG4gICAgICAgIGNsZWFyRHJhd3MoKTtcbiAgICAgICAgcmVuZGVyQmVuZFNoYXBlcyhlZGdlKTtcbiAgICAgICAgXG4gICAgICB9KTtcblxuICAgICAgJGN0eFJlbW92ZUJlbmRQb2ludC5jbGljayhmdW5jdGlvbiAoZSkge1xuICAgICAgICB2YXIgZWRnZSA9IGJlbmRQb2ludFV0aWxpdGllcy5jdXJyZW50Q3R4RWRnZTtcbiAgICAgICAgXG4gICAgICAgIGlmKCFlZGdlLnNlbGVjdGVkKCkpIHtcbiAgICAgICAgICByZXR1cm47XG4gICAgICAgIH1cbiAgICAgICAgXG4gICAgICAgIHZhciBwYXJhbSA9IHtcbiAgICAgICAgICBlZGdlOiBlZGdlLFxuICAgICAgICAgIHdlaWdodHM6IFtdLmNvbmNhdChlZGdlLmRhdGEoJ3dlaWdodHMnKSksXG4gICAgICAgICAgZGlzdGFuY2VzOiBbXS5jb25jYXQoZWRnZS5kYXRhKCdkaXN0YW5jZXMnKSlcbiAgICAgICAgfTtcblxuICAgICAgICBiZW5kUG9pbnRVdGlsaXRpZXMucmVtb3ZlQmVuZFBvaW50KCk7XG4gICAgICAgIFxuICAgICAgICBpZihvcHRpb25zKCkudW5kb2FibGUpIHtcbiAgICAgICAgICBjeS51bmRvUmVkbygpLmRvKCdjaGFuZ2VCZW5kUG9pbnRzJywgcGFyYW0pO1xuICAgICAgICB9XG4gICAgICAgIFxuICAgICAgICBjbGVhckRyYXdzKCk7XG4gICAgICAgIHJlbmRlckJlbmRTaGFwZXMoZWRnZSk7XG4gICAgICB9KTtcbiAgICAgIFxuICAgICAgdmFyIF9zaXplQ2FudmFzID0gZGVib3VuY2UoZnVuY3Rpb24gKCkge1xuICAgICAgICAkY2FudmFzXG4gICAgICAgICAgLmF0dHIoJ2hlaWdodCcsICRjb250YWluZXIuaGVpZ2h0KCkpXG4gICAgICAgICAgLmF0dHIoJ3dpZHRoJywgJGNvbnRhaW5lci53aWR0aCgpKVxuICAgICAgICAgIC5jc3Moe1xuICAgICAgICAgICAgJ3Bvc2l0aW9uJzogJ2Fic29sdXRlJyxcbiAgICAgICAgICAgICd0b3AnOiAwLFxuICAgICAgICAgICAgJ2xlZnQnOiAwLFxuICAgICAgICAgICAgJ3otaW5kZXgnOiAnOTk5J1xuICAgICAgICAgIH0pXG4gICAgICAgIDtcblxuICAgICAgICBzZXRUaW1lb3V0KGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICB2YXIgY2FudmFzQmIgPSAkY2FudmFzLm9mZnNldCgpO1xuICAgICAgICAgIHZhciBjb250YWluZXJCYiA9ICRjb250YWluZXIub2Zmc2V0KCk7XG5cbiAgICAgICAgICAkY2FudmFzXG4gICAgICAgICAgICAuY3NzKHtcbiAgICAgICAgICAgICAgJ3RvcCc6IC0oY2FudmFzQmIudG9wIC0gY29udGFpbmVyQmIudG9wKSxcbiAgICAgICAgICAgICAgJ2xlZnQnOiAtKGNhbnZhc0JiLmxlZnQgLSBjb250YWluZXJCYi5sZWZ0KVxuICAgICAgICAgICAgfSlcbiAgICAgICAgICA7XG5cbiAgICAgICAgICAvLyByZWRyYXcgb24gY2FudmFzIHJlc2l6ZVxuICAgICAgICAgIGlmKGN5KXtcbiAgICAgICAgICAgIGNsZWFyRHJhd3ModHJ1ZSk7XG4gICAgICAgICAgfVxuICAgICAgICB9LCAwKTtcblxuICAgICAgfSwgMjUwKTtcblxuICAgICAgZnVuY3Rpb24gc2l6ZUNhbnZhcygpIHtcbiAgICAgICAgX3NpemVDYW52YXMoKTtcbiAgICAgIH1cblxuICAgICAgc2l6ZUNhbnZhcygpO1xuXG4gICAgICAkKHdpbmRvdykuYmluZCgncmVzaXplJywgZnVuY3Rpb24gKCkge1xuICAgICAgICBzaXplQ2FudmFzKCk7XG4gICAgICB9KTtcblxuICAgICAgdmFyIGN0eCA9ICRjYW52YXNbMF0uZ2V0Q29udGV4dCgnMmQnKTtcblxuICAgICAgLy8gd3JpdGUgb3B0aW9ucyB0byBkYXRhXG4gICAgICB2YXIgZGF0YSA9ICRjb250YWluZXIuZGF0YSgnY3llZGdlYmVuZGVkaXRpbmcnKTtcbiAgICAgIGlmIChkYXRhID09IG51bGwpIHtcbiAgICAgICAgZGF0YSA9IHt9O1xuICAgICAgfVxuICAgICAgZGF0YS5vcHRpb25zID0gb3B0cztcblxuICAgICAgdmFyIG9wdENhY2hlO1xuXG4gICAgICBmdW5jdGlvbiBvcHRpb25zKCkge1xuICAgICAgICByZXR1cm4gb3B0Q2FjaGUgfHwgKG9wdENhY2hlID0gJGNvbnRhaW5lci5kYXRhKCdjeWVkZ2ViZW5kZWRpdGluZycpLm9wdGlvbnMpO1xuICAgICAgfVxuICAgICAgXG4gICAgICAvLyB3ZSB3aWxsIG5lZWQgdG8gY29udmVydCBtb2RlbCBwb3NpdG9ucyB0byByZW5kZXJlZCBwb3NpdGlvbnNcbiAgICAgIGZ1bmN0aW9uIGNvbnZlcnRUb1JlbmRlcmVkUG9zaXRpb24obW9kZWxQb3NpdGlvbikge1xuICAgICAgICB2YXIgcGFuID0gY3kucGFuKCk7XG4gICAgICAgIHZhciB6b29tID0gY3kuem9vbSgpO1xuXG4gICAgICAgIHZhciB4ID0gbW9kZWxQb3NpdGlvbi54ICogem9vbSArIHBhbi54O1xuICAgICAgICB2YXIgeSA9IG1vZGVsUG9zaXRpb24ueSAqIHpvb20gKyBwYW4ueTtcblxuICAgICAgICByZXR1cm4ge1xuICAgICAgICAgIHg6IHgsXG4gICAgICAgICAgeTogeVxuICAgICAgICB9O1xuICAgICAgfVxuXG4gICAgICBmdW5jdGlvbiBjbGVhckRyYXdzKHJlbmRlclNlbGVjdGVkQmVuZFNoYXBlcykge1xuXG4gICAgICAgIHZhciB3ID0gJGNvbnRhaW5lci53aWR0aCgpO1xuICAgICAgICB2YXIgaCA9ICRjb250YWluZXIuaGVpZ2h0KCk7XG5cbiAgICAgICAgY3R4LmNsZWFyUmVjdCgwLCAwLCB3LCBoKTtcbiAgICAgICAgXG4gICAgICAgIGlmKCByZW5kZXJTZWxlY3RlZEJlbmRTaGFwZXMgKSB7XG4gICAgICAgICAgdmFyIHNlbGVjdGVkRWRnZXMgPSBjeS5lZGdlcygnOnNlbGVjdGVkJyk7XG4gICAgICAgIFxuICAgICAgICAgIGZvciggdmFyIGkgPSAwOyBpIDwgc2VsZWN0ZWRFZGdlcy5sZW5ndGg7IGkrKyApIHtcbiAgICAgICAgICAgIHZhciBlZGdlID0gc2VsZWN0ZWRFZGdlc1tpXTtcbiAgICAgICAgICAgIHJlbmRlckJlbmRTaGFwZXMoZWRnZSk7XG4gICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICB9XG4gICAgICBcbiAgICAgIFxuICAgICAgLy8gcmVuZGVyIHRoZSBiZW5kIHNoYXBlcyBvZiB0aGUgZ2l2ZW4gZWRnZVxuICAgICAgZnVuY3Rpb24gcmVuZGVyQmVuZFNoYXBlcyhlZGdlKSB7XG4gICAgICAgIHZhciBjeSA9IGVkZ2UuY3koKTtcbiAgICAgICAgXG4gICAgICAgIGlmKCFlZGdlLmhhc0NsYXNzKCdlZGdlYmVuZGVkaXRpbmctaGFzYmVuZHBvaW50cycpKSB7XG4gICAgICAgICAgcmV0dXJuO1xuICAgICAgICB9XG4gICAgICAgIFxuICAgICAgICB2YXIgc2VncHRzID0gYmVuZFBvaW50VXRpbGl0aWVzLmdldFNlZ21lbnRQb2ludHMoZWRnZSk7Ly9lZGdlLl9wcml2YXRlLnJzY3JhdGNoLnNlZ3B0cztcbiAgICAgICAgdmFyIGxlbmd0aCA9IGdldEJlbmRTaGFwZXNMZW5naHQoZWRnZSk7XG4gICAgICAgIFxuICAgICAgICB2YXIgc3JjUG9zID0gZWRnZS5zb3VyY2UoKS5wb3NpdGlvbigpO1xuICAgICAgICB2YXIgdGd0UG9zID0gZWRnZS50YXJnZXQoKS5wb3NpdGlvbigpO1xuICAgICAgICBcbiAgICAgICAgdmFyIHdlaWdodHMgPSBlZGdlLmRhdGEoJ3dlaWdodHMnKTtcbiAgICAgICAgdmFyIGRpc3RhbmNlcyA9IGVkZ2UuZGF0YSgnZGlzdGFuY2VzJyk7XG5cbiAgICAgICAgZm9yKHZhciBpID0gMDsgc2VncHRzICYmIGkgPCBzZWdwdHMubGVuZ3RoOyBpID0gaSArIDIpe1xuICAgICAgICAgIHZhciBiZW5kWCA9IHNlZ3B0c1tpXTtcbiAgICAgICAgICB2YXIgYmVuZFkgPSBzZWdwdHNbaSArIDFdO1xuXG4gICAgICAgICAgdmFyIG9sZFN0eWxlID0gY3R4LmZpbGxTdHlsZTtcbiAgICAgICAgICBjdHguZmlsbFN0eWxlID0gZWRnZS5jc3MoJ2xpbmUtY29sb3InKTtcbiAgICAgICAgICByZW5kZXJCZW5kU2hhcGUoYmVuZFgsIGJlbmRZLCBsZW5ndGgpO1xuICAgICAgICAgIGN0eC5maWxsU3R5bGUgPSBvbGRTdHlsZTtcbiAgICAgICAgfVxuICAgICAgfVxuICAgICAgXG4gICAgICAvLyByZW5kZXIgYSBiZW5kIHNoYXBlIHdpdGggdGhlIGdpdmVuIHBhcmFtZXRlcnNcbiAgICAgIGZ1bmN0aW9uIHJlbmRlckJlbmRTaGFwZShiZW5kWCwgYmVuZFksIGxlbmd0aCkge1xuICAgICAgICAvLyBnZXQgdGhlIHRvcCBsZWZ0IGNvb3JkaW5hdGVzXG4gICAgICAgIHZhciB0b3BMZWZ0WCA9IGJlbmRYIC0gbGVuZ3RoIC8gMjtcbiAgICAgICAgdmFyIHRvcExlZnRZID0gYmVuZFkgLSBsZW5ndGggLyAyO1xuICAgICAgICBcbiAgICAgICAgLy8gY29udmVydCB0byByZW5kZXJlZCBwYXJhbWV0ZXJzXG4gICAgICAgIHZhciByZW5kZXJlZFRvcExlZnRQb3MgPSBjb252ZXJ0VG9SZW5kZXJlZFBvc2l0aW9uKHt4OiB0b3BMZWZ0WCwgeTogdG9wTGVmdFl9KTtcbiAgICAgICAgbGVuZ3RoICo9IGN5Lnpvb20oKTtcbiAgICAgICAgXG4gICAgICAgIC8vIHJlbmRlciBiZW5kIHNoYXBlXG4gICAgICAgIGN0eC5iZWdpblBhdGgoKTtcbiAgICAgICAgY3R4LnJlY3QocmVuZGVyZWRUb3BMZWZ0UG9zLngsIHJlbmRlcmVkVG9wTGVmdFBvcy55LCBsZW5ndGgsIGxlbmd0aCk7XG4gICAgICAgIGN0eC5maWxsKCk7XG4gICAgICAgIGN0eC5jbG9zZVBhdGgoKTtcbiAgICAgIH1cbiAgICAgIFxuICAgICAgLy8gZ2V0IHRoZSBsZW5ndGggb2YgYmVuZCBwb2ludHMgdG8gYmUgcmVuZGVyZWRcbiAgICAgIGZ1bmN0aW9uIGdldEJlbmRTaGFwZXNMZW5naHQoZWRnZSkge1xuICAgICAgICB2YXIgZmFjdG9yID0gb3B0aW9ucygpLmJlbmRTaGFwZVNpemVGYWN0b3I7XG4gICAgICAgIHZhciBsZW5ndGggPSBwYXJzZUZsb2F0KGVkZ2UuY3NzKCd3aWR0aCcpKSAqIGZhY3RvcjtcbiAgICAgICAgcmV0dXJuIGxlbmd0aDtcbiAgICAgIH1cbiAgICAgIFxuICAgICAgLy8gY2hlY2sgaWYgdGhlIHBvaW50IHJlcHJlc2VudGVkIGJ5IHt4LCB5fSBpcyBpbnNpZGUgdGhlIGJlbmQgc2hhcGVcbiAgICAgIGZ1bmN0aW9uIGNoZWNrSWZJbnNpZGVCZW5kU2hhcGUoeCwgeSwgbGVuZ3RoLCBjZW50ZXJYLCBjZW50ZXJZKXtcbiAgICAgICAgdmFyIG1pblggPSBjZW50ZXJYIC0gbGVuZ3RoIC8gMjtcbiAgICAgICAgdmFyIG1heFggPSBjZW50ZXJYICsgbGVuZ3RoIC8gMjtcbiAgICAgICAgdmFyIG1pblkgPSBjZW50ZXJZIC0gbGVuZ3RoIC8gMjtcbiAgICAgICAgdmFyIG1heFkgPSBjZW50ZXJZICsgbGVuZ3RoIC8gMjtcbiAgICAgICAgXG4gICAgICAgIHZhciBpbnNpZGUgPSAoeCA+PSBtaW5YICYmIHggPD0gbWF4WCkgJiYgKHkgPj0gbWluWSAmJiB5IDw9IG1heFkpO1xuICAgICAgICByZXR1cm4gaW5zaWRlO1xuICAgICAgfVxuXG4gICAgICAvLyBnZXQgdGdlIGluZGV4IG9mIGJlbmQgcG9pbnQgY29udGFpbmluZyB0aGUgcG9pbnQgcmVwcmVzZW50ZWQgYnkge3gsIHl9XG4gICAgICBmdW5jdGlvbiBnZXRDb250YWluaW5nQmVuZFNoYXBlSW5kZXgoeCwgeSwgZWRnZSkge1xuICAgICAgICBpZihlZGdlLmRhdGEoJ3dlaWdodHMnKSA9PSBudWxsIHx8IGVkZ2UuZGF0YSgnd2VpZ2h0cycpLmxlbmdodCA9PSAwKXtcbiAgICAgICAgICByZXR1cm4gLTE7XG4gICAgICAgIH1cblxuICAgICAgICB2YXIgc2VncHRzID0gZWRnZS5fcHJpdmF0ZS5yc2NyYXRjaC5zZWdwdHM7XG4gICAgICAgIHZhciBsZW5ndGggPSBnZXRCZW5kU2hhcGVzTGVuZ2h0KGVkZ2UpO1xuXG4gICAgICAgIGZvcih2YXIgaSA9IDA7IHNlZ3B0cyAmJiBpIDwgc2VncHRzLmxlbmd0aDsgaSA9IGkgKyAyKXtcbiAgICAgICAgICB2YXIgYmVuZFggPSBzZWdwdHNbaV07XG4gICAgICAgICAgdmFyIGJlbmRZID0gc2VncHRzW2kgKyAxXTtcblxuICAgICAgICAgIHZhciBpbnNpZGUgPSBjaGVja0lmSW5zaWRlQmVuZFNoYXBlKHgsIHksIGxlbmd0aCwgYmVuZFgsIGJlbmRZKTtcbiAgICAgICAgICBpZihpbnNpZGUpe1xuICAgICAgICAgICAgcmV0dXJuIGkgLyAyO1xuICAgICAgICAgIH1cbiAgICAgICAgfVxuXG4gICAgICAgIHJldHVybiAtMTtcbiAgICAgIH07XG5cbiAgICAgIC8vIGxhc3Qgc3RhdHVzIG9mIGdlc3R1cmVzXG4gICAgICB2YXIgbGFzdFBhbm5pbmdFbmFibGVkLCBsYXN0Wm9vbWluZ0VuYWJsZWQsIGxhc3RCb3hTZWxlY3Rpb25FbmFibGVkO1xuICAgICAgXG4gICAgICAvLyBzdG9yZSB0aGUgY3VycmVudCBzdGF0dXMgb2YgZ2VzdHVyZXMgYW5kIHNldCB0aGVtIHRvIGZhbHNlXG4gICAgICBmdW5jdGlvbiBkaXNhYmxlR2VzdHVyZXMoKSB7XG4gICAgICAgIGxhc3RQYW5uaW5nRW5hYmxlZCA9IGN5LnBhbm5pbmdFbmFibGVkKCk7XG4gICAgICAgIGxhc3Rab29taW5nRW5hYmxlZCA9IGN5Lnpvb21pbmdFbmFibGVkKCk7XG4gICAgICAgIGxhc3RCb3hTZWxlY3Rpb25FbmFibGVkID0gY3kuYm94U2VsZWN0aW9uRW5hYmxlZCgpO1xuXG4gICAgICAgIGN5Lnpvb21pbmdFbmFibGVkKGZhbHNlKVxuICAgICAgICAgIC5wYW5uaW5nRW5hYmxlZChmYWxzZSlcbiAgICAgICAgICAuYm94U2VsZWN0aW9uRW5hYmxlZChmYWxzZSk7XG4gICAgICB9XG4gICAgICBcbiAgICAgIC8vIHJlc2V0IHRoZSBnZXN0dXJlcyBieSB0aGVpciBsYXRlc3Qgc3RhdHVzXG4gICAgICBmdW5jdGlvbiByZXNldEdlc3R1cmVzKCkge1xuICAgICAgICBjeS56b29taW5nRW5hYmxlZChsYXN0Wm9vbWluZ0VuYWJsZWQpXG4gICAgICAgICAgLnBhbm5pbmdFbmFibGVkKGxhc3RQYW5uaW5nRW5hYmxlZClcbiAgICAgICAgICAuYm94U2VsZWN0aW9uRW5hYmxlZChsYXN0Qm94U2VsZWN0aW9uRW5hYmxlZCk7XG4gICAgICB9XG5cbiAgICAgICRjb250YWluZXIuY3l0b3NjYXBlKGZ1bmN0aW9uIChlKSB7XG4gICAgICAgIGN5ID0gdGhpcztcbiAgICAgICAgY2xlYXJEcmF3cyh0cnVlKTtcbiAgICAgICAgXG4gICAgICAgIGxhc3RQYW5uaW5nRW5hYmxlZCA9IGN5LnBhbm5pbmdFbmFibGVkKCk7XG4gICAgICAgIGxhc3Rab29taW5nRW5hYmxlZCA9IGN5Lnpvb21pbmdFbmFibGVkKCk7XG4gICAgICAgIGxhc3RCb3hTZWxlY3Rpb25FbmFibGVkID0gY3kuYm94U2VsZWN0aW9uRW5hYmxlZCgpO1xuICAgICAgICBcbiAgICAgICAgY3kuYmluZCgnem9vbSBwYW4nLCBlWm9vbSA9IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICBjbGVhckRyYXdzKHRydWUpO1xuICAgICAgICB9KTtcblxuICAgICAgICBjeS5vbigncG9zaXRpb24nLCAnbm9kZScsIGVQb3NpdGlvbiA9IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICB2YXIgbm9kZSA9IHRoaXM7XG4gICAgICAgICAgXG4gICAgICAgICAgY2xlYXJEcmF3cyh0cnVlKTtcbiAgICAgICAgfSk7XG5cbiAgICAgICAgY3kub24oJ3JlbW92ZScsICdlZGdlJywgZVJlbW92ZSA9IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICB2YXIgbm9kZSA9IHRoaXM7XG4gICAgICAgICAgXG4gICAgICAgICAgLy8gVE9ET1xuICAgICAgICB9KTtcbiAgICAgICAgXG4gICAgICAgIGN5Lm9uKCdzZWxlY3QnLCAnZWRnZScsIGVTZWxlY3QgPSBmdW5jdGlvbiAoKSB7XG4gICAgICAgICAgdmFyIGVkZ2UgPSB0aGlzO1xuICAgICAgICAgIFxuICAgICAgICAgIHJlbmRlckJlbmRTaGFwZXMoZWRnZSk7XG4gICAgICAgIH0pO1xuICAgICAgICBcbiAgICAgICAgY3kub24oJ3Vuc2VsZWN0JywgJ2VkZ2UnLCBlVW5zZWxlY3QgPSBmdW5jdGlvbiAoKSB7XG4gICAgICAgICAgdmFyIGVkZ2UgPSB0aGlzO1xuICAgICAgICAgIFxuICAgICAgICAgIGNsZWFyRHJhd3ModHJ1ZSk7XG4gICAgICAgIH0pO1xuICAgICAgICBcbiAgICAgICAgdmFyIG1vdmVkQmVuZEluZGV4O1xuICAgICAgICB2YXIgbW92ZWRCZW5kRWRnZTtcbiAgICAgICAgdmFyIG1vdmVCZW5kUGFyYW07XG4gICAgICAgIFxuICAgICAgICBjeS5vbigndGFwc3RhcnQnLCAnZWRnZScsIGVUYXBTdGFydCA9IGZ1bmN0aW9uIChldmVudCkge1xuICAgICAgICAgIHZhciBlZGdlID0gdGhpcztcbiAgICAgICAgICBcbiAgICAgICAgICBtb3ZlQmVuZFBhcmFtID0ge1xuICAgICAgICAgICAgZWRnZTogZWRnZSxcbiAgICAgICAgICAgIHdlaWdodHM6IGVkZ2UuZGF0YSgnd2VpZ2h0cycpID8gW10uY29uY2F0KGVkZ2UuZGF0YSgnd2VpZ2h0cycpKSA6IGVkZ2UuZGF0YSgnd2VpZ2h0cycpLFxuICAgICAgICAgICAgZGlzdGFuY2VzOiBlZGdlLmRhdGEoJ2Rpc3RhbmNlcycpID8gW10uY29uY2F0KGVkZ2UuZGF0YSgnZGlzdGFuY2VzJykpIDogZWRnZS5kYXRhKCdkaXN0YW5jZXMnKVxuICAgICAgICAgIH07XG4gICAgICAgICAgXG4gICAgICAgICAgdmFyIGN5UG9zWCA9IGV2ZW50LmN5UG9zaXRpb24ueDtcbiAgICAgICAgICB2YXIgY3lQb3NZID0gZXZlbnQuY3lQb3NpdGlvbi55O1xuXG4gICAgICAgICAgdmFyIGluZGV4ID0gZ2V0Q29udGFpbmluZ0JlbmRTaGFwZUluZGV4KGN5UG9zWCwgY3lQb3NZLCBlZGdlKTtcbiAgICAgICAgICBpZiAoaW5kZXggIT0gLTEpIHtcbiAgICAgICAgICAgIG1vdmVkQmVuZEluZGV4ID0gaW5kZXg7XG4gICAgICAgICAgICBtb3ZlZEJlbmRFZGdlID0gZWRnZTtcbiAgICAgICAgICAgIGRpc2FibGVHZXN0dXJlcygpO1xuICAgICAgICAgIH1cbiAgICAgICAgfSk7XG4gICAgICAgIFxuICAgICAgICBjeS5vbigndGFwZHJhZycsIGVUYXBEcmFnID0gZnVuY3Rpb24gKGV2ZW50KSB7XG4gICAgICAgICAgdmFyIGVkZ2UgPSBtb3ZlZEJlbmRFZGdlO1xuICAgICAgICAgIFxuICAgICAgICAgIGlmIChtb3ZlZEJlbmRFZGdlID09PSB1bmRlZmluZWQgfHwgbW92ZWRCZW5kSW5kZXggPT09IHVuZGVmaW5lZCkge1xuICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICAgIH1cblxuICAgICAgICAgIHZhciB3ZWlnaHRzID0gZWRnZS5kYXRhKCd3ZWlnaHRzJyk7XG4gICAgICAgICAgdmFyIGRpc3RhbmNlcyA9IGVkZ2UuZGF0YSgnZGlzdGFuY2VzJyk7XG5cbiAgICAgICAgICB2YXIgcmVsYXRpdmVCZW5kUG9zaXRpb24gPSBiZW5kUG9pbnRVdGlsaXRpZXMuY29udmVydFRvUmVsYXRpdmVCZW5kUG9zaXRpb24oZWRnZSwgZXZlbnQuY3lQb3NpdGlvbik7XG4gICAgICAgICAgd2VpZ2h0c1ttb3ZlZEJlbmRJbmRleF0gPSByZWxhdGl2ZUJlbmRQb3NpdGlvbi53ZWlnaHQ7XG4gICAgICAgICAgZGlzdGFuY2VzW21vdmVkQmVuZEluZGV4XSA9IHJlbGF0aXZlQmVuZFBvc2l0aW9uLmRpc3RhbmNlO1xuXG4gICAgICAgICAgZWRnZS5kYXRhKCd3ZWlnaHRzJywgd2VpZ2h0cyk7XG4gICAgICAgICAgZWRnZS5kYXRhKCdkaXN0YW5jZXMnLCBkaXN0YW5jZXMpO1xuICAgICAgICAgIFxuICAgICAgICAgIGNsZWFyRHJhd3MoKTtcbiAgICAgICAgICByZW5kZXJCZW5kU2hhcGVzKGVkZ2UpO1xuICAgICAgICB9KTtcbiAgICAgICAgXG4gICAgICAgIGN5Lm9uKCd0YXBlbmQnLCBlVGFwRW5kID0gZnVuY3Rpb24gKGV2ZW50KSB7XG4gICAgICAgICAgdmFyIGVkZ2UgPSBtb3ZlZEJlbmRFZGdlO1xuICAgICAgICAgIFxuICAgICAgICAgIGlmIChlZGdlICE9PSB1bmRlZmluZWQgJiYgbW92ZUJlbmRQYXJhbSAhPT0gdW5kZWZpbmVkICYmIGVkZ2UuZGF0YSgnd2VpZ2h0cycpXG4gICAgICAgICAgICAgICAgICAmJiBlZGdlLmRhdGEoJ3dlaWdodHMnKS50b1N0cmluZygpICE9IG1vdmVCZW5kUGFyYW0ud2VpZ2h0cy50b1N0cmluZygpKSB7XG4gICAgICAgICAgICBcbiAgICAgICAgICAgIGlmKG9wdGlvbnMoKS51bmRvYWJsZSkge1xuICAgICAgICAgICAgICBjeS51bmRvUmVkbygpLmRvKCdjaGFuZ2VCZW5kUG9pbnRzJywgbW92ZUJlbmRQYXJhbSk7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgfVxuXG4gICAgICAgICAgbW92ZWRCZW5kSW5kZXggPSB1bmRlZmluZWQ7XG4gICAgICAgICAgbW92ZWRCZW5kRWRnZSA9IHVuZGVmaW5lZDtcbiAgICAgICAgICBtb3ZlQmVuZFBhcmFtID0gdW5kZWZpbmVkO1xuXG4gICAgICAgICAgcmVzZXRHZXN0dXJlcygpO1xuICAgICAgICAgIGNsZWFyRHJhd3ModHJ1ZSk7XG4gICAgICAgIH0pO1xuICAgICAgICBcbiAgICAgICAgY3kub24oJ2N4dHRhcCcsICdlZGdlJywgZUN4dFRhcCA9IGZ1bmN0aW9uIChldmVudCkge1xuICAgICAgICAgIHZhciBlZGdlID0gdGhpcztcbiAgICAgICAgICB2YXIgY29udGFpbmVyUG9zID0gJChjeS5jb250YWluZXIoKSkucG9zaXRpb24oKTtcblxuICAgICAgICAgIHZhciBsZWZ0ID0gY29udGFpbmVyUG9zLmxlZnQgKyBldmVudC5jeVJlbmRlcmVkUG9zaXRpb24ueDtcbiAgICAgICAgICBsZWZ0ID0gbGVmdC50b1N0cmluZygpICsgJ3B4JztcblxuICAgICAgICAgIHZhciB0b3AgPSBjb250YWluZXJQb3MudG9wICsgZXZlbnQuY3lSZW5kZXJlZFBvc2l0aW9uLnk7XG4gICAgICAgICAgdG9wID0gdG9wLnRvU3RyaW5nKCkgKyAncHgnO1xuXG4gICAgICAgICAgJCgnLmN5LWVkZ2UtYmVuZC1lZGl0aW5nLWN0eC1vcGVyYXRpb24nKS5jc3MoJ2Rpc3BsYXknLCAnbm9uZScpO1xuXG4gICAgICAgICAgdmFyIHNlbGVjdGVkQmVuZEluZGV4ID0gZ2V0Q29udGFpbmluZ0JlbmRTaGFwZUluZGV4KGV2ZW50LmN5UG9zaXRpb24ueCwgZXZlbnQuY3lQb3NpdGlvbi55LCBlZGdlKTtcbiAgICAgICAgICBpZiAoc2VsZWN0ZWRCZW5kSW5kZXggPT0gLTEpIHtcbiAgICAgICAgICAgICRjdHhBZGRCZW5kUG9pbnQuY3NzKCdkaXNwbGF5JywgJ2Jsb2NrJyk7XG4gICAgICAgICAgICBiZW5kUG9pbnRVdGlsaXRpZXMuY3VycmVudEN0eFBvcyA9IGV2ZW50LmN5UG9zaXRpb247XG4gICAgICAgICAgICBjdHhNZW51ID0gZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQoXCJjeS1lZGdlLWJlbmQtZWRpdGluZy1jdHgtYWRkLWJlbmQtcG9pbnRcIik7XG4gICAgICAgICAgfVxuICAgICAgICAgIGVsc2Uge1xuICAgICAgICAgICAgJGN0eFJlbW92ZUJlbmRQb2ludC5jc3MoJ2Rpc3BsYXknLCAnYmxvY2snKTtcbiAgICAgICAgICAgIGJlbmRQb2ludFV0aWxpdGllcy5jdXJyZW50QmVuZEluZGV4ID0gc2VsZWN0ZWRCZW5kSW5kZXg7XG4gICAgICAgICAgICBjdHhNZW51ID0gZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQoXCJjeS1lZGdlLWJlbmQtZWRpdGluZy1jdHgtcmVtb3ZlLWJlbmQtcG9pbnRcIik7XG4gICAgICAgICAgfVxuXG4gICAgICAgICAgY3R4TWVudS5zdHlsZS5kaXNwbGF5ID0gXCJibG9ja1wiO1xuICAgICAgICAgIGN0eE1lbnUuc3R5bGUubGVmdCA9IGxlZnQ7XG4gICAgICAgICAgY3R4TWVudS5zdHlsZS50b3AgPSB0b3A7XG5cbiAgICAgICAgICBiZW5kUG9pbnRVdGlsaXRpZXMuY3VycmVudEN0eEVkZ2UgPSBlZGdlO1xuICAgICAgICB9KTtcbiAgICAgICAgXG4gICAgICAgIGN5Lm9uKCd0YXAnLCBlVGFwID0gZnVuY3Rpb24oZXZlbnQpIHtcbiAgICAgICAgICAkKCcuY3ktZWRnZS1iZW5kLWVkaXRpbmctY3R4LW9wZXJhdGlvbicpLmNzcygnZGlzcGxheScsICdub25lJyk7XG4gICAgICAgIH0pO1xuICAgICAgICBcbiAgICAgICAgY3kub24oJ2NoYW5nZUJlbmRQb2ludHMnLCAnZWRnZScsIGZ1bmN0aW9uKCkge1xuICAgICAgICAgIHZhciBlZGdlID0gdGhpcztcbiAgICAgICAgICBjbGVhckRyYXdzKCk7XG4gICAgICAgICAgcmVuZGVyQmVuZFNoYXBlcyhlZGdlKTtcbiAgICAgICAgfSk7XG4gICAgICAgIFxuICAgICAgfSk7XG5cbiAgICAgICRjb250YWluZXIuZGF0YSgnY3llZGdlYmVuZGVkaXRpbmcnLCBkYXRhKTtcbiAgICB9LFxuICAgIHVuYmluZDogZnVuY3Rpb24gKCkge1xuICAgICAgICBjeS5vZmYoJ3Bvc2l0aW9uJywgJ25vZGUnLCBlUG9zaXRpb24pXG4gICAgICAgICAgLm9mZigncmVtb3ZlJywgJ25vZGUnLCBlUmVtb3ZlKVxuICAgICAgICAgIC5vZmYoJ3NlbGVjdCcsICdlZGdlJywgZVNlbGVjdClcbiAgICAgICAgICAub2ZmKCd1bnNlbGVjdCcsICdlZGdlJywgZVVuc2VsZWN0KVxuICAgICAgICAgIC5vZmYoJ3RhcHN0YXJ0JywgJ2VkZ2UnLCBlVGFwU3RhcnQpXG4gICAgICAgICAgLm9mZigndGFwZHJhZycsIGVUYXBEcmFnKVxuICAgICAgICAgIC5vZmYoJ3RhcGVuZCcsIGVUYXBFbmQpXG4gICAgICAgICAgLm9mZignY3h0dGFwJywgZUN4dFRhcClcbiAgICAgICAgICAub2ZmKCd0YXAnLCBlVGFwKTtcblxuICAgICAgICBjeS51bmJpbmQoXCJ6b29tIHBhblwiLCBlWm9vbSk7XG4gICAgfVxuICB9O1xuXG4gIGlmIChmdW5jdGlvbnNbZm5dKSB7XG4gICAgcmV0dXJuIGZ1bmN0aW9uc1tmbl0uYXBwbHkodGhpcywgQXJyYXkucHJvdG90eXBlLnNsaWNlLmNhbGwoYXJndW1lbnRzLCAxKSk7XG4gIH0gZWxzZSBpZiAodHlwZW9mIGZuID09ICdvYmplY3QnIHx8ICFmbikge1xuICAgIHJldHVybiBmdW5jdGlvbnMuaW5pdC5hcHBseSh0aGlzLCBhcmd1bWVudHMpO1xuICB9IGVsc2Uge1xuICAgICQuZXJyb3IoJ05vIHN1Y2ggZnVuY3Rpb24gYCcgKyBmbiArICdgIGZvciBjeXRvc2NhcGUuanMtZWRnZS1iZW5kLWVkaXRpbmcnKTtcbiAgfVxuXG4gIHJldHVybiAkKHRoaXMpO1xufTsiLCJ2YXIgYmVuZFBvaW50VXRpbGl0aWVzID0ge1xyXG4gIGN1cnJlbnRDdHhFZGdlOiB1bmRlZmluZWQsXHJcbiAgY3VycmVudEN0eFBvczogdW5kZWZpbmVkLFxyXG4gIGN1cnJlbnRCZW5kSW5kZXg6IHVuZGVmaW5lZCxcclxuICAvLyBpbml0aWxpemUgYmVuZCBwb2ludHMgYmFzZWQgb24gYmVuZFBvc2l0aW9uc0ZjblxyXG4gIGluaXRCZW5kUG9pbnRzOiBmdW5jdGlvbihiZW5kUG9zaXRpb25zRmNuKSB7XHJcbiAgICB2YXIgZWRnZXMgPSBjeS5lZGdlcygpO1xyXG5cclxuICAgIGZvciAodmFyIGkgPSAwOyBpIDwgZWRnZXMubGVuZ3RoOyBpKyspIHtcclxuICAgICAgdmFyIGVkZ2UgPSBlZGdlc1tpXTtcclxuICAgICAgXHJcbiAgICAgIC8vIGdldCB0aGUgYmVuZCBwb3NpdGlvbnMgYnkgYXBwbHlpbmcgdGhlIGZ1bmN0aW9uIGZvciB0aGlzIGVkZ2VcclxuICAgICAgdmFyIGJlbmRQb3NpdGlvbnMgPSBiZW5kUG9zaXRpb25zRmNuLmFwcGx5KHRoaXMsIGVkZ2UpO1xyXG4gICAgICAvLyBjYWxjdWxhdGUgcmVsYXRpdmUgYmVuZCBwb3NpdGlvbnNcclxuICAgICAgdmFyIHJlc3VsdCA9IHRoaXMuY29udmVydFRvUmVsYXRpdmVCZW5kUG9zaXRpb25zKGVkZ2UsIGJlbmRQb3NpdGlvbnMpO1xyXG5cclxuICAgICAgLy8gaWYgdGhlcmUgYXJlIGJlbmQgcG9pbnRzIHNldCB3ZWlnaHRzIGFuZCBkaXN0YW5jZXMgYWNjb3JkaW5nbHkgYW5kIGFkZCBjbGFzcyB0byBlbmFibGUgc3R5bGUgY2hhbmdlc1xyXG4gICAgICBpZiAocmVzdWx0LmRpc3RhbmNlcy5sZW5ndGggPiAwKSB7XHJcbiAgICAgICAgZWRnZS5kYXRhKCd3ZWlnaHRzJywgcmVzdWx0LndlaWdodHMpO1xyXG4gICAgICAgIGVkZ2UuZGF0YSgnZGlzdGFuY2VzJywgcmVzdWx0LmRpc3RhbmNlcyk7XHJcbiAgICAgICAgZWRnZS5hZGRDbGFzcygnZWRnZWJlbmRlZGl0aW5nLWhhc2JlbmRwb2ludHMnKTtcclxuICAgICAgfVxyXG4gICAgfVxyXG4gIH0sXHJcbiAgLy9HZXQgdGhlIGRpcmVjdGlvbiBvZiB0aGUgbGluZSBmcm9tIHNvdXJjZSBwb2ludCB0byB0aGUgdGFyZ2V0IHBvaW50XHJcbiAgZ2V0TGluZURpcmVjdGlvbjogZnVuY3Rpb24oc3JjUG9pbnQsIHRndFBvaW50KXtcclxuICAgIGlmKHNyY1BvaW50LnkgPT0gdGd0UG9pbnQueSAmJiBzcmNQb2ludC54IDwgdGd0UG9pbnQueCl7XHJcbiAgICAgIHJldHVybiAxO1xyXG4gICAgfVxyXG4gICAgaWYoc3JjUG9pbnQueSA8IHRndFBvaW50LnkgJiYgc3JjUG9pbnQueCA8IHRndFBvaW50Lngpe1xyXG4gICAgICByZXR1cm4gMjtcclxuICAgIH1cclxuICAgIGlmKHNyY1BvaW50LnkgPCB0Z3RQb2ludC55ICYmIHNyY1BvaW50LnggPT0gdGd0UG9pbnQueCl7XHJcbiAgICAgIHJldHVybiAzO1xyXG4gICAgfVxyXG4gICAgaWYoc3JjUG9pbnQueSA8IHRndFBvaW50LnkgJiYgc3JjUG9pbnQueCA+IHRndFBvaW50Lngpe1xyXG4gICAgICByZXR1cm4gNDtcclxuICAgIH1cclxuICAgIGlmKHNyY1BvaW50LnkgPT0gdGd0UG9pbnQueSAmJiBzcmNQb2ludC54ID4gdGd0UG9pbnQueCl7XHJcbiAgICAgIHJldHVybiA1O1xyXG4gICAgfVxyXG4gICAgaWYoc3JjUG9pbnQueSA+IHRndFBvaW50LnkgJiYgc3JjUG9pbnQueCA+IHRndFBvaW50Lngpe1xyXG4gICAgICByZXR1cm4gNjtcclxuICAgIH1cclxuICAgIGlmKHNyY1BvaW50LnkgPiB0Z3RQb2ludC55ICYmIHNyY1BvaW50LnggPT0gdGd0UG9pbnQueCl7XHJcbiAgICAgIHJldHVybiA3O1xyXG4gICAgfVxyXG4gICAgcmV0dXJuIDg7Ly9pZiBzcmNQb2ludC55ID4gdGd0UG9pbnQueSBhbmQgc3JjUG9pbnQueCA8IHRndFBvaW50LnhcclxuICB9LFxyXG4gIGdldFNyY1RndFBvaW50c0FuZFRhbmdlbnRzOiBmdW5jdGlvbiAoZWRnZSkge1xyXG4gICAgdmFyIHNvdXJjZU5vZGUgPSBlZGdlLnNvdXJjZSgpO1xyXG4gICAgdmFyIHRhcmdldE5vZGUgPSBlZGdlLnRhcmdldCgpO1xyXG4gICAgXHJcbiAgICB2YXIgdGd0UG9zaXRpb24gPSB0YXJnZXROb2RlLnBvc2l0aW9uKCk7XHJcbiAgICB2YXIgc3JjUG9zaXRpb24gPSBzb3VyY2VOb2RlLnBvc2l0aW9uKCk7XHJcbiAgICBcclxuICAgIHZhciBzcmNQb2ludCA9IHNvdXJjZU5vZGUucG9zaXRpb24oKTtcclxuICAgIHZhciB0Z3RQb2ludCA9IHRhcmdldE5vZGUucG9zaXRpb24oKTtcclxuXHJcblxyXG4gICAgdmFyIG0xID0gKHRndFBvaW50LnkgLSBzcmNQb2ludC55KSAvICh0Z3RQb2ludC54IC0gc3JjUG9pbnQueCk7XHJcbiAgICB2YXIgbTIgPSAtMSAvIG0xO1xyXG5cclxuICAgIHJldHVybiB7XHJcbiAgICAgIG0xOiBtMSxcclxuICAgICAgbTI6IG0yLFxyXG4gICAgICBzcmNQb2ludDogc3JjUG9pbnQsXHJcbiAgICAgIHRndFBvaW50OiB0Z3RQb2ludFxyXG4gICAgfTtcclxuICB9LFxyXG4gIGdldEludGVyc2VjdGlvbjogZnVuY3Rpb24oZWRnZSwgcG9pbnQsIHNyY1RndFBvaW50c0FuZFRhbmdlbnRzKXtcclxuICAgIGlmIChzcmNUZ3RQb2ludHNBbmRUYW5nZW50cyA9PT0gdW5kZWZpbmVkKSB7XHJcbiAgICAgIHNyY1RndFBvaW50c0FuZFRhbmdlbnRzID0gdGhpcy5nZXRTcmNUZ3RQb2ludHNBbmRUYW5nZW50cyhlZGdlKTtcclxuICAgIH1cclxuXHJcbiAgICB2YXIgc3JjUG9pbnQgPSBzcmNUZ3RQb2ludHNBbmRUYW5nZW50cy5zcmNQb2ludDtcclxuICAgIHZhciB0Z3RQb2ludCA9IHNyY1RndFBvaW50c0FuZFRhbmdlbnRzLnRndFBvaW50O1xyXG4gICAgdmFyIG0xID0gc3JjVGd0UG9pbnRzQW5kVGFuZ2VudHMubTE7XHJcbiAgICB2YXIgbTIgPSBzcmNUZ3RQb2ludHNBbmRUYW5nZW50cy5tMjtcclxuXHJcbiAgICB2YXIgaW50ZXJzZWN0WDtcclxuICAgIHZhciBpbnRlcnNlY3RZO1xyXG5cclxuICAgIGlmKG0xID09IEluZmluaXR5IHx8IG0xID09IC1JbmZpbml0eSl7XHJcbiAgICAgIGludGVyc2VjdFggPSBzcmNQb2ludC54O1xyXG4gICAgICBpbnRlcnNlY3RZID0gcG9pbnQueTtcclxuICAgIH1cclxuICAgIGVsc2UgaWYobTEgPT0gMCl7XHJcbiAgICAgIGludGVyc2VjdFggPSBwb2ludC54O1xyXG4gICAgICBpbnRlcnNlY3RZID0gc3JjUG9pbnQueTtcclxuICAgIH1cclxuICAgIGVsc2Uge1xyXG4gICAgICB2YXIgYTEgPSBzcmNQb2ludC55IC0gbTEgKiBzcmNQb2ludC54O1xyXG4gICAgICB2YXIgYTIgPSBwb2ludC55IC0gbTIgKiBwb2ludC54O1xyXG5cclxuICAgICAgaW50ZXJzZWN0WCA9IChhMiAtIGExKSAvIChtMSAtIG0yKTtcclxuICAgICAgaW50ZXJzZWN0WSA9IG0xICogaW50ZXJzZWN0WCArIGExO1xyXG4gICAgfVxyXG5cclxuICAgIC8vSW50ZXJzZWN0aW9uIHBvaW50IGlzIHRoZSBpbnRlcnNlY3Rpb24gb2YgdGhlIGxpbmVzIHBhc3NpbmcgdGhyb3VnaCB0aGUgbm9kZXMgYW5kXHJcbiAgICAvL3Bhc3NpbmcgdGhyb3VnaCB0aGUgYmVuZCBwb2ludCBhbmQgcGVycGVuZGljdWxhciB0byB0aGUgb3RoZXIgbGluZVxyXG4gICAgdmFyIGludGVyc2VjdGlvblBvaW50ID0ge1xyXG4gICAgICB4OiBpbnRlcnNlY3RYLFxyXG4gICAgICB5OiBpbnRlcnNlY3RZXHJcbiAgICB9O1xyXG4gICAgXHJcbiAgICByZXR1cm4gaW50ZXJzZWN0aW9uUG9pbnQ7XHJcbiAgfSxcclxuICBnZXRTZWdtZW50UG9pbnRzOiBmdW5jdGlvbihlZGdlKSB7XHJcbiAgICB2YXIgc2VncHRzID0gW107XHJcblxyXG4gICAgdmFyIHNlZ21lbnRXcyA9IGVkZ2UucHN0eWxlKCAnc2VnbWVudC13ZWlnaHRzJyApLnBmVmFsdWU7XHJcbiAgICB2YXIgc2VnbWVudERzID0gZWRnZS5wc3R5bGUoICdzZWdtZW50LWRpc3RhbmNlcycgKS5wZlZhbHVlO1xyXG4gICAgdmFyIHNlZ21lbnRzTiA9IE1hdGgubWluKCBzZWdtZW50V3MubGVuZ3RoLCBzZWdtZW50RHMubGVuZ3RoICk7XHJcbiAgICBcclxuICAgIHZhciBzcmNQb3MgPSBlZGdlLnNvdXJjZSgpLnBvc2l0aW9uKCk7XHJcbiAgICB2YXIgdGd0UG9zID0gZWRnZS50YXJnZXQoKS5wb3NpdGlvbigpO1xyXG5cclxuICAgIHZhciBkeSA9ICggdGd0UG9zLnkgLSBzcmNQb3MueSApO1xyXG4gICAgdmFyIGR4ID0gKCB0Z3RQb3MueCAtIHNyY1Bvcy54ICk7XHJcbiAgICBcclxuICAgIHZhciBsID0gTWF0aC5zcXJ0KCBkeCAqIGR4ICsgZHkgKiBkeSApO1xyXG5cclxuICAgIHZhciB2ZWN0b3IgPSB7XHJcbiAgICAgIHg6IGR4LFxyXG4gICAgICB5OiBkeVxyXG4gICAgfTtcclxuXHJcbiAgICB2YXIgdmVjdG9yTm9ybSA9IHtcclxuICAgICAgeDogdmVjdG9yLnggLyBsLFxyXG4gICAgICB5OiB2ZWN0b3IueSAvIGxcclxuICAgIH07XHJcbiAgICBcclxuICAgIHZhciB2ZWN0b3JOb3JtSW52ZXJzZSA9IHtcclxuICAgICAgeDogLXZlY3Rvck5vcm0ueSxcclxuICAgICAgeTogdmVjdG9yTm9ybS54XHJcbiAgICB9O1xyXG5cclxuICAgIGZvciggdmFyIHMgPSAwOyBzIDwgc2VnbWVudHNOOyBzKysgKXtcclxuICAgICAgdmFyIHcgPSBzZWdtZW50V3NbIHMgXTtcclxuICAgICAgdmFyIGQgPSBzZWdtZW50RHNbIHMgXTtcclxuXHJcbiAgICAgIC8vIGQgPSBzd2FwcGVkRGlyZWN0aW9uID8gLWQgOiBkO1xyXG4gICAgICAvL1xyXG4gICAgICAvLyBkID0gTWF0aC5hYnMoZCk7XHJcblxyXG4gICAgICAvLyB2YXIgdzEgPSAhc3dhcHBlZERpcmVjdGlvbiA/ICgxIC0gdykgOiB3O1xyXG4gICAgICAvLyB2YXIgdzIgPSAhc3dhcHBlZERpcmVjdGlvbiA/IHcgOiAoMSAtIHcpO1xyXG5cclxuICAgICAgdmFyIHcxID0gKDEgLSB3KTtcclxuICAgICAgdmFyIHcyID0gdztcclxuXHJcbiAgICAgIHZhciBwb3NQdHMgPSB7XHJcbiAgICAgICAgeDE6IHNyY1Bvcy54LFxyXG4gICAgICAgIHgyOiB0Z3RQb3MueCxcclxuICAgICAgICB5MTogc3JjUG9zLnksXHJcbiAgICAgICAgeTI6IHRndFBvcy55XHJcbiAgICAgIH07XHJcblxyXG4gICAgICB2YXIgbWlkcHRQdHMgPSBwb3NQdHM7XHJcbiAgICAgIFxyXG4gICAgICBcclxuXHJcbiAgICAgIHZhciBhZGp1c3RlZE1pZHB0ID0ge1xyXG4gICAgICAgIHg6IG1pZHB0UHRzLngxICogdzEgKyBtaWRwdFB0cy54MiAqIHcyLFxyXG4gICAgICAgIHk6IG1pZHB0UHRzLnkxICogdzEgKyBtaWRwdFB0cy55MiAqIHcyXHJcbiAgICAgIH07XHJcblxyXG4gICAgICBzZWdwdHMucHVzaChcclxuICAgICAgICBhZGp1c3RlZE1pZHB0LnggKyB2ZWN0b3JOb3JtSW52ZXJzZS54ICogZCxcclxuICAgICAgICBhZGp1c3RlZE1pZHB0LnkgKyB2ZWN0b3JOb3JtSW52ZXJzZS55ICogZFxyXG4gICAgICApO1xyXG4gICAgfVxyXG4gICAgXHJcbiAgICByZXR1cm4gc2VncHRzO1xyXG4gIH0sXHJcbiAgY29udmVydFRvUmVsYXRpdmVCZW5kUG9zaXRpb246IGZ1bmN0aW9uIChlZGdlLCBiZW5kUG9pbnQsIHNyY1RndFBvaW50c0FuZFRhbmdlbnRzKSB7XHJcbiAgICBpZiAoc3JjVGd0UG9pbnRzQW5kVGFuZ2VudHMgPT09IHVuZGVmaW5lZCkge1xyXG4gICAgICBzcmNUZ3RQb2ludHNBbmRUYW5nZW50cyA9IHRoaXMuZ2V0U3JjVGd0UG9pbnRzQW5kVGFuZ2VudHMoZWRnZSk7XHJcbiAgICB9XHJcbiAgICBcclxuICAgIHZhciBpbnRlcnNlY3Rpb25Qb2ludCA9IHRoaXMuZ2V0SW50ZXJzZWN0aW9uKGVkZ2UsIGJlbmRQb2ludCwgc3JjVGd0UG9pbnRzQW5kVGFuZ2VudHMpO1xyXG4gICAgdmFyIGludGVyc2VjdFggPSBpbnRlcnNlY3Rpb25Qb2ludC54O1xyXG4gICAgdmFyIGludGVyc2VjdFkgPSBpbnRlcnNlY3Rpb25Qb2ludC55O1xyXG4gICAgXHJcbiAgICB2YXIgc3JjUG9pbnQgPSBzcmNUZ3RQb2ludHNBbmRUYW5nZW50cy5zcmNQb2ludDtcclxuICAgIHZhciB0Z3RQb2ludCA9IHNyY1RndFBvaW50c0FuZFRhbmdlbnRzLnRndFBvaW50O1xyXG4gICAgXHJcbiAgICB2YXIgd2VpZ2h0ID0gaW50ZXJzZWN0WCA9PSBzcmNQb2ludC54PzA6KGludGVyc2VjdFggLSBzcmNQb2ludC54KSAvICh0Z3RQb2ludC54IC0gc3JjUG9pbnQueCk7XHJcbiAgICB2YXIgZGlzdGFuY2UgPSBNYXRoLnNxcnQoTWF0aC5wb3coKGludGVyc2VjdFkgLSBiZW5kUG9pbnQueSksIDIpXHJcbiAgICAgICAgKyBNYXRoLnBvdygoaW50ZXJzZWN0WCAtIGJlbmRQb2ludC54KSwgMikpO1xyXG4gICAgXHJcbiAgICAvL0dldCB0aGUgZGlyZWN0aW9uIG9mIHRoZSBsaW5lIGZvcm0gc291cmNlIHBvaW50IHRvIHRhcmdldCBwb2ludFxyXG4gICAgdmFyIGRpcmVjdGlvbjEgPSB0aGlzLmdldExpbmVEaXJlY3Rpb24oc3JjUG9pbnQsIHRndFBvaW50KTtcclxuICAgIC8vR2V0IHRoZSBkaXJlY3Rpb24gb2YgdGhlIGxpbmUgZnJvbSBpbnRlc2VjdGlvbiBwb2ludCB0byBiZW5kIHBvaW50XHJcbiAgICB2YXIgZGlyZWN0aW9uMiA9IHRoaXMuZ2V0TGluZURpcmVjdGlvbihpbnRlcnNlY3Rpb25Qb2ludCwgYmVuZFBvaW50KTtcclxuICAgIFxyXG4gICAgLy9JZiB0aGUgZGlmZmVyZW5jZSBpcyBub3QgLTIgYW5kIG5vdCA2IHRoZW4gdGhlIGRpcmVjdGlvbiBvZiB0aGUgZGlzdGFuY2UgaXMgbmVnYXRpdmVcclxuICAgIGlmKGRpcmVjdGlvbjEgLSBkaXJlY3Rpb24yICE9IC0yICYmIGRpcmVjdGlvbjEgLSBkaXJlY3Rpb24yICE9IDYpe1xyXG4gICAgICBpZihkaXN0YW5jZSAhPSAwKVxyXG4gICAgICAgIGRpc3RhbmNlID0gLTEgKiBkaXN0YW5jZTtcclxuICAgIH1cclxuICAgIFxyXG4gICAgdmFyIG1pbkRpZmYgPSAwLjAwMTtcclxuICAgIFxyXG4gICAgaWYoTWF0aC5hYnMod2VpZ2h0IC0gMCkgPCBtaW5EaWZmKXtcclxuICAgICAgd2VpZ2h0ID0gbWluRGlmZjtcclxuICAgIH1cclxuICAgIGVsc2UgaWYoTWF0aC5hYnMod2VpZ2h0IC0gMSkgPCBtaW5EaWZmKXtcclxuICAgICAgd2VpZ2h0ID0gMSAtIG1pbkRpZmY7XHJcbiAgICB9XHJcbiAgICBcclxuICAgIHJldHVybiB7XHJcbiAgICAgIHdlaWdodDogd2VpZ2h0LFxyXG4gICAgICBkaXN0YW5jZTogZGlzdGFuY2VcclxuICAgIH07XHJcbiAgfSxcclxuICBjb252ZXJ0VG9SZWxhdGl2ZUJlbmRQb3NpdGlvbnM6IGZ1bmN0aW9uIChlZGdlLCBiZW5kUG9pbnRzKSB7XHJcbiAgICB2YXIgc3JjVGd0UG9pbnRzQW5kVGFuZ2VudHMgPSB0aGlzLmdldFNyY1RndFBvaW50c0FuZFRhbmdlbnRzKGVkZ2UpO1xyXG4vLyAgICB2YXIgYmVuZFBvaW50cyA9IGVkZ2UuZGF0YSgnYmVuZFBvaW50UG9zaXRpb25zJyk7XHJcbiAgICAvL291dHB1dCB2YXJpYWJsZXNcclxuICAgIHZhciB3ZWlnaHRzID0gW107XHJcbiAgICB2YXIgZGlzdGFuY2VzID0gW107XHJcblxyXG4gICAgZm9yICh2YXIgaSA9IDA7IGJlbmRQb2ludHMgJiYgaSA8IGJlbmRQb2ludHMubGVuZ3RoOyBpKyspIHtcclxuICAgICAgdmFyIGJlbmRQb2ludCA9IGJlbmRQb2ludHNbaV07XHJcbiAgICAgIHZhciByZWxhdGl2ZUJlbmRQb3NpdGlvbiA9IHRoaXMuY29udmVydFRvUmVsYXRpdmVCZW5kUG9zaXRpb24oZWRnZSwgYmVuZFBvaW50LCBzcmNUZ3RQb2ludHNBbmRUYW5nZW50cyk7XHJcblxyXG4gICAgICB3ZWlnaHRzLnB1c2gocmVsYXRpdmVCZW5kUG9zaXRpb24ud2VpZ2h0KTtcclxuICAgICAgZGlzdGFuY2VzLnB1c2gocmVsYXRpdmVCZW5kUG9zaXRpb24uZGlzdGFuY2UpO1xyXG4gICAgfVxyXG5cclxuICAgIHJldHVybiB7XHJcbiAgICAgIHdlaWdodHM6IHdlaWdodHMsXHJcbiAgICAgIGRpc3RhbmNlczogZGlzdGFuY2VzXHJcbiAgICB9O1xyXG4gIH0sXHJcbiAgZ2V0U2VnbWVudERpc3RhbmNlc1N0cmluZzogZnVuY3Rpb24gKGVkZ2UpIHtcclxuICAgIHZhciBzdHIgPSBcIlwiO1xyXG5cclxuICAgIHZhciBkaXN0YW5jZXMgPSBlZGdlLmRhdGEoJ2Rpc3RhbmNlcycpO1xyXG4gICAgZm9yICh2YXIgaSA9IDA7IGRpc3RhbmNlcyAmJiBpIDwgZGlzdGFuY2VzLmxlbmd0aDsgaSsrKSB7XHJcbiAgICAgIHN0ciA9IHN0ciArIFwiIFwiICsgZGlzdGFuY2VzW2ldO1xyXG4gICAgfVxyXG4gICAgXHJcbiAgICByZXR1cm4gc3RyO1xyXG4gIH0sXHJcbiAgZ2V0U2VnbWVudFdlaWdodHNTdHJpbmc6IGZ1bmN0aW9uIChlZGdlKSB7XHJcbiAgICB2YXIgc3RyID0gXCJcIjtcclxuXHJcbiAgICB2YXIgd2VpZ2h0cyA9IGVkZ2UuZGF0YSgnd2VpZ2h0cycpO1xyXG4gICAgZm9yICh2YXIgaSA9IDA7IHdlaWdodHMgJiYgaSA8IHdlaWdodHMubGVuZ3RoOyBpKyspIHtcclxuICAgICAgc3RyID0gc3RyICsgXCIgXCIgKyB3ZWlnaHRzW2ldO1xyXG4gICAgfVxyXG4gICAgXHJcbiAgICByZXR1cm4gc3RyO1xyXG4gIH0sXHJcbiAgYWRkQmVuZFBvaW50OiBmdW5jdGlvbihlZGdlLCBuZXdCZW5kUG9pbnQpIHtcclxuICAgIGlmKGVkZ2UgPT09IHVuZGVmaW5lZCB8fCBuZXdCZW5kUG9pbnQgPT09IHVuZGVmaW5lZCl7XHJcbiAgICAgIGVkZ2UgPSB0aGlzLmN1cnJlbnRDdHhFZGdlO1xyXG4gICAgICBuZXdCZW5kUG9pbnQgPSB0aGlzLmN1cnJlbnRDdHhQb3M7XHJcbiAgICB9XHJcbiAgICBcclxuICAgIHZhciByZWxhdGl2ZUJlbmRQb3NpdGlvbiA9IHRoaXMuY29udmVydFRvUmVsYXRpdmVCZW5kUG9zaXRpb24oZWRnZSwgbmV3QmVuZFBvaW50KTtcclxuICAgIHZhciBvcmlnaW5hbFBvaW50V2VpZ2h0ID0gcmVsYXRpdmVCZW5kUG9zaXRpb24ud2VpZ2h0O1xyXG4gICAgXHJcbiAgICB2YXIgZWRnZVN0YXJ0WCA9IGVkZ2UuX3ByaXZhdGUucnNjcmF0Y2guc3RhcnRYO1xyXG4gICAgdmFyIGVkZ2VTdGFydFkgPSBlZGdlLl9wcml2YXRlLnJzY3JhdGNoLnN0YXJ0WTtcclxuICAgIHZhciBlZGdlRW5kWCA9IGVkZ2UuX3ByaXZhdGUucnNjcmF0Y2guZW5kWDtcclxuICAgIHZhciBlZGdlRW5kWSA9IGVkZ2UuX3ByaXZhdGUucnNjcmF0Y2guZW5kWTtcclxuICAgIFxyXG4gICAgdmFyIHN0YXJ0V2VpZ2h0ID0gdGhpcy5jb252ZXJ0VG9SZWxhdGl2ZUJlbmRQb3NpdGlvbihlZGdlLCB7eDogZWRnZVN0YXJ0WCwgeTogZWRnZVN0YXJ0WX0pLndlaWdodDtcclxuICAgIHZhciBlbmRXZWlnaHQgPSB0aGlzLmNvbnZlcnRUb1JlbGF0aXZlQmVuZFBvc2l0aW9uKGVkZ2UsIHt4OiBlZGdlRW5kWCwgeTogZWRnZUVuZFl9KS53ZWlnaHQ7XHJcbiAgICB2YXIgd2VpZ2h0c1dpdGhUZ3RTcmMgPSBbc3RhcnRXZWlnaHRdLmNvbmNhdChlZGdlLmRhdGEoJ3dlaWdodHMnKT9lZGdlLmRhdGEoJ3dlaWdodHMnKTpbXSkuY29uY2F0KFtlbmRXZWlnaHRdKTtcclxuICAgIFxyXG4gICAgdmFyIG1pbkRpc3QgPSBJbmZpbml0eTtcclxuICAgIHZhciBpbnRlcnNlY3Rpb247XHJcbiAgICB2YXIgc2VncHRzV2l0aFRndFNyYyA9IFtlZGdlU3RhcnRYLCBlZGdlU3RhcnRZXVxyXG4gICAgICAgICAgICAuY29uY2F0KGVkZ2UuX3ByaXZhdGUucnNjcmF0Y2guc2VncHRzP2VkZ2UuX3ByaXZhdGUucnNjcmF0Y2guc2VncHRzOltdKVxyXG4gICAgICAgICAgICAuY29uY2F0KFtlZGdlRW5kWCwgZWRnZUVuZFldKTtcclxuICAgIHZhciBuZXdCZW5kSW5kZXggPSAtMTtcclxuICAgIFxyXG4gICAgZm9yKHZhciBpID0gMDsgaSA8IHdlaWdodHNXaXRoVGd0U3JjLmxlbmd0aCAtIDE7IGkrKyl7XHJcbiAgICAgIHZhciB3MSA9IHdlaWdodHNXaXRoVGd0U3JjW2ldO1xyXG4gICAgICB2YXIgdzIgPSB3ZWlnaHRzV2l0aFRndFNyY1tpICsgMV07XHJcbiAgICAgIFxyXG4gICAgICAvL2NoZWNrIGlmIHRoZSB3ZWlnaHQgaXMgYmV0d2VlbiB3MSBhbmQgdzJcclxuICAgICAgaWYoKG9yaWdpbmFsUG9pbnRXZWlnaHQgPD0gdzEgJiYgb3JpZ2luYWxQb2ludFdlaWdodCA+PSB3MikgfHwgKG9yaWdpbmFsUG9pbnRXZWlnaHQgPD0gdzIgJiYgb3JpZ2luYWxQb2ludFdlaWdodCA+PSB3MSkpe1xyXG4gICAgICAgIHZhciBzdGFydFggPSBzZWdwdHNXaXRoVGd0U3JjWzIgKiBpXTtcclxuICAgICAgICB2YXIgc3RhcnRZID0gc2VncHRzV2l0aFRndFNyY1syICogaSArIDFdO1xyXG4gICAgICAgIHZhciBlbmRYID0gc2VncHRzV2l0aFRndFNyY1syICogaSArIDJdO1xyXG4gICAgICAgIHZhciBlbmRZID0gc2VncHRzV2l0aFRndFNyY1syICogaSArIDNdO1xyXG4gICAgICAgIFxyXG4gICAgICAgIHZhciBzdGFydCA9IHtcclxuICAgICAgICAgIHg6IHN0YXJ0WCxcclxuICAgICAgICAgIHk6IHN0YXJ0WVxyXG4gICAgICAgIH07XHJcbiAgICAgICAgXHJcbiAgICAgICAgdmFyIGVuZCA9IHtcclxuICAgICAgICAgIHg6IGVuZFgsXHJcbiAgICAgICAgICB5OiBlbmRZXHJcbiAgICAgICAgfTtcclxuICAgICAgICBcclxuICAgICAgICB2YXIgbTEgPSAoIHN0YXJ0WSAtIGVuZFkgKSAvICggc3RhcnRYIC0gZW5kWCApO1xyXG4gICAgICAgIHZhciBtMiA9IC0xIC8gbTE7XHJcbiAgICAgICAgXHJcbiAgICAgICAgdmFyIHNyY1RndFBvaW50c0FuZFRhbmdlbnRzID0ge1xyXG4gICAgICAgICAgc3JjUG9pbnQ6IHN0YXJ0LFxyXG4gICAgICAgICAgdGd0UG9pbnQ6IGVuZCxcclxuICAgICAgICAgIG0xOiBtMSxcclxuICAgICAgICAgIG0yOiBtMlxyXG4gICAgICAgIH07XHJcbiAgICAgICAgXHJcbiAgICAgICAgLy9nZXQgdGhlIGludGVyc2VjdGlvbiBvZiB0aGUgY3VycmVudCBzZWdtZW50IHdpdGggdGhlIG5ldyBiZW5kIHBvaW50XHJcbiAgICAgICAgdmFyIGN1cnJlbnRJbnRlcnNlY3Rpb24gPSB0aGlzLmdldEludGVyc2VjdGlvbihlZGdlLCBuZXdCZW5kUG9pbnQsIHNyY1RndFBvaW50c0FuZFRhbmdlbnRzKTtcclxuICAgICAgICB2YXIgZGlzdCA9IE1hdGguc3FydCggTWF0aC5wb3coIChuZXdCZW5kUG9pbnQueCAtIGN1cnJlbnRJbnRlcnNlY3Rpb24ueCksIDIgKSBcclxuICAgICAgICAgICAgICAgICsgTWF0aC5wb3coIChuZXdCZW5kUG9pbnQueSAtIGN1cnJlbnRJbnRlcnNlY3Rpb24ueSksIDIgKSk7XHJcbiAgICAgICAgXHJcbiAgICAgICAgLy9VcGRhdGUgdGhlIG1pbmltdW0gZGlzdGFuY2VcclxuICAgICAgICBpZihkaXN0IDwgbWluRGlzdCl7XHJcbiAgICAgICAgICBtaW5EaXN0ID0gZGlzdDtcclxuICAgICAgICAgIGludGVyc2VjdGlvbiA9IGN1cnJlbnRJbnRlcnNlY3Rpb247XHJcbiAgICAgICAgICBuZXdCZW5kSW5kZXggPSBpO1xyXG4gICAgICAgIH1cclxuICAgICAgfVxyXG4gICAgfVxyXG4gICAgXHJcbiAgICBpZihpbnRlcnNlY3Rpb24gIT09IHVuZGVmaW5lZCl7XHJcbiAgICAgIG5ld0JlbmRQb2ludCA9IGludGVyc2VjdGlvbjtcclxuICAgIH1cclxuICAgIFxyXG4gICAgcmVsYXRpdmVCZW5kUG9zaXRpb24gPSB0aGlzLmNvbnZlcnRUb1JlbGF0aXZlQmVuZFBvc2l0aW9uKGVkZ2UsIG5ld0JlbmRQb2ludCk7XHJcbiAgICBcclxuICAgIGlmKGludGVyc2VjdGlvbiA9PT0gdW5kZWZpbmVkKXtcclxuICAgICAgcmVsYXRpdmVCZW5kUG9zaXRpb24uZGlzdGFuY2UgPSAwO1xyXG4gICAgfVxyXG5cclxuICAgIHZhciB3ZWlnaHRzID0gZWRnZS5kYXRhKCd3ZWlnaHRzJyk7XHJcbiAgICB2YXIgZGlzdGFuY2VzID0gZWRnZS5kYXRhKCdkaXN0YW5jZXMnKTtcclxuICAgIFxyXG4gICAgd2VpZ2h0cyA9IHdlaWdodHM/d2VpZ2h0czpbXTtcclxuICAgIGRpc3RhbmNlcyA9IGRpc3RhbmNlcz9kaXN0YW5jZXM6W107XHJcbiAgICBcclxuICAgIGlmKHdlaWdodHMubGVuZ3RoID09PSAwKSB7XHJcbiAgICAgIG5ld0JlbmRJbmRleCA9IDA7XHJcbiAgICB9XHJcbiAgICBcclxuLy8gICAgd2VpZ2h0cy5wdXNoKHJlbGF0aXZlQmVuZFBvc2l0aW9uLndlaWdodCk7XHJcbi8vICAgIGRpc3RhbmNlcy5wdXNoKHJlbGF0aXZlQmVuZFBvc2l0aW9uLmRpc3RhbmNlKTtcclxuICAgIGlmKG5ld0JlbmRJbmRleCAhPSAtMSl7XHJcbiAgICAgIHdlaWdodHMuc3BsaWNlKG5ld0JlbmRJbmRleCwgMCwgcmVsYXRpdmVCZW5kUG9zaXRpb24ud2VpZ2h0KTtcclxuICAgICAgZGlzdGFuY2VzLnNwbGljZShuZXdCZW5kSW5kZXgsIDAsIHJlbGF0aXZlQmVuZFBvc2l0aW9uLmRpc3RhbmNlKTtcclxuICAgIH1cclxuICAgXHJcbiAgICBlZGdlLmRhdGEoJ3dlaWdodHMnLCB3ZWlnaHRzKTtcclxuICAgIGVkZ2UuZGF0YSgnZGlzdGFuY2VzJywgZGlzdGFuY2VzKTtcclxuICAgIFxyXG4gICAgZWRnZS5hZGRDbGFzcygnZWRnZWJlbmRlZGl0aW5nLWhhc2JlbmRwb2ludHMnKTtcclxuICAgIFxyXG4gICAgcmV0dXJuIHJlbGF0aXZlQmVuZFBvc2l0aW9uO1xyXG4gIH0sXHJcbiAgcmVtb3ZlQmVuZFBvaW50OiBmdW5jdGlvbihlZGdlLCBiZW5kUG9pbnRJbmRleCl7XHJcbiAgICBpZihlZGdlID09PSB1bmRlZmluZWQgfHwgYmVuZFBvaW50SW5kZXggPT09IHVuZGVmaW5lZCl7XHJcbiAgICAgIGVkZ2UgPSB0aGlzLmN1cnJlbnRDdHhFZGdlO1xyXG4gICAgICBiZW5kUG9pbnRJbmRleCA9IHRoaXMuY3VycmVudEJlbmRJbmRleDtcclxuICAgIH1cclxuICAgIFxyXG4gICAgdmFyIGRpc3RhbmNlcyA9IGVkZ2UuZGF0YSgnZGlzdGFuY2VzJyk7XHJcbiAgICB2YXIgd2VpZ2h0cyA9IGVkZ2UuZGF0YSgnd2VpZ2h0cycpO1xyXG4gICAgXHJcbiAgICBkaXN0YW5jZXMuc3BsaWNlKGJlbmRQb2ludEluZGV4LCAxKTtcclxuICAgIHdlaWdodHMuc3BsaWNlKGJlbmRQb2ludEluZGV4LCAxKTtcclxuICAgIFxyXG4gICAgXHJcbiAgICBpZihkaXN0YW5jZXMubGVuZ3RoID09IDAgfHwgd2VpZ2h0cy5sZW5naHQgPT0gMCl7XHJcbiAgICAgIGVkZ2UucmVtb3ZlQ2xhc3MoJ2VkZ2ViZW5kZWRpdGluZy1oYXNiZW5kcG9pbnRzJyk7XHJcbiAgICB9XHJcbiAgICBlbHNlIHtcclxuICAgICAgZWRnZS5kYXRhKCdkaXN0YW5jZXMnLCBkaXN0YW5jZXMpO1xyXG4gICAgICBlZGdlLmRhdGEoJ3dlaWdodHMnLCB3ZWlnaHRzKTtcclxuICAgIH1cclxuICB9XHJcbn07XHJcblxyXG5tb2R1bGUuZXhwb3J0cyA9IGJlbmRQb2ludFV0aWxpdGllczsiLCJ2YXIgZGVib3VuY2UgPSAoZnVuY3Rpb24gKCkge1xyXG4gIC8qKlxyXG4gICAqIGxvZGFzaCAzLjEuMSAoQ3VzdG9tIEJ1aWxkKSA8aHR0cHM6Ly9sb2Rhc2guY29tLz5cclxuICAgKiBCdWlsZDogYGxvZGFzaCBtb2Rlcm4gbW9kdWxhcml6ZSBleHBvcnRzPVwibnBtXCIgLW8gLi9gXHJcbiAgICogQ29weXJpZ2h0IDIwMTItMjAxNSBUaGUgRG9qbyBGb3VuZGF0aW9uIDxodHRwOi8vZG9qb2ZvdW5kYXRpb24ub3JnLz5cclxuICAgKiBCYXNlZCBvbiBVbmRlcnNjb3JlLmpzIDEuOC4zIDxodHRwOi8vdW5kZXJzY29yZWpzLm9yZy9MSUNFTlNFPlxyXG4gICAqIENvcHlyaWdodCAyMDA5LTIwMTUgSmVyZW15IEFzaGtlbmFzLCBEb2N1bWVudENsb3VkIGFuZCBJbnZlc3RpZ2F0aXZlIFJlcG9ydGVycyAmIEVkaXRvcnNcclxuICAgKiBBdmFpbGFibGUgdW5kZXIgTUlUIGxpY2Vuc2UgPGh0dHBzOi8vbG9kYXNoLmNvbS9saWNlbnNlPlxyXG4gICAqL1xyXG4gIC8qKiBVc2VkIGFzIHRoZSBgVHlwZUVycm9yYCBtZXNzYWdlIGZvciBcIkZ1bmN0aW9uc1wiIG1ldGhvZHMuICovXHJcbiAgdmFyIEZVTkNfRVJST1JfVEVYVCA9ICdFeHBlY3RlZCBhIGZ1bmN0aW9uJztcclxuXHJcbiAgLyogTmF0aXZlIG1ldGhvZCByZWZlcmVuY2VzIGZvciB0aG9zZSB3aXRoIHRoZSBzYW1lIG5hbWUgYXMgb3RoZXIgYGxvZGFzaGAgbWV0aG9kcy4gKi9cclxuICB2YXIgbmF0aXZlTWF4ID0gTWF0aC5tYXgsXHJcbiAgICAgICAgICBuYXRpdmVOb3cgPSBEYXRlLm5vdztcclxuXHJcbiAgLyoqXHJcbiAgICogR2V0cyB0aGUgbnVtYmVyIG9mIG1pbGxpc2Vjb25kcyB0aGF0IGhhdmUgZWxhcHNlZCBzaW5jZSB0aGUgVW5peCBlcG9jaFxyXG4gICAqICgxIEphbnVhcnkgMTk3MCAwMDowMDowMCBVVEMpLlxyXG4gICAqXHJcbiAgICogQHN0YXRpY1xyXG4gICAqIEBtZW1iZXJPZiBfXHJcbiAgICogQGNhdGVnb3J5IERhdGVcclxuICAgKiBAZXhhbXBsZVxyXG4gICAqXHJcbiAgICogXy5kZWZlcihmdW5jdGlvbihzdGFtcCkge1xyXG4gICAqICAgY29uc29sZS5sb2coXy5ub3coKSAtIHN0YW1wKTtcclxuICAgKiB9LCBfLm5vdygpKTtcclxuICAgKiAvLyA9PiBsb2dzIHRoZSBudW1iZXIgb2YgbWlsbGlzZWNvbmRzIGl0IHRvb2sgZm9yIHRoZSBkZWZlcnJlZCBmdW5jdGlvbiB0byBiZSBpbnZva2VkXHJcbiAgICovXHJcbiAgdmFyIG5vdyA9IG5hdGl2ZU5vdyB8fCBmdW5jdGlvbiAoKSB7XHJcbiAgICByZXR1cm4gbmV3IERhdGUoKS5nZXRUaW1lKCk7XHJcbiAgfTtcclxuXHJcbiAgLyoqXHJcbiAgICogQ3JlYXRlcyBhIGRlYm91bmNlZCBmdW5jdGlvbiB0aGF0IGRlbGF5cyBpbnZva2luZyBgZnVuY2AgdW50aWwgYWZ0ZXIgYHdhaXRgXHJcbiAgICogbWlsbGlzZWNvbmRzIGhhdmUgZWxhcHNlZCBzaW5jZSB0aGUgbGFzdCB0aW1lIHRoZSBkZWJvdW5jZWQgZnVuY3Rpb24gd2FzXHJcbiAgICogaW52b2tlZC4gVGhlIGRlYm91bmNlZCBmdW5jdGlvbiBjb21lcyB3aXRoIGEgYGNhbmNlbGAgbWV0aG9kIHRvIGNhbmNlbFxyXG4gICAqIGRlbGF5ZWQgaW52b2NhdGlvbnMuIFByb3ZpZGUgYW4gb3B0aW9ucyBvYmplY3QgdG8gaW5kaWNhdGUgdGhhdCBgZnVuY2BcclxuICAgKiBzaG91bGQgYmUgaW52b2tlZCBvbiB0aGUgbGVhZGluZyBhbmQvb3IgdHJhaWxpbmcgZWRnZSBvZiB0aGUgYHdhaXRgIHRpbWVvdXQuXHJcbiAgICogU3Vic2VxdWVudCBjYWxscyB0byB0aGUgZGVib3VuY2VkIGZ1bmN0aW9uIHJldHVybiB0aGUgcmVzdWx0IG9mIHRoZSBsYXN0XHJcbiAgICogYGZ1bmNgIGludm9jYXRpb24uXHJcbiAgICpcclxuICAgKiAqKk5vdGU6KiogSWYgYGxlYWRpbmdgIGFuZCBgdHJhaWxpbmdgIG9wdGlvbnMgYXJlIGB0cnVlYCwgYGZ1bmNgIGlzIGludm9rZWRcclxuICAgKiBvbiB0aGUgdHJhaWxpbmcgZWRnZSBvZiB0aGUgdGltZW91dCBvbmx5IGlmIHRoZSB0aGUgZGVib3VuY2VkIGZ1bmN0aW9uIGlzXHJcbiAgICogaW52b2tlZCBtb3JlIHRoYW4gb25jZSBkdXJpbmcgdGhlIGB3YWl0YCB0aW1lb3V0LlxyXG4gICAqXHJcbiAgICogU2VlIFtEYXZpZCBDb3JiYWNobydzIGFydGljbGVdKGh0dHA6Ly9kcnVwYWxtb3Rpb24uY29tL2FydGljbGUvZGVib3VuY2UtYW5kLXRocm90dGxlLXZpc3VhbC1leHBsYW5hdGlvbilcclxuICAgKiBmb3IgZGV0YWlscyBvdmVyIHRoZSBkaWZmZXJlbmNlcyBiZXR3ZWVuIGBfLmRlYm91bmNlYCBhbmQgYF8udGhyb3R0bGVgLlxyXG4gICAqXHJcbiAgICogQHN0YXRpY1xyXG4gICAqIEBtZW1iZXJPZiBfXHJcbiAgICogQGNhdGVnb3J5IEZ1bmN0aW9uXHJcbiAgICogQHBhcmFtIHtGdW5jdGlvbn0gZnVuYyBUaGUgZnVuY3Rpb24gdG8gZGVib3VuY2UuXHJcbiAgICogQHBhcmFtIHtudW1iZXJ9IFt3YWl0PTBdIFRoZSBudW1iZXIgb2YgbWlsbGlzZWNvbmRzIHRvIGRlbGF5LlxyXG4gICAqIEBwYXJhbSB7T2JqZWN0fSBbb3B0aW9uc10gVGhlIG9wdGlvbnMgb2JqZWN0LlxyXG4gICAqIEBwYXJhbSB7Ym9vbGVhbn0gW29wdGlvbnMubGVhZGluZz1mYWxzZV0gU3BlY2lmeSBpbnZva2luZyBvbiB0aGUgbGVhZGluZ1xyXG4gICAqICBlZGdlIG9mIHRoZSB0aW1lb3V0LlxyXG4gICAqIEBwYXJhbSB7bnVtYmVyfSBbb3B0aW9ucy5tYXhXYWl0XSBUaGUgbWF4aW11bSB0aW1lIGBmdW5jYCBpcyBhbGxvd2VkIHRvIGJlXHJcbiAgICogIGRlbGF5ZWQgYmVmb3JlIGl0J3MgaW52b2tlZC5cclxuICAgKiBAcGFyYW0ge2Jvb2xlYW59IFtvcHRpb25zLnRyYWlsaW5nPXRydWVdIFNwZWNpZnkgaW52b2tpbmcgb24gdGhlIHRyYWlsaW5nXHJcbiAgICogIGVkZ2Ugb2YgdGhlIHRpbWVvdXQuXHJcbiAgICogQHJldHVybnMge0Z1bmN0aW9ufSBSZXR1cm5zIHRoZSBuZXcgZGVib3VuY2VkIGZ1bmN0aW9uLlxyXG4gICAqIEBleGFtcGxlXHJcbiAgICpcclxuICAgKiAvLyBhdm9pZCBjb3N0bHkgY2FsY3VsYXRpb25zIHdoaWxlIHRoZSB3aW5kb3cgc2l6ZSBpcyBpbiBmbHV4XHJcbiAgICogalF1ZXJ5KHdpbmRvdykub24oJ3Jlc2l6ZScsIF8uZGVib3VuY2UoY2FsY3VsYXRlTGF5b3V0LCAxNTApKTtcclxuICAgKlxyXG4gICAqIC8vIGludm9rZSBgc2VuZE1haWxgIHdoZW4gdGhlIGNsaWNrIGV2ZW50IGlzIGZpcmVkLCBkZWJvdW5jaW5nIHN1YnNlcXVlbnQgY2FsbHNcclxuICAgKiBqUXVlcnkoJyNwb3N0Ym94Jykub24oJ2NsaWNrJywgXy5kZWJvdW5jZShzZW5kTWFpbCwgMzAwLCB7XHJcbiAgICogICAnbGVhZGluZyc6IHRydWUsXHJcbiAgICogICAndHJhaWxpbmcnOiBmYWxzZVxyXG4gICAqIH0pKTtcclxuICAgKlxyXG4gICAqIC8vIGVuc3VyZSBgYmF0Y2hMb2dgIGlzIGludm9rZWQgb25jZSBhZnRlciAxIHNlY29uZCBvZiBkZWJvdW5jZWQgY2FsbHNcclxuICAgKiB2YXIgc291cmNlID0gbmV3IEV2ZW50U291cmNlKCcvc3RyZWFtJyk7XHJcbiAgICogalF1ZXJ5KHNvdXJjZSkub24oJ21lc3NhZ2UnLCBfLmRlYm91bmNlKGJhdGNoTG9nLCAyNTAsIHtcclxuICAgKiAgICdtYXhXYWl0JzogMTAwMFxyXG4gICAqIH0pKTtcclxuICAgKlxyXG4gICAqIC8vIGNhbmNlbCBhIGRlYm91bmNlZCBjYWxsXHJcbiAgICogdmFyIHRvZG9DaGFuZ2VzID0gXy5kZWJvdW5jZShiYXRjaExvZywgMTAwMCk7XHJcbiAgICogT2JqZWN0Lm9ic2VydmUobW9kZWxzLnRvZG8sIHRvZG9DaGFuZ2VzKTtcclxuICAgKlxyXG4gICAqIE9iamVjdC5vYnNlcnZlKG1vZGVscywgZnVuY3Rpb24oY2hhbmdlcykge1xyXG4gICAqICAgaWYgKF8uZmluZChjaGFuZ2VzLCB7ICd1c2VyJzogJ3RvZG8nLCAndHlwZSc6ICdkZWxldGUnfSkpIHtcclxuICAgKiAgICAgdG9kb0NoYW5nZXMuY2FuY2VsKCk7XHJcbiAgICogICB9XHJcbiAgICogfSwgWydkZWxldGUnXSk7XHJcbiAgICpcclxuICAgKiAvLyAuLi5hdCBzb21lIHBvaW50IGBtb2RlbHMudG9kb2AgaXMgY2hhbmdlZFxyXG4gICAqIG1vZGVscy50b2RvLmNvbXBsZXRlZCA9IHRydWU7XHJcbiAgICpcclxuICAgKiAvLyAuLi5iZWZvcmUgMSBzZWNvbmQgaGFzIHBhc3NlZCBgbW9kZWxzLnRvZG9gIGlzIGRlbGV0ZWRcclxuICAgKiAvLyB3aGljaCBjYW5jZWxzIHRoZSBkZWJvdW5jZWQgYHRvZG9DaGFuZ2VzYCBjYWxsXHJcbiAgICogZGVsZXRlIG1vZGVscy50b2RvO1xyXG4gICAqL1xyXG4gIGZ1bmN0aW9uIGRlYm91bmNlKGZ1bmMsIHdhaXQsIG9wdGlvbnMpIHtcclxuICAgIHZhciBhcmdzLFxyXG4gICAgICAgICAgICBtYXhUaW1lb3V0SWQsXHJcbiAgICAgICAgICAgIHJlc3VsdCxcclxuICAgICAgICAgICAgc3RhbXAsXHJcbiAgICAgICAgICAgIHRoaXNBcmcsXHJcbiAgICAgICAgICAgIHRpbWVvdXRJZCxcclxuICAgICAgICAgICAgdHJhaWxpbmdDYWxsLFxyXG4gICAgICAgICAgICBsYXN0Q2FsbGVkID0gMCxcclxuICAgICAgICAgICAgbWF4V2FpdCA9IGZhbHNlLFxyXG4gICAgICAgICAgICB0cmFpbGluZyA9IHRydWU7XHJcblxyXG4gICAgaWYgKHR5cGVvZiBmdW5jICE9ICdmdW5jdGlvbicpIHtcclxuICAgICAgdGhyb3cgbmV3IFR5cGVFcnJvcihGVU5DX0VSUk9SX1RFWFQpO1xyXG4gICAgfVxyXG4gICAgd2FpdCA9IHdhaXQgPCAwID8gMCA6ICgrd2FpdCB8fCAwKTtcclxuICAgIGlmIChvcHRpb25zID09PSB0cnVlKSB7XHJcbiAgICAgIHZhciBsZWFkaW5nID0gdHJ1ZTtcclxuICAgICAgdHJhaWxpbmcgPSBmYWxzZTtcclxuICAgIH0gZWxzZSBpZiAoaXNPYmplY3Qob3B0aW9ucykpIHtcclxuICAgICAgbGVhZGluZyA9ICEhb3B0aW9ucy5sZWFkaW5nO1xyXG4gICAgICBtYXhXYWl0ID0gJ21heFdhaXQnIGluIG9wdGlvbnMgJiYgbmF0aXZlTWF4KCtvcHRpb25zLm1heFdhaXQgfHwgMCwgd2FpdCk7XHJcbiAgICAgIHRyYWlsaW5nID0gJ3RyYWlsaW5nJyBpbiBvcHRpb25zID8gISFvcHRpb25zLnRyYWlsaW5nIDogdHJhaWxpbmc7XHJcbiAgICB9XHJcblxyXG4gICAgZnVuY3Rpb24gY2FuY2VsKCkge1xyXG4gICAgICBpZiAodGltZW91dElkKSB7XHJcbiAgICAgICAgY2xlYXJUaW1lb3V0KHRpbWVvdXRJZCk7XHJcbiAgICAgIH1cclxuICAgICAgaWYgKG1heFRpbWVvdXRJZCkge1xyXG4gICAgICAgIGNsZWFyVGltZW91dChtYXhUaW1lb3V0SWQpO1xyXG4gICAgICB9XHJcbiAgICAgIGxhc3RDYWxsZWQgPSAwO1xyXG4gICAgICBtYXhUaW1lb3V0SWQgPSB0aW1lb3V0SWQgPSB0cmFpbGluZ0NhbGwgPSB1bmRlZmluZWQ7XHJcbiAgICB9XHJcblxyXG4gICAgZnVuY3Rpb24gY29tcGxldGUoaXNDYWxsZWQsIGlkKSB7XHJcbiAgICAgIGlmIChpZCkge1xyXG4gICAgICAgIGNsZWFyVGltZW91dChpZCk7XHJcbiAgICAgIH1cclxuICAgICAgbWF4VGltZW91dElkID0gdGltZW91dElkID0gdHJhaWxpbmdDYWxsID0gdW5kZWZpbmVkO1xyXG4gICAgICBpZiAoaXNDYWxsZWQpIHtcclxuICAgICAgICBsYXN0Q2FsbGVkID0gbm93KCk7XHJcbiAgICAgICAgcmVzdWx0ID0gZnVuYy5hcHBseSh0aGlzQXJnLCBhcmdzKTtcclxuICAgICAgICBpZiAoIXRpbWVvdXRJZCAmJiAhbWF4VGltZW91dElkKSB7XHJcbiAgICAgICAgICBhcmdzID0gdGhpc0FyZyA9IHVuZGVmaW5lZDtcclxuICAgICAgICB9XHJcbiAgICAgIH1cclxuICAgIH1cclxuXHJcbiAgICBmdW5jdGlvbiBkZWxheWVkKCkge1xyXG4gICAgICB2YXIgcmVtYWluaW5nID0gd2FpdCAtIChub3coKSAtIHN0YW1wKTtcclxuICAgICAgaWYgKHJlbWFpbmluZyA8PSAwIHx8IHJlbWFpbmluZyA+IHdhaXQpIHtcclxuICAgICAgICBjb21wbGV0ZSh0cmFpbGluZ0NhbGwsIG1heFRpbWVvdXRJZCk7XHJcbiAgICAgIH0gZWxzZSB7XHJcbiAgICAgICAgdGltZW91dElkID0gc2V0VGltZW91dChkZWxheWVkLCByZW1haW5pbmcpO1xyXG4gICAgICB9XHJcbiAgICB9XHJcblxyXG4gICAgZnVuY3Rpb24gbWF4RGVsYXllZCgpIHtcclxuICAgICAgY29tcGxldGUodHJhaWxpbmcsIHRpbWVvdXRJZCk7XHJcbiAgICB9XHJcblxyXG4gICAgZnVuY3Rpb24gZGVib3VuY2VkKCkge1xyXG4gICAgICBhcmdzID0gYXJndW1lbnRzO1xyXG4gICAgICBzdGFtcCA9IG5vdygpO1xyXG4gICAgICB0aGlzQXJnID0gdGhpcztcclxuICAgICAgdHJhaWxpbmdDYWxsID0gdHJhaWxpbmcgJiYgKHRpbWVvdXRJZCB8fCAhbGVhZGluZyk7XHJcblxyXG4gICAgICBpZiAobWF4V2FpdCA9PT0gZmFsc2UpIHtcclxuICAgICAgICB2YXIgbGVhZGluZ0NhbGwgPSBsZWFkaW5nICYmICF0aW1lb3V0SWQ7XHJcbiAgICAgIH0gZWxzZSB7XHJcbiAgICAgICAgaWYgKCFtYXhUaW1lb3V0SWQgJiYgIWxlYWRpbmcpIHtcclxuICAgICAgICAgIGxhc3RDYWxsZWQgPSBzdGFtcDtcclxuICAgICAgICB9XHJcbiAgICAgICAgdmFyIHJlbWFpbmluZyA9IG1heFdhaXQgLSAoc3RhbXAgLSBsYXN0Q2FsbGVkKSxcclxuICAgICAgICAgICAgICAgIGlzQ2FsbGVkID0gcmVtYWluaW5nIDw9IDAgfHwgcmVtYWluaW5nID4gbWF4V2FpdDtcclxuXHJcbiAgICAgICAgaWYgKGlzQ2FsbGVkKSB7XHJcbiAgICAgICAgICBpZiAobWF4VGltZW91dElkKSB7XHJcbiAgICAgICAgICAgIG1heFRpbWVvdXRJZCA9IGNsZWFyVGltZW91dChtYXhUaW1lb3V0SWQpO1xyXG4gICAgICAgICAgfVxyXG4gICAgICAgICAgbGFzdENhbGxlZCA9IHN0YW1wO1xyXG4gICAgICAgICAgcmVzdWx0ID0gZnVuYy5hcHBseSh0aGlzQXJnLCBhcmdzKTtcclxuICAgICAgICB9XHJcbiAgICAgICAgZWxzZSBpZiAoIW1heFRpbWVvdXRJZCkge1xyXG4gICAgICAgICAgbWF4VGltZW91dElkID0gc2V0VGltZW91dChtYXhEZWxheWVkLCByZW1haW5pbmcpO1xyXG4gICAgICAgIH1cclxuICAgICAgfVxyXG4gICAgICBpZiAoaXNDYWxsZWQgJiYgdGltZW91dElkKSB7XHJcbiAgICAgICAgdGltZW91dElkID0gY2xlYXJUaW1lb3V0KHRpbWVvdXRJZCk7XHJcbiAgICAgIH1cclxuICAgICAgZWxzZSBpZiAoIXRpbWVvdXRJZCAmJiB3YWl0ICE9PSBtYXhXYWl0KSB7XHJcbiAgICAgICAgdGltZW91dElkID0gc2V0VGltZW91dChkZWxheWVkLCB3YWl0KTtcclxuICAgICAgfVxyXG4gICAgICBpZiAobGVhZGluZ0NhbGwpIHtcclxuICAgICAgICBpc0NhbGxlZCA9IHRydWU7XHJcbiAgICAgICAgcmVzdWx0ID0gZnVuYy5hcHBseSh0aGlzQXJnLCBhcmdzKTtcclxuICAgICAgfVxyXG4gICAgICBpZiAoaXNDYWxsZWQgJiYgIXRpbWVvdXRJZCAmJiAhbWF4VGltZW91dElkKSB7XHJcbiAgICAgICAgYXJncyA9IHRoaXNBcmcgPSB1bmRlZmluZWQ7XHJcbiAgICAgIH1cclxuICAgICAgcmV0dXJuIHJlc3VsdDtcclxuICAgIH1cclxuXHJcbiAgICBkZWJvdW5jZWQuY2FuY2VsID0gY2FuY2VsO1xyXG4gICAgcmV0dXJuIGRlYm91bmNlZDtcclxuICB9XHJcblxyXG4gIC8qKlxyXG4gICAqIENoZWNrcyBpZiBgdmFsdWVgIGlzIHRoZSBbbGFuZ3VhZ2UgdHlwZV0oaHR0cHM6Ly9lczUuZ2l0aHViLmlvLyN4OCkgb2YgYE9iamVjdGAuXHJcbiAgICogKGUuZy4gYXJyYXlzLCBmdW5jdGlvbnMsIG9iamVjdHMsIHJlZ2V4ZXMsIGBuZXcgTnVtYmVyKDApYCwgYW5kIGBuZXcgU3RyaW5nKCcnKWApXHJcbiAgICpcclxuICAgKiBAc3RhdGljXHJcbiAgICogQG1lbWJlck9mIF9cclxuICAgKiBAY2F0ZWdvcnkgTGFuZ1xyXG4gICAqIEBwYXJhbSB7Kn0gdmFsdWUgVGhlIHZhbHVlIHRvIGNoZWNrLlxyXG4gICAqIEByZXR1cm5zIHtib29sZWFufSBSZXR1cm5zIGB0cnVlYCBpZiBgdmFsdWVgIGlzIGFuIG9iamVjdCwgZWxzZSBgZmFsc2VgLlxyXG4gICAqIEBleGFtcGxlXHJcbiAgICpcclxuICAgKiBfLmlzT2JqZWN0KHt9KTtcclxuICAgKiAvLyA9PiB0cnVlXHJcbiAgICpcclxuICAgKiBfLmlzT2JqZWN0KFsxLCAyLCAzXSk7XHJcbiAgICogLy8gPT4gdHJ1ZVxyXG4gICAqXHJcbiAgICogXy5pc09iamVjdCgxKTtcclxuICAgKiAvLyA9PiBmYWxzZVxyXG4gICAqL1xyXG4gIGZ1bmN0aW9uIGlzT2JqZWN0KHZhbHVlKSB7XHJcbiAgICAvLyBBdm9pZCBhIFY4IEpJVCBidWcgaW4gQ2hyb21lIDE5LTIwLlxyXG4gICAgLy8gU2VlIGh0dHBzOi8vY29kZS5nb29nbGUuY29tL3AvdjgvaXNzdWVzL2RldGFpbD9pZD0yMjkxIGZvciBtb3JlIGRldGFpbHMuXHJcbiAgICB2YXIgdHlwZSA9IHR5cGVvZiB2YWx1ZTtcclxuICAgIHJldHVybiAhIXZhbHVlICYmICh0eXBlID09ICdvYmplY3QnIHx8IHR5cGUgPT0gJ2Z1bmN0aW9uJyk7XHJcbiAgfVxyXG5cclxuICByZXR1cm4gZGVib3VuY2U7XHJcblxyXG59KSgpO1xyXG5cclxubW9kdWxlLmV4cG9ydHMgPSBkZWJvdW5jZTsiLCI7KGZ1bmN0aW9uKCQkLCAkKXsgJ3VzZSBzdHJpY3QnO1xuICBcbiAgdmFyIGJlbmRQb2ludFV0aWxpdGllcyA9IHJlcXVpcmUoJy4vYmVuZFBvaW50VXRpbGl0aWVzJyk7XG4gICQuZm4uY3l0b3NjYXBlRWRnZUJlbmRFZGl0aW5nID0gcmVxdWlyZSgnLi9VSVV0aWxpdGllcycpO1xuXG4gIFxuICAvLyByZWdpc3RlcnMgdGhlIGV4dGVuc2lvbiBvbiBhIGN5dG9zY2FwZSBsaWIgcmVmXG4gIHZhciByZWdpc3RlciA9IGZ1bmN0aW9uKCBjeXRvc2NhcGUgKXtcbiAgICBcbiAgICBpZiggIWN5dG9zY2FwZSApeyByZXR1cm47IH0gLy8gY2FuJ3QgcmVnaXN0ZXIgaWYgY3l0b3NjYXBlIHVuc3BlY2lmaWVkXG5cbiAgICB2YXIgb3B0aW9ucyA9IHtcbiAgICAgIC8vIHRoaXMgZnVuY3Rpb24gc3BlY2lmaWVzIHRoZSBwb2l0aW9ucyBvZiBiZW5kIHBvaW50c1xuICAgICAgYmVuZFBvc2l0aW9uc0Z1bmN0aW9uOiBmdW5jdGlvbihlbGUpIHtcbiAgICAgICAgcmV0dXJuIGVsZS5kYXRhKCdiZW5kUG9pbnRQb3NpdGlvbnMnKTtcbiAgICAgIH0sXG4gICAgICB1bmRvYWJsZTogZmFsc2UsXG4gICAgICAvLyB0aGUgc2l6ZSBvZiBiZW5kIHNoYXBlIGlzIG9idGFpbmVkIGJ5IG11bHRpcGxpbmcgd2lkdGggb2YgZWRnZSB3aXRoIHRoaXMgcGFyYW1ldGVyXG4gICAgICBiZW5kU2hhcGVTaXplRmFjdG9yOiA2XG4gICAgfTtcbiAgICBcbiAgICBmdW5jdGlvbiBzZXRPcHRpb25zKGZyb20pIHtcbiAgICAgIHZhciB0ZW1wT3B0cyA9IHt9O1xuICAgICAgZm9yICh2YXIga2V5IGluIG9wdGlvbnMpXG4gICAgICAgIHRlbXBPcHRzW2tleV0gPSBvcHRpb25zW2tleV07XG5cbiAgICAgIGZvciAodmFyIGtleSBpbiBmcm9tKVxuICAgICAgICBpZiAodGVtcE9wdHMuaGFzT3duUHJvcGVydHkoa2V5KSlcbiAgICAgICAgICB0ZW1wT3B0c1trZXldID0gZnJvbVtrZXldO1xuICAgICAgcmV0dXJuIHRlbXBPcHRzO1xuICAgIH1cbiAgICBcbiAgICBjeXRvc2NhcGUoICdjb3JlJywgJ2VkZ2VCZW5kRWRpdGluZycsIGZ1bmN0aW9uKG9wdHMpe1xuICAgICAgdmFyIGN5ID0gdGhpcztcbiAgICAgIFxuICAgICAgLy8gbWVyZ2UgdGhlIG9wdGlvbnMgd2l0aCBkZWZhdWx0IG9uZXNcbiAgICAgIG9wdGlvbnMgPSBzZXRPcHRpb25zKG9wdHMpO1xuICAgICAgXG4gICAgICAvLyBkZWZpbmUgZWRnZWJlbmRlZGl0aW5nLWhhc2JlbmRwb2ludHMgY3NzIGNsYXNzXG4gICAgICBjeS5zdHlsZSgpLnNlbGVjdG9yKCcuZWRnZWJlbmRlZGl0aW5nLWhhc2JlbmRwb2ludHMnKS5jc3Moe1xuICAgICAgICAnY3VydmUtc3R5bGUnOiAnc2VnbWVudHMnLFxuICAgICAgICAnc2VnbWVudC1kaXN0YW5jZXMnOiBmdW5jdGlvbiAoZWxlKSB7XG4gICAgICAgICAgcmV0dXJuIGJlbmRQb2ludFV0aWxpdGllcy5nZXRTZWdtZW50RGlzdGFuY2VzU3RyaW5nKGVsZSk7XG4gICAgICAgIH0sXG4gICAgICAgICdzZWdtZW50LXdlaWdodHMnOiBmdW5jdGlvbiAoZWxlKSB7XG4gICAgICAgICAgcmV0dXJuIGJlbmRQb2ludFV0aWxpdGllcy5nZXRTZWdtZW50V2VpZ2h0c1N0cmluZyhlbGUpO1xuICAgICAgICB9LFxuICAgICAgICAnZWRnZS1kaXN0YW5jZXMnOiAnbm9kZS1wb3NpdGlvbidcbiAgICAgIH0pO1xuICAgICAgXG4gICAgICAvLyBpbml0IGJlbmQgcG9zaXRpb25zXG4gICAgICBiZW5kUG9pbnRVdGlsaXRpZXMuaW5pdEJlbmRQb2ludHMob3B0aW9ucy5iZW5kUG9zaXRpb25zRnVuY3Rpb24pO1xuICAgICAgXG4gICAgICAkKGN5LmNvbnRhaW5lcigpKS5jeXRvc2NhcGVFZGdlQmVuZEVkaXRpbmcob3B0aW9ucyk7XG5cbiAgICAgIHJldHVybiB0aGlzOyAvLyBjaGFpbmFiaWxpdHlcbiAgICB9ICk7XG5cbiAgfTtcblxuICBpZiggdHlwZW9mIG1vZHVsZSAhPT0gJ3VuZGVmaW5lZCcgJiYgbW9kdWxlLmV4cG9ydHMgKXsgLy8gZXhwb3NlIGFzIGEgY29tbW9uanMgbW9kdWxlXG4gICAgbW9kdWxlLmV4cG9ydHMgPSByZWdpc3RlcjtcbiAgfVxuXG4gIGlmKCB0eXBlb2YgZGVmaW5lICE9PSAndW5kZWZpbmVkJyAmJiBkZWZpbmUuYW1kICl7IC8vIGV4cG9zZSBhcyBhbiBhbWQvcmVxdWlyZWpzIG1vZHVsZVxuICAgIGRlZmluZSgnY3l0b3NjYXBlLWVkZ2UtYmVuZC1lZGl0aW5nJywgZnVuY3Rpb24oKXtcbiAgICAgIHJldHVybiByZWdpc3RlcjtcbiAgICB9KTtcbiAgfVxuXG4gIGlmKCB0eXBlb2YgY3l0b3NjYXBlICE9PSAndW5kZWZpbmVkJyApeyAvLyBleHBvc2UgdG8gZ2xvYmFsIGN5dG9zY2FwZSAoaS5lLiB3aW5kb3cuY3l0b3NjYXBlKVxuICAgIHJlZ2lzdGVyKCBjeXRvc2NhcGUgKTtcbiAgfVxuXG59KShjeXRvc2NhcGUsIGpRdWVyeSk7XG4iLCJtb2R1bGUuZXhwb3J0cyA9IGZ1bmN0aW9uICgpIHtcclxuICBpZiAoY3kudW5kb1JlZG8gPT0gbnVsbClcclxuICAgIHJldHVybjtcclxuXHJcbiAgdmFyIHVyID0gY3kudW5kb1JlZG8oe1xyXG4gICAgZGVmYXVsdEFjdGlvbnM6IGZhbHNlLFxyXG4gICAgaXNEZWJ1ZzogdHJ1ZVxyXG4gIH0pO1xyXG5cclxuICBmdW5jdGlvbiBjaGFuZ2VCZW5kUG9pbnRzKHBhcmFtKSB7XHJcbiAgICB2YXIgZWRnZSA9IHBhcmFtLmVkZ2U7XHJcbiAgICB2YXIgcmVzdWx0ID0ge1xyXG4gICAgICBlZGdlOiBlZGdlLFxyXG4gICAgICB3ZWlnaHRzOiBwYXJhbS5zZXQgPyBlZGdlLmRhdGEoJ3dlaWdodHMnKSA6IHBhcmFtLndlaWdodHMsXHJcbiAgICAgIGRpc3RhbmNlczogcGFyYW0uc2V0ID8gZWRnZS5kYXRhKCdkaXN0YW5jZXMnKSA6IHBhcmFtLmRpc3RhbmNlcyxcclxuICAgICAgc2V0OiB0cnVlLy9BcyB0aGUgcmVzdWx0IHdpbGwgbm90IGJlIHVzZWQgZm9yIHRoZSBmaXJzdCBmdW5jdGlvbiBjYWxsIHBhcmFtcyBzaG91bGQgYmUgdXNlZCB0byBzZXQgdGhlIGRhdGFcclxuICAgIH07XHJcblxyXG4gICAgLy9DaGVjayBpZiB3ZSBuZWVkIHRvIHNldCB0aGUgd2VpZ2h0cyBhbmQgZGlzdGFuY2VzIGJ5IHRoZSBwYXJhbSB2YWx1ZXNcclxuICAgIGlmIChwYXJhbS5zZXQpIHtcclxuICAgICAgcGFyYW0ud2VpZ2h0cyA/IGVkZ2UuZGF0YSgnd2VpZ2h0cycsIHBhcmFtLndlaWdodHMpIDogZWRnZS5yZW1vdmVEYXRhKCd3ZWlnaHRzJyk7XHJcbiAgICAgIHBhcmFtLmRpc3RhbmNlcyA/IGVkZ2UuZGF0YSgnZGlzdGFuY2VzJywgcGFyYW0uZGlzdGFuY2VzKSA6IGVkZ2UucmVtb3ZlRGF0YSgnZGlzdGFuY2VzJyk7XHJcblxyXG4gICAgICAvL3JlZnJlc2ggdGhlIGN1cnZlIHN0eWxlIGFzIHRoZSBudW1iZXIgb2YgYmVuZCBwb2ludCB3b3VsZCBiZSBjaGFuZ2VkIGJ5IHRoZSBwcmV2aW91cyBvcGVyYXRpb25cclxuICAgICAgaWYgKHBhcmFtLndlaWdodHMpIHtcclxuICAgICAgICBlZGdlLmFkZENsYXNzKCdlZGdlYmVuZGVkaXRpbmctaGFzYmVuZHBvaW50cycpO1xyXG4gICAgICB9XHJcbiAgICAgIGVsc2Uge1xyXG4gICAgICAgIGVkZ2UucmVtb3ZlQ2xhc3MoJ2VkZ2ViZW5kZWRpdGluZy1oYXNiZW5kcG9pbnRzJyk7XHJcbiAgICAgIH1cclxuICAgIH1cclxuICAgIFxyXG4gICAgZWRnZS50cmlnZ2VyKCdjaGFuZ2VCZW5kUG9pbnRzJyk7XHJcblxyXG4gICAgcmV0dXJuIHJlc3VsdDtcclxuICB9XHJcblxyXG4gIHVyLmFjdGlvbignY2hhbmdlQmVuZFBvaW50cycsIGNoYW5nZUJlbmRQb2ludHMsIGNoYW5nZUJlbmRQb2ludHMpO1xyXG59OyJdfQ==
