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
        var length = getBendShapesLength(edge);
        
        var srcPos = edge.source().position();
        var tgtPos = edge.target().position();
        
        var weights = edge.data('cyedgebendeditingWeights');
        var distances = edge.data('cyedgebendeditingDistances');

        for(var i = 0; segpts && i < segpts.length; i = i + 2){
          var bendX = segpts[i];
          var bendY = segpts[i + 1];

          var oldStyle = ctx.fillStyle;
          ctx.fillStyle = shadeBlend(-0.25, edge.css('line-color'));
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

        var length = getBendShapesLength(edge) * 1.25;

        var oldStroke = ctx.strokeStyle;
        var oldWidth = ctx.lineWidth;
        var oldFill = ctx.fillStyle;

        ctx.strokeStyle = shadeBlend(-0.25, edge.css('line-color'));
        ctx.lineWidth = edge.data('width') * cy.zoom();
        
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
        length *= cy.zoom();

        // render end point shape for source and target
        drawDiamondShape(renderedSourcePos.x, renderedSourcePos.y, length);

        drawDiamondShape(renderedTargetPos.x, renderedTargetPos.y, length);

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
        var length = getBendShapesLength(edge) * 1.25;
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

//# sourceMappingURL=data:application/json;charset:utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIm5vZGVfbW9kdWxlcy9icm93c2VyLXBhY2svX3ByZWx1ZGUuanMiLCJzcmMvVUlVdGlsaXRpZXMuanMiLCJzcmMvYmVuZFBvaW50VXRpbGl0aWVzLmpzIiwic3JjL2RlYm91bmNlLmpzIiwic3JjL2luZGV4LmpzIiwic3JjL3JlY29ubmVjdGlvblV0aWxpdGllcy5qcyIsInNyYy9yZWdpc3RlclVuZG9SZWRvRnVuY3Rpb25zLmpzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBO0FDQUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUMza0NBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDL1pBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQzdPQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNqSUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQzFFQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQSIsImZpbGUiOiJnZW5lcmF0ZWQuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlc0NvbnRlbnQiOlsiKGZ1bmN0aW9uIGUodCxuLHIpe2Z1bmN0aW9uIHMobyx1KXtpZighbltvXSl7aWYoIXRbb10pe3ZhciBhPXR5cGVvZiByZXF1aXJlPT1cImZ1bmN0aW9uXCImJnJlcXVpcmU7aWYoIXUmJmEpcmV0dXJuIGEobywhMCk7aWYoaSlyZXR1cm4gaShvLCEwKTt2YXIgZj1uZXcgRXJyb3IoXCJDYW5ub3QgZmluZCBtb2R1bGUgJ1wiK28rXCInXCIpO3Rocm93IGYuY29kZT1cIk1PRFVMRV9OT1RfRk9VTkRcIixmfXZhciBsPW5bb109e2V4cG9ydHM6e319O3Rbb11bMF0uY2FsbChsLmV4cG9ydHMsZnVuY3Rpb24oZSl7dmFyIG49dFtvXVsxXVtlXTtyZXR1cm4gcyhuP246ZSl9LGwsbC5leHBvcnRzLGUsdCxuLHIpfXJldHVybiBuW29dLmV4cG9ydHN9dmFyIGk9dHlwZW9mIHJlcXVpcmU9PVwiZnVuY3Rpb25cIiYmcmVxdWlyZTtmb3IodmFyIG89MDtvPHIubGVuZ3RoO28rKylzKHJbb10pO3JldHVybiBzfSkiLCJ2YXIgZGVib3VuY2UgPSByZXF1aXJlKCcuL2RlYm91bmNlJyk7XHJcbnZhciBiZW5kUG9pbnRVdGlsaXRpZXMgPSByZXF1aXJlKCcuL2JlbmRQb2ludFV0aWxpdGllcycpO1xyXG52YXIgcmVjb25uZWN0aW9uVXRpbGl0aWVzID0gcmVxdWlyZSgnLi9yZWNvbm5lY3Rpb25VdGlsaXRpZXMnKTtcclxudmFyIHJlZ2lzdGVyVW5kb1JlZG9GdW5jdGlvbnMgPSByZXF1aXJlKCcuL3JlZ2lzdGVyVW5kb1JlZG9GdW5jdGlvbnMnKTtcclxuXHJcbm1vZHVsZS5leHBvcnRzID0gZnVuY3Rpb24gKHBhcmFtcywgY3kpIHtcclxuICB2YXIgZm4gPSBwYXJhbXM7XHJcblxyXG4gIHZhciBhZGRCZW5kUG9pbnRDeHRNZW51SWQgPSAnY3ktZWRnZS1iZW5kLWVkaXRpbmctY3h0LWFkZC1iZW5kLXBvaW50JztcclxuICB2YXIgcmVtb3ZlQmVuZFBvaW50Q3h0TWVudUlkID0gJ2N5LWVkZ2UtYmVuZC1lZGl0aW5nLWN4dC1yZW1vdmUtYmVuZC1wb2ludCc7XHJcbiAgdmFyIGVQb3NpdGlvbiwgZVN0eWxlLCBlUmVtb3ZlLCBlQWRkLCBlWm9vbSwgZVNlbGVjdCwgZVVuc2VsZWN0LCBlVGFwU3RhcnQsIGVUYXBEcmFnLCBlVGFwRW5kLCBlQ3h0VGFwO1xyXG4gIC8vIGxhc3Qgc3RhdHVzIG9mIGdlc3R1cmVzXHJcbiAgdmFyIGxhc3RQYW5uaW5nRW5hYmxlZCwgbGFzdFpvb21pbmdFbmFibGVkLCBsYXN0Qm94U2VsZWN0aW9uRW5hYmxlZDtcclxuICAvLyBzdGF0dXMgb2YgZWRnZSB0byBoaWdobGlnaHQgYmVuZHMgYW5kIHNlbGVjdGVkIGVkZ2VzXHJcbiAgdmFyIGVkZ2VUb0hpZ2hsaWdodEJlbmRzLCBudW1iZXJPZlNlbGVjdGVkRWRnZXM7XHJcbiAgXHJcbiAgdmFyIGZ1bmN0aW9ucyA9IHtcclxuICAgIGluaXQ6IGZ1bmN0aW9uICgpIHtcclxuICAgICAgLy8gcmVnaXN0ZXIgdW5kbyByZWRvIGZ1bmN0aW9uc1xyXG4gICAgICByZWdpc3RlclVuZG9SZWRvRnVuY3Rpb25zKGN5LCBiZW5kUG9pbnRVdGlsaXRpZXMsIHBhcmFtcyk7XHJcbiAgICAgIFxyXG4gICAgICB2YXIgc2VsZiA9IHRoaXM7XHJcbiAgICAgIHZhciBvcHRzID0gcGFyYW1zO1xyXG4gICAgICB2YXIgJGNvbnRhaW5lciA9ICQodGhpcyk7XHJcbiAgICAgIHZhciAkY2FudmFzID0gJCgnPGNhbnZhcz48L2NhbnZhcz4nKTtcclxuXHJcbiAgICAgICRjb250YWluZXIuYXBwZW5kKCRjYW52YXMpO1xyXG5cclxuICAgICAgdmFyIGN4dEFkZEJlbmRQb2ludEZjbiA9IGZ1bmN0aW9uIChldmVudCkge1xyXG4gICAgICAgIHZhciBlZGdlID0gZXZlbnQudGFyZ2V0IHx8IGV2ZW50LmN5VGFyZ2V0O1xyXG4gICAgICAgIGlmKCFiZW5kUG9pbnRVdGlsaXRpZXMuaXNJZ25vcmVkRWRnZShlZGdlKSkge1xyXG5cclxuICAgICAgICAgIHZhciBwYXJhbSA9IHtcclxuICAgICAgICAgICAgZWRnZTogZWRnZSxcclxuICAgICAgICAgICAgd2VpZ2h0czogZWRnZS5kYXRhKCdjeWVkZ2ViZW5kZWRpdGluZ1dlaWdodHMnKSA/IFtdLmNvbmNhdChlZGdlLmRhdGEoJ2N5ZWRnZWJlbmRlZGl0aW5nV2VpZ2h0cycpKSA6IGVkZ2UuZGF0YSgnY3llZGdlYmVuZGVkaXRpbmdXZWlnaHRzJyksXHJcbiAgICAgICAgICAgIGRpc3RhbmNlczogZWRnZS5kYXRhKCdjeWVkZ2ViZW5kZWRpdGluZ0Rpc3RhbmNlcycpID8gW10uY29uY2F0KGVkZ2UuZGF0YSgnY3llZGdlYmVuZGVkaXRpbmdEaXN0YW5jZXMnKSkgOiBlZGdlLmRhdGEoJ2N5ZWRnZWJlbmRlZGl0aW5nRGlzdGFuY2VzJylcclxuICAgICAgICAgIH07XHJcblxyXG4gICAgICAgICAgYmVuZFBvaW50VXRpbGl0aWVzLmFkZEJlbmRQb2ludCgpO1xyXG5cclxuICAgICAgICAgIGlmIChvcHRpb25zKCkudW5kb2FibGUpIHtcclxuICAgICAgICAgICAgY3kudW5kb1JlZG8oKS5kbygnY2hhbmdlQmVuZFBvaW50cycsIHBhcmFtKTtcclxuICAgICAgICAgIH1cclxuICAgICAgICB9XHJcbiAgICAgICAgXHJcbiAgICAgICAgcmVmcmVzaERyYXdzKCk7XHJcbiAgICAgIH07XHJcblxyXG4gICAgICB2YXIgY3h0UmVtb3ZlQmVuZFBvaW50RmNuID0gZnVuY3Rpb24gKGV2ZW50KSB7XHJcbiAgICAgICAgdmFyIGVkZ2UgPSBldmVudC50YXJnZXQgfHwgZXZlbnQuY3lUYXJnZXQ7XHJcbiAgICAgICAgXHJcbiAgICAgICAgdmFyIHBhcmFtID0ge1xyXG4gICAgICAgICAgZWRnZTogZWRnZSxcclxuICAgICAgICAgIHdlaWdodHM6IFtdLmNvbmNhdChlZGdlLmRhdGEoJ2N5ZWRnZWJlbmRlZGl0aW5nV2VpZ2h0cycpKSxcclxuICAgICAgICAgIGRpc3RhbmNlczogW10uY29uY2F0KGVkZ2UuZGF0YSgnY3llZGdlYmVuZGVkaXRpbmdEaXN0YW5jZXMnKSlcclxuICAgICAgICB9O1xyXG5cclxuICAgICAgICBiZW5kUG9pbnRVdGlsaXRpZXMucmVtb3ZlQmVuZFBvaW50KCk7XHJcbiAgICAgICAgXHJcbiAgICAgICAgaWYob3B0aW9ucygpLnVuZG9hYmxlKSB7XHJcbiAgICAgICAgICBjeS51bmRvUmVkbygpLmRvKCdjaGFuZ2VCZW5kUG9pbnRzJywgcGFyYW0pO1xyXG4gICAgICAgIH1cclxuICAgICAgICBcclxuICAgICAgICByZWZyZXNoRHJhd3MoKTtcclxuICAgICAgfTtcclxuICAgICAgXHJcbiAgICAgIC8vIGZ1bmN0aW9uIHRvIHJlY29ubmVjdCBlZGdlXHJcbiAgICAgIHZhciBoYW5kbGVSZWNvbm5lY3RFZGdlID0gb3B0cy5oYW5kbGVSZWNvbm5lY3RFZGdlO1xyXG4gICAgICAvLyBmdW5jdGlvbiB0byB2YWxpZGF0ZSBlZGdlIHNvdXJjZSBhbmQgdGFyZ2V0IG9uIHJlY29ubmVjdGlvblxyXG4gICAgICB2YXIgdmFsaWRhdGVFZGdlID0gb3B0cy52YWxpZGF0ZUVkZ2U7IFxyXG4gICAgICAvLyBmdW5jdGlvbiB0byBiZSBjYWxsZWQgb24gaW52YWxpZCBlZGdlIHJlY29ubmVjdGlvblxyXG4gICAgICB2YXIgYWN0T25VbnN1Y2Nlc3NmdWxSZWNvbm5lY3Rpb24gPSBvcHRzLmFjdE9uVW5zdWNjZXNzZnVsUmVjb25uZWN0aW9uO1xyXG4gICAgICBcclxuICAgICAgdmFyIG1lbnVJdGVtcyA9IFtcclxuICAgICAgICB7XHJcbiAgICAgICAgICBpZDogYWRkQmVuZFBvaW50Q3h0TWVudUlkLFxyXG4gICAgICAgICAgdGl0bGU6IG9wdHMuYWRkQmVuZE1lbnVJdGVtVGl0bGUsXHJcbiAgICAgICAgICBjb250ZW50OiAnQWRkIEJlbmQgUG9pbnQnLFxyXG4gICAgICAgICAgc2VsZWN0b3I6ICdlZGdlJyxcclxuICAgICAgICAgIG9uQ2xpY2tGdW5jdGlvbjogY3h0QWRkQmVuZFBvaW50RmNuXHJcbiAgICAgICAgfSxcclxuICAgICAgICB7XHJcbiAgICAgICAgICBpZDogcmVtb3ZlQmVuZFBvaW50Q3h0TWVudUlkLFxyXG4gICAgICAgICAgdGl0bGU6IG9wdHMucmVtb3ZlQmVuZE1lbnVJdGVtVGl0bGUsXHJcbiAgICAgICAgICBjb250ZW50OiAnUmVtb3ZlIEJlbmQgUG9pbnQnLFxyXG4gICAgICAgICAgc2VsZWN0b3I6ICdlZGdlJyxcclxuICAgICAgICAgIG9uQ2xpY2tGdW5jdGlvbjogY3h0UmVtb3ZlQmVuZFBvaW50RmNuXHJcbiAgICAgICAgfVxyXG4gICAgICBdO1xyXG4gICAgICBcclxuICAgICAgaWYoY3kuY29udGV4dE1lbnVzKSB7XHJcbiAgICAgICAgdmFyIG1lbnVzID0gY3kuY29udGV4dE1lbnVzKCdnZXQnKTtcclxuICAgICAgICAvLyBJZiBjb250ZXh0IG1lbnVzIGlzIGFjdGl2ZSBqdXN0IGFwcGVuZCBtZW51IGl0ZW1zIGVsc2UgYWN0aXZhdGUgdGhlIGV4dGVuc2lvblxyXG4gICAgICAgIC8vIHdpdGggaW5pdGlhbCBtZW51IGl0ZW1zXHJcbiAgICAgICAgaWYgKG1lbnVzLmlzQWN0aXZlKCkpIHtcclxuICAgICAgICAgIG1lbnVzLmFwcGVuZE1lbnVJdGVtcyhtZW51SXRlbXMpO1xyXG4gICAgICAgIH1cclxuICAgICAgICBlbHNlIHtcclxuICAgICAgICAgIGN5LmNvbnRleHRNZW51cyh7XHJcbiAgICAgICAgICAgIG1lbnVJdGVtczogbWVudUl0ZW1zXHJcbiAgICAgICAgICB9KTtcclxuICAgICAgICB9XHJcbiAgICAgIH1cclxuICAgICAgXHJcbiAgICAgIHZhciBfc2l6ZUNhbnZhcyA9IGRlYm91bmNlKGZ1bmN0aW9uICgpIHtcclxuICAgICAgICAkY2FudmFzXHJcbiAgICAgICAgICAuYXR0cignaGVpZ2h0JywgJGNvbnRhaW5lci5oZWlnaHQoKSlcclxuICAgICAgICAgIC5hdHRyKCd3aWR0aCcsICRjb250YWluZXIud2lkdGgoKSlcclxuICAgICAgICAgIC5jc3Moe1xyXG4gICAgICAgICAgICAncG9zaXRpb24nOiAnYWJzb2x1dGUnLFxyXG4gICAgICAgICAgICAndG9wJzogMCxcclxuICAgICAgICAgICAgJ2xlZnQnOiAwLFxyXG4gICAgICAgICAgICAnei1pbmRleCc6ICc5OTknXHJcbiAgICAgICAgICB9KVxyXG4gICAgICAgIDtcclxuXHJcbiAgICAgICAgc2V0VGltZW91dChmdW5jdGlvbiAoKSB7XHJcbiAgICAgICAgICB2YXIgY2FudmFzQmIgPSAkY2FudmFzLm9mZnNldCgpO1xyXG4gICAgICAgICAgdmFyIGNvbnRhaW5lckJiID0gJGNvbnRhaW5lci5vZmZzZXQoKTtcclxuXHJcbiAgICAgICAgICAkY2FudmFzXHJcbiAgICAgICAgICAgIC5jc3Moe1xyXG4gICAgICAgICAgICAgICd0b3AnOiAtKGNhbnZhc0JiLnRvcCAtIGNvbnRhaW5lckJiLnRvcCksXHJcbiAgICAgICAgICAgICAgJ2xlZnQnOiAtKGNhbnZhc0JiLmxlZnQgLSBjb250YWluZXJCYi5sZWZ0KVxyXG4gICAgICAgICAgICB9KVxyXG4gICAgICAgICAgO1xyXG5cclxuICAgICAgICAgIC8vIHJlZHJhdyBvbiBjYW52YXMgcmVzaXplXHJcbiAgICAgICAgICBpZihjeSl7XHJcbiAgICAgICAgICAgIHJlZnJlc2hEcmF3cygpO1xyXG4gICAgICAgICAgfVxyXG4gICAgICAgIH0sIDApO1xyXG5cclxuICAgICAgfSwgMjUwKTtcclxuXHJcbiAgICAgIGZ1bmN0aW9uIHNpemVDYW52YXMoKSB7XHJcbiAgICAgICAgX3NpemVDYW52YXMoKTtcclxuICAgICAgfVxyXG5cclxuICAgICAgc2l6ZUNhbnZhcygpO1xyXG5cclxuICAgICAgJCh3aW5kb3cpLmJpbmQoJ3Jlc2l6ZScsIGZ1bmN0aW9uICgpIHtcclxuICAgICAgICBzaXplQ2FudmFzKCk7XHJcbiAgICAgIH0pO1xyXG5cclxuICAgICAgdmFyIGN0eCA9ICRjYW52YXNbMF0uZ2V0Q29udGV4dCgnMmQnKTtcclxuXHJcbiAgICAgIC8vIHdyaXRlIG9wdGlvbnMgdG8gZGF0YVxyXG4gICAgICB2YXIgZGF0YSA9ICRjb250YWluZXIuZGF0YSgnY3llZGdlYmVuZGVkaXRpbmcnKTtcclxuICAgICAgaWYgKGRhdGEgPT0gbnVsbCkge1xyXG4gICAgICAgIGRhdGEgPSB7fTtcclxuICAgICAgfVxyXG4gICAgICBkYXRhLm9wdGlvbnMgPSBvcHRzO1xyXG5cclxuICAgICAgdmFyIG9wdENhY2hlO1xyXG5cclxuICAgICAgZnVuY3Rpb24gb3B0aW9ucygpIHtcclxuICAgICAgICByZXR1cm4gb3B0Q2FjaGUgfHwgKG9wdENhY2hlID0gJGNvbnRhaW5lci5kYXRhKCdjeWVkZ2ViZW5kZWRpdGluZycpLm9wdGlvbnMpO1xyXG4gICAgICB9XHJcblxyXG4gICAgICAvLyB3ZSB3aWxsIG5lZWQgdG8gY29udmVydCBtb2RlbCBwb3NpdG9ucyB0byByZW5kZXJlZCBwb3NpdGlvbnNcclxuICAgICAgZnVuY3Rpb24gY29udmVydFRvUmVuZGVyZWRQb3NpdGlvbihtb2RlbFBvc2l0aW9uKSB7XHJcbiAgICAgICAgdmFyIHBhbiA9IGN5LnBhbigpO1xyXG4gICAgICAgIHZhciB6b29tID0gY3kuem9vbSgpO1xyXG5cclxuICAgICAgICB2YXIgeCA9IG1vZGVsUG9zaXRpb24ueCAqIHpvb20gKyBwYW4ueDtcclxuICAgICAgICB2YXIgeSA9IG1vZGVsUG9zaXRpb24ueSAqIHpvb20gKyBwYW4ueTtcclxuXHJcbiAgICAgICAgcmV0dXJuIHtcclxuICAgICAgICAgIHg6IHgsXHJcbiAgICAgICAgICB5OiB5XHJcbiAgICAgICAgfTtcclxuICAgICAgfVxyXG4gICAgICBcclxuICAgICAgZnVuY3Rpb24gcmVmcmVzaERyYXdzKCkge1xyXG5cclxuICAgICAgICB2YXIgdyA9ICRjb250YWluZXIud2lkdGgoKTtcclxuICAgICAgICB2YXIgaCA9ICRjb250YWluZXIuaGVpZ2h0KCk7XHJcblxyXG4gICAgICAgIGN0eC5jbGVhclJlY3QoMCwgMCwgdywgaCk7XHJcbiAgICAgICAgXHJcbiAgICAgICAgaWYoIGVkZ2VUb0hpZ2hsaWdodEJlbmRzICkge1xyXG4gICAgICAgICAgcmVuZGVyQmVuZFNoYXBlcyhlZGdlVG9IaWdobGlnaHRCZW5kcyk7XHJcbiAgICAgICAgICByZW5kZXJFbmRQb2ludFNoYXBlcyhlZGdlVG9IaWdobGlnaHRCZW5kcyk7XHJcbiAgICAgICAgfVxyXG4gICAgICB9XHJcbiAgICAgIFxyXG4gICAgICAvLyByZW5kZXIgdGhlIGJlbmQgc2hhcGVzIG9mIHRoZSBnaXZlbiBlZGdlXHJcbiAgICAgIGZ1bmN0aW9uIHJlbmRlckJlbmRTaGFwZXMoZWRnZSkge1xyXG4gICAgICAgIFxyXG4gICAgICAgIGlmKCFlZGdlLmhhc0NsYXNzKCdlZGdlYmVuZGVkaXRpbmctaGFzYmVuZHBvaW50cycpKSB7XHJcbiAgICAgICAgICByZXR1cm47XHJcbiAgICAgICAgfVxyXG4gICAgICAgIFxyXG4gICAgICAgIHZhciBzZWdwdHMgPSBiZW5kUG9pbnRVdGlsaXRpZXMuZ2V0U2VnbWVudFBvaW50cyhlZGdlKTsvL2VkZ2UuX3ByaXZhdGUucmRhdGEuc2VncHRzO1xyXG4gICAgICAgIHZhciBsZW5ndGggPSBnZXRCZW5kU2hhcGVzTGVuZ3RoKGVkZ2UpO1xyXG4gICAgICAgIFxyXG4gICAgICAgIHZhciBzcmNQb3MgPSBlZGdlLnNvdXJjZSgpLnBvc2l0aW9uKCk7XHJcbiAgICAgICAgdmFyIHRndFBvcyA9IGVkZ2UudGFyZ2V0KCkucG9zaXRpb24oKTtcclxuICAgICAgICBcclxuICAgICAgICB2YXIgd2VpZ2h0cyA9IGVkZ2UuZGF0YSgnY3llZGdlYmVuZGVkaXRpbmdXZWlnaHRzJyk7XHJcbiAgICAgICAgdmFyIGRpc3RhbmNlcyA9IGVkZ2UuZGF0YSgnY3llZGdlYmVuZGVkaXRpbmdEaXN0YW5jZXMnKTtcclxuXHJcbiAgICAgICAgZm9yKHZhciBpID0gMDsgc2VncHRzICYmIGkgPCBzZWdwdHMubGVuZ3RoOyBpID0gaSArIDIpe1xyXG4gICAgICAgICAgdmFyIGJlbmRYID0gc2VncHRzW2ldO1xyXG4gICAgICAgICAgdmFyIGJlbmRZID0gc2VncHRzW2kgKyAxXTtcclxuXHJcbiAgICAgICAgICB2YXIgb2xkU3R5bGUgPSBjdHguZmlsbFN0eWxlO1xyXG4gICAgICAgICAgY3R4LmZpbGxTdHlsZSA9IHNoYWRlQmxlbmQoLTAuMjUsIGVkZ2UuY3NzKCdsaW5lLWNvbG9yJykpO1xyXG4gICAgICAgICAgcmVuZGVyQmVuZFNoYXBlKGJlbmRYLCBiZW5kWSwgbGVuZ3RoKTtcclxuICAgICAgICAgIGN0eC5maWxsU3R5bGUgPSBvbGRTdHlsZTtcclxuICAgICAgICB9XHJcbiAgICAgIH1cclxuICAgICAgXHJcbiAgICAgIC8vIHJlbmRlciBhIGJlbmQgc2hhcGUgd2l0aCB0aGUgZ2l2ZW4gcGFyYW1ldGVyc1xyXG4gICAgICBmdW5jdGlvbiByZW5kZXJCZW5kU2hhcGUoYmVuZFgsIGJlbmRZLCBsZW5ndGgpIHtcclxuICAgICAgICAvLyBnZXQgdGhlIHRvcCBsZWZ0IGNvb3JkaW5hdGVzXHJcbiAgICAgICAgdmFyIHRvcExlZnRYID0gYmVuZFggLSBsZW5ndGggLyAyO1xyXG4gICAgICAgIHZhciB0b3BMZWZ0WSA9IGJlbmRZIC0gbGVuZ3RoIC8gMjtcclxuICAgICAgICBcclxuICAgICAgICAvLyBjb252ZXJ0IHRvIHJlbmRlcmVkIHBhcmFtZXRlcnNcclxuICAgICAgICB2YXIgcmVuZGVyZWRUb3BMZWZ0UG9zID0gY29udmVydFRvUmVuZGVyZWRQb3NpdGlvbih7eDogdG9wTGVmdFgsIHk6IHRvcExlZnRZfSk7XHJcbiAgICAgICAgbGVuZ3RoICo9IGN5Lnpvb20oKTtcclxuICAgICAgICBcclxuICAgICAgICAvLyByZW5kZXIgYmVuZCBzaGFwZVxyXG4gICAgICAgIGN0eC5iZWdpblBhdGgoKTtcclxuICAgICAgICBjdHgucmVjdChyZW5kZXJlZFRvcExlZnRQb3MueCwgcmVuZGVyZWRUb3BMZWZ0UG9zLnksIGxlbmd0aCwgbGVuZ3RoKTtcclxuICAgICAgICBjdHguZmlsbCgpO1xyXG4gICAgICAgIGN0eC5jbG9zZVBhdGgoKTtcclxuICAgICAgfVxyXG4gICAgICBcclxuICAgICAgLy8gcmVuZGVyIHRoZSBlbmQgcG9pbnRzIHNoYXBlcyBvZiB0aGUgZ2l2ZW4gZWRnZVxyXG4gICAgICBmdW5jdGlvbiByZW5kZXJFbmRQb2ludFNoYXBlcyhlZGdlKSB7XHJcbiAgICAgICAgaWYoIWVkZ2Upe1xyXG4gICAgICAgICAgcmV0dXJuO1xyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgdmFyIGVkZ2VfcHRzID0gZWRnZS5fcHJpdmF0ZS5yc2NyYXRjaC5hbGxwdHM7XHJcbiAgICAgICAgaWYoIWVkZ2VfcHRzKVxyXG4gICAgICAgICAgcmV0dXJuO1xyXG5cclxuICAgICAgICB2YXIgc3JjID0ge1xyXG4gICAgICAgICAgeDogZWRnZV9wdHNbMF0sXHJcbiAgICAgICAgICB5OiBlZGdlX3B0c1sxXVxyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgdmFyIHRhcmdldCA9IHtcclxuICAgICAgICAgIHg6IGVkZ2VfcHRzW2VkZ2VfcHRzLmxlbmd0aC0yXSxcclxuICAgICAgICAgIHk6IGVkZ2VfcHRzW2VkZ2VfcHRzLmxlbmd0aC0xXVxyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgdmFyIGxlbmd0aCA9IGdldEJlbmRTaGFwZXNMZW5ndGgoZWRnZSkgKiAxLjI1O1xyXG5cclxuICAgICAgICB2YXIgb2xkU3Ryb2tlID0gY3R4LnN0cm9rZVN0eWxlO1xyXG4gICAgICAgIHZhciBvbGRXaWR0aCA9IGN0eC5saW5lV2lkdGg7XHJcbiAgICAgICAgdmFyIG9sZEZpbGwgPSBjdHguZmlsbFN0eWxlO1xyXG5cclxuICAgICAgICBjdHguc3Ryb2tlU3R5bGUgPSBzaGFkZUJsZW5kKC0wLjI1LCBlZGdlLmNzcygnbGluZS1jb2xvcicpKTtcclxuICAgICAgICBjdHgubGluZVdpZHRoID0gZWRnZS5kYXRhKCd3aWR0aCcpICogY3kuem9vbSgpO1xyXG4gICAgICAgIFxyXG4gICAgICAgIHJlbmRlckVhY2hFbmRQb2ludFNoYXBlKHNyYywgdGFyZ2V0LCBsZW5ndGgpO1xyXG4gICAgICAgIFxyXG4gICAgICAgIGN0eC5zdHJva2VTdHlsZSA9IG9sZFN0cm9rZTtcclxuICAgICAgICBjdHguZmlsbFN0eWxlID0gb2xkRmlsbDtcclxuICAgICAgICBjdHgubGluZVdpZHRoID0gb2xkV2lkdGg7XHJcbiAgICAgIH1cclxuXHJcbiAgICAgIGZ1bmN0aW9uIHJlbmRlckVhY2hFbmRQb2ludFNoYXBlKHNvdXJjZSwgdGFyZ2V0LCBsZW5ndGgpIHtcclxuICAgICAgICAvLyBnZXQgdGhlIHRvcCBsZWZ0IGNvb3JkaW5hdGVzIG9mIHNvdXJjZSBhbmQgdGFyZ2V0XHJcbiAgICAgICAgdmFyIHNUb3BMZWZ0WCA9IHNvdXJjZS54IC0gbGVuZ3RoIC8gMjtcclxuICAgICAgICB2YXIgc1RvcExlZnRZID0gc291cmNlLnkgLSBsZW5ndGggLyAyO1xyXG5cclxuICAgICAgICB2YXIgdFRvcExlZnRYID0gdGFyZ2V0LnggLSBsZW5ndGggLyAyO1xyXG4gICAgICAgIHZhciB0VG9wTGVmdFkgPSB0YXJnZXQueSAtIGxlbmd0aCAvIDI7XHJcblxyXG4gICAgICAgIC8vIGNvbnZlcnQgdG8gcmVuZGVyZWQgcGFyYW1ldGVyc1xyXG4gICAgICAgIHZhciByZW5kZXJlZFNvdXJjZVBvcyA9IGNvbnZlcnRUb1JlbmRlcmVkUG9zaXRpb24oe3g6IHNUb3BMZWZ0WCwgeTogc1RvcExlZnRZfSk7XHJcbiAgICAgICAgdmFyIHJlbmRlcmVkVGFyZ2V0UG9zID0gY29udmVydFRvUmVuZGVyZWRQb3NpdGlvbih7eDogdFRvcExlZnRYLCB5OiB0VG9wTGVmdFl9KTtcclxuICAgICAgICBsZW5ndGggKj0gY3kuem9vbSgpO1xyXG5cclxuICAgICAgICAvLyByZW5kZXIgZW5kIHBvaW50IHNoYXBlIGZvciBzb3VyY2UgYW5kIHRhcmdldFxyXG4gICAgICAgIGRyYXdEaWFtb25kU2hhcGUocmVuZGVyZWRTb3VyY2VQb3MueCwgcmVuZGVyZWRTb3VyY2VQb3MueSwgbGVuZ3RoKTtcclxuXHJcbiAgICAgICAgZHJhd0RpYW1vbmRTaGFwZShyZW5kZXJlZFRhcmdldFBvcy54LCByZW5kZXJlZFRhcmdldFBvcy55LCBsZW5ndGgpO1xyXG5cclxuICAgICAgICBmdW5jdGlvbiBkcmF3RGlhbW9uZFNoYXBlKHRvcExlZnRYLCB0b3BMZWZ0WSwgbGVuZ3RoKXtcclxuICAgICAgICAgIHZhciBsID0gKGxlbmd0aCkgLyAoMyAqIDYgKyAyKTtcclxuXHJcbiAgICAgICAgICAvLyBEcmF3IGFsbCBjb3JuZXJzXHJcbiAgICAgICAgICBkcmF3Q29ybmVyKHRvcExlZnRYLCB0b3BMZWZ0WSArIGxlbmd0aC8yLCBsLCAnbGVmdCcpO1xyXG4gICAgICAgICAgZHJhd0Nvcm5lcih0b3BMZWZ0WCArIGxlbmd0aC8yLCB0b3BMZWZ0WSwgbCwgJ3RvcCcpO1xyXG4gICAgICAgICAgZHJhd0Nvcm5lcih0b3BMZWZ0WCArIGxlbmd0aC8yLCB0b3BMZWZ0WSArIGxlbmd0aCwgbCwgJ2JvdHRvbScpO1xyXG4gICAgICAgICAgZHJhd0Nvcm5lcih0b3BMZWZ0WCArIGxlbmd0aCwgdG9wTGVmdFkgKyBsZW5ndGgvMiwgbCwgJ3JpZ2h0Jyk7XHJcblxyXG4gICAgICAgICAgZHJhd0Rhc2hlZExpbmUodG9wTGVmdFgsIHRvcExlZnRZICsgbGVuZ3RoLzIsIHRvcExlZnRYICsgbGVuZ3RoLzIsIHRvcExlZnRZLCBsKTtcclxuICAgICAgICAgIGRyYXdEYXNoZWRMaW5lKHRvcExlZnRYICsgbGVuZ3RoLzIsIHRvcExlZnRZLCB0b3BMZWZ0WCArIGxlbmd0aCwgdG9wTGVmdFkgKyBsZW5ndGgvMiwgbCk7XHJcbiAgICAgICAgICBkcmF3RGFzaGVkTGluZSh0b3BMZWZ0WCArIGxlbmd0aCwgdG9wTGVmdFkgKyBsZW5ndGgvMiwgdG9wTGVmdFggKyBsZW5ndGgvMiwgdG9wTGVmdFkgKyBsZW5ndGgsIGwpO1xyXG4gICAgICAgICAgZHJhd0Rhc2hlZExpbmUodG9wTGVmdFggKyBsZW5ndGgvMiwgdG9wTGVmdFkgKyBsZW5ndGgsIHRvcExlZnRYLCB0b3BMZWZ0WSArIGxlbmd0aC8yLCBsKTtcclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIGZ1bmN0aW9uIGRyYXdDb3JuZXIoeCwgeSwgbCwgY29ybmVyKXtcclxuICAgICAgICAgIGN0eC5iZWdpblBhdGgoKTtcclxuICAgICAgICAgIGN0eC5tb3ZlVG8oeCwgeSk7XHJcbiAgICAgICAgICBzd2l0Y2goY29ybmVyKXtcclxuICAgICAgICAgICAgY2FzZSAnbGVmdCc6IHtcclxuICAgICAgICAgICAgICBjdHgubGluZVRvKHggKyBsLCB5IC0gbCk7XHJcbiAgICAgICAgICAgICAgY3R4LmxpbmVUbyh4LCB5KTtcclxuICAgICAgICAgICAgICBjdHgubGluZVRvKHggKyBsLCB5ICsgbCk7XHJcbiAgICAgICAgICAgICAgYnJlYWs7XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgY2FzZSAndG9wJzoge1xyXG4gICAgICAgICAgICAgIGN0eC5saW5lVG8oeCAtIGwsIHkgKyBsKTtcclxuICAgICAgICAgICAgICBjdHgubGluZVRvKHgsIHkpO1xyXG4gICAgICAgICAgICAgIGN0eC5saW5lVG8oeCArIGwsIHkgKyBsKTtcclxuICAgICAgICAgICAgICBicmVhaztcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICBjYXNlICdyaWdodCc6IHtcclxuICAgICAgICAgICAgICBjdHgubGluZVRvKHggLSBsLCB5IC0gbCk7XHJcbiAgICAgICAgICAgICAgY3R4LmxpbmVUbyh4LCB5KTtcclxuICAgICAgICAgICAgICBjdHgubGluZVRvKHggLSBsLCB5ICsgbCk7XHJcbiAgICAgICAgICAgICAgYnJlYWs7XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgY2FzZSAnYm90dG9tJzoge1xyXG4gICAgICAgICAgICAgIGN0eC5saW5lVG8oeCArIGwsIHkgLSBsKTtcclxuICAgICAgICAgICAgICBjdHgubGluZVRvKHgsIHkpO1xyXG4gICAgICAgICAgICAgIGN0eC5saW5lVG8oeCAtIGwsIHkgLSBsKTtcclxuICAgICAgICAgICAgICBicmVhaztcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICBjYXNlICdkZWZhdWx0JzpcclxuICAgICAgICAgICAgICByZXR1cm47XHJcbiAgICAgICAgICB9XHJcbiAgICAgICAgICBjdHguc3Ryb2tlKCk7XHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICBmdW5jdGlvbiBkcmF3RGFzaGVkTGluZSh4MSwgeTEsIHgyLCB5MiwgbCl7XHJcbiAgICAgICAgICBjdHguYmVnaW5QYXRoKCk7XHJcbiAgICAgICAgICBjdHgubW92ZVRvKHgxLCB5MSk7XHJcbiAgICAgICAgICBjdHgubGluZVRvKHgyLCB5Mik7XHJcbiAgICAgICAgICBjdHguc2V0TGluZURhc2goWzIqbCxsXSk7XHJcbiAgICAgICAgICBjdHguc3Ryb2tlKCk7XHJcbiAgICAgICAgICBjdHguc2V0TGluZURhc2goW10pO1xyXG4gICAgICAgIH1cclxuICAgICAgfVxyXG5cclxuICAgICAgLy8gY2hhbmdlcyBjb2xvciB0b25lXHJcbiAgICAgIC8vIGh0dHBzOi8vc3RhY2tvdmVyZmxvdy5jb20vcXVlc3Rpb25zLzU1NjAyNDgvcHJvZ3JhbW1hdGljYWxseS1saWdodGVuLW9yLWRhcmtlbi1hLWhleC1jb2xvci1vci1yZ2ItYW5kLWJsZW5kLWNvbG9yc1xyXG4gICAgICBmdW5jdGlvbiBzaGFkZUJsZW5kKHAsYzAsYzEpIHtcclxuICAgICAgICB2YXIgbj1wPDA/cCotMTpwLHU9TWF0aC5yb3VuZCx3PXBhcnNlSW50O1xyXG4gICAgICAgIGlmKGMwLmxlbmd0aD43KXtcclxuICAgICAgICAgIHZhciBmPWMwLnNwbGl0KFwiLFwiKSx0PShjMT9jMTpwPDA/XCJyZ2IoMCwwLDApXCI6XCJyZ2IoMjU1LDI1NSwyNTUpXCIpLnNwbGl0KFwiLFwiKSxSPXcoZlswXS5zbGljZSg0KSksRz13KGZbMV0pLEI9dyhmWzJdKTtcclxuICAgICAgICAgIHJldHVybiBcInJnYihcIisodSgodyh0WzBdLnNsaWNlKDQpKS1SKSpuKStSKStcIixcIisodSgodyh0WzFdKS1HKSpuKStHKStcIixcIisodSgodyh0WzJdKS1CKSpuKStCKStcIilcIlxyXG4gICAgICAgIH1cclxuICAgICAgICBlbHNle1xyXG4gICAgICAgICAgdmFyIGY9dyhjMC5zbGljZSgxKSwxNiksdD13KChjMT9jMTpwPDA/XCIjMDAwMDAwXCI6XCIjRkZGRkZGXCIpLnNsaWNlKDEpLDE2KSxSMT1mPj4xNixHMT1mPj44JjB4MDBGRixCMT1mJjB4MDAwMEZGO1xyXG4gICAgICAgICAgcmV0dXJuIFwiI1wiKygweDEwMDAwMDArKHUoKCh0Pj4xNiktUjEpKm4pK1IxKSoweDEwMDAwKyh1KCgodD4+OCYweDAwRkYpLUcxKSpuKStHMSkqMHgxMDArKHUoKCh0JjB4MDAwMEZGKS1CMSkqbikrQjEpKS50b1N0cmluZygxNikuc2xpY2UoMSlcclxuICAgICAgICB9XHJcbiAgICAgIH1cclxuXHJcbiAgICAgIC8vIGdldCB0aGUgbGVuZ3RoIG9mIGJlbmQgcG9pbnRzIHRvIGJlIHJlbmRlcmVkXHJcbiAgICAgIGZ1bmN0aW9uIGdldEJlbmRTaGFwZXNMZW5ndGgoZWRnZSkge1xyXG4gICAgICAgIHZhciBmYWN0b3IgPSBvcHRpb25zKCkuYmVuZFNoYXBlU2l6ZUZhY3RvcjtcclxuICAgICAgICBpZiAocGFyc2VGbG9hdChlZGdlLmNzcygnd2lkdGgnKSkgPD0gMi41KVxyXG4gICAgICAgICAgcmV0dXJuIDIuNSAqIGZhY3RvcjtcclxuICAgICAgICBlbHNlIHJldHVybiBwYXJzZUZsb2F0KGVkZ2UuY3NzKCd3aWR0aCcpKSpmYWN0b3I7XHJcbiAgICAgIH1cclxuICAgICAgXHJcbiAgICAgIC8vIGNoZWNrIGlmIHRoZSBwb2ludCByZXByZXNlbnRlZCBieSB7eCwgeX0gaXMgaW5zaWRlIHRoZSBiZW5kIHNoYXBlXHJcbiAgICAgIGZ1bmN0aW9uIGNoZWNrSWZJbnNpZGVCZW5kU2hhcGUoeCwgeSwgbGVuZ3RoLCBjZW50ZXJYLCBjZW50ZXJZKXtcclxuICAgICAgICB2YXIgbWluWCA9IGNlbnRlclggLSBsZW5ndGggLyAyO1xyXG4gICAgICAgIHZhciBtYXhYID0gY2VudGVyWCArIGxlbmd0aCAvIDI7XHJcbiAgICAgICAgdmFyIG1pblkgPSBjZW50ZXJZIC0gbGVuZ3RoIC8gMjtcclxuICAgICAgICB2YXIgbWF4WSA9IGNlbnRlclkgKyBsZW5ndGggLyAyO1xyXG4gICAgICAgIFxyXG4gICAgICAgIHZhciBpbnNpZGUgPSAoeCA+PSBtaW5YICYmIHggPD0gbWF4WCkgJiYgKHkgPj0gbWluWSAmJiB5IDw9IG1heFkpO1xyXG4gICAgICAgIHJldHVybiBpbnNpZGU7XHJcbiAgICAgIH1cclxuXHJcbiAgICAgIC8vIGdldCB0aGUgaW5kZXggb2YgYmVuZCBwb2ludCBjb250YWluaW5nIHRoZSBwb2ludCByZXByZXNlbnRlZCBieSB7eCwgeX1cclxuICAgICAgZnVuY3Rpb24gZ2V0Q29udGFpbmluZ0JlbmRTaGFwZUluZGV4KHgsIHksIGVkZ2UpIHtcclxuICAgICAgICBpZihlZGdlLmRhdGEoJ2N5ZWRnZWJlbmRlZGl0aW5nV2VpZ2h0cycpID09IG51bGwgfHwgZWRnZS5kYXRhKCdjeWVkZ2ViZW5kZWRpdGluZ1dlaWdodHMnKS5sZW5ndGggPT0gMCl7XHJcbiAgICAgICAgICByZXR1cm4gLTE7XHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICB2YXIgc2VncHRzID0gYmVuZFBvaW50VXRpbGl0aWVzLmdldFNlZ21lbnRQb2ludHMoZWRnZSk7Ly9lZGdlLl9wcml2YXRlLnJkYXRhLnNlZ3B0cztcclxuICAgICAgICB2YXIgbGVuZ3RoID0gZ2V0QmVuZFNoYXBlc0xlbmd0aChlZGdlKTtcclxuXHJcbiAgICAgICAgZm9yKHZhciBpID0gMDsgc2VncHRzICYmIGkgPCBzZWdwdHMubGVuZ3RoOyBpID0gaSArIDIpe1xyXG4gICAgICAgICAgdmFyIGJlbmRYID0gc2VncHRzW2ldO1xyXG4gICAgICAgICAgdmFyIGJlbmRZID0gc2VncHRzW2kgKyAxXTtcclxuXHJcbiAgICAgICAgICB2YXIgaW5zaWRlID0gY2hlY2tJZkluc2lkZUJlbmRTaGFwZSh4LCB5LCBsZW5ndGgsIGJlbmRYLCBiZW5kWSk7XHJcbiAgICAgICAgICBpZihpbnNpZGUpe1xyXG4gICAgICAgICAgICByZXR1cm4gaSAvIDI7XHJcbiAgICAgICAgICB9XHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICByZXR1cm4gLTE7XHJcbiAgICAgIH07XHJcblxyXG4gICAgICBmdW5jdGlvbiBnZXRDb250YWluaW5nRW5kUG9pbnQoeCwgeSwgZWRnZSl7XHJcbiAgICAgICAgdmFyIGxlbmd0aCA9IGdldEJlbmRTaGFwZXNMZW5ndGgoZWRnZSkgKiAxLjI1O1xyXG4gICAgICAgIHZhciBhbGxQdHMgPSBlZGdlLl9wcml2YXRlLnJzY3JhdGNoLmFsbHB0cztcclxuICAgICAgICB2YXIgc3JjID0ge1xyXG4gICAgICAgICAgeDogYWxsUHRzWzBdLFxyXG4gICAgICAgICAgeTogYWxsUHRzWzFdXHJcbiAgICAgICAgfVxyXG4gICAgICAgIHZhciB0YXJnZXQgPSB7XHJcbiAgICAgICAgICB4OiBhbGxQdHNbYWxsUHRzLmxlbmd0aC0yXSxcclxuICAgICAgICAgIHk6IGFsbFB0c1thbGxQdHMubGVuZ3RoLTFdXHJcbiAgICAgICAgfVxyXG4gICAgICAgIGNvbnZlcnRUb1JlbmRlcmVkUG9zaXRpb24oc3JjKTtcclxuICAgICAgICBjb252ZXJ0VG9SZW5kZXJlZFBvc2l0aW9uKHRhcmdldCk7XHJcbiAgICAgICAgXHJcbiAgICAgICAgLy8gU291cmNlOjAsIFRhcmdldDoxLCBOb25lOi0xXHJcbiAgICAgICAgaWYoY2hlY2tJZkluc2lkZUJlbmRTaGFwZSh4LCB5LCBsZW5ndGgsIHNyYy54LCBzcmMueSkpXHJcbiAgICAgICAgICByZXR1cm4gMDtcclxuICAgICAgICBlbHNlIGlmKGNoZWNrSWZJbnNpZGVCZW5kU2hhcGUoeCwgeSwgbGVuZ3RoLCB0YXJnZXQueCwgdGFyZ2V0LnkpKVxyXG4gICAgICAgICAgcmV0dXJuIDE7XHJcbiAgICAgICAgZWxzZVxyXG4gICAgICAgICAgcmV0dXJuIC0xO1xyXG4gICAgICB9XHJcbiAgICAgIFxyXG4gICAgICAvLyBzdG9yZSB0aGUgY3VycmVudCBzdGF0dXMgb2YgZ2VzdHVyZXMgYW5kIHNldCB0aGVtIHRvIGZhbHNlXHJcbiAgICAgIGZ1bmN0aW9uIGRpc2FibGVHZXN0dXJlcygpIHtcclxuICAgICAgICBsYXN0UGFubmluZ0VuYWJsZWQgPSBjeS5wYW5uaW5nRW5hYmxlZCgpO1xyXG4gICAgICAgIGxhc3Rab29taW5nRW5hYmxlZCA9IGN5Lnpvb21pbmdFbmFibGVkKCk7XHJcbiAgICAgICAgbGFzdEJveFNlbGVjdGlvbkVuYWJsZWQgPSBjeS5ib3hTZWxlY3Rpb25FbmFibGVkKCk7XHJcblxyXG4gICAgICAgIGN5Lnpvb21pbmdFbmFibGVkKGZhbHNlKVxyXG4gICAgICAgICAgLnBhbm5pbmdFbmFibGVkKGZhbHNlKVxyXG4gICAgICAgICAgLmJveFNlbGVjdGlvbkVuYWJsZWQoZmFsc2UpO1xyXG4gICAgICB9XHJcbiAgICAgIFxyXG4gICAgICAvLyByZXNldCB0aGUgZ2VzdHVyZXMgYnkgdGhlaXIgbGF0ZXN0IHN0YXR1c1xyXG4gICAgICBmdW5jdGlvbiByZXNldEdlc3R1cmVzKCkge1xyXG4gICAgICAgIGN5Lnpvb21pbmdFbmFibGVkKGxhc3Rab29taW5nRW5hYmxlZClcclxuICAgICAgICAgIC5wYW5uaW5nRW5hYmxlZChsYXN0UGFubmluZ0VuYWJsZWQpXHJcbiAgICAgICAgICAuYm94U2VsZWN0aW9uRW5hYmxlZChsYXN0Qm94U2VsZWN0aW9uRW5hYmxlZCk7XHJcbiAgICAgIH1cclxuXHJcbiAgICAgIGZ1bmN0aW9uIG1vdmVCZW5kUG9pbnRzKHBvc2l0aW9uRGlmZiwgZWRnZXMpIHtcclxuICAgICAgICAgIGVkZ2VzLmZvckVhY2goZnVuY3Rpb24oIGVkZ2UgKXtcclxuICAgICAgICAgICAgICB2YXIgcHJldmlvdXNCZW5kUG9pbnRzUG9zaXRpb24gPSBiZW5kUG9pbnRVdGlsaXRpZXMuZ2V0U2VnbWVudFBvaW50cyhlZGdlKTtcclxuICAgICAgICAgICAgICB2YXIgbmV4dEJlbmRQb2ludHNQb3NpdGlvbiA9IFtdO1xyXG4gICAgICAgICAgICAgIGlmIChwcmV2aW91c0JlbmRQb2ludHNQb3NpdGlvbiAhPSB1bmRlZmluZWQpXHJcbiAgICAgICAgICAgICAge1xyXG4gICAgICAgICAgICAgICAgZm9yIChpPTA7IGk8cHJldmlvdXNCZW5kUG9pbnRzUG9zaXRpb24ubGVuZ3RoOyBpKz0yKVxyXG4gICAgICAgICAgICAgICAge1xyXG4gICAgICAgICAgICAgICAgICAgIG5leHRCZW5kUG9pbnRzUG9zaXRpb24ucHVzaCh7eDogcHJldmlvdXNCZW5kUG9pbnRzUG9zaXRpb25baV0rcG9zaXRpb25EaWZmLngsIHk6IHByZXZpb3VzQmVuZFBvaW50c1Bvc2l0aW9uW2krMV0rcG9zaXRpb25EaWZmLnl9KTtcclxuICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICAgIGVkZ2UuZGF0YSgnYmVuZFBvaW50UG9zaXRpb25zJyxuZXh0QmVuZFBvaW50c1Bvc2l0aW9uKTtcclxuICAgICAgICAgICAgICB9XHJcblxyXG4gICAgICAgICAgfSk7XHJcbiAgICAgICAgICBiZW5kUG9pbnRVdGlsaXRpZXMuaW5pdEJlbmRQb2ludHMob3B0aW9ucygpLmJlbmRQb3NpdGlvbnNGdW5jdGlvbiwgZWRnZXMpO1xyXG4gICAgICAgICAgY3kudHJpZ2dlcignYmVuZFBvaW50TW92ZW1lbnQnKTtcclxuICAgICAgfVxyXG5cclxuICAgICAgeyAgXHJcbiAgICAgICAgbGFzdFBhbm5pbmdFbmFibGVkID0gY3kucGFubmluZ0VuYWJsZWQoKTtcclxuICAgICAgICBsYXN0Wm9vbWluZ0VuYWJsZWQgPSBjeS56b29taW5nRW5hYmxlZCgpO1xyXG4gICAgICAgIGxhc3RCb3hTZWxlY3Rpb25FbmFibGVkID0gY3kuYm94U2VsZWN0aW9uRW5hYmxlZCgpO1xyXG4gICAgICAgIFxyXG4gICAgICAgIC8vIEluaXRpbGl6ZSB0aGUgZWRnZVRvSGlnaGxpZ2h0QmVuZHMgYW5kIG51bWJlck9mU2VsZWN0ZWRFZGdlc1xyXG4gICAgICAgIHtcclxuICAgICAgICAgIHZhciBzZWxlY3RlZEVkZ2VzID0gY3kuZWRnZXMoJzpzZWxlY3RlZCcpO1xyXG4gICAgICAgICAgdmFyIG51bWJlck9mU2VsZWN0ZWRFZGdlcyA9IHNlbGVjdGVkRWRnZXMubGVuZ3RoO1xyXG4gICAgICAgICAgXHJcbiAgICAgICAgICBpZiAoIG51bWJlck9mU2VsZWN0ZWRFZGdlcyA9PT0gMSApIHtcclxuICAgICAgICAgICAgZWRnZVRvSGlnaGxpZ2h0QmVuZHMgPSBzZWxlY3RlZEVkZ2VzWzBdO1xyXG4gICAgICAgICAgfVxyXG4gICAgICAgIH1cclxuICAgICAgICBcclxuICAgICAgICBjeS5iaW5kKCd6b29tIHBhbicsIGVab29tID0gZnVuY3Rpb24gKCkge1xyXG4gICAgICAgICAgaWYgKCAhZWRnZVRvSGlnaGxpZ2h0QmVuZHMgKSB7XHJcbiAgICAgICAgICAgIHJldHVybjtcclxuICAgICAgICAgIH1cclxuICAgICAgICAgIFxyXG4gICAgICAgICAgcmVmcmVzaERyYXdzKCk7XHJcbiAgICAgICAgfSk7XHJcblxyXG4gICAgICAgIGN5Lm9uKCdkYXRhJywgJ2VkZ2UnLCAgZnVuY3Rpb24gKCkge1xyXG4gICAgICAgICAgcmVmcmVzaERyYXdzKCk7XHJcbiAgICAgICAgfSk7XHJcblxyXG4gICAgICAgIGN5Lm9uKCdwb3NpdGlvbicsICdub2RlJywgZVBvc2l0aW9uID0gZnVuY3Rpb24gKCkge1xyXG4gICAgICAgICAgdmFyIG5vZGUgPSB0aGlzO1xyXG4gICAgICAgICAgXHJcbiAgICAgICAgICAvLyBJZiB0aGVyZSBpcyBubyBlZGdlIHRvIGhpZ2hsaWdodCBiZW5kcyBvciB0aGlzIG5vZGUgaXMgbm90IGFueSBlbmQgb2YgdGhhdCBlZGdlIHJldHVybiBkaXJlY3RseVxyXG4gICAgICAgICAgaWYgKCAhZWRnZVRvSGlnaGxpZ2h0QmVuZHMgfHwgISggZWRnZVRvSGlnaGxpZ2h0QmVuZHMuZGF0YSgnc291cmNlJykgPT09IG5vZGUuaWQoKSBcclxuICAgICAgICAgICAgICAgICAgfHwgZWRnZVRvSGlnaGxpZ2h0QmVuZHMuZGF0YSgndGFyZ2V0JykgPT09IG5vZGUuaWQoKSApICkge1xyXG4gICAgICAgICAgICByZXR1cm47XHJcbiAgICAgICAgICB9XHJcbiAgICAgICAgICBcclxuICAgICAgICAgIHJlZnJlc2hEcmF3cygpO1xyXG4gICAgICAgIH0pO1xyXG5cclxuICAgICAgICBjeS5vbignc3R5bGUnLCAnZWRnZS5lZGdlYmVuZGVkaXRpbmctaGFzYmVuZHBvaW50czpzZWxlY3RlZCcsIGVTdHlsZSA9IGZ1bmN0aW9uICgpIHtcclxuICAgICAgICAgIHJlZnJlc2hEcmF3cygpO1xyXG4gICAgICAgIH0pO1xyXG5cclxuICAgICAgICBjeS5vbigncmVtb3ZlJywgJ2VkZ2UnLCBlUmVtb3ZlID0gZnVuY3Rpb24gKCkge1xyXG4gICAgICAgICAgdmFyIGVkZ2UgPSB0aGlzO1xyXG4gICAgICAgICAgaWYgKGVkZ2Uuc2VsZWN0ZWQoKSkge1xyXG4gICAgICAgICAgICBudW1iZXJPZlNlbGVjdGVkRWRnZXMgPSBudW1iZXJPZlNlbGVjdGVkRWRnZXMgLSAxO1xyXG4gICAgICAgICAgICBcclxuICAgICAgICAgICAgY3kuc3RhcnRCYXRjaCgpO1xyXG4gICAgICAgICAgICBcclxuICAgICAgICAgICAgaWYgKGVkZ2VUb0hpZ2hsaWdodEJlbmRzKSB7XHJcbiAgICAgICAgICAgICAgZWRnZVRvSGlnaGxpZ2h0QmVuZHMucmVtb3ZlQ2xhc3MoJ2N5LWVkZ2UtYmVuZC1lZGl0aW5nLWhpZ2hsaWdodC1iZW5kcycpO1xyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgICAgIFxyXG4gICAgICAgICAgICBpZiAobnVtYmVyT2ZTZWxlY3RlZEVkZ2VzID09PSAxKSB7XHJcbiAgICAgICAgICAgICAgdmFyIHNlbGVjdGVkRWRnZXMgPSBjeS5lZGdlcygnOnNlbGVjdGVkJyk7XHJcbiAgICAgICAgICAgICAgXHJcbiAgICAgICAgICAgICAgLy8gSWYgdXNlciByZW1vdmVzIGFsbCBzZWxlY3RlZCBlZGdlcyBhdCBhIHNpbmdsZSBvcGVyYXRpb24gdGhlbiBvdXIgJ251bWJlck9mU2VsZWN0ZWRFZGdlcydcclxuICAgICAgICAgICAgICAvLyBtYXkgYmUgbWlzbGVhZGluZy4gVGhlcmVmb3JlIHdlIG5lZWQgdG8gY2hlY2sgaWYgdGhlIG51bWJlciBvZiBlZGdlcyB0byBoaWdobGlnaHQgaXMgcmVhbHkgMSBoZXJlLlxyXG4gICAgICAgICAgICAgIGlmIChzZWxlY3RlZEVkZ2VzLmxlbmd0aCA9PT0gMSkge1xyXG4gICAgICAgICAgICAgICAgZWRnZVRvSGlnaGxpZ2h0QmVuZHMgPSBzZWxlY3RlZEVkZ2VzWzBdO1xyXG4gICAgICAgICAgICAgICAgZWRnZVRvSGlnaGxpZ2h0QmVuZHMuYWRkQ2xhc3MoJ2N5LWVkZ2UtYmVuZC1lZGl0aW5nLWhpZ2hsaWdodC1iZW5kcycpO1xyXG4gICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICBlbHNlIHtcclxuICAgICAgICAgICAgICAgIGVkZ2VUb0hpZ2hsaWdodEJlbmRzID0gdW5kZWZpbmVkO1xyXG4gICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICBlbHNlIHtcclxuICAgICAgICAgICAgICBlZGdlVG9IaWdobGlnaHRCZW5kcyA9IHVuZGVmaW5lZDtcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICBcclxuICAgICAgICAgICAgY3kuZW5kQmF0Y2goKTtcclxuICAgICAgICAgIH1cclxuICAgICAgICAgIHJlZnJlc2hEcmF3cygpO1xyXG4gICAgICAgIH0pO1xyXG4gICAgICAgIFxyXG4gICAgICAgICBjeS5vbignYWRkJywgJ2VkZ2UnLCBlQWRkID0gZnVuY3Rpb24gKCkge1xyXG4gICAgICAgICAgdmFyIGVkZ2UgPSB0aGlzO1xyXG4gICAgICAgICAgaWYgKGVkZ2Uuc2VsZWN0ZWQoKSkge1xyXG4gICAgICAgICAgICBudW1iZXJPZlNlbGVjdGVkRWRnZXMgPSBudW1iZXJPZlNlbGVjdGVkRWRnZXMgKyAxO1xyXG4gICAgICAgICAgICBcclxuICAgICAgICAgICAgY3kuc3RhcnRCYXRjaCgpO1xyXG4gICAgICAgICAgICBcclxuICAgICAgICAgICAgaWYgKGVkZ2VUb0hpZ2hsaWdodEJlbmRzKSB7XHJcbiAgICAgICAgICAgICAgZWRnZVRvSGlnaGxpZ2h0QmVuZHMucmVtb3ZlQ2xhc3MoJ2N5LWVkZ2UtYmVuZC1lZGl0aW5nLWhpZ2hsaWdodC1iZW5kcycpO1xyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgICAgIFxyXG4gICAgICAgICAgICBpZiAobnVtYmVyT2ZTZWxlY3RlZEVkZ2VzID09PSAxKSB7XHJcbiAgICAgICAgICAgICAgZWRnZVRvSGlnaGxpZ2h0QmVuZHMgPSBlZGdlO1xyXG4gICAgICAgICAgICAgIGVkZ2VUb0hpZ2hsaWdodEJlbmRzLmFkZENsYXNzKCdjeS1lZGdlLWJlbmQtZWRpdGluZy1oaWdobGlnaHQtYmVuZHMnKTtcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICBlbHNlIHtcclxuICAgICAgICAgICAgICBlZGdlVG9IaWdobGlnaHRCZW5kcyA9IHVuZGVmaW5lZDtcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICBcclxuICAgICAgICAgICAgY3kuZW5kQmF0Y2goKTtcclxuICAgICAgICAgIH1cclxuICAgICAgICAgIHJlZnJlc2hEcmF3cygpO1xyXG4gICAgICAgIH0pO1xyXG4gICAgICAgIFxyXG4gICAgICAgIGN5Lm9uKCdzZWxlY3QnLCAnZWRnZScsIGVTZWxlY3QgPSBmdW5jdGlvbiAoKSB7XHJcbiAgICAgICAgICB2YXIgZWRnZSA9IHRoaXM7XHJcbiAgICAgICAgICBudW1iZXJPZlNlbGVjdGVkRWRnZXMgPSBudW1iZXJPZlNlbGVjdGVkRWRnZXMgKyAxO1xyXG4gICAgICAgICAgXHJcbiAgICAgICAgICBjeS5zdGFydEJhdGNoKCk7XHJcbiAgICAgICAgICAgIFxyXG4gICAgICAgICAgaWYgKGVkZ2VUb0hpZ2hsaWdodEJlbmRzKSB7XHJcbiAgICAgICAgICAgIGVkZ2VUb0hpZ2hsaWdodEJlbmRzLnJlbW92ZUNsYXNzKCdjeS1lZGdlLWJlbmQtZWRpdGluZy1oaWdobGlnaHQtYmVuZHMnKTtcclxuICAgICAgICAgIH1cclxuICAgICAgICAgICAgXHJcbiAgICAgICAgICBpZiAobnVtYmVyT2ZTZWxlY3RlZEVkZ2VzID09PSAxKSB7XHJcbiAgICAgICAgICAgIGVkZ2VUb0hpZ2hsaWdodEJlbmRzID0gZWRnZTtcclxuICAgICAgICAgICAgZWRnZVRvSGlnaGxpZ2h0QmVuZHMuYWRkQ2xhc3MoJ2N5LWVkZ2UtYmVuZC1lZGl0aW5nLWhpZ2hsaWdodC1iZW5kcycpO1xyXG4gICAgICAgICAgfVxyXG4gICAgICAgICAgZWxzZSB7XHJcbiAgICAgICAgICAgIGVkZ2VUb0hpZ2hsaWdodEJlbmRzID0gdW5kZWZpbmVkO1xyXG4gICAgICAgICAgfVxyXG4gICAgICAgICAgXHJcbiAgICAgICAgICBjeS5lbmRCYXRjaCgpO1xyXG4gICAgICAgICAgcmVmcmVzaERyYXdzKCk7XHJcbiAgICAgICAgfSk7XHJcbiAgICAgICAgXHJcbiAgICAgICAgY3kub24oJ3Vuc2VsZWN0JywgJ2VkZ2UnLCBlVW5zZWxlY3QgPSBmdW5jdGlvbiAoKSB7XHJcbiAgICAgICAgICBudW1iZXJPZlNlbGVjdGVkRWRnZXMgPSBudW1iZXJPZlNlbGVjdGVkRWRnZXMgLSAxO1xyXG4gICAgICAgICAgICBcclxuICAgICAgICAgIGN5LnN0YXJ0QmF0Y2goKTtcclxuICAgICAgICAgICAgXHJcbiAgICAgICAgICBpZiAoZWRnZVRvSGlnaGxpZ2h0QmVuZHMpIHtcclxuICAgICAgICAgICAgZWRnZVRvSGlnaGxpZ2h0QmVuZHMucmVtb3ZlQ2xhc3MoJ2N5LWVkZ2UtYmVuZC1lZGl0aW5nLWhpZ2hsaWdodC1iZW5kcycpO1xyXG4gICAgICAgICAgfVxyXG4gICAgICAgICAgICBcclxuICAgICAgICAgIGlmIChudW1iZXJPZlNlbGVjdGVkRWRnZXMgPT09IDEpIHtcclxuICAgICAgICAgICAgdmFyIHNlbGVjdGVkRWRnZXMgPSBjeS5lZGdlcygnOnNlbGVjdGVkJyk7XHJcbiAgICAgICAgICAgIFxyXG4gICAgICAgICAgICAvLyBJZiB1c2VyIHVuc2VsZWN0cyBhbGwgZWRnZXMgYnkgdGFwcGluZyB0byB0aGUgY29yZSBldGMuIHRoZW4gb3VyICdudW1iZXJPZlNlbGVjdGVkRWRnZXMnXHJcbiAgICAgICAgICAgIC8vIG1heSBiZSBtaXNsZWFkaW5nLiBUaGVyZWZvcmUgd2UgbmVlZCB0byBjaGVjayBpZiB0aGUgbnVtYmVyIG9mIGVkZ2VzIHRvIGhpZ2hsaWdodCBpcyByZWFseSAxIGhlcmUuXHJcbiAgICAgICAgICAgIGlmIChzZWxlY3RlZEVkZ2VzLmxlbmd0aCA9PT0gMSkge1xyXG4gICAgICAgICAgICAgIGVkZ2VUb0hpZ2hsaWdodEJlbmRzID0gc2VsZWN0ZWRFZGdlc1swXTtcclxuICAgICAgICAgICAgICBlZGdlVG9IaWdobGlnaHRCZW5kcy5hZGRDbGFzcygnY3ktZWRnZS1iZW5kLWVkaXRpbmctaGlnaGxpZ2h0LWJlbmRzJyk7XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgZWxzZSB7XHJcbiAgICAgICAgICAgICAgZWRnZVRvSGlnaGxpZ2h0QmVuZHMgPSB1bmRlZmluZWQ7XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICAgIH1cclxuICAgICAgICAgIGVsc2Uge1xyXG4gICAgICAgICAgICBlZGdlVG9IaWdobGlnaHRCZW5kcyA9IHVuZGVmaW5lZDtcclxuICAgICAgICAgIH1cclxuICAgICAgICAgIFxyXG4gICAgICAgICAgY3kuZW5kQmF0Y2goKTtcclxuICAgICAgICAgIHJlZnJlc2hEcmF3cygpO1xyXG4gICAgICAgIH0pO1xyXG4gICAgICAgIFxyXG4gICAgICAgIHZhciBtb3ZlZEJlbmRJbmRleDtcclxuICAgICAgICB2YXIgbW92ZWRCZW5kRWRnZTtcclxuICAgICAgICB2YXIgbW92ZUJlbmRQYXJhbTtcclxuICAgICAgICB2YXIgY3JlYXRlQmVuZE9uRHJhZztcclxuICAgICAgICB2YXIgbW92ZWRFbmRQb2ludDtcclxuICAgICAgICB2YXIgZHVtbXlOb2RlO1xyXG4gICAgICAgIHZhciBkZXRhY2hlZE5vZGU7XHJcbiAgICAgICAgdmFyIG5vZGVUb0F0dGFjaDtcclxuICAgICAgICBcclxuICAgICAgICBjeS5vbigndGFwc3RhcnQnLCAnZWRnZScsIGVUYXBTdGFydCA9IGZ1bmN0aW9uIChldmVudCkge1xyXG4gICAgICAgICAgdmFyIGVkZ2UgPSB0aGlzO1xyXG5cclxuICAgICAgICAgIGlmICghZWRnZVRvSGlnaGxpZ2h0QmVuZHMgfHwgZWRnZVRvSGlnaGxpZ2h0QmVuZHMuaWQoKSAhPT0gZWRnZS5pZCgpKSB7XHJcbiAgICAgICAgICAgIGNyZWF0ZUJlbmRPbkRyYWcgPSBmYWxzZTtcclxuICAgICAgICAgICAgcmV0dXJuO1xyXG4gICAgICAgICAgfVxyXG4gICAgICAgICAgXHJcbiAgICAgICAgICBtb3ZlZEJlbmRFZGdlID0gZWRnZTtcclxuICAgICAgICAgIFxyXG4gICAgICAgICAgbW92ZUJlbmRQYXJhbSA9IHtcclxuICAgICAgICAgICAgZWRnZTogZWRnZSxcclxuICAgICAgICAgICAgd2VpZ2h0czogZWRnZS5kYXRhKCdjeWVkZ2ViZW5kZWRpdGluZ1dlaWdodHMnKSA/IFtdLmNvbmNhdChlZGdlLmRhdGEoJ2N5ZWRnZWJlbmRlZGl0aW5nV2VpZ2h0cycpKSA6IFtdLFxyXG4gICAgICAgICAgICBkaXN0YW5jZXM6IGVkZ2UuZGF0YSgnY3llZGdlYmVuZGVkaXRpbmdEaXN0YW5jZXMnKSA/IFtdLmNvbmNhdChlZGdlLmRhdGEoJ2N5ZWRnZWJlbmRlZGl0aW5nRGlzdGFuY2VzJykpIDogW11cclxuICAgICAgICAgIH07XHJcbiAgICAgICAgICBcclxuICAgICAgICAgIHZhciBjeVBvcyA9IGV2ZW50LnBvc2l0aW9uIHx8IGV2ZW50LmN5UG9zaXRpb247XHJcbiAgICAgICAgICB2YXIgY3lQb3NYID0gY3lQb3MueDtcclxuICAgICAgICAgIHZhciBjeVBvc1kgPSBjeVBvcy55O1xyXG5cclxuICAgICAgICAgIHZhciBpbmRleCA9IGdldENvbnRhaW5pbmdCZW5kU2hhcGVJbmRleChjeVBvc1gsIGN5UG9zWSwgZWRnZSk7XHJcbiAgICAgICAgICBcclxuICAgICAgICAgIC8vIEdldCB3aGljaCBlbmQgcG9pbnQgaGFzIGJlZW4gY2xpY2tlZCAoU291cmNlOjAsIFRhcmdldDoxLCBOb25lOi0xKVxyXG4gICAgICAgICAgdmFyIGVuZFBvaW50ID0gZ2V0Q29udGFpbmluZ0VuZFBvaW50KGN5UG9zWCwgY3lQb3NZLCBlZGdlKTtcclxuXHJcbiAgICAgICAgICBpZihlbmRQb2ludCA9PSAwIHx8IGVuZFBvaW50ID09IDEpe1xyXG4gICAgICAgICAgICBtb3ZlZEVuZFBvaW50ID0gZW5kUG9pbnQ7XHJcbiAgICAgICAgICAgIGRldGFjaGVkTm9kZSA9IChlbmRQb2ludCA9PSAwKSA/IG1vdmVkQmVuZEVkZ2Uuc291cmNlKCkgOiBtb3ZlZEJlbmRFZGdlLnRhcmdldCgpO1xyXG5cclxuICAgICAgICAgICAgdmFyIGRpc2Nvbm5lY3RlZEVuZCA9IChlbmRQb2ludCA9PSAwKSA/ICdzb3VyY2UnIDogJ3RhcmdldCc7XHJcbiAgICAgICAgICAgIHZhciByZXN1bHQgPSByZWNvbm5lY3Rpb25VdGlsaXRpZXMuZGlzY29ubmVjdEVkZ2UobW92ZWRCZW5kRWRnZSwgY3ksIGV2ZW50LnJlbmRlcmVkUG9zaXRpb24sIGRpc2Nvbm5lY3RlZEVuZCk7XHJcbiAgICAgICAgICAgIFxyXG4gICAgICAgICAgICBkdW1teU5vZGUgPSByZXN1bHQuZHVtbXlOb2RlO1xyXG4gICAgICAgICAgICBtb3ZlZEJlbmRFZGdlID0gcmVzdWx0LmVkZ2U7XHJcblxyXG4gICAgICAgICAgICBkaXNhYmxlR2VzdHVyZXMoKTtcclxuICAgICAgICAgIH1cclxuICAgICAgICAgIGVsc2UgaWYgKGluZGV4ICE9IC0xKSB7XHJcbiAgICAgICAgICAgIG1vdmVkQmVuZEluZGV4ID0gaW5kZXg7XHJcbiAgICAgICAgICAgIC8vIG1vdmVkQmVuZEVkZ2UgPSBlZGdlO1xyXG4gICAgICAgICAgICBkaXNhYmxlR2VzdHVyZXMoKTtcclxuICAgICAgICAgIH1cclxuICAgICAgICAgIGVsc2Uge1xyXG4gICAgICAgICAgICBjcmVhdGVCZW5kT25EcmFnID0gdHJ1ZTtcclxuICAgICAgICAgIH1cclxuICAgICAgICB9KTtcclxuICAgICAgICBcclxuICAgICAgICBjeS5vbigndGFwZHJhZycsIGVUYXBEcmFnID0gZnVuY3Rpb24gKGV2ZW50KSB7XHJcbiAgICAgICAgICB2YXIgZWRnZSA9IG1vdmVkQmVuZEVkZ2U7XHJcbiAgICAgICAgICBpZihtb3ZlZEJlbmRFZGdlICE9PSB1bmRlZmluZWQgJiYgYmVuZFBvaW50VXRpbGl0aWVzLmlzSWdub3JlZEVkZ2UoZWRnZSkgKSB7XHJcbiAgICAgICAgICAgIHJldHVybjtcclxuICAgICAgICAgIH1cclxuXHJcbiAgICAgICAgICBpZihjcmVhdGVCZW5kT25EcmFnKSB7XHJcbiAgICAgICAgICAgIHZhciBjeVBvcyA9IGV2ZW50LnBvc2l0aW9uIHx8IGV2ZW50LmN5UG9zaXRpb247XHJcbiAgICAgICAgICAgIGJlbmRQb2ludFV0aWxpdGllcy5hZGRCZW5kUG9pbnQoZWRnZSwgY3lQb3MpO1xyXG4gICAgICAgICAgICBtb3ZlZEJlbmRJbmRleCA9IGdldENvbnRhaW5pbmdCZW5kU2hhcGVJbmRleChjeVBvcy54LCBjeVBvcy55LCBlZGdlKTtcclxuICAgICAgICAgICAgbW92ZWRCZW5kRWRnZSA9IGVkZ2U7XHJcbiAgICAgICAgICAgIGNyZWF0ZUJlbmRPbkRyYWcgPSB1bmRlZmluZWQ7XHJcbiAgICAgICAgICAgIGRpc2FibGVHZXN0dXJlcygpO1xyXG4gICAgICAgICAgfVxyXG4gICAgICAgICAgXHJcbiAgICAgICAgICBpZiAobW92ZWRCZW5kRWRnZSA9PT0gdW5kZWZpbmVkIHx8IChtb3ZlZEJlbmRJbmRleCA9PT0gdW5kZWZpbmVkICYmIG1vdmVkRW5kUG9pbnQgPT09IHVuZGVmaW5lZCkpIHtcclxuICAgICAgICAgICAgcmV0dXJuO1xyXG4gICAgICAgICAgfVxyXG5cclxuICAgICAgICAgIC8vIFVwZGF0ZSBlbmQgcG9pbnQgbG9jYXRpb24gKFNvdXJjZTowLCBUYXJnZXQ6MSlcclxuICAgICAgICAgIGlmKG1vdmVkRW5kUG9pbnQgIT0gLTEgJiYgZHVtbXlOb2RlKXtcclxuICAgICAgICAgICAgdmFyIG5ld1BvcyA9IGV2ZW50LnBvc2l0aW9uIHx8IGV2ZW50LmN5UG9zaXRpb247XHJcbiAgICAgICAgICAgIGR1bW15Tm9kZS5wb3NpdGlvbihuZXdQb3MpO1xyXG4gICAgICAgICAgfVxyXG4gICAgICAgICAgLy8gVXBkYXRlIGJlbmQgcG9pbnQgbG9jYXRpb25cclxuICAgICAgICAgIGVsc2UgaWYobW92ZWRCZW5kSW5kZXggIT0gdW5kZWZpbmVkKXsgXHJcbiAgICAgICAgICAgIHZhciB3ZWlnaHRzID0gZWRnZS5kYXRhKCdjeWVkZ2ViZW5kZWRpdGluZ1dlaWdodHMnKTtcclxuICAgICAgICAgICAgdmFyIGRpc3RhbmNlcyA9IGVkZ2UuZGF0YSgnY3llZGdlYmVuZGVkaXRpbmdEaXN0YW5jZXMnKTtcclxuICAgICAgICAgICAgXHJcbiAgICAgICAgICAgIHZhciByZWxhdGl2ZUJlbmRQb3NpdGlvbiA9IGJlbmRQb2ludFV0aWxpdGllcy5jb252ZXJ0VG9SZWxhdGl2ZUJlbmRQb3NpdGlvbihlZGdlLCBldmVudC5wb3NpdGlvbiB8fCBldmVudC5jeVBvc2l0aW9uKTtcclxuICAgICAgICAgICAgd2VpZ2h0c1ttb3ZlZEJlbmRJbmRleF0gPSByZWxhdGl2ZUJlbmRQb3NpdGlvbi53ZWlnaHQ7XHJcbiAgICAgICAgICAgIGRpc3RhbmNlc1ttb3ZlZEJlbmRJbmRleF0gPSByZWxhdGl2ZUJlbmRQb3NpdGlvbi5kaXN0YW5jZTtcclxuICAgICAgICAgICAgXHJcbiAgICAgICAgICAgIGVkZ2UuZGF0YSgnY3llZGdlYmVuZGVkaXRpbmdXZWlnaHRzJywgd2VpZ2h0cyk7XHJcbiAgICAgICAgICAgIGVkZ2UuZGF0YSgnY3llZGdlYmVuZGVkaXRpbmdEaXN0YW5jZXMnLCBkaXN0YW5jZXMpO1xyXG4gICAgICAgICAgfVxyXG4gICAgICAgICAgXHJcbiAgICAgICAgICBpZihldmVudC50YXJnZXQgJiYgZXZlbnQudGFyZ2V0WzBdICYmIGV2ZW50LnRhcmdldC5pc05vZGUoKSl7XHJcbiAgICAgICAgICAgIG5vZGVUb0F0dGFjaCA9IGV2ZW50LnRhcmdldDtcclxuICAgICAgICAgIH1cclxuXHJcbiAgICAgICAgICByZWZyZXNoRHJhd3MoKTtcclxuICAgICAgICB9KTtcclxuICAgICAgICBcclxuICAgICAgICBjeS5vbigndGFwZW5kJywgZVRhcEVuZCA9IGZ1bmN0aW9uIChldmVudCkge1xyXG4gICAgICAgICAgdmFyIGVkZ2UgPSBtb3ZlZEJlbmRFZGdlO1xyXG4gICAgICAgICAgXHJcbiAgICAgICAgICBpZiggZWRnZSAhPT0gdW5kZWZpbmVkICkge1xyXG4gICAgICAgICAgICBpZiggbW92ZWRCZW5kSW5kZXggIT0gdW5kZWZpbmVkICkge1xyXG4gICAgICAgICAgICAgIHZhciBzdGFydFggPSBlZGdlLnNvdXJjZSgpLnBvc2l0aW9uKCd4Jyk7XHJcbiAgICAgICAgICAgICAgdmFyIHN0YXJ0WSA9IGVkZ2Uuc291cmNlKCkucG9zaXRpb24oJ3knKTtcclxuICAgICAgICAgICAgICB2YXIgZW5kWCA9IGVkZ2UudGFyZ2V0KCkucG9zaXRpb24oJ3gnKTtcclxuICAgICAgICAgICAgICB2YXIgZW5kWSA9IGVkZ2UudGFyZ2V0KCkucG9zaXRpb24oJ3knKTtcclxuICAgICAgICAgICAgICBcclxuICAgICAgICAgICAgICB2YXIgc2VnUHRzID0gYmVuZFBvaW50VXRpbGl0aWVzLmdldFNlZ21lbnRQb2ludHMoZWRnZSk7XHJcbiAgICAgICAgICAgICAgdmFyIGFsbFB0cyA9IFtzdGFydFgsIHN0YXJ0WV0uY29uY2F0KHNlZ1B0cykuY29uY2F0KFtlbmRYLCBlbmRZXSk7XHJcbiAgICAgICAgICAgICAgXHJcbiAgICAgICAgICAgICAgdmFyIHBvaW50SW5kZXggPSBtb3ZlZEJlbmRJbmRleCArIDE7XHJcbiAgICAgICAgICAgICAgdmFyIHByZUluZGV4ID0gcG9pbnRJbmRleCAtIDE7XHJcbiAgICAgICAgICAgICAgdmFyIHBvc0luZGV4ID0gcG9pbnRJbmRleCArIDE7XHJcbiAgICAgICAgICAgICAgXHJcbiAgICAgICAgICAgICAgdmFyIHBvaW50ID0ge1xyXG4gICAgICAgICAgICAgICAgeDogYWxsUHRzWzIgKiBwb2ludEluZGV4XSxcclxuICAgICAgICAgICAgICAgIHk6IGFsbFB0c1syICogcG9pbnRJbmRleCArIDFdXHJcbiAgICAgICAgICAgICAgfTtcclxuICAgICAgICAgICAgICBcclxuICAgICAgICAgICAgICB2YXIgcHJlUG9pbnQgPSB7XHJcbiAgICAgICAgICAgICAgICB4OiBhbGxQdHNbMiAqIHByZUluZGV4XSxcclxuICAgICAgICAgICAgICAgIHk6IGFsbFB0c1syICogcHJlSW5kZXggKyAxXVxyXG4gICAgICAgICAgICAgIH07XHJcbiAgICAgICAgICAgICAgXHJcbiAgICAgICAgICAgICAgdmFyIHBvc1BvaW50ID0ge1xyXG4gICAgICAgICAgICAgICAgeDogYWxsUHRzWzIgKiBwb3NJbmRleF0sXHJcbiAgICAgICAgICAgICAgICB5OiBhbGxQdHNbMiAqIHBvc0luZGV4ICsgMV1cclxuICAgICAgICAgICAgICB9O1xyXG4gICAgICAgICAgICAgIFxyXG4gICAgICAgICAgICAgIHZhciBuZWFyVG9MaW5lO1xyXG4gICAgICAgICAgICAgIFxyXG4gICAgICAgICAgICAgIGlmKCAoIHBvaW50LnggPT09IHByZVBvaW50LnggJiYgcG9pbnQueSA9PT0gcHJlUG9pbnQueSApIHx8ICggcG9pbnQueCA9PT0gcHJlUG9pbnQueCAmJiBwb2ludC55ID09PSBwcmVQb2ludC55ICkgKSB7XHJcbiAgICAgICAgICAgICAgICBuZWFyVG9MaW5lID0gdHJ1ZTtcclxuICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgZWxzZSB7XHJcbiAgICAgICAgICAgICAgICB2YXIgbTEgPSAoIHByZVBvaW50LnkgLSBwb3NQb2ludC55ICkgLyAoIHByZVBvaW50LnggLSBwb3NQb2ludC54ICk7XHJcbiAgICAgICAgICAgICAgICB2YXIgbTIgPSAtMSAvIG0xO1xyXG5cclxuICAgICAgICAgICAgICAgIHZhciBzcmNUZ3RQb2ludHNBbmRUYW5nZW50cyA9IHtcclxuICAgICAgICAgICAgICAgICAgc3JjUG9pbnQ6IHByZVBvaW50LFxyXG4gICAgICAgICAgICAgICAgICB0Z3RQb2ludDogcG9zUG9pbnQsXHJcbiAgICAgICAgICAgICAgICAgIG0xOiBtMSxcclxuICAgICAgICAgICAgICAgICAgbTI6IG0yXHJcbiAgICAgICAgICAgICAgICB9O1xyXG5cclxuICAgICAgICAgICAgICAgIC8vZ2V0IHRoZSBpbnRlcnNlY3Rpb24gb2YgdGhlIGN1cnJlbnQgc2VnbWVudCB3aXRoIHRoZSBuZXcgYmVuZCBwb2ludFxyXG4gICAgICAgICAgICAgICAgdmFyIGN1cnJlbnRJbnRlcnNlY3Rpb24gPSBiZW5kUG9pbnRVdGlsaXRpZXMuZ2V0SW50ZXJzZWN0aW9uKGVkZ2UsIHBvaW50LCBzcmNUZ3RQb2ludHNBbmRUYW5nZW50cyk7XHJcbiAgICAgICAgICAgICAgICB2YXIgZGlzdCA9IE1hdGguc3FydCggTWF0aC5wb3coIChwb2ludC54IC0gY3VycmVudEludGVyc2VjdGlvbi54KSwgMiApIFxyXG4gICAgICAgICAgICAgICAgICAgICAgICArIE1hdGgucG93KCAocG9pbnQueSAtIGN1cnJlbnRJbnRlcnNlY3Rpb24ueSksIDIgKSk7XHJcbiAgICAgICAgICAgICAgICBcclxuICAgICAgICAgICAgICAgIC8vIHZhciBsZW5ndGggPSBNYXRoLnNxcnQoIE1hdGgucG93KCAocG9zUG9pbnQueCAtIHByZVBvaW50LngpLCAyICkgXHJcbiAgICAgICAgICAgICAgICAvLyAgICAgICAgICsgTWF0aC5wb3coIChwb3NQb2ludC55IC0gcHJlUG9pbnQueSksIDIgKSk7XHJcbiAgICAgICAgICAgICAgICBcclxuICAgICAgICAgICAgICAgIGlmKCBkaXN0ICA8IDggKSB7XHJcbiAgICAgICAgICAgICAgICAgIG5lYXJUb0xpbmUgPSB0cnVlO1xyXG4gICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgICAgXHJcbiAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgIFxyXG4gICAgICAgICAgICAgIGlmKCBuZWFyVG9MaW5lIClcclxuICAgICAgICAgICAgICB7XHJcbiAgICAgICAgICAgICAgICBiZW5kUG9pbnRVdGlsaXRpZXMucmVtb3ZlQmVuZFBvaW50KGVkZ2UsIG1vdmVkQmVuZEluZGV4KTtcclxuICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgXHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgZWxzZSBpZihkdW1teU5vZGUgIT0gdW5kZWZpbmVkICYmIChtb3ZlZEVuZFBvaW50ID09IDAgfHwgbW92ZWRFbmRQb2ludCA9PSAxKSApe1xyXG4gICAgICAgICAgICAgIFxyXG4gICAgICAgICAgICAgIHZhciBuZXdOb2RlID0gZGV0YWNoZWROb2RlO1xyXG4gICAgICAgICAgICAgIHZhciBpc1ZhbGlkID0gJ3ZhbGlkJztcclxuICAgICAgICAgICAgICB2YXIgbG9jYXRpb24gPSAobW92ZWRFbmRQb2ludCA9PSAwKSA/ICdzb3VyY2UnIDogJ3RhcmdldCc7XHJcblxyXG4gICAgICAgICAgICAgIC8vIHZhbGlkYXRlIGVkZ2UgcmVjb25uZWN0aW9uXHJcbiAgICAgICAgICAgICAgaWYobm9kZVRvQXR0YWNoKXtcclxuICAgICAgICAgICAgICAgIHZhciBuZXdTb3VyY2UgPSAobW92ZWRFbmRQb2ludCA9PSAwKSA/IG5vZGVUb0F0dGFjaCA6IGVkZ2Uuc291cmNlKCk7XHJcbiAgICAgICAgICAgICAgICB2YXIgbmV3VGFyZ2V0ID0gKG1vdmVkRW5kUG9pbnQgPT0gMSkgPyBub2RlVG9BdHRhY2ggOiBlZGdlLnRhcmdldCgpO1xyXG4gICAgICAgICAgICAgICAgaWYodHlwZW9mIHZhbGlkYXRlRWRnZSA9PT0gXCJmdW5jdGlvblwiKVxyXG4gICAgICAgICAgICAgICAgICBpc1ZhbGlkID0gdmFsaWRhdGVFZGdlKGVkZ2UsIG5ld1NvdXJjZSwgbmV3VGFyZ2V0KTtcclxuICAgICAgICAgICAgICAgIG5ld05vZGUgPSAoaXNWYWxpZCA9PT0gJ3ZhbGlkJykgPyBub2RlVG9BdHRhY2ggOiBkZXRhY2hlZE5vZGU7XHJcbiAgICAgICAgICAgICAgfVxyXG5cclxuICAgICAgICAgICAgICB2YXIgbmV3U291cmNlID0gKG1vdmVkRW5kUG9pbnQgPT0gMCkgPyBuZXdOb2RlIDogZWRnZS5zb3VyY2UoKTtcclxuICAgICAgICAgICAgICB2YXIgbmV3VGFyZ2V0ID0gKG1vdmVkRW5kUG9pbnQgPT0gMSkgPyBuZXdOb2RlIDogZWRnZS50YXJnZXQoKTtcclxuICAgICAgICAgICAgICBlZGdlID0gcmVjb25uZWN0aW9uVXRpbGl0aWVzLmNvbm5lY3RFZGdlKGVkZ2UsIGRldGFjaGVkTm9kZSwgbG9jYXRpb24pO1xyXG5cclxuICAgICAgICAgICAgICBpZihkZXRhY2hlZE5vZGUuaWQoKSAhPT0gbmV3Tm9kZS5pZCgpKXtcclxuICAgICAgICAgICAgICAgIC8vIHVzZSBnaXZlbiBoYW5kbGVSZWNvbm5lY3RFZGdlIGZ1bmN0aW9uIFxyXG4gICAgICAgICAgICAgICAgaWYodHlwZW9mIGhhbmRsZVJlY29ubmVjdEVkZ2UgPT09ICdmdW5jdGlvbicpe1xyXG4gICAgICAgICAgICAgICAgICB2YXIgcmVjb25uZWN0ZWRFZGdlID0gaGFuZGxlUmVjb25uZWN0RWRnZShuZXdTb3VyY2UuaWQoKSwgbmV3VGFyZ2V0LmlkKCksIGVkZ2UuZGF0YSgpKTtcclxuICAgICAgICAgICAgICAgICAgXHJcbiAgICAgICAgICAgICAgICAgIGlmKHJlY29ubmVjdGVkRWRnZSl7XHJcbiAgICAgICAgICAgICAgICAgICAgcmVjb25uZWN0aW9uVXRpbGl0aWVzLmNvcHlFZGdlKGVkZ2UsIHJlY29ubmVjdGVkRWRnZSk7XHJcbiAgICAgICAgICAgICAgICAgICAgYmVuZFBvaW50VXRpbGl0aWVzLmluaXRCZW5kUG9pbnRzKG9wdGlvbnMoKS5iZW5kUG9zaXRpb25zRnVuY3Rpb24sIFtyZWNvbm5lY3RlZEVkZ2VdKTtcclxuICAgICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgICAgICBcclxuICAgICAgICAgICAgICAgICAgaWYocmVjb25uZWN0ZWRFZGdlICYmIG9wdGlvbnMoKS51bmRvYWJsZSl7XHJcbiAgICAgICAgICAgICAgICAgICAgdmFyIHBhcmFtcyA9IHtcclxuICAgICAgICAgICAgICAgICAgICAgIG5ld0VkZ2U6IHJlY29ubmVjdGVkRWRnZSxcclxuICAgICAgICAgICAgICAgICAgICAgIG9sZEVkZ2U6IGVkZ2VcclxuICAgICAgICAgICAgICAgICAgICB9O1xyXG4gICAgICAgICAgICAgICAgICAgIGN5LnVuZG9SZWRvKCkuZG8oJ3JlbW92ZVJlY29ubmVjdGVkRWRnZScsIHBhcmFtcyk7XHJcbiAgICAgICAgICAgICAgICAgICAgZWRnZSA9IHJlY29ubmVjdGVkRWRnZTtcclxuICAgICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgICAgICBlbHNlIGlmKHJlY29ubmVjdGVkRWRnZSl7XHJcbiAgICAgICAgICAgICAgICAgICAgY3kucmVtb3ZlKGVkZ2UpO1xyXG4gICAgICAgICAgICAgICAgICAgIGVkZ2UgPSByZWNvbm5lY3RlZEVkZ2U7XHJcbiAgICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICAgIGVsc2V7XHJcbiAgICAgICAgICAgICAgICAgIHZhciBsb2MgPSAobW92ZWRFbmRQb2ludCA9PSAwKSA/IHtzb3VyY2U6IG5ld05vZGUuaWQoKX0gOiB7dGFyZ2V0OiBuZXdOb2RlLmlkKCl9O1xyXG4gICAgICAgICAgICAgICAgICB2YXIgb2xkTG9jID0gKG1vdmVkRW5kUG9pbnQgPT0gMCkgPyB7c291cmNlOiBkZXRhY2hlZE5vZGUuaWQoKX0gOiB7dGFyZ2V0OiBkZXRhY2hlZE5vZGUuaWQoKX07XHJcbiAgICAgICAgICAgICAgICAgIFxyXG4gICAgICAgICAgICAgICAgICBpZihvcHRpb25zKCkudW5kb2FibGUgJiYgbmV3Tm9kZS5pZCgpICE9PSBkZXRhY2hlZE5vZGUuaWQoKSkge1xyXG4gICAgICAgICAgICAgICAgICAgIHZhciBwYXJhbSA9IHtcclxuICAgICAgICAgICAgICAgICAgICAgIGVkZ2U6IGVkZ2UsXHJcbiAgICAgICAgICAgICAgICAgICAgICBsb2NhdGlvbjogbG9jLFxyXG4gICAgICAgICAgICAgICAgICAgICAgb2xkTG9jOiBvbGRMb2NcclxuICAgICAgICAgICAgICAgICAgICB9O1xyXG4gICAgICAgICAgICAgICAgICAgIHZhciByZXN1bHQgPSBjeS51bmRvUmVkbygpLmRvKCdyZWNvbm5lY3RFZGdlJywgcGFyYW0pO1xyXG4gICAgICAgICAgICAgICAgICAgIGVkZ2UgPSByZXN1bHQuZWRnZTtcclxuICAgICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgICAgfSAgXHJcbiAgICAgICAgICAgICAgfVxyXG5cclxuICAgICAgICAgICAgICAvLyBpbnZhbGlkIGVkZ2UgcmVjb25uZWN0aW9uIGNhbGxiYWNrXHJcbiAgICAgICAgICAgICAgaWYoaXNWYWxpZCAhPT0gJ3ZhbGlkJyAmJiB0eXBlb2YgYWN0T25VbnN1Y2Nlc3NmdWxSZWNvbm5lY3Rpb24gPT09ICdmdW5jdGlvbicpe1xyXG4gICAgICAgICAgICAgICAgYWN0T25VbnN1Y2Nlc3NmdWxSZWNvbm5lY3Rpb24oKTtcclxuICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgZWRnZS51bnNlbGVjdCgpO1xyXG4gICAgICAgICAgICAgIGN5LnJlbW92ZShkdW1teU5vZGUpO1xyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgICB9XHJcbiAgICAgICAgICBcclxuICAgICAgICAgIGlmIChlZGdlICE9PSB1bmRlZmluZWQgJiYgbW92ZUJlbmRQYXJhbSAhPT0gdW5kZWZpbmVkICYmIGVkZ2UuZGF0YSgnY3llZGdlYmVuZGVkaXRpbmdXZWlnaHRzJylcclxuICAgICAgICAgICYmIGVkZ2UuZGF0YSgnY3llZGdlYmVuZGVkaXRpbmdXZWlnaHRzJykudG9TdHJpbmcoKSAhPSBtb3ZlQmVuZFBhcmFtLndlaWdodHMudG9TdHJpbmcoKSkge1xyXG4gICAgICAgICAgICBcclxuICAgICAgICAgICAgaWYob3B0aW9ucygpLnVuZG9hYmxlKSB7XHJcbiAgICAgICAgICAgICAgY3kudW5kb1JlZG8oKS5kbygnY2hhbmdlQmVuZFBvaW50cycsIG1vdmVCZW5kUGFyYW0pO1xyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgICB9XHJcbiAgICAgICAgICBcclxuICAgICAgICAgIG1vdmVkQmVuZEluZGV4ID0gdW5kZWZpbmVkO1xyXG4gICAgICAgICAgbW92ZWRCZW5kRWRnZSA9IHVuZGVmaW5lZDtcclxuICAgICAgICAgIG1vdmVCZW5kUGFyYW0gPSB1bmRlZmluZWQ7XHJcbiAgICAgICAgICBjcmVhdGVCZW5kT25EcmFnID0gdW5kZWZpbmVkO1xyXG4gICAgICAgICAgbW92ZWRFbmRQb2ludCA9IHVuZGVmaW5lZDtcclxuICAgICAgICAgIGR1bW15Tm9kZSA9IHVuZGVmaW5lZDtcclxuICAgICAgICAgIGRldGFjaGVkTm9kZSA9IHVuZGVmaW5lZDtcclxuICAgICAgICAgIG5vZGVUb0F0dGFjaCA9IHVuZGVmaW5lZDtcclxuXHJcbiAgICAgICAgICByZXNldEdlc3R1cmVzKCk7XHJcbiAgICAgICAgICByZWZyZXNoRHJhd3MoKTtcclxuICAgICAgICB9KTtcclxuXHJcbiAgICAgICAgLy9WYXJpYWJsZXMgdXNlZCBmb3Igc3RhcnRpbmcgYW5kIGVuZGluZyB0aGUgbW92ZW1lbnQgb2YgYmVuZCBwb2ludHMgd2l0aCBhcnJvd3NcclxuICAgICAgICB2YXIgbW92ZXBhcmFtO1xyXG4gICAgICAgIHZhciBmaXJzdEJlbmRQb2ludDtcclxuICAgICAgICB2YXIgZWRnZUNvbnRhaW5pbmdGaXJzdEJlbmRQb2ludDtcclxuICAgICAgICB2YXIgZmlyc3RCZW5kUG9pbnRGb3VuZDtcclxuICAgICAgICBjeS5vbihcImVkZ2ViZW5kZWRpdGluZy5tb3Zlc3RhcnRcIiwgZnVuY3Rpb24gKGUsIGVkZ2VzKSB7XHJcbiAgICAgICAgICAgIGZpcnN0QmVuZFBvaW50Rm91bmQgPSBmYWxzZTtcclxuICAgICAgICAgICAgaWYgKGVkZ2VzWzBdICE9IHVuZGVmaW5lZClcclxuICAgICAgICAgICAge1xyXG4gICAgICAgICAgICAgICAgZWRnZXMuZm9yRWFjaChmdW5jdGlvbiggZWRnZSApe1xyXG4gICAgICAgICAgICAgICAgICBpZiAoYmVuZFBvaW50VXRpbGl0aWVzLmdldFNlZ21lbnRQb2ludHMoZWRnZSkgIT0gdW5kZWZpbmVkICYmICFmaXJzdEJlbmRQb2ludEZvdW5kKVxyXG4gICAgICAgICAgICAgICAgICB7XHJcbiAgICAgICAgICAgICAgICAgICAgICBmaXJzdEJlbmRQb2ludCA9IHsgeDogYmVuZFBvaW50VXRpbGl0aWVzLmdldFNlZ21lbnRQb2ludHMoZWRnZSlbMF0sIHk6IGJlbmRQb2ludFV0aWxpdGllcy5nZXRTZWdtZW50UG9pbnRzKGVkZ2UpWzFdfTtcclxuICAgICAgICAgICAgICAgICAgICAgIG1vdmVwYXJhbSA9IHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICBmaXJzdFRpbWU6IHRydWUsXHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgZmlyc3RCZW5kUG9pbnRQb3NpdGlvbjoge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICB4OiBmaXJzdEJlbmRQb2ludC54LFxyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICB5OiBmaXJzdEJlbmRQb2ludC55XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgfSxcclxuICAgICAgICAgICAgICAgICAgICAgICAgICBlZGdlczogZWRnZXNcclxuICAgICAgICAgICAgICAgICAgICAgIH07XHJcbiAgICAgICAgICAgICAgICAgICAgICBlZGdlQ29udGFpbmluZ0ZpcnN0QmVuZFBvaW50ID0gZWRnZTtcclxuICAgICAgICAgICAgICAgICAgICAgIGZpcnN0QmVuZFBvaW50Rm91bmQgPSB0cnVlO1xyXG4gICAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgICB9KTtcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgIH0pO1xyXG5cclxuICAgICAgICBjeS5vbihcImVkZ2ViZW5kZWRpdGluZy5tb3ZlZW5kXCIsIGZ1bmN0aW9uIChlLCBlZGdlcykge1xyXG4gICAgICAgICAgICBpZiAobW92ZXBhcmFtICE9IHVuZGVmaW5lZClcclxuICAgICAgICAgICAge1xyXG4gICAgICAgICAgICAgICAgdmFyIGluaXRpYWxQb3MgPSBtb3ZlcGFyYW0uZmlyc3RCZW5kUG9pbnRQb3NpdGlvbjtcclxuICAgICAgICAgICAgICAgIHZhciBtb3ZlZEZpcnN0QmVuZFBvaW50ID0ge1xyXG4gICAgICAgICAgICAgICAgICAgIHg6IGJlbmRQb2ludFV0aWxpdGllcy5nZXRTZWdtZW50UG9pbnRzKGVkZ2VDb250YWluaW5nRmlyc3RCZW5kUG9pbnQpWzBdLFxyXG4gICAgICAgICAgICAgICAgICAgIHk6IGJlbmRQb2ludFV0aWxpdGllcy5nZXRTZWdtZW50UG9pbnRzKGVkZ2VDb250YWluaW5nRmlyc3RCZW5kUG9pbnQpWzFdXHJcbiAgICAgICAgICAgICAgICB9O1xyXG5cclxuXHJcbiAgICAgICAgICAgICAgICBtb3ZlcGFyYW0ucG9zaXRpb25EaWZmID0ge1xyXG4gICAgICAgICAgICAgICAgICAgIHg6IC1tb3ZlZEZpcnN0QmVuZFBvaW50LnggKyBpbml0aWFsUG9zLngsXHJcbiAgICAgICAgICAgICAgICAgICAgeTogLW1vdmVkRmlyc3RCZW5kUG9pbnQueSArIGluaXRpYWxQb3MueVxyXG4gICAgICAgICAgICAgICAgfVxyXG5cclxuICAgICAgICAgICAgICAgIGRlbGV0ZSBtb3ZlcGFyYW0uZmlyc3RCZW5kUG9pbnRQb3NpdGlvbjtcclxuXHJcbiAgICAgICAgICAgICAgICBpZihvcHRpb25zKCkudW5kb2FibGUpIHtcclxuICAgICAgICAgICAgICAgICAgICBjeS51bmRvUmVkbygpLmRvKFwibW92ZUJlbmRQb2ludHNcIiwgbW92ZXBhcmFtKTtcclxuICAgICAgICAgICAgICAgIH1cclxuXHJcbiAgICAgICAgICAgICAgICBtb3ZlcGFyYW0gPSB1bmRlZmluZWQ7XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICB9KTtcclxuXHJcbiAgICAgICAgY3kub24oJ2N4dHRhcCcsICdlZGdlJywgZUN4dFRhcCA9IGZ1bmN0aW9uIChldmVudCkge1xyXG4gICAgICAgICAgdmFyIGVkZ2UgPSB0aGlzO1xyXG4gICAgICAgICAgXHJcbiAgICAgICAgICB2YXIgbWVudXMgPSBjeS5jb250ZXh0TWVudXMoJ2dldCcpOyAvLyBnZXQgY29udGV4dCBtZW51cyBpbnN0YW5jZVxyXG4gICAgICAgICAgXHJcbiAgICAgICAgICBpZighZWRnZVRvSGlnaGxpZ2h0QmVuZHMgfHwgZWRnZVRvSGlnaGxpZ2h0QmVuZHMuaWQoKSAhPSBlZGdlLmlkKCkgfHwgYmVuZFBvaW50VXRpbGl0aWVzLmlzSWdub3JlZEVkZ2UoZWRnZSkpIHtcclxuICAgICAgICAgICAgbWVudXMuaGlkZU1lbnVJdGVtKHJlbW92ZUJlbmRQb2ludEN4dE1lbnVJZCk7XHJcbiAgICAgICAgICAgIG1lbnVzLmhpZGVNZW51SXRlbShhZGRCZW5kUG9pbnRDeHRNZW51SWQpO1xyXG4gICAgICAgICAgICByZXR1cm47XHJcbiAgICAgICAgICB9XHJcblxyXG4gICAgICAgICAgdmFyIGN5UG9zID0gZXZlbnQucG9zaXRpb24gfHwgZXZlbnQuY3lQb3NpdGlvbjtcclxuICAgICAgICAgIHZhciBzZWxlY3RlZEJlbmRJbmRleCA9IGdldENvbnRhaW5pbmdCZW5kU2hhcGVJbmRleChjeVBvcy54LCBjeVBvcy55LCBlZGdlKTtcclxuICAgICAgICAgIGlmIChzZWxlY3RlZEJlbmRJbmRleCA9PSAtMSkge1xyXG4gICAgICAgICAgICBtZW51cy5oaWRlTWVudUl0ZW0ocmVtb3ZlQmVuZFBvaW50Q3h0TWVudUlkKTtcclxuICAgICAgICAgICAgbWVudXMuc2hvd01lbnVJdGVtKGFkZEJlbmRQb2ludEN4dE1lbnVJZCk7XHJcbiAgICAgICAgICAgIGJlbmRQb2ludFV0aWxpdGllcy5jdXJyZW50Q3R4UG9zID0gY3lQb3M7XHJcbiAgICAgICAgICB9XHJcbiAgICAgICAgICBlbHNlIHtcclxuICAgICAgICAgICAgbWVudXMuaGlkZU1lbnVJdGVtKGFkZEJlbmRQb2ludEN4dE1lbnVJZCk7XHJcbiAgICAgICAgICAgIG1lbnVzLnNob3dNZW51SXRlbShyZW1vdmVCZW5kUG9pbnRDeHRNZW51SWQpO1xyXG4gICAgICAgICAgICBiZW5kUG9pbnRVdGlsaXRpZXMuY3VycmVudEJlbmRJbmRleCA9IHNlbGVjdGVkQmVuZEluZGV4O1xyXG4gICAgICAgICAgfVxyXG5cclxuICAgICAgICAgIGJlbmRQb2ludFV0aWxpdGllcy5jdXJyZW50Q3R4RWRnZSA9IGVkZ2U7XHJcbiAgICAgICAgfSk7XHJcbiAgICAgICAgXHJcbiAgICAgICAgY3kub24oJ2N5ZWRnZWJlbmRlZGl0aW5nLmNoYW5nZUJlbmRQb2ludHMnLCAnZWRnZScsIGZ1bmN0aW9uKCkge1xyXG4gICAgICAgICAgdmFyIGVkZ2UgPSB0aGlzO1xyXG4gICAgICAgICAgY3kuc3RhcnRCYXRjaCgpO1xyXG4gICAgICAgICAgY3kuZWRnZXMoKS51bnNlbGVjdCgpO1xyXG4gICAgICAgICAgZWRnZS5zZWxlY3QoKTtcclxuICAgICAgICAgIGN5LnRyaWdnZXIoJ2JlbmRQb2ludE1vdmVtZW50Jyk7XHJcbiAgICAgICAgICBjeS5lbmRCYXRjaCgpO1xyXG4gICAgICAgICAgcmVmcmVzaERyYXdzKCk7XHJcbiAgICAgICAgfSk7XHJcbiAgICAgIH1cclxuXHJcbiAgICAgIHZhciBzZWxlY3RlZEVkZ2VzO1xyXG4gICAgICB2YXIgYmVuZFBvaW50c01vdmluZyA9IGZhbHNlO1xyXG5cclxuICAgICAgZnVuY3Rpb24ga2V5RG93bihlKSB7XHJcblxyXG4gICAgICAgICAgdmFyIHNob3VsZE1vdmUgPSB0eXBlb2Ygb3B0aW9ucygpLm1vdmVTZWxlY3RlZEJlbmRQb2ludHNPbktleUV2ZW50cyA9PT0gJ2Z1bmN0aW9uJ1xyXG4gICAgICAgICAgICAgID8gb3B0aW9ucygpLm1vdmVTZWxlY3RlZEJlbmRQb2ludHNPbktleUV2ZW50cygpIDogb3B0aW9ucygpLm1vdmVTZWxlY3RlZEJlbmRQb2ludHNPbktleUV2ZW50cztcclxuXHJcbiAgICAgICAgICBpZiAoIXNob3VsZE1vdmUpIHtcclxuICAgICAgICAgICAgICByZXR1cm47XHJcbiAgICAgICAgICB9XHJcblxyXG4gICAgICAgICAgLy9DaGVja3MgaWYgdGhlIHRhZ25hbWUgaXMgdGV4dGFyZWEgb3IgaW5wdXRcclxuICAgICAgICAgIHZhciB0biA9IGRvY3VtZW50LmFjdGl2ZUVsZW1lbnQudGFnTmFtZTtcclxuICAgICAgICAgIGlmICh0biAhPSBcIlRFWFRBUkVBXCIgJiYgdG4gIT0gXCJJTlBVVFwiKVxyXG4gICAgICAgICAge1xyXG4gICAgICAgICAgICAgIHN3aXRjaChlLmtleUNvZGUpe1xyXG4gICAgICAgICAgICAgICAgICBjYXNlIDM3OiBjYXNlIDM5OiBjYXNlIDM4OiAgY2FzZSA0MDogLy8gQXJyb3cga2V5c1xyXG4gICAgICAgICAgICAgICAgICBjYXNlIDMyOiBlLnByZXZlbnREZWZhdWx0KCk7IGJyZWFrOyAvLyBTcGFjZVxyXG4gICAgICAgICAgICAgICAgICBkZWZhdWx0OiBicmVhazsgLy8gZG8gbm90IGJsb2NrIG90aGVyIGtleXNcclxuICAgICAgICAgICAgICB9XHJcblxyXG5cclxuICAgICAgICAgICAgICBpZiAoZS5rZXlDb2RlIDwgJzM3JyB8fCBlLmtleUNvZGUgPiAnNDAnKSB7XHJcbiAgICAgICAgICAgICAgICAgIHJldHVybjtcclxuICAgICAgICAgICAgICB9XHJcblxyXG4gICAgICAgICAgICAgIC8vQ2hlY2tzIGlmIG9ubHkgZWRnZXMgYXJlIHNlbGVjdGVkIChub3QgYW55IG5vZGUpIGFuZCBpZiBvbmx5IDEgZWRnZSBpcyBzZWxlY3RlZFxyXG4gICAgICAgICAgICAgIC8vSWYgdGhlIHNlY29uZCBjaGVja2luZyBpcyByZW1vdmVkIHRoZSBiZW5kIHBvaW50cyBvZiBtdWx0aXBsZSBlZGdlcyB3b3VsZCBtb3ZlXHJcbiAgICAgICAgICAgICAgaWYgKGN5LmVkZ2VzKFwiOnNlbGVjdGVkXCIpLmxlbmd0aCAhPSBjeS5lbGVtZW50cyhcIjpzZWxlY3RlZFwiKS5sZW5ndGggfHwgY3kuZWRnZXMoXCI6c2VsZWN0ZWRcIikubGVuZ3RoICE9IDEpXHJcbiAgICAgICAgICAgICAge1xyXG4gICAgICAgICAgICAgICAgcmV0dXJuO1xyXG4gICAgICAgICAgICAgIH1cclxuXHJcbiAgICAgICAgICAgICAgaWYgKCFiZW5kUG9pbnRzTW92aW5nKVxyXG4gICAgICAgICAgICAgIHtcclxuICAgICAgICAgICAgICAgICAgc2VsZWN0ZWRFZGdlcyA9IGN5LmVkZ2VzKCc6c2VsZWN0ZWQnKTtcclxuICAgICAgICAgICAgICAgICAgY3kudHJpZ2dlcihcImVkZ2ViZW5kZWRpdGluZy5tb3Zlc3RhcnRcIiwgW3NlbGVjdGVkRWRnZXNdKTtcclxuICAgICAgICAgICAgICAgICAgYmVuZFBvaW50c01vdmluZyA9IHRydWU7XHJcbiAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgIGlmIChlLmFsdEtleSAmJiBlLndoaWNoID09ICczOCcpIHtcclxuICAgICAgICAgICAgICAgICAgLy8gdXAgYXJyb3cgYW5kIGFsdFxyXG4gICAgICAgICAgICAgICAgICBtb3ZlQmVuZFBvaW50cyAoe3g6MCwgeTotMX0sc2VsZWN0ZWRFZGdlcyk7XHJcbiAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgIGVsc2UgaWYgKGUuYWx0S2V5ICYmIGUud2hpY2ggPT0gJzQwJykge1xyXG4gICAgICAgICAgICAgICAgICAvLyBkb3duIGFycm93IGFuZCBhbHRcclxuICAgICAgICAgICAgICAgICAgbW92ZUJlbmRQb2ludHMgKHt4OjAsIHk6MX0sc2VsZWN0ZWRFZGdlcyk7XHJcbiAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgIGVsc2UgaWYgKGUuYWx0S2V5ICYmIGUud2hpY2ggPT0gJzM3Jykge1xyXG4gICAgICAgICAgICAgICAgICAvLyBsZWZ0IGFycm93IGFuZCBhbHRcclxuICAgICAgICAgICAgICAgICAgbW92ZUJlbmRQb2ludHMgKHt4Oi0xLCB5OjB9LHNlbGVjdGVkRWRnZXMpO1xyXG4gICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICBlbHNlIGlmIChlLmFsdEtleSAmJiBlLndoaWNoID09ICczOScpIHtcclxuICAgICAgICAgICAgICAgICAgLy8gcmlnaHQgYXJyb3cgYW5kIGFsdFxyXG4gICAgICAgICAgICAgICAgICBtb3ZlQmVuZFBvaW50cyAoe3g6MSwgeTowfSxzZWxlY3RlZEVkZ2VzKTtcclxuICAgICAgICAgICAgICB9XHJcblxyXG4gICAgICAgICAgICAgIGVsc2UgaWYgKGUuc2hpZnRLZXkgJiYgZS53aGljaCA9PSAnMzgnKSB7XHJcbiAgICAgICAgICAgICAgICAgIC8vIHVwIGFycm93IGFuZCBzaGlmdFxyXG4gICAgICAgICAgICAgICAgICBtb3ZlQmVuZFBvaW50cyAoe3g6MCwgeTotMTB9LHNlbGVjdGVkRWRnZXMpO1xyXG4gICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICBlbHNlIGlmIChlLnNoaWZ0S2V5ICYmIGUud2hpY2ggPT0gJzQwJykge1xyXG4gICAgICAgICAgICAgICAgICAvLyBkb3duIGFycm93IGFuZCBzaGlmdFxyXG4gICAgICAgICAgICAgICAgICBtb3ZlQmVuZFBvaW50cyAoe3g6MCwgeToxMH0sc2VsZWN0ZWRFZGdlcyk7XHJcbiAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgIGVsc2UgaWYgKGUuc2hpZnRLZXkgJiYgZS53aGljaCA9PSAnMzcnKSB7XHJcbiAgICAgICAgICAgICAgICAgIC8vIGxlZnQgYXJyb3cgYW5kIHNoaWZ0XHJcbiAgICAgICAgICAgICAgICAgIG1vdmVCZW5kUG9pbnRzICh7eDotMTAsIHk6MH0sc2VsZWN0ZWRFZGdlcyk7XHJcblxyXG4gICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICBlbHNlIGlmIChlLnNoaWZ0S2V5ICYmIGUud2hpY2ggPT0gJzM5JyApIHtcclxuICAgICAgICAgICAgICAgICAgLy8gcmlnaHQgYXJyb3cgYW5kIHNoaWZ0XHJcbiAgICAgICAgICAgICAgICAgIG1vdmVCZW5kUG9pbnRzICh7eDoxMCwgeTowfSxzZWxlY3RlZEVkZ2VzKTtcclxuICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgZWxzZSBpZiAoZS5rZXlDb2RlID09ICczOCcpIHtcclxuICAgICAgICAgICAgICAgICAgLy8gdXAgYXJyb3dcclxuICAgICAgICAgICAgICAgICAgbW92ZUJlbmRQb2ludHMoe3g6IDAsIHk6IC0zfSwgc2VsZWN0ZWRFZGdlcyk7XHJcbiAgICAgICAgICAgICAgfVxyXG5cclxuICAgICAgICAgICAgICBlbHNlIGlmIChlLmtleUNvZGUgPT0gJzQwJykge1xyXG4gICAgICAgICAgICAgICAgICAvLyBkb3duIGFycm93XHJcbiAgICAgICAgICAgICAgICAgIG1vdmVCZW5kUG9pbnRzICh7eDowLCB5OjN9LHNlbGVjdGVkRWRnZXMpO1xyXG4gICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICBlbHNlIGlmIChlLmtleUNvZGUgPT0gJzM3Jykge1xyXG4gICAgICAgICAgICAgICAgICAvLyBsZWZ0IGFycm93XHJcbiAgICAgICAgICAgICAgICAgIG1vdmVCZW5kUG9pbnRzICh7eDotMywgeTowfSxzZWxlY3RlZEVkZ2VzKTtcclxuICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgZWxzZSBpZiAoZS5rZXlDb2RlID09ICczOScpIHtcclxuICAgICAgICAgICAgICAgICAgLy9yaWdodCBhcnJvd1xyXG4gICAgICAgICAgICAgICAgICBtb3ZlQmVuZFBvaW50cyAoe3g6MywgeTowfSxzZWxlY3RlZEVkZ2VzKTtcclxuICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICB9XHJcbiAgICAgIH1cclxuICAgICAgZnVuY3Rpb24ga2V5VXAoZSkge1xyXG5cclxuICAgICAgICAgIGlmIChlLmtleUNvZGUgPCAnMzcnIHx8IGUua2V5Q29kZSA+ICc0MCcpIHtcclxuICAgICAgICAgICAgICByZXR1cm47XHJcbiAgICAgICAgICB9XHJcblxyXG4gICAgICAgICAgdmFyIHNob3VsZE1vdmUgPSB0eXBlb2Ygb3B0aW9ucygpLm1vdmVTZWxlY3RlZEJlbmRQb2ludHNPbktleUV2ZW50cyA9PT0gJ2Z1bmN0aW9uJ1xyXG4gICAgICAgICAgICAgID8gb3B0aW9ucygpLm1vdmVTZWxlY3RlZEJlbmRQb2ludHNPbktleUV2ZW50cygpIDogb3B0aW9ucygpLm1vdmVTZWxlY3RlZEJlbmRQb2ludHNPbktleUV2ZW50cztcclxuXHJcbiAgICAgICAgICBpZiAoIXNob3VsZE1vdmUpIHtcclxuICAgICAgICAgICAgICByZXR1cm47XHJcbiAgICAgICAgICB9XHJcblxyXG4gICAgICAgICAgY3kudHJpZ2dlcihcImVkZ2ViZW5kZWRpdGluZy5tb3ZlZW5kXCIsIFtzZWxlY3RlZEVkZ2VzXSk7XHJcbiAgICAgICAgICBzZWxlY3RlZEVkZ2VzID0gdW5kZWZpbmVkO1xyXG4gICAgICAgICAgYmVuZFBvaW50c01vdmluZyA9IGZhbHNlO1xyXG5cclxuICAgICAgfVxyXG4gICAgICBkb2N1bWVudC5hZGRFdmVudExpc3RlbmVyKFwia2V5ZG93blwiLGtleURvd24sIHRydWUpO1xyXG4gICAgICBkb2N1bWVudC5hZGRFdmVudExpc3RlbmVyKFwia2V5dXBcIixrZXlVcCwgdHJ1ZSk7XHJcblxyXG4gICAgICAkY29udGFpbmVyLmRhdGEoJ2N5ZWRnZWJlbmRlZGl0aW5nJywgZGF0YSk7XHJcbiAgICB9LFxyXG4gICAgdW5iaW5kOiBmdW5jdGlvbiAoKSB7XHJcbiAgICAgICAgY3kub2ZmKCdwb3NpdGlvbicsICdub2RlJywgZVBvc2l0aW9uKVxyXG4gICAgICAgICAgLm9mZigncmVtb3ZlJywgJ25vZGUnLCBlUmVtb3ZlKVxyXG4gICAgICAgICAgLm9mZignYWRkJywgJ25vZGUnLCBlQWRkKVxyXG4gICAgICAgICAgLm9mZignc3R5bGUnLCAnZWRnZS5lZGdlYmVuZGVkaXRpbmctaGFzYmVuZHBvaW50czpzZWxlY3RlZCcsIGVTdHlsZSlcclxuICAgICAgICAgIC5vZmYoJ3NlbGVjdCcsICdlZGdlJywgZVNlbGVjdClcclxuICAgICAgICAgIC5vZmYoJ3Vuc2VsZWN0JywgJ2VkZ2UnLCBlVW5zZWxlY3QpXHJcbiAgICAgICAgICAub2ZmKCd0YXBzdGFydCcsICdlZGdlJywgZVRhcFN0YXJ0KVxyXG4gICAgICAgICAgLm9mZigndGFwZHJhZycsIGVUYXBEcmFnKVxyXG4gICAgICAgICAgLm9mZigndGFwZW5kJywgZVRhcEVuZClcclxuICAgICAgICAgIC5vZmYoJ2N4dHRhcCcsIGVDeHRUYXApO1xyXG5cclxuICAgICAgICBjeS51bmJpbmQoXCJ6b29tIHBhblwiLCBlWm9vbSk7XHJcbiAgICB9XHJcbiAgfTtcclxuXHJcbiAgaWYgKGZ1bmN0aW9uc1tmbl0pIHtcclxuICAgIHJldHVybiBmdW5jdGlvbnNbZm5dLmFwcGx5KCQoY3kuY29udGFpbmVyKCkpLCBBcnJheS5wcm90b3R5cGUuc2xpY2UuY2FsbChhcmd1bWVudHMsIDEpKTtcclxuICB9IGVsc2UgaWYgKHR5cGVvZiBmbiA9PSAnb2JqZWN0JyB8fCAhZm4pIHtcclxuICAgIHJldHVybiBmdW5jdGlvbnMuaW5pdC5hcHBseSgkKGN5LmNvbnRhaW5lcigpKSwgYXJndW1lbnRzKTtcclxuICB9IGVsc2Uge1xyXG4gICAgJC5lcnJvcignTm8gc3VjaCBmdW5jdGlvbiBgJyArIGZuICsgJ2AgZm9yIGN5dG9zY2FwZS5qcy1lZGdlLWJlbmQtZWRpdGluZycpO1xyXG4gIH1cclxuXHJcbiAgcmV0dXJuICQodGhpcyk7XHJcbn07XHJcbiIsInZhciBiZW5kUG9pbnRVdGlsaXRpZXMgPSB7XHJcbiAgY3VycmVudEN0eEVkZ2U6IHVuZGVmaW5lZCxcclxuICBjdXJyZW50Q3R4UG9zOiB1bmRlZmluZWQsXHJcbiAgY3VycmVudEJlbmRJbmRleDogdW5kZWZpbmVkLFxyXG4gIGlnbm9yZWRDbGFzc2VzOiB1bmRlZmluZWQsXHJcbiAgc2V0SWdub3JlZENsYXNzZXM6IGZ1bmN0aW9uKF9pZ25vcmVkQ2xhc3Nlcykge1xyXG4gICAgdGhpcy5pZ25vcmVkQ2xhc3NlcyA9IF9pZ25vcmVkQ2xhc3NlcztcclxuICB9LFxyXG4gIC8vIGluaXRpbGl6ZSBiZW5kIHBvaW50cyBiYXNlZCBvbiBiZW5kUG9zaXRpb25zRmNuXHJcbiAgaW5pdEJlbmRQb2ludHM6IGZ1bmN0aW9uKGJlbmRQb3NpdGlvbnNGY24sIGVkZ2VzKSB7XHJcbiAgICBmb3IgKHZhciBpID0gMDsgaSA8IGVkZ2VzLmxlbmd0aDsgaSsrKSB7XHJcbiAgICAgIHZhciBlZGdlID0gZWRnZXNbaV07XHJcbiAgICAgIGlmKCF0aGlzLmlzSWdub3JlZEVkZ2UoZWRnZSkpIHtcclxuXHJcbiAgICAgICAgLy8gZ2V0IHRoZSBiZW5kIHBvc2l0aW9ucyBieSBhcHBseWluZyB0aGUgZnVuY3Rpb24gZm9yIHRoaXMgZWRnZVxyXG4gICAgICAgIHZhciBiZW5kUG9zaXRpb25zID0gYmVuZFBvc2l0aW9uc0Zjbi5hcHBseSh0aGlzLCBlZGdlKTtcclxuICAgICAgICAvLyBjYWxjdWxhdGUgcmVsYXRpdmUgYmVuZCBwb3NpdGlvbnNcclxuICAgICAgICB2YXIgcmVzdWx0ID0gdGhpcy5jb252ZXJ0VG9SZWxhdGl2ZUJlbmRQb3NpdGlvbnMoZWRnZSwgYmVuZFBvc2l0aW9ucyk7XHJcblxyXG4gICAgICAgIC8vIGlmIHRoZXJlIGFyZSBiZW5kIHBvaW50cyBzZXQgd2VpZ2h0cyBhbmQgZGlzdGFuY2VzIGFjY29yZGluZ2x5IGFuZCBhZGQgY2xhc3MgdG8gZW5hYmxlIHN0eWxlIGNoYW5nZXNcclxuICAgICAgICBpZiAocmVzdWx0LmRpc3RhbmNlcy5sZW5ndGggPiAwKSB7XHJcbiAgICAgICAgICBlZGdlLmRhdGEoJ2N5ZWRnZWJlbmRlZGl0aW5nV2VpZ2h0cycsIHJlc3VsdC53ZWlnaHRzKTtcclxuICAgICAgICAgIGVkZ2UuZGF0YSgnY3llZGdlYmVuZGVkaXRpbmdEaXN0YW5jZXMnLCByZXN1bHQuZGlzdGFuY2VzKTtcclxuICAgICAgICAgIGVkZ2UuYWRkQ2xhc3MoJ2VkZ2ViZW5kZWRpdGluZy1oYXNiZW5kcG9pbnRzJyk7XHJcbiAgICAgICAgfVxyXG4gICAgICB9XHJcbiAgICB9XHJcbiAgfSxcclxuXHJcbiAgaXNJZ25vcmVkRWRnZTogZnVuY3Rpb24oZWRnZSkge1xyXG4gICAgZm9yKHZhciBpID0gMDsgdGhpcy5pZ25vcmVkQ2xhc3NlcyAmJiBpIDwgIHRoaXMuaWdub3JlZENsYXNzZXMubGVuZ3RoOyBpKyspe1xyXG4gICAgICBpZihlZGdlLmhhc0NsYXNzKHRoaXMuaWdub3JlZENsYXNzZXNbaV0pKVxyXG4gICAgICAgIHJldHVybiB0cnVlO1xyXG4gICAgfVxyXG4gICAgcmV0dXJuIGZhbHNlO1xyXG4gIH0sXHJcbiAgLy9HZXQgdGhlIGRpcmVjdGlvbiBvZiB0aGUgbGluZSBmcm9tIHNvdXJjZSBwb2ludCB0byB0aGUgdGFyZ2V0IHBvaW50XHJcbiAgZ2V0TGluZURpcmVjdGlvbjogZnVuY3Rpb24oc3JjUG9pbnQsIHRndFBvaW50KXtcclxuICAgIGlmKHNyY1BvaW50LnkgPT0gdGd0UG9pbnQueSAmJiBzcmNQb2ludC54IDwgdGd0UG9pbnQueCl7XHJcbiAgICAgIHJldHVybiAxO1xyXG4gICAgfVxyXG4gICAgaWYoc3JjUG9pbnQueSA8IHRndFBvaW50LnkgJiYgc3JjUG9pbnQueCA8IHRndFBvaW50Lngpe1xyXG4gICAgICByZXR1cm4gMjtcclxuICAgIH1cclxuICAgIGlmKHNyY1BvaW50LnkgPCB0Z3RQb2ludC55ICYmIHNyY1BvaW50LnggPT0gdGd0UG9pbnQueCl7XHJcbiAgICAgIHJldHVybiAzO1xyXG4gICAgfVxyXG4gICAgaWYoc3JjUG9pbnQueSA8IHRndFBvaW50LnkgJiYgc3JjUG9pbnQueCA+IHRndFBvaW50Lngpe1xyXG4gICAgICByZXR1cm4gNDtcclxuICAgIH1cclxuICAgIGlmKHNyY1BvaW50LnkgPT0gdGd0UG9pbnQueSAmJiBzcmNQb2ludC54ID4gdGd0UG9pbnQueCl7XHJcbiAgICAgIHJldHVybiA1O1xyXG4gICAgfVxyXG4gICAgaWYoc3JjUG9pbnQueSA+IHRndFBvaW50LnkgJiYgc3JjUG9pbnQueCA+IHRndFBvaW50Lngpe1xyXG4gICAgICByZXR1cm4gNjtcclxuICAgIH1cclxuICAgIGlmKHNyY1BvaW50LnkgPiB0Z3RQb2ludC55ICYmIHNyY1BvaW50LnggPT0gdGd0UG9pbnQueCl7XHJcbiAgICAgIHJldHVybiA3O1xyXG4gICAgfVxyXG4gICAgcmV0dXJuIDg7Ly9pZiBzcmNQb2ludC55ID4gdGd0UG9pbnQueSBhbmQgc3JjUG9pbnQueCA8IHRndFBvaW50LnhcclxuICB9LFxyXG4gIGdldFNyY1RndFBvaW50c0FuZFRhbmdlbnRzOiBmdW5jdGlvbiAoZWRnZSkge1xyXG4gICAgdmFyIHNvdXJjZU5vZGUgPSBlZGdlLnNvdXJjZSgpO1xyXG4gICAgdmFyIHRhcmdldE5vZGUgPSBlZGdlLnRhcmdldCgpO1xyXG4gICAgXHJcbiAgICB2YXIgdGd0UG9zaXRpb24gPSB0YXJnZXROb2RlLnBvc2l0aW9uKCk7XHJcbiAgICB2YXIgc3JjUG9zaXRpb24gPSBzb3VyY2VOb2RlLnBvc2l0aW9uKCk7XHJcbiAgICBcclxuICAgIHZhciBzcmNQb2ludCA9IHNvdXJjZU5vZGUucG9zaXRpb24oKTtcclxuICAgIHZhciB0Z3RQb2ludCA9IHRhcmdldE5vZGUucG9zaXRpb24oKTtcclxuXHJcblxyXG4gICAgdmFyIG0xID0gKHRndFBvaW50LnkgLSBzcmNQb2ludC55KSAvICh0Z3RQb2ludC54IC0gc3JjUG9pbnQueCk7XHJcbiAgICB2YXIgbTIgPSAtMSAvIG0xO1xyXG5cclxuICAgIHJldHVybiB7XHJcbiAgICAgIG0xOiBtMSxcclxuICAgICAgbTI6IG0yLFxyXG4gICAgICBzcmNQb2ludDogc3JjUG9pbnQsXHJcbiAgICAgIHRndFBvaW50OiB0Z3RQb2ludFxyXG4gICAgfTtcclxuICB9LFxyXG4gIGdldEludGVyc2VjdGlvbjogZnVuY3Rpb24oZWRnZSwgcG9pbnQsIHNyY1RndFBvaW50c0FuZFRhbmdlbnRzKXtcclxuICAgIGlmIChzcmNUZ3RQb2ludHNBbmRUYW5nZW50cyA9PT0gdW5kZWZpbmVkKSB7XHJcbiAgICAgIHNyY1RndFBvaW50c0FuZFRhbmdlbnRzID0gdGhpcy5nZXRTcmNUZ3RQb2ludHNBbmRUYW5nZW50cyhlZGdlKTtcclxuICAgIH1cclxuXHJcbiAgICB2YXIgc3JjUG9pbnQgPSBzcmNUZ3RQb2ludHNBbmRUYW5nZW50cy5zcmNQb2ludDtcclxuICAgIHZhciB0Z3RQb2ludCA9IHNyY1RndFBvaW50c0FuZFRhbmdlbnRzLnRndFBvaW50O1xyXG4gICAgdmFyIG0xID0gc3JjVGd0UG9pbnRzQW5kVGFuZ2VudHMubTE7XHJcbiAgICB2YXIgbTIgPSBzcmNUZ3RQb2ludHNBbmRUYW5nZW50cy5tMjtcclxuXHJcbiAgICB2YXIgaW50ZXJzZWN0WDtcclxuICAgIHZhciBpbnRlcnNlY3RZO1xyXG5cclxuICAgIGlmKG0xID09IEluZmluaXR5IHx8IG0xID09IC1JbmZpbml0eSl7XHJcbiAgICAgIGludGVyc2VjdFggPSBzcmNQb2ludC54O1xyXG4gICAgICBpbnRlcnNlY3RZID0gcG9pbnQueTtcclxuICAgIH1cclxuICAgIGVsc2UgaWYobTEgPT0gMCl7XHJcbiAgICAgIGludGVyc2VjdFggPSBwb2ludC54O1xyXG4gICAgICBpbnRlcnNlY3RZID0gc3JjUG9pbnQueTtcclxuICAgIH1cclxuICAgIGVsc2Uge1xyXG4gICAgICB2YXIgYTEgPSBzcmNQb2ludC55IC0gbTEgKiBzcmNQb2ludC54O1xyXG4gICAgICB2YXIgYTIgPSBwb2ludC55IC0gbTIgKiBwb2ludC54O1xyXG5cclxuICAgICAgaW50ZXJzZWN0WCA9IChhMiAtIGExKSAvIChtMSAtIG0yKTtcclxuICAgICAgaW50ZXJzZWN0WSA9IG0xICogaW50ZXJzZWN0WCArIGExO1xyXG4gICAgfVxyXG5cclxuICAgIC8vSW50ZXJzZWN0aW9uIHBvaW50IGlzIHRoZSBpbnRlcnNlY3Rpb24gb2YgdGhlIGxpbmVzIHBhc3NpbmcgdGhyb3VnaCB0aGUgbm9kZXMgYW5kXHJcbiAgICAvL3Bhc3NpbmcgdGhyb3VnaCB0aGUgYmVuZCBwb2ludCBhbmQgcGVycGVuZGljdWxhciB0byB0aGUgb3RoZXIgbGluZVxyXG4gICAgdmFyIGludGVyc2VjdGlvblBvaW50ID0ge1xyXG4gICAgICB4OiBpbnRlcnNlY3RYLFxyXG4gICAgICB5OiBpbnRlcnNlY3RZXHJcbiAgICB9O1xyXG4gICAgXHJcbiAgICByZXR1cm4gaW50ZXJzZWN0aW9uUG9pbnQ7XHJcbiAgfSxcclxuICBnZXRTZWdtZW50UG9pbnRzOiBmdW5jdGlvbihlZGdlKSB7XHJcbiAgICBcclxuICAgIGlmKCBlZGdlLmNzcygnY3VydmUtc3R5bGUnKSAhPT0gJ3NlZ21lbnRzJyApIHtcclxuICAgICAgcmV0dXJuIHVuZGVmaW5lZDtcclxuICAgIH1cclxuICAgIFxyXG4gICAgdmFyIHNlZ3B0cyA9IFtdO1xyXG5cclxuICAgIHZhciBzZWdtZW50V3MgPSBlZGdlLnBzdHlsZSggJ3NlZ21lbnQtd2VpZ2h0cycgKS5wZlZhbHVlO1xyXG4gICAgdmFyIHNlZ21lbnREcyA9IGVkZ2UucHN0eWxlKCAnc2VnbWVudC1kaXN0YW5jZXMnICkucGZWYWx1ZTtcclxuICAgIHZhciBzZWdtZW50c04gPSBNYXRoLm1pbiggc2VnbWVudFdzLmxlbmd0aCwgc2VnbWVudERzLmxlbmd0aCApO1xyXG4gICAgXHJcbiAgICB2YXIgc3JjUG9zID0gZWRnZS5zb3VyY2UoKS5wb3NpdGlvbigpO1xyXG4gICAgdmFyIHRndFBvcyA9IGVkZ2UudGFyZ2V0KCkucG9zaXRpb24oKTtcclxuXHJcbiAgICB2YXIgZHkgPSAoIHRndFBvcy55IC0gc3JjUG9zLnkgKTtcclxuICAgIHZhciBkeCA9ICggdGd0UG9zLnggLSBzcmNQb3MueCApO1xyXG4gICAgXHJcbiAgICB2YXIgbCA9IE1hdGguc3FydCggZHggKiBkeCArIGR5ICogZHkgKTtcclxuXHJcbiAgICB2YXIgdmVjdG9yID0ge1xyXG4gICAgICB4OiBkeCxcclxuICAgICAgeTogZHlcclxuICAgIH07XHJcblxyXG4gICAgdmFyIHZlY3Rvck5vcm0gPSB7XHJcbiAgICAgIHg6IHZlY3Rvci54IC8gbCxcclxuICAgICAgeTogdmVjdG9yLnkgLyBsXHJcbiAgICB9O1xyXG4gICAgXHJcbiAgICB2YXIgdmVjdG9yTm9ybUludmVyc2UgPSB7XHJcbiAgICAgIHg6IC12ZWN0b3JOb3JtLnksXHJcbiAgICAgIHk6IHZlY3Rvck5vcm0ueFxyXG4gICAgfTtcclxuXHJcbiAgICBmb3IoIHZhciBzID0gMDsgcyA8IHNlZ21lbnRzTjsgcysrICl7XHJcbiAgICAgIHZhciB3ID0gc2VnbWVudFdzWyBzIF07XHJcbiAgICAgIHZhciBkID0gc2VnbWVudERzWyBzIF07XHJcblxyXG4gICAgICAvLyBkID0gc3dhcHBlZERpcmVjdGlvbiA/IC1kIDogZDtcclxuICAgICAgLy9cclxuICAgICAgLy8gZCA9IE1hdGguYWJzKGQpO1xyXG5cclxuICAgICAgLy8gdmFyIHcxID0gIXN3YXBwZWREaXJlY3Rpb24gPyAoMSAtIHcpIDogdztcclxuICAgICAgLy8gdmFyIHcyID0gIXN3YXBwZWREaXJlY3Rpb24gPyB3IDogKDEgLSB3KTtcclxuXHJcbiAgICAgIHZhciB3MSA9ICgxIC0gdyk7XHJcbiAgICAgIHZhciB3MiA9IHc7XHJcblxyXG4gICAgICB2YXIgcG9zUHRzID0ge1xyXG4gICAgICAgIHgxOiBzcmNQb3MueCxcclxuICAgICAgICB4MjogdGd0UG9zLngsXHJcbiAgICAgICAgeTE6IHNyY1Bvcy55LFxyXG4gICAgICAgIHkyOiB0Z3RQb3MueVxyXG4gICAgICB9O1xyXG5cclxuICAgICAgdmFyIG1pZHB0UHRzID0gcG9zUHRzO1xyXG4gICAgICBcclxuICAgICAgXHJcblxyXG4gICAgICB2YXIgYWRqdXN0ZWRNaWRwdCA9IHtcclxuICAgICAgICB4OiBtaWRwdFB0cy54MSAqIHcxICsgbWlkcHRQdHMueDIgKiB3MixcclxuICAgICAgICB5OiBtaWRwdFB0cy55MSAqIHcxICsgbWlkcHRQdHMueTIgKiB3MlxyXG4gICAgICB9O1xyXG5cclxuICAgICAgc2VncHRzLnB1c2goXHJcbiAgICAgICAgYWRqdXN0ZWRNaWRwdC54ICsgdmVjdG9yTm9ybUludmVyc2UueCAqIGQsXHJcbiAgICAgICAgYWRqdXN0ZWRNaWRwdC55ICsgdmVjdG9yTm9ybUludmVyc2UueSAqIGRcclxuICAgICAgKTtcclxuICAgIH1cclxuICAgIFxyXG4gICAgcmV0dXJuIHNlZ3B0cztcclxuICB9LFxyXG4gIGNvbnZlcnRUb1JlbGF0aXZlQmVuZFBvc2l0aW9uOiBmdW5jdGlvbiAoZWRnZSwgYmVuZFBvaW50LCBzcmNUZ3RQb2ludHNBbmRUYW5nZW50cykge1xyXG4gICAgaWYgKHNyY1RndFBvaW50c0FuZFRhbmdlbnRzID09PSB1bmRlZmluZWQpIHtcclxuICAgICAgc3JjVGd0UG9pbnRzQW5kVGFuZ2VudHMgPSB0aGlzLmdldFNyY1RndFBvaW50c0FuZFRhbmdlbnRzKGVkZ2UpO1xyXG4gICAgfVxyXG4gICAgXHJcbiAgICB2YXIgaW50ZXJzZWN0aW9uUG9pbnQgPSB0aGlzLmdldEludGVyc2VjdGlvbihlZGdlLCBiZW5kUG9pbnQsIHNyY1RndFBvaW50c0FuZFRhbmdlbnRzKTtcclxuICAgIHZhciBpbnRlcnNlY3RYID0gaW50ZXJzZWN0aW9uUG9pbnQueDtcclxuICAgIHZhciBpbnRlcnNlY3RZID0gaW50ZXJzZWN0aW9uUG9pbnQueTtcclxuICAgIFxyXG4gICAgdmFyIHNyY1BvaW50ID0gc3JjVGd0UG9pbnRzQW5kVGFuZ2VudHMuc3JjUG9pbnQ7XHJcbiAgICB2YXIgdGd0UG9pbnQgPSBzcmNUZ3RQb2ludHNBbmRUYW5nZW50cy50Z3RQb2ludDtcclxuICAgIFxyXG4gICAgdmFyIHdlaWdodDtcclxuICAgIFxyXG4gICAgaWYoIGludGVyc2VjdFggIT0gc3JjUG9pbnQueCApIHtcclxuICAgICAgd2VpZ2h0ID0gKGludGVyc2VjdFggLSBzcmNQb2ludC54KSAvICh0Z3RQb2ludC54IC0gc3JjUG9pbnQueCk7XHJcbiAgICB9XHJcbiAgICBlbHNlIGlmKCBpbnRlcnNlY3RZICE9IHNyY1BvaW50LnkgKSB7XHJcbiAgICAgIHdlaWdodCA9IChpbnRlcnNlY3RZIC0gc3JjUG9pbnQueSkgLyAodGd0UG9pbnQueSAtIHNyY1BvaW50LnkpO1xyXG4gICAgfVxyXG4gICAgZWxzZSB7XHJcbiAgICAgIHdlaWdodCA9IDA7XHJcbiAgICB9XHJcbiAgICBcclxuICAgIHZhciBkaXN0YW5jZSA9IE1hdGguc3FydChNYXRoLnBvdygoaW50ZXJzZWN0WSAtIGJlbmRQb2ludC55KSwgMilcclxuICAgICAgICArIE1hdGgucG93KChpbnRlcnNlY3RYIC0gYmVuZFBvaW50LngpLCAyKSk7XHJcbiAgICBcclxuICAgIC8vR2V0IHRoZSBkaXJlY3Rpb24gb2YgdGhlIGxpbmUgZm9ybSBzb3VyY2UgcG9pbnQgdG8gdGFyZ2V0IHBvaW50XHJcbiAgICB2YXIgZGlyZWN0aW9uMSA9IHRoaXMuZ2V0TGluZURpcmVjdGlvbihzcmNQb2ludCwgdGd0UG9pbnQpO1xyXG4gICAgLy9HZXQgdGhlIGRpcmVjdGlvbiBvZiB0aGUgbGluZSBmcm9tIGludGVzZWN0aW9uIHBvaW50IHRvIGJlbmQgcG9pbnRcclxuICAgIHZhciBkaXJlY3Rpb24yID0gdGhpcy5nZXRMaW5lRGlyZWN0aW9uKGludGVyc2VjdGlvblBvaW50LCBiZW5kUG9pbnQpO1xyXG4gICAgXHJcbiAgICAvL0lmIHRoZSBkaWZmZXJlbmNlIGlzIG5vdCAtMiBhbmQgbm90IDYgdGhlbiB0aGUgZGlyZWN0aW9uIG9mIHRoZSBkaXN0YW5jZSBpcyBuZWdhdGl2ZVxyXG4gICAgaWYoZGlyZWN0aW9uMSAtIGRpcmVjdGlvbjIgIT0gLTIgJiYgZGlyZWN0aW9uMSAtIGRpcmVjdGlvbjIgIT0gNil7XHJcbiAgICAgIGlmKGRpc3RhbmNlICE9IDApXHJcbiAgICAgICAgZGlzdGFuY2UgPSAtMSAqIGRpc3RhbmNlO1xyXG4gICAgfVxyXG4gICAgXHJcbiAgICByZXR1cm4ge1xyXG4gICAgICB3ZWlnaHQ6IHdlaWdodCxcclxuICAgICAgZGlzdGFuY2U6IGRpc3RhbmNlXHJcbiAgICB9O1xyXG4gIH0sXHJcbiAgY29udmVydFRvUmVsYXRpdmVCZW5kUG9zaXRpb25zOiBmdW5jdGlvbiAoZWRnZSwgYmVuZFBvaW50cykge1xyXG4gICAgdmFyIHNyY1RndFBvaW50c0FuZFRhbmdlbnRzID0gdGhpcy5nZXRTcmNUZ3RQb2ludHNBbmRUYW5nZW50cyhlZGdlKTtcclxuLy8gICAgdmFyIGJlbmRQb2ludHMgPSBlZGdlLmRhdGEoJ2JlbmRQb2ludFBvc2l0aW9ucycpO1xyXG4gICAgLy9vdXRwdXQgdmFyaWFibGVzXHJcbiAgICB2YXIgd2VpZ2h0cyA9IFtdO1xyXG4gICAgdmFyIGRpc3RhbmNlcyA9IFtdO1xyXG5cclxuICAgIGZvciAodmFyIGkgPSAwOyBiZW5kUG9pbnRzICYmIGkgPCBiZW5kUG9pbnRzLmxlbmd0aDsgaSsrKSB7XHJcbiAgICAgIHZhciBiZW5kUG9pbnQgPSBiZW5kUG9pbnRzW2ldO1xyXG4gICAgICB2YXIgcmVsYXRpdmVCZW5kUG9zaXRpb24gPSB0aGlzLmNvbnZlcnRUb1JlbGF0aXZlQmVuZFBvc2l0aW9uKGVkZ2UsIGJlbmRQb2ludCwgc3JjVGd0UG9pbnRzQW5kVGFuZ2VudHMpO1xyXG5cclxuICAgICAgd2VpZ2h0cy5wdXNoKHJlbGF0aXZlQmVuZFBvc2l0aW9uLndlaWdodCk7XHJcbiAgICAgIGRpc3RhbmNlcy5wdXNoKHJlbGF0aXZlQmVuZFBvc2l0aW9uLmRpc3RhbmNlKTtcclxuICAgIH1cclxuXHJcbiAgICByZXR1cm4ge1xyXG4gICAgICB3ZWlnaHRzOiB3ZWlnaHRzLFxyXG4gICAgICBkaXN0YW5jZXM6IGRpc3RhbmNlc1xyXG4gICAgfTtcclxuICB9LFxyXG4gIGdldFNlZ21lbnREaXN0YW5jZXNTdHJpbmc6IGZ1bmN0aW9uIChlZGdlKSB7XHJcbiAgICB2YXIgc3RyID0gXCJcIjtcclxuXHJcbiAgICB2YXIgZGlzdGFuY2VzID0gZWRnZS5kYXRhKCdjeWVkZ2ViZW5kZWRpdGluZ0Rpc3RhbmNlcycpO1xyXG4gICAgZm9yICh2YXIgaSA9IDA7IGRpc3RhbmNlcyAmJiBpIDwgZGlzdGFuY2VzLmxlbmd0aDsgaSsrKSB7XHJcbiAgICAgIHN0ciA9IHN0ciArIFwiIFwiICsgZGlzdGFuY2VzW2ldO1xyXG4gICAgfVxyXG4gICAgXHJcbiAgICByZXR1cm4gc3RyO1xyXG4gIH0sXHJcbiAgZ2V0U2VnbWVudFdlaWdodHNTdHJpbmc6IGZ1bmN0aW9uIChlZGdlKSB7XHJcbiAgICB2YXIgc3RyID0gXCJcIjtcclxuXHJcbiAgICB2YXIgd2VpZ2h0cyA9IGVkZ2UuZGF0YSgnY3llZGdlYmVuZGVkaXRpbmdXZWlnaHRzJyk7XHJcbiAgICBmb3IgKHZhciBpID0gMDsgd2VpZ2h0cyAmJiBpIDwgd2VpZ2h0cy5sZW5ndGg7IGkrKykge1xyXG4gICAgICBzdHIgPSBzdHIgKyBcIiBcIiArIHdlaWdodHNbaV07XHJcbiAgICB9XHJcbiAgICBcclxuICAgIHJldHVybiBzdHI7XHJcbiAgfSxcclxuICBhZGRCZW5kUG9pbnQ6IGZ1bmN0aW9uKGVkZ2UsIG5ld0JlbmRQb2ludCkge1xyXG4gICAgaWYoZWRnZSA9PT0gdW5kZWZpbmVkIHx8IG5ld0JlbmRQb2ludCA9PT0gdW5kZWZpbmVkKXtcclxuICAgICAgZWRnZSA9IHRoaXMuY3VycmVudEN0eEVkZ2U7XHJcbiAgICAgIG5ld0JlbmRQb2ludCA9IHRoaXMuY3VycmVudEN0eFBvcztcclxuICAgIH1cclxuICAgIFxyXG4gICAgdmFyIHJlbGF0aXZlQmVuZFBvc2l0aW9uID0gdGhpcy5jb252ZXJ0VG9SZWxhdGl2ZUJlbmRQb3NpdGlvbihlZGdlLCBuZXdCZW5kUG9pbnQpO1xyXG4gICAgdmFyIG9yaWdpbmFsUG9pbnRXZWlnaHQgPSByZWxhdGl2ZUJlbmRQb3NpdGlvbi53ZWlnaHQ7XHJcbiAgICBcclxuICAgIHZhciBzdGFydFggPSBlZGdlLnNvdXJjZSgpLnBvc2l0aW9uKCd4Jyk7XHJcbiAgICB2YXIgc3RhcnRZID0gZWRnZS5zb3VyY2UoKS5wb3NpdGlvbigneScpO1xyXG4gICAgdmFyIGVuZFggPSBlZGdlLnRhcmdldCgpLnBvc2l0aW9uKCd4Jyk7XHJcbiAgICB2YXIgZW5kWSA9IGVkZ2UudGFyZ2V0KCkucG9zaXRpb24oJ3knKTtcclxuICAgIFxyXG4gICAgdmFyIHN0YXJ0V2VpZ2h0ID0gdGhpcy5jb252ZXJ0VG9SZWxhdGl2ZUJlbmRQb3NpdGlvbihlZGdlLCB7eDogc3RhcnRYLCB5OiBzdGFydFl9KS53ZWlnaHQ7XHJcbiAgICB2YXIgZW5kV2VpZ2h0ID0gdGhpcy5jb252ZXJ0VG9SZWxhdGl2ZUJlbmRQb3NpdGlvbihlZGdlLCB7eDogZW5kWCwgeTogZW5kWX0pLndlaWdodDtcclxuICAgIHZhciB3ZWlnaHRzV2l0aFRndFNyYyA9IFtzdGFydFdlaWdodF0uY29uY2F0KGVkZ2UuZGF0YSgnY3llZGdlYmVuZGVkaXRpbmdXZWlnaHRzJyk/ZWRnZS5kYXRhKCdjeWVkZ2ViZW5kZWRpdGluZ1dlaWdodHMnKTpbXSkuY29uY2F0KFtlbmRXZWlnaHRdKTtcclxuICAgIFxyXG4gICAgdmFyIHNlZ1B0cyA9IHRoaXMuZ2V0U2VnbWVudFBvaW50cyhlZGdlKTtcclxuICAgIFxyXG4gICAgdmFyIG1pbkRpc3QgPSBJbmZpbml0eTtcclxuICAgIHZhciBpbnRlcnNlY3Rpb247XHJcbiAgICB2YXIgc2VncHRzV2l0aFRndFNyYyA9IFtzdGFydFgsIHN0YXJ0WV1cclxuICAgICAgICAgICAgLmNvbmNhdChzZWdQdHM/c2VnUHRzOltdKVxyXG4gICAgICAgICAgICAuY29uY2F0KFtlbmRYLCBlbmRZXSk7XHJcbiAgICB2YXIgbmV3QmVuZEluZGV4ID0gLTE7XHJcbiAgICBcclxuICAgIGZvcih2YXIgaSA9IDA7IGkgPCB3ZWlnaHRzV2l0aFRndFNyYy5sZW5ndGggLSAxOyBpKyspe1xyXG4gICAgICB2YXIgdzEgPSB3ZWlnaHRzV2l0aFRndFNyY1tpXTtcclxuICAgICAgdmFyIHcyID0gd2VpZ2h0c1dpdGhUZ3RTcmNbaSArIDFdO1xyXG4gICAgICBcclxuICAgICAgLy9jaGVjayBpZiB0aGUgd2VpZ2h0IGlzIGJldHdlZW4gdzEgYW5kIHcyXHJcbiAgICAgIGlmKChvcmlnaW5hbFBvaW50V2VpZ2h0IDw9IHcxICYmIG9yaWdpbmFsUG9pbnRXZWlnaHQgPj0gdzIpIHx8IChvcmlnaW5hbFBvaW50V2VpZ2h0IDw9IHcyICYmIG9yaWdpbmFsUG9pbnRXZWlnaHQgPj0gdzEpKXtcclxuICAgICAgICB2YXIgc3RhcnRYID0gc2VncHRzV2l0aFRndFNyY1syICogaV07XHJcbiAgICAgICAgdmFyIHN0YXJ0WSA9IHNlZ3B0c1dpdGhUZ3RTcmNbMiAqIGkgKyAxXTtcclxuICAgICAgICB2YXIgZW5kWCA9IHNlZ3B0c1dpdGhUZ3RTcmNbMiAqIGkgKyAyXTtcclxuICAgICAgICB2YXIgZW5kWSA9IHNlZ3B0c1dpdGhUZ3RTcmNbMiAqIGkgKyAzXTtcclxuICAgICAgICBcclxuICAgICAgICB2YXIgc3RhcnQgPSB7XHJcbiAgICAgICAgICB4OiBzdGFydFgsXHJcbiAgICAgICAgICB5OiBzdGFydFlcclxuICAgICAgICB9O1xyXG4gICAgICAgIFxyXG4gICAgICAgIHZhciBlbmQgPSB7XHJcbiAgICAgICAgICB4OiBlbmRYLFxyXG4gICAgICAgICAgeTogZW5kWVxyXG4gICAgICAgIH07XHJcbiAgICAgICAgXHJcbiAgICAgICAgdmFyIG0xID0gKCBzdGFydFkgLSBlbmRZICkgLyAoIHN0YXJ0WCAtIGVuZFggKTtcclxuICAgICAgICB2YXIgbTIgPSAtMSAvIG0xO1xyXG4gICAgICAgIFxyXG4gICAgICAgIHZhciBzcmNUZ3RQb2ludHNBbmRUYW5nZW50cyA9IHtcclxuICAgICAgICAgIHNyY1BvaW50OiBzdGFydCxcclxuICAgICAgICAgIHRndFBvaW50OiBlbmQsXHJcbiAgICAgICAgICBtMTogbTEsXHJcbiAgICAgICAgICBtMjogbTJcclxuICAgICAgICB9O1xyXG4gICAgICAgIFxyXG4gICAgICAgIC8vZ2V0IHRoZSBpbnRlcnNlY3Rpb24gb2YgdGhlIGN1cnJlbnQgc2VnbWVudCB3aXRoIHRoZSBuZXcgYmVuZCBwb2ludFxyXG4gICAgICAgIHZhciBjdXJyZW50SW50ZXJzZWN0aW9uID0gdGhpcy5nZXRJbnRlcnNlY3Rpb24oZWRnZSwgbmV3QmVuZFBvaW50LCBzcmNUZ3RQb2ludHNBbmRUYW5nZW50cyk7XHJcbiAgICAgICAgdmFyIGRpc3QgPSBNYXRoLnNxcnQoIE1hdGgucG93KCAobmV3QmVuZFBvaW50LnggLSBjdXJyZW50SW50ZXJzZWN0aW9uLngpLCAyICkgXHJcbiAgICAgICAgICAgICAgICArIE1hdGgucG93KCAobmV3QmVuZFBvaW50LnkgLSBjdXJyZW50SW50ZXJzZWN0aW9uLnkpLCAyICkpO1xyXG4gICAgICAgIFxyXG4gICAgICAgIC8vVXBkYXRlIHRoZSBtaW5pbXVtIGRpc3RhbmNlXHJcbiAgICAgICAgaWYoZGlzdCA8IG1pbkRpc3Qpe1xyXG4gICAgICAgICAgbWluRGlzdCA9IGRpc3Q7XHJcbiAgICAgICAgICBpbnRlcnNlY3Rpb24gPSBjdXJyZW50SW50ZXJzZWN0aW9uO1xyXG4gICAgICAgICAgbmV3QmVuZEluZGV4ID0gaTtcclxuICAgICAgICB9XHJcbiAgICAgIH1cclxuICAgIH1cclxuICAgIFxyXG4gICAgaWYoaW50ZXJzZWN0aW9uICE9PSB1bmRlZmluZWQpe1xyXG4gICAgICBuZXdCZW5kUG9pbnQgPSBpbnRlcnNlY3Rpb247XHJcbiAgICB9XHJcbiAgICBcclxuICAgIHJlbGF0aXZlQmVuZFBvc2l0aW9uID0gdGhpcy5jb252ZXJ0VG9SZWxhdGl2ZUJlbmRQb3NpdGlvbihlZGdlLCBuZXdCZW5kUG9pbnQpO1xyXG4gICAgXHJcbiAgICBpZihpbnRlcnNlY3Rpb24gPT09IHVuZGVmaW5lZCl7XHJcbiAgICAgIHJlbGF0aXZlQmVuZFBvc2l0aW9uLmRpc3RhbmNlID0gMDtcclxuICAgIH1cclxuXHJcbiAgICB2YXIgd2VpZ2h0cyA9IGVkZ2UuZGF0YSgnY3llZGdlYmVuZGVkaXRpbmdXZWlnaHRzJyk7XHJcbiAgICB2YXIgZGlzdGFuY2VzID0gZWRnZS5kYXRhKCdjeWVkZ2ViZW5kZWRpdGluZ0Rpc3RhbmNlcycpO1xyXG4gICAgXHJcbiAgICB3ZWlnaHRzID0gd2VpZ2h0cz93ZWlnaHRzOltdO1xyXG4gICAgZGlzdGFuY2VzID0gZGlzdGFuY2VzP2Rpc3RhbmNlczpbXTtcclxuICAgIFxyXG4gICAgaWYod2VpZ2h0cy5sZW5ndGggPT09IDApIHtcclxuICAgICAgbmV3QmVuZEluZGV4ID0gMDtcclxuICAgIH1cclxuICAgIFxyXG4vLyAgICB3ZWlnaHRzLnB1c2gocmVsYXRpdmVCZW5kUG9zaXRpb24ud2VpZ2h0KTtcclxuLy8gICAgZGlzdGFuY2VzLnB1c2gocmVsYXRpdmVCZW5kUG9zaXRpb24uZGlzdGFuY2UpO1xyXG4gICAgaWYobmV3QmVuZEluZGV4ICE9IC0xKXtcclxuICAgICAgd2VpZ2h0cy5zcGxpY2UobmV3QmVuZEluZGV4LCAwLCByZWxhdGl2ZUJlbmRQb3NpdGlvbi53ZWlnaHQpO1xyXG4gICAgICBkaXN0YW5jZXMuc3BsaWNlKG5ld0JlbmRJbmRleCwgMCwgcmVsYXRpdmVCZW5kUG9zaXRpb24uZGlzdGFuY2UpO1xyXG4gICAgfVxyXG4gICBcclxuICAgIGVkZ2UuZGF0YSgnY3llZGdlYmVuZGVkaXRpbmdXZWlnaHRzJywgd2VpZ2h0cyk7XHJcbiAgICBlZGdlLmRhdGEoJ2N5ZWRnZWJlbmRlZGl0aW5nRGlzdGFuY2VzJywgZGlzdGFuY2VzKTtcclxuICAgIFxyXG4gICAgZWRnZS5hZGRDbGFzcygnZWRnZWJlbmRlZGl0aW5nLWhhc2JlbmRwb2ludHMnKTtcclxuICAgIFxyXG4gICAgcmV0dXJuIHJlbGF0aXZlQmVuZFBvc2l0aW9uO1xyXG4gIH0sXHJcbiAgcmVtb3ZlQmVuZFBvaW50OiBmdW5jdGlvbihlZGdlLCBiZW5kUG9pbnRJbmRleCl7XHJcbiAgICBpZihlZGdlID09PSB1bmRlZmluZWQgfHwgYmVuZFBvaW50SW5kZXggPT09IHVuZGVmaW5lZCl7XHJcbiAgICAgIGVkZ2UgPSB0aGlzLmN1cnJlbnRDdHhFZGdlO1xyXG4gICAgICBiZW5kUG9pbnRJbmRleCA9IHRoaXMuY3VycmVudEJlbmRJbmRleDtcclxuICAgIH1cclxuICAgIFxyXG4gICAgdmFyIGRpc3RhbmNlcyA9IGVkZ2UuZGF0YSgnY3llZGdlYmVuZGVkaXRpbmdEaXN0YW5jZXMnKTtcclxuICAgIHZhciB3ZWlnaHRzID0gZWRnZS5kYXRhKCdjeWVkZ2ViZW5kZWRpdGluZ1dlaWdodHMnKTtcclxuICAgIFxyXG4gICAgZGlzdGFuY2VzLnNwbGljZShiZW5kUG9pbnRJbmRleCwgMSk7XHJcbiAgICB3ZWlnaHRzLnNwbGljZShiZW5kUG9pbnRJbmRleCwgMSk7XHJcbiAgICBcclxuICAgIFxyXG4gICAgaWYoZGlzdGFuY2VzLmxlbmd0aCA9PSAwIHx8IHdlaWdodHMubGVuZ3RoID09IDApe1xyXG4gICAgICBlZGdlLnJlbW92ZUNsYXNzKCdlZGdlYmVuZGVkaXRpbmctaGFzYmVuZHBvaW50cycpO1xyXG4gICAgICAgIGVkZ2UuZGF0YSgnY3llZGdlYmVuZGVkaXRpbmdEaXN0YW5jZXMnLCBbXSk7XHJcbiAgICAgICAgZWRnZS5kYXRhKCdjeWVkZ2ViZW5kZWRpdGluZ1dlaWdodHMnLCBbXSk7XHJcbiAgICB9XHJcbiAgICBlbHNlIHtcclxuICAgICAgZWRnZS5kYXRhKCdjeWVkZ2ViZW5kZWRpdGluZ0Rpc3RhbmNlcycsIGRpc3RhbmNlcyk7XHJcbiAgICAgIGVkZ2UuZGF0YSgnY3llZGdlYmVuZGVkaXRpbmdXZWlnaHRzJywgd2VpZ2h0cyk7XHJcbiAgICB9XHJcbiAgfSxcclxuICBjYWxjdWxhdGVEaXN0YW5jZTogZnVuY3Rpb24ocHQxLCBwdDIpIHtcclxuICAgIHZhciBkaWZmWCA9IHB0MS54IC0gcHQyLng7XHJcbiAgICB2YXIgZGlmZlkgPSBwdDEueSAtIHB0Mi55O1xyXG4gICAgXHJcbiAgICB2YXIgZGlzdCA9IE1hdGguc3FydCggTWF0aC5wb3coIGRpZmZYLCAyICkgKyBNYXRoLnBvdyggZGlmZlksIDIgKSApO1xyXG4gICAgcmV0dXJuIGRpc3Q7XHJcbiAgfVxyXG59O1xyXG5cclxubW9kdWxlLmV4cG9ydHMgPSBiZW5kUG9pbnRVdGlsaXRpZXM7XHJcbiIsInZhciBkZWJvdW5jZSA9IChmdW5jdGlvbiAoKSB7XHJcbiAgLyoqXHJcbiAgICogbG9kYXNoIDMuMS4xIChDdXN0b20gQnVpbGQpIDxodHRwczovL2xvZGFzaC5jb20vPlxyXG4gICAqIEJ1aWxkOiBgbG9kYXNoIG1vZGVybiBtb2R1bGFyaXplIGV4cG9ydHM9XCJucG1cIiAtbyAuL2BcclxuICAgKiBDb3B5cmlnaHQgMjAxMi0yMDE1IFRoZSBEb2pvIEZvdW5kYXRpb24gPGh0dHA6Ly9kb2pvZm91bmRhdGlvbi5vcmcvPlxyXG4gICAqIEJhc2VkIG9uIFVuZGVyc2NvcmUuanMgMS44LjMgPGh0dHA6Ly91bmRlcnNjb3JlanMub3JnL0xJQ0VOU0U+XHJcbiAgICogQ29weXJpZ2h0IDIwMDktMjAxNSBKZXJlbXkgQXNoa2VuYXMsIERvY3VtZW50Q2xvdWQgYW5kIEludmVzdGlnYXRpdmUgUmVwb3J0ZXJzICYgRWRpdG9yc1xyXG4gICAqIEF2YWlsYWJsZSB1bmRlciBNSVQgbGljZW5zZSA8aHR0cHM6Ly9sb2Rhc2guY29tL2xpY2Vuc2U+XHJcbiAgICovXHJcbiAgLyoqIFVzZWQgYXMgdGhlIGBUeXBlRXJyb3JgIG1lc3NhZ2UgZm9yIFwiRnVuY3Rpb25zXCIgbWV0aG9kcy4gKi9cclxuICB2YXIgRlVOQ19FUlJPUl9URVhUID0gJ0V4cGVjdGVkIGEgZnVuY3Rpb24nO1xyXG5cclxuICAvKiBOYXRpdmUgbWV0aG9kIHJlZmVyZW5jZXMgZm9yIHRob3NlIHdpdGggdGhlIHNhbWUgbmFtZSBhcyBvdGhlciBgbG9kYXNoYCBtZXRob2RzLiAqL1xyXG4gIHZhciBuYXRpdmVNYXggPSBNYXRoLm1heCxcclxuICAgICAgICAgIG5hdGl2ZU5vdyA9IERhdGUubm93O1xyXG5cclxuICAvKipcclxuICAgKiBHZXRzIHRoZSBudW1iZXIgb2YgbWlsbGlzZWNvbmRzIHRoYXQgaGF2ZSBlbGFwc2VkIHNpbmNlIHRoZSBVbml4IGVwb2NoXHJcbiAgICogKDEgSmFudWFyeSAxOTcwIDAwOjAwOjAwIFVUQykuXHJcbiAgICpcclxuICAgKiBAc3RhdGljXHJcbiAgICogQG1lbWJlck9mIF9cclxuICAgKiBAY2F0ZWdvcnkgRGF0ZVxyXG4gICAqIEBleGFtcGxlXHJcbiAgICpcclxuICAgKiBfLmRlZmVyKGZ1bmN0aW9uKHN0YW1wKSB7XHJcbiAgICogICBjb25zb2xlLmxvZyhfLm5vdygpIC0gc3RhbXApO1xyXG4gICAqIH0sIF8ubm93KCkpO1xyXG4gICAqIC8vID0+IGxvZ3MgdGhlIG51bWJlciBvZiBtaWxsaXNlY29uZHMgaXQgdG9vayBmb3IgdGhlIGRlZmVycmVkIGZ1bmN0aW9uIHRvIGJlIGludm9rZWRcclxuICAgKi9cclxuICB2YXIgbm93ID0gbmF0aXZlTm93IHx8IGZ1bmN0aW9uICgpIHtcclxuICAgIHJldHVybiBuZXcgRGF0ZSgpLmdldFRpbWUoKTtcclxuICB9O1xyXG5cclxuICAvKipcclxuICAgKiBDcmVhdGVzIGEgZGVib3VuY2VkIGZ1bmN0aW9uIHRoYXQgZGVsYXlzIGludm9raW5nIGBmdW5jYCB1bnRpbCBhZnRlciBgd2FpdGBcclxuICAgKiBtaWxsaXNlY29uZHMgaGF2ZSBlbGFwc2VkIHNpbmNlIHRoZSBsYXN0IHRpbWUgdGhlIGRlYm91bmNlZCBmdW5jdGlvbiB3YXNcclxuICAgKiBpbnZva2VkLiBUaGUgZGVib3VuY2VkIGZ1bmN0aW9uIGNvbWVzIHdpdGggYSBgY2FuY2VsYCBtZXRob2QgdG8gY2FuY2VsXHJcbiAgICogZGVsYXllZCBpbnZvY2F0aW9ucy4gUHJvdmlkZSBhbiBvcHRpb25zIG9iamVjdCB0byBpbmRpY2F0ZSB0aGF0IGBmdW5jYFxyXG4gICAqIHNob3VsZCBiZSBpbnZva2VkIG9uIHRoZSBsZWFkaW5nIGFuZC9vciB0cmFpbGluZyBlZGdlIG9mIHRoZSBgd2FpdGAgdGltZW91dC5cclxuICAgKiBTdWJzZXF1ZW50IGNhbGxzIHRvIHRoZSBkZWJvdW5jZWQgZnVuY3Rpb24gcmV0dXJuIHRoZSByZXN1bHQgb2YgdGhlIGxhc3RcclxuICAgKiBgZnVuY2AgaW52b2NhdGlvbi5cclxuICAgKlxyXG4gICAqICoqTm90ZToqKiBJZiBgbGVhZGluZ2AgYW5kIGB0cmFpbGluZ2Agb3B0aW9ucyBhcmUgYHRydWVgLCBgZnVuY2AgaXMgaW52b2tlZFxyXG4gICAqIG9uIHRoZSB0cmFpbGluZyBlZGdlIG9mIHRoZSB0aW1lb3V0IG9ubHkgaWYgdGhlIHRoZSBkZWJvdW5jZWQgZnVuY3Rpb24gaXNcclxuICAgKiBpbnZva2VkIG1vcmUgdGhhbiBvbmNlIGR1cmluZyB0aGUgYHdhaXRgIHRpbWVvdXQuXHJcbiAgICpcclxuICAgKiBTZWUgW0RhdmlkIENvcmJhY2hvJ3MgYXJ0aWNsZV0oaHR0cDovL2RydXBhbG1vdGlvbi5jb20vYXJ0aWNsZS9kZWJvdW5jZS1hbmQtdGhyb3R0bGUtdmlzdWFsLWV4cGxhbmF0aW9uKVxyXG4gICAqIGZvciBkZXRhaWxzIG92ZXIgdGhlIGRpZmZlcmVuY2VzIGJldHdlZW4gYF8uZGVib3VuY2VgIGFuZCBgXy50aHJvdHRsZWAuXHJcbiAgICpcclxuICAgKiBAc3RhdGljXHJcbiAgICogQG1lbWJlck9mIF9cclxuICAgKiBAY2F0ZWdvcnkgRnVuY3Rpb25cclxuICAgKiBAcGFyYW0ge0Z1bmN0aW9ufSBmdW5jIFRoZSBmdW5jdGlvbiB0byBkZWJvdW5jZS5cclxuICAgKiBAcGFyYW0ge251bWJlcn0gW3dhaXQ9MF0gVGhlIG51bWJlciBvZiBtaWxsaXNlY29uZHMgdG8gZGVsYXkuXHJcbiAgICogQHBhcmFtIHtPYmplY3R9IFtvcHRpb25zXSBUaGUgb3B0aW9ucyBvYmplY3QuXHJcbiAgICogQHBhcmFtIHtib29sZWFufSBbb3B0aW9ucy5sZWFkaW5nPWZhbHNlXSBTcGVjaWZ5IGludm9raW5nIG9uIHRoZSBsZWFkaW5nXHJcbiAgICogIGVkZ2Ugb2YgdGhlIHRpbWVvdXQuXHJcbiAgICogQHBhcmFtIHtudW1iZXJ9IFtvcHRpb25zLm1heFdhaXRdIFRoZSBtYXhpbXVtIHRpbWUgYGZ1bmNgIGlzIGFsbG93ZWQgdG8gYmVcclxuICAgKiAgZGVsYXllZCBiZWZvcmUgaXQncyBpbnZva2VkLlxyXG4gICAqIEBwYXJhbSB7Ym9vbGVhbn0gW29wdGlvbnMudHJhaWxpbmc9dHJ1ZV0gU3BlY2lmeSBpbnZva2luZyBvbiB0aGUgdHJhaWxpbmdcclxuICAgKiAgZWRnZSBvZiB0aGUgdGltZW91dC5cclxuICAgKiBAcmV0dXJucyB7RnVuY3Rpb259IFJldHVybnMgdGhlIG5ldyBkZWJvdW5jZWQgZnVuY3Rpb24uXHJcbiAgICogQGV4YW1wbGVcclxuICAgKlxyXG4gICAqIC8vIGF2b2lkIGNvc3RseSBjYWxjdWxhdGlvbnMgd2hpbGUgdGhlIHdpbmRvdyBzaXplIGlzIGluIGZsdXhcclxuICAgKiBqUXVlcnkod2luZG93KS5vbigncmVzaXplJywgXy5kZWJvdW5jZShjYWxjdWxhdGVMYXlvdXQsIDE1MCkpO1xyXG4gICAqXHJcbiAgICogLy8gaW52b2tlIGBzZW5kTWFpbGAgd2hlbiB0aGUgY2xpY2sgZXZlbnQgaXMgZmlyZWQsIGRlYm91bmNpbmcgc3Vic2VxdWVudCBjYWxsc1xyXG4gICAqIGpRdWVyeSgnI3Bvc3Rib3gnKS5vbignY2xpY2snLCBfLmRlYm91bmNlKHNlbmRNYWlsLCAzMDAsIHtcclxuICAgKiAgICdsZWFkaW5nJzogdHJ1ZSxcclxuICAgKiAgICd0cmFpbGluZyc6IGZhbHNlXHJcbiAgICogfSkpO1xyXG4gICAqXHJcbiAgICogLy8gZW5zdXJlIGBiYXRjaExvZ2AgaXMgaW52b2tlZCBvbmNlIGFmdGVyIDEgc2Vjb25kIG9mIGRlYm91bmNlZCBjYWxsc1xyXG4gICAqIHZhciBzb3VyY2UgPSBuZXcgRXZlbnRTb3VyY2UoJy9zdHJlYW0nKTtcclxuICAgKiBqUXVlcnkoc291cmNlKS5vbignbWVzc2FnZScsIF8uZGVib3VuY2UoYmF0Y2hMb2csIDI1MCwge1xyXG4gICAqICAgJ21heFdhaXQnOiAxMDAwXHJcbiAgICogfSkpO1xyXG4gICAqXHJcbiAgICogLy8gY2FuY2VsIGEgZGVib3VuY2VkIGNhbGxcclxuICAgKiB2YXIgdG9kb0NoYW5nZXMgPSBfLmRlYm91bmNlKGJhdGNoTG9nLCAxMDAwKTtcclxuICAgKiBPYmplY3Qub2JzZXJ2ZShtb2RlbHMudG9kbywgdG9kb0NoYW5nZXMpO1xyXG4gICAqXHJcbiAgICogT2JqZWN0Lm9ic2VydmUobW9kZWxzLCBmdW5jdGlvbihjaGFuZ2VzKSB7XHJcbiAgICogICBpZiAoXy5maW5kKGNoYW5nZXMsIHsgJ3VzZXInOiAndG9kbycsICd0eXBlJzogJ2RlbGV0ZSd9KSkge1xyXG4gICAqICAgICB0b2RvQ2hhbmdlcy5jYW5jZWwoKTtcclxuICAgKiAgIH1cclxuICAgKiB9LCBbJ2RlbGV0ZSddKTtcclxuICAgKlxyXG4gICAqIC8vIC4uLmF0IHNvbWUgcG9pbnQgYG1vZGVscy50b2RvYCBpcyBjaGFuZ2VkXHJcbiAgICogbW9kZWxzLnRvZG8uY29tcGxldGVkID0gdHJ1ZTtcclxuICAgKlxyXG4gICAqIC8vIC4uLmJlZm9yZSAxIHNlY29uZCBoYXMgcGFzc2VkIGBtb2RlbHMudG9kb2AgaXMgZGVsZXRlZFxyXG4gICAqIC8vIHdoaWNoIGNhbmNlbHMgdGhlIGRlYm91bmNlZCBgdG9kb0NoYW5nZXNgIGNhbGxcclxuICAgKiBkZWxldGUgbW9kZWxzLnRvZG87XHJcbiAgICovXHJcbiAgZnVuY3Rpb24gZGVib3VuY2UoZnVuYywgd2FpdCwgb3B0aW9ucykge1xyXG4gICAgdmFyIGFyZ3MsXHJcbiAgICAgICAgICAgIG1heFRpbWVvdXRJZCxcclxuICAgICAgICAgICAgcmVzdWx0LFxyXG4gICAgICAgICAgICBzdGFtcCxcclxuICAgICAgICAgICAgdGhpc0FyZyxcclxuICAgICAgICAgICAgdGltZW91dElkLFxyXG4gICAgICAgICAgICB0cmFpbGluZ0NhbGwsXHJcbiAgICAgICAgICAgIGxhc3RDYWxsZWQgPSAwLFxyXG4gICAgICAgICAgICBtYXhXYWl0ID0gZmFsc2UsXHJcbiAgICAgICAgICAgIHRyYWlsaW5nID0gdHJ1ZTtcclxuXHJcbiAgICBpZiAodHlwZW9mIGZ1bmMgIT0gJ2Z1bmN0aW9uJykge1xyXG4gICAgICB0aHJvdyBuZXcgVHlwZUVycm9yKEZVTkNfRVJST1JfVEVYVCk7XHJcbiAgICB9XHJcbiAgICB3YWl0ID0gd2FpdCA8IDAgPyAwIDogKCt3YWl0IHx8IDApO1xyXG4gICAgaWYgKG9wdGlvbnMgPT09IHRydWUpIHtcclxuICAgICAgdmFyIGxlYWRpbmcgPSB0cnVlO1xyXG4gICAgICB0cmFpbGluZyA9IGZhbHNlO1xyXG4gICAgfSBlbHNlIGlmIChpc09iamVjdChvcHRpb25zKSkge1xyXG4gICAgICBsZWFkaW5nID0gISFvcHRpb25zLmxlYWRpbmc7XHJcbiAgICAgIG1heFdhaXQgPSAnbWF4V2FpdCcgaW4gb3B0aW9ucyAmJiBuYXRpdmVNYXgoK29wdGlvbnMubWF4V2FpdCB8fCAwLCB3YWl0KTtcclxuICAgICAgdHJhaWxpbmcgPSAndHJhaWxpbmcnIGluIG9wdGlvbnMgPyAhIW9wdGlvbnMudHJhaWxpbmcgOiB0cmFpbGluZztcclxuICAgIH1cclxuXHJcbiAgICBmdW5jdGlvbiBjYW5jZWwoKSB7XHJcbiAgICAgIGlmICh0aW1lb3V0SWQpIHtcclxuICAgICAgICBjbGVhclRpbWVvdXQodGltZW91dElkKTtcclxuICAgICAgfVxyXG4gICAgICBpZiAobWF4VGltZW91dElkKSB7XHJcbiAgICAgICAgY2xlYXJUaW1lb3V0KG1heFRpbWVvdXRJZCk7XHJcbiAgICAgIH1cclxuICAgICAgbGFzdENhbGxlZCA9IDA7XHJcbiAgICAgIG1heFRpbWVvdXRJZCA9IHRpbWVvdXRJZCA9IHRyYWlsaW5nQ2FsbCA9IHVuZGVmaW5lZDtcclxuICAgIH1cclxuXHJcbiAgICBmdW5jdGlvbiBjb21wbGV0ZShpc0NhbGxlZCwgaWQpIHtcclxuICAgICAgaWYgKGlkKSB7XHJcbiAgICAgICAgY2xlYXJUaW1lb3V0KGlkKTtcclxuICAgICAgfVxyXG4gICAgICBtYXhUaW1lb3V0SWQgPSB0aW1lb3V0SWQgPSB0cmFpbGluZ0NhbGwgPSB1bmRlZmluZWQ7XHJcbiAgICAgIGlmIChpc0NhbGxlZCkge1xyXG4gICAgICAgIGxhc3RDYWxsZWQgPSBub3coKTtcclxuICAgICAgICByZXN1bHQgPSBmdW5jLmFwcGx5KHRoaXNBcmcsIGFyZ3MpO1xyXG4gICAgICAgIGlmICghdGltZW91dElkICYmICFtYXhUaW1lb3V0SWQpIHtcclxuICAgICAgICAgIGFyZ3MgPSB0aGlzQXJnID0gdW5kZWZpbmVkO1xyXG4gICAgICAgIH1cclxuICAgICAgfVxyXG4gICAgfVxyXG5cclxuICAgIGZ1bmN0aW9uIGRlbGF5ZWQoKSB7XHJcbiAgICAgIHZhciByZW1haW5pbmcgPSB3YWl0IC0gKG5vdygpIC0gc3RhbXApO1xyXG4gICAgICBpZiAocmVtYWluaW5nIDw9IDAgfHwgcmVtYWluaW5nID4gd2FpdCkge1xyXG4gICAgICAgIGNvbXBsZXRlKHRyYWlsaW5nQ2FsbCwgbWF4VGltZW91dElkKTtcclxuICAgICAgfSBlbHNlIHtcclxuICAgICAgICB0aW1lb3V0SWQgPSBzZXRUaW1lb3V0KGRlbGF5ZWQsIHJlbWFpbmluZyk7XHJcbiAgICAgIH1cclxuICAgIH1cclxuXHJcbiAgICBmdW5jdGlvbiBtYXhEZWxheWVkKCkge1xyXG4gICAgICBjb21wbGV0ZSh0cmFpbGluZywgdGltZW91dElkKTtcclxuICAgIH1cclxuXHJcbiAgICBmdW5jdGlvbiBkZWJvdW5jZWQoKSB7XHJcbiAgICAgIGFyZ3MgPSBhcmd1bWVudHM7XHJcbiAgICAgIHN0YW1wID0gbm93KCk7XHJcbiAgICAgIHRoaXNBcmcgPSB0aGlzO1xyXG4gICAgICB0cmFpbGluZ0NhbGwgPSB0cmFpbGluZyAmJiAodGltZW91dElkIHx8ICFsZWFkaW5nKTtcclxuXHJcbiAgICAgIGlmIChtYXhXYWl0ID09PSBmYWxzZSkge1xyXG4gICAgICAgIHZhciBsZWFkaW5nQ2FsbCA9IGxlYWRpbmcgJiYgIXRpbWVvdXRJZDtcclxuICAgICAgfSBlbHNlIHtcclxuICAgICAgICBpZiAoIW1heFRpbWVvdXRJZCAmJiAhbGVhZGluZykge1xyXG4gICAgICAgICAgbGFzdENhbGxlZCA9IHN0YW1wO1xyXG4gICAgICAgIH1cclxuICAgICAgICB2YXIgcmVtYWluaW5nID0gbWF4V2FpdCAtIChzdGFtcCAtIGxhc3RDYWxsZWQpLFxyXG4gICAgICAgICAgICAgICAgaXNDYWxsZWQgPSByZW1haW5pbmcgPD0gMCB8fCByZW1haW5pbmcgPiBtYXhXYWl0O1xyXG5cclxuICAgICAgICBpZiAoaXNDYWxsZWQpIHtcclxuICAgICAgICAgIGlmIChtYXhUaW1lb3V0SWQpIHtcclxuICAgICAgICAgICAgbWF4VGltZW91dElkID0gY2xlYXJUaW1lb3V0KG1heFRpbWVvdXRJZCk7XHJcbiAgICAgICAgICB9XHJcbiAgICAgICAgICBsYXN0Q2FsbGVkID0gc3RhbXA7XHJcbiAgICAgICAgICByZXN1bHQgPSBmdW5jLmFwcGx5KHRoaXNBcmcsIGFyZ3MpO1xyXG4gICAgICAgIH1cclxuICAgICAgICBlbHNlIGlmICghbWF4VGltZW91dElkKSB7XHJcbiAgICAgICAgICBtYXhUaW1lb3V0SWQgPSBzZXRUaW1lb3V0KG1heERlbGF5ZWQsIHJlbWFpbmluZyk7XHJcbiAgICAgICAgfVxyXG4gICAgICB9XHJcbiAgICAgIGlmIChpc0NhbGxlZCAmJiB0aW1lb3V0SWQpIHtcclxuICAgICAgICB0aW1lb3V0SWQgPSBjbGVhclRpbWVvdXQodGltZW91dElkKTtcclxuICAgICAgfVxyXG4gICAgICBlbHNlIGlmICghdGltZW91dElkICYmIHdhaXQgIT09IG1heFdhaXQpIHtcclxuICAgICAgICB0aW1lb3V0SWQgPSBzZXRUaW1lb3V0KGRlbGF5ZWQsIHdhaXQpO1xyXG4gICAgICB9XHJcbiAgICAgIGlmIChsZWFkaW5nQ2FsbCkge1xyXG4gICAgICAgIGlzQ2FsbGVkID0gdHJ1ZTtcclxuICAgICAgICByZXN1bHQgPSBmdW5jLmFwcGx5KHRoaXNBcmcsIGFyZ3MpO1xyXG4gICAgICB9XHJcbiAgICAgIGlmIChpc0NhbGxlZCAmJiAhdGltZW91dElkICYmICFtYXhUaW1lb3V0SWQpIHtcclxuICAgICAgICBhcmdzID0gdGhpc0FyZyA9IHVuZGVmaW5lZDtcclxuICAgICAgfVxyXG4gICAgICByZXR1cm4gcmVzdWx0O1xyXG4gICAgfVxyXG5cclxuICAgIGRlYm91bmNlZC5jYW5jZWwgPSBjYW5jZWw7XHJcbiAgICByZXR1cm4gZGVib3VuY2VkO1xyXG4gIH1cclxuXHJcbiAgLyoqXHJcbiAgICogQ2hlY2tzIGlmIGB2YWx1ZWAgaXMgdGhlIFtsYW5ndWFnZSB0eXBlXShodHRwczovL2VzNS5naXRodWIuaW8vI3g4KSBvZiBgT2JqZWN0YC5cclxuICAgKiAoZS5nLiBhcnJheXMsIGZ1bmN0aW9ucywgb2JqZWN0cywgcmVnZXhlcywgYG5ldyBOdW1iZXIoMClgLCBhbmQgYG5ldyBTdHJpbmcoJycpYClcclxuICAgKlxyXG4gICAqIEBzdGF0aWNcclxuICAgKiBAbWVtYmVyT2YgX1xyXG4gICAqIEBjYXRlZ29yeSBMYW5nXHJcbiAgICogQHBhcmFtIHsqfSB2YWx1ZSBUaGUgdmFsdWUgdG8gY2hlY2suXHJcbiAgICogQHJldHVybnMge2Jvb2xlYW59IFJldHVybnMgYHRydWVgIGlmIGB2YWx1ZWAgaXMgYW4gb2JqZWN0LCBlbHNlIGBmYWxzZWAuXHJcbiAgICogQGV4YW1wbGVcclxuICAgKlxyXG4gICAqIF8uaXNPYmplY3Qoe30pO1xyXG4gICAqIC8vID0+IHRydWVcclxuICAgKlxyXG4gICAqIF8uaXNPYmplY3QoWzEsIDIsIDNdKTtcclxuICAgKiAvLyA9PiB0cnVlXHJcbiAgICpcclxuICAgKiBfLmlzT2JqZWN0KDEpO1xyXG4gICAqIC8vID0+IGZhbHNlXHJcbiAgICovXHJcbiAgZnVuY3Rpb24gaXNPYmplY3QodmFsdWUpIHtcclxuICAgIC8vIEF2b2lkIGEgVjggSklUIGJ1ZyBpbiBDaHJvbWUgMTktMjAuXHJcbiAgICAvLyBTZWUgaHR0cHM6Ly9jb2RlLmdvb2dsZS5jb20vcC92OC9pc3N1ZXMvZGV0YWlsP2lkPTIyOTEgZm9yIG1vcmUgZGV0YWlscy5cclxuICAgIHZhciB0eXBlID0gdHlwZW9mIHZhbHVlO1xyXG4gICAgcmV0dXJuICEhdmFsdWUgJiYgKHR5cGUgPT0gJ29iamVjdCcgfHwgdHlwZSA9PSAnZnVuY3Rpb24nKTtcclxuICB9XHJcblxyXG4gIHJldHVybiBkZWJvdW5jZTtcclxuXHJcbn0pKCk7XHJcblxyXG5tb2R1bGUuZXhwb3J0cyA9IGRlYm91bmNlOyIsIjsoZnVuY3Rpb24oKXsgJ3VzZSBzdHJpY3QnO1xyXG4gIFxyXG4gIHZhciBiZW5kUG9pbnRVdGlsaXRpZXMgPSByZXF1aXJlKCcuL2JlbmRQb2ludFV0aWxpdGllcycpO1xyXG4gIHZhciBkZWJvdW5jZSA9IHJlcXVpcmUoXCIuL2RlYm91bmNlXCIpO1xyXG4gIFxyXG4gIC8vIHJlZ2lzdGVycyB0aGUgZXh0ZW5zaW9uIG9uIGEgY3l0b3NjYXBlIGxpYiByZWZcclxuICB2YXIgcmVnaXN0ZXIgPSBmdW5jdGlvbiggY3l0b3NjYXBlLCAkICl7XHJcbiAgICB2YXIgdWlVdGlsaXRpZXMgPSByZXF1aXJlKCcuL1VJVXRpbGl0aWVzJyk7XHJcbiAgICBcclxuICAgIGlmKCAhY3l0b3NjYXBlICl7IHJldHVybjsgfSAvLyBjYW4ndCByZWdpc3RlciBpZiBjeXRvc2NhcGUgdW5zcGVjaWZpZWRcclxuXHJcbiAgICB2YXIgZGVmYXVsdHMgPSB7XHJcbiAgICAgIC8vIHRoaXMgZnVuY3Rpb24gc3BlY2lmaWVzIHRoZSBwb2l0aW9ucyBvZiBiZW5kIHBvaW50c1xyXG4gICAgICBiZW5kUG9zaXRpb25zRnVuY3Rpb246IGZ1bmN0aW9uKGVsZSkge1xyXG4gICAgICAgIHJldHVybiBlbGUuZGF0YSgnYmVuZFBvaW50UG9zaXRpb25zJyk7XHJcbiAgICAgIH0sXHJcbiAgICAgIC8vIHdoZXRoZXIgdG8gaW5pdGlsaXplIGJlbmQgcG9pbnRzIG9uIGNyZWF0aW9uIG9mIHRoaXMgZXh0ZW5zaW9uIGF1dG9tYXRpY2FsbHlcclxuICAgICAgaW5pdEJlbmRQb2ludHNBdXRvbWF0aWNhbGx5OiB0cnVlLFxyXG4gICAgICAvLyB0aGUgY2xhc3NlcyBvZiB0aG9zZSBlZGdlcyB0aGF0IHNob3VsZCBiZSBpZ25vcmVkXHJcbiAgICAgIGlnbm9yZWRDbGFzc2VzOiBbXSxcclxuICAgICAgLy8gd2hldGhlciB0aGUgYmVuZCBlZGl0aW5nIG9wZXJhdGlvbnMgYXJlIHVuZG9hYmxlIChyZXF1aXJlcyBjeXRvc2NhcGUtdW5kby1yZWRvLmpzKVxyXG4gICAgICB1bmRvYWJsZTogZmFsc2UsXHJcbiAgICAgIC8vIHRoZSBzaXplIG9mIGJlbmQgc2hhcGUgaXMgb2J0YWluZWQgYnkgbXVsdGlwbGluZyB3aWR0aCBvZiBlZGdlIHdpdGggdGhpcyBwYXJhbWV0ZXJcclxuICAgICAgYmVuZFNoYXBlU2l6ZUZhY3RvcjogMyxcclxuICAgICAgLy8gd2hldGhlciB0byBzdGFydCB0aGUgcGx1Z2luIGluIHRoZSBlbmFibGVkIHN0YXRlXHJcbiAgICAgIGVuYWJsZWQ6IHRydWUsXHJcbiAgICAgIC8vIHRpdGxlIG9mIGFkZCBiZW5kIHBvaW50IG1lbnUgaXRlbSAoVXNlciBtYXkgbmVlZCB0byBhZGp1c3Qgd2lkdGggb2YgbWVudSBpdGVtcyBhY2NvcmRpbmcgdG8gbGVuZ3RoIG9mIHRoaXMgb3B0aW9uKVxyXG4gICAgICBhZGRCZW5kTWVudUl0ZW1UaXRsZTogXCJBZGQgQmVuZCBQb2ludFwiLFxyXG4gICAgICAvLyB0aXRsZSBvZiByZW1vdmUgYmVuZCBwb2ludCBtZW51IGl0ZW0gKFVzZXIgbWF5IG5lZWQgdG8gYWRqdXN0IHdpZHRoIG9mIG1lbnUgaXRlbXMgYWNjb3JkaW5nIHRvIGxlbmd0aCBvZiB0aGlzIG9wdGlvbilcclxuICAgICAgcmVtb3ZlQmVuZE1lbnVJdGVtVGl0bGU6IFwiUmVtb3ZlIEJlbmQgUG9pbnRcIixcclxuICAgICAgLy8gd2hldGhlciB0aGUgYmVuZCBwb2ludCBjYW4gYmUgbW92ZWQgYnkgYXJyb3dzXHJcbiAgICAgIG1vdmVTZWxlY3RlZEJlbmRQb2ludHNPbktleUV2ZW50czogZnVuY3Rpb24gKCkge1xyXG4gICAgICAgICAgcmV0dXJuIHRydWU7XHJcbiAgICAgIH1cclxuICAgIH07XHJcbiAgICBcclxuICAgIHZhciBvcHRpb25zO1xyXG4gICAgdmFyIGluaXRpYWxpemVkID0gZmFsc2U7XHJcbiAgICBcclxuICAgIC8vIE1lcmdlIGRlZmF1bHQgb3B0aW9ucyB3aXRoIHRoZSBvbmVzIGNvbWluZyBmcm9tIHBhcmFtZXRlclxyXG4gICAgZnVuY3Rpb24gZXh0ZW5kKGRlZmF1bHRzLCBvcHRpb25zKSB7XHJcbiAgICAgIHZhciBvYmogPSB7fTtcclxuXHJcbiAgICAgIGZvciAodmFyIGkgaW4gZGVmYXVsdHMpIHtcclxuICAgICAgICBvYmpbaV0gPSBkZWZhdWx0c1tpXTtcclxuICAgICAgfVxyXG5cclxuICAgICAgZm9yICh2YXIgaSBpbiBvcHRpb25zKSB7XHJcbiAgICAgICAgb2JqW2ldID0gb3B0aW9uc1tpXTtcclxuICAgICAgfVxyXG5cclxuICAgICAgcmV0dXJuIG9iajtcclxuICAgIH07XHJcbiAgICBcclxuICAgIGN5dG9zY2FwZSggJ2NvcmUnLCAnZWRnZUJlbmRFZGl0aW5nJywgZnVuY3Rpb24ob3B0cyl7XHJcbiAgICAgIHZhciBjeSA9IHRoaXM7XHJcbiAgICAgIFxyXG4gICAgICBpZiggb3B0cyA9PT0gJ2luaXRpYWxpemVkJyApIHtcclxuICAgICAgICByZXR1cm4gaW5pdGlhbGl6ZWQ7XHJcbiAgICAgIH1cclxuICAgICAgXHJcbiAgICAgIGlmKCBvcHRzICE9PSAnZ2V0JyApIHtcclxuICAgICAgICAvLyBtZXJnZSB0aGUgb3B0aW9ucyB3aXRoIGRlZmF1bHQgb25lc1xyXG4gICAgICAgIG9wdGlvbnMgPSBleHRlbmQoZGVmYXVsdHMsIG9wdHMpO1xyXG4gICAgICAgIGluaXRpYWxpemVkID0gdHJ1ZTtcclxuXHJcbiAgICAgICAgLy8gZGVmaW5lIGVkZ2ViZW5kZWRpdGluZy1oYXNiZW5kcG9pbnRzIGNzcyBjbGFzc1xyXG4gICAgICAgIGN5LnN0eWxlKCkuc2VsZWN0b3IoJy5lZGdlYmVuZGVkaXRpbmctaGFzYmVuZHBvaW50cycpLmNzcyh7XHJcbiAgICAgICAgICAnY3VydmUtc3R5bGUnOiAnc2VnbWVudHMnLFxyXG4gICAgICAgICAgJ3NlZ21lbnQtZGlzdGFuY2VzJzogZnVuY3Rpb24gKGVsZSkge1xyXG4gICAgICAgICAgICByZXR1cm4gYmVuZFBvaW50VXRpbGl0aWVzLmdldFNlZ21lbnREaXN0YW5jZXNTdHJpbmcoZWxlKTtcclxuICAgICAgICAgIH0sXHJcbiAgICAgICAgICAnc2VnbWVudC13ZWlnaHRzJzogZnVuY3Rpb24gKGVsZSkge1xyXG4gICAgICAgICAgICByZXR1cm4gYmVuZFBvaW50VXRpbGl0aWVzLmdldFNlZ21lbnRXZWlnaHRzU3RyaW5nKGVsZSk7XHJcbiAgICAgICAgICB9LFxyXG4gICAgICAgICAgJ2VkZ2UtZGlzdGFuY2VzJzogJ25vZGUtcG9zaXRpb24nXHJcbiAgICAgICAgfSk7XHJcblxyXG4gICAgICAgIGJlbmRQb2ludFV0aWxpdGllcy5zZXRJZ25vcmVkQ2xhc3NlcyhvcHRpb25zLmlnbm9yZWRDbGFzc2VzKTtcclxuXHJcbiAgICAgICAgLy8gaW5pdCBiZW5kIHBvc2l0aW9ucyBjb25kaXRpb25hbGx5XHJcbiAgICAgICAgaWYgKG9wdGlvbnMuaW5pdEJlbmRQb2ludHNBdXRvbWF0aWNhbGx5KSB7XHJcbiAgICAgICAgICBiZW5kUG9pbnRVdGlsaXRpZXMuaW5pdEJlbmRQb2ludHMob3B0aW9ucy5iZW5kUG9zaXRpb25zRnVuY3Rpb24sIGN5LmVkZ2VzKCksIG9wdGlvbnMuaWdub3JlZENsYXNzZXMpO1xyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgaWYob3B0aW9ucy5lbmFibGVkKVxyXG4gICAgICAgICAgdWlVdGlsaXRpZXMob3B0aW9ucywgY3kpO1xyXG4gICAgICAgIGVsc2VcclxuICAgICAgICAgIHVpVXRpbGl0aWVzKFwidW5iaW5kXCIsIGN5KTtcclxuICAgICAgfVxyXG4gICAgICBcclxuICAgICAgdmFyIGluc3RhbmNlID0gaW5pdGlhbGl6ZWQgPyB7XHJcbiAgICAgICAgLypcclxuICAgICAgICAqIGdldCBzZWdtZW50IHBvaW50cyBvZiB0aGUgZ2l2ZW4gZWRnZSBpbiBhbiBhcnJheSBBLFxyXG4gICAgICAgICogQVsyICogaV0gaXMgdGhlIHggY29vcmRpbmF0ZSBhbmQgQVsyICogaSArIDFdIGlzIHRoZSB5IGNvb3JkaW5hdGVcclxuICAgICAgICAqIG9mIHRoZSBpdGggYmVuZCBwb2ludC4gKFJldHVybnMgdW5kZWZpbmVkIGlmIHRoZSBjdXJ2ZSBzdHlsZSBpcyBub3Qgc2VnbWVudHMpXHJcbiAgICAgICAgKi9cclxuICAgICAgICBnZXRTZWdtZW50UG9pbnRzOiBmdW5jdGlvbihlbGUpIHtcclxuICAgICAgICAgIHJldHVybiBiZW5kUG9pbnRVdGlsaXRpZXMuZ2V0U2VnbWVudFBvaW50cyhlbGUpO1xyXG4gICAgICAgIH0sXHJcbiAgICAgICAgLy8gSW5pdGlsaXplIGJlbmQgcG9pbnRzIGZvciB0aGUgZ2l2ZW4gZWRnZXMgdXNpbmcgJ29wdGlvbnMuYmVuZFBvc2l0aW9uc0Z1bmN0aW9uJ1xyXG4gICAgICAgIGluaXRCZW5kUG9pbnRzOiBmdW5jdGlvbihlbGVzKSB7XHJcbiAgICAgICAgICBiZW5kUG9pbnRVdGlsaXRpZXMuaW5pdEJlbmRQb2ludHMob3B0aW9ucy5iZW5kUG9zaXRpb25zRnVuY3Rpb24sIGVsZXMpO1xyXG4gICAgICAgIH0sXHJcbiAgICAgICAgZGVsZXRlU2VsZWN0ZWRCZW5kUG9pbnQ6IGZ1bmN0aW9uKGVsZSwgaW5kZXgpIHtcclxuICAgICAgICAgIGJlbmRQb2ludFV0aWxpdGllcy5yZW1vdmVCZW5kUG9pbnQoZWxlLGluZGV4KTtcclxuICAgICAgICB9XHJcbiAgICAgIH0gOiB1bmRlZmluZWQ7XHJcblxyXG4gICAgICByZXR1cm4gaW5zdGFuY2U7IC8vIGNoYWluYWJpbGl0eVxyXG4gICAgfSApO1xyXG5cclxuICB9O1xyXG5cclxuICBpZiggdHlwZW9mIG1vZHVsZSAhPT0gJ3VuZGVmaW5lZCcgJiYgbW9kdWxlLmV4cG9ydHMgKXsgLy8gZXhwb3NlIGFzIGEgY29tbW9uanMgbW9kdWxlXHJcbiAgICBtb2R1bGUuZXhwb3J0cyA9IHJlZ2lzdGVyO1xyXG4gIH1cclxuXHJcbiAgaWYoIHR5cGVvZiBkZWZpbmUgIT09ICd1bmRlZmluZWQnICYmIGRlZmluZS5hbWQgKXsgLy8gZXhwb3NlIGFzIGFuIGFtZC9yZXF1aXJlanMgbW9kdWxlXHJcbiAgICBkZWZpbmUoJ2N5dG9zY2FwZS1lZGdlLWJlbmQtZWRpdGluZycsIGZ1bmN0aW9uKCl7XHJcbiAgICAgIHJldHVybiByZWdpc3RlcjtcclxuICAgIH0pO1xyXG4gIH1cclxuXHJcbiAgaWYoIHR5cGVvZiBjeXRvc2NhcGUgIT09ICd1bmRlZmluZWQnICYmICQgKXsgLy8gZXhwb3NlIHRvIGdsb2JhbCBjeXRvc2NhcGUgKGkuZS4gd2luZG93LmN5dG9zY2FwZSlcclxuICAgIHJlZ2lzdGVyKCBjeXRvc2NhcGUsICQgKTtcclxuICB9XHJcblxyXG59KSgpO1xyXG4iLCJ2YXIgcmVjb25uZWN0aW9uVXRpbGl0aWVzID0ge1xyXG5cclxuICAgIC8vIGNyZWF0ZXMgYW5kIHJldHVybnMgYSBkdW1teSBub2RlIHdoaWNoIGlzIGNvbm5lY3RlZCB0byB0aGUgZGlzY29ubmVjdGVkIGVkZ2VcclxuICAgIGRpc2Nvbm5lY3RFZGdlOiBmdW5jdGlvbiAoZWRnZSwgY3ksIHBvc2l0aW9uLCBkaXNjb25uZWN0ZWRFbmQpIHtcclxuICAgICAgICBcclxuICAgICAgICB2YXIgZHVtbXlOb2RlID0ge1xyXG4gICAgICAgICAgICBkYXRhOiB7IFxyXG4gICAgICAgICAgICAgIGlkOiAnbnd0X3JlY29ubmVjdEVkZ2VfZHVtbXknLFxyXG4gICAgICAgICAgICAgIHBvcnRzOiBbXSxcclxuICAgICAgICAgICAgfSxcclxuICAgICAgICAgICAgc3R5bGU6IHtcclxuICAgICAgICAgICAgICB3aWR0aDogMSxcclxuICAgICAgICAgICAgICBoZWlnaHQ6IDEsXHJcbiAgICAgICAgICAgICAgJ3Zpc2liaWxpdHknOiAnaGlkZGVuJ1xyXG4gICAgICAgICAgICB9LFxyXG4gICAgICAgICAgICByZW5kZXJlZFBvc2l0aW9uOiBwb3NpdGlvblxyXG4gICAgICAgIH07XHJcbiAgICAgICAgY3kuYWRkKGR1bW15Tm9kZSk7XHJcblxyXG4gICAgICAgIHZhciBsb2MgPSAoZGlzY29ubmVjdGVkRW5kID09PSAnc291cmNlJykgPyBcclxuICAgICAgICAgICAge3NvdXJjZTogZHVtbXlOb2RlLmRhdGEuaWR9IDogXHJcbiAgICAgICAgICAgIHt0YXJnZXQ6IGR1bW15Tm9kZS5kYXRhLmlkfTtcclxuXHJcbiAgICAgICAgZWRnZSA9IGVkZ2UubW92ZShsb2MpWzBdO1xyXG5cclxuICAgICAgICByZXR1cm4ge1xyXG4gICAgICAgICAgICBkdW1teU5vZGU6IGN5Lm5vZGVzKFwiI1wiICsgZHVtbXlOb2RlLmRhdGEuaWQpWzBdLFxyXG4gICAgICAgICAgICBlZGdlOiBlZGdlXHJcbiAgICAgICAgfTtcclxuICAgIH0sXHJcblxyXG4gICAgY29ubmVjdEVkZ2U6IGZ1bmN0aW9uIChlZGdlLCBub2RlLCBsb2NhdGlvbikge1xyXG4gICAgICAgIGlmKCFlZGdlLmlzRWRnZSgpIHx8ICFub2RlLmlzTm9kZSgpKVxyXG4gICAgICAgICAgICByZXR1cm47XHJcblxyXG4gICAgICAgIHZhciBsb2MgPSB7fTtcclxuICAgICAgICBpZihsb2NhdGlvbiA9PT0gJ3NvdXJjZScpXHJcbiAgICAgICAgICAgIGxvYy5zb3VyY2UgPSBub2RlLmlkKCk7XHJcbiAgICAgICAgXHJcbiAgICAgICAgZWxzZSBpZihsb2NhdGlvbiA9PT0gJ3RhcmdldCcpXHJcbiAgICAgICAgICAgIGxvYy50YXJnZXQgPSBub2RlLmlkKCk7XHJcbiAgICAgICAgXHJcbiAgICAgICAgZWxzZVxyXG4gICAgICAgICAgICByZXR1cm47XHJcblxyXG4gICAgICAgIHJldHVybiBlZGdlLm1vdmUobG9jKVswXTtcclxuICAgIH0sXHJcblxyXG4gICAgY29weUVkZ2U6IGZ1bmN0aW9uIChvbGRFZGdlLCBuZXdFZGdlKSB7XHJcbiAgICAgICAgdGhpcy5jb3B5QmVuZFBvaW50cyhvbGRFZGdlLCBuZXdFZGdlKTtcclxuICAgICAgICB0aGlzLmNvcHlTdHlsZShvbGRFZGdlLCBuZXdFZGdlKTtcclxuICAgIH0sXHJcblxyXG4gICAgY29weVN0eWxlOiBmdW5jdGlvbiAob2xkRWRnZSwgbmV3RWRnZSkge1xyXG4gICAgICAgIGlmKG9sZEVkZ2UgJiYgbmV3RWRnZSl7XHJcbiAgICAgICAgICAgIG5ld0VkZ2UuZGF0YSgnbGluZS1jb2xvcicsIG9sZEVkZ2UuZGF0YSgnbGluZS1jb2xvcicpKTtcclxuICAgICAgICAgICAgbmV3RWRnZS5kYXRhKCd3aWR0aCcsIG9sZEVkZ2UuZGF0YSgnd2lkdGgnKSk7XHJcbiAgICAgICAgICAgIG5ld0VkZ2UuZGF0YSgnY2FyZGluYWxpdHknLCBvbGRFZGdlLmRhdGEoJ2NhcmRpbmFsaXR5JykpO1xyXG4gICAgICAgIH1cclxuICAgIH0sXHJcblxyXG4gICAgY29weUJlbmRQb2ludHM6IGZ1bmN0aW9uIChvbGRFZGdlLCBuZXdFZGdlKSB7XHJcbiAgICAgICAgaWYob2xkRWRnZS5oYXNDbGFzcygnZWRnZWJlbmRlZGl0aW5nLWhhc2JlbmRwb2ludHMnKSl7XHJcbiAgICAgICAgICAgIHZhciBicERpc3RhbmNlcyA9IG9sZEVkZ2UuZGF0YSgnY3llZGdlYmVuZGVkaXRpbmdEaXN0YW5jZXMnKTtcclxuICAgICAgICAgICAgdmFyIGJwV2VpZ2h0cyA9IG9sZEVkZ2UuZGF0YSgnY3llZGdlYmVuZGVkaXRpbmdXZWlnaHRzJyk7XHJcbiAgICAgICAgICAgIFxyXG4gICAgICAgICAgICBuZXdFZGdlLmRhdGEoJ2N5ZWRnZWJlbmRlZGl0aW5nRGlzdGFuY2VzJywgYnBEaXN0YW5jZXMpO1xyXG4gICAgICAgICAgICBuZXdFZGdlLmRhdGEoJ2N5ZWRnZWJlbmRlZGl0aW5nV2VpZ2h0cycsIGJwV2VpZ2h0cyk7XHJcbiAgICAgICAgICAgIG5ld0VkZ2UuYWRkQ2xhc3MoJ2VkZ2ViZW5kZWRpdGluZy1oYXNiZW5kcG9pbnRzJyk7XHJcbiAgICAgICAgfVxyXG4gICAgfSxcclxufTtcclxuICBcclxubW9kdWxlLmV4cG9ydHMgPSByZWNvbm5lY3Rpb25VdGlsaXRpZXM7XHJcbiAgIiwibW9kdWxlLmV4cG9ydHMgPSBmdW5jdGlvbiAoY3ksIGJlbmRQb2ludFV0aWxpdGllcywgcGFyYW1zKSB7XHJcbiAgaWYgKGN5LnVuZG9SZWRvID09IG51bGwpXHJcbiAgICByZXR1cm47XHJcblxyXG4gIHZhciB1ciA9IGN5LnVuZG9SZWRvKHtcclxuICAgIGRlZmF1bHRBY3Rpb25zOiBmYWxzZSxcclxuICAgIGlzRGVidWc6IHRydWVcclxuICB9KTtcclxuXHJcbiAgZnVuY3Rpb24gY2hhbmdlQmVuZFBvaW50cyhwYXJhbSkge1xyXG4gICAgdmFyIGVkZ2UgPSBjeS5nZXRFbGVtZW50QnlJZChwYXJhbS5lZGdlLmlkKCkpO1xyXG4gICAgdmFyIHJlc3VsdCA9IHtcclxuICAgICAgZWRnZTogZWRnZSxcclxuICAgICAgd2VpZ2h0czogcGFyYW0uc2V0ID8gZWRnZS5kYXRhKCdjeWVkZ2ViZW5kZWRpdGluZ1dlaWdodHMnKSA6IHBhcmFtLndlaWdodHMsXHJcbiAgICAgIGRpc3RhbmNlczogcGFyYW0uc2V0ID8gZWRnZS5kYXRhKCdjeWVkZ2ViZW5kZWRpdGluZ0Rpc3RhbmNlcycpIDogcGFyYW0uZGlzdGFuY2VzLFxyXG4gICAgICBzZXQ6IHRydWUvL0FzIHRoZSByZXN1bHQgd2lsbCBub3QgYmUgdXNlZCBmb3IgdGhlIGZpcnN0IGZ1bmN0aW9uIGNhbGwgcGFyYW1zIHNob3VsZCBiZSB1c2VkIHRvIHNldCB0aGUgZGF0YVxyXG4gICAgfTtcclxuXHJcbiAgICB2YXIgaGFzQmVuZCA9IHBhcmFtLndlaWdodHMgJiYgcGFyYW0ud2VpZ2h0cy5sZW5ndGggPiAwO1xyXG5cclxuICAgIC8vQ2hlY2sgaWYgd2UgbmVlZCB0byBzZXQgdGhlIHdlaWdodHMgYW5kIGRpc3RhbmNlcyBieSB0aGUgcGFyYW0gdmFsdWVzXHJcbiAgICBpZiAocGFyYW0uc2V0KSB7XHJcbiAgICAgIGhhc0JlbmQgPyBlZGdlLmRhdGEoJ2N5ZWRnZWJlbmRlZGl0aW5nV2VpZ2h0cycsIHBhcmFtLndlaWdodHMpIDogZWRnZS5yZW1vdmVEYXRhKCdjeWVkZ2ViZW5kZWRpdGluZ1dlaWdodHMnKTtcclxuICAgICAgaGFzQmVuZCA/IGVkZ2UuZGF0YSgnY3llZGdlYmVuZGVkaXRpbmdEaXN0YW5jZXMnLCBwYXJhbS5kaXN0YW5jZXMpIDogZWRnZS5yZW1vdmVEYXRhKCdjeWVkZ2ViZW5kZWRpdGluZ0Rpc3RhbmNlcycpO1xyXG5cclxuICAgICAgLy9yZWZyZXNoIHRoZSBjdXJ2ZSBzdHlsZSBhcyB0aGUgbnVtYmVyIG9mIGJlbmQgcG9pbnQgd291bGQgYmUgY2hhbmdlZCBieSB0aGUgcHJldmlvdXMgb3BlcmF0aW9uXHJcbiAgICAgIGlmIChoYXNCZW5kKSB7XHJcbiAgICAgICAgZWRnZS5hZGRDbGFzcygnZWRnZWJlbmRlZGl0aW5nLWhhc2JlbmRwb2ludHMnKTtcclxuICAgICAgfVxyXG4gICAgICBlbHNlIHtcclxuICAgICAgICBlZGdlLnJlbW92ZUNsYXNzKCdlZGdlYmVuZGVkaXRpbmctaGFzYmVuZHBvaW50cycpO1xyXG4gICAgICB9XHJcbiAgICB9XHJcbiAgICBcclxuICAgIGVkZ2UudHJpZ2dlcignY3llZGdlYmVuZGVkaXRpbmcuY2hhbmdlQmVuZFBvaW50cycpO1xyXG5cclxuICAgIHJldHVybiByZXN1bHQ7XHJcbiAgfVxyXG5cclxuICBmdW5jdGlvbiBtb3ZlRG8oYXJnKSB7XHJcbiAgICAgIGlmIChhcmcuZmlyc3RUaW1lKSB7XHJcbiAgICAgICAgICBkZWxldGUgYXJnLmZpcnN0VGltZTtcclxuICAgICAgICAgIHJldHVybiBhcmc7XHJcbiAgICAgIH1cclxuXHJcbiAgICAgIHZhciBlZGdlcyA9IGFyZy5lZGdlcztcclxuICAgICAgdmFyIHBvc2l0aW9uRGlmZiA9IGFyZy5wb3NpdGlvbkRpZmY7XHJcbiAgICAgIHZhciByZXN1bHQgPSB7XHJcbiAgICAgICAgICBlZGdlczogZWRnZXMsXHJcbiAgICAgICAgICBwb3NpdGlvbkRpZmY6IHtcclxuICAgICAgICAgICAgICB4OiAtcG9zaXRpb25EaWZmLngsXHJcbiAgICAgICAgICAgICAgeTogLXBvc2l0aW9uRGlmZi55XHJcbiAgICAgICAgICB9XHJcbiAgICAgIH07XHJcbiAgICAgIG1vdmVCZW5kUG9pbnRzVW5kb2FibGUocG9zaXRpb25EaWZmLCBlZGdlcyk7XHJcblxyXG4gICAgICByZXR1cm4gcmVzdWx0O1xyXG4gIH1cclxuXHJcbiAgZnVuY3Rpb24gbW92ZUJlbmRQb2ludHNVbmRvYWJsZShwb3NpdGlvbkRpZmYsIGVkZ2VzKSB7XHJcbiAgICAgIGVkZ2VzLmZvckVhY2goZnVuY3Rpb24oIGVkZ2UgKXtcclxuICAgICAgICAgIGVkZ2UgPSBjeS5nZXRFbGVtZW50QnlJZChwYXJhbS5lZGdlLmlkKCkpO1xyXG4gICAgICAgICAgdmFyIHByZXZpb3VzQmVuZFBvaW50c1Bvc2l0aW9uID0gYmVuZFBvaW50VXRpbGl0aWVzLmdldFNlZ21lbnRQb2ludHMoZWRnZSk7XHJcbiAgICAgICAgICB2YXIgbmV4dEJlbmRQb2ludHNQb3NpdGlvbiA9IFtdO1xyXG4gICAgICAgICAgaWYgKHByZXZpb3VzQmVuZFBvaW50c1Bvc2l0aW9uICE9IHVuZGVmaW5lZClcclxuICAgICAgICAgIHtcclxuICAgICAgICAgICAgICBmb3IgKGk9MDsgaTxwcmV2aW91c0JlbmRQb2ludHNQb3NpdGlvbi5sZW5ndGg7IGkrPTIpXHJcbiAgICAgICAgICAgICAge1xyXG4gICAgICAgICAgICAgICAgICBuZXh0QmVuZFBvaW50c1Bvc2l0aW9uLnB1c2goe3g6IHByZXZpb3VzQmVuZFBvaW50c1Bvc2l0aW9uW2ldK3Bvc2l0aW9uRGlmZi54LCB5OiBwcmV2aW91c0JlbmRQb2ludHNQb3NpdGlvbltpKzFdK3Bvc2l0aW9uRGlmZi55fSk7XHJcbiAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgIGVkZ2UuZGF0YSgnYmVuZFBvaW50UG9zaXRpb25zJyxuZXh0QmVuZFBvaW50c1Bvc2l0aW9uKTtcclxuICAgICAgICAgIH1cclxuICAgICAgfSk7XHJcblxyXG4gICAgICBiZW5kUG9pbnRVdGlsaXRpZXMuaW5pdEJlbmRQb2ludHMocGFyYW1zLmJlbmRQb3NpdGlvbnNGdW5jdGlvbiwgZWRnZXMpO1xyXG4gIH1cclxuXHJcbiAgZnVuY3Rpb24gcmVjb25uZWN0RWRnZShwYXJhbSl7XHJcbiAgICB2YXIgZWRnZSAgICAgID0gcGFyYW0uZWRnZTtcclxuICAgIHZhciBsb2NhdGlvbiAgPSBwYXJhbS5sb2NhdGlvbjtcclxuICAgIHZhciBvbGRMb2MgICAgPSBwYXJhbS5vbGRMb2M7XHJcblxyXG4gICAgZWRnZSA9IGVkZ2UubW92ZShsb2NhdGlvbilbMF07XHJcblxyXG4gICAgdmFyIHJlc3VsdCA9IHtcclxuICAgICAgZWRnZTogICAgIGVkZ2UsXHJcbiAgICAgIGxvY2F0aW9uOiBvbGRMb2MsXHJcbiAgICAgIG9sZExvYzogICBsb2NhdGlvblxyXG4gICAgfVxyXG4gICAgcmV0dXJuIHJlc3VsdDtcclxuICB9XHJcblxyXG4gIGZ1bmN0aW9uIHJlbW92ZVJlY29ubmVjdGVkRWRnZShwYXJhbSl7XHJcbiAgICB2YXIgb2xkRWRnZSA9IHBhcmFtLm9sZEVkZ2U7XHJcbiAgICB2YXIgdG1wID0gY3kuZ2V0RWxlbWVudEJ5SWQob2xkRWRnZS5kYXRhKCdpZCcpKTtcclxuICAgIGlmKHRtcCAmJiB0bXAubGVuZ3RoID4gMClcclxuICAgICAgb2xkRWRnZSA9IHRtcDtcclxuXHJcbiAgICB2YXIgbmV3RWRnZSA9IHBhcmFtLm5ld0VkZ2U7XHJcbiAgICB2YXIgdG1wID0gY3kuZ2V0RWxlbWVudEJ5SWQobmV3RWRnZS5kYXRhKCdpZCcpKTtcclxuICAgIGlmKHRtcCAmJiB0bXAubGVuZ3RoID4gMClcclxuICAgICAgbmV3RWRnZSA9IHRtcDtcclxuXHJcbiAgICBpZihvbGRFZGdlLmluc2lkZSgpKXtcclxuICAgICAgb2xkRWRnZSA9IG9sZEVkZ2UucmVtb3ZlKClbMF07XHJcbiAgICB9IFxyXG4gICAgICBcclxuICAgIGlmKG5ld0VkZ2UucmVtb3ZlZCgpKXtcclxuICAgICAgbmV3RWRnZSA9IG5ld0VkZ2UucmVzdG9yZSgpO1xyXG4gICAgICBuZXdFZGdlLnVuc2VsZWN0KCk7XHJcbiAgICB9XHJcbiAgICBcclxuICAgIHJldHVybiB7XHJcbiAgICAgIG9sZEVkZ2U6IG5ld0VkZ2UsXHJcbiAgICAgIG5ld0VkZ2U6IG9sZEVkZ2VcclxuICAgIH07XHJcbiAgfVxyXG5cclxuICB1ci5hY3Rpb24oJ2NoYW5nZUJlbmRQb2ludHMnLCBjaGFuZ2VCZW5kUG9pbnRzLCBjaGFuZ2VCZW5kUG9pbnRzKTtcclxuICB1ci5hY3Rpb24oJ21vdmVCZW5kUG9pbnRzJywgbW92ZURvLCBtb3ZlRG8pO1xyXG4gIHVyLmFjdGlvbigncmVjb25uZWN0RWRnZScsIHJlY29ubmVjdEVkZ2UsIHJlY29ubmVjdEVkZ2UpO1xyXG4gIHVyLmFjdGlvbigncmVtb3ZlUmVjb25uZWN0ZWRFZGdlJywgcmVtb3ZlUmVjb25uZWN0ZWRFZGdlLCByZW1vdmVSZWNvbm5lY3RlZEVkZ2UpO1xyXG59O1xyXG4iXX0=
