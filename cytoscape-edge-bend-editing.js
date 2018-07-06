(function(f){if(typeof exports==="object"&&typeof module!=="undefined"){module.exports=f()}else if(typeof define==="function"&&define.amd){define([],f)}else{var g;if(typeof window!=="undefined"){g=window}else if(typeof global!=="undefined"){g=global}else if(typeof self!=="undefined"){g=self}else{g=this}g.cytoscapeEdgeBendEditing = f()}})(function(){var define,module,exports;return (function e(t,n,r){function s(o,u){if(!n[o]){if(!t[o]){var a=typeof require=="function"&&require;if(!u&&a)return a(o,!0);if(i)return i(o,!0);var f=new Error("Cannot find module '"+o+"'");throw f.code="MODULE_NOT_FOUND",f}var l=n[o]={exports:{}};t[o][0].call(l.exports,function(e){var n=t[o][1][e];return s(n?n:e)},l,l.exports,e,t,n,r)}return n[o].exports}var i=typeof require=="function"&&require;for(var o=0;o<r.length;o++)s(r[o]);return s})({1:[function(_dereq_,module,exports){
var debounce = _dereq_('./debounce');
var bendPointUtilities = _dereq_('./bendPointUtilities');
var reconnectionUtilities = _dereq_('./reconnectionUtilities');
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
          renderEndPointShapes(edgeToHighlightBends);
        }
      }
      
      // render the bend shapes of the given edge
      function renderBendShapes(edge) {
        
        if(!edge.hasClass('edgebendediting-hasbendpoints')) {
          return;
        }
        
        var segpts = bendPointUtilities.getSegmentPoints(edge);//edge._private.rdata.segpts;
        var length = getBendShapesLength(edge) * 0.65;
        
        var srcPos = edge.source().position();
        var tgtPos = edge.target().position();
        
        var weights = edge.data('cyedgebendeditingWeights');
        var distances = edge.data('cyedgebendeditingDistances');

        for(var i = 0; segpts && i < segpts.length; i = i + 2){
          var bendX = segpts[i];
          var bendY = segpts[i + 1];

          var oldStyle = ctx.fillStyle;
          ctx.fillStyle = "#000"; // black color
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
      
      // render the end points shapes of the given edge
      function renderEndPointShapes(edge) {
        if(!edge){
          return;
        }

        var edge_pts = edge._private.rscratch.allpts;
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

        var length = getBendShapesLength(edge) * 0.65;

        var oldStroke = ctx.strokeStyle;
        var oldWidth = ctx.lineWidth;
        var oldFill = ctx.fillStyle;

        ctx.fillStyle = "#000" // black
        
        renderEachEndPointShape(src, target, length);
        
        ctx.strokeStyle = oldStroke;
        ctx.fillStyle = oldFill;
        ctx.lineWidth = oldWidth;
      }

      function renderEachEndPointShape(source, target, length) {
        // get the top left coordinates of source and target
        var sTopLeftX = source.x - length / 2;
        var sTopLeftY = source.y - length / 2;

        var tTopLeftX = target.x - length / 2;
        var tTopLeftY = target.y - length / 2;

        // convert to rendered parameters
        var renderedSourcePos = convertToRenderedPosition({x: sTopLeftX, y: sTopLeftY});
        var renderedTargetPos = convertToRenderedPosition({x: tTopLeftX, y: tTopLeftY});
        length = length * cy.zoom() / 2;
        
        // render end point shape for source and target
        ctx.beginPath();
        ctx.arc(renderedSourcePos.x + length, renderedSourcePos.y + length, length, 0, 2*Math.PI, false);
        ctx.arc(renderedTargetPos.x + length, renderedTargetPos.y + length, length, 0, 2*Math.PI, false);
        ctx.fill();
        
        // drawDiamondShape(renderedSourcePos.x, renderedSourcePos.y, length);
        // drawDiamondShape(renderedTargetPos.x, renderedTargetPos.y, length);

        function drawDiamondShape(topLeftX, topLeftY, length){
          var l = (length) / (3 * 6 + 2);

          // Draw all corners
          drawCorner(topLeftX, topLeftY + length/2, l, 'left');
          drawCorner(topLeftX + length/2, topLeftY, l, 'top');
          drawCorner(topLeftX + length/2, topLeftY + length, l, 'bottom');
          drawCorner(topLeftX + length, topLeftY + length/2, l, 'right');

          drawDashedLine(topLeftX, topLeftY + length/2, topLeftX + length/2, topLeftY, l);
          drawDashedLine(topLeftX + length/2, topLeftY, topLeftX + length, topLeftY + length/2, l);
          drawDashedLine(topLeftX + length, topLeftY + length/2, topLeftX + length/2, topLeftY + length, l);
          drawDashedLine(topLeftX + length/2, topLeftY + length, topLeftX, topLeftY + length/2, l);
        }

        function drawCorner(x, y, l, corner){
          ctx.beginPath();
          ctx.moveTo(x, y);
          switch(corner){
            case 'left': {
              ctx.lineTo(x + l, y - l);
              ctx.lineTo(x, y);
              ctx.lineTo(x + l, y + l);
              break;
            }
            case 'top': {
              ctx.lineTo(x - l, y + l);
              ctx.lineTo(x, y);
              ctx.lineTo(x + l, y + l);
              break;
            }
            case 'right': {
              ctx.lineTo(x - l, y - l);
              ctx.lineTo(x, y);
              ctx.lineTo(x - l, y + l);
              break;
            }
            case 'bottom': {
              ctx.lineTo(x + l, y - l);
              ctx.lineTo(x, y);
              ctx.lineTo(x - l, y - l);
              break;
            }
            case 'default':
              return;
          }
          ctx.stroke();
        }

        function drawDashedLine(x1, y1, x2, y2, l){
          ctx.beginPath();
          ctx.moveTo(x1, y1);
          ctx.lineTo(x2, y2);
          ctx.setLineDash([2*l,l]);
          ctx.stroke();
          ctx.setLineDash([]);
        }
      }

      // changes color tone
      // https://stackoverflow.com/questions/5560248/programmatically-lighten-or-darken-a-hex-color-or-rgb-and-blend-colors
      function shadeBlend(p,c0,c1) {
        var n=p<0?p*-1:p,u=Math.round,w=parseInt;
        if(c0.length>7){
          var f=c0.split(","),t=(c1?c1:p<0?"rgb(0,0,0)":"rgb(255,255,255)").split(","),R=w(f[0].slice(4)),G=w(f[1]),B=w(f[2]);
          return "rgb("+(u((w(t[0].slice(4))-R)*n)+R)+","+(u((w(t[1])-G)*n)+G)+","+(u((w(t[2])-B)*n)+B)+")"
        }
        else{
          var f=w(c0.slice(1),16),t=w((c1?c1:p<0?"#000000":"#FFFFFF").slice(1),16),R1=f>>16,G1=f>>8&0x00FF,B1=f&0x0000FF;
          return "#"+(0x1000000+(u(((t>>16)-R1)*n)+R1)*0x10000+(u(((t>>8&0x00FF)-G1)*n)+G1)*0x100+(u(((t&0x0000FF)-B1)*n)+B1)).toString(16).slice(1)
        }
      }

      // get the length of bend points to be rendered
      function getBendShapesLength(edge) {
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
        var length = getBendShapesLength(edge);

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

      function getContainingEndPoint(x, y, edge){
        var length = getBendShapesLength(edge);
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
        if(checkIfInsideBendShape(x, y, length, src.x, src.y))
          return 0;
        else if(checkIfInsideBendShape(x, y, length, target.x, target.y))
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
          cy.trigger('bendPointMovement');
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
        var movedEndPoint;
        var dummyNode;
        var detachedNode;
        var nodeToAttach;
        
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
          
          // Get which end point has been clicked (Source:0, Target:1, None:-1)
          var endPoint = getContainingEndPoint(cyPosX, cyPosY, edge);

          if(endPoint == 0 || endPoint == 1){
            movedEndPoint = endPoint;
            detachedNode = (endPoint == 0) ? movedBendEdge.source() : movedBendEdge.target();

            var disconnectedEnd = (endPoint == 0) ? 'source' : 'target';
            var result = reconnectionUtilities.disconnectEdge(movedBendEdge, cy, event.renderedPosition, disconnectedEnd);
            
            dummyNode = result.dummyNode;
            movedBendEdge = result.edge;

            disableGestures();
          }
          else if (index != -1) {
            movedBendIndex = index;
            // movedBendEdge = edge;
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
          
          if (movedBendEdge === undefined || (movedBendIndex === undefined && movedEndPoint === undefined)) {
            return;
          }

          // Update end point location (Source:0, Target:1)
          if(movedEndPoint != -1 && dummyNode){
            var newPos = event.position || event.cyPosition;
            dummyNode.position(newPos);
          }
          // Update bend point location
          else if(movedBendIndex != undefined){ 
            var weights = edge.data('cyedgebendeditingWeights');
            var distances = edge.data('cyedgebendeditingDistances');
            
            var relativeBendPosition = bendPointUtilities.convertToRelativeBendPosition(edge, event.position || event.cyPosition);
            weights[movedBendIndex] = relativeBendPosition.weight;
            distances[movedBendIndex] = relativeBendPosition.distance;
            
            edge.data('cyedgebendeditingWeights', weights);
            edge.data('cyedgebendeditingDistances', distances);
          }
          
          if(event.target && event.target[0] && event.target.isNode()){
            nodeToAttach = event.target;
          }

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
                
                // var length = Math.sqrt( Math.pow( (posPoint.x - prePoint.x), 2 ) 
                //         + Math.pow( (posPoint.y - prePoint.y), 2 ));
                
                if( dist  < 8 ) {
                  nearToLine = true;
                }
                
              }
              
              if( nearToLine )
              {
                bendPointUtilities.removeBendPoint(edge, movedBendIndex);
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
                    bendPointUtilities.initBendPoints(options().bendPositionsFunction, [reconnectedEdge]);
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
                  }
                }  
              }

              // invalid edge reconnection callback
              if(isValid !== 'valid' && typeof actOnUnsuccessfulReconnection === 'function'){
                actOnUnsuccessfulReconnection();
              }
              edge.unselect();
              cy.remove(dummyNode);
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
          movedEndPoint = undefined;
          dummyNode = undefined;
          detachedNode = undefined;
          nodeToAttach = undefined;

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

},{"./bendPointUtilities":2,"./debounce":3,"./reconnectionUtilities":5,"./registerUndoRedoFunctions":6}],2:[function(_dereq_,module,exports){
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
      // whether the bend point can be moved by arrows
      moveSelectedBendPointsOnKeyEvents: function () {
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
        this.copyBendPoints(oldEdge, newEdge);
        this.copyStyle(oldEdge, newEdge);
    },

    copyStyle: function (oldEdge, newEdge) {
        if(oldEdge && newEdge){
            newEdge.data('line-color', oldEdge.data('line-color'));
            newEdge.data('width', oldEdge.data('width'));
            newEdge.data('cardinality', oldEdge.data('cardinality'));
        }
    },

    copyBendPoints: function (oldEdge, newEdge) {
        if(oldEdge.hasClass('edgebendediting-hasbendpoints')){
            var bpDistances = oldEdge.data('cyedgebendeditingDistances');
            var bpWeights = oldEdge.data('cyedgebendeditingWeights');
            
            newEdge.data('cyedgebendeditingDistances', bpDistances);
            newEdge.data('cyedgebendeditingWeights', bpWeights);
            newEdge.addClass('edgebendediting-hasbendpoints');
        }
    },
};
  
module.exports = reconnectionUtilities;
  
},{}],6:[function(_dereq_,module,exports){
module.exports = function (cy, bendPointUtilities, params) {
  if (cy.undoRedo == null)
    return;

  var ur = cy.undoRedo({
    defaultActions: false,
    isDebug: true
  });

  function changeBendPoints(param) {
    var edge = cy.getElementById(param.edge.id());
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
          edge = cy.getElementById(param.edge.id());
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

  ur.action('changeBendPoints', changeBendPoints, changeBendPoints);
  ur.action('moveBendPoints', moveDo, moveDo);
  ur.action('reconnectEdge', reconnectEdge, reconnectEdge);
  ur.action('removeReconnectedEdge', removeReconnectedEdge, removeReconnectedEdge);
};

},{}]},{},[4])(4)
});

//# sourceMappingURL=data:application/json;charset:utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIm5vZGVfbW9kdWxlcy9icm93c2VyLXBhY2svX3ByZWx1ZGUuanMiLCJzcmMvVUlVdGlsaXRpZXMuanMiLCJzcmMvYmVuZFBvaW50VXRpbGl0aWVzLmpzIiwic3JjL2RlYm91bmNlLmpzIiwic3JjL2luZGV4LmpzIiwic3JjL3JlY29ubmVjdGlvblV0aWxpdGllcy5qcyIsInNyYy9yZWdpc3RlclVuZG9SZWRvRnVuY3Rpb25zLmpzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBO0FDQUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUM5a0NBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDL1pBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQzdPQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNqSUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQzFFQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQSIsImZpbGUiOiJnZW5lcmF0ZWQuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlc0NvbnRlbnQiOlsiKGZ1bmN0aW9uIGUodCxuLHIpe2Z1bmN0aW9uIHMobyx1KXtpZighbltvXSl7aWYoIXRbb10pe3ZhciBhPXR5cGVvZiByZXF1aXJlPT1cImZ1bmN0aW9uXCImJnJlcXVpcmU7aWYoIXUmJmEpcmV0dXJuIGEobywhMCk7aWYoaSlyZXR1cm4gaShvLCEwKTt2YXIgZj1uZXcgRXJyb3IoXCJDYW5ub3QgZmluZCBtb2R1bGUgJ1wiK28rXCInXCIpO3Rocm93IGYuY29kZT1cIk1PRFVMRV9OT1RfRk9VTkRcIixmfXZhciBsPW5bb109e2V4cG9ydHM6e319O3Rbb11bMF0uY2FsbChsLmV4cG9ydHMsZnVuY3Rpb24oZSl7dmFyIG49dFtvXVsxXVtlXTtyZXR1cm4gcyhuP246ZSl9LGwsbC5leHBvcnRzLGUsdCxuLHIpfXJldHVybiBuW29dLmV4cG9ydHN9dmFyIGk9dHlwZW9mIHJlcXVpcmU9PVwiZnVuY3Rpb25cIiYmcmVxdWlyZTtmb3IodmFyIG89MDtvPHIubGVuZ3RoO28rKylzKHJbb10pO3JldHVybiBzfSkiLCJ2YXIgZGVib3VuY2UgPSByZXF1aXJlKCcuL2RlYm91bmNlJyk7XHJcbnZhciBiZW5kUG9pbnRVdGlsaXRpZXMgPSByZXF1aXJlKCcuL2JlbmRQb2ludFV0aWxpdGllcycpO1xyXG52YXIgcmVjb25uZWN0aW9uVXRpbGl0aWVzID0gcmVxdWlyZSgnLi9yZWNvbm5lY3Rpb25VdGlsaXRpZXMnKTtcclxudmFyIHJlZ2lzdGVyVW5kb1JlZG9GdW5jdGlvbnMgPSByZXF1aXJlKCcuL3JlZ2lzdGVyVW5kb1JlZG9GdW5jdGlvbnMnKTtcclxuXHJcbm1vZHVsZS5leHBvcnRzID0gZnVuY3Rpb24gKHBhcmFtcywgY3kpIHtcclxuICB2YXIgZm4gPSBwYXJhbXM7XHJcblxyXG4gIHZhciBhZGRCZW5kUG9pbnRDeHRNZW51SWQgPSAnY3ktZWRnZS1iZW5kLWVkaXRpbmctY3h0LWFkZC1iZW5kLXBvaW50JztcclxuICB2YXIgcmVtb3ZlQmVuZFBvaW50Q3h0TWVudUlkID0gJ2N5LWVkZ2UtYmVuZC1lZGl0aW5nLWN4dC1yZW1vdmUtYmVuZC1wb2ludCc7XHJcbiAgdmFyIGVQb3NpdGlvbiwgZVN0eWxlLCBlUmVtb3ZlLCBlQWRkLCBlWm9vbSwgZVNlbGVjdCwgZVVuc2VsZWN0LCBlVGFwU3RhcnQsIGVUYXBEcmFnLCBlVGFwRW5kLCBlQ3h0VGFwO1xyXG4gIC8vIGxhc3Qgc3RhdHVzIG9mIGdlc3R1cmVzXHJcbiAgdmFyIGxhc3RQYW5uaW5nRW5hYmxlZCwgbGFzdFpvb21pbmdFbmFibGVkLCBsYXN0Qm94U2VsZWN0aW9uRW5hYmxlZDtcclxuICAvLyBzdGF0dXMgb2YgZWRnZSB0byBoaWdobGlnaHQgYmVuZHMgYW5kIHNlbGVjdGVkIGVkZ2VzXHJcbiAgdmFyIGVkZ2VUb0hpZ2hsaWdodEJlbmRzLCBudW1iZXJPZlNlbGVjdGVkRWRnZXM7XHJcbiAgXHJcbiAgdmFyIGZ1bmN0aW9ucyA9IHtcclxuICAgIGluaXQ6IGZ1bmN0aW9uICgpIHtcclxuICAgICAgLy8gcmVnaXN0ZXIgdW5kbyByZWRvIGZ1bmN0aW9uc1xyXG4gICAgICByZWdpc3RlclVuZG9SZWRvRnVuY3Rpb25zKGN5LCBiZW5kUG9pbnRVdGlsaXRpZXMsIHBhcmFtcyk7XHJcbiAgICAgIFxyXG4gICAgICB2YXIgc2VsZiA9IHRoaXM7XHJcbiAgICAgIHZhciBvcHRzID0gcGFyYW1zO1xyXG4gICAgICB2YXIgJGNvbnRhaW5lciA9ICQodGhpcyk7XHJcbiAgICAgIHZhciAkY2FudmFzID0gJCgnPGNhbnZhcz48L2NhbnZhcz4nKTtcclxuXHJcbiAgICAgICRjb250YWluZXIuYXBwZW5kKCRjYW52YXMpO1xyXG5cclxuICAgICAgdmFyIGN4dEFkZEJlbmRQb2ludEZjbiA9IGZ1bmN0aW9uIChldmVudCkge1xyXG4gICAgICAgIHZhciBlZGdlID0gZXZlbnQudGFyZ2V0IHx8IGV2ZW50LmN5VGFyZ2V0O1xyXG4gICAgICAgIGlmKCFiZW5kUG9pbnRVdGlsaXRpZXMuaXNJZ25vcmVkRWRnZShlZGdlKSkge1xyXG5cclxuICAgICAgICAgIHZhciBwYXJhbSA9IHtcclxuICAgICAgICAgICAgZWRnZTogZWRnZSxcclxuICAgICAgICAgICAgd2VpZ2h0czogZWRnZS5kYXRhKCdjeWVkZ2ViZW5kZWRpdGluZ1dlaWdodHMnKSA/IFtdLmNvbmNhdChlZGdlLmRhdGEoJ2N5ZWRnZWJlbmRlZGl0aW5nV2VpZ2h0cycpKSA6IGVkZ2UuZGF0YSgnY3llZGdlYmVuZGVkaXRpbmdXZWlnaHRzJyksXHJcbiAgICAgICAgICAgIGRpc3RhbmNlczogZWRnZS5kYXRhKCdjeWVkZ2ViZW5kZWRpdGluZ0Rpc3RhbmNlcycpID8gW10uY29uY2F0KGVkZ2UuZGF0YSgnY3llZGdlYmVuZGVkaXRpbmdEaXN0YW5jZXMnKSkgOiBlZGdlLmRhdGEoJ2N5ZWRnZWJlbmRlZGl0aW5nRGlzdGFuY2VzJylcclxuICAgICAgICAgIH07XHJcblxyXG4gICAgICAgICAgYmVuZFBvaW50VXRpbGl0aWVzLmFkZEJlbmRQb2ludCgpO1xyXG5cclxuICAgICAgICAgIGlmIChvcHRpb25zKCkudW5kb2FibGUpIHtcclxuICAgICAgICAgICAgY3kudW5kb1JlZG8oKS5kbygnY2hhbmdlQmVuZFBvaW50cycsIHBhcmFtKTtcclxuICAgICAgICAgIH1cclxuICAgICAgICB9XHJcbiAgICAgICAgXHJcbiAgICAgICAgcmVmcmVzaERyYXdzKCk7XHJcbiAgICAgIH07XHJcblxyXG4gICAgICB2YXIgY3h0UmVtb3ZlQmVuZFBvaW50RmNuID0gZnVuY3Rpb24gKGV2ZW50KSB7XHJcbiAgICAgICAgdmFyIGVkZ2UgPSBldmVudC50YXJnZXQgfHwgZXZlbnQuY3lUYXJnZXQ7XHJcbiAgICAgICAgXHJcbiAgICAgICAgdmFyIHBhcmFtID0ge1xyXG4gICAgICAgICAgZWRnZTogZWRnZSxcclxuICAgICAgICAgIHdlaWdodHM6IFtdLmNvbmNhdChlZGdlLmRhdGEoJ2N5ZWRnZWJlbmRlZGl0aW5nV2VpZ2h0cycpKSxcclxuICAgICAgICAgIGRpc3RhbmNlczogW10uY29uY2F0KGVkZ2UuZGF0YSgnY3llZGdlYmVuZGVkaXRpbmdEaXN0YW5jZXMnKSlcclxuICAgICAgICB9O1xyXG5cclxuICAgICAgICBiZW5kUG9pbnRVdGlsaXRpZXMucmVtb3ZlQmVuZFBvaW50KCk7XHJcbiAgICAgICAgXHJcbiAgICAgICAgaWYob3B0aW9ucygpLnVuZG9hYmxlKSB7XHJcbiAgICAgICAgICBjeS51bmRvUmVkbygpLmRvKCdjaGFuZ2VCZW5kUG9pbnRzJywgcGFyYW0pO1xyXG4gICAgICAgIH1cclxuICAgICAgICBcclxuICAgICAgICByZWZyZXNoRHJhd3MoKTtcclxuICAgICAgfTtcclxuICAgICAgXHJcbiAgICAgIC8vIGZ1bmN0aW9uIHRvIHJlY29ubmVjdCBlZGdlXHJcbiAgICAgIHZhciBoYW5kbGVSZWNvbm5lY3RFZGdlID0gb3B0cy5oYW5kbGVSZWNvbm5lY3RFZGdlO1xyXG4gICAgICAvLyBmdW5jdGlvbiB0byB2YWxpZGF0ZSBlZGdlIHNvdXJjZSBhbmQgdGFyZ2V0IG9uIHJlY29ubmVjdGlvblxyXG4gICAgICB2YXIgdmFsaWRhdGVFZGdlID0gb3B0cy52YWxpZGF0ZUVkZ2U7IFxyXG4gICAgICAvLyBmdW5jdGlvbiB0byBiZSBjYWxsZWQgb24gaW52YWxpZCBlZGdlIHJlY29ubmVjdGlvblxyXG4gICAgICB2YXIgYWN0T25VbnN1Y2Nlc3NmdWxSZWNvbm5lY3Rpb24gPSBvcHRzLmFjdE9uVW5zdWNjZXNzZnVsUmVjb25uZWN0aW9uO1xyXG4gICAgICBcclxuICAgICAgdmFyIG1lbnVJdGVtcyA9IFtcclxuICAgICAgICB7XHJcbiAgICAgICAgICBpZDogYWRkQmVuZFBvaW50Q3h0TWVudUlkLFxyXG4gICAgICAgICAgdGl0bGU6IG9wdHMuYWRkQmVuZE1lbnVJdGVtVGl0bGUsXHJcbiAgICAgICAgICBjb250ZW50OiAnQWRkIEJlbmQgUG9pbnQnLFxyXG4gICAgICAgICAgc2VsZWN0b3I6ICdlZGdlJyxcclxuICAgICAgICAgIG9uQ2xpY2tGdW5jdGlvbjogY3h0QWRkQmVuZFBvaW50RmNuXHJcbiAgICAgICAgfSxcclxuICAgICAgICB7XHJcbiAgICAgICAgICBpZDogcmVtb3ZlQmVuZFBvaW50Q3h0TWVudUlkLFxyXG4gICAgICAgICAgdGl0bGU6IG9wdHMucmVtb3ZlQmVuZE1lbnVJdGVtVGl0bGUsXHJcbiAgICAgICAgICBjb250ZW50OiAnUmVtb3ZlIEJlbmQgUG9pbnQnLFxyXG4gICAgICAgICAgc2VsZWN0b3I6ICdlZGdlJyxcclxuICAgICAgICAgIG9uQ2xpY2tGdW5jdGlvbjogY3h0UmVtb3ZlQmVuZFBvaW50RmNuXHJcbiAgICAgICAgfVxyXG4gICAgICBdO1xyXG4gICAgICBcclxuICAgICAgaWYoY3kuY29udGV4dE1lbnVzKSB7XHJcbiAgICAgICAgdmFyIG1lbnVzID0gY3kuY29udGV4dE1lbnVzKCdnZXQnKTtcclxuICAgICAgICAvLyBJZiBjb250ZXh0IG1lbnVzIGlzIGFjdGl2ZSBqdXN0IGFwcGVuZCBtZW51IGl0ZW1zIGVsc2UgYWN0aXZhdGUgdGhlIGV4dGVuc2lvblxyXG4gICAgICAgIC8vIHdpdGggaW5pdGlhbCBtZW51IGl0ZW1zXHJcbiAgICAgICAgaWYgKG1lbnVzLmlzQWN0aXZlKCkpIHtcclxuICAgICAgICAgIG1lbnVzLmFwcGVuZE1lbnVJdGVtcyhtZW51SXRlbXMpO1xyXG4gICAgICAgIH1cclxuICAgICAgICBlbHNlIHtcclxuICAgICAgICAgIGN5LmNvbnRleHRNZW51cyh7XHJcbiAgICAgICAgICAgIG1lbnVJdGVtczogbWVudUl0ZW1zXHJcbiAgICAgICAgICB9KTtcclxuICAgICAgICB9XHJcbiAgICAgIH1cclxuICAgICAgXHJcbiAgICAgIHZhciBfc2l6ZUNhbnZhcyA9IGRlYm91bmNlKGZ1bmN0aW9uICgpIHtcclxuICAgICAgICAkY2FudmFzXHJcbiAgICAgICAgICAuYXR0cignaGVpZ2h0JywgJGNvbnRhaW5lci5oZWlnaHQoKSlcclxuICAgICAgICAgIC5hdHRyKCd3aWR0aCcsICRjb250YWluZXIud2lkdGgoKSlcclxuICAgICAgICAgIC5jc3Moe1xyXG4gICAgICAgICAgICAncG9zaXRpb24nOiAnYWJzb2x1dGUnLFxyXG4gICAgICAgICAgICAndG9wJzogMCxcclxuICAgICAgICAgICAgJ2xlZnQnOiAwLFxyXG4gICAgICAgICAgICAnei1pbmRleCc6ICc5OTknXHJcbiAgICAgICAgICB9KVxyXG4gICAgICAgIDtcclxuXHJcbiAgICAgICAgc2V0VGltZW91dChmdW5jdGlvbiAoKSB7XHJcbiAgICAgICAgICB2YXIgY2FudmFzQmIgPSAkY2FudmFzLm9mZnNldCgpO1xyXG4gICAgICAgICAgdmFyIGNvbnRhaW5lckJiID0gJGNvbnRhaW5lci5vZmZzZXQoKTtcclxuXHJcbiAgICAgICAgICAkY2FudmFzXHJcbiAgICAgICAgICAgIC5jc3Moe1xyXG4gICAgICAgICAgICAgICd0b3AnOiAtKGNhbnZhc0JiLnRvcCAtIGNvbnRhaW5lckJiLnRvcCksXHJcbiAgICAgICAgICAgICAgJ2xlZnQnOiAtKGNhbnZhc0JiLmxlZnQgLSBjb250YWluZXJCYi5sZWZ0KVxyXG4gICAgICAgICAgICB9KVxyXG4gICAgICAgICAgO1xyXG5cclxuICAgICAgICAgIC8vIHJlZHJhdyBvbiBjYW52YXMgcmVzaXplXHJcbiAgICAgICAgICBpZihjeSl7XHJcbiAgICAgICAgICAgIHJlZnJlc2hEcmF3cygpO1xyXG4gICAgICAgICAgfVxyXG4gICAgICAgIH0sIDApO1xyXG5cclxuICAgICAgfSwgMjUwKTtcclxuXHJcbiAgICAgIGZ1bmN0aW9uIHNpemVDYW52YXMoKSB7XHJcbiAgICAgICAgX3NpemVDYW52YXMoKTtcclxuICAgICAgfVxyXG5cclxuICAgICAgc2l6ZUNhbnZhcygpO1xyXG5cclxuICAgICAgJCh3aW5kb3cpLmJpbmQoJ3Jlc2l6ZScsIGZ1bmN0aW9uICgpIHtcclxuICAgICAgICBzaXplQ2FudmFzKCk7XHJcbiAgICAgIH0pO1xyXG5cclxuICAgICAgdmFyIGN0eCA9ICRjYW52YXNbMF0uZ2V0Q29udGV4dCgnMmQnKTtcclxuXHJcbiAgICAgIC8vIHdyaXRlIG9wdGlvbnMgdG8gZGF0YVxyXG4gICAgICB2YXIgZGF0YSA9ICRjb250YWluZXIuZGF0YSgnY3llZGdlYmVuZGVkaXRpbmcnKTtcclxuICAgICAgaWYgKGRhdGEgPT0gbnVsbCkge1xyXG4gICAgICAgIGRhdGEgPSB7fTtcclxuICAgICAgfVxyXG4gICAgICBkYXRhLm9wdGlvbnMgPSBvcHRzO1xyXG5cclxuICAgICAgdmFyIG9wdENhY2hlO1xyXG5cclxuICAgICAgZnVuY3Rpb24gb3B0aW9ucygpIHtcclxuICAgICAgICByZXR1cm4gb3B0Q2FjaGUgfHwgKG9wdENhY2hlID0gJGNvbnRhaW5lci5kYXRhKCdjeWVkZ2ViZW5kZWRpdGluZycpLm9wdGlvbnMpO1xyXG4gICAgICB9XHJcblxyXG4gICAgICAvLyB3ZSB3aWxsIG5lZWQgdG8gY29udmVydCBtb2RlbCBwb3NpdG9ucyB0byByZW5kZXJlZCBwb3NpdGlvbnNcclxuICAgICAgZnVuY3Rpb24gY29udmVydFRvUmVuZGVyZWRQb3NpdGlvbihtb2RlbFBvc2l0aW9uKSB7XHJcbiAgICAgICAgdmFyIHBhbiA9IGN5LnBhbigpO1xyXG4gICAgICAgIHZhciB6b29tID0gY3kuem9vbSgpO1xyXG5cclxuICAgICAgICB2YXIgeCA9IG1vZGVsUG9zaXRpb24ueCAqIHpvb20gKyBwYW4ueDtcclxuICAgICAgICB2YXIgeSA9IG1vZGVsUG9zaXRpb24ueSAqIHpvb20gKyBwYW4ueTtcclxuXHJcbiAgICAgICAgcmV0dXJuIHtcclxuICAgICAgICAgIHg6IHgsXHJcbiAgICAgICAgICB5OiB5XHJcbiAgICAgICAgfTtcclxuICAgICAgfVxyXG4gICAgICBcclxuICAgICAgZnVuY3Rpb24gcmVmcmVzaERyYXdzKCkge1xyXG5cclxuICAgICAgICB2YXIgdyA9ICRjb250YWluZXIud2lkdGgoKTtcclxuICAgICAgICB2YXIgaCA9ICRjb250YWluZXIuaGVpZ2h0KCk7XHJcblxyXG4gICAgICAgIGN0eC5jbGVhclJlY3QoMCwgMCwgdywgaCk7XHJcbiAgICAgICAgXHJcbiAgICAgICAgaWYoIGVkZ2VUb0hpZ2hsaWdodEJlbmRzICkge1xyXG4gICAgICAgICAgcmVuZGVyQmVuZFNoYXBlcyhlZGdlVG9IaWdobGlnaHRCZW5kcyk7XHJcbiAgICAgICAgICByZW5kZXJFbmRQb2ludFNoYXBlcyhlZGdlVG9IaWdobGlnaHRCZW5kcyk7XHJcbiAgICAgICAgfVxyXG4gICAgICB9XHJcbiAgICAgIFxyXG4gICAgICAvLyByZW5kZXIgdGhlIGJlbmQgc2hhcGVzIG9mIHRoZSBnaXZlbiBlZGdlXHJcbiAgICAgIGZ1bmN0aW9uIHJlbmRlckJlbmRTaGFwZXMoZWRnZSkge1xyXG4gICAgICAgIFxyXG4gICAgICAgIGlmKCFlZGdlLmhhc0NsYXNzKCdlZGdlYmVuZGVkaXRpbmctaGFzYmVuZHBvaW50cycpKSB7XHJcbiAgICAgICAgICByZXR1cm47XHJcbiAgICAgICAgfVxyXG4gICAgICAgIFxyXG4gICAgICAgIHZhciBzZWdwdHMgPSBiZW5kUG9pbnRVdGlsaXRpZXMuZ2V0U2VnbWVudFBvaW50cyhlZGdlKTsvL2VkZ2UuX3ByaXZhdGUucmRhdGEuc2VncHRzO1xyXG4gICAgICAgIHZhciBsZW5ndGggPSBnZXRCZW5kU2hhcGVzTGVuZ3RoKGVkZ2UpICogMC42NTtcclxuICAgICAgICBcclxuICAgICAgICB2YXIgc3JjUG9zID0gZWRnZS5zb3VyY2UoKS5wb3NpdGlvbigpO1xyXG4gICAgICAgIHZhciB0Z3RQb3MgPSBlZGdlLnRhcmdldCgpLnBvc2l0aW9uKCk7XHJcbiAgICAgICAgXHJcbiAgICAgICAgdmFyIHdlaWdodHMgPSBlZGdlLmRhdGEoJ2N5ZWRnZWJlbmRlZGl0aW5nV2VpZ2h0cycpO1xyXG4gICAgICAgIHZhciBkaXN0YW5jZXMgPSBlZGdlLmRhdGEoJ2N5ZWRnZWJlbmRlZGl0aW5nRGlzdGFuY2VzJyk7XHJcblxyXG4gICAgICAgIGZvcih2YXIgaSA9IDA7IHNlZ3B0cyAmJiBpIDwgc2VncHRzLmxlbmd0aDsgaSA9IGkgKyAyKXtcclxuICAgICAgICAgIHZhciBiZW5kWCA9IHNlZ3B0c1tpXTtcclxuICAgICAgICAgIHZhciBiZW5kWSA9IHNlZ3B0c1tpICsgMV07XHJcblxyXG4gICAgICAgICAgdmFyIG9sZFN0eWxlID0gY3R4LmZpbGxTdHlsZTtcclxuICAgICAgICAgIGN0eC5maWxsU3R5bGUgPSBcIiMwMDBcIjsgLy8gYmxhY2sgY29sb3JcclxuICAgICAgICAgIHJlbmRlckJlbmRTaGFwZShiZW5kWCwgYmVuZFksIGxlbmd0aCk7XHJcbiAgICAgICAgICBjdHguZmlsbFN0eWxlID0gb2xkU3R5bGU7XHJcbiAgICAgICAgfVxyXG4gICAgICB9XHJcbiAgICAgIFxyXG4gICAgICAvLyByZW5kZXIgYSBiZW5kIHNoYXBlIHdpdGggdGhlIGdpdmVuIHBhcmFtZXRlcnNcclxuICAgICAgZnVuY3Rpb24gcmVuZGVyQmVuZFNoYXBlKGJlbmRYLCBiZW5kWSwgbGVuZ3RoKSB7XHJcbiAgICAgICAgLy8gZ2V0IHRoZSB0b3AgbGVmdCBjb29yZGluYXRlc1xyXG4gICAgICAgIHZhciB0b3BMZWZ0WCA9IGJlbmRYIC0gbGVuZ3RoIC8gMjtcclxuICAgICAgICB2YXIgdG9wTGVmdFkgPSBiZW5kWSAtIGxlbmd0aCAvIDI7XHJcbiAgICAgICAgXHJcbiAgICAgICAgLy8gY29udmVydCB0byByZW5kZXJlZCBwYXJhbWV0ZXJzXHJcbiAgICAgICAgdmFyIHJlbmRlcmVkVG9wTGVmdFBvcyA9IGNvbnZlcnRUb1JlbmRlcmVkUG9zaXRpb24oe3g6IHRvcExlZnRYLCB5OiB0b3BMZWZ0WX0pO1xyXG4gICAgICAgIGxlbmd0aCAqPSBjeS56b29tKCk7XHJcbiAgICAgICAgXHJcbiAgICAgICAgLy8gcmVuZGVyIGJlbmQgc2hhcGVcclxuICAgICAgICBjdHguYmVnaW5QYXRoKCk7XHJcbiAgICAgICAgY3R4LnJlY3QocmVuZGVyZWRUb3BMZWZ0UG9zLngsIHJlbmRlcmVkVG9wTGVmdFBvcy55LCBsZW5ndGgsIGxlbmd0aCk7XHJcbiAgICAgICAgY3R4LmZpbGwoKTtcclxuICAgICAgICBjdHguY2xvc2VQYXRoKCk7XHJcbiAgICAgIH1cclxuICAgICAgXHJcbiAgICAgIC8vIHJlbmRlciB0aGUgZW5kIHBvaW50cyBzaGFwZXMgb2YgdGhlIGdpdmVuIGVkZ2VcclxuICAgICAgZnVuY3Rpb24gcmVuZGVyRW5kUG9pbnRTaGFwZXMoZWRnZSkge1xyXG4gICAgICAgIGlmKCFlZGdlKXtcclxuICAgICAgICAgIHJldHVybjtcclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIHZhciBlZGdlX3B0cyA9IGVkZ2UuX3ByaXZhdGUucnNjcmF0Y2guYWxscHRzO1xyXG4gICAgICAgIGlmKCFlZGdlX3B0cylcclxuICAgICAgICAgIHJldHVybjtcclxuXHJcbiAgICAgICAgdmFyIHNyYyA9IHtcclxuICAgICAgICAgIHg6IGVkZ2VfcHRzWzBdLFxyXG4gICAgICAgICAgeTogZWRnZV9wdHNbMV1cclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIHZhciB0YXJnZXQgPSB7XHJcbiAgICAgICAgICB4OiBlZGdlX3B0c1tlZGdlX3B0cy5sZW5ndGgtMl0sXHJcbiAgICAgICAgICB5OiBlZGdlX3B0c1tlZGdlX3B0cy5sZW5ndGgtMV1cclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIHZhciBsZW5ndGggPSBnZXRCZW5kU2hhcGVzTGVuZ3RoKGVkZ2UpICogMC42NTtcclxuXHJcbiAgICAgICAgdmFyIG9sZFN0cm9rZSA9IGN0eC5zdHJva2VTdHlsZTtcclxuICAgICAgICB2YXIgb2xkV2lkdGggPSBjdHgubGluZVdpZHRoO1xyXG4gICAgICAgIHZhciBvbGRGaWxsID0gY3R4LmZpbGxTdHlsZTtcclxuXHJcbiAgICAgICAgY3R4LmZpbGxTdHlsZSA9IFwiIzAwMFwiIC8vIGJsYWNrXHJcbiAgICAgICAgXHJcbiAgICAgICAgcmVuZGVyRWFjaEVuZFBvaW50U2hhcGUoc3JjLCB0YXJnZXQsIGxlbmd0aCk7XHJcbiAgICAgICAgXHJcbiAgICAgICAgY3R4LnN0cm9rZVN0eWxlID0gb2xkU3Ryb2tlO1xyXG4gICAgICAgIGN0eC5maWxsU3R5bGUgPSBvbGRGaWxsO1xyXG4gICAgICAgIGN0eC5saW5lV2lkdGggPSBvbGRXaWR0aDtcclxuICAgICAgfVxyXG5cclxuICAgICAgZnVuY3Rpb24gcmVuZGVyRWFjaEVuZFBvaW50U2hhcGUoc291cmNlLCB0YXJnZXQsIGxlbmd0aCkge1xyXG4gICAgICAgIC8vIGdldCB0aGUgdG9wIGxlZnQgY29vcmRpbmF0ZXMgb2Ygc291cmNlIGFuZCB0YXJnZXRcclxuICAgICAgICB2YXIgc1RvcExlZnRYID0gc291cmNlLnggLSBsZW5ndGggLyAyO1xyXG4gICAgICAgIHZhciBzVG9wTGVmdFkgPSBzb3VyY2UueSAtIGxlbmd0aCAvIDI7XHJcblxyXG4gICAgICAgIHZhciB0VG9wTGVmdFggPSB0YXJnZXQueCAtIGxlbmd0aCAvIDI7XHJcbiAgICAgICAgdmFyIHRUb3BMZWZ0WSA9IHRhcmdldC55IC0gbGVuZ3RoIC8gMjtcclxuXHJcbiAgICAgICAgLy8gY29udmVydCB0byByZW5kZXJlZCBwYXJhbWV0ZXJzXHJcbiAgICAgICAgdmFyIHJlbmRlcmVkU291cmNlUG9zID0gY29udmVydFRvUmVuZGVyZWRQb3NpdGlvbih7eDogc1RvcExlZnRYLCB5OiBzVG9wTGVmdFl9KTtcclxuICAgICAgICB2YXIgcmVuZGVyZWRUYXJnZXRQb3MgPSBjb252ZXJ0VG9SZW5kZXJlZFBvc2l0aW9uKHt4OiB0VG9wTGVmdFgsIHk6IHRUb3BMZWZ0WX0pO1xyXG4gICAgICAgIGxlbmd0aCA9IGxlbmd0aCAqIGN5Lnpvb20oKSAvIDI7XHJcbiAgICAgICAgXHJcbiAgICAgICAgLy8gcmVuZGVyIGVuZCBwb2ludCBzaGFwZSBmb3Igc291cmNlIGFuZCB0YXJnZXRcclxuICAgICAgICBjdHguYmVnaW5QYXRoKCk7XHJcbiAgICAgICAgY3R4LmFyYyhyZW5kZXJlZFNvdXJjZVBvcy54ICsgbGVuZ3RoLCByZW5kZXJlZFNvdXJjZVBvcy55ICsgbGVuZ3RoLCBsZW5ndGgsIDAsIDIqTWF0aC5QSSwgZmFsc2UpO1xyXG4gICAgICAgIGN0eC5hcmMocmVuZGVyZWRUYXJnZXRQb3MueCArIGxlbmd0aCwgcmVuZGVyZWRUYXJnZXRQb3MueSArIGxlbmd0aCwgbGVuZ3RoLCAwLCAyKk1hdGguUEksIGZhbHNlKTtcclxuICAgICAgICBjdHguZmlsbCgpO1xyXG4gICAgICAgIFxyXG4gICAgICAgIC8vIGRyYXdEaWFtb25kU2hhcGUocmVuZGVyZWRTb3VyY2VQb3MueCwgcmVuZGVyZWRTb3VyY2VQb3MueSwgbGVuZ3RoKTtcclxuICAgICAgICAvLyBkcmF3RGlhbW9uZFNoYXBlKHJlbmRlcmVkVGFyZ2V0UG9zLngsIHJlbmRlcmVkVGFyZ2V0UG9zLnksIGxlbmd0aCk7XHJcblxyXG4gICAgICAgIGZ1bmN0aW9uIGRyYXdEaWFtb25kU2hhcGUodG9wTGVmdFgsIHRvcExlZnRZLCBsZW5ndGgpe1xyXG4gICAgICAgICAgdmFyIGwgPSAobGVuZ3RoKSAvICgzICogNiArIDIpO1xyXG5cclxuICAgICAgICAgIC8vIERyYXcgYWxsIGNvcm5lcnNcclxuICAgICAgICAgIGRyYXdDb3JuZXIodG9wTGVmdFgsIHRvcExlZnRZICsgbGVuZ3RoLzIsIGwsICdsZWZ0Jyk7XHJcbiAgICAgICAgICBkcmF3Q29ybmVyKHRvcExlZnRYICsgbGVuZ3RoLzIsIHRvcExlZnRZLCBsLCAndG9wJyk7XHJcbiAgICAgICAgICBkcmF3Q29ybmVyKHRvcExlZnRYICsgbGVuZ3RoLzIsIHRvcExlZnRZICsgbGVuZ3RoLCBsLCAnYm90dG9tJyk7XHJcbiAgICAgICAgICBkcmF3Q29ybmVyKHRvcExlZnRYICsgbGVuZ3RoLCB0b3BMZWZ0WSArIGxlbmd0aC8yLCBsLCAncmlnaHQnKTtcclxuXHJcbiAgICAgICAgICBkcmF3RGFzaGVkTGluZSh0b3BMZWZ0WCwgdG9wTGVmdFkgKyBsZW5ndGgvMiwgdG9wTGVmdFggKyBsZW5ndGgvMiwgdG9wTGVmdFksIGwpO1xyXG4gICAgICAgICAgZHJhd0Rhc2hlZExpbmUodG9wTGVmdFggKyBsZW5ndGgvMiwgdG9wTGVmdFksIHRvcExlZnRYICsgbGVuZ3RoLCB0b3BMZWZ0WSArIGxlbmd0aC8yLCBsKTtcclxuICAgICAgICAgIGRyYXdEYXNoZWRMaW5lKHRvcExlZnRYICsgbGVuZ3RoLCB0b3BMZWZ0WSArIGxlbmd0aC8yLCB0b3BMZWZ0WCArIGxlbmd0aC8yLCB0b3BMZWZ0WSArIGxlbmd0aCwgbCk7XHJcbiAgICAgICAgICBkcmF3RGFzaGVkTGluZSh0b3BMZWZ0WCArIGxlbmd0aC8yLCB0b3BMZWZ0WSArIGxlbmd0aCwgdG9wTGVmdFgsIHRvcExlZnRZICsgbGVuZ3RoLzIsIGwpO1xyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgZnVuY3Rpb24gZHJhd0Nvcm5lcih4LCB5LCBsLCBjb3JuZXIpe1xyXG4gICAgICAgICAgY3R4LmJlZ2luUGF0aCgpO1xyXG4gICAgICAgICAgY3R4Lm1vdmVUbyh4LCB5KTtcclxuICAgICAgICAgIHN3aXRjaChjb3JuZXIpe1xyXG4gICAgICAgICAgICBjYXNlICdsZWZ0Jzoge1xyXG4gICAgICAgICAgICAgIGN0eC5saW5lVG8oeCArIGwsIHkgLSBsKTtcclxuICAgICAgICAgICAgICBjdHgubGluZVRvKHgsIHkpO1xyXG4gICAgICAgICAgICAgIGN0eC5saW5lVG8oeCArIGwsIHkgKyBsKTtcclxuICAgICAgICAgICAgICBicmVhaztcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICBjYXNlICd0b3AnOiB7XHJcbiAgICAgICAgICAgICAgY3R4LmxpbmVUbyh4IC0gbCwgeSArIGwpO1xyXG4gICAgICAgICAgICAgIGN0eC5saW5lVG8oeCwgeSk7XHJcbiAgICAgICAgICAgICAgY3R4LmxpbmVUbyh4ICsgbCwgeSArIGwpO1xyXG4gICAgICAgICAgICAgIGJyZWFrO1xyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgICAgIGNhc2UgJ3JpZ2h0Jzoge1xyXG4gICAgICAgICAgICAgIGN0eC5saW5lVG8oeCAtIGwsIHkgLSBsKTtcclxuICAgICAgICAgICAgICBjdHgubGluZVRvKHgsIHkpO1xyXG4gICAgICAgICAgICAgIGN0eC5saW5lVG8oeCAtIGwsIHkgKyBsKTtcclxuICAgICAgICAgICAgICBicmVhaztcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICBjYXNlICdib3R0b20nOiB7XHJcbiAgICAgICAgICAgICAgY3R4LmxpbmVUbyh4ICsgbCwgeSAtIGwpO1xyXG4gICAgICAgICAgICAgIGN0eC5saW5lVG8oeCwgeSk7XHJcbiAgICAgICAgICAgICAgY3R4LmxpbmVUbyh4IC0gbCwgeSAtIGwpO1xyXG4gICAgICAgICAgICAgIGJyZWFrO1xyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgICAgIGNhc2UgJ2RlZmF1bHQnOlxyXG4gICAgICAgICAgICAgIHJldHVybjtcclxuICAgICAgICAgIH1cclxuICAgICAgICAgIGN0eC5zdHJva2UoKTtcclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIGZ1bmN0aW9uIGRyYXdEYXNoZWRMaW5lKHgxLCB5MSwgeDIsIHkyLCBsKXtcclxuICAgICAgICAgIGN0eC5iZWdpblBhdGgoKTtcclxuICAgICAgICAgIGN0eC5tb3ZlVG8oeDEsIHkxKTtcclxuICAgICAgICAgIGN0eC5saW5lVG8oeDIsIHkyKTtcclxuICAgICAgICAgIGN0eC5zZXRMaW5lRGFzaChbMipsLGxdKTtcclxuICAgICAgICAgIGN0eC5zdHJva2UoKTtcclxuICAgICAgICAgIGN0eC5zZXRMaW5lRGFzaChbXSk7XHJcbiAgICAgICAgfVxyXG4gICAgICB9XHJcblxyXG4gICAgICAvLyBjaGFuZ2VzIGNvbG9yIHRvbmVcclxuICAgICAgLy8gaHR0cHM6Ly9zdGFja292ZXJmbG93LmNvbS9xdWVzdGlvbnMvNTU2MDI0OC9wcm9ncmFtbWF0aWNhbGx5LWxpZ2h0ZW4tb3ItZGFya2VuLWEtaGV4LWNvbG9yLW9yLXJnYi1hbmQtYmxlbmQtY29sb3JzXHJcbiAgICAgIGZ1bmN0aW9uIHNoYWRlQmxlbmQocCxjMCxjMSkge1xyXG4gICAgICAgIHZhciBuPXA8MD9wKi0xOnAsdT1NYXRoLnJvdW5kLHc9cGFyc2VJbnQ7XHJcbiAgICAgICAgaWYoYzAubGVuZ3RoPjcpe1xyXG4gICAgICAgICAgdmFyIGY9YzAuc3BsaXQoXCIsXCIpLHQ9KGMxP2MxOnA8MD9cInJnYigwLDAsMClcIjpcInJnYigyNTUsMjU1LDI1NSlcIikuc3BsaXQoXCIsXCIpLFI9dyhmWzBdLnNsaWNlKDQpKSxHPXcoZlsxXSksQj13KGZbMl0pO1xyXG4gICAgICAgICAgcmV0dXJuIFwicmdiKFwiKyh1KCh3KHRbMF0uc2xpY2UoNCkpLVIpKm4pK1IpK1wiLFwiKyh1KCh3KHRbMV0pLUcpKm4pK0cpK1wiLFwiKyh1KCh3KHRbMl0pLUIpKm4pK0IpK1wiKVwiXHJcbiAgICAgICAgfVxyXG4gICAgICAgIGVsc2V7XHJcbiAgICAgICAgICB2YXIgZj13KGMwLnNsaWNlKDEpLDE2KSx0PXcoKGMxP2MxOnA8MD9cIiMwMDAwMDBcIjpcIiNGRkZGRkZcIikuc2xpY2UoMSksMTYpLFIxPWY+PjE2LEcxPWY+PjgmMHgwMEZGLEIxPWYmMHgwMDAwRkY7XHJcbiAgICAgICAgICByZXR1cm4gXCIjXCIrKDB4MTAwMDAwMCsodSgoKHQ+PjE2KS1SMSkqbikrUjEpKjB4MTAwMDArKHUoKCh0Pj44JjB4MDBGRiktRzEpKm4pK0cxKSoweDEwMCsodSgoKHQmMHgwMDAwRkYpLUIxKSpuKStCMSkpLnRvU3RyaW5nKDE2KS5zbGljZSgxKVxyXG4gICAgICAgIH1cclxuICAgICAgfVxyXG5cclxuICAgICAgLy8gZ2V0IHRoZSBsZW5ndGggb2YgYmVuZCBwb2ludHMgdG8gYmUgcmVuZGVyZWRcclxuICAgICAgZnVuY3Rpb24gZ2V0QmVuZFNoYXBlc0xlbmd0aChlZGdlKSB7XHJcbiAgICAgICAgdmFyIGZhY3RvciA9IG9wdGlvbnMoKS5iZW5kU2hhcGVTaXplRmFjdG9yO1xyXG4gICAgICAgIGlmIChwYXJzZUZsb2F0KGVkZ2UuY3NzKCd3aWR0aCcpKSA8PSAyLjUpXHJcbiAgICAgICAgICByZXR1cm4gMi41ICogZmFjdG9yO1xyXG4gICAgICAgIGVsc2UgcmV0dXJuIHBhcnNlRmxvYXQoZWRnZS5jc3MoJ3dpZHRoJykpKmZhY3RvcjtcclxuICAgICAgfVxyXG4gICAgICBcclxuICAgICAgLy8gY2hlY2sgaWYgdGhlIHBvaW50IHJlcHJlc2VudGVkIGJ5IHt4LCB5fSBpcyBpbnNpZGUgdGhlIGJlbmQgc2hhcGVcclxuICAgICAgZnVuY3Rpb24gY2hlY2tJZkluc2lkZUJlbmRTaGFwZSh4LCB5LCBsZW5ndGgsIGNlbnRlclgsIGNlbnRlclkpe1xyXG4gICAgICAgIHZhciBtaW5YID0gY2VudGVyWCAtIGxlbmd0aCAvIDI7XHJcbiAgICAgICAgdmFyIG1heFggPSBjZW50ZXJYICsgbGVuZ3RoIC8gMjtcclxuICAgICAgICB2YXIgbWluWSA9IGNlbnRlclkgLSBsZW5ndGggLyAyO1xyXG4gICAgICAgIHZhciBtYXhZID0gY2VudGVyWSArIGxlbmd0aCAvIDI7XHJcbiAgICAgICAgXHJcbiAgICAgICAgdmFyIGluc2lkZSA9ICh4ID49IG1pblggJiYgeCA8PSBtYXhYKSAmJiAoeSA+PSBtaW5ZICYmIHkgPD0gbWF4WSk7XHJcbiAgICAgICAgcmV0dXJuIGluc2lkZTtcclxuICAgICAgfVxyXG5cclxuICAgICAgLy8gZ2V0IHRoZSBpbmRleCBvZiBiZW5kIHBvaW50IGNvbnRhaW5pbmcgdGhlIHBvaW50IHJlcHJlc2VudGVkIGJ5IHt4LCB5fVxyXG4gICAgICBmdW5jdGlvbiBnZXRDb250YWluaW5nQmVuZFNoYXBlSW5kZXgoeCwgeSwgZWRnZSkge1xyXG4gICAgICAgIGlmKGVkZ2UuZGF0YSgnY3llZGdlYmVuZGVkaXRpbmdXZWlnaHRzJykgPT0gbnVsbCB8fCBlZGdlLmRhdGEoJ2N5ZWRnZWJlbmRlZGl0aW5nV2VpZ2h0cycpLmxlbmd0aCA9PSAwKXtcclxuICAgICAgICAgIHJldHVybiAtMTtcclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIHZhciBzZWdwdHMgPSBiZW5kUG9pbnRVdGlsaXRpZXMuZ2V0U2VnbWVudFBvaW50cyhlZGdlKTsvL2VkZ2UuX3ByaXZhdGUucmRhdGEuc2VncHRzO1xyXG4gICAgICAgIHZhciBsZW5ndGggPSBnZXRCZW5kU2hhcGVzTGVuZ3RoKGVkZ2UpO1xyXG5cclxuICAgICAgICBmb3IodmFyIGkgPSAwOyBzZWdwdHMgJiYgaSA8IHNlZ3B0cy5sZW5ndGg7IGkgPSBpICsgMil7XHJcbiAgICAgICAgICB2YXIgYmVuZFggPSBzZWdwdHNbaV07XHJcbiAgICAgICAgICB2YXIgYmVuZFkgPSBzZWdwdHNbaSArIDFdO1xyXG5cclxuICAgICAgICAgIHZhciBpbnNpZGUgPSBjaGVja0lmSW5zaWRlQmVuZFNoYXBlKHgsIHksIGxlbmd0aCwgYmVuZFgsIGJlbmRZKTtcclxuICAgICAgICAgIGlmKGluc2lkZSl7XHJcbiAgICAgICAgICAgIHJldHVybiBpIC8gMjtcclxuICAgICAgICAgIH1cclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIHJldHVybiAtMTtcclxuICAgICAgfTtcclxuXHJcbiAgICAgIGZ1bmN0aW9uIGdldENvbnRhaW5pbmdFbmRQb2ludCh4LCB5LCBlZGdlKXtcclxuICAgICAgICB2YXIgbGVuZ3RoID0gZ2V0QmVuZFNoYXBlc0xlbmd0aChlZGdlKTtcclxuICAgICAgICB2YXIgYWxsUHRzID0gZWRnZS5fcHJpdmF0ZS5yc2NyYXRjaC5hbGxwdHM7XHJcbiAgICAgICAgdmFyIHNyYyA9IHtcclxuICAgICAgICAgIHg6IGFsbFB0c1swXSxcclxuICAgICAgICAgIHk6IGFsbFB0c1sxXVxyXG4gICAgICAgIH1cclxuICAgICAgICB2YXIgdGFyZ2V0ID0ge1xyXG4gICAgICAgICAgeDogYWxsUHRzW2FsbFB0cy5sZW5ndGgtMl0sXHJcbiAgICAgICAgICB5OiBhbGxQdHNbYWxsUHRzLmxlbmd0aC0xXVxyXG4gICAgICAgIH1cclxuICAgICAgICBjb252ZXJ0VG9SZW5kZXJlZFBvc2l0aW9uKHNyYyk7XHJcbiAgICAgICAgY29udmVydFRvUmVuZGVyZWRQb3NpdGlvbih0YXJnZXQpO1xyXG4gICAgICAgIFxyXG4gICAgICAgIC8vIFNvdXJjZTowLCBUYXJnZXQ6MSwgTm9uZTotMVxyXG4gICAgICAgIGlmKGNoZWNrSWZJbnNpZGVCZW5kU2hhcGUoeCwgeSwgbGVuZ3RoLCBzcmMueCwgc3JjLnkpKVxyXG4gICAgICAgICAgcmV0dXJuIDA7XHJcbiAgICAgICAgZWxzZSBpZihjaGVja0lmSW5zaWRlQmVuZFNoYXBlKHgsIHksIGxlbmd0aCwgdGFyZ2V0LngsIHRhcmdldC55KSlcclxuICAgICAgICAgIHJldHVybiAxO1xyXG4gICAgICAgIGVsc2VcclxuICAgICAgICAgIHJldHVybiAtMTtcclxuICAgICAgfVxyXG4gICAgICBcclxuICAgICAgLy8gc3RvcmUgdGhlIGN1cnJlbnQgc3RhdHVzIG9mIGdlc3R1cmVzIGFuZCBzZXQgdGhlbSB0byBmYWxzZVxyXG4gICAgICBmdW5jdGlvbiBkaXNhYmxlR2VzdHVyZXMoKSB7XHJcbiAgICAgICAgbGFzdFBhbm5pbmdFbmFibGVkID0gY3kucGFubmluZ0VuYWJsZWQoKTtcclxuICAgICAgICBsYXN0Wm9vbWluZ0VuYWJsZWQgPSBjeS56b29taW5nRW5hYmxlZCgpO1xyXG4gICAgICAgIGxhc3RCb3hTZWxlY3Rpb25FbmFibGVkID0gY3kuYm94U2VsZWN0aW9uRW5hYmxlZCgpO1xyXG5cclxuICAgICAgICBjeS56b29taW5nRW5hYmxlZChmYWxzZSlcclxuICAgICAgICAgIC5wYW5uaW5nRW5hYmxlZChmYWxzZSlcclxuICAgICAgICAgIC5ib3hTZWxlY3Rpb25FbmFibGVkKGZhbHNlKTtcclxuICAgICAgfVxyXG4gICAgICBcclxuICAgICAgLy8gcmVzZXQgdGhlIGdlc3R1cmVzIGJ5IHRoZWlyIGxhdGVzdCBzdGF0dXNcclxuICAgICAgZnVuY3Rpb24gcmVzZXRHZXN0dXJlcygpIHtcclxuICAgICAgICBjeS56b29taW5nRW5hYmxlZChsYXN0Wm9vbWluZ0VuYWJsZWQpXHJcbiAgICAgICAgICAucGFubmluZ0VuYWJsZWQobGFzdFBhbm5pbmdFbmFibGVkKVxyXG4gICAgICAgICAgLmJveFNlbGVjdGlvbkVuYWJsZWQobGFzdEJveFNlbGVjdGlvbkVuYWJsZWQpO1xyXG4gICAgICB9XHJcblxyXG4gICAgICBmdW5jdGlvbiBtb3ZlQmVuZFBvaW50cyhwb3NpdGlvbkRpZmYsIGVkZ2VzKSB7XHJcbiAgICAgICAgICBlZGdlcy5mb3JFYWNoKGZ1bmN0aW9uKCBlZGdlICl7XHJcbiAgICAgICAgICAgICAgdmFyIHByZXZpb3VzQmVuZFBvaW50c1Bvc2l0aW9uID0gYmVuZFBvaW50VXRpbGl0aWVzLmdldFNlZ21lbnRQb2ludHMoZWRnZSk7XHJcbiAgICAgICAgICAgICAgdmFyIG5leHRCZW5kUG9pbnRzUG9zaXRpb24gPSBbXTtcclxuICAgICAgICAgICAgICBpZiAocHJldmlvdXNCZW5kUG9pbnRzUG9zaXRpb24gIT0gdW5kZWZpbmVkKVxyXG4gICAgICAgICAgICAgIHtcclxuICAgICAgICAgICAgICAgIGZvciAoaT0wOyBpPHByZXZpb3VzQmVuZFBvaW50c1Bvc2l0aW9uLmxlbmd0aDsgaSs9MilcclxuICAgICAgICAgICAgICAgIHtcclxuICAgICAgICAgICAgICAgICAgICBuZXh0QmVuZFBvaW50c1Bvc2l0aW9uLnB1c2goe3g6IHByZXZpb3VzQmVuZFBvaW50c1Bvc2l0aW9uW2ldK3Bvc2l0aW9uRGlmZi54LCB5OiBwcmV2aW91c0JlbmRQb2ludHNQb3NpdGlvbltpKzFdK3Bvc2l0aW9uRGlmZi55fSk7XHJcbiAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgICBlZGdlLmRhdGEoJ2JlbmRQb2ludFBvc2l0aW9ucycsbmV4dEJlbmRQb2ludHNQb3NpdGlvbik7XHJcbiAgICAgICAgICAgICAgfVxyXG5cclxuICAgICAgICAgIH0pO1xyXG4gICAgICAgICAgYmVuZFBvaW50VXRpbGl0aWVzLmluaXRCZW5kUG9pbnRzKG9wdGlvbnMoKS5iZW5kUG9zaXRpb25zRnVuY3Rpb24sIGVkZ2VzKTtcclxuICAgICAgICAgIGN5LnRyaWdnZXIoJ2JlbmRQb2ludE1vdmVtZW50Jyk7XHJcbiAgICAgIH1cclxuXHJcbiAgICAgIHsgIFxyXG4gICAgICAgIGxhc3RQYW5uaW5nRW5hYmxlZCA9IGN5LnBhbm5pbmdFbmFibGVkKCk7XHJcbiAgICAgICAgbGFzdFpvb21pbmdFbmFibGVkID0gY3kuem9vbWluZ0VuYWJsZWQoKTtcclxuICAgICAgICBsYXN0Qm94U2VsZWN0aW9uRW5hYmxlZCA9IGN5LmJveFNlbGVjdGlvbkVuYWJsZWQoKTtcclxuICAgICAgICBcclxuICAgICAgICAvLyBJbml0aWxpemUgdGhlIGVkZ2VUb0hpZ2hsaWdodEJlbmRzIGFuZCBudW1iZXJPZlNlbGVjdGVkRWRnZXNcclxuICAgICAgICB7XHJcbiAgICAgICAgICB2YXIgc2VsZWN0ZWRFZGdlcyA9IGN5LmVkZ2VzKCc6c2VsZWN0ZWQnKTtcclxuICAgICAgICAgIHZhciBudW1iZXJPZlNlbGVjdGVkRWRnZXMgPSBzZWxlY3RlZEVkZ2VzLmxlbmd0aDtcclxuICAgICAgICAgIFxyXG4gICAgICAgICAgaWYgKCBudW1iZXJPZlNlbGVjdGVkRWRnZXMgPT09IDEgKSB7XHJcbiAgICAgICAgICAgIGVkZ2VUb0hpZ2hsaWdodEJlbmRzID0gc2VsZWN0ZWRFZGdlc1swXTtcclxuICAgICAgICAgIH1cclxuICAgICAgICB9XHJcbiAgICAgICAgXHJcbiAgICAgICAgY3kuYmluZCgnem9vbSBwYW4nLCBlWm9vbSA9IGZ1bmN0aW9uICgpIHtcclxuICAgICAgICAgIGlmICggIWVkZ2VUb0hpZ2hsaWdodEJlbmRzICkge1xyXG4gICAgICAgICAgICByZXR1cm47XHJcbiAgICAgICAgICB9XHJcbiAgICAgICAgICBcclxuICAgICAgICAgIHJlZnJlc2hEcmF3cygpO1xyXG4gICAgICAgIH0pO1xyXG5cclxuICAgICAgICBjeS5vbignZGF0YScsICdlZGdlJywgIGZ1bmN0aW9uICgpIHtcclxuICAgICAgICAgIHJlZnJlc2hEcmF3cygpO1xyXG4gICAgICAgIH0pO1xyXG5cclxuICAgICAgICBjeS5vbigncG9zaXRpb24nLCAnbm9kZScsIGVQb3NpdGlvbiA9IGZ1bmN0aW9uICgpIHtcclxuICAgICAgICAgIHZhciBub2RlID0gdGhpcztcclxuICAgICAgICAgIFxyXG4gICAgICAgICAgLy8gSWYgdGhlcmUgaXMgbm8gZWRnZSB0byBoaWdobGlnaHQgYmVuZHMgb3IgdGhpcyBub2RlIGlzIG5vdCBhbnkgZW5kIG9mIHRoYXQgZWRnZSByZXR1cm4gZGlyZWN0bHlcclxuICAgICAgICAgIGlmICggIWVkZ2VUb0hpZ2hsaWdodEJlbmRzIHx8ICEoIGVkZ2VUb0hpZ2hsaWdodEJlbmRzLmRhdGEoJ3NvdXJjZScpID09PSBub2RlLmlkKCkgXHJcbiAgICAgICAgICAgICAgICAgIHx8IGVkZ2VUb0hpZ2hsaWdodEJlbmRzLmRhdGEoJ3RhcmdldCcpID09PSBub2RlLmlkKCkgKSApIHtcclxuICAgICAgICAgICAgcmV0dXJuO1xyXG4gICAgICAgICAgfVxyXG4gICAgICAgICAgXHJcbiAgICAgICAgICByZWZyZXNoRHJhd3MoKTtcclxuICAgICAgICB9KTtcclxuXHJcbiAgICAgICAgY3kub24oJ3N0eWxlJywgJ2VkZ2UuZWRnZWJlbmRlZGl0aW5nLWhhc2JlbmRwb2ludHM6c2VsZWN0ZWQnLCBlU3R5bGUgPSBmdW5jdGlvbiAoKSB7XHJcbiAgICAgICAgICByZWZyZXNoRHJhd3MoKTtcclxuICAgICAgICB9KTtcclxuXHJcbiAgICAgICAgY3kub24oJ3JlbW92ZScsICdlZGdlJywgZVJlbW92ZSA9IGZ1bmN0aW9uICgpIHtcclxuICAgICAgICAgIHZhciBlZGdlID0gdGhpcztcclxuICAgICAgICAgIGlmIChlZGdlLnNlbGVjdGVkKCkpIHtcclxuICAgICAgICAgICAgbnVtYmVyT2ZTZWxlY3RlZEVkZ2VzID0gbnVtYmVyT2ZTZWxlY3RlZEVkZ2VzIC0gMTtcclxuICAgICAgICAgICAgXHJcbiAgICAgICAgICAgIGN5LnN0YXJ0QmF0Y2goKTtcclxuICAgICAgICAgICAgXHJcbiAgICAgICAgICAgIGlmIChlZGdlVG9IaWdobGlnaHRCZW5kcykge1xyXG4gICAgICAgICAgICAgIGVkZ2VUb0hpZ2hsaWdodEJlbmRzLnJlbW92ZUNsYXNzKCdjeS1lZGdlLWJlbmQtZWRpdGluZy1oaWdobGlnaHQtYmVuZHMnKTtcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICBcclxuICAgICAgICAgICAgaWYgKG51bWJlck9mU2VsZWN0ZWRFZGdlcyA9PT0gMSkge1xyXG4gICAgICAgICAgICAgIHZhciBzZWxlY3RlZEVkZ2VzID0gY3kuZWRnZXMoJzpzZWxlY3RlZCcpO1xyXG4gICAgICAgICAgICAgIFxyXG4gICAgICAgICAgICAgIC8vIElmIHVzZXIgcmVtb3ZlcyBhbGwgc2VsZWN0ZWQgZWRnZXMgYXQgYSBzaW5nbGUgb3BlcmF0aW9uIHRoZW4gb3VyICdudW1iZXJPZlNlbGVjdGVkRWRnZXMnXHJcbiAgICAgICAgICAgICAgLy8gbWF5IGJlIG1pc2xlYWRpbmcuIFRoZXJlZm9yZSB3ZSBuZWVkIHRvIGNoZWNrIGlmIHRoZSBudW1iZXIgb2YgZWRnZXMgdG8gaGlnaGxpZ2h0IGlzIHJlYWx5IDEgaGVyZS5cclxuICAgICAgICAgICAgICBpZiAoc2VsZWN0ZWRFZGdlcy5sZW5ndGggPT09IDEpIHtcclxuICAgICAgICAgICAgICAgIGVkZ2VUb0hpZ2hsaWdodEJlbmRzID0gc2VsZWN0ZWRFZGdlc1swXTtcclxuICAgICAgICAgICAgICAgIGVkZ2VUb0hpZ2hsaWdodEJlbmRzLmFkZENsYXNzKCdjeS1lZGdlLWJlbmQtZWRpdGluZy1oaWdobGlnaHQtYmVuZHMnKTtcclxuICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgZWxzZSB7XHJcbiAgICAgICAgICAgICAgICBlZGdlVG9IaWdobGlnaHRCZW5kcyA9IHVuZGVmaW5lZDtcclxuICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgZWxzZSB7XHJcbiAgICAgICAgICAgICAgZWRnZVRvSGlnaGxpZ2h0QmVuZHMgPSB1bmRlZmluZWQ7XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgXHJcbiAgICAgICAgICAgIGN5LmVuZEJhdGNoKCk7XHJcbiAgICAgICAgICB9XHJcbiAgICAgICAgICByZWZyZXNoRHJhd3MoKTtcclxuICAgICAgICB9KTtcclxuICAgICAgICBcclxuICAgICAgICAgY3kub24oJ2FkZCcsICdlZGdlJywgZUFkZCA9IGZ1bmN0aW9uICgpIHtcclxuICAgICAgICAgIHZhciBlZGdlID0gdGhpcztcclxuICAgICAgICAgIGlmIChlZGdlLnNlbGVjdGVkKCkpIHtcclxuICAgICAgICAgICAgbnVtYmVyT2ZTZWxlY3RlZEVkZ2VzID0gbnVtYmVyT2ZTZWxlY3RlZEVkZ2VzICsgMTtcclxuICAgICAgICAgICAgXHJcbiAgICAgICAgICAgIGN5LnN0YXJ0QmF0Y2goKTtcclxuICAgICAgICAgICAgXHJcbiAgICAgICAgICAgIGlmIChlZGdlVG9IaWdobGlnaHRCZW5kcykge1xyXG4gICAgICAgICAgICAgIGVkZ2VUb0hpZ2hsaWdodEJlbmRzLnJlbW92ZUNsYXNzKCdjeS1lZGdlLWJlbmQtZWRpdGluZy1oaWdobGlnaHQtYmVuZHMnKTtcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICBcclxuICAgICAgICAgICAgaWYgKG51bWJlck9mU2VsZWN0ZWRFZGdlcyA9PT0gMSkge1xyXG4gICAgICAgICAgICAgIGVkZ2VUb0hpZ2hsaWdodEJlbmRzID0gZWRnZTtcclxuICAgICAgICAgICAgICBlZGdlVG9IaWdobGlnaHRCZW5kcy5hZGRDbGFzcygnY3ktZWRnZS1iZW5kLWVkaXRpbmctaGlnaGxpZ2h0LWJlbmRzJyk7XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgZWxzZSB7XHJcbiAgICAgICAgICAgICAgZWRnZVRvSGlnaGxpZ2h0QmVuZHMgPSB1bmRlZmluZWQ7XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgXHJcbiAgICAgICAgICAgIGN5LmVuZEJhdGNoKCk7XHJcbiAgICAgICAgICB9XHJcbiAgICAgICAgICByZWZyZXNoRHJhd3MoKTtcclxuICAgICAgICB9KTtcclxuICAgICAgICBcclxuICAgICAgICBjeS5vbignc2VsZWN0JywgJ2VkZ2UnLCBlU2VsZWN0ID0gZnVuY3Rpb24gKCkge1xyXG4gICAgICAgICAgdmFyIGVkZ2UgPSB0aGlzO1xyXG4gICAgICAgICAgbnVtYmVyT2ZTZWxlY3RlZEVkZ2VzID0gbnVtYmVyT2ZTZWxlY3RlZEVkZ2VzICsgMTtcclxuICAgICAgICAgIFxyXG4gICAgICAgICAgY3kuc3RhcnRCYXRjaCgpO1xyXG4gICAgICAgICAgICBcclxuICAgICAgICAgIGlmIChlZGdlVG9IaWdobGlnaHRCZW5kcykge1xyXG4gICAgICAgICAgICBlZGdlVG9IaWdobGlnaHRCZW5kcy5yZW1vdmVDbGFzcygnY3ktZWRnZS1iZW5kLWVkaXRpbmctaGlnaGxpZ2h0LWJlbmRzJyk7XHJcbiAgICAgICAgICB9XHJcbiAgICAgICAgICAgIFxyXG4gICAgICAgICAgaWYgKG51bWJlck9mU2VsZWN0ZWRFZGdlcyA9PT0gMSkge1xyXG4gICAgICAgICAgICBlZGdlVG9IaWdobGlnaHRCZW5kcyA9IGVkZ2U7XHJcbiAgICAgICAgICAgIGVkZ2VUb0hpZ2hsaWdodEJlbmRzLmFkZENsYXNzKCdjeS1lZGdlLWJlbmQtZWRpdGluZy1oaWdobGlnaHQtYmVuZHMnKTtcclxuICAgICAgICAgIH1cclxuICAgICAgICAgIGVsc2Uge1xyXG4gICAgICAgICAgICBlZGdlVG9IaWdobGlnaHRCZW5kcyA9IHVuZGVmaW5lZDtcclxuICAgICAgICAgIH1cclxuICAgICAgICAgIFxyXG4gICAgICAgICAgY3kuZW5kQmF0Y2goKTtcclxuICAgICAgICAgIHJlZnJlc2hEcmF3cygpO1xyXG4gICAgICAgIH0pO1xyXG4gICAgICAgIFxyXG4gICAgICAgIGN5Lm9uKCd1bnNlbGVjdCcsICdlZGdlJywgZVVuc2VsZWN0ID0gZnVuY3Rpb24gKCkge1xyXG4gICAgICAgICAgbnVtYmVyT2ZTZWxlY3RlZEVkZ2VzID0gbnVtYmVyT2ZTZWxlY3RlZEVkZ2VzIC0gMTtcclxuICAgICAgICAgICAgXHJcbiAgICAgICAgICBjeS5zdGFydEJhdGNoKCk7XHJcbiAgICAgICAgICAgIFxyXG4gICAgICAgICAgaWYgKGVkZ2VUb0hpZ2hsaWdodEJlbmRzKSB7XHJcbiAgICAgICAgICAgIGVkZ2VUb0hpZ2hsaWdodEJlbmRzLnJlbW92ZUNsYXNzKCdjeS1lZGdlLWJlbmQtZWRpdGluZy1oaWdobGlnaHQtYmVuZHMnKTtcclxuICAgICAgICAgIH1cclxuICAgICAgICAgICAgXHJcbiAgICAgICAgICBpZiAobnVtYmVyT2ZTZWxlY3RlZEVkZ2VzID09PSAxKSB7XHJcbiAgICAgICAgICAgIHZhciBzZWxlY3RlZEVkZ2VzID0gY3kuZWRnZXMoJzpzZWxlY3RlZCcpO1xyXG4gICAgICAgICAgICBcclxuICAgICAgICAgICAgLy8gSWYgdXNlciB1bnNlbGVjdHMgYWxsIGVkZ2VzIGJ5IHRhcHBpbmcgdG8gdGhlIGNvcmUgZXRjLiB0aGVuIG91ciAnbnVtYmVyT2ZTZWxlY3RlZEVkZ2VzJ1xyXG4gICAgICAgICAgICAvLyBtYXkgYmUgbWlzbGVhZGluZy4gVGhlcmVmb3JlIHdlIG5lZWQgdG8gY2hlY2sgaWYgdGhlIG51bWJlciBvZiBlZGdlcyB0byBoaWdobGlnaHQgaXMgcmVhbHkgMSBoZXJlLlxyXG4gICAgICAgICAgICBpZiAoc2VsZWN0ZWRFZGdlcy5sZW5ndGggPT09IDEpIHtcclxuICAgICAgICAgICAgICBlZGdlVG9IaWdobGlnaHRCZW5kcyA9IHNlbGVjdGVkRWRnZXNbMF07XHJcbiAgICAgICAgICAgICAgZWRnZVRvSGlnaGxpZ2h0QmVuZHMuYWRkQ2xhc3MoJ2N5LWVkZ2UtYmVuZC1lZGl0aW5nLWhpZ2hsaWdodC1iZW5kcycpO1xyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgICAgIGVsc2Uge1xyXG4gICAgICAgICAgICAgIGVkZ2VUb0hpZ2hsaWdodEJlbmRzID0gdW5kZWZpbmVkO1xyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgICB9XHJcbiAgICAgICAgICBlbHNlIHtcclxuICAgICAgICAgICAgZWRnZVRvSGlnaGxpZ2h0QmVuZHMgPSB1bmRlZmluZWQ7XHJcbiAgICAgICAgICB9XHJcbiAgICAgICAgICBcclxuICAgICAgICAgIGN5LmVuZEJhdGNoKCk7XHJcbiAgICAgICAgICByZWZyZXNoRHJhd3MoKTtcclxuICAgICAgICB9KTtcclxuICAgICAgICBcclxuICAgICAgICB2YXIgbW92ZWRCZW5kSW5kZXg7XHJcbiAgICAgICAgdmFyIG1vdmVkQmVuZEVkZ2U7XHJcbiAgICAgICAgdmFyIG1vdmVCZW5kUGFyYW07XHJcbiAgICAgICAgdmFyIGNyZWF0ZUJlbmRPbkRyYWc7XHJcbiAgICAgICAgdmFyIG1vdmVkRW5kUG9pbnQ7XHJcbiAgICAgICAgdmFyIGR1bW15Tm9kZTtcclxuICAgICAgICB2YXIgZGV0YWNoZWROb2RlO1xyXG4gICAgICAgIHZhciBub2RlVG9BdHRhY2g7XHJcbiAgICAgICAgXHJcbiAgICAgICAgY3kub24oJ3RhcHN0YXJ0JywgJ2VkZ2UnLCBlVGFwU3RhcnQgPSBmdW5jdGlvbiAoZXZlbnQpIHtcclxuICAgICAgICAgIHZhciBlZGdlID0gdGhpcztcclxuXHJcbiAgICAgICAgICBpZiAoIWVkZ2VUb0hpZ2hsaWdodEJlbmRzIHx8IGVkZ2VUb0hpZ2hsaWdodEJlbmRzLmlkKCkgIT09IGVkZ2UuaWQoKSkge1xyXG4gICAgICAgICAgICBjcmVhdGVCZW5kT25EcmFnID0gZmFsc2U7XHJcbiAgICAgICAgICAgIHJldHVybjtcclxuICAgICAgICAgIH1cclxuICAgICAgICAgIFxyXG4gICAgICAgICAgbW92ZWRCZW5kRWRnZSA9IGVkZ2U7XHJcbiAgICAgICAgICBcclxuICAgICAgICAgIG1vdmVCZW5kUGFyYW0gPSB7XHJcbiAgICAgICAgICAgIGVkZ2U6IGVkZ2UsXHJcbiAgICAgICAgICAgIHdlaWdodHM6IGVkZ2UuZGF0YSgnY3llZGdlYmVuZGVkaXRpbmdXZWlnaHRzJykgPyBbXS5jb25jYXQoZWRnZS5kYXRhKCdjeWVkZ2ViZW5kZWRpdGluZ1dlaWdodHMnKSkgOiBbXSxcclxuICAgICAgICAgICAgZGlzdGFuY2VzOiBlZGdlLmRhdGEoJ2N5ZWRnZWJlbmRlZGl0aW5nRGlzdGFuY2VzJykgPyBbXS5jb25jYXQoZWRnZS5kYXRhKCdjeWVkZ2ViZW5kZWRpdGluZ0Rpc3RhbmNlcycpKSA6IFtdXHJcbiAgICAgICAgICB9O1xyXG4gICAgICAgICAgXHJcbiAgICAgICAgICB2YXIgY3lQb3MgPSBldmVudC5wb3NpdGlvbiB8fCBldmVudC5jeVBvc2l0aW9uO1xyXG4gICAgICAgICAgdmFyIGN5UG9zWCA9IGN5UG9zLng7XHJcbiAgICAgICAgICB2YXIgY3lQb3NZID0gY3lQb3MueTtcclxuXHJcbiAgICAgICAgICB2YXIgaW5kZXggPSBnZXRDb250YWluaW5nQmVuZFNoYXBlSW5kZXgoY3lQb3NYLCBjeVBvc1ksIGVkZ2UpO1xyXG4gICAgICAgICAgXHJcbiAgICAgICAgICAvLyBHZXQgd2hpY2ggZW5kIHBvaW50IGhhcyBiZWVuIGNsaWNrZWQgKFNvdXJjZTowLCBUYXJnZXQ6MSwgTm9uZTotMSlcclxuICAgICAgICAgIHZhciBlbmRQb2ludCA9IGdldENvbnRhaW5pbmdFbmRQb2ludChjeVBvc1gsIGN5UG9zWSwgZWRnZSk7XHJcblxyXG4gICAgICAgICAgaWYoZW5kUG9pbnQgPT0gMCB8fCBlbmRQb2ludCA9PSAxKXtcclxuICAgICAgICAgICAgbW92ZWRFbmRQb2ludCA9IGVuZFBvaW50O1xyXG4gICAgICAgICAgICBkZXRhY2hlZE5vZGUgPSAoZW5kUG9pbnQgPT0gMCkgPyBtb3ZlZEJlbmRFZGdlLnNvdXJjZSgpIDogbW92ZWRCZW5kRWRnZS50YXJnZXQoKTtcclxuXHJcbiAgICAgICAgICAgIHZhciBkaXNjb25uZWN0ZWRFbmQgPSAoZW5kUG9pbnQgPT0gMCkgPyAnc291cmNlJyA6ICd0YXJnZXQnO1xyXG4gICAgICAgICAgICB2YXIgcmVzdWx0ID0gcmVjb25uZWN0aW9uVXRpbGl0aWVzLmRpc2Nvbm5lY3RFZGdlKG1vdmVkQmVuZEVkZ2UsIGN5LCBldmVudC5yZW5kZXJlZFBvc2l0aW9uLCBkaXNjb25uZWN0ZWRFbmQpO1xyXG4gICAgICAgICAgICBcclxuICAgICAgICAgICAgZHVtbXlOb2RlID0gcmVzdWx0LmR1bW15Tm9kZTtcclxuICAgICAgICAgICAgbW92ZWRCZW5kRWRnZSA9IHJlc3VsdC5lZGdlO1xyXG5cclxuICAgICAgICAgICAgZGlzYWJsZUdlc3R1cmVzKCk7XHJcbiAgICAgICAgICB9XHJcbiAgICAgICAgICBlbHNlIGlmIChpbmRleCAhPSAtMSkge1xyXG4gICAgICAgICAgICBtb3ZlZEJlbmRJbmRleCA9IGluZGV4O1xyXG4gICAgICAgICAgICAvLyBtb3ZlZEJlbmRFZGdlID0gZWRnZTtcclxuICAgICAgICAgICAgZGlzYWJsZUdlc3R1cmVzKCk7XHJcbiAgICAgICAgICB9XHJcbiAgICAgICAgICBlbHNlIHtcclxuICAgICAgICAgICAgY3JlYXRlQmVuZE9uRHJhZyA9IHRydWU7XHJcbiAgICAgICAgICB9XHJcbiAgICAgICAgfSk7XHJcbiAgICAgICAgXHJcbiAgICAgICAgY3kub24oJ3RhcGRyYWcnLCBlVGFwRHJhZyA9IGZ1bmN0aW9uIChldmVudCkge1xyXG4gICAgICAgICAgdmFyIGVkZ2UgPSBtb3ZlZEJlbmRFZGdlO1xyXG4gICAgICAgICAgaWYobW92ZWRCZW5kRWRnZSAhPT0gdW5kZWZpbmVkICYmIGJlbmRQb2ludFV0aWxpdGllcy5pc0lnbm9yZWRFZGdlKGVkZ2UpICkge1xyXG4gICAgICAgICAgICByZXR1cm47XHJcbiAgICAgICAgICB9XHJcblxyXG4gICAgICAgICAgaWYoY3JlYXRlQmVuZE9uRHJhZykge1xyXG4gICAgICAgICAgICB2YXIgY3lQb3MgPSBldmVudC5wb3NpdGlvbiB8fCBldmVudC5jeVBvc2l0aW9uO1xyXG4gICAgICAgICAgICBiZW5kUG9pbnRVdGlsaXRpZXMuYWRkQmVuZFBvaW50KGVkZ2UsIGN5UG9zKTtcclxuICAgICAgICAgICAgbW92ZWRCZW5kSW5kZXggPSBnZXRDb250YWluaW5nQmVuZFNoYXBlSW5kZXgoY3lQb3MueCwgY3lQb3MueSwgZWRnZSk7XHJcbiAgICAgICAgICAgIG1vdmVkQmVuZEVkZ2UgPSBlZGdlO1xyXG4gICAgICAgICAgICBjcmVhdGVCZW5kT25EcmFnID0gdW5kZWZpbmVkO1xyXG4gICAgICAgICAgICBkaXNhYmxlR2VzdHVyZXMoKTtcclxuICAgICAgICAgIH1cclxuICAgICAgICAgIFxyXG4gICAgICAgICAgaWYgKG1vdmVkQmVuZEVkZ2UgPT09IHVuZGVmaW5lZCB8fCAobW92ZWRCZW5kSW5kZXggPT09IHVuZGVmaW5lZCAmJiBtb3ZlZEVuZFBvaW50ID09PSB1bmRlZmluZWQpKSB7XHJcbiAgICAgICAgICAgIHJldHVybjtcclxuICAgICAgICAgIH1cclxuXHJcbiAgICAgICAgICAvLyBVcGRhdGUgZW5kIHBvaW50IGxvY2F0aW9uIChTb3VyY2U6MCwgVGFyZ2V0OjEpXHJcbiAgICAgICAgICBpZihtb3ZlZEVuZFBvaW50ICE9IC0xICYmIGR1bW15Tm9kZSl7XHJcbiAgICAgICAgICAgIHZhciBuZXdQb3MgPSBldmVudC5wb3NpdGlvbiB8fCBldmVudC5jeVBvc2l0aW9uO1xyXG4gICAgICAgICAgICBkdW1teU5vZGUucG9zaXRpb24obmV3UG9zKTtcclxuICAgICAgICAgIH1cclxuICAgICAgICAgIC8vIFVwZGF0ZSBiZW5kIHBvaW50IGxvY2F0aW9uXHJcbiAgICAgICAgICBlbHNlIGlmKG1vdmVkQmVuZEluZGV4ICE9IHVuZGVmaW5lZCl7IFxyXG4gICAgICAgICAgICB2YXIgd2VpZ2h0cyA9IGVkZ2UuZGF0YSgnY3llZGdlYmVuZGVkaXRpbmdXZWlnaHRzJyk7XHJcbiAgICAgICAgICAgIHZhciBkaXN0YW5jZXMgPSBlZGdlLmRhdGEoJ2N5ZWRnZWJlbmRlZGl0aW5nRGlzdGFuY2VzJyk7XHJcbiAgICAgICAgICAgIFxyXG4gICAgICAgICAgICB2YXIgcmVsYXRpdmVCZW5kUG9zaXRpb24gPSBiZW5kUG9pbnRVdGlsaXRpZXMuY29udmVydFRvUmVsYXRpdmVCZW5kUG9zaXRpb24oZWRnZSwgZXZlbnQucG9zaXRpb24gfHwgZXZlbnQuY3lQb3NpdGlvbik7XHJcbiAgICAgICAgICAgIHdlaWdodHNbbW92ZWRCZW5kSW5kZXhdID0gcmVsYXRpdmVCZW5kUG9zaXRpb24ud2VpZ2h0O1xyXG4gICAgICAgICAgICBkaXN0YW5jZXNbbW92ZWRCZW5kSW5kZXhdID0gcmVsYXRpdmVCZW5kUG9zaXRpb24uZGlzdGFuY2U7XHJcbiAgICAgICAgICAgIFxyXG4gICAgICAgICAgICBlZGdlLmRhdGEoJ2N5ZWRnZWJlbmRlZGl0aW5nV2VpZ2h0cycsIHdlaWdodHMpO1xyXG4gICAgICAgICAgICBlZGdlLmRhdGEoJ2N5ZWRnZWJlbmRlZGl0aW5nRGlzdGFuY2VzJywgZGlzdGFuY2VzKTtcclxuICAgICAgICAgIH1cclxuICAgICAgICAgIFxyXG4gICAgICAgICAgaWYoZXZlbnQudGFyZ2V0ICYmIGV2ZW50LnRhcmdldFswXSAmJiBldmVudC50YXJnZXQuaXNOb2RlKCkpe1xyXG4gICAgICAgICAgICBub2RlVG9BdHRhY2ggPSBldmVudC50YXJnZXQ7XHJcbiAgICAgICAgICB9XHJcblxyXG4gICAgICAgICAgcmVmcmVzaERyYXdzKCk7XHJcbiAgICAgICAgfSk7XHJcbiAgICAgICAgXHJcbiAgICAgICAgY3kub24oJ3RhcGVuZCcsIGVUYXBFbmQgPSBmdW5jdGlvbiAoZXZlbnQpIHtcclxuICAgICAgICAgIHZhciBlZGdlID0gbW92ZWRCZW5kRWRnZTtcclxuICAgICAgICAgIFxyXG4gICAgICAgICAgaWYoIGVkZ2UgIT09IHVuZGVmaW5lZCApIHtcclxuICAgICAgICAgICAgaWYoIG1vdmVkQmVuZEluZGV4ICE9IHVuZGVmaW5lZCApIHtcclxuICAgICAgICAgICAgICB2YXIgc3RhcnRYID0gZWRnZS5zb3VyY2UoKS5wb3NpdGlvbigneCcpO1xyXG4gICAgICAgICAgICAgIHZhciBzdGFydFkgPSBlZGdlLnNvdXJjZSgpLnBvc2l0aW9uKCd5Jyk7XHJcbiAgICAgICAgICAgICAgdmFyIGVuZFggPSBlZGdlLnRhcmdldCgpLnBvc2l0aW9uKCd4Jyk7XHJcbiAgICAgICAgICAgICAgdmFyIGVuZFkgPSBlZGdlLnRhcmdldCgpLnBvc2l0aW9uKCd5Jyk7XHJcbiAgICAgICAgICAgICAgXHJcbiAgICAgICAgICAgICAgdmFyIHNlZ1B0cyA9IGJlbmRQb2ludFV0aWxpdGllcy5nZXRTZWdtZW50UG9pbnRzKGVkZ2UpO1xyXG4gICAgICAgICAgICAgIHZhciBhbGxQdHMgPSBbc3RhcnRYLCBzdGFydFldLmNvbmNhdChzZWdQdHMpLmNvbmNhdChbZW5kWCwgZW5kWV0pO1xyXG4gICAgICAgICAgICAgIFxyXG4gICAgICAgICAgICAgIHZhciBwb2ludEluZGV4ID0gbW92ZWRCZW5kSW5kZXggKyAxO1xyXG4gICAgICAgICAgICAgIHZhciBwcmVJbmRleCA9IHBvaW50SW5kZXggLSAxO1xyXG4gICAgICAgICAgICAgIHZhciBwb3NJbmRleCA9IHBvaW50SW5kZXggKyAxO1xyXG4gICAgICAgICAgICAgIFxyXG4gICAgICAgICAgICAgIHZhciBwb2ludCA9IHtcclxuICAgICAgICAgICAgICAgIHg6IGFsbFB0c1syICogcG9pbnRJbmRleF0sXHJcbiAgICAgICAgICAgICAgICB5OiBhbGxQdHNbMiAqIHBvaW50SW5kZXggKyAxXVxyXG4gICAgICAgICAgICAgIH07XHJcbiAgICAgICAgICAgICAgXHJcbiAgICAgICAgICAgICAgdmFyIHByZVBvaW50ID0ge1xyXG4gICAgICAgICAgICAgICAgeDogYWxsUHRzWzIgKiBwcmVJbmRleF0sXHJcbiAgICAgICAgICAgICAgICB5OiBhbGxQdHNbMiAqIHByZUluZGV4ICsgMV1cclxuICAgICAgICAgICAgICB9O1xyXG4gICAgICAgICAgICAgIFxyXG4gICAgICAgICAgICAgIHZhciBwb3NQb2ludCA9IHtcclxuICAgICAgICAgICAgICAgIHg6IGFsbFB0c1syICogcG9zSW5kZXhdLFxyXG4gICAgICAgICAgICAgICAgeTogYWxsUHRzWzIgKiBwb3NJbmRleCArIDFdXHJcbiAgICAgICAgICAgICAgfTtcclxuICAgICAgICAgICAgICBcclxuICAgICAgICAgICAgICB2YXIgbmVhclRvTGluZTtcclxuICAgICAgICAgICAgICBcclxuICAgICAgICAgICAgICBpZiggKCBwb2ludC54ID09PSBwcmVQb2ludC54ICYmIHBvaW50LnkgPT09IHByZVBvaW50LnkgKSB8fCAoIHBvaW50LnggPT09IHByZVBvaW50LnggJiYgcG9pbnQueSA9PT0gcHJlUG9pbnQueSApICkge1xyXG4gICAgICAgICAgICAgICAgbmVhclRvTGluZSA9IHRydWU7XHJcbiAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgIGVsc2Uge1xyXG4gICAgICAgICAgICAgICAgdmFyIG0xID0gKCBwcmVQb2ludC55IC0gcG9zUG9pbnQueSApIC8gKCBwcmVQb2ludC54IC0gcG9zUG9pbnQueCApO1xyXG4gICAgICAgICAgICAgICAgdmFyIG0yID0gLTEgLyBtMTtcclxuXHJcbiAgICAgICAgICAgICAgICB2YXIgc3JjVGd0UG9pbnRzQW5kVGFuZ2VudHMgPSB7XHJcbiAgICAgICAgICAgICAgICAgIHNyY1BvaW50OiBwcmVQb2ludCxcclxuICAgICAgICAgICAgICAgICAgdGd0UG9pbnQ6IHBvc1BvaW50LFxyXG4gICAgICAgICAgICAgICAgICBtMTogbTEsXHJcbiAgICAgICAgICAgICAgICAgIG0yOiBtMlxyXG4gICAgICAgICAgICAgICAgfTtcclxuXHJcbiAgICAgICAgICAgICAgICAvL2dldCB0aGUgaW50ZXJzZWN0aW9uIG9mIHRoZSBjdXJyZW50IHNlZ21lbnQgd2l0aCB0aGUgbmV3IGJlbmQgcG9pbnRcclxuICAgICAgICAgICAgICAgIHZhciBjdXJyZW50SW50ZXJzZWN0aW9uID0gYmVuZFBvaW50VXRpbGl0aWVzLmdldEludGVyc2VjdGlvbihlZGdlLCBwb2ludCwgc3JjVGd0UG9pbnRzQW5kVGFuZ2VudHMpO1xyXG4gICAgICAgICAgICAgICAgdmFyIGRpc3QgPSBNYXRoLnNxcnQoIE1hdGgucG93KCAocG9pbnQueCAtIGN1cnJlbnRJbnRlcnNlY3Rpb24ueCksIDIgKSBcclxuICAgICAgICAgICAgICAgICAgICAgICAgKyBNYXRoLnBvdyggKHBvaW50LnkgLSBjdXJyZW50SW50ZXJzZWN0aW9uLnkpLCAyICkpO1xyXG4gICAgICAgICAgICAgICAgXHJcbiAgICAgICAgICAgICAgICAvLyB2YXIgbGVuZ3RoID0gTWF0aC5zcXJ0KCBNYXRoLnBvdyggKHBvc1BvaW50LnggLSBwcmVQb2ludC54KSwgMiApIFxyXG4gICAgICAgICAgICAgICAgLy8gICAgICAgICArIE1hdGgucG93KCAocG9zUG9pbnQueSAtIHByZVBvaW50LnkpLCAyICkpO1xyXG4gICAgICAgICAgICAgICAgXHJcbiAgICAgICAgICAgICAgICBpZiggZGlzdCAgPCA4ICkge1xyXG4gICAgICAgICAgICAgICAgICBuZWFyVG9MaW5lID0gdHJ1ZTtcclxuICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICAgIFxyXG4gICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICBcclxuICAgICAgICAgICAgICBpZiggbmVhclRvTGluZSApXHJcbiAgICAgICAgICAgICAge1xyXG4gICAgICAgICAgICAgICAgYmVuZFBvaW50VXRpbGl0aWVzLnJlbW92ZUJlbmRQb2ludChlZGdlLCBtb3ZlZEJlbmRJbmRleCk7XHJcbiAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgIFxyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgICAgIGVsc2UgaWYoZHVtbXlOb2RlICE9IHVuZGVmaW5lZCAmJiAobW92ZWRFbmRQb2ludCA9PSAwIHx8IG1vdmVkRW5kUG9pbnQgPT0gMSkgKXtcclxuICAgICAgICAgICAgICBcclxuICAgICAgICAgICAgICB2YXIgbmV3Tm9kZSA9IGRldGFjaGVkTm9kZTtcclxuICAgICAgICAgICAgICB2YXIgaXNWYWxpZCA9ICd2YWxpZCc7XHJcbiAgICAgICAgICAgICAgdmFyIGxvY2F0aW9uID0gKG1vdmVkRW5kUG9pbnQgPT0gMCkgPyAnc291cmNlJyA6ICd0YXJnZXQnO1xyXG5cclxuICAgICAgICAgICAgICAvLyB2YWxpZGF0ZSBlZGdlIHJlY29ubmVjdGlvblxyXG4gICAgICAgICAgICAgIGlmKG5vZGVUb0F0dGFjaCl7XHJcbiAgICAgICAgICAgICAgICB2YXIgbmV3U291cmNlID0gKG1vdmVkRW5kUG9pbnQgPT0gMCkgPyBub2RlVG9BdHRhY2ggOiBlZGdlLnNvdXJjZSgpO1xyXG4gICAgICAgICAgICAgICAgdmFyIG5ld1RhcmdldCA9IChtb3ZlZEVuZFBvaW50ID09IDEpID8gbm9kZVRvQXR0YWNoIDogZWRnZS50YXJnZXQoKTtcclxuICAgICAgICAgICAgICAgIGlmKHR5cGVvZiB2YWxpZGF0ZUVkZ2UgPT09IFwiZnVuY3Rpb25cIilcclxuICAgICAgICAgICAgICAgICAgaXNWYWxpZCA9IHZhbGlkYXRlRWRnZShlZGdlLCBuZXdTb3VyY2UsIG5ld1RhcmdldCk7XHJcbiAgICAgICAgICAgICAgICBuZXdOb2RlID0gKGlzVmFsaWQgPT09ICd2YWxpZCcpID8gbm9kZVRvQXR0YWNoIDogZGV0YWNoZWROb2RlO1xyXG4gICAgICAgICAgICAgIH1cclxuXHJcbiAgICAgICAgICAgICAgdmFyIG5ld1NvdXJjZSA9IChtb3ZlZEVuZFBvaW50ID09IDApID8gbmV3Tm9kZSA6IGVkZ2Uuc291cmNlKCk7XHJcbiAgICAgICAgICAgICAgdmFyIG5ld1RhcmdldCA9IChtb3ZlZEVuZFBvaW50ID09IDEpID8gbmV3Tm9kZSA6IGVkZ2UudGFyZ2V0KCk7XHJcbiAgICAgICAgICAgICAgZWRnZSA9IHJlY29ubmVjdGlvblV0aWxpdGllcy5jb25uZWN0RWRnZShlZGdlLCBkZXRhY2hlZE5vZGUsIGxvY2F0aW9uKTtcclxuXHJcbiAgICAgICAgICAgICAgaWYoZGV0YWNoZWROb2RlLmlkKCkgIT09IG5ld05vZGUuaWQoKSl7XHJcbiAgICAgICAgICAgICAgICAvLyB1c2UgZ2l2ZW4gaGFuZGxlUmVjb25uZWN0RWRnZSBmdW5jdGlvbiBcclxuICAgICAgICAgICAgICAgIGlmKHR5cGVvZiBoYW5kbGVSZWNvbm5lY3RFZGdlID09PSAnZnVuY3Rpb24nKXtcclxuICAgICAgICAgICAgICAgICAgdmFyIHJlY29ubmVjdGVkRWRnZSA9IGhhbmRsZVJlY29ubmVjdEVkZ2UobmV3U291cmNlLmlkKCksIG5ld1RhcmdldC5pZCgpLCBlZGdlLmRhdGEoKSk7XHJcbiAgICAgICAgICAgICAgICAgIFxyXG4gICAgICAgICAgICAgICAgICBpZihyZWNvbm5lY3RlZEVkZ2Upe1xyXG4gICAgICAgICAgICAgICAgICAgIHJlY29ubmVjdGlvblV0aWxpdGllcy5jb3B5RWRnZShlZGdlLCByZWNvbm5lY3RlZEVkZ2UpO1xyXG4gICAgICAgICAgICAgICAgICAgIGJlbmRQb2ludFV0aWxpdGllcy5pbml0QmVuZFBvaW50cyhvcHRpb25zKCkuYmVuZFBvc2l0aW9uc0Z1bmN0aW9uLCBbcmVjb25uZWN0ZWRFZGdlXSk7XHJcbiAgICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICAgICAgXHJcbiAgICAgICAgICAgICAgICAgIGlmKHJlY29ubmVjdGVkRWRnZSAmJiBvcHRpb25zKCkudW5kb2FibGUpe1xyXG4gICAgICAgICAgICAgICAgICAgIHZhciBwYXJhbXMgPSB7XHJcbiAgICAgICAgICAgICAgICAgICAgICBuZXdFZGdlOiByZWNvbm5lY3RlZEVkZ2UsXHJcbiAgICAgICAgICAgICAgICAgICAgICBvbGRFZGdlOiBlZGdlXHJcbiAgICAgICAgICAgICAgICAgICAgfTtcclxuICAgICAgICAgICAgICAgICAgICBjeS51bmRvUmVkbygpLmRvKCdyZW1vdmVSZWNvbm5lY3RlZEVkZ2UnLCBwYXJhbXMpO1xyXG4gICAgICAgICAgICAgICAgICAgIGVkZ2UgPSByZWNvbm5lY3RlZEVkZ2U7XHJcbiAgICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICAgICAgZWxzZSBpZihyZWNvbm5lY3RlZEVkZ2Upe1xyXG4gICAgICAgICAgICAgICAgICAgIGN5LnJlbW92ZShlZGdlKTtcclxuICAgICAgICAgICAgICAgICAgICBlZGdlID0gcmVjb25uZWN0ZWRFZGdlO1xyXG4gICAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgICBlbHNle1xyXG4gICAgICAgICAgICAgICAgICB2YXIgbG9jID0gKG1vdmVkRW5kUG9pbnQgPT0gMCkgPyB7c291cmNlOiBuZXdOb2RlLmlkKCl9IDoge3RhcmdldDogbmV3Tm9kZS5pZCgpfTtcclxuICAgICAgICAgICAgICAgICAgdmFyIG9sZExvYyA9IChtb3ZlZEVuZFBvaW50ID09IDApID8ge3NvdXJjZTogZGV0YWNoZWROb2RlLmlkKCl9IDoge3RhcmdldDogZGV0YWNoZWROb2RlLmlkKCl9O1xyXG4gICAgICAgICAgICAgICAgICBcclxuICAgICAgICAgICAgICAgICAgaWYob3B0aW9ucygpLnVuZG9hYmxlICYmIG5ld05vZGUuaWQoKSAhPT0gZGV0YWNoZWROb2RlLmlkKCkpIHtcclxuICAgICAgICAgICAgICAgICAgICB2YXIgcGFyYW0gPSB7XHJcbiAgICAgICAgICAgICAgICAgICAgICBlZGdlOiBlZGdlLFxyXG4gICAgICAgICAgICAgICAgICAgICAgbG9jYXRpb246IGxvYyxcclxuICAgICAgICAgICAgICAgICAgICAgIG9sZExvYzogb2xkTG9jXHJcbiAgICAgICAgICAgICAgICAgICAgfTtcclxuICAgICAgICAgICAgICAgICAgICB2YXIgcmVzdWx0ID0gY3kudW5kb1JlZG8oKS5kbygncmVjb25uZWN0RWRnZScsIHBhcmFtKTtcclxuICAgICAgICAgICAgICAgICAgICBlZGdlID0gcmVzdWx0LmVkZ2U7XHJcbiAgICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICAgIH0gIFxyXG4gICAgICAgICAgICAgIH1cclxuXHJcbiAgICAgICAgICAgICAgLy8gaW52YWxpZCBlZGdlIHJlY29ubmVjdGlvbiBjYWxsYmFja1xyXG4gICAgICAgICAgICAgIGlmKGlzVmFsaWQgIT09ICd2YWxpZCcgJiYgdHlwZW9mIGFjdE9uVW5zdWNjZXNzZnVsUmVjb25uZWN0aW9uID09PSAnZnVuY3Rpb24nKXtcclxuICAgICAgICAgICAgICAgIGFjdE9uVW5zdWNjZXNzZnVsUmVjb25uZWN0aW9uKCk7XHJcbiAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgIGVkZ2UudW5zZWxlY3QoKTtcclxuICAgICAgICAgICAgICBjeS5yZW1vdmUoZHVtbXlOb2RlKTtcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgICAgfVxyXG4gICAgICAgICAgXHJcbiAgICAgICAgICBpZiAoZWRnZSAhPT0gdW5kZWZpbmVkICYmIG1vdmVCZW5kUGFyYW0gIT09IHVuZGVmaW5lZCAmJiBlZGdlLmRhdGEoJ2N5ZWRnZWJlbmRlZGl0aW5nV2VpZ2h0cycpXHJcbiAgICAgICAgICAmJiBlZGdlLmRhdGEoJ2N5ZWRnZWJlbmRlZGl0aW5nV2VpZ2h0cycpLnRvU3RyaW5nKCkgIT0gbW92ZUJlbmRQYXJhbS53ZWlnaHRzLnRvU3RyaW5nKCkpIHtcclxuICAgICAgICAgICAgXHJcbiAgICAgICAgICAgIGlmKG9wdGlvbnMoKS51bmRvYWJsZSkge1xyXG4gICAgICAgICAgICAgIGN5LnVuZG9SZWRvKCkuZG8oJ2NoYW5nZUJlbmRQb2ludHMnLCBtb3ZlQmVuZFBhcmFtKTtcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgICAgfVxyXG4gICAgICAgICAgXHJcbiAgICAgICAgICBtb3ZlZEJlbmRJbmRleCA9IHVuZGVmaW5lZDtcclxuICAgICAgICAgIG1vdmVkQmVuZEVkZ2UgPSB1bmRlZmluZWQ7XHJcbiAgICAgICAgICBtb3ZlQmVuZFBhcmFtID0gdW5kZWZpbmVkO1xyXG4gICAgICAgICAgY3JlYXRlQmVuZE9uRHJhZyA9IHVuZGVmaW5lZDtcclxuICAgICAgICAgIG1vdmVkRW5kUG9pbnQgPSB1bmRlZmluZWQ7XHJcbiAgICAgICAgICBkdW1teU5vZGUgPSB1bmRlZmluZWQ7XHJcbiAgICAgICAgICBkZXRhY2hlZE5vZGUgPSB1bmRlZmluZWQ7XHJcbiAgICAgICAgICBub2RlVG9BdHRhY2ggPSB1bmRlZmluZWQ7XHJcblxyXG4gICAgICAgICAgcmVzZXRHZXN0dXJlcygpO1xyXG4gICAgICAgICAgcmVmcmVzaERyYXdzKCk7XHJcbiAgICAgICAgfSk7XHJcblxyXG4gICAgICAgIC8vVmFyaWFibGVzIHVzZWQgZm9yIHN0YXJ0aW5nIGFuZCBlbmRpbmcgdGhlIG1vdmVtZW50IG9mIGJlbmQgcG9pbnRzIHdpdGggYXJyb3dzXHJcbiAgICAgICAgdmFyIG1vdmVwYXJhbTtcclxuICAgICAgICB2YXIgZmlyc3RCZW5kUG9pbnQ7XHJcbiAgICAgICAgdmFyIGVkZ2VDb250YWluaW5nRmlyc3RCZW5kUG9pbnQ7XHJcbiAgICAgICAgdmFyIGZpcnN0QmVuZFBvaW50Rm91bmQ7XHJcbiAgICAgICAgY3kub24oXCJlZGdlYmVuZGVkaXRpbmcubW92ZXN0YXJ0XCIsIGZ1bmN0aW9uIChlLCBlZGdlcykge1xyXG4gICAgICAgICAgICBmaXJzdEJlbmRQb2ludEZvdW5kID0gZmFsc2U7XHJcbiAgICAgICAgICAgIGlmIChlZGdlc1swXSAhPSB1bmRlZmluZWQpXHJcbiAgICAgICAgICAgIHtcclxuICAgICAgICAgICAgICAgIGVkZ2VzLmZvckVhY2goZnVuY3Rpb24oIGVkZ2UgKXtcclxuICAgICAgICAgICAgICAgICAgaWYgKGJlbmRQb2ludFV0aWxpdGllcy5nZXRTZWdtZW50UG9pbnRzKGVkZ2UpICE9IHVuZGVmaW5lZCAmJiAhZmlyc3RCZW5kUG9pbnRGb3VuZClcclxuICAgICAgICAgICAgICAgICAge1xyXG4gICAgICAgICAgICAgICAgICAgICAgZmlyc3RCZW5kUG9pbnQgPSB7IHg6IGJlbmRQb2ludFV0aWxpdGllcy5nZXRTZWdtZW50UG9pbnRzKGVkZ2UpWzBdLCB5OiBiZW5kUG9pbnRVdGlsaXRpZXMuZ2V0U2VnbWVudFBvaW50cyhlZGdlKVsxXX07XHJcbiAgICAgICAgICAgICAgICAgICAgICBtb3ZlcGFyYW0gPSB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgZmlyc3RUaW1lOiB0cnVlLFxyXG4gICAgICAgICAgICAgICAgICAgICAgICAgIGZpcnN0QmVuZFBvaW50UG9zaXRpb246IHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgeDogZmlyc3RCZW5kUG9pbnQueCxcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgeTogZmlyc3RCZW5kUG9pbnQueVxyXG4gICAgICAgICAgICAgICAgICAgICAgICAgIH0sXHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgZWRnZXM6IGVkZ2VzXHJcbiAgICAgICAgICAgICAgICAgICAgICB9O1xyXG4gICAgICAgICAgICAgICAgICAgICAgZWRnZUNvbnRhaW5pbmdGaXJzdEJlbmRQb2ludCA9IGVkZ2U7XHJcbiAgICAgICAgICAgICAgICAgICAgICBmaXJzdEJlbmRQb2ludEZvdW5kID0gdHJ1ZTtcclxuICAgICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgICAgfSk7XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICB9KTtcclxuXHJcbiAgICAgICAgY3kub24oXCJlZGdlYmVuZGVkaXRpbmcubW92ZWVuZFwiLCBmdW5jdGlvbiAoZSwgZWRnZXMpIHtcclxuICAgICAgICAgICAgaWYgKG1vdmVwYXJhbSAhPSB1bmRlZmluZWQpXHJcbiAgICAgICAgICAgIHtcclxuICAgICAgICAgICAgICAgIHZhciBpbml0aWFsUG9zID0gbW92ZXBhcmFtLmZpcnN0QmVuZFBvaW50UG9zaXRpb247XHJcbiAgICAgICAgICAgICAgICB2YXIgbW92ZWRGaXJzdEJlbmRQb2ludCA9IHtcclxuICAgICAgICAgICAgICAgICAgICB4OiBiZW5kUG9pbnRVdGlsaXRpZXMuZ2V0U2VnbWVudFBvaW50cyhlZGdlQ29udGFpbmluZ0ZpcnN0QmVuZFBvaW50KVswXSxcclxuICAgICAgICAgICAgICAgICAgICB5OiBiZW5kUG9pbnRVdGlsaXRpZXMuZ2V0U2VnbWVudFBvaW50cyhlZGdlQ29udGFpbmluZ0ZpcnN0QmVuZFBvaW50KVsxXVxyXG4gICAgICAgICAgICAgICAgfTtcclxuXHJcblxyXG4gICAgICAgICAgICAgICAgbW92ZXBhcmFtLnBvc2l0aW9uRGlmZiA9IHtcclxuICAgICAgICAgICAgICAgICAgICB4OiAtbW92ZWRGaXJzdEJlbmRQb2ludC54ICsgaW5pdGlhbFBvcy54LFxyXG4gICAgICAgICAgICAgICAgICAgIHk6IC1tb3ZlZEZpcnN0QmVuZFBvaW50LnkgKyBpbml0aWFsUG9zLnlcclxuICAgICAgICAgICAgICAgIH1cclxuXHJcbiAgICAgICAgICAgICAgICBkZWxldGUgbW92ZXBhcmFtLmZpcnN0QmVuZFBvaW50UG9zaXRpb247XHJcblxyXG4gICAgICAgICAgICAgICAgaWYob3B0aW9ucygpLnVuZG9hYmxlKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgY3kudW5kb1JlZG8oKS5kbyhcIm1vdmVCZW5kUG9pbnRzXCIsIG1vdmVwYXJhbSk7XHJcbiAgICAgICAgICAgICAgICB9XHJcblxyXG4gICAgICAgICAgICAgICAgbW92ZXBhcmFtID0gdW5kZWZpbmVkO1xyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgfSk7XHJcblxyXG4gICAgICAgIGN5Lm9uKCdjeHR0YXAnLCAnZWRnZScsIGVDeHRUYXAgPSBmdW5jdGlvbiAoZXZlbnQpIHtcclxuICAgICAgICAgIHZhciBlZGdlID0gdGhpcztcclxuICAgICAgICAgIFxyXG4gICAgICAgICAgdmFyIG1lbnVzID0gY3kuY29udGV4dE1lbnVzKCdnZXQnKTsgLy8gZ2V0IGNvbnRleHQgbWVudXMgaW5zdGFuY2VcclxuICAgICAgICAgIFxyXG4gICAgICAgICAgaWYoIWVkZ2VUb0hpZ2hsaWdodEJlbmRzIHx8IGVkZ2VUb0hpZ2hsaWdodEJlbmRzLmlkKCkgIT0gZWRnZS5pZCgpIHx8IGJlbmRQb2ludFV0aWxpdGllcy5pc0lnbm9yZWRFZGdlKGVkZ2UpKSB7XHJcbiAgICAgICAgICAgIG1lbnVzLmhpZGVNZW51SXRlbShyZW1vdmVCZW5kUG9pbnRDeHRNZW51SWQpO1xyXG4gICAgICAgICAgICBtZW51cy5oaWRlTWVudUl0ZW0oYWRkQmVuZFBvaW50Q3h0TWVudUlkKTtcclxuICAgICAgICAgICAgcmV0dXJuO1xyXG4gICAgICAgICAgfVxyXG5cclxuICAgICAgICAgIHZhciBjeVBvcyA9IGV2ZW50LnBvc2l0aW9uIHx8IGV2ZW50LmN5UG9zaXRpb247XHJcbiAgICAgICAgICB2YXIgc2VsZWN0ZWRCZW5kSW5kZXggPSBnZXRDb250YWluaW5nQmVuZFNoYXBlSW5kZXgoY3lQb3MueCwgY3lQb3MueSwgZWRnZSk7XHJcbiAgICAgICAgICBpZiAoc2VsZWN0ZWRCZW5kSW5kZXggPT0gLTEpIHtcclxuICAgICAgICAgICAgbWVudXMuaGlkZU1lbnVJdGVtKHJlbW92ZUJlbmRQb2ludEN4dE1lbnVJZCk7XHJcbiAgICAgICAgICAgIG1lbnVzLnNob3dNZW51SXRlbShhZGRCZW5kUG9pbnRDeHRNZW51SWQpO1xyXG4gICAgICAgICAgICBiZW5kUG9pbnRVdGlsaXRpZXMuY3VycmVudEN0eFBvcyA9IGN5UG9zO1xyXG4gICAgICAgICAgfVxyXG4gICAgICAgICAgZWxzZSB7XHJcbiAgICAgICAgICAgIG1lbnVzLmhpZGVNZW51SXRlbShhZGRCZW5kUG9pbnRDeHRNZW51SWQpO1xyXG4gICAgICAgICAgICBtZW51cy5zaG93TWVudUl0ZW0ocmVtb3ZlQmVuZFBvaW50Q3h0TWVudUlkKTtcclxuICAgICAgICAgICAgYmVuZFBvaW50VXRpbGl0aWVzLmN1cnJlbnRCZW5kSW5kZXggPSBzZWxlY3RlZEJlbmRJbmRleDtcclxuICAgICAgICAgIH1cclxuXHJcbiAgICAgICAgICBiZW5kUG9pbnRVdGlsaXRpZXMuY3VycmVudEN0eEVkZ2UgPSBlZGdlO1xyXG4gICAgICAgIH0pO1xyXG4gICAgICAgIFxyXG4gICAgICAgIGN5Lm9uKCdjeWVkZ2ViZW5kZWRpdGluZy5jaGFuZ2VCZW5kUG9pbnRzJywgJ2VkZ2UnLCBmdW5jdGlvbigpIHtcclxuICAgICAgICAgIHZhciBlZGdlID0gdGhpcztcclxuICAgICAgICAgIGN5LnN0YXJ0QmF0Y2goKTtcclxuICAgICAgICAgIGN5LmVkZ2VzKCkudW5zZWxlY3QoKTtcclxuICAgICAgICAgIGVkZ2Uuc2VsZWN0KCk7XHJcbiAgICAgICAgICBjeS50cmlnZ2VyKCdiZW5kUG9pbnRNb3ZlbWVudCcpO1xyXG4gICAgICAgICAgY3kuZW5kQmF0Y2goKTtcclxuICAgICAgICAgIHJlZnJlc2hEcmF3cygpO1xyXG4gICAgICAgIH0pO1xyXG4gICAgICB9XHJcblxyXG4gICAgICB2YXIgc2VsZWN0ZWRFZGdlcztcclxuICAgICAgdmFyIGJlbmRQb2ludHNNb3ZpbmcgPSBmYWxzZTtcclxuXHJcbiAgICAgIGZ1bmN0aW9uIGtleURvd24oZSkge1xyXG5cclxuICAgICAgICAgIHZhciBzaG91bGRNb3ZlID0gdHlwZW9mIG9wdGlvbnMoKS5tb3ZlU2VsZWN0ZWRCZW5kUG9pbnRzT25LZXlFdmVudHMgPT09ICdmdW5jdGlvbidcclxuICAgICAgICAgICAgICA/IG9wdGlvbnMoKS5tb3ZlU2VsZWN0ZWRCZW5kUG9pbnRzT25LZXlFdmVudHMoKSA6IG9wdGlvbnMoKS5tb3ZlU2VsZWN0ZWRCZW5kUG9pbnRzT25LZXlFdmVudHM7XHJcblxyXG4gICAgICAgICAgaWYgKCFzaG91bGRNb3ZlKSB7XHJcbiAgICAgICAgICAgICAgcmV0dXJuO1xyXG4gICAgICAgICAgfVxyXG5cclxuICAgICAgICAgIC8vQ2hlY2tzIGlmIHRoZSB0YWduYW1lIGlzIHRleHRhcmVhIG9yIGlucHV0XHJcbiAgICAgICAgICB2YXIgdG4gPSBkb2N1bWVudC5hY3RpdmVFbGVtZW50LnRhZ05hbWU7XHJcbiAgICAgICAgICBpZiAodG4gIT0gXCJURVhUQVJFQVwiICYmIHRuICE9IFwiSU5QVVRcIilcclxuICAgICAgICAgIHtcclxuICAgICAgICAgICAgICBzd2l0Y2goZS5rZXlDb2RlKXtcclxuICAgICAgICAgICAgICAgICAgY2FzZSAzNzogY2FzZSAzOTogY2FzZSAzODogIGNhc2UgNDA6IC8vIEFycm93IGtleXNcclxuICAgICAgICAgICAgICAgICAgY2FzZSAzMjogZS5wcmV2ZW50RGVmYXVsdCgpOyBicmVhazsgLy8gU3BhY2VcclxuICAgICAgICAgICAgICAgICAgZGVmYXVsdDogYnJlYWs7IC8vIGRvIG5vdCBibG9jayBvdGhlciBrZXlzXHJcbiAgICAgICAgICAgICAgfVxyXG5cclxuXHJcbiAgICAgICAgICAgICAgaWYgKGUua2V5Q29kZSA8ICczNycgfHwgZS5rZXlDb2RlID4gJzQwJykge1xyXG4gICAgICAgICAgICAgICAgICByZXR1cm47XHJcbiAgICAgICAgICAgICAgfVxyXG5cclxuICAgICAgICAgICAgICAvL0NoZWNrcyBpZiBvbmx5IGVkZ2VzIGFyZSBzZWxlY3RlZCAobm90IGFueSBub2RlKSBhbmQgaWYgb25seSAxIGVkZ2UgaXMgc2VsZWN0ZWRcclxuICAgICAgICAgICAgICAvL0lmIHRoZSBzZWNvbmQgY2hlY2tpbmcgaXMgcmVtb3ZlZCB0aGUgYmVuZCBwb2ludHMgb2YgbXVsdGlwbGUgZWRnZXMgd291bGQgbW92ZVxyXG4gICAgICAgICAgICAgIGlmIChjeS5lZGdlcyhcIjpzZWxlY3RlZFwiKS5sZW5ndGggIT0gY3kuZWxlbWVudHMoXCI6c2VsZWN0ZWRcIikubGVuZ3RoIHx8IGN5LmVkZ2VzKFwiOnNlbGVjdGVkXCIpLmxlbmd0aCAhPSAxKVxyXG4gICAgICAgICAgICAgIHtcclxuICAgICAgICAgICAgICAgIHJldHVybjtcclxuICAgICAgICAgICAgICB9XHJcblxyXG4gICAgICAgICAgICAgIGlmICghYmVuZFBvaW50c01vdmluZylcclxuICAgICAgICAgICAgICB7XHJcbiAgICAgICAgICAgICAgICAgIHNlbGVjdGVkRWRnZXMgPSBjeS5lZGdlcygnOnNlbGVjdGVkJyk7XHJcbiAgICAgICAgICAgICAgICAgIGN5LnRyaWdnZXIoXCJlZGdlYmVuZGVkaXRpbmcubW92ZXN0YXJ0XCIsIFtzZWxlY3RlZEVkZ2VzXSk7XHJcbiAgICAgICAgICAgICAgICAgIGJlbmRQb2ludHNNb3ZpbmcgPSB0cnVlO1xyXG4gICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICBpZiAoZS5hbHRLZXkgJiYgZS53aGljaCA9PSAnMzgnKSB7XHJcbiAgICAgICAgICAgICAgICAgIC8vIHVwIGFycm93IGFuZCBhbHRcclxuICAgICAgICAgICAgICAgICAgbW92ZUJlbmRQb2ludHMgKHt4OjAsIHk6LTF9LHNlbGVjdGVkRWRnZXMpO1xyXG4gICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICBlbHNlIGlmIChlLmFsdEtleSAmJiBlLndoaWNoID09ICc0MCcpIHtcclxuICAgICAgICAgICAgICAgICAgLy8gZG93biBhcnJvdyBhbmQgYWx0XHJcbiAgICAgICAgICAgICAgICAgIG1vdmVCZW5kUG9pbnRzICh7eDowLCB5OjF9LHNlbGVjdGVkRWRnZXMpO1xyXG4gICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICBlbHNlIGlmIChlLmFsdEtleSAmJiBlLndoaWNoID09ICczNycpIHtcclxuICAgICAgICAgICAgICAgICAgLy8gbGVmdCBhcnJvdyBhbmQgYWx0XHJcbiAgICAgICAgICAgICAgICAgIG1vdmVCZW5kUG9pbnRzICh7eDotMSwgeTowfSxzZWxlY3RlZEVkZ2VzKTtcclxuICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgZWxzZSBpZiAoZS5hbHRLZXkgJiYgZS53aGljaCA9PSAnMzknKSB7XHJcbiAgICAgICAgICAgICAgICAgIC8vIHJpZ2h0IGFycm93IGFuZCBhbHRcclxuICAgICAgICAgICAgICAgICAgbW92ZUJlbmRQb2ludHMgKHt4OjEsIHk6MH0sc2VsZWN0ZWRFZGdlcyk7XHJcbiAgICAgICAgICAgICAgfVxyXG5cclxuICAgICAgICAgICAgICBlbHNlIGlmIChlLnNoaWZ0S2V5ICYmIGUud2hpY2ggPT0gJzM4Jykge1xyXG4gICAgICAgICAgICAgICAgICAvLyB1cCBhcnJvdyBhbmQgc2hpZnRcclxuICAgICAgICAgICAgICAgICAgbW92ZUJlbmRQb2ludHMgKHt4OjAsIHk6LTEwfSxzZWxlY3RlZEVkZ2VzKTtcclxuICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgZWxzZSBpZiAoZS5zaGlmdEtleSAmJiBlLndoaWNoID09ICc0MCcpIHtcclxuICAgICAgICAgICAgICAgICAgLy8gZG93biBhcnJvdyBhbmQgc2hpZnRcclxuICAgICAgICAgICAgICAgICAgbW92ZUJlbmRQb2ludHMgKHt4OjAsIHk6MTB9LHNlbGVjdGVkRWRnZXMpO1xyXG4gICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICBlbHNlIGlmIChlLnNoaWZ0S2V5ICYmIGUud2hpY2ggPT0gJzM3Jykge1xyXG4gICAgICAgICAgICAgICAgICAvLyBsZWZ0IGFycm93IGFuZCBzaGlmdFxyXG4gICAgICAgICAgICAgICAgICBtb3ZlQmVuZFBvaW50cyAoe3g6LTEwLCB5OjB9LHNlbGVjdGVkRWRnZXMpO1xyXG5cclxuICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgZWxzZSBpZiAoZS5zaGlmdEtleSAmJiBlLndoaWNoID09ICczOScgKSB7XHJcbiAgICAgICAgICAgICAgICAgIC8vIHJpZ2h0IGFycm93IGFuZCBzaGlmdFxyXG4gICAgICAgICAgICAgICAgICBtb3ZlQmVuZFBvaW50cyAoe3g6MTAsIHk6MH0sc2VsZWN0ZWRFZGdlcyk7XHJcbiAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgIGVsc2UgaWYgKGUua2V5Q29kZSA9PSAnMzgnKSB7XHJcbiAgICAgICAgICAgICAgICAgIC8vIHVwIGFycm93XHJcbiAgICAgICAgICAgICAgICAgIG1vdmVCZW5kUG9pbnRzKHt4OiAwLCB5OiAtM30sIHNlbGVjdGVkRWRnZXMpO1xyXG4gICAgICAgICAgICAgIH1cclxuXHJcbiAgICAgICAgICAgICAgZWxzZSBpZiAoZS5rZXlDb2RlID09ICc0MCcpIHtcclxuICAgICAgICAgICAgICAgICAgLy8gZG93biBhcnJvd1xyXG4gICAgICAgICAgICAgICAgICBtb3ZlQmVuZFBvaW50cyAoe3g6MCwgeTozfSxzZWxlY3RlZEVkZ2VzKTtcclxuICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgZWxzZSBpZiAoZS5rZXlDb2RlID09ICczNycpIHtcclxuICAgICAgICAgICAgICAgICAgLy8gbGVmdCBhcnJvd1xyXG4gICAgICAgICAgICAgICAgICBtb3ZlQmVuZFBvaW50cyAoe3g6LTMsIHk6MH0sc2VsZWN0ZWRFZGdlcyk7XHJcbiAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgIGVsc2UgaWYgKGUua2V5Q29kZSA9PSAnMzknKSB7XHJcbiAgICAgICAgICAgICAgICAgIC8vcmlnaHQgYXJyb3dcclxuICAgICAgICAgICAgICAgICAgbW92ZUJlbmRQb2ludHMgKHt4OjMsIHk6MH0sc2VsZWN0ZWRFZGdlcyk7XHJcbiAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgfVxyXG4gICAgICB9XHJcbiAgICAgIGZ1bmN0aW9uIGtleVVwKGUpIHtcclxuXHJcbiAgICAgICAgICBpZiAoZS5rZXlDb2RlIDwgJzM3JyB8fCBlLmtleUNvZGUgPiAnNDAnKSB7XHJcbiAgICAgICAgICAgICAgcmV0dXJuO1xyXG4gICAgICAgICAgfVxyXG5cclxuICAgICAgICAgIHZhciBzaG91bGRNb3ZlID0gdHlwZW9mIG9wdGlvbnMoKS5tb3ZlU2VsZWN0ZWRCZW5kUG9pbnRzT25LZXlFdmVudHMgPT09ICdmdW5jdGlvbidcclxuICAgICAgICAgICAgICA/IG9wdGlvbnMoKS5tb3ZlU2VsZWN0ZWRCZW5kUG9pbnRzT25LZXlFdmVudHMoKSA6IG9wdGlvbnMoKS5tb3ZlU2VsZWN0ZWRCZW5kUG9pbnRzT25LZXlFdmVudHM7XHJcblxyXG4gICAgICAgICAgaWYgKCFzaG91bGRNb3ZlKSB7XHJcbiAgICAgICAgICAgICAgcmV0dXJuO1xyXG4gICAgICAgICAgfVxyXG5cclxuICAgICAgICAgIGN5LnRyaWdnZXIoXCJlZGdlYmVuZGVkaXRpbmcubW92ZWVuZFwiLCBbc2VsZWN0ZWRFZGdlc10pO1xyXG4gICAgICAgICAgc2VsZWN0ZWRFZGdlcyA9IHVuZGVmaW5lZDtcclxuICAgICAgICAgIGJlbmRQb2ludHNNb3ZpbmcgPSBmYWxzZTtcclxuXHJcbiAgICAgIH1cclxuICAgICAgZG9jdW1lbnQuYWRkRXZlbnRMaXN0ZW5lcihcImtleWRvd25cIixrZXlEb3duLCB0cnVlKTtcclxuICAgICAgZG9jdW1lbnQuYWRkRXZlbnRMaXN0ZW5lcihcImtleXVwXCIsa2V5VXAsIHRydWUpO1xyXG5cclxuICAgICAgJGNvbnRhaW5lci5kYXRhKCdjeWVkZ2ViZW5kZWRpdGluZycsIGRhdGEpO1xyXG4gICAgfSxcclxuICAgIHVuYmluZDogZnVuY3Rpb24gKCkge1xyXG4gICAgICAgIGN5Lm9mZigncG9zaXRpb24nLCAnbm9kZScsIGVQb3NpdGlvbilcclxuICAgICAgICAgIC5vZmYoJ3JlbW92ZScsICdub2RlJywgZVJlbW92ZSlcclxuICAgICAgICAgIC5vZmYoJ2FkZCcsICdub2RlJywgZUFkZClcclxuICAgICAgICAgIC5vZmYoJ3N0eWxlJywgJ2VkZ2UuZWRnZWJlbmRlZGl0aW5nLWhhc2JlbmRwb2ludHM6c2VsZWN0ZWQnLCBlU3R5bGUpXHJcbiAgICAgICAgICAub2ZmKCdzZWxlY3QnLCAnZWRnZScsIGVTZWxlY3QpXHJcbiAgICAgICAgICAub2ZmKCd1bnNlbGVjdCcsICdlZGdlJywgZVVuc2VsZWN0KVxyXG4gICAgICAgICAgLm9mZigndGFwc3RhcnQnLCAnZWRnZScsIGVUYXBTdGFydClcclxuICAgICAgICAgIC5vZmYoJ3RhcGRyYWcnLCBlVGFwRHJhZylcclxuICAgICAgICAgIC5vZmYoJ3RhcGVuZCcsIGVUYXBFbmQpXHJcbiAgICAgICAgICAub2ZmKCdjeHR0YXAnLCBlQ3h0VGFwKTtcclxuXHJcbiAgICAgICAgY3kudW5iaW5kKFwiem9vbSBwYW5cIiwgZVpvb20pO1xyXG4gICAgfVxyXG4gIH07XHJcblxyXG4gIGlmIChmdW5jdGlvbnNbZm5dKSB7XHJcbiAgICByZXR1cm4gZnVuY3Rpb25zW2ZuXS5hcHBseSgkKGN5LmNvbnRhaW5lcigpKSwgQXJyYXkucHJvdG90eXBlLnNsaWNlLmNhbGwoYXJndW1lbnRzLCAxKSk7XHJcbiAgfSBlbHNlIGlmICh0eXBlb2YgZm4gPT0gJ29iamVjdCcgfHwgIWZuKSB7XHJcbiAgICByZXR1cm4gZnVuY3Rpb25zLmluaXQuYXBwbHkoJChjeS5jb250YWluZXIoKSksIGFyZ3VtZW50cyk7XHJcbiAgfSBlbHNlIHtcclxuICAgICQuZXJyb3IoJ05vIHN1Y2ggZnVuY3Rpb24gYCcgKyBmbiArICdgIGZvciBjeXRvc2NhcGUuanMtZWRnZS1iZW5kLWVkaXRpbmcnKTtcclxuICB9XHJcblxyXG4gIHJldHVybiAkKHRoaXMpO1xyXG59O1xyXG4iLCJ2YXIgYmVuZFBvaW50VXRpbGl0aWVzID0ge1xyXG4gIGN1cnJlbnRDdHhFZGdlOiB1bmRlZmluZWQsXHJcbiAgY3VycmVudEN0eFBvczogdW5kZWZpbmVkLFxyXG4gIGN1cnJlbnRCZW5kSW5kZXg6IHVuZGVmaW5lZCxcclxuICBpZ25vcmVkQ2xhc3NlczogdW5kZWZpbmVkLFxyXG4gIHNldElnbm9yZWRDbGFzc2VzOiBmdW5jdGlvbihfaWdub3JlZENsYXNzZXMpIHtcclxuICAgIHRoaXMuaWdub3JlZENsYXNzZXMgPSBfaWdub3JlZENsYXNzZXM7XHJcbiAgfSxcclxuICAvLyBpbml0aWxpemUgYmVuZCBwb2ludHMgYmFzZWQgb24gYmVuZFBvc2l0aW9uc0ZjblxyXG4gIGluaXRCZW5kUG9pbnRzOiBmdW5jdGlvbihiZW5kUG9zaXRpb25zRmNuLCBlZGdlcykge1xyXG4gICAgZm9yICh2YXIgaSA9IDA7IGkgPCBlZGdlcy5sZW5ndGg7IGkrKykge1xyXG4gICAgICB2YXIgZWRnZSA9IGVkZ2VzW2ldO1xyXG4gICAgICBpZighdGhpcy5pc0lnbm9yZWRFZGdlKGVkZ2UpKSB7XHJcblxyXG4gICAgICAgIC8vIGdldCB0aGUgYmVuZCBwb3NpdGlvbnMgYnkgYXBwbHlpbmcgdGhlIGZ1bmN0aW9uIGZvciB0aGlzIGVkZ2VcclxuICAgICAgICB2YXIgYmVuZFBvc2l0aW9ucyA9IGJlbmRQb3NpdGlvbnNGY24uYXBwbHkodGhpcywgZWRnZSk7XHJcbiAgICAgICAgLy8gY2FsY3VsYXRlIHJlbGF0aXZlIGJlbmQgcG9zaXRpb25zXHJcbiAgICAgICAgdmFyIHJlc3VsdCA9IHRoaXMuY29udmVydFRvUmVsYXRpdmVCZW5kUG9zaXRpb25zKGVkZ2UsIGJlbmRQb3NpdGlvbnMpO1xyXG5cclxuICAgICAgICAvLyBpZiB0aGVyZSBhcmUgYmVuZCBwb2ludHMgc2V0IHdlaWdodHMgYW5kIGRpc3RhbmNlcyBhY2NvcmRpbmdseSBhbmQgYWRkIGNsYXNzIHRvIGVuYWJsZSBzdHlsZSBjaGFuZ2VzXHJcbiAgICAgICAgaWYgKHJlc3VsdC5kaXN0YW5jZXMubGVuZ3RoID4gMCkge1xyXG4gICAgICAgICAgZWRnZS5kYXRhKCdjeWVkZ2ViZW5kZWRpdGluZ1dlaWdodHMnLCByZXN1bHQud2VpZ2h0cyk7XHJcbiAgICAgICAgICBlZGdlLmRhdGEoJ2N5ZWRnZWJlbmRlZGl0aW5nRGlzdGFuY2VzJywgcmVzdWx0LmRpc3RhbmNlcyk7XHJcbiAgICAgICAgICBlZGdlLmFkZENsYXNzKCdlZGdlYmVuZGVkaXRpbmctaGFzYmVuZHBvaW50cycpO1xyXG4gICAgICAgIH1cclxuICAgICAgfVxyXG4gICAgfVxyXG4gIH0sXHJcblxyXG4gIGlzSWdub3JlZEVkZ2U6IGZ1bmN0aW9uKGVkZ2UpIHtcclxuICAgIGZvcih2YXIgaSA9IDA7IHRoaXMuaWdub3JlZENsYXNzZXMgJiYgaSA8ICB0aGlzLmlnbm9yZWRDbGFzc2VzLmxlbmd0aDsgaSsrKXtcclxuICAgICAgaWYoZWRnZS5oYXNDbGFzcyh0aGlzLmlnbm9yZWRDbGFzc2VzW2ldKSlcclxuICAgICAgICByZXR1cm4gdHJ1ZTtcclxuICAgIH1cclxuICAgIHJldHVybiBmYWxzZTtcclxuICB9LFxyXG4gIC8vR2V0IHRoZSBkaXJlY3Rpb24gb2YgdGhlIGxpbmUgZnJvbSBzb3VyY2UgcG9pbnQgdG8gdGhlIHRhcmdldCBwb2ludFxyXG4gIGdldExpbmVEaXJlY3Rpb246IGZ1bmN0aW9uKHNyY1BvaW50LCB0Z3RQb2ludCl7XHJcbiAgICBpZihzcmNQb2ludC55ID09IHRndFBvaW50LnkgJiYgc3JjUG9pbnQueCA8IHRndFBvaW50Lngpe1xyXG4gICAgICByZXR1cm4gMTtcclxuICAgIH1cclxuICAgIGlmKHNyY1BvaW50LnkgPCB0Z3RQb2ludC55ICYmIHNyY1BvaW50LnggPCB0Z3RQb2ludC54KXtcclxuICAgICAgcmV0dXJuIDI7XHJcbiAgICB9XHJcbiAgICBpZihzcmNQb2ludC55IDwgdGd0UG9pbnQueSAmJiBzcmNQb2ludC54ID09IHRndFBvaW50Lngpe1xyXG4gICAgICByZXR1cm4gMztcclxuICAgIH1cclxuICAgIGlmKHNyY1BvaW50LnkgPCB0Z3RQb2ludC55ICYmIHNyY1BvaW50LnggPiB0Z3RQb2ludC54KXtcclxuICAgICAgcmV0dXJuIDQ7XHJcbiAgICB9XHJcbiAgICBpZihzcmNQb2ludC55ID09IHRndFBvaW50LnkgJiYgc3JjUG9pbnQueCA+IHRndFBvaW50Lngpe1xyXG4gICAgICByZXR1cm4gNTtcclxuICAgIH1cclxuICAgIGlmKHNyY1BvaW50LnkgPiB0Z3RQb2ludC55ICYmIHNyY1BvaW50LnggPiB0Z3RQb2ludC54KXtcclxuICAgICAgcmV0dXJuIDY7XHJcbiAgICB9XHJcbiAgICBpZihzcmNQb2ludC55ID4gdGd0UG9pbnQueSAmJiBzcmNQb2ludC54ID09IHRndFBvaW50Lngpe1xyXG4gICAgICByZXR1cm4gNztcclxuICAgIH1cclxuICAgIHJldHVybiA4Oy8vaWYgc3JjUG9pbnQueSA+IHRndFBvaW50LnkgYW5kIHNyY1BvaW50LnggPCB0Z3RQb2ludC54XHJcbiAgfSxcclxuICBnZXRTcmNUZ3RQb2ludHNBbmRUYW5nZW50czogZnVuY3Rpb24gKGVkZ2UpIHtcclxuICAgIHZhciBzb3VyY2VOb2RlID0gZWRnZS5zb3VyY2UoKTtcclxuICAgIHZhciB0YXJnZXROb2RlID0gZWRnZS50YXJnZXQoKTtcclxuICAgIFxyXG4gICAgdmFyIHRndFBvc2l0aW9uID0gdGFyZ2V0Tm9kZS5wb3NpdGlvbigpO1xyXG4gICAgdmFyIHNyY1Bvc2l0aW9uID0gc291cmNlTm9kZS5wb3NpdGlvbigpO1xyXG4gICAgXHJcbiAgICB2YXIgc3JjUG9pbnQgPSBzb3VyY2VOb2RlLnBvc2l0aW9uKCk7XHJcbiAgICB2YXIgdGd0UG9pbnQgPSB0YXJnZXROb2RlLnBvc2l0aW9uKCk7XHJcblxyXG5cclxuICAgIHZhciBtMSA9ICh0Z3RQb2ludC55IC0gc3JjUG9pbnQueSkgLyAodGd0UG9pbnQueCAtIHNyY1BvaW50LngpO1xyXG4gICAgdmFyIG0yID0gLTEgLyBtMTtcclxuXHJcbiAgICByZXR1cm4ge1xyXG4gICAgICBtMTogbTEsXHJcbiAgICAgIG0yOiBtMixcclxuICAgICAgc3JjUG9pbnQ6IHNyY1BvaW50LFxyXG4gICAgICB0Z3RQb2ludDogdGd0UG9pbnRcclxuICAgIH07XHJcbiAgfSxcclxuICBnZXRJbnRlcnNlY3Rpb246IGZ1bmN0aW9uKGVkZ2UsIHBvaW50LCBzcmNUZ3RQb2ludHNBbmRUYW5nZW50cyl7XHJcbiAgICBpZiAoc3JjVGd0UG9pbnRzQW5kVGFuZ2VudHMgPT09IHVuZGVmaW5lZCkge1xyXG4gICAgICBzcmNUZ3RQb2ludHNBbmRUYW5nZW50cyA9IHRoaXMuZ2V0U3JjVGd0UG9pbnRzQW5kVGFuZ2VudHMoZWRnZSk7XHJcbiAgICB9XHJcblxyXG4gICAgdmFyIHNyY1BvaW50ID0gc3JjVGd0UG9pbnRzQW5kVGFuZ2VudHMuc3JjUG9pbnQ7XHJcbiAgICB2YXIgdGd0UG9pbnQgPSBzcmNUZ3RQb2ludHNBbmRUYW5nZW50cy50Z3RQb2ludDtcclxuICAgIHZhciBtMSA9IHNyY1RndFBvaW50c0FuZFRhbmdlbnRzLm0xO1xyXG4gICAgdmFyIG0yID0gc3JjVGd0UG9pbnRzQW5kVGFuZ2VudHMubTI7XHJcblxyXG4gICAgdmFyIGludGVyc2VjdFg7XHJcbiAgICB2YXIgaW50ZXJzZWN0WTtcclxuXHJcbiAgICBpZihtMSA9PSBJbmZpbml0eSB8fCBtMSA9PSAtSW5maW5pdHkpe1xyXG4gICAgICBpbnRlcnNlY3RYID0gc3JjUG9pbnQueDtcclxuICAgICAgaW50ZXJzZWN0WSA9IHBvaW50Lnk7XHJcbiAgICB9XHJcbiAgICBlbHNlIGlmKG0xID09IDApe1xyXG4gICAgICBpbnRlcnNlY3RYID0gcG9pbnQueDtcclxuICAgICAgaW50ZXJzZWN0WSA9IHNyY1BvaW50Lnk7XHJcbiAgICB9XHJcbiAgICBlbHNlIHtcclxuICAgICAgdmFyIGExID0gc3JjUG9pbnQueSAtIG0xICogc3JjUG9pbnQueDtcclxuICAgICAgdmFyIGEyID0gcG9pbnQueSAtIG0yICogcG9pbnQueDtcclxuXHJcbiAgICAgIGludGVyc2VjdFggPSAoYTIgLSBhMSkgLyAobTEgLSBtMik7XHJcbiAgICAgIGludGVyc2VjdFkgPSBtMSAqIGludGVyc2VjdFggKyBhMTtcclxuICAgIH1cclxuXHJcbiAgICAvL0ludGVyc2VjdGlvbiBwb2ludCBpcyB0aGUgaW50ZXJzZWN0aW9uIG9mIHRoZSBsaW5lcyBwYXNzaW5nIHRocm91Z2ggdGhlIG5vZGVzIGFuZFxyXG4gICAgLy9wYXNzaW5nIHRocm91Z2ggdGhlIGJlbmQgcG9pbnQgYW5kIHBlcnBlbmRpY3VsYXIgdG8gdGhlIG90aGVyIGxpbmVcclxuICAgIHZhciBpbnRlcnNlY3Rpb25Qb2ludCA9IHtcclxuICAgICAgeDogaW50ZXJzZWN0WCxcclxuICAgICAgeTogaW50ZXJzZWN0WVxyXG4gICAgfTtcclxuICAgIFxyXG4gICAgcmV0dXJuIGludGVyc2VjdGlvblBvaW50O1xyXG4gIH0sXHJcbiAgZ2V0U2VnbWVudFBvaW50czogZnVuY3Rpb24oZWRnZSkge1xyXG4gICAgXHJcbiAgICBpZiggZWRnZS5jc3MoJ2N1cnZlLXN0eWxlJykgIT09ICdzZWdtZW50cycgKSB7XHJcbiAgICAgIHJldHVybiB1bmRlZmluZWQ7XHJcbiAgICB9XHJcbiAgICBcclxuICAgIHZhciBzZWdwdHMgPSBbXTtcclxuXHJcbiAgICB2YXIgc2VnbWVudFdzID0gZWRnZS5wc3R5bGUoICdzZWdtZW50LXdlaWdodHMnICkucGZWYWx1ZTtcclxuICAgIHZhciBzZWdtZW50RHMgPSBlZGdlLnBzdHlsZSggJ3NlZ21lbnQtZGlzdGFuY2VzJyApLnBmVmFsdWU7XHJcbiAgICB2YXIgc2VnbWVudHNOID0gTWF0aC5taW4oIHNlZ21lbnRXcy5sZW5ndGgsIHNlZ21lbnREcy5sZW5ndGggKTtcclxuICAgIFxyXG4gICAgdmFyIHNyY1BvcyA9IGVkZ2Uuc291cmNlKCkucG9zaXRpb24oKTtcclxuICAgIHZhciB0Z3RQb3MgPSBlZGdlLnRhcmdldCgpLnBvc2l0aW9uKCk7XHJcblxyXG4gICAgdmFyIGR5ID0gKCB0Z3RQb3MueSAtIHNyY1Bvcy55ICk7XHJcbiAgICB2YXIgZHggPSAoIHRndFBvcy54IC0gc3JjUG9zLnggKTtcclxuICAgIFxyXG4gICAgdmFyIGwgPSBNYXRoLnNxcnQoIGR4ICogZHggKyBkeSAqIGR5ICk7XHJcblxyXG4gICAgdmFyIHZlY3RvciA9IHtcclxuICAgICAgeDogZHgsXHJcbiAgICAgIHk6IGR5XHJcbiAgICB9O1xyXG5cclxuICAgIHZhciB2ZWN0b3JOb3JtID0ge1xyXG4gICAgICB4OiB2ZWN0b3IueCAvIGwsXHJcbiAgICAgIHk6IHZlY3Rvci55IC8gbFxyXG4gICAgfTtcclxuICAgIFxyXG4gICAgdmFyIHZlY3Rvck5vcm1JbnZlcnNlID0ge1xyXG4gICAgICB4OiAtdmVjdG9yTm9ybS55LFxyXG4gICAgICB5OiB2ZWN0b3JOb3JtLnhcclxuICAgIH07XHJcblxyXG4gICAgZm9yKCB2YXIgcyA9IDA7IHMgPCBzZWdtZW50c047IHMrKyApe1xyXG4gICAgICB2YXIgdyA9IHNlZ21lbnRXc1sgcyBdO1xyXG4gICAgICB2YXIgZCA9IHNlZ21lbnREc1sgcyBdO1xyXG5cclxuICAgICAgLy8gZCA9IHN3YXBwZWREaXJlY3Rpb24gPyAtZCA6IGQ7XHJcbiAgICAgIC8vXHJcbiAgICAgIC8vIGQgPSBNYXRoLmFicyhkKTtcclxuXHJcbiAgICAgIC8vIHZhciB3MSA9ICFzd2FwcGVkRGlyZWN0aW9uID8gKDEgLSB3KSA6IHc7XHJcbiAgICAgIC8vIHZhciB3MiA9ICFzd2FwcGVkRGlyZWN0aW9uID8gdyA6ICgxIC0gdyk7XHJcblxyXG4gICAgICB2YXIgdzEgPSAoMSAtIHcpO1xyXG4gICAgICB2YXIgdzIgPSB3O1xyXG5cclxuICAgICAgdmFyIHBvc1B0cyA9IHtcclxuICAgICAgICB4MTogc3JjUG9zLngsXHJcbiAgICAgICAgeDI6IHRndFBvcy54LFxyXG4gICAgICAgIHkxOiBzcmNQb3MueSxcclxuICAgICAgICB5MjogdGd0UG9zLnlcclxuICAgICAgfTtcclxuXHJcbiAgICAgIHZhciBtaWRwdFB0cyA9IHBvc1B0cztcclxuICAgICAgXHJcbiAgICAgIFxyXG5cclxuICAgICAgdmFyIGFkanVzdGVkTWlkcHQgPSB7XHJcbiAgICAgICAgeDogbWlkcHRQdHMueDEgKiB3MSArIG1pZHB0UHRzLngyICogdzIsXHJcbiAgICAgICAgeTogbWlkcHRQdHMueTEgKiB3MSArIG1pZHB0UHRzLnkyICogdzJcclxuICAgICAgfTtcclxuXHJcbiAgICAgIHNlZ3B0cy5wdXNoKFxyXG4gICAgICAgIGFkanVzdGVkTWlkcHQueCArIHZlY3Rvck5vcm1JbnZlcnNlLnggKiBkLFxyXG4gICAgICAgIGFkanVzdGVkTWlkcHQueSArIHZlY3Rvck5vcm1JbnZlcnNlLnkgKiBkXHJcbiAgICAgICk7XHJcbiAgICB9XHJcbiAgICBcclxuICAgIHJldHVybiBzZWdwdHM7XHJcbiAgfSxcclxuICBjb252ZXJ0VG9SZWxhdGl2ZUJlbmRQb3NpdGlvbjogZnVuY3Rpb24gKGVkZ2UsIGJlbmRQb2ludCwgc3JjVGd0UG9pbnRzQW5kVGFuZ2VudHMpIHtcclxuICAgIGlmIChzcmNUZ3RQb2ludHNBbmRUYW5nZW50cyA9PT0gdW5kZWZpbmVkKSB7XHJcbiAgICAgIHNyY1RndFBvaW50c0FuZFRhbmdlbnRzID0gdGhpcy5nZXRTcmNUZ3RQb2ludHNBbmRUYW5nZW50cyhlZGdlKTtcclxuICAgIH1cclxuICAgIFxyXG4gICAgdmFyIGludGVyc2VjdGlvblBvaW50ID0gdGhpcy5nZXRJbnRlcnNlY3Rpb24oZWRnZSwgYmVuZFBvaW50LCBzcmNUZ3RQb2ludHNBbmRUYW5nZW50cyk7XHJcbiAgICB2YXIgaW50ZXJzZWN0WCA9IGludGVyc2VjdGlvblBvaW50Lng7XHJcbiAgICB2YXIgaW50ZXJzZWN0WSA9IGludGVyc2VjdGlvblBvaW50Lnk7XHJcbiAgICBcclxuICAgIHZhciBzcmNQb2ludCA9IHNyY1RndFBvaW50c0FuZFRhbmdlbnRzLnNyY1BvaW50O1xyXG4gICAgdmFyIHRndFBvaW50ID0gc3JjVGd0UG9pbnRzQW5kVGFuZ2VudHMudGd0UG9pbnQ7XHJcbiAgICBcclxuICAgIHZhciB3ZWlnaHQ7XHJcbiAgICBcclxuICAgIGlmKCBpbnRlcnNlY3RYICE9IHNyY1BvaW50LnggKSB7XHJcbiAgICAgIHdlaWdodCA9IChpbnRlcnNlY3RYIC0gc3JjUG9pbnQueCkgLyAodGd0UG9pbnQueCAtIHNyY1BvaW50LngpO1xyXG4gICAgfVxyXG4gICAgZWxzZSBpZiggaW50ZXJzZWN0WSAhPSBzcmNQb2ludC55ICkge1xyXG4gICAgICB3ZWlnaHQgPSAoaW50ZXJzZWN0WSAtIHNyY1BvaW50LnkpIC8gKHRndFBvaW50LnkgLSBzcmNQb2ludC55KTtcclxuICAgIH1cclxuICAgIGVsc2Uge1xyXG4gICAgICB3ZWlnaHQgPSAwO1xyXG4gICAgfVxyXG4gICAgXHJcbiAgICB2YXIgZGlzdGFuY2UgPSBNYXRoLnNxcnQoTWF0aC5wb3coKGludGVyc2VjdFkgLSBiZW5kUG9pbnQueSksIDIpXHJcbiAgICAgICAgKyBNYXRoLnBvdygoaW50ZXJzZWN0WCAtIGJlbmRQb2ludC54KSwgMikpO1xyXG4gICAgXHJcbiAgICAvL0dldCB0aGUgZGlyZWN0aW9uIG9mIHRoZSBsaW5lIGZvcm0gc291cmNlIHBvaW50IHRvIHRhcmdldCBwb2ludFxyXG4gICAgdmFyIGRpcmVjdGlvbjEgPSB0aGlzLmdldExpbmVEaXJlY3Rpb24oc3JjUG9pbnQsIHRndFBvaW50KTtcclxuICAgIC8vR2V0IHRoZSBkaXJlY3Rpb24gb2YgdGhlIGxpbmUgZnJvbSBpbnRlc2VjdGlvbiBwb2ludCB0byBiZW5kIHBvaW50XHJcbiAgICB2YXIgZGlyZWN0aW9uMiA9IHRoaXMuZ2V0TGluZURpcmVjdGlvbihpbnRlcnNlY3Rpb25Qb2ludCwgYmVuZFBvaW50KTtcclxuICAgIFxyXG4gICAgLy9JZiB0aGUgZGlmZmVyZW5jZSBpcyBub3QgLTIgYW5kIG5vdCA2IHRoZW4gdGhlIGRpcmVjdGlvbiBvZiB0aGUgZGlzdGFuY2UgaXMgbmVnYXRpdmVcclxuICAgIGlmKGRpcmVjdGlvbjEgLSBkaXJlY3Rpb24yICE9IC0yICYmIGRpcmVjdGlvbjEgLSBkaXJlY3Rpb24yICE9IDYpe1xyXG4gICAgICBpZihkaXN0YW5jZSAhPSAwKVxyXG4gICAgICAgIGRpc3RhbmNlID0gLTEgKiBkaXN0YW5jZTtcclxuICAgIH1cclxuICAgIFxyXG4gICAgcmV0dXJuIHtcclxuICAgICAgd2VpZ2h0OiB3ZWlnaHQsXHJcbiAgICAgIGRpc3RhbmNlOiBkaXN0YW5jZVxyXG4gICAgfTtcclxuICB9LFxyXG4gIGNvbnZlcnRUb1JlbGF0aXZlQmVuZFBvc2l0aW9uczogZnVuY3Rpb24gKGVkZ2UsIGJlbmRQb2ludHMpIHtcclxuICAgIHZhciBzcmNUZ3RQb2ludHNBbmRUYW5nZW50cyA9IHRoaXMuZ2V0U3JjVGd0UG9pbnRzQW5kVGFuZ2VudHMoZWRnZSk7XHJcbi8vICAgIHZhciBiZW5kUG9pbnRzID0gZWRnZS5kYXRhKCdiZW5kUG9pbnRQb3NpdGlvbnMnKTtcclxuICAgIC8vb3V0cHV0IHZhcmlhYmxlc1xyXG4gICAgdmFyIHdlaWdodHMgPSBbXTtcclxuICAgIHZhciBkaXN0YW5jZXMgPSBbXTtcclxuXHJcbiAgICBmb3IgKHZhciBpID0gMDsgYmVuZFBvaW50cyAmJiBpIDwgYmVuZFBvaW50cy5sZW5ndGg7IGkrKykge1xyXG4gICAgICB2YXIgYmVuZFBvaW50ID0gYmVuZFBvaW50c1tpXTtcclxuICAgICAgdmFyIHJlbGF0aXZlQmVuZFBvc2l0aW9uID0gdGhpcy5jb252ZXJ0VG9SZWxhdGl2ZUJlbmRQb3NpdGlvbihlZGdlLCBiZW5kUG9pbnQsIHNyY1RndFBvaW50c0FuZFRhbmdlbnRzKTtcclxuXHJcbiAgICAgIHdlaWdodHMucHVzaChyZWxhdGl2ZUJlbmRQb3NpdGlvbi53ZWlnaHQpO1xyXG4gICAgICBkaXN0YW5jZXMucHVzaChyZWxhdGl2ZUJlbmRQb3NpdGlvbi5kaXN0YW5jZSk7XHJcbiAgICB9XHJcblxyXG4gICAgcmV0dXJuIHtcclxuICAgICAgd2VpZ2h0czogd2VpZ2h0cyxcclxuICAgICAgZGlzdGFuY2VzOiBkaXN0YW5jZXNcclxuICAgIH07XHJcbiAgfSxcclxuICBnZXRTZWdtZW50RGlzdGFuY2VzU3RyaW5nOiBmdW5jdGlvbiAoZWRnZSkge1xyXG4gICAgdmFyIHN0ciA9IFwiXCI7XHJcblxyXG4gICAgdmFyIGRpc3RhbmNlcyA9IGVkZ2UuZGF0YSgnY3llZGdlYmVuZGVkaXRpbmdEaXN0YW5jZXMnKTtcclxuICAgIGZvciAodmFyIGkgPSAwOyBkaXN0YW5jZXMgJiYgaSA8IGRpc3RhbmNlcy5sZW5ndGg7IGkrKykge1xyXG4gICAgICBzdHIgPSBzdHIgKyBcIiBcIiArIGRpc3RhbmNlc1tpXTtcclxuICAgIH1cclxuICAgIFxyXG4gICAgcmV0dXJuIHN0cjtcclxuICB9LFxyXG4gIGdldFNlZ21lbnRXZWlnaHRzU3RyaW5nOiBmdW5jdGlvbiAoZWRnZSkge1xyXG4gICAgdmFyIHN0ciA9IFwiXCI7XHJcblxyXG4gICAgdmFyIHdlaWdodHMgPSBlZGdlLmRhdGEoJ2N5ZWRnZWJlbmRlZGl0aW5nV2VpZ2h0cycpO1xyXG4gICAgZm9yICh2YXIgaSA9IDA7IHdlaWdodHMgJiYgaSA8IHdlaWdodHMubGVuZ3RoOyBpKyspIHtcclxuICAgICAgc3RyID0gc3RyICsgXCIgXCIgKyB3ZWlnaHRzW2ldO1xyXG4gICAgfVxyXG4gICAgXHJcbiAgICByZXR1cm4gc3RyO1xyXG4gIH0sXHJcbiAgYWRkQmVuZFBvaW50OiBmdW5jdGlvbihlZGdlLCBuZXdCZW5kUG9pbnQpIHtcclxuICAgIGlmKGVkZ2UgPT09IHVuZGVmaW5lZCB8fCBuZXdCZW5kUG9pbnQgPT09IHVuZGVmaW5lZCl7XHJcbiAgICAgIGVkZ2UgPSB0aGlzLmN1cnJlbnRDdHhFZGdlO1xyXG4gICAgICBuZXdCZW5kUG9pbnQgPSB0aGlzLmN1cnJlbnRDdHhQb3M7XHJcbiAgICB9XHJcbiAgICBcclxuICAgIHZhciByZWxhdGl2ZUJlbmRQb3NpdGlvbiA9IHRoaXMuY29udmVydFRvUmVsYXRpdmVCZW5kUG9zaXRpb24oZWRnZSwgbmV3QmVuZFBvaW50KTtcclxuICAgIHZhciBvcmlnaW5hbFBvaW50V2VpZ2h0ID0gcmVsYXRpdmVCZW5kUG9zaXRpb24ud2VpZ2h0O1xyXG4gICAgXHJcbiAgICB2YXIgc3RhcnRYID0gZWRnZS5zb3VyY2UoKS5wb3NpdGlvbigneCcpO1xyXG4gICAgdmFyIHN0YXJ0WSA9IGVkZ2Uuc291cmNlKCkucG9zaXRpb24oJ3knKTtcclxuICAgIHZhciBlbmRYID0gZWRnZS50YXJnZXQoKS5wb3NpdGlvbigneCcpO1xyXG4gICAgdmFyIGVuZFkgPSBlZGdlLnRhcmdldCgpLnBvc2l0aW9uKCd5Jyk7XHJcbiAgICBcclxuICAgIHZhciBzdGFydFdlaWdodCA9IHRoaXMuY29udmVydFRvUmVsYXRpdmVCZW5kUG9zaXRpb24oZWRnZSwge3g6IHN0YXJ0WCwgeTogc3RhcnRZfSkud2VpZ2h0O1xyXG4gICAgdmFyIGVuZFdlaWdodCA9IHRoaXMuY29udmVydFRvUmVsYXRpdmVCZW5kUG9zaXRpb24oZWRnZSwge3g6IGVuZFgsIHk6IGVuZFl9KS53ZWlnaHQ7XHJcbiAgICB2YXIgd2VpZ2h0c1dpdGhUZ3RTcmMgPSBbc3RhcnRXZWlnaHRdLmNvbmNhdChlZGdlLmRhdGEoJ2N5ZWRnZWJlbmRlZGl0aW5nV2VpZ2h0cycpP2VkZ2UuZGF0YSgnY3llZGdlYmVuZGVkaXRpbmdXZWlnaHRzJyk6W10pLmNvbmNhdChbZW5kV2VpZ2h0XSk7XHJcbiAgICBcclxuICAgIHZhciBzZWdQdHMgPSB0aGlzLmdldFNlZ21lbnRQb2ludHMoZWRnZSk7XHJcbiAgICBcclxuICAgIHZhciBtaW5EaXN0ID0gSW5maW5pdHk7XHJcbiAgICB2YXIgaW50ZXJzZWN0aW9uO1xyXG4gICAgdmFyIHNlZ3B0c1dpdGhUZ3RTcmMgPSBbc3RhcnRYLCBzdGFydFldXHJcbiAgICAgICAgICAgIC5jb25jYXQoc2VnUHRzP3NlZ1B0czpbXSlcclxuICAgICAgICAgICAgLmNvbmNhdChbZW5kWCwgZW5kWV0pO1xyXG4gICAgdmFyIG5ld0JlbmRJbmRleCA9IC0xO1xyXG4gICAgXHJcbiAgICBmb3IodmFyIGkgPSAwOyBpIDwgd2VpZ2h0c1dpdGhUZ3RTcmMubGVuZ3RoIC0gMTsgaSsrKXtcclxuICAgICAgdmFyIHcxID0gd2VpZ2h0c1dpdGhUZ3RTcmNbaV07XHJcbiAgICAgIHZhciB3MiA9IHdlaWdodHNXaXRoVGd0U3JjW2kgKyAxXTtcclxuICAgICAgXHJcbiAgICAgIC8vY2hlY2sgaWYgdGhlIHdlaWdodCBpcyBiZXR3ZWVuIHcxIGFuZCB3MlxyXG4gICAgICBpZigob3JpZ2luYWxQb2ludFdlaWdodCA8PSB3MSAmJiBvcmlnaW5hbFBvaW50V2VpZ2h0ID49IHcyKSB8fCAob3JpZ2luYWxQb2ludFdlaWdodCA8PSB3MiAmJiBvcmlnaW5hbFBvaW50V2VpZ2h0ID49IHcxKSl7XHJcbiAgICAgICAgdmFyIHN0YXJ0WCA9IHNlZ3B0c1dpdGhUZ3RTcmNbMiAqIGldO1xyXG4gICAgICAgIHZhciBzdGFydFkgPSBzZWdwdHNXaXRoVGd0U3JjWzIgKiBpICsgMV07XHJcbiAgICAgICAgdmFyIGVuZFggPSBzZWdwdHNXaXRoVGd0U3JjWzIgKiBpICsgMl07XHJcbiAgICAgICAgdmFyIGVuZFkgPSBzZWdwdHNXaXRoVGd0U3JjWzIgKiBpICsgM107XHJcbiAgICAgICAgXHJcbiAgICAgICAgdmFyIHN0YXJ0ID0ge1xyXG4gICAgICAgICAgeDogc3RhcnRYLFxyXG4gICAgICAgICAgeTogc3RhcnRZXHJcbiAgICAgICAgfTtcclxuICAgICAgICBcclxuICAgICAgICB2YXIgZW5kID0ge1xyXG4gICAgICAgICAgeDogZW5kWCxcclxuICAgICAgICAgIHk6IGVuZFlcclxuICAgICAgICB9O1xyXG4gICAgICAgIFxyXG4gICAgICAgIHZhciBtMSA9ICggc3RhcnRZIC0gZW5kWSApIC8gKCBzdGFydFggLSBlbmRYICk7XHJcbiAgICAgICAgdmFyIG0yID0gLTEgLyBtMTtcclxuICAgICAgICBcclxuICAgICAgICB2YXIgc3JjVGd0UG9pbnRzQW5kVGFuZ2VudHMgPSB7XHJcbiAgICAgICAgICBzcmNQb2ludDogc3RhcnQsXHJcbiAgICAgICAgICB0Z3RQb2ludDogZW5kLFxyXG4gICAgICAgICAgbTE6IG0xLFxyXG4gICAgICAgICAgbTI6IG0yXHJcbiAgICAgICAgfTtcclxuICAgICAgICBcclxuICAgICAgICAvL2dldCB0aGUgaW50ZXJzZWN0aW9uIG9mIHRoZSBjdXJyZW50IHNlZ21lbnQgd2l0aCB0aGUgbmV3IGJlbmQgcG9pbnRcclxuICAgICAgICB2YXIgY3VycmVudEludGVyc2VjdGlvbiA9IHRoaXMuZ2V0SW50ZXJzZWN0aW9uKGVkZ2UsIG5ld0JlbmRQb2ludCwgc3JjVGd0UG9pbnRzQW5kVGFuZ2VudHMpO1xyXG4gICAgICAgIHZhciBkaXN0ID0gTWF0aC5zcXJ0KCBNYXRoLnBvdyggKG5ld0JlbmRQb2ludC54IC0gY3VycmVudEludGVyc2VjdGlvbi54KSwgMiApIFxyXG4gICAgICAgICAgICAgICAgKyBNYXRoLnBvdyggKG5ld0JlbmRQb2ludC55IC0gY3VycmVudEludGVyc2VjdGlvbi55KSwgMiApKTtcclxuICAgICAgICBcclxuICAgICAgICAvL1VwZGF0ZSB0aGUgbWluaW11bSBkaXN0YW5jZVxyXG4gICAgICAgIGlmKGRpc3QgPCBtaW5EaXN0KXtcclxuICAgICAgICAgIG1pbkRpc3QgPSBkaXN0O1xyXG4gICAgICAgICAgaW50ZXJzZWN0aW9uID0gY3VycmVudEludGVyc2VjdGlvbjtcclxuICAgICAgICAgIG5ld0JlbmRJbmRleCA9IGk7XHJcbiAgICAgICAgfVxyXG4gICAgICB9XHJcbiAgICB9XHJcbiAgICBcclxuICAgIGlmKGludGVyc2VjdGlvbiAhPT0gdW5kZWZpbmVkKXtcclxuICAgICAgbmV3QmVuZFBvaW50ID0gaW50ZXJzZWN0aW9uO1xyXG4gICAgfVxyXG4gICAgXHJcbiAgICByZWxhdGl2ZUJlbmRQb3NpdGlvbiA9IHRoaXMuY29udmVydFRvUmVsYXRpdmVCZW5kUG9zaXRpb24oZWRnZSwgbmV3QmVuZFBvaW50KTtcclxuICAgIFxyXG4gICAgaWYoaW50ZXJzZWN0aW9uID09PSB1bmRlZmluZWQpe1xyXG4gICAgICByZWxhdGl2ZUJlbmRQb3NpdGlvbi5kaXN0YW5jZSA9IDA7XHJcbiAgICB9XHJcblxyXG4gICAgdmFyIHdlaWdodHMgPSBlZGdlLmRhdGEoJ2N5ZWRnZWJlbmRlZGl0aW5nV2VpZ2h0cycpO1xyXG4gICAgdmFyIGRpc3RhbmNlcyA9IGVkZ2UuZGF0YSgnY3llZGdlYmVuZGVkaXRpbmdEaXN0YW5jZXMnKTtcclxuICAgIFxyXG4gICAgd2VpZ2h0cyA9IHdlaWdodHM/d2VpZ2h0czpbXTtcclxuICAgIGRpc3RhbmNlcyA9IGRpc3RhbmNlcz9kaXN0YW5jZXM6W107XHJcbiAgICBcclxuICAgIGlmKHdlaWdodHMubGVuZ3RoID09PSAwKSB7XHJcbiAgICAgIG5ld0JlbmRJbmRleCA9IDA7XHJcbiAgICB9XHJcbiAgICBcclxuLy8gICAgd2VpZ2h0cy5wdXNoKHJlbGF0aXZlQmVuZFBvc2l0aW9uLndlaWdodCk7XHJcbi8vICAgIGRpc3RhbmNlcy5wdXNoKHJlbGF0aXZlQmVuZFBvc2l0aW9uLmRpc3RhbmNlKTtcclxuICAgIGlmKG5ld0JlbmRJbmRleCAhPSAtMSl7XHJcbiAgICAgIHdlaWdodHMuc3BsaWNlKG5ld0JlbmRJbmRleCwgMCwgcmVsYXRpdmVCZW5kUG9zaXRpb24ud2VpZ2h0KTtcclxuICAgICAgZGlzdGFuY2VzLnNwbGljZShuZXdCZW5kSW5kZXgsIDAsIHJlbGF0aXZlQmVuZFBvc2l0aW9uLmRpc3RhbmNlKTtcclxuICAgIH1cclxuICAgXHJcbiAgICBlZGdlLmRhdGEoJ2N5ZWRnZWJlbmRlZGl0aW5nV2VpZ2h0cycsIHdlaWdodHMpO1xyXG4gICAgZWRnZS5kYXRhKCdjeWVkZ2ViZW5kZWRpdGluZ0Rpc3RhbmNlcycsIGRpc3RhbmNlcyk7XHJcbiAgICBcclxuICAgIGVkZ2UuYWRkQ2xhc3MoJ2VkZ2ViZW5kZWRpdGluZy1oYXNiZW5kcG9pbnRzJyk7XHJcbiAgICBcclxuICAgIHJldHVybiByZWxhdGl2ZUJlbmRQb3NpdGlvbjtcclxuICB9LFxyXG4gIHJlbW92ZUJlbmRQb2ludDogZnVuY3Rpb24oZWRnZSwgYmVuZFBvaW50SW5kZXgpe1xyXG4gICAgaWYoZWRnZSA9PT0gdW5kZWZpbmVkIHx8IGJlbmRQb2ludEluZGV4ID09PSB1bmRlZmluZWQpe1xyXG4gICAgICBlZGdlID0gdGhpcy5jdXJyZW50Q3R4RWRnZTtcclxuICAgICAgYmVuZFBvaW50SW5kZXggPSB0aGlzLmN1cnJlbnRCZW5kSW5kZXg7XHJcbiAgICB9XHJcbiAgICBcclxuICAgIHZhciBkaXN0YW5jZXMgPSBlZGdlLmRhdGEoJ2N5ZWRnZWJlbmRlZGl0aW5nRGlzdGFuY2VzJyk7XHJcbiAgICB2YXIgd2VpZ2h0cyA9IGVkZ2UuZGF0YSgnY3llZGdlYmVuZGVkaXRpbmdXZWlnaHRzJyk7XHJcbiAgICBcclxuICAgIGRpc3RhbmNlcy5zcGxpY2UoYmVuZFBvaW50SW5kZXgsIDEpO1xyXG4gICAgd2VpZ2h0cy5zcGxpY2UoYmVuZFBvaW50SW5kZXgsIDEpO1xyXG4gICAgXHJcbiAgICBcclxuICAgIGlmKGRpc3RhbmNlcy5sZW5ndGggPT0gMCB8fCB3ZWlnaHRzLmxlbmd0aCA9PSAwKXtcclxuICAgICAgZWRnZS5yZW1vdmVDbGFzcygnZWRnZWJlbmRlZGl0aW5nLWhhc2JlbmRwb2ludHMnKTtcclxuICAgICAgICBlZGdlLmRhdGEoJ2N5ZWRnZWJlbmRlZGl0aW5nRGlzdGFuY2VzJywgW10pO1xyXG4gICAgICAgIGVkZ2UuZGF0YSgnY3llZGdlYmVuZGVkaXRpbmdXZWlnaHRzJywgW10pO1xyXG4gICAgfVxyXG4gICAgZWxzZSB7XHJcbiAgICAgIGVkZ2UuZGF0YSgnY3llZGdlYmVuZGVkaXRpbmdEaXN0YW5jZXMnLCBkaXN0YW5jZXMpO1xyXG4gICAgICBlZGdlLmRhdGEoJ2N5ZWRnZWJlbmRlZGl0aW5nV2VpZ2h0cycsIHdlaWdodHMpO1xyXG4gICAgfVxyXG4gIH0sXHJcbiAgY2FsY3VsYXRlRGlzdGFuY2U6IGZ1bmN0aW9uKHB0MSwgcHQyKSB7XHJcbiAgICB2YXIgZGlmZlggPSBwdDEueCAtIHB0Mi54O1xyXG4gICAgdmFyIGRpZmZZID0gcHQxLnkgLSBwdDIueTtcclxuICAgIFxyXG4gICAgdmFyIGRpc3QgPSBNYXRoLnNxcnQoIE1hdGgucG93KCBkaWZmWCwgMiApICsgTWF0aC5wb3coIGRpZmZZLCAyICkgKTtcclxuICAgIHJldHVybiBkaXN0O1xyXG4gIH1cclxufTtcclxuXHJcbm1vZHVsZS5leHBvcnRzID0gYmVuZFBvaW50VXRpbGl0aWVzO1xyXG4iLCJ2YXIgZGVib3VuY2UgPSAoZnVuY3Rpb24gKCkge1xyXG4gIC8qKlxyXG4gICAqIGxvZGFzaCAzLjEuMSAoQ3VzdG9tIEJ1aWxkKSA8aHR0cHM6Ly9sb2Rhc2guY29tLz5cclxuICAgKiBCdWlsZDogYGxvZGFzaCBtb2Rlcm4gbW9kdWxhcml6ZSBleHBvcnRzPVwibnBtXCIgLW8gLi9gXHJcbiAgICogQ29weXJpZ2h0IDIwMTItMjAxNSBUaGUgRG9qbyBGb3VuZGF0aW9uIDxodHRwOi8vZG9qb2ZvdW5kYXRpb24ub3JnLz5cclxuICAgKiBCYXNlZCBvbiBVbmRlcnNjb3JlLmpzIDEuOC4zIDxodHRwOi8vdW5kZXJzY29yZWpzLm9yZy9MSUNFTlNFPlxyXG4gICAqIENvcHlyaWdodCAyMDA5LTIwMTUgSmVyZW15IEFzaGtlbmFzLCBEb2N1bWVudENsb3VkIGFuZCBJbnZlc3RpZ2F0aXZlIFJlcG9ydGVycyAmIEVkaXRvcnNcclxuICAgKiBBdmFpbGFibGUgdW5kZXIgTUlUIGxpY2Vuc2UgPGh0dHBzOi8vbG9kYXNoLmNvbS9saWNlbnNlPlxyXG4gICAqL1xyXG4gIC8qKiBVc2VkIGFzIHRoZSBgVHlwZUVycm9yYCBtZXNzYWdlIGZvciBcIkZ1bmN0aW9uc1wiIG1ldGhvZHMuICovXHJcbiAgdmFyIEZVTkNfRVJST1JfVEVYVCA9ICdFeHBlY3RlZCBhIGZ1bmN0aW9uJztcclxuXHJcbiAgLyogTmF0aXZlIG1ldGhvZCByZWZlcmVuY2VzIGZvciB0aG9zZSB3aXRoIHRoZSBzYW1lIG5hbWUgYXMgb3RoZXIgYGxvZGFzaGAgbWV0aG9kcy4gKi9cclxuICB2YXIgbmF0aXZlTWF4ID0gTWF0aC5tYXgsXHJcbiAgICAgICAgICBuYXRpdmVOb3cgPSBEYXRlLm5vdztcclxuXHJcbiAgLyoqXHJcbiAgICogR2V0cyB0aGUgbnVtYmVyIG9mIG1pbGxpc2Vjb25kcyB0aGF0IGhhdmUgZWxhcHNlZCBzaW5jZSB0aGUgVW5peCBlcG9jaFxyXG4gICAqICgxIEphbnVhcnkgMTk3MCAwMDowMDowMCBVVEMpLlxyXG4gICAqXHJcbiAgICogQHN0YXRpY1xyXG4gICAqIEBtZW1iZXJPZiBfXHJcbiAgICogQGNhdGVnb3J5IERhdGVcclxuICAgKiBAZXhhbXBsZVxyXG4gICAqXHJcbiAgICogXy5kZWZlcihmdW5jdGlvbihzdGFtcCkge1xyXG4gICAqICAgY29uc29sZS5sb2coXy5ub3coKSAtIHN0YW1wKTtcclxuICAgKiB9LCBfLm5vdygpKTtcclxuICAgKiAvLyA9PiBsb2dzIHRoZSBudW1iZXIgb2YgbWlsbGlzZWNvbmRzIGl0IHRvb2sgZm9yIHRoZSBkZWZlcnJlZCBmdW5jdGlvbiB0byBiZSBpbnZva2VkXHJcbiAgICovXHJcbiAgdmFyIG5vdyA9IG5hdGl2ZU5vdyB8fCBmdW5jdGlvbiAoKSB7XHJcbiAgICByZXR1cm4gbmV3IERhdGUoKS5nZXRUaW1lKCk7XHJcbiAgfTtcclxuXHJcbiAgLyoqXHJcbiAgICogQ3JlYXRlcyBhIGRlYm91bmNlZCBmdW5jdGlvbiB0aGF0IGRlbGF5cyBpbnZva2luZyBgZnVuY2AgdW50aWwgYWZ0ZXIgYHdhaXRgXHJcbiAgICogbWlsbGlzZWNvbmRzIGhhdmUgZWxhcHNlZCBzaW5jZSB0aGUgbGFzdCB0aW1lIHRoZSBkZWJvdW5jZWQgZnVuY3Rpb24gd2FzXHJcbiAgICogaW52b2tlZC4gVGhlIGRlYm91bmNlZCBmdW5jdGlvbiBjb21lcyB3aXRoIGEgYGNhbmNlbGAgbWV0aG9kIHRvIGNhbmNlbFxyXG4gICAqIGRlbGF5ZWQgaW52b2NhdGlvbnMuIFByb3ZpZGUgYW4gb3B0aW9ucyBvYmplY3QgdG8gaW5kaWNhdGUgdGhhdCBgZnVuY2BcclxuICAgKiBzaG91bGQgYmUgaW52b2tlZCBvbiB0aGUgbGVhZGluZyBhbmQvb3IgdHJhaWxpbmcgZWRnZSBvZiB0aGUgYHdhaXRgIHRpbWVvdXQuXHJcbiAgICogU3Vic2VxdWVudCBjYWxscyB0byB0aGUgZGVib3VuY2VkIGZ1bmN0aW9uIHJldHVybiB0aGUgcmVzdWx0IG9mIHRoZSBsYXN0XHJcbiAgICogYGZ1bmNgIGludm9jYXRpb24uXHJcbiAgICpcclxuICAgKiAqKk5vdGU6KiogSWYgYGxlYWRpbmdgIGFuZCBgdHJhaWxpbmdgIG9wdGlvbnMgYXJlIGB0cnVlYCwgYGZ1bmNgIGlzIGludm9rZWRcclxuICAgKiBvbiB0aGUgdHJhaWxpbmcgZWRnZSBvZiB0aGUgdGltZW91dCBvbmx5IGlmIHRoZSB0aGUgZGVib3VuY2VkIGZ1bmN0aW9uIGlzXHJcbiAgICogaW52b2tlZCBtb3JlIHRoYW4gb25jZSBkdXJpbmcgdGhlIGB3YWl0YCB0aW1lb3V0LlxyXG4gICAqXHJcbiAgICogU2VlIFtEYXZpZCBDb3JiYWNobydzIGFydGljbGVdKGh0dHA6Ly9kcnVwYWxtb3Rpb24uY29tL2FydGljbGUvZGVib3VuY2UtYW5kLXRocm90dGxlLXZpc3VhbC1leHBsYW5hdGlvbilcclxuICAgKiBmb3IgZGV0YWlscyBvdmVyIHRoZSBkaWZmZXJlbmNlcyBiZXR3ZWVuIGBfLmRlYm91bmNlYCBhbmQgYF8udGhyb3R0bGVgLlxyXG4gICAqXHJcbiAgICogQHN0YXRpY1xyXG4gICAqIEBtZW1iZXJPZiBfXHJcbiAgICogQGNhdGVnb3J5IEZ1bmN0aW9uXHJcbiAgICogQHBhcmFtIHtGdW5jdGlvbn0gZnVuYyBUaGUgZnVuY3Rpb24gdG8gZGVib3VuY2UuXHJcbiAgICogQHBhcmFtIHtudW1iZXJ9IFt3YWl0PTBdIFRoZSBudW1iZXIgb2YgbWlsbGlzZWNvbmRzIHRvIGRlbGF5LlxyXG4gICAqIEBwYXJhbSB7T2JqZWN0fSBbb3B0aW9uc10gVGhlIG9wdGlvbnMgb2JqZWN0LlxyXG4gICAqIEBwYXJhbSB7Ym9vbGVhbn0gW29wdGlvbnMubGVhZGluZz1mYWxzZV0gU3BlY2lmeSBpbnZva2luZyBvbiB0aGUgbGVhZGluZ1xyXG4gICAqICBlZGdlIG9mIHRoZSB0aW1lb3V0LlxyXG4gICAqIEBwYXJhbSB7bnVtYmVyfSBbb3B0aW9ucy5tYXhXYWl0XSBUaGUgbWF4aW11bSB0aW1lIGBmdW5jYCBpcyBhbGxvd2VkIHRvIGJlXHJcbiAgICogIGRlbGF5ZWQgYmVmb3JlIGl0J3MgaW52b2tlZC5cclxuICAgKiBAcGFyYW0ge2Jvb2xlYW59IFtvcHRpb25zLnRyYWlsaW5nPXRydWVdIFNwZWNpZnkgaW52b2tpbmcgb24gdGhlIHRyYWlsaW5nXHJcbiAgICogIGVkZ2Ugb2YgdGhlIHRpbWVvdXQuXHJcbiAgICogQHJldHVybnMge0Z1bmN0aW9ufSBSZXR1cm5zIHRoZSBuZXcgZGVib3VuY2VkIGZ1bmN0aW9uLlxyXG4gICAqIEBleGFtcGxlXHJcbiAgICpcclxuICAgKiAvLyBhdm9pZCBjb3N0bHkgY2FsY3VsYXRpb25zIHdoaWxlIHRoZSB3aW5kb3cgc2l6ZSBpcyBpbiBmbHV4XHJcbiAgICogalF1ZXJ5KHdpbmRvdykub24oJ3Jlc2l6ZScsIF8uZGVib3VuY2UoY2FsY3VsYXRlTGF5b3V0LCAxNTApKTtcclxuICAgKlxyXG4gICAqIC8vIGludm9rZSBgc2VuZE1haWxgIHdoZW4gdGhlIGNsaWNrIGV2ZW50IGlzIGZpcmVkLCBkZWJvdW5jaW5nIHN1YnNlcXVlbnQgY2FsbHNcclxuICAgKiBqUXVlcnkoJyNwb3N0Ym94Jykub24oJ2NsaWNrJywgXy5kZWJvdW5jZShzZW5kTWFpbCwgMzAwLCB7XHJcbiAgICogICAnbGVhZGluZyc6IHRydWUsXHJcbiAgICogICAndHJhaWxpbmcnOiBmYWxzZVxyXG4gICAqIH0pKTtcclxuICAgKlxyXG4gICAqIC8vIGVuc3VyZSBgYmF0Y2hMb2dgIGlzIGludm9rZWQgb25jZSBhZnRlciAxIHNlY29uZCBvZiBkZWJvdW5jZWQgY2FsbHNcclxuICAgKiB2YXIgc291cmNlID0gbmV3IEV2ZW50U291cmNlKCcvc3RyZWFtJyk7XHJcbiAgICogalF1ZXJ5KHNvdXJjZSkub24oJ21lc3NhZ2UnLCBfLmRlYm91bmNlKGJhdGNoTG9nLCAyNTAsIHtcclxuICAgKiAgICdtYXhXYWl0JzogMTAwMFxyXG4gICAqIH0pKTtcclxuICAgKlxyXG4gICAqIC8vIGNhbmNlbCBhIGRlYm91bmNlZCBjYWxsXHJcbiAgICogdmFyIHRvZG9DaGFuZ2VzID0gXy5kZWJvdW5jZShiYXRjaExvZywgMTAwMCk7XHJcbiAgICogT2JqZWN0Lm9ic2VydmUobW9kZWxzLnRvZG8sIHRvZG9DaGFuZ2VzKTtcclxuICAgKlxyXG4gICAqIE9iamVjdC5vYnNlcnZlKG1vZGVscywgZnVuY3Rpb24oY2hhbmdlcykge1xyXG4gICAqICAgaWYgKF8uZmluZChjaGFuZ2VzLCB7ICd1c2VyJzogJ3RvZG8nLCAndHlwZSc6ICdkZWxldGUnfSkpIHtcclxuICAgKiAgICAgdG9kb0NoYW5nZXMuY2FuY2VsKCk7XHJcbiAgICogICB9XHJcbiAgICogfSwgWydkZWxldGUnXSk7XHJcbiAgICpcclxuICAgKiAvLyAuLi5hdCBzb21lIHBvaW50IGBtb2RlbHMudG9kb2AgaXMgY2hhbmdlZFxyXG4gICAqIG1vZGVscy50b2RvLmNvbXBsZXRlZCA9IHRydWU7XHJcbiAgICpcclxuICAgKiAvLyAuLi5iZWZvcmUgMSBzZWNvbmQgaGFzIHBhc3NlZCBgbW9kZWxzLnRvZG9gIGlzIGRlbGV0ZWRcclxuICAgKiAvLyB3aGljaCBjYW5jZWxzIHRoZSBkZWJvdW5jZWQgYHRvZG9DaGFuZ2VzYCBjYWxsXHJcbiAgICogZGVsZXRlIG1vZGVscy50b2RvO1xyXG4gICAqL1xyXG4gIGZ1bmN0aW9uIGRlYm91bmNlKGZ1bmMsIHdhaXQsIG9wdGlvbnMpIHtcclxuICAgIHZhciBhcmdzLFxyXG4gICAgICAgICAgICBtYXhUaW1lb3V0SWQsXHJcbiAgICAgICAgICAgIHJlc3VsdCxcclxuICAgICAgICAgICAgc3RhbXAsXHJcbiAgICAgICAgICAgIHRoaXNBcmcsXHJcbiAgICAgICAgICAgIHRpbWVvdXRJZCxcclxuICAgICAgICAgICAgdHJhaWxpbmdDYWxsLFxyXG4gICAgICAgICAgICBsYXN0Q2FsbGVkID0gMCxcclxuICAgICAgICAgICAgbWF4V2FpdCA9IGZhbHNlLFxyXG4gICAgICAgICAgICB0cmFpbGluZyA9IHRydWU7XHJcblxyXG4gICAgaWYgKHR5cGVvZiBmdW5jICE9ICdmdW5jdGlvbicpIHtcclxuICAgICAgdGhyb3cgbmV3IFR5cGVFcnJvcihGVU5DX0VSUk9SX1RFWFQpO1xyXG4gICAgfVxyXG4gICAgd2FpdCA9IHdhaXQgPCAwID8gMCA6ICgrd2FpdCB8fCAwKTtcclxuICAgIGlmIChvcHRpb25zID09PSB0cnVlKSB7XHJcbiAgICAgIHZhciBsZWFkaW5nID0gdHJ1ZTtcclxuICAgICAgdHJhaWxpbmcgPSBmYWxzZTtcclxuICAgIH0gZWxzZSBpZiAoaXNPYmplY3Qob3B0aW9ucykpIHtcclxuICAgICAgbGVhZGluZyA9ICEhb3B0aW9ucy5sZWFkaW5nO1xyXG4gICAgICBtYXhXYWl0ID0gJ21heFdhaXQnIGluIG9wdGlvbnMgJiYgbmF0aXZlTWF4KCtvcHRpb25zLm1heFdhaXQgfHwgMCwgd2FpdCk7XHJcbiAgICAgIHRyYWlsaW5nID0gJ3RyYWlsaW5nJyBpbiBvcHRpb25zID8gISFvcHRpb25zLnRyYWlsaW5nIDogdHJhaWxpbmc7XHJcbiAgICB9XHJcblxyXG4gICAgZnVuY3Rpb24gY2FuY2VsKCkge1xyXG4gICAgICBpZiAodGltZW91dElkKSB7XHJcbiAgICAgICAgY2xlYXJUaW1lb3V0KHRpbWVvdXRJZCk7XHJcbiAgICAgIH1cclxuICAgICAgaWYgKG1heFRpbWVvdXRJZCkge1xyXG4gICAgICAgIGNsZWFyVGltZW91dChtYXhUaW1lb3V0SWQpO1xyXG4gICAgICB9XHJcbiAgICAgIGxhc3RDYWxsZWQgPSAwO1xyXG4gICAgICBtYXhUaW1lb3V0SWQgPSB0aW1lb3V0SWQgPSB0cmFpbGluZ0NhbGwgPSB1bmRlZmluZWQ7XHJcbiAgICB9XHJcblxyXG4gICAgZnVuY3Rpb24gY29tcGxldGUoaXNDYWxsZWQsIGlkKSB7XHJcbiAgICAgIGlmIChpZCkge1xyXG4gICAgICAgIGNsZWFyVGltZW91dChpZCk7XHJcbiAgICAgIH1cclxuICAgICAgbWF4VGltZW91dElkID0gdGltZW91dElkID0gdHJhaWxpbmdDYWxsID0gdW5kZWZpbmVkO1xyXG4gICAgICBpZiAoaXNDYWxsZWQpIHtcclxuICAgICAgICBsYXN0Q2FsbGVkID0gbm93KCk7XHJcbiAgICAgICAgcmVzdWx0ID0gZnVuYy5hcHBseSh0aGlzQXJnLCBhcmdzKTtcclxuICAgICAgICBpZiAoIXRpbWVvdXRJZCAmJiAhbWF4VGltZW91dElkKSB7XHJcbiAgICAgICAgICBhcmdzID0gdGhpc0FyZyA9IHVuZGVmaW5lZDtcclxuICAgICAgICB9XHJcbiAgICAgIH1cclxuICAgIH1cclxuXHJcbiAgICBmdW5jdGlvbiBkZWxheWVkKCkge1xyXG4gICAgICB2YXIgcmVtYWluaW5nID0gd2FpdCAtIChub3coKSAtIHN0YW1wKTtcclxuICAgICAgaWYgKHJlbWFpbmluZyA8PSAwIHx8IHJlbWFpbmluZyA+IHdhaXQpIHtcclxuICAgICAgICBjb21wbGV0ZSh0cmFpbGluZ0NhbGwsIG1heFRpbWVvdXRJZCk7XHJcbiAgICAgIH0gZWxzZSB7XHJcbiAgICAgICAgdGltZW91dElkID0gc2V0VGltZW91dChkZWxheWVkLCByZW1haW5pbmcpO1xyXG4gICAgICB9XHJcbiAgICB9XHJcblxyXG4gICAgZnVuY3Rpb24gbWF4RGVsYXllZCgpIHtcclxuICAgICAgY29tcGxldGUodHJhaWxpbmcsIHRpbWVvdXRJZCk7XHJcbiAgICB9XHJcblxyXG4gICAgZnVuY3Rpb24gZGVib3VuY2VkKCkge1xyXG4gICAgICBhcmdzID0gYXJndW1lbnRzO1xyXG4gICAgICBzdGFtcCA9IG5vdygpO1xyXG4gICAgICB0aGlzQXJnID0gdGhpcztcclxuICAgICAgdHJhaWxpbmdDYWxsID0gdHJhaWxpbmcgJiYgKHRpbWVvdXRJZCB8fCAhbGVhZGluZyk7XHJcblxyXG4gICAgICBpZiAobWF4V2FpdCA9PT0gZmFsc2UpIHtcclxuICAgICAgICB2YXIgbGVhZGluZ0NhbGwgPSBsZWFkaW5nICYmICF0aW1lb3V0SWQ7XHJcbiAgICAgIH0gZWxzZSB7XHJcbiAgICAgICAgaWYgKCFtYXhUaW1lb3V0SWQgJiYgIWxlYWRpbmcpIHtcclxuICAgICAgICAgIGxhc3RDYWxsZWQgPSBzdGFtcDtcclxuICAgICAgICB9XHJcbiAgICAgICAgdmFyIHJlbWFpbmluZyA9IG1heFdhaXQgLSAoc3RhbXAgLSBsYXN0Q2FsbGVkKSxcclxuICAgICAgICAgICAgICAgIGlzQ2FsbGVkID0gcmVtYWluaW5nIDw9IDAgfHwgcmVtYWluaW5nID4gbWF4V2FpdDtcclxuXHJcbiAgICAgICAgaWYgKGlzQ2FsbGVkKSB7XHJcbiAgICAgICAgICBpZiAobWF4VGltZW91dElkKSB7XHJcbiAgICAgICAgICAgIG1heFRpbWVvdXRJZCA9IGNsZWFyVGltZW91dChtYXhUaW1lb3V0SWQpO1xyXG4gICAgICAgICAgfVxyXG4gICAgICAgICAgbGFzdENhbGxlZCA9IHN0YW1wO1xyXG4gICAgICAgICAgcmVzdWx0ID0gZnVuYy5hcHBseSh0aGlzQXJnLCBhcmdzKTtcclxuICAgICAgICB9XHJcbiAgICAgICAgZWxzZSBpZiAoIW1heFRpbWVvdXRJZCkge1xyXG4gICAgICAgICAgbWF4VGltZW91dElkID0gc2V0VGltZW91dChtYXhEZWxheWVkLCByZW1haW5pbmcpO1xyXG4gICAgICAgIH1cclxuICAgICAgfVxyXG4gICAgICBpZiAoaXNDYWxsZWQgJiYgdGltZW91dElkKSB7XHJcbiAgICAgICAgdGltZW91dElkID0gY2xlYXJUaW1lb3V0KHRpbWVvdXRJZCk7XHJcbiAgICAgIH1cclxuICAgICAgZWxzZSBpZiAoIXRpbWVvdXRJZCAmJiB3YWl0ICE9PSBtYXhXYWl0KSB7XHJcbiAgICAgICAgdGltZW91dElkID0gc2V0VGltZW91dChkZWxheWVkLCB3YWl0KTtcclxuICAgICAgfVxyXG4gICAgICBpZiAobGVhZGluZ0NhbGwpIHtcclxuICAgICAgICBpc0NhbGxlZCA9IHRydWU7XHJcbiAgICAgICAgcmVzdWx0ID0gZnVuYy5hcHBseSh0aGlzQXJnLCBhcmdzKTtcclxuICAgICAgfVxyXG4gICAgICBpZiAoaXNDYWxsZWQgJiYgIXRpbWVvdXRJZCAmJiAhbWF4VGltZW91dElkKSB7XHJcbiAgICAgICAgYXJncyA9IHRoaXNBcmcgPSB1bmRlZmluZWQ7XHJcbiAgICAgIH1cclxuICAgICAgcmV0dXJuIHJlc3VsdDtcclxuICAgIH1cclxuXHJcbiAgICBkZWJvdW5jZWQuY2FuY2VsID0gY2FuY2VsO1xyXG4gICAgcmV0dXJuIGRlYm91bmNlZDtcclxuICB9XHJcblxyXG4gIC8qKlxyXG4gICAqIENoZWNrcyBpZiBgdmFsdWVgIGlzIHRoZSBbbGFuZ3VhZ2UgdHlwZV0oaHR0cHM6Ly9lczUuZ2l0aHViLmlvLyN4OCkgb2YgYE9iamVjdGAuXHJcbiAgICogKGUuZy4gYXJyYXlzLCBmdW5jdGlvbnMsIG9iamVjdHMsIHJlZ2V4ZXMsIGBuZXcgTnVtYmVyKDApYCwgYW5kIGBuZXcgU3RyaW5nKCcnKWApXHJcbiAgICpcclxuICAgKiBAc3RhdGljXHJcbiAgICogQG1lbWJlck9mIF9cclxuICAgKiBAY2F0ZWdvcnkgTGFuZ1xyXG4gICAqIEBwYXJhbSB7Kn0gdmFsdWUgVGhlIHZhbHVlIHRvIGNoZWNrLlxyXG4gICAqIEByZXR1cm5zIHtib29sZWFufSBSZXR1cm5zIGB0cnVlYCBpZiBgdmFsdWVgIGlzIGFuIG9iamVjdCwgZWxzZSBgZmFsc2VgLlxyXG4gICAqIEBleGFtcGxlXHJcbiAgICpcclxuICAgKiBfLmlzT2JqZWN0KHt9KTtcclxuICAgKiAvLyA9PiB0cnVlXHJcbiAgICpcclxuICAgKiBfLmlzT2JqZWN0KFsxLCAyLCAzXSk7XHJcbiAgICogLy8gPT4gdHJ1ZVxyXG4gICAqXHJcbiAgICogXy5pc09iamVjdCgxKTtcclxuICAgKiAvLyA9PiBmYWxzZVxyXG4gICAqL1xyXG4gIGZ1bmN0aW9uIGlzT2JqZWN0KHZhbHVlKSB7XHJcbiAgICAvLyBBdm9pZCBhIFY4IEpJVCBidWcgaW4gQ2hyb21lIDE5LTIwLlxyXG4gICAgLy8gU2VlIGh0dHBzOi8vY29kZS5nb29nbGUuY29tL3AvdjgvaXNzdWVzL2RldGFpbD9pZD0yMjkxIGZvciBtb3JlIGRldGFpbHMuXHJcbiAgICB2YXIgdHlwZSA9IHR5cGVvZiB2YWx1ZTtcclxuICAgIHJldHVybiAhIXZhbHVlICYmICh0eXBlID09ICdvYmplY3QnIHx8IHR5cGUgPT0gJ2Z1bmN0aW9uJyk7XHJcbiAgfVxyXG5cclxuICByZXR1cm4gZGVib3VuY2U7XHJcblxyXG59KSgpO1xyXG5cclxubW9kdWxlLmV4cG9ydHMgPSBkZWJvdW5jZTsiLCI7KGZ1bmN0aW9uKCl7ICd1c2Ugc3RyaWN0JztcclxuICBcclxuICB2YXIgYmVuZFBvaW50VXRpbGl0aWVzID0gcmVxdWlyZSgnLi9iZW5kUG9pbnRVdGlsaXRpZXMnKTtcclxuICB2YXIgZGVib3VuY2UgPSByZXF1aXJlKFwiLi9kZWJvdW5jZVwiKTtcclxuICBcclxuICAvLyByZWdpc3RlcnMgdGhlIGV4dGVuc2lvbiBvbiBhIGN5dG9zY2FwZSBsaWIgcmVmXHJcbiAgdmFyIHJlZ2lzdGVyID0gZnVuY3Rpb24oIGN5dG9zY2FwZSwgJCApe1xyXG4gICAgdmFyIHVpVXRpbGl0aWVzID0gcmVxdWlyZSgnLi9VSVV0aWxpdGllcycpO1xyXG4gICAgXHJcbiAgICBpZiggIWN5dG9zY2FwZSApeyByZXR1cm47IH0gLy8gY2FuJ3QgcmVnaXN0ZXIgaWYgY3l0b3NjYXBlIHVuc3BlY2lmaWVkXHJcblxyXG4gICAgdmFyIGRlZmF1bHRzID0ge1xyXG4gICAgICAvLyB0aGlzIGZ1bmN0aW9uIHNwZWNpZmllcyB0aGUgcG9pdGlvbnMgb2YgYmVuZCBwb2ludHNcclxuICAgICAgYmVuZFBvc2l0aW9uc0Z1bmN0aW9uOiBmdW5jdGlvbihlbGUpIHtcclxuICAgICAgICByZXR1cm4gZWxlLmRhdGEoJ2JlbmRQb2ludFBvc2l0aW9ucycpO1xyXG4gICAgICB9LFxyXG4gICAgICAvLyB3aGV0aGVyIHRvIGluaXRpbGl6ZSBiZW5kIHBvaW50cyBvbiBjcmVhdGlvbiBvZiB0aGlzIGV4dGVuc2lvbiBhdXRvbWF0aWNhbGx5XHJcbiAgICAgIGluaXRCZW5kUG9pbnRzQXV0b21hdGljYWxseTogdHJ1ZSxcclxuICAgICAgLy8gdGhlIGNsYXNzZXMgb2YgdGhvc2UgZWRnZXMgdGhhdCBzaG91bGQgYmUgaWdub3JlZFxyXG4gICAgICBpZ25vcmVkQ2xhc3NlczogW10sXHJcbiAgICAgIC8vIHdoZXRoZXIgdGhlIGJlbmQgZWRpdGluZyBvcGVyYXRpb25zIGFyZSB1bmRvYWJsZSAocmVxdWlyZXMgY3l0b3NjYXBlLXVuZG8tcmVkby5qcylcclxuICAgICAgdW5kb2FibGU6IGZhbHNlLFxyXG4gICAgICAvLyB0aGUgc2l6ZSBvZiBiZW5kIHNoYXBlIGlzIG9idGFpbmVkIGJ5IG11bHRpcGxpbmcgd2lkdGggb2YgZWRnZSB3aXRoIHRoaXMgcGFyYW1ldGVyXHJcbiAgICAgIGJlbmRTaGFwZVNpemVGYWN0b3I6IDMsXHJcbiAgICAgIC8vIHdoZXRoZXIgdG8gc3RhcnQgdGhlIHBsdWdpbiBpbiB0aGUgZW5hYmxlZCBzdGF0ZVxyXG4gICAgICBlbmFibGVkOiB0cnVlLFxyXG4gICAgICAvLyB0aXRsZSBvZiBhZGQgYmVuZCBwb2ludCBtZW51IGl0ZW0gKFVzZXIgbWF5IG5lZWQgdG8gYWRqdXN0IHdpZHRoIG9mIG1lbnUgaXRlbXMgYWNjb3JkaW5nIHRvIGxlbmd0aCBvZiB0aGlzIG9wdGlvbilcclxuICAgICAgYWRkQmVuZE1lbnVJdGVtVGl0bGU6IFwiQWRkIEJlbmQgUG9pbnRcIixcclxuICAgICAgLy8gdGl0bGUgb2YgcmVtb3ZlIGJlbmQgcG9pbnQgbWVudSBpdGVtIChVc2VyIG1heSBuZWVkIHRvIGFkanVzdCB3aWR0aCBvZiBtZW51IGl0ZW1zIGFjY29yZGluZyB0byBsZW5ndGggb2YgdGhpcyBvcHRpb24pXHJcbiAgICAgIHJlbW92ZUJlbmRNZW51SXRlbVRpdGxlOiBcIlJlbW92ZSBCZW5kIFBvaW50XCIsXHJcbiAgICAgIC8vIHdoZXRoZXIgdGhlIGJlbmQgcG9pbnQgY2FuIGJlIG1vdmVkIGJ5IGFycm93c1xyXG4gICAgICBtb3ZlU2VsZWN0ZWRCZW5kUG9pbnRzT25LZXlFdmVudHM6IGZ1bmN0aW9uICgpIHtcclxuICAgICAgICAgIHJldHVybiB0cnVlO1xyXG4gICAgICB9XHJcbiAgICB9O1xyXG4gICAgXHJcbiAgICB2YXIgb3B0aW9ucztcclxuICAgIHZhciBpbml0aWFsaXplZCA9IGZhbHNlO1xyXG4gICAgXHJcbiAgICAvLyBNZXJnZSBkZWZhdWx0IG9wdGlvbnMgd2l0aCB0aGUgb25lcyBjb21pbmcgZnJvbSBwYXJhbWV0ZXJcclxuICAgIGZ1bmN0aW9uIGV4dGVuZChkZWZhdWx0cywgb3B0aW9ucykge1xyXG4gICAgICB2YXIgb2JqID0ge307XHJcblxyXG4gICAgICBmb3IgKHZhciBpIGluIGRlZmF1bHRzKSB7XHJcbiAgICAgICAgb2JqW2ldID0gZGVmYXVsdHNbaV07XHJcbiAgICAgIH1cclxuXHJcbiAgICAgIGZvciAodmFyIGkgaW4gb3B0aW9ucykge1xyXG4gICAgICAgIG9ialtpXSA9IG9wdGlvbnNbaV07XHJcbiAgICAgIH1cclxuXHJcbiAgICAgIHJldHVybiBvYmo7XHJcbiAgICB9O1xyXG4gICAgXHJcbiAgICBjeXRvc2NhcGUoICdjb3JlJywgJ2VkZ2VCZW5kRWRpdGluZycsIGZ1bmN0aW9uKG9wdHMpe1xyXG4gICAgICB2YXIgY3kgPSB0aGlzO1xyXG4gICAgICBcclxuICAgICAgaWYoIG9wdHMgPT09ICdpbml0aWFsaXplZCcgKSB7XHJcbiAgICAgICAgcmV0dXJuIGluaXRpYWxpemVkO1xyXG4gICAgICB9XHJcbiAgICAgIFxyXG4gICAgICBpZiggb3B0cyAhPT0gJ2dldCcgKSB7XHJcbiAgICAgICAgLy8gbWVyZ2UgdGhlIG9wdGlvbnMgd2l0aCBkZWZhdWx0IG9uZXNcclxuICAgICAgICBvcHRpb25zID0gZXh0ZW5kKGRlZmF1bHRzLCBvcHRzKTtcclxuICAgICAgICBpbml0aWFsaXplZCA9IHRydWU7XHJcblxyXG4gICAgICAgIC8vIGRlZmluZSBlZGdlYmVuZGVkaXRpbmctaGFzYmVuZHBvaW50cyBjc3MgY2xhc3NcclxuICAgICAgICBjeS5zdHlsZSgpLnNlbGVjdG9yKCcuZWRnZWJlbmRlZGl0aW5nLWhhc2JlbmRwb2ludHMnKS5jc3Moe1xyXG4gICAgICAgICAgJ2N1cnZlLXN0eWxlJzogJ3NlZ21lbnRzJyxcclxuICAgICAgICAgICdzZWdtZW50LWRpc3RhbmNlcyc6IGZ1bmN0aW9uIChlbGUpIHtcclxuICAgICAgICAgICAgcmV0dXJuIGJlbmRQb2ludFV0aWxpdGllcy5nZXRTZWdtZW50RGlzdGFuY2VzU3RyaW5nKGVsZSk7XHJcbiAgICAgICAgICB9LFxyXG4gICAgICAgICAgJ3NlZ21lbnQtd2VpZ2h0cyc6IGZ1bmN0aW9uIChlbGUpIHtcclxuICAgICAgICAgICAgcmV0dXJuIGJlbmRQb2ludFV0aWxpdGllcy5nZXRTZWdtZW50V2VpZ2h0c1N0cmluZyhlbGUpO1xyXG4gICAgICAgICAgfSxcclxuICAgICAgICAgICdlZGdlLWRpc3RhbmNlcyc6ICdub2RlLXBvc2l0aW9uJ1xyXG4gICAgICAgIH0pO1xyXG5cclxuICAgICAgICBiZW5kUG9pbnRVdGlsaXRpZXMuc2V0SWdub3JlZENsYXNzZXMob3B0aW9ucy5pZ25vcmVkQ2xhc3Nlcyk7XHJcblxyXG4gICAgICAgIC8vIGluaXQgYmVuZCBwb3NpdGlvbnMgY29uZGl0aW9uYWxseVxyXG4gICAgICAgIGlmIChvcHRpb25zLmluaXRCZW5kUG9pbnRzQXV0b21hdGljYWxseSkge1xyXG4gICAgICAgICAgYmVuZFBvaW50VXRpbGl0aWVzLmluaXRCZW5kUG9pbnRzKG9wdGlvbnMuYmVuZFBvc2l0aW9uc0Z1bmN0aW9uLCBjeS5lZGdlcygpLCBvcHRpb25zLmlnbm9yZWRDbGFzc2VzKTtcclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIGlmKG9wdGlvbnMuZW5hYmxlZClcclxuICAgICAgICAgIHVpVXRpbGl0aWVzKG9wdGlvbnMsIGN5KTtcclxuICAgICAgICBlbHNlXHJcbiAgICAgICAgICB1aVV0aWxpdGllcyhcInVuYmluZFwiLCBjeSk7XHJcbiAgICAgIH1cclxuICAgICAgXHJcbiAgICAgIHZhciBpbnN0YW5jZSA9IGluaXRpYWxpemVkID8ge1xyXG4gICAgICAgIC8qXHJcbiAgICAgICAgKiBnZXQgc2VnbWVudCBwb2ludHMgb2YgdGhlIGdpdmVuIGVkZ2UgaW4gYW4gYXJyYXkgQSxcclxuICAgICAgICAqIEFbMiAqIGldIGlzIHRoZSB4IGNvb3JkaW5hdGUgYW5kIEFbMiAqIGkgKyAxXSBpcyB0aGUgeSBjb29yZGluYXRlXHJcbiAgICAgICAgKiBvZiB0aGUgaXRoIGJlbmQgcG9pbnQuIChSZXR1cm5zIHVuZGVmaW5lZCBpZiB0aGUgY3VydmUgc3R5bGUgaXMgbm90IHNlZ21lbnRzKVxyXG4gICAgICAgICovXHJcbiAgICAgICAgZ2V0U2VnbWVudFBvaW50czogZnVuY3Rpb24oZWxlKSB7XHJcbiAgICAgICAgICByZXR1cm4gYmVuZFBvaW50VXRpbGl0aWVzLmdldFNlZ21lbnRQb2ludHMoZWxlKTtcclxuICAgICAgICB9LFxyXG4gICAgICAgIC8vIEluaXRpbGl6ZSBiZW5kIHBvaW50cyBmb3IgdGhlIGdpdmVuIGVkZ2VzIHVzaW5nICdvcHRpb25zLmJlbmRQb3NpdGlvbnNGdW5jdGlvbidcclxuICAgICAgICBpbml0QmVuZFBvaW50czogZnVuY3Rpb24oZWxlcykge1xyXG4gICAgICAgICAgYmVuZFBvaW50VXRpbGl0aWVzLmluaXRCZW5kUG9pbnRzKG9wdGlvbnMuYmVuZFBvc2l0aW9uc0Z1bmN0aW9uLCBlbGVzKTtcclxuICAgICAgICB9LFxyXG4gICAgICAgIGRlbGV0ZVNlbGVjdGVkQmVuZFBvaW50OiBmdW5jdGlvbihlbGUsIGluZGV4KSB7XHJcbiAgICAgICAgICBiZW5kUG9pbnRVdGlsaXRpZXMucmVtb3ZlQmVuZFBvaW50KGVsZSxpbmRleCk7XHJcbiAgICAgICAgfVxyXG4gICAgICB9IDogdW5kZWZpbmVkO1xyXG5cclxuICAgICAgcmV0dXJuIGluc3RhbmNlOyAvLyBjaGFpbmFiaWxpdHlcclxuICAgIH0gKTtcclxuXHJcbiAgfTtcclxuXHJcbiAgaWYoIHR5cGVvZiBtb2R1bGUgIT09ICd1bmRlZmluZWQnICYmIG1vZHVsZS5leHBvcnRzICl7IC8vIGV4cG9zZSBhcyBhIGNvbW1vbmpzIG1vZHVsZVxyXG4gICAgbW9kdWxlLmV4cG9ydHMgPSByZWdpc3RlcjtcclxuICB9XHJcblxyXG4gIGlmKCB0eXBlb2YgZGVmaW5lICE9PSAndW5kZWZpbmVkJyAmJiBkZWZpbmUuYW1kICl7IC8vIGV4cG9zZSBhcyBhbiBhbWQvcmVxdWlyZWpzIG1vZHVsZVxyXG4gICAgZGVmaW5lKCdjeXRvc2NhcGUtZWRnZS1iZW5kLWVkaXRpbmcnLCBmdW5jdGlvbigpe1xyXG4gICAgICByZXR1cm4gcmVnaXN0ZXI7XHJcbiAgICB9KTtcclxuICB9XHJcblxyXG4gIGlmKCB0eXBlb2YgY3l0b3NjYXBlICE9PSAndW5kZWZpbmVkJyAmJiAkICl7IC8vIGV4cG9zZSB0byBnbG9iYWwgY3l0b3NjYXBlIChpLmUuIHdpbmRvdy5jeXRvc2NhcGUpXHJcbiAgICByZWdpc3RlciggY3l0b3NjYXBlLCAkICk7XHJcbiAgfVxyXG5cclxufSkoKTtcclxuIiwidmFyIHJlY29ubmVjdGlvblV0aWxpdGllcyA9IHtcclxuXHJcbiAgICAvLyBjcmVhdGVzIGFuZCByZXR1cm5zIGEgZHVtbXkgbm9kZSB3aGljaCBpcyBjb25uZWN0ZWQgdG8gdGhlIGRpc2Nvbm5lY3RlZCBlZGdlXHJcbiAgICBkaXNjb25uZWN0RWRnZTogZnVuY3Rpb24gKGVkZ2UsIGN5LCBwb3NpdGlvbiwgZGlzY29ubmVjdGVkRW5kKSB7XHJcbiAgICAgICAgXHJcbiAgICAgICAgdmFyIGR1bW15Tm9kZSA9IHtcclxuICAgICAgICAgICAgZGF0YTogeyBcclxuICAgICAgICAgICAgICBpZDogJ253dF9yZWNvbm5lY3RFZGdlX2R1bW15JyxcclxuICAgICAgICAgICAgICBwb3J0czogW10sXHJcbiAgICAgICAgICAgIH0sXHJcbiAgICAgICAgICAgIHN0eWxlOiB7XHJcbiAgICAgICAgICAgICAgd2lkdGg6IDEsXHJcbiAgICAgICAgICAgICAgaGVpZ2h0OiAxLFxyXG4gICAgICAgICAgICAgICd2aXNpYmlsaXR5JzogJ2hpZGRlbidcclxuICAgICAgICAgICAgfSxcclxuICAgICAgICAgICAgcmVuZGVyZWRQb3NpdGlvbjogcG9zaXRpb25cclxuICAgICAgICB9O1xyXG4gICAgICAgIGN5LmFkZChkdW1teU5vZGUpO1xyXG5cclxuICAgICAgICB2YXIgbG9jID0gKGRpc2Nvbm5lY3RlZEVuZCA9PT0gJ3NvdXJjZScpID8gXHJcbiAgICAgICAgICAgIHtzb3VyY2U6IGR1bW15Tm9kZS5kYXRhLmlkfSA6IFxyXG4gICAgICAgICAgICB7dGFyZ2V0OiBkdW1teU5vZGUuZGF0YS5pZH07XHJcblxyXG4gICAgICAgIGVkZ2UgPSBlZGdlLm1vdmUobG9jKVswXTtcclxuXHJcbiAgICAgICAgcmV0dXJuIHtcclxuICAgICAgICAgICAgZHVtbXlOb2RlOiBjeS5ub2RlcyhcIiNcIiArIGR1bW15Tm9kZS5kYXRhLmlkKVswXSxcclxuICAgICAgICAgICAgZWRnZTogZWRnZVxyXG4gICAgICAgIH07XHJcbiAgICB9LFxyXG5cclxuICAgIGNvbm5lY3RFZGdlOiBmdW5jdGlvbiAoZWRnZSwgbm9kZSwgbG9jYXRpb24pIHtcclxuICAgICAgICBpZighZWRnZS5pc0VkZ2UoKSB8fCAhbm9kZS5pc05vZGUoKSlcclxuICAgICAgICAgICAgcmV0dXJuO1xyXG5cclxuICAgICAgICB2YXIgbG9jID0ge307XHJcbiAgICAgICAgaWYobG9jYXRpb24gPT09ICdzb3VyY2UnKVxyXG4gICAgICAgICAgICBsb2Muc291cmNlID0gbm9kZS5pZCgpO1xyXG4gICAgICAgIFxyXG4gICAgICAgIGVsc2UgaWYobG9jYXRpb24gPT09ICd0YXJnZXQnKVxyXG4gICAgICAgICAgICBsb2MudGFyZ2V0ID0gbm9kZS5pZCgpO1xyXG4gICAgICAgIFxyXG4gICAgICAgIGVsc2VcclxuICAgICAgICAgICAgcmV0dXJuO1xyXG5cclxuICAgICAgICByZXR1cm4gZWRnZS5tb3ZlKGxvYylbMF07XHJcbiAgICB9LFxyXG5cclxuICAgIGNvcHlFZGdlOiBmdW5jdGlvbiAob2xkRWRnZSwgbmV3RWRnZSkge1xyXG4gICAgICAgIHRoaXMuY29weUJlbmRQb2ludHMob2xkRWRnZSwgbmV3RWRnZSk7XHJcbiAgICAgICAgdGhpcy5jb3B5U3R5bGUob2xkRWRnZSwgbmV3RWRnZSk7XHJcbiAgICB9LFxyXG5cclxuICAgIGNvcHlTdHlsZTogZnVuY3Rpb24gKG9sZEVkZ2UsIG5ld0VkZ2UpIHtcclxuICAgICAgICBpZihvbGRFZGdlICYmIG5ld0VkZ2Upe1xyXG4gICAgICAgICAgICBuZXdFZGdlLmRhdGEoJ2xpbmUtY29sb3InLCBvbGRFZGdlLmRhdGEoJ2xpbmUtY29sb3InKSk7XHJcbiAgICAgICAgICAgIG5ld0VkZ2UuZGF0YSgnd2lkdGgnLCBvbGRFZGdlLmRhdGEoJ3dpZHRoJykpO1xyXG4gICAgICAgICAgICBuZXdFZGdlLmRhdGEoJ2NhcmRpbmFsaXR5Jywgb2xkRWRnZS5kYXRhKCdjYXJkaW5hbGl0eScpKTtcclxuICAgICAgICB9XHJcbiAgICB9LFxyXG5cclxuICAgIGNvcHlCZW5kUG9pbnRzOiBmdW5jdGlvbiAob2xkRWRnZSwgbmV3RWRnZSkge1xyXG4gICAgICAgIGlmKG9sZEVkZ2UuaGFzQ2xhc3MoJ2VkZ2ViZW5kZWRpdGluZy1oYXNiZW5kcG9pbnRzJykpe1xyXG4gICAgICAgICAgICB2YXIgYnBEaXN0YW5jZXMgPSBvbGRFZGdlLmRhdGEoJ2N5ZWRnZWJlbmRlZGl0aW5nRGlzdGFuY2VzJyk7XHJcbiAgICAgICAgICAgIHZhciBicFdlaWdodHMgPSBvbGRFZGdlLmRhdGEoJ2N5ZWRnZWJlbmRlZGl0aW5nV2VpZ2h0cycpO1xyXG4gICAgICAgICAgICBcclxuICAgICAgICAgICAgbmV3RWRnZS5kYXRhKCdjeWVkZ2ViZW5kZWRpdGluZ0Rpc3RhbmNlcycsIGJwRGlzdGFuY2VzKTtcclxuICAgICAgICAgICAgbmV3RWRnZS5kYXRhKCdjeWVkZ2ViZW5kZWRpdGluZ1dlaWdodHMnLCBicFdlaWdodHMpO1xyXG4gICAgICAgICAgICBuZXdFZGdlLmFkZENsYXNzKCdlZGdlYmVuZGVkaXRpbmctaGFzYmVuZHBvaW50cycpO1xyXG4gICAgICAgIH1cclxuICAgIH0sXHJcbn07XHJcbiAgXHJcbm1vZHVsZS5leHBvcnRzID0gcmVjb25uZWN0aW9uVXRpbGl0aWVzO1xyXG4gICIsIm1vZHVsZS5leHBvcnRzID0gZnVuY3Rpb24gKGN5LCBiZW5kUG9pbnRVdGlsaXRpZXMsIHBhcmFtcykge1xyXG4gIGlmIChjeS51bmRvUmVkbyA9PSBudWxsKVxyXG4gICAgcmV0dXJuO1xyXG5cclxuICB2YXIgdXIgPSBjeS51bmRvUmVkbyh7XHJcbiAgICBkZWZhdWx0QWN0aW9uczogZmFsc2UsXHJcbiAgICBpc0RlYnVnOiB0cnVlXHJcbiAgfSk7XHJcblxyXG4gIGZ1bmN0aW9uIGNoYW5nZUJlbmRQb2ludHMocGFyYW0pIHtcclxuICAgIHZhciBlZGdlID0gY3kuZ2V0RWxlbWVudEJ5SWQocGFyYW0uZWRnZS5pZCgpKTtcclxuICAgIHZhciByZXN1bHQgPSB7XHJcbiAgICAgIGVkZ2U6IGVkZ2UsXHJcbiAgICAgIHdlaWdodHM6IHBhcmFtLnNldCA/IGVkZ2UuZGF0YSgnY3llZGdlYmVuZGVkaXRpbmdXZWlnaHRzJykgOiBwYXJhbS53ZWlnaHRzLFxyXG4gICAgICBkaXN0YW5jZXM6IHBhcmFtLnNldCA/IGVkZ2UuZGF0YSgnY3llZGdlYmVuZGVkaXRpbmdEaXN0YW5jZXMnKSA6IHBhcmFtLmRpc3RhbmNlcyxcclxuICAgICAgc2V0OiB0cnVlLy9BcyB0aGUgcmVzdWx0IHdpbGwgbm90IGJlIHVzZWQgZm9yIHRoZSBmaXJzdCBmdW5jdGlvbiBjYWxsIHBhcmFtcyBzaG91bGQgYmUgdXNlZCB0byBzZXQgdGhlIGRhdGFcclxuICAgIH07XHJcblxyXG4gICAgdmFyIGhhc0JlbmQgPSBwYXJhbS53ZWlnaHRzICYmIHBhcmFtLndlaWdodHMubGVuZ3RoID4gMDtcclxuXHJcbiAgICAvL0NoZWNrIGlmIHdlIG5lZWQgdG8gc2V0IHRoZSB3ZWlnaHRzIGFuZCBkaXN0YW5jZXMgYnkgdGhlIHBhcmFtIHZhbHVlc1xyXG4gICAgaWYgKHBhcmFtLnNldCkge1xyXG4gICAgICBoYXNCZW5kID8gZWRnZS5kYXRhKCdjeWVkZ2ViZW5kZWRpdGluZ1dlaWdodHMnLCBwYXJhbS53ZWlnaHRzKSA6IGVkZ2UucmVtb3ZlRGF0YSgnY3llZGdlYmVuZGVkaXRpbmdXZWlnaHRzJyk7XHJcbiAgICAgIGhhc0JlbmQgPyBlZGdlLmRhdGEoJ2N5ZWRnZWJlbmRlZGl0aW5nRGlzdGFuY2VzJywgcGFyYW0uZGlzdGFuY2VzKSA6IGVkZ2UucmVtb3ZlRGF0YSgnY3llZGdlYmVuZGVkaXRpbmdEaXN0YW5jZXMnKTtcclxuXHJcbiAgICAgIC8vcmVmcmVzaCB0aGUgY3VydmUgc3R5bGUgYXMgdGhlIG51bWJlciBvZiBiZW5kIHBvaW50IHdvdWxkIGJlIGNoYW5nZWQgYnkgdGhlIHByZXZpb3VzIG9wZXJhdGlvblxyXG4gICAgICBpZiAoaGFzQmVuZCkge1xyXG4gICAgICAgIGVkZ2UuYWRkQ2xhc3MoJ2VkZ2ViZW5kZWRpdGluZy1oYXNiZW5kcG9pbnRzJyk7XHJcbiAgICAgIH1cclxuICAgICAgZWxzZSB7XHJcbiAgICAgICAgZWRnZS5yZW1vdmVDbGFzcygnZWRnZWJlbmRlZGl0aW5nLWhhc2JlbmRwb2ludHMnKTtcclxuICAgICAgfVxyXG4gICAgfVxyXG4gICAgXHJcbiAgICBlZGdlLnRyaWdnZXIoJ2N5ZWRnZWJlbmRlZGl0aW5nLmNoYW5nZUJlbmRQb2ludHMnKTtcclxuXHJcbiAgICByZXR1cm4gcmVzdWx0O1xyXG4gIH1cclxuXHJcbiAgZnVuY3Rpb24gbW92ZURvKGFyZykge1xyXG4gICAgICBpZiAoYXJnLmZpcnN0VGltZSkge1xyXG4gICAgICAgICAgZGVsZXRlIGFyZy5maXJzdFRpbWU7XHJcbiAgICAgICAgICByZXR1cm4gYXJnO1xyXG4gICAgICB9XHJcblxyXG4gICAgICB2YXIgZWRnZXMgPSBhcmcuZWRnZXM7XHJcbiAgICAgIHZhciBwb3NpdGlvbkRpZmYgPSBhcmcucG9zaXRpb25EaWZmO1xyXG4gICAgICB2YXIgcmVzdWx0ID0ge1xyXG4gICAgICAgICAgZWRnZXM6IGVkZ2VzLFxyXG4gICAgICAgICAgcG9zaXRpb25EaWZmOiB7XHJcbiAgICAgICAgICAgICAgeDogLXBvc2l0aW9uRGlmZi54LFxyXG4gICAgICAgICAgICAgIHk6IC1wb3NpdGlvbkRpZmYueVxyXG4gICAgICAgICAgfVxyXG4gICAgICB9O1xyXG4gICAgICBtb3ZlQmVuZFBvaW50c1VuZG9hYmxlKHBvc2l0aW9uRGlmZiwgZWRnZXMpO1xyXG5cclxuICAgICAgcmV0dXJuIHJlc3VsdDtcclxuICB9XHJcblxyXG4gIGZ1bmN0aW9uIG1vdmVCZW5kUG9pbnRzVW5kb2FibGUocG9zaXRpb25EaWZmLCBlZGdlcykge1xyXG4gICAgICBlZGdlcy5mb3JFYWNoKGZ1bmN0aW9uKCBlZGdlICl7XHJcbiAgICAgICAgICBlZGdlID0gY3kuZ2V0RWxlbWVudEJ5SWQocGFyYW0uZWRnZS5pZCgpKTtcclxuICAgICAgICAgIHZhciBwcmV2aW91c0JlbmRQb2ludHNQb3NpdGlvbiA9IGJlbmRQb2ludFV0aWxpdGllcy5nZXRTZWdtZW50UG9pbnRzKGVkZ2UpO1xyXG4gICAgICAgICAgdmFyIG5leHRCZW5kUG9pbnRzUG9zaXRpb24gPSBbXTtcclxuICAgICAgICAgIGlmIChwcmV2aW91c0JlbmRQb2ludHNQb3NpdGlvbiAhPSB1bmRlZmluZWQpXHJcbiAgICAgICAgICB7XHJcbiAgICAgICAgICAgICAgZm9yIChpPTA7IGk8cHJldmlvdXNCZW5kUG9pbnRzUG9zaXRpb24ubGVuZ3RoOyBpKz0yKVxyXG4gICAgICAgICAgICAgIHtcclxuICAgICAgICAgICAgICAgICAgbmV4dEJlbmRQb2ludHNQb3NpdGlvbi5wdXNoKHt4OiBwcmV2aW91c0JlbmRQb2ludHNQb3NpdGlvbltpXStwb3NpdGlvbkRpZmYueCwgeTogcHJldmlvdXNCZW5kUG9pbnRzUG9zaXRpb25baSsxXStwb3NpdGlvbkRpZmYueX0pO1xyXG4gICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICBlZGdlLmRhdGEoJ2JlbmRQb2ludFBvc2l0aW9ucycsbmV4dEJlbmRQb2ludHNQb3NpdGlvbik7XHJcbiAgICAgICAgICB9XHJcbiAgICAgIH0pO1xyXG5cclxuICAgICAgYmVuZFBvaW50VXRpbGl0aWVzLmluaXRCZW5kUG9pbnRzKHBhcmFtcy5iZW5kUG9zaXRpb25zRnVuY3Rpb24sIGVkZ2VzKTtcclxuICB9XHJcblxyXG4gIGZ1bmN0aW9uIHJlY29ubmVjdEVkZ2UocGFyYW0pe1xyXG4gICAgdmFyIGVkZ2UgICAgICA9IHBhcmFtLmVkZ2U7XHJcbiAgICB2YXIgbG9jYXRpb24gID0gcGFyYW0ubG9jYXRpb247XHJcbiAgICB2YXIgb2xkTG9jICAgID0gcGFyYW0ub2xkTG9jO1xyXG5cclxuICAgIGVkZ2UgPSBlZGdlLm1vdmUobG9jYXRpb24pWzBdO1xyXG5cclxuICAgIHZhciByZXN1bHQgPSB7XHJcbiAgICAgIGVkZ2U6ICAgICBlZGdlLFxyXG4gICAgICBsb2NhdGlvbjogb2xkTG9jLFxyXG4gICAgICBvbGRMb2M6ICAgbG9jYXRpb25cclxuICAgIH1cclxuICAgIHJldHVybiByZXN1bHQ7XHJcbiAgfVxyXG5cclxuICBmdW5jdGlvbiByZW1vdmVSZWNvbm5lY3RlZEVkZ2UocGFyYW0pe1xyXG4gICAgdmFyIG9sZEVkZ2UgPSBwYXJhbS5vbGRFZGdlO1xyXG4gICAgdmFyIHRtcCA9IGN5LmdldEVsZW1lbnRCeUlkKG9sZEVkZ2UuZGF0YSgnaWQnKSk7XHJcbiAgICBpZih0bXAgJiYgdG1wLmxlbmd0aCA+IDApXHJcbiAgICAgIG9sZEVkZ2UgPSB0bXA7XHJcblxyXG4gICAgdmFyIG5ld0VkZ2UgPSBwYXJhbS5uZXdFZGdlO1xyXG4gICAgdmFyIHRtcCA9IGN5LmdldEVsZW1lbnRCeUlkKG5ld0VkZ2UuZGF0YSgnaWQnKSk7XHJcbiAgICBpZih0bXAgJiYgdG1wLmxlbmd0aCA+IDApXHJcbiAgICAgIG5ld0VkZ2UgPSB0bXA7XHJcblxyXG4gICAgaWYob2xkRWRnZS5pbnNpZGUoKSl7XHJcbiAgICAgIG9sZEVkZ2UgPSBvbGRFZGdlLnJlbW92ZSgpWzBdO1xyXG4gICAgfSBcclxuICAgICAgXHJcbiAgICBpZihuZXdFZGdlLnJlbW92ZWQoKSl7XHJcbiAgICAgIG5ld0VkZ2UgPSBuZXdFZGdlLnJlc3RvcmUoKTtcclxuICAgICAgbmV3RWRnZS51bnNlbGVjdCgpO1xyXG4gICAgfVxyXG4gICAgXHJcbiAgICByZXR1cm4ge1xyXG4gICAgICBvbGRFZGdlOiBuZXdFZGdlLFxyXG4gICAgICBuZXdFZGdlOiBvbGRFZGdlXHJcbiAgICB9O1xyXG4gIH1cclxuXHJcbiAgdXIuYWN0aW9uKCdjaGFuZ2VCZW5kUG9pbnRzJywgY2hhbmdlQmVuZFBvaW50cywgY2hhbmdlQmVuZFBvaW50cyk7XHJcbiAgdXIuYWN0aW9uKCdtb3ZlQmVuZFBvaW50cycsIG1vdmVEbywgbW92ZURvKTtcclxuICB1ci5hY3Rpb24oJ3JlY29ubmVjdEVkZ2UnLCByZWNvbm5lY3RFZGdlLCByZWNvbm5lY3RFZGdlKTtcclxuICB1ci5hY3Rpb24oJ3JlbW92ZVJlY29ubmVjdGVkRWRnZScsIHJlbW92ZVJlY29ubmVjdGVkRWRnZSwgcmVtb3ZlUmVjb25uZWN0ZWRFZGdlKTtcclxufTtcclxuIl19
