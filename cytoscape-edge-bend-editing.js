(function(f){if(typeof exports==="object"&&typeof module!=="undefined"){module.exports=f()}else if(typeof define==="function"&&define.amd){define([],f)}else{var g;if(typeof window!=="undefined"){g=window}else if(typeof global!=="undefined"){g=global}else if(typeof self!=="undefined"){g=self}else{g=this}g.cytoscapeEdgeBendEditing = f()}})(function(){var define,module,exports;return (function e(t,n,r){function s(o,u){if(!n[o]){if(!t[o]){var a=typeof require=="function"&&require;if(!u&&a)return a(o,!0);if(i)return i(o,!0);var f=new Error("Cannot find module '"+o+"'");throw f.code="MODULE_NOT_FOUND",f}var l=n[o]={exports:{}};t[o][0].call(l.exports,function(e){var n=t[o][1][e];return s(n?n:e)},l,l.exports,e,t,n,r)}return n[o].exports}var i=typeof require=="function"&&require;for(var o=0;o<r.length;o++)s(r[o]);return s})({1:[function(_dereq_,module,exports){
var debounce = _dereq_('./debounce');
var bendPointUtilities = _dereq_('./bendPointUtilities');
var registerUndoRedoFunctions = _dereq_('./registerUndoRedoFunctions');

module.exports = function (params, cy) {
  var fn = params;

  var addBendPointCxtMenuId = 'cy-edge-bend-editing-cxt-add-bend-point';
  var removeBendPointCxtMenuId = 'cy-edge-bend-editing-cxt-remove-bend-point';
  var ePosition, eStyle, eRemove, eAdd, eZoom, eSelect, eUnselect, eTapStart, eTapDrag, eTapEnd, eCxtTap;
  // last status of gestures
  var lastPanningEnabled, lastZoomingEnabled, lastBoxSelectionEnabled;
  // status of edge to highlight bends and selected edges
  var edgeToHighlightBends, numberOfSelectedEdges;
  
  var functions = {
    init: function () {
      // register undo redo functions
      registerUndoRedoFunctions(cy, bendPointUtilities, params);
      
      var self = this;
      var opts = params;
      var $container = $(this);
      var $canvas = $('<canvas></canvas>');

      $container.append($canvas);

      var cxtAddBendPointFcn = function (event) {
        var edge = event.target || event.cyTarget;
        if(!bendPointUtilities.isIgnoredEdge(edge)) {

          var param = {
            edge: edge,
            weights: edge.data('cyedgebendeditingWeights') ? [].concat(edge.data('cyedgebendeditingWeights')) : edge.data('cyedgebendeditingWeights'),
            distances: edge.data('cyedgebendeditingDistances') ? [].concat(edge.data('cyedgebendeditingDistances')) : edge.data('cyedgebendeditingDistances')
          };

          bendPointUtilities.addBendPoint();

          if (options().undoable) {
            cy.undoRedo().do('changeBendPoints', param);
          }
        }
        
        refreshDraws();
      };

      var cxtRemoveBendPointFcn = function (event) {
        var edge = event.target || event.cyTarget;
        
        var param = {
          edge: edge,
          weights: [].concat(edge.data('cyedgebendeditingWeights')),
          distances: [].concat(edge.data('cyedgebendeditingDistances'))
        };

        bendPointUtilities.removeBendPoint();
        
        if(options().undoable) {
          cy.undoRedo().do('changeBendPoints', param);
        }
        
        refreshDraws();
      };
      
      var menuItems = [
        {
          id: addBendPointCxtMenuId,
          title: opts.addBendMenuItemTitle,
          content: 'Add Bend Point',
          selector: 'edge',
          onClickFunction: cxtAddBendPointFcn
        },
        {
          id: removeBendPointCxtMenuId,
          title: opts.removeBendMenuItemTitle,
          content: 'Remove Bend Point',
          selector: 'edge',
          onClickFunction: cxtRemoveBendPointFcn
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
      
      function refreshDraws() {

        var w = $container.width();
        var h = $container.height();

        ctx.clearRect(0, 0, w, h);
        
        if( edgeToHighlightBends ) {
          renderBendShapes(edgeToHighlightBends);
        }
      }
      
      
      // render the bend shapes of the given edge
      function renderBendShapes(edge) {
        
        if(!edge.hasClass('edgebendediting-hasbendpoints')) {
          return;
        }
        
        var segpts = bendPointUtilities.getSegmentPoints(edge);//edge._private.rdata.segpts;
        var length = getBendShapesLenght(edge);
        
        var srcPos = edge.source().position();
        var tgtPos = edge.target().position();
        
        var weights = edge.data('cyedgebendeditingWeights');
        var distances = edge.data('cyedgebendeditingDistances');

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
        if (parseFloat(edge.css('width')) <= 2.5)
          return 2.5 * factor;
        else return parseFloat(edge.css('width'))*factor;
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

      // get the index of bend point containing the point represented by {x, y}
      function getContainingBendShapeIndex(x, y, edge) {
        if(edge.data('cyedgebendeditingWeights') == null || edge.data('cyedgebendeditingWeights').length == 0){
          return -1;
        }

        var segpts = bendPointUtilities.getSegmentPoints(edge);//edge._private.rdata.segpts;
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

      function moveBendPoints(positionDiff, edges) {
          edges.forEach(function( edge ){
              var previousBendPointsPosition = bendPointUtilities.getSegmentPoints(edge);
              var nextBendPointsPosition = [];
              if (previousBendPointsPosition != undefined)
              {
                for (i=0; i<previousBendPointsPosition.length; i+=2)
                {
                    nextBendPointsPosition.push({x: previousBendPointsPosition[i]+positionDiff.x, y: previousBendPointsPosition[i+1]+positionDiff.y});
                }
                edge.data('bendPointPositions',nextBendPointsPosition);
              }

          });
          bendPointUtilities.initBendPoints(options().bendPositionsFunction, edges);
      }

      {  
        lastPanningEnabled = cy.panningEnabled();
        lastZoomingEnabled = cy.zoomingEnabled();
        lastBoxSelectionEnabled = cy.boxSelectionEnabled();
        
        // Initilize the edgeToHighlightBends and numberOfSelectedEdges
        {
          var selectedEdges = cy.edges(':selected');
          var numberOfSelectedEdges = selectedEdges.length;
          
          if ( numberOfSelectedEdges === 1 ) {
            edgeToHighlightBends = selectedEdges[0];
          }
        }
        
        cy.bind('zoom pan', eZoom = function () {
          if ( !edgeToHighlightBends ) {
            return;
          }
          
          refreshDraws();
        });

        cy.on('data', 'edge',  function () {
          refreshDraws();
        });

        cy.on('position', 'node', ePosition = function () {
          var node = this;
          
          // If there is no edge to highlight bends or this node is not any end of that edge return directly
          if ( !edgeToHighlightBends || !( edgeToHighlightBends.data('source') === node.id() 
                  || edgeToHighlightBends.data('target') === node.id() ) ) {
            return;
          }
          
          refreshDraws();
        });

        cy.on('style', 'edge.edgebendediting-hasbendpoints:selected', eStyle = function () {
          refreshDraws();
        });

        cy.on('remove', 'edge', eRemove = function () {
          var edge = this;
          if (edge.selected()) {
            numberOfSelectedEdges = numberOfSelectedEdges - 1;
            
            cy.startBatch();
            
            if (edgeToHighlightBends) {
              edgeToHighlightBends.removeClass('cy-edge-bend-editing-highlight-bends');
            }
            
            if (numberOfSelectedEdges === 1) {
              var selectedEdges = cy.edges(':selected');
              
              // If user removes all selected edges at a single operation then our 'numberOfSelectedEdges'
              // may be misleading. Therefore we need to check if the number of edges to highlight is realy 1 here.
              if (selectedEdges.length === 1) {
                edgeToHighlightBends = selectedEdges[0];
                edgeToHighlightBends.addClass('cy-edge-bend-editing-highlight-bends');
              }
              else {
                edgeToHighlightBends = undefined;
              }
            }
            else {
              edgeToHighlightBends = undefined;
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
            
            if (edgeToHighlightBends) {
              edgeToHighlightBends.removeClass('cy-edge-bend-editing-highlight-bends');
            }
            
            if (numberOfSelectedEdges === 1) {
              edgeToHighlightBends = edge;
              edgeToHighlightBends.addClass('cy-edge-bend-editing-highlight-bends');
            }
            else {
              edgeToHighlightBends = undefined;
            }
            
            cy.endBatch();
          }
          refreshDraws();
        });
        
        cy.on('select', 'edge', eSelect = function () {
          var edge = this;
          numberOfSelectedEdges = numberOfSelectedEdges + 1;
          
          cy.startBatch();
            
          if (edgeToHighlightBends) {
            edgeToHighlightBends.removeClass('cy-edge-bend-editing-highlight-bends');
          }
            
          if (numberOfSelectedEdges === 1) {
            edgeToHighlightBends = edge;
            edgeToHighlightBends.addClass('cy-edge-bend-editing-highlight-bends');
          }
          else {
            edgeToHighlightBends = undefined;
          }
          
          cy.endBatch();
          refreshDraws();
        });
        
        cy.on('unselect', 'edge', eUnselect = function () {
          numberOfSelectedEdges = numberOfSelectedEdges - 1;
            
          cy.startBatch();
            
          if (edgeToHighlightBends) {
            edgeToHighlightBends.removeClass('cy-edge-bend-editing-highlight-bends');
          }
            
          if (numberOfSelectedEdges === 1) {
            var selectedEdges = cy.edges(':selected');
            
            // If user unselects all edges by tapping to the core etc. then our 'numberOfSelectedEdges'
            // may be misleading. Therefore we need to check if the number of edges to highlight is realy 1 here.
            if (selectedEdges.length === 1) {
              edgeToHighlightBends = selectedEdges[0];
              edgeToHighlightBends.addClass('cy-edge-bend-editing-highlight-bends');
            }
            else {
              edgeToHighlightBends = undefined;
            }
          }
          else {
            edgeToHighlightBends = undefined;
          }
          
          cy.endBatch();
          refreshDraws();
        });
        
        var movedBendIndex;
        var movedBendEdge;
        var moveBendParam;
        var createBendOnDrag;
        
        cy.on('tapstart', 'edge', eTapStart = function (event) {
          var edge = this;
          
          if (!edgeToHighlightBends || edgeToHighlightBends.id() !== edge.id()) {
            createBendOnDrag = false;
            return;
          }
          
          movedBendEdge = edge;
          
          moveBendParam = {
            edge: edge,
            weights: edge.data('cyedgebendeditingWeights') ? [].concat(edge.data('cyedgebendeditingWeights')) : [],
            distances: edge.data('cyedgebendeditingDistances') ? [].concat(edge.data('cyedgebendeditingDistances')) : []
          };
          
          var cyPos = event.position || event.cyPosition;
          var cyPosX = cyPos.x;
          var cyPosY = cyPos.y;

          var index = getContainingBendShapeIndex(cyPosX, cyPosY, edge);
          if (index != -1) {
            movedBendIndex = index;
//            movedBendEdge = edge;
            disableGestures();
          }
          else {
            createBendOnDrag = true;
          }
        });
        
        cy.on('tapdrag', eTapDrag = function (event) {
          var edge = movedBendEdge;
          if(movedBendEdge !== undefined && bendPointUtilities.isIgnoredEdge(edge) ) {
            return;
          }
          
          if(createBendOnDrag) {
            var cyPos = event.position || event.cyPosition;
            bendPointUtilities.addBendPoint(edge, cyPos);
            movedBendIndex = getContainingBendShapeIndex(cyPos.x, cyPos.y, edge);
            movedBendEdge = edge;
            createBendOnDrag = undefined;
            disableGestures();
          }
          
          if (movedBendEdge === undefined || movedBendIndex === undefined) {
            return;
          }

          var weights = edge.data('cyedgebendeditingWeights');
          var distances = edge.data('cyedgebendeditingDistances');

          var relativeBendPosition = bendPointUtilities.convertToRelativeBendPosition(edge, event.position || event.cyPosition);
          weights[movedBendIndex] = relativeBendPosition.weight;
          distances[movedBendIndex] = relativeBendPosition.distance;

          edge.data('cyedgebendeditingWeights', weights);
          edge.data('cyedgebendeditingDistances', distances);
          
          refreshDraws();
        });
        
        cy.on('tapend', eTapEnd = function (event) {
          var edge = movedBendEdge;
          
          if( edge !== undefined ) {
            if( movedBendIndex != undefined ) {
              var startX = edge.source().position('x');
              var startY = edge.source().position('y');
              var endX = edge.target().position('x');
              var endY = edge.target().position('y');
              
              var segPts = bendPointUtilities.getSegmentPoints(edge);
              var allPts = [startX, startY].concat(segPts).concat([endX, endY]);
              
              var pointIndex = movedBendIndex + 1;
              var preIndex = pointIndex - 1;
              var posIndex = pointIndex + 1;
              
              var point = {
                x: allPts[2 * pointIndex],
                y: allPts[2 * pointIndex + 1]
              };
              
              var prePoint = {
                x: allPts[2 * preIndex],
                y: allPts[2 * preIndex + 1]
              };
              
              var posPoint = {
                x: allPts[2 * posIndex],
                y: allPts[2 * posIndex + 1]
              };
              
              var nearToLine;
              
              if( ( point.x === prePoint.x && point.y === prePoint.y ) || ( point.x === prePoint.x && point.y === prePoint.y ) ) {
                nearToLine = true;
              }
              else {
                var m1 = ( prePoint.y - posPoint.y ) / ( prePoint.x - posPoint.x );
                var m2 = -1 / m1;

                var srcTgtPointsAndTangents = {
                  srcPoint: prePoint,
                  tgtPoint: posPoint,
                  m1: m1,
                  m2: m2
                };

                //get the intersection of the current segment with the new bend point
                var currentIntersection = bendPointUtilities.getIntersection(edge, point, srcTgtPointsAndTangents);
                var dist = Math.sqrt( Math.pow( (point.x - currentIntersection.x), 2 ) 
                        + Math.pow( (point.y - currentIntersection.y), 2 ));
                
//                var length = Math.sqrt( Math.pow( (posPoint.x - prePoint.x), 2 ) 
//                        + Math.pow( (posPoint.y - prePoint.y), 2 ));
                
                if( dist  < 8 ) {
                  nearToLine = true;
                }
                
              }
              
              if( nearToLine )
              {
                bendPointUtilities.removeBendPoint(edge, movedBendIndex);
              }
              
            }
          }
          
          if (edge !== undefined && moveBendParam !== undefined && edge.data('cyedgebendeditingWeights')
                  && edge.data('cyedgebendeditingWeights').toString() != moveBendParam.weights.toString()) {
            
            if(options().undoable) {
              cy.undoRedo().do('changeBendPoints', moveBendParam);
            }
          }

          movedBendIndex = undefined;
          movedBendEdge = undefined;
          moveBendParam = undefined;
          createBendOnDrag = undefined;

          resetGestures();
          refreshDraws();
        });

        //Variables used for starting and ending the movement of bend points with arrows
        var moveparam;
        var firstBendPoint;
        var edgeContainingFirstBendPoint;
        var firstBendPointFound;
        cy.on("edgebendediting.movestart", function (e, edges) {
            firstBendPointFound = false;
            if (edges[0] != undefined)
            {
                edges.forEach(function( edge ){
                  if (bendPointUtilities.getSegmentPoints(edge) != undefined && !firstBendPointFound)
                  {
                      firstBendPoint = { x: bendPointUtilities.getSegmentPoints(edge)[0], y: bendPointUtilities.getSegmentPoints(edge)[1]};
                      moveparam = {
                          firstTime: true,
                          firstBendPointPosition: {
                              x: firstBendPoint.x,
                              y: firstBendPoint.y
                          },
                          edges: edges
                      };
                      edgeContainingFirstBendPoint = edge;
                      firstBendPointFound = true;
                  }
                });
            }
        });

        cy.on("edgebendediting.moveend", function (e, edges) {
            if (moveparam != undefined)
            {
                var initialPos = moveparam.firstBendPointPosition;
                var movedFirstBendPoint = {
                    x: bendPointUtilities.getSegmentPoints(edgeContainingFirstBendPoint)[0],
                    y: bendPointUtilities.getSegmentPoints(edgeContainingFirstBendPoint)[1]
                };


                moveparam.positionDiff = {
                    x: -movedFirstBendPoint.x + initialPos.x,
                    y: -movedFirstBendPoint.y + initialPos.y
                }

                delete moveparam.firstBendPointPosition;

                if(options().undoable) {
                    cy.undoRedo().do("moveBendPoints", moveparam);
                }

                moveparam = undefined;
            }
        });

        cy.on('cxttap', 'edge', eCxtTap = function (event) {
          var edge = this;
          
          var menus = cy.contextMenus('get'); // get context menus instance
          
          if(!edgeToHighlightBends || edgeToHighlightBends.id() != edge.id() || bendPointUtilities.isIgnoredEdge(edge)) {
            menus.hideMenuItem(removeBendPointCxtMenuId);
            menus.hideMenuItem(addBendPointCxtMenuId);
            return;
          }

          var cyPos = event.position || event.cyPosition;
          var selectedBendIndex = getContainingBendShapeIndex(cyPos.x, cyPos.y, edge);
          if (selectedBendIndex == -1) {
            menus.hideMenuItem(removeBendPointCxtMenuId);
            menus.showMenuItem(addBendPointCxtMenuId);
            bendPointUtilities.currentCtxPos = cyPos;
          }
          else {
            menus.hideMenuItem(addBendPointCxtMenuId);
            menus.showMenuItem(removeBendPointCxtMenuId);
            bendPointUtilities.currentBendIndex = selectedBendIndex;
          }

          bendPointUtilities.currentCtxEdge = edge;
        });
        
        cy.on('cyedgebendediting.changeBendPoints', 'edge', function() {
          var edge = this;
          cy.startBatch();
          cy.edges().unselect();
          edge.select();
          cy.trigger('bendPointMovement');
          cy.endBatch();
          refreshDraws();
        });
      }

      var selectedEdges;
      var bendPointsMoving = false;

      function keyDown(e) {

          var shouldMove = typeof options().moveSelectedBendPointsOnKeyEvents === 'function'
              ? options().moveSelectedBendPointsOnKeyEvents() : options().moveSelectedBendPointsOnKeyEvents;

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
              //If the second checking is removed the bend points of multiple edges would move
              if (cy.edges(":selected").length != cy.elements(":selected").length || cy.edges(":selected").length != 1)
              {
                return;
              }

              if (!bendPointsMoving)
              {
                  selectedEdges = cy.edges(':selected');
                  cy.trigger("edgebendediting.movestart", [selectedEdges]);
                  bendPointsMoving = true;
              }
              if (e.altKey && e.which == '38') {
                  // up arrow and alt
                  moveBendPoints ({x:0, y:-1},selectedEdges);
              }
              else if (e.altKey && e.which == '40') {
                  // down arrow and alt
                  moveBendPoints ({x:0, y:1},selectedEdges);
              }
              else if (e.altKey && e.which == '37') {
                  // left arrow and alt
                  moveBendPoints ({x:-1, y:0},selectedEdges);
              }
              else if (e.altKey && e.which == '39') {
                  // right arrow and alt
                  moveBendPoints ({x:1, y:0},selectedEdges);
              }

              else if (e.shiftKey && e.which == '38') {
                  // up arrow and shift
                  moveBendPoints ({x:0, y:-10},selectedEdges);
              }
              else if (e.shiftKey && e.which == '40') {
                  // down arrow and shift
                  moveBendPoints ({x:0, y:10},selectedEdges);
              }
              else if (e.shiftKey && e.which == '37') {
                  // left arrow and shift
                  moveBendPoints ({x:-10, y:0},selectedEdges);

              }
              else if (e.shiftKey && e.which == '39' ) {
                  // right arrow and shift
                  moveBendPoints ({x:10, y:0},selectedEdges);
              }
              else if (e.keyCode == '38') {
                  // up arrow
                  moveBendPoints({x: 0, y: -3}, selectedEdges);
              }

              else if (e.keyCode == '40') {
                  // down arrow
                  moveBendPoints ({x:0, y:3},selectedEdges);
              }
              else if (e.keyCode == '37') {
                  // left arrow
                  moveBendPoints ({x:-3, y:0},selectedEdges);
              }
              else if (e.keyCode == '39') {
                  //right arrow
                  moveBendPoints ({x:3, y:0},selectedEdges);
              }
          }
      }
      function keyUp(e) {

          if (e.keyCode < '37' || e.keyCode > '40') {
              return;
          }

          var shouldMove = typeof options().moveSelectedBendPointsOnKeyEvents === 'function'
              ? options().moveSelectedBendPointsOnKeyEvents() : options().moveSelectedBendPointsOnKeyEvents;

          if (!shouldMove) {
              return;
          }

          cy.trigger("edgebendediting.moveend", [selectedEdges]);
          selectedEdges = undefined;
          bendPointsMoving = false;

      }
      document.addEventListener("keydown",keyDown, true);
      document.addEventListener("keyup",keyUp, true);

      $container.data('cyedgebendediting', data);
    },
    unbind: function () {
        cy.off('position', 'node', ePosition)
          .off('remove', 'node', eRemove)
          .off('add', 'node', eAdd)
          .off('style', 'edge.edgebendediting-hasbendpoints:selected', eStyle)
          .off('select', 'edge', eSelect)
          .off('unselect', 'edge', eUnselect)
          .off('tapstart', 'edge', eTapStart)
          .off('tapdrag', eTapDrag)
          .off('tapend', eTapEnd)
          .off('cxttap', eCxtTap);

        cy.unbind("zoom pan", eZoom);
    }
  };

  if (functions[fn]) {
    return functions[fn].apply($(cy.container()), Array.prototype.slice.call(arguments, 1));
  } else if (typeof fn == 'object' || !fn) {
    return functions.init.apply($(cy.container()), arguments);
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
  ignoredClasses: undefined,
  setIgnoredClasses: function(_ignoredClasses) {
    this.ignoredClasses = _ignoredClasses;
  },
  // initilize bend points based on bendPositionsFcn
  initBendPoints: function(bendPositionsFcn, edges) {
    for (var i = 0; i < edges.length; i++) {
      var edge = edges[i];
      if(!this.isIgnoredEdge(edge)) {

        // get the bend positions by applying the function for this edge
        var bendPositions = bendPositionsFcn.apply(this, edge);
        // calculate relative bend positions
        var result = this.convertToRelativeBendPositions(edge, bendPositions);

        // if there are bend points set weights and distances accordingly and add class to enable style changes
        if (result.distances.length > 0) {
          edge.data('cyedgebendeditingWeights', result.weights);
          edge.data('cyedgebendeditingDistances', result.distances);
          edge.addClass('edgebendediting-hasbendpoints');
        }
      }
    }
  },

  isIgnoredEdge: function(edge) {
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
    //passing through the bend point and perpendicular to the other line
    var intersectionPoint = {
      x: intersectX,
      y: intersectY
    };
    
    return intersectionPoint;
  },
  getSegmentPoints: function(edge) {
    
    if( edge.css('curve-style') !== 'segments' ) {
      return undefined;
    }
    
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

    var distances = edge.data('cyedgebendeditingDistances');
    for (var i = 0; distances && i < distances.length; i++) {
      str = str + " " + distances[i];
    }
    
    return str;
  },
  getSegmentWeightsString: function (edge) {
    var str = "";

    var weights = edge.data('cyedgebendeditingWeights');
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
    
    var startX = edge.source().position('x');
    var startY = edge.source().position('y');
    var endX = edge.target().position('x');
    var endY = edge.target().position('y');
    
    var startWeight = this.convertToRelativeBendPosition(edge, {x: startX, y: startY}).weight;
    var endWeight = this.convertToRelativeBendPosition(edge, {x: endX, y: endY}).weight;
    var weightsWithTgtSrc = [startWeight].concat(edge.data('cyedgebendeditingWeights')?edge.data('cyedgebendeditingWeights'):[]).concat([endWeight]);
    
    var segPts = this.getSegmentPoints(edge);
    
    var minDist = Infinity;
    var intersection;
    var segptsWithTgtSrc = [startX, startY]
            .concat(segPts?segPts:[])
            .concat([endX, endY]);
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

    var weights = edge.data('cyedgebendeditingWeights');
    var distances = edge.data('cyedgebendeditingDistances');
    
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
   
    edge.data('cyedgebendeditingWeights', weights);
    edge.data('cyedgebendeditingDistances', distances);
    
    edge.addClass('edgebendediting-hasbendpoints');
    
    return relativeBendPosition;
  },
  removeBendPoint: function(edge, bendPointIndex){
    if(edge === undefined || bendPointIndex === undefined){
      edge = this.currentCtxEdge;
      bendPointIndex = this.currentBendIndex;
    }
    
    var distances = edge.data('cyedgebendeditingDistances');
    var weights = edge.data('cyedgebendeditingWeights');
    
    distances.splice(bendPointIndex, 1);
    weights.splice(bendPointIndex, 1);
    
    
    if(distances.length == 0 || weights.length == 0){
      edge.removeClass('edgebendediting-hasbendpoints');
        edge.data('cyedgebendeditingDistances', []);
        edge.data('cyedgebendeditingWeights', []);
    }
    else {
      edge.data('cyedgebendeditingDistances', distances);
      edge.data('cyedgebendeditingWeights', weights);
    }
  },
  calculateDistance: function(pt1, pt2) {
    var diffX = pt1.x - pt2.x;
    var diffY = pt1.y - pt2.y;
    
    var dist = Math.sqrt( Math.pow( diffX, 2 ) + Math.pow( diffY, 2 ) );
    return dist;
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
;(function(){ 'use strict';
  
  var bendPointUtilities = _dereq_('./bendPointUtilities');
  var debounce = _dereq_("./debounce");
  
  // registers the extension on a cytoscape lib ref
  var register = function( cytoscape, $ ){
    var uiUtilities = _dereq_('./UIUtilities');
    
    if( !cytoscape ){ return; } // can't register if cytoscape unspecified

    var defaults = {
      // this function specifies the poitions of bend points
      bendPositionsFunction: function(ele) {
        return ele.data('bendPointPositions');
      },
      // whether to initilize bend points on creation of this extension automatically
      initBendPointsAutomatically: true,
      // the classes of those edges that should be ignored
      ignoredClasses: [],
      // whether the bend editing operations are undoable (requires cytoscape-undo-redo.js)
      undoable: false,
      // the size of bend shape is obtained by multipling width of edge with this parameter
      bendShapeSizeFactor: 3,
      // whether to start the plugin in the enabled state
      enabled: true,
      // title of add bend point menu item (User may need to adjust width of menu items according to length of this option)
      addBendMenuItemTitle: "Add Bend Point",
      // title of remove bend point menu item (User may need to adjust width of menu items according to length of this option)
      removeBendMenuItemTitle: "Remove Bend Point",

      moveSelectedBendPointsOnKeyEvents: function () {
          return false;
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
        obj[i] = options[i];
      }

      return obj;
    };
    
    cytoscape( 'core', 'edgeBendEditing', function(opts){
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
            return bendPointUtilities.getSegmentDistancesString(ele);
          },
          'segment-weights': function (ele) {
            return bendPointUtilities.getSegmentWeightsString(ele);
          },
          'edge-distances': 'node-position'
        });

        bendPointUtilities.setIgnoredClasses(options.ignoredClasses);

        // init bend positions conditionally
        if (options.initBendPointsAutomatically) {
          bendPointUtilities.initBendPoints(options.bendPositionsFunction, cy.edges(), options.ignoredClasses);
        }

        if(options.enabled)
          uiUtilities(options, cy);
        else
          uiUtilities("unbind", cy);
      }
      
      var instance = initialized ? {
        /*
        * get segment points of the given edge in an array A,
        * A[2 * i] is the x coordinate and A[2 * i + 1] is the y coordinate
        * of the ith bend point. (Returns undefined if the curve style is not segments)
        */
        getSegmentPoints: function(ele) {
          return bendPointUtilities.getSegmentPoints(ele);
        },
        // Initilize bend points for the given edges using 'options.bendPositionsFunction'
        initBendPoints: function(eles) {
          bendPointUtilities.initBendPoints(options.bendPositionsFunction, eles);
        },
        deleteSelectedBendPoint: function(ele, index) {
          bendPointUtilities.removeBendPoint(ele,index);
        }
      } : undefined;

      return instance; // chainability
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

  if( typeof cytoscape !== 'undefined' && $ ){ // expose to global cytoscape (i.e. window.cytoscape)
    register( cytoscape, $ );
  }

})();

},{"./UIUtilities":1,"./bendPointUtilities":2,"./debounce":3}],5:[function(_dereq_,module,exports){
module.exports = function (cy, bendPointUtilities, params) {
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
      weights: param.set ? edge.data('cyedgebendeditingWeights') : param.weights,
      distances: param.set ? edge.data('cyedgebendeditingDistances') : param.distances,
      set: true//As the result will not be used for the first function call params should be used to set the data
    };

    var hasBend = param.weights && param.weights.length > 0;

    //Check if we need to set the weights and distances by the param values
    if (param.set) {
      hasBend ? edge.data('cyedgebendeditingWeights', param.weights) : edge.removeData('cyedgebendeditingWeights');
      hasBend ? edge.data('cyedgebendeditingDistances', param.distances) : edge.removeData('cyedgebendeditingDistances');

      //refresh the curve style as the number of bend point would be changed by the previous operation
      if (hasBend) {
        edge.addClass('edgebendediting-hasbendpoints');
      }
      else {
        edge.removeClass('edgebendediting-hasbendpoints');
      }
    }
    
    edge.trigger('cyedgebendediting.changeBendPoints');

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
      moveBendPointsUndoable(positionDiff, edges);

      return result;
  }

  function moveBendPointsUndoable(positionDiff, edges) {
      edges.forEach(function( edge ){
          var previousBendPointsPosition = bendPointUtilities.getSegmentPoints(edge);
          var nextBendPointsPosition = [];
          if (previousBendPointsPosition != undefined)
          {
              for (i=0; i<previousBendPointsPosition.length; i+=2)
              {
                  nextBendPointsPosition.push({x: previousBendPointsPosition[i]+positionDiff.x, y: previousBendPointsPosition[i+1]+positionDiff.y});
              }
              edge.data('bendPointPositions',nextBendPointsPosition);
          }
      });

      bendPointUtilities.initBendPoints(params.bendPositionsFunction, edges);
  }

  ur.action('changeBendPoints', changeBendPoints, changeBendPoints);
  ur.action("moveBendPoints", moveDo, moveDo);
};

},{}]},{},[4])(4)
});

//# sourceMappingURL=data:application/json;charset:utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIm5vZGVfbW9kdWxlcy9icm93c2VyLXBhY2svX3ByZWx1ZGUuanMiLCJzcmMvVUlVdGlsaXRpZXMuanMiLCJzcmMvYmVuZFBvaW50VXRpbGl0aWVzLmpzIiwic3JjL2RlYm91bmNlLmpzIiwic3JjL2luZGV4LmpzIiwic3JjL3JlZ2lzdGVyVW5kb1JlZG9GdW5jdGlvbnMuanMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7QUNBQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDdjBCQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQy9aQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUM3T0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDaklBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0EiLCJmaWxlIjoiZ2VuZXJhdGVkLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXNDb250ZW50IjpbIihmdW5jdGlvbiBlKHQsbixyKXtmdW5jdGlvbiBzKG8sdSl7aWYoIW5bb10pe2lmKCF0W29dKXt2YXIgYT10eXBlb2YgcmVxdWlyZT09XCJmdW5jdGlvblwiJiZyZXF1aXJlO2lmKCF1JiZhKXJldHVybiBhKG8sITApO2lmKGkpcmV0dXJuIGkobywhMCk7dmFyIGY9bmV3IEVycm9yKFwiQ2Fubm90IGZpbmQgbW9kdWxlICdcIitvK1wiJ1wiKTt0aHJvdyBmLmNvZGU9XCJNT0RVTEVfTk9UX0ZPVU5EXCIsZn12YXIgbD1uW29dPXtleHBvcnRzOnt9fTt0W29dWzBdLmNhbGwobC5leHBvcnRzLGZ1bmN0aW9uKGUpe3ZhciBuPXRbb11bMV1bZV07cmV0dXJuIHMobj9uOmUpfSxsLGwuZXhwb3J0cyxlLHQsbixyKX1yZXR1cm4gbltvXS5leHBvcnRzfXZhciBpPXR5cGVvZiByZXF1aXJlPT1cImZ1bmN0aW9uXCImJnJlcXVpcmU7Zm9yKHZhciBvPTA7bzxyLmxlbmd0aDtvKyspcyhyW29dKTtyZXR1cm4gc30pIiwidmFyIGRlYm91bmNlID0gcmVxdWlyZSgnLi9kZWJvdW5jZScpO1xudmFyIGJlbmRQb2ludFV0aWxpdGllcyA9IHJlcXVpcmUoJy4vYmVuZFBvaW50VXRpbGl0aWVzJyk7XG52YXIgcmVnaXN0ZXJVbmRvUmVkb0Z1bmN0aW9ucyA9IHJlcXVpcmUoJy4vcmVnaXN0ZXJVbmRvUmVkb0Z1bmN0aW9ucycpO1xuXG5tb2R1bGUuZXhwb3J0cyA9IGZ1bmN0aW9uIChwYXJhbXMsIGN5KSB7XG4gIHZhciBmbiA9IHBhcmFtcztcblxuICB2YXIgYWRkQmVuZFBvaW50Q3h0TWVudUlkID0gJ2N5LWVkZ2UtYmVuZC1lZGl0aW5nLWN4dC1hZGQtYmVuZC1wb2ludCc7XG4gIHZhciByZW1vdmVCZW5kUG9pbnRDeHRNZW51SWQgPSAnY3ktZWRnZS1iZW5kLWVkaXRpbmctY3h0LXJlbW92ZS1iZW5kLXBvaW50JztcbiAgdmFyIGVQb3NpdGlvbiwgZVN0eWxlLCBlUmVtb3ZlLCBlQWRkLCBlWm9vbSwgZVNlbGVjdCwgZVVuc2VsZWN0LCBlVGFwU3RhcnQsIGVUYXBEcmFnLCBlVGFwRW5kLCBlQ3h0VGFwO1xuICAvLyBsYXN0IHN0YXR1cyBvZiBnZXN0dXJlc1xuICB2YXIgbGFzdFBhbm5pbmdFbmFibGVkLCBsYXN0Wm9vbWluZ0VuYWJsZWQsIGxhc3RCb3hTZWxlY3Rpb25FbmFibGVkO1xuICAvLyBzdGF0dXMgb2YgZWRnZSB0byBoaWdobGlnaHQgYmVuZHMgYW5kIHNlbGVjdGVkIGVkZ2VzXG4gIHZhciBlZGdlVG9IaWdobGlnaHRCZW5kcywgbnVtYmVyT2ZTZWxlY3RlZEVkZ2VzO1xuICBcbiAgdmFyIGZ1bmN0aW9ucyA9IHtcbiAgICBpbml0OiBmdW5jdGlvbiAoKSB7XG4gICAgICAvLyByZWdpc3RlciB1bmRvIHJlZG8gZnVuY3Rpb25zXG4gICAgICByZWdpc3RlclVuZG9SZWRvRnVuY3Rpb25zKGN5LCBiZW5kUG9pbnRVdGlsaXRpZXMsIHBhcmFtcyk7XG4gICAgICBcbiAgICAgIHZhciBzZWxmID0gdGhpcztcbiAgICAgIHZhciBvcHRzID0gcGFyYW1zO1xuICAgICAgdmFyICRjb250YWluZXIgPSAkKHRoaXMpO1xuICAgICAgdmFyICRjYW52YXMgPSAkKCc8Y2FudmFzPjwvY2FudmFzPicpO1xuXG4gICAgICAkY29udGFpbmVyLmFwcGVuZCgkY2FudmFzKTtcblxuICAgICAgdmFyIGN4dEFkZEJlbmRQb2ludEZjbiA9IGZ1bmN0aW9uIChldmVudCkge1xuICAgICAgICB2YXIgZWRnZSA9IGV2ZW50LnRhcmdldCB8fCBldmVudC5jeVRhcmdldDtcbiAgICAgICAgaWYoIWJlbmRQb2ludFV0aWxpdGllcy5pc0lnbm9yZWRFZGdlKGVkZ2UpKSB7XG5cbiAgICAgICAgICB2YXIgcGFyYW0gPSB7XG4gICAgICAgICAgICBlZGdlOiBlZGdlLFxuICAgICAgICAgICAgd2VpZ2h0czogZWRnZS5kYXRhKCdjeWVkZ2ViZW5kZWRpdGluZ1dlaWdodHMnKSA/IFtdLmNvbmNhdChlZGdlLmRhdGEoJ2N5ZWRnZWJlbmRlZGl0aW5nV2VpZ2h0cycpKSA6IGVkZ2UuZGF0YSgnY3llZGdlYmVuZGVkaXRpbmdXZWlnaHRzJyksXG4gICAgICAgICAgICBkaXN0YW5jZXM6IGVkZ2UuZGF0YSgnY3llZGdlYmVuZGVkaXRpbmdEaXN0YW5jZXMnKSA/IFtdLmNvbmNhdChlZGdlLmRhdGEoJ2N5ZWRnZWJlbmRlZGl0aW5nRGlzdGFuY2VzJykpIDogZWRnZS5kYXRhKCdjeWVkZ2ViZW5kZWRpdGluZ0Rpc3RhbmNlcycpXG4gICAgICAgICAgfTtcblxuICAgICAgICAgIGJlbmRQb2ludFV0aWxpdGllcy5hZGRCZW5kUG9pbnQoKTtcblxuICAgICAgICAgIGlmIChvcHRpb25zKCkudW5kb2FibGUpIHtcbiAgICAgICAgICAgIGN5LnVuZG9SZWRvKCkuZG8oJ2NoYW5nZUJlbmRQb2ludHMnLCBwYXJhbSk7XG4gICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICAgIFxuICAgICAgICByZWZyZXNoRHJhd3MoKTtcbiAgICAgIH07XG5cbiAgICAgIHZhciBjeHRSZW1vdmVCZW5kUG9pbnRGY24gPSBmdW5jdGlvbiAoZXZlbnQpIHtcbiAgICAgICAgdmFyIGVkZ2UgPSBldmVudC50YXJnZXQgfHwgZXZlbnQuY3lUYXJnZXQ7XG4gICAgICAgIFxuICAgICAgICB2YXIgcGFyYW0gPSB7XG4gICAgICAgICAgZWRnZTogZWRnZSxcbiAgICAgICAgICB3ZWlnaHRzOiBbXS5jb25jYXQoZWRnZS5kYXRhKCdjeWVkZ2ViZW5kZWRpdGluZ1dlaWdodHMnKSksXG4gICAgICAgICAgZGlzdGFuY2VzOiBbXS5jb25jYXQoZWRnZS5kYXRhKCdjeWVkZ2ViZW5kZWRpdGluZ0Rpc3RhbmNlcycpKVxuICAgICAgICB9O1xuXG4gICAgICAgIGJlbmRQb2ludFV0aWxpdGllcy5yZW1vdmVCZW5kUG9pbnQoKTtcbiAgICAgICAgXG4gICAgICAgIGlmKG9wdGlvbnMoKS51bmRvYWJsZSkge1xuICAgICAgICAgIGN5LnVuZG9SZWRvKCkuZG8oJ2NoYW5nZUJlbmRQb2ludHMnLCBwYXJhbSk7XG4gICAgICAgIH1cbiAgICAgICAgXG4gICAgICAgIHJlZnJlc2hEcmF3cygpO1xuICAgICAgfTtcbiAgICAgIFxuICAgICAgdmFyIG1lbnVJdGVtcyA9IFtcbiAgICAgICAge1xuICAgICAgICAgIGlkOiBhZGRCZW5kUG9pbnRDeHRNZW51SWQsXG4gICAgICAgICAgdGl0bGU6IG9wdHMuYWRkQmVuZE1lbnVJdGVtVGl0bGUsXG4gICAgICAgICAgY29udGVudDogJ0FkZCBCZW5kIFBvaW50JyxcbiAgICAgICAgICBzZWxlY3RvcjogJ2VkZ2UnLFxuICAgICAgICAgIG9uQ2xpY2tGdW5jdGlvbjogY3h0QWRkQmVuZFBvaW50RmNuXG4gICAgICAgIH0sXG4gICAgICAgIHtcbiAgICAgICAgICBpZDogcmVtb3ZlQmVuZFBvaW50Q3h0TWVudUlkLFxuICAgICAgICAgIHRpdGxlOiBvcHRzLnJlbW92ZUJlbmRNZW51SXRlbVRpdGxlLFxuICAgICAgICAgIGNvbnRlbnQ6ICdSZW1vdmUgQmVuZCBQb2ludCcsXG4gICAgICAgICAgc2VsZWN0b3I6ICdlZGdlJyxcbiAgICAgICAgICBvbkNsaWNrRnVuY3Rpb246IGN4dFJlbW92ZUJlbmRQb2ludEZjblxuICAgICAgICB9XG4gICAgICBdO1xuICAgICAgXG4gICAgICBpZihjeS5jb250ZXh0TWVudXMpIHtcbiAgICAgICAgdmFyIG1lbnVzID0gY3kuY29udGV4dE1lbnVzKCdnZXQnKTtcbiAgICAgICAgLy8gSWYgY29udGV4dCBtZW51cyBpcyBhY3RpdmUganVzdCBhcHBlbmQgbWVudSBpdGVtcyBlbHNlIGFjdGl2YXRlIHRoZSBleHRlbnNpb25cbiAgICAgICAgLy8gd2l0aCBpbml0aWFsIG1lbnUgaXRlbXNcbiAgICAgICAgaWYgKG1lbnVzLmlzQWN0aXZlKCkpIHtcbiAgICAgICAgICBtZW51cy5hcHBlbmRNZW51SXRlbXMobWVudUl0ZW1zKTtcbiAgICAgICAgfVxuICAgICAgICBlbHNlIHtcbiAgICAgICAgICBjeS5jb250ZXh0TWVudXMoe1xuICAgICAgICAgICAgbWVudUl0ZW1zOiBtZW51SXRlbXNcbiAgICAgICAgICB9KTtcbiAgICAgICAgfVxuICAgICAgfVxuICAgICAgXG4gICAgICB2YXIgX3NpemVDYW52YXMgPSBkZWJvdW5jZShmdW5jdGlvbiAoKSB7XG4gICAgICAgICRjYW52YXNcbiAgICAgICAgICAuYXR0cignaGVpZ2h0JywgJGNvbnRhaW5lci5oZWlnaHQoKSlcbiAgICAgICAgICAuYXR0cignd2lkdGgnLCAkY29udGFpbmVyLndpZHRoKCkpXG4gICAgICAgICAgLmNzcyh7XG4gICAgICAgICAgICAncG9zaXRpb24nOiAnYWJzb2x1dGUnLFxuICAgICAgICAgICAgJ3RvcCc6IDAsXG4gICAgICAgICAgICAnbGVmdCc6IDAsXG4gICAgICAgICAgICAnei1pbmRleCc6ICc5OTknXG4gICAgICAgICAgfSlcbiAgICAgICAgO1xuXG4gICAgICAgIHNldFRpbWVvdXQoZnVuY3Rpb24gKCkge1xuICAgICAgICAgIHZhciBjYW52YXNCYiA9ICRjYW52YXMub2Zmc2V0KCk7XG4gICAgICAgICAgdmFyIGNvbnRhaW5lckJiID0gJGNvbnRhaW5lci5vZmZzZXQoKTtcblxuICAgICAgICAgICRjYW52YXNcbiAgICAgICAgICAgIC5jc3Moe1xuICAgICAgICAgICAgICAndG9wJzogLShjYW52YXNCYi50b3AgLSBjb250YWluZXJCYi50b3ApLFxuICAgICAgICAgICAgICAnbGVmdCc6IC0oY2FudmFzQmIubGVmdCAtIGNvbnRhaW5lckJiLmxlZnQpXG4gICAgICAgICAgICB9KVxuICAgICAgICAgIDtcblxuICAgICAgICAgIC8vIHJlZHJhdyBvbiBjYW52YXMgcmVzaXplXG4gICAgICAgICAgaWYoY3kpe1xuICAgICAgICAgICAgcmVmcmVzaERyYXdzKCk7XG4gICAgICAgICAgfVxuICAgICAgICB9LCAwKTtcblxuICAgICAgfSwgMjUwKTtcblxuICAgICAgZnVuY3Rpb24gc2l6ZUNhbnZhcygpIHtcbiAgICAgICAgX3NpemVDYW52YXMoKTtcbiAgICAgIH1cblxuICAgICAgc2l6ZUNhbnZhcygpO1xuXG4gICAgICAkKHdpbmRvdykuYmluZCgncmVzaXplJywgZnVuY3Rpb24gKCkge1xuICAgICAgICBzaXplQ2FudmFzKCk7XG4gICAgICB9KTtcblxuICAgICAgdmFyIGN0eCA9ICRjYW52YXNbMF0uZ2V0Q29udGV4dCgnMmQnKTtcblxuICAgICAgLy8gd3JpdGUgb3B0aW9ucyB0byBkYXRhXG4gICAgICB2YXIgZGF0YSA9ICRjb250YWluZXIuZGF0YSgnY3llZGdlYmVuZGVkaXRpbmcnKTtcbiAgICAgIGlmIChkYXRhID09IG51bGwpIHtcbiAgICAgICAgZGF0YSA9IHt9O1xuICAgICAgfVxuICAgICAgZGF0YS5vcHRpb25zID0gb3B0cztcblxuICAgICAgdmFyIG9wdENhY2hlO1xuXG4gICAgICBmdW5jdGlvbiBvcHRpb25zKCkge1xuICAgICAgICByZXR1cm4gb3B0Q2FjaGUgfHwgKG9wdENhY2hlID0gJGNvbnRhaW5lci5kYXRhKCdjeWVkZ2ViZW5kZWRpdGluZycpLm9wdGlvbnMpO1xuICAgICAgfVxuXG4gICAgICAvLyB3ZSB3aWxsIG5lZWQgdG8gY29udmVydCBtb2RlbCBwb3NpdG9ucyB0byByZW5kZXJlZCBwb3NpdGlvbnNcbiAgICAgIGZ1bmN0aW9uIGNvbnZlcnRUb1JlbmRlcmVkUG9zaXRpb24obW9kZWxQb3NpdGlvbikge1xuICAgICAgICB2YXIgcGFuID0gY3kucGFuKCk7XG4gICAgICAgIHZhciB6b29tID0gY3kuem9vbSgpO1xuXG4gICAgICAgIHZhciB4ID0gbW9kZWxQb3NpdGlvbi54ICogem9vbSArIHBhbi54O1xuICAgICAgICB2YXIgeSA9IG1vZGVsUG9zaXRpb24ueSAqIHpvb20gKyBwYW4ueTtcblxuICAgICAgICByZXR1cm4ge1xuICAgICAgICAgIHg6IHgsXG4gICAgICAgICAgeTogeVxuICAgICAgICB9O1xuICAgICAgfVxuICAgICAgXG4gICAgICBmdW5jdGlvbiByZWZyZXNoRHJhd3MoKSB7XG5cbiAgICAgICAgdmFyIHcgPSAkY29udGFpbmVyLndpZHRoKCk7XG4gICAgICAgIHZhciBoID0gJGNvbnRhaW5lci5oZWlnaHQoKTtcblxuICAgICAgICBjdHguY2xlYXJSZWN0KDAsIDAsIHcsIGgpO1xuICAgICAgICBcbiAgICAgICAgaWYoIGVkZ2VUb0hpZ2hsaWdodEJlbmRzICkge1xuICAgICAgICAgIHJlbmRlckJlbmRTaGFwZXMoZWRnZVRvSGlnaGxpZ2h0QmVuZHMpO1xuICAgICAgICB9XG4gICAgICB9XG4gICAgICBcbiAgICAgIFxuICAgICAgLy8gcmVuZGVyIHRoZSBiZW5kIHNoYXBlcyBvZiB0aGUgZ2l2ZW4gZWRnZVxuICAgICAgZnVuY3Rpb24gcmVuZGVyQmVuZFNoYXBlcyhlZGdlKSB7XG4gICAgICAgIFxuICAgICAgICBpZighZWRnZS5oYXNDbGFzcygnZWRnZWJlbmRlZGl0aW5nLWhhc2JlbmRwb2ludHMnKSkge1xuICAgICAgICAgIHJldHVybjtcbiAgICAgICAgfVxuICAgICAgICBcbiAgICAgICAgdmFyIHNlZ3B0cyA9IGJlbmRQb2ludFV0aWxpdGllcy5nZXRTZWdtZW50UG9pbnRzKGVkZ2UpOy8vZWRnZS5fcHJpdmF0ZS5yZGF0YS5zZWdwdHM7XG4gICAgICAgIHZhciBsZW5ndGggPSBnZXRCZW5kU2hhcGVzTGVuZ2h0KGVkZ2UpO1xuICAgICAgICBcbiAgICAgICAgdmFyIHNyY1BvcyA9IGVkZ2Uuc291cmNlKCkucG9zaXRpb24oKTtcbiAgICAgICAgdmFyIHRndFBvcyA9IGVkZ2UudGFyZ2V0KCkucG9zaXRpb24oKTtcbiAgICAgICAgXG4gICAgICAgIHZhciB3ZWlnaHRzID0gZWRnZS5kYXRhKCdjeWVkZ2ViZW5kZWRpdGluZ1dlaWdodHMnKTtcbiAgICAgICAgdmFyIGRpc3RhbmNlcyA9IGVkZ2UuZGF0YSgnY3llZGdlYmVuZGVkaXRpbmdEaXN0YW5jZXMnKTtcblxuICAgICAgICBmb3IodmFyIGkgPSAwOyBzZWdwdHMgJiYgaSA8IHNlZ3B0cy5sZW5ndGg7IGkgPSBpICsgMil7XG4gICAgICAgICAgdmFyIGJlbmRYID0gc2VncHRzW2ldO1xuICAgICAgICAgIHZhciBiZW5kWSA9IHNlZ3B0c1tpICsgMV07XG5cbiAgICAgICAgICB2YXIgb2xkU3R5bGUgPSBjdHguZmlsbFN0eWxlO1xuICAgICAgICAgIGN0eC5maWxsU3R5bGUgPSBlZGdlLmNzcygnbGluZS1jb2xvcicpO1xuICAgICAgICAgIHJlbmRlckJlbmRTaGFwZShiZW5kWCwgYmVuZFksIGxlbmd0aCk7XG4gICAgICAgICAgY3R4LmZpbGxTdHlsZSA9IG9sZFN0eWxlO1xuICAgICAgICB9XG4gICAgICB9XG4gICAgICBcbiAgICAgIC8vIHJlbmRlciBhIGJlbmQgc2hhcGUgd2l0aCB0aGUgZ2l2ZW4gcGFyYW1ldGVyc1xuICAgICAgZnVuY3Rpb24gcmVuZGVyQmVuZFNoYXBlKGJlbmRYLCBiZW5kWSwgbGVuZ3RoKSB7XG4gICAgICAgIC8vIGdldCB0aGUgdG9wIGxlZnQgY29vcmRpbmF0ZXNcbiAgICAgICAgdmFyIHRvcExlZnRYID0gYmVuZFggLSBsZW5ndGggLyAyO1xuICAgICAgICB2YXIgdG9wTGVmdFkgPSBiZW5kWSAtIGxlbmd0aCAvIDI7XG4gICAgICAgIFxuICAgICAgICAvLyBjb252ZXJ0IHRvIHJlbmRlcmVkIHBhcmFtZXRlcnNcbiAgICAgICAgdmFyIHJlbmRlcmVkVG9wTGVmdFBvcyA9IGNvbnZlcnRUb1JlbmRlcmVkUG9zaXRpb24oe3g6IHRvcExlZnRYLCB5OiB0b3BMZWZ0WX0pO1xuICAgICAgICBsZW5ndGggKj0gY3kuem9vbSgpO1xuICAgICAgICBcbiAgICAgICAgLy8gcmVuZGVyIGJlbmQgc2hhcGVcbiAgICAgICAgY3R4LmJlZ2luUGF0aCgpO1xuICAgICAgICBjdHgucmVjdChyZW5kZXJlZFRvcExlZnRQb3MueCwgcmVuZGVyZWRUb3BMZWZ0UG9zLnksIGxlbmd0aCwgbGVuZ3RoKTtcbiAgICAgICAgY3R4LmZpbGwoKTtcbiAgICAgICAgY3R4LmNsb3NlUGF0aCgpO1xuICAgICAgfVxuICAgICAgXG4gICAgICAvLyBnZXQgdGhlIGxlbmd0aCBvZiBiZW5kIHBvaW50cyB0byBiZSByZW5kZXJlZFxuICAgICAgZnVuY3Rpb24gZ2V0QmVuZFNoYXBlc0xlbmdodChlZGdlKSB7XG4gICAgICAgIHZhciBmYWN0b3IgPSBvcHRpb25zKCkuYmVuZFNoYXBlU2l6ZUZhY3RvcjtcbiAgICAgICAgaWYgKHBhcnNlRmxvYXQoZWRnZS5jc3MoJ3dpZHRoJykpIDw9IDIuNSlcbiAgICAgICAgICByZXR1cm4gMi41ICogZmFjdG9yO1xuICAgICAgICBlbHNlIHJldHVybiBwYXJzZUZsb2F0KGVkZ2UuY3NzKCd3aWR0aCcpKSpmYWN0b3I7XG4gICAgICB9XG4gICAgICBcbiAgICAgIC8vIGNoZWNrIGlmIHRoZSBwb2ludCByZXByZXNlbnRlZCBieSB7eCwgeX0gaXMgaW5zaWRlIHRoZSBiZW5kIHNoYXBlXG4gICAgICBmdW5jdGlvbiBjaGVja0lmSW5zaWRlQmVuZFNoYXBlKHgsIHksIGxlbmd0aCwgY2VudGVyWCwgY2VudGVyWSl7XG4gICAgICAgIHZhciBtaW5YID0gY2VudGVyWCAtIGxlbmd0aCAvIDI7XG4gICAgICAgIHZhciBtYXhYID0gY2VudGVyWCArIGxlbmd0aCAvIDI7XG4gICAgICAgIHZhciBtaW5ZID0gY2VudGVyWSAtIGxlbmd0aCAvIDI7XG4gICAgICAgIHZhciBtYXhZID0gY2VudGVyWSArIGxlbmd0aCAvIDI7XG4gICAgICAgIFxuICAgICAgICB2YXIgaW5zaWRlID0gKHggPj0gbWluWCAmJiB4IDw9IG1heFgpICYmICh5ID49IG1pblkgJiYgeSA8PSBtYXhZKTtcbiAgICAgICAgcmV0dXJuIGluc2lkZTtcbiAgICAgIH1cblxuICAgICAgLy8gZ2V0IHRoZSBpbmRleCBvZiBiZW5kIHBvaW50IGNvbnRhaW5pbmcgdGhlIHBvaW50IHJlcHJlc2VudGVkIGJ5IHt4LCB5fVxuICAgICAgZnVuY3Rpb24gZ2V0Q29udGFpbmluZ0JlbmRTaGFwZUluZGV4KHgsIHksIGVkZ2UpIHtcbiAgICAgICAgaWYoZWRnZS5kYXRhKCdjeWVkZ2ViZW5kZWRpdGluZ1dlaWdodHMnKSA9PSBudWxsIHx8IGVkZ2UuZGF0YSgnY3llZGdlYmVuZGVkaXRpbmdXZWlnaHRzJykubGVuZ3RoID09IDApe1xuICAgICAgICAgIHJldHVybiAtMTtcbiAgICAgICAgfVxuXG4gICAgICAgIHZhciBzZWdwdHMgPSBiZW5kUG9pbnRVdGlsaXRpZXMuZ2V0U2VnbWVudFBvaW50cyhlZGdlKTsvL2VkZ2UuX3ByaXZhdGUucmRhdGEuc2VncHRzO1xuICAgICAgICB2YXIgbGVuZ3RoID0gZ2V0QmVuZFNoYXBlc0xlbmdodChlZGdlKTtcblxuICAgICAgICBmb3IodmFyIGkgPSAwOyBzZWdwdHMgJiYgaSA8IHNlZ3B0cy5sZW5ndGg7IGkgPSBpICsgMil7XG4gICAgICAgICAgdmFyIGJlbmRYID0gc2VncHRzW2ldO1xuICAgICAgICAgIHZhciBiZW5kWSA9IHNlZ3B0c1tpICsgMV07XG5cbiAgICAgICAgICB2YXIgaW5zaWRlID0gY2hlY2tJZkluc2lkZUJlbmRTaGFwZSh4LCB5LCBsZW5ndGgsIGJlbmRYLCBiZW5kWSk7XG4gICAgICAgICAgaWYoaW5zaWRlKXtcbiAgICAgICAgICAgIHJldHVybiBpIC8gMjtcbiAgICAgICAgICB9XG4gICAgICAgIH1cblxuICAgICAgICByZXR1cm4gLTE7XG4gICAgICB9O1xuICAgICAgXG4gICAgICAvLyBzdG9yZSB0aGUgY3VycmVudCBzdGF0dXMgb2YgZ2VzdHVyZXMgYW5kIHNldCB0aGVtIHRvIGZhbHNlXG4gICAgICBmdW5jdGlvbiBkaXNhYmxlR2VzdHVyZXMoKSB7XG4gICAgICAgIGxhc3RQYW5uaW5nRW5hYmxlZCA9IGN5LnBhbm5pbmdFbmFibGVkKCk7XG4gICAgICAgIGxhc3Rab29taW5nRW5hYmxlZCA9IGN5Lnpvb21pbmdFbmFibGVkKCk7XG4gICAgICAgIGxhc3RCb3hTZWxlY3Rpb25FbmFibGVkID0gY3kuYm94U2VsZWN0aW9uRW5hYmxlZCgpO1xuXG4gICAgICAgIGN5Lnpvb21pbmdFbmFibGVkKGZhbHNlKVxuICAgICAgICAgIC5wYW5uaW5nRW5hYmxlZChmYWxzZSlcbiAgICAgICAgICAuYm94U2VsZWN0aW9uRW5hYmxlZChmYWxzZSk7XG4gICAgICB9XG4gICAgICBcbiAgICAgIC8vIHJlc2V0IHRoZSBnZXN0dXJlcyBieSB0aGVpciBsYXRlc3Qgc3RhdHVzXG4gICAgICBmdW5jdGlvbiByZXNldEdlc3R1cmVzKCkge1xuICAgICAgICBjeS56b29taW5nRW5hYmxlZChsYXN0Wm9vbWluZ0VuYWJsZWQpXG4gICAgICAgICAgLnBhbm5pbmdFbmFibGVkKGxhc3RQYW5uaW5nRW5hYmxlZClcbiAgICAgICAgICAuYm94U2VsZWN0aW9uRW5hYmxlZChsYXN0Qm94U2VsZWN0aW9uRW5hYmxlZCk7XG4gICAgICB9XG5cbiAgICAgIGZ1bmN0aW9uIG1vdmVCZW5kUG9pbnRzKHBvc2l0aW9uRGlmZiwgZWRnZXMpIHtcbiAgICAgICAgICBlZGdlcy5mb3JFYWNoKGZ1bmN0aW9uKCBlZGdlICl7XG4gICAgICAgICAgICAgIHZhciBwcmV2aW91c0JlbmRQb2ludHNQb3NpdGlvbiA9IGJlbmRQb2ludFV0aWxpdGllcy5nZXRTZWdtZW50UG9pbnRzKGVkZ2UpO1xuICAgICAgICAgICAgICB2YXIgbmV4dEJlbmRQb2ludHNQb3NpdGlvbiA9IFtdO1xuICAgICAgICAgICAgICBpZiAocHJldmlvdXNCZW5kUG9pbnRzUG9zaXRpb24gIT0gdW5kZWZpbmVkKVxuICAgICAgICAgICAgICB7XG4gICAgICAgICAgICAgICAgZm9yIChpPTA7IGk8cHJldmlvdXNCZW5kUG9pbnRzUG9zaXRpb24ubGVuZ3RoOyBpKz0yKVxuICAgICAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgICAgICAgbmV4dEJlbmRQb2ludHNQb3NpdGlvbi5wdXNoKHt4OiBwcmV2aW91c0JlbmRQb2ludHNQb3NpdGlvbltpXStwb3NpdGlvbkRpZmYueCwgeTogcHJldmlvdXNCZW5kUG9pbnRzUG9zaXRpb25baSsxXStwb3NpdGlvbkRpZmYueX0pO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICBlZGdlLmRhdGEoJ2JlbmRQb2ludFBvc2l0aW9ucycsbmV4dEJlbmRQb2ludHNQb3NpdGlvbik7XG4gICAgICAgICAgICAgIH1cblxuICAgICAgICAgIH0pO1xuICAgICAgICAgIGJlbmRQb2ludFV0aWxpdGllcy5pbml0QmVuZFBvaW50cyhvcHRpb25zKCkuYmVuZFBvc2l0aW9uc0Z1bmN0aW9uLCBlZGdlcyk7XG4gICAgICB9XG5cbiAgICAgIHsgIFxuICAgICAgICBsYXN0UGFubmluZ0VuYWJsZWQgPSBjeS5wYW5uaW5nRW5hYmxlZCgpO1xuICAgICAgICBsYXN0Wm9vbWluZ0VuYWJsZWQgPSBjeS56b29taW5nRW5hYmxlZCgpO1xuICAgICAgICBsYXN0Qm94U2VsZWN0aW9uRW5hYmxlZCA9IGN5LmJveFNlbGVjdGlvbkVuYWJsZWQoKTtcbiAgICAgICAgXG4gICAgICAgIC8vIEluaXRpbGl6ZSB0aGUgZWRnZVRvSGlnaGxpZ2h0QmVuZHMgYW5kIG51bWJlck9mU2VsZWN0ZWRFZGdlc1xuICAgICAgICB7XG4gICAgICAgICAgdmFyIHNlbGVjdGVkRWRnZXMgPSBjeS5lZGdlcygnOnNlbGVjdGVkJyk7XG4gICAgICAgICAgdmFyIG51bWJlck9mU2VsZWN0ZWRFZGdlcyA9IHNlbGVjdGVkRWRnZXMubGVuZ3RoO1xuICAgICAgICAgIFxuICAgICAgICAgIGlmICggbnVtYmVyT2ZTZWxlY3RlZEVkZ2VzID09PSAxICkge1xuICAgICAgICAgICAgZWRnZVRvSGlnaGxpZ2h0QmVuZHMgPSBzZWxlY3RlZEVkZ2VzWzBdO1xuICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgICBcbiAgICAgICAgY3kuYmluZCgnem9vbSBwYW4nLCBlWm9vbSA9IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICBpZiAoICFlZGdlVG9IaWdobGlnaHRCZW5kcyApIHtcbiAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgICB9XG4gICAgICAgICAgXG4gICAgICAgICAgcmVmcmVzaERyYXdzKCk7XG4gICAgICAgIH0pO1xuXG4gICAgICAgIGN5Lm9uKCdkYXRhJywgJ2VkZ2UnLCAgZnVuY3Rpb24gKCkge1xuICAgICAgICAgIHJlZnJlc2hEcmF3cygpO1xuICAgICAgICB9KTtcblxuICAgICAgICBjeS5vbigncG9zaXRpb24nLCAnbm9kZScsIGVQb3NpdGlvbiA9IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICB2YXIgbm9kZSA9IHRoaXM7XG4gICAgICAgICAgXG4gICAgICAgICAgLy8gSWYgdGhlcmUgaXMgbm8gZWRnZSB0byBoaWdobGlnaHQgYmVuZHMgb3IgdGhpcyBub2RlIGlzIG5vdCBhbnkgZW5kIG9mIHRoYXQgZWRnZSByZXR1cm4gZGlyZWN0bHlcbiAgICAgICAgICBpZiAoICFlZGdlVG9IaWdobGlnaHRCZW5kcyB8fCAhKCBlZGdlVG9IaWdobGlnaHRCZW5kcy5kYXRhKCdzb3VyY2UnKSA9PT0gbm9kZS5pZCgpIFxuICAgICAgICAgICAgICAgICAgfHwgZWRnZVRvSGlnaGxpZ2h0QmVuZHMuZGF0YSgndGFyZ2V0JykgPT09IG5vZGUuaWQoKSApICkge1xuICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICAgIH1cbiAgICAgICAgICBcbiAgICAgICAgICByZWZyZXNoRHJhd3MoKTtcbiAgICAgICAgfSk7XG5cbiAgICAgICAgY3kub24oJ3N0eWxlJywgJ2VkZ2UuZWRnZWJlbmRlZGl0aW5nLWhhc2JlbmRwb2ludHM6c2VsZWN0ZWQnLCBlU3R5bGUgPSBmdW5jdGlvbiAoKSB7XG4gICAgICAgICAgcmVmcmVzaERyYXdzKCk7XG4gICAgICAgIH0pO1xuXG4gICAgICAgIGN5Lm9uKCdyZW1vdmUnLCAnZWRnZScsIGVSZW1vdmUgPSBmdW5jdGlvbiAoKSB7XG4gICAgICAgICAgdmFyIGVkZ2UgPSB0aGlzO1xuICAgICAgICAgIGlmIChlZGdlLnNlbGVjdGVkKCkpIHtcbiAgICAgICAgICAgIG51bWJlck9mU2VsZWN0ZWRFZGdlcyA9IG51bWJlck9mU2VsZWN0ZWRFZGdlcyAtIDE7XG4gICAgICAgICAgICBcbiAgICAgICAgICAgIGN5LnN0YXJ0QmF0Y2goKTtcbiAgICAgICAgICAgIFxuICAgICAgICAgICAgaWYgKGVkZ2VUb0hpZ2hsaWdodEJlbmRzKSB7XG4gICAgICAgICAgICAgIGVkZ2VUb0hpZ2hsaWdodEJlbmRzLnJlbW92ZUNsYXNzKCdjeS1lZGdlLWJlbmQtZWRpdGluZy1oaWdobGlnaHQtYmVuZHMnKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIFxuICAgICAgICAgICAgaWYgKG51bWJlck9mU2VsZWN0ZWRFZGdlcyA9PT0gMSkge1xuICAgICAgICAgICAgICB2YXIgc2VsZWN0ZWRFZGdlcyA9IGN5LmVkZ2VzKCc6c2VsZWN0ZWQnKTtcbiAgICAgICAgICAgICAgXG4gICAgICAgICAgICAgIC8vIElmIHVzZXIgcmVtb3ZlcyBhbGwgc2VsZWN0ZWQgZWRnZXMgYXQgYSBzaW5nbGUgb3BlcmF0aW9uIHRoZW4gb3VyICdudW1iZXJPZlNlbGVjdGVkRWRnZXMnXG4gICAgICAgICAgICAgIC8vIG1heSBiZSBtaXNsZWFkaW5nLiBUaGVyZWZvcmUgd2UgbmVlZCB0byBjaGVjayBpZiB0aGUgbnVtYmVyIG9mIGVkZ2VzIHRvIGhpZ2hsaWdodCBpcyByZWFseSAxIGhlcmUuXG4gICAgICAgICAgICAgIGlmIChzZWxlY3RlZEVkZ2VzLmxlbmd0aCA9PT0gMSkge1xuICAgICAgICAgICAgICAgIGVkZ2VUb0hpZ2hsaWdodEJlbmRzID0gc2VsZWN0ZWRFZGdlc1swXTtcbiAgICAgICAgICAgICAgICBlZGdlVG9IaWdobGlnaHRCZW5kcy5hZGRDbGFzcygnY3ktZWRnZS1iZW5kLWVkaXRpbmctaGlnaGxpZ2h0LWJlbmRzJyk7XG4gICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgZWxzZSB7XG4gICAgICAgICAgICAgICAgZWRnZVRvSGlnaGxpZ2h0QmVuZHMgPSB1bmRlZmluZWQ7XG4gICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGVsc2Uge1xuICAgICAgICAgICAgICBlZGdlVG9IaWdobGlnaHRCZW5kcyA9IHVuZGVmaW5lZDtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIFxuICAgICAgICAgICAgY3kuZW5kQmF0Y2goKTtcbiAgICAgICAgICB9XG4gICAgICAgICAgcmVmcmVzaERyYXdzKCk7XG4gICAgICAgIH0pO1xuICAgICAgICBcbiAgICAgICAgIGN5Lm9uKCdhZGQnLCAnZWRnZScsIGVBZGQgPSBmdW5jdGlvbiAoKSB7XG4gICAgICAgICAgdmFyIGVkZ2UgPSB0aGlzO1xuICAgICAgICAgIGlmIChlZGdlLnNlbGVjdGVkKCkpIHtcbiAgICAgICAgICAgIG51bWJlck9mU2VsZWN0ZWRFZGdlcyA9IG51bWJlck9mU2VsZWN0ZWRFZGdlcyArIDE7XG4gICAgICAgICAgICBcbiAgICAgICAgICAgIGN5LnN0YXJ0QmF0Y2goKTtcbiAgICAgICAgICAgIFxuICAgICAgICAgICAgaWYgKGVkZ2VUb0hpZ2hsaWdodEJlbmRzKSB7XG4gICAgICAgICAgICAgIGVkZ2VUb0hpZ2hsaWdodEJlbmRzLnJlbW92ZUNsYXNzKCdjeS1lZGdlLWJlbmQtZWRpdGluZy1oaWdobGlnaHQtYmVuZHMnKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIFxuICAgICAgICAgICAgaWYgKG51bWJlck9mU2VsZWN0ZWRFZGdlcyA9PT0gMSkge1xuICAgICAgICAgICAgICBlZGdlVG9IaWdobGlnaHRCZW5kcyA9IGVkZ2U7XG4gICAgICAgICAgICAgIGVkZ2VUb0hpZ2hsaWdodEJlbmRzLmFkZENsYXNzKCdjeS1lZGdlLWJlbmQtZWRpdGluZy1oaWdobGlnaHQtYmVuZHMnKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGVsc2Uge1xuICAgICAgICAgICAgICBlZGdlVG9IaWdobGlnaHRCZW5kcyA9IHVuZGVmaW5lZDtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIFxuICAgICAgICAgICAgY3kuZW5kQmF0Y2goKTtcbiAgICAgICAgICB9XG4gICAgICAgICAgcmVmcmVzaERyYXdzKCk7XG4gICAgICAgIH0pO1xuICAgICAgICBcbiAgICAgICAgY3kub24oJ3NlbGVjdCcsICdlZGdlJywgZVNlbGVjdCA9IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICB2YXIgZWRnZSA9IHRoaXM7XG4gICAgICAgICAgbnVtYmVyT2ZTZWxlY3RlZEVkZ2VzID0gbnVtYmVyT2ZTZWxlY3RlZEVkZ2VzICsgMTtcbiAgICAgICAgICBcbiAgICAgICAgICBjeS5zdGFydEJhdGNoKCk7XG4gICAgICAgICAgICBcbiAgICAgICAgICBpZiAoZWRnZVRvSGlnaGxpZ2h0QmVuZHMpIHtcbiAgICAgICAgICAgIGVkZ2VUb0hpZ2hsaWdodEJlbmRzLnJlbW92ZUNsYXNzKCdjeS1lZGdlLWJlbmQtZWRpdGluZy1oaWdobGlnaHQtYmVuZHMnKTtcbiAgICAgICAgICB9XG4gICAgICAgICAgICBcbiAgICAgICAgICBpZiAobnVtYmVyT2ZTZWxlY3RlZEVkZ2VzID09PSAxKSB7XG4gICAgICAgICAgICBlZGdlVG9IaWdobGlnaHRCZW5kcyA9IGVkZ2U7XG4gICAgICAgICAgICBlZGdlVG9IaWdobGlnaHRCZW5kcy5hZGRDbGFzcygnY3ktZWRnZS1iZW5kLWVkaXRpbmctaGlnaGxpZ2h0LWJlbmRzJyk7XG4gICAgICAgICAgfVxuICAgICAgICAgIGVsc2Uge1xuICAgICAgICAgICAgZWRnZVRvSGlnaGxpZ2h0QmVuZHMgPSB1bmRlZmluZWQ7XG4gICAgICAgICAgfVxuICAgICAgICAgIFxuICAgICAgICAgIGN5LmVuZEJhdGNoKCk7XG4gICAgICAgICAgcmVmcmVzaERyYXdzKCk7XG4gICAgICAgIH0pO1xuICAgICAgICBcbiAgICAgICAgY3kub24oJ3Vuc2VsZWN0JywgJ2VkZ2UnLCBlVW5zZWxlY3QgPSBmdW5jdGlvbiAoKSB7XG4gICAgICAgICAgbnVtYmVyT2ZTZWxlY3RlZEVkZ2VzID0gbnVtYmVyT2ZTZWxlY3RlZEVkZ2VzIC0gMTtcbiAgICAgICAgICAgIFxuICAgICAgICAgIGN5LnN0YXJ0QmF0Y2goKTtcbiAgICAgICAgICAgIFxuICAgICAgICAgIGlmIChlZGdlVG9IaWdobGlnaHRCZW5kcykge1xuICAgICAgICAgICAgZWRnZVRvSGlnaGxpZ2h0QmVuZHMucmVtb3ZlQ2xhc3MoJ2N5LWVkZ2UtYmVuZC1lZGl0aW5nLWhpZ2hsaWdodC1iZW5kcycpO1xuICAgICAgICAgIH1cbiAgICAgICAgICAgIFxuICAgICAgICAgIGlmIChudW1iZXJPZlNlbGVjdGVkRWRnZXMgPT09IDEpIHtcbiAgICAgICAgICAgIHZhciBzZWxlY3RlZEVkZ2VzID0gY3kuZWRnZXMoJzpzZWxlY3RlZCcpO1xuICAgICAgICAgICAgXG4gICAgICAgICAgICAvLyBJZiB1c2VyIHVuc2VsZWN0cyBhbGwgZWRnZXMgYnkgdGFwcGluZyB0byB0aGUgY29yZSBldGMuIHRoZW4gb3VyICdudW1iZXJPZlNlbGVjdGVkRWRnZXMnXG4gICAgICAgICAgICAvLyBtYXkgYmUgbWlzbGVhZGluZy4gVGhlcmVmb3JlIHdlIG5lZWQgdG8gY2hlY2sgaWYgdGhlIG51bWJlciBvZiBlZGdlcyB0byBoaWdobGlnaHQgaXMgcmVhbHkgMSBoZXJlLlxuICAgICAgICAgICAgaWYgKHNlbGVjdGVkRWRnZXMubGVuZ3RoID09PSAxKSB7XG4gICAgICAgICAgICAgIGVkZ2VUb0hpZ2hsaWdodEJlbmRzID0gc2VsZWN0ZWRFZGdlc1swXTtcbiAgICAgICAgICAgICAgZWRnZVRvSGlnaGxpZ2h0QmVuZHMuYWRkQ2xhc3MoJ2N5LWVkZ2UtYmVuZC1lZGl0aW5nLWhpZ2hsaWdodC1iZW5kcycpO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgZWxzZSB7XG4gICAgICAgICAgICAgIGVkZ2VUb0hpZ2hsaWdodEJlbmRzID0gdW5kZWZpbmVkO1xuICAgICAgICAgICAgfVxuICAgICAgICAgIH1cbiAgICAgICAgICBlbHNlIHtcbiAgICAgICAgICAgIGVkZ2VUb0hpZ2hsaWdodEJlbmRzID0gdW5kZWZpbmVkO1xuICAgICAgICAgIH1cbiAgICAgICAgICBcbiAgICAgICAgICBjeS5lbmRCYXRjaCgpO1xuICAgICAgICAgIHJlZnJlc2hEcmF3cygpO1xuICAgICAgICB9KTtcbiAgICAgICAgXG4gICAgICAgIHZhciBtb3ZlZEJlbmRJbmRleDtcbiAgICAgICAgdmFyIG1vdmVkQmVuZEVkZ2U7XG4gICAgICAgIHZhciBtb3ZlQmVuZFBhcmFtO1xuICAgICAgICB2YXIgY3JlYXRlQmVuZE9uRHJhZztcbiAgICAgICAgXG4gICAgICAgIGN5Lm9uKCd0YXBzdGFydCcsICdlZGdlJywgZVRhcFN0YXJ0ID0gZnVuY3Rpb24gKGV2ZW50KSB7XG4gICAgICAgICAgdmFyIGVkZ2UgPSB0aGlzO1xuICAgICAgICAgIFxuICAgICAgICAgIGlmICghZWRnZVRvSGlnaGxpZ2h0QmVuZHMgfHwgZWRnZVRvSGlnaGxpZ2h0QmVuZHMuaWQoKSAhPT0gZWRnZS5pZCgpKSB7XG4gICAgICAgICAgICBjcmVhdGVCZW5kT25EcmFnID0gZmFsc2U7XG4gICAgICAgICAgICByZXR1cm47XG4gICAgICAgICAgfVxuICAgICAgICAgIFxuICAgICAgICAgIG1vdmVkQmVuZEVkZ2UgPSBlZGdlO1xuICAgICAgICAgIFxuICAgICAgICAgIG1vdmVCZW5kUGFyYW0gPSB7XG4gICAgICAgICAgICBlZGdlOiBlZGdlLFxuICAgICAgICAgICAgd2VpZ2h0czogZWRnZS5kYXRhKCdjeWVkZ2ViZW5kZWRpdGluZ1dlaWdodHMnKSA/IFtdLmNvbmNhdChlZGdlLmRhdGEoJ2N5ZWRnZWJlbmRlZGl0aW5nV2VpZ2h0cycpKSA6IFtdLFxuICAgICAgICAgICAgZGlzdGFuY2VzOiBlZGdlLmRhdGEoJ2N5ZWRnZWJlbmRlZGl0aW5nRGlzdGFuY2VzJykgPyBbXS5jb25jYXQoZWRnZS5kYXRhKCdjeWVkZ2ViZW5kZWRpdGluZ0Rpc3RhbmNlcycpKSA6IFtdXG4gICAgICAgICAgfTtcbiAgICAgICAgICBcbiAgICAgICAgICB2YXIgY3lQb3MgPSBldmVudC5wb3NpdGlvbiB8fCBldmVudC5jeVBvc2l0aW9uO1xuICAgICAgICAgIHZhciBjeVBvc1ggPSBjeVBvcy54O1xuICAgICAgICAgIHZhciBjeVBvc1kgPSBjeVBvcy55O1xuXG4gICAgICAgICAgdmFyIGluZGV4ID0gZ2V0Q29udGFpbmluZ0JlbmRTaGFwZUluZGV4KGN5UG9zWCwgY3lQb3NZLCBlZGdlKTtcbiAgICAgICAgICBpZiAoaW5kZXggIT0gLTEpIHtcbiAgICAgICAgICAgIG1vdmVkQmVuZEluZGV4ID0gaW5kZXg7XG4vLyAgICAgICAgICAgIG1vdmVkQmVuZEVkZ2UgPSBlZGdlO1xuICAgICAgICAgICAgZGlzYWJsZUdlc3R1cmVzKCk7XG4gICAgICAgICAgfVxuICAgICAgICAgIGVsc2Uge1xuICAgICAgICAgICAgY3JlYXRlQmVuZE9uRHJhZyA9IHRydWU7XG4gICAgICAgICAgfVxuICAgICAgICB9KTtcbiAgICAgICAgXG4gICAgICAgIGN5Lm9uKCd0YXBkcmFnJywgZVRhcERyYWcgPSBmdW5jdGlvbiAoZXZlbnQpIHtcbiAgICAgICAgICB2YXIgZWRnZSA9IG1vdmVkQmVuZEVkZ2U7XG4gICAgICAgICAgaWYobW92ZWRCZW5kRWRnZSAhPT0gdW5kZWZpbmVkICYmIGJlbmRQb2ludFV0aWxpdGllcy5pc0lnbm9yZWRFZGdlKGVkZ2UpICkge1xuICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICAgIH1cbiAgICAgICAgICBcbiAgICAgICAgICBpZihjcmVhdGVCZW5kT25EcmFnKSB7XG4gICAgICAgICAgICB2YXIgY3lQb3MgPSBldmVudC5wb3NpdGlvbiB8fCBldmVudC5jeVBvc2l0aW9uO1xuICAgICAgICAgICAgYmVuZFBvaW50VXRpbGl0aWVzLmFkZEJlbmRQb2ludChlZGdlLCBjeVBvcyk7XG4gICAgICAgICAgICBtb3ZlZEJlbmRJbmRleCA9IGdldENvbnRhaW5pbmdCZW5kU2hhcGVJbmRleChjeVBvcy54LCBjeVBvcy55LCBlZGdlKTtcbiAgICAgICAgICAgIG1vdmVkQmVuZEVkZ2UgPSBlZGdlO1xuICAgICAgICAgICAgY3JlYXRlQmVuZE9uRHJhZyA9IHVuZGVmaW5lZDtcbiAgICAgICAgICAgIGRpc2FibGVHZXN0dXJlcygpO1xuICAgICAgICAgIH1cbiAgICAgICAgICBcbiAgICAgICAgICBpZiAobW92ZWRCZW5kRWRnZSA9PT0gdW5kZWZpbmVkIHx8IG1vdmVkQmVuZEluZGV4ID09PSB1bmRlZmluZWQpIHtcbiAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgICB9XG5cbiAgICAgICAgICB2YXIgd2VpZ2h0cyA9IGVkZ2UuZGF0YSgnY3llZGdlYmVuZGVkaXRpbmdXZWlnaHRzJyk7XG4gICAgICAgICAgdmFyIGRpc3RhbmNlcyA9IGVkZ2UuZGF0YSgnY3llZGdlYmVuZGVkaXRpbmdEaXN0YW5jZXMnKTtcblxuICAgICAgICAgIHZhciByZWxhdGl2ZUJlbmRQb3NpdGlvbiA9IGJlbmRQb2ludFV0aWxpdGllcy5jb252ZXJ0VG9SZWxhdGl2ZUJlbmRQb3NpdGlvbihlZGdlLCBldmVudC5wb3NpdGlvbiB8fCBldmVudC5jeVBvc2l0aW9uKTtcbiAgICAgICAgICB3ZWlnaHRzW21vdmVkQmVuZEluZGV4XSA9IHJlbGF0aXZlQmVuZFBvc2l0aW9uLndlaWdodDtcbiAgICAgICAgICBkaXN0YW5jZXNbbW92ZWRCZW5kSW5kZXhdID0gcmVsYXRpdmVCZW5kUG9zaXRpb24uZGlzdGFuY2U7XG5cbiAgICAgICAgICBlZGdlLmRhdGEoJ2N5ZWRnZWJlbmRlZGl0aW5nV2VpZ2h0cycsIHdlaWdodHMpO1xuICAgICAgICAgIGVkZ2UuZGF0YSgnY3llZGdlYmVuZGVkaXRpbmdEaXN0YW5jZXMnLCBkaXN0YW5jZXMpO1xuICAgICAgICAgIFxuICAgICAgICAgIHJlZnJlc2hEcmF3cygpO1xuICAgICAgICB9KTtcbiAgICAgICAgXG4gICAgICAgIGN5Lm9uKCd0YXBlbmQnLCBlVGFwRW5kID0gZnVuY3Rpb24gKGV2ZW50KSB7XG4gICAgICAgICAgdmFyIGVkZ2UgPSBtb3ZlZEJlbmRFZGdlO1xuICAgICAgICAgIFxuICAgICAgICAgIGlmKCBlZGdlICE9PSB1bmRlZmluZWQgKSB7XG4gICAgICAgICAgICBpZiggbW92ZWRCZW5kSW5kZXggIT0gdW5kZWZpbmVkICkge1xuICAgICAgICAgICAgICB2YXIgc3RhcnRYID0gZWRnZS5zb3VyY2UoKS5wb3NpdGlvbigneCcpO1xuICAgICAgICAgICAgICB2YXIgc3RhcnRZID0gZWRnZS5zb3VyY2UoKS5wb3NpdGlvbigneScpO1xuICAgICAgICAgICAgICB2YXIgZW5kWCA9IGVkZ2UudGFyZ2V0KCkucG9zaXRpb24oJ3gnKTtcbiAgICAgICAgICAgICAgdmFyIGVuZFkgPSBlZGdlLnRhcmdldCgpLnBvc2l0aW9uKCd5Jyk7XG4gICAgICAgICAgICAgIFxuICAgICAgICAgICAgICB2YXIgc2VnUHRzID0gYmVuZFBvaW50VXRpbGl0aWVzLmdldFNlZ21lbnRQb2ludHMoZWRnZSk7XG4gICAgICAgICAgICAgIHZhciBhbGxQdHMgPSBbc3RhcnRYLCBzdGFydFldLmNvbmNhdChzZWdQdHMpLmNvbmNhdChbZW5kWCwgZW5kWV0pO1xuICAgICAgICAgICAgICBcbiAgICAgICAgICAgICAgdmFyIHBvaW50SW5kZXggPSBtb3ZlZEJlbmRJbmRleCArIDE7XG4gICAgICAgICAgICAgIHZhciBwcmVJbmRleCA9IHBvaW50SW5kZXggLSAxO1xuICAgICAgICAgICAgICB2YXIgcG9zSW5kZXggPSBwb2ludEluZGV4ICsgMTtcbiAgICAgICAgICAgICAgXG4gICAgICAgICAgICAgIHZhciBwb2ludCA9IHtcbiAgICAgICAgICAgICAgICB4OiBhbGxQdHNbMiAqIHBvaW50SW5kZXhdLFxuICAgICAgICAgICAgICAgIHk6IGFsbFB0c1syICogcG9pbnRJbmRleCArIDFdXG4gICAgICAgICAgICAgIH07XG4gICAgICAgICAgICAgIFxuICAgICAgICAgICAgICB2YXIgcHJlUG9pbnQgPSB7XG4gICAgICAgICAgICAgICAgeDogYWxsUHRzWzIgKiBwcmVJbmRleF0sXG4gICAgICAgICAgICAgICAgeTogYWxsUHRzWzIgKiBwcmVJbmRleCArIDFdXG4gICAgICAgICAgICAgIH07XG4gICAgICAgICAgICAgIFxuICAgICAgICAgICAgICB2YXIgcG9zUG9pbnQgPSB7XG4gICAgICAgICAgICAgICAgeDogYWxsUHRzWzIgKiBwb3NJbmRleF0sXG4gICAgICAgICAgICAgICAgeTogYWxsUHRzWzIgKiBwb3NJbmRleCArIDFdXG4gICAgICAgICAgICAgIH07XG4gICAgICAgICAgICAgIFxuICAgICAgICAgICAgICB2YXIgbmVhclRvTGluZTtcbiAgICAgICAgICAgICAgXG4gICAgICAgICAgICAgIGlmKCAoIHBvaW50LnggPT09IHByZVBvaW50LnggJiYgcG9pbnQueSA9PT0gcHJlUG9pbnQueSApIHx8ICggcG9pbnQueCA9PT0gcHJlUG9pbnQueCAmJiBwb2ludC55ID09PSBwcmVQb2ludC55ICkgKSB7XG4gICAgICAgICAgICAgICAgbmVhclRvTGluZSA9IHRydWU7XG4gICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgZWxzZSB7XG4gICAgICAgICAgICAgICAgdmFyIG0xID0gKCBwcmVQb2ludC55IC0gcG9zUG9pbnQueSApIC8gKCBwcmVQb2ludC54IC0gcG9zUG9pbnQueCApO1xuICAgICAgICAgICAgICAgIHZhciBtMiA9IC0xIC8gbTE7XG5cbiAgICAgICAgICAgICAgICB2YXIgc3JjVGd0UG9pbnRzQW5kVGFuZ2VudHMgPSB7XG4gICAgICAgICAgICAgICAgICBzcmNQb2ludDogcHJlUG9pbnQsXG4gICAgICAgICAgICAgICAgICB0Z3RQb2ludDogcG9zUG9pbnQsXG4gICAgICAgICAgICAgICAgICBtMTogbTEsXG4gICAgICAgICAgICAgICAgICBtMjogbTJcbiAgICAgICAgICAgICAgICB9O1xuXG4gICAgICAgICAgICAgICAgLy9nZXQgdGhlIGludGVyc2VjdGlvbiBvZiB0aGUgY3VycmVudCBzZWdtZW50IHdpdGggdGhlIG5ldyBiZW5kIHBvaW50XG4gICAgICAgICAgICAgICAgdmFyIGN1cnJlbnRJbnRlcnNlY3Rpb24gPSBiZW5kUG9pbnRVdGlsaXRpZXMuZ2V0SW50ZXJzZWN0aW9uKGVkZ2UsIHBvaW50LCBzcmNUZ3RQb2ludHNBbmRUYW5nZW50cyk7XG4gICAgICAgICAgICAgICAgdmFyIGRpc3QgPSBNYXRoLnNxcnQoIE1hdGgucG93KCAocG9pbnQueCAtIGN1cnJlbnRJbnRlcnNlY3Rpb24ueCksIDIgKSBcbiAgICAgICAgICAgICAgICAgICAgICAgICsgTWF0aC5wb3coIChwb2ludC55IC0gY3VycmVudEludGVyc2VjdGlvbi55KSwgMiApKTtcbiAgICAgICAgICAgICAgICBcbi8vICAgICAgICAgICAgICAgIHZhciBsZW5ndGggPSBNYXRoLnNxcnQoIE1hdGgucG93KCAocG9zUG9pbnQueCAtIHByZVBvaW50LngpLCAyICkgXG4vLyAgICAgICAgICAgICAgICAgICAgICAgICsgTWF0aC5wb3coIChwb3NQb2ludC55IC0gcHJlUG9pbnQueSksIDIgKSk7XG4gICAgICAgICAgICAgICAgXG4gICAgICAgICAgICAgICAgaWYoIGRpc3QgIDwgOCApIHtcbiAgICAgICAgICAgICAgICAgIG5lYXJUb0xpbmUgPSB0cnVlO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICBcbiAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICBcbiAgICAgICAgICAgICAgaWYoIG5lYXJUb0xpbmUgKVxuICAgICAgICAgICAgICB7XG4gICAgICAgICAgICAgICAgYmVuZFBvaW50VXRpbGl0aWVzLnJlbW92ZUJlbmRQb2ludChlZGdlLCBtb3ZlZEJlbmRJbmRleCk7XG4gICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgXG4gICAgICAgICAgICB9XG4gICAgICAgICAgfVxuICAgICAgICAgIFxuICAgICAgICAgIGlmIChlZGdlICE9PSB1bmRlZmluZWQgJiYgbW92ZUJlbmRQYXJhbSAhPT0gdW5kZWZpbmVkICYmIGVkZ2UuZGF0YSgnY3llZGdlYmVuZGVkaXRpbmdXZWlnaHRzJylcbiAgICAgICAgICAgICAgICAgICYmIGVkZ2UuZGF0YSgnY3llZGdlYmVuZGVkaXRpbmdXZWlnaHRzJykudG9TdHJpbmcoKSAhPSBtb3ZlQmVuZFBhcmFtLndlaWdodHMudG9TdHJpbmcoKSkge1xuICAgICAgICAgICAgXG4gICAgICAgICAgICBpZihvcHRpb25zKCkudW5kb2FibGUpIHtcbiAgICAgICAgICAgICAgY3kudW5kb1JlZG8oKS5kbygnY2hhbmdlQmVuZFBvaW50cycsIG1vdmVCZW5kUGFyYW0pO1xuICAgICAgICAgICAgfVxuICAgICAgICAgIH1cblxuICAgICAgICAgIG1vdmVkQmVuZEluZGV4ID0gdW5kZWZpbmVkO1xuICAgICAgICAgIG1vdmVkQmVuZEVkZ2UgPSB1bmRlZmluZWQ7XG4gICAgICAgICAgbW92ZUJlbmRQYXJhbSA9IHVuZGVmaW5lZDtcbiAgICAgICAgICBjcmVhdGVCZW5kT25EcmFnID0gdW5kZWZpbmVkO1xuXG4gICAgICAgICAgcmVzZXRHZXN0dXJlcygpO1xuICAgICAgICAgIHJlZnJlc2hEcmF3cygpO1xuICAgICAgICB9KTtcblxuICAgICAgICAvL1ZhcmlhYmxlcyB1c2VkIGZvciBzdGFydGluZyBhbmQgZW5kaW5nIHRoZSBtb3ZlbWVudCBvZiBiZW5kIHBvaW50cyB3aXRoIGFycm93c1xuICAgICAgICB2YXIgbW92ZXBhcmFtO1xuICAgICAgICB2YXIgZmlyc3RCZW5kUG9pbnQ7XG4gICAgICAgIHZhciBlZGdlQ29udGFpbmluZ0ZpcnN0QmVuZFBvaW50O1xuICAgICAgICB2YXIgZmlyc3RCZW5kUG9pbnRGb3VuZDtcbiAgICAgICAgY3kub24oXCJlZGdlYmVuZGVkaXRpbmcubW92ZXN0YXJ0XCIsIGZ1bmN0aW9uIChlLCBlZGdlcykge1xuICAgICAgICAgICAgZmlyc3RCZW5kUG9pbnRGb3VuZCA9IGZhbHNlO1xuICAgICAgICAgICAgaWYgKGVkZ2VzWzBdICE9IHVuZGVmaW5lZClcbiAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgICBlZGdlcy5mb3JFYWNoKGZ1bmN0aW9uKCBlZGdlICl7XG4gICAgICAgICAgICAgICAgICBpZiAoYmVuZFBvaW50VXRpbGl0aWVzLmdldFNlZ21lbnRQb2ludHMoZWRnZSkgIT0gdW5kZWZpbmVkICYmICFmaXJzdEJlbmRQb2ludEZvdW5kKVxuICAgICAgICAgICAgICAgICAge1xuICAgICAgICAgICAgICAgICAgICAgIGZpcnN0QmVuZFBvaW50ID0geyB4OiBiZW5kUG9pbnRVdGlsaXRpZXMuZ2V0U2VnbWVudFBvaW50cyhlZGdlKVswXSwgeTogYmVuZFBvaW50VXRpbGl0aWVzLmdldFNlZ21lbnRQb2ludHMoZWRnZSlbMV19O1xuICAgICAgICAgICAgICAgICAgICAgIG1vdmVwYXJhbSA9IHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgZmlyc3RUaW1lOiB0cnVlLFxuICAgICAgICAgICAgICAgICAgICAgICAgICBmaXJzdEJlbmRQb2ludFBvc2l0aW9uOiB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICB4OiBmaXJzdEJlbmRQb2ludC54LFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgeTogZmlyc3RCZW5kUG9pbnQueVxuICAgICAgICAgICAgICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgICAgICAgICAgICAgICBlZGdlczogZWRnZXNcbiAgICAgICAgICAgICAgICAgICAgICB9O1xuICAgICAgICAgICAgICAgICAgICAgIGVkZ2VDb250YWluaW5nRmlyc3RCZW5kUG9pbnQgPSBlZGdlO1xuICAgICAgICAgICAgICAgICAgICAgIGZpcnN0QmVuZFBvaW50Rm91bmQgPSB0cnVlO1xuICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgfVxuICAgICAgICB9KTtcblxuICAgICAgICBjeS5vbihcImVkZ2ViZW5kZWRpdGluZy5tb3ZlZW5kXCIsIGZ1bmN0aW9uIChlLCBlZGdlcykge1xuICAgICAgICAgICAgaWYgKG1vdmVwYXJhbSAhPSB1bmRlZmluZWQpXG4gICAgICAgICAgICB7XG4gICAgICAgICAgICAgICAgdmFyIGluaXRpYWxQb3MgPSBtb3ZlcGFyYW0uZmlyc3RCZW5kUG9pbnRQb3NpdGlvbjtcbiAgICAgICAgICAgICAgICB2YXIgbW92ZWRGaXJzdEJlbmRQb2ludCA9IHtcbiAgICAgICAgICAgICAgICAgICAgeDogYmVuZFBvaW50VXRpbGl0aWVzLmdldFNlZ21lbnRQb2ludHMoZWRnZUNvbnRhaW5pbmdGaXJzdEJlbmRQb2ludClbMF0sXG4gICAgICAgICAgICAgICAgICAgIHk6IGJlbmRQb2ludFV0aWxpdGllcy5nZXRTZWdtZW50UG9pbnRzKGVkZ2VDb250YWluaW5nRmlyc3RCZW5kUG9pbnQpWzFdXG4gICAgICAgICAgICAgICAgfTtcblxuXG4gICAgICAgICAgICAgICAgbW92ZXBhcmFtLnBvc2l0aW9uRGlmZiA9IHtcbiAgICAgICAgICAgICAgICAgICAgeDogLW1vdmVkRmlyc3RCZW5kUG9pbnQueCArIGluaXRpYWxQb3MueCxcbiAgICAgICAgICAgICAgICAgICAgeTogLW1vdmVkRmlyc3RCZW5kUG9pbnQueSArIGluaXRpYWxQb3MueVxuICAgICAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgICAgIGRlbGV0ZSBtb3ZlcGFyYW0uZmlyc3RCZW5kUG9pbnRQb3NpdGlvbjtcblxuICAgICAgICAgICAgICAgIGlmKG9wdGlvbnMoKS51bmRvYWJsZSkge1xuICAgICAgICAgICAgICAgICAgICBjeS51bmRvUmVkbygpLmRvKFwibW92ZUJlbmRQb2ludHNcIiwgbW92ZXBhcmFtKTtcbiAgICAgICAgICAgICAgICB9XG5cbiAgICAgICAgICAgICAgICBtb3ZlcGFyYW0gPSB1bmRlZmluZWQ7XG4gICAgICAgICAgICB9XG4gICAgICAgIH0pO1xuXG4gICAgICAgIGN5Lm9uKCdjeHR0YXAnLCAnZWRnZScsIGVDeHRUYXAgPSBmdW5jdGlvbiAoZXZlbnQpIHtcbiAgICAgICAgICB2YXIgZWRnZSA9IHRoaXM7XG4gICAgICAgICAgXG4gICAgICAgICAgdmFyIG1lbnVzID0gY3kuY29udGV4dE1lbnVzKCdnZXQnKTsgLy8gZ2V0IGNvbnRleHQgbWVudXMgaW5zdGFuY2VcbiAgICAgICAgICBcbiAgICAgICAgICBpZighZWRnZVRvSGlnaGxpZ2h0QmVuZHMgfHwgZWRnZVRvSGlnaGxpZ2h0QmVuZHMuaWQoKSAhPSBlZGdlLmlkKCkgfHwgYmVuZFBvaW50VXRpbGl0aWVzLmlzSWdub3JlZEVkZ2UoZWRnZSkpIHtcbiAgICAgICAgICAgIG1lbnVzLmhpZGVNZW51SXRlbShyZW1vdmVCZW5kUG9pbnRDeHRNZW51SWQpO1xuICAgICAgICAgICAgbWVudXMuaGlkZU1lbnVJdGVtKGFkZEJlbmRQb2ludEN4dE1lbnVJZCk7XG4gICAgICAgICAgICByZXR1cm47XG4gICAgICAgICAgfVxuXG4gICAgICAgICAgdmFyIGN5UG9zID0gZXZlbnQucG9zaXRpb24gfHwgZXZlbnQuY3lQb3NpdGlvbjtcbiAgICAgICAgICB2YXIgc2VsZWN0ZWRCZW5kSW5kZXggPSBnZXRDb250YWluaW5nQmVuZFNoYXBlSW5kZXgoY3lQb3MueCwgY3lQb3MueSwgZWRnZSk7XG4gICAgICAgICAgaWYgKHNlbGVjdGVkQmVuZEluZGV4ID09IC0xKSB7XG4gICAgICAgICAgICBtZW51cy5oaWRlTWVudUl0ZW0ocmVtb3ZlQmVuZFBvaW50Q3h0TWVudUlkKTtcbiAgICAgICAgICAgIG1lbnVzLnNob3dNZW51SXRlbShhZGRCZW5kUG9pbnRDeHRNZW51SWQpO1xuICAgICAgICAgICAgYmVuZFBvaW50VXRpbGl0aWVzLmN1cnJlbnRDdHhQb3MgPSBjeVBvcztcbiAgICAgICAgICB9XG4gICAgICAgICAgZWxzZSB7XG4gICAgICAgICAgICBtZW51cy5oaWRlTWVudUl0ZW0oYWRkQmVuZFBvaW50Q3h0TWVudUlkKTtcbiAgICAgICAgICAgIG1lbnVzLnNob3dNZW51SXRlbShyZW1vdmVCZW5kUG9pbnRDeHRNZW51SWQpO1xuICAgICAgICAgICAgYmVuZFBvaW50VXRpbGl0aWVzLmN1cnJlbnRCZW5kSW5kZXggPSBzZWxlY3RlZEJlbmRJbmRleDtcbiAgICAgICAgICB9XG5cbiAgICAgICAgICBiZW5kUG9pbnRVdGlsaXRpZXMuY3VycmVudEN0eEVkZ2UgPSBlZGdlO1xuICAgICAgICB9KTtcbiAgICAgICAgXG4gICAgICAgIGN5Lm9uKCdjeWVkZ2ViZW5kZWRpdGluZy5jaGFuZ2VCZW5kUG9pbnRzJywgJ2VkZ2UnLCBmdW5jdGlvbigpIHtcbiAgICAgICAgICB2YXIgZWRnZSA9IHRoaXM7XG4gICAgICAgICAgY3kuc3RhcnRCYXRjaCgpO1xuICAgICAgICAgIGN5LmVkZ2VzKCkudW5zZWxlY3QoKTtcbiAgICAgICAgICBlZGdlLnNlbGVjdCgpO1xuICAgICAgICAgIGN5LnRyaWdnZXIoJ2JlbmRQb2ludE1vdmVtZW50Jyk7XG4gICAgICAgICAgY3kuZW5kQmF0Y2goKTtcbiAgICAgICAgICByZWZyZXNoRHJhd3MoKTtcbiAgICAgICAgfSk7XG4gICAgICB9XG5cbiAgICAgIHZhciBzZWxlY3RlZEVkZ2VzO1xuICAgICAgdmFyIGJlbmRQb2ludHNNb3ZpbmcgPSBmYWxzZTtcblxuICAgICAgZnVuY3Rpb24ga2V5RG93bihlKSB7XG5cbiAgICAgICAgICB2YXIgc2hvdWxkTW92ZSA9IHR5cGVvZiBvcHRpb25zKCkubW92ZVNlbGVjdGVkQmVuZFBvaW50c09uS2V5RXZlbnRzID09PSAnZnVuY3Rpb24nXG4gICAgICAgICAgICAgID8gb3B0aW9ucygpLm1vdmVTZWxlY3RlZEJlbmRQb2ludHNPbktleUV2ZW50cygpIDogb3B0aW9ucygpLm1vdmVTZWxlY3RlZEJlbmRQb2ludHNPbktleUV2ZW50cztcblxuICAgICAgICAgIGlmICghc2hvdWxkTW92ZSkge1xuICAgICAgICAgICAgICByZXR1cm47XG4gICAgICAgICAgfVxuXG4gICAgICAgICAgLy9DaGVja3MgaWYgdGhlIHRhZ25hbWUgaXMgdGV4dGFyZWEgb3IgaW5wdXRcbiAgICAgICAgICB2YXIgdG4gPSBkb2N1bWVudC5hY3RpdmVFbGVtZW50LnRhZ05hbWU7XG4gICAgICAgICAgaWYgKHRuICE9IFwiVEVYVEFSRUFcIiAmJiB0biAhPSBcIklOUFVUXCIpXG4gICAgICAgICAge1xuICAgICAgICAgICAgICBzd2l0Y2goZS5rZXlDb2RlKXtcbiAgICAgICAgICAgICAgICAgIGNhc2UgMzc6IGNhc2UgMzk6IGNhc2UgMzg6ICBjYXNlIDQwOiAvLyBBcnJvdyBrZXlzXG4gICAgICAgICAgICAgICAgICBjYXNlIDMyOiBlLnByZXZlbnREZWZhdWx0KCk7IGJyZWFrOyAvLyBTcGFjZVxuICAgICAgICAgICAgICAgICAgZGVmYXVsdDogYnJlYWs7IC8vIGRvIG5vdCBibG9jayBvdGhlciBrZXlzXG4gICAgICAgICAgICAgIH1cblxuXG4gICAgICAgICAgICAgIGlmIChlLmtleUNvZGUgPCAnMzcnIHx8IGUua2V5Q29kZSA+ICc0MCcpIHtcbiAgICAgICAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICAgIC8vQ2hlY2tzIGlmIG9ubHkgZWRnZXMgYXJlIHNlbGVjdGVkIChub3QgYW55IG5vZGUpIGFuZCBpZiBvbmx5IDEgZWRnZSBpcyBzZWxlY3RlZFxuICAgICAgICAgICAgICAvL0lmIHRoZSBzZWNvbmQgY2hlY2tpbmcgaXMgcmVtb3ZlZCB0aGUgYmVuZCBwb2ludHMgb2YgbXVsdGlwbGUgZWRnZXMgd291bGQgbW92ZVxuICAgICAgICAgICAgICBpZiAoY3kuZWRnZXMoXCI6c2VsZWN0ZWRcIikubGVuZ3RoICE9IGN5LmVsZW1lbnRzKFwiOnNlbGVjdGVkXCIpLmxlbmd0aCB8fCBjeS5lZGdlcyhcIjpzZWxlY3RlZFwiKS5sZW5ndGggIT0gMSlcbiAgICAgICAgICAgICAge1xuICAgICAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICAgIGlmICghYmVuZFBvaW50c01vdmluZylcbiAgICAgICAgICAgICAge1xuICAgICAgICAgICAgICAgICAgc2VsZWN0ZWRFZGdlcyA9IGN5LmVkZ2VzKCc6c2VsZWN0ZWQnKTtcbiAgICAgICAgICAgICAgICAgIGN5LnRyaWdnZXIoXCJlZGdlYmVuZGVkaXRpbmcubW92ZXN0YXJ0XCIsIFtzZWxlY3RlZEVkZ2VzXSk7XG4gICAgICAgICAgICAgICAgICBiZW5kUG9pbnRzTW92aW5nID0gdHJ1ZTtcbiAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICBpZiAoZS5hbHRLZXkgJiYgZS53aGljaCA9PSAnMzgnKSB7XG4gICAgICAgICAgICAgICAgICAvLyB1cCBhcnJvdyBhbmQgYWx0XG4gICAgICAgICAgICAgICAgICBtb3ZlQmVuZFBvaW50cyAoe3g6MCwgeTotMX0sc2VsZWN0ZWRFZGdlcyk7XG4gICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgZWxzZSBpZiAoZS5hbHRLZXkgJiYgZS53aGljaCA9PSAnNDAnKSB7XG4gICAgICAgICAgICAgICAgICAvLyBkb3duIGFycm93IGFuZCBhbHRcbiAgICAgICAgICAgICAgICAgIG1vdmVCZW5kUG9pbnRzICh7eDowLCB5OjF9LHNlbGVjdGVkRWRnZXMpO1xuICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgIGVsc2UgaWYgKGUuYWx0S2V5ICYmIGUud2hpY2ggPT0gJzM3Jykge1xuICAgICAgICAgICAgICAgICAgLy8gbGVmdCBhcnJvdyBhbmQgYWx0XG4gICAgICAgICAgICAgICAgICBtb3ZlQmVuZFBvaW50cyAoe3g6LTEsIHk6MH0sc2VsZWN0ZWRFZGdlcyk7XG4gICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgZWxzZSBpZiAoZS5hbHRLZXkgJiYgZS53aGljaCA9PSAnMzknKSB7XG4gICAgICAgICAgICAgICAgICAvLyByaWdodCBhcnJvdyBhbmQgYWx0XG4gICAgICAgICAgICAgICAgICBtb3ZlQmVuZFBvaW50cyAoe3g6MSwgeTowfSxzZWxlY3RlZEVkZ2VzKTtcbiAgICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICAgIGVsc2UgaWYgKGUuc2hpZnRLZXkgJiYgZS53aGljaCA9PSAnMzgnKSB7XG4gICAgICAgICAgICAgICAgICAvLyB1cCBhcnJvdyBhbmQgc2hpZnRcbiAgICAgICAgICAgICAgICAgIG1vdmVCZW5kUG9pbnRzICh7eDowLCB5Oi0xMH0sc2VsZWN0ZWRFZGdlcyk7XG4gICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgZWxzZSBpZiAoZS5zaGlmdEtleSAmJiBlLndoaWNoID09ICc0MCcpIHtcbiAgICAgICAgICAgICAgICAgIC8vIGRvd24gYXJyb3cgYW5kIHNoaWZ0XG4gICAgICAgICAgICAgICAgICBtb3ZlQmVuZFBvaW50cyAoe3g6MCwgeToxMH0sc2VsZWN0ZWRFZGdlcyk7XG4gICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgZWxzZSBpZiAoZS5zaGlmdEtleSAmJiBlLndoaWNoID09ICczNycpIHtcbiAgICAgICAgICAgICAgICAgIC8vIGxlZnQgYXJyb3cgYW5kIHNoaWZ0XG4gICAgICAgICAgICAgICAgICBtb3ZlQmVuZFBvaW50cyAoe3g6LTEwLCB5OjB9LHNlbGVjdGVkRWRnZXMpO1xuXG4gICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgZWxzZSBpZiAoZS5zaGlmdEtleSAmJiBlLndoaWNoID09ICczOScgKSB7XG4gICAgICAgICAgICAgICAgICAvLyByaWdodCBhcnJvdyBhbmQgc2hpZnRcbiAgICAgICAgICAgICAgICAgIG1vdmVCZW5kUG9pbnRzICh7eDoxMCwgeTowfSxzZWxlY3RlZEVkZ2VzKTtcbiAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICBlbHNlIGlmIChlLmtleUNvZGUgPT0gJzM4Jykge1xuICAgICAgICAgICAgICAgICAgLy8gdXAgYXJyb3dcbiAgICAgICAgICAgICAgICAgIG1vdmVCZW5kUG9pbnRzKHt4OiAwLCB5OiAtM30sIHNlbGVjdGVkRWRnZXMpO1xuICAgICAgICAgICAgICB9XG5cbiAgICAgICAgICAgICAgZWxzZSBpZiAoZS5rZXlDb2RlID09ICc0MCcpIHtcbiAgICAgICAgICAgICAgICAgIC8vIGRvd24gYXJyb3dcbiAgICAgICAgICAgICAgICAgIG1vdmVCZW5kUG9pbnRzICh7eDowLCB5OjN9LHNlbGVjdGVkRWRnZXMpO1xuICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgIGVsc2UgaWYgKGUua2V5Q29kZSA9PSAnMzcnKSB7XG4gICAgICAgICAgICAgICAgICAvLyBsZWZ0IGFycm93XG4gICAgICAgICAgICAgICAgICBtb3ZlQmVuZFBvaW50cyAoe3g6LTMsIHk6MH0sc2VsZWN0ZWRFZGdlcyk7XG4gICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgZWxzZSBpZiAoZS5rZXlDb2RlID09ICczOScpIHtcbiAgICAgICAgICAgICAgICAgIC8vcmlnaHQgYXJyb3dcbiAgICAgICAgICAgICAgICAgIG1vdmVCZW5kUG9pbnRzICh7eDozLCB5OjB9LHNlbGVjdGVkRWRnZXMpO1xuICAgICAgICAgICAgICB9XG4gICAgICAgICAgfVxuICAgICAgfVxuICAgICAgZnVuY3Rpb24ga2V5VXAoZSkge1xuXG4gICAgICAgICAgaWYgKGUua2V5Q29kZSA8ICczNycgfHwgZS5rZXlDb2RlID4gJzQwJykge1xuICAgICAgICAgICAgICByZXR1cm47XG4gICAgICAgICAgfVxuXG4gICAgICAgICAgdmFyIHNob3VsZE1vdmUgPSB0eXBlb2Ygb3B0aW9ucygpLm1vdmVTZWxlY3RlZEJlbmRQb2ludHNPbktleUV2ZW50cyA9PT0gJ2Z1bmN0aW9uJ1xuICAgICAgICAgICAgICA/IG9wdGlvbnMoKS5tb3ZlU2VsZWN0ZWRCZW5kUG9pbnRzT25LZXlFdmVudHMoKSA6IG9wdGlvbnMoKS5tb3ZlU2VsZWN0ZWRCZW5kUG9pbnRzT25LZXlFdmVudHM7XG5cbiAgICAgICAgICBpZiAoIXNob3VsZE1vdmUpIHtcbiAgICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICAgIH1cblxuICAgICAgICAgIGN5LnRyaWdnZXIoXCJlZGdlYmVuZGVkaXRpbmcubW92ZWVuZFwiLCBbc2VsZWN0ZWRFZGdlc10pO1xuICAgICAgICAgIHNlbGVjdGVkRWRnZXMgPSB1bmRlZmluZWQ7XG4gICAgICAgICAgYmVuZFBvaW50c01vdmluZyA9IGZhbHNlO1xuXG4gICAgICB9XG4gICAgICBkb2N1bWVudC5hZGRFdmVudExpc3RlbmVyKFwia2V5ZG93blwiLGtleURvd24sIHRydWUpO1xuICAgICAgZG9jdW1lbnQuYWRkRXZlbnRMaXN0ZW5lcihcImtleXVwXCIsa2V5VXAsIHRydWUpO1xuXG4gICAgICAkY29udGFpbmVyLmRhdGEoJ2N5ZWRnZWJlbmRlZGl0aW5nJywgZGF0YSk7XG4gICAgfSxcbiAgICB1bmJpbmQ6IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgY3kub2ZmKCdwb3NpdGlvbicsICdub2RlJywgZVBvc2l0aW9uKVxuICAgICAgICAgIC5vZmYoJ3JlbW92ZScsICdub2RlJywgZVJlbW92ZSlcbiAgICAgICAgICAub2ZmKCdhZGQnLCAnbm9kZScsIGVBZGQpXG4gICAgICAgICAgLm9mZignc3R5bGUnLCAnZWRnZS5lZGdlYmVuZGVkaXRpbmctaGFzYmVuZHBvaW50czpzZWxlY3RlZCcsIGVTdHlsZSlcbiAgICAgICAgICAub2ZmKCdzZWxlY3QnLCAnZWRnZScsIGVTZWxlY3QpXG4gICAgICAgICAgLm9mZigndW5zZWxlY3QnLCAnZWRnZScsIGVVbnNlbGVjdClcbiAgICAgICAgICAub2ZmKCd0YXBzdGFydCcsICdlZGdlJywgZVRhcFN0YXJ0KVxuICAgICAgICAgIC5vZmYoJ3RhcGRyYWcnLCBlVGFwRHJhZylcbiAgICAgICAgICAub2ZmKCd0YXBlbmQnLCBlVGFwRW5kKVxuICAgICAgICAgIC5vZmYoJ2N4dHRhcCcsIGVDeHRUYXApO1xuXG4gICAgICAgIGN5LnVuYmluZChcInpvb20gcGFuXCIsIGVab29tKTtcbiAgICB9XG4gIH07XG5cbiAgaWYgKGZ1bmN0aW9uc1tmbl0pIHtcbiAgICByZXR1cm4gZnVuY3Rpb25zW2ZuXS5hcHBseSgkKGN5LmNvbnRhaW5lcigpKSwgQXJyYXkucHJvdG90eXBlLnNsaWNlLmNhbGwoYXJndW1lbnRzLCAxKSk7XG4gIH0gZWxzZSBpZiAodHlwZW9mIGZuID09ICdvYmplY3QnIHx8ICFmbikge1xuICAgIHJldHVybiBmdW5jdGlvbnMuaW5pdC5hcHBseSgkKGN5LmNvbnRhaW5lcigpKSwgYXJndW1lbnRzKTtcbiAgfSBlbHNlIHtcbiAgICAkLmVycm9yKCdObyBzdWNoIGZ1bmN0aW9uIGAnICsgZm4gKyAnYCBmb3IgY3l0b3NjYXBlLmpzLWVkZ2UtYmVuZC1lZGl0aW5nJyk7XG4gIH1cblxuICByZXR1cm4gJCh0aGlzKTtcbn07XG4iLCJ2YXIgYmVuZFBvaW50VXRpbGl0aWVzID0ge1xuICBjdXJyZW50Q3R4RWRnZTogdW5kZWZpbmVkLFxuICBjdXJyZW50Q3R4UG9zOiB1bmRlZmluZWQsXG4gIGN1cnJlbnRCZW5kSW5kZXg6IHVuZGVmaW5lZCxcbiAgaWdub3JlZENsYXNzZXM6IHVuZGVmaW5lZCxcbiAgc2V0SWdub3JlZENsYXNzZXM6IGZ1bmN0aW9uKF9pZ25vcmVkQ2xhc3Nlcykge1xuICAgIHRoaXMuaWdub3JlZENsYXNzZXMgPSBfaWdub3JlZENsYXNzZXM7XG4gIH0sXG4gIC8vIGluaXRpbGl6ZSBiZW5kIHBvaW50cyBiYXNlZCBvbiBiZW5kUG9zaXRpb25zRmNuXG4gIGluaXRCZW5kUG9pbnRzOiBmdW5jdGlvbihiZW5kUG9zaXRpb25zRmNuLCBlZGdlcykge1xuICAgIGZvciAodmFyIGkgPSAwOyBpIDwgZWRnZXMubGVuZ3RoOyBpKyspIHtcbiAgICAgIHZhciBlZGdlID0gZWRnZXNbaV07XG4gICAgICBpZighdGhpcy5pc0lnbm9yZWRFZGdlKGVkZ2UpKSB7XG5cbiAgICAgICAgLy8gZ2V0IHRoZSBiZW5kIHBvc2l0aW9ucyBieSBhcHBseWluZyB0aGUgZnVuY3Rpb24gZm9yIHRoaXMgZWRnZVxuICAgICAgICB2YXIgYmVuZFBvc2l0aW9ucyA9IGJlbmRQb3NpdGlvbnNGY24uYXBwbHkodGhpcywgZWRnZSk7XG4gICAgICAgIC8vIGNhbGN1bGF0ZSByZWxhdGl2ZSBiZW5kIHBvc2l0aW9uc1xuICAgICAgICB2YXIgcmVzdWx0ID0gdGhpcy5jb252ZXJ0VG9SZWxhdGl2ZUJlbmRQb3NpdGlvbnMoZWRnZSwgYmVuZFBvc2l0aW9ucyk7XG5cbiAgICAgICAgLy8gaWYgdGhlcmUgYXJlIGJlbmQgcG9pbnRzIHNldCB3ZWlnaHRzIGFuZCBkaXN0YW5jZXMgYWNjb3JkaW5nbHkgYW5kIGFkZCBjbGFzcyB0byBlbmFibGUgc3R5bGUgY2hhbmdlc1xuICAgICAgICBpZiAocmVzdWx0LmRpc3RhbmNlcy5sZW5ndGggPiAwKSB7XG4gICAgICAgICAgZWRnZS5kYXRhKCdjeWVkZ2ViZW5kZWRpdGluZ1dlaWdodHMnLCByZXN1bHQud2VpZ2h0cyk7XG4gICAgICAgICAgZWRnZS5kYXRhKCdjeWVkZ2ViZW5kZWRpdGluZ0Rpc3RhbmNlcycsIHJlc3VsdC5kaXN0YW5jZXMpO1xuICAgICAgICAgIGVkZ2UuYWRkQ2xhc3MoJ2VkZ2ViZW5kZWRpdGluZy1oYXNiZW5kcG9pbnRzJyk7XG4gICAgICAgIH1cbiAgICAgIH1cbiAgICB9XG4gIH0sXG5cbiAgaXNJZ25vcmVkRWRnZTogZnVuY3Rpb24oZWRnZSkge1xuICAgIGZvcih2YXIgaSA9IDA7IHRoaXMuaWdub3JlZENsYXNzZXMgJiYgaSA8ICB0aGlzLmlnbm9yZWRDbGFzc2VzLmxlbmd0aDsgaSsrKXtcbiAgICAgIGlmKGVkZ2UuaGFzQ2xhc3ModGhpcy5pZ25vcmVkQ2xhc3Nlc1tpXSkpXG4gICAgICAgIHJldHVybiB0cnVlO1xuICAgIH1cbiAgICByZXR1cm4gZmFsc2U7XG4gIH0sXG4gIC8vR2V0IHRoZSBkaXJlY3Rpb24gb2YgdGhlIGxpbmUgZnJvbSBzb3VyY2UgcG9pbnQgdG8gdGhlIHRhcmdldCBwb2ludFxuICBnZXRMaW5lRGlyZWN0aW9uOiBmdW5jdGlvbihzcmNQb2ludCwgdGd0UG9pbnQpe1xuICAgIGlmKHNyY1BvaW50LnkgPT0gdGd0UG9pbnQueSAmJiBzcmNQb2ludC54IDwgdGd0UG9pbnQueCl7XG4gICAgICByZXR1cm4gMTtcbiAgICB9XG4gICAgaWYoc3JjUG9pbnQueSA8IHRndFBvaW50LnkgJiYgc3JjUG9pbnQueCA8IHRndFBvaW50Lngpe1xuICAgICAgcmV0dXJuIDI7XG4gICAgfVxuICAgIGlmKHNyY1BvaW50LnkgPCB0Z3RQb2ludC55ICYmIHNyY1BvaW50LnggPT0gdGd0UG9pbnQueCl7XG4gICAgICByZXR1cm4gMztcbiAgICB9XG4gICAgaWYoc3JjUG9pbnQueSA8IHRndFBvaW50LnkgJiYgc3JjUG9pbnQueCA+IHRndFBvaW50Lngpe1xuICAgICAgcmV0dXJuIDQ7XG4gICAgfVxuICAgIGlmKHNyY1BvaW50LnkgPT0gdGd0UG9pbnQueSAmJiBzcmNQb2ludC54ID4gdGd0UG9pbnQueCl7XG4gICAgICByZXR1cm4gNTtcbiAgICB9XG4gICAgaWYoc3JjUG9pbnQueSA+IHRndFBvaW50LnkgJiYgc3JjUG9pbnQueCA+IHRndFBvaW50Lngpe1xuICAgICAgcmV0dXJuIDY7XG4gICAgfVxuICAgIGlmKHNyY1BvaW50LnkgPiB0Z3RQb2ludC55ICYmIHNyY1BvaW50LnggPT0gdGd0UG9pbnQueCl7XG4gICAgICByZXR1cm4gNztcbiAgICB9XG4gICAgcmV0dXJuIDg7Ly9pZiBzcmNQb2ludC55ID4gdGd0UG9pbnQueSBhbmQgc3JjUG9pbnQueCA8IHRndFBvaW50LnhcbiAgfSxcbiAgZ2V0U3JjVGd0UG9pbnRzQW5kVGFuZ2VudHM6IGZ1bmN0aW9uIChlZGdlKSB7XG4gICAgdmFyIHNvdXJjZU5vZGUgPSBlZGdlLnNvdXJjZSgpO1xuICAgIHZhciB0YXJnZXROb2RlID0gZWRnZS50YXJnZXQoKTtcbiAgICBcbiAgICB2YXIgdGd0UG9zaXRpb24gPSB0YXJnZXROb2RlLnBvc2l0aW9uKCk7XG4gICAgdmFyIHNyY1Bvc2l0aW9uID0gc291cmNlTm9kZS5wb3NpdGlvbigpO1xuICAgIFxuICAgIHZhciBzcmNQb2ludCA9IHNvdXJjZU5vZGUucG9zaXRpb24oKTtcbiAgICB2YXIgdGd0UG9pbnQgPSB0YXJnZXROb2RlLnBvc2l0aW9uKCk7XG5cblxuICAgIHZhciBtMSA9ICh0Z3RQb2ludC55IC0gc3JjUG9pbnQueSkgLyAodGd0UG9pbnQueCAtIHNyY1BvaW50LngpO1xuICAgIHZhciBtMiA9IC0xIC8gbTE7XG5cbiAgICByZXR1cm4ge1xuICAgICAgbTE6IG0xLFxuICAgICAgbTI6IG0yLFxuICAgICAgc3JjUG9pbnQ6IHNyY1BvaW50LFxuICAgICAgdGd0UG9pbnQ6IHRndFBvaW50XG4gICAgfTtcbiAgfSxcbiAgZ2V0SW50ZXJzZWN0aW9uOiBmdW5jdGlvbihlZGdlLCBwb2ludCwgc3JjVGd0UG9pbnRzQW5kVGFuZ2VudHMpe1xuICAgIGlmIChzcmNUZ3RQb2ludHNBbmRUYW5nZW50cyA9PT0gdW5kZWZpbmVkKSB7XG4gICAgICBzcmNUZ3RQb2ludHNBbmRUYW5nZW50cyA9IHRoaXMuZ2V0U3JjVGd0UG9pbnRzQW5kVGFuZ2VudHMoZWRnZSk7XG4gICAgfVxuXG4gICAgdmFyIHNyY1BvaW50ID0gc3JjVGd0UG9pbnRzQW5kVGFuZ2VudHMuc3JjUG9pbnQ7XG4gICAgdmFyIHRndFBvaW50ID0gc3JjVGd0UG9pbnRzQW5kVGFuZ2VudHMudGd0UG9pbnQ7XG4gICAgdmFyIG0xID0gc3JjVGd0UG9pbnRzQW5kVGFuZ2VudHMubTE7XG4gICAgdmFyIG0yID0gc3JjVGd0UG9pbnRzQW5kVGFuZ2VudHMubTI7XG5cbiAgICB2YXIgaW50ZXJzZWN0WDtcbiAgICB2YXIgaW50ZXJzZWN0WTtcblxuICAgIGlmKG0xID09IEluZmluaXR5IHx8IG0xID09IC1JbmZpbml0eSl7XG4gICAgICBpbnRlcnNlY3RYID0gc3JjUG9pbnQueDtcbiAgICAgIGludGVyc2VjdFkgPSBwb2ludC55O1xuICAgIH1cbiAgICBlbHNlIGlmKG0xID09IDApe1xuICAgICAgaW50ZXJzZWN0WCA9IHBvaW50Lng7XG4gICAgICBpbnRlcnNlY3RZID0gc3JjUG9pbnQueTtcbiAgICB9XG4gICAgZWxzZSB7XG4gICAgICB2YXIgYTEgPSBzcmNQb2ludC55IC0gbTEgKiBzcmNQb2ludC54O1xuICAgICAgdmFyIGEyID0gcG9pbnQueSAtIG0yICogcG9pbnQueDtcblxuICAgICAgaW50ZXJzZWN0WCA9IChhMiAtIGExKSAvIChtMSAtIG0yKTtcbiAgICAgIGludGVyc2VjdFkgPSBtMSAqIGludGVyc2VjdFggKyBhMTtcbiAgICB9XG5cbiAgICAvL0ludGVyc2VjdGlvbiBwb2ludCBpcyB0aGUgaW50ZXJzZWN0aW9uIG9mIHRoZSBsaW5lcyBwYXNzaW5nIHRocm91Z2ggdGhlIG5vZGVzIGFuZFxuICAgIC8vcGFzc2luZyB0aHJvdWdoIHRoZSBiZW5kIHBvaW50IGFuZCBwZXJwZW5kaWN1bGFyIHRvIHRoZSBvdGhlciBsaW5lXG4gICAgdmFyIGludGVyc2VjdGlvblBvaW50ID0ge1xuICAgICAgeDogaW50ZXJzZWN0WCxcbiAgICAgIHk6IGludGVyc2VjdFlcbiAgICB9O1xuICAgIFxuICAgIHJldHVybiBpbnRlcnNlY3Rpb25Qb2ludDtcbiAgfSxcbiAgZ2V0U2VnbWVudFBvaW50czogZnVuY3Rpb24oZWRnZSkge1xuICAgIFxuICAgIGlmKCBlZGdlLmNzcygnY3VydmUtc3R5bGUnKSAhPT0gJ3NlZ21lbnRzJyApIHtcbiAgICAgIHJldHVybiB1bmRlZmluZWQ7XG4gICAgfVxuICAgIFxuICAgIHZhciBzZWdwdHMgPSBbXTtcblxuICAgIHZhciBzZWdtZW50V3MgPSBlZGdlLnBzdHlsZSggJ3NlZ21lbnQtd2VpZ2h0cycgKS5wZlZhbHVlO1xuICAgIHZhciBzZWdtZW50RHMgPSBlZGdlLnBzdHlsZSggJ3NlZ21lbnQtZGlzdGFuY2VzJyApLnBmVmFsdWU7XG4gICAgdmFyIHNlZ21lbnRzTiA9IE1hdGgubWluKCBzZWdtZW50V3MubGVuZ3RoLCBzZWdtZW50RHMubGVuZ3RoICk7XG4gICAgXG4gICAgdmFyIHNyY1BvcyA9IGVkZ2Uuc291cmNlKCkucG9zaXRpb24oKTtcbiAgICB2YXIgdGd0UG9zID0gZWRnZS50YXJnZXQoKS5wb3NpdGlvbigpO1xuXG4gICAgdmFyIGR5ID0gKCB0Z3RQb3MueSAtIHNyY1Bvcy55ICk7XG4gICAgdmFyIGR4ID0gKCB0Z3RQb3MueCAtIHNyY1Bvcy54ICk7XG4gICAgXG4gICAgdmFyIGwgPSBNYXRoLnNxcnQoIGR4ICogZHggKyBkeSAqIGR5ICk7XG5cbiAgICB2YXIgdmVjdG9yID0ge1xuICAgICAgeDogZHgsXG4gICAgICB5OiBkeVxuICAgIH07XG5cbiAgICB2YXIgdmVjdG9yTm9ybSA9IHtcbiAgICAgIHg6IHZlY3Rvci54IC8gbCxcbiAgICAgIHk6IHZlY3Rvci55IC8gbFxuICAgIH07XG4gICAgXG4gICAgdmFyIHZlY3Rvck5vcm1JbnZlcnNlID0ge1xuICAgICAgeDogLXZlY3Rvck5vcm0ueSxcbiAgICAgIHk6IHZlY3Rvck5vcm0ueFxuICAgIH07XG5cbiAgICBmb3IoIHZhciBzID0gMDsgcyA8IHNlZ21lbnRzTjsgcysrICl7XG4gICAgICB2YXIgdyA9IHNlZ21lbnRXc1sgcyBdO1xuICAgICAgdmFyIGQgPSBzZWdtZW50RHNbIHMgXTtcblxuICAgICAgLy8gZCA9IHN3YXBwZWREaXJlY3Rpb24gPyAtZCA6IGQ7XG4gICAgICAvL1xuICAgICAgLy8gZCA9IE1hdGguYWJzKGQpO1xuXG4gICAgICAvLyB2YXIgdzEgPSAhc3dhcHBlZERpcmVjdGlvbiA/ICgxIC0gdykgOiB3O1xuICAgICAgLy8gdmFyIHcyID0gIXN3YXBwZWREaXJlY3Rpb24gPyB3IDogKDEgLSB3KTtcblxuICAgICAgdmFyIHcxID0gKDEgLSB3KTtcbiAgICAgIHZhciB3MiA9IHc7XG5cbiAgICAgIHZhciBwb3NQdHMgPSB7XG4gICAgICAgIHgxOiBzcmNQb3MueCxcbiAgICAgICAgeDI6IHRndFBvcy54LFxuICAgICAgICB5MTogc3JjUG9zLnksXG4gICAgICAgIHkyOiB0Z3RQb3MueVxuICAgICAgfTtcblxuICAgICAgdmFyIG1pZHB0UHRzID0gcG9zUHRzO1xuICAgICAgXG4gICAgICBcblxuICAgICAgdmFyIGFkanVzdGVkTWlkcHQgPSB7XG4gICAgICAgIHg6IG1pZHB0UHRzLngxICogdzEgKyBtaWRwdFB0cy54MiAqIHcyLFxuICAgICAgICB5OiBtaWRwdFB0cy55MSAqIHcxICsgbWlkcHRQdHMueTIgKiB3MlxuICAgICAgfTtcblxuICAgICAgc2VncHRzLnB1c2goXG4gICAgICAgIGFkanVzdGVkTWlkcHQueCArIHZlY3Rvck5vcm1JbnZlcnNlLnggKiBkLFxuICAgICAgICBhZGp1c3RlZE1pZHB0LnkgKyB2ZWN0b3JOb3JtSW52ZXJzZS55ICogZFxuICAgICAgKTtcbiAgICB9XG4gICAgXG4gICAgcmV0dXJuIHNlZ3B0cztcbiAgfSxcbiAgY29udmVydFRvUmVsYXRpdmVCZW5kUG9zaXRpb246IGZ1bmN0aW9uIChlZGdlLCBiZW5kUG9pbnQsIHNyY1RndFBvaW50c0FuZFRhbmdlbnRzKSB7XG4gICAgaWYgKHNyY1RndFBvaW50c0FuZFRhbmdlbnRzID09PSB1bmRlZmluZWQpIHtcbiAgICAgIHNyY1RndFBvaW50c0FuZFRhbmdlbnRzID0gdGhpcy5nZXRTcmNUZ3RQb2ludHNBbmRUYW5nZW50cyhlZGdlKTtcbiAgICB9XG4gICAgXG4gICAgdmFyIGludGVyc2VjdGlvblBvaW50ID0gdGhpcy5nZXRJbnRlcnNlY3Rpb24oZWRnZSwgYmVuZFBvaW50LCBzcmNUZ3RQb2ludHNBbmRUYW5nZW50cyk7XG4gICAgdmFyIGludGVyc2VjdFggPSBpbnRlcnNlY3Rpb25Qb2ludC54O1xuICAgIHZhciBpbnRlcnNlY3RZID0gaW50ZXJzZWN0aW9uUG9pbnQueTtcbiAgICBcbiAgICB2YXIgc3JjUG9pbnQgPSBzcmNUZ3RQb2ludHNBbmRUYW5nZW50cy5zcmNQb2ludDtcbiAgICB2YXIgdGd0UG9pbnQgPSBzcmNUZ3RQb2ludHNBbmRUYW5nZW50cy50Z3RQb2ludDtcbiAgICBcbiAgICB2YXIgd2VpZ2h0O1xuICAgIFxuICAgIGlmKCBpbnRlcnNlY3RYICE9IHNyY1BvaW50LnggKSB7XG4gICAgICB3ZWlnaHQgPSAoaW50ZXJzZWN0WCAtIHNyY1BvaW50LngpIC8gKHRndFBvaW50LnggLSBzcmNQb2ludC54KTtcbiAgICB9XG4gICAgZWxzZSBpZiggaW50ZXJzZWN0WSAhPSBzcmNQb2ludC55ICkge1xuICAgICAgd2VpZ2h0ID0gKGludGVyc2VjdFkgLSBzcmNQb2ludC55KSAvICh0Z3RQb2ludC55IC0gc3JjUG9pbnQueSk7XG4gICAgfVxuICAgIGVsc2Uge1xuICAgICAgd2VpZ2h0ID0gMDtcbiAgICB9XG4gICAgXG4gICAgdmFyIGRpc3RhbmNlID0gTWF0aC5zcXJ0KE1hdGgucG93KChpbnRlcnNlY3RZIC0gYmVuZFBvaW50LnkpLCAyKVxuICAgICAgICArIE1hdGgucG93KChpbnRlcnNlY3RYIC0gYmVuZFBvaW50LngpLCAyKSk7XG4gICAgXG4gICAgLy9HZXQgdGhlIGRpcmVjdGlvbiBvZiB0aGUgbGluZSBmb3JtIHNvdXJjZSBwb2ludCB0byB0YXJnZXQgcG9pbnRcbiAgICB2YXIgZGlyZWN0aW9uMSA9IHRoaXMuZ2V0TGluZURpcmVjdGlvbihzcmNQb2ludCwgdGd0UG9pbnQpO1xuICAgIC8vR2V0IHRoZSBkaXJlY3Rpb24gb2YgdGhlIGxpbmUgZnJvbSBpbnRlc2VjdGlvbiBwb2ludCB0byBiZW5kIHBvaW50XG4gICAgdmFyIGRpcmVjdGlvbjIgPSB0aGlzLmdldExpbmVEaXJlY3Rpb24oaW50ZXJzZWN0aW9uUG9pbnQsIGJlbmRQb2ludCk7XG4gICAgXG4gICAgLy9JZiB0aGUgZGlmZmVyZW5jZSBpcyBub3QgLTIgYW5kIG5vdCA2IHRoZW4gdGhlIGRpcmVjdGlvbiBvZiB0aGUgZGlzdGFuY2UgaXMgbmVnYXRpdmVcbiAgICBpZihkaXJlY3Rpb24xIC0gZGlyZWN0aW9uMiAhPSAtMiAmJiBkaXJlY3Rpb24xIC0gZGlyZWN0aW9uMiAhPSA2KXtcbiAgICAgIGlmKGRpc3RhbmNlICE9IDApXG4gICAgICAgIGRpc3RhbmNlID0gLTEgKiBkaXN0YW5jZTtcbiAgICB9XG4gICAgXG4gICAgcmV0dXJuIHtcbiAgICAgIHdlaWdodDogd2VpZ2h0LFxuICAgICAgZGlzdGFuY2U6IGRpc3RhbmNlXG4gICAgfTtcbiAgfSxcbiAgY29udmVydFRvUmVsYXRpdmVCZW5kUG9zaXRpb25zOiBmdW5jdGlvbiAoZWRnZSwgYmVuZFBvaW50cykge1xuICAgIHZhciBzcmNUZ3RQb2ludHNBbmRUYW5nZW50cyA9IHRoaXMuZ2V0U3JjVGd0UG9pbnRzQW5kVGFuZ2VudHMoZWRnZSk7XG4vLyAgICB2YXIgYmVuZFBvaW50cyA9IGVkZ2UuZGF0YSgnYmVuZFBvaW50UG9zaXRpb25zJyk7XG4gICAgLy9vdXRwdXQgdmFyaWFibGVzXG4gICAgdmFyIHdlaWdodHMgPSBbXTtcbiAgICB2YXIgZGlzdGFuY2VzID0gW107XG5cbiAgICBmb3IgKHZhciBpID0gMDsgYmVuZFBvaW50cyAmJiBpIDwgYmVuZFBvaW50cy5sZW5ndGg7IGkrKykge1xuICAgICAgdmFyIGJlbmRQb2ludCA9IGJlbmRQb2ludHNbaV07XG4gICAgICB2YXIgcmVsYXRpdmVCZW5kUG9zaXRpb24gPSB0aGlzLmNvbnZlcnRUb1JlbGF0aXZlQmVuZFBvc2l0aW9uKGVkZ2UsIGJlbmRQb2ludCwgc3JjVGd0UG9pbnRzQW5kVGFuZ2VudHMpO1xuXG4gICAgICB3ZWlnaHRzLnB1c2gocmVsYXRpdmVCZW5kUG9zaXRpb24ud2VpZ2h0KTtcbiAgICAgIGRpc3RhbmNlcy5wdXNoKHJlbGF0aXZlQmVuZFBvc2l0aW9uLmRpc3RhbmNlKTtcbiAgICB9XG5cbiAgICByZXR1cm4ge1xuICAgICAgd2VpZ2h0czogd2VpZ2h0cyxcbiAgICAgIGRpc3RhbmNlczogZGlzdGFuY2VzXG4gICAgfTtcbiAgfSxcbiAgZ2V0U2VnbWVudERpc3RhbmNlc1N0cmluZzogZnVuY3Rpb24gKGVkZ2UpIHtcbiAgICB2YXIgc3RyID0gXCJcIjtcblxuICAgIHZhciBkaXN0YW5jZXMgPSBlZGdlLmRhdGEoJ2N5ZWRnZWJlbmRlZGl0aW5nRGlzdGFuY2VzJyk7XG4gICAgZm9yICh2YXIgaSA9IDA7IGRpc3RhbmNlcyAmJiBpIDwgZGlzdGFuY2VzLmxlbmd0aDsgaSsrKSB7XG4gICAgICBzdHIgPSBzdHIgKyBcIiBcIiArIGRpc3RhbmNlc1tpXTtcbiAgICB9XG4gICAgXG4gICAgcmV0dXJuIHN0cjtcbiAgfSxcbiAgZ2V0U2VnbWVudFdlaWdodHNTdHJpbmc6IGZ1bmN0aW9uIChlZGdlKSB7XG4gICAgdmFyIHN0ciA9IFwiXCI7XG5cbiAgICB2YXIgd2VpZ2h0cyA9IGVkZ2UuZGF0YSgnY3llZGdlYmVuZGVkaXRpbmdXZWlnaHRzJyk7XG4gICAgZm9yICh2YXIgaSA9IDA7IHdlaWdodHMgJiYgaSA8IHdlaWdodHMubGVuZ3RoOyBpKyspIHtcbiAgICAgIHN0ciA9IHN0ciArIFwiIFwiICsgd2VpZ2h0c1tpXTtcbiAgICB9XG4gICAgXG4gICAgcmV0dXJuIHN0cjtcbiAgfSxcbiAgYWRkQmVuZFBvaW50OiBmdW5jdGlvbihlZGdlLCBuZXdCZW5kUG9pbnQpIHtcbiAgICBpZihlZGdlID09PSB1bmRlZmluZWQgfHwgbmV3QmVuZFBvaW50ID09PSB1bmRlZmluZWQpe1xuICAgICAgZWRnZSA9IHRoaXMuY3VycmVudEN0eEVkZ2U7XG4gICAgICBuZXdCZW5kUG9pbnQgPSB0aGlzLmN1cnJlbnRDdHhQb3M7XG4gICAgfVxuICAgIFxuICAgIHZhciByZWxhdGl2ZUJlbmRQb3NpdGlvbiA9IHRoaXMuY29udmVydFRvUmVsYXRpdmVCZW5kUG9zaXRpb24oZWRnZSwgbmV3QmVuZFBvaW50KTtcbiAgICB2YXIgb3JpZ2luYWxQb2ludFdlaWdodCA9IHJlbGF0aXZlQmVuZFBvc2l0aW9uLndlaWdodDtcbiAgICBcbiAgICB2YXIgc3RhcnRYID0gZWRnZS5zb3VyY2UoKS5wb3NpdGlvbigneCcpO1xuICAgIHZhciBzdGFydFkgPSBlZGdlLnNvdXJjZSgpLnBvc2l0aW9uKCd5Jyk7XG4gICAgdmFyIGVuZFggPSBlZGdlLnRhcmdldCgpLnBvc2l0aW9uKCd4Jyk7XG4gICAgdmFyIGVuZFkgPSBlZGdlLnRhcmdldCgpLnBvc2l0aW9uKCd5Jyk7XG4gICAgXG4gICAgdmFyIHN0YXJ0V2VpZ2h0ID0gdGhpcy5jb252ZXJ0VG9SZWxhdGl2ZUJlbmRQb3NpdGlvbihlZGdlLCB7eDogc3RhcnRYLCB5OiBzdGFydFl9KS53ZWlnaHQ7XG4gICAgdmFyIGVuZFdlaWdodCA9IHRoaXMuY29udmVydFRvUmVsYXRpdmVCZW5kUG9zaXRpb24oZWRnZSwge3g6IGVuZFgsIHk6IGVuZFl9KS53ZWlnaHQ7XG4gICAgdmFyIHdlaWdodHNXaXRoVGd0U3JjID0gW3N0YXJ0V2VpZ2h0XS5jb25jYXQoZWRnZS5kYXRhKCdjeWVkZ2ViZW5kZWRpdGluZ1dlaWdodHMnKT9lZGdlLmRhdGEoJ2N5ZWRnZWJlbmRlZGl0aW5nV2VpZ2h0cycpOltdKS5jb25jYXQoW2VuZFdlaWdodF0pO1xuICAgIFxuICAgIHZhciBzZWdQdHMgPSB0aGlzLmdldFNlZ21lbnRQb2ludHMoZWRnZSk7XG4gICAgXG4gICAgdmFyIG1pbkRpc3QgPSBJbmZpbml0eTtcbiAgICB2YXIgaW50ZXJzZWN0aW9uO1xuICAgIHZhciBzZWdwdHNXaXRoVGd0U3JjID0gW3N0YXJ0WCwgc3RhcnRZXVxuICAgICAgICAgICAgLmNvbmNhdChzZWdQdHM/c2VnUHRzOltdKVxuICAgICAgICAgICAgLmNvbmNhdChbZW5kWCwgZW5kWV0pO1xuICAgIHZhciBuZXdCZW5kSW5kZXggPSAtMTtcbiAgICBcbiAgICBmb3IodmFyIGkgPSAwOyBpIDwgd2VpZ2h0c1dpdGhUZ3RTcmMubGVuZ3RoIC0gMTsgaSsrKXtcbiAgICAgIHZhciB3MSA9IHdlaWdodHNXaXRoVGd0U3JjW2ldO1xuICAgICAgdmFyIHcyID0gd2VpZ2h0c1dpdGhUZ3RTcmNbaSArIDFdO1xuICAgICAgXG4gICAgICAvL2NoZWNrIGlmIHRoZSB3ZWlnaHQgaXMgYmV0d2VlbiB3MSBhbmQgdzJcbiAgICAgIGlmKChvcmlnaW5hbFBvaW50V2VpZ2h0IDw9IHcxICYmIG9yaWdpbmFsUG9pbnRXZWlnaHQgPj0gdzIpIHx8IChvcmlnaW5hbFBvaW50V2VpZ2h0IDw9IHcyICYmIG9yaWdpbmFsUG9pbnRXZWlnaHQgPj0gdzEpKXtcbiAgICAgICAgdmFyIHN0YXJ0WCA9IHNlZ3B0c1dpdGhUZ3RTcmNbMiAqIGldO1xuICAgICAgICB2YXIgc3RhcnRZID0gc2VncHRzV2l0aFRndFNyY1syICogaSArIDFdO1xuICAgICAgICB2YXIgZW5kWCA9IHNlZ3B0c1dpdGhUZ3RTcmNbMiAqIGkgKyAyXTtcbiAgICAgICAgdmFyIGVuZFkgPSBzZWdwdHNXaXRoVGd0U3JjWzIgKiBpICsgM107XG4gICAgICAgIFxuICAgICAgICB2YXIgc3RhcnQgPSB7XG4gICAgICAgICAgeDogc3RhcnRYLFxuICAgICAgICAgIHk6IHN0YXJ0WVxuICAgICAgICB9O1xuICAgICAgICBcbiAgICAgICAgdmFyIGVuZCA9IHtcbiAgICAgICAgICB4OiBlbmRYLFxuICAgICAgICAgIHk6IGVuZFlcbiAgICAgICAgfTtcbiAgICAgICAgXG4gICAgICAgIHZhciBtMSA9ICggc3RhcnRZIC0gZW5kWSApIC8gKCBzdGFydFggLSBlbmRYICk7XG4gICAgICAgIHZhciBtMiA9IC0xIC8gbTE7XG4gICAgICAgIFxuICAgICAgICB2YXIgc3JjVGd0UG9pbnRzQW5kVGFuZ2VudHMgPSB7XG4gICAgICAgICAgc3JjUG9pbnQ6IHN0YXJ0LFxuICAgICAgICAgIHRndFBvaW50OiBlbmQsXG4gICAgICAgICAgbTE6IG0xLFxuICAgICAgICAgIG0yOiBtMlxuICAgICAgICB9O1xuICAgICAgICBcbiAgICAgICAgLy9nZXQgdGhlIGludGVyc2VjdGlvbiBvZiB0aGUgY3VycmVudCBzZWdtZW50IHdpdGggdGhlIG5ldyBiZW5kIHBvaW50XG4gICAgICAgIHZhciBjdXJyZW50SW50ZXJzZWN0aW9uID0gdGhpcy5nZXRJbnRlcnNlY3Rpb24oZWRnZSwgbmV3QmVuZFBvaW50LCBzcmNUZ3RQb2ludHNBbmRUYW5nZW50cyk7XG4gICAgICAgIHZhciBkaXN0ID0gTWF0aC5zcXJ0KCBNYXRoLnBvdyggKG5ld0JlbmRQb2ludC54IC0gY3VycmVudEludGVyc2VjdGlvbi54KSwgMiApIFxuICAgICAgICAgICAgICAgICsgTWF0aC5wb3coIChuZXdCZW5kUG9pbnQueSAtIGN1cnJlbnRJbnRlcnNlY3Rpb24ueSksIDIgKSk7XG4gICAgICAgIFxuICAgICAgICAvL1VwZGF0ZSB0aGUgbWluaW11bSBkaXN0YW5jZVxuICAgICAgICBpZihkaXN0IDwgbWluRGlzdCl7XG4gICAgICAgICAgbWluRGlzdCA9IGRpc3Q7XG4gICAgICAgICAgaW50ZXJzZWN0aW9uID0gY3VycmVudEludGVyc2VjdGlvbjtcbiAgICAgICAgICBuZXdCZW5kSW5kZXggPSBpO1xuICAgICAgICB9XG4gICAgICB9XG4gICAgfVxuICAgIFxuICAgIGlmKGludGVyc2VjdGlvbiAhPT0gdW5kZWZpbmVkKXtcbiAgICAgIG5ld0JlbmRQb2ludCA9IGludGVyc2VjdGlvbjtcbiAgICB9XG4gICAgXG4gICAgcmVsYXRpdmVCZW5kUG9zaXRpb24gPSB0aGlzLmNvbnZlcnRUb1JlbGF0aXZlQmVuZFBvc2l0aW9uKGVkZ2UsIG5ld0JlbmRQb2ludCk7XG4gICAgXG4gICAgaWYoaW50ZXJzZWN0aW9uID09PSB1bmRlZmluZWQpe1xuICAgICAgcmVsYXRpdmVCZW5kUG9zaXRpb24uZGlzdGFuY2UgPSAwO1xuICAgIH1cblxuICAgIHZhciB3ZWlnaHRzID0gZWRnZS5kYXRhKCdjeWVkZ2ViZW5kZWRpdGluZ1dlaWdodHMnKTtcbiAgICB2YXIgZGlzdGFuY2VzID0gZWRnZS5kYXRhKCdjeWVkZ2ViZW5kZWRpdGluZ0Rpc3RhbmNlcycpO1xuICAgIFxuICAgIHdlaWdodHMgPSB3ZWlnaHRzP3dlaWdodHM6W107XG4gICAgZGlzdGFuY2VzID0gZGlzdGFuY2VzP2Rpc3RhbmNlczpbXTtcbiAgICBcbiAgICBpZih3ZWlnaHRzLmxlbmd0aCA9PT0gMCkge1xuICAgICAgbmV3QmVuZEluZGV4ID0gMDtcbiAgICB9XG4gICAgXG4vLyAgICB3ZWlnaHRzLnB1c2gocmVsYXRpdmVCZW5kUG9zaXRpb24ud2VpZ2h0KTtcbi8vICAgIGRpc3RhbmNlcy5wdXNoKHJlbGF0aXZlQmVuZFBvc2l0aW9uLmRpc3RhbmNlKTtcbiAgICBpZihuZXdCZW5kSW5kZXggIT0gLTEpe1xuICAgICAgd2VpZ2h0cy5zcGxpY2UobmV3QmVuZEluZGV4LCAwLCByZWxhdGl2ZUJlbmRQb3NpdGlvbi53ZWlnaHQpO1xuICAgICAgZGlzdGFuY2VzLnNwbGljZShuZXdCZW5kSW5kZXgsIDAsIHJlbGF0aXZlQmVuZFBvc2l0aW9uLmRpc3RhbmNlKTtcbiAgICB9XG4gICBcbiAgICBlZGdlLmRhdGEoJ2N5ZWRnZWJlbmRlZGl0aW5nV2VpZ2h0cycsIHdlaWdodHMpO1xuICAgIGVkZ2UuZGF0YSgnY3llZGdlYmVuZGVkaXRpbmdEaXN0YW5jZXMnLCBkaXN0YW5jZXMpO1xuICAgIFxuICAgIGVkZ2UuYWRkQ2xhc3MoJ2VkZ2ViZW5kZWRpdGluZy1oYXNiZW5kcG9pbnRzJyk7XG4gICAgXG4gICAgcmV0dXJuIHJlbGF0aXZlQmVuZFBvc2l0aW9uO1xuICB9LFxuICByZW1vdmVCZW5kUG9pbnQ6IGZ1bmN0aW9uKGVkZ2UsIGJlbmRQb2ludEluZGV4KXtcbiAgICBpZihlZGdlID09PSB1bmRlZmluZWQgfHwgYmVuZFBvaW50SW5kZXggPT09IHVuZGVmaW5lZCl7XG4gICAgICBlZGdlID0gdGhpcy5jdXJyZW50Q3R4RWRnZTtcbiAgICAgIGJlbmRQb2ludEluZGV4ID0gdGhpcy5jdXJyZW50QmVuZEluZGV4O1xuICAgIH1cbiAgICBcbiAgICB2YXIgZGlzdGFuY2VzID0gZWRnZS5kYXRhKCdjeWVkZ2ViZW5kZWRpdGluZ0Rpc3RhbmNlcycpO1xuICAgIHZhciB3ZWlnaHRzID0gZWRnZS5kYXRhKCdjeWVkZ2ViZW5kZWRpdGluZ1dlaWdodHMnKTtcbiAgICBcbiAgICBkaXN0YW5jZXMuc3BsaWNlKGJlbmRQb2ludEluZGV4LCAxKTtcbiAgICB3ZWlnaHRzLnNwbGljZShiZW5kUG9pbnRJbmRleCwgMSk7XG4gICAgXG4gICAgXG4gICAgaWYoZGlzdGFuY2VzLmxlbmd0aCA9PSAwIHx8IHdlaWdodHMubGVuZ3RoID09IDApe1xuICAgICAgZWRnZS5yZW1vdmVDbGFzcygnZWRnZWJlbmRlZGl0aW5nLWhhc2JlbmRwb2ludHMnKTtcbiAgICAgICAgZWRnZS5kYXRhKCdjeWVkZ2ViZW5kZWRpdGluZ0Rpc3RhbmNlcycsIFtdKTtcbiAgICAgICAgZWRnZS5kYXRhKCdjeWVkZ2ViZW5kZWRpdGluZ1dlaWdodHMnLCBbXSk7XG4gICAgfVxuICAgIGVsc2Uge1xuICAgICAgZWRnZS5kYXRhKCdjeWVkZ2ViZW5kZWRpdGluZ0Rpc3RhbmNlcycsIGRpc3RhbmNlcyk7XG4gICAgICBlZGdlLmRhdGEoJ2N5ZWRnZWJlbmRlZGl0aW5nV2VpZ2h0cycsIHdlaWdodHMpO1xuICAgIH1cbiAgfSxcbiAgY2FsY3VsYXRlRGlzdGFuY2U6IGZ1bmN0aW9uKHB0MSwgcHQyKSB7XG4gICAgdmFyIGRpZmZYID0gcHQxLnggLSBwdDIueDtcbiAgICB2YXIgZGlmZlkgPSBwdDEueSAtIHB0Mi55O1xuICAgIFxuICAgIHZhciBkaXN0ID0gTWF0aC5zcXJ0KCBNYXRoLnBvdyggZGlmZlgsIDIgKSArIE1hdGgucG93KCBkaWZmWSwgMiApICk7XG4gICAgcmV0dXJuIGRpc3Q7XG4gIH1cbn07XG5cbm1vZHVsZS5leHBvcnRzID0gYmVuZFBvaW50VXRpbGl0aWVzO1xuIiwidmFyIGRlYm91bmNlID0gKGZ1bmN0aW9uICgpIHtcbiAgLyoqXG4gICAqIGxvZGFzaCAzLjEuMSAoQ3VzdG9tIEJ1aWxkKSA8aHR0cHM6Ly9sb2Rhc2guY29tLz5cbiAgICogQnVpbGQ6IGBsb2Rhc2ggbW9kZXJuIG1vZHVsYXJpemUgZXhwb3J0cz1cIm5wbVwiIC1vIC4vYFxuICAgKiBDb3B5cmlnaHQgMjAxMi0yMDE1IFRoZSBEb2pvIEZvdW5kYXRpb24gPGh0dHA6Ly9kb2pvZm91bmRhdGlvbi5vcmcvPlxuICAgKiBCYXNlZCBvbiBVbmRlcnNjb3JlLmpzIDEuOC4zIDxodHRwOi8vdW5kZXJzY29yZWpzLm9yZy9MSUNFTlNFPlxuICAgKiBDb3B5cmlnaHQgMjAwOS0yMDE1IEplcmVteSBBc2hrZW5hcywgRG9jdW1lbnRDbG91ZCBhbmQgSW52ZXN0aWdhdGl2ZSBSZXBvcnRlcnMgJiBFZGl0b3JzXG4gICAqIEF2YWlsYWJsZSB1bmRlciBNSVQgbGljZW5zZSA8aHR0cHM6Ly9sb2Rhc2guY29tL2xpY2Vuc2U+XG4gICAqL1xuICAvKiogVXNlZCBhcyB0aGUgYFR5cGVFcnJvcmAgbWVzc2FnZSBmb3IgXCJGdW5jdGlvbnNcIiBtZXRob2RzLiAqL1xuICB2YXIgRlVOQ19FUlJPUl9URVhUID0gJ0V4cGVjdGVkIGEgZnVuY3Rpb24nO1xuXG4gIC8qIE5hdGl2ZSBtZXRob2QgcmVmZXJlbmNlcyBmb3IgdGhvc2Ugd2l0aCB0aGUgc2FtZSBuYW1lIGFzIG90aGVyIGBsb2Rhc2hgIG1ldGhvZHMuICovXG4gIHZhciBuYXRpdmVNYXggPSBNYXRoLm1heCxcbiAgICAgICAgICBuYXRpdmVOb3cgPSBEYXRlLm5vdztcblxuICAvKipcbiAgICogR2V0cyB0aGUgbnVtYmVyIG9mIG1pbGxpc2Vjb25kcyB0aGF0IGhhdmUgZWxhcHNlZCBzaW5jZSB0aGUgVW5peCBlcG9jaFxuICAgKiAoMSBKYW51YXJ5IDE5NzAgMDA6MDA6MDAgVVRDKS5cbiAgICpcbiAgICogQHN0YXRpY1xuICAgKiBAbWVtYmVyT2YgX1xuICAgKiBAY2F0ZWdvcnkgRGF0ZVxuICAgKiBAZXhhbXBsZVxuICAgKlxuICAgKiBfLmRlZmVyKGZ1bmN0aW9uKHN0YW1wKSB7XG4gICAqICAgY29uc29sZS5sb2coXy5ub3coKSAtIHN0YW1wKTtcbiAgICogfSwgXy5ub3coKSk7XG4gICAqIC8vID0+IGxvZ3MgdGhlIG51bWJlciBvZiBtaWxsaXNlY29uZHMgaXQgdG9vayBmb3IgdGhlIGRlZmVycmVkIGZ1bmN0aW9uIHRvIGJlIGludm9rZWRcbiAgICovXG4gIHZhciBub3cgPSBuYXRpdmVOb3cgfHwgZnVuY3Rpb24gKCkge1xuICAgIHJldHVybiBuZXcgRGF0ZSgpLmdldFRpbWUoKTtcbiAgfTtcblxuICAvKipcbiAgICogQ3JlYXRlcyBhIGRlYm91bmNlZCBmdW5jdGlvbiB0aGF0IGRlbGF5cyBpbnZva2luZyBgZnVuY2AgdW50aWwgYWZ0ZXIgYHdhaXRgXG4gICAqIG1pbGxpc2Vjb25kcyBoYXZlIGVsYXBzZWQgc2luY2UgdGhlIGxhc3QgdGltZSB0aGUgZGVib3VuY2VkIGZ1bmN0aW9uIHdhc1xuICAgKiBpbnZva2VkLiBUaGUgZGVib3VuY2VkIGZ1bmN0aW9uIGNvbWVzIHdpdGggYSBgY2FuY2VsYCBtZXRob2QgdG8gY2FuY2VsXG4gICAqIGRlbGF5ZWQgaW52b2NhdGlvbnMuIFByb3ZpZGUgYW4gb3B0aW9ucyBvYmplY3QgdG8gaW5kaWNhdGUgdGhhdCBgZnVuY2BcbiAgICogc2hvdWxkIGJlIGludm9rZWQgb24gdGhlIGxlYWRpbmcgYW5kL29yIHRyYWlsaW5nIGVkZ2Ugb2YgdGhlIGB3YWl0YCB0aW1lb3V0LlxuICAgKiBTdWJzZXF1ZW50IGNhbGxzIHRvIHRoZSBkZWJvdW5jZWQgZnVuY3Rpb24gcmV0dXJuIHRoZSByZXN1bHQgb2YgdGhlIGxhc3RcbiAgICogYGZ1bmNgIGludm9jYXRpb24uXG4gICAqXG4gICAqICoqTm90ZToqKiBJZiBgbGVhZGluZ2AgYW5kIGB0cmFpbGluZ2Agb3B0aW9ucyBhcmUgYHRydWVgLCBgZnVuY2AgaXMgaW52b2tlZFxuICAgKiBvbiB0aGUgdHJhaWxpbmcgZWRnZSBvZiB0aGUgdGltZW91dCBvbmx5IGlmIHRoZSB0aGUgZGVib3VuY2VkIGZ1bmN0aW9uIGlzXG4gICAqIGludm9rZWQgbW9yZSB0aGFuIG9uY2UgZHVyaW5nIHRoZSBgd2FpdGAgdGltZW91dC5cbiAgICpcbiAgICogU2VlIFtEYXZpZCBDb3JiYWNobydzIGFydGljbGVdKGh0dHA6Ly9kcnVwYWxtb3Rpb24uY29tL2FydGljbGUvZGVib3VuY2UtYW5kLXRocm90dGxlLXZpc3VhbC1leHBsYW5hdGlvbilcbiAgICogZm9yIGRldGFpbHMgb3ZlciB0aGUgZGlmZmVyZW5jZXMgYmV0d2VlbiBgXy5kZWJvdW5jZWAgYW5kIGBfLnRocm90dGxlYC5cbiAgICpcbiAgICogQHN0YXRpY1xuICAgKiBAbWVtYmVyT2YgX1xuICAgKiBAY2F0ZWdvcnkgRnVuY3Rpb25cbiAgICogQHBhcmFtIHtGdW5jdGlvbn0gZnVuYyBUaGUgZnVuY3Rpb24gdG8gZGVib3VuY2UuXG4gICAqIEBwYXJhbSB7bnVtYmVyfSBbd2FpdD0wXSBUaGUgbnVtYmVyIG9mIG1pbGxpc2Vjb25kcyB0byBkZWxheS5cbiAgICogQHBhcmFtIHtPYmplY3R9IFtvcHRpb25zXSBUaGUgb3B0aW9ucyBvYmplY3QuXG4gICAqIEBwYXJhbSB7Ym9vbGVhbn0gW29wdGlvbnMubGVhZGluZz1mYWxzZV0gU3BlY2lmeSBpbnZva2luZyBvbiB0aGUgbGVhZGluZ1xuICAgKiAgZWRnZSBvZiB0aGUgdGltZW91dC5cbiAgICogQHBhcmFtIHtudW1iZXJ9IFtvcHRpb25zLm1heFdhaXRdIFRoZSBtYXhpbXVtIHRpbWUgYGZ1bmNgIGlzIGFsbG93ZWQgdG8gYmVcbiAgICogIGRlbGF5ZWQgYmVmb3JlIGl0J3MgaW52b2tlZC5cbiAgICogQHBhcmFtIHtib29sZWFufSBbb3B0aW9ucy50cmFpbGluZz10cnVlXSBTcGVjaWZ5IGludm9raW5nIG9uIHRoZSB0cmFpbGluZ1xuICAgKiAgZWRnZSBvZiB0aGUgdGltZW91dC5cbiAgICogQHJldHVybnMge0Z1bmN0aW9ufSBSZXR1cm5zIHRoZSBuZXcgZGVib3VuY2VkIGZ1bmN0aW9uLlxuICAgKiBAZXhhbXBsZVxuICAgKlxuICAgKiAvLyBhdm9pZCBjb3N0bHkgY2FsY3VsYXRpb25zIHdoaWxlIHRoZSB3aW5kb3cgc2l6ZSBpcyBpbiBmbHV4XG4gICAqIGpRdWVyeSh3aW5kb3cpLm9uKCdyZXNpemUnLCBfLmRlYm91bmNlKGNhbGN1bGF0ZUxheW91dCwgMTUwKSk7XG4gICAqXG4gICAqIC8vIGludm9rZSBgc2VuZE1haWxgIHdoZW4gdGhlIGNsaWNrIGV2ZW50IGlzIGZpcmVkLCBkZWJvdW5jaW5nIHN1YnNlcXVlbnQgY2FsbHNcbiAgICogalF1ZXJ5KCcjcG9zdGJveCcpLm9uKCdjbGljaycsIF8uZGVib3VuY2Uoc2VuZE1haWwsIDMwMCwge1xuICAgKiAgICdsZWFkaW5nJzogdHJ1ZSxcbiAgICogICAndHJhaWxpbmcnOiBmYWxzZVxuICAgKiB9KSk7XG4gICAqXG4gICAqIC8vIGVuc3VyZSBgYmF0Y2hMb2dgIGlzIGludm9rZWQgb25jZSBhZnRlciAxIHNlY29uZCBvZiBkZWJvdW5jZWQgY2FsbHNcbiAgICogdmFyIHNvdXJjZSA9IG5ldyBFdmVudFNvdXJjZSgnL3N0cmVhbScpO1xuICAgKiBqUXVlcnkoc291cmNlKS5vbignbWVzc2FnZScsIF8uZGVib3VuY2UoYmF0Y2hMb2csIDI1MCwge1xuICAgKiAgICdtYXhXYWl0JzogMTAwMFxuICAgKiB9KSk7XG4gICAqXG4gICAqIC8vIGNhbmNlbCBhIGRlYm91bmNlZCBjYWxsXG4gICAqIHZhciB0b2RvQ2hhbmdlcyA9IF8uZGVib3VuY2UoYmF0Y2hMb2csIDEwMDApO1xuICAgKiBPYmplY3Qub2JzZXJ2ZShtb2RlbHMudG9kbywgdG9kb0NoYW5nZXMpO1xuICAgKlxuICAgKiBPYmplY3Qub2JzZXJ2ZShtb2RlbHMsIGZ1bmN0aW9uKGNoYW5nZXMpIHtcbiAgICogICBpZiAoXy5maW5kKGNoYW5nZXMsIHsgJ3VzZXInOiAndG9kbycsICd0eXBlJzogJ2RlbGV0ZSd9KSkge1xuICAgKiAgICAgdG9kb0NoYW5nZXMuY2FuY2VsKCk7XG4gICAqICAgfVxuICAgKiB9LCBbJ2RlbGV0ZSddKTtcbiAgICpcbiAgICogLy8gLi4uYXQgc29tZSBwb2ludCBgbW9kZWxzLnRvZG9gIGlzIGNoYW5nZWRcbiAgICogbW9kZWxzLnRvZG8uY29tcGxldGVkID0gdHJ1ZTtcbiAgICpcbiAgICogLy8gLi4uYmVmb3JlIDEgc2Vjb25kIGhhcyBwYXNzZWQgYG1vZGVscy50b2RvYCBpcyBkZWxldGVkXG4gICAqIC8vIHdoaWNoIGNhbmNlbHMgdGhlIGRlYm91bmNlZCBgdG9kb0NoYW5nZXNgIGNhbGxcbiAgICogZGVsZXRlIG1vZGVscy50b2RvO1xuICAgKi9cbiAgZnVuY3Rpb24gZGVib3VuY2UoZnVuYywgd2FpdCwgb3B0aW9ucykge1xuICAgIHZhciBhcmdzLFxuICAgICAgICAgICAgbWF4VGltZW91dElkLFxuICAgICAgICAgICAgcmVzdWx0LFxuICAgICAgICAgICAgc3RhbXAsXG4gICAgICAgICAgICB0aGlzQXJnLFxuICAgICAgICAgICAgdGltZW91dElkLFxuICAgICAgICAgICAgdHJhaWxpbmdDYWxsLFxuICAgICAgICAgICAgbGFzdENhbGxlZCA9IDAsXG4gICAgICAgICAgICBtYXhXYWl0ID0gZmFsc2UsXG4gICAgICAgICAgICB0cmFpbGluZyA9IHRydWU7XG5cbiAgICBpZiAodHlwZW9mIGZ1bmMgIT0gJ2Z1bmN0aW9uJykge1xuICAgICAgdGhyb3cgbmV3IFR5cGVFcnJvcihGVU5DX0VSUk9SX1RFWFQpO1xuICAgIH1cbiAgICB3YWl0ID0gd2FpdCA8IDAgPyAwIDogKCt3YWl0IHx8IDApO1xuICAgIGlmIChvcHRpb25zID09PSB0cnVlKSB7XG4gICAgICB2YXIgbGVhZGluZyA9IHRydWU7XG4gICAgICB0cmFpbGluZyA9IGZhbHNlO1xuICAgIH0gZWxzZSBpZiAoaXNPYmplY3Qob3B0aW9ucykpIHtcbiAgICAgIGxlYWRpbmcgPSAhIW9wdGlvbnMubGVhZGluZztcbiAgICAgIG1heFdhaXQgPSAnbWF4V2FpdCcgaW4gb3B0aW9ucyAmJiBuYXRpdmVNYXgoK29wdGlvbnMubWF4V2FpdCB8fCAwLCB3YWl0KTtcbiAgICAgIHRyYWlsaW5nID0gJ3RyYWlsaW5nJyBpbiBvcHRpb25zID8gISFvcHRpb25zLnRyYWlsaW5nIDogdHJhaWxpbmc7XG4gICAgfVxuXG4gICAgZnVuY3Rpb24gY2FuY2VsKCkge1xuICAgICAgaWYgKHRpbWVvdXRJZCkge1xuICAgICAgICBjbGVhclRpbWVvdXQodGltZW91dElkKTtcbiAgICAgIH1cbiAgICAgIGlmIChtYXhUaW1lb3V0SWQpIHtcbiAgICAgICAgY2xlYXJUaW1lb3V0KG1heFRpbWVvdXRJZCk7XG4gICAgICB9XG4gICAgICBsYXN0Q2FsbGVkID0gMDtcbiAgICAgIG1heFRpbWVvdXRJZCA9IHRpbWVvdXRJZCA9IHRyYWlsaW5nQ2FsbCA9IHVuZGVmaW5lZDtcbiAgICB9XG5cbiAgICBmdW5jdGlvbiBjb21wbGV0ZShpc0NhbGxlZCwgaWQpIHtcbiAgICAgIGlmIChpZCkge1xuICAgICAgICBjbGVhclRpbWVvdXQoaWQpO1xuICAgICAgfVxuICAgICAgbWF4VGltZW91dElkID0gdGltZW91dElkID0gdHJhaWxpbmdDYWxsID0gdW5kZWZpbmVkO1xuICAgICAgaWYgKGlzQ2FsbGVkKSB7XG4gICAgICAgIGxhc3RDYWxsZWQgPSBub3coKTtcbiAgICAgICAgcmVzdWx0ID0gZnVuYy5hcHBseSh0aGlzQXJnLCBhcmdzKTtcbiAgICAgICAgaWYgKCF0aW1lb3V0SWQgJiYgIW1heFRpbWVvdXRJZCkge1xuICAgICAgICAgIGFyZ3MgPSB0aGlzQXJnID0gdW5kZWZpbmVkO1xuICAgICAgICB9XG4gICAgICB9XG4gICAgfVxuXG4gICAgZnVuY3Rpb24gZGVsYXllZCgpIHtcbiAgICAgIHZhciByZW1haW5pbmcgPSB3YWl0IC0gKG5vdygpIC0gc3RhbXApO1xuICAgICAgaWYgKHJlbWFpbmluZyA8PSAwIHx8IHJlbWFpbmluZyA+IHdhaXQpIHtcbiAgICAgICAgY29tcGxldGUodHJhaWxpbmdDYWxsLCBtYXhUaW1lb3V0SWQpO1xuICAgICAgfSBlbHNlIHtcbiAgICAgICAgdGltZW91dElkID0gc2V0VGltZW91dChkZWxheWVkLCByZW1haW5pbmcpO1xuICAgICAgfVxuICAgIH1cblxuICAgIGZ1bmN0aW9uIG1heERlbGF5ZWQoKSB7XG4gICAgICBjb21wbGV0ZSh0cmFpbGluZywgdGltZW91dElkKTtcbiAgICB9XG5cbiAgICBmdW5jdGlvbiBkZWJvdW5jZWQoKSB7XG4gICAgICBhcmdzID0gYXJndW1lbnRzO1xuICAgICAgc3RhbXAgPSBub3coKTtcbiAgICAgIHRoaXNBcmcgPSB0aGlzO1xuICAgICAgdHJhaWxpbmdDYWxsID0gdHJhaWxpbmcgJiYgKHRpbWVvdXRJZCB8fCAhbGVhZGluZyk7XG5cbiAgICAgIGlmIChtYXhXYWl0ID09PSBmYWxzZSkge1xuICAgICAgICB2YXIgbGVhZGluZ0NhbGwgPSBsZWFkaW5nICYmICF0aW1lb3V0SWQ7XG4gICAgICB9IGVsc2Uge1xuICAgICAgICBpZiAoIW1heFRpbWVvdXRJZCAmJiAhbGVhZGluZykge1xuICAgICAgICAgIGxhc3RDYWxsZWQgPSBzdGFtcDtcbiAgICAgICAgfVxuICAgICAgICB2YXIgcmVtYWluaW5nID0gbWF4V2FpdCAtIChzdGFtcCAtIGxhc3RDYWxsZWQpLFxuICAgICAgICAgICAgICAgIGlzQ2FsbGVkID0gcmVtYWluaW5nIDw9IDAgfHwgcmVtYWluaW5nID4gbWF4V2FpdDtcblxuICAgICAgICBpZiAoaXNDYWxsZWQpIHtcbiAgICAgICAgICBpZiAobWF4VGltZW91dElkKSB7XG4gICAgICAgICAgICBtYXhUaW1lb3V0SWQgPSBjbGVhclRpbWVvdXQobWF4VGltZW91dElkKTtcbiAgICAgICAgICB9XG4gICAgICAgICAgbGFzdENhbGxlZCA9IHN0YW1wO1xuICAgICAgICAgIHJlc3VsdCA9IGZ1bmMuYXBwbHkodGhpc0FyZywgYXJncyk7XG4gICAgICAgIH1cbiAgICAgICAgZWxzZSBpZiAoIW1heFRpbWVvdXRJZCkge1xuICAgICAgICAgIG1heFRpbWVvdXRJZCA9IHNldFRpbWVvdXQobWF4RGVsYXllZCwgcmVtYWluaW5nKTtcbiAgICAgICAgfVxuICAgICAgfVxuICAgICAgaWYgKGlzQ2FsbGVkICYmIHRpbWVvdXRJZCkge1xuICAgICAgICB0aW1lb3V0SWQgPSBjbGVhclRpbWVvdXQodGltZW91dElkKTtcbiAgICAgIH1cbiAgICAgIGVsc2UgaWYgKCF0aW1lb3V0SWQgJiYgd2FpdCAhPT0gbWF4V2FpdCkge1xuICAgICAgICB0aW1lb3V0SWQgPSBzZXRUaW1lb3V0KGRlbGF5ZWQsIHdhaXQpO1xuICAgICAgfVxuICAgICAgaWYgKGxlYWRpbmdDYWxsKSB7XG4gICAgICAgIGlzQ2FsbGVkID0gdHJ1ZTtcbiAgICAgICAgcmVzdWx0ID0gZnVuYy5hcHBseSh0aGlzQXJnLCBhcmdzKTtcbiAgICAgIH1cbiAgICAgIGlmIChpc0NhbGxlZCAmJiAhdGltZW91dElkICYmICFtYXhUaW1lb3V0SWQpIHtcbiAgICAgICAgYXJncyA9IHRoaXNBcmcgPSB1bmRlZmluZWQ7XG4gICAgICB9XG4gICAgICByZXR1cm4gcmVzdWx0O1xuICAgIH1cblxuICAgIGRlYm91bmNlZC5jYW5jZWwgPSBjYW5jZWw7XG4gICAgcmV0dXJuIGRlYm91bmNlZDtcbiAgfVxuXG4gIC8qKlxuICAgKiBDaGVja3MgaWYgYHZhbHVlYCBpcyB0aGUgW2xhbmd1YWdlIHR5cGVdKGh0dHBzOi8vZXM1LmdpdGh1Yi5pby8jeDgpIG9mIGBPYmplY3RgLlxuICAgKiAoZS5nLiBhcnJheXMsIGZ1bmN0aW9ucywgb2JqZWN0cywgcmVnZXhlcywgYG5ldyBOdW1iZXIoMClgLCBhbmQgYG5ldyBTdHJpbmcoJycpYClcbiAgICpcbiAgICogQHN0YXRpY1xuICAgKiBAbWVtYmVyT2YgX1xuICAgKiBAY2F0ZWdvcnkgTGFuZ1xuICAgKiBAcGFyYW0geyp9IHZhbHVlIFRoZSB2YWx1ZSB0byBjaGVjay5cbiAgICogQHJldHVybnMge2Jvb2xlYW59IFJldHVybnMgYHRydWVgIGlmIGB2YWx1ZWAgaXMgYW4gb2JqZWN0LCBlbHNlIGBmYWxzZWAuXG4gICAqIEBleGFtcGxlXG4gICAqXG4gICAqIF8uaXNPYmplY3Qoe30pO1xuICAgKiAvLyA9PiB0cnVlXG4gICAqXG4gICAqIF8uaXNPYmplY3QoWzEsIDIsIDNdKTtcbiAgICogLy8gPT4gdHJ1ZVxuICAgKlxuICAgKiBfLmlzT2JqZWN0KDEpO1xuICAgKiAvLyA9PiBmYWxzZVxuICAgKi9cbiAgZnVuY3Rpb24gaXNPYmplY3QodmFsdWUpIHtcbiAgICAvLyBBdm9pZCBhIFY4IEpJVCBidWcgaW4gQ2hyb21lIDE5LTIwLlxuICAgIC8vIFNlZSBodHRwczovL2NvZGUuZ29vZ2xlLmNvbS9wL3Y4L2lzc3Vlcy9kZXRhaWw/aWQ9MjI5MSBmb3IgbW9yZSBkZXRhaWxzLlxuICAgIHZhciB0eXBlID0gdHlwZW9mIHZhbHVlO1xuICAgIHJldHVybiAhIXZhbHVlICYmICh0eXBlID09ICdvYmplY3QnIHx8IHR5cGUgPT0gJ2Z1bmN0aW9uJyk7XG4gIH1cblxuICByZXR1cm4gZGVib3VuY2U7XG5cbn0pKCk7XG5cbm1vZHVsZS5leHBvcnRzID0gZGVib3VuY2U7IiwiOyhmdW5jdGlvbigpeyAndXNlIHN0cmljdCc7XG4gIFxuICB2YXIgYmVuZFBvaW50VXRpbGl0aWVzID0gcmVxdWlyZSgnLi9iZW5kUG9pbnRVdGlsaXRpZXMnKTtcbiAgdmFyIGRlYm91bmNlID0gcmVxdWlyZShcIi4vZGVib3VuY2VcIik7XG4gIFxuICAvLyByZWdpc3RlcnMgdGhlIGV4dGVuc2lvbiBvbiBhIGN5dG9zY2FwZSBsaWIgcmVmXG4gIHZhciByZWdpc3RlciA9IGZ1bmN0aW9uKCBjeXRvc2NhcGUsICQgKXtcbiAgICB2YXIgdWlVdGlsaXRpZXMgPSByZXF1aXJlKCcuL1VJVXRpbGl0aWVzJyk7XG4gICAgXG4gICAgaWYoICFjeXRvc2NhcGUgKXsgcmV0dXJuOyB9IC8vIGNhbid0IHJlZ2lzdGVyIGlmIGN5dG9zY2FwZSB1bnNwZWNpZmllZFxuXG4gICAgdmFyIGRlZmF1bHRzID0ge1xuICAgICAgLy8gdGhpcyBmdW5jdGlvbiBzcGVjaWZpZXMgdGhlIHBvaXRpb25zIG9mIGJlbmQgcG9pbnRzXG4gICAgICBiZW5kUG9zaXRpb25zRnVuY3Rpb246IGZ1bmN0aW9uKGVsZSkge1xuICAgICAgICByZXR1cm4gZWxlLmRhdGEoJ2JlbmRQb2ludFBvc2l0aW9ucycpO1xuICAgICAgfSxcbiAgICAgIC8vIHdoZXRoZXIgdG8gaW5pdGlsaXplIGJlbmQgcG9pbnRzIG9uIGNyZWF0aW9uIG9mIHRoaXMgZXh0ZW5zaW9uIGF1dG9tYXRpY2FsbHlcbiAgICAgIGluaXRCZW5kUG9pbnRzQXV0b21hdGljYWxseTogdHJ1ZSxcbiAgICAgIC8vIHRoZSBjbGFzc2VzIG9mIHRob3NlIGVkZ2VzIHRoYXQgc2hvdWxkIGJlIGlnbm9yZWRcbiAgICAgIGlnbm9yZWRDbGFzc2VzOiBbXSxcbiAgICAgIC8vIHdoZXRoZXIgdGhlIGJlbmQgZWRpdGluZyBvcGVyYXRpb25zIGFyZSB1bmRvYWJsZSAocmVxdWlyZXMgY3l0b3NjYXBlLXVuZG8tcmVkby5qcylcbiAgICAgIHVuZG9hYmxlOiBmYWxzZSxcbiAgICAgIC8vIHRoZSBzaXplIG9mIGJlbmQgc2hhcGUgaXMgb2J0YWluZWQgYnkgbXVsdGlwbGluZyB3aWR0aCBvZiBlZGdlIHdpdGggdGhpcyBwYXJhbWV0ZXJcbiAgICAgIGJlbmRTaGFwZVNpemVGYWN0b3I6IDMsXG4gICAgICAvLyB3aGV0aGVyIHRvIHN0YXJ0IHRoZSBwbHVnaW4gaW4gdGhlIGVuYWJsZWQgc3RhdGVcbiAgICAgIGVuYWJsZWQ6IHRydWUsXG4gICAgICAvLyB0aXRsZSBvZiBhZGQgYmVuZCBwb2ludCBtZW51IGl0ZW0gKFVzZXIgbWF5IG5lZWQgdG8gYWRqdXN0IHdpZHRoIG9mIG1lbnUgaXRlbXMgYWNjb3JkaW5nIHRvIGxlbmd0aCBvZiB0aGlzIG9wdGlvbilcbiAgICAgIGFkZEJlbmRNZW51SXRlbVRpdGxlOiBcIkFkZCBCZW5kIFBvaW50XCIsXG4gICAgICAvLyB0aXRsZSBvZiByZW1vdmUgYmVuZCBwb2ludCBtZW51IGl0ZW0gKFVzZXIgbWF5IG5lZWQgdG8gYWRqdXN0IHdpZHRoIG9mIG1lbnUgaXRlbXMgYWNjb3JkaW5nIHRvIGxlbmd0aCBvZiB0aGlzIG9wdGlvbilcbiAgICAgIHJlbW92ZUJlbmRNZW51SXRlbVRpdGxlOiBcIlJlbW92ZSBCZW5kIFBvaW50XCIsXG5cbiAgICAgIG1vdmVTZWxlY3RlZEJlbmRQb2ludHNPbktleUV2ZW50czogZnVuY3Rpb24gKCkge1xuICAgICAgICAgIHJldHVybiBmYWxzZTtcbiAgICAgIH1cbiAgICB9O1xuICAgIFxuICAgIHZhciBvcHRpb25zO1xuICAgIHZhciBpbml0aWFsaXplZCA9IGZhbHNlO1xuICAgIFxuICAgIC8vIE1lcmdlIGRlZmF1bHQgb3B0aW9ucyB3aXRoIHRoZSBvbmVzIGNvbWluZyBmcm9tIHBhcmFtZXRlclxuICAgIGZ1bmN0aW9uIGV4dGVuZChkZWZhdWx0cywgb3B0aW9ucykge1xuICAgICAgdmFyIG9iaiA9IHt9O1xuXG4gICAgICBmb3IgKHZhciBpIGluIGRlZmF1bHRzKSB7XG4gICAgICAgIG9ialtpXSA9IGRlZmF1bHRzW2ldO1xuICAgICAgfVxuXG4gICAgICBmb3IgKHZhciBpIGluIG9wdGlvbnMpIHtcbiAgICAgICAgb2JqW2ldID0gb3B0aW9uc1tpXTtcbiAgICAgIH1cblxuICAgICAgcmV0dXJuIG9iajtcbiAgICB9O1xuICAgIFxuICAgIGN5dG9zY2FwZSggJ2NvcmUnLCAnZWRnZUJlbmRFZGl0aW5nJywgZnVuY3Rpb24ob3B0cyl7XG4gICAgICB2YXIgY3kgPSB0aGlzO1xuICAgICAgXG4gICAgICBpZiggb3B0cyA9PT0gJ2luaXRpYWxpemVkJyApIHtcbiAgICAgICAgcmV0dXJuIGluaXRpYWxpemVkO1xuICAgICAgfVxuICAgICAgXG4gICAgICBpZiggb3B0cyAhPT0gJ2dldCcgKSB7XG4gICAgICAgIC8vIG1lcmdlIHRoZSBvcHRpb25zIHdpdGggZGVmYXVsdCBvbmVzXG4gICAgICAgIG9wdGlvbnMgPSBleHRlbmQoZGVmYXVsdHMsIG9wdHMpO1xuICAgICAgICBpbml0aWFsaXplZCA9IHRydWU7XG5cbiAgICAgICAgLy8gZGVmaW5lIGVkZ2ViZW5kZWRpdGluZy1oYXNiZW5kcG9pbnRzIGNzcyBjbGFzc1xuICAgICAgICBjeS5zdHlsZSgpLnNlbGVjdG9yKCcuZWRnZWJlbmRlZGl0aW5nLWhhc2JlbmRwb2ludHMnKS5jc3Moe1xuICAgICAgICAgICdjdXJ2ZS1zdHlsZSc6ICdzZWdtZW50cycsXG4gICAgICAgICAgJ3NlZ21lbnQtZGlzdGFuY2VzJzogZnVuY3Rpb24gKGVsZSkge1xuICAgICAgICAgICAgcmV0dXJuIGJlbmRQb2ludFV0aWxpdGllcy5nZXRTZWdtZW50RGlzdGFuY2VzU3RyaW5nKGVsZSk7XG4gICAgICAgICAgfSxcbiAgICAgICAgICAnc2VnbWVudC13ZWlnaHRzJzogZnVuY3Rpb24gKGVsZSkge1xuICAgICAgICAgICAgcmV0dXJuIGJlbmRQb2ludFV0aWxpdGllcy5nZXRTZWdtZW50V2VpZ2h0c1N0cmluZyhlbGUpO1xuICAgICAgICAgIH0sXG4gICAgICAgICAgJ2VkZ2UtZGlzdGFuY2VzJzogJ25vZGUtcG9zaXRpb24nXG4gICAgICAgIH0pO1xuXG4gICAgICAgIGJlbmRQb2ludFV0aWxpdGllcy5zZXRJZ25vcmVkQ2xhc3NlcyhvcHRpb25zLmlnbm9yZWRDbGFzc2VzKTtcblxuICAgICAgICAvLyBpbml0IGJlbmQgcG9zaXRpb25zIGNvbmRpdGlvbmFsbHlcbiAgICAgICAgaWYgKG9wdGlvbnMuaW5pdEJlbmRQb2ludHNBdXRvbWF0aWNhbGx5KSB7XG4gICAgICAgICAgYmVuZFBvaW50VXRpbGl0aWVzLmluaXRCZW5kUG9pbnRzKG9wdGlvbnMuYmVuZFBvc2l0aW9uc0Z1bmN0aW9uLCBjeS5lZGdlcygpLCBvcHRpb25zLmlnbm9yZWRDbGFzc2VzKTtcbiAgICAgICAgfVxuXG4gICAgICAgIGlmKG9wdGlvbnMuZW5hYmxlZClcbiAgICAgICAgICB1aVV0aWxpdGllcyhvcHRpb25zLCBjeSk7XG4gICAgICAgIGVsc2VcbiAgICAgICAgICB1aVV0aWxpdGllcyhcInVuYmluZFwiLCBjeSk7XG4gICAgICB9XG4gICAgICBcbiAgICAgIHZhciBpbnN0YW5jZSA9IGluaXRpYWxpemVkID8ge1xuICAgICAgICAvKlxuICAgICAgICAqIGdldCBzZWdtZW50IHBvaW50cyBvZiB0aGUgZ2l2ZW4gZWRnZSBpbiBhbiBhcnJheSBBLFxuICAgICAgICAqIEFbMiAqIGldIGlzIHRoZSB4IGNvb3JkaW5hdGUgYW5kIEFbMiAqIGkgKyAxXSBpcyB0aGUgeSBjb29yZGluYXRlXG4gICAgICAgICogb2YgdGhlIGl0aCBiZW5kIHBvaW50LiAoUmV0dXJucyB1bmRlZmluZWQgaWYgdGhlIGN1cnZlIHN0eWxlIGlzIG5vdCBzZWdtZW50cylcbiAgICAgICAgKi9cbiAgICAgICAgZ2V0U2VnbWVudFBvaW50czogZnVuY3Rpb24oZWxlKSB7XG4gICAgICAgICAgcmV0dXJuIGJlbmRQb2ludFV0aWxpdGllcy5nZXRTZWdtZW50UG9pbnRzKGVsZSk7XG4gICAgICAgIH0sXG4gICAgICAgIC8vIEluaXRpbGl6ZSBiZW5kIHBvaW50cyBmb3IgdGhlIGdpdmVuIGVkZ2VzIHVzaW5nICdvcHRpb25zLmJlbmRQb3NpdGlvbnNGdW5jdGlvbidcbiAgICAgICAgaW5pdEJlbmRQb2ludHM6IGZ1bmN0aW9uKGVsZXMpIHtcbiAgICAgICAgICBiZW5kUG9pbnRVdGlsaXRpZXMuaW5pdEJlbmRQb2ludHMob3B0aW9ucy5iZW5kUG9zaXRpb25zRnVuY3Rpb24sIGVsZXMpO1xuICAgICAgICB9LFxuICAgICAgICBkZWxldGVTZWxlY3RlZEJlbmRQb2ludDogZnVuY3Rpb24oZWxlLCBpbmRleCkge1xuICAgICAgICAgIGJlbmRQb2ludFV0aWxpdGllcy5yZW1vdmVCZW5kUG9pbnQoZWxlLGluZGV4KTtcbiAgICAgICAgfVxuICAgICAgfSA6IHVuZGVmaW5lZDtcblxuICAgICAgcmV0dXJuIGluc3RhbmNlOyAvLyBjaGFpbmFiaWxpdHlcbiAgICB9ICk7XG5cbiAgfTtcblxuICBpZiggdHlwZW9mIG1vZHVsZSAhPT0gJ3VuZGVmaW5lZCcgJiYgbW9kdWxlLmV4cG9ydHMgKXsgLy8gZXhwb3NlIGFzIGEgY29tbW9uanMgbW9kdWxlXG4gICAgbW9kdWxlLmV4cG9ydHMgPSByZWdpc3RlcjtcbiAgfVxuXG4gIGlmKCB0eXBlb2YgZGVmaW5lICE9PSAndW5kZWZpbmVkJyAmJiBkZWZpbmUuYW1kICl7IC8vIGV4cG9zZSBhcyBhbiBhbWQvcmVxdWlyZWpzIG1vZHVsZVxuICAgIGRlZmluZSgnY3l0b3NjYXBlLWVkZ2UtYmVuZC1lZGl0aW5nJywgZnVuY3Rpb24oKXtcbiAgICAgIHJldHVybiByZWdpc3RlcjtcbiAgICB9KTtcbiAgfVxuXG4gIGlmKCB0eXBlb2YgY3l0b3NjYXBlICE9PSAndW5kZWZpbmVkJyAmJiAkICl7IC8vIGV4cG9zZSB0byBnbG9iYWwgY3l0b3NjYXBlIChpLmUuIHdpbmRvdy5jeXRvc2NhcGUpXG4gICAgcmVnaXN0ZXIoIGN5dG9zY2FwZSwgJCApO1xuICB9XG5cbn0pKCk7XG4iLCJtb2R1bGUuZXhwb3J0cyA9IGZ1bmN0aW9uIChjeSwgYmVuZFBvaW50VXRpbGl0aWVzLCBwYXJhbXMpIHtcbiAgaWYgKGN5LnVuZG9SZWRvID09IG51bGwpXG4gICAgcmV0dXJuO1xuXG4gIHZhciB1ciA9IGN5LnVuZG9SZWRvKHtcbiAgICBkZWZhdWx0QWN0aW9uczogZmFsc2UsXG4gICAgaXNEZWJ1ZzogdHJ1ZVxuICB9KTtcblxuICBmdW5jdGlvbiBjaGFuZ2VCZW5kUG9pbnRzKHBhcmFtKSB7XG4gICAgdmFyIGVkZ2UgPSBwYXJhbS5lZGdlO1xuICAgIHZhciByZXN1bHQgPSB7XG4gICAgICBlZGdlOiBlZGdlLFxuICAgICAgd2VpZ2h0czogcGFyYW0uc2V0ID8gZWRnZS5kYXRhKCdjeWVkZ2ViZW5kZWRpdGluZ1dlaWdodHMnKSA6IHBhcmFtLndlaWdodHMsXG4gICAgICBkaXN0YW5jZXM6IHBhcmFtLnNldCA/IGVkZ2UuZGF0YSgnY3llZGdlYmVuZGVkaXRpbmdEaXN0YW5jZXMnKSA6IHBhcmFtLmRpc3RhbmNlcyxcbiAgICAgIHNldDogdHJ1ZS8vQXMgdGhlIHJlc3VsdCB3aWxsIG5vdCBiZSB1c2VkIGZvciB0aGUgZmlyc3QgZnVuY3Rpb24gY2FsbCBwYXJhbXMgc2hvdWxkIGJlIHVzZWQgdG8gc2V0IHRoZSBkYXRhXG4gICAgfTtcblxuICAgIHZhciBoYXNCZW5kID0gcGFyYW0ud2VpZ2h0cyAmJiBwYXJhbS53ZWlnaHRzLmxlbmd0aCA+IDA7XG5cbiAgICAvL0NoZWNrIGlmIHdlIG5lZWQgdG8gc2V0IHRoZSB3ZWlnaHRzIGFuZCBkaXN0YW5jZXMgYnkgdGhlIHBhcmFtIHZhbHVlc1xuICAgIGlmIChwYXJhbS5zZXQpIHtcbiAgICAgIGhhc0JlbmQgPyBlZGdlLmRhdGEoJ2N5ZWRnZWJlbmRlZGl0aW5nV2VpZ2h0cycsIHBhcmFtLndlaWdodHMpIDogZWRnZS5yZW1vdmVEYXRhKCdjeWVkZ2ViZW5kZWRpdGluZ1dlaWdodHMnKTtcbiAgICAgIGhhc0JlbmQgPyBlZGdlLmRhdGEoJ2N5ZWRnZWJlbmRlZGl0aW5nRGlzdGFuY2VzJywgcGFyYW0uZGlzdGFuY2VzKSA6IGVkZ2UucmVtb3ZlRGF0YSgnY3llZGdlYmVuZGVkaXRpbmdEaXN0YW5jZXMnKTtcblxuICAgICAgLy9yZWZyZXNoIHRoZSBjdXJ2ZSBzdHlsZSBhcyB0aGUgbnVtYmVyIG9mIGJlbmQgcG9pbnQgd291bGQgYmUgY2hhbmdlZCBieSB0aGUgcHJldmlvdXMgb3BlcmF0aW9uXG4gICAgICBpZiAoaGFzQmVuZCkge1xuICAgICAgICBlZGdlLmFkZENsYXNzKCdlZGdlYmVuZGVkaXRpbmctaGFzYmVuZHBvaW50cycpO1xuICAgICAgfVxuICAgICAgZWxzZSB7XG4gICAgICAgIGVkZ2UucmVtb3ZlQ2xhc3MoJ2VkZ2ViZW5kZWRpdGluZy1oYXNiZW5kcG9pbnRzJyk7XG4gICAgICB9XG4gICAgfVxuICAgIFxuICAgIGVkZ2UudHJpZ2dlcignY3llZGdlYmVuZGVkaXRpbmcuY2hhbmdlQmVuZFBvaW50cycpO1xuXG4gICAgcmV0dXJuIHJlc3VsdDtcbiAgfVxuXG4gIGZ1bmN0aW9uIG1vdmVEbyhhcmcpIHtcbiAgICAgIGlmIChhcmcuZmlyc3RUaW1lKSB7XG4gICAgICAgICAgZGVsZXRlIGFyZy5maXJzdFRpbWU7XG4gICAgICAgICAgcmV0dXJuIGFyZztcbiAgICAgIH1cblxuICAgICAgdmFyIGVkZ2VzID0gYXJnLmVkZ2VzO1xuICAgICAgdmFyIHBvc2l0aW9uRGlmZiA9IGFyZy5wb3NpdGlvbkRpZmY7XG4gICAgICB2YXIgcmVzdWx0ID0ge1xuICAgICAgICAgIGVkZ2VzOiBlZGdlcyxcbiAgICAgICAgICBwb3NpdGlvbkRpZmY6IHtcbiAgICAgICAgICAgICAgeDogLXBvc2l0aW9uRGlmZi54LFxuICAgICAgICAgICAgICB5OiAtcG9zaXRpb25EaWZmLnlcbiAgICAgICAgICB9XG4gICAgICB9O1xuICAgICAgbW92ZUJlbmRQb2ludHNVbmRvYWJsZShwb3NpdGlvbkRpZmYsIGVkZ2VzKTtcblxuICAgICAgcmV0dXJuIHJlc3VsdDtcbiAgfVxuXG4gIGZ1bmN0aW9uIG1vdmVCZW5kUG9pbnRzVW5kb2FibGUocG9zaXRpb25EaWZmLCBlZGdlcykge1xuICAgICAgZWRnZXMuZm9yRWFjaChmdW5jdGlvbiggZWRnZSApe1xuICAgICAgICAgIHZhciBwcmV2aW91c0JlbmRQb2ludHNQb3NpdGlvbiA9IGJlbmRQb2ludFV0aWxpdGllcy5nZXRTZWdtZW50UG9pbnRzKGVkZ2UpO1xuICAgICAgICAgIHZhciBuZXh0QmVuZFBvaW50c1Bvc2l0aW9uID0gW107XG4gICAgICAgICAgaWYgKHByZXZpb3VzQmVuZFBvaW50c1Bvc2l0aW9uICE9IHVuZGVmaW5lZClcbiAgICAgICAgICB7XG4gICAgICAgICAgICAgIGZvciAoaT0wOyBpPHByZXZpb3VzQmVuZFBvaW50c1Bvc2l0aW9uLmxlbmd0aDsgaSs9MilcbiAgICAgICAgICAgICAge1xuICAgICAgICAgICAgICAgICAgbmV4dEJlbmRQb2ludHNQb3NpdGlvbi5wdXNoKHt4OiBwcmV2aW91c0JlbmRQb2ludHNQb3NpdGlvbltpXStwb3NpdGlvbkRpZmYueCwgeTogcHJldmlvdXNCZW5kUG9pbnRzUG9zaXRpb25baSsxXStwb3NpdGlvbkRpZmYueX0pO1xuICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgIGVkZ2UuZGF0YSgnYmVuZFBvaW50UG9zaXRpb25zJyxuZXh0QmVuZFBvaW50c1Bvc2l0aW9uKTtcbiAgICAgICAgICB9XG4gICAgICB9KTtcblxuICAgICAgYmVuZFBvaW50VXRpbGl0aWVzLmluaXRCZW5kUG9pbnRzKHBhcmFtcy5iZW5kUG9zaXRpb25zRnVuY3Rpb24sIGVkZ2VzKTtcbiAgfVxuXG4gIHVyLmFjdGlvbignY2hhbmdlQmVuZFBvaW50cycsIGNoYW5nZUJlbmRQb2ludHMsIGNoYW5nZUJlbmRQb2ludHMpO1xuICB1ci5hY3Rpb24oXCJtb3ZlQmVuZFBvaW50c1wiLCBtb3ZlRG8sIG1vdmVEbyk7XG59O1xuIl19
