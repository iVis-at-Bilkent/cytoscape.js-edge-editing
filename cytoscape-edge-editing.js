(function(f){if(typeof exports==="object"&&typeof module!=="undefined"){module.exports=f()}else if(typeof define==="function"&&define.amd){define([],f)}else{var g;if(typeof window!=="undefined"){g=window}else if(typeof global!=="undefined"){g=global}else if(typeof self!=="undefined"){g=self}else{g=this}g.cytoscapeEdgeEditing = f()}})(function(){var define,module,exports;return (function e(t,n,r){function s(o,u){if(!n[o]){if(!t[o]){var a=typeof require=="function"&&require;if(!u&&a)return a(o,!0);if(i)return i(o,!0);var f=new Error("Cannot find module '"+o+"'");throw f.code="MODULE_NOT_FOUND",f}var l=n[o]={exports:{}};t[o][0].call(l.exports,function(e){var n=t[o][1][e];return s(n?n:e)},l,l.exports,e,t,n,r)}return n[o].exports}var i=typeof require=="function"&&require;for(var o=0;o<r.length;o++)s(r[o]);return s})({1:[function(_dereq_,module,exports){
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
        
        setTimeout(function(){refreshDraws()}, 50) ;
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
            'z-index': '900'
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
          ctx.fillStyle = "#000"; // black
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

        var nextToSource = {
          x: edge_pts[2],
          y: edge_pts[3]
        }
        var nextToTarget = {
          x: edge_pts[edge_pts.length-4],
          y: edge_pts[edge_pts.length-3]
        }
        var length = getBendShapesLength(edge) * 0.65;

        var oldStroke = ctx.strokeStyle;
        var oldWidth = ctx.lineWidth;
        var oldFill = ctx.fillStyle;

        ctx.fillStyle = "#000"; // black
        
        renderEachEndPointShape(src, target, length,nextToSource,nextToTarget);
        
        ctx.strokeStyle = oldStroke;
        ctx.fillStyle = oldFill;
        ctx.lineWidth = oldWidth;
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
        ctx.beginPath();
        ctx.arc(sourceEndPointX + length, sourceEndPointY + length, length, 0, 2*Math.PI, false);
        ctx.arc(targetEndPointX + length, targetEndPointY + length, length, 0, 2*Math.PI, false);
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

          if(edge.target().connectedEdges().length == 0 || edge.source().connectedEdges().length == 0){
            return;
          }

         
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
          setTimeout(function(){refreshDraws()}, 50);
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
    $.error('No such function `' + fn + '` for cytoscape.js-edge-editing');
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
    define('cytoscape-edge-editing', function(){
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

//# sourceMappingURL=data:application/json;charset:utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIm5vZGVfbW9kdWxlcy9icm93c2VyLXBhY2svX3ByZWx1ZGUuanMiLCJzcmMvVUlVdGlsaXRpZXMuanMiLCJzcmMvYmVuZFBvaW50VXRpbGl0aWVzLmpzIiwic3JjL2RlYm91bmNlLmpzIiwic3JjL2luZGV4LmpzIiwic3JjL3JlY29ubmVjdGlvblV0aWxpdGllcy5qcyIsInNyYy9yZWdpc3RlclVuZG9SZWRvRnVuY3Rpb25zLmpzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBO0FDQUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNsbkNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDL1pBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQzdPQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNqSUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQzFFQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQSIsImZpbGUiOiJnZW5lcmF0ZWQuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlc0NvbnRlbnQiOlsiKGZ1bmN0aW9uIGUodCxuLHIpe2Z1bmN0aW9uIHMobyx1KXtpZighbltvXSl7aWYoIXRbb10pe3ZhciBhPXR5cGVvZiByZXF1aXJlPT1cImZ1bmN0aW9uXCImJnJlcXVpcmU7aWYoIXUmJmEpcmV0dXJuIGEobywhMCk7aWYoaSlyZXR1cm4gaShvLCEwKTt2YXIgZj1uZXcgRXJyb3IoXCJDYW5ub3QgZmluZCBtb2R1bGUgJ1wiK28rXCInXCIpO3Rocm93IGYuY29kZT1cIk1PRFVMRV9OT1RfRk9VTkRcIixmfXZhciBsPW5bb109e2V4cG9ydHM6e319O3Rbb11bMF0uY2FsbChsLmV4cG9ydHMsZnVuY3Rpb24oZSl7dmFyIG49dFtvXVsxXVtlXTtyZXR1cm4gcyhuP246ZSl9LGwsbC5leHBvcnRzLGUsdCxuLHIpfXJldHVybiBuW29dLmV4cG9ydHN9dmFyIGk9dHlwZW9mIHJlcXVpcmU9PVwiZnVuY3Rpb25cIiYmcmVxdWlyZTtmb3IodmFyIG89MDtvPHIubGVuZ3RoO28rKylzKHJbb10pO3JldHVybiBzfSkiLCJ2YXIgZGVib3VuY2UgPSByZXF1aXJlKCcuL2RlYm91bmNlJyk7XHJcbnZhciBiZW5kUG9pbnRVdGlsaXRpZXMgPSByZXF1aXJlKCcuL2JlbmRQb2ludFV0aWxpdGllcycpO1xyXG52YXIgcmVjb25uZWN0aW9uVXRpbGl0aWVzID0gcmVxdWlyZSgnLi9yZWNvbm5lY3Rpb25VdGlsaXRpZXMnKTtcclxudmFyIHJlZ2lzdGVyVW5kb1JlZG9GdW5jdGlvbnMgPSByZXF1aXJlKCcuL3JlZ2lzdGVyVW5kb1JlZG9GdW5jdGlvbnMnKTtcclxuXHJcbm1vZHVsZS5leHBvcnRzID0gZnVuY3Rpb24gKHBhcmFtcywgY3kpIHtcclxuICB2YXIgZm4gPSBwYXJhbXM7XHJcblxyXG4gIHZhciBhZGRCZW5kUG9pbnRDeHRNZW51SWQgPSAnY3ktZWRnZS1iZW5kLWVkaXRpbmctY3h0LWFkZC1iZW5kLXBvaW50JztcclxuICB2YXIgcmVtb3ZlQmVuZFBvaW50Q3h0TWVudUlkID0gJ2N5LWVkZ2UtYmVuZC1lZGl0aW5nLWN4dC1yZW1vdmUtYmVuZC1wb2ludCc7XHJcbiAgdmFyIGVQb3NpdGlvbiwgZVN0eWxlLCBlUmVtb3ZlLCBlQWRkLCBlWm9vbSwgZVNlbGVjdCwgZVVuc2VsZWN0LCBlVGFwU3RhcnQsIGVUYXBEcmFnLCBlVGFwRW5kLCBlQ3h0VGFwO1xyXG4gIC8vIGxhc3Qgc3RhdHVzIG9mIGdlc3R1cmVzXHJcbiAgdmFyIGxhc3RQYW5uaW5nRW5hYmxlZCwgbGFzdFpvb21pbmdFbmFibGVkLCBsYXN0Qm94U2VsZWN0aW9uRW5hYmxlZDtcclxuICAvLyBzdGF0dXMgb2YgZWRnZSB0byBoaWdobGlnaHQgYmVuZHMgYW5kIHNlbGVjdGVkIGVkZ2VzXHJcbiAgdmFyIGVkZ2VUb0hpZ2hsaWdodEJlbmRzLCBudW1iZXJPZlNlbGVjdGVkRWRnZXM7XHJcbiAgXHJcbiAgdmFyIGZ1bmN0aW9ucyA9IHtcclxuICAgIGluaXQ6IGZ1bmN0aW9uICgpIHtcclxuICAgICAgLy8gcmVnaXN0ZXIgdW5kbyByZWRvIGZ1bmN0aW9uc1xyXG4gICAgICByZWdpc3RlclVuZG9SZWRvRnVuY3Rpb25zKGN5LCBiZW5kUG9pbnRVdGlsaXRpZXMsIHBhcmFtcyk7XHJcbiAgICAgIFxyXG4gICAgICB2YXIgc2VsZiA9IHRoaXM7XHJcbiAgICAgIHZhciBvcHRzID0gcGFyYW1zO1xyXG4gICAgICB2YXIgJGNvbnRhaW5lciA9ICQodGhpcyk7XHJcbiAgICAgIHZhciAkY2FudmFzID0gJCgnPGNhbnZhcz48L2NhbnZhcz4nKTtcclxuXHJcbiAgICAgICRjb250YWluZXIuYXBwZW5kKCRjYW52YXMpO1xyXG5cclxuICAgICAgdmFyIGN4dEFkZEJlbmRQb2ludEZjbiA9IGZ1bmN0aW9uIChldmVudCkge1xyXG4gICAgICAgIHZhciBlZGdlID0gZXZlbnQudGFyZ2V0IHx8IGV2ZW50LmN5VGFyZ2V0O1xyXG4gICAgICAgIGlmKCFiZW5kUG9pbnRVdGlsaXRpZXMuaXNJZ25vcmVkRWRnZShlZGdlKSkge1xyXG5cclxuICAgICAgICAgIHZhciBwYXJhbSA9IHtcclxuICAgICAgICAgICAgZWRnZTogZWRnZSxcclxuICAgICAgICAgICAgd2VpZ2h0czogZWRnZS5kYXRhKCdjeWVkZ2ViZW5kZWRpdGluZ1dlaWdodHMnKSA/IFtdLmNvbmNhdChlZGdlLmRhdGEoJ2N5ZWRnZWJlbmRlZGl0aW5nV2VpZ2h0cycpKSA6IGVkZ2UuZGF0YSgnY3llZGdlYmVuZGVkaXRpbmdXZWlnaHRzJyksXHJcbiAgICAgICAgICAgIGRpc3RhbmNlczogZWRnZS5kYXRhKCdjeWVkZ2ViZW5kZWRpdGluZ0Rpc3RhbmNlcycpID8gW10uY29uY2F0KGVkZ2UuZGF0YSgnY3llZGdlYmVuZGVkaXRpbmdEaXN0YW5jZXMnKSkgOiBlZGdlLmRhdGEoJ2N5ZWRnZWJlbmRlZGl0aW5nRGlzdGFuY2VzJylcclxuICAgICAgICAgIH07XHJcblxyXG4gICAgICAgICAgYmVuZFBvaW50VXRpbGl0aWVzLmFkZEJlbmRQb2ludCgpO1xyXG5cclxuICAgICAgICAgIGlmIChvcHRpb25zKCkudW5kb2FibGUpIHtcclxuICAgICAgICAgICAgY3kudW5kb1JlZG8oKS5kbygnY2hhbmdlQmVuZFBvaW50cycsIHBhcmFtKTtcclxuICAgICAgICAgIH1cclxuICAgICAgICB9XHJcbiAgICAgICAgXHJcbiAgICAgICAgcmVmcmVzaERyYXdzKCk7XHJcbiAgICAgIH07XHJcblxyXG4gICAgICB2YXIgY3h0UmVtb3ZlQmVuZFBvaW50RmNuID0gZnVuY3Rpb24gKGV2ZW50KSB7XHJcbiAgICAgICAgdmFyIGVkZ2UgPSBldmVudC50YXJnZXQgfHwgZXZlbnQuY3lUYXJnZXQ7XHJcbiAgICAgICAgXHJcbiAgICAgICAgdmFyIHBhcmFtID0ge1xyXG4gICAgICAgICAgZWRnZTogZWRnZSxcclxuICAgICAgICAgIHdlaWdodHM6IFtdLmNvbmNhdChlZGdlLmRhdGEoJ2N5ZWRnZWJlbmRlZGl0aW5nV2VpZ2h0cycpKSxcclxuICAgICAgICAgIGRpc3RhbmNlczogW10uY29uY2F0KGVkZ2UuZGF0YSgnY3llZGdlYmVuZGVkaXRpbmdEaXN0YW5jZXMnKSlcclxuICAgICAgICB9O1xyXG5cclxuICAgICAgICBiZW5kUG9pbnRVdGlsaXRpZXMucmVtb3ZlQmVuZFBvaW50KCk7XHJcbiAgICAgICAgXHJcbiAgICAgICAgaWYob3B0aW9ucygpLnVuZG9hYmxlKSB7XHJcbiAgICAgICAgICBjeS51bmRvUmVkbygpLmRvKCdjaGFuZ2VCZW5kUG9pbnRzJywgcGFyYW0pO1xyXG4gICAgICAgIH1cclxuICAgICAgICBcclxuICAgICAgICBzZXRUaW1lb3V0KGZ1bmN0aW9uKCl7cmVmcmVzaERyYXdzKCl9LCA1MCkgO1xyXG4gICAgICB9O1xyXG4gICAgICBcclxuICAgICAgLy8gZnVuY3Rpb24gdG8gcmVjb25uZWN0IGVkZ2VcclxuICAgICAgdmFyIGhhbmRsZVJlY29ubmVjdEVkZ2UgPSBvcHRzLmhhbmRsZVJlY29ubmVjdEVkZ2U7XHJcbiAgICAgIC8vIGZ1bmN0aW9uIHRvIHZhbGlkYXRlIGVkZ2Ugc291cmNlIGFuZCB0YXJnZXQgb24gcmVjb25uZWN0aW9uXHJcbiAgICAgIHZhciB2YWxpZGF0ZUVkZ2UgPSBvcHRzLnZhbGlkYXRlRWRnZTsgXHJcbiAgICAgIC8vIGZ1bmN0aW9uIHRvIGJlIGNhbGxlZCBvbiBpbnZhbGlkIGVkZ2UgcmVjb25uZWN0aW9uXHJcbiAgICAgIHZhciBhY3RPblVuc3VjY2Vzc2Z1bFJlY29ubmVjdGlvbiA9IG9wdHMuYWN0T25VbnN1Y2Nlc3NmdWxSZWNvbm5lY3Rpb247XHJcbiAgICAgIFxyXG4gICAgICB2YXIgbWVudUl0ZW1zID0gW1xyXG4gICAgICAgIHtcclxuICAgICAgICAgIGlkOiBhZGRCZW5kUG9pbnRDeHRNZW51SWQsXHJcbiAgICAgICAgICB0aXRsZTogb3B0cy5hZGRCZW5kTWVudUl0ZW1UaXRsZSxcclxuICAgICAgICAgIGNvbnRlbnQ6ICdBZGQgQmVuZCBQb2ludCcsXHJcbiAgICAgICAgICBzZWxlY3RvcjogJ2VkZ2UnLFxyXG4gICAgICAgICAgb25DbGlja0Z1bmN0aW9uOiBjeHRBZGRCZW5kUG9pbnRGY25cclxuICAgICAgICB9LFxyXG4gICAgICAgIHtcclxuICAgICAgICAgIGlkOiByZW1vdmVCZW5kUG9pbnRDeHRNZW51SWQsXHJcbiAgICAgICAgICB0aXRsZTogb3B0cy5yZW1vdmVCZW5kTWVudUl0ZW1UaXRsZSxcclxuICAgICAgICAgIGNvbnRlbnQ6ICdSZW1vdmUgQmVuZCBQb2ludCcsXHJcbiAgICAgICAgICBzZWxlY3RvcjogJ2VkZ2UnLFxyXG4gICAgICAgICAgb25DbGlja0Z1bmN0aW9uOiBjeHRSZW1vdmVCZW5kUG9pbnRGY25cclxuICAgICAgICB9XHJcbiAgICAgIF07XHJcbiAgICAgIFxyXG4gICAgICBpZihjeS5jb250ZXh0TWVudXMpIHtcclxuICAgICAgICB2YXIgbWVudXMgPSBjeS5jb250ZXh0TWVudXMoJ2dldCcpO1xyXG4gICAgICAgIC8vIElmIGNvbnRleHQgbWVudXMgaXMgYWN0aXZlIGp1c3QgYXBwZW5kIG1lbnUgaXRlbXMgZWxzZSBhY3RpdmF0ZSB0aGUgZXh0ZW5zaW9uXHJcbiAgICAgICAgLy8gd2l0aCBpbml0aWFsIG1lbnUgaXRlbXNcclxuICAgICAgICBpZiAobWVudXMuaXNBY3RpdmUoKSkge1xyXG4gICAgICAgICAgbWVudXMuYXBwZW5kTWVudUl0ZW1zKG1lbnVJdGVtcyk7XHJcbiAgICAgICAgfVxyXG4gICAgICAgIGVsc2Uge1xyXG4gICAgICAgICAgY3kuY29udGV4dE1lbnVzKHtcclxuICAgICAgICAgICAgbWVudUl0ZW1zOiBtZW51SXRlbXNcclxuICAgICAgICAgIH0pO1xyXG4gICAgICAgIH1cclxuICAgICAgfVxyXG4gICAgICBcclxuICAgICAgdmFyIF9zaXplQ2FudmFzID0gZGVib3VuY2UoZnVuY3Rpb24gKCkge1xyXG4gICAgICAgICRjYW52YXNcclxuICAgICAgICAgIC5hdHRyKCdoZWlnaHQnLCAkY29udGFpbmVyLmhlaWdodCgpKVxyXG4gICAgICAgICAgLmF0dHIoJ3dpZHRoJywgJGNvbnRhaW5lci53aWR0aCgpKVxyXG4gICAgICAgICAgLmNzcyh7XHJcbiAgICAgICAgICAgICdwb3NpdGlvbic6ICdhYnNvbHV0ZScsXHJcbiAgICAgICAgICAgICd0b3AnOiAwLFxyXG4gICAgICAgICAgICAnbGVmdCc6IDAsXHJcbiAgICAgICAgICAgICd6LWluZGV4JzogJzkwMCdcclxuICAgICAgICAgIH0pXHJcbiAgICAgICAgO1xyXG5cclxuICAgICAgICBzZXRUaW1lb3V0KGZ1bmN0aW9uICgpIHtcclxuICAgICAgICAgIHZhciBjYW52YXNCYiA9ICRjYW52YXMub2Zmc2V0KCk7XHJcbiAgICAgICAgICB2YXIgY29udGFpbmVyQmIgPSAkY29udGFpbmVyLm9mZnNldCgpO1xyXG5cclxuICAgICAgICAgICRjYW52YXNcclxuICAgICAgICAgICAgLmNzcyh7XHJcbiAgICAgICAgICAgICAgJ3RvcCc6IC0oY2FudmFzQmIudG9wIC0gY29udGFpbmVyQmIudG9wKSxcclxuICAgICAgICAgICAgICAnbGVmdCc6IC0oY2FudmFzQmIubGVmdCAtIGNvbnRhaW5lckJiLmxlZnQpXHJcbiAgICAgICAgICAgIH0pXHJcbiAgICAgICAgICA7XHJcblxyXG4gICAgICAgICAgLy8gcmVkcmF3IG9uIGNhbnZhcyByZXNpemVcclxuICAgICAgICAgIGlmKGN5KXtcclxuICAgICAgICAgICAgcmVmcmVzaERyYXdzKCk7XHJcbiAgICAgICAgICB9XHJcbiAgICAgICAgfSwgMCk7XHJcblxyXG4gICAgICB9LCAyNTApO1xyXG5cclxuICAgICAgZnVuY3Rpb24gc2l6ZUNhbnZhcygpIHtcclxuICAgICAgICBfc2l6ZUNhbnZhcygpO1xyXG4gICAgICB9XHJcblxyXG4gICAgICBzaXplQ2FudmFzKCk7XHJcblxyXG4gICAgICAkKHdpbmRvdykuYmluZCgncmVzaXplJywgZnVuY3Rpb24gKCkge1xyXG4gICAgICAgIHNpemVDYW52YXMoKTtcclxuICAgICAgfSk7XHJcblxyXG4gICAgICB2YXIgY3R4ID0gJGNhbnZhc1swXS5nZXRDb250ZXh0KCcyZCcpO1xyXG5cclxuICAgICAgLy8gd3JpdGUgb3B0aW9ucyB0byBkYXRhXHJcbiAgICAgIHZhciBkYXRhID0gJGNvbnRhaW5lci5kYXRhKCdjeWVkZ2ViZW5kZWRpdGluZycpO1xyXG4gICAgICBpZiAoZGF0YSA9PSBudWxsKSB7XHJcbiAgICAgICAgZGF0YSA9IHt9O1xyXG4gICAgICB9XHJcbiAgICAgIGRhdGEub3B0aW9ucyA9IG9wdHM7XHJcblxyXG4gICAgICB2YXIgb3B0Q2FjaGU7XHJcblxyXG4gICAgICBmdW5jdGlvbiBvcHRpb25zKCkge1xyXG4gICAgICAgIHJldHVybiBvcHRDYWNoZSB8fCAob3B0Q2FjaGUgPSAkY29udGFpbmVyLmRhdGEoJ2N5ZWRnZWJlbmRlZGl0aW5nJykub3B0aW9ucyk7XHJcbiAgICAgIH1cclxuXHJcbiAgICAgIC8vIHdlIHdpbGwgbmVlZCB0byBjb252ZXJ0IG1vZGVsIHBvc2l0b25zIHRvIHJlbmRlcmVkIHBvc2l0aW9uc1xyXG4gICAgICBmdW5jdGlvbiBjb252ZXJ0VG9SZW5kZXJlZFBvc2l0aW9uKG1vZGVsUG9zaXRpb24pIHtcclxuICAgICAgICB2YXIgcGFuID0gY3kucGFuKCk7XHJcbiAgICAgICAgdmFyIHpvb20gPSBjeS56b29tKCk7XHJcblxyXG4gICAgICAgIHZhciB4ID0gbW9kZWxQb3NpdGlvbi54ICogem9vbSArIHBhbi54O1xyXG4gICAgICAgIHZhciB5ID0gbW9kZWxQb3NpdGlvbi55ICogem9vbSArIHBhbi55O1xyXG5cclxuICAgICAgICByZXR1cm4ge1xyXG4gICAgICAgICAgeDogeCxcclxuICAgICAgICAgIHk6IHlcclxuICAgICAgICB9O1xyXG4gICAgICB9XHJcbiAgICAgIFxyXG4gICAgICBmdW5jdGlvbiByZWZyZXNoRHJhd3MoKSB7XHJcblxyXG4gICAgICAgIHZhciB3ID0gJGNvbnRhaW5lci53aWR0aCgpO1xyXG4gICAgICAgIHZhciBoID0gJGNvbnRhaW5lci5oZWlnaHQoKTtcclxuXHJcbiAgICAgICAgY3R4LmNsZWFyUmVjdCgwLCAwLCB3LCBoKTtcclxuICAgICAgICBcclxuICAgICAgICBpZiggZWRnZVRvSGlnaGxpZ2h0QmVuZHMgKSB7XHJcbiAgICAgICAgICByZW5kZXJCZW5kU2hhcGVzKGVkZ2VUb0hpZ2hsaWdodEJlbmRzKTtcclxuICAgICAgICAgIHJlbmRlckVuZFBvaW50U2hhcGVzKGVkZ2VUb0hpZ2hsaWdodEJlbmRzKTtcclxuICAgICAgICB9XHJcbiAgICAgIH1cclxuICAgICAgXHJcbiAgICAgIC8vIHJlbmRlciB0aGUgYmVuZCBzaGFwZXMgb2YgdGhlIGdpdmVuIGVkZ2VcclxuICAgICAgZnVuY3Rpb24gcmVuZGVyQmVuZFNoYXBlcyhlZGdlKSB7XHJcbiAgICAgICAgXHJcbiAgICAgICAgaWYoIWVkZ2UuaGFzQ2xhc3MoJ2VkZ2ViZW5kZWRpdGluZy1oYXNiZW5kcG9pbnRzJykpIHtcclxuICAgICAgICAgIHJldHVybjtcclxuICAgICAgICB9XHJcbiAgICAgICAgXHJcbiAgICAgICAgdmFyIHNlZ3B0cyA9IGJlbmRQb2ludFV0aWxpdGllcy5nZXRTZWdtZW50UG9pbnRzKGVkZ2UpOy8vZWRnZS5fcHJpdmF0ZS5yZGF0YS5zZWdwdHM7XHJcbiAgICAgICAgdmFyIGxlbmd0aCA9IGdldEJlbmRTaGFwZXNMZW5ndGgoZWRnZSkgKiAwLjY1O1xyXG4gICAgICAgIFxyXG4gICAgICAgIHZhciBzcmNQb3MgPSBlZGdlLnNvdXJjZSgpLnBvc2l0aW9uKCk7XHJcbiAgICAgICAgdmFyIHRndFBvcyA9IGVkZ2UudGFyZ2V0KCkucG9zaXRpb24oKTtcclxuICAgICAgICBcclxuICAgICAgICB2YXIgd2VpZ2h0cyA9IGVkZ2UuZGF0YSgnY3llZGdlYmVuZGVkaXRpbmdXZWlnaHRzJyk7XHJcbiAgICAgICAgdmFyIGRpc3RhbmNlcyA9IGVkZ2UuZGF0YSgnY3llZGdlYmVuZGVkaXRpbmdEaXN0YW5jZXMnKTtcclxuXHJcbiAgICAgICAgZm9yKHZhciBpID0gMDsgc2VncHRzICYmIGkgPCBzZWdwdHMubGVuZ3RoOyBpID0gaSArIDIpe1xyXG4gICAgICAgICAgdmFyIGJlbmRYID0gc2VncHRzW2ldO1xyXG4gICAgICAgICAgdmFyIGJlbmRZID0gc2VncHRzW2kgKyAxXTtcclxuXHJcbiAgICAgICAgICB2YXIgb2xkU3R5bGUgPSBjdHguZmlsbFN0eWxlO1xyXG4gICAgICAgICAgY3R4LmZpbGxTdHlsZSA9IFwiIzAwMFwiOyAvLyBibGFja1xyXG4gICAgICAgICAgcmVuZGVyQmVuZFNoYXBlKGJlbmRYLCBiZW5kWSwgbGVuZ3RoKTtcclxuICAgICAgICAgIGN0eC5maWxsU3R5bGUgPSBvbGRTdHlsZTtcclxuICAgICAgICB9XHJcbiAgICAgIH1cclxuICAgICAgXHJcbiAgICAgIC8vIHJlbmRlciBhIGJlbmQgc2hhcGUgd2l0aCB0aGUgZ2l2ZW4gcGFyYW1ldGVyc1xyXG4gICAgICBmdW5jdGlvbiByZW5kZXJCZW5kU2hhcGUoYmVuZFgsIGJlbmRZLCBsZW5ndGgpIHtcclxuICAgICAgICAvLyBnZXQgdGhlIHRvcCBsZWZ0IGNvb3JkaW5hdGVzXHJcbiAgICAgICAgdmFyIHRvcExlZnRYID0gYmVuZFggLSBsZW5ndGggLyAyO1xyXG4gICAgICAgIHZhciB0b3BMZWZ0WSA9IGJlbmRZIC0gbGVuZ3RoIC8gMjtcclxuICAgICAgICBcclxuICAgICAgICAvLyBjb252ZXJ0IHRvIHJlbmRlcmVkIHBhcmFtZXRlcnNcclxuICAgICAgICB2YXIgcmVuZGVyZWRUb3BMZWZ0UG9zID0gY29udmVydFRvUmVuZGVyZWRQb3NpdGlvbih7eDogdG9wTGVmdFgsIHk6IHRvcExlZnRZfSk7XHJcbiAgICAgICAgbGVuZ3RoICo9IGN5Lnpvb20oKTtcclxuICAgICAgICBcclxuICAgICAgICAvLyByZW5kZXIgYmVuZCBzaGFwZVxyXG4gICAgICAgIGN0eC5iZWdpblBhdGgoKTtcclxuICAgICAgICBjdHgucmVjdChyZW5kZXJlZFRvcExlZnRQb3MueCwgcmVuZGVyZWRUb3BMZWZ0UG9zLnksIGxlbmd0aCwgbGVuZ3RoKTtcclxuICAgICAgICBjdHguZmlsbCgpO1xyXG4gICAgICAgIGN0eC5jbG9zZVBhdGgoKTtcclxuICAgICAgfVxyXG4gICAgICBcclxuICAgICAgLy8gcmVuZGVyIHRoZSBlbmQgcG9pbnRzIHNoYXBlcyBvZiB0aGUgZ2l2ZW4gZWRnZVxyXG4gICAgICBmdW5jdGlvbiByZW5kZXJFbmRQb2ludFNoYXBlcyhlZGdlKSB7XHJcbiAgICAgICAgaWYoIWVkZ2Upe1xyXG4gICAgICAgICAgcmV0dXJuO1xyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgdmFyIGVkZ2VfcHRzID0gZWRnZS5fcHJpdmF0ZS5yc2NyYXRjaC5hbGxwdHM7XHJcbiAgICAgICAgaWYoIWVkZ2VfcHRzKVxyXG4gICAgICAgICAgcmV0dXJuO1xyXG5cclxuICAgICAgICB2YXIgc3JjID0ge1xyXG4gICAgICAgICAgeDogZWRnZV9wdHNbMF0sXHJcbiAgICAgICAgICB5OiBlZGdlX3B0c1sxXVxyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgdmFyIHRhcmdldCA9IHtcclxuICAgICAgICAgIHg6IGVkZ2VfcHRzW2VkZ2VfcHRzLmxlbmd0aC0yXSxcclxuICAgICAgICAgIHk6IGVkZ2VfcHRzW2VkZ2VfcHRzLmxlbmd0aC0xXVxyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgdmFyIG5leHRUb1NvdXJjZSA9IHtcclxuICAgICAgICAgIHg6IGVkZ2VfcHRzWzJdLFxyXG4gICAgICAgICAgeTogZWRnZV9wdHNbM11cclxuICAgICAgICB9XHJcbiAgICAgICAgdmFyIG5leHRUb1RhcmdldCA9IHtcclxuICAgICAgICAgIHg6IGVkZ2VfcHRzW2VkZ2VfcHRzLmxlbmd0aC00XSxcclxuICAgICAgICAgIHk6IGVkZ2VfcHRzW2VkZ2VfcHRzLmxlbmd0aC0zXVxyXG4gICAgICAgIH1cclxuICAgICAgICB2YXIgbGVuZ3RoID0gZ2V0QmVuZFNoYXBlc0xlbmd0aChlZGdlKSAqIDAuNjU7XHJcblxyXG4gICAgICAgIHZhciBvbGRTdHJva2UgPSBjdHguc3Ryb2tlU3R5bGU7XHJcbiAgICAgICAgdmFyIG9sZFdpZHRoID0gY3R4LmxpbmVXaWR0aDtcclxuICAgICAgICB2YXIgb2xkRmlsbCA9IGN0eC5maWxsU3R5bGU7XHJcblxyXG4gICAgICAgIGN0eC5maWxsU3R5bGUgPSBcIiMwMDBcIjsgLy8gYmxhY2tcclxuICAgICAgICBcclxuICAgICAgICByZW5kZXJFYWNoRW5kUG9pbnRTaGFwZShzcmMsIHRhcmdldCwgbGVuZ3RoLG5leHRUb1NvdXJjZSxuZXh0VG9UYXJnZXQpO1xyXG4gICAgICAgIFxyXG4gICAgICAgIGN0eC5zdHJva2VTdHlsZSA9IG9sZFN0cm9rZTtcclxuICAgICAgICBjdHguZmlsbFN0eWxlID0gb2xkRmlsbDtcclxuICAgICAgICBjdHgubGluZVdpZHRoID0gb2xkV2lkdGg7XHJcbiAgICAgIH1cclxuXHJcbiAgICAgIGZ1bmN0aW9uIHJlbmRlckVhY2hFbmRQb2ludFNoYXBlKHNvdXJjZSwgdGFyZ2V0LCBsZW5ndGgsbmV4dFRvU291cmNlLG5leHRUb1RhcmdldCkge1xyXG4gICAgICAgIC8vIGdldCB0aGUgdG9wIGxlZnQgY29vcmRpbmF0ZXMgb2Ygc291cmNlIGFuZCB0YXJnZXRcclxuICAgICAgICB2YXIgc1RvcExlZnRYID0gc291cmNlLnggLSBsZW5ndGggLyAyO1xyXG4gICAgICAgIHZhciBzVG9wTGVmdFkgPSBzb3VyY2UueSAtIGxlbmd0aCAvIDI7XHJcblxyXG4gICAgICAgIHZhciB0VG9wTGVmdFggPSB0YXJnZXQueCAtIGxlbmd0aCAvIDI7XHJcbiAgICAgICAgdmFyIHRUb3BMZWZ0WSA9IHRhcmdldC55IC0gbGVuZ3RoIC8gMjtcclxuXHJcbiAgICAgICAgdmFyIG5leHRUb1NvdXJjZVggPSBuZXh0VG9Tb3VyY2UueCAtIGxlbmd0aCAvMjtcclxuICAgICAgICB2YXIgbmV4dFRvU291cmNlWSA9IG5leHRUb1NvdXJjZS55IC0gbGVuZ3RoIC8gMjtcclxuXHJcbiAgICAgICAgdmFyIG5leHRUb1RhcmdldFggPSBuZXh0VG9UYXJnZXQueCAtIGxlbmd0aCAvMjtcclxuICAgICAgICB2YXIgbmV4dFRvVGFyZ2V0WSA9IG5leHRUb1RhcmdldC55IC0gbGVuZ3RoIC8yO1xyXG5cclxuXHJcbiAgICAgICAgLy8gY29udmVydCB0byByZW5kZXJlZCBwYXJhbWV0ZXJzXHJcbiAgICAgICAgdmFyIHJlbmRlcmVkU291cmNlUG9zID0gY29udmVydFRvUmVuZGVyZWRQb3NpdGlvbih7eDogc1RvcExlZnRYLCB5OiBzVG9wTGVmdFl9KTtcclxuICAgICAgICB2YXIgcmVuZGVyZWRUYXJnZXRQb3MgPSBjb252ZXJ0VG9SZW5kZXJlZFBvc2l0aW9uKHt4OiB0VG9wTGVmdFgsIHk6IHRUb3BMZWZ0WX0pO1xyXG4gICAgICAgIGxlbmd0aCA9IGxlbmd0aCAqIGN5Lnpvb20oKSAvIDI7XHJcblxyXG4gICAgICAgIHZhciByZW5kZXJlZE5leHRUb1NvdXJjZSA9IGNvbnZlcnRUb1JlbmRlcmVkUG9zaXRpb24oe3g6IG5leHRUb1NvdXJjZVgsIHk6IG5leHRUb1NvdXJjZVl9KTtcclxuICAgICAgICB2YXIgcmVuZGVyZWROZXh0VG9UYXJnZXQgPSBjb252ZXJ0VG9SZW5kZXJlZFBvc2l0aW9uKHt4OiBuZXh0VG9UYXJnZXRYLCB5OiBuZXh0VG9UYXJnZXRZfSk7XHJcbiAgICAgICAgXHJcbiAgICAgICAgLy9ob3cgZmFyIHRvIGdvIGZyb20gdGhlIG5vZGUgYWxvbmcgdGhlIGVkZ2VcclxuICAgICAgICB2YXIgZGlzdGFuY2VGcm9tTm9kZSA9IGxlbmd0aDtcclxuXHJcbiAgICAgICAgdmFyIGRpc3RhbmNlU291cmNlID0gTWF0aC5zcXJ0KE1hdGgucG93KHJlbmRlcmVkTmV4dFRvU291cmNlLnggLSByZW5kZXJlZFNvdXJjZVBvcy54LDIpICsgTWF0aC5wb3cocmVuZGVyZWROZXh0VG9Tb3VyY2UueSAtIHJlbmRlcmVkU291cmNlUG9zLnksMikpOyAgICAgICAgXHJcbiAgICAgICAgdmFyIHNvdXJjZUVuZFBvaW50WCA9IHJlbmRlcmVkU291cmNlUG9zLnggKyAoKGRpc3RhbmNlRnJvbU5vZGUvIGRpc3RhbmNlU291cmNlKSogKHJlbmRlcmVkTmV4dFRvU291cmNlLnggLSByZW5kZXJlZFNvdXJjZVBvcy54KSk7XHJcbiAgICAgICAgdmFyIHNvdXJjZUVuZFBvaW50WSA9IHJlbmRlcmVkU291cmNlUG9zLnkgKyAoKGRpc3RhbmNlRnJvbU5vZGUvIGRpc3RhbmNlU291cmNlKSogKHJlbmRlcmVkTmV4dFRvU291cmNlLnkgLSByZW5kZXJlZFNvdXJjZVBvcy55KSk7XHJcblxyXG5cclxuICAgICAgICB2YXIgZGlzdGFuY2VUYXJnZXQgPSBNYXRoLnNxcnQoTWF0aC5wb3cocmVuZGVyZWROZXh0VG9UYXJnZXQueCAtIHJlbmRlcmVkVGFyZ2V0UG9zLngsMikgKyBNYXRoLnBvdyhyZW5kZXJlZE5leHRUb1RhcmdldC55IC0gcmVuZGVyZWRUYXJnZXRQb3MueSwyKSk7ICAgICAgICBcclxuICAgICAgICB2YXIgdGFyZ2V0RW5kUG9pbnRYID0gcmVuZGVyZWRUYXJnZXRQb3MueCArICgoZGlzdGFuY2VGcm9tTm9kZS8gZGlzdGFuY2VUYXJnZXQpKiAocmVuZGVyZWROZXh0VG9UYXJnZXQueCAtIHJlbmRlcmVkVGFyZ2V0UG9zLngpKTtcclxuICAgICAgICB2YXIgdGFyZ2V0RW5kUG9pbnRZID0gcmVuZGVyZWRUYXJnZXRQb3MueSArICgoZGlzdGFuY2VGcm9tTm9kZS8gZGlzdGFuY2VUYXJnZXQpKiAocmVuZGVyZWROZXh0VG9UYXJnZXQueSAtIHJlbmRlcmVkVGFyZ2V0UG9zLnkpKTsgXHJcblxyXG4gICAgICAgIC8vIHJlbmRlciBlbmQgcG9pbnQgc2hhcGUgZm9yIHNvdXJjZSBhbmQgdGFyZ2V0XHJcbiAgICAgICAgY3R4LmJlZ2luUGF0aCgpO1xyXG4gICAgICAgIGN0eC5hcmMoc291cmNlRW5kUG9pbnRYICsgbGVuZ3RoLCBzb3VyY2VFbmRQb2ludFkgKyBsZW5ndGgsIGxlbmd0aCwgMCwgMipNYXRoLlBJLCBmYWxzZSk7XHJcbiAgICAgICAgY3R4LmFyYyh0YXJnZXRFbmRQb2ludFggKyBsZW5ndGgsIHRhcmdldEVuZFBvaW50WSArIGxlbmd0aCwgbGVuZ3RoLCAwLCAyKk1hdGguUEksIGZhbHNlKTtcclxuICAgICAgICBjdHguZmlsbCgpO1xyXG4gICAgICAgIFxyXG4gICAgICAgIC8vIGRyYXdEaWFtb25kU2hhcGUocmVuZGVyZWRTb3VyY2VQb3MueCwgcmVuZGVyZWRTb3VyY2VQb3MueSwgbGVuZ3RoKTtcclxuICAgICAgICAvLyBkcmF3RGlhbW9uZFNoYXBlKHJlbmRlcmVkVGFyZ2V0UG9zLngsIHJlbmRlcmVkVGFyZ2V0UG9zLnksIGxlbmd0aCk7XHJcblxyXG4gICAgICAgIGZ1bmN0aW9uIGRyYXdEaWFtb25kU2hhcGUodG9wTGVmdFgsIHRvcExlZnRZLCBsZW5ndGgpe1xyXG4gICAgICAgICAgdmFyIGwgPSAobGVuZ3RoKSAvICgzICogNiArIDIpO1xyXG5cclxuICAgICAgICAgIC8vIERyYXcgYWxsIGNvcm5lcnNcclxuICAgICAgICAgIGRyYXdDb3JuZXIodG9wTGVmdFgsIHRvcExlZnRZICsgbGVuZ3RoLzIsIGwsICdsZWZ0Jyk7XHJcbiAgICAgICAgICBkcmF3Q29ybmVyKHRvcExlZnRYICsgbGVuZ3RoLzIsIHRvcExlZnRZLCBsLCAndG9wJyk7XHJcbiAgICAgICAgICBkcmF3Q29ybmVyKHRvcExlZnRYICsgbGVuZ3RoLzIsIHRvcExlZnRZICsgbGVuZ3RoLCBsLCAnYm90dG9tJyk7XHJcbiAgICAgICAgICBkcmF3Q29ybmVyKHRvcExlZnRYICsgbGVuZ3RoLCB0b3BMZWZ0WSArIGxlbmd0aC8yLCBsLCAncmlnaHQnKTtcclxuXHJcbiAgICAgICAgICBkcmF3RGFzaGVkTGluZSh0b3BMZWZ0WCwgdG9wTGVmdFkgKyBsZW5ndGgvMiwgdG9wTGVmdFggKyBsZW5ndGgvMiwgdG9wTGVmdFksIGwpO1xyXG4gICAgICAgICAgZHJhd0Rhc2hlZExpbmUodG9wTGVmdFggKyBsZW5ndGgvMiwgdG9wTGVmdFksIHRvcExlZnRYICsgbGVuZ3RoLCB0b3BMZWZ0WSArIGxlbmd0aC8yLCBsKTtcclxuICAgICAgICAgIGRyYXdEYXNoZWRMaW5lKHRvcExlZnRYICsgbGVuZ3RoLCB0b3BMZWZ0WSArIGxlbmd0aC8yLCB0b3BMZWZ0WCArIGxlbmd0aC8yLCB0b3BMZWZ0WSArIGxlbmd0aCwgbCk7XHJcbiAgICAgICAgICBkcmF3RGFzaGVkTGluZSh0b3BMZWZ0WCArIGxlbmd0aC8yLCB0b3BMZWZ0WSArIGxlbmd0aCwgdG9wTGVmdFgsIHRvcExlZnRZICsgbGVuZ3RoLzIsIGwpO1xyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgZnVuY3Rpb24gZHJhd0Nvcm5lcih4LCB5LCBsLCBjb3JuZXIpe1xyXG4gICAgICAgICAgY3R4LmJlZ2luUGF0aCgpO1xyXG4gICAgICAgICAgY3R4Lm1vdmVUbyh4LCB5KTtcclxuICAgICAgICAgIHN3aXRjaChjb3JuZXIpe1xyXG4gICAgICAgICAgICBjYXNlICdsZWZ0Jzoge1xyXG4gICAgICAgICAgICAgIGN0eC5saW5lVG8oeCArIGwsIHkgLSBsKTtcclxuICAgICAgICAgICAgICBjdHgubGluZVRvKHgsIHkpO1xyXG4gICAgICAgICAgICAgIGN0eC5saW5lVG8oeCArIGwsIHkgKyBsKTtcclxuICAgICAgICAgICAgICBicmVhaztcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICBjYXNlICd0b3AnOiB7XHJcbiAgICAgICAgICAgICAgY3R4LmxpbmVUbyh4IC0gbCwgeSArIGwpO1xyXG4gICAgICAgICAgICAgIGN0eC5saW5lVG8oeCwgeSk7XHJcbiAgICAgICAgICAgICAgY3R4LmxpbmVUbyh4ICsgbCwgeSArIGwpO1xyXG4gICAgICAgICAgICAgIGJyZWFrO1xyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgICAgIGNhc2UgJ3JpZ2h0Jzoge1xyXG4gICAgICAgICAgICAgIGN0eC5saW5lVG8oeCAtIGwsIHkgLSBsKTtcclxuICAgICAgICAgICAgICBjdHgubGluZVRvKHgsIHkpO1xyXG4gICAgICAgICAgICAgIGN0eC5saW5lVG8oeCAtIGwsIHkgKyBsKTtcclxuICAgICAgICAgICAgICBicmVhaztcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICBjYXNlICdib3R0b20nOiB7XHJcbiAgICAgICAgICAgICAgY3R4LmxpbmVUbyh4ICsgbCwgeSAtIGwpO1xyXG4gICAgICAgICAgICAgIGN0eC5saW5lVG8oeCwgeSk7XHJcbiAgICAgICAgICAgICAgY3R4LmxpbmVUbyh4IC0gbCwgeSAtIGwpO1xyXG4gICAgICAgICAgICAgIGJyZWFrO1xyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgICAgIGNhc2UgJ2RlZmF1bHQnOlxyXG4gICAgICAgICAgICAgIHJldHVybjtcclxuICAgICAgICAgIH1cclxuICAgICAgICAgIGN0eC5zdHJva2UoKTtcclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIGZ1bmN0aW9uIGRyYXdEYXNoZWRMaW5lKHgxLCB5MSwgeDIsIHkyLCBsKXtcclxuICAgICAgICAgIGN0eC5iZWdpblBhdGgoKTtcclxuICAgICAgICAgIGN0eC5tb3ZlVG8oeDEsIHkxKTtcclxuICAgICAgICAgIGN0eC5saW5lVG8oeDIsIHkyKTtcclxuICAgICAgICAgIGN0eC5zZXRMaW5lRGFzaChbMipsLGxdKTtcclxuICAgICAgICAgIGN0eC5zdHJva2UoKTtcclxuICAgICAgICAgIGN0eC5zZXRMaW5lRGFzaChbXSk7XHJcbiAgICAgICAgfVxyXG4gICAgICB9XHJcblxyXG4gICAgICAvLyBjaGFuZ2VzIGNvbG9yIHRvbmVcclxuICAgICAgLy8gaHR0cHM6Ly9zdGFja292ZXJmbG93LmNvbS9xdWVzdGlvbnMvNTU2MDI0OC9wcm9ncmFtbWF0aWNhbGx5LWxpZ2h0ZW4tb3ItZGFya2VuLWEtaGV4LWNvbG9yLW9yLXJnYi1hbmQtYmxlbmQtY29sb3JzXHJcbiAgICAgIGZ1bmN0aW9uIHNoYWRlQmxlbmQocCxjMCxjMSkge1xyXG4gICAgICAgIHZhciBuPXA8MD9wKi0xOnAsdT1NYXRoLnJvdW5kLHc9cGFyc2VJbnQ7XHJcbiAgICAgICAgaWYoYzAubGVuZ3RoPjcpe1xyXG4gICAgICAgICAgdmFyIGY9YzAuc3BsaXQoXCIsXCIpLHQ9KGMxP2MxOnA8MD9cInJnYigwLDAsMClcIjpcInJnYigyNTUsMjU1LDI1NSlcIikuc3BsaXQoXCIsXCIpLFI9dyhmWzBdLnNsaWNlKDQpKSxHPXcoZlsxXSksQj13KGZbMl0pO1xyXG4gICAgICAgICAgcmV0dXJuIFwicmdiKFwiKyh1KCh3KHRbMF0uc2xpY2UoNCkpLVIpKm4pK1IpK1wiLFwiKyh1KCh3KHRbMV0pLUcpKm4pK0cpK1wiLFwiKyh1KCh3KHRbMl0pLUIpKm4pK0IpK1wiKVwiXHJcbiAgICAgICAgfVxyXG4gICAgICAgIGVsc2V7XHJcbiAgICAgICAgICB2YXIgZj13KGMwLnNsaWNlKDEpLDE2KSx0PXcoKGMxP2MxOnA8MD9cIiMwMDAwMDBcIjpcIiNGRkZGRkZcIikuc2xpY2UoMSksMTYpLFIxPWY+PjE2LEcxPWY+PjgmMHgwMEZGLEIxPWYmMHgwMDAwRkY7XHJcbiAgICAgICAgICByZXR1cm4gXCIjXCIrKDB4MTAwMDAwMCsodSgoKHQ+PjE2KS1SMSkqbikrUjEpKjB4MTAwMDArKHUoKCh0Pj44JjB4MDBGRiktRzEpKm4pK0cxKSoweDEwMCsodSgoKHQmMHgwMDAwRkYpLUIxKSpuKStCMSkpLnRvU3RyaW5nKDE2KS5zbGljZSgxKVxyXG4gICAgICAgIH1cclxuICAgICAgfVxyXG5cclxuICAgICAgLy8gZ2V0IHRoZSBsZW5ndGggb2YgYmVuZCBwb2ludHMgdG8gYmUgcmVuZGVyZWRcclxuICAgICAgZnVuY3Rpb24gZ2V0QmVuZFNoYXBlc0xlbmd0aChlZGdlKSB7XHJcbiAgICAgICAgdmFyIGZhY3RvciA9IG9wdGlvbnMoKS5iZW5kU2hhcGVTaXplRmFjdG9yO1xyXG4gICAgICAgIGlmIChwYXJzZUZsb2F0KGVkZ2UuY3NzKCd3aWR0aCcpKSA8PSAyLjUpXHJcbiAgICAgICAgICByZXR1cm4gMi41ICogZmFjdG9yO1xyXG4gICAgICAgIGVsc2UgcmV0dXJuIHBhcnNlRmxvYXQoZWRnZS5jc3MoJ3dpZHRoJykpKmZhY3RvcjtcclxuICAgICAgfVxyXG4gICAgICBcclxuICAgICAgLy8gY2hlY2sgaWYgdGhlIHBvaW50IHJlcHJlc2VudGVkIGJ5IHt4LCB5fSBpcyBpbnNpZGUgdGhlIGJlbmQgc2hhcGVcclxuICAgICAgZnVuY3Rpb24gY2hlY2tJZkluc2lkZUJlbmRTaGFwZSh4LCB5LCBsZW5ndGgsIGNlbnRlclgsIGNlbnRlclkpe1xyXG4gICAgICAgIHZhciBtaW5YID0gY2VudGVyWCAtIGxlbmd0aCAvIDI7XHJcbiAgICAgICAgdmFyIG1heFggPSBjZW50ZXJYICsgbGVuZ3RoIC8gMjtcclxuICAgICAgICB2YXIgbWluWSA9IGNlbnRlclkgLSBsZW5ndGggLyAyO1xyXG4gICAgICAgIHZhciBtYXhZID0gY2VudGVyWSArIGxlbmd0aCAvIDI7XHJcbiAgICAgICAgXHJcbiAgICAgICAgdmFyIGluc2lkZSA9ICh4ID49IG1pblggJiYgeCA8PSBtYXhYKSAmJiAoeSA+PSBtaW5ZICYmIHkgPD0gbWF4WSk7XHJcbiAgICAgICAgcmV0dXJuIGluc2lkZTtcclxuICAgICAgfVxyXG5cclxuICAgICAgLy8gZ2V0IHRoZSBpbmRleCBvZiBiZW5kIHBvaW50IGNvbnRhaW5pbmcgdGhlIHBvaW50IHJlcHJlc2VudGVkIGJ5IHt4LCB5fVxyXG4gICAgICBmdW5jdGlvbiBnZXRDb250YWluaW5nQmVuZFNoYXBlSW5kZXgoeCwgeSwgZWRnZSkge1xyXG4gICAgICAgIGlmKGVkZ2UuZGF0YSgnY3llZGdlYmVuZGVkaXRpbmdXZWlnaHRzJykgPT0gbnVsbCB8fCBlZGdlLmRhdGEoJ2N5ZWRnZWJlbmRlZGl0aW5nV2VpZ2h0cycpLmxlbmd0aCA9PSAwKXtcclxuICAgICAgICAgIHJldHVybiAtMTtcclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIHZhciBzZWdwdHMgPSBiZW5kUG9pbnRVdGlsaXRpZXMuZ2V0U2VnbWVudFBvaW50cyhlZGdlKTsvL2VkZ2UuX3ByaXZhdGUucmRhdGEuc2VncHRzO1xyXG4gICAgICAgIHZhciBsZW5ndGggPSBnZXRCZW5kU2hhcGVzTGVuZ3RoKGVkZ2UpO1xyXG5cclxuICAgICAgICBmb3IodmFyIGkgPSAwOyBzZWdwdHMgJiYgaSA8IHNlZ3B0cy5sZW5ndGg7IGkgPSBpICsgMil7XHJcbiAgICAgICAgICB2YXIgYmVuZFggPSBzZWdwdHNbaV07XHJcbiAgICAgICAgICB2YXIgYmVuZFkgPSBzZWdwdHNbaSArIDFdO1xyXG5cclxuICAgICAgICAgIHZhciBpbnNpZGUgPSBjaGVja0lmSW5zaWRlQmVuZFNoYXBlKHgsIHksIGxlbmd0aCwgYmVuZFgsIGJlbmRZKTtcclxuICAgICAgICAgIGlmKGluc2lkZSl7XHJcbiAgICAgICAgICAgIHJldHVybiBpIC8gMjtcclxuICAgICAgICAgIH1cclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIHJldHVybiAtMTtcclxuICAgICAgfTtcclxuXHJcbiAgICAgIGZ1bmN0aW9uIGdldENvbnRhaW5pbmdFbmRQb2ludCh4LCB5LCBlZGdlKXtcclxuICAgICAgICB2YXIgbGVuZ3RoID0gZ2V0QmVuZFNoYXBlc0xlbmd0aChlZGdlKTtcclxuICAgICAgICB2YXIgYWxsUHRzID0gZWRnZS5fcHJpdmF0ZS5yc2NyYXRjaC5hbGxwdHM7XHJcbiAgICAgICAgdmFyIHNyYyA9IHtcclxuICAgICAgICAgIHg6IGFsbFB0c1swXSxcclxuICAgICAgICAgIHk6IGFsbFB0c1sxXVxyXG4gICAgICAgIH1cclxuICAgICAgICB2YXIgdGFyZ2V0ID0ge1xyXG4gICAgICAgICAgeDogYWxsUHRzW2FsbFB0cy5sZW5ndGgtMl0sXHJcbiAgICAgICAgICB5OiBhbGxQdHNbYWxsUHRzLmxlbmd0aC0xXVxyXG4gICAgICAgIH1cclxuICAgICAgICBjb252ZXJ0VG9SZW5kZXJlZFBvc2l0aW9uKHNyYyk7XHJcbiAgICAgICAgY29udmVydFRvUmVuZGVyZWRQb3NpdGlvbih0YXJnZXQpO1xyXG4gICAgICAgIFxyXG4gICAgICAgIC8vIFNvdXJjZTowLCBUYXJnZXQ6MSwgTm9uZTotMVxyXG4gICAgICAgIGlmKGNoZWNrSWZJbnNpZGVCZW5kU2hhcGUoeCwgeSwgbGVuZ3RoLCBzcmMueCwgc3JjLnkpKVxyXG4gICAgICAgICAgcmV0dXJuIDA7XHJcbiAgICAgICAgZWxzZSBpZihjaGVja0lmSW5zaWRlQmVuZFNoYXBlKHgsIHksIGxlbmd0aCwgdGFyZ2V0LngsIHRhcmdldC55KSlcclxuICAgICAgICAgIHJldHVybiAxO1xyXG4gICAgICAgIGVsc2VcclxuICAgICAgICAgIHJldHVybiAtMTtcclxuICAgICAgfVxyXG4gICAgICBcclxuICAgICAgLy8gc3RvcmUgdGhlIGN1cnJlbnQgc3RhdHVzIG9mIGdlc3R1cmVzIGFuZCBzZXQgdGhlbSB0byBmYWxzZVxyXG4gICAgICBmdW5jdGlvbiBkaXNhYmxlR2VzdHVyZXMoKSB7XHJcbiAgICAgICAgbGFzdFBhbm5pbmdFbmFibGVkID0gY3kucGFubmluZ0VuYWJsZWQoKTtcclxuICAgICAgICBsYXN0Wm9vbWluZ0VuYWJsZWQgPSBjeS56b29taW5nRW5hYmxlZCgpO1xyXG4gICAgICAgIGxhc3RCb3hTZWxlY3Rpb25FbmFibGVkID0gY3kuYm94U2VsZWN0aW9uRW5hYmxlZCgpO1xyXG5cclxuICAgICAgICBjeS56b29taW5nRW5hYmxlZChmYWxzZSlcclxuICAgICAgICAgIC5wYW5uaW5nRW5hYmxlZChmYWxzZSlcclxuICAgICAgICAgIC5ib3hTZWxlY3Rpb25FbmFibGVkKGZhbHNlKTtcclxuICAgICAgfVxyXG4gICAgICBcclxuICAgICAgLy8gcmVzZXQgdGhlIGdlc3R1cmVzIGJ5IHRoZWlyIGxhdGVzdCBzdGF0dXNcclxuICAgICAgZnVuY3Rpb24gcmVzZXRHZXN0dXJlcygpIHtcclxuICAgICAgICBjeS56b29taW5nRW5hYmxlZChsYXN0Wm9vbWluZ0VuYWJsZWQpXHJcbiAgICAgICAgICAucGFubmluZ0VuYWJsZWQobGFzdFBhbm5pbmdFbmFibGVkKVxyXG4gICAgICAgICAgLmJveFNlbGVjdGlvbkVuYWJsZWQobGFzdEJveFNlbGVjdGlvbkVuYWJsZWQpO1xyXG4gICAgICB9XHJcblxyXG4gICAgICBmdW5jdGlvbiBtb3ZlQmVuZFBvaW50cyhwb3NpdGlvbkRpZmYsIGVkZ2VzKSB7XHJcbiAgICAgICAgICBlZGdlcy5mb3JFYWNoKGZ1bmN0aW9uKCBlZGdlICl7XHJcbiAgICAgICAgICAgICAgdmFyIHByZXZpb3VzQmVuZFBvaW50c1Bvc2l0aW9uID0gYmVuZFBvaW50VXRpbGl0aWVzLmdldFNlZ21lbnRQb2ludHMoZWRnZSk7XHJcbiAgICAgICAgICAgICAgdmFyIG5leHRCZW5kUG9pbnRzUG9zaXRpb24gPSBbXTtcclxuICAgICAgICAgICAgICBpZiAocHJldmlvdXNCZW5kUG9pbnRzUG9zaXRpb24gIT0gdW5kZWZpbmVkKVxyXG4gICAgICAgICAgICAgIHtcclxuICAgICAgICAgICAgICAgIGZvciAoaT0wOyBpPHByZXZpb3VzQmVuZFBvaW50c1Bvc2l0aW9uLmxlbmd0aDsgaSs9MilcclxuICAgICAgICAgICAgICAgIHtcclxuICAgICAgICAgICAgICAgICAgICBuZXh0QmVuZFBvaW50c1Bvc2l0aW9uLnB1c2goe3g6IHByZXZpb3VzQmVuZFBvaW50c1Bvc2l0aW9uW2ldK3Bvc2l0aW9uRGlmZi54LCB5OiBwcmV2aW91c0JlbmRQb2ludHNQb3NpdGlvbltpKzFdK3Bvc2l0aW9uRGlmZi55fSk7XHJcbiAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgICBlZGdlLmRhdGEoJ2JlbmRQb2ludFBvc2l0aW9ucycsbmV4dEJlbmRQb2ludHNQb3NpdGlvbik7XHJcbiAgICAgICAgICAgICAgfVxyXG5cclxuICAgICAgICAgIH0pO1xyXG4gICAgICAgICAgYmVuZFBvaW50VXRpbGl0aWVzLmluaXRCZW5kUG9pbnRzKG9wdGlvbnMoKS5iZW5kUG9zaXRpb25zRnVuY3Rpb24sIGVkZ2VzKTtcclxuICAgICAgICAgIGN5LnRyaWdnZXIoJ2JlbmRQb2ludE1vdmVtZW50Jyk7XHJcbiAgICAgIH1cclxuXHJcbiAgICAgIHsgIFxyXG4gICAgICAgIGxhc3RQYW5uaW5nRW5hYmxlZCA9IGN5LnBhbm5pbmdFbmFibGVkKCk7XHJcbiAgICAgICAgbGFzdFpvb21pbmdFbmFibGVkID0gY3kuem9vbWluZ0VuYWJsZWQoKTtcclxuICAgICAgICBsYXN0Qm94U2VsZWN0aW9uRW5hYmxlZCA9IGN5LmJveFNlbGVjdGlvbkVuYWJsZWQoKTtcclxuICAgICAgICBcclxuICAgICAgICAvLyBJbml0aWxpemUgdGhlIGVkZ2VUb0hpZ2hsaWdodEJlbmRzIGFuZCBudW1iZXJPZlNlbGVjdGVkRWRnZXNcclxuICAgICAgICB7XHJcbiAgICAgICAgICB2YXIgc2VsZWN0ZWRFZGdlcyA9IGN5LmVkZ2VzKCc6c2VsZWN0ZWQnKTtcclxuICAgICAgICAgIHZhciBudW1iZXJPZlNlbGVjdGVkRWRnZXMgPSBzZWxlY3RlZEVkZ2VzLmxlbmd0aDtcclxuICAgICAgICAgIFxyXG4gICAgICAgICAgaWYgKCBudW1iZXJPZlNlbGVjdGVkRWRnZXMgPT09IDEgKSB7XHJcbiAgICAgICAgICAgIGVkZ2VUb0hpZ2hsaWdodEJlbmRzID0gc2VsZWN0ZWRFZGdlc1swXTtcclxuICAgICAgICAgIH1cclxuICAgICAgICB9XHJcbiAgICAgICAgXHJcbiAgICAgICAgY3kuYmluZCgnem9vbSBwYW4nLCBlWm9vbSA9IGZ1bmN0aW9uICgpIHtcclxuICAgICAgICAgIGlmICggIWVkZ2VUb0hpZ2hsaWdodEJlbmRzICkge1xyXG4gICAgICAgICAgICByZXR1cm47XHJcbiAgICAgICAgICB9XHJcbiAgICAgICAgICBcclxuICAgICAgICAgIHJlZnJlc2hEcmF3cygpO1xyXG4gICAgICAgIH0pO1xyXG5cclxuICAgICAgICBjeS5vbignZGF0YScsICdlZGdlJywgIGZ1bmN0aW9uICgpIHtcclxuICAgICAgICAgIHJlZnJlc2hEcmF3cygpO1xyXG4gICAgICAgIH0pO1xyXG5cclxuICAgICAgICBjeS5vbigncG9zaXRpb24nLCAnbm9kZScsIGVQb3NpdGlvbiA9IGZ1bmN0aW9uICgpIHtcclxuICAgICAgICAgIHZhciBub2RlID0gdGhpcztcclxuICAgICAgICAgIFxyXG4gICAgICAgICAgLy8gSWYgdGhlcmUgaXMgbm8gZWRnZSB0byBoaWdobGlnaHQgYmVuZHMgb3IgdGhpcyBub2RlIGlzIG5vdCBhbnkgZW5kIG9mIHRoYXQgZWRnZSByZXR1cm4gZGlyZWN0bHlcclxuICAgICAgICAgIGlmICggIWVkZ2VUb0hpZ2hsaWdodEJlbmRzIHx8ICEoIGVkZ2VUb0hpZ2hsaWdodEJlbmRzLmRhdGEoJ3NvdXJjZScpID09PSBub2RlLmlkKCkgXHJcbiAgICAgICAgICAgICAgICAgIHx8IGVkZ2VUb0hpZ2hsaWdodEJlbmRzLmRhdGEoJ3RhcmdldCcpID09PSBub2RlLmlkKCkgKSApIHtcclxuICAgICAgICAgICAgcmV0dXJuO1xyXG4gICAgICAgICAgfVxyXG4gICAgICAgICAgXHJcbiAgICAgICAgICByZWZyZXNoRHJhd3MoKTtcclxuICAgICAgICB9KTtcclxuXHJcbiAgICAgICAgY3kub24oJ3N0eWxlJywgJ2VkZ2UuZWRnZWJlbmRlZGl0aW5nLWhhc2JlbmRwb2ludHM6c2VsZWN0ZWQnLCBlU3R5bGUgPSBmdW5jdGlvbiAoKSB7XHJcbiAgICAgICAgICByZWZyZXNoRHJhd3MoKTtcclxuICAgICAgICB9KTtcclxuXHJcbiAgICAgICAgY3kub24oJ3JlbW92ZScsICdlZGdlJywgZVJlbW92ZSA9IGZ1bmN0aW9uICgpIHtcclxuICAgICAgICAgIHZhciBlZGdlID0gdGhpcztcclxuICAgICAgICAgIGlmIChlZGdlLnNlbGVjdGVkKCkpIHtcclxuICAgICAgICAgICAgbnVtYmVyT2ZTZWxlY3RlZEVkZ2VzID0gbnVtYmVyT2ZTZWxlY3RlZEVkZ2VzIC0gMTtcclxuICAgICAgICAgICAgXHJcbiAgICAgICAgICAgIGN5LnN0YXJ0QmF0Y2goKTtcclxuICAgICAgICAgICAgXHJcbiAgICAgICAgICAgIGlmIChlZGdlVG9IaWdobGlnaHRCZW5kcykge1xyXG4gICAgICAgICAgICAgIGVkZ2VUb0hpZ2hsaWdodEJlbmRzLnJlbW92ZUNsYXNzKCdjeS1lZGdlLWJlbmQtZWRpdGluZy1oaWdobGlnaHQtYmVuZHMnKTtcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICBcclxuICAgICAgICAgICAgaWYgKG51bWJlck9mU2VsZWN0ZWRFZGdlcyA9PT0gMSkge1xyXG4gICAgICAgICAgICAgIHZhciBzZWxlY3RlZEVkZ2VzID0gY3kuZWRnZXMoJzpzZWxlY3RlZCcpO1xyXG4gICAgICAgICAgICAgIFxyXG4gICAgICAgICAgICAgIC8vIElmIHVzZXIgcmVtb3ZlcyBhbGwgc2VsZWN0ZWQgZWRnZXMgYXQgYSBzaW5nbGUgb3BlcmF0aW9uIHRoZW4gb3VyICdudW1iZXJPZlNlbGVjdGVkRWRnZXMnXHJcbiAgICAgICAgICAgICAgLy8gbWF5IGJlIG1pc2xlYWRpbmcuIFRoZXJlZm9yZSB3ZSBuZWVkIHRvIGNoZWNrIGlmIHRoZSBudW1iZXIgb2YgZWRnZXMgdG8gaGlnaGxpZ2h0IGlzIHJlYWx5IDEgaGVyZS5cclxuICAgICAgICAgICAgICBpZiAoc2VsZWN0ZWRFZGdlcy5sZW5ndGggPT09IDEpIHtcclxuICAgICAgICAgICAgICAgIGVkZ2VUb0hpZ2hsaWdodEJlbmRzID0gc2VsZWN0ZWRFZGdlc1swXTtcclxuICAgICAgICAgICAgICAgIGVkZ2VUb0hpZ2hsaWdodEJlbmRzLmFkZENsYXNzKCdjeS1lZGdlLWJlbmQtZWRpdGluZy1oaWdobGlnaHQtYmVuZHMnKTtcclxuICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgZWxzZSB7XHJcbiAgICAgICAgICAgICAgICBlZGdlVG9IaWdobGlnaHRCZW5kcyA9IHVuZGVmaW5lZDtcclxuICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgZWxzZSB7XHJcbiAgICAgICAgICAgICAgZWRnZVRvSGlnaGxpZ2h0QmVuZHMgPSB1bmRlZmluZWQ7XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgXHJcbiAgICAgICAgICAgIGN5LmVuZEJhdGNoKCk7XHJcbiAgICAgICAgICB9XHJcbiAgICAgICAgICByZWZyZXNoRHJhd3MoKTtcclxuICAgICAgICB9KTtcclxuICAgICAgICBcclxuICAgICAgICAgY3kub24oJ2FkZCcsICdlZGdlJywgZUFkZCA9IGZ1bmN0aW9uICgpIHtcclxuICAgICAgICAgIHZhciBlZGdlID0gdGhpcztcclxuICAgICAgICAgIGlmIChlZGdlLnNlbGVjdGVkKCkpIHtcclxuICAgICAgICAgICAgbnVtYmVyT2ZTZWxlY3RlZEVkZ2VzID0gbnVtYmVyT2ZTZWxlY3RlZEVkZ2VzICsgMTtcclxuICAgICAgICAgICAgXHJcbiAgICAgICAgICAgIGN5LnN0YXJ0QmF0Y2goKTtcclxuICAgICAgICAgICAgXHJcbiAgICAgICAgICAgIGlmIChlZGdlVG9IaWdobGlnaHRCZW5kcykge1xyXG4gICAgICAgICAgICAgIGVkZ2VUb0hpZ2hsaWdodEJlbmRzLnJlbW92ZUNsYXNzKCdjeS1lZGdlLWJlbmQtZWRpdGluZy1oaWdobGlnaHQtYmVuZHMnKTtcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICBcclxuICAgICAgICAgICAgaWYgKG51bWJlck9mU2VsZWN0ZWRFZGdlcyA9PT0gMSkge1xyXG4gICAgICAgICAgICAgIGVkZ2VUb0hpZ2hsaWdodEJlbmRzID0gZWRnZTtcclxuICAgICAgICAgICAgICBlZGdlVG9IaWdobGlnaHRCZW5kcy5hZGRDbGFzcygnY3ktZWRnZS1iZW5kLWVkaXRpbmctaGlnaGxpZ2h0LWJlbmRzJyk7XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgZWxzZSB7XHJcbiAgICAgICAgICAgICAgZWRnZVRvSGlnaGxpZ2h0QmVuZHMgPSB1bmRlZmluZWQ7XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgXHJcbiAgICAgICAgICAgIGN5LmVuZEJhdGNoKCk7XHJcbiAgICAgICAgICB9XHJcbiAgICAgICAgICByZWZyZXNoRHJhd3MoKTtcclxuICAgICAgICB9KTtcclxuICAgICAgICBcclxuICAgICAgICBjeS5vbignc2VsZWN0JywgJ2VkZ2UnLCBlU2VsZWN0ID0gZnVuY3Rpb24gKCkge1xyXG4gICAgICAgICAgdmFyIGVkZ2UgPSB0aGlzO1xyXG5cclxuICAgICAgICAgIGlmKGVkZ2UudGFyZ2V0KCkuY29ubmVjdGVkRWRnZXMoKS5sZW5ndGggPT0gMCB8fCBlZGdlLnNvdXJjZSgpLmNvbm5lY3RlZEVkZ2VzKCkubGVuZ3RoID09IDApe1xyXG4gICAgICAgICAgICByZXR1cm47XHJcbiAgICAgICAgICB9XHJcblxyXG4gICAgICAgICBcclxuICAgICAgICAgIG51bWJlck9mU2VsZWN0ZWRFZGdlcyA9IG51bWJlck9mU2VsZWN0ZWRFZGdlcyArIDE7XHJcbiAgICAgICAgICBcclxuICAgICAgICAgIGN5LnN0YXJ0QmF0Y2goKTtcclxuICAgICAgICAgICAgXHJcbiAgICAgICAgICBpZiAoZWRnZVRvSGlnaGxpZ2h0QmVuZHMpIHtcclxuICAgICAgICAgICAgZWRnZVRvSGlnaGxpZ2h0QmVuZHMucmVtb3ZlQ2xhc3MoJ2N5LWVkZ2UtYmVuZC1lZGl0aW5nLWhpZ2hsaWdodC1iZW5kcycpO1xyXG4gICAgICAgICAgfVxyXG4gICAgICAgICAgICBcclxuICAgICAgICAgIGlmIChudW1iZXJPZlNlbGVjdGVkRWRnZXMgPT09IDEpIHtcclxuICAgICAgICAgICAgZWRnZVRvSGlnaGxpZ2h0QmVuZHMgPSBlZGdlO1xyXG4gICAgICAgICAgICBlZGdlVG9IaWdobGlnaHRCZW5kcy5hZGRDbGFzcygnY3ktZWRnZS1iZW5kLWVkaXRpbmctaGlnaGxpZ2h0LWJlbmRzJyk7XHJcbiAgICAgICAgICB9XHJcbiAgICAgICAgICBlbHNlIHtcclxuICAgICAgICAgICAgZWRnZVRvSGlnaGxpZ2h0QmVuZHMgPSB1bmRlZmluZWQ7XHJcbiAgICAgICAgICB9XHJcbiAgICAgICAgICBcclxuICAgICAgICAgIGN5LmVuZEJhdGNoKCk7XHJcbiAgICAgICAgICByZWZyZXNoRHJhd3MoKTtcclxuICAgICAgICB9KTtcclxuICAgICAgICBcclxuICAgICAgICBjeS5vbigndW5zZWxlY3QnLCAnZWRnZScsIGVVbnNlbGVjdCA9IGZ1bmN0aW9uICgpIHtcclxuICAgICAgICAgIG51bWJlck9mU2VsZWN0ZWRFZGdlcyA9IG51bWJlck9mU2VsZWN0ZWRFZGdlcyAtIDE7XHJcbiAgICAgICAgICAgIFxyXG4gICAgICAgICAgY3kuc3RhcnRCYXRjaCgpO1xyXG4gICAgICAgICAgICBcclxuICAgICAgICAgIGlmIChlZGdlVG9IaWdobGlnaHRCZW5kcykge1xyXG4gICAgICAgICAgICBlZGdlVG9IaWdobGlnaHRCZW5kcy5yZW1vdmVDbGFzcygnY3ktZWRnZS1iZW5kLWVkaXRpbmctaGlnaGxpZ2h0LWJlbmRzJyk7XHJcbiAgICAgICAgICB9XHJcbiAgICAgICAgICAgIFxyXG4gICAgICAgICAgaWYgKG51bWJlck9mU2VsZWN0ZWRFZGdlcyA9PT0gMSkge1xyXG4gICAgICAgICAgICB2YXIgc2VsZWN0ZWRFZGdlcyA9IGN5LmVkZ2VzKCc6c2VsZWN0ZWQnKTtcclxuICAgICAgICAgICAgXHJcbiAgICAgICAgICAgIC8vIElmIHVzZXIgdW5zZWxlY3RzIGFsbCBlZGdlcyBieSB0YXBwaW5nIHRvIHRoZSBjb3JlIGV0Yy4gdGhlbiBvdXIgJ251bWJlck9mU2VsZWN0ZWRFZGdlcydcclxuICAgICAgICAgICAgLy8gbWF5IGJlIG1pc2xlYWRpbmcuIFRoZXJlZm9yZSB3ZSBuZWVkIHRvIGNoZWNrIGlmIHRoZSBudW1iZXIgb2YgZWRnZXMgdG8gaGlnaGxpZ2h0IGlzIHJlYWx5IDEgaGVyZS5cclxuICAgICAgICAgICAgaWYgKHNlbGVjdGVkRWRnZXMubGVuZ3RoID09PSAxKSB7XHJcbiAgICAgICAgICAgICAgZWRnZVRvSGlnaGxpZ2h0QmVuZHMgPSBzZWxlY3RlZEVkZ2VzWzBdO1xyXG4gICAgICAgICAgICAgIGVkZ2VUb0hpZ2hsaWdodEJlbmRzLmFkZENsYXNzKCdjeS1lZGdlLWJlbmQtZWRpdGluZy1oaWdobGlnaHQtYmVuZHMnKTtcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICBlbHNlIHtcclxuICAgICAgICAgICAgICBlZGdlVG9IaWdobGlnaHRCZW5kcyA9IHVuZGVmaW5lZDtcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgICAgfVxyXG4gICAgICAgICAgZWxzZSB7XHJcbiAgICAgICAgICAgIGVkZ2VUb0hpZ2hsaWdodEJlbmRzID0gdW5kZWZpbmVkO1xyXG4gICAgICAgICAgfVxyXG4gICAgICAgICAgXHJcbiAgICAgICAgICBjeS5lbmRCYXRjaCgpO1xyXG4gICAgICAgICAgcmVmcmVzaERyYXdzKCk7XHJcbiAgICAgICAgfSk7XHJcbiAgICAgICAgXHJcbiAgICAgICAgdmFyIG1vdmVkQmVuZEluZGV4O1xyXG4gICAgICAgIHZhciBtb3ZlZEJlbmRFZGdlO1xyXG4gICAgICAgIHZhciBtb3ZlQmVuZFBhcmFtO1xyXG4gICAgICAgIHZhciBjcmVhdGVCZW5kT25EcmFnO1xyXG4gICAgICAgIHZhciBtb3ZlZEVuZFBvaW50O1xyXG4gICAgICAgIHZhciBkdW1teU5vZGU7XHJcbiAgICAgICAgdmFyIGRldGFjaGVkTm9kZTtcclxuICAgICAgICB2YXIgbm9kZVRvQXR0YWNoO1xyXG4gICAgICAgIFxyXG4gICAgICAgIGN5Lm9uKCd0YXBzdGFydCcsICdlZGdlJywgZVRhcFN0YXJ0ID0gZnVuY3Rpb24gKGV2ZW50KSB7XHJcbiAgICAgICAgICB2YXIgZWRnZSA9IHRoaXM7XHJcblxyXG4gICAgICAgICAgaWYgKCFlZGdlVG9IaWdobGlnaHRCZW5kcyB8fCBlZGdlVG9IaWdobGlnaHRCZW5kcy5pZCgpICE9PSBlZGdlLmlkKCkpIHtcclxuICAgICAgICAgICAgY3JlYXRlQmVuZE9uRHJhZyA9IGZhbHNlO1xyXG4gICAgICAgICAgICByZXR1cm47XHJcbiAgICAgICAgICB9XHJcbiAgICAgICAgICBcclxuICAgICAgICAgIG1vdmVkQmVuZEVkZ2UgPSBlZGdlO1xyXG4gICAgICAgICAgXHJcbiAgICAgICAgICBtb3ZlQmVuZFBhcmFtID0ge1xyXG4gICAgICAgICAgICBlZGdlOiBlZGdlLFxyXG4gICAgICAgICAgICB3ZWlnaHRzOiBlZGdlLmRhdGEoJ2N5ZWRnZWJlbmRlZGl0aW5nV2VpZ2h0cycpID8gW10uY29uY2F0KGVkZ2UuZGF0YSgnY3llZGdlYmVuZGVkaXRpbmdXZWlnaHRzJykpIDogW10sXHJcbiAgICAgICAgICAgIGRpc3RhbmNlczogZWRnZS5kYXRhKCdjeWVkZ2ViZW5kZWRpdGluZ0Rpc3RhbmNlcycpID8gW10uY29uY2F0KGVkZ2UuZGF0YSgnY3llZGdlYmVuZGVkaXRpbmdEaXN0YW5jZXMnKSkgOiBbXVxyXG4gICAgICAgICAgfTtcclxuICAgICAgICAgIFxyXG4gICAgICAgICAgdmFyIGN5UG9zID0gZXZlbnQucG9zaXRpb24gfHwgZXZlbnQuY3lQb3NpdGlvbjtcclxuICAgICAgICAgIHZhciBjeVBvc1ggPSBjeVBvcy54O1xyXG4gICAgICAgICAgdmFyIGN5UG9zWSA9IGN5UG9zLnk7XHJcblxyXG4gICAgICAgICAgdmFyIGluZGV4ID0gZ2V0Q29udGFpbmluZ0JlbmRTaGFwZUluZGV4KGN5UG9zWCwgY3lQb3NZLCBlZGdlKTtcclxuICAgICAgICAgIFxyXG4gICAgICAgICAgLy8gR2V0IHdoaWNoIGVuZCBwb2ludCBoYXMgYmVlbiBjbGlja2VkIChTb3VyY2U6MCwgVGFyZ2V0OjEsIE5vbmU6LTEpXHJcbiAgICAgICAgICB2YXIgZW5kUG9pbnQgPSBnZXRDb250YWluaW5nRW5kUG9pbnQoY3lQb3NYLCBjeVBvc1ksIGVkZ2UpO1xyXG5cclxuICAgICAgICAgIGlmKGVuZFBvaW50ID09IDAgfHwgZW5kUG9pbnQgPT0gMSl7XHJcbiAgICAgICAgICAgIG1vdmVkRW5kUG9pbnQgPSBlbmRQb2ludDtcclxuICAgICAgICAgICAgZGV0YWNoZWROb2RlID0gKGVuZFBvaW50ID09IDApID8gbW92ZWRCZW5kRWRnZS5zb3VyY2UoKSA6IG1vdmVkQmVuZEVkZ2UudGFyZ2V0KCk7XHJcblxyXG4gICAgICAgICAgICB2YXIgZGlzY29ubmVjdGVkRW5kID0gKGVuZFBvaW50ID09IDApID8gJ3NvdXJjZScgOiAndGFyZ2V0JztcclxuICAgICAgICAgICAgdmFyIHJlc3VsdCA9IHJlY29ubmVjdGlvblV0aWxpdGllcy5kaXNjb25uZWN0RWRnZShtb3ZlZEJlbmRFZGdlLCBjeSwgZXZlbnQucmVuZGVyZWRQb3NpdGlvbiwgZGlzY29ubmVjdGVkRW5kKTtcclxuICAgICAgICAgICAgXHJcbiAgICAgICAgICAgIGR1bW15Tm9kZSA9IHJlc3VsdC5kdW1teU5vZGU7XHJcbiAgICAgICAgICAgIG1vdmVkQmVuZEVkZ2UgPSByZXN1bHQuZWRnZTtcclxuXHJcbiAgICAgICAgICAgIGRpc2FibGVHZXN0dXJlcygpO1xyXG4gICAgICAgICAgfVxyXG4gICAgICAgICAgZWxzZSBpZiAoaW5kZXggIT0gLTEpIHtcclxuICAgICAgICAgICAgbW92ZWRCZW5kSW5kZXggPSBpbmRleDtcclxuICAgICAgICAgICAgLy8gbW92ZWRCZW5kRWRnZSA9IGVkZ2U7XHJcbiAgICAgICAgICAgIGRpc2FibGVHZXN0dXJlcygpO1xyXG4gICAgICAgICAgfVxyXG4gICAgICAgICAgZWxzZSB7XHJcbiAgICAgICAgICAgIGNyZWF0ZUJlbmRPbkRyYWcgPSB0cnVlO1xyXG4gICAgICAgICAgfVxyXG4gICAgICAgIH0pO1xyXG4gICAgICAgIFxyXG4gICAgICAgIGN5Lm9uKCd0YXBkcmFnJywgZVRhcERyYWcgPSBmdW5jdGlvbiAoZXZlbnQpIHtcclxuICAgICAgICAgIHZhciBlZGdlID0gbW92ZWRCZW5kRWRnZTtcclxuICAgICAgICAgIGlmKG1vdmVkQmVuZEVkZ2UgIT09IHVuZGVmaW5lZCAmJiBiZW5kUG9pbnRVdGlsaXRpZXMuaXNJZ25vcmVkRWRnZShlZGdlKSApIHtcclxuICAgICAgICAgICAgcmV0dXJuO1xyXG4gICAgICAgICAgfVxyXG5cclxuICAgICAgICAgIGlmKGNyZWF0ZUJlbmRPbkRyYWcpIHtcclxuICAgICAgICAgICAgdmFyIGN5UG9zID0gZXZlbnQucG9zaXRpb24gfHwgZXZlbnQuY3lQb3NpdGlvbjtcclxuICAgICAgICAgICAgYmVuZFBvaW50VXRpbGl0aWVzLmFkZEJlbmRQb2ludChlZGdlLCBjeVBvcyk7XHJcbiAgICAgICAgICAgIG1vdmVkQmVuZEluZGV4ID0gZ2V0Q29udGFpbmluZ0JlbmRTaGFwZUluZGV4KGN5UG9zLngsIGN5UG9zLnksIGVkZ2UpO1xyXG4gICAgICAgICAgICBtb3ZlZEJlbmRFZGdlID0gZWRnZTtcclxuICAgICAgICAgICAgY3JlYXRlQmVuZE9uRHJhZyA9IHVuZGVmaW5lZDtcclxuICAgICAgICAgICAgZGlzYWJsZUdlc3R1cmVzKCk7XHJcbiAgICAgICAgICB9XHJcbiAgICAgICAgICBcclxuICAgICAgICAgIGlmIChtb3ZlZEJlbmRFZGdlID09PSB1bmRlZmluZWQgfHwgKG1vdmVkQmVuZEluZGV4ID09PSB1bmRlZmluZWQgJiYgbW92ZWRFbmRQb2ludCA9PT0gdW5kZWZpbmVkKSkge1xyXG4gICAgICAgICAgICByZXR1cm47XHJcbiAgICAgICAgICB9XHJcblxyXG4gICAgICAgICAgLy8gVXBkYXRlIGVuZCBwb2ludCBsb2NhdGlvbiAoU291cmNlOjAsIFRhcmdldDoxKVxyXG4gICAgICAgICAgaWYobW92ZWRFbmRQb2ludCAhPSAtMSAmJiBkdW1teU5vZGUpe1xyXG4gICAgICAgICAgICB2YXIgbmV3UG9zID0gZXZlbnQucG9zaXRpb24gfHwgZXZlbnQuY3lQb3NpdGlvbjtcclxuICAgICAgICAgICAgZHVtbXlOb2RlLnBvc2l0aW9uKG5ld1Bvcyk7XHJcbiAgICAgICAgICB9XHJcbiAgICAgICAgICAvLyBVcGRhdGUgYmVuZCBwb2ludCBsb2NhdGlvblxyXG4gICAgICAgICAgZWxzZSBpZihtb3ZlZEJlbmRJbmRleCAhPSB1bmRlZmluZWQpeyBcclxuICAgICAgICAgICAgdmFyIHdlaWdodHMgPSBlZGdlLmRhdGEoJ2N5ZWRnZWJlbmRlZGl0aW5nV2VpZ2h0cycpO1xyXG4gICAgICAgICAgICB2YXIgZGlzdGFuY2VzID0gZWRnZS5kYXRhKCdjeWVkZ2ViZW5kZWRpdGluZ0Rpc3RhbmNlcycpO1xyXG4gICAgICAgICAgICBcclxuICAgICAgICAgICAgdmFyIHJlbGF0aXZlQmVuZFBvc2l0aW9uID0gYmVuZFBvaW50VXRpbGl0aWVzLmNvbnZlcnRUb1JlbGF0aXZlQmVuZFBvc2l0aW9uKGVkZ2UsIGV2ZW50LnBvc2l0aW9uIHx8IGV2ZW50LmN5UG9zaXRpb24pO1xyXG4gICAgICAgICAgICB3ZWlnaHRzW21vdmVkQmVuZEluZGV4XSA9IHJlbGF0aXZlQmVuZFBvc2l0aW9uLndlaWdodDtcclxuICAgICAgICAgICAgZGlzdGFuY2VzW21vdmVkQmVuZEluZGV4XSA9IHJlbGF0aXZlQmVuZFBvc2l0aW9uLmRpc3RhbmNlO1xyXG4gICAgICAgICAgICBcclxuICAgICAgICAgICAgZWRnZS5kYXRhKCdjeWVkZ2ViZW5kZWRpdGluZ1dlaWdodHMnLCB3ZWlnaHRzKTtcclxuICAgICAgICAgICAgZWRnZS5kYXRhKCdjeWVkZ2ViZW5kZWRpdGluZ0Rpc3RhbmNlcycsIGRpc3RhbmNlcyk7XHJcbiAgICAgICAgICB9XHJcbiAgICAgICAgICBcclxuICAgICAgICAgIGlmKGV2ZW50LnRhcmdldCAmJiBldmVudC50YXJnZXRbMF0gJiYgZXZlbnQudGFyZ2V0LmlzTm9kZSgpKXtcclxuICAgICAgICAgICAgbm9kZVRvQXR0YWNoID0gZXZlbnQudGFyZ2V0O1xyXG4gICAgICAgICAgfVxyXG5cclxuICAgICAgICAgXHJcbiAgICAgICAgfSk7XHJcbiAgICAgICAgXHJcbiAgICAgICAgY3kub24oJ3RhcGVuZCcsIGVUYXBFbmQgPSBmdW5jdGlvbiAoZXZlbnQpIHtcclxuICAgICAgICAgIHZhciBlZGdlID0gbW92ZWRCZW5kRWRnZTtcclxuICAgICAgICAgIFxyXG4gICAgICAgICAgaWYoIGVkZ2UgIT09IHVuZGVmaW5lZCApIHtcclxuICAgICAgICAgICAgaWYoIG1vdmVkQmVuZEluZGV4ICE9IHVuZGVmaW5lZCApIHtcclxuICAgICAgICAgICAgICB2YXIgc3RhcnRYID0gZWRnZS5zb3VyY2UoKS5wb3NpdGlvbigneCcpO1xyXG4gICAgICAgICAgICAgIHZhciBzdGFydFkgPSBlZGdlLnNvdXJjZSgpLnBvc2l0aW9uKCd5Jyk7XHJcbiAgICAgICAgICAgICAgdmFyIGVuZFggPSBlZGdlLnRhcmdldCgpLnBvc2l0aW9uKCd4Jyk7XHJcbiAgICAgICAgICAgICAgdmFyIGVuZFkgPSBlZGdlLnRhcmdldCgpLnBvc2l0aW9uKCd5Jyk7XHJcbiAgICAgICAgICAgICAgXHJcbiAgICAgICAgICAgICAgdmFyIHNlZ1B0cyA9IGJlbmRQb2ludFV0aWxpdGllcy5nZXRTZWdtZW50UG9pbnRzKGVkZ2UpO1xyXG4gICAgICAgICAgICAgIHZhciBhbGxQdHMgPSBbc3RhcnRYLCBzdGFydFldLmNvbmNhdChzZWdQdHMpLmNvbmNhdChbZW5kWCwgZW5kWV0pO1xyXG4gICAgICAgICAgICAgIFxyXG4gICAgICAgICAgICAgIHZhciBwb2ludEluZGV4ID0gbW92ZWRCZW5kSW5kZXggKyAxO1xyXG4gICAgICAgICAgICAgIHZhciBwcmVJbmRleCA9IHBvaW50SW5kZXggLSAxO1xyXG4gICAgICAgICAgICAgIHZhciBwb3NJbmRleCA9IHBvaW50SW5kZXggKyAxO1xyXG4gICAgICAgICAgICAgIFxyXG4gICAgICAgICAgICAgIHZhciBwb2ludCA9IHtcclxuICAgICAgICAgICAgICAgIHg6IGFsbFB0c1syICogcG9pbnRJbmRleF0sXHJcbiAgICAgICAgICAgICAgICB5OiBhbGxQdHNbMiAqIHBvaW50SW5kZXggKyAxXVxyXG4gICAgICAgICAgICAgIH07XHJcbiAgICAgICAgICAgICAgXHJcbiAgICAgICAgICAgICAgdmFyIHByZVBvaW50ID0ge1xyXG4gICAgICAgICAgICAgICAgeDogYWxsUHRzWzIgKiBwcmVJbmRleF0sXHJcbiAgICAgICAgICAgICAgICB5OiBhbGxQdHNbMiAqIHByZUluZGV4ICsgMV1cclxuICAgICAgICAgICAgICB9O1xyXG4gICAgICAgICAgICAgIFxyXG4gICAgICAgICAgICAgIHZhciBwb3NQb2ludCA9IHtcclxuICAgICAgICAgICAgICAgIHg6IGFsbFB0c1syICogcG9zSW5kZXhdLFxyXG4gICAgICAgICAgICAgICAgeTogYWxsUHRzWzIgKiBwb3NJbmRleCArIDFdXHJcbiAgICAgICAgICAgICAgfTtcclxuICAgICAgICAgICAgICBcclxuICAgICAgICAgICAgICB2YXIgbmVhclRvTGluZTtcclxuICAgICAgICAgICAgICBcclxuICAgICAgICAgICAgICBpZiggKCBwb2ludC54ID09PSBwcmVQb2ludC54ICYmIHBvaW50LnkgPT09IHByZVBvaW50LnkgKSB8fCAoIHBvaW50LnggPT09IHByZVBvaW50LnggJiYgcG9pbnQueSA9PT0gcHJlUG9pbnQueSApICkge1xyXG4gICAgICAgICAgICAgICAgbmVhclRvTGluZSA9IHRydWU7XHJcbiAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgIGVsc2Uge1xyXG4gICAgICAgICAgICAgICAgdmFyIG0xID0gKCBwcmVQb2ludC55IC0gcG9zUG9pbnQueSApIC8gKCBwcmVQb2ludC54IC0gcG9zUG9pbnQueCApO1xyXG4gICAgICAgICAgICAgICAgdmFyIG0yID0gLTEgLyBtMTtcclxuXHJcbiAgICAgICAgICAgICAgICB2YXIgc3JjVGd0UG9pbnRzQW5kVGFuZ2VudHMgPSB7XHJcbiAgICAgICAgICAgICAgICAgIHNyY1BvaW50OiBwcmVQb2ludCxcclxuICAgICAgICAgICAgICAgICAgdGd0UG9pbnQ6IHBvc1BvaW50LFxyXG4gICAgICAgICAgICAgICAgICBtMTogbTEsXHJcbiAgICAgICAgICAgICAgICAgIG0yOiBtMlxyXG4gICAgICAgICAgICAgICAgfTtcclxuXHJcbiAgICAgICAgICAgICAgICAvL2dldCB0aGUgaW50ZXJzZWN0aW9uIG9mIHRoZSBjdXJyZW50IHNlZ21lbnQgd2l0aCB0aGUgbmV3IGJlbmQgcG9pbnRcclxuICAgICAgICAgICAgICAgIHZhciBjdXJyZW50SW50ZXJzZWN0aW9uID0gYmVuZFBvaW50VXRpbGl0aWVzLmdldEludGVyc2VjdGlvbihlZGdlLCBwb2ludCwgc3JjVGd0UG9pbnRzQW5kVGFuZ2VudHMpO1xyXG4gICAgICAgICAgICAgICAgdmFyIGRpc3QgPSBNYXRoLnNxcnQoIE1hdGgucG93KCAocG9pbnQueCAtIGN1cnJlbnRJbnRlcnNlY3Rpb24ueCksIDIgKSBcclxuICAgICAgICAgICAgICAgICAgICAgICAgKyBNYXRoLnBvdyggKHBvaW50LnkgLSBjdXJyZW50SW50ZXJzZWN0aW9uLnkpLCAyICkpO1xyXG4gICAgICAgICAgICAgICAgXHJcbiAgICAgICAgICAgICAgICAvLyB2YXIgbGVuZ3RoID0gTWF0aC5zcXJ0KCBNYXRoLnBvdyggKHBvc1BvaW50LnggLSBwcmVQb2ludC54KSwgMiApIFxyXG4gICAgICAgICAgICAgICAgLy8gICAgICAgICArIE1hdGgucG93KCAocG9zUG9pbnQueSAtIHByZVBvaW50LnkpLCAyICkpO1xyXG4gICAgICAgICAgICAgICAgXHJcbiAgICAgICAgICAgICAgICBpZiggZGlzdCAgPCA4ICkge1xyXG4gICAgICAgICAgICAgICAgICBuZWFyVG9MaW5lID0gdHJ1ZTtcclxuICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICAgIFxyXG4gICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICBcclxuICAgICAgICAgICAgICBpZiggbmVhclRvTGluZSApXHJcbiAgICAgICAgICAgICAge1xyXG4gICAgICAgICAgICAgICAgYmVuZFBvaW50VXRpbGl0aWVzLnJlbW92ZUJlbmRQb2ludChlZGdlLCBtb3ZlZEJlbmRJbmRleCk7XHJcbiAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgIFxyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgICAgIGVsc2UgaWYoZHVtbXlOb2RlICE9IHVuZGVmaW5lZCAmJiAobW92ZWRFbmRQb2ludCA9PSAwIHx8IG1vdmVkRW5kUG9pbnQgPT0gMSkgKXtcclxuICAgICAgICAgICAgICBcclxuICAgICAgICAgICAgICB2YXIgbmV3Tm9kZSA9IGRldGFjaGVkTm9kZTtcclxuICAgICAgICAgICAgICB2YXIgaXNWYWxpZCA9ICd2YWxpZCc7XHJcbiAgICAgICAgICAgICAgdmFyIGxvY2F0aW9uID0gKG1vdmVkRW5kUG9pbnQgPT0gMCkgPyAnc291cmNlJyA6ICd0YXJnZXQnO1xyXG5cclxuICAgICAgICAgICAgICAvLyB2YWxpZGF0ZSBlZGdlIHJlY29ubmVjdGlvblxyXG4gICAgICAgICAgICAgIGlmKG5vZGVUb0F0dGFjaCl7XHJcbiAgICAgICAgICAgICAgICB2YXIgbmV3U291cmNlID0gKG1vdmVkRW5kUG9pbnQgPT0gMCkgPyBub2RlVG9BdHRhY2ggOiBlZGdlLnNvdXJjZSgpO1xyXG4gICAgICAgICAgICAgICAgdmFyIG5ld1RhcmdldCA9IChtb3ZlZEVuZFBvaW50ID09IDEpID8gbm9kZVRvQXR0YWNoIDogZWRnZS50YXJnZXQoKTtcclxuICAgICAgICAgICAgICAgIGlmKHR5cGVvZiB2YWxpZGF0ZUVkZ2UgPT09IFwiZnVuY3Rpb25cIilcclxuICAgICAgICAgICAgICAgICAgaXNWYWxpZCA9IHZhbGlkYXRlRWRnZShlZGdlLCBuZXdTb3VyY2UsIG5ld1RhcmdldCk7XHJcbiAgICAgICAgICAgICAgICBuZXdOb2RlID0gKGlzVmFsaWQgPT09ICd2YWxpZCcpID8gbm9kZVRvQXR0YWNoIDogZGV0YWNoZWROb2RlO1xyXG4gICAgICAgICAgICAgIH1cclxuXHJcbiAgICAgICAgICAgICAgdmFyIG5ld1NvdXJjZSA9IChtb3ZlZEVuZFBvaW50ID09IDApID8gbmV3Tm9kZSA6IGVkZ2Uuc291cmNlKCk7XHJcbiAgICAgICAgICAgICAgdmFyIG5ld1RhcmdldCA9IChtb3ZlZEVuZFBvaW50ID09IDEpID8gbmV3Tm9kZSA6IGVkZ2UudGFyZ2V0KCk7XHJcbiAgICAgICAgICAgICAgZWRnZSA9IHJlY29ubmVjdGlvblV0aWxpdGllcy5jb25uZWN0RWRnZShlZGdlLCBkZXRhY2hlZE5vZGUsIGxvY2F0aW9uKTtcclxuXHJcbiAgICAgICAgICAgICAgaWYoZGV0YWNoZWROb2RlLmlkKCkgIT09IG5ld05vZGUuaWQoKSl7XHJcbiAgICAgICAgICAgICAgICAvLyB1c2UgZ2l2ZW4gaGFuZGxlUmVjb25uZWN0RWRnZSBmdW5jdGlvbiBcclxuICAgICAgICAgICAgICAgIGlmKHR5cGVvZiBoYW5kbGVSZWNvbm5lY3RFZGdlID09PSAnZnVuY3Rpb24nKXtcclxuICAgICAgICAgICAgICAgICAgdmFyIHJlY29ubmVjdGVkRWRnZSA9IGhhbmRsZVJlY29ubmVjdEVkZ2UobmV3U291cmNlLmlkKCksIG5ld1RhcmdldC5pZCgpLCBlZGdlLmRhdGEoKSk7XHJcbiAgICAgICAgICAgICAgICAgIFxyXG4gICAgICAgICAgICAgICAgICBpZihyZWNvbm5lY3RlZEVkZ2Upe1xyXG4gICAgICAgICAgICAgICAgICAgIHJlY29ubmVjdGlvblV0aWxpdGllcy5jb3B5RWRnZShlZGdlLCByZWNvbm5lY3RlZEVkZ2UpO1xyXG4gICAgICAgICAgICAgICAgICAgIGJlbmRQb2ludFV0aWxpdGllcy5pbml0QmVuZFBvaW50cyhvcHRpb25zKCkuYmVuZFBvc2l0aW9uc0Z1bmN0aW9uLCBbcmVjb25uZWN0ZWRFZGdlXSk7XHJcbiAgICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICAgICAgXHJcbiAgICAgICAgICAgICAgICAgIGlmKHJlY29ubmVjdGVkRWRnZSAmJiBvcHRpb25zKCkudW5kb2FibGUpe1xyXG4gICAgICAgICAgICAgICAgICAgIHZhciBwYXJhbXMgPSB7XHJcbiAgICAgICAgICAgICAgICAgICAgICBuZXdFZGdlOiByZWNvbm5lY3RlZEVkZ2UsXHJcbiAgICAgICAgICAgICAgICAgICAgICBvbGRFZGdlOiBlZGdlXHJcbiAgICAgICAgICAgICAgICAgICAgfTtcclxuICAgICAgICAgICAgICAgICAgICBjeS51bmRvUmVkbygpLmRvKCdyZW1vdmVSZWNvbm5lY3RlZEVkZ2UnLCBwYXJhbXMpO1xyXG4gICAgICAgICAgICAgICAgICAgIGVkZ2UgPSByZWNvbm5lY3RlZEVkZ2U7XHJcbiAgICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICAgICAgZWxzZSBpZihyZWNvbm5lY3RlZEVkZ2Upe1xyXG4gICAgICAgICAgICAgICAgICAgIGN5LnJlbW92ZShlZGdlKTtcclxuICAgICAgICAgICAgICAgICAgICBlZGdlID0gcmVjb25uZWN0ZWRFZGdlO1xyXG4gICAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgICBlbHNle1xyXG4gICAgICAgICAgICAgICAgICB2YXIgbG9jID0gKG1vdmVkRW5kUG9pbnQgPT0gMCkgPyB7c291cmNlOiBuZXdOb2RlLmlkKCl9IDoge3RhcmdldDogbmV3Tm9kZS5pZCgpfTtcclxuICAgICAgICAgICAgICAgICAgdmFyIG9sZExvYyA9IChtb3ZlZEVuZFBvaW50ID09IDApID8ge3NvdXJjZTogZGV0YWNoZWROb2RlLmlkKCl9IDoge3RhcmdldDogZGV0YWNoZWROb2RlLmlkKCl9O1xyXG4gICAgICAgICAgICAgICAgICBcclxuICAgICAgICAgICAgICAgICAgaWYob3B0aW9ucygpLnVuZG9hYmxlICYmIG5ld05vZGUuaWQoKSAhPT0gZGV0YWNoZWROb2RlLmlkKCkpIHtcclxuICAgICAgICAgICAgICAgICAgICB2YXIgcGFyYW0gPSB7XHJcbiAgICAgICAgICAgICAgICAgICAgICBlZGdlOiBlZGdlLFxyXG4gICAgICAgICAgICAgICAgICAgICAgbG9jYXRpb246IGxvYyxcclxuICAgICAgICAgICAgICAgICAgICAgIG9sZExvYzogb2xkTG9jXHJcbiAgICAgICAgICAgICAgICAgICAgfTtcclxuICAgICAgICAgICAgICAgICAgICB2YXIgcmVzdWx0ID0gY3kudW5kb1JlZG8oKS5kbygncmVjb25uZWN0RWRnZScsIHBhcmFtKTtcclxuICAgICAgICAgICAgICAgICAgICBlZGdlID0gcmVzdWx0LmVkZ2U7XHJcbiAgICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICAgIH0gIFxyXG4gICAgICAgICAgICAgIH1cclxuXHJcbiAgICAgICAgICAgICAgLy8gaW52YWxpZCBlZGdlIHJlY29ubmVjdGlvbiBjYWxsYmFja1xyXG4gICAgICAgICAgICAgIGlmKGlzVmFsaWQgIT09ICd2YWxpZCcgJiYgdHlwZW9mIGFjdE9uVW5zdWNjZXNzZnVsUmVjb25uZWN0aW9uID09PSAnZnVuY3Rpb24nKXtcclxuICAgICAgICAgICAgICAgIGFjdE9uVW5zdWNjZXNzZnVsUmVjb25uZWN0aW9uKCk7XHJcbiAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgIGVkZ2UudW5zZWxlY3QoKTtcclxuICAgICAgICAgICAgICBjeS5yZW1vdmUoZHVtbXlOb2RlKTtcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgICAgfVxyXG4gICAgICAgICAgXHJcbiAgICAgICAgICBpZiAoZWRnZSAhPT0gdW5kZWZpbmVkICYmIG1vdmVCZW5kUGFyYW0gIT09IHVuZGVmaW5lZCAmJiBlZGdlLmRhdGEoJ2N5ZWRnZWJlbmRlZGl0aW5nV2VpZ2h0cycpXHJcbiAgICAgICAgICAmJiBlZGdlLmRhdGEoJ2N5ZWRnZWJlbmRlZGl0aW5nV2VpZ2h0cycpLnRvU3RyaW5nKCkgIT0gbW92ZUJlbmRQYXJhbS53ZWlnaHRzLnRvU3RyaW5nKCkpIHtcclxuICAgICAgICAgICAgXHJcbiAgICAgICAgICAgIGlmKG9wdGlvbnMoKS51bmRvYWJsZSkge1xyXG4gICAgICAgICAgICAgIGN5LnVuZG9SZWRvKCkuZG8oJ2NoYW5nZUJlbmRQb2ludHMnLCBtb3ZlQmVuZFBhcmFtKTtcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgICAgfVxyXG4gICAgICAgICAgXHJcbiAgICAgICAgICBtb3ZlZEJlbmRJbmRleCA9IHVuZGVmaW5lZDtcclxuICAgICAgICAgIG1vdmVkQmVuZEVkZ2UgPSB1bmRlZmluZWQ7XHJcbiAgICAgICAgICBtb3ZlQmVuZFBhcmFtID0gdW5kZWZpbmVkO1xyXG4gICAgICAgICAgY3JlYXRlQmVuZE9uRHJhZyA9IHVuZGVmaW5lZDtcclxuICAgICAgICAgIG1vdmVkRW5kUG9pbnQgPSB1bmRlZmluZWQ7XHJcbiAgICAgICAgICBkdW1teU5vZGUgPSB1bmRlZmluZWQ7XHJcbiAgICAgICAgICBkZXRhY2hlZE5vZGUgPSB1bmRlZmluZWQ7XHJcbiAgICAgICAgICBub2RlVG9BdHRhY2ggPSB1bmRlZmluZWQ7XHJcblxyXG4gICAgICAgICAgcmVzZXRHZXN0dXJlcygpO1xyXG4gICAgICAgICAgc2V0VGltZW91dChmdW5jdGlvbigpe3JlZnJlc2hEcmF3cygpfSwgNTApO1xyXG4gICAgICAgIH0pO1xyXG5cclxuICAgICAgICAvL1ZhcmlhYmxlcyB1c2VkIGZvciBzdGFydGluZyBhbmQgZW5kaW5nIHRoZSBtb3ZlbWVudCBvZiBiZW5kIHBvaW50cyB3aXRoIGFycm93c1xyXG4gICAgICAgIHZhciBtb3ZlcGFyYW07XHJcbiAgICAgICAgdmFyIGZpcnN0QmVuZFBvaW50O1xyXG4gICAgICAgIHZhciBlZGdlQ29udGFpbmluZ0ZpcnN0QmVuZFBvaW50O1xyXG4gICAgICAgIHZhciBmaXJzdEJlbmRQb2ludEZvdW5kO1xyXG4gICAgICAgIGN5Lm9uKFwiZWRnZWJlbmRlZGl0aW5nLm1vdmVzdGFydFwiLCBmdW5jdGlvbiAoZSwgZWRnZXMpIHtcclxuICAgICAgICAgICAgZmlyc3RCZW5kUG9pbnRGb3VuZCA9IGZhbHNlO1xyXG4gICAgICAgICAgICBpZiAoZWRnZXNbMF0gIT0gdW5kZWZpbmVkKVxyXG4gICAgICAgICAgICB7XHJcbiAgICAgICAgICAgICAgICBlZGdlcy5mb3JFYWNoKGZ1bmN0aW9uKCBlZGdlICl7XHJcbiAgICAgICAgICAgICAgICAgIGlmIChiZW5kUG9pbnRVdGlsaXRpZXMuZ2V0U2VnbWVudFBvaW50cyhlZGdlKSAhPSB1bmRlZmluZWQgJiYgIWZpcnN0QmVuZFBvaW50Rm91bmQpXHJcbiAgICAgICAgICAgICAgICAgIHtcclxuICAgICAgICAgICAgICAgICAgICAgIGZpcnN0QmVuZFBvaW50ID0geyB4OiBiZW5kUG9pbnRVdGlsaXRpZXMuZ2V0U2VnbWVudFBvaW50cyhlZGdlKVswXSwgeTogYmVuZFBvaW50VXRpbGl0aWVzLmdldFNlZ21lbnRQb2ludHMoZWRnZSlbMV19O1xyXG4gICAgICAgICAgICAgICAgICAgICAgbW92ZXBhcmFtID0ge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgIGZpcnN0VGltZTogdHJ1ZSxcclxuICAgICAgICAgICAgICAgICAgICAgICAgICBmaXJzdEJlbmRQb2ludFBvc2l0aW9uOiB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHg6IGZpcnN0QmVuZFBvaW50LngsXHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHk6IGZpcnN0QmVuZFBvaW50LnlcclxuICAgICAgICAgICAgICAgICAgICAgICAgICB9LFxyXG4gICAgICAgICAgICAgICAgICAgICAgICAgIGVkZ2VzOiBlZGdlc1xyXG4gICAgICAgICAgICAgICAgICAgICAgfTtcclxuICAgICAgICAgICAgICAgICAgICAgIGVkZ2VDb250YWluaW5nRmlyc3RCZW5kUG9pbnQgPSBlZGdlO1xyXG4gICAgICAgICAgICAgICAgICAgICAgZmlyc3RCZW5kUG9pbnRGb3VuZCA9IHRydWU7XHJcbiAgICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICAgIH0pO1xyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgfSk7XHJcblxyXG4gICAgICAgIGN5Lm9uKFwiZWRnZWJlbmRlZGl0aW5nLm1vdmVlbmRcIiwgZnVuY3Rpb24gKGUsIGVkZ2VzKSB7XHJcbiAgICAgICAgICAgIGlmIChtb3ZlcGFyYW0gIT0gdW5kZWZpbmVkKVxyXG4gICAgICAgICAgICB7XHJcbiAgICAgICAgICAgICAgICB2YXIgaW5pdGlhbFBvcyA9IG1vdmVwYXJhbS5maXJzdEJlbmRQb2ludFBvc2l0aW9uO1xyXG4gICAgICAgICAgICAgICAgdmFyIG1vdmVkRmlyc3RCZW5kUG9pbnQgPSB7XHJcbiAgICAgICAgICAgICAgICAgICAgeDogYmVuZFBvaW50VXRpbGl0aWVzLmdldFNlZ21lbnRQb2ludHMoZWRnZUNvbnRhaW5pbmdGaXJzdEJlbmRQb2ludClbMF0sXHJcbiAgICAgICAgICAgICAgICAgICAgeTogYmVuZFBvaW50VXRpbGl0aWVzLmdldFNlZ21lbnRQb2ludHMoZWRnZUNvbnRhaW5pbmdGaXJzdEJlbmRQb2ludClbMV1cclxuICAgICAgICAgICAgICAgIH07XHJcblxyXG5cclxuICAgICAgICAgICAgICAgIG1vdmVwYXJhbS5wb3NpdGlvbkRpZmYgPSB7XHJcbiAgICAgICAgICAgICAgICAgICAgeDogLW1vdmVkRmlyc3RCZW5kUG9pbnQueCArIGluaXRpYWxQb3MueCxcclxuICAgICAgICAgICAgICAgICAgICB5OiAtbW92ZWRGaXJzdEJlbmRQb2ludC55ICsgaW5pdGlhbFBvcy55XHJcbiAgICAgICAgICAgICAgICB9XHJcblxyXG4gICAgICAgICAgICAgICAgZGVsZXRlIG1vdmVwYXJhbS5maXJzdEJlbmRQb2ludFBvc2l0aW9uO1xyXG5cclxuICAgICAgICAgICAgICAgIGlmKG9wdGlvbnMoKS51bmRvYWJsZSkge1xyXG4gICAgICAgICAgICAgICAgICAgIGN5LnVuZG9SZWRvKCkuZG8oXCJtb3ZlQmVuZFBvaW50c1wiLCBtb3ZlcGFyYW0pO1xyXG4gICAgICAgICAgICAgICAgfVxyXG5cclxuICAgICAgICAgICAgICAgIG1vdmVwYXJhbSA9IHVuZGVmaW5lZDtcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgIH0pO1xyXG5cclxuICAgICAgICBjeS5vbignY3h0dGFwJywgJ2VkZ2UnLCBlQ3h0VGFwID0gZnVuY3Rpb24gKGV2ZW50KSB7XHJcbiAgICAgICAgICB2YXIgZWRnZSA9IHRoaXM7XHJcbiAgICAgICAgICBcclxuICAgICAgICAgIHZhciBtZW51cyA9IGN5LmNvbnRleHRNZW51cygnZ2V0Jyk7IC8vIGdldCBjb250ZXh0IG1lbnVzIGluc3RhbmNlXHJcbiAgICAgICAgICBcclxuICAgICAgICAgIGlmKCFlZGdlVG9IaWdobGlnaHRCZW5kcyB8fCBlZGdlVG9IaWdobGlnaHRCZW5kcy5pZCgpICE9IGVkZ2UuaWQoKSB8fCBiZW5kUG9pbnRVdGlsaXRpZXMuaXNJZ25vcmVkRWRnZShlZGdlKSkge1xyXG4gICAgICAgICAgICBtZW51cy5oaWRlTWVudUl0ZW0ocmVtb3ZlQmVuZFBvaW50Q3h0TWVudUlkKTtcclxuICAgICAgICAgICAgbWVudXMuaGlkZU1lbnVJdGVtKGFkZEJlbmRQb2ludEN4dE1lbnVJZCk7XHJcbiAgICAgICAgICAgIHJldHVybjtcclxuICAgICAgICAgIH1cclxuXHJcbiAgICAgICAgICB2YXIgY3lQb3MgPSBldmVudC5wb3NpdGlvbiB8fCBldmVudC5jeVBvc2l0aW9uO1xyXG4gICAgICAgICAgdmFyIHNlbGVjdGVkQmVuZEluZGV4ID0gZ2V0Q29udGFpbmluZ0JlbmRTaGFwZUluZGV4KGN5UG9zLngsIGN5UG9zLnksIGVkZ2UpO1xyXG4gICAgICAgICAgaWYgKHNlbGVjdGVkQmVuZEluZGV4ID09IC0xKSB7XHJcbiAgICAgICAgICAgIG1lbnVzLmhpZGVNZW51SXRlbShyZW1vdmVCZW5kUG9pbnRDeHRNZW51SWQpO1xyXG4gICAgICAgICAgICBtZW51cy5zaG93TWVudUl0ZW0oYWRkQmVuZFBvaW50Q3h0TWVudUlkKTtcclxuICAgICAgICAgICAgYmVuZFBvaW50VXRpbGl0aWVzLmN1cnJlbnRDdHhQb3MgPSBjeVBvcztcclxuICAgICAgICAgIH1cclxuICAgICAgICAgIGVsc2Uge1xyXG4gICAgICAgICAgICBtZW51cy5oaWRlTWVudUl0ZW0oYWRkQmVuZFBvaW50Q3h0TWVudUlkKTtcclxuICAgICAgICAgICAgbWVudXMuc2hvd01lbnVJdGVtKHJlbW92ZUJlbmRQb2ludEN4dE1lbnVJZCk7XHJcbiAgICAgICAgICAgIGJlbmRQb2ludFV0aWxpdGllcy5jdXJyZW50QmVuZEluZGV4ID0gc2VsZWN0ZWRCZW5kSW5kZXg7XHJcbiAgICAgICAgICB9XHJcblxyXG4gICAgICAgICAgYmVuZFBvaW50VXRpbGl0aWVzLmN1cnJlbnRDdHhFZGdlID0gZWRnZTtcclxuICAgICAgICB9KTtcclxuICAgICAgICBcclxuICAgICAgICBjeS5vbignY3llZGdlYmVuZGVkaXRpbmcuY2hhbmdlQmVuZFBvaW50cycsICdlZGdlJywgZnVuY3Rpb24oKSB7XHJcbiAgICAgICAgICB2YXIgZWRnZSA9IHRoaXM7XHJcbiAgICAgICAgICBjeS5zdGFydEJhdGNoKCk7XHJcbiAgICAgICAgICBjeS5lZGdlcygpLnVuc2VsZWN0KCk7XHJcbiAgICAgICAgICBlZGdlLnNlbGVjdCgpO1xyXG4gICAgICAgICAgY3kudHJpZ2dlcignYmVuZFBvaW50TW92ZW1lbnQnKTtcclxuICAgICAgICAgIGN5LmVuZEJhdGNoKCk7XHJcbiAgICAgICAgICByZWZyZXNoRHJhd3MoKTtcclxuICAgICAgICB9KTtcclxuICAgICAgfVxyXG5cclxuICAgICAgdmFyIHNlbGVjdGVkRWRnZXM7XHJcbiAgICAgIHZhciBiZW5kUG9pbnRzTW92aW5nID0gZmFsc2U7XHJcblxyXG4gICAgICBmdW5jdGlvbiBrZXlEb3duKGUpIHtcclxuXHJcbiAgICAgICAgICB2YXIgc2hvdWxkTW92ZSA9IHR5cGVvZiBvcHRpb25zKCkubW92ZVNlbGVjdGVkQmVuZFBvaW50c09uS2V5RXZlbnRzID09PSAnZnVuY3Rpb24nXHJcbiAgICAgICAgICAgICAgPyBvcHRpb25zKCkubW92ZVNlbGVjdGVkQmVuZFBvaW50c09uS2V5RXZlbnRzKCkgOiBvcHRpb25zKCkubW92ZVNlbGVjdGVkQmVuZFBvaW50c09uS2V5RXZlbnRzO1xyXG5cclxuICAgICAgICAgIGlmICghc2hvdWxkTW92ZSkge1xyXG4gICAgICAgICAgICAgIHJldHVybjtcclxuICAgICAgICAgIH1cclxuXHJcbiAgICAgICAgICAvL0NoZWNrcyBpZiB0aGUgdGFnbmFtZSBpcyB0ZXh0YXJlYSBvciBpbnB1dFxyXG4gICAgICAgICAgdmFyIHRuID0gZG9jdW1lbnQuYWN0aXZlRWxlbWVudC50YWdOYW1lO1xyXG4gICAgICAgICAgaWYgKHRuICE9IFwiVEVYVEFSRUFcIiAmJiB0biAhPSBcIklOUFVUXCIpXHJcbiAgICAgICAgICB7XHJcbiAgICAgICAgICAgICAgc3dpdGNoKGUua2V5Q29kZSl7XHJcbiAgICAgICAgICAgICAgICAgIGNhc2UgMzc6IGNhc2UgMzk6IGNhc2UgMzg6ICBjYXNlIDQwOiAvLyBBcnJvdyBrZXlzXHJcbiAgICAgICAgICAgICAgICAgIGNhc2UgMzI6IGUucHJldmVudERlZmF1bHQoKTsgYnJlYWs7IC8vIFNwYWNlXHJcbiAgICAgICAgICAgICAgICAgIGRlZmF1bHQ6IGJyZWFrOyAvLyBkbyBub3QgYmxvY2sgb3RoZXIga2V5c1xyXG4gICAgICAgICAgICAgIH1cclxuXHJcblxyXG4gICAgICAgICAgICAgIGlmIChlLmtleUNvZGUgPCAnMzcnIHx8IGUua2V5Q29kZSA+ICc0MCcpIHtcclxuICAgICAgICAgICAgICAgICAgcmV0dXJuO1xyXG4gICAgICAgICAgICAgIH1cclxuXHJcbiAgICAgICAgICAgICAgLy9DaGVja3MgaWYgb25seSBlZGdlcyBhcmUgc2VsZWN0ZWQgKG5vdCBhbnkgbm9kZSkgYW5kIGlmIG9ubHkgMSBlZGdlIGlzIHNlbGVjdGVkXHJcbiAgICAgICAgICAgICAgLy9JZiB0aGUgc2Vjb25kIGNoZWNraW5nIGlzIHJlbW92ZWQgdGhlIGJlbmQgcG9pbnRzIG9mIG11bHRpcGxlIGVkZ2VzIHdvdWxkIG1vdmVcclxuICAgICAgICAgICAgICBpZiAoY3kuZWRnZXMoXCI6c2VsZWN0ZWRcIikubGVuZ3RoICE9IGN5LmVsZW1lbnRzKFwiOnNlbGVjdGVkXCIpLmxlbmd0aCB8fCBjeS5lZGdlcyhcIjpzZWxlY3RlZFwiKS5sZW5ndGggIT0gMSlcclxuICAgICAgICAgICAgICB7XHJcbiAgICAgICAgICAgICAgICByZXR1cm47XHJcbiAgICAgICAgICAgICAgfVxyXG5cclxuICAgICAgICAgICAgICBpZiAoIWJlbmRQb2ludHNNb3ZpbmcpXHJcbiAgICAgICAgICAgICAge1xyXG4gICAgICAgICAgICAgICAgICBzZWxlY3RlZEVkZ2VzID0gY3kuZWRnZXMoJzpzZWxlY3RlZCcpO1xyXG4gICAgICAgICAgICAgICAgICBjeS50cmlnZ2VyKFwiZWRnZWJlbmRlZGl0aW5nLm1vdmVzdGFydFwiLCBbc2VsZWN0ZWRFZGdlc10pO1xyXG4gICAgICAgICAgICAgICAgICBiZW5kUG9pbnRzTW92aW5nID0gdHJ1ZTtcclxuICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgaWYgKGUuYWx0S2V5ICYmIGUud2hpY2ggPT0gJzM4Jykge1xyXG4gICAgICAgICAgICAgICAgICAvLyB1cCBhcnJvdyBhbmQgYWx0XHJcbiAgICAgICAgICAgICAgICAgIG1vdmVCZW5kUG9pbnRzICh7eDowLCB5Oi0xfSxzZWxlY3RlZEVkZ2VzKTtcclxuICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgZWxzZSBpZiAoZS5hbHRLZXkgJiYgZS53aGljaCA9PSAnNDAnKSB7XHJcbiAgICAgICAgICAgICAgICAgIC8vIGRvd24gYXJyb3cgYW5kIGFsdFxyXG4gICAgICAgICAgICAgICAgICBtb3ZlQmVuZFBvaW50cyAoe3g6MCwgeToxfSxzZWxlY3RlZEVkZ2VzKTtcclxuICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgZWxzZSBpZiAoZS5hbHRLZXkgJiYgZS53aGljaCA9PSAnMzcnKSB7XHJcbiAgICAgICAgICAgICAgICAgIC8vIGxlZnQgYXJyb3cgYW5kIGFsdFxyXG4gICAgICAgICAgICAgICAgICBtb3ZlQmVuZFBvaW50cyAoe3g6LTEsIHk6MH0sc2VsZWN0ZWRFZGdlcyk7XHJcbiAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgIGVsc2UgaWYgKGUuYWx0S2V5ICYmIGUud2hpY2ggPT0gJzM5Jykge1xyXG4gICAgICAgICAgICAgICAgICAvLyByaWdodCBhcnJvdyBhbmQgYWx0XHJcbiAgICAgICAgICAgICAgICAgIG1vdmVCZW5kUG9pbnRzICh7eDoxLCB5OjB9LHNlbGVjdGVkRWRnZXMpO1xyXG4gICAgICAgICAgICAgIH1cclxuXHJcbiAgICAgICAgICAgICAgZWxzZSBpZiAoZS5zaGlmdEtleSAmJiBlLndoaWNoID09ICczOCcpIHtcclxuICAgICAgICAgICAgICAgICAgLy8gdXAgYXJyb3cgYW5kIHNoaWZ0XHJcbiAgICAgICAgICAgICAgICAgIG1vdmVCZW5kUG9pbnRzICh7eDowLCB5Oi0xMH0sc2VsZWN0ZWRFZGdlcyk7XHJcbiAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgIGVsc2UgaWYgKGUuc2hpZnRLZXkgJiYgZS53aGljaCA9PSAnNDAnKSB7XHJcbiAgICAgICAgICAgICAgICAgIC8vIGRvd24gYXJyb3cgYW5kIHNoaWZ0XHJcbiAgICAgICAgICAgICAgICAgIG1vdmVCZW5kUG9pbnRzICh7eDowLCB5OjEwfSxzZWxlY3RlZEVkZ2VzKTtcclxuICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgZWxzZSBpZiAoZS5zaGlmdEtleSAmJiBlLndoaWNoID09ICczNycpIHtcclxuICAgICAgICAgICAgICAgICAgLy8gbGVmdCBhcnJvdyBhbmQgc2hpZnRcclxuICAgICAgICAgICAgICAgICAgbW92ZUJlbmRQb2ludHMgKHt4Oi0xMCwgeTowfSxzZWxlY3RlZEVkZ2VzKTtcclxuXHJcbiAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgIGVsc2UgaWYgKGUuc2hpZnRLZXkgJiYgZS53aGljaCA9PSAnMzknICkge1xyXG4gICAgICAgICAgICAgICAgICAvLyByaWdodCBhcnJvdyBhbmQgc2hpZnRcclxuICAgICAgICAgICAgICAgICAgbW92ZUJlbmRQb2ludHMgKHt4OjEwLCB5OjB9LHNlbGVjdGVkRWRnZXMpO1xyXG4gICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICBlbHNlIGlmIChlLmtleUNvZGUgPT0gJzM4Jykge1xyXG4gICAgICAgICAgICAgICAgICAvLyB1cCBhcnJvd1xyXG4gICAgICAgICAgICAgICAgICBtb3ZlQmVuZFBvaW50cyh7eDogMCwgeTogLTN9LCBzZWxlY3RlZEVkZ2VzKTtcclxuICAgICAgICAgICAgICB9XHJcblxyXG4gICAgICAgICAgICAgIGVsc2UgaWYgKGUua2V5Q29kZSA9PSAnNDAnKSB7XHJcbiAgICAgICAgICAgICAgICAgIC8vIGRvd24gYXJyb3dcclxuICAgICAgICAgICAgICAgICAgbW92ZUJlbmRQb2ludHMgKHt4OjAsIHk6M30sc2VsZWN0ZWRFZGdlcyk7XHJcbiAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgIGVsc2UgaWYgKGUua2V5Q29kZSA9PSAnMzcnKSB7XHJcbiAgICAgICAgICAgICAgICAgIC8vIGxlZnQgYXJyb3dcclxuICAgICAgICAgICAgICAgICAgbW92ZUJlbmRQb2ludHMgKHt4Oi0zLCB5OjB9LHNlbGVjdGVkRWRnZXMpO1xyXG4gICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICBlbHNlIGlmIChlLmtleUNvZGUgPT0gJzM5Jykge1xyXG4gICAgICAgICAgICAgICAgICAvL3JpZ2h0IGFycm93XHJcbiAgICAgICAgICAgICAgICAgIG1vdmVCZW5kUG9pbnRzICh7eDozLCB5OjB9LHNlbGVjdGVkRWRnZXMpO1xyXG4gICAgICAgICAgICAgIH1cclxuICAgICAgICAgIH1cclxuICAgICAgfVxyXG4gICAgICBmdW5jdGlvbiBrZXlVcChlKSB7XHJcblxyXG4gICAgICAgICAgaWYgKGUua2V5Q29kZSA8ICczNycgfHwgZS5rZXlDb2RlID4gJzQwJykge1xyXG4gICAgICAgICAgICAgIHJldHVybjtcclxuICAgICAgICAgIH1cclxuXHJcbiAgICAgICAgICB2YXIgc2hvdWxkTW92ZSA9IHR5cGVvZiBvcHRpb25zKCkubW92ZVNlbGVjdGVkQmVuZFBvaW50c09uS2V5RXZlbnRzID09PSAnZnVuY3Rpb24nXHJcbiAgICAgICAgICAgICAgPyBvcHRpb25zKCkubW92ZVNlbGVjdGVkQmVuZFBvaW50c09uS2V5RXZlbnRzKCkgOiBvcHRpb25zKCkubW92ZVNlbGVjdGVkQmVuZFBvaW50c09uS2V5RXZlbnRzO1xyXG5cclxuICAgICAgICAgIGlmICghc2hvdWxkTW92ZSkge1xyXG4gICAgICAgICAgICAgIHJldHVybjtcclxuICAgICAgICAgIH1cclxuXHJcbiAgICAgICAgICBjeS50cmlnZ2VyKFwiZWRnZWJlbmRlZGl0aW5nLm1vdmVlbmRcIiwgW3NlbGVjdGVkRWRnZXNdKTtcclxuICAgICAgICAgIHNlbGVjdGVkRWRnZXMgPSB1bmRlZmluZWQ7XHJcbiAgICAgICAgICBiZW5kUG9pbnRzTW92aW5nID0gZmFsc2U7XHJcblxyXG4gICAgICB9XHJcbiAgICAgIGRvY3VtZW50LmFkZEV2ZW50TGlzdGVuZXIoXCJrZXlkb3duXCIsa2V5RG93biwgdHJ1ZSk7XHJcbiAgICAgIGRvY3VtZW50LmFkZEV2ZW50TGlzdGVuZXIoXCJrZXl1cFwiLGtleVVwLCB0cnVlKTtcclxuXHJcbiAgICAgICRjb250YWluZXIuZGF0YSgnY3llZGdlYmVuZGVkaXRpbmcnLCBkYXRhKTtcclxuICAgIH0sXHJcbiAgICB1bmJpbmQ6IGZ1bmN0aW9uICgpIHtcclxuICAgICAgICBjeS5vZmYoJ3Bvc2l0aW9uJywgJ25vZGUnLCBlUG9zaXRpb24pXHJcbiAgICAgICAgICAub2ZmKCdyZW1vdmUnLCAnbm9kZScsIGVSZW1vdmUpXHJcbiAgICAgICAgICAub2ZmKCdhZGQnLCAnbm9kZScsIGVBZGQpXHJcbiAgICAgICAgICAub2ZmKCdzdHlsZScsICdlZGdlLmVkZ2ViZW5kZWRpdGluZy1oYXNiZW5kcG9pbnRzOnNlbGVjdGVkJywgZVN0eWxlKVxyXG4gICAgICAgICAgLm9mZignc2VsZWN0JywgJ2VkZ2UnLCBlU2VsZWN0KVxyXG4gICAgICAgICAgLm9mZigndW5zZWxlY3QnLCAnZWRnZScsIGVVbnNlbGVjdClcclxuICAgICAgICAgIC5vZmYoJ3RhcHN0YXJ0JywgJ2VkZ2UnLCBlVGFwU3RhcnQpXHJcbiAgICAgICAgICAub2ZmKCd0YXBkcmFnJywgZVRhcERyYWcpXHJcbiAgICAgICAgICAub2ZmKCd0YXBlbmQnLCBlVGFwRW5kKVxyXG4gICAgICAgICAgLm9mZignY3h0dGFwJywgZUN4dFRhcCk7XHJcblxyXG4gICAgICAgIGN5LnVuYmluZChcInpvb20gcGFuXCIsIGVab29tKTtcclxuICAgIH1cclxuICB9O1xyXG5cclxuICBpZiAoZnVuY3Rpb25zW2ZuXSkge1xyXG4gICAgcmV0dXJuIGZ1bmN0aW9uc1tmbl0uYXBwbHkoJChjeS5jb250YWluZXIoKSksIEFycmF5LnByb3RvdHlwZS5zbGljZS5jYWxsKGFyZ3VtZW50cywgMSkpO1xyXG4gIH0gZWxzZSBpZiAodHlwZW9mIGZuID09ICdvYmplY3QnIHx8ICFmbikge1xyXG4gICAgcmV0dXJuIGZ1bmN0aW9ucy5pbml0LmFwcGx5KCQoY3kuY29udGFpbmVyKCkpLCBhcmd1bWVudHMpO1xyXG4gIH0gZWxzZSB7XHJcbiAgICAkLmVycm9yKCdObyBzdWNoIGZ1bmN0aW9uIGAnICsgZm4gKyAnYCBmb3IgY3l0b3NjYXBlLmpzLWVkZ2UtZWRpdGluZycpO1xyXG4gIH1cclxuXHJcbiAgcmV0dXJuICQodGhpcyk7XHJcbn07XHJcbiIsInZhciBiZW5kUG9pbnRVdGlsaXRpZXMgPSB7XHJcbiAgY3VycmVudEN0eEVkZ2U6IHVuZGVmaW5lZCxcclxuICBjdXJyZW50Q3R4UG9zOiB1bmRlZmluZWQsXHJcbiAgY3VycmVudEJlbmRJbmRleDogdW5kZWZpbmVkLFxyXG4gIGlnbm9yZWRDbGFzc2VzOiB1bmRlZmluZWQsXHJcbiAgc2V0SWdub3JlZENsYXNzZXM6IGZ1bmN0aW9uKF9pZ25vcmVkQ2xhc3Nlcykge1xyXG4gICAgdGhpcy5pZ25vcmVkQ2xhc3NlcyA9IF9pZ25vcmVkQ2xhc3NlcztcclxuICB9LFxyXG4gIC8vIGluaXRpbGl6ZSBiZW5kIHBvaW50cyBiYXNlZCBvbiBiZW5kUG9zaXRpb25zRmNuXHJcbiAgaW5pdEJlbmRQb2ludHM6IGZ1bmN0aW9uKGJlbmRQb3NpdGlvbnNGY24sIGVkZ2VzKSB7XHJcbiAgICBmb3IgKHZhciBpID0gMDsgaSA8IGVkZ2VzLmxlbmd0aDsgaSsrKSB7XHJcbiAgICAgIHZhciBlZGdlID0gZWRnZXNbaV07XHJcbiAgICAgIGlmKCF0aGlzLmlzSWdub3JlZEVkZ2UoZWRnZSkpIHtcclxuXHJcbiAgICAgICAgLy8gZ2V0IHRoZSBiZW5kIHBvc2l0aW9ucyBieSBhcHBseWluZyB0aGUgZnVuY3Rpb24gZm9yIHRoaXMgZWRnZVxyXG4gICAgICAgIHZhciBiZW5kUG9zaXRpb25zID0gYmVuZFBvc2l0aW9uc0Zjbi5hcHBseSh0aGlzLCBlZGdlKTtcclxuICAgICAgICAvLyBjYWxjdWxhdGUgcmVsYXRpdmUgYmVuZCBwb3NpdGlvbnNcclxuICAgICAgICB2YXIgcmVzdWx0ID0gdGhpcy5jb252ZXJ0VG9SZWxhdGl2ZUJlbmRQb3NpdGlvbnMoZWRnZSwgYmVuZFBvc2l0aW9ucyk7XHJcblxyXG4gICAgICAgIC8vIGlmIHRoZXJlIGFyZSBiZW5kIHBvaW50cyBzZXQgd2VpZ2h0cyBhbmQgZGlzdGFuY2VzIGFjY29yZGluZ2x5IGFuZCBhZGQgY2xhc3MgdG8gZW5hYmxlIHN0eWxlIGNoYW5nZXNcclxuICAgICAgICBpZiAocmVzdWx0LmRpc3RhbmNlcy5sZW5ndGggPiAwKSB7XHJcbiAgICAgICAgICBlZGdlLmRhdGEoJ2N5ZWRnZWJlbmRlZGl0aW5nV2VpZ2h0cycsIHJlc3VsdC53ZWlnaHRzKTtcclxuICAgICAgICAgIGVkZ2UuZGF0YSgnY3llZGdlYmVuZGVkaXRpbmdEaXN0YW5jZXMnLCByZXN1bHQuZGlzdGFuY2VzKTtcclxuICAgICAgICAgIGVkZ2UuYWRkQ2xhc3MoJ2VkZ2ViZW5kZWRpdGluZy1oYXNiZW5kcG9pbnRzJyk7XHJcbiAgICAgICAgfVxyXG4gICAgICB9XHJcbiAgICB9XHJcbiAgfSxcclxuXHJcbiAgaXNJZ25vcmVkRWRnZTogZnVuY3Rpb24oZWRnZSkge1xyXG4gICAgZm9yKHZhciBpID0gMDsgdGhpcy5pZ25vcmVkQ2xhc3NlcyAmJiBpIDwgIHRoaXMuaWdub3JlZENsYXNzZXMubGVuZ3RoOyBpKyspe1xyXG4gICAgICBpZihlZGdlLmhhc0NsYXNzKHRoaXMuaWdub3JlZENsYXNzZXNbaV0pKVxyXG4gICAgICAgIHJldHVybiB0cnVlO1xyXG4gICAgfVxyXG4gICAgcmV0dXJuIGZhbHNlO1xyXG4gIH0sXHJcbiAgLy9HZXQgdGhlIGRpcmVjdGlvbiBvZiB0aGUgbGluZSBmcm9tIHNvdXJjZSBwb2ludCB0byB0aGUgdGFyZ2V0IHBvaW50XHJcbiAgZ2V0TGluZURpcmVjdGlvbjogZnVuY3Rpb24oc3JjUG9pbnQsIHRndFBvaW50KXtcclxuICAgIGlmKHNyY1BvaW50LnkgPT0gdGd0UG9pbnQueSAmJiBzcmNQb2ludC54IDwgdGd0UG9pbnQueCl7XHJcbiAgICAgIHJldHVybiAxO1xyXG4gICAgfVxyXG4gICAgaWYoc3JjUG9pbnQueSA8IHRndFBvaW50LnkgJiYgc3JjUG9pbnQueCA8IHRndFBvaW50Lngpe1xyXG4gICAgICByZXR1cm4gMjtcclxuICAgIH1cclxuICAgIGlmKHNyY1BvaW50LnkgPCB0Z3RQb2ludC55ICYmIHNyY1BvaW50LnggPT0gdGd0UG9pbnQueCl7XHJcbiAgICAgIHJldHVybiAzO1xyXG4gICAgfVxyXG4gICAgaWYoc3JjUG9pbnQueSA8IHRndFBvaW50LnkgJiYgc3JjUG9pbnQueCA+IHRndFBvaW50Lngpe1xyXG4gICAgICByZXR1cm4gNDtcclxuICAgIH1cclxuICAgIGlmKHNyY1BvaW50LnkgPT0gdGd0UG9pbnQueSAmJiBzcmNQb2ludC54ID4gdGd0UG9pbnQueCl7XHJcbiAgICAgIHJldHVybiA1O1xyXG4gICAgfVxyXG4gICAgaWYoc3JjUG9pbnQueSA+IHRndFBvaW50LnkgJiYgc3JjUG9pbnQueCA+IHRndFBvaW50Lngpe1xyXG4gICAgICByZXR1cm4gNjtcclxuICAgIH1cclxuICAgIGlmKHNyY1BvaW50LnkgPiB0Z3RQb2ludC55ICYmIHNyY1BvaW50LnggPT0gdGd0UG9pbnQueCl7XHJcbiAgICAgIHJldHVybiA3O1xyXG4gICAgfVxyXG4gICAgcmV0dXJuIDg7Ly9pZiBzcmNQb2ludC55ID4gdGd0UG9pbnQueSBhbmQgc3JjUG9pbnQueCA8IHRndFBvaW50LnhcclxuICB9LFxyXG4gIGdldFNyY1RndFBvaW50c0FuZFRhbmdlbnRzOiBmdW5jdGlvbiAoZWRnZSkge1xyXG4gICAgdmFyIHNvdXJjZU5vZGUgPSBlZGdlLnNvdXJjZSgpO1xyXG4gICAgdmFyIHRhcmdldE5vZGUgPSBlZGdlLnRhcmdldCgpO1xyXG4gICAgXHJcbiAgICB2YXIgdGd0UG9zaXRpb24gPSB0YXJnZXROb2RlLnBvc2l0aW9uKCk7XHJcbiAgICB2YXIgc3JjUG9zaXRpb24gPSBzb3VyY2VOb2RlLnBvc2l0aW9uKCk7XHJcbiAgICBcclxuICAgIHZhciBzcmNQb2ludCA9IHNvdXJjZU5vZGUucG9zaXRpb24oKTtcclxuICAgIHZhciB0Z3RQb2ludCA9IHRhcmdldE5vZGUucG9zaXRpb24oKTtcclxuXHJcblxyXG4gICAgdmFyIG0xID0gKHRndFBvaW50LnkgLSBzcmNQb2ludC55KSAvICh0Z3RQb2ludC54IC0gc3JjUG9pbnQueCk7XHJcbiAgICB2YXIgbTIgPSAtMSAvIG0xO1xyXG5cclxuICAgIHJldHVybiB7XHJcbiAgICAgIG0xOiBtMSxcclxuICAgICAgbTI6IG0yLFxyXG4gICAgICBzcmNQb2ludDogc3JjUG9pbnQsXHJcbiAgICAgIHRndFBvaW50OiB0Z3RQb2ludFxyXG4gICAgfTtcclxuICB9LFxyXG4gIGdldEludGVyc2VjdGlvbjogZnVuY3Rpb24oZWRnZSwgcG9pbnQsIHNyY1RndFBvaW50c0FuZFRhbmdlbnRzKXtcclxuICAgIGlmIChzcmNUZ3RQb2ludHNBbmRUYW5nZW50cyA9PT0gdW5kZWZpbmVkKSB7XHJcbiAgICAgIHNyY1RndFBvaW50c0FuZFRhbmdlbnRzID0gdGhpcy5nZXRTcmNUZ3RQb2ludHNBbmRUYW5nZW50cyhlZGdlKTtcclxuICAgIH1cclxuXHJcbiAgICB2YXIgc3JjUG9pbnQgPSBzcmNUZ3RQb2ludHNBbmRUYW5nZW50cy5zcmNQb2ludDtcclxuICAgIHZhciB0Z3RQb2ludCA9IHNyY1RndFBvaW50c0FuZFRhbmdlbnRzLnRndFBvaW50O1xyXG4gICAgdmFyIG0xID0gc3JjVGd0UG9pbnRzQW5kVGFuZ2VudHMubTE7XHJcbiAgICB2YXIgbTIgPSBzcmNUZ3RQb2ludHNBbmRUYW5nZW50cy5tMjtcclxuXHJcbiAgICB2YXIgaW50ZXJzZWN0WDtcclxuICAgIHZhciBpbnRlcnNlY3RZO1xyXG5cclxuICAgIGlmKG0xID09IEluZmluaXR5IHx8IG0xID09IC1JbmZpbml0eSl7XHJcbiAgICAgIGludGVyc2VjdFggPSBzcmNQb2ludC54O1xyXG4gICAgICBpbnRlcnNlY3RZID0gcG9pbnQueTtcclxuICAgIH1cclxuICAgIGVsc2UgaWYobTEgPT0gMCl7XHJcbiAgICAgIGludGVyc2VjdFggPSBwb2ludC54O1xyXG4gICAgICBpbnRlcnNlY3RZID0gc3JjUG9pbnQueTtcclxuICAgIH1cclxuICAgIGVsc2Uge1xyXG4gICAgICB2YXIgYTEgPSBzcmNQb2ludC55IC0gbTEgKiBzcmNQb2ludC54O1xyXG4gICAgICB2YXIgYTIgPSBwb2ludC55IC0gbTIgKiBwb2ludC54O1xyXG5cclxuICAgICAgaW50ZXJzZWN0WCA9IChhMiAtIGExKSAvIChtMSAtIG0yKTtcclxuICAgICAgaW50ZXJzZWN0WSA9IG0xICogaW50ZXJzZWN0WCArIGExO1xyXG4gICAgfVxyXG5cclxuICAgIC8vSW50ZXJzZWN0aW9uIHBvaW50IGlzIHRoZSBpbnRlcnNlY3Rpb24gb2YgdGhlIGxpbmVzIHBhc3NpbmcgdGhyb3VnaCB0aGUgbm9kZXMgYW5kXHJcbiAgICAvL3Bhc3NpbmcgdGhyb3VnaCB0aGUgYmVuZCBwb2ludCBhbmQgcGVycGVuZGljdWxhciB0byB0aGUgb3RoZXIgbGluZVxyXG4gICAgdmFyIGludGVyc2VjdGlvblBvaW50ID0ge1xyXG4gICAgICB4OiBpbnRlcnNlY3RYLFxyXG4gICAgICB5OiBpbnRlcnNlY3RZXHJcbiAgICB9O1xyXG4gICAgXHJcbiAgICByZXR1cm4gaW50ZXJzZWN0aW9uUG9pbnQ7XHJcbiAgfSxcclxuICBnZXRTZWdtZW50UG9pbnRzOiBmdW5jdGlvbihlZGdlKSB7XHJcbiAgICBcclxuICAgIGlmKCBlZGdlLmNzcygnY3VydmUtc3R5bGUnKSAhPT0gJ3NlZ21lbnRzJyApIHtcclxuICAgICAgcmV0dXJuIHVuZGVmaW5lZDtcclxuICAgIH1cclxuICAgIFxyXG4gICAgdmFyIHNlZ3B0cyA9IFtdO1xyXG5cclxuICAgIHZhciBzZWdtZW50V3MgPSBlZGdlLnBzdHlsZSggJ3NlZ21lbnQtd2VpZ2h0cycgKS5wZlZhbHVlO1xyXG4gICAgdmFyIHNlZ21lbnREcyA9IGVkZ2UucHN0eWxlKCAnc2VnbWVudC1kaXN0YW5jZXMnICkucGZWYWx1ZTtcclxuICAgIHZhciBzZWdtZW50c04gPSBNYXRoLm1pbiggc2VnbWVudFdzLmxlbmd0aCwgc2VnbWVudERzLmxlbmd0aCApO1xyXG4gICAgXHJcbiAgICB2YXIgc3JjUG9zID0gZWRnZS5zb3VyY2UoKS5wb3NpdGlvbigpO1xyXG4gICAgdmFyIHRndFBvcyA9IGVkZ2UudGFyZ2V0KCkucG9zaXRpb24oKTtcclxuXHJcbiAgICB2YXIgZHkgPSAoIHRndFBvcy55IC0gc3JjUG9zLnkgKTtcclxuICAgIHZhciBkeCA9ICggdGd0UG9zLnggLSBzcmNQb3MueCApO1xyXG4gICAgXHJcbiAgICB2YXIgbCA9IE1hdGguc3FydCggZHggKiBkeCArIGR5ICogZHkgKTtcclxuXHJcbiAgICB2YXIgdmVjdG9yID0ge1xyXG4gICAgICB4OiBkeCxcclxuICAgICAgeTogZHlcclxuICAgIH07XHJcblxyXG4gICAgdmFyIHZlY3Rvck5vcm0gPSB7XHJcbiAgICAgIHg6IHZlY3Rvci54IC8gbCxcclxuICAgICAgeTogdmVjdG9yLnkgLyBsXHJcbiAgICB9O1xyXG4gICAgXHJcbiAgICB2YXIgdmVjdG9yTm9ybUludmVyc2UgPSB7XHJcbiAgICAgIHg6IC12ZWN0b3JOb3JtLnksXHJcbiAgICAgIHk6IHZlY3Rvck5vcm0ueFxyXG4gICAgfTtcclxuXHJcbiAgICBmb3IoIHZhciBzID0gMDsgcyA8IHNlZ21lbnRzTjsgcysrICl7XHJcbiAgICAgIHZhciB3ID0gc2VnbWVudFdzWyBzIF07XHJcbiAgICAgIHZhciBkID0gc2VnbWVudERzWyBzIF07XHJcblxyXG4gICAgICAvLyBkID0gc3dhcHBlZERpcmVjdGlvbiA/IC1kIDogZDtcclxuICAgICAgLy9cclxuICAgICAgLy8gZCA9IE1hdGguYWJzKGQpO1xyXG5cclxuICAgICAgLy8gdmFyIHcxID0gIXN3YXBwZWREaXJlY3Rpb24gPyAoMSAtIHcpIDogdztcclxuICAgICAgLy8gdmFyIHcyID0gIXN3YXBwZWREaXJlY3Rpb24gPyB3IDogKDEgLSB3KTtcclxuXHJcbiAgICAgIHZhciB3MSA9ICgxIC0gdyk7XHJcbiAgICAgIHZhciB3MiA9IHc7XHJcblxyXG4gICAgICB2YXIgcG9zUHRzID0ge1xyXG4gICAgICAgIHgxOiBzcmNQb3MueCxcclxuICAgICAgICB4MjogdGd0UG9zLngsXHJcbiAgICAgICAgeTE6IHNyY1Bvcy55LFxyXG4gICAgICAgIHkyOiB0Z3RQb3MueVxyXG4gICAgICB9O1xyXG5cclxuICAgICAgdmFyIG1pZHB0UHRzID0gcG9zUHRzO1xyXG4gICAgICBcclxuICAgICAgXHJcblxyXG4gICAgICB2YXIgYWRqdXN0ZWRNaWRwdCA9IHtcclxuICAgICAgICB4OiBtaWRwdFB0cy54MSAqIHcxICsgbWlkcHRQdHMueDIgKiB3MixcclxuICAgICAgICB5OiBtaWRwdFB0cy55MSAqIHcxICsgbWlkcHRQdHMueTIgKiB3MlxyXG4gICAgICB9O1xyXG5cclxuICAgICAgc2VncHRzLnB1c2goXHJcbiAgICAgICAgYWRqdXN0ZWRNaWRwdC54ICsgdmVjdG9yTm9ybUludmVyc2UueCAqIGQsXHJcbiAgICAgICAgYWRqdXN0ZWRNaWRwdC55ICsgdmVjdG9yTm9ybUludmVyc2UueSAqIGRcclxuICAgICAgKTtcclxuICAgIH1cclxuICAgIFxyXG4gICAgcmV0dXJuIHNlZ3B0cztcclxuICB9LFxyXG4gIGNvbnZlcnRUb1JlbGF0aXZlQmVuZFBvc2l0aW9uOiBmdW5jdGlvbiAoZWRnZSwgYmVuZFBvaW50LCBzcmNUZ3RQb2ludHNBbmRUYW5nZW50cykge1xyXG4gICAgaWYgKHNyY1RndFBvaW50c0FuZFRhbmdlbnRzID09PSB1bmRlZmluZWQpIHtcclxuICAgICAgc3JjVGd0UG9pbnRzQW5kVGFuZ2VudHMgPSB0aGlzLmdldFNyY1RndFBvaW50c0FuZFRhbmdlbnRzKGVkZ2UpO1xyXG4gICAgfVxyXG4gICAgXHJcbiAgICB2YXIgaW50ZXJzZWN0aW9uUG9pbnQgPSB0aGlzLmdldEludGVyc2VjdGlvbihlZGdlLCBiZW5kUG9pbnQsIHNyY1RndFBvaW50c0FuZFRhbmdlbnRzKTtcclxuICAgIHZhciBpbnRlcnNlY3RYID0gaW50ZXJzZWN0aW9uUG9pbnQueDtcclxuICAgIHZhciBpbnRlcnNlY3RZID0gaW50ZXJzZWN0aW9uUG9pbnQueTtcclxuICAgIFxyXG4gICAgdmFyIHNyY1BvaW50ID0gc3JjVGd0UG9pbnRzQW5kVGFuZ2VudHMuc3JjUG9pbnQ7XHJcbiAgICB2YXIgdGd0UG9pbnQgPSBzcmNUZ3RQb2ludHNBbmRUYW5nZW50cy50Z3RQb2ludDtcclxuICAgIFxyXG4gICAgdmFyIHdlaWdodDtcclxuICAgIFxyXG4gICAgaWYoIGludGVyc2VjdFggIT0gc3JjUG9pbnQueCApIHtcclxuICAgICAgd2VpZ2h0ID0gKGludGVyc2VjdFggLSBzcmNQb2ludC54KSAvICh0Z3RQb2ludC54IC0gc3JjUG9pbnQueCk7XHJcbiAgICB9XHJcbiAgICBlbHNlIGlmKCBpbnRlcnNlY3RZICE9IHNyY1BvaW50LnkgKSB7XHJcbiAgICAgIHdlaWdodCA9IChpbnRlcnNlY3RZIC0gc3JjUG9pbnQueSkgLyAodGd0UG9pbnQueSAtIHNyY1BvaW50LnkpO1xyXG4gICAgfVxyXG4gICAgZWxzZSB7XHJcbiAgICAgIHdlaWdodCA9IDA7XHJcbiAgICB9XHJcbiAgICBcclxuICAgIHZhciBkaXN0YW5jZSA9IE1hdGguc3FydChNYXRoLnBvdygoaW50ZXJzZWN0WSAtIGJlbmRQb2ludC55KSwgMilcclxuICAgICAgICArIE1hdGgucG93KChpbnRlcnNlY3RYIC0gYmVuZFBvaW50LngpLCAyKSk7XHJcbiAgICBcclxuICAgIC8vR2V0IHRoZSBkaXJlY3Rpb24gb2YgdGhlIGxpbmUgZm9ybSBzb3VyY2UgcG9pbnQgdG8gdGFyZ2V0IHBvaW50XHJcbiAgICB2YXIgZGlyZWN0aW9uMSA9IHRoaXMuZ2V0TGluZURpcmVjdGlvbihzcmNQb2ludCwgdGd0UG9pbnQpO1xyXG4gICAgLy9HZXQgdGhlIGRpcmVjdGlvbiBvZiB0aGUgbGluZSBmcm9tIGludGVzZWN0aW9uIHBvaW50IHRvIGJlbmQgcG9pbnRcclxuICAgIHZhciBkaXJlY3Rpb24yID0gdGhpcy5nZXRMaW5lRGlyZWN0aW9uKGludGVyc2VjdGlvblBvaW50LCBiZW5kUG9pbnQpO1xyXG4gICAgXHJcbiAgICAvL0lmIHRoZSBkaWZmZXJlbmNlIGlzIG5vdCAtMiBhbmQgbm90IDYgdGhlbiB0aGUgZGlyZWN0aW9uIG9mIHRoZSBkaXN0YW5jZSBpcyBuZWdhdGl2ZVxyXG4gICAgaWYoZGlyZWN0aW9uMSAtIGRpcmVjdGlvbjIgIT0gLTIgJiYgZGlyZWN0aW9uMSAtIGRpcmVjdGlvbjIgIT0gNil7XHJcbiAgICAgIGlmKGRpc3RhbmNlICE9IDApXHJcbiAgICAgICAgZGlzdGFuY2UgPSAtMSAqIGRpc3RhbmNlO1xyXG4gICAgfVxyXG4gICAgXHJcbiAgICByZXR1cm4ge1xyXG4gICAgICB3ZWlnaHQ6IHdlaWdodCxcclxuICAgICAgZGlzdGFuY2U6IGRpc3RhbmNlXHJcbiAgICB9O1xyXG4gIH0sXHJcbiAgY29udmVydFRvUmVsYXRpdmVCZW5kUG9zaXRpb25zOiBmdW5jdGlvbiAoZWRnZSwgYmVuZFBvaW50cykge1xyXG4gICAgdmFyIHNyY1RndFBvaW50c0FuZFRhbmdlbnRzID0gdGhpcy5nZXRTcmNUZ3RQb2ludHNBbmRUYW5nZW50cyhlZGdlKTtcclxuLy8gICAgdmFyIGJlbmRQb2ludHMgPSBlZGdlLmRhdGEoJ2JlbmRQb2ludFBvc2l0aW9ucycpO1xyXG4gICAgLy9vdXRwdXQgdmFyaWFibGVzXHJcbiAgICB2YXIgd2VpZ2h0cyA9IFtdO1xyXG4gICAgdmFyIGRpc3RhbmNlcyA9IFtdO1xyXG5cclxuICAgIGZvciAodmFyIGkgPSAwOyBiZW5kUG9pbnRzICYmIGkgPCBiZW5kUG9pbnRzLmxlbmd0aDsgaSsrKSB7XHJcbiAgICAgIHZhciBiZW5kUG9pbnQgPSBiZW5kUG9pbnRzW2ldO1xyXG4gICAgICB2YXIgcmVsYXRpdmVCZW5kUG9zaXRpb24gPSB0aGlzLmNvbnZlcnRUb1JlbGF0aXZlQmVuZFBvc2l0aW9uKGVkZ2UsIGJlbmRQb2ludCwgc3JjVGd0UG9pbnRzQW5kVGFuZ2VudHMpO1xyXG5cclxuICAgICAgd2VpZ2h0cy5wdXNoKHJlbGF0aXZlQmVuZFBvc2l0aW9uLndlaWdodCk7XHJcbiAgICAgIGRpc3RhbmNlcy5wdXNoKHJlbGF0aXZlQmVuZFBvc2l0aW9uLmRpc3RhbmNlKTtcclxuICAgIH1cclxuXHJcbiAgICByZXR1cm4ge1xyXG4gICAgICB3ZWlnaHRzOiB3ZWlnaHRzLFxyXG4gICAgICBkaXN0YW5jZXM6IGRpc3RhbmNlc1xyXG4gICAgfTtcclxuICB9LFxyXG4gIGdldFNlZ21lbnREaXN0YW5jZXNTdHJpbmc6IGZ1bmN0aW9uIChlZGdlKSB7XHJcbiAgICB2YXIgc3RyID0gXCJcIjtcclxuXHJcbiAgICB2YXIgZGlzdGFuY2VzID0gZWRnZS5kYXRhKCdjeWVkZ2ViZW5kZWRpdGluZ0Rpc3RhbmNlcycpO1xyXG4gICAgZm9yICh2YXIgaSA9IDA7IGRpc3RhbmNlcyAmJiBpIDwgZGlzdGFuY2VzLmxlbmd0aDsgaSsrKSB7XHJcbiAgICAgIHN0ciA9IHN0ciArIFwiIFwiICsgZGlzdGFuY2VzW2ldO1xyXG4gICAgfVxyXG4gICAgXHJcbiAgICByZXR1cm4gc3RyO1xyXG4gIH0sXHJcbiAgZ2V0U2VnbWVudFdlaWdodHNTdHJpbmc6IGZ1bmN0aW9uIChlZGdlKSB7XHJcbiAgICB2YXIgc3RyID0gXCJcIjtcclxuXHJcbiAgICB2YXIgd2VpZ2h0cyA9IGVkZ2UuZGF0YSgnY3llZGdlYmVuZGVkaXRpbmdXZWlnaHRzJyk7XHJcbiAgICBmb3IgKHZhciBpID0gMDsgd2VpZ2h0cyAmJiBpIDwgd2VpZ2h0cy5sZW5ndGg7IGkrKykge1xyXG4gICAgICBzdHIgPSBzdHIgKyBcIiBcIiArIHdlaWdodHNbaV07XHJcbiAgICB9XHJcbiAgICBcclxuICAgIHJldHVybiBzdHI7XHJcbiAgfSxcclxuICBhZGRCZW5kUG9pbnQ6IGZ1bmN0aW9uKGVkZ2UsIG5ld0JlbmRQb2ludCkge1xyXG4gICAgaWYoZWRnZSA9PT0gdW5kZWZpbmVkIHx8IG5ld0JlbmRQb2ludCA9PT0gdW5kZWZpbmVkKXtcclxuICAgICAgZWRnZSA9IHRoaXMuY3VycmVudEN0eEVkZ2U7XHJcbiAgICAgIG5ld0JlbmRQb2ludCA9IHRoaXMuY3VycmVudEN0eFBvcztcclxuICAgIH1cclxuICAgIFxyXG4gICAgdmFyIHJlbGF0aXZlQmVuZFBvc2l0aW9uID0gdGhpcy5jb252ZXJ0VG9SZWxhdGl2ZUJlbmRQb3NpdGlvbihlZGdlLCBuZXdCZW5kUG9pbnQpO1xyXG4gICAgdmFyIG9yaWdpbmFsUG9pbnRXZWlnaHQgPSByZWxhdGl2ZUJlbmRQb3NpdGlvbi53ZWlnaHQ7XHJcbiAgICBcclxuICAgIHZhciBzdGFydFggPSBlZGdlLnNvdXJjZSgpLnBvc2l0aW9uKCd4Jyk7XHJcbiAgICB2YXIgc3RhcnRZID0gZWRnZS5zb3VyY2UoKS5wb3NpdGlvbigneScpO1xyXG4gICAgdmFyIGVuZFggPSBlZGdlLnRhcmdldCgpLnBvc2l0aW9uKCd4Jyk7XHJcbiAgICB2YXIgZW5kWSA9IGVkZ2UudGFyZ2V0KCkucG9zaXRpb24oJ3knKTtcclxuICAgIFxyXG4gICAgdmFyIHN0YXJ0V2VpZ2h0ID0gdGhpcy5jb252ZXJ0VG9SZWxhdGl2ZUJlbmRQb3NpdGlvbihlZGdlLCB7eDogc3RhcnRYLCB5OiBzdGFydFl9KS53ZWlnaHQ7XHJcbiAgICB2YXIgZW5kV2VpZ2h0ID0gdGhpcy5jb252ZXJ0VG9SZWxhdGl2ZUJlbmRQb3NpdGlvbihlZGdlLCB7eDogZW5kWCwgeTogZW5kWX0pLndlaWdodDtcclxuICAgIHZhciB3ZWlnaHRzV2l0aFRndFNyYyA9IFtzdGFydFdlaWdodF0uY29uY2F0KGVkZ2UuZGF0YSgnY3llZGdlYmVuZGVkaXRpbmdXZWlnaHRzJyk/ZWRnZS5kYXRhKCdjeWVkZ2ViZW5kZWRpdGluZ1dlaWdodHMnKTpbXSkuY29uY2F0KFtlbmRXZWlnaHRdKTtcclxuICAgIFxyXG4gICAgdmFyIHNlZ1B0cyA9IHRoaXMuZ2V0U2VnbWVudFBvaW50cyhlZGdlKTtcclxuICAgIFxyXG4gICAgdmFyIG1pbkRpc3QgPSBJbmZpbml0eTtcclxuICAgIHZhciBpbnRlcnNlY3Rpb247XHJcbiAgICB2YXIgc2VncHRzV2l0aFRndFNyYyA9IFtzdGFydFgsIHN0YXJ0WV1cclxuICAgICAgICAgICAgLmNvbmNhdChzZWdQdHM/c2VnUHRzOltdKVxyXG4gICAgICAgICAgICAuY29uY2F0KFtlbmRYLCBlbmRZXSk7XHJcbiAgICB2YXIgbmV3QmVuZEluZGV4ID0gLTE7XHJcbiAgICBcclxuICAgIGZvcih2YXIgaSA9IDA7IGkgPCB3ZWlnaHRzV2l0aFRndFNyYy5sZW5ndGggLSAxOyBpKyspe1xyXG4gICAgICB2YXIgdzEgPSB3ZWlnaHRzV2l0aFRndFNyY1tpXTtcclxuICAgICAgdmFyIHcyID0gd2VpZ2h0c1dpdGhUZ3RTcmNbaSArIDFdO1xyXG4gICAgICBcclxuICAgICAgLy9jaGVjayBpZiB0aGUgd2VpZ2h0IGlzIGJldHdlZW4gdzEgYW5kIHcyXHJcbiAgICAgIGlmKChvcmlnaW5hbFBvaW50V2VpZ2h0IDw9IHcxICYmIG9yaWdpbmFsUG9pbnRXZWlnaHQgPj0gdzIpIHx8IChvcmlnaW5hbFBvaW50V2VpZ2h0IDw9IHcyICYmIG9yaWdpbmFsUG9pbnRXZWlnaHQgPj0gdzEpKXtcclxuICAgICAgICB2YXIgc3RhcnRYID0gc2VncHRzV2l0aFRndFNyY1syICogaV07XHJcbiAgICAgICAgdmFyIHN0YXJ0WSA9IHNlZ3B0c1dpdGhUZ3RTcmNbMiAqIGkgKyAxXTtcclxuICAgICAgICB2YXIgZW5kWCA9IHNlZ3B0c1dpdGhUZ3RTcmNbMiAqIGkgKyAyXTtcclxuICAgICAgICB2YXIgZW5kWSA9IHNlZ3B0c1dpdGhUZ3RTcmNbMiAqIGkgKyAzXTtcclxuICAgICAgICBcclxuICAgICAgICB2YXIgc3RhcnQgPSB7XHJcbiAgICAgICAgICB4OiBzdGFydFgsXHJcbiAgICAgICAgICB5OiBzdGFydFlcclxuICAgICAgICB9O1xyXG4gICAgICAgIFxyXG4gICAgICAgIHZhciBlbmQgPSB7XHJcbiAgICAgICAgICB4OiBlbmRYLFxyXG4gICAgICAgICAgeTogZW5kWVxyXG4gICAgICAgIH07XHJcbiAgICAgICAgXHJcbiAgICAgICAgdmFyIG0xID0gKCBzdGFydFkgLSBlbmRZICkgLyAoIHN0YXJ0WCAtIGVuZFggKTtcclxuICAgICAgICB2YXIgbTIgPSAtMSAvIG0xO1xyXG4gICAgICAgIFxyXG4gICAgICAgIHZhciBzcmNUZ3RQb2ludHNBbmRUYW5nZW50cyA9IHtcclxuICAgICAgICAgIHNyY1BvaW50OiBzdGFydCxcclxuICAgICAgICAgIHRndFBvaW50OiBlbmQsXHJcbiAgICAgICAgICBtMTogbTEsXHJcbiAgICAgICAgICBtMjogbTJcclxuICAgICAgICB9O1xyXG4gICAgICAgIFxyXG4gICAgICAgIC8vZ2V0IHRoZSBpbnRlcnNlY3Rpb24gb2YgdGhlIGN1cnJlbnQgc2VnbWVudCB3aXRoIHRoZSBuZXcgYmVuZCBwb2ludFxyXG4gICAgICAgIHZhciBjdXJyZW50SW50ZXJzZWN0aW9uID0gdGhpcy5nZXRJbnRlcnNlY3Rpb24oZWRnZSwgbmV3QmVuZFBvaW50LCBzcmNUZ3RQb2ludHNBbmRUYW5nZW50cyk7XHJcbiAgICAgICAgdmFyIGRpc3QgPSBNYXRoLnNxcnQoIE1hdGgucG93KCAobmV3QmVuZFBvaW50LnggLSBjdXJyZW50SW50ZXJzZWN0aW9uLngpLCAyICkgXHJcbiAgICAgICAgICAgICAgICArIE1hdGgucG93KCAobmV3QmVuZFBvaW50LnkgLSBjdXJyZW50SW50ZXJzZWN0aW9uLnkpLCAyICkpO1xyXG4gICAgICAgIFxyXG4gICAgICAgIC8vVXBkYXRlIHRoZSBtaW5pbXVtIGRpc3RhbmNlXHJcbiAgICAgICAgaWYoZGlzdCA8IG1pbkRpc3Qpe1xyXG4gICAgICAgICAgbWluRGlzdCA9IGRpc3Q7XHJcbiAgICAgICAgICBpbnRlcnNlY3Rpb24gPSBjdXJyZW50SW50ZXJzZWN0aW9uO1xyXG4gICAgICAgICAgbmV3QmVuZEluZGV4ID0gaTtcclxuICAgICAgICB9XHJcbiAgICAgIH1cclxuICAgIH1cclxuICAgIFxyXG4gICAgaWYoaW50ZXJzZWN0aW9uICE9PSB1bmRlZmluZWQpe1xyXG4gICAgICBuZXdCZW5kUG9pbnQgPSBpbnRlcnNlY3Rpb247XHJcbiAgICB9XHJcbiAgICBcclxuICAgIHJlbGF0aXZlQmVuZFBvc2l0aW9uID0gdGhpcy5jb252ZXJ0VG9SZWxhdGl2ZUJlbmRQb3NpdGlvbihlZGdlLCBuZXdCZW5kUG9pbnQpO1xyXG4gICAgXHJcbiAgICBpZihpbnRlcnNlY3Rpb24gPT09IHVuZGVmaW5lZCl7XHJcbiAgICAgIHJlbGF0aXZlQmVuZFBvc2l0aW9uLmRpc3RhbmNlID0gMDtcclxuICAgIH1cclxuXHJcbiAgICB2YXIgd2VpZ2h0cyA9IGVkZ2UuZGF0YSgnY3llZGdlYmVuZGVkaXRpbmdXZWlnaHRzJyk7XHJcbiAgICB2YXIgZGlzdGFuY2VzID0gZWRnZS5kYXRhKCdjeWVkZ2ViZW5kZWRpdGluZ0Rpc3RhbmNlcycpO1xyXG4gICAgXHJcbiAgICB3ZWlnaHRzID0gd2VpZ2h0cz93ZWlnaHRzOltdO1xyXG4gICAgZGlzdGFuY2VzID0gZGlzdGFuY2VzP2Rpc3RhbmNlczpbXTtcclxuICAgIFxyXG4gICAgaWYod2VpZ2h0cy5sZW5ndGggPT09IDApIHtcclxuICAgICAgbmV3QmVuZEluZGV4ID0gMDtcclxuICAgIH1cclxuICAgIFxyXG4vLyAgICB3ZWlnaHRzLnB1c2gocmVsYXRpdmVCZW5kUG9zaXRpb24ud2VpZ2h0KTtcclxuLy8gICAgZGlzdGFuY2VzLnB1c2gocmVsYXRpdmVCZW5kUG9zaXRpb24uZGlzdGFuY2UpO1xyXG4gICAgaWYobmV3QmVuZEluZGV4ICE9IC0xKXtcclxuICAgICAgd2VpZ2h0cy5zcGxpY2UobmV3QmVuZEluZGV4LCAwLCByZWxhdGl2ZUJlbmRQb3NpdGlvbi53ZWlnaHQpO1xyXG4gICAgICBkaXN0YW5jZXMuc3BsaWNlKG5ld0JlbmRJbmRleCwgMCwgcmVsYXRpdmVCZW5kUG9zaXRpb24uZGlzdGFuY2UpO1xyXG4gICAgfVxyXG4gICBcclxuICAgIGVkZ2UuZGF0YSgnY3llZGdlYmVuZGVkaXRpbmdXZWlnaHRzJywgd2VpZ2h0cyk7XHJcbiAgICBlZGdlLmRhdGEoJ2N5ZWRnZWJlbmRlZGl0aW5nRGlzdGFuY2VzJywgZGlzdGFuY2VzKTtcclxuICAgIFxyXG4gICAgZWRnZS5hZGRDbGFzcygnZWRnZWJlbmRlZGl0aW5nLWhhc2JlbmRwb2ludHMnKTtcclxuICAgIFxyXG4gICAgcmV0dXJuIHJlbGF0aXZlQmVuZFBvc2l0aW9uO1xyXG4gIH0sXHJcbiAgcmVtb3ZlQmVuZFBvaW50OiBmdW5jdGlvbihlZGdlLCBiZW5kUG9pbnRJbmRleCl7XHJcbiAgICBpZihlZGdlID09PSB1bmRlZmluZWQgfHwgYmVuZFBvaW50SW5kZXggPT09IHVuZGVmaW5lZCl7XHJcbiAgICAgIGVkZ2UgPSB0aGlzLmN1cnJlbnRDdHhFZGdlO1xyXG4gICAgICBiZW5kUG9pbnRJbmRleCA9IHRoaXMuY3VycmVudEJlbmRJbmRleDtcclxuICAgIH1cclxuICAgIFxyXG4gICAgdmFyIGRpc3RhbmNlcyA9IGVkZ2UuZGF0YSgnY3llZGdlYmVuZGVkaXRpbmdEaXN0YW5jZXMnKTtcclxuICAgIHZhciB3ZWlnaHRzID0gZWRnZS5kYXRhKCdjeWVkZ2ViZW5kZWRpdGluZ1dlaWdodHMnKTtcclxuICAgIFxyXG4gICAgZGlzdGFuY2VzLnNwbGljZShiZW5kUG9pbnRJbmRleCwgMSk7XHJcbiAgICB3ZWlnaHRzLnNwbGljZShiZW5kUG9pbnRJbmRleCwgMSk7XHJcbiAgICBcclxuICAgIFxyXG4gICAgaWYoZGlzdGFuY2VzLmxlbmd0aCA9PSAwIHx8IHdlaWdodHMubGVuZ3RoID09IDApe1xyXG4gICAgICBlZGdlLnJlbW92ZUNsYXNzKCdlZGdlYmVuZGVkaXRpbmctaGFzYmVuZHBvaW50cycpO1xyXG4gICAgICAgIGVkZ2UuZGF0YSgnY3llZGdlYmVuZGVkaXRpbmdEaXN0YW5jZXMnLCBbXSk7XHJcbiAgICAgICAgZWRnZS5kYXRhKCdjeWVkZ2ViZW5kZWRpdGluZ1dlaWdodHMnLCBbXSk7XHJcbiAgICB9XHJcbiAgICBlbHNlIHtcclxuICAgICAgZWRnZS5kYXRhKCdjeWVkZ2ViZW5kZWRpdGluZ0Rpc3RhbmNlcycsIGRpc3RhbmNlcyk7XHJcbiAgICAgIGVkZ2UuZGF0YSgnY3llZGdlYmVuZGVkaXRpbmdXZWlnaHRzJywgd2VpZ2h0cyk7XHJcbiAgICB9XHJcbiAgfSxcclxuICBjYWxjdWxhdGVEaXN0YW5jZTogZnVuY3Rpb24ocHQxLCBwdDIpIHtcclxuICAgIHZhciBkaWZmWCA9IHB0MS54IC0gcHQyLng7XHJcbiAgICB2YXIgZGlmZlkgPSBwdDEueSAtIHB0Mi55O1xyXG4gICAgXHJcbiAgICB2YXIgZGlzdCA9IE1hdGguc3FydCggTWF0aC5wb3coIGRpZmZYLCAyICkgKyBNYXRoLnBvdyggZGlmZlksIDIgKSApO1xyXG4gICAgcmV0dXJuIGRpc3Q7XHJcbiAgfVxyXG59O1xyXG5cclxubW9kdWxlLmV4cG9ydHMgPSBiZW5kUG9pbnRVdGlsaXRpZXM7XHJcbiIsInZhciBkZWJvdW5jZSA9IChmdW5jdGlvbiAoKSB7XHJcbiAgLyoqXHJcbiAgICogbG9kYXNoIDMuMS4xIChDdXN0b20gQnVpbGQpIDxodHRwczovL2xvZGFzaC5jb20vPlxyXG4gICAqIEJ1aWxkOiBgbG9kYXNoIG1vZGVybiBtb2R1bGFyaXplIGV4cG9ydHM9XCJucG1cIiAtbyAuL2BcclxuICAgKiBDb3B5cmlnaHQgMjAxMi0yMDE1IFRoZSBEb2pvIEZvdW5kYXRpb24gPGh0dHA6Ly9kb2pvZm91bmRhdGlvbi5vcmcvPlxyXG4gICAqIEJhc2VkIG9uIFVuZGVyc2NvcmUuanMgMS44LjMgPGh0dHA6Ly91bmRlcnNjb3JlanMub3JnL0xJQ0VOU0U+XHJcbiAgICogQ29weXJpZ2h0IDIwMDktMjAxNSBKZXJlbXkgQXNoa2VuYXMsIERvY3VtZW50Q2xvdWQgYW5kIEludmVzdGlnYXRpdmUgUmVwb3J0ZXJzICYgRWRpdG9yc1xyXG4gICAqIEF2YWlsYWJsZSB1bmRlciBNSVQgbGljZW5zZSA8aHR0cHM6Ly9sb2Rhc2guY29tL2xpY2Vuc2U+XHJcbiAgICovXHJcbiAgLyoqIFVzZWQgYXMgdGhlIGBUeXBlRXJyb3JgIG1lc3NhZ2UgZm9yIFwiRnVuY3Rpb25zXCIgbWV0aG9kcy4gKi9cclxuICB2YXIgRlVOQ19FUlJPUl9URVhUID0gJ0V4cGVjdGVkIGEgZnVuY3Rpb24nO1xyXG5cclxuICAvKiBOYXRpdmUgbWV0aG9kIHJlZmVyZW5jZXMgZm9yIHRob3NlIHdpdGggdGhlIHNhbWUgbmFtZSBhcyBvdGhlciBgbG9kYXNoYCBtZXRob2RzLiAqL1xyXG4gIHZhciBuYXRpdmVNYXggPSBNYXRoLm1heCxcclxuICAgICAgICAgIG5hdGl2ZU5vdyA9IERhdGUubm93O1xyXG5cclxuICAvKipcclxuICAgKiBHZXRzIHRoZSBudW1iZXIgb2YgbWlsbGlzZWNvbmRzIHRoYXQgaGF2ZSBlbGFwc2VkIHNpbmNlIHRoZSBVbml4IGVwb2NoXHJcbiAgICogKDEgSmFudWFyeSAxOTcwIDAwOjAwOjAwIFVUQykuXHJcbiAgICpcclxuICAgKiBAc3RhdGljXHJcbiAgICogQG1lbWJlck9mIF9cclxuICAgKiBAY2F0ZWdvcnkgRGF0ZVxyXG4gICAqIEBleGFtcGxlXHJcbiAgICpcclxuICAgKiBfLmRlZmVyKGZ1bmN0aW9uKHN0YW1wKSB7XHJcbiAgICogICBjb25zb2xlLmxvZyhfLm5vdygpIC0gc3RhbXApO1xyXG4gICAqIH0sIF8ubm93KCkpO1xyXG4gICAqIC8vID0+IGxvZ3MgdGhlIG51bWJlciBvZiBtaWxsaXNlY29uZHMgaXQgdG9vayBmb3IgdGhlIGRlZmVycmVkIGZ1bmN0aW9uIHRvIGJlIGludm9rZWRcclxuICAgKi9cclxuICB2YXIgbm93ID0gbmF0aXZlTm93IHx8IGZ1bmN0aW9uICgpIHtcclxuICAgIHJldHVybiBuZXcgRGF0ZSgpLmdldFRpbWUoKTtcclxuICB9O1xyXG5cclxuICAvKipcclxuICAgKiBDcmVhdGVzIGEgZGVib3VuY2VkIGZ1bmN0aW9uIHRoYXQgZGVsYXlzIGludm9raW5nIGBmdW5jYCB1bnRpbCBhZnRlciBgd2FpdGBcclxuICAgKiBtaWxsaXNlY29uZHMgaGF2ZSBlbGFwc2VkIHNpbmNlIHRoZSBsYXN0IHRpbWUgdGhlIGRlYm91bmNlZCBmdW5jdGlvbiB3YXNcclxuICAgKiBpbnZva2VkLiBUaGUgZGVib3VuY2VkIGZ1bmN0aW9uIGNvbWVzIHdpdGggYSBgY2FuY2VsYCBtZXRob2QgdG8gY2FuY2VsXHJcbiAgICogZGVsYXllZCBpbnZvY2F0aW9ucy4gUHJvdmlkZSBhbiBvcHRpb25zIG9iamVjdCB0byBpbmRpY2F0ZSB0aGF0IGBmdW5jYFxyXG4gICAqIHNob3VsZCBiZSBpbnZva2VkIG9uIHRoZSBsZWFkaW5nIGFuZC9vciB0cmFpbGluZyBlZGdlIG9mIHRoZSBgd2FpdGAgdGltZW91dC5cclxuICAgKiBTdWJzZXF1ZW50IGNhbGxzIHRvIHRoZSBkZWJvdW5jZWQgZnVuY3Rpb24gcmV0dXJuIHRoZSByZXN1bHQgb2YgdGhlIGxhc3RcclxuICAgKiBgZnVuY2AgaW52b2NhdGlvbi5cclxuICAgKlxyXG4gICAqICoqTm90ZToqKiBJZiBgbGVhZGluZ2AgYW5kIGB0cmFpbGluZ2Agb3B0aW9ucyBhcmUgYHRydWVgLCBgZnVuY2AgaXMgaW52b2tlZFxyXG4gICAqIG9uIHRoZSB0cmFpbGluZyBlZGdlIG9mIHRoZSB0aW1lb3V0IG9ubHkgaWYgdGhlIHRoZSBkZWJvdW5jZWQgZnVuY3Rpb24gaXNcclxuICAgKiBpbnZva2VkIG1vcmUgdGhhbiBvbmNlIGR1cmluZyB0aGUgYHdhaXRgIHRpbWVvdXQuXHJcbiAgICpcclxuICAgKiBTZWUgW0RhdmlkIENvcmJhY2hvJ3MgYXJ0aWNsZV0oaHR0cDovL2RydXBhbG1vdGlvbi5jb20vYXJ0aWNsZS9kZWJvdW5jZS1hbmQtdGhyb3R0bGUtdmlzdWFsLWV4cGxhbmF0aW9uKVxyXG4gICAqIGZvciBkZXRhaWxzIG92ZXIgdGhlIGRpZmZlcmVuY2VzIGJldHdlZW4gYF8uZGVib3VuY2VgIGFuZCBgXy50aHJvdHRsZWAuXHJcbiAgICpcclxuICAgKiBAc3RhdGljXHJcbiAgICogQG1lbWJlck9mIF9cclxuICAgKiBAY2F0ZWdvcnkgRnVuY3Rpb25cclxuICAgKiBAcGFyYW0ge0Z1bmN0aW9ufSBmdW5jIFRoZSBmdW5jdGlvbiB0byBkZWJvdW5jZS5cclxuICAgKiBAcGFyYW0ge251bWJlcn0gW3dhaXQ9MF0gVGhlIG51bWJlciBvZiBtaWxsaXNlY29uZHMgdG8gZGVsYXkuXHJcbiAgICogQHBhcmFtIHtPYmplY3R9IFtvcHRpb25zXSBUaGUgb3B0aW9ucyBvYmplY3QuXHJcbiAgICogQHBhcmFtIHtib29sZWFufSBbb3B0aW9ucy5sZWFkaW5nPWZhbHNlXSBTcGVjaWZ5IGludm9raW5nIG9uIHRoZSBsZWFkaW5nXHJcbiAgICogIGVkZ2Ugb2YgdGhlIHRpbWVvdXQuXHJcbiAgICogQHBhcmFtIHtudW1iZXJ9IFtvcHRpb25zLm1heFdhaXRdIFRoZSBtYXhpbXVtIHRpbWUgYGZ1bmNgIGlzIGFsbG93ZWQgdG8gYmVcclxuICAgKiAgZGVsYXllZCBiZWZvcmUgaXQncyBpbnZva2VkLlxyXG4gICAqIEBwYXJhbSB7Ym9vbGVhbn0gW29wdGlvbnMudHJhaWxpbmc9dHJ1ZV0gU3BlY2lmeSBpbnZva2luZyBvbiB0aGUgdHJhaWxpbmdcclxuICAgKiAgZWRnZSBvZiB0aGUgdGltZW91dC5cclxuICAgKiBAcmV0dXJucyB7RnVuY3Rpb259IFJldHVybnMgdGhlIG5ldyBkZWJvdW5jZWQgZnVuY3Rpb24uXHJcbiAgICogQGV4YW1wbGVcclxuICAgKlxyXG4gICAqIC8vIGF2b2lkIGNvc3RseSBjYWxjdWxhdGlvbnMgd2hpbGUgdGhlIHdpbmRvdyBzaXplIGlzIGluIGZsdXhcclxuICAgKiBqUXVlcnkod2luZG93KS5vbigncmVzaXplJywgXy5kZWJvdW5jZShjYWxjdWxhdGVMYXlvdXQsIDE1MCkpO1xyXG4gICAqXHJcbiAgICogLy8gaW52b2tlIGBzZW5kTWFpbGAgd2hlbiB0aGUgY2xpY2sgZXZlbnQgaXMgZmlyZWQsIGRlYm91bmNpbmcgc3Vic2VxdWVudCBjYWxsc1xyXG4gICAqIGpRdWVyeSgnI3Bvc3Rib3gnKS5vbignY2xpY2snLCBfLmRlYm91bmNlKHNlbmRNYWlsLCAzMDAsIHtcclxuICAgKiAgICdsZWFkaW5nJzogdHJ1ZSxcclxuICAgKiAgICd0cmFpbGluZyc6IGZhbHNlXHJcbiAgICogfSkpO1xyXG4gICAqXHJcbiAgICogLy8gZW5zdXJlIGBiYXRjaExvZ2AgaXMgaW52b2tlZCBvbmNlIGFmdGVyIDEgc2Vjb25kIG9mIGRlYm91bmNlZCBjYWxsc1xyXG4gICAqIHZhciBzb3VyY2UgPSBuZXcgRXZlbnRTb3VyY2UoJy9zdHJlYW0nKTtcclxuICAgKiBqUXVlcnkoc291cmNlKS5vbignbWVzc2FnZScsIF8uZGVib3VuY2UoYmF0Y2hMb2csIDI1MCwge1xyXG4gICAqICAgJ21heFdhaXQnOiAxMDAwXHJcbiAgICogfSkpO1xyXG4gICAqXHJcbiAgICogLy8gY2FuY2VsIGEgZGVib3VuY2VkIGNhbGxcclxuICAgKiB2YXIgdG9kb0NoYW5nZXMgPSBfLmRlYm91bmNlKGJhdGNoTG9nLCAxMDAwKTtcclxuICAgKiBPYmplY3Qub2JzZXJ2ZShtb2RlbHMudG9kbywgdG9kb0NoYW5nZXMpO1xyXG4gICAqXHJcbiAgICogT2JqZWN0Lm9ic2VydmUobW9kZWxzLCBmdW5jdGlvbihjaGFuZ2VzKSB7XHJcbiAgICogICBpZiAoXy5maW5kKGNoYW5nZXMsIHsgJ3VzZXInOiAndG9kbycsICd0eXBlJzogJ2RlbGV0ZSd9KSkge1xyXG4gICAqICAgICB0b2RvQ2hhbmdlcy5jYW5jZWwoKTtcclxuICAgKiAgIH1cclxuICAgKiB9LCBbJ2RlbGV0ZSddKTtcclxuICAgKlxyXG4gICAqIC8vIC4uLmF0IHNvbWUgcG9pbnQgYG1vZGVscy50b2RvYCBpcyBjaGFuZ2VkXHJcbiAgICogbW9kZWxzLnRvZG8uY29tcGxldGVkID0gdHJ1ZTtcclxuICAgKlxyXG4gICAqIC8vIC4uLmJlZm9yZSAxIHNlY29uZCBoYXMgcGFzc2VkIGBtb2RlbHMudG9kb2AgaXMgZGVsZXRlZFxyXG4gICAqIC8vIHdoaWNoIGNhbmNlbHMgdGhlIGRlYm91bmNlZCBgdG9kb0NoYW5nZXNgIGNhbGxcclxuICAgKiBkZWxldGUgbW9kZWxzLnRvZG87XHJcbiAgICovXHJcbiAgZnVuY3Rpb24gZGVib3VuY2UoZnVuYywgd2FpdCwgb3B0aW9ucykge1xyXG4gICAgdmFyIGFyZ3MsXHJcbiAgICAgICAgICAgIG1heFRpbWVvdXRJZCxcclxuICAgICAgICAgICAgcmVzdWx0LFxyXG4gICAgICAgICAgICBzdGFtcCxcclxuICAgICAgICAgICAgdGhpc0FyZyxcclxuICAgICAgICAgICAgdGltZW91dElkLFxyXG4gICAgICAgICAgICB0cmFpbGluZ0NhbGwsXHJcbiAgICAgICAgICAgIGxhc3RDYWxsZWQgPSAwLFxyXG4gICAgICAgICAgICBtYXhXYWl0ID0gZmFsc2UsXHJcbiAgICAgICAgICAgIHRyYWlsaW5nID0gdHJ1ZTtcclxuXHJcbiAgICBpZiAodHlwZW9mIGZ1bmMgIT0gJ2Z1bmN0aW9uJykge1xyXG4gICAgICB0aHJvdyBuZXcgVHlwZUVycm9yKEZVTkNfRVJST1JfVEVYVCk7XHJcbiAgICB9XHJcbiAgICB3YWl0ID0gd2FpdCA8IDAgPyAwIDogKCt3YWl0IHx8IDApO1xyXG4gICAgaWYgKG9wdGlvbnMgPT09IHRydWUpIHtcclxuICAgICAgdmFyIGxlYWRpbmcgPSB0cnVlO1xyXG4gICAgICB0cmFpbGluZyA9IGZhbHNlO1xyXG4gICAgfSBlbHNlIGlmIChpc09iamVjdChvcHRpb25zKSkge1xyXG4gICAgICBsZWFkaW5nID0gISFvcHRpb25zLmxlYWRpbmc7XHJcbiAgICAgIG1heFdhaXQgPSAnbWF4V2FpdCcgaW4gb3B0aW9ucyAmJiBuYXRpdmVNYXgoK29wdGlvbnMubWF4V2FpdCB8fCAwLCB3YWl0KTtcclxuICAgICAgdHJhaWxpbmcgPSAndHJhaWxpbmcnIGluIG9wdGlvbnMgPyAhIW9wdGlvbnMudHJhaWxpbmcgOiB0cmFpbGluZztcclxuICAgIH1cclxuXHJcbiAgICBmdW5jdGlvbiBjYW5jZWwoKSB7XHJcbiAgICAgIGlmICh0aW1lb3V0SWQpIHtcclxuICAgICAgICBjbGVhclRpbWVvdXQodGltZW91dElkKTtcclxuICAgICAgfVxyXG4gICAgICBpZiAobWF4VGltZW91dElkKSB7XHJcbiAgICAgICAgY2xlYXJUaW1lb3V0KG1heFRpbWVvdXRJZCk7XHJcbiAgICAgIH1cclxuICAgICAgbGFzdENhbGxlZCA9IDA7XHJcbiAgICAgIG1heFRpbWVvdXRJZCA9IHRpbWVvdXRJZCA9IHRyYWlsaW5nQ2FsbCA9IHVuZGVmaW5lZDtcclxuICAgIH1cclxuXHJcbiAgICBmdW5jdGlvbiBjb21wbGV0ZShpc0NhbGxlZCwgaWQpIHtcclxuICAgICAgaWYgKGlkKSB7XHJcbiAgICAgICAgY2xlYXJUaW1lb3V0KGlkKTtcclxuICAgICAgfVxyXG4gICAgICBtYXhUaW1lb3V0SWQgPSB0aW1lb3V0SWQgPSB0cmFpbGluZ0NhbGwgPSB1bmRlZmluZWQ7XHJcbiAgICAgIGlmIChpc0NhbGxlZCkge1xyXG4gICAgICAgIGxhc3RDYWxsZWQgPSBub3coKTtcclxuICAgICAgICByZXN1bHQgPSBmdW5jLmFwcGx5KHRoaXNBcmcsIGFyZ3MpO1xyXG4gICAgICAgIGlmICghdGltZW91dElkICYmICFtYXhUaW1lb3V0SWQpIHtcclxuICAgICAgICAgIGFyZ3MgPSB0aGlzQXJnID0gdW5kZWZpbmVkO1xyXG4gICAgICAgIH1cclxuICAgICAgfVxyXG4gICAgfVxyXG5cclxuICAgIGZ1bmN0aW9uIGRlbGF5ZWQoKSB7XHJcbiAgICAgIHZhciByZW1haW5pbmcgPSB3YWl0IC0gKG5vdygpIC0gc3RhbXApO1xyXG4gICAgICBpZiAocmVtYWluaW5nIDw9IDAgfHwgcmVtYWluaW5nID4gd2FpdCkge1xyXG4gICAgICAgIGNvbXBsZXRlKHRyYWlsaW5nQ2FsbCwgbWF4VGltZW91dElkKTtcclxuICAgICAgfSBlbHNlIHtcclxuICAgICAgICB0aW1lb3V0SWQgPSBzZXRUaW1lb3V0KGRlbGF5ZWQsIHJlbWFpbmluZyk7XHJcbiAgICAgIH1cclxuICAgIH1cclxuXHJcbiAgICBmdW5jdGlvbiBtYXhEZWxheWVkKCkge1xyXG4gICAgICBjb21wbGV0ZSh0cmFpbGluZywgdGltZW91dElkKTtcclxuICAgIH1cclxuXHJcbiAgICBmdW5jdGlvbiBkZWJvdW5jZWQoKSB7XHJcbiAgICAgIGFyZ3MgPSBhcmd1bWVudHM7XHJcbiAgICAgIHN0YW1wID0gbm93KCk7XHJcbiAgICAgIHRoaXNBcmcgPSB0aGlzO1xyXG4gICAgICB0cmFpbGluZ0NhbGwgPSB0cmFpbGluZyAmJiAodGltZW91dElkIHx8ICFsZWFkaW5nKTtcclxuXHJcbiAgICAgIGlmIChtYXhXYWl0ID09PSBmYWxzZSkge1xyXG4gICAgICAgIHZhciBsZWFkaW5nQ2FsbCA9IGxlYWRpbmcgJiYgIXRpbWVvdXRJZDtcclxuICAgICAgfSBlbHNlIHtcclxuICAgICAgICBpZiAoIW1heFRpbWVvdXRJZCAmJiAhbGVhZGluZykge1xyXG4gICAgICAgICAgbGFzdENhbGxlZCA9IHN0YW1wO1xyXG4gICAgICAgIH1cclxuICAgICAgICB2YXIgcmVtYWluaW5nID0gbWF4V2FpdCAtIChzdGFtcCAtIGxhc3RDYWxsZWQpLFxyXG4gICAgICAgICAgICAgICAgaXNDYWxsZWQgPSByZW1haW5pbmcgPD0gMCB8fCByZW1haW5pbmcgPiBtYXhXYWl0O1xyXG5cclxuICAgICAgICBpZiAoaXNDYWxsZWQpIHtcclxuICAgICAgICAgIGlmIChtYXhUaW1lb3V0SWQpIHtcclxuICAgICAgICAgICAgbWF4VGltZW91dElkID0gY2xlYXJUaW1lb3V0KG1heFRpbWVvdXRJZCk7XHJcbiAgICAgICAgICB9XHJcbiAgICAgICAgICBsYXN0Q2FsbGVkID0gc3RhbXA7XHJcbiAgICAgICAgICByZXN1bHQgPSBmdW5jLmFwcGx5KHRoaXNBcmcsIGFyZ3MpO1xyXG4gICAgICAgIH1cclxuICAgICAgICBlbHNlIGlmICghbWF4VGltZW91dElkKSB7XHJcbiAgICAgICAgICBtYXhUaW1lb3V0SWQgPSBzZXRUaW1lb3V0KG1heERlbGF5ZWQsIHJlbWFpbmluZyk7XHJcbiAgICAgICAgfVxyXG4gICAgICB9XHJcbiAgICAgIGlmIChpc0NhbGxlZCAmJiB0aW1lb3V0SWQpIHtcclxuICAgICAgICB0aW1lb3V0SWQgPSBjbGVhclRpbWVvdXQodGltZW91dElkKTtcclxuICAgICAgfVxyXG4gICAgICBlbHNlIGlmICghdGltZW91dElkICYmIHdhaXQgIT09IG1heFdhaXQpIHtcclxuICAgICAgICB0aW1lb3V0SWQgPSBzZXRUaW1lb3V0KGRlbGF5ZWQsIHdhaXQpO1xyXG4gICAgICB9XHJcbiAgICAgIGlmIChsZWFkaW5nQ2FsbCkge1xyXG4gICAgICAgIGlzQ2FsbGVkID0gdHJ1ZTtcclxuICAgICAgICByZXN1bHQgPSBmdW5jLmFwcGx5KHRoaXNBcmcsIGFyZ3MpO1xyXG4gICAgICB9XHJcbiAgICAgIGlmIChpc0NhbGxlZCAmJiAhdGltZW91dElkICYmICFtYXhUaW1lb3V0SWQpIHtcclxuICAgICAgICBhcmdzID0gdGhpc0FyZyA9IHVuZGVmaW5lZDtcclxuICAgICAgfVxyXG4gICAgICByZXR1cm4gcmVzdWx0O1xyXG4gICAgfVxyXG5cclxuICAgIGRlYm91bmNlZC5jYW5jZWwgPSBjYW5jZWw7XHJcbiAgICByZXR1cm4gZGVib3VuY2VkO1xyXG4gIH1cclxuXHJcbiAgLyoqXHJcbiAgICogQ2hlY2tzIGlmIGB2YWx1ZWAgaXMgdGhlIFtsYW5ndWFnZSB0eXBlXShodHRwczovL2VzNS5naXRodWIuaW8vI3g4KSBvZiBgT2JqZWN0YC5cclxuICAgKiAoZS5nLiBhcnJheXMsIGZ1bmN0aW9ucywgb2JqZWN0cywgcmVnZXhlcywgYG5ldyBOdW1iZXIoMClgLCBhbmQgYG5ldyBTdHJpbmcoJycpYClcclxuICAgKlxyXG4gICAqIEBzdGF0aWNcclxuICAgKiBAbWVtYmVyT2YgX1xyXG4gICAqIEBjYXRlZ29yeSBMYW5nXHJcbiAgICogQHBhcmFtIHsqfSB2YWx1ZSBUaGUgdmFsdWUgdG8gY2hlY2suXHJcbiAgICogQHJldHVybnMge2Jvb2xlYW59IFJldHVybnMgYHRydWVgIGlmIGB2YWx1ZWAgaXMgYW4gb2JqZWN0LCBlbHNlIGBmYWxzZWAuXHJcbiAgICogQGV4YW1wbGVcclxuICAgKlxyXG4gICAqIF8uaXNPYmplY3Qoe30pO1xyXG4gICAqIC8vID0+IHRydWVcclxuICAgKlxyXG4gICAqIF8uaXNPYmplY3QoWzEsIDIsIDNdKTtcclxuICAgKiAvLyA9PiB0cnVlXHJcbiAgICpcclxuICAgKiBfLmlzT2JqZWN0KDEpO1xyXG4gICAqIC8vID0+IGZhbHNlXHJcbiAgICovXHJcbiAgZnVuY3Rpb24gaXNPYmplY3QodmFsdWUpIHtcclxuICAgIC8vIEF2b2lkIGEgVjggSklUIGJ1ZyBpbiBDaHJvbWUgMTktMjAuXHJcbiAgICAvLyBTZWUgaHR0cHM6Ly9jb2RlLmdvb2dsZS5jb20vcC92OC9pc3N1ZXMvZGV0YWlsP2lkPTIyOTEgZm9yIG1vcmUgZGV0YWlscy5cclxuICAgIHZhciB0eXBlID0gdHlwZW9mIHZhbHVlO1xyXG4gICAgcmV0dXJuICEhdmFsdWUgJiYgKHR5cGUgPT0gJ29iamVjdCcgfHwgdHlwZSA9PSAnZnVuY3Rpb24nKTtcclxuICB9XHJcblxyXG4gIHJldHVybiBkZWJvdW5jZTtcclxuXHJcbn0pKCk7XHJcblxyXG5tb2R1bGUuZXhwb3J0cyA9IGRlYm91bmNlOyIsIjsoZnVuY3Rpb24oKXsgJ3VzZSBzdHJpY3QnO1xyXG4gIFxyXG4gIHZhciBiZW5kUG9pbnRVdGlsaXRpZXMgPSByZXF1aXJlKCcuL2JlbmRQb2ludFV0aWxpdGllcycpO1xyXG4gIHZhciBkZWJvdW5jZSA9IHJlcXVpcmUoXCIuL2RlYm91bmNlXCIpO1xyXG4gIFxyXG4gIC8vIHJlZ2lzdGVycyB0aGUgZXh0ZW5zaW9uIG9uIGEgY3l0b3NjYXBlIGxpYiByZWZcclxuICB2YXIgcmVnaXN0ZXIgPSBmdW5jdGlvbiggY3l0b3NjYXBlLCAkICl7XHJcbiAgICB2YXIgdWlVdGlsaXRpZXMgPSByZXF1aXJlKCcuL1VJVXRpbGl0aWVzJyk7XHJcbiAgICBcclxuICAgIGlmKCAhY3l0b3NjYXBlICl7IHJldHVybjsgfSAvLyBjYW4ndCByZWdpc3RlciBpZiBjeXRvc2NhcGUgdW5zcGVjaWZpZWRcclxuXHJcbiAgICB2YXIgZGVmYXVsdHMgPSB7XHJcbiAgICAgIC8vIHRoaXMgZnVuY3Rpb24gc3BlY2lmaWVzIHRoZSBwb2l0aW9ucyBvZiBiZW5kIHBvaW50c1xyXG4gICAgICBiZW5kUG9zaXRpb25zRnVuY3Rpb246IGZ1bmN0aW9uKGVsZSkge1xyXG4gICAgICAgIHJldHVybiBlbGUuZGF0YSgnYmVuZFBvaW50UG9zaXRpb25zJyk7XHJcbiAgICAgIH0sXHJcbiAgICAgIC8vIHdoZXRoZXIgdG8gaW5pdGlsaXplIGJlbmQgcG9pbnRzIG9uIGNyZWF0aW9uIG9mIHRoaXMgZXh0ZW5zaW9uIGF1dG9tYXRpY2FsbHlcclxuICAgICAgaW5pdEJlbmRQb2ludHNBdXRvbWF0aWNhbGx5OiB0cnVlLFxyXG4gICAgICAvLyB0aGUgY2xhc3NlcyBvZiB0aG9zZSBlZGdlcyB0aGF0IHNob3VsZCBiZSBpZ25vcmVkXHJcbiAgICAgIGlnbm9yZWRDbGFzc2VzOiBbXSxcclxuICAgICAgLy8gd2hldGhlciB0aGUgYmVuZCBlZGl0aW5nIG9wZXJhdGlvbnMgYXJlIHVuZG9hYmxlIChyZXF1aXJlcyBjeXRvc2NhcGUtdW5kby1yZWRvLmpzKVxyXG4gICAgICB1bmRvYWJsZTogZmFsc2UsXHJcbiAgICAgIC8vIHRoZSBzaXplIG9mIGJlbmQgc2hhcGUgaXMgb2J0YWluZWQgYnkgbXVsdGlwbGluZyB3aWR0aCBvZiBlZGdlIHdpdGggdGhpcyBwYXJhbWV0ZXJcclxuICAgICAgYmVuZFNoYXBlU2l6ZUZhY3RvcjogMyxcclxuICAgICAgLy8gd2hldGhlciB0byBzdGFydCB0aGUgcGx1Z2luIGluIHRoZSBlbmFibGVkIHN0YXRlXHJcbiAgICAgIGVuYWJsZWQ6IHRydWUsXHJcbiAgICAgIC8vIHRpdGxlIG9mIGFkZCBiZW5kIHBvaW50IG1lbnUgaXRlbSAoVXNlciBtYXkgbmVlZCB0byBhZGp1c3Qgd2lkdGggb2YgbWVudSBpdGVtcyBhY2NvcmRpbmcgdG8gbGVuZ3RoIG9mIHRoaXMgb3B0aW9uKVxyXG4gICAgICBhZGRCZW5kTWVudUl0ZW1UaXRsZTogXCJBZGQgQmVuZCBQb2ludFwiLFxyXG4gICAgICAvLyB0aXRsZSBvZiByZW1vdmUgYmVuZCBwb2ludCBtZW51IGl0ZW0gKFVzZXIgbWF5IG5lZWQgdG8gYWRqdXN0IHdpZHRoIG9mIG1lbnUgaXRlbXMgYWNjb3JkaW5nIHRvIGxlbmd0aCBvZiB0aGlzIG9wdGlvbilcclxuICAgICAgcmVtb3ZlQmVuZE1lbnVJdGVtVGl0bGU6IFwiUmVtb3ZlIEJlbmQgUG9pbnRcIixcclxuICAgICAgLy8gd2hldGhlciB0aGUgYmVuZCBwb2ludCBjYW4gYmUgbW92ZWQgYnkgYXJyb3dzXHJcbiAgICAgIG1vdmVTZWxlY3RlZEJlbmRQb2ludHNPbktleUV2ZW50czogZnVuY3Rpb24gKCkge1xyXG4gICAgICAgICAgcmV0dXJuIHRydWU7XHJcbiAgICAgIH1cclxuICAgIH07XHJcbiAgICBcclxuICAgIHZhciBvcHRpb25zO1xyXG4gICAgdmFyIGluaXRpYWxpemVkID0gZmFsc2U7XHJcbiAgICBcclxuICAgIC8vIE1lcmdlIGRlZmF1bHQgb3B0aW9ucyB3aXRoIHRoZSBvbmVzIGNvbWluZyBmcm9tIHBhcmFtZXRlclxyXG4gICAgZnVuY3Rpb24gZXh0ZW5kKGRlZmF1bHRzLCBvcHRpb25zKSB7XHJcbiAgICAgIHZhciBvYmogPSB7fTtcclxuXHJcbiAgICAgIGZvciAodmFyIGkgaW4gZGVmYXVsdHMpIHtcclxuICAgICAgICBvYmpbaV0gPSBkZWZhdWx0c1tpXTtcclxuICAgICAgfVxyXG5cclxuICAgICAgZm9yICh2YXIgaSBpbiBvcHRpb25zKSB7XHJcbiAgICAgICAgb2JqW2ldID0gb3B0aW9uc1tpXTtcclxuICAgICAgfVxyXG5cclxuICAgICAgcmV0dXJuIG9iajtcclxuICAgIH07XHJcbiAgICBcclxuICAgIGN5dG9zY2FwZSggJ2NvcmUnLCAnZWRnZUVkaXRpbmcnLCBmdW5jdGlvbihvcHRzKXtcclxuICAgICAgdmFyIGN5ID0gdGhpcztcclxuICAgICAgXHJcbiAgICAgIGlmKCBvcHRzID09PSAnaW5pdGlhbGl6ZWQnICkge1xyXG4gICAgICAgIHJldHVybiBpbml0aWFsaXplZDtcclxuICAgICAgfVxyXG4gICAgICBcclxuICAgICAgaWYoIG9wdHMgIT09ICdnZXQnICkge1xyXG4gICAgICAgIC8vIG1lcmdlIHRoZSBvcHRpb25zIHdpdGggZGVmYXVsdCBvbmVzXHJcbiAgICAgICAgb3B0aW9ucyA9IGV4dGVuZChkZWZhdWx0cywgb3B0cyk7XHJcbiAgICAgICAgaW5pdGlhbGl6ZWQgPSB0cnVlO1xyXG5cclxuICAgICAgICAvLyBkZWZpbmUgZWRnZWJlbmRlZGl0aW5nLWhhc2JlbmRwb2ludHMgY3NzIGNsYXNzXHJcbiAgICAgICAgY3kuc3R5bGUoKS5zZWxlY3RvcignLmVkZ2ViZW5kZWRpdGluZy1oYXNiZW5kcG9pbnRzJykuY3NzKHtcclxuICAgICAgICAgICdjdXJ2ZS1zdHlsZSc6ICdzZWdtZW50cycsXHJcbiAgICAgICAgICAnc2VnbWVudC1kaXN0YW5jZXMnOiBmdW5jdGlvbiAoZWxlKSB7XHJcbiAgICAgICAgICAgIHJldHVybiBiZW5kUG9pbnRVdGlsaXRpZXMuZ2V0U2VnbWVudERpc3RhbmNlc1N0cmluZyhlbGUpO1xyXG4gICAgICAgICAgfSxcclxuICAgICAgICAgICdzZWdtZW50LXdlaWdodHMnOiBmdW5jdGlvbiAoZWxlKSB7XHJcbiAgICAgICAgICAgIHJldHVybiBiZW5kUG9pbnRVdGlsaXRpZXMuZ2V0U2VnbWVudFdlaWdodHNTdHJpbmcoZWxlKTtcclxuICAgICAgICAgIH0sXHJcbiAgICAgICAgICAnZWRnZS1kaXN0YW5jZXMnOiAnbm9kZS1wb3NpdGlvbidcclxuICAgICAgICB9KTtcclxuXHJcbiAgICAgICAgYmVuZFBvaW50VXRpbGl0aWVzLnNldElnbm9yZWRDbGFzc2VzKG9wdGlvbnMuaWdub3JlZENsYXNzZXMpO1xyXG5cclxuICAgICAgICAvLyBpbml0IGJlbmQgcG9zaXRpb25zIGNvbmRpdGlvbmFsbHlcclxuICAgICAgICBpZiAob3B0aW9ucy5pbml0QmVuZFBvaW50c0F1dG9tYXRpY2FsbHkpIHtcclxuICAgICAgICAgIGJlbmRQb2ludFV0aWxpdGllcy5pbml0QmVuZFBvaW50cyhvcHRpb25zLmJlbmRQb3NpdGlvbnNGdW5jdGlvbiwgY3kuZWRnZXMoKSwgb3B0aW9ucy5pZ25vcmVkQ2xhc3Nlcyk7XHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICBpZihvcHRpb25zLmVuYWJsZWQpXHJcbiAgICAgICAgICB1aVV0aWxpdGllcyhvcHRpb25zLCBjeSk7XHJcbiAgICAgICAgZWxzZVxyXG4gICAgICAgICAgdWlVdGlsaXRpZXMoXCJ1bmJpbmRcIiwgY3kpO1xyXG4gICAgICB9XHJcbiAgICAgIFxyXG4gICAgICB2YXIgaW5zdGFuY2UgPSBpbml0aWFsaXplZCA/IHtcclxuICAgICAgICAvKlxyXG4gICAgICAgICogZ2V0IHNlZ21lbnQgcG9pbnRzIG9mIHRoZSBnaXZlbiBlZGdlIGluIGFuIGFycmF5IEEsXHJcbiAgICAgICAgKiBBWzIgKiBpXSBpcyB0aGUgeCBjb29yZGluYXRlIGFuZCBBWzIgKiBpICsgMV0gaXMgdGhlIHkgY29vcmRpbmF0ZVxyXG4gICAgICAgICogb2YgdGhlIGl0aCBiZW5kIHBvaW50LiAoUmV0dXJucyB1bmRlZmluZWQgaWYgdGhlIGN1cnZlIHN0eWxlIGlzIG5vdCBzZWdtZW50cylcclxuICAgICAgICAqL1xyXG4gICAgICAgIGdldFNlZ21lbnRQb2ludHM6IGZ1bmN0aW9uKGVsZSkge1xyXG4gICAgICAgICAgcmV0dXJuIGJlbmRQb2ludFV0aWxpdGllcy5nZXRTZWdtZW50UG9pbnRzKGVsZSk7XHJcbiAgICAgICAgfSxcclxuICAgICAgICAvLyBJbml0aWxpemUgYmVuZCBwb2ludHMgZm9yIHRoZSBnaXZlbiBlZGdlcyB1c2luZyAnb3B0aW9ucy5iZW5kUG9zaXRpb25zRnVuY3Rpb24nXHJcbiAgICAgICAgaW5pdEJlbmRQb2ludHM6IGZ1bmN0aW9uKGVsZXMpIHtcclxuICAgICAgICAgIGJlbmRQb2ludFV0aWxpdGllcy5pbml0QmVuZFBvaW50cyhvcHRpb25zLmJlbmRQb3NpdGlvbnNGdW5jdGlvbiwgZWxlcyk7XHJcbiAgICAgICAgfSxcclxuICAgICAgICBkZWxldGVTZWxlY3RlZEJlbmRQb2ludDogZnVuY3Rpb24oZWxlLCBpbmRleCkge1xyXG4gICAgICAgICAgYmVuZFBvaW50VXRpbGl0aWVzLnJlbW92ZUJlbmRQb2ludChlbGUsaW5kZXgpO1xyXG4gICAgICAgIH1cclxuICAgICAgfSA6IHVuZGVmaW5lZDtcclxuXHJcbiAgICAgIHJldHVybiBpbnN0YW5jZTsgLy8gY2hhaW5hYmlsaXR5XHJcbiAgICB9ICk7XHJcblxyXG4gIH07XHJcblxyXG4gIGlmKCB0eXBlb2YgbW9kdWxlICE9PSAndW5kZWZpbmVkJyAmJiBtb2R1bGUuZXhwb3J0cyApeyAvLyBleHBvc2UgYXMgYSBjb21tb25qcyBtb2R1bGVcclxuICAgIG1vZHVsZS5leHBvcnRzID0gcmVnaXN0ZXI7XHJcbiAgfVxyXG5cclxuICBpZiggdHlwZW9mIGRlZmluZSAhPT0gJ3VuZGVmaW5lZCcgJiYgZGVmaW5lLmFtZCApeyAvLyBleHBvc2UgYXMgYW4gYW1kL3JlcXVpcmVqcyBtb2R1bGVcclxuICAgIGRlZmluZSgnY3l0b3NjYXBlLWVkZ2UtZWRpdGluZycsIGZ1bmN0aW9uKCl7XHJcbiAgICAgIHJldHVybiByZWdpc3RlcjtcclxuICAgIH0pO1xyXG4gIH1cclxuXHJcbiAgaWYoIHR5cGVvZiBjeXRvc2NhcGUgIT09ICd1bmRlZmluZWQnICYmICQgKXsgLy8gZXhwb3NlIHRvIGdsb2JhbCBjeXRvc2NhcGUgKGkuZS4gd2luZG93LmN5dG9zY2FwZSlcclxuICAgIHJlZ2lzdGVyKCBjeXRvc2NhcGUsICQgKTtcclxuICB9XHJcblxyXG59KSgpO1xyXG4iLCJ2YXIgcmVjb25uZWN0aW9uVXRpbGl0aWVzID0ge1xyXG5cclxuICAgIC8vIGNyZWF0ZXMgYW5kIHJldHVybnMgYSBkdW1teSBub2RlIHdoaWNoIGlzIGNvbm5lY3RlZCB0byB0aGUgZGlzY29ubmVjdGVkIGVkZ2VcclxuICAgIGRpc2Nvbm5lY3RFZGdlOiBmdW5jdGlvbiAoZWRnZSwgY3ksIHBvc2l0aW9uLCBkaXNjb25uZWN0ZWRFbmQpIHtcclxuICAgICAgICBcclxuICAgICAgICB2YXIgZHVtbXlOb2RlID0ge1xyXG4gICAgICAgICAgICBkYXRhOiB7IFxyXG4gICAgICAgICAgICAgIGlkOiAnbnd0X3JlY29ubmVjdEVkZ2VfZHVtbXknLFxyXG4gICAgICAgICAgICAgIHBvcnRzOiBbXSxcclxuICAgICAgICAgICAgfSxcclxuICAgICAgICAgICAgc3R5bGU6IHtcclxuICAgICAgICAgICAgICB3aWR0aDogMSxcclxuICAgICAgICAgICAgICBoZWlnaHQ6IDEsXHJcbiAgICAgICAgICAgICAgJ3Zpc2liaWxpdHknOiAnaGlkZGVuJ1xyXG4gICAgICAgICAgICB9LFxyXG4gICAgICAgICAgICByZW5kZXJlZFBvc2l0aW9uOiBwb3NpdGlvblxyXG4gICAgICAgIH07XHJcbiAgICAgICAgY3kuYWRkKGR1bW15Tm9kZSk7XHJcblxyXG4gICAgICAgIHZhciBsb2MgPSAoZGlzY29ubmVjdGVkRW5kID09PSAnc291cmNlJykgPyBcclxuICAgICAgICAgICAge3NvdXJjZTogZHVtbXlOb2RlLmRhdGEuaWR9IDogXHJcbiAgICAgICAgICAgIHt0YXJnZXQ6IGR1bW15Tm9kZS5kYXRhLmlkfTtcclxuXHJcbiAgICAgICAgZWRnZSA9IGVkZ2UubW92ZShsb2MpWzBdO1xyXG5cclxuICAgICAgICByZXR1cm4ge1xyXG4gICAgICAgICAgICBkdW1teU5vZGU6IGN5Lm5vZGVzKFwiI1wiICsgZHVtbXlOb2RlLmRhdGEuaWQpWzBdLFxyXG4gICAgICAgICAgICBlZGdlOiBlZGdlXHJcbiAgICAgICAgfTtcclxuICAgIH0sXHJcblxyXG4gICAgY29ubmVjdEVkZ2U6IGZ1bmN0aW9uIChlZGdlLCBub2RlLCBsb2NhdGlvbikge1xyXG4gICAgICAgIGlmKCFlZGdlLmlzRWRnZSgpIHx8ICFub2RlLmlzTm9kZSgpKVxyXG4gICAgICAgICAgICByZXR1cm47XHJcblxyXG4gICAgICAgIHZhciBsb2MgPSB7fTtcclxuICAgICAgICBpZihsb2NhdGlvbiA9PT0gJ3NvdXJjZScpXHJcbiAgICAgICAgICAgIGxvYy5zb3VyY2UgPSBub2RlLmlkKCk7XHJcbiAgICAgICAgXHJcbiAgICAgICAgZWxzZSBpZihsb2NhdGlvbiA9PT0gJ3RhcmdldCcpXHJcbiAgICAgICAgICAgIGxvYy50YXJnZXQgPSBub2RlLmlkKCk7XHJcbiAgICAgICAgXHJcbiAgICAgICAgZWxzZVxyXG4gICAgICAgICAgICByZXR1cm47XHJcblxyXG4gICAgICAgIHJldHVybiBlZGdlLm1vdmUobG9jKVswXTtcclxuICAgIH0sXHJcblxyXG4gICAgY29weUVkZ2U6IGZ1bmN0aW9uIChvbGRFZGdlLCBuZXdFZGdlKSB7XHJcbiAgICAgICAgdGhpcy5jb3B5QmVuZFBvaW50cyhvbGRFZGdlLCBuZXdFZGdlKTtcclxuICAgICAgICB0aGlzLmNvcHlTdHlsZShvbGRFZGdlLCBuZXdFZGdlKTtcclxuICAgIH0sXHJcblxyXG4gICAgY29weVN0eWxlOiBmdW5jdGlvbiAob2xkRWRnZSwgbmV3RWRnZSkge1xyXG4gICAgICAgIGlmKG9sZEVkZ2UgJiYgbmV3RWRnZSl7XHJcbiAgICAgICAgICAgIG5ld0VkZ2UuZGF0YSgnbGluZS1jb2xvcicsIG9sZEVkZ2UuZGF0YSgnbGluZS1jb2xvcicpKTtcclxuICAgICAgICAgICAgbmV3RWRnZS5kYXRhKCd3aWR0aCcsIG9sZEVkZ2UuZGF0YSgnd2lkdGgnKSk7XHJcbiAgICAgICAgICAgIG5ld0VkZ2UuZGF0YSgnY2FyZGluYWxpdHknLCBvbGRFZGdlLmRhdGEoJ2NhcmRpbmFsaXR5JykpO1xyXG4gICAgICAgIH1cclxuICAgIH0sXHJcblxyXG4gICAgY29weUJlbmRQb2ludHM6IGZ1bmN0aW9uIChvbGRFZGdlLCBuZXdFZGdlKSB7XHJcbiAgICAgICAgaWYob2xkRWRnZS5oYXNDbGFzcygnZWRnZWJlbmRlZGl0aW5nLWhhc2JlbmRwb2ludHMnKSl7XHJcbiAgICAgICAgICAgIHZhciBicERpc3RhbmNlcyA9IG9sZEVkZ2UuZGF0YSgnY3llZGdlYmVuZGVkaXRpbmdEaXN0YW5jZXMnKTtcclxuICAgICAgICAgICAgdmFyIGJwV2VpZ2h0cyA9IG9sZEVkZ2UuZGF0YSgnY3llZGdlYmVuZGVkaXRpbmdXZWlnaHRzJyk7XHJcbiAgICAgICAgICAgIFxyXG4gICAgICAgICAgICBuZXdFZGdlLmRhdGEoJ2N5ZWRnZWJlbmRlZGl0aW5nRGlzdGFuY2VzJywgYnBEaXN0YW5jZXMpO1xyXG4gICAgICAgICAgICBuZXdFZGdlLmRhdGEoJ2N5ZWRnZWJlbmRlZGl0aW5nV2VpZ2h0cycsIGJwV2VpZ2h0cyk7XHJcbiAgICAgICAgICAgIG5ld0VkZ2UuYWRkQ2xhc3MoJ2VkZ2ViZW5kZWRpdGluZy1oYXNiZW5kcG9pbnRzJyk7XHJcbiAgICAgICAgfVxyXG4gICAgfSxcclxufTtcclxuICBcclxubW9kdWxlLmV4cG9ydHMgPSByZWNvbm5lY3Rpb25VdGlsaXRpZXM7XHJcbiAgIiwibW9kdWxlLmV4cG9ydHMgPSBmdW5jdGlvbiAoY3ksIGJlbmRQb2ludFV0aWxpdGllcywgcGFyYW1zKSB7XHJcbiAgaWYgKGN5LnVuZG9SZWRvID09IG51bGwpXHJcbiAgICByZXR1cm47XHJcblxyXG4gIHZhciB1ciA9IGN5LnVuZG9SZWRvKHtcclxuICAgIGRlZmF1bHRBY3Rpb25zOiBmYWxzZSxcclxuICAgIGlzRGVidWc6IHRydWVcclxuICB9KTtcclxuXHJcbiAgZnVuY3Rpb24gY2hhbmdlQmVuZFBvaW50cyhwYXJhbSkge1xyXG4gICAgdmFyIGVkZ2UgPSBjeS5nZXRFbGVtZW50QnlJZChwYXJhbS5lZGdlLmlkKCkpO1xyXG4gICAgdmFyIHJlc3VsdCA9IHtcclxuICAgICAgZWRnZTogZWRnZSxcclxuICAgICAgd2VpZ2h0czogcGFyYW0uc2V0ID8gZWRnZS5kYXRhKCdjeWVkZ2ViZW5kZWRpdGluZ1dlaWdodHMnKSA6IHBhcmFtLndlaWdodHMsXHJcbiAgICAgIGRpc3RhbmNlczogcGFyYW0uc2V0ID8gZWRnZS5kYXRhKCdjeWVkZ2ViZW5kZWRpdGluZ0Rpc3RhbmNlcycpIDogcGFyYW0uZGlzdGFuY2VzLFxyXG4gICAgICBzZXQ6IHRydWUvL0FzIHRoZSByZXN1bHQgd2lsbCBub3QgYmUgdXNlZCBmb3IgdGhlIGZpcnN0IGZ1bmN0aW9uIGNhbGwgcGFyYW1zIHNob3VsZCBiZSB1c2VkIHRvIHNldCB0aGUgZGF0YVxyXG4gICAgfTtcclxuXHJcbiAgICB2YXIgaGFzQmVuZCA9IHBhcmFtLndlaWdodHMgJiYgcGFyYW0ud2VpZ2h0cy5sZW5ndGggPiAwO1xyXG5cclxuICAgIC8vQ2hlY2sgaWYgd2UgbmVlZCB0byBzZXQgdGhlIHdlaWdodHMgYW5kIGRpc3RhbmNlcyBieSB0aGUgcGFyYW0gdmFsdWVzXHJcbiAgICBpZiAocGFyYW0uc2V0KSB7XHJcbiAgICAgIGhhc0JlbmQgPyBlZGdlLmRhdGEoJ2N5ZWRnZWJlbmRlZGl0aW5nV2VpZ2h0cycsIHBhcmFtLndlaWdodHMpIDogZWRnZS5yZW1vdmVEYXRhKCdjeWVkZ2ViZW5kZWRpdGluZ1dlaWdodHMnKTtcclxuICAgICAgaGFzQmVuZCA/IGVkZ2UuZGF0YSgnY3llZGdlYmVuZGVkaXRpbmdEaXN0YW5jZXMnLCBwYXJhbS5kaXN0YW5jZXMpIDogZWRnZS5yZW1vdmVEYXRhKCdjeWVkZ2ViZW5kZWRpdGluZ0Rpc3RhbmNlcycpO1xyXG5cclxuICAgICAgLy9yZWZyZXNoIHRoZSBjdXJ2ZSBzdHlsZSBhcyB0aGUgbnVtYmVyIG9mIGJlbmQgcG9pbnQgd291bGQgYmUgY2hhbmdlZCBieSB0aGUgcHJldmlvdXMgb3BlcmF0aW9uXHJcbiAgICAgIGlmIChoYXNCZW5kKSB7XHJcbiAgICAgICAgZWRnZS5hZGRDbGFzcygnZWRnZWJlbmRlZGl0aW5nLWhhc2JlbmRwb2ludHMnKTtcclxuICAgICAgfVxyXG4gICAgICBlbHNlIHtcclxuICAgICAgICBlZGdlLnJlbW92ZUNsYXNzKCdlZGdlYmVuZGVkaXRpbmctaGFzYmVuZHBvaW50cycpO1xyXG4gICAgICB9XHJcbiAgICB9XHJcbiAgICBcclxuICAgIGVkZ2UudHJpZ2dlcignY3llZGdlYmVuZGVkaXRpbmcuY2hhbmdlQmVuZFBvaW50cycpO1xyXG5cclxuICAgIHJldHVybiByZXN1bHQ7XHJcbiAgfVxyXG5cclxuICBmdW5jdGlvbiBtb3ZlRG8oYXJnKSB7XHJcbiAgICAgIGlmIChhcmcuZmlyc3RUaW1lKSB7XHJcbiAgICAgICAgICBkZWxldGUgYXJnLmZpcnN0VGltZTtcclxuICAgICAgICAgIHJldHVybiBhcmc7XHJcbiAgICAgIH1cclxuXHJcbiAgICAgIHZhciBlZGdlcyA9IGFyZy5lZGdlcztcclxuICAgICAgdmFyIHBvc2l0aW9uRGlmZiA9IGFyZy5wb3NpdGlvbkRpZmY7XHJcbiAgICAgIHZhciByZXN1bHQgPSB7XHJcbiAgICAgICAgICBlZGdlczogZWRnZXMsXHJcbiAgICAgICAgICBwb3NpdGlvbkRpZmY6IHtcclxuICAgICAgICAgICAgICB4OiAtcG9zaXRpb25EaWZmLngsXHJcbiAgICAgICAgICAgICAgeTogLXBvc2l0aW9uRGlmZi55XHJcbiAgICAgICAgICB9XHJcbiAgICAgIH07XHJcbiAgICAgIG1vdmVCZW5kUG9pbnRzVW5kb2FibGUocG9zaXRpb25EaWZmLCBlZGdlcyk7XHJcblxyXG4gICAgICByZXR1cm4gcmVzdWx0O1xyXG4gIH1cclxuXHJcbiAgZnVuY3Rpb24gbW92ZUJlbmRQb2ludHNVbmRvYWJsZShwb3NpdGlvbkRpZmYsIGVkZ2VzKSB7XHJcbiAgICAgIGVkZ2VzLmZvckVhY2goZnVuY3Rpb24oIGVkZ2UgKXtcclxuICAgICAgICAgIGVkZ2UgPSBjeS5nZXRFbGVtZW50QnlJZChwYXJhbS5lZGdlLmlkKCkpO1xyXG4gICAgICAgICAgdmFyIHByZXZpb3VzQmVuZFBvaW50c1Bvc2l0aW9uID0gYmVuZFBvaW50VXRpbGl0aWVzLmdldFNlZ21lbnRQb2ludHMoZWRnZSk7XHJcbiAgICAgICAgICB2YXIgbmV4dEJlbmRQb2ludHNQb3NpdGlvbiA9IFtdO1xyXG4gICAgICAgICAgaWYgKHByZXZpb3VzQmVuZFBvaW50c1Bvc2l0aW9uICE9IHVuZGVmaW5lZClcclxuICAgICAgICAgIHtcclxuICAgICAgICAgICAgICBmb3IgKGk9MDsgaTxwcmV2aW91c0JlbmRQb2ludHNQb3NpdGlvbi5sZW5ndGg7IGkrPTIpXHJcbiAgICAgICAgICAgICAge1xyXG4gICAgICAgICAgICAgICAgICBuZXh0QmVuZFBvaW50c1Bvc2l0aW9uLnB1c2goe3g6IHByZXZpb3VzQmVuZFBvaW50c1Bvc2l0aW9uW2ldK3Bvc2l0aW9uRGlmZi54LCB5OiBwcmV2aW91c0JlbmRQb2ludHNQb3NpdGlvbltpKzFdK3Bvc2l0aW9uRGlmZi55fSk7XHJcbiAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgIGVkZ2UuZGF0YSgnYmVuZFBvaW50UG9zaXRpb25zJyxuZXh0QmVuZFBvaW50c1Bvc2l0aW9uKTtcclxuICAgICAgICAgIH1cclxuICAgICAgfSk7XHJcblxyXG4gICAgICBiZW5kUG9pbnRVdGlsaXRpZXMuaW5pdEJlbmRQb2ludHMocGFyYW1zLmJlbmRQb3NpdGlvbnNGdW5jdGlvbiwgZWRnZXMpO1xyXG4gIH1cclxuXHJcbiAgZnVuY3Rpb24gcmVjb25uZWN0RWRnZShwYXJhbSl7XHJcbiAgICB2YXIgZWRnZSAgICAgID0gcGFyYW0uZWRnZTtcclxuICAgIHZhciBsb2NhdGlvbiAgPSBwYXJhbS5sb2NhdGlvbjtcclxuICAgIHZhciBvbGRMb2MgICAgPSBwYXJhbS5vbGRMb2M7XHJcblxyXG4gICAgZWRnZSA9IGVkZ2UubW92ZShsb2NhdGlvbilbMF07XHJcblxyXG4gICAgdmFyIHJlc3VsdCA9IHtcclxuICAgICAgZWRnZTogICAgIGVkZ2UsXHJcbiAgICAgIGxvY2F0aW9uOiBvbGRMb2MsXHJcbiAgICAgIG9sZExvYzogICBsb2NhdGlvblxyXG4gICAgfVxyXG4gICAgcmV0dXJuIHJlc3VsdDtcclxuICB9XHJcblxyXG4gIGZ1bmN0aW9uIHJlbW92ZVJlY29ubmVjdGVkRWRnZShwYXJhbSl7XHJcbiAgICB2YXIgb2xkRWRnZSA9IHBhcmFtLm9sZEVkZ2U7XHJcbiAgICB2YXIgdG1wID0gY3kuZ2V0RWxlbWVudEJ5SWQob2xkRWRnZS5kYXRhKCdpZCcpKTtcclxuICAgIGlmKHRtcCAmJiB0bXAubGVuZ3RoID4gMClcclxuICAgICAgb2xkRWRnZSA9IHRtcDtcclxuXHJcbiAgICB2YXIgbmV3RWRnZSA9IHBhcmFtLm5ld0VkZ2U7XHJcbiAgICB2YXIgdG1wID0gY3kuZ2V0RWxlbWVudEJ5SWQobmV3RWRnZS5kYXRhKCdpZCcpKTtcclxuICAgIGlmKHRtcCAmJiB0bXAubGVuZ3RoID4gMClcclxuICAgICAgbmV3RWRnZSA9IHRtcDtcclxuXHJcbiAgICBpZihvbGRFZGdlLmluc2lkZSgpKXtcclxuICAgICAgb2xkRWRnZSA9IG9sZEVkZ2UucmVtb3ZlKClbMF07XHJcbiAgICB9IFxyXG4gICAgICBcclxuICAgIGlmKG5ld0VkZ2UucmVtb3ZlZCgpKXtcclxuICAgICAgbmV3RWRnZSA9IG5ld0VkZ2UucmVzdG9yZSgpO1xyXG4gICAgICBuZXdFZGdlLnVuc2VsZWN0KCk7XHJcbiAgICB9XHJcbiAgICBcclxuICAgIHJldHVybiB7XHJcbiAgICAgIG9sZEVkZ2U6IG5ld0VkZ2UsXHJcbiAgICAgIG5ld0VkZ2U6IG9sZEVkZ2VcclxuICAgIH07XHJcbiAgfVxyXG5cclxuICB1ci5hY3Rpb24oJ2NoYW5nZUJlbmRQb2ludHMnLCBjaGFuZ2VCZW5kUG9pbnRzLCBjaGFuZ2VCZW5kUG9pbnRzKTtcclxuICB1ci5hY3Rpb24oJ21vdmVCZW5kUG9pbnRzJywgbW92ZURvLCBtb3ZlRG8pO1xyXG4gIHVyLmFjdGlvbigncmVjb25uZWN0RWRnZScsIHJlY29ubmVjdEVkZ2UsIHJlY29ubmVjdEVkZ2UpO1xyXG4gIHVyLmFjdGlvbigncmVtb3ZlUmVjb25uZWN0ZWRFZGdlJywgcmVtb3ZlUmVjb25uZWN0ZWRFZGdlLCByZW1vdmVSZWNvbm5lY3RlZEVkZ2UpO1xyXG59O1xyXG4iXX0=
